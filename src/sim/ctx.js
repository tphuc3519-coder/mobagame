import { applyStatus, removeStatus, hasStatus, isHardCC, isRooted } from './status.js';
import { dealDamage, heal, addShield, hasShield } from './damage.js';
import { alliesOf, enemiesOf } from './targeting.js';
import { applyInstant } from './effects.js';
import { T, dist } from './util.js';
import { lv } from '../data/heroes/_levels.js';

/** Sát thương/hồi/khiên của kỹ năng: base + perLevel×(cấp−1) + hệ số × chỉ số người dùng (04 §1). */
export function amountOf(spec, level, caster) {
  const s = caster.stats;
  return spec.base + (spec.perLevel || 0) * (level - 1) + (spec.ad || 0) * s.atk + (spec.ap || 0) * s.ap + (spec.hpPct || 0) * s.maxHp;
}
/** Chép hiệu ứng và chọn giá trị theo cấp kỹ năng (mảng → phần tử). */
export function resolveEffect(eff, level) {
  const o = {};
  for (const [k, v] of Object.entries(eff)) o[k] = Array.isArray(v) ? lv(v, level) : v;
  return o;
}

/** Số tầng của dấu `id` trên `t` (trạng thái kind 'mark' mang trường n; hết hạn là về 0). */
export const stacksOf = (t, id) => t.statuses.find((s) => s.id === id)?.n || 0;

/** Ngữ cảnh truyền cho hook cơ chế riêng của tướng (04 §4). Hook nhận thêm: target, cast (chiêu; không có = đòn đánh thường), slot…
 *  Công cụ tầng dấu (addStack / stacks / clearStack) dùng chung cho Nụ Mai, Trang Sách, Manh Mối…: mỗi tầng giữ ttl giây kể từ lần cộng cuối. */
export function makeCtx(world, self, extra = {}) {
  const addHeat = (e, n) => { e.heat = Math.min(5, (e.heat || 0) + n); e.heatUntil = world.tick + T(4); };
  return {
    world, self, ...extra, T,
    applyStatus: (t, s) => applyStatus(world, t, s, self),
    applyInstant: (t, eff, origin) => applyInstant(world, t, eff, self, origin),
    removeStatus, hasStatus, isHardCC, isRooted, dealDamage: (t, a, type, opts) => dealDamage(world, self, t, a, type, opts),
    heal: (t, a) => heal(world, t, a, self), addShield: (t, a, sec, id) => addShield(world, t, a, sec, id, self), hasShield,
    alliesOf: (e, r) => alliesOf(world, e, r),
    /** Địch còn sống, chọn được, trong bán kính r quanh điểm p. */
    enemiesNear: (p, r) => enemiesOf(world, self).filter((t) => !t.structure && dist(t.pos, p) - t.radius <= r),
    stacks: (t, id) => stacksOf(t, id),
    addStack: (t, id, max, ttl, n = 1) => { const k = Math.min(max, stacksOf(t, id) + n); applyStatus(world, t, { status: 'mark', id, n: k, duration: ttl }, self); return k; },
    clearStack: (t, id) => removeStatus(t, id),
    emit: (type, data) => world.emit(type, { id: self.id, ...data }),
    addHeat, setHeat: (e, n) => { e.heat = n; e.heatUntil = world.tick + T(4); },
  };
}
