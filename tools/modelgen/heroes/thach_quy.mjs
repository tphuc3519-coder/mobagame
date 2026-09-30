// Thạch Quy — Người Gác Đền Rêu Phủ (09 §4.1)
import { humanoid, BONE } from '../humanoid.mjs';
import { dangle, orient, onEllipsoid, pauldron, handPos, band, spike } from '../parts.mjs';

const C = { skin: '#70847a', stone: '#5d6f5f', stone2: '#3f4c40', dark: '#2b2f3a', moss: '#5f8f4a', jade: '#7fd1a8', bronze: '#b8843a', bronze2: '#7a5424', gold: '#c9a24a', root: '#4a5440' };

export default {
  name: 'Thạch Quy', glow: '#5fe0a8',
  palette: ['#4b5a4a', '#7fd1a8', '#c9a24a', '#2b2f3a'], rim: '#7fd1a8',
  hitTime: { Attack1: 0.34, Attack2: 0.3 },
  anim: { style: { atk1: 'smash2', atk2: 'chopR', cast1: 'push2', cast2: 'slam', ult: 'raise2' }, run: { hold: 'R', amp: 26, arm: 0.18, bob: 0.03, lean: 6, twist: 3 }, idle: 'heavy', moveSpeed: 310, swayAmp: 5 },
  build(id) {
    const ctx = humanoid(id, {
      H: 2.5, headS: 0.8, shoulder: 0.215, chestW: 0.205, chestD: 0.15, waistW: 0.175, hipW: 0.18, armR: 0.058, legR: 0.066, legOut: 0.072, hunch: 0.055,
      skin: C.skin, top: C.stone, pelvis: '#4b5a4a', thigh: '#4b5a4a', shin: '#556555', boot: C.dark, bootTop: '#4b5a4a', arm: C.skin, forearm: C.skin, hand: C.skin,
      armL: 'down', armR_: 'ready', handR: 0.06, footL: 0.09, brow: '#22301f', eye: '#12301f', skip: [],
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — đầu đá: mày dày, gai đá, râu rễ —
    m.box(hr * 1.5, hr * 0.22, hr * 0.3, { at: [0, hc.y + hr * 0.24, hc.z + hr * 0.8], rot: [-8, 0, 0], bone: head, color: C.stone, flat: false });
    for (let i = 0; i < 5; i++) spike(m, { at: [(i - 2) * hr * 0.32, hc.y + hr * (1.0 - Math.abs(i - 2) * 0.08), hc.z - hr * 0.1], len: hr * 0.55, r: hr * 0.13, rot: [-10 - Math.abs(i - 2) * 4, 0, (i - 2) * -14], bone: head, color: C.stone2 });
    m.sphere(1, { radii: [hr * 0.09, hr * 0.06, hr * 0.05], at: [hr * 0.33, hc.y + hr * 0.02, hc.z + hr * 0.95], bone: head, color: C.jade, glow: true, mirror: true, ao: 0 });
    for (let i = 0; i < 5; i++) dangle(m, head, 'Beard' + 'ABCDE'[i], [(i - 2) * hr * 0.24, hc.y - hr * 0.78, hc.z + hr * (0.75 - Math.abs(i - 2) * 0.12)], { len: 0.62 - Math.abs(i - 2) * 0.08, n: 3, drift: [(i - 2) * 0.03, 0.06], r0: 0.032, r1: 0.006, color: C.root, color2: '#6b7a55', wave: 0.015 });
    // — mai rùa đá trên lưng: mái vòm, tấm lục giác, vân ngọc, hoa văn trống đồng —
    const sc = [0, y(0.7), -0.36 + ctx.zs(0.7)], rr = [0.66, 0.76, 0.36];
    m.sphere(1, { radii: rr, at: sc, bone: chest, color: C.stone, color2: C.stone2, wseg: 18, hseg: 12, ao: 0.32 });
    m.torus(0.62, 0.05, { at: [0, sc[1] - 0.3, sc[2] + 0.02], rot: [90, 0, 0], bone: chest, color: C.bronze2, seg: 22, rseg: 6 });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const az = (col - 2) * 24 + (row % 2 ? 12 : 0), el = -22 + row * 22;
        if (Math.abs(az) > 62) continue;
        const { p, n } = onEllipsoid(sc, rr, az, el);
        const rot = orient(n);
        m.cyl(0.1, 0.115, 0.05, { at: p, rot, bone: chest, color: '#6f8270', color2: '#55665a', seg: 6, flat: true });
        m.cyl(0.115, 0.13, 0.03, { at: [p[0] - n[0] * 0.02, p[1] - n[1] * 0.02, p[2] - n[2] * 0.02], rot, bone: chest, color: C.jade, glow: true, seg: 6, ao: 0 });
      }
    }
    for (const [R, k] of [[0.1, 0.05], [0.2, 0.05]]) m.torus(R, k, { at: [0, sc[1] + 0.1, sc[2] - rr[2] * 0.93], bone: chest, color: C.gold, seg: 20 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; m.box(0.03, 0.09, 0.03, { at: [Math.sin(a) * 0.15, sc[1] + 0.1 + Math.cos(a) * 0.15, sc[2] - rr[2] * 0.93], rot: [0, 0, -a * 180 / Math.PI], bone: chest, color: C.gold }); }
    for (const [x, yy, z] of [[0.3, 0.9, -0.2], [-0.35, 0.55, -0.24], [0.1, 0.45, -0.28]]) m.sphere(1, { radii: [0.16, 0.06, 0.12], at: [x, sc[1] + yy * 0.4, sc[2] + z * 0.3 - 0.05], bone: chest, color: C.moss, ao: 0.2 });
    // — giáp vai đá rêu, đai đồng, vết nứt ngọc —
    pauldron(m, ctx, 'L', { r: 0.19, color: C.stone, trim: C.bronze, spikes: 0 });
    pauldron(m, ctx, 'R', { r: 0.19, color: C.stone, trim: C.bronze, spikes: 0 });
    m.sphere(1, { radii: [0.15, 0.05, 0.12], at: [0.3, y(0.8) + 0.16, ctx.zs(0.8)], bone: chest, color: C.moss, mirror: true });
    m.torus(0.2, 0.04, { at: [0, y(0.535), 0.0], rot: [90, 0, 0], bone: hips, color: C.bronze2, seg: 20 });
    m.box(0.16, 0.24, 0.03, { at: [0, y(0.47), 0.21], bone: hips, color: C.bronze, color2: C.bronze2 });
    for (const [dx, dy, r] of [[0.1, 0.71, 20], [0.14, 0.66, -25], [-0.09, 0.68, 60], [-0.12, 0.62, -15]]) m.box(0.012, 0.09, 0.012, { at: [dx * H * 0.9, y(dy), 0.19 + ctx.zs(dy)], rot: [0, 0, r], bone: chest, color: C.jade, glow: true, ao: 0 });
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      band(m, d.E.toArray(), d.W.toArray(), 0.45, 0.16, 0.07, { bone: BONE('Forearm' + sd), color: C.bronze });
      band(m, d.E.toArray(), d.W.toArray(), 0.7, 0.03, 0.062, { bone: BONE('Forearm' + sd), color: C.jade, glow: true });
    }
    // — cột đá đền chạm rồng, quấn xích đồng —
    const hp = handPos(ctx, 'R');
    const px = hp[0] - 0.02, pz = hp[2] + 0.02;
    const HR = BONE('HandR');
    m.cyl(0.13, 0.15, 2.7, { at: [px, 1.35, pz], bone: HR, color: '#77887a', color2: '#4d5c50', seg: 10 });
    for (const yy of [0.35, 0.9, 1.45, 2.0, 2.4]) m.torus(0.145, 0.028, { at: [px, yy, pz], rot: [90, 0, 0], bone: HR, color: C.bronze, seg: 16 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 * 2, yy = 0.4 + (i / 12) * 1.9;
      m.torus(0.03, 0.012, { at: [px + Math.sin(a) * 0.152, yy, pz + Math.cos(a) * 0.152], rot: [a * 40, a * 57 + 90, 0], bone: HR, color: C.bronze2, seg: 8 });
    }
    m.cyl(0.19, 0.14, 0.14, { at: [px, 2.76, pz], bone: HR, color: C.stone, seg: 10 });
    m.sphere(1, { radii: [0.22, 0.12, 0.22], at: [px, 2.86, pz], bone: HR, color: '#77887a', wseg: 12, hseg: 8 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; spike(m, { at: [px + Math.sin(a) * 0.14, 2.83, pz + Math.cos(a) * 0.14], len: 0.16, r: 0.04, rot: [Math.cos(a) * 55, 0, -Math.sin(a) * 55], bone: HR, color: C.jade, glow: true }); }
    m.cyl(0.19, 0.19, 0.06, { at: [px, 0.02, pz], bone: HR, color: C.stone2 });
    return ctx;
  },
};
