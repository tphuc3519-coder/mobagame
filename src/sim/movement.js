import { TICK } from '../core/loop.js';

/** Di chuyển tướng theo moveDir; giữ trong đường (trượt dọc mép). */
export function updateMovement(world) {
  const { map } = world;
  const yMin = map.road.y - map.road.width / 2, yMax = map.road.y + map.road.width / 2;
  for (const e of world.entities) {
    if (e.kind !== 'hero' || !e.alive) continue;
    let { x, y } = e.moveDir;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    const step = e.stats.moveSpeed * TICK;
    e.pos.x = Math.min(map.w - e.radius, Math.max(e.radius, e.pos.x + x * step));
    e.pos.y = Math.min(yMax - e.radius, Math.max(yMin + e.radius, e.pos.y + y * step));
    e.speed = m > 0.001 ? e.stats.moveSpeed * Math.min(1, m) : 0;
    if (m > 0.05) e.facing = Math.atan2(y, x);
  }
}
