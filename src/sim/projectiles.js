import { TICK } from '../core/loop.js';
import { isTargetable } from './targeting.js';

// Đạn: thẳng (kỹ năng) hoặc tự dẫn (đòn đánh xa). onHit(target) trả true nếu đạn dừng lại.
export function spawnProjectile(world, p) {
  const proj = { id: world.nextId++, hit: new Set(), homing: null, width: 40, pierce: false, ...p };
  proj.perTick = proj.speed * TICK;
  world.projectiles.push(proj);
  return proj;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function updateProjectiles(world) {
  const keep = [];
  for (const p of world.projectiles) {
    const owner = world.byId(p.owner);
    let done = false;
    if (p.homing != null) { // đòn đánh xa tự dẫn
      const t = world.byId(p.homing);
      if (!t || !t.alive) done = true;
      else {
        const dx = t.pos.x - p.x, dy = t.pos.y - p.y, d = Math.hypot(dx, dy);
        if (d <= p.perTick + t.radius * 0.6) { p.onHit(t); done = true; }
        else { p.x += (dx / d) * p.perTick; p.y += (dy / d) * p.perTick; p.dx = dx / d; p.dy = dy / d; }
      }
    } else {
      const step = Math.min(p.perTick, p.remaining);
      const nx = p.x + p.dx * step, ny = p.y + p.dy * step;
      for (const t of world.entities) {
        if (!owner || t.team === owner.team || p.hit.has(t.id) || !isTargetable(owner, t)) continue;
        if (segDist(t.pos.x, t.pos.y, p.x, p.y, nx, ny) <= t.radius + p.width / 2) {
          p.hit.add(t.id);
          const stop = p.onHit(t);
          if (stop && !p.pierce) { done = true; break; }
        }
      }
      p.x = nx; p.y = ny; p.remaining -= step;
      if (p.remaining <= 0.01) done = true;
    }
    if (!done) keep.push(p);
  }
  world.projectiles = keep;
}

// Vùng tồn tại N giây, gây hiệu ứng mỗi tickInterval (zone).
export function spawnZone(world, z) {
  const zone = { id: world.nextId++, nextTick: world.tick + 1, ...z };
  world.zones.push(zone);
  return zone;
}
export function updateZones(world) {
  world.zones = world.zones.filter((z) => z.until > world.tick);
  for (const z of world.zones) {
    if (world.tick < z.nextTick) continue;
    z.nextTick += z.interval;
    z.onTick(z);
  }
}
