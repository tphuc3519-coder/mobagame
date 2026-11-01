// Haruno Sakura — Thầy Lang Mai Vàng (tướng gốc, cơ chế port từ autobattle)
import { humanoid, BONE } from '../humanoid.mjs';
import { dangle, leaf, handPos, band, flap, spike } from '../parts.mjs';
import { sakuraAnim } from './hanh_hoa.anim.mjs';
const C = { skin: '#f0cdb0', robe: '#f6e9c4', robe2: '#e5c96a', gold: '#f2c14e', brown: '#6b4a2a', hair: '#3a2a22', green: '#7fae5a', red: '#c8412f' };
const dark = (rgb) => Math.max(...rgb) < 115 && rgb[0] - rgb[1] < 40; // găng nâu, lưỡi kunai (không lấy da, tóc, áo đỏ)
export default {
  name: 'Haruno Sakura', glow: '#ffd75e', palette: ['#b3202a', '#ff8fb1', '#ffd1dc', '#4a3326'], rim: '#ff8fb1',
  hitTime: { Attack1: 0.26, Attack2: 0.26 },
  // Model liền khối có texture do chủ dự án gửi: thân base_basic_pbr_6.glb + đầu base_basic_pbr.glb (gửi 01/11) ghép vào thân, xem import_fused.mjs
  // và DECISIONS 2026-10-29 / 2026-11-01. build() bên dưới là bản sinh bằng code cũ, không còn dùng.
  import: {
    // Tư thế trong file: đứng dạng chân rộng, tay phải gập ngang ngực cầm kunai trên vai trái, tay trái duỗi chéo xuống trước sang phải.
    // Bản trong trận: 14 200 tam giác trải uv lại + nướng lại màu / kim loại-nhám / normal map từ bản gốc 1,6 triệu tam giác; mặt + tóc mái là
    // vật liệu riêng 'head' (texture riêng, ~2 600 px/m, thân ~420). KHÔNG đặt tên 'face': materials.js ẩn / thay mọi vật liệu '<id>_face'.
    mode: 'fused', file: './imports/sakura_pbr_game.glb',
    texMax: { base: 1024, normal: 1024, mr: 512 }, // không nén meshopt (trang chơi thử chặn WASM)
    shading: 'pbr', // texture PBR thật (như Nguyệt Hạ): toon làm tóc hồng xám đi
    showcase: { file: './imports/sakura_pbr_hq.glb', texMax: { base: 2048, normal: 2048, mr: 1024 }, // bản trưng bày (sảnh): 56 000 tam giác, cũng nướng lại
      compress: true, outline: false },
    centerX: 0, centerZ: -0.09, bodyTop: 1.892, height: 1.8,
    rig: { // toạ độ tương đối thân (đơn vị file gốc, z đã trừ centerZ): x + = bên trái nhân vật, z + = phía trước
      Hips: [0, 0.95, 0], Spine: [0, 1.12, 0.01], Chest: [0.01, 1.34, 0.02], Neck: [0, 1.52, -0.012], Head: [-0.008, 1.6, -0.008], HeadTop: [-0.006, 1.88, 0],
      UpperArmL: [0.165, 1.51, 0.02], ForearmL: [0.095, 1.4, 0.15], HandL: [-0.04, 1.32, 0.29], HandL_Tip: [-0.13, 1.21, 0.38],
      UpperArmR: [-0.135, 1.51, 0.02], ForearmR: [-0.085, 1.49, 0.155], HandR: [0.115, 1.55, 0.09], HandR_Tip: [0.335, 1.475, -0.015], HandEndR: [0.215, 1.595, -0.08], // HandR_Tip = mũi kunai
      ThighL: [0.1, 0.88, 0.01], ShinL: [0.205, 0.54, -0.07], FootL: [0.27, 0.11, -0.08], ToeL: [0.29, 0.02, 0.09],
      ThighR: [-0.1, 0.88, 0.01], ShinR: [-0.213, 0.54, -0.07], FootR: [-0.3, 0.11, -0.08], ToeR: [-0.315, 0.02, 0.09],
    },
    // tay phải + kunai dính liền vai trái / cằm trong lưới gốc: cả cánh tay đi theo ngực (không cử động riêng, khỏi rách vai); animation chỉ dùng tay trái
    merge: { UpperArmR: 'Chest', ForearmR: 'Chest', HandR: 'Chest' },
    // găng tay phải + kunai nằm ngay trên khớp vai trái: tính theo khoảng cách thì chúng ăn trọng số cánh tay trái (kunai bay theo mỗi cú đấm)
    // → gắn cứng vào ngực; chỉ lấy đỉnh màu tối
    weapon: [{ a: [0.11, 1.555, 0.09], b: [0.215, 1.595, -0.08], r: 0.07, hard: 0.02, cut: 0.002, bone: 'Chest', test: dark }, // cổ tay → nắm tay (vắt qua đỉnh vai ra sau)
      { a: [0.19, 1.63, -0.1], b: [0.335, 1.475, -0.015], r: 0.04, hard: 0.02, cut: 0.002, bone: 'Chest', test: dark }], // lưỡi kunai
    radii: { Hips: 0.375, Spine: 0.36, Chest: 0.36, Neck: 0.25, Head: 0.38, UpperArmL: 0.21, ForearmL: 0.2, HandL: 0.2, UpperArmR: 0.21, ForearmR: 0.2, HandR: 0.2,
      ThighL: 0.45, ThighR: 0.45, ShinL: 0.35, ShinR: 0.35, FootL: 0.35, FootR: 0.35 },
    softness: 0.009,
    // đầu mới (vật liệu 'head': mặt, tóc, cổ): cứng theo đầu từ cằm trở lên, cổ chuyển dần sang xương cổ (cổ áo đỏ ôm lấy chỗ nối)
    hair: { chain: [['Head', 1.575], ['Neck', 1.535]], pick: ({ mat }) => mat === 'head' },
    skirt: { max: 0.75, from: 0.0, span: 0.07, gap0: 0.01, gap1: 0.045 },
    portrait: { dist: 1.45, dy: 0.02 },
  },
  anim: sakuraAnim,
  build(id) {
    const ctx = humanoid(id, { H: 1.72, headS: 1.08, shoulder: 0.152, chestW: 0.122, waistW: 0.086, hipW: 0.11, armR: 0.026, legR: 0.038, skin: C.skin, top: C.robe, pelvis: C.robe2, thigh: C.robe, shin: C.robe, boot: C.brown, arm: C.robe, forearm: C.skin, hand: C.skin, armL: 'guard', armR_: 'guard', handR: 0.032 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), hips = BONE('Hips'), chest = BONE('Chest');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.06, hr * 1.05], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.15], bone: head, color: C.hair, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.3, hr * 0.44], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    m.sphere(hr * 0.42, { at: [0, hc.y + hr * 1.05, hc.z - hr * 0.5], bone: head, color: C.hair });
    dangle(m, head, 'Hair', [0, hc.y - hr * 0.1, hc.z - hr * 1.0], { len: 0.6, n: 2, drift: [0, -0.1], r0: 0.06, r1: 0.01, color: C.hair });
    for (let i = 0; i < 6; i++) { const a = i * 60; m.sphere(hr * 0.13, { at: [hr * 0.7 + Math.cos(a) * hr * 0.2, hc.y + hr * 1.1 + Math.sin(a) * hr * 0.2, hc.z - hr * 0.3], bone: head, color: C.gold, glow: true, ao: 0 }); }
    m.seg([hr * 0.6, hc.y + hr * 0.9, hc.z - hr * 0.4], [hr * 1.5, hc.y + hr * 1.6, hc.z - hr * 0.5], 0.01, 0.006, { bone: head, color: C.brown });
    flap(m, 'RobeF', { at: [0, 0.1], top: y(0.52), bottom: y(0.15), wTop: 0.22, wBot: 0.32, color: C.robe, color2: C.robe2 });
    flap(m, 'RobeB', { at: [0, -0.1], top: y(0.52), bottom: y(0.15), wTop: 0.24, wBot: 0.34, color: C.robe2, color2: C.robe });
    m.torus(0.1, 0.025, { at: [0, y(0.56), 0], rot: [90, 0, 0], bone: hips, color: C.brown, seg: 16 });
    m.sphere(1, { radii: [0.05, 0.075, 0.045], at: [0.13, y(0.5), 0.05], bone: hips, color: C.green });   // bầu thuốc
    m.cyl(0.02, 0.02, 0.04, { at: [0.13, y(0.5) + 0.08, 0.05], bone: hips, color: C.brown });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.65, 0.35, 0.036, { bone: BONE('Forearm' + sd), color: '#ffffff' }); }
    for (const sd of [1, -1]) for (let i = 0; i < 3; i++) m.cyl(0.003, 0.003, 0.13, { at: [sd * 0.05, y(0.72) + i * 0.02, 0.13], rot: [0, 0, 90], bone: chest, color: '#dfe6ee', seg: 4 }); // kim châm
    return ctx;
  },
};
