// Cục máu sau trụ ngoài (như Liên Quân): mỗi đội một cục sau trụ đầu của mỗi đường, trên đường lùi về nhà. Tướng phe đó chạm vào (khi
// thiếu máu hoặc năng lượng — đi ngang lúc đầy thì không phí) → hồi map.orbs.hpPct máu + manaPct năng lượng tối đa; mọc lại sau respawn
// giây. Vị trí tính cho phía Xanh rồi lấy đối xứng sang phía Đỏ. Không dùng ngẫu nhiên.
import { T, dist } from './util.js';
import { heal } from './damage.js';
import { lanePath, project, pointAt } from './lanes.js';

export function initOrbs(world) {
  const { map } = world, cfg = map.orbs; world.orbs = [];
  if (!cfg) return;
  for (const s of map.structures) {
    if (s.kind !== 'tower' || !s.id.endsWith('_outer')) continue;
    const li = map.lanes.findIndex((l) => l.id === s.lane); if (li < 0) continue;
    const path = lanePath(map, li, 0), at = pointAt(path, project(path, s).s - cfg.behind);
    for (const team of [0, 1]) { const p = team ? map.mirror(at.x, at.y) : { x: at.x, y: at.y }; world.orbs.push({ id: world.orbs.length, team, lane: s.lane, x: p.x, y: p.y, readyAt: 0 }); }
  }
}

export const orbReady = (world, o) => world.tick >= o.readyAt;

export function updateOrbs(world) {
  const cfg = world.map.orbs; if (!cfg || !world.orbs?.length) return;
  for (const o of world.orbs) {
    if (world.tick < o.readyAt) continue;
    if (o.readyAt > 0 && world.tick === o.readyAt) world.emit('orbUp', { orb: o.id, team: o.team });
    const h = world.entities.find((e) => e.kind === 'hero' && e.alive && e.team === o.team && dist(e.pos, o) <= cfg.radius + e.radius
      && (e.hp < e.stats.maxHp * 0.98 || e.mana < e.stats.maxMana * 0.98));
    if (!h) continue;
    heal(world, h, h.stats.maxHp * cfg.hpPct);
    h.mana = Math.min(h.stats.maxMana, h.mana + h.stats.maxMana * cfg.manaPct);
    o.readyAt = world.tick + T(cfg.respawn);
    world.emit('orbTaken', { id: h.id, orb: o.id, team: o.team });
  }
}
