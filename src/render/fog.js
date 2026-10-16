import * as THREE from 'three';
import { SIGHT } from '../sim/vision.js';
import { abyssEdges } from './env/abyss.js';

/** Lớp sương mù chiến trường: tấm phẳng tối phủ bản đồ, khoét các vòng tròn quanh đơn vị phe mình (tầm nhìn trong sim/vision.js).
 *  Mặt nạ tính thẳng trên mảng số ~10 lần/giây rồi nạp lên GPU (DataTexture). Trước đây vẽ canvas 2D rồi nạp: Safari vẽ canvas bằng GPU
 *  nên mỗi lần nạp phải đọc ngược ảnh về — khựng vài ms, 10 lần mỗi giây. Bản đồ nhỏ lấy ảnh canvas dựng lại từ mảng khi cần. */
export function createFog(scene, map, team) {
  const PAD = 3500, SIZE = 256, ext = { x0: -PAD, y0: -PAD, w: map.w + PAD * 2, h: map.h + PAD * 2 };
  const px = (x) => ((x - ext.x0) / ext.w) * SIZE, py = (y) => ((y - ext.y0) / ext.h) * SIZE, pr = (r) => (r / ext.w) * SIZE;
  // nền: 255 = sương, vực ngoài biên = 0 (không phủ sương chiến trường) — vẽ một lần bằng canvas
  const base = new Uint8Array(SIZE * SIZE).fill(255);
  if (map.oobShape) {
    const edges = abyssEdges(map, 420, 300), A = map.oobShape.A || 0;
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, SIZE, SIZE); c.fillStyle = '#000';
    edges.forEach((e, k) => { const poly = [...e, k ? [A + 3600, A + 3600] : [-3600, -3600]]; c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(px(x), py(y)) : c.moveTo(px(x), py(y)))); c.closePath(); c.fill(); });
    const d = c.getImageData(0, 0, SIZE, SIZE).data; for (let i = 0; i < base.length; i++) base[i] = d[4 * i];
  }
  const mask = new Uint8Array(SIZE * SIZE), data = new Uint8Array(SIZE * SIZE * 4); // data: kênh G = độ sương (alphaMap đọc .g)
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ext.w, ext.h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(8 / 255, 12 / 255, 32 / 255, THREE.LinearSRGBColorSpace),
    alphaMap: tex, opacity: 0.58, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  mesh.rotation.x = Math.PI / 2; mesh.position.set(map.w / 2, 190, map.h / 2); mesh.renderOrder = 5; // quay +90°: hàng 0 của mảng ở phía y nhỏ — cùng chiều với canvas cũ
  scene.add(mesh);
  // khoét một vòng: trong 0,72R thấy rõ, ra tới R mờ dần (nhân như destination-out của bản canvas cũ)
  const cut = (cx, cy, R) => {
    const r0 = R * 0.72, x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(SIZE - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(SIZE - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= R) continue;
      const i = y * SIZE + x; mask[i] = d <= r0 ? 0 : (mask[i] * (d - r0)) / (R - r0);
    }
  };
  let acc = 1, cv = null, dirty = true;
  return {
    mesh,
    /** Ảnh sương cho bản đồ nhỏ (canvas dựng lại từ mặt nạ khi đã đổi). */
    get canvas() {
      if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = SIZE; cv._img = cv.getContext('2d').createImageData(SIZE, SIZE); }
      if (dirty) { dirty = false; const o = cv._img.data; for (let i = 0; i < mask.length; i++) { o[4 * i] = 8; o[4 * i + 1] = 12; o[4 * i + 2] = 32; o[4 * i + 3] = mask[i] * 0.58; } cv.getContext('2d').putImageData(cv._img, 0, 0); }
      return cv;
    },
    /** Vùng của bản đồ (trong canvas, tính bằng pixel) để vẽ lên bản đồ nhỏ. */
    mapRect: { x: px(0), y: py(0), w: pr(map.w), h: pr(map.h) },
    update(world, dt) {
      acc += dt; if (acc < 0.1) return; acc = 0;
      mask.set(base);
      for (const e of world.entities) {
        if (e.team !== team || !e.alive || e.noTarget) continue;
        const r = e.kind === 'hero' ? SIGHT.hero : e.kind === 'minion' ? SIGHT.minion : SIGHT[e.kind]; if (!r) continue;
        cut(px(e.pos.x), py(e.pos.y), pr(r));
      }
      for (let i = 0; i < mask.length; i++) data[4 * i + 1] = mask[i];
      tex.needsUpdate = true; dirty = true;
    },
  };
}
