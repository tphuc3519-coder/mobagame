// Bóng Đèn — Nghệ Nhân Rối Bóng
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, along, orient, band, flap, spike } from '../parts.mjs';
const C = { skin: '#d8b8a0', cloak: '#3a2a5a', cloak2: '#1a1230', hair: '#14101c', lamp: '#ffb85a', leather: '#b8763a', dark: '#0e0a18', violet: '#8a6aff' };
export default {
  name: 'Bóng Đèn', glow: '#ffb85a', palette: ['#3a2a5a', '#ffb85a', '#b8763a', '#0e0a18'], rim: '#b08aff',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'pushR', atk2: 'pushL', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' }, run: { amp: 30, arm: 0.5, lean: 8 }, idle: 'sneak', moveSpeed: 315, swayAmp: 11 },
  build(id) {
    const ctx = humanoid(id, { H: 1.72, headS: 1.04, shoulder: 0.15, chestW: 0.115, waistW: 0.082, hipW: 0.1, armR: 0.023, legR: 0.035, skin: C.skin, top: C.cloak, pelvis: C.cloak2, thigh: C.cloak2, shin: C.cloak2, boot: C.dark, arm: C.cloak, forearm: C.cloak2, hand: C.skin, armL: 'ready', armR_: 'ready' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.05, hr * 1.02, hr * 1.06], at: [0, hc.y + hr * 0.2, hc.z - hr * 0.15], bone: head, color: C.hair });
    m.box(hr * 1.4, hr * 0.22, hr * 0.08, { at: [0, hc.y + hr * 0.08, hc.z + hr * 0.9], bone: head, color: C.dark, flat: false });  // mặt nạ mắt
    m.sphere(1, { radii: [hr * 0.11, hr * 0.07, hr * 0.04], at: [hr * 0.34, hc.y + hr * 0.08, hc.z + hr * 0.98], bone: head, color: C.lamp, glow: true, mirror: true, ao: 0 });
    m.cyl(0.01, 0.01, 0.2, { at: [0, hc.y + hr * 1.3, hc.z], bone: head, color: C.leather });   // đèn nhỏ trên đầu
    m.lathe([[0.001, -0.05], [0.05, -0.03], [0.06, 0.0], [0.04, 0.05], [0.001, 0.07]], { at: [0, hc.y + hr * 1.3 + 0.18, hc.z], bone: head, glow: true, color: '#ffe6b0', color2: C.lamp, seg: 10, ao: 0 });
    const cp = [[0, y(0.79), -0.09], [0, y(0.6), -0.18], [0, y(0.42), -0.22], [0, y(0.24), -0.22]];
    const cb = swayChain(m, chest, 'Cloak', cp.slice(1)); ribbon(m, cb, cp, [0.3, 0.4, 0.46, 0.5], { color: C.cloak, color2: C.cloak2 });
    flap(m, 'Skirt', { at: [0, 0.1], top: y(0.5), bottom: y(0.22), wTop: 0.2, wBot: 0.3, color: C.cloak2, color2: C.cloak });
    m.torus(0.1, 0.022, { at: [0, y(0.55), 0], rot: [90, 0, 0], bone: hips, color: C.leather, seg: 16 });
    // rối bóng bằng da: hai tấm hình người trên que tre
    for (const [sd, pal] of [['R', C.leather], ['L', '#a04a3a']]) {
      const hp = handPos(ctx, sd), B = BONE('Hand' + sd);
      m.seg([hp[0], hp[1] - 0.25, hp[2]], [hp[0], hp[1] + 0.55, hp[2]], 0.008, 0.008, { bone: B, color: '#8a6a3a' });
      m.extrude([[-0.1, 0], [0.1, 0], [0.13, 0.3], [0.06, 0.34], [0.07, 0.46], [0, 0.5], [-0.07, 0.46], [-0.06, 0.34], [-0.13, 0.3]], 0.008, { at: [hp[0], hp[1] + 0.3, hp[2]], bone: B, color: pal, color2: '#ffb85a', bevel: false });
      for (const dx of [-0.04, 0.04]) m.sphere(0.014, { at: [hp[0] + dx, hp[1] + 0.68, hp[2] + 0.01], bone: B, color: C.lamp, glow: true, ao: 0 });
    }
    // bóng trôi quanh
    for (const [x, z] of [[0.6, 0.2], [-0.6, 0.3]]) m.extrude([[-0.12, 0], [0.12, 0], [0.16, 0.5], [0.08, 0.6], [0, 0.8], [-0.08, 0.6], [-0.16, 0.5]], 0.006, { at: [x, 0.1, z], rot: [0, x > 0 ? -30 : 30, 0], bone: BONE('Root'), color: '#241a40', color2: '#5a3a9a', bevel: false });
    return ctx;
  },
};
