// Hạnh Hoa — Thầy Lang Mai Vàng (tướng gốc, cơ chế port từ autobattle)
import { humanoid, BONE } from '../humanoid.mjs';
import { dangle, leaf, handPos, band, flap, spike } from '../parts.mjs';
const C = { skin: '#f0cdb0', robe: '#f6e9c4', robe2: '#e5c96a', gold: '#f2c14e', brown: '#6b4a2a', hair: '#3a2a22', green: '#7fae5a', red: '#c8412f' };
export default {
  name: 'Hạnh Hoa', glow: '#ffd75e', palette: ['#f6e9c4', '#f2c14e', '#6b4a2a', '#7fae5a'], rim: '#f2c14e',
  hitTime: { Attack1: 0.24, Attack2: 0.24 },
  anim: { style: { atk1: 'jabR', atk2: 'jabL', cast1: 'pushR', cast2: 'raise2', ult: 'raise2' }, run: { amp: 36, arm: 0.8, lean: 10 }, idle: 'calm', moveSpeed: 325, swayAmp: 9 },
  build(id) {
    const ctx = humanoid(id, { H: 1.72, headS: 1.08, shoulder: 0.152, chestW: 0.122, waistW: 0.086, hipW: 0.11, armR: 0.026, legR: 0.038, skin: C.skin, top: C.robe, pelvis: C.robe2, thigh: C.robe, shin: C.robe, boot: C.brown, arm: C.robe, forearm: C.skin, hand: C.skin, armL: 'guard', armR_: 'guard', handR: 0.032 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), hips = BONE('Hips'), chest = BONE('Chest');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.06, hr * 1.05], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.15], bone: head, color: C.hair, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.3, hr * 0.44], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    m.sphere(hr * 0.42, { at: [0, hc.y + hr * 1.05, hc.z - hr * 0.5], bone: head, color: C.hair });
    dangle(m, head, 'Hair', [0, hc.y - hr * 0.1, hc.z - hr * 1.0], { len: 0.6, n: 2, drift: [0, -0.1], r0: 0.06, r1: 0.01, color: C.hair });
    for (let i = 0; i < 6; i++) { const a = i * 60; m.sphere(hr * 0.13, { at: [hr * 0.7 + Math.cos(a) * hr * 0.2, hc.y + hr * 1.1 + Math.sin(a) * hr * 0.2, hc.z - hr * 0.3], bone: head, color: C.gold, glow: true, ao: 0 }); }
    m.seg([hr * 0.6, hc.y + hr * 0.9, hc.z - hr * 0.4], [hr * 1.5, hc.y + hr * 1.6, hc.z - hr * 0.5], 0.01, 0.006, { bone: head, color: C.brown });
    flap(m, 'RobeF', { at: [0, 0.1], top: y(0.52), bottom: y(0.15), wTop: 0.22, wBot: 0.32, color: C.robe, color2: C.robe2 });
    flap(m, 'RobeB', { at: [0, -0.1], top: y(0.52), bottom: y(0.15), wTop: 0.24, wBot: 0.34, color: C.robe2, color2: C.robe });
    m.torus(0.1, 0.025, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.brown, seg: 16 });
    m.sphere(1, { radii: [0.05, 0.075, 0.045], at: [0.13, y(0.5), 0.05], bone: hips, color: C.green });   // bầu thuốc
    m.cyl(0.02, 0.02, 0.04, { at: [0.13, y(0.5) + 0.08, 0.05], bone: hips, color: C.brown });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.65, 0.35, 0.036, { bone: BONE('Forearm' + sd), color: '#ffffff' }); }
    for (const sd of [1, -1]) for (let i = 0; i < 3; i++) m.cyl(0.003, 0.003, 0.13, { at: [sd * 0.05, y(0.72) + i * 0.02, 0.13], rot: [0, 0, 90], bone: chest, color: '#dfe6ee', seg: 4 }); // kim châm
    return ctx;
  },
};
