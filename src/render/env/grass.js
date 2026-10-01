import * as THREE from 'three';
import { rngFor } from './noise.js';
import { WIND, scatterChunked } from './foliage.js';
import { crispAlpha } from './trees.js';

// Cỏ lá dài kiểu Liên Quân: mỗi khóm là 4 thẻ dọc đan chéo nhau (ảnh vẽ ~40 lá cỏ dài, gốc tối → ngọn sáng), mép lá sắc nhờ
// alpha-to-coverage. Rẻ (8 tam giác/khóm) nên rải được hàng nghìn khóm: bụi núp, đỉnh khối đá, mép sông, chân đá.

const TEX = {};
/** kind: 'bush' (xanh lá tươi đậm, dày — bụi núp), 'wild' (xanh ngả vàng, thưa — cỏ trang trí), 'blue' (hoa cẩm tú cầu xanh). */
export function grassTexture(kind = 'bush') {
  if (TEX[kind]) return TEX[kind];
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rngFor(kind.length * 17 + 3);
  if (kind === 'blue') { // khóm hoa xanh tím tròn + lá
    for (let i = 0; i < 26; i++) { const x = r.range(30, W - 30), y = r.range(H * 0.45, H * 0.95); g.fillStyle = `hsl(${120 + r.range(-10, 10)} 45% ${18 + r.range(0, 14)}%)`; g.beginPath(); g.ellipse(x, y, r.range(20, 34), r.range(10, 16), r.range(-0.6, 0.6), 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 9; i++) {
      const cx = r.range(50, W - 50), cy = r.range(H * 0.35, H * 0.75), R = r.range(26, 40);
      for (let k = 0; k < 70; k++) { const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * R, l = 40 + r.range(0, 30) - d / R * 12; g.fillStyle = `hsl(${222 + r.range(-14, 14)} ${65 + r.range(0, 20)}% ${l}%)`; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, r.range(4, 7), 0, Math.PI * 2); g.fill(); }
    }
  } else {
    const n = kind === 'bush' ? 46 : 30;
    for (let i = 0; i < n; i++) {
      const x0 = r.range(20, W - 20), len = r.range(0.55, 0.95) * H, lean = r.range(-0.55, 0.55) * (x0 < W / 2 ? -0.4 : 1) + (x0 - W / 2) / W * 0.9, w = r.range(7, 13);
      const tipX = x0 + lean * len * 0.6, tipY = H - len, cx = x0 + lean * len * 0.15, cy = H - len * 0.55;
      const hue = kind === 'bush' ? 100 + r.range(-12, 10) : 80 + r.range(-10, 14), dark = kind === 'bush' ? 16 : 22;
      const gr = g.createLinearGradient(0, H, 0, tipY); gr.addColorStop(0, `hsl(${hue + 20} 55% ${dark}%)`); gr.addColorStop(0.55, `hsl(${hue} 62% ${dark + 18}%)`); gr.addColorStop(1, `hsl(${hue - 18} 72% ${dark + 40}%)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w / 2, H); g.quadraticCurveTo(cx - w * 0.4, cy, tipX, tipY); g.quadraticCurveTo(cx + w * 0.4, cy, x0 + w / 2, H); g.closePath(); g.fill();
      g.strokeStyle = `hsla(${hue - 10}, 70%, ${dark + 50}%, 0.35)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, H); g.quadraticCurveTo(cx, cy, tipX, tipY); g.stroke(); // gân sáng giữa lá
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (TEX[kind] = t);
}

/** Khóm: 4 thẻ đan chéo, chân hơi loe ra; kích thước 1 = cao 1, rộng ~0.85. Màu đỉnh tối ở gốc (giả bóng). */
export function clumpGeo(cards = 4) {
  const P = [], U = [], C = [], N = [], I = [];
  for (let k = 0; k < cards; k++) {
    const a = (k / cards) * Math.PI + 0.3 * k, ca = Math.cos(a), sa = Math.sin(a), b = P.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const x = (u - 0.5) * 0.85 * (1 + v * 0.25), lean = v * 0.08;
      P.push(x * ca + lean * sa, v, x * sa - lean * ca); U.push(u, v); N.push(0, 1, 0); // pháp tuyến hướng lên: khóm sáng đều như cỏ
      const s = 0.55 + v * 0.5; C.push(s, s, s);
    }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  return g;
}

const MATS = {};
/** Vật liệu cỏ: gió lay ngọn (theo vị trí bản sao), mép sắc. */
export function grassMat(kind = 'bush', amp = 18) {
  const key = kind + amp; if (MATS[key]) return MATS[key];
  const m = new THREE.MeshLambertMaterial({ map: grassTexture(kind), vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3].x * 0.011 + instanceMatrix[3].z * 0.013;
      float k = position.y * position.y;
      transformed.x += sin(uWind * 1.8 + ph) * ${(amp / 200).toFixed(4)} * k; transformed.z += cos(uWind * 1.4 + ph * 1.3) * ${(amp / 300).toFixed(4)} * k;
      #endif`);
  };
  m.customProgramCacheKey = () => 'grass' + key;
  crispAlpha(m, 0.45);
  return (MATS[key] = m);
}

/** Rải khóm cỏ. list: [{x,y,z,ry,sx (rộng),sy (cao),color?}] (toạ độ thế giới, sx/sy theo đơn vị thế giới). */
export function buildGrass(list, kind = 'bush', amp) {
  return scatterChunked(clumpGeo(), grassMat(kind, amp), list.map((c) => ({ ...c, sz: c.sz ?? c.sx })), true);
}
