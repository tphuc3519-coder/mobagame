import { applyStatus, removeStatus } from './status.js';
import { dealDamage, heal, addShield, hasShield } from './damage.js';
import { alliesOf } from './targeting.js';
import { T } from './util.js';
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

/** Ngữ cảnh truyền cho hook cơ chế riêng của tướng (04 §4). */
export function makeCtx(world, self, extra = {}) {
  const addHeat = (e, n) => { e.heat = Math.min(5, (e.heat || 0) + n); e.heatUntil = world.tick + T(4); };
  return {
    world, self, ...extra,
    applyStatus: (t, s) => applyStatus(world, t, s, self),
    removeStatus, dealDamage: (t, a, type) => dealDamage(world, self, t, a, type),
    heal: (t, a) => heal(world, t, a), addShield: (t, a, sec, id) => addShield(world, t, a, sec, id), hasShield,
    alliesOf: (e, r) => alliesOf(world, e, r),
    addHeat, setHeat: (e, n) => { e.heat = n; e.heatUntil = world.tick + T(4); },
  };
}
