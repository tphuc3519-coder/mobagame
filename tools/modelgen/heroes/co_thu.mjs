// Cổ Thụ — Cây Đa Nghìn Tuổi (09 §4.3)
import { humanoid, BONE } from '../humanoid.mjs';
import { dangle, curve, leaf, handPos, along, place, orient, band, spike } from '../parts.mjs';

const C = { bark: '#8a6644', bark2: '#684a30', bark3: '#4e3822', leaf: '#6fae5a', leaf2: '#4f8a44', lamp: '#ffd27a', wood: '#d8b98a', dark: '#2d3b2a', moss: '#5a7a44' };

export default {
  name: 'Cổ Thụ', glow: '#ffc060',
  palette: ['#5a4030', '#6fae5a', '#ffd27a', '#2d3b2a'], rim: '#8fdc70',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'swingR', atk2: 'chopR', cast1: 'pushR', cast2: 'sweep2', ult: 'raise2' }, run: { hold: 'R', amp: 28, arm: 0.25, bob: 0.02, lean: 5 }, idle: 'calm', moveSpeed: 305, swayAmp: 9 },
  build(id) {
    const ctx = humanoid(id, {
      H: 2.4, headS: 0.86, shoulder: 0.2, chestW: 0.18, chestD: 0.13, waistW: 0.15, hipW: 0.155, armR: 0.052, legR: 0.06, legOut: 0.066, hunch: 0.025,
      skin: C.bark, top: C.bark2, pelvis: C.bark3, thigh: C.bark3, shin: C.bark2, boot: C.bark3, bootTop: C.bark2, arm: C.bark, forearm: C.bark2, hand: C.bark,
      armL: 'down', armR_: 'ready', handR: 0.055, face: false, footL: 0.1,
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — mặt nạ gỗ hiền từ —
    m.sphere(1, { radii: [hr * 0.86, hr * 1.12, hr * 0.42], at: [0, hc.y, hc.z + hr * 0.78], bone: head, color: C.wood, color2: '#b89a6a', ao: 0.2 });
    m.box(hr * 0.3, hr * 0.05, hr * 0.06, { at: [hr * 0.34, hc.y + hr * 0.1, hc.z + hr * 1.16], rot: [0, 0, -10], bone: head, color: '#2a1c12', mirror: true, flat: false });
    m.torus(hr * 0.28, hr * 0.028, { at: [0, hc.y - hr * 0.35, hc.z + hr * 1.15], rot: [0, 0, 180], arc: Math.PI * 0.8, bone: head, color: '#8a4a30', seg: 12 });
    m.sphere(1, { radii: [hr * 0.09, hr * 0.14, hr * 0.06], at: [0, hc.y - hr * 0.05, hc.z + hr * 1.2], bone: head, color: '#c8a978' });
    m.sphere(1, { radii: [hr * 1.02, hr * 0.98, hr * 1.02], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.2], bone: head, color: C.bark2, color2: C.bark, wseg: 14, hseg: 10, ao: 0.3 });
    // vương miện lá và cành
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 360, r = hr * 0.95;
      leaf(m, { at: [Math.sin(a * Math.PI / 180) * r, hc.y + hr * 0.8, hc.z - hr * 0.15 + Math.cos(a * Math.PI / 180) * r * 0.8], len: 0.22, w: 0.1, rot: [Math.cos(a * Math.PI / 180) * 50, a, Math.sin(a * Math.PI / 180) * 50 * -1], color: i % 2 ? C.leaf : C.leaf2, bone: head });
    }
    // — rễ phụ buông như tóc và áo choàng —
    const roots = [[-0.12, 0.05], [0, 0.07], [0.12, 0.05], [-0.2, -0.02], [0.2, -0.02]];
    roots.forEach(([dx, dz], i) => dangle(m, head, 'Hair' + 'ABCDEFG'[i], [dx * hr * 3, hc.y + hr * 0.2 - Math.abs(dx) * 0.3, hc.z - hr * 0.75 + dz], { len: 0.75 + (i % 3) * 0.12, n: 2, drift: [dx * 2, -0.12], r0: 0.035, r1: 0.008, color: C.bark2, color2: C.bark, wave: 0.03 }));
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.1;
      dangle(m, chest, 'Cloak' + 'ABCDEFG'[i], [x * 1.3, y(0.79) + 0.03, ctx.zs(0.79) - 0.13 - Math.abs(x) * 0.15], { len: 0.95 + (i % 3) * 0.12, n: 2, drift: [x * 0.8, -0.16], r0: 0.032, r1: 0.007, color: C.bark2, color2: C.bark, wave: 0.03 });
    }
    // — cành vai treo đèn lồng, tán lá —
    for (const sd of [1, -1]) {
      const sx = sd * (ctx.shoulder.x + 0.02), sy = ctx.shoulder.y;
      const pts = [[sx, sy + 0.04, ctx.shoulder.z], [sx + sd * 0.14, sy + 0.24, ctx.shoulder.z - 0.02], [sx + sd * 0.34, sy + 0.36, ctx.shoulder.z + 0.04], [sx + sd * 0.5, sy + 0.3, ctx.shoulder.z + 0.06]];
      curve(m, pts, [0.05, 0.036, 0.026, 0.016], { bone: chest, color: C.bark, color2: C.bark2 });
      m.cyl(0.005, 0.005, 0.14, { at: [pts[3][0], pts[3][1] - 0.08, pts[3][2]], bone: chest, color: '#2a1c12' });
      m.lathe([[0.001, -0.07], [0.05, -0.05], [0.075, 0], [0.05, 0.05], [0.001, 0.07]], { at: [pts[3][0], pts[3][1] - 0.22, pts[3][2]], bone: chest, glow: true, color: '#ffe6a0', color2: C.lamp, seg: 10, ao: 0 });
      m.cyl(0.03, 0.03, 0.02, { at: [pts[3][0], pts[3][1] - 0.145, pts[3][2]], bone: chest, color: '#5a3a1a' });
      for (let i = 0; i < 6; i++) leaf(m, { at: [sx + sd * (0.02 + i * 0.05), sy + 0.1 + (i % 3) * 0.04, ctx.shoulder.z + 0.02 * (i % 2)], len: 0.24, w: 0.11, rot: [-20 + i * 8, i * 47, sd * (-50 + i * 10)], color: i % 2 ? C.leaf : C.leaf2, bone: chest });
    }
    // rêu và nứt trên thân
    for (const [x, yy, r] of [[0.12, 0.72, 0.09], [-0.14, 0.62, 0.07]]) m.sphere(1, { radii: [r, r * 0.4, r * 0.8], at: [x * H * 0.9, y(yy), 0.14 + ctx.zs(yy)], bone: chest, color: C.moss, ao: 0.2 });
    m.torus(0.19, 0.03, { at: [0, y(0.535), 0], rot: [90, 0, 0], bone: hips, color: '#8a6a44', seg: 18 });
    for (const [x, z] of [[0.09, 0.13], [-0.09, 0.13], [0, 0.15]]) m.cone(0.04, 0.32, { at: [x, y(0.5) - 0.12, z], rot: [180, 0, 0], bone: hips, color: C.bark, seg: 6 });
    // — gậy gỗ mọc lá —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    const dir = [-0.05, 1, 0.08];
    const p0 = along(hp, dir, -0.5), p1 = along(hp, dir, 1.1), pm = along(hp, dir, 0.4);
    curve(m, [p0, [pm[0] + 0.03, pm[1], pm[2]], p1], [0.03, 0.036, 0.03], { bone: HR, color: C.bark, color2: C.bark2 });
    for (let i = 0; i < 7; i++) leaf(m, { at: place(dir, p1, [0, 0.02, 0]), len: 0.3, w: 0.13, rot: [Math.cos(i) * 40, i * 51, Math.sin(i) * 40], color: i % 2 ? C.leaf : C.leaf2, bone: HR });
    m.sphere(0.03, { at: place(dir, p1, [0, 0.05, 0]), bone: HR, color: C.lamp, glow: true, ao: 0 });
    return ctx;
  },
};
