import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { heightAt } from './terrain.js';

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
const nonIndexed = (g) => (g.index ? g.toNonIndexed() : g);

function treeGeo() {
  const trunk = new THREE.CylinderGeometry(12, 22, 230, 6); trunk.translate(0, 115, 0); paint(trunk, (t) => C(0.07, 0.4, 0.25 + t * 0.06));
  const blob = (r, x, y, z, hue) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, 0.85, 1); g.translate(x, y, z); return paint(g, (t, ny) => C(hue + ny * 0.02, 0.6, 0.30 + Math.max(0, ny) * 0.24 + t * 0.06)); };
  return mergeGeometries([trunk, blob(120, 0, 270, 0, 0.33), blob(92, 55, 350, 25, 0.29), blob(80, -45, 385, -20, 0.27), blob(58, 10, 450, 8, 0.25)].map(nonIndexed));
}
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.75 + fbm(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i) + seed) * 0.6; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k); }
  g.computeVertexNormals();
  return paint(g.toNonIndexed(), (t, ny, x, z) => C(0.64 + fbm(x * 3, z * 3) * 0.1, 0.2, 0.26 + Math.max(0, ny) * 0.2));
}
function tuftGeo(tall) {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + i, h = tall * (0.65 + 0.35 * ((i * 37) % 10) / 10), g = new THREE.ConeGeometry(7, h, 3, 1); g.translate(0, h / 2, 0);
    g.rotateZ(0.32 + (i % 3) * 0.14); g.rotateY(a); g.translate(Math.cos(a) * 8, 0, Math.sin(a) * 8); parts.push(paint(g, (t) => C(0.27 + t * 0.06, 0.65, 0.24 + t * 0.34)));
  }
  return mergeGeometries(parts.map(nonIndexed));
}
function flowerGeo() { const g = new THREE.IcosahedronGeometry(9, 0); g.translate(0, 34, 0); const s = new THREE.CylinderGeometry(1.6, 1.6, 34, 3); s.translate(0, 17, 0); return mergeGeometries([paint(g, () => C(0, 0, 1)), paint(s, () => C(0.3, 0.6, 0.3))].map(nonIndexed)); }

function scatter(mesh, list, fill) {
  const d = new THREE.Object3D(); const c = new THREE.Color();
  list.forEach((it, i) => { d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); d.scale.set(it.sx, it.sy ?? it.sx, it.sz ?? it.sx); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); if (it.color) mesh.setColorAt(i, c.set(it.color)); else if (fill) mesh.setColorAt(i, c.set(0xffffff)); });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Cây, đá, cỏ, hoa quanh đường; đông ở ngoài tường, thưa hai bên đường; chừa lối vào khe (03 §B1). */
export function buildFoliage(map, density = 1) {
  const g = new THREE.Group(), r = rngFor(101), R = map.road;
  const dzOf = (z) => Math.abs(z - R.y), inGap = (x) => map.walls.gaps.some((gp) => Math.abs(x - gp.x) < gp.w / 2 + 260);
  const put = (n, ok, make) => { const out = []; for (let t = 0; out.length < n && t < n * 30; t++) { const x = r.range(-1400, map.w + 1400), z = r.range(-1700, map.h + 1700); if (!ok(x, z)) continue; out.push(make(x, heightAt(map, x, z), z)); } return out; };
  const nearRiver = (x, m = 380) => Math.abs(x - map.river.x) < m;

  const trees = put(Math.round(230 * density), (x, z) => (z < R.y ? dzOf(z) > 800 : dzOf(z) > 1500) && !(inGap(x) && dzOf(z) < 1500) && !nearRiver(x, 330), (x, y, z) => ({ x, y: y - 8, z, ry: r.range(0, 7), sx: r.range(0.85, 1.55), sy: r.range(0.9, 1.7), sz: 0 }));
  trees.forEach((t) => { t.sz = t.sx; });
  g.add(scatter(new THREE.InstancedMesh(treeGeo(), sway(new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x7f9f7c }), 0.06), trees.length), trees, true));

  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x9a9eb4 });
  for (const [seed, n] of [[1, 0.5], [7, 0.5]]) {
    const rocks = put(Math.round(110 * density * n), (x, z) => (dzOf(z) > 620 && !(inGap(x) && dzOf(z) < 1200)) || (nearRiver(x, 330) && dzOf(z) > 470), (x, y, z) => { const k = z > R.y ? 0.55 : 1; return { x, y: y + 6, z, ry: r.range(0, 7), sx: r.range(40, 150) * k, sy: r.range(30, 110) * k, sz: r.range(40, 150) * k, color: r.next() < 0.3 ? 0xd8c8ff : 0xffffff }; });
    g.add(scatter(new THREE.InstancedMesh(rockGeo(seed), rockMat, rocks.length), rocks, true));
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

  const tuftMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 0xb8d2a8 }), 0.35);
  const tufts = put(Math.round(900 * density), (x, z) => dzOf(z) > 455 && !nearRiver(x, 250), (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.9, 1.7), sy: r.range(0.8, 1.9), sz: r.range(0.9, 1.7) }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, tufts.length), tufts, true));
  const reeds = put(Math.round(160 * density), (x, z) => nearRiver(x, 290) && !nearRiver(x, 215) && dzOf(z) > 470, (x, y, z) => ({ x, y: y + 20, z, ry: r.range(0, 7), sx: 1.1, sy: r.range(1.4, 2.5), sz: 1.1 }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, reeds.length), reeds, true));
  const pal = [0xff8fb8, 0xffd25e, 0xffffff, 0xff9d5c, 0xb99cff];
  const flowers = put(Math.round(420 * density), (x, z) => dzOf(z) > 455 && !nearRiver(x, 240) && fbm(x / 300, z / 300) > 0.55, (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.8, 1.4), color: pal[r.int(pal.length)] }));
  g.add(scatter(new THREE.InstancedMesh(flowerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowers.length), flowers, true));
  return g;
}

/** Bụi cỏ chơi được: cụm bụi dày, tối hơn nền để nhìn ra vùng ẩn nấp. */
export function buildBushes(map) {
  const g = new THREE.Group(), r = rngFor(202);
  const rects = map.bushes.flatMap((b) => [b, { ...b, x: map.w - b.x }]);
  const blobs = [], tufts = [];
  for (const b of rects) {
    for (let i = 0; i < 26; i++) blobs.push({ x: b.x + r.range(-0.5, 0.5) * b.w, y: r.range(30, 50), z: b.y + r.range(-0.5, 0.5) * b.h, ry: r.range(0, 7), sx: r.range(42, 72), sy: r.range(38, 62), sz: r.range(42, 72), color: [0x59c66a, 0x3ea85a, 0x7ad46b][r.int(3)] });
    for (let i = 0; i < 14; i++) tufts.push({ x: b.x + r.range(-0.55, 0.55) * b.w, y: 0, z: b.y + r.range(-0.55, 0.55) * b.h, ry: r.range(0, 7), sx: 1.6, sy: r.range(1.6, 2.4), sz: 1.6 });
  }
  const bg = new THREE.IcosahedronGeometry(1, 1); paint(bg, (t, ny) => C(0.31, 0.62, 0.34 + Math.max(0, ny) * 0.26));
  g.add(scatter(new THREE.InstancedMesh((bg.index ? bg.toNonIndexed() : bg), sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.05), blobs.length), blobs, true));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.3), tufts.length), tufts, true));
  return g;
}
