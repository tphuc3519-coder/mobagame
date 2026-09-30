import * as THREE from 'three';
import { LEVELS } from './quality.js';

/** WebGLRenderer + xử lý resize và mất ngữ cảnh WebGL (02 §13.10). */
export function createRenderer(canvas, level, { onLost, onRestored }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: level === 'high', powerPreference: 'high-performance' });
  renderer.setClearColor(0x0f1224);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, LEVELS[level].pixelRatio));
    renderer.setSize(innerWidth, innerHeight, false);
  };
  addEventListener('resize', resize); resize();
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });
  canvas.addEventListener('webglcontextrestored', () => onRestored?.());
  return { renderer, resize };
}
