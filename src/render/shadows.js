import * as THREE from 'three';

let tex;
/** Bóng tiếp đất nhỏ, đậm ngay dưới chân (cộng thêm bóng nắng thời gian thực ở mức Vừa/Cao). */
export function createBlobShadow(radius) {
  if (!tex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.45, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    tex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.8, radius * 2.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, 0.64); m.position.set(-radius * 0.8, 3, -radius * 1.0); m.renderOrder = 1; // lệch nhẹ theo hướng nắng (bóng thò ra sau lưng)
  const g = new THREE.Group(); g.add(m); return g;
}
