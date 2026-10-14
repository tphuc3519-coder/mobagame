// Kiểm thử luật chọn mục tiêu đánh thường của người chơi (Cài đặt "Lựa chọn mục tiêu", lệnh targetBy → sim/targeting.js pickByRule):
// có tướng địch trong tầm thì chọn theo % máu / máu / gần nhất, không có thì như cũ (nearestEnemy); mục tiêu khoá (preferTarget) trong tầm
// luôn trước; không đặt luật (bot) thì y như cũ. Dùng: node tools/t_target.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { spawnMinion } from '../src/sim/minions.js';
import { pickByRule, nearestEnemy } from '../src/sim/targeting.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

/** Người chơi Emberforge (cận chiến, tầm 170) ở (1000, 1200); lính địch sát bên (gần nhất), 3 tướng địch quanh mình trong tầm. */
function setup() {
  const w = createWorld({ map: DUEL, seed: 3, structures: false, waves: false });
  const p = w.spawnHero('hoa_ren', 0, { x: 1000, y: 1200 });
  const m = spawnMinion(w, 'sword', 1, 0); m.pos.x = m.prevPos.x = 1090; m.pos.y = m.prevPos.y = 1200; // cách mép 90 − 36 = 54: gần nhất
  const a = w.spawnHero('thach_quy', 1, { x: 1000, y: 1360 }); // cách mép ~118
  const b = w.spawnHero('nguyet_ha', 1, { x: 850, y: 1200 }); // cách mép ~110
  const c = w.spawnHero('kiem_thuy', 1, { x: 1000, y: 1060 }); // cách mép ~100
  for (const h of [a, b, c]) h.moveDir.x = h.moveDir.y = 0;
  a.hp = a.stats.maxHp * 0.30; // % máu thấp nhất
  b.hp = 300;                  // máu thấp nhất (tính số)
  c.hp = c.stats.maxHp * 0.9;  // gần nhất trong 3 tướng
  const range = p.stats.range;
  return { w, p, m, a, b, c, range };
}

{
  const { w, p, m, a, b, c, range } = setup();
  ok('dựng đúng: b máu thấp nhất nhưng % không thấp nhất', b.hp < a.hp && b.hp / b.stats.maxHp > a.hp / a.stats.maxHp, `${(a.hp / a.stats.maxHp).toFixed(2)} ${(b.hp / b.stats.maxHp).toFixed(2)}`);
  ok('không luật (bot / như cũ): lính gần nhất', nearestEnemy(w, p, range) === m);
  ok("'pct': tướng % máu thấp nhất", pickByRule(w, p, range, 'pct') === a);
  ok("'hp': tướng máu thấp nhất", pickByRule(w, p, range, 'hp') === b);
  ok("'near': tướng gần nhất (không phải lính)", pickByRule(w, p, range, 'near') === c);
  ok('mục tiêu khoá trong tầm luôn trước (kể cả lính)', pickByRule(w, p, range, 'pct', m.id) === m);
  ok('mục tiêu khoá ngoài tầm: theo luật', pickByRule(w, p, 100, 'pct', a.id) === c && pickByRule(w, p, range, 'hp', 99999) === b);
  for (const h of [a, b, c]) { h.alive = false; }
  ok('không tướng nào trong tầm: như cũ (lính gần nhất)', pickByRule(w, p, range, 'pct') === m);
}
{ // qua lệnh + vòng mô phỏng: người chơi giữ nút đánh, đòn đầu vào đúng mục tiêu
  for (const [rule, want] of [['pct', 'a'], ['hp', 'b'], ['near', 'c'], [null, 'm']]) {
    const s = setup(); let t = 0;
    if (rule) s.w.command(s.p.id, { type: 'targetBy', value: rule });
    s.w.command(s.p.id, { type: 'attack', on: true });
    s.w.update(++t);
    ok(`lệnh targetBy=${rule}: đòn đầu vào ${want}`, s.p.swingTarget === s[want].id, `swingTarget ${s.p.swingTarget}`);
  }
  const s = setup(); let t = 0;
  s.w.command(s.p.id, { type: 'targetBy', value: 'bừa' }); s.w.update(++t);
  ok('giá trị lạ: bỏ luật (như cũ)', s.p.targetBy === null);
  s.p.alive = false; s.w.command(s.p.id, { type: 'targetBy', value: 'near' }); s.w.update(++t);
  ok('đổi luật lúc đang chết vẫn nhận', s.p.targetBy === 'near');
}
{ // bot không bao giờ có luật: trận toàn bot giữ nguyên (t_determinism kiểm băm)
  const w = createWorld({ map: DUEL, seed: 5 });
  const a = w.spawnHero('hoa_ren', 0, { x: DUEL.spawn[0].x + 250, y: DUEL.road.y }), b = w.spawnHero('nguyet_ha', 1, { x: DUEL.spawn[1].x - 250, y: DUEL.road.y });
  w.addBot(a, 'normal'); w.addBot(b, 'normal');
  for (let t = 1; t <= 1800; t++) w.update(t);
  ok('bot không đặt targetBy', !w.entities.some((e) => e.targetBy));
}
console.log(fail ? `${fail} LỖI` : 'TẤT CẢ ĐẠT');
process.exit(fail ? 1 : 0);
