// Kiểm thử luồng ngoài trận trên trình duyệt thật (Playwright + Chromium phần mềm): Sảnh → Đấu hạng → Phòng chờ (chọn vị trí) → Tìm trận →
// Chấp nhận → Cấm/chọn → Chuẩn bị → Đội hình → Tải → Trận (đúng vị trí, đúng tướng, không tướng bị cấm) → đầu hàng → Kết quả; Đấu thường
// (vị trí + chọn ẩn); hộp thoại chọn vị trí khi bấm Bắt đầu lúc chưa chọn. Cần máy chủ tĩnh đang chạy ở thư mục repo:
//   python3 -m http.server <cổng> --bind 127.0.0.1
//   node tools/b_flow.cjs <cổng> [kịch bản…]      kịch bản: ranked844 ranked1280 normal844 normal1280 role844 loadout844 loadout1280 (mặc định: tất cả)
//   SHOTS=<thư mục> lưu ảnh chụp từng màn. In ĐẠT / LỖI từng mục, dòng cuối "Tất cả đạt"; mã thoát 1 khi có lỗi.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');

const port = +(process.argv[2] || 8099), BASE = `http://127.0.0.1:${port}`;
const ALL = ['ranked844', 'ranked1280', 'normal844', 'normal1280', 'role844', 'loadout844', 'loadout1280'];
const want = process.argv.slice(3).filter((a) => ALL.includes(a));
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const VP = { 844: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 1280: { viewport: { width: 1280, height: 720 } } };
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; return cond; };
const T = (s) => s * 1000;

async function openPage(browser, vp, prof, query = '') {
  const ctx = await browser.newContext(VP[vp]);
  await ctx.addInitScript((p) => { try { localStorage.setItem('la.profile', JSON.stringify(p)); } catch (_) {} }, prof);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text().slice(0, 300)); });
  await page.goto(`${BASE}/${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__flow?.nav?.screen === 'home', null, { timeout: T(240) });
  return { ctx, page, errs };
}
const screen = (page, name, s = 60) => page.waitForFunction((n) => window.__flow?.nav?.screen === n, name, { timeout: T(s) });
const shot = async (page, name) => { // ảnh chụp không bắt buộc (trận 3D trên WebGL phần mềm chụp rất chậm)
  if (!SHOTS) return; try { await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: T(120) }); } catch (e) { console.log(`  (bỏ ảnh ${name}: ${e.message.split('\n')[0]})`); }
};
/** Phần tử nằm trọn trong khung nhìn; `.dr-mid` không chồng lên hai cột đội. */
const layout = (page, sels) => page.evaluate((sels) => {
  const W = innerWidth, H = innerHeight, out = [];
  for (const s of sels) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5)) out.push(`${s} ${r.left | 0},${r.top | 0},${r.right | 0},${r.bottom | 0}`); }
  const mid = document.querySelector('.dr-mid')?.getBoundingClientRect(), hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const cross = mid ? [...document.querySelectorAll('.dr-col')].filter((c) => hit(mid, c.getBoundingClientRect())).length : 0;
  return { out, cross, sw: document.documentElement.scrollWidth, W };
}, sels);

async function toMatch(page, label) {
  await screen(page, 'lineup', 60); await shot(page, label + '_lineup');
  await screen(page, 'loading', 30); await shot(page, label + '_loading');
  await page.waitForFunction(() => window.__game?.world && window.__game.world.tick > 2, null, { timeout: T(420) });
  await page.waitForTimeout(1500); await shot(page, label + '_match');
  return page.evaluate(() => {
    const g = window.__game, P = window.__flow.S.pick, heroes = g.world.entities.filter((e) => e.kind === 'hero'), me = g.player;
    const t0 = heroes.filter((h) => h.team === 0), t1 = heroes.filter((h) => h.team === 1);
    return { role: me.role, heroId: me.heroId, spell: me.spell?.id, items: (me.items || []).filter(Boolean), pick: { role: P.role, heroId: P.heroId, bans: P.bans || [], spell: P.spellId },
      roles0: t0.map((h) => h.role).sort(), roles1: t1.map((h) => h.role).sort(), ids0: t0.map((h) => h.heroId), ids1: t1.map((h) => h.heroId), players: heroes.filter((h) => h.isPlayer).length };
  });
}
async function endMatch(page, label) {
  await page.evaluate(() => window.__game.world.surrender(1));
  await page.waitForFunction(() => !!window.__flow?.result, null, { timeout: T(90) });
  await page.waitForTimeout(800); await shot(page, label + '_result');
}
const ROLES5 = JSON.stringify(['jungle', 'mid', 'river', 'support', 'temple']);

async function ranked(browser, vp, stars) {
  const label = `ranked${vp}`, full = stars >= 66;
  console.log(`— ${label}: Đấu hạng (${full ? 'Hải Đăng → đầy đủ 6 cấm' : 'Đèn Dầu → cơ bản 4 cấm'}), vị trí Rừng / phụ Giữa, ghế 0`);
  const { ctx, page, errs } = await openPage(browser, vp, { stars, best: stars, rolePri: 'jungle', roleSec: 'mid' }, '?seat=0');
  await page.click('[data-a="ranked"]'); await screen(page, 'room');
  ok(`${label}: phòng chờ có nút vị trí "Rừng"`, (await page.textContent('#room .rl-chip'))?.includes('Rừng'));
  ok(`${label}: phòng chờ ghi luật cấm/chọn`, (await page.textContent('#room .rm-sub'))?.includes(full ? '6 cấm' : '4 cấm'));
  await shot(page, label + '_room');
  await page.click('#room [data-a="go"]');
  await page.waitForSelector('.found [data-a="accept"]', { timeout: T(20) });
  ok(`${label}: hộp "Đã tìm thấy trận" ghi vị trí`, await page.isVisible('.found .rl-got'), await page.textContent('.found .rl-got'));
  await shot(page, label + '_found');
  await page.click('.found [data-a="accept"]'); await screen(page, 'draft', 30);
  const seq = await page.evaluate(() => window.__draft.seq);
  ok(`${label}: thứ tự cấm/chọn ${full ? 'full' : 'lite'}`, seq === (full ? 'full' : 'lite'), seq);
  await page.evaluate(() => window.__draft.speed(25));
  let checked = false, myBans = 0, myPick = false, guard = 0;
  while (guard++ < 2000) {
    const s = await page.evaluate(() => ({ phase: window.__draft?.st.phase, turn: window.__draft?.turn }));
    if (!s.phase || s.phase !== 'draft') break;
    if (s.turn) {
      await page.evaluate(() => window.__draft.speed(1));
      if (!checked && s.turn === 'pick') {
        checked = true;
        const L = await layout(page, ['.dr-row', '.dr-go', '.bn', '.dr-tabs', '.dr-col', '.dr-grid', '.dr-top']);
        ok(`${label}: cấm/chọn nằm trọn trong màn hình`, !L.out.length, L.out.slice(0, 3).join(' ; '));
        ok(`${label}: lưới tướng không đè hai cột đội`, L.cross === 0);
        ok(`${label}: không cuộn ngang`, L.sw <= L.W, `${L.sw} / ${L.W}`);
        await shot(page, label + '_draft');
      }
      const sel = s.turn === 'ban' ? '#draft .hc:not(.ban):not(.ally):not(.mine):not(.foe):not(.hide)' : '#draft .hc.rec:not(.ban):not(.ally):not(.mine):not(.foe):not(.hide)';
      const cards = await page.$$(sel); let card = s.turn === 'ban' ? cards[cards.length - 1] : cards[0]; // cấm: tướng cuối lưới (ít hợp vị trí mình nhất)
      if (!card) { await page.click('#draft [data-f="all"]'); card = await page.$('#draft .hc:not(.ban):not(.ally):not(.mine):not(.foe):not(.hide)'); }
      await card.click();
      await page.click(s.turn === 'ban' ? '#draft [data-a="ban"]' : '#draft [data-a="lock"]');
      if (s.turn === 'ban') myBans++; else myPick = true;
      await page.evaluate(() => window.__draft.speed(25));
    }
    await page.waitForTimeout(120);
  }
  const D = await page.evaluate(() => ({ bans: window.__draft.D.bans, picks: window.__draft.D.picks, phase: window.__draft.st.phase }));
  const nb = full ? 3 : 2;
  ok(`${label}: mỗi bên ${nb} lượt cấm, mình cấm ${myBans} lần, tự khoá tướng`, D.bans.every((b) => b.length === nb) && myBans >= 1 && myPick, JSON.stringify(D.bans));
  ok(`${label}: đủ 5 + 5 tướng, không trùng, không tướng bị cấm`, D.picks.flat().every(Boolean) && new Set(D.picks.flat()).size === 10 && !D.picks.flat().some((h) => D.bans.flat().includes(h)));
  await page.waitForFunction(() => window.__draft?.st.phase === 'prep', null, { timeout: T(10) });
  const L2 = await layout(page, ['.dr-prep button', '.dr-row']); ok(`${label}: màn chuẩn bị nằm trọn trong màn hình`, !L2.out.length, L2.out.slice(0, 3).join(' ; '));
  await page.waitForTimeout(1200); await shot(page, label + '_prep');
  await page.click('#draft [data-a="ready"]');
  const m = await toMatch(page, label);
  ok(`${label}: vào trận đúng vị trí đã chia`, m.role === m.pick.role && !!m.role, `${m.role} / ${m.pick.role}`);
  ok(`${label}: vào trận đúng tướng đã chọn`, m.heroId === m.pick.heroId, m.heroId);
  ok(`${label}: hai đội đủ 5 vị trí, đúng 1 người chơi`, JSON.stringify(m.roles0) === ROLES5 && JSON.stringify(m.roles1) === ROLES5 && m.players === 1);
  ok(`${label}: tướng bị cấm không có trong trận, hai đội không trùng tướng`, !m.pick.bans.flat().some((h) => m.ids0.includes(h) || m.ids1.includes(h)) && !m.ids0.some((h) => m.ids1.includes(h)));
  if (m.role === 'jungle') ok(`${label}: đi rừng mang Trừng Trị + Nanh Thú Rừng`, m.spell === 'thu_hoach' && m.items.includes('nanh_thu_rung'), `${m.spell} ${m.items.join(',')}`);
  await endMatch(page, label);
  // GĐ4f: Kết quả → Nhận thưởng → Phòng chờ (Mốc 12)
  const rw = await page.evaluate(() => window.__flow.result.rewards);
  await page.waitForFunction(() => !!window.__post, null, { timeout: T(30) });
  await page.evaluate(() => window.__post.o.onAgain());
  await page.waitForSelector('#rewardScr .tl', { timeout: T(30) }); await page.waitForTimeout(900); await shot(page, label + '_rewards');
  const R = await page.evaluate(() => ({ screen: window.__flow.nav.screen, items: window.__rewards.items }));
  const gotGold = R.items.find((x) => x.k === 'gold')?.n, gotExp = R.items.find((x) => x.k === 'exp')?.n;
  ok(`${label}: rời màn kết quả → màn Nhận thưởng (vàng + kinh nghiệm của trận) trên Phòng chờ`, R.screen === 'room' && gotGold === rw.gold && gotExp === rw.exp, JSON.stringify(R.items));
  const L3 = await layout(page, ['#rewardScr h2', '#rewardScr .tl', '#rewardScr .go']); ok(`${label}: màn Nhận thưởng nằm trọn trong màn hình`, !L3.out.length, L3.out.slice(0, 3).join(' ; '));
  await page.mouse.click(6, 6); await page.waitForTimeout(250);
  ok(`${label}: chạm khoảng trống → về Phòng chờ bấm được`, !(await page.$('#rewardScr')) && !!(await page.$('#room [data-a="go"]')));
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}

async function normal(browser, vp) {
  const label = `normal${vp}`;
  console.log(`— ${label}: Đấu thường (chọn ẩn), vị trí Trợ thủ`);
  const { ctx, page, errs } = await openPage(browser, vp, { stars: 10, rolePri: 'support', roleSec: null });
  await page.click('[data-a="normal"]'); await screen(page, 'room');
  ok(`${label}: phòng chờ có nút vị trí "Trợ thủ"`, (await page.textContent('#room .rl-chip'))?.includes('Trợ thủ'));
  await page.click('#room [data-a="go"]');
  await page.waitForSelector('.found [data-a="accept"]', { timeout: T(20) });
  await page.click('.found [data-a="accept"]'); await screen(page, 'pick', 30);
  await page.waitForTimeout(800);
  ok(`${label}: dòng của mình ghi vị trí Trợ thủ`, (await page.textContent('#pick .tm.me .rl'))?.trim() === 'Trợ thủ');
  ok(`${label}: tướng đầu lưới có nhãn Đề cử`, !!(await page.$('#pick .pk-grid .hc:first-child em.rec')));
  ok(`${label}: đồng đội có vị trí`, (await page.$$('#pick .tm:not(.me) .rl')).length === 4);
  const L = await layout(page, ['#pick .tm', '#pick .pk-go']); ok(`${label}: chọn tướng nằm trọn trong màn hình`, !L.out.length && L.sw <= L.W, L.out.slice(0, 3).join(' ; '));
  await shot(page, label + '_pick');
  await page.evaluate(() => window.__pick.lock());
  const m = await toMatch(page, label);
  ok(`${label}: vào trận ở vị trí Trợ thủ`, m.role === 'support' && m.pick.role === 'support', m.role);
  ok(`${label}: đội mình đủ 5 vị trí`, JSON.stringify(m.roles0) === ROLES5 && JSON.stringify(m.roles1) === ROLES5);
  await endMatch(page, label);
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}

async function roleDialog(browser, vp) {
  const label = `role${vp}`;
  console.log(`— ${label}: chưa chọn vị trí → bấm Bắt đầu mở hộp chọn vị trí`);
  const { ctx, page, errs } = await openPage(browser, vp, { stars: 10, rolePri: null, roleSec: null });
  await page.click('[data-a="normal"]'); await screen(page, 'room');
  ok(`${label}: nút vị trí nhắc "Chọn vị trí"`, (await page.textContent('#room .rl-chip'))?.includes('Chọn vị trí'));
  await page.click('#room [data-a="go"]');
  await page.waitForSelector('.rl-dlg', { timeout: T(5) });
  const box = await page.evaluate(() => { const r = document.querySelector('.ui-dlg .box').getBoundingClientRect(); return { b: r.bottom, t: r.top, H: innerHeight, sh: document.querySelector('.ui-dlg .box').scrollHeight, ch: document.querySelector('.ui-dlg .box').clientHeight }; });
  ok(`${label}: hộp chọn vị trí nằm trọn trong màn hình, không phải cuộn`, box.t >= 0 && box.b <= box.H && box.sh <= box.ch + 4, JSON.stringify(box)); // +3 px: hoa văn góc .fr::before (inset −3px) của mọi hộp thoại
  await page.click('.rl-pick[data-k="pri"] [data-r="mid"]'); await page.click('.rl-pick[data-k="sec"] [data-r="river"]');
  ok(`${label}: vị trí phụ trùng vị trí chính bị khoá`, await page.isDisabled('.rl-pick[data-k="sec"] [data-r="mid"]'));
  await shot(page, label + '_dialog');
  await page.click('.ui-dlg .btns .btn-gold');
  await page.waitForSelector('#room .mm', { timeout: T(5) });
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: xác nhận → lưu vị trí, bắt đầu tìm trận`, prof.rolePri === 'mid' && prof.roleSec === 'river' && (await page.textContent('#room .rl-chip')).includes('Giữa'));
  await shot(page, label + '_search');
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}

async function loadout(browser, vp) {
  const label = `loadout${vp}`;
  console.log(`— ${label}: Sảnh → Bảng Bùa (sửa trang mẫu → bản sao, phù hiệu) → chọn tướng dùng trang + phù hiệu → vào trận đúng bộ`);
  const { ctx, page, errs } = await openPage(browser, vp, { stars: 10, rolePri: 'mid', roleSec: null, lastHero: 'nguyet_ha' });
  await page.click('.hm-nav [data-a="loadout"]');
  await page.waitForSelector('#loadout #loCharm .lo-slot', { timeout: T(10) }); await page.waitForTimeout(400);
  const L = await layout(page, ['#loadout .lo-slot', '#loadout .lo-pg', '#loadout .lo-act button', '#loadout .lo-ch', '#loadout .lo-tabs button']);
  ok(`${label}: bảng bùa nằm trọn trong màn hình, không cuộn ngang`, !L.out.length && L.sw <= L.W, L.out.slice(0, 3).join(' ; '));
  ok(`${label}: mở đúng trang của tướng đang dùng (Pháp sư)`, await page.evaluate(() => window.__loadout.st.charm.pageId === 'mage'));
  await shot(page, label + '_charm');
  await page.click('#loCharm .lo-slot[data-c="red"][data-i="0"]');
  await page.click('#loCharm .lo-ch[data-ch="r_gio"]');
  let prof = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: sửa trang mẫu → tự tạo bản sao "Trang 1", gắn đúng ô`, prof.charmPages?.length === 1 && prof.charmPages[0].red[0] === 'r_gio' && prof.charmPages[0].red[1] === 'r_lua', JSON.stringify(prof.charmPages?.[0]?.red));
  await page.click('#loCharm [data-pc="blue"]'); await page.click('#loCharm .lo-x5[data-fill="b_chan"]');
  await page.click('#loCharm .lo-slot[data-c="gray"][data-i="2"]'); await page.click('#loCharm .lo-slot[data-c="gray"][data-i="2"]'); // chạm lại ô đang chọn: gỡ
  prof = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: ×5 lấp cả hàng xanh, chạm lại ô gỡ bùa`, prof.charmPages[0].blue.every((c) => c === 'b_chan') && prof.charmPages[0].gray[2] === null);
  ok(`${label}: cấp trang hiện 14/15`, (await page.textContent('#loCharm .lo-lv')).includes('14/15'));
  await page.click('#loTabEmblem'); await page.waitForSelector('#loEmblem .lo-key', { timeout: T(5) });
  const L2 = await layout(page, ['#loEmblem .lo-key', '#loEmblem .lo-min', '#loEmblem [data-a="emreset"]']);
  ok(`${label}: thẻ phù hiệu nằm trọn trong màn hình`, !L2.out.length && L2.sw <= L2.W, L2.out.slice(0, 3).join(' ; '));
  await shot(page, label + '_emblem');
  await page.click('#loEmblem .lo-key[data-k="den_ho_menh"]'); await page.click('#loEmblem .lo-min[data-m="m_buoc_nhe"]');
  prof = await page.evaluate(() => JSON.parse(localStorage.getItem('la.profile')));
  ok(`${label}: phù hiệu lưu theo tướng (Nguyệt Hạ: Đèn Hộ Mệnh + Bước Nhẹ)`, prof.emblems?.nguyet_ha?.key === 'den_ho_menh' && prof.emblems.nguyet_ha.minors[1] === 'm_buoc_nhe', JSON.stringify(prof.emblems));
  await page.click('#loadout .ui-back'); await page.waitForTimeout(300);
  await page.click('[data-a="normal"]'); await screen(page, 'room');
  await page.click('#room [data-a="go"]'); await page.waitForSelector('.found [data-a="accept"]', { timeout: T(20) });
  await page.click('.found [data-a="accept"]'); await screen(page, 'pick', 30); await page.waitForTimeout(600);
  await page.click('#pick .hc[data-id="nguyet_ha"]'); await page.waitForTimeout(200);
  ok(`${label}: nút phù hiệu ghi phù hiệu của tướng đang xem`, (await page.textContent('#pick .pk-pill[data-a="emblem"]')).includes('Đèn Hộ Mệnh'));
  await page.click('#pick .pk-pill[data-a="charm"]'); await page.waitForSelector('.lo-pick [data-pg="u1"]', { timeout: T(5) });
  ok(`${label}: hộp chọn trang có cả trang riêng`, (await page.$$('.lo-pick [data-pg]')).length === 6);
  await shot(page, label + '_pagepick');
  await page.click('.lo-pick [data-pg="u1"]'); await page.waitForTimeout(200);
  ok(`${label}: chọn trang riêng → nút bùa đổi theo`, (await page.textContent('#pick .pk-pill[data-a="charm"]')).includes('Trang 1'));
  const L3 = await layout(page, ['#pick .pk-pill', '#pick .pk-spell', '#pick .pk-go']);
  ok(`${label}: hàng phép / bùa / phù hiệu nằm trọn trong màn hình`, !L3.out.length && L3.sw <= L3.W, L3.out.slice(0, 3).join(' ; '));
  await page.evaluate(() => window.__pick.lock());
  await screen(page, 'lineup', 60); await screen(page, 'loading', 30);
  await page.waitForFunction(() => window.__game?.world && window.__game.world.tick > 2, null, { timeout: T(420) });
  const m = await page.evaluate(() => { const e = window.__game.player; return { hero: e.heroId, blue: e.charm?.blue, red0: e.charm?.red?.[0], em: e.emblem, name: e.charm?.name }; });
  ok(`${label}: vào trận mang đúng trang bùa + phù hiệu đã chỉnh`, m.hero === 'nguyet_ha' && m.red0 === 'r_gio' && m.blue?.every((c) => c === 'b_chan') && m.em?.key === 'den_ho_menh' && m.em.minors[1] === 'm_buoc_nhe', JSON.stringify(m));
  await endMatch(page, label);
  ok(`${label}: không lỗi trang / console`, !errs.length, errs.slice(0, 4).join(' || '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const run = want.length ? want : ALL, t0 = Date.now();
  for (const k of run) {
    try {
      if (k === 'ranked844') await ranked(browser, 844, 0);
      else if (k === 'ranked1280') await ranked(browser, 1280, 70);
      else if (k === 'normal844') await normal(browser, 844);
      else if (k === 'normal1280') await normal(browser, 1280);
      else if (k === 'role844') await roleDialog(browser, 844);
      else if (k === 'loadout844') await loadout(browser, 844);
      else if (k === 'loadout1280') await loadout(browser, 1280);
    } catch (e) { ok(`${k}: chạy hết kịch bản`, false, (e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  }
  await browser.close();
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
  console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
  process.exit(fail ? 1 : 0);
})();
