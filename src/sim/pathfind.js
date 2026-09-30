import { CELL } from './navgrid.js';

// A* 8 hướng + làm mượt bằng kiểm tra đường thẳng (string pulling), cache theo (ô đầu, ô cuối) — 02 §8.
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

export function lineClear(grid, a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (grid.isBlocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; }
  return true;
}

export function findPath(grid, from, to) {
  const { cols, rows } = grid;
  const sx = Math.floor(from.x / CELL), sy = Math.floor(from.y / CELL), gx = Math.floor(to.x / CELL), gy = Math.floor(to.y / CELL);
  if (grid.isBlocked(to.x, to.y)) return null;
  if (lineClear(grid, from, to)) return [{ x: to.x, y: to.y }];
  const key = `${sx},${sy},${gx},${gy}`;
  grid.cache ||= new Map();
  if (grid.cache.has(key)) return grid.cache.get(key).map((p) => ({ ...p }));
  const idx = (x, y) => y * cols + x;
  const g = new Map([[idx(sx, sy), 0]]), from2 = new Map(), open = [[0, sx, sy]], closed = new Set();
  const h = (x, y) => Math.hypot(x - gx, y - gy);
  let found = false;
  while (open.length) {
    open.sort((p, q) => p[0] - q[0]);
    const [, x, y] = open.shift(), i = idx(x, y);
    if (closed.has(i)) continue; closed.add(i);
    if (x === gx && y === gy) { found = true; break; }
    for (const [dx, dy, c] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid.blocked[idx(nx, ny)]) continue;
      if (dx && dy && (grid.blocked[idx(x + dx, y)] || grid.blocked[idx(x, y + dy)])) continue; // không cắt góc
      const ni = idx(nx, ny), ng = g.get(i) + c;
      if (ng < (g.get(ni) ?? Infinity)) { g.set(ni, ng); from2.set(ni, i); open.push([ng + h(nx, ny), nx, ny]); }
    }
  }
  if (!found) return null;
  let pts = [], cur = idx(gx, gy);
  while (cur !== idx(sx, sy)) { pts.push({ x: (cur % cols) * CELL + CELL / 2, y: Math.floor(cur / cols) * CELL + CELL / 2 }); cur = from2.get(cur); }
  pts.reverse(); pts[pts.length - 1] = { x: to.x, y: to.y };
  const out = []; let anchor = { ...from };
  for (let i = 0; i < pts.length; i++) {
    if (i + 1 < pts.length && lineClear(grid, anchor, pts[i + 1])) continue;
    out.push(pts[i]); anchor = pts[i];
  }
  grid.cache.set(key, out.map((p) => ({ ...p })));
  return out;
}
