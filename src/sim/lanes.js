// Hình học đường: đường là đường gấp khúc từ nhà chính Xanh tới nhà chính Đỏ (map.lanes[i].pts).
// Dùng cho lính (đi theo đường) và bot (đứng đúng vị trí trên đường).
const cache = new Map();

/** Đường đã định hướng cho `team` (Xanh đi xuôi, Đỏ đi ngược), kèm độ dài cộng dồn. */
export function lanePath(map, laneIdx, team) {
  const key = `${map.id}:${laneIdx}:${team}`;
  let p = cache.get(key); if (p) return p;
  const src = map.lanes[laneIdx].pts, pts = (team === 0 ? src : src.slice().reverse()).map(([x, y]) => ({ x, y }));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  p = { pts, cum, length: cum[cum.length - 1], width: map.lanes[laneIdx].width, id: map.lanes[laneIdx].id };
  cache.set(key, p);
  return p;
}

/** Điểm trên đường ở quãng s (0 = đầu đường của đội, length = nhà chính địch). */
export function pointAt(path, s) {
  s = Math.max(0, Math.min(path.length, s));
  let i = 1; while (i < path.pts.length - 1 && path.cum[i] < s) i++;
  const a = path.pts[i - 1], b = path.pts[i], L = path.cum[i] - path.cum[i - 1] || 1, t = (s - path.cum[i - 1]) / L;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / L, dy: (b.y - a.y) / L };
}

/** Hình chiếu của p lên đường: { s: quãng dọc đường, d: khoảng cách ngang, x, y: điểm gần nhất }. */
export function project(path, p) {
  let best = { s: 0, d: Infinity, x: path.pts[0].x, y: path.pts[0].y };
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)), x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(p.x - x, p.y - y);
    if (d < best.d) best = { s: path.cum[i - 1] + Math.sqrt(L2) * t, d, x, y };
  }
  return best;
}

/** Đường gần p nhất (chỉ số). */
export function nearestLane(map, p, team = 0) {
  let bi = 0, bd = Infinity;
  map.lanes.forEach((_, i) => { const d = project(lanePath(map, i, team), p).d; if (d < bd) { bd = d; bi = i; } });
  return bi;
}
