// Kép Chèo — Ông Kép Múa Hài
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, orient, band, flap, spike } from '../parts.mjs';
const C = { skin: '#f6ece0', red: '#c8302a', gold: '#f0c040', green: '#2a8a5a', blue: '#2a5ac8', black: '#181418', paint: '#d0202a', white: '#ffffff' };
export default {
  name: 'Kép Chèo', glow: '#ffe066', palette: ['#c8302a', '#f0c040', '#2a8a5a', '#181418'], rim: '#f0c040',
  hitTime: { Attack1: 0.25, Attack2: 0.25 },
  anim: { style: { atk1: 'jabR', atk2: 'jabL', cast1: 'sweep2', cast2: 'push2', ult: 'roar' }, run: { amp: 36, arm: 1.0, lean: 8, twist: 8 }, idle: 'float', moveSpeed: 325, swayAmp: 12 },
  build(id) {
    const ctx = humanoid(id, { H: 1.8, headS: 1.06, shoulder: 0.16, chestW: 0.132, waistW: 0.1, hipW: 0.115, armR: 0.028, legR: 0.041, skin: C.skin, top: C.red, pelvis: C.blue, thigh: C.blue, shin: C.blue, boot: C.gold, bootTop: C.black, arm: C.red, forearm: C.gold, hand: C.skin, armL: 'wide', armR_: 'ready', brow: C.black });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    for (const [dx, dy, r] of [[0.32, 0.12, -10], [0.5, -0.1, 30], [0.2, 0.35, 0]]) m.box(hr * 0.35, hr * 0.06, hr * 0.03, { at: [dx * hr, hc.y + dy * hr, hc.z + hr * 0.95], rot: [0, 0, r], bone: head, color: C.paint, mirror: true, flat: false, ao: 0 });
    m.sphere(1, { radii: [hr * 1.04, hr * 0.6, hr * 1.05], at: [0, hc.y + hr * 0.4, hc.z - hr * 0.1], bone: head, color: C.black });
    m.lathe([[hr * 0.95, 0], [hr * 0.9, hr * 0.6], [hr * 0.3, hr * 1.1], [0.001, hr * 1.2]], { at: [0, hc.y + hr * 0.6, hc.z], bone: head, color: C.gold, color2: C.red, seg: 16 });   // mũ
    for (let i = 0; i < 3; i++) m.cyl(0.006, 0.006, 0.5, { at: [(i - 1) * 0.08, hc.y + hr * 2.0, hc.z - 0.08], rot: [0, 0, (i - 1) * -20], bone: head, color: i % 2 ? C.green : C.paint }); // lông trĩ
    m.sphere(0.03, { at: [-0.16, hc.y + hr * 2.55, hc.z - 0.08], bone: head, color: C.green });
    m.sphere(0.03, { at: [0.16, hc.y + hr * 2.55, hc.z - 0.08], bone: head, color: C.paint });
    const cp = [[0, y(0.79), -0.08], [0, y(0.6), -0.16], [0, y(0.4), -0.2]];
    const cb = swayChain(m, chest, 'Cape', cp.slice(1)); ribbon(m, cb, cp, [0.28, 0.36, 0.42], { color: C.green, color2: C.gold });
    flap(m, 'SkirtF', { at: [0, 0.1], top: y(0.52), bottom: y(0.2), wTop: 0.2, wBot: 0.34, color: C.red, color2: C.gold });
    m.torus(0.115, 0.03, { at: [0, y(0.55), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 18 });
    // tay áo múa dài (thuỷ tụ)
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; const sgn = sd === 'L' ? 1 : -1; const sp = [d.W.toArray(), [d.W.x + sgn * 0.12, d.W.y - 0.15, d.W.z + 0.05], [d.W.x + sgn * 0.2, d.W.y - 0.4, d.W.z + 0.1]]; const bb = swayChain(m, BONE('Hand' + sd), 'Sleeve' + sd, sp.slice(1)); ribbon(m, bb, sp, [0.1, 0.15, 0.2], { color: C.white, color2: C.red }); }
    return ctx;
  },
};
