import * as THREE from 'three';
import { rngFor } from './noise.js';

// Họa tiết nền sân nhà kiểu Liên Quân — PHÙ ĐIÊU THẤP vẽ vào nền (không có hình học nổi): các phiến/nét đá quét cọ thon nhọn xếp lớp
// như cánh hoa xoáy quanh chân trụ (bậc đế 2 tầng), sân đá liền quanh nhà chính với các bậc thềm cong chia khúc, đường trong sân nhà lát
// phiến cong (gần trụ nhà lẫn cỏ, sau đó cỏ là chính, lác đác nét đá dọc mép). Vẽ thành texture phủ cả bản đồ:
//   R = mặt đá (làm mờ → ngưỡng trong shader cho mép SẮC ở mọi độ phóng), G/B = độ cao 16 bit (mỗi phiến vòm tròn, phiến xếp lớp chồng
//   cao thấp), A = rãnh khắc (gân phiến, khe bậc thềm). Shader nền (ground.js) tô đá theo độ dốc ↔ hướng nắng, bóng đổ + AO lên cỏ.

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

/** Bố cục: danh sách lệnh vẽ { pts, wf, lv, dome, vein? } (phiến vòm) và lines ([đường, bề rộng, khép?]) rãnh khắc. */
function layout(map, structs, onRiver) {
  const r = rngFor(919), plates = [], lines = [];
  const towers = structs.filter((s) => s.kind !== 'core'), cores = structs.filter((s) => s.kind === 'core');
  const inPlay = (x, z) => x > 300 && z > 300 && x < map.w - 300 && z < map.h - 300 && !map.outOfBounds?.(x, z, 40);
  const add = (pts, wf, lv, dome = 0.1, vein = null) => plates.push({ pts, wf, lv, dome, vein });
  const disc = (cx, cz, R, lv, dome = 0.04) => add(arc(cx, cz, R * 0.5, 0, Math.PI * 2, 72), () => R, lv, dome);   // vành tròn rộng R quanh tâm (dải khép kín bán kính R/2, rộng R)
  const petalW = (W) => (t) => W * Math.min(1, t / 0.1) * Math.min(1, 1.3 * Math.pow(1 - t, 0.8));
  const CORE_R = 1550;
  for (const c of cores) {
    disc(c.x, c.y, CORE_R, 0.24, 0.0);                                                   // sân đá liền
    for (const [R0, R1, lv] of [[640, 820, 0.42], [860, 1040, 0.38], [1080, 1260, 0.34], [1300, 1480, 0.3]]) {           // bậc thềm cong chia khúc
      const R = (R0 + R1) / 2, W = R1 - R0, n = Math.max(5, Math.round((Math.PI * 2 * R) / 620)), off = R * 0.0017;
      for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2 + off, a1 = a0 + (Math.PI * 2) / n - 46 / R, am = (a0 + a1) / 2;
        if (!inPlay(c.x + Math.cos(am) * R, c.y + Math.sin(am) * R)) continue;
        add(arc(c.x, c.y, R, a0, a1, 18), () => W, lv, 0.05); lines.push([arc(c.x, c.y, R + W * 0.22, a0 + 60 / R, a1 - 60 / R, 18), 14, false]); }
    }
    disc(c.x, c.y, 600, 0.48, 0.03); disc(c.x, c.y, 430, 0.56, 0.03);                    // đài hai tầng
    for (let k = 0; k < 12; k++) lines.push([spiral(c.x, c.y, 250, 560, (k / 12) * Math.PI * 2, 0.9, 20), 16, false]);     // xoáy khắc trên đài
    for (let k = 0; k < 16; k++) { const a0 = (k / 16) * Math.PI * 2 + 0.15, p = spiral(c.x, c.y, 1440, 1950, a0, 0.6, 22, 20);   // nét cọ bao ngoài
      if (inPlay(p[11][0], p[11][1])) add(p, petalW(230), 0.27, 0.12, 0.3); }
  }
  for (const t of towers) { // xoáy cánh phiến quanh chân trụ
    const a00 = r.range(0, 6.3), K = 6;
    disc(t.x, t.y, 470, 0.3, 0.04); disc(t.x, t.y, 330, 0.4, 0.04);
    for (let k = 0; k < K; k++) {
      const a0 = a00 + (k / K) * Math.PI * 2, R1 = r.range(820, 960);
      add(spiral(t.x, t.y, 470, R1 * 0.86, a0 + 0.42, 1.05, 24), petalW(130), 0.24, 0.1);            // cánh phụ (lớp dưới)
      add(spiral(t.x, t.y, 360, R1, a0, 1.25, 28), petalW(215), 0.3, 0.13, 0.32);                     // cánh chính (lớp trên)
    }
  }
  for (const ln of map.lanes) { // đường: sân nhà lát phiến cong → quanh trụ nhà lẫn cỏ → sau đó cỏ, nét đá dọc mép
    const P = ln.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = cum[cum.length - 1], at = (s) => { let i = 1; while (i < P.length - 1 && cum[i] < s) i++; const L = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / L; return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, tx: (P[i][0] - P[i - 1][0]) / L, tz: (P[i][1] - P[i - 1][1]) / L }; };
    const sAt = (x, z) => { let best = 0, bd = Infinity; for (let s = 0; s <= total; s += 40) { const p = at(s), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = s; } } return best; };
    const hB = towers.find((t) => t.id === ln.id + '_home' && t.team === 0), hR = towers.find((t) => t.id === ln.id + '_home' && t.team === 1);
    const sB = hB ? sAt(hB.x, hB.y) : total * 0.2, sR = hR ? sAt(hR.x, hR.y) : total * 0.8, hw = ln.width / 2;
    for (const [s0, s1] of [[0, sB - 650], [sR + 650, total]]) { const pts = []; for (let s = s0; s <= s1; s += 60) { const p = at(s); pts.push([p.x, p.z]); } if (pts.length > 1) add(pts, () => ln.width * 1.06, 0.24, 0.0); } // sân đá liền dọc đường
    for (let s = 0, k = 0; s < total; s += 420, k++) {
      const d = Math.min(s - sB, sR - s), p = at(s + 210), nx = -p.tz, nz = p.tx;
      if (cores.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < CORE_R + 150) || towers.some((t) => Math.hypot(p.x - t.x, p.z - t.y) < 1000) || onRiver(p.x, p.z)) continue;
      if (d < 450) { // phiến cong vắt ngang (gần trụ nhà thì thưa, khe rộng hơn để lộ cỏ)
        if (d > -700 && r.next() < 0.35) continue;
        const sag = (k % 2 ? 1 : -1) * 100, pt = (o) => { const q = o / hw; return [p.x + nx * o + p.tx * sag * (1 - q * q), p.z + nz * o + p.tz * sag * (1 - q * q)]; };
        const pts = Array.from({ length: 17 }, (_, i) => pt(-hw * 0.98 + 1.96 * hw * i / 16));
        add(pts, () => (d > -700 ? 300 : 360), d > -700 ? 0.3 : 0.32, 0.05); lines.push([pts.slice(2, -2), 14, false]);
      } else if (r.next() < (d < 2200 ? 0.45 : 0.16)) { // nét đá thon dọc mép đường
        const sd = r.next() < 0.5 ? -1 : 1, L = r.range(520, 820), pts = [];
        for (let i = 0; i <= 16; i++) { const q = at(s + (i / 16) * L), o = sd * (hw * r.range(0.86, 0.9) - 60 * Math.sin(Math.PI * i / 16)); pts.push([q.x - q.tz * o, q.z + q.tx * o]); }
        if (!onRiver(pts[8][0], pts[8][1])) add(sd > 0 ? pts : pts.reverse(), petalW(150), 0.27, 0.12, 0.3);
      }
    }
  }
  return { plates, lines };
}

function blur(a, n, rr) {
  const tmp = new Float32Array(n * n), inv = 1 / (2 * rr + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < n; y++) { const o = y * n; let acc = 0; for (let k = -rr; k <= rr; k++) acc += a[o + Math.min(n - 1, Math.max(0, k))]; for (let x = 0; x < n; x++) { tmp[o + x] = acc * inv; acc += a[o + Math.min(n - 1, x + rr + 1)] - a[o + Math.max(0, x - rr)]; } }
    for (let x = 0; x < n; x++) { let acc = 0; for (let k = -rr; k <= rr; k++) acc += tmp[Math.min(n - 1, Math.max(0, k)) * n + x]; for (let y = 0; y < n; y++) { a[y * n + x] = acc * inv; acc += tmp[Math.min(n - 1, y + rr + 1) * n + x] - tmp[Math.max(0, y - rr) * n + x]; } }
  }
}

/** Texture họa tiết phủ cả bản đồ: { tex, xf: vec4(x0, z0, 1/w, 1/h), size, texel (đơn vị thế giới / texel) }. */
export function basePattern(map, structs, { onRiver = () => false, size = 3072 } = {}) {
  const N = size, L = layout(map, structs, onRiver), s = N / map.w;
  const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.setTransform(s, 0, 0, s, 0, 0); g.lineJoin = g.lineCap = 'round'; return g; };
  const path = (g, p, closed = true) => { g.beginPath(); p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); if (closed) g.closePath(); };
  const read = (g, rr) => { const d = g.getImageData(0, 0, N, N).data, ch = new Float32Array(N * N); for (let i = 0; i < N * N; i++) ch[i] = d[4 * i] / 255; if (rr) blur(ch, N, rr); return ch; };
  const gm = canvas(), gh = canvas(), gl = canvas(); gm.fillStyle = '#fff'; gh.globalCompositeOperation = 'lighten'; gl.strokeStyle = '#fff';
  for (const { pts, wf, lv, dome, vein } of L.plates) {
    path(gm, ribbon(pts, wf)); gm.fill();
    for (let k = 0; k < 3; k++) { const sc = 1 - k * 0.12, v = Math.round((lv + dome * Math.min(1, k / 2)) * 255); gh.fillStyle = `rgb(${v},${v},${v})`; path(gh, ribbon(pts, (t) => wf(t) * sc)); gh.fill(); } // vòm tròn: chồng đường đồng mức
    if (vein) { const n = pts.length, i1 = Math.round(n * 0.78), side = []; for (let i = 1; i < i1; i++) { const a = pts[i - 1], b = pts[i + 1], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, w = wf(i / (n - 1)) * vein; side.push([pts[i][0] - tz / l * w, pts[i][1] + tx / l * w]); } gl.lineWidth = 14; path(gl, side, false); gl.stroke(); }
  }
  for (const [p, w, closed] of L.lines) { gl.lineWidth = w; path(gl, p, closed); gl.stroke(); }
  const mask = read(gm, 2), line = read(gl, 1), hgt = read(gh, 4);
  for (let i = 0; i < N * N; i++) hgt[i] = Math.max(0, hgt[i] - line[i] * 0.05);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { const h = Math.min(65535, Math.round(hgt[i] * 65535)); data[4 * i] = mask[i] * 255; data[4 * i + 1] = h >> 8; data[4 * i + 2] = h & 255; data[4 * i + 3] = line[i] * 255; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  const cs = structs.filter((q) => q.kind === 'core');
  return { tex, xf: new THREE.Vector4(0, 0, 1 / map.w, 1 / map.h), size: N, texel: map.w / N, cores: new THREE.Vector4(cs[0]?.x ?? -1e6, cs[0]?.y ?? -1e6, cs[1]?.x ?? -1e6, cs[1]?.y ?? -1e6) };
}
