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
  const N = 1024, big = tileFbm(3, 4, 4), fine = tileFbm(9, 64, 3);
  const dark = [44, 78, 36], mid = [78, 120, 50], light = [118, 150, 64], dry = [146, 140, 78];
  const { c, x } = make(N, (u, v, o) => {
    const b = big(u, v), f = fine(u, v);
    let col = mixc(dark, mid, Math.min(1, b * 1.6)); col = mixc(col, light, Math.max(0, b - 0.55) * 2.2); col = mixc(col, dry, Math.max(0, b - 0.68) * 1.6);
    const k = 0.78 + f * 0.44; o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  const r = rngFor(5); x.lineCap = 'round';
  for (let i = 0; i < 42000; i++) { // ngọn cỏ sắc: sáng ngả vàng / tối xanh rêu
    const px = r.next() * N, py = r.next() * N, l = 5 + r.next() * 12, a = -Math.PI / 2 + (r.next() - 0.5) * 0.9, lt = r.next();
    x.strokeStyle = lt < 0.45 ? `rgba(${140 + r.int(60)},${175 + r.int(45)},${70 + r.int(35)},0.7)` : `rgba(${20 + r.int(20)},${46 + r.int(25)},${18 + r.int(15)},0.6)`;
    x.lineWidth = 1 + r.next() * 1.3;
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

/** Đá lát kiểu Liên Quân (1024²): phiến đá phẳng lớn đa giác, tông xám lam / xám be, mặt hơi gồ có hạt đá, mép vát sắc (sáng trên-trái,
 *  tối dưới-phải tính từ trường độ cao), khe vữa tối có rêu + ngọn cỏ mọc lên, vết mẻ/nứt nhỏ. */
export const flagstoneSurface = () => once('flag', () => {
  const N = 1024, vor = tileVoronoi(41, 7, 0.95), grain = tileFbm(43, 96, 3), bump = tileFbm(44, 24, 3), stain = tileFbm(47, 6, 4), moss = tileFbm(53, 16, 3);
  const tones = [[156, 160, 168], [140, 146, 156], [164, 160, 150], [132, 138, 148], [150, 148, 142], [146, 152, 160]];
  const Hm = new Float32Array(N * N), ID = new Int32Array(N * N), HV = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, w = vor(u, v), k = j * N + i, gap = w.f2 - w.f1;
    const e = Math.min(1, gap / 0.022);                                   // 0 ở khe → 1 trong phiến (mép vát ~2% ô)
    Hm[k] = (e < 1 ? 1 - Math.pow(1 - e, 2.2) : 1) * (0.94 + w.h * 0.06) + (bump(u, v) - 0.5) * 0.06 + (grain(u, v) - 0.5) * 0.025;
    ID[k] = w.id; HV[k] = gap;
  }
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, u = i / N, v = j / N, hL = Hm[j * N + (i + N - 1) % N], hR = Hm[j * N + (i + 1) % N], hU = Hm[((j + N - 1) % N) * N + i], hD = Hm[((j + 1) % N) * N + i];
    const nx = (hL - hR) * 9, ny = (hU - hD) * 9, light = (nx * -0.6 + ny * -0.8);    // đèn từ trên-trái
    const t = tones[ID[k] % tones.length], gap = HV[k];
    let col = t.map((q) => q * (0.92 + (ID[k] * 0.618 % 1) * 0.12));
    col = mixc(col, [112, 104, 92], Math.max(0, stain(u, v) - 0.56) * 1.3);      // vết ố
    let kk = (0.86 + grain(u, v) * 0.22) * (0.55 + 0.45 * Hm[k]) + light * 0.9;
    if (gap < 0.006) { col = moss(u, v) > 0.5 ? [54, 78, 38] : [58, 54, 48]; kk = 0.75 + grain(u, v) * 0.3; }   // khe vữa / rêu
    else if (gap < 0.014 && moss(u, v) > 0.62) col = mixc(col, [78, 108, 52], 0.55);
    d[4 * k] = cl(col[0] * kk); d[4 * k + 1] = cl(col[1] * kk); d[4 * k + 2] = cl(col[2] * kk); d[4 * k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // ngọn cỏ nhỏ mọc từ khe đá (vẽ đè, lặp khít)
  const r = rngFor(57); x.lineCap = 'round';
  for (let n = 0; n < 2600; n++) {
    const i = r.int(N), j = r.int(N); if (HV[j * N + i] > 0.007 || moss(i / N, j / N) < 0.45) continue;
    const l = 4 + r.next() * 9, a = -Math.PI / 2 + (r.next() - 0.5) * 1.4;
    x.strokeStyle = r.next() < 0.5 ? `rgba(${110 + r.int(50)},${150 + r.int(40)},${60 + r.int(30)},0.85)` : `rgba(${40 + r.int(20)},${70 + r.int(25)},${30 + r.int(15)},0.8)`; x.lineWidth = 1.2 + r.next();
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.beginPath(); x.moveTo(i + ox, j + oy); x.lineTo(i + ox + Math.cos(a) * l, j + oy + Math.sin(a) * l); x.stroke(); }
  }
  return finish(c);
});

/** Tường đá xếp: hàng đá chữ nhật lệch nhau, cạnh bo, rêu leo từ chân tường (v lớn = chân). */
export const wallStoneSurface = (mossy = true) => once(mossy ? 'wall' : 'block', () => {
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
    let col = mossy ? [tone * 1.02, tone, tone * 1.05] : [tone * 1.06, tone * 1.0, tone * 0.92]; // đá khối công trình: ngả vàng ấm, rêu chỉ lấm tấm
    const m = mossy ? moss(u, v) + (v - 0.7) * 2.2 - 0.35 : moss(u, v) - 0.72; if (m > 0) col = mixc(col, [62, 92, 44], Math.min(0.85, m * 2.5)); // rêu chỉ leo từ chân tường
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

/** Ngói âm dương (mái trụ/tế đàn): hàng ngói cong xếp chồng, đầu ngói tối, có rêu lấm tấm. Trắng-xám để tô màu đội bằng color của vật liệu. */
export const roofTileSurface = () => once('roof', () => {
  const N = 256, grain = tileFbm(91, 32, 3), moss = tileFbm(93, 6, 3), rows = 8, cols = 8;
  const { c } = make(N, (u, v, o) => {
    const ry = v * rows, j = Math.floor(ry), fy = ry - j, cx = u * cols + (j % 2) * 0.5, fx = cx - Math.floor(cx);
    const roll = Math.sin(fx * Math.PI); // ống ngói tròn
    let k = (0.55 + 0.45 * roll) * (0.75 + 0.25 * fy) * (fy > 0.9 ? 0.55 : 1) * (0.88 + grain(u, v) * 0.24);
    let col = [210, 205, 200]; const m = moss(u, v); if (m > 0.62) col = [150, 175, 120];
    o[0] = Math.min(255, col[0] * k); o[1] = Math.min(255, col[1] * k); o[2] = Math.min(255, col[2] * k);
  });
  return finish(c);
});

/** Đá phân lớp (vân vằn kiểu vách đá Liên Quân): các lớp ngang lượn sóng sáng/tối xen kẽ, khe nứt tối giữa các lớp có viền sáng
 *  phía trên (giả khối), vết nứt dọc, hạt đá lấm tấm. Xám lam trung tính để nhân với màu đỉnh. Lặp khít. */
export const strataSurface = () => once('strata', () => {
  const N = 512, wob = tileFbm(101, 4, 4), fine = tileFbm(103, 64, 3), mid = tileFbm(107, 12, 3), vert = tileFbm(109, 8, 3);
  const bands = 9, Hm = new Float32Array(N * N), out = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, y = (v + (wob(u, v) - 0.5) * 0.12) * bands, f = y - Math.floor(y), id = Math.floor(y);
    const groove = Math.min(1, f / 0.07) * Math.min(1, (1 - f) / 0.03);                     // rãnh giữa hai lớp
    const crack = Math.abs(vert(u, v * 0.3) - 0.5) < 0.012 + mid(u, v) * 0.01 ? 0.25 : 1;     // nứt dọc
    Hm[j * N + i] = groove * crack * (0.86 + ((id * 0.618) % 1) * 0.14) + (mid(u, v) - 0.5) * 0.1;
    out[j * N + i] = 0.72 + ((id * 0.618) % 1) * 0.22 + (fine(u, v) - 0.5) * 0.22 + (mid(u, v) - 0.5) * 0.18;
  }
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, hU = Hm[((j + N - 2) % N) * N + i], hD = Hm[((j + 2) % N) * N + i];
    const light = (hD - hU) * 1.3, shade = 0.42 + 0.58 * Hm[k];
    const t = Math.max(0, Math.min(1.3, out[k] * shade + light));
    d[4 * k] = cl(184 * t); d[4 * k + 1] = cl(184 * t); d[4 * k + 2] = cl(186 * t); d[4 * k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return finish(c);
});

/** Đá xẻ khối lớn (tường biên): mặt đá mài có vân hạt, vân sọc chéo mờ, mép vát sáng, vết ố + rêu chân. */
export const cutStoneSurface = () => once('cut', () => {
  const N = 512, grain = tileFbm(121, 96, 3), stain = tileFbm(123, 6, 4), vein = tileFbm(127, 10, 4), moss = tileFbm(129, 8, 3);
  const { c } = make(N, (u, v, o) => {
    const vv = vein(u * 0.6 + v * 0.4, v), vl = Math.abs(Math.sin((u * 2 + v * 5 + vv * 3) * Math.PI)) ; // sọc vân lượn
    let k = 0.82 + grain(u, v) * 0.22 - Math.pow(1 - vl, 18) * 0.25 + (stain(u, v) - 0.5) * 0.2;
    let col = [176, 178, 184];
    if (moss(u, v) + v * 0.9 - 0.95 > 0) col = mixc(col, [92, 120, 70], Math.min(0.7, (moss(u, v) + v * 0.9 - 0.95) * 3));
    o[0] = cl(col[0] * k); o[1] = cl(col[1] * k); o[2] = cl(col[2] * k);
  });
  return finish(c);
});

/** Đá cẩm thạch trắng ngà (trụ, tế đàn): vân xám mảnh lượn, vân phụ mờ, hạt mịn; không rêu. */
export const marbleSurface = () => once('marble', () => {
  const N = 512, w1 = tileFbm(131, 4, 5), w2 = tileFbm(137, 8, 4), grain = tileFbm(139, 96, 2), cloud = tileFbm(141, 5, 4);
  const { c } = make(N, (u, v, o) => {
    const a = Math.abs(Math.sin((u * 3 + v * 2 + w1(u, v) * 4) * Math.PI)), b = Math.abs(Math.sin((u * 7 - v * 4 + w2(u, v) * 5) * Math.PI));
    let k = 0.93 + (cloud(u, v) - 0.5) * 0.12 + (grain(u, v) - 0.5) * 0.06 - Math.pow(1 - a, 30) * 0.35 - Math.pow(1 - b, 40) * 0.15;
    o[0] = cl(236 * k); o[1] = cl(231 * k); o[2] = cl(222 * k);
  });
  return finish(c);
});
