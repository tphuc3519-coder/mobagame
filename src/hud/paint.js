// Icon kỹ năng kiểu tranh vẽ MOBA (tham khảo cách trình bày icon Liên Quân, tự vẽ — docs/01 §5):
// vẽ bằng canvas 2D thành ảnh (data URL) — tràn kín vòng tròn, hiệu ứng năng lượng (tia sáng toả, vệt chuyển động, xoáy, lửa)
// chiếm chủ đạo, vật thể to, cắt khung, đổ khối (viền sáng phía trên-trái, bóng dưới-phải), bloom toàn ảnh, hạt nhiễu, viền tròn mảnh.
// Toạ độ vẽ 0..128 (ảnh 256²). Mỗi icon sinh một lần rồi lưu đệm.
import { rngFor, fbm } from '../render/env/noise.js';
import { D } from './itemArt.js';
import { staticPaint } from './paintStatic.js';

const S = 256, K = S / 128, TAU = Math.PI * 2, cache = new Map();
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const col = (c, a = 1) => (c[0] === '#' ? hexA(c, a) : c);

function mk() { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true }); x.setTransform(K, 0, 0, K, 0, 0); return x; }
// lớp nháp dùng lại (vẽ một icon cần hàng trăm lớp — không tạo canvas mới mỗi lần)
const pool = [];
function scratch() { let l = pool.pop(); if (!l) l = mk(); else { l.reset(); l.setTransform(K, 0, 0, K, 0, 0); } return l; }
function layer(x, fn, mode = 'source-over', alpha = 1) { const l = scratch(); fn(l); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = mode; x.globalAlpha = alpha; x.drawImage(l.canvas, 0, 0); x.restore(); pool.push(l); }
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Kết cấu nhiễu dựng sẵn (256²): 'smoke' khói xoắn (trắng, alpha theo mật độ), 'surf' bề mặt mài/mòn (xám quanh 50%). */
const TEX = new Map();
function tex(kind, v = 0) {
  const key = kind + v; if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), d = g.createImageData(S, S), ox = v * 37.31, oy = v * 11.73;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = (j * S + i) * 4;
    if (kind === 'smoke') {
      const u = i / 56 + ox, w = j / 56 + oy, q = fbm(u + 1.8 * fbm(u + 3.1, w + 1.3, 3), w + 1.8 * fbm(u + 5.2, w + 7.9, 3), 5);
      d.data[k] = d.data[k + 1] = d.data[k + 2] = 255; d.data[k + 3] = 255 * clamp01((q - 0.3) * 2.6) ** 1.4;
    } else {
      const q = 0.5 + (fbm(i / 5 + ox, j / 5 + oy, 3) - 0.5) * 0.9 + (fbm(i / 1.3 + ox, j / 26 + oy, 2) - 0.5) * 0.35 + (fbm(i / 22 + ox, j / 22 + oy, 3) - 0.5) * 0.6;
      d.data[k] = d.data[k + 1] = d.data[k + 2] = 255 * clamp01(q); d.data[k + 3] = 255;
    }
  }
  g.putImageData(d, 0, 0); TEX.set(key, c); return c;
}
let texN = 0;
// màu năng lượng chủ đạo của icon đang vẽ: tô viền ngược sáng (mép dưới-phải) cho mọi vật thể
let ACC = null;
const setAccent = (c) => { ACC = c; };
const vivid = (cs) => { let best = cs[0], bs = -1; for (const c of cs) { if (c[0] !== '#') continue; const n = parseInt(c.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), sc = (mx - mn) * (mx / 255) + mx * 0.15; if (sc > bs) { bs = sc; best = c; } } return best; };
const lin = (x, x1, y1, x2, y2, st) => { const g = x.createLinearGradient(x1, y1, x2, y2); for (const [o, c, a = 1] of st) g.addColorStop(o, col(c, a)); return g; };
const rad = (x, cx, cy, r, st, r0 = 0) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r); for (const [o, c, a = 1] of st) g.addColorStop(o, col(c, a)); return g; };
/** Path SVG ở toạ độ cục bộ → Path2D trên ảnh (dời, xoay độ, co giãn). */
const tp = (d, cx = 0, cy = 0, deg = 0, s = 1) => { const p = new Path2D(); p.addPath(new Path2D(d), new DOMMatrix().translateSelf(cx, cy).rotateSelf(deg).scaleSelf(s)); return p; };
const arcPts = (cx, cy, r, a0, a1, n = 40, rr) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + (a1 - a0) * t, R = rr ? rr(t) : r; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
const linePts = (x0, y0, x1, y1, n = 16) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
/** Dải có bề rộng thay đổi dọc một đường (vệt lửa, nhát chém, đuôi sao chổi). */
function ribbon(pts, wf) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = wf(i / (n - 1)) / 2;
    L.push([pts[i][0] - dy / l * w, pts[i][1] + dx / l * w]); R.push([pts[i][0] + dy / l * w, pts[i][1] - dx / l * w]);
  }
  const p = new Path2D(); [...L, ...R.reverse()].forEach(([X, Y], i) => (i ? p.lineTo(X, Y) : p.moveTo(X, Y))); p.closePath(); return p;
}
const pick = (r, c) => (Array.isArray(c) ? c[r.int(c.length)] : c);

// —— nền & hiệu ứng ——
function bg(x, cx, cy, stops, R = 100) { x.fillStyle = rad(x, cx, cy, R, stops); x.fillRect(0, 0, 128, 128); const a = vivid(stops.map((s) => s[1])); setAccent(a); atmos(x, cx, cy, a, R, parseInt(a.slice(1), 16) % 997); }
/** Chiều sâu cho nền: khói cuộn sáng quanh nguồn sáng, khói tối dày dần ra mép, đốm sáng mờ (bokeh), bụi lấp lánh. */
function atmos(x, cx, cy, c, R = 100, seed = 0) {
  const sm = tex('smoke', seed % 3), sm2 = tex('smoke', (seed + 1) % 3);
  layer(x, (l) => { l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.drawImage(sm, 0, 0); l.restore(); l.globalCompositeOperation = 'source-in'; l.fillStyle = rad(l, cx, cy, R * 0.9, [[0, '#ffffff', 0.9], [0.35, c, 0.75], [1, c, 0.15]]); l.fillRect(0, 0, 128, 128); }, 'screen', 0.55);
  layer(x, (l) => { l.save(); l.setTransform(-1, 0, 0, 1, S, 0); l.drawImage(sm2, 0, 0); l.restore(); l.globalCompositeOperation = 'source-in'; l.fillStyle = rad(l, cx, cy, R * 1.1, [[0, '#000000', 0], [0.45, '#000000', 0.35], [1, '#000000', 0.9]]); l.fillRect(0, 0, 128, 128); }, 'source-over', 0.85);
  const r = rngFor(seed * 977 + 13);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const a = r.range(0, TAU), d = r.range(20, 62), X = 64 + Math.cos(a) * d, Y = 64 + Math.sin(a) * d, s = r.range(2.5, 8); x.fillStyle = rad(x, X, Y, s, [[0, c, 0.22], [0.7, c, 0.12], [1, c, 0]]); x.fillRect(X - s, Y - s, s * 2, s * 2); }
  for (let i = 0; i < 26; i++) { const X = r.range(4, 124), Y = r.range(4, 124), s = r.range(0.25, 0.7); x.fillStyle = col(r.next() < 0.5 ? '#ffffff' : c, r.range(0.25, 0.7)); x.beginPath(); x.arc(X, Y, s, 0, TAU); x.fill(); }
  x.restore();
}
function glow(x, cx, cy, R, c, a = 1) { x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rad(x, cx, cy, R, [[0, c, a], [0.4, c, a * 0.35], [1, c, 0]]); x.fillRect(cx - R, cy - R, R * 2, R * 2); x.restore(); }
/** Tia sáng toả từ tâm (thon dần), cộng sáng. */
function rays(x, r, cx, cy, { n = 24, a0 = 0, a1 = TAU, r0 = 4, len = [40, 80], w = [2, 6], c = '#ffffff', alpha = 0.8 } = {}) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = r.range(a0, a1), L = r.range(...len), W = r.range(...w), ca = Math.cos(a), sa = Math.sin(a), cc = pick(r, c);
    const bx = cx + ca * r0, by = cy + sa * r0, tx = cx + ca * (r0 + L), ty = cy + sa * (r0 + L);
    x.fillStyle = lin(x, bx, by, tx, ty, [[0, cc, alpha], [0.6, cc, alpha * 0.4], [1, cc, 0]]);
    x.beginPath(); x.moveTo(bx - sa * W / 2, by + ca * W / 2); x.lineTo(tx, ty); x.lineTo(bx + sa * W / 2, by - ca * W / 2); x.closePath(); x.fill();
  }
  x.restore();
}
/** Vệt chuyển động song song: đầu sáng, đuôi mờ (đuôi ngược hướng `ang`). */
function streaks(x, r, ang, { n = 14, box = [0, 0, 128, 128], len = [20, 50], w = [1, 3], c = '#ffffff', alpha = 0.8 } = {}) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const hx = r.range(box[0], box[2]), hy = r.range(box[1], box[3]), L = r.range(...len), W = r.range(...w), cc = pick(r, c);
    x.fillStyle = ribbonFill(x, hx, hy, hx - dx * L, hy - dy * L, cc, alpha);
    x.fill(ribbon(linePts(hx - dx * L, hy - dy * L, hx, hy, 6), (t) => W * (0.15 + 0.85 * t)));
  }
  x.restore();
}
const ribbonFill = (x, hx, hy, tx, ty, c, a) => lin(x, tx, ty, hx, hy, [[0, c, 0], [0.7, c, a * 0.6], [1, '#ffffff', a]]);
function sparks(x, r, n, box, c, size = [0.6, 1.6]) {
  for (let i = 0; i < n; i++) { const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), s = r.range(...size); glow(x, X, Y, s * 5, pick(r, c), 0.7); x.fillStyle = '#fff'; x.beginPath(); x.arc(X, Y, s, 0, TAU); x.fill(); }
}
/** Xoáy: nhiều nhánh xoắn ốc, sáng dần vào tâm. */
function swirl(x, r, cx, cy, { arms = 6, r0 = 6, r1 = 70, turns = 1.2, w = [1.5, 5], c = '#ffffff', alpha = 0.8, squash = 1 } = {}) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < arms; k++) {
    const a0 = (k / arms) * TAU + r.range(-0.3, 0.3), W = r.range(...w), pts = [];
    for (let i = 0; i <= 50; i++) { const t = i / 50, R = r1 + (r0 - r1) * t, a = a0 + t * turns * TAU; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * squash]); }
    x.fillStyle = rad(x, cx, cy, r1, [[0, '#ffffff', alpha], [0.35, pick(r, c), alpha * 0.9], [1, pick(r, c), 0]]);
    x.fill(ribbon(pts, (t) => W * Math.sin(Math.PI * Math.min(1, t * 1.2))));
  }
  x.restore();
}
/** Vật thể đặc: đổ bóng mềm, tô chuyển sắc, bóng tối mép dưới-phải, viền sáng mép trên-trái, nét mảnh tối. */
const BIG = new Path2D(); BIG.rect(-200, -200, 528, 528);
/** Vùng trong p trừ đi p dời (dx, dy) — tô trực tiếp bằng clip + evenodd (không cần lớp nháp). */
function edgeBand(x, p, dx, dy, style, mode, alpha = 1) {
  const q = new Path2D(BIG); q.addPath(p, new DOMMatrix().translateSelf(dx, dy));
  x.save(); x.clip(p); if (mode) x.globalCompositeOperation = mode; x.globalAlpha = alpha; x.fillStyle = style; x.fill(q, 'evenodd'); x.restore();
}
/** Vật thể đặc: đổ bóng mềm, tô chuyển sắc, kết cấu bề mặt, tối mép trong (AO), bóng dưới-phải, viền ngược sáng màu năng lượng, viền sáng trên-trái, nét mảnh tối. */
function solid(x, p, fill, { rim = 'rgba(255,244,225,0.85)', rd = 1.6, shade = 0.35, sd = 3.5, edge = 'rgba(0,0,0,0.55)', shadow = true, surf = 0.32, back = ACC, ao = 0.3 } = {}) {
  x.save(); if (shadow) { x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 8 * K; x.shadowOffsetX = 1.5 * K; x.shadowOffsetY = 3.5 * K; } x.fillStyle = fill; x.fill(p); x.restore();
  if (surf) { const t = tex('surf', texN++ % 4); x.save(); x.clip(p); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'overlay'; x.globalAlpha = surf; x.drawImage(t, 0, 0); x.restore(); }
  if (ao) { const q = new Path2D(BIG); q.addPath(p); x.save(); x.clip(p); x.shadowColor = `rgba(0,0,0,${Math.min(1, ao * 2.4)})`; x.shadowBlur = 6 * K; x.shadowOffsetX = -0.8 * K; x.shadowOffsetY = -1.2 * K; x.fill(q, 'evenodd'); x.restore(); }
  for (const [d, a] of [[sd, shade], [sd * 0.5, shade * 0.6]]) edgeBand(x, p, -d, -d, `rgba(0,0,0,${a})`);
  if (back) edgeBand(x, p, -rd * 0.9, -rd * 0.9, col(back, 1), 'lighter', 0.75);
  edgeBand(x, p, rd, rd, rim);
  if (edge) { x.lineWidth = 0.7; x.strokeStyle = edge; x.stroke(p); }
}
/** Phát sáng: vẽ hình nhiều lớp mờ dần quanh nó (quầng), cộng sáng. */
function shine(x, p, c, blur = 6, a = 0.9) { x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = col(c, a); x.shadowBlur = blur * K; x.fillStyle = col(c, a * 0.9); x.fill(p); x.fill(p); x.restore(); }
/** Bloom: thu nhỏ ảnh, nén vùng tối (nhân với chính nó), phóng lại cộng sáng. */
function bloom(x, k = 0.7) {
  const c = x.canvas;
  for (const [s, a] of [[S / 4, k * 0.55], [S / 12, k * 0.6]]) {
    const t = document.createElement('canvas'); t.width = t.height = s; const tx = t.getContext('2d');
    tx.drawImage(c, 0, 0, s, s); tx.globalCompositeOperation = 'multiply'; tx.drawImage(t, 0, 0); tx.drawImage(t, 0, 0);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, S, S); x.restore();
  }
}
let grainC = null;
function grain() { if (grainC) return grainC; grainC = document.createElement('canvas'); grainC.width = grainC.height = S; const g = grainC.getContext('2d'), d = g.createImageData(S, S), r = rngFor(7); for (let i = 0; i < S * S; i++) { const v = r.int(256); d.data.set([v, v, v, 255], i * 4); } g.putImageData(d, 0, 0); return grainC; }
/** Hậu kỳ: tăng tương phản + độ rực, làm nét (unsharp mask) — ảnh trong và sắc như tranh vẽ tay. */
const smalls = new Map();
/** Làm mờ rẻ, chạy mọi trình duyệt (không cần ctx.filter): thu nhỏ k lần rồi phóng lại có nội suy. */
function blurred(src, k) {
  const n = Math.max(2, Math.round(S / k)); let c = smalls.get(n);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = n; smalls.set(n, c); }
  const g = c.getContext('2d'); g.clearRect(0, 0, n, n); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, n, n); return c;
}
function grade(x, { con = 1.1, sat = 1.16, bri = 1.02, sharp = 0.7 } = {}) {
  const b = scratch(); b.setTransform(1, 0, 0, 1, 0, 0); b.imageSmoothingQuality = 'high'; b.drawImage(blurred(x.canvas, 2), 0, 0, S, S);
  const A = x.getImageData(0, 0, S, S), B = b.getImageData(0, 0, S, S), a = A.data, bd = B.data, k = bri * 255;
  for (let i = 0; i < a.length; i += 4) {
    let r = a[i] + sharp * (a[i] - bd[i]), g = a[i + 1] + sharp * (a[i + 1] - bd[i + 1]), bl = a[i + 2] + sharp * (a[i + 2] - bd[i + 2]);
    const l = 0.299 * r + 0.587 * g + 0.114 * bl; r = l + (r - l) * sat; g = l + (g - l) * sat; bl = l + (bl - l) * sat;   // độ rực
    r = ((r / 255 - 0.5) * con + 0.5) * k; g = ((g / 255 - 0.5) * con + 0.5) * k; bl = ((bl / 255 - 0.5) * con + 0.5) * k; // tương phản
    a[i] = r < 0 ? 0 : r > 255 ? 255 : r; a[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; a[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
  }
  x.putImageData(A, 0, 0); pool.push(b);
}
/** Vành kim loại vát cạnh: dải sáng-tối xoay quanh (conic), mép trong tối, chỉ sáng mảnh. */
function metalRing(x, cx, cy, R, w, c) {
  const g = x.createConicGradient(-2.4, cx, cy);
  for (const [o, k] of [[0, 1], [0.12, 0.45], [0.25, 0.85], [0.4, 0.25], [0.55, 0.7], [0.7, 0.2], [0.85, 0.6], [1, 1]]) g.addColorStop(o, mix(c, k));
  x.save(); x.lineWidth = w + 2.2; x.strokeStyle = 'rgba(4,5,10,0.95)'; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
  x.lineWidth = w; x.strokeStyle = g; x.stroke();
  x.lineWidth = 0.6; x.strokeStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.arc(cx, cy, R - w / 2 + 0.4, -2.9, -0.6); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.arc(cx, cy, R + w / 2 - 0.3, 0.3, 2.6); x.stroke();
  x.restore();
}
/** Màu kim loại theo độ sáng k (0 tối – 1 loá) quanh màu gốc. */
function mix(c, k) { const n = parseInt(c.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255, f = (v) => Math.round(k < 0.5 ? v * (0.18 + k * 1.64) : v + (255 - v) * (k - 0.5) * 1.6); return `rgb(${f(R)},${f(G)},${f(B)})`; }
function finish(x, rim = '#e8d8b0', bloomK = 0.45) {
  bloom(x, bloomK); grade(x);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.07; x.drawImage(grain(), 0, 0); x.restore();
  x.save();
  x.fillStyle = rad(x, 64, 60, 66, [[0.62, '#000000', 0], [0.88, '#000000', 0.42], [1, '#000000', 0.85]]); x.fillRect(0, 0, 128, 128);
  x.fillStyle = lin(x, 0, 4, 0, 50, [[0, '#ffffff', 0.2], [1, '#ffffff', 0]]); x.beginPath(); x.ellipse(64, 16, 50, 22, 0, 0, TAU); x.fill();
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; x.beginPath(); x.arc(64, 64, 63.2, 0, TAU); x.fill();
  x.globalCompositeOperation = 'source-over';
  x.save(); x.beginPath(); x.arc(64, 64, 58.6, 0, TAU); x.clip(); x.shadowColor = col(ACC || rim, 0.9); x.shadowBlur = 5 * K; x.lineWidth = 2; x.strokeStyle = col(ACC || rim, 0.6); x.beginPath(); x.arc(64, 64, 59.6, 0, TAU); x.stroke(); x.restore();
  metalRing(x, 64, 64, 61, 2.8, rim);
  x.restore();
}
const begin = () => { texN = 0; ACC = null; };
function paint(key, fn, rim, bloomK) {
  const st = staticPaint(key); if (st) return st; // ảnh dựng sẵn (paintStatic.js): không vẽ lúc chạy
  if (cache.has(key)) return cache.get(key);
  const x = mk(), r = rngFor([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7) >>> 0);
  begin(); fn(x, r); finish(x, rim, bloomK);
  const url = x.canvas.toDataURL('image/png'); cache.set(key, url); return url;
}
const img = (url) => `<img class="art" src="${url}" alt="" draggable="false">`;

// —— vật thể dùng chung ——
const ANCHOR = 'M0-58a9 9 0 1 1 0.1 0zM0-48v86M-20-30h40M-44 14c6 26 24 40 44 40s38-14 44-40';
function anchor(x, cx, cy, deg, s, fill) {
  const p = tp(ANCHOR, cx, cy, deg, s);
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 6 * K; x.shadowOffsetY = 3 * K; x.lineWidth = 11 * s; x.strokeStyle = '#2a1806'; x.stroke(p); x.shadowColor = 'transparent';
  x.lineWidth = 9 * s; x.strokeStyle = fill; x.stroke(p);
  x.lineWidth = 2.4 * s; x.strokeStyle = 'rgba(255,246,210,0.8)'; x.translate(-1.2, -1.2); x.stroke(p);
  x.restore();
  for (const sd of [-1, 1]) solid(x, tp(`M${sd * 44} 14l${sd * 10} 12 ${-sd * 18} 0z`, cx, cy, deg, s), fill, { shadow: false });
}
/** Đèn lồng giấy: thân tròn căng, nan tre cong theo thân, lửa sáng lõi, chóp/đế đồng vát, móc treo, tua rua. */
function lantern(x, cx, cy, s, paper = ['#fff8d8', '#ffb84a', '#c8420e']) {
  const T = (d) => tp(d, cx, cy, 0, s), body = T('M-12-21C-26-19-29-8-29 0C-29 8-26 19-12 21H12C26 19 29 8 29 0C29-8 26-19 12-21Z');
  glow(x, cx, cy, 40 * s, paper[1], 0.65);
  x.save(); x.lineCap = 'round'; x.strokeStyle = '#2a1206'; x.lineWidth = 2.2 * s; x.stroke(T('M0-26V-34')); x.lineWidth = 1.6 * s; x.strokeStyle = '#c89040'; x.beginPath(); x.arc(cx, cy - 37 * s, 3.4 * s, 0, TAU); x.stroke(); x.restore();
  x.fillStyle = rad(x, cx - 4 * s, cy - 3 * s, 32 * s, [[0, '#ffffff'], [0.22, paper[0]], [0.6, paper[1]], [1, paper[2]]]); x.fill(body);
  x.save(); x.clip(body);
  x.fillStyle = lin(x, cx - 29 * s, 0, cx + 29 * s, 0, [[0, '#000000', 0.45], [0.25, '#000000', 0], [0.75, '#000000', 0], [1, '#000000', 0.5]]); x.fill(body);
  x.strokeStyle = col(paper[2], 0.6); x.lineWidth = 0.9 * s;
  for (const k of [-0.8, -0.5, -0.2, 0.15, 0.45, 0.75]) { x.beginPath(); x.moveTo(cx + k * 14 * s, cy - 21 * s); x.bezierCurveTo(cx + k * 34 * s, cy - 10 * s, cx + k * 34 * s, cy + 10 * s, cx + k * 14 * s, cy + 21 * s); x.stroke(); }
  x.globalCompositeOperation = 'lighter'; x.fillStyle = rad(x, cx, cy + 2 * s, 14 * s, [[0, '#ffffff', 0.9], [0.4, paper[0], 0.5], [1, paper[1], 0]]); x.fillRect(cx - 20 * s, cy - 20 * s, 40 * s, 40 * s);
  x.globalCompositeOperation = 'source-over'; x.strokeStyle = 'rgba(150,40,10,0.55)'; x.lineWidth = 1.1 * s; x.beginPath(); x.moveTo(cx - 8 * s, cy - 4 * s); x.bezierCurveTo(cx - 8 * s, cy - 12 * s, cx + 4 * s, cy - 12 * s, cx + 3 * s, cy - 5 * s); x.bezierCurveTo(cx + 2 * s, cy, cx - 4 * s, cy - 1 * s, cx - 3 * s, cy - 5 * s); x.moveTo(cx + 2 * s, cy + 6 * s); x.bezierCurveTo(cx + 10 * s, cy + 4 * s, cx + 12 * s, cy + 12 * s, cx + 5 * s, cy + 13 * s); x.stroke();
  x.restore();
  const capG = (y0, y1) => lin(x, cx - 14 * s, 0, cx + 14 * s, 0, [[0, '#4a2406'], [0.25, '#ffe6a0'], [0.5, '#c88a28'], [0.75, '#ffd880'], [1, '#4a2406']]);
  for (const [d, y0, y1] of [['M-15-27h30l-3 7h-24z', -27, -20], ['M-12 20h24l3 7h-30z', 20, 27]]) { x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 3 * K; x.shadowOffsetY = 1 * K; x.fillStyle = capG(y0, y1); x.fill(T(d)); x.restore(); x.lineWidth = 0.6; x.strokeStyle = 'rgba(40,16,0,0.8)'; x.stroke(T(d)); }
  x.fillStyle = 'rgba(255,250,220,0.8)'; x.fill(T('M-14-27h28v1h-28z'));
  for (let i = -2; i <= 2; i++) { const p = T(`M${i * 1.6}-0.5C${i * 2.4} 4 ${i * 3.4} 10 ${i * 3} 16h1C${i * 3.6 + 1} 10 ${i * 2.6 + 1} 4 ${i * 1.6 + 1}-0.5Z`); x.save(); x.translate(0, 27 * s); x.fillStyle = lin(x, cx, cy, cx, cy + 16 * s, [[0, '#e83a20'], [1, '#6a0a04']]); x.fill(p); x.restore(); }
  x.fillStyle = '#e8b048'; x.beginPath(); x.arc(cx, cy + 28 * s, 2.2 * s, 0, TAU); x.fill();
}

/** Đài sen nâng vật: hai lớp cánh xoè (sau tối, trước sáng), gân cánh, nhuỵ vàng, quầng sáng ở lòng sen. */
function lotus(x, cx, cy, s = 1, c = ['#fff4f8', '#ff9ac8', '#a02a6a'], glowC = '#ffd070') {
  const petal = 'M0 0C-9-10-10-26 0-40C10-26 9-10 0 0Z';
  glow(x, cx, cy - 6 * s, 34 * s, glowC, 0.55);
  for (const [row, angs, sc, dy, k] of [[0, [-78, -52, -26, 0, 26, 52, 78], 0.95, 0, 0.55], [1, [-60, -30, 0, 30, 60], 0.85, 5, 0.85], [2, [-36, 0, 36], 0.72, 9, 1]]) {
    for (const a of angs) {
      const p = new Path2D(); p.addPath(new Path2D(petal), new DOMMatrix().translateSelf(cx, cy + dy * s).scaleSelf(1, 0.82).rotateSelf(a).scaleSelf(s * sc));
      const tip = [cx + Math.sin(a * Math.PI / 180) * 40 * s * sc, cy + dy * s - Math.cos(a * Math.PI / 180) * 40 * s * sc * 0.82];
      solid(x, p, lin(x, tip[0], tip[1], cx, cy + dy * s, [[0, c[0]], [0.4, c[1]], [1, mix(c[2], 0.25 + k * 0.2)]]), { shadow: row === 0, sd: 1.5, rd: 1, surf: 0.12, rim: col(glowC, 0.8), ao: 0.2 });
      x.save(); x.clip(p); x.strokeStyle = col(c[2], 0.35); x.lineWidth = 0.5; x.beginPath(); x.moveTo(cx, cy + dy * s); x.lineTo(tip[0], tip[1]); x.stroke(); x.restore();
    }
    void row;
  }
  x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rad(x, cx, cy, 16 * s, [[0, '#ffffff', 0.8], [0.4, glowC, 0.6], [1, glowC, 0]]); x.beginPath(); x.ellipse(cx, cy, 18 * s, 8 * s, 0, 0, TAU); x.fill(); x.restore();
}

/** Lá trúc rủ hai bên khung (bóng tối, viền sáng lục). */
function leavesBamboo(x, r) {
  for (let i = 0; i < 12; i++) { const L = i < 6, X = L ? r.range(0, 30) : r.range(98, 128), Y = r.range(4, 60), a = (L ? 20 : 160) + r.range(-30, 30), T = { cx: X, cy: Y, deg: a, s: r.range(0.5, 0.8) };
    solid(x, D.P('M0 0C8-5 24-6 36 0C24 5 8 5 0 0Z', T), D.LG(x, T, 0, -5, 0, 5, [[0, '#4ac078'], [1, '#062a14']]), { shadow: false, sd: 1, rd: 0.8, surf: 0, ao: 0, rim: 'rgba(170,255,200,0.7)' }); }
}

// ———————————————————— ICON TỪNG CHIÊU ————————————————————
const ICONS = {
  hoa_ren: {
    s1: (x, r) => { // Vung Búa: búa rèn quét thành cung lửa
      bg(x, 30, 100, [[0, '#ff8a2a'], [0.35, '#8a2208'], [1, '#160404']], 120);
      rays(x, r, 24, 118, { n: 30, a0: -1.9, a1: -0.2, r0: 20, len: [60, 120], w: [3, 9], c: ['#ff7a1a', '#ffb040'], alpha: 0.35 });
      for (let k = 0; k < 6; k++) { // cung lửa nhiều lớp
        const R = 92 - k * 7, p = ribbon(arcPts(24, 118, R, -2.25, -1.02, 40), (t) => (3 + 15 * Math.pow(t, 1.6)) * (1 - k * 0.13));
        x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, 0, 40, 100, 20, [[0, '#ff3a00', 0], [0.5, '#ff6a10', 0.7], [0.85, '#ffc050', 0.95], [1, '#fff4d0', 1]]); x.fill(p); x.restore();
      }
      D.hammer(x, { cx: 64, cy: 60, deg: 40, s: 0.86 }, { core: '#ff7a1a' });
      glow(x, 106, 62, 26, '#ff8a2a', 0.9); glow(x, 108, 62, 10, '#fff0c0', 0.8);
      sparks(x, r, 14, [70, 50, 124, 110], ['#ffb040', '#ff7a1a', '#ffe08a']);
    },
    s2: (x, r) => { // Xỉ Sắt: giáp ngực sắt đen nứt dung nham
      bg(x, 64, 70, [[0, '#ff7a1a'], [0.3, '#7a1a06'], [1, '#120404']], 90);
      rays(x, r, 64, 70, { n: 34, r0: 26, len: [30, 70], w: [3, 8], c: ['#ff6a10', '#ffa040'], alpha: 0.45 });
      const plate = tp('M0-46l38 13c3 30-7 60-38 84-31-24-41-54-38-84z', 64, 66, 0, 1);
      solid(x, plate, lin(x, 30, 20, 90, 120, [[0, '#8a8480'], [0.35, '#45403c'], [0.8, '#1e1a18'], [1, '#0c0a09']]), { rd: 2, sd: 5 });
      x.fillStyle = lin(x, 0, 20, 0, 40, [[0, '#ffffff', 0.35], [1, '#ffffff', 0]]); x.fill(tp('M0-46l38 13c0 5 0 8-1 11L0-34-37-22c-1-3-1-6-1-11z', 64, 66));
      const cracks = tp('M-20-20l8 12-4 14 10 10M18-18l-8 11 5 15-11 9M0-10l-6 12 7 9M-22 6c-1 8 2 14 0 22M20 14c1 6-1 11 0 17', 64, 66);
      x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,90,10,0.6)'; x.lineWidth = 7; x.shadowColor = '#ff6a10'; x.shadowBlur = 10 * K; x.stroke(cracks);
      x.shadowBlur = 0; x.strokeStyle = '#ffb040'; x.lineWidth = 2.8; x.stroke(cracks); x.strokeStyle = '#fff4c8'; x.lineWidth = 1; x.stroke(cracks); x.restore();
      for (const [dx, dy, s] of [[-22, 30, 3.2], [20, 33, 2.8], [-6, 46, 2.2]]) { const d = tp('M0-5c3 4 4 7 4 9a4 4 0 0 1-8 0c0-2 1-5 4-9z', 64 + dx, 66 + dy, 0, s / 2.5); shine(x, d, '#ff7a1a', 6); x.fillStyle = '#ffd070'; x.fill(d); }
      sparks(x, r, 10, [20, 10, 108, 60], ['#ffb040', '#ff7a1a']);
    },
    s3: (x, r) => { // Đe Trời: đe sắt rơi từ trời, đất nổ tung
      bg(x, 64, 116, [[0, '#ffd070'], [0.25, '#ff6a10'], [0.55, '#6a1606'], [1, '#100404']], 120);
      rays(x, r, 64, 118, { n: 40, a0: -Math.PI, a1: 0, r0: 10, len: [50, 110], w: [3, 10], c: ['#ffb040', '#ff7a1a', '#fff0c0'], alpha: 0.55 });
      streaks(x, r, Math.PI / 2, { n: 22, box: [34, 0, 94, 50], len: [30, 60], w: [2, 6], c: ['#ff8a2a', '#ffd070'], alpha: 0.85 });
      const anvil = tp('M-34-14h68l-12 14h-12v16h16v12h-52v-12h16v-16h-12z', 64, 58, 0, 1.15);
      solid(x, anvil, lin(x, 40, 30, 90, 100, [[0, '#e8e4de'], [0.35, '#8a827a'], [0.75, '#3a3430'], [1, '#141210']]), { rd: 2.2, sd: 5 });
      x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, 0, 74, 0, 92, [[0, '#ff6a10', 0], [1, '#ffb040', 0.7]]); x.fill(anvil); x.restore();
      x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rad(x, 64, 112, 50, [[0, '#ffffff', 0.9], [0.3, '#ffd070', 0.8], [1, '#ff6a10', 0]]); x.beginPath(); x.ellipse(64, 112, 56, 12, 0, 0, TAU); x.fill(); x.restore();
      for (let i = 0; i < 9; i++) { const a = r.range(-2.9, -0.25), d = r.range(26, 52); solid(x, tp('M-4-3l5-2 4 3-2 5-6 0z', 64 + Math.cos(a) * d, 114 + Math.sin(a) * d * 0.7, r.range(0, 360), r.range(0.8, 1.6)), '#3a2a22', { shadow: false, rim: 'rgba(255,170,80,0.9)' }); }
      sparks(x, r, 16, [14, 70, 114, 120], ['#ffd070', '#ff8a2a']);
    },
  },
  thach_quy: {
    s1: (x, r) => { // Móc Neo: mỏ neo đồng thau lao tới, xích, tia nước
      bg(x, 70, 40, [[0, '#7ae8ff'], [0.35, '#0e5a7a'], [1, '#020c1a']], 110);
      rays(x, r, 70, -10, { n: 14, a0: 1.2, a1: 2.1, r0: 0, len: [100, 150], w: [6, 16], c: '#9af0ff', alpha: 0.18 });
      streaks(x, r, -2.3, { n: 18, box: [10, 40, 90, 120], len: [20, 50], w: [1, 3], c: ['#bff6ff', '#5fd8ff'], alpha: 0.7 });
      for (let i = 0; i < 6; i++) { const cx = 4 + i * 9, cy = 4 + i * 9; x.save(); x.lineWidth = 3.2; x.strokeStyle = lin(x, cx - 6, cy - 6, cx + 6, cy + 6, [[0, '#f4f8fa'], [1, '#4a5a64']]); x.beginPath(); x.ellipse(cx, cy, 6.5, 3.6, i % 2 ? -0.8 : 0.8, 0, TAU); x.stroke(); x.restore(); }
      anchor(x, 68, 64, -24, 0.8, lin(x, 30, 20, 110, 110, [[0, '#fff2c0'], [0.3, '#e0b058'], [0.7, '#8a5a1c'], [1, '#3a240a']]));
      glow(x, 96, 92, 26, '#5fe8ff', 0.6);
      for (let i = 0; i < 16; i++) { const X = r.range(70, 124), Y = r.range(70, 124), s = r.range(1, 3); x.fillStyle = rad(x, X - s * 0.3, Y - s * 0.3, s, [[0, '#ffffff'], [1, '#5fd8ff', 0.4]]); x.beginPath(); x.arc(X, Y, s, 0, TAU); x.fill(); }
    },
    s2: (x, r) => { // Dậm Áp Suất: ủng lặn nặng dậm xuống, sóng áp suất toả
      bg(x, 64, 104, [[0, '#c8f8ff'], [0.25, '#2ab8e8'], [0.6, '#0a3a5a'], [1, '#020a14']], 110);
      rays(x, r, 64, 104, { n: 44, a0: -Math.PI, a1: 0, r0: 14, len: [40, 90], w: [2, 7], c: ['#9af0ff', '#ffffff'], alpha: 0.5 });
      for (const [rx, ry, a, w] of [[58, 15, 0.9, 3], [40, 10, 1, 2.4], [24, 6, 1, 2]]) { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = col('#bff6ff', a); x.lineWidth = w; x.shadowColor = '#36d8ff'; x.shadowBlur = 8 * K; x.beginPath(); x.ellipse(64, 104, rx, ry, 0, 0, TAU); x.stroke(); x.restore(); }
      D.boot(x, r, { cx: 56, cy: 72, deg: 0, s: 0.86 }, { mat: 'steel', cuff: 'gold', sole: '#14181c', variant: 'plate' });
      for (let i = 0; i < 26; i++) { const a = r.range(-3, -0.15), d = r.range(30, 62), X = 64 + Math.cos(a) * d, Y = 104 + Math.sin(a) * d * 0.55, s = r.range(0.8, 2.4); x.fillStyle = rad(x, X, Y, s, [[0, '#ffffff'], [1, '#7fe8ff', 0.3]]); x.beginPath(); x.arc(X, Y, s, 0, TAU); x.fill(); }
    },
    s3: (x, r) => { // Xoáy Nước Sâu: xoáy nước sâu cuộn quanh mũ lặn
      bg(x, 64, 64, [[0, '#01060c'], [0.25, '#04304a'], [0.6, '#0e7aa0'], [1, '#04202e']], 90);
      swirl(x, r, 64, 64, { arms: 9, r0: 10, r1: 76, turns: 1.1, w: [3, 9], c: ['#36d8ff', '#9af0ff', '#1aa8d8'], alpha: 0.75, squash: 0.92 });
      swirl(x, r, 64, 64, { arms: 6, r0: 18, r1: 60, turns: 0.9, w: [1, 2.5], c: '#ffffff', alpha: 0.9 });
      const helm = new Path2D(); helm.arc(64, 64, 19, 0, TAU);
      solid(x, helm, rad(x, 57, 56, 26, [[0, '#fff4c8'], [0.45, '#d8a048'], [1, '#4a2e0c']]), { sd: 4 });
      const glass = new Path2D(); glass.arc(64, 64, 9.5, 0, TAU);
      x.fillStyle = rad(x, 61, 60, 12, [[0, '#d8fbff'], [0.45, '#2a9ab8'], [1, '#02161e']]); x.fill(glass); x.lineWidth = 2.4; x.strokeStyle = '#3a2408'; x.stroke(glass);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(64 + Math.cos(a) * 14.5, 64 + Math.sin(a) * 14.5, 1.8, 0, TAU); x.fill(); }
      x.strokeStyle = '#fff'; x.lineWidth = 1.6; x.beginPath(); x.arc(64, 64, 6.5, -2.6, -1.6); x.stroke();
    },
  },
  bong_tre: {
    s1: (x, r) => { // Lá Bay: lá trúc sắc như dao phóng đi
      bg(x, 90, 50, [[0, '#a8ffc8'], [0.3, '#1e8a48'], [1, '#03140a']], 110);
      streaks(x, r, -0.3, { n: 26, box: [40, 10, 128, 120], len: [30, 70], w: [1, 3.5], c: ['#9affc8', '#d8ffe8', '#3ad27a'], alpha: 0.75 });
      const leaf = 'M-30 0C-14-12 18-13 40 0 18 13-14 12-30 0z';
      for (const [cx, cy, a, s] of [[62, 34, -20, 0.95], [76, 64, -14, 1.2], [60, 96, -6, 0.9]]) {
        const p = tp(leaf, cx, cy, a, s);
        x.save(); x.globalCompositeOperation = 'lighter'; x.fill(ribbon(linePts(cx - 70, cy + 18, cx - 26, cy + 6, 8).map(([X, Y]) => [X, Y]), (t) => 7 * s * t)); x.restore();
        solid(x, p, lin(x, cx - 20, cy - 10, cx + 30, cy + 12, [[0, '#f0ffe0'], [0.35, '#8ae898'], [0.75, '#1e8a48'], [1, '#063a1a']]), { rd: 1.4 });
        x.strokeStyle = 'rgba(240,255,230,0.85)'; x.lineWidth = 0.9; x.stroke(tp('M-26 0H36', cx, cy, a, s));
      }
      sparks(x, r, 10, [96, 10, 126, 110], ['#c8ffd8', '#5dffa0']);
    },
    s2: (x, r) => { // Lướt Đốt: nhát chém lưỡi liềm trắng-ngọc cắt ngang
      bg(x, 60, 64, [[0, '#2a7a4a'], [0.5, '#0a2a16'], [1, '#020a06']], 100);
      streaks(x, r, -0.75, { n: 30, box: [0, 0, 128, 128], len: [20, 60], w: [0.8, 2.4], c: ['#5dffa0', '#9affc8'], alpha: 0.5 });
      const slash = ribbon(arcPts(128, 128, 110, -2.95, -1.7, 50), (t) => 24 * Math.sin(Math.PI * t) * (0.4 + 0.6 * t));
      shine(x, slash, '#5dffa0', 12, 0.8);
      x.fillStyle = lin(x, 10, 110, 118, 20, [[0, '#5dffa0', 0], [0.45, '#9affc8'], [0.8, '#ffffff'], [1, '#ffffff', 0.4]]); x.fill(slash);
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#ffffff'; x.lineWidth = 1.4; x.beginPath(); arcPts(128, 128, 102, -2.9, -1.75, 40).forEach(([X, Y], i) => (i ? x.lineTo(X, Y) : x.moveTo(X, Y))); x.stroke(); x.restore();
      for (let i = 0; i < 7; i++) { const cx = r.range(30, 100), cy = r.range(30, 100); if (Math.abs(Math.hypot(cx - 128, cy - 128) - 110) > 14) continue; for (const h of [-1, 1]) solid(x, tp(`M0 0C6-4 12-4 18 ${h * 0}C12 4 6 4 0 0z`, cx + h * 4, cy - h * 3, r.range(-60, 30) + h * 20, 0.8), '#3ad27a', { shadow: false, rd: 0.8 }); }
      sparks(x, r, 12, [20, 20, 110, 110], ['#ffffff', '#9affc8']);
    },
    s3: (x, r) => { // Rừng Nuốt Bóng: rừng trúc đêm, mặt nạ sát thủ mắt xanh trong sương
      bg(x, 64, 60, [[0, '#2a6a44'], [0.5, '#0a2414'], [1, '#010604']], 90);
      for (const [cx, w, d] of [[14, 12, 1], [38, 7, 0.55], [92, 8, 0.55], [116, 13, 1]]) { // thân trúc có đốt, khối tròn
        const T = { cx, cy: 64, s: 1 }, st = D.P(`M${-w / 2}-70H${w / 2}V70H${-w / 2}Z`, T);
        x.save(); x.globalAlpha = d; x.fillStyle = D.LG(x, T, -w / 2, 0, w / 2, 0, [[0, '#04140a'], [0.3, '#3a8a54'], [0.55, '#1e5a34'], [1, '#020a06']]); x.fill(st);
        for (const y of [-44, -8, 28, 60]) { const yy = y + (cx % 11); x.fillStyle = D.LG(x, T, 0, yy - 2, 0, yy + 2, [[0, '#8affb8'], [0.5, '#0a2a14'], [1, '#2a6a40']]); x.fillRect(cx - w / 2 - 1, 64 + yy - 1.5, w + 2, 3); }
        x.restore();
      }
      leavesBamboo(x, r);
      x.fillStyle = lin(x, 0, 70, 0, 128, [[0, '#9affc8', 0], [0.5, '#9affc8', 0.22], [1, '#5dffa0', 0.1]]); x.fillRect(0, 70, 128, 58);
      for (const m of [-1, 1]) D.sword(x, { cx: 64 + m * 18, cy: 96, deg: m * 58, s: 0.52 }, { blade: 'steel', hilt: 'dark', grip: 'dark', gem: '#3aff8a', len: 0.8, wide: 1.1 });
      const hood = tp('M0-48c27 0 42 18 42 43 0 30-18 52-42 58-24-6-42-28-42-58 0-25 15-43 42-43z', 64, 64);
      solid(x, hood, rad(x, 54, 38, 70, [[0, '#34443c'], [0.6, '#101814'], [1, '#020404']]), { rim: 'rgba(140,255,190,0.85)', rd: 1.8, surf: 0.4 });
      x.save(); x.clip(hood); for (const [a0, b0] of [[-30, -36], [30, 36]]) { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke(tp(`M${a0 * 0.4}-46C${a0}-20 ${b0}10 ${b0 * 0.6} 50`, 64, 64)); } x.restore();
      const mask = tp('M0-24c16 0 24 10 24 22 0 16-10 28-24 32-14-4-24-16-24-32 0-12 8-22 24-22z', 64, 64);
      solid(x, mask, D.LG(x, { cx: 64, cy: 64, s: 1 }, -24, -24, 24, 30, D.bevel('dark')), { shadow: true, rim: 'rgba(200,255,220,0.6)', sd: 2 });
      for (const m of [-1, 1]) D.wire(x, tp(`M${m * 4}-20C${m * 14}-20 ${m * 20}-14 ${m * 20}-6`, 64, 64), 1, '#3aaa6a');
      const eyes = tp('M-17-4c5-6 12-6 13 0-5 2-9 2-13 0zM17-4c-5-6-12-6-13 0 5 2 9 2 13 0z', 64, 64);
      shine(x, eyes, '#5dffa0', 12, 1); x.fillStyle = '#f0fff6'; x.fill(eyes);
      D.jewel(x, { cx: 64, cy: 64, s: 1 }, 0, -18, 2.6, '#3aff8a', 'silver');
      sparks(x, r, 8, [10, 20, 118, 110], ['#9affc8'], [0.4, 1]);
    },
  },
  nguyet_ha: {
    s1: (x, r) => { // Giọt Bạc: giọt nước bạc lao đi, vệt sáng + vòng gợn
      bg(x, 84, 44, [[0, '#d8ecff'], [0.3, '#4a6ad0'], [0.7, '#141c5a'], [1, '#04061a']], 110);
      x.save(); x.globalCompositeOperation = 'lighter';
      const trail = ribbon(linePts(8, 124, 74, 54, 20), (t) => 4 + 18 * t);
      x.fillStyle = lin(x, 8, 124, 74, 54, [[0, '#8ab8ff', 0], [0.7, '#c8e0ff', 0.6], [1, '#ffffff', 0.9]]); x.fill(trail); x.restore();
      streaks(x, r, -0.8, { n: 18, box: [30, 30, 100, 100], len: [20, 50], w: [0.8, 2], c: ['#ffffff', '#a8d4ff'], alpha: 0.7 });
      for (const [R, a] of [[14, 0.9], [22, 0.6], [30, 0.35]]) { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = col('#d8ecff', a); x.lineWidth = 1.4; x.beginPath(); x.ellipse(38, 92, R, R * 0.45, -0.8, 0, TAU); x.stroke(); x.restore(); }
      const drop = tp('M0-34C10-18 22-6 22 8a22 22 0 0 1-44 0C-22-6-10-18 0-34z', 82, 48, 45, 1);
      shine(x, drop, '#a8d4ff', 14, 0.7);
      x.fillStyle = rad(x, 76, 42, 30, [[0, '#ffffff'], [0.35, '#d8e8ff'], [0.8, '#5a7ad8'], [1, '#1a2a6a']]); x.fill(drop);
      x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2.4; x.lineCap = 'round'; x.beginPath(); x.arc(84, 46, 12, -2.6, -1.6); x.stroke();
      sparks(x, r, 8, [60, 10, 124, 70], ['#ffffff', '#cfe8ff']);
    },
    s2: (x, r) => { // Xoáy Nước: xoáy nước bạc dưới trăng khuyết
      bg(x, 64, 84, [[0, '#7aa8ff'], [0.35, '#1e2e8a'], [1, '#03051a']], 100);
      glow(x, 96, 28, 34, '#fff6d8', 0.6);
      const moon = tp('M0-16a16 16 0 1 0 14 24 13 13 0 1 1-14-24z', 98, 30, 0, 1.1); shine(x, moon, '#fff6d8', 12, 0.6); x.fillStyle = rad(x, 92, 26, 22, [[0, '#ffffff'], [1, '#e8dcb0']]); x.fill(moon);
      for (let i = 0; i < 14; i++) { x.fillStyle = '#fff'; x.globalAlpha = r.range(0.4, 1); x.beginPath(); x.arc(r.range(8, 70), r.range(8, 50), r.range(0.4, 1), 0, TAU); x.fill(); } x.globalAlpha = 1;
      swirl(x, r, 60, 84, { arms: 8, r0: 4, r1: 52, turns: 1.3, w: [2, 7], c: ['#a8d4ff', '#5a8ad8', '#ffffff'], alpha: 0.85, squash: 0.48 });
      glow(x, 60, 84, 16, '#ffffff', 0.7);
    },
    s3: (x, r) => { // Lũ Nguyệt: sóng lớn cuộn trào dưới trăng tròn
      bg(x, 70, 36, [[0, '#8aa8ff'], [0.4, '#1e2a7a'], [1, '#03051a']], 110);
      rays(x, r, 72, 36, { n: 22, r0: 22, len: [20, 50], w: [2, 5], c: '#e8f0ff', alpha: 0.25 });
      const moon = new Path2D(); moon.arc(72, 36, 22, 0, TAU);
      x.fillStyle = rad(x, 66, 30, 26, [[0, '#ffffff'], [0.75, '#f4ecd0'], [1, '#c8b890']]); x.fill(moon);
      x.fillStyle = 'rgba(200,188,150,0.55)'; for (const [a, b, s] of [[64, 30, 3.5], [80, 44, 2.6], [76, 26, 2]]) { x.beginPath(); x.arc(a, b, s, 0, TAU); x.fill(); }
      const wave = tp('M0 128V82c8-24 34-40 60-34-16 4-22 16-18 28 8-16 30-20 42-6 10 12 26 14 44 2v56z');
      solid(x, wave, lin(x, 0, 50, 30, 128, [[0, '#e8f4ff'], [0.25, '#7aa8e8'], [0.7, '#1e3a8a'], [1, '#060c30']]), { rim: 'rgba(255,255,255,0.95)', rd: 2 });
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.6; x.stroke(tp('M10 84c10-16 28-26 46-26M44 84c8-12 22-16 34-8')); x.restore();
      for (let i = 0; i < 22; i++) { const X = r.range(4, 90), Y = r.range(40, 80), s = r.range(0.6, 2); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(X, Y, s, 0, TAU); x.fill(); }
    },
  },
  canh_dieu: {
    s1: (x, r) => { // Mũi Tên Gió: mũi tên xé gió, dải gió xoắn
      bg(x, 96, 30, [[0, '#ffffff'], [0.2, '#9ad8ff'], [0.55, '#1e5aa0'], [1, '#03101e']], 120);
      streaks(x, r, -Math.PI / 4, { n: 30, box: [20, 10, 120, 110], len: [30, 70], w: [1, 3], c: ['#ffffff', '#c8ecff'], alpha: 0.7 });
      for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, bx = 14 + 84 * t, by = 114 - 84 * t, o = Math.sin(t * 9 + k * 2.1) * (10 - 6 * t); pts.push([bx + o * 0.7, by + o * 0.7]); } x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, 14, 114, 98, 30, [[0, '#ffffff', 0], [1, '#ffffff', 0.8]]); x.fill(ribbon(pts, (t) => 0.6 + 3 * t)); x.restore(); }
      const T = { cx: 62, cy: 66, deg: -45, s: 1 };
      solid(x, D.P('M-62-2.2H30V2.2H-62Z', T), D.LG(x, T, 0, -2.2, 0, 2.2, D.bevel('wood')), { shadow: true, sd: 1.2 });
      for (const k of [-44, -40, 18, 22]) D.etch(x, D.P(`M${k}-2.2l2 4.4`, T), 0.5, 0.8);
      for (const [o, c0] of [[0, '#ff9a8a'], [8, '#ffd0c0']]) for (const m of [-1, 1]) solid(x, D.P(`M${-50 + o} 0L${-62 + o} ${m * 11}L${-46 + o} ${m * 9}L${-38 + o} 0Z`, T), D.LG(x, T, -62, 0, -38, 0, [[0, c0], [1, '#a8241a']]), { shadow: false, sd: 1, surf: 0, ao: 0 });
      solid(x, D.P('M24-5H34L36 0L34 5H24Z', T), D.LG(x, T, 0, -5, 0, 5, 'gold'), { shadow: false, sd: 1 });
      const hd = D.P('M34-9C44-8 54-4 64 0C54 4 44 8 34 9L38 0Z', T); shine(x, hd, '#bff0ff', 8, 0.6);
      solid(x, hd, D.LG(x, T, 0, -9, 0, 9, D.bevel('silver')), { rd: 1.2 });
      D.jewel(x, T, 29, 0, 2.6, '#5ae0ff');
      glow(x, 100, 28, 18, '#ffffff', 0.9);
    },
    s2: (x, r) => { // Lộn Diều: con diều đỏ lộn vòng theo gió
      bg(x, 80, 46, [[0, '#d8f4ff'], [0.35, '#3a8ad0'], [1, '#04122a']], 110);
      for (let k = 0; k < 4; k++) { const p = ribbon(arcPts(54, 70, 44 - k * 6, 0.6, 0.6 + 4.6, 50), (t) => (1 + 9 * t) * (1 - k * 0.2)); x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = col('#ffffff', 0.35 - k * 0.06); x.fill(p); x.restore(); }
      const KT = { cx: 82, cy: 46, deg: 18, s: 1.05 }, kite = D.P('M0-36L26 0 0 48-26 0z', KT);
      solid(x, kite, lin(x, 60, 10, 110, 90, [[0, '#ffe8d8'], [0.35, '#ff6a4a'], [1, '#7a1408']]), { rd: 2, surf: 0.4 });
      for (const [d, a] of [['M0-36L26 0H0Z', 0.18], ['M0-36L-26 0H0Z', -0.05], ['M0 48L26 0H0Z', -0.25], ['M0 48L-26 0H0Z', -0.12]]) D.fillA(x, D.P(d, KT), a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`);
      D.wire(x, kite, 1.4, D.LG(x, KT, -26, -36, 26, 48, 'gold')); D.wire(x, D.P('M0-36V48M-26 0H26', KT), 1, D.LG(x, KT, -26, -36, 26, 48, 'gold'));
      D.wire(x, D.P('M-9 4C-9-6 5-8 7-1C9 5 1 8-2 4C-4 1 0-1 2 1', KT), 1.2, D.LG(x, KT, -9, -8, 9, 8, 'gold')); D.jewel(x, KT, 0, 0, 2.4, '#5ad8ff');
      x.strokeStyle = '#ffe2d8'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(70, 90); x.bezierCurveTo(62, 100, 74, 108, 64, 120); x.stroke();
      for (const [X, Y] of [[67, 100], [66, 112]]) solid(x, tp('M0 0l-6-2 2 6z', X, Y), '#ff6a4a', { shadow: false, rd: 0.6 });
      sparks(x, r, 8, [10, 10, 70, 60], '#ffffff');
    },
    s3: (x, r) => { // Mưa Tên: mưa tên ánh sáng trút xuống
      bg(x, 64, 112, [[0, '#ffffff'], [0.2, '#9ad8ff'], [0.55, '#1a4a8a'], [1, '#030c1a']], 120);
      for (let i = 0; i < 18; i++) { const X = r.range(6, 122), Y = r.range(-20, 60), L = r.range(30, 60); x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, X, Y, X, Y + L, [[0, '#9ad8ff', 0], [1, '#ffffff', 0.6]]); x.fill(ribbon(linePts(X, Y, X + 6, Y + L, 4), (t) => 0.4 + 1.8 * t)); x.restore(); }
      for (const [X, Y, sc] of [[30, 30, 0.7], [62, 14, 0.85], [94, 34, 0.75], [46, 62, 0.95], [82, 66, 1], [20, 70, 0.6], [108, 74, 0.65]]) {
        const T = { cx: X, cy: Y, deg: 96, s: sc }; x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = D.LG(x, T, -60, 0, 0, 0, [[0, '#9ad8ff', 0], [1, '#e8f8ff', 0.8]]); x.fill(D.P('M-60-3H-10V3H-60Z', T)); x.restore();
        solid(x, D.P('M-22-1.6H14V1.6H-22Z', T), D.LG(x, T, 0, -1.6, 0, 1.6, D.bevel('wood')), { shadow: true, sd: 0.8, surf: 0, ao: 0 });
        for (const m of [-1, 1]) solid(x, D.P(`M-14 0L-24 ${m * 7}L-12 ${m * 5}L-6 0Z`, T), D.LG(x, T, -24, 0, -6, 0, [[0, '#ffffff'], [1, '#6ab8e8']]), { shadow: false, sd: 0.6, surf: 0, ao: 0 });
        const hd = D.P('M12-6C18-5 22-2 28 0C22 2 18 5 12 6L14 0Z', T); shine(x, hd, '#bff0ff', 6, 0.6); solid(x, hd, D.LG(x, T, 0, -6, 0, 6, D.bevel('silver')), { shadow: false, rd: 0.8, sd: 1, surf: 0, ao: 0 });
      }
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(220,244,255,0.9)'; x.lineWidth = 2; x.beginPath(); x.ellipse(64, 112, 50, 9, 0, 0, TAU); x.stroke(); x.restore();
      sparks(x, r, 14, [14, 104, 114, 120], ['#ffffff', '#c8ecff']);
    },
  },
  long_dang: {
    s1: (x, r) => { // Đèn Trôi: đèn lồng bay, đuôi lửa
      bg(x, 78, 48, [[0, '#ffe08a'], [0.3, '#c84a0e'], [1, '#160602']], 110);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([8 + 66 * t + Math.sin(t * 7 + k) * 4, 124 - 70 * t + Math.cos(t * 6 + k) * 3]); } x.fillStyle = lin(x, 8, 124, 74, 54, [[0, '#ff4a00', 0], [0.6, '#ff8a2a', 0.6], [1, '#ffe08a', 0.9]]); x.fill(ribbon(pts, (t) => (2 + 12 * t) * (1 - k * 0.25))); }
      x.restore();
      lantern(x, 78, 48, 1.4);
      sparks(x, r, 16, [6, 60, 70, 124], ['#ffd27a', '#ff8a2a']);
    },
    s2: (x, r) => { // Thắp Sáng: đài sen nâng ngọn lửa ấm
      bg(x, 64, 48, [[0, '#fff2c0'], [0.25, '#ffa040'], [0.6, '#6a2408'], [1, '#100402']], 110);
      rays(x, r, 64, 46, { n: 30, r0: 14, len: [30, 70], w: [2, 7], c: ['#ffe08a', '#ffb040'], alpha: 0.45 });
      const flame = tp('M0-34c14 16 22 28 14 42-4 8-24 8-28 0-8-14 0-26 14-42z', 64, 50);
      shine(x, flame, '#ffb040', 16, 0.9);
      x.fillStyle = rad(x, 64, 46, 30, [[0, '#ffffff'], [0.35, '#fff0a0'], [0.7, '#ffa030'], [1, '#d83a0a']]); x.fill(flame);
      lotus(x, 64, 98, 1.2, ['#fff8e0', '#ffb040', '#8a2a04'], '#ffd070');
      sparks(x, r, 14, [20, 8, 108, 70], ['#ffe08a', '#ffffff']);
    },
    s3: (x, r) => { // Hội Đèn: đèn trời bay lên kín bầu đêm
      bg(x, 64, 70, [[0, '#7a2a0a'], [0.5, '#2a0c04'], [1, '#080202']], 110);
      for (let i = 0; i < 24; i++) glow(x, r.range(0, 128), r.range(0, 128), r.range(3, 7), '#ffb040', 0.35);
      for (const [cx, cy, s] of [[64, 112, 0.5], [24, 92, 0.6], [104, 96, 0.65], [36, 40, 0.75], [96, 34, 0.8], [64, 20, 0.55], [18, 20, 0.45], [112, 66, 0.55], [64, 66, 1.3]]) lantern(x, cx, cy, s);
      streaks(x, r, -Math.PI / 2, { n: 14, box: [10, 20, 118, 128], len: [10, 30], w: [0.6, 1.6], c: '#ffd27a', alpha: 0.6 });
    },
  },
};

// —— phép bổ trợ / biến về / hồi máu / đánh thường ——
const SPELL = {
  recall: (x, r) => { // vòng phù văn xanh + cột sáng
    bg(x, 64, 92, [[0, '#8fd0ff'], [0.3, '#1e6ad8'], [0.65, '#0a2060'], [1, '#02061a']], 110);
    rays(x, r, 64, 92, { n: 34, a0: -Math.PI + 0.2, a1: -0.2, r0: 6, len: [60, 110], w: [2, 6], c: ['#8fd8ff', '#ffffff'], alpha: 0.35 });
    for (const [rx, ry, w, a] of [[46, 15, 2.4, 1], [36, 11, 1.2, 0.8], [26, 8, 1, 0.7]]) { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = col('#bfe8ff', a); x.shadowColor = '#3a9aff'; x.shadowBlur = 8 * K; x.lineWidth = w; x.beginPath(); x.ellipse(64, 92, rx, ry, 0, 0, TAU); x.stroke(); x.restore(); }
    x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.fillStyle = '#d8f0ff'; x.save(); x.translate(64 + Math.cos(a) * 41, 92 + Math.sin(a) * 13); x.rotate(a); x.fillRect(-1.5, -0.8, 3, 1.6); x.restore(); } x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, 0, 0, 0, 92, [[0, '#8fd8ff', 0], [0.6, '#bfe8ff', 0.6], [1, '#ffffff', 0.95]]); x.beginPath(); x.moveTo(52, 0); x.lineTo(76, 0); x.lineTo(70, 92); x.lineTo(58, 92); x.closePath(); x.fill(); x.restore();
    sparks(x, r, 14, [24, 20, 104, 100], ['#ffffff', '#8fd8ff']);
  },
  restore: (x, r) => { // đài sen nâng quả cầu sinh lực xanh
    bg(x, 64, 52, [[0, '#8affa8'], [0.3, '#1e9a4a'], [0.65, '#0a3a1c'], [1, '#020c06']], 110);
    rays(x, r, 64, 50, { n: 30, r0: 14, len: [30, 80], w: [2, 6], c: ['#9affb0', '#ffffff'], alpha: 0.32 });
    const orb = new Path2D(); orb.arc(64, 48, 15, 0, TAU); shine(x, orb, '#5aff8a', 18, 0.9);
    x.fillStyle = rad(x, 60, 44, 18, [[0, '#ffffff'], [0.5, '#c8ffd0'], [1, '#3ad26a']]); x.fill(orb);
    x.fillStyle = '#ffffff'; x.fill(tp('M-3-10h6v7h7v6h-7v7h-6v-7h-7v-6h7z', 64, 48));
    lotus(x, 64, 98, 1.2, ['#ffffff', '#ff7ab8', '#7a1048'], '#9affb0');
    sparks(x, r, 12, [20, 10, 108, 70], ['#c8ffd0', '#ffffff']);
  },
  chop_buoc: (x, r) => { // tia chớp tím lam + bóng ảnh lướt
    bg(x, 76, 52, [[0, '#9a80ff'], [0.35, '#3a1a9a'], [1, '#06021a']], 110);
    streaks(x, r, -0.35, { n: 24, box: [10, 20, 110, 110], len: [30, 70], w: [1, 3], c: ['#c8b8ff', '#ffffff', '#7ad8ff'], alpha: 0.55 });
    const bolt = tp('M14-44L-8 0h12l-10 46 32-56H12l12-34z', 70, 62);
    shine(x, bolt, '#a080ff', 14, 0.9); x.fillStyle = lin(x, 60, 18, 80, 108, [[0, '#ffffff'], [0.5, '#e0d8ff'], [1, '#8a6aff']]); x.fill(bolt);
    sparks(x, r, 10, [20, 10, 110, 120], ['#ffffff', '#b8a0ff']);
  },
  hoi_phuc: (x, r) => SPELL.restore(x, r),
  tram_hon: (x, r) => { // nhát chém đỏ thẫm xuyên qua
    bg(x, 64, 64, [[0, '#d83a2a'], [0.35, '#6a0e08'], [1, '#100202']], 100);
    rays(x, r, 64, 64, { n: 26, r0: 10, len: [30, 70], w: [2, 5], c: ['#ff5a3a', '#ffb0a0'], alpha: 0.3 });
    for (const [o, w] of [[0, 18], [-14, 8]]) { const s = ribbon(linePts(10 + o, 116, 118 + o, 12, 30), (t) => w * Math.sin(Math.PI * t)); shine(x, s, '#ff3a1a', 10, 0.8); x.fillStyle = lin(x, 10, 116, 118, 12, [[0, '#ff5a3a', 0], [0.5, '#ffffff'], [1, '#ff5a3a', 0]]); x.fill(s); }
    sparks(x, r, 14, [10, 10, 118, 118], ['#ffb0a0', '#ffffff']);
  },
  thu_hoach: (x, r) => { // lưỡi liềm vàng
    bg(x, 64, 60, [[0, '#e8a830'], [0.35, '#7a4a0a'], [1, '#0c0602']], 100);
    rays(x, r, 64, 60, { n: 26, r0: 12, len: [30, 70], w: [2, 5], c: ['#ffe08a', '#ffffff'], alpha: 0.3 });
    D.crescent(x, { cx: 62, cy: 68, deg: -24, s: 1.05 }, { mat: 'silver', handle: 'dark', R: 46, thick: 15 });
    sparks(x, r, 12, [20, 20, 110, 110], ['#ffe08a', '#ffffff']);
  },
  gio_luot: (x, r) => { // ba dải gió cuộn + lông vũ
    bg(x, 60, 60, [[0, '#8a7ad8'], [0.45, '#2a1e6a'], [1, '#06041a']], 100);
    streaks(x, r, 0, { n: 20, box: [20, 10, 128, 118], len: [30, 70], w: [1, 3], c: ['#ffffff', '#d8d0ff'], alpha: 0.5 });
    for (const [y, R] of [[40, 16], [64, 20], [88, 14]]) { const p = ribbon([...linePts(8, y, 80, y, 16), ...arcPts(80, y - R, R, Math.PI / 2, -Math.PI * 0.9, 20).slice(1)], (t) => 1 + 6 * Math.sin(Math.PI * t)); shine(x, p, '#8a7aff', 6, 0.5); x.fillStyle = lin(x, 8, 0, 100, 0, [[0, '#d8d0ff', 0.3], [1, '#ffffff']]); x.fill(p); }
  },
  giai_troi: (x, r) => { // xích vàng đứt tung
    bg(x, 64, 64, [[0, '#ffd89a'], [0.3, '#a0520e'], [1, '#0c0402']], 100);
    rays(x, r, 64, 64, { n: 30, r0: 6, len: [40, 80], w: [2, 6], c: ['#ffe8b0', '#ffffff'], alpha: 0.35 });
    for (const [x0, y0, x1, y1] of [[2, 112, 48, 74], [126, 16, 80, 54]]) for (let i = 0; i < 4; i++) {
      const t = i / 3, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI, T = { cx, cy, deg: a, s: 1 };
      if (i % 2) solid(x, D.P('M-12-2.6h24a2.6 2.6 0 0 1 0 5.2h-24a2.6 2.6 0 0 1 0-5.2z', T), D.LG(x, T, 0, -2.6, 0, 2.6, D.bevel('gold')), { sd: 1.2 });
      else { const lp = D.P('M-10-8h20a8 8 0 0 1 0 16h-20a8 8 0 0 1 0-16zM-9-3.4h18a3.4 3.4 0 0 1 0 6.8h-18a3.4 3.4 0 0 1 0-6.8z', T); x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 4 * K; x.shadowOffsetY = 2 * K; x.fillStyle = D.LG(x, T, -18, -8, 18, 8, D.bevel('gold')); x.fill(lp, 'evenodd'); x.restore(); x.save(); x.strokeStyle = 'rgba(40,20,0,0.7)'; x.lineWidth = 0.6; x.stroke(lp); x.restore(); }
    }
    glow(x, 64, 64, 30, '#fff0c0', 0.9);
    for (const [a, d] of [[-0.6, 1], [2.5, 1], [0.9, 0.7], [-2.2, 0.6]]) { const T = { cx: 64 + Math.cos(a) * 12 * d, cy: 64 + Math.sin(a) * 12 * d, deg: a * 57 + 40, s: 0.7 }; solid(x, D.P('M-8-2.4h12l3 2.4-3 2.4h-12z', T), D.LG(x, T, 0, -2.4, 0, 2.4, D.bevel('gold')), { shadow: true, sd: 1 }); }
    sparks(x, r, 18, [40, 40, 90, 90], ['#ffffff', '#ffe08a'], [0.8, 2]);
  },
};

const RIM = { hoa_ren: '#f0d8b8', thach_quy: '#ffe2a0', bong_tre: '#c8ffd8', nguyet_ha: '#e8f0ff', canh_dieu: '#ffffff', long_dang: '#ffe8b0' };
export const hasPaintedSkill = (heroId, slot) => !!ICONS[heroId]?.[slot];
export const skillURL = (heroId, slot) => paint(`${heroId}.${slot}`, ICONS[heroId][slot], RIM[heroId]);
export const spellURL = (id) => (SPELL[id] ? paint('spell.' + id, SPELL[id], '#e8e0d0') : null);
export const paintedSkill = (heroId, slot) => img(skillURL(heroId, slot));
export const paintedSpell = (id) => (SPELL[id] ? img(spellURL(id)) : null);
export const paintedFist = () => img(fistURL());
/** Mọi icon vẽ được (công cụ dựng ảnh tĩnh tools/uiart/paintart.cjs): [khoá, hàm trả data URL]. */
export const paintJobs = () => [
  ...Object.entries(ICONS).flatMap(([h, sl]) => Object.keys(sl).map((s) => [`${h}.${s}`, () => skillURL(h, s)])),
  ...Object.keys(SPELL).map((id) => ['spell.' + id, () => spellURL(id)]), ['fist', () => fistURL()],
];
const fistURL = () => paint('fist', (x, r) => { // găng sắt đấm thẳng tới, vụ nổ lực phía sau
  bg(x, 96, 40, [[0, '#ffe2a0'], [0.2, '#ff7a2a'], [0.5, '#8a1e0a'], [1, '#0a0202']], 120);
  rays(x, r, 96, 40, { n: 40, r0: 8, len: [40, 100], w: [2, 7], c: ['#ffe2a0', '#ff8a3a', '#ffffff'], alpha: 0.45 });
  streaks(x, r, -0.6, { n: 16, box: [40, 20, 120, 90], len: [20, 50], w: [1, 3], c: '#ffe2a0', alpha: 0.6 });
  const T = { cx: 66, cy: 62, deg: -10, s: 1 }, Pp = (d) => D.P(d, T);
  solid(x, Pp('M-70 74L-46 30L-18 40L-40 86Z'), D.LG(x, T, -60, 40, -30, 80, 'leather'), { sd: 3 });             // cẳng tay
  solid(x, Pp('M-58 60L-40 26L-16 36L-34 70Z'), D.LG(x, T, -58, 30, -16, 66, D.bevel('steel')), { sd: 3 });        // giáp tay
  for (const k of [0.25, 0.75]) D.wire(x, Pp(`M${-58 + 18 * k} ${60 - 34 * k}L${-34 + 18 * k} ${70 - 34 * k}`), 1.3, D.LG(x, T, -60, 30, -20, 60, 'gold'));
  solid(x, Pp('M-42-12C-42-22-34-26-28-22L-26 22C-34 24-42 18-42 8Z'), D.LG(x, T, -42, 0, -26, 0, D.bevel('steel')), { sd: 2 }); // mép bàn tay
  const F = [[-28, 16, -18, 34], [-11, 16, -20, 36], [6, 15, -17, 33], [22, 13, -12, 27]];                        // 4 ngón gập: x, rộng, đỉnh, cao
  for (const [fx, w, top, h] of F) {
    const fp = Pp(`M${fx + 6} ${top}h${w - 12}a6 6 0 0 1 6 6v${h - 12}a6 6 0 0 1-6 6h${-(w - 12)}a6 6 0 0 1-6-6v${-(h - 12)}a6 6 0 0 1 6-6z`);
    solid(x, fp, D.LG(x, T, fx, top, fx, top + h, [[0, '#ffffff'], [0.18, '#d0ccc6'], [0.55, '#6a6660'], [1, '#22201c']]), { sd: 2.5, rd: 1.4 });
    solid(x, Pp(`M${fx + 2} ${top + 9}h${w - 4}v4h${-(w - 4)}z`), D.LG(x, T, 0, top + 9, 0, top + 13, 'gold'), { shadow: false, sd: 0.8, surf: 0, ao: 0 });
    solid(x, Pp(D.circ(fx + w / 2, top + 4.5, 1.5)), rad(x, 0, 0, 1, [[0, '#ffffff'], [1, '#ffffff']]), { shadow: false, sd: 0.4, surf: 0, ao: 0, back: null });
  }
  solid(x, Pp('M-44 10C-32 2-8 4 6 12C12 16 10 24 2 24C-14 24-32 24-44 20Z'), D.LG(x, T, -44, 4, 10, 24, D.bevel('steel')), { sd: 2.5 }); // ngón cái vắt ngang
  solid(x, Pp('M-4 13C2 14 7 16 8 19C6 22 2 22-3 21Z'), D.LG(x, T, -4, 13, 8, 22, 'gold'), { shadow: false, sd: 0.6, surf: 0, ao: 0 });
  D.jewel(x, T, -48, 50, 4, '#ff6a20');
  sparks(x, r, 14, [70, 10, 124, 90], ['#ffe2a0', '#ffffff']);
}, '#f0d8b0');
// dụng cụ vẽ dùng chung cho icon trang bị (itemArt.js)
export { mk, layer, blurred, lin, rad, tp, ribbon, linePts, arcPts, rays, streaks, sparks, swirl, solid, shine, bloom, glow, grain, lantern, TAU, K, S, col, atmos, grade, metalRing, mix, setAccent, begin, tex };
