// Sinh model quái rừng, mục tiêu lớn và lính: assets/monsters/<id>.glb.
// Thân liền khối SDF có xương (màu tô theo đỉnh + AO khe) + chi tiết cứng sắc cạnh dựng bằng khối hình học
// (đá cắt giác, pha lê, sừng, lông vũ, vây, ngọn lửa, giáp) — gắn xương, cùng một lưới.
// Không có clip: game tự xoay xương theo thời gian (src/render/monsterModels.js). Đơn vị mét, mặt nhìn +Z, bên trái nhân vật ở +X.
// _mat của đỉnh (shader quái dựa vào đây): 0 lông, 1 da trơn, 2 đá/giáp/vảy cứng, 3 vảy cá (shader vẽ hàng vảy), 5 phát sáng,
//   7 kim loại sáng (vàng/thép), 9 lông vũ (shader vẽ lớp lông chồng); lính thêm 4 giáp màu đội, 6 phát sáng màu đội, 8 vải màu đội.
// Mỗi model một vật liệu, một lượt vẽ (phần phát sáng chỉ khác _mat). Thuộc tính đỉnh gói gọn (màu u16, xương u8, bỏ uv) — glTF lõi.
// Dùng: node monsters.mjs [id ...]
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Model } from './kit.mjs';
import { segWeights } from './sdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, '../../assets/monsters');
const FUR = 0, SKIN = 1, HARD = 2, SCALE = 3, TEAM = 4, GLOW = 5, TEAMGLOW = 6, METAL = 7, TEAMCLOTH = 8, FEATHER = 9;
const STEEL = '#c3cad3', GOLD = '#e6b450', LEATHER = '#5a3a22', DARKCLOTH = '#2e2a30';

// —— nhiễu giá trị 3D (tô màu lông/da) ——
const hash = (x, y, z) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); n = Math.imul(n ^ (n >>> 13), 1103515245); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function vn(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
  const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), fx), L(h(0, 1, 0), h(1, 1, 0), fx), fy), L(L(h(0, 0, 1), h(1, 0, 1), fx), L(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}
const fbm = (x, y, z, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mixC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));
const hex = (c) => '#' + c.getHexString();
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const W1 = (b) => () => [[b, 1]];
const D2R = Math.PI / 180, V3 = (a) => new THREE.Vector3(...a);

function finish(m, id) {
  m.userData = { name: id };
  return m.build();
}

// ———————————————————— tiện ích chi tiết sắc nét (không qua SDF) ————————————————————
/** Góc xoay (độ, thứ tự XYZ của kit) đưa trục +Y cục bộ về hướng d. */
function aim(d) { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), V3(d).normalize()); const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'); return [e.x / D2R, e.y / D2R, e.z / D2R]; }
/** Góc xoay đưa +Y cục bộ về d, mặt tấm (+Z cục bộ) về phía up. */
function frame(d, up) {
  const y = V3(d).normalize(), x = new THREE.Vector3().crossVectors(y, V3(up)).normalize(), z = new THREE.Vector3().crossVectors(x, y);
  const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z), 'XYZ'); return [e.x / D2R, e.y / D2R, e.z / D2R];
}
/** Tô lại màu (và chất liệu) các đỉnh vừa thêm từ v0: fn(x, y, z, ny, j) → hex | [hex, mat]; ao: tối phần quay xuống. */
function paint(m, v0, fn, ao = 0.3) {
  const c = new THREE.Color();
  for (let i = v0; i < m.vcount; i++) {
    const r = fn(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2], m.nor[i * 3 + 1], i - v0), [h, mt] = Array.isArray(r) ? r : [r];
    c.set(h); const sh = 1 - ao + ao * (m.nor[i * 3 + 1] * 0.5 + 0.5);
    m.col[i * 3] = c.r * sh; m.col[i * 3 + 1] = c.g * sh; m.col[i * 3 + 2] = c.b * sh;
    if (mt != null) m.mat[i] = mt;
  }
}
/** Thêm hình có thuộc tính k (u, v cục bộ) rồi tô theo nó: fn(u, v, x, y, z) → hex | [hex, mat]. (Không dùng flat — giữ thứ tự đỉnh.) */
function addK(m, g, o, fn) {
  const v0 = m.vcount, K = g.getAttribute('k'), n = K.count; m.add(g, o);
  paint(m, v0, (x, y, z, ny, j) => fn(K.getX(j % n), K.getY(j % n), x, y, z), o.ao ?? 0.25);
}
/** Lưới 2 mặt từ lưới một mặt (pos, k, idx): mặt sau lùi nhẹ theo pháp tuyến, đảo chiều. */
function twoSided(pos, k, idx, eps = 0.002) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = pos.length / 3, N = Array.from(g.attributes.normal.array), P2 = [], N2 = [], idx2 = [];
  for (let i = 0; i < n * 3; i++) { P2.push(pos[i] - N[i] * eps); N2.push(-N[i]); }
  for (let t = 0; t < idx.length; t += 3) idx2.push(idx[t] + n, idx[t + 2] + n, idx[t + 1] + n);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute([...pos, ...P2], 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute([...N, ...N2], 3));
  out.setAttribute('k', new THREE.Float32BufferAttribute([...k, ...k], 2));
  out.setIndex([...idx, ...idx2]); return out;
}
/** Tấm lưới 2 mặt nu×nv ô: f(u, v) → [x, y, z] (u, v ∈ [0, 1]); k = (u, v). */
function gridGeo(nu, nv, f) {
  const pos = [], k = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { pos.push(...f(i / nu, j / nv)); k.push(i / nu, j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  return twoSided(pos, k, idx);
}
/** Lá / lông vũ / ngọn lửa: dài len theo +Y, rộng w theo X, mặt trước +Z, sống giữa nổi; bend cong về +Z. k = (u ngang, v dọc). */
const leafGeo = (w, len, { bend = 0, ridge = 0.08, nu = 2, nv = 6, prof = (v) => Math.sin(Math.PI * Math.pow(v, 0.7)), curl = 0 } = {}) =>
  gridGeo(nu, nv, (u, v) => { const s = u * 2 - 1; return [s * w / 2 * prof(v), v * len, bend * v * v * len + ridge * w * (1 - Math.abs(s)) + curl * w * s * s]; });
/** Vây quạt trong mặt XY: tâm ở gốc, quét góc a0→a1 (rad, 0 = +Y, dương về +X), bán kính R·edge(u). k = (u góc, v bán kính). */
const fanGeo = (R, a0, a1, { nu = 12, nv = 3, edge = () => 1, cup = 0 } = {}) =>
  gridGeo(nu, nv, (u, v) => { const a = a0 + (a1 - a0) * u, r = R * v * edge(u); return [Math.sin(a) * r, Math.cos(a) * r, cup * v * v * R]; });
/** Ống thon theo đường cong qua pts (sừng, râu, dải nước), bán kính r(t) hoặc [r0, r1]. k = (t dọc, góc). */
function tubeGeo(pts, r, { radial = 8, segs = 12 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V3)), g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const rf = typeof r === 'function' ? r : (t) => r[0] + (r[1] - r[0]) * t, P = g.attributes.position, K = [], c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c); const rr = rf(i / segs);
    for (let j = 0; j <= radial; j++) { const q = i * (radial + 1) + j; P.setXYZ(q, c.x + (P.getX(q) - c.x) * rr, c.y + (P.getY(q) - c.y) * rr, c.z + (P.getZ(q) - c.z) * rr); K.push(i / segs, j / radial); }
  }
  g.deleteAttribute('uv'); g.setAttribute('k', new THREE.Float32BufferAttribute(K, 2)); g.computeVertexNormals(); return g;
}
/** Tảng đá cắt giác: khối 20 (detail 0) / 80 mặt (detail 1) méo theo seed — dùng với flat: true. */
function rockGeo(seed, detail = 1, rough = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = 1 - rough + 2 * rough * hash(Math.round(x * 50) + seed * 131, Math.round(y * 50) + seed * 17, Math.round(z * 50) + 7); P.setXYZ(i, x * f, y * f, z * f); }
  g.deleteAttribute('uv'); g.computeVertexNormals(); return g;
}
/** Pha lê lăng trụ (sides mặt) hơi phình + chóp nhọn, gốc ở y = 0. */
const crystalGeo = (r, h, sides = 6) => new THREE.LatheGeometry([[0, 0], [r * 0.8, 0], [r, h * 0.62], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), sides);
/** Đặt hình học: xoay X → xoay Z → xoay Y (độ) rồi dời; trả về chính nó (để thêm bằng m.add). */
function place(g, { rx = 0, rz = 0, ry = 0, at = [0, 0, 0], sc = null } = {}) {
  if (sc) g.scale(...sc);
  g.rotateX(rx * Math.PI / 180); g.rotateZ(rz * Math.PI / 180); g.rotateY(ry * Math.PI / 180); g.translate(...at); return g;
}
const ring = (R, r, seg = 24) => new THREE.TorusGeometry(R, r, 6, seg).rotateX(Math.PI / 2); // vòng nằm ngang
const dome = (seg = 16, ring_ = 8, cut = 0.5) => new THREE.SphereGeometry(1, seg, ring_, 0, Math.PI * 2, 0, Math.PI * cut);

/** Gói gọn thuộc tính đỉnh trước khi xuất (glTF lõi, không extension): màu → u16 chuẩn hoá, khớp → u8, trọng số → u8 chuẩn hoá (tổng 255), bỏ uv. */
function pack(geo) {
  geo.deleteAttribute('uv');
  const c = geo.getAttribute('color'), cc = new Uint16Array(c.count * 3);
  for (let i = 0; i < cc.length; i++) cc[i] = Math.round(clamp(c.array[i]) * 65535);
  geo.setAttribute('color', new THREE.BufferAttribute(cc, 3, true));
  const si = geo.getAttribute('skinIndex'), sw = geo.getAttribute('skinWeight'), n = si.count, I = new Uint8Array(n * 4), Wt = new Uint8Array(n * 4);
  for (let v = 0; v < n; v++) {
    const w = [0, 1, 2, 3].map((k) => sw.array[v * 4 + k]), s = w.reduce((a, b) => a + b, 0) || 1;
    let tot = 0, best = 0;
    for (let k = 0; k < 4; k++) { const q = Math.round(w[k] / s * 255); Wt[v * 4 + k] = q; tot += q; if (w[k] > w[best]) best = k; I[v * 4 + k] = q > 0 ? si.array[v * 4 + k] : 0; }
    Wt[v * 4 + best] = Wt[v * 4 + best] + 255 - tot; I[v * 4 + best] = si.array[v * 4 + best]; // bù sai số làm tròn vào xương nặng nhất
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(I, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(Wt, 4, true));
}

// ———————————————————— THÚ BỐN CHÂN (sói, hổ) ————————————————————
/** S: tỉ lệ (alpha sói = 1). P: { fur(x,y,z, region) → hex, furMat?(x,y,z, region) → _mat, extra(m, s, S, {hp, hr}), eye, claw, fang } */
function quadruped(id, S, P) {
  const m = new Model(id); m.sdfCell = (P.cell || 0.013) * S; m.sdfTris = P.tris || 15000;
  const s = (v) => v.map((q) => q * S), hd = P.head || 1, lg = P.leg || 1, bd = P.body || 1, mz = P.muzzle || 1;
  const sb = (v) => s(v).map((q) => q * bd), HC = [0, 1.5, 1.08];
  const hp = (v) => [(HC[0] + v[0] * hd) * S, (HC[1] + v[1] * hd) * S, (HC[2] + v[2] * hd) * S]; // điểm trên đầu (tương đối tâm sọ, phóng theo cỡ đầu)
  const hr = (v) => v.map((q) => q * S * hd);
  // khung xương
  m.joint('Bone_Root', null, 0, 0, 0);
  m.joint('Bone_Hips', 'Bone_Root', ...s([0, 1.0, -0.62]));
  m.joint('Bone_Spine', 'Bone_Hips', ...s([0, 1.06, -0.05]));
  m.joint('Bone_Chest', 'Bone_Spine', ...s([0, 1.1, 0.48]));
  m.joint('Bone_Neck', 'Bone_Chest', ...s([0, 1.28, 0.78]));
  m.joint('Bone_Head', 'Bone_Neck', ...s([0, 1.46, 1.05]));
  m.joint('Bone_Jaw', 'Bone_Head', ...s([0, 1.38, 1.14]));
  m.joint('Bone_Tail1', 'Bone_Hips', ...s([0, 1.12, -0.98]));
  m.joint('Bone_Tail2', 'Bone_Tail1', ...s([0, 0.98, -1.42]));
  const F = { sh: [0.24, 1.08, 0.56], el: [0.27, 0.6, 0.6], pw: [0.27, 0.1, 0.68] };
  const B = { hp: [0.24, 1.0, -0.62], kn: [0.28, 0.6, -0.46], hk: [0.28, 0.36, -0.8], pw: [0.28, 0.1, -0.74] };
  m.jointLR('Bone_FUpperL', 'Bone_Chest', ...s(F.sh)); m.jointLR('Bone_FLowerL', 'Bone_FUpperL', ...s(F.el)); m.jointLR('Bone_FPawL', 'Bone_FLowerL', ...s(F.pw));
  m.jointLR('Bone_BUpperL', 'Bone_Hips', ...s(B.hp)); m.jointLR('Bone_BLowerL', 'Bone_BUpperL', ...s(B.kn)); m.jointLR('Bone_BHockL', 'Bone_BLowerL', ...s(B.hk)); m.jointLR('Bone_BPawL', 'Bone_BHockL', ...s(B.pw));
  const fur = (region) => (x, y, z) => P.fur(x / S, y / S, z / S, region);
  const furM = (region) => (P.furMat ? (x, y, z) => P.furMat(x / S, y / S, z / S, region) : FUR);
  const torsoW3 = (x, y, z) => { const t = (z / S + 0.7) / 1.3; return t < 0.5 ? segWeights('Bone_Hips', 'Bone_Spine', s([0, 1, -0.7]), s([0, 1, 0]), 0.3, 1, 0, 1)(x, y, z) : segWeights('Bone_Spine', 'Bone_Chest', s([0, 1, 0]), s([0, 1.1, 0.6]), 0, 0.7, 0, 1)(x, y, z); };
  const T = (o, r = 'body') => m.blob({ mat: furM(r), weights: torsoW3, color: fur(r), ...o });
  // thân: ngực sâu, eo thon, mông gọn
  T({ ell: [s([0, 1.1, 0.42]), sb([0.37, 0.44, 0.52])], k: 0.1 * S });
  T({ ell: [s([0, 1.05, -0.1]), sb([0.31, 0.33, 0.5]), [-4, 0, 0]], k: 0.16 * S });
  T({ ell: [s([0, 1.05, -0.6]), sb([0.31, 0.34, 0.36])], k: 0.14 * S });
  T({ ell: [s([0, 0.86, 0.36]), sb([0.24, 0.24, 0.36])], k: 0.12 * S }, 'belly');       // ức xuống bụng
  // bờm/cổ lông + chùm lông nhọn toả ra sau (bóng răng cưa nhìn từ trên cao)
  const mw = segWeights('Bone_Chest', 'Bone_Neck', s([0, 1.1, 0.5]), s([0, 1.3, 0.85]), 0.3, 0.9, 0, 1);
  m.blob({ ell: [s([0, 1.27, 0.7]), sb([0.4, 0.42, 0.34]), [20, 0, 0]], k: 0.12 * S, mat: furM('mane'), color: fur('mane'), weights: mw });
  m.blob({ cone: [s([0, 1.26, 0.8]), s([0, 1.44, 1.02]), 0.26 * S, 0.2 * S], k: 0.08 * S, mat: furM('mane'), color: fur('mane'), weights: segWeights('Bone_Neck', 'Bone_Head', s([0, 1.28, 0.78]), s([0, 1.46, 1.05]), 0.4, 1, 0, 1) });
  const nt = P.tufts ?? 7;
  for (let i = 0; i < nt; i++) {
    const a = -1.35 + i * (2.7 / (nt - 1)), b = [Math.sin(a) * 0.34 * bd, 1.3 + Math.cos(a) * 0.27 * bd, 0.66], t = [b[0] + Math.sin(a) * 0.13, b[1] + Math.cos(a) * 0.08 + 0.05, b[2] - 0.3 - (i % 2) * 0.07];
    m.blob({ cone: [s(b), s(t), 0.1 * S * bd, 0.02 * S], k: 0.05 * S, mat: furM('mane'), color: fur('mane'), weights: mw });
  }
  // đầu: sọ, má, gờ mày, mõm, sống mũi, hàm dưới, mũi, tai
  const HW = W1('Bone_Head');
  m.blob({ ell: [hp([0, 0, 0]), hr([0.23, 0.215, 0.24])], k: 0.06 * S, mat: furM('head'), color: fur('head'), weights: HW });
  m.blob({ ell: [hp([0.12, -0.07, 0.06]), hr([0.12, 0.12, 0.13])], k: 0.06 * S, mat: FUR, color: fur('cheek'), weights: HW, mirror: true });
  m.blob({ ell: [hp([0.088, 0.075, 0.15]), hr([0.075, 0.034, 0.07]), [-15, 0, -12]], k: 0.04 * S, mat: FUR, color: fur('brow'), weights: HW, mirror: true });
  m.blob({ cone: [hp([0, -0.04, 0.16]), hp([0, -0.08, 0.16 + 0.28 * mz]), 0.125 * S * hd, 0.07 * S * hd * (1.6 - mz * 0.6)], k: 0.05 * S, mat: FUR, color: fur('muzzle'), weights: HW });
  m.blob({ ell: [hp([0, 0.02, 0.24 + 0.05 * mz]), hr([0.06, 0.045, 0.14 * mz])], k: 0.045 * S, mat: FUR, color: fur('bridge'), weights: HW }); // sống mũi
  m.blob({ cone: [hp([0, -0.14, 0.12]), hp([0, -0.16, 0.12 + 0.24 * mz]), 0.09 * S * hd, 0.05 * S * hd], k: 0.035 * S, mat: FUR, color: fur('jaw'), weights: W1('Bone_Jaw') });
  m.blob({ ell: [hp([0, -0.045, 0.16 + 0.315 * mz]), hr([0.05, 0.038, 0.04])], k: 0.015 * S, mat: SKIN, color: '#151214', weights: HW });   // mũi
  m.blob({ cone: [hp([0.13, 0.15, -0.08]), hp([0.17, P.roundEar ? 0.25 : 0.38, -0.11]), (P.roundEar ? 0.085 : 0.078) * S * hd, (P.roundEar ? 0.06 : 0.012) * S * hd], k: 0.03 * S, mat: FUR, color: fur('ear'), weights: HW, mirror: true });
  for (const [b, t, r] of [[[0.17, -0.08, -0.02], [0.3, -0.17, -0.17], 0.06], [[0.15, -0.16, 0.0], [0.25, -0.28, -0.13], 0.05]]) // chòm lông má
    m.blob({ cone: [hp(b), hp(t), r * S * hd, 0.012 * S], k: 0.03 * S, mat: FUR, color: fur('cheek'), weights: HW, mirror: true });
  // mắt: viền sẫm + tròng phát sáng
  m.blob({ ell: [hp([0.098, 0.035, 0.195]), hr([0.047, 0.032, 0.03]), [0, -25, 0]], k: 0.006 * S, mat: SKIN, color: '#120e10', weights: HW, mirror: true });
  m.blob({ ell: [hp([0.1, 0.037, 0.203]), hr([0.034, 0.022, 0.022]), [0, -25, 0]], k: 0.004 * S, mat: GLOW, color: P.eye || '#ffb030', weights: HW, mirror: true });
  // răng nanh: hàm trên chìa xuống, hàm dưới chĩa lên
  const fg = P.fang || 1;
  for (const sd of [-1, 1]) {
    m.add(new THREE.ConeGeometry(0.016 * S * hd * fg, 0.075 * S * hd * fg, 6), { bone: 'Bone_Head', at: hp([sd * 0.062, -0.16 - 0.03 * (fg - 1), 0.12 + 0.24 * mz]), rot: [180, 0, 0], color: '#f6f0e0', mat: SKIN });
    m.add(new THREE.ConeGeometry(0.012 * S * hd, 0.05 * S * hd, 6), { bone: 'Bone_Jaw', at: hp([sd * 0.045, -0.095, 0.1 + 0.22 * mz]), color: '#f6f0e0', mat: SKIN });
  }
  // chân trước: vai to → cẳng thon → bàn chân
  const fu = segWeights('Bone_FUpperL', 'Bone_FLowerL', s(F.sh), s(F.el), 0.7, 1, 0, 1), fl = segWeights('Bone_FLowerL', 'Bone_FPawL', s(F.el), s(F.pw), 0.75, 1, 0, 1);
  m.blob({ ell: [s(lerp3(F.sh, F.el, 0.25)), s([0.17 * lg, 0.27, 0.2 * lg])], k: 0.07 * S, mat: FUR, color: fur('leg'), weights: segWeights('Bone_Chest', 'Bone_FUpperL', s([0.2, 1.1, 0.5]), s(F.el), 0.1, 0.5, 0, 1), mirror: true });
  m.blob({ cone: [s(F.sh), s(F.el), 0.15 * S * lg, 0.095 * S * lg], k: 0.04 * S, mat: FUR, color: fur('leg'), weights: fu, mirror: true });
  m.blob({ cone: [s(F.el), s(F.pw), 0.088 * S * lg, 0.068 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: fl, mirror: true });
  m.blob({ ell: [s([F.pw[0], 0.07, F.pw[2] + 0.06]), s([0.095 * lg, 0.07, 0.14 * lg])], k: 0.03 * S, mat: FUR, color: fur('paw'), weights: W1('Bone_FPawL'), mirror: true });
  // chân sau: đùi to, khuỷu ngược, cổ chân dài
  const bl = segWeights('Bone_BLowerL', 'Bone_BHockL', s(B.kn), s(B.hk), 0.7, 1, 0, 1), bh = segWeights('Bone_BHockL', 'Bone_BPawL', s(B.hk), s(B.pw), 0.7, 1, 0, 1);
  m.blob({ ell: [s(lerp3(B.hp, B.kn, 0.3)), s([0.19 * lg, 0.32, 0.26 * lg]), [15, 0, 0]], k: 0.08 * S, mat: FUR, color: fur('leg'), weights: segWeights('Bone_Hips', 'Bone_BUpperL', s([0.2, 1.0, -0.6]), s(B.kn), 0.1, 0.5, 0, 1), mirror: true });
  m.blob({ cone: [s(B.kn), s(B.hk), 0.11 * S * lg, 0.075 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: bl, mirror: true });
  m.blob({ cone: [s(B.hk), s(B.pw), 0.075 * S * lg, 0.062 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: bh, mirror: true });
  m.blob({ ell: [s([B.pw[0], 0.07, B.pw[2] + 0.06]), s([0.09 * lg, 0.065, 0.135 * lg])], k: 0.03 * S, mat: FUR, color: fur('paw'), weights: W1('Bone_BPawL'), mirror: true });
  // vuốt
  for (const [bone, pw] of [['Bone_FPawL', F.pw], ['Bone_BPawL', B.pw]]) for (const d of [-1.5, -0.5, 0.5, 1.5])
    m.add(new THREE.ConeGeometry(0.014 * S * lg, 0.065 * S * lg, 5), { bone, at: s([pw[0] + d * 0.034 * lg, 0.04, pw[2] + 0.06 + 0.13 * lg]), rot: [100, 0, 0], color: P.claw || '#2a2420', mat: SKIN, mirror: true });
  // đuôi rậm
  m.blob({ cone: [s([0, 1.1, -0.9]), s([0, 0.98, -1.4]), 0.1 * S, 0.15 * S], k: 0.06 * S, mat: furM('tail'), color: fur('tail'), weights: segWeights('Bone_Tail1', 'Bone_Tail2', s([0, 1.12, -0.98]), s([0, 0.98, -1.42]), 0.4, 1, 0, 1) });
  m.blob({ cone: [s([0, 0.98, -1.4]), s([0, 0.8, -1.82]), 0.15 * S, 0.04 * S], k: 0.05 * S, mat: furM('tailtip'), color: fur('tailtip'), weights: W1('Bone_Tail2') });
  P.extra?.(m, s, S, { hp, hr });
  return finish(m, id);
}

// —— Sói Đá: lông xám lam, lưng sẫm, bụng nhạt, giáp đá cắt giác phủ rêu trên vai/lưng, cụm pha lê ngọc phát sáng ——
function wolf() {
  const fur = (x, y, z, r) => {
    const n = fbm(x * 9, y * 9, z * 9), streak = fbm(x * 30, y * 6, z * 30, 2), back = clamp((y - 1.05) / 0.35);
    let c = mixC('#9aa2b0', '#343a48', back * 0.9 + (n - 0.5) * 0.4);
    if (r === 'belly' || (r === 'body' && y < 0.85)) c = mixC(c, '#d8d2c4', clamp((0.95 - y) / 0.3) * 0.8);
    if (r === 'lowleg') c = mixC(c, '#5c616c', 0.5);
    if (r === 'muzzle' || r === 'jaw' || r === 'cheek') c = mixC(c, '#e4decf', r === 'cheek' ? 0.55 : 0.75);
    if (r === 'brow') c = mixC(c, '#dcd8cc', 0.55);
    if (r === 'head') c = mixC(c, '#2c3140', clamp((y - 1.55) * 7) * 0.7);
    if (r === 'ear' || r === 'tailtip' || r === 'paw') c = mixC(c, '#202228', r === 'paw' ? 0.5 : 0.72);
    if (r === 'mane') c = mixC(c, '#464c5a', 0.4 + (n - 0.5) * 0.5);
    c.multiplyScalar(0.86 + streak * 0.28);
    return hex(c);
  };
  const extra = (m, s, S) => {
    // giáp đá cắt giác (rêu phủ mặt trên) trên vai/lưng/hông
    const stoneC = (x, y, z, ny) => { const n = fbm(x * 8 / S, y * 8 / S, z * 8 / S); let c = mixC('#4a4744', '#827c72', n); if (ny > 0.35) c = mixC(c, '#5c9a34', clamp((ny - 0.35) * 2.5) * clamp((n - 0.28) * 3)); return hex(c); };
    const rock = (bone, at, sc, rot, seed, mirror) => { const v0 = m.vcount; m.add(rockGeo(seed), { bone, at: s(at), rot, scale: sc.map((q) => q * S), mat: HARD, flat: true, mirror }); paint(m, v0, stoneC, 0.2); };
    rock('Bone_Chest', [0, 1.53, 0.32], [0.19, 0.085, 0.21], [-8, 0, 0], 1);
    rock('Bone_Chest', [0.23, 1.43, 0.47], [0.12, 0.07, 0.15], [0, 0, -28], 2, true);
    rock('Bone_Spine', [0, 1.37, -0.1], [0.16, 0.075, 0.19], [4, 0, 0], 3);
    rock('Bone_Hips', [0, 1.38, -0.52], [0.15, 0.07, 0.15], [6, 0, 0], 4);
    // pha lê ngọc: chóp sáng, gốc sẫm
    const cr = (bone, base, dir, r, h, mirror) => m.add(crystalGeo(r * S, h * S), { bone, at: s(base), rot: aim(dir), color: '#6ef2e0', color2: '#0c6a64', mat: GLOW, flat: true, mirror });
    cr('Bone_Chest', [0, 1.58, 0.3], [0, 1, -0.5], 0.065, 0.42); cr('Bone_Chest', [0.08, 1.57, 0.36], [0.65, 1, -0.15], 0.04, 0.25, true); cr('Bone_Chest', [0.05, 1.57, 0.2], [0.3, 1, -0.95], 0.035, 0.22, true);
    cr('Bone_Chest', [0.25, 1.48, 0.47], [0.9, 1, -0.2], 0.032, 0.17, true);
    cr('Bone_Spine', [0, 1.42, -0.1], [0, 1, -0.6], 0.052, 0.32); cr('Bone_Spine', [0.06, 1.41, -0.06], [0.65, 1, -0.3], 0.03, 0.17, true);
    cr('Bone_Hips', [0, 1.43, -0.52], [0, 1, -0.75], 0.042, 0.24); cr('Bone_Hips', [0.05, 1.42, -0.48], [0.6, 1, -0.5], 0.026, 0.14, true);
  };
  return { fur, extra, eye: '#ffb02a' };
}

// —— Hổ Lôi: hổ to, lông cam vằn đen, bụng trắng, vằn sét phát sáng dọc sống lưng, chữ Vương (王) sáng trên trán, bờm + gai sét ——
function tiger() {
  const stripe = (x, y, z, r) => {
    if (r === 'muzzle' || r === 'jaw' || r === 'paw' || r === 'brow' || r === 'bridge') return 0;
    const w = Math.sin(z * 15 + fbm(x * 3, y * 4, z * 3) * 6 + Math.abs(x) * 6) * (r === 'head' || r === 'cheek' ? Math.sin(y * 40 + x * 30) : 1);
    return clamp((w - 0.5) * 5);
  };
  const glowS = (x, y, z, r) => (r === 'body' || r === 'mane') && y > 1.27 && Math.abs(x) < 0.32 && stripe(x, y, z, r) > 0.55; // vằn sét trên sống lưng
  const fur = (x, y, z, r) => {
    const n = fbm(x * 7, y * 7, z * 7), streak = fbm(x * 28, y * 5, z * 28, 2);
    if (glowS(x, y, z, r)) return '#52d2ff';
    if (r === 'tailtip' && z < -1.62) return '#7ae2ff';
    let c = mixC('#f48c2a', '#b84a14', clamp((y - 1.0) / 0.45) * 0.6 + (n - 0.5) * 0.3);
    const belly = (r === 'body' || r === 'belly' ? clamp((0.98 - y) / 0.28) : r === 'paw' ? 0.55 : 0) + (r === 'belly' ? 0.5 : 0) + (r === 'jaw' ? 0.9 : r === 'muzzle' ? 0.6 : 0) + (r === 'cheek' ? 0.42 : r === 'brow' ? 0.3 : 0);
    c = mixC(c, '#f8f0e0', clamp(belly));
    const st = stripe(x, y, z, r);
    if (st > 0) c = mixC(c, '#160e0c', st * (belly > 0.7 ? 0.3 : 0.95));
    if (r === 'ear') c = mixC(c, '#20140e', 0.6);
    if (r === 'tail' || r === 'tailtip') { const tw = Math.sin(z * 22); if (tw > 0.4) c = mixC(c, '#140c08', 0.9); }
    c.multiplyScalar(0.88 + streak * 0.24);
    return hex(c);
  };
  const furMat = (x, y, z, r) => (glowS(x, y, z, r) || (r === 'tailtip' && z < -1.62) ? GLOW : FUR);
  const extra = (m, s, S, { hp }) => {
    // bờm sấm trắng lam dày quanh cổ + gai sét pha lê
    const mane = (x, y, z) => hex(mixC('#f4ecd8', '#86ccff', clamp((fbm(x * 8, y * 8, z * 8) - 0.4) * 2)).multiplyScalar(0.85 + fbm(x * 30, y * 30, z * 30, 2) * 0.3));
    m.blob({ ell: [s([0, 1.4, 0.82]), s([0.38, 0.35, 0.25]), [30, 0, 0]], k: 0.1 * S, mat: FUR, color: mane, weights: segWeights('Bone_Chest', 'Bone_Neck', s([0, 1.1, 0.5]), s([0, 1.3, 0.85]), 0.3, 0.9, 0, 1) });
    const bolt = (bone, base, dir, r, h, mirror) => m.add(crystalGeo(r * S, h * S, 4), { bone, at: s(base), rot: aim(dir), color: '#d8f6ff', color2: '#1e7ad8', mat: GLOW, flat: true, mirror });
    for (let i = 0; i < 4; i++) { const a = -0.25 - i * 0.32; bolt('Bone_Neck', [Math.sin(a) * 0.3, 1.55 + Math.cos(a) * 0.12, 0.72], [Math.sin(a) * 1.2, 0.8, -0.9], 0.05, 0.36 + (i % 2) * 0.12, true); }
    bolt('Bone_Neck', [0, 1.62, 0.7], [0, 1, -0.7], 0.06, 0.48);
    for (const [bone, z, h] of [['Bone_Chest', 0.2, 0.3], ['Bone_Spine', -0.12, 0.26], ['Bone_Hips', -0.45, 0.2]]) { bolt(bone, [0, 1.52 - (0.2 - z) * 0.2, z], [0, 1, -0.8], 0.045, h); bolt(bone, [0.08, 1.5 - (0.2 - z) * 0.2, z - 0.05], [0.7, 1, -0.6], 0.03, h * 0.6, true); }
    // chữ Vương (王) phát sáng trên trán: 3 vạch ngang + 1 vạch dọc bám mặt sọ
    const fp = (phi, x = 0) => { const a = phi * D2R, c = hp([0, 0, 0]), R = [0.3 * S, 0.28 * S, 0.31 * S], f = Math.sqrt(Math.max(0, 1 - (x / R[0]) ** 2)) + 0.03; return [x, c[1] + R[1] * Math.sin(a) * f, c[2] + R[2] * Math.cos(a) * f]; };
    const bar = (a, b, r) => m.blob({ cone: [a, b, r, r], k: 0.006 * S, mat: GLOW, color: '#8ae6ff', weights: W1('Bone_Head') });
    for (const [phi, w] of [[36, 0.085], [50, 0.075], [64, 0.085]]) { bar(fp(phi, -w * S), fp(phi, 0), 0.016 * S); bar(fp(phi, 0), fp(phi, w * S), 0.016 * S); }
    bar(fp(32), fp(50), 0.015 * S); bar(fp(50), fp(68), 0.015 * S);
    // ria trắng
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) m.cyl(0.003 * S, 0.004 * S, 0.24 * S, { bone: 'Bone_Head', at: s([sd * (0.17 + k * 0.01), 1.42 - k * 0.02, 1.38]), rot: [0, 0, sd * (80 + k * 8)], color: '#f8f4ea', seg: 4 });
    // vòng vàng gắn ngọc sấm ở cổ chân trước
    for (const t of [0.55]) { const p = lerp3([0.27, 0.6, 0.6], [0.27, 0.1, 0.68], t); m.add(ring(0.075 * S * 1.35, 0.016 * S), { bone: 'Bone_FLowerL', at: s(p), rot: [8, 0, 0], color: GOLD, mat: METAL, mirror: true }); m.sphere(0.022 * S, { bone: 'Bone_FLowerL', at: s([p[0], p[1], p[2] + 0.1]), color: '#7ae2ff', mat: GLOW, mirror: true }); }
  };
  return { fur, furMat, extra, eye: '#8aeeff', claw: '#f2ead8', fang: 1.6 };
}

// ———————————————————— CÓC RÊU ————————————————————
function toad() {
  const m = new Model('coc_reu'); m.sdfCell = 0.0145; m.sdfTris = 15000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 0.6, 0); m.joint('Bone_Head', 'Bone_Body', 0, 0.75, 0.5); m.joint('Bone_Jaw', 'Bone_Head', 0, 0.55, 0.62);
  m.jointLR('Bone_FUpperL', 'Bone_Body', 0.42, 0.5, 0.42); m.jointLR('Bone_FLowerL', 'Bone_FUpperL', 0.55, 0.22, 0.6);
  m.jointLR('Bone_BUpperL', 'Bone_Body', 0.45, 0.45, -0.35); m.jointLR('Bone_BLowerL', 'Bone_BUpperL', 0.78, 0.2, -0.1); m.jointLR('Bone_BFootL', 'Bone_BLowerL', 0.6, 0.05, 0.2);
  const skin = (x, y, z) => {
    const n = fbm(x * 5, y * 5, z * 5), sp = fbm(x * 9 + 3, y * 9, z * 9, 2), top = clamp((y - 0.55) / 0.5);
    let c = mixC('#a2b84c', '#4a6c24', top * 0.85 + (n - 0.5) * 0.5);
    if (sp > 0.6) c = mixC(c, '#22361a', clamp((sp - 0.6) * 7) * 0.85);                 // đốm sẫm
    else if (sp > 0.54) c = mixC(c, '#d2e07a', (sp - 0.54) * 6);                           // viền sáng quanh đốm
    if (y < 0.6 && Math.abs(x) < 0.56) c = mixC(c, '#ecdfae', clamp((0.64 - y) / 0.22) * 0.9 * clamp((0.56 - Math.abs(x)) * 5)); // bụng vàng kem
    if (z > 0.45 && Math.abs(y - 0.615) < 0.035) c = mixC(c, '#3a2614', 0.75);              // mép miệng
    return hex(c.multiplyScalar(0.86 + fbm(x * 30, y * 30, z * 30, 2) * 0.28));
  };
  const by = (x, z) => 0.68 + 0.55 * Math.sqrt(Math.max(0, 1 - (x / 0.72) ** 2 - ((z + 0.05) / 0.78) ** 2)); // mặt lưng
  const BW = (x, y, z) => (z > 0.35 ? [['Bone_Body', 0.4], ['Bone_Head', 0.6]] : [['Bone_Body', 1]]), HW = W1('Bone_Head');
  m.blob({ ell: [[0, 0.68, -0.05], [0.72, 0.55, 0.78]], k: 0.12, mat: SKIN, color: skin, weights: BW });
  m.blob({ ell: [[0, 0.72, 0.42], [0.62, 0.38, 0.5]], k: 0.16, mat: SKIN, color: skin, weights: HW });                       // đầu bẹt rộng
  m.blob({ ell: [[0, 0.52, 0.55], [0.55, 0.22, 0.45]], k: 0.12, mat: SKIN, color: skin, weights: W1('Bone_Jaw') });          // hàm dưới
  m.blob({ ell: [[0, 0.45, 0.6], [0.32, 0.12, 0.25]], k: 0.08, mat: SKIN, color: '#eadca6', weights: W1('Bone_Jaw') });       // túi cổ
  m.blob({ ell: [[0.38, 0.93, 0.16], [0.16, 0.1, 0.22], [0, 20, 0]], k: 0.07, mat: SKIN, color: skin, weights: W1('Bone_Body'), mirror: true }); // tuyến sau mắt
  m.blob({ ell: [[0.34, 1.0, 0.55], [0.17, 0.16, 0.16]], k: 0.08, mat: SKIN, color: skin, weights: HW, mirror: true });      // hốc mắt lồi
  m.blob({ ell: [[0, 0.615, 0.62], [0.6, 0.016, 0.42]], sub: true, k: 0.018, color: '#000', weights: HW });                   // khe miệng rộng
  m.blob({ ell: [[0.36, 1.04, 0.62], [0.11, 0.11, 0.1]], k: 0.01, mat: GLOW, color: '#ffc02a', weights: HW, mirror: true }); // mắt vàng
  m.blob({ ell: [[0.35, 1.11, 0.57], [0.15, 0.05, 0.13], [-14, 0, 0]], k: 0.025, mat: SKIN, color: skin, weights: HW, mirror: true }); // mí trên cau có
  m.box(0.1, 0.026, 0.02, { bone: 'Bone_Head', at: [0.37, 1.04, 0.716], rot: [0, 18, 0], color: '#120c04', mat: SKIN, mirror: true }); // con ngươi ngang
  m.blob({ ell: [[0.08, 0.86, 0.9], [0.022, 0.014, 0.02]], sub: true, k: 0.01, color: '#000', weights: HW, mirror: true });   // lỗ mũi
  // nốt sần (chóp sáng)
  for (let i = 0; i < 46; i++) {
    const a = hash(i, 1, 2) * Math.PI * 2, b = hash(i, 3, 4) * 1.25 - 0.15, r = 0.03 + hash(i, 5, 6) * 0.045;
    const x = Math.cos(a) * 0.66 * Math.cos(b), y = 0.68 + Math.sin(b) * 0.52, z = -0.05 + Math.sin(a) * 0.72 * Math.cos(b); if (y < 0.72) continue;
    m.blob({ ell: [[x, y, z], [r, r * 0.75, r]], k: 0.03, mat: SKIN, color: (X, Y, Z) => hex(mixC(skin(X, Y, Z), '#dbe58a', clamp((Y - y) / r + 0.3) * 0.55)), weights: W1('Bone_Body') });
  }
  // chân trước + ngón có đệm
  m.blob({ cone: [[0.42, 0.55, 0.38], [0.55, 0.22, 0.6], 0.13, 0.08], k: 0.06, mat: SKIN, color: skin, weights: segWeights('Bone_FUpperL', 'Bone_FLowerL', [0.42, 0.55, 0.38], [0.55, 0.22, 0.6], 0.6, 1, 0, 1), mirror: true });
  m.blob({ cone: [[0.55, 0.22, 0.6], [0.6, 0.05, 0.75], 0.08, 0.06], k: 0.04, mat: SKIN, color: skin, weights: W1('Bone_FLowerL'), mirror: true });
  for (const d of [-0.5, 0, 0.5]) { const tip = [0.6 + d * 0.13, 0.035, 0.92]; m.blob({ cone: [[0.6, 0.05, 0.75], tip, 0.04, 0.028], k: 0.02, mat: SKIN, color: skin, weights: W1('Bone_FLowerL'), mirror: true }); m.blob({ ell: [tip, [0.034, 0.024, 0.034]], k: 0.01, mat: SKIN, color: '#d6dc84', weights: W1('Bone_FLowerL'), mirror: true }); }
  m.blob({ ell: [[0.6, 0.45, -0.25], [0.27, 0.33, 0.43], [0, 0, -20]], k: 0.12, mat: SKIN, color: skin, weights: W1('Bone_BUpperL'), mirror: true });   // đùi sau to
  m.blob({ cone: [[0.78, 0.2, -0.1], [0.62, 0.05, 0.2], 0.1, 0.07], k: 0.05, mat: SKIN, color: skin, weights: W1('Bone_BLowerL'), mirror: true });
  for (const d of [-0.6, 0, 0.6]) { const tip = [0.62 + d * 0.17, 0.035, 0.44]; m.blob({ cone: [[0.62, 0.05, 0.2], tip, 0.05, 0.03], k: 0.03, mat: SKIN, color: skin, weights: W1('Bone_BFootL'), mirror: true }); m.blob({ ell: [tip, [0.036, 0.024, 0.036]], k: 0.01, mat: SKIN, color: '#d6dc84', weights: W1('Bone_BFootL'), mirror: true }); }
  // thảm rêu trên lưng (lông = rêu xù) + dương xỉ + nấm phát sáng
  const moss = (x, y, z) => hex(mixC('#3a7420', '#8cc23c', fbm(x * 9, y * 9, z * 9)).multiplyScalar(0.82 + fbm(x * 40, y * 40, z * 40, 2) * 0.32));
  for (const [x, z, rx, rz] of [[0.12, -0.2, 0.3, 0.32], [-0.27, 0.02, 0.22, 0.24], [0.33, -0.44, 0.17, 0.2], [-0.14, -0.52, 0.24, 0.2], [0.02, 0.16, 0.18, 0.15]])
    m.blob({ ell: [[x, by(x, z) - 0.025, z], [rx, 0.065, rz]], k: 0.04, mat: FUR, color: moss, weights: W1('Bone_Body') });
  for (const [x, z, dx, dz, len] of [[0.25, -0.3, 0.6, -0.2, 0.34], [-0.3, -0.08, -0.7, 0.1, 0.3], [-0.05, -0.62, -0.1, -0.8, 0.32], [0.38, -0.5, 0.8, -0.5, 0.26], [-0.2, -0.4, -0.5, -0.5, 0.28], [0.12, 0.08, 0.3, 0.4, 0.22]])
    addK(m, leafGeo(0.11, len, { bend: 0.35, nv: 5 }), { bone: 'Bone_Body', at: [x, by(x, z) - 0.02, z], rot: aim([dx, 1, dz]) }, (u, v) => [hex(mixC('#2a6216', '#a6d84a', v)), SKIN]);
  const shroom = (x, z, h, r, c) => {
    const y0 = by(x, z) - 0.03;
    m.cyl(r * 0.22, r * 0.3, h, { bone: 'Bone_Body', at: [x, y0 + h / 2, z], color: '#f0e6cc', mat: SKIN, seg: 7 });
    const v0 = m.vcount; m.add(dome(12, 6), { bone: 'Bone_Body', at: [x, y0 + h - r * 0.12, z], scale: [r, r * 0.62, r], mat: GLOW });
    paint(m, v0, (X, Y, Z) => (fbm(X * 45, Y * 45, Z * 45, 2) > 0.6 ? ['#fff4dc', SKIN] : [c, GLOW]), 0.1);
    m.add(new THREE.CircleGeometry(r * 0.96, 12).rotateX(Math.PI / 2), { bone: 'Bone_Body', at: [x, y0 + h - r * 0.12, z], color: '#f2d8b0', mat: SKIN }); // phiến dưới mũ nấm
  };
  shroom(0.15, -0.2, 0.24, 0.13, '#ff6a3a'); shroom(-0.2, 0.05, 0.17, 0.095, '#ffaa3a'); shroom(0.05, 0.25, 0.12, 0.07, '#ff4a3a'); shroom(-0.13, -0.44, 0.15, 0.085, '#6ae89a'); shroom(0.36, -0.06, 0.1, 0.06, '#ff8a3a');
  for (const [x, z, h] of [[-0.02, -0.08, 0.2], [0.28, -0.5, 0.14], [-0.32, -0.3, 0.16]]) { const y0 = by(x, z) - 0.02; m.cyl(0.006, 0.009, h, { bone: 'Bone_Body', at: [x, y0 + h / 2, z], color: '#cfe8a0', mat: SKIN, seg: 4 }); m.sphere(0.024, { bone: 'Bone_Body', at: [x, y0 + h, z], color: '#b4ff6a', mat: GLOW }); } // bào tử phát sáng
  return finish(m, 'coc_reu');
}

// ———————————————————— HOẢ NHAM (người đá nham thạch) ————————————————————
function golem() {
  const m = new Model('hoa_nham'); m.sdfCell = 0.025; m.sdfTris = 13000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Hips', 'Bone_Root', 0, 1.1, 0); m.joint('Bone_Chest', 'Bone_Hips', 0, 1.9, 0.05); m.joint('Bone_Head', 'Bone_Chest', 0, 2.75, 0.35);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 0.95, 2.45, 0.05); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 1.25, 1.55, 0.25); m.jointLR('Bone_HandL', 'Bone_ArmLL', 1.3, 0.75, 0.45);
  m.jointLR('Bone_LegUL', 'Bone_Hips', 0.42, 1.1, 0); m.jointLR('Bone_LegLL', 'Bone_LegUL', 0.5, 0.55, 0.08); m.jointLR('Bone_FootL', 'Bone_LegLL', 0.52, 0.08, 0.15);
  // thân: dung nham rực (phát sáng) phủ vảy vỏ nguội sẫm; bên ngoài ốp các tảng đá bazan cắt giác → khe giữa các tảng rực lửa
  const magN = (x, y, z) => fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 3), vein = (x, y, z) => Math.abs(fbm(x * 4.5, y * 4.5 + 3, z * 4.5, 3) - 0.44);
  const isMag = (x, y, z) => magN(x, y, z) < 0.37 || vein(x, y, z) < 0.013;
  const magC = (x, y, z) => {
    const n = magN(x, y, z), v = fbm(x * 8, y * 8, z * 8, 2), vv = vein(x, y, z);
    if (isMag(x, y, z)) return hex(mixC('#d42c06', '#ffa82a', clamp((0.37 - n) * 8) * 0.7 + v * 0.3));
    return hex(mixC(mixC('#241a16', '#46342a', v), '#6a2410', clamp(1 - (vv - 0.013) / 0.03) * 0.7 + clamp(1 - (n - 0.37) / 0.04) * 0.5)); // đá nguội, ửng đỏ sát khe nứt
  };
  const R = (o) => m.blob({ mat: (x, y, z) => (isMag(x, y, z) ? GLOW : HARD), color: magC, ...o });
  R({ ell: [[0, 2.05, 0.05], [0.95, 0.75, 0.68]], k: 0.18, weights: W1('Bone_Chest') });                                          // ngực vai đồ sộ
  R({ ell: [[0, 1.35, 0], [0.62, 0.5, 0.5]], k: 0.2, weights: segWeights('Bone_Hips', 'Bone_Chest', [0, 1.1, 0], [0, 1.9, 0], 0.3, 0.9, 0, 1) });
  R({ ell: [[0, 2.72, 0.42], [0.3, 0.28, 0.3]], k: 0.12, weights: W1('Bone_Head') });                                                // đầu nhỏ thụt giữa vai
  R({ ell: [[0.95, 2.5, 0.05], [0.42, 0.4, 0.42]], k: 0.12, weights: W1('Bone_ArmUL'), mirror: true });                           // vai
  R({ cone: [[0.95, 2.45, 0.05], [1.25, 1.55, 0.25], 0.32, 0.26], k: 0.1, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', [0.95, 2.45, 0.05], [1.25, 1.55, 0.25], 0.75, 1, 0, 1), mirror: true });
  R({ cone: [[1.25, 1.55, 0.25], [1.3, 0.85, 0.45], 0.3, 0.36], k: 0.1, weights: W1('Bone_ArmLL'), mirror: true });
  R({ ell: [[1.3, 0.7, 0.5], [0.38, 0.34, 0.38]], k: 0.08, weights: W1('Bone_HandL'), mirror: true });                               // nắm đấm
  R({ cone: [[0.42, 1.1, 0], [0.5, 0.55, 0.08], 0.32, 0.26], k: 0.1, weights: segWeights('Bone_LegUL', 'Bone_LegLL', [0.42, 1.1, 0], [0.5, 0.55, 0.08], 0.7, 1, 0, 1), mirror: true });
  R({ cone: [[0.5, 0.55, 0.08], [0.52, 0.12, 0.12], 0.26, 0.3], k: 0.08, weights: W1('Bone_LegLL'), mirror: true });
  R({ ell: [[0.52, 0.1, 0.22], [0.3, 0.12, 0.38]], k: 0.06, weights: W1('Bone_FootL'), mirror: true });
  m.blob({ ell: [[0, 2.0, 0.66], [0.21, 0.21, 0.1]], k: 0.04, mat: GLOW, color: '#ffe6a0', weights: W1('Bone_Chest') });            // lõi dung nham trên ngực
  // tảng bazan: mặt dưới hắt ánh lửa đỏ
  const basalt = (x, y, z, ny) => { const n = fbm(x * 5, y * 5, z * 5); let c = mixC('#221b18', '#4c4038', n); if (ny < -0.15) c = mixC(c, '#8a2c0c', clamp(-ny - 0.15) * 0.8); else if (ny > 0.5) c = mixC(c, '#5e524a', (ny - 0.5) * 0.7); return hex(c); };
  const plate = (bone, at, sc, rot, seed, det = 1, mirror = true) => { const v0 = m.vcount; m.add(rockGeo(seed, det, 0.18), { bone, at, rot, scale: sc, mat: HARD, flat: true, mirror }); paint(m, v0, basalt, 0.12); };
  plate('Bone_Chest', [0.45, 2.32, 0.52], [0.34, 0.28, 0.2], [8, 18, 6], 11);           // ngực
  plate('Bone_Chest', [0, 1.62, 0.52], [0.3, 0.22, 0.16], [12, 0, 0], 12, 1, false);    // bụng
  plate('Bone_Chest', [0, 2.35, -0.52], [0.58, 0.42, 0.24], [-14, 0, 0], 13, 1, false); // lưng
  plate('Bone_Chest', [0.5, 1.95, -0.45], [0.3, 0.34, 0.2], [-10, -20, 0], 14);
  plate('Bone_ArmUL', [1.0, 2.68, 0.04], [0.5, 0.4, 0.48], [0, 0, -18], 15);            // tảng vai
  plate('Bone_ArmUL', [1.27, 2.0, 0.12], [0.2, 0.32, 0.26], [0, 0, 12], 16, 0);
  plate('Bone_ArmLL', [1.48, 1.2, 0.34], [0.22, 0.38, 0.3], [0, 0, 6], 17);
  plate('Bone_ArmLL', [1.26, 1.18, 0.62], [0.22, 0.3, 0.14], [-10, 0, 0], 18, 0);
  plate('Bone_HandL', [1.3, 0.62, 0.8], [0.32, 0.2, 0.2], [0, 0, 0], 19);               // khớp đấm
  plate('Bone_HandL', [1.6, 0.75, 0.5], [0.16, 0.26, 0.26], [0, 0, 0], 20, 0);
  plate('Bone_LegUL', [0.52, 0.86, 0.26], [0.3, 0.3, 0.2], [0, 0, 0], 21);
  plate('Bone_LegLL', [0.53, 0.36, 0.3], [0.27, 0.28, 0.18], [0, 0, 0], 22, 0);
  plate('Bone_FootL', [0.53, 0.13, 0.42], [0.3, 0.13, 0.3], [0, 0, 0], 23, 0);
  plate('Bone_Head', [0, 2.88, 0.6], [0.33, 0.12, 0.2], [18, 0, 0], 24, 1, false);      // mày đá
  plate('Bone_Head', [0, 2.5, 0.62], [0.26, 0.1, 0.18], [-8, 0, 0], 25, 0, false);      // cằm
  // sừng hắc thạch chĩa trước, chóp nung đỏ
  addK(m, tubeGeo([[0.2, 2.86, 0.5], [0.38, 3.0, 0.56], [0.5, 3.2, 0.7], [0.48, 3.38, 0.86]], (t) => 0.1 * (1 - t) ** 0.9 + 0.004, { radial: 7, segs: 9 }), { bone: 'Bone_Head', mirror: true },
    (t, a, x, y, z) => (t > 0.84 ? ['#ff9a2a', GLOW] : [hex(mixC('#1c1418', '#3c2c32', fbm(x * 9, y * 9, z * 9))), SKIN]));
  m.sphere(1, { bone: 'Bone_Head', at: [0.12, 2.77, 0.7], radii: [0.075, 0.032, 0.03], rot: [0, 0, 12], color: '#fff2a0', mat: GLOW, mirror: true }); // mắt lửa dưới mày
  m.box(0.22, 0.035, 0.04, { bone: 'Bone_Head', at: [0, 2.64, 0.71], color: '#ffb028', mat: GLOW });                                                  // miệng lửa
  // bờm lửa trên lưng/vai (ngọn lửa 2 mặt: gốc vàng → chóp đỏ)
  const flame = (bone, at, dir, w, len, mirror) => { for (const up of [[0, 0, 1], [1, 0, 0]]) addK(m, leafGeo(w, len, { bend: 0.16, ridge: 0.15, nv: 7, prof: (v) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.14 + v * 0.9)), 0.8) }), { bone, at, rot: frame(dir, up), mirror },
    (u, v) => [hex(mixC('#ff9e24', '#c41c06', Math.pow(v, 0.7))), GLOW]); }; // 2 tấm chéo nhau → có khối nhìn từ mọi phía
  flame('Bone_Chest', [0, 2.72, -0.36], [0, 1, -0.4], 0.42, 1.25);
  flame('Bone_Chest', [0.32, 2.64, -0.32], [0.35, 1, -0.45], 0.34, 0.98, true);
  flame('Bone_Chest', [0.6, 2.5, -0.22], [0.6, 1, -0.45], 0.27, 0.72, true);
  flame('Bone_Chest', [0.18, 2.42, -0.62], [0.25, 0.8, -0.8], 0.28, 0.8, true);
  flame('Bone_ArmUL', [1.05, 3.02, -0.05], [0.3, 1, -0.2], 0.24, 0.62, true);
  return finish(m, 'hoa_nham');
}

// ———————————————————— LINH THUỶ (tinh linh nước, mặt nạ ngọc bích viền vàng) ————————————————————
function spirit() {
  const m = new Model('linh_thuy'); m.sdfCell = 0.02; m.sdfTris = 12000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 1.0, 0); m.joint('Bone_Chest', 'Bone_Body', 0, 1.7, 0); m.joint('Bone_Head', 'Bone_Chest', 0, 2.3, 0.1);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 0.5, 1.95, 0); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 0.9, 1.5, 0.2); m.jointLR('Bone_HandL', 'Bone_ArmLL', 1.0, 1.1, 0.4);
  m.joint('Bone_Tail1', 'Bone_Body', 0, 0.68, -0.06); m.joint('Bone_Tail2', 'Bone_Tail1', 0, 0.36, -0.24);           // đuôi xoáy nước
  const water = (x, y, z) => { const n = fbm(x * 3, y * 3, z * 3), f = fbm(x * 9, y * 2.5, z * 9, 2); let c = mixC('#0a3a80', '#34b4f0', n * 0.75 + clamp((y - 0.4) / 1.9) * 0.45); if (f > 0.6) c = mixC(c, '#e0faff', (f - 0.6) * 2.6); return hex(c); };
  const jade = (x, y, z) => hex(mixC('#2a9474', '#86e6c2', fbm(x * 9, y * 9, z * 9)).multiplyScalar(0.85 + fbm(x * 40, y * 40, z * 40, 2) * 0.25));
  const bodyW = (x, y) => { const b = (a, c, t) => [[a, 1 - sm(t)], [c, sm(t)]]; return y < 0.4 ? [['Bone_Tail2', 1]] : y < 0.75 ? b('Bone_Tail2', 'Bone_Tail1', (y - 0.4) / 0.35) : y < 1.05 ? b('Bone_Tail1', 'Bone_Body', (y - 0.75) / 0.3) : y < 1.45 ? [['Bone_Body', 1]] : y < 1.8 ? b('Bone_Body', 'Bone_Chest', (y - 1.45) / 0.35) : [['Bone_Chest', 1]]; };
  const SECS = [{ y: 0.05, rx: 0.025, rz: 0.025, cz: -0.52 }, { y: 0.2, rx: 0.09, rz: 0.08, cz: -0.4 }, { y: 0.45, rx: 0.19, rz: 0.17, cz: -0.22 }, { y: 0.8, rx: 0.31, rz: 0.27, cz: -0.07 }, { y: 1.15, rx: 0.36, rz: 0.3 }, { y: 1.55, rx: 0.5, rz: 0.38 }, { y: 1.9, rx: 0.56, rz: 0.4 }, { y: 2.08, rx: 0.3, rz: 0.26 }];
  const secAt = (y) => { let i = 0; while (i < SECS.length - 2 && SECS[i + 1].y < y) i++; const a = SECS[i], b = SECS[i + 1], t = sm((y - a.y) / (b.y - a.y)); return [a.rx + (b.rx - a.rx) * t, a.rz + (b.rz - a.rz) * t, (a.cz || 0) + ((b.cz || 0) - (a.cz || 0)) * t]; };
  const V = (o) => m.blob({ mat: SKIN, color: water, weights: bodyW, ...o });
  V({ loft: SECS, k: 0.1 });
  V({ ell: [[0, 1.74, 0.12], [0.46, 0.3, 0.32]], k: 0.12 });                                           // ngực
  V({ ell: [[0, 2.34, 0.06], [0.27, 0.3, 0.27]], k: 0.12, weights: W1('Bone_Head') });
  const A = { sh: [0.5, 1.95, 0], el: [0.9, 1.5, 0.2], ha: [1.0, 1.1, 0.4] };
  V({ ell: [[0.48, 1.96, 0], [0.2, 0.2, 0.2]], k: 0.1, weights: segWeights('Bone_Chest', 'Bone_ArmUL', [0.3, 1.95, 0], [0.6, 1.9, 0], 0.2, 0.8, 0, 1), mirror: true });
  V({ cone: [A.sh, A.el, 0.16, 0.12], k: 0.08, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', A.sh, A.el, 0.7, 1, 0, 1), mirror: true });
  V({ cone: [A.el, A.ha, 0.12, 0.17], k: 0.07, weights: W1('Bone_ArmLL'), mirror: true });
  V({ ell: [[1.02, 1.0, 0.45], [0.15, 0.17, 0.15]], k: 0.06, weights: W1('Bone_HandL'), mirror: true });
  for (const d of [-1, 0, 1]) V({ cone: [[1.02 + d * 0.07, 0.95, 0.5], [1.04 + d * 0.11, 0.72, 0.6 - Math.abs(d) * 0.04], 0.05, 0.015], k: 0.03, weights: W1('Bone_HandL'), mirror: true }); // ngón nước
  // mặt nạ ngọc bích cong ôm mặt, viền vàng; mắt xếch phát sáng; ngọc trán; sừng ngọc chóp vàng
  { const g = new THREE.SphereGeometry(1, 16, 12, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.85, 1.75); g.setAttribute('k', g.getAttribute('uv').clone()); g.deleteAttribute('uv');
    addK(m, g, { bone: 'Bone_Head', at: [0, 2.34, 0.05], scale: [0.285, 0.32, 0.32] }, (u, v, x, y, z) => (u < 0.07 || u > 0.93 || v < 0.07 || v > 0.93 ? [GOLD, METAL] : [jade(x, y, z), HARD])); }
  m.sphere(1, { bone: 'Bone_Head', at: [0.1, 2.4, 0.345], radii: [0.066, 0.024, 0.02], rot: [0, 20, 15], color: '#a8f8ff', mat: GLOW, mirror: true });
  m.sphere(0.045, { bone: 'Bone_Head', at: [0, 2.55, 0.3], color: '#c8fcff', mat: GLOW });
  m.add(new THREE.TorusGeometry(0.052, 0.013, 6, 14), { bone: 'Bone_Head', at: [0, 2.55, 0.305], rot: [-40, 0, 0], color: GOLD, mat: METAL });
  addK(m, tubeGeo([[0.2, 2.52, 0.2], [0.3, 2.7, 0.14], [0.36, 2.92, 0.0], [0.32, 3.08, -0.16]], (t) => 0.055 * (1 - t) + 0.006, { radial: 7, segs: 9 }), { bone: 'Bone_Head', mirror: true },
    (t, a, x, y, z) => (t > 0.78 ? [GOLD, METAL] : [jade(x, y, z), HARD]));
  // tóc nước chải ngược ra sau
  for (const [x, y, z, len, sp] of [[0, 2.6, -0.05, 1.0, 0], [0.12, 2.55, -0.08, 0.9, 0.25], [-0.12, 2.55, -0.08, 0.9, -0.25], [0.2, 2.44, -0.12, 0.75, 0.4], [-0.2, 2.44, -0.12, 0.75, -0.4]]) {
    const pts = [[x, y, z], [x + sp * 0.2, y + 0.2, z - 0.3 * len], [x + sp * 0.45, y + 0.14, z - 0.65 * len], [x + sp * 0.6, y - 0.12, z - 0.95 * len]];
    addK(m, tubeGeo(pts, (t) => 0.1 * Math.pow(1 - t, 0.8) + 0.008, { radial: 7, segs: 10 }), { bone: 'Bone_Head' }, (t, a, X, Y, Z) => [hex(mixC('#1458a8', '#d4f6ff', t * 0.9 + fbm(X * 6, Y * 6, Z * 6) * 0.2)), SKIN]);
  }
  // vai ngọc, vòng tay ngọc viền vàng, vây nước ở cẳng tay
  { const v0 = m.vcount; m.add(dome(16, 7), { bone: 'Bone_ArmUL', at: [0.52, 2.04, 0], rot: [0, 0, -30], scale: [0.24, 0.13, 0.24], mat: HARD, mirror: true }); paint(m, v0, jade); }
  m.add(ring(0.235, 0.022, 24), { bone: 'Bone_ArmUL', at: [0.52, 2.04, 0], rot: [0, 0, -30], color: GOLD, mat: METAL, mirror: true });
  const fa = [0.96, 1.26, 0.32], fd = [0.1, -0.4, 0.2], fn = Math.hypot(...fd);
  { const v0 = m.vcount; m.add(new THREE.CylinderGeometry(0.175, 0.19, 0.2, 14, 1, true), { bone: 'Bone_ArmLL', at: fa, rot: aim(fd), mat: HARD, mirror: true }); paint(m, v0, jade); }
  for (const dt of [-0.1, 0.1]) m.add(ring(0.183 - dt * 0.07, 0.018, 18), { bone: 'Bone_ArmLL', at: fa.map((q, i) => q + fd[i] / fn * dt), rot: aim(fd), color: GOLD, mat: METAL, mirror: true });
  m.add(ring(0.186, 0.009, 18), { bone: 'Bone_ArmLL', at: fa, rot: aim(fd), color: '#9af4ff', mat: GLOW, mirror: true });
  addK(m, leafGeo(0.2, 0.55, { bend: -0.25, nv: 6 }), { bone: 'Bone_ArmLL', at: [1.02, 1.42, 0.16], rot: frame([0.35, 0.7, -0.6], [1, 0, 0.3]), mirror: true }, (u, v) => [hex(mixC('#1a64b4', '#dcf8ff', v)), SKIN]);
  // lõi sáng ở ngực trong vòng vàng hình mặt trời
  m.sphere(0.12, { bone: 'Bone_Chest', at: [0, 1.74, 0.4], color: '#d8ffff', mat: GLOW });
  m.add(new THREE.TorusGeometry(0.16, 0.028, 8, 24), { bone: 'Bone_Chest', at: [0, 1.74, 0.43], color: GOLD, mat: METAL });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m.add(new THREE.ConeGeometry(0.03, 0.12, 4), { bone: 'Bone_Chest', at: [Math.sin(a) * 0.23, 1.74 + Math.cos(a) * 0.23, 0.42], rot: [0, 0, -a / D2R], color: GOLD, mat: METAL, flat: true }); }
  // đai ngọc ở eo có đinh sáng
  { const v0 = m.vcount; m.loft([{ y: 1.1, rx: 0.375, rz: 0.315 }, { y: 1.2, rx: 0.385, rz: 0.322 }], { bone: 'Bone_Body', mat: HARD, seg: 26 }); paint(m, v0, jade); }
  for (const y of [1.1, 1.2]) m.add(place(ring(1, 0.014, 32), { sc: [0.38, 1, 0.318], at: [0, y, 0] }), { bone: 'Bone_Body', color: GOLD, mat: METAL });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; m.sphere(0.022, { bone: 'Bone_Body', at: [Math.sin(a) * 0.39, 1.15, Math.cos(a) * 0.325], color: '#aaf8ff', mat: GLOW }); }
  // hai dải nước xoắn quanh đuôi (phát sáng nhẹ)
  for (const ph of [0, Math.PI]) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, y = 0.14 + t * 1.0, a = ph + t * Math.PI * 3.2, [rx, rz, cz] = secAt(y); pts.push([Math.sin(a) * (rx + 0.03), y, cz + Math.cos(a) * (rz + 0.03)]); }
    addK(m, tubeGeo(pts, (t) => 0.035 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.004, { radial: 6, segs: 40 }), { bone: 'Bone_Body', weights: (p) => bodyW(p.x, p.y, p.z) }, () => ['#5ccff5', GLOW]);
  }
  return finish(m, 'linh_thuy');
}

// ———————————————————— LONG NGƯ (cá chép vàng hoá rồng) ————————————————————
function carp() {
  const m = new Model('long_ngu'); m.sdfCell = 0.03; m.sdfTris = 14000;
  // xương sống: 7 đốt từ đầu (z+) ra đuôi (z−), thân dựng cong do game uốn
  const N = 7, L = 5.2, zs = (i) => 1.9 - (i / (N - 1)) * L;
  m.joint('Bone_Root', null, 0, 0, 0);
  for (let i = 0; i < N; i++) m.joint(`Bone_S${i}`, i ? `Bone_S${i - 1}` : 'Bone_Root', 0, 1.5, zs(i));
  m.joint('Bone_Jaw', 'Bone_S0', 0, 1.3, 2.3);
  const rAt = (t) => 1.05 * 0.62 * Math.sin(Math.PI * (0.18 + 0.82 * (1 - t)) * 0.62 + 0.3) * (1 - t * 0.55);
  const segW = (i) => segWeights(`Bone_S${i}`, `Bone_S${i + 1}`, [0, 1.5, zs(i)], [0, 1.5, zs(i + 1)], 0.5, 1, 0, 1);
  // vảy: màu vàng kim lưng cam, bụng trắng ngà, đuôi đỏ; hàng vảy do shader vẽ (_mat 3)
  const scaleC = (x, y, z) => {
    const t = (1.9 - z) / L, n = fbm(x * 3, y * 3, z * 3);
    let c = mixC('#ffbe2a', '#c85a0c', clamp((y - 1.35) / 0.6) * 0.85 + (n - 0.5) * 0.3);
    if (y < 1.25) c = mixC(c, '#ffd88a', clamp((1.28 - y) / 0.3) * 0.6);
    if (t > 0.72) c = mixC(c, '#ea4a26', clamp((t - 0.72) * 4));
    return hex(c);
  };
  for (let i = 0; i < N - 1; i++) {
    const a = [0, 1.5, zs(i)], b = [0, 1.5, zs(i + 1)], r0 = rAt(i / (N - 1)), r1 = rAt((i + 1) / (N - 1));
    m.blob({ cone: [a, b, r0, r1], k: 0.25, mat: SCALE, color: scaleC, weights: segW(i) });
    m.blob({ ell: [lerp3(a, b, 0.5), [(r0 + r1) * 0.24, (r0 + r1) * 0.6, (zs(i) - zs(i + 1)) * 0.62]], k: 0.2, mat: SCALE, color: scaleC, weights: segW(i) }); // sống lưng/bụng cao → mặt cắt bầu dục
  }
  // đầu: trán gồ, mõm tròn, môi dày, mang, mắt to, ngọc trán, sừng hươu, bờm vây đỏ, râu rồng
  const headC = (x, y, z) => { let c = mixC('#ffc83a', '#d06a12', clamp((y - 1.4) / 0.6)); if (y < 1.32) c = mixC(c, '#ffd88a', clamp((1.36 - y) / 0.3) * 0.7); return hex(c.multiplyScalar(0.88 + fbm(x * 9, y * 9, z * 9) * 0.24)); };
  const H = (o) => m.blob({ mat: SKIN, color: headC, weights: W1('Bone_S0'), ...o });
  H({ ell: [[0, 1.55, 2.0], [0.58, 0.62, 0.64]], k: 0.22 });
  H({ ell: [[0, 1.86, 2.08], [0.42, 0.3, 0.42]], k: 0.15 });
  H({ ell: [[0, 1.46, 2.48], [0.36, 0.3, 0.26]], k: 0.12 });
  H({ ell: [[0.44, 1.48, 1.68], [0.14, 0.44, 0.3], [0, 18, 0]], k: 0.08, mirror: true });
  m.blob({ ell: [[0, 1.36, 2.68], [0.26, 0.09, 0.11]], k: 0.05, mat: SKIN, color: '#ff9a5a', weights: W1('Bone_S0') });            // môi trên
  m.blob({ ell: [[0, 1.27, 2.42], [0.3, 0.2, 0.24]], k: 0.12, mat: SKIN, color: '#ffcf70', weights: W1('Bone_Jaw') });             // hàm dưới
  m.blob({ ell: [[0, 1.22, 2.6], [0.22, 0.08, 0.1]], k: 0.05, mat: SKIN, color: '#ff9a5a', weights: W1('Bone_Jaw') });             // môi dưới
  H({ ell: [[0.4, 1.74, 2.26], [0.15, 0.15, 0.13]], k: 0.06, color: '#ffe9a0', mirror: true });                                    // gờ mắt
  m.sphere(1, { bone: 'Bone_S0', at: [0.47, 1.75, 2.32], radii: [0.075, 0.11, 0.11], rot: [0, -32, 0], color: '#ffb820', mat: GLOW, mirror: true });
  m.sphere(1, { bone: 'Bone_S0', at: [0.535, 1.755, 2.36], radii: [0.03, 0.06, 0.05], rot: [0, -32, 0], color: '#100804', mat: SKIN, mirror: true });
  m.sphere(0.1, { bone: 'Bone_S0', at: [0, 2.16, 2.18], color: '#fff2f8', mat: GLOW });                                            // ngọc trán
  m.add(new THREE.TorusGeometry(0.11, 0.025, 6, 16), { bone: 'Bone_S0', at: [0, 2.12, 2.2], rot: [-60, 0, 0], color: GOLD, mat: METAL });
  const horn = (t, a, x, y, z) => (t > 0.74 ? [GOLD, METAL] : [hex(mixC('#fff2d0', '#e8c070', t)), HARD]);
  addK(m, tubeGeo([[0.2, 2.06, 1.92], [0.32, 2.38, 1.8], [0.4, 2.72, 1.58], [0.36, 3.02, 1.28]], (t) => 0.075 * (1 - t) + 0.008, { radial: 7, segs: 10 }), { bone: 'Bone_S0', mirror: true }, horn);
  addK(m, tubeGeo([[0.36, 2.5, 1.72], [0.5, 2.68, 1.84], [0.58, 2.86, 1.86]], (t) => 0.045 * (1 - t) + 0.005, { radial: 6, segs: 6 }), { bone: 'Bone_S0', mirror: true }, horn);
  addK(m, tubeGeo([[0.39, 2.82, 1.48], [0.52, 2.96, 1.5], [0.58, 3.1, 1.42]], (t) => 0.035 * (1 - t) + 0.004, { radial: 6, segs: 5 }), { bone: 'Bone_S0', mirror: true }, horn);
  const finC = (v, rib) => hex(mixC(mixC('#cc2a18', '#ffb43a', v), '#7a1408', rib ? 0.45 : 0));
  for (let i = 0; i < 6; i++) { const z = 1.85 - i * 0.21, x = (i % 2 ? 1 : -1) * 0.1; addK(m, leafGeo(0.24, 0.62 - i * 0.04, { bend: -0.3, nv: 6 }), { bone: i < 3 ? 'Bone_S0' : 'Bone_S1', at: [x, 2.0, z], rot: frame([x * 2.5, 0.65, -1], [1, 0, 0]) }, (u, v) => [finC(v, false), SKIN]); } // bờm vây
  const barbel = (pts, r0) => addK(m, tubeGeo(pts, (t) => r0 * (1 - t) + 0.006, { radial: 6, segs: 14 }), { bone: 'Bone_S0', mirror: true }, (t) => [hex(mixC('#ffd070', '#ff7a2a', t)), SKIN]);
  barbel([[0.24, 1.38, 2.66], [0.46, 1.36, 2.6], [0.7, 1.22, 2.36], [0.86, 0.98, 2.0], [0.92, 0.82, 1.6]], 0.04);
  barbel([[0.16, 1.3, 2.7], [0.26, 1.18, 2.72], [0.34, 1.0, 2.62], [0.38, 0.86, 2.48]], 0.028);
  // vây lưng liền dải có tia, uốn theo thân (trọng số như thân)
  for (let i = 1; i < N - 1; i++) {
    const z0 = zs(i) + 0.05, z1 = zs(i + 1) - 0.05, r0 = rAt(i / (N - 1)), r1 = rAt((i + 1) / (N - 1)), H0 = 0.72 - i * 0.08, H1 = 0.72 - (i + 1) * 0.08;
    addK(m, gridGeo(12, 3, (u, v) => { const z = z0 + (z1 - z0) * u, base = 1.5 + (r0 + (r1 - r0) * u) * 1.05 - 0.07, h = (H0 + (H1 - H0) * u) * (1 - 0.2 * Math.abs(Math.sin(u * Math.PI * 3))); return [0, base + v * h, z - v * h * 0.35]; }),
      { bone: `Bone_S${i}`, weights: (p) => segW(i)(p.x, p.y, p.z) }, (u, v) => [finC(v * 0.9, Math.abs(Math.sin(u * Math.PI * 3)) < 0.3 && v > 0.1), SKIN]);
  }
  // vây ngực, vây bụng (quạt có tia), vây đuôi chẻ lớn
  const fan = (bone, at, d, up, R, a0, a1, mirror) => addK(m, fanGeo(R, a0, a1, { nu: 16, nv: 4, cup: 0.08, edge: (u) => 0.72 + 0.28 * Math.sin(u * Math.PI) - 0.07 * Math.abs(Math.sin(u * Math.PI * 4)) }), { bone, at, rot: frame(d, up), mirror },
    (u, v) => [finC(v, Math.abs(Math.sin(u * Math.PI * 8)) < 0.3 && v > 0.15), SKIN]);
  fan('Bone_S1', [0.46, 1.18, zs(1) + 0.3], [0.55, -0.45, -1], [0.25, 1, 0], 0.95, -0.35, 0.6, true);
  fan('Bone_S3', [0.22, 1.02, zs(3) + 0.1], [0.4, -0.6, -1], [0.3, 1, 0], 0.6, -0.3, 0.5, true);
  const zt = zs(N - 1);
  addK(m, gridGeo(16, 5, (u, v) => { const a = (u * 2 - 1) * 1.05, R = 1.6 * (0.6 + 0.48 * Math.pow(Math.abs(u * 2 - 1), 1.4)), r = 0.1 + v * R; return [0, 1.5 + Math.sin(a) * r, zt + 0.15 - Math.cos(a) * r]; }), { bone: `Bone_S${N - 1}` },
    (u, v) => [finC(Math.pow(v, 1.2), Math.abs(Math.sin(u * Math.PI * 8)) < 0.3 && v > 0.15), SKIN]);
  return finish(m, 'long_ngu');
}

// ———————————————————— THẦN ĐIỂU (chim sấm) ————————————————————
function bird() {
  const m = new Model('than_dieu'); m.sdfCell = 0.032; m.sdfTris = 12000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 3.0, 0); m.joint('Bone_Neck', 'Bone_Body', 0, 3.6, 1.1); m.joint('Bone_Head', 'Bone_Neck', 0, 4.9, 1.7);
  m.jointLR('Bone_WingUL', 'Bone_Body', 0.75, 3.6, 0.2); m.jointLR('Bone_WingLL', 'Bone_WingUL', 2.6, 3.9, 0.0); m.jointLR('Bone_WingTipL', 'Bone_WingLL', 4.6, 3.8, -0.4);
  m.joint('Bone_Tail', 'Bone_Body', 0, 2.8, -1.3);
  m.jointLR('Bone_LegL', 'Bone_Body', 0.4, 2.2, 0.0); m.jointLR('Bone_FootL', 'Bone_LegL', 0.45, 1.35, -0.6);
  const plume = (x, y, z) => { const n = fbm(x * 3, y * 3, z * 3); return hex(mixC('#0a3866', '#1e9ad6', n * 0.8 + clamp((y - 2.6) / 2) * 0.35)); };
  const chestC = (x, y, z) => hex(mixC('#ffd86a', '#d8801a', fbm(x * 5, y * 5, z * 5) * 0.8 + clamp((3.4 - y) / 1.2) * 0.4));
  const headC = (x, y, z) => hex(mixC('#f6fbff', '#9cb8cc', fbm(x * 6, y * 6, z * 6) * 0.6 + clamp((4.7 - y) / 0.5) * 0.4));
  const neckC = (x, y, z) => (y > 4.15 ? hex(mixC(plume(x, y, z), headC(x, y, z), clamp((y - 4.15) / 0.35))) : z > 1.0 + (y - 3.5) / 1.2 * 0.6 + 0.22 ? chestC(x, y, z) : plume(x, y, z));
  m.blob({ ell: [[0, 3.05, 0], [1.1, 1.2, 1.6], [-20, 0, 0]], k: 0.3, mat: FEATHER, color: plume, weights: W1('Bone_Body') });
  m.blob({ ell: [[0, 3.3, 1.0], [0.8, 0.9, 0.7]], k: 0.25, mat: FEATHER, color: chestC, weights: W1('Bone_Body') });                       // ức vàng
  m.blob({ cone: [[0, 3.5, 1.0], [0, 4.7, 1.6], 0.6, 0.4], k: 0.25, mat: FEATHER, color: neckC, weights: segWeights('Bone_Neck', 'Bone_Head', [0, 3.6, 1.1], [0, 4.9, 1.7], 0.5, 1, 0, 1) });
  m.blob({ ell: [[0, 4.97, 1.75], [0.56, 0.54, 0.62]], k: 0.15, mat: FEATHER, color: headC, weights: W1('Bone_Head') });
  { const g = new THREE.SphereGeometry(1, 14, 10, Math.PI / 2 - 0.85, 1.7, Math.PI * 0.32, Math.PI * 0.46); g.setAttribute('k', g.getAttribute('uv').clone()); g.deleteAttribute('uv'); // giáp ngực vàng chạm vảy
    addK(m, g, { bone: 'Bone_Body', at: [0, 3.3, 0.98], scale: [0.86, 0.96, 0.76] }, (u, v) => (Math.abs(Math.sin(v * Math.PI * 6 + Math.abs(u - 0.5) * 6)) < 0.18 || u < 0.05 || u > 0.95 ? ['#a8681a', METAL] : ['#ffd060', METAL])); }
  m.blob({ ell: [[0.3, 5.04, 2.02], [0.17, 0.11, 0.17]], k: 0.05, mat: FUR, color: '#08263a', weights: W1('Bone_Head'), mirror: true }); // vệt mắt sẫm
  m.sphere(1, { bone: 'Bone_Head', at: [0.34, 5.08, 2.1], radii: [0.06, 0.08, 0.11], rot: [0, -40, 0], color: '#d8fcff', mat: GLOW, mirror: true });
  const beakC = (x, y, z) => hex(mixC('#ffd868', '#c8841a', clamp((z - 2.2) / 0.9)));
  m.blob({ cone: [[0, 4.95, 2.15], [0, 4.82, 2.75], 0.24, 0.12], k: 0.06, mat: HARD, color: beakC, weights: W1('Bone_Head') });         // mỏ cong móc
  m.blob({ cone: [[0, 4.82, 2.75], [0, 4.56, 3.0], 0.12, 0.025], k: 0.05, mat: HARD, color: '#b87a14', weights: W1('Bone_Head') });
  m.blob({ cone: [[0, 4.76, 2.15], [0, 4.68, 2.6], 0.14, 0.05], k: 0.05, mat: HARD, color: '#d89a2a', weights: W1('Bone_Head') });
  m.sphere(0.07, { bone: 'Bone_Head', at: [0, 5.3, 2.1], color: '#c8fcff', mat: GLOW });                                                  // ngọc trán
  // mào lông sét phát sáng
  for (let i = 0; i < 6; i++) addK(m, leafGeo(0.3 - i * 0.025, 1.4 - i * 0.14, { bend: -0.25, nv: 6 }), { bone: 'Bone_Head', at: [0, 5.36 - i * 0.04, 1.8 - i * 0.18], rot: frame([0, 1, -0.9 - i * 0.25], [1, 0, 0]) }, (u, v) => [hex(mixC('#2ab0ff', '#f0feff', v)), GLOW]);
  addK(m, leafGeo(0.16, 0.7, { bend: -0.2 }), { bone: 'Bone_Head', at: [0.26, 5.2, 1.55], rot: frame([0.5, 0.6, -1], [1, 0.2, 0]), mirror: true }, (u, v) => [hex(mixC('#2ab0ff', '#f0feff', v)), GLOW]);
  // vòng cổ vàng gắn ngọc sấm
  m.add(ring(0.62, 0.05, 30), { bone: 'Bone_Body', at: [0, 3.95, 1.24], rot: aim([0, 1.2, 0.6]), color: GOLD, mat: METAL });
  m.sphere(0.09, { bone: 'Bone_Body', at: [0, 3.66, 1.84], color: '#a8f4ff', mat: GLOW });
  // cánh: tay cánh (SDF) + 3 lớp lông: lông bay sơ cấp (chóp sáng), thứ cấp, lông phủ
  m.blob({ cone: [[0.6, 3.6, 0.2], [2.6, 3.9, 0.0], 0.42, 0.24], k: 0.2, mat: FEATHER, color: plume, weights: segWeights('Bone_WingUL', 'Bone_WingLL', [0.6, 3.6, 0.2], [2.6, 3.9, 0], 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [[2.6, 3.9, 0.0], [4.6, 3.8, -0.4], 0.24, 0.1], k: 0.15, mat: FEATHER, color: plume, weights: W1('Bone_WingLL'), mirror: true });
  const fprof = (v) => Math.min(1, 0.35 + v * 1.6) * Math.sqrt(Math.max(0, 1 - Math.pow(v, 6)));
  const feather = (bone, at, dir, w, len, c0, c1, c2, glowTip, lift = 0) => addK(m, leafGeo(w, len, { bend: 0.05, ridge: 0.05, nv: 6, prof: fprof }), { bone, at, rot: frame(dir, [0, 1, lift]), mirror: true },
    (u, v) => { if (glowTip && v > 0.9) return ['#8aeaff', GLOW]; if (glowTip && Math.abs(u - 0.5) < 0.1 && v > 0.3 && v < 0.82) return ['#38c4ff', GLOW]; /* tia sét dọc sống lông */ const c = v < 0.6 ? mixC(c0, c1, v / 0.6) : mixC(c1, c2, (v - 0.6) / 0.4); return [hex(Math.abs(u - 0.5) < 0.1 ? c.lerp(new THREE.Color('#d8f4ff'), 0.25) : c), FUR]; });
  for (let i = 0; i < 9; i++) { const t = i / 8; feather(t < 0.5 ? 'Bone_WingUL' : 'Bone_WingLL', lerp3([0.9, 3.6, 0.05], [2.7, 3.84, -0.15], t).map((q, k) => (k === 1 ? q + i * 0.006 : q)), [0.15 + t * 0.25, -0.04, -1], 0.44, 1.5 + t * 0.4, '#041c40', '#0a4c8c', '#e0a024', false); }
  for (let i = 0; i < 8; i++) { const t = i / 7; feather(t < 0.45 ? 'Bone_WingLL' : 'Bone_WingTipL', lerp3([2.75, 3.84, -0.12], [4.7, 3.76, -0.45], t).map((q, k) => (k === 1 ? q + 0.05 + i * 0.006 : q)), lerp3([0.35, -0.04, -1], [1, -0.05, -0.12], t), 0.4 - t * 0.06, 1.9 + t * 0.9, '#03163a', '#0a428a', '#2a9cd6', true); }
  for (let i = 0; i < 10; i++) { const t = i / 9; feather(t < 0.5 ? 'Bone_WingUL' : 'Bone_WingLL', lerp3([0.8, 3.76, 0.2], [4.1, 3.92, -0.28], t).map((q, k) => (k === 1 ? q + 0.08 : q)), [0.2 + t * 0.5, -0.02, -1], 0.36, 0.85 + t * 0.3, '#062e5e', '#0f62a6', '#f0b030', false, 0.1); }
  // đuôi phượng: lông dài có mắt đốm vàng, 2 dải đuôi sáng
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.2, len = 3.3 + (3 - Math.abs(i - 3)) * 0.35;
    addK(m, leafGeo(0.46, len, { bend: 0.12, nu: 4, nv: 14, prof: (v) => 0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, v * 0.85 + 0.1)) }), { bone: 'Bone_Tail', at: [Math.sin(a) * 0.2, 2.76 + Math.abs(i - 3) * 0.01, -1.25], rot: frame([Math.sin(a), -0.42, -Math.cos(a)], [0, 1, 0.2]) },
      (u, v) => { const d = Math.hypot((u - 0.5) * 1.1, (v - 0.86) * 5); if (d < 0.2) return ['#1a8ab8', GLOW]; if (d < 0.42) return ['#ffd34a', FUR]; return [hex(mixC('#0e5a82', '#30c4e4', v)), FUR]; });
  }
  for (const sd of [-1, 1]) addK(m, leafGeo(0.14, 4.6, { bend: 0.2, nv: 10, prof: (v) => 0.5 + 0.5 * Math.sin(Math.PI * v) }), { bone: 'Bone_Tail', at: [sd * 0.3, 2.85, -1.2], rot: frame([sd * 0.55, -0.3, -1], [0, 1, 0]) }, (u, v) => (v > 0.8 ? ['#d8fcff', GLOW] : [hex(mixC('#2a9ad0', '#9ae8ff', v)), FUR]));
  // chân vàng có vuốt
  m.blob({ cone: [[0.4, 2.2, 0.0], [0.45, 1.35, -0.6], 0.2, 0.13], k: 0.08, mat: METAL, color: '#e8b040', weights: W1('Bone_LegL'), mirror: true }); // chân co khi bay
  for (const d of [-0.5, 0, 0.5]) m.blob({ cone: [[0.45, 1.35, -0.6], [0.45 + d * 0.3, 1.1, -0.2], 0.1, 0.03], k: 0.04, mat: HARD, color: '#3a2a10', weights: W1('Bone_FootL'), mirror: true });
  return finish(m, 'than_dieu');
}

// ———————————————————— TÀ THẦN (ác thần tím) ————————————————————
function demon() {
  const m = new Model('ta_than'); m.sdfCell = 0.036; m.sdfTris = 15000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Hips', 'Bone_Root', 0, 2.0, 0); m.joint('Bone_Chest', 'Bone_Hips', 0, 3.4, 0.1); m.joint('Bone_Head', 'Bone_Chest', 0, 4.9, 0.6);
  m.joint('Bone_Jaw', 'Bone_Head', 0, 4.72, 0.82);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 1.6, 4.1, 0.1); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 2.2, 2.7, 0.6); m.jointLR('Bone_HandL', 'Bone_ArmLL', 2.3, 1.4, 1.1);
  m.jointLR('Bone_LegUL', 'Bone_Hips', 0.6, 1.9, 0); m.jointLR('Bone_LegLL', 'Bone_LegUL', 0.75, 0.9, 0.25); m.jointLR('Bone_FootL', 'Bone_LegLL', 0.8, 0.1, 0.35);
  // da tím sẫm, vân phù chú phát sáng chạy khắp người
  const runeN = (x, y, z) => Math.abs(fbm(x * 1.7, y * 1.7, z * 1.7, 3) - 0.5);
  const skin = (x, y, z) => { const n = fbm(x * 2.5, y * 2.5, z * 2.5), v = fbm(x * 9, y * 9, z * 9, 2), r = runeN(x, y, z); if (r < 0.02) return hex(mixC('#ffd2ff', '#c050ff', r / 0.02)); let c = mixC('#201834', '#56428a', n * 0.8 + v * 0.3); if (r < 0.045) c = mixC(c, '#7a3ab0', (0.045 - r) / 0.025 * 0.6); return hex(c); };
  const skinM = (x, y, z) => (runeN(x, y, z) < 0.02 ? GLOW : SKIN);
  const S = (o) => m.blob({ mat: skinM, color: skin, ...o });
  const hipW = segWeights('Bone_Hips', 'Bone_Chest', [0, 2, 0], [0, 3.4, 0], 0.3, 0.9, 0, 1);
  S({ ell: [[0, 3.5, 0.15], [1.3, 1.0, 0.9]], k: 0.35, weights: W1('Bone_Chest') });
  S({ ell: [[0, 2.4, 0.1], [0.8, 0.8, 0.65]], k: 0.4, weights: hipW });
  S({ ell: [[0.5, 3.75, 0.72], [0.52, 0.36, 0.3], [10, 0, 0]], k: 0.15, weights: W1('Bone_Chest'), mirror: true });   // ngực
  S({ ell: [[0.62, 4.28, -0.05], [0.5, 0.32, 0.45]], k: 0.2, weights: W1('Bone_Chest'), mirror: true });              // cơ thang
  for (const [y, z] of [[2.85, 0.76], [2.55, 0.66], [2.25, 0.64]]) S({ ell: [[0.19, y, z], [0.18, 0.13, 0.12]], k: 0.08, weights: hipW, mirror: true }); // cơ bụng
  // đầu: sọ, gờ mày nặng, gò má, mũi, hàm bạnh (xương hàm riêng), hốc mắt sâu, mắt xếch phát sáng, nanh trên + răng nanh dưới chĩa lên
  const HW = W1('Bone_Head');
  S({ ell: [[0, 4.98, 0.62], [0.48, 0.56, 0.5]], k: 0.2, weights: HW });
  m.blob({ ell: [[0, 5.16, 0.98], [0.44, 0.13, 0.17], [-12, 0, 0]], k: 0.08, mat: SKIN, color: '#281e3c', weights: HW });
  m.blob({ ell: [[0.28, 4.86, 0.96], [0.14, 0.1, 0.13]], k: 0.06, mat: SKIN, color: skin, weights: HW, mirror: true });
  m.blob({ ell: [[0, 4.94, 1.1], [0.12, 0.12, 0.09]], k: 0.05, mat: SKIN, color: skin, weights: HW });
  m.blob({ ell: [[0, 4.6, 0.9], [0.33, 0.17, 0.22]], k: 0.08, mat: SKIN, color: skin, weights: W1('Bone_Jaw') });
  m.blob({ ell: [[0.19, 5.02, 1.06], [0.13, 0.07, 0.06], [0, 0, -12]], k: 0.02, mat: SKIN, color: '#0c0612', weights: HW, mirror: true });
  m.sphere(1, { bone: 'Bone_Head', at: [0.19, 5.02, 1.1], radii: [0.085, 0.035, 0.03], rot: [0, -15, -14], color: '#ff6ef0', mat: GLOW, mirror: true });
  for (const sd of [-1, 1]) {
    m.add(new THREE.ConeGeometry(0.035, 0.2, 6), { bone: 'Bone_Head', at: [sd * 0.13, 4.72, 1.17], rot: [180, 0, 0], color: '#efe6d0', mat: SKIN });
    m.add(new THREE.ConeGeometry(0.03, 0.17, 6), { bone: 'Bone_Jaw', at: [sd * 0.2, 4.72, 1.04], rot: [-10, 0, 0], color: '#efe6d0', mat: SKIN });
  }
  // sừng cừu lớn có gờ, đai vàng, chóp sáng; sừng phụ; vương miện gai
  const hornC = (t, a, x, y, z) => (t > 0.9 ? ['#e080ff', GLOW] : [hex(mixC('#3a2c48', '#120c18', t * 0.6 + (Math.abs(Math.sin(t * Math.PI * 9)) < 0.22 ? 0.35 : 0))), HARD]);
  const hpts = [[0.32, 5.32, 0.6], [0.78, 5.72, 0.48], [1.08, 6.38, 0.12], [0.96, 6.95, -0.38], [0.7, 7.18, -0.62]], hr = (t) => 0.24 * Math.pow(1 - t, 0.85) + 0.01;
  addK(m, tubeGeo(hpts, hr, { radial: 10, segs: 18 }), { bone: 'Bone_Head', mirror: true }, hornC);
  { const hc = new THREE.CatmullRomCurve3(hpts.map(V3)); for (const t of [0.16, 0.3]) m.add(ring(hr(t) + 0.025, 0.035, 16), { bone: 'Bone_Head', at: hc.getPointAt(t).toArray(), rot: aim(hc.getTangentAt(t).toArray()), color: GOLD, mat: METAL, mirror: true }); }
  addK(m, tubeGeo([[0.16, 5.45, 0.85], [0.22, 5.72, 0.8], [0.2, 5.95, 0.66]], (t) => 0.08 * (1 - t) + 0.006, { radial: 7, segs: 6 }), { bone: 'Bone_Head', mirror: true }, hornC);
  for (const [x, h] of [[0, 0.3], [0.13, 0.2]]) m.add(new THREE.ConeGeometry(0.04, h, 5), { bone: 'Bone_Head', at: [x, 5.32 + h / 2, 0.93], rot: [-15, 0, -x * 80], color: '#e8dcc0', mat: HARD, flat: true, mirror: x > 0 });
  // giáp vai sắt đen viền vàng, gai xương, ngọc tím
  const iron = (x, y, z, ny) => hex(mixC('#241f30', '#5a5070', fbm(x * 6, y * 6, z * 6) * 0.8 + clamp(ny) * 0.3));
  { const v0 = m.vcount; m.add(dome(18, 9, 0.55), { bone: 'Bone_ArmUL', at: [1.55, 4.38, 0.1], rot: [0, 0, -22], scale: [0.78, 0.5, 0.72], mat: METAL, mirror: true }); paint(m, v0, iron, 0.2); }
  m.add(place(ring(1, 0.05, 30), { sc: [0.77, 1, 0.71] }), { bone: 'Bone_ArmUL', at: [1.55, 4.38, 0.1], rot: [0, 0, -22], color: GOLD, mat: METAL, mirror: true });
  for (const [dx, dz, h] of [[0, 0, 0.75], [-0.22, -0.32, 0.55], [0.2, 0.32, 0.5]]) m.add(new THREE.ConeGeometry(0.11, h, 7), { bone: 'Bone_ArmUL', at: [1.6 + dx, 4.75 + h * 0.35, 0.1 + dz], rot: [dz * 40, 0, -28], color: '#e8dcc0', mat: HARD, mirror: true });
  m.sphere(0.12, { bone: 'Bone_ArmUL', at: [1.9, 4.28, 0.42], color: '#d070ff', mat: GLOW, mirror: true });
  // mắt quỷ trên ngực: cầu sáng, con ngươi dọc, vòng vàng tia mặt trời
  m.blob({ ell: [[0, 3.52, 1.0], [0.3, 0.3, 0.14]], k: 0.08, mat: GLOW, color: '#e090ff', weights: W1('Bone_Chest') });
  m.box(0.07, 0.36, 0.05, { bone: 'Bone_Chest', at: [0, 3.52, 1.13], color: '#14081e', mat: SKIN });
  m.add(new THREE.TorusGeometry(0.36, 0.05, 8, 28), { bone: 'Bone_Chest', at: [0, 3.52, 1.05], rot: [-8, 0, 0], color: GOLD, mat: METAL });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; m.add(new THREE.ConeGeometry(0.05, 0.2, 4), { bone: 'Bone_Chest', at: [Math.sin(a) * 0.48, 3.52 + Math.cos(a) * 0.48, 1.0 - Math.abs(Math.cos(a)) * 0.05], rot: [0, 0, -a / D2R], color: GOLD, mat: METAL, flat: true }); }
  // tay: vai, bắp tay, cẳng tay; bao cổ tay sắt có gai; vuốt pha lê
  S({ ell: [[1.6, 4.1, 0.1], [0.55, 0.55, 0.55]], k: 0.15, weights: W1('Bone_ArmUL'), mirror: true });
  S({ cone: [[1.6, 4.1, 0.1], [2.2, 2.7, 0.6], 0.42, 0.32], k: 0.15, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', [1.6, 4.1, 0.1], [2.2, 2.7, 0.6], 0.7, 1, 0, 1), mirror: true });
  S({ ell: [[1.92, 3.45, 0.48], [0.3, 0.42, 0.3], [0, 0, 22]], k: 0.12, weights: W1('Bone_ArmUL'), mirror: true });   // bắp tay
  S({ cone: [[2.2, 2.7, 0.6], [2.3, 1.5, 1.05], 0.34, 0.28], k: 0.12, weights: W1('Bone_ArmLL'), mirror: true });
  S({ ell: [[2.3, 1.35, 1.12], [0.3, 0.3, 0.3]], k: 0.08, weights: W1('Bone_HandL'), mirror: true });
  for (let k = 0; k < 4; k++) { const ox = (k - 1.5) * 0.15; m.blob({ cone: [[2.3 + ox, 1.2, 1.3], [2.3 + ox * 1.5, 0.55, 1.75], 0.07, 0.015], k: 0.04, mat: GLOW, color: '#b06aff', weights: W1('Bone_HandL'), mirror: true }); }
  const fa = lerp3([2.2, 2.7, 0.6], [2.3, 1.5, 1.05], 0.55), fd = [0.1, -1.2, 0.45], fl = Math.hypot(...fd);
  { const v0 = m.vcount; m.add(new THREE.CylinderGeometry(0.36, 0.39, 0.6, 14, 1, true), { bone: 'Bone_ArmLL', at: fa, rot: aim(fd), mat: METAL, mirror: true }); paint(m, v0, iron, 0.2); }
  for (const t of [-0.29, 0.29]) m.add(ring(0.375 - t * 0.05, 0.035, 18), { bone: 'Bone_ArmLL', at: fa.map((q, i) => q + fd[i] / fl * t), rot: aim(fd), color: GOLD, mat: METAL, mirror: true });
  for (const t of [-0.15, 0.1]) m.add(new THREE.ConeGeometry(0.07, 0.36, 6), { bone: 'Bone_ArmLL', at: fa.map((q, i) => q + fd[i] / fl * t + [0.36, 0, -0.12][i]), rot: aim([1, 0.3, -0.5]), color: '#e8dcc0', mat: HARD, mirror: true });
  // gai pha lê tím dọc sống lưng
  for (const [y, z, h, r] of [[4.2, -0.5, 0.95, 0.13], [3.85, -0.68, 0.85, 0.12], [3.45, -0.74, 0.72, 0.1], [3.05, -0.68, 0.55, 0.08]]) {
    m.add(crystalGeo(r, h, 5), { bone: 'Bone_Chest', at: [0, y, z], rot: aim([0, 0.75, -1]), color: '#f4c4ff', color2: '#5a1aa0', mat: GLOW, flat: true });
    m.add(crystalGeo(r * 0.6, h * 0.55, 5), { bone: 'Bone_Chest', at: [0.32, y - 0.05, z + 0.08], rot: aim([0.5, 0.7, -1]), color: '#f4c4ff', color2: '#5a1aa0', mat: GLOW, flat: true, mirror: true });
  }
  // đai lưng da, khoá vàng ngọc; khố vải rách trước/sau có phù văn sáng
  { const v0 = m.vcount; m.loft([{ y: 1.92, rx: 0.86, rz: 0.72, cz: 0.1 }, { y: 2.16, rx: 0.84, rz: 0.7, cz: 0.1 }], { bone: 'Bone_Hips', mat: HARD, seg: 24 }); paint(m, v0, () => '#2a1c18'); }
  m.add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12).rotateX(Math.PI / 2), { bone: 'Bone_Hips', at: [0, 2.04, 0.83], color: GOLD, mat: METAL });
  m.sphere(0.075, { bone: 'Bone_Hips', at: [0, 2.04, 0.87], color: '#d070ff', mat: GLOW });
  const jag = [1, 0.84, 0.97, 0.78, 0.93, 0.82, 1];
  for (const [zf, sgn] of [[0.82, 1], [-0.62, -1]]) addK(m, gridGeo(6, 6, (u, v) => { const L = 1.3 * jag[Math.round(u * 6)]; return [(u - 0.5) * 0.85 * (1 + v * 0.18), 1.98 - v * L, zf + sgn * v * 0.12]; }), { bone: 'Bone_Hips' },
    (u, v) => (Math.abs(u - 0.5) < 0.09 && v > 0.25 && v < 0.55 ? ['#e070ff', GLOW] : [hex(mixC('#52123a', '#24081a', v)), FUR]));
  // chân: đùi, cẳng, bàn; gai gối, vuốt chân
  S({ cone: [[0.6, 1.9, 0], [0.75, 0.9, 0.25], 0.45, 0.32], k: 0.15, weights: segWeights('Bone_LegUL', 'Bone_LegLL', [0.6, 1.9, 0], [0.75, 0.9, 0.25], 0.7, 1, 0, 1), mirror: true });
  S({ cone: [[0.75, 0.9, 0.25], [0.8, 0.15, 0.35], 0.32, 0.24], k: 0.1, weights: W1('Bone_LegLL'), mirror: true });
  S({ ell: [[0.8, 0.12, 0.5], [0.3, 0.13, 0.42]], k: 0.08, weights: W1('Bone_FootL'), mirror: true });
  m.add(new THREE.ConeGeometry(0.1, 0.42, 6), { bone: 'Bone_LegLL', at: [0.78, 0.98, 0.56], rot: [70, 0, 0], color: '#e8dcc0', mat: HARD, mirror: true });
  for (const dx of [-0.14, 0, 0.14]) m.add(new THREE.ConeGeometry(0.05, 0.22, 5), { bone: 'Bone_FootL', at: [0.8 + dx, 0.08, 0.88], rot: [95, 0, 0], color: '#d8ccb0', mat: HARD, mirror: true });
  return finish(m, 'ta_than');
}


// ———————————————————— LÍNH (kiểu Liên Quân: đầu + mũ to, vai giáp lớn, giáp ngực sơn màu đội viền vàng, áo choàng, chân ngắn chắc) ————————————————————
// _mat: 4 = giáp sơn màu đội (bóng), 8 = vải màu đội (áo choàng, khăn), 6 = phát sáng màu đội, 7 = kim loại sáng (thép/đồng vàng).
/** Áo choàng cong ôm lưng: lưới 2 mặt, mép hai bên khum ra trước. */
function capeGeo(w0, w1, y0, y1, z0, z1, nx = 8, ny = 8) {
  const mk = (back) => {
    const pos = [], idx = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx * 2 - 1, v = j / ny, w = w0 + (w1 - w0) * v;
      pos.push(u * w / 2, y0 + (y1 - y0) * v, z0 + (z1 - z0) * v + 0.07 * u * u - 0.02 * Math.sin(v * Math.PI) + (back ? -0.006 : 0));
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (back) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  return [mk(false), mk(true)];
}
/** Khiên hình diều (2D, đơn vị 1 = nửa bề ngang). */
const KITE = [[-1, 0.9], [-0.55, 1.05], [0, 0.98], [0.55, 1.05], [1, 0.9], [0.92, 0.1], [0.62, -0.62], [0, -1.25], [-0.62, -0.62], [-0.92, 0.1]];
/** Ngôi sao trống đồng Đông Sơn n cánh (2D). */
const STAR = (n, R, r) => Array.from({ length: n * 2 }, (_, i) => { const a = i / (n * 2) * Math.PI * 2, q = i % 2 ? r : R; return [Math.sin(a) * q, Math.cos(a) * q]; });

/** Bộ khung + thân lính. o: { bulk, scale, skin, cloth, cell, tris, arm (to tay), hair } */
function soldierBase(id, o = {}) {
  const m = new Model(id); m.sdfCell = o.cell || 0.0095; m.sdfTris = o.tris || 5000;
  const k = o.bulk || 1, sc = o.scale || 1, s = (v) => v.map((q) => q * sc), S = (v) => v * sc, ka = k * (o.arm || 1);
  const P = { hip: 0.78, chest: 1.08, head: 1.34 };
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Hips', 'Bone_Root', ...s([0, P.hip, 0])); m.joint('Bone_Chest', 'Bone_Hips', ...s([0, P.chest, 0])); m.joint('Bone_Head', 'Bone_Chest', ...s([0, P.head, 0.02]));
  const A = { sh: [0.27 * k, 1.22, 0], el: [0.33 * k, 0.97, 0.04], ha: [0.35 * k, 0.77, 0.08] }, L = { hp: [0.12 * k, 0.76, 0], kn: [0.13 * k, 0.42, 0.03], ft: [0.13 * k, 0.08, 0] };
  m.jointLR('Bone_ArmUL', 'Bone_Chest', ...s(A.sh)); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', ...s(A.el)); m.jointLR('Bone_HandL', 'Bone_ArmLL', ...s(A.ha));
  m.jointLR('Bone_LegUL', 'Bone_Hips', ...s(L.hp)); m.jointLR('Bone_LegLL', 'Bone_LegUL', ...s(L.kn)); m.jointLR('Bone_FootL', 'Bone_LegLL', ...s(L.ft));
  const skin = o.skin || '#eac7a4', cloth = o.cloth || DARKCLOTH;
  const clothC = (x, y, z) => hex(new THREE.Color(cloth).multiplyScalar(0.92 + fbm(x * 40, y * 40, z * 40, 2) * 0.16));
  const torsoW = (x, y) => (y / sc < 0.95 ? [['Bone_Hips', 1]] : y / sc < 1.05 ? [['Bone_Hips', 0.5], ['Bone_Chest', 0.5]] : [['Bone_Chest', 1]]);
  // thân + đầu (SDF liền khối)
  m.blob({ loft: [{ y: S(0.7), rx: S(0.19 * k), rz: S(0.14 * k) }, { y: S(0.9), rx: S(0.18 * k), rz: S(0.13 * k) }, { y: S(1.1), rx: S(0.23 * k), rz: S(0.15 * k) }, { y: S(1.24), rx: S(0.2 * k), rz: S(0.13 * k) }], k: S(0.03), mat: FUR, color: clothC, weights: torsoW });
  m.blob({ cone: [s([0, 1.22, 0.01]), s([0, 1.33, 0.02]), S(0.075), S(0.068)], k: S(0.03), mat: SKIN, color: skin, weights: W1('Bone_Head') });
  m.blob({ ell: [s([0, 1.43, 0.02]), [S(0.152), S(0.165), S(0.152)]], k: S(0.03), mat: SKIN, color: skin, weights: W1('Bone_Head') });
  m.blob({ ell: [s([0, 1.4, 0.165]), [S(0.022), S(0.026), S(0.022)]], k: S(0.015), mat: SKIN, color: skin, weights: W1('Bone_Head') }); // mũi
  m.blob({ ell: [s([0.148, 1.42, 0.0]), [S(0.022), S(0.038), S(0.026)]], k: S(0.012), mat: SKIN, color: skin, weights: W1('Bone_Head'), mirror: true }); // tai
  m.blob({ ell: [s([0, 1.335, 0.07]), [S(0.1), S(0.05), S(0.09)]], k: S(0.03), mat: SKIN, color: skin, weights: W1('Bone_Head') }); // cằm vuông
  // mắt to, mày rậm (nhìn rõ từ camera cao), miệng
  m.sphere(S(0.024), { bone: 'Bone_Head', at: s([0.056, 1.425, 0.148]), radii: [S(0.024), S(0.029), S(0.012)], color: '#18121a', mat: SKIN, mirror: true });
  m.sphere(S(0.008), { bone: 'Bone_Head', at: s([0.062, 1.436, 0.158]), color: '#ffffff', mat: SKIN, mirror: true });
  m.box(S(0.06), S(0.016), S(0.02), { bone: 'Bone_Head', at: s([0.058, 1.462, 0.15]), rot: [0, 12, -14], color: o.hair || '#1c1612', mat: FUR, mirror: true });
  m.box(S(0.05), S(0.01), S(0.012), { bone: 'Bone_Head', at: s([0, 1.355, 0.152]), color: '#7a3428', mat: SKIN });
  // tay: áo trong, ống tay thép, găng da
  m.blob({ cone: [s(A.sh), s(A.el), S(0.075 * ka), S(0.06 * ka)], k: S(0.025), mat: FUR, color: clothC, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', s(A.sh), s(A.el), 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [s(A.el), s(A.ha), S(0.06 * ka), S(0.05 * ka)], k: S(0.02), mat: FUR, color: clothC, weights: W1('Bone_ArmLL'), mirror: true });
  m.blob({ ell: [s([A.ha[0] + 0.005, A.ha[1] - 0.04, A.ha[2] + 0.01]), [S(0.058 * ka), S(0.062 * ka), S(0.052 * ka)]], k: S(0.02), mat: HARD, color: LEATHER, weights: W1('Bone_HandL'), mirror: true });
  m.limb(s([A.el[0] + 0.005, A.el[1] - 0.03, A.el[2] + 0.01]), s([A.ha[0], A.ha[1] + 0.05, A.ha[2]]), [[0, S(0.07 * ka)], [0.5, S(0.066 * ka)], [1, S(0.058 * ka)]], { bone: 'Bone_ArmLL', color: STEEL, mat: METAL, mirror: true });
  m.add(place(ring(S(0.071 * ka), S(0.011)), { rz: -14, at: s([A.el[0] + 0.004, A.el[1] - 0.035, A.el[2] + 0.01]) }), { bone: 'Bone_ArmLL', color: GOLD, mat: METAL, mirror: true });
  // chân: quần vải, gối đồng, ống quyển thép, ủng da mũi cong viền vàng
  m.blob({ cone: [s(L.hp), s(L.kn), S(0.1 * k), S(0.075 * k)], k: S(0.03), mat: FUR, color: clothC, weights: segWeights('Bone_LegUL', 'Bone_LegLL', s(L.hp), s(L.kn), 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [s(L.kn), s([L.ft[0], 0.12, 0]), S(0.07 * k), S(0.06 * k)], k: S(0.02), mat: FUR, color: clothC, weights: W1('Bone_LegLL'), mirror: true });
  m.blob({ ell: [s([L.ft[0], 0.065, 0.05]), [S(0.08 * k), S(0.066), S(0.138 * k)]], k: S(0.025), mat: HARD, color: LEATHER, weights: W1('Bone_FootL'), mirror: true });
  m.limb(s([L.kn[0], 0.38, 0.035]), s([L.ft[0], 0.13, 0.01]), [[0, S(0.078 * k)], [0.6, S(0.072 * k)], [1, S(0.068 * k)]], { bone: 'Bone_LegLL', color: STEEL, mat: METAL, mirror: true });
  m.add(place(ring(S(0.072 * k), S(0.012), 18), { at: s([L.ft[0], 0.13, 0.012]) }), { bone: 'Bone_LegLL', color: GOLD, mat: METAL, mirror: true }); // viền vàng cổ ủng
  m.sphere(S(0.05 * k), { bone: 'Bone_LegLL', at: s([L.kn[0], 0.43, 0.075]), radii: [S(0.055 * k), S(0.05), S(0.035)], color: GOLD, mat: METAL, mirror: true });
  return { m, s, S, k, sc, A, L };
}
/** Giáp: giáp ngực sơn màu đội viền vàng + huy hiệu, đai da khoá vàng + túi, váy giáp 5 tấm, vai giáp hai lớp, áo choàng. o: { pauldron, cape, skirt } */
function teamArmor(b, o = {}) {
  const { m, s, S, k } = b;
  m.loft([{ y: S(0.93), rx: S(0.205 * k), rz: S(0.158 * k) }, { y: S(1.02), rx: S(0.226 * k), rz: S(0.17 * k) }, { y: S(1.14), rx: S(0.258 * k), rz: S(0.184 * k) }, { y: S(1.24), rx: S(0.238 * k), rz: S(0.168 * k) }, { y: S(1.29), rx: S(0.15 * k), rz: S(0.12 * k) }],
    { bone: 'Bone_Chest', color: '#f2f2f2', mat: TEAM, seg: 22 });
  for (const [y, R, rz] of [[0.935, 0.207, 0.158 / 0.205], [1.285, 0.155, 0.122 / 0.15]]) m.add(place(ring(S(R * k), S(0.016), 28), { sc: [1, 1, rz], at: s([0, y, 0]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL });
  m.add(place(ring(S(0.248 * k), S(0.009), 28), { sc: [1, 1, 0.71], at: s([0, 1.14, 0]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL }); // gân ngực
  m.extrude([[0, 0.07], [0.05, 0], [0, -0.075], [-0.05, 0]].map(([x, y]) => [S(x), S(y)]), S(0.02), { bone: 'Bone_Chest', at: s([0, 1.12, 0.188 * k]), color: GOLD, mat: METAL }); // huy hiệu
  m.sphere(S(0.022), { bone: 'Bone_Chest', at: s([0, 1.12, 0.2 * k]), color: '#ffffff', mat: TEAMGLOW });
  // đai da + khoá + túi da bên hông
  m.loft([{ y: S(0.86), rx: S(0.2 * k), rz: S(0.152 * k) }, { y: S(0.935), rx: S(0.206 * k), rz: S(0.158 * k) }], { bone: 'Bone_Hips', color: LEATHER, mat: HARD, seg: 22 });
  m.box(S(0.08), S(0.06), S(0.02), { bone: 'Bone_Hips', at: s([0, 0.897, 0.162 * k]), color: GOLD, mat: METAL });
  m.box(S(0.07), S(0.075), S(0.045), { bone: 'Bone_Hips', at: s([-0.17 * k, 0.86, 0.09 * k]), rot: [0, -35, 0], color: '#6a4628', mat: HARD });
  // váy giáp: 5 tấm, đáy xoè ra ngoài, viền vàng; tấm trước đi theo đùi
  if (o.skirt !== false) for (const [a, w] of [[0, 0.17], [46, 0.15], [-46, 0.15], [128, 0.17], [-128, 0.17]]) {
    const hgt = 0.2, plate = new THREE.BoxGeometry(S(w * k), S(hgt), S(0.018)).translate(0, -S(hgt / 2), 0).rotateX(-0.28), trim = new THREE.BoxGeometry(S(w * k + 0.008), S(0.026), S(0.024)).translate(0, -S(hgt), 0).rotateX(-0.28);
    const pr = S(0.172 * k), y = S(0.875), pos = [0, y, pr], wt = a === 0 ? W1('Bone_Hips') : (p) => [['Bone_Hips', 0.55], [p.x > 0 ? 'Bone_LegUL' : 'Bone_LegUR', 0.45]]; // add(): weights nhận Vector3
    m.add(place(plate, { ry: a, at: [0, 0, 0] }).translate(Math.sin(a * Math.PI / 180) * pr, y, Math.cos(a * Math.PI / 180) * pr - pos[2] + pr), { bone: 'Bone_Hips', weights: wt, color: '#e6e6e6', mat: TEAM, flat: true });
    m.add(place(trim, { ry: a }).translate(Math.sin(a * Math.PI / 180) * pr, y, Math.cos(a * Math.PI / 180) * pr), { bone: 'Bone_Hips', weights: wt, color: GOLD, mat: METAL, flat: true });
  }
  // vai giáp hai lớp (vòm lớn + lớp dưới) viền vàng, đinh tán
  const pd = o.pauldron ?? 1;
  if (pd > 0) {
    const domeA = (rx, ry, at, rz) => m.add(place(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), { sc: [S(rx * pd * k), S(ry * pd), S(rx * pd * k)], rz, at: s(at) }), { bone: 'Bone_ArmUL', color: '#ececec', mat: TEAM, mirror: true });
    domeA(0.135, 0.11, [0.3 * k, 1.21, 0], -28); domeA(0.112, 0.08, [0.345 * k, 1.13, 0], -42);
    m.add(place(new THREE.TorusGeometry(S(0.132 * pd * k), S(0.012), 6, 26).rotateX(Math.PI / 2), { rz: -28, at: s([0.3 * k, 1.2, 0]) }), { bone: 'Bone_ArmUL', color: GOLD, mat: METAL, mirror: true });
    m.sphere(S(0.022), { bone: 'Bone_ArmUL', at: s([0.33 * k, 1.29, 0]), color: GOLD, mat: METAL, mirror: true });
  }
  if (o.cape !== false) { // áo choàng màu đội sau lưng
    const [f, bk] = capeGeo(S(0.42 * k), S(0.58 * k), S(1.25), S(0.42), S(-0.17 * k), S(-0.3 * k));
    const w = (p) => { const t = clamp((S(1.25) - p.y) / S(0.83)); return t < 0.2 ? [['Bone_Chest', 1]] : [['Bone_Chest', 1 - t * 0.7], ['Bone_Hips', t * 0.7]]; };
    for (const g of [f, bk]) m.add(g, { bone: 'Bone_Chest', weights: w, color: '#b4b4b4', mat: TEAMCLOTH, ao: 0.15 });
    m.add(place(new THREE.BoxGeometry(S(0.44 * k), S(0.035), S(0.04)), { at: s([0, 1.255, -0.165 * k]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL });
  }
}
/** Mũ trụ thép: vòm, vành vàng, chỏm lông màu đội chạy dọc, che má. */
function helmet(b, o = {}) {
  const { m, s, S } = b, r = o.r || 0.172;
  m.add(place(new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), { sc: [S(r), S(0.17), S(r)], at: s([0, 1.468, -0.008]) }), { bone: 'Bone_Head', color: STEEL, mat: METAL });
  m.add(place(ring(S(r + 0.004), S(0.017), 30), { at: s([0, 1.455, -0.008]) }), { bone: 'Bone_Head', color: GOLD, mat: METAL });
  m.add(place(new THREE.BoxGeometry(S(0.022), S(0.17), S(0.02)), { rx: -8, at: s([0, 1.4, 0.165]) }), { bone: 'Bone_Head', color: STEEL, mat: METAL }); // thanh che mũi
  m.box(S(0.03), S(0.11), S(0.1), { bone: 'Bone_Head', at: s([0.158, 1.39, 0.04]), rot: [0, 0, 8], color: STEEL, mat: METAL, mirror: true });   // che má
  if (o.crest !== false) { // chỏm lông: vây cong từ trán ra sau gáy
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, z = 0.15 - t * 0.4, y = Math.sin(t * Math.PI) * 0.16 + (t > 0.7 ? -(t - 0.7) * 0.3 : 0); pts.push([z, y]); }
    for (let i = 10; i >= 0; i--) { const t = i / 10, z = 0.13 - t * 0.33; pts.push([z, -0.02 - Math.sin(t * Math.PI) * 0.01]); }
    m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.035), bevelEnabled: true, bevelSize: S(0.008), bevelThickness: S(0.008), bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -S(0.0175)), { ry: -90, at: s([0, 1.6, 0.0]) }), { bone: 'Bone_Head', color: '#e8e8e8', mat: TEAMCLOTH, flat: true });
    m.sphere(S(0.03), { bone: 'Bone_Head', at: s([0, 1.62, 0.13]), color: GOLD, mat: METAL });
  }
  // hoa văn vàng hình búp sen/ngọn lửa trên trán mũ
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0], [0.032, 0.022], [0.022, 0.062], [0, 0.095], [-0.022, 0.062], [-0.032, 0.022]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.012), bevelEnabled: true, bevelSize: S(0.005), bevelThickness: S(0.005), bevelSegments: 1 }), { rx: -24, at: s([0, 1.492, r - 0.01]) }), { bone: 'Bone_Head', color: GOLD, mat: METAL, flat: true });
  m.sphere(S(0.014), { bone: 'Bone_Head', at: s([0, 1.52, r + 0.004]), color: '#ffffff', mat: TEAMGLOW });
}

function swordsman() {
  const b = soldierBase('linh_kiem'); teamArmor(b); helmet(b);
  const { m, s, S } = b;
  // kiếm tay phải (−X): lưỡi rộng có gân, chắn vàng cong, chuôi quấn da, núm vàng
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[-0.036, 0], [0.036, 0], [0.032, 0.62], [0, 0.73], [-0.032, 0.62]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.01), bevelEnabled: true, bevelSize: S(0.008), bevelThickness: S(0.004), bevelSegments: 1 }).translate(0, 0, -S(0.005)), { at: s([-0.355, 0.84, 0.12]) }), { bone: 'Bone_HandR', color: '#e8eef6', mat: METAL, flat: true });
  m.box(S(0.008), S(0.52), S(0.022), { bone: 'Bone_HandR', at: s([-0.355, 1.11, 0.12]), color: '#9aa4b0', mat: METAL });
  m.add(place(new THREE.TorusGeometry(S(0.09), S(0.016), 5, 12, Math.PI), { rz: 180, at: s([-0.355, 0.86, 0.12]) }), { bone: 'Bone_HandR', color: GOLD, mat: METAL });
  m.cyl(S(0.02), S(0.02), S(0.13), { bone: 'Bone_HandR', at: s([-0.355, 0.78, 0.12]), color: LEATHER, mat: HARD });
  m.sphere(S(0.03), { bone: 'Bone_HandR', at: s([-0.355, 0.7, 0.12]), color: GOLD, mat: METAL });
  // khiên diều tay trái (+X) quay chéo ra trước (thấy rõ mặt sơn màu đội từ camera cao): viền vàng, sao trống đồng 12 cánh, ngọc giữa
  const SH = { ry: 30, at: s([0.43, 0.86, 0.18]) };
  const sh = (sc2, d) => new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(S(x * 0.2 * sc2), S(y * 0.21 * sc2)))), { depth: S(d), bevelEnabled: true, bevelSize: S(0.01), bevelThickness: S(0.01), bevelSegments: 1, curveSegments: 4 });
  m.add(place(sh(1.12, 0.02).translate(0, 0, -S(0.025)), SH), { bone: 'Bone_HandL', color: GOLD, mat: METAL, flat: true });
  m.add(place(sh(1, 0.03), SH), { bone: 'Bone_HandL', color: '#efefef', mat: TEAM, flat: true });
  const front = (dz) => { const a = 30 * D2R; return [S(0.43 + Math.sin(a) * dz), S(0.875), S(0.18 + Math.cos(a) * dz)]; };
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(STAR(12, 0.105, 0.05).map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.012), bevelEnabled: true, bevelSize: S(0.005), bevelThickness: S(0.005), bevelSegments: 1 }), { ry: 30, at: front(0.045) }), { bone: 'Bone_HandL', color: GOLD, mat: METAL, flat: true });
  m.add(place(new THREE.TorusGeometry(S(0.122), S(0.009), 5, 28), { ry: 30, at: front(0.044) }), { bone: 'Bone_HandL', color: GOLD, mat: METAL });
  m.sphere(S(0.032), { bone: 'Bone_HandL', at: front(0.06), radii: [S(0.032), S(0.032), S(0.02)], color: '#ffffff', mat: TEAMGLOW });
  return finish(m, 'linh_kiem');
}
function archer() {
  const b = soldierBase('linh_cung', { cloth: '#33302a' }); teamArmor(b, { pauldron: 0.8, skirt: true });
  const { m, s, S } = b;
  // mũ trùm vải màu đội + băng trán da, lông vũ
  m.add(place(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), { sc: [S(0.178), S(0.175), S(0.182)], at: s([0, 1.49, -0.02]) }), { bone: 'Bone_Head', color: '#e4e4e4', mat: TEAMCLOTH });
  m.blob({ cone: [s([0, 1.46, -0.15]), s([0, 1.22, -0.2]), S(0.09), S(0.05)], k: S(0.02), mat: TEAMCLOTH, color: '#d8d8d8', weights: W1('Bone_Head') }); // vạt mũ trùm sau gáy
  m.add(place(ring(S(0.176), S(0.011), 28), { at: s([0, 1.5, -0.02]) }), { bone: 'Bone_Head', color: GOLD, mat: METAL }); // viền mũ trùm
  m.sphere(S(0.02), { bone: 'Bone_Head', at: s([0, 1.51, 0.182]), color: '#ffffff', mat: TEAMGLOW });
  for (const [rz, dz, sc2] of [[-35, -0.04, 1.15], [-55, -0.09, 0.9]]) // cặp lông vũ màu đội cắm bên mũ trùm
    m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0], [0.03, 0.08], [0.018, 0.2], [0, 0.24], [-0.012, 0.12]].map(([x, y]) => new THREE.Vector2(S(x * sc2), S(y * sc2)))), { depth: S(0.006), bevelEnabled: false }), { rz, ry: 70, at: s([0.15, 1.5, dz]) }), { bone: 'Bone_Head', color: '#ececec', mat: TEAMCLOTH, flat: true });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0], [0.032, 0.022], [0.022, 0.062], [0, 0.095], [-0.022, 0.062], [-0.032, 0.022]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.012), bevelEnabled: true, bevelSize: S(0.005), bevelThickness: S(0.005), bevelSegments: 1 }), { rx: -20, at: s([0, 1.485, 0.163]) }), { bone: 'Bone_Head', color: GOLD, mat: METAL, flat: true }); // hoa văn búp sen vàng
  // cung sừng hai đầu cong ngược, chuôi quấn da, dây cung, chóp vàng
  const bowPts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * 2 - 1, y = t * 0.47, z = 0.11 * (1 - t * t) - 0.05 * Math.pow(Math.abs(t), 6); bowPts.push(new THREE.Vector3(0, y, z)); }
  const bow = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bowPts), 20, S(0.018), 6, false); bow.scale(S(1), S(1), S(1));
  m.add(bow.translate(...s([0.37, 0.8, 0.12])), { bone: 'Bone_HandL', color: '#6a3c1e', mat: HARD });
  for (const t of [-1, 1]) m.add(new THREE.ConeGeometry(S(0.022), S(0.07), 6), { bone: 'Bone_HandL', at: s([0.37, 0.8 + t * 0.49, 0.065]), rot: [t > 0 ? 0 : 180, 0, 0], color: GOLD, mat: METAL });
  m.cyl(S(0.026), S(0.026), S(0.13), { bone: 'Bone_HandL', at: s([0.37, 0.8, 0.23]), color: '#e8e8e8', mat: TEAMCLOTH });
  m.cyl(S(0.003), S(0.003), S(0.94), { bone: 'Bone_HandL', at: s([0.37, 0.8, 0.07]), color: '#f0e8d0', mat: SKIN });
  // bao tay da ở cẳng tay cầm cung
  m.limb(s([0.345, 0.9, 0.06]), s([0.35, 0.8, 0.08]), [[0, S(0.075)], [1, S(0.07)]], { bone: 'Bone_ArmLL', color: LEATHER, mat: HARD });
  // ống tên da viền vàng + tên lông màu đội
  m.cyl(S(0.065), S(0.055), S(0.44), { bone: 'Bone_Chest', at: s([-0.11, 1.2, -0.2]), rot: [-12, 0, 20], color: LEATHER, mat: HARD, seg: 12 });
  m.add(place(ring(S(0.067), S(0.01), 14), { rx: -12, rz: 20, at: s([-0.15, 1.39, -0.235]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL });
  for (const [dx, dz] of [[-0.02, 0], [0.02, 0.01], [0, -0.025], [0.025, -0.02]]) m.add(place(new THREE.ConeGeometry(S(0.026), S(0.09), 4), { rx: -12, rz: 20, at: s([-0.17 + dx, 1.47, -0.25 + dz]) }), { bone: 'Bone_Chest', color: '#e0e0e0', mat: TEAMCLOTH, flat: true });
  return finish(m, 'linh_cung');
}
function giant() { // lính đèn lớn: hộ pháp vạm vỡ, mũ sừng có che mặt, râu quai nón, vai giáp to có gai, hộ tâm kính đồng, cờ đuôi nheo sau lưng, vác chuỳ đèn lồng màu đội
  const b = soldierBase('linh_den', { cloth: '#3a2c22', bulk: 1.45, scale: 1.3, cell: 0.013, tris: 6200, skin: '#c99a76', arm: 1.3, hair: '#120c0a' }); teamArmor(b, { pauldron: 1.4 }); helmet(b, { r: 0.18, crest: false });
  const { m, s, S } = b;
  // cổ áo lông thú (thấp, để lộ giáp màu đội)
  const pelt = (x, y, z) => hex(mixC('#5a4430', '#2c2018', fbm(x * 14, y * 30, z * 14)).multiplyScalar(0.85 + fbm(x * 40, y * 80, z * 40, 2) * 0.3));
  m.blob({ loft: [{ y: S(1.2), rx: S(0.36), rz: S(0.27) }, { y: S(1.27), rx: S(0.3), rz: S(0.22) }, { y: S(1.32), rx: S(0.17), rz: S(0.15) }], k: S(0.02), mat: FUR, color: pelt, weights: W1('Bone_Chest') });
  m.blob({ ell: [s([0, 0.98, 0.07]), [S(0.32), S(0.27), S(0.27)]], k: S(0.05), mat: TEAM, color: (x, y, z) => (Math.abs(((y / b.sc) * 18) % 1 - 0.5) < 0.12 ? '#a8a8a8' : '#e8e8e8'), weights: (x, y) => (y / b.sc < 1.0 ? [['Bone_Hips', 1]] : [['Bone_Chest', 1]]) }); // bụng bọc giáp vảy màu đội
  // râu quai nón + ria
  m.blob({ ell: [s([0, 1.33, 0.1]), [S(0.12), S(0.075), S(0.08)]], k: S(0.025), mat: FUR, color: '#1a120e', weights: W1('Bone_Head') });
  m.blob({ cone: [s([0, 1.3, 0.13]), s([0, 1.22, 0.16]), S(0.06), S(0.025)], k: S(0.02), mat: FUR, color: '#1a120e', weights: W1('Bone_Head') });
  m.box(S(0.09), S(0.02), S(0.02), { bone: 'Bone_Head', at: s([0.04, 1.375, 0.158]), rot: [0, 10, -18], color: '#1a120e', mat: FUR, mirror: true });
  // hộ tâm kính: đĩa đồng trước ngực, tâm sáng màu đội
  const chestZ = 0.184 * 1.45 + 0.012;
  m.add(new THREE.CylinderGeometry(S(0.1), S(0.1), S(0.025), 20).rotateX(Math.PI / 2), { bone: 'Bone_Chest', at: s([0, 1.13, chestZ]), color: GOLD, mat: METAL });
  m.add(new THREE.TorusGeometry(S(0.1), S(0.012), 6, 24), { bone: 'Bone_Chest', at: s([0, 1.13, chestZ + 0.012]), color: '#b88a30', mat: METAL });
  m.sphere(S(0.04), { bone: 'Bone_Chest', at: s([0, 1.13, chestZ + 0.014]), radii: [S(0.04), S(0.04), S(0.02)], color: '#ffffff', mat: TEAMGLOW });
  for (const sd of [1]) { // sừng cong trên mũ
    const pts = [[0.13, 1.53, 0.02], [0.23, 1.61, 0.0], [0.29, 1.75, -0.03], [0.27, 1.89, -0.06]].map((p) => new THREE.Vector3(...s(p)).setX(s(p)[0] * sd));
    const horn = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 1, 7, false), p = horn.attributes.position, uv = horn.attributes.uv, cp = new THREE.CatmullRomCurve3(pts).getSpacedPoints(10);
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i), c = cp[Math.round(t * 10)], rr = S(0.05 * (1 - t) + 0.008); p.setXYZ(i, c.x + (p.getX(i) - c.x) * rr, c.y + (p.getY(i) - c.y) * rr, c.z + (p.getZ(i) - c.z) * rr); }
    horn.computeVertexNormals(); m.add(horn, { bone: 'Bone_Head', color: '#efe4cc', mat: HARD, mirror: true });
  }
  for (const [x, y, z, h] of [[0.42, 1.36, 0.02, 0.15], [0.48, 1.29, -0.08, 0.12], [0.46, 1.31, 0.12, 0.12]]) m.cone(S(0.034), S(h), { bone: 'Bone_ArmUL', at: s([x, y, z]), rot: [0, 0, -40], color: STEEL, mat: METAL, mirror: true }); // gai vai
  // cờ đuôi nheo màu đội cắm sau lưng (2 cán)
  for (const sd of [-1, 1]) {
    m.cyl(S(0.014), S(0.014), S(1.0), { bone: 'Bone_Chest', at: s([sd * 0.16, 1.62, -0.3]), rot: [-6, 0, sd * -8], color: '#4a2c16', mat: HARD });
    m.cone(S(0.025), S(0.07), { bone: 'Bone_Chest', at: s([sd * 0.23, 2.15, -0.35]), color: GOLD, mat: METAL });
    const flag = gridGeo(6, 2, (u, v) => [Math.sin(u * 5) * 0.03 * u, -v * 0.3 * (1 - u * 0.75), -u * 0.6]); // cờ đuôi nheo bay ra sau
    m.add(flag, { bone: 'Bone_Chest', at: s([sd * 0.225, 2.08, -0.36]), scale: [S(1), S(1), S(1)], rot: [0, sd * 20, 0], color: '#e8e8e8', mat: TEAMCLOTH, ao: 0.1 });
  }
  // chuỳ đèn lồng: cán gỗ, đai đồng, lồng đèn sáng màu đội có nan, chóp
  m.cyl(S(0.045), S(0.045), S(1.6), { bone: 'Bone_HandR', at: s([-0.48, 1.2, 0.12]), color: '#4a2c16', mat: HARD });
  for (const y of [0.6, 1.0, 1.5]) m.add(place(ring(S(0.05), S(0.013), 10), { at: s([-0.48, y, 0.12]) }), { bone: 'Bone_HandR', color: GOLD, mat: METAL });
  m.sphere(S(0.22), { bone: 'Bone_HandR', at: s([-0.48, 2.22, 0.12]), radii: [S(0.22), S(0.27), S(0.22)], color: '#ffffff', mat: TEAMGLOW });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; m.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.5, 1].map((t) => new THREE.Vector3(...s([-0.48 + Math.cos(a) * 0.225 * Math.sin(Math.PI * (0.15 + 0.7 * t)), 1.97 + t * 0.5, 0.12 + Math.sin(a) * 0.225 * Math.sin(Math.PI * (0.15 + 0.7 * t))])))), 6, S(0.012), 4, false), { bone: 'Bone_HandR', color: GOLD, mat: METAL }); }
  m.cyl(S(0.13), S(0.16), S(0.055), { bone: 'Bone_HandR', at: s([-0.48, 2.49, 0.12]), color: GOLD, mat: METAL, seg: 14 });
  m.cyl(S(0.16), S(0.12), S(0.055), { bone: 'Bone_HandR', at: s([-0.48, 1.95, 0.12]), color: GOLD, mat: METAL, seg: 14 });
  m.cone(S(0.065), S(0.18), { bone: 'Bone_HandR', at: s([-0.48, 2.6, 0.12]), color: GOLD, mat: METAL, seg: 8 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; m.cone(S(0.022), S(0.1), { bone: 'Bone_HandR', at: s([-0.48 + Math.cos(a) * 0.15, 1.92, 0.12 + Math.sin(a) * 0.15]), rot: [180, 0, 0], color: GOLD, mat: METAL }); } // tua đồng dưới đèn
  return finish(m, 'linh_den');
}
function siege() { // xe đá: khung gỗ đóng ván, vách sơn màu đội đinh tán vàng, 4 bánh nan có vành sắt + đinh, giá chữ A, cần ném gàu đá, đối trọng, đầu rồng mũi xe, đèn lồng, sọt đá, cờ
  const m = new Model('xe_da'); m.sdfCell = 0.014; m.sdfTris = 2600;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 0.55, 0); m.joint('Bone_Arm', 'Bone_Body', 0, 1.0, -0.2);
  m.joint('Bone_WheelF', 'Bone_Body', 0, 0.3, 0.5); m.joint('Bone_WheelB', 'Bone_Body', 0, 0.3, -0.5);
  const WOOD = '#7a4a26', WOOD2 = '#5a3418', B = { bone: 'Bone_Body', mat: HARD };
  const woodC = (base) => (x, y, z) => hex(new THREE.Color(base).multiplyScalar(0.82 + fbm(x * 4, y * 40, z * 4, 2) * 0.36)); // vân gỗ
  const plank = (w, h, d, o, base) => { const v0 = m.vcount; m.box(w, h, d, { ...B, ...o, color: base }); paint(m, v0, woodC(base), 0.25); };
  // sàn + dầm dọc + dầm ngang
  for (let i = 0; i < 6; i++) plank(0.12, 0.06, 1.3, { at: [-0.31 + i * 0.124, 0.56, 0] }, i % 2 ? WOOD : '#84522c');
  for (const x of [0.4, -0.4]) plank(0.08, 0.12, 1.42, { at: [x, 0.5, 0] }, WOOD2);
  for (const z of [0.62, -0.62, 0]) plank(0.88, 0.08, 0.08, { at: [0, 0.47, z] }, WOOD2);
  // vách hai bên: tấm sơn màu đội, nẹp vàng trên/dưới, đinh tán
  for (const x of [0.41, -0.41]) {
    m.box(0.04, 0.24, 1.12, { ...B, at: [x, 0.71, 0], color: '#ececec', mat: TEAM });
    for (const y of [0.6, 0.83]) m.box(0.05, 0.03, 1.16, { ...B, at: [x * 1.01, y, 0], color: GOLD, mat: METAL });
    for (const z of [-0.45, -0.15, 0.15, 0.45]) m.sphere(0.022, { ...B, at: [x * 1.06, 0.715, z], color: GOLD, mat: METAL });
    m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(STAR(8, 0.09, 0.045).map(([a, c]) => new THREE.Vector2(a, c))), { depth: 0.012, bevelEnabled: false }), { ry: x > 0 ? 90 : -90, at: [x * 1.05, 0.715, 0] }), { bone: 'Bone_Body', color: GOLD, mat: METAL, flat: true }); // sao trống đồng
  }
  // mũi xe: tấm khiên màu đội + đầu rồng vàng mắt sáng màu đội
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(x * 0.3, y * 0.24))), { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), { rx: -18, at: [0, 0.78, 0.66] }), { bone: 'Bone_Body', color: '#ececec', mat: TEAM, flat: true });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(x * 0.335, y * 0.27))), { depth: 0.03, bevelEnabled: false }), { rx: -18, at: [0, 0.78, 0.64] }), { bone: 'Bone_Body', color: GOLD, mat: METAL, flat: true });
  const goldC = (x, y, z) => hex(mixC('#c8902a', '#ffe08a', fbm(x * 12, y * 12, z * 12)));
  const DW = W1('Bone_Body');
  m.blob({ cone: [[0, 0.86, 0.72], [0, 0.92, 0.98], 0.1, 0.075], k: 0.03, mat: METAL, color: goldC, weights: DW });     // đầu rồng
  m.blob({ cone: [[0, 0.88, 0.92], [0, 0.86, 1.12], 0.07, 0.045], k: 0.03, mat: METAL, color: goldC, weights: DW });    // mõm
  m.blob({ ell: [[0, 0.82, 1.02], [0.05, 0.025, 0.08]], k: 0.02, mat: METAL, color: goldC, weights: DW });              // hàm
  m.blob({ ell: [[0.05, 0.97, 0.94], [0.03, 0.025, 0.04]], k: 0.015, mat: METAL, color: goldC, weights: DW, mirror: true }); // gờ mắt
  m.sphere(0.024, { ...B, at: [0.06, 0.95, 0.99], color: '#ffffff', mat: TEAMGLOW, mirror: true });
  addK(m, tubeGeo([[0.04, 1.0, 0.9], [0.08, 1.08, 0.82], [0.1, 1.13, 0.7]], (t) => 0.022 * (1 - t) + 0.004, { radial: 6, segs: 6 }), { bone: 'Bone_Body', mirror: true }, () => ['#fff0c8', HARD]); // sừng rồng
  for (let i = 0; i < 4; i++) addK(m, leafGeo(0.07, 0.16, { bend: -0.2, nv: 4 }), { bone: 'Bone_Body', at: [0, 0.96 - i * 0.01, 0.9 - i * 0.07], rot: frame([0, 0.6, -1], [1, 0, 0]) }, (u, v) => [hex(mixC('#ffffff', '#d0d0d0', v)), TEAMCLOTH]); // bờm vây màu đội
  // bánh xe: vành gỗ + đai sắt có đinh, 8 nan, trục vàng
  for (const [z, bone] of [[0.5, 'Bone_WheelF'], [-0.5, 'Bone_WheelB']]) {
    for (const x of [0.5, -0.5]) {
      m.add(place(new THREE.TorusGeometry(0.25, 0.045, 6, 22), { ry: 90, at: [x, 0.3, z] }), { bone, color: WOOD2, mat: HARD });
      m.add(place(new THREE.TorusGeometry(0.29, 0.018, 4, 22), { ry: 90, at: [x, 0.3, z] }), { bone, color: '#5a5e66', mat: METAL });
      for (let i = 0; i < 8; i++) m.add(place(new THREE.BoxGeometry(0.03, 0.46, 0.04), { rx: i * 22.5, at: [x, 0.3, z] }), { bone, color: WOOD, mat: HARD, flat: true });
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; m.sphere(0.016, { bone, at: [x * 1.03, 0.3 + Math.cos(a) * 0.29, z + Math.sin(a) * 0.29], color: '#8a8e96', mat: METAL }); }
      m.cyl(0.07, 0.07, 0.1, { bone, at: [x, 0.3, z], rot: [0, 0, 90], color: GOLD, mat: METAL, seg: 10 });
    }
    m.cyl(0.03, 0.03, 1.0, { bone, at: [0, 0.3, z], rot: [0, 0, 90], color: '#3a2414', mat: HARD });
  }
  // giá chữ A hai bên + xà ngang trục cần ném
  for (const x of [0.22, -0.22]) for (const dz of [0.22, -0.22]) m.add(place(new THREE.BoxGeometry(0.07, 0.52, 0.07), { rx: dz > 0 ? -22 : 22, at: [x, 0.83, -0.2 + dz * 0.45] }), { bone: 'Bone_Body', color: WOOD2, mat: HARD, flat: true });
  m.cyl(0.045, 0.045, 0.56, { ...B, at: [0, 1.0, -0.2], rot: [0, 0, 90], color: GOLD, mat: METAL, seg: 10 });
  // cần ném (xương Bone_Arm): đòn gỗ đai sắt, gàu đá phía trước, đối trọng sắt phía sau có sao vàng
  m.box(0.09, 0.09, 1.25, { bone: 'Bone_Arm', at: [0, 1.12, 0.25], rot: [-14, 0, 0], color: WOOD, mat: HARD });
  for (const t of [0.0, 0.45]) m.box(0.11, 0.11, 0.04, { bone: 'Bone_Arm', at: [0, 1.06 + t * 0.25, 0.0 + t * 1.0], rot: [-14, 0, 0], color: '#5a5e66', mat: METAL });
  m.add(place(new THREE.LatheGeometry([[0.0, -0.08], [0.15, -0.07], [0.21, 0.02], [0.23, 0.08], [0.2, 0.08], [0.17, 0.0], [0.0, -0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 14), { at: [0, 1.3, 0.85] }), { bone: 'Bone_Arm', color: WOOD2, mat: HARD });
  { const v0 = m.vcount; m.add(rockGeo(5, 1, 0.16), { bone: 'Bone_Arm', at: [0, 1.4, 0.85], scale: [0.17, 0.14, 0.16], mat: HARD, flat: true }); paint(m, v0, (x, y, z) => hex(mixC('#6e6a64', '#a8a298', fbm(x * 9, y * 9, z * 9))), 0.3); }
  m.box(0.3, 0.24, 0.2, { bone: 'Bone_Arm', at: [0, 0.86, -0.42], rot: [-14, 0, 0], color: '#4a4e56', mat: METAL });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(STAR(8, 0.08, 0.04).map(([a, c]) => new THREE.Vector2(a, c))), { depth: 0.01, bevelEnabled: false }), { rx: -14, ry: 180, at: [0, 0.86, -0.525] }), { bone: 'Bone_Arm', color: GOLD, mat: METAL, flat: true });
  // sọt đá sau xe
  plank(0.34, 0.16, 0.26, { at: [-0.18, 0.67, -0.5] }, WOOD2);
  for (const [x, z, r, sd] of [[-0.24, -0.46, 0.08, 1], [-0.12, -0.54, 0.07, 2], [-0.17, -0.44, 0.065, 3]]) { const v0 = m.vcount; m.add(rockGeo(sd, 0, 0.2), { ...B, at: [x, 0.78, z], scale: [r, r * 0.85, r], flat: true }); paint(m, v0, (X, Y, Z) => hex(mixC('#6e6a64', '#a8a298', fbm(X * 9, Y * 9, Z * 9))), 0.3); }
  // đèn lồng màu đội treo hai góc trước
  for (const x of [0.36, -0.36]) {
    m.cyl(0.012, 0.012, 0.36, { ...B, at: [x, 0.98, 0.56], color: WOOD2 });
    m.sphere(0.075, { ...B, at: [x, 1.18, 0.56], radii: [0.075, 0.095, 0.075], color: '#ffffff', mat: TEAMGLOW });
    for (const dy of [0.095, -0.095]) m.cyl(0.04, 0.045, 0.025, { ...B, at: [x, 1.18 + dy, 0.56], color: GOLD, mat: METAL, seg: 10 });
  }
  // cột cờ sau xe: cờ đuôi én màu đội, chóp vàng
  m.cyl(0.022, 0.022, 1.0, { ...B, at: [0.34, 1.15, -0.6], color: WOOD2, mat: HARD });
  m.cone(0.04, 0.1, { ...B, at: [0.34, 1.7, -0.6], color: GOLD, mat: METAL });
  const flag = new THREE.Shape([[0, 0], [0.5, 0], [0.4, -0.17], [0.5, -0.34], [0, -0.34]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const flip of [0, 1]) { const g = new THREE.ShapeGeometry(flag); if (flip) { g.scale(1, 1, -1); g.index && g.setIndex([...g.index.array].reverse()); } g.computeVertexNormals(); m.add(place(g, { ry: 90, at: [0.34, 1.62, -0.62] }), { bone: 'Bone_Body', color: '#e6e6e6', mat: TEAMCLOTH, ao: 0.1 }); }
  return finish(m, 'xe_da');
}

const BUILD = {
  soi_da: () => quadruped('soi_da', 1, { ...wolf(), tris: 15000 }),
  ho_loi: () => quadruped('ho_loi', 1, { ...tiger(), tris: 18000, cell: 0.012, head: 1.3, muzzle: 0.62, leg: 1.35, body: 1.12, roundEar: true }),
  coc_reu: toad, hoa_nham: golem, linh_thuy: spirit, long_ngu: carp, than_dieu: bird, ta_than: demon,
  linh_kiem: swordsman, linh_cung: archer, linh_den: giant, xe_da: siege,
};
const only = process.argv.slice(2);
fs.mkdirSync(outRoot, { recursive: true });
for (const [id, fn] of Object.entries(BUILD)) {
  if (only.length && !only.includes(id)) continue;
  const t0 = Date.now(), built = fn();
  pack(built.mesh.geometry);
  const scene = new THREE.Scene(); for (const c of built.root.children.slice()) scene.add(c);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false });
  fs.writeFileSync(path.join(outRoot, `${id}.glb`), Buffer.from(glb));
  console.log(`${id.padEnd(10)} tris ${String(built.tris).padStart(6)}  verts ${String(built.verts).padStart(6)}  bones ${String(built.bones.length).padStart(3)}  ${String(Math.round(glb.byteLength / 1024)).padStart(5)} KB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
