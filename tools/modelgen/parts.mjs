// Phụ kiện dùng chung: xương lắc (tóc, áo choàng, váy), tóc, mũ, vật cầm tay.
import * as THREE from 'three';
import { V, D2R, smooth } from './kit.mjs';
import { BONE } from './humanoid.mjs';

/** Tạo chuỗi xương lắc nối tiếp bắt đầu từ `anchor` (xương có sẵn). pts: các điểm thế giới p1..pn. */
export function swayChain(m, anchor, name, pts) {
  const bones = [anchor];
  pts.forEach((p, i) => {
    const n = BONE(`Sway${name}${i + 1}`);
    m.joint(n, bones[bones.length - 1], p[0], p[1], p[2]);
    bones.push(n);
  });
  return bones;
}

/** Ống thon dọc theo chuỗi điểm [p0..pn] (p0 tại anchor). radii cùng độ dài. */
export function tube(m, bones, pts, radii, o = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    m.seg(pts[i], pts[i + 1], radii[i], radii[i + 1], {
      bone: bones[i], color: o.color, color2: o.color2, flat: o.flat, glow: o.glow, ao: o.ao ?? 0.25, seg: o.seg || 8,
      noCap0: i > 0, noCap1: i < pts.length - 2 && !o.capEnds,
      blend: { b1: bones[i], b2: bones[i + 1], from: pts[i], to: pts[i + 1], t0: 0, t1: 1, w0: 0, w1: 1 },
    });
  }
}

/** Dải vải/lá dẹt dọc theo chuỗi điểm (áo choàng, khăn): mỗi đoạn là tấm hình thang. */
export function ribbon(m, bones, pts, widths, o = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = V(...pts[i]), b = V(...pts[i + 1]);
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    // tấm nằm trong mặt phẳng chứa trục dọc và trục X (đối diện +Z); xoay theo nghiêng về Z
    const tilt = Math.atan2(dir.z, -dir.y) * 180 / Math.PI; // độ nghiêng quanh X
    m.panel(widths[i], widths[i + 1], len, {
      at: mid.toArray(), rot: [-tilt, o.yaw || 0, 0], bone: bones[i], color: o.color, color2: o.color2, glow: o.glow,
      blend: { b1: bones[i], b2: bones[i + 1], from: pts[i], to: pts[i + 1], t0: 0, t1: 1, w0: 0, w1: 1 },
    });
  }
}

/** Váy/áo dài quanh hông: lathe từ eo xuống gấu, gấu lắc theo xương `sway`. */
export function skirt(m, { waistY, hemY, rTop, rHem, color, color2, sway, wmax = 0.75, z = 0, seg = 18, glow = false, squash = [1, 1] }) {
  const prof = [[rHem, hemY], [(rHem + rTop) / 2 + 0.01, (hemY + waistY) / 2], [rTop, waistY]];
  m.lathe(prof.map(([r, y]) => [r, y - waistY]), {
    at: [0, waistY, z], scale: [squash[0], 1, squash[1]], color, color2, bone: BONE('Hips'), glow, seg, ao: 0.25,
    blend: sway ? { b1: BONE('Hips'), b2: sway, from: [0, waistY, 0], to: [0, hemY, 0], t0: 0, t1: 1, w0: 0, w1: wmax } : undefined,
  });
}

/** Mũ chóp/nón lá: nón nghiêng cắt vát. */
export function conicalHat(m, ctx, { r = 1.45, h = 0.55, color, color2, tilt = 0, y = 0.55 }) {
  const { hr, hc } = ctx;
  m.cone(hr * r, hr * h * 3, { at: [0, hc.y + hr * y + hr * h * 1.4, hc.z], rot: [tilt, 0, 0], bone: BONE('Head'), color, color2, seg: 20, ao: 0.2 });
}

/** Tóc phủ mặc định: mũ tóc trên đầu + mái. */
export function hairCap(m, ctx, { color, color2, back = 0.14, bangs = true, sideLocks = true, top = 1.06 }) {
  const { hr, hc } = ctx;
  m.sphere(1, { radii: [hr * 1.03, hr * top, hr * 1.04], at: [0, hc.y + hr * 0.1, hc.z - hr * back], bone: BONE('Head'), color, color2, wseg: 20, hseg: 14, ao: 0.2 });
  if (bangs) m.sphere(1, { radii: [hr * 0.95, hr * 0.3, hr * 0.42], at: [0, hc.y + hr * 0.7, hc.z + hr * 0.62], rot: [-12, 0, 0], bone: BONE('Head'), color, ao: 0.2 });
  if (sideLocks) m.sphere(1, { radii: [hr * 0.2, hr * 0.62, hr * 0.32], at: [hr * 0.86, hc.y - hr * 0.05, hc.z + hr * 0.05], bone: BONE('Head'), color, mirror: true, ao: 0.2 });
}

// ---------- hình khối phụ trợ cho từng tướng ----------

/** Đường cong dày rời (sừng, đuôi, dây leo, cung): nối các điểm bằng khúc thon, cùng một xương. */
export function curve(m, pts, radii, o = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    m.seg(pts[i], pts[i + 1], radii[i], radii[i + 1], { ...o, noCap0: i > 0, noCap1: false, seg: o.seg || 8 });
  }
}

/** Điểm trên cung tròn (mặt phẳng XY, tâm c) từ góc a0 đến a1 (độ), z cố định. */
export function arcPts(c, R, a0, a1, n, z = 0) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180; out.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a), z]); }
  return out;
}

/** Lá/cánh/lông vũ dẹt: đa giác đùn mỏng. Hướng chỉ +Y, rộng theo X. */
export function leaf(m, { at, len = 0.3, w = 0.1, rot = [0, 0, 0], thick = 0.012, color, color2, bone, mirror = false, glow = false, bulge = 0.4 }) {
  const pts = [[0, 0], [w * 0.5, len * bulge], [w * 0.28, len * 0.8], [0, len], [-w * 0.28, len * 0.8], [-w * 0.5, len * bulge]];
  m.extrude(pts, thick, { at, rot, color, color2, bone, mirror, glow, bevel: false, ao: 0.15 });
}

/** Gai/nón nhọn theo hướng rot (độ) từ điểm at. */
export function spike(m, { at, len = 0.12, r = 0.03, rot = [0, 0, 0], color, bone, mirror = false, seg = 6, glow = false }) {
  m.cone(r, len, { at, rot, color, bone, mirror, seg, glow, ao: 0.2 });
}

/** Vai giáp/bảo vệ vai hình bán cầu gắn xương UpperArm. */
export function pauldron(m, ctx, side, { r = 0.09, color, trim, spikes = 0, squash = 0.7 }) {
  const sg = side === 'L' ? 1 : -1;
  const sp = ctx.shoulder;
  const bone = BONE('UpperArm' + side);
  m.sphere(1, { radii: [r * 1.05, r * squash, r], at: [sg * (sp.x + r * 0.15), sp.y + r * 0.35, sp.z], rot: [0, 0, sg * -12], bone, color, ao: 0.25, wseg: 14, hseg: 8 });
  if (trim) m.torus(r * 0.98, r * 0.09, { at: [sg * (sp.x + r * 0.15), sp.y + r * 0.2, sp.z], rot: [90, 0, sg * -12], bone, color: trim, seg: 18 });
  for (let i = 0; i < spikes; i++) {
    const a = ((i + 0.5) / spikes - 0.5) * 100;
    m.cone(r * 0.2, r * 0.9, { at: [sg * (sp.x + r * 0.5), sp.y + r * 0.8, sp.z + Math.sin(a * Math.PI / 180) * r * 0.7], rot: [a * 0.6, 0, sg * -40], bone, color: trim || color, seg: 6 });
  }
}

/** Vòng đai quanh chi: đoạn trụ ngắn tại vị trí t (0..1) trên p0→p1. */
export function band(m, p0, p1, t, len, r, o = {}) {
  const a = V(...p0), b = V(...p1);
  const c = a.clone().lerp(b, t - len / 2), d = a.clone().lerp(b, t + len / 2);
  m.seg(c.toArray(), d.toArray(), r, r, { ...o, noCap0: true, noCap1: true, seg: o.seg || 10 });
}

/** Trống đồng nhỏ: mặt tròn có hoa văn ngôi sao và viền. Trục theo +Z cục bộ (mặt trống nhìn +Z). */
export function bronzeDrum(m, { at, r = 0.16, h = 0.14, rot = [0, 0, 0], bone, color = '#b8843a', face = '#d9a441', dark = '#6b4a20' }) {
  m.cyl(r * 0.78, r, h, { at, rot: [rot[0] + 90, rot[1], rot[2]], bone, color: dark, color2: color, seg: 16 });
  m.cyl(r * 1.02, r * 1.02, h * 0.16, { at: [at[0], at[1], at[2] + h * 0.5], rot: [rot[0] + 90, rot[1], rot[2]], bone, color: face, seg: 18 });
  const cz = at[2] + h * 0.6;
  m.cone(r * 0.32, r * 0.3, { at: [at[0], at[1], cz], rot: [rot[0] + 90, rot[1], rot[2]], bone, color: dark, seg: 8 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m.box(r * 0.08, r * 0.42, h * 0.05, { at: [at[0] + Math.sin(a) * r * 0.62, at[1] + Math.cos(a) * r * 0.62, cz - h * 0.04], rot: [0, 0, -a * 180 / Math.PI], bone, color: dark });
  }
  m.torus(r * 0.9, r * 0.04, { at: [at[0], at[1], cz - h * 0.02], bone, color: dark, seg: 20 });
}

/** Góc quay (độ, XYZ) đưa trục +Y về hướng dir — dùng để đặt đầu vũ khí theo trục cán. */
export function orient(dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x / D2R, e.y / D2R, e.z / D2R];
}
/** Điểm p + dir*d (dir chuẩn hoá). */
export const along = (p, dir, d) => { const v = V(...dir).normalize(); return [p[0] + v.x * d, p[1] + v.y * d, p[2] + v.z * d]; };
/** Hàm trọng số theo độ cao: dưới y0 hoàn toàn xương low, trên y1 hoàn toàn xương high. */
export const wy = (y0, y1, low, high) => (p) => { const t = smooth(y0, y1, p.y); return t <= 0 ? [[low, 1]] : t >= 1 ? [[high, 1]] : [[low, 1 - t], [high, t]]; };

/** Điểm thế giới = p + R(dir)·off, với R là phép quay đưa +Y về dir (đặt chi tiết dọc theo cán vũ khí). */
export function place(dir, p, off) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...orient(dir).map((a) => a * D2R), 'XYZ'));
  const v = V(...off).applyQuaternion(q);
  return [p[0] + v.x, p[1] + v.y, p[2] + v.z];
}
/** Vị trí nắm tay của một bên (điểm gần đầu ngón). */
export function handPos(ctx, side) {
  const d = ctx.armDirs[side];
  return [d.W.x * 0.2 + d.T.x * 0.8, d.W.y * 0.2 + d.T.y * 0.8, d.W.z * 0.2 + d.T.z * 0.8];
}

/** Chuỗi xương lắc buông thõng (tóc, rễ, râu, dải): bắt đầu từ `start`, rủ xuống với độ lệch drift. */
export function dangle(m, anchor, name, start, { len = 0.5, n = 3, drift = [0, 0], wave = 0.02, r0 = 0.03, r1 = 0.006, color, color2, glow = false }) {
  const pts = [start];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push([start[0] + drift[0] * t + Math.sin(t * 5 + start[0] * 9) * wave, start[1] - len * t, start[2] + drift[1] * t + Math.cos(t * 4 + start[2] * 7) * wave]);
  }
  const bones = swayChain(m, anchor, name, pts.slice(1));
  const radii = pts.map((_, i) => r0 + (r1 - r0) * (i / n));
  tube(m, bones, pts, radii, { color, color2, glow, ao: 0.25 });
  return bones;
}

/** Điểm và pháp tuyến trên mặt elipsoid (tâm c, bán kính r): góc phương vị az, độ cao el (độ), phía sau = -Z nếu back. */
export function onEllipsoid(c, r, az, el, back = true) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  const sgn = back ? -1 : 1;
  const p = [c[0] + r[0] * Math.cos(e) * Math.sin(a), c[1] + r[1] * Math.sin(e), c[2] + sgn * r[2] * Math.cos(e) * Math.cos(a)];
  const n = V((p[0] - c[0]) / (r[0] * r[0]), (p[1] - c[1]) / (r[1] * r[1]), (p[2] - c[2]) / (r[2] * r[2])).normalize();
  return { p, n: n.toArray() };
}

/** Tà áo/vạt vải treo từ hông, lắc theo xương riêng (tự tạo). at: [x, z] tại độ cao top. */
export function flap(m, name, { at = [0, 0], top, bottom, wTop = 0.2, wBot = 0.28, rotY = 0, tilt = 0, color, color2, ao = 0.12, wmax = 0.85, bone = BONE('Hips'), pivotY = null }) {
  const sw = BONE('Sway' + name);
  if (!m.has(sw)) m.joint(sw, bone, at[0], pivotY ?? top, at[1]);
  const mid = (top + bottom) / 2;
  m.panel(wTop, wBot, top - bottom, { at: [at[0], mid, at[1]], rot: [tilt, rotY, 0], bone, color, color2, ao,
    blend: { b1: bone, b2: sw, from: [at[0], top, at[1]], to: [at[0], bottom, at[1]], t0: 0.05, t1: 1, w0: 0, w1: wmax } });
  return sw;
}

/** Dây leo/xoắn ốc quanh trục p0→p1 (vòng quấn tay, cột). */
export function helix(m, p0, p1, { radius = 0.05, turns = 2, n = 16, r = 0.008, color, bone, glow = false, phase = 0 }) {
  const a = V(...p0), b = V(...p1), ax = b.clone().sub(a);
  const dir = ax.clone().normalize();
  const u = Math.abs(dir.y) < 0.9 ? V(0, 1, 0).cross(dir).normalize() : V(1, 0, 0).cross(dir).normalize();
  const v = dir.clone().cross(u);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ang = phase + t * turns * Math.PI * 2;
    pts.push(a.clone().add(ax.clone().multiplyScalar(t)).add(u.clone().multiplyScalar(Math.cos(ang) * radius)).add(v.clone().multiplyScalar(Math.sin(ang) * radius)).toArray());
  }
  curve(m, pts, pts.map(() => r), { bone, color, glow, seg: 5 });
}

/** Góc quay (độ, XYZ) đưa trục +Z (trục vòng xuyến/đĩa) về hướng dir. */
export function orientZ(dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x / D2R, e.y / D2R, e.z / D2R];
}
