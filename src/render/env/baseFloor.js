import * as THREE from 'three';
import { rngFor } from './noise.js';

// Họa tiết nền sân nhà kiểu Liên Quân — KHẮC CHÌM vào nền (không phải khối đá nổi): các nét đá quét cọ xoáy quanh chân trụ, bậc
// thềm cong quanh nhà chính, phiến cong vắt ngang đường trong sân nhà (thưa dần quanh trụ nhà, sau đó mảnh vỡ lác đác). Chỉ VẼ thành
// một texture phủ cả bản đồ (2048²): R = mặt đá (mềm mép), G = độ cao chạm (đá lõm + gân), B = chỉ sáng màu đội. Shader nền dùng nó:
// mặt đá lam xám nửa trong, cỏ/rêu phủ loang lên, viền rãnh tối, sáng tối theo hướng nắng như rãnh khắc lõm (xem ground.js).

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

/** Đuôi cuộn xoắn (như nét cọ cuộn móc ở đầu): nối tiếp hướng cuối của pts, quay dần, bước ngắn dần. dir = ±1 chiều cuộn. */
function curl(pts, dir = 1, len = 46, n = 11) {
  const out = pts.slice(), [ax, az] = pts[pts.length - 2], [bx, bz] = pts[pts.length - 1]; let a = Math.atan2(bz - az, bx - ax), x = bx, z = bz, l = len;
  for (let i = 0; i < n; i++) { a += dir * 0.42; l *= 0.86; x += Math.cos(a) * l; z += Math.sin(a) * l; out.push([x, z]); }
  return out;
}
/** Bố cục họa tiết: face (mặt đá), ridge (gân/mặt nổi), lines ([đường, bề rộng] chỉ khắc), glow ([đa giác, phe]). */
function layout(map, structs, onRiver) {
  const r = rngFor(919), face = [], ridge = [], lines = [], glow = [];
  const towers = structs.filter((s) => s.kind !== 'core'), cores = structs.filter((s) => s.kind === 'core');
  const nearTower = (x, z, R) => towers.some((t) => Math.hypot(x - t.x, z - t.y) < R);
  const inPlay = (x, z) => x > 300 && z > 300 && x < map.w - 300 && z < map.h - 300 && !map.outOfBounds?.(x, z, 40);
  const ring = (cx, cz, R, w) => lines.push([arc(cx, cz, R, 0, Math.PI * 2, 72), w, true]);
  const beads = (cx, cz, R, n, rad) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R; ridge.push(arc(x, z, rad, 0, Math.PI * 2, 10)); lines.push([arc(x, z, rad, 0, Math.PI * 2, 10), 5, true]); } };
  /** Phiến: mặt + mặt nổi thụt + chỉ viền trong. */
  const plate = (pts, wf, inset = 0.62) => {
    face.push(ribbon(pts, wf)); const n = pts.length, i0 = Math.round(n * 0.07), i1 = n - 1 - i0, sub = pts.slice(i0, i1 + 1), wi = (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * inset - 30;
    ridge.push(ribbon(sub, wi)); lines.push([ribbon(sub, (t) => wi(t) + 26), 7, true]);
  };
  /** Nét cọ: mặt thon hai đầu + đuôi cuộn, chỉ viền trong, gân nổi giữa. */
  const stroke = (pts0, W, cdir = 1, withCurl = true) => {
    const pts = withCurl ? curl(pts0, cdir, W * 0.36) : pts0, n0 = pts0.length, n = pts.length;
    const span = (n - n0) / (n0 - 1) + 1e-6, main = (tt) => W * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(tt, 0.75) * 0.62)), 0.7) * (1 - 0.45 * tt), wEnd = main(1);
    const wf = (t) => { const tt = (t * (n - 1)) / (n0 - 1); return tt <= 1 ? main(tt) : wEnd * Math.pow(Math.max(0, 1 - (tt - 1) / span), 1.2) + 6; };
    face.push(ribbon(pts, wf));
    const i0 = Math.round(n * 0.08), i1 = n - 2, sub = pts.slice(i0, i1 + 1), sw = (t) => wf((i0 + t * (i1 - i0)) / (n - 1));
    lines.push([ribbon(sub, (t) => sw(t) * 0.58), 6, true]);                     // chỉ viền trong
    ridge.push(ribbon(sub, (t) => sw(t) * 0.2));                                  // gân giữa
  };
  /** Chỉ lông cọ: nét mảnh thon. */
  const hair = (pts, w = 10) => lines.push([pts, w, false]);
  const CORE_R = 1500;
  for (const c of cores) {
    face.push(arc(c.x, c.y, 560, 0, Math.PI * 2, 64)); ring(c.x, c.y, 540, 10); ring(c.x, c.y, 585, 14); ring(c.x, c.y, 612, 7); beads(c.x, c.y, 640, 40, 11);
    for (let k = 0; k < 10; k++) { const a0 = (k / 10) * Math.PI * 2, p = spiral(c.x, c.y, 260, 530, a0, 1.0, 20); ridge.push(ribbon(p, (t) => 80 * Math.sin(Math.PI * t))); lines.push([ribbon(p, (t) => 80 * Math.sin(Math.PI * t) + 16), 5, true]); hair(spiral(c.x, c.y, 300, 520, a0 + 0.3, 0.9, 16), 8); }
    ridge.push(arc(c.x, c.y, 110, 0, Math.PI * 2, 32)); ring(c.x, c.y, 150, 10); ring(c.x, c.y, 200, 6);
    for (const [R, W, segL] of [[760, 200, 640], [990, 200, 700], [1220, 190, 760]]) {
      const n = Math.max(3, Math.round((Math.PI * 2 * R) / segL));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + R * 0.0013, a1 = a0 + (Math.PI * 2) / n - 34 / R, am = (a0 + a1) / 2;
        if (!inPlay(c.x + Math.cos(am) * R, c.y + Math.sin(am) * R)) continue;
        plate(arc(c.x, c.y, R, a0, a1, 16), () => W);
        if (R === 990) glow.push([ribbon(arc(c.x, c.y, R, a0 + 50 / R, a1 - 50 / R, 16), () => 10), c.team]);
        else { const am2 = (a0 + a1) / 2, ux = Math.cos(am2), uz = Math.sin(am2), vx = -uz, vz = ux, cx = c.x + ux * R, cz = c.y + uz * R; // thoi khắc giữa phiến
          lines.push([[[cx + ux * 60, cz + uz * 60], [cx + vx * 120, cz + vz * 120], [cx - ux * 60, cz - uz * 60], [cx - vx * 120, cz - vz * 120]], 7, true]); ridge.push(arc(cx, cz, 16, 0, Math.PI * 2, 10)); }
      }
    }
    for (const Rm of [875, 1105]) for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux, x = c.x + ux * Rm, z = c.y + uz * Rm; // vòng mũi tên
      if (!inPlay(x, z)) continue; face.push([[x + ux * 14, z + uz * 14], [x + vx * 9 - ux * 10, z + vz * 9 - uz * 10], [x - vx * 9 - ux * 10, z - vz * 9 - uz * 10]]); }
    for (let k = 0; k < 14; k++) { const a0 = (k / 14) * Math.PI * 2 + 0.2, p = spiral(c.x, c.y, 1360, 1720, a0, 0.55, 18, 30); if (!inPlay(p[9][0], p[9][1])) continue; stroke(p, 170, k % 2 ? 1 : -1); hair(spiral(c.x, c.y, 1400, 1650, a0 + 0.22, 0.45, 14, 20), 9); }
  }
  for (const t of towers) {
    const a00 = r.range(0, 6.3), K = 9;
    face.push(arc(t.x, t.y, 240, 0, Math.PI * 2, 40)); ring(t.x, t.y, 262, 12); ring(t.x, t.y, 300, 7); beads(t.x, t.y, 330, 24, 9); ring(t.x, t.y, 358, 6);
    for (let k = 0; k < K; k++) {
      const a0 = a00 + (k / K) * Math.PI * 2, R1 = r.range(760, 1000), sw = r.range(1.3, 1.7);
      stroke(spiral(t.x, t.y, 370, R1, a0, sw, 26, r.range(-25, 25)), r.range(130, 175), 1);
      for (const [f, l] of [[0.34, 0.75], [0.6, 0.55]]) hair(spiral(t.x, t.y, 400, 400 + (R1 - 400) * l, a0 + (Math.PI * 2 / K) * f, sw * l, 18), 9);       // chỉ lông cọ giữa hai nét
      if (r.next() < 0.6) { const aa = a0 + sw + r.range(-0.2, 0.2), RR = R1 + r.range(60, 160), cx = t.x + Math.cos(aa) * RR, cz = t.y + Math.sin(aa) * RR;   // lá xoắn nhỏ ở đầu nét
        stroke(spiral(cx, cz, 10, 160, aa + 1.6, 0.9, 12), 56, -1); }
    }
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
      if (cores.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < CORE_R) || nearTower(p.x, p.z, 1000) || onRiver(p.x, p.z)) continue;
      if (d > -200) { for (let j = 0, m = 1 + r.int(2); j < m; j++) { const o = r.range(-hw * 0.8, hw * 0.8), cx = p.x + nx * o + p.tx * r.range(-90, 90), cz = p.z + nz * o + p.tz * r.range(-90, 90), R = r.range(80, 160), rot = r.range(0, 6.3), n = 7 + r.int(3);
        const poly = Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2, rr = R * r.range(0.55, 1); return [cx + Math.cos(a) * rr * 1.3, cz + Math.sin(a) * rr * 0.8]; }); face.push(poly); lines.push([poly, 6, true]); } continue; }
      const sag = (k % 2 ? 1 : -1) * 90, pt = (o, b = 0) => { const q = o / hw, bow = sag * (1 - q * q) + b; return [p.x + nx * o + p.tx * bow, p.z + nz * o + p.tz * bow]; };
      plate(Array.from({ length: 15 }, (_, i) => pt(-hw + 2 * hw * i / 14)), () => 345);
      for (let j = -1; j <= 1; j++) { const o = j * hw * 0.55; lines.push([[pt(o, 70), pt(o + 110, 0), pt(o, -70), pt(o - 110, 0)], 7, true]); ridge.push(arc(...pt(o), 14, 0, Math.PI * 2, 10)); } // chuỗi thoi khắc
    }
  }
  return { face, ridge, lines, glow };
}

function blur(a, n, rr) {
  const tmp = new Float32Array(n * n), inv = 1 / (2 * rr + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < n; y++) { const o = y * n; let acc = 0; for (let k = -rr; k <= rr; k++) acc += a[o + Math.min(n - 1, Math.max(0, k))]; for (let x = 0; x < n; x++) { tmp[o + x] = acc * inv; acc += a[o + Math.min(n - 1, x + rr + 1)] - a[o + Math.max(0, x - rr)]; } }
    for (let x = 0; x < n; x++) { let acc = 0; for (let k = -rr; k <= rr; k++) acc += tmp[Math.min(n - 1, Math.max(0, k)) * n + x]; for (let y = 0; y < n; y++) { a[y * n + x] = acc * inv; acc += tmp[Math.min(n - 1, y + rr + 1) * n + x] - tmp[Math.max(0, y - rr) * n + x]; } }
  }
}

/** Texture họa tiết khắc chìm phủ cả bản đồ: { tex, xf: vec4(x0, z0, 1/w, 1/h) }. */
export function basePattern(map, structs, { onRiver = () => false, size = 3072 } = {}) {
  const N = size, L = layout(map, structs, onRiver), s = N / map.w;
  const draw = (polys, blurPx, strokeMode = false) => {
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.setTransform(s, 0, 0, s, 0, 0); g.fillStyle = g.strokeStyle = '#fff'; g.lineJoin = g.lineCap = 'round';
    for (const it of polys) { const [p, w, closed] = strokeMode ? it : [it]; g.beginPath(); p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); if (!strokeMode || closed) g.closePath(); if (strokeMode) { g.lineWidth = w; g.stroke(); } else g.fill(); }
    const d = g.getImageData(0, 0, N, N).data, ch = new Float32Array(N * N); for (let i = 0; i < N * N; i++) ch[i] = d[4 * i] / 255;
    if (blurPx) blur(ch, N, blurPx); return ch;
  };
  const face = draw(L.face, 1), ridge = draw(L.ridge, 0), line = draw(L.lines, 0, true), glow = draw(L.glow.map(([p]) => p), 1);
  const hgt = new Float32Array(N * N); for (let i = 0; i < N * N; i++) hgt[i] = 0.25 + face[i] * 0.45 + ridge[i] * 0.3 - line[i] * 0.25; blur(hgt, N, 1);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[4 * i] = face[i] * 255; data[4 * i + 1] = Math.max(0, Math.min(1, hgt[i])) * 255; data[4 * i + 2] = glow[i] * 255; data[4 * i + 3] = line[i] * 255; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  return { tex, xf: new THREE.Vector4(0, 0, 1 / map.w, 1 / map.h), size: N };
}
