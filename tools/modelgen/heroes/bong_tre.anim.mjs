// Animation viết tay cho Bamboo Shade (model ronin_pbr_100000: kiếm sĩ nón lá, hai kiếm đeo ở hai tay, thế tay buông thõng).
// Tư thế tay lấy từ IK (bong_tre.poses.mjs); thân/chân/vạt áo chỉnh tay. Hai thanh kiếm gắn HandR/HandL nên chuyển động theo cổ tay.
import { spline, add, wave, lagged, mix, weaponPath } from '../animlib.mjs';
import { ARM } from './bong_tre.poses.mjs';

const A = (name) => { const p = ARM[name], o = {}; for (const k of ['uaR', 'faR', 'hdR', 'uaL', 'faL', 'hdL']) o[k] = p[k] || [0, 0, 0]; return o; };
const only = (p, side) => Object.fromEntries(Object.entries(p).filter(([k]) => k.endsWith(side)));
const cloth = (u, lag = 0.1, k = 1) => ({ skF: [(-4 - 4 * wave(u, lag)) * k, 0, 0], skB: [(4 + 4 * wave(u, lag)) * k, 0, 0], skL: [0, 0, 5 * wave(u, lag) * k], skR: [0, 0, -5 * wave(u, lag) * k] });

const idle = (u) => {
  const s = wave(u), s2 = wave(u, 0.15, 2), lag = (p) => wave(u, p);
  return add({
    hipsPos: [0.004 * wave(u, 0.25), -0.012 - 0.006 * s2, 0], spine: [4 + 1.2 * s, 1.2 * wave(u, 0.3), 0], chest: [2 + 1.6 * s, -2 * wave(u, 0.3), 0.6 * wave(u, 0.1)], neck: [-1 * lag(0.1), 0, 0], head: [-3 - 1.2 * s, 2 * wave(u, 0.45), 0],
    thL: [-6, 0, 3], thR: [-3, 0, -3], shL: [8 + 2 * s2, 0, 0], shR: [6 + 2 * s2, 0, 0],
    uaR: [2 * lag(0.1), 0, 0], faR: [-4 + 1 * lag(0.2), 0, 0], hdR: [2 * lag(0.3), 0, 0], uaL: [2 * lag(0.12), 0, 0], faL: [-4 + 1 * lag(0.22), 0, 0], hdL: [2 * lag(0.32), 0, 0],
  }, cloth(u, 0.1, 1));
};

const run = (u) => {
  const ph = Math.PI * 2 * u, s = Math.sin(ph), c = Math.cos(ph), amp = 38, bob = Math.abs(c), lag = (p) => Math.sin(ph - p);
  const knee = (cc) => 18 + 70 * Math.max(0, cc);
  const arms = mix(A('runA'), A('runB'), 0.5 + 0.5 * s);
  return add({
    hipsPos: [0.012 * s, -0.04 + 0.03 * bob, 0], spine: [14, 6 * s, 0], chest: [4, 12 * s, 2 * c], head: [-12, -10 * s, 0], neck: [-3, 0, 0],
    thL: [-amp * s, 0, -4], thR: [amp * s, 0, 4], shL: [knee(c), 0, 0], shR: [knee(-c), 0, 0], ftL: [-6 * s - 6, 0, 0], ftR: [6 * s - 6, 0, 0],
    skF: [24 + 8 * lag(0.5), 0, 0], skB: [-10 - 6 * lag(0.5), 0, 0], skL: [0, 0, 8 * lag(0.6) + 5], skR: [0, 0, -8 * lag(0.6) - 5],
  }, arms);
};

// Chém tay phải (đòn thường lẻ): rút kiếm sau vai, chém chéo từ phải sang trái; chạm ở u=0.33 (0.2s).
const slashR = spline([
  [0, {}],
  [0.14, { chest: [0, -18, 0], spine: [0, -6, 0], head: [-2, 10, 0], hipsPos: [0, -0.02, -0.01], ...A('rWind'), uaL: [-4, 0, 6] }],
  [0.2, { chest: [0, -35, 0], spine: [0, -12, 0], head: [-2, 18, 0], hipsPos: [0, -0.03, -0.02], thL: [-6, 0, 0], thR: [10, 0, 0], shR: [14, 0, 0], ...A('rWind'), skF: [-16, 0, 0], skB: [10, 0, 0] }],
  [0.33, { chest: [10, 38, 0], spine: [4, 14, 0], head: [2, -16, 0], hipsPos: [0, -0.06, 0.07], thL: [-26, 0, 0], thR: [14, 0, 0], shL: [10, 0, 0], shR: [24, 0, 0], ...A('rHit'), skF: [26, 0, 0], skB: [-18, 0, 0] }],
  [0.55, { chest: [10, 50, 0], spine: [4, 18, 0], head: [2, -22, 0], hipsPos: [0, -0.05, 0.06], thL: [-24, 0, 0], thR: [14, 0, 0], shL: [10, 0, 0], shR: [22, 0, 0], ...A('rEnd'), skF: [10, 0, 0] }],
  [1, {}],
]);
const mirrorKey = (k) => (/[LR]$/.test(k) ? k.slice(0, -1) + (k.endsWith('L') ? 'R' : 'L') : k);
const slashL = spline([
  [0, {}],
  [0.14, { chest: [0, 18, 0], spine: [0, 6, 0], head: [-2, -10, 0], hipsPos: [0, -0.02, -0.01], ...A('lWind'), uaR: [-4, 0, -6] }],
  [0.2, { chest: [0, 35, 0], spine: [0, 12, 0], head: [-2, -18, 0], hipsPos: [0, -0.03, -0.02], thR: [-6, 0, 0], thL: [10, 0, 0], shL: [14, 0, 0], ...A('lWind'), skF: [-16, 0, 0], skB: [10, 0, 0] }],
  [0.33, { chest: [10, -38, 0], spine: [4, -14, 0], head: [2, 16, 0], hipsPos: [0, -0.06, 0.07], thR: [-26, 0, 0], thL: [14, 0, 0], shR: [10, 0, 0], shL: [24, 0, 0], ...A('lHit'), skF: [26, 0, 0], skB: [-18, 0, 0] }],
  [0.55, { chest: [10, -50, 0], spine: [4, -18, 0], head: [2, 22, 0], hipsPos: [0, -0.05, 0.06], thR: [-24, 0, 0], thL: [14, 0, 0], shR: [10, 0, 0], shL: [22, 0, 0], ...A('lEnd'), skF: [10, 0, 0] }],
  [1, {}],
]);

// Cast1 – Lướt Xuyên: cúi người, hai kiếm duỗi ra sau rồi chém chéo chữ X khi lao qua.
const dashX = spline([
  [0, {}],
  [0.2, { chest: [26, 0, 0], spine: [12, 0, 0], head: [-10, 0, 0], hipsPos: [0, -0.08, -0.04], thL: [-30, 0, 0], thR: [24, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0], ...A('runA'), skF: [-20, 0, 0] }],
  [0.46, { chest: [22, 0, 0], spine: [10, 0, 0], head: [-8, 0, 0], hipsPos: [0, -0.07, 0.1], thL: [-40, 0, 0], thR: [30, 0, 0], shR: [40, 0, 0], ...A('cross'), skF: [34, 0, 0], skB: [-24, 0, 0] }],
  [0.7, { chest: [12, 0, 0], spine: [5, 0, 0], hipsPos: [0, -0.04, 0.05], thL: [-20, 0, 0], thR: [14, 0, 0], ...A('cross') }],
  [1, {}],
]);

// Cast2 – Xoay Kiếm: dang hai kiếm ngang rồi xoay trọn một vòng.
const spin = spline([
  [0, {}],
  [0.2, { chest: [8, 0, 0], hipsPos: [0, -0.06, 0], thL: [-14, 0, 0], thR: [-14, 0, 0], shL: [30, 0, 0], shR: [30, 0, 0], ...A('spread'), skF: [-14, 0, 0] }],
  [0.6, { root: [0, 360, 0], hipsPos: [0, 0.06, 0], thL: [-26, 0, 0], thR: [12, 0, 0], shL: [30, 0, 0], shR: [14, 0, 0], ...A('spread'), skL: [0, 0, 30], skR: [0, 0, -30], skF: [30, 0, 0] }],
  [0.9, { root: [0, 360, 0], hipsPos: [0, -0.03, 0.02], ...A('cross'), chest: [8, 0, 0] }],
  [1, { root: [0, 360, 0] }],
]);

// Ult – Chuỗi Chém: chém phải, chém trái, nhảy lên chém chữ X xuống.
const ult = spline([
  [0, {}],
  [0.1, { chest: [0, -30, 0], spine: [0, -10, 0], hipsPos: [0, -0.03, -0.02], ...A('rWind') }],
  [0.2, { chest: [10, 38, 0], spine: [4, 14, 0], hipsPos: [0, -0.06, 0.07], thL: [-26, 0, 0], thR: [14, 0, 0], shR: [24, 0, 0], ...A('rHit') }],
  [0.3, { chest: [0, 32, 0], spine: [0, 12, 0], hipsPos: [0, -0.03, 0.02], ...A('lWind') }],
  [0.4, { chest: [10, -38, 0], spine: [4, -14, 0], hipsPos: [0, -0.06, 0.07], thR: [-26, 0, 0], thL: [14, 0, 0], shL: [24, 0, 0], ...A('lHit') }],
  [0.52, { chest: [-12, 0, 0], spine: [-4, 0, 0], hipsPos: [0, 0.3, 0], thL: [-30, 0, 0], thR: [-20, 0, 0], shL: [50, 0, 0], shR: [40, 0, 0], ...A('up') }],
  [0.66, { chest: [22, 0, 0], spine: [8, 0, 0], hipsPos: [0, -0.12, 0.1], thL: [-40, 0, 0], thR: [-34, 0, 0], shL: [60, 0, 0], shR: [56, 0, 0], ...A('down') }],
  [0.82, { chest: [12, 0, 0], hipsPos: [0, -0.06, 0.04], ...A('cross') }],
  [1, {}],
]);

const death = spline([
  [0, {}],
  [0.15, { chest: [-14, 6, 0], spine: [-6, 0, 0], head: [-22, 8, 0], hipsPos: [0, -0.01, -0.04], ...A('guard'), skF: [-24, 0, 0], skB: [16, 0, 0] }],
  [0.4, { chest: [-8, 0, 0], head: [-16, 0, 0], hipsPos: [0, -0.1, -0.05], thL: [-20, 0, 0], thR: [-12, 0, 0], shL: [46, 0, 0], shR: [38, 0, 0], ...A('spread') }],
  [0.62, { root: [-52, 0, 0], rootPos: [0, 0.05, -0.2], chest: [-10, 0, 0], head: [-20, 0, 0], hipsPos: [0, -0.1, 0], ...A('spread'), thL: [-18, 0, 0], shL: [40, 0, 0], shR: [32, 0, 0] }],
  [0.78, { root: [-90, 0, 0], rootPos: [0, 0.07, -0.34], chest: [-6, 0, 0], head: [-14, 10, 0], hipsPos: [0, -0.12, 0], ...A('spread'), thL: [-6, 0, 8], thR: [4, 0, -8], shL: [14, 0, 0], shR: [12, 0, 0] }],
  [1, { root: [-88, 0, 0], rootPos: [0, 0.07, -0.33], chest: [-5, 0, 0], head: [-12, 10, 0], hipsPos: [0, -0.12, 0], ...A('spread'), thL: [-4, 0, 6], thR: [4, 0, -8], shL: [12, 0, 0], shR: [10, 0, 0] }],
]);

const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return add({ chest: [14 + 1.5 * s, 0, 0], spine: [6, 0, 0], head: [-6 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.07 + 0.004 * s, 0.03], thL: [-14, 0, 0], thR: [10, 0, 0], shL: [30, 0, 0], shR: [26, 0, 0], ...A('cross') }, cloth(u, 0.15, 1.6));
};

const victory = spline([
  [0, {}],
  [0.2, { chest: [10, 0, 0], hipsPos: [0, -0.08, 0], thL: [-18, 0, 0], thR: [-14, 0, 0], shL: [40, 0, 0], shR: [36, 0, 0], ...A('guard') }],
  [0.4, { chest: [-14, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.14, 0], ...A('up'), thL: [-26, 0, 0], thR: [-10, 0, 0], shL: [44, 0, 0], shR: [26, 0, 0], skF: [-26, 0, 0] }],
  [0.62, { chest: [-10, 0, 0], head: [-10, 0, 0], hipsPos: [0, 0.0, 0], ...A('up') }],
  [0.9, { chest: [-6, 0, 0], head: [-6, 0, 0], ...A('cross') }],
  [1, {}],
]);

const showcase = (u) => add(spline([[0, {}], [0.25, {}], [0.4, { chest: [6, 0, 0], ...A('cross') }], [0.6, { chest: [6, 0, 0], ...A('cross') }], [0.78, {}], [1, {}]])(u), idle(u));


// —— Quỹ đạo hai thanh kiếm (IK từng khung, armik.mjs) ——
// Toạ độ tư thế gốc (m): x + = bên trái nhân vật, y lên, z + = trước; gắn theo Hông. [tay, hướng lưỡi kiếm (tay → mũi)].
// Cao 2.2 m, vai ở y 1.69, tầm với ~0.7 m từ vai, kiếm phải dài 0.92, kiếm trái 1.1. Tư thế gốc: hai kiếm buông xuôi chếch ra trước.
const RR = [[-0.47, 1.0, 0], [-0.57, -0.73, 0.37]], RL = [[0.47, 1.0, 0], [-0.03, -0.65, 0.76]];
const mirror = ([h, d]) => [[-h[0], h[1], h[2]], [-d[0], d[1], d[2]]];
const K = {
  guardR: [[-0.3, 1.25, 0.35], [0.2, 0.35, 0.9]],             // thủ thế: mũi kiếm chĩa trước-lên
  windR: [[-0.55, 1.75, -0.05], [-0.3, 0.85, -0.45]],         // giơ kiếm qua vai phải
  hitR: [[-0.02, 1.2, 0.5], [0.6, -0.45, 0.65]],              // chém chéo xuống sang trái
  followR: [[0.15, 1.1, 0.35], [0.75, -0.6, 0.25]],
  backR: [[-0.2, 1.0, 0.3], [-0.3, -0.75, 0.6]],
  lowBackR: [[-0.4, 1.15, -0.2], [-0.3, -0.4, -0.85]],        // kiếm kéo ra sau khi lao
  upR: [[-0.5, 1.75, 0.2], [-0.2, 0.9, 0.3]],                  // giơ cao trước khi chém chữ X
  crossR: [[0.0, 1.2, 0.45], [0.65, -0.5, 0.55]],             // chém chữ X
  spreadR: [[-0.75, 1.35, 0.1], [-0.95, 0.05, 0.2]],          // dang ngang khi xoay
  skyR: [[-0.25, 2.05, 0.15], [-0.1, 0.95, 0.2]],             // giơ thẳng trên đầu
  slamR: [[-0.05, 1.05, 0.45], [0.5, -0.7, 0.5]],               // bổ xuống chữ X
  restR: [[-0.42, 1.02, 0.1], [-0.35, -0.85, -0.4]],          // kiếm thõng ra sau (về thành)
  vicR: [[-0.2, 2.0, 0.2], [0.4, 0.9, 0]],
  deadR: [[-0.6, 1.1, 0.1], [-0.95, 0.3, 0]],
};
for (const k of Object.keys(K)) if (k.endsWith('R')) K[k.slice(0, -1) + 'L'] = mirror(K[k]);
K.idleL = [[0.42, 1.05, 0.15], [-0.05, -0.6, 0.8]]; K.idleR = [[-0.42, 1.05, 0.15], [-0.4, -0.7, 0.55]];
const P2 = (...ks) => weaponPath(ks.map(([u, r, l]) => [u, { R: r, L: l }]));
const ikSlashR = P2([0, RR, RL], [0.14, K.windR, K.idleL], [0.33, K.hitR, K.idleL], [0.5, K.followR, K.idleL], [0.75, K.backR, RL], [1, RR, RL]);
const ikSlashL = P2([0, RR, RL], [0.14, K.idleR, K.windL], [0.33, K.idleR, K.hitL], [0.5, K.idleR, K.followL], [0.75, RR, K.backL], [1, RR, RL]);
const ikDash = P2([0, RR, RL], [0.2, K.lowBackR, K.lowBackL], [0.36, K.upR, K.upL], [0.46, K.crossR, K.crossL], [0.7, K.crossR, K.crossL], [0.86, K.guardR, K.guardL], [1, RR, RL]);
const ikSpin = P2([0, RR, RL], [0.2, K.spreadR, K.spreadL], [0.85, K.spreadR, K.spreadL], [1, RR, RL]);
const ikUlt = P2([0, RR, RL], [0.1, K.windR, K.idleL], [0.2, K.hitR, K.idleL], [0.3, K.idleR, K.windL], [0.4, K.idleR, K.hitL], [0.52, K.skyR, K.skyL], [0.66, K.slamR, K.slamL], [0.82, K.crossR, K.crossL], [1, RR, RL]);
const ikDeath = P2([0, RR, RL], [0.15, K.guardR, K.guardL], [0.4, K.spreadR, K.spreadL], [1, K.deadR, K.deadL]);
const ikRecall = (u) => ({ R: { hand: K.restR[0], dir: K.restR[1] }, L: { hand: K.restL[0], dir: K.restL[1] } });
const ikVictory = P2([0, RR, RL], [0.2, K.guardR, K.guardL], [0.4, K.vicR, K.vicL], [0.62, K.vicR, K.vicL], [0.85, K.guardR, K.guardL], [1, RR, RL]);

const LAG = { spine: 0.012, chest: 0.026, neck: 0.04, head: 0.06, skF: 0.07, skB: 0.07, skL: 0.08, skR: 0.08 };
const L = (fn) => lagged(fn, LAG);

export const ronin = {
  style: { atk1: 'jabR', atk2: 'jabL', cast1: 'slashR', cast2: 'spin', ult: 'slashCombo' },
  run: { amp: 41, arm: 0.9, bob: 0.022, lean: 15 }, idle: 'sneak', moveSpeed: 345, swayAmp: 10,
  extra: { skF: 'SkirtF', skB: 'SkirtB', skL: 'SkirtL', skR: 'SkirtR' },
  ik: { body: 0.2, head: 0.16, headUp: 0.1, leg: 0.1, back: { R: 0.1, L: 0.1 } }, // vật cản cho kiếm (armik.mjs)
  custom: {
    Idle: { dur: 2.6, loop: true, pose: idle },
    Run: { dur: 'run', loop: true, pose: run },
    Attack1: { dur: 0.6, pose: L(slashR), ik: ikSlashR },
    Attack2: { dur: 0.6, pose: L(slashL), ik: ikSlashL },
    Cast1: { dur: 0.8, pose: L(dashX), ik: ikDash },
    Cast2: { dur: 0.8, pose: L(spin), ik: ikSpin },
    Ult: { dur: 1.4, pose: L(ult), ik: ikUlt },
    Death: { dur: 1.6, pose: death, ik: ikDeath },
    Recall: { dur: 2.0, loop: true, pose: recall, ik: ikRecall },
    Victory: { dur: 2.2, pose: L(victory), ik: ikVictory },
    Showcase: { dur: 4.0, loop: true, pose: showcase },
  },
};
