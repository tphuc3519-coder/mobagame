// Kiếm Mây — Kiếm Khách Trên Mây (09 §4.5)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, tube, ribbon, dangle, flap, handPos, along, place, orient, band, spike } from '../parts.mjs';

const C = { skin: '#f0d8c2', white: '#e2eafa', white2: '#c4d4ee', blue: '#7fb6ff', navy: '#2c3e70', steel: '#c9d2e2', gold: '#d7b25a', hair: '#dfe4ee', hair2: '#aeb8cc', leather: '#3a3a52' };

export default {
  name: 'Kiếm Mây', glow: '#bfe4ff',
  palette: ['#eaf2ff', '#7fb6ff', '#2c3e70', '#c0c8d8'], rim: '#9fd0ff',
  hitTime: { Attack1: 0.26, Attack2: 0.26 },
  anim: { style: { atk1: 'slashR', atk2: 'jabR', cast1: 'slashR', cast2: 'sweep2', ult: 'slashCombo' }, run: { hold: 'R', amp: 38, arm: 0.8, bob: 0.02, lean: 12 }, idle: 'calm', moveSpeed: 330, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.9, headS: 1.0, shoulder: 0.158, chestW: 0.128, chestD: 0.08, waistW: 0.093, hipW: 0.112, armR: 0.026, legR: 0.038, legOut: 0.05,
      skin: C.skin, top: C.white, pelvis: C.navy, thigh: C.navy, shin: C.navy, boot: C.white2, bootTop: C.navy, arm: C.white, forearm: C.white2, hand: C.skin,
      armL: 'down', armR_: 'ready', handR: 0.028, brow: '#7c8598', eye: '#39456b',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — tóc bạc buộc nửa —
    m.sphere(1, { radii: [hr * 1.03, hr * 1.06, hr * 1.05], at: [0, hc.y + hr * 0.12, hc.z - hr * 0.15], bone: head, color: C.hair, color2: C.hair2, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.3, hr * 0.45], at: [0, hc.y + hr * 0.72, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 0.16, hr * 0.7, hr * 0.28], at: [hr * 0.9, hc.y - hr * 0.2, hc.z + hr * 0.05], bone: head, color: C.hair, mirror: true });
    m.sphere(hr * 0.32, { at: [0, hc.y + hr * 0.95, hc.z - hr * 0.5], bone: head, color: C.hair });
    m.torus(hr * 0.26, hr * 0.05, { at: [0, hc.y + hr * 0.85, hc.z - hr * 0.5], rot: [80, 0, 0], bone: head, color: C.navy });
    dangle(m, head, 'Hair', [0, hc.y + hr * 0.6, hc.z - hr * 0.7], { len: 0.75, n: 3, drift: [0, -0.1], r0: 0.055, r1: 0.008, color: C.hair, color2: C.hair2 });
    // — áo choàng trắng xanh xẻ tà —
    m.loft([{ y: y(0.58), rx: 0.13, rz: 0.1 }, { y: y(0.5), rx: 0.15, rz: 0.115 }, { y: y(0.42), rx: 0.17, rz: 0.13 }], { bone: hips, color: C.white, color2: C.white2, seg: 18 });
    flap(m, 'CoatFL', { at: [0.085, 0.115], top: y(0.5), bottom: y(0.17), wTop: 0.15, wBot: 0.19, rotY: 4, color: C.white, color2: C.blue });
    flap(m, 'CoatFR', { at: [-0.085, 0.115], top: y(0.5), bottom: y(0.17), wTop: 0.15, wBot: 0.19, rotY: -4, color: C.white, color2: C.blue });
    flap(m, 'CoatB', { at: [0, -0.115], top: y(0.5), bottom: y(0.13), wTop: 0.3, wBot: 0.4, color: C.white2, color2: C.blue });
    flap(m, 'CoatSL', { at: [0.15, 0], top: y(0.5), bottom: y(0.22), wTop: 0.18, wBot: 0.22, rotY: 90, color: C.white2, color2: C.blue });
    flap(m, 'CoatSR', { at: [-0.15, 0], top: y(0.5), bottom: y(0.22), wTop: 0.18, wBot: 0.22, rotY: 90, color: C.white2, color2: C.blue });
    m.torus(0.1, 0.02, { at: [0, y(0.57), 0.0], rot: [90, 0, 0], bone: hips, color: C.navy, seg: 18 });
    m.box(0.05, 0.05, 0.02, { at: [0, y(0.57), 0.105], bone: hips, color: C.gold });
    // cổ áo chéo, viền xanh
    m.box(0.02, 0.22, 0.02, { at: [0.05, y(0.72), 0.11 + ctx.zs(0.72)], rot: [0, 0, -18], bone: chest, color: C.blue, ao: 0 });
    m.box(0.02, 0.22, 0.02, { at: [-0.05, y(0.72), 0.11 + ctx.zs(0.72)], rot: [0, 0, 18], bone: chest, color: C.blue, ao: 0 });
    // khăn lụa dài
    const sp = [[0, y(0.79), -0.07], [0.03, y(0.7), -0.16], [-0.02, y(0.6), -0.24], [0.04, y(0.5), -0.3], [-0.03, y(0.4), -0.34]];
    const sb = swayChain(m, chest, 'Scarf', sp.slice(1));
    ribbon(m, sb, sp, [0.09, 0.13, 0.15, 0.15, 0.13], { color: C.blue, color2: C.white });
    m.torus(0.06, 0.022, { at: [0, y(0.795), 0.0], rot: [80, 0, 0], bone: chest, color: C.blue });
    // giáp cổ tay
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.6, 0.35, 0.034, { bone: BONE('Forearm' + sd), color: C.navy }); }
    // — kiếm dài lưỡi vân mây —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    const dir = [-0.04, 1, 0.16];
    const g = along(hp, dir, 0.11), tipP = along(hp, dir, 1.18);
    m.seg(along(hp, dir, -0.16), g, 0.017, 0.017, { bone: HR, color: C.leather });
    for (let i = 0; i < 4; i++) band(m, along(hp, dir, -0.16), g, 0.15 + i * 0.22, 0.05, 0.02, { bone: HR, color: C.navy });
    m.sphere(0.026, { at: along(hp, dir, -0.18), bone: HR, color: C.gold });
    const rot = orient(dir);
    m.box(0.11, 0.018, 0.026, { at: g, rot, bone: HR, color: C.gold, flat: false });
    m.extrude([[-0.016, 0], [0.016, 0], [0.011, 1.0], [0, 1.06], [-0.011, 1.0]].map(([x, yy]) => [x, yy]), 0.006, { at: g, rot, bone: HR, color: C.steel, color2: '#eef4ff', bevel: false, ao: 0.1 });
    m.extrude([[-0.004, 0.05], [0.004, 0.05], [0.004, 0.9], [-0.004, 0.9]], 0.009, { at: g, rot, bone: HR, color: '#a8d4ff', glow: true, bevel: false, ao: 0 });
    // vỏ kiếm ở hông trái
    m.seg([0.16, y(0.55), 0.02], [0.26, y(0.34), -0.35], 0.02, 0.016, { bone: hips, color: C.navy, noCap0: true });
    m.torus(0.022, 0.006, { at: [0.19, y(0.5), -0.07], rot: [50, 0, 0], bone: hips, color: C.gold });
    // — mây quanh chân —
    for (const [x, z, r] of [[0.16, 0.1, 0.13], [-0.14, 0.14, 0.11], [0.05, -0.16, 0.14], [-0.2, -0.05, 0.1], [0.22, -0.08, 0.09], [0, 0.22, 0.09]]) m.sphere(1, { radii: [r, r * 0.55, r], at: [x, 0.04 + r * 0.2, z], bone: BONE('Root'), color: '#f6faff', color2: '#cddcf5', ao: 0.15 });
    return ctx;
  },
};
