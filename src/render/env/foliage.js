import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { heightAt } from './terrain.js';
import { buildTrees } from './trees.js';

export const WIND = { value: 0 };

/** Gió: đung đưa đỉnh cây/cỏ theo vị trí từng bản sao (không cần xương). */
function sway(mat, amp) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
       float ph = instanceMatrix[3].x * 0.013 + instanceMatrix[3].z * 0.011; float hg = max(position.y, 0.0);
       transformed.x += sin(uWind * 1.7 + ph) * hg * ${amp.toFixed(4)}; transformed.z += cos(uWind * 1.3 + ph * 1.3) * hg * ${(amp * 0.6).toFixed(4)};
       #endif`);
  };
  mat.customProgramCacheKey = () => 'sway' + amp;
  return mat;
}

function paint(geo, fn) { // fn(y01, ny, x, z) → Color
  const p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3);
  geo.computeBoundingBox(); const y0 = geo.boundingBox.min.y, span = geo.boundingBox.max.y - y0 || 1;
  for (let i = 0; i < p.count; i++) { const c = fn((p.getY(i) - y0) / span, n.getY(i), p.getX(i), p.getZ(i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
const C = (h, s, l) => new THREE.Color().setHSL(h, s, l);
const nonIndexed = (g) => { const h = g.index ? g.toNonIndexed() : g; if (h.attributes.uv) h.deleteAttribute('uv'); return h; }; // bỏ uv: cây cỏ chỉ dùng màu đỉnh

/** Biến dạng khối cầu bằng nhiễu để mép tán/đá gồ ghề tự nhiên. */
function lumpy(g0, amp, seed, f = 1.6) {
  g0.deleteAttribute('normal'); g0.deleteAttribute('uv'); const g = mergeVertices(g0); // hàn đỉnh → pháp tuyến mượt (tán lá tròn trịa, không gãy cạnh)
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * f / 100 + seed, z * f / 100 + y * f / 100 + seed * 1.7, 3) - 0.5) * amp; p.setXYZ(i, x * k, y * k, z * k); }
  g.computeVertexNormals(); return g;
}

/** Cây lá rộng: thân hơi cong + 3 cành, tán gồm nhiều cụm lá gồ ghề; màu đỉnh: tối trong lòng tán và mặt dưới, sáng ngả vàng ở đỉnh nắng. */
function treeGeo() {
  const trunk = new THREE.CylinderGeometry(11, 24, 240, 7, 4); trunk.translate(0, 120, 0);
  { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y / 90) * 10); } trunk.computeVertexNormals(); }
  paint(trunk, (t, ny, x, z) => C(0.07, 0.32, 0.17 + t * 0.07 + fbm(x / 6, z / 6 + t * 8) * 0.06));
  const branch = (a, len, y) => { const g = new THREE.CylinderGeometry(4, 8, len, 5); g.translate(0, len / 2, 0); g.rotateZ(0.9); g.rotateY(a); g.translate(0, y, 0); return paint(g, () => C(0.07, 0.3, 0.2)); };
  const blobs = [[0, 290, 0, 125], [70, 330, 40, 100], [-75, 320, -30, 104], [30, 345, -80, 92], [-40, 360, 70, 90], [0, 420, 0, 100], [20, 480, -10, 66]];
  const parts = blobs.map(([x, y, z, r], i) => {
    const g = lumpy(new THREE.IcosahedronGeometry(r, 1), 0.42, i * 3.1); g.scale(1, 0.82, 1); g.translate(x, y, z);
    return paint(g, (t, ny, vx, vz) => {
      const p = g.attributes.position; void p;
      const inner = Math.min(1, Math.hypot(vx, vz) / 170); // xa trục = mép tán, sáng hơn
      const up = Math.max(0, ny), sp = fbm(vx / 14 + i, vz / 14 + y / 30, 2); // lốm đốm như chùm lá
      return C(0.29 - up * 0.04 + (sp - 0.5) * 0.05, 0.58 + up * 0.06, 0.07 + up * 0.11 + inner * 0.04 + (sp - 0.5) * 0.08 + (y > 400 ? 0.02 : 0));
    });
  });
  return mergeGeometries([trunk, branch(0.5, 120, 170), branch(2.6, 110, 190), branch(4.4, 100, 210), ...parts].map(nonIndexed));
}
/** Cây thông: thân thẳng + 5 tầng nón răng cưa, xanh lam sẫm. */
function pineGeo() {
  const trunk = new THREE.CylinderGeometry(9, 18, 200, 6); trunk.translate(0, 100, 0); paint(trunk, (t) => C(0.06, 0.35, 0.16 + t * 0.06));
  const tiers = [[150, 200, 170], [128, 175, 270], [104, 150, 360], [78, 125, 440], [48, 100, 510]].map(([r, h, y], i) => {
    const g = new THREE.ConeGeometry(r, h, 9, 1, true); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const yy = p.getY(k); if (yy < -h / 2 + 1) { const a = Math.atan2(p.getZ(k), p.getX(k)), j = 1 + 0.18 * Math.sin(a * 9 + i) ; p.setX(k, p.getX(k) * j); p.setZ(k, p.getZ(k) * j); p.setY(k, yy - 14 * (0.5 + 0.5 * Math.sin(a * 9 + i))); } }
    g.computeVertexNormals(); g.translate(0, y, 0);
    return paint(g, (t, ny, x, z) => C(0.4 + (fbm(x / 20, z / 20 + i) - 0.5) * 0.04, 0.42, 0.1 + t * 0.12 + Math.max(0, ny) * 0.06));
  });
  return mergeGeometries([trunk, ...tiers].map(nonIndexed));
}
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.72 + fbm(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i) + seed) * 0.62; p.setXYZ(i, p.getX(i) * k, Math.max(-0.35, p.getY(i)) * k * 0.72, p.getZ(i) * k); }
  g.computeVertexNormals();
  return paint(g.toNonIndexed(), (t, ny, x, z) => {
    const n = fbm(x * 4 + seed, z * 4, 3), base = C(0.09 + n * 0.03, 0.08 + n * 0.06, 0.3 + n * 0.12 + Math.max(0, ny) * 0.1); // xám ấm, vân đá
    return ny > 0.55 && n > 0.45 ? base.lerp(C(0.24, 0.4, 0.26), Math.min(1, (ny - 0.55) * 2.4)) : base;   // rêu trên mặt đá
  });
}
function tuftGeo(tall) {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + i, h = tall * (0.55 + 0.45 * ((i * 37) % 10) / 10), g = new THREE.ConeGeometry(5, h, 3, 1); g.translate(0, h / 2, 0);
    g.rotateZ(0.28 + (i % 3) * 0.16); g.rotateY(a); g.translate(Math.cos(a) * 7, 0, Math.sin(a) * 7); parts.push(paint(g, (t) => C(0.23 + t * 0.04, 0.5, 0.16 + t * 0.26)));
  }
  return mergeGeometries(parts.map(nonIndexed));
}
function flowerGeo() { const g = new THREE.IcosahedronGeometry(6, 0); g.translate(0, 26, 0); const s = new THREE.CylinderGeometry(1.2, 1.2, 26, 3); s.translate(0, 13, 0); return mergeGeometries([paint(g, () => C(0, 0, 0.92)), paint(s, () => C(0.28, 0.5, 0.25))].map(nonIndexed)); }

function scatter(mesh, list, fill) {
  const d = new THREE.Object3D(); const c = new THREE.Color();
  list.forEach((it, i) => { d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); d.scale.set(it.sx, it.sy ?? it.sx, it.sz ?? it.sx); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); if (it.color) mesh.setColorAt(i, c.set(it.color)); else if (fill) mesh.setColorAt(i, c.set(0xffffff)); });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Rải theo ô vùng: mỗi ô một InstancedMesh có khối bao riêng → ô ngoài màn hình bị bỏ qua (frustum culling), đỡ cho máy yếu. */
function scatterChunked(geo, mat, list, fill, cell = 3200) {
  const grp = new THREE.Group(), bins = new Map();
  for (const it of list) { const k = Math.floor(it.x / cell) + ',' + Math.floor(it.z / cell); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(it); }
  for (const items of bins.values()) { const m = scatter(new THREE.InstancedMesh(geo, mat, items.length), items, fill); m.computeBoundingSphere(); grp.add(m); }
  return grp;
}

export { sway, treeGeo, pineGeo, rockGeo, tuftGeo, flowerGeo, scatter, scatterChunked, lumpy };

/** Cây, đá, cỏ, hoa quanh đường; đông ở ngoài tường, thưa hai bên đường; chừa lối vào khe (03 §B1). */
export function buildFoliage(map, density = 1) {
  const g = new THREE.Group(), r = rngFor(101), R = map.road;
  const dzOf = (z) => Math.abs(z - R.y), inGap = (x) => map.walls.gaps.some((gp) => Math.abs(x - gp.x) < gp.w / 2 + 260);
  const put = (n, ok, make) => { const out = []; for (let t = 0; out.length < n && t < n * 30; t++) { const x = r.range(-1400, map.w + 1400), z = r.range(-1700, map.h + 1700); if (!ok(x, z)) continue; out.push(make(x, heightAt(map, x, z), z)); } return out; };
  const nearRiver = (x, m = 380) => Math.abs(x - map.river.x) < m;

  const trees = put(Math.round(160 * density), (x, z) => (z < R.y ? dzOf(z) > 800 : dzOf(z) > 1500) && !(inGap(x) && dzOf(z) < 1500) && !nearRiver(x, 330), (x, y, z) => ({ x, y: y - 8, z, ry: r.range(0, 7), sx: r.range(0.85, 1.55), sy: r.range(0.9, 1.7), sz: 0 }));
  const tint = new THREE.Color();
  trees.forEach((t) => { t.sz = t.sx; t.pine = fbm(t.x / 1600 + 9, t.z / 1600) > 0.56 || r.next() < 0.15; t.color = tint.setRGB(r.range(0.86, 1.0), r.range(0.9, 1.0), r.range(0.8, 0.96), THREE.SRGBColorSpace).getHex(); });
  trees.forEach((t) => { t.type = t.pine ? 'pine' : r.next() < 0.4 ? 'tall' : r.next() < 0.12 ? 'blossom' : 'oak'; t.sy = t.sx; });
  g.add(buildTrees(trees, density));
  const casters = trees.map((t) => ({ x: t.x, z: t.z, r: 150 * t.sx, h: 420 * (t.sy || t.sx), k: 0.6 }));

  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0xb4ad9e });
  for (const [seed, n] of [[1, 0.5], [7, 0.5]]) {
    const rocks = put(Math.round(110 * density * n), (x, z) => (dzOf(z) > 620 && !(inGap(x) && dzOf(z) < 1200)) || (nearRiver(x, 330) && dzOf(z) > 470), (x, y, z) => { const k = z > R.y ? 0.55 : 1; return { x, y: y + 6, z, ry: r.range(0, 7), sx: r.range(40, 150) * k, sy: r.range(30, 110) * k, sz: r.range(40, 150) * k, color: r.next() < 0.3 ? 0xc8d0b0 : 0xffffff }; });
    g.add(scatter(new THREE.InstancedMesh(rockGeo(seed), rockMat, rocks.length), rocks, true)); casters.push(...rocks.map((q) => ({ x: q.x, z: q.z, r: q.sx * 0.9, h: q.sy * 1.2, k: 0.45 })));
  }
  // vách đá lớn hai đầu bản đồ, sau chuồng
  const cliffs = [];
  for (const side of [-1, 1]) for (let i = 0; i < 22; i++) cliffs.push({ x: side < 0 ? r.range(-1000, -260) : map.w + r.range(260, 1000), y: 40, z: r.range(-300, map.h + 300), ry: r.range(0, 7), sx: r.range(110, 260), sy: r.range(120, 300), sz: r.range(110, 260) });
  g.add(scatter(new THREE.InstancedMesh(rockGeo(5), rockMat, cliffs.length), cliffs, true));
  // đá chặn chân tường và ôm quanh khe — khung lối vào
  const rimRocks = [];
  for (const wy of map.walls.ys) for (let x = -300; x < map.w + 300; x += 210) { if (map.walls.gaps.some((gp) => Math.abs(x - gp.x) < gp.w / 2 + 20)) continue; const s = wy < R.y ? -1 : 1; rimRocks.push({ x: x + r.range(-40, 40), y: 0, z: wy + s * r.range(60, 130), ry: r.range(0, 7), sx: r.range(45, 85), sy: r.range(35, 70), sz: r.range(45, 85) }); }
  for (const gp of map.walls.gaps) for (const wy of map.walls.ys) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) rimRocks.push({ x: gp.x + sx * (gp.w / 2 + 40 + k * 30), y: 0, z: wy + (wy < R.y ? -1 : 1) * (k * 45 - 20), ry: r.range(0, 7), sx: r.range(55, 100), sy: r.range(50, 90), sz: r.range(55, 100) });
  g.add(scatter(new THREE.InstancedMesh(rockGeo(3), rockMat, rimRocks.length), rimRocks, true));

  const tuftMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.35);
  const tufts = put(Math.round(900 * density), (x, z) => dzOf(z) > 455 && !nearRiver(x, 250), (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.9, 1.7), sy: r.range(0.8, 1.9), sz: r.range(0.9, 1.7) }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, tufts.length), tufts, true));
  const reeds = put(Math.round(160 * density), (x, z) => nearRiver(x, 290) && !nearRiver(x, 215) && dzOf(z) > 470, (x, y, z) => ({ x, y: y + 20, z, ry: r.range(0, 7), sx: 1.1, sy: r.range(1.4, 2.5), sz: 1.1 }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, reeds.length), reeds, true));
  const pal = [0xe8a0b8, 0xf0d070, 0xf4f0e8, 0xe8a070, 0xc0b0e8];
  const flowers = put(Math.round(260 * density), (x, z) => dzOf(z) > 455 && !nearRiver(x, 240) && fbm(x / 300, z / 300) > 0.55, (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.8, 1.4), color: pal[r.int(pal.length)] }));
  g.add(scatter(new THREE.InstancedMesh(flowerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowers.length), flowers, true));
  g.userData.casters = casters; // cho bóng nướng sẵn trên nền (ground.js)
  return g;
}
