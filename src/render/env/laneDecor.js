import * as THREE from 'three';
import { tileFbm } from './surfaces.js';
import { rngFor } from './noise.js';

// Đường đi "đá mài khắc hoa văn" (tham khảo phong cách đường Liên Quân, tự vẽ — docs/01 §5): một dải lát chạy theo từng đường,
// mặt đá phẳng màu xám lạnh, chia tấm lớn, viền trang trí hai mép (gờ nổi + rãnh đôi + khấc), rãnh khắc uốn lượn hình chữ S chạy chéo
// mặt đường, huy hiệu khắc (thoi lồng + chữ V + vòng tròn) giữa mỗi đoạn, nứt mảnh, ố bẩn, rêu trong rãnh. Khắc nổi bằng bản đồ pháp tuyến
// (đèn thật quyết định sáng tối theo hướng đường), màu chỉ mang độ che khuất (rãnh tối). Chân trụ/nhà chính có vòng khắc tròn riêng.
// Mỗi texture vẽ một lần (canvas, lặp khít theo chiều dọc đường).

const cache = {};
const STONE = { base: [188, 185, 202], groove: [78, 76, 92], inlay: [160, 196, 236], moss: [92, 112, 74] };

/** Từ trường độ cao + màu (Float32) → { map, normal } (texture sắc nét, mipmap + anisotropy 16). */
function toTex(W, H, Hm, C, wrapY, alphaFn) {
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const ci = cc.getContext('2d').createImageData(W, H);
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; const ni = nc.getContext('2d').createImageData(W, H);
  const cx = (x) => Math.max(0, Math.min(W - 1, x)), cy = (y) => (wrapY ? (y + H) % H : Math.max(0, Math.min(H - 1, y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, hx = Hm[y * W + cx(x + 1)] - Hm[y * W + cx(x - 1)], hy = Hm[cy(y + 1) * W + x] - Hm[cy(y - 1) * W + x];
    let nx = -hx * 4, ny = hy * 4, nz = 1; const l = Math.hypot(nx, ny, nz);
    ni.data.set([(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (nz / l * 0.5 + 0.5) * 255, 255], 4 * k);
    ci.data.set([C[3 * k], C[3 * k + 1], C[3 * k + 2], alphaFn ? alphaFn(x, y) : 255], 4 * k);
  }
  cc.getContext('2d').putImageData(ci, 0, 0); nc.getContext('2d').putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(cc), normal = new THREE.CanvasTexture(nc);
  for (const t of [map, normal]) { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = wrapY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, normal };
}

// —— bộ vẽ hoa văn khắc đá (dùng cho sàn đường và sân nhà chính) ——
const GOLD = [214, 168, 86], GROOVE = [84, 78, 96];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
const polyD = (px, py, pts) => { let m = 1e9; for (let i = 1; i < pts.length; i++) m = Math.min(m, segD(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return m; };
// hoa văn chữ "回" chạy (meander): ô vuông 8×8 đơn vị, nối nhau bằng đường đáy
const KEY = [[[0, 7], [0, 1], [6, 1], [6, 5], [2, 5], [2, 3], [4, 3]], [[0, 7], [8, 7]]];
const keyD = (u, v) => { u = ((u % 8) + 8) % 8; let m = 1e9; for (const p of KEY) m = Math.min(m, polyD(u, v, p), polyD(u - 8, v, p), polyD(u + 8, v, p)); return m; };
/** Một điểm ảnh: gom các lớp khắc. s = { c:[r,g,b], h } */
function carve(s, d, hw, depth = 0.35, col = GROOVE) { if (d < hw + 1.2) { const t = Math.min(1, Math.max(0, (hw + 1.2 - d) / 1.2)); s.c = mixc(s.c, col, t * 0.85); s.h -= depth * t; } }
function inlay(s, d, hw, col = GOLD) { if (d < hw) { const k = 1 - d / hw; s.c = col.map((q) => q * (0.78 + 0.34 * Math.sqrt(k))); s.h += 0.04; } else if (d < hw + 1.1) { s.c = s.c.map((q) => q * 0.6); s.h -= 0.12; } }
function hair(s, d, hw = 0.8) { if (d < hw + 0.8) { const t = Math.min(1, (hw + 0.8 - d) / 0.8); s.c = s.c.map((q) => q * (1 - 0.42 * t)); s.h -= 0.1 * t; } }

/** Sàn đường lát đá chạm khắc kiểu Liên Quân (1024×2048, lặp khít dọc đường). Đá xám tím ấm mài nhẵn; lòng đường chia thành các
 *  dải cong bởi bốn RÃNH CUNG vắt ngang (rãnh sâu + chỉ vàng giữa + hai cặp chỉ khắc song song), dải sáng/tối xen kẽ; ô giữa hai cung
 *  có ĐĨA HOA VĂN lớn (vòng vàng, vạch chia độ, sao 8 cánh viền vàng nền sẫm, đĩa tâm), ô kế có HOA BỐN CÁNH, hai ô còn lại có KHUNG
 *  THOI chỉ đôi + đinh vàng ở bốn góc. Hai mép: bó vỉa bo tròn, dải viền sẫm khắc hoa văn chữ 回 chạy liền màu vàng giữa hai chỉ vàng. */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 1024, H = 2048, cloud = tileFbm(401, 3, 5), mid = tileFbm(409, 14, 3), grain = tileFbm(421, 300, 2), vein = tileFbm(433, 6, 5);
  const Hm = new Float32Array(W * H), C = new Float32Array(W * H * 3), cx = W / 2, F0 = 118, F1 = W - 118, FH = (F1 - F0) / 2;
  const LIGHT = [192, 184, 194], DARKP = [168, 160, 178], FRIEZE = [120, 112, 132], CURB = [142, 134, 152];
  const ARCS = [[256, 1], [768, -1], [1280, 1], [1792, -1]], SAG = 150;
  const wrapD = (y, y0) => { let d = y - y0; if (d > H / 2) d -= H; if (d < -H / 2) d += H; return d; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, u = x / H, v = y / H, cl = cloud(u, v) - 0.5, md = mid(u, v) - 0.5, gn = grain(u, v) - 0.5, va = Math.abs(vein(u, v) - 0.5);
    const lx = Math.min(x, W - 1 - x), s = { c: LIGHT, h: 1 };
    if (lx < F0) { // —— viền mép ——
      if (lx < 22) { const t = lx / 22; s.c = CURB; s.h = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.05)); }
      else if (lx < 26) { s.c = GROOVE; s.h = 0.3; }
      else if (lx < 112) {
        s.c = FRIEZE; s.h = 0.82;
        inlay(s, Math.abs(lx - 31), 1.8); inlay(s, Math.abs(lx - 107), 1.8);
        const unit = 72 / 8, kd = keyD(y / unit, (lx - 33) / unit) * unit;          // hoa văn 回 rộng 72px
        if (lx > 34 && lx < 106) inlay(s, kd, 3.1, [206, 196, 210]);
      } else { s.c = mixc(GROOVE, LIGHT, (lx - 112) / 6); s.h = 0.4 + 0.6 * (lx - 112) / 6; }
    } else { // —— lòng đường ——
      const X = (x - cx) / FH; let band = 0;
      const arcY = ARCS.map(([y0, dir]) => y0 + dir * SAG * (X * X - 0.5)), slope = ARCS.map(([, dir]) => dir * SAG * 2 * X / FH);
      for (let i = 0; i < 4; i++) if (wrapD(y, arcY[i]) > 0) band = i; // dải hiện tại (theo cung gần nhất phía trên)
      const near = ARCS.map((_, i) => wrapD(y, arcY[i]) / Math.sqrt(1 + slope[i] * slope[i]));
      let bi = 0, best = 1e9; near.forEach((d, i) => { if (d > 0 && d < best) { best = d; bi = i; } });
      s.c = bi % 2 ? DARKP : LIGHT;
      // vân cẩm thạch + loang
      s.c = s.c.map((q) => q * (1 + cl * 0.08 + md * 0.05 + gn * 0.03)); if (va < 0.005) s.c = mixc(s.c, [236, 232, 238], (1 - va / 0.005) * 0.3);
      // trang trí trong ô
      const cyM = [512, 1024, 1536, 0][bi], dx = x - cx, dyM = wrapD(y, cyM), r = Math.hypot(dx, dyM), a = Math.atan2(dyM, dx);
      if (bi === 1) { // đĩa hoa văn lớn
        carve(s, Math.abs(r - 150), 7); inlay(s, Math.abs(r - 150), 1.8); hair(s, Math.abs(r - 128));
        if (r > 129 && r < 142) { const t = ((a / (Math.PI * 2)) * 48 % 1 + 1) % 1; hair(s, Math.min(t, 1 - t) * (Math.PI * 2 * 135 / 48), 0.9); }
        const st = (aa, ro, ri) => { const S2 = Math.PI / 8, t = ((aa % (2 * S2)) + 2 * S2) % (2 * S2), f = Math.abs(t - S2) / S2; return ri + (ro - ri) * f; };
        const sr = st(a + Math.PI / 16, 118, 52); if (r < sr) s.c = s.c.map((q) => q * 0.72);
        inlay(s, Math.abs(r - sr) * 0.85, 2); const sr2 = st(a, 92, 44); if (r < sr) hair(s, Math.abs(r - sr2) * 0.85);
        if (r < 26) { s.c = [92, 96, 128]; } inlay(s, Math.abs(r - 26), 2.2); if (r < 9) s.c = GOLD.map((q) => q * (1.1 - r / 30));
      } else if (bi === 3) { // hoa bốn cánh
        const pr = 92 * Math.pow(Math.abs(Math.cos(2 * a)), 0.5); carve(s, Math.abs(r - 112), 5); inlay(s, Math.abs(r - 112), 1.6);
        if (r < pr) s.c = s.c.map((q) => q * 0.86); inlay(s, Math.abs(r - pr) * 0.8, 1.6); hair(s, Math.abs(r - pr * 0.6) * 0.8);
        if (r < 14) s.c = GOLD; inlay(s, Math.abs(r - 14), 1.4);
      } else { // khung thoi chỉ đôi + đinh vàng
        const rh = Math.abs(dx) / 300 + Math.abs(dyM) / 200; hair(s, Math.abs(rh - 1) * 170, 1); hair(s, Math.abs(rh - 0.9) * 170, 1); inlay(s, Math.abs(rh - 0.95) * 170, 1.2);
        for (const [px, py] of [[300, 0], [-300, 0], [0, 200], [0, -200]]) { const d = Math.hypot(dx - px * 0.95, dyM - py * 0.95); if (d < 7) { s.c = GOLD.map((q) => q * (1.15 - d / 14)); s.h += 0.05; } }
        hair(s, Math.abs(rh - 0.7) * 170, 0.8); if (rh < 0.7) s.c = s.c.map((q) => q * 0.93);                      // thoi lồng trong
        const qp = 56 * Math.pow(Math.abs(Math.cos(2 * a)), 0.5); if (r < qp) s.c = s.c.map((q) => q * 0.85); inlay(s, Math.abs(r - qp) * 0.8, 1.3); // hoa bốn cánh nhỏ
        if (r < 8) s.c = GOLD; hair(s, Math.abs(r - 70), 0.7);
      }
      // rãnh cung (trên cùng)
      for (let i = 0; i < 4; i++) { const d = Math.abs(near[i]); carve(s, d, 9); inlay(s, d, 1.9); hair(s, Math.abs(d - 20)); hair(s, Math.abs(d - 31));
        if (d > 38 && d < 50) { const bx = ((x - cx) % 46 + 46) % 46 - 23, bd = Math.hypot(bx, d - 44); if (bd < 3.4) { s.c = GOLD.map((q) => q * (1.15 - bd / 8)); s.h += 0.05; } } } // chuỗi hạt vàng hai bên rãnh
      // gờ vát ăn xuống viền
      if (lx < F0 + 6) { s.h -= (F0 + 6 - lx) / 6 * 0.3; s.c = s.c.map((q) => q * (0.85 + 0.15 * (lx - F0) / 6)); }
      void band;
    }
    Hm[k] = s.h + gn * 0.01; C.set(s.c.map((q) => Math.max(0, Math.min(255, q))), 3 * k);
  }
  return (cache.lane = toTex(W, H, Hm, C, true));
}

/** Sân nhà chính (đĩa 1024², bán kính 500 px): cùng ngôn ngữ chạm khắc — các vành đồng tâm: viền ngoài hoa văn 回 chạy vòng giữa hai chỉ
 *  vàng, vành cánh sen (cung lượn xen kẽ), vành vạch chia độ, vành xoáy (rãnh xoắn + chỉ vàng), sao 12 cánh viền vàng nền sẫm, đĩa tâm. */
export function corePlazaTexture() {
  if (cache.corePlaza) return cache.corePlaza;
  const N = 1024, C0 = N / 2, Hm = new Float32Array(N * N), C = new Float32Array(N * N * 3), cloud = tileFbm(501, 4, 4), grain = tileFbm(503, 300, 2);
  const LIGHT = [204, 197, 206], DARKP = [178, 171, 189], FRIEZE = [128, 120, 140], TAU = Math.PI * 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y * N + x, dx = x - C0, dy = y - C0, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), s = { c: LIGHT, h: 1 };
    if (r < 500) {
      const cl = cloud(x / N, y / N) - 0.5, gn = grain(x / N, y / N) - 0.5;
      if (r > 432) { // viền 回
        s.c = FRIEZE; s.h = 0.82; inlay(s, Math.abs(r - 494), 2); inlay(s, Math.abs(r - 438), 2);
        const unit = 52 / 8, arc = a * 466, kd = keyD(arc / unit, (490 - r) / unit) * unit; if (r > 440 && r < 492) inlay(s, kd, 2.6, [206, 196, 210]);
      } else if (r > 330) { // vành cánh sen
        const n = 24, t = ((a / TAU) * n % 1 + 1) % 1, petal = 330 + 96 * Math.sin(Math.PI * t);
        s.c = r < petal ? DARKP : LIGHT; inlay(s, Math.abs(r - petal) * 0.8, 1.7); hair(s, Math.abs(r - (330 + 70 * Math.sin(Math.PI * t))) * 0.8);
        carve(s, Math.abs(r - 432), 6); hair(s, Math.abs(r - 418));
      } else if (r > 292) { // vạch chia độ
        s.c = DARKP; const t = ((a / TAU) * 120 % 1 + 1) % 1; hair(s, Math.min(t, 1 - t) * (TAU * 311 / 120), (Math.floor((a / TAU + 1) * 120) % 5 === 0) ? 1.6 : 0.8);
        inlay(s, Math.abs(r - 294), 1.6); carve(s, Math.abs(r - 330), 7); inlay(s, Math.abs(r - 330), 1.8);
      } else if (r > 170) { // vành xoáy
        s.c = LIGHT; const sp = ((a / TAU) * 16 + (r - 170) / 60) % 1, ds = Math.min(((sp % 1) + 1) % 1, 1 - ((sp % 1) + 1) % 1) * (TAU * r / 16) / Math.hypot(1, TAU * r / 16 / 60);
        carve(s, ds, 4); inlay(s, ds, 1.4); hair(s, Math.abs(r - 180)); hair(s, Math.abs(r - 282));
      } else { // sao 12 cánh + đĩa tâm
        const S2 = Math.PI / 12, t = ((a % (2 * S2)) + 2 * S2) % (2 * S2), f = Math.abs(t - S2) / S2, sr = 70 + 92 * f;
        s.c = r < sr ? [118, 112, 146] : DARKP; inlay(s, Math.abs(r - sr) * 0.85, 2.2);
        carve(s, Math.abs(r - 170), 6); inlay(s, Math.abs(r - 170), 1.8); hair(s, Math.abs(r - 58)); if (r < 40) s.c = mixc([96, 100, 140], GOLD, Math.max(0, 1 - r / 40) * 0.0);
        inlay(s, Math.abs(r - 40), 2.2); if (r < 16) s.c = GOLD;
      }
      s.c = s.c.map((q) => q * (1 + cl * 0.08 + gn * 0.03));
    }
    Hm[k] = s.h; C.set(s.c.map((q) => Math.max(0, Math.min(255, q))), 3 * k);
  }
  return (cache.corePlaza = toTex(N, N, Hm, C, false, (x, y) => (Math.hypot(x - C0, y - C0) < 500 ? 255 : 0)));
}

/** Đoạn lát đá của mỗi đường: từ nhà chính ra quá trụ nhà một đoạn (hai đầu đường). Trả [{ ln, s0, s1, sB, sR, total }] theo quãng đường. */
export const PAVE_EXT = 380, PAVE_FADE = 320;
export function pavedRange(map, ln) {
  const pts = ln.pts, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const sAt = (x, y) => { let best = 0, bd = Infinity; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (d < bd) { bd = d; best = cum[i - 1] + t * Math.sqrt(L2); } } return best; };
  const home = map.structures.find((s) => s.id === ln.id + '_home'), total = cum[cum.length - 1];
  if (!home) return { sB: total, sR: 0, total };
  const red = map.mirror(home.x, home.y);
  return { sB: sAt(home.x, home.y) + PAVE_EXT, sR: sAt(red.x, red.y) - PAVE_EXT, total };
}
/** Polyline các phần lát (cho bản trộn nền: đất mòn viền quanh phần lát, đá vụn mép). */
export function pavedPolylines(map, step = 300) {
  const out = [], ends = [];
  for (const ln of map.lanes) {
    const { sB, sR } = pavedRange(map, ln), pts = ln.pts; let s = 0; const a = [], b = [];
    for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k <= n; k++) { const ss = s + L * k / n, p = [ax + (bx - ax) * k / n, ay + (by - ay) * k / n]; if (ss <= sB - 680) a.push(p); if (ss >= sR + 680) b.push(p); } s += L; } // lùi 680: đầu tròn nét vẽ (~nửa bề ngang) chỉ lấn tới vùng vỡ mép
    for (const q of [a, b]) if (q.length > 1) out.push({ pts: q, width: ln.width });
    // điểm mép vỡ (cuối phần lát) + hướng đi ra phía cỏ: rải đất mòn, mảnh đá vỡ
    const at = (ss) => { let acc = 0; for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + L >= ss) { const t = (ss - acc) / L; return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, dx: (pts[i][0] - pts[i - 1][0]) / L, dy: (pts[i][1] - pts[i - 1][1]) / L }; } acc += L; } return null; };
    const e1 = at(sB), e2 = at(sR); if (e1) ends.push(e1); if (e2) ends.push({ ...e2, dx: -e2.dx, dy: -e2.dy });
  }
  out.ends = ends;
  return out;
}

/** Sân nhà chính: lát tròn đồng tâm hiện đại — các vòng tấm đá cong, mạch hướng tâm so le, vòng viền sẫm ngoài cùng, đĩa giữa. */
export function plazaTexture(kind) {
  if (cache[kind]) return cache[kind];
  const N = 1024, C0 = N / 2, Hm = new Float32Array(N * N), C = new Float32Array(N * N * 3), r = rngFor(kind.length * 7), grain = tileFbm(311, 160, 2);
  const rings = [[0, 70, 1], [70, 170, 10], [170, 270, 18], [270, 370, 26], [370, 452, 32], [452, 500, 40]];
  const SL = [170, 170, 180], BD = [104, 108, 124], MORT = [58, 60, 72];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - C0, dy = y - C0, rr = Math.hypot(dx, dy), k = y * N + x; let h = 0, c = [0, 0, 0];
    if (rr < 500) {
      const ri = rings.findIndex(([a, b]) => rr >= a && rr < b), [a0, a1, n] = rings[ri], ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1 + (ri % 2) * 0.5 / n) % 1, seg = ang * n, sl = seg - Math.floor(seg);
      const eR = Math.min(rr - a0, a1 - rr), eA = Math.min(sl, 1 - sl) * (2 * Math.PI * rr / n), e = Math.min(eR, n > 1 ? eA : 1e9);
      const mort = e < 2.2; h = mort ? 0 : Math.min(1, (e - 2.2) / 8);
      const base = ri === rings.length - 1 || ri === 0 ? BD : SL, t = ((Math.floor(seg) * 0.618 + ri * 0.3) % 1 - 0.5) * 0.08 + (grain(x / N, y / N) - 0.5) * 0.06;
      c = mort ? MORT : base.map((q) => q * (1 + t) * (0.93 + 0.07 * h));
    }
    Hm[k] = h; C.set(c, 3 * k);
  }
  void r;
  return (cache[kind] = toTex(N, N, Hm, C, false, (x, y) => (Math.hypot(x - C0, y - C0) < 500 ? 255 : 0)));
}

/** Vật liệu: Lambert + normal map, nhận bóng nướng sẵn (bản trộn nền) + bóng nhân vật thời gian thực. */
function stoneMat(t, baked, repeat, cores = []) {
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.3, 1.3), roughness: repeat ? 0.48 : 0.55, metalness: 0, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (repeat) m.color.setRGB(0.84, 0.84, 0.87); // đá mài phản chiếu trời → hạ tông cho khỏi chói
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf }, uCores: { value: new THREE.Vector4(cores[0]?.x ?? -1e6, cores[0]?.y ?? -1e6, cores[1]?.x ?? -1e6, cores[1]?.y ?? -1e6) }, uTerr: { value: new THREE.Vector2(3300, 1100) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = (repeat ? 'attribute float fade; varying float vFade;\n' : '') + 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;' + (repeat ? ' vFade = fade;' : ''));
    sh.fragmentShader = (repeat ? 'varying float vFade;\n' : '') + 'uniform sampler2D uSplat; uniform vec4 uXf, uCores; uniform vec2 uTerr; varying vec2 vGxz;\nvec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(0.42, 1.0, texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw).b) * 0.88;
      ${repeat ? `{ // hết đoạn lát: mép vỡ lởm chởm theo nhiễu (không mờ nhoè), lộ dần nền cỏ
        float n = 0.0, amp = 0.62;
        for (int o = 0; o < 3; o++) { vec2 q = vGxz / (170.0 / pow(2.3, float(o))), i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
          n += amp * mix(mix(h22(i).x, h22(i + vec2(1.0, 0.0)).x, f.x), mix(h22(i + vec2(0.0, 1.0)).x, h22(i + vec2(1.0)).x, f.x), f.y); amp *= 0.45; }
        if (vFade < 0.999) {                                                     // vùng lẫn cỏ: còn lại từng PHIẾN đá vỡ (ô ~150) nằm giữa cỏ
          vec2 cq = vGxz / 150.0, ci = floor(cq), cf = fract(cq);
          float score = h22(ci + 17.0).x * 0.55 + n * 0.45, e = vFade - score;
          float edge = min(min(cf.x, 1.0 - cf.x), min(cf.y, 1.0 - cf.y)) * 150.0;             // khe giữa các phiến
          float erode = smoothstep(0.92, 0.45, vFade) * (5.0 + 24.0 * n);                       // mép phiến mòn vỡ theo nhiễu (chỉ khi đã lẫn nhiều cỏ)
          if (e < 0.0 || edge < erode) discard;
          if (erode > 0.5) diffuseColor.rgb *= 0.5 + 0.5 * smoothstep(erode, erode + 7.0, edge); // mép vỡ sẫm
        }
      }` : ''}`).replace('#include <opaque_fragment>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLightShadow dls0 = directionalLightShadows[ 0 ];
        outgoingLight *= mix( 0.42, 1.0, getShadow( directionalShadowMap[ 0 ], dls0.shadowMapSize, dls0.shadowIntensity, dls0.shadowBias, dls0.shadowRadius, vDirectionalShadowCoord[ 0 ] ) );
      #endif
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'lane-stone' + (repeat ? 'r' : 'p');
  return m;
}

/** Dải đường theo đường gấp khúc (đã bo góc) + vòng khắc chân trụ/nhà chính. baked: bản trộn nền (bóng nướng sẵn). */
export function buildLaneDecor(map, baked, structs) {
  const cores = structs.filter((q) => q.kind === 'core').map((q) => ({ x: q.x, y: q.y }));
  const g = new THREE.Group(), t = laneTexture(), mat = stoneMat(t, baked, true, cores);
  for (const ln of map.lanes) {
    const W = ln.width * 1.08, rep = W * 2; // texture 1024×2048 → điểm ảnh vuông // một đoạn hoa văn dài 2.2 lần bề ngang
    // lấy mẫu đều theo quãng + làm mượt hướng
    const pts = [];
    for (let i = 0; i + 1 < ln.pts.length; i++) { const [ax, ay] = ln.pts[i], [bx, by] = ln.pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 60)); for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
    pts.push(ln.pts[ln.pts.length - 1]);
    const P = [], UV = [], I = [], F = []; let s = 0; const { sB, sR } = pavedRange(map, ln);
    // độ phủ lát theo quãng: kín từ nhà chính tới gần trụ nhà → quanh trụ lẫn ít cỏ → sau đó cỏ là chính, lác đác mảng lát
    const tb = sB - PAVE_EXT, tr = sR + PAVE_EXT, ramp = (d) => (d < -700 ? 1 : d < 0 ? 1 - 0.4 * (d + 700) / 700 : d < 400 ? 0.6 - 0.1 * d / 400 : d < 1400 ? 0.5 - 0.14 * (d - 400) / 1000 : 0.35);
    const fadeAt = (ss) => Math.max(ramp(ss - tb), ramp(tr - ss));
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      F.push(fadeAt(s), fadeAt(s));
      const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      P.push(pts[i][0] - nx * W / 2, 0.2, pts[i][1] - nz * W / 2, pts[i][0] + nx * W / 2, 0.2, pts[i][1] + nz * W / 2);
      UV.push(0, s / rep, 1, s / rep);
      if (i && Math.max(F[2 * i - 2], F[2 * i]) > 0) { const q = (i - 1) * 2; I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } // chỉ dựng phần lát
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('fade', new THREE.Float32BufferAttribute(F, 1)); geo.setIndex(I); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { geo.setIndex(I.map((_, k) => I[k - (k % 3) + [0, 2, 1][k % 3]])); geo.computeVertexNormals(); }
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.renderOrder = 0; g.add(mesh);
  }
  // vòng khắc chân trụ / nhà chính
  for (const s of structs) {
    if (s.kind !== 'core') continue; // chỉ sân nhà chính (trụ thường đứng trên nền cỏ xen đá)
    const R = s.kind === 'core' ? 1150 : 330, pt = s.kind === 'core' ? corePlazaTexture() : plazaTexture(s.kind), m = stoneMat(pt, baked, false); m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4;
    const d = new THREE.Mesh(new THREE.CircleGeometry(R, 72), m); d.rotation.x = -Math.PI / 2; d.position.set(s.x, 0.9, s.y); d.receiveShadow = true; d.renderOrder = 0; g.add(d);
  }
  return g;
}
