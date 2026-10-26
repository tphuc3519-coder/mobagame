// Điểm Hào Quang, bảng Top 100 ảo, Thiên Hà, Đấu Đỉnh Cao (GĐ4c, ui/haoQuang.js + ui/profile.js — không DOM): công thức điểm (±25, Đỉnh Cao thắng
// ×1,5), bắt đầu 1000 khi vào Nguyệt Quang, mốc 2000 → danh hiệu + khung (một lần mỗi mùa), bảng 100 người ảo cố định theo seed mùa
// (quanh 2800, σ 300), Thiên Hà = Thái Dương top 50, hết mùa thì Hào Quang về lại, giờ mở Đấu Đỉnh Cao 19:00–24:00.
// Dùng: node tools/t_haoquang.mjs
import { HQ, BOARD } from '../src/data/haoQuang.js';
import { hqDelta, virtualBoard, peakState, boardView } from '../src/ui/haoQuang.js';
import { rankOf, starsAt } from '../src/data/ranks.js';
import { seasonByN, SEASON_END } from '../src/data/seasons.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let v = 0; const fresh = async (prof) => { store.clear(); if (prof) store.set('la.profile', JSON.stringify({ version: 2, bag: {}, season: 1, ...prof })); return import(`../src/ui/profile.js?h=${++v}`); };
const DAY = 86400000, T = seasonByN(1).start + 3 * DAY, NQ = starsAt(6), SUN = starsAt(7);

// —— 1. công thức ——
const D = [[true, 8, 15], [true, 16, 23], [true, 2, 9], [false, 8, -15], [false, 16, -11], [false, 0, -19], [true, 40, 25], [false, -30, -25]];
ok('thắng +15 + (điểm − 8), thua −15 + (điểm − 8)/2, giới hạn ±25', D.every(([w, s, want]) => hqDelta(w, s) === want), D.map(([w, s]) => hqDelta(w, s)).join(','));
ok('Đấu Đỉnh Cao: thắng ×1,5 (điểm 8 → 23, điểm 16 → 35), thua không nhân', hqDelta(true, 8, true) === 23 && hqDelta(true, 16, true) === 35 && hqDelta(false, 8, true) === -15);

// —— 2. bắt đầu 1000 khi vào Nguyệt Quang ——
let M = await fresh({ stars: NQ - 1, seasonPeak: NQ - 1, streak: 0 }), p = M.profile();
ok('dưới Nguyệt Quang: chưa có Hào Quang', p.hq === null);
let r = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 12, now: T });
ok(`thắng lên Nguyệt Quang → Hào Quang bắt đầu ${HQ.start} (trận này không cộng)`, rankOf(p.stars).tier === 6 && p.hq === HQ.start && r.hq.start && r.hq.delta === 0, JSON.stringify(r.hq));
p.streak = 0; r = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 10, now: T });
ok('trận kế ở Nguyệt Quang: thắng điểm 10 → +17', r.hq.delta === 17 && p.hq === HQ.start + 17);
r = M.applyResult({ mode: 'ranked', win: false, heroId: 'kiem_thuy', score: 4, now: T });
ok('thua điểm 4 → −17', r.hq.delta === -17 && p.hq === HQ.start);
r = M.applyResult({ mode: 'normal', win: true, heroId: 'kiem_thuy', score: 10, now: T });
ok('đấu thường không đổi Hào Quang', r.hq === null && p.hq === HQ.start);

M = await fresh({ stars: NQ + 12 }); p = M.profile();
ok('hồ sơ đã ở Nguyệt Quang từ trước GĐ4c: mở ra có sẵn 1000', p.hq === HQ.start);
M = await fresh({ stars: starsAt(5, 'I'), hq: 1300 }); p = M.profile();
r = M.applyResult({ mode: 'ranked', win: false, heroId: 'kiem_thuy', score: 8, now: T });
ok('rớt xuống Sao Mai: Hào Quang đứng yên', p.hq === 1300 && r.hq.delta === 0);

// —— 3. mốc 2000 ——
M = await fresh({ stars: NQ + 5, hq: 1990, streak: 0 }); p = M.profile();
r = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 8, now: T });
ok(`chạm ${HQ.title}: danh hiệu + ${HQ.frame} (mùa 1) vào màn Nhận thưởng`, p.hq === 2005 && p.hqTitle === 1 && r.unlocks.some((x) => x.k === 'frame' && x.id === HQ.frame) && p.frames.some((f) => f.id === HQ.frame && f.season === 1), JSON.stringify(r.unlocks));
p.streak = 0; r = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 8, now: T });
ok('lần sau: không thưởng lại', !r.unlocks.some((x) => x.k === 'frame') && p.frames.filter((f) => f.id === HQ.frame).length === 1);

// —— 4. Đấu Đỉnh Cao ——
M = await fresh({ stars: NQ + 5, hq: 1500, streak: 0, ranked: 3, rankedWins: 1 }); p = M.profile();
const s0 = p.stars;
r = M.applyResult({ mode: 'peak', win: true, heroId: 'kiem_thuy', score: 8, now: T });
ok('Đỉnh Cao tính sao như đấu hạng (+1), Hào Quang ×1,5 (+23)', p.stars === s0 + 1 && r.hq.delta === 23 && p.hq === 1523 && p.ranked === 4 && p.rankedWins === 2 && p.history[0].mode === 'peak');
ok('Đỉnh Cao tính vào trận thắng hạng của mùa / nhiệm vụ', p.seasonWins === 1 && p.weekly.c.rankedWon === 1);

// —— 5. bảng Top 100 ảo ——
const B1 = virtualBoard(1), B2 = virtualBoard(2), hs = B1.map((x) => x.hq), mean = hs.reduce((a, b) => a + b) / hs.length, sd = Math.sqrt(hs.reduce((a, b) => a + (b - mean) ** 2, 0) / hs.length);
ok(`100 người, điểm giảm dần, tên không trùng`, B1.length === BOARD.n && hs.every((h, i) => !i || hs[i - 1] >= h) && new Set(B1.map((x) => x.name)).size === BOARD.n);
ok(`phân bố quanh ${BOARD.mean} (σ ${BOARD.sd})`, Math.abs(mean - BOARD.mean) < 90 && Math.abs(sd - BOARD.sd) < 70, `trung bình ${mean.toFixed(0)}, σ ${sd.toFixed(0)}`);
const again = await import(`../src/ui/haoQuang.js?b=${++v}`);
ok('cùng mùa → cùng bảng (mở lại game), mùa khác → bảng khác', JSON.stringify(again.virtualBoard(1)) === JSON.stringify(B1) && JSON.stringify(B2) !== JSON.stringify(B1));

// —— 6. Thiên Hà ——
M = await fresh({ stars: SUN + 3, hq: B1[BOARD.galaxy - 1].hq }); p = M.profile();
let V = boardView(p, { name: 'Tôi', avatar: 'kiem_thuy' });
ok(`Thái Dương, điểm bằng người thứ ${BOARD.galaxy} → hạng ≤ ${BOARD.galaxy}, Thiên Hà`, V.pos <= BOARD.galaxy && M.rankNow().id === 'thien_ha' && M.rankNow().name === 'Thiên Hà', `hạng ${V.pos}`);
ok('bảng có mình đúng chỗ, vẫn 100 dòng, điểm người thứ 100 lùi một bậc', V.rows.length === BOARD.n && V.rows[V.pos - 1].me && V.cut === B1[BOARD.n - 2].hq);
p.hq = B1[BOARD.galaxy].hq - 1; V = boardView(p);
ok('ngoài top 50 → vẫn là Thái Dương', V.pos > BOARD.galaxy && M.rankNow().id === 'thai_duong', `hạng ${V.pos}`);
p.stars = NQ + 10; p.hq = B1[0].hq + 50;
ok('Nguyệt Quang đứng đầu bảng: chưa phải Thiên Hà (cần Thái Dương)', boardView(p).pos === 1 && M.rankNow().id === 'nguyet_quang');
p.hq = 900;
ok('ngoài top 100: không có mình trên bảng, mốc = người thứ 100', boardView(p).rows.every((x) => !x.me) && boardView(p).cut === B1[BOARD.n - 1].hq);

// —— 7. vào Thiên Hà → thưởng hết mùa riêng, mùa mới Hào Quang về lại ——
M = await fresh({ stars: SUN + 3, seasonPeak: SUN + 3, hq: B1[10].hq - 30, streak: 0, gold: 0 }); p = M.profile();
r = M.applyResult({ mode: 'ranked', win: true, heroId: 'kiem_thuy', score: 8, now: T });
ok('thắng lọt top 50 → Thiên Hà, ghi nhận cho thưởng hết mùa', r.hq.galaxy && p.galaxyPeak && r.rankAfter.id === 'thien_ha');
const g0 = p.gold, end = M.seasonCheck(seasonByN(2).start + DAY);
ok('hết mùa: thưởng Thiên Hà (vàng + ngọc + Khung Thiên Hà), reset như Thái Dương → Sao Mai V', end.peak.name === 'Thiên Hà' && p.gold === g0 + SEASON_END[8].gold && p.frames.some((f) => f.id === 'thien_ha') && rankOf(p.stars).name === 'Sao Mai V', `${end.peak.name} → ${rankOf(p.stars).name}`);
ok('mùa mới: Hào Quang về lại (vào Nguyệt Quang thì bắt đầu 1000), cờ Thiên Hà xoá', p.hq === null && !p.galaxyPeak && p.hqBest === 0);
M.saveProfile();
const M2 = await import(`../src/ui/profile.js?h=${++v}`);
ok('tắt / mở lại: Hào Quang + cờ còn nguyên', M2.profile().hq === null && M2.profile().season === 2);

// —— 8. Mốc 13: chơi 10 trận hạng / Đỉnh Cao, tắt / mở lại → mọi số liệu còn nguyên ——
M = await fresh({ stars: NQ - 3, seasonPeak: NQ - 3, rolePri: 'mid' }); p = M.profile();
for (let i = 0; i < 10; i++) M.applyResult({ mode: i % 3 ? 'ranked' : 'peak', win: i % 4 !== 1, heroId: ['kiem_thuy', 'trang_nhi', 'ba_nam'][i % 3], kills: i, deaths: 2, assists: 3, score: 5 + i, mvp: i === 4 ? 'gold' : null, towers: 1, now: T + i * 60000 });
const snap = JSON.stringify(p);
const M3 = await import(`../src/ui/profile.js?h=${++v}`);
ok('10 trận (hạng + Đỉnh Cao) → tắt / mở lại: hồ sơ y nguyên (sao, Hào Quang, lịch sử, nhiệm vụ, mùa, rương)', JSON.stringify(M3.profile()) === snap && p.ranked === 10 && p.history.length === 10 && p.hq != null, `${p.stars} sao · Hào Quang ${p.hq} · ${p.chests} rương`);

// —— 9. giờ mở Đấu Đỉnh Cao ——
const at = (h, mi = 0) => new Date(2026, 9, 26, h, mi).getTime();
const nq = { stars: NQ }, low = { stars: starsAt(5, 'I') };
ok('dưới Nguyệt Quang: khoá kể cả trong giờ', !peakState(low, at(20)).open && /Nguyệt Quang/.test(peakState(low, at(20)).reason));
ok('18:59 khoá ("còn 1 phút"), 19:00 mở, 23:59 mở, 00:00 khoá ("còn 19 giờ")', !peakState(nq, at(18, 59)).open && /còn 1 phút/.test(peakState(nq, at(18, 59)).reason) && peakState(nq, at(19)).open && peakState(nq, at(23, 59)).open && !peakState(nq, at(0)).open && /còn 19 giờ/.test(peakState(nq, at(0)).reason), peakState(nq, at(0)).reason);

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
