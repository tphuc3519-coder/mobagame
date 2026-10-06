// Sinh model quái rừng + mục tiêu lớn: assets/monsters/<id>.glb (thân liền khối SDF có xương, màu tô theo đỉnh + AO khe).
// Không có clip: game tự xoay xương theo thời gian (src/render/monsters.js). Đơn vị mét, mặt nhìn +Z, bên trái nhân vật ở +X.
// _mat của đỉnh: 0 lông, 1 da trơn, 2 đá/giáp/vảy cứng, 3 vảy cá, 5 phát sáng (shader quái dựa vào đây để vẽ sợi lông, vảy…).
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
const FUR = 0, SKIN = 1, HARD = 2, SCALE = 3, GLOW = 5;

// —— nhiễu giá trị 3D (tô màu lông/da) ——
const hash = (x, y, z) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); n = Math.imul(n ^ (n >>> 13), 1103515245); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const sm = (t) => t * t * (3 - 2 * t);
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

function finish(m, id) {
  m.userData = { name: id };
  return m.build();
}

// ———————————————————— THÚ BỐN CHÂN (sói, hổ) ————————————————————
/** S: tỉ lệ (alpha sói = 1). P: { fur(x,y,z, region) → hex, extra(m, J) } */
function quadruped(id, S, P) {
  const m = new Model(id); m.sdfCell = 0.016 * S; m.sdfTris = P.tris || 11000;
  const s = (v) => v.map((q) => q * S), hd = P.head || 1, lg = P.leg || 1, bd = P.body || 1, mz = P.muzzle || 1;
  const sh = (v) => s(v).map((q) => q * hd), sb = (v) => s(v).map((q) => q * bd);
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
  const torsoW = segWeights('Bone_Hips', 'Bone_Chest', s([0, 1, -0.7]), s([0, 1.1, 0.6]), 0.15, 0.85, 0, 1);
  const torsoW3 = (x, y, z) => { const t = (z / S + 0.7) / 1.3; return t < 0.5 ? segWeights('Bone_Hips', 'Bone_Spine', s([0, 1, -0.7]), s([0, 1, 0]), 0.3, 1, 0, 1)(x, y, z) : segWeights('Bone_Spine', 'Bone_Chest', s([0, 1, 0]), s([0, 1.1, 0.6]), 0, 0.7, 0, 1)(x, y, z); };
  void torsoW;
  const T = (o) => m.blob({ mat: FUR, weights: torsoW3, color: fur('body'), ...o });
  // thân: ngực sâu, eo thon, mông gọn
  T({ ell: [s([0, 1.1, 0.42]), sb([0.37, 0.44, 0.52])], k: 0.1 * S });
  T({ ell: [s([0, 1.05, -0.1]), sb([0.31, 0.33, 0.5]), [-4, 0, 0]], k: 0.16 * S });
  T({ ell: [s([0, 1.05, -0.6]), sb([0.31, 0.34, 0.36])], k: 0.14 * S });
  T({ ell: [s([0, 0.86, 0.36]), sb([0.24, 0.24, 0.36])], k: 0.12 * S, color: fur('belly') });       // ức xuống bụng
  // bờm/cổ lông
  m.blob({ ell: [s([0, 1.27, 0.7]), sb([0.4, 0.42, 0.34]), [20, 0, 0]], k: 0.12 * S, mat: FUR, color: fur('mane'), weights: segWeights('Bone_Chest', 'Bone_Neck', s([0, 1.1, 0.5]), s([0, 1.3, 0.85]), 0.3, 0.9, 0, 1) });
  m.blob({ cone: [s([0, 1.26, 0.8]), s([0, 1.44, 1.02]), 0.26 * S, 0.2 * S], k: 0.08 * S, mat: FUR, color: fur('mane'), weights: segWeights('Bone_Neck', 'Bone_Head', s([0, 1.28, 0.78]), s([0, 1.46, 1.05]), 0.4, 1, 0, 1) });
  // đầu: sọ, má, mõm, hàm dưới, mũi, tai
  const HW = W1('Bone_Head');
  m.blob({ ell: [s([0, 1.5, 1.08]), sh([0.23, 0.215, 0.24])], k: 0.06 * S, mat: FUR, color: fur('head'), weights: HW });
  m.blob({ ell: [s([0.12, 1.43, 1.14]), sh([0.12, 0.12, 0.13])], k: 0.06 * S, mat: FUR, color: fur('cheek'), weights: HW, mirror: true });
  m.blob({ cone: [s([0, 1.46, 1.24]), s([0, 1.42, 1.24 + 0.28 * mz]), 0.125 * S * hd, 0.07 * S * hd * (1.6 - mz * 0.6)], k: 0.05 * S, mat: FUR, color: fur('muzzle'), weights: HW });
  m.blob({ cone: [s([0, 1.36, 1.2]), s([0, 1.34, 1.2 + 0.24 * mz]), 0.09 * S * hd, 0.05 * S * hd], k: 0.035 * S, mat: FUR, color: fur('jaw'), weights: W1('Bone_Jaw') });
  m.blob({ ell: [s([0, 1.455, 1.24 + 0.315 * mz]), s([0.048, 0.036, 0.038])], k: 0.015 * S, mat: SKIN, color: '#151214', weights: HW });   // mũi
  m.blob({ cone: [s([0.13 * hd, 1.62 + 0.03 * hd, 1.0]), s([0.16 * hd, 1.62 + (P.roundEar ? 0.12 : 0.24) * hd, 0.97]), (P.roundEar ? 0.085 : 0.075) * S * hd, (P.roundEar ? 0.06 : 0.014) * S * hd], k: 0.03 * S, mat: FUR, color: fur('ear'), weights: HW, mirror: true });
  m.blob({ ell: [s([0.085, 1.54, 1.25]), s([0.034, 0.022, 0.024]), [0, -25, 0]], k: 0.01 * S, mat: GLOW, color: P.eye || '#ffb030', weights: HW, mirror: true }); // mắt
  // chân trước: vai to → cẳng thon → bàn chân
  const fu = segWeights('Bone_FUpperL', 'Bone_FLowerL', s(F.sh), s(F.el), 0.7, 1, 0, 1), fl = segWeights('Bone_FLowerL', 'Bone_FPawL', s(F.el), s(F.pw), 0.75, 1, 0, 1);
  m.blob({ ell: [s(lerp3(F.sh, F.el, 0.25)), s([0.17 * lg, 0.27, 0.2 * lg])], k: 0.07 * S, mat: FUR, color: fur('leg'), weights: segWeights('Bone_Chest', 'Bone_FUpperL', s([0.2, 1.1, 0.5]), s(F.el), 0.1, 0.5, 0, 1), mirror: true });
  m.blob({ cone: [s(F.sh), s(F.el), 0.15 * S * lg, 0.095 * S * lg], k: 0.04 * S, mat: FUR, color: fur('leg'), weights: fu, mirror: true });
  m.blob({ cone: [s(F.el), s(F.pw), 0.088 * S * lg, 0.068 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: fl, mirror: true });
  m.blob({ ell: [s([F.pw[0], 0.07, F.pw[2] + 0.06]), s([0.095 * lg, 0.07, 0.14 * lg])], k: 0.03 * S, mat: FUR, color: fur('paw'), weights: W1('Bone_FPawL'), mirror: true });
  // chân sau: đùi to, khuỷu ngược, cổ chân dài
  const bu = segWeights('Bone_BUpperL', 'Bone_BLowerL', s(B.hp), s(B.kn), 0.7, 1, 0, 1), bl = segWeights('Bone_BLowerL', 'Bone_BHockL', s(B.kn), s(B.hk), 0.7, 1, 0, 1), bh = segWeights('Bone_BHockL', 'Bone_BPawL', s(B.hk), s(B.pw), 0.7, 1, 0, 1);
  m.blob({ ell: [s(lerp3(B.hp, B.kn, 0.3)), s([0.19 * lg, 0.32, 0.26 * lg]), [15, 0, 0]], k: 0.08 * S, mat: FUR, color: fur('leg'), weights: segWeights('Bone_Hips', 'Bone_BUpperL', s([0.2, 1.0, -0.6]), s(B.kn), 0.1, 0.5, 0, 1), mirror: true });
  m.blob({ cone: [s(B.kn), s(B.hk), 0.11 * S * lg, 0.075 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: bl, mirror: true });
  m.blob({ cone: [s(B.hk), s(B.pw), 0.075 * S * lg, 0.062 * S * lg], k: 0.03 * S, mat: FUR, color: fur('lowleg'), weights: bh, mirror: true });
  m.blob({ ell: [s([B.pw[0], 0.07, B.pw[2] + 0.06]), s([0.09 * lg, 0.065, 0.135 * lg])], k: 0.03 * S, mat: FUR, color: fur('paw'), weights: W1('Bone_BPawL'), mirror: true });
  void bu;
  // đuôi rậm
  m.blob({ cone: [s([0, 1.1, -0.9]), s([0, 0.98, -1.4]), 0.1 * S, 0.15 * S], k: 0.06 * S, mat: FUR, color: fur('tail'), weights: segWeights('Bone_Tail1', 'Bone_Tail2', s([0, 1.12, -0.98]), s([0, 0.98, -1.42]), 0.4, 1, 0, 1) });
  m.blob({ cone: [s([0, 0.98, -1.4]), s([0, 0.8, -1.82]), 0.15 * S, 0.04 * S], k: 0.05 * S, mat: FUR, color: fur('tailtip'), weights: W1('Bone_Tail2') });
  P.extra?.(m, s, S);
  return finish(m, id);
}

// —— Sói Đá: lông xám lam, lưng sẫm, bụng nhạt, giáp đá rêu trên vai/lưng, gai pha lê ——
function wolf() {
  const fur = (x, y, z, r) => {
    const n = fbm(x * 9, y * 9, z * 9), streak = fbm(x * 30, y * 6, z * 30, 2), back = clamp((y - 1.05) / 0.35);
    let c = mixC('#8a909c', '#3c424e', back * 0.85 + (n - 0.5) * 0.4);
    if (r === 'belly' || (r === 'body' && y < 0.85)) c = mixC(c, '#cfcabd', clamp((0.95 - y) / 0.3) * 0.8);
    if (r === 'lowleg') c = mixC(c, '#6a6e76', 0.5);
    if (r === 'muzzle' || r === 'jaw' || r === 'cheek') c = mixC(c, '#d8d2c4', r === 'cheek' ? 0.45 : 0.7);
    if (r === 'ear' || r === 'tailtip' || r === 'paw') c = mixC(c, '#24262c', r === 'paw' ? 0.5 : 0.65);
    if (r === 'mane') c = mixC(c, '#5c6270', 0.35 + (n - 0.5) * 0.5);
    c.multiplyScalar(0.86 + streak * 0.28);
    return hex(c);
  };
  const extra = (m, s, S) => {
    const stone = (x, y, z) => hex(mixC('#6e6a62', '#4f7a3a', clamp((fbm(x * 6 / S, y * 6 / S, z * 6 / S) - 0.45) * 3) * clamp((y / S - 1.2) * 6)).multiplyScalar(0.8 + fbm(x * 20, y * 20, z * 20, 2) * 0.35));
    // giáp đá trên vai và lưng (mảng đá liền thân)
    m.blob({ ell: [s([0, 1.4, 0.4]), s([0.3, 0.12, 0.3]), [-8, 0, 0]], k: 0.05 * S, mat: HARD, color: stone, weights: W1('Bone_Chest') });
    m.blob({ ell: [s([0, 1.34, -0.12]), s([0.24, 0.1, 0.28])], k: 0.05 * S, mat: HARD, color: stone, weights: W1('Bone_Spine') });
    m.blob({ ell: [s([0, 1.3, -0.58]), s([0.22, 0.1, 0.22])], k: 0.05 * S, mat: HARD, color: stone, weights: W1('Bone_Hips') });
    // gai pha lê ngọc phát sáng trên lưng
    const cr = '#7af0e0';
    for (const [z, h, b] of [[0.45, 0.32, 'Bone_Chest'], [0.2, 0.26, 'Bone_Chest'], [-0.1, 0.22, 'Bone_Spine'], [-0.38, 0.18, 'Bone_Hips']]) {
      m.cone(0.055 * S, h * S, { bone: b, at: s([0, 1.48 + h / 2 - 0.04, z]), rot: [-22, 0, 0], color: cr, glow: true, seg: 5 });
      m.cone(0.035 * S, h * 0.6 * S, { bone: b, at: s([0.09, 1.44 + h * 0.3 - 0.04, z - 0.03]), rot: [-18, 0, -28], color: cr, glow: true, seg: 5 });
      m.cone(0.035 * S, h * 0.6 * S, { bone: b, at: s([-0.09, 1.44 + h * 0.3 - 0.04, z - 0.03]), rot: [-18, 0, 28], color: cr, glow: true, seg: 5 });
    }
    // răng nanh
    for (const sd of [-1, 1]) m.cone(0.012 * S, 0.06 * S, { bone: 'Bone_Jaw', at: s([sd * 0.035, 1.39, 1.4]), rot: [0, 0, 0], color: '#f4efe0', seg: 5 });
  };
  return { fur, extra, eye: '#ffb02a' };
}

// —— Hổ Lôi: hổ to, lông cam vằn đen, bụng trắng, bờm sấm xanh phát sáng ——
function tiger() {
  const fur = (x, y, z, r) => {
    const n = fbm(x * 7, y * 7, z * 7), streak = fbm(x * 28, y * 5, z * 28, 2);
    let c = mixC('#e8862a', '#b4501a', clamp((y - 1.0) / 0.4) * 0.6 + (n - 0.5) * 0.3);
    const belly = (r === 'body' || r === 'belly' ? clamp((0.98 - y) / 0.28) : r === 'paw' ? 0.55 : 0) + (r === 'belly' ? 0.5 : 0) + (r === 'muzzle' || r === 'jaw' ? 0.9 : 0) + (r === 'cheek' ? 0.6 : 0);
    c = mixC(c, '#f4ead8', clamp(belly));
    // vằn: dải tối theo chiều dọc thân, nhiễu làm méo
    const w = Math.sin(z * 15 + fbm(x * 3, y * 4, z * 3) * 6 + Math.abs(x) * 6) * (r === 'head' || r === 'cheek' ? Math.sin(y * 40 + x * 30) : 1);
    if (w > 0.55 && r !== 'muzzle' && r !== 'jaw' && r !== 'paw') c = mixC(c, '#1a1210', clamp((w - 0.55) * 4) * (belly > 0.7 ? 0.3 : 0.95));
    if (r === 'ear') c = mixC(c, '#20140e', 0.6);
    if (r === 'tail' || r === 'tailtip') { const tw = Math.sin(z * 22); if (tw > 0.4) c = mixC(c, '#140c08', 0.9); }
    c.multiplyScalar(0.88 + streak * 0.24);
    return hex(c);
  };
  const extra = (m, s, S) => {
    // bờm sấm: lông bờm dày + tia sét pha lê xanh
    const mane = (x, y, z) => hex(mixC('#f0e6d0', '#7ac8ff', clamp((fbm(x * 8, y * 8, z * 8) - 0.4) * 2)).multiplyScalar(0.85 + fbm(x * 30, y * 30, z * 30, 2) * 0.3));
    m.blob({ ell: [s([0, 1.4, 0.82]), s([0.36, 0.34, 0.24]), [30, 0, 0]], k: 0.1 * S, mat: FUR, color: mane, weights: segWeights('Bone_Chest', 'Bone_Neck', s([0, 1.1, 0.5]), s([0, 1.3, 0.85]), 0.3, 0.9, 0, 1) });
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + i * 0.3, x = Math.sin(a) * 0.3, y = 1.5 + Math.cos(a) * 0.18;
      m.cone(0.04 * S, (0.32 + (i % 2) * 0.12) * S, { bone: 'Bone_Neck', at: s([x, y + 0.08, 0.74]), rot: [-45, 0, -a * 57], color: '#9ae4ff', glow: true, seg: 5 });
    }
    for (const sd of [-1, 1]) {
      m.cone(0.018 * S, 0.12 * S, { bone: 'Bone_Jaw', at: s([sd * 0.04, 1.33, 1.38]), rot: [180, 0, 0], color: '#fbf6e8', seg: 5 }); // nanh
      for (let k = 0; k < 3; k++) m.cyl(0.003 * S, 0.004 * S, 0.22 * S, { bone: 'Bone_Head', at: s([sd * (0.15 + k * 0.01), 1.42 - k * 0.02, 1.38]), rot: [0, 0, sd * (80 + k * 8)], color: '#f8f4ea', seg: 4 }); // ria
    }
    // vân sét trên trán
    m.blob({ ell: [s([0, 1.62, 1.12]), s([0.03, 0.02, 0.08])], k: 0.01 * S, mat: GLOW, color: '#9ae4ff', weights: W1('Bone_Head') });
  };
  return { fur, extra, eye: '#7ae8ff' };
}

// ———————————————————— CÓC RÊU ————————————————————
function toad() {
  const m = new Model('coc_reu'); m.sdfCell = 0.018; m.sdfTris = 11000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 0.6, 0); m.joint('Bone_Head', 'Bone_Body', 0, 0.75, 0.5); m.joint('Bone_Jaw', 'Bone_Head', 0, 0.55, 0.62);
  m.jointLR('Bone_FUpperL', 'Bone_Body', 0.42, 0.5, 0.42); m.jointLR('Bone_FLowerL', 'Bone_FUpperL', 0.55, 0.22, 0.6);
  m.jointLR('Bone_BUpperL', 'Bone_Body', 0.45, 0.45, -0.35); m.jointLR('Bone_BLowerL', 'Bone_BUpperL', 0.78, 0.2, -0.1); m.jointLR('Bone_BFootL', 'Bone_BLowerL', 0.6, 0.05, 0.2);
  const skin = (x, y, z) => {
    const n = fbm(x * 5, y * 5, z * 5), sp = fbm(x * 14, y * 14, z * 14, 2), top = clamp((y - 0.6) / 0.45);
    let c = mixC('#7a8a3a', '#3e5a24', top * 0.8 + (n - 0.5) * 0.5);
    if (sp > 0.62) c = mixC(c, '#2a3a18', (sp - 0.62) * 3);                                  // đốm sẫm
    if (y < 0.55 && Math.abs(x) < 0.5) c = mixC(c, '#e0d4a0', clamp((0.6 - y) / 0.25) * 0.85 * clamp((0.5 - Math.abs(x)) * 5)); // bụng vàng nhạt
    const moss = clamp((y - 0.95) * 4) * clamp((fbm(x * 4 + 7, y * 4, z * 4) - 0.42) * 4);  // rêu trên lưng
    c = mixC(c, '#4f8a2a', moss);
    return hex(c.multiplyScalar(0.85 + fbm(x * 30, y * 30, z * 30, 2) * 0.3));
  };
  const BW = (x, y, z) => (z > 0.35 ? [['Bone_Body', 0.4], ['Bone_Head', 0.6]] : [['Bone_Body', 1]]);
  m.blob({ ell: [[0, 0.68, -0.05], [0.72, 0.55, 0.78]], k: 0.12, mat: SKIN, color: skin, weights: BW });
  m.blob({ ell: [[0, 0.72, 0.42], [0.62, 0.38, 0.5]], k: 0.16, mat: SKIN, color: skin, weights: W1('Bone_Head') });                     // đầu bẹt rộng
  m.blob({ ell: [[0, 0.52, 0.55], [0.55, 0.22, 0.45]], k: 0.12, mat: SKIN, color: skin, weights: W1('Bone_Jaw') });                     // hàm dưới
  m.blob({ ell: [[0, 0.45, 0.6], [0.32, 0.12, 0.25]], k: 0.08, mat: SKIN, color: '#d8c894', weights: W1('Bone_Jaw') });                // túi cổ
  m.blob({ ell: [[0.34, 1.0, 0.55], [0.17, 0.16, 0.16]], k: 0.08, mat: SKIN, color: skin, weights: W1('Bone_Head'), mirror: true });     // hốc mắt lồi
  m.blob({ ell: [[0.36, 1.04, 0.62], [0.11, 0.11, 0.1]], k: 0.01, mat: GLOW, color: '#ffd23a', weights: W1('Bone_Head'), mirror: true }); // mắt vàng
  m.blob({ ell: [[0.37, 1.045, 0.715], [0.025, 0.07, 0.02]], k: 0.005, mat: SKIN, color: '#120c04', weights: W1('Bone_Head'), mirror: true }); // con ngươi dọc
  m.blob({ cone: [[0.6, 0.62, 0.1], [0.62, 0.62, 0.62], 0.06, 0.05], sub: true, k: 0.03, color: '#000', weights: W1('Bone_Head') });   // khoé miệng
  // nốt sần
  for (let i = 0; i < 28; i++) { const a = hash(i, 1, 2) * Math.PI * 2, b = hash(i, 3, 4) * 1.2 - 0.1, r = 0.04 + hash(i, 5, 6) * 0.05; const x = Math.cos(a) * 0.62 * Math.cos(b), y = 0.68 + Math.sin(b) * 0.5, z = -0.05 + Math.sin(a) * 0.7 * Math.cos(b); if (y < 0.75) continue; m.blob({ ell: [[x, y, z], [r, r * 0.8, r]], k: 0.04, mat: SKIN, color: skin, weights: W1('Bone_Body') }); }
  // chân trước + chân sau gập
  m.blob({ cone: [[0.42, 0.55, 0.38], [0.55, 0.22, 0.6], 0.13, 0.08], k: 0.06, mat: SKIN, color: skin, weights: segWeights('Bone_FUpperL', 'Bone_FLowerL', [0.42, 0.55, 0.38], [0.55, 0.22, 0.6], 0.6, 1, 0, 1), mirror: true });
  m.blob({ cone: [[0.55, 0.22, 0.6], [0.6, 0.05, 0.75], 0.08, 0.06], k: 0.04, mat: SKIN, color: skin, weights: W1('Bone_FLowerL'), mirror: true });
  for (const d of [-0.5, 0, 0.5]) m.blob({ cone: [[0.6, 0.05, 0.75], [0.6 + d * 0.12, 0.03, 0.9], 0.04, 0.03], k: 0.02, mat: SKIN, color: skin, weights: W1('Bone_FLowerL'), mirror: true });
  m.blob({ ell: [[0.6, 0.45, -0.25], [0.26, 0.32, 0.42], [0, 0, -20]], k: 0.12, mat: SKIN, color: skin, weights: W1('Bone_BUpperL'), mirror: true });   // đùi sau to
  m.blob({ cone: [[0.78, 0.2, -0.1], [0.62, 0.05, 0.2], 0.1, 0.07], k: 0.05, mat: SKIN, color: skin, weights: W1('Bone_BLowerL'), mirror: true });
  for (const d of [-0.6, 0, 0.6]) m.blob({ cone: [[0.62, 0.05, 0.2], [0.62 + d * 0.16, 0.03, 0.42], 0.05, 0.035], k: 0.03, mat: SKIN, color: skin, weights: W1('Bone_BFootL'), mirror: true });
  // nấm phát sáng + cỏ trên lưng
  const shroom = (x, z, h, r, c) => { m.cyl(r * 0.25, r * 0.3, h, { bone: 'Bone_Body', at: [x, 1.12 + h / 2 - (Math.abs(x) + Math.abs(z)) * 0.18, z], color: '#efe4c8', seg: 6 }); m.sphere(r, { bone: 'Bone_Body', at: [x, 1.12 + h - (Math.abs(x) + Math.abs(z)) * 0.18, z], radii: [r, r * 0.55, r], color: c, glow: true }); };
  shroom(0.15, -0.2, 0.22, 0.12, '#ff7a4a'); shroom(-0.2, 0.05, 0.16, 0.09, '#ffb24a'); shroom(0.05, 0.25, 0.12, 0.07, '#ff5a3a'); shroom(-0.12, -0.42, 0.14, 0.08, '#7ae8a0');
  return finish(m, 'coc_reu');
}

// ———————————————————— HOẢ NHAM (người đá nham thạch) ————————————————————
function golem() {
  const m = new Model('hoa_nham'); m.sdfCell = 0.03; m.sdfTris = 12000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Hips', 'Bone_Root', 0, 1.1, 0); m.joint('Bone_Chest', 'Bone_Hips', 0, 1.9, 0.05); m.joint('Bone_Head', 'Bone_Chest', 0, 2.75, 0.35);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 0.95, 2.45, 0.05); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 1.25, 1.55, 0.25); m.jointLR('Bone_HandL', 'Bone_ArmLL', 1.3, 0.75, 0.45);
  m.jointLR('Bone_LegUL', 'Bone_Hips', 0.42, 1.1, 0); m.jointLR('Bone_LegLL', 'Bone_LegUL', 0.5, 0.55, 0.08); m.jointLR('Bone_FootL', 'Bone_LegLL', 0.52, 0.08, 0.15);
  // đá đen nứt, khe nứt rực lửa (khe = chỗ lõm giữa các khối → AO thấp; tô đỏ cam + vật liệu phát sáng ở vân nứt)
  const crack = (x, y, z) => { const n = fbm(x * 2.2, y * 2.2, z * 2.2, 3); return Math.abs(n - 0.5) < 0.035; };
  const rockC = (x, y, z) => { const n = fbm(x * 3, y * 3, z * 3), d = fbm(x * 12, y * 12, z * 12, 2); if (crack(x, y, z)) return '#ff6a12'; let c = mixC('#2a2420', '#5a4c42', n * 0.9 + d * 0.3); if (y > 2.2) c = mixC(c, '#6a5a4c', 0.25); return hex(c); };
  const rockM = (x, y, z) => (crack(x, y, z) ? GLOW : HARD);
  const R = (o) => m.blob({ mat: rockM, color: rockC, ...o });
  R({ ell: [[0, 2.05, 0.05], [0.95, 0.75, 0.68]], k: 0.18, weights: W1('Bone_Chest') });                                          // ngực vai đồ sộ
  R({ ell: [[0, 1.35, 0], [0.62, 0.5, 0.5]], k: 0.2, weights: segWeights('Bone_Hips', 'Bone_Chest', [0, 1.1, 0], [0, 1.9, 0], 0.3, 0.9, 0, 1) });
  R({ ell: [[0, 2.72, 0.42], [0.3, 0.28, 0.3]], k: 0.12, weights: W1('Bone_Head') });                                                // đầu nhỏ thụt giữa vai
  R({ ell: [[0, 2.62, 0.62], [0.25, 0.12, 0.16]], k: 0.08, weights: W1('Bone_Head') });                                               // hàm
  m.blob({ ell: [[0.12, 2.76, 0.66], [0.06, 0.035, 0.03]], k: 0.01, mat: GLOW, color: '#ffd04a', weights: W1('Bone_Head'), mirror: true }); // mắt lửa
  m.blob({ ell: [[0, 2.0, 0.66], [0.26, 0.26, 0.12]], k: 0.05, mat: GLOW, color: '#ff8a1a', weights: W1('Bone_Chest') });            // lõi dung nham trên ngực
  for (const sd of [1]) {
    R({ ell: [[0.95 * sd, 2.5, 0.05], [0.42, 0.4, 0.42]], k: 0.12, weights: W1('Bone_ArmUL'), mirror: true });                        // vai
    R({ cone: [[0.95, 2.45, 0.05], [1.25, 1.55, 0.25], 0.32, 0.26], k: 0.1, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', [0.95, 2.45, 0.05], [1.25, 1.55, 0.25], 0.75, 1, 0, 1), mirror: true });
    R({ cone: [[1.25, 1.55, 0.25], [1.3, 0.85, 0.45], 0.3, 0.36], k: 0.1, weights: W1('Bone_ArmLL'), mirror: true });
    R({ ell: [[1.3, 0.7, 0.5], [0.38, 0.34, 0.38]], k: 0.08, weights: W1('Bone_HandL'), mirror: true });                               // nắm đấm đá
    R({ cone: [[0.42, 1.1, 0], [0.5, 0.55, 0.08], 0.32, 0.26], k: 0.1, weights: segWeights('Bone_LegUL', 'Bone_LegLL', [0.42, 1.1, 0], [0.5, 0.55, 0.08], 0.7, 1, 0, 1), mirror: true });
    R({ cone: [[0.5, 0.55, 0.08], [0.52, 0.12, 0.12], 0.26, 0.3], k: 0.08, weights: W1('Bone_LegLL'), mirror: true });
    R({ ell: [[0.52, 0.1, 0.22], [0.3, 0.12, 0.38]], k: 0.06, weights: W1('Bone_FootL'), mirror: true });
  }
  // gờ đá nhô trên vai/lưng
  for (let i = 0; i < 10; i++) { const a = hash(i, 9, 1) * Math.PI - Math.PI / 2, y = 2.3 + hash(i, 2, 8) * 0.5; R({ ell: [[Math.sin(a) * 0.8, y + 0.15, -0.25 + Math.cos(a) * 0.2], [0.22, 0.28, 0.2], [hash(i, 4, 4) * 40, hash(i, 5, 5) * 90, hash(i, 6, 6) * 40]], k: 0.08, weights: W1('Bone_Chest') }); }
  return finish(m, 'hoa_nham');
}

// ———————————————————— LINH THUỶ (tinh linh nước, mặt nạ đá) ————————————————————
function spirit() {
  const m = new Model('linh_thuy'); m.sdfCell = 0.022; m.sdfTris = 10000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 1.0, 0); m.joint('Bone_Chest', 'Bone_Body', 0, 1.7, 0); m.joint('Bone_Head', 'Bone_Chest', 0, 2.3, 0.1);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 0.5, 1.95, 0); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 0.9, 1.5, 0.2); m.jointLR('Bone_HandL', 'Bone_ArmLL', 1.0, 1.1, 0.4);
  const water = (x, y, z) => { const n = fbm(x * 3, y * 3 - 0.0, z * 3), f = fbm(x * 9, y * 2, z * 9, 2); let c = mixC('#0c4a8a', '#3ab8f0', n * 0.8 + clamp((y - 0.6) / 1.8) * 0.4); if (f > 0.62) c = mixC(c, '#d8f8ff', (f - 0.62) * 2.5); return hex(c); };
  const V = (o) => m.blob({ mat: SKIN, color: water, ...o });
  V({ loft: [{ y: 0.15, rx: 0.06, rz: 0.06, cz: -0.3 }, { y: 0.5, rx: 0.3, rz: 0.28, cz: -0.12 }, { y: 1.0, rx: 0.46, rz: 0.4 }, { y: 1.6, rx: 0.58, rz: 0.46 }, { y: 2.05, rx: 0.48, rz: 0.38 }], k: 0.12, weights: (x, y, z) => (y < 1.2 ? [['Bone_Body', 1]] : y < 1.6 ? [['Bone_Body', 0.5], ['Bone_Chest', 0.5]] : [['Bone_Chest', 1]]) });
  V({ ell: [[0, 2.3, 0.08], [0.3, 0.32, 0.3]], k: 0.12, weights: W1('Bone_Head') });
  // mặt nạ đá cổ
  const maskC = (x, y, z) => hex(mixC('#8a8478', '#c8bea8', fbm(x * 8, y * 8, z * 8)).multiplyScalar(0.85 + fbm(x * 30, y * 30, z * 30, 2) * 0.3));
  m.blob({ ell: [[0, 2.3, 0.3], [0.24, 0.28, 0.1]], k: 0.03, mat: HARD, color: maskC, weights: W1('Bone_Head') });
  m.blob({ ell: [[0.09, 2.36, 0.4], [0.05, 0.03, 0.02]], k: 0.005, mat: GLOW, color: '#bff8ff', weights: W1('Bone_Head'), mirror: true });
  m.blob({ cone: [[0.16, 2.5, 0.3], [0.32, 2.8, 0.15], 0.06, 0.015], k: 0.03, mat: HARD, color: maskC, weights: W1('Bone_Head'), mirror: true }); // sừng mặt nạ
  V({ cone: [[0.5, 1.95, 0], [0.9, 1.5, 0.2], 0.17, 0.13], k: 0.1, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', [0.5, 1.95, 0], [0.9, 1.5, 0.2], 0.7, 1, 0, 1), mirror: true });
  V({ cone: [[0.9, 1.5, 0.2], [1.0, 1.1, 0.4], 0.13, 0.17], k: 0.08, weights: W1('Bone_ArmLL'), mirror: true });
  V({ ell: [[1.02, 1.0, 0.45], [0.16, 0.18, 0.16]], k: 0.06, weights: W1('Bone_HandL'), mirror: true });
  m.blob({ ell: [[0, 1.6, 0.18], [0.2, 0.2, 0.2]], k: 0.05, mat: GLOW, color: '#bff4ff', weights: W1('Bone_Chest') }); // lõi sáng trong thân
  // vòng đá chạm khắc quanh eo
  m.blob({ ell: [[0, 1.25, 0], [0.5, 0.08, 0.44]], k: 0.03, mat: HARD, color: maskC, weights: W1('Bone_Body') });
  return finish(m, 'linh_thuy');
}

// ———————————————————— LONG NGƯ (cá chép vàng hoá rồng) ————————————————————
function carp() {
  const m = new Model('long_ngu'); m.sdfCell = 0.035; m.sdfTris = 12000;
  // xương sống: 7 đốt từ đầu (z+) ra đuôi (z−), thân dựng cong do game uốn
  const N = 7, L = 5.2, zs = (i) => 1.9 - (i / (N - 1)) * L;
  m.joint('Bone_Root', null, 0, 0, 0);
  for (let i = 0; i < N; i++) m.joint(`Bone_S${i}`, i ? `Bone_S${i - 1}` : 'Bone_Root', 0, 1.5, zs(i));
  m.joint('Bone_Jaw', 'Bone_S0', 0, 1.3, 2.3);
  const rAt = (t) => 0.62 * Math.sin(Math.PI * (0.18 + 0.82 * (1 - t)) * 0.62 + 0.3) * (1 - t * 0.55);
  const scale = (x, y, z) => {
    const t = (1.9 - z) / L, n = fbm(x * 3, y * 3, z * 3);
    // vảy: lưới lệch hàng theo z và góc quanh thân
    const ang = Math.atan2(y - 1.5, x), u = z * 5.5, v = ang * 3.2 + (Math.floor(u) % 2) * 0.5, fu = u - Math.floor(u), fv = v - Math.floor(v);
    const edge = clamp(1 - Math.hypot(fu - 0.2, (fv - 0.5) * 1.4) * 1.6);
    let c = mixC('#f6c040', '#c87010', clamp((y - 1.5) / 0.6) * 0.7 + (n - 0.5) * 0.3);
    if (y < 1.35) c = mixC(c, '#fff0c8', clamp((1.4 - y) / 0.4));
    c = mixC(c, '#fff4b0', (1 - edge) * 0.35); c.multiplyScalar(0.8 + edge * 0.3);
    if (t > 0.85) c = mixC(c, '#e8502a', (t - 0.85) * 5);
    return hex(c);
  };
  for (let i = 0; i < N - 1; i++) {
    const a = [0, 1.5, zs(i)], b = [0, 1.5, zs(i + 1)], r0 = rAt(i / (N - 1)), r1 = rAt((i + 1) / (N - 1));
    m.blob({ cone: [a, b, r0, r1], k: 0.25, mat: SCALE, color: scale, weights: segWeights(`Bone_S${i}`, `Bone_S${i + 1}`, a, b, 0.5, 1, 0, 1) });
  }
  // đầu: mõm tròn, môi dày, râu rồng, sừng non
  const head = (x, y, z) => hex(mixC('#f8c84a', '#d07a14', clamp((y - 1.5) / 0.5)).multiplyScalar(0.85 + fbm(x * 9, y * 9, z * 9) * 0.3));
  m.blob({ ell: [[0, 1.5, 2.0], [0.56, 0.6, 0.62]], k: 0.2, mat: SKIN, color: head, weights: W1('Bone_S0') });
  m.blob({ ell: [[0, 1.32, 2.45], [0.3, 0.2, 0.22]], k: 0.12, mat: SKIN, color: '#ffe0a0', weights: W1('Bone_Jaw') });
  m.blob({ ell: [[0.36, 1.68, 2.3], [0.13, 0.13, 0.11]], k: 0.05, mat: SKIN, color: '#fff8e8', weights: W1('Bone_S0'), mirror: true });
  m.blob({ ell: [[0.4, 1.7, 2.38], [0.07, 0.08, 0.05]], k: 0.01, mat: SKIN, color: '#0a0806', weights: W1('Bone_S0'), mirror: true });
  m.blob({ cone: [[0.22, 2.0, 1.9], [0.42, 2.7, 1.5], 0.09, 0.02], k: 0.06, mat: HARD, color: '#f8e8b8', weights: W1('Bone_S0'), mirror: true });
  for (const sd of [-1, 1]) { // râu dài
    let p = [sd * 0.28, 1.36, 2.55];
    for (let k = 0; k < 6; k++) { const q = [p[0] + sd * 0.22, p[1] - 0.05 + Math.sin(k) * 0.06, p[2] - 0.1 + Math.cos(k * 0.8) * 0.05]; m.seg(p, q, 0.025 - k * 0.003, 0.022 - k * 0.003, { bone: 'Bone_S0', color: '#ffd890', seg: 5 }); p = q; }
  }
  // vây: lưng (răng cưa đỏ), ngực, đuôi lớn (tấm mỏng 2 mặt)
  const fin = '#e8502a';
  for (let i = 1; i < N - 1; i++) { const z = zs(i), r = rAt(i / (N - 1)); m.panel(0.05, 0.55, r * 0.9, { bone: `Bone_S${i}`, at: [0, 1.5 + r + r * 0.35, z], rot: [0, 90, 0], color: fin, mat: SKIN }); }
  for (const sd of [-1, 1]) m.panel(0.1, 0.6, 0.7, { bone: 'Bone_S1', at: [sd * 0.6, 1.1, zs(1) - 0.1], rot: [70, sd * 30, sd * 40], color: fin, mat: SKIN });
  m.panel(2.2, 0.3, 1.4, { bone: `Bone_S${N - 1}`, at: [0, 1.5, zs(N - 1) - 0.7], rot: [90, 0, 0], color: fin, mat: SKIN });
  return finish(m, 'long_ngu');
}

// ———————————————————— THẦN ĐIỂU (chim sấm) ————————————————————
function bird() {
  const m = new Model('than_dieu'); m.sdfCell = 0.035; m.sdfTris = 12000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 3.0, 0); m.joint('Bone_Neck', 'Bone_Body', 0, 3.6, 1.1); m.joint('Bone_Head', 'Bone_Neck', 0, 4.9, 1.7);
  m.jointLR('Bone_WingUL', 'Bone_Body', 0.75, 3.6, 0.2); m.jointLR('Bone_WingLL', 'Bone_WingUL', 2.6, 3.9, 0.0); m.jointLR('Bone_WingTipL', 'Bone_WingLL', 4.6, 3.8, -0.4);
  m.joint('Bone_Tail', 'Bone_Body', 0, 2.8, -1.3);
  m.jointLR('Bone_LegL', 'Bone_Body', 0.4, 2.2, 0.0); m.jointLR('Bone_FootL', 'Bone_LegL', 0.45, 1.35, -0.6);
  const plume = (x, y, z) => { const n = fbm(x * 3, y * 3, z * 3), f = fbm(x * 12, y * 4, z * 12, 2); let c = mixC('#0e5a7a', '#2ac0e0', n * 0.8 + clamp((y - 2.6) / 2) * 0.3); c.multiplyScalar(0.82 + f * 0.36); return hex(c); };
  const gold = (x, y, z) => hex(mixC('#c88a1a', '#ffe08a', fbm(x * 6, y * 6, z * 6)).multiplyScalar(0.9 + fbm(x * 20, y * 20, z * 20, 2) * 0.2));
  m.blob({ ell: [[0, 3.05, 0], [1.1, 1.2, 1.6], [-20, 0, 0]], k: 0.3, mat: FUR, color: plume, weights: W1('Bone_Body') });
  m.blob({ ell: [[0, 3.3, 1.0], [0.8, 0.9, 0.7]], k: 0.25, mat: HARD, color: gold, weights: W1('Bone_Body') });                              // ức vàng
  m.blob({ cone: [[0, 3.5, 1.0], [0, 4.7, 1.6], 0.6, 0.4], k: 0.25, mat: FUR, color: plume, weights: segWeights('Bone_Neck', 'Bone_Head', [0, 3.6, 1.1], [0, 4.9, 1.7], 0.5, 1, 0, 1) });
  m.blob({ ell: [[0, 4.95, 1.75], [0.5, 0.48, 0.58]], k: 0.15, mat: FUR, color: plume, weights: W1('Bone_Head') });
  m.blob({ cone: [[0, 4.92, 2.2], [0, 4.6, 3.05], 0.22, 0.03], k: 0.08, mat: HARD, color: gold, weights: W1('Bone_Head') });                        // mỏ cong
  m.blob({ ell: [[0.3, 5.08, 2.08], [0.09, 0.06, 0.06]], k: 0.01, mat: GLOW, color: '#cffcff', weights: W1('Bone_Head'), mirror: true });
  for (let i = 0; i < 5; i++) m.cone(0.08, 0.9 - i * 0.1, { bone: 'Bone_Head', at: [0, 5.35 + i * 0.02, 1.55 - i * 0.22], rot: [-55 - i * 8, 0, 0], color: '#eafcff', glow: true, seg: 5 }); // mào sét
  // cánh: cánh tay lông (SDF) + lông cánh dài (tấm mỏng) gắn xương cánh
  m.blob({ cone: [[0.6, 3.6, 0.2], [2.6, 3.9, 0.0], 0.42, 0.24], k: 0.2, mat: FUR, color: plume, weights: segWeights('Bone_WingUL', 'Bone_WingLL', [0.6, 3.6, 0.2], [2.6, 3.9, 0], 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [[2.6, 3.9, 0.0], [4.6, 3.8, -0.4], 0.24, 0.1], k: 0.15, mat: FUR, color: plume, weights: W1('Bone_WingLL'), mirror: true });
  for (let i = 0; i < 11; i++) {
    const t = i / 10, bx = 0.9 + t * 3.7, b = t < 0.5 ? 'Bone_WingUL' : 'Bone_WingLL', len = 1.5 + t * 1.3, col = i % 3 === 0 ? '#f2c25a' : '#5ad8e8';
    m.panel(0.32, 0.12, len, { bone: b, at: [bx, 3.75 - t * 0.1, -len / 2 + 0.1 - t * 0.3], rot: [-90, 0, -8 + t * 30], color: col, mat: FUR, mirror: true });
  }
  for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.16, len = 2.4 + (3 - Math.abs(i - 3)) * 0.5; m.panel(0.42, 0.18, len, { bone: 'Bone_Tail', at: [Math.sin(a) * len / 2, 2.7 - len * 0.25, -1.3 - Math.cos(a) * len / 2], rot: [-70, a * 57, 0], color: i % 2 ? '#5ad8e8' : '#f2c25a', mat: FUR }); }
  // chân vàng có vuốt
  m.blob({ cone: [[0.4, 2.2, 0.0], [0.45, 1.35, -0.6], 0.2, 0.13], k: 0.08, mat: HARD, color: gold, weights: W1('Bone_LegL'), mirror: true }); // chân co khi bay
  for (const d of [-0.5, 0, 0.5]) m.blob({ cone: [[0.45, 1.35, -0.6], [0.45 + d * 0.3, 1.1, -0.2], 0.1, 0.03], k: 0.04, mat: HARD, color: '#3a2a10', weights: W1('Bone_FootL'), mirror: true });
  return finish(m, 'than_dieu');
}

// ———————————————————— TÀ THẦN (ác thần tím) ————————————————————
function demon() {
  const m = new Model('ta_than'); m.sdfCell = 0.04; m.sdfTris = 13000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Hips', 'Bone_Root', 0, 2.0, 0); m.joint('Bone_Chest', 'Bone_Hips', 0, 3.4, 0.1); m.joint('Bone_Head', 'Bone_Chest', 0, 4.9, 0.6);
  m.jointLR('Bone_ArmUL', 'Bone_Chest', 1.6, 4.1, 0.1); m.jointLR('Bone_ArmLL', 'Bone_ArmUL', 2.2, 2.7, 0.6); m.jointLR('Bone_HandL', 'Bone_ArmLL', 2.3, 1.4, 1.1);
  m.jointLR('Bone_LegUL', 'Bone_Hips', 0.6, 1.9, 0); m.jointLR('Bone_LegLL', 'Bone_LegUL', 0.75, 0.9, 0.25); m.jointLR('Bone_FootL', 'Bone_LegLL', 0.8, 0.1, 0.35);
  const skin = (x, y, z) => { const n = fbm(x * 2.5, y * 2.5, z * 2.5), v = fbm(x * 9, y * 9, z * 9, 2); let c = mixC('#2e2648', '#6a5494', n * 0.8 + v * 0.3); if (Math.abs(fbm(x * 1.6, y * 1.6, z * 1.6, 3) - 0.5) < 0.025) c = new THREE.Color('#c87aff'); return hex(c); };
  const skinM = (x, y, z) => (Math.abs(fbm(x * 1.6, y * 1.6, z * 1.6, 3) - 0.5) < 0.025 ? GLOW : SKIN);
  const armor = (x, y, z) => hex(mixC('#3a2a60', '#7a5ab8', fbm(x * 4, y * 4, z * 4)).multiplyScalar(0.85 + fbm(x * 18, y * 18, z * 18, 2) * 0.3));
  const S = (o) => m.blob({ mat: skinM, color: skin, ...o });
  S({ ell: [[0, 3.5, 0.15], [1.3, 1.0, 0.9]], k: 0.35, weights: W1('Bone_Chest') });
  S({ ell: [[0, 2.4, 0.1], [0.8, 0.8, 0.65]], k: 0.4, weights: segWeights('Bone_Hips', 'Bone_Chest', [0, 2, 0], [0, 3.4, 0], 0.3, 0.9, 0, 1) });
  m.blob({ ell: [[0, 3.9, 0.35], [1.45, 0.55, 0.8]], k: 0.2, mat: HARD, color: armor, weights: W1('Bone_Chest') });                         // giáp vai
  m.blob({ ell: [[0, 3.55, 0.98], [0.32, 0.32, 0.14]], k: 0.08, mat: GLOW, color: '#d08aff', weights: W1('Bone_Chest') });                // lõi ngực
  S({ ell: [[0, 4.95, 0.65], [0.5, 0.58, 0.52]], k: 0.2, weights: W1('Bone_Head') });
  m.blob({ ell: [[0, 4.72, 1.0], [0.3, 0.2, 0.22]], k: 0.12, mat: SKIN, color: skin, weights: W1('Bone_Head') });                          // hàm bạnh
  m.blob({ ell: [[0.2, 5.05, 1.08], [0.1, 0.05, 0.04]], k: 0.01, mat: GLOW, color: '#f0b0ff', weights: W1('Bone_Head'), mirror: true });
  { let p = [0.35, 5.3, 0.6]; const pts = [[0.8, 5.9, 0.4], [1.0, 6.6, -0.1], [0.75, 7.0, -0.7]]; let r = 0.2; for (const q of pts) { m.blob({ cone: [p, q, r, r * 0.65], k: 0.05, mat: HARD, color: armor, weights: W1('Bone_Head'), mirror: true }); p = q; r *= 0.65; } } // sừng cong
  S({ ell: [[1.6, 4.1, 0.1], [0.55, 0.55, 0.55]], k: 0.15, weights: W1('Bone_ArmUL'), mirror: true });
  S({ cone: [[1.6, 4.1, 0.1], [2.2, 2.7, 0.6], 0.42, 0.32], k: 0.15, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', [1.6, 4.1, 0.1], [2.2, 2.7, 0.6], 0.7, 1, 0, 1), mirror: true });
  S({ cone: [[2.2, 2.7, 0.6], [2.3, 1.5, 1.05], 0.32, 0.28], k: 0.12, weights: W1('Bone_ArmLL'), mirror: true });
  S({ ell: [[2.3, 1.35, 1.12], [0.3, 0.3, 0.3]], k: 0.08, weights: W1('Bone_HandL'), mirror: true });
  for (let k = 0; k < 4; k++) { const ox = (k - 1.5) * 0.15; m.blob({ cone: [[2.3 + ox, 1.2, 1.3], [2.3 + ox * 1.5, 0.55, 1.75], 0.07, 0.015], k: 0.04, mat: GLOW, color: '#b06aff', weights: W1('Bone_HandL'), mirror: true }); } // vuốt pha lê
  for (let k = 0; k < 3; k++) m.cone(0.16 - k * 0.03, 1.1 - k * 0.2, { bone: 'Bone_ArmUL', at: [1.6, 4.55 + k * 0.08, -0.15 - k * 0.3], rot: [-35, 0, -25], color: '#b06aff', glow: true, seg: 6, mirror: true }); // gai vai
  S({ cone: [[0.6, 1.9, 0], [0.75, 0.9, 0.25], 0.45, 0.32], k: 0.15, weights: segWeights('Bone_LegUL', 'Bone_LegLL', [0.6, 1.9, 0], [0.75, 0.9, 0.25], 0.7, 1, 0, 1), mirror: true });
  S({ cone: [[0.75, 0.9, 0.25], [0.8, 0.15, 0.35], 0.32, 0.24], k: 0.1, weights: W1('Bone_LegLL'), mirror: true });
  S({ ell: [[0.8, 0.12, 0.5], [0.3, 0.13, 0.42]], k: 0.08, weights: W1('Bone_FootL'), mirror: true });
  return finish(m, 'ta_than');
}


// ———————————————————— LÍNH (kiểu Liên Quân: đầu + mũ to, vai giáp lớn, giáp ngực sơn màu đội viền vàng, áo choàng, chân ngắn chắc) ————————————————————
// _mat: 4 = giáp sơn màu đội (bóng), 8 = vải màu đội (áo choàng, khăn), 6 = phát sáng màu đội, 7 = kim loại sáng (thép/đồng vàng).
const TEAM = 4, TEAMGLOW = 6, METAL = 7, TEAMCLOTH = 8;
const STEEL = '#c3cad3', GOLD = '#e6b450', LEATHER = '#5a3a22', DARKCLOTH = '#2e2a30';
/** Đặt hình học: xoay X → xoay Z → xoay Y (độ) rồi dời; trả về chính nó (để thêm bằng m.add). */
function place(g, { rx = 0, rz = 0, ry = 0, at = [0, 0, 0], sc = null } = {}) {
  if (sc) g.scale(...sc);
  g.rotateX(rx * Math.PI / 180); g.rotateZ(rz * Math.PI / 180); g.rotateY(ry * Math.PI / 180); g.translate(...at); return g;
}
const ring = (R, r, seg = 24) => new THREE.TorusGeometry(R, r, 6, seg).rotateX(Math.PI / 2); // vòng nằm ngang
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

/** Bộ khung + thân lính. o: { bulk, scale, skin, cloth, cell, tris } */
function soldierBase(id, o = {}) {
  const m = new Model(id); m.sdfCell = o.cell || 0.0095; m.sdfTris = o.tris || 5000;
  const k = o.bulk || 1, sc = o.scale || 1, s = (v) => v.map((q) => q * sc), S = (v) => v * sc;
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
  m.blob({ cone: [s(A.sh), s(A.el), S(0.075 * k), S(0.06 * k)], k: S(0.025), mat: FUR, color: clothC, weights: segWeights('Bone_ArmUL', 'Bone_ArmLL', s(A.sh), s(A.el), 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [s(A.el), s(A.ha), S(0.06 * k), S(0.05 * k)], k: S(0.02), mat: FUR, color: clothC, weights: W1('Bone_ArmLL'), mirror: true });
  m.blob({ ell: [s([A.ha[0] + 0.005, A.ha[1] - 0.04, A.ha[2] + 0.01]), [S(0.058 * k), S(0.062 * k), S(0.052 * k)]], k: S(0.02), mat: HARD, color: LEATHER, weights: W1('Bone_HandL'), mirror: true });
  m.limb(s([A.el[0] + 0.005, A.el[1] - 0.03, A.el[2] + 0.01]), s([A.ha[0], A.ha[1] + 0.05, A.ha[2]]), [[0, S(0.07 * k)], [0.5, S(0.066 * k)], [1, S(0.058 * k)]], { bone: 'Bone_ArmLL', color: STEEL, mat: METAL, mirror: true });
  m.add(place(ring(S(0.071 * k), S(0.011)), { rz: -14, at: s([A.el[0] + 0.004, A.el[1] - 0.035, A.el[2] + 0.01]) }), { bone: 'Bone_ArmLL', color: GOLD, mat: METAL, mirror: true });
  // chân: quần vải, gối đồng, ống quyển thép, ủng da mũi cong
  m.blob({ cone: [s(L.hp), s(L.kn), S(0.1 * k), S(0.075 * k)], k: S(0.03), mat: FUR, color: clothC, weights: segWeights('Bone_LegUL', 'Bone_LegLL', s(L.hp), s(L.kn), 0.7, 1, 0, 1), mirror: true });
  m.blob({ cone: [s(L.kn), s([L.ft[0], 0.12, 0]), S(0.07 * k), S(0.06 * k)], k: S(0.02), mat: FUR, color: clothC, weights: W1('Bone_LegLL'), mirror: true });
  m.blob({ ell: [s([L.ft[0], 0.065, 0.05]), [S(0.078 * k), S(0.065), S(0.135 * k)]], k: S(0.025), mat: HARD, color: LEATHER, weights: W1('Bone_FootL'), mirror: true });
  m.limb(s([L.kn[0], 0.38, 0.035]), s([L.ft[0], 0.13, 0.01]), [[0, S(0.078 * k)], [0.6, S(0.072 * k)], [1, S(0.068 * k)]], { bone: 'Bone_LegLL', color: STEEL, mat: METAL, mirror: true });
  m.sphere(S(0.05 * k), { bone: 'Bone_LegLL', at: s([L.kn[0], 0.43, 0.075]), radii: [S(0.055 * k), S(0.05), S(0.035)], color: GOLD, mat: METAL, mirror: true });
  return { m, s, S, k, sc, A, L };
}
/** Giáp: giáp ngực sơn màu đội viền vàng + huy hiệu, đai da khoá vàng, váy giáp 5 tấm, vai giáp hai lớp, áo choàng. o: { pauldron, cape, skirt } */
function teamArmor(b, o = {}) {
  const { m, s, S, k } = b;
  m.loft([{ y: S(0.93), rx: S(0.205 * k), rz: S(0.158 * k) }, { y: S(1.02), rx: S(0.226 * k), rz: S(0.17 * k) }, { y: S(1.14), rx: S(0.258 * k), rz: S(0.184 * k) }, { y: S(1.24), rx: S(0.238 * k), rz: S(0.168 * k) }, { y: S(1.29), rx: S(0.15 * k), rz: S(0.12 * k) }],
    { bone: 'Bone_Chest', color: '#f2f2f2', mat: TEAM, seg: 22 });
  for (const [y, R, rz] of [[0.935, 0.207, 0.158 / 0.205], [1.285, 0.155, 0.122 / 0.15]]) m.add(place(ring(S(R * k), S(0.016), 28), { sc: [1, 1, rz], at: s([0, y, 0]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL });
  m.add(place(ring(S(0.248 * k), S(0.009), 28), { sc: [1, 1, 0.71], at: s([0, 1.14, 0]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL }); // gân ngực
  m.extrude([[0, 0.07], [0.05, 0], [0, -0.075], [-0.05, 0]].map(([x, y]) => [S(x), S(y)]), S(0.02), { bone: 'Bone_Chest', at: s([0, 1.12, 0.188 * k]), color: GOLD, mat: METAL }); // huy hiệu
  m.sphere(S(0.022), { bone: 'Bone_Chest', at: s([0, 1.12, 0.2 * k]), color: '#ffffff', mat: TEAMGLOW });
  // đai da + khoá
  m.loft([{ y: S(0.86), rx: S(0.2 * k), rz: S(0.152 * k) }, { y: S(0.935), rx: S(0.206 * k), rz: S(0.158 * k) }], { bone: 'Bone_Hips', color: LEATHER, mat: HARD, seg: 22 });
  m.box(S(0.08), S(0.06), S(0.02), { bone: 'Bone_Hips', at: s([0, 0.897, 0.162 * k]), color: GOLD, mat: METAL });
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
    const dome = (rx, ry, at, rz) => m.add(place(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), { sc: [S(rx * pd * k), S(ry * pd), S(rx * pd * k)], rz, at: s(at) }), { bone: 'Bone_ArmUL', color: '#ececec', mat: TEAM, mirror: true });
    dome(0.135, 0.11, [0.3 * k, 1.21, 0], -28); dome(0.112, 0.08, [0.345 * k, 1.13, 0], -42);
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
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, z = 0.15 - t * 0.38, y = Math.sin(t * Math.PI) * 0.12 + (t > 0.7 ? -(t - 0.7) * 0.25 : 0); pts.push([z, y]); }
    for (let i = 10; i >= 0; i--) { const t = i / 10, z = 0.13 - t * 0.33; pts.push([z, -0.02 - Math.sin(t * Math.PI) * 0.01]); }
    m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.035), bevelEnabled: true, bevelSize: S(0.008), bevelThickness: S(0.008), bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -S(0.0175)), { ry: -90, at: s([0, 1.6, 0.0]) }), { bone: 'Bone_Head', color: '#e8e8e8', mat: TEAMCLOTH, flat: true });
    m.sphere(S(0.03), { bone: 'Bone_Head', at: s([0, 1.62, 0.13]), color: GOLD, mat: METAL });
  }
}

function swordsman() {
  const b = soldierBase('linh_kiem'); teamArmor(b); helmet(b);
  const { m, s, S } = b;
  // kiếm tay phải (−X): lưỡi rộng có gân, chắn vàng cong, chuôi quấn da, núm vàng
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[-0.034, 0], [0.034, 0], [0.03, 0.6], [0, 0.7], [-0.03, 0.6]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.01), bevelEnabled: true, bevelSize: S(0.008), bevelThickness: S(0.004), bevelSegments: 1 }).translate(0, 0, -S(0.005)), { at: s([-0.355, 0.84, 0.12]) }), { bone: 'Bone_HandR', color: '#e4eaf2', mat: METAL, flat: true });
  m.box(S(0.008), S(0.5), S(0.022), { bone: 'Bone_HandR', at: s([-0.355, 1.1, 0.12]), color: '#9aa4b0', mat: METAL });
  m.add(place(new THREE.TorusGeometry(S(0.09), S(0.016), 5, 12, Math.PI), { rz: 180, at: s([-0.355, 0.86, 0.12]) }), { bone: 'Bone_HandR', color: GOLD, mat: METAL });
  m.cyl(S(0.02), S(0.02), S(0.13), { bone: 'Bone_HandR', at: s([-0.355, 0.78, 0.12]), color: LEATHER, mat: HARD });
  m.sphere(S(0.03), { bone: 'Bone_HandR', at: s([-0.355, 0.7, 0.12]), color: GOLD, mat: METAL });
  // khiên diều tay trái (+X): mặt sơn màu đội, viền vàng, đèn lồng nổi giữa
  const sh = (sc2, d) => new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(S(x * 0.19 * sc2), S(y * 0.2 * sc2)))), { depth: S(d), bevelEnabled: true, bevelSize: S(0.01), bevelThickness: S(0.01), bevelSegments: 1, curveSegments: 4 });
  m.add(place(sh(1.12, 0.02).translate(0, 0, -S(0.025)), { ry: 90, at: s([0.425, 0.86, 0.13]) }), { bone: 'Bone_HandL', color: GOLD, mat: METAL, flat: true });
  m.add(place(sh(1, 0.03), { ry: 90, at: s([0.425, 0.86, 0.13]) }), { bone: 'Bone_HandL', color: '#efefef', mat: TEAM, flat: true });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0.1], [0.06, 0.03], [0.06, -0.05], [0, -0.1], [-0.06, -0.05], [-0.06, 0.03]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.02), bevelEnabled: true, bevelSize: S(0.008), bevelThickness: S(0.008), bevelSegments: 1 }), { ry: 90, at: s([0.465, 0.87, 0.13]) }), { bone: 'Bone_HandL', color: GOLD, mat: METAL, flat: true });
  m.sphere(S(0.026), { bone: 'Bone_HandL', at: s([0.49, 0.87, 0.13]), color: '#ffffff', mat: TEAMGLOW });
  return finish(m, 'linh_kiem');
}
function archer() {
  const b = soldierBase('linh_cung', { cloth: '#33302a' }); teamArmor(b, { pauldron: 0.8, skirt: true });
  const { m, s, S } = b;
  // mũ trùm vải màu đội + băng trán da, lông vũ
  m.add(place(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), { sc: [S(0.178), S(0.175), S(0.182)], at: s([0, 1.49, -0.02]) }), { bone: 'Bone_Head', color: '#e4e4e4', mat: TEAMCLOTH });
  m.blob({ cone: [s([0, 1.46, -0.15]), s([0, 1.22, -0.2]), S(0.09), S(0.05)], k: S(0.02), mat: TEAMCLOTH, color: '#d8d8d8', weights: W1('Bone_Head') }); // vạt mũ trùm sau gáy
  m.add(place(ring(S(0.176), S(0.011), 28), { at: s([0, 1.5, -0.02]) }), { bone: 'Bone_Head', color: GOLD, mat: METAL }); // viền mũ trùm
  m.sphere(S(0.02), { bone: 'Bone_Head', at: s([0, 1.505, 0.155]), color: '#ffffff', mat: TEAMGLOW });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape([[0, 0], [0.03, 0.08], [0.018, 0.2], [0, 0.24], [-0.012, 0.12]].map(([x, y]) => new THREE.Vector2(S(x), S(y)))), { depth: S(0.004), bevelEnabled: false }), { rz: -35, ry: 70, at: s([0.15, 1.5, -0.04]) }), { bone: 'Bone_Head', color: '#f4f0e6', mat: FUR, flat: true });
  // cung sừng hai đầu cong ngược, chuôi quấn da, dây cung
  const bowPts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * 2 - 1, y = t * 0.45, z = 0.11 * (1 - t * t) - 0.05 * Math.pow(Math.abs(t), 6); bowPts.push(new THREE.Vector3(0, y, z)); }
  const bow = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bowPts), 20, S(0.016), 6, false); bow.scale(S(1), S(1), S(1));
  m.add(bow.translate(...s([0.37, 0.8, 0.12])), { bone: 'Bone_HandL', color: '#6a3c1e', mat: HARD });
  for (const t of [-1, 1]) m.sphere(S(0.02), { bone: 'Bone_HandL', at: s([0.37, 0.8 + t * 0.45, 0.07]), color: GOLD, mat: METAL });
  m.cyl(S(0.024), S(0.024), S(0.12), { bone: 'Bone_HandL', at: s([0.37, 0.8, 0.23]), color: LEATHER, mat: HARD });
  m.cyl(S(0.003), S(0.003), S(0.9), { bone: 'Bone_HandL', at: s([0.37, 0.8, 0.07]), color: '#f0e8d0', mat: SKIN });
  // ống tên da viền vàng + tên lông màu đội
  m.cyl(S(0.065), S(0.055), S(0.44), { bone: 'Bone_Chest', at: s([-0.11, 1.2, -0.2]), rot: [-12, 0, 20], color: LEATHER, mat: HARD, seg: 12 });
  m.add(place(ring(S(0.067), S(0.01), 14), { rx: -12, rz: 20, at: s([-0.15, 1.39, -0.235]) }), { bone: 'Bone_Chest', color: GOLD, mat: METAL });
  for (const [dx, dz] of [[-0.02, 0], [0.02, 0.01], [0, -0.025]]) m.add(place(new THREE.ConeGeometry(S(0.026), S(0.09), 4), { rx: -12, rz: 20, at: s([-0.17 + dx, 1.47, -0.25 + dz]) }), { bone: 'Bone_Chest', color: '#e0e0e0', mat: TEAMCLOTH, flat: true });
  return finish(m, 'linh_cung');
}
function giant() { // lính đèn lớn: hộ pháp to lớn, mũ trụ sừng, vai giáp gai, áo tơi rơm phủ vai, vác chuỳ đèn lồng màu đội
  const b = soldierBase('linh_den', { cloth: '#3a2c22', bulk: 1.38, scale: 1.3, cell: 0.014, tris: 6500, skin: '#c99a76' }); teamArmor(b, { pauldron: 1.25 }); helmet(b, { r: 0.18, crest: false });
  const { m, s, S } = b;
  const straw = (x, y, z) => hex(mixC('#d2b260', '#8a6a2a', fbm(x * 9, y * 30, z * 9)).multiplyScalar(0.85 + fbm(x * 40, y * 80, z * 40, 2) * 0.3));
  m.blob({ loft: [{ y: S(1.08), rx: S(0.44), rz: S(0.33) }, { y: S(1.2), rx: S(0.4), rz: S(0.29) }, { y: S(1.3), rx: S(0.2), rz: S(0.17) }], k: S(0.02), mat: FUR, color: straw, weights: W1('Bone_Chest') }); // áo tơi rơm phủ vai
  m.blob({ ell: [s([0, 0.98, 0.07]), [S(0.32), S(0.27), S(0.27)]], k: S(0.05), mat: FUR, color: '#3a2c22', weights: (x, y) => (y / b.sc < 1.0 ? [['Bone_Hips', 1]] : [['Bone_Chest', 1]]) }); // bụng
  for (const sd of [1]) { // sừng cong trên mũ
    const pts = [[0.13, 1.53, 0.02], [0.22, 1.6, 0.0], [0.27, 1.72, -0.03], [0.25, 1.84, -0.05]].map((p) => new THREE.Vector3(...s(p)).setX(s(p)[0] * sd));
    const horn = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 1, 7, false), p = horn.attributes.position, uv = horn.attributes.uv, cp = new THREE.CatmullRomCurve3(pts).getSpacedPoints(10);
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i), c = cp[Math.round(t * 10)], rr = S(0.045 * (1 - t) + 0.008); p.setXYZ(i, c.x + (p.getX(i) - c.x) * rr, c.y + (p.getY(i) - c.y) * rr, c.z + (p.getZ(i) - c.z) * rr); }
    horn.computeVertexNormals(); m.add(horn, { bone: 'Bone_Head', color: '#efe4cc', mat: HARD, mirror: true });
  }
  for (const [x, y, z] of [[0.38, 1.33, 0.02], [0.44, 1.27, -0.06], [0.42, 1.3, 0.1]]) m.cone(S(0.03), S(0.11), { bone: 'Bone_ArmUL', at: s([x, y, z]), rot: [0, 0, -40], color: STEEL, mat: METAL, mirror: true }); // gai vai
  // chuỳ đèn lồng: cán gỗ, đai đồng, lồng đèn sáng màu đội có nan, chóp
  m.cyl(S(0.04), S(0.04), S(1.55), { bone: 'Bone_HandR', at: s([-0.46, 1.2, 0.12]), color: '#4a2c16', mat: HARD });
  for (const y of [0.6, 1.0, 1.5]) m.add(place(ring(S(0.046), S(0.012), 10), { at: s([-0.46, y, 0.12]) }), { bone: 'Bone_HandR', color: GOLD, mat: METAL });
  m.sphere(S(0.2), { bone: 'Bone_HandR', at: s([-0.46, 2.18, 0.12]), radii: [S(0.2), S(0.25), S(0.2)], color: '#ffffff', mat: TEAMGLOW });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; m.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.5, 1].map((t) => new THREE.Vector3(...s([-0.46 + Math.cos(a) * 0.205 * Math.sin(Math.PI * (0.15 + 0.7 * t)), 1.95 + t * 0.46, 0.12 + Math.sin(a) * 0.205 * Math.sin(Math.PI * (0.15 + 0.7 * t))])))), 6, S(0.011), 4, false), { bone: 'Bone_HandR', color: GOLD, mat: METAL }); }
  m.cyl(S(0.12), S(0.15), S(0.05), { bone: 'Bone_HandR', at: s([-0.46, 2.43, 0.12]), color: GOLD, mat: METAL, seg: 14 });
  m.cyl(S(0.15), S(0.11), S(0.05), { bone: 'Bone_HandR', at: s([-0.46, 1.93, 0.12]), color: GOLD, mat: METAL, seg: 14 });
  m.cone(S(0.06), S(0.16), { bone: 'Bone_HandR', at: s([-0.46, 2.53, 0.12]), color: GOLD, mat: METAL, seg: 8 });
  return finish(m, 'linh_den');
}
function siege() { // xe đá: khung gỗ đóng ván, vách sơn màu đội đinh tán vàng, 4 bánh nan có vành sắt, giá chữ A, cần ném gàu đá, đối trọng, cờ
  const m = new Model('xe_da'); m.sdfCell = 0.02; m.sdfTris = 2000;
  m.joint('Bone_Root', null, 0, 0, 0); m.joint('Bone_Body', 'Bone_Root', 0, 0.55, 0); m.joint('Bone_Arm', 'Bone_Body', 0, 1.0, -0.2);
  m.joint('Bone_WheelF', 'Bone_Body', 0, 0.3, 0.5); m.joint('Bone_WheelB', 'Bone_Body', 0, 0.3, -0.5);
  const WOOD = '#7a4a26', WOOD2 = '#5a3418', B = { bone: 'Bone_Body', mat: HARD };
  // sàn + dầm dọc + dầm ngang
  for (let i = 0; i < 6; i++) m.box(0.12, 0.06, 1.3, { ...B, at: [-0.31 + i * 0.124, 0.56, 0], color: i % 2 ? WOOD : '#84522c' });
  for (const x of [0.4, -0.4]) m.box(0.08, 0.12, 1.42, { ...B, at: [x, 0.5, 0], color: WOOD2 });
  for (const z of [0.62, -0.62, 0]) m.box(0.88, 0.08, 0.08, { ...B, at: [0, 0.47, z], color: WOOD2 });
  // vách hai bên: tấm sơn màu đội, nẹp vàng trên/dưới, đinh tán
  for (const x of [0.41, -0.41]) {
    m.box(0.04, 0.24, 1.12, { ...B, at: [x, 0.71, 0], color: '#ececec', mat: TEAM });
    for (const y of [0.6, 0.83]) m.box(0.05, 0.03, 1.16, { ...B, at: [x * 1.01, y, 0], color: GOLD, mat: METAL });
    for (const z of [-0.45, -0.15, 0.15, 0.45]) m.sphere(0.022, { ...B, at: [x * 1.06, 0.715, z], color: GOLD, mat: METAL });
  }
  // mũi xe: tấm khiên màu đội + đầu đèn lồng vàng
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(x * 0.3, y * 0.24))), { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), { rx: -18, at: [0, 0.78, 0.66] }), { bone: 'Bone_Body', color: '#ececec', mat: TEAM, flat: true });
  m.add(place(new THREE.ExtrudeGeometry(new THREE.Shape(KITE.map(([x, y]) => new THREE.Vector2(x * 0.335, y * 0.27))), { depth: 0.03, bevelEnabled: false }), { rx: -18, at: [0, 0.78, 0.64] }), { bone: 'Bone_Body', color: GOLD, mat: METAL, flat: true });
  m.sphere(0.05, { ...B, at: [0, 0.8, 0.72], color: '#ffffff', mat: TEAMGLOW });
  // bánh xe: vành gỗ + đai sắt, 8 nan, trục vàng
  for (const [z, bone] of [[0.5, 'Bone_WheelF'], [-0.5, 'Bone_WheelB']]) {
    for (const x of [0.5, -0.5]) {
      m.add(place(new THREE.TorusGeometry(0.25, 0.045, 6, 22), { ry: 90, at: [x, 0.3, z] }), { bone, color: WOOD2, mat: HARD });
      m.add(place(new THREE.TorusGeometry(0.29, 0.018, 4, 22), { ry: 90, at: [x, 0.3, z] }), { bone, color: '#5a5e66', mat: METAL });
      for (let i = 0; i < 8; i++) m.add(place(new THREE.BoxGeometry(0.03, 0.46, 0.04), { rx: i * 22.5, at: [x, 0.3, z] }), { bone, color: WOOD, mat: HARD, flat: true });
      m.cyl(0.07, 0.07, 0.1, { bone, at: [x, 0.3, z], rot: [0, 0, 90], color: GOLD, mat: METAL, seg: 10 });
    }
    m.cyl(0.03, 0.03, 1.0, { bone, at: [0, 0.3, z], rot: [0, 0, 90], color: '#3a2414', mat: HARD });
  }
  // giá chữ A hai bên + xà ngang trục cần ném
  for (const x of [0.22, -0.22]) for (const dz of [0.22, -0.22]) m.add(place(new THREE.BoxGeometry(0.07, 0.52, 0.07), { rx: dz > 0 ? -22 : 22, at: [x, 0.83, -0.2 + dz * 0.45] }), { bone: 'Bone_Body', color: WOOD2, mat: HARD, flat: true });
  m.cyl(0.045, 0.045, 0.56, { ...B, at: [0, 1.0, -0.2], rot: [0, 0, 90], color: GOLD, mat: METAL, seg: 10 });
  // cần ném (xương Bone_Arm): đòn gỗ đai sắt, gàu đá phía trước, đối trọng sắt phía sau
  m.box(0.09, 0.09, 1.25, { bone: 'Bone_Arm', at: [0, 1.12, 0.25], rot: [-14, 0, 0], color: WOOD, mat: HARD });
  for (const t of [0.0, 0.45]) m.box(0.11, 0.11, 0.04, { bone: 'Bone_Arm', at: [0, 1.06 + t * 0.25, 0.0 + t * 1.0], rot: [-14, 0, 0], color: '#5a5e66', mat: METAL });
  m.add(place(new THREE.LatheGeometry([[0.0, -0.08], [0.15, -0.07], [0.21, 0.02], [0.23, 0.08], [0.2, 0.08], [0.17, 0.0], [0.0, -0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 14), { at: [0, 1.3, 0.85] }), { bone: 'Bone_Arm', color: WOOD2, mat: HARD });
  m.sphere(0.15, { bone: 'Bone_Arm', at: [0, 1.4, 0.85], radii: [0.16, 0.14, 0.15], color: '#8e8a82', mat: HARD });
  m.box(0.3, 0.24, 0.2, { bone: 'Bone_Arm', at: [0, 0.86, -0.42], rot: [-14, 0, 0], color: '#4a4e56', mat: METAL });
  // cột cờ sau xe: cờ đuôi én màu đội, chóp vàng
  m.cyl(0.022, 0.022, 0.9, { ...B, at: [0.34, 1.1, -0.6], color: WOOD2, mat: HARD });
  m.cone(0.04, 0.1, { ...B, at: [0.34, 1.6, -0.6], color: GOLD, mat: METAL });
  const flag = new THREE.Shape([[0, 0], [0.42, 0], [0.34, -0.14], [0.42, -0.28], [0, -0.28]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const flip of [0, 1]) { const g = new THREE.ShapeGeometry(flag); if (flip) { g.scale(1, 1, -1); g.index && g.setIndex([...g.index.array].reverse()); } g.computeVertexNormals(); m.add(place(g, { ry: 90, at: [0.34, 1.52, -0.62] }), { bone: 'Bone_Body', color: '#e6e6e6', mat: TEAMCLOTH, ao: 0.1 }); }
  return finish(m, 'xe_da');
}

const BUILD = {
  soi_da: () => quadruped('soi_da', 1, { ...wolf(), tris: 10000 }),
  ho_loi: () => quadruped('ho_loi', 1, { ...tiger(), tris: 12000, head: 1.3, muzzle: 0.62, leg: 1.35, body: 1.12, roundEar: true }),
  coc_reu: toad, hoa_nham: golem, linh_thuy: spirit, long_ngu: carp, than_dieu: bird, ta_than: demon,
  linh_kiem: swordsman, linh_cung: archer, linh_den: giant, xe_da: siege,
};
const only = process.argv.slice(2);
fs.mkdirSync(outRoot, { recursive: true });
for (const [id, fn] of Object.entries(BUILD)) {
  if (only.length && !only.includes(id)) continue;
  const t0 = Date.now(), built = fn();
  const scene = new THREE.Scene(); for (const c of built.root.children.slice()) scene.add(c);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false });
  fs.writeFileSync(path.join(outRoot, `${id}.glb`), Buffer.from(glb));
  console.log(`${id.padEnd(10)} tris ${String(built.tris).padStart(6)}  bones ${String(built.bones.length).padStart(3)}  ${String(Math.round(glb.byteLength / 1024)).padStart(5)} KB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
