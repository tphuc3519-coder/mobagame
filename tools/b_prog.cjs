// Kiểm thử trình duyệt GĐ4 (tiến trình tài khoản + lưu dữ liệu), Playwright + Chromium phần mềm. Cần máy chủ tĩnh ở thư mục repo:
//   python3 -m http.server <cổng> --bind 127.0.0.1
//   node tools/b_prog.cjs <cổng> [kịch bản…]     kịch bản: save844 save1280 (mặc định: tất cả)
// save: máy A (hồ sơ có sẵn) → Cài đặt → Dữ liệu → Xuất mã lưu; máy B (trình duyệt trống) → Nhập mã lưu: mã sai bị báo lỗi, mã đúng hiện tóm tắt
//   → Nhập và tải lại → hồ sơ + cài đặt y như máy A, hồ sơ cũ của B được cất làm bản sao lưu; hộp thoại nằm trọn màn hình.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');

const port = +(process.argv[2] || 8099), BASE = `http://127.0.0.1:${port}`;
const ALL = ['save844', 'save1280'];
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

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const t0 = Date.now();
  try {
    for (const k of want.length ? want : ALL) {
      if (k === 'save844') await save(browser, 844);
      else if (k === 'save1280') await save(browser, 1280);
    }
  } catch (e) { ok('chạy hết kịch bản', false, (e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  await browser.close();
  console.log(`(${((Date.now() - t0) / 1000) | 0} s)`);
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
