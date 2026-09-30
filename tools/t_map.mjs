// Kiểm thử luật công trình và tìm đường. Dùng: node tools/t_map.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { buildNavGrid } from '../src/sim/navgrid.js';
import { findPath } from '../src/sim/pathfind.js';
import { dealDamage } from '../src/sim/damage.js';

let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? 'ĐẠT ' : 'LỖI ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const mk = () => { const w = createWorld({ map: DUEL, seed: 3, waves: false }); let t = 0; return { w, step: (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); w.events.length = 0; } }; };
const S = (w, team, sid) => w.entities.find((e) => e.structure && e.team === team && e.sid === sid);

{ // bất tử theo thứ tự ngoài → trong → nhà chính
  const { w, step } = mk(); step(2);
  const outer = S(w, 1, 'outer'), inner = S(w, 1, 'inner'), core = S(w, 1, 'core'), hero = w.spawnHero('hoa_ren', 0, { x: 4000, y: 1200 });
  ok('trụ trong bất tử khi trụ ngoài còn', dealDamage(w, hero, inner, 500, 'true') === 0);
  ok('nhà chính bất tử khi trụ trong còn', dealDamage(w, hero, core, 500, 'true') === 0);
  w.spawnEntity({ kind: 'minion', minionType: 'sword', team: 0, data: { name: 'x', base: { maxHp: 450, maxMana: 0, atk: 1, ap: 0, armor: 0, mr: 0, atkSpeed: 1, moveSpeed: 0, range: 1 }, perLevel: {}, basicAttack: {}, skills: {} }, radius: 30, pos: { x: 4400, y: 1200 } });
  const before = outer.hp; dealDamage(w, hero, outer, 100, 'true');
  ok('trụ ngoài nhận sát thương (có lính phe mình gần)', before - outer.hp === 100, String(before - outer.hp));
  outer.hp = 1; dealDamage(w, hero, outer, 50, 'true'); step(2);
  ok('trụ ngoài vỡ', !outer.alive);
  step(2); ok('trụ trong hết bất tử sau khi trụ ngoài vỡ', !inner.invulnerable);
}
{ // chống phá lén: không lính gần thì nhận 40%
  const { w, step } = mk(); step(2);
  const outer = S(w, 1, 'outer'), hero = w.spawnHero('hoa_ren', 0, { x: 4000, y: 1200 });
  const before = outer.hp; dealDamage(w, hero, outer, 100, 'true');
  ok('chống phá lén nhận 40%', Math.abs(before - outer.hp - 40) < 0.01, String(before - outer.hp));
}
{ // ưu tiên bắn: lính trước tướng; tướng đánh tướng phe mình thì đổi mục tiêu
  const { w, step } = mk();
  const outer = S(w, 1, 'outer'), enemy = w.spawnHero('hoa_ren', 0, { x: 3700, y: 1200 }), ally = w.spawnHero('thach_quy', 1, { x: 3900, y: 1250 });
  const minion = w.spawnEntity({ kind: 'minion', minionType: 'sword', team: 0, data: { name: 'x', base: { maxHp: 450, maxMana: 0, atk: 1, ap: 0, armor: 0, mr: 0, atkSpeed: 1, moveSpeed: 0, range: 1 }, perLevel: {}, basicAttack: {}, skills: {} }, radius: 30, pos: { x: 3800, y: 1200 } });
  step(2);
  ok('trụ bắn lính trước tướng', outer.streakTarget === minion.id, String(outer.streakTarget));
  dealDamage(w, enemy, ally, 10, 'true'); outer.attackReady = 0; step(2);
  ok('tướng đánh tướng phe trụ: trụ đổi mục tiêu sang tướng', outer.streakTarget === enemy.id, String(outer.streakTarget));
  const hp0 = enemy.hp; outer.attackReady = 0; step(40); const first = hp0 - enemy.hp;
  ok('trụ gây sát thương lên tướng', first > 0, first.toFixed(1));
}
{ // Suối Đèn bắn địch, hồi đồng minh
  const { w, step } = mk(); step(1);
  const foe = w.spawnHero('hoa_ren', 1, { x: 400, y: 1200 }); const me = w.spawnHero('hoa_ren', 0, { x: 300, y: 1200 }); me.hp = 100;
  step(40); ok('Suối Đèn giết địch trong tầm', !foe.alive);
  step(30); ok('Suối Đèn hồi đồng minh', me.hp > 200, me.hp.toFixed(0));
}
{ // thắng khi phá nhà chính
  const { w, step } = mk(); step(1);
  const core = S(w, 1, 'core'); S(w, 1, 'inner').alive = false; step(1);
  const hero = w.spawnHero('hoa_ren', 0, { x: 4600, y: 1200 });
  core.hp = 1; dealDamage(w, hero, core, 999, 'true'); step(2);
  ok('phá nhà chính thì thắng', w.over && w.over.winner === 0);
}
{ // tìm đường: đi vòng qua ô bị chặn
  const grid = buildNavGrid(DUEL);
  const p = findPath(grid, { x: 200, y: 1200 }, { x: 5000, y: 1200 });
  ok('đường thẳng trên đường lớn', p && p.length === 1);
  grid.blocked.fill(0); const cx = Math.floor(2800 / 80); for (let cy = 12; cy <= 17; cy++) grid.blocked[cy * grid.cols + cx] = 1;
  const q = findPath(grid, { x: 2000, y: 1200 }, { x: 3600, y: 1240 });
  ok('A* đi vòng vật cản', q && q.length >= 2, q ? JSON.stringify(q.map((a) => [a.x | 0, a.y | 0])) : 'null');
}
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
