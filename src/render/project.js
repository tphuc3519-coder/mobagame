import * as THREE from 'three';

const v = new THREE.Vector3();
/** 3D → toạ độ màn hình (pixel CSS) cho HUD. */
export function project(camera, x, y, z, w, h) {
  v.set(x, y, z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
}
