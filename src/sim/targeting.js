import { dist, dirTo } from './util.js';
import { isStealthed, isUntargetable } from './status.js';
import { canSee } from './vision.js';

export const isTargetable = (viewer, t) => t.alive && !t.noTarget && !isUntargetable(t) && (t.team === viewer.team || !isStealthed(t));
export const enemiesOf = (world, e) => world.entities.filter((t) => t.team !== e.team && t.alive && !t.noTarget && !isUntargetable(t));
export const alliesOf = (world, e, range = Infinity) => world.entities.filter((t) => t.team === e.team && t.alive && !t.structure && t !== e && dist(t.pos, e.pos) <= range);

/** Địch gần nhất trong tầm (tính bán kính mục tiêu); ưu tiên id truyền vào. */
export function nearestEnemy(world, e, range, preferId = null) {
  let best = null, bd = Infinity;
  for (const t of world.entities) {
    if (t.team === e.team || !isTargetable(e, t) || !canSee(e.team, t)) continue;
    const d = dist(t.pos, e.pos) - t.radius;
    if (d > range) continue;
    if (t.id === preferId) return t;
    const sc = d + (t.team === 2 ? 400 : 0); // quái rừng xếp sau tướng/lính/trụ
    if (sc < bd) { bd = sc; best = t; }
  }
  return best;
}
/** Mục tiêu đánh thường của tướng có luật chọn (lệnh targetBy — Cài đặt "Lựa chọn mục tiêu" của người chơi; bot không đặt nên không đổi):
 *  mục tiêu ưu tiên (preferId, vd. địch đang khoá) còn trong tầm trước; rồi tướng địch trong tầm — 'pct' % máu thấp nhất, 'hp' máu thấp nhất,
 *  'near' gần nhất (bằng nhau thì gần hơn); không có tướng nào trong tầm thì như nearestEnemy (lính / trụ / quái). */
export function pickByRule(world, e, range, rule, preferId = null) {
  const p = preferId != null ? world.byId(preferId) : null;
  if (p && p.team !== e.team && isTargetable(e, p) && canSee(e.team, p) && dist(p.pos, e.pos) - p.radius <= range) return p;
  let best = null, bs = Infinity, bd = Infinity;
  for (const t of world.entities) {
    if (!t.isHero || t.team === e.team || !isTargetable(e, t) || !canSee(e.team, t)) continue;
    const d = dist(t.pos, e.pos) - t.radius; if (d > range) continue;
    const sc = rule === 'hp' ? t.hp : rule === 'near' ? d : t.hp / t.stats.maxHp;
    if (sc < bs || (sc === bs && d < bd)) { bs = sc; bd = d; best = t; }
  }
  return best || nearestEnemy(world, e, range);
}
/** Địch gần nhất nằm trong nửa mặt phẳng hướng đã cho. */
export function enemyAlongDir(world, e, dir, range) {
  let best = null, bd = Infinity;
  for (const t of world.entities) {
    if (t.team === e.team || !isTargetable(e, t) || !canSee(e.team, t)) continue;
    const d = dist(t.pos, e.pos); if (d > range + t.radius) continue;
    const dd = dirTo(e.pos, t.pos);
    if (dd.x * dir.x + dd.y * dir.y > 0.5 && d < bd) { bd = d; best = t; }
  }
  return best;
}
