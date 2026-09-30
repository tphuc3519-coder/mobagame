import * as THREE from 'three';
import { pathTexture, brickTexture } from './env/textures.js';
import { buildTerrain } from './env/terrain.js';
import { buildRiver } from './env/water.js';
import { buildFoliage, buildBushes, WIND } from './env/foliage.js';
import { buildSky, buildLampGlow, buildFireflies, FOG_COLOR } from './env/sky.js';

export { FOG_COLOR };
const DENSITY = { low: 0.4, mid: 0.7, high: 1 };

/** Dựng bản đồ 1v1: địa hình có bờ dốc, đường lát đá, sông chảy, cầu đá, tường rêu, cây/đá/cỏ/hoa, đèn lồng, đom đóm, trời.
 *  Trả về { group, update(time, dt, camera, viewH) }. Toàn bộ vẽ bằng code, không có file ảnh (assets/LICENSES.md). */
export function buildMap(scene, map, level = 'mid') {
  const dens = DENSITY[level] ?? 1, g = new THREE.Group();
  const lane = map.road, rw = lane.width;
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };

  g.add(buildTerrain(map, dens));
  const sky = buildSky(); scene.add(sky);

  // đường lát đá + lề đá
  const path = pathTexture(); path.repeat.set(map.w / 380, rw / 380);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(map.w, rw), new THREE.MeshLambertMaterial({ map: path })); road.rotation.x = -Math.PI / 2; road.position.set(map.w / 2, 1.5, lane.y); g.add(road);
  const curb = new THREE.MeshLambertMaterial({ color: 0x8d8a92 });
  for (const s of [-1, 1]) box(map.w, 14, 34, curb, map.w / 2, 6, lane.y + s * (rw / 2 + 8));

  // sân lát đá quanh Suối Đèn hai phía, viền đá tròn
  for (const fx of [map.fountain.x, map.w - map.fountain.x]) {
    const pt = path.clone(); pt.repeat.set(2.2, 2.2); pt.needsUpdate = true;
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(560, 36), new THREE.MeshLambertMaterial({ map: pt })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(fx, 1.6, lane.y); g.add(plaza);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(560, 16, 5, 40), curb); ring.rotation.x = -Math.PI / 2; ring.position.set(fx, 8, lane.y); g.add(ring);
  }

  // sông + cầu đá có lan can
  const river = buildRiver(map); g.add(river.mesh);
  const stoneTop = new THREE.MeshLambertMaterial({ map: path.clone() }); stoneTop.map.repeat.set(1, rw / 380); stoneTop.map.needsUpdate = true;
  const brickSide = brickTexture(); brickSide.repeat.set(1.2, 0.2);
  const bw = map.river.width + 90;
  box(bw, 22, rw + 30, new THREE.MeshLambertMaterial({ map: brickSide }), map.river.x, 6, lane.y);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(bw - 30, rw), stoneTop); deck.rotation.x = -Math.PI / 2; deck.position.set(map.river.x, 18, lane.y); g.add(deck);
  const rail = new THREE.MeshLambertMaterial({ color: 0xa9a4ae });
  for (const s of [-1, 1]) { box(bw, 46, 26, rail, map.river.x, 40, lane.y + s * (rw / 2 + 4)); box(bw + 16, 12, 38, curb, map.river.x, 66, lane.y + s * (rw / 2 + 4)); }

  // tường rêu: hai dải dọc đường, có khe hở (03 §B3)
  const wl = map.walls, H = 120, capMat = new THREE.MeshLambertMaterial({ color: 0x9a97a6 });
  for (const wy of wl.ys) {
    let x0 = -400;
    for (const gap of [...wl.gaps, { x: map.river.x, w: map.river.width + 130, river: true }, { x: map.w + 550, w: 0 }].sort((a, b) => a.x - b.x)) {
      const x1 = Math.min(map.w + 400, gap.x - gap.w / 2);
      if (x1 > x0) {
        const t = brickTexture(); t.repeat.set((x1 - x0) / 300, H / 300);
        box(x1 - x0, H, wl.thickness, new THREE.MeshLambertMaterial({ map: t }), (x0 + x1) / 2, H / 2, wy);
        box(x1 - x0 + 14, 26, wl.thickness + 26, capMat, (x0 + x1) / 2, H + 10, wy);
      }
      if (gap.river) for (const sx of [-1, 1]) box(60, H + 50, wl.thickness + 40, capMat, gap.x + sx * (gap.w / 2 + 20), (H + 50) / 2, wy); // trụ đá đỡ đầu tường hai bờ sông
      x0 = gap.x + gap.w / 2;
    }
  }

  g.add(buildBushes(map));
  g.add(buildFoliage(map, dens));

  // đèn lồng dọc hai mép đường: cột gỗ + lồng giấy phát sáng; quầng sáng gộp một Points
  const posts = [];
  for (let x = 400; x < map.w; x += 400) for (const s of [-1, 1]) if (Math.abs(x - map.river.x) > 60) posts.push({ x, z: lane.y + s * 500, y: 215, base: H + 22 });
  for (const s of [-1, 1]) for (const dx of [-1, 1]) posts.push({ x: map.river.x + dx * (bw / 2 - 20), z: lane.y + s * (rw / 2 + 4), y: 150, base: 66 });
  const d = new THREE.Object3D();
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(6, 9, 1, 6), new THREE.MeshLambertMaterial({ color: 0x5a3f2c }), posts.length);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(32, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(2.2) }), posts.length);
  const cap = new THREE.InstancedMesh(new THREE.ConeGeometry(30, 16, 8), new THREE.MeshLambertMaterial({ color: 0x8a3a2c }), posts.length);
  posts.forEach((p, i) => {
    const len = p.y - p.base;
    d.scale.set(1, len, 1); d.position.set(p.x, p.base + len / 2, p.z); d.updateMatrix(); pole.setMatrixAt(i, d.matrix);
    d.scale.set(1, 1.3, 1); d.position.set(p.x, p.y + 20, p.z); d.updateMatrix(); lamp.setMatrixAt(i, d.matrix);
    d.scale.set(1, 1, 1); d.position.set(p.x, p.y + 68, p.z); d.updateMatrix(); cap.setMatrixAt(i, d.matrix);
  });
  g.add(pole, lamp, cap, buildLampGlow(posts));

  const flies = buildFireflies(map, Math.round(160 * dens)); g.add(flies.object);
  scene.add(g);
  return {
    group: g,
    update(t, dt, camera, viewH) { WIND.value = t; river.update(t); flies.update(t, viewH); sky.position.copy(camera.position); },
  };
}
