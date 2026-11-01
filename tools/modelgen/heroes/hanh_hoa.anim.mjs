// Animation viết tay cho Haruno Sakura (model sakura_pbr: đứng dạng chân rộng, tay phải gập ngang ngực cầm kunai trên vai trái,
// tay trái duỗi chéo xuống trước). Lưới liền khối: tay phải + kunai dính vai trái / cằm nên cả cánh tay phải đi theo ngực (uaR/faR/hdR luôn 0
// để điểm gắn HandR_Tip vẫn ở mũi kunai) — mọi đòn dùng tay trái, thân, hông, chân. Góc tay trái lấy từ IK trên đúng bộ xương này (đích cổ tay
// + hướng ngón tay); cánh tay trên không nhấc quá ~30–40° so với tư thế gốc (mặt trong cánh tay dính liền sườn: nhấc cao là rách nách).
// Chân: hông hạ / dịch thì gối gập theo IK để bàn chân đứng yên trên đất (P / planted). Xương váy skF/skB/skL/skR: rx dương = vạt bay ra sau.
import { spline, add, wave, lagged, snap, mix } from '../animlib.mjs';

// tư thế tay trái (độ lệch so với tư thế gốc): đích cổ tay ghi trong ngoặc (đơn vị file gốc, tương đối thân)
const ARM = {
  pull: { uaL: [7, 8, 50], faL: [-62, 2, 0], hdL: [-10, 16, 13] },        // kéo tay về trước sườn trái lấy đà, khuỷu mở ra ngoài (0.15, 1.31, 0.25)
  strike: { uaL: [-26, 15, 30], faL: [-27, 7, 5], hdL: [-5, 11, 10] },     // đẩy chưởng thẳng trước ngực (0, 1.40, 0.50), thân xoay phải 16°
  raise: { uaL: [18, 24, -11], faL: [-101, 21, -1], hdL: [-24, 14, -15] }, // gập khuỷu, bàn tay dựng trước vai trái (0.15, 1.56, 0.22) — cánh tay trên gần như yên
  chopDn: { uaL: [-15, -2, 12], faL: [6, 12, 12], hdL: [-13, 12, 2] },     // chém xuống trước (-0.05, 1.17, 0.42)
  lunge: { uaL: [-16, 26, 9], faL: [-48, 12, 4], hdL: [-8, 10, 6] },       // lao tới đấm (0, 1.25, 0.62), người đổ trước
  heal: { uaL: [-26, 1, 32], faL: [4, 12, 12], hdL: [-33, 31, -3] },       // đưa bàn tay ra trước, lệch trái, ngang vai — không che mặt (0.20, 1.40, 0.40)
  ground: { uaL: [-19, 0, 18], faL: [7, 13, 12], hdL: [-9, 9, 3] },        // chưởng xuống đất trước mặt
  relax: { uaL: [17, 7, 43], faL: [-43, 0, -7], hdL: [4, 0, 4] },          // thả lỏng, cổ tay trước bụng, khuỷu ra ngoài (0.08, 1.24, 0.24)
};
const A = (k, w = 1) => mix({}, ARM[k], w);

// —— chân đứng yên khi hông hạ / dịch: IK hai đoạn trong mặt phẳng dọc (mọi khớp chân chỉ xoay quanh trục X), mét
const S = 1.8 / 1.892, H = 1.8, TH = [-0.34 * S, -0.08 * S], SH = [-0.43 * S, -0.01 * S]; // đùi, cẳng chân (dy, dz) ở tư thế gốc (bodyTop 1.892 → cao 1,8 m)
const rot = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const legCache = new Map();
/** Góc rx (độ) đùi / cẳng chân / bàn chân giữ cổ chân tại chỗ khi hông dời (dy, dz) theo chiều cao; hông nhô lên thì chân duỗi (nhấc khỏi đất). */
function legIK(hy, hz) {
  const key = hy.toFixed(4) + ',' + hz.toFixed(4); if (legCache.has(key)) return legCache.get(key);
  const D = [TH[0] + SH[0] - hy * H, TH[1] + SH[1] - hz * H], L = Math.hypot(...D), R0 = Math.hypot(TH[0] + SH[0], TH[1] + SH[1]);
  let out = [0, 0, 0];
  if (L < R0 - 1e-5) {
    let a1 = -0.25, a2 = 0.5;
    for (let i = 0; i < 60; i++) {
      const t = rot(TH, a1), s = rot(SH, a1 + a2), F = [t[0] + s[0] - D[0], t[1] + s[1] - D[1]];
      const dt = rot(TH, a1 + Math.PI / 2), ds = rot(SH, a1 + a2 + Math.PI / 2);
      const j00 = dt[0] + ds[0], j01 = ds[0], j10 = dt[1] + ds[1], j11 = ds[1], det = j00 * j11 - j01 * j10;
      if (Math.abs(det) < 1e-12) break;
      a1 -= 0.8 * (j11 * F[0] - j01 * F[1]) / det; a2 -= 0.8 * (-j10 * F[0] + j00 * F[1]) / det;
      a2 = Math.max(0, a2); // gối chỉ gập về trước
    }
    out = [a1, a2, -(a1 + a2)].map((a) => (a * 180) / Math.PI);
  }
  legCache.set(key, out); return out;
}
/** Khung có hông dời hp: thêm góc chân giữ bàn chân trên đất (extra: ghi đè). */
const P = (hp, extra = {}) => { const [a, b, c] = legIK(hp[1], hp[2]); return { hipsPos: hp, thL: [a, 0, 0], shL: [b, 0, 0], ftL: [c, 0, 0], thR: [a, 0, 0], shR: [b, 0, 0], ftR: [c, 0, 0], ...extra }; };
/** Clip liên tục: tính lại chân theo hipsPos từng khung (cộng thêm góc chân đã ghi). */
const planted = (fn) => (u, t) => {
  const p = fn(u, t), hp = p.hipsPos || [0, 0, 0], [a, b, c] = legIK(hp[1], hp[2]), o = { ...p };
  for (const [k, v] of [['th', a], ['sh', b], ['ft', c]]) for (const s of ['L', 'R']) { const q = p[k + s] || [0, 0, 0]; o[k + s] = [v + q[0], q[1], q[2]]; }
  return o;
};

/** Vạt váy đung đưa trễ nhịp (k: biên độ). */
const cloth = (u, k = 1, ph = 0.1, f = 1) => ({ skF: [2 * wave(u, ph, f) * k, 0, 0], skB: [-2.5 * wave(u, ph + 0.05, f) * k, 0, 0], skL: [1.2 * wave(u, ph + 0.2, f) * k, 0, 2 * wave(u, ph + 0.15, f) * k], skR: [1.2 * wave(u, ph + 0.3, f) * k, 0, -2 * wave(u, ph + 0.25, f) * k] });

// Đứng thủ: thở, dồn trọng tâm nhẹ trái–phải, đầu khẽ nghiêng, tay trái nhịp nhẹ.
const idle = (u) => {
  const s = wave(u), s2 = wave(u, 0.15, 2), lag = (p) => wave(u, p);
  return add({
    hipsPos: [0.004 * wave(u, 0.25), -0.002 - 0.0015 * s2, 0], spine: [0.8 * s, 1.2 * wave(u, 0.3), 0.6 * wave(u, 0.25)], chest: [1.5 * s, -1.4 * wave(u, 0.3), 0], neck: [-0.6 * lag(0.1), 0, 0],
    head: [-1.2 * s, 2.5 * wave(u, 0.45), 1.5 * wave(u, 0.6)],
    uaL: [2 * lag(0.12), 0, 1.5 * lag(0.2)], faL: [-2.5 * lag(0.2), 0, 0], hdL: [2 * lag(0.3), 0, 1.5 * lag(0.35)],
  }, cloth(u, 1));
};

// Chạy: hai chân khép vào dưới hông (tư thế gốc dạng rộng), sải trước–sau, người đổ trước, tay trái đánh nhẹ.
const run = (u) => {
  const ph = Math.PI * 2 * u, s = Math.sin(ph), c = Math.cos(ph), bob = Math.abs(c), lag = (p) => Math.sin(ph - p), amp = 30;
  const knee = (cc) => 14 + 52 * Math.max(0, cc);
  return {
    hipsPos: [0.006 * s, -0.006 + 0.012 * bob, 0.01], spine: [9, 4 * s, 0], chest: [3, 6 * s, 1.2 * c], neck: [-2, 0, 0], head: [-8, -5 * s, 0],
    thL: [-amp * s - 4, 0, -11], thR: [amp * s - 4, 0, 11], shL: [knee(c), 0, 5], shR: [knee(-c), 0, -5], ftL: [-6 * s - 4, 0, 4], ftR: [6 * s - 4, 0, -4],
    uaL: [8 * s + 6, 0, 6], faL: [-14 - 6 * c, 0, 0], hdL: [-4 + 4 * lag(0.6), 0, 0],
    skF: [8 + 3 * lag(0.5), 0, 0], skB: [12 + 5 * lag(0.6), 0, 0], skL: [6 + 3 * lag(0.7), 0, 4 + 2 * lag(0.8)], skR: [6 - 3 * lag(0.7), 0, -4 + 2 * lag(0.8)],
  };
};

// Đòn thường 1 – đẩy chưởng: kéo tay trái về sườn, xoay thân rồi đẩy thẳng ra trước. Chạm u≈0.5.
const attack1 = spline([
  [0, {}],
  [0.2, { ...P([0, -0.006, -0.008]), chest: [-2, 8, 0], spine: [-1, 4, 0], head: [1, -5, 0], ...A('pull', 0.55), skF: [-3, 0, 0], skB: [3, 0, 0] }],
  [0.36, { ...P([0, -0.008, -0.01]), chest: [-3, 11, 0], spine: [-1, 5, 0], head: [2, -6, 0], ...A('pull', 0.75), skL: [0, 0, 3], skB: [4, 0, 0] }],
  [0.5, { ...P([0, -0.014, 0.02]), chest: [5, -16, 0], spine: [2, -6, 0], head: [1, 9, 0], ...A('strike'), skF: [8, 0, 0], skB: [-4, 0, 0], skR: [0, 0, -4] }],
  [0.68, { ...P([0, -0.012, 0.016]), chest: [4, -13, 0], spine: [2, -5, 0], head: [1, 7, 0], ...A('strike', 0.9), skF: [5, 0, 0] }],
  [1, {}],
]);

// Đòn thường 2 – chém tay: gập khuỷu dựng bàn tay trái trước vai rồi chém xuống chéo trước, thân gập theo. Chạm u≈0.5.
const attack2 = spline([
  [0, {}],
  [0.2, { ...P([0, 0.002, -0.006]), chest: [-3, 6, 0], spine: [-1, 3, 0], head: [-2, -4, 0], ...A('raise', 0.8), skF: [-3, 0, 0], skB: [3, 0, 0] }],
  [0.36, { ...P([0, 0.003, -0.008]), chest: [-5, 9, 0], spine: [-2, 4, 0], head: [-3, -6, 0], ...A('raise'), skB: [4, 0, 0], skL: [0, 0, 3] }],
  [0.5, { ...P([0, -0.018, 0.015]), chest: [10, -10, 0], spine: [4, -4, 0], head: [4, 6, 0], ...A('chopDn'), skF: [8, 0, 0], skB: [-5, 0, 0], skR: [0, 0, -4] }],
  [0.68, { ...P([0, -0.016, 0.012]), chest: [8, -8, 0], spine: [3, -3, 0], head: [3, 5, 0], ...A('chopDn', 0.9), skF: [5, 0, 0] }],
  [1, {}],
]);

// Cast1 – Đấm Mai: hạ thấp người lấy đà rồi lao tới (chân trái bước trước, chân phải đạp sau — đang lướt), tay trái đâm thẳng. Ra đòn u≈0.3.
const cast1 = spline([
  [0, {}],
  [0.14, { ...P([0, -0.03, -0.01]), chest: [6, 10, 0], spine: [8, 4, 0], head: [-4, -6, 0], ...A('pull', 0.7), skF: [-4, 0, 0], skB: [6, 0, 0] }],
  [0.22, { ...P([0, -0.035, -0.012]), chest: [7, 12, 0], spine: [10, 5, 0], head: [-5, -7, 0], ...A('pull', 0.75), skF: [-5, 0, 0], skB: [8, 0, 0] }],
  [0.32, { hipsPos: [0, -0.032, 0.06], chest: [6, -18, 0], spine: [16, -6, 0], head: [-10, 10, 0], thL: [-34, 0, -6], shL: [50, 0, 0], ftL: [-14, 0, 0], thR: [14, 0, 6], shR: [24, 0, 0], ftR: [10, 0, 0], ...A('lunge'), skF: [10, 0, 0], skB: [16, 0, 0], skL: [4, 0, 6], skR: [4, 0, -6] }],
  [0.56, { hipsPos: [0, -0.03, 0.055], chest: [5, -16, 0], spine: [14, -5, 0], head: [-9, 9, 0], thL: [-32, 0, -6], shL: [48, 0, 0], ftL: [-14, 0, 0], thR: [12, 0, 6], shR: [22, 0, 0], ftR: [8, 0, 0], ...A('lunge', 0.95), skF: [6, 0, 0], skB: [10, 0, 0] }],
  [0.8, { ...P([0, -0.01, 0.01]), chest: [2, -4, 0], spine: [4, -1, 0], ...A('strike', 0.3) }],
  [1, {}],
]);

// Cast2 – Châm Cứu: đưa bàn tay trái ra trước ngang vai (truyền sinh lực cho đồng minh), giữ, rồi thu về. Hồi máu u≈0.32.
const cast2 = spline([
  [0, {}],
  [0.16, { ...P([0, 0.003, 0]), chest: [-2, 6, 0], spine: [-1, 2, 0], head: [-2, -3, 0], ...A('heal', 0.6), skB: [2, 0, 0] }],
  [0.32, { ...P([0, 0.006, 0.004]), chest: [-4, 6, 0], spine: [-2, 2, 0], head: [-4, -4, 0], ...A('heal'), skF: [3, 0, 0], skL: [0, 0, 2], skR: [0, 0, -2] }],
  [0.62, { ...P([0, 0.005, 0.004]), chest: [-4, 5, 0], spine: [-2, 2, 0], head: [-3, -3, 0], ...A('heal', 0.97) }],
  [1, {}],
]);

// Ult – Ấn Trăm Mai: gồng (cúi người, kéo tay về, chùng gối), bùng nổ chưởng xuống đất trước mặt, đứng thẳng dậy toả khí. Bùng u≈0.42.
const ult = spline([
  [0, {}],
  [0.18, { ...P([0, -0.018, -0.008]), chest: [8, 6, 0], spine: [6, 2, 0], head: [10, -3, 0], ...A('pull', 0.6), skF: [-3, 0, 0], skB: [4, 0, 0] }],
  [0.34, { ...P([0, -0.026, -0.01]), chest: [10, 8, 0], spine: [8, 3, 0], head: [12, -4, 0], ...A('pull', 0.75), skF: [-4, 0, 0], skB: [5, 0, 0], skL: [0, 0, 3], skR: [0, 0, -3] }],
  [0.42, { ...P([0, -0.042, 0.015]), chest: [12, -6, 0], spine: [18, -2, 0], head: [-6, 2, 0], ...A('ground'), skF: [10, 0, 0], skB: [14, 0, 0], skL: [4, 0, 8], skR: [4, 0, -8] }],
  [0.58, { ...P([0, -0.04, 0.013]), chest: [10, -5, 0], spine: [16, -2, 0], head: [-5, 2, 0], ...A('ground', 0.95), skF: [6, 0, 0], skB: [8, 0, 0] }],
  [0.76, { ...P([0, 0.006, 0]), chest: [-8, 4, 0], spine: [-3, 2, 0], head: [-8, -2, 0], ...A('relax', 0.5), skF: [-2, 0, 0], skB: [3, 0, 0], skL: [0, 0, 4], skR: [0, 0, -4] }],
  [0.9, { ...P([0, 0.003, 0]), chest: [-5, 3, 0], spine: [-2, 1, 0], head: [-5, -1, 0], ...A('relax', 0.25) }],
  [1, {}],
]);

// Ngã: loạng choạng lùi, khuỵu gối, đổ ngửa ra sau (tư thế dạng chân rộng: ngã ngang thì một chân chĩa lên trời).
const death = spline([
  [0, {}],
  [0.1, { chest: [-10, 6, 0], spine: [-4, 0, 0], head: [-14, 6, 0], ...P([0, -0.01, -0.03]), uaL: [10, 0, 14], faL: [-10, 0, 0], skF: [-6, 0, 0], skB: [6, 0, 0] }],
  [0.3, { chest: [6, 4, 0], spine: [4, 0, 0], head: [10, 4, 0], ...P([0, -0.08, -0.02]), uaL: [16, 0, 18], faL: [-16, 0, 0], skF: [-10, 0, 0], skB: [10, 0, 0] }],
  [0.6, { root: [-46, 0, 0], rootPos: [0, 0.09, -0.08], chest: [-6, 0, 0], head: [-12, 6, 0], hipsPos: [0, -0.1, 0], thL: [-44, 0, 4], thR: [-40, 0, -4], shL: [70, 0, 0], shR: [66, 0, 0], uaL: [20, 0, 24], faL: [-20, 0, 0], skF: [-8, 0, 0], skB: [12, 0, 0] }],
  [0.76, { root: [-88, 0, 0], rootPos: [0, 0.1, -0.16], chest: [-4, 0, 0], head: [-6, 14, 0], hipsPos: [0, -0.1, 0], thL: [-30, 0, 8], thR: [-26, 0, -8], shL: [46, 0, 0], shR: [42, 0, 0], uaL: [24, 0, 30], faL: [-12, 0, 0], skF: [-4, 0, 0], skB: [16, 0, 0] }],
  [0.86, { root: [-84, 0, 0], rootPos: [0, 0.095, -0.155], chest: [-3, 0, 0], head: [-5, 13, 0], hipsPos: [0, -0.1, 0], thL: [-28, 0, 8], thR: [-24, 0, -8], shL: [44, 0, 0], shR: [40, 0, 0], uaL: [22, 0, 28], faL: [-12, 0, 0], skB: [14, 0, 0] }],
  [1, { root: [-86, 0, 0], rootPos: [0, 0.097, -0.158], chest: [-3, 0, 0], head: [-5, 14, 0], hipsPos: [0, -0.1, 0], thL: [-28, 0, 8], thR: [-24, 0, -8], shL: [44, 0, 0], shR: [40, 0, 0], uaL: [23, 0, 29], faL: [-12, 0, 0], skB: [15, 0, 0] }],
]);

// Về thành: tay trái hạ về trước bụng, cúi đầu nhắm tụ khí, thở sâu.
const recall = (u) => {
  const s = wave(u), lag = (p) => wave(u, p);
  return add({ chest: [2 + 1.5 * s, 0, 0], spine: [1 + 0.8 * s, 0, 0], head: [10 + 1.5 * lag(0.2), 0, 0], hipsPos: [0, -0.004 + 0.002 * s, 0], ...A('relax', 0.6), faL: [-30 - 3 * lag(0.3), 1, -3] }, cloth(u, 1.6, 0.1, 2));
};

// Chiến thắng (sảnh / chọn tướng, nhìn cận): bật người xoay một vòng cho váy xoè, đáp xuống thế thủ thấp, vai trái đưa tới, tay trái duỗi trước
// như mời đấu, nghiêng đầu. Không giơ cao / gập mạnh tay trái: lưới liền khối kéo rách nách khi cánh tay trên nhấc quá ~30°.
const victoryPose = spline([
  [0, {}],
  [0.12, { ...P([0, -0.022, 0]), chest: [4, 0, 0], spine: [2, 0, 0], skL: [0, 0, 4], skR: [0, 0, -4] }],
  [0.3, { hipsPos: [0, 0.03, 0], thL: [-12, 0, 0], thR: [-12, 0, 0], shL: [24, 0, 0], shR: [24, 0, 0], ftL: [-8, 0, 0], ftR: [-8, 0, 0], chest: [-3, 0, 0], head: [-3, 0, 0], skF: [-10, 0, 0], skB: [10, 0, 0], skL: [0, 0, 16], skR: [0, 0, -16] }],
  [0.46, { ...P([0, -0.012, 0.004]), chest: [2, -4, 0], head: [-2, 2, 0], ...A('strike', 0.3), skF: [-6, 0, 0], skB: [6, 0, 0], skL: [0, 0, 10], skR: [0, 0, -10] }],
  [0.6, { ...P([0, -0.02, 0.01]), chest: [5, -10, 0], spine: [4, -4, 0], head: [-5, 8, 7], ...A('strike', 0.6), skF: [3, 0, 0], skB: [-2, 0, 0], skL: [0, 0, 3], skR: [0, 0, -3] }],
  [0.9, { ...P([0, -0.019, 0.009]), chest: [4, -9, 0], spine: [4, -4, 0], head: [-4, 7, 6], ...A('strike', 0.58) }],
  [1, {}],
]);
const victory = (u) => {
  const turn = Math.min(1, Math.max(0, (u - 0.08) / 0.4)), e = turn * turn * (3 - 2 * turn);
  return add(victoryPose(u), { root: [0, 360 * e, 0] });
};

// Trưng bày (sảnh): thở như Idle, rồi đưa bàn tay trái ra trước như mời / truyền khí, nghiêng đầu, thu về.
const showcase = (u) => {
  const accent = spline([
    [0, {}], [0.16, {}],
    [0.3, { chest: [-2, 6, 0], spine: [-1, 2, 0], head: [-3, -6, 4], ...A('heal', 0.7), skF: [2, 0, 0], skB: [-2, 0, 0] }],
    [0.42, { chest: [-3, 6, 0], spine: [-1, 2, 0], head: [-3, -7, 5], ...A('heal', 0.85) }],
    [0.56, { chest: [-3, 5, 0], spine: [-1, 2, 0], head: [-2, -5, 4], ...A('heal', 0.8) }],
    [0.72, {}], [1, {}],
  ], false)(u);
  return add(accent, idle((u * 2) % 1));
};

const LAG = { spine: 0.012, chest: 0.024, neck: 0.036, head: 0.055, uaL: 0.02, faL: 0.04, hdL: 0.06, skF: 0.08, skB: 0.09, skL: 0.1, skR: 0.1 };
const L = (fn) => lagged(fn, LAG);
const W1 = [[0.36, 0.36, 'out'], [0.44, 0.5, 'in'], [0.5, 0.52, 'lin'], [0.72, 0.68, 'out'], [1, 1, 'io']]; // đòn thường: chạm 0.264s

export const sakuraAnim = {
  style: { atk1: 'pushL', atk2: 'pushL', cast1: 'pushL', cast2: 'raise2', ult: 'raise2' },
  run: { amp: 36, arm: 0.5, bob: 0.014, lean: 8 }, idle: 'calm', moveSpeed: 325, swayAmp: 6, // amp chỉ để tính chu kỳ (≈0.53s) và runRefSpeed; tư thế chạy viết tay ở dưới
  extra: { skF: 'SkirtF', skB: 'SkirtB', skL: 'SkirtL', skR: 'SkirtR' },
  custom: {
    Idle: { dur: 3.0, loop: true, pose: planted(idle) },
    Run: { dur: 'run', loop: true, pose: run },
    Attack1: { dur: 0.6, pose: L(attack1), warp: snap(W1) },
    Attack2: { dur: 0.6, pose: L(attack2), warp: snap(W1) },
    Cast1: { dur: 0.8, pose: L(cast1), warp: snap([[0.18, 0.22, 'out'], [0.26, 0.32, 'in'], [0.32, 0.34, 'lin'], [0.72, 0.8, 'out'], [1, 1, 'io']]) },
    Cast2: { dur: 0.8, pose: L(cast2), warp: snap([[0.26, 0.28, 'out'], [0.32, 0.34, 'in'], [0.66, 0.64, 'lin'], [1, 1, 'io']]) },
    Ult: { dur: 1.4, pose: L(ult), warp: snap([[0.3, 0.34, 'out'], [0.38, 0.42, 'in'], [0.44, 0.44, 'lin'], [0.8, 0.8, 'out'], [1, 1, 'io']]) },
    Death: { dur: 1.6, pose: death, warp: snap([[0.08, 0.1, 'out'], [0.3, 0.3, 'io'], [0.64, 0.76, 'in'], [0.76, 0.86, 'out'], [1, 1, 'io']]) },
    Recall: { dur: 2.0, loop: true, pose: planted(recall) },
    Victory: { dur: 2.4, pose: L(victory) },
    Showcase: { dur: 6.0, loop: true, pose: planted(showcase) },
  },
};
