// Kiểm thử trình duyệt GĐ3 (Playwright + Chromium phần mềm): camera cuối trận lướt tới nhà chính + nổ, thẻ "Chi tiết" màn kết quả (% có
// thanh, mỗi đội cộng đủ 100, không tràn ngang), Đấu lại ngay trong trang (< 3 s về phòng chờ, không tải lại trang, gỡ sạch HUD / listener,
// renderer cất lại không còn bộ nhớ GPU), trận thứ hai vào nhanh hơn (shader giữ lại) và Về sảnh dựng lại sân khấu tướng.
//   python3 -m http.server <cổng> --bind 127.0.0.1   (ở gốc repo)
//   node tools/b_gd3.cjs <cổng> [end844 end1280 flow844 flow1280]   SHOTS=<thư mục> lưu ảnh.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const port = +(process.argv[2] || 8099), BASE = `http://127.0.0.1:${port}`;
const ALL = ['end844', 'end1280', 'flow844', 'flow1280'];
const want = process.argv.slice(3).filter((a) => ALL.includes(a));
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const VP = { 844: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 1280: { viewport: { width: 1280, height: 720 } } };
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; return cond; };
const T = (s) => s * 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, name) => { if (!SHOTS) return; try { await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: T(120) }); } catch (e) { console.log(`  (bỏ ảnh ${name})`); } };
const watch = (page) => { const errs = []; page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' | '))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); }); return errs; };

// (A) camera cuối trận: đầu hàng → camera tới nhà chính bên thua, nhà chính nằm nửa trên màn, có nổ
async function endCam(browser, vp) {
  const tag = `end${vp}`, ctx = await browser.newContext(VP[vp]), page = await ctx.newPage(), errs = watch(page);
  await page.goto(`${BASE}/index.html?hero=hoa_ren&mode=1v1&nobot&noauto=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.loop && window.__game.world.tick > 5, null, { timeout: T(420), polling: 500 });
  const before = await page.evaluate(() => window.__fxdbg?.().add || 0);
  await page.evaluate(() => window.__game.world.surrender(0));
  await page.waitForFunction(() => window.__game.world.over, null, { timeout: T(30) });
  let res = null;
  for (let i = 0; i < 200 && !res; i++) {
    res = await page.evaluate(async () => {
      const g = window.__game, core = g.world.entities.find((e) => e.kind === 'core' && e.team === 0), t = g.cam.target;
      const d = Math.hypot(t.x - core.pos.x, t.z - (core.pos.y + 480));
      if (d > 5) return null;
      const { project } = await import('/src/render/project.js'), p = project(g.cam.camera, core.pos.x, 0, core.pos.y, innerWidth, innerHeight);
      return { d, y: p.y, H: innerHeight, add: window.__fxdbg?.().add || 0 };
    });
    if (!res) await sleep(100);
  }
  ok(`${tag}: camera tới nhà chính bên thua (lệch < 5)`, !!res, res && res.d.toFixed(1));
  ok(`${tag}: nhà chính nằm nửa trên màn (không bị băng-rôn giữa màn che)`, res && res.y < res.H / 2 - Math.min(100, 0.18 * res.H), res && `${Math.round(res.y)} / ${res.H}`);
  await sleep(700);
  const after = await page.evaluate(() => window.__fxdbg?.().add || 0);
  ok(`${tag}: nhà chính nổ (hạt sáng bùng lên)`, after > before + 30, `${before} → ${after}`);
  await shot(page, `gd3_${tag}`);
  ok(`${tag}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

// (B)(C)(D) qua luồng game thật: Sảnh → trận 1v1 (đặt sẵn S) → đầu hàng → kết quả (thẻ Chi tiết) → Đấu lại (trong trang) → trận 2 → Về sảnh
async function flow(browser, vp) {
  const tag = `flow${vp}`, ctx = await browser.newContext(VP[vp]);
  await ctx.addInitScript(() => { try { localStorage.setItem('la.profile', JSON.stringify({ stars: 10 })); } catch (_) {} });
  const page = await ctx.newPage(), errs = watch(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(240) });
  const start = async (seed) => {
    if (await page.evaluate(() => window.__flow.nav.screen) !== 'room') { await page.evaluate(() => window.__flow.nav.go('room', { mode: 'solo' })); await page.waitForFunction(() => window.__flow.nav.screen === 'room', null, { timeout: T(30) }); }
    await page.evaluate((seed) => { // phòng chờ xoá S.match / S.pick lúc mở: đặt sau khi phòng đã mở, rồi vào thẳng trận
      const F = window.__flow;
      F.S.match = { allies: [], foes: [{ name: 'Máy', stars: 0 }], seed };
      F.S.pick = { heroId: 'hoa_ren', spellId: 'chop_buoc', charmId: null, allyHeroes: [], foeHeroes: ['thach_quy'], dummies: false, role: null, allyRoles: [], foeRoles: [] };
      F.nav.start();
    }, seed);
    await page.waitForFunction(() => window.__game?.loop?.tick > 30, null, { timeout: T(600), polling: 500 });
    return page.evaluate(() => ({ warm: window.__game.warmMs, programs: window.__gl.programs, held: window.__gl.held }));
  };
  // đếm listener trên window / document / body trước khi vào trận (CDP)
  const listeners = async () => {
    const out = {};
    for (const [k, expr] of [['window', 'window'], ['document', 'document'], ['body', 'document.body']]) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: expr }); const { listeners: L } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId }); out[k] = L.length;
    }
    return out;
  };
  await page.evaluate(() => window.__flow.nav.go('room', { mode: 'solo' })); await page.waitForFunction(() => window.__flow.nav.screen === 'room');
  const base = await listeners(), bodyKids = await page.evaluate(() => document.body.children.length);
  const m1 = await start(1);
  ok(`${tag}: trận 1 vào được (dịch sẵn ${m1.warm} ms, ${m1.programs} chương trình shader)`, m1.programs > 20);
  await page.evaluate(() => window.__game.world.surrender(0)); // mình đầu hàng: thua — vẫn đủ màn kết quả
  await page.waitForFunction(() => window.__post, null, { timeout: T(60) });
  await page.evaluate(() => { window.__post.next(); window.__post.next(); });
  await page.click('#pg [data-t="det"]');
  const det = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('#pg .col')].map((c) => [...c.querySelectorAll('.pr.det')].map((r) => [...r.querySelectorAll('.sh b')].map((b) => parseInt(b.textContent, 10))));
    const box = document.querySelector('#pg .cols');
    return { rows: cols.flat().length, cells: document.querySelectorAll('#pg .pr.det .sh').length, sums: cols.map((rows) => [0, 1].map((k) => rows.reduce((a, r) => a + (r[k] || 0), 0))), over: box.scrollWidth - box.clientWidth, heads: document.querySelectorAll('#pg .dh').length };
  });
  ok(`${tag}: thẻ Chi tiết có 3 ô % mỗi người + dòng tiêu đề`, det.rows === 2 && det.cells === 6 && det.heads === 2, JSON.stringify(det));
  ok(`${tag}: 1v1 — % sát thương / gánh chịu cả trận cộng 100 (hoặc cả trận chưa ai gây sát thương)`, [0, 1].every((k) => { const s = det.sums.reduce((a, c) => a + c[k], 0); return s === 100 || s === 0; }), JSON.stringify(det.sums));
  ok(`${tag}: không tràn ngang`, det.over <= 1, det.over);
  await shot(page, `gd3_${tag}_det`);
  // Đấu lại: trong trang, < 3 s về phòng chờ (máy giả lập CPU chậm 4×)
  await page.evaluate(() => { window.__mark = 1; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.evaluate(() => window.__post.o.onAgain());
  await page.waitForFunction(() => window.__flow.nav.screen === 'room' && document.getElementById('room'), null, { timeout: T(30) });
  const dt = Date.now() - t0;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const st = await page.evaluate(() => ({
    mark: window.__mark, game: window.__game, backMs: window.__flow.backMs,
    left: document.querySelectorAll('#minimap,#hudSet,#camBtn,#scoreTop,#scoreboard,#fpsTag,#gover,.ultsplash,#warm,#pingBtn').length,
    skills: document.getElementById('skills').childElementCount + document.getElementById('extras').childElementCount + document.getElementById('shopRoot').childElementCount,
    cls: ['over', 'post', 'dead', 'nopost'].filter((c) => document.body.classList.contains(c)), parked: window.__gl.parked, mem: window.__gl.memory, held: window.__gl.held,
    world: document.getElementById('world').width, kids: document.body.children.length,
  }));
  ok(`${tag}: Đấu lại về phòng chờ trong trang (< 3 s, CPU chậm 4×)`, st.mark === 1 && dt < 3000, `${dt} ms (dọn + dựng màn ${st.backMs} ms)`);
  ok(`${tag}: không còn HUD / phần tử của trận`, st.game == null && st.left === 0 && st.skills === 0 && !st.cls.length, JSON.stringify({ left: st.left, skills: st.skills, cls: st.cls }));
  ok(`${tag}: renderer cất lại, không còn hình khối trên GPU, ảnh chỉ còn ≤ 3 dùng chung cả phiên (bảng PBR của three, env map), khung 1×1, đang giữ vật liệu`, st.parked && st.mem?.geometries === 0 && st.mem?.textures <= 3 && st.world === 1 && st.held > 0, JSON.stringify({ mem: st.mem, w: st.world, held: st.held }));
  const after = await listeners();
  ok(`${tag}: listener window / document / body không tăng sau trận (renderer dùng chung: +1 resize cả phiên)`, after.window <= base.window + 1 && after.document <= base.document && after.body <= base.body, `${JSON.stringify(base)} → ${JSON.stringify(after)}`);
  ok(`${tag}: số phần tử trong body không tăng`, st.kids <= bodyKids + 1, `${bodyKids} → ${st.kids}`); // +1: hộp gợi ý (tip) dùng chung cả phiên có thể đã tạo trong trận
  // trận 2: shader giữ lại → dịch sẵn nhanh hơn, số chương trình ổn định, bỏ hết vật liệu giữ sau khi dịch xong
  const m2 = await start(2);
  ok(`${tag}: trận 2 dịch sẵn nhanh hơn hẳn (giữ shader)`, m2.warm < 0.6 * m1.warm || m2.warm < 1500, `${m1.warm} → ${m2.warm} ms`);
  ok(`${tag}: số chương trình shader ổn định, bộ giữ đã nhả`, m2.programs <= m1.programs + 5 && m2.held === 0, `${m1.programs} → ${m2.programs}, giữ ${m2.held}`);
  await shot(page, `gd3_${tag}_m2`);
  await page.evaluate(() => window.__game.world.surrender(1)); // thắng
  await page.waitForFunction(() => window.__post, null, { timeout: T(60) });
  await page.evaluate(() => { window.__post.next(); window.__post.next(); });
  await page.click('#pg [data-t="det"]'); // chuột (máy tính): màn kết quả bấm được (cần điều khiển trận đã gỡ)
  ok(`${tag}: bấm chuột đổi được thẻ Chi tiết`, (await page.$$('#pg .pr.det')).length === 2);
  await page.evaluate(() => window.__post.o.onAgain());
  await page.waitForFunction(() => window.__flow.nav.screen === 'room' && document.getElementById('room'), null, { timeout: T(30) });
  const after2 = await listeners();
  ok(`${tag}: trận 2 dọn xong: listener đúng bằng sau trận 1 (không dồn qua các trận)`, JSON.stringify(after2) === JSON.stringify(after), `${JSON.stringify(after)} → ${JSON.stringify(after2)}`);
  const m3 = await start(3);
  ok(`${tag}: trận 3 vào được, shader ổn định`, m3.programs <= m1.programs + 5, `${m3.programs}`);
  await page.evaluate(() => window.__game.world.surrender(1));
  await page.waitForFunction(() => window.__post, null, { timeout: T(60) });
  await page.evaluate(() => window.__post.o.onHome());
  await page.waitForFunction(() => window.__flow.nav.screen === 'home', null, { timeout: T(30) });
  await sleep(2500);
  const home = await page.evaluate(() => ({ show: !!document.querySelector('#ui > #show'), bg: !!document.querySelector('#ui > #showbg'), load: !!document.querySelector('#ui > #showload') }));
  ok(`${tag}: Về sảnh: dựng lại sân khấu tướng`, home.show && home.bg && home.load, JSON.stringify(home));
  await shot(page, `gd3_${tag}_home`);
  ok(`${tag}: không lỗi trang / console`, !errs.filter((e) => !/Error creating WebGL context/.test(e)).length && !errs.some((e) => /Error creating WebGL context/.test(e)), errs.slice(0, 4).join(' || '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const t0 = Date.now();
  for (const k of want.length ? want : ALL) {
    try {
      if (k === 'end844') await endCam(browser, 844); else if (k === 'end1280') await endCam(browser, 1280);
      else if (k === 'flow844') await flow(browser, 844); else if (k === 'flow1280') await flow(browser, 1280);
    } catch (e) { ok(`${k}: chạy hết kịch bản`, false, (e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  }
  await browser.close();
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
