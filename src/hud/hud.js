/** Canvas 2D phủ trên cảnh: joystick + thông số debug. */
export function createHud(canvas, input) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const resize = () => { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; };
  addEventListener('resize', resize); resize();
  return {
    draw(debugLines) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { js, R } = input;
      if (js.active) {
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(243,233,214,0.5)'; ctx.fillStyle = 'rgba(15,18,36,0.35)';
        ctx.beginPath(); ctx.arc(js.ox, js.oy, R, 0, 7); ctx.fill(); ctx.stroke();
        const dx = js.x - js.ox, dy = js.y - js.oy, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
        ctx.fillStyle = 'rgba(255,184,77,0.85)';
        ctx.beginPath(); ctx.arc(js.ox + dx * k, js.oy + dy * k, 34, 0, 7); ctx.fill();
      }
      if (debugLines?.length) {
        ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#f3e9d6'; ctx.textBaseline = 'top';
        debugLines.forEach((t, i) => ctx.fillText(t, 10, 10 + i * 15));
      }
    },
  };
}
