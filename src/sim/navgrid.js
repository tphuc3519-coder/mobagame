// Lưới đi được ô 80 đơn vị, dựng từ tường và biên bản đồ lúc tải (02 §8).
export const CELL = 80;

export function buildNavGrid(map) {
  const cols = Math.ceil(map.w / CELL), rows = Math.ceil(map.h / CELL);
  const blocked = new Uint8Array(cols * rows);
  const block = (x0, y0, x1, y1) => {
    for (let cy = Math.floor(y0 / CELL); cy <= Math.floor((y1 - 1e-6) / CELL); cy++) for (let cx = Math.floor(x0 / CELL); cx <= Math.floor((x1 - 1e-6) / CELL); cx++) if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) blocked[cy * cols + cx] = 1;
  };
  // ngoài đường là rừng/tường: chỉ đường (kể cả khe hở tường dẫn vào bãi quái ở Mốc sau) là đi được
  if (map.road) {
    const yMin = map.road.y - map.road.width / 2, yMax = map.road.y + map.road.width / 2;
    block(0, 0, map.w, yMin); block(0, yMax, map.w, map.h);
  } else { // 5v5: viền ngoài + tường (đánh dấu ô có tâm gần đoạn tường)
    const m = map.margin || 0; block(0, 0, map.w, m); block(0, map.h - m, map.w, map.h); block(0, 0, m, map.h); block(map.w - m, 0, map.w, map.h);
    for (const w of map.walls?.segs || []) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, n = Math.ceil(Math.sqrt(L2) / (CELL / 2));
      for (let i = 0; i <= n; i++) { const t = i / n; block(w.x1 + dx * t - map.walls.thickness / 2, w.y1 + dy * t - map.walls.thickness / 2, w.x1 + dx * t + map.walls.thickness / 2, w.y1 + dy * t + map.walls.thickness / 2); }
    }
  }
  // các khe hở tường mở lối ra ngoài đường (Mốc 6 dùng cho bãi quái): chưa mở ở Mốc 3
  return { cols, rows, blocked, map, isBlocked: (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx < 0 || cy < 0 || cx >= cols || cy >= rows || blocked[cy * cols + cx] === 1; } };
}
