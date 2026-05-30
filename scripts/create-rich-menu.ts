/**
 * สร้าง LINE Rich Menu 2×2 สำหรับ MaoLeaw
 * รัน: pnpm --filter @maoleaw/db exec tsx ../../scripts/create-rich-menu.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.LINE_MESSAGING_TOKEN;
const LIFF_ID = process.env.LIFF_ID;

if (!TOKEN || !LIFF_ID) {
  console.error('❌  ต้องการ LINE_MESSAGING_TOKEN และ LIFF_ID ใน .env');
  process.exit(1);
}

const BASE = 'https://api.line.me/v2/bot';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const liffUrl = (path: string) =>
  `https://liff.line.me/${LIFF_ID}${path === '/' ? '' : `?liff.state=${encodeURIComponent(path)}`}`;

// ─── Rich Menu Definition ────────────────────────────────
// Layout: 1 banner บน (งานสังสรรค์) + 3 ปุ่มด้านล่าง
const richMenu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'MaoLeaw Main Menu',
  chatBarText: '🍺 เมนู',
  areas: [
    {
      // บน (full width): งานสังสรรค์ → /events
      bounds: { x: 0, y: 0, width: 2500, height: 1000 },
      action: { type: 'uri', uri: liffUrl('/events') },
    },
    {
      // ล่างซ้าย: หน้าแรก → /
      bounds: { x: 0, y: 1000, width: 833, height: 686 },
      action: { type: 'uri', uri: liffUrl('/') },
    },
    {
      // ล่างกลาง: สแกนจ่ายเงิน → /my-events
      bounds: { x: 833, y: 1000, width: 834, height: 686 },
      action: { type: 'uri', uri: liffUrl('/my-events') },
    },
    {
      // ล่างขวา: โปรไฟล์ → /profile
      bounds: { x: 1667, y: 1000, width: 833, height: 686 },
      action: { type: 'uri', uri: liffUrl('/profile') },
    },
  ],
};

async function lineApi(method: string, endpoint: string, body?: unknown) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`LINE API error: ${JSON.stringify(json)}`);
  return json;
}

async function uploadImage(richMenuId: string, imagePath: string) {
  const image = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': contentType,
    },
    body: image,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload image failed [${res.status}]: ${err}`);
  }
  console.log('✅  อัปโหลดรูปสำเร็จ');
}

async function main() {
  console.log('🍺  สร้าง MaoLeaw Rich Menu...\n');

  // 1. Create rich menu
  const { richMenuId } = await lineApi('POST', '/richmenu', richMenu);
  console.log(`✅  สร้าง Rich Menu สำเร็จ: ${richMenuId}`);

  // 2. Upload image (ถ้ามีไฟล์ rich-menu-image.png)
  const imagePath = path.join(__dirname, 'rich-menu-image.jpg');
  if (fs.existsSync(imagePath)) {
    await uploadImage(richMenuId, imagePath);
  } else {
    console.log('⚠️   ไม่พบ scripts/rich-menu-image.png — ข้ามการอัปโหลดรูป');
    console.log('    สามารถอัปโหลดรูปทีหลังได้ที่ LINE Developers Console');
  }

  // 3. Set as default for all users
  await lineApi('POST', `/user/all/richmenu/${richMenuId}`);
  console.log('✅  ตั้งเป็น Default Rich Menu สำเร็จ');

  console.log(`\n🎉  เสร็จแล้ว! Rich Menu ID: ${richMenuId}`);
  console.log('\nURL ที่ใช้ (layout: 1 บน + 3 ล่าง):');
  console.log(`  🍺 งานสังสรรค์   → ${liffUrl('/events')}   [banner บน]`);
  console.log(`  🏠 หน้าแรก       → ${liffUrl('/')}         [ล่างซ้าย]`);
  console.log(`  💳 สแกนจ่ายเงิน  → ${liffUrl('/my-events')} [ล่างกลาง]`);
  console.log(`  👤 โปรไฟล์       → ${liffUrl('/profile')}  [ล่างขวา]`);
}

main().catch((e) => {
  console.error('❌ ', e.message);
  process.exit(1);
});
