import * as THREE from 'three';
import { rngFor } from './noise.js';

// Texture bề mặt "bán chân thực" vẽ từng điểm ảnh (ImageData) lúc chạy, lặp khít mép: cỏ, đất, đá lát không đều, tường đá xếp, nhiễu.
// Không có file ảnh ngoài (assets/LICENSES.md). Mỗi texture sinh một lần rồi dùng chung.

/** Nhiễu giá trị lặp chu kỳ P (để texture ghép khít). */
function periodicNoise(seed, P) {
  const r = rngFor(seed), g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = r.next();
  const at = (x, y) => g[((y % P) + P) % P * P + (((x % P) + P) % P)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
}
/** fbm lặp chu kỳ: u, v trong [0,1), base = số ô lưới ở tầng đầu. */
function tileFbm(seed, base, oct = 4) {
  const ns = Array.from({ length: oct }, (_, i) => periodicNoise(seed + i * 17, base << i));
  return (u, v) => { let s = 0, a = 0.5, t = 0; for (let i = 0; i < oct; i++) { s += a * ns[i](u * (base << i), v * (base << i)); t += a; a *= 0.5; } return s / t; };
}
/** Voronoi lặp khít: trả về { f1, f2, id } (khoảng cách gần nhất, nhì, chỉ số ô) cho điểm (u, v) trong [0,1). */
function tileVoronoi(seed, cells, jitter = 0.85) {
  const r = rngFor(seed), pts = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + 0.5 + (r.next() - 0.5) * jitter) / cells, (j + 0.5 + (r.next() - 0.5) * jitter) / cells, r.next()]);
  return (u, v, sx = 1, sy = 1) => {
    let f1 = 9, f2 = 9, id = 0; const ci = Math.floor(u * cells), cj = Math.floor(v * cells);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = ((ci + di) % cells + cells) % cells, jj = ((cj + dj) % cells + cells) % cells, p = pts[jj * cells + ii];
      const px = p[0] + Math.floor((ci + di) / cells) * 1, py = p[1] + Math.floor((cj + dj) / cells) * 1;
      const d = Math.hypot((u - px) * sx, (v - py) * sy);
      if (d < f1) { f2 = f1; f1 = d; id = jj * cells + ii; } else if (d < f2) f2 = d;
    }
    return { f1, f2, id, h: pts[id][2] };
  };
}

function make(N, fn) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data, out = [0, 0, 0];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { fn(i / N, j / N, out); const k = 4 * (j * N + i); d[k] = out[0]; d[k + 1] = out[1]; d[k + 2] = out[2]; d[k + 3] = 255; }
  x.putImageData(img, 0, 0);
  return { c, x };
}
function finish(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cl = (v) => Math.max(0, Math.min(255, v));
const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());

/** Cỏ: nền loang nhiều tông (xanh rêu, xanh lá, ngả vàng), rồi hàng nghìn ngọn cỏ ngắn sáng/tối. */
export const grassSurface = () => once('grass', () => {
  const N = 512, big = tileFbm(3, 4, 4), fine = tileFbm(9, 32, 3);
  const dark = [44, 78, 36], mid = [78, 120, 50], light = [118, 150, 64], dry = [146, 140, 78];
  const { c, x } = make(N, (u, v, o) => {
    const b = big(u, v), f = fine(u, v);
    let col = mixc(dark, mid, Math.min(1, b * 1.6)); col = mixc(col, light, Math.max(0, b - 0.55) * 2.2); col = mixc(col, dry, Math.max(0, b - 0.68) * 1.6);
    const k = 0.78 + f * 0.44; o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  const r = rngFor(5); x.lineCap = 'round';
  for (let i = 0; i < 9000; i++) {
    const px = r.next() * N, py = r.next() * N, l = 3 + r.next() * 7, a = -Math.PI / 2 + (r.next() - 0.5) * 0.9, lt = r.next();
    x.strokeStyle = lt < 0.45 ? `rgba(${150 + r.int(50)},${175 + r.int(40)},${80 + r.int(30)},0.55)` : `rgba(${22 + r.int(20)},${48 + r.int(25)},${20 + r.int(15)},0.5)`;
    x.lineWidth = 0.8 + r.next() * 0.9;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke(); }
  }
  return finish(c);
});

/** Đất nện: nâu ấm loang + sỏi nhỏ có bóng + vết nứt mảnh. */
export const dirtSurface = () => once('dirt', () => {
  const N = 512, big = tileFbm(21, 4, 4), fine = tileFbm(27, 48, 3), vor = tileVoronoi(29, 22, 0.9);
  const a = [96, 72, 50], b = [138, 108, 76], cc = [112, 98, 82];
  const { c } = make(N, (u, v, o) => {
    const n = big(u, v), f = fine(u, v), w = vor(u, v);
    let col = mixc(a, b, n); col = mixc(col, cc, Math.max(0, f - 0.5));
    const pebble = w.h > 0.62 && w.f1 < 0.006 + (w.h - 0.62) * 0.03 ? 1 : 0; // sỏi thưa: chấm sáng
    const crack = 1 - Math.min(1, (w.f2 - w.f1) * 260); // khe nứt giữa các ô
    let k = 0.82 + f * 0.36 - crack * 0.18 * (n > 0.5 ? 1 : 0.3);
    if (pebble) { col = mixc(col, [168, 152, 132], 0.6 + w.h * 0.3); k *= 1 + (0.5 - (u * 37 % 1)) * 0; }
    o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  return finish(c);
});

/** Đá lát tự nhiên: các phiến đá đa giác (Voronoi), mỗi phiến một tông xám-be, vát sáng mép trên trái, khe vữa tối, rêu lấm tấm trong khe. */
export const flagstoneSurface = () => once('flag', () => {
  const N = 512, vor = tileVoronoi(41, 7, 0.95), grain = tileFbm(43, 64, 3), stain = tileFbm(47, 6, 4), moss = tileFbm(53, 16, 3);
  const tones = [[138, 130, 116], [124, 119, 110], [146, 136, 118], [118, 113, 104], [132, 124, 108]];
  const e = 1 / N;
  const { c } = make(N, (u, v, o) => {
    const w = vor(u, v), gap = w.f2 - w.f1, t = tones[w.id % tones.length];
    const edge = Math.min(1, gap * 34); // 0 ở khe → 1 trong phiến
    // vát: so khe ở điểm lệch lên-trái → mép sáng/tối
    const w2 = vor(u - 2 * e, v - 2 * e), bevel = Math.min(1, (w2.f2 - w2.f1) * 34) - edge;
    let col = t.map((q) => q * (0.9 + w.h * 0.14));
    col = mixc(col, [92, 84, 74], Math.max(0, stain(u, v) - 0.55) * 1.4); // vết ố
    const g = 0.86 + grain(u, v) * 0.28;
    let k = g * (0.5 + 0.5 * Math.pow(edge, 0.5)) + bevel * -1.3;
    if (edge < 0.25 && moss(u, v) > 0.55) col = mixc(col, [70, 98, 46], 0.7); // rêu trong khe
    o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  return finish(c);
});

/** Tường đá xếp: hàng đá chữ nhật lệch nhau, cạnh bo, rêu leo từ chân tường (v lớn = chân). */
export const wallStoneSurface = () => once('wall', () => {
  const N = 512, grain = tileFbm(61, 48, 3), moss = tileFbm(67, 8, 4), r = rngFor(71);
  const rows = 6, rowH = 1 / rows, stones = [];
  for (let j = 0; j < rows; j++) { let u = (j % 2) * 0.13; const list = []; while (u < 1 + 0.3) { const w = 0.16 + r.next() * 0.16; list.push([u, w, r.next()]); u += w; } stones.push(list); }
  const { c } = make(N, (u, v, o) => {
    const j = Math.min(rows - 1, Math.floor(v / rowH)), vv = (v - j * rowH) / rowH;
    const list = stones[j]; let s = list[0];
    for (const q of list) { const uu = ((u - q[0]) % 1 + 1) % 1; if (uu < q[1]) { s = q; break; } }
    const uu = ((u - s[0]) % 1 + 1) % 1 / s[1];
    const ex = Math.min(uu, 1 - uu) * s[1] * N / 6, ey = Math.min(vv, 1 - vv) * rowH * N / 6, edge = Math.min(1, Math.min(ex, ey));
    const tone = 128 + s[2] * 44;
    let col = [tone * 1.02, tone, tone * 1.05];
    const m = moss(u, v) + (v - 0.7) * 2.2 - 0.35; if (m > 0) col = mixc(col, [62, 92, 44], Math.min(0.85, m * 2.5)); // rêu chỉ leo từ chân tường
    const k = (0.4 + 0.6 * Math.pow(edge, 0.5)) * (0.85 + grain(u, v) * 0.3) * (vv < 0.18 ? 1.08 : 1);
    o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  return finish(c);
});

/** Nhiễu dữ liệu (không sRGB): R nhiễu lớn, G nhiễu vừa, B nhiễu nhỏ — dùng trong shader để phá đều mép trộn lớp. */
export const noiseSurface = () => once('noise', () => {
  const N = 256, a = tileFbm(81, 4, 4), b = tileFbm(83, 12, 3), cN = tileFbm(87, 40, 2);
  const { c } = make(N, (u, v, o) => { o[0] = a(u, v) * 255; o[1] = b(u, v) * 255; o[2] = cN(u, v) * 255; });
  return finish(c, false);
});
