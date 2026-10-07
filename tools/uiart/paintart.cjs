// Dựng sẵn icon vẽ canvas (src/hud/paint.js: kỹ năng, phép bổ trợ, đánh thường; src/hud/itemArt.js: trang bị) thành ảnh tĩnh
// assets/ui/paint/<khoá>.webp và ghi danh sách khoá vào src/hud/paintStatic.js — trò chơi chỉ tải ảnh thay vì vẽ lúc chạy.
// Chạy ở gốc repo, cần máy chủ tĩnh: python3 -m http.server 8080  →  node tools/uiart/paintart.cjs [port] [cỡ ảnh=192] [chất lượng=0.84]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [port = '8080', size = '192', quality = '0.84'] = process.argv.slice(2);
const OUT = 'assets/ui/paint', MANIFEST = 'src/hud/paintStatic.js';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage(); page.setDefaultTimeout(900000);
  const logs = []; page.on('pageerror', (e) => logs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/tools/uiart/paint.html`);
  const t0 = Date.now();
  const res = await page.evaluate(async ([size, q]) => {
    (await import('/src/hud/paintStatic.js')).livePaint(true);
    const P = await import('/src/hud/paint.js'), I = await import('/src/hud/itemArt.js'), { ITEMS } = await import('/src/data/items.js');
    const jobs = [...P.paintJobs(), ...I.ITEM_ART_IDS.map((id) => ['item.' + id, () => I.itemArtURL(id, ITEMS[id]?.tier || 1)])];
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    const out = [];
    for (const [key, fn] of jobs) {
      const url = fn(); if (!url) continue;
      const im = new Image(); im.src = url; await im.decode();
      x.clearRect(0, 0, size, size); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, size, size);
      out.push([key, c.toDataURL('image/webp', q)]);
    }
    return out;
  }, [+size, +quality]);
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.webp')) fs.unlinkSync(path.join(OUT, f)); // khoá đã bỏ không để lại ảnh mồ côi
  let bytes = 0;
  for (const [key, data] of res) { const f = path.join(OUT, key + '.webp'); fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); bytes += fs.statSync(f).size; }
  const keys = res.map(([k]) => k).sort();
  const src = fs.readFileSync(MANIFEST, 'utf8').replace(/^const KEYS = .*$/m, `const KEYS = '${keys.join(' ')}';`);
  fs.writeFileSync(MANIFEST, src);
  console.log(`${res.length} ảnh ${size}² → ${OUT} (${Math.round(bytes / 1024)} KB, ${((Date.now() - t0) / 1000).toFixed(0)} s)`, logs.slice(0, 5).join(' | '));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
