import * as THREE from 'three';
import { LEVELS } from './quality.js';
import { setOutlineResolution } from './materials.js';

/** WebGLRenderer + xử lý resize và mất ngữ cảnh WebGL (02 §13.10). gfx: cài đặt đồ hoạ (render/quality.js; chuỗi mức cũ vẫn nhận).
 *  Khung mặc định không khử răng cưa (cảnh vẽ qua render target của hậu kỳ — MSAA đặt ở đó, đổi được trong trận). Bản đồ bóng luôn bật:
 *  người chơi tắt bóng thì chỉ thôi vẽ bản đồ bóng (lights.js setShadows) — bật/tắt shadowMap buộc dịch lại mọi shader. */
export function createRenderer(canvas, gfx, { onLost, onRestored }) {
  const g = typeof gfx === 'string' ? { scale: LEVELS[gfx]?.pixelRatio ?? 1.5 } : gfx;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0f1224);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // chỉ nhân vật đổ bóng thật (cảnh tĩnh dùng bóng nướng sẵn)
  let pr = null, scale = g.scale; // pr: tỉ lệ điểm ảnh do bộ tự chỉnh chất lượng đặt (autoQuality.js); null = theo độ nét người chơi chọn
  const base = () => Math.min(devicePixelRatio, scale);
  const resize = () => {
    renderer.setPixelRatio(pr ?? base());
    renderer.setSize(innerWidth, innerHeight, false);
    setOutlineResolution(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
  };
  addEventListener('resize', resize); resize();
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });
  canvas.addEventListener('webglcontextrestored', () => onRestored?.());
  return {
    renderer, resize, basePixelRatio: base,
    /** Độ nét người chơi chọn (huỷ mức bộ tự chỉnh đang đặt). */
    setScale(s) { scale = s; pr = null; resize(); },
    setPixelRatio(v) { if (v === pr) return; pr = v; resize(); },
  };
}
