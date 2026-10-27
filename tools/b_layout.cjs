// Bố cục HUD trong trận trên nhiều thiết bị (hud/layout.js, 07 §9): trận 5v5 thật, đo khung DOM của mọi nút + bản đồ nhỏ + cần điều khiển
// (vòng tròn ở vị trí nghỉ). Mỗi máy / mỗi kiểu (cửa hàng trái / phải, cỡ nút Lớn, bản đồ Lớn):
//  - không khối nào chồng lên khối nào (trong cụm kỹ năng chỉ xét nút camera với các nút chiêu), cần điều khiển không đè nút / bản đồ nhỏ;
//  - không gì ra ngoài màn hình hay lấn vùng an toàn (tai thỏ trái / phải, thanh vuốt);
//  - màn chạm: nút chính ≥ 44 px (Đánh, chiêu, Ăn lính / Đẩy trụ, nút phụ, camera, tín hiệu, cửa hàng); cần ≥ 56 px bán kính;
//  - bản đồ nhỏ 26–40% chiều cao dùng được trên điện thoại, ≥ 22% ở màn lớn; đổi Cài đặt cỡ nút / bản đồ áp dụng ngay giữa trận.
// Chạy: python3 -m http.server <PORT> --bind 127.0.0.1 ở gốc repo, rồi node tools/b_layout.cjs <PORT> [se,ip14,…]
let PW; try { PW = require('playwright'); } catch (_) { PW = require('/opt/node22/lib/node_modules/playwright'); }
const port = +process.argv[2] || 8080;
const DEV = {
  se: { w: 667, h: 375, dpr: 2, touch: true },                                              // iPhone SE / 8 ngang
  ip14: { w: 844, h: 390, dpr: 3, touch: true, inset: { left: 47, right: 47, bottom: 21 } },  // iPhone 14 ngang (tai thỏ)
  pmax: { w: 932, h: 430, dpr: 3, touch: true, inset: { left: 59, right: 59, bottom: 21 } },  // iPhone Pro Max ngang
  and: { w: 800, h: 360, dpr: 3, touch: true },                                             // Android 20:9
  safari: { w: 667, h: 320, dpr: 2, touch: true },                                          // iPhone SE trong Safari còn thanh địa chỉ
  ipad: { w: 1024, h: 768, dpr: 2, touch: true, inset: { bottom: 20 } },                     // iPad 4:3
  ipadair: { w: 1180, h: 820, dpr: 2, touch: true, inset: { bottom: 20 } },
  lap: { w: 1366, h: 768, dpr: 1, touch: false },                                           // máy tính xách tay (chuột)
  fhd: { w: 1920, h: 1080, dpr: 1, touch: false },
};
// kiểu thử thêm trên vài máy: cửa hàng bên phải (chiếm góc phải trên), cỡ nút Lớn + bản đồ Lớn trên máy nhỏ nhất
const RUNS = [...Object.keys(DEV).map((d) => [d, {}]), ['safari', { shop: 'right' }], ['ip14', { shop: 'right' }], ['ipad', { shop: 'right' }], ['se', { hudSize: 'lg', mmSize: 'lg' }], ['safari', { hudSize: 'lg' }]];
const only = (process.argv[3] || '').split(',').filter(Boolean);
const T = (s) => s * 1000 * (+process.env.SLOW || 1);
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

async function run(browser, dk, pf) {
  const d = DEV[dk], label = dk + (Object.keys(pf).length ? '[' + Object.entries(pf).map(([k, v]) => k + '=' + v).join(',') + ']' : '');
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: Math.min(d.dpr, 2), isMobile: d.touch, hasTouch: d.touch });
  await ctx.addInitScript((p) => { try { localStorage.setItem('la.prefs', JSON.stringify(p)); } catch (_) {} }, pf);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const ins = { top: 0, left: 0, right: 0, bottom: 0, ...(d.inset || {}) };
  if (d.inset) await (await ctx.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: ins }).catch(() => {});
  await page.goto(`http://127.0.0.1:${port}/index.html?hero=kiem_thuy&mode=5v5&noauto=1&q=low`, { waitUntil: 'domcontentloaded', timeout: T(180) });
  await page.waitForFunction(() => window.__game && window.__game.world.tick > 20 && document.querySelector('#extras .xb'), null, { timeout: T(300), polling: 500 });
  await page.evaluate(() => window.__game.loop.pause());
  await page.waitForTimeout(300);
  const measure = () => page.evaluate(() => {
    const R = (e) => { if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[hidden], .shop:not(.on)')) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
    const el = {}, add = (n, e) => { const x = R(e); if (x) el[n] = x; };
    for (const id of ['minimap', 'pingBtn', 'camBtn', 'hudSet', 'fs', 'scoreTop']) add(id, document.getElementById(id));
    document.querySelectorAll('#skills [data-k]').forEach((e) => add('sk:' + e.dataset.k, e));
    document.querySelectorAll('#extras > .xb').forEach((e) => add('x:' + e.dataset.k, e.querySelector('.sb.mini') && R(e.querySelector('.sb.mini')) ? e : null));
    document.querySelectorAll('#extras > .xb .sb.mini').forEach((e) => add('btn:' + e.parentElement.dataset.k, e));
    add('goldPill', document.querySelector('.dock .goldPill')); document.querySelectorAll('.dock .q').forEach((e, i) => add('q' + i, e));
    const g = window.__game, j = g.layout.joy(true), mm = document.getElementById('minimap');
    return { vw: innerWidth, vh: innerHeight, el, joy: j, R: g.input.R, rest: g.input.rest(), lay: g.layout.cur, mmCss: mm.getBoundingClientRect().height };
  });
  const m = await measure(), E = m.el;
  { const sl = m.lay.safe.l || 0, w = Math.min(220, m.vw * 0.24); E.selfBar = { l: 16 + sl, t: m.vh - 25, r: 16 + sl + w, b: m.vh - 5, w, h: 20 }; } // thanh máu / cấp của mình (hud.js, layout.selfBarRect)
  const names = Object.keys(E);
  // 1. chồng lấn: hai khối bất kỳ (bỏ cặp nút chiêu với nhau — chúng nằm trong cùng cụm đã được canh bằng công thức; bỏ khung .xb với nút của chính nó)
  const over = [];
  for (let i = 0; i < names.length; i++) for (let k = i + 1; k < names.length; k++) {
    const a = names[i], b = names[k];
    if (a.startsWith('sk:') && b.startsWith('sk:')) continue;
    if ((a.startsWith('btn:') || b.startsWith('btn:')) && (a.slice(a.indexOf(':') + 1) === b.slice(b.indexOf(':') + 1))) continue;
    if (a.startsWith('btn:') && b.startsWith('x:') || a.startsWith('x:') && b.startsWith('btn:')) continue;
    const A = E[a], B = E[b], ox = Math.min(A.r, B.r) - Math.max(A.l, B.l), oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
    if (ox > 1 && oy > 1) over.push(`${a}×${b}`);
  }
  // cần điều khiển (vòng tròn) với mọi khối
  const J = { x: m.rest.x, y: m.rest.y, R: m.R };
  for (const n of names) { const B = E[n], cx = Math.max(B.l, Math.min(J.x, B.r)), cy = Math.max(B.t, Math.min(J.y, B.b)); if (Math.hypot(J.x - cx, J.y - cy) < J.R - 1) over.push('joy×' + n); }
  ok(`${label}: không khối HUD nào chồng lên nhau, cần điều khiển không đè nút / bản đồ nhỏ`, !over.length, over.join(', '));
  // 2. trong màn hình + vùng an toàn
  const out = names.filter((n) => { const e = E[n]; return e.l < ins.left - 0.5 || e.t < -0.5 || e.r > m.vw - ins.right + 0.5 || (n !== 'selfBar' && e.b > m.vh - ins.bottom + 0.5); }); // thanh máu của mình không bấm được: cho nằm trên dải thanh vuốt
  if (J.x - J.R < ins.left - 0.5 || J.y + J.R > m.vh - ins.bottom + 0.5 || J.y - J.R < 0) out.push('joy');
  ok(`${label}: mọi khối nằm trong màn hình, không lấn vùng an toàn`, !out.length, out.join(', '));
  // 3. cỡ nút
  const main = names.filter((n) => /^(sk:|btn:|camBtn|pingBtn|goldPill)/.test(n)), small = main.filter((n) => Math.min(E[n].w, E[n].h) < (d.touch ? 44 : 34) - 0.5);
  const sz = (n) => E[n] ? Math.round(E[n].w) : '-';
  ok(`${label}: nút chính đủ lớn để chạm (${d.touch ? '≥ 44' : '≥ 34'} px)`, !small.length, small.map((n) => `${n}=${sz(n)}`).join(' ') || `Đánh ${sz('sk:atk')} · chiêu ${sz('sk:s1')}/${sz('sk:s2')}/${sz('sk:s3')} · Ăn lính ${sz('sk:minion')} · nút phụ ${sz('btn:recall')} · camera ${sz('camBtn')} · cửa hàng ${sz('goldPill')}`);
  ok(`${label}: cần điều khiển bán kính ≥ 56 px`, m.R >= 56, `R ${m.R} tại (${m.rest.x}, ${m.rest.y})`);
  // 4. bản đồ nhỏ theo chiều cao dùng được
  const hu = m.vh - ins.top - ins.bottom, f = m.mmCss / hu, phone = hu < 500, mmBig = pf.mmSize === 'lg';
  ok(`${label}: bản đồ nhỏ ${Math.round(m.mmCss)} px = ${Math.round(f * 100)}% chiều cao`, phone ? f >= 0.26 && f <= (mmBig ? 0.46 : 0.4) : f >= 0.22 && f <= 0.36);
  ok(`${label}: không lỗi trang`, !errs.length, errs.slice(0, 3).join(' | '));
  console.log(`     ${label} ${m.vw}×${m.vh}: Đánh ${sz('sk:atk')} · chiêu ${sz('sk:s1')} · Ăn lính ${sz('sk:minion')} · phụ ${sz('btn:recall')} · cần R${m.R} · bản đồ ${Math.round(m.mmCss)} · camera ${m.lay.camAbove ? 'trên cụm' : 'góc cụm'}`);
  // 5. đổi Cài đặt giữa trận áp dụng ngay (một máy)
  if (dk === 'ip14' && !Object.keys(pf).length) {
    const before = { a: E['sk:atk'].w, mm: m.mmCss };
    await page.evaluate(async () => { const { setPref } = await import('/src/core/prefs.js'); setPref('hudSize', 'lg'); setPref('mmSize', 'lg'); });
    await page.waitForTimeout(200);
    const m2 = await measure();
    ok(`${label}: Cài đặt cỡ nút Lớn + bản đồ Lớn áp dụng ngay giữa trận`, m2.el['sk:atk'].w > before.a + 4 && m2.mmCss > before.mm + 10, `Đánh ${Math.round(before.a)} → ${Math.round(m2.el['sk:atk'].w)} · bản đồ ${Math.round(before.mm)} → ${Math.round(m2.mmCss)}`);
    await page.evaluate(async () => { const { setPref } = await import('/src/core/prefs.js'); setPref('hudSize', 'sm'); });
    await page.waitForTimeout(200);
    const m3 = await measure();
    ok(`${label}: cỡ nút Nhỏ nhỏ hơn Vừa, vẫn ≥ 44 px`, m3.el['sk:atk'].w < before.a - 4 && Math.min(m3.el['sk:minion'].w, m3.el['sk:s1'].w) >= 43.5, `Đánh ${Math.round(m3.el['sk:atk'].w)} · Ăn lính ${Math.round(m3.el['sk:minion'].w)}`);
  }
  await ctx.close();
}

(async () => {
  const browser = await PW.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [dk, pf] of RUNS) if (!only.length || only.includes(dk)) await run(browser, dk, pf);
  await browser.close();
  console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
  process.exit(fail ? 1 : 0);
})();
