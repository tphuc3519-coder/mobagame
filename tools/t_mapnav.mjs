// Kiểm thử bố cục bản đồ 5v5 bằng số đo (không bằng mắt): vùng chơi liền một khối, từ hai nhà tới được mọi trại / hang / cổng rừng / đoạn
// đường, hành lang đủ rộng, hang lớn có HAI lối vào thật (miệng hang + cửa hậu), sông liền dòng và chảy vòng hai bên cù lao hang, cổng rừng
// và bụi ngoài tầm trụ, đối xứng hai đội; cuối cùng cho một tướng đi thật (va chạm của mô phỏng) theo đường tìm được tới từng đích.
// Dùng: node tools/t_mapnav.mjs   (in thêm bảng độ rộng hẹp nhất của từng tuyến để chỉnh bố cục)
import { ARENA as M, bushRects, structuresOf, LAIR_R, PIT_GATE } from '../src/data/maps.js';
import { buildNavGrid, CELL } from '../src/sim/navgrid.js';
import { findPath } from '../src/sim/pathfind.js';
import { clampToMap } from '../src/sim/util.js';

let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? 'ĐẠT ' : 'LỖI ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const g = buildNavGrid(M), { cols, rows, blocked } = g, N = cols * rows;
const cellOf = (x, y) => Math.floor(y / CELL) * cols + Math.floor(x / CELL);
const center = (c) => ({ x: (c % cols) * CELL + CELL / 2, y: Math.floor(c / cols) * CELL + CELL / 2 });
const inPlay = (c) => { const p = center(c); return !M.outOfBounds(p.x, p.y, 0); };
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
const near = (x, y) => { // ô đi được gần (x, y) nhất (đích nằm sát vách)
  const c0 = cellOf(x, y); if (!blocked[c0]) return c0;
  let best = -1, bd = Infinity;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const c = c0 + dy * cols + dx; if (c < 0 || c >= N || blocked[c]) continue; const p = center(c), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = c; } }
  return best;
};

// —— 1) vùng chơi liền khối ——
const comp = new Int32Array(N).fill(-1), sizes = [];
for (let s = 0; s < N; s++) {
  if (blocked[s] || comp[s] >= 0 || !inPlay(s)) continue;
  const id = sizes.length, q = [s]; comp[s] = id; let n = 0;
  while (q.length) { const c = q.pop(); n++; const x = c % cols, y = (c - x) / cols;
    for (const [dx, dy] of NB) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const k = ny * cols + nx; if (blocked[k] || comp[k] >= 0 || !inPlay(k)) continue; if (dx && dy && (blocked[y * cols + nx] || blocked[ny * cols + x])) continue; comp[k] = id; q.push(k); } }
  sizes.push(n);
}
const F0 = M.fountain, F1 = M.mirror(F0.x, F0.y), main = comp[near(F0.x, F0.y)];
ok('hai Suối Đèn cùng một vùng đi được', main >= 0 && main === comp[near(F1.x, F1.y)]);
const pockets = sizes.map((n, i) => [i, n]).filter(([i, n]) => i !== main && n > 12);
ok('không có túi đất kín trong sân (> 12 ô ≈ 0,08 km²)', !pockets.length, pockets.map(([i, n]) => { const c = comp.indexOf(i), p = center(c); return `${n} ô quanh (${p.x | 0}, ${p.y | 0})`; }).join('; '));

// —— 2) độ rộng hành lang: khoảng cách tới ô bị chặn gần nhất (chamfer 2 lượt), tuyến "rộng nhất" giữa hai điểm (maximin) ——
const clr = new Float32Array(N).fill(1e9);
for (let c = 0; c < N; c++) if (blocked[c]) clr[c] = 0;
for (let pass = 0; pass < 2; pass++) {
  const order = pass ? (f) => { for (let c = N - 1; c >= 0; c--) f(c); } : (f) => { for (let c = 0; c < N; c++) f(c); };
  order((c) => { if (!clr[c]) return; const x = c % cols, y = (c - x) / cols;
    for (const [dx, dy, w] of NB) { if ((pass ? -1 : 1) * (dy * cols + dx) > 0) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { clr[c] = Math.min(clr[c], 1); continue; } clr[c] = Math.min(clr[c], clr[ny * cols + nx] + w); } });
}
/** Bề rộng hành lang hẹp nhất trên tuyến rộng nhất a → b (đơn vị thế giới, ≈ 2 × khoảng hở − 1 ô). */
function bottleneck(a, b) {
  const s = near(a.x, a.y), t = near(b.x, b.y); if (s < 0 || t < 0) return 0;
  const best = new Float32Array(N).fill(-1), heap = [[clr[s], s]]; best[s] = clr[s];
  const push = (v) => { heap.push(v); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] >= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] > heap[m][0]) m = l; if (r < heap.length && heap[r][0] > heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [v, c] = pop(); if (v < best[c]) continue; if (c === t) return (2 * v - 1) * CELL;
    const x = c % cols, y = (c - x) / cols;
    for (const [dx, dy] of NB) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const k = ny * cols + nx; if (blocked[k]) continue; const nv = Math.min(v, clr[k]); if (nv > best[k]) { best[k] = nv; push([nv, k]); } }
  }
  return 0;
}

// điểm then chốt (toạ độ thế giới)
const camps = M.camps, lairs = camps.filter((c) => c.type === 'long_ngu' || c.type === 'ho_loi');
const pillars = M.walls.segs.filter((w) => w.pillar && !w.lair), gates = []; // cột cổng rừng (cột ở đầu vách hang tính riêng)
for (let i = 0; i + 1 < pillars.length; i += 2) gates.push({ x: (pillars[i].x1 + pillars[i + 1].x1) / 2, y: (pillars[i].y1 + pillars[i + 1].y1) / 2, w: Math.hypot(pillars[i].x1 - pillars[i + 1].x1, pillars[i].y1 - pillars[i + 1].y1) });
const towers = structuresOf(M).filter((s) => s.kind === 'tower');
ok('mỗi phần tư rừng có 3 cổng có cột đèn (12 cổng)', gates.length === 12, String(gates.length));
const gateGap = Math.min(...gates.map((q) => q.w - (pillars[0].w ?? 0)));
ok('cổng rừng rộng ≥ 550', gateGap >= 550, `hẹp nhất ${gateGap | 0} (khoảng giữa hai đầu khối bờ rào)`);

const MIN_W = 420; // hành lang hẹp nhất cho phép trên mọi tuyến chính (~5 tướng đứng ngang)
const routes = [];
for (const c of camps) routes.push([`Suối Đèn ${c.side === 1 ? 'Đỏ' : 'Xanh'} → ${c.id}`, c.side === 1 ? F1 : F0, c]);
for (const L of lairs) for (const [nm, F] of [['Xanh', F0], ['Đỏ', F1]]) routes.push([`Suối Đèn ${nm} → hang ${L.id}`, F, L]);
gates.forEach((q, i) => routes.push([`Suối Đèn → cổng rừng #${i}`, (q.x < q.y) ? F0 : F1, q]));
const rows2 = routes.map(([n, a, b]) => [n, bottleneck(a, b)]);
const narrow = rows2.filter(([, w]) => w < MIN_W);
ok(`mọi tuyến tới trại / hang / cổng rộng ≥ ${MIN_W}`, !narrow.length, narrow.map(([n, w]) => `${n}: ${w | 0}`).join('; '));
console.log('     độ rộng hẹp nhất từng tuyến:', rows2.map(([n, w]) => `${n.replace('Suối Đèn ', '')} ${w | 0}`).join(' · '));

// —— 3) hang lớn: cù lao giữa đầm, HAI lối vào thật ——
for (const L of lairs) {
  const R = LAIR_R[L.type], back = L.back, dry = M.river.sd(L.x, L.y) > 0;
  ok(`${L.id}: hang nằm trên cù lao (đất khô giữa đầm)`, dry, `sd ${M.river.sd(L.x, L.y) | 0}`);
  const isle = M.river.pools.find((p) => Math.hypot(p.x - L.x, p.y - L.y) < 10)?.isle || 0, side = isle + 320;
  const px = -Math.sin(back), py = Math.cos(back); // vuông góc trục sông
  ok(`${L.id}: nước chảy vòng cả hai bên cù lao`, [1, -1].every((s) => M.river.sd(L.x + px * side * s, L.y + py * side * s) < -100),
    [1, -1].map((s) => (M.river.sd(L.x + px * side * s, L.y + py * side * s) | 0)).join(' / '));
  // chặn tạm miệng hang (hoặc cửa hậu) trên lưới: tâm hang vẫn phải tới được qua lối còn lại
  const viaOnly = (shut) => {
    const saved = new Map(), dirA = shut === 'mouth' ? back + Math.PI : back, half = shut === 'mouth' ? PIT_GATE.mouth : PIT_GATE.rear;
    for (let c = 0; c < N; c++) { if (blocked[c]) continue; const p = center(c), d = Math.hypot(p.x - L.x, p.y - L.y); if (d < R * 0.95 || d > R * 1.55) continue;
      const a = Math.atan2(p.y - L.y, p.x - L.x), da = Math.abs(((a - dirA + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da < half + 0.12) { saved.set(c, 0); blocked[c] = 1; } }
    g.cache?.clear();
    const from = shut === 'mouth' ? { x: L.x + Math.cos(back) * R * 2.1, y: L.y + Math.sin(back) * R * 2.1 } : { x: L.x - Math.cos(back) * R * 2.1, y: L.y - Math.sin(back) * R * 2.1 };
    const p = findPath(g, from, { x: L.x, y: L.y }, 40);
    for (const c of saved.keys()) blocked[c] = 0; g.cache?.clear();
    return p && !p.partial;
  };
  ok(`${L.id}: vào được qua cửa hậu khi miệng hang bị chặn`, viaOnly('mouth'));
  ok(`${L.id}: vào được qua miệng hang khi cửa hậu bị chặn`, viaOnly('rear'));
}

// —— 4) sông liền dòng từ góc này sang góc kia (dọc trục, tránh cù lao: đi vòng một nhánh) ——
{
  let dryRun = 0, worst = 0;
  for (let a = 600; a < M.river.len - 600; a += 120) {
    const x = a / Math.SQRT2, y = a / Math.SQRT2; let sd = M.river.sd(x, y);
    if (sd > 0) { // trên cù lao: thử lệch sang nhánh
      const p = M.river.pools.find((q) => Math.hypot(q.x - x, q.y - y) < q.isle + 50);
      if (p) { const off = (p.isle + 300) / Math.SQRT2; sd = M.river.sd(x - off, y + off); }
    }
    dryRun = sd > 0 ? dryRun + 120 : 0; worst = Math.max(worst, dryRun);
  }
  ok('sông chảy liền một mạch từ góc Thần Điểu tới góc Tà Thần', worst === 0, worst ? `đứt ${worst}` : '');
}

// —— 5) cổng rừng / bụi / trại ngoài tầm trụ ——
const towerGap = (x, y) => Math.min(...towers.map((t) => Math.hypot(t.x - x, t.y - y) - t.range));
ok('cổng rừng ngoài tầm trụ', gates.every((q) => towerGap(q.x, q.y) > 60), `gần nhất ${Math.min(...gates.map((q) => towerGap(q.x, q.y))) | 0}`);
const bushNear = bushRects(M).map((b) => { const pts = b.cap ? [[b.cap[0], b.cap[1]], [b.cap[2], b.cap[3]], [(b.cap[0] + b.cap[2]) / 2, (b.cap[1] + b.cap[3]) / 2]] : [[b.x - b.w / 2, b.y - b.h / 2], [b.x + b.w / 2, b.y - b.h / 2], [b.x - b.w / 2, b.y + b.h / 2], [b.x + b.w / 2, b.y + b.h / 2], [b.x, b.y]];
  return Math.min(...pts.map(([x, y]) => towerGap(x, y) - (b.cap ? b.r : 0))); });
ok('không bụi nào lấn vào tầm trụ', bushNear.every((d) => d > 0), `gần nhất ${Math.min(...bushNear) | 0}`);
ok('trại quái ngoài tầm trụ', camps.every((c) => towerGap(c.x, c.y) > 300), `gần nhất ${Math.min(...camps.map((c) => towerGap(c.x, c.y))) | 0}`);

// —— 6) đường lính không bị tường lấn ——
{
  let worst = Infinity;
  for (const ln of M.lanes) for (let i = 1; i < ln.pts.length; i++) {
    const [ax, ay] = ln.pts[i - 1], [bx, by] = ln.pts[i], L = Math.hypot(bx - ax, by - ay);
    for (let s = 0; s <= L; s += 100) { const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L;
      if (M.outOfBounds(x, y, 0)) continue;
      for (const w of M.walls.segs) { const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L2));
        worst = Math.min(worst, Math.hypot(x - w.x1 - dx * t, y - w.y1 - dy * t) - (w.w ?? M.walls.thickness) / 2); } }
  }
  ok('tim ba đường cách mọi khối đá ≥ nửa bề rộng đường − 60', worst >= M.lanes[0].width / 2 - 60, `${worst | 0}`);
}

// —— 7) đối xứng hai đội (ảnh qua trục sông y = x) ——
{
  const same = (a, b) => Math.abs(a - b) < 2;
  const hasMirror = (w) => M.walls.segs.some((o) => same((o.w ?? 0), (w.w ?? 0)) && ((same(o.x1, w.y1) && same(o.y1, w.x1) && same(o.x2, w.y2) && same(o.y2, w.x2)) || (same(o.x1, w.y2) && same(o.y1, w.x2) && same(o.x2, w.y1) && same(o.y2, w.x1))));
  const miss = M.walls.segs.filter((w) => !hasMirror(w));
  ok('mọi khối đá có ảnh đối xứng phía bên kia', !miss.length, miss.slice(0, 3).map((w) => `(${w.x1 | 0},${w.y1 | 0})`).join(' '));
  const bk = (b) => b.cap ? b.cap.map((v) => Math.round(v / 5)).join(',') : [b.x, b.y, b.w, b.h].map((v) => Math.round(v / 5)).join(',');
  const bm = (b) => b.cap ? bk({ cap: [b.cap[1], b.cap[0], b.cap[3], b.cap[2]] }) : bk({ x: b.y, y: b.x, w: b.h, h: b.w });
  const bm2 = (b) => b.cap ? bk({ cap: [b.cap[3], b.cap[2], b.cap[1], b.cap[0]] }) : bm(b);
  const bs = new Set(bushRects(M).map(bk)), bmiss = bushRects(M).filter((b) => !bs.has(bm(b)) && !bs.has(bm2(b)));
  ok('mọi bụi cỏ có ảnh đối xứng phía bên kia', !bmiss.length, bmiss.slice(0, 3).map((b) => `(${(b.x ?? b.cap[0]) | 0},${(b.y ?? b.cap[1]) | 0})`).join(' '));
  const sd = [];
  for (let i = 0; i < 400; i++) { const x = (i * 7919) % M.w, y = (i * 104729) % M.h; sd.push(Math.abs(M.river.sd(x, y) - M.river.sd(y, x))); }
  ok('hình sông đối xứng qua trục', Math.max(...sd) < 1, Math.max(...sd).toFixed(3));
}

// —— 8) đi thật: tướng bán kính 40, bước 10 đơn vị + đẩy khỏi tường (va chạm của mô phỏng) theo đường A* tới từng đích ——
{
  const walk = (from, to) => {
    const path = findPath(g, from, to, 40); if (!path) return false;
    const p = { ...from }; clampToMap(M, p, 40);
    for (const wp of path) { let stall = 0, last = Infinity;
      for (let i = 0; i < 6000; i++) { const dx = wp.x - p.x, dy = wp.y - p.y, l = Math.hypot(dx, dy); if (l < 30) break;
        const st = Math.min(10, l); p.x += (dx / l) * st; p.y += (dy / l) * st; clampToMap(M, p, 40);
        const d = Math.hypot(wp.x - p.x, wp.y - p.y); if (d > last - 0.5) { if (++stall > 80) return false; } else stall = 0; last = d; } }
    return Math.hypot(to.x - p.x, to.y - p.y) < 160 || path.partial;
  };
  const stuck = [];
  for (const c of camps) if (!walk(c.side === 1 ? F1 : F0, { x: c.x, y: c.y })) stuck.push(c.id);
  for (const L of lairs) for (const F of [F0, F1]) if (!walk(F, { x: L.x, y: L.y })) stuck.push(L.id + (F === F0 ? ' (Xanh)' : ' (Đỏ)'));
  gates.forEach((q, i) => { if (!walk(q.x < q.y ? F0 : F1, q)) stuck.push('cổng #' + i); });
  if (!walk(F0, F1)) stuck.push('Suối Đèn Xanh → Đỏ');
  ok('tướng đi thật tới mọi trại, hang, cổng rừng và nhà địch không kẹt', !stuck.length, stuck.join(', '));
}

console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
