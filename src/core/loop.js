// Vòng lặp: mô phỏng cố định 30 tick/s, render nội suy (02 §3).
export const TICK = 1 / 30;

export function createLoop({ update, render, requestFrame = (f) => requestAnimationFrame(f) }) {
  let acc = 0, last = null, running = true, tick = 0, id = 0;
  const frame = (now) => {
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
    start() { id = requestFrame(frame); },
    pause() { running = false; },
    resume() { running = true; last = null; },
    get tick() { return tick; },
    get running() { return running; },
  };
}
