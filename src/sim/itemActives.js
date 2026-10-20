// Đồ kích hoạt (05 §4): mỗi loại `active.id` một hàm (world, e, act, aim) → { ok, reason?, ev? }. Số liệu nằm ở data/items.js; ở đây chỉ là
// luật chung, không gọi tên món nào. Không mục tiêu / mục tiêu miễn khống chế → không tính hồi (items.js chỉ nạp hồi khi ok).
import { dist, norm } from './util.js';
import { applyStatus, isRooted, isSilenced, cannotDash, isCcImmune } from './status.js';
import { addShield } from './damage.js';
import { alliesOf, isTargetable } from './targeting.js';
import { canSee } from './vision.js';
import { amountOf } from './ctx.js';
import { startSuppress } from './suppress.js';

/** Tướng địch cho đồ khoá mục tiêu (Xích Giữ): aim.id nếu hợp lệ, không thì gần nhất (tính bán kính) trong act.range. Bỏ phân thân,
 *  không thể chọn, đang khuất, miễn khống chế. */
export function pickItemTarget(world, e, act, aim) {
  const ok = (t) => !!t && t.isHero && t.kind !== 'clone' && t.team !== e.team && t.alive && isTargetable(e, t) && canSee(e.team, t) && !isCcImmune(t) && dist(t.pos, e.pos) - t.radius <= act.range;
  if (aim?.id != null) { const t = world.byId(aim.id); if (ok(t)) return t; }
  let best = null, bd = Infinity;
  for (const t of world.entities) { if (!ok(t)) continue; const d = dist(t.pos, e.pos) - t.radius; if (d < bd) { bd = d; best = t; } }
  return best;
}

export const ACTIVES = {
  /** Sương Đông: bất động + bất tử. */
  stasis(world, e, act) {
    e.dash = null; e.moveDir = { x: 0, y: 0 };
    applyStatus(world, e, { status: 'stasis', duration: act.duration }, e);
    return { ok: true, ev: { dur: act.duration } };
  },
  /** Xích Giữ: áp chế một tướng địch, người dùng đứng niệm giữ xích. */
  suppress(world, e, act, aim) {
    if (isSilenced(e)) return { ok: false, reason: 'cc' };
    const t = pickItemTarget(world, e, act, aim); if (!t) return { ok: false, reason: 'noTarget' };
    const l = startSuppress(world, e, t, { duration: act.duration, channel: true, breakRange: act.breakRange, slot: 'item', item: true });
    return l ? { ok: true, ev: { target: t.id, dur: act.duration } } : { ok: false, reason: 'noTarget' };
  },
  /** Lọng Che: khiên cho mình và tướng đồng minh quanh mình (cùng id: dùng lại thì làm mới, hai người dùng thì cộng). */
  ward(world, e, act) {
    const amt = amountOf(act.shield, e.level, e);
    for (const a of [e, ...alliesOf(world, e, act.radius).filter((x) => x.kind === 'hero')]) addShield(world, a, amt, act.duration, 'ward_' + e.id, e);
    return { ok: true, ev: { x: e.pos.x, y: e.pos.y, radius: act.radius, dur: act.duration } };
  },
  /** Lụa Gió: lướt thật (dừng ở tường / khi bị khống chế cứng) theo hướng ngắm, không thì hướng đang chạy, không thì hướng nhìn. */
  dash(world, e, act, aim) {
    if (isRooted(e)) return { ok: false, reason: 'cc' };
    if (cannotDash(e)) return { ok: false, reason: 'noDash' };
    if (e.dash) return { ok: false, reason: 'busy' };
    let d = aim && (aim.x || aim.y) ? norm(aim.x, aim.y) : null;
    if (!d) { const m = Math.hypot(e.moveDir.x, e.moveDir.y); d = m > 0.1 ? norm(e.moveDir.x, e.moveDir.y) : { x: Math.cos(e.facing), y: Math.sin(e.facing) }; }
    e.dash = { dx: d.x, dy: d.y, perTick: act.speed / 30, left: act.range, along: false, stop: false, noHit: false, hit: new Set(), cast: { skill: {}, slot: 'item' } };
    e.facing = Math.atan2(d.y, d.x);
    if (act.haste) applyStatus(world, e, { status: 'haste', id: 'lua_gio', pct: act.haste.pct, duration: act.haste.duration }, e);
    return { ok: true, ev: { dx: d.x, dy: d.y } };
  },
};
