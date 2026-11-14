import { D } from '../core/dmath.js';
import { CELL } from './navgrid.js';
import { clampToMap } from './util.js';

// A* 8 hướng + làm mượt bằng kiểm tra đường thẳng (string pulling), cache theo (ô đầu, ô cuối) — 02 §8.
// Bản cũ sắp xếp lại cả danh sách mở mỗi bước: tìm xa / đích không tới được mất tới 300 ms một tick (cả trận khựng khi bot gỡ kẹt).
// Nay: đống nhị phân trên mảng số dùng lại giữa các lần tìm (bằng điểm thì ô vào trước ra trước), A* có trọng số (h × 2: mở ít ô hơn
// nhiều, đường dài hơn tối ưu ~1%) và giới hạn 1500 ô mở rộng (quá thì coi như không có đường — bot đi thẳng như trước): một lần tìm
// tối đa vài ms. Kết quả cả "không có đường" cũng được nhớ (lưới không đổi trong trận), tối đa 256 cặp ô. Hết ngân sách: trả đoạn đầu
// của đường (findPath — partial) thay vì bỏ cuộc.
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
const H_WEIGHT = 2, MAX_EXPAND = 1500, CACHE_MAX = 256;
const PARTIAL_MIN = 4; // đường dở dang chỉ đáng đi khi tới gần đích hơn ít nhất 4 ô (320 đơn vị)
const START_R = 4, START_SEEDS = 4; // xuất phát trong hốc tường: xét các ô đi được trong 4 ô quanh chỗ đứng, tới khi có ≥ 4 lối ra

export function lineClear(grid, a, b) {
  const n = Math.ceil(D.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (grid.isBlocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; }
  return true;
}

/** Mảng tạm của lưới (tạo một lần): điểm g, ô cha, dấu lượt tìm (khỏi xoá mảng mỗi lần), đống nhị phân (điểm f, thứ tự vào, ô). */
function scratch(grid) {
  if (grid.astar) return grid.astar;
  const n = grid.cols * grid.rows;
  return (grid.astar = { g: new Float64Array(n), par: new Int32Array(n), seen: new Uint32Array(n), done: new Uint32Array(n), run: 0, f: new Float64Array(4096), s: new Uint32Array(4096), c: new Int32Array(4096) });
}

/** Ô đi được gần điểm (x, y) nhất trong bán kính R ô (chính ô đó nếu đi được): dò từng vòng vuông từ trong ra, cùng vòng thì ô có tâm gần
 *  điểm hơn (bằng nhau: ô quét trước). Trả chỉ số ô hoặc -1. Lưới nới tường thêm ~1/3 ô nên một đơn vị ép sát hốc tường vẫn đứng được ở chỗ
 *  lưới coi là "tường" — điểm đầu / điểm cuối như vậy phải quy về ô đi được gần nhất, không thì không bao giờ tìm ra đường. */
export function nearestFree(grid, x, y, R = 5) {
  const { cols, rows, blocked } = grid, cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const ok = (ix, iy) => ix >= 0 && iy >= 0 && ix < cols && iy < rows && !blocked[iy * cols + ix];
  if (ok(cx, cy)) return cy * cols + cx;
  for (let r = 1; r <= R; r++) {
    let best = -1, bd = Infinity;
    for (let iy = cy - r; iy <= cy + r; iy++) for (let ix = cx - r; ix <= cx + r; ix++) {
      if (Math.max(Math.abs(ix - cx), Math.abs(iy - cy)) !== r || !ok(ix, iy)) continue;
      const d = D.hypot((ix + 0.5) * CELL - x, (iy + 0.5) * CELL - y);
      if (d < bd) { bd = d; best = iy * cols + ix; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** Đơn vị bán kính r cứ nhắm thẳng b mà đi thì có tới được b không? Bước thử y như lúc di chuyển thật — mỗi bước WALK_STEP đơn vị (cỡ một
 *  tick của tướng chạy chậm; bước dài hơn "lọt" qua khe hẹp giữa hai vách mà tướng thật không qua được) rồi đẩy ra khỏi tường, trượt dọc
 *  vách được tính, cho phép đi dài gấp rưỡi đường thẳng. Dùng cho đơn vị đang bị ép trong hốc tường. */
const WALK_STEP = 10;
function walkable(map, a, b, r) {
  const p = { x: a.x, y: a.y }, steps = Math.ceil((D.hypot(b.x - a.x, b.y - a.y) / WALK_STEP) * 1.5) + 2;
  for (let i = 0; i < steps; i++) {
    const dx = b.x - p.x, dy = b.y - p.y, l = D.hypot(dx, dy);
    if (l < 24) return true;
    const st = Math.min(WALK_STEP, l); p.x += (dx / l) * st; p.y += (dy / l) * st; clampToMap(map, p, r);
  }
  return D.hypot(b.x - p.x, b.y - p.y) < 24;
}

/**
 * Đường đi từ `from` tới `to` cho đơn vị bán kính `radius`: mảng điểm { x, y } (đã làm mượt), hoặc null khi không có gì đáng đi theo.
 *  - Điểm cuối nằm trong ô lưới coi là tường (đích sát vách): quy về ô đi được gần nhất.
 *  - Điểm đầu nằm trong ô lưới coi là tường (đơn vị bị ép vào hốc giữa hai vách — lưới nới tường thêm ~1/3 ô): xuất phát từ MỌI ô đi được
 *    quanh đó mà đơn vị đi thẳng tới được thật (walkable), điểm đầu của đường là ô như thế. Trước đây trả null rồi nhớ luôn kết quả đó ⇒
 *    bot kẹt trong hốc cứ đâm thẳng vào tường mãi (đo: tướng máy đứng yên 6–23 giây, 4 lần trong 4 trận 5v5).
 *  - Hết ngân sách MAX_EXPAND (đích xa hàng chục mét) hoặc đích bị bao kín: trả ĐOẠN ĐẦU của đường — tới ô đã xét gần đích nhất — kèm
 *    `partial = true` (người gọi đi hết đoạn rồi tìm tiếp), miễn là đoạn đó đưa tới gần đích hơn rõ rệt. Trước đây trả null ⇒ bot đi thẳng.
 */
export function findPath(grid, from, to, radius = 40) {
  const { cols, rows } = grid;
  const goal = nearestFree(grid, to.x, to.y);
  if (goal < 0) return null;
  const fx = Math.max(0, Math.min(cols - 1, Math.floor(from.x / CELL))), fy = Math.max(0, Math.min(rows - 1, Math.floor(from.y / CELL))), gx = goal % cols, gy = (goal - gx) / cols;
  const startMoved = grid.isBlocked(from.x, from.y), goalMoved = grid.isBlocked(to.x, to.y);
  if (!startMoved && !goalMoved && lineClear(grid, from, to)) return [{ x: to.x, y: to.y }];
  const key = startMoved ? null : `${fx},${fy},${gx},${gy},${goalMoved ? 1 : 0}`; // xuất phát trong hốc tường: tuỳ chỗ đứng chính xác — không nhớ
  grid.cache ||= new Map();
  const give = (c) => { if (!c) return null; const o = c.pts.map((p) => ({ ...p })); if (c.partial) o.partial = true; return o; };
  if (key && grid.cache.has(key)) return give(grid.cache.get(key));
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
  const idx = (x, y) => y * cols + x;
  const getG = (i) => (seen[i] === run ? g[i] : Infinity);
  const h0 = D.hypot(fx - gx, fy - gy), center = (c) => ({ x: (c % cols) * CELL + CELL / 2, y: Math.floor(c / cols) * CELL + CELL / 2 });
  const seed = (c, cost) => { g[c] = cost; seen[c] = run; par[c] = -1; push(cost + H_WEIGHT * D.hypot((c % cols) - gx, Math.floor(c / cols) - gy), c); };
  if (!startMoved) seed(idx(fx, fy), 0);
  else { // trong hốc tường: mọi ô đi được trong 4 ô quanh đó mà đi thẳng tới được thật; không có ô nào thì ô đi được gần nhất
    let n = 0; // dò từng vòng từ gần ra xa; đủ START_SEEDS lối ra ở một vòng thì thôi (mỗi phép thử walkable tốn vài chục lần đẩy khỏi tường)
    for (let r = 1; r <= START_R && n < START_SEEDS; r++) for (let y = fy - r; y <= fy + r; y++) for (let x = fx - r; x <= fx + r; x++) {
      if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) !== r || x < 0 || y < 0 || x >= cols || y >= rows || grid.blocked[idx(x, y)]) continue;
      const c = center(idx(x, y));
      if (walkable(grid.map, from, c, radius)) { seed(idx(x, y), D.hypot(c.x - from.x, c.y - from.y) / CELL); n++; }
    }
    if (!n) { const c = nearestFree(grid, from.x, from.y); if (c < 0) return null; seed(c, 1); }
  }
  let found = false, expanded = 0, near = -1, nearH = h0; // near: ô đã xét gần đích nhất (đường dở dang khi không tới được đích)
  while (size) {
    const i = pop();
    if (done[i] === run) continue; done[i] = run;
    if (i === goal) { found = true; break; }
    if (++expanded > MAX_EXPAND) break;
    const x = i % cols, y = (i - x) / cols, gi = g[i];
    { const hh = D.hypot(x - gx, y - gy); if (hh < nearH) { nearH = hh; near = i; } }
    for (const [dx, dy, c] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid.blocked[idx(nx, ny)]) continue;
      if (dx && dy && (grid.blocked[idx(x + dx, y)] || grid.blocked[idx(x, y + dy)])) continue; // không cắt góc
      const ni = idx(nx, ny), ng = gi + c;
      if (ng < getG(ni)) { g[ni] = ng; seen[ni] = run; par[ni] = i; push(ng + H_WEIGHT * D.hypot(nx - gx, ny - gy), ni); }
    }
  }
  const remember = (v) => { if (!key) return; if (grid.cache.size >= CACHE_MAX) grid.cache.delete(grid.cache.keys().next().value); grid.cache.set(key, v); };
  const partial = !found;
  if (partial && !(near >= 0 && nearH <= h0 - PARTIAL_MIN)) { remember(null); return null; } // không tới gần đích hơn được: coi như không có đường
  let pts = [], cur = found ? goal : near;
  while (cur >= 0) { pts.push(center(cur)); cur = par[cur]; } // lần ngược tới ô xuất phát (par = -1)
  if (!startMoved) pts.pop(); // đang đứng sẵn trong ô xuất phát; còn trong hốc tường thì ô xuất phát là điểm đầu phải ra tới
  pts.reverse();
  if (!pts.length) { remember(null); return null; }
  if (found && !goalMoved) pts[pts.length - 1] = { x: to.x, y: to.y };
  const out = []; let anchor = { ...from };
  for (let i = 0; i < pts.length; i++) {
    if (i + 1 < pts.length && lineClear(grid, anchor, pts[i + 1])) continue;
    out.push(pts[i]); anchor = pts[i];
  }
  remember({ pts: out.map((p) => ({ ...p })), partial });
  if (partial) out.partial = true;
  return out;
}
