import * as THREE from 'three';
import { lerp } from '../core/math.js';

// Camera trận (02 §13.2): FOV 45°, nghiêng 55°, khoảng cách 2400 (gốc 2000/38°; các vòng thử 1300 và 1650 vẫn chật); ?camdist= để thử. Đội Đỏ xoay 180° ở Mốc sau.
export const CAM_DISTANCE = 2400, CAM_FOV = 45;
export function createCamera({ distance = CAM_DISTANCE, pitchDeg = 55, fov = CAM_FOV } = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 50, 11000);
  const pitch = pitchDeg * Math.PI / 180;
  const target = new THREE.Vector3();
  const state = { init: false, shake: 0, shakeT: 0 };
  return {
    camera,
    target,
    /** Theo mục tiêu với độ trễ mượt (lerp 12/s), lệch nhẹ về hướng joystick.
     *  look = {x, z, rate}: nhìn chỗ khác (giữ bản đồ nhỏ / kéo camera) — thả ra thì trượt về tướng. */
    follow(x, z, dirX, dirZ, dt, look = null) {
      const tx = look ? look.x : x + dirX * 120, tz = look ? look.z : z + dirZ * 120;
      const k = state.init ? 1 - Math.exp(-(look?.rate ?? 12) * dt) : 1;
      state.init = true;
      target.x = lerp(target.x, tx, k); target.z = lerp(target.z, tz, k);
      let sx = 0, sz = 0; // rung màn hình (chiêu nặng đập đất): lắc ngẫu nhiên, tắt dần
      if (state.shakeT > 0) { state.shakeT = Math.max(0, state.shakeT - dt); const a = state.shake * state.shakeT / state.shakeDur; sx = (Math.random() * 2 - 1) * a; sz = (Math.random() * 2 - 1) * a; }
      camera.position.set(target.x + sx, Math.sin(pitch) * distance, target.z + Math.cos(pitch) * distance + sz);
      camera.lookAt(target.x + sx, 0, target.z + sz);
    },
    /** Rung camera: biên độ (đơn vị thế giới), thời gian (giây). Lần rung mạnh hơn đè lần yếu. */
    shake(amount, dur = 0.3) { if (state.shakeT > 0 && state.shake * state.shakeT / state.shakeDur > amount) return; state.shake = amount; state.shakeT = state.shakeDur = dur; },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
  };
}
