// Bộ xương người chung cho mọi tướng + thân mặc định (tuỳ chỉnh bằng spec).
// Mọi toạ độ trong spec tính theo tỉ lệ chiều cao H (mét) trừ khi ghi khác.
import * as THREE from 'three';
import { Model, V, D2R, smooth } from './kit.mjs';
import { segWeights, SdfBody } from './sdf.mjs';
const segWeightsRel = (b1, b2, from, to) => segWeights(b1, b2, from, to, 0, 1, 0, 1);

const ARM_PRESETS = {
  down:   { fwd: 0,  abd: 9,  flex: 6,   inn: 0 },
  ready:  { fwd: 10, abd: 16, flex: 78,  inn: 24 },
  front2: { fwd: 22, abd: 12, flex: 98,  inn: 58 },
  wide:   { fwd: 6,  abd: 52, flex: 22,  inn: 0 },
  raised: { fwd: 70, abd: 20, flex: 40,  inn: 10 },
  guard:  { fwd: 28, abd: 18, flex: 100, inn: 30 },
  hip:    { fwd: -6, abd: 34, flex: 92,  inn: -22 },
};

export const BONE = (n) => 'Bone_' + n;
/** Phong cách chung: đầu to hơn, tay chân dày hơn, mặt lớn để đọc được ở cỡ nhỏ. */
export const STYLE = { head: 0.86, limb: 0.94 }; // tỉ lệ anime bán thực: ~7 đầu, tay chân thon

/** Tính vị trí khuỷu/cổ tay/đầu ngón bằng FK cho tay bên trái (+X). */
function armFK(S, Lu, Lf, Lh, p) {
  const qu = new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.fwd * D2R, 0, p.abd * D2R, 'XYZ'));
  const qf = new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.flex * D2R, -p.inn * D2R, 0, 'YXZ'));
  const down = V(0, -1, 0);
  const E = S.clone().add(down.clone().applyQuaternion(qu).multiplyScalar(Lu));
  const dirF = down.clone().applyQuaternion(qu.clone().multiply(qf));
  const W = E.clone().add(dirF.clone().multiplyScalar(Lf));
  const T = W.clone().add(dirF.clone().multiplyScalar(Lh));
  return { E, W, T };
}

export function humanoid(id, s = {}) {
  const H = s.H ?? 1.85;
  const S = Object.assign({
    headS: 1, shoulder: 0.17, chestW: 0.145, chestD: 0.085, waistW: 0.105, hipW: 0.125,
    armR: 0.03, legR: 0.047, legOut: 0.058, stance: 0, armL: 'down', armR_: 'down',
    skin: '#e7b993', top: '#8a8a8a', pelvis: '#555555', boot: '#333333',
    arm: null, forearm: null, hand: null, thigh: null, shin: null, bootTop: null,
    skip: [], face: true, eye: '#1b1b22', brow: '#2a1c14', lip: '#b5605a',
    hipY: 0.49, hunch: 0, handR: 0.03, neckR: 0.03, footL: 0.078, kneeBend: 0,
  }, s);
  const m = new Model(id);
  m.skinHex = S.skin;
  const hips = S.hipY * H;
  const y = (f) => f * H;
  const zs = (f) => S.hunch * H * Math.pow(Math.max(0, (f - 0.5) / 0.35), 1.4); // độ gù về phía trước theo độ cao

  // ---- xương ----
  m.joint(BONE('Root'), null, 0, 0, 0);
  m.joint(BONE('Hips'), BONE('Root'), 0, hips, 0);
  m.joint(BONE('Spine'), BONE('Hips'), 0, y(0.56), zs(0.56));
  m.joint(BONE('Chest'), BONE('Spine'), 0, y(0.66), zs(0.66));
  m.joint(BONE('Neck'), BONE('Chest'), 0, y(0.795), 0.005 * H + zs(0.795));
  m.joint(BONE('Head'), BONE('Neck'), 0, y(0.835), 0.008 * H + zs(0.835));
  const shX = S.shoulder * H, shY = y(0.775);
  const Lu = 0.175 * H, Lf = 0.16 * H, Lh = 0.075 * H;
  const shoulder = V(shX, shY, zs(0.775));
  const fkL = armFK(shoulder, Lu, Lf, Lh, ARM_PRESETS[S.armL]);
  const fkR = armFK(shoulder, Lu, Lf, Lh, ARM_PRESETS[S.armR_]);
  const mir = (v) => V(-v.x, v.y, v.z);
  const R = { E: mir(fkR.E), W: mir(fkR.W), T: mir(fkR.T) };
  m.joint(BONE('UpperArmL'), BONE('Chest'), shoulder.x, shoulder.y, shoulder.z);
  m.joint(BONE('UpperArmR'), BONE('Chest'), -shoulder.x, shoulder.y, shoulder.z);
  m.joint(BONE('ForearmL'), BONE('UpperArmL'), fkL.E.x, fkL.E.y, fkL.E.z);
  m.joint(BONE('ForearmR'), BONE('UpperArmR'), R.E.x, R.E.y, R.E.z);
  m.joint(BONE('HandL'), BONE('ForearmL'), fkL.W.x, fkL.W.y, fkL.W.z);
  m.joint(BONE('HandR'), BONE('ForearmR'), R.W.x, R.W.y, R.W.z);
  m.joint(BONE('HandL_Tip'), BONE('HandL'), fkL.T.x, fkL.T.y, fkL.T.z);
  m.joint(BONE('HandR_Tip'), BONE('HandR'), R.T.x, R.T.y, R.T.z);
  const lx = S.legOut * H + S.stance * H;
  const kneeZ = (0.012 + S.kneeBend) * H;
  m.joint(BONE('ThighL'), BONE('Hips'), S.legOut * H * 0.95, hips, 0);
  m.joint(BONE('ThighR'), BONE('Hips'), -S.legOut * H * 0.95, hips, 0);
  m.joint(BONE('ShinL'), BONE('ThighL'), lx, y(0.265), kneeZ);
  m.joint(BONE('ShinR'), BONE('ThighR'), -lx, y(0.265), kneeZ);
  m.joint(BONE('FootL'), BONE('ShinL'), lx, y(0.05), 0);
  m.joint(BONE('FootR'), BONE('ShinR'), -lx, y(0.05), 0);

  const hs = S.headS * STYLE.head;
  const hr = 0.083 * H * hs;
  const hc = V(0, y(0.9) + (hs - 1) * 0.02 * H, 0.008 * H + zs(0.9));
  const ctx = { m, H, S, hr, hc, hips, zs, shoulder, Lu, Lf, Lh, y, hipsRest: [0, hips, 0], legLen: hips,
    armDirs: { L: fkL, R } };
  const skin = S.skin;
  const col = (v, d) => v || d;
  const has = (k) => !S.skip.includes(k);

  // ---- thân liền khối (SDF): thân, cổ, đầu, tay, chân hoà trộn mềm như đất nặn, không lộ khớp nối ----
  const B = BONE, one = (b) => () => [[B(b), 1]];
  if (has('torso')) {
    const cd = S.chestD * H, cw = S.chestW * H, ww = S.waistW * H, hw = S.hipW * H;
    const yH = y(0.5), yS = y(0.58), yC = y(0.685), waist = y(0.522);
    const tw = (x, yy) => {
      if (yy <= yH) return [[B('Hips'), 1]];
      if (yy <= yS) { const t = smooth(yH, yS, yy); return [[B('Hips'), 1 - t], [B('Spine'), t]]; }
      const t = smooth(yS, yC, yy); return [[B('Spine'), 1 - t], [B('Chest'), t]];
    };
    const tc = (x, yy) => (yy < waist ? S.pelvis : S.top);
    const secs0 = [
      { y: y(0.445), rx: hw * 0.6, rz: cd * 0.62 }, { y: y(0.47), rx: hw * 0.92, rz: cd * 0.9 }, { y: y(0.5), rx: hw, rz: cd * 1.0, cz: -0.004 },
      { y: y(0.535), rx: (hw + ww) * 0.5 * 1.04, rz: cd * 0.95 }, { y: y(0.575), rx: ww, rz: cd * 0.88 },
      { y: y(0.63), rx: cw * 0.93, rz: cd * 0.98, cz: 0.004 }, { y: y(0.695), rx: cw, rz: cd * 1.08, cz: 0.008 },
      { y: y(0.745), rx: cw * 1.0, rz: cd * 1.0, cz: 0.004 }, { y: y(0.785), rx: cw * 0.78, rz: cd * 0.74 }, { y: y(0.805), rx: cw * 0.4, rz: cd * 0.5 },
    ].map((q) => ({ ...q, cz: (q.cz || 0) + zs(q.y / H) }));
    m.blob({ loft: secs0, k: 0.03, color: tc, weights: tw });
    for (const sd of [1, -1]) m.blob({ ell: [[sd * cw * 0.45, y(0.525), cd * 0.55], [hw * 0.34, y(0.035), cd * 0.3]], k: 0.05, color: tc, weights: tw }); // hông trước
    m.blob({ cone: [[0, y(0.775), 0.004 * H + zs(0.775)], [0, y(0.845), 0.006 * H + zs(0.845)], S.neckR * H * 1.15, S.neckR * H * 0.95], k: 0.04, color: skin,
      weights: segWeightsRel(B('Chest'), B('Neck'), [0, y(0.78), 0], [0, y(0.85), 0]) });
  }
  if (has('head')) {
    const hb = one('Head');
    const headPrims = [
      { ell: [[0, hc.y + hr * 0.04, hc.z - hr * 0.06], [hr * 0.9, hr * 0.96, hr * 0.94]], k: 0.03, color: skin, weights: hb },          // sọ
      { cone: [[0, hc.y - hr * 0.22, hc.z + hr * 0.0], [0, hc.y - hr * 0.98, hc.z + hr * 0.42], hr * 0.72, hr * 0.12], k: 0.05, color: skin, weights: hb }, // hàm thon, cằm nhọn
    ];
    ctx.headSdf = new SdfBody();
    for (const q of headPrims) { m.blob(q); ctx.headSdf.add({ ...q }); }
    m.blob({ ell: [[0, hc.y - hr * 0.3, hc.z + hr * 0.86], [hr * 0.05, hr * 0.05, hr * 0.05]], k: 0.03, color: skin, weights: hb });    // chóp mũi rất nhỏ (kiểu anime)
    m.blob({ ell: [[hr * 0.93, hc.y - hr * 0.05, hc.z - hr * 0.05], [hr * 0.12, hr * 0.2, hr * 0.12]], k: 0.02, color: skin, weights: hb, mirror: true }); // tai
  }
  if (has('head') && S.face) faceFeatures(ctx);
  // ---- tay ----
  if (has('arms')) {
    const ac = col(S.arm, skin), fc = col(S.forearm, ac), hc2 = col(S.hand, skin);
    const rS = S.armR * H * STYLE.limb;
    const dirs = ctx.armDirs.L;
    const Sp = [shoulder.x, shoulder.y, shoulder.z];
    const Ep = dirs.E.toArray(), Wp = dirs.W.toArray(), Tp = dirs.T.toArray();
    const U = B('UpperArmL'), F = B('ForearmL'), Hd = B('HandL');
    const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const wU = segWeights(U, F, Sp, Ep, 0.6, 1, 0, 0.5), wF = segWeights(U, F, Ep, Wp, 0, 0.35, 0.5, 1);
    m.blob({ ell: [lerp3(Sp, Ep, 0.1), [rS * 1.4, rS * 1.3, rS * 1.25]], k: 0.04, color: ac, mirror: true, weights: segWeights(B('Chest'), U, [0, Sp[1], Sp[2]], Ep, 0.25, 0.55, 0, 1) }); // cơ vai
    m.blob({ cone: [lerp3(Sp, Ep, 0.1), Ep, rS * 1.1, rS * 0.78], k: 0.02, color: ac, mirror: true, weights: wU });
    m.blob({ ell: [lerp3(Sp, Ep, 0.45).map((v, i) => v + (i === 2 ? rS * 0.25 : 0)), [rS * 0.92, (Lu * 0.28), rS * 0.95]], k: 0.03, color: ac, mirror: true, weights: wU }); // bắp tay
    m.blob({ cone: [Ep, lerp3(Ep, Wp, 0.28), rS * 0.8, rS * 0.98], k: 0.02, color: fc, mirror: true, weights: wF });
    m.blob({ cone: [lerp3(Ep, Wp, 0.28), Wp, rS * 0.98, rS * 0.56], k: 0.02, color: fc, mirror: true, weights: wF });
    // bàn tay: lòng bàn tay + hai cụm ngón + ngón cái (không còn kiểu găng tròn)
    const hr_ = S.handR * H, dir = V(...Tp).sub(V(...Wp)).normalize(), side = new THREE.Vector3().crossVectors(dir, V(0, 0, 1));
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    const off = (p, s, k = hr_) => [p[0] + side.x * s * k, p[1] + side.y * s * k, p[2] + side.z * s * k];
    const wH = segWeights(F, Hd, Wp, Tp, 0, 0.35, 0.3, 1), palm = lerp3(Wp, Tp, 0.55);
    m.blob({ cone: [lerp3(Wp, Tp, 0.12), palm, hr_ * 0.62, hr_ * 0.7], k: 0.012, color: hc2, mirror: true, weights: wH });
    for (const s of [0.34, -0.34]) m.blob({ cone: [off(palm, s), off(lerp3(Wp, Tp, 1.05), s * 1.2), hr_ * 0.34, hr_ * 0.2], k: 0.008, color: hc2, mirror: true, weights: one('HandL') });
    m.blob({ cone: [off(lerp3(Wp, Tp, 0.3), 0.7), off(lerp3(Wp, Tp, 0.7), 1.05).map((v, i) => v + (i === 2 ? hr_ * 0.5 : 0)), hr_ * 0.3, hr_ * 0.2], k: 0.008, color: hc2, mirror: true, weights: one('HandL') }); // ngón cái
  }
  // ---- chân ----
  if (has('legs')) {
    const tc2 = col(S.thigh, S.pelvis), sc = col(S.shin, tc2);
    const rL = S.legR * H * STYLE.limb;
    const T = B('ThighL'), Sh = B('ShinL'), Ft = B('FootL');
    const hp = [S.legOut * H * 0.95, hips, 0], kn = [lx, y(0.265), kneeZ], an = [lx, y(0.05), 0];
    const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    m.blob({ cone: [at(hp, kn, 0.05), at(hp, kn, 0.5), rL * 1.18, rL * 1.02], k: 0.04, color: tc2, mirror: true, weights: segWeights(T, Sh, hp, kn, 0.65, 1, 0, 0.5) });
    m.blob({ cone: [at(hp, kn, 0.5), kn, rL * 1.02, rL * 0.84], k: 0.015, color: tc2, mirror: true, weights: segWeights(T, Sh, hp, kn, 0.65, 1, 0, 0.5) });
    m.blob({ ell: [[kn[0], kn[1], kn[2] + rL * 0.1], [rL * 0.86, rL * 0.95, rL * 0.86]], k: 0.015, color: sc, mirror: true, weights: segWeights(T, Sh, hp, an, 0.45, 0.55, 0, 1) });
    m.blob({ cone: [kn, at(kn, an, 0.35), rL * 0.86, rL * 0.95], k: 0.015, color: sc, mirror: true, weights: segWeights(T, Sh, kn, an, 0, 0.3, 0.5, 1) });
    m.blob({ cone: [at(kn, an, 0.35), an, rL * 0.95, rL * 0.55], k: 0.015, color: sc, mirror: true, weights: segWeights(T, Sh, kn, an, 0, 0.3, 0.5, 1) });
    m.blob({ ell: [[kn[0], at(kn, an, 0.28)[1], kn[2] - rL * 0.3], [rL * 0.78, rL * 1.8, rL * 0.7]], k: 0.03, color: sc, mirror: true, weights: segWeights(T, Sh, kn, an, 0, 0.3, 0.5, 1) }); // bắp chân
    if (has('feet')) {
      const bt = col(S.bootTop, S.boot);
      m.blob({ cone: [[lx, y(0.13), 0], [lx, y(0.05), 0], rL * 0.74, rL * 0.7], k: 0.012, color: bt, mirror: true, weights: segWeights(Sh, Ft, [lx, y(0.2), 0], an, 0, 1, 0, 1) });
      m.blob({ ell: [[lx, y(0.028), y(0.02)], [rL * 0.72, y(0.03), y(S.footL) * 0.85]], k: 0.03, color: S.boot, mirror: true, weights: one('FootL') });
      m.blob({ cone: [[lx, y(0.022), y(0.03)], [lx, y(0.012), y(S.footL) * 1.25], rL * 0.6, rL * 0.18], k: 0.02, color: S.boot, mirror: true, weights: one('FootL') }); // mũi giày thon
    }
  }
  return ctx;
}

/** Mắt, mày, môi đơn giản; đủ để ở màn trưng bày thấy mặt có hồn. */
const shade = (hex, k) => { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); return '#' + new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * (k > 0 ? 0.9 : 1.1)), Math.min(0.92, Math.max(0.04, hsl.l + k))).getHexString(); };

/** Mặt kiểu anime: mắt to có mống chuyển sắc (tối trên, sáng dưới), con ngươi, 2 đốm sáng, viền mi dày, má hồng, miệng nhỏ. */
export function faceFeatures(ctx, o = {}) {
  const { m, hr, hc, S } = ctx;
  if (m.userData.face) return; // chỉ một lần (hero có thể gọi lại với tuỳ chọn riêng trước khi humanoid gọi)
  const iris = o.eyeColor || (S.eye && S.eye !== '#1b1b22' ? S.eye : '#7a4a2a');
  m.userData.face = { iris, lash: o.lash || S.lash || '#1a1216', brow: o.brow || S.brow || '#2a1c14', lip: o.lip || S.lip || '#b5605a', skin: S.skin,
    closed: !!o.closedEyes, browTilt: o.browTilt ?? -8, style: o.style || S.faceStyle || 'soft', blush: o.blush || '#f39a9a',
    rect: { x0: -0.82, x1: 0.82, y0: -1.0, y1: 0.55 } };
  m.facePatch(ctx.headSdf, { hc, hr, bone: BONE('Head') });
}

/**
 * Tóc anime từng lọn (SDF, liền với đầu): chỏm tóc ôm sọ + mái + tóc mai + lọn sau gáy, có vệt sáng quanh đỉnh.
 * o: { color, color2 (đuôi tóc), shine, bangs (số lọn mái), side (dài tóc mai, ×hr), back (dài lọn sau, ×hr), spiky (0..1), part (lệch ngôi, -1..1), volume }
 */
export function hairLocks(ctx, o = {}) {
  const { m, hr, hc } = ctx;
  const Hd = BONE('Head'), hb = () => [[Hd, 1]];
  const base = new THREE.Color(o.color || '#2a1c20'), tip = new THREE.Color(o.color2 || o.color || '#2a1c20');
  const shine = new THREE.Color(o.shine || '#ffffff');
  const vol = o.volume ?? 1.08, spiky = o.spiky ?? 0.3, part = o.part ?? 0.25;
  const crownY = hc.y + hr * 0.62;
  const col = (x, y, z) => {
    const t = Math.min(1, Math.max(0, (crownY - y) / (hr * 2.2)));
    const c = base.clone().lerp(tip, t);
    const band = Math.exp(-Math.pow((y - (hc.y + hr * 0.52)) / (hr * 0.07), 2)) * (z > hc.z - hr * 0.2 ? 1 : 0.3);
    return '#' + c.lerp(shine, band * 0.45).getHexString();
  };
  // chỏm tóc: lệch ra sau-lên để lộ trán
  m.blob({ ell: [[0, hc.y + hr * 0.16, hc.z - hr * 0.2], [hr * vol, hr * vol * 1.0, hr * vol]], k: 0.012, color: col, weights: hb, mat: 3 });
  m.blob({ ell: [[0, hc.y + hr * 0.62, hc.z + hr * 0.28], [hr * 0.9, hr * 0.42, hr * 0.62]], k: 0.03, color: col, weights: hb, mat: 3 });
  const lock = (root, mid, end, r0) => { m.blob({ cone: [root, mid, r0, r0 * 0.7], k: 0.012, color: col, weights: hb, mat: 3 }); m.blob({ cone: [mid, end, r0 * 0.7, 0.004], k: 0.008, color: col, weights: hb, mat: 3 }); };
  // mái: các lọn rủ xuống trán, xoè nhẹ, ngôi lệch
  const nb = o.bangs ?? 7;
  for (let i = 0; i < nb; i++) {
    const u = nb > 1 ? i / (nb - 1) * 2 - 1 : 0, a = u * 1.05 + part * 0.25;
    const len = hr * (0.36 + 0.14 * Math.cos(u * 2.3 + part) - 0.1 * Math.abs(u)) * (1 + spiky * 0.2 * ((i % 2) - 0.5));
    const rx = Math.sin(a) * hr * 0.86, rz = Math.cos(a) * hr * 0.86;
    const root = [rx * 0.8, hc.y + hr * 0.8, hc.z + rz * 0.72], mid = [rx * 1.02, hc.y + hr * 0.55, hc.z + rz * 1.08 + hr * 0.02];
    const end = [rx * (1.05 + spiky * 0.1) + u * hr * 0.08, hc.y + hr * 0.55 - len, hc.z + rz * 1.02 + hr * 0.05];
    lock(root, mid, end, hr * (0.2 - 0.03 * Math.abs(u)));
  }
  // tóc mai hai bên
  const sideL = o.side ?? 1.1;
  for (const s of [1, -1]) for (const [dz, k] of [[0.25, 1], [-0.1, 0.85]]) {
    const root = [s * hr * 0.85, hc.y + hr * 0.45, hc.z + hr * dz], mid = [s * hr * 1.02, hc.y - hr * 0.1, hc.z + hr * (dz + 0.05)];
    lock(root, mid, [s * hr * (0.95 + spiky * 0.12), hc.y - hr * (0.1 + sideL * k), hc.z + hr * (dz + 0.12)], hr * 0.2);
  }
  // lọn sau gáy
  const backL = o.back ?? 1.0;
  if (backL > 0) for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5 - 0.5) * 2.2, rx = Math.sin(a) * hr, rz = Math.cos(a) * hr;
    const root = [rx * 0.7, hc.y + hr * 0.5, hc.z + rz * 0.7], mid = [rx * 1.05, hc.y - hr * 0.1, hc.z + rz * 1.08];
    lock(root, mid, [rx * (1.05 + spiky * 0.25), hc.y - hr * (0.2 + backL * (0.9 + 0.15 * (i % 2))), hc.z + rz * (1.05 + spiky * 0.2)], hr * 0.28);
  }
}
