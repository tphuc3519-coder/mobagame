import * as THREE from 'three';
import { loadHero, instantiate } from '../render/assets.js';

// Chân dung tướng (khung đầu-vai) chụp từ model thật bằng renderer của trận, một lần cho mỗi tướng, dùng cho bản đồ nhỏ, bảng tỉ số…
// get(id) trả canvas khi đã chụp xong, null khi đang chụp (lần đầu gọi sẽ bắt đầu nạp/chụp).
export function createPortraits(renderer, size = 96) {
  const done = new Map(), pending = new Set();
  async function shoot(id) {
    const m = await loadHero(id); if (!m) return;
    const inst = instantiate(m), obj = inst.object; obj.scale.setScalar(1); // mét, như cảnh trưng bày
    const sc = new THREE.Scene(); sc.add(obj);
    sc.add(new THREE.HemisphereLight(0xdde4ff, 0x40303a, 1.3)); const k = new THREE.DirectionalLight(0xffe8d0, 2.4); k.position.set(1, 2, 3); sc.add(k);
    const r2 = new THREE.DirectionalLight(new THREE.Color(inst.art.rim || '#fff'), 2.5); r2.position.set(-2, 2, -3); sc.add(r2);
    const mixer = new THREE.AnimationMixer(obj), idle = inst.animations.find((c) => c.name === 'Idle'); if (idle) mixer.clipAction(idle).play(); mixer.update(0.01);
    obj.updateMatrixWorld(true);
    const head = new THREE.Vector3(); const bone = obj.getObjectByName('Bone_Head');
    if (bone) bone.getWorldPosition(head); else head.set(0, (inst.art.height || 190) / 100 * 0.85, 0);
    const pf = inst.art.portrait || {};
    const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
    cam.position.set(head.x + 0.1, head.y + 0.15 + (pf.dy || 0), head.z + (pf.dist || 1.2)); cam.lookAt(head.x, head.y + 0.05 + (pf.dy || 0), head.z);
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(null); renderer.setClearColor(prevClear, prevA);
    const px = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, px); rt.dispose();
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    x.putImageData(img, 0, 0);
    done.set(id, c);
  }
  return {
    get(id) {
      if (done.has(id)) return done.get(id);
      if (!pending.has(id)) { pending.add(id); shoot(id).catch((e) => console.warn('chân dung', id, e.message)); }
      return null;
    },
    /** Vẽ chân dung tròn có viền màu đội vào ctx 2D (chữ cái đầu khi chưa có ảnh). */
    draw(ctx, id, name, x, y, r, ring, { me = false, dead = false } = {}) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#1a1d33'; ctx.fill();
      const p = this.get(id);
      ctx.save(); ctx.clip();
      if (p) ctx.drawImage(p, x - r * 1.15, y - r * 1.05, r * 2.3, r * 2.3);
      else { ctx.fillStyle = '#f3e9d6'; ctx.font = `800 ${Math.round(r * 1.1)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?')[0], x, y + 1); }
      if (dead) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.22); ctx.strokeStyle = ring; ctx.stroke();
      if (me) { ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth * 0.9, 0, Math.PI * 2); ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke(); }
      ctx.restore();
    },
  };
}
