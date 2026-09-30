// Trâu Đồng — Chiến Binh Trống Trận (09 §4.2)
import { humanoid, BONE } from '../humanoid.mjs';
import { curve, arcPts, pauldron, handPos, band, bronzeDrum, along, place, orient, spike } from '../parts.mjs';
import { V } from '../kit.mjs';

const C = { skin: '#7d4d2c', skin2: '#5e3820', pants: '#3a2418', bronze: '#9a6a30', bronze2: '#6b4720', gold: '#d9a441', red: '#e0513b', horn: '#e8dcc0', dark: '#2a1a10', ink: '#3a2010' };

export default {
  name: 'Trâu Đồng', glow: '#ffc65a',
  palette: ['#8a5a2b', '#d9a441', '#3a2418', '#e0513b'], rim: '#d9a441',
  hitTime: { Attack1: 0.32, Attack2: 0.32 },
  anim: { style: { atk1: 'chopR', atk2: 'chopL', cast1: 'push2', cast2: 'drum', ult: 'leapSlam' }, run: { hold: 'both', amp: 32, arm: 0.3, bob: 0.03, lean: 12, twist: 5 }, idle: 'heavy', moveSpeed: 315, swayAmp: 6 },
  build(id) {
    const ctx = humanoid(id, {
      H: 2.25, headS: 0.86, shoulder: 0.2, chestW: 0.19, chestD: 0.125, waistW: 0.14, hipW: 0.15, armR: 0.052, legR: 0.058, legOut: 0.064, hunch: 0.02,
      skin: C.skin, top: C.skin, pelvis: C.pants, thigh: C.pants, shin: C.skin2, boot: '#1e120a', bootTop: C.skin2, arm: C.skin, forearm: C.skin, hand: C.skin2,
      armL: 'ready', armR_: 'ready', handR: 0.055, face: false, skip: ['head'], neckR: 0.045,
    });
    const { m, H, hr, hc, y } = ctx;
    const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    // — đầu trâu —
    const hz = hc.z;
    m.sphere(1, { radii: [hr * 0.98, hr * 1.02, hr * 1.18], at: [0, hc.y, hz + hr * 0.15], bone: head, color: C.skin, color2: C.skin2, wseg: 16, hseg: 12 });
    m.sphere(1, { radii: [hr * 0.68, hr * 0.56, hr * 0.78], at: [0, hc.y - hr * 0.42, hz + hr * 1.2], bone: head, color: '#8a5a3a', wseg: 14, hseg: 10 });
    m.sphere(1, { radii: [hr * 0.08, hr * 0.06, hr * 0.06], at: [hr * 0.22, hc.y - hr * 0.42, hz + hr * 1.9], bone: head, color: C.dark, mirror: true, ao: 0 });
    m.torus(hr * 0.22, hr * 0.045, { at: [0, hc.y - hr * 0.68, hz + hr * 1.86], rot: [0, 0, 0], bone: head, color: C.gold, seg: 14 });
    m.sphere(1, { radii: [hr * 0.15, hr * 0.13, hr * 0.06], at: [hr * 0.5, hc.y + hr * 0.18, hz + hr * 1.02], bone: head, color: '#ffd76a', mirror: true, ao: 0 });
    m.sphere(1, { radii: [hr * 0.07, hr * 0.06, hr * 0.03], at: [hr * 0.5, hc.y + hr * 0.18, hz + hr * 1.08], bone: head, color: '#1b1b22', mirror: true, ao: 0 });
    m.sphere(1, { radii: [hr * 0.55, hr * 0.16, hr * 0.28], at: [hr * 0.98, hc.y + hr * 0.2, hz - hr * 0.1], rot: [0, 0, -18], bone: head, color: C.skin2, mirror: true, ao: 0.2 });
    // sừng cong bọc đồng
    for (const [t0, t1] of [[0, 0.62], [0.6, 1]]) {
      const pts = arcPts([hr * 0.85 + 0.0, hc.y + hr * 0.5 + 0.3], 0.3, -90 + t0 * 150, -90 + t1 * 150, 6, hz - hr * 0.05);
      const r0 = 0.058 - t0 * 0.045, r1 = 0.058 - t1 * 0.045;
      curve(m, pts, pts.map((_, i) => r0 + (r1 - r0) * (i / (pts.length - 1)) + (t0 ? 0.012 : 0)), { bone: head, color: t0 ? C.gold : C.horn, color2: t0 ? C.bronze : '#bfae8a', mirror: true, ao: 0.2 });
    }
    m.torus(hr * 0.24, hr * 0.06, { at: [hr * 0.85, hc.y + hr * 0.5, hz - hr * 0.05], rot: [90, 0, 0], bone: head, color: C.bronze, mirror: true, seg: 14 });
    // — ngực trần xăm chim Lạc, giáp vai đồng, dải vải đỏ —
    for (const [dx, dy, r, s] of [[0.09, 0.72, 20, 1], [0.13, 0.68, -20, 1], [0.05, 0.66, 70, 0.8]]) m.torus(0.035 * s * (H / 2), 0.008, { at: [dx * H * 0.9, y(dy), 0.15 + ctx.zs(dy)], rot: [0, 0, r], arc: Math.PI * 1.5, bone: chest, color: C.ink, mirror: true, ao: 0 });
    pauldron(m, ctx, 'L', { r: 0.17, color: C.bronze, trim: C.gold, spikes: 3 });
    pauldron(m, ctx, 'R', { r: 0.17, color: C.bronze, trim: C.gold, spikes: 3 });
    m.seg([-0.24, y(0.78), 0.06 + ctx.zs(0.78)], [0.2, y(0.5), 0.16], 0.05, 0.05, { bone: chest, color: C.red, noCap0: true, noCap1: true, scale: [1, 1, 0.25], seg: 8, ao: 0.1,
      blend: undefined, weights: (p) => (p.y > y(0.62) ? [[chest, 1]] : [[hips, 1]]) });
    m.torus(0.16, 0.035, { at: [0, y(0.53), 0], rot: [90, 0, 0], bone: hips, color: C.red, seg: 18 });
    m.panel(0.22, 0.26, 0.55, { at: [0, y(0.53) - 0.28, 0.14], bone: hips, color: C.red, color2: '#8a2a1c', ao: 0.1, weights: (p) => [[hips, 1]] });
    m.panel(0.24, 0.3, 0.5, { at: [0, y(0.53) - 0.26, -0.13], bone: hips, color: C.red, color2: '#8a2a1c', ao: 0.1 });
    for (const sd of ['L', 'R']) {
      const d = ctx.armDirs[sd];
      band(m, d.E.toArray(), d.W.toArray(), 0.55, 0.42, 0.072, { bone: BONE('Forearm' + sd), color: C.bronze, color2: C.bronze2 });
      band(m, d.E.toArray(), d.W.toArray(), 0.2, 0.05, 0.08, { bone: BONE('Forearm' + sd), color: C.gold });
    }
    // trống đồng nhỏ bên hông
    bronzeDrum(m, { at: [0.34, y(0.45), 0.02], r: 0.15, h: 0.14, bone: hips });
    m.cyl(0.012, 0.012, 0.25, { at: [0.2, y(0.5), 0.02], rot: [0, 0, 60], bone: hips, color: C.red });
    // — hai dùi trống đồng —
    for (const [sd, sgn] of [['R', -1], ['L', 1]]) {
      const hp = handPos(ctx, sd);
      const dir = [sgn * 0.12, 1, 0.22];
      const p0 = along(hp, dir, -0.3), p1 = along(hp, dir, 1.0);
      const B = BONE('Hand' + sd);
      m.seg(p0, p1, 0.03, 0.036, { bone: B, color: '#8a5a2b', color2: '#5a3a1a', noCap1: true });
      const rot = orient(dir);
      m.sphere(1, { radii: [0.115, 0.14, 0.115], at: place(dir, p1, [0, 0.1, 0]), rot, bone: B, color: C.bronze, color2: C.gold, wseg: 14, hseg: 10 });
      m.torus(0.112, 0.014, { at: place(dir, p1, [0, 0.1, 0]), rot: [rot[0] + 90, rot[1], rot[2]], bone: B, color: C.bronze2, seg: 14 });
      band(m, p0, p1, 0.15, 0.04, 0.036, { bone: B, color: C.red });
      band(m, p0, p1, 0.25, 0.04, 0.036, { bone: B, color: C.red });
    }
    return ctx;
  },
};
