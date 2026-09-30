// Trang phục dạng SDF phủ lên thân (có độ dày, mép áo, cổ tay, cổ ủng) — màu lấy theo khối gần nhất nên ranh giới gọn.
import { BONE } from './humanoid.mjs';
import { segWeights } from './sdf.mjs';
import { smooth } from './kit.mjs';

const B = BONE;
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const torsoW = (ctx) => { const { y } = ctx; const yH = y(0.5), yS = y(0.58), yC = y(0.685);
  return (x, yy) => { if (yy <= yH) return [[B('Hips'), 1]]; if (yy <= yS) { const t = smooth(yH, yS, yy); return [[B('Hips'), 1 - t], [B('Spine'), t]]; } const t = smooth(yS, yC, yy); return [[B('Spine'), 1 - t], [B('Chest'), t]]; }; };

/** Áo khoác/áo dài: vỏ loft to hơn thân một chút, từ vai xuống `hem` (tỉ lệ H), xoè `flare` ở gấu. */
export function jacket(ctx, o = {}) {
  const { m, H, S, y, zs } = ctx;
  const cw = S.chestW * H, cd = S.chestD * H, ww = S.waistW * H, hw = S.hipW * H, th = o.thick ?? 0.012 * H;
  const hem = o.hem ?? 0.47, fl = o.flare ?? 1.1;
  const secs = [
    { y: y(hem), rx: hw * fl + th, rz: cd * fl * 0.95 + th }, { y: y(Math.max(hem + 0.02, 0.5)), rx: hw + th, rz: cd + th },
    { y: y(0.575), rx: ww + th, rz: cd * 0.88 + th }, { y: y(0.63), rx: cw * 0.93 + th, rz: cd * 0.98 + th },
    { y: y(0.695), rx: cw + th, rz: cd * 1.08 + th }, { y: y(0.75), rx: cw + th, rz: cd + th }, { y: y(0.79), rx: cw * 0.72 + th, rz: cd * 0.72 + th },
  ].filter((q, i, a) => i === 0 || q.y > a[i - 1].y).map((q) => ({ ...q, cz: zs(q.y / H) + (q.y > y(0.6) ? 0.006 * H : 0) }));
  m.blob({ loft: secs, k: 0.006, color: o.color2 ? (x, yy) => (yy < y(o.split ?? 0.56) ? o.color2 : o.color) : o.color, weights: torsoW(ctx) });
  if (o.trim) m.blob({ loft: [{ y: y(hem) - 0.004, rx: hw * fl + th * 1.6, rz: cd * fl * 0.95 + th * 1.6 }, { y: y(hem) + 0.022, rx: hw * fl * 0.98 + th * 1.6, rz: cd * fl * 0.93 + th * 1.6 }], k: 0.004, color: o.trim, weights: torsoW(ctx) });
  if (o.collar) m.blob({ loft: [{ y: y(0.785), rx: cw * 0.62 + th, rz: cd * 0.66 + th }, { y: y(0.825), rx: cw * 0.44, rz: cd * 0.55 }], k: 0.006, color: o.collar, weights: () => [[B('Chest'), 0.6], [B('Neck'), 0.4]] });
}

/** Tay áo (và cổ tay áo) ôm ngoài tay. */
export function sleeves(ctx, o = {}) {
  const { m, H, S, shoulder } = ctx, rS = S.armR * H * 1.12, th = o.thick ?? 0.009 * H;
  const d = ctx.armDirs.L, Sp = [shoulder.x, shoulder.y, shoulder.z], Ep = d.E.toArray(), Wp = d.W.toArray();
  const U = B('UpperArmL'), F = B('ForearmL');
  m.blob({ ell: [lerp3(Sp, Ep, 0.12), [rS * 1.45 + th, rS * 1.38 + th, rS * 1.32 + th]], k: 0.01, color: o.color, mirror: true, weights: segWeights(B('Chest'), U, [0, Sp[1], Sp[2]], Ep, 0.25, 0.55, 0, 1) });
  m.blob({ cone: [lerp3(Sp, Ep, 0.1), Ep, rS * 1.18 + th, rS * 0.9 + th], k: 0.006, color: o.color, mirror: true, weights: segWeights(U, F, Sp, Ep, 0.6, 1, 0, 0.5) });
  if (o.long !== false) {
    const end = lerp3(Ep, Wp, o.len ?? 0.92), fl = o.flare ?? 1.0;
    m.blob({ cone: [Ep, end, rS * 0.92 + th, rS * 0.7 * fl + th], k: 0.006, color: o.color, mirror: true, weights: segWeights(U, F, Ep, Wp, 0, 0.35, 0.5, 1) });
    if (o.cuff) m.blob({ cone: [lerp3(Ep, Wp, (o.len ?? 0.92) - 0.14), end, rS * 0.78 * fl + th * 1.7, rS * 0.72 * fl + th * 1.7], k: 0.004, color: o.cuff, mirror: true, weights: () => [[F, 1]] });
  }
}

/** Đai lưng quanh eo, có khoá. */
export function belt(ctx, o = {}) {
  const { m, H, S, y, zs } = ctx, ww = S.waistW * H, hw = S.hipW * H, cd = S.chestD * H, at = o.at ?? 0.525, th = o.thick ?? 0.018 * H;
  const r = (hw + ww) * 0.5 * 1.04 + th, rz = cd * 0.95 + th;
  m.blob({ loft: [{ y: y(at) - 0.022, rx: r, rz, cz: zs(at) }, { y: y(at) + 0.022, rx: r * 0.99, rz: rz * 0.99, cz: zs(at) }], k: 0.004, color: o.color, weights: () => [[B('Hips'), 1]] });
  if (o.buckle) m.blob({ ell: [[0, y(at), rz + zs(at) + 0.006], [0.03, 0.026, 0.012]], k: 0.004, color: o.buckle, weights: () => [[B('Hips'), 1]] });
}

/** Vạt áo trước/sau (tấm dày bo tròn) rủ từ eo xuống `len` (tỉ lệ H). */
export function flaps(ctx, o = {}) {
  const { m, H, S, y } = ctx, cd = S.chestD * H, top = y(o.at ?? 0.52), bot = y(o.len ?? 0.28), w = o.width ?? S.hipW * H * 0.7;
  for (const s of o.sides || [1, -1]) {
    const z = s * (cd * 0.95 + 0.012);
    const wts = (x, yy) => { const t = Math.min(1, Math.max(0, (top - yy) / (top - bot))); const leg = x >= 0 ? 'L' : 'R'; return t < 0.2 ? [[B('Hips'), 1]] : [[B('Hips'), 1 - t * 0.6], [B('Thigh' + leg), t * 0.6]]; };
    m.blob({ loft: [{ y: bot, rx: w * 0.55, rz: 0.014, cz: z + s * 0.035 }, { y: (top + bot) / 2, rx: w * 0.52, rz: 0.014, cz: z + s * 0.015 }, { y: top, rx: w * 0.45, rz: 0.014, cz: z }], k: 0.006, color: o.color, weights: wts });
  }
}

/** Ủng cao có cổ ủng loe. */
export function boots(ctx, o = {}) {
  const { m, H, S, y } = ctx, rL = S.legR * H * 1.12, lx = S.legOut * H + S.stance * H, th = o.thick ?? 0.01 * H;
  const kn = [lx, y(0.265), (0.012 + S.kneeBend) * H], an = [lx, y(0.05), 0], top = lerp3(kn, an, o.top ?? 0.2);
  const Sh = B('ShinL'), Ft = B('FootL');
  m.blob({ cone: [top, an, rL * 0.95 + th, rL * 0.66 + th], k: 0.006, color: o.color, mirror: true, weights: segWeights(Sh, Ft, top, an, 0.8, 1, 0, 0.6) });
  m.blob({ ell: [[lx, y(0.03), y(0.035)], [rL * 0.86 + th, y(0.04), y(S.footL) + th]], k: 0.02, color: o.color, mirror: true, weights: () => [[Ft, 1]] });
  if (o.cuff) m.blob({ cone: [lerp3(top, an, -0.04), lerp3(top, an, 0.12), rL * 1.15 + th, rL * 1.0 + th], k: 0.004, color: o.cuff, mirror: true, weights: () => [[Sh, 1]] });
}

/** Khăn quàng cổ (vòng dày quanh cổ). */
export function scarf(ctx, o = {}) {
  const { m, H, S, y } = ctx, r = S.neckR * H * 1.9;
  m.blob({ loft: [{ y: y(0.77), rx: r * 1.15, rz: r * 1.05, cz: 0.01 }, { y: y(0.8), rx: r * 1.05, rz: r, cz: 0.012 }, { y: y(0.83), rx: r * 0.9, rz: r * 0.88, cz: 0.012 }], k: 0.01, color: o.color, weights: () => [[B('Chest'), 0.5], [B('Neck'), 0.5]] });
}
