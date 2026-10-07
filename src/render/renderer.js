import * as THREE from 'three';
import { LEVELS } from './quality.js';
import { setOutlineResolution } from './materials.js';

/** WebGLRenderer + xử lý resize và mất ngữ cảnh WebGL (02 §13.10). */
export function createRenderer(canvas, level, { onLost, onRestored }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: level === 'high', powerPreference: 'high-performance' });
  renderer.setClearColor(0x0f1224);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  if (LEVELS[level].shadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; } // chỉ nhân vật đổ bóng thật (cảnh tĩnh dùng bóng nướng sẵn)
  let pr = null; // tỉ lệ điểm ảnh do bộ tự chỉnh chất lượng đặt (autoQuality.js); null = theo mức
  const resize = () => {
    renderer.setPixelRatio(pr ?? Math.min(devicePixelRatio, LEVELS[level].pixelRatio));
    renderer.setSize(innerWidth, innerHeight, false);
    setOutlineResolution(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
  };
  addEventListener('resize', resize); resize();
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });
  canvas.addEventListener('webglcontextrestored', () => onRestored?.());
  return { renderer, resize, basePixelRatio: () => Math.min(devicePixelRatio, LEVELS[level].pixelRatio), setPixelRatio(v) { if (v === pr) return; pr = v; resize(); } };
}
