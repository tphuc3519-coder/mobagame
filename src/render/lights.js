import * as THREE from 'three';
import { LEVELS } from './quality.js';

/** Ánh sáng: hemisphere + 1 directional (ấm) + env map nhỏ (02 §13.3). Cảnh tĩnh dùng bóng nướng sẵn (ground.js, cùng hướng nắng);
 *  mức Vừa/Cao: nắng đổ bóng thật cho nhân vật/quái/lính trong khung hình quanh camera (hộp bóng đi theo camera). */
export function addLights(scene, renderer, level = 'mid') {
  scene.add(new THREE.HemisphereLight(0xd8eaff, 0x34505a, 0.75)); // trời lam nhạt, đất phản lam ngọc → bóng mát kiểu Liên Quân
  const key = new THREE.DirectionalLight(0xffe6c4, 1.75); key.position.set(600, 1200, 800); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8fc8ff, 0.9); rim.position.set(-800, 700, -800); scene.add(rim);
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.background = new THREE.Color(0x1a2238);
  s.add(new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc4c8d8, side: THREE.BackSide })));
  const l = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); l.position.set(3, 3, 3); s.add(l);
  scene.environment = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  const size = LEVELS[level]?.shadow || 0, dir = new THREE.Vector3(600, 1200, 800).normalize();
  if (size) {
    key.castShadow = true; key.shadow.mapSize.set(size, size);
    const c = key.shadow.camera; c.left = -2300; c.right = 2300; c.top = 2300; c.bottom = -2300; c.near = 100; c.far = 6000; c.updateProjectionMatrix();
    key.shadow.bias = -0.0006; key.shadow.normalBias = 2; key.shadow.radius = 3;
  }
  const texel = size ? 4600 / size : 1;
  return {
    /** Hộp bóng theo điểm camera nhìn (bám theo lưới texel để bóng không rung khi camera trượt). */
    follow(x, z) {
      if (!size) return;
      x = Math.round(x / texel) * texel; z = Math.round(z / texel) * texel;
      key.target.position.set(x, 0, z); key.position.set(x + dir.x * 3000, dir.y * 3000, z + dir.z * 3000);
    },
  };
}
