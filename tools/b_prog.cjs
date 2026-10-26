// Kiểm thử trình duyệt GĐ4 (tiến trình tài khoản + lưu dữ liệu), Playwright + Chromium phần mềm. Cần máy chủ tĩnh ở thư mục repo:
//   python3 -m http.server <cổng> --bind 127.0.0.1
//   node tools/b_prog.cjs <cổng> [kịch bản…]     kịch bản: save844 save1280 bag844 bag1280 miss844 miss1280 season844 season1280 skin peak844 peak1280 shop844 shop1280 (mặc định: tất cả)
// save: máy A (hồ sơ có sẵn) → Cài đặt → Dữ liệu → Xuất mã lưu; máy B (trình duyệt trống) → Nhập mã lưu: mã sai bị báo lỗi, mã đúng hiện tóm tắt
//   → Nhập và tải lại → hồ sơ + cài đặt y như máy A, hồ sơ cũ của B được cất làm bản sao lưu; hộp thoại nằm trọn màn hình.
// bag: Túi đồ → mở rương → màn Nhận thưởng (ô quà, chạm ô xem mô tả, chạm khoảng trống đóng) → mua rương, đổi mảnh, bật Thẻ Nhân Đôi Sao;
//   nhận nhiệm vụ cũng hiện màn Nhận thưởng; mọi thứ nằm trọn màn hình.
// season: Xếp hạng → Mùa giải (đếm ngược, thành thạo, trang phục mùa, Hành trình đỉnh cao, khung) → ĐỔI GIỜ THIẾT BỊ sang mùa sau, mở lại →
//   màn "Kết thúc mùa" (thưởng theo bậc cao nhất) + reset mềm đúng bảng 08 §4 (Mốc 13).
// peak: Thái Dương lọt top 50 Hào Quang → Thiên Hà ở sảnh; Đấu Đỉnh Cao khoá lúc 10:00, mở lúc 20:00 (máy Ác mộng, cấm/chọn đầy đủ); bảng Top 100.
// shop: Cửa hàng ngọc (dấu + cạnh ô ngọc) — mua trang phục (hộp xác nhận → Nhận thưởng), mặc / cởi, đổi ngọc lấy rương, thẻ Nhận ngọc; model cao cấp không có.
// skin: trận 1v1 cùng tướng hai bên, tướng mình bật trang phục mùa → màu vật liệu = màu bên địch × màu mùa; model cao cấp không bị phủ.
// miss: Nhiệm vụ ba thẻ Ngày / Tuần / Sự kiện, nhận Rương tuần, nhận sự kiện → Gạo Hội, Phòng chờ hiện tiến độ sự kiện tích luỹ.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');

const port = +(process.argv[2] || 8099), BASE = `http://127.0.0.1:${port}`;
const ALL = ['save844', 'save1280', 'bag844', 'bag1280', 'miss844', 'miss1280', 'season844', 'season1280', 'skin', 'peak844', 'peak1280', 'shop844', 'shop1280'];
const want = process.argv.slice(3).filter((a) => ALL.includes(a));
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const VP = { 844: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 1280: { viewport: { width: 1280, height: 720 } } };
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; return cond; };
const T = (s) => s * 1000;

/** Mở trang với dữ liệu ban đầu (chỉ ghi khi máy CHƯA có khoá đó — tải lại trang không đè dữ liệu mới). */
async function openPage(browser, vp, seed = {}) {
  const ctx = await browser.newContext(VP[vp]);
  await ctx.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }, seed);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 300)); });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await home(page);
  return { ctx, page, errs };
}
const home = (page) => page.waitForFunction(() => window.__flow?.nav?.screen === 'home' && !document.getElementById('boot'), null, { timeout: T(240) });
const shot = async (page, name) => { if (!SHOTS) return; try { await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: T(60) }); } catch (_) { /* không bắt buộc */ } };
/** Mọi phần tử khớp nằm trọn trong khung nhìn. */
const inView = (page, sels) => page.evaluate((sels) => {
  const W = innerWidth, H = innerHeight, out = [];
  for (const s of sels) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5)) out.push(`${s} ${r.left | 0},${r.top | 0},${r.right | 0},${r.bottom | 0}`); }
  return out;
}, sels);
async function dataTab(page) {
  await page.click('[data-a="settings"]');
  await page.waitForSelector('.lqs-wrap [data-tab="net"]', { timeout: T(10) });
  await page.click('.lqs-wrap [data-tab="net"]'); await page.waitForTimeout(200);
}
const btn = (page, text) => page.locator('button', { hasText: text }).first();

async function save(browser, vp) {
  const label = `save${vp}`;
  console.log(`— ${label}: máy A Xuất mã lưu → máy B (trống) Nhập mã lưu`);
  const P0 = { name: 'Thử Mã Lưu', gold: 7777, stars: 23, best: 25, level: 12, exp: 40, games: 30, wins: 17, ranked: 20, rankedWins: 12, lastHero: 'nguyet_ha', feature: 'nguyet_ha',
    history: Array.from({ length: 6 }, (_, i) => ({ t: 1790000000000 + i * 1000, mode: 'ranked', win: i % 2 === 0, heroId: 'nguyet_ha', k: i, d: 1, a: 3, score: 8.5 })) };
  const A = await openPage(browser, vp, { 'la.profile': P0, 'la.prefs': { bright: 4, stick: 'follow' } });
  await dataTab(A.page);
  ok(`${label}: thẻ Dữ liệu có nút Xuất / Nhập mã lưu`, (await btn(A.page, 'Xuất mã lưu').count()) > 0 && (await btn(A.page, 'Nhập mã lưu').count()) > 0);
  await btn(A.page, 'Xuất mã lưu').click();
  await A.page.waitForSelector('.ui-dlg .sv textarea', { timeout: T(10) });
  const code = await A.page.inputValue('.ui-dlg .sv textarea');
  const outA = await inView(A.page, ['.ui-dlg .box', '.ui-dlg .btns button', '.ui-dlg textarea']);
  ok(`${label}: hộp Xuất mã lưu nằm trọn màn hình`, !outA.length, outA.slice(0, 3).join(' ; '));
  ok(`${label}: có mã lưu "LA1-…"`, /^LA1-[A-Za-z0-9_-]+$/.test(code), code.length + ' ký tự');
  await shot(A.page, label + '_export');
  await btn(A.page, 'Đóng').click();
  ok(`${label}: máy A không lỗi trang / console`, !A.errs.length, A.errs.slice(0, 3).join(' || '));
  await A.ctx.close();

  const B = await openPage(browser, vp);
  const before = await B.page.evaluate(() => JSON.parse(localStorage.getItem('la.profile') || 'null'));
  await dataTab(B.page); await btn(B.page, 'Nhập mã lưu').click();
  await B.page.waitForSelector('.ui-dlg .sv textarea', { timeout: T(10) });
  await B.page.fill('.ui-dlg .sv textarea', code.slice(0, -20) + code.slice(-9));
  await btn(B.page, 'Nhập').click(); await B.page.waitForTimeout(200);
  ok(`${label}: mã chép thiếu → báo lỗi, chưa thay hồ sơ`, /thiếu hoặc sai/.test(await B.page.textContent('.ui-dlg .sv .err')) && (await B.page.evaluate(() => JSON.parse(localStorage.getItem('la.profile') || '{}').name)) !== P0.name);
  const outB = await inView(B.page, ['.ui-dlg .box', '.ui-dlg .btns button', '.ui-dlg textarea']);
  ok(`${label}: hộp Nhập mã lưu nằm trọn màn hình`, !outB.length, outB.slice(0, 3).join(' ; '));
  await B.page.fill('.ui-dlg .sv textarea', code.replace(/(.{70})/g, '$1\n'));
  await btn(B.page, 'Nhập').click();
  await B.page.waitForSelector('.ui-dlg .sv dl', { timeout: T(10) });
  const sum = await B.page.textContent('.ui-dlg .sv dl');
  ok(`${label}: tóm tắt hồ sơ trước khi thay (tên, cấp, bậc, số trận)`, sum.includes(P0.name) && sum.includes('12') && sum.includes('30 trận'), sum.replace(/\s+/g, ' ').slice(0, 120));
  const outC = await inView(B.page, ['.ui-dlg .box', '.ui-dlg .btns button']);
  ok(`${label}: hộp xác nhận nằm trọn màn hình`, !outC.length, outC.slice(0, 3).join(' ; '));
  await shot(B.page, label + '_confirm');
  await Promise.all([B.page.waitForNavigation({ timeout: T(60) }), btn(B.page, 'Nhập và tải lại').click()]);
  await home(B.page);
  const after = await B.page.evaluate(() => ({ p: JSON.parse(localStorage.getItem('la.profile') || 'null'), prefs: JSON.parse(localStorage.getItem('la.prefs') || 'null'), bak: JSON.parse(localStorage.getItem('la.profile.bak') || 'null'), shown: document.querySelector('#home')?.textContent || '' }));
  const p = after.p || {};
  ok(`${label}: máy B nhận đúng hồ sơ (tên, Xu, sao, cấp, số trận, lịch sử)`, p.name === P0.name && p.gold === P0.gold && p.stars === P0.stars && p.level === P0.level && p.games === P0.games && p.history?.length === 6 && p.lastHero === 'nguyet_ha', JSON.stringify({ n: p.name, g: p.gold, s: p.stars, l: p.level }));
  ok(`${label}: máy B nhận đúng cài đặt`, after.prefs?.bright === 4 && after.prefs?.stick === 'follow');
  ok(`${label}: hồ sơ cũ của máy B được cất làm bản sao lưu`, !!after.bak && after.bak.name === (before?.name ?? 'Hiệp Sĩ Đèn') && after.bak.gold === (before?.gold ?? 1500), JSON.stringify({ bak: after.bak && { n: after.bak.name, g: after.bak.gold } }));
  ok(`${label}: Sảnh hiện tên mới sau khi tải lại`, after.shown.includes(P0.name));
  ok(`${label}: máy B không lỗi trang / console`, !B.errs.length, B.errs.slice(0, 3).join(' || '));
  await B.ctx.close();
}

async function bag(browser, vp) {
  const label = `bag${vp}`;
  console.log(`— ${label}: Túi đồ → rương → màn Nhận thưởng → mua rương / đổi mảnh / Thẻ Nhân Đôi Sao; nhận nhiệm vụ`);
  const day = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date(Date.now() - 4 * 3600000)), exp = Date.now() + 5 * 86400000;
  const { ctx, page, errs } = await openPage(browser, vp, { 'la.profile': { gold: 1000, manh: 40, chests: 1, bag: { giu_sao_mvp: 2 }, timed: [{ id: 'the_x2_sao', exp }], version: 2, daily: { day, ids: ['d_play2', 'd_win1', 'd_kill10'], c: { played: 3, won: 1 }, claimed: [] } } });
  ok(`${label}: nút Túi đồ có huy hiệu rương`, (await page.textContent('#home .hm-nav [data-a="bag"] .badge').catch(() => '')) === '1');
  await page.click('#home .hm-nav [data-a="bag"]'); await page.waitForSelector('.ui-panel [data-a="open"]', { timeout: T(10) }); await page.waitForTimeout(300);
  const lim = await page.textContent('.ui-panel .ui-body');
  ok(`${label}: Thẻ Nhân Đôi Sao có nhãn "Có hạn · còn N ngày"`, /Thẻ Nhân Đôi Sao ×1Có hạn · còn [45] ngày/.test(lim.replace(/\s+/g, ' ').replace(/ ?Có hạn/, 'Có hạn')), lim.match(/Thẻ Nhân Đôi Sao[^.]{0,40}/)?.[0]);
  const out1 = await inView(page, ['.ui-panel .pn-row button', '.ui-panel .ui-hr .cur']);
  ok(`${label}: Túi đồ — nút và tiền tệ nằm trọn màn hình`, !out1.length, out1.slice(0, 3).join(' ; '));
  await shot(page, label + '_bag');
  const g0 = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).gold);
  await page.click('.ui-panel [data-a="open"]');
  await page.waitForSelector('#rewardScr .tl', { timeout: T(10) }); await page.waitForTimeout(1200);
  const R = await page.evaluate(() => ({ title: document.querySelector('#rewardScr h2').textContent, n: document.querySelectorAll('#rewardScr .tl').length, items: window.__rewards.items, foot: document.querySelector('#rewardScr .go').textContent }));
  ok(`${label}: mở rương → "Nhận thưởng thành công" với ô vàng + Mảnh Tướng`, /Nhận thưởng thành công/.test(R.title) && R.n >= 2 && R.items[0].k === 'gold' && R.items[1].k === 'manh' && /Chạm vào khoảng trống/.test(R.foot), JSON.stringify(R.items));
  const out2 = await inView(page, ['#rewardScr h2', '#rewardScr .tl', '#rewardScr .go']);
  ok(`${label}: màn Nhận thưởng nằm trọn màn hình`, !out2.length, out2.slice(0, 3).join(' ; '));
  await page.click('#rewardScr .tl[data-i="1"]'); await page.waitForTimeout(200);
  const tip = await page.evaluate(() => { const t = document.querySelector('#rewardScr .tip'); if (!t) return null; const r = t.getBoundingClientRect(); return { txt: t.textContent, in: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  ok(`${label}: chạm ô → bảng tên + hiện sở hữu + mô tả, nằm trong màn`, tip && /Mảnh Tướng/.test(tip.txt) && /Hiện sở hữu: \d+/.test(tip.txt) && tip.in, tip?.txt);
  await shot(page, label + '_reward');
  await page.mouse.click(8, Math.round((await page.evaluate(() => innerHeight)) / 2)); await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({ open: !!document.getElementById('rewardScr'), p: JSON.parse(localStorage.getItem('la.profile')), hr: document.querySelector('.ui-panel .ui-hr')?.textContent }));
  ok(`${label}: chạm khoảng trống đóng màn, vàng / mảnh cộng đúng, còn 0 rương`, !after.open && after.p.gold === g0 + R.items[0].n && after.p.manh === 40 + R.items[1].n && after.p.chests === 0, JSON.stringify({ g: after.p.gold, m: after.p.manh }));
  await page.click('.ui-panel [data-a="buy"]'); await page.waitForTimeout(200);
  ok(`${label}: mua rương bằng vàng`, (await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).chests)) === 1);
  await page.click('.ui-panel [data-use="the_x2_sao"]'); await page.waitForTimeout(200);
  ok(`${label}: Dùng Thẻ Nhân Đôi Sao → bật cho trận hạng kế tiếp`, await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).x2Armed === true && /Nhân Đôi Sao đang bật/.test(document.querySelector('.ui-panel .ui-body').textContent)));
  await page.click('.ui-panel [data-t="shop"]'); await page.waitForSelector('.ui-panel [data-buy]', { timeout: T(5) });
  const m0 = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).manh);
  await page.click('.ui-panel [data-buy="bua_giu_sao"]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(5) });
  const sh = await page.evaluate(() => ({ items: window.__rewards.items, p: JSON.parse(localStorage.getItem('la.profile')) }));
  ok(`${label}: đổi mảnh lấy Bùa Giữ Sao → màn Nhận thưởng, trừ mảnh`, sh.items[0].id === 'bua_giu_sao' && sh.p.manh === m0 - 24 && sh.p.timed.some((t) => t.id === 'bua_giu_sao'));
  const out3 = await inView(page, ['.ui-panel .pn-row button']);
  ok(`${label}: Cửa hàng mảnh nằm trọn màn hình`, !out3.length, out3.slice(0, 3).join(' ; '));
  await page.evaluate(() => window.__rewards.close());
  await page.click('.ui-panel .ui-back'); await page.waitForTimeout(300);
  await page.click('#home [data-a="missions"]'); await page.waitForSelector('.ui-panel [data-m="d_play2"]', { timeout: T(10) });
  await page.click('.ui-panel [data-m="d_play2"]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(5) });
  ok(`${label}: nhận nhiệm vụ → màn Nhận thưởng`, (await page.evaluate(() => window.__rewards.items[0])).k === 'gold');
  await page.evaluate(() => window.__rewards.close());
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

const dKey = (t = Date.now()) => { const d = new Date(t - 4 * 3600000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const wKey = (t = Date.now()) => { const d = new Date(t - 4 * 3600000); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
async function missions(browser, vp) {
  const label = `miss${vp}`;
  console.log(`— ${label}: Nhiệm vụ Ngày / Tuần / Sự kiện, Rương tuần, Gạo Hội, banner Phòng chờ`);
  const W = ['w_play15', 'w_win8', 'w_kill40', 'w_rwin5'];
  const { ctx, page, errs } = await openPage(browser, vp, { 'la.profile': { version: 2, bag: {},
    daily: { day: dKey(), ids: ['d_play2', 'd_win1', 'd_kill10'], c: { played: 1 }, claimed: [] },
    weekly: { week: wKey(), c: { played: 15, won: 8, kills: 40, rankedWon: 5 }, claimed: W, bonus: false }, event: { week: wKey(), n: 3, claimed: false } } });
  ok(`${label}: huy hiệu Sứ mệnh đếm Rương tuần + sự kiện`, (await page.textContent('#home [data-a="missions"] .badge').catch(() => '')) === '2');
  await page.click('#home [data-a="missions"]'); await page.waitForSelector('.ui-panel .pn-tabs [data-t="weekly"]', { timeout: T(10) });
  const daily = await page.evaluate(() => [...document.querySelectorAll('.ui-panel [data-m]')].map((b) => b.dataset.m));
  ok(`${label}: thẻ Ngày có đúng 3 nhiệm vụ của hôm nay`, daily.join() === 'd_play2,d_win1,d_kill10', daily.join());
  const o1 = await inView(page, ['.ui-panel .pn-row button', '.ui-panel .pn-tabs button']); ok(`${label}: thẻ Ngày nằm trọn màn hình`, !o1.length, o1.slice(0, 3).join(' ; '));
  await page.click('.ui-panel [data-t="weekly"]'); await page.waitForSelector('.ui-panel [data-wb]', { timeout: T(5) });
  await shot(page, label + '_weekly');
  const hz = await page.evaluate(() => [...document.querySelectorAll('.ui-panel .pn-row')].filter((r) => r.getBoundingClientRect().right > innerWidth + 0.5).length);
  await page.evaluate(() => document.querySelector('.ui-panel [data-wb]').scrollIntoView({ block: 'nearest' })); await page.waitForTimeout(150);
  const o2 = await inView(page, ['.ui-panel [data-wb]']); ok(`${label}: thẻ Tuần không tràn ngang, cuộn tới được Rương tuần`, !hz && !o2.length, o2.slice(0, 3).join(' ; '));
  await page.click('.ui-panel [data-wb]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(5) });
  const wb = await page.evaluate(() => window.__rewards.items.map((x) => x.k + (x.id ? ':' + x.id : '')));
  ok(`${label}: Rương tuần → vàng + Bùa Giữ Sao + rương`, wb.join() === 'gold,item:bua_giu_sao,chest', wb.join());
  await page.evaluate(() => window.__rewards.close());
  await page.click('.ui-panel [data-t="event"]'); await page.waitForSelector('.ui-panel [data-ev]', { timeout: T(5) });
  await page.click('.ui-panel [data-ev]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(5) });
  const ev = await page.evaluate(() => ({ items: window.__rewards.items, gao: JSON.parse(localStorage.getItem('la.profile')).gao }));
  ok(`${label}: sự kiện tích luỹ → 8 Gạo Hội`, ev.items[0].k === 'gao' && ev.items[0].n === 8 && ev.gao === 8);
  await page.evaluate(() => window.__rewards.close());
  await page.click('.ui-panel .ui-back'); await page.waitForTimeout(300);
  await page.click('#home [data-a="normal"]'); await page.waitForFunction(() => window.__flow.nav.screen === 'room' && document.querySelector('#room .rm-ev'), null, { timeout: T(20) });
  const banner = await page.textContent('#room .rm-ev');
  ok(`${label}: Phòng chờ hiện "Tham gia sự kiện tích luỹ 3/3 · Đã nhận"`, /sự kiện tích luỹ 3\/3/.test(banner) && /Đã nhận/.test(banner), banner);
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

async function season(browser, vp) {
  const label = `season${vp}`;
  console.log(`— ${label}: Mùa giải → đổi giờ thiết bị sang mùa sau → thưởng hết mùa + reset mềm`);
  const ctx = await browser.newContext(VP[vp]);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 300)); });
  await page.clock.setFixedTime(new Date(2026, 10, 10, 15, 0)); // giữa mùa S1 2026 (mùa 1: 01/10/2026 → 29/01/2027)
  // Hải Đăng II (sao 81), cao nhất mùa Sao Mai III (sao 101), đã chọn tướng nhận trang phục mùa, 2 vòng thành thạo
  const prof = { version: 2, name: 'Thử Mùa', gold: 100, stars: 81, best: 101, season: 1, seasonPeak: 101, seasonWins: 9, skinHero: 'kiem_thuy', mastery: { kiem_thuy: 5, trang_nhi: 5, ba_nam: 2 }, bag: {} };
  await ctx.addInitScript((p) => { try { if (localStorage.getItem('la.profile') == null) localStorage.setItem('la.profile', JSON.stringify(p)); } catch (_) {} }, prof);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await home(page);
  ok(`${label}: giữa mùa — không có màn "Kết thúc mùa"`, !(await page.$('#rewardScr')));
  await page.click('#home [data-a="leader"]'); await page.waitForSelector('.ui-panel .ss-head', { timeout: T(10) }); await page.waitForTimeout(300);
  const txt = (await page.textContent('.ui-panel .ui-body')).replace(/\s+/g, ' ');
  ok(`${label}: thẻ Mùa giải: tên mùa + đếm ngược`, /Mùa S1 2026/.test(txt) && /Thời hạn mùa giải: còn 79 ngày/.test(txt), txt.slice(0, 90));
  ok(`${label}: bậc hiện tại / cao nhất mùa, 2/3 vòng thành thạo, trang phục 9/10`, /Hải Đăng II/.test(txt) && /Cao nhất mùa: Sao Mai III/.test(txt) && (await page.$$('.ss-rings i.done')).length === 2 && /thắng 9\/10/.test(txt));
  const o1 = await page.evaluate(() => [...document.querySelectorAll('.ui-panel .ss-card, .ui-panel .pn-row, .ui-panel .ss-tbl')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).length);
  ok(`${label}: thẻ Mùa giải không tràn ngang`, !o1, o1);
  await shot(page, label + '_season');
  const open = await page.evaluate(() => [...document.querySelectorAll('.ui-panel [data-jr]')].filter((b) => !b.disabled).map((b) => +b.dataset.jr));
  ok(`${label}: Hành trình đỉnh cao mở tới Sao Mai (4 quà)`, open.join() === '2,3,4,5', open.join());
  await page.click('.ui-panel [data-jr="4"]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(5) });
  ok(`${label}: nhận quà Hải Đăng → khung Hành Trình`, (await page.evaluate(() => window.__rewards.items[0])).k === 'frame');
  await page.evaluate(() => window.__rewards.close()); await page.waitForTimeout(150);
  await page.click('.ui-panel [data-fr="hanh_trinh"]'); await page.waitForTimeout(150);
  ok(`${label}: đeo khung Hành Trình`, await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).frame === 'hanh_trinh'));
  await page.click('.ui-panel .ui-back'); await page.waitForTimeout(300);
  ok(`${label}: ảnh đại diện ở sảnh có viền khung`, /box-shadow/.test(await page.getAttribute('#home .hm-me .av', 'style') || ''));
  // đổi giờ thiết bị sang mùa S2 rồi mở lại game
  await page.clock.setFixedTime(new Date(2027, 1, 2, 10, 0));
  await page.reload({ waitUntil: 'domcontentloaded' }); await home(page);
  await page.waitForSelector('#rewardScr .tl', { timeout: T(20) }); await page.waitForTimeout(900);
  const E = await page.evaluate(() => ({ title: document.querySelector('#rewardScr h2').textContent, items: window.__rewards.items }));
  ok(`${label}: mở lại sau ngày hết mùa → "Kết thúc mùa S1 2026" với thưởng của Sao Mai (1600 vàng, 15 Mảnh, Khung Sao Mai)`, /Kết thúc mùa S1 2026/.test(E.title) && E.items.some((x) => x.k === 'gold' && x.n === 1600) && E.items.some((x) => x.k === 'manh' && x.n === 15) && E.items.some((x) => x.k === 'frame' && x.id === 'sao_mai'), JSON.stringify(E.items));
  const oR = await inView(page, ['#rewardScr h2', '#rewardScr .tl', '#rewardScr .go']); ok(`${label}: màn Kết thúc mùa nằm trọn màn hình`, !oR.length, oR.slice(0, 3).join(' ; '));
  await shot(page, label + '_end');
  await page.mouse.click(8, Math.round((await page.evaluate(() => innerHeight)) / 2)); await page.waitForSelector('.ui-dlg', { timeout: T(5) });
  const dlg = (await page.textContent('.ui-dlg')).replace(/\s+/g, ' ');
  const P2 = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: reset mềm đúng bảng — Hải Đăng II → Đèn Trời III, sang mùa 2`, /Hải Đăng II → Đèn Trời III/.test(dlg) && P2.season === 2 && P2.stars === 51 && P2.seasonWins === 0 && P2.gold === 100 + 1600, dlg.slice(0, 120));
  await page.click('.ui-dlg .btns button'); await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'domcontentloaded' }); await home(page); await page.waitForTimeout(500);
  ok(`${label}: mở lại lần nữa — không thưởng hết mùa lần hai`, !(await page.$('#rewardScr')));
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

async function peak(browser, vp) {
  const label = `peak${vp}`;
  console.log(`— ${label}: Hào Quang / Thiên Hà ở sảnh, Đấu Đỉnh Cao theo giờ thiết bị, bảng Top 100`);
  const { virtualBoard } = await import(require('url').pathToFileURL(path.join(__dirname, '../src/ui/haoQuang.js')).href);
  const B = virtualBoard(1), hq = B[20].hq + 1; // hạng 21 bảng khu mùa 1 (sau trận thắng còn lên nữa)
  const ctx = await browser.newContext(VP[vp]);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 300)); });
  await page.clock.setFixedTime(new Date(2026, 10, 10, 10, 0)); // 10:00 — Đỉnh Cao chưa mở
  const prof = { version: 2, name: 'Thử Đỉnh', rolePri: 'mid', roleSec: 'jungle', stars: 149, best: 149, season: 1, seasonPeak: 149, hq, ranked: 40, rankedWins: 30, bag: {} }; // Thái Dương
  await ctx.addInitScript((p) => { try { if (localStorage.getItem('la.profile') == null) localStorage.setItem('la.profile', JSON.stringify(p)); } catch (_) {} }, prof);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await home(page);
  const ht = (await page.textContent('#home')).replace(/\s+/g, ' ');
  ok(`${label}: sảnh — huy hiệu Thiên Hà + thanh Hào Quang ${hq}`, /ĐẤU HẠNG\s*Thiên Hà/.test(ht) && /Hào Quang\s*\d+/.test(ht) && (await page.getAttribute('#home .rank-go .rkb img', 'src')).includes('rank_thien_ha'), ht.match(/Hào Quang[^A-Z]{0,20}/)?.[0]);
  ok(`${label}: huy hiệu Thiên Hà tải được`, await page.evaluate(() => new Promise((res) => { const i = document.querySelector('#home .rank-go .rkb img'); if (i.complete) res(i.naturalWidth > 0); else { i.onload = () => res(true); i.onerror = () => res(false); } })));
  const oH = await inView(page, ['#home .hm-cg']); ok(`${label}: thanh Hào Quang nằm trọn màn hình`, !oH.length, oH.join(' ; '));
  await shot(page, label + '_home');
  // —— Chọn chế độ lúc 10:00: thẻ Đỉnh Cao khoá ——
  await page.click('#home [data-a="modes"]'); await page.waitForSelector('.md-card[data-m="peak"]', { timeout: T(10) }); await page.waitForTimeout(300);
  ok(`${label}: 10:00 — thẻ Đấu Đỉnh Cao khoá, ghi giờ mở`, await page.evaluate(() => document.querySelector('.md-card[data-m="peak"]').classList.contains('lock')) && /Mở lúc 19:00 \(còn 9 giờ/.test(await page.textContent('.md-card[data-m="peak"]')));
  const oM = await inView(page, ['.md-card']); ok(`${label}: 5 thẻ chế độ nằm trọn màn hình`, !oM.length, oM.slice(0, 3).join(' ; '));
  await shot(page, label + '_modes_lock');
  await page.click('.md-card[data-m="peak"]', { force: true }); await page.waitForTimeout(300); // thẻ khoá mang aria-disabled: Playwright không tự chạm
  ok(`${label}: chạm thẻ khoá → báo giờ mở, không vào phòng`, /Mở lúc 19:00/.test(await page.textContent('.ui-toast')) && await page.evaluate(() => window.__flow.nav.screen === 'home'));
  await page.click('.ui-panel .ui-back'); await page.waitForTimeout(300);
  // —— 20:00: mở ——
  await page.clock.setSystemTime(new Date(2026, 10, 10, 20, 0)); // giờ chạy tiếp (phòng chờ đếm thời gian tìm trận)
  await page.click('#home [data-a="modes"]'); await page.waitForSelector('.md-card[data-m="peak"]', { timeout: T(10) }); await page.waitForTimeout(300);
  ok(`${label}: 20:00 — thẻ Đấu Đỉnh Cao mở`, !(await page.evaluate(() => document.querySelector('.md-card[data-m="peak"]').classList.contains('lock'))));
  await page.click('.md-card[data-m="peak"]'); await page.waitForFunction(() => window.__flow.nav.screen === 'room', null, { timeout: T(10) }); await page.waitForTimeout(300);
  const sub = (await page.textContent('#room .rm-sub')).replace(/\s+/g, ' ');
  ok(`${label}: phòng Đấu Đỉnh Cao — máy Ác mộng, cấm/chọn đầy đủ, Hào Quang ×1,5`, /Đấu Đỉnh Cao/.test(await page.textContent('#room .rm-head')) && /Máy Ác mộng/.test(sub) && /Đầy đủ/.test(sub) && /×1,5/.test(sub), sub);
  const oR = await inView(page, ['#room .rm-sub span']); ok(`${label}: dòng thông tin phòng không tràn`, !oR.length, oR.join(' ; '));
  await shot(page, label + '_room');
  await page.click('#room [data-a="go"]'); await page.waitForSelector('.found [data-a="accept"]', { timeout: T(20) });
  await page.click('.found [data-a="accept"]'); await page.waitForFunction(() => window.__flow.nav.screen === 'draft' && window.__draft, null, { timeout: T(30) });
  ok(`${label}: cấm/chọn đầy đủ (6 cấm)`, (await page.evaluate(() => window.__draft.seq)) === 'full');
  // —— đánh một trận Đỉnh Cao (cấm/chọn tua nhanh, hết giờ thì tự khoá), đối thủ đầu hàng → kết quả có Hào Quang ×1,5 ——
  await page.evaluate(() => window.__draft.speed(25));
  await page.waitForFunction(() => window.__draft?.st.phase === 'prep', null, { timeout: T(120) });
  await page.click('#draft [data-a="ready"]');
  await page.waitForFunction(() => window.__game?.world?.tick > 5, null, { timeout: T(420), polling: 500 });
  const hq0 = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).hq);
  await page.evaluate(() => window.__game.world.surrender(1));
  await page.waitForFunction(() => !!window.__post, null, { timeout: T(90) });
  const res = await page.evaluate(() => { const o = window.__post.o; return { rw: o.rewards, score: o.rows.find((x) => x.id === o.myId).score, mode: o.mode }; });
  const want = Math.round(Math.min(25, 15 + res.score - 8) * 1.5), hq1 = hq0 + want;
  ok(`${label}: thắng Đỉnh Cao điểm ${res.score.toFixed(1)} → Hào Quang +${want} (×1,5), +1 sao`, res.mode === 'peak' && res.rw.hq?.delta === want && res.rw.stars >= 1 && (await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).hq)) === hq1, JSON.stringify(res.rw.hq));
  await page.evaluate(() => window.__post.next()); await page.waitForTimeout(900);
  const chip = (await page.textContent('#pg .rw')).replace(/\s+/g, ' ');
  ok(`${label}: màn kết quả ghi "Hào Quang ${hq1} +${want} (×1,5)"`, chip.includes(`Hào Quang ${hq1}`) && chip.includes(`+${want} (×1,5)`), chip);
  const oP = await inView(page, ['#pg .rw > span']); ok(`${label}: dòng thưởng màn kết quả nằm trọn màn hình`, !oP.length, oP.join(' ; '));
  await shot(page, label + '_post');
  await page.evaluate(() => window.__post.o.onHome()); await home(page); // Về sảnh → màn Nhận thưởng (vàng, KN, khung Hào Quang vừa đạt mốc 2000)
  await page.waitForSelector('#rewardScr .tl', { timeout: T(20) }); await page.waitForTimeout(600);
  ok(`${label}: Nhận thưởng có Khung Hào Quang Chói Sáng (đã quá mốc 2000)`, (await page.evaluate(() => window.__rewards.items)).some((x) => x.k === 'frame' && x.id === 'hao_quang'));
  await page.evaluate(() => window.__rewards.close()); await page.waitForTimeout(300);
  // —— bảng Top 100 ——
  await page.click('#home [data-a="leader"]'); await page.waitForSelector('.ui-panel .pn-tabs', { timeout: T(10) });
  await page.evaluate(() => window.__board.tab('top')); await page.waitForSelector('.tb-list .me', { timeout: T(5) }); await page.waitForTimeout(300);
  const tb = await page.evaluate(() => ({ n: document.querySelectorAll('.tb-list .pn-row').length, pos: [...document.querySelectorAll('.tb-list .pn-row')].findIndex((r) => r.classList.contains('me')) + 1, txt: document.querySelector('.tb-me').textContent.replace(/\s+/g, ' '), meIn: (() => { const r = document.querySelector('.tb-list .me').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })() }));
  const pos = 1 + B.filter((x) => x.hq > hq1).length;
  ok(`${label}: Top 100 — 100 dòng, mình ở hạng ${pos}, "Đang ở Thiên Hà", dòng của mình hiện trong khung`, tb.n === 100 && tb.pos === pos && tb.txt.includes(`Hạng ${pos}`) && /Đang ở Thiên Hà/.test(tb.txt) && tb.meIn, JSON.stringify(tb));
  const oT = await page.evaluate(() => [...document.querySelectorAll('.ui-panel .tb-me, .ui-panel .tb-list .pn-row')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).length);
  ok(`${label}: bảng Top 100 không tràn ngang`, !oT, oT);
  await shot(page, label + '_top');
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

async function shop(browser, vp) {
  const label = `shop${vp}`;
  console.log(`— ${label}: Cửa hàng ngọc — trang phục, vật phẩm, nguồn ngọc`);
  const { ctx, page, errs } = await openPage(browser, vp, { 'la.profile': { version: 2, name: 'Thử Shop', gems: 200, gold: 500, feature: 'kiem_thuy', avatar: 'kiem_thuy', season: 1, bag: {} } });
  await page.click('#home [data-a="gems"]'); await page.waitForSelector('.ui-panel .sh-looks', { timeout: T(10) }); await page.waitForTimeout(300);
  const heroes = await page.evaluate(() => [...document.querySelectorAll('.sh-heroes [data-h]')].map((b) => b.dataset.h));
  ok(`${label}: thẻ Trang phục — 16 tướng (không có 4 model cao cấp), mở sẵn tướng đang đứng ở sảnh`, heroes.length === 16 && !['hoa_ren', 'thach_quy', 'bong_tre', 'nguyet_ha'].some((h) => heroes.includes(h)) && (await page.getAttribute('.sh-heroes .on', 'data-h')) === 'kiem_thuy', heroes.length);
  const o1 = await inView(page, ['.sh-look', '.ui-panel .ui-hr']); ok(`${label}: thẻ màu + số ngọc nằm trọn màn hình`, !o1.length, o1.slice(0, 3).join(' ; '));
  await shot(page, label + '_costume');
  await page.click('.sh-look [data-buy="hong_ngoc"]'); await page.waitForSelector('.ui-dlg .btns button', { timeout: T(5) });
  await page.click('.ui-dlg .btns button:last-child'); await page.waitForSelector('#rewardScr .tl', { timeout: T(10) }); await page.waitForTimeout(500);
  const it = await page.evaluate(() => window.__rewards.items[0]);
  ok(`${label}: mua Hồng Ngọc → hộp xác nhận → Nhận thưởng (trang phục)`, it.k === 'costume' && it.id === 'kiem_thuy' && it.look === 'hong_ngoc', JSON.stringify(it));
  await page.evaluate(() => window.__rewards.close()); await page.waitForTimeout(250);
  const P1 = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: trừ 60 ngọc, đang mặc (viền xanh + nút Cởi)`, P1.gems === 140 && P1.skinOn.kiem_thuy === 'hong_ngoc' && !!(await page.$('.sh-look.wear [data-wear="hong_ngoc"]')));
  await page.click('.sh-look [data-wear="hong_ngoc"]'); await page.waitForTimeout(200);
  ok(`${label}: Cởi → bỏ phủ màu`, (await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')).skinOn.kiem_thuy)) === undefined);
  await page.click('.sh-look [data-wear="hong_ngoc"]'); await page.waitForTimeout(200);
  await page.evaluate(() => window.__shop.tab('items')); await page.waitForTimeout(200);
  await page.click('[data-item="g_chest3"]'); await page.waitForSelector('#rewardScr .tl', { timeout: T(10) }); await page.waitForTimeout(400);
  ok(`${label}: thẻ Vật phẩm — 30 ngọc đổi 3 rương`, (await page.evaluate(() => window.__rewards.items)).some((x) => x.k === 'chest' && x.n === 3));
  await page.evaluate(() => window.__rewards.close()); await page.waitForTimeout(250);
  const o2 = await inView(page, ['.ui-panel .pn-row .go']); ok(`${label}: nút đổi vật phẩm nằm trọn màn hình`, !o2.length, o2.slice(0, 3).join(' ; '));
  await page.evaluate(() => window.__shop.tab('earn')); await page.waitForTimeout(200);
  ok(`${label}: thẻ Nhận ngọc ghi rõ nguồn (lên cấp, Rương tuần, mùa)`, /Lên cấp/.test(await page.textContent('.ui-panel .ui-body')) && /Rương tuần/.test(await page.textContent('.ui-panel .ui-body')));
  await shot(page, label + '_earn');
  await page.click('.ui-panel .ui-back'); await page.waitForTimeout(500);
  ok(`${label}: về sảnh — số ngọc cập nhật (110)`, /110/.test(await page.textContent('#home .cur.gem')));
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 3).join(' || '));
  await ctx.close();
}

async function skin(browser) {
  const label = 'skin';
  console.log(`— ${label}: trang phục mùa phủ màu đúng tướng của mình trong trận (model cao cấp không bị phủ)`);
  const run = async (hero) => {
    const { ctx, page, errs } = await openPage(browser, 1280, { 'la.profile': { version: 2, season: 1, bag: {}, skins: [{ hero, season: 1 }], skinOn: { [hero]: 1 }, skinHero: hero } });
    await page.evaluate((h) => { const F = window.__flow; F.nav.go('room', { mode: 'solo' }); F.S.match = { allies: [], foes: [{ name: 'Máy', stars: 0 }], seed: 3 }; F.S.pick = { heroId: h, spellId: 'chop_buoc', charmId: null, allyHeroes: [], foeHeroes: [h], dummies: false }; F.nav.start(); }, hero);
    await page.waitForFunction(() => { const g = window.__game; if (!g?.world || g.world.tick < 5) return false; const e = g.world.entities.find((x) => x.kind === 'hero' && x.team === 1); const a = g.views.get(g.player.id), b = e && g.views.get(e.id); return a?.art && b?.art; }, null, { timeout: T(420), polling: 500 });
    const c = await page.evaluate(() => {
      const g = window.__game, e = g.world.entities.find((x) => x.kind === 'hero' && x.team === 1);
      const cols = (v) => { const L = []; v.root.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m.color && m.name !== 'face') L.push([m.color.r, m.color.g, m.color.b]); }); return L; }; // mặt (mắt) cố ý giữ nguyên
      return { me: cols(g.views.get(g.player.id)), foe: cols(g.views.get(e.id)) };
    });
    await ctx.close();
    return { c, errs };
  };
  const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); // THREE.Color đọc mã hex theo sRGB rồi lưu tuyến tính
  const tint = [0xff, 0xd9, 0x8a].map((x) => lin(x / 255)); // skinLook(1): Hoàng Kim #ffd98a
  // cùng một tướng hai bên → vật liệu cùng thứ tự; vật liệu nào có màu (bên địch > 0.05) phải ra đúng màu bên địch × màu mùa
  const pairs = (c) => c.me.map((m, i) => [m, c.foe[i]]).filter(([, f]) => f && f.every((x) => x > 0.05));
  const a = await run('kiem_thuy'), A = pairs(a.c);
  const hit = A.filter(([m, f]) => m.every((x, i) => Math.abs(x / f[i] - tint[i]) < 0.01)).length;
  ok(`${label}: Kiếm Thuỷ của mình phủ màu Hoàng Kim (màu = bên địch × #ffd98a, mọi vật liệu thân)`, a.c.me.length === a.c.foe.length && A.length >= 2 && hit === A.length, `${hit}/${A.length} vật liệu`);
  const b = await run('nguyet_ha');
  ok(`${label}: Nguyệt Hạ (model cao cấp) — dữ liệu có trang phục vẫn KHÔNG phủ màu`, b.c.me.length === b.c.foe.length && b.c.me.every((m, i) => m.every((x, j) => Math.abs(x - b.c.foe[i][j]) < 1e-6)), `${b.c.me.length} vật liệu`);
  ok(`${label}: không lỗi trang / console`, !a.errs.length && !b.errs.length, [...a.errs, ...b.errs].slice(0, 3).join(' || '));
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const t0 = Date.now();
  try {
    for (const k of want.length ? want : ALL) {
      if (k === 'save844') await save(browser, 844);
      else if (k === 'save1280') await save(browser, 1280);
      else if (k === 'bag844') await bag(browser, 844);
      else if (k === 'bag1280') await bag(browser, 1280);
      else if (k === 'miss844') await missions(browser, 844);
      else if (k === 'miss1280') await missions(browser, 1280);
      else if (k === 'season844') await season(browser, 844);
      else if (k === 'season1280') await season(browser, 1280);
      else if (k === 'skin') await skin(browser);
      else if (k === 'peak844') await peak(browser, 844);
      else if (k === 'peak1280') await peak(browser, 1280);
      else if (k === 'shop844') await shop(browser, 844);
      else if (k === 'shop1280') await shop(browser, 1280);
    }
  } catch (e) { ok('chạy hết kịch bản', false, (e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  await browser.close();
  console.log(`(${((Date.now() - t0) / 1000) | 0} s)`);
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
