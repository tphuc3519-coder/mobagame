// Kiểm thử trình duyệt (Playwright) cho đồ kích hoạt / áp chế / chiêu khoá mục tiêu trong trận 5v5 thật (?hero=<id>&mode=5v5):
//  items    — mua Xích Đồng + Lọng Hộ Mệnh: 2 nút đồ không đè nút nào / thanh máu / mép màn; chạm Xích Giữ áp chế tướng địch (nút kỹ năng xám);
//             giữ nút Lọng xem mô tả, phím Q dùng Lọng (có khiên); bán Xích mua Dải Lụa Gió, kéo nút sang phải → lướt ~320.
//  lockon   — Trạng Nhí: kéo K3 về phía tướng địch có 2 Manh Mối → dấu vàng xem trước hiện, lệnh tung mang aim.id đúng tướng đó.
//  suppress — Bóng Đèn: chạm K2 → tướng địch bị áp chế, Bóng Đèn niệm giữ dây.
//  pings    — nút cờ mở vòng 4 tín hiệu (không đè bản đồ nhỏ / nút kỹ năng / mép màn); chọn Tập hợp rồi chạm bản đồ nhỏ → tín hiệu vào
//             mô phỏng, dòng báo bên trái, bot đồng đội nhận lệnh; chạm Rút lui hai lần → tín hiệu ngay chỗ mình.
// Mỗi cảnh chạy ở 844×390 rồi 1280×720 (đổi cỡ trên cùng trang — dịch shader một lần), chụp ảnh đáy HUD, đếm lỗi trang / console.
// Chạy: python3 -m http.server <PORT> --bind 127.0.0.1 ở gốc repo, rồi node tools/b_match.cjs <PORT> [--only=items,lockon,suppress] [--shots=<thư mục>]
const path = require('path'), fs = require('fs');
let PW; try { PW = require('playwright'); } catch (_) { PW = require('/opt/node22/lib/node_modules/playwright'); }
const port = +process.argv[2] || 8080;
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const only = arg('only', 'items,lockon,suppress,pings').split(',');
const shots = arg('shots', '/tmp/claude-0/shots/gd2b'), DPR = +arg('dpr', '2');
fs.mkdirSync(shots, { recursive: true });
const SIZES = [[844, 390], [1280, 720]];
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mở trận 5v5 với tướng `hero`; trả { page, errs } khi vòng lặp trận đã chạy (sau màn dịch shader). */
async function open(browser, hero) {
  const ctx = await browser.newContext({ viewport: { width: SIZES[0][0], height: SIZES[0][1] }, hasTouch: true, deviceScaleFactor: DPR });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:${port}/index.html?hero=${hero}&mode=5v5&debug=1&noauto=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world.tick > 20, null, { timeout: 300000, polling: 500 });
  // dọn sân: đưa mình ra giữa bản đồ, một tướng địch tới gần và dừng bot của nó (khỏi chạy đi / ra đòn làm lệch phép đo)
  await page.evaluate(async () => {
    const g = window.__game, w = g.world, p = g.player, { lanePath, pointAt } = await import('/src/sim/lanes.js');
    const lane = lanePath(w.map, 1, p.team), c = pointAt(lane, lane.length * 0.5);
    window.__t = { place(e, x, y) { e.pos.x = e.prevPos.x = x; e.pos.y = e.prevPos.y = y; e.dash = null; e.forced = null; e.moveDir = { x: 0, y: 0 }; }, c };
    const foe = w.entities.find((e) => e.kind === 'hero' && e.team !== p.team);
    window.__t.foe = foe; if (foe.bot) foe.bot.next = 1e12;
    window.__t.place(p, c.x, c.y); window.__t.place(foe, c.x + 2500, c.y);
    for (const e of w.entities) if (e.kind === 'hero' && e.team !== p.team && e !== foe) window.__t.place(e, e.spawn.x, e.spawn.y);
  });
  return { page, ctx, errs };
}
/** Toạ độ màn hình của điểm thế giới (x, y) (render/project.js — cùng phép chiếu với HUD). */
const screenOf = (page, x, y) => page.evaluate(async ([x, y]) => { const { project } = await import('/src/render/project.js'); const g = window.__game; return project(g.cam.camera, x, 0, y, innerWidth, innerHeight); }, [x, y]);
/** Chạm nhanh (màn cảm ứng); máy không GPU vẽ mỗi khung rất lâu nên cho chờ lâu. */
const tap = async (page, sel) => { const t0 = Date.now(); await page.tap(sel, { timeout: 240000 }); return Date.now() - t0; };
const center = async (page, sel) => { const r = await page.locator(sel).boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, r }; };
async function drag(page, sel, dx, dy, hold = 0, check = null) {
  const c = await center(page, sel); await page.mouse.move(c.x, c.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(c.x + (dx * i) / 8, c.y + (dy * i) / 8); await sleep(30); }
  await sleep(hold); const seen = check ? await check() : null;
  const tipped = await page.evaluate(() => { const t = document.querySelector('.hudtip'); return !!t && !t.hidden; });
  await page.mouse.up(); return check ? seen : { tipped };
}
/** Chờ fn() (trong trang) đúng, tối đa `ticks` tick mô phỏng (máy kiểm thử không GPU chạy chậm hơn thời gian thật); trả số tick đã chờ, -1 nếu hết. */
const waitFor = async (page, fn, ticks = 60) => { const t0 = await page.evaluate(() => window.__game.world.tick), d0 = Date.now(); for (;;) { const [v, t] = await page.evaluate((f) => [!!(0, eval)(f)(), window.__game.world.tick], `(${fn})`); if (v) return t - t0; if (t - t0 > ticks || Date.now() - d0 > 120000) return -1; await sleep(60); } };
const shot = (page, file, clip) => page.screenshot({ path: path.join(shots, file), clip, timeout: 240000 });

async function items(browser) {
  const { page, ctx, errs } = await open(browser, 'phu_dong');
  for (const [W, H] of SIZES) {
    const tag = `${W}x${H}`;
    await page.setViewportSize({ width: W, height: H }); await sleep(400);
    await page.evaluate(async () => { // mua thật qua lệnh buy (lần đầu); cỡ màn sau: đặt thẳng túi đồ
      const g = window.__game, w = g.world, p = g.player, { computeBonus } = await import('/src/sim/inventory.js');
      p.gold = 99999; p.itemCd = {}; p.hp = p.stats.maxHp;
      if (!p.items.includes('xich_dong') && !p.items.includes('dai_lua_gio')) { w.command(p.id, { type: 'buy', item: 'xich_dong' }); w.command(p.id, { type: 'buy', item: 'long_ho_menh' }); }
      else { p.items = ['xich_dong', 'long_ho_menh', null, null, null, null]; p.bonus = computeBonus(p); }
    });
    await waitFor(page, () => { const q = (k) => document.querySelector(`#extras [data-k="${k}"]`); return q('itemAct1') && !q('itemAct1').hidden && q('itemAct0').querySelector('label').textContent === 'Xích Giữ'; }, 90);
    const L = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, vis: !el.hidden && b.width > 0 && getComputedStyle(el).display !== 'none' }; };
      const q = (s) => document.querySelector(s), W = innerWidth, H = innerHeight;
      return { a0: r(q('#extras [data-k="itemAct0"]')), a1: r(q('#extras [data-k="itemAct1"]')), others: [...document.querySelectorAll('#extras .xb:not([data-k^="itemAct"]), #skills .sb, .dock')].filter((e) => e.getBoundingClientRect().width > 0).map(r),
        l0: q('#extras [data-k="itemAct0"] label').textContent, l1: q('#extras [data-k="itemAct1"] label').textContent, hp: { x: 16, y: H - 25, w: Math.min(220, W * 0.24), h: 20, vis: true }, W, H };
    });
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const inside = (a) => a.x >= 0 && a.y >= 0 && a.x + a.w <= L.W && a.y + a.h <= L.H;
    ok(`${tag}: hai nút đồ kích hoạt hiện, đúng tên`, L.a0.vis && L.a1.vis && L.l0 === 'Xích Giữ' && L.l1 === 'Lọng Che', `${L.l0} / ${L.l1}`);
    ok(`${tag}: hai nút đồ không đè nhau, không đè nút khác / thanh máu / mép màn`, !hit(L.a0, L.a1) && [L.a0, L.a1].every((a) => inside(a) && !hit(a, L.hp) && !L.others.some((o) => hit(a, o))),
      `a0 ${L.a0.x | 0},${L.a0.y | 0} ${L.a0.w | 0}×${L.a0.h | 0} · a1 ${L.a1.x | 0},${L.a1.y | 0}`);
    await shot(page, `items_hud_${tag}.png`, { x: 0, y: Math.round(H * 0.5), width: W, height: H - Math.round(H * 0.5) });
    // (b) chạm Xích Giữ
    await page.evaluate(() => { const { foe, place, c } = window.__t, p = window.__game.player; place(p, c.x, c.y); place(foe, c.x + 350, c.y); foe.hp = foe.stats.maxHp; foe.statuses = []; });
    await waitFor(page, () => window.__t.foe.seenBy?.[window.__game.player.team] !== false, 30);
    console.log(`  (chạm ${await tap(page, '#extras [data-k="itemAct0"] button')}ms)`);
    const tSup = await waitFor(page, () => { const g = window.__game, f = window.__t.foe; return f.statuses.some((s) => s.kind === 'suppress' && s.src === g.player.id) && !!g.player.channel && document.getElementById('skills').classList.contains('cc'); }, 30);
    ok(`${tag}: chạm Xích Giữ → địch bị áp chế, mình niệm giữ, nút kỹ năng xám`, tSup >= 0, `${tSup} tick`);
    await shot(page, `items_suppress_${tag}.png`);
    const tFree = await waitFor(page, () => { const g = window.__game; return !window.__t.foe.statuses.some((s) => s.kind === 'suppress') && !g.player.channel && !document.getElementById('skills').classList.contains('cc'); }, 90);
    ok(`${tag}: hết 1,25s cả hai được thả`, tFree >= 0, `${tFree} tick`);
    // (c) giữ nút Lọng xem mô tả, phím Q dùng Lọng
    const c1 = await center(page, '#extras [data-k="itemAct1"] button');
    await page.mouse.move(c1.x, c1.y); await page.mouse.down(); await sleep(900);
    const tip = await page.evaluate(() => { const t = document.querySelector('.hudtip'); return t && !t.hidden ? t.textContent : ''; });
    await page.mouse.up();
    ok(`${tag}: giữ nút Lọng hiện mô tả`, tip.includes('Lọng'), tip.slice(0, 40));
    await page.keyboard.press('q');
    const tSh = await waitFor(page, () => window.__game.player.shields.length > 0, 30);
    ok(`${tag}: phím Q dùng Lọng Che (có khiên)`, tSh >= 0);
    // (d) bán Xích, mua Dải Lụa Gió, kéo nút sang phải
    await page.evaluate(() => { const g = window.__game, w = g.world, p = g.player; w.command(p.id, { type: 'sell', slot: p.items.indexOf('xich_dong') }); w.command(p.id, { type: 'buy', item: 'dai_lua_gio' }); });
    await waitFor(page, () => document.querySelector('#extras [data-k="itemAct0"] label').textContent === 'Lụa Gió', 60);
    const lbl = await page.evaluate(() => document.querySelector('#extras [data-k="itemAct0"] label').textContent);
    const p0 = await page.evaluate(() => { const { foe, place, c } = window.__t, p = window.__game.player; place(p, c.x, c.y); place(foe, c.x + 2500, c.y); return { x: p.pos.x, y: p.pos.y }; });
    const s0 = await screenOf(page, p0.x, p0.y), s1 = await screenOf(page, p0.x + 300, p0.y), k = 80 / Math.hypot(s1.x - s0.x, s1.y - s0.y);
    const sel0 = '#extras [data-k="itemAct0"] button', ddx = (s1.x - s0.x) * k, ddy = (s1.y - s0.y) * k; // kéo đúng hướng +x của bản đồ trên màn hình
    const dr = await drag(page, sel0, ddx, ddy);
    const used = await waitFor(page, () => window.__game.player.itemCd?.dai_lua_gio > 0 && !window.__game.player.dash, 40);
    if (used < 0 && dr.tipped) console.log('  (lúc thả nút còn đang hiện mô tả: kéo không chuyển sang ngắm)');
    const m = await page.evaluate((p0) => { const p = window.__game.player; return { dx: p.pos.x - p0.x, dy: p.pos.y - p0.y, pad: document.querySelector('.aimpad')?.hidden ?? true }; }, p0);
    ok(`${tag}: kéo nút Lụa Gió → lướt ~320 theo hướng kéo, vòng ngắm tắt`, lbl === 'Lụa Gió' && Math.abs(m.dx - 320) < 45 && Math.abs(m.dy) < 45 && m.pad, `${lbl} Δ ${m.dx.toFixed(0)},${m.dy.toFixed(0)}`);
  }
  ok('items: không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function lockon(browser) {
  const { page, ctx, errs } = await open(browser, 'trang_nhi');
  for (const [W, H] of SIZES) {
    const tag = `${W}x${H}`;
    await page.setViewportSize({ width: W, height: H }); await sleep(400);
    const pos = await page.evaluate(() => {
      const g = window.__game, w = g.world, p = g.player, { foe, place, c } = window.__t;
      p.skillLevels.s3 = 1; w.debug.resetCooldowns(p); place(p, c.x, c.y); place(foe, c.x + 450, c.y + 120); foe.hp = foe.stats.maxHp;
      foe.statuses = foe.statuses.filter((s) => s.id !== 'manh_moi_' + p.id); foe.statuses.push({ id: 'manh_moi_' + p.id, kind: 'mark', n: 2, src: p.id, until: w.tick + 900 });
      window.__cmds = []; if (!w.__wrapped) { const cmd = w.command; w.command = (id, c) => { if (id === p.id) window.__cmds.push(c); cmd(id, c); }; w.__wrapped = true; }
      return { p: { x: p.pos.x, y: p.pos.y }, f: { x: foe.pos.x, y: foe.pos.y } };
    });
    await waitFor(page, () => window.__t.foe.seenBy?.[window.__game.player.team] !== false, 30);
    const a = await screenOf(page, pos.p.x, pos.p.y), b = await screenOf(page, pos.f.x, pos.f.y), k = 70 / Math.hypot(b.x - a.x, b.y - a.y);
    const marked = await drag(page, '#skills [data-k="s3"]', (b.x - a.x) * k, (b.y - a.y) * k, 1500, () => page.evaluate(() => window.__game.indicators.markShown(0)));
    await waitFor(page, () => window.__cmds.some((x) => x.type === 'cast' && x.slot === 's3'), 20);
    const last = await page.evaluate(() => { const c = window.__cmds.filter((x) => x.type === 'cast' && x.slot === 's3').pop(); return { id: c?.aim?.id ?? null, foe: window.__t.foe.id }; });
    ok(`${tag}: kéo K3 (khoá mục tiêu) → dấu vàng xem trước hiện`, marked === true);
    ok(`${tag}: lệnh tung mang aim.id = tướng địch đang xem trước`, last.id === last.foe, `${last.id} / ${last.foe}`);
    await shot(page, `lockon_${tag}.png`);
  }
  ok('lockon: không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function suppress(browser) {
  const { page, ctx, errs } = await open(browser, 'bong_den');
  for (const [W, H] of SIZES) {
    const tag = `${W}x${H}`;
    await page.setViewportSize({ width: W, height: H }); await sleep(400);
    await page.evaluate(() => { const g = window.__game, w = g.world, p = g.player, { foe, place, c } = window.__t; p.skillLevels.s2 = 1; w.debug.resetCooldowns(p); place(p, c.x, c.y); place(foe, c.x + 400, c.y); foe.statuses = []; foe.hp = foe.stats.maxHp; });
    await waitFor(page, () => window.__t.foe.seenBy?.[window.__game.player.team] !== false, 30);
    console.log(`  (chạm ${await tap(page, '#skills [data-k="s2"]')}ms)`);
    const t = await waitFor(page, () => { const g = window.__game, f = window.__t.foe; return f.statuses.some((s) => s.kind === 'suppress' && s.src === g.player.id) && g.player.channel?.target === f.id; }, 40);
    ok(`${tag}: chạm Trói Bóng → địch bị áp chế, Bóng Đèn niệm giữ dây`, t >= 0, `${t} tick`);
    await shot(page, `bongden_${tag}.png`);
    const t2 = await waitFor(page, () => window.__t.foe.statuses.some((s) => s.id === 'troi_bong_stun') || !window.__game.player.channel, 90);
    ok(`${tag}: dây kết thúc (choáng cuối / thả)`, t2 >= 0);
    await waitFor(page, () => !window.__t.foe.statuses.some((s) => s.kind === 'stun'), 60);
  }
  ok('suppress: không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function pings(browser) {
  const { page, ctx, errs } = await open(browser, 'canh_dieu');
  const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);
  const hit = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  for (const [W, H] of SIZES) {
    const tag = `${W}x${H}`;
    await page.setViewportSize({ width: W, height: H }); await sleep(400);
    await page.evaluate(() => { const g = window.__game; g.world.pings.length = 0; g.player.pingLog = []; });
    await tap(page, '#pingBtn'); await page.waitForSelector('#pingWheel:not([hidden]) button[data-k="gather"]', { timeout: 60000 });
    const btns = await page.evaluate(() => [...document.querySelectorAll('#pingWheel button')].map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
    const mm = await box('#minimap'), skills = await page.evaluate(() => [...document.querySelectorAll('#skills [data-k], #skills button')].map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
    const inView = btns.every((r) => r.l >= 0 && r.t >= 0 && r.r <= W && r.b <= H), clash = btns.filter((r) => hit(r, mm) || skills.some((k) => hit(r, k))).length;
    ok(`${tag}: vòng 4 tín hiệu nằm trong màn, không đè bản đồ nhỏ / nút kỹ năng`, btns.length === 4 && inView && !clash, `${btns.length} nút, đè ${clash}`);
    await shot(page, `pings_wheel_${tag}.png`);
    await tap(page, '#pingWheel button[data-k="gather"]');
    const c = mm && { x: (mm.l + mm.r) / 2, y: (mm.t + mm.b) / 2 };
    await page.touchscreen.tap(c.x, c.y);
    const t = await waitFor(page, () => window.__game.world.pings.some((p) => p.kind === 'gather' && p.src === window.__game.player.id), 60);
    ok(`${tag}: Tập hợp + chạm bản đồ nhỏ → tín hiệu vào mô phỏng`, t >= 0, `${t} tick`);
    const feed = await page.evaluate(() => document.querySelector('#pingFeed')?.textContent || '');
    ok(`${tag}: dòng báo bên trái ghi Tập hợp`, /Tập hợp/.test(feed), feed.slice(0, 60));
    const ack = await waitFor(page, () => [...(window.__game.world.brains?.[0]?.orders?.values() || [])].some((o) => o.kind === 'ping'), 90);
    ok(`${tag}: bot đồng đội nhận lệnh đi tới`, ack >= 0, `${ack} tick`);
    await sleep(700);
    await tap(page, '#pingBtn'); await page.waitForSelector('#pingWheel:not([hidden]) button[data-k="retreat"]', { timeout: 60000 });
    // hai cú chạm liền nhau trong cùng một nhịp: máy không GPU mỗi page.tap chờ vài khung (vài giây) — quá 4 s là vòng tự đóng (hud/pings.js)
    await page.evaluate(() => { const b = document.querySelector('#pingWheel button[data-k="retreat"]'); for (let i = 0; i < 2; i++) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); });
    const r = await waitFor(page, () => { const g = window.__game, p = g.world.pings.find((q) => q.kind === 'retreat' && q.src === g.player.id); return p && Math.hypot(p.x - g.player.pos.x, p.y - g.player.pos.y) < 400; }, 60);
    ok(`${tag}: chạm Rút lui hai lần → tín hiệu ngay chỗ mình`, r >= 0, `${r} tick`);
    await shot(page, `pings_${tag}.png`);
  }
  ok('pings: không lỗi trang / console', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await PW.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const [name, fn] of [['items', items], ['lockon', lockon], ['suppress', suppress], ['pings', pings]]) if (only.includes(name)) { const t0 = Date.now(); await fn(browser); console.log(`(${name}: ${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
  } catch (e) { console.log('LỖI chạy kịch bản: ' + e.message); fail++; }
  await browser.close();
  console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
  process.exit(fail ? 1 : 0);
})();
