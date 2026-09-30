// Nhãn Sư — Thợ Săn Thấu Nhãn
import { humanoid, BONE } from '../humanoid.mjs';
import { swayChain, ribbon, dangle, handPos, along, place, orient, orientZ, band, flap, curve } from '../parts.mjs';
const C = { skin: '#d8b090', coat: '#22362e', coat2: '#142018', teal: '#5affd0', leather: '#5a3a26', hair: '#1a1616', steel: '#8a9aa0', gold: '#c9a24a' };
export default {
  name: 'Nhãn Sư', glow: '#5affd0', palette: ['#22362e', '#5affd0', '#5a3a26', '#8a9aa0'], rim: '#5affd0',
  hitTime: { Attack1: 0.28, Attack2: 0.28 },
  anim: { style: { atk1: 'shoot', atk2: 'shoot', cast1: 'jabR', cast2: 'shoot', ult: 'shoot' }, run: { amp: 40, arm: 0.6, lean: 14, hold: 'both' }, idle: 'sneak', moveSpeed: 330, swayAmp: 10 },
  build(id) {
    const ctx = humanoid(id, { H: 1.8, headS: 1.02, shoulder: 0.158, chestW: 0.13, waistW: 0.094, hipW: 0.108, armR: 0.026, legR: 0.039, skin: C.skin, top: C.coat, pelvis: C.coat2, thigh: C.coat2, shin: C.coat2, boot: C.leather, bootTop: C.coat2, arm: C.coat, forearm: C.leather, hand: C.leather, armL: 'ready', armR_: 'ready', handR: 0.03 });
    const { m, hr, hc, y } = ctx; const head = BONE('Head'), chest = BONE('Chest'), hips = BONE('Hips');
    m.sphere(1, { radii: [hr * 1.04, hr * 1.02, hr * 1.05], at: [0, hc.y + hr * 0.15, hc.z - hr * 0.16], bone: head, color: C.hair });
    m.sphere(1, { radii: [hr * 1.14, hr * 1.0, hr * 1.14], at: [0, hc.y + hr * 0.3, hc.z - hr * 0.2], bone: head, color: C.coat, color2: C.coat2, wseg: 16, hseg: 12 });   // mũ trùm
    m.cone(hr * 0.9, hr * 1.3, { at: [0, hc.y + hr * 1.3, hc.z - hr * 0.55], rot: [-55, 0, 0], bone: head, color: C.coat, seg: 8 });
    m.sphere(1, { radii: [hr * 0.9, hr * 0.7, hr * 0.5], at: [0, hc.y - hr * 0.1, hc.z + hr * 0.15], bone: head, color: C.skin, ao: 0.1 });
    m.torus(hr * 0.2, hr * 0.045, { at: [hr * 0.34, hc.y + hr * 0.04, hc.z + hr * 0.95], bone: head, color: C.teal, glow: true, ao: 0, seg: 14 });   // con mắt thấu nhãn
    m.sphere(1, { radii: [hr * 0.14, hr * 0.14, hr * 0.03], at: [hr * 0.34, hc.y + hr * 0.04, hc.z + hr * 0.95], bone: head, color: '#e8fff8', glow: true, ao: 0 });
    const cp = [[0, y(0.79), -0.09], [0, y(0.62), -0.17], [0, y(0.44), -0.2]];
    const cb = swayChain(m, chest, 'Cape', cp.slice(1)); ribbon(m, cb, cp, [0.3, 0.4, 0.44], { color: C.coat, color2: C.coat2 });
    flap(m, 'CoatF', { at: [0, 0.11], top: y(0.52), bottom: y(0.22), wTop: 0.22, wBot: 0.3, color: C.coat, color2: C.coat2 });
    m.torus(0.108, 0.026, { at: [0, y(0.55), 0], rot: [90, 0, 0], bone: hips, color: C.leather, seg: 16 });
    for (let i = 0; i < 3; i++) m.box(0.03, 0.06, 0.03, { at: [-0.04 + i * 0.04, y(0.55), 0.11], bone: hips, color: C.gold });
    m.box(0.02, 0.36, 0.012, { at: [0.06, y(0.68), 0.1], rot: [0, 0, -10], bone: chest, color: C.leather, flat: false, ao: 0 });
    // hai nỏ ngắn hai nòng ở hai tay
    for (const sd of ['L', 'R']) {
      const hp = handPos(ctx, sd), B = BONE('Hand' + sd), d = ctx.armDirs[sd];
      const dir = [d.T.x - d.W.x, d.T.y - d.W.y + 0.05, d.T.z - d.W.z];
      m.box(0.05, 0.06, 0.34, { at: along(hp, dir, 0.16), rot: orientZ(dir), bone: B, color: C.leather, color2: C.steel, flat: false });
      for (const s of [1, -1]) {
        const a = place(dir, along(hp, dir, 0.3), [s * 0.02, 0, 0]);
        const lp = []; for (let i = 0; i <= 5; i++) { const t = i / 5; lp.push([a[0] + (sd === 'L' ? 1 : -1) * s * 0.0 + s * t * 0.16, a[1] + 0.0, a[2] - 0.04 * t * t]); }
        void lp;
      }
      m.seg(along(hp, dir, 0.3), along(hp, dir, 0.55), 0.012, 0.008, { bone: B, color: C.steel, seg: 6 });
      m.sphere(0.022, { at: along(hp, dir, 0.56), bone: B, color: C.teal, glow: true, ao: 0 });
    }
    return ctx;
  },
};
