import * as THREE from 'three';
import { lerp } from '../core/math.js';

// Camera trận (02 §13.2): FOV 45°, nghiêng 55°, khoảng cách 2400 (gốc 2000/38°; các vòng thử 1300 và 1650 vẫn chật); ?camdist= để thử. Đội Đỏ xoay 180° ở Mốc sau.
export const CAM_DISTANCE = 2400, CAM_NEAR = 2000, CAM_FOV = 45; // CAM_NEAR: Cài đặt → Góc camera Gần
// Giật camera khi chiêu của người chơi tới tư thế chạm (kick): lò xo tắt dần — đỉnh KICK đơn vị thế giới × độ (chiêu 1, chiêu cuối 1,8),
// tới đỉnh sau ~0,08 s, về chỗ sau ~0,35 s. Máy bật "giảm chuyển động" thì không giật.
const KICK = 14, KW = 16, KZ = 0.75, KV = KW / 0.44; // KV: vận tốc đầu cho đỉnh dịch = 1 (lò xo tắt dần hệ số 0,75 đi được ~0,44 × v0 / ω)
const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function createCamera({ distance = CAM_DISTANCE, pitchDeg = 55, fov = CAM_FOV } = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 50, 11000);
  const pitch = pitchDeg * Math.PI / 180;
  let dist = distance, distTo = distance; // đổi góc camera giữa trận: trượt dần tới khoảng cách mới
  const target = new THREE.Vector3();
  const state = { init: false, shake: 0, shakeT: 0, kx: 0, kz: 0, kvx: 0, kvz: 0 };
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
      if (state.kvx || state.kvz || state.kx || state.kz) { // giật camera: lò xo về 0 (bước ≤ 1/120 s)
        for (let n = Math.ceil(dt * 120), h = n ? dt / n : 0; n > 0; n--) {
          state.kvx -= (KW * KW * state.kx + 2 * KZ * KW * state.kvx) * h; state.kx += state.kvx * h;
          state.kvz -= (KW * KW * state.kz + 2 * KZ * KW * state.kvz) * h; state.kz += state.kvz * h;
        }
        if (Math.abs(state.kx) + Math.abs(state.kz) < 0.05 && Math.abs(state.kvx) + Math.abs(state.kvz) < 0.5) state.kx = state.kz = state.kvx = state.kvz = 0;
        sx += state.kx; sz += state.kz;
      }
      dist += (distTo - dist) * (state.init ? 1 - Math.exp(-6 * dt) : 1);
      camera.position.set(target.x + sx, Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist + sz);
      camera.lookAt(target.x + sx, 0, target.z + sz);
    },
    /** Rung camera: biên độ (đơn vị thế giới), thời gian (giây). Lần rung mạnh hơn đè lần yếu. */
    shake(amount, dur = 0.3) { if (state.shakeT > 0 && state.shake * state.shakeT / state.shakeDur > amount) return; state.shake = amount; state.shakeT = state.shakeDur = dur; },
    /** Giật camera về hướng (dx, dz) (vector đơn vị trên mặt đất) rồi trôi về: chiêu của người chơi phát ra. k: độ (1 = KICK đơn vị). */
    kick(dx, dz, k = 1) { if (calm || !(k > 0)) return; const v = KICK * KV * Math.min(2.5, k); state.kvx += dx * v; state.kvz += dz * v; },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    setDistance(d) { distTo = d; },
  };
}
