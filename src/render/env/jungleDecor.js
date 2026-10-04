import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildGrass } from './grass.js';
import { fbm, rngFor } from './noise.js';
import { scatter } from './foliage.js';
import { flagstoneSurface, wallStoneSurface, strataSurface } from './surfaces.js';
import { plazaTexture } from './laneDecor.js';
import { MONSTERS } from '../../data/jungle.js';

// Bệ đá kiểu tảng đá tự nhiên (tham khảo các khối đá rêu trong rừng): mỗi đoạn tường là cụm tảng đá tròn gồ ghề xám lam,
// mặt trên phủ rêu + cỏ/dương xỉ; và "lãnh thổ" của từng trại quái: bệ đá tròn lát phiến, viền đá, đầm sen (Long Ngư), đài sấm (Hổ Lôi).

const ROCK_HI = new THREE.Color(0x6c7484), ROCK_LO = new THREE.Color(0x363c48), ROCK_DK = new THREE.Color(0x1a1d24), MOSS = new THREE.Color(0x4a7330), TOPG = new THREE.Color(0x3d6a2a);
/** Tô màu đá kiểu Liên Quân: xám lam sáng ở mặt ngửa, tối dần xuống chân (giả che khuất), vân lớp ngang, rêu loang trên vai đá. */
function rockColor(c, x, y, z, ny, h01, seed) {
  const v = fbm(x * 0.004 + seed, z * 0.004 + y * 0.003, 3), strata = 0.5 + 0.5 * Math.sin(y * 0.06 + v * 6);
  c.copy(ROCK_LO).lerp(ROCK_HI, Math.min(1, 0.25 + h01 * 0.55 + Math.max(0, ny) * 0.35 + (v - 0.5) * 0.3));
  c.multiplyScalar(0.92 + strata * 0.1);
  c.lerp(ROCK_DK, Math.max(0, 0.35 - h01) * 0.9);                              // chân đá tối
  if (ny > 0.35 && v > 0.48) c.lerp(MOSS, Math.min(0.75, (ny - 0.35) * 1.6) * (v - 0.48) * 3);
  return c;
}

/** Tảng đá tròn mượt (bán kính 1): ít mặt gồ, bóng mượt — không còn kiểu khối gãy cạnh. */
function boulderGeo(seed) {
  const g0 = new THREE.IcosahedronGeometry(1, 3); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
  const g = mergeVertices(g0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 0.9 + seed, z * 0.9 + y * 0.7 + seed * 0.37, 3) - 0.5) * 0.55;
    p.setXYZ(i, x * k * (1 + Math.max(0, -y) * 0.08), Math.max(-0.2, y * k * (y > 0 ? 0.82 : 0.5)), z * k);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const ao = (0.45 + 0.55 * Math.min(1, Math.max(0, p.getY(i) + 0.2) / 0.7)) * (n.getY(i) < 0 ? 1 + n.getY(i) * 0.3 : 1); col.set([ao, ao, ao], 3 * i); } void c; void rockColor; // chỉ che khuất — vân do vật liệu đá
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Bệ đá TRÒN NHẴN liền khối (kiểu đá cuội lớn mài nhẵn): mặt bằng là capsule bo tròn hai đầu, mặt cắt phồng (rộng nhất ở lưng chừng,
 *  đỉnh vòm tròn), sống lưng nhấp nhô thành vài tảng liền nhau; biến dạng nhiễu nhỏ theo pháp tuyến cho tự nhiên. Màu đỉnh chỉ mang
 *  độ che khuất (tối ở chân) — vân đá/hạt/độ nhám do vật liệu ROCK quyết định. */
function roundRockGeo(w, H, seed) {
  const hw = (w.w ?? 110) / 2, ax = w.x1, az = w.y1, bx = w.x2, bz = w.y2, L = Math.hypot(bx - ax, bz - az) || 1;
  const ang = Math.atan2(bz - az, bx - ax), cx = (ax + bx) / 2, cz = (az + bz) / 2, half = L / 2 + hw * 0.85;
  const NS = Math.max(24, Math.ceil((half * 2) / 22)), NP = 34, P = [], I = [], p = 3.2, f0 = -0.14;
  for (let i = 0; i <= NS; i++) {
    const t = (i / NS) * 2 - 1, sv = Math.sin(t * Math.PI / 2), X = sv * half, e = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(sv), p)), 1 / p);
    const lump = 0.66 + 0.62 * fbm(X / 300 + seed * 3.1, seed, 3), Hs = H * Math.pow(e, 0.55) * lump, Ws = hw * e * (0.84 + 0.3 * fbm(X / 260 + seed, seed + 4, 2));
    for (let j = 0; j <= NP; j++) {
      const f = f0 + (j / NP) * (Math.PI - 2 * f0), cf = Math.cos(f), sf = Math.sin(f);
      const z = Ws * Math.sign(cf) * Math.pow(Math.abs(cf), 0.62) * (0.94 + 0.1 * Math.max(0, sf)), y = Hs * Math.sign(sf) * Math.pow(Math.abs(sf), 0.8);
      P.push(X, y, z);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) { const a = i * (NP + 1) + j, b = a + NP + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  g.rotateY(-ang); g.translate(cx, -5, cz); g = mergeVertices(g, 0.5); g.computeVertexNormals();
  { const mid = Math.floor(NS / 2) * (NP + 1) + Math.floor(NP / 2); if (g.attributes.normal.getY(Math.min(mid, g.attributes.normal.count - 1)) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const q = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = q; } g.computeVertexNormals(); } }
  const q = g.attributes.position, n = g.attributes.normal, amp = Math.min(hw, H) * 0.16;
  for (let i = 0; i < q.count; i++) { // gồ nhẹ theo pháp tuyến (2 tầng nhiễu)
    const X = q.getX(i), Y = q.getY(i), Z = q.getZ(i);
    if (Y < 0) continue;
    const d = (fbm(X / 260 + seed, Z / 260 + Y / 300, 3) - 0.5) * amp * 2 + (fbm(X / 70 + 9, Z / 70 + Y / 80 + seed, 2) - 0.5) * amp * 0.3;
    q.setXYZ(i, X + n.getX(i) * d, Y + n.getY(i) * d * 0.7, Z + n.getZ(i) * d);
  }
  g.computeVertexNormals();
  // tảng phụ dính liền thân (phá dáng ống đều): 1–4 tảng tròn ghé hai bên/hai đầu, lún một phần xuống đất
  const rr = rngFor(Math.floor(seed * 1000) + 7), parts = [g], nb = Math.min(4, 1 + Math.floor(L / 420)), ux = Math.cos(ang), uz = Math.sin(ang);
  for (let k = 0; k < nb; k++) {
    const t = rr.range(-0.5, 0.5) * L, sd = rr.next() < 0.5 ? -1 : 1, sc = Math.min(hw, H) * rr.range(0.45, 0.75);
    const b = boulderGeo(seed * 13 + k * 3.7).clone(); b.scale(sc * rr.range(1.1, 1.6), sc * rr.range(0.8, 1.15), sc * rr.range(1.0, 1.3)); b.rotateY(rr.range(0, 7));
    b.translate(cx + ux * t - uz * sd * hw * rr.range(0.55, 0.85), -sc * 0.15, cz + uz * t + ux * sd * hw * rr.range(0.55, 0.85));
    parts.push(b);
  }
  const tops = []; // mẫu đỉnh để cắm cỏ trên đá
  for (let i = 1; i < NS; i += 2) { const k = i * (NP + 1) + Math.floor(NP / 2); if (k < q.count) tops.push([q.getX(k), q.getY(k), q.getZ(k)]); }
  const col = new Float32Array(q.count * 3);
  for (let i = 0; i < q.count; i++) { // chỉ che khuất: tối ở chân + mặt úp xuống
    const Y = q.getY(i), ny = n.getY(i), ao = (0.42 + 0.58 * Math.min(1, Math.max(0, Y + 5) / (H * 0.55))) * (ny < 0 ? 1 + ny * 0.35 : 1);
    col.set([ao, ao, ao], 3 * i);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const out = mergeGeometries(parts.map((x) => { const y = x.index ? x : x; for (const a of Object.keys(y.attributes)) if (!['position', 'normal', 'color'].includes(a)) y.deleteAttribute(a); return y; }));
  out.userData.tops = tops;
  return out;
}

/** Vật liệu đá thật (dùng chung mọi khối đá): đá phiến xám lam mài nhẵn — vân lớp lượn sóng (vằn) theo độ cao bị nhiễu bẻ cong,
 *  gân thạch anh mảnh sáng/tối (nhiễu gợn), hạt mịn, loang màu ấm/lạnh; bề mặt có gồ + gân lõm (bump từ nhiễu 3D toạ độ thế giới),
 *  độ nhám thay đổi (chỗ mài bóng phản chiếu trời nhẹ). Màu đỉnh = che khuất. */
let _rf = null;
const ROCK_GLSL = `
  float rh3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
  float rvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(rh3(i), rh3(i + vec3(1,0,0)), f.x), mix(rh3(i + vec3(0,1,0)), rh3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(rh3(i + vec3(0,0,1)), rh3(i + vec3(1,0,1)), f.x), mix(rh3(i + vec3(0,1,1)), rh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float rfbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * rvn(p); p = p * 2.03 + 17.7; a *= 0.5; } return s / 0.9375; }
`;
const ROCK_FACET = () => (_rf ||= (() => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWp, vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wq = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wq = instanceMatrix * wq;
      #endif
      vWp = (modelMatrix * wq).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = 'varying vec3 vWp, vWn;\n' + ROCK_GLSL + sh.fragmentShader.replace('#include <map_fragment>', `
      vec3 wp = vWp;
      float wA = rfbm(wp / 380.0), wB = rfbm(wp / 95.0 + 3.1);
      float yy = wp.y + wA * 150.0 + wB * 22.0;                                          // vân lớp bị bẻ cong
      float bands = 0.5 + 0.5 * sin(yy * 0.052 + wA * 4.0), bands2 = 0.5 + 0.5 * sin(yy * 0.17 + wB * 3.0);
      float vn1 = abs(rfbm(wp / 210.0 + 7.3) - 0.5), vn2 = abs(rfbm(wp / 60.0 + 1.7) - 0.5);
      float vein = smoothstep(0.012, 0.0, vn1), veinD = smoothstep(0.012, 0.0, vn2) * 0.6;   // gân thạch anh sáng + gân tối mảnh
      float grain = rvn(wp / 2.2) * 0.5 + rvn(wp / 5.5) * 0.5, blot = rfbm(wp / 520.0 + 11.0);
      vec3 slate = vec3(0.085, 0.097, 0.13), light = vec3(0.23, 0.24, 0.27), warm = vec3(0.21, 0.18, 0.15);
      vec3 rc = mix(slate, light, clamp(bands * 0.7 + bands2 * 0.22 - 0.12 + (blot - 0.5) * 0.5, 0.0, 1.0));
      rc = mix(rc, warm, smoothstep(0.55, 0.8, blot) * 0.45);
      rc *= 0.9 + grain * 0.2;
      rc = mix(rc, vec3(0.36, 0.37, 0.4), vein * 0.3);
      rc *= 1.0 - veinD * 0.3;
      float up = normalize(vWn).y;
      rc *= 1.0 + smoothstep(0.55, 0.95, up) * 0.12;                                       // mặt trên đón sáng, bụi nhạt
      float crk = abs(rfbm(wp / 150.0 + 5.5) - 0.5), crack = smoothstep(0.016, 0.003, crk) * smoothstep(0.42, 0.62, rfbm(wp / 420.0 + 2.0)); // khe nứt sâu từng vùng
      rc *= 1.0 - crack * 0.7;
      float mossN = rfbm(wp / 170.0 + 9.0) * 0.75 + rvn(wp / 16.0) * 0.25;
      float mEdge = rvn(wp / 2.0) * 0.06;                                                     // mép rêu lởm chởm, sắc
      float moss = smoothstep(0.55, 0.85, up) * smoothstep(0.5, 0.53, mossN + mEdge)          // rêu trên đỉnh
                 + smoothstep(45.0, 4.0, wp.y) * smoothstep(0.58, 0.61, mossN + mEdge) * 0.7; // rêu ẩm ở chân
      moss = clamp(moss, 0.0, 1.0);
      vec3 mossC = mix(vec3(0.035, 0.07, 0.02), vec3(0.10, 0.16, 0.035), rvn(wp / 3.5) * 0.6 + rvn(wp / 11.0) * 0.4);
      rc = mix(rc, mossC, moss * 0.88);
      rc *= 1.0 - smoothstep(0.0, 0.35, -normalize(vWn).y) * 0.25;                          // mặt úp tối
      float pits = smoothstep(0.62, 0.7, rvn(wp / 3.0)) * (1.0 - moss);                       // rỗ li ti
      rc *= 1.0 - pits * 0.22;
      float curv = clamp(length(fwidth(normalize(vWn))) / max(length(fwidth(vWp)), 1e-3) * 60.0, 0.0, 1.0);
      rc *= 1.0 + curv * 0.22 * (1.0 - moss);                                               // gờ cạnh mòn sáng: khối đá rõ nét
      float speck = step(0.93, rh3(floor(wp * 0.9))) * (1.0 - moss);                          // hạt khoáng lấp lánh
      rc += vec3(0.12, 0.12, 0.13) * speck * 0.6;
      diffuseColor.rgb = rc;
      float rockH = wA * 7.0 + wB * 3.0 + rvn(wp / 6.0) * 0.7 - vein * 1.4 - veinD * 0.8 + sin(yy * 0.17) * 0.6 - crack * 6.0 + moss * rvn(wp / 2.5) * 1.6 - pits * 0.5 + rvn(wp / 1.4) * 0.25;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(0.38 + (grain - 0.5) * 0.25 + (1.0 - bands) * 0.18 + vein * -0.12 + moss * 0.5 + crack * 0.3, 0.25, 0.95);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition), R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
        vec2 dB = vec2(dFdx(rockH), dFdy(rockH)); vec3 grad = sign(det) * (dB.x * R1 + dB.y * R2);
        normal = normalize(abs(det) * normal - grad); }`);
  };
  m.customProgramCacheKey = () => 'rock-real';
  return m;
})());

/** Quầng tối ánh tím dưới chân bệ đá (che khuất kiểu tranh vẽ): vành từ viền capsule ra ngoài, đậm sát chân → trong suốt. */
function footGlow(w, list) {
  const hw = (w.w ?? 110) / 2, L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.y2 - w.y1) / L, nx = -uz, nz = ux, N = 40;
  const ring = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), along = Math.sign(ca) * Math.pow(Math.abs(ca), 0.55) * (L / 2 + hw * 0.6), across = Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * hw; ring.push([(w.x1 + w.x2) / 2 + ux * along + nx * across, (w.y1 + w.y2) / 2 + uz * along + nz * across, ca * ux + sa * nx, ca * uz + sa * nz]); }
  const base = list.P.length / 3;
  for (const [x, z, dx, dz] of ring) { const l = Math.hypot(dx, dz) || 1; list.P.push(x - dx / l * 10, 2.5, z - dz / l * 10, x + dx / l * 110, 2.5, z + dz / l * 110); list.C.push(0.03, 0.035, 0.05, 0.6, 0.04, 0.05, 0.07, 0); }
  for (let i = 0; i < N; i++) { const a = base + i * 2, b = base + ((i + 1) % N) * 2; list.I.push(a, b, a + 1, b, b + 1, a + 1); }
}

/** Tường → bệ đá chồng phiến kiểu Liên Quân + quầng tối chân bệ + cụm cỏ cao ở chân đá (không mọc trên đỉnh), đá tảng ghé chân. */
export function buildRockWalls(map, dens = 1) {
  const g = new THREE.Group(), r = rngFor(404), geos = [], boulders = [[], [], []], grassFoot = [], flowers = [], glow = { P: [], C: [], I: [] }, pebbles = [], topGrass = [];
  map.walls.segs.forEach((w, si) => {
    if (w.border || w.baseWall != null) return; // tường biên / bệ nhà dựng riêng
    const W = w.w ?? map.walls.thickness, H = w.bushRock ? 95 : w.ledge ? 110 : Math.min(230, 110 + W * 0.33);
    const rg = roundRockGeo(w, H, si * 1.37); geos.push(rg); footGlow(w, glow);
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.y2 - w.y1) / L, nx = -uz, nz = ux;
    for (const [tx, ty, tz] of rg.userData.tops) { // cỏ dại mọc trên lưng đá
      if (r.next() > 0.3 * dens) continue;
      const n = 3 + r.int(4); for (let i = 0; i < n; i++) topGrass.push({ x: tx + r.range(-30, 30), y: ty - 14, z: tz + r.range(-30, 30), ry: r.range(0, 7), sx: r.range(70, 110), sy: r.range(55, 105) });
    }
    for (let i = 0, n = Math.round(L / 45 * dens); i < n; i++) { // sỏi vụn quanh chân đá
      const t = r.range(-0.1, 1.1), sd = r.next() < 0.5 ? -1 : 1, off = W * 0.5 * r.range(0.9, 1.35), sc = r.range(5, 18);
      pebbles.push({ x: w.x1 + ux * L * t + nx * sd * off, y: -sc * 0.25, z: w.y1 + uz * L * t + nz * sd * off, ry: r.range(0, 7), sx: sc * r.range(1, 1.6), sy: sc * r.range(0.5, 0.9), sz: sc });
    }
    const nb = Math.max(1, Math.round(L / 320)); // đá tảng ghé chân
    for (let i = 0; i < nb; i++) {
      const t = (i + r.range(0.1, 0.9)) / nb, sd = r.next() < 0.5 ? -1 : 1, off = W * r.range(0.5, 0.62), sc = W * r.range(0.16, 0.26);
      boulders[r.int(3)].push({ x: w.x1 + ux * L * t + nx * sd * off, y: -6, z: w.y1 + uz * L * t + nz * sd * off, ry: r.range(0, 7), sx: sc * r.range(1, 1.5), sy: H * r.range(0.25, 0.4), sz: sc });
    }
    if (!(w.rock || w.ledge)) return; // tường dọc đường: chân gọn
    // cụm cỏ cao ở chân đá: 1–2 cụm mỗi đoạn, mỗi cụm nhiều khóm dày (như Liên Quân), ưu tiên hai đầu bệ
    const nCl = L > 500 ? 2 : 1;
    for (let k = 0; k < nCl; k++) {
      const t = nCl === 1 ? (r.next() < 0.5 ? 0.05 : 0.95) : k ? r.range(0.75, 1) : r.range(0, 0.25), sd = r.next() < 0.5 ? -1 : 1, o = W * 0.62;
      const cx = w.x1 + ux * L * t + nx * sd * o, cz = w.y1 + uz * L * t + nz * sd * o, n = Math.round(r.range(8, 14) * dens);
      for (let i = 0; i < n; i++) { const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 95; grassFoot.push({ x: cx + Math.cos(a) * d, y: 0, z: cz + Math.sin(a) * d, ry: r.range(0, 7), sx: r.range(110, 160), sy: r.range(130, 210) * (1 - d / 200), color: 0xffffff }); }
      if (r.next() < 0.35) flowers.push({ x: cx + r.range(-60, 60), y: 0, z: cz + r.range(-60, 60), ry: r.range(0, 7), sx: r.range(110, 150), sy: r.range(90, 120) });
    }
  });
  const mat = ROCK_FACET(); void strataMat;
  g.add(new THREE.Mesh(mergeGeometries(geos), ROCK_FACET()));
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glow.P, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(glow.C, 4)); gg.setIndex(glow.I);
  const gm = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); gm.renderOrder = 1; g.add(gm);
  g.add(buildBorderWall(map), buildBaseWalls(map));
  boulders.forEach((l, i) => l.length && g.add(scatter(new THREE.InstancedMesh(boulderGeo(i * 7 + 3), mat, l.length), l, true)));
  g.add(buildGrass(grassFoot, 'bush', 16), buildGrass(flowers, 'blue', 8));
  if (topGrass.length) g.add(buildGrass(topGrass, 'wild', 12));
  if (pebbles.length) g.add(scatter(new THREE.InstancedMesh(boulderGeo(33), mat, pebbles.length), pebbles, true));
  return g;
}
export { ROCK_FACET as rockMaterial, boulderGeo, ROCK_GLSL };

/** Tường thành lãnh địa nhà (kiểu Liên Quân): mỗi cung tường giữa hai trụ nhà là một bức tường ĐÁ XÂY CHẠM KHẮC chạy cong theo cung —
 *  mặt cắt nhiều tầng (đế chân loe, thân hơi vát, gờ đai, tầng trên thụt vào, gờ mũ, mặt đỉnh phẳng), xây từng khối so le (mạch đứng +
 *  mạch ngang), đá xám tím nhạt, mặt ngửa sáng; dải khảm phát sáng màu đội (xanh / đỏ) chạy trong rãnh gờ đai; hai đầu và giữa cung là
 *  CỘT VUÔNG lớn (đế, thân, đai, mũ, chóp) gắn viên ngọc màu đội ở mặt hướng ra rừng; chân phía rừng cắm hàng GAI ĐÁ chĩa ra ngoài. */
const BW_PROF = [ // [độ lệch ngang theo nửa bề dày (dương: phía rừng), độ cao]
  [1.3, -2], [1.3, 16], [1.08, 20], [1.0, 64], [1.1, 68], [1.1, 82], [0.94, 88], [0.9, 150], [1.0, 155], [1.0, 170], [0.86, 177],
  [-0.86, 177], [-1.0, 170], [-1.0, 155], [-0.9, 150], [-0.94, 88], [-1.1, 82], [-1.1, 68], [-1.0, 64], [-1.08, 20], [-1.3, 16], [-1.3, -2]];
let _bw = null;
// y chân của từng đoạn mặt cắt (theo BW_PROF) để lấy toạ độ cục bộ trên mặt gờ
const BW_Y0 = BW_PROF.slice(0, -1).map(([, y]) => y);
function baseWallMat(hw) {
  if (_bw) return _bw; const U = { uTW: { value: BW_PROF[10][0] * 2 * hw } };
  const mk = (carved) => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0.0 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute vec2 wuv; attribute float bwseg; varying vec2 vSt; varying float vSeg; varying vec3 vWp, vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vSt = wuv; vSeg = bwseg; vec4 wq = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wq = instanceMatrix * wq;
        #endif
        vWp = (modelMatrix * wq).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);`);
      sh.fragmentShader = `uniform float uTW; varying vec2 vSt; varying float vSeg; varying vec3 vWp, vWn;
        const float BWY0[${BW_Y0.length}] = float[](${BW_Y0.map((v) => v.toFixed(1)).join(',')});
        float segL(vec2 p, vec2 a, vec2 b){ vec2 d = b - a; float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0); return length(p - a - d * t); }
        float keyD(vec2 q){ q.x = mod(q.x, 8.0); float m = 1e9;
          for (int o = -1; o <= 1; o++) { vec2 p = q - vec2(float(o) * 8.0, 0.0);
            m = min(m, segL(p, vec2(0.,7.), vec2(0.,1.))); m = min(m, segL(p, vec2(0.,1.), vec2(6.,1.))); m = min(m, segL(p, vec2(6.,1.), vec2(6.,5.)));
            m = min(m, segL(p, vec2(6.,5.), vec2(2.,5.))); m = min(m, segL(p, vec2(2.,5.), vec2(2.,3.))); m = min(m, segL(p, vec2(2.,3.), vec2(4.,3.))); m = min(m, segL(p, vec2(0.,7.), vec2(8.,7.))); }
          return m; }
        ` + ROCK_GLSL + sh.fragmentShader.replace('#include <map_fragment>', `
        vec3 wp = vWp; float up = normalize(vWn).y;
        float n1 = rfbm(wp / 140.0), n2 = rvn(wp / 4.0), n3 = rfbm(wp / 26.0 + 3.0);
        vec3 c = mix(vec3(0.125, 0.115, 0.15), vec3(0.205, 0.195, 0.24), clamp(n1 * 0.9 + 0.1, 0.0, 1.0));   // đá xám tím (tuyến tính)
        c *= 0.92 + n2 * 0.1 + (n3 - 0.5) * 0.14;
        float relief = 0.0, line = 0.0, gold = 0.0;                                             // nổi, chỉ khắc tối, khảm vàng
        ${carved ? `{
          int sg = int(vSeg + 0.5), j = sg > 10 ? 20 - sg : sg;                                // gờ đối xứng hai mặt
          float u = vSt.x, t = abs(vSt.y - BWY0[sg]);
          if (j == 0) { float f = abs(fract(u / 14.0) - 0.5) * 14.0; line = 1.0 - smoothstep(0.8, 2.0, f); relief = smoothstep(0.0, 4.0, f); }   // chân: rãnh dọc
          else if (j == 2) { float bu = fract(u / 110.0 + floor(t / 22.0) * 0.5) * 110.0, bv = mod(t, 22.0), e = min(min(bu, 110.0 - bu), min(bv, 22.0 - bv));
            relief = smoothstep(0.0, 5.0, e); line = 1.0 - smoothstep(0.5, 1.6, e); }                // khối xây vát cạnh
          else if (j == 4) { float f = fract((u + t * 1.3) / 8.0); relief = sin(f * 3.14159); line = 1.0 - smoothstep(0.0, 0.12, min(f, 1.0 - f)); }   // dây thừng
          else if (j == 6) { float pu = mod(u, 150.0), tv = t;                                    // ô phù điêu: trụ áp + khung + thoi khảm vàng
            if (pu < 18.0) { relief = 1.0; line = 1.0 - smoothstep(0.6, 1.6, min(pu, 18.0 - pu)); }
            else { float fx = min(pu - 18.0, 150.0 - pu), fy = min(tv, 62.0 - tv), fr = min(fx, fy);
              relief = 0.35 + 0.25 * smoothstep(6.0, 9.0, fr); line = max(1.0 - smoothstep(0.5, 1.4, abs(fr - 6.0)), 1.0 - smoothstep(0.5, 1.4, abs(fr - 10.0)));
              vec2 q = vec2(pu - 84.0, tv - 31.0); float rh = abs(q.x) / 40.0 + abs(q.y) / 20.0;
              gold = 1.0 - smoothstep(0.03, 0.07, abs(rh - 1.0)); float cd = length(q); gold = max(gold, 1.0 - smoothstep(4.5, 5.5, cd)); line = max(line, 1.0 - smoothstep(0.5, 1.4, abs(cd - 9.0)));
              if (rh < 1.0) relief += 0.25; } }
          else if (j == 7) { float f = mod(u, 11.0); relief = step(3.0, f); line = 1.0 - smoothstep(0.0, 1.0, min(f, 3.0 - f)) * step(f, 3.0); }   // răng cưa đỡ mũ
          else if (j == 8) { float k = keyD(vec2(u / 1.9, (t - 0.0) / 1.9)); gold = 1.0 - smoothstep(0.42, 0.62, k); relief = 0.5 + gold * 0.3; }     // hoa văn 回 vàng
          else if (j == 10) { float e = min(t, uTW - t); gold = 1.0 - smoothstep(1.2, 2.0, abs(e - 12.0));                         // mặt đỉnh: chỉ vàng hai mép
            vec2 q = vec2(mod(u, 90.0) - 45.0, t - uTW * 0.5); float rh = abs(q.x) / 34.0 + abs(q.y) / (uTW * 0.5 - 24.0);       // + chuỗi thoi khắc giữa
            line = max(1.0 - smoothstep(0.03, 0.06, abs(rh - 1.0)), (1.0 - smoothstep(0.6, 1.5, abs(mod(u, 90.0)))) * step(e, 20.0));
            relief = rh < 1.0 ? 0.7 : 0.5; gold = max(gold, 1.0 - smoothstep(3.0, 4.0, length(q))); }
        }` : `{ float f = abs(fract(wp.y / 30.0) - 0.5) * 30.0; line = (1.0 - smoothstep(0.6, 1.6, f)) * (1.0 - smoothstep(0.5, 0.75, up)); relief = smoothstep(0.0, 4.0, f); }`}
        c *= 1.0 + smoothstep(0.6, 0.95, up) * 0.45;                                          // mặt ngửa sáng
        c *= mix(0.82, 1.0, smoothstep(20.0, 170.0, wp.y));
        c *= 0.86 + relief * 0.18; c *= 1.0 - line * 0.55;
        c = mix(c, vec3(0.6, 0.4, 0.13) * (0.85 + n2 * 0.3), gold);                             // vàng khảm
        c *= mix(0.55, 1.0, smoothstep(-2.0, 40.0, wp.y));                                      // chân tường tối
        diffuseColor.rgb = c;
        float stH = n3 * 1.2 + n2 * 0.3 + relief * 2.2 - line * 1.4 + gold * 0.4;`).replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.85, gold); roughnessFactor = mix(roughnessFactor, 0.3, gold);`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition), R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
          vec2 dB = vec2(dFdx(stH), dFdy(stH)); normal = normalize(abs(det) * normal - sign(det) * (dB.x * R1 + dB.y * R2)); }`);
    };
    m.customProgramCacheKey = () => 'basewall2' + carved;
    return m;
  };
  return (_bw = { wall: mk(true), plain: mk(false), gold: new THREE.MeshStandardMaterial({ color: 0xb8823a, metalness: 0.75, roughness: 0.38 }) });
}
/** Cột vuông: phần đá (đế, thân, mũ) + phần vàng (hai đai, viền mũ, chóp tháp, hai vòng nhỏ). Có thuộc tính wuv/bwseg (= 0). */
function pillarGeo(hw) {
  const box = (w, h, y) => { const b = new THREE.BoxGeometry(w * hw, h, w * hw); b.translate(0, y, 0); return b; };
  const fin = (parts) => { const g = mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); return q; })); const n = g.attributes.position.count;
    g.setAttribute('wuv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2)); g.setAttribute('bwseg', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); return g; };
  const tip = new THREE.CylinderGeometry(0.12 * hw, 1.0 * hw, 66, 4, 1); tip.rotateY(Math.PI / 4); tip.translate(0, 315, 0);
  const knob = new THREE.SphereGeometry(0.2 * hw, 10, 8); knob.translate(0, 352, 0);
  return { stone: fin([box(2.1, 30, 15), box(1.6, 236, 148), box(1.95, 22, 271), tip]), gold: fin([box(1.66, 8, 34), box(1.66, 8, 120), box(1.66, 8, 214), box(1.99, 4, 259), box(1.99, 4, 283), knob]) };
}
function buildBaseWalls(map) {
  const g = new THREE.Group(), groups = new Map();
  for (const w of map.walls.segs) {
    if (w.baseWall == null) continue;
    const side = (w.x1 + w.x2) / 2 < (w.y1 + w.y2) / 2 ? 0 : 1, key = side + ':' + w.baseWall; // phe Xanh ở nửa dưới-trái (y > x)
    if (!groups.has(key)) groups.set(key, { side, segs: [] }); groups.get(key).segs.push(w);
  }
  if (!groups.size) return g;
  const hw = [...groups.values()][0].segs[0].w / 2, r = rngFor(77);
  const coreB = map.structures.find((s) => s.kind === 'core'), mats = baseWallMat(hw), geos = [], pillars = [[], []], spikes = [], gems = [[], []], inlay = [[], []];
  for (const { side, segs } of groups.values()) {
    const core = side ? map.mirror(coreB.x, coreB.y) : coreB;
    const pts = [[segs[0].x1, segs[0].y1], ...segs.map((w) => [w.x2, w.y2])];
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))), L = curve.getLength(), N = Math.max(8, Math.ceil(L / 36)), fr = curve.getSpacedPoints(N);
    const F = fr.map((p, i) => { const q = fr[Math.min(N, i + 1)], o = fr[Math.max(0, i - 1)]; let tx = q.x - o.x, tz = q.z - o.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; let nx = -tz, nz = tx; if ((p.x - core.x) * nx + (p.z - core.y) * nz < 0) { nx = -nx; nz = -nz; } return { x: p.x, z: p.z, nx, nz, tx, tz, s: (i * L) / N }; });
    // thân tường: mỗi đoạn mặt cắt là một dải riêng (đỉnh không dùng chung → cạnh gờ sắc)
    const P = [], UV = [], I = [], SG = [];
    for (let j = 0; j + 1 < BW_PROF.length; j++) {
      const b0 = P.length / 3, [d0, y0] = BW_PROF[j], [d1, y1] = BW_PROF[j + 1], vlen = Math.hypot((d1 - d0) * hw, y1 - y0);
      for (const f of F) { P.push(f.x + f.nx * d0 * hw, y0, f.z + f.nz * d0 * hw, f.x + f.nx * d1 * hw, y1, f.z + f.nz * d1 * hw); UV.push(f.s, y0, f.s, y0 + (Math.abs(y1 - y0) > 1 ? y1 - y0 : vlen)); SG.push(j, j); }
      for (let i = 0; i < N; i++) { const a = b0 + i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('wuv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('bwseg', new THREE.Float32BufferAttribute(SG, 1)); geo.setIndex(I); geo.computeVertexNormals();
    const topV = (Math.floor(BW_PROF.length / 2) - 1) * (N + 1) * 2 + N; // một đỉnh trên mặt đỉnh
    if (geo.attributes.normal.getY(topV) < 0) { const ix = geo.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } geo.computeVertexNormals(); }
    geos.push(geo);
    // cột: hai đầu + giữa cung
    for (const f of [F[0], F[Math.round(N / 2)], F[N]]) { pillars[side].push({ x: f.x, y: 0, z: f.z, ry: -Math.atan2(f.tz, f.tx), sx: 1 }); gems[side].push(f); }
    // gai đá chân phía rừng
    for (let s = 90; s < L - 90; s += r.range(70, 110)) {
      const f = F[Math.round((s / L) * N)], o = hw * 1.3 + r.range(14, 40), h = r.range(80, 130), lean = r.range(0.3, 0.55), sd = Math.sign(f.nx * -f.tz + f.nz * f.tx) || 1;
      spikes.push({ x: f.x + f.nx * o + f.tx * r.range(-12, 12), z: f.z + f.nz * o + f.tz * r.range(-12, 12), h, w: r.range(22, 32), ax: [f.tx, 0, f.tz], ang: lean * sd, spin: r.range(0, 1.6) });
    }
    // dải khảm phát sáng trong rãnh gờ đai (hai mặt) + gờ mũ (mặt ngoài)
    for (const [d, y0, y1] of [[1.106, 73.6, 76.4], [-1.106, 73.6, 76.4]]) {
      const q = [], qi = [];
      F.forEach((f) => q.push(f.x + f.nx * d * hw, y0, f.z + f.nz * d * hw, f.x + f.nx * d * hw, y1, f.z + f.nz * d * hw));
      for (let i = 0; i < N; i++) { const a = i * 2; qi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(q, 3)); lg.setIndex(qi); inlay[side].push(lg);
    }
  }
  const wall = new THREE.Mesh(mergeGeometries(geos), mats.wall); wall.castShadow = wall.receiveShadow = true; g.add(wall);
  const pg = pillarGeo(hw), d = new THREE.Object3D();
  for (const side of [0, 1]) {
    const tc = new THREE.Color(side ? 0xff4a36 : 0x3ab0ff);
    if (pillars[side].length) for (const [geo, mat] of [[pg.stone, mats.plain], [pg.gold, mats.gold]]) { const pm = scatter(new THREE.InstancedMesh(geo, mat, pillars[side].length), pillars[side], false); pm.castShadow = pm.receiveShadow = true; g.add(pm); }
    if (inlay[side].length) g.add(new THREE.Mesh(mergeGeometries(inlay[side]), new THREE.MeshBasicMaterial({ color: tc.clone().multiplyScalar(1.5), side: THREE.DoubleSide })));
    // ngọc màu đội trên mặt cột hướng ra rừng (cả hai mặt) + quầng sáng
    const gemGeo = new THREE.OctahedronGeometry(1, 0), gm = new THREE.MeshBasicMaterial({ color: tc.clone().multiplyScalar(1.7) }), hm = new THREE.SpriteMaterial({ map: glowTex(), color: tc, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 });
    for (const f of gems[side]) for (const sd of [1, -1]) {
      const m = new THREE.Mesh(gemGeo, gm), o = hw * 0.8 + 6; m.position.set(f.x + f.nx * o * sd, 175, f.z + f.nz * o * sd); m.scale.set(24, 38, 14); m.rotation.y = -Math.atan2(f.tz, f.tx); g.add(m);
      const h = new THREE.Sprite(hm); h.position.copy(m.position); h.position.x += f.nx * 8 * sd; h.position.z += f.nz * 8 * sd; h.scale.setScalar(150); g.add(h);
      const line = new THREE.Mesh(new THREE.BoxGeometry(7, 120, 7), gm); line.position.set(f.x + f.nx * o * sd, 90, f.z + f.nz * o * sd); g.add(line); // vạch sáng dọc thân cột
    }
  }
  // gai đá
  const sg = new THREE.ConeGeometry(1, 1, 4, 1); sg.translate(0, 0.5, 0);
  const sm = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0x8e8a9c, roughness: 0.5, flatShading: true }), spikes.length), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), mtx = new THREE.Matrix4();
  spikes.forEach((s, i) => { q.setFromAxisAngle(new THREE.Vector3(...s.ax), s.ang); q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.spin); q.multiply(q2); mtx.compose(new THREE.Vector3(s.x, -6, s.z), q, new THREE.Vector3(s.w, s.h, s.w)); sm.setMatrixAt(i, mtx); });
  sm.castShadow = sm.receiveShadow = true; g.add(sm); void d;
  return g;
}

/** Vật liệu đá phân lớp: màu đỉnh × ảnh vân lớp chiếu theo toạ độ thế giới (vách: ngang theo xz, dọc theo y; mặt trên: chiếu từ trên). */
let _strata = null;
function strataMat() {
  if (_strata) return _strata;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true }), U = { uStrata: { value: strataSurface() } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vWp; varying vec3 vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
      #endif
      vWp = (modelMatrix * wp4).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = 'uniform sampler2D uStrata; varying vec3 vWp; varying vec3 vWn;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec3 an = abs(normalize(vWn));
      vec3 sx = texture2D(uStrata, vec2(vWp.z / 620.0, vWp.y / 300.0)).rgb, sz = texture2D(uStrata, vec2(vWp.x / 620.0, vWp.y / 300.0)).rgb, sy = texture2D(uStrata, vWp.xz / 520.0).rgb;
      vec3 w = pow(an, vec3(4.0)); w /= (w.x + w.y + w.z);
      vec3 st = sx * w.x + sy * w.y + sz * w.z;
      diffuseColor.rgb *= mix(vec3(1.0), st * 2.1, 0.55); // vân lớp nhẹ (màu chính do màu đỉnh của phiến)`);
  };
  m.customProgramCacheKey = () => 'rock-strata';
  return (_strata = m);
}

/** Tường biên (đóng khung mép ngoài hai đường cánh) kiểu Liên Quân: KHÔNG phải tường xây — hai lớp gờ đá bo tròn lượn mềm (lớp trên lùi
 *  ra phía ngoài), nhấp nhô, thon hai đầu; đá xám lam loang dịu, rêu ở chân, vài viên ngọc màu đội. Các đoạn biên được nối thành đường liền. */
function buildBorderWall(map) {
  const segs = map.walls.segs.filter((w) => w.border); if (!segs.length) return new THREE.Group();
  const g = new THREE.Group(), hw = segs[0].w / 2, TOL = 3;
  // —— nối đoạn thành đường liền ——
  const items = segs.map((w) => ({ a: [w.x1, w.y1], b: [w.x2, w.y2], used: false }));
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < TOL;
  const nextFrom = (pt, dir) => {
    let best = null;
    for (const it of items) {
      if (it.used) continue;
      const [s, e] = near(it.a, pt) ? [it.a, it.b] : near(it.b, pt) ? [it.b, it.a] : [null, null]; if (!s) continue;
      const d2 = [e[0] - s[0], e[1] - s[1]], l2 = Math.hypot(...d2) || 1, cos = dir ? (dir[0] * d2[0] + dir[1] * d2[1]) / l2 : 1;
      if (cos > Math.cos((50 * Math.PI) / 180) && (!best || cos > best.cos)) best = { it, e, cos, dir: [d2[0] / l2, d2[1] / l2] };
    }
    return best;
  };
  const chains = [];
  const degree = (p) => items.filter((it) => near(it.a, p) || near(it.b, p)).length;
  for (const start of [...items].sort((x, y) => Math.min(degree(x.a), degree(x.b)) - Math.min(degree(y.a), degree(y.b)))) {
    if (start.used) continue;
    start.used = true; let pts = [start.a, start.b];
    for (const fwd of [true, false]) { // nối tiếp hai đầu
      for (;;) { const n = pts.length, p = fwd ? pts[n - 1] : pts[0], q = fwd ? pts[n - 2] : pts[1], l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
        const nx = nextFrom(p, [(p[0] - q[0]) / l, (p[1] - q[1]) / l]); if (!nx) break; nx.it.used = true; if (fwd) pts.push(nx.e); else pts.unshift(nx.e); }
    }
    chains.push(pts);
  }
  // —— dải đá lượn mềm (kiểu Liên Quân): hai lớp gờ đá bo tròn, lớp trên lùi ra phía ngoài sân; cao thấp nhấp nhô theo chiều dài,
  //    hai đầu thon xuống đất; vài viên ngọc màu đội gắn trên sống lớp trên ——
  const geos = [], gems = [[], []], sideOf = (x, z) => (z > x ? 0 : 1), rr = rngFor(313);
  const bandGeo = (F, total, off, hw2, H, ph) => {
    const RAD = 14, P = [], C = [], I = [];
    F.forEach((f) => {
      const t = f.s / total, endK = Math.min(1, f.s / 380, (total - f.s) / 380), ok = 0.3 + 0.7 * Math.pow(Math.max(0, endK), 0.6); // đầu dải thấp xuống nhưng không dẹt hẳn (tránh tam giác suy biến → pháp tuyến NaN)
      const h = H * ok * (0.85 + 0.15 * Math.sin(f.s / 520 + ph) + 0.06 * Math.sin(f.s / 170 + ph * 2)), w = hw2 * (0.75 + 0.25 * ok) * (0.95 + 0.05 * Math.sin(f.s / 330 + ph)); void t;
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI, ca = Math.cos(a), sa = Math.sin(a), lump = 1 + (fbm(f.s / 140 + ph * 3, j * 0.35 + ph, 3) - 0.5) * 0.5 * sa;  // gồ ghề tự nhiên
        const x = Math.sign(ca) * Math.pow(Math.abs(ca), 0.6) * w * (1 + (lump - 1) * 0.6), y = Math.pow(sa, 0.8) * h * lump - 6;
        P.push(f.x + f.nx * (off + x), y, f.z + f.nz * (off + x));
        const ao = 0.5 + 0.5 * Math.min(1, Math.max(0, y + 6) / (h * 0.6)); C.push(ao, ao, ao);
      }
    });
    for (let i = 0; i + 1 < F.length; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(Math.floor(RAD / 2)) < 0) { const ix = geo.index.array; for (let k = 0; k < ix.length; k += 3) { const q = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = q; } geo.computeVertexNormals(); }
    return geo;
  };
  for (const pts of chains) {
    // lấy mẫu đều mỗi 40 đơn vị
    const n0 = pts.length, cum = [0]; for (let i = 1; i < n0; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[n0 - 1], N = Math.max(4, Math.ceil(total / 40)), at = (s) => { let i = 1; while (i < n0 - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
    const S = Array.from({ length: N + 1 }, (_, i) => at((i / N) * total));
    const F = S.map((p, i) => { const a = S[Math.max(0, i - 2)], b = S[Math.min(N, i + 2)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return { x: p[0], z: p[1], nx: -tz / l, nz: tx / l, s: (i / N) * total }; });
    // hướng ra ngoài sân (phía không chơi được)
    const mid = F[N >> 1], outSign = map.outOfBounds?.(mid.x + mid.nx * 260, mid.z + mid.nz * 260, 0) ? 1 : -1;
    F.forEach((f) => { f.nx *= outSign; f.nz *= outSign; });
    const ph = rr.range(0, 6.3);
    geos.push(bandGeo(F, total, -20, hw * 1.2, 55, ph), bandGeo(F, total, hw * 0.4, hw * 0.85, 125, ph + 1.7));
    for (let s = 700; s < total - 500; s += 1700) { const f = F[Math.round((s / total) * N)]; gems[sideOf(f.x, f.z)].push(f); }
  }
  const mat = ROCK_FACET(); // cùng chất đá với bệ đá rừng (vân lớp, rêu, khe nứt)
  const wall = new THREE.Mesh(mergeGeometries(geos), mat); wall.castShadow = wall.receiveShadow = true; g.add(wall);
  const gemGeo = new THREE.OctahedronGeometry(1, 0);
  for (const sd of [0, 1]) {
    const tc = new THREE.Color(sd ? 0xff5a3a : 0x4ab8ff), gm = new THREE.MeshBasicMaterial({ color: tc.clone().multiplyScalar(1.5) }), hm = new THREE.SpriteMaterial({ map: glowTex(), color: tc, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 });
    for (const f of gems[sd]) { const x = f.x + f.nx * hw * 0.45, z = f.z + f.nz * hw * 0.45, m = new THREE.Mesh(gemGeo, gm); m.position.set(x, 150, z); m.scale.set(16, 26, 16); g.add(m);
      const h = new THREE.Sprite(hm); h.position.set(x, 150, z); h.scale.setScalar(110); g.add(h); }
  }
  return g;
}

/** Bán kính bệ lãnh thổ theo loại trại. */
export const campRadius = (type) => ({ soi_da: 300, coc_reu: 250, linh_thuy: 300, hoa_nham: 300, long_ngu: 560, ho_loi: 600 }[type] || 260);

/** Bệ đá lãnh thổ cho mọi trại + đầm sen Long Ngư + đài sấm Hổ Lôi. */
export function buildCampSites(map) {
  const g = new THREE.Group(), r = rngFor(505);
  const pt = plazaTexture('tower'); // bệ lãnh thổ: cùng kiểu đá mài khắc vòng như chân trụ (đồng bộ với đường)
  const topMat = new THREE.MeshLambertMaterial({ map: pt.map, normalMap: pt.normal, color: 0xb4b2c2, transparent: true }), sideMat = new THREE.MeshLambertMaterial({ color: 0x4a5266 });
  const rim = [];
  for (const c of map.camps || []) {
    const R = campRadius(c.type), def = MONSTERS[c.type];
    if (def.boss) { buildLair(g, c, R, r, c.type === 'ho_loi' ? 0xa266ff : 0xffa63a); continue; }
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.04, 12, 48, 1), [sideMat, topMat, topMat]); dais.position.set(c.x, 6, c.y); g.add(dais);
    if (def.buff && !def.boss) { // ấn khắc màu bùa giữa bệ
      const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.55, R * 0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.type === 'linh_thuy' ? 0x4fb8ff : 0xff6a2a).multiplyScalar(1.3), transparent: true, opacity: 0.75 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, 13, c.y); g.add(ring);
    }
    const n = Math.round(R / 22); // viền đá quanh bệ, chừa lối vào
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (Math.cos(a - (c.side === 1 ? 0 : 0)) > 0.93) continue; rim.push({ x: c.x + Math.cos(a) * R * 1.04, y: 0, z: c.y + Math.sin(a) * R * 1.04, ry: r.range(0, 7), sx: r.range(28, 46), sy: r.range(20, 38), sz: r.range(28, 46) }); }
  }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(57), ROCK_FACET(), rim.length), rim, true));
  return g;
}

/** Hang mục tiêu lớn (kiểu hang Tà thần/Rồng của Liên Quân): bệ đá tối thấp gồ ghề giữa sông, hàng "móng đá" cong khổng lồ
 *  ôm phía sau như nanh vuốt, vết nứt phát sáng (tím: Hổ Lôi, vàng cam: Long Ngư) toả ra mặt bệ và lan xuống nước, quả cầu năng lượng. */
function buildLair(g, c, R, r, glowHex) {
  const glow = new THREE.Color(glowHex), seed = c.x * 0.001, back = c.back ?? -Math.PI / 2; // hướng lưng hang (phía rừng), mặt hở ra sông
  // bệ: đĩa đá thấp, mép vỡ gồ ghề, mặt trên lồi lõm nhẹ
  const pg = new THREE.CylinderGeometry(R * 0.98, R * 1.12, 36, 64, 3); pg.deleteAttribute('uv'); pg.deleteAttribute('normal');
  const plat = mergeVertices(pg), pp = plat.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + (fbm(Math.cos(a) * 2 + seed, Math.sin(a) * 2, 3) - 0.5) * 0.22; pp.setXYZ(i, x * k, y + (y > 0 ? (fbm(x * 0.006, z * 0.006 + seed, 3) - 0.5) * 18 : 0), z * k); }
  plat.computeVertexNormals();
  { const n = plat.attributes.normal, col = new Float32Array(pp.count * 3), cc = new THREE.Color(), hi = new THREE.Color(0x6e7488), lo = new THREE.Color(0x2c303c);
    for (let i = 0; i < pp.count; i++) { const v = fbm(pp.getX(i) * 0.01 + seed, pp.getZ(i) * 0.01, 3); cc.copy(lo).lerp(hi, 0.25 + v * 0.5 + Math.max(0, n.getY(i)) * 0.25); col.set([cc.r, cc.g, cc.b], 3 * i); }
    plat.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const platM = new THREE.Mesh(plat, new THREE.MeshLambertMaterial({ vertexColors: true })); platM.position.set(c.x, 14, c.y); platM.receiveShadow = true; g.add(platM);
  // tường đá sắc cạnh ôm phía sau hang (hình móng ngựa), cao dần về giữa lưng, chừa mặt mở ra sông
  const wr = rngFor((seed * 997) | 0), wallGeos = [], RW = R * 1.12;
  for (let i = 0; i < 6; i++) {
    const a0 = back + (i / 6 - 0.5) * Math.PI * 1.25, a1 = back + ((i + 1) / 6 - 0.5) * Math.PI * 1.25;
    const seg = { x1: c.x + Math.cos(a0) * RW, y1: c.y + Math.sin(a0) * RW, x2: c.x + Math.cos(a1) * RW, y2: c.y + Math.sin(a1) * RW, w: R * 0.34 };
    const mid = 1 - Math.abs((i + 0.5) / 6 - 0.5) * 2; wallGeos.push(roundRockGeo(seg, 120 + 110 * mid, seed + i * 3.3));
  }
  const wallM = new THREE.Mesh(mergeGeometries(wallGeos), ROCK_FACET()); wallM.castShadow = true; wallM.receiveShadow = true; g.add(wallM);
  // vài khối đá lởm chởm nhô lên quanh mép bệ
  const spikes = [];
  for (let i = 0; i < 7; i++) { const a = back + wr.range(-1.2, 1.2), d = R * wr.range(0.85, 1.0); spikes.push({ x: c.x + Math.cos(a) * d, y: 0, z: c.y + Math.sin(a) * d, ry: wr.range(0, 7), sx: R * wr.range(0.08, 0.13), sy: R * wr.range(0.2, 0.32), sz: R * wr.range(0.08, 0.13) }); }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(91), ROCK_FACET(), spikes.length), spikes, true)); // trụ đá tròn nhẵn
  // vết nứt phát sáng: mặt trên bệ + lan ra nước quanh hang
  const U = { uT: LAIR_T, uC: { value: glow.clone().multiplyScalar(1.8) }, uR: { value: R }, uS: { value: seed * 37.0 } };
  const crack = (rad, y, outer) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 64), new THREE.ShaderMaterial({ uniforms: { ...U, uO: { value: outer ? 1 : 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uR, uS, uO; uniform vec3 uC; varying vec2 vP;
      vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      float vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = h2(i + g + uS); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return d2 - d1; }
      void main(){ float r = length(vP) / uR, a = atan(vP.y, vP.x);
        vec2 q = vec2(a * 3.0, log(max(r, 0.05)) * 3.2);                       // toạ độ cực: nứt toả tia
        float e = vor(q * vec2(1.0, 1.0) + vec2(0.0, -uT * 0.05));
        float line = smoothstep(0.13, 0.0, e) + smoothstep(0.03, 0.0, e) * 1.5;
        float fall = uO > 0.5 ? smoothstep(1.6, 0.95, r) * smoothstep(0.85, 1.0, r) : smoothstep(1.0, 0.2, r) * 0.9 + 0.1;
        float pulse = 0.65 + 0.35 * sin(uT * 2.2 - r * 6.0);
        float v = line * fall * pulse;
        gl_FragColor = vec4(uC * v, v); }` }));
    m.rotation.x = -Math.PI / 2; m.position.set(c.x, y, c.y); m.renderOrder = 2; g.add(m); };
  crack(R * 0.98, 33, false); crack(R * 1.6, 6, true);
  // quả cầu năng lượng trên móng giữa
  const orb = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 20, 14), new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(1.8) })); orb.position.set(c.x + Math.cos(back) * R * 0.2, R * 0.5, c.y + Math.sin(back) * R * 0.2); g.add(orb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: glow, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); halo.scale.setScalar(R * 0.6); halo.position.copy(orb.position); g.add(halo);
}
export const LAIR_T = { value: 0 };
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (_glow = new THREE.CanvasTexture(c));
}
