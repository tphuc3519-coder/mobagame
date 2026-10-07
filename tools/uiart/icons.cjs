// Dựng biểu tượng sảnh thành assets/ui/icons/<tên>.webp (256², nền trong suốt) + ảnh xem chung.
// Chạy ở gốc repo khi có máy chủ tĩnh: node tools/uiart/icons.cjs [port] [tên,tên…]
const fs = require('fs');
const { chromium } = require('playwright');
const [port = '8080', only = ''] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } }); page.setDefaultTimeout(600000);
  const logs = []; page.on('pageerror', (e) => logs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  await page.goto(`http://localhost:${port}/tools/uiart/icons.html${only ? '?only=' + only : ''}`);
  await page.waitForFunction('window.out || window.err', null, { polling: 300 });
  const err = await page.evaluate(() => window.err); if (err) { console.log('LỖI', err); process.exit(1); }
  const out = await page.evaluate(() => window.out);
  fs.mkdirSync('assets/ui/icons', { recursive: true });
  for (const [k, v] of Object.entries(out)) fs.writeFileSync(`assets/ui/icons/${k}.webp`, Buffer.from(v.split(',')[1], 'base64'));
  await page.screenshot({ path: process.env.SHEET || 'assets/ui/icons/_sheet.png', fullPage: true });
  console.log(Object.keys(out).length, 'biểu tượng', logs.slice(0, 5).join(' | '));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
