import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, rngFor } from './noise.js';
import { sway, tuftGeo, scatter } from './foliage.js';
import { flagstoneSurface, wallStoneSurface } from './surfaces.js';
import { MONSTERS } from '../../data/jungle.js';

// Bệ đá kiểu tảng đá tự nhiên (tham khảo các khối đá rêu trong rừng): mỗi đoạn tường là cụm tảng đá tròn gồ ghề xám lam,
// mặt trên phủ rêu + cỏ/dương xỉ; và "lãnh thổ" của từng trại quái: bệ đá tròn lát phiến, viền đá, đầm sen (Long Ngư), đài sấm (Hổ Lôi).

/** Hình học tảng đá (bán kính 1): gồ ghề, phẳng đáy, màu đỉnh xám lam → rêu trên mặt ngửa. */
function boulderGeo(seed) {
  const g0 = new THREE.IcosahedronGeometry(1, 2); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
  const g = mergeVertices(g0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 1.6 + seed, z * 1.6 + y * 1.3 + seed * 0.37, 4) - 0.5) * 0.8;
    p.setXYZ(i, x * k, Math.max(-0.15, y * k * (y > 0 ? 1 : 0.6)), z * k);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color(), rockC = new THREE.Color(0x737985), dark = new THREE.Color(0x3c414b), moss = new THREE.Color(0x4f7d30);
  for (let i = 0; i < p.count; i++) {
    const ny = n.getY(i), v = fbm(p.getX(i) * 3 + seed, p.getZ(i) * 3 + p.getY(i) * 2, 3);
    c.copy(dark).lerp(rockC, 0.35 + v * 0.65 + Math.max(0, ny) * 0.15);
    c.multiplyScalar(0.75 + 0.35 * Math.max(0, ny)); // mặt dưới tối (khối đá rõ)
    if (ny > 0.35) c.lerp(moss, Math.min(1, (ny - 0.35) * 2.6) * (0.55 + v * 0.6));
    col.set([c.r, c.g, c.b], 3 * i);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Tường → cụm tảng đá. Trả về group (vài InstancedMesh). */
export function buildRockWalls(map, dens = 1) {
  const g = new THREE.Group(), r = rngFor(404), th = map.walls.thickness, V = 4;
  const lists = Array.from({ length: V }, () => []), small = [], tufts = [], leafy = [];
  for (const w of map.walls.segs) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ang = -Math.atan2(dy, dx);
    const n = Math.max(2, Math.round(L / 150)), hMin = w.ledge ? 85 : 130, hMax = w.ledge ? 125 : 200;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n * L + r.range(-25, 25), x = w.x1 + ux * t + r.range(-15, 15), z = w.y1 + uy * t + r.range(-15, 15);
      const sx = (L / n) * r.range(0.62, 0.8), sz = th * r.range(0.75, 1.05), sy = r.range(hMin, hMax);
      lists[r.int(V)].push({ x, y: 0, z, ry: ang + r.range(-0.35, 0.35), sx, sy, sz });
      for (let k = 0; k < 2; k++) tufts.push({ x: x + r.range(-sx * 0.5, sx * 0.5), y: sy * 0.78, z: z + r.range(-sz * 0.3, sz * 0.3), ry: r.range(0, 7), sx: r.range(0.9, 1.4), sy: r.range(0.7, 1.2), sz: r.range(0.9, 1.4) });
      if (r.next() < 0.45) leafy.push({ x: x + r.range(-sx * 0.4, sx * 0.4), y: sy * 0.82, z, ry: r.range(0, 7), sx: r.range(28, 48), sy: r.range(22, 34), sz: r.range(28, 48), color: [0xffffff, 0xd8e8c8, 0xc0d8a8][r.int(3)] });
      for (let k = 0; k < 2; k++) { const sd = r.next() < 0.5 ? -1 : 1, o = th * r.range(0.6, 0.95); small.push({ x: x - uy * sd * o + r.range(-30, 30), y: 0, z: z + ux * sd * o + r.range(-30, 30), ry: r.range(0, 7), sx: r.range(20, 45), sy: r.range(14, 30), sz: r.range(20, 45) }); }
    }
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  lists.forEach((l, i) => l.length && g.add(scatter(new THREE.InstancedMesh(boulderGeo(i * 7 + 3), mat, l.length), l, true)));
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(31), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), small.length), small, true));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(70), sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.3), tufts.length), tufts, true));
  const lg = new THREE.IcosahedronGeometry(1, 1); lg.deleteAttribute('uv');
  { const p = lg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { c.setHSL(0.27 + (fbm(p.getX(i) * 4, p.getZ(i) * 4, 2) - 0.5) * 0.05, 0.55, 0.2 + Math.max(0, p.getY(i)) * 0.14); col.set([c.r, c.g, c.b], 3 * i); } lg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  g.add(scatter(new THREE.InstancedMesh(lg, sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.04), leafy.length), leafy, true));
  return g;
}

/** Bán kính bệ lãnh thổ theo loại trại. */
export const campRadius = (type) => ({ soi_da: 300, coc_reu: 250, linh_thuy: 300, hoa_nham: 300, long_ngu: 560, ho_loi: 600 }[type] || 260);

/** Bệ đá lãnh thổ cho mọi trại + đầm sen Long Ngư + đài sấm Hổ Lôi. */
export function buildCampSites(map) {
  const g = new THREE.Group(), r = rngFor(505);
  const top = flagstoneSurface().clone(); top.repeat.set(3, 3); top.needsUpdate = true;
  const topMat = new THREE.MeshLambertMaterial({ map: top, color: 0xd8d2c4 }), sideMat = new THREE.MeshLambertMaterial({ map: wallStoneSurface(false), color: 0xb8b0a0 });
  const rim = [];
  for (const c of map.camps || []) {
    const R = campRadius(c.type), def = MONSTERS[c.type];
    if (c.type === 'long_ngu') { buildPond(g, c, R, r, rim); continue; }
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.06, 22, 40, 1), [sideMat, topMat, topMat]); dais.position.set(c.x, 11, c.y); g.add(dais);
    if (def.buff && !def.boss) { // ấn khắc màu bùa giữa bệ
      const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.55, R * 0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.type === 'linh_thuy' ? 0x4fb8ff : 0xff6a2a).multiplyScalar(1.3), transparent: true, opacity: 0.75 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, 23, c.y); g.add(ring);
    }
    if (c.type === 'ho_loi') { // đài sấm: 4 cột đá đỉnh pha lê điện
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, x = c.x + Math.cos(a) * R * 0.92, z = c.y + Math.sin(a) * R * 0.92;
        const col = new THREE.Mesh(new THREE.BoxGeometry(60, 300, 60), sideMat); col.position.set(x, 150, z); col.rotation.y = -a; g.add(col);
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(40, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7ad8ff).multiplyScalar(1.6) })); cr.scale.y = 1.8; cr.position.set(x, 350, z); g.add(cr);
      }
    }
    const n = Math.round(R / 22); // viền đá quanh bệ, chừa lối vào
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (Math.cos(a - (c.side === 1 ? 0 : 0)) > 0.93) continue; rim.push({ x: c.x + Math.cos(a) * R * 1.04, y: 0, z: c.y + Math.sin(a) * R * 1.04, ry: r.range(0, 7), sx: r.range(28, 46), sy: r.range(20, 38), sz: r.range(28, 46) }); }
  }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(57), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), rim.length), rim, true));
  return g;
}

function buildPond(g, c, R, r, rim) {
  // đầm sen giữa sông: bờ đá tròn, mặt nước trong, lá sen + hoa sen
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; rim.push({ x: c.x + Math.cos(a) * R, y: 0, z: c.y + Math.sin(a) * R, ry: r.range(0, 7), sx: r.range(60, 90), sy: r.range(40, 70), sz: r.range(60, 90) }); }
  const water = new THREE.Mesh(new THREE.CircleGeometry(R * 0.96, 48), new THREE.MeshStandardMaterial({ color: 0x1f6e7a, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.88, emissive: 0x062a30 }));
  water.rotation.x = -Math.PI / 2; water.position.set(c.x, 14, c.y); g.add(water);
  const pad = new THREE.MeshLambertMaterial({ color: 0x3f8a3a, side: THREE.DoubleSide }), petal = new THREE.MeshLambertMaterial({ color: 0xf2a0c0 });
  for (let i = 0; i < 16; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(R * 0.45, R * 0.9), x = c.x + Math.cos(a) * d, z = c.y + Math.sin(a) * d, s = r.range(30, 55);
    const p = new THREE.Mesh(new THREE.CircleGeometry(s, 16, 0.4, Math.PI * 2 - 0.4), pad); p.rotation.set(-Math.PI / 2, 0, r.range(0, 7)); p.position.set(x, 16, z); g.add(p);
    if (i % 3 === 0) for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(9, 26, 4), petal); f.position.set(x + Math.cos(k) * 8, 28, z + Math.sin(k) * 8); f.rotation.set(Math.cos(k) * 0.5, 0, Math.sin(k) * 0.5); g.add(f); }
  }
}
