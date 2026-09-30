import { T } from './util.js';

// Hiệu ứng (04 §3). Mỗi status: { id, kind, until, ...dữ liệu }. Thời gian theo tick.
const HARD = new Set(['stun', 'knockup']);

/** Áp hiệu ứng. spec: {status, duration(giây), pct, ...}; id tuỳ chọn để thay thế bản cũ cùng id. */
export function applyStatus(world, target, spec, src) {
  if (!target.alive) return null;
  const kind = spec.status, id = spec.id || kind;
  const s = { ...spec, kind, id, src: src?.id, until: world.tick + T(spec.duration ?? 0) };
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
export const isUntargetable = (e) => e.statuses.some((s) => s.kind === 'untargetable');
export const tauntSource = (e) => e.statuses.find((s) => s.kind === 'taunt')?.src ?? null;

/** Hết hạn, tick sát thương/hồi theo thời gian (2 lần/giây), khiên hết hạn. */
export function updateStatuses(world, e, dealDamage) {
  const now = world.tick;
  for (const s of e.statuses) {
    if (s.kind === 'dot' && now % 15 === 0 && now < s.until) dealDamage(world, world.byId(s.src), e, s.dps / 2, s.type || 'magic', { dot: true });
    if (s.kind === 'hot' && now % 15 === 0 && now < s.until) e.hp = Math.min(e.stats.maxHp, e.hp + s.hps / 2);
  }
  e.statuses = e.statuses.filter((s) => s.until > now);
  e.shields = e.shields.filter((s) => s.until > now && s.amount > 0);
}
