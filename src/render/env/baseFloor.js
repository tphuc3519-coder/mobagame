import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor } from './noise.js';
import { ROCK_GLSL } from './jungleDecor.js';

// Nền sân nhà kiểu Liên Quân: KHÔNG phải texture phẳng kẻ chỉ mà là các PHIẾN ĐÁ NỔI KHỐI (vát cạnh, hai tầng: phiến + mặt nổi thụt vào)
// xếp thành: hàng phiến cong đồng tâm quanh nhà chính, đài tròn ba tầng có lưỡi xoáy dưới chân nhà chính; hàng phiến cong vắt ngang
// đường từ sân nhà ra trụ nhà (gần trụ thưa dần, sau trụ chỉ còn lác đác phiến vỡ giữa cỏ); gờ viền lượn dọc mép đường; quanh chân mỗi
// trụ là XOÁY LƯỠI ĐÁ cong (như vết quét cọ) nổi trên cỏ. Khe giữa phiến là cỏ/rêu/lá rụng (nền đất bên dưới). Đá xám tím sáng,
// phe Xanh ánh lam, phe Đỏ ánh ấm; chỉ sáng màu đội chạy giữa mặt các hàng phiến quanh nhà chính.

/** Dải nổi theo đường giữa pts ([x,z] thế giới), bề rộng w(t) (t 0..1), khối vát cạnh. y = cao độ đáy. */
function band(pts, wf, { y = 0, depth = 3, bev = 2, bevW = bev * 0.9 } = {}) {
  const n = pts.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
    const w = Math.max(bevW * 2.4 + 1, wf(i / (n - 1))) / 2;
    Lp.push([pts[i][0] + nx * w, pts[i][1] + nz * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - nz * w]);
  }
  const sh = new THREE.Shape(); [...Lp, ...Rp.reverse()].forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bevW, bevelSegments: 2, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y + bev, 0); g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}
/** Phiến hai tầng: phiến dưới + mặt nổi thụt vào (viền bậc → khối rõ nét). trim: cắt bớt hai đầu mặt nổi. */
function plate(pts, wf, out, { inset = 0.66, margin = 20, trim = 0.06, h = 3 } = {}) {
  out.push(band(pts, wf, { y: -1, depth: h, bev: 3, bevW: 9 }));                                  // mép vát rộng → viền tối nhìn rõ từ trên
  const n = pts.length, i0 = Math.round(n * trim), i1 = n - 1 - i0;
  if (i1 - i0 >= 2) { const sub = pts.slice(i0, i1 + 1); out.push(band(sub, (t) => wf((i0 + t * (i1 - i0)) / (n - 1)) * inset - margin, { y: h + 5, depth: 1.5, bev: 2, bevW: 5 })); }
}
/** Mảnh phiến vỡ: đa giác lởm chởm (6–9 đỉnh), vát cạnh, nghiêng nhẹ. */
function shardPlate(cx, cz, R, rot, r, out) {
  const n = 6 + r.int(4), sh = new THREE.Shape();
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2 + r.range(-0.2, 0.2), rr = R * r.range(0.55, 1) * (i % 2 ? 1 : 0.8), x = cx + Math.cos(a) * rr * 1.3, z = cz + Math.sin(a) * rr * 0.8; i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 2.5, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 7, bevelSegments: 2, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, 1.5, 0); g.deleteAttribute('uv'); out.push(g.index ? g.toNonIndexed() : g);
}
const arc = (cx, cz, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const spiral = (cx, cz, r0, r1, a0, sweep, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + sweep * t, r = r0 + (r1 - r0) * t; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
function disc(cx, cz, r, y, depth, bev = 2.5, hole = 0) {
  const sh = new THREE.Shape(); sh.absarc(cx, -cz, r, 0, Math.PI * 2, false);
  if (hole) { const hp = new THREE.Path(); hp.absarc(cx, -cz, hole, 0, Math.PI * 2, true); sh.holes.push(hp); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 64 });
  g.rotateX(-Math.PI / 2); g.translate(0, y + bev, 0); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g;
}

let _m = {};
function floorMat(team) {
  if (_m[team]) return _m[team];
  const m = new THREE.MeshStandardMaterial({ color: team ? 0xf0dcd0 : 0xd6dcf0, roughness: 0.6, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWp, vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'varying vec3 vWp, vWn;\n' + ROCK_GLSL + sh.fragmentShader.replace('#include <map_fragment>', `
      float up = normalize(vWn).y, n1 = rfbm(vWp.xzy / 260.0), n2 = rvn(vWp / 4.5), n3 = rfbm(vWp / 40.0 + 2.0);
      vec3 c = mix(vec3(0.27, 0.255, 0.31), vec3(0.4, 0.385, 0.44), clamp(n1, 0.0, 1.0));                // đá xám tím (tuyến tính)
      c *= 0.92 + n2 * 0.1 + (n3 - 0.5) * 0.16;
      c *= mix(0.32, 1.0, smoothstep(0.55, 0.985, up));                                                  // cạnh vát/thành bên tối → khối rõ
      c *= mix(0.72, 1.0, smoothstep(0.0, 9.0, vWp.y));                                                  // chân phiến sát đất tối
      float moss = smoothstep(0.62, 0.72, rfbm(vWp / 70.0 + 9.0)) * (1.0 - smoothstep(0.3, 0.8, up));
      c = mix(c, vec3(0.07, 0.11, 0.035), moss * 0.6);                                                    // rêu bám thành phiến
      diffuseColor.rgb *= c * 1.35;
      float stH = n3 * 1.0 + n2 * 0.35;`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition), R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
        vec2 dB = vec2(dFdx(stH), dFdy(stH)); normal = normalize(abs(det) * normal - sign(det) * (dB.x * R1 + dB.y * R2)); }`);
  };
  m.customProgramCacheKey = () => 'basefloor' + team;
  return (_m[team] = m);
}

/** Dựng nền sân nhà hai phe. structs: structuresOf(map). onRiver(x,z): điểm nằm trong lòng sông. */
export function buildBaseFloor(map, structs, { onRiver = () => false, dens = 1 } = {}) {
  const g = new THREE.Group(), r = rngFor(919), geos = [[], []], glow = [[], []];
  const towers = structs.filter((s) => s.kind !== 'core'), cores = structs.filter((s) => s.kind === 'core');
  const nearTower = (x, z, R) => towers.some((t) => Math.hypot(x - t.x, z - t.y) < R);
  const inPlay = (x, z) => x > 300 && z > 300 && x < map.w - 300 && z < map.h - 300 && !map.outOfBounds?.(x, z, 40);
  const CORE_R = 1450;
  // —— quanh nhà chính: đài ba tầng + lưỡi xoáy + các hàng phiến cong đồng tâm (chia khúc theo góc) ——
  for (const c of cores) {
    const T = c.team, out = geos[T];
    out.push(disc(c.x, c.y, 600, -1, 3, 3), disc(c.x, c.y, 330, 11, 2.5, 2));
    for (let k = 0; k < 12; k++) { const a0 = (k / 12) * Math.PI * 2; out.push(band(spiral(c.x, c.y, 345, 585, a0, 0.75, 14), (t) => 90 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6), { y: 5, depth: 2, bev: 2, bevW: 5 })); }
    for (const [R, W] of [[700, 150], [880, 150], [1060, 150], [1240, 150], [1410, 120]]) {
      const segA = 300 / R, n = Math.round((Math.PI * 2) / segA);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + (R / 200) * 0.37, a1 = a0 + (Math.PI * 2) / n - 22 / R, am = (a0 + a1) / 2, mx = c.x + Math.cos(am) * R, mz = c.y + Math.sin(am) * R;
        if (!inPlay(mx, mz)) continue;
        plate(arc(c.x, c.y, R, a0, a1, 10), () => W, out, { trim: 0.1 });
        if (R === 880 || R === 1240) glow[T].push(band(arc(c.x, c.y, R, a0 + 30 / R, a1 - 30 / R, 10), () => 7, { y: 9.6, depth: 0.4, bev: 0.3 }));
      }
    }
  }
  // —— xoáy lưỡi đá quanh chân trụ ——
  for (const t of towers) {
    const out = geos[t.team], a00 = r.range(0, 6.3);
    out.push(disc(t.x, t.y, 250, -1, 3, 2.5));
    for (let k = 0; k < 7; k++) { const a0 = a00 + (k / 7) * Math.PI * 2, R1 = r.range(600, 720);
      const sw = r.range(0.8, 0.95), sp = spiral(t.x, t.y, 265, R1, a0, sw, 20), wf = (s) => 170 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.03)), 0.55) * (1 - 0.35 * s);
      plate(sp, wf, out, { inset: 0.58, margin: 12, trim: 0.16 });
      out.push(band(spiral(t.x, t.y, 300, R1 - 40, a0 + 0.05, sw * 0.92, 18), (s) => wf(s) * 0.16, { y: 11, depth: 3, bev: 2.5, bevW: 4 })); } // sống lưỡi nổi
  }
  // —— đường: hàng phiến cong vắt ngang + gờ viền lượn ——
  for (const ln of map.lanes) {
    const P = ln.pts, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = cum[cum.length - 1], at = (s) => { let i = 1; while (i < P.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), tx = (P[i][0] - P[i - 1][0]) / (cum[i] - cum[i - 1] || 1), tz = (P[i][1] - P[i - 1][1]) / (cum[i] - cum[i - 1] || 1); return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, tx, tz }; };
    const sAt = (x, z) => { let best = 0, bd = Infinity; for (let s = 0; s <= total; s += 40) { const p = at(s), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = s; } } return best; };
    const homeB = towers.find((t) => t.id === ln.id + '_home' && t.team === 0), homeR = towers.find((t) => t.id === ln.id + '_home' && t.team === 1);
    const sB = homeB ? sAt(homeB.x, homeB.y) : total * 0.2, sR = homeR ? sAt(homeR.x, homeR.y) : total * 0.8, hw = ln.width / 2 * 0.95;
    for (let s = 0, k = 0; s < total; s += 340, k++) {
      const d = Math.min(s - sB, sR - s), team = s < total / 2 ? 0 : 1;                // d: quá trụ nhà bao xa (âm: còn trong sân nhà)
      const keep = d < -450 ? 1 : d < 100 ? 0.82 : d < 1300 ? 0.55 - 0.4 * (d - 100) / 1200 : 0.1;
      if (r.next() > keep) continue;
      const p = at(s + 170), nx = -p.tz, nz = p.tx;
      if (cores.some((c) => Math.hypot(p.x - c.x, p.z - c.y) < CORE_R + 120) || nearTower(p.x, p.z, 700) || onRiver(p.x, p.z)) continue;
      const sag = (k % 2 ? 1 : -1) * 70;
      if (d > -200) { // phiến vỡ: 1–3 mảnh nhỏ lởm chởm nằm lệch giữa cỏ
        for (let j = 0, m = 1 + r.int(3); j < m; j++) { const o = r.range(-hw * 0.8, hw * 0.8), cx = p.x + nx * o + p.tx * r.range(-80, 80), cz = p.z + nz * o + p.tz * r.range(-80, 80); shardPlate(cx, cz, r.range(70, 150), r.range(0, 6.3), r, geos[team]); }
        continue;
      }
      const pts = Array.from({ length: 13 }, (_, i) => { const o = -hw + 2 * hw * i / 12, q = o / hw, bow = sag * (1 - q * q); return [p.x + nx * o + p.tx * bow, p.z + nz * o + p.tz * bow]; });
      plate(pts, () => 290, geos[team], { trim: 0.03, margin: 18 });
    }
    // gờ viền lượn hai mép (chỉ đoạn trong sân nhà)
    for (const [s0, s1, team] of [[CORE_R * 0.9, sB - 300, 0], [sR + 300, total - CORE_R * 0.9, 1]]) for (const sd of [-1, 1]) {
      for (let s = s0; s < s1 - 200; s += 760) {
        const e = Math.min(s1, s + 680), pts = []; for (let q = s; q <= e; q += 40) { const p = at(q); const off = sd * (hw + 40 + 14 * Math.sin(q / 170)); pts.push([p.x - p.tz * off, p.z + p.tx * off]); }
        if (pts.length > 3 && !nearTower(pts[pts.length >> 1][0], pts[pts.length >> 1][1], 640)) plate(pts, (t) => 64 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.4), geos[team], { inset: 0.55, margin: 8, trim: 0.08, h: 6 });
      }
    }
  }
  for (const T of [0, 1]) {
    if (geos[T].length) { const m = new THREE.Mesh(mergeGeometries(geos[T]), floorMat(T)); m.receiveShadow = true; m.castShadow = false; g.add(m); }
    if (glow[T].length) g.add(new THREE.Mesh(mergeGeometries(glow[T]), new THREE.MeshBasicMaterial({ color: new THREE.Color(T ? 0xff6a3a : 0x5ac0ff).multiplyScalar(1.3) })));
  }
  void dens;
  return g;
}
