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
  VERSION: '1.4.0',

  API_KEYS: {
    // Recommended: leave blank and save the key from the in-app Settings page.
    OPENROUTER_API_KEY: '',
  },

  MODELS: {
    PLANNER: 'google/gemini-2.5-flash-lite',
    IMAGE: 'google/gemini-3.1-flash-lite-image',
    VIDEO: 'bytedance/seedance-1-5-pro',
  },

  DEFAULT_MODEL_TIER: 'economy',
  MODEL_TIERS: {
    economy: {
      id: 'economy',
      label: 'ประหยัด · เริ่มทดลอง',
      shortLabel: 'ประหยัด',
      badge: 'เริ่มต้นที่แนะนำ',
      description: 'ต้นทุนต่ำ สร้างคลิปพร้อมเสียงผ่าน OpenRouter เหมาะสำหรับทดลองงาน สูงสุด 12 วินาที',
      planner: { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      image: { id: 'google/gemini-3.1-flash-lite-image', name: 'Nano Banana 2 Lite', resolution: '1K' },
      video: { id: 'bytedance/seedance-1-5-pro', name: 'Seedance 1.5 Pro', pricePerSecond: 0.05184, resolution: '720p', maxDuration: 12, generateAudio: true },
      otherMin: 0.04,
      otherMax: 0.10,
    },
    balanced: {
      id: 'balanced',
      label: 'สมดุล · งานมาตรฐาน',
      shortLabel: 'สมดุล',
      badge: 'คุณภาพคุ้มราคา',
      description: 'สมดุลด้านราคา ความเร็ว และคุณภาพ ใช้ Seedance 2.0 Fast สร้างคลิปเดียวสูงสุด 15 วินาที',
      planner: { id: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
      image: { id: 'google/gemini-3.1-flash-image', name: 'Nano Banana 2', resolution: '1K' },
      video: { id: 'bytedance/seedance-2.0-fast', name: 'Seedance 2.0 Fast', pricePerSecond: 0.12096, resolution: '720p', maxDuration: 15, generateAudio: true },
      otherMin: 0.09,
      otherMax: 0.20,
    },
    premium: {
      id: 'premium',
      label: 'พรีเมียม · ดีที่สุด',
      shortLabel: 'พรีเมียม',
      badge: 'Final production',
      description: 'คุณภาพสูงสุด ใช้ Seedance 2.0 ที่ 1080p พร้อมเสียง สร้างคลิปเดียวสูงสุด 15 วินาที',
      planner: { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5' },
      image: { id: 'google/gemini-3-pro-image', name: 'Nano Banana Pro', resolution: '2K' },
      video: { id: 'bytedance/seedance-2.0', name: 'Seedance 2.0', pricePerSecond: 0.3402, resolution: '1080p', maxDuration: 15, generateAudio: true },
      otherMin: 0.28,
      otherMax: 0.50,
    },
  },

  API: {
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  },

  WORKFLOW: {
    OUTPUT_FOLDER_NAME: 'ADORA AI Studio',
    DEFAULT_DURATION_SECONDS: 8,
    ALLOWED_DURATIONS: [8, 10, 12, 15],
    MAX_IMAGE_BYTES: 5 * 1024 * 1024,
    HISTORY_LIMIT: 20,
    POLL_INTERVAL_SECONDS: 20,
  },

  PROMPT_SETS: {
    sales_boost: {
      id: 'sales_boost',
      label: 'ขายไว กระตุ้นยอด',
      style: 'UGC Review',
      tone: 'สนุก มั่นใจ และกระชับ',
      audience: 'นักช้อปออนไลน์ที่ต้องการเห็นประโยชน์ของสินค้าอย่างรวดเร็ว',
      callToAction: 'กดสั่งซื้อเลยวันนี้',
      instruction: 'เปิดด้วยปัญหาที่ตรงใจ โชว์สินค้าและประโยชน์ที่มองเห็นได้อย่างรวดเร็ว ปิดด้วยข้อเสนอและ CTA ชัดเจน',
    },
    trusted_review: {
      id: 'trusted_review',
      label: 'รีวิวจริง น่าเชื่อถือ',
      style: 'UGC Review',
      tone: 'จริงใจ เป็นธรรมชาติ และน่าเชื่อถือ',
      audience: 'ผู้ซื้อที่อ่านรีวิวและต้องการข้อมูลก่อนตัดสินใจ',
      callToAction: 'ดูรายละเอียดและลองด้วยตัวคุณเอง',
      instruction: 'เล่าเหมือนผู้ใช้จริง เริ่มจากเหตุผลที่ลองใช้ สาธิตสินค้าอย่างเป็นธรรมชาติ และสรุปความประทับใจโดยไม่กล่าวอ้างเกินจริง',
    },
    luxury_launch: {
      id: 'luxury_launch',
      label: 'เปิดตัวหรู พรีเมียม',
      style: 'Luxury',
      tone: 'หรู สุขุม และมั่นใจ',
      audience: 'ลูกค้าที่ให้ความสำคัญกับคุณภาพ งานออกแบบ และภาพลักษณ์',
      callToAction: 'สัมผัสประสบการณ์ระดับพรีเมียมได้แล้ววันนี้',
      instruction: 'เปิดตัวสินค้าแบบ cinematic ใช้แสงสตูดิโอและภาพ close-up เน้นวัสดุ รายละเอียด และคุณค่าของแบรนด์',
    },
    problem_solution: {
      id: 'problem_solution',
      label: 'ปัญหา → ทางออก',
      style: 'Product Focus',
      tone: 'เข้าใจง่าย ชัดเจน และช่วยแก้ปัญหา',
      audience: 'ผู้ชมที่กำลังพบปัญหาซึ่งสินค้านี้ช่วยตอบโจทย์ได้',
      callToAction: 'ลองทางเลือกที่ง่ายกว่าตั้งแต่วันนี้',
      instruction: 'แสดง pain point ที่พบได้จริงก่อน จากนั้นให้สินค้าเป็นทางเลือก สาธิตวิธีใช้และผลลัพธ์ที่สังเกตได้โดยไม่รับประกันเกินจริง',
    },
    lifestyle_story: {
      id: 'lifestyle_story',
      label: 'Lifestyle ใช้ในชีวิตจริง',
      style: 'Lifestyle',
      tone: 'อบอุ่น เป็นกันเอง และสร้างแรงบันดาลใจ',
      audience: 'ผู้ชมที่ชอบคอนเทนต์ชีวิตประจำวันและสินค้าที่เข้ากับไลฟ์สไตล์',
      callToAction: 'เพิ่มสิ่งนี้ให้วันของคุณได้เลย',
      instruction: 'เล่าเรื่องสั้นในชีวิตประจำวัน ให้สินค้าเข้ามาเป็นส่วนหนึ่งของกิจวัตรอย่างเป็นธรรมชาติ เน้นอารมณ์และประสบการณ์',
    },
    product_demo: {
      id: 'product_demo',
      label: 'สาธิตสินค้า เข้าใจทันที',
      style: 'Product Focus',
      tone: 'กระชับ ชัดเจน และเป็นมืออาชีพ',
      audience: 'ผู้ชมที่ต้องการเห็นวิธีใช้และจุดเด่นของสินค้าก่อนซื้อ',
      callToAction: 'ดูวิธีใช้แล้วเลือกสินค้าที่เหมาะกับคุณ',
      instruction: 'ให้สินค้าชัดที่สุด สาธิตขั้นตอนการใช้จากต้นจนจบ ใช้ close-up กับรายละเอียดที่มองเห็นได้ และจบด้วย CTA',
    },
  },

};

const PROPERTY_KEYS = {
  OPENROUTER: 'ADORA_OPENROUTER_API_KEY',
  MODEL_PLANNER: 'ADORA_MODEL_PLANNER',
  MODEL_IMAGE: 'ADORA_MODEL_IMAGE',
  MODEL_VIDEO: 'ADORA_MODEL_VIDEO',
  DEFAULT_MODEL_TIER: 'ADORA_DEFAULT_MODEL_TIER',
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
        maxScenes: 1,
        allowedDurations: APP_CONFIG.WORKFLOW.ALLOWED_DURATIONS,
        pollInterval: APP_CONFIG.WORKFLOW.POLL_INTERVAL_SECONDS,
      },
      defaults: {
        plannerModel: getModel_('PLANNER'),
        imageModel: getModel_('IMAGE'),
        videoModel: getModel_('VIDEO'),
        modelTier: getDefaultModelTier_(),
      },
      modelTiers: getPublicModelTiers_(),
      promptSets: getPublicPromptSets_(),
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
  if (input.clearOpenrouterKey === true) props.deleteProperty(PROPERTY_KEYS.OPENROUTER);

  if (input.modelTier) {
    props.setProperty(PROPERTY_KEYS.DEFAULT_MODEL_TIER, getModelTier_(input.modelTier).id);
  }

  const models = input.models || {};
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_PLANNER, models.planner);
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_IMAGE, models.image);
  setOptionalProperty_(props, PROPERTY_KEYS.MODEL_VIDEO, models.video);

  return getSettingsStatus_();
}

function testApiConnection(service) {
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
 * plan -> key visual -> submit one OpenRouter Seedance video.
 * The browser continues with pollCampaign() until a final MP4 is ready.
 */
function startCampaign(payload) {
  payload = validateCampaignPayload_(payload || {});
  const modelTier = getModelTier_(payload.modelTier);
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
      promptMode: payload.promptMode,
      promptSet: payload.promptSet,
      promptSetLabel: payload.promptSetLabel,
      duration: payload.duration,
      aspectRatio: '9:16',
      modelTier: modelTier.id,
      modelTierLabel: modelTier.shortLabel,
      models: {
        planner: modelTier.planner.id,
        image: modelTier.image.id,
        video: modelTier.video.id,
      },
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      productFileId: productFile.getId(),
      presenterFileId: presenterFile ? presenterFile.getId() : '',
      estimatedCost: estimateCampaignCost_(payload.duration, modelTier),
      scenes: [],
      error: '',
    };
    saveCampaign_(record, true);

    const sceneCount = 1;
    const plan = generateCreativePlan_(payload, sceneCount, modelTier);
    record.plan = plan;
    record.progress = 28;
    record.status = 'visual';
    record.statusText = 'กำลังสร้าง Key Visual ให้สินค้าและพรีเซนเตอร์';
    saveCampaign_(record);

    const keyVisual = generateKeyVisual_(payload, plan, modelTier);
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
    record.statusText = `กำลังส่งวิดีโอ Seedance ${payload.duration} วินาทีเข้าคิว OpenRouter`;
    saveCampaign_(record);

    const scenePlan = plan.scenes[0];
    const job = submitVideo_(payload, plan, scenePlan, keyVisualDirectUrl, modelTier);
    const scenes = [{
      index: 1,
      title: scenePlan.title || 'Full advertisement',
      voiceover: scenePlan.voiceover || '',
      overlay: scenePlan.overlay || '',
      duration: payload.duration,
      jobId: job.id,
      pollingUrl: job.polling_url || `${APP_CONFIG.API.OPENROUTER_BASE_URL}/videos/${job.id}`,
      status: job.status || 'pending',
      cost: 0,
    }];

    record.scenes = scenes;
    record.status = 'generating';
    record.progress = 50;
    record.statusText = `Seedance กำลังสร้างวิดีโอพร้อมเสียง ${payload.duration} วินาที`;
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
  record.progress = 50 + Math.round((completed / total) * 50);
  record.statusText = completed === total
    ? 'สร้างวิดีโอ Seedance สำเร็จแล้ว'
    : 'OpenRouter กำลังประมวลผลวิดีโอ Seedance';

  if (completed !== total) return;

  const video = record.scenes[0];
  record.status = 'completed';
  record.progress = 100;
  record.statusText = 'โฆษณาพร้อมใช้งานแล้ว';
  record.finalUrl = video.publicUrl;
  record.finalDriveUrl = video.driveUrl;
  record.finalFileId = video.fileId;
  record.completedAt = new Date().toISOString();
}

function generateCreativePlan_(payload, sceneCount, modelTier) {
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
    creativeMode: payload.promptMode,
    selectedPromptSet: payload.promptSetLabel,
    creativeInstruction: payload.promptMode === 'custom' ? payload.customPrompt : payload.promptInstruction,
  };

  const schemaInstruction = [
    `Create one cohesive ${payload.duration}-second video sequence with 2-4 clear visual beats inside the same clip.`,
    'JSON schema:',
    `{"title":"","angle":"","hook":"","audience":"","visualDirection":"","narrationStyle":"","caption":"","hashtags":[""],"safetyNotes":[""],"keyVisualPrompt":"","scenes":[{"index":1,"title":"Full advertisement","duration":${payload.duration},"voiceover":"","visualPrompt":"","camera":"","motion":"","overlay":""}]}`,
    'The single visualPrompt must describe the full clip from hook through product demonstration to CTA, with photorealistic product fidelity and vertical 9:16 composition.',
    'Keep spoken Thai concise enough for the requested duration. Do not ask the video model to draw readable on-screen text.',
  ].join('\n');

  const content = [
    { type: 'text', text: `Campaign brief:\n${JSON.stringify(brief)}\n\n${schemaInstruction}` },
    { type: 'image_url', image_url: { url: payload.productImage } },
  ];
  if (payload.presenterImage) {
    content.push({ type: 'image_url', image_url: { url: payload.presenterImage } });
  }

  const requestBody = {
    model: modelTier.planner.id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.65,
    max_tokens: 3000,
  };

  const firstResult = openRouterRequest_('/chat/completions', requestBody);
  const firstRaw = extractAssistantContent_(firstResult);
  try {
    return normalizePlan_(parseJsonContent_(firstRaw), payload, sceneCount);
  } catch (firstError) {
    const retryResult = openRouterRequest_('/chat/completions', {
      model: modelTier.planner.id,
      messages: [
        { role: 'system', content: `${systemPrompt} Output one minified JSON object and no markdown.` },
        { role: 'user', content: `Campaign brief:\n${JSON.stringify(brief)}\n\n${schemaInstruction}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 3000,
    });
    const retryRaw = extractAssistantContent_(retryResult);
    try {
      return normalizePlan_(parseJsonContent_(retryRaw), payload, sceneCount);
    } catch (retryError) {
      console.warn(`Creative Plan JSON fallback used: ${firstError.message}; ${retryError.message}`);
      return normalizePlan_(buildFallbackPlan_(payload), payload, sceneCount);
    }
  }
}

function extractAssistantContent_(result) {
  const message = result && result.choices && result.choices[0] && result.choices[0].message;
  const content = message ? message.content : (result && (result.output_text || result.content));
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content.text || content.output_text || content.value || content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      return part.text || part.content || part.output_text || part.value || '';
    }).join('\n').trim();
  }
  return String(content || '').trim();
}

function buildFallbackPlan_(payload) {
  const direction = payload.promptMode === 'custom' && payload.customPrompt
    ? payload.customPrompt
    : payload.promptInstruction;
  return {
    title: `${payload.productName} — ${payload.style}`,
    angle: direction || payload.sellingPoints,
    hook: `หยุดก่อน ถ้าคุณกำลังมองหา ${payload.productName}`,
    audience: payload.audience,
    visualDirection: `${direction || payload.style} เน้นสินค้าเหมือนภาพอ้างอิงทุกจุด ภาพโฆษณาแนวตั้งสมจริง`,
    narrationStyle: payload.tone,
    caption: `${payload.productName} ${payload.callToAction}`,
    hashtags: ['#รีวิวสินค้า', '#สินค้าแนะนำ'],
    safetyNotes: ['ใช้เฉพาะข้อมูลสินค้าและคำกล่าวอ้างที่ผู้ใช้ให้มา'],
    keyVisualPrompt: `${direction || payload.style}. Premium vertical product advertisement, exact product identity, photorealistic commercial lighting.`,
    scenes: [{
      index: 1,
      title: 'Full advertisement',
      duration: payload.duration,
      voiceover: `${payload.productName} ${payload.sellingPoints} ${payload.callToAction}`,
      visualPrompt: `${direction || payload.style}. Open with a strong visual hook, demonstrate the exact supplied product naturally, then finish with a clear call to action. Vertical 9:16, photorealistic, no generated text.`,
      camera: 'dynamic opening push-in followed by clean commercial close-ups',
      motion: 'natural presenter and product movement with smooth transitions',
      overlay: payload.callToAction,
    }],
  };
}

function generateKeyVisual_(payload, plan, modelTier) {
  const references = [
    { type: 'image_url', image_url: { url: payload.productImage } },
  ];
  if (payload.presenterImage) references.push({ type: 'image_url', image_url: { url: payload.presenterImage } });

  const prompt = [
    plan.keyVisualPrompt || plan.visualDirection,
    payload.promptMode === 'custom' ? payload.customPrompt : payload.promptInstruction,
    `Premium ${payload.style} advertising key visual for ${payload.productName}.`,
    payload.presenterImage
      ? 'Use the supplied presenter reference with consistent identity and natural anatomy.'
      : `Create an original AI presenter matching this description: ${payload.presenterDescription || 'friendly Thai presenter, modern and trustworthy'}.`,
    'The supplied product is the absolute source of truth: exact shape, packaging, colors, material, logo placement and proportions.',
    'Vertical 9:16, photorealistic commercial lighting, clean composition, safe margins, no extra products, no watermarks, no generated text.',
  ].join(' ');

  const result = openRouterRequest_('/images', {
    model: modelTier.image.id,
    prompt,
    aspect_ratio: '9:16',
    resolution: modelTier.image.resolution || '1K',
    n: 1,
    input_references: references,
  });

  const image = result.data && result.data[0];
  if (!image || !image.b64_json) throw new Error('โมเดลไม่ได้ส่งภาพ Key Visual กลับมา');
  return { base64: image.b64_json, mimeType: image.media_type || 'image/png' };
}

function submitVideo_(payload, plan, scene, keyVisualUrl, modelTier) {
  const prompt = [
    `Create one cohesive ${payload.duration}-second vertical premium social advertisement.`,
    payload.promptMode === 'custom' ? payload.customPrompt : payload.promptInstruction,
    scene.visualPrompt || '',
    `Camera: ${scene.camera || 'natural handheld commercial shot'}.`,
    `Motion: ${scene.motion || 'subtle realistic motion and confident product interaction'}.`,
    `Thai spoken dialogue: ${scene.voiceover || ''}`,
    `Overall direction: ${plan.visualDirection || ''}`,
    'Keep the presenter face, hands, product package, logo, colors and proportions consistent with the first frame.',
    'Natural physics, realistic fingers, clean commercial lighting. Do not generate any on-screen text, subtitles, logos or watermark.',
  ].join(' ');

  return openRouterRequest_('/videos', {
    model: modelTier.video.id,
    prompt,
    duration: payload.duration,
    resolution: modelTier.video.resolution || '720p',
    aspect_ratio: '9:16',
    generate_audio: modelTier.video.generateAudio !== false,
    frame_images: [{
      type: 'image_url',
      image_url: { url: keyVisualUrl },
      frame_type: 'first_frame',
    }],
  });
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
  input = input || {};
  const promptMode = String(input.promptMode || 'set').toLowerCase() === 'custom' ? 'custom' : 'set';
  const promptSet = getPromptSet_(input.promptSet);
  if (!input.productImage) throw new Error('กรุณาอัปโหลดรูปสินค้า');
  if (!input.productName || String(input.productName).trim().length < 2) throw new Error('กรุณาใส่ชื่อสินค้า');
  if (promptMode === 'custom' && (!input.sellingPoints || String(input.sellingPoints).trim().length < 5)) {
    throw new Error('กรุณาใส่จุดขายของสินค้าในโหมดกำหนดเอง');
  }
  if (input.acceptRights !== true) throw new Error('กรุณายืนยันสิทธิ์การใช้รูปภาพและความถูกต้องของข้อมูลสินค้า');
  if (String(input.productImage).length > APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES * 1.45) {
    throw new Error('รูปสินค้ามีขนาดใหญ่เกิน 5 MB');
  }
  if (input.presenterImage && String(input.presenterImage).length > APP_CONFIG.WORKFLOW.MAX_IMAGE_BYTES * 1.45) {
    throw new Error('รูปพรีเซนเตอร์มีขนาดใหญ่เกิน 5 MB');
  }

  const requestedDuration = Number(input.duration);
  const duration = APP_CONFIG.WORKFLOW.ALLOWED_DURATIONS.indexOf(requestedDuration) >= 0
    ? requestedDuration
    : APP_CONFIG.WORKFLOW.DEFAULT_DURATION_SECONDS;
  const tier = getModelTier_(input.modelTier);
  if (duration > Number(tier.video.maxDuration || 15)) {
    throw new Error(`แพ็กเกจ${tier.shortLabel}รองรับวิดีโอสูงสุด ${tier.video.maxDuration} วินาที กรุณาเลือกความยาวใหม่หรือเปลี่ยนแพ็กเกจ`);
  }
  return {
    productImage: String(input.productImage),
    presenterImage: input.presenterImage ? String(input.presenterImage) : '',
    productName: cleanText_(input.productName, 120),
    category: cleanText_(input.category || 'สินค้าอุปโภคบริโภค', 120),
    sellingPoints: cleanText_(input.sellingPoints || 'วิเคราะห์เฉพาะคุณสมบัติที่มองเห็นได้จากภาพสินค้า โดยไม่สร้างคำกล่าวอ้างที่ตรวจสอบไม่ได้', 1200),
    audience: cleanText_(promptMode === 'set' ? promptSet.audience : (input.audience || 'ผู้บริโภคออนไลน์ในประเทศไทย'), 400),
    offer: cleanText_(input.offer || '', 400),
    forbiddenClaims: cleanText_(input.forbiddenClaims || '', 500),
    presenterDescription: cleanText_(input.presenterDescription || 'พรีเซนเตอร์ไทย บุคลิกเป็นมิตร ดูน่าเชื่อถือ', 400),
    style: cleanText_(promptMode === 'set' ? promptSet.style : (input.style || 'ugc'), 60),
    tone: cleanText_(promptMode === 'set' ? promptSet.tone : (input.tone || 'มั่นใจ เป็นธรรมชาติ'), 120),
    platform: cleanText_(input.platform || 'TikTok', 40),
    duration,
    modelTier: tier.id,
    callToAction: cleanText_(promptMode === 'set' ? promptSet.callToAction : (input.callToAction || 'สั่งซื้อเลย'), 120),
    promptMode,
    promptSet: promptSet.id,
    promptSetLabel: promptSet.label,
    promptInstruction: cleanText_(promptMode === 'set' ? promptSet.instruction : '', 1200),
    customPrompt: cleanText_(promptMode === 'custom' ? (input.customPrompt || '') : '', 2000),
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
      duration: payload.duration,
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
    duration: payload.duration,
    voiceover: cleanText_(scene.voiceover || '', 700),
    visualPrompt: cleanText_(scene.visualPrompt || '', 1400),
    camera: cleanText_(scene.camera || '', 300),
    motion: cleanText_(scene.motion || '', 300),
    overlay: cleanText_(scene.overlay || '', 160),
  }));
  return plan;
}

function estimateCampaignCost_(duration, tierInput) {
  const tier = typeof tierInput === 'object' && tierInput ? tierInput : getModelTier_(tierInput);
  const seconds = Number(duration) || APP_CONFIG.WORKFLOW.DEFAULT_DURATION_SECONDS;
  const video = seconds * Number(tier.video.pricePerSecond || 0);
  return {
    min: roundMoney_(video + Number(tier.otherMin || 0)),
    max: roundMoney_(video + Number(tier.otherMax || 0)),
    video: roundMoney_(video),
    otherMin: roundMoney_(tier.otherMin || 0),
    otherMax: roundMoney_(tier.otherMax || 0),
    currency: 'USD',
    tier: tier.id,
    note: 'ประมาณการ OpenRouter เท่านั้นก่อน retry; ราคาจริงอาจเปลี่ยนตาม provider และ usage',
  };
}

function getModelTier_(tierId) {
  const id = String(tierId || APP_CONFIG.DEFAULT_MODEL_TIER).toLowerCase();
  return APP_CONFIG.MODEL_TIERS[id] || APP_CONFIG.MODEL_TIERS[APP_CONFIG.DEFAULT_MODEL_TIER];
}

function getDefaultModelTier_() {
  const value = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.DEFAULT_MODEL_TIER);
  return getModelTier_(value).id;
}

function getPublicModelTiers_() {
  return Object.keys(APP_CONFIG.MODEL_TIERS).map((id) => {
    const tier = APP_CONFIG.MODEL_TIERS[id];
    return {
      id: tier.id,
      label: tier.label,
      shortLabel: tier.shortLabel,
      badge: tier.badge,
      description: tier.description,
      planner: { id: tier.planner.id, name: tier.planner.name },
      image: { id: tier.image.id, name: tier.image.name, resolution: tier.image.resolution },
      video: {
        id: tier.video.id,
        name: tier.video.name,
        pricePerSecond: tier.video.pricePerSecond,
        resolution: tier.video.resolution,
        maxDuration: tier.video.maxDuration,
        generateAudio: tier.video.generateAudio !== false,
      },
      otherMin: tier.otherMin,
      otherMax: tier.otherMax,
      estimates: APP_CONFIG.WORKFLOW.ALLOWED_DURATIONS.reduce((result, seconds) => {
        if (seconds <= tier.video.maxDuration) result[seconds] = estimateCampaignCost_(seconds, tier);
        return result;
      }, {}),
    };
  });
}

function getPromptSet_(promptSetId) {
  const id = String(promptSetId || 'sales_boost').toLowerCase();
  return APP_CONFIG.PROMPT_SETS[id] || APP_CONFIG.PROMPT_SETS.sales_boost;
}

function getPublicPromptSets_() {
  return Object.keys(APP_CONFIG.PROMPT_SETS).map((id) => {
    const set = APP_CONFIG.PROMPT_SETS[id];
    return {
      id: set.id,
      label: set.label,
      style: set.style,
      tone: set.tone,
      description: set.instruction,
    };
  });
}

function getSettingsStatus_() {
  const openrouter = getSecret_('OPENROUTER');
  return {
    openrouterConfigured: Boolean(openrouter),
    openrouterMasked: maskKey_(openrouter),
    defaultModelTier: getDefaultModelTier_(),
    models: {
      planner: getModel_('PLANNER'),
      image: getModel_('IMAGE'),
      video: getModel_('VIDEO'),
    },
  };
}

function getSecret_(service) {
  const props = PropertiesService.getScriptProperties();
  if (service !== 'OPENROUTER') return '';
  return String(APP_CONFIG.API_KEYS.OPENROUTER_API_KEY || props.getProperty(PROPERTY_KEYS.OPENROUTER) || '').trim();
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
    promptMode: record.promptMode || 'custom',
    promptSet: record.promptSet || '',
    promptSetLabel: record.promptSetLabel || '',
    duration: record.duration,
    modelTier: record.modelTier || APP_CONFIG.DEFAULT_MODEL_TIER,
    modelTierLabel: record.modelTierLabel || getModelTier_(record.modelTier).shortLabel,
    models: record.models || null,
    aspectRatio: record.aspectRatio,
    folderUrl: record.folderUrl,
    keyVisualUrl: record.keyVisualUrl || '',
    keyVisualDriveUrl: record.keyVisualDriveUrl || '',
    finalUrl: record.finalUrl || '',
    finalDriveUrl: record.finalDriveUrl || '',
    error: record.error || '',
    estimatedCost: record.estimatedCost || null,
    actualCost: Number(record.actualCost || 0),
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
  }
  return result;
}

function parseJsonContent_(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^```(?:json|javascript)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  if (!text) throw new Error('AI ไม่ได้ส่งเนื้อหา Creative Plan กลับมา');

  const candidates = [text];
  const objectText = extractBalancedJsonObject_(text);
  if (objectText && objectText !== text) candidates.push(objectText);
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(candidate); } catch (error) { /* try next candidate */ }
  }
  throw new Error('AI ส่ง Creative Plan กลับมาในรูปแบบที่อ่านไม่ได้');
}

function extractBalancedJsonObject_(text) {
  const source = String(text || '');
  const start = source.indexOf('{');
  if (start < 0) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
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
