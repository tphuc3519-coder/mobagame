// Áp chế (04 §3): một SỢI XÍCH nối người gây và mục tiêu, không chỉ là một trạng thái. Sợi xích giữ trạng thái `suppress` trên mục tiêu
// (không di chuyển / đánh / chiêu / phép / đồ / Hồi Máu / Biến về; không giảm bởi kháng hiệu ứng; Giải Trói / Châm Cứu không gỡ; miễn khống
// chế và Sương Đông chặn) và — khi `channel` (mặc định) — giữ luôn người gây đứng niệm: không đi, không đánh, không tung chiêu; tự dùng phép /
// đồ / Biến về thì thả xích (commands.js). Xích đứt khi: hết giờ (ok = true → hiệu ứng `atEnd` của chiêu), một trong hai chết, mục tiêu không
// còn mang trạng thái, kéo giãn quá breakRange, hoặc người gây (đang niệm) bị khống chế cứng / câm lặng / khiêu khích / bị cắt chiêu.
// Không gọi gì của module khác ở cấp module (chỉ đọc hằng số) — chuỗi import skills → suppress → effects → movement → skills vẫn an toàn.
import { T, dist } from './util.js';
import { applyStatus, isSilenced, tauntSource } from './status.js';
import { interrupt } from './effects.js';
import { COMBAT_EXTRA } from '../data/economy.js';

const PAD = COMBAT_EXTRA.suppress.pad;

/** Bắt đầu áp chế `t`. o: { duration (giây), channel = true, breakRange = Infinity, slot, item, via, every (tick), onTick, onEnd(ok) }.
 *  Trả sợi xích, hoặc null khi không áp được (đồng đội, công trình, đã chết, miễn khống chế, Sương Đông). */
export function startSuppress(world, src, t, o = {}) {
  if (!src?.alive || !t?.alive || t.structure || src.team === t.team) return null;
  const st = applyStatus(world, t, { status: 'suppress', id: 'suppress_' + src.id, duration: o.duration + PAD }, src);
  if (!st) return null;
  interrupt(world, t); // mất chiêu đang vung, dừng lướt, huỷ Biến về
  const every = o.every || 0;
  const link = { id: (world.supSeq = (world.supSeq || 0) + 1), src: src.id, target: t.id, start: world.tick, until: world.tick + T(o.duration), channel: o.channel !== false,
    intr: src.interrupts || 0, breakRange: o.breakRange ?? Infinity, every, next: world.tick + every, onTick: o.onTick || null, onEnd: o.onEnd || null, alive: true };
  if (link.channel) {
    src.channel = { link: link.id, start: link.start, until: link.until, target: t.id };
    src.dash = null; src.castUntil = link.until;
    src.facing = src.castFacing = Math.atan2(t.pos.y - src.pos.y, t.pos.x - src.pos.x);
  }
  (world.suppressions ||= []).push(link);
  world.emit('suppress', { id: src.id, target: t.id, dur: o.duration, slot: o.slot ?? null, item: !!o.item, via: o.via ?? null });
  return link;
}

/** Kết thúc sợi xích: gỡ trạng thái trên mục tiêu, thả người gây, gọi onEnd(ok). */
export function endSuppress(world, link, ok) {
  if (!link.alive) return;
  link.alive = false;
  const t = world.byId(link.target), s = world.byId(link.src);
  if (t) t.statuses = t.statuses.filter((x) => !(x.kind === 'suppress' && x.src === link.src));
  if (link.channel && s && s.channel?.link === link.id) { s.channel = null; if (s.castUntil > world.tick) s.castUntil = world.tick; }
  world.emit('suppressEnd', { id: link.src, target: link.target, ok });
  link.onEnd?.(ok);
}

/** Mỗi tick (sau di chuyển): hết giờ trước, rồi các điều kiện đứt, rồi nhịp sát thương (dây bóng). */
export function updateSuppressions(world) {
  if (!world.suppressions?.length) return;
  for (const l of [...world.suppressions]) {
    if (!l.alive) continue;
    if (world.tick >= l.until) { endSuppress(world, l, true); continue; }
    const s = world.byId(l.src), t = world.byId(l.target);
    const held = !!t && t.statuses.some((x) => x.kind === 'suppress' && x.src === l.src);
    if (!s?.alive || !t?.alive || !held || dist(s.pos, t.pos) > l.breakRange || (l.channel && (isSilenced(s) || tauntSource(s) != null || (s.interrupts || 0) !== l.intr))) { endSuppress(world, l, false); continue; }
    if (l.onTick && l.every && world.tick >= l.next) { l.next += l.every; l.onTick(); }
  }
  world.suppressions = world.suppressions.filter((l) => l.alive);
}

/** Người đang niệm giữ xích tự dùng phép / đồ / Biến về: thả xích (không có hiệu ứng cuối). */
export function cancelChannel(world, e) {
  const l = world.suppressions?.find((x) => x.alive && x.channel && x.src === e.id);
  if (l) endSuppress(world, l, false);
}

export const isChanneling = (world, e) => !!e.channel && world.tick < e.channel.until;
