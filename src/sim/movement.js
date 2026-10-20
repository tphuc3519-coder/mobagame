import { TICK } from '../core/loop.js';
import { dist, dirTo, clampToMap } from './util.js';
import { isRooted, isHardCC, removeStatus, isCcImmune } from './status.js';
import { skillHit } from './skills.js';
import { enemiesOf, isTargetable } from './targeting.js';

/** Kết thúc lướt: gọi onEnd(mục tiêu chạm được hoặc null) — chém liên hoàn sau cú lướt, hook trượt của lao khoá mục tiêu. Lướt của chiêu
 *  `unstoppable` thì cửa sổ không thể cản kết thúc cùng cú lướt. */
function endDash(e, t) { const d = e.dash; e.dash = null; if (d?.cast?.skill?.unstoppable) removeStatus(e, 'unstoppable'); d?.onEnd?.(t); }

/** Lướt (dash) một tick: dừng khi hết tầm, khi gặp tướng (stopOnHero), khi chạm mục tiêu đã khoá (target) hoặc bị khống chế cứng. */
function updateDash(world, e) {
  const d = e.dash;
  if (isHardCC(e)) { e.dash = null; return; }
  let step = Math.min(d.perTick, d.left);
  if (d.target != null) { // lao khoá mục tiêu: bám theo, không vượt quá chỗ chạm
    const t = world.byId(d.target);
    if (!t || !t.alive || !isTargetable(e, t)) { endDash(e, null); return; }
    const gap = dist(e.pos, t.pos) - e.radius - t.radius;
    if (gap <= 6) { d.hit.add(t.id); skillHit(world, e, t, d.cast); endDash(e, t); return; }
    const dd = dirTo(e.pos, t.pos); d.dx = dd.x; d.dy = dd.y; e.facing = Math.atan2(dd.y, dd.x); step = Math.min(step, gap);
  }
  const n = Math.ceil(step / 30); // chia bước nhỏ: lướt nhanh không xuyên qua bệ đá mỏng
  for (let i = 0; i < n; i++) { e.pos.x += d.dx * step / n; e.pos.y += d.dy * step / n; clampToMap(world.map, e.pos, e.radius); }
  d.left -= step;
  const { skill } = d.cast;
  if (d.target == null && (skill.damage || d.noHit)) {
    for (const t of enemiesOf(world, e)) {
      if (d.hit.has(t.id) || dist(t.pos, e.pos) > e.radius + t.radius) continue;
      const stopHere = d.stop && t.isHero;
      if (d.along || stopHere) { d.hit.add(t.id); if (!d.noHit) skillHit(world, e, t, d.cast); }
      if (stopHere) { endDash(e, t); return; }
    }
  }
  if (d.left <= 0.01) endDash(e, null);
}

/** Kéo/đẩy cưỡng bức (móc neo, xoáy nước): đơn vị bị dời thẳng tới điểm đích với tốc độ cố định, mất lượt lướt đang có. */
export function forceMove(world, t, to, speed) {
  if (!t.alive || t.structure || t.boss) return; // mục tiêu lớn đứng yên trong hang: không bị kéo/hút (trước bị kéo ra, tốc chạy 0 nên kẹt "đang về" mãi — hồi máu liên tục, không đánh trả)
  if (isCcImmune(t)) return; // miễn khống chế / không thể cản: không bị kéo, đẩy (forceMove chỉ dùng để dời đơn vị khác)
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
    const n = Math.max(1, Math.ceil(step / 30));
    for (let i = 0; i < n; i++) { if (d > 0.01) { e.pos.x += (dx / d) * step / n; e.pos.y += (dy / d) * step / n; } clampToMap(world.map, e.pos, e.radius); }
    const left = Math.hypot(f.x - e.pos.x, f.y - e.pos.y);
    if (left <= 0.5 || d - left < step * 0.3) e.forced = null; // tới đích, hoặc bị tường chặn (trước đây kẹt mãi, không đi được nữa)
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
      if (world.tick < (e.castUntil || 0)) { // đang ra chiêu: đứng yên, mặt giữ hướng chiêu (skills.js) tới lúc chiêu phát ra
        e.facing = e.castFacing ?? e.facing; x = 0; y = 0;
      } else if (world.tick < (e.swingUntil || 0)) { // đang vung đòn đánh thường: đứng yên, mặt luôn hướng về mục tiêu cho chuẩn
        const t = e.swingTarget != null ? world.byId(e.swingTarget) : null;
        if (t && t.alive) e.facing = Math.atan2(t.pos.y - e.pos.y, t.pos.x - e.pos.x);
        x = 0; y = 0;
      }
      const m = Math.hypot(x, y);
      if (m > 0.001) { x /= m; y /= m; } // chỉ hướng có nghĩa: mọi tướng chạy đúng tốc độ của mình, không chậm lại khi kéo cần ngắn
      if (isRooted(e) || m < 0.001) { e.speed = 0; }
      else {
        const step = e.stats.moveSpeed * TICK;
        e.pos.x += x * step; e.pos.y += y * step;
        e.speed = e.stats.moveSpeed;
        e.facing = Math.atan2(y, x);
      }
    }
    for (const s of solids) { const dx = e.pos.x - s.pos.x, dy = e.pos.y - s.pos.y, d = Math.hypot(dx, dy), min = e.radius + s.radius * 0.8; if (d < min && d > 0.01) { e.pos.x = s.pos.x + (dx / d) * min; e.pos.y = s.pos.y + (dy / d) * min; } }
    clampToMap(world.map, e.pos, e.radius);
  }
}
