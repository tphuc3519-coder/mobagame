import * as THREE from 'three';
import { rngFor } from './noise.js';

// Texture vẽ bằng canvas 2D lúc chạy (không có file ngoài): cỏ, lát đường, gạch tường. Vẽ lặp mép để ghép khít.
const S = 256;
function canvas() { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; }
function wrapped(ctx, fn) { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { ctx.save(); ctx.translate(ox, oy); fn(); ctx.restore(); } }
function finish(c, repeat) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.repeat.set(...repeat); return t;
}

export function grassTexture() {
  const [c, x] = canvas(), r = rngFor(11);
  x.fillStyle = '#3f9a4a'; x.fillRect(0, 0, S, S);
  const tones = ['#2f8442', '#4bab4f', '#5cbb55', '#3a9147', '#7ac95a'];
  for (let i = 0; i < 220; i++) { const px = r.range(0, S), py = r.range(0, S), rad = r.range(10, 34), col = tones[r.int(tones.length)]; wrapped(x, () => { const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }); }
  x.lineCap = 'round';
  for (let i = 0; i < 700; i++) { const px = r.range(0, S), py = r.range(0, S), l = r.range(4, 10); x.strokeStyle = r.next() < 0.5 ? '#9be36a88' : '#256f3a88'; x.lineWidth = 1.2; wrapped(x, () => { x.beginPath(); x.moveTo(px, py); x.lineTo(px + r.range(-2, 2), py - l); x.stroke(); }); }
  return finish(c);
}

export function pathTexture() {
  const [c, x] = canvas(), r = rngFor(23);
  x.fillStyle = '#6c5f4c'; x.fillRect(0, 0, S, S); // vữa
  const cols = 4, rows = 4, cw = S / cols, ch = S / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const w = cw - 8 + r.range(-4, 3), h = ch - 8 + r.range(-4, 3), px = i * cw + (cw - w) / 2 + (j % 2 ? cw / 4 : 0), py = j * ch + (ch - h) / 2;
    const l = 52 + r.range(-6, 10), hue = 32 + r.range(-6, 6), sat = 22 + r.range(-6, 8);
    wrapped(x, () => {
      x.fillStyle = `hsl(${hue} ${sat}% ${l}%)`; x.beginPath(); x.roundRect(px, py, w, h, 14); x.fill();
      x.fillStyle = 'hsl(40 30% 72% / 0.35)'; x.beginPath(); x.roundRect(px + 3, py + 3, w - 8, h * 0.35, 10); x.fill(); // sáng mép trên
      if (r.next() < 0.3) { x.fillStyle = '#5fa04a66'; x.beginPath(); x.arc(px + r.range(4, w - 4), py + h - 6, r.range(5, 12), 0, 7); x.fill(); } // rêu
    });
  }
  return finish(c);
}

export function brickTexture() {
  const [c, x] = canvas(), r = rngFor(37);
  x.fillStyle = '#4c4a52'; x.fillRect(0, 0, S, S);
  const rows = 4, cols = 3, bh = S / rows, bw = S / cols;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols + 1; i++) {
    const px = i * bw - (j % 2 ? bw / 2 : 0) + 3, py = j * bh + 3, l = 46 + r.range(-6, 8), hue = 240 + r.range(-15, 20);
    wrapped(x, () => { x.fillStyle = `hsl(${hue} 10% ${l}%)`; x.beginPath(); x.roundRect(px, py, bw - 6, bh - 6, 8); x.fill(); x.fillStyle = 'hsl(230 14% 78% / 0.22)'; x.fillRect(px + 4, py + 3, bw - 14, 6); });
  }
  for (let i = 0; i < 14; i++) { x.fillStyle = '#5fae5299'; x.beginPath(); x.arc(r.range(0, S), r.range(S * 0.6, S), r.range(6, 16), 0, 7); x.fill(); }
  return finish(c);
}

/** Đốm sáng mềm dùng cho quầng đèn, đom đóm. */
export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
