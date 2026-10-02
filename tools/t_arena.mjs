// Kiểm thử bản đồ 5v5: chạy trận 10 bot không DOM. Dùng: node tools/t_arena.mjs [phút=20] [seed=1]
import { createWorld } from '../src/sim/world.js';
import { ARENA } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';

const minutes = +(process.argv[2] || 20), seed = +(process.argv[3] || 1);
const w = createWorld({ map: ARENA, seed });
const { player, teams } = setupTeams(w, { heroId: 'hoa_ren', difficulty: 'normal' });
// người chơi cũng để bot điều khiển trong kiểm thử
w.addBot(player, 'normal', player.laneIdx);
let errors = 0, nan = 0, maxMinions = 0, outOfMap = 0;
const t0 = Date.now(), log = [];
for (let t = 1; t <= minutes * 60 * 30; t++) {
  try { w.update(t); } catch (e) { errors++; console.error('LỖI tick', t, e.stack); break; }
  w.events.length = 0;
  if (t % 30 === 0) {
    const ms = w.entities.filter((e) => e.kind === 'minion' && e.alive); maxMinions = Math.max(maxMinions, ms.length);
    for (const e of w.entities) { if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.hp)) nan++; if (e.alive && (e.pos.x < 0 || e.pos.y < 0 || e.pos.x > ARENA.w || e.pos.y > ARENA.h)) outOfMap++; }
  }
  if (t % (60 * 30) === 0) {
    const hs = w.entities.filter((e) => e.kind === 'hero'), lost = w.entities.filter((e) => e.structure && !e.noTarget && !e.alive);
    log.push(`${t / 1800}p: giết ${[0, 1].map((tm) => hs.filter((h) => h.team === tm).reduce((a, h) => a + h.kills, 0)).join('-')} · cấp TB ${[0, 1].map((tm) => (hs.filter((h) => h.team === tm).reduce((a, h) => a + h.level, 0) / 5).toFixed(1)).join('-')} · trụ vỡ Xanh/Đỏ ${lost.filter((s) => s.team === 0).length}/${lost.filter((s) => s.team === 1).length} · lính ${w.entities.filter((e) => e.kind === 'minion' && e.alive).length}`);
  }
  if (w.over) { log.push(`KẾT THÚC lúc ${(w.over.tick / 1800).toFixed(1)} phút, thắng: đội ${w.over.winner === 0 ? 'Xanh' : 'Đỏ'}`); break; }
}
console.log(log.join('\n'));
console.log(`Mô phỏng trong ${Date.now() - t0} ms; lính tối đa ${maxMinions}`);
const hs = w.entities.filter((e) => e.kind === 'hero');
console.log('tướng:', hs.map((h) => `${h.team ? 'Đ' : 'X'}:${h.heroId}(${h.laneId}) ${h.kills}/${h.deaths} cấp${h.level}`).join(' | '));
let fail = errors + nan + outOfMap;
console.log((fail ? 'LỖI' : 'ĐẠT') + ` không lỗi/NaN/ra ngoài bản đồ (${errors}/${nan}/${outOfMap})`);
const lanesHave = [0, 1, 2].map((i) => w.entities.filter((e) => e.kind === 'minion' && e.lane === i).length);
console.log(`lính theo đường (còn trong thế giới): ${lanesHave.join(', ')}`);
process.exit(fail ? 1 : 0);
