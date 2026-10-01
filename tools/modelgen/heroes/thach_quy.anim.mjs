// Animation viết tay cho Mossback (model diver_pbr_20000: thợ lặn đồng thau cầm cây gậy dài ở tay phải, tay trái buông).
// Tư thế = độ lệch so với tư thế bind (tay buông, gậy dựng đứng cạnh người). Gậy gắn HandR nên:
// xoay cổ tay (hdR rx dương) làm đầu gậy đi từ trên ra trước-xuống; nâng cả cánh tay (uaR rx âm) đưa tay lên phía trước.
import { spline, add, wave } from '../animlib.mjs';

const cloth = () => ({});
const idle = (u) => {
  const s = wave(u), s2 = wave(u, 0.15, 2), lag = (p) => wave(u, p);
  return {
    hipsPos: [0.003 * wave(u, 0.25), -0.004 - 0.005 * s2, 0], spine: [0.8 * s, 1.2 * wave(u, 0.3), 0], chest: [1.6 * s, -1.5 * wave(u, 0.3), 0.6 * wave(u, 0.1)], head: [-1.4 * s, 2 * wave(u, 0.45), 0],
    uaL: [2 * lag(0.1), 0, 3 + 1 * s], faL: [-5 - 1.2 * s, 0, 0], hdL: [2 * lag(0.25), 0, 0],
    uaR: [1 * lag(0.12), 0, 0], faR: [-4 + 0.8 * lag(0.2), 0, 0], hdR: [1.2 * lag(0.3), 0, 0],
    shL: [1.5 + 1.2 * s2, 0, 0], shR: [1.5 + 1.2 * s2, 0, 0],
  };
};

const run = (u) => {
  const ph = Math.PI * 2 * u, s = Math.sin(ph), c = Math.cos(ph), amp = 30, bob = Math.abs(c);
  const knee = (cc) => 14 + 52 * Math.max(0, cc), lag = (p) => Math.sin(ph - p);
  return {
    hipsPos: [0.01 * s, -0.025 + 0.025 * bob, 0], spine: [6, 4 * s, 0], chest: [3, 7 * s, 1.5 * c], head: [-7, -7 * s, 0],
    thL: [-amp * s, 0, 0], thR: [amp * s, 0, 0], shL: [knee(c), 0, 0], shR: [knee(-c), 0, 0], ftL: [-6 * s - 6, 0, 0], ftR: [6 * s - 6, 0, 0],
    uaL: [amp * 0.9 * s - 10, 0, 6], faL: [-60 - 10 * c, 0, 0],
    uaR: [3 * lag(0.3), 0, 0], faR: [-4 + 2 * lag(0.4), 0, 0], hdR: [5 * lag(0.6) - 3, 0, 0],
  };
};

// Đập gậy từ trên xuống: ngửa người, nâng tay + ngả cổ tay ra sau, rồi quật đầu gậy ra trước-xuống. Va chạm u≈0.57 (0.34s).
const attack1 = spline([
  [0, {}],
  [0.16, { chest: [-6, -4, 0], spine: [-3, 0, 0], head: [3, 0, 0], hipsPos: [0, -0.015, -0.01], uaR: [-8, 0, -4], faR: [-4, 0, 0], hdR: [-14, 0, 0], uaL: [-10, 0, 8], thR: [8, 0, 0], shR: [8, 0, 0] }],
  [0.36, { chest: [-14, -8, 0], spine: [-6, 0, 0], head: [8, 0, 0], hipsPos: [0, -0.01, -0.025], uaR: [-34, 0, -8], faR: [-30, 0, 0], hdR: [-48, 0, 0], uaL: [-35, 0, 14], faL: [-30, 0, 0], thL: [-6, 0, 0], thR: [12, 0, 0], shR: [12, 0, 0] }],
  [0.5, { chest: [10, 0, 0], spine: [5, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.03, 0.02], uaR: [-52, 0, -8], faR: [-30, 0, 0], hdR: [40, 0, 0], uaL: [-25, 0, 12], thL: [-16, 0, 0], thR: [14, 0, 0], shR: [16, 0, 0] }],
  [0.57, { chest: [26, 4, 0], spine: [10, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.06, 0.06], uaR: [-58, 0, -8], faR: [-24, 0, 0], hdR: [105, 0, 0], uaL: [-20, 0, 10], thL: [-24, 0, 0], thR: [16, 0, 0], shL: [8, 0, 0], shR: [22, 0, 0] }],
  [0.74, { chest: [22, 3, 0], spine: [8, 0, 0], head: [8, 0, 0], hipsPos: [0, -0.05, 0.05], uaR: [-54, 0, -8], faR: [-22, 0, 0], hdR: [100, 0, 0], thL: [-22, 0, 0], thR: [14, 0, 0], shR: [20, 0, 0] }],
  [1, {}],
]);

// Đâm gậy ra trước: kéo gậy về sườn rồi đâm thẳng. Va chạm u≈0.5 (0.3s).
const attack2 = spline([
  [0, {}],
  [0.2, { chest: [-4, -14, 0], spine: [-2, 0, 0], head: [2, 8, 0], hipsPos: [0, -0.025, -0.02], uaR: [-30, 0, -14], faR: [-70, 0, 0], hdR: [70, 0, 0], uaL: [-20, 0, 14], thL: [-6, 0, 0], thR: [14, 0, 0], shR: [14, 0, 0] }],
  [0.5, { chest: [12, 12, 0], spine: [5, 0, 0], head: [4, -6, 0], hipsPos: [0, -0.05, 0.08], uaR: [-72, 0, -6], faR: [-8, 0, 0], hdR: [88, 0, 0], uaL: [-22, 0, 16], thL: [-28, 0, 0], thR: [16, 0, 0], shL: [10, 0, 0], shR: [20, 0, 0] }],
  [0.68, { chest: [10, 10, 0], spine: [4, 0, 0], hipsPos: [0, -0.045, 0.07], uaR: [-68, 0, -6], faR: [-10, 0, 0], hdR: [86, 0, 0], thL: [-26, 0, 0], thR: [14, 0, 0], shR: [18, 0, 0] }],
  [1, {}],
]);

// Cast1 – Húc Núi: cúi người lao tới, gậy kéo ra sau, vai dẫn đầu.
const cast1 = spline([
  [0, {}],
  [0.2, { chest: [8, -10, 0], spine: [4, 0, 0], head: [-4, 0, 0], hipsPos: [0, -0.06, -0.03], uaR: [10, 0, -8], faR: [-20, 0, 0], hdR: [-30, 0, 0], uaL: [-30, 0, 16], thL: [-20, 0, 0], thR: [18, 0, 0], shL: [30, 0, 0], shR: [22, 0, 0] }],
  [0.5, { chest: [36, 6, 0], spine: [14, 0, 0], head: [-12, 0, 0], hipsPos: [0, -0.08, 0.12], uaR: [14, 0, -6], faR: [-16, 0, 0], hdR: [-36, 0, 0], uaL: [-60, 0, 8], faL: [-40, 0, 0], thL: [-38, 0, 0], thR: [26, 0, 0], shL: [22, 0, 0], shR: [34, 0, 0] }],
  [0.75, { chest: [20, 2, 0], spine: [8, 0, 0], head: [-6, 0, 0], hipsPos: [0, -0.04, 0.05], uaR: [4, 0, -4], hdR: [-14, 0, 0], thL: [-14, 0, 0], thR: [10, 0, 0], shR: [14, 0, 0] }],
  [1, {}],
]);

// Cast2 – Chấn Địa: nhấc gậy và gối lên, giậm chân xuống, đập đuôi gậy xuống đất.
const cast2 = spline([
  [0, {}],
  [0.28, { chest: [-8, 0, 0], spine: [-3, 0, 0], head: [4, 0, 0], hipsPos: [0, 0.01, 0], uaR: [-30, 0, -8], faR: [-30, 0, 0], hdR: [-24, 0, 0], uaL: [-40, 0, 20], thL: [-34, 0, 0], shL: [56, 0, 0], thR: [4, 0, 0] }],
  [0.5, { chest: [22, 0, 0], spine: [8, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.07, 0.03], uaR: [-52, 0, -8], faR: [-28, 0, 0], hdR: [48, 0, 0], uaL: [-30, 0, 24], thL: [-12, 0, 0], thR: [12, 0, 0], shL: [24, 0, 0], shR: [24, 0, 0] }],
  [0.7, { chest: [14, 0, 0], spine: [5, 0, 0], hipsPos: [0, -0.05, 0.02], uaR: [-46, 0, -8], faR: [-24, 0, 0], hdR: [30, 0, 0], thL: [-10, 0, 0], thR: [10, 0, 0], shL: [20, 0, 0], shR: [20, 0, 0] }],
  [1, {}],
]);

// Ult – Đền Thiêng: giơ gậy lên cao, ưỡn ngực gầm lên, dang tay trái.
const ult = spline([
  [0, {}],
  [0.25, { chest: [8, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.06, 0], uaR: [-30, 0, -10], faR: [-40, 0, 0], thL: [-12, 0, 0], thR: [-8, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0], uaL: [-20, 0, 24] }],
  [0.5, { chest: [-16, 0, 0], spine: [-6, 0, 0], head: [-18, 0, 0], hipsPos: [0, 0.03, -0.01], uaR: [-60, 0, -14], faR: [-30, 0, 0], hdR: [-10, 0, 0], uaL: [-30, 0, 46], faL: [-30, 0, 0], thL: [-6, 0, 0], thR: [-6, 0, 0], shL: [10, 0, 0], shR: [10, 0, 0] }],
  [0.8, { chest: [-14, 0, 0], head: [-16, 0, 0], hipsPos: [0, 0.02, 0], uaR: [-58, 0, -14], faR: [-28, 0, 0], hdR: [-8, 0, 0], uaL: [-30, 0, 48] }],
  [1, {}],
]);

const death = spline([
  [0, {}],
  [0.25, { chest: [-8, 0, 0], head: [-12, 0, 0], hipsPos: [0, -0.02, -0.03], uaR: [-12, 0, -6], hdR: [-10, 0, 0], uaL: [-20, 0, 40] }],
  [0.6, { root: [-40, 0, 0], rootPos: [0, 0.05, -0.14], chest: [-12, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.12, 0], uaR: [-26, 0, -20], hdR: [-30, 0, 0], uaL: [-30, 0, 55], thL: [-14, 0, 0], shL: [34, 0, 0], shR: [26, 0, 0] }],
  [1, { root: [-88, 0, 0], rootPos: [0, 0.07, -0.3], chest: [-6, 0, 0], head: [-10, 10, 0], hipsPos: [0, -0.12, 0], uaR: [-12, 0, -30], hdR: [-20, 0, 0], uaL: [-10, 0, 62], thL: [-4, 0, 6], thR: [4, 0, -8], shL: [12, 0, 0], shR: [10, 0, 0] }],
]);

const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return { chest: [10 + 1.5 * s, 0, 0], head: [8 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.03 + 0.004 * s, 0.01], uaR: [-40, 0, -8], faR: [-40, 0, 0], hdR: [22, 0, 0], uaL: [-25, 0, 18], faL: [-50, 0, 0], shL: [8, 0, 0], shR: [8, 0, 0] };
};

const victory = spline([
  [0, {}],
  [0.2, { chest: [8, 0, 0], hipsPos: [0, -0.06, 0], thL: [-16, 0, 0], thR: [-12, 0, 0], shL: [34, 0, 0], shR: [30, 0, 0], uaR: [-20, 0, -8], uaL: [-30, 0, 20] }],
  [0.4, { chest: [-12, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.12, 0], uaR: [-70, 0, -14], faR: [-30, 0, 0], hdR: [-6, 0, 0], uaL: [-160, 0, 24], thL: [-24, 0, 0], thR: [-8, 0, 0], shL: [40, 0, 0], shR: [24, 0, 0] }],
  [0.62, { chest: [-10, 0, 0], head: [-10, 0, 0], uaR: [-68, 0, -14], faR: [-30, 0, 0], uaL: [-162, 0, 22] }],
  [0.9, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-66, 0, -14], faR: [-30, 0, 0], uaL: [-158, 0, 26] }],
  [1, {}],
]);

const showcase = (u) => {
  const accent = spline([[0, {}], [0.25, {}], [0.4, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-60, 0, -12], faR: [-30, 0, 0], uaL: [-30, 0, 40] }], [0.6, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-60, 0, -12], faR: [-30, 0, 0], uaL: [-30, 0, 40] }], [0.78, {}], [1, {}]])(u);
  return add(accent, idle(u));
};

export const mossAnim = {
  style: { atk1: 'smash2', atk2: 'chopR', cast1: 'push2', cast2: 'slam', ult: 'raise2' },
  run: { hold: 'R', amp: 34, arm: 0.18, bob: 0.03, lean: 6, twist: 3 }, idle: 'heavy', moveSpeed: 310, swayAmp: 5,
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
