// Kiểm thử trình duyệt: cài như ứng dụng + chơi không mạng + cập nhật bản mới (service worker sw.js đã đánh phiên bản bằng mk_sw.mjs).
// Tự dựng thư mục site trong thư mục tạm (chép index.html, manifest, sw.js, src/; liên kết lib/, assets/), đánh phiên bản 'test1234',
// tự mở máy chủ tĩnh ở cổng <cổng>. Dùng: node tools/b_pwa.cjs [cổng=8798]
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { spawn, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), port = +(process.argv[2] || 8798), BASE = `http://127.0.0.1:${port}`;
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; return cond; };
const T = (s) => s * 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildSite(dir, build) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const f of ['index.html', 'manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.cpSync(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  for (const d of ['lib', 'assets']) fs.symlinkSync(path.join(ROOT, d), path.join(dir, d), 'dir');
  execFileSync(process.execPath, [path.join(ROOT, 'tools/mk_sw.mjs'), dir, build], { stdio: 'inherit' });
}

(async () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'la-pwa-')), dir = path.join(site, 'site');
  buildSite(dir, 'test1234');
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
  await sleep(1200);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  try {
    await page.goto(`${BASE}/?sw`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(300) });
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: T(60) });
    const files = JSON.parse(/const FILES = (\{.*?\});\n/s.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'))[1]);
    const preN = Object.values(files).filter((f) => f[1] === 'p').length;
    let cached = 0;
    for (let i = 0; i < 240 && cached < preN; i++) { cached = await page.evaluate(async () => (await (await caches.open('la-files')).keys()).length); if (cached < preN) await sleep(1000); }
    ok(`cài: tải sẵn đủ ${preN} tệp vào bộ nhớ đệm`, cached >= preN, `${cached}/${preN}`);
    await page.reload({ waitUntil: 'domcontentloaded' }); // trang do service worker điều khiển
    await page.waitForFunction(() => !!navigator.serviceWorker.controller && window.__flow?.nav?.screen === 'home', null, { timeout: T(300) });
    // Mốc 14: mở lần hai (đã có bộ nhớ đệm) vào Sảnh dưới 3 giây — tính từ lúc bắt đầu tải trang tới khi màn khởi động biến mất và Sảnh hiện
    const open2 = [];
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'commit' });
      await page.waitForFunction(() => window.__flow?.nav?.screen === 'home' && !document.getElementById('boot'), null, { timeout: T(120), polling: 'raf' });
      open2.push(Math.round(await page.evaluate(() => performance.now())));
    }
    open2.sort((a, b) => a - b);
    ok('mở lần hai (bộ nhớ đệm) vào Sảnh dưới 3 giây (trung vị 3 lần)', open2[1] < 3000, open2.join(' / ') + ' ms');
    // Sảnh nhờ lưu model 20 tướng (sau 2,5 s); chờ tới khi đủ
    let heroes = 0;
    for (let i = 0; i < 300 && heroes < 20; i++) { heroes = await page.evaluate(async () => { const ks = (await (await caches.open('la-files')).keys()).map((r) => r.url); return ks.filter((u) => /assets\/heroes\/([^/]+)\/\1\.glb\?v=/.test(u)).length; }); if (heroes < 20) await sleep(1000); }
    ok('Sảnh nhờ lưu model 20 tướng để chơi không mạng', heroes >= 20, heroes);
    const cdp = await ctx.newCDPSession(page);
    const inst = await cdp.send('Page.getInstallabilityErrors').catch(() => ({ installabilityErrors: ['?'] }));
    ok('cài được như ứng dụng (Chrome không báo lỗi)', !inst.installabilityErrors.length, JSON.stringify(inst.installabilityErrors));
    // không mạng: mở lại, vào trận 1v1
    await ctx.setOffline(true);
    const failed = []; page.on('requestfailed', (r) => { if (r.url().startsWith(BASE)) failed.push(r.url().slice(BASE.length)); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__flow?.nav?.screen === 'home' && !document.getElementById('boot'), null, { timeout: T(300) });
    ok('không mạng: mở lại được tới Sảnh', true);
    await page.evaluate(() => window.__flow.nav.go('room', { mode: 'solo' })); await page.waitForFunction(() => window.__flow.nav.screen === 'room');
    await page.evaluate(() => { const F = window.__flow; F.S.match = { allies: [], foes: [{ name: 'Máy', stars: 0 }], seed: 1 }; F.S.pick = { heroId: 'nguyet_ha', spellId: 'chop_buoc', charmId: null, allyHeroes: [], foeHeroes: ['kiem_thuy'], dummies: false }; F.nav.start(); });
    await page.waitForFunction(() => window.__game?.loop?.tick > 90, null, { timeout: T(600), polling: 500 });
    ok('không mạng: trận 1v1 chạy (3 s), không yêu cầu nào hỏng', !failed.length, failed.slice(0, 4).join(', '));
    await page.evaluate(() => window.__game.world.surrender(0)); await page.waitForFunction(() => window.__post, null, { timeout: T(60) });
    await page.evaluate(() => window.__post.o.onHome()); await page.waitForFunction(() => window.__flow.nav.screen === 'home', null, { timeout: T(30) });
    await page.waitForSelector('#rewardScr .tl', { timeout: T(30) }); await page.evaluate(() => window.__rewards.close()); // GĐ4f: về sảnh có màn Nhận thưởng — chạm để tiếp tục
    await ctx.setOffline(false);
    // bản mới: đổi một dòng kit.js, đánh phiên bản lại, kiểm tra cập nhật → hộp "Có bản mới" ở Sảnh → Cập nhật → tải lại đúng bản mới
    const kitOld = files['src/ui/kit.js'][0];
    for (const f of ['index.html', 'sw.js']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
    fs.appendFileSync(path.join(dir, 'src/ui/kit.js'), '\n// bản thử cập nhật\n');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/mk_sw.mjs'), dir, 'test5678'], { stdio: 'inherit' });
    const glb = []; // model tướng lấy từ MẠNG (không qua bộ nhớ đệm của service worker) trong lúc cập nhật
    page.on('requestfinished', async (r) => { if (!/\.glb/.test(r.url())) return; const res = await r.response().catch(() => null); if (res && !res.fromServiceWorker()) glb.push(r.url()); });
    ctx.on('request', (r) => { if (/\.glb/.test(r.url()) && r.serviceWorker()) glb.push('sw:' + r.url()); }); // service worker tự tải lại
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await page.waitForSelector('.ui-dlg .btn-gold', { timeout: T(180) });
    ok('Sảnh hiện hộp "Có bản mới"', (await page.textContent('.ui-dlg')).includes('Có bản mới'));
    await Promise.all([page.waitForNavigation({ timeout: T(120) }), page.click('.ui-dlg .btn-gold')]);
    await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(300) });
    const b2 = await page.evaluate(() => document.querySelector('meta[name="la-build"]').content);
    const keys = await page.evaluate(async () => (await (await caches.open('la-files')).keys()).map((r) => r.url));
    const files2 = JSON.parse(/const FILES = (\{.*?\});\n/s.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'))[1]), kitNew = files2['src/ui/kit.js'][0];
    ok('cập nhật: tải lại đúng bản mới', b2 === 'test5678', b2);
    ok('cập nhật: kit.js bản mới trong bộ nhớ đệm, bản cũ đã xoá', keys.some((u) => u.endsWith(`src/ui/kit.js?v=${kitNew}`)) && !keys.some((u) => u.endsWith(`src/ui/kit.js?v=${kitOld}`)));
    await sleep(3000);
    ok('cập nhật: không tải lại model tướng nào từ mạng', !glb.length, glb.slice(0, 2).join(', '));
    ok('không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' || '));
  } catch (e) { ok('chạy hết kịch bản', false, (e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  await browser.close(); srv.kill(); fs.rmSync(site, { recursive: true, force: true });
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
