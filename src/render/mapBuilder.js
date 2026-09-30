import * as THREE from 'three';
import { mirrorX } from '../data/maps.js';

/** Dựng bản đồ 1v1 từ dữ liệu: nền, đường, khe nước, cầu, tường (đùn khối), bụi cỏ (instancing), đèn lồng trang trí (instancing). */
export function buildMap(scene, map) {
  const g = new THREE.Group();
  const plane = (w, h, color, x, z, y = 0, extra = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color, ...extra }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
  };
  plane(map.w + 1600, map.h + 1600, 0x14261d, map.w / 2, map.h / 2, -2);
  plane(map.w, map.road.width, 0x7a6d58, map.w / 2, map.road.y, 0);
  plane(map.w, 30, 0x4a4136, map.w / 2, map.road.y - map.road.width / 2, 1);
  plane(map.w, 30, 0x4a4136, map.w / 2, map.road.y + map.road.width / 2, 1);
  plane(map.river.width, map.h, 0x1d4f7a, map.river.x, map.h / 2, 2, { emissive: 0x0a2a48 });
  plane(map.river.width + 70, map.road.width, 0x8b7d66, map.river.x, map.road.y, 3);
  plane(map.river.width, map.road.width - 60, 0x9a8b72, map.river.x, map.road.y, 4);
  for (let i = 0; i < 8; i++) plane(6, map.road.width - 80, 0x8f826c, 700 + i * 600, map.road.y, 1.5);

  // tường: hai dải dọc đường, có khe hở (03 §B3)
  const wl = map.walls, wallMat = new THREE.MeshLambertMaterial({ color: 0x5e5a52 });
  for (const wy of wl.ys) {
    let x0 = 0;
    for (const gap of [...wl.gaps, { x: map.w + 150, w: 0 }].sort((a, b) => a.x - b.x)) {
      const x1 = Math.min(map.w, gap.x - gap.w / 2);
      if (x1 > x0) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 300, wl.thickness), wallMat); m.position.set((x0 + x1) / 2, 150, wy); g.add(m); }
      x0 = gap.x + gap.w / 2;
    }
  }
  // bụi cỏ: cụm cầu dẹt bằng InstancedMesh (đối xứng phía Đỏ)
  const rects = map.bushes.flatMap((b) => [b, { ...b, x: mirrorX(b.x) }]);
  const bushGeo = new THREE.SphereGeometry(1, 7, 5), bushes = new THREE.InstancedMesh(bushGeo, new THREE.MeshLambertMaterial({ color: 0x2f7a3a }), rects.length * 40);
  const dummy = new THREE.Object3D(); let n = 0;
  for (const r of rects) for (let i = 0; i < 40; i++) {
    const sx = 40 + ((i * 37) % 30), h = 60 + ((i * 53) % 70);
    dummy.position.set(r.x + (((i * 97) % 100) / 100 - 0.5) * r.w, h * 0.4, r.y + (((i * 61) % 100) / 100 - 0.5) * r.h); dummy.scale.set(sx, h, sx); dummy.updateMatrix(); bushes.setMatrixAt(n++, dummy.matrix);
  }
  g.add(bushes);
  // đèn lồng trang trí dọc hai mép đường (instancing, phát sáng bằng vật liệu không chịu ánh sáng)
  const posts = [];
  for (let x = 400; x < map.w; x += 400) for (const s of [-1, 1]) if (Math.abs(x - map.river.x) > 260) posts.push([x, map.road.y + s * (map.road.width / 2 + 40)]);
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(6, 8, 200, 5), new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), posts.length);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc15e }), posts.length);
  posts.forEach(([x, z], i) => { dummy.scale.set(1, 1, 1); dummy.position.set(x, 100, z); dummy.updateMatrix(); pole.setMatrixAt(i, dummy.matrix); dummy.position.set(x, 210, z); dummy.updateMatrix(); lamp.setMatrixAt(i, dummy.matrix); });
  g.add(pole, lamp);
  scene.add(g);
  return g;
}
