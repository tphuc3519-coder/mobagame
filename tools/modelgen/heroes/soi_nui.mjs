// Sói Núi — Kẻ Tru Dưới Trăng (09 §4.6)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, tube, dangle, curve, handPos, along, place, orient, pauldron, band, spike } from '../parts.mjs';

const C = { fur: '#8f929c', fur2: '#5a5d68', furL: '#c2c5ce', dark: '#3a3d48', leather: '#5a3a2a', bone: '#e6dcc0', eye: '#ffcc33', blood: '#a33a2a', steel: '#b5bcc9', nose: '#1a1a20' };

export default {
  name: 'Sói Núi', glow: '#ffd23a',
  palette: ['#8c8f99', '#3a3d48', '#ffcc33', '#a33a2a'], rim: '#ffcc33',
  hitTime: { Attack1: 0.22, Attack2: 0.22 },
  anim: { style: { atk1: 'jabR', atk2: 'jabL', cast1: 'roar', cast2: 'slashR', ult: 'roar', showcase: 'roar' }, run: { amp: 40, arm: 0.9, bob: 0.03, lean: 16, twist: 8 }, idle: 'sneak', moveSpeed: 335, swayAmp: 8 },
  build(id) {
    const ctx = humanoid(id, {
      H: 2.05, headS: 0.92, shoulder: 0.19, chestW: 0.175, chestD: 0.11, waistW: 0.115, hipW: 0.13, armR: 0.042, legR: 0.05, legOut: 0.058, hunch: 0.05,
      skin: C.fur, top: C.fur, pelvis: C.dark, thigh: C.fur2, shin: C.fur, boot: C.fur2, bootTop: C.fur, arm: C.fur, forearm: C.fur, hand: C.fur2,
      armL: 'ready', armR_: 'ready', handR: 0.05, face: false, skip: ['head'], footL: 0.095, neckR: 0.042,
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — đầu sói —
    const z0 = hc.z;
    m.sphere(1, { radii: [hr * 0.98, hr * 0.98, hr * 1.08], at: [0, hc.y, z0 + hr * 0.05], bone: head, color: C.fur, color2: C.fur2, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 0.44, hr * 0.38, hr * 0.9], at: [0, hc.y - hr * 0.22, z0 + hr * 1.05], rot: [8, 0, 0], bone: head, color: C.furL, wseg: 14, hseg: 10 });
    m.sphere(1, { radii: [hr * 0.36, hr * 0.22, hr * 0.8], at: [0, hc.y - hr * 0.62, z0 + hr * 1.0], rot: [-6, 0, 0], bone: head, color: C.furL, color2: C.fur, wseg: 12, hseg: 8 });
    m.sphere(1, { radii: [hr * 0.15, hr * 0.12, hr * 0.13], at: [0, hc.y - hr * 0.08, z0 + hr * 1.85], bone: head, color: C.nose, ao: 0 });
    for (let i = 0; i < 4; i++) m.cone(hr * 0.045, hr * 0.2, { at: [(i - 1.5) * hr * 0.16, hc.y - hr * 0.48, z0 + hr * (1.55 - Math.abs(i - 1.5) * 0.1)], rot: [180, 0, 0], bone: head, color: '#f4f0e4', seg: 5 });
    m.sphere(1, { radii: [hr * 0.15, hr * 0.11, hr * 0.06], at: [hr * 0.42, hc.y + hr * 0.2, z0 + hr * 0.95], rot: [0, -20, -15], bone: head, color: C.eye, glow: true, mirror: true, ao: 0 });
    m.box(hr * 0.42, hr * 0.06, hr * 0.06, { at: [hr * 0.42, hc.y + hr * 0.42, z0 + hr * 0.98], rot: [0, -15, 24], bone: head, color: C.dark, mirror: true, flat: false });
    for (const [h2, s] of [[hr * 1.0, 1], [hr * 0.8, 0.6]]) void s, h2;
    m.cone(hr * 0.34, hr * 0.95, { at: [hr * 0.6, hc.y + hr * 1.0, z0 - hr * 0.1], rot: [-8, 0, -14], bone: head, color: C.fur, color2: C.fur2, mirror: true, seg: 6 });
    m.cone(hr * 0.2, hr * 0.7, { at: [hr * 0.6, hc.y + hr * 0.95, z0 + hr * 0.0], rot: [-8, 0, -14], bone: head, color: '#7a4a4a', mirror: true, seg: 6 });
    // — bờm dày quanh cổ và vai —
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, R = 0.2 + (i % 2) * 0.03;
      const cx = Math.sin(a) * R, cz = Math.cos(a) * R * 0.8 + ctx.zs(0.8) - 0.02;
      m.cone(0.05, 0.3 + (i % 3) * 0.05, { at: [cx, y(0.79) + 0.03, cz], rot: [Math.cos(a) * 60 + 20, 0, -Math.sin(a) * 60], bone: chest, color: i % 2 ? C.furL : C.fur, color2: C.fur2, seg: 5 });
    }
    // — giáp da thú và xương —
    m.seg([-0.24, y(0.78), 0.06 + ctx.zs(0.78)], [0.2, y(0.52), 0.15], 0.04, 0.04, { bone: chest, color: C.leather, noCap0: true, noCap1: true, scale: [1, 1, 0.25], seg: 8, ao: 0.1, weights: (p) => (p.y > y(0.62) ? [[chest, 1]] : [[hips, 1]]) });
    pauldron(m, ctx, 'R', { r: 0.125, color: C.leather, trim: C.bone, spikes: 4, squash: 0.6 });
    m.sphere(1, { radii: [0.15, 0.09, 0.14], at: [0.28, y(0.8) + 0.06, ctx.zs(0.8)], bone: BONE('UpperArmL'), color: C.fur2 });
    for (let i = 0; i < 5; i++) m.cone(0.02, 0.07, { at: [(i - 2) * 0.05, y(0.75) - Math.abs(i - 2) * 0.012, 0.14 + ctx.zs(0.75)], rot: [180, 0, 0], bone: chest, color: C.bone, seg: 5 });
    m.torus(0.15, 0.03, { at: [0, y(0.535), 0], rot: [90, 0, 0], bone: hips, color: C.leather, seg: 18 });
    for (let i = 0; i < 7; i++) { const a = (i / 7 - 0.5) * 2.4; m.panel(0.06, 0.05, 0.22, { at: [Math.sin(a) * 0.17, y(0.5) - 0.12, Math.cos(a) * 0.15], rot: [0, a * 57, 0], bone: hips, color: C.fur2, color2: C.fur }); }
    // đuôi
    const tp = [[0, y(0.5), -0.14], [0, y(0.47), -0.3], [0, y(0.4), -0.46], [0, y(0.31), -0.58], [0, y(0.22), -0.64]];
    const tb = swayChain(m, hips, 'Tail', tp.slice(1));
    tube(m, tb, tp, [0.06, 0.085, 0.09, 0.07, 0.02], { color: C.fur, color2: C.furL });
    // — móng vuốt thép trên găng —
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      const E = d.E.toArray(), W = d.W.toArray(), T = d.T.toArray();
      band(m, E, W, 0.55, 0.5, 0.05, { bone: BONE('Forearm' + sd), color: C.dark });
      band(m, E, W, 0.3, 0.06, 0.056, { bone: BONE('Forearm' + sd), color: C.steel });
      const dir = [T[0] - W[0], T[1] - W[1], T[2] - W[2]];
      for (let k = -1; k <= 1; k++) {
        const base = place(dir, T, [k * 0.045, 0, 0]);
        m.seg(base, along(base, dir, 0.36), 0.014, 0.002, { bone: BONE('Hand' + sd), color: C.steel, color2: '#eef1f6', seg: 4, noCap0: true, noCap1: true, scale: [1, 1, 0.5] });
      }
      m.sphere(1, { radii: [0.06, 0.02, 0.07], at: place(dir, T, [0, 0.02, 0]), bone: BONE('Hand' + sd), color: C.dark });
    }
    return ctx;
  },
};
