// Joystick động: chạm bất kỳ ở 45% trái màn hình; bán kính 90 px, vùng chết 10% (07 §9). WASD/mũi tên cho máy tính.
export function createInput(target) {
  const R = 90, DEAD = 0.1;
  const js = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const keys = new Set();
  const down = (e) => {
    if (js.active || e.clientX > innerWidth * 0.45) return;
    js.active = true; js.id = e.pointerId; js.ox = js.x = e.clientX; js.oy = js.y = e.clientY;
    target.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => { if (e.pointerId === js.id) { js.x = e.clientX; js.y = e.clientY; } };
  const up = (e) => { if (e.pointerId === js.id) js.active = false; };
  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  return {
    js, R,
    /** Vector hướng, độ dài 0..1, trục màn hình (y xuống = +). */
    dir() {
      let x = 0, y = 0;
      if (js.active) {
        let dx = js.x - js.ox, dy = js.y - js.oy;
        const l = Math.hypot(dx, dy), k = Math.min(1, l / R);
        if (k > DEAD) { x = (dx / l) * k; y = (dy / l) * k; }
      }
      const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; }
      return { x, y };
    },
  };
}
