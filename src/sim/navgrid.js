// Lưới đi được ô 80 đơn vị, dựng từ tường và biên bản đồ lúc tải (02 §8).
export const CELL = 80;

export function buildNavGrid(map) {
  const cols = Math.ceil(map.w / CELL), rows = Math.ceil(map.h / CELL);
  const blocked = new Uint8Array(cols * rows);
  const block = (x0, y0, x1, y1) => {
    for (let cy = Math.floor(y0 / CELL); cy <= Math.floor((y1 - 1e-6) / CELL); cy++) for (let cx = Math.floor(x0 / CELL); cx <= Math.floor((x1 - 1e-6) / CELL); cx++) if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) blocked[cy * cols + cx] = 1;
  };
  // ngoài đường là rừng/tường: chỉ đường (kể cả khe hở tường dẫn vào bãi quái ở Mốc sau) là đi được
  const yMin = map.road.y - map.road.width / 2, yMax = map.road.y + map.road.width / 2;
  block(0, 0, map.w, yMin); block(0, yMax, map.w, map.h);
  // các khe hở tường mở lối ra ngoài đường (Mốc 6 dùng cho bãi quái): chưa mở ở Mốc 3
  return { cols, rows, blocked, map, isBlocked: (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx < 0 || cy < 0 || cx >= cols || cy >= rows || blocked[cy * cols + cx] === 1; } };
}
