// Cánh Diều — Cung Thủ Theo Gió (09 §4.12)
import { humanoid, BONE, hairLocks } from '../humanoid.mjs';
import { jacket, sleeves, belt, boots, scarf } from '../costume.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, along, place, orient, band, curve, spike } from '../parts.mjs';

const C = { skin: '#e8bf9a', blue: '#2b6cb0', blue2: '#1f4f86', amber: '#f6ad55', cream: '#fff5e1', dark: '#1a202c', wood: '#a5773d', wood2: '#6e4a22', hair: '#4a2c1a', wind: '#a8e6ff' };

export default {
  name: 'Cánh Diều', glow: '#a8e6ff',
  palette: ['#2b6cb0', '#f6ad55', '#fff5e1', '#1a202c'], rim: '#a8e6ff',
  hitTime: { Attack1: 0.36, Attack2: 0.36 },
  anim: { style: { atk1: 'shoot', atk2: 'shoot', cast1: 'pushR', cast2: 'push2', ult: 'raise2' }, run: { hold: 'L', amp: 36, arm: 0.7, bob: 0.02, lean: 10 }, idle: 'calm', moveSpeed: 325, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.82, headS: 1.03, shoulder: 0.158, chestW: 0.13, chestD: 0.08, waistW: 0.094, hipW: 0.11, armR: 0.026, legR: 0.038, legOut: 0.05,
      skin: C.skin, top: C.blue, pelvis: C.dark, thigh: C.dark, shin: C.dark, boot: C.wood2, bootTop: C.wood, arm: C.blue, forearm: C.blue2, hand: C.wood2,
      armL: 'ready', armR_: 'ready', handR: 0.028, brow: '#3a2418', eye: '#3a4a6a',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — tóc, kính bảo hộ đẩy lên trán —
    jacket(ctx, { color: C.blue, color2: C.blue2, hem: 0.44, flare: 1.15, trim: C.amber, collar: C.cream, split: 0.5 });
    sleeves(ctx, { color: C.blue, cuff: C.amber, len: 0.8 });
    belt(ctx, { color: '#5a3a1f', buckle: C.amber, at: 0.52 });
    boots(ctx, { color: '#6e4a22', cuff: C.cream, top: 0.15 });
    scarf(ctx, { color: C.amber });
    hairLocks(ctx, { color: C.hair, color2: '#6a4028', shine: '#d8a070', bangs: 6, side: 0.7, back: 0.6, spiky: 1, part: 0.5 });
    for (let i = 0; i < 5; i++) spike(m, { at: [(i - 2) * hr * 0.3, hc.y + hr * 0.95, hc.z - hr * 0.3], len: hr * 0.5, r: hr * 0.13, rot: [-60, 0, (i - 2) * -14], bone: head, color: C.hair, seg: 5 });
    m.torus(hr * 1.02, hr * 0.06, { at: [0, hc.y + hr * 0.62, hc.z - hr * 0.02], rot: [90, 0, 0], bone: head, color: C.dark, seg: 20 });
    for (const s of [1, -1]) {
      m.torus(hr * 0.27, hr * 0.06, { at: [s * hr * 0.32, hc.y + hr * 0.75, hc.z + hr * 0.88], rot: [-22, 0, 0], bone: head, color: C.amber, seg: 14 });
      m.sphere(1, { radii: [hr * 0.24, hr * 0.24, hr * 0.03], at: [s * hr * 0.32, hc.y + hr * 0.75, hc.z + hr * 0.9], rot: [-22, 0, 0], bone: head, color: '#bfeaff', glow: true, ao: 0 });
    }
    // — áo khoác phi công, cổ lông, khăn dài —
    m.torus(0.078, 0.028, { at: [0, y(0.79), 0.005 + ctx.zs(0.79)], rot: [82, 0, 0], bone: chest, color: C.cream, seg: 14 });
    m.torus(0.128, 0.03, { at: [0, y(0.53), 0], rot: [90, 0, 0], bone: hips, color: C.amber, seg: 18 });
    m.box(0.02, 0.36, 0.02, { at: [0, y(0.68), 0.088 + ctx.zs(0.68)], bone: chest, color: C.cream, flat: false });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.9, 0.16, 0.036, { bone: BONE('Forearm' + sd), color: C.cream }); band(m, d.E.toArray(), d.W.toArray(), 0.35, 0.05, 0.036, { bone: BONE('Forearm' + sd), color: C.amber }); }
    const sp = [[0.02, y(0.79), -0.06], [0.06, y(0.7), -0.19], [-0.02, y(0.6), -0.32], [0.05, y(0.5), -0.45], [-0.03, y(0.4), -0.55], [0.03, y(0.3), -0.62]];
    const sb = swayChain(m, chest, 'Scarf', sp.slice(1));
    ribbon(m, sb, sp, [0.1, 0.13, 0.14, 0.14, 0.13, 0.11], { color: C.cream, color2: '#f0d8b0' });
    m.torus(0.06, 0.024, { at: [0, y(0.795), 0], rot: [80, 0, 0], bone: chest, color: C.cream });
    // — cánh diều gấp trên lưng —
    const wingPoly = [[0, 0], [0.3, 0.42], [0.04, 0.95], [-0.14, 0.4]];
    for (const [rz, ry, yy] of [[10, 42, 0.7], [-8, 30, 0.6]]) {
      m.extrude(wingPoly, 0.012, { at: [0.09, y(yy), -0.17 + ctx.zs(0.7)], rot: [-12, ry, rz], bone: chest, color: C.cream, color2: C.blue, mirror: true, bevel: false, ao: 0.15 });
      m.extrude([[0.02, 0.05], [0.13, 0.42], [0.04, 0.78], [-0.02, 0.4]], 0.016, { at: [0.09, y(yy), -0.172 + ctx.zs(0.7)], rot: [-12, ry, rz], bone: chest, color: C.amber, mirror: true, bevel: false, ao: 0.1 });
    }
    m.cyl(0.05, 0.055, 0.5, { at: [-0.15, y(0.66), -0.13 + ctx.zs(0.66)], rot: [-8, 0, 18], bone: chest, color: C.wood2, color2: C.wood, seg: 10 });
    for (let i = 0; i < 4; i++) m.cone(0.016, 0.07, { at: [-0.21 + i * 0.012, y(0.66) + 0.3 + (i % 2) * 0.02, -0.14 + ctx.zs(0.66) + (i - 2) * 0.008], rot: [-8, 0, 18 + i * 3], bone: chest, color: i % 2 ? C.cream : C.amber, seg: 4 });
    // — cung tre với dây gió —
    const hl = handPos(ctx, 'L'), HL = BONE('HandL');
    const bp = [];
    for (let i = 0; i <= 10; i++) { const t = (i / 10) * 2 - 1; bp.push([hl[0], hl[1] + t * 0.66, hl[2] - 0.16 * t * t]); }
    curve(m, bp, bp.map((_, i) => { const t = Math.abs((i / 10) * 2 - 1); return 0.024 - t * 0.013; }), { bone: HL, color: C.wood, color2: C.wood2 });
    m.cyl(0.03, 0.03, 0.14, { at: hl, bone: HL, color: C.wood2 });
    const top = bp[10], bot = bp[0];
    m.seg(bot, top, 0.004, 0.004, { bone: HL, color: C.wind, glow: true, ao: 0, seg: 4, noCap0: true, noCap1: true });
    m.sphere(0.014, { at: top, bone: HL, color: C.amber }); m.sphere(0.014, { at: bot, bone: HL, color: C.amber });
    const ar0 = [hl[0], hl[1], hl[2] - 0.16 + 0.02], ar1 = [hl[0], hl[1], hl[2] + 0.72];
    m.seg(ar0, ar1, 0.006, 0.006, { bone: HL, color: C.cream, noCap0: true, noCap1: true, seg: 5 });
    m.cone(0.014, 0.06, { at: [ar1[0], ar1[1], ar1[2] + 0.03], rot: [90, 0, 0], bone: HL, color: '#c8d0d8', seg: 5 });
    for (let i = 0; i < 3; i++) m.box(0.003, 0.03, 0.07, { at: ar0.map((v, k) => (k === 2 ? v + 0.05 + i * 0.0 : v)), rot: [0, 0, i * 60], bone: HL, color: C.amber, flat: false });
    return ctx;
  },
};
