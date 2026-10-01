// Sinh clip animation (30 fps) cho bộ xương người chung. Tư thế tính bằng độ, là ĐỘ LỆCH so với
// tư thế bind. Quy ước trục (mặt nhìn +Z, trái = +X): rx âm = vung tay/chân RA TRƯỚC, rx dương = cúi người ra trước;
// ry dương = xoay sang trái (+X); rz dương ở tay trái = dạng tay ra ngoài.
import * as THREE from 'three';
import { D2R } from './kit.mjs';
import { createIK } from './armik.mjs';

export const FPS = 30;
const NAMES = {
  root: 'Root', hips: 'Hips', spine: 'Spine', chest: 'Chest', neck: 'Neck', head: 'Head',
  uaL: 'UpperArmL', uaR: 'UpperArmR', faL: 'ForearmL', faR: 'ForearmR', hdL: 'HandL', hdR: 'HandR',
  thL: 'ThighL', thR: 'ThighR', shL: 'ShinL', shR: 'ShinR', ftL: 'FootL', ftR: 'FootR',
};
const ease = (t) => t * t * (3 - 2 * t);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Nội suy giữa các khung [[u, pose], ...]. */
function sampleKeys(keys, u) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
      const k = ease((u - t0) / Math.max(1e-6, t1 - t0));
      const out = {};
      for (const key of new Set([...Object.keys(p0), ...Object.keys(p1)])) {
        const a = p0[key] || [0, 0, 0], b = p1[key] || [0, 0, 0];
        out[key] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      }
      return out;
    }
  }
  return keys[keys.length - 1][1];
}

// Kiểu đòn/kỹ năng: mỗi kiểu là danh sách khung. Bản trái/phải sinh bằng mirrorPose.
const mirrorPose = (p) => {
  const o = {};
  for (const [k, v] of Object.entries(p)) {
    const k2 = /L$/.test(k) ? k.replace(/L$/, 'R') : /R$/.test(k) ? k.replace(/R$/, 'L') : k;
    o[k2] = (k === 'rootPos' || k === 'hipsPos') ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]];
  }
  return o;
};
const mirrorKeys = (ks) => ks.map(([u, p]) => [u, mirrorPose(p)]);

export const STYLES = {
  // Vung một tay theo hướng chém từ trên xuống (búa, chuỳ, kiếm bổ)
  chopR: [[0, {}], [0.28, { uaR: [-150, 0, -10], faR: [-55, 0, 0], chest: [-10, -18, 0], spine: [-6, 0, 0], hipsPos: [0, -0.01, -0.01] }],
    [0.46, { uaR: [-40, 0, 10], faR: [-12, 0, 0], chest: [22, 22, 0], spine: [10, 0, 0], head: [8, 0, 0], hipsPos: [0, -0.03, 0.05], thL: [-25, 0, 0], thR: [18, 0, 0], shR: [22, 0, 0] }],
    [0.72, { uaR: [-34, 0, 8], faR: [-10, 0, 0], chest: [18, 16, 0], spine: [8, 0, 0], hipsPos: [0, -0.03, 0.05], thL: [-25, 0, 0], thR: [18, 0, 0], shR: [22, 0, 0] }], [1, {}]],
  // Đập hai tay từ trên xuống (cột đá, dùi trống đôi, búa lớn)
  smash2: [[0, {}], [0.34, { uaL: [-155, 0, 8], uaR: [-155, 0, -8], faL: [-40, 0, 0], faR: [-40, 0, 0], chest: [-16, 0, 0], spine: [-8, 0, 0], head: [-8, 0, 0], hipsPos: [0, -0.02, -0.02] }],
    [0.52, { uaL: [-45, 0, 6], uaR: [-45, 0, -6], faL: [-10, 0, 0], faR: [-10, 0, 0], chest: [30, 0, 0], spine: [12, 0, 0], head: [10, 0, 0], hipsPos: [0, -0.06, 0.06], thL: [-30, 0, 0], thR: [22, 0, 0], shR: [30, 0, 0], shL: [12, 0, 0] }],
    [0.78, { uaL: [-42, 0, 6], uaR: [-42, 0, -6], faL: [-10, 0, 0], faR: [-10, 0, 0], chest: [26, 0, 0], spine: [10, 0, 0], hipsPos: [0, -0.06, 0.06], thL: [-30, 0, 0], thR: [22, 0, 0], shR: [30, 0, 0] }], [1, {}]],
  // Quét ngang một tay
  swingR: [[0, {}], [0.3, { uaR: [-80, 0, -50], faR: [-30, 0, 0], chest: [0, -38, 0], spine: [0, -12, 0], head: [0, 10, 0], hipsPos: [0, -0.02, 0] }],
    [0.5, { uaR: [-85, 0, 35], faR: [-20, 0, 0], chest: [6, 42, 0], spine: [0, 14, 0], head: [0, -14, 0], hipsPos: [0, -0.03, 0.03], thL: [-22, 0, 0], thR: [15, 0, 0] }],
    [0.75, { uaR: [-80, 0, 30], faR: [-20, 0, 0], chest: [6, 38, 0], hipsPos: [0, -0.03, 0.03], thL: [-22, 0, 0], thR: [15, 0, 0] }], [1, {}]],
  // Chém chéo bằng kiếm (rút lên rồi chém xuống chéo)
  slashR: [[0, {}], [0.25, { uaR: [-120, 0, -40], faR: [-90, 0, 0], chest: [-6, -30, 0], head: [0, 12, 0], hipsPos: [0, -0.015, -0.01], thR: [-14, 0, 0] }],
    [0.42, { uaR: [-70, 0, 25], faR: [-8, 0, 0], chest: [14, 34, 0], head: [4, -14, 0], hipsPos: [0, -0.03, 0.06], thL: [-30, 0, 0], thR: [24, 0, 0], shR: [26, 0, 0] }],
    [0.7, { uaR: [-62, 0, 28], faR: [-6, 0, 0], chest: [12, 30, 0], hipsPos: [0, -0.03, 0.06], thL: [-30, 0, 0], thR: [24, 0, 0], shR: [26, 0, 0] }], [1, {}]],
  // Đấm/vuốt thẳng phải, trái
  jabR: [[0, {}], [0.22, { uaR: [-20, 0, -10], faR: [-100, 0, 0], chest: [0, -20, 0], hipsPos: [0, -0.01, -0.02] }],
    [0.42, { uaR: [-88, 0, -6], faR: [-6, 0, 0], chest: [10, 22, 0], hipsPos: [0, -0.02, 0.06], thL: [-24, 0, 0], thR: [16, 0, 0] }],
    [0.7, { uaR: [-70, 0, -6], faR: [-20, 0, 0], chest: [8, 14, 0], hipsPos: [0, -0.02, 0.05], thL: [-20, 0, 0], thR: [14, 0, 0] }], [1, {}]],
  // Giương cung/nỏ: tay trái đưa thẳng, tay phải kéo dây rồi thả
  shoot: [[0, {}], [0.3, { uaL: [-88, 0, 6], faL: [-4, 0, 0], uaR: [-84, 0, -35], faR: [-118, 0, 0], chest: [0, -18, 0], head: [0, -14, 0], hipsPos: [0, -0.02, 0] }],
    [0.52, { uaL: [-88, 0, 6], faL: [-4, 0, 0], uaR: [-84, 0, -35], faR: [-125, 0, 0], chest: [0, -18, 0], head: [0, -14, 0], hipsPos: [0, -0.02, 0] }],
    [0.6, { uaL: [-92, 0, 6], faL: [-4, 0, 0], uaR: [-70, 0, -14], faR: [-40, 0, 0], chest: [-4, -14, 0], head: [-2, -12, 0], hipsPos: [0, -0.02, -0.02] }],
    [0.85, { uaL: [-86, 0, 6], uaR: [-60, 0, -10], faR: [-40, 0, 0], chest: [0, -14, 0], hipsPos: [0, -0.02, 0] }], [1, {}]],
  // Vác ống phóng/đại bác trên vai rồi giật
  shoulderFire: [[0, {}], [0.3, { uaR: [-40, 0, -20], faR: [-110, 0, 0], uaL: [-70, 0, 20], faL: [-60, 0, 0], chest: [-4, -14, 0], hipsPos: [0, -0.02, 0] }],
    [0.42, { uaR: [-40, 0, -20], faR: [-110, 0, 0], uaL: [-70, 0, 20], faL: [-60, 0, 0], chest: [-12, -14, 0], head: [-6, 0, 0], hipsPos: [0, -0.02, -0.04], thL: [10, 0, 0], thR: [-14, 0, 0] }],
    [0.7, { uaR: [-40, 0, -20], faR: [-110, 0, 0], uaL: [-70, 0, 20], faL: [-60, 0, 0], chest: [-4, -14, 0], hipsPos: [0, -0.02, 0] }], [1, {}]],
  // Đẩy một tay ra trước (phép bắn)
  pushR: [[0, {}], [0.3, { uaR: [-60, 0, -25], faR: [-80, 0, 0], chest: [-4, -12, 0], head: [-4, 0, 0], hipsPos: [0, -0.015, -0.01] }],
    [0.5, { uaR: [-92, 0, -8], faR: [-4, 0, 0], hdR: [-20, 0, 0], chest: [8, 8, 0], hipsPos: [0, -0.02, 0.04], thL: [-16, 0, 0], thR: [12, 0, 0] }],
    [0.78, { uaR: [-90, 0, -8], faR: [-6, 0, 0], chest: [6, 6, 0], hipsPos: [0, -0.02, 0.04], thL: [-16, 0, 0], thR: [12, 0, 0] }], [1, {}]],
  // Hai tay đưa lên trời rồi hạ xuống (triệu hồi, cầu nguyện)
  raise2: [[0, {}], [0.4, { uaL: [-165, 0, 22], uaR: [-165, 0, -22], faL: [-20, 0, 0], faR: [-20, 0, 0], chest: [-14, 0, 0], head: [-16, 0, 0], hipsPos: [0, 0.03, 0] }],
    [0.65, { uaL: [-150, 0, 30], uaR: [-150, 0, -30], faL: [-15, 0, 0], faR: [-15, 0, 0], chest: [-10, 0, 0], head: [-12, 0, 0], hipsPos: [0, 0.04, 0] }],
    [0.85, { uaL: [-60, 0, 10], uaR: [-60, 0, -10], faL: [-30, 0, 0], faR: [-30, 0, 0], chest: [10, 0, 0], hipsPos: [0, -0.02, 0.02] }], [1, {}]],
  // Hai tay đẩy ra trước cùng lúc (sóng, đẩy lùi)
  push2: [[0, {}], [0.3, { uaL: [-70, 0, 12], uaR: [-70, 0, -12], faL: [-90, 0, 0], faR: [-90, 0, 0], chest: [-10, 0, 0], head: [-6, 0, 0], hipsPos: [0, -0.02, -0.02] }],
    [0.5, { uaL: [-92, 0, 6], uaR: [-92, 0, -6], faL: [-4, 0, 0], faR: [-4, 0, 0], chest: [14, 0, 0], head: [4, 0, 0], hipsPos: [0, -0.03, 0.05], thL: [-18, 0, 0], thR: [14, 0, 0] }],
    [0.8, { uaL: [-90, 0, 6], uaR: [-90, 0, -6], faL: [-6, 0, 0], faR: [-6, 0, 0], chest: [12, 0, 0], hipsPos: [0, -0.03, 0.05], thL: [-18, 0, 0], thR: [14, 0, 0] }], [1, {}]],
  // Quét hai tay dang rộng rồi khép (vòng phép quanh người)
  sweep2: [[0, {}], [0.35, { uaL: [-30, 0, 85], uaR: [-30, 0, -85], faL: [-25, 0, 0], faR: [-25, 0, 0], chest: [-6, 0, 0], head: [-8, 0, 0], hipsPos: [0, 0.02, 0] }],
    [0.6, { uaL: [-50, 0, 20], uaR: [-50, 0, -20], faL: [-60, 0, 0], faR: [-60, 0, 0], chest: [8, 0, 0], hipsPos: [0, -0.02, 0] }], [1, {}]],
  // Gõ trống: hai tay xen kẽ đập xuống
  drum: [[0, {}], [0.15, { uaR: [-100, 0, -20], faR: [-30, 0, 0], uaL: [-50, 0, 15], faL: [-70, 0, 0], chest: [4, -10, 0] }],
    [0.3, { uaR: [-50, 0, -10], faR: [-10, 0, 0], uaL: [-100, 0, 20], faL: [-30, 0, 0], chest: [4, 10, 0], hipsPos: [0, -0.015, 0] }],
    [0.5, { uaR: [-100, 0, -20], faR: [-30, 0, 0], uaL: [-50, 0, 15], faL: [-70, 0, 0], chest: [4, -10, 0] }],
    [0.68, { uaR: [-50, 0, -10], faR: [-10, 0, 0], uaL: [-140, 0, 30], faL: [-40, 0, 0], chest: [-6, 12, 0], hipsPos: [0, 0.02, 0] }],
    [0.85, { uaR: [-140, 0, -30], faR: [-40, 0, 0], uaL: [-140, 0, 30], faL: [-40, 0, 0], chest: [-6, 0, 0] }], [1, {}]],
  // Gảy đàn/búng ngón: tay phải khảy, tay trái đỡ
  pluck: [[0, {}], [0.3, { uaR: [-60, 0, -30], faR: [-70, 0, 0], hdR: [-30, 0, 0], uaL: [-50, 0, 24], faL: [-70, 0, 0], head: [6, 0, 0], chest: [4, 0, 0] }],
    [0.5, { uaR: [-72, 0, -20], faR: [-50, 0, 0], hdR: [25, 0, 0], uaL: [-56, 0, 20], faL: [-62, 0, 0], head: [8, 0, 0], chest: [6, 0, 0] }],
    [0.72, { uaR: [-60, 0, -30], faR: [-70, 0, 0], hdR: [-30, 0, 0], uaL: [-50, 0, 24], faL: [-70, 0, 0], head: [6, 0, 0] }], [1, {}]],
  // Giậm chân xuống đất và vung tay (chiêu cuối dạng đấm đất)
  slam: [[0, {}], [0.4, { uaL: [-160, 0, 20], uaR: [-160, 0, -20], faL: [-30, 0, 0], faR: [-30, 0, 0], chest: [-20, 0, 0], head: [-14, 0, 0], hipsPos: [0, 0.10, -0.02], thL: [-40, 0, 0], thR: [-40, 0, 0], shL: [50, 0, 0], shR: [50, 0, 0] }],
    [0.55, { uaL: [-30, 0, 16], uaR: [-30, 0, -16], faL: [-10, 0, 0], faR: [-10, 0, 0], chest: [36, 0, 0], spine: [12, 0, 0], head: [12, 0, 0], hipsPos: [0, -0.10, 0.07], thL: [-50, 0, 0], thR: [-50, 0, 0], shL: [60, 0, 0], shR: [60, 0, 0] }],
    [0.85, { uaL: [-30, 0, 16], uaR: [-30, 0, -16], chest: [30, 0, 0], hipsPos: [0, -0.10, 0.07], thL: [-50, 0, 0], thR: [-50, 0, 0], shL: [60, 0, 0], shR: [60, 0, 0] }], [1, {}]],
  // Xoay người quét đòn (chiêu cuối dạng xoáy)
  spin: [[0, {}], [0.2, { uaL: [-70, 0, 40], uaR: [-70, 0, -40], faL: [-20, 0, 0], faR: [-20, 0, 0], hipsPos: [0, -0.04, 0], chest: [8, 0, 0], thL: [-20, 0, 0], thR: [-20, 0, 0], shL: [30, 0, 0], shR: [30, 0, 0] }],
    [0.6, { uaL: [-80, 0, 70], uaR: [-80, 0, -70], faL: [-10, 0, 0], faR: [-10, 0, 0], hipsPos: [0, 0.08, 0], root: [0, 360, 0], thL: [-30, 0, 0], thR: [10, 0, 0], shL: [40, 0, 0], shR: [20, 0, 0] }],
    [0.85, { uaL: [-40, 0, 20], uaR: [-40, 0, -20], hipsPos: [0, -0.03, 0.03], root: [0, 360, 0], chest: [10, 0, 0] }], [1, { root: [0, 360, 0] }]],
  // Nhảy lên vung mạnh xuống (chiêu cuối cho đỡ đòn/đấu sĩ)
  leapSlam: [[0, {}], [0.3, { uaL: [-150, 0, 14], uaR: [-150, 0, -14], faL: [-30, 0, 0], faR: [-30, 0, 0], chest: [-14, 0, 0], hipsPos: [0, -0.06, 0], thL: [-30, 0, 0], thR: [-30, 0, 0], shL: [50, 0, 0], shR: [50, 0, 0] }],
    [0.5, { uaL: [-170, 0, 14], uaR: [-170, 0, -14], chest: [-18, 0, 0], hipsPos: [0, 0.35, 0.04], rootPos: [0, 0, 0.05], thL: [-45, 0, 0], thR: [-20, 0, 0], shL: [70, 0, 0], shR: [40, 0, 0] }],
    [0.68, { uaL: [-40, 0, 10], uaR: [-40, 0, -10], chest: [34, 0, 0], head: [12, 0, 0], hipsPos: [0, -0.08, 0.10], thL: [-50, 0, 0], thR: [-50, 0, 0], shL: [60, 0, 0], shR: [60, 0, 0] }],
    [0.9, { uaL: [-40, 0, 10], uaR: [-40, 0, -10], chest: [30, 0, 0], hipsPos: [0, -0.08, 0.10], thL: [-50, 0, 0], thR: [-50, 0, 0], shL: [60, 0, 0], shR: [60, 0, 0] }], [1, {}]],
  // Rút vũ khí chém dài hai lượt (chiêu cuối kiếm)
  slashCombo: [[0, {}], [0.15, { uaR: [-130, 0, -30], faR: [-80, 0, 0], chest: [-6, -34, 0], hipsPos: [0, -0.02, -0.02] }],
    [0.3, { uaR: [-80, 0, 40], faR: [-8, 0, 0], chest: [10, 38, 0], hipsPos: [0, -0.03, 0.05], thL: [-30, 0, 0], thR: [22, 0, 0] }],
    [0.5, { uaR: [-140, 0, 30], faR: [-70, 0, 0], chest: [-4, 30, 0], hipsPos: [0, 0.01, 0.02] }],
    [0.68, { uaR: [-60, 0, -35], faR: [-6, 0, 0], chest: [16, -36, 0], hipsPos: [0, -0.04, 0.09], thL: [-36, 0, 0], thR: [26, 0, 0] }],
    [0.9, { uaR: [-60, 0, -35], chest: [16, -36, 0], hipsPos: [0, -0.04, 0.09], thL: [-36, 0, 0], thR: [26, 0, 0] }], [1, {}]],
  // Giậm, gầm, dang tay (chiêu cuối dạng gầm)
  roar: [[0, {}], [0.3, { uaL: [-40, 0, 60], uaR: [-40, 0, -60], faL: [-40, 0, 0], faR: [-40, 0, 0], chest: [-18, 0, 0], head: [-26, 0, 0], hipsPos: [0, -0.02, 0], thL: [-10, 0, 0], thR: [10, 0, 0] }],
    [0.5, { uaL: [-30, 0, 70], uaR: [-30, 0, -70], faL: [-50, 0, 0], faR: [-50, 0, 0], chest: [-24, 0, 0], head: [-32, 0, 0], hipsPos: [0, 0.01, -0.02] }],
    [0.8, { uaL: [-30, 0, 70], uaR: [-30, 0, -70], faL: [-50, 0, 0], faR: [-50, 0, 0], chest: [-22, 0, 0], head: [-30, 0, 0] }], [1, {}]],
};
STYLES.chopL = mirrorKeys(STYLES.chopR); STYLES.swingL = mirrorKeys(STYLES.swingR);
STYLES.slashL = mirrorKeys(STYLES.slashR); STYLES.jabL = mirrorKeys(STYLES.jabR);
STYLES.pushL = mirrorKeys(STYLES.pushR);

const DEATH = [[0, {}], [0.25, { chest: [-8, 0, 0], head: [-14, 0, 0], uaL: [-20, 0, 40], uaR: [-20, 0, -40], hipsPos: [0, -0.02, -0.03] }],
  [0.6, { root: [-40, 0, 0], rootPos: [0, 0.05, -0.12], uaL: [-30, 0, 55], uaR: [-30, 0, -55], thL: [-14, 0, 0], thR: [6, 0, 0], shL: [30, 0, 0], shR: [24, 0, 0], head: [-16, 0, 0], hipsPos: [0, -0.15, 0] }],
  [1, { root: [-90, 0, 0], rootPos: [0, 0.06, -0.20], uaL: [-10, 0, 62], uaR: [-10, 0, -62], faL: [-8, 0, 0], faR: [-14, 0, 0], thL: [-4, 0, 6], thR: [4, 0, -8], shL: [10, 0, 0], shR: [8, 0, 0], head: [-10, 12, 0], hipsPos: [0, -0.12, 0] }]];

const RECALL = (t) => {
  const w = Math.sin(t * Math.PI * 2);
  return { uaL: [-58, 0, 6], uaR: [-58, 0, -6], faL: [-95 - 4 * w, 0, 0], faR: [-95 - 4 * w, 0, 0], chest: [8, 0, 0], head: [16, 0, 0], hipsPos: [0, -0.01 + 0.006 * w, 0], spine: [3 * w, 0, 0] };
};
const VICTORY = [[0, {}], [0.2, { hipsPos: [0, -0.05, 0], thL: [-20, 0, 0], thR: [-20, 0, 0], shL: [40, 0, 0], shR: [40, 0, 0], uaL: [-30, 0, 20], uaR: [-30, 0, -20] }],
  [0.4, { hipsPos: [0, 0.16, 0], uaL: [-160, 0, 25], uaR: [-160, 0, -25], faL: [-14, 0, 0], faR: [-14, 0, 0], chest: [-10, 0, 0], head: [-14, 0, 0], thL: [-30, 0, 0], thR: [10, 0, 0], shL: [50, 0, 0], shR: [30, 0, 0] }],
  [0.6, { hipsPos: [0, 0, 0], uaL: [-165, 0, 22], uaR: [-165, 0, -22], chest: [-8, 0, 0], head: [-10, 0, 0] }],
  [0.9, { uaL: [-160, 0, 26], uaR: [-160, 0, -26], chest: [-8, 0, 0], head: [-8, 0, 0], hipsPos: [0, 0.01, 0] }], [1, {}]];

/**
 * Tạo toàn bộ clip. ctx: kết quả humanoid(); o.style chọn kiểu đòn cho từng clip;
 * o.run {amp, T, arm, bob, lean, flex}, o.idle 'calm'|'float'|'heavy'|'sneak'.
 */
export function buildClips(ctx, bones, o = {}) {
  const H = ctx.H;
  const st = Object.assign({ atk1: 'chopR', atk2: 'swingR', cast1: 'pushR', cast2: 'raise2', ult: 'slam', showcase: null }, o.style || {});
  const run = Object.assign({ amp: 36, T: 0.8, arm: 0.9, bob: 0.02, lean: 8, flex: 1, twist: 6 }, o.run || {});
  // Chọn chu kỳ chạy để runRefSpeed ≈ tốc chạy của tướng (timeScale trong trận ≈ 1)
  if (o.moveSpeed) run.T = Math.min(1.15, Math.max(0.5, (ctx.legLen * (run.amp * D2R) * 4 * 0.94 * 100) / o.moveSpeed));
  const idle = o.idle || 'calm';
  const NM = { ...NAMES, ...(o.extra || {}) }; // o.extra: khoá tư thế → tên xương phụ (vải, tóc…) do model nhập thêm
  const swayBones = bones.filter((b) => /Sway/.test(b.name) && !Object.values(o.extra || {}).includes(b.name.slice(5)));
  const clips = {};
  const mk = (name, dur, fn, loop = false) => {
    const n = Math.max(2, Math.round(dur * FPS) + 1);
    const times = [];
    const rots = {}; const pos = {};
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * dur, u = i / (n - 1);
      times.push(t);
      const p = fn(u, t);
      for (const [k, nm] of Object.entries(NM)) {
        const r = p[k] || [0, 0, 0];
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'));
        (rots[nm] ||= []).push(q.x, q.y, q.z, q.w);
      }
      const hp = p.hipsPos || [0, 0, 0], rp = p.rootPos || [0, 0, 0];
      (pos.Hips ||= []).push(ctx.hipsRest[0] + hp[0] * H, ctx.hipsRest[1] + hp[1] * H, ctx.hipsRest[2] + hp[2] * H);
      (pos.Root ||= []).push(rp[0] * H, rp[1] * H, rp[2] * H);
      for (const sb of swayBones) {
        const m = /Sway(\w*?)(\d+)$/.exec(sb.name); const idx = m ? +m[2] : 0;
        const gain = p.swayGain ?? 1;
        const a = (o.swayAmp ?? 7) * gain / (1 + 0.35 * (idx - 1));
        const ph = (loop ? t / dur : t * 1.6) * Math.PI * 2 * (loop ? 1 : 0.9) - idx * 0.7;
        const rq = new THREE.Quaternion().setFromEuler(new THREE.Euler(a * Math.sin(ph) * D2R, 0, a * 0.5 * Math.cos(ph * 0.9) * D2R, 'XYZ'));
        (rots[sb.name.slice(5)] ||= []).push(rq.x, rq.y, rq.z, rq.w);
      }
    }
    const tracks = [];
    for (const [nm, v] of Object.entries(rots)) {
      // bỏ track không đổi
      let changed = false;
      for (let i = 4; i < v.length; i += 4) if (Math.abs(v[i] - v[0]) + Math.abs(v[i + 1] - v[1]) + Math.abs(v[i + 2] - v[2]) + Math.abs(v[i + 3] - v[3]) > 1e-5) { changed = true; break; }
      if (!changed && Math.abs(v[3] - 1) < 1e-6) continue;
      tracks.push(new THREE.QuaternionKeyframeTrack(`Bone_${nm}.quaternion`, times, v));
    }
    for (const [nm, v] of Object.entries(pos)) {
      let changed = false;
      for (let i = 3; i < v.length; i += 3) if (Math.abs(v[i] - v[0]) + Math.abs(v[i + 1] - v[1]) + Math.abs(v[i + 2] - v[2]) > 1e-6) { changed = true; break; }
      if (changed) tracks.push(new THREE.VectorKeyframeTrack(`Bone_${nm}.position`, times, v));
    }
    clips[name] = new THREE.AnimationClip(name, dur, tracks);
  };

  const keyed = (keys) => (u) => sampleKeys(keys, u);
  const styleKeys = (name) => { const k = STYLES[name]; if (!k) throw new Error('Không có kiểu ' + name); return k; };
  const withSway = (fn, g) => (u, t) => ({ swayGain: g, ...fn(u, t) });

  // Idle
  mk('Idle', 2.6, (u) => {
    const s = Math.sin(u * Math.PI * 2), c = Math.cos(u * Math.PI * 2);
    if (idle === 'float') return { swayGain: 0.5, rootPos: [0, 0.025 + 0.02 * s, 0], chest: [1.5 * s, 0, 0], head: [2 * c, 3 * s, 0], uaL: [3 * s, 0, 4], uaR: [3 * s, 0, -4], thL: [-6 + 2 * s, 0, 0], thR: [-2 - 2 * s, 0, 0], shL: [14, 0, 0], shR: [10, 0, 0] };
    if (idle === 'heavy') return { swayGain: 0.3, hipsPos: [0, -0.006 * s, 0], chest: [2.5 * s, 0, 0], spine: [1 * s, 0, 0], head: [-2 * s, 1.5 * c, 0], uaL: [2 * s, 0, 2], uaR: [2 * s, 0, -2] };
    if (idle === 'sneak') return { swayGain: 0.4, hipsPos: [0, -0.03 - 0.004 * s, 0.01], spine: [10, 0, 0], chest: [4 + 1.5 * s, 0, 0], head: [-6 + 2 * c, 4 * s, 0], thL: [-14, 0, 0], thR: [-8, 0, 0], shL: [26, 0, 0], shR: [18, 0, 0] };
    return { swayGain: 0.4, hipsPos: [0, -0.004 * s, 0], chest: [1.8 * s, 0, 0], spine: [0.8 * s, 0, 0], head: [-1.5 * s, 2.5 * c, 0], uaL: [2.2 * s, 0, 1.5 * c], uaR: [2.2 * s, 0, -1.5 * c], faL: [-2 * s, 0, 0], faR: [-2 * s, 0, 0] };
  }, true);

  // Run (chạy tại chỗ)
  mk('Run', run.T, (u) => {
    const ph = u * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    const thL = run.amp * s, thR = -run.amp * s;
    const knee = (cc) => 18 + 62 * Math.max(0, cc) * run.flex;
    const bob = Math.abs(Math.cos(ph)) * run.bob;
    const lean = run.lean;
    const armS = run.amp * run.arm;
    const hold = run.hold || '';
    const arms = {
      uaL: hold.includes('L') ? [-3 + 1.5 * s, 0, 3] : [thL * run.arm * 0.9 - 10, 0, 4], uaR: hold.includes('R') ? [-3 - 1.5 * s, 0, -3] : [thR * run.arm * 0.9 - 10, 0, -4],
      faL: hold.includes('L') ? [-2 * c, 0, 0] : [-38 - armS * 0.2 * (1 - s), 0, 0], faR: hold.includes('R') ? [-2 * c, 0, 0] : [-38 - armS * 0.2 * (1 + s), 0, 0],
    };
    return { swayGain: 1.3, hipsPos: [0, -run.bob * 0.5 + bob, 0], spine: [lean, 0, 0], chest: [lean * 0.4, run.twist * s, 0], head: [-lean * 0.8, -run.twist * s * 0.6, 0],
      thL: [-thL, 0, 0], thR: [-thR, 0, 0], shL: [knee(c), 0, 0], shR: [knee(-c), 0, 0], ftL: [-6 * s - 6, 0, 0], ftR: [6 * s - 6, 0, 0], ...arms };
  }, true);
  ctx.runRefSpeed = Math.round(ctx.legLen * (run.amp * D2R) * 4 / run.T * 100 * 0.94);

  // Đòn đánh
  mk('Attack1', 0.6, keyed(styleKeys(st.atk1)));
  mk('Attack2', 0.6, keyed(styleKeys(st.atk2)));
  mk('Cast1', 0.8, withSway(keyed(styleKeys(st.cast1)), 1.5));
  mk('Cast2', 0.8, withSway(keyed(styleKeys(st.cast2)), 1.5));
  mk('Ult', 1.4, withSway(keyed(styleKeys(st.ult)), 2));
  mk('Death', 1.6, keyed(DEATH));
  mk('Recall', 2.0, (u) => RECALL(u), true);
  mk('Victory', 2.2, keyed(VICTORY));
  // Showcase: nhịp thở + một điệu nhấn từ kiểu chiêu cuối, lặp
  const sc = styleKeys(st.showcase || st.atk1);
  mk('Showcase', 4.0, (u) => {
    const s = Math.sin(u * Math.PI * 2);
    const breathe = { chest: [1.8 * s, 0, 0], head: [0, 3 * s, 0], hipsPos: [0, -0.004 * s, 0] };
    let p = {};
    if (u > 0.25 && u < 0.65) {
      const k = sampleKeys(sc, (u - 0.25) / 0.4);
      for (const [kk, v] of Object.entries(k)) if (kk !== 'root') p[kk] = v;
    }
    for (const [k, v] of Object.entries(breathe)) p[k] = p[k] ? add(p[k], v) : v;
    p.swayGain = 0.6;
    return p;
  }, true);
  // Clip viết tay riêng cho từng tướng: { Tên: { dur, loop, pose: (u, t) => tư thế } } đè lên clip dựng sẵn
  // c.ik(u, t) → { R: { hand, dir }, L: … }: quỹ đạo vũ khí; góc tay giải bằng IK từng khung (armik.mjs), cấu hình ở o.ik.
  const solver = o.ik ? createIK(bones, ctx, NM, o.ik) : null;
  const ARM = ['ua', 'fa', 'hd'].flatMap((k) => [k + 'R', k + 'L']);
  // Giải IK cho cả clip trước: bám quỹ đạo xuôi (từ đầu clip) và ngược (từ cuối clip, cũng là tư thế gốc). Khung nào bám xuôi lệch đích
  // thì dùng nghiệm bám ngược, chuyển dần trong vài khung (không lật tay đột ngột). Trả về hàm tư thế tra theo khung.
  const ikPose = (c, dur) => {
    const n = Math.max(2, Math.round(dur * FPS) + 1), us = Array.from({ length: n }, (_, i) => i / (n - 1));
    const pass = (order) => {
      solver.reset(); if (process.env.IK_DEBUG) console.log(' clip', c.name || '', order[0] ? '(ngược)' : '(xuôi)');
      const out = []; let lu = null;
      for (const i of order) {
        const u = us[i], p = { ...c.pose(u, u * dur) };
        if (lu === null) solver.solve(p, c.ik(u, u * dur)); else solver.track(p, (uu) => c.ik(uu, uu * dur), lu, u, 4);
        out[i] = { a: Object.fromEntries(ARM.filter((k) => p[k]).map((k) => [k, p[k]])), e: solver.lastErr }; lu = u;
      }
      return out;
    };
    const A = pass(us.map((_, i) => i)), B = c.loop ? null : pass(us.map((_, i) => n - 1 - i));
    let w = us.map((_, i) => (B && A[i].e > 0.08 && B[i].e < A[i].e ? 1 : 0));
    for (let r = 0; r < 3; r++) w = w.map((x, i) => (w[Math.max(0, i - 1)] + 2 * x + w[Math.min(n - 1, i + 1)]) / 4); // làm mềm chỗ chuyển
    return (u, t) => {
      const i = Math.round(u * (n - 1)), p = { ...c.pose(u, t) };
      for (const k of Object.keys(A[i].a)) p[k] = w[i] > 0 ? A[i].a[k].map((x, j) => x * (1 - w[i]) + B[i].a[k][j] * w[i]) : A[i].a[k];
      return p;
    };
  };
  for (const [name, c] of Object.entries(o.custom || {})) {
    c.name = name;
    let pose = c.pose;
    if (c.ik && solver) pose = ikPose(c, c.dur === 'run' ? run.T : c.dur ?? 1);
    mk(name, c.dur === 'run' ? run.T : c.dur ?? clips[name]?.duration ?? 1, pose, !!c.loop);
  }
  solver?.reset(); solver?.restore();
  return clips;
}
