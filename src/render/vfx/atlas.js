import * as THREE from 'three';

// Ảnh mẫu cho hạt (vẽ bằng canvas lúc chạy, không tải file): lưới 4×2 ô 128 px, màu trắng để tô màu theo hạt.
// 0 quầng sáng · 1 khói · 2 lá · 3 sao lấp lánh · 4 bong bóng · 5 giọt nước · 6 mảnh than/đá · 7 vệt (mũi tên, mưa)
export const TILE = { glow: 0, smoke: 1, leaf: 2, star: 3, bubble: 4, drop: 5, shard: 6, streak: 7 };
const S = 128;

let atlas = null;
export function particleAtlas() {
  if (atlas) return atlas;
  const c = document.createElement('canvas'); c.width = S * 4; c.height = S * 2;
  const g = c.getContext('2d');
  const cell = (i, draw) => { g.save(); g.translate((i % 4) * S, Math.floor(i / 4) * S); g.beginPath(); g.rect(0, 0, S, S); g.clip(); draw(); g.restore(); };
  const radial = (x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  cell(0, () => radial(64, 64, 62, [[0, 1], [0.25, 0.8], [0.6, 0.22], [1, 0]]));
  cell(1, () => { for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = rnd() * 26; radial(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 22 + rnd() * 18, [[0, 0.35], [0.7, 0.12], [1, 0]]); } });
  cell(2, () => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 8); g.bezierCurveTo(108, 40, 100, 92, 64, 120); g.bezierCurveTo(28, 92, 20, 40, 64, 8); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 14); g.lineTo(64, 116); g.stroke(); });
  cell(3, () => { radial(64, 64, 30, [[0, 1], [1, 0]]); g.fillStyle = '#fff'; for (const [w, h] of [[5, 60], [60, 5]]) { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(64 - w, 64 - h, 2 * w, 2 * h); } });
  cell(4, () => { radial(64, 64, 58, [[0, 0.05], [0.75, 0.15], [0.9, 0.9], [1, 0]]); radial(46, 44, 14, [[0, 0.9], [1, 0]]); });
  cell(5, () => { const gr = g.createLinearGradient(0, 10, 0, 120); gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(64, 8); g.bezierCurveTo(70, 50, 96, 74, 96, 92); g.arc(64, 92, 32, 0, Math.PI); g.bezierCurveTo(32, 74, 58, 50, 64, 8); g.fill(); });
  cell(6, () => { g.fillStyle = '#fff'; g.beginPath(); const n = 7; for (let k = 0; k < n; k++) { const a = (k / n) * 6.28, r = 30 + rnd() * 30; g[k ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.fill(); radial(64, 64, 40, [[0, 0.6], [1, 0]]); });
  cell(7, () => { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(58, 4, 12, 120); });
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace;
  return atlas;
}

/** Ảnh cho vệt trên mặt đất: 'crack' (nứt toả từ tâm), 'scorch' (cháy xém), 'splash' (vệt nước loang), 'rune' (vòng ký tự). Trắng/alpha để tô màu. */
const decals = {};
export function decalTexture(kind) {
  if (decals[kind]) return decals[kind];
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); let seed = kind.length * 977; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.translate(N / 2, N / 2);
  if (kind === 'crack') {
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    const branch = (x, y, a, len, w) => { if (len < 8 || w < 0.6) return; const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); branch(nx, ny, a + (rnd() - 0.5) * 0.9, len * 0.8, w * 0.75); if (rnd() < 0.45) branch(nx, ny, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.6), len * 0.55, w * 0.6); };
    for (let k = 0; k < 9; k++) branch(0, 0, (k / 9) * 6.28 + rnd() * 0.4, 22 + rnd() * 10, 5);
  } else if (kind === 'scorch') {
    for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, d = rnd() * 70, r = 20 + rnd() * 40; const gr = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, r); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-N / 2, -N / 2, N, N); }
  } else if (kind === 'splash') {
    g.fillStyle = '#fff';
    for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, d = 40 + rnd() * 70, r = 3 + rnd() * 9; g.globalAlpha = 0.5 + rnd() * 0.5; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, 6.28); g.fill(); }
    g.globalAlpha = 1; g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(0, 0, 100, 0, 6.28); g.stroke();
  } else if (kind === 'rune') {
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 118, 0, 6.28); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 100, 0, 6.28); g.stroke();
    for (let k = 0; k < 12; k++) { g.save(); g.rotate((k / 12) * 6.28); g.translate(0, -109); g.lineWidth = 3; g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 5); g.moveTo(5, -5); g.lineTo(-5, 5); g.moveTo(0, -7); g.lineTo(0, 7); g.stroke(); g.restore(); }
    g.lineWidth = 3; for (const t0 of [-Math.PI / 2, Math.PI / 2]) { g.beginPath(); for (let k = 0; k <= 3; k++) { const a = t0 + (k / 3) * Math.PI * 2; g[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 92, Math.sin(a) * 92); } g.stroke(); } // sao sáu cánh
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; decals[kind] = t;
  return t;
}
