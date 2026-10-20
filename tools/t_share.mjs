// Phần trăm ở thẻ "Chi tiết" màn kết quả (ui/score.js): chia 100 bằng phần dư lớn nhất, tổng mỗi đội đúng 100, 1v1 tính trên cả trận,
// điểm trận / MVP không đổi. Dùng: node tools/t_share.mjs
import { scoreMatch, pct100 } from '../src/ui/score.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const hero = (id, team, o = {}) => ({ id, team, heroId: 'hoa_ren', level: 10, items: [], kills: 0, deaths: 0, assists: 0, goldEarned: 5000, dmgHero: 0, dmgTaken: 0, ...o });

ok('pct100 [1,1,1] → [34,33,33] (bằng nhau: người đứng trước)', pct100([1, 1, 1]).join() === '34,33,33' && pct100([1, 1, 1]).join() === '34,33,33');
ok('pct100 tổng 0 → toàn 0; số âm coi như 0', pct100([0, 0]).join() === '0,0' && pct100([-5, 5]).join() === '0,100');
ok('pct100 [2,1] → [67,33]', pct100([2, 1]).join() === '67,33');

const T0 = [[1000, 3000, 2, 1], [2000, 2000, 1, 4], [3000, 1000, 3, 2], [4000, 500, 0, 5], [0, 0, 0, 0]];
const heroes = [...T0.map(([d, t, k, a], i) => hero(i + 1, 0, { dmgHero: d, dmgTaken: t, kills: k, assists: a })),
  ...[0, 1, 2, 3, 4].map((i) => hero(10 + i, 1, { dmgHero: 777 * (i + 1), dmgTaken: 333 * (5 - i), kills: i % 2, deaths: 1 }))];
const rows = scoreMatch(heroes, 0);
const t0 = rows.filter((r) => r.team === 0), t1 = rows.filter((r) => r.team === 1);
ok('5v5: % sát thương đội Xanh [10,20,30,40,0]', t0.map((r) => r.pct.dmg).join() === '10,20,30,40,0', t0.map((r) => r.pct.dmg).join());
for (const [n, g] of [['Xanh', t0], ['Đỏ', t1]]) {
  ok(`5v5 đội ${n}: % sát thương và % gánh chịu cộng đúng 100`, g.reduce((a, r) => a + r.pct.dmg, 0) === 100 && g.reduce((a, r) => a + r.pct.taken, 0) === 100);
  ok(`5v5 đội ${n}: tham gia = round(100·min(1,(H+HT)/hạ của đội)) và khớp phần "Tham gia" của điểm`, g.every((r) => { const kills = g.reduce((a, x) => a + x.k, 0); const kp = kills ? Math.round(100 * Math.min(1, (r.k + r.a) / kills)) : 0; return r.pct.kp === kp && Math.abs(r.parts.join - (3 * kp) / 100) < 0.02; }));
}
const z = scoreMatch([hero(1, 0), hero(2, 0), hero(3, 1, { kills: 1, dmgHero: 10 })], 1);
ok('đội không gây sát thương / không hạ ai: 0%', z.filter((r) => r.team === 0).every((r) => r.pct.dmg === 0 && r.pct.kp === 0 && r.pct.taken === 0));
const solo = scoreMatch([hero(1, 0, { dmgHero: 300, dmgTaken: 120, kills: 3 }), hero(2, 1, { dmgHero: 100, dmgTaken: 360, kills: 1 })], 0);
ok('1v1: chia trên cả trận [75,25], tỉ lệ hạ = hạ / tổng hạ', solo[0].pct.dmg === 75 && solo[1].pct.dmg === 25 && solo[0].pct.taken === 25 && solo[0].pct.kp === 75 && solo[1].pct.kp === 25, JSON.stringify(solo.map((r) => r.pct)));
// điểm / MVP không đổi so với bản trước khi có phần trăm (số chụp lại từ công thức cũ)
const SNAP = { 1: 9.4, 2: 10.9, 3: 11.2, 4: 11, 5: 4.5 }; // chụp từ ui/score.js trước khi thêm phần trăm
ok('điểm trận đội Xanh không đổi', t0.every((r) => r.score === SNAP[r.id]), t0.map((r) => r.score).join());
ok('MVP không đổi', rows.find((r) => r.mvp === 'gold')?.id === 3 && rows.filter((r) => r.mvp).length === 2);
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
