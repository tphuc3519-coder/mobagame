// Kiếm Thuỷ — Kiếm Sĩ Sông Xanh
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, along, place, orient, band, flap } from '../parts.mjs';
const C = { skin: '#e6c0a0', haori: '#e8f2f0', wave: '#2a9a9a', navy: '#1a3a52', hair: '#2a1e28', steel: '#cfe0ea', blue: '#6ad4ff', gold: '#c9a24a' };
export default {
  name: 'Kiếm Thuỷ', glow: '#6ad4ff', palette: ['#e8f2f0', '#2a9a9a', '#1a3a52', '#6ad4ff'], rim: '#6ad4ff',
  hitTime: { Attack1: 0.24, Attack2: 0.24 },
  anim: { style: { atk1: 'slashR', atk2: 'slashL', cast1: 'slashR', cast2: 'spin', ult: 'slashCombo' }, run: { hold: 'R', amp: 38, arm: 0.8, lean: 13 }, idle: 'calm', moveSpeed: 325, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.85, headS: 1.02, shoulder: 0.16, chestW: 0.13, waistW: 0.095, hipW: 0.11, armR: 0.027, legR: 0.04, skin: C.skin, top: C.navy, pelvis: C.navy, thigh: C.navy, shin: C.navy, boot: C.haori, bootTop: C.navy, arm: C.haori, forearm: C.navy, hand: C.skin, armL: 'down', armR_: 'ready', handR: 0.03 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.02, hr * 1.05], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.16], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.3, hr * 0.44], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    dangle(m, head, 'Tail', [0, hc.y + hr * 0.6, hc.z - hr * 0.8], { len: 0.5, n: 2, drift: [0, -0.15], r0: 0.05, r1: 0.01, color: C.hair });
    m.torus(hr * 1.0, hr * 0.05, { at: [0, hc.y + hr * 0.42, hc.z], rot: [90, 0, 0], bone: head, color: C.wave, seg: 18 });  // băng đô xanh
    // áo khoác trắng viền sóng nước, tà dài
    flap(m, 'CoatF1', { at: [0.09, 0.12], top: y(0.52), bottom: y(0.15), wTop: 0.16, wBot: 0.22, color: C.haori, color2: C.wave });
    flap(m, 'CoatF2', { at: [-0.09, 0.12], top: y(0.52), bottom: y(0.15), wTop: 0.16, wBot: 0.22, color: C.haori, color2: C.wave });
    flap(m, 'CoatB', { at: [0, -0.12], top: y(0.52), bottom: y(0.12), wTop: 0.3, wBot: 0.4, color: C.haori, color2: C.wave });
    for (let i = 0; i < 3; i++) m.torus(0.12 + i * 0.02, 0.008, { at: [0, y(0.6) - i * 0.1, 0.0], rot: [90, 0, 0], arc: 3.0, bone: hips, color: C.wave, seg: 16 });
    m.torus(0.1, 0.024, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 16 });
    m.box(0.02, 0.24, 0.012, { at: [0.05, y(0.72), 0.1], rot: [0, 0, -20], bone: chest, color: C.wave, flat: false, ao: 0 });
    m.box(0.02, 0.24, 0.012, { at: [-0.05, y(0.72), 0.1], rot: [0, 0, 20], bone: chest, color: C.wave, flat: false, ao: 0 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.6, 0.4, 0.036, { bone: BONE('Forearm' + sd), color: C.wave }); }
    // kiếm thẳng lưỡi xanh nước
    const hp = handPos(ctx, 'R'), HR = BONE('HandR'); const dir = [-0.03, 1, 0.14]; const g = along(hp, dir, 0.1); const rot = orient(dir);
    m.seg(along(hp, dir, -0.14), g, 0.017, 0.017, { bone: HR, color: C.navy });
    m.box(0.13, 0.02, 0.03, { at: g, rot, bone: HR, color: C.gold, flat: false });
    m.extrude([[-0.018, 0], [0.018, 0], [0.012, 0.95], [0, 1.02], [-0.012, 0.95]], 0.006, { at: g, rot, bone: HR, color: C.steel, color2: '#eef8ff', bevel: false });
    m.extrude([[-0.005, 0.05], [0.005, 0.05], [0.005, 0.9], [-0.005, 0.9]], 0.009, { at: g, rot, bone: HR, color: C.blue, glow: true, bevel: false, ao: 0 });
    for (const [x, z, r] of [[0.14, 0.1, 0.1], [-0.18, 0.05, 0.08], [0.05, 0.22, 0.08]]) m.sphere(1, { radii: [r, r * 0.6, r], at: [x, 0.05, z], bone: BONE('Root'), color: '#d8f4ff', glow: true, ao: 0 });   // bọt nước quanh chân
    return ctx;
  },
};
