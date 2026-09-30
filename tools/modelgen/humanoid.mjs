// Bộ xương người chung cho mọi tướng + thân mặc định (tuỳ chỉnh bằng spec).
// Mọi toạ độ trong spec tính theo tỉ lệ chiều cao H (mét) trừ khi ghi khác.
import * as THREE from 'three';
import { Model, V, D2R, smooth } from './kit.mjs';

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

  const hr = 0.083 * H * S.headS;
  const hc = V(0, y(0.9) + (S.headS - 1) * 0.02 * H, 0.008 * H + zs(0.9));
  const ctx = { m, H, S, hr, hc, hips, zs, shoulder, Lu, Lf, Lh, y, hipsRest: [0, hips, 0], legLen: hips,
    armDirs: { L: fkL, R } };
  const skin = S.skin;
  const col = (v, d) => v || d;
  const has = (k) => !S.skip.includes(k);

  // ---- thân (loft liền một khối, trọng số Hips → Spine → Chest) ----
  if (has('torso')) {
    const cd = S.chestD * H, cw = S.chestW * H, ww = S.waistW * H, hw = S.hipW * H;
    const secs0 = [
      { y: y(0.452), rx: hw * 0.72, rz: cd * 0.78 }, { y: y(0.49), rx: hw, rz: cd * 1.0, cz: -0.004 },
      { y: y(0.53), rx: (hw + ww) * 0.5 * 1.05, rz: cd * 0.96 }, { y: y(0.575), rx: ww, rz: cd * 0.88 },
      { y: y(0.63), rx: cw * 0.93, rz: cd * 0.98, cz: 0.004 }, { y: y(0.695), rx: cw, rz: cd * 1.1, cz: 0.008 },
      { y: y(0.745), rx: cw * 1.03, rz: cd * 1.02, cz: 0.004 }, { y: y(0.784), rx: cw * 0.82, rz: cd * 0.78 },
      { y: y(0.808), rx: S.neckR * H * 1.3, rz: S.neckR * H * 1.2 },
    ];
    const secs = secs0.map((q) => ({ ...q, cz: (q.cz || 0) + zs(q.y / H) }));
    const yH = y(0.5), yS = y(0.58), yC = y(0.685);
    m.loft(secs, { bone: BONE('Hips'), color: S.top, color2: S.pelvis, seg: 26, ao: 0.28,
      weights: (p) => {
        if (p.y <= yH) return [[BONE('Hips'), 1]];
        if (p.y <= yS) { const t = smooth(yH, yS, p.y); return [[BONE('Hips'), 1 - t], [BONE('Spine'), t]]; }
        const t = smooth(yS, yC, p.y); return [[BONE('Spine'), 1 - t], [BONE('Chest'), t]];
      } });
    m.cyl(S.neckR * H * 0.95, S.neckR * H * 1.05, y(0.07), { at: [0, y(0.812), 0.004 * H + zs(0.812)], bone: BONE('Neck'), color: skin, seg: 12,
      blend: { b1: BONE('Chest'), b2: BONE('Neck'), from: [0, y(0.78), 0], to: [0, y(0.85), 0], t0: 0, t1: 1, w0: 0, w1: 1 } });
  }
  // ---- đầu ----
  if (has('head')) {
    m.sphere(1, { radii: [hr * 0.93, hr * 1.06, hr], at: hc.toArray(), bone: BONE('Head'), color: skin, wseg: 24, hseg: 16, ao: 0.15 });
    m.sphere(1, { radii: [hr * 0.66, hr * 0.5, hr * 0.68], at: [0, hc.y - hr * 0.55, hc.z + hr * 0.3], bone: BONE('Head'), color: skin, ao: 0.15 });
    m.sphere(1, { radii: [hr * 0.15, hr * 0.13, hr * 0.17], at: [0, hc.y - hr * 0.1, hc.z + hr * 1.0], bone: BONE('Head'), color: skin, ao: 0.1 }); // mũi
    m.sphere(1, { radii: [hr * 0.13, hr * 0.2, hr * 0.1], at: [hr * 0.95, hc.y - hr * 0.05, hc.z - hr * 0.05], bone: BONE('Head'), color: skin, mirror: true, ao: 0.1 }); // tai
  }
  if (has('head') && S.face) faceFeatures(ctx);
  // ---- tay ----
  if (has('arms')) {
    const ac = col(S.arm, skin), fc = col(S.forearm, ac), hc2 = col(S.hand, skin);
    const rS = S.armR * H;
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? 1 : -1;
      const dirs = ctx.armDirs[side];
      const Sp = [sg * shoulder.x, shoulder.y, shoulder.z];
      const Ep = dirs.E.toArray(), Wp = dirs.W.toArray(), Tp = dirs.T.toArray();
      const U = BONE('UpperArm' + side), F = BONE('Forearm' + side), Hd = BONE('Hand' + side);
      m.limb(Sp, Ep, [[0, 0.7 * rS], [0.1, 1.2 * rS], [0.4, 1.12 * rS], [0.78, 0.9 * rS], [1, 0.82 * rS]], { bone: U, color: ac, ao: 0.3, seg: 12,
        blend: { b1: U, b2: F, from: Sp, to: Ep, t0: 0.6, t1: 1, w0: 0, w1: 0.5 } });
      m.sphere(rS * 1.32, { at: Sp, bone: U, color: ac });
      m.sphere(rS * 0.95, { at: Ep, bone: U, color: fc, blend: { b1: U, b2: F, from: Sp, to: Wp, t0: 0.4, t1: 0.6, w0: 0, w1: 1 } });
      m.limb(Ep, Wp, [[0, 0.82 * rS], [0.2, 0.96 * rS], [0.5, 0.86 * rS], [0.85, 0.66 * rS], [1, 0.58 * rS]], { bone: F, color: fc, ao: 0.3, seg: 12,
        blend: { b1: U, b2: F, from: Ep, to: Wp, t0: 0, t1: 0.35, w0: 0.5, w1: 1 } });
      const hp = [Wp[0] * 0.2 + Tp[0] * 0.8, Wp[1] * 0.2 + Tp[1] * 0.8, Wp[2] * 0.2 + Tp[2] * 0.8];
      m.sphere(1, { radii: [S.handR * H * 0.9, S.handR * H, S.handR * H * 0.85], at: hp, bone: Hd, color: hc2 });
    }
  }
  // ---- chân ----
  if (has('legs')) {
    const tc = col(S.thigh, S.pelvis), sc = col(S.shin, tc);
    const rL = S.legR * H;
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1;
      const T = BONE('Thigh' + sd), Sh = BONE('Shin' + sd), F = BONE('Foot' + sd);
      const hp = [sg * S.legOut * H * 0.95, hips, 0], kn = [sg * lx, y(0.265), kneeZ], an = [sg * lx, y(0.05), 0];
      m.limb(hp, kn, [[0, 0.95 * rL], [0.2, 1.22 * rL], [0.55, 1.05 * rL], [1, 0.82 * rL]], { bone: T, color: tc, seg: 14, ao: 0.28,
        blend: { b1: T, b2: Sh, from: hp, to: kn, t0: 0.65, t1: 1, w0: 0, w1: 0.5 } });
      m.sphere(rL * 0.86, { at: kn, bone: T, color: sc, blend: { b1: T, b2: Sh, from: hp, to: an, t0: 0.45, t1: 0.55, w0: 0, w1: 1 } });
      m.limb(kn, an, [[0, 0.84 * rL], [0.2, 0.98 * rL], [0.45, 0.9 * rL], [0.85, 0.62 * rL], [1, 0.58 * rL]], { bone: Sh, color: sc, seg: 14, ao: 0.28,
        blend: { b1: T, b2: Sh, from: kn, to: an, t0: 0, t1: 0.3, w0: 0.5, w1: 1 } });
      if (has('feet')) {
        m.sphere(1, { radii: [rL * 0.86, y(0.034), y(S.footL)], at: [sg * lx, y(0.03), y(0.032)], bone: F, color: S.boot, wseg: 14 });
        m.cyl(rL * 0.72, rL * 0.64, y(0.075), { at: [sg * lx, y(0.085), 0], bone: F, color: col(S.bootTop, S.boot), seg: 12 });
      }
    }
  }
  return ctx;
}

/** Mắt, mày, môi đơn giản; đủ để ở màn trưng bày thấy mặt có hồn. */
export function faceFeatures(ctx, o = {}) {
  const { m, hr, hc, S } = ctx;
  const ex = hr * 0.34, ey = hc.y + hr * 0.02, ez = hc.z + hr * 0.86;
  if (o.closedEyes) {
    m.box(hr * 0.26, hr * 0.03, hr * 0.03, { at: [ex, ey, ez + hr * 0.08], rot: [0, 0, -6], bone: BONE('Head'), color: S.eye, mirror: true, flat: false });
  } else {
    m.sphere(1, { radii: [hr * 0.12, hr * 0.17, hr * 0.07], at: [ex, ey, ez + hr * 0.02], bone: BONE('Head'), color: o.eyeColor || S.eye, mirror: true, ao: 0 });
    m.sphere(1, { radii: [hr * 0.04, hr * 0.05, hr * 0.03], at: [ex + hr * 0.03, ey + hr * 0.06, ez + hr * 0.08], bone: BONE('Head'), color: '#ffffff', mirror: true, ao: 0 });
  }
  m.box(hr * 0.3, hr * 0.04, hr * 0.04, { at: [ex, ey + hr * 0.26, ez - hr * 0.03], rot: [0, 0, o.browTilt ?? -8], bone: BONE('Head'), color: o.brow || S.brow, mirror: true, flat: false });
  m.box(hr * 0.22, hr * 0.035, hr * 0.03, { at: [0, hc.y - hr * 0.5, ez - hr * 0.06], bone: BONE('Head'), color: o.lip || S.lip, flat: false });
}
