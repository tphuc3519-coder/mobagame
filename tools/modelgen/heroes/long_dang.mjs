// Lồng Đăng — Người Giữ Đèn (09 §4.15)
import { humanoid, BONE, hairLocks } from '../humanoid.mjs';
import { jacket, sleeves, boots } from '../costume.mjs';
import { swayChain, tube } from '../parts.mjs';

const C = { ivory: '#fff1d8', ivory2: '#f3dcb4', gold: '#e2b04a', red: '#d8452f', hair: '#1c1620', wood: '#7a5230', shade: '#2b2b52', skin: '#f2cdb0' };

export default {
  name: 'Lồng Đăng', glow: '#ffb347',
  palette: ['#fff4e0', '#ffc15e', '#e0513b', '#2b2b52'], rim: '#ffc15e',
  hitTime: { Attack1: 0.3, Attack2: 0.27 },
  anim: { style: { atk1: 'swingR', atk2: 'chopR', cast1: 'pushR', cast2: 'sweep2', ult: 'raise2' }, run: { hold: 'R', amp: 33, arm: 0.55, bob: 0.018 }, swayAmp: 8, moveSpeed: 315 },
  build(id) {
    const ctx = humanoid(id, {
      H: 1.72, headS: 1.1, shoulder: 0.152, chestW: 0.122, waistW: 0.088, hipW: 0.118, armR: 0.024, legR: 0.038, legOut: 0.05,
      skin: C.skin, top: C.ivory, pelvis: C.ivory2, thigh: C.ivory2, shin: C.ivory2, arm: C.ivory, forearm: C.ivory, boot: C.red, bootTop: C.ivory2,
      armL: 'down', armR_: 'ready', handR: 0.026,
    });
    const { m, H, hr, hc, y } = ctx;
    const waistY = y(0.585);
    // — tóc dài, dải lụa —
    const head = BONE('Head');
    const pts = [[0, hc.y - 0.02, hc.z - hr * 0.95], [0, hc.y - 0.2, -0.17], [0, hc.y - 0.44, -0.2], [0, hc.y - 0.68, -0.17], [0, hc.y - 0.9, -0.12]];
    const hb = swayChain(m, head, 'Hair', pts.slice(1));
    tube(m, hb, pts, [0.11, 0.1, 0.085, 0.06, 0.012], { color: C.hair, color2: '#3a2c40', ao: 0.3 });
    hairLocks(ctx, { color: C.hair, color2: '#3a2c48', shine: '#9a88c8', bangs: 7, side: 1.5, back: 1.2, spiky: 0.15, part: 0.4 });
    m.torus(0.078, 0.014, { at: [0, pts[2][1] + 0.1, -0.2], rot: [90, 0, 0], bone: hb[2], color: C.red, seg: 14 });
    m.sphere(0.03, { at: [0.05, pts[2][1] + 0.1, -0.24], bone: hb[2], color: C.red, mirror: true });
    m.cone(0.024, 0.16, { at: [0.09, pts[2][1] + 0.02, -0.25], rot: [0, 0, 160], bone: hb[2], color: C.red, mirror: true });
    m.torus(0.02, 0.006, { at: [hr * 0.6, hc.y + hr * 0.75, hc.z + hr * 0.3], rot: [70, 0, 30], bone: head, color: C.gold, mirror: true }); // trâm
    jacket(ctx, { color: C.ivory, hem: 0.5, flare: 1.02, collar: C.gold });
    sleeves(ctx, { color: C.ivory, cuff: C.gold, len: 0.95, flare: 1.25 });
    boots(ctx, { color: C.red, cuff: C.gold, top: 0.55 });
    // — áo dài: hai tà trước/sau + vạt, cổ, sash —
    const sf = BONE('SwayFlapF1'), sb = BONE('SwayFlapB1');
    m.joint(sf, BONE('Hips'), 0, waistY, 0.02); m.joint(sb, BONE('Hips'), 0, waistY, -0.02);
    const hem = y(0.235);
    for (const [z, sw, s] of [[0.1, sf, 1], [-0.1, sb, -1]]) {
      m.panel(0.26, 0.34, waistY - hem, { at: [0, (waistY + hem) / 2, z], bone: BONE('Hips'), color: C.ivory, color2: C.ivory2, ao: 0.15,
        blend: { b1: BONE('Hips'), b2: sw, from: [0, waistY, z], to: [0, hem, z], t0: 0.05, t1: 1, w0: 0, w1: 0.85 } });
      m.panel(0.35, 0.35, 0.03, { at: [0, hem + 0.015, z + 0.002 * s], bone: BONE('Hips'), color: C.gold, ao: 0,
        blend: { b1: BONE('Hips'), b2: sw, from: [0, waistY, z], to: [0, hem, z], t0: 0, t1: 1, w0: 0, w1: 0.85 } });
      m.panel(0.06, 0.06, waistY - hem, { at: [0, (waistY + hem) / 2, z + 0.002 * s], bone: BONE('Hips'), color: C.red, ao: 0,
        blend: { b1: BONE('Hips'), b2: sw, from: [0, waistY, z], to: [0, hem, z], t0: 0.05, t1: 1, w0: 0, w1: 0.85 } });
    }
    m.torus(0.11, 0.022, { at: [0, waistY + 0.06, 0.005], rot: [90, 0, 0], bone: BONE('Hips'), color: C.red, seg: 18 }); // dải lưng
    m.sphere(0.03, { at: [0.09, waistY + 0.03, 0.09], bone: BONE('Hips'), color: C.red });
    m.cyl(0.05, 0.062, 0.06, { at: [0, y(0.788), 0.004], bone: BONE('Neck'), color: C.gold, seg: 14, // cổ áo
      blend: { b1: BONE('Chest'), b2: BONE('Neck'), from: [0, y(0.77), 0], to: [0, y(0.84), 0], t0: 0, t1: 1, w0: 0, w1: 1 } });
    for (let i = 0; i < 4; i++) m.sphere(0.011, { at: [0.045 - i * 0.012, y(0.75) - i * 0.055, 0.115 - i * 0.004], bone: BONE('Chest'), color: C.gold });
    m.torus(0.048, 0.007, { at: [0, y(0.79), 0.04], rot: [70, 0, 0], bone: BONE('Chest'), color: C.gold });
    // — cây đèn: cán gỗ, xà ngang, đèn lồng giấy —
    const T = ctx.armDirs.R.T, W = ctx.armDirs.R.W;
    const hx = (T.x + W.x) / 2, hz = (T.z + W.z) / 2, hy = (T.y + W.y) / 2;
    const HR = BONE('HandR');
    const topY = 2.12;
    m.cyl(0.017, 0.02, topY - (hy - 0.55), { at: [hx, (topY + hy - 0.55) / 2, hz], bone: HR, color: C.wood, color2: '#5a3a1f', seg: 8 });
    m.sphere(0.028, { at: [hx, topY + 0.01, hz], bone: HR, color: C.gold });
    m.cyl(0.011, 0.011, 0.26, { at: [hx, topY - 0.03, hz + 0.13], rot: [90, 0, 0], bone: HR, color: C.wood });
    const lz = hz + 0.26, ly = topY - 0.3;
    m.lathe([[0.001, -0.15], [0.09, -0.13], [0.15, -0.07], [0.175, 0], [0.15, 0.07], [0.09, 0.13], [0.001, 0.15]], { at: [hx, ly, lz], bone: HR, glow: true, color: '#ffd68a', color2: '#ff9a3a', seg: 18, ao: 0 });
    for (const yy of [-0.14, 0.14]) m.cyl(0.075, 0.075, 0.03, { at: [hx, ly + yy, lz], bone: HR, color: C.gold, seg: 14 });
    for (const [k, a] of [[0.175, 0], [0.15, 0.07], [0.15, -0.07]]) m.torus(k, 0.006, { at: [hx, ly + a, lz], rot: [90, 0, 0], bone: HR, color: '#a5522a', seg: 22 });
    m.cyl(0.007, 0.007, 0.16, { at: [hx, ly - 0.22, lz], bone: HR, color: C.red });
    m.cone(0.03, 0.14, { at: [hx, ly - 0.34, lz], rot: [180, 0, 0], bone: HR, color: C.red, seg: 10 });
    m.sphere(0.02, { at: [hx, ly - 0.14, lz], bone: HR, color: C.gold });
    // đom đóm quanh đèn (khối nhỏ phát sáng)
    for (const [dx, dy, dz] of [[0.25, 0.1, 0.05], [-0.22, -0.05, 0.1], [0.1, 0.26, -0.15], [-0.05, -0.2, 0.22]]) m.sphere(0.014, { at: [hx + dx, ly + dy, lz + dz], bone: HR, glow: true, color: '#fff2a8', ao: 0 });
    return ctx;
  },
};
