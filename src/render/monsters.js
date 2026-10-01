import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm } from './env/noise.js';

// Quái rừng & mục tiêu lớn dựng bằng code (tạo hình riêng của Lantern Arena):
//  Sói Đá (sói tạc đá rêu, mắt hổ phách, gai pha lê lưng) · Cóc Rêu (cóc khổng lồ phủ rêu, mọc nấm) ·
//  Linh Thuỷ (tinh linh nước đeo mặt nạ đá — bùa xanh) · Hoả Nham (người đá nham thạch, lõi lửa — bùa đỏ) ·
//  Long Ngư (cá chép vàng đang hoá rồng, ngậm ngọc) · Hổ Lôi (thần hổ vằn, bờm sấm sét).
// Model nhìn về +Z. update(dt, moving, attackT) với attackT ∈ [0,1] tiến trình đòn đánh (0 = không đánh).

const C = (c) => new THREE.Color(c);
const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const glow = (color, k = 1.6) => new THREE.MeshBasicMaterial({ color: C(color).multiplyScalar(k) });

/** Khối đá gồ ghề có màu đỉnh: đá ở dưới, rêu trên mặt hướng lên (moss = màu rêu hoặc null). */
function rock(seed, amp = 0.35, rockCol = 0x77736c, moss = 0x4f7a3a, detail = 2) {
  const g0 = new THREE.IcosahedronGeometry(1, detail); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
  const g = mergeVertices(g0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 1.7 + seed, z * 1.7 + y * 1.3 + seed * 0.7, 3) - 0.5) * amp * 2; p.setXYZ(i, x * k, y * k, z * k); }
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), a = C(rockCol), m = moss != null ? C(moss) : null, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { c.copy(a).multiplyScalar(0.8 + fbm(p.getX(i) * 4 + seed, p.getZ(i) * 4, 2) * 0.4); if (m && n.getY(i) > 0.45) c.lerp(m, Math.min(1, (n.getY(i) - 0.45) * 2.4)); col.set([c.r, c.g, c.b], 3 * i); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const VCs = new THREE.MeshLambertMaterial({ vertexColors: true });
function put(parent, geo, mat, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
const SPH = new THREE.SphereGeometry(1, 16, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 8);

/** Bộ khung chung: nhóm gốc + nhóm thân (để nhún/lao), trả về hàm update. */
function rig(build, anim) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = build(body) || {};
  let t = Math.random() * 10;
  return { object: root, update(dt, moving, atk) { t += dt; anim(t, dt, moving, atk || 0, body, parts); } };
}
const lunge = (a) => (a <= 0 ? 0 : a < 0.5 ? -Math.sin(a * 2 * Math.PI / 2) * 0.4 : Math.sin((a - 0.5) * 2 * Math.PI) * 1); // lùi lấy đà rồi vồ

function wolf(scale = 1) {
  return rig((b) => {
    const st = 0x7c7a76, mo = 0x5a7e3e;
    put(b, rock(1, 0.25, st, mo), VC, [0, 95, 0], [55, 52, 100]);
    put(b, rock(2, 0.25, st, mo), VC, [0, 108, 48], [58, 58, 55]);
    const head = new THREE.Group(); head.position.set(0, 128, 108); b.add(head);
    put(head, rock(3, 0.2, st, null), VC, [0, 0, 0], [34, 30, 38]);
    put(head, CONE, lam(0x6a6862, { flatShading: true }), [0, -8, 38], [15, 48, 15], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { put(head, CONE, lam(0x6a6862, { flatShading: true }), [s * 18, 30, -8], [9, 28, 9], [-0.3, 0, s * -0.3]); put(head, SPH, glow(0xffb030, 2), [s * 14, 8, 26], [5, 4, 4]); }
    const legs = [];
    for (const [x, z] of [[-28, 55], [28, 55], [-26, -55], [26, -55]]) { const l = new THREE.Group(); l.position.set(x, 80, z); put(l, CYL, lam(0x66645e, { flatShading: true }), [0, -40, 0], [12, 80, 12]); b.add(l); legs.push(l); }
    put(b, CONE, lam(0x6a6862, { flatShading: true }), [0, 110, -115], [16, 80, 16], [-2.1, 0, 0]);
    for (let i = 0; i < 3; i++) put(b, CONE, glow(0x6ae8d8, 1.3), [0, 150 - i * 4, 40 - i * 40], [9, 40 - i * 6, 9], [-0.3, 0, 0]); // gai pha lê lưng
    b.scale.setScalar(scale);
    return { head, legs };
  }, (t, dt, moving, atk, b, p) => {
    const sw = moving ? Math.sin(t * 14) * 0.6 : 0;
    p.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? sw : -sw) * (i < 2 ? 1 : -1); });
    b.position.y = moving ? Math.abs(Math.sin(t * 14)) * 6 : Math.sin(t * 2) * 1.5;
    b.position.z = lunge(atk) * 50; p.head.rotation.x = atk > 0.4 && atk < 0.8 ? 0.35 : Math.sin(t * 1.3) * 0.05;
  });
}

function toad() {
  return rig((b) => {
    put(b, rock(4, 0.18, 0x5f6e3a, 0x7fa048), VCs, [0, 75, 0], [110, 72, 100]);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 50 + (i % 3) * 18; put(b, SPH, lam(0x4a5a2c), [Math.cos(a) * r, 120 + (i % 4) * 6, Math.sin(a) * r * 0.8 - 10], [12, 8, 12]); } // u nần
    const throat = put(b, SPH, lam(0xd8c890), [0, 50, 70], [60, 32, 40]);
    for (const s of [-1, 1]) {
      put(b, SPH, lam(0xe8d040), [s * 45, 130, 55], [22, 22, 22]); put(b, SPH, lam(0x101010), [s * 48, 132, 74], [8, 12, 4]);
      put(b, SPH, lam(0x55642f), [s * 90, 40, -30], [45, 35, 60]); put(b, SPH, lam(0x55642f), [s * 60, 25, 70], [25, 25, 35]);
    }
    for (const [x, z, k] of [[30, -40, 1], [-25, -10, 0.8], [5, -60, 0.7]]) { put(b, CYL, lam(0xe8dcc0), [x, 150 * 1, z], [5 * k, 30 * k, 5 * k]); put(b, SPH, lam(0xc8402a), [x, 165, z], [24 * k, 12 * k, 24 * k]); } // nấm
    return { throat };
  }, (t, dt, moving, atk, b, p) => {
    p.throat.scale.set(60, 32 + Math.max(0, Math.sin(t * 3)) * 10, 40);
    const hop = atk > 0 ? Math.sin(Math.min(1, atk) * Math.PI) : moving ? Math.abs(Math.sin(t * 6)) * 0.4 : 0;
    b.position.y = hop * 60; b.position.z = lunge(atk) * 40; b.scale.y = 1 - Math.sin(t * 2) * 0.03;
  });
}

function waterSpirit() {
  return rig((b) => {
    const water = new THREE.MeshStandardMaterial({ color: 0x3fb4ff, emissive: 0x0a4a8a, emissiveIntensity: 0.9, transparent: true, opacity: 0.78, roughness: 0.1, metalness: 0.1 });
    put(b, rock(5, 0.3, 0x6f7c88, 0x4f8a6a), VC, [0, 20, 0], [80, 30, 80]); // đá nền
    const swirl = put(b, CONE, water, [0, 110, 0], [55, 160, 55], [Math.PI, 0, 0]);
    const torso = put(b, SPH, water, [0, 220, 0], [80, 95, 65]);
    const head = new THREE.Group(); head.position.set(0, 330, 0); b.add(head);
    put(head, SPH, water, [0, 0, 0], [48, 55, 45]);
    put(head, rock(6, 0.15, 0xc8c0b0, null, 1), VC, [0, 4, 30], [40, 48, 18]); // mặt nạ đá
    for (const s of [-1, 1]) put(head, SPH, glow(0x9ff8ff, 2.2), [s * 16, 12, 48], [7, 5, 3]);
    const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 85, 260, 0); for (let i = 0; i < 4; i++) put(a, SPH, water, [s * i * 22, -i * 30, i * 8], [26 - i * 3, 26 - i * 3, 26 - i * 3]); b.add(a); return a; });
    const orb = new THREE.Group(); orb.position.y = 220; b.add(orb);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; put(orb, SPH, glow(0x8fe8ff, 1.4), [Math.cos(a) * 140, Math.sin(i * 1.7) * 40, Math.sin(a) * 140], [9, 12, 9]); }
    return { swirl, torso, head, arms, orb };
  }, (t, dt, moving, atk, b, p) => {
    b.position.y = 14 + Math.sin(t * 1.6) * 10; p.orb.rotation.y += dt * 1.2; p.swirl.rotation.y += dt * 2;
    p.torso.scale.set(80 + Math.sin(t * 2.4) * 4, 95 + Math.sin(t * 2.4 + 1) * 5, 65);
    p.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 1.5 + i) * 0.1) + (atk > 0 ? (i ? 1 : -1) * Math.sin(atk * Math.PI) * 0.8 : 0); a.rotation.x = atk > 0 ? -Math.sin(atk * Math.PI) * 1.2 : 0; });
  });
}

function lavaGolem() {
  return rig((b) => {
    const core = new THREE.MeshBasicMaterial({ color: C(0xff6a1a).multiplyScalar(1.8) });
    put(b, SPH, core, [0, 220, 0], [78, 88, 65]); // lõi lửa lộ qua kẽ đá
    for (const [x, y, z, s, sd] of [[0, 260, -10, 70, 7], [-45, 210, 20, 55, 8], [48, 205, 18, 52, 9], [0, 170, 30, 50, 10], [0, 285, 25, 42, 11], [-30, 250, -45, 45, 12], [35, 240, -40, 44, 13]])
      put(b, rock(sd, 0.4, 0x3d3430, 0x6a4a3a, 1), VC, [x, y, z], [s, s * 0.9, s]);
    const head = new THREE.Group(); head.position.set(0, 340, 20); b.add(head);
    put(head, rock(14, 0.35, 0x3d3430, null, 1), VC, [0, 0, 0], [34, 30, 30]);
    for (const s of [-1, 1]) put(head, SPH, glow(0xffa030, 2.2), [s * 12, 2, 26], [6, 4, 4]);
    const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 95, 270, 0); put(a, rock(15 + s, 0.4, 0x3d3430, 0x6a4a3a, 1), VC, [s * 15, -50, 0], [40, 55, 40]); put(a, SPH, core, [s * 18, -95, 0], [22, 14, 22]); put(a, rock(17 + s, 0.4, 0x2e2622, null, 1), VC, [s * 20, -140, 10], [55, 50, 55]); b.add(a); return a; });
    for (const s of [-1, 1]) put(b, rock(19 + s, 0.35, 0x2e2622, null, 1), VC, [s * 45, 70, 0], [45, 75, 45]);
    return { head, arms, core };
  }, (t, dt, moving, atk, b, p) => {
    p.core.color.setRGB(1, 0.42, 0.1).multiplyScalar(1.5 + Math.sin(t * 5) * 0.3);
    b.rotation.z = Math.sin(t * 1.2) * 0.03; b.position.y = moving ? Math.abs(Math.sin(t * 5)) * 8 : 0;
    const raise = atk > 0 ? (atk < 0.55 ? atk / 0.55 : Math.max(0, 1 - (atk - 0.55) * 4)) : 0;
    p.arms.forEach((a, i) => { a.rotation.x = -raise * 2.4 + (moving ? Math.sin(t * 5 + i * Math.PI) * 0.4 : 0); });
    b.position.z = atk > 0.55 ? 30 : 0;
  });
}

function carp() {
  return rig((b) => {
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2b33a, emissive: 0x3a1c00, roughness: 0.35, metalness: 0.55 });
    const belly = new THREE.MeshStandardMaterial({ color: 0xfff0c8, roughness: 0.5, metalness: 0.2 });
    const fin = new THREE.MeshStandardMaterial({ color: 0xe8502a, emissive: 0x401000, transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 0.4 });
    const N = 13, segs = [];
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), r = 95 * Math.sin(Math.PI * (0.15 + 0.85 * (1 - k)) * 0.6 + 0.35) * (1 - k * 0.6);
      const g = new THREE.Group(); b.add(g);
      put(g, SPH, gold, [0, 0, 0], [r * 0.9, r, r * 1.15]); put(g, SPH, belly, [0, -r * 0.35, 0], [r * 0.7, r * 0.6, r]);
      if (i > 1 && i < N - 2 && i % 2 === 0) { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(10, r * 0.9, -r * 0.9, r * 0.8); s.lineTo(-r * 0.8, 0); const fg = new THREE.ShapeGeometry(s); const m = new THREE.Mesh(fg, fin); m.rotation.y = Math.PI / 2; m.position.y = r * 0.85; g.add(m); }
      segs.push({ g, r });
    }
    const head = segs[0].g;
    for (const s of [-1, 1]) {
      put(head, SPH, lam(0xffffff), [s * 50, 25, 55], [16, 16, 14]); put(head, SPH, lam(0x101010), [s * 54, 27, 66], [7, 8, 5]);
      put(head, CONE, lam(0xf8e8b0), [s * 30, 85, -10], [8, 70, 8], [-0.5, 0, s * 0.4]); // sừng non (sắp hoá rồng)
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 30, -10, 95), new THREE.Vector3(s * 90, -20, 130), new THREE.Vector3(s * 150, 10, 110), new THREE.Vector3(s * 200, -30, 60)]);
      head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 3, 5), lam(0xffd890))); // râu rồng
      const pf = new THREE.Shape(); pf.moveTo(0, 0); pf.quadraticCurveTo(60, -20, 90, -70); pf.lineTo(20, -40);
      const pm = new THREE.Mesh(new THREE.ShapeGeometry(pf), fin); pm.position.set(s * 70, -40, -30); pm.rotation.set(0, s > 0 ? -0.3 : Math.PI + 0.3, 0); segs[2].g.add(pm);
    }
    const pearl = put(b, SPH, glow(0xfff4d0, 1.9), [0, 0, 0], [26, 26, 26]);
    const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.quadraticCurveTo(90, 60, 140, 150); tail.quadraticCurveTo(60, 70, 0, 40); tail.quadraticCurveTo(-60, 70, -140, 150); tail.quadraticCurveTo(-90, 60, 0, 0);
    const tm = new THREE.Mesh(new THREE.ShapeGeometry(tail), fin); tm.rotation.y = Math.PI / 2; segs[N - 1].g.add(tm);
    return { segs, pearl, tm };
  }, (t, dt, moving, atk, b, p) => {
    // thân uốn hình chữ S vồng lên khỏi mặt nước, đầu chúc về phía trước
    const N = p.segs.length, rear = atk > 0 ? Math.sin(atk * Math.PI) * 60 : 0;
    p.segs.forEach((s, i) => {
      const k = i / (N - 1), a = Math.PI * (0.15 + k * 0.85);
      s.g.position.set(Math.sin(t * 1.6 - k * 4) * 40 * k, 120 + Math.sin(a) * 230 + rear * (1 - k) - k * 80, 160 - k * 520 + Math.cos(a) * 60);
      s.g.rotation.x = -Math.cos(a) * 0.9; s.g.rotation.y = Math.cos(t * 1.6 - k * 4) * 0.3 * k;
    });
    const h = p.segs[0].g.position; p.pearl.position.set(h.x, h.y - 40 + Math.sin(t * 3) * 12, h.z + 150);
    p.tm.rotation.x = Math.sin(t * 3) * 0.3;
  });
}

let stripeTex = null;
function stripes() {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#f0a040'); gr.addColorStop(0.7, '#e08a2a'); gr.addColorStop(1, '#fff0d8'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#1a1210';
  for (let i = 0; i < 14; i++) { const x = i * 19 + 4; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 14, 60, x - 2, 130); g.lineTo(x + 6, 130); g.quadraticCurveTo(x + 20, 60, x + 9, 0); g.fill(); }
  stripeTex = new THREE.CanvasTexture(c); stripeTex.colorSpace = THREE.SRGBColorSpace; stripeTex.wrapS = THREE.RepeatWrapping; stripeTex.repeat.set(2, 1);
  return stripeTex;
}
function tiger() {
  return rig((b) => {
    const fur = new THREE.MeshLambertMaterial({ map: stripes() }), pale = lam(0xfff0d8), bolt = glow(0x7ad8ff, 2);
    put(b, SPH, fur, [0, 210, -20], [120, 110, 220], [Math.PI / 2, 0, 0]);
    put(b, SPH, fur, [0, 240, 120], [125, 125, 120]);
    const head = new THREE.Group(); head.position.set(0, 310, 250); b.add(head);
    put(head, SPH, fur, [0, 0, 0], [90, 82, 85], [Math.PI / 2, 0, 0]);
    put(head, SPH, pale, [0, -25, 60], [55, 40, 45]);
    put(head, SPH, lam(0x241614), [0, -5, 100], [16, 11, 10]);
    for (const s of [-1, 1]) {
      put(head, SPH, glow(0x9ff0ff, 2.4), [s * 35, 22, 70], [12, 8, 6]);
      put(head, CONE, fur, [s * 55, 75, -10], [24, 40, 16], [0, 0, s * -0.3]);
      put(head, CONE, pale, [s * 18, -55, 70], [6, 26, 6], [Math.PI, 0, 0]); // nanh
    }
    const mane = new THREE.Group(); mane.position.set(0, 270, 170); b.add(mane); // bờm sấm: gai pha lê điện quanh cổ
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; put(mane, CONE, bolt, [Math.cos(a) * 120, Math.sin(a) * 120, 0], [14, 90, 14], [0, 0, a - Math.PI / 2]); }
    const legs = [];
    for (const [x, z] of [[-75, 150], [75, 150], [-70, -170], [70, -170]]) { const l = new THREE.Group(); l.position.set(x, 170, z); put(l, CYL, fur, [0, -80, 0], [38, 170, 38]); put(l, SPH, pale, [0, -165, 15], [42, 22, 50]); b.add(l); legs.push(l); }
    const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 230, -230), new THREE.Vector3(0, 300, -340), new THREE.Vector3(0, 420, -360), new THREE.Vector3(0, 470, -280)]);
    b.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 20, 18, 8), fur));
    const tip = put(b, SPH, bolt, [0, 470, -280], [30, 30, 30]);
    const arcs = new THREE.Group(); b.add(arcs);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; put(arcs, CYL, bolt, [Math.cos(a) * 200, 330 + (i % 2) * 60, Math.sin(a) * 200], [3, 110, 3], [0.6, 0, a]); }
    return { head, legs, mane, tip, arcs };
  }, (t, dt, moving, atk, b, p) => {
    b.scale.y = 1 + Math.sin(t * 1.8) * 0.015; p.mane.rotation.z += dt * 0.6; p.arcs.rotation.y -= dt * 1.4;
    p.arcs.visible = Math.sin(t * 17) * Math.sin(t * 7) > -0.3; p.tip.scale.setScalar(26 + Math.sin(t * 13) * 6);
    p.head.rotation.x = atk > 0 ? -Math.sin(atk * Math.PI) * 0.35 : Math.sin(t * 0.9) * 0.05;
    b.position.z = lunge(atk) * 90; b.position.y = atk > 0.4 && atk < 0.9 ? Math.sin((atk - 0.4) / 0.5 * Math.PI) * 60 : 0;
  });
}

export function createMonster(type, member) {
  if (type === 'soi_da') return wolf(member === 'alpha' ? 1 : 0.65);
  if (type === 'coc_reu') return toad();
  if (type === 'linh_thuy') return waterSpirit();
  if (type === 'hoa_nham') return lavaGolem();
  if (type === 'long_ngu') return carp();
  if (type === 'ho_loi') return tiger();
  return wolf(1);
}
void mergeGeometries;
