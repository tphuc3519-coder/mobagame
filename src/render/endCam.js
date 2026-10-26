// Camera cuối trận: trượt êm (smootherstep) từ chỗ đang nhìn tới nhà chính vừa vỡ trong END.panSec giây — trả `look` cho camera.follow.
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
/** Nhà chính của đội thua (đội khác đội thắng) — cả khi thua vì đầu hàng (nhà chính còn nguyên). */
export const endTarget = (world, winner) => world.entities.find((e) => e.kind === 'core' && e.team !== winner) || null;
export function createEndCam({ from, to, panSec }) {
  let t = 0;
  return {
    get t() { return t; },
    look(dt) { t += dt; const k = smoother(Math.min(1, t / panSec)); return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, rate: 1e4 }; },
  };
}
