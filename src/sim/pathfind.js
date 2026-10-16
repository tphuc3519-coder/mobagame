import { CELL } from './navgrid.js';

// A* 8 hướng + làm mượt bằng kiểm tra đường thẳng (string pulling), cache theo (ô đầu, ô cuối) — 02 §8.
// Bản cũ sắp xếp lại cả danh sách mở mỗi bước: tìm xa / đích không tới được mất tới 300 ms một tick (cả trận khựng khi bot gỡ kẹt).
// Nay: đống nhị phân trên mảng số dùng lại giữa các lần tìm (bằng điểm thì ô vào trước ra trước), A* có trọng số (h × 2: mở ít ô hơn
// nhiều, đường dài hơn tối ưu ~1%) và giới hạn 1500 ô mở rộng (quá thì coi như không có đường — bot đi thẳng như trước): một lần tìm
// tối đa vài ms. Kết quả cả "không có đường" cũng được nhớ (lưới không đổi trong trận), tối đa 256 cặp ô.
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
const H_WEIGHT = 2, MAX_EXPAND = 1500, CACHE_MAX = 256;

export function lineClear(grid, a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (grid.isBlocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; }
  return true;
}

/** Mảng tạm của lưới (tạo một lần): điểm g, ô cha, dấu lượt tìm (khỏi xoá mảng mỗi lần), đống nhị phân (điểm f, thứ tự vào, ô). */
function scratch(grid) {
  if (grid.astar) return grid.astar;
  const n = grid.cols * grid.rows;
  return (grid.astar = { g: new Float64Array(n), par: new Int32Array(n), seen: new Uint32Array(n), done: new Uint32Array(n), run: 0, f: new Float64Array(4096), s: new Uint32Array(4096), c: new Int32Array(4096) });
}

export function findPath(grid, from, to) {
  const { cols, rows } = grid;
  const sx = Math.floor(from.x / CELL), sy = Math.floor(from.y / CELL), gx = Math.floor(to.x / CELL), gy = Math.floor(to.y / CELL);
  if (grid.isBlocked(to.x, to.y)) return null;
  if (lineClear(grid, from, to)) return [{ x: to.x, y: to.y }];
  const key = `${sx},${sy},${gx},${gy}`;
  grid.cache ||= new Map();
  if (grid.cache.has(key)) { const c = grid.cache.get(key); return c && c.map((p) => ({ ...p })); }
  const A = scratch(grid), run = ++A.run, { g, par, seen, done } = A;
  let hf = A.f, hs = A.s, hc = A.c, size = 0, seq = 0;
  const less = (i, j) => hf[i] < hf[j] || (hf[i] === hf[j] && hs[i] < hs[j]);
  const swap = (i, j) => { const f = hf[i], s = hs[i], c = hc[i]; hf[i] = hf[j]; hs[i] = hs[j]; hc[i] = hc[j]; hf[j] = f; hs[j] = s; hc[j] = c; };
  const push = (f, cell) => {
    if (size === hf.length) { const grow = (a, T) => { const b = new T(a.length * 2); b.set(a); return b; }; A.f = hf = grow(hf, Float64Array); A.s = hs = grow(hs, Uint32Array); A.c = hc = grow(hc, Int32Array); }
    let i = size++; hf[i] = f; hs[i] = seq++; hc[i] = cell;
    while (i > 0) { const p = (i - 1) >> 1; if (!less(i, p)) break; swap(i, p); i = p; }
  };
  const pop = () => {
    const top = hc[0]; size--;
    if (size > 0) {
      hf[0] = hf[size]; hs[0] = hs[size]; hc[0] = hc[size];
      let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < size && less(l, m)) m = l; if (r < size && less(r, m)) m = r; if (m === i) break; swap(i, m); i = m; }
    }
    return top;
  };
  const idx = (x, y) => y * cols + x, start = idx(sx, sy), goal = idx(gx, gy);
  const getG = (i) => (seen[i] === run ? g[i] : Infinity);
  g[start] = 0; seen[start] = run; push(0, start);
  let found = false, expanded = 0;
  while (size) {
    const i = pop();
    if (done[i] === run) continue; done[i] = run;
    if (i === goal) { found = true; break; }
    if (++expanded > MAX_EXPAND) break;
    const x = i % cols, y = (i - x) / cols, gi = g[i];
    for (const [dx, dy, c] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid.blocked[idx(nx, ny)]) continue;
      if (dx && dy && (grid.blocked[idx(x + dx, y)] || grid.blocked[idx(x, y + dy)])) continue; // không cắt góc
      const ni = idx(nx, ny), ng = gi + c;
      if (ng < getG(ni)) { g[ni] = ng; seen[ni] = run; par[ni] = i; push(ng + H_WEIGHT * Math.hypot(nx - gx, ny - gy), ni); }
    }
  }
  const remember = (v) => { if (grid.cache.size >= CACHE_MAX) grid.cache.delete(grid.cache.keys().next().value); grid.cache.set(key, v); };
  if (!found) { remember(null); return null; }
  let pts = [], cur = goal;
  while (cur !== start) { pts.push({ x: (cur % cols) * CELL + CELL / 2, y: Math.floor(cur / cols) * CELL + CELL / 2 }); cur = par[cur]; }
  pts.reverse(); pts[pts.length - 1] = { x: to.x, y: to.y };
  const out = []; let anchor = { ...from };
  for (let i = 0; i < pts.length; i++) {
    if (i + 1 < pts.length && lineClear(grid, anchor, pts[i + 1])) continue;
    out.push(pts[i]); anchor = pts[i];
  }
  remember(out.map((p) => ({ ...p })));
  return out;
}
