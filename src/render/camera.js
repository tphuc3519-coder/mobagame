import * as THREE from 'three';
import { lerp } from '../core/math.js';

// Camera trận (02 §13.2): FOV 45°, nghiêng 55°, khoảng cách 2400 (gốc 2000/38°; các vòng thử 1300 và 1650 vẫn chật); ?camdist= để thử. Đội Đỏ xoay 180° ở Mốc sau.
export const CAM_DISTANCE = 2400, CAM_FOV = 45;
export function createCamera({ distance = CAM_DISTANCE, pitchDeg = 55, fov = CAM_FOV } = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 50, 11000);
  const pitch = pitchDeg * Math.PI / 180;
  const target = new THREE.Vector3();
  const state = { init: false };
  return {
    camera,
    /** Theo mục tiêu với độ trễ mượt (lerp 12/s), lệch nhẹ về hướng joystick. */
    follow(x, z, dirX, dirZ, dt) {
      const tx = x + dirX * 120, tz = z + dirZ * 120;
      const k = state.init ? 1 - Math.exp(-12 * dt) : 1;
      state.init = true;
      target.x = lerp(target.x, tx, k); target.z = lerp(target.z, tz, k);
      camera.position.set(target.x, Math.sin(pitch) * distance, target.z + Math.cos(pitch) * distance);
      camera.lookAt(target.x, 0, target.z);
    },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
  };
}
