import * as THREE from 'three';
import { LEVELS } from './quality.js';
import { forgetHeld, heldCount } from './dispose.js';
import { resetShapeKeep } from './vfx/shapes.js';

/** WebGLRenderer + xử lý resize và mất ngữ cảnh WebGL (02 §13.10). gfx: cài đặt đồ hoạ (render/quality.js; chuỗi mức cũ vẫn nhận).
 *  Khung mặc định không khử răng cưa (cảnh vẽ qua render target của hậu kỳ — MSAA đặt ở đó, đổi được trong trận). Bản đồ bóng luôn bật:
 *  người chơi tắt bóng thì chỉ thôi vẽ bản đồ bóng (lights.js setShadows) — bật/tắt shadowMap buộc dịch lại mọi shader.
 *  GĐ3: MỘT renderer trận cho cả phiên (đấu lại ngay trong trang): rời trận thì park() — trả bộ nhớ, khung vẽ 1×1, ẩn canvas, giữ chương
 *  trình shader đã dịch (trận sau vào nhanh). Từng mất ngữ cảnh WebGL hoặc ?freshgl thì chính sách 'drop': rời trận huỷ hẳn + thay canvas. */
export const BASE_EXPOSURE = 0.84, CLEAR = 0x0f1224;
let shared = null, policy = typeof location !== 'undefined' && /[?&]freshgl\b/.test(location.search) ? 'drop' : 'keep';
export const rendPolicy = () => policy;

export function acquireRenderer(id, gfx, handlers) {
  if (shared?.lost) shared.drop();
  if (!shared) shared = make(document.getElementById(id), gfx);
  shared.bind(handlers); shared.unpark(gfx);
  return shared;
}
/** Giữ tên cũ cho mã gọi trực tiếp (demo / công cụ): luôn tạo renderer riêng. */
export function createRenderer(canvas, gfx, handlers) { const r = make(canvas, gfx); r.bind(handlers); return r; }

function make(canvas, gfx) {
  const g = typeof gfx === 'string' ? { scale: LEVELS[gfx]?.pixelRatio ?? 1.5 } : gfx;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(CLEAR);
  // không đọc nhật ký dịch shader sau mỗi lần dịch (trừ ?debug): getProgramInfoLog bắt trình duyệt chờ dịch xong ngay tại chỗ (khựng)
  renderer.debug.checkShaderErrors = typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // chỉ nhân vật đổ bóng thật (cảnh tĩnh dùng bóng nướng sẵn)
  let pr = null, scale = g.scale, parked = false, lost = false, h = null; // pr: tỉ lệ điểm ảnh do bộ tự chỉnh chất lượng đặt (autoQuality.js)
  const base = () => Math.min(devicePixelRatio, scale);
  const resize = () => {
    if (parked) return;
    renderer.setPixelRatio(pr ?? base());
    renderer.setSize(innerWidth, innerHeight, false);
  };
  addEventListener('resize', resize); resize(); // một lần cho cả phiên (renderer dùng lại giữa các trận)
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); policy = 'drop'; lost = true; h?.onLost?.(); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; h?.onRestored?.(); });
  const self = {
    renderer, resize, basePixelRatio: base, canvas,
    get lost() { return lost; },
    get parked() { return parked; },
    bind(handlers) { h = handlers || null; },
    /** Độ nét người chơi chọn (huỷ mức bộ tự chỉnh đang đặt). */
    setScale(s) { scale = s; pr = null; resize(); },
    setPixelRatio(v) { if (v === pr) return; pr = v; resize(); },
    unpark(gfx2) { parked = false; canvas.classList.remove('parked'); if (gfx2?.scale) scale = gfx2.scale; pr = null; resize(); },
    /** Rời trận: đưa renderer về trạng thái gốc, khung vẽ 1×1 (trả bộ đệm khung), ẩn canvas; giữ chương trình shader. */
    park() {
      if (policy === 'drop') return self.drop();
      parked = true; h = null;
      renderer.setRenderTarget(null); renderer.renderLists.dispose();
      renderer.toneMappingExposure = BASE_EXPOSURE; renderer.shadowMap.autoUpdate = true; renderer.shadowMap.needsUpdate = false;
      renderer.info.autoReset = true; renderer.info.reset(); renderer.setClearColor(CLEAR, 1);
      pr = null; renderer.setPixelRatio(1); renderer.setSize(1, 1, false);
      canvas.classList.add('parked');
    },
    /** Huỷ hẳn renderer + ngữ cảnh, thay canvas mới (canvas đã forceContextLoss không dựng được renderer mới). */
    drop() {
      forgetHeld(); resetShapeKeep();
      removeEventListener('resize', resize);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (_) { /* ngữ cảnh đã mất */ }
      const n = document.createElement('canvas'); n.id = canvas.id; canvas.replaceWith(n);
      if (shared === self) shared = null;
    },
  };
  return self;
}
// kiểm thử trình duyệt: tình trạng renderer dùng chung
if (typeof window !== 'undefined') window.__gl = {
  get parked() { return !!shared?.parked; }, get policy() { return policy; }, get alive() { return !!shared; },
  get programs() { return shared?.renderer.info.programs?.length ?? 0; }, get memory() { return shared ? { ...shared.renderer.info.memory } : null; }, get held() { return heldCount(); },
};
