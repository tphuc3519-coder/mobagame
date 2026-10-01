import * as THREE from 'three';
import { TILE } from './atlas.js';

// Bộ hiệu ứng theo từng tướng (chủ đề màu + hình riêng cho mỗi chiêu) và hiệu ứng chung (trúng đòn, choáng, khiên, hồi máu, lên cấp, về thành).
// Hàm ở đây chỉ đọc sự kiện mô phỏng và vẽ; không đổi trạng thái trận. Toạ độ: sim (x, y) → thế giới (x, z), y = độ cao (tướng cao ~250).
const R = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/** Chủ đề: màu chính, màu lõi (sáng nhất), kiểu tia khi trúng, vệt vũ khí (tay nào). */
export const THEMES = {
  hoa_ren: { col: 0xff6a14, core: 0xffe6a8, hit: 'fire', trail: { hands: ['R'], color: 0xff4a08, core: 0xffd890, minSpeed: 450, maxSpeed: 1300 } },
  thach_quy: { col: 0x3fc8ff, core: 0xe6ffff, hit: 'water', trail: { hands: ['R'], color: 0x1a90ff, core: 0xd8fbff, minSpeed: 450, maxSpeed: 1300 } },
  bong_tre: { col: 0x5dff8a, core: 0xf0ffe0, hit: 'leaf', trail: { hands: ['R', 'L'], color: 0x20c860, core: 0xf4fff0, minSpeed: 500, maxSpeed: 1500 } },
  nguyet_ha: { col: 0x8ad4ff, core: 0xffffff, hit: 'water' },
  canh_dieu: { col: 0xc8f4ff, core: 0xffffff, hit: 'wind' },
  long_dang: { col: 0xffc84a, core: 0xfff6d0, hit: 'light' },
};
const TEAM = { 0: 0x5fe3d0, 1: 0xff6a4a };

export function createLibrary({ A, N, sh, views, shake, team }) {
  const timers = [], auras = [], tmp = new THREE.Vector3();
  let world = null;
  const later = (s, fn) => timers.push({ t: s, fn });
  const aura = (dur, fn, kill) => { const a = { t: 0, dur, fn, kill }; auras.push(a); return a; };
  const ent = (id) => world?.byId(id);
  const themeOf = (e) => (e && THEMES[e.heroId]) || { col: TEAM[e?.team] ?? 0xffffff, core: 0xffffff, hit: 'spark' };
  const viewOf = (id) => views.get(id);
  const heightOf = (id) => viewOf(id)?.art?.height ?? (ent(id)?.kind === 'minion' ? 110 : 200);
  /** Vị trí gốc (đã nội suy) của đơn vị trên màn hình. */
  const rootOf = (id) => { const v = viewOf(id); return v ? v.root.position : null; };
  const boneOf = (id, name) => { const b = viewOf(id)?.bones?.[name]; return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
  const visible = (e) => !!e && (e.team === team || !!e.seenBy?.[team] || e.structure);
  const headOf = (id) => { const r = rootOf(id); if (!r) return null; return boneOf(id, 'Head')?.add(new THREE.Vector3(0, 70, 0)) || new THREE.Vector3(r.x, r.y + heightOf(id) + 30, r.z); };

  // —— Mẫu hạt ——
  /** Bùng nổ: n hạt toả ra ngang (speed) và lên (up) từ (x,y,z) trong bán kính r; dir/spread để toả theo hình quạt. */
  function burst(sys, x, y, z, o) {
    for (let i = 0; i < (o.n ?? 20); i++) {
      const a = o.dir != null ? o.dir + R(-1, 1) * (o.spread ?? 0.5) : R(0, TAU), sp = R(...(o.speed ?? [100, 300])), rr = R(0, o.r ?? 0);
      sys.spawn({ x: x + Math.cos(a) * rr, y: y + R(...(o.dy ?? [0, 0])), z: z + Math.sin(a) * rr, vx: Math.cos(a) * sp, vy: R(...(o.up ?? [0, 0])), vz: Math.sin(a) * sp,
        life: R(...(o.life ?? [0.4, 0.7])), size: o.size ?? [30, 5], color: o.color, alpha: o.alpha ?? [1, 0], drag: o.drag ?? 2, grav: o.grav ?? 0, tile: o.tile ?? TILE.glow, spin: o.spinR ? R(-o.spinR, o.spinR) : 0, floor: o.floor, fadeIn: o.fadeIn, swirl: o.swirl && { ...o.swirl } });
    }
  }
  const flash = (x, y, z, size, color, life = 0.18) => A.spawn({ x, y, z, life, size: [size, size * 1.4], color, alpha: [1, 0], tile: TILE.glow, fadeIn: 0 });
  const sparks = (x, y, z, color, n = 16, k = 1) => burst(A, x, y, z, { n, speed: [250 * k, 700 * k], up: [100, 500], life: [0.25, 0.5], size: [24 * k, 4], color: [0xffffff, color], grav: 1400, drag: 1.5, tile: TILE.glow });
  /** Lửa cuộn (trộn thường: cam sáng → khói nâu sẫm, nổi rõ trên nền sáng). */
  const fire = (x, y, z, n = 12, r = 60, k = 1) => burst(N, x, y, z, { n, r, speed: [40 * k, 160 * k], up: [150 * k, 380 * k], life: [0.45, 0.8], size: [70 * k, 170 * k], color: [0xffb040, 0x2a1810], alpha: [0.95, 0], drag: 2.2, tile: TILE.smoke, fadeIn: 0.03 });
  const embers = (x, y, z, color, n = 12, r = 60) => burst(A, x, y, z, { n, r, speed: [20, 80], up: [120, 320], life: [0.8, 1.5], size: [20, 3], color: [0xffe0a0, color], drag: 0.8, tile: TILE.glow });
  const dust = (x, z, r, n = 14, color = 0x8a7a66) => burst(N, x, 20, z, { n, r: r * 0.6, speed: [r * 0.6, r * 1.6], up: [30, 120], life: [0.7, 1.2], size: [70, 190], color, alpha: [0.45, 0], drag: 3, tile: TILE.smoke });
  const droplets = (x, y, z, n = 30, k = 1) => burst(N, x, y, z, { n, r: 30 * k, speed: [150 * k, 500 * k], up: [400, 900], life: [0.6, 1.0], size: [26 * k, 10], color: [0xffffff, 0x9fe6ff], alpha: [0.9, 0.2], grav: 2200, drag: 0.6, tile: TILE.drop, floor: 5 });
  const leaves = (x, y, z, n = 14, k = 1) => burst(N, x, y, z, { n, r: 30, speed: [120 * k, 360 * k], up: [60, 300], life: [0.8, 1.4], size: [30, 22], color: [0x8cff9a, 0x2f9a4a], alpha: [1, 0], grav: 300, drag: 2.4, tile: TILE.leaf, spinR: 9 });
  const rocks = (x, z, n = 16, k = 1) => burst(N, x, 30, z, { n, r: 60 * k, speed: [150 * k, 450 * k], up: [500, 1100], life: [0.7, 1.1], size: [34 * k, 22 * k], color: [0x6a5444, 0x3a2e26], alpha: [1, 0.6], grav: 2600, drag: 0.4, tile: TILE.shard, spinR: 10, floor: 6 });
  const bubbles = (x, z, r, n = 12) => burst(A, x, 20, z, { n, r, speed: [5, 30], up: [120, 260], life: [0.8, 1.6], size: [22, 30], color: [0xd8fbff, 0x5fc8ff], alpha: [0.8, 0], tile: TILE.bubble, drag: 0.5 });

  /** Tia khi trúng đòn theo chủ đề người đánh. */
  function hitFx(src, tgt) {
    const p = rootOf(tgt.id); if (!p) return;
    const th = themeOf(src), y = heightOf(tgt.id) * 0.55, x = p.x + R(-15, 15), z = p.z + R(-15, 15);
    flash(x, y, z, 90, th.col, 0.12);
    if (th.hit === 'fire') { sparks(x, y, z, th.col, 14); fire(x, y - 30, z, 3, 15, 0.6); }
    else if (th.hit === 'water') { droplets(x, y, z, 10, 0.6); sparks(x, y, z, th.col, 6, 0.7); }
    else if (th.hit === 'leaf') { leaves(x, y, z, 5, 0.8); sparks(x, y, z, th.col, 8, 0.8); }
    else if (th.hit === 'light') burst(A, x, y, z, { n: 8, speed: [150, 400], up: [100, 300], life: [0.3, 0.6], size: [26, 4], color: [0xffffff, th.col], tile: TILE.star, drag: 3 });
    else sparks(x, y, z, th.col, 10, 0.8);
  }

  // —— Đạn ——
  const projCore = new Map();
  /** Mỗi khung với mỗi viên đạn: lõi sáng + vệt hạt theo chủ đề; móc neo có xích nối về đầu ống. */
  function projectile(p, owner, dt) {
    const th = themeOf(owner), y = p.kind === 'basic' ? 110 : 100, basic = p.kind === 'basic';
    if (!visible(owner) && !(p.homing != null && visible(ent(p.homing)))) return;
    A.spawn({ x: p.x, y, z: p.y, life: 0.05, size: basic ? 50 : 95, color: th.core, alpha: [1, 1], tile: TILE.glow, fadeIn: 0 });
    A.spawn({ x: p.x, y, z: p.y, life: 0.05, size: basic ? 80 : 160, color: th.col, alpha: [0.7, 0.7], tile: TILE.glow, fadeIn: 0 });
    const n = basic ? 1 : 3;
    for (let i = 0; i < n; i++) A.spawn({ x: p.x + R(-10, 10), y: y + R(-10, 10), z: p.y + R(-10, 10), vx: R(-40, 40), vy: R(-20, 40), vz: R(-40, 40), life: R(0.25, 0.45), size: [basic ? 26 : 44, 4], color: [th.core, th.col], tile: TILE.glow });
    if (p.kind === 'hook') {
      A.spawn({ x: p.x, y, z: p.y, life: 0.05, size: 70, color: 0xffd890, alpha: [1, 1], tile: TILE.shard, rot: Math.atan2(p.dy, p.dx), fadeIn: 0 });
      if (!projCore.has(p.id)) {
        const st = { gone: false, pos: new THREE.Vector3(p.x, y, p.y) }; projCore.set(p.id, st);
        sh.chain(() => boneOf(owner.id, 'HandR_Tip') || rootOf(owner.id)?.clone().setY(140), () => st.pos, { color: 0xd8b878, width: 6, life: 3, kill: () => st.gone });
      }
      projCore.get(p.id).pos.set(p.x, y, p.y);
    } else if (!basic && th.hit === 'leaf') N.spawn({ x: p.x, y, z: p.y, vx: R(-60, 60), vy: R(0, 60), vz: R(-60, 60), life: 0.7, size: [26, 18], color: [0x9cff9a, 0x2f9a4a], tile: TILE.leaf, spin: R(-8, 8), grav: 200, drag: 2 });
    else if (!basic && th.hit === 'water') N.spawn({ x: p.x, y, z: p.y, vx: R(-50, 50), vy: R(50, 200), vz: R(-50, 50), life: 0.5, size: [18, 8], color: [0xffffff, 0x9fe6ff], tile: TILE.drop, grav: 1200 });
    else if (!basic && th.hit === 'wind') A.spawn({ x: p.x, y, z: p.y, life: 0.3, size: [60, 120], color: 0xffffff, alpha: [0.35, 0], tile: TILE.bubble });
  }
  function projectileGone(id) { const st = projCore.get(id); if (st) { st.gone = true; projCore.delete(id); } }

  // —— Hiệu ứng chiêu theo tướng ——
  const delayOf = (ev) => Math.max(0, ev.delay || 0);
  const H = {
    hoa_ren: {
      cone(ev, e) { // Vung Búa: hai cung lửa quét ngang + lửa cuộn và tàn lửa bay theo hình quạt + vệt cháy
        const dir = Math.atan2(ev.dy, ev.dx), half = (ev.angle * Math.PI) / 360;
        sh.arc(ev.x, ev.y, dir + half, dir - half, ev.range * 0.3, ev.range, { color: 0xff4a08, core: 0xffd890, y: 110, life: 0.32 });
        later(0.04, () => sh.arc(ev.x, ev.y, dir + half * 0.85, dir - half * 0.85, ev.range * 0.25, ev.range * 0.88, { color: 0xc82000, core: 0xff9a40, y: 60, life: 0.34, alpha: 0.8 }));
        for (let i = 0; i < 9; i++) { const a = dir + (i / 8 - 0.5) * 2 * half * 0.9, d = ev.range * R(0.55, 0.95); later(0.02 + i * 0.012, () => fire(ev.x + Math.cos(a) * d, 40, ev.y + Math.sin(a) * d, 2, 20, 0.8)); }
        burst(A, ev.x, 110, ev.y, { n: 40, dir, spread: half, r: 40, speed: [400, 1100], up: [0, 250], life: [0.3, 0.6], size: [30, 4], color: [0xffe0a0, 0xff4a00], drag: 3.5, grav: 600 });
        later(0.05, () => { sh.decal('scorch', ev.x + Math.cos(dir) * ev.range * 0.55, ev.y + Math.sin(dir) * ev.range * 0.55, ev.range * 0.55, { color: 0x000000, additive: false, alpha: 0.5, life: 2 }); });
        shake(10, 0.15);
      },
      cast(ev, e) {
        if (ev.slot !== 's2') return; // Xỉ Sắt: giơ búa rồi dộng xuống trước mặt → sóng lửa, nứt đất; khiên xỉ sắt nóng chảy bao quanh; tăng tốc để lại vệt tàn lửa dưới chân
        later(0.28, () => {
          if (!e.alive) return;
          const f = e.facing, x = e.pos.x + Math.cos(f) * 150, z = e.pos.y + Math.sin(f) * 150;
          sh.ring(x, z, 20, 260, { color: 0xff6a14, width: 0.12, life: 0.45, fill: 0.4 });
          sh.decal('crack', x, z, 160, { color: 0xff7a20, life: 1.6 }); sh.decal('scorch', x, z, 180, { color: 0x000000, additive: false, alpha: 0.55, life: 2.2 });
          flash(x, 60, z, 260, 0xff8a30, 0.2); sparks(x, 40, z, 0xff6a14, 40, 1.3); fire(x, 20, z, 14, 80); rocks(x, z, 10, 0.8); dust(x, z, 120, 10);
          sh.bubble(() => rootOf(e.id), 120, { color: 0xff7a20, hex: true, life: 3, kill: () => !e.alive || !e.shields.length });
          aura(2, (dt) => { const r = rootOf(e.id); if (r && e.speed > 50 && Math.random() < 0.7) A.spawn({ x: r.x + R(-25, 25), y: 15, z: r.z + R(-25, 25), vy: R(40, 120), life: 0.5, size: [24, 4], color: [0xffd080, 0xff4a00], tile: TILE.glow }); }, () => !e.alive);
          shake(14, 0.2);
        });
      },
      aoe(ev, e) { // Đe Trời (cảnh báo): vòng ký tự lửa nở ở điểm rơi
        if (!ev.warn) return;
        sh.decal('rune', ev.x, ev.y, ev.radius * 1.05, { color: 0xff6a14, life: ev.dur + 0.3, fadeIn: 0.15, spin: 1.2, alpha: 0.9 });
        sh.ring(ev.x, ev.y, ev.radius * 1.3, ev.radius, { color: 0xff4a00, width: 0.05, life: ev.dur, fill: 0.15, ease: 1 });
        aura(ev.dur, () => { if (Math.random() < 0.8) { const a = R(0, TAU), r = R(0, ev.radius); A.spawn({ x: ev.x + Math.cos(a) * r, y: 10, z: ev.y + Math.sin(a) * r, vy: R(80, 200), life: 0.6, size: [20, 4], color: [0xffd080, 0xff3a00] }); } });
      },
      impact(ev) { // Đe Trời (chạm đất): sóng xung kích lớn, cột lửa, nứt dung nham, đá văng, bụi, rung mạnh
        const { x, y: z, radius: r } = ev;
        sh.ring(x, z, 30, r * 1.35, { color: 0xff6a14, width: 0.1, life: 0.55, fill: 0.5 });
        sh.ring(x, z, 10, r * 0.9, { color: 0xffe0a0, width: 0.18, life: 0.3, fill: 0.8 });
        sh.pillar(x, z, r * 0.45, 520, { color: 0xff4a00, top: 0xffe8b0, life: 0.55 });
        sh.decal('crack', x, z, r * 1.05, { color: 0xff6a10, life: 3, alpha: 1 }); sh.decal('scorch', x, z, r * 1.25, { color: 0x000000, additive: false, alpha: 0.7, life: 3.5 });
        flash(x, 100, z, r * 2.2, 0xff8a30, 0.25);
        sparks(x, 60, z, 0xff6a14, 70, 1.8); embers(x, 40, z, 0xff4a00, 30, r * 0.7); fire(x, 20, z, 26, r * 0.6, 1.4); rocks(x, z, 22, 1.2); dust(x, z, r, 18);
        shake(34, 0.4);
      },
    },
    thach_quy: {
      aoe(ev, e) {
        if (ev.slot === 's2') { // Dậm Áp Suất: vòng sóng nước + bọt trắng + giọt bắn + vệt nước loang
          const { x, y: z, radius: r } = ev;
          sh.ring(x, z, 30, r * 1.1, { color: 0x3fc8ff, width: 0.16, life: 0.5, fill: 0.35 });
          later(0.06, () => sh.ring(x, z, 20, r * 0.95, { color: 0xe8ffff, width: 0.06, life: 0.45, fill: 0 }));
          sh.decal('splash', x, z, r, { color: 0x6fd8ff, life: 1.4, alpha: 0.8, grow: 0.2 });
          flash(x, 50, z, 300, 0x5fd0ff, 0.2); droplets(x, 30, z, 50, 1.2); bubbles(x, z, r * 0.7, 14);
          burst(N, x, 10, z, { n: 24, r: 40, speed: [r * 1.4, r * 2.6], up: [20, 80], life: [0.4, 0.7], size: [50, 120], color: 0xe0f8ff, alpha: [0.6, 0], drag: 4, tile: TILE.smoke });
          shake(12, 0.18);
        } else if (ev.slot === 's3') { // Xoáy Nước Sâu: xoáy nước lớn quanh Mossback, nước bị hút cuộn vào tâm, bong bóng giáp bao quanh
          const { x, y: z, radius: r } = ev;
          sh.vortex(x, z, r, { color: 0x6fe0ff, deep: 0x06305a, life: 1.6, speed: 1.4, arms: 5 });
          sh.ring(x, z, r * 1.2, r * 0.3, { color: 0x9fe8ff, width: 0.1, life: 0.6, fill: 0.1, ease: 1.5 });
          for (let i = 0; i < 70; i++) { const a = R(0, TAU), d = R(r * 0.4, r); N.spawn({ x: x + Math.cos(a) * d, y: R(10, 60), z: z + Math.sin(a) * d, vy: R(0, 60), life: R(0.6, 1.2), size: [34, 14], color: [0xffffff, 0x7fd8ff], alpha: [0.9, 0], tile: TILE.drop, swirl: { x, z, w: 5, pull: 1.2 }, rot: a }); }
          for (let i = 0; i < 26; i++) { const a = R(0, TAU), d = R(r * 0.5, r); A.spawn({ x: x + Math.cos(a) * d, y: R(10, 40), z: z + Math.sin(a) * d, life: R(0.8, 1.4), size: [28, 10], color: [0xe8ffff, 0x3fa8ff], tile: TILE.glow, swirl: { x, z, w: 4, pull: 1.4 } }); }
          later(0.35, () => { sh.pillar(x, z, 90, 380, { color: 0x3fb8ff, top: 0xffffff, life: 0.5 }); droplets(x, 60, z, 40, 1); });
          sh.bubble(() => rootOf(e.id), 150, { color: 0x4fc8ff, hex: true, life: 5, kill: () => !e.alive });
          shake(18, 0.3);
        }
      },
      cast(ev, e) { if (ev.slot === 's1') later(0.2, () => { const t = boneOf(e.id, 'HandR_Tip'); if (t) { flash(t.x, t.y, t.z, 160, 0x5fd0ff, 0.15); droplets(t.x, t.y, t.z, 12, 0.6); } }); },
      hook(ev, e) { // Móc Neo trúng: xích căng kéo mục tiêu về, nước bắn ở mục tiêu
        const tgt = ent(ev.target), p = rootOf(ev.target); if (!tgt || !p) return;
        sh.chain(() => boneOf(e.id, 'HandR_Tip') || rootOf(e.id)?.clone().setY(140), () => rootOf(ev.target)?.clone().setY(heightOf(ev.target) * 0.55), { color: 0xd8b878, width: 7, life: (ev.dur || 0.3) + 0.15 });
        flash(p.x, 120, p.z, 200, 0x5fd0ff, 0.18); droplets(p.x, 100, p.z, 24, 0.9); sh.ring(p.x, p.z, 10, 160, { color: 0x6fd8ff, width: 0.15, life: 0.35 });
        aura(ev.dur || 0.3, () => { const q = rootOf(ev.target); if (q) N.spawn({ x: q.x + R(-20, 20), y: R(10, 40), z: q.z + R(-20, 20), vy: R(100, 300), vx: R(-80, 80), vz: R(-80, 80), life: 0.5, size: [24, 10], color: [0xffffff, 0x9fe6ff], tile: TILE.drop, grav: 1500 }); });
        shake(8, 0.15);
      },
    },
    bong_tre: {
      cast(ev, e) {
        if (ev.slot === 's2') { // Lướt Đốt: vệt gió xanh + lá theo đường lướt
          aura(0.3, () => { const r = rootOf(e.id); if (!r) return; for (let i = 0; i < 2; i++) A.spawn({ x: r.x + R(-20, 20), y: R(40, 200), z: r.z + R(-20, 20), life: 0.3, size: [60, 10], color: [0xd8ffd8, 0x2fd060], alpha: [0.7, 0], tile: TILE.glow }); N.spawn({ x: r.x, y: R(30, 180), z: r.z, vx: R(-60, 60), vy: R(0, 80), vz: R(-60, 60), life: 0.9, size: [26, 18], color: [0x9cff9a, 0x2f9a4a], tile: TILE.leaf, spin: R(-8, 8), drag: 2, grav: 150 }); });
        } else if (ev.slot === 's3') { // Rừng Nuốt Bóng: cuộn lá + khói xanh rồi biến mất
          const r = rootOf(e.id); if (!r) return;
          burst(N, r.x, 40, r.z, { n: 20, r: 60, speed: [40, 160], up: [80, 240], life: [0.8, 1.3], size: [80, 200], color: 0x2a6a40, alpha: [0.6, 0], drag: 2, tile: TILE.smoke });
          leaves(r.x, 80, r.z, 30, 1.2);
          for (let i = 0; i < 24; i++) { const a = R(0, TAU); N.spawn({ x: r.x + Math.cos(a) * 80, y: R(20, 60), z: r.z + Math.sin(a) * 80, vy: R(150, 300), life: 1.1, size: [28, 20], color: [0xaaffaa, 0x2f9a4a], tile: TILE.leaf, spin: R(-8, 8), swirl: { x: r.x, z: r.z, w: 6, pull: 0.5 } }); }
        }
      },
    },
    nguyet_ha: {
      aoe(ev) {
        if (ev.zone) { sh.vortex(ev.x, ev.y, ev.radius, { color: 0x9fdcff, deep: 0x102850, life: ev.dur, speed: 1.2, arms: 3 }); aura(ev.dur, () => { if (Math.random() < 0.6) { const a = R(0, TAU), d = R(0, ev.radius); N.spawn({ x: ev.x + Math.cos(a) * d, y: 10, z: ev.y + Math.sin(a) * d, vy: R(100, 300), life: 0.6, size: [20, 8], color: [0xffffff, 0x9fe6ff], tile: TILE.drop, grav: 900, swirl: { x: ev.x, z: ev.y, w: 3, pull: 0.3 } }); } }); }
        else if (ev.warn) { sh.decal('rune', ev.x, ev.y, ev.radius * 1.05, { color: 0xbfe6ff, life: ev.dur + 0.3, fadeIn: 0.2, spin: -0.8 }); sh.ring(ev.x, ev.y, ev.radius * 1.25, ev.radius, { color: 0x8ad4ff, width: 0.05, life: ev.dur, ease: 1, fill: 0.2 }); }
      },
      impact(ev) { // Lũ Nguyệt: cột nước ánh trăng + sóng + mưa giọt
        const { x, y: z, radius: r } = ev;
        sh.pillar(x, z, r * 0.55, 600, { color: 0x4fb0ff, top: 0xffffff, life: 0.7 });
        sh.ring(x, z, 30, r * 1.3, { color: 0x9fdcff, width: 0.12, life: 0.6, fill: 0.4 }); sh.decal('splash', x, z, r * 1.1, { color: 0x8ad4ff, life: 2, grow: 0.25 });
        flash(x, 100, z, r * 2, 0xbfe6ff, 0.25); droplets(x, 80, z, 80, 1.5); bubbles(x, z, r * 0.8, 20); shake(20, 0.3);
      },
    },
    canh_dieu: {
      cast(ev, e) { if (ev.slot === 's2') { const r = rootOf(e.id); if (r) { sh.ring(r.x, r.z, 20, 200, { color: 0xe0faff, width: 0.08, life: 0.35, fill: 0.1 }); burst(N, r.x, 30, r.z, { n: 14, r: 40, speed: [200, 400], up: [20, 80], life: [0.4, 0.6], size: [60, 140], color: 0xe8f4ff, alpha: [0.5, 0], drag: 4, tile: TILE.smoke }); } } },
      aoe(ev) { // Mưa Tên: vòng đánh dấu + tên trút xuống liên tục
        if (!ev.zone) return;
        sh.decal('rune', ev.x, ev.y, ev.radius, { color: 0xc8f4ff, life: ev.dur + 0.2, fadeIn: 0.1, alpha: 0.6 });
        aura(ev.dur, () => { for (let i = 0; i < 3; i++) { const a = R(0, TAU), d = Math.sqrt(Math.random()) * ev.radius, x = ev.x + Math.cos(a) * d, z = ev.y + Math.sin(a) * d, t = R(0.18, 0.28); A.spawn({ x, y: 2400 * t + 10, z, vy: -2400, life: t, size: [130, 130], color: [0xffffff, 0x9fe8ff], tile: TILE.streak, rot: 0, alpha: [1, 1], fadeIn: 0 }); later(t, () => { A.spawn({ x, y: 15, z, life: 0.22, size: [70, 130], color: 0xd8f8ff, alpha: [1, 0], tile: TILE.glow }); A.spawn({ x, y: 15, z, life: 0.25, size: [40, 60], color: 0xffffff, alpha: [1, 0], tile: TILE.star }); N.spawn({ x, y: 10, z, vy: 60, life: 0.5, size: [50, 110], color: 0xb0a080, alpha: [0.45, 0], tile: TILE.smoke }); }); } });
      },
    },
    long_dang: {
      aoe(ev, e) {
        if (ev.slot === 's2') { // Thắp Sáng: cột sáng vàng lên đồng đội + sao lấp lánh
          sh.pillar(ev.x, ev.y, 90, 420, { color: 0xffc84a, top: 0xfff6d0, life: 0.7 }); sh.ring(ev.x, ev.y, 10, 180, { color: 0xffd36a, width: 0.12, life: 0.45 });
          burst(A, ev.x, 40, ev.y, { n: 20, r: 70, speed: [10, 40], up: [150, 350], life: [0.7, 1.2], size: [22, 6], color: [0xffffff, 0xffc84a], tile: TILE.star, drag: 1 });
          if (ev.target != null) { const t = ent(ev.target); sh.bubble(() => rootOf(ev.target), 120, { color: 0xffc84a, life: 3, kill: () => !t?.alive || !t.shields.length }); }
        } else if (ev.slot === 's3') { // Hội Đèn: vòng sáng lớn + hàng chục đèn lồng bay lên
          const { x, y: z, radius: r } = ev;
          sh.ring(x, z, 40, r, { color: 0xffc84a, width: 0.06, life: 0.8, fill: 0.25 }); sh.decal('rune', x, z, r * 0.6, { color: 0xffd36a, life: 1.6, spin: 0.6, grow: 0.3 });
          for (let i = 0; i < 40; i++) { const a = R(0, TAU), d = Math.sqrt(Math.random()) * r; A.spawn({ x: x + Math.cos(a) * d, y: R(10, 60), z: z + Math.sin(a) * d, vy: R(80, 200), vx: R(-20, 20), vz: R(-20, 20), life: R(1.4, 2.4), size: [46, 30], color: [0xfff0b0, 0xff9a30], tile: TILE.glow, fadeIn: 0.3 }); }
          flash(x, 120, z, r * 1.2, 0xffd36a, 0.3);
        }
      },
    },
  };

  /** Hiệu ứng mặc định theo kiểu sự kiện cho tướng không có bộ riêng. */
  const generic = {
    aoe(ev, e) { const c = themeOf(e).col; if (ev.zone) { sh.decal('rune', ev.x, ev.y, ev.radius, { color: c, life: ev.dur, alpha: 0.6, spin: 0.5 }); return; } sh.ring(ev.x, ev.y, ev.warn ? ev.radius * 1.2 : 20, ev.radius, { color: c, width: 0.1, life: ev.warn ? ev.dur : 0.45, fill: 0.3, ease: ev.warn ? 1 : 2.2 }); if (!ev.warn) burst(A, ev.x, 40, ev.y, { n: 24, r: ev.radius * 0.5, speed: [100, 300], up: [100, 300], life: [0.4, 0.8], size: [28, 4], color: [0xffffff, c] }); },
    impact(ev, e) { const c = themeOf(e).col; sh.ring(ev.x, ev.y, 20, ev.radius * 1.2, { color: c, width: 0.12, life: 0.5, fill: 0.4 }); flash(ev.x, 80, ev.y, ev.radius * 1.5, c); sparks(ev.x, 50, ev.y, c, 40, 1.4); dust(ev.x, ev.y, ev.radius, 12); shake(16, 0.25); },
    cone(ev, e) { const th = themeOf(e), dir = Math.atan2(ev.dy, ev.dx), half = (ev.angle * Math.PI) / 360; sh.arc(ev.x, ev.y, dir + half, dir - half, 60, ev.range, { color: th.col, core: th.core, y: 100 }); },
  };

  // —— Trạng thái ——
  const stunFx = new Map();
  function status(ev) {
    const e = ent(ev.id); if (!e || !visible(e)) return;
    if (ev.kind === 'stun' || ev.kind === 'knockup' || ev.kind === 'taunt') {
      const s = e.statuses.find((x) => x.kind === ev.kind); if (!s) return;
      const dur = (s.until - world.tick) / 30; if (dur <= 0.05) return;
      const until = performance.now() + dur * 1000; if ((stunFx.get(e.id) || 0) >= until - 50) return; stunFx.set(e.id, until);
      const color = ev.kind === 'taunt' ? 0xff5a3a : 0xffe680;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; A.spawn({ x: Math.cos(a) * 42, y: 0, z: Math.sin(a) * 42, life: dur, size: [34, 34], color, alpha: [1, 1], tile: TILE.star, spin: 3, swirl: { x: 0, z: 0, w: 5 }, follow: () => (e.alive ? headOf(e.id) : null), fadeIn: 0.1 }); }
      if (ev.kind === 'knockup') { const r = rootOf(e.id); if (r) dust(r.x, r.z, 80, 8); }
    }
  }

  // —— Vệt vũ khí ——
  const trails = new Map(), va = new THREE.Vector3(), vb = new THREE.Vector3();
  function updateTrails(dt) {
    for (const e of world.entities) {
      if (e.kind !== 'hero') continue;
      const th = THEMES[e.heroId]; if (!th?.trail) continue;
      const v = viewOf(e.id); if (!v?.bones?.HandR) continue;
      let tr = trails.get(e.id);
      if (!tr) { tr = th.trail.hands.map((s) => ({ s, t: sh.trail({ color: th.trail.color, core: th.trail.core, minSpeed: th.trail.minSpeed, maxSpeed: th.trail.maxSpeed }) })); trails.set(e.id, tr); }
      const show = e.alive && v.root.visible;
      for (const { s, t } of tr) {
        t.mesh.visible = show;
        const hb = v.bones['Hand' + s], tb = v.bones['Hand' + s + '_Tip']; if (!hb || !tb || !show) continue;
        hb.getWorldPosition(va); tb.getWorldPosition(vb);
        t.push(va.lerp(vb, 0.25), vb, dt); // gốc vệt lệch ra khỏi bàn tay một đoạn để vệt bám thân vũ khí
      }
    }
  }

  // —— Sự kiện chung ——
  const lastHit = new Map();
  function handle(ev) {
    const e = ev.id != null ? ent(ev.id) : null;
    const set = (e && H[e.heroId]) || null;
    switch (ev.type) {
      case 'aoe': if (!visible(e) && e) return; (set?.aoe || generic.aoe)(ev, e); break;
      case 'impact': if (e && !visible(e)) return; (set?.impact || generic.impact)(ev, e); break;
      case 'cone': if (!visible(e)) return; (set?.cone || generic.cone)(ev, e); break;
      case 'cast': if (visible(e)) set?.cast?.(ev, e); break;
      case 'hook': if (visible(e) || visible(ent(ev.target))) set?.hook?.(ev, e); break;
      case 'status': status(ev); break;
      case 'damage': {
        const src = ent(ev.src); if (!e || !src || !src.isHero || ev.amount < 8 || !visible(e)) break;
        const now = performance.now(); if (now - (lastHit.get(e.id) || 0) < 90) break; lastHit.set(e.id, now);
        hitFx(src, e); break;
      }
      case 'shield': {
        if (!e || !e.isHero || !visible(e)) break;
        const th = themeOf(e); if (e.heroId === 'hoa_ren' || e.heroId === 'long_dang') break; // đã có khiên riêng trong chiêu
        sh.bubble(() => rootOf(e.id), 115, { color: e.heroId === 'thach_quy' ? 0x8fe8ff : th.col, life: 30, alpha: e.heroId === 'thach_quy' ? 0.7 : 0.9, kill: () => !e.alive || !e.shields.length });
        if (e.heroId === 'thach_quy') { const r = rootOf(e.id); if (r) bubbles(r.x, r.z, 60, 10); }
        break;
      }
      case 'heal': { if (!e || !visible(e) || ev.amount < 30) break; const r = rootOf(e.id); if (r) burst(A, r.x, 30, r.z, { n: 10, r: 50, speed: [5, 20], up: [120, 260], life: [0.6, 1], size: [22, 6], color: [0xd8ffd0, 0x4cff6a], tile: TILE.star, drag: 1 }); break; }
      case 'levelup': { const r = rootOf(ev.id); if (!r || !visible(e)) break; sh.pillar(r.x, r.z, 70, 360, { color: 0xffd36a, top: 0xffffff, life: 0.8 }); sh.ring(r.x, r.z, 10, 160, { color: 0xffd36a, width: 0.1, life: 0.5 }); burst(A, r.x, 40, r.z, { n: 20, r: 40, speed: [20, 80], up: [200, 420], life: [0.6, 1], size: [26, 6], color: [0xffffff, 0xffc84a], tile: TILE.star, drag: 1 }); break; }
      case 'death': { const r = rootOf(ev.id); if (!r || !e || !visible(e) || e.kind === 'minion') break; dust(r.x, r.z, 90, 12); burst(A, r.x, 80, r.z, { n: 14, r: 40, speed: [10, 40], up: [150, 300], life: [1, 1.6], size: [30, 10], color: [0xffffff, themeOf(e).col], drag: 0.5 }); break; }
      case 'respawn': { const r = ent(ev.id)?.pos; if (r) sh.pillar(r.x, r.y, 80, 420, { color: 0x8fd8ff, top: 0xffffff, life: 0.8 }); break; }
      case 'blink': { if (!visible(e)) break; for (const p of [ev.from, ev.to]) if (p) { flash(p.x, 100, p.y, 220, 0xc8a0ff, 0.2); burst(A, p.x, 100, p.y, { n: 18, speed: [100, 300], up: [-100, 200], life: [0.3, 0.5], size: [24, 4], color: [0xffffff, 0xa070ff], drag: 3 }); } break; }
      case 'recallStart': {
        if (!e || !visible(e)) break; const until = world.tick + (ev.dur || 6) * 30;
        const r0 = ent(ev.id).pos; sh.decal('rune', r0.x, r0.y, 140, { color: 0x6fc8ff, life: ev.dur || 6, fadeIn: 0.3, spin: 0.8, alpha: 0.8 });
        aura(ev.dur || 6, () => { const r = rootOf(e.id); if (r && Math.random() < 0.6) A.spawn({ x: r.x + R(-60, 60), y: 10, z: r.z + R(-60, 60), vy: R(150, 300), life: 0.8, size: [20, 4], color: [0xd8f4ff, 0x4fa8ff] }); }, () => !e.recall || world.tick > until);
        break;
      }
      case 'restore': { const r = e?.pos; if (!r || !visible(e)) break; sh.ring(r.x, r.y, 20, 170, { color: 0xff5a74, width: 0.12, life: 0.6 }); sh.pillar(r.x, r.y, 60, 260, { color: 0xff6a80, top: 0xffffff, life: 0.6 }); burst(A, r.x, 40, r.y, { n: 22, r: 70, speed: [5, 25], up: [140, 320], life: [0.8, 1.3], size: [24, 6], color: [0xffe0e6, 0xff4a64], tile: TILE.star, drag: 1 }); break; }
      case 'recalled': { const r = e?.pos; if (r && visible(e)) sh.pillar(r.x, r.y, 90, 500, { color: 0x4fa8ff, top: 0xffffff, life: 0.5 }); break; }
      case 'towerShot': break;
      default: break;
    }
  }

  return {
    themeOf, projectile, projectileGone,
    dbg: () => [...trails].map(([id, tr]) => ({ id, sp: tr.map((x) => Math.round(x.t.maxSp)), vis: tr.map((x) => x.t.mesh.visible) })),
    handle(events, w) { world = w; for (const ev of events) handle(ev); },
    update(dt, w) {
      world = w;
      for (let i = timers.length - 1; i >= 0; i--) { const t = timers[i]; t.t -= dt; if (t.t <= 0) { timers.splice(i, 1); t.fn(); } }
      for (let i = auras.length - 1; i >= 0; i--) { const a = auras[i]; a.t += dt; if (a.t >= a.dur || a.kill?.()) { auras.splice(i, 1); continue; } a.fn(dt, a.t); }
      updateTrails(dt);
      for (const [id, tr] of trails) if (!world.byId(id)) { for (const { t } of tr) t.dispose(); trails.delete(id); }
    },
  };
}
