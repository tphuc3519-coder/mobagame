// Chụp ảnh model bằng Chromium headless (Playwright) qua tools/model-check.html.
// Dùng: NODE_PATH=$(npm root -g) node shot.cjs <outDir> <id> [view:clip:t ...]
//   ví dụ: node shot.cjs /tmp/shots long_dang front:Idle:0 side:Run:0.2 game:Idle:0
// Cần server tĩnh chạy ở gốc repo (cổng 8080): npx http-server -p 8080 .
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [outDir, id, ...specs] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const size = +(process.env.SIZE || 640);
  const page = await browser.newPage({ viewport: { width: size, height: Math.round(size * 1.15) } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  for (const spec of specs) {
    const [view, clip = 'Idle', t = '0'] = spec.split(':');
    const url = `http://localhost:8080/tools/model-check.html?src=../assets/heroes/${id}/${id}.glb&view=${view}&clip=${clip}&t=${t}&hideui=1&ref=0`;
    await page.goto(url);
    await page.waitForFunction('window.__ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
    const file = path.join(outDir, `${id}_${view}_${clip}_${t}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
