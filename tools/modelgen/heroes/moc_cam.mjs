// Mộc Cầm — Nhạc Sư Đàn Tranh (09 §4.16)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, along, place, orient, band, curve, flap } from '../parts.mjs';
import { smooth } from '../kit.mjs';

const C = { skin: '#e8c9a8', robe: '#7a5c44', robe2: '#5a4030', tea: '#a08060', cream: '#e9d8a6', jade: '#7ad3c6', dark: '#2d2a32', wood: '#8a5a34', wood2: '#5a3820', gold: '#d4b06a', hair: '#1c1a20' };

export default {
  name: 'Mộc Cầm', glow: '#7ad3c6',
  palette: ['#6b4f3a', '#e9d8a6', '#7ad3c6', '#2d2a32'], rim: '#7ad3c6',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'pluck', atk2: 'pluck', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' }, run: { amp: 30, arm: 0.45, bob: 0.014, lean: 7, hold: 'both' }, idle: 'float', moveSpeed: 315, swayAmp: 8 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.82, headS: 1.03, shoulder: 0.152, chestW: 0.122, chestD: 0.078, waistW: 0.09, hipW: 0.108, armR: 0.025, legR: 0.038, legOut: 0.048,
      skin: C.skin, top: C.robe, pelvis: C.robe2, thigh: C.robe2, shin: C.robe2, boot: C.dark, bootTop: C.robe2, arm: C.robe, forearm: C.skin, hand: C.skin,
      armL: 'front2', armR_: 'front2', handR: 0.027, brow: '#2a2a30', eye: '#2a2a34',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — khăn đóng, tóc mai —
    m.sphere(1, { radii: [hr * 1.02, hr * 0.98, hr * 1.02], at: [0, hc.y + hr * 0.08, hc.z - hr * 0.2], bone: head, color: C.hair, wseg: 14, hseg: 10 });
    m.sphere(1, { radii: [hr * 0.16, hr * 0.5, hr * 0.26], at: [hr * 0.9, hc.y - hr * 0.1, hc.z + hr * 0.05], bone: head, color: C.hair, mirror: true });
    m.lathe([[hr * 1.04, 0], [hr * 1.08, hr * 0.3], [hr * 1.02, hr * 0.7], [hr * 0.86, hr * 1.05], [hr * 0.66, hr * 1.15], [0.001, hr * 1.2]], { at: [0, hc.y + hr * 0.42, hc.z - hr * 0.05], bone: head, color: C.dark, color2: '#45404f', seg: 18, ao: 0.25 });
    m.torus(hr * 1.06, hr * 0.05, { at: [0, hc.y + hr * 0.6, hc.z - hr * 0.05], rot: [90, 0, 0], bone: head, color: C.gold, seg: 20 });
    m.sphere(hr * 0.1, { at: [0, hc.y + hr * 0.62, hc.z + hr * 1.0], bone: head, color: C.jade, glow: true, ao: 0 });
    dangle(m, head, 'Tail', [0, hc.y + hr * 0.15, hc.z - hr * 1.02], { len: 0.55, n: 2, drift: [0, -0.06], r0: 0.045, r1: 0.008, color: C.hair });
    // — áo the dài màu trà —
    const yTop = y(0.575), swR = BONE('SwayRobe1');
    m.joint(swR, hips, 0, y(0.4), 0);
    const secs = [{ y: 0.03, rx: 0.3, rz: 0.26 }, { y: y(0.09), rx: 0.27, rz: 0.24 }, { y: y(0.22), rx: 0.22, rz: 0.2 }, { y: y(0.36), rx: 0.18, rz: 0.16 }, { y: y(0.48), rx: 0.145, rz: 0.125 }, { y: yTop + 0.03, rx: 0.108, rz: 0.09 }];
    const wf = (p) => { const w = 0.7 * (1 - smooth(y(0.06), y(0.5), p.y)); return w < 0.01 ? [[hips, 1]] : [[hips, 1 - w], [swR, w]]; };
    m.loft(secs, { bone: hips, color: C.robe, color2: C.robe2, seg: 20, ao: 0.3, weights: wf });
    m.torus(0.3, 0.02, { at: [0, 0.035, 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 24, weights: () => [[hips, 0.3], [swR, 0.7]] });
    m.torus(0.108, 0.03, { at: [0, y(0.57), 0], rot: [90, 0, 0], bone: hips, color: C.cream, seg: 18 });
    m.box(0.02, 0.6, 0.012, { at: [0.045, y(0.62), 0.098 + ctx.zs(0.62)], rot: [0, 0, -12], bone: chest, color: C.cream, flat: false, ao: 0 });
    m.box(0.02, 0.4, 0.012, { at: [-0.05, y(0.72), 0.098 + ctx.zs(0.72)], rot: [0, 0, 22], bone: chest, color: C.cream, flat: false, ao: 0 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; m.seg(d.E.toArray(), d.W.toArray(), 0.05, 0.13, { bone: BONE('Forearm' + sd), color: C.robe, color2: C.cream, noCap0: true, noCap1: true, seg: 12, ao: 0.2 }); }
    // — đàn tranh lơ lửng, dây phát sáng —
    const hl = handPos(ctx, 'L'), hrp = handPos(ctx, 'R');
    const cx = 0, cy = (hl[1] + hrp[1]) / 2 - 0.09, cz = (hl[2] + hrp[2]) / 2 + 0.16;
    const CH = BONE('Chest');
    m.box(1.45, 0.07, 0.32, { at: [cx, cy, cz], bone: CH, color: C.wood, color2: C.wood2, flat: false, ao: 0.2 });
    m.box(1.45, 0.02, 0.34, { at: [cx, cy + 0.045, cz], bone: CH, color: '#b07a44', flat: false });
    m.box(0.06, 0.12, 0.34, { at: [-0.74, cy - 0.01, cz], bone: CH, color: C.wood2 });
    m.box(0.06, 0.12, 0.34, { at: [0.74, cy - 0.01, cz], bone: CH, color: C.wood2 });
    m.torus(0.17, 0.02, { at: [-0.76, cy, cz], rot: [0, 90, 0], arc: Math.PI, bone: CH, color: C.gold, seg: 12 });
    for (let i = 0; i < 13; i++) {
      const z = cz - 0.135 + i * 0.0225;
      m.box(1.36, 0.004, 0.004, { at: [-0.02, cy + 0.063, z], bone: CH, color: C.jade, glow: true, ao: 0, flat: false });
      m.cyl(0.011, 0.013, 0.05, { at: [-0.55 + i * 0.075, cy + 0.075, z], bone: CH, color: C.cream, seg: 6 });
      m.sphere(0.008, { at: [0.7, cy + 0.056, z], bone: CH, color: C.gold });
    }
    m.torus(0.02, 0.006, { at: [0.68, cy - 0.08, cz - 0.14], bone: CH, color: C.gold });
    // nốt nhạc phát sáng và lá tre rơi
    for (const [x, yy, z, s] of [[0.5, 1.25, 0.55, 1], [-0.4, 1.5, 0.5, 0.8], [0.15, 1.75, 0.6, 1.1], [0.7, 1.55, 0.2, 0.9]]) {
      m.sphere(1, { radii: [0.034 * s, 0.026 * s, 0.02 * s], at: [x, yy, z], bone: BONE('Root'), color: C.jade, glow: true, ao: 0 });
      m.cyl(0.005 * s, 0.005 * s, 0.13 * s, { at: [x + 0.03 * s, yy + 0.065 * s, z], bone: BONE('Root'), color: C.jade, glow: true, ao: 0, seg: 4 });
      m.box(0.05 * s, 0.014 * s, 0.006, { at: [x + 0.05 * s, yy + 0.125 * s, z], rot: [0, 0, -20], bone: BONE('Root'), color: C.jade, glow: true, ao: 0, flat: false });
    }
    for (const [x, yy, z, r] of [[-0.5, 1.0, 0.3, 30], [0.6, 0.8, -0.2, -40], [-0.3, 1.9, -0.1, 10]]) leaf(m, { at: [x, yy, z], len: 0.16, w: 0.04, rot: [30, r, r * 2], color: '#9bc98a', bone: BONE('Root') });
    return ctx;
  },
};
