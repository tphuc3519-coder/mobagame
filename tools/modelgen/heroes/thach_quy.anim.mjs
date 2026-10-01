// Animation viết tay cho Mossback (model diver_pbr_20000: thợ lặn đồng thau cầm cây gậy dài ở tay phải, tay trái buông).
// Tư thế = độ lệch so với tư thế bind (tay buông, gậy dựng đứng cạnh người). Gậy gắn HandR nên:
// xoay cổ tay (hdR rx dương) làm đầu gậy đi từ trên ra trước-xuống; nâng cả cánh tay (uaR rx âm) đưa tay lên phía trước.
import { spline, add, wave, lagged, weaponPath, snap } from '../animlib.mjs';

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
  [0.1, { chest: [-12, 4, 0], spine: [-5, 0, 0], head: [-20, 6, 0], hipsPos: [0, -0.01, -0.04], uaR: [-12, 0, -6], hdR: [-14, 0, 0], uaL: [-18, 0, 30], thL: [4, 0, 0], thR: [-6, 0, 0] }],
  [0.3, { chest: [-8, 0, 0], head: [-18, 0, 0], hipsPos: [0, -0.07, -0.05], uaR: [-22, 0, -16], hdR: [-30, 0, 0], uaL: [-36, 0, 46], thL: [-20, 0, 0], thR: [-12, 0, 0], shL: [44, 0, 0], shR: [38, 0, 0] }],
  [0.58, { root: [-52, 0, 0], rootPos: [0, 0.05, -0.2], chest: [-10, 0, 0], head: [-20, 0, 0], hipsPos: [0, -0.1, 0], uaR: [-30, 0, -24], hdR: [-34, 0, 0], uaL: [-30, 0, 58], thL: [-18, 0, 0], thR: [-8, 0, 0], shL: [40, 0, 0], shR: [32, 0, 0] }],
  [0.74, { root: [-90, 0, 0], rootPos: [0, 0.07, -0.32], chest: [-6, 0, 0], head: [-14, 10, 0], hipsPos: [0, -0.12, 0], uaR: [-12, 0, -34], hdR: [-20, 0, 0], uaL: [-12, 0, 64], thL: [-6, 0, 8], thR: [4, 0, -8], shL: [14, 0, 0], shR: [12, 0, 0] }],
  [0.84, { root: [-84, 0, 0], rootPos: [0, 0.08, -0.31], chest: [-4, 0, 0], head: [-10, 10, 0], hipsPos: [0, -0.11, 0], uaR: [-10, 0, -32], hdR: [-18, 0, 0], uaL: [-10, 0, 62], thL: [-4, 0, 6], thR: [4, 0, -8], shL: [12, 0, 0], shR: [10, 0, 0] }],
  [1, { root: [-88, 0, 0], rootPos: [0, 0.07, -0.31], chest: [-5, 0, 0], head: [-12, 10, 0], hipsPos: [0, -0.12, 0], uaR: [-10, 0, -32], hdR: [-18, 0, 0], uaL: [-10, 0, 62], thL: [-4, 0, 6], thR: [4, 0, -8], shL: [12, 0, 0], shR: [10, 0, 0] }],
]);

const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return { chest: [10 + 1.5 * s, 0, 0], head: [8 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.03 + 0.004 * s, 0.01], uaR: [-40, 0, -8], faR: [-40, 0, 0], hdR: [22, 0, 0], uaL: [-25, 0, 18], faL: [-50, 0, 0], shL: [8, 0, 0], shR: [8, 0, 0] };
};

const victory = spline([
  [0, {}],
  [0.2, { chest: [8, 0, 0], hipsPos: [0, -0.06, 0], thL: [-16, 0, 0], thR: [-12, 0, 0], shL: [34, 0, 0], shR: [30, 0, 0], uaR: [-20, 0, -8], uaL: [-30, 0, 20] }],
  [0.4, { chest: [-12, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.12, 0], uaR: [-70, 0, -14], faR: [-30, 0, 0], hdR: [-6, 0, 0], uaL: [-118, 0, 26], faL: [-20, 0, 0], thL: [-24, 0, 0], thR: [-8, 0, 0], shL: [40, 0, 0], shR: [24, 0, 0] }],
  [0.62, { chest: [-10, 0, 0], head: [-10, 0, 0], uaR: [-68, 0, -14], faR: [-30, 0, 0], uaL: [-120, 0, 24], faL: [-20, 0, 0] }],
  [0.9, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-66, 0, -14], faR: [-30, 0, 0], uaL: [-116, 0, 28], faL: [-20, 0, 0] }],
  [1, {}],
]);

const showcase = (u) => {
  const accent = spline([[0, {}], [0.25, {}], [0.4, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-60, 0, -12], faR: [-30, 0, 0], uaL: [-30, 0, 40] }], [0.6, { chest: [-8, 0, 0], head: [-8, 0, 0], uaR: [-60, 0, -12], faR: [-30, 0, 0], uaL: [-30, 0, 40] }], [0.78, {}], [1, {}]])(u);
  return add(accent, idle(u));
};

// Chồng lấp: thân dẫn, đầu/cổ/tay trái theo sau một nhịp ngắn (u).

// —— Quỹ đạo cây gậy (IK từng khung, armik.mjs) ——
// Toạ độ tư thế gốc (m): x + = bên trái nhân vật, y lên, z + = trước; gắn theo Hông. [tay, hướng gậy (tay → đầu trên)].
// Cao 2.5 m, vai phải (-0.57, 1.89), tầm với ~0.9 m. Gậy dài 2.84: 1.82 phía trên tay, 1.02 phía dưới (chạm đất khi đứng).
const REST = [[-0.87, 1.02, 0], [0, 1, 0]];
const G = {
  lift: [[-0.8, 1.45, 0.25], [0, 0.95, -0.3]],             // nhấc gậy, ngả đầu gậy ra sau
  wind: [[-0.7, 2.05, 0.05], [0, 0.55, -0.83]],            // vác gậy qua vai
  top: [[-0.6, 2.1, 0.55], [0, 0.97, 0.25]],               // gậy dựng trên đầu
  smash: [[-0.55, 1.45, 0.75], [0, -0.3, 0.95]],           // quật đầu gậy xuống trước mặt
  back: [[-0.75, 1.35, 0.35], [0, 0.85, 0.5]],
  pull: [[-0.8, 1.35, -0.15], [0.05, 0.1, 1]],             // kéo gậy về sườn, chĩa ra trước
  thrust: [[-0.55, 1.45, 0.7], [0.05, 0.05, 1]],           // đâm thẳng
  trail: [[-0.85, 1.15, -0.05], [0, 0.6, -0.8]],           // kéo lê gậy phía sau khi lao
  raise: [[-0.8, 1.6, 0.25], [0, 1, 0]],                   // nhấc gậy thẳng đứng
  stomp: [[-0.8, 1.12, 0.35], [0, 1, 0]],                  // dộng đuôi gậy xuống đất
  high: [[-0.72, 2.2, 0.2], [0, 1, 0.05]],                 // giơ gậy cao quá đầu
  front: [[-0.6, 1.3, 0.45], [0, 1, 0]],                   // chống gậy trước mặt
  fall: [[-1.0, 1.2, 0.05], [-0.7, 0.7, 0]],
  down: [[-1.0, 1.2, 0.0], [-1, 0.05, 0]],
};
const P = (...ks) => weaponPath(ks.map(([u, w]) => [u, { R: w }]));
const ikAttack1 = P([0, REST], [0.2, G.lift], [0.38, G.wind], [0.5, G.top], [0.57, G.smash], [0.74, G.smash], [0.88, G.back], [1, REST]);
const ikAttack2 = P([0, REST], [0.2, G.pull], [0.5, G.thrust], [0.68, G.thrust], [0.85, G.back], [1, REST]);
const ikCast1 = P([0, REST], [0.2, G.trail], [0.5, G.trail], [0.75, G.lift], [1, REST]);
const ikCast2 = P([0, REST], [0.28, G.raise], [0.5, G.stomp], [0.7, G.stomp], [1, REST]);
const ikUlt = P([0, REST], [0.25, G.raise], [0.5, G.high], [0.8, G.high], [1, REST]);
const ikDeath = P([0, REST], [0.25, G.lift], [0.6, G.fall], [1, G.down]);
const ikRecall = (u) => ({ R: { hand: [G.front[0][0], G.front[0][1] + 0.01 * wave(u), G.front[0][2]], dir: G.front[1] } });
const ikVictory = P([0, REST], [0.2, G.raise], [0.4, G.high], [0.9, G.high], [1, REST]);

const L = (fn) => lagged(fn, { spine: 0.012, chest: 0.028, neck: 0.04, head: 0.065, uaL: 0.035, faL: 0.055, hdL: 0.075 });

export const mossAnim = {
  style: { atk1: 'smash2', atk2: 'chopR', cast1: 'push2', cast2: 'slam', ult: 'raise2' },
  run: { hold: 'R', amp: 34, arm: 0.18, bob: 0.03, lean: 6, twist: 3 }, idle: 'heavy', moveSpeed: 310, swayAmp: 5,
  ik: { body: 0.42, head: 0.3, headUp: 0.15, leg: 0.18, ground: 0, back: { R: 1.02 } }, // vật cản cho gậy (armik.mjs)
  custom: {
    Idle: { dur: 2.8, loop: true, pose: idle },
    Run: { dur: 'run', loop: true, pose: run },
    Attack1: { dur: 0.6, pose: L(attack1), ik: ikAttack1, warp: snap([[0.4, 0.5, 'out'], [0.46, 0.57, 'in'], [0.52, 0.585, 'lin'], [0.74, 0.74, 'out'], [1, 1, 'io']]) }, // chạm 0.276s
    Attack2: { dur: 0.6, pose: L(attack2), ik: ikAttack2, warp: snap([[0.28, 0.2, 'out'], [0.36, 0.5, 'in'], [0.42, 0.515, 'lin'], [0.66, 0.68, 'out'], [1, 1, 'io']]) }, // chạm 0.216s
    Cast1: { dur: 0.8, pose: L(cast1), ik: ikCast1, warp: snap([[0.26, 0.2, 'out'], [0.38, 0.5, 'in'], [0.44, 0.51, 'lin'], [0.72, 0.75, 'out'], [1, 1, 'io']]) },
    Cast2: { dur: 0.8, pose: L(cast2), ik: ikCast2, warp: snap([[0.34, 0.28, 'out'], [0.42, 0.5, 'in'], [0.48, 0.515, 'lin'], [0.72, 0.7, 'out'], [1, 1, 'io']]) },
    Ult: { dur: 1.4, pose: L(ult), ik: ikUlt, warp: snap([[0.22, 0.25, 'out'], [0.32, 0.5, 'in'], [0.38, 0.52, 'lin'], [1, 1, 'io']]) },
    Death: { dur: 1.6, pose: death, ik: ikDeath, warp: snap([[0.08, 0.1, 'out'], [0.3, 0.3, 'io'], [0.64, 0.74, 'in'], [0.76, 0.84, 'out'], [1, 1, 'io']]) },
    Recall: { dur: 2.0, loop: true, pose: recall, ik: ikRecall },
    Victory: { dur: 2.2, pose: L(victory), ik: ikVictory },
    Showcase: { dur: 4.0, loop: true, pose: showcase },
  },
};
