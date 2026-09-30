// Tiểu Ảnh — Cậu Bé Rối Giấy
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, leaf, handPos, flap, spike, band } from '../parts.mjs';
const C = { skin: '#f0c9a8', paper: '#f7f1e3', red: '#d64a3a', dark: '#2a2a3a', hair: '#26202a', blue: '#4a78c8' };
export default {
  name: 'Tiểu Ảnh', glow: '#ffd0c0', palette: ['#f7f1e3', '#d64a3a', '#2a2a3a', '#4a78c8'], rim: '#ff8a7a',
  hitTime: { Attack1: 0.25, Attack2: 0.25 },
  anim: { style: { atk1: 'jabR', atk2: 'jabL', cast1: 'pushR', cast2: 'sweep2', ult: 'spin' }, run: { amp: 40, arm: 0.9, lean: 12 }, idle: 'calm', moveSpeed: 330, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.5, headS: 1.3, shoulder: 0.15, chestW: 0.12, chestD: 0.08, waistW: 0.1, hipW: 0.11, armR: 0.03, legR: 0.042, skin: C.skin, top: C.paper, pelvis: C.blue, thigh: C.blue, shin: C.skin, boot: C.dark, arm: C.paper, forearm: C.skin, hand: C.skin, armL: 'down', armR_: 'ready', handR: 0.034 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.0, hr * 1.05], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.15], bone: head, color: C.hair });
    for (let i = 0; i < 7; i++) spike(m, { at: [(i - 3) * hr * 0.28, hc.y + hr * 1.0, hc.z], len: hr * 0.55, r: hr * 0.13, rot: [0, 0, (i - 3) * -16], bone: head, color: C.hair, seg: 5 });
    m.cone(hr * 0.9, hr * 0.5, { at: [0, hc.y + hr * 1.35, hc.z], bone: head, color: C.paper, seg: 8 });  // mũ giấy
    m.torus(hr * 0.9, hr * 0.06, { at: [0, hc.y + hr * 1.12, hc.z], rot: [90, 0, 0], bone: head, color: C.red, seg: 16 });
    const sp = [[0, y(0.79), -0.06], [0.02, y(0.7), -0.16], [-0.02, y(0.6), -0.24]];
    const sb = swayChain(m, chest, 'Scarf', sp.slice(1)); ribbon(m, sb, sp, [0.1, 0.13, 0.12], { color: C.red, color2: '#f08a7a' });
    m.torus(0.06, 0.022, { at: [0, y(0.795), 0], rot: [80, 0, 0], bone: chest, color: C.red });
    flap(m, 'Vest', { at: [0, -0.09], top: y(0.55), bottom: y(0.36), wTop: 0.2, wBot: 0.26, color: C.blue, color2: '#2a4a88' });
    // phi tiêu giấy lớn sau lưng và phân thân giấy nhỏ
    m.extrude([[0, 0.3], [0.08, 0.08], [0.3, 0], [0.08, -0.08], [0, -0.3], [-0.08, -0.08], [-0.3, 0], [-0.08, 0.08]], 0.008, { at: [0, y(0.66), -0.14], rot: [-10, 0, 20], bone: chest, color: C.paper, color2: C.red, bevel: false });
    const hp = handPos(ctx, 'R');
    m.extrude([[0, 0.12], [0.03, 0.03], [0.12, 0], [0.03, -0.03], [0, -0.12], [-0.03, -0.03], [-0.12, 0], [-0.03, 0.03]], 0.006, { at: [hp[0], hp[1] + 0.02, hp[2] + 0.06], rot: [80, 0, 0], bone: BONE('HandR'), color: C.paper, color2: C.red, bevel: false });
    for (const [x, z] of [[0.55, 0.15], [-0.6, 0.1]]) { m.sphere(1, { radii: [0.1, 0.12, 0.05], at: [x, 1.0, z], bone: BONE('Root'), color: C.paper, ao: 0.1 }); m.box(0.16, 0.26, 0.03, { at: [x, 0.78, z], bone: BONE('Root'), color: C.blue }); }
    return ctx;
  },
};
