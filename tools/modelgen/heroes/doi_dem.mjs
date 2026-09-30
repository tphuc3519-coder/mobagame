// Dơi Đêm — Kẻ Săn Bằng Tiếng Vọng (09 §4.8)
import { humanoid, BONE, faceFeatures } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, along, place, orient, orientZ, band, spike, curve } from '../parts.mjs';

const C = { skin: '#e2d2e8', hair: '#1b1330', hair2: '#5a3fc0', cloak: '#2e2352', cloak2: '#150e2a', violet: '#8a5dff', lav: '#d6c8ff', dark: '#0a0712', gold: '#d9b25a', tunic: '#1f1636' };

export default {
  name: 'Dơi Đêm', glow: '#9a6bff',
  palette: ['#1b1330', '#7a4dff', '#c9b6ff', '#0a0712'], rim: '#9a6bff',
  hitTime: { Attack1: 0.22, Attack2: 0.24 },
  anim: { style: { atk1: 'jabR', atk2: 'slashL', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' }, run: { hold: 'L', amp: 38, arm: 0.8, bob: 0.02, lean: 13 }, idle: 'sneak', moveSpeed: 340, swayAmp: 11 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.85, headS: 1.0, shoulder: 0.155, chestW: 0.128, chestD: 0.078, waistW: 0.09, hipW: 0.108, armR: 0.025, legR: 0.038, legOut: 0.05,
      skin: C.skin, top: C.tunic, pelvis: C.dark, thigh: C.tunic, shin: C.dark, boot: C.dark, bootTop: C.tunic, arm: C.tunic, forearm: C.cloak2, hand: C.skin,
      armL: 'down', armR_: 'ready', handR: 0.028, face: false, brow: '#0a0712',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    faceFeatures(ctx, { closedEyes: true, lip: '#8a5a7a', brow: '#0a0712', browTilt: 10 });
    // — tóc đen tím, mái xéo, gai sau gáy —
    m.sphere(1, { radii: [hr * 1.04, hr * 1.06, hr * 1.06], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.14], bone: head, color: C.hair, color2: C.hair2, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 0.7, hr * 0.28, hr * 0.42], at: [hr * 0.18, hc.y + hr * 0.74, hc.z + hr * 0.62], rot: [-12, 0, -14], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 0.5, hr * 0.26, hr * 0.38], at: [-hr * 0.4, hc.y + hr * 0.66, hc.z + hr * 0.66], rot: [-10, 0, 20], bone: head, color: C.hair });
    for (let i = 0; i < 6; i++) spike(m, { at: [(i - 2.5) * hr * 0.26, hc.y + hr * (0.75 - Math.abs(i - 2.5) * 0.06), hc.z - hr * 0.55], len: hr * 0.9, r: hr * 0.13, rot: [-125 - i % 2 * 12, 0, (i - 2.5) * -12], bone: head, color: C.hair, seg: 5 });
    dangle(m, head, 'Lock', [hr * 0.86, hc.y - hr * 0.1, hc.z + hr * 0.1], { len: 0.28, n: 2, drift: [0.03, 0], r0: 0.03, r1: 0.006, color: C.hair });
    for (const s of [1, -1]) {
      m.cyl(0.004, 0.004, 0.06, { at: [s * (hr * 0.98), hc.y - hr * 0.3, hc.z - hr * 0.05], bone: head, color: C.gold });
      m.sphere(0.017, { at: [s * (hr * 0.98), hc.y - hr * 0.46, hc.z - hr * 0.05], bone: head, color: C.gold });
    }
    // — cổ áo cao viền cánh dơi, áo choàng vảy —
    for (const s of ['L']) {
      const poly = [[0, 0], [0.11, 0.03], [0.19, 0.22], [0.11, 0.13], [0.09, 0.31], [0.03, 0.16], [-0.02, 0.1]];
      m.extrude(poly, 0.018, { at: [0.09, y(0.79), -0.05 + ctx.zs(0.79)], rot: [-10, -20, -8], bone: chest, color: C.cloak, color2: C.violet, mirror: true, bevel: false, ao: 0.2 });
    }
    const cp = [[0, y(0.79), -0.1], [0, y(0.66), -0.19], [0, y(0.5), -0.25], [0, y(0.36), -0.28], [0, y(0.2), -0.29]];
    const cb = swayChain(m, chest, 'Cape', cp.slice(1));
    ribbon(m, cb, cp, [0.3, 0.46, 0.56, 0.62, 0.66], { color: C.cloak, color2: C.cloak2 });
    for (let i = 0; i < 6; i++) m.cone(0.055, 0.15, { at: [(i - 2.5) * 0.12, y(0.2) - 0.06, -0.29], rot: [180, 0, 0], bone: cb[4], color: C.cloak2, seg: 5 });
    m.box(0.02, 0.5, 0.012, { at: [0.15, y(0.55), 0.12 + ctx.zs(0.55)], rot: [0, 0, 6], bone: chest, color: C.violet, glow: true, mirror: true, ao: 0 });
    m.torus(0.1, 0.022, { at: [0, y(0.54), 0], rot: [90, 0, 0], bone: hips, color: C.violet, seg: 18 });
    m.panel(0.2, 0.26, 0.42, { at: [0, y(0.54) - 0.21, 0.1], bone: hips, color: C.cloak, color2: C.cloak2 });
    // — móng vuốt dài tay phải, chuông đồng tay trái, vòng sóng âm —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    const dR = ctx.armDirs.R; const dirR = [dR.T.x - dR.W.x, dR.T.y - dR.W.y, dR.T.z - dR.W.z];
    for (let k = -1; k <= 1; k++) {
      const base = place(dirR, along(hp, dirR, 0.03), [k * 0.03, 0, 0]);
      m.seg(base, along(base, dirR, 0.3 - Math.abs(k) * 0.04), 0.012, 0.002, { bone: HR, color: C.lav, color2: C.violet, seg: 4, noCap0: true, noCap1: true });
    }
    band(m, dR.E.toArray(), dR.W.toArray(), 0.6, 0.4, 0.033, { bone: BONE('ForearmR'), color: C.cloak });
    for (const [r, k] of [[0.12, 0.5], [0.2, 0.75], [0.3, 1.0]]) m.torus(r, 0.008, { at: place(dirR, hp, [0, k, 0]), rot: orientZ(dirR), bone: HR, color: C.violet, glow: true, ao: 0, seg: 22 });
    const hl = handPos(ctx, 'L'), HL = BONE('HandL');
    m.cyl(0.004, 0.004, 0.16, { at: [hl[0], hl[1] - 0.09, hl[2]], bone: HL, color: C.gold });
    m.lathe([[0.001, -0.07], [0.055, -0.06], [0.07, 0.0], [0.05, 0.05], [0.02, 0.075], [0.001, 0.08]], { at: [hl[0], hl[1] - 0.24, hl[2]], rot: [180, 0, 0], bone: HL, color: C.gold, color2: '#8a6a2a', seg: 12 });
    m.sphere(0.018, { at: [hl[0], hl[1] - 0.3, hl[2]], bone: HL, color: C.violet, glow: true, ao: 0 });
    // — bầy dơi nhỏ quanh người —
    const bat = [[0, 0], [0.09, 0.035], [0.15, -0.02], [0.12, 0.05], [0.18, 0.03], [0.13, 0.1], [0.06, 0.06], [0, 0.08]];
    for (const [x, yy, z, r] of [[0.45, 1.75, 0.2, 20], [-0.5, 1.3, 0.1, -25], [0.35, 0.9, -0.3, 10]]) {
      m.extrude(bat, 0.008, { at: [x, yy, z], rot: [-70, r, 0], bone: BONE('Root'), color: C.hair2, color2: C.cloak2, mirror: false, bevel: false });
      m.extrude(bat.map(([a, b]) => [-a, b]), 0.008, { at: [x, yy, z], rot: [-70, r, 0], bone: BONE('Root'), color: C.hair2, color2: C.cloak2, bevel: false });
      m.sphere(1, { radii: [0.025, 0.02, 0.03], at: [x, yy, z], bone: BONE('Root'), color: C.cloak2 });
    }
    return ctx;
  },
};
