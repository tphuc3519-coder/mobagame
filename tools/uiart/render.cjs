// Dựng ảnh tĩnh cho sảnh / màn tải (assets/ui/…) từ tools/uiart.html bằng Chromium không giao diện.
// Chạy ở gốc repo, cần một máy chủ tĩnh: python3 -m http.server 8080  →  node tools/uiart/render.cjs [port] [lọc tên việc…]
// Ví dụ: node tools/uiart/render.cjs 8080 keyart card:hoa_ren face
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [port = '8080', ...only] = process.argv.slice(2);
const ALPHA = ['hoa_ren', 'thach_quy', 'bong_tre', 'nguyet_ha', 'canh_dieu', 'long_dang'];
const ALL = [...ALPHA, 'hanh_hoa', 'tieu_anh', 'ba_nam', 'cau_may', 'bong_den', 'thay_do', 'kep_cheo', 'meo_than_tai', 'phu_dong', 'thu_linh', 'kiem_thuy', 'luong_cuc', 'nhan_su', 'trang_nhi'];
// dáng chụp thẻ (clip, giây, zoom, dy, xoay): chọn khung có vũ khí rõ nhất của từng tướng
const POSE = {
  hoa_ren: ['Showcase', 1.9, 1.7, 0.08, -0.3], thach_quy: ['Showcase', 2.0, 1.7, 0.06, -0.45], bong_tre: ['Showcase', 2.0, 1.75, 0.1, -0.35],
  nguyet_ha: ['Showcase', 3.0, 1.8, 0.12, -0.3], canh_dieu: ['Showcase', 2.0, 1.75, 0.1, -0.4], long_dang: ['Showcase', 2.0, 1.7, 0.1, -0.35],
};
const FACE = { hoa_ren: '&dist=0.95&dy=0.02', thach_quy: '&dist=1.75&dy=-0.02' }; // khung chân dung riêng (tướng đầu nhỏ / mũ lặn to)
const out = 'assets/ui';
const FULL = { hoa_ren: '&spin=0.35' }; // ảnh toàn thân: Emberforge xoay để búa chĩa ra sau, đỡ chiếm bề ngang
const jobs = [
  { name: 'keyart', q: 'mode=keyart&w=1600&h=740&ss=1.5', file: `${out}/keyart.jpg`, w: 1600, h: 740 },
  { name: 'room', q: 'mode=room&w=1600&h=740&ss=1.5', file: `${out}/room.jpg`, w: 1600, h: 740 },
  { name: 'lobby', q: 'mode=lobby&w=1600&h=740&ss=1.5' + (process.env.Q || ''), file: process.env.OUT || `${out}/lobby.jpg`, w: 1600, h: 740 },
  ...ALPHA.map((id) => { const [clip, t, zoom, dy, spin] = POSE[id]; return { name: 'card:' + id, q: `mode=card&id=${id}&w=420&h=600&clip=${clip}&t=${t}&zoom=${zoom}&dy=${dy}&spin=${spin}`, file: `${out}/heroes/${id}_card.jpg`, w: 420, h: 600, dpr: 2 }; }),
  ...ALPHA.map((id) => ({ name: 'splash:' + id, q: `mode=splash&id=${id}&w=520&h=760&ss=1.5&clip=ShowIdle&t=0.4${FULL[id] || ''}`, file: `${out}/heroes/${id}_full.webp`, w: 520, h: 760, webp: true })),
  ...ALL.map((id) => ({ name: 'face:' + id, q: `mode=face&id=${id}&size=192&w=192&h=192${FACE[id] || ''}`, file: `${out}/heroes/${id}_face.webp`, w: 192, h: 192, webp: true })),
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const j of jobs) {
    if (only.length && !only.some((o) => j.name === o || j.name.startsWith(o + ':') || j.name.startsWith(o))) continue;
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr || 1 });
    page.setDefaultTimeout(900000);
    const logs = []; page.on('pageerror', (e) => logs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 200)); });
    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/tools/uiart.html?${j.q}`);
    await page.waitForFunction('window.out || window.err', null, { polling: 500, timeout: 180000 });
    const err = await page.evaluate(() => window.err);
    if (err) { console.log(j.name, 'LỖI', err.slice(0, 300)); await page.close(); continue; }
    let data = await page.evaluate(() => window.out);
    if (j.webp) data = await page.evaluate((src) => new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/webp', 0.86)); }; im.src = src; }), data);
    fs.mkdirSync(path.dirname(j.file), { recursive: true });
    fs.writeFileSync(j.file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(j.name, '→', j.file, Math.round(fs.statSync(j.file).size / 1024) + ' KB', ((Date.now() - t0) / 1000).toFixed(0) + 's', logs.slice(0, 3).join(' | '));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
