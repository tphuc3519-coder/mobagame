// Mùa giải (GĐ4b, ui/season.js + ui/profile.js + data/seasons.js — không DOM): mùa 120 ngày theo đồng hồ thiết bị, hết mùa thưởng theo bậc
// cao nhất + reset mềm đúng bảng 08 §4, mùa bỏ lỡ reset thêm, mùa hết giữa trận, 3 vòng thành thạo, trang phục mùa (không áp cho 4 model
// cao cấp), Hành trình đỉnh cao. Dùng: node tools/t_season.mjs
import { SEASON, seasonAt, seasonByN, SOFT_RESET, SEASON_END, MASTERY, SEASON_SKIN, SKIN_LOCKED, skinLook } from '../src/data/seasons.js';
import { rankOf, starsAt } from '../src/data/ranks.js';
import { skinTint } from '../src/ui/season.js';
import { ALPHA } from '../src/data/heroes/index.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let v = 0; const fresh = async (prof) => { store.clear(); if (prof) store.set('la.profile', JSON.stringify({ version: 2, bag: {}, ...prof })); return import(`../src/ui/profile.js?s=${++v}`); };
const DAY = 86400000, S1 = seasonByN(1), S2 = seasonByN(2), inS = (n, d = 3) => seasonByN(n).start + d * DAY;

// —— 1. lịch mùa ——
ok(`mùa dài ${SEASON.days} ngày, tên "S{n} {năm}"`, S2.start - S1.start === SEASON.days * DAY && /^S1 \d{4}$/.test(S1.name) && seasonAt(S1.end - 1).n === 1 && seasonAt(S1.end).n === 2);
ok('trước ngày mùa 1 vẫn tính là mùa 1', seasonAt(S1.start - 30 * DAY).n === 1);

// —— 2. bảng reset mềm (08 §4) ——
const want = [['Đèn Dầu II', 'Đèn Dầu II'], ['Đèn Lồng I', 'Đèn Lồng I'], ['Đèn Kéo Quân III', 'Đèn Kéo Quân III'], ['Đèn Trời II', 'Đèn Kéo Quân I'], ['Hải Đăng I', 'Đèn Trời III'], ['Sao Mai IV', 'Hải Đăng V'], ['Nguyệt Quang', 'Sao Mai V'], ['Thái Dương', 'Sao Mai V']];
const stOf = (name) => { for (let s = 0; s < 400; s++) if (rankOf(s).name === name) return s; return -1; };
for (const [from, to] of want) {
  const M = await fresh({ season: 1, stars: stOf(from), seasonPeak: stOf(from) });
  const r = M.seasonCheck(inS(2));
  ok(`hết mùa ${from} → ${to}`, r && r.from.name === from && rankOf(M.profile().stars).name === to, r ? `${r.from.name} → ${rankOf(M.profile().stars).name}` : 'không sang mùa');
}

// —— 3. thưởng hết mùa theo bậc CAO NHẤT, reset theo bậc CUỐI ——
let M = await fresh({ season: 1, stars: stOf('Hải Đăng II'), seasonPeak: stOf('Sao Mai III'), seasonWins: 7, mastery: { kiem_thuy: 4 }, journey: [2, 3], gold: 100 });
let p = M.profile();
let r = M.seasonCheck(inS(2));
const R5 = SEASON_END[5];
ok('bậc cao nhất Sao Mai → thưởng mùa của Sao Mai (vàng + mảnh + khung)', r.peak.short === 'Sao Mai' && p.gold === 100 + R5.gold && p.manh === R5.manh && p.frames.some((f) => f.id === 'sao_mai' && f.season === 1), JSON.stringify(r.list));
ok('reset theo bậc cuối mùa (Hải Đăng II → Đèn Trời III), không theo bậc cao nhất', rankOf(p.stars).name === 'Đèn Trời III');
ok('mùa mới: số mùa, trận thắng, thành thạo, hành trình về 0', p.season === 2 && p.seasonWins === 0 && !Object.keys(p.mastery).length && !p.journey.length && p.seasonPeak === p.stars);
ok('tên mùa vừa hết + danh sách quà cho màn Nhận thưởng', r.name === S1.name && r.list.some((x) => x.k === 'frame'));
ok('mở lại cùng mùa: không thưởng lần hai', M.seasonCheck(inS(2, 50)) === null);

M = await fresh({ season: 1, stars: stOf('Thái Dương') + 4, seasonPeak: stOf('Thái Dương') + 4, gold: 0 }); p = M.profile();
r = M.seasonCheck(inS(4));
ok('bỏ lỡ 2 mùa: thưởng MỘT lần (mùa vừa chơi), reset 3 lần (Thái Dương → Sao Mai V → Hải Đăng V → Đèn Trời III)', r.skipped === 2 && p.gold === SEASON_END[7].gold && rankOf(p.stars).name === 'Đèn Trời III' && p.season === 4, rankOf(p.stars).name);

M = await fresh({ stars: stOf('Đèn Trời I') }); p = M.profile();
ok('hồ sơ chưa gắn mùa: gắn mùa hiện tại, không thưởng, không reset', M.seasonCheck(inS(1)) === null && p.season === 1 && rankOf(p.stars).name === 'Đèn Trời I');

// —— 4. mùa hết giữa trận ——
M = await fresh({ season: 1, stars: stOf('Hải Đăng III'), seasonPeak: stOf('Hải Đăng III'), streak: 0, courage: 0 }); p = M.profile();
const res = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 7, now: inS(2) });
ok('trận xong sau khi hết mùa: thưởng + reset trước, trận này tính vào mùa mới', res.seasonEnd?.n === 1 && res.rankBefore.name === 'Đèn Trời III' && res.rankAfter.name === 'Đèn Trời III' && p.stars === starsAt(3, 'III') + 1 && p.seasonWins === 1, `${res.rankBefore.name} → ${res.rankAfter.name}`);

// —— 5. 3 vòng thành thạo ——
M = await fresh({ season: 1, stars: 30 }); p = M.profile();
const H3 = ['kiem_thuy', 'trang_nhi', 'ba_nam'], T = inS(1);
let unlock = [];
for (const h of H3) for (let i = 0; i < MASTERY.wins; i++) { p.streak = 0; unlock = unlock.concat(M.applyResult({ mode: 'ranked', win: true, heroId: h, score: 6, now: T }).unlocks); }
ok(`3 tướng × ${MASTERY.wins} trận thắng hạng → khung Thành Thạo (một lần)`, unlock.filter((x) => x.k === 'frame' && x.id === MASTERY.frame).length === 1 && p.frames.filter((f) => f.id === MASTERY.frame).length === 1, JSON.stringify(unlock));
M.applyResult({ mode: 'normal', win: true, heroId: 'kiem_thuy', score: 6, now: T });
ok('trận thường không tính thành thạo / trận thắng mùa', p.mastery.kiem_thuy === MASTERY.wins && p.seasonWins === 15);

// —— 6. trang phục mùa ——
M = await fresh({ season: 1, stars: 30 }); p = M.profile();
ok('không chọn được 4 model cao cấp', SKIN_LOCKED.every((h) => M.chooseSkin(h) === false) && p.skinHero === null);
const sk = ALPHA.find((h) => !SKIN_LOCKED.includes(h));
ok(`chọn ${sk} trước mùa`, M.chooseSkin(sk) === true && p.skinHero === sk);
let got = [];
for (let i = 0; i < SEASON_SKIN.wins; i++) { p.streak = 0; got = got.concat(M.applyResult({ mode: 'ranked', win: i % 2 === 0 || i > 4, heroId: 'kiem_thuy', score: 6, now: T }).unlocks); }
for (let i = 0; i < 3; i++) { p.streak = 0; got = got.concat(M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 6, now: T }).unlocks); }
ok(`${SEASON_SKIN.wins} trận hạng thắng → trang phục mùa, bật sẵn, một lần`, got.filter((x) => x.k === 'skin').length === 1 && p.skins.length === 1 && p.skinOn[sk] === 1, `thắng ${p.seasonWins}`);
ok('màu trang phục đúng màu của mùa', skinTint(p, sk) === skinLook(1).tint);
ok('đã nhận: không đổi tướng được nữa', M.chooseSkin(ALPHA.find((h) => h !== sk && !SKIN_LOCKED.includes(h))) === false);
M.setSkinOn(sk, 1);
ok('tắt trang phục → không phủ màu; bật lại được', skinTint(p, sk) === null && M.setSkinOn(sk, 1) && skinTint(p, sk) === skinLook(1).tint);
p.skins.push({ hero: 'hoa_ren', season: 1 }); p.skinOn.hoa_ren = 1;
ok('model cao cấp: dù dữ liệu có trang phục cũng không phủ màu', skinTint(p, 'hoa_ren') === null);
M = await fresh({ season: 1, stars: 30, seasonWins: 12 }); p = M.profile();
const late = M.chooseSkin(sk);
ok('đủ trận thắng rồi mới chọn tướng → nhận ngay', Array.isArray(late) && late[0].k === 'skin' && p.skins.length === 1);

// —— 7. Hành trình đỉnh cao ——
M = await fresh({ season: 1, stars: stOf('Đèn Trời IV'), seasonPeak: stOf('Đèn Trời IV'), gold: 0 }); p = M.profile();
const J = M.journey();
ok('Đèn Trời: mở quà Đèn Kéo Quân + Đèn Trời, chưa mở Hải Đăng', J.filter((j) => j.open).map((j) => j.tier).join() === '2,3');
const g = M.claimJourney(3);
ok('nhận quà Đèn Trời: 500 vàng, một lần', g?.[0]?.n === 500 && p.gold === 500 && M.claimJourney(3) === null && M.journey().find((j) => j.tier === 3).got);
ok('quà chưa mở: không nhận được', M.claimJourney(4) === null);

// —— 8. khung ảnh + lưu ——
ok('không đeo được khung chưa có', !M.equipFrame('hai_dang'));
p.frames.push({ id: 'hai_dang', season: 1 });
ok('đeo khung đã có', M.equipFrame('hai_dang') && p.frame === 'hai_dang');
M.saveProfile();
const M2 = await import(`../src/ui/profile.js?s=${++v}`), p2 = M2.profile();
ok('tắt / mở lại: mùa, khung, hành trình còn nguyên', p2.season === 1 && p2.frame === 'hai_dang' && p2.journey.includes(3));
ok('mọi bậc có dòng thưởng hết mùa + dòng reset', SEASON_END.length === 8 && SOFT_RESET.length === 8);

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
