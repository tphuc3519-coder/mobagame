import * as THREE from 'three';

// Texture vẽ bằng canvas 2D lúc chạy (không có file ngoài). Bề mặt nền/đường/tường nằm ở surfaces.js; ở đây còn quầng sáng.
/** Đốm sáng mềm dùng cho quầng đèn, đom đóm. */
export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
