import * as THREE from 'three';

/** Hình nộm tập bắn: cọc gỗ, thân rơm, đầu tròn, bia đỏ. Cao ~190. */
export function createDummy() {
  const g = new THREE.Group();
  const straw = new THREE.MeshStandardMaterial({ color: 0xd8b86a, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 190, 8), wood); post.position.y = 95; g.add(post);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(34, 40, 90, 12), straw); body.position.y = 110; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(26, 12, 10), straw); head.position.y = 175; g.add(head);
  const arms = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 150, 6), wood); arms.rotation.z = Math.PI / 2; arms.position.y = 135; g.add(arms);
  const target = new THREE.Mesh(new THREE.CircleGeometry(24, 20), new THREE.MeshStandardMaterial({ color: 0xc8302a })); target.position.set(0, 112, 38); g.add(target);
  return { object: g };
}
