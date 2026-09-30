// Trạng Nỏ — Xạ Thủ Nỏ Đồng (09 §4.14)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, along, place, orient, orientZ, band, curve, pauldron, flap, spike } from '../parts.mjs';

const C = { skin: '#eac6a6', bronze: '#2f7f74', bronze2: '#1e514c', gold: '#d4a95f', cloth: '#e8e0c8', dark: '#1e2a2a', wood: '#7a5a34', hair: '#252528', glass: '#bfeee8' };

export default {
  name: 'Trạng Nỏ', glow: '#7fffe0',
  palette: ['#2f6f6a', '#d4a95f', '#1e2a2a', '#e8e0c8'], rim: '#7fe0d0',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'shoot', atk2: 'shoot', cast1: 'push2', cast2: 'pushR', ult: 'shoot' }, run: { hold: 'both', amp: 34, arm: 0.5, bob: 0.02, lean: 8 }, idle: 'calm', moveSpeed: 315, swayAmp: 8 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.75, headS: 1.03, shoulder: 0.152, chestW: 0.125, chestD: 0.078, waistW: 0.088, hipW: 0.108, armR: 0.025, legR: 0.038, legOut: 0.049,
      skin: C.skin, top: C.bronze, pelvis: C.bronze2, thigh: C.bronze2, shin: C.bronze, boot: C.bronze2, bootTop: C.gold, arm: C.bronze2, forearm: C.bronze, hand: C.dark,
      armL: 'front2', armR_: 'front2', handR: 0.027, brow: '#1a1a1a', eye: '#22303a',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — mũ trụ nhỏ cánh chuồn, tóc ngắn, kính một mắt —
    m.sphere(1, { radii: [hr * 1.02, hr * 0.98, hr * 1.04], at: [0, hc.y + hr * 0.05, hc.z - hr * 0.2], bone: head, color: C.hair, wseg: 14, hseg: 10 });
    m.sphere(1, { radii: [hr * 0.2, hr * 0.55, hr * 0.3], at: [hr * 0.92, hc.y - hr * 0.3, hc.z], bone: head, color: C.hair, mirror: true });
    m.sphere(1, { radii: [hr * 1.1, hr * 0.78, hr * 1.12], at: [0, hc.y + hr * 0.42, hc.z - hr * 0.05], bone: head, color: C.bronze, color2: C.bronze2, wseg: 18, hseg: 10, ao: 0.25 });
    m.torus(hr * 1.06, hr * 0.06, { at: [0, hc.y + hr * 0.42, hc.z - hr * 0.02], rot: [90, 0, 0], bone: head, color: C.gold, seg: 22 });
    m.box(hr * 0.1, hr * 0.5, hr * 1.4, { at: [0, hc.y + hr * 1.12, hc.z - hr * 0.05], bone: head, color: C.gold, flat: false });
    for (const [up, oz, yaw] of [[0.7, -0.1, 0], [0.25, -0.35, 0]]) leaf(m, { at: [hr * 1.02, hc.y + hr * (0.5 + up * 0.3), hc.z + hr * oz], len: 0.44, w: 0.12, rot: orient([1, 0.55 + up * 0.5, -0.55]), color: C.gold, color2: '#f4e0a0', bone: head, mirror: true, thick: 0.008, bulge: 0.35 });
    const ex = -hr * 0.34, ey = hc.y + hr * 0.02, ez = hc.z + hr * 0.95;
    m.torus(hr * 0.2, hr * 0.045, { at: [ex, ey, ez], bone: head, color: C.gold, seg: 16 });
    m.sphere(1, { radii: [hr * 0.18, hr * 0.18, hr * 0.03], at: [ex, ey, ez + 0.005], bone: head, color: C.glass, glow: true, ao: 0 });
    m.seg([ex + hr * 0.2, ey, ez - 0.01], [-hr * 1.0, ey, hc.z + hr * 0.2], 0.004, 0.004, { bone: head, color: C.gold, seg: 4 });
    // — giáp đồng xanh, vai, váy giáp, áo choàng ngắn —
    m.sphere(1, { radii: [0.078, 0.07, 0.05], at: [0.065, y(0.71), 0.09 + ctx.zs(0.71)], bone: chest, color: C.bronze, color2: C.bronze2, mirror: true, ao: 0.25 });
    m.torus(0.062, 0.01, { at: [0.065, y(0.71), 0.13 + ctx.zs(0.71)], rot: [-8, 0, 0], bone: chest, color: C.gold, mirror: true, seg: 16 });
    pauldron(m, ctx, 'L', { r: 0.095, color: C.bronze, trim: C.gold, spikes: 0 });
    pauldron(m, ctx, 'R', { r: 0.095, color: C.bronze, trim: C.gold, spikes: 0 });
    m.torus(0.108, 0.026, { at: [0, y(0.535), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 18 });
    for (const [x, name] of [[-0.09, 'TasA'], [0, 'TasB'], [0.09, 'TasC']]) flap(m, name, { at: [x, 0.1], top: y(0.52), bottom: y(0.33), wTop: 0.09, wBot: 0.1, color: C.bronze, color2: C.bronze2, wmax: 0.6 });
    flap(m, 'TasBack', { at: [0, -0.1], top: y(0.52), bottom: y(0.3), wTop: 0.22, wBot: 0.28, color: C.bronze2, color2: C.dark, wmax: 0.7 });
    const cp = [[0, y(0.79), -0.07], [0, y(0.69), -0.16], [0, y(0.56), -0.22], [0, y(0.45), -0.24]];
    const cb = swayChain(m, chest, 'Cape', cp.slice(1));
    ribbon(m, cb, cp, [0.28, 0.34, 0.38, 0.4], { color: C.cloth, color2: '#b8a888' });
    m.torus(0.06, 0.02, { at: [0, y(0.795), 0], rot: [80, 0, 0], bone: chest, color: C.gold });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.5, 0.4, 0.034, { bone: BONE('Forearm' + sd), color: C.gold, color2: C.bronze }); }
    // — nỏ liên châu bằng đồng —
    const hl = handPos(ctx, 'L'), hr2 = handPos(ctx, 'R'), HR = BONE('HandR');
    const cx = (hl[0] + hr2[0]) / 2, cy = (hl[1] + hr2[1]) / 2 - 0.02, cz = (hl[2] + hr2[2]) / 2;
    m.box(0.06, 0.08, 1.15, { at: [cx, cy, cz + 0.12], bone: HR, color: C.gold, color2: C.wood, flat: false, ao: 0.2 });
    m.box(0.045, 0.1, 0.22, { at: [cx, cy - 0.08, cz - 0.3], bone: HR, color: C.wood });
    m.box(0.09, 0.14, 0.42, { at: [cx, cy + 0.11, cz + 0.02], bone: HR, color: C.bronze, color2: C.bronze2, flat: false });
    m.box(0.1, 0.02, 0.44, { at: [cx, cy + 0.185, cz + 0.02], bone: HR, color: C.gold });
    const z0 = cz + 0.62;
    for (const s of [1, -1]) {
      const lp = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; lp.push([cx + s * t * 0.46, cy + 0.02, z0 - 0.1 * t * t + 0.02 * t]); }
      curve(m, lp, lp.map((_, i) => 0.026 - i * 0.0022), { bone: HR, color: C.bronze, color2: C.gold });
      m.seg(lp[8], [cx, cy + 0.03, cz - 0.05], 0.004, 0.004, { bone: HR, color: C.glass, glow: true, ao: 0, seg: 4, noCap0: true, noCap1: true });
    }
    for (const dx of [-0.028, 0, 0.028]) { m.seg([cx + dx, cy + 0.2, cz - 0.02], [cx + dx, cy + 0.2, cz + 0.56], 0.007, 0.007, { bone: HR, color: '#c8fff0', glow: true, ao: 0, seg: 4, noCap0: true, noCap1: true }); m.cone(0.011, 0.05, { at: [cx + dx, cy + 0.2, cz + 0.6], rot: [90, 0, 0], bone: HR, color: C.gold, seg: 5 }); }
    return ctx;
  },
};
