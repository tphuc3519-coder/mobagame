// Rà bố cục mọi màn ngoài trận + hộp thoại + bảng trên nhiều cỡ màn (kể cả Safari iPhone còn thanh địa chỉ + thanh tab: 852×252,
// iPhone SE 667×235): với từng màn, mọi nút / ô bấm phải nằm trọn trong màn hình (hoặc trong một vùng cuộn được mà bản thân vùng đó
// nằm trong màn hình), không bị khung cha cắt mất; hộp thoại / bảng không cao quá màn; trang không có thanh cuộn ngang; không lỗi JS.
// Chữ khó đọc (màu chữ sát màu nền, vd. chữ vàng trên thẻ nền vàng) cũng tính là lỗi. In cỡ nút nhỏ nhất mỗi màn (tham khảo: màn rất
// thấp thì cả giao diện thu nhỏ đều theo ui/viewport.js).
// Chạy: python3 -m http.server <cổng> --bind 127.0.0.1 ở gốc repo, rồi node tools/b_fit.cjs <cổng> [máy,máy…] [màn,màn…]
//   máy: tab15 se_tab safari and360 ip14 pmax ipad lap fhd (mặc định: tất cả) · SHOTS=<thư mục> lưu ảnh từng màn.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
let PW; try { PW = require('playwright'); } catch (_) { PW = require('/opt/node22/lib/node_modules/playwright'); }
const fs = require('fs'), path = require('path');
const port = +process.argv[2] || 8099, BASE = `http://127.0.0.1:${port}`;
const DEV = {
  tab15: { w: 852, h: 252, sw: 852, sh: 393, touch: true },   // iPhone 15 Pro ngang trong Safari: thanh địa chỉ + thanh tab che ~140 px
  se_tab: { w: 667, h: 235, sw: 667, sh: 375, touch: true },  // iPhone SE ngang trong Safari còn thanh địa chỉ + tab
  safari: { w: 844, h: 320, touch: true },  // iPhone ngang, Safari thanh địa chỉ gọn
  and360: { w: 640, h: 360, touch: true },  // Android nhỏ toàn màn
  ip14: { w: 844, h: 390, touch: true },    // iPhone 14 toàn màn (đã cài như ứng dụng)
  pmax: { w: 932, h: 430, touch: true },
  ipad: { w: 1024, h: 768, touch: true },
  lap: { w: 1366, h: 768, touch: false },
  fhd: { w: 1920, h: 1080, touch: false },
};
const devs = (process.argv[3] || '').split(',').filter((d) => DEV[d]);
const onlyScr = (process.argv[4] || '').split(',').filter(Boolean);
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const T = (s) => s * 1000 * (+process.env.SLOW || 1);
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; return cond; };

/** Chạy trong trang: các vi phạm bố cục của lớp trên cùng (hộp thoại / bảng đang mở, hoặc màn hiện tại). */
function audit() {
  const W = innerWidth, H = innerHeight, bad = [];
  const shown = (e) => { for (let a = e; a && a !== document; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const name = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${e.dataset?.a ? '[' + e.dataset.a + ']' : ''}${(e.textContent || '').trim() ? ' «' + e.textContent.trim().slice(0, 18) + '»' : ''}`;
  const layers = [...document.querySelectorAll('#ui > .ui-dlg, #ui > .ui-panel.on, .scr > .ui-dlg, body > .lqs-wrap, #rewardScr, .shop.on, #pg')].filter(shown);
  const root = layers.length ? layers[layers.length - 1] : [...document.querySelectorAll('#ui > .scr')].filter(shown).pop() || document.body;
  const sel = 'button, [data-a], input, select, [role="button"], .hc, .md-card, [data-seat], [data-h], [data-m], .q, .lu, .ld-card';
  const PRIMARY = '.ui-dlg .btns button, .ui-back, [data-a="go"], [data-a="start"], [data-a="lock"], [data-a="ban"], [data-a="ready"], [data-a="create"], [data-a="join"], [data-a="accept"], [data-a="leave"], [data-a="rejoin"], .md-card';
  let minT = Infinity;
  for (const e of root.querySelectorAll(sel)) {
    if (!shown(e) || e.closest('[aria-hidden="true"]')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) continue;
    if (e.matches('button, [role="button"], [data-a]')) minT = Math.min(minT, Math.min(r.width, r.height));
    let sc = null, clip = { l: 0, t: 0, r: W, b: H };
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a), ov = cs.overflowX + ' ' + cs.overflowY;
      if (/(auto|scroll)/.test(ov) && (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1)) { sc = a; break; }
      if (/(hidden|clip|auto|scroll)/.test(ov)) { const q = a.getBoundingClientRect(); clip = { l: Math.max(clip.l, q.left), t: Math.max(clip.t, q.top), r: Math.min(clip.r, q.right), b: Math.min(clip.b, q.bottom) }; }
    }
    if (sc) {
      const q = sc.getBoundingClientRect(); if (q.top < -2 || q.bottom > H + 2 || q.left < -2 || q.right > W + 2) bad.push(`vùng cuộn ra ngoài màn: ${name(sc)} [${q.left | 0},${q.top | 0}→${q.right | 0},${q.bottom | 0}]`);
      // nút hành động chính phải thấy ngay, không phải cuộn mới thấy
      if (e.matches(PRIMARY) && (r.top < q.top - 2 || r.bottom > q.bottom + 2 || r.left < q.left - 2 || r.right > q.right + 2)) bad.push(`nút chính phải cuộn mới thấy: ${name(e)} [${r.left | 0},${r.top | 0}→${r.right | 0},${r.bottom | 0}] trong ${name(sc)}`);
      continue;
    }
    if (r.left < clip.l - 2 || r.top < clip.t - 2 || r.right > clip.r + 2 || r.bottom > clip.b + 2) bad.push(`bị cắt: ${name(e)} [${r.left | 0},${r.top | 0}→${r.right | 0},${r.bottom | 0}]`);
  }
  for (const b of document.querySelectorAll('.ui-dlg .box, .lqs-wrap > *, #rewardScr .rw-box')) { if (!shown(b)) continue; const q = b.getBoundingClientRect(); if (q.top < -2 || q.bottom > H + 2 || q.left < -2 || q.right > W + 2) bad.push(`hộp ra ngoài màn: ${name(b)} [${q.left | 0},${q.top | 0}→${q.right | 0},${q.bottom | 0}]`); }
  // chữ khó đọc: màu chữ sát màu nền (vd. chữ vàng / trắng trên thẻ nền vàng đang chọn). Bỏ qua chữ có viền / bóng (tiêu đề .gt) và chữ
  // nằm trên ảnh (nền url(…) — không biết màu). Nền dải màu: lấy màu giữa của các điểm màu đặc (lớp bóng trắng mờ của nút bị bỏ).
  const rgb = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (e) => {
    for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
      const pb = getComputedStyle(a, '::before'); // lớp nền vẽ bằng ::before phủ kín (vd. huy hiệu cấp ở sảnh: viền mực + ruột vàng)
      const cover = ['top', 'right', 'bottom', 'left'].every((k) => Math.abs(parseFloat(pb[k])) <= 3); // chỉ lớp phủ kín (inset ≈ 0)
      if (pb.content !== 'none' && pb.position === 'absolute' && cover && a !== e) { const c = rgb((pb.backgroundImage.match(/rgba?\([^)]+\)/g) || []).filter((x) => rgb(x).a >= 0.6)[1] || pb.backgroundColor); if (c && c.a >= 0.6 && (pb.backgroundImage !== 'none' || rgb(pb.backgroundColor).a >= 0.6)) return c; }
      const cs = getComputedStyle(a);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') { if (/url\(/.test(cs.backgroundImage)) return null; const cols = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0])).filter((c) => c && c.a >= 0.6); if (cols.length) return cols[Math.floor(cols.length / 2)]; }
      const c = rgb(cs.backgroundColor); if (c && c.a >= 0.6) return c;
    }
    return null;
  };
  for (const e of root.querySelectorAll('*')) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || !shown(e)) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;
    const cs = getComputedStyle(e); if (parseFloat(cs.webkitTextStrokeWidth) > 0 || (cs.textShadow && cs.textShadow !== 'none')) continue;
    const fg = rgb(cs.webkitTextFillColor || cs.color), bg = bgOf(e); if (!fg || fg.a < 0.5 || !bg) continue;
    const L1 = lum(fg), L2 = lum(bg), k = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (k < 1.8) bad.push(`chữ khó đọc (tương phản ${k.toFixed(2)}): ${name(e)}`);
  }
  const sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
  if (sw > W + 1) bad.push(`trang cuộn ngang: ${sw} > ${W}`);
  if (sh > H + 1) bad.push(`trang cuộn dọc: ${sh} > ${H}`);
  return { bad: [...new Set(bad)], minT: minT === Infinity ? null : Math.round(minT), zoom: getComputedStyle(document.documentElement).getPropertyValue('--uiz') || '1' };
}

async function run(browser, dk) {
  const d = DEV[dk];
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, screen: { width: d.sw || d.w, height: d.sh || d.h }, deviceScaleFactor: 1, isMobile: d.touch, hasTouch: d.touch });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('fit')) { sessionStorage.setItem('fit', 1); localStorage.setItem('la.profile', JSON.stringify({ name: 'Người Chơi Tên Dài', stars: 30, best: 30, rolePri: 'mid', roleSec: 'support', gold: 123456, gems: 980, chests: 2 })); localStorage.setItem('la.gfx', JSON.stringify({ v: 2, preset: 'low' })); } } catch (_) {} });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  const go = async (fn, arg) => { await page.evaluate(fn, arg); await page.waitForTimeout(700); };
  const clean = () => page.evaluate(() => { document.querySelectorAll('#ui > .ui-dlg, #ui > .ui-panel, body > .lqs-wrap, #rewardScr').forEach((x) => x.remove()); });
  const scr = (n) => page.waitForFunction((n) => window.__flow?.nav?.screen === n, n, { timeout: T(30) });
  const check = async (label) => {
    if (onlyScr.length && !onlyScr.some((s) => label.startsWith(s))) return;
    const r = await page.evaluate(audit);
    ok(`${dk} ${d.w}×${d.h} · ${label}`, !r.bad.length, `(zoom ${(+r.zoom).toFixed(2)}, nút nhỏ nhất ${r.minT ?? '-'} px)${r.bad.length ? '\n     ' + r.bad.slice(0, 6).join('\n     ') : ''}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${dk}_${label.replace(/[^\w-]+/g, '_')}.png`) }).catch(() => {});
  };
  await page.goto(`${BASE}/?server=off`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(240) });
  await page.waitForTimeout(1500);
  for (const x of await page.$$('.ui-dlg .btn-blue')) await x.click().catch(() => {}); // hộp thoại đầu phiên (nếu có)
  await clean();
  await check('sảnh');
  // bảng mở từ sảnh
  for (const a of ['profile', 'friends', 'mail', 'missions', 'leader', 'history', 'event', 'bag', 'loadout', 'heroes', 'items', 'gems', 'settings']) {
    await page.evaluate((a) => document.querySelector(`#home [data-a="${a}"]`)?.click(), a); await page.waitForTimeout(650);
    await check('bảng-' + a); await clean(); await page.waitForTimeout(150);
  }
  await page.evaluate(() => document.querySelector('#home [data-a="modes"]').click()); await page.waitForTimeout(650); await check('chọn-chế-độ');
  await page.evaluate(() => document.querySelector('.ui-panel .md-card[data-m="ai"]').click()); await page.waitForTimeout(650); await check('đấu-máy'); await clean();
  // phòng chờ + chọn vị trí + tìm thấy trận
  await go(() => window.__flow.nav.go('room', { mode: 'normal' })); await scr('room'); await check('phòng-chờ-thường');
  await page.evaluate(() => document.querySelector('#room [data-a="role"]')?.click()); await page.waitForTimeout(600); await check('chọn-vị-trí'); await clean();
  await page.evaluate(() => document.querySelector('#room [data-a="go"]').click()); await page.waitForSelector('.found', { timeout: T(15) }).catch(() => {}); await page.waitForTimeout(500); await check('tìm-thấy-trận');
  await go(() => window.__flow.nav.go('room', { mode: 'ranked' })); await scr('room'); await check('phòng-chờ-hạng');
  await go(() => window.__flow.nav.go('room', { mode: 'solo' })); await scr('room'); await check('phòng-chờ-1v1');
  // chọn tướng + hộp chọn phép / bảng bùa / phù hiệu
  await go(() => { window.__flow.S.match = null; window.__flow.nav.go('pick', { mode: 'normal' }); }); await scr('pick'); await page.waitForTimeout(800); await check('chọn-tướng');
  for (const a of ['spell', 'charm', 'emblem']) { await page.evaluate((a) => document.querySelector(`#pick [data-a="${a}"]`)?.click(), a); await page.waitForTimeout(600); await check('chọn-tướng-' + a); await clean(); }
  await go(() => { window.__flow.S.match = null; window.__flow.nav.go('pick', { mode: 'training' }); }); await scr('pick'); await check('luyện-tập');
  // cấm/chọn đấu hạng → chuẩn bị
  await go(() => { window.__flow.S.match = null; window.__flow.nav.go('draft', { mode: 'ranked' }); }); await scr('draft'); await page.waitForTimeout(500); await check('cấm-chọn');
  await page.evaluate(() => window.__draft.speed(12));
  for (let i = 0; i < 200 && (await page.evaluate(() => window.__draft?.st?.phase)) === 'draft'; i++) { await page.evaluate(() => { const d = window.__draft; if (d?.turn === 'ban') d.skip(); else if (d?.turn === 'pick') d.act(); }); await page.waitForTimeout(150); }
  await page.waitForTimeout(600); await check('cấm-chọn-chuẩn-bị');
  // đội hình → màn tải (về sảnh trước khi trận dựng)
  await go(() => { const S = window.__flow.S, R = ['temple', 'river', 'jungle', 'support'], F = ['temple', 'mid', 'river', 'jungle', 'support'];
    S.mode = 'normal'; S.match = { seed: 1, role: 'mid', allies: R.map((role, i) => ({ name: 'Đồng Đội Số ' + i, stars: 20, role })), foes: F.map((role, i) => ({ name: 'Đối Thủ Số ' + i, stars: 20, role })) };
    S.pick = { heroId: 'hoa_ren', spellId: 'chop_buoc', dummies: false, role: 'mid', allyHeroes: ['thach_quy', 'bong_tre', 'nguyet_ha', 'hanh_hoa'], foeHeroes: ['canh_dieu', 'long_dang', 'tieu_anh', 'ba_nam', 'cau_may'], allyRoles: R, foeRoles: F };
    window.__flow.nav.go('lineup'); });
  await scr('lineup'); await page.waitForTimeout(1200); await check('đội-hình'); // chờ thẻ trượt lên xong (hiệu ứng luIn ≤ 0,85 giây)
  await scr('loading'); await page.waitForTimeout(400); await check('màn-tải'); await go(() => window.__flow.nav.go('home')); await scr('home');
  // phòng tuỳ chỉnh: chưa vào phòng / trong phòng (phòng giả 5v5, 6 người)
  await go(() => window.__flow.nav.go('custom')); await scr('custom'); await check('phòng-tuỳ-chỉnh');
  await page.evaluate(() => { const n = window.__flow.net; n.room = { t: 'room', kind: 'custom', code: 'AB7K', q: 'custom', mode: '5v5', size: 5, bots: true, difficulty: 'normal', state: 'lobby', left: 0, you: 0, at: performance.now(),
    players: [0, 1, 2, 3, 4, 5].map((i) => ({ name: 'Người Chơi ' + i, avatar: 'hoa_ren', team: i % 2, slot: i >> 1, ready: i % 3 === 0, host: i === 0, online: true })) }; window.__online.render(); });
  await page.waitForTimeout(300); await check('phòng-tuỳ-chỉnh-trong-phòng'); await page.evaluate(() => { window.__flow.net.room = null; }); await go(() => window.__flow.nav.go('home')); await scr('home');
  // màn kết quả (3 bước) từ một trận mô phỏng ngắn + màn nhận thưởng + hộp thoại báo văng
  await page.evaluate(async () => {
    const [{ createWorld }, { setupTeams }, { ARENA }, { scoreMatch }, { openPostgame }] = await Promise.all(['/src/sim/world.js', '/src/sim/lineup.js', '/src/data/maps.js', '/src/ui/score.js', '/src/ui/postgame.js'].map((m) => import(m)));
    const w = createWorld({ map: ARENA, seed: 3 }), lu = setupTeams(w, { heroId: 'hoa_ren', difficulty: 'normal' });
    for (let t = 1; t <= 600; t++) { w.update(t); w.events.length = 0; }
    const heroes = w.entities.filter((e) => e.kind === 'hero'), rows = scoreMatch(heroes, 0), names = {}; for (const h of heroes) names[h.id] = h === lu.player ? 'Người Chơi Tên Dài' : 'Máy Tên Khá Dài [Máy]';
    window.__flow.nav.go('home'); document.getElementById('home')?.remove();
    openPostgame({ rows, myId: lu.player.id, myTeam: 0, winner: 0, names, ticks: 600, mode: 'ranked', modeName: 'Đấu hạng 5v5', rewards: { gold: 180, exp: 70, stars: 1, notes: ['Chuỗi 3 trận thắng: +1 sao'], courage: { gain: 14, now: 40, used: false } }, onHome: () => {}, onAgain: () => {} });
  });
  await page.waitForTimeout(1200); await check('kết-quả-1');
  for (const k of [2, 3]) { await page.mouse.click(d.w / 2, d.h / 2); await page.waitForTimeout(1200); await check('kết-quả-' + k); }
  await page.evaluate(() => { document.getElementById('pg')?.remove(); window.__flow.nav.go('home'); });
  await page.waitForTimeout(600);
  await page.evaluate(async () => { const { showRewards } = await import('/src/ui/rewards.js'); showRewards([{ k: 'gold', n: 180 }, { k: 'exp', n: 70 }, { k: 'chest', n: 1 }], { title: 'Nhận thưởng thành công' }); });
  await page.waitForTimeout(900); await check('nhận-thưởng'); await clean();
  await page.evaluate(async () => { localStorage.setItem('la.crash', JSON.stringify({ mode: 'ranked', t: Date.now() })); const { checkCrash } = await import('/src/ui/crashGuard.js'); checkCrash(window.__flow.nav); });
  await page.waitForTimeout(500); await check('hộp-thoại'); await clean();
  // trong trận: cửa hàng, cài đặt, bảng tỉ số
  if (!onlyScr.length || onlyScr.some((s) => s.startsWith('trận'))) {
    await page.goto(`${BASE}/?hero=hoa_ren&mode=5v5&q=low&nobot`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.world && window.__game.world.tick > 10, null, { timeout: T(300) });
    await page.evaluate(() => window.__game.loop.pause()); await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('goldPill')?.click());
    await page.waitForFunction(() => getComputedStyle(document.getElementById('shop')).transform === 'none', null, { timeout: T(10) }).catch(() => {}); // chờ cửa hàng trượt vào xong (máy chậm: > 1 giây)
    await page.waitForTimeout(200); await check('trận-cửa-hàng');
    await page.evaluate(() => document.getElementById('shopX')?.click()); await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('hudSet')?.click()); await page.waitForTimeout(600); await check('trận-cài-đặt'); await clean();
    await page.evaluate(() => document.getElementById('scoreTop')?.click()); await page.waitForTimeout(600); await check('trận-bảng-tỉ-số');
  }
  ok(`${dk}: không lỗi JS`, !errs.length, errs.slice(0, 4).join('\n     '));
  await ctx.close();
}

(async () => {
  const browser = await PW.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const t0 = Date.now();
  for (const dk of devs.length ? devs : Object.keys(DEV)) { try { await run(browser, dk); } catch (e) { ok(`${dk}: chạy hết các màn`, false, e.message.split('\n')[0]); } }
  await browser.close();
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
