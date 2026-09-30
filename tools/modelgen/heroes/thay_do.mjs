// Thầy Đồ — Ông Đồ Chữ Nghĩa
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, along, orient, place, band, flap } from '../parts.mjs';
const C = { skin: '#e0b898', robe: '#1e2238', robe2: '#3a4064', hair: '#e8e8ee', gold: '#c9a24a', red: '#b8322a', paper: '#f2e8cc', ink: '#111118' };
export default {
  name: 'Thầy Đồ', glow: '#ffd88a', palette: ['#1e2238', '#c9a24a', '#f2e8cc', '#b8322a'], rim: '#c9a24a',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'swingR', atk2: 'chopR', cast1: 'pushR', cast2: 'raise2', ult: 'raise2' }, run: { hold: 'R', amp: 30, arm: 0.5, lean: 8 }, idle: 'calm', moveSpeed: 320, swayAmp: 8 },
  build(id) {
    const ctx = humanoid(id, { H: 1.75, headS: 1.05, shoulder: 0.15, chestW: 0.12, waistW: 0.095, hipW: 0.108, armR: 0.026, legR: 0.038, skin: C.skin, top: C.robe, pelvis: C.robe, thigh: C.robe, shin: C.robe, boot: C.ink, arm: C.robe, forearm: C.robe2, hand: C.skin, armL: 'front2', armR_: 'ready', brow: '#cfcfd8' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.lathe([[hr * 1.0, 0], [hr * 1.02, hr * 0.5], [hr * 0.9, hr * 0.85], [0.001, hr * 0.9]], { at: [0, hc.y + hr * 0.42, hc.z - hr * 0.05], bone: head, color: C.ink, seg: 16 }); // khăn xếp
    m.torus(hr * 1.0, hr * 0.06, { at: [0, hc.y + hr * 0.5, hc.z - hr * 0.05], rot: [90, 0, 0], bone: head, color: C.gold, seg: 18 });
    dangle(m, head, 'Beard', [0, hc.y - hr * 0.6, hc.z + hr * 0.75], { len: 0.55, n: 2, drift: [0, 0.05], r0: 0.07, r1: 0.01, color: C.hair, color2: '#ffffff' });
    for (const s of [1, -1]) dangle(m, head, 'Brow' + (s > 0 ? 'A' : 'B'), [s * hr * 0.6, hc.y - hr * 0.55, hc.z + hr * 0.7], { len: 0.22, n: 2, drift: [s * 0.03, 0.04], r0: 0.025, r1: 0.006, color: C.hair });
    flap(m, 'RobeF', { at: [0, 0.11], top: y(0.52), bottom: y(0.1), wTop: 0.22, wBot: 0.32, color: C.robe, color2: C.robe2 });
    flap(m, 'RobeB', { at: [0, -0.11], top: y(0.52), bottom: y(0.1), wTop: 0.26, wBot: 0.36, color: C.robe2, color2: C.robe });
    m.torus(0.1, 0.024, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 16 });
    m.box(0.02, 0.5, 0.012, { at: [0.05, y(0.68), 0.1], rot: [0, 0, 8], bone: chest, color: C.gold, flat: false, ao: 0 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; m.seg(d.E.toArray(), d.W.toArray(), 0.045, 0.1, { bone: BONE('Forearm' + sd), color: C.robe, color2: C.robe2, noCap0: true, noCap1: true, seg: 12 }); }
    // bút lông khổng lồ và cuộn giấy sau lưng
    const hp = handPos(ctx, 'R'), HR = BONE('HandR'); const dir = [-0.05, 1, 0.1];
    m.seg(along(hp, dir, -0.4), along(hp, dir, 0.85), 0.017, 0.017, { bone: HR, color: '#7a4a2a', color2: '#4a2a14' });
    m.cone(0.06, 0.34, { at: place(dir, along(hp, dir, 0.85), [0, 0.17, 0]), rot: orient(dir), bone: HR, color: C.ink, color2: '#3a3a4a', seg: 8 });
    m.sphere(0.022, { at: along(hp, dir, -0.42), bone: HR, color: C.gold });
    m.cyl(0.07, 0.07, 0.9, { at: [0, y(0.62), -0.16], rot: [0, 0, 70], bone: chest, color: C.paper, color2: '#c9b98a', seg: 12 });
    for (const sx of [-0.4, 0.42]) m.cyl(0.08, 0.08, 0.03, { at: [sx * 0.9, y(0.62) - 0.15 * (sx > 0 ? -1 : 1) * 0.0, -0.16], bone: chest, color: C.red, rot: [0, 0, 70] });
    return ctx;
  },
};
