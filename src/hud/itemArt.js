// Icon trang bị vẽ tay bằng canvas (mỗi món một hình riêng, tự vẽ — docs/01 §5): vật thể kim loại/đá quý/vải/gỗ có khối
// (chuyển sắc kim loại theo bề ngang vật, viền sáng trên-trái, bóng dưới-phải, đổ bóng), hiệu ứng năng lượng theo chất món
// (lửa, băng, sét, máu, gió, sao, sương), nền toả sáng theo màu chủ đề, bloom, hạt nhiễu; khung vuông bo góc theo bậc
// (đồng: thành phần, bạc: giày, vàng chạm góc: đồ hoàn chỉnh). Toạ độ vẽ 0..128 (ảnh 256²). Sinh một lần rồi lưu đệm.
import { rngFor } from '../render/env/noise.js';
import { mk, lin, rad, tp, ribbon, linePts, rays, streaks, sparks, swirl, solid, shine, bloom, glow, grain, lantern, TAU, K, S } from './paint.js';

const cache = new Map();

// —— chất liệu: dải màu cắt ngang vật (hai mặt vát: tối – sáng – trung – sáng – tối) ——
const MAT = {
  steel: [[0, '#2e333e'], [0.22, '#e9eef6'], [0.5, '#8d96a8'], [0.78, '#f7faff'], [1, '#3c4352']],
  gold: [[0, '#5a3606'], [0.25, '#fff0b0'], [0.52, '#d0921e'], [0.8, '#ffe9a0'], [1, '#6a3e08']],
  bronze: [[0, '#40200c'], [0.28, '#f4bc88'], [0.56, '#a65c2c'], [0.84, '#f8d0a4'], [1, '#43200c']],
  silver: [[0, '#4e5462'], [0.26, '#ffffff'], [0.55, '#b4bcca'], [0.82, '#f2f6ff'], [1, '#535a6a']],
  crimson: [[0, '#30030a'], [0.26, '#ff7676'], [0.55, '#b80c1c'], [0.82, '#ffa0a0'], [1, '#3c040a']],
  ice: [[0, '#164470'], [0.26, '#eafcff'], [0.56, '#6ccaf2'], [0.82, '#ffffff'], [1, '#235f90']],
  dark: [[0, '#08080e'], [0.3, '#62627a'], [0.58, '#24242f'], [0.84, '#80809a'], [1, '#0a0a12']],
  wood: [[0, '#2a1407'], [0.35, '#a4683a'], [0.62, '#6a3a1a'], [0.85, '#8a5530'], [1, '#2a1407']],
  leather: [[0, '#2a1407'], [0.3, '#c08a58'], [0.62, '#7a4626'], [0.85, '#a87048'], [1, '#2a1407']],
  jade: [[0, '#06321e'], [0.28, '#a8ffd0'], [0.58, '#22a464'], [0.84, '#d0ffe6'], [1, '#08361f']],
  stone: [[0, '#23272d'], [0.3, '#b0b8c0'], [0.6, '#666e78'], [0.85, '#c4ccd4'], [1, '#262a30']],
  violet: [[0, '#26083f'], [0.28, '#e6c4ff'], [0.58, '#8634d4'], [0.84, '#f2deff'], [1, '#2a0a46']],
  ivory: [[0, '#5a4a30'], [0.3, '#fffaf0'], [0.6, '#e0d4b8'], [0.85, '#fffdf6'], [1, '#6a5a3a']],
  emerald: [[0, '#032a22'], [0.3, '#8af0d0'], [0.58, '#139a78'], [0.84, '#b8ffe8'], [1, '#05332a']],
};
// —— đặt hình theo khung cục bộ T = { cx, cy, deg, s } ——
const M = (T) => new DOMMatrix().translateSelf(T.cx, T.cy).rotateSelf(T.deg || 0).scaleSelf(T.s || 1);
const P = (d, T) => tp(d, T.cx, T.cy, T.deg || 0, T.s || 1);
const pt = (T, x, y) => { const p = M(T).transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };
const LG = (x, T, x1, y1, x2, y2, st) => { const [a, b] = pt(T, x1, y1), [c, d] = pt(T, x2, y2); return lin(x, a, b, c, d, typeof st === 'string' ? MAT[st] : st); };
const RG = (x, T, cx, cy, r, st) => { const [a, b] = pt(T, cx, cy); return rad(x, a, b, r * (T.s || 1), st); };
const across = (x, T, w, m, y = 0) => LG(x, T, -w, y, w, y, m);                    // chuyển sắc cắt ngang trục dọc vật
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const stroke = (x, p, c, w, a = 1, mode) => { x.save(); if (mode) x.globalCompositeOperation = mode; x.globalAlpha = a; x.strokeStyle = c; x.lineWidth = w; x.lineCap = x.lineJoin = 'round'; x.stroke(p); x.restore(); };
const fillA = (x, p, c, mode) => { x.save(); if (mode) x.globalCompositeOperation = mode; x.fillStyle = c; x.fill(p); x.restore(); };

// —— nền & hiệu ứng ——
function backdrop(x, c0, c1, cx = 64, cy = 58) { x.fillStyle = rad(x, cx, cy, 100, [[0, c0], [0.42, c1], [1, '#05050c']]); x.fillRect(0, 0, 128, 128); }
function bolt(x, r, x0, y0, x1, y1, c = '#9fe6ff', w = 2.2) {
  const n = 9, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const t = i / n, j = r.range(-7, 7); pts.push([x0 + (x1 - x0) * t - (y1 - y0) / 60 * j, y0 + (y1 - y0) * t + (x1 - x0) / 60 * j]); }
  pts.push([x1, y1]); const p = new Path2D(); pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b)));
  x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = c; x.shadowBlur = 8 * K; stroke(x, p, c, w * 2.2, 0.7); x.restore();
  stroke(x, p, '#ffffff', w * 0.8, 1, 'lighter');
}
function flames(x, r, cx, cy, s, n = 7, c = ['#fff2a0', '#ffa020', '#e0300a']) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ox = r.range(-18, 18) * s, h = r.range(26, 46) * s, w = r.range(7, 13) * s, lean = r.range(-8, 8) * s, bx = cx + ox, by = cy;
    const p = new Path2D(); p.moveTo(bx - w, by); p.bezierCurveTo(bx - w, by - h * 0.45, bx + lean - w * 0.2, by - h * 0.7, bx + lean, by - h); p.bezierCurveTo(bx + lean + w * 0.2, by - h * 0.7, bx + w, by - h * 0.45, bx + w, by); p.closePath();
    x.fillStyle = lin(x, bx, by, bx + lean, by - h, [[0, c[2], 0.0], [0.15, c[2], 0.75], [0.5, c[1], 0.75], [1, c[0], 0]]); x.fill(p);
  }
  x.restore();
}
function shards(x, r, n, box, c = ['#e8fbff', '#8ad8ff']) {
  for (let i = 0; i < n; i++) {
    const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), h = r.range(6, 14), a = r.range(0, 360), T = { cx: X, cy: Y, deg: a, s: 1 };
    const p = P(`M0 ${-h}L${h * 0.28} 0L0 ${h * 0.4}L${-h * 0.28} 0Z`, T); fillA(x, p, LG(x, T, -4, 0, 4, 0, 'ice')); stroke(x, p, c[0], 0.4, 0.8);
  }
}
function drops(x, r, n, box, c = '#d0101e') { for (let i = 0; i < n; i++) { const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), s = r.range(0.6, 1.2), T = { cx: X, cy: Y, s }; const p = P('M0-7C3-2 5 1 5 3.5a5 5 0 0 1-10 0C-5 1-3-2 0-7Z', T); solid(x, p, RG(x, T, -1.5, 1, 7, [[0, '#ff9a9a'], [0.5, c], [1, '#3a0006']]), { shadow: false, rd: 0.8, sd: 1.5 }); } }
function stars(x, r, n, box, c = '#ffffff') { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), s = r.range(1.2, 3.2); glow(x, X, Y, s * 3, c, 0.6); x.fillStyle = '#fff'; x.fill(P('M0-4L0.9-0.9L4 0L0.9 0.9L0 4L-0.9 0.9L-4 0L-0.9-0.9Z', { cx: X, cy: Y, s: s / 2.5 })); } x.restore(); }
function wisps(x, r, n, cx, cy, c = '#bfe8ff', R = 46) { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const a0 = r.range(0, TAU), pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30, a = a0 + t * r.range(1.2, 2.2), rr = R * (0.55 + 0.5 * t); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75]); } x.fillStyle = col(c, 0.35); x.fill(ribbon(pts, (t) => 5 * Math.sin(Math.PI * t))); } x.restore(); }
const col = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function leaves(x, r, pts, c = ['#9ae060', '#3a8a2a']) { for (const [X, Y, a, s] of pts) { const T = { cx: X, cy: Y, deg: a, s }; const p = P('M0 0C6-6 18-8 26-2C18 6 6 6 0 0Z', T); solid(x, p, LG(x, T, 0, -6, 0, 6, [[0, c[0]], [1, c[1]]]), { shadow: false, rd: 0.8, sd: 1.5 }); stroke(x, P('M2 0L22-2', T), 'rgba(230,255,200,0.6)', 0.6); } }

// —— vật thể ——
function sword(x, T, { blade = 'steel', hilt = 'gold', grip = 'leather', gem = '#ff3048', len = 1, wide = 1 } = {}) {
  const L = 66 * len, w = 6 * wide;
  solid(x, P(`M${-w} 18L${-w} ${-L + 12}L0 ${-L}L${w} ${-L + 12}L${w} 18Z`, T), across(x, T, w, blade), { sd: 2.5, rd: 1.2 });
  stroke(x, P(`M0 14V${-L + 14}`, T), 'rgba(255,255,255,0.55)', 0.9);
  solid(x, P('M-26 17Q0 23 26 17L28 24Q0 32-28 24Z', T), LG(x, T, 0, 16, 0, 30, hilt), { sd: 2 });
  solid(x, P('M-4.2 27h8.4v24h-8.4z', T), across(x, T, 4.2, grip), { shadow: false, sd: 1.5 });
  for (let y = 30; y < 50; y += 4) stroke(x, P(`M-4 ${y}l8 2.5`, T), 'rgba(0,0,0,0.45)', 0.8);
  solid(x, P(circ(0, 55, 6), T), RG(x, T, -2, 53, 8, [[0, '#fff'], [0.3, gem], [1, '#200008']]), { sd: 1.5 });
  solid(x, P(circ(0, 23, 3.6), T), RG(x, T, -1, 22, 5, [[0, '#fff'], [0.35, gem], [1, '#200008']]), { shadow: false, sd: 1 });
}
function axe(x, T, { blade = 'bronze', haft = 'wood', double = false, band = 'gold' } = {}) {
  solid(x, P('M-3.8-52h7.6v108h-7.6z', T), across(x, T, 3.8, haft), { sd: 2 });
  const b = (m) => `M${3 * m}-46C${34 * m}-64 ${58 * m}-26 ${46 * m} 12C${36 * m}-1 ${21 * m}-7 ${3 * m}-5Z`;
  for (const m of double ? [1, -1] : [1]) { const p = P(b(m), T); solid(x, p, LG(x, T, 0, -40, 50 * m, 0, blade), { sd: 3 }); stroke(x, P(`M${34 * m}-54C${54 * m}-34 ${54 * m}-10 ${46 * m} 12`, T), 'rgba(255,255,255,0.8)', 1.4); }
  solid(x, P('M-6.5-52h13v9h-13zM-6-6h12v6h-12z', T), across(x, T, 6.5, band), { shadow: false, sd: 1.2 });
}
function knife(x, T, o = {}) { sword(x, T, { len: 0.6, wide: 1.25, ...o }); }
function crescent(x, T, { mat = 'crimson', handle = 'dark', R = 46, thick = 16 } = {}) {
  const h = R - thick, pts = [];                                                            // lưỡi trăng khuyết: dày giữa, thon nhọn hai mũi
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = (-150 + 180 * t) * Math.PI / 180; pts.push(`${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`); }
  for (let i = 39; i >= 1; i--) { const t = i / 40, a = (-150 + 180 * t) * Math.PI / 180, rr = R - thick * Math.pow(Math.sin(Math.PI * t), 0.8); pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`); }
  const p = P('M' + pts.join('L') + 'Z', T);
  const ring = mat === 'crimson' ? [[0.55, '#3a0008'], [0.72, '#b8101e'], [0.9, '#ff6a6a'], [1, '#fff0f0']] : [[0.55, '#2a3040'], [0.72, '#8a94aa'], [0.9, '#eef4ff'], [1, '#ffffff']];
  solid(x, p, RG(x, T, 0, 0, R, ring), { sd: 2.5 }); shine(x, p, mat === 'crimson' ? '#ff3a4a' : '#bfd8ff', 6, 0.35);
  stroke(x, P(`M${-R * 0.8} ${-R * 0.58}A${R + 0.5} ${R + 0.5} 0 0 1 ${R * 0.8} ${R * 0.58}`, T), 'rgba(255,255,255,0.8)', 1.2);
  const u = [0.5, -0.866], d = h - 14, [hx, hy] = pt(T, u[0] * d, u[1] * d), T2 = { cx: hx, cy: hy, deg: (T.deg || 0) + 30, s: T.s || 1 };
  solid(x, P('M-4.5-12h9v30h-9z', T2), across(x, T2, 4.5, handle), { sd: 1.5 });
  solid(x, P('M-11-16h22v6h-22z', T2), across(x, T2, 11, 'gold'), { shadow: false, sd: 1 });
  solid(x, P(circ(0, 21, 4), T2), RG(x, T2, -1, 20, 5, [[0, '#fff'], [0.4, '#ff5a6a'], [1, '#3a0008']]), { shadow: false, sd: 1 });
}
function spear(x, T, { head = 'steel', shaft = 'wood' } = {}) {
  solid(x, P('M-2.6-30h5.2v96h-5.2z', T), across(x, T, 2.6, shaft), { sd: 2 });
  solid(x, P('M0-68C10-56 11-42 0-27C-11-42-10-56 0-68Z', T), across(x, T, 10, head), { sd: 2.5 });
  stroke(x, P('M0-64V-30', T), 'rgba(255,255,255,0.6)', 0.8);
  solid(x, P('M-5.5-29h11v7h-11z', T), across(x, T, 5.5, 'gold'), { shadow: false, sd: 1 });
  x.save(); x.globalAlpha = 0.95; for (const [a, l] of [[-0.35, 22], [0, 26], [0.35, 21]]) { const T2 = { ...T, deg: (T.deg || 0) + a * 57 }; fillA(x, P(`M-2-21C-4 ${-21 + l * 0.4} -1 ${-21 + l * 0.8} 0 ${-21 + l}C1 ${-21 + l * 0.8} 4 ${-21 + l * 0.4} 2-21Z`, T2), LG(x, T2, 0, -21, 0, -21 + l, [[0, '#ff4a3a'], [1, '#7a0a0a']])); } x.restore();
}
function bow(x, T, { limb = 'wood', tip = 'gold', string = '#f4f0e0', arrow = true } = {}) {
  const lp = P('M-8-58C34-44 34 44-8 58', T);
  x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 6 * K; x.shadowOffsetY = 3 * K; stroke(x, lp, '#120804', 10); x.restore();
  stroke(x, lp, LG(x, T, 0, -58, 30, 0, limb), 7.5); stroke(x, P('M-6-55C30-42 30-10 26 0', T), 'rgba(255,255,255,0.5)', 1.6);
  for (const s of [-1, 1]) solid(x, P(`M-8 ${58 * s}c-6 ${-2 * s}-10 ${2 * s}-8 ${8 * s}c4 ${2 * s} 8 ${-2 * s} 8 ${-8 * s}z`, T), across(x, T, 6, tip), { shadow: false, sd: 1 });
  solid(x, P('M18-9h9v18h-9z', T), across(x, T, 5, 'leather'), { shadow: false, sd: 1 });
  stroke(x, P('M-8-58L-8 58', T), string, 1.1);
  if (arrow) { stroke(x, P('M-26 0H44', T), LG(x, T, -26, 0, 44, 0, 'wood'), 2.6); solid(x, P('M42-6L58 0L42 6L45 0Z', T), across(x, T, 6, 'steel'), { shadow: false, sd: 1 }); for (const s of [-1, 1]) fillA(x, P(`M-26 0L-34 ${8 * s}L-18 ${6 * s}L-14 0Z`, T), '#e8e0d0'); }
}
function glove(x, T, { mat = 'leather', cuff = 'bronze' } = {}) {
  for (const [i, fx, h] of [[0, -18, 26], [1, -7, 31], [2, 4, 29], [3, 15, 24]]) { void i; solid(x, P(`M${fx - 4.5}-30v${-h + 6}a4.5 4.5 0 0 1 9 0v${h - 6}z`, T), across(x, T, 22, mat), { sd: 2 }); }
  solid(x, P('M-23-6C-23-28-12-34 0-34C14-34 23-28 23-6L23 22C23 34 12 40 0 40C-12 40-23 34-23 22Z', T), RG(x, T, -8, -12, 50, [[0, '#d8a070'], [0.5, MAT[mat][2][1]], [1, '#20100a']]), { sd: 3 });
  solid(x, P('M-22 6C-34 0-40-12-36-20C-30-22-24-14-18-6Z', T), across(x, T, 30, mat), { shadow: false, sd: 2 });
  for (const y of [-14, -2]) stroke(x, P(`M-18 ${y}H18`, T), 'rgba(255,230,190,0.45)', 0.8);
  solid(x, P('M-25 32h50v18h-50z', T), LG(x, T, 0, 32, 0, 50, cuff), { sd: 2 }); stroke(x, P('M-22 41H22', T), 'rgba(0,0,0,0.4)', 1);
}
function hammer(x, T, { head = 'steel', handle = 'wood', band = 'gold' } = {}) {
  solid(x, P('M-4.2-18h8.4v84h-8.4z', T), across(x, T, 4.2, handle), { sd: 2 });
  solid(x, P('M-36-50h72a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4h-72a4 4 0 0 1-4-4v-28a4 4 0 0 1 4-4z', T), LG(x, T, 0, -50, 0, -14, head), { sd: 3.5 });
  solid(x, P('M-26-52h7v40h-7zM19-52h7v40h-7z', T), LG(x, T, 0, -52, 0, -12, band), { shadow: false, sd: 1.2 });
  solid(x, P(circ(0, -32, 6), T), RG(x, T, -2, -34, 7, [[0, '#fff6c0'], [0.4, '#ff9a20'], [1, '#601a00']]), { shadow: false, sd: 1 });
}
function mask(x, T, { mat = 'gold', eye = '#6affe8' } = {}) {
  const face = P('M0-46C30-46 38-20 35 6C31 30 15 44 0 48C-15 44-31 30-35 6C-38-20-30-46 0-46Z', T);
  solid(x, face, LG(x, T, -36, -40, 36, 40, mat), { sd: 4 });
  for (const s of [-1, 1]) { const e = P(`M${-21 * s}-10C${-15 * s}-18 ${-6 * s}-17 ${-2 * s}-9C${-8 * s}-4 ${-16 * s}-4 ${-21 * s}-10Z`, T); fillA(x, e, '#0a0608'); shine(x, e, eye, 5, 0.75); }
  stroke(x, P('M-28-24C-16-30-6-28 0-22C6-28 16-30 28-24M-12 22C-6 26 6 26 12 22M0-6V12', T), 'rgba(90,50,0,0.7)', 1.6);
  stroke(x, P('M-24 4C-28 14-26 24-18 32M24 4C28 14 26 24 18 32', T), 'rgba(255,250,210,0.6)', 1);
  solid(x, P('M0-42L5-34L0-26L-5-34Z', T), RG(x, T, 0, -36, 8, [[0, '#ffffff'], [0.4, eye], [1, '#003a30']]), { shadow: false, sd: 1 });
}
function gem(x, T, c = ['#d8f2ff', '#4a8aff', '#0a1650']) {
  const V = { tl: [-22, -30], tr: [22, -30], r: [36, -12], l: [-36, -12], ml: [-14, -12], mr: [14, -12], b: [0, 42] };
  const f = (ks, cc) => { const p = P('M' + ks.map((k) => V[k].join(' ')).join('L') + 'Z', T); x.fillStyle = cc; x.fill(p); stroke(x, p, 'rgba(255,255,255,0.35)', 0.6); };
  x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 8 * K; x.shadowOffsetY = 3 * K; x.fillStyle = c[2]; x.fill(P('M-22-30L22-30L36-12L0 42L-36-12Z', T)); x.restore();
  f(['tl', 'tr', 'mr', 'ml'], LG(x, T, -22, -30, 22, -12, [[0, c[0]], [1, c[1]]])); f(['tl', 'ml', 'l'], c[1]); f(['tr', 'r', 'mr'], LG(x, T, 22, -30, 36, -12, [[0, c[0]], [1, c[1]]]));
  f(['l', 'ml', 'b'], LG(x, T, -36, -12, 0, 42, [[0, c[1]], [1, c[2]]])); f(['ml', 'mr', 'b'], LG(x, T, 0, -12, 0, 42, [[0, c[0]], [0.4, c[1]], [1, c[2]]])); f(['mr', 'r', 'b'], c[2]);
  shine(x, P('M-14-27L-4-27L-10-15Z', T), '#ffffff', 3, 0.6);
}
function orb(x, r, T, { c = ['#ffffff', '#8ad8ff', '#1a3a8a'], R = 30, swirlC = '#bfefff' } = {}) {
  const p = P(circ(0, 0, R), T); glow(x, T.cx, T.cy, R * 2 * (T.s || 1), c[1], 0.5);
  solid(x, p, RG(x, T, -R * 0.3, -R * 0.35, R * 1.3, [[0, c[0]], [0.35, c[1]], [1, c[2]]]), { sd: 3 });
  x.save(); x.clip(p); swirl(x, r, T.cx, T.cy, { arms: 4, r0: 2, r1: R * (T.s || 1), turns: 0.9, w: [1.5, 3.5], c: swirlC, alpha: 0.55 }); x.restore();
  fillA(x, P(`M${-R * 0.55} ${-R * 0.35}a${R * 0.4} ${R * 0.25} -30 1 1 ${R * 0.5} ${-R * 0.25}a${R * 0.3} ${R * 0.18} -30 1 0 ${-R * 0.5} ${R * 0.25}Z`, T), 'rgba(255,255,255,0.75)');
}
function book(x, T, { cover = ['#a0482a', '#4a1408'], trim = 'gold', rune = '#ffd86a' } = {}) {
  solid(x, P('M-30-40h58v82h-58z', { ...T, cx: T.cx + 4, cy: T.cy + 3 }), LG(x, T, 0, -40, 0, 40, [[0, cover[1]], [1, '#100402']]), { sd: 2 });
  solid(x, P('M-27-37h56v78h-56z', T), lin(x, 0, 0, 0, 1, [[0, '#f4ead0'], [1, '#c8b890']]), { shadow: false, sd: 1 });
  for (let i = 0; i < 6; i++) stroke(x, P(`M29 ${-34 + i * 13}v10`, T), 'rgba(120,90,50,0.5)', 0.6);
  solid(x, P('M-32-42h58v82h-58z', T), LG(x, T, -32, -42, 26, 40, [[0, cover[0]], [1, cover[1]]]), { sd: 3 });
  solid(x, P('M-32-42h8v82h-8z', T), across(x, T, 4, trim, 0), { shadow: false, sd: 1 });
  solid(x, P('M16-42h10v10zM16 40h10v-10z', T), across(x, T, 6, trim), { shadow: false, sd: 1 });                 // bọc góc
  const em = P(circ(-3, -1, 15), T); stroke(x, em, LG(x, T, -18, 0, 12, 0, trim), 2.6);
  shine(x, P('M-3-12L4 2L-3 12L-10 2Z', T), rune, 6, 0.85);
}
function staff(x, r, T, { shaft = 'wood', head = 'gold', orbC = ['#ffffff', '#6ad8ff', '#0a3a7a'] } = {}) {
  solid(x, P('M-3.2-30h6.4v100h-6.4z', T), across(x, T, 3.2, shaft), { sd: 2 });
  solid(x, P('M-20-36C-26-62-8-74 0-74C8-74 26-62 20-36C16-50 9-58 0-58C-9-58-16-50-20-36Z', T), LG(x, T, -20, -70, 20, -40, head), { sd: 2.5 });
  solid(x, P('M-7-34h14v8h-14z', T), across(x, T, 7, head), { shadow: false, sd: 1 });
  const [ox, oy] = pt(T, 0, -48); orb(x, r, { cx: ox, cy: oy, s: T.s || 1 }, { c: orbC, R: 13, swirlC: orbC[0] });
}
function hat(x, T, { c = ['#7a4ad8', '#1a0a4a'], band = 'gold' } = {}) {
  solid(x, P('M-48 12C-30 0 30 0 48 12C30 26-30 26-48 12Z', T), LG(x, T, 0, 0, 0, 24, [[0, c[0]], [1, c[1]]]), { sd: 3 });
  solid(x, P('M-6-66C2-56 12-20 30 10L-30 10C-18-16-12-44 2-58C0-62-2-64-6-66Z', T), LG(x, T, -30, -40, 30, 10, [[0, c[0]], [1, c[1]]]), { sd: 3 });
  solid(x, P('M-28 1C-10-6 10-6 28 1L30 10C10 3-10 3-30 10Z', T), LG(x, T, 0, -4, 0, 10, band), { shadow: false, sd: 1 });
  solid(x, P(circ(0, 2, 4), T), RG(x, T, -1, 1, 5, [[0, '#fff'], [0.4, '#7ae8ff'], [1, '#003050']]), { shadow: false, sd: 1 });
}
function ring(x, T, { band = 'gold', gem: g = ['#ffd0d8', '#e0102a', '#3a0008'] } = {}) {
  const p = new Path2D(); const m = M(T);
  const e1 = new Path2D(); e1.ellipse(0, 12, 32, 20, 0, 0, TAU); const e2 = new Path2D(); e2.ellipse(0, 12, 23, 13, 0, 0, TAU, true);
  p.addPath(e1, m); p.addPath(e2, m);
  solid(x, p, LG(x, T, -32, 0, 32, 30, band), { sd: 3 });
  solid(x, P('M-12-6L-8-24H8L12-6Z', T), LG(x, T, 0, -24, 0, -6, band), { sd: 2 });
  solid(x, P(circ(0, -22, 13), T), RG(x, T, -4, -26, 16, [[0, g[0]], [0.4, g[1]], [1, g[2]]]), { sd: 2.5 });
  shine(x, P('M-6-28l4-3 2 4z', T), '#ffffff', 2, 0.8);
}
function hourglass(x, T, { frame = 'silver', fill = ['#e8fbff', '#7ad0f4'] } = {}) {
  const glass = P('M-18-42C-18-18-4-8-2 0C-4 8-18 18-18 42H18C18 18 4 8 2 0C4-8 18-18 18-42Z', T);
  fillA(x, glass, LG(x, T, -18, 0, 18, 0, [[0, 'rgba(200,240,255,0.25)'], [0.5, 'rgba(255,255,255,0.08)'], [1, 'rgba(200,240,255,0.3)']]));
  fillA(x, P('M-15 40C-15 26-6 18-1 12H1C6 18 15 26 15 40Z', T), LG(x, T, 0, 12, 0, 40, [[0, fill[0]], [1, fill[1]]]));
  fillA(x, P('M-15-38C-14-30-8-24-1-20H1C8-24 14-30 15-38Z', T), LG(x, T, 0, -38, 0, -20, [[0, fill[1]], [1, fill[0]]]));
  stroke(x, glass, 'rgba(230,250,255,0.85)', 1.3);
  for (const y of [-50, 42]) solid(x, P(`M-30 ${y}h60v8h-60z`, T), LG(x, T, 0, y, 0, y + 8, frame), { sd: 2 });
  for (const xx of [-27, 22]) solid(x, P(`M${xx}-42h5v84h-5z`, T), across(x, T, 3, frame), { shadow: false, sd: 1 });
}
function crystals(x, T, { c = 'ice', list = [[0, -6, 0, 1.15], [-18, 8, -24, 0.8], [17, 6, 22, 0.85], [-6, 18, -48, 0.55], [10, 20, 52, 0.5]] } = {}) {
  for (const [ox, oy, a, s] of list) {
    const T2 = { cx: T.cx + ox * (T.s || 1), cy: T.cy + oy * (T.s || 1), deg: (T.deg || 0) + a, s: (T.s || 1) * s }, h = 46, w = 11;
    const p = P(`M0${-h}L${w} ${-h + w * 1.2}L${w} 18L0 24L${-w} 18L${-w} ${-h + w * 1.2}Z`, T2);
    solid(x, p, across(x, T2, w, c), { sd: 2.5 }); stroke(x, P(`M0${-h}V24`, T2), 'rgba(255,255,255,0.5)', 0.7);
  }
}
function kite(x, T, { face = ['#7a8a9a', '#2a323c'], rim = 'stone', emblem = null } = {}) {
  const o = 'M0-52L40-38L36 10C30 34 13 47 0 56C-13 47-30 34-36 10L-40-38Z';
  solid(x, P(o, T), LG(x, T, -40, -50, 40, 50, rim), { sd: 4 });
  const T2 = { ...T, s: (T.s || 1) * 0.82, cy: T.cy + 1 * (T.s || 1) };
  solid(x, P(o, T2), LG(x, T2, -30, -40, 30, 50, [[0, face[0]], [1, face[1]]]), { shadow: false, sd: 2.5 });
  if (emblem) emblem(T); else solid(x, P(circ(0, -4, 9), T), RG(x, T, -3, -7, 11, [[0, '#ffffff'], [0.4, '#c8d0d8'], [1, '#3a4048']]), { shadow: false, sd: 1.5 });
}
function chest(x, r, T, { mat = 'steel', trim = 'gold', variant = '' } = {}) {
  const body = P('M-34-40L-14-46C-8-36 8-36 14-46L34-40L42-10L29-5L27 40C10 48-10 48-27 40L-29-5L-42-10Z', T);
  solid(x, body, LG(x, T, -42, -46, 42, 46, mat), { sd: 4 });
  x.save(); x.clip(body);
  if (variant === 'scales') for (let row = 0; row < 9; row++) for (let i = -5; i <= 5; i++) { const cx = i * 9 + (row % 2) * 4.5, cy = -34 + row * 9; const p = P(`M${cx - 5} ${cy}a5 6 0 0 0 10 0`, T); stroke(x, p, 'rgba(0,40,30,0.55)', 1.1); stroke(x, P(`M${cx - 4} ${cy + 1}a4 4 0 0 0 4 3`, T), 'rgba(200,255,230,0.45)', 0.7); }
  if (variant === 'leather') { for (const xx of [-10, 10]) stroke(x, P(`M${xx}-36V42`, T), 'rgba(255,230,190,0.5)', 0.8); x.setLineDash([2.5, 2.5]); stroke(x, P('M-25-2H25M-24 20H24', T), 'rgba(255,230,190,0.6)', 0.8); x.setLineDash([]); }
  x.restore();
  stroke(x, P('M-14-46C-8-36 8-36 14-46', T), LG(x, T, -14, 0, 14, 0, trim), 3);
  solid(x, P('M-29-6H29L28 2H-28Z', T), LG(x, T, 0, -6, 0, 2, trim), { shadow: false, sd: 1 });
  if (variant === 'spikes') for (const [sx, sy, a] of [[-34, -40, -40], [-24, -44, -20], [34, -40, 40], [24, -44, 20], [-16, 12, -10], [0, 14, 0], [16, 12, 10], [-8, 28, -8], [8, 28, 8]]) { const T2 = { cx: pt(T, sx, sy)[0], cy: pt(T, sx, sy)[1], deg: (T.deg || 0) + a, s: T.s || 1 }; solid(x, P('M-4 2L0-12L4 2Z', T2), across(x, T2, 4, 'steel'), { shadow: false, sd: 1, rd: 0.6 }); }
  if (variant === 'lantern') { const [lx, ly] = pt(T, 0, 16); lantern(x, lx, ly, 0.42 * (T.s || 1)); }
  if (variant === 'core') { const [cx, cy] = pt(T, 0, 14); glow(x, cx, cy, 16, '#6ae8ff', 0.8); solid(x, P(circ(0, 14, 6), T), RG(x, T, -2, 12, 7, [[0, '#fff'], [0.4, '#6ae8ff'], [1, '#003040']]), { shadow: false }); }
  void r;
}
function cloak(x, r, T, { c = ['#9ab0d8', '#2a3a6a'], clasp = '#7ad8ff', variant = '' } = {}) {
  const p = P('M-26-46C-10-52 10-52 26-46L42 42C28 32 16 52 4 40C-6 52-18 34-30 46C-36 40-40 42-44 40Z', T);
  solid(x, p, LG(x, T, -40, -40, 40, 44, [[0, c[0]], [1, c[1]]]), { sd: 4 });
  x.save(); x.clip(p);
  for (const [a, b] of [[-14, -30], [2, 4], [18, 30]]) stroke(x, P(`M${a * 0.5}-40C${a} -10 ${b} 10 ${b} 44`, T), 'rgba(0,0,10,0.35)', 3.5);
  for (const [a, b] of [[-10, -24], [8, 14]]) stroke(x, P(`M${a * 0.5}-40C${a} -10 ${b} 10 ${b} 44`, T), 'rgba(255,255,255,0.22)', 1.6);
  if (variant === 'night') { const [x0, y0] = pt(T, -36, -40), [x1, y1] = pt(T, 36, 40); stars(x, r, 14, [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], '#c8a8ff'); }
  x.restore();
  solid(x, P('M-28-46C-16-56 16-56 28-46C14-40-14-40-28-46Z', T), LG(x, T, 0, -54, 0, -40, [[0, c[0]], [1, c[1]]]), { shadow: false, sd: 1.5 });
  solid(x, P(circ(0, -44, 5.5), T), RG(x, T, -2, -46, 7, [[0, '#fff'], [0.4, clasp], [1, '#001020']]), { shadow: false, sd: 1 });
}
function heart(x, T, { mat = 'wood', core = '#8aff6a' } = {}) {
  const p = P('M0 46C-30 26-48 6-48-16C-48-34-34-46-20-46C-10-46-3-40 0-32C3-40 10-46 20-46C34-46 48-34 48-16C48 6 30 26 0 46Z', T);
  solid(x, p, LG(x, T, -48, -40, 48, 40, mat), { sd: 4 });
  x.save(); x.clip(p); for (let i = 0; i < 7; i++) stroke(x, P(`M${-40 + i * 12}-46C${-30 + i * 10} -10 ${-34 + i * 11} 20 ${-10 + i * 4} 46`, T), 'rgba(40,18,6,0.45)', 1.1); x.restore();
  const [cx, cy] = pt(T, 0, -4); glow(x, cx, cy, 22 * (T.s || 1), core, 0.8);
  shine(x, P('M0 8C-8 2-12-4-12-9a6 6 0 0 1 12-2a6 6 0 0 1 12 2C12-4 8 2 0 8Z', T), core, 6, 0.9);
}
function pouch(x, r, T) {
  const p = P('M-30 40C-42 20-36-6-18-18L-12-26C-18-32-15-38-8-36L0-31L8-36C15-38 18-32 12-26L18-18C36-6 42 20 30 40C20 48-20 48-30 40Z', T);
  solid(x, p, LG(x, T, -40, -30, 40, 44, [[0, '#d8b67a'], [0.5, '#9a7440'], [1, '#3a2408']]), { sd: 4 });
  x.save(); x.clip(p); for (let i = -40; i < 44; i += 4) stroke(x, P(`M-44 ${i}L44 ${i + 3}`, T), 'rgba(60,40,10,0.18)', 0.7); x.restore();
  stroke(x, P('M-17-20C-6-15 6-15 17-20', T), '#5a1a0a', 3); stroke(x, P('M10-18C16-8 20 2 14 10', T), '#8a2a10', 2);
  for (let i = 0; i < 9; i++) { const T2 = { cx: pt(T, r.range(-30, 30), r.range(38, 50))[0], cy: pt(T, 0, r.range(36, 48))[1], deg: r.range(0, 360), s: (T.s || 1) * r.range(0.8, 1.2) }; solid(x, P('M0-4C3-4 4 0 4 2C4 4 2 5 0 5C-2 5-4 4-4 2C-4 0-3-4 0-4Z', T2), RG(x, T2, -1, -1, 6, [[0, '#fff6c0'], [0.5, '#c8a83a'], [1, '#5a4008']]), { shadow: false, sd: 0.8, rd: 0.5 }); }
  leaves(x, r, [[pt(T, 2, -34)[0], pt(T, 2, -34)[1], -70, 0.7 * (T.s || 1)], [pt(T, 0, -32)[0], pt(T, 0, -32)[1], -120, 0.6 * (T.s || 1)]]);
}
function boot(x, r, T, { mat = 'leather', cuff = 'bronze', sole = '#2a1a10', variant = '' } = {}) {
  const p = P('M-20-50L10-50L12-8C26-6 40 4 44 18L46 30L-22 30L-24 14C-24 0-22-10-20-14Z', T);
  solid(x, p, LG(x, T, -24, -40, 46, 30, mat), { sd: 4 });
  solid(x, P('M-24 30h72v9a3 3 0 0 1-3 3h-66a3 3 0 0 1-3-3z', T), sole, { shadow: false, sd: 1.5 });
  solid(x, P('M-23-52h37v13h-37z', T), LG(x, T, 0, -52, 0, -39, cuff), { shadow: false, sd: 1.5 });
  x.save(); x.clip(p); stroke(x, P('M14-8C24-2 34 8 40 22', T), 'rgba(255,255,255,0.3)', 1.6); stroke(x, P('M-20-14C-10-10 4-10 12-8', T), 'rgba(0,0,0,0.35)', 1.5); x.restore();
  if (variant === 'plate') for (const y of [-30, -18]) solid(x, P(`M-21 ${y}h33v7h-33z`, T), LG(x, T, 0, y, 0, y + 7, 'steel'), { shadow: false, sd: 1 });
  if (variant === 'plate') solid(x, P('M14-6C26-4 38 6 42 18L30 22C26 12 20 6 12 4Z', T), LG(x, T, 12, -6, 42, 22, 'steel'), { shadow: false, sd: 1 });
  if (variant === 'wings' || variant === 'wings2') for (const [s, o] of [[1, 0], [0.8, -7]]) { const [wx, wy] = pt(T, -22, -36 + o), T2 = { cx: wx, cy: wy, deg: (T.deg || 0) - 10, s: (T.s || 1) * s }; const wp = P('M0 0C-14-8-30-8-40-20C-34-6-30 0-38 4C-28 4-20 6-30 12C-18 12-8 8 0 6Z', T2); solid(x, wp, LG(x, T2, -40, -20, 0, 10, variant === 'wings2' ? 'ivory' : 'silver'), { shadow: false, sd: 1.5, rd: 0.8 }); }
  if (variant === 'leaf') leaves(x, r, [[pt(T, -18, -46)[0], pt(T, -18, -46)[1], -150, 0.75 * (T.s || 1)], [pt(T, -16, -44)[0], pt(T, -16, -44)[1], -110, 0.65 * (T.s || 1)], [pt(T, 10, -48)[0], pt(T, 10, -48)[1], -40, 0.6 * (T.s || 1)]]);
  const emb = { stars: ['M0-7L2-2L7-2L3 1L5 7L0 3L-5 7L-3 1L-7-2L-2-2Z', '#e8c8ff'], clock: [circ(0, 0, 6), '#9ae0ff'], shield: ['M0-8L7-5L6 2C5 6 2 8 0 9C-2 8-5 6-6 2L-7-5Z', '#fff0b0'], bolt: ['M2-9L-5 1H0L-2 9L5-1H0Z', '#fff4a0'] }[variant];
  if (emb) { const T2 = { cx: pt(T, -4, -20)[0], cy: pt(T, -4, -20)[1], deg: T.deg || 0, s: (T.s || 1) * 1.6 }; glow(x, T2.cx, T2.cy, 16, emb[1], 0.6);
    solid(x, P(emb[0], T2), RG(x, T2, -2, -3, 10, [[0, '#ffffff'], [0.45, emb[1]], [1, '#5a3a08']]), { shadow: false, sd: 1.2, rd: 0.7 }); stroke(x, P(emb[0], T2), 'rgba(255,236,170,0.9)', 0.7);
    if (variant === 'clock') stroke(x, P('M0-4V0L3 2', T2), '#20304a', 1); }
}
function seed(x, r, T, { c = ['#fffbe0', '#ffd23a', '#c86a08'] } = {}) {
  const [cx, cy] = pt(T, 0, 0); rays(x, r, cx, cy, { n: 30, r0: 10, len: [24, 54], w: [2, 5], c: ['#ffe28a', '#ffffff'], alpha: 0.5 }); glow(x, cx, cy, 44, '#ffc840', 0.8);
  const p = P('M0-34C20-22 22 14 0 34C-22 14-20-22 0-34Z', T); solid(x, p, RG(x, T, -6, -10, 40, [[0, c[0]], [0.4, c[1]], [1, c[2]]]), { sd: 3 });
  stroke(x, P('M0-30C6-10 6 10 0 30', T), 'rgba(140,60,0,0.5)', 1.2); leaves(x, r, [[pt(T, 0, -32)[0], pt(T, 0, -32)[1], -60, 0.6 * (T.s || 1)]]);
}
function fang(x, T) {
  solid(x, P('M-10-44C10-40 22-20 18 6C16 24 8 38 0 48C2 30 2 10-4-10C-8-24-14-34-10-44Z', T), LG(x, T, -14, 0, 20, 0, 'ivory'), { sd: 3 });
  solid(x, P('M-16-46C-6-52 8-48 12-40L-10-36C-12-40-14-42-16-46Z', T), LG(x, T, 0, -50, 0, -36, 'wood'), { shadow: false, sd: 1.5 });
  stroke(x, P('M-30-52C-16-56 0-56 14-50', T), '#5a2a10', 2); for (const xx of [-24, -8]) solid(x, P(circ(xx, -54, 3.5), T), RG(x, T, xx - 1, -55, 4, [[0, '#ffe0a0'], [1, '#8a3a08']]), { shadow: false, sd: 0.8 });
}
function crown(x, T, { mat = 'silver', gemC = ['#eafcff', '#7ac8ff', '#0a2a5a'] } = {}) {
  solid(x, P('M-42 8L-46-28L-23-6L0-40L23-6L46-28L42 8Z', T), LG(x, T, -46, -40, 46, 8, mat), { sd: 3 });
  solid(x, P('M-43 6h86v20h-86z', T), LG(x, T, 0, 6, 0, 26, mat), { sd: 3 });
  for (const [gx, gy, rr] of [[-46, -30, 4], [46, -30, 4], [0, -42, 5], [-24, 16, 4], [24, 16, 4]]) solid(x, P(circ(gx, gy, rr), T), RG(x, T, gx - 1, gy - 1, rr + 2, [[0, '#fff'], [0.4, gemC[1]], [1, gemC[2]]]), { shadow: false, sd: 1 });
  solid(x, P('M-6 9A10 10 0 1 0 6 23A8 8 0 1 1-6 9Z', T), RG(x, T, 0, 16, 12, [[0, '#ffffff'], [0.5, '#e0f0ff'], [1, '#7aa8d8']]), { shadow: false, sd: 1 });
}
function bell(x, T, { mat = 'bronze' } = {}) {
  solid(x, P('M-6-48a6 6 0 1 1 12 0v6h-12z', T), across(x, T, 6, mat), { sd: 2 });
  solid(x, P('M-30 24C-30-8-24-36 0-40C24-36 30-8 30 24L37 32H-37Z', T), LG(x, T, -37, 0, 37, 0, mat), { sd: 4 });
  for (const y of [-22, 8, 20]) stroke(x, P(`M${-24 - (y + 22) * 0.12} ${y}H${24 + (y + 22) * 0.12}`, T), 'rgba(60,24,6,0.5)', 1.4);
  solid(x, P(circ(0, 38, 6), T), RG(x, T, -2, 36, 7, [[0, '#fff0c0'], [0.5, '#c88a3a'], [1, '#3a1a06']]), { shadow: false, sd: 1 });
}
function bracelet(x, T, { mat = 'silver', gemC = '#7ae0ff' } = {}) {
  const m = M(T), p = new Path2D(), e1 = new Path2D(), e2 = new Path2D(); e1.ellipse(0, 0, 40, 26, 0, 0, TAU); e2.ellipse(0, 0, 30, 17, 0, 0, TAU, true); p.addPath(e1, m); p.addPath(e2, m);
  solid(x, p, LG(x, T, -40, -26, 40, 26, mat), { sd: 3 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, gx = Math.cos(a) * 35, gy = Math.sin(a) * 21.5; solid(x, P(circ(gx, gy, i % 2 ? 2.2 : 3.4), T), RG(x, T, gx - 1, gy - 1, 4, [[0, '#fff'], [0.4, i % 2 ? '#e0e8f0' : gemC], [1, '#0a2a3a']]), { shadow: false, sd: 0.8, rd: 0.5 }); }
}
function claws(x, r, T) {
  for (const [ox, a, s] of [[-18, -14, 0.9], [0, 0, 1.05], [18, 14, 0.9]]) { const T2 = { cx: pt(T, ox, 6)[0], cy: pt(T, ox, 6)[1], deg: (T.deg || 0) + a, s: (T.s || 1) * s }; solid(x, P('M-6 30C-14 4-10-24 6-48C0-20 4 6 8 28Z', T2), LG(x, T2, -10, 0, 8, 0, 'ivory'), { sd: 2.5 }); }
  solid(x, P('M-34 30C-30 20 30 20 34 30L30 46H-30Z', T), LG(x, T, 0, 22, 0, 46, [[0, '#e8a040'], [0.5, '#a05a12'], [1, '#3a1a04']]), { sd: 3 });
  for (const xx of [-20, -6, 8, 22]) stroke(x, P(`M${xx} 26l4 16`, T), 'rgba(20,8,0,0.7)', 2.4);
}
function scepter(x, r, T, { mat = 'gold', starC = '#fff4b0' } = {}) {
  solid(x, P('M-3.2-22h6.4v88h-6.4z', T), across(x, T, 3.2, mat), { sd: 2 });
  for (const y of [-14, 20, 54]) solid(x, P(`M-6 ${y}h12v5h-12z`, T), across(x, T, 6, mat), { shadow: false, sd: 1 });
  const [cx, cy] = pt(T, 0, -40); glow(x, cx, cy, 34, '#b8a8ff', 0.7);
  const ringP = new Path2D(); ringP.ellipse(cx, cy, 28 * (T.s || 1), 10 * (T.s || 1), ((T.deg || 0) - 20) * Math.PI / 180, 0, TAU); stroke(x, ringP, 'rgba(220,200,255,0.8)', 1.6, 1, 'lighter');
  const st = P('M0-24L6-8L23-8L9 2L14 19L0 9L-14 19L-9 2L-23-8L-6-8Z', { cx, cy, deg: T.deg || 0, s: T.s || 1 });
  solid(x, st, RG(x, { cx, cy, s: T.s || 1 }, -4, -6, 26, [[0, '#ffffff'], [0.45, starC], [1, '#a06a10']]), { sd: 2.5 });
}
function helmet(x, T, { mat = 'bronze', horn = 'ivory' } = {}) {
  for (const s of [-1, 1]) solid(x, P(`M${-28 * s}-14C${-50 * s}-22 ${-58 * s}-46 ${-46 * s}-64C${-44 * s}-44 ${-36 * s}-32 ${-24 * s}-28Z`, T), LG(x, T, -40 * s, -60, -24 * s, -14, horn), { sd: 3 });
  solid(x, P('M-34 12C-34-24-18-44 0-44C18-44 34-24 34 12L34 32L18 34L15 4H-15L-18 34L-34 32Z', T), LG(x, T, -34, -44, 34, 34, mat), { sd: 4 });
  solid(x, P('M-4-42h8v58h-8z', T), across(x, T, 4, 'gold'), { shadow: false, sd: 1 });
  stroke(x, P('M-33 0C-20-6 20-6 33 0', T), 'rgba(255,240,200,0.6)', 1.2);
  for (const xx of [-24, 24]) solid(x, P(circ(xx, -14, 2.6), T), RG(x, T, xx, -15, 3, [[0, '#fff'], [1, '#8a5a1a']]), { shadow: false, sd: 0.6 });
}
function roundShield(x, r, T, { rim = 'gold', face = ['#ffd860', '#c86a10'] } = {}) {
  solid(x, P(circ(0, 0, 46), T), LG(x, T, -46, -46, 46, 46, rim), { sd: 4 });
  solid(x, P(circ(0, 0, 38), T), RG(x, T, -8, -10, 50, [[0, face[0]], [0.6, face[1]], [1, '#4a1a04']]), { shadow: false, sd: 2 });
  for (let i = 0; i < 12; i++) { const T2 = { ...T, deg: (T.deg || 0) + i * 30 }; fillA(x, P('M-4-16L0-34L4-16Z', T2), LG(x, T2, 0, -34, 0, -16, [[0, '#fffbe0'], [1, '#ffb030']])); }
  const [cx, cy] = pt(T, 0, 0); glow(x, cx, cy, 26, '#ffd040', 0.9);
  solid(x, P(circ(0, 0, 13), T), RG(x, T, -4, -4, 16, [[0, '#ffffff'], [0.4, '#ffe070'], [1, '#c86a08']]), { shadow: false, sd: 1.5 });
}

// —— khung theo bậc ——
const FRAME = { 1: ['#f2c49a', '#8a4e22', '#3a1a08'], 2: ['#ffffff', '#9aa6ba', '#2a303c'], 3: ['#fff2b0', '#d8a032', '#4a2a06'] };
function finishItem(x, tier) {
  bloom(x, 0.42);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.08; x.drawImage(grain(), 0, 0); x.restore();
  x.save();
  x.fillStyle = rad(x, 64, 60, 92, [[0.55, '#000000', 0], [0.85, '#000000', 0.35], [1, '#000000', 0.7]]); x.fillRect(0, 0, 128, 128);
  x.fillStyle = lin(x, 0, 0, 0, 50, [[0, '#ffffff', 0.16], [1, '#ffffff', 0]]); x.beginPath(); x.ellipse(64, 14, 60, 26, 0, 0, TAU); x.fill();
  const rr = (p, a, rad_) => { const q = new Path2D(); q.roundRect(a, a, 128 - 2 * a, 128 - 2 * a, rad_); return q; };
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; x.fill(rr(null, 1.5, 16)); x.globalCompositeOperation = 'source-over';
  const [hi, mid, lo] = FRAME[tier] || FRAME[1], w = tier === 3 ? 4.2 : tier === 2 ? 3.4 : 2.8;
  x.lineWidth = w + 2; x.strokeStyle = 'rgba(4,4,8,0.95)'; x.stroke(rr(null, 1.5 + w / 2, 15));
  x.lineWidth = w; x.strokeStyle = lin(x, 0, 0, 128, 128, [[0, hi], [0.3, mid], [0.55, lo], [0.75, mid], [1, hi]]); x.stroke(rr(null, 1.5 + w / 2, 15));
  x.lineWidth = 0.8; x.strokeStyle = col(hi === '#ffffff' ? '#ffffff' : '#fff6d8', 0.5); x.stroke(rr(null, 2.5 + w, 12));
  if (tier === 3) for (const [cx, cy, a] of [[9, 9, 0], [119, 9, 90], [119, 119, 180], [9, 119, 270]]) { // chạm góc vàng
    const T = { cx, cy, deg: a, s: 1 }; solid(x, P('M-4-4L14-4C8 0 4 2 2 8C0 4-2 2-4 14Z', T), lin(x, cx - 6, cy - 6, cx + 10, cy + 10, [[0, hi], [0.5, mid], [1, lo]]), { shadow: false, sd: 1, rd: 0.6 });
    solid(x, P(circ(3, 3, 2.4), T), rad(x, cx, cy, 4, [[0, '#ffffff'], [0.5, '#ff6a6a'], [1, '#5a0010']]), { shadow: false, sd: 0.5, rd: 0.4 });
  }
  x.restore();
}

// —— từng món: nền (c0, c1) + vẽ ——
const C = (cx = 64, cy = 64, deg = 0, s = 1) => ({ cx, cy, deg, s });
const ITEM = {
  kiem_sat: ['#9ab4d8', '#1e2a44', (x, r) => { rays(x, r, 64, 60, { n: 18, r0: 10, len: [30, 60], w: [2, 4], c: '#c8dcff', alpha: 0.25 }); sword(x, C(64, 66, 45, 0.92), { gem: '#4a8aff' }); sparks(x, r, 6, [20, 20, 108, 108], '#e8f0ff'); }],
  riu_dong: ['#e09a5a', '#3a1a0a', (x, r) => { glow(x, 70, 50, 50, '#ff9a40', 0.4); axe(x, C(60, 66, 30, 0.95)); sparks(x, r, 8, [60, 20, 110, 70], '#ffd08a'); }],
  gang_tay_da: ['#c89a62', '#3a2410', (x, r) => { streaks(x, r, -0.7, { n: 10, box: [60, 20, 120, 70], len: [16, 36], c: '#ffe0b0', alpha: 0.45 }); glove(x, C(60, 66, -14, 0.95)); }],
  dao_nho: ['#7ad8d0', '#0a2a30', (x, r) => { streaks(x, r, -0.8, { n: 12, box: [40, 10, 120, 70], len: [16, 40], c: '#bfffff', alpha: 0.5 }); knife(x, C(60, 70, 40, 1.15), { gem: '#30e0c0' }); }],
  ngoc_trang: ['#c8d8ff', '#141a40', (x, r) => { stars(x, r, 10, [10, 10, 118, 118], '#d8e4ff'); orb(x, r, C(64, 62, 0, 1.05), { c: ['#ffffff', '#dfe8ff', '#5a6aa8'], swirlC: '#ffffff' }); fillA(x, P('M8-26A28 28 0 1 0 8 26A22 22 0 1 1 8-26Z', C(56, 62, 0, 0.9)), 'rgba(40,50,110,0.35)'); }],
  sach_co: ['#c08060', '#2a0e1a', (x, r) => { sparks(x, r, 8, [20, 16, 108, 60], '#ffd8a0'); book(x, C(64, 66, -8, 0.95)); }],
  ngoc_luu_ly: ['#6aa8ff', '#0a1440', (x, r) => { rays(x, r, 64, 58, { n: 26, r0: 8, len: [30, 60], w: [2, 5], c: ['#8ac8ff', '#ffffff'], alpha: 0.35 }); gem(x, C(64, 62, 0, 1.05)); }],
  tui_hat: ['#a8d86a', '#1a3010', (x, r) => { glow(x, 64, 60, 50, '#c8ff8a', 0.35); pouch(x, r, C(64, 62, 0, 0.95)); }],
  ao_da: ['#c8905a', '#2a1408', (x, r) => { chest(x, r, C(64, 64, 0, 1), { mat: 'leather', trim: 'bronze', variant: 'leather' }); }],
  ao_lua: ['#e0a0e8', '#2a0a3a', (x, r) => { wisps(x, r, 4, 64, 64, '#ffd0ff', 44); cloak(x, r, C(64, 66, 0, 0.95), { c: ['#f6c8ff', '#6a1a8a'], clasp: '#ff8ad8' }); }],
  hat_nang: ['#ffd86a', '#4a2a04', (x, r) => { seed(x, r, C(64, 64, 20, 1)); sparks(x, r, 10, [16, 16, 112, 112], '#fff0a0'); }],
  chuong_dong: ['#e8b468', '#1a2a2a', (x, r) => { const T = C(64, 64, 0, 1); for (const k of [1, 2]) { const p = new Path2D(); p.arc(64, 64, 34 + k * 10, -2.4, -0.7); stroke(x, p, 'rgba(255,220,150,0.5)', 1.6, 1, 'lighter'); const q = new Path2D(); q.arc(64, 64, 34 + k * 10, -2.4 + Math.PI, -0.7 + Math.PI); stroke(x, q, 'rgba(255,220,150,0.4)', 1.4, 1, 'lighter'); } bell(x, T); }],
  vong_bac: ['#a8e8ff', '#0a2030', (x, r) => { sparks(x, r, 10, [16, 16, 112, 112], '#e8ffff'); bracelet(x, C(64, 66, -18, 1)); }],
  giay_co: ['#9ad870', '#14300e', (x, r) => { boot(x, r, C(60, 66, 0, 0.95), { mat: 'jade', cuff: 'wood', variant: 'leaf' }); }],
  giay_chien: ['#d88a6a', '#2a1010', (x, r) => { rays(x, r, 64, 64, { n: 18, r0: 14, len: [30, 60], w: [3, 6], c: '#ffb08a', alpha: 0.25 }); boot(x, r, C(60, 66, 0, 0.95), { mat: 'steel', cuff: 'gold', sole: '#1a1a20', variant: 'plate' }); }],
  giay_toc_chien: ['#ffb44a', '#3a1404', (x, r) => { streaks(x, r, 0, { n: 16, box: [60, 20, 124, 110], len: [20, 50], w: [1.5, 3.5], c: '#ffe0a0', alpha: 0.6 }); boot(x, r, C(56, 66, -6, 0.95), { mat: 'crimson', cuff: 'gold', variant: 'bolt' }); bolt(x, r, 100, 18, 84, 56, '#ffe070'); }],
  giay_phap_su: ['#b47aff', '#1a0a3a', (x, r) => { stars(x, r, 12, [10, 10, 118, 118], '#e0c8ff'); boot(x, r, C(60, 66, 0, 0.95), { mat: 'violet', cuff: 'gold', variant: 'stars' }); }],
  giay_tinh_tam: ['#7ac0ff', '#0a1a3a', (x, r) => { swirl(x, r, 64, 64, { arms: 5, r0: 20, r1: 60, turns: 0.5, w: [1, 3], c: '#bfe0ff', alpha: 0.4 }); boot(x, r, C(60, 66, 0, 0.95), { mat: 'ice', cuff: 'silver', variant: 'clock' }); }],
  giay_kien_nhan: ['#6ad0b0', '#0a2a24', (x, r) => { glow(x, 64, 60, 50, '#8affd8', 0.35); boot(x, r, C(60, 66, 0, 0.95), { mat: 'emerald', cuff: 'gold', variant: 'shield' }); }],
  giay_lu_hanh: ['#8ad0ff', '#14243a', (x, r) => { streaks(x, r, -0.3, { n: 10, box: [70, 20, 124, 100], len: [20, 40], c: '#e8f8ff', alpha: 0.5 }); boot(x, r, C(64, 68, 0, 0.92), { mat: 'leather', cuff: 'silver', variant: 'wings2' }); }],
  huyet_kiem: ['#ff4a4a', '#2a0206', (x, r) => { rays(x, r, 64, 60, { n: 26, r0: 10, len: [30, 66], w: [2, 6], c: ['#ff3a3a', '#ff9a8a'], alpha: 0.35 }); sword(x, C(64, 64, 45, 1), { blade: 'crimson', hilt: 'dark', grip: 'dark', gem: '#ff2030' }); drops(x, r, 6, [24, 60, 70, 112]); }],
  thuong_pha_giap: ['#ffb060', '#2a1206', (x, r) => { kite(x, C(46, 76, -12, 0.62), { face: ['#8a929c', '#2a3038'] }); stroke(x, P('M-12-20L-2-6L-8 4L4 18', C(46, 76, -12, 0.62)), '#0a0c10', 2.2); spear(x, C(72, 60, 40, 0.95)); sparks(x, r, 12, [30, 50, 80, 100], '#ffd08a'); }],
  luoi_huyet_nguyet: ['#ff4a6a', '#1a0418', (x, r) => { const [mx, my] = [84, 34]; glow(x, mx, my, 26, '#ffd0d0', 0.7); fillA(x, P(circ(0, 0, 14), C(mx, my)), rad(x, mx - 3, my - 3, 16, [[0, '#ffffff'], [0.6, '#ffc0c0'], [1, '#c04050']])); crescent(x, C(60, 74, -30, 1), { mat: 'crimson', thick: 18 }); sparks(x, r, 8, [20, 30, 110, 110], '#ff8a9a'); }],
  cung_gio: ['#7ae8b0', '#062a1e', (x, r) => { swirl(x, r, 64, 64, { arms: 6, r0: 10, r1: 62, turns: 0.7, w: [1.5, 4], c: ['#c8ffe8', '#6affb8'], alpha: 0.45 }); bow(x, C(60, 64, -40, 0.92), { limb: 'jade', tip: 'gold' }); leaves(x, r, [[96, 30, 20, 0.6], [24, 98, 200, 0.55], [100, 100, -30, 0.5]]); }],
  dao_trang_khuyet: ['#8ab0ff', '#060a2a', (x, r) => { stars(x, r, 12, [10, 10, 118, 118], '#d0e0ff'); glow(x, 64, 60, 46, '#9ac0ff', 0.5); crescent(x, C(60, 72, 15, 0.95), { mat: 'silver', handle: 'dark', R: 44, thick: 12 }); }],
  bua_than_ren: ['#ff8a2a', '#2a0a02', (x, r) => { flames(x, r, 64, 112, 1.3, 9); hammer(x, C(64, 62, -30, 0.95)); sparks(x, r, 16, [20, 20, 110, 90], ['#ffe0a0', '#ff8a2a'], [0.6, 1.4]); }],
  kiem_bao_tap: ['#6ab8ff', '#060e2a', (x, r) => { for (const [a, b, c2, d] of [[20, 10, 50, 60], [110, 14, 80, 64], [30, 118, 56, 76]]) bolt(x, r, a, b, c2, d); sword(x, C(64, 64, 45, 1), { blade: 'ice', hilt: 'silver', grip: 'dark', gem: '#8ae8ff' }); bolt(x, r, 96, 30, 64, 64, '#bfefff', 1.6); }],
  cung_bang_lam: ['#8ae0ff', '#04203a', (x, r) => { shards(x, r, 12, [12, 12, 116, 116]); bow(x, C(60, 64, -40, 0.92), { limb: 'ice', tip: 'silver', string: '#e8fbff' }); glow(x, 98, 34, 20, '#bff4ff', 0.7); }],
  vuot_ho: ['#ffb43a', '#2a1404', (x, r) => { for (const k of [0, 1, 2]) { const T = C(64 + (k - 1) * 18, 58, 25, 1); fillA(x, P('M-3-50C2-20 2 20-3 50C6 20 6-20-3-50Z', T), 'rgba(255,230,160,0.7)', 'lighter'); } claws(x, r, C(64, 66, 0, 0.92)); }],
  riu_bao_quan: ['#ff3a2a', '#1a0204', (x, r) => { flames(x, r, 64, 118, 1.4, 10, ['#ffd0a0', '#ff3a1a', '#8a0000']); axe(x, C(64, 66, 0, 0.92), { blade: 'dark', haft: 'dark', double: true, band: 'crimson' }); glow(x, 64, 50, 20, '#ff2a1a', 0.6); }],
  mat_na_hoi_sinh: ['#6affe0', '#06221e', (x, r) => { rays(x, r, 64, 60, { n: 34, r0: 16, len: [30, 66], w: [2, 6], c: ['#a8fff0', '#ffe8a0'], alpha: 0.4 }); mask(x, C(64, 64, 0, 0.95)); }],
  truong_song: ['#5ad8ff', '#04203a', (x, r) => { wisps(x, r, 5, 64, 60, '#8ae8ff', 46); staff(x, r, C(64, 70, 28, 0.9), { head: 'silver', orbC: ['#ffffff', '#4ad0ff', '#04307a'] }); }],
  mu_sam: ['#9a6aff', '#120632', (x, r) => { bolt(x, r, 94, 8, 76, 48, '#d8b8ff'); bolt(x, r, 24, 14, 44, 46, '#d8b8ff'); hat(x, C(64, 70, -6, 1)); bolt(x, r, 70, 30, 56, 62, '#ffffff', 1.4); }],
  sach_pha_gioi: ['#ff6ad8', '#1a0424', (x, r) => { swirl(x, r, 64, 60, { arms: 6, r0: 6, r1: 60, turns: 1, w: [1.5, 4], c: ['#ff9ae8', '#c86aff'], alpha: 0.4 }); book(x, C(64, 66, 8, 0.95), { cover: ['#7a2a8a', '#1a0624'], trim: 'silver', rune: '#ff8af0' }); }],
  nhan_huyet_phach: ['#ff4a5a', '#1a0208', (x, r) => { glow(x, 64, 46, 36, '#ff3040', 0.6); ring(x, C(64, 68, 0, 1)); drops(x, r, 5, [40, 84, 90, 116]); }],
  binh_suong_dong: ['#9ae8ff', '#061c34', (x, r) => { shards(x, r, 10, [12, 12, 116, 116]); wisps(x, r, 4, 64, 64, '#d8f8ff', 40); hourglass(x, C(64, 64, 0, 1)); }],
  ngoc_bang: ['#7ae0ff', '#04203a', (x, r) => { glow(x, 64, 60, 50, '#a8f0ff', 0.5); crystals(x, C(64, 72, 0, 0.95)); sparks(x, r, 10, [16, 16, 112, 112], '#e8fcff'); }],
  truong_hoa_than: ['#ff7a1a', '#2a0602', (x, r) => { flames(x, r, 64, 70, 1.3, 9); staff(x, r, C(64, 72, 26, 0.92), { shaft: 'dark', head: 'gold', orbC: ['#fff4c0', '#ff8a1a', '#7a1000'] }); sparks(x, r, 12, [20, 10, 110, 80], ['#ffd08a', '#ff7a2a']); }],
  quyen_truong_tinh_tu: ['#a89aff', '#0a0626', (x, r) => { stars(x, r, 18, [8, 8, 120, 120], '#e0d8ff'); scepter(x, r, C(64, 70, 22, 0.95)); }],
  vuong_mien_nguyet: ['#c8e0ff', '#0a1430', (x, r) => { rays(x, r, 64, 56, { n: 30, r0: 14, len: [30, 60], w: [2, 5], c: ['#e8f4ff', '#a8c8ff'], alpha: 0.35 }); crown(x, C(64, 70, 0, 1)); }],
  den_hon_lam: ['#5aa8ff', '#040a26', (x, r) => { wisps(x, r, 6, 64, 66, '#7ac8ff', 46); lantern(x, 64, 66, 1.35, ['#e8fbff', '#5ab8ff', '#0a2a8a']); glow(x, 64, 66, 40, '#4aa8ff', 0.7); sparks(x, r, 10, [20, 20, 108, 108], '#a8e0ff'); }],
  khien_da: ['#a8b8a0', '#141c18', (x, r) => { kite(x, C(64, 62, 0, 0.98), { face: ['#9aa29a', '#3a423e'], rim: 'stone' }); stroke(x, P('M-20-26L-6-14L-12 0M8-30L14-12L28-6', C(64, 62, 0, 0.98)), 'rgba(20,24,22,0.6)', 1.2); leaves(x, r, [[34, 98, -30, 0.6], [90, 34, 160, 0.5]]); }],
  giap_gai: ['#9ac06a', '#14200a', (x, r) => { chest(x, r, C(64, 64, 0, 1), { mat: 'dark', trim: 'steel', variant: 'spikes' }); drops(x, r, 3, [30, 30, 100, 60], '#ff2a2a'); }],
  ao_choang_suong: ['#c8e8ff', '#0e1a30', (x, r) => { wisps(x, r, 7, 64, 66, '#e8f8ff', 50); cloak(x, r, C(64, 64, 0, 0.98), { c: ['#e8f4ff', '#4a6a9a'], clasp: '#7ae8ff' }); }],
  tim_co_thu: ['#8ad860', '#0e2008', (x, r) => { heart(x, C(64, 66, 0, 0.92)); leaves(x, r, [[52, 26, -120, 0.8], [70, 24, -50, 0.85], [62, 22, -90, 0.6]]); sparks(x, r, 8, [20, 20, 108, 108], '#c8ffa0'); }],
  giap_den_long: ['#ffb05a', '#2a1006', (x, r) => { glow(x, 64, 70, 50, '#ffb040', 0.4); chest(x, r, C(64, 64, 0, 1), { mat: 'bronze', trim: 'gold', variant: 'lantern' }); }],
  giap_vay_rong: ['#4ae0b0', '#04221c', (x, r) => { rays(x, r, 64, 64, { n: 20, r0: 20, len: [30, 60], w: [3, 6], c: '#8affd8', alpha: 0.25 }); chest(x, r, C(64, 64, 0, 1), { mat: 'emerald', trim: 'gold', variant: 'scales' }); }],
  khien_mat_troi: ['#ffd04a', '#3a1a02', (x, r) => { rays(x, r, 64, 64, { n: 40, r0: 30, len: [20, 40], w: [2, 5], c: ['#fff0a0', '#ffb030'], alpha: 0.45 }); roundShield(x, r, C(64, 64, 0, 1)); }],
  ao_choang_bong_dem: ['#7a5ad8', '#08041a', (x, r) => { stars(x, r, 8, [10, 10, 118, 118], '#b8a0ff'); cloak(x, r, C(64, 64, 0, 0.98), { c: ['#5a4a8a', '#0a0620'], clasp: '#c86aff', variant: 'night' }); }],
  mu_chien_than: ['#ff9a5a', '#2a0e06', (x, r) => { rays(x, r, 64, 56, { n: 24, r0: 16, len: [30, 60], w: [2, 6], c: '#ffc89a', alpha: 0.3 }); helmet(x, C(64, 72, 0, 0.92)); }],
  den_dong_hanh: ['#ffc06a', '#2a1404', (x, r) => { lantern(x, 64, 64, 1.2); sparks(x, r, 10, [20, 20, 108, 108], '#ffe0a0'); }],
  nanh_thu_rung: ['#8ad86a', '#0a1e08', (x, r) => { for (const k of [0, 1, 2]) fillA(x, P('M-3-50C2-20 2 20-3 50C6 20 6-20-3-50Z', C(48 + k * 16, 64, -30, 1)), 'rgba(200,255,170,0.45)', 'lighter'); fang(x, C(66, 64, 18, 1)); }],
  den_soi_duong: ['#ffe08a', '#3a2006', (x, r) => { rays(x, r, 64, 64, { n: 44, r0: 16, len: [30, 66], w: [2, 6], c: ['#fff4c0', '#ffc860'], alpha: 0.45 }); lantern(x, 64, 66, 1.45, ['#ffffff', '#ffd860', '#d86a10']); }],
};

/** Ảnh icon trang bị (data URL), hoặc null nếu chưa có hình vẽ riêng / không có DOM. */
export function itemArtURL(id, tier = 1) {
  if (typeof document === 'undefined' || !ITEM[id]) return null;
  if (cache.has(id)) return cache.get(id);
  const [c0, c1, draw] = ITEM[id], x = mk(), r = rngFor([...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 11) >>> 0);
  backdrop(x, c0, c1); draw(x, r); finishItem(x, tier);
  const url = x.canvas.toDataURL('image/png'); cache.set(id, url); return url;
}
export const ITEM_ART_IDS = Object.keys(ITEM);
void S;
