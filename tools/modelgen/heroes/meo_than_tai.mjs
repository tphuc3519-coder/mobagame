// Mèo Thần Tài — Mèo Vẫy Tay Chiêu Tài
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, tube, leaf, handPos, orient, orientZ, band, spike } from '../parts.mjs';
const C = { fur: '#f0c45a', fur2: '#c99a34', gold: '#f0c040', red: '#d63a30', dark: '#241818', blue: '#3a78c8' };
export default {
  name: 'Mèo Thần Tài', glow: '#ffd23a', palette: ['#f0c45a', '#f0c040', '#d63a30', '#3a78c8'], rim: '#f0c040',
  hitTime: { Attack1: 0.25, Attack2: 0.25 },
  anim: { style: { atk1: 'chopR', atk2: 'chopL', cast1: 'push2', cast2: 'raise2', ult: 'raise2' }, run: { amp: 32, arm: 0.8, lean: 6, bob: 0.03 }, idle: 'calm', moveSpeed: 310, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.35, headS: 1.6, shoulder: 0.19, chestW: 0.19, chestD: 0.14, waistW: 0.19, hipW: 0.17, armR: 0.045, legR: 0.055, legOut: 0.06, skin: C.fur, top: C.fur, pelvis: C.fur, thigh: C.fur, shin: C.fur, boot: C.fur2, arm: C.fur, forearm: C.fur, hand: C.fur, armL: 'down', armR_: 'raised', handR: 0.055, face: false, brow: C.dark });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // mặt mèo: mắt, mũi, râu, tai
    for (const s of [1, -1]) {
      m.cone(hr * 0.32, hr * 0.6, { at: [s * hr * 0.6, hc.y + hr * 1.0, hc.z - hr * 0.1], rot: [-8, 0, s * -18], bone: head, color: C.fur, seg: 6 });
      m.cone(hr * 0.18, hr * 0.4, { at: [s * hr * 0.6, hc.y + hr * 0.95, hc.z], rot: [-8, 0, s * -18], bone: head, color: '#f0a0a0', seg: 6 });
      m.sphere(1, { radii: [hr * 0.15, hr * 0.2, hr * 0.06], at: [s * hr * 0.4, hc.y + hr * 0.1, hc.z + hr * 0.92], bone: head, color: C.dark, ao: 0 });
      m.sphere(hr * 0.05, { at: [s * hr * 0.4 + 0.01, hc.y + hr * 0.18, hc.z + hr * 0.98], bone: head, color: '#fff', ao: 0 });
      for (let k = -1; k <= 1; k++) m.cyl(0.003, 0.003, hr * 0.9, { at: [s * hr * 0.85, hc.y - hr * 0.3 + k * hr * 0.12, hc.z + hr * 0.8], rot: [0, 0, 90 - k * 8 * s], bone: head, color: C.dark, seg: 3 });
    }
    m.sphere(1, { radii: [hr * 0.12, hr * 0.08, hr * 0.08], at: [0, hc.y - hr * 0.1, hc.z + hr * 1.0], bone: head, color: '#e88080', ao: 0 });
    m.box(hr * 0.3, hr * 0.03, hr * 0.03, { at: [0, hc.y - hr * 0.32, hc.z + hr * 0.96], bone: head, color: C.dark, flat: false, ao: 0 });
    m.torus(hr * 0.95, hr * 0.06, { at: [0, hc.y - hr * 0.95, hc.z + hr * 0.1], rot: [90, 0, 0], bone: head, color: C.red, seg: 20 });   // vòng cổ
    m.sphere(hr * 0.2, { at: [0, hc.y - hr * 1.05, hc.z + hr * 0.95], bone: head, color: C.gold });    // chuông
    // nén vàng (thỏi) đội đầu
    m.extrude([[-0.16, 0], [0.16, 0], [0.1, 0.1], [-0.1, 0.1]], 0.12, { at: [0, hc.y + hr * 1.12, hc.z], rot: [0, 90, 0], bone: head, color: '#ffd84a', color2: '#c9a020', bevel: false });
    // túi bụng và đồng vàng ngực
    m.panel(0.24, 0.3, 0.3, { at: [0, y(0.6), 0.17], bone: chest, color: C.red, color2: '#a02820', weights: (p) => [[chest, 1]] });
    m.cyl(0.1, 0.1, 0.02, { at: [0, y(0.72), 0.16], rot: [90, 0, 0], bone: chest, color: C.gold, seg: 16 });
    m.box(0.05, 0.05, 0.03, { at: [0, y(0.72), 0.175], bone: chest, color: '#8a6a10' });
    // đuôi mèo
    const tp = [[0, y(0.5), -0.15], [0, y(0.48), -0.3], [0, y(0.6), -0.4], [0, y(0.78), -0.36]];
    const tb = swayChain(m, hips, 'Tail', tp.slice(1)); tube(m, tb, tp, [0.05, 0.05, 0.045, 0.02], { color: C.fur, color2: C.fur2 });
    // đồng hồ cát nhỏ ở tay trái
    const hl = handPos(ctx, 'L');
    m.cyl(0.05, 0.05, 0.02, { at: [hl[0], hl[1] - 0.06, hl[2]], rot: [90, 0, 0], bone: BONE('HandL'), color: C.gold });
    m.cyl(0.045, 0.045, 0.01, { at: [hl[0], hl[1] - 0.06, hl[2] + 0.012], rot: [90, 0, 0], bone: BONE('HandL'), color: '#bfe8ff', glow: true, ao: 0 });
    return ctx;
  },
};
