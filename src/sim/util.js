import { TICK } from '../core/loop.js';
/** Giây → tick. */
export const T = (sec) => Math.max(0, Math.round(sec / TICK));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (x, y) => { const l = Math.hypot(x, y); return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; };
export const dirTo = (a, b) => norm(b.x - a.x, b.y - a.y);
/** Giữ điểm trong bản đồ và trong đường. */
export function clampToMap(map, p, r = 0) {
  const yMin = map.road.y - map.road.width / 2 + r, yMax = map.road.y + map.road.width / 2 - r;
  p.x = Math.min(map.w - r, Math.max(r, p.x)); p.y = Math.min(yMax, Math.max(yMin, p.y));
  return p;
}
