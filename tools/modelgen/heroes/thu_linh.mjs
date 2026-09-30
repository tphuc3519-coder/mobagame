// Thư Linh — Nàng Sách Cổ
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, orientZ, band, flap, spike } from '../parts.mjs';
const C = { skin: '#f2d6c0', robe: '#2a5aa8', robe2: '#1a3a78', pale: '#e8f0ff', hair: '#22203a', gold: '#d9b25a', page: '#f6ecd0', glyph: '#7ad0ff' };
export default {
  name: 'Thư Linh', glow: '#7ad0ff', palette: ['#2a5aa8', '#7ad0ff', '#f6ecd0', '#d9b25a'], rim: '#7ad0ff',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'pushR', atk2: 'pushL', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' }, run: { amp: 30, arm: 0.4, lean: 6, hold: 'both' }, idle: 'float', moveSpeed: 315, swayAmp: 9 },
  build(id) {
    const ctx = humanoid(id, { H: 1.7, headS: 1.07, shoulder: 0.148, chestW: 0.118, waistW: 0.082, hipW: 0.105, armR: 0.023, legR: 0.036, skin: C.skin, top: C.robe, pelvis: C.robe2, thigh: C.robe2, shin: C.robe2, boot: C.pale, arm: C.robe, forearm: C.skin, hand: C.skin, armL: 'front2', armR_: 'front2', brow: '#4a4a66', eye: '#2a4a88' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.06, hr * 1.05], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.15], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.3, hr * 0.44], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    dangle(m, head, 'Hair', [0, hc.y, hc.z - hr * 1.0], { len: 0.75, n: 3, drift: [0, -0.1], r0: 0.09, r1: 0.01, color: C.hair, color2: '#3a3860' });
    m.seg([hr * 0.5, hc.y + hr * 1.0, hc.z - hr * 0.4], [hr * 1.5, hc.y + hr * 1.9, hc.z - hr * 0.6], 0.012, 0.008, { bone: head, color: C.gold });   // bút cài tóc
    m.cone(0.02, 0.09, { at: [hr * 1.55, hc.y + hr * 1.97, hc.z - hr * 0.6], rot: [0, 0, -40], bone: head, color: '#111', seg: 5 });
    flap(m, 'DressF', { at: [0, 0.1], top: y(0.52), bottom: y(0.14), wTop: 0.2, wBot: 0.3, color: C.robe, color2: C.pale });
    flap(m, 'DressB', { at: [0, -0.1], top: y(0.52), bottom: y(0.14), wTop: 0.24, wBot: 0.34, color: C.robe2, color2: C.robe });
    m.torus(0.096, 0.024, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 16 });
    m.box(0.02, 0.5, 0.012, { at: [0.05, y(0.66), 0.1], rot: [0, 0, 8], bone: chest, color: C.gold, flat: false, ao: 0 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; m.seg(d.E.toArray(), d.W.toArray(), 0.045, 0.1, { bone: BONE('Forearm' + sd), color: C.robe, color2: C.pale, noCap0: true, noCap1: true, seg: 12 }); }
    // cuốn sách cổ mở lơ lửng, vòng chữ phát sáng
    const hl = handPos(ctx, 'L'), hr2 = handPos(ctx, 'R');
    const bx = (hl[0] + hr2[0]) / 2, by = (hl[1] + hr2[1]) / 2 + 0.08, bz = (hl[2] + hr2[2]) / 2 + 0.2;
    const B = chest;
    for (const s of [1, -1]) {
      m.box(0.24, 0.02, 0.32, { at: [bx + s * 0.12, by, bz], rot: [-25, 0, s * -12], bone: B, color: C.page, color2: '#e0d0a0', flat: false });
      m.box(0.25, 0.012, 0.33, { at: [bx + s * 0.12, by - 0.012, bz], rot: [-25, 0, s * -12], bone: B, color: '#5a2a2a', flat: false });
    }
    for (let i = 0; i < 5; i++) m.box(0.16, 0.003, 0.012, { at: [bx - 0.12, by + 0.012, bz - 0.1 + i * 0.05], rot: [-25, 0, 12], bone: B, color: C.glyph, glow: true, flat: false, ao: 0 });
    m.torus(0.28, 0.008, { at: [bx, by + 0.12, bz], rot: [70, 0, 0], bone: B, color: C.glyph, glow: true, ao: 0, seg: 32 });
    m.torus(0.42, 0.006, { at: [bx, by + 0.12, bz], rot: [60, 0, 20], bone: B, color: C.glyph, glow: true, ao: 0, seg: 32 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; m.box(0.03, 0.05, 0.004, { at: [bx + Math.cos(a) * 0.28, by + 0.12 + Math.sin(a) * 0.1, bz + Math.sin(a) * 0.2], bone: B, color: C.pale, glow: true, ao: 0 }); }
    return ctx;
  },
};
