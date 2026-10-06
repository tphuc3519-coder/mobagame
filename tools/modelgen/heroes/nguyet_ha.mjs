// Moonstream — Guide of the Moon River (09 §4.9)
import { humanoid, BONE, hairLocks } from '../humanoid.mjs';
import { swayChain, tube, ribbon, dangle, handPos, band, wy } from '../parts.mjs';
import { smooth } from '../kit.mjs';
import { moonAnim } from './nguyet_ha.anim.mjs';

const C = { skin: '#f3dccd', hair: '#e2e8f4', hair2: '#a8c2ea', robe: '#1d2b64', robe2: '#0f1a44', blue: '#8fd3ff', pale: '#e8f4ff', gold: '#c9a24a' };

export default {
  name: 'Moonstream', glow: '#8fd3ff',
  palette: ['#1d2b64', '#8fd3ff', '#e8f4ff', '#c9a24a'], rim: '#8fd3ff',
  hitTime: { Attack1: 0.26, Attack2: 0.26, Ult: 0.8 }, // Ult: lũ dâng đúng lúc vùng nổ (delay 0.8s của chiêu)
  import: { // model liền khối có texture do hoạ sĩ gửi (thân / đầu+tóc / mắt, 3 vật liệu): xem import_fused.mjs; build() bên dưới là bản sinh bằng code cũ, không còn dùng
    // Tư thế trong file: đứng thẳng, tay trái buông, tay phải gập khuỷu nâng chiếc bình bạc trước bụng; váy dài chạm đất, không có chân bên trong (chỉ có đôi giày).
    mode: 'fused', file: './imports/moonstream_pbr_game.glb', simplify: { tris: { body: 16000, head: 14000 }, error: 0.05, flags: ['Permissive'] },
    texMax: { base: 1024, normal: 1024, mr: 512 }, compress: true,
    shading: 'pbr', // texture PBR (màu nền không vẽ sẵn sáng tối): giữ vật liệu gốc + ánh sáng môi trường; toon làm váy tối và tóc xám, unlit thì phẳng, bình bạc như nhựa
    showcase: { file: './imports/moonstream_pbr_hq.glb', simplify: { tris: { body: 60000, head: 50000 }, error: 0.02, flags: ['Permissive'] }, texMax: { base: 2048, normal: 2048, mr: 1024 }, // bản trưng bày ở sảnh (LOD0)
      outline: false }, // nhìn gần, viền đen kẻ thành vệt trên từng lọn tóc mảnh
    centerX: 0.04, centerZ: -0.02, bodyTop: 1.89, height: 2.0, // bodyTop = đỉnh tóc kể cả hai kẹp tóc
    rig: { // toạ độ tương đối thân (đơn vị file gốc): x + = bên trái nhân vật, z + = phía trước
      Hips: [0, 0.95, 0], Spine: [0, 1.12, 0], Chest: [0, 1.32, 0], Neck: [0.005, 1.52, -0.03], Head: [0.005, 1.6, -0.02], HeadTop: [0.005, 1.85, -0.03],
      ThighL: [0.09, 0.92, 0], ShinL: [0.07, 0.5, 0], FootL: [0.03, 0.08, 0.05], ToeL: [0.03, 0.02, 0.18],
      ThighR: [-0.09, 0.92, 0], ShinR: [-0.07, 0.5, 0], FootR: [-0.03, 0.08, -0.06], ToeR: [-0.03, 0.02, 0.05],
      UpperArmL: [0.14, 1.47, -0.05], ForearmL: [0.225, 1.19, -0.09], HandL: [0.28, 0.975, -0.015], HandL_Tip: [0.29, 0.84, 0.02],
      UpperArmR: [-0.14, 1.47, -0.05], ForearmR: [-0.225, 1.2, -0.06], HandR: [-0.245, 1.14, 0.18], HandR_Tip: [-0.26, 1.11, 0.32], HandEndR: [-0.255, 1.11, 0.28],
    },
    weapon: { a: [-0.25, 1.12, 0.29], b: [-0.25, 1.25, 0.29], r: 0.06, hard: 0.05, cut: 0.002 }, // chiếc bình bạc trên tay phải: gắn cứng vào bàn tay
    merge: { ThighL: 'Hips', ThighR: 'Hips', ShinL: 'Hips', ShinR: 'Hips' }, // váy liền không có chân bên trong: thân váy theo hông + 4 xương váy, chân chỉ kéo đôi giày
    radii: { Hips: 0.4, Spine: 0.38, Chest: 0.35, Neck: 0.3, Head: 0.4, UpperArmL: 0.3, UpperArmR: 0.3, ForearmL: 0.3, ForearmR: 0.3, HandL: 0.3, HandR: 0.3, FootL: 0.4, FootR: 0.4 },
    softness: 0.009, // vùng chuyển giữa hai xương hẹp: thân áo không bị tay áo phồng kéo theo
    allow: { head: ['Head', 'Neck', 'Chest', 'Spine'], eyes: ['Head'] }, // tóc dài chỉ theo đầu/cổ/ngực (không dính vào tay); mắt cứng theo đầu
    skirt: { max: 0.92, from: 0.0, span: 0.15, gap0: 0.0, gap1: 0.04 },
    minComponent: 4,
    portrait: { dist: 1.5, dy: -0.12 },
  },
  anim: moonAnim,
  build(id) {
    const ctx = humanoid(id, {
      H: 1.78, headS: 1.06, shoulder: 0.15, chestW: 0.12, chestD: 0.074, waistW: 0.083, hipW: 0.108, armR: 0.023, legR: 0.036, legOut: 0.048,
      skin: C.skin, top: C.robe, pelvis: C.robe2, thigh: C.robe2, shin: C.robe2, boot: C.pale, bootTop: C.robe2, arm: C.robe, forearm: C.skin, hand: C.skin,
      armL: 'ready', armR_: 'ready', handR: 0.026, brow: '#8794b0', eye: '#4a6aa8',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — tóc bạc dài chạm đất —
    hairLocks(ctx, { color: C.hair, color2: C.hair2, shine: '#ffffff', bangs: 7, side: 1.8, back: 1.3, spiky: 0.1, part: 0.2 });
    const hp0 = [[0, hc.y + hr * 0.1, hc.z - hr * 1.0], [0, y(0.78), -0.16], [0, y(0.56), -0.22], [0, y(0.34), -0.22], [0, y(0.13), -0.18], [0, 0.04, -0.13]];
    const hb = swayChain(m, head, 'Hair', hp0.slice(1));
    ribbon(m, hb, hp0, [0.2, 0.3, 0.34, 0.34, 0.3, 0.2], { color: C.hair, color2: C.hair2 });
    tube(m, hb, hp0, [0.06, 0.08, 0.075, 0.07, 0.06, 0.02], { color: C.hair, color2: C.hair2 });
    for (const s of [1, -1]) dangle(m, head, 'Front' + (s > 0 ? 'L' : 'R') + '', [s * hr * 0.88, hc.y - hr * 0.4, hc.z + hr * 0.1], { len: 0.7, n: 2, drift: [s * 0.05, 0.04], r0: 0.03, r1: 0.006, color: C.hair, color2: C.hair2 });
    // vương miện trăng khuyết
    m.torus(hr * 0.55, hr * 0.09, { at: [0, hc.y + hr * 0.95, hc.z + hr * 0.5], rot: [-18, 0, 153], arc: Math.PI * 1.3, bone: head, color: C.pale, glow: true, seg: 18, ao: 0 });
    m.sphere(hr * 0.09, { at: [0, hc.y + hr * 0.5, hc.z + hr * 1.0], bone: head, color: C.blue, glow: true, ao: 0 });
    // — áo lụa xanh đêm, váy dài chạm đất —
    const yTop = y(0.575), swR = BONE('SwayRobe1');
    m.joint(swR, hips, 0, y(0.4), 0);
    const secs = [{ y: 0.03, rx: 0.5, rz: 0.46 }, { y: y(0.09), rx: 0.42, rz: 0.39 }, { y: y(0.22), rx: 0.33, rz: 0.3 }, { y: y(0.36), rx: 0.24, rz: 0.21 }, { y: y(0.48), rx: 0.16, rz: 0.14 }, { y: yTop + 0.03, rx: 0.108, rz: 0.09 }];
    m.loft(secs, { bone: hips, color: C.robe, color2: C.robe2, seg: 22, ao: 0.3,
      weights: (p) => { const w = 0.78 * (1 - smooth(y(0.06), y(0.5), p.y)); return w < 0.01 ? [[hips, 1]] : [[hips, 1 - w], [swR, w]]; } });
    for (const [yy, r] of [[y(0.36), 0.245], [y(0.22), 0.335], [y(0.09), 0.425]]) m.torus(r, 0.014, { at: [0, yy, 0], rot: [90, 0, 0], bone: hips, color: C.blue, glow: true, ao: 0, seg: 28,
      weights: (p) => { const w = 0.78 * (1 - smooth(y(0.06), y(0.5), p.y)); return [[hips, 1 - w], [swR, w]]; } });
    m.torus(0.5, 0.02, { at: [0, 0.035, 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 30,
      weights: (p) => [[hips, 0.22], [swR, 0.78]] });
    m.torus(0.1, 0.028, { at: [0, y(0.575), 0], rot: [90, 0, 0], bone: hips, color: C.gold, seg: 18 });
    m.box(0.06, 0.28, 0.012, { at: [0, y(0.4), 0.28], rot: [-9, 0, 0], bone: hips, color: C.pale, color2: C.blue, glow: false, ao: 0.1, weights: (p) => [[hips, 0.4], [swR, 0.6]] });
    // tay áo rộng lụa
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      m.seg(d.E.toArray(), d.W.toArray(), 0.05, 0.11, { bone: BONE('Forearm' + sd), color: C.robe, color2: C.blue, noCap0: true, noCap1: true, seg: 12, ao: 0.2 });
    }
    m.torus(0.05, 0.012, { at: [0, y(0.795), 0.0], rot: [80, 0, 0], bone: chest, color: C.gold });
    // — dải lụa nước và giọt sáng quanh người —
    for (const [yy, R, tilt, rz] of [[y(0.55), 0.6, 20, 0], [y(0.72), 0.5, -24, 30], [y(0.38), 0.68, 10, -20]]) m.torus(R, 0.014, { at: [0, yy, 0], rot: [90 + tilt, rz, 0], arc: Math.PI * 1.55, bone: BONE('Root'), color: C.blue, glow: true, ao: 0, seg: 32 });
    for (const [x, yy, z, r] of [[0.55, y(0.6), 0.2, 0.035], [-0.5, y(0.8), -0.2, 0.03], [0.1, y(0.42), 0.62, 0.03], [-0.3, y(0.3), 0.5, 0.025]]) m.sphere(r, { at: [x, yy, z], bone: BONE('Root'), color: C.pale, glow: true, ao: 0 });
    // giọt sáng trong lòng bàn tay phải
    const hp = handPos(ctx, 'R');
    m.sphere(0.06, { at: [hp[0], hp[1] + 0.1, hp[2] + 0.05], bone: BONE('HandR'), color: C.pale, glow: true, ao: 0 });
    m.torus(0.09, 0.008, { at: [hp[0], hp[1] + 0.1, hp[2] + 0.05], rot: [70, 0, 0], bone: BONE('HandR'), color: C.blue, glow: true, ao: 0, seg: 20 });
    return ctx;
  },
};
