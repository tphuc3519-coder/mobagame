// Lưỡng Cực — Đạo Sĩ Âm Dương
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, orientZ, band, flap } from '../parts.mjs';
const C = { skin: '#e8cdb0', white: '#f4f4f0', black: '#16161e', gold: '#d9b25a', blue: '#6a7aff', red: '#ff5a6a', hair: '#141418' };
export default {
  name: 'Lưỡng Cực', glow: '#8a7aff', palette: ['#f4f4f0', '#16161e', '#6a7aff', '#ff5a6a'], rim: '#8a7aff',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'pushR', atk2: 'pushL', cast1: 'pushL', cast2: 'pushR', ult: 'sweep2' }, run: { amp: 30, arm: 0.5, lean: 6 }, idle: 'float', moveSpeed: 315, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.85, headS: 1.02, shoulder: 0.158, chestW: 0.128, waistW: 0.092, hipW: 0.108, armR: 0.026, legR: 0.038, skin: C.skin, top: C.white, pelvis: C.black, thigh: C.black, shin: C.black, boot: C.white, bootTop: C.black, arm: C.black, forearm: C.white, hand: C.skin, armL: 'ready', armR_: 'ready' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.02, hr * 1.05], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.16], bone: head, color: C.hair });
    m.lathe([[hr * 0.85, 0], [hr * 0.8, hr * 0.5], [hr * 0.6, hr * 1.0], [0.001, hr * 1.05]], { at: [0, hc.y + hr * 0.75, hc.z - hr * 0.05], bone: head, color: C.black, seg: 14 });   // mũ đạo cao
    m.torus(hr * 0.86, hr * 0.05, { at: [0, hc.y + hr * 0.78, hc.z - hr * 0.05], rot: [90, 0, 0], bone: head, color: C.gold, seg: 16 });
    m.sphere(1, { radii: [hr * 0.35, hr * 0.42, hr * 0.06], at: [0, hc.y + hr * 0.6, hc.z + hr * 0.85], bone: head, color: C.white, ao: 0.1 });  // mặt nạ gỗ đội trán
    dangle(m, head, 'Hair', [0, hc.y, hc.z - hr * 1.0], { len: 0.6, n: 2, drift: [0, -0.1], r0: 0.06, r1: 0.008, color: C.hair });
    // áo chia nửa đen trắng, biểu tượng âm dương trước ngực
    flap(m, 'RobeL', { at: [0.08, 0.1], top: y(0.52), bottom: y(0.14), wTop: 0.16, wBot: 0.24, color: C.black, color2: '#3a3a4a' });
    flap(m, 'RobeR', { at: [-0.08, 0.1], top: y(0.52), bottom: y(0.14), wTop: 0.16, wBot: 0.24, color: C.white, color2: '#c8c8d0' });
    flap(m, 'RobeB', { at: [0, -0.11], top: y(0.52), bottom: y(0.12), wTop: 0.3, wBot: 0.4, color: C.white, color2: C.black });
    m.torus(0.1, 0.026, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 16 });
    m.cyl(0.12, 0.12, 0.02, { at: [0, y(0.7), 0.13], rot: [90, 0, 0], bone: chest, color: C.black, seg: 20 });
    m.cyl(0.12, 0.12, 0.012, { at: [0.0, y(0.7), 0.143], rot: [90, 0, 0], bone: chest, color: C.white, seg: 20, open: false });
    m.cyl(0.06, 0.06, 0.014, { at: [0.0, y(0.7) + 0.06, 0.15], rot: [90, 0, 0], bone: chest, color: C.black, seg: 14 });
    m.cyl(0.06, 0.06, 0.014, { at: [0.0, y(0.7) - 0.06, 0.15], rot: [90, 0, 0], bone: chest, color: C.white, seg: 14 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; m.seg(d.E.toArray(), d.W.toArray(), 0.045, 0.1, { bone: BONE('Forearm' + sd), color: sd === 'L' ? C.black : C.white, noCap0: true, noCap1: true, seg: 12 }); }
    // hai quả cầu Âm (đỏ→đen) và Dương (xanh→trắng) trong lòng bàn tay
    const hl = handPos(ctx, 'L'), hr2 = handPos(ctx, 'R');
    m.sphere(0.075, { at: [hl[0], hl[1] + 0.1, hl[2] + 0.04], bone: BONE('HandL'), color: '#7a7aff', glow: true, ao: 0 });
    m.torus(0.11, 0.008, { at: [hl[0], hl[1] + 0.1, hl[2] + 0.04], rot: [70, 0, 0], bone: BONE('HandL'), color: C.blue, glow: true, ao: 0, seg: 22 });
    m.sphere(0.075, { at: [hr2[0], hr2[1] + 0.1, hr2[2] + 0.04], bone: BONE('HandR'), color: '#ff5a6a', glow: true, ao: 0 });
    m.torus(0.11, 0.008, { at: [hr2[0], hr2[1] + 0.1, hr2[2] + 0.04], rot: [70, 0, 0], bone: BONE('HandR'), color: C.red, glow: true, ao: 0, seg: 22 });
    for (const [x, yy, z, c] of [[0.5, 1.5, 0.1, '#7a7aff'], [-0.5, 1.1, 0.2, '#ff5a6a'], [0.35, 0.8, -0.35, '#7a7aff']]) m.sphere(0.05, { at: [x, yy, z], bone: BONE('Root'), color: c, glow: true, ao: 0 });
    return ctx;
  },
};
