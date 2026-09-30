// Chụp bảng nhiều tướng × nhiều tư thế từ tools/model-sheet.html.
// Dùng: NODE_PATH=$(npm root -g) node sheet.cjs out.png ids(a,b) [poses] [cw] [ch]
const { chromium } = require('playwright');
(async () => {
  const [out, ids, poses = '', cw = '300', ch = '380'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  const url = `http://localhost:8080/tools/model-sheet.html?ids=${ids}&cw=${cw}&ch=${ch}${poses ? '&poses=' + poses : ''}`;
  await page.goto(url);
  await page.waitForFunction('window.__ready', null, { timeout: 60000 });
  await page.locator('#wrap').screenshot({ path: out });
  console.log(out);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
