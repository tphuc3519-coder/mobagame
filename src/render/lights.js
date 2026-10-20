import * as THREE from 'three';
import { LEVELS } from './quality.js';

/** Env map nhỏ (phòng xám sáng + một đốm đèn ấm) cho phản chiếu/độ bóng của vật liệu PBR; dùng cả ở cảnh trưng bày. */
export function makeEnvMap(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.background = new THREE.Color(0x1a2238);
  s.add(new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc4c8d8, side: THREE.BackSide })));
  const l = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); l.position.set(3, 3, 3); s.add(l);
  const tex = pm.fromScene(s, 0.04).texture;
  pm.dispose(); s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); // cảnh tạm: trả GPU
  return tex;
}

/** Ánh sáng: hemisphere + 1 directional (ấm) + env map nhỏ (02 §13.3). Cảnh tĩnh dùng bóng nướng sẵn (ground.js, cùng hướng nắng);
 *  nắng đổ bóng thật cho nhân vật/quái/lính trong khung hình quanh camera (hộp bóng đi theo camera).
 *  opts: { shadow: cỡ bản đồ bóng, on: bật bóng } (hoặc chuỗi mức cũ 'low' | 'mid' | 'high'). */
const ENV = new WeakMap();
export function addLights(scene, renderer, opts = 'mid') {
  const o = typeof opts === 'string' ? { shadow: LEVELS[opts]?.shadow || 0, on: !!LEVELS[opts]?.shadow } : opts;
  scene.add(new THREE.HemisphereLight(0xd8eaff, 0x34505a, 0.75)); // trời lam nhạt, đất phản lam ngọc → bóng mát kiểu Liên Quân
  const key = new THREE.DirectionalLight(0xffe6c4, 1.75); key.position.set(600, 1200, 800); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8fc8ff, 0.9); rim.position.set(-800, 700, -800); scene.add(rim);
  scene.environment = ENV.get(renderer) || (ENV.set(renderer, makeEnvMap(renderer)), ENV.get(renderer)); // một bản cho mỗi renderer (đấu lại không dựng lại)
  let size = renderer.shadowMap.enabled ? o.shadow || 1024 : 0;
  const dir = new THREE.Vector3(600, 1200, 800).normalize();
  if (size) {
    key.castShadow = true; key.shadow.mapSize.set(size, size);
    const c = key.shadow.camera; c.left = -3000; c.right = 3000; c.top = 3000; c.bottom = -3000; c.near = 100; c.far = 6000; c.updateProjectionMatrix();
    key.shadow.bias = -0.0006; key.shadow.normalBias = 2; key.shadow.radius = 3;
  }
  let texel = size ? 6000 / size : 1, off = false;
  const api = {
    /** Hộp bóng theo điểm camera nhìn (bám theo lưới texel để bóng không rung khi camera trượt). */
    follow(x, z) {
      if (!size || off) return;
      x = Math.round(x / texel) * texel; z = Math.round(z / texel) * texel;
      key.target.position.set(x, 0, z); key.position.set(x + dir.x * 3000, dir.y * 3000, z + dir.z * 3000);
    },
    /** Hộp bóng phủ cả bản đồ (tâm x, z, nửa cạnh half) cho MỘT lượt vẽ lúc dịch sẵn shader: mọi vật đổ bóng (cả cây ở xa) vào lượt bóng
     *  → biến thể shader bóng đổ của chúng được dịch luôn. Gọi lại không đối số để trả về hộp bóng thường quanh camera. */
    cover(x, z, half) {
      if (!size) return;
      const c = key.shadow.camera, h = half ?? 3000, far = half ? half * 2 + 4000 : 6000;
      c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.far = far; c.updateProjectionMatrix();
      if (half != null) { key.target.position.set(x, 0, z); key.position.set(x + dir.x * (half + 2000), dir.y * (half + 2000), z + dir.z * (half + 2000)); }
    },
    /** Tắt / bật bóng đổ thời gian thực mà KHÔNG dịch lại shader (đổi shadowMap.enabled / castShadow buộc dịch lại mọi vật liệu —
     *  khựng vài giây trên iPhone): tắt = vẽ bản đồ bóng một lần ở chỗ trống (không vật nào đổ bóng) rồi thôi cập nhật mỗi khung. */
    setShadows(on) {
      if (!size || off === !on) return; off = !on;
      renderer.shadowMap.autoUpdate = on; renderer.shadowMap.needsUpdate = true;
      if (off) { key.target.position.set(0, -1e6, 0); key.position.set(dir.x * 3000, -1e6 + dir.y * 3000, dir.z * 3000); }
    },
    /** Đổi cỡ bản đồ bóng (độ nét đổi trong trận). */
    setShadowSize(n) {
      if (!size || n === size) return; size = n; texel = 6000 / n;
      key.shadow.mapSize.set(n, n); key.shadow.map?.dispose(); key.shadow.map = null; renderer.shadowMap.needsUpdate = true;
    },
    get shadowsOn() { return !!size && !off; },
    /** Rời trận: trả bản đồ bóng. */
    dispose() { key.shadow.dispose(); },
  };
  if (size && !o.on) api.setShadows(false);
  return api;
}
