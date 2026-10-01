// Animation viết tay cho Emberforge (model hammer_pbr_20000: vác búa trên vai phải, chân rộng).
// Tư thế: độ lệch so với tư thế bind. rx âm = vung ra trước (chân/tay), rx dương ở thân = cúi ra trước; rz dương ở bên trái = dạng ra.
// Búa gắn HandR (đầu búa = HandR_Tip). Góc tay phải (uaR/faR/hdR) giải bằng IK từ đích tay + hướng cán búa cho từng thế (bảng A);
// thân, chân, tay trái, vải chỉnh tay. Nội suy bằng spline (animlib) nên chuyển động liền mạch, có đà và giật nhẹ khi chạm.
import { spline, add, wave } from '../animlib.mjs';

// —— Thế búa (tay phải) ——
const A = {
  antic: { uaR: [-1, -5, 2], faR: [1, 16, 11], hdR: [19, -17, -6] },
  windup: { uaR: [-36, 8, 3], faR: [20, -2, 30], hdR: [74, -29, -9] },
  mid: { uaR: [-48, 12, 2], faR: [20, -18, 30], hdR: [107, -27, -7] },
  impact: { uaR: [-21, -12, -2], faR: [-46, -25, -30], hdR: [240, -28, -58] },
  follow: { uaR: [-15, -12, 1], faR: [-46, -21, -30], hdR: [233, -28, -53] },
  raise: { uaR: [-56, 14, 7], faR: [20, -41, 17], hdR: [118, -32, -9] },
  sweepWind: { uaR: [26, -18, 30], faR: [20, 27, 30], hdR: [53, 21, 5] },
  sweepHit: { uaR: [13, -57, -27], faR: [20, 49, 30], hdR: [103, -28, -8] },
  sweepEnd: { uaR: [24, -39, -15], faR: [20, 59, 26], hdR: [100, -14, -5] },
  ground: { uaR: [-27, -19, -4], faR: [-97, 60, -30], hdR: [-6, -65, -30] },
  leap: { uaR: [-67, 14, 25], faR: [20, -56, 5], hdR: [94, -38, -10] },
};

// Vải/khăn: F trước, B sau, L/R hai bên. Giá trị dương rx = vải bay ra sau; trễ nhịp so với thân.
const cloth = (u, lag = 0.1, k = 1) => ({ skF: [(-5 - 5 * wave(u, lag)) * k, 0, 0], skB: [(5 + 5 * wave(u, lag)) * k, 0, 0], skL: [0, 0, 5 * wave(u, lag) * k], skR: [0, 0, -5 * wave(u, lag) * k] });

const idle = (u) => {
  const s = wave(u), s2 = wave(u, 0.15, 2), lag = (p) => wave(u, p);
  return add({
    hipsPos: [0.004 * wave(u, 0.25), -0.005 - 0.006 * s2, 0], spine: [1 * s, 1.5 * wave(u, 0.3), 0], chest: [1.8 * s, -2 * wave(u, 0.3), 0.8 * wave(u, 0.1)], neck: [-0.8 * lag(0.1), 0, 0], head: [-1.2 * s, 1.5 * wave(u, 0.45), 0],
    uaL: [2 * lag(0.1), 0, 2.5 + 1 * s], faL: [-4 - 1.2 * s, 0, 0], hdL: [2 * lag(0.25), 0, 0],
    uaR: [1 * lag(0.12), 0, 0], faR: [0.8 * lag(0.2), 0, 0], hdR: [1.6 * lag(0.3), 0, 0],
    shL: [2 + 1.5 * s2, 0, 0], shR: [2 + 1.5 * s2, 0, 0],
  }, cloth(u));
};

const run = (u) => {
  const ph = Math.PI * 2 * u, s = Math.sin(ph), c = Math.cos(ph), amp = 30;
  const bob = Math.abs(c);
  const knee = (cc) => 16 + 60 * Math.max(0, cc);
  const lag = (p) => Math.sin(ph - p);
  return {
    hipsPos: [0.012 * s, -0.035 + 0.03 * bob, 0],
    spine: [8, 5 * s, 0], chest: [4, 8 * s, 2 * c], head: [-9, -9 * s, 0], neck: [-2, 0, 0],
    thL: [-amp * s, 0, -16], thR: [amp * s, 0, 16], shL: [knee(c), 0, 0], shR: [knee(-c), 0, 0], ftL: [-6 * s - 6, 0, 0], ftR: [6 * s - 6, 0, 0],
    uaL: [amp * s - 12, 0, 6], faL: [-70 - 10 * c, 0, 0],
    uaR: [4 * lag(0.3) + 3, 0, 0], faR: [3 * lag(0.4), 0, 0], hdR: [8 * lag(0.7) + 4, 0, 0],
    skF: [22 + 8 * lag(0.5), 0, 0], skB: [-10 - 6 * lag(0.5), 0, 0], skL: [0, 0, 8 * lag(0.6) + 6], skR: [0, 0, -8 * lag(0.6) - 6],
  };
};

// Đập búa từ trên xuống (đòn thường lẻ). Va chạm ở u=0.5 (0.3s), có giật lại rồi giữ thế.
const attack1 = spline([
  [0, {}],
  [0.14, { chest: [-6, -3, 0], spine: [-3, 0, 0], head: [3, 0, 0], hipsPos: [0, -0.02, -0.012], ...A.antic, uaL: [-10, 0, 8], thR: [10, 0, 0], shR: [12, 0, 0], skF: [-12, 0, 0] }],
  [0.34, { chest: [-16, -8, 0], spine: [-6, 0, 0], head: [8, 0, 0], hipsPos: [0, -0.01, -0.02], ...A.windup, uaL: [-45, 0, 14], faL: [-35, 0, 0], thL: [-10, 0, 0], thR: [14, 0, 0], shR: [16, 0, 0], skF: [-18, 0, 0], skB: [10, 0, 0] }],
  [0.44, { chest: [8, 0, 0], spine: [4, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.03, 0.02], ...A.mid, uaL: [-30, 0, 12], thL: [-18, 0, 0], thR: [16, 0, 0], shR: [20, 0, 0], skF: [8, 0, 0] }],
  [0.5, { chest: [30, 8, 0], spine: [12, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.06, 0.06], ...A.impact, uaL: [-25, 0, 10], thL: [-26, 0, 0], thR: [18, 0, 0], shL: [10, 0, 0], shR: [24, 0, 0], skF: [28, 0, 0], skB: [-20, 0, 0] }],
  [0.66, { chest: [24, 6, 0], spine: [10, 0, 0], head: [8, 0, 0], hipsPos: [0, -0.05, 0.05], ...A.follow, thL: [-24, 0, 0], thR: [16, 0, 0], shR: [22, 0, 0], skF: [10, 0, 0] }],
  [1, {}],
]);

// Quét ngang từ phải sang trái (đòn thường chẵn). Va chạm ở u≈0.43 (0.26s).
const sweepBody = (k) => ({ // k: độ mạnh (1 = đòn thường)
  wind: { chest: [4, -45 * k, 0], spine: [2, -15 * k, 0], head: [0, 25 * k, 0], hips: [0, -10 * k, 0], hipsPos: [-0.01, -0.035, -0.02], thL: [-14, 0, 0], thR: [10, 0, 0], shL: [14, 0, 0], uaL: [10, 0, 15], skL: [0, 0, 12], skR: [0, 0, -14] },
  hit: { chest: [10, 40 * k, 0], spine: [4, 15 * k, 0], head: [0, -25 * k, 0], hips: [0, 12 * k, 0], hipsPos: [0.02, -0.06, 0.07], thL: [-26, 0, 0], thR: [14, 0, 0], shL: [24, 0, 0], shR: [14, 0, 0], uaL: [-25, 0, 18], skL: [0, 0, -16], skR: [0, 0, 16], skF: [26, 0, 0] },
  end: { chest: [8, 55 * k, 0], spine: [3, 18 * k, 0], head: [0, -32 * k, 0], hips: [0, 16 * k, 0], hipsPos: [0.02, -0.05, 0.06], thL: [-24, 0, 0], thR: [14, 0, 0], shL: [22, 0, 0], shR: [12, 0, 0], uaL: [-30, 0, 22], skL: [0, 0, -10], skR: [0, 0, 10], skF: [14, 0, 0] },
});
const attack2 = (() => { const b = sweepBody(1); return spline([[0, {}], [0.12, { chest: [4, -18, 0], hipsPos: [0, -0.02, -0.01], ...A.antic }], [0.3, { ...b.wind, ...A.sweepWind }], [0.43, { ...b.hit, ...A.sweepHit }], [0.62, { ...b.end, ...A.sweepEnd }], [1, {}]]); })();

// Cast1 – Vung Búa (hình quạt): quét ngang mạnh hơn, xoay người nhiều hơn, 0.8s.
const cast1 = (() => { const b = sweepBody(1.25); return spline([[0, {}], [0.15, { chest: [6, -20, 0], hipsPos: [0, -0.03, -0.01], ...A.antic }], [0.34, { ...b.wind, ...A.sweepWind }], [0.5, { ...b.hit, ...A.sweepHit }], [0.7, { ...b.end, ...A.sweepEnd }], [1, {}]]); })();

// Cast2 – Xỉ Sắt (khiên + tăng tốc): chống búa xuống đất, gồng người rồi bật dậy.
const cast2 = spline([
  [0, {}],
  [0.22, { chest: [-8, 0, 0], spine: [-3, 0, 0], head: [4, 0, 0], hipsPos: [0, 0.015, -0.01], ...A.antic, uaL: [-10, 0, 14], skF: [-14, 0, 0] }],
  [0.46, { chest: [18, 0, 0], spine: [8, 0, 0], head: [-4, 0, 0], hipsPos: [0, -0.07, 0.04], ...A.ground, uaL: [-30, 0, 30], faL: [-60, 0, 0], thL: [-14, 0, 0], thR: [10, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0], skF: [20, 0, 0] }],
  [0.66, { chest: [12, 0, 0], spine: [5, 0, 0], head: [-6, 0, 0], hipsPos: [0, -0.05, 0.03], ...A.ground, uaL: [-40, 0, 40], faL: [-70, 0, 0], thL: [-12, 0, 0], shL: [26, 0, 0], shR: [22, 0, 0], skF: [6, 0, 0] }],
  [1, {}],
]);

// Ult – Đe Trời: ngồi lấy đà, bật cao với búa trên đầu, dộng xuống ở u≈0.42 (0.59s), rung nhẹ rồi đứng dậy.
const ult = spline([
  [0, {}],
  [0.12, { chest: [14, 0, 0], spine: [6, 0, 0], head: [-4, 0, 0], hipsPos: [0, -0.12, -0.02], ...A.antic, uaL: [-30, 0, 18], thL: [-34, 0, 0], thR: [-30, 0, 0], shL: [56, 0, 0], shR: [56, 0, 0], skF: [-20, 0, 0] }],
  [0.25, { chest: [-14, 0, 0], spine: [-6, 0, 0], head: [8, 0, 0], hipsPos: [0, 0.3, -0.03], ...A.leap, uaL: [-150, 0, 20], faL: [-20, 0, 0], thL: [-16, 0, 0], thR: [-8, 0, 0], shL: [36, 0, 0], shR: [30, 0, 0], skF: [-26, 0, 0], skB: [16, 0, 0] }],
  [0.34, { chest: [-18, 0, 0], spine: [-8, 0, 0], head: [10, 0, 0], hipsPos: [0, 0.38, -0.03], ...A.leap, hdR: [100, -38, -10], uaL: [-160, 0, 20], thL: [-12, 0, 0], thR: [-6, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0], skF: [-30, 0, 0] }],
  [0.42, { chest: [34, 0, 0], spine: [14, 0, 0], head: [12, 0, 0], hipsPos: [0, -0.1, 0.08], ...A.impact, uaL: [-30, 0, 12], thL: [-44, 0, 0], thR: [-40, 0, 0], shL: [60, 0, 0], shR: [58, 0, 0], skF: [34, 0, 0], skB: [-24, 0, 0] }],
  [0.55, { chest: [28, 0, 0], spine: [12, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.09, 0.07], ...A.follow, thL: [-42, 0, 0], thR: [-38, 0, 0], shL: [58, 0, 0], shR: [56, 0, 0], skF: [12, 0, 0] }],
  [0.82, { chest: [10, 0, 0], spine: [4, 0, 0], hipsPos: [0, -0.03, 0.02], ...A.mid, thL: [-12, 0, 0], thR: [-8, 0, 0], shL: [18, 0, 0], shR: [14, 0, 0] }],
  [1, {}],
]);

const death = spline([
  [0, {}],
  [0.2, { chest: [-10, 0, 0], spine: [-4, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.02, -0.03], ...A.antic, uaL: [-20, 0, 40], skF: [-20, 0, 0] }],
  [0.55, { root: [-36, 0, 0], rootPos: [0, 0.04, -0.14], chest: [-14, 0, 0], head: [-22, 0, 0], hipsPos: [0, -0.1, 0], ...A.windup, uaL: [-30, 0, 55], thL: [-14, 0, 0], thR: [6, 0, 0], shL: [34, 0, 0], shR: [26, 0, 0], skF: [-30, 0, 0], skB: [18, 0, 0] }],
  [1, { root: [-88, 0, 0], rootPos: [0, 0.07, -0.32], chest: [-6, 0, 0], head: [-12, 12, 0], hipsPos: [0, -0.12, 0], ...A.mid, uaL: [-10, 0, 62], thL: [-4, 0, 6], thR: [4, 0, -8], shL: [12, 0, 0], shR: [10, 0, 0], skF: [-10, 0, 0] }],
]);

const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return add({ chest: [18 + 1.5 * s, 0, 0], spine: [8, 0, 0], head: [-6 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.07 + 0.004 * s, 0.04], ...A.ground, uaL: [-30, 0, 30], faL: [-60, 0, 0], thL: [-14, 0, 0], thR: [10, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0] }, cloth(u, 0.15, 1.4));
};

const victory = spline([
  [0, {}],
  [0.2, { chest: [10, 0, 0], hipsPos: [0, -0.07, 0], thL: [-18, 0, 0], thR: [-14, 0, 0], shL: [40, 0, 0], shR: [36, 0, 0], ...A.antic, uaL: [-30, 0, 20], skF: [-16, 0, 0] }],
  [0.4, { chest: [-14, 0, 0], spine: [-6, 0, 0], head: [-16, 0, 0], hipsPos: [0, 0.14, 0], ...A.raise, uaL: [-165, 0, 25], faL: [-14, 0, 0], thL: [-26, 0, 0], thR: [-10, 0, 0], shL: [44, 0, 0], shR: [26, 0, 0], skF: [-28, 0, 0] }],
  [0.62, { chest: [-10, 0, 0], head: [-12, 0, 0], hipsPos: [0, 0.0, 0], ...A.raise, uaL: [-165, 0, 22], skF: [4, 0, 0] }],
  [0.9, { chest: [-8, 0, 0], head: [-8, 0, 0], hipsPos: [0, 0.01, 0], ...A.raise, uaL: [-160, 0, 26] }],
  [1, {}],
]);

const showcase = (u) => {
  const accent = spline([[0, {}], [0.25, {}], [0.38, { chest: [-8, 0, 0], head: [-8, 0, 0], ...A.raise, uaL: [-40, 0, 16], hipsPos: [0, 0.02, 0] }], [0.6, { chest: [-8, 0, 0], head: [-8, 0, 0], ...A.raise, uaL: [-40, 0, 16], hipsPos: [0, 0.02, 0] }], [0.78, {}], [1, {}]])(u);
  return add(accent, idle(u));
};

export const emberAnim = {
  style: { atk1: 'chopR', atk2: 'swingR', cast1: 'pushR', cast2: 'smash2', ult: 'slam' },
  run: { hold: 'R', amp: 34, arm: 0.7, bob: 0.03, lean: 9 }, idle: 'heavy', moveSpeed: 320, swayAmp: 6,
  extra: { skF: 'SkirtF', skB: 'SkirtB', skL: 'SkirtL', skR: 'SkirtR' },
  custom: {
    Idle: { dur: 2.8, loop: true, pose: idle },
    Run: { dur: 'run', loop: true, pose: run },
    Attack1: { dur: 0.6, pose: attack1 },
    Attack2: { dur: 0.6, pose: attack2 },
    Cast1: { dur: 0.8, pose: cast1 },
    Cast2: { dur: 0.8, pose: cast2 },
    Ult: { dur: 1.4, pose: ult },
    Death: { dur: 1.6, pose: death },
    Recall: { dur: 2.0, loop: true, pose: recall },
    Victory: { dur: 2.2, pose: victory },
    Showcase: { dur: 4.0, loop: true, pose: showcase },
  },
};
