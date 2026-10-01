import { bushRects } from '../../data/maps.js';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { buildGrass } from './grass.js';

// Bụi núp (vùng giấu tầm nhìn) kiểu Liên Quân: cỏ lá dài cao rậm (khóm thẻ cỏ, env/grass.js) phủ theo vòm siêu elip của vùng bụi.

/** Điểm trên vòm bụi: u, v ∈ [-1, 1] (theo hình chữ nhật), trả về chiều cao vòm (0 ở mép). Siêu elip bậc 4 phủ gần kín góc chữ nhật. */
const dome = (u, v) => { const e = Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4); return e >= 1 ? 0 : Math.pow(1 - e, 0.35); };

/** Dựng toàn bộ bụi của bản đồ: cỏ lá dài kiểu Liên Quân — hàng trăm khóm cỏ cao rậm phủ kín vùng bụi (giữa cao, mép thấp),
 *  lõi tối thấp bên dưới che chân khóm. density: 0.4..1 (mức đồ hoạ). */
export function buildBushes(map, density = 1) {
  const r = rngFor(202), rects = bushRects(map), clumps = [], core = [], col = new THREE.Color();
  for (const b of rects) {
    let cx = b.x, cz = b.y, ca = 1, sa = 0, hw = b.w / 2, hh = b.h / 2, half = 0, shape = dome;
    if (b.cap) {
      const dx = b.cap[2] - b.cap[0], dz = b.cap[3] - b.cap[1], L = Math.hypot(dx, dz);
      ca = dx / L; sa = dz / L; half = L / 2; hw = half + b.r; hh = b.r;
      shape = (u, v) => { const ax = Math.max(0, Math.abs(u * hw) - half), d = Math.hypot(ax, v * hh) / b.r; return d >= 1 ? 0 : Math.pow(1 - Math.pow(d, 4), 0.35); };
    }
    const toW = (lx, lz) => [cx + lx * ca - lz * sa, cz + lx * sa + lz * ca];
    const H = Math.min(270, 170 + Math.min(hw, hh) * 0.2) * (b.big ? 1.1 : 1);
    if (b.cap) for (let k = 0; k <= 4; k++) { const [x, z] = toW(-half + (2 * half * k) / 4, 0); core.push({ x, z, sx: hh * 0.85, sz: hh * 0.85, h: H * 0.35 }); }
    else core.push({ x: cx, z: cz, sx: hw * 0.85, sz: hh * 0.85, h: H * 0.35 });
    const step = 64 / Math.sqrt(density);
    for (let gx = -hw; gx <= hw; gx += step) for (let gz = -hh; gz <= hh; gz += step) {
      const u = (gx + r.range(-0.45, 0.45) * step) / hw, v = (gz + r.range(-0.45, 0.45) * step) / hh, d = shape(u, v); if (d <= 0.05) continue;
      const [x, z] = toW(u * hw, v * hh), hue = (fbm(x / 260, z / 260, 2) - 0.5) * 0.06;
      col.setHSL(0.26 + hue, 0.55 + r.range(0, 0.15), 0.5 + d * 0.12 + r.range(-0.05, 0.05)); // ngọn nắng sáng hơn ở giữa
      clumps.push({ x, y: b.river ? 10 : 0, z, ry: r.range(0, Math.PI * 2), sx: r.range(150, 210), sy: H * (0.55 + 0.45 * d) * r.range(0.88, 1.12), color: col.getHex() });
    }
  }
  const g = new THREE.Group();
  g.add(buildGrass(clumps, 'bush', 22));
  // lõi tối thấp: che khe chân khóm, làm bụi "đặc"
  const cg0 = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); cg0.deleteAttribute('uv'); cg0.deleteAttribute('normal');
  const cg = mergeVertices(cg0); cg.computeVertexNormals();
  const coreMesh = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0x1d4a1c }), core.length), d = new THREE.Object3D();
  core.forEach((c, i) => { d.position.set(c.x, 0, c.z); d.scale.set(c.sx, c.h, c.sz); d.updateMatrix(); coreMesh.setMatrixAt(i, d.matrix); });
  g.add(coreMesh);
  // bụi giữa sông mọc trên cồn bùn: đĩa đất gồ ghề nhô khỏi mặt nước, viền đá cuội
  const islets = rects.filter((b) => b.river); // bụi bờ sông (bank) mọc ngay mép nước, không cần cồn
  if (islets.length) {
    const ig0 = new THREE.CylinderGeometry(1, 1.12, 1, 28, 1); ig0.deleteAttribute('uv'); ig0.deleteAttribute('normal'); const ig = mergeVertices(ig0);
    { const p = ig.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + (fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2, 3) - 0.5) * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } ig.computeVertexNormals(); }
    const im = new THREE.InstancedMesh(ig, new THREE.MeshLambertMaterial({ color: 0x6a5a42 }), islets.length);
    islets.forEach((b, i) => { if (b.cap) { const dx = b.cap[2] - b.cap[0], dz = b.cap[3] - b.cap[1], L = Math.hypot(dx, dz); d.position.set(b.x, 4, b.y); d.rotation.set(0, -Math.atan2(dz, dx), 0); d.scale.set(L / 2 + b.r * 1.05, 16, b.r * 1.15); } else { d.position.set(b.x, 4, b.y); d.rotation.set(0, i, 0); d.scale.set(b.w * 0.62, 16, b.h * 0.62); } d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    g.add(im);
  }
  return g;
}
