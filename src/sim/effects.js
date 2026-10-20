// Hiệu ứng tức thời của kỹ năng (04 §3): đẩy lùi, hút về, giải khống chế, cắt chiêu đang gồng. Khác trạng thái (status.js) ở chỗ không
// kéo dài — áp một lần lúc trúng. Đẩy / hút dùng forceMove (đơn vị bị dời thẳng, bị choáng suốt lúc bay nên mất lượt lướt / vung chiêu).
import { forceMove } from './movement.js';
import { applyStatus, removeStatus, CLEANSE_KINDS as CLEANSE } from './status.js';
import { cancelRecall } from './economy.js';
import { dirTo } from './util.js';

export const INSTANT = new Set(['knockback', 'pull', 'cleanse', 'interrupt']);

/** Cắt chiêu đang gồng / lướt / Biến về: chiêu có `windup` đang chờ phát ra sẽ mất (skills.js so bộ đếm interrupts). */
export function interrupt(world, t) {
  t.interrupts = (t.interrupts || 0) + 1; t.dash = null; t.castUntil = 0;
  if (t.recall) cancelRecall(world, t);
}

/** Áp một hiệu ứng tức thời lên `t`. origin: tâm đẩy / hút (vùng tròn, vùng lưu) — mặc định chỗ đứng của người tung. */
export function applyInstant(world, t, eff, src, origin = null) {
  if (!t.alive || t.structure) return;
  const o = origin || src.pos;
  switch (eff.status) {
    case 'knockback': {
      if (t.boss) return;
      let d = dirTo(o, t.pos); if (!d.x && !d.y) d = { x: Math.cos(src.facing), y: Math.sin(src.facing) };
      const k = 1 - (t.data?.passive?.params?.knockbackReduce || 0) - (t.knockbackResist || 0); // Giáp Sắt (Phù Đổng) giảm 40% lực đẩy
      const dist = (eff.dist || 150) * Math.max(0.1, k);
      const time = forceMove(world, t, { x: t.pos.x + d.x * dist, y: t.pos.y + d.y * dist }, eff.speed || 1600) || 0;
      if (time > 0) applyStatus(world, t, { status: 'stun', id: 'knock_stun', duration: time }, src);
      interrupt(world, t);
      return;
    }
    case 'pull': { // hút về tâm, tối đa eff.dist
      if (t.boss) return;
      const d = dirTo(t.pos, o), gap = Math.hypot(o.x - t.pos.x, o.y - t.pos.y), mv = Math.max(0, Math.min(eff.dist || 200, gap - t.radius * 0.5));
      if (mv < 5) return;
      const time = forceMove(world, t, { x: t.pos.x + d.x * mv, y: t.pos.y + d.y * mv }, eff.speed || 1400) || 0;
      if (time > 0) applyStatus(world, t, { status: 'stun', id: 'pull_stun', duration: time }, src);
      interrupt(world, t);
      return;
    }
    case 'cleanse': for (const k of CLEANSE) removeStatus(t, k); world.emit('cleanse', { id: t.id }); return;
    case 'interrupt': interrupt(world, t); return;
    default:
  }
}
