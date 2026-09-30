// Sấm Trống — Tay Trống Gọi Mưa (09 §4.10)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, leaf, handPos, along, place, orient, band, spike, bronzeDrum, flap } from '../parts.mjs';

const C = { skin: '#c98d63', paint: '#f4f4f4', blue: '#5fd0ff', navy: '#20304a', bronze: '#d9a441', bronze2: '#8a5a2b', feather: '#f1f1f1', feather2: '#8fb8e8', cloth: '#e8e4d4', red: '#c8412f', dark: '#141c2c' };

export default {
  name: 'Sấm Trống', glow: '#5fd0ff',
  palette: ['#20304a', '#5fd0ff', '#d9a441', '#f1f1f1'], rim: '#5fd0ff',
  hitTime: { Attack1: 0.26, Attack2: 0.26 },
  anim: { style: { atk1: 'drum', atk2: 'chopR', cast1: 'pushR', cast2: 'raise2', ult: 'raise2' }, run: { hold: 'R', amp: 33, arm: 0.6, bob: 0.02, lean: 8 }, idle: 'calm', moveSpeed: 315, swayAmp: 9 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.8, headS: 1.04, shoulder: 0.16, chestW: 0.132, chestD: 0.082, waistW: 0.095, hipW: 0.112, armR: 0.028, legR: 0.041, legOut: 0.052,
      skin: C.skin, top: C.skin, pelvis: C.cloth, thigh: C.cloth, shin: C.skin, boot: C.bronze2, bootTop: C.skin, arm: C.skin, forearm: C.skin, hand: C.skin,
      armL: 'ready', armR_: 'ready', handR: 0.03, brow: '#101010',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — tóc dựng tĩnh điện, vẽ mặt mây sấm —
    m.sphere(1, { radii: [hr * 1.03, hr * 0.9, hr * 1.04], at: [0, hc.y + hr * 0.2, hc.z - hr * 0.16], bone: head, color: C.navy, wseg: 14, hseg: 10 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, r = hr * 0.55;
      const sx = Math.sin(a) * r, sz = Math.cos(a) * r * 0.9 - hr * 0.1;
      const rot = [Math.cos(a) * 32 + 4, 0, -Math.sin(a) * 32];
      spike(m, { at: [sx, hc.y + hr * 0.95, hc.z + sz], len: hr * (1.0 + (i % 3) * 0.25), r: hr * 0.15, rot, bone: head, color: C.navy, seg: 5 });
      spike(m, { at: [sx * 1.25, hc.y + hr * (1.55 + (i % 3) * 0.16), hc.z + sz * 1.25], len: hr * 0.4, r: hr * 0.07, rot, bone: head, color: C.blue, glow: true, seg: 4, });
    }
    for (const [dx, dy, r] of [[0.5, 0.05, -25], [0.62, -0.18, -10], [0.28, 0.42, 10]]) m.box(hr * 0.06, hr * 0.42, hr * 0.03, { at: [dx * hr, hc.y + dy * hr, hc.z + hr * 0.93], rot: [0, 0, r], bone: head, color: C.paint, mirror: true, flat: false, ao: 0 });
    m.box(hr * 0.06, hr * 0.5, hr * 0.03, { at: [0, hc.y + hr * 0.55, hc.z + hr * 0.93], bone: head, color: C.blue, flat: false, ao: 0 });
    // — áo choàng lông vũ —
    for (let row = 0; row < 3; row++) {
      const n = 8 + row * 2, yy = y(0.79) - row * 0.09;
      for (let i = 0; i < n; i++) {
        const a = (0.15 + (i / (n - 1)) * 0.7) * Math.PI * 2 + Math.PI * 0.5 + Math.PI * 0.05;
        const r = 0.2 + row * 0.02;
        const ax = Math.sin(a), az = Math.cos(a);
        leaf(m, { at: [ax * r, yy, az * r * 0.75 + ctx.zs(0.79)], len: 0.34 - row * 0.02, w: 0.1, rot: orient([ax * 0.4, -1, az * 0.5]), color: (i + row) % 2 ? C.feather : C.feather2, bone: chest, thick: 0.01 });
      }
    }
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) leaf(m, { at: [s * (ctx.shoulder.x + 0.02 + i * 0.03), ctx.shoulder.y + 0.05, ctx.shoulder.z], len: 0.22, w: 0.08, rot: orient([s * (0.5 + i * 0.1), -0.9, 0]), color: i % 2 ? C.feather : C.feather2, bone: BONE('UpperArm' + (s > 0 ? 'L' : 'R')), thick: 0.01 });
    // trống đồng nhỏ trước ngực, dây đeo
    bronzeDrum(m, { at: [0, y(0.67), 0.15 + ctx.zs(0.67)], r: 0.135, h: 0.1, bone: chest });
    for (const s of [1, -1]) m.seg([s * 0.09, y(0.79), 0.09 + ctx.zs(0.79)], [s * 0.05, y(0.72), 0.16 + ctx.zs(0.72)], 0.01, 0.01, { bone: chest, color: C.red, noCap0: true, noCap1: true });
    m.torus(0.115, 0.03, { at: [0, y(0.535), 0], rot: [90, 0, 0], bone: hips, color: C.red, seg: 18 });
    flap(m, 'Sash', { at: [0.1, 0.08], top: y(0.53), bottom: y(0.27), wTop: 0.08, wBot: 0.1, color: C.red, color2: '#8a2a1c' });
    flap(m, 'ClothF', { at: [0, 0.11], top: y(0.5), bottom: y(0.22), wTop: 0.2, wBot: 0.26, color: C.cloth, color2: C.feather2 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.5, 0.16, 0.04, { bone: BONE('Forearm' + sd), color: C.bronze }); m.torus(0.05, 0.012, { at: [(sd === 'L' ? 1 : -1) * 0.112, y(0.08), 0], rot: [90, 0, 0], bone: BONE('Shin' + sd), color: C.bronze }); }
    // — dùi trống phát sét —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    const dir = [-0.08, 1, 0.25];
    const p0 = along(hp, dir, -0.2), p1 = along(hp, dir, 0.62);
    m.seg(p0, p1, 0.02, 0.02, { bone: HR, color: C.bronze2, noCap1: true });
    m.sphere(1, { radii: [0.055, 0.075, 0.055], at: along(hp, dir, 0.66), bone: HR, color: C.bronze, color2: C.bronze2 });
    let last = along(hp, dir, 0.74);
    for (let i = 0; i < 6; i++) {
      const nx = [last[0] + (i % 2 ? 0.07 : -0.07), last[1] + 0.09, last[2] + (i % 2 ? -0.03 : 0.04)];
      m.seg(last, nx, 0.008, 0.008, { bone: HR, color: '#c8f2ff', glow: true, ao: 0, seg: 4 });
      last = nx;
    }
    const hl = handPos(ctx, 'L');
    m.sphere(0.05, { at: [hl[0], hl[1] + 0.09, hl[2] + 0.04], bone: BONE('HandL'), color: C.blue, glow: true, ao: 0 });
    for (const [x, yy, z] of [[0.35, 2.05, 0.1], [-0.4, 1.95, -0.1]]) { m.sphere(1, { radii: [0.16, 0.06, 0.12], at: [x, yy, z], bone: BONE('Root'), color: '#5a6a88', ao: 0.1 }); m.sphere(1, { radii: [0.11, 0.05, 0.09], at: [x + 0.1, yy + 0.04, z], bone: BONE('Root'), color: '#7a8aa8' }); }
    return ctx;
  },
};
