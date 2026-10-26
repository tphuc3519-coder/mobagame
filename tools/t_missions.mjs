// Nhiệm vụ ngày / tuần / sự kiện tích luỹ (GĐ4e, ui/profile.js + data/missions.js — không DOM): khoá ngày làm mới 04:00, tuần thứ Hai 04:00,
// 3 nhiệm vụ ngày bốc theo seed của ngày, tiến độ cộng sau trận (luyện tập không tính), nhận thưởng một lần, Rương tuần, sự kiện → Gạo Hội.
// Dùng: node tools/t_missions.mjs
import { DAILY_POOL, DAILY_N, WEEKLY, WEEK_BONUS, EVENT } from '../src/data/missions.js';
import { HEROES, ALPHA } from '../src/data/heroes/index.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let v = 0; const fresh = async (prof) => { store.clear(); if (prof) store.set('la.profile', JSON.stringify(prof)); return import(`../src/ui/profile.js?m=${++v}`); };
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

let M = await fresh(), p = M.profile();
// —— 1. khoá ngày / tuần ——
ok('ngày làm mới 04:00: 03:59 vẫn là hôm qua, 04:00 là hôm nay', M.dayKey(at(2026, 10, 27, 3, 59)) === '2026-10-26' && M.dayKey(at(2026, 10, 27, 4, 0)) === '2026-10-27');
ok('tuần làm mới thứ Hai 04:00 (26/10/2026 là thứ Hai)', M.weekKey(at(2026, 10, 26, 3, 59)) === '2026-10-19' && M.weekKey(at(2026, 10, 26, 4, 0)) === '2026-10-26' && M.weekKey(at(2026, 11, 1, 23, 0)) === '2026-10-26');
const ids = M.dailyIds('2026-10-27');
ok(`3 nhiệm vụ ngày, khác nhau, có trong bảng`, ids.length === DAILY_N && new Set(ids).size === DAILY_N && ids.every((id) => DAILY_POOL.some((m) => m.id === id)), ids.join(','));
ok('cùng ngày bốc ra cùng 3 nhiệm vụ', JSON.stringify(M.dailyIds('2026-10-27')) === JSON.stringify(ids));
const sets = new Set(), wins = [];
for (let d = 1; d <= 60; d++) { const k = M.dayKey(at(2026, 11, 1, 12) + (d - 1) * 86400000), L = M.dailyIds(k); sets.add(L.slice().sort().join()); wins.push(L.filter((id) => id.startsWith('d_win_')).length); }
ok('60 ngày: bộ nhiệm vụ đổi theo ngày, mỗi ngày tối đa 1 nhiệm vụ "thắng với vai"', sets.size >= 40 && wins.every((n) => n <= 1), `${sets.size} bộ khác nhau`);

// —— 2. tiến độ + nhận thưởng ——
const T0 = at(2026, 10, 27, 12);
M = await fresh({ daily: { day: M.dayKey(T0), ids: ['d_play2', 'd_win1', 'd_win_marksman'], c: {}, claimed: [] } }); p = M.profile();
const mm = ALPHA.find((id) => HEROES[id].roles.includes('marksman')), other = ALPHA.find((id) => !HEROES[id].roles.includes('marksman'));
let L = M.missionList('daily', T0);
ok('bảng ngày đọc đúng 3 nhiệm vụ đã lưu, chưa xong', L.map((m) => m.id).join() === 'd_play2,d_win1,d_win_marksman' && L.every((m) => !m.done && m.v === 0));
ok('chưa xong: nhận không được', M.claimMission('daily', 'd_play2', T0) === null);
M.applyResult({ mode: 'training', win: true, heroId: mm, kills: 9, now: T0 });
ok('luyện tập không tính tiến độ', M.missionList('daily', T0).every((m) => m.v === 0) && M.eventState(T0).n === 0);
M.applyResult({ mode: 'normal', win: false, heroId: mm, kills: 3, assists: 4, now: T0 });
M.applyResult({ mode: 'ranked', win: true, heroId: other, kills: 5, assists: 2, towers: 2, mvp: 'gold', now: T0 });
L = M.missionList('daily', T0);
ok('2 trận: "Chơi 2 trận" + "Thắng 1 trận" xong; thắng bằng tướng không phải Xạ thủ không tính', L[0].done && L[1].done && !L[2].done, JSON.stringify(L.map((m) => [m.id, m.v])));
M.applyResult({ mode: 'solo', win: true, heroId: mm, now: T0 });
ok(`thắng với ${HEROES[mm].name} (Xạ thủ) → "Thắng 1 trận với Xạ thủ" xong`, M.missionList('daily', T0)[2].done);
ok('bộ đếm tuần: trận, thắng, hạ gục, thắng hạng', p.weekly.c.played === 3 && p.weekly.c.won === 2 && p.weekly.c.kills === 8 && p.weekly.c.rankedWon === 1 && p.weekly.c.towers === 2 && p.weekly.c.mvp === 1, JSON.stringify(p.weekly.c));
const g0 = p.gold; let got = M.claimMission('daily', 'd_play2', T0);
ok('nhận thưởng: cộng vàng, trả danh sách quà cho màn Nhận thưởng', got?.[0]?.k === 'gold' && p.gold === g0 + DAILY_POOL.find((m) => m.id === 'd_play2').gold);
ok('nhận lần hai: không được', M.claimMission('daily', 'd_play2', T0) === null);
ok('nhiệm vụ không thuộc bảng hôm nay: không nhận được', M.claimMission('daily', 'd_kill10', T0) === null);
ok('huy hiệu sảnh đếm đúng phần thưởng chờ nhận (2 ngày + 1 sự kiện)', M.missionsReady(T0) === 3, M.missionsReady(T0));

// —— 3. sự kiện tích luỹ ——
const e = M.eventState(T0);
ok(`sự kiện: ${EVENT.goal} trận (trừ luyện tập) → xong`, e.done && e.n === EVENT.goal);
const gao0 = p.gao; got = M.claimEvent(T0);
ok(`nhận sự kiện: +${EVENT.gao} Gạo Hội`, got?.[0]?.k === 'gao' && p.gao === gao0 + EVENT.gao && M.claimEvent(T0) === null);

// —— 4. tuần + Rương tuần ——
for (let i = 0; i < 15; i++) M.applyResult({ mode: 'ranked', win: true, heroId: other, kills: 3, now: T0 });
const W = M.missionList('weekly', T0);
ok('4 nhiệm vụ tuần xong sau 18 trận', W.length === WEEKLY.length && W.every((m) => m.done), JSON.stringify(W.map((m) => [m.id, m.v])));
ok('chưa nhận đủ 4: Rương tuần chưa mở', !M.weekBonusReady(T0) && M.claimWeekBonus(T0) === null);
const all = W.map((m) => M.claimMission('weekly', m.id, T0)).flat();
ok('nhận 4 nhiệm vụ tuần: có Bùa Giữ Sao + 1 rương', all.some((r) => r.k === 'item' && r.id === 'bua_giu_sao') && all.some((r) => r.k === 'chest'));
const ch0 = p.chests; got = M.claimWeekBonus(T0);
ok('Rương tuần: vàng + ngọc + Bùa Giữ Sao + 1 rương, một lần', got?.length === 4 && p.chests === ch0 + WEEK_BONUS.chest && M.claimWeekBonus(T0) === null && M.itemCount('bua_giu_sao', T0) === 2);

// —— 5. làm mới ——
const T1 = at(2026, 10, 28, 4, 1);
L = M.missionList('daily', T1);
ok('sang ngày mới (04:01 hôm sau): bảng ngày mới, tiến độ về 0', p.daily.day === '2026-10-28' && L.every((m) => m.v === 0 && !m.claimed) && L.map((m) => m.id).join() === M.dailyIds('2026-10-28').join());
ok('cùng tuần: nhiệm vụ tuần + sự kiện giữ nguyên', M.missionList('weekly', T1).every((m) => m.claimed) && M.eventState(T1).claimed);
const T2 = at(2026, 11, 2, 4, 1);
ok('thứ Hai tuần sau 04:01: tuần + sự kiện làm mới', M.missionList('weekly', T2).every((m) => m.v === 0 && !m.claimed) && M.eventState(T2).n === 0 && !p.weekly.bonus);

// —— 6. dữ liệu hỏng / bản cũ ——
M = await fresh({ daily: { day: '2026-10-26', played: 2, won: 1, kills: 4, claimed: ['play1'] }, weekly: 'x', event: { n: 'a' } }); p = M.profile();
L = M.missionList('daily', T0);
ok('nhiệm vụ ngày kiểu cũ (trước GĐ4) / hỏng: dựng lại bảng mới, không lỗi', L.length === DAILY_N && Array.isArray(p.weekly.claimed) && p.event.n === 0);
M.saveProfile();
const M2 = await import(`../src/ui/profile.js?m=${++v}`);
ok('tắt / mở lại: tiến độ nhiệm vụ còn nguyên', JSON.stringify(M2.missionList('daily', T0)) === JSON.stringify(M.missionList('daily', T0)));

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
