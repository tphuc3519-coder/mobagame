// Pháo Hoa — Cô Nàng Pháo Tết (09 §4.13)
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, dangle, leaf, handPos, along, place, orient, orientZ, band, flap, spike } from '../parts.mjs';

const C = { skin: '#f3cbb0', red: '#e53e3e', red2: '#a82626', yellow: '#f6e05e', dark: '#1a1a2e', pink: '#ffb3c1', bamboo: '#b5c46a', bamboo2: '#7f9a3e', soot: '#3a2f2f', hair: '#3a2418', blue: '#5fa8ff' };

export default {
  name: 'Pháo Hoa', glow: '#ffb347',
  palette: ['#e53e3e', '#f6e05e', '#1a1a2e', '#ffb3c1'], rim: '#f6e05e',
  hitTime: { Attack1: 0.3, Attack2: 0.3 },
  anim: { style: { atk1: 'shoulderFire', atk2: 'shoulderFire', cast1: 'pushL', cast2: 'raise2', ult: 'shoulderFire' }, run: { hold: 'both', amp: 35, arm: 0.5, bob: 0.02, lean: 8 }, idle: 'calm', moveSpeed: 320, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.65, headS: 1.1, shoulder: 0.146, chestW: 0.115, chestD: 0.072, waistW: 0.085, hipW: 0.106, armR: 0.023, legR: 0.036, legOut: 0.048,
      skin: C.skin, top: C.red, pelvis: C.dark, thigh: C.dark, shin: C.dark, boot: C.red2, bootTop: C.yellow, arm: C.yellow, forearm: C.skin, hand: C.skin,
      armL: 'ready', armR_: 'raised', handR: 0.026, brow: '#3a2418',
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — hai búi tóc cài pháo nhỏ, má lấm muội —
    m.sphere(1, { radii: [hr * 1.04, hr * 1.04, hr * 1.06], at: [0, hc.y + hr * 0.13, hc.z - hr * 0.16], bone: head, color: C.hair, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 1.0, hr * 0.28, hr * 0.44], at: [0, hc.y + hr * 0.74, hc.z + hr * 0.6], rot: [-14, 0, 0], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 0.2, hr * 0.6, hr * 0.3], at: [hr * 0.9, hc.y - hr * 0.15, hc.z + hr * 0.06], bone: head, color: C.hair, mirror: true });
    for (const s of [1, -1]) {
      m.sphere(hr * 0.42, { at: [s * hr * 0.78, hc.y + hr * 0.95, hc.z - hr * 0.1], bone: head, color: C.hair });
      m.cyl(0.018, 0.018, 0.13, { at: [s * hr * 0.92, hc.y + hr * 1.45, hc.z - hr * 0.1], rot: [0, 0, s * -22], bone: head, color: C.red });
      m.cyl(0.019, 0.019, 0.02, { at: [s * hr * 0.92, hc.y + hr * 1.5, hc.z - hr * 0.1], rot: [0, 0, s * -22], bone: head, color: C.yellow });
      m.sphere(0.012, { at: [s * (hr * 0.92 + 0.03), hc.y + hr * 1.7, hc.z - hr * 0.1], bone: head, color: '#ffd76a', glow: true, ao: 0 });
      m.sphere(1, { radii: [hr * 0.13, hr * 0.09, hr * 0.03], at: [s * hr * 0.55, hc.y - hr * 0.3, hc.z + hr * 0.9], bone: head, color: C.soot, ao: 0 });
    }
    // — yếm đỏ, áo khoác ngắn vàng, dây lưng, túi pháo —
    m.extrude([[0, -0.15], [0.1, 0], [0, 0.17], [-0.1, 0]], 0.01, { at: [0, y(0.68), 0.075 + ctx.zs(0.68)], bone: chest, color: C.red, color2: C.red2, bevel: false, ao: 0.1 });
    m.extrude([[0, -0.17], [0.12, 0], [0, 0.19], [-0.12, 0]], 0.008, { at: [0, y(0.68), 0.07 + ctx.zs(0.68)], bone: chest, color: C.yellow, bevel: false, ao: 0.1 });
    flap(m, 'JacketB', { at: [0, -0.085], top: y(0.66), bottom: y(0.46), wTop: 0.28, wBot: 0.34, bone: BONE('Chest'), color: C.yellow, color2: '#c9a83a', pivotY: y(0.62) });
    flap(m, 'PantsF', { at: [0, 0.1], top: y(0.5), bottom: y(0.34), wTop: 0.22, wBot: 0.3, color: C.dark, color2: '#2a2a44' });
    m.torus(0.108, 0.026, { at: [0, y(0.535), 0], rot: [90, 0, 0], bone: hips, color: C.red, seg: 18 });
    m.box(0.13, 0.11, 0.07, { at: [0.15, y(0.5), 0.02], rot: [0, 0, -10], bone: hips, color: '#8a5a2b' });
    for (const [dx, col, len] of [[-0.03, C.red, 0.16], [0.0, C.blue, 0.2], [0.03, C.yellow, 0.15]]) {
      m.cyl(0.009, 0.009, len, { at: [0.15 + dx, y(0.5) + 0.06 + len / 2, 0.02], rot: [0, 0, -10 + dx * 300], bone: hips, color: col, seg: 6 });
      m.sphere(0.013, { at: [0.15 + dx + dx * 2, y(0.5) + 0.07 + len, 0.02], bone: hips, color: '#ffd76a', glow: true, ao: 0 });
    }
    for (let i = 0; i < 3; i++) m.cyl(0.011, 0.011, 0.09, { at: [-0.05 + i * 0.05, y(0.535) - 0.05, 0.105], bone: hips, color: C.red, seg: 6 });
    for (const sd of ['L', 'R']) { const d = ctx.armDirs[sd]; band(m, d.E.toArray(), d.W.toArray(), 0.2, 0.06, 0.03, { bone: BONE('Forearm' + sd), color: C.red }); m.torus(0.04, 0.01, { at: [(sd === 'L' ? 1 : -1) * 0.1, y(0.08), 0], rot: [90, 0, 0], bone: BONE('Shin' + sd), color: C.yellow }); }
    // — ống phóng pháo tre lớn vác vai —
    const hp = handPos(ctx, 'R'), HR = BONE('HandR');
    const dir = [0.0, 0.3, 1];
    const p0 = [hp[0] - 0.02, hp[1] + 0.02, hp[2] - 0.62], p1 = along(p0, dir, 1.35);
    m.seg(p0, p1, 0.085, 0.095, { bone: HR, color: C.bamboo, color2: C.bamboo2, noCap0: false, noCap1: true, seg: 12 });
    for (let i = 0; i < 5; i++) { const t = 0.12 + i * 0.2; const p = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t]; m.torus(0.094 + i * 0.002, 0.012, { at: p, rot: orientZ(dir), bone: HR, color: '#8a9a44', seg: 14 }); }
    m.torus(0.1, 0.02, { at: p1, rot: orientZ(dir), bone: HR, color: C.red2, seg: 14 });
    m.sphere(1, { radii: [0.075, 0.075, 0.02], at: along(p1, dir, -0.02), rot: orientZ(dir), bone: HR, color: '#ff9a3a', glow: true, ao: 0 });
    m.seg(along(p0, dir, 0.1), along(p0, dir, 0.1).map((v, i) => v + [0, 0.1, -0.05][i]), 0.006, 0.006, { bone: HR, color: '#d8c890', seg: 4 });
    m.sphere(0.02, { at: [p0[0], p0[1] + 0.13, p0[2] + 0.03], bone: HR, color: '#ffe08a', glow: true, ao: 0 });
    m.torus(0.06, 0.018, { at: [p0[0], p0[1] - 0.09, p0[2] + 0.5], rot: [0, 90, 0], bone: HR, color: C.hair });
    for (const [x, yy, z] of [[0.3, 1.5, 0.3], [-0.35, 1.7, 0.4]]) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; m.sphere(0.018, { at: [x + Math.sin(a) * 0.12, yy + Math.cos(a) * 0.12, z], bone: BONE('Root'), color: k % 2 ? '#ffd76a' : '#ff8aa0', glow: true, ao: 0 }); }
    return ctx;
  },
};
