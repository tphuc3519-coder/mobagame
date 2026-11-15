// Kiểm thử trình duyệt cho chơi online (Playwright + Chromium phần mềm), tự bật máy chủ thật (server/index.mjs — phục vụ luôn game) ở cổng
// <cổng>: trận trực tuyến 1v1 (một người + máy) → nhận khung, đúng NET.version, không lệch đồng bộ; máy chủ khởi động lại giữa trận (phòng
// mất) → trang tự dọn trận và về Sảnh, không đứng hình (net/session.js onEnd → ui/flow.js abortOnline); vào trận mới → đầu hàng (đội một
// người thật: ngay) → màn kết quả. Dùng: node tools/b_online.cjs [cổng=8790]   — in ĐẠT / LỖI từng mục, mã thoát 1 khi có lỗi.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = +(process.argv[2] || 8790), BASE = `http://127.0.0.1:${PORT}`;
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? 'ĐẠT ' : 'LỖI ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), T = (s) => s * 1000;
const boot = async () => { const p = spawn(process.execPath, [path.join(ROOT, 'server/index.mjs')], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', READY_SEC: '0.3' }, stdio: ['ignore', 'pipe', 'pipe'] }); p.log = ''; p.stdout.on('data', (d) => { p.log += d; }); p.stderr.on('data', (d) => { p.log += d; }); for (let i = 0; i < 100 && !p.log.includes('Máy chủ online'); i++) await sleep(50); return p; };
(async () => {
  let srv = await boot();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 200))); page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|Failed to load resource/.test(m.text())) errs.push('console ' + m.text().slice(0, 200)); });
  try {
    await page.goto(`${BASE}/?q=low`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(240) });
    const enter = async () => {
      await page.evaluate(async () => {
        const L = await import('./src/ui/netLobby.js'); window.__L = L;
        await L.lobbyConn({ maxMs: 15000 });
        const until = (f, ms = 15000) => new Promise((r, j) => { const t0 = Date.now(), i = setInterval(() => { if (f()) { clearInterval(i); r(); } else if (Date.now() - t0 > ms) { clearInterval(i); j(new Error('hết giờ chờ phòng')); } }, 50); });
        L.send({ t: 'create', mode: '1v1', name: 'Thử' }); await until(() => L.net.room);
        L.send({ t: 'start' }); await until(() => L.net.room?.state === 'pick');
        L.send({ t: 'lock', heroId: 'hoa_ren' });
      });
      await page.waitForFunction(() => window.__game?.online && window.__game.world.tick > 45, null, { timeout: T(420), polling: 500 });
    };
    await enter();
    let st = await page.evaluate(() => ({ ...window.__game.online.stats(), tick: window.__game.world.tick, v: window.__game.online.cfg.v, net: document.getElementById('netTag')?.textContent }));
    ok('trận trực tuyến chạy trên trình duyệt (nhận khung, đúng phiên bản 4, không lệch)', st.online && !st.desync && st.tick > 45 && st.v === 4, JSON.stringify(st));
    await page.waitForTimeout(2500);
    const st2 = await page.evaluate(() => ({ ...window.__game.online.stats(), tick: window.__game.world.tick, health: 0 }));
    ok('sau 2,5 giây: vẫn nhận khung, máy chủ không báo lệch (đã qua ít nhất một mốc so mã băm)', st2.tick > st.tick + 30 && !st2.desync && !/LỆCH/.test(srv.log), `tick ${st.tick} → ${st2.tick}`);
    // máy chủ khởi động lại giữa trận: phòng mất → trang phải tự về Sảnh
    srv.kill('SIGKILL'); await sleep(400); srv = await boot();
    const home = await page.waitForFunction(() => window.__flow?.nav?.screen === 'home' && !window.__game, null, { timeout: T(60), polling: 300 }).then(() => true, () => false);
    const toast = await page.evaluate(() => document.querySelector('.ui-toast')?.textContent || '');
    ok('máy chủ khởi động lại giữa trận: trang tự dọn trận và về Sảnh (không đứng hình)', home, `màn ${await page.evaluate(() => window.__flow?.nav?.screen)}; báo: ${toast}`);
    ok('Sảnh dùng được sau đó (các nút còn bấm được, cảnh trận đã ẩn)', await page.evaluate(() => !!document.querySelector('#home [data-a="ranked"]') && !document.getElementById('ui').hidden && !document.body.classList.contains('post')));
    // trận mới + đầu hàng (đội chỉ có một người thật: đầu hàng ngay)
    await page.evaluate(() => { window.__L.net.conn = null; });
    await enter();
    await page.evaluate(() => window.__game.online.cmd({ type: 'surrender' }));
    const post = await page.waitForFunction(() => !!window.__post && !!window.__flow?.result, null, { timeout: T(90), polling: 300 }).then(() => true, () => false);
    ok('trận thứ hai sau khi về Sảnh: vào được; đầu hàng → màn kết quả', post, await page.evaluate(() => (document.getElementById('pg')?.textContent || '').replace(/\s+/g, ' ').slice(0, 80)));
    ok('không lỗi trang / console (trừ báo mất kết nối lúc máy chủ tắt)', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { ok('kịch bản chạy hết', false, (e.stack || e.message).split('\n').slice(0, 3).join(' | ') + ' || lỗi trang: ' + errs.slice(0, 2).join(' | ')); }
  await browser.close(); srv.kill('SIGKILL');
  console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt'); process.exit(fail ? 1 : 0);
})();
