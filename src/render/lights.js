import * as THREE from 'three';

/** Ánh sáng: hemisphere + 1 directional (ấm) + env map nhỏ (02 §13.3). Không bóng đổ thời gian thực. */
export function addLights(scene, renderer) {
  scene.add(new THREE.HemisphereLight(0xe4ecff, 0x6a5a48, 0.85));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.9); key.position.set(600, 1200, 800); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd3ff, 1.4); rim.position.set(-800, 700, -800); scene.add(rim);
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.background = new THREE.Color(0x1a2238);
  s.add(new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc4c8d8, side: THREE.BackSide })));
  const l = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); l.position.set(3, 3, 3); s.add(l);
  scene.environment = pm.fromScene(s, 0.04).texture;
  pm.dispose();
}
