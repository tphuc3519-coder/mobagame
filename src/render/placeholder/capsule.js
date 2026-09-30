import * as THREE from 'three';

/** Model giữ chỗ dựng từ khối (09 §5): luôn có sẵn, không cần file ngoài. Cao ~190. */
export function createCapsule(color = 0xff7a1a) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(38, 90, 4, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  body.position.y = 92; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(28, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe7b993, roughness: 0.7 }));
  head.position.y = 170; g.add(head);
  const arm = new THREE.Group(); arm.position.set(-46, 130, 0);
  const wp = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 120, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
  wp.position.y = 40; arm.add(wp); g.add(arm);
  let t = 0;
  return {
    object: g,
    /** Nhún khi chạy, thở khi đứng. */
    update(state, speed, dt) {
      t += dt * (state === 'Run' ? 11 : 2);
      const amp = state === 'Run' ? 8 : 2.5;
      g.children[0].position.y = 92 + Math.abs(Math.sin(t)) * amp;
      g.children[1].position.y = 170 + Math.abs(Math.sin(t)) * amp;
      arm.rotation.x = state === 'Run' ? Math.sin(t) * 0.7 : 0;
    },
  };
}
