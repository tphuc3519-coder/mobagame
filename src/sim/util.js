import { TICK } from '../core/loop.js';
/** Giây → tick. */
export const T = (sec) => Math.max(0, Math.round(sec / TICK));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (x, y) => { const l = Math.hypot(x, y); return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; };
export const dirTo = (a, b) => norm(b.x - a.x, b.y - a.y);
// Lưới tra nhanh tường (bản 5v5 có hàng trăm đoạn tường; mỗi tick mỗi lính/tướng/đạn đều gọi clampToMap — trước đây duyệt hết từng đoạn,
// chiếm ~1/3 thời gian mô phỏng): mỗi ô CELL×CELL giữ chỉ số các đoạn có thể chạm một điểm trong ô (khối bao nở thêm nửa bề dày + RMAX).
const CELL = 512, RMAX = 260, GRIDS = new WeakMap();
function wallGrid(map, segs) {
  let g = GRIDS.get(segs); if (g) return g;
  const nx = Math.ceil(map.w / CELL) + 1, ny = Math.ceil(map.h / CELL) + 1, cells = Array.from({ length: nx * ny }, () => []);
  const cl = (v, n) => Math.min(n - 1, Math.max(0, v));
  segs.forEach((w, i) => {
    const pad = (w.w ?? map.walls.thickness) / 2 + RMAX + 1;
    const x0 = cl(Math.floor((Math.min(w.x1, w.x2) - pad) / CELL), nx), x1 = cl(Math.floor((Math.max(w.x1, w.x2) + pad) / CELL), nx);
    const y0 = cl(Math.floor((Math.min(w.y1, w.y2) - pad) / CELL), ny), y1 = cl(Math.floor((Math.max(w.y1, w.y2) + pad) / CELL), ny);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) cells[cy * nx + cx].push(i);
  });
  g = { nx, ny, cells }; GRIDS.set(segs, g); return g;
}
/** Giữ điểm trong bản đồ: bản 1v1 giữ trong đường; bản 5v5 giữ trong viền và đẩy ra khỏi tường (capsule dày). */
export function clampToMap(map, p, r = 0) {
  if (map.road) {
    const yMin = map.road.y - map.road.width / 2 + r, yMax = map.road.y + map.road.width / 2 - r;
    p.x = Math.min(map.w - r, Math.max(r, p.x)); p.y = Math.min(yMax, Math.max(yMin, p.y));
    return p;
  }
  const m = (map.margin || 0) + r;
  p.x = Math.min(map.w - m, Math.max(m, p.x)); p.y = Math.min(map.h - m, Math.max(m, p.y));
  const segs = map.walls?.segs; if (!segs) return p;
  if (r <= RMAX) { // đường tắt: không đoạn nào gần điểm thì kết quả y hệt vòng đầy đủ (không đẩy gì) — có đoạn chạm thì chạy vòng đầy đủ bên dưới
    const g = wallGrid(map, segs), list = g.cells[Math.floor(p.y / CELL) * g.nx + Math.floor(p.x / CELL)];
    if (list) {
      let hit = false;
      for (let k = 0; k < list.length && !hit; k++) {
        const w = segs[list[k]], half = (w.w ?? map.walls.thickness) / 2 + r, dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / L2));
        hit = Math.hypot(p.x - (w.x1 + dx * t), p.y - (w.y1 + dy * t)) < half - 0.01;
      }
      if (!hit) return p;
    }
  }
  // lặp vài lượt: ở góc hai tảng đá giao nhau, đẩy ra khỏi tảng này có thể lọt vào tảng kia (trước đây tướng lách được vào góc)
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const w of segs) {
      const half = (w.w ?? map.walls.thickness) / 2 + r, dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / L2)), cx = w.x1 + dx * t, cy = w.y1 + dy * t, ox = p.x - cx, oy = p.y - cy, d = Math.hypot(ox, oy);
      if (d < half - 0.01) { moved = true; const k = d > 1e-3 ? half / d : 0; if (k) { p.x = cx + ox * k; p.y = cy + oy * k; } else { p.x = cx - dy / Math.sqrt(L2) * half; p.y = cy + dx / Math.sqrt(L2) * half; } }
    }
    if (!moved) break;
  }
  return p;
}
