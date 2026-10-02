import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildGrass } from './grass.js';
import { fbm, rngFor } from './noise.js';
import { scatter } from './foliage.js';
import { flagstoneSurface, wallStoneSurface, strataSurface, cutStoneSurface } from './surfaces.js';
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
  for (let i = 0; i < p.count; i++) { rockColor(c, p.getX(i) * 300, p.getY(i) * 300, p.getZ(i) * 300, n.getY(i), (p.getY(i) + 0.2) / 1.1, seed); col.set([c.r, c.g, c.b], 3 * i); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Bệ đá kiểu Liên Quân: CHỒNG PHIẾN ĐÁ PHẲNG nhiều lớp (mỗi lớp là một phiến dày bo cạnh, viền gồ ghề theo nhiễu, lệch nhau
 *  và chìa ra như mái hiên → có chiều sâu), mặt trên sáng xám lam, cạnh phiến tối dần xuống chân, rêu loang trên mặt phiến. */
function slabStackGeo(w, H, seed, r) {
  // Đá sắc cạnh: 4–5 lớp phiến mỏng; mỗi lớp chia thành vài khối (khe nứt dọc giữa các khối), viền khối là đa giác ít cạnh
  // có nhiễu → mặt vát phẳng (flat shading) bắt sáng rõ từng mặt; lớp xen kẽ thụt/chìa → khe tối giữa lớp.
  const hw = (w.w ?? 110) / 2, ax = w.x1, az = w.y1, bx = w.x2, bz = w.y2, L = Math.hypot(bx - ax, bz - az) || 1;
  const ang = Math.atan2(bz - az, bx - ax), cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const n = H > 150 ? 5 : 4, parts = [], half = L / 2 + hw * 0.55;
  let y = 0;
  for (let k = 0; k < n; k++) {
    const th = (H / n) * r.range(0.85, 1.2), grow = k === 0 ? 1.05 : k === n - 1 ? 0.78 : (k % 2 ? 1.08 : 0.94) * (1 - k * 0.04);
    const nb = Math.max(1, Math.round((half * 2) / r.range(260, 380))), seg = (half * 2) / nb;
    for (let b = 0; b < nb; b++) {
      const x0 = -half * grow + b * seg * grow + 7, x1 = x0 + seg * grow - 14, mx = (x0 + x1) / 2, hx = (x1 - x0) / 2;
      const endL = b === 0, endR = b === nb - 1, hwk = hw * grow * r.range(0.86, 1.04), sh = new THREE.Shape(), N = 12;
      for (let i = 0; i < N; i++) { // đa giác ít cạnh, góc ngoài cùng bo theo đầu bệ
        const a = (i / N) * Math.PI * 2 + r.range(-0.12, 0.12), ca = Math.cos(a), sa = Math.sin(a);
        const ex = (ca < 0 && endL) || (ca > 0 && endR) ? Math.pow(Math.abs(ca), 0.6) : Math.pow(Math.abs(ca), 0.25);
        const px = mx + Math.sign(ca) * ex * hx, pz = Math.sign(sa) * Math.pow(Math.abs(sa), 0.45) * hwk, j = r.range(0.88, 1.08);
        i ? sh.lineTo(mx + (px - mx) * j, pz * j) : sh.moveTo(mx + (px - mx) * j, pz * j);
      }
      sh.closePath();
      const bev = Math.min(6, th * 0.2), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(4, th - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, y + bev, 0);
      geo.rotateZ(r.range(-0.04, 0.04)); geo.rotateX(r.range(-0.04, 0.04));
      geo.deleteAttribute('uv'); parts.push(geo.toNonIndexed());
    }
    y += th * r.range(0.8, 0.9);
  }
  const g = mergeGeometries(parts); g.rotateY(-ang); g.translate(cx, -6, cz);
  { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const X = q.getX(i), Y = q.getY(i), Z = q.getZ(i), d = (fbm(X * 0.012 + seed, Z * 0.012 + Y * 0.02, 2) - 0.5) * 22; q.setXYZ(i, X + d, Y + d * 0.25, Z - d * 0.8); } }
  g.computeVertexNormals(); // non-indexed → pháp tuyến theo mặt (mặt vát rõ)
  const p = g.attributes.position, nrm = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const TOP = new THREE.Color(0x7c879c), SIDE = new THREE.Color(0x404a60), DEEP = new THREE.Color(0x141720), MOSSC = new THREE.Color(0x436e38), rf = rngFor(seed * 1000 | 0);
  for (let f = 0; f < p.count; f += 3) { // màu theo từng mặt tam giác
    const X = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, Y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, Z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    const ny = nrm.getY(f), h01 = Math.max(0, Y / H), v = fbm(X * 0.005 + seed, Z * 0.005, 3), jit = rf.range(0.9, 1.1);
    if (ny > 0.55) { c.copy(TOP).multiplyScalar((0.8 + v * 0.35 + h01 * 0.15) * jit); if (v > 0.56) c.lerp(MOSSC, Math.min(0.7, (v - 0.56) * 4)); }
    else if (ny < -0.25) c.copy(DEEP);
    else c.copy(SIDE).lerp(DEEP, Math.max(0, 0.45 - h01) * 0.9).multiplyScalar((0.8 + v * 0.35) * jit);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], 3 * (f + k));
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

let _rf = null;
const ROCK_FACET = () => (_rf ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04, flatShading: true }));

/** Quầng tối ánh tím dưới chân bệ đá (che khuất kiểu tranh vẽ): vành từ viền capsule ra ngoài, đậm sát chân → trong suốt. */
function footGlow(w, list) {
  const hw = (w.w ?? 110) / 2, L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.y2 - w.y1) / L, nx = -uz, nz = ux, N = 40;
  const ring = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), along = Math.sign(ca) * Math.pow(Math.abs(ca), 0.55) * (L / 2 + hw * 0.6), across = Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * hw; ring.push([(w.x1 + w.x2) / 2 + ux * along + nx * across, (w.y1 + w.y2) / 2 + uz * along + nz * across, ca * ux + sa * nx, ca * uz + sa * nz]); }
  const base = list.P.length / 3;
  for (const [x, z, dx, dz] of ring) { const l = Math.hypot(dx, dz) || 1; list.P.push(x - dx / l * 10, 2.5, z - dz / l * 10, x + dx / l * 110, 2.5, z + dz / l * 110); list.C.push(0.14, 0.08, 0.3, 0.78, 0.2, 0.1, 0.4, 0); }
  for (let i = 0; i < N; i++) { const a = base + i * 2, b = base + ((i + 1) % N) * 2; list.I.push(a, b, a + 1, b, b + 1, a + 1); }
}

/** Tường → bệ đá chồng phiến kiểu Liên Quân + quầng tối chân bệ + cụm cỏ cao ở chân đá (không mọc trên đỉnh), đá tảng ghé chân. */
export function buildRockWalls(map, dens = 1) {
  const g = new THREE.Group(), r = rngFor(404), geos = [], boulders = [[], [], []], grassFoot = [], flowers = [], glow = { P: [], C: [], I: [] };
  map.walls.segs.forEach((w, si) => {
    if (w.border || w.baseWall != null) return; // tường biên / bệ nhà dựng riêng
    const W = w.w ?? map.walls.thickness, H = w.bushRock ? 95 : w.ledge ? 110 : Math.min(230, 110 + W * 0.33);
    geos.push(slabStackGeo(w, H, si * 1.37, r)); footGlow(w, glow);
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.y2 - w.y1) / L, nx = -uz, nz = ux;
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
  const mat = strataMat();
  g.add(new THREE.Mesh(mergeGeometries(geos), ROCK_FACET()));
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glow.P, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(glow.C, 4)); gg.setIndex(glow.I);
  const gm = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); gm.renderOrder = 1; g.add(gm);
  g.add(buildBorderWall(map, r), buildBaseWalls(map));
  boulders.forEach((l, i) => l.length && g.add(scatter(new THREE.InstancedMesh(boulderGeo(i * 7 + 3), mat, l.length), l, true)));
  g.add(buildGrass(grassFoot, 'bush', 16), buildGrass(flowers, 'blue', 8));
  return g;
}

/** Bệ nhà (lãnh địa): mỗi cung tường giữa hai trụ nhà dựng thành MỘT khối đá điêu khắc liền mạch kiểu Liên Quân — thân cong thon
 *  hai đầu, mặt cắt vát (đỉnh hẹp, chân loe), đầu bệ cuộn vểnh lên như sóng; gờ đá sáng chạy dọc sống lưng; dải khảm phát sáng màu đội
 *  (xanh: phe Xanh, đỏ: phe Đỏ) chạy dọc thân; quầng tối dưới chân. */
function buildBaseWalls(map) {
  const g = new THREE.Group(), groups = new Map();
  for (const w of map.walls.segs) {
    if (w.baseWall == null) continue;
    const side = (w.x1 + w.x2) / 2 < (w.y1 + w.y2) / 2 ? 0 : 1, key = side + ':' + w.baseWall; // phe Xanh ở nửa dưới-trái (y > x)
    if (!groups.has(key)) groups.set(key, { side, segs: [] }); groups.get(key).segs.push(w);
  }
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 });
  for (const { side, segs } of groups.values()) {
    const pts = [[segs[0].x1, segs[0].y1], ...segs.map((w) => [w.x2, w.y2])];
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))), N = 80, RAD = 10, W = segs[0].w;
    const frames = curve.getSpacedPoints(N), P = [], C = [], I = [], col = new THREE.Color();
    const prof = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.04 - 0.02))), 0.45);   // thon hai đầu
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = frames[i], q = frames[Math.min(N, i + 1)], o = frames[Math.max(0, i - 1)], dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      const k = prof(t), hw = W * 0.55 * (0.35 + 0.65 * k), Ht = 240 * k + 30 + (t < 0.12 || t > 0.88 ? 120 * Math.pow(1 - Math.min(t, 1 - t) / 0.12, 2) * k : 0); // đầu bệ vểnh
      for (let j = 0; j <= RAD; j++) { // mặt cắt: chân loe → vai → đỉnh hẹp bo tròn (nửa trên elip vát)
        const a = (j / RAD) * Math.PI, ca = Math.cos(a), sa = Math.sin(a), w2 = hw * (0.55 + 0.45 * (1 - sa)) * Math.sign(ca) * Math.pow(Math.abs(ca), 0.7);
        P.push(p.x + nx * w2, Ht * Math.pow(sa, 0.8) - 4, p.z + nz * w2);
        const top = sa > 0.86, base = 0.42 + 0.5 * sa;
        col.setRGB(0.42 * base + (top ? 0.22 : 0), 0.46 * base + (top ? 0.24 : 0), 0.58 * base + (top ? 0.26 : 0), THREE.SRGBColorSpace).multiplyScalar(0.62); // xám lam, sống lưng sáng
        C.push(col.r, col.g, col.b);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(Math.floor(RAD / 2)) < 0) { geo.setIndex(I.map((_, k) => I[k - (k % 3) + [0, 2, 1][k % 3]])); geo.computeVertexNormals(); }
    void geo; const br = rngFor(segs.length * 31 + side * 7), sg = segs.map((w, i) => slabStackGeo({ ...w, w: W * 0.9 }, 210, 50 + i * 2.1 + side, br));
    const m = new THREE.Mesh(mergeGeometries(sg), ROCK_FACET()); m.castShadow = true; m.receiveShadow = true; g.add(m);
    // dải khảm phát sáng màu đội chạy dọc hai bên thân
    const glowC = new THREE.Color(side ? 0xff5a3a : 0x4ab8ff).multiplyScalar(1.6);
    for (const sd of [-1, 1]) {
      const gp = [];
      for (let i = 4; i <= N - 4; i++) { const t = i / N, p = frames[i], q = frames[Math.min(N, i + 1)], o = frames[i - 1], dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, k = prof(t), hw = W * 0.5;
        gp.push(new THREE.Vector3(p.x - dz / l * hw * sd, 70, p.z + dx / l * hw * sd)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gp), 60, 4, 5, false), new THREE.MeshBasicMaterial({ color: glowC })));
    }
    // quầng sáng màu đội mờ dưới chân
    const halo = []; for (let i = 0; i <= N; i += 2) { const p = frames[i]; halo.push(p); }
    const hg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(halo.map((p) => new THREE.Vector3(p.x, 3, p.z))), 60, W * 0.7, 6, false); hg.scale(1, 0.02, 1);
    g.add(new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: glowC.clone().multiplyScalar(0.35), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
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

/** Tường biên: dãy tấm đá xẻ khối lớn nối liền (đế đá, thân, nắp đá vát rộng hơn), mạch nối mảnh, đèn đá thưa, cỏ lá dài dưới chân. */
function buildBorderWall(map, r) {
  const segs = map.walls.segs.filter((w) => w.border); if (!segs.length) return new THREE.Group();
  const g = new THREE.Group(), body = [], cap = [], plinth = [], foot = [], d = new THREE.Object3D(), H = 190;
  for (const w of segs) {
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), W = w.w, ang = -Math.atan2(w.y2 - w.y1, w.x2 - w.x1), n = Math.max(1, Math.round(L / 340));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = w.x1 + (w.x2 - w.x1) * t, z = w.y1 + (w.y2 - w.y1) * t, len = L / n - 8, h = H * r.range(0.94, 1.06);
      body.push({ x, y: h / 2, z, ry: ang, sx: len + 2, sy: h, sz: W * 0.86 });
      cap.push({ x, y: h + 9, z, ry: ang, sx: len - 4, sy: 18, sz: W });
      plinth.push({ x, y: 14, z, ry: ang, sx: len + 14, sy: 28, sz: W * 1.02 });
    }
    const nx = -(w.y2 - w.y1) / L, nz = (w.x2 - w.x1) / L;
    for (let k = 0; k < 0; k++) { const t = r.next(), sd = r.next() < 0.5 ? -1 : 1; foot.push({ x: w.x1 + (w.x2 - w.x1) * t + nx * sd * W * 0.56, y: 0, z: w.y1 + (w.y2 - w.y1) * t + nz * sd * W * 0.56, ry: r.range(0, 7), sx: r.range(70, 120), sy: r.range(60, 120) }); }
  }
  const tex = cutStoneSurface(), side = tex.clone(); side.repeat.set(1.4, 0.8); side.needsUpdate = true;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mk = (list, mat) => { const m = new THREE.InstancedMesh(box, mat, list.length); list.forEach((it, i) => { d.position.set(it.x, it.y, it.z); d.rotation.set(0, it.ry, 0); d.scale.set(it.sx, it.sy, it.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.receiveShadow = true; return m; };
  g.add(mk(body, new THREE.MeshLambertMaterial({ map: side, color: 0xc8ccd4 })), mk(cap, new THREE.MeshLambertMaterial({ map: tex, color: 0xe2e2e2 })), mk(plinth, new THREE.MeshLambertMaterial({ map: tex, color: 0x8a8e96 })));
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
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(57), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), rim.length), rim, true));
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
    const mid = 1 - Math.abs((i + 0.5) / 6 - 0.5) * 2; wallGeos.push(slabStackGeo(seg, 120 + 110 * mid, seed + i * 3.3, wr));
  }
  const wallM = new THREE.Mesh(mergeGeometries(wallGeos), ROCK_FACET()); wallM.castShadow = true; wallM.receiveShadow = true; g.add(wallM);
  // vài khối đá lởm chởm nhô lên quanh mép bệ
  const spikes = [];
  for (let i = 0; i < 7; i++) { const a = back + wr.range(-1.2, 1.2), d = R * wr.range(0.85, 1.0); spikes.push({ x: c.x + Math.cos(a) * d, y: 0, z: c.y + Math.sin(a) * d, ry: wr.range(0, 7), sx: R * wr.range(0.07, 0.12), sy: R * wr.range(0.25, 0.45), sz: R * wr.range(0.07, 0.12) }); }
  const spG = new THREE.ConeGeometry(1, 1, 5, 1); spG.translate(0, 0.5, 0);
  { const sp = spG.toNonIndexed(); sp.computeVertexNormals(); const cc = new Float32Array(sp.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) cc.set([0.32, 0.3, 0.4], i); sp.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    g.add(scatter(new THREE.InstancedMesh(sp, ROCK_FACET(), spikes.length), spikes, true)); }
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
