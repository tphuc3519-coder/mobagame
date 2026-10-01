// Bamboo Shade — Bamboo Forest Assassin (09 §4.7)
import { humanoid, BONE } from '../humanoid.mjs';
import { ronin } from './bong_tre.anim.mjs';
import { jacket, sleeves, belt, boots } from '../costume.mjs';
import { swayChain, tube, dangle, leaf, handPos, along, place, orient, band, flap } from '../parts.mjs';

const C = { skin: '#e6bf9d', green: '#24452f', green2: '#182f21', dark: '#0f1a14', leaf: '#6fbf73', dry: '#d8e8b0', straw: '#dcc98a', straw2: '#a89a5c', steel: '#b9d4c0' };

export default {
  name: 'Bamboo Shade', glow: '#9dff9d',
  palette: ['#1f3b2a', '#6fbf73', '#d8e8b0', '#0f1a14'], rim: '#6fbf73',
  hitTime: { Attack1: 0.2, Attack2: 0.2 },
  import: { // model liền khối có texture do hoạ sĩ gửi (ronin_pbr_100000.glb: kiếm sĩ nón lá, hai kiếm): xem import_fused.mjs; build() bên dưới là bản sinh bằng code cũ, không còn dùng
    mode: 'fused', file: './imports/ronin_pbr_100000.glb', simplify: { tris: 28000, error: 0.08, flags: ['Permissive', 'Prune'] },
    centerX: 0.175, centerZ: -0.14, bodyTop: 1.89, height: 2.2, texMax: 1024,
    rig: { // toạ độ tương đối thân (đơn vị file gốc): x + = bên trái nhân vật, z + = phía trước
      Hips: [0, 1.0, 0], Spine: [0, 1.13, 0], Chest: [0, 1.3, 0], Neck: [0, 1.5, 0], Head: [0, 1.6, 0], HeadTop: [0, 1.89, 0],
      ThighL: [0.2, 1.0, 0], ShinL: [0.22, 0.52, 0.03], FootL: [0.225, 0.12, 0], ToeL: [0.225, 0.03, 0.22],
      ThighR: [-0.2, 1.0, 0], ShinR: [-0.22, 0.52, 0.03], FootR: [-0.225, 0.12, 0], ToeR: [-0.225, 0.03, 0.22],
      UpperArmL: [0.28, 1.45, 0], ForearmL: [0.36, 1.15, 0], HandL: [0.4, 0.86, 0], HandL_Tip: [0.375, 0.25, 0.72], HandEndL: [0.4, 0.78, 0.04],
      UpperArmR: [-0.28, 1.45, 0], ForearmR: [-0.36, 1.15, 0], HandR: [-0.4, 0.86, 0], HandR_Tip: [-0.855, 0.28, 0.29], HandEndR: [-0.4, 0.78, 0.04],
    },
    weapon: [ // hai thanh kiếm gắn cứng vào hai tay
      { bone: 'HandR', a: [-0.4, 0.82, -0.01], b: [-0.855, 0.28, 0.29], r: 0.05, hard: 0.02, cut: 0.002 },
      { bone: 'HandL', a: [0.395, 0.85, 0.02], b: [0.375, 0.25, 0.72], r: 0.05, hard: 0.02, cut: 0.002 },
    ],
    cutMixed: { keep: 0.14 }, minComponent: 120,
    skirt: { max: 0.85, from: 0.02, span: 0.2, gap0: 0.02, gap1: 0.08 }, // vạt áo choàng lá đung đưa
    portrait: { dist: 2.1, dy: -0.28 },
  },
  anim: ronin,
  build(id) {
    const ctx = humanoid(id, {
      H: 1.72, headS: 1.05, shoulder: 0.15, chestW: 0.118, chestD: 0.072, waistW: 0.084, hipW: 0.106, armR: 0.024, legR: 0.036, legOut: 0.05,
      skin: C.skin, top: C.green, pelvis: C.green2, thigh: C.green, shin: C.green2, boot: C.dark, bootTop: C.green2, arm: C.green, forearm: C.dark, hand: C.dark,
      armL: 'ready', armR_: 'ready', handR: 0.026, brow: '#0f1a14', eye: '#1f3a28',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    jacket(ctx, { color: C.green, color2: C.green2, hem: 0.38, flare: 1.18, trim: C.dark, collar: C.dark, split: 0.53 });
    sleeves(ctx, { color: C.green, cuff: C.dark, len: 0.55 });
    belt(ctx, { color: C.dark, buckle: C.leaf, at: 0.545 });
    boots(ctx, { color: C.dark, cuff: C.green2, top: 0.1 });
    // — nón lá tre cắt vát, khăn che nửa mặt —
    m.cone(hr * 1.85, hr * 0.85, { at: [0, hc.y + hr * 1.02, hc.z], rot: [0, 0, 7], bone: head, color: C.straw, color2: C.straw2, seg: 22, ao: 0.2 });
    m.torus(hr * 1.8, hr * 0.04, { at: [0.0, hc.y + hr * 0.6, hc.z], rot: [90, 0, 7], bone: head, color: C.straw2, seg: 26 });
    m.torus(hr * 1.0, hr * 0.025, { at: [0, hc.y + hr * 0.35, hc.z], rot: [90, 0, 0], bone: head, color: C.dark, seg: 18 });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.55, hr * 1.05], at: [0, hc.y - hr * 0.38, hc.z + hr * 0.02], bone: head, color: C.dark, color2: C.green2, wseg: 16, hseg: 10 });
    m.sphere(1, { radii: [hr * 0.2, hr * 0.17, hr * 0.22], at: [0, hc.y - hr * 0.08, hc.z + hr * 0.98], bone: head, color: C.dark });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.85, hr * 1.02], at: [0, hc.y + hr * 0.3, hc.z - hr * 0.2], bone: head, color: '#1a1410', wseg: 14, hseg: 10 });
    dangle(m, head, 'Pony', [0, hc.y + hr * 0.1, hc.z - hr * 1.0], { len: 0.7, n: 3, drift: [0, -0.12], r0: 0.05, r1: 0.008, color: '#1a1410', color2: '#3a2a20' });
    dangle(m, head, 'Wrap', [hr * 0.4, hc.y - hr * 0.3, hc.z - hr * 0.9], { len: 0.34, n: 2, drift: [0.03, -0.08], r0: 0.022, r1: 0.006, color: C.dark });
    // — lá tre trên vai, dây lưng, túi —
    for (let i = 0; i < 5; i++) leaf(m, { at: [ctx.shoulder.x + 0.02 + i * 0.03, ctx.shoulder.y + 0.05, ctx.shoulder.z - 0.02 + (i % 2) * 0.03], len: 0.26, w: 0.075, rot: [-15 + i * 5, i * 25 - 20, -45 + i * 12], color: i % 2 ? C.leaf : C.dry, bone: BONE('UpperArmL'), mirror: true });
    m.torus(0.105, 0.028, { at: [0, y(0.545), 0], rot: [90, 0, 0], bone: hips, color: C.dark, seg: 18 });
    for (const sd of [1, -1]) leaf(m, { at: [sd * 0.12, y(0.53), 0.1], len: 0.2, w: 0.07, rot: [170, 0, sd * 12], color: C.leaf, bone: hips });
    flap(m, 'TailB', { at: [0, -0.09], top: y(0.53), bottom: y(0.32), wTop: 0.14, wBot: 0.2, color: C.green2, color2: C.dark });
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      band(m, d.E.toArray(), d.W.toArray(), 0.6, 0.3, 0.03, { bone: BONE('Forearm' + sd), color: C.green });
      m.torus(0.038, 0.01, { at: [(sd === 'L' ? 1 : -1) * 0.11, y(0.24), 0], rot: [90, 0, 0], bone: BONE('Shin' + sd), color: C.dark });
    }
    // — hai dao hình lá tre —
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      const W = d.W.toArray(), T = d.T.toArray();
      const dir = [T[0] - W[0], T[1] - W[1] + 0.35, T[2] - W[2]];
      const hp = handPos(ctx, sd), B = BONE('Hand' + sd);
      const g = along(hp, dir, 0.06);
      m.seg(along(hp, dir, -0.09), g, 0.014, 0.014, { bone: B, color: C.dark });
      m.sphere(0.02, { at: along(hp, dir, -0.1), bone: B, color: C.leaf });
      leaf(m, { at: g, len: 0.5, w: 0.1, rot: orient(dir), color: C.steel, color2: '#eef8f0', bone: B, thick: 0.008, bulge: 0.32 });
      leaf(m, { at: along(g, dir, 0.04), len: 0.4, w: 0.02, rot: orient(dir), color: '#c8ffcf', glow: true, bone: B, thick: 0.01 });
    }
    return ctx;
  },
};
