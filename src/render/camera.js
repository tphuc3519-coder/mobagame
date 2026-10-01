import * as THREE from 'three';
import { lerp } from '../core/math.js';

// Camera trận (02 §13.2): FOV 38°, nghiêng 55°. Khoảng cách 1300 (trước là 2000) để tập trung vào tướng; ?camdist= để thử. Đội Đỏ xoay 180° ở Mốc sau.
export const CAM_DISTANCE = 1300;
export function createCamera({ distance = CAM_DISTANCE, pitchDeg = 55, fov = 38 } = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 50, 8000);
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
