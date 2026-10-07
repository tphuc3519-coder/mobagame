// Dấu vân tay mô phỏng: chạy trận 5v5 toàn bot (và 1v1) theo seed, băm trạng thái mọi đơn vị mỗi phút. Dùng để kiểm tra tối ưu mô phỏng
// không đổi kết quả: chạy trước / sau khi sửa, hai dòng băm phải trùng. Dùng: node tools/t_determinism.mjs [phút=8] [seed=1]
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';

const minutes = +(process.argv[2] || 8), seed = +(process.argv[3] || 1);
const hash = (w) => {
  let h = 2166136261 >>> 0; const mix = (v) => { const s = typeof v === 'number' ? v.toFixed(6) : String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const e of w.entities) { mix(e.id); mix(e.kind); mix(e.pos.x); mix(e.pos.y); mix(e.hp); mix(e.alive ? 1 : 0); mix(e.gold ?? 0); mix(e.level ?? 0); }
  mix(w.projectiles.length); return h.toString(16).padStart(8, '0');
};
const t0 = Date.now();
for (const [name, map] of [['5v5', ARENA], ['1v1', DUEL]]) {
  const w = createWorld({ map, seed }), out = [];
  if (map === ARENA) { const { player } = setupTeams(w, { heroId: 'hoa_ren', difficulty: 'normal' }); w.addBot(player, 'normal', player.laneIdx); }
  else { const a = w.spawnHero('hoa_ren', 0, { x: DUEL.spawn[0].x + 250, y: DUEL.road.y }), b = w.spawnHero('nguyet_ha', 1, { x: DUEL.spawn[1].x - 250, y: DUEL.road.y }); w.addBot(a, 'normal'); w.addBot(b, 'normal'); }
  for (let t = 1; t <= minutes * 1800; t++) { w.update(t); w.events.length = 0; if (t % 1800 === 0) out.push(hash(w)); if (w.over) { out.push('over@' + w.over.tick); break; } }
  console.log(name, out.join(' '));
}
console.log(`(${Date.now() - t0} ms)`);
