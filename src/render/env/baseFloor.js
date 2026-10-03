import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor } from './noise.js';
import { ROCK_GLSL } from './jungleDecor.js';
import { grassSurface, noiseSurface } from './surfaces.js';

// Nền sân nhà kiểu Liên Quân (mềm, có chiều sâu): các NÉT ĐÁ QUÉT CỌ dài uốn lượn và phiến cong THẤP, CHÌM trong cỏ —
// chân phiến tan dần vào cỏ (shader lấy chính texture cỏ của nền ở phần thấp/sườn phiến), tương phản thấp, tông lam xám hài hoà
// với cỏ; quanh mỗi phiến nướng sẵn quầng tối mềm xuống nền (AO, qua footprints → bản trộn nền) nên phiến như ngồi lún trong đất.
// Bố cục: quanh nhà chính — đài tròn chìm + nét xoáy, ba bậc thềm cong lớn, các nét cọ lượn bao ngoài; đường trong sân nhà — phiến
// cong lớn vắt ngang (khe hẹp) thưa dần quanh trụ nhà, sau trụ chỉ còn mảnh vỡ lác đác; quanh chân MỌI trụ — xoáy 9 nét cọ dài.

const FP = [];   // footprints (đa giác [x,z]) để nướng quầng tối mềm xuống nền
/** Dải nổi theo đường giữa pts ([x,z]), bề rộng w(t); vát rộng, thấp. */
function band(pts, wf, { y = 0, depth = 1.5, bev = 2, bevW = 10, ao = true } = {}) {
  const n = pts.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
    const w = Math.max(bevW * 2.2 + 1, wf(i / (n - 1))) / 2;
    Lp.push([pts[i][0] + nx * w, pts[i][1] + nz * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - nz * w]);
  }
  const ring = [...Lp, ...Rp.reverse()]; if (ao) FP.push(ring);
  const sh = new THREE.Shape(); ring.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bevW, bevelSegments: 3, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y + bev, 0); g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}
/** Phiến hai tầng thấp: phiến dưới chìm + mặt nổi thụt vào. */
function plate(pts, wf, out, { inset = 0.7, margin = 24, trim = 0.06 } = {}) {
  out.push(band(pts, wf, { y: -3, depth: 1.5, bev: 2.5, bevW: 14 }));
  const n = pts.length, i0 = Math.round(n * trim), i1 = n - 1 - i0;
  if (i1 - i0 >= 2) out.push(band(pts.slice(i0, i1 + 1), (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * inset - margin, { y: 2.5, depth: 0.8, bev: 1.5, bevW: 8, ao: false }));
}
/** Nét cọ: dải thon hai đầu (lên nhanh, kéo dài thon), có gân nổi mảnh giữa. */
function stroke(pts, W, out) {
  const wf = (t) => W * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(t, 0.75) * 1.02)), 0.7);
  out.push(band(pts, wf, { y: -4, depth: 1.5, bev: 3.5, bevW: 18 }));
  const n = pts.length, i0 = Math.round(n * 0.1), i1 = n - 1 - Math.round(n * 0.18);
  out.push(band(pts.slice(i0, i1 + 1), (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * 0.34, { y: 3.5, depth: 1.5, bev: 2.5, bevW: 9, ao: false }));
}
function shard(cx, cz, R, rot, r, out) {
  const n = 6 + r.int(4), ring = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2 + r.range(-0.2, 0.2), rr = R * r.range(0.55, 1) * (i % 2 ? 1 : 0.8); ring.push([cx + Math.cos(a) * rr * 1.3, cz + Math.sin(a) * rr * 0.8]); }
  FP.push(ring); const sh = new THREE.Shape(); ring.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: 2, bevelSize: 10, bevelSegments: 3, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, -1, 0); g.deleteAttribute('uv'); out.push(g.index ? g.toNonIndexed() : g);
}
const arc = (cx, cz, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const spiral = (cx, cz, r0, r1, a0, sweep, n = 24, wob = 0) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + sweep * t, r = r0 + (r1 - r0) * Math.pow(t, 0.85) + wob * Math.sin(t * Math.PI * 2); return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
function disc(cx, cz, r, y, out) {
  const sh = new THREE.Shape(); sh.absarc(cx, -cz, r, 0, Math.PI * 2, false); FP.push(arc(cx, cz, r, 0, Math.PI * 2, 48));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 16, bevelSegments: 3, curveSegments: 64 });
  g.rotateX(-Math.PI / 2); g.translate(0, y + 2.5, 0); g.deleteAttribute('uv'); out.push(g.index ? g.toNonIndexed() : g);
}

const _m = {};
function floorMat(team) {
  if (_m[team]) return _m[team];
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  const U = { uGrass: { value: grassSurface() }, uNoise: { value: noiseSurface() }, uTint: { value: new THREE.Color(team ? 0xe6d6d0 : 0xd0d8ea) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vWp, vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'uniform sampler2D uGrass, uNoise; uniform vec3 uTint; varying vec3 vWp, vWn;\n' + ROCK_GLSL + sh.fragmentShader.replace('#include <map_fragment>', `
      float up = normalize(vWn).y, n1 = rfbm(vWp / 300.0), n2 = rvn(vWp / 5.0), n3 = rfbm(vWp / 45.0 + 2.0);
      vec3 st = mix(vec3(0.25, 0.255, 0.29), vec3(0.37, 0.375, 0.41), clamp(n1, 0.0, 1.0)) * uTint;      // đá lam xám dịu (tuyến tính)
      st *= 0.93 + n2 * 0.08 + (n3 - 0.5) * 0.12;
      st *= mix(0.55, 1.0, smoothstep(0.45, 0.985, up)) * (0.86 + 0.2 * smoothstep(1.0, 7.0, vWp.y));   // sườn tối, gân/mặt cao sáng                                                     // sườn tối nhẹ (tương phản thấp)
      // cỏ của nền (cùng texture, cùng tỉ lệ) lấn lên chân và sườn phiến → mép tan vào cỏ
      vec3 gr = texture2D(uGrass, vWp.xz / 540.0).rgb * 0.9 * mix(vec3(0.78, 0.88, 0.74), vec3(1.14, 1.08, 0.8), smoothstep(0.25, 0.75, texture2D(uNoise, vWp.xz / 2800.0).r));
      float edge = 1.0 - smoothstep(-1.0, 4.5, vWp.y + (n3 - 0.5) * 7.0 + (rvn(vWp / 9.0) - 0.5) * 3.0);
      float creep = smoothstep(0.58, 0.7, rfbm(vWp / 60.0 + 4.0)) * (1.0 - smoothstep(0.85, 0.99, up)) * 0.7; // rêu cỏ bò lên sườn
      vec3 c = mix(st, gr * 0.85, clamp(edge + creep, 0.0, 1.0));
      c = mix(c, gr * 0.6, 0.12);                                                                          // ám màu cỏ cho hài hoà
      diffuseColor.rgb = c;
      float stH = n3 * 0.8 + n2 * 0.25;`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition), R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
        vec2 dB = vec2(dFdx(stH), dFdy(stH)); normal = normalize(abs(det) * normal - sign(det) * (dB.x * R1 + dB.y * R2)); }`);
  };
  m.customProgramCacheKey = () => 'basefloor2';
  return (_m[team] = m);
}

/** Dựng nền sân nhà hai phe. Trả group; group.userData.footprints = đa giác chân phiến (để nướng quầng tối mềm vào nền). */
export function buildBaseFloor(map, structs, { onRiver = () => false } = {}) {
  FP.length = 0;
  const g = new THREE.Group(), r = rngFor(919), geos = [[], []], glow = [[], []];
  const towers = structs.filter((s) => s.kind !== 'core'), cores = structs.filter((s) => s.kind === 'core');
  const nearTower = (x, z, R) => towers.some((t) => Math.hypot(x - t.x, z - t.y) < R);
  const inPlay = (x, z) => x > 300 && z > 300 && x < map.w - 300 && z < map.h - 300 && !map.outOfBounds?.(x, z, 40);
  const CORE_R = 1500;
  for (const c of cores) { // —— sân nhà chính ——
    const out = geos[c.team];
    disc(c.x, c.y, 560, 0, out);
    for (let k = 0; k < 10; k++) stroke(spiral(c.x, c.y, 300, 560, (k / 10) * Math.PI * 2, 1.0, 20), 110, out);
    for (const [R, W, segL] of [[760, 200, 640], [990, 200, 700], [1220, 190, 760]]) {
      const n = Math.max(3, Math.round((Math.PI * 2 * R) / segL));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + R * 0.0013, a1 = a0 + (Math.PI * 2) / n - 26 / R, am = (a0 + a1) / 2;
        if (!inPlay(c.x + Math.cos(am) * R, c.y + Math.sin(am) * R)) continue;
        plate(arc(c.x, c.y, R, a0, a1, 16), () => W, out, { trim: 0.07 });
        if (R === 990) glow[c.team].push(band(arc(c.x, c.y, R, a0 + 40 / R, a1 - 40 / R, 16), () => 5, { y: 3.6, depth: 0.3, bev: 0.3, bevW: 1, ao: false }));
      }
    }
    for (let k = 0; k < 14; k++) { const a0 = (k / 14) * Math.PI * 2 + 0.2; const p = spiral(c.x, c.y, 1360, 1700, a0, 0.55, 18, 30); if (inPlay(p[9][0], p[9][1])) stroke(p, 150, out); }
  }
  for (const t of towers) { // —— xoáy nét cọ quanh chân trụ ——
    const out = geos[t.team], a00 = r.range(0, 6.3);
    disc(t.x, t.y, 240, 0, out);
    for (let k = 0; k < 9; k++) { const a0 = a00 + (k / 9) * Math.PI * 2, R1 = r.range(720, 980); stroke(spiral(t.x, t.y, 250, R1, a0, r.range(1.25, 1.7), 26, r.range(-25, 25)), r.range(115, 165), out); }
  }
  for (const ln of map.lanes) { // —— đường trong sân nhà ——
    const P = ln.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = cum[cum.length - 1], at = (s) => { let i = 1; while (i < P.length - 1 && cum[i] < s) i++; const L = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / L; return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, tx: (P[i][0] - P[i - 1][0]) / L, tz: (P[i][1] - P[i - 1][1]) / L }; };
    const sAt = (x, z) => { let best = 0, bd = Infinity; for (let s = 0; s <= total; s += 40) { const p = at(s), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = s; } } return best; };
    const hB = towers.find((t) => t.id === ln.id + '_home' && t.team === 0), hR = towers.find((t) => t.id === ln.id + '_home' && t.team === 1);
    const sB = hB ? sAt(hB.x, hB.y) : total * 0.2, sR = hR ? sAt(hR.x, hR.y) : total * 0.8, hw = ln.width / 2 * 0.96;
    for (let s = 0, k = 0; s < total; s += 380, k++) {
      const d = Math.min(s - sB, sR - s), team = s < total / 2 ? 0 : 1;
      const keep = d < -450 ? 1 : d < 100 ? 0.8 : d < 1300 ? 0.5 - 0.38 * (d - 100) / 1200 : 0.08;
      if (r.next() > keep) continue;
      const p = at(s + 190), nx = -p.tz, nz = p.tx;
      if (cores.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < CORE_R) || nearTower(p.x, p.z, 900) || onRiver(p.x, p.z)) continue;
      if (d > -200) { for (let j = 0, m = 1 + r.int(2); j < m; j++) { const o = r.range(-hw * 0.8, hw * 0.8); shard(p.x + nx * o + p.tx * r.range(-90, 90), p.z + nz * o + p.tz * r.range(-90, 90), r.range(80, 160), r.range(0, 6.3), r, geos[team]); } continue; }
      const sag = (k % 2 ? 1 : -1) * 90;
      plate(Array.from({ length: 15 }, (_, i) => { const o = -hw + 2 * hw * i / 14, q = o / hw, bow = sag * (1 - q * q); return [p.x + nx * o + p.tx * bow, p.z + nz * o + p.tz * bow]; }), () => 345, geos[team], { trim: 0.04 });
    }
  }
  for (const T of [0, 1]) {
    if (geos[T].length) { const m = new THREE.Mesh(mergeGeometries(geos[T]), floorMat(T)); m.receiveShadow = true; g.add(m); }
    if (glow[T].length) g.add(new THREE.Mesh(mergeGeometries(glow[T]), new THREE.MeshBasicMaterial({ color: new THREE.Color(T ? 0xff7a4a : 0x6ac8ff), transparent: true, opacity: 0.7 })));
  }
  g.userData.footprints = FP.slice();
  return g;
}
