// Phù Đổng — Chàng Trai Ngựa Sắt
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, handPos, along, place, orient, pauldron, band, flap, spike } from '../parts.mjs';
const C = { skin: '#c88a5a', iron: '#5a5e6a', iron2: '#2a2c34', gold: '#c9a24a', red: '#c8302a', fire: '#ff6a2a', ice: '#a8e0ff', hair: '#1a1414' };
export default {
  name: 'Phù Đổng', glow: '#ff7a2a', palette: ['#5a5e6a', '#ff6a2a', '#c9a24a', '#c8302a'], rim: '#ff7a3a',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'chopR', atk2: 'swingR', cast1: 'pushR', cast2: 'push2', ult: 'leapSlam' }, run: { hold: 'R', amp: 32, arm: 0.5, lean: 10 }, idle: 'heavy', moveSpeed: 325, swayAmp: 7 },
  build(id) {
    const ctx = humanoid(id, { H: 2.2, headS: 0.86, shoulder: 0.2, chestW: 0.19, chestD: 0.12, waistW: 0.14, hipW: 0.15, armR: 0.046, legR: 0.055, skin: C.skin, top: C.iron, pelvis: C.iron2, thigh: C.iron, shin: C.iron2, boot: C.iron2, bootTop: C.iron, arm: C.iron, forearm: C.iron2, hand: C.iron2, armL: 'ready', armR_: 'ready', handR: 0.05, brow: '#1a1010' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.1, hr * 0.9, hr * 1.12], at: [0, hc.y + hr * 0.35, hc.z - hr * 0.05], bone: head, color: C.iron, color2: C.iron2, wseg: 16, hseg: 12 });   // mũ sắt
    m.box(hr * 0.12, hr * 0.7, hr * 1.4, { at: [0, hc.y + hr * 1.3, hc.z - hr * 0.1], bone: head, color: C.red, flat: false });
    for (let i = 0; i < 3; i++) spike(m, { at: [0, hc.y + hr * 1.5, hc.z + (i - 1) * hr * 0.4], len: hr * 0.7, r: hr * 0.15, rot: [(i - 1) * 25, 0, 0], bone: head, color: C.gold, seg: 5 });
    pauldron(m, ctx, 'L', { r: 0.17, color: C.iron, trim: C.gold, spikes: 3 }); pauldron(m, ctx, 'R', { r: 0.17, color: C.iron, trim: C.gold, spikes: 3 });
    m.sphere(1, { radii: [0.19, 0.16, 0.08], at: [0, y(0.7), 0.13], bone: chest, color: C.iron, color2: '#7a7e8a' });   // giáp ngực tròn
    m.torus(0.1, 0.02, { at: [0, y(0.7), 0.2], bone: chest, color: C.gold, seg: 18 });
    flap(m, 'SkirtF', { at: [0, 0.14], top: y(0.5), bottom: y(0.25), wTop: 0.3, wBot: 0.36, color: C.iron2, color2: C.red });
    const cp = [[0, y(0.79), -0.12], [0, y(0.6), -0.2], [0, y(0.4), -0.24]];
    const cb = swayChain(m, chest, 'Cape', cp.slice(1)); ribbon(m, cb, cp, [0.34, 0.44, 0.5], { color: C.red, color2: '#8a1a14' });
    m.torus(0.16, 0.03, { at: [0, y(0.545), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 18 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.5, 0.5, 0.062, { bone: BONE('Forearm' + sd), color: C.iron, color2: '#7a7e8a' }); }
    // roi sắt dài, lưỡi lửa; ngọn lửa và băng ở hai tay
    const hp = handPos(ctx, 'R'), HR = BONE('HandR'); const dir = [-0.05, 1, 0.25];
    m.seg(along(hp, dir, -0.3), along(hp, dir, 1.0), 0.03, 0.03, { bone: HR, color: C.iron, color2: '#8a8e9a' });
    m.sphere(1, { radii: [0.13, 0.17, 0.13], at: along(hp, dir, 1.1), bone: HR, color: '#ff8a3a', glow: true, ao: 0 });
    for (let i = 0; i < 5; i++) spike(m, { at: place(dir, along(hp, dir, 1.1), [Math.cos(i * 1.26) * 0.1, 0.08, Math.sin(i * 1.26) * 0.1]), len: 0.22, r: 0.05, rot: orient([Math.cos(i * 1.26), 1.5, Math.sin(i * 1.26)]), bone: HR, color: '#ffb84a', glow: true, seg: 5 });
    const hl = handPos(ctx, 'L');
    m.sphere(0.1, { at: [hl[0], hl[1] + 0.1, hl[2] + 0.06], bone: BONE('HandL'), color: C.ice, glow: true, ao: 0 });
    for (let i = 0; i < 5; i++) spike(m, { at: [hl[0] + Math.cos(i * 1.26) * 0.09, hl[1] + 0.14, hl[2] + 0.06 + Math.sin(i * 1.26) * 0.09], len: 0.16, r: 0.03, rot: orient([Math.cos(i * 1.26), 1.2, Math.sin(i * 1.26)]), bone: BONE('HandL'), color: '#e8f8ff', glow: true, seg: 4 });
    return ctx;
  },
};
