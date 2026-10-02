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
  const hw = (w.w ?? 110) / 2, ax = w.x1, az = w.y1, bx = w.x2, bz = w.y2, L = Math.hypot(bx - ax, bz - az) || 1;
  const ang = Math.atan2(bz - az, bx - ax), cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const n = H > 150 ? 4 : 3, parts = [];
  let y = 0;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1 || 1), th = (H / n) * r.range(0.85, 1.15);
    // lớp giữa chìa ra (mái hiên), lớp đỉnh co lại; lệch tâm nhẹ
    const grow = [1.02, 1.12, 0.96, 0.82][k] ?? 0.8, hl = (L / 2 + hw * 0.6) * grow * r.range(0.92, 1.04), hwk = hw * grow * r.range(0.9, 1.06);
    const ox = r.range(-0.08, 0.08) * hw, oz = r.range(-0.12, 0.12) * hw, sh = new THREE.Shape(), N = 44;
    for (let i = 0; i < N; i++) { // viền "con nhộng" + nhiễu → phiến đá tự nhiên
      const a = (i / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.55) * hl, pz = Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * hwk;
      const nn = 1 + (fbm(ca * 1.7 + seed + k, sa * 1.7 + k * 3.1, 3) - 0.5) * 0.32;
      i ? sh.lineTo(px * nn + ox, pz * nn + oz) : sh.moveTo(px * nn + ox, pz * nn + oz);
    }
    sh.closePath();
    const bev = Math.min(14, th * 0.3), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(4, th - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 2, curveSegments: 4 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y + bev, 0); // phiến nằm ngang, đáy tại y
    // nghiêng nhẹ từng phiến
    geo.rotateZ(r.range(-0.03, 0.03)); geo.rotateX(r.range(-0.03, 0.03));
    parts.push(geo.toNonIndexed()); y += th * r.range(0.82, 0.92);
    void t;
  }
  const g0 = mergeGeometries(parts); g0.rotateY(-ang); g0.translate(cx, -6, cz); g0.deleteAttribute('uv'); g0.deleteAttribute('normal');
  const g = mergeVertices(g0, 0.5);
  { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const X = q.getX(i), Y = q.getY(i), Z = q.getZ(i), d = (fbm(X * 0.02 + seed, Z * 0.02 + Y * 0.03, 3) - 0.5) * 16; q.setXYZ(i, X + d, Y + d * 0.35, Z - d); } } // gồ ghề bề mặt
  g.computeVertexNormals();
  const p = g.attributes.position, nrm = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const TOP = new THREE.Color(0x6c788e), SIDE = new THREE.Color(0x3a4256), DEEP = new THREE.Color(0x161922), MOSSC = new THREE.Color(0x3e6634);
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), ny = nrm.getY(i), h01 = Math.max(0, Y / H), v = fbm(X * 0.006 + seed, Z * 0.006, 3);
    if (ny > 0.6) c.copy(TOP).multiplyScalar(0.78 + v * 0.42 + h01 * 0.12 + (fbm(X * 0.03, Z * 0.03, 2) - 0.5) * 0.25);                     // mặt phiến sáng
    else if (ny < -0.3) c.copy(DEEP);                                                            // đáy phiến (dưới mái hiên) tối hẳn
    else c.copy(SIDE).lerp(DEEP, Math.max(0, 0.5 - h01) * 0.8).multiplyScalar(0.85 + v * 0.3); // cạnh phiến tối dần xuống chân
    if (ny > 0.6 && v > 0.5) c.lerp(MOSSC, Math.min(0.8, (v - 0.5) * 3.2));                      // rêu loang trên mặt phiến
    col.set([c.r, c.g, c.b], 3 * i);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

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
    if (w.border) return; // tường biên dựng riêng (buildBorderWall)
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
  g.add(new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ vertexColors: true })));
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glow.P, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(glow.C, 4)); gg.setIndex(glow.I);
  const gm = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); gm.renderOrder = 1; g.add(gm);
  g.add(buildBorderWall(map, r));
  boulders.forEach((l, i) => l.length && g.add(scatter(new THREE.InstancedMesh(boulderGeo(i * 7 + 3), mat, l.length), l, true)));
  g.add(buildGrass(grassFoot, 'bush', 16), buildGrass(flowers, 'blue', 8));
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
  { const n = plat.attributes.normal, col = new Float32Array(pp.count * 3), cc = new THREE.Color(), hi = new THREE.Color(0x5a566a), lo = new THREE.Color(0x24222c);
    for (let i = 0; i < pp.count; i++) { const v = fbm(pp.getX(i) * 0.01 + seed, pp.getZ(i) * 0.01, 3); cc.copy(lo).lerp(hi, 0.25 + v * 0.5 + Math.max(0, n.getY(i)) * 0.25); col.set([cc.r, cc.g, cc.b], 3 * i); }
    plat.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const platM = new THREE.Mesh(plat, new THREE.MeshLambertMaterial({ vertexColors: true })); platM.position.set(c.x, 14, c.y); platM.receiveShadow = true; g.add(platM);
  // móng đá cong ôm phía sau (−z, xa camera) và hai bên
  const claws = [], rockM = new THREE.MeshLambertMaterial({ vertexColors: true });
  const nC = 7;
  for (let i = 0; i < nC; i++) {
    const a = back + (i / (nC - 1) - 0.5) * Math.PI * 0.8, len = R * r.range(0.75, 1.05) * (1 - Math.abs(i / (nC - 1) - 0.5) * 0.5), x0 = Math.cos(a) * R * 1.02, z0 = Math.sin(a) * R * 1.02;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0 * 1.1, -20, z0 * 1.1), new THREE.Vector3(x0 * 1.05, len * 0.45, z0 * 1.05), new THREE.Vector3(x0 * 0.82, len * 0.85, z0 * 0.82), new THREE.Vector3(x0 * 0.55, len * 1.0, z0 * 0.55)]);
    const tg = new THREE.TubeGeometry(curve, 12, 1, 7, false), tp = tg.attributes.position, uv = tg.attributes.uv, pts = curve.getSpacedPoints(12);
    for (let k = 0; k < tp.count; k++) { const t = uv.getX(k), q = pts[Math.min(12, Math.round(t * 12))], rad = R * 0.11 * Math.pow(1 - t, 1.1) + 4; tp.setXYZ(k, q.x + (tp.getX(k) - q.x) * rad * 1.5, q.y + (tp.getY(k) - q.y) * rad, q.z + (tp.getZ(k) - q.z) * rad * 0.8); }
    tg.computeVertexNormals();
    const tn = tg.attributes.normal, col = new Float32Array(tp.count * 3), cc = new THREE.Color();
    for (let k = 0; k < tp.count; k++) { const t = uv.getX(k); cc.set(0x2e2c38).lerp(new THREE.Color(0x7a768c), Math.max(0, tn.getY(k)) * 0.6 + t * 0.25); if (t > 0.1 && t < 0.7 && Math.abs(Math.sin(uv.getY(k) * Math.PI * 2)) < 0.12) cc.lerp(glow, 0.8); col.set([cc.r, cc.g, cc.b], 3 * k); } // gân sáng dọc móng
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.deleteAttribute('uv'); claws.push(tg);
  }
  const clawM = new THREE.Mesh(mergeGeometries(claws), rockM); clawM.position.set(c.x, 0, c.y); g.add(clawM);
  // tảng đá lớn chặn mép sau
  const big = [];
  for (let i = 0; i < 6; i++) { const a = back + r.range(-1.2, 1.2), d = R * r.range(1.05, 1.3); big.push({ x: c.x + Math.cos(a) * d, y: -10, z: c.y + Math.sin(a) * d, ry: r.range(0, 7), sx: R * r.range(0.22, 0.32), sy: R * r.range(0.18, 0.3), sz: R * r.range(0.18, 0.26), color: 0x8a86a0 }); }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(91), rockM, big.length), big, true));
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
  const orb = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 20, 14), new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(1.8) })); orb.position.set(c.x + Math.cos(back) * R * 0.55, R * 0.95, c.y + Math.sin(back) * R * 0.55); g.add(orb);
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
