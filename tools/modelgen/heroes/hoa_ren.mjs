// Emberforge — Blacksmith of Furnace Village (09 §4.4)
import { humanoid, BONE, hairLocks } from '../humanoid.mjs';
import { emberAnim } from './hoa_ren.anim.mjs';
import { belt, boots, flaps } from '../costume.mjs';
import { swayChain, tube, ribbon, curve, band, orient, along, place, handPos, wy, spike } from '../parts.mjs';

const notSkin = ([r, g, b]) => !(r > b + 40 && 0.3 * r + 0.59 * g + 0.11 * b > 90); // da ấm và sáng; gỗ/sắt/đồng của búa tối hoặc không ấm
const dark = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b < 60; // gỗ tối của cán búa; tóc đỏ (~80), da, vải sáng hơn của búa; da và tóc sáng hơn
const C = { skin: '#9b6440', pants: '#3b2b24', pants2: '#2f231e', iron: '#2a2a2e', iron2: '#45454c', leather: '#7a4524', leather2: '#4a2814', hair: '#2a1810', gold: '#ffd166', ember: '#ff7a1a' };

export default {
  name: 'Emberforge', glow: '#ff5a10',
  palette: ['#2a2a2e', '#ff7a1a', '#ffd166', '#6b3b1e'], rim: '#ff7a1a',
  hitTime: { Attack1: 0.26, Attack2: 0.22 },
  import: { // model liền khối có texture do hoạ sĩ gửi (hammer_pbr_20000.glb, tư thế vác búa, dạng chân rộng): xem import_fused.mjs; build() bên dưới là bản sinh bằng code cũ, không còn dùng
    // (bỏ deshard: trọng số đã làm mượt + tách vũ khí theo vùng nên không còn mảnh vụn; cắt tam giác chỉ tạo lỗ thủng)
    mode: 'fused', file: './imports/hammer_pbr_20000.glb',
    centerX: 0, centerZ: -0.12, bodyTop: 1.72, // bodyTop = đỉnh đầu (bỏ đầu búa khi tính chiều cao)
    rig: { // khớp theo tư thế trong file (x phải = trái nhân vật, z + = phía trước), tương đối trục thân
      Hips: [0.05, 0.88, 0], Spine: [0.04, 1.06, 0], Chest: [0.02, 1.26, 0], Neck: [-0.02, 1.46, 0.02], Head: [-0.03, 1.56, 0.03], HeadTop: [-0.03, 1.74, 0.03],
      ThighL: [0.17, 0.85, 0], ShinL: [0.33, 0.46, 0.05], FootL: [0.5, 0.12, 0], ToeL: [0.55, 0.03, 0.17],
      ThighR: [-0.1, 0.85, 0], ShinR: [-0.28, 0.5, 0], FootR: [-0.37, 0.15, 0], ToeR: [-0.38, 0.03, 0.17],
      UpperArmL: [0.2, 1.38, 0], ForearmL: [0.32, 1.18, 0.05], HandL: [0.42, 1.03, 0.1], HandL_Tip: [0.46, 0.93, 0.1],
      UpperArmR: [-0.22, 1.38, 0], ForearmR: [-0.38, 1.28, 0.25], HandR: [-0.05, 1.38, 0.47], HandR_Tip: [-0.08, 1.68, -0.46], HandEndR: [-0.03, 1.4, 0.62], // tip = tâm đầu búa; HandEndR = mút bàn tay (để trọng số không chạy dọc cả cán búa)
    },
    weapon: [ // core notSkin: phần lõi (≤ r, không phải da) luôn thuộc búa — các khúc cán giữa vòng đai không bị trả về thân, da vai sát cán thì vẫn được dọn
      { a: [-0.45, 1.68, -0.46], b: [0.3, 1.68, -0.46], r: 0.28, hard: 0.03, cut: 0.002, core: notSkin }, // đầu búa (trục dọc theo x)
      { a: [-0.08, 1.62, -0.23], b: [-0.03, 1.18, 0.92], r: 0.045, hard: 0.012, cut: 0.002, core: notSkin }, // cán búa, qua vai ra phía trước
    ],
    maxEdge: 0.3, // bỏ tam giác sợi chỉ
    radii: { Hips: 1.5, Spine: 1.4, Chest: 1.4 },
    skirt: { max: 0.9, from: 0.05, span: 0.5, gap0: 0.05, gap1: 0.2 }, // vải/khăn thả dưới hông đi theo 4 xương váy để đung đưa
    portrait: { dist: 1.9, dy: -0.1 },
  },
  anim: emberAnim,
  build(id) {
    const ctx = humanoid(id, {
      H: 1.95, headS: 0.98, shoulder: 0.2, chestW: 0.178, chestD: 0.108, waistW: 0.13, hipW: 0.14, armR: 0.042, legR: 0.052, legOut: 0.062,
      skin: C.skin, top: C.skin, pelvis: C.pants, thigh: C.pants, shin: C.pants2, boot: C.iron, bootTop: C.leather2, forearm: C.iron2, hand: C.iron,
      armL: 'ready', armR_: 'ready', handR: 0.042, brow: '#1a0e08',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), hips = BONE('Hips'), chest = BONE('Chest');
    // — tóc buộc cao —
    hairLocks(ctx, { color: C.hair, color2: '#c2461a', shine: '#ff9a50', bangs: 6, side: 0.6, back: 0.7, spiky: 1.4, part: -0.3, volume: 1.06 }); // tóc như lửa: đuôi tóc đỏ cam
    const tie = [0, hc.y + hr * 1.05, hc.z - hr * 0.55];
    m.torus(hr * 0.2, hr * 0.06, { at: tie, rot: [60, 0, 0], bone: head, color: C.leather });
    const pts = [tie, [0, tie[1] + 0.05, tie[2] - 0.14], [0, tie[1] - 0.06, tie[2] - 0.24], [0, tie[1] - 0.24, tie[2] - 0.26], [0, tie[1] - 0.44, tie[2] - 0.22]];
    const hb = swayChain(m, head, 'Tail', pts.slice(1));
    tube(m, hb, pts, [0.06, 0.07, 0.06, 0.045, 0.006], { color: C.hair, color2: '#4a2a18' });
    // ánh lửa trong mắt
    m.sphere(1, { radii: [hr * 0.11, hr * 0.09, hr * 0.06], at: [hr * 0.34, hc.y + hr * 0.02, hc.z + hr * 0.92], bone: head, color: '#ffb060', glow: true, mirror: true, ao: 0 });
    // — tạp dề da cháy sém, đai lưng, dụng cụ —
    const aTop = y(0.745), aBot = y(0.3);
    flaps(ctx, { color: '#35211a', sides: [1], at: 0.6, len: 0.3, width: 0.3 }); void aTop; void aBot;
    belt(ctx, { color: C.leather2, buckle: C.gold, at: 0.53 });
    boots(ctx, { color: C.iron, cuff: C.leather, top: 0.25 });
    m.panel(0.05, 0.05, 0.3, { at: [0.12, aTop + 0.1, 0.06], rot: [0, 0, 0], color: C.leather2, bone: chest, mirror: true });
    m.torus(0.145, 0.03, { at: [0, y(0.535), 0.005], rot: [90, 0, 0], bone: hips, color: C.leather2, seg: 20 });
    m.box(0.07, 0.06, 0.02, { at: [0, y(0.535), 0.148], bone: hips, color: '#c9a24a' });
    m.box(0.09, 0.11, 0.06, { at: [0.15, y(0.5), 0.06], rot: [0, 25, 0], bone: hips, color: C.leather });
    m.cyl(0.011, 0.011, 0.34, { at: [-0.16, y(0.44), 0.05], rot: [0, 0, -8], bone: hips, color: C.iron2 });
    m.cyl(0.011, 0.011, 0.34, { at: [-0.14, y(0.44), 0.06], rot: [0, 0, 6], bone: hips, color: C.iron2 });
    // vân kim loại nóng đỏ trên ngực, cánh tay
    for (const [dx, dy, r] of [[0.08, 0.7, 20], [0.11, 0.66, -30], [0.05, 0.63, 10]]) m.box(0.008, 0.06, 0.008, { at: [dx * H * 0.9, y(dy) + 0.03, 0.14], rot: [0, 0, r], bone: chest, color: '#ff8a30', glow: true, mirror: true, ao: 0 });
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      const E = d.E.toArray(), W = d.W.toArray();
      for (const t of [0.25, 0.7]) band(m, E, W, t, 0.06, 0.05, { bone: BONE('Forearm' + sd), color: '#ff7a20', glow: true, ao: 0 });
      band(m, E, W, 0.5, 0.1, 0.056, { bone: BONE('Forearm' + sd), color: C.iron });
      m.sphere(0.055, { at: d.E.toArray(), bone: BONE('UpperArm' + sd), color: C.iron2 });
    }
    // — búa rèn —
    const hp = handPos(ctx, 'R');
    const dir = [-0.12, 1, -0.3];
    const p0 = along(hp, dir, -0.3), p1 = along(hp, dir, 1.05);
    const HR = BONE('HandR');
    m.seg(p0, p1, 0.03, 0.03, { bone: HR, color: C.leather, color2: '#4a2814', noCap1: true });
    for (let i = 0; i < 6; i++) band(m, p0, p1, 0.1 + i * 0.03, 0.02, 0.036, { bone: HR, color: C.leather2 });
    m.sphere(0.04, { at: p0, bone: HR, color: C.iron2 });
    // đầu búa bát giác: thân sắt, hai mặt viền vàng có lõi lửa, đai rune rực, gai trên đỉnh
    const ax = [place(dir, p1, [1, 0, 0])[0] - p1[0], place(dir, p1, [1, 0, 0])[1] - p1[1], place(dir, p1, [1, 0, 0])[2] - p1[2]], rotX = orient(ax);
    const P = (x, yy = 0, z = 0) => place(dir, p1, [x, yy, z]);
    m.cyl(0.125, 0.125, 0.4, { at: p1, rot: rotX, bone: HR, color: C.iron2, color2: C.iron, seg: 8, flat: true });
    for (const s2 of [-1, 1]) {
      m.cyl(s2 > 0 ? 0.105 : 0.14, s2 > 0 ? 0.14 : 0.105, 0.05, { at: P(s2 * 0.225), rot: rotX, bone: HR, color: C.gold, seg: 8, flat: true });
      m.cyl(0.085, 0.085, 0.012, { at: P(s2 * 0.252), rot: rotX, bone: HR, color: '#ff6a18', glow: true, seg: 16, ao: 0 });
      m.torus(0.13, 0.012, { at: P(s2 * 0.12), rot: [...orient(ax)].map((v, i) => v + (i === 0 ? 90 : 0)), bone: HR, color: C.gold, seg: 16 });
    }
    m.cyl(0.128, 0.128, 0.05, { at: p1, rot: rotX, bone: HR, color: '#ff8a30', glow: true, seg: 8, flat: true, ao: 0 });
    m.cone(0.045, 0.16, { at: P(0, 0.19), rot: orient(dir), bone: HR, color: C.iron2, seg: 8 });
    m.sphere(0.03, { at: P(0, 0.12), bone: HR, color: C.gold });
    for (const [dx, dy, dz] of [[0.34, 0.2, 0.1], [-0.3, 0.3, -0.1], [0.28, -0.1, 0.15], [0.05, 0.36, 0.05]]) m.sphere(0.014, { at: P(dx, dy, dz), bone: HR, color: '#ffd166', glow: true, ao: 0 });
    // dải lụa đỏ bay từ đai lưng (xương lắc)
    const s0 = [0.13, y(0.53), 0.08], sp = [[0.17, y(0.44), 0.06], [0.2, y(0.34), 0.02], [0.22, y(0.24), -0.03], [0.23, y(0.15), -0.08]];
    const sb = swayChain(m, hips, 'Sash', sp);
    ribbon(m, sb, [s0, ...sp], [0.1, 0.11, 0.1, 0.09, 0.06], { color: '#c8301c', color2: '#ff9a3a' });
    return ctx;
  },
};
