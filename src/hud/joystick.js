// Joystick: luôn hiện ở góc trái dưới; chạm bất kỳ ở 45% trái màn hình là điều khiển. Cài đặt "Lệnh di chuyển" (prefs.stick, đọc lúc chạm):
// 'follow' cần dời tới chỗ chạm (như cũ), kéo quá bán kính thì đế cần trượt theo ngón; 'fixed' đế đứng yên ở vị trí nghỉ, hướng = ngón − tâm đế.
// Bán kính 90 px, vùng chết 10% (07 §9). Kéo gần hay hết tầm đều đi đúng một tốc độ (tốc độ chạy của tướng) — chỉ hướng là quan trọng. WASD/mũi tên cho máy tính.
// Vẽ cần: hud.js (đế ở js.ox/oy khi đang chạm, ở rest() khi nghỉ).
import { pref } from '../core/prefs.js';

export function createInput(target) {
  const R = 90, DEAD = 0.1;
  const js = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, fixed: false };
  const keys = new Set();
  /** Vị trí nghỉ của cần (khi không chạm; cũng là đế cố định): góc trái dưới, chừa vùng an toàn của màn tai thỏ. */
  const rest = () => ({ x: Math.max(160, R + 70), y: innerHeight - Math.max(130, R + 40) });
  const down = (e) => {
    if (js.active || e.clientX > innerWidth * 0.45) return;
    js.active = true; js.id = e.pointerId; js.x = e.clientX; js.y = e.clientY; js.fixed = pref('stick') === 'fixed';
    const o = js.fixed ? rest() : { x: e.clientX, y: e.clientY }; js.ox = o.x; js.oy = o.y;
    target.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (e.pointerId !== js.id || !js.active) return;
    js.x = e.clientX; js.y = e.clientY;
    const dx = js.x - js.ox, dy = js.y - js.oy, l = Math.hypot(dx, dy);
    if (!js.fixed && l > R) { js.ox = js.x - (dx / l) * R; js.oy = js.y - (dy / l) * R; } // kéo quá bán kính: đế trượt theo ngón (đổi hướng không phải kéo ngược cả đoạn)
  };
  const up = (e) => { if (e.pointerId === js.id) js.active = false; };
  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { keys.clear(); js.active = false; }); // rời ứng dụng giữa lúc giữ cần: không để tướng chạy mãi
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); js.active = false; } });
  return {
    js, R, rest,
    /** Vector hướng đơn vị (hoặc 0), trục màn hình (y xuống = +). */
    dir() {
      let x = 0, y = 0;
      if (js.active) {
        let dx = js.x - js.ox, dy = js.y - js.oy;
        const l = Math.hypot(dx, dy), k = Math.min(1, l / R);
        if (k > DEAD) { x = dx / l; y = dy / l; }
      }
      const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; }
      return { x, y };
    },
  };
}
