// Vòng lặp: mô phỏng cố định 30 tick/s, render nội suy (02 §3).
export const TICK = 1 / 30;

export function createLoop({ update, render, requestFrame = (f) => requestAnimationFrame(f), cancelFrame = (i) => cancelAnimationFrame(i) }) {
  let acc = 0, last = null, running = true, tick = 0, id = 0, stopped = false;
  const frame = (now) => {
    if (stopped) return;
    id = requestFrame(frame);
    if (last === null) last = now;
    const dt = Math.min((now - last) / 1000, 0.25); // chống xoáy chết khi tab bị treo
    last = now;
    if (running) {
      acc += dt;
      while (acc >= TICK) { tick++; update(tick); acc -= TICK; }
    }
    render(acc / TICK, dt);
  };
  return {
    start() { if (!stopped) id = requestFrame(frame); },
    /** Dừng hẳn cả mô phỏng lẫn vẽ (huỷ requestAnimationFrame). pause() chỉ dừng mô phỏng, vẫn vẽ. */
    stop() { stopped = true; running = false; cancelFrame(id); },
    pause() { running = false; },
    resume() { running = true; last = null; },
    /** Chạy nhanh n tick không vẽ (debug ?ff=giây). */
    fastForward(n) { for (let i = 0; i < n; i++) { tick++; update(tick); } },
    get tick() { return tick; },
    get running() { return running; },
    get stopped() { return stopped; },
  };
}
