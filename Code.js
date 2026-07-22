/**
 * ADORA AI STUDIO
 * Premium AI advertising workflow for Google Apps Script.
 *
 * --------------------------------------------------------------------------
 * API KEYS & SETTINGS — edit here, or use Settings inside the web app.
 * Keys stored in Settings use Script Properties and never reach the browser.
 * --------------------------------------------------------------------------
 */
const APP_CONFIG = {
  APP_NAME: 'ADORA AI Studio',
  VERSION: '1.1.0',

  API_KEYS: {
    // Recommended: leave blank and save the key from the in-app Settings page.
    OPENROUTER_API_KEY: '',
    SHOTSTACK_API_KEY: '',
  },

  MODELS: {
    PLANNER: 'google/gemini-3.6-flash',
    IMAGE: 'google/gemini-3.1-flash-image',
    VIDEO: 'google/veo-3.1-fast',
  },

  API: {
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
    SHOTSTACK_BASE_URL: 'https://api.shotstack.io/edit',
  },

  WORKFLOW: {
    OUTPUT_FOLDER_NAME: 'ADORA AI Studio',
    SCENE_DURATION_SECONDS: 8,
    MAX_SCENES: 4,
    MAX_IMAGE_BYTES: 5 * 1024 * 1024,
    HISTORY_LIMIT: 20,
    POLL_INTERVAL_SECONDS: 20,
    DEFAULT_SHOTSTACK_ENV: 'stage', // stage = watermarked sandbox; v1 = live production
  },

  COST_GUIDE_USD: {
    VIDEO_PER_SECOND: 0.10,
    OTHER_MIN: 0.30,
    OTHER_MAX: 1.00,
  },
};

const PROPERTY_KEYS = {
  OPENROUTER: 'ADORA_OPENROUTER_API_KEY',
  SHOTSTACK: 'ADORA_SHOTSTACK_API_KEY',
  SHOTSTACK_ENV: 'ADORA_SHOTSTACK_ENV',
  MODEL_PLANNER: 'ADORA_MODEL_PLANNER',
  MODEL_IMAGE: 'ADORA_MODEL_IMAGE',
  MODEL_VIDEO: 'ADORA_MODEL_VIDEO',
  ROOT_FOLDER_ID: 'ADORA_ROOT_FOLDER_ID',
  CAMPAIGN_INDEX: 'ADORA_CAMPAIGN_INDEX',
  CAMPAIGN_PREFIX: 'ADORA_CAMPAIGN_',
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(APP_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Client bootstrap. Never returns API key values. */
function getBootstrapData() {
  return {
    app: {
      name: APP_CONFIG.APP_NAME,
      version: APP_CONFIG.VERSION,
      limits: {
        maxImageBytes: APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES,
        maxScenes: APP_CONFIG.WORKFLOW.MAX_SCENES,
        sceneDuration: APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS,
        pollInterval: APP_CONFIG.WORKFLOW.POLL_INTERVAL_SECONDS,
      },
      defaults: {
        plannerModel: getModel_('PLANNER'),
        imageModel: getModel_('IMAGE'),
        videoModel: getModel_('VIDEO'),
        shotstackEnv: getShotstackEnv_(),
      },
    },
    settings: getSettingsStatus_(),
    campaigns: listCampaigns_(),
  };
}

/** Store keys server-side. Blank values preserve existing keys. */
function saveApiSettings(input) {
  input = input || {};
  const props = PropertiesService.getScriptProperties();

  if (input.openrouterKey && !isMaskedValue_(input.openrouterKey)) {
    props.setProperty(PROPERTY_KEYS.OPENROUTER, String(input.openrouterKey).trim());
  }
  if (input.shotstackKey && !isMaskedValue_(input.shotstackKey)) {
    props.setProperty(PROPERTY_KEYS.SHOTSTACK, String(input.shotstackKey).trim());
  }
  if (input.clearOpenrouterKey === true) props.deleteProperty(PROPERTY_KEYS.OPENROUTER);
  if (input.clearShotstackKey === true) props.deleteProperty(PROPERTY_KEYS.SHOTSTACK);

  if (input.shotstackEnv) {
    const env = String(input.shotstackEnv).toLowerCase() === 'v1' ? 'v1' : 'stage';
    props.setProperty(PROPERTY_KEYS.SHOTSTACK_ENV, env);
  }

  const models = input.models || {};
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_PLANNER, models.planner);
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_IMAGE, models.image);
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_VIDEO, models.video);

  return getSettingsStatus_();
}

function testApiConnection(service) {
  const target = String(service || 'openrouter').toLowerCase();
  if (target === 'shotstack') {
    const key = getSecret_('SHOTSTACK');
    if (!key) throw new Error('ยังไม่ได้ตั้งค่า Shotstack API key');
    const url = `${APP_CONFIG.API.SHOTSTACK_BASE_URL}/${getShotstackEnv_()}/render/not-a-render-id`;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'x-api-key': key, Accept: 'application/json' },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    if (code === 401 || code === 403) throw new Error('Shotstack API key ไม่ถูกต้องหรือไม่ตรงกับ environment');
    return { ok: true, message: `เชื่อมต่อ Shotstack ${getShotstackEnv_()} สำเร็จ`, code };
  }

  const key = getSecret_('OPENROUTER');
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า OpenRouter API key');
  const response = UrlFetchApp.fetch(`${APP_CONFIG.API.OPENROUTER_BASE_URL}/key`, {
    method: 'get',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    muteHttpExceptions: true,
  });
  const json = parseResponse_(response, 'OpenRouter');
  return {
    ok: true,
    message: 'เชื่อมต่อ OpenRouter สำเร็จ',
    keyInfo: json.data || null,
  };
}

/**
 * Starts the full asynchronous workflow:
 * plan -> key visual -> submit 1-4 video scenes.
 * The browser continues with pollCampaign() until a final MP4 is ready.
 */
function startCampaign(payload) {
  payload = validateCampaignPayload_(payload || {});
  if (!getSecret_('OPENROUTER')) {
    throw new Error('กรุณาใส่ OpenRouter API key ที่เมนู Settings ก่อนเริ่มสร้าง');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let record;
  try {
    const campaignId = Utilities.getUuid();
    const folder = createCampaignFolder_(payload.productName, campaignId);
    const productFile = saveDataUrlFile_(payload.productImage, `product-${campaignId}.jpg`, folder);
    const presenterFile = payload.presenterImage
      ? saveDataUrlFile_(payload.presenterImage, `presenter-${campaignId}.jpg`, folder)
      : null;

    record = {
      id: campaignId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'planning',
      progress: 10,
      statusText: 'AI กำลังวิเคราะห์สินค้าและวางแนวคิด',
      productName: payload.productName,
      platform: payload.platform,
      style: payload.style,
      duration: payload.duration,
      aspectRatio: '9:16',
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      productFileId: productFile.getId(),
      presenterFileId: presenterFile ? presenterFile.getId() : '',
      estimatedCost: estimateCampaignCost_(payload.duration),
      scenes: [],
      error: '',
    };
    saveCampaign_(record, true);

    const sceneCount = Math.min(
      APP_CONFIG.WORKFLOW.MAX_SCENES,
      Math.max(1, Math.ceil(payload.duration / APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS))
    );
    const plan = generateCreativePlan_(payload, sceneCount);
    record.plan = plan;
    record.progress = 28;
    record.status = 'visual';
    record.statusText = 'กำลังสร้าง Key Visual ให้สินค้าและพรีเซนเตอร์';
    saveCampaign_(record);

    const keyVisual = generateKeyVisual_(payload, plan);
    const keyVisualFile = saveBase64File_(
      keyVisual.base64,
      keyVisual.mimeType || 'image/png',
      `key-visual-${campaignId}.png`,
      folder
    );
    // Video providers require a directly downloadable HTTPS first-frame URL.
    keyVisualFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const keyVisualDirectUrl = driveDirectUrl_(keyVisualFile.getId());
    record.keyVisualFileId = keyVisualFile.getId();
    record.keyVisualUrl = keyVisualDirectUrl;
    record.keyVisualDriveUrl = keyVisualFile.getUrl();
    record.progress = 42;
    record.status = 'submitting';
    record.statusText = `กำลังส่งงานวิดีโอ ${sceneCount} ฉากเข้าคิว`;
    saveCampaign_(record);

    const scenes = [];
    for (let i = 0; i < sceneCount; i += 1) {
      const scenePlan = plan.scenes[i] || plan.scenes[plan.scenes.length - 1];
      const sceneDuration = Math.min(
        APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS,
        payload.duration - i * APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS
      );
      const job = submitVideoScene_(payload, plan, scenePlan, keyVisualDirectUrl, sceneDuration, i);
      scenes.push({
        index: i + 1,
        title: scenePlan.title || `Scene ${i + 1}`,
        voiceover: scenePlan.voiceover || '',
        overlay: scenePlan.overlay || '',
        duration: sceneDuration,
        jobId: job.id,
        pollingUrl: job.polling_url || `${APP_CONFIG.API.OPENROUTER_BASE_URL}/videos/${job.id}`,
        status: job.status || 'pending',
        cost: 0,
      });
    }

    record.scenes = scenes;
    record.status = 'generating';
    record.progress = 50;
    record.statusText = 'AI กำลังสร้างวิดีโอและเสียงให้แต่ละฉาก';
    saveCampaign_(record);
    return publicCampaign_(record);
  } catch (error) {
    if (record) {
      record.status = 'failed';
      record.error = cleanError_(error);
      record.statusText = 'สร้างแคมเปญไม่สำเร็จ';
      saveCampaign_(record);
    }
    throw new Error(cleanError_(error));
  } finally {
    lock.releaseLock();
  }
}

/** Polls providers and advances the workflow without blocking Apps Script. */
function pollCampaign(campaignId) {
  const record = getCampaignRecord_(campaignId);
  if (!record) throw new Error('ไม่พบแคมเปญนี้');
  if (['completed', 'failed'].indexOf(record.status) >= 0) return publicCampaign_(record);

  try {
    if (record.status === 'generating' || record.status === 'submitting') {
      advanceVideoJobs_(record);
    }
    if (record.status === 'rendering') {
      advanceShotstackRender_(record);
    }
    saveCampaign_(record);
    return publicCampaign_(record);
  } catch (error) {
    record.status = 'failed';
    record.error = cleanError_(error);
    record.statusText = 'ระบบหยุดทำงานเนื่องจากเกิดข้อผิดพลาด';
    saveCampaign_(record);
    return publicCampaign_(record);
  }
}

function getCampaign(campaignId) {
  const record = getCampaignRecord_(campaignId);
  if (!record) throw new Error('ไม่พบแคมเปญนี้');
  return publicCampaign_(record);
}

function advanceVideoJobs_(record) {
  const apiKey = getSecret_('OPENROUTER');
  const folder = DriveApp.getFolderById(record.folderId);
  let completed = 0;
  let failed = 0;
  let totalCost = 0;

  record.scenes.forEach((scene) => {
    if (scene.status === 'completed' && scene.fileId) {
      completed += 1;
      totalCost += Number(scene.cost || 0);
      return;
    }

    const pollUrl = normalizeOpenRouterUrl_(scene.pollingUrl || `/videos/${scene.jobId}`);
    const response = UrlFetchApp.fetch(pollUrl, {
      method: 'get',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      muteHttpExceptions: true,
    });
    const result = parseResponse_(response, `ตรวจสถานะ Scene ${scene.index}`);
    scene.status = result.status || scene.status;
    scene.error = result.error || '';
    scene.cost = result.usage && result.usage.cost ? Number(result.usage.cost) : Number(scene.cost || 0);
    totalCost += scene.cost;

    if (scene.status === 'completed' && !scene.fileId) {
      const sourceUrl = result.unsigned_urls && result.unsigned_urls[0]
        ? result.unsigned_urls[0]
        : `${APP_CONFIG.API.OPENROUTER_BASE_URL}/videos/${scene.jobId}/content?index=0`;
      const blob = downloadOpenRouterVideo_(sourceUrl, apiKey).setName(`scene-${scene.index}.mp4`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      scene.fileId = file.getId();
      scene.driveUrl = file.getUrl();
      scene.publicUrl = driveDirectUrl_(file.getId());
      completed += 1;
    } else if (['failed', 'cancelled', 'expired'].indexOf(scene.status) >= 0) {
      failed += 1;
    }
  });

  record.actualCost = totalCost;
  if (failed > 0) {
    const details = record.scenes.filter((s) => s.error).map((s) => `Scene ${s.index}: ${s.error}`).join(' | ');
    throw new Error(details || 'มีวิดีโอบางฉากสร้างไม่สำเร็จ');
  }

  const total = record.scenes.length;
  record.progress = 50 + Math.round((completed / total) * 34);
  record.statusText = `สร้างวิดีโอสำเร็จแล้ว ${completed}/${total} ฉาก`;

  if (completed !== total) return;

  if (total === 1) {
    const only = record.scenes[0];
    record.status = 'completed';
    record.progress = 100;
    record.statusText = 'โฆษณาพร้อมใช้งานแล้ว';
    record.finalUrl = only.publicUrl;
    record.finalDriveUrl = only.driveUrl;
    record.completedAt = new Date().toISOString();
    return;
  }

  const shotstackKey = getSecret_('SHOTSTACK');
  if (!shotstackKey) {
    record.status = 'needs_render_key';
    record.progress = 85;
    record.statusText = 'สร้างทุกฉากแล้ว — ใส่ Shotstack key เพื่อรวมเป็นไฟล์เดียว';
    record.sceneDownloads = record.scenes.map((s) => ({ index: s.index, url: s.publicUrl, driveUrl: s.driveUrl }));
    return;
  }

  const render = submitShotstackRender_(record, shotstackKey);
  record.shotstackRenderId = render.response.id;
  record.status = 'rendering';
  record.progress = 88;
  record.statusText = 'กำลังรวมคลิป ใส่ซับอัตโนมัติ และ Export MP4';
}

function resumeRender(campaignId) {
  const record = getCampaignRecord_(campaignId);
  if (!record) throw new Error('ไม่พบแคมเปญนี้');
  if (record.status !== 'needs_render_key') return publicCampaign_(record);
  const key = getSecret_('SHOTSTACK');
  if (!key) throw new Error('กรุณาใส่ Shotstack API key ก่อนรวมวิดีโอ');
  const render = submitShotstackRender_(record, key);
  record.shotstackRenderId = render.response.id;
  record.status = 'rendering';
  record.progress = 88;
  record.statusText = 'กำลังรวมคลิป ใส่ซับอัตโนมัติ และ Export MP4';
  saveCampaign_(record);
  return publicCampaign_(record);
}

function advanceShotstackRender_(record) {
  const key = getSecret_('SHOTSTACK');
  if (!key) throw new Error('ไม่พบ Shotstack API key');
  const url = `${APP_CONFIG.API.SHOTSTACK_BASE_URL}/${getShotstackEnv_()}/render/${record.shotstackRenderId}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'x-api-key': key, Accept: 'application/json' },
    muteHttpExceptions: true,
  });
  const result = parseResponse_(response, 'Shotstack render');
  const render = result.response || {};
  record.renderStatus = render.status || 'queued';

  const progressMap = { queued: 89, fetching: 90, preprocessing: 92, rendering: 95, saving: 98 };
  record.progress = progressMap[render.status] || record.progress;
  record.statusText = `กำลัง Export วิดีโอ: ${render.status || 'queued'}`;

  if (render.status === 'failed') throw new Error(render.error || 'Shotstack render failed');
  if (render.status !== 'done') return;

  const folder = DriveApp.getFolderById(record.folderId);
  const videoResponse = UrlFetchApp.fetch(render.url, { muteHttpExceptions: true });
  if (videoResponse.getResponseCode() >= 300) throw new Error('ดาวน์โหลดวิดีโอที่รวมแล้วไม่สำเร็จ');
  const finalFile = folder.createFile(videoResponse.getBlob().setName(`${safeFileName_(record.productName)}-final.mp4`));
  finalFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  record.finalUrl = driveDirectUrl_(finalFile.getId());
  record.finalDriveUrl = finalFile.getUrl();
  record.finalFileId = finalFile.getId();
  record.status = 'completed';
  record.progress = 100;
  record.statusText = 'โฆษณาพร้อมใช้งานแล้ว';
  record.completedAt = new Date().toISOString();
}

function generateCreativePlan_(payload, sceneCount) {
  const systemPrompt = [
    'You are a senior Thai creative director and performance advertising strategist.',
    'Create a truthful, premium vertical social ad. Preserve the exact product identity, packaging, colors, and logo.',
    'Do not invent medical, financial, guaranteed, or unverifiable claims.',
    'Return JSON only. Write consumer-facing copy and voiceover in Thai.',
  ].join(' ');

  const brief = {
    productName: payload.productName,
    category: payload.category,
    sellingPoints: payload.sellingPoints,
    audience: payload.audience,
    offer: payload.offer,
    forbiddenClaims: payload.forbiddenClaims,
    style: payload.style,
    tone: payload.tone,
    presenter: payload.presenterDescription,
    platform: payload.platform,
    durationSeconds: payload.duration,
    sceneCount,
    callToAction: payload.callToAction,
  };

  const schemaInstruction = [
    `Create exactly ${sceneCount} scenes, each no longer than ${APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS} seconds.`,
    'JSON schema:',
    '{"title":"","angle":"","hook":"","audience":"","visualDirection":"","narrationStyle":"","caption":"","hashtags":[""],"safetyNotes":[""],"keyVisualPrompt":"","scenes":[{"index":1,"title":"","duration":8,"voiceover":"","visualPrompt":"","camera":"","motion":"","overlay":""}]}',
    'For each visualPrompt, explicitly demand photorealistic product fidelity and vertical 9:16 composition.',
    'Avoid asking the video model to draw readable text; overlay text will be added later.',
  ].join('\n');

  const content = [
    { type: 'text', text: `Campaign brief:\n${JSON.stringify(brief)}\n\n${schemaInstruction}` },
    { type: 'image_url', image_url: { url: payload.productImage } },
  ];
  if (payload.presenterImage) {
    content.push({ type: 'image_url', image_url: { url: payload.presenterImage } });
  }

  const result = openRouterRequest_('/chat/completions', {
    model: getModel_('PLANNER'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.65,
    max_tokens: 3000,
  });

  const raw = result.choices && result.choices[0] && result.choices[0].message
    ? result.choices[0].message.content
    : '';
  const parsed = parseJsonContent_(raw);
  return normalizePlan_(parsed, payload, sceneCount);
}

function generateKeyVisual_(payload, plan) {
  const references = [
    { type: 'image_url', image_url: { url: payload.productImage } },
  ];
  if (payload.presenterImage) references.push({ type: 'image_url', image_url: { url: payload.presenterImage } });

  const prompt = [
    plan.keyVisualPrompt || plan.visualDirection,
    `Premium ${payload.style} advertising key visual for ${payload.productName}.`,
    payload.presenterImage
      ? 'Use the supplied presenter reference with consistent identity and natural anatomy.'
      : `Create an original AI presenter matching this description: ${payload.presenterDescription || 'friendly Thai presenter, modern and trustworthy'}.`,
    'The supplied product is the absolute source of truth: exact shape, packaging, colors, material, logo placement and proportions.',
    'Vertical 9:16, photorealistic commercial lighting, clean composition, safe margins, no extra products, no watermarks, no generated text.',
  ].join(' ');

  const result = openRouterRequest_('/images', {
    model: getModel_('IMAGE'),
    prompt,
    aspect_ratio: '9:16',
    resolution: '1K',
    n: 1,
    input_references: references,
  });

  const image = result.data && result.data[0];
  if (!image || !image.b64_json) throw new Error('โมเดลไม่ได้ส่งภาพ Key Visual กลับมา');
  return { base64: image.b64_json, mimeType: image.media_type || 'image/png' };
}

function submitVideoScene_(payload, plan, scene, keyVisualUrl, duration, sceneIndex) {
  const prompt = [
    `Vertical premium social advertisement, scene ${sceneIndex + 1}.`,
    scene.visualPrompt || '',
    `Camera: ${scene.camera || 'natural handheld commercial shot'}.`,
    `Motion: ${scene.motion || 'subtle realistic motion and confident product interaction'}.`,
    `Thai spoken dialogue: ${scene.voiceover || ''}`,
    `Overall direction: ${plan.visualDirection || ''}`,
    'Keep the presenter face, hands, product package, logo, colors and proportions consistent with the first frame.',
    'Natural physics, realistic fingers, clean commercial lighting. Do not generate any on-screen text, subtitles, logos or watermark.',
  ].join(' ');

  return openRouterRequest_('/videos', {
    model: getModel_('VIDEO'),
    prompt,
    duration: Math.max(4, Number(duration) || APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS),
    resolution: '720p',
    aspect_ratio: '9:16',
    generate_audio: true,
    frame_images: [{
      type: 'image_url',
      image_url: { url: keyVisualUrl },
      frame_type: 'first_frame',
    }],
  });
}

function submitShotstackRender_(record, apiKey) {
  const duration = Number(record.duration);
  const videoClips = [];
  let cursor = 0;
  record.scenes.forEach((scene, index) => {
    const length = Math.min(Number(scene.duration || 8), duration - cursor);
    videoClips.push({
      asset: { type: 'video', src: scene.publicUrl, volume: 1 },
      start: cursor,
      length,
      fit: 'cover',
      alias: `scene-${index + 1}`,
      transition: {
        in: index === 0 ? 'none' : 'fade',
        out: index === record.scenes.length - 1 ? 'none' : 'fade',
      },
    });
    cursor += length;
  });

  const captionClips = videoClips.map((clip, index) => ({
    asset: {
      type: 'rich-caption',
      src: `alias://scene-${index + 1}`,
      font: { family: 'Noto Sans Thai', size: 46, weight: 700, color: '#ffffff', opacity: 1 },
      active: { font: { color: '#c8ff62', opacity: 1 } },
      stroke: { width: 3, color: '#05070d', opacity: 0.95 },
      animation: { style: 'highlight' },
      align: { horizontal: 'center', vertical: 'bottom' },
    },
    start: clip.start,
    length: clip.length,
    position: 'bottom',
    offset: { y: 0.12 },
  }));

  const payload = {
    timeline: {
      background: '#05070d',
      fonts: [{
        src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansthai/NotoSansThai%5Bwdth%2Cwght%5D.ttf',
      }],
      tracks: [
        { clips: captionClips },
        { clips: videoClips },
      ],
      cache: true,
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      aspectRatio: '9:16',
      fps: 30,
      quality: 'high',
      poster: { capture: 1 },
      thumbnail: { capture: 1, scale: 0.3 },
    },
  };

  const url = `${APP_CONFIG.API.SHOTSTACK_BASE_URL}/${getShotstackEnv_()}/render`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return parseResponse_(response, 'Shotstack');
}

function openRouterRequest_(path, body) {
  const key = getSecret_('OPENROUTER');
  if (!key) throw new Error('ไม่พบ OpenRouter API key');
  const response = UrlFetchApp.fetch(`${APP_CONFIG.API.OPENROUTER_BASE_URL}${path}`, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'X-Title': APP_CONFIG.APP_NAME,
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  return parseResponse_(response, `OpenRouter ${path}`);
}

function parseResponse_(response, label) {
  const code = response.getResponseCode();
  const text = response.getContentText();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    json = { raw: text };
  }
  if (code < 200 || code >= 300) {
    const message = (json.error && (json.error.message || json.error)) || json.message || text || `HTTP ${code}`;
    throw new Error(`${label}: ${message}`);
  }
  return json;
}

function downloadOpenRouterVideo_(url, apiKey) {
  const headers = String(url).indexOf('openrouter.ai/api/') >= 0
    ? { Authorization: `Bearer ${apiKey}` }
    : {};
  const response = UrlFetchApp.fetch(url, { method: 'get', headers, muteHttpExceptions: true });
  if (response.getResponseCode() >= 300) {
    throw new Error(`ดาวน์โหลด Scene ไม่สำเร็จ (HTTP ${response.getResponseCode()})`);
  }
  return response.getBlob();
}

function validateCampaignPayload_(input) {
  if (!input.productImage) throw new Error('กรุณาอัปโหลดรูปสินค้า');
  if (!input.productName || String(input.productName).trim().length < 2) throw new Error('กรุณาใส่ชื่อสินค้า');
  if (!input.sellingPoints || String(input.sellingPoints).trim().length < 5) throw new Error('กรุณาใส่จุดขายของสินค้า');
  if (input.acceptRights !== true) throw new Error('กรุณายืนยันสิทธิ์การใช้รูปภาพและความถูกต้องของข้อมูลสินค้า');
  if (String(input.productImage).length > APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES * 1.45) {
    throw new Error('รูปสินค้ามีขนาดใหญ่เกิน 5 MB');
  }
  if (input.presenterImage && String(input.presenterImage).length > APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES * 1.45) {
    throw new Error('รูปพรีเซนเตอร์มีขนาดใหญ่เกิน 5 MB');
  }

  const allowedDurations = [8, 16, 24, 32];
  const duration = allowedDurations.indexOf(Number(input.duration)) >= 0 ? Number(input.duration) : 8;
  return {
    productImage: String(input.productImage),
    presenterImage: input.presenterImage ? String(input.presenterImage) : '',
    productName: cleanText_(input.productName, 120),
    category: cleanText_(input.category || 'สินค้าอุปโภคบริโภค', 120),
    sellingPoints: cleanText_(input.sellingPoints, 1200),
    audience: cleanText_(input.audience || 'ผู้บริโภคออนไลน์ในประเทศไทย', 400),
    offer: cleanText_(input.offer || '', 400),
    forbiddenClaims: cleanText_(input.forbiddenClaims || '', 500),
    presenterDescription: cleanText_(input.presenterDescription || 'พรีเซนเตอร์ไทย บุคลิกเป็นมิตร ดูน่าเชื่อถือ', 400),
    style: cleanText_(input.style || 'ugc', 60),
    tone: cleanText_(input.tone || 'มั่นใจ เป็นธรรมชาติ', 120),
    platform: cleanText_(input.platform || 'TikTok', 40),
    duration,
    callToAction: cleanText_(input.callToAction || 'สั่งซื้อเลย', 120),
    acceptRights: true,
  };
}

function normalizePlan_(plan, payload, sceneCount) {
  plan = plan && typeof plan === 'object' ? plan : {};
  const scenes = Array.isArray(plan.scenes) ? plan.scenes.slice(0, sceneCount) : [];
  while (scenes.length < sceneCount) {
    const index = scenes.length + 1;
    scenes.push({
      index,
      title: index === 1 ? 'Hook' : index === sceneCount ? 'CTA' : `Product moment ${index}`,
      duration: APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS,
      voiceover: index === sceneCount
        ? `${payload.callToAction} ${payload.productName}`
        : `${payload.productName} ${payload.sellingPoints}`,
      visualPrompt: `Premium vertical ${payload.style} product advertisement, scene ${index}, presenter naturally demonstrates the product`,
      camera: index === 1 ? 'fast handheld push-in' : 'smooth commercial close-up',
      motion: 'natural presenter and product movement',
      overlay: index === sceneCount ? payload.callToAction : payload.productName,
    });
  }
  plan.title = cleanText_(plan.title || `${payload.productName} — ${payload.style}`, 160);
  plan.angle = cleanText_(plan.angle || payload.sellingPoints, 600);
  plan.hook = cleanText_(plan.hook || `หยุดก่อน ถ้าคุณกำลังมองหา ${payload.productName}`, 400);
  plan.audience = cleanText_(plan.audience || payload.audience, 400);
  plan.visualDirection = cleanText_(plan.visualDirection || `Premium ${payload.style}, photorealistic, vertical 9:16`, 800);
  plan.narrationStyle = cleanText_(plan.narrationStyle || payload.tone, 300);
  plan.caption = cleanText_(plan.caption || `${payload.productName} ${payload.callToAction}`, 1000);
  plan.hashtags = Array.isArray(plan.hashtags) ? plan.hashtags.slice(0, 12) : ['#รีวิวสินค้า', '#TikTokMadeMeBuyIt'];
  plan.safetyNotes = Array.isArray(plan.safetyNotes) ? plan.safetyNotes.slice(0, 8) : [];
  plan.keyVisualPrompt = cleanText_(plan.keyVisualPrompt || plan.visualDirection, 1600);
  plan.scenes = scenes.map((scene, i) => ({
    index: i + 1,
    title: cleanText_(scene.title || `Scene ${i + 1}`, 120),
    duration: Math.min(APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS, Number(scene.duration) || APP_CONFIG.WORKFLOW.SCENE_DURATION_SECONDS),
    voiceover: cleanText_(scene.voiceover || '', 700),
    visualPrompt: cleanText_(scene.visualPrompt || '', 1400),
    camera: cleanText_(scene.camera || '', 300),
    motion: cleanText_(scene.motion || '', 300),
    overlay: cleanText_(scene.overlay || '', 160),
  }));
  return plan;
}

function estimateCampaignCost_(duration) {
  const video = Number(duration) * APP_CONFIG.COST_GUIDE_USD.VIDEO_PER_SECOND;
  return {
    min: roundMoney_(video + APP_CONFIG.COST_GUIDE_USD.OTHER_MIN),
    max: roundMoney_(video + APP_CONFIG.COST_GUIDE_USD.OTHER_MAX),
    currency: 'USD',
    note: 'ประมาณการก่อน retry และไม่รวมค่าบริการ Shotstack',
  };
}

function getSettingsStatus_() {
  const openrouter = getSecret_('OPENROUTER');
  const shotstack = getSecret_('SHOTSTACK');
  return {
    openrouterConfigured: Boolean(openrouter),
    shotstackConfigured: Boolean(shotstack),
    openrouterMasked: maskKey_(openrouter),
    shotstackMasked: maskKey_(shotstack),
    shotstackEnv: getShotstackEnv_(),
    models: {
      planner: getModel_('PLANNER'),
      image: getModel_('IMAGE'),
      video: getModel_('VIDEO'),
    },
  };
}

function getSecret_(service) {
  const props = PropertiesService.getScriptProperties();
  if (service === 'OPENROUTER') {
    return String(APP_CONFIG.API_KEYS.OPENROUTER_API_KEY || props.getProperty(PROPERTY_KEYS.OPENROUTER) || '').trim();
  }
  return String(APP_CONFIG.API_KEYS.SHOTSTACK_API_KEY || props.getProperty(PROPERTY_KEYS.SHOTSTACK) || '').trim();
}

function getModel_(type) {
  const props = PropertiesService.getScriptProperties();
  const keyMap = {
    PLANNER: PROPERTY_KEYS.MODEL_PLANNER,
    IMAGE: PROPERTY_KEYS.MODEL_IMAGE,
    VIDEO: PROPERTY_KEYS.MODEL_VIDEO,
  };
  return props.getProperty(keyMap[type]) || APP_CONFIG.MODELS[type];
}

function getShotstackEnv_() {
  const value = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SHOTSTACK_ENV)
    || APP_CONFIG.WORKFLOW.DEFAULT_SHOTSTACK_ENV;
  return String(value).toLowerCase() === 'v1' ? 'v1' : 'stage';
}

function createCampaignFolder_(productName, id) {
  const root = getRootFolder_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  return root.createFolder(`${stamp}-${safeFileName_(productName)}-${id.slice(0, 6)}`);
}

function getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(PROPERTY_KEYS.ROOT_FOLDER_ID);
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (error) { /* recreate below */ }
  }
  const folders = DriveApp.getFoldersByName(APP_CONFIG.WORKFLOW.OUTPUT_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(APP_CONFIG.WORKFLOW.OUTPUT_FOLDER_NAME);
  props.setProperty(PROPERTY_KEYS.ROOT_FOLDER_ID, folder.getId());
  return folder;
}

function saveDataUrlFile_(dataUrl, name, folder) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('รูปภาพไม่อยู่ในรูปแบบที่รองรับ');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES) throw new Error('รูปภาพมีขนาดใหญ่เกิน 5 MB');
  return folder.createFile(Utilities.newBlob(bytes, match[1], name));
}

function saveBase64File_(base64, mimeType, name, folder) {
  return folder.createFile(Utilities.newBlob(Utilities.base64Decode(base64), mimeType, name));
}

function saveCampaign_(record, addToIndex) {
  record.updatedAt = new Date().toISOString();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROPERTY_KEYS.CAMPAIGN_PREFIX + record.id, JSON.stringify(record));
  if (addToIndex) {
    let ids = parseJsonSafe_(props.getProperty(PROPERTY_KEYS.CAMPAIGN_INDEX), []);
    ids = [record.id].concat(ids.filter((id) => id !== record.id)).slice(0, APP_CONFIG.WORKFLOW.HISTORY_LIMIT);
    props.setProperty(PROPERTY_KEYS.CAMPAIGN_INDEX, JSON.stringify(ids));
  }
}

function getCampaignRecord_(campaignId) {
  if (!campaignId) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.CAMPAIGN_PREFIX + campaignId);
  return raw ? parseJsonSafe_(raw, null) : null;
}

function listCampaigns_() {
  const props = PropertiesService.getScriptProperties();
  const ids = parseJsonSafe_(props.getProperty(PROPERTY_KEYS.CAMPAIGN_INDEX), []);
  return ids.map((id) => {
    const record = getCampaignRecord_(id);
    return record ? publicCampaign_(record, true) : null;
  }).filter(Boolean);
}

function publicCampaign_(record, compact) {
  const result = {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || '',
    status: record.status,
    statusText: record.statusText,
    progress: Number(record.progress || 0),
    productName: record.productName,
    platform: record.platform,
    style: record.style,
    duration: record.duration,
    aspectRatio: record.aspectRatio,
    folderUrl: record.folderUrl,
    keyVisualUrl: record.keyVisualUrl || '',
    keyVisualDriveUrl: record.keyVisualDriveUrl || '',
    finalUrl: record.finalUrl || '',
    finalDriveUrl: record.finalDriveUrl || '',
    error: record.error || '',
    estimatedCost: record.estimatedCost || null,
    actualCost: Number(record.actualCost || 0),
    renderStatus: record.renderStatus || '',
  };
  if (!compact) {
    result.plan = record.plan || null;
    result.scenes = (record.scenes || []).map((scene) => ({
      index: scene.index,
      title: scene.title,
      voiceover: scene.voiceover,
      overlay: scene.overlay,
      duration: scene.duration,
      status: scene.status,
      driveUrl: scene.driveUrl || '',
      publicUrl: scene.publicUrl || '',
      error: scene.error || '',
      cost: Number(scene.cost || 0),
    }));
    result.sceneDownloads = record.sceneDownloads || [];
  }
  return result;
}

function parseJsonContent_(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(text); } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('AI ส่ง Creative Plan กลับมาในรูปแบบที่อ่านไม่ได้');
  }
}

function parseJsonSafe_(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch (error) { return fallback; }
}

function normalizeOpenRouterUrl_(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${APP_CONFIG.API.OPENROUTER_BASE_URL}${String(url).startsWith('/') ? '' : '/'}${url}`;
}

function driveDirectUrl_(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function setOptionalProperty_(props, key, value) {
  if (value && String(value).trim()) props.setProperty(key, String(value).trim());
}

function isMaskedValue_(value) {
  return String(value || '').indexOf('••••') >= 0;
}

function maskKey_(key) {
  if (!key) return '';
  const text = String(key);
  return text.length <= 8 ? '••••••••' : `${text.slice(0, 5)}••••••${text.slice(-4)}`;
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

function safeFileName_(value) {
  const cleaned = cleanText_(value, 70).replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, '-');
  return cleaned || 'campaign';
}

function cleanError_(error) {
  const message = error && error.message ? error.message : String(error || 'Unknown error');
  return message.replace(/^Exception:\s*/i, '').slice(0, 1500);
}

function roundMoney_(value) {
  return Math.round(Number(value) * 100) / 100;
}
