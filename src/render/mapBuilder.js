import * as THREE from 'three';

/** Dựng bản đồ 1v1 trống: nền, đường, khe nước. (Tường, bụi, trụ ở Mốc 3.) */
export function buildMap(scene, map) {
  const g = new THREE.Group();
  const plane = (w, h, color, x, z, y = 0, extra = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color, ...extra }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
  };
  plane(map.w + 1600, map.h + 1600, 0x14261d, map.w / 2, map.h / 2, -2);                     // nền rừng đêm
  plane(map.w, map.road.width, 0x7a6d58, map.w / 2, map.road.y, 0);                            // đường đá
  plane(map.w, 30, 0x4a4136, map.w / 2, map.road.y - map.road.width / 2, 1);                  // mép đường
  plane(map.w, 30, 0x4a4136, map.w / 2, map.road.y + map.road.width / 2, 1);
  plane(map.river.width, map.h, 0x1d4f7a, map.river.x, map.h / 2, 2, { emissive: 0x0a2a48 });  // khe nước
  plane(map.river.width + 70, map.road.width, 0x8b7d66, map.river.x, map.road.y, 3);           // cầu đá
  plane(map.river.width, map.road.width - 60, 0x9a8b72, map.river.x, map.road.y, 4);
  for (let i = 0; i < 8; i++) { // vạch ô để nhìn rõ chuyển động
    const x = 700 + i * 600;
    plane(6, map.road.width - 80, 0x8f826c, x, map.road.y, 1.5);
  }
  scene.add(g);
  return g;
}
