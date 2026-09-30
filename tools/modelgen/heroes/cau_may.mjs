// Cầu Mây — Chàng Đá Cầu Xóm Đình
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, leaf, orient, spike, band } from '../parts.mjs';
const C = { skin: '#d9a47a', shirt: '#fafafa', short: '#2d6fd6', trim: '#ffd23a', hair: '#1e1a1a', shoe: '#d9412f', scarf: '#c8412f', feather: '#f5f1e2' };
export default {
  name: 'Cầu Mây', glow: '#8fe0b0', palette: ['#fafafa', '#2d6fd6', '#ffd23a', '#d9412f'], rim: '#6fd6a0',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'shoot', atk2: 'shoot', cast1: 'jabR', cast2: 'shoot', ult: 'raise2' }, run: { amp: 40, arm: 0.9, lean: 12 }, idle: 'calm', moveSpeed: 320, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.78, headS: 1.03, shoulder: 0.16, chestW: 0.132, waistW: 0.095, hipW: 0.108, armR: 0.028, legR: 0.043, skin: C.skin, top: C.shirt, pelvis: C.short, thigh: C.skin, shin: C.skin, boot: C.shoe, bootTop: C.shirt, arm: C.skin, forearm: C.skin, hand: C.skin, armL: 'down', armR_: 'down' });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.03, hr * 1.02, hr * 1.04], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.15], bone: head, color: C.hair });
    for (let i = 0; i < 5; i++) spike(m, { at: [(i - 2) * hr * 0.3, hc.y + hr * 0.95, hc.z + hr * 0.1], len: hr * 0.5, r: hr * 0.13, rot: [20, 0, (i - 2) * -14], bone: head, color: C.hair, seg: 5 });
    m.torus(hr * 1.02, hr * 0.06, { at: [0, hc.y + hr * 0.5, hc.z - hr * 0.02], rot: [90, 0, 0], bone: head, color: C.trim, seg: 20 });
    const sp = [[0, y(0.79), -0.06], [0.04, y(0.7), -0.18], [-0.03, y(0.6), -0.3], [0.03, y(0.5), -0.4]];
    const sb = swayChain(m, chest, 'Scarf', sp.slice(1)); ribbon(m, sb, sp, [0.1, 0.13, 0.13, 0.11], { color: C.scarf, color2: '#f08a7a' });
    m.torus(0.06, 0.024, { at: [0, y(0.795), 0], rot: [80, 0, 0], bone: chest, color: C.scarf });
    m.torus(0.112, 0.022, { at: [0, y(0.53), 0], rot: [90, 0, 0], bone: hips, color: C.trim, seg: 16 });
    // cánh sếu (lông vũ) trên lưng, hiện rõ dưới 35% máu
    for (const s of ['L']) for (let i = 0; i < 5; i++) leaf(m, { at: [0.08, y(0.7) - i * 0.03, -0.14], len: 0.5 - i * 0.04, w: 0.11, rot: orient([0.9 + i * 0.1, 0.5 - i * 0.18, -0.4]), color: i % 2 ? C.feather : '#d8e8d0', bone: chest, mirror: true, thick: 0.01 });
    // quả cầu mây: đế xu + lông vũ, bay bên chân phải
    const bx = -0.2, by = 0.48, bz = 0.42;
    m.cyl(0.03, 0.03, 0.012, { at: [bx, by, bz], bone: BONE('ThighR'), color: '#c9a24a', seg: 12 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; leaf(m, { at: [bx, by + 0.01, bz], len: 0.13, w: 0.045, rot: orient([Math.sin(a) * 0.35, 1, Math.cos(a) * 0.35]), color: i % 2 ? C.feather : '#ff9a4a', bone: BONE('ThighR'), thick: 0.006 }); }
    return ctx;
  },
};
