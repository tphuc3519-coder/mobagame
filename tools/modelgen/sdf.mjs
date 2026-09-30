// Thân liền khối mượt từ trường khoảng cách có dấu (SDF): các khối (nón tròn, elipxoit) hoà trộn mềm (smooth-min),
// dựng lưới bằng "surface nets" rồi chiếu đỉnh lên mặt, pháp tuyến lấy từ gradient, AO khe nướng vào màu đỉnh.
// Màu và trọng số xương của đỉnh lấy từ các khối gần nhất (hoà trong một dải hẹp) → khớp vai/hông biến dạng mượt.
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';
await MeshoptSimplifier.ready;

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** smin đa thức (IQ). */
export function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }

/** Nón tròn đầu (round cone) từ a (bán kính r1) tới b (r2) — IQ. */
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const cx = pax * l2 - bax * y, cy = pay * l2 - bay * y, cz = paz * l2 - baz * y;
  const x2 = cx * cx + cy * cy + cz * cz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
/** Elipxoit (xấp xỉ IQ), có thể xoay bằng ma trận nghịch m (3x3, hàng). */
function sdEllipsoid(px, py, pz, c, r, m) {
  let x = px - c[0], y = py - c[1], z = pz - c[2];
  if (m) { const X = m[0] * x + m[1] * y + m[2] * z, Y = m[3] * x + m[4] * y + m[5] * z, Z = m[6] * x + m[7] * y + m[8] * z; x = X; y = Y; z = Z; }
  const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]), k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(...r);
}

/** Thân loft: chồng mặt cắt elip theo Y (secs: [{y, rx, rz, cx?, cz?}] từ dưới lên), nội suy mượt, hai đầu bo tròn. */
function sdLoft(px, py, pz, secs) {
  const n = secs.length, y0 = secs[0].y, y1 = secs[n - 1].y;
  const yy = Math.min(y1, Math.max(y0, py));
  let i = 0; while (i < n - 2 && secs[i + 1].y < yy) i++;
  const a = secs[i], b = secs[i + 1], t0 = (yy - a.y) / (b.y - a.y || 1), t = t0 * t0 * (3 - 2 * t0);
  const rx = a.rx + (b.rx - a.rx) * t, rz = a.rz + (b.rz - a.rz) * t, cx = (a.cx || 0) + ((b.cx || 0) - (a.cx || 0)) * t, cz = (a.cz || 0) + ((b.cz || 0) - (a.cz || 0)) * t;
  const dx = px - cx, dz = pz - cz, q = Math.hypot(dx / rx, dz / rz);
  const side = (q - 1) * (q > 1 ? Math.hypot(dx, dz) / q : Math.min(rx, rz));
  const cap = Math.max(y0 - py, py - y1);
  return cap > 0 ? (side > 0 ? Math.hypot(side, cap) : cap) : side;
}

export class SdfBody {
  constructor() { this.prims = []; }
  /**
   * p: { cone: [a, b, r1, r2] | ell: [c, radii, rotDeg?], k (độ hoà vào khối trước), color: hex | (x,y,z)=>hex,
   *      weights: (x,y,z) => [[bone, w], ...], sub: true (khối trừ, khoét), glow }
   */
  add(p) {
    const q = { ...p };
    if (q.ell && q.ell[2]) { const e = new THREE.Euler(...q.ell[2].map((d) => d * Math.PI / 180), 'XYZ'); const M = new THREE.Matrix4().makeRotationFromEuler(e).invert(); const el = M.elements; q.m = [el[0], el[4], el[8], el[1], el[5], el[9], el[2], el[6], el[10]]; }
    // hộp bao để bỏ qua khối ở xa
    let lo, hi;
    if (q.cone) { const [a, b, r1, r2] = q.cone, r = Math.max(r1, r2); lo = a.map((v, i) => Math.min(v, b[i]) - r); hi = a.map((v, i) => Math.max(v, b[i]) + r); }
    else if (q.loft) { const s = q.loft, R = Math.max(...s.map((e) => Math.max(e.rx, e.rz) + Math.abs(e.cx || 0) + Math.abs(e.cz || 0))); lo = [-R, s[0].y, -R]; hi = [R, s[s.length - 1].y, R]; }
    else { const [c, r] = q.ell, R = q.m ? Math.max(...r) : null; lo = c.map((v, i) => v - (R ?? r[i])); hi = c.map((v, i) => v + (R ?? r[i])); }
    q.lo = lo; q.hi = hi; q.k = q.k ?? 0.03;
    this.prims.push(q);
    return q;
  }
  prim(q, x, y, z) { return q.cone ? sdRoundCone(x, y, z, q.cone[0], q.cone[1], q.cone[2], q.cone[3]) : q.loft ? sdLoft(x, y, z, q.loft) : sdEllipsoid(x, y, z, q.ell[0], q.ell[1], q.m); }
  /** Khoảng cách tổng hợp. */
  dist(x, y, z) {
    let d = 1e9;
    for (const q of this.prims) {
      const pad = q.k + 0.02;
      if (x < q.lo[0] - pad || y < q.lo[1] - pad || z < q.lo[2] - pad || x > q.hi[0] + pad || y > q.hi[1] + pad || z > q.hi[2] + pad) {
        if (!q.sub) { const dx = Math.max(q.lo[0] - x, 0, x - q.hi[0]), dy = Math.max(q.lo[1] - y, 0, y - q.hi[1]), dz = Math.max(q.lo[2] - z, 0, z - q.hi[2]); d = Math.min(d, Math.hypot(dx, dy, dz)); }
        continue;
      }
      const e = this.prim(q, x, y, z);
      d = q.sub ? -smin(-d, e, q.k) : smin(d, e, q.k);
    }
    return d;
  }

  /** Dựng lưới. cell: cạnh ô (m). Trả { pos, nor, col, bones:[[[name,w]..]], idx }. */
  mesh(cell = 0.014, targetTris = 9000, classify = () => 0) {
    if (!this.prims.length) return null;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const q of this.prims) if (!q.sub) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q.lo[i] - q.k - 2 * cell); hi[i] = Math.max(hi[i], q.hi[i] + q.k + 2 * cell); }
    const n = lo.map((v, i) => Math.ceil((hi[i] - v) / cell) + 1), [nx, ny, nz] = n;
    const F = new Float32Array(nx * ny * nz), id = (i, j, k) => (k * ny + j) * nx + i;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[id(i, j, k)] = this.dist(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell);
    // mỗi ô có đổi dấu → một đỉnh (trung bình các giao điểm trên cạnh)
    const vidx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), cid = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
    const pos = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const v = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let inside = 0;
      for (let c = 0; c < 8; c++) { v[c] = F[id(i + C[c][0], j + C[c][1], k + C[c][2])]; if (v[c] < 0) inside++; }
      if (inside === 0 || inside === 8) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [a, b] of E) {
        if ((v[a] < 0) === (v[b] < 0)) continue;
        const t = v[a] / (v[a] - v[b]);
        sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; cnt++;
      }
      vidx[cid(i, j, k)] = pos.length / 3;
      pos.push(lo[0] + (i + sx / cnt) * cell, lo[1] + (j + sy / cnt) * cell, lo[2] + (k + sz / cnt) * cell);
    }
    // mặt: mỗi cạnh lưới cắt mặt → một tứ giác nối 4 ô chung cạnh
    const idx = [];
    const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = F[id(i, j, k)] < 0, b = F[id(i + 1, j, k)] < 0; if (a === b) continue;
      quad(vidx[cid(i, j - 1, k - 1)], vidx[cid(i, j, k - 1)], vidx[cid(i, j, k)], vidx[cid(i, j - 1, k)], !a);
    }
    for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const a = F[id(i, j, k)] < 0, b = F[id(i, j + 1, k)] < 0; if (a === b) continue;
      quad(vidx[cid(i - 1, j, k - 1)], vidx[cid(i - 1, j, k)], vidx[cid(i, j, k)], vidx[cid(i, j, k - 1)], !a);
    }
    for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const a = F[id(i, j, k)] < 0, b = F[id(i, j, k + 1)] < 0; if (a === b) continue;
      quad(vidx[cid(i - 1, j - 1, k)], vidx[cid(i, j - 1, k)], vidx[cid(i, j, k)], vidx[cid(i - 1, j, k)], !a);
    }
    // (hướng mặt được sửa sau khi có pháp tuyến)
    // giảm tam giác bằng meshoptimizer (giữ hình, bớt ô phẳng) rồi mới tính pháp tuyến/màu/xương trên đỉnh còn lại
    let N0 = pos.length / 3;
    if (idx.length / 3 > targetTris) {
      const P = new Float32Array(pos), I = new Uint32Array(idx);
      const out = MeshoptSimplifier.simplify(I, P, 3, targetTris * 3, 0.01, ['LockBorder'])[0];
      const [remap, unique] = MeshoptSimplifier.compactMesh(out);
      const np = new Array(unique * 3);
      for (let i = 0; i < N0; i++) { const t = remap[i]; if (t === 0xffffffff) continue; np[t * 3] = pos[i * 3]; np[t * 3 + 1] = pos[i * 3 + 1]; np[t * 3 + 2] = pos[i * 3 + 2]; }
      pos.length = 0; pos.push(...np); idx.length = 0; idx.push(...out); N0 = unique;
    }
    // chiếu đỉnh lên mặt + pháp tuyến gradient
    const N = pos.length / 3, nor = new Float32Array(N * 3), h = cell * 0.25;
    const grad = (x, y, z) => { const gx = this.dist(x + h, y, z) - this.dist(x - h, y, z), gy = this.dist(x, y + h, z) - this.dist(x, y - h, z), gz = this.dist(x, y, z + h) - this.dist(x, y, z - h); const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l]; };
    for (let t = 0; t < N; t++) {
      let x = pos[t * 3], y = pos[t * 3 + 1], z = pos[t * 3 + 2];
      for (let it = 0; it < 3; it++) { const d = this.dist(x, y, z), g = grad(x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; }
      pos[t * 3] = x; pos[t * 3 + 1] = y; pos[t * 3 + 2] = z;
      const g = grad(x, y, z); nor[t * 3] = g[0]; nor[t * 3 + 1] = g[1]; nor[t * 3 + 2] = g[2];
    }
    // đảm bảo tam giác quay ra ngoài (khớp pháp tuyến gradient)
    for (let f = 0; f < idx.length; f += 3) {
      const [a, b, c] = [idx[f], idx[f + 1], idx[f + 2]];
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      const mx = nor[a * 3] + nor[b * 3] + nor[c * 3], my = nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], mz = nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2];
      if (fx * mx + fy * my + fz * mz < 0) { idx[f + 1] = c; idx[f + 2] = b; }
    }
    // màu, AO, trọng số xương
    const col = new Float32Array(N * 3), bones = [], tmp = new THREE.Color(), acc = new THREE.Color(), mat = new Array(N);
    for (let t = 0; t < N; t++) {
      const x = pos[t * 3], y = pos[t * 3 + 1], z = pos[t * 3 + 2], nx_ = nor[t * 3], ny_ = nor[t * 3 + 1], nz_ = nor[t * 3 + 2];
      const ds = this.prims.map((q) => (q.sub ? 1e9 : this.prim(q, x, y, z)));
      const dmin = Math.min(...ds);
      // màu: hoà trong dải hẹp (ranh giới áo/da gọn)
      acc.setRGB(0, 0, 0); let cw = 0;
      ds.forEach((d, i) => { const w = Math.max(0, 1 - (d - dmin) / 0.006); if (w <= 0) return; const q = this.prims[i]; tmp.set(typeof q.color === 'function' ? q.color(x, y, z) : q.color || '#ff00ff'); acc.r += tmp.r * w; acc.g += tmp.g * w; acc.b += tmp.b * w; cw += w; });
      acc.multiplyScalar(1 / cw);
      { const iq = ds.indexOf(dmin), q = this.prims[iq], hex = typeof q.color === 'function' ? q.color(x, y, z) : q.color || '#ff00ff';
        mat[t] = q.mat != null ? (typeof q.mat === 'function' ? q.mat(x, y, z) : q.mat) : classify(hex); }
      // AO khe: đo trường khoảng cách dọc pháp tuyến (IQ)
      let occ = 0, sca = 1;
      for (let s = 1; s <= 5; s++) { const hh = 0.012 * s; occ += (hh - this.dist(x + nx_ * hh, y + ny_ * hh, z + nz_ * hh)) * sca; sca *= 0.75; }
      const ao = clamp(1 - 3.2 * occ, 0.35, 1), shade = (0.84 + 0.16 * (ny_ * 0.5 + 0.5)) * ao;
      col[t * 3] = acc.r * shade; col[t * 3 + 1] = acc.g * shade; col[t * 3 + 2] = acc.b * shade;
      // xương: dải rộng hơn để khớp biến dạng mềm
      const bw = new Map();
      ds.forEach((d, i) => { const w = Math.max(0, 1 - (d - dmin) / 0.035); if (w <= 0) return; for (const [nm, ww] of this.prims[i].weights(x, y, z)) bw.set(nm, (bw.get(nm) || 0) + ww * w * w); });
      const list = [...bw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = list.reduce((a, b) => a + b[1], 0) || 1;
      bones.push(list.map(([nm, w]) => [nm, w / tot]));
    }
    return { pos, nor: Array.from(nor), col: Array.from(col), bones, idx, mat };
  }
}

/** Trọng số pha giữa hai xương dọc đoạn from→to (giống blend cũ của kit). */
export function segWeights(b1, b2, from, to, t0, t1, w0, w1) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  return (x, y, z) => {
    const t = ((x - from[0]) * d[0] + (y - from[1]) * d[1] + (z - from[2]) * d[2]) / l2;
    const s = clamp((t - t0) / (t1 - t0), 0, 1), w = w0 + (w1 - w0) * s * s * (3 - 2 * s);
    return w <= 0 ? [[b1, 1]] : w >= 1 ? [[b2, 1]] : [[b1, 1 - w], [b2, w]];
  };
}
