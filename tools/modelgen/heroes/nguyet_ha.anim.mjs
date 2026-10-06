// Animation viết tay cho Moonstream (model moonstream_pbr: váy dài chạm đất, tay trái buông, tay phải gập khuỷu nâng chiếc bình bạc).
// Tư thế = độ lệch so với tư thế bind. Tay phải: cẳng tay chĩa ra trước, nên faR rx âm = nâng bình lên, hdR rx dương = nghiêng bình rót về trước.
// Tay trái buông: uaL rx âm = đưa ra trước, rz dương = dạng ra; hdL rx âm = ngửa bàn tay (lòng bàn tay hướng trước khi tay đã nâng).
// Váy không có chân bên trong: chân chỉ nhích đôi giày; váy đi theo hông + 4 xương váy (skF/skB/skL/skR, rx dương = vạt bay ra sau).
// Tay áo phồng ở vai: giữ cánh tay nâng dưới ~60° để vải vai không bị kéo giãn.
import { spline, add, wave, lagged, snap } from '../animlib.mjs';

/** Vạt váy đung đưa trễ nhịp (k: biên độ). */
const cloth = (u, k = 1, ph = 0.1, f = 1) => ({ skF: [2.5 * wave(u, ph, f) * k, 0, 0], skB: [-2.5 * wave(u, ph + 0.05, f) * k, 0, 0], skL: [1.5 * wave(u, ph + 0.2, f) * k, 0, 2 * wave(u, ph + 0.15, f) * k], skR: [1.5 * wave(u, ph + 0.3, f) * k, 0, -2 * wave(u, ph + 0.25, f) * k] });

const idle = (u) => {
  const s = wave(u), s2 = wave(u, 0.15, 2), lag = (p) => wave(u, p);
  return add({
    hipsPos: [0.004 * wave(u, 0.25), -0.003 - 0.003 * s2, 0], spine: [0.8 * s, 1.5 * wave(u, 0.3), 0.8 * wave(u, 0.2)], chest: [1.4 * s, -1.6 * wave(u, 0.3), 0], neck: [-0.6 * lag(0.1), 0, 0],
    head: [-1.2 * s, 3 * wave(u, 0.45), 2.2 * wave(u, 0.6)],
    uaL: [2 * lag(0.12), 0, 2 + 1 * s], faL: [-5 - 2 * lag(0.2), 0, 0], hdL: [-3 + 2.5 * lag(0.3), 0, 2 * lag(0.35)],
    uaR: [-1 + 1 * lag(0.12), 0, 0], faR: [-2 + 2 * lag(0.2), 0, 0], hdR: [1.5 * lag(0.3), 0, 0],
  }, cloth(u, 0.9));
};

// Lướt đi (không có chân để sải bước): thân nghiêng tới trước, váy bị gió đẩy ra sau và phập phồng, tay trái đánh nhẹ, tay phải giữ bình sát người.
const run = (u) => {
  const ph = Math.PI * 2 * u, s = Math.sin(ph), c = Math.cos(ph), bob = Math.abs(c), lag = (p) => Math.sin(ph - p);
  return {
    hipsPos: [0.006 * s, -0.012 + 0.012 * bob, 0.01], spine: [7, 3 * s, 0], chest: [3, 5 * s, 1.2 * c], neck: [-2, 0, 0], head: [-7, -4 * s, 0],
    thL: [-12 * s, 0, 0], thR: [12 * s, 0, 0], shL: [10 + 22 * Math.max(0, c), 0, 0], shR: [10 + 22 * Math.max(0, -c), 0, 0], ftL: [-6 * s, 0, 0], ftR: [6 * s, 0, 0],
    uaL: [16 * s - 6, 0, 9], faL: [-22 - 8 * c, 0, 0], hdL: [-8 + 6 * lag(0.6), 0, 0],
    uaR: [-8 + 2 * lag(0.3), 0, -2], faR: [-10 + 3 * lag(0.4), 0, 0], hdR: [-6 + 3 * lag(0.6), 0, 0],
    skF: [16 + 4 * lag(0.5), 0, 0], skB: [20 + 6 * lag(0.6), 0, 0], skL: [12 + 5 * lag(0.7), 0, 6 + 3 * lag(0.8)], skR: [12 - 5 * lag(0.7), 0, -6 + 3 * lag(0.8)],
  };
};

// Đòn thường 1 – vẩy bình: nâng bình lên trước ngực, ngả cổ tay, rồi vẩy mạnh ra trước cho giọt nước bay đi. Chạm u≈0.5 (0.3s).
const attack1 = spline([
  [0, {}],
  [0.18, { chest: [-3, -10, 0], spine: [-1, -4, 0], head: [2, 8, 0], hipsPos: [0, -0.008, -0.01], uaR: [-12, 0, -4], faR: [-38, 0, 0], hdR: [-24, 0, 0], uaL: [-6, 0, 8], faL: [-12, 0, 0], skF: [-4, 0, 0], skB: [4, 0, 0] }],
  [0.36, { chest: [-5, -14, 0], spine: [-2, -5, 0], head: [3, 10, 0], hipsPos: [0, -0.012, -0.015], uaR: [-18, 0, -6], faR: [-55, 0, 0], hdR: [-34, 0, 0], uaL: [-10, 0, 12], faL: [-18, 0, 0], skF: [-6, 0, 0], skB: [6, 0, 0], skL: [0, 0, 4] }],
  [0.5, { chest: [7, 8, 0], spine: [3, 3, 0], head: [2, -4, 0], hipsPos: [0, -0.02, 0.02], uaR: [-34, 0, -4], faR: [-8, 0, 0], hdR: [30, 0, 0], uaL: [6, 0, 10], faL: [-10, 0, 0], skF: [8, 0, 0], skB: [-4, 0, 0], skR: [0, 0, -5] }],
  [0.66, { chest: [5, 6, 0], spine: [2, 2, 0], head: [1, -3, 0], hipsPos: [0, -0.016, 0.016], uaR: [-30, 0, -4], faR: [-6, 0, 0], hdR: [24, 0, 0], uaL: [4, 0, 8], faL: [-8, 0, 0], skF: [5, 0, 0], skB: [-2, 0, 0] }],
  [1, {}],
]);

// Đòn thường 2 – đẩy lòng bàn tay trái: kéo tay về hông lấy đà rồi đẩy thẳng ra trước, bình bên phải lùi về hông. Chạm u≈0.5 (0.3s).
const attack2 = spline([
  [0, {}],
  [0.2, { chest: [-3, 12, 0], spine: [-1, 5, 0], head: [2, -6, 0], hipsPos: [0, -0.01, -0.01], uaL: [-8, 0, 4], faL: [-70, 0, 0], hdL: [-20, 0, 0], uaR: [2, 0, -2], faR: [4, 0, 0], skF: [-3, 0, 0], skB: [3, 0, 0] }],
  [0.36, { chest: [-4, 16, 0], spine: [-2, 6, 0], head: [3, -8, 0], hipsPos: [0, -0.014, -0.015], uaL: [-14, 0, 2], faL: [-88, 0, 0], hdL: [-30, 0, 0], uaR: [4, 0, -2], faR: [6, 0, 0], skL: [0, 0, 3], skB: [5, 0, 0] }],
  [0.5, { chest: [7, -10, 0], spine: [3, -4, 0], head: [1, 6, 0], hipsPos: [0, -0.02, 0.025], uaL: [-58, 0, -4], faL: [-14, 0, 0], hdL: [-62, 0, 0], uaR: [-2, 0, -4], faR: [0, 0, 0], skF: [8, 0, 0], skB: [-4, 0, 0], skL: [0, 0, -4] }],
  [0.68, { chest: [5, -8, 0], spine: [2, -3, 0], head: [1, 4, 0], hipsPos: [0, -0.016, 0.02], uaL: [-54, 0, -4], faL: [-12, 0, 0], hdL: [-56, 0, 0], skF: [5, 0, 0] }],
  [1, {}],
]);

// Cast1 – Giọt Bạc: gom nước — tay trái úp trên miệng bình, kéo bình về ngực, rồi phóng bình thẳng ra trước (rót mạnh) bắn giọt bạc xuyên. Phóng u≈0.3.
const cast1 = spline([
  [0, {}],
  [0.14, { chest: [-4, -6, 0], spine: [-2, -2, 0], head: [-2, 4, 0], hipsPos: [0, -0.01, -0.01], uaR: [-14, 0, -2], faR: [-50, 0, 0], hdR: [-16, 0, 0], uaL: [-36, 0, -10], faL: [-68, 0, 0], hdL: [-10, 0, 0], skF: [-4, 0, 0], skB: [4, 0, 0] }],
  [0.24, { chest: [-6, -8, 0], spine: [-3, -3, 0], head: [-3, 5, 0], hipsPos: [0, -0.014, -0.016], uaR: [-18, 0, -2], faR: [-62, 0, 0], hdR: [-22, 0, 0], uaL: [-40, 0, -12], faL: [-74, 0, 0], hdL: [-12, 0, 0], skF: [-6, 0, 0], skB: [6, 0, 0] }],
  [0.32, { chest: [9, 6, 0], spine: [4, 2, 0], head: [3, -3, 0], hipsPos: [0, -0.025, 0.035], uaR: [-50, 0, -2], faR: [-4, 0, 0], hdR: [28, 0, 0], uaL: [-44, 0, 14], faL: [-24, 0, 0], hdL: [-40, 0, 0], skF: [10, 0, 0], skB: [-6, 0, 0], skL: [0, 0, 5], skR: [0, 0, -5] }],
  [0.5, { chest: [7, 5, 0], spine: [3, 2, 0], head: [2, -2, 0], hipsPos: [0, -0.022, 0.03], uaR: [-46, 0, -2], faR: [-4, 0, 0], hdR: [24, 0, 0], uaL: [-40, 0, 16], faL: [-22, 0, 0], hdL: [-36, 0, 0], skF: [6, 0, 0], skB: [-3, 0, 0] }],
  [0.72, { chest: [2, 2, 0], hipsPos: [0, -0.008, 0.008], uaR: [-16, 0, -2], faR: [-6, 0, 0], hdR: [8, 0, 0], uaL: [-12, 0, 8], faL: [-14, 0, 0], hdL: [-10, 0, 0] }],
  [1, {}],
]);

// Cast2 – Xoáy Nước: tay trái khuấy một vòng tròn trên không, rồi hạ xuống chỉ vào điểm đặt xoáy; bình nghiêng rót theo. Thả xoáy u≈0.32.
const stir = (u) => { const a = u * Math.PI * 2; return { uaL: [-34 + 10 * Math.sin(a), 6 * Math.cos(a), 14 + 10 * Math.cos(a)], faL: [-52 + 10 * Math.sin(a + 0.6), 0, 0] }; };
const cast2 = (u) => {
  const base = spline([
    [0, {}],
    [0.1, { chest: [-3, 8, 0], spine: [-1, 3, 0], head: [2, -4, 0], hipsPos: [0, -0.01, 0], uaR: [-10, 0, -4], faR: [-26, 0, 0], hdR: [-10, 0, 0], skL: [0, 0, 3], skR: [0, 0, -3] }],
    [0.24, { chest: [-4, -6, 0], spine: [-2, -2, 0], head: [-2, 4, 0], hipsPos: [0, -0.016, 0], uaR: [-12, 0, -4], faR: [-30, 0, 0], hdR: [-12, 0, 0], skF: [-4, 0, 0], skB: [4, 0, 0], skL: [0, 0, 5], skR: [0, 0, -5] }],
    [0.34, { chest: [10, -4, 0], spine: [4, -1, 0], head: [8, 2, 0], hipsPos: [0, -0.03, 0.03], uaR: [-30, 0, -4], faR: [-8, 0, 0], hdR: [34, 0, 0], skF: [10, 0, 0], skB: [-6, 0, 0] }],
    [0.56, { chest: [8, -3, 0], spine: [3, -1, 0], head: [6, 2, 0], hipsPos: [0, -0.026, 0.026], uaR: [-26, 0, -4], faR: [-8, 0, 0], hdR: [28, 0, 0], skF: [6, 0, 0], skB: [-3, 0, 0] }],
    [1, {}],
  ])(u);
  // tay trái: khuấy vòng (0.06→0.28), chỉ xuống điểm đặt (0.34), giữ, rồi buông
  const k = Math.min(1, Math.max(0, (u - 0.06) / 0.22));
  const sp = u < 0.06 ? { uaL: [-34 * (u / 0.06) + 0, 0, 14 * (u / 0.06)], faL: [-52 * (u / 0.06), 0, 0] } : stir(k);
  const point = { uaL: [-48, 0, 6], faL: [-10, 0, 0], hdL: [24, 0, 0] };
  const w1 = Math.min(1, Math.max(0, (u - 0.28) / 0.06)), w2 = Math.min(1, Math.max(0, (u - 0.62) / 0.3)), ease = (x) => x * x * (3 - 2 * x);
  const arm = {};
  for (const key of ['uaL', 'faL', 'hdL']) {
    const a = sp[key] || [0, 0, 0], b = point[key] || [0, 0, 0], m = a.map((v, i) => v + (b[i] - v) * ease(w1));
    arm[key] = m.map((v) => v * (1 - ease(w2)));
  }
  return { ...base, ...arm };
};

// Ult – Lũ Nguyệt: hai tay nâng bình lên trước mặt (gọi trăng), ngửa nhẹ, giữ, rồi dang hai tay rót cả bình về trước, cúi người — lũ dâng (u≈0.57 = 0.8s).
const ult = spline([
  [0, {}],
  [0.16, { chest: [-4, 0, 0], spine: [-2, 0, 0], head: [-4, 0, 0], hipsPos: [0, -0.01, -0.005], uaR: [-30, 0, -2], faR: [-56, 0, 0], hdR: [-14, 0, 0], uaL: [-44, 0, -16], faL: [-76, 0, 0], hdL: [-16, 0, 0], skF: [-4, 0, 0], skB: [4, 0, 0] }],
  [0.34, { chest: [-9, 0, 0], spine: [-4, 0, 0], head: [-12, 0, 0], hipsPos: [0, 0.008, -0.02], uaR: [-46, 0, -2], faR: [-72, 0, 0], hdR: [-18, 0, 0], uaL: [-54, 0, -18], faL: [-84, 0, 0], hdL: [-18, 0, 0], skF: [-6, 0, 0], skB: [8, 0, 0], skL: [0, 0, 6], skR: [0, 0, -6] }],
  [0.48, { chest: [-10, 0, 0], spine: [-4, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.012, -0.022], uaR: [-48, 0, -2], faR: [-74, 0, 0], hdR: [-20, 0, 0], uaL: [-56, 0, -18], faL: [-86, 0, 0], hdL: [-18, 0, 0], skF: [-8, 0, 0], skB: [10, 0, 0], skL: [0, 0, 8], skR: [0, 0, -8] }],
  [0.57, { chest: [14, 0, 0], spine: [6, 0, 0], head: [6, 0, 0], hipsPos: [0, -0.05, 0.05], uaR: [-44, 0, -18], faR: [-6, 0, 0], hdR: [40, 0, 0], uaL: [-38, 0, 34], faL: [-10, 0, 0], hdL: [-30, 0, 0], skF: [16, 0, 0], skB: [-8, 0, 0], skL: [0, 0, 12], skR: [0, 0, -12] }],
  [0.74, { chest: [12, 0, 0], spine: [5, 0, 0], head: [5, 0, 0], hipsPos: [0, -0.045, 0.045], uaR: [-40, 0, -18], faR: [-6, 0, 0], hdR: [36, 0, 0], uaL: [-34, 0, 32], faL: [-10, 0, 0], hdL: [-28, 0, 0], skF: [10, 0, 0], skB: [-4, 0, 0], skL: [0, 0, 8], skR: [0, 0, -8] }],
  [0.9, { chest: [3, 0, 0], hipsPos: [0, -0.012, 0.01], uaR: [-12, 0, -4], faR: [-4, 0, 0], hdR: [8, 0, 0], uaL: [-10, 0, 8], faL: [-8, 0, 0] }],
  [1, {}],
]);

// Ngã: loạng choạng lùi, khuỵu xuống, rồi đổ nghiêng sang trái (bình vẫn trong tay).
const death = spline([
  [0, {}],
  [0.1, { chest: [-10, 6, 0], spine: [-4, 0, 0], head: [-16, 8, 0], hipsPos: [0, -0.01, -0.03], uaR: [-10, 0, -10], faR: [-10, 0, 0], uaL: [-8, 0, 24], faL: [-20, 0, 0], skF: [-8, 0, 0], skB: [8, 0, 0] }],
  [0.3, { chest: [8, 4, 0], spine: [4, 0, 0], head: [10, 4, 0], hipsPos: [0, -0.12, -0.02], thL: [-30, 0, 0], thR: [-26, 0, 0], shL: [60, 0, 0], shR: [56, 0, 0], uaR: [-6, 0, -12], faR: [-4, 0, 0], uaL: [-4, 0, 20], faL: [-24, 0, 0], skF: [-12, 0, 0], skB: [12, 0, 0], skL: [0, 0, 14], skR: [0, 0, -14] }],
  [0.58, { root: [0, 0, 46], rootPos: [0.12, 0.04, 0], chest: [10, 0, 8], head: [8, 0, 10], hipsPos: [0, -0.2, 0], thL: [-40, 0, 0], thR: [-36, 0, 0], shL: [70, 0, 0], shR: [66, 0, 0], uaR: [-10, 0, -20], uaL: [-10, 0, 36], faL: [-30, 0, 0], skF: [-10, 0, 0], skB: [10, 0, 0], skL: [0, 0, 18], skR: [0, 0, -10] }],
  [0.74, { root: [0, 0, 86], rootPos: [0.3, 0.12, 0], chest: [4, 0, 4], head: [4, 0, 14], hipsPos: [0, -0.2, 0], thL: [-36, 0, 0], thR: [-30, 0, 0], shL: [60, 0, 0], shR: [56, 0, 0], uaR: [-20, 0, -30], faR: [-10, 0, 0], uaL: [-46, 0, -6], faL: [-24, 0, 0], skL: [0, 0, 10], skR: [0, 0, -4] }],
  [0.84, { root: [0, 0, 82], rootPos: [0.29, 0.11, 0], chest: [3, 0, 3], head: [3, 0, 12], hipsPos: [0, -0.2, 0], thL: [-34, 0, 0], thR: [-28, 0, 0], shL: [58, 0, 0], shR: [54, 0, 0], uaR: [-18, 0, -28], faR: [-10, 0, 0], uaL: [-44, 0, -6], faL: [-22, 0, 0], skL: [0, 0, 8] }],
  [1, { root: [0, 0, 84], rootPos: [0.3, 0.115, 0], chest: [3, 0, 3], head: [4, 0, 13], hipsPos: [0, -0.2, 0], thL: [-34, 0, 0], thR: [-28, 0, 0], shL: [58, 0, 0], shR: [54, 0, 0], uaR: [-18, 0, -28], faR: [-10, 0, 0], uaL: [-45, 0, -6], faL: [-22, 0, 0], skL: [0, 0, 8] }],
]);

// Về thành: ôm bình trước ngực, tay trái úp lên miệng bình, nhắm mắt cúi đầu, váy phập phồng nhẹ.
const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return add({ chest: [3 + 1.2 * s, 0, 0], head: [12 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.006 + 0.004 * s, 0], uaR: [-12, 0, -2], faR: [-48 + 2 * lag(0.3), 0, 0], hdR: [-12, 0, 0], uaL: [-34, 0, -14], faL: [-74 + 2 * lag(0.35), 0, 0], hdL: [-8, 0, 0] }, cloth(u, 1.6, 0.1, 2));
};

// Chiến thắng: xoay một vòng cho váy xoè, rồi nâng bình lên cạnh đầu, tay trái buông mở nhẹ.
const victoryPose = spline([
  [0, {}],
  [0.12, { chest: [-3, 0, 0], hipsPos: [0, -0.02, 0], uaR: [-12, 0, -6], faR: [-30, 0, 0], uaL: [-10, 0, 26], faL: [-20, 0, 0], skL: [0, 0, 6], skR: [0, 0, -6] }],
  [0.3, { chest: [-4, 0, 0], head: [-4, 0, 0], hipsPos: [0, 0.01, 0], uaR: [-16, 0, -10], faR: [-36, 0, 0], uaL: [-10, 0, 40], faL: [-16, 0, 0], hdL: [-20, 0, 0], skF: [-14, 0, 0], skB: [14, 0, 0], skL: [0, 0, 22], skR: [0, 0, -22] }],
  [0.46, { chest: [-6, 0, 0], head: [-6, 0, 0], hipsPos: [0, 0.006, 0], uaR: [-18, 0, -8], faR: [-40, 0, 0], uaL: [-10, 0, 36], faL: [-16, 0, 0], hdL: [-20, 0, 0], skF: [-10, 0, 0], skB: [10, 0, 0], skL: [0, 0, 16], skR: [0, 0, -16] }],
  [0.6, { chest: [-9, -6, 0], head: [-14, 8, 0], hipsPos: [0, 0.01, 0], uaR: [-56, 0, -14], faR: [-70, 0, 0], hdR: [-10, 0, 0], uaL: [-12, 0, 30], faL: [-14, 0, 0], hdL: [-10, 0, 4], skF: [-4, 0, 0], skB: [4, 0, 0], skL: [0, 0, 4], skR: [0, 0, -4] }],
  [0.9, { chest: [-8, -5, 0], head: [-12, 7, 0], hipsPos: [0, 0.008, 0], uaR: [-54, 0, -14], faR: [-68, 0, 0], hdR: [-8, 0, 0], uaL: [-11, 0, 28], faL: [-13, 0, 0], hdL: [-9, 0, 4] }],
  [1, {}],
]);
const victory = (u) => {
  const turn = Math.min(1, Math.max(0, (u - 0.08) / 0.4)), e = turn * turn * (3 - 2 * turn);
  return add(victoryPose(u), { root: [0, 360 * e, 0] });
};

// Trưng bày (sảnh): thở như Idle, ôm bình trước ngực nhìn xuống, rồi ngẩng lên đưa bình ra như mời, tay trái đặt lên ngực.
const showcase = (u) => {
  const accent = spline([
    [0, {}], [0.16, {}],
    [0.3, { chest: [3, -4, 0], head: [10, 4, 4], uaR: [-12, 0, -2], faR: [-46, 0, 0], hdR: [-12, 0, 0], uaL: [-36, 0, -14], faL: [-70, 0, 0], hdL: [-10, 0, 0], skF: [2, 0, 0], skB: [-2, 0, 0] }],
    [0.42, { chest: [3, -4, 0], head: [9, 3, 3], uaR: [-12, 0, -2], faR: [-48, 0, 0], hdR: [-12, 0, 0], uaL: [-36, 0, -14], faL: [-72, 0, 0], hdL: [-10, 0, 0] }],
    [0.56, { chest: [-4, 5, 0], head: [-5, -6, 5], hipsPos: [0, 0.004, 0], uaR: [-30, 0, -4], faR: [-30, 0, 0], hdR: [-6, 0, 0], uaL: [-22, 0, -8], faL: [-102, 0, 0], hdL: [-12, 0, 0], skL: [0, 0, 5], skR: [0, 0, -5] }],
    [0.7, { chest: [-4, 5, 0], head: [-4, -6, 5], hipsPos: [0, 0.004, 0], uaR: [-30, 0, -4], faR: [-30, 0, 0], hdR: [-6, 0, 0], uaL: [-22, 0, -8], faL: [-104, 0, 0], hdL: [-12, 0, 0], skL: [0, 0, 5], skR: [0, 0, -5] }],
    [0.86, {}], [1, {}],
  ], false)(u);
  return add(accent, idle((u * 2) % 1));
};

const LAG = { spine: 0.012, chest: 0.024, neck: 0.036, head: 0.055, uaL: 0.03, faL: 0.05, hdL: 0.07, skF: 0.08, skB: 0.09, skL: 0.1, skR: 0.1 };
const L = (fn) => lagged(fn, LAG);

export const moonAnim = {
  style: { atk1: 'pushR', atk2: 'pushL', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' },
  run: { amp: 40, arm: 0.5, bob: 0.014, lean: 6 }, idle: 'calm', moveSpeed: 315, swayAmp: 6, // amp chỉ để tính chu kỳ (≈0.74s) và runRefSpeed; tư thế chạy viết tay ở dưới
  extra: { skF: 'SkirtF', skB: 'SkirtB', skL: 'SkirtL', skR: 'SkirtR' },
  custom: {
    Idle: { dur: 3.0, loop: true, pose: idle },
    Run: { dur: 'run', loop: true, pose: run },
    Attack1: { dur: 0.6, pose: L(attack1), warp: snap([[0.36, 0.36, 'out'], [0.44, 0.5, 'in'], [0.5, 0.52, 'lin'], [0.72, 0.68, 'out'], [1, 1, 'io']]) }, // vẩy bình 0.264s
    Attack2: { dur: 0.6, pose: L(attack2), warp: snap([[0.36, 0.36, 'out'], [0.44, 0.5, 'in'], [0.5, 0.52, 'lin'], [0.72, 0.68, 'out'], [1, 1, 'io']]) }, // đẩy tay 0.264s
    Cast1: { dur: 0.8, pose: L(cast1), warp: snap([[0.2, 0.24, 'out'], [0.27, 0.32, 'in'], [0.32, 0.34, 'lin'], [0.7, 0.72, 'out'], [1, 1, 'io']]) }, // phóng 0.216s
    Cast2: { dur: 0.8, pose: L(cast2), warp: snap([[0.26, 0.28, 'lin'], [0.32, 0.34, 'in'], [0.38, 0.36, 'lin'], [0.7, 0.66, 'out'], [1, 1, 'io']]) }, // thả xoáy 0.256s
    Ult: { dur: 1.4, pose: L(ult), warp: snap([[0.5, 0.48, 'out'], [0.57, 0.57, 'in'], [0.62, 0.59, 'lin'], [0.86, 0.82, 'out'], [1, 1, 'io']]) }, // lũ dâng 0.8s
    Death: { dur: 1.6, pose: death, warp: snap([[0.08, 0.1, 'out'], [0.3, 0.3, 'io'], [0.64, 0.74, 'in'], [0.76, 0.84, 'out'], [1, 1, 'io']]) },
    Recall: { dur: 2.0, loop: true, pose: recall },
    Victory: { dur: 2.4, pose: L(victory) },
    Showcase: { dur: 6.0, loop: true, pose: showcase },
  },
};
