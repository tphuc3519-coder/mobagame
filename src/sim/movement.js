import { TICK } from '../core/loop.js';
import { dist, clampToMap } from './util.js';
import { isRooted, isHardCC } from './status.js';
import { skillHit } from './skills.js';
import { enemiesOf } from './targeting.js';

/** Lướt (dash) một tick: dừng khi hết tầm, khi gặp tướng (stopOnHero) hoặc bị khống chế cứng. */
function updateDash(world, e) {
  const d = e.dash;
  if (isHardCC(e)) { e.dash = null; return; }
  const step = Math.min(d.perTick, d.left);
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

/** Kéo/đẩy cưỡng bức (móc neo, xoáy nước): đơn vị bị dời thẳng tới điểm đích với tốc độ cố định, mất lượt lướt đang có. */
export function forceMove(world, t, to, speed) {
  if (!t.alive || t.structure) return;
  const d = dist(t.pos, to);
  if (d < 1) return;
  t.dash = null; t.forced = { x: to.x, y: to.y, perTick: speed * TICK };
  return d / speed; // thời gian kéo (giây)
}
function updateForced(world) {
  for (const e of world.entities) {
    const f = e.forced; if (!f) continue;
    if (!e.alive) { e.forced = null; continue; }
    const dx = f.x - e.pos.x, dy = f.y - e.pos.y, d = Math.hypot(dx, dy), step = Math.min(d, f.perTick);
    if (d > 0.01) { e.pos.x += (dx / d) * step; e.pos.y += (dy / d) * step; }
    clampToMap(world.map, e.pos, e.radius);
    if (d - step <= 0.5) e.forced = null;
  }
}

/** Di chuyển tướng theo moveDir; giữ trong đường; không xuyên công trình. */
export function updateMovement(world) {
  updateForced(world);
  const solids = world.entities.filter((s) => s.alive && s.structure && !s.noTarget);
  for (const e of world.entities) {
    if (!e.alive || e.kind !== 'hero' || e.forced) continue;
    if (e.dash) { updateDash(world, e); e.speed = 0; }
    else {
      let { x, y } = e.moveDir;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      if (isRooted(e) || m < 0.001) { e.speed = 0; if (m > 0.05 && !isRooted(e)) e.facing = Math.atan2(y, x); }
      else {
        const step = e.stats.moveSpeed * TICK * Math.min(1, m);
        e.pos.x += x * step; e.pos.y += y * step;
        e.speed = e.stats.moveSpeed * Math.min(1, m);
        e.facing = Math.atan2(y, x);
      }
    }
    for (const s of solids) { const dx = e.pos.x - s.pos.x, dy = e.pos.y - s.pos.y, d = Math.hypot(dx, dy), min = e.radius + s.radius * 0.8; if (d < min && d > 0.01) { e.pos.x = s.pos.x + (dx / d) * min; e.pos.y = s.pos.y + (dy / d) * min; } }
    clampToMap(world.map, e.pos, e.radius);
  }
}
