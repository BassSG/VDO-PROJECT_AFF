# ADORA AI Studio

<img src="assets/adora-logo.png" alt="ADORA AI Studio logo" width="140">

เว็บแอปสร้างวิดีโอโฆษณาแนวตั้งแบบครบขั้นตอนบน Google Apps Script โดยใช้ **OpenRouter API key เพียงรายการเดียว** ตั้งแต่วิเคราะห์รูป วาง Creative Plan สร้าง Key Visual สร้างวิดีโอ Veo พร้อม Native Audio ไปจนถึงตรวจเสียงภาษาไทยอัตโนมัติ

- Web App: https://script.google.com/macros/s/AKfycbz0N9eDGVPJRM89kEEfVZxqdGN8e5K1BY1E3LevfV7mCv3jbMdxJsqlx4OpTaNRi8l70g/exec
- GitHub Pages application gateway: https://basssg.github.io/VDO-PROJECT_AFF/

Web App เปิดสิทธิ์แบบ `ANYONE_ANONYMOUS` ผู้ใช้งานจึงเปิดผ่าน GitHub Pages หรือ URL ของ Apps Script ได้โดยไม่ต้องลงชื่อเข้าใช้ Google ระบบทำงานในสิทธิ์ของบัญชีผู้ Deploy (`USER_DEPLOYING`)

> คำเตือน: ผู้ใช้ทุกคนจะใช้เครดิต OpenRouter และพื้นที่ Google Drive ของเจ้าของระบบร่วมกัน ควรกำหนด Budget Limit ที่ OpenRouter และเพิ่มระบบโควตา/Rate limit ก่อนเผยแพร่ให้บุคคลทั่วไปจำนวนมาก

GitHub Pages จะแสดง Google Apps Script Web App ตัวจริงภายในหน้าเดิม จึงยังคง URL `basssg.github.io` ขณะใช้งาน AI หากต้องการเปิดหน้าออกแบบแบบไม่โหลด Application ให้ใช้ `?preview=1` ผู้ใช้ทุกคนเปิดใช้งานได้โดยไม่ต้องเข้าสู่ระบบ Google

## ติดตั้งเป็น Application

GitHub Pages เป็น Progressive Web App (PWA) ติดตั้งได้จากปุ่ม **ติดตั้ง Application** ด้านล่างของหน้าเว็บ:

- Android/Chrome และคอมพิวเตอร์: กดปุ่มติดตั้ง หรือเลือก `Install app` จากเมนู Browser
- iPhone/iPad: เปิดด้วย Safari กด Share แล้วเลือก `Add to Home Screen`

เมื่อติดตั้งแล้ว ADORA จะมีโลโก้และเปิดแบบหน้าต่าง Application โดยยังต้องเชื่อมต่ออินเทอร์เน็ตเพื่อเรียก Apps Script และ OpenRouter

## Workflow v1.6.0

ระบบมีโหมดสร้าง Prompt สองแบบ:

- **Prompt Set สำเร็จรูป** — กรอกชื่อสินค้าแล้วเลือกจาก 6 ชุด เช่น ขายไว รีวิวจริง เปิดตัวพรีเมียม Problem/Solution Lifestyle และ Product Demo
- **กำหนด Prompt เอง** — ระบุจุดขาย กลุ่มเป้าหมาย สไตล์ พรีเซนเตอร์ และเขียน Creative Prompt ได้โดยตรง

รูป JPG, PNG และ WEBP ขนาดต้นฉบับสูงสุด 50 MB จะถูกย่อด้านยาวไม่เกิน 2,048 px และบีบอัดใน Browser อัตโนมัติก่อนส่งไป Apps Script โดยไฟล์หลังบีบอัดต้องอยู่ภายในขีดจำกัด 5 MB ของ workflow

1. อัปโหลดรูปสินค้า
2. อัปโหลดรูปพรีเซนเตอร์หรือระบุบุคลิกที่ต้องการ
3. ใส่ชื่อสินค้า จุดขาย กลุ่มเป้าหมาย ข้อเสนอ และข้อห้ามในการโฆษณา
4. เลือกสไตล์ แพลตฟอร์ม ความยาว และแพ็กเกจ AI
5. ก่อนสร้าง ระบบแสดงราคาประมาณของ **AI ทุกขั้นตอนรวมกัน** และขอให้ผู้ใช้ยืนยัน
6. OpenRouter วิเคราะห์งาน สร้างภาพ และใช้ Veo สร้าง MP4 พร้อมเสียงพูดในวิดีโอเดียว เพื่อลดปัญหาเสียงแยกไม่ตรงปาก
7. Auto Review ใช้ Whisper ฟังเสียงภาษาไทยแล้วเทียบกับบท หากผลยังไม่ชัดจะ Auto Recheck ด้วยโมเดลตัวที่สองอีกหนึ่งครั้ง
8. ระบบตรวจสอบโครงสร้าง MP4 ก่อนบันทึก และแสดงค่าใช้จ่ายจริงแยกตามขั้นตอนเมื่อ provider ส่ง usage กลับมา
9. ถ้า Auto Review ยังไม่ผ่าน ไฟล์ยังเปิดและดาวน์โหลดได้ด้วยสถานะ `NEEDS REVIEW` แต่ระบบจะ **ไม่สร้างวิดีโอใหม่และไม่หักเงินรอบใหม่เอง**

ความยาวที่รองรับคือ 4, 6 และ 8 วินาที ซึ่งตรงกับความยาว Native Audio ที่โมเดล Veo ทั้งสามแพ็กเกจรองรับใน OpenRouter

บทพูดไทยถูกจำกัดตามเวลาอัตโนมัติ: 4 วินาทีไม่เกิน 32 ตัวอักษร, 6 วินาทีไม่เกิน 48 ตัวอักษร และ 8 วินาทีไม่เกิน 64 ตัวอักษร ระบบกำหนดให้เป็นประโยคไทยสั้นหนึ่งประโยค ชื่อสินค้า + ประโยชน์หลัก + CTA เพื่อเพิ่มโอกาสให้พูดครบและตรงปาก อย่างไรก็ตาม AI วิดีโอยังไม่สามารถรับประกัน lip-sync และคำพูดถูกต้อง 100% ได้ จึงต้องมี Auto Review

## API key ที่ต้องใช้

| Key | จำเป็น | ใช้ทำอะไร | สมัคร/สร้าง Key |
|---|---|---|---|
| `OPENROUTER_API_KEY` | จำเป็น | วิเคราะห์ วางแผน สร้างภาพ สร้างวิดีโอ Veo พร้อมเสียง และตรวจเสียงไทยด้วย Whisper | [OpenRouter Keys](https://openrouter.ai/settings/keys) |

ไม่ต้องใช้ API key ของ Gemini, Google Vertex, Veo, Whisper หรือ Google Drive แยก เพราะโมเดล AI เรียกผ่าน OpenRouter และ Google Drive ใช้ OAuth ของบัญชีที่ Deploy Apps Script

### ควรใส่ key ที่ไหน

วิธีที่แนะนำคือเปิดเมนู **ตั้งค่าระบบ** ใน Web App ใส่ OpenRouter key แล้วกดบันทึก ระบบจะเก็บ key ใน **Script Properties ฝั่งเซิร์ฟเวอร์** และไม่ส่งค่ากลับไปยัง Browser

อีกวิธีคือใส่ที่ส่วนบนของ `Code.js`:

```javascript
const APP_CONFIG = {
  API_KEYS: {
    OPENROUTER_API_KEY: '',
  },
  // ...
};
```

ห้ามใส่ API key ใน `index.html` หรือ commit key จริงลง GitHub

## แพ็กเกจ AI 3 ระดับ

| แพ็กเกจ | วิเคราะห์ | สร้างภาพ | วิดีโอ + Native Audio | วิดีโอ 8 วิ | รวม AI ทั้งรอบ 8 วิ |
|---|---|---|---|---:|---:|
| คุ้มค่า · ภาษาไทย | `google/gemini-3.1-flash-lite` | `google/gemini-3.1-flash-lite-image` 1K | `google/veo-3.1-lite` 720p | `$0.40` | **`$0.44–$0.51`** |
| สมดุล | `google/gemini-3.6-flash` | `google/gemini-3.1-flash-image` 1K | `google/veo-3.1-fast` 720p | `$0.80` | **`$0.89–$1.02`** |
| พรีเมียม | `anthropic/claude-sonnet-5` | `google/gemini-3-pro-image` 2K | `google/veo-3.1` 1080p | `$3.20` | **`$3.48–$3.70`** |

ประมาณการรวม Creative Plan, Key Visual, วิดีโอพร้อมเสียง, Auto Review และ Auto Recheck สูงสุดหนึ่งครั้งแล้ว ตัวเลขเป็น snapshot ของราคาโมเดล OpenRouter ณ วันที่ 23 กรกฎาคม 2026 และไม่รวมการกดสร้างวิดีโอใหม่ ค่าธรรมเนียมการซื้อเครดิต ภาษี หรือราคาที่ provider เปลี่ยนภายหลัง หน้าเว็บจะแสดงยอดประมาณก่อนยืนยันและยอด usage จริงที่ตรวจจับได้หลังทำงาน

แพ็กเกจ **คุ้มค่า · ภาษาไทย** เป็นค่าเริ่มต้น เพราะวิดีโอ 8 วินาทีพร้อมเสียงราคา `$0.40` ใกล้กับ workflow Seedance 1.5 เดิม แต่ได้ Native Audio ในขั้นสร้างวิดีโอ ส่วนแพ็กเกจสมดุลและพรีเมียมมีไว้สำหรับงานที่ยอมเพิ่มต้นทุนเพื่อคุณภาพภาพ ไม่ได้หมายความว่าจะพูดไทยถูก 100% ทุกครั้ง

## โครงสร้างโปรเจกต์

```text
.
├── Code.js          # OpenRouter API, workflow, Drive และ campaign state
├── index.html       # Responsive web application UI
├── appsscript.json  # Apps Script manifest
├── .clasp.json      # เชื่อมกับ Apps Script project
└── README.md
```

`index.html` ใช้ตัว `i` เล็กตามมาตรฐานเว็บ และตรงกับ `createHtmlOutputFromFile('index')` ใน Apps Script

## Deploy ด้วย clasp

โปรเจกต์นี้ใช้ named profile `project-owner` ซึ่งเชื่อมกับบัญชี `bass1135@gmail.com`

```bash
npx --yes @google/clasp@latest -u project-owner show-authorized-user
npx --yes @google/clasp@latest -u project-owner push --force
npx --yes @google/clasp@latest -u project-owner version "ADORA AI Studio release"
npx --yes @google/clasp@latest -u project-owner deployments
```

อัปเดต deployment เดิมด้วย version number ที่สร้างใหม่:

```bash
npx --yes @google/clasp@latest -u project-owner deploy \
  --deploymentId AKfycbz0N9eDGVPJRM89kEEfVZxqdGN8e5K1BY1E3LevfV7mCv3jbMdxJsqlx4OpTaNRi8l70g \
  --versionNumber VERSION \
  --description "ADORA v1.6.0 - Veo native Thai audio and Auto Review"
```

## ก่อนนำไปขายเป็น SaaS

เวอร์ชันนี้เป็น owner-operated presentation MVP หากจะเปิดให้ลูกค้าหลายคนใช้งาน ควรเพิ่มระบบสมาชิก, tenant isolation, quota/rate limit, billing/usage ledger, moderation, consent, privacy/terms และระบบคิวที่รองรับการใช้งานพร้อมกันจำนวนมาก

รูปและวิดีโอที่ส่งให้ provider ประมวลผลอาจถูกตั้งเป็น anyone-with-link ชั่วคราวตาม workflow ปัจจุบัน ควรทบทวนนโยบายข้อมูลก่อนรับงานที่มีข้อมูลละเอียดอ่อน
