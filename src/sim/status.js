import { T } from './util.js';
import { COMBAT_EXTRA } from '../data/economy.js';

// Hiệu ứng (04 §3). Mỗi status: { id, kind, until, ...dữ liệu }. Thời gian theo tick.
const HARD = new Set(['stun', 'knockup', 'stasis', 'suppress']); // stasis: bất động, không hành động (05 §8); suppress: áp chế (Giải Trói không gỡ)
// noDash: không lướt / Chớp Bước được (Lãnh Địa Bóng, Vòng Kết Giới); blind: đòn đánh thường có tỉ lệ trượt (Hào Quang Sân Khấu)
// weaken: giảm sát thương gây ra (Bùa Mỏi) — là khống chế (miễn khống chế chặn, Giải Trói gỡ, kháng hiệu ứng rút ngắn) nhưng KHÔNG phải khống chế cứng
const CC = new Set(['stun', 'knockup', 'root', 'slow', 'silence', 'taunt', 'noDash', 'blind', 'suppress', 'weaken']);
const TENACITY = new Set(['stun', 'root', 'slow', 'silence', 'taunt', 'weaken']); // cố ý không có 'suppress': áp chế giữ đủ thời gian (04 §3)
// chống khoá chết (04 §3): CHAIN_COUNT cộng vào chuỗi khống chế cứng liên tiếp (stasis là của chính mình — không tính); CHAIN_CUT bị giảm khi chuỗi đã
// quá ngưỡng. Hất tung (gắn với chuyển động / hoạt ảnh) và áp chế (giữ đủ thời gian) chỉ tính vào chuỗi, không bị giảm.
const CHAIN_COUNT = new Set(['stun', 'knockup', 'suppress']), CHAIN_CUT = new Set(['stun', 'root', 'silence', 'taunt']);
/** Cửa sổ giảm khống chế đang mở của mục tiêu (tick bắt đầu chuỗi + ngưỡng → + cửa sổ). */
const chainWindow = (e, now) => { const c = e.ccChain, C = COMBAT_EXTRA.ccChain; return c && c.end - c.start > T(C.max) && now >= c.start + T(C.max) && now < c.start + T(C.max + C.window); };
/** Khống chế gỡ được (Giải Trói, kỹ năng giải khống chế): hất tung đang diễn ra và áp chế thì giữ nguyên (05 §6). */
export const CLEANSE_KINDS = ['stun', 'root', 'slow', 'silence', 'taunt', 'noDash', 'blind', 'weaken'];

/** Áp hiệu ứng. spec: {status, duration(giây), pct, ...}; id tuỳ chọn để thay thế bản cũ cùng id. */
export function applyStatus(world, target, spec, src) {
  if (!target.alive || target.structure) return null; // công trình miễn nhiễm hiệu ứng
  const kind = spec.status, id = spec.id || kind;
  if (CC.has(kind) && target.statuses.some((x) => x.kind === 'ccImmune')) return null;
  if (src && src.team !== target.team && kind !== 'stasis' && target.statuses.some((x) => x.kind === 'stasis')) return null; // Sương Đông: hiệu ứng của địch không bám
  let dur = TENACITY.has(kind) ? (spec.duration ?? 0) * (1 - (target.stats?.tenacity || 0)) : spec.duration ?? 0; // kháng hiệu ứng rút ngắn khống chế
  const now = world.tick, hostile = !src || src.team !== target.team;
  if (hostile && CHAIN_CUT.has(kind) && chainWindow(target, now)) { dur *= COMBAT_EXTRA.ccChain.mul; world.emit('ccResist', { id: target.id, kind }); }
  const s = { ...spec, kind, id, src: src?.id, t0: now, until: now + T(dur) }; // t0: lúc áp (thanh thời gian khống chế trên HUD)
  if (hostile && CHAIN_COUNT.has(kind) && dur > 0) { // chuỗi liên tiếp: nối khi khống chế mới bắt đầu lúc khống chế cứng trước chưa hết
    const c = target.ccChain;
    if (c && now <= c.end) c.end = Math.max(c.end, s.until); else target.ccChain = { start: now, end: s.until };
  }
  delete s.status;
  const i = target.statuses.findIndex((x) => x.id === id);
  if (i >= 0) {
    const old = target.statuses[i];
    if ((kind === 'slow' || kind === 'haste') && old.pct > s.pct) { old.until = Math.max(old.until, s.until); return old; }
    target.statuses[i] = s;
  } else target.statuses.push(s);
  if (kind === 'knockup') world.emit('knockup', { id: target.id, dur: spec.duration });
  world.emit('status', { id: target.id, kind });
  return s;
}
export const removeStatus = (target, id) => { target.statuses = target.statuses.filter((s) => s.id !== id && s.kind !== id); };
export const hasStatus = (e, idOrKind) => e.statuses.some((s) => s.id === idOrKind || s.kind === idOrKind);
export const isHardCC = (e) => e.statuses.some((s) => HARD.has(s.kind));
export const isRooted = (e) => isHardCC(e) || e.statuses.some((s) => s.kind === 'root');
export const isSilenced = (e) => isHardCC(e) || e.statuses.some((s) => s.kind === 'silence');
export const isStealthed = (e) => e.statuses.some((s) => s.kind === 'stealth');
export const isUntargetable = (e) => e.statuses.some((s) => s.kind === 'untargetable' || s.kind === 'stasis');
export const isInvulnerable = (e) => e.statuses.some((s) => s.kind === 'stasis' || s.kind === 'invuln');
export const tauntSource = (e) => e.statuses.find((s) => s.kind === 'taunt')?.src ?? null;
export const cannotDash = (e) => e.statuses.some((s) => s.kind === 'noDash');
export const isSuppressed = (e) => e.statuses.some((s) => s.kind === 'suppress');
export const isLocked = (e) => e.statuses.some((s) => s.kind === 'suppress' || s.kind === 'stasis'); // khoá hoàn toàn: không chiêu / phép / đồ / Hồi Máu / Biến về
export const isCcImmune = (e) => e.statuses.some((s) => s.kind === 'ccImmune');
/** Tỉ lệ trượt đòn đánh thường (hiệu ứng blind lớn nhất). */
export const missChance = (e) => e.statuses.reduce((m, s) => (s.kind === 'blind' ? Math.max(m, s.miss || 0) : m), 0);

/** Hết hạn, tick sát thương/hồi theo thời gian (2 lần/giây), khiên hết hạn. */
export function updateStatuses(world, e, dealDamage, heal) {
  const now = world.tick;
  for (const s of e.statuses) {
    if (s.kind === 'dot' && now % 15 === 0 && now < s.until) dealDamage(world, world.byId(s.src), e, s.dps / 2, s.type || 'magic', { dot: true });
    if (s.kind === 'hot' && now % 15 === 0 && now < s.until) { const hps = s.hps ?? (s.hpsPct || 0) * e.stats.maxHp; if (heal) heal(world, e, hps / 2, world.byId?.(s.src)); else e.hp = Math.min(e.stats.maxHp, e.hp + hps / 2); } // hpsPct: hồi theo % HP tối đa mỗi giây
  }
  e.statuses = e.statuses.filter((s) => s.until > now);
  e.shields = e.shields.filter((s) => s.until > now && s.amount > 0);
}
