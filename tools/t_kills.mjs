// Kiểm thử luật tính mạng hạ / hỗ trợ, chiến công đầu, hạ liên tiếp, chuỗi hạ gục, Hồi Máu bị cắt, cục máu sau trụ:
//   node tools/t_kills.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA } from '../src/data/maps.js';
import { RESTORE } from '../src/data/spells.js';
import { dealDamage, KILL_WINDOW } from '../src/sim/damage.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const setup = () => {
  const w = createWorld({ map: ARENA, seed: 3, waves: false });
  let t = 0; const step = (n = 1) => { const evs = []; for (let i = 0; i < n; i++) { w.update(++t); evs.push(...w.drainEvents()); } return evs; };
  const at = (x, y) => ({ x, y });
  const tower = w.entities.find((e) => e.kind === 'tower' && e.team === 0);
  const blue = [0, 1, 2].map((i) => w.spawnHero('hoa_ren', 0, at(9000 + i * 60, 9000)));
  const red = [0, 1, 2, 3, 4].map((i) => w.spawnHero('thach_quy', 1, at(9000 + i * 60, 9300)));
  step(1);
  return { w, step, tower, blue, red };
};
const deathOf = (evs, id) => evs.find((e) => e.type === 'death' && e.id === id);
const finish = (w, src, tgt) => dealDamage(w, src, tgt, tgt.hp + 99999, 'true');

{ // 1) trụ kết liễu sau khi tướng địch đánh: tính cho người đánh cuối, người đánh trước là hỗ trợ
  const { w, step, tower, blue: [a, c], red: [b] } = setup();
  dealDamage(w, a, b, 100, 'true'); step(30);
  dealDamage(w, c, b, 100, 'true'); step(30);
  const ga = a.goldEarned, gc = c.goldEarned;
  finish(w, tower, b); const ev = deathOf(step(1), b.id);
  ok('vàng: người hạ 200, người hỗ trợ chia 50%', Math.round(c.goldEarned - gc) === 200 && Math.round(a.goldEarned - ga) === 100, `${Math.round(c.goldEarned - gc)} / ${Math.round(a.goldEarned - ga)}`);
  ok('trụ kết liễu → mạng cho tướng địch đánh cuối', ev?.killer === c.id && c.kills === 1 && a.kills === 0, JSON.stringify(ev));
  ok('người đánh trước được hỗ trợ', a.assists === 1 && c.assists === 0 && ev?.assists?.length === 1 && ev.assists[0] === a.id);
  ok('ghi nguồn kết liễu thật (trụ)', ev?.by === tower.id);
  ok('chiến công đầu', ev?.first === true && w.firstBlood?.killer === c.id);
}
{ // 2) đòn cuối của tướng: người đó được mạng dù người khác gây nhiều sát thương hơn
  const { w, step, blue: [a, c], red: [b] } = setup();
  dealDamage(w, c, b, 900, 'true'); step(10);
  finish(w, a, b); const ev = deathOf(step(1), b.id);
  ok('đòn cuối của tướng → mạng cho người đó, còn lại hỗ trợ', ev?.killer === a.id && a.kills === 1 && c.assists === 1);
}
{ // 3) đánh quá KILL_WINDOW giây trước rồi trụ kết liễu: không ai được mạng
  const { w, step, tower, blue: [a], red: [b] } = setup();
  dealDamage(w, a, b, 100, 'true'); step(30 * (KILL_WINDOW + 1));
  finish(w, tower, b); const ev = deathOf(step(1), b.id);
  ok('quá 10 giây → bị trụ hạ, không ai được mạng / hỗ trợ', ev && ev.killer === tower.id && !ev.multi && a.kills === 0 && a.assists === 0 && !w.firstBlood, JSON.stringify(ev));
}
{ // 4) hạ liên tiếp và chuỗi hạ gục
  const { w, step, blue: [a], red } = setup();
  const evs = [];
  for (const [i, gap] of [[0, 30], [1, 30 * 9], [2, 30 * 9], [3, 30 * 9], [4, 1]]) { finish(w, a, red[i]); evs.push(deathOf(step(gap), red[i].id)); }
  ok('Double → Penta Kill (cách nhau ≤ 10 giây)', evs.map((e) => e?.multi).join() === '1,2,3,4,5', evs.map((e) => e?.multi).join());
  ok('chuỗi hạ gục tăng 1..5', evs.map((e) => e?.streak).join() === '1,2,3,4,5');
  ok('chỉ mạng đầu là chiến công đầu', evs.filter((e) => e?.first).length === 1 && evs[0].first);
  step(30 * 11); for (const r of red) { r.alive = true; r.hp = r.stats.maxHp; }
  finish(w, a, red[0]); const late = deathOf(step(1), red[0].id);
  ok('quá 10 giây: đếm hạ liên tiếp lại từ 1, chuỗi vẫn giữ', late?.multi === 1 && late?.streak === 6, JSON.stringify(late));
  finish(w, red[1], a); const sd = deathOf(step(1), a.id);
  ok('hạ tướng đang có chuỗi ≥ 3 → chặn đứng', sd?.shutdown === 6 && sd.killer === red[1].id && a.killStreak === 0, JSON.stringify(sd));
}
{ // 5) Hồi Máu: tướng địch đánh trúng thì mất hiệu ứng; lính / trụ đánh thì không
  const { w, step, tower, blue: [a], red: [b] } = setup();
  ok('Hồi Máu hồi chiêu 60 giây', RESTORE.cooldown === 60);
  b.hp = b.stats.maxHp * 0.4; w.command(b.id, { type: 'restore' }); step(10);
  ok('đang hồi máu', b.statuses.some((s) => s.id === 'hoiMau'));
  dealDamage(w, tower, b, 50, 'true'); step(1);
  ok('trụ đánh không cắt hồi máu', b.statuses.some((s) => s.id === 'hoiMau'));
  dealDamage(w, a, b, 50, 'true'); const evs = step(1);
  ok('tướng địch đánh trúng → mất hồi máu', !b.statuses.some((s) => s.id === 'hoiMau') && evs.some((e) => e.type === 'restoreBreak' && e.id === b.id));
  const hp = b.hp; step(60); ok('không hồi tiếp sau khi bị cắt', b.hp - hp < b.stats.maxHp * 0.02, (b.hp - hp).toFixed(0));
}
{ // 6) cục máu sau trụ ngoài
  const { w, step, blue: [a], red: [b] } = setup();
  ok('mỗi đội 3 cục máu (sau trụ ngoài 3 đường)', w.orbs.length === 6 && w.orbs.filter((o) => o.team === 0).length === 3);
  const o = w.orbs.find((x) => x.team === 0 && x.lane === 'mid');
  a.pos.x = o.x; a.pos.y = o.y; step(2);
  ok('đầy máu đi qua thì không lấy', w.tick >= o.readyAt);
  b.pos.x = o.x; b.pos.y = o.y; b.hp = b.stats.maxHp * 0.5; step(2);
  ok('tướng địch không lấy được', w.tick >= o.readyAt && b.hp <= b.stats.maxHp * 0.5 + 50);
  b.pos.x = b.pos.y = 9300;
  a.hp = a.stats.maxHp * 0.5; a.mana = 0; const evs = step(1);
  ok('thiếu máu chạm vào → hồi 15% máu + năng lượng', Math.abs(a.hp / a.stats.maxHp - 0.65) < 0.02 && a.mana >= a.stats.maxMana * 0.14 && evs.some((e) => e.type === 'orbTaken' && e.id === a.id), (a.hp / a.stats.maxHp).toFixed(3));
  a.hp = a.stats.maxHp * 0.5; const mid = step(30 * 59);
  ok('chưa mọc lại trước 60 giây', w.tick < o.readyAt && !mid.some((e) => e.type === 'orbTaken'));
  const evs2 = step(31);
  ok('mọc lại sau 60 giây và hồi tiếp', evs2.some((e) => e.type === 'orbUp' && e.orb === o.id) && evs2.some((e) => e.type === 'orbTaken' && e.id === a.id));
}
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt'); process.exit(fail ? 1 : 0);
