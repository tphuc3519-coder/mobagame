// Hoa Độc — Nàng Sen Đầm Độc (09 §4.11)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, tube, dangle, leaf, handPos, along, place, orient, orientZ, band, helix, spike } from '../parts.mjs';

const C = { skin: '#f0cdb9', pink: '#b24f8f', pink2: '#f6c6e0', violet: '#5a2a5a', green: '#6bd36b', green2: '#3a8a4a', dark: '#2a1a2e', hair: '#3a1f4a', hair2: '#6a3a7a' };

export default {
  name: 'Hoa Độc', glow: '#9dff9d',
  palette: ['#b24f8f', '#6bd36b', '#2a1a2e', '#f6c6e0'], rim: '#6bd36b',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'pushR', atk2: 'pushL', cast1: 'push2', cast2: 'sweep2', ult: 'raise2' }, run: { hold: 'R', amp: 32, arm: 0.5, bob: 0.016, lean: 8 }, idle: 'calm', moveSpeed: 315, swayAmp: 9 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.68, headS: 1.08, shoulder: 0.148, chestW: 0.115, chestD: 0.07, waistW: 0.08, hipW: 0.104, armR: 0.022, legR: 0.034, legOut: 0.047,
      skin: C.skin, top: C.pink, pelvis: C.violet, thigh: C.skin, shin: C.skin, boot: C.green2, bootTop: C.skin, arm: C.skin, forearm: C.skin, hand: C.skin,
      armL: 'down', armR_: 'ready', handR: 0.025, brow: '#2a1a2e', eye: '#2c8a3c',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // mắt xanh lục phát sáng
    m.sphere(1, { radii: [hr * 0.09, hr * 0.13, hr * 0.05], at: [hr * 0.34, hc.y + hr * 0.02, hc.z + hr * 0.93], bone: head, color: '#b8ffb8', glow: true, mirror: true, ao: 0 });
    // — tóc, nhụy sen, trâm cánh sen —
    m.sphere(1, { radii: [hr * 1.04, hr * 1.06, hr * 1.06], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.16], bone: head, color: C.hair, color2: C.hair2, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 0.98, hr * 0.3, hr * 0.44], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 0.2, hr * 0.7, hr * 0.3], at: [hr * 0.9, hc.y - hr * 0.2, hc.z + hr * 0.05], bone: head, color: C.hair, mirror: true });
    dangle(m, head, 'Hair', [0, hc.y - hr * 0.1, hc.z - hr * 1.0], { len: 0.85, n: 3, drift: [0, -0.1], r0: 0.09, r1: 0.012, color: C.hair, color2: C.hair2 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, bx = Math.sin(a) * hr * 0.4, bz = Math.cos(a) * hr * 0.3;
      m.seg([bx * 0.5, hc.y + hr * 1.0, hc.z + bz * 0.5 - hr * 0.3], [bx * 1.5, hc.y + hr * 1.55, hc.z + bz - hr * 0.3], 0.006, 0.004, { bone: head, color: C.green2 });
      m.sphere(0.02, { at: [bx * 1.5, hc.y + hr * 1.58, hc.z + bz - hr * 0.3], bone: head, color: '#fff0a0', glow: true, ao: 0 });
    }
    for (let i = 0; i < 5; i++) leaf(m, { at: [hr * 0.6, hc.y + hr * 0.8, hc.z + hr * 0.1], len: 0.13, w: 0.06, rot: [10, i * 25 - 50, -60 + i * 22], color: i % 2 ? C.pink : C.pink2, bone: head, mirror: true });
    // — áo cánh sen, váy cánh sen và lá sen —
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, ax = Math.sin(a), az = Math.cos(a), r = 0.1;
      leaf(m, { at: [ax * r, y(0.545), az * r], len: 0.3, w: 0.13, rot: orient([ax * 0.75, -1, az * 0.75]), color: i % 2 ? C.pink : C.pink2, color2: C.violet, bone: hips, thick: 0.01, bulge: 0.45 });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2, ax = Math.sin(a), az = Math.cos(a), r = 0.13;
      leaf(m, { at: [ax * r, y(0.52), az * r], len: 0.36, w: 0.17, rot: orient([ax * 1.1, -1, az * 1.1]), color: C.green2, color2: C.green, bone: hips, thick: 0.01, bulge: 0.55 });
    }
    m.torus(0.1, 0.022, { at: [0, y(0.548), 0], rot: [90, 0, 0], bone: hips, color: C.green2, seg: 16 });
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) leaf(m, { at: [s * (ctx.shoulder.x + 0.0 + i * 0.02), ctx.shoulder.y + 0.03, ctx.shoulder.z], len: 0.16, w: 0.08, rot: orient([s * (0.7 + i * 0.4), -0.6, 0.1]), color: i % 2 ? C.pink : C.pink2, bone: BONE('UpperArm' + (s > 0 ? 'L' : 'R')) });
    // — dây leo quấn tay —
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      helix(m, d.E.toArray(), d.W.toArray(), 0.034, 2.5, 14, 0.007, { bone: BONE('Forearm' + sd), color: C.green2 });
      helix(m, ctx.shoulder.clone().setX((sd === 'L' ? 1 : -1) * ctx.shoulder.x).toArray(), d.E.toArray(), 0.04, 2, 12, 0.007, { bone: BONE('UpperArm' + sd), color: C.green });
      leaf(m, { at: d.W.toArray(), len: 0.09, w: 0.04, rot: [30, 0, sd === 'L' ? -40 : 40], color: C.green, bone: BONE('Forearm' + sd) });
    }
    // — búp sen phát sáng trên tay phải —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    m.sphere(1, { radii: [0.065, 0.085, 0.065], at: [hp[0], hp[1] + 0.12, hp[2] + 0.03], bone: HR, color: '#ffd0f0', glow: true, ao: 0 });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; leaf(m, { at: [hp[0] + Math.sin(a) * 0.045, hp[1] + 0.08, hp[2] + 0.03 + Math.cos(a) * 0.045], len: 0.17, w: 0.075, rot: orient([Math.sin(a) * 0.55, 1, Math.cos(a) * 0.55]), color: i % 2 ? C.pink : C.pink2, bone: HR, thick: 0.008, bulge: 0.5 }); }
    m.cone(0.06, 0.06, { at: [hp[0], hp[1] + 0.06, hp[2] + 0.03], rot: [180, 0, 0], bone: HR, color: C.green2 });
    // sương độc/bào tử
    for (const [x, yy, z] of [[0.3, 1.2, 0.3], [-0.35, 1.0, 0.15], [0.2, 1.5, -0.3], [-0.2, 0.7, 0.4]]) m.sphere(0.03, { at: [x, yy, z], bone: BONE('Root'), color: '#a6ffa6', glow: true, ao: 0 });
    return ctx;
  },
};
