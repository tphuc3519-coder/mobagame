import * as THREE from 'three';
import { rngFor } from './noise.js';

// Họa tiết nền sân nhà kiểu Liên Quân — KHẮC CHÌM vào nền (không phải khối đá nổi): các nét đá quét cọ xoáy quanh chân trụ, bậc
// thềm cong quanh nhà chính, phiến cong vắt ngang đường trong sân nhà (thưa dần quanh trụ nhà, sau đó mảnh vỡ lác đác). Chỉ VẼ thành
// một texture phủ cả bản đồ (2048²): R = mặt đá (mềm mép), G = độ cao chạm (đá lõm + gân), B = chỉ sáng màu đội. Shader nền dùng nó:
// mặt đá lam xám nửa trong, cỏ/rêu phủ loang lên, viền rãnh tối, sáng tối theo hướng nắng như rãnh khắc lõm (xem ground.js).

const N = 2048;
const arc = (cx, cz, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const spiral = (cx, cz, r0, r1, a0, sweep, n = 24, wob = 0) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + sweep * t, r = r0 + (r1 - r0) * Math.pow(t, 0.85) + wob * Math.sin(t * Math.PI * 2); return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
/** Đa giác dải theo đường giữa pts với bề rộng w(t). */
function ribbon(pts, wf) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l, w = Math.max(0, wf(i / (n - 1))) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + nz * w]); R.push([pts[i][0] - nx * w, pts[i][1] - nz * w]);
  }
  return [...L, ...R.reverse()];
}

/** Bố cục họa tiết: { face: [đa giác mặt đá], ridge: [đa giác gân/mặt nổi], glow: [[đa giác, phe]] }. */
function layout(map, structs, onRiver) {
  const r = rngFor(919), face = [], ridge = [], glow = [];
  const towers = structs.filter((s) => s.kind !== 'core'), cores = structs.filter((s) => s.kind === 'core');
  const nearTower = (x, z, R) => towers.some((t) => Math.hypot(x - t.x, z - t.y) < R);
  const inPlay = (x, z) => x > 300 && z > 300 && x < map.w - 300 && z < map.h - 300 && !map.outOfBounds?.(x, z, 40);
  const plate = (pts, wf, inset = 0.62) => { face.push(ribbon(pts, wf)); const n = pts.length, i0 = Math.round(n * 0.07), i1 = n - 1 - i0; ridge.push(ribbon(pts.slice(i0, i1 + 1), (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * inset - 30)); };
  const stroke = (pts, W) => { const wf = (t) => W * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(t, 0.75) * 1.02)), 0.7); face.push(ribbon(pts, wf)); const n = pts.length, i0 = Math.round(n * 0.1), i1 = n - 1 - Math.round(n * 0.18); ridge.push(ribbon(pts.slice(i0, i1 + 1), (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * 0.28)); };
  const CORE_R = 1500;
  for (const c of cores) {
    face.push(arc(c.x, c.y, 560, 0, Math.PI * 2, 64));
    for (let k = 0; k < 10; k++) { const p = spiral(c.x, c.y, 300, 560, (k / 10) * Math.PI * 2, 1.0, 20); ridge.push(ribbon(p, (t) => 70 * Math.sin(Math.PI * t))); }
    for (const [R, W, segL] of [[760, 200, 640], [990, 200, 700], [1220, 190, 760]]) {
      const n = Math.max(3, Math.round((Math.PI * 2 * R) / segL));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + R * 0.0013, a1 = a0 + (Math.PI * 2) / n - 34 / R, am = (a0 + a1) / 2;
        if (!inPlay(c.x + Math.cos(am) * R, c.y + Math.sin(am) * R)) continue;
        plate(arc(c.x, c.y, R, a0, a1, 16), () => W);
        if (R === 990) glow.push([ribbon(arc(c.x, c.y, R, a0 + 50 / R, a1 - 50 / R, 16), () => 10), c.team]);
      }
    }
    for (let k = 0; k < 14; k++) { const p = spiral(c.x, c.y, 1360, 1720, (k / 14) * Math.PI * 2 + 0.2, 0.55, 18, 30); if (inPlay(p[9][0], p[9][1])) stroke(p, 160); }
  }
  for (const t of towers) {
    const a00 = r.range(0, 6.3); face.push(arc(t.x, t.y, 240, 0, Math.PI * 2, 40));
    for (let k = 0; k < 9; k++) stroke(spiral(t.x, t.y, 250, r.range(720, 980), a00 + (k / 9) * Math.PI * 2, r.range(1.25, 1.7), 26, r.range(-25, 25)), r.range(120, 170));
  }
  for (const ln of map.lanes) {
    const P = ln.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = cum[cum.length - 1], at = (s) => { let i = 1; while (i < P.length - 1 && cum[i] < s) i++; const L = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / L; return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, tx: (P[i][0] - P[i - 1][0]) / L, tz: (P[i][1] - P[i - 1][1]) / L }; };
    const sAt = (x, z) => { let best = 0, bd = Infinity; for (let s = 0; s <= total; s += 40) { const p = at(s), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = s; } } return best; };
    const hB = towers.find((t) => t.id === ln.id + '_home' && t.team === 0), hR = towers.find((t) => t.id === ln.id + '_home' && t.team === 1);
    const sB = hB ? sAt(hB.x, hB.y) : total * 0.2, sR = hR ? sAt(hR.x, hR.y) : total * 0.8, hw = ln.width / 2 * 0.96;
    for (let s = 0, k = 0; s < total; s += 380, k++) {
      const d = Math.min(s - sB, sR - s), keep = d < -450 ? 1 : d < 100 ? 0.8 : d < 1300 ? 0.5 - 0.38 * (d - 100) / 1200 : 0.08;
      if (r.next() > keep) continue;
      const p = at(s + 190), nx = -p.tz, nz = p.tx;
      if (cores.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < CORE_R) || nearTower(p.x, p.z, 900) || onRiver(p.x, p.z)) continue;
      if (d > -200) { for (let j = 0, m = 1 + r.int(2); j < m; j++) { const o = r.range(-hw * 0.8, hw * 0.8), cx = p.x + nx * o + p.tx * r.range(-90, 90), cz = p.z + nz * o + p.tz * r.range(-90, 90), R = r.range(80, 160), rot = r.range(0, 6.3), n = 7 + r.int(3);
        face.push(Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2, rr = R * r.range(0.55, 1); return [cx + Math.cos(a) * rr * 1.3, cz + Math.sin(a) * rr * 0.8]; })); } continue; }
      const sag = (k % 2 ? 1 : -1) * 90;
      plate(Array.from({ length: 15 }, (_, i) => { const o = -hw + 2 * hw * i / 14, q = o / hw, bow = sag * (1 - q * q); return [p.x + nx * o + p.tx * bow, p.z + nz * o + p.tz * bow]; }), () => 345);
    }
  }
  return { face, ridge, glow };
}

function blur(a, n, rr) {
  const tmp = new Float32Array(n * n), inv = 1 / (2 * rr + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < n; y++) { const o = y * n; let acc = 0; for (let k = -rr; k <= rr; k++) acc += a[o + Math.min(n - 1, Math.max(0, k))]; for (let x = 0; x < n; x++) { tmp[o + x] = acc * inv; acc += a[o + Math.min(n - 1, x + rr + 1)] - a[o + Math.max(0, x - rr)]; } }
    for (let x = 0; x < n; x++) { let acc = 0; for (let k = -rr; k <= rr; k++) acc += tmp[Math.min(n - 1, Math.max(0, k)) * n + x]; for (let y = 0; y < n; y++) { a[y * n + x] = acc * inv; acc += tmp[Math.min(n - 1, y + rr + 1) * n + x] - tmp[Math.max(0, y - rr) * n + x]; } }
  }
}

/** Texture họa tiết khắc chìm phủ cả bản đồ: { tex, xf: vec4(x0, z0, 1/w, 1/h) }. */
export function basePattern(map, structs, { onRiver = () => false } = {}) {
  const L = layout(map, structs, onRiver), s = N / map.w;
  const draw = (polys, blurPx) => {
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.setTransform(s, 0, 0, s, 0, 0); g.fillStyle = '#fff';
    for (const p of polys) { g.beginPath(); p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.closePath(); g.fill(); }
    const d = g.getImageData(0, 0, N, N).data, ch = new Float32Array(N * N); for (let i = 0; i < N * N; i++) ch[i] = d[4 * i] / 255;
    if (blurPx) blur(ch, N, blurPx); return ch;
  };
  const face = draw(L.face, 1), ridge = draw(L.ridge, 1), glow = draw(L.glow.map(([p]) => p), 1);
  const hgt = new Float32Array(N * N); for (let i = 0; i < N * N; i++) hgt[i] = face[i] * 0.6 + ridge[i] * 0.4; blur(hgt, N, 2);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[4 * i] = face[i] * 255; data[4 * i + 1] = hgt[i] * 255; data[4 * i + 2] = glow[i] * 255; data[4 * i + 3] = 255; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  return { tex, xf: new THREE.Vector4(0, 0, 1 / map.w, 1 / map.h) };
}
