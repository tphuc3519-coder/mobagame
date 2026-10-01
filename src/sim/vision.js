// Tầm nhìn kiểu Liên Quân Mobile: sương mù chiến trường. Đội chỉ thấy đơn vị địch khi
//  - có đơn vị phe mình (tướng 1300, lính 900, trụ 1100, nhà chính 1300) trong tầm nhìn và không bị tường chắn; HOẶC
//  - đơn vị địch vừa tấn công/dùng chiêu gây sát thương (lộ `reveal` giây); HOẶC
//  - nó đang trong bụi cỏ thì chỉ thấy khi có đơn vị phe mình đứng cùng bụi (hoặc sát bên, dưới 220).
// Công trình luôn hiện (bản đồ đã biết). Kết quả ghi vào e.seenBy[team] (cập nhật mỗi 3 tick); nơi nào cần "thấy được" thì hỏi canSee/canTarget.
// Chỉ bật khi map.vision có khai báo (bản 5v5); bản 1v1 hiện mọi thứ như cũ.
import { dist } from './util.js';
import { isTargetable } from './targeting.js';

export const SIGHT = { hero: 1300, minion: 900, tower: 1100, core: 1300, fountain: 900 };
const REVEAL_TICKS = 45, EVERY = 3;

/** Danh sách bụi (đã đối xứng) với nửa kích thước; tính một lần cho mỗi map. */
function bushesOf(map) {
  if (map._bushes) return map._bushes;
  return (map._bushes = (map.bushes || []).flatMap((b) => [b, { ...b, ...map.mirror(b.x, b.y) }]).map((b, i) => ({ id: i, x: b.x, y: b.y, hw: b.w / 2, hh: b.h / 2 })));
}
export const bushAt = (map, p) => bushesOf(map).find((b) => Math.abs(p.x - b.x) <= b.hw && Math.abs(p.y - b.y) <= b.hh) || null;

/** Đoạn a→b có cắt tường (capsule) không — dò thô theo từng 150 đơn vị. */
function blocked(map, a, b) {
  const segs = map.walls?.segs; if (!segs) return false;
  const half = map.walls.thickness / 2, n = Math.max(1, Math.ceil(dist(a, b) / 150));
  for (let i = 1; i < n; i++) {
    const x = a.x + (b.x - a.x) * (i / n), y = a.y + (b.y - a.y) * (i / n);
    for (const w of segs) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L2));
      if (Math.hypot(x - (w.x1 + dx * t), y - (w.y1 + dy * t)) < half) return true;
    }
  }
  return false;
}

const sightOf = (e) => (e.kind === 'hero' ? SIGHT.hero : e.kind === 'minion' ? SIGHT.minion : SIGHT[e.kind] || 0);

export function updateVision(world) {
  const map = world.map;
  if (!map.vision || world.tick % EVERY) return;
  const ents = world.entities, bushes = bushesOf(map);
  const bushOf = new Map(); // entity.id → bụi đang đứng (hoặc null), chỉ tính cho tướng/lính
  for (const e of ents) if (e.alive && !e.structure) bushOf.set(e.id, bushes.find((b) => Math.abs(e.pos.x - b.x) <= b.hw && Math.abs(e.pos.y - b.y) <= b.hh) || null);
  const viewers = [[], []];
  for (const e of ents) if (e.alive && !e.noTarget && sightOf(e) && (e.team === 0 || e.team === 1)) viewers[e.team].push(e);
  for (const e of ents) {
    if (!e.seenBy) e.seenBy = [true, true];
    if (e.structure || !e.alive) { e.seenBy = [true, true]; continue; }
    const bush = bushOf.get(e.id), revealed = (e.revealUntil || 0) > world.tick;
    for (const team of [0, 1]) {
      if (e.team === team || revealed) { e.seenBy[team] = true; continue; }
      let seen = false;
      for (const v of viewers[team]) {
        const d = dist(v.pos, e.pos);
        if (d > sightOf(v)) continue;
        if (bush) { if (bushOf.get(v.id) === bush || d < 220) { seen = true; break; } continue; } // trong bụi: chỉ thấy khi cùng bụi hoặc sát bên
        if (d < 250 || !blocked(map, v.pos, e.pos)) { seen = true; break; }
      }
      e.seenBy[team] = seen;
    }
  }
}

/** Đơn vị bị lộ `REVEAL_TICKS` tick khi gây sát thương cho phe địch (gọi từ dealDamage). */
export function revealOnAttack(world, src, tgt) {
  if (!world.map.vision || !src || src.structure || src.team === tgt.team) return;
  src.revealUntil = world.tick + REVEAL_TICKS;
}

/** `viewer` có thấy `t` không (không có vision thì luôn thấy). */
export const canSee = (viewerTeam, t) => t.team === viewerTeam || !t.seenBy || t.seenBy[viewerTeam] !== false;
/** Chọn làm mục tiêu: hợp lệ và thấy được. Chiêu có vùng/đạn vẫn trúng đơn vị ẩn (dùng isTargetable). */
export const canTarget = (viewer, t) => isTargetable(viewer, t) && canSee(viewer.team, t);
