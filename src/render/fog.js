import * as THREE from 'three';
import { SIGHT } from '../sim/vision.js';

/** Lớp sương mù chiến trường: tấm phẳng tối phủ bản đồ, khoét các vòng tròn quanh đơn vị phe mình (tầm nhìn trong sim/vision.js).
 *  Texture canvas vẽ lại ~10 lần/giây; canvas và vùng bản đồ của nó cũng được bản đồ nhỏ dùng lại. */
export function createFog(scene, map, team) {
  const PAD = 3500, SIZE = 320, ext = { x0: -PAD, y0: -PAD, w: map.w + PAD * 2, h: map.h + PAD * 2 };
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.minFilter = tex.magFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ext.w, ext.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(map.w / 2, 190, map.h / 2); mesh.renderOrder = 5;
  scene.add(mesh);
  const px = (x) => ((x - ext.x0) / ext.w) * SIZE, py = (y) => ((y - ext.y0) / ext.h) * SIZE, pr = (r) => (r / ext.w) * SIZE;
  let acc = 1;
  return {
    canvas: cv,
    /** Vùng của bản đồ (trong canvas, tính bằng pixel) để vẽ lên bản đồ nhỏ. */
    mapRect: { x: px(0), y: py(0), w: pr(map.w), h: pr(map.h) },
    update(world, dt) {
      acc += dt; if (acc < 0.1) return; acc = 0;
      ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(8,12,32,0.58)'; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.globalCompositeOperation = 'destination-out';
      for (const e of world.entities) {
        if (e.team !== team || !e.alive || e.noTarget) continue;
        const r = e.kind === 'hero' ? SIGHT.hero : e.kind === 'minion' ? SIGHT.minion : SIGHT[e.kind]; if (!r) continue;
        const x = px(e.pos.x), y = py(e.pos.y), R = pr(r), g = ctx.createRadialGradient(x, y, R * 0.72, x, y, R);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      }
      tex.needsUpdate = true;
    },
  };
}
