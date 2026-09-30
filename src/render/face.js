import * as THREE from 'three';

// Mặt anime vẽ bằng canvas lúc chạy (không có file ảnh): mắt to có mống chuyển sắc, 2 đốm sáng, mi dày có đuôi,
// mày mảnh, má hồng gạch chéo, miệng nhỏ. Atlas 2 tầng: trên = mở mắt, dưới = nhắm (để chớp mắt).
// Thông số lấy từ userData.face của model (tools/modelgen humanoid.faceFeatures).
const cache = new Map();
const S = 512;

function shade(hex, k) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return '#' + new THREE.Color().setHSL(h.h, Math.min(1, h.s * (k > 0 ? 0.85 : 1.15)), Math.min(0.95, Math.max(0.03, h.l + k))).getHexString(); }

function drawFace(x, f, closed, oy) {
  const r = f.rect, px = (u) => ((u - r.x0) / (r.x1 - r.x0)) * S, py = (v) => oy + (1 - (v - r.y0) / (r.y1 - r.y0)) * S, k = S / (r.x1 - r.x0); // k: px mỗi hr
  const sharp = f.style === 'sharp';
  for (const s of [1, -1]) {
    const cx = px(s * 0.38), cy = py(-0.1), w = 0.235 * k, h = (sharp ? 0.24 : 0.3) * k;
    x.save(); x.translate(cx, cy); x.scale(s, 1); // s=1: mắt bên phải ảnh (trái nhân vật); vẽ đuôi mắt ra ngoài (+x)
    if (closed || f.closed) {
      x.lineCap = 'round'; x.strokeStyle = f.lash; x.lineWidth = 0.05 * k;
      x.beginPath(); x.moveTo(-w, 0); x.quadraticCurveTo(0, h * 0.55, w * 1.05, -h * 0.05); x.stroke();
      x.lineWidth = 0.025 * k; x.beginPath(); x.moveTo(w * 0.95, -h * 0.02); x.lineTo(w * 1.3, -h * 0.25); x.stroke();
    } else {
      const tilt = sharp ? 0.28 : 0.12;
      // hình mắt: mi trên cong, mi dưới thoai thoải
      const eye = new Path2D();
      eye.moveTo(-w, h * 0.1); eye.bezierCurveTo(-w * 0.7, -h * 1.05, w * 0.7, -h * (1.05 + tilt), w * 1.05, -h * (0.25 + tilt));
      eye.bezierCurveTo(w * 0.95, h * 0.55, w * 0.3, h * 0.95, -w * 0.2, h * 0.9); eye.bezierCurveTo(-w * 0.7, h * 0.8, -w * 0.95, h * 0.5, -w, h * 0.1);
      x.fillStyle = '#fbfaff'; x.fill(eye);
      x.save(); x.clip(eye);
      x.fillStyle = 'rgba(120,110,160,0.25)'; x.fillRect(-w * 1.2, -h * 1.3, w * 2.4, h * 0.55); // bóng mi trên đổ xuống tròng trắng
      const iw = w * 0.78, ih = h * 0.98, ix = w * 0.06, iy = h * 0.05;
      const g = x.createLinearGradient(0, iy - ih, 0, iy + ih);
      g.addColorStop(0, shade(f.iris, -0.32)); g.addColorStop(0.45, f.iris); g.addColorStop(1, shade(f.iris, 0.28));
      x.fillStyle = g; x.beginPath(); x.ellipse(ix, iy, iw, ih, 0, 0, 7); x.fill();
      x.lineWidth = 0.02 * k; x.strokeStyle = shade(f.iris, -0.4); x.stroke();
      x.fillStyle = shade(f.iris, -0.45); x.beginPath(); x.ellipse(ix, iy + h * 0.02, iw * 0.42, ih * 0.5, 0, 0, 7); x.fill();
      // vân mống mắt sáng phía dưới
      x.strokeStyle = shade(f.iris, 0.35); x.lineWidth = 0.012 * k; x.globalAlpha = 0.7;
      x.beginPath(); x.ellipse(ix, iy + ih * 0.25, iw * 0.7, ih * 0.5, 0, 0.3, Math.PI - 0.3); x.stroke(); x.globalAlpha = 1;
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(ix + iw * 0.35, iy - ih * 0.42, iw * 0.34, ih * 0.24, -0.4, 0, 7); x.fill();
      x.beginPath(); x.ellipse(ix - iw * 0.4, iy + ih * 0.45, iw * 0.14, ih * 0.1, 0, 0, 7); x.fill();
      x.restore();
      // mi trên dày + đuôi mi
      x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = f.lash; x.fillStyle = f.lash;
      x.lineWidth = 0.055 * k; x.beginPath(); x.moveTo(-w * 1.02, h * 0.05); x.bezierCurveTo(-w * 0.7, -h * 1.08, w * 0.7, -h * (1.08 + tilt), w * 1.08, -h * (0.28 + tilt)); x.stroke();
      x.beginPath(); x.moveTo(w * 0.9, -h * (0.55 + tilt)); x.quadraticCurveTo(w * 1.3, -h * (0.55 + tilt), w * 1.45, -h * (0.85 + tilt)); x.quadraticCurveTo(w * 1.2, -h * (0.3 + tilt), w * 1.0, -h * (0.2 + tilt)); x.fill();
      x.lineWidth = 0.018 * k; x.beginPath(); x.moveTo(w * 0.95, h * 0.35); x.quadraticCurveTo(w * 0.55, h * 0.95, -w * 0.1, h * 0.92); x.stroke();
    }
    // mày mảnh, thon hai đầu
    x.save(); x.translate(0, -h * 1.75 - 0.03 * k); x.rotate(((f.browTilt ?? -8) * Math.PI) / 180);
    x.fillStyle = f.brow; x.beginPath(); x.moveTo(-w * 0.9, 0.01 * k); x.quadraticCurveTo(0, -0.05 * k, w * 1.1, 0.02 * k); x.quadraticCurveTo(0, -0.01 * k, -w * 0.9, 0.01 * k); x.fill();
    x.restore();
    x.restore();
    // má hồng + gạch chéo
    const bx = px(s * 0.5), by = py(-0.42), gb = x.createRadialGradient(bx, by, 0, bx, by, 0.2 * k);
    gb.addColorStop(0, f.blush + 'aa'); gb.addColorStop(1, f.blush + '00'); x.fillStyle = gb; x.beginPath(); x.ellipse(bx, by, 0.2 * k, 0.1 * k, 0, 0, 7); x.fill();
    x.strokeStyle = shade(f.blush, -0.15) + 'aa'; x.lineWidth = 0.012 * k;
    for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(bx + i * 0.06 * k - 0.02 * k, by + 0.03 * k); x.lineTo(bx + i * 0.06 * k + 0.02 * k, by - 0.03 * k); x.stroke(); }
  }
  // miệng nhỏ cười nhẹ
  const mx = px(0), my = py(-0.62);
  x.strokeStyle = shade(f.lip, -0.25); x.lineWidth = 0.022 * k; x.lineCap = 'round';
  x.beginPath(); x.moveTo(mx - 0.08 * k, my - 0.01 * k); x.quadraticCurveTo(mx, my + 0.035 * k, mx + 0.08 * k, my - 0.01 * k); x.stroke();
}

/** Texture atlas mặt (512 × 1024): nửa trên mở mắt, nửa dưới nhắm. */
export function faceTexture(f) {
  const key = JSON.stringify(f);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = S; c.height = S * 2;
  const x = c.getContext('2d');
  drawFace(x, f, false, 0); drawFace(x, f, true, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.repeat.set(1, 0.5); t.offset.set(0, 0.5);
  cache.set(key, t);
  return t;
}

/** Vật liệu mặt (không chịu ánh sáng, nét mực luôn rõ) + điều khiển chớp mắt. */
export function faceMaterial(f) {
  const map = faceTexture(f).clone(); map.needsUpdate = true;
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.02, depthWrite: false, color: 0xf2eef2 });
  m.name = 'face';
  let t = 1.5 + (f.iris.charCodeAt(1) % 7) * 0.4;
  return { material: m, update(dt) { t -= dt; const closed = t < 0.11; map.offset.y = closed ? 0 : 0.5; if (t < 0) t = 2.5 + ((t * 997) % 1 + 1) * 2.5; } };
}
