// Bà Năm Chảo — Bà Nội Trợ Xóm Chợ
import { humanoid, BONE } from '../humanoid.mjs';
import { dangle, handPos, along, place, orient, band, flap } from '../parts.mjs';
const C = { skin: '#e8b892', top: '#8a3a52', pants: '#2a2a34', apron: '#f2ead8', iron: '#2b2b30', iron2: '#55555c', wood: '#8a5a34', hair: '#2a2024', red: '#e04a5a' };
export default {
  name: 'Bà Năm Chảo', glow: '#ff9a8a', palette: ['#8a3a52', '#f2ead8', '#2b2b30', '#e04a5a'], rim: '#ff7a8a',
  hitTime: { Attack1: 0.26, Attack2: 0.26 },
  anim: { style: { atk1: 'chopR', atk2: 'jabL', cast1: 'push2', cast2: 'roar', ult: 'leapSlam' }, run: { hold: 'R', amp: 36, arm: 0.5, lean: 10 }, idle: 'heavy', moveSpeed: 335, swayAmp: 8 },
  build(id) {
    const ctx = humanoid(id, { H: 1.6, headS: 1.12, shoulder: 0.17, chestW: 0.15, chestD: 0.1, waistW: 0.135, hipW: 0.15, armR: 0.034, legR: 0.045, skin: C.skin, top: C.top, pelvis: C.pants, thigh: C.pants, shin: C.pants, boot: C.wood, arm: C.top, forearm: C.skin, hand: C.skin, armL: 'ready', armR_: 'raised', handR: 0.036 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), hips = BONE('Hips'), chest = BONE('Chest');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.0, hr * 1.05], at: [0, hc.y + hr * 0.14, hc.z - hr * 0.15], bone: head, color: C.hair });
    m.sphere(hr * 0.55, { at: [0, hc.y + hr * 1.0, hc.z - hr * 0.3], bone: head, color: C.hair });
    for (const s of [1, -1]) m.cyl(hr * 0.14, hr * 0.14, hr * 0.6, { at: [s * hr * 0.9, hc.y + hr * 0.3, hc.z + hr * 0.1], rot: [0, 0, 90], bone: head, color: C.red });  // lô uốn tóc
    m.box(hr * 0.5, hr * 0.06, hr * 0.06, { at: [hr * 0.34, hc.y + hr * 0.3, hc.z + hr * 0.9], rot: [0, 0, -22], bone: head, color: '#111', mirror: true, flat: false }); // mày cau
    m.panel(0.3, 0.42, 0.62, { at: [0, y(0.53) - 0.31, 0.14], bone: hips, color: C.apron, color2: '#d8ccb0', weights: (p) => [[hips, 1]] });
    m.panel(0.22, 0.26, 0.3, { at: [0, y(0.72) - 0.1, 0.13], bone: chest, color: C.apron });
    m.torus(0.15, 0.03, { at: [0, y(0.545), 0], rot: [90, 0, 0], bone: hips, color: C.red, seg: 16 });
    flap(m, 'Skirt', { at: [0, -0.12], top: y(0.5), bottom: y(0.25), wTop: 0.3, wBot: 0.38, color: C.pants, color2: '#3a3a48' });
    // chảo lớn ở tay phải, dép ở tay trái
    const hp = handPos(ctx, 'R'), HR = BONE('HandR'); const dir = [-0.15, 1, 0.4];
    m.seg(along(hp, dir, -0.12), along(hp, dir, 0.4), 0.022, 0.02, { bone: HR, color: C.wood });
    const top = along(hp, dir, 0.55), rot = orient(dir);
    m.cyl(0.24, 0.2, 0.05, { at: top, rot: [rot[0] + 90 * 0, rot[1], rot[2]], bone: HR, color: C.iron, color2: C.iron2, seg: 16 });
    m.torus(0.245, 0.02, { at: place(dir, top, [0, 0.03, 0]), rot: [rot[0] + 0, rot[1], rot[2]], bone: HR, color: C.iron2, seg: 16, arc: 0.01 });
    const hl = handPos(ctx, 'L');
    m.sphere(1, { radii: [0.07, 0.022, 0.15], at: [hl[0], hl[1] - 0.02, hl[2] + 0.05], rot: [0, 20, 0], bone: BONE('HandL'), color: '#d9c04a' });
    return ctx;
  },
};
