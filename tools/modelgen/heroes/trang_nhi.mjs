// Trạng Nhí — Thám Tử Nhí Phố Cổ
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, handPos, along, place, orient, orientZ, band, flap, spike } from '../parts.mjs';
const C = { skin: '#f0caa8', vest: '#3a5aa8', shirt: '#f4f0e4', pants: '#4a3a30', boot: '#c8302a', hair: '#2a2028', scarf: '#e0a030', glass: '#bfeaff', deck: '#e0ae4a', wheel: '#2a2a30' };
export default {
  name: 'Trạng Nhí', glow: '#7ad8ff', palette: ['#3a5aa8', '#e0a030', '#f4f0e4', '#c8302a'], rim: '#7ad8ff',
  hitTime: { Attack1: 0.26, Attack2: 0.26 },
  anim: { style: { atk1: 'shoot', atk2: 'jabR', cast1: 'jabR', cast2: 'shoot', ult: 'raise2' }, run: { hold: 'R', amp: 42, arm: 0.9, lean: 12 }, idle: 'calm', moveSpeed: 335, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.35, headS: 1.35, shoulder: 0.15, chestW: 0.12, chestD: 0.08, waistW: 0.1, hipW: 0.11, armR: 0.03, legR: 0.042, skin: C.skin, top: C.vest, pelvis: C.pants, thigh: C.pants, shin: C.skin, boot: C.boot, bootTop: C.shirt, arm: C.shirt, forearm: C.skin, hand: C.skin, armL: 'down', armR_: 'ready', handR: 0.034 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.0, hr * 1.05], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.15], bone: head, color: C.hair });
    for (let i = 0; i < 6; i++) spike(m, { at: [(i - 2.5) * hr * 0.28, hc.y + hr * 0.95, hc.z + hr * 0.2], len: hr * 0.5, r: hr * 0.12, rot: [25, 0, (i - 2.5) * -12], bone: head, color: C.hair, seg: 5 });
    m.torus(hr * 0.9, hr * 0.06, { at: [0, hc.y + hr * 0.62, hc.z + hr * 0.02], rot: [80, 0, 0], bone: head, color: C.scarf, seg: 16 });   // mũ lưỡi trai nhỏ
    m.box(hr * 1.2, hr * 0.05, hr * 0.55, { at: [0, hc.y + hr * 0.62, hc.z + hr * 1.1], rot: [-8, 0, 0], bone: head, color: C.scarf, flat: false });
    const sp = [[0, y(0.79), -0.05], [0.02, y(0.7), -0.15], [-0.02, y(0.6), -0.22]];
    const sb = swayChain(m, chest, 'Scarf', sp.slice(1)); ribbon(m, sb, sp, [0.09, 0.12, 0.11], { color: C.scarf, color2: '#f0c060' });
    m.torus(0.06, 0.022, { at: [0, y(0.795), 0], rot: [80, 0, 0], bone: chest, color: C.scarf });
    for (let i = 0; i < 3; i++) m.sphere(0.014, { at: [0.0, y(0.72) - i * 0.06, 0.09], bone: chest, color: '#f0c060' });
    m.torus(0.105, 0.02, { at: [0, y(0.54), 0], rot: [90, 0, 0], bone: hips, color: C.boot, seg: 16 });
    // giày lực phát sáng, đồng hồ kim ở cổ tay trái
    for (const sd of [1, -1]) m.cyl(0.05, 0.055, 0.012, { at: [sd * 0.08, 0.008, 0.02], bone: BONE('Foot' + (sd > 0 ? 'L' : 'R')), color: C.glass, glow: true, ao: 0, seg: 12 });
    const dL = ctx.armDirs.L; band(m, dL.E.toArray(), dL.W.toArray(), 0.9, 0.16, 0.036, { bone: BONE('ForearmL'), color: C.deck });
    m.cyl(0.03, 0.03, 0.014, { at: [dL.W.x + 0.028, dL.W.y + 0.02, dL.W.z], rot: [0, 0, 90], bone: BONE('ForearmL'), color: C.glass, glow: true, ao: 0, seg: 10 });
    // kính lúp lớn (tay phải) — thấu kính phát sáng
    const hp = handPos(ctx, 'R'), HR = BONE('HandR'); const dir = [-0.1, 1, 0.4];
    m.seg(along(hp, dir, -0.06), along(hp, dir, 0.28), 0.014, 0.014, { bone: HR, color: '#7a4a2a' });
    const top = along(hp, dir, 0.4);
    m.torus(0.13, 0.016, { at: top, rot: orientZ([-0.1, 0.4, 1]), bone: HR, color: C.deck, seg: 20 });
    m.cyl(0.125, 0.125, 0.006, { at: top, rot: orient([-0.1, 0.4, 1]).map((a, i) => a), bone: HR, color: C.glass, glow: true, ao: 0, seg: 20 });
    // ván trượt đeo sau lưng
    m.box(0.16, 0.02, 0.6, { at: [0, y(0.62), -0.14], rot: [-80, 0, 0], bone: chest, color: C.deck, color2: '#a06a20', flat: false });
    for (const z of [-0.36, -0.9]) void z;
    for (const dz of [-0.2, 0.2]) for (const s of [1, -1]) m.cyl(0.03, 0.03, 0.02, { at: [s * 0.07, y(0.62) + dz, -0.16], rot: [0, 0, 90], bone: chest, color: C.wheel, seg: 8 });
    return ctx;
  },
};
