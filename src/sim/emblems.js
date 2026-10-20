// Phù hiệu trong trận (05 §9): chạy theo `kind` của dữ liệu (data/emblems.js), không biết tên. Gọi từ đúng 2 chỗ trong dealDamage:
// trước giảm giáp (emblemDeal — nét phụ khuếch sát thương) và sau khi trừ máu (emblemAfter của người gây, emblemTaken của người nhận).
// Trạng thái riêng của phù hiệu chính nằm ở e.emState (tick). Không có lệnh gọi ở cấp module (import vòng với damage.js như items.js).
import { KEYSTONES, MINORS } from '../data/emblems.js';
import { T } from './util.js';
import { dealDamage, addShield } from './damage.js';
import { applyStatus } from './status.js';
import { alliesOf } from './targeting.js';

const SKILL_SLOT = new Set(['s1', 's2', 's3']);
const ks = (e) => (e.emblem ? KEYSTONES[e.emblem.key] : null);
const st = (e) => (e.emState ||= {});

/** Nét phụ có kind (Săn Mồi): tăng sát thương lên tướng địch máu thấp. Trả lượng mới. */
export function emblemDeal(world, src, tgt, amount) {
  if (tgt.kind !== 'hero' || tgt.team === src.team) return amount;
  for (const id of src.emblem.minors || []) {
    const m = MINORS[id];
    if (m?.kind === 'executeAmp' && tgt.hp < tgt.stats.maxHp * m.below) amount *= 1 + m.pct;
  }
  return amount;
}

/** Phù hiệu chính của người gây sát thương (đã trừ máu `got` > 0). */
export function emblemAfter(world, src, tgt, got, type, opts) {
  const k = ks(src); if (!k || opts.dot || opts.reflect || opts.emblem || src.team === tgt.team) return;
  const s = st(src), now = world.tick;
  if (k.kind === 'triHit') {
    if (tgt.kind !== 'hero') return;
    if (s.triT !== tgt.id || now > (s.triUntil ?? -1)) { s.triT = tgt.id; s.triN = 0; s.triLast = -99999; }
    if (now - s.triLast < T(k.gap)) return; // hai đòn sát nhau (cùng một chiêu nhiều tia) tính một
    s.triN++; s.triLast = now; s.triUntil = now + T(k.window);
    if (s.triN < k.hits || now < (s.triCd || 0)) return;
    s.triN = 0; s.triCd = now + T(k.cd);
    const bonusAd = Math.max(0, src.stats.atk - src.stats.baseAtk), ap = src.stats.ap || 0;
    const amt = k.base + k.perLevel * (src.level - 1) + k.adBonus * bonusAd + k.ap * ap;
    world.emit('emblem', { id: src.id, key: src.emblem.key, kind: k.kind, target: tgt.id, x: tgt.pos.x, y: tgt.pos.y });
    dealDamage(world, src, tgt, amt, bonusAd >= ap ? 'physical' : 'magic', { emblem: true });
  } else if (k.kind === 'ramp') {
    if (!opts.basic || (tgt.kind !== 'hero' && tgt.kind !== 'monster')) return;
    const n = now < (s.rampUntil || 0) ? Math.min(k.max, (s.rampN || 0) + 1) : 1;
    if (n === 1) s.rampMax = false;
    s.rampN = n; s.rampUntil = now + T(k.duration);
    applyStatus(world, src, { status: 'statMod', id: 'em_ramp', atkSpeedPct: k.asPer * n, atkPct: n >= k.max ? k.atkPctMax : 0, duration: k.duration }, src);
    if (n >= k.max && !s.rampMax) { s.rampMax = true; world.emit('emblem', { id: src.id, key: src.emblem.key, kind: k.kind, target: tgt.id, x: src.pos.x, y: src.pos.y }); }
  } else if (k.kind === 'ward') {
    if (!SKILL_SLOT.has(opts.slot) || tgt.kind !== 'hero' || now < (s.wardCd || 0)) return;
    const pool = [src, ...alliesOf(world, src, k.radius).filter((a) => a.kind === 'hero')];
    const a = pool.reduce((b, x) => { const r = x.hp / x.stats.maxHp, rb = b.hp / b.stats.maxHp; return r < rb || (r === rb && x.id < b.id) ? x : b; });
    s.wardCd = now + T(k.cd);
    addShield(world, a, k.base + k.perLevel * (src.level - 1) + k.ap * (src.stats.ap || 0), k.duration, 'em_ward', src);
    world.emit('emblem', { id: src.id, key: src.emblem.key, kind: k.kind, target: a.id, x: a.pos.x, y: a.pos.y });
  }
}

/** Phù hiệu chính của người bị đánh (Mai Rùa): tướng địch đánh lúc máu thấp → khiên. */
export function emblemTaken(world, tgt, src) {
  const k = ks(tgt); if (!k || k.kind !== 'guard') return;
  if (src?.kind !== 'hero' || src.team === tgt.team || !tgt.alive || tgt.hp >= tgt.stats.maxHp * k.below) return;
  const s = st(tgt); if (world.tick < (s.guardCd || 0)) return;
  s.guardCd = world.tick + T(k.cd);
  addShield(world, tgt, k.base + k.hpPct * tgt.stats.maxHp, k.duration, 'em_guard', tgt);
  world.emit('emblem', { id: tgt.id, key: tgt.emblem.key, kind: k.kind, target: tgt.id, x: tgt.pos.x, y: tgt.pos.y });
}
