import { TICK } from '../core/loop.js';
import { dist, clampToMap } from './util.js';
import { isRooted, isHardCC } from './status.js';
import { skillHit } from './skills.js';
import { enemiesOf } from './targeting.js';

/** Lướt (dash) một tick: dừng khi hết tầm, khi gặp tướng (stopOnHero) hoặc bị khống chế cứng. */
function updateDash(world, e) {
  const d = e.dash;
  if (isHardCC(e)) { e.dash = null; return; }
  let step = Math.min(d.perTick, d.left);
  e.pos.x += d.dx * step; e.pos.y += d.dy * step; d.left -= step;
  clampToMap(world.map, e.pos, e.radius);
  const { skill } = d.cast;
  if (skill.damage) {
    for (const t of enemiesOf(world, e)) {
      if (d.hit.has(t.id) || dist(t.pos, e.pos) > e.radius + t.radius) continue;
      if (d.along || (d.stop && t.isHero)) { d.hit.add(t.id); skillHit(world, e, t, d.cast); }
      if (d.stop && t.isHero) { e.dash = null; return; }
    }
  }
  if (d.left <= 0.01) e.dash = null;
}

/** Di chuyển tướng theo moveDir; giữ trong đường (trượt dọc mép). */
export function updateMovement(world) {
  for (const e of world.entities) {
    if (!e.alive || e.data.dummy) continue;
    if (e.dash) { updateDash(world, e); e.speed = 0; continue; }
    let { x, y } = e.moveDir;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    if (isRooted(e) || m < 0.001) { e.speed = 0; if (m > 0.05 && !isRooted(e)) e.facing = Math.atan2(y, x); continue; }
    const step = e.stats.moveSpeed * TICK * Math.min(1, m);
    e.pos.x += x * step; e.pos.y += y * step;
    clampToMap(world.map, e.pos, e.radius);
    e.speed = e.stats.moveSpeed * Math.min(1, m);
    if (!e.attackFacing) e.facing = Math.atan2(y, x);
  }
}
