// Icon trang bị vẽ tay bằng canvas (mỗi món một hình riêng, tự vẽ — docs/01 §5): vật thể kim loại/đá quý/vải/gỗ có khối
// (chuyển sắc kim loại theo bề ngang vật, viền sáng trên-trái, bóng dưới-phải, đổ bóng), hiệu ứng năng lượng theo chất món
// (lửa, băng, sét, máu, gió, sao, sương), nền toả sáng theo màu chủ đề, bloom, hạt nhiễu; khung vuông bo góc theo bậc
// (đồng: thành phần, bạc: giày, vàng chạm góc: đồ hoàn chỉnh). Toạ độ vẽ 0..128 (ảnh 256²). Sinh một lần rồi lưu đệm.
import { rngFor } from '../render/env/noise.js';
import { mk, layer, blurred, lin, rad, tp, ribbon, linePts, rays, streaks, sparks, swirl, solid, shine, bloom, glow, grain, lantern, TAU, K, S, atmos, grade, mix, setAccent, begin } from './paint.js';

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
function backdrop(x, c0, c1, seed, cx = 64, cy = 58) {
  x.fillStyle = rad(x, cx, cy, 100, [[0, c0], [0.42, c1], [1, '#05050c']]); x.fillRect(0, 0, 128, 128);
  setAccent(c0); atmos(x, cx, cy, c0, 96, seed);
}
function bolt(x, r, x0, y0, x1, y1, c = '#9fe6ff', w = 2.2, branch = true) {
  const n = 10, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const t = i / n, j = r.range(-7, 7); pts.push([x0 + (x1 - x0) * t - (y1 - y0) / 60 * j, y0 + (y1 - y0) * t + (x1 - x0) / 60 * j]); }
  pts.push([x1, y1]); const p = new Path2D(); pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b)));
  if (branch) for (const i of [3, 6]) { const [a, b] = pts[i], ang = Math.atan2(y1 - y0, x1 - x0) + r.range(-0.9, 0.9), L = r.range(8, 16); p.moveTo(a, b); p.lineTo(a + Math.cos(ang) * L * 0.5 + r.range(-3, 3), b + Math.sin(ang) * L * 0.5 + r.range(-3, 3)); p.lineTo(a + Math.cos(ang) * L, b + Math.sin(ang) * L); }
  x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = c; x.shadowBlur = 10 * K; stroke(x, p, c, w * 2.4, 0.65); x.restore();
  stroke(x, p, c, w * 1.2, 0.9, 'lighter'); stroke(x, p, '#ffffff', w * 0.6, 1, 'lighter');
}
/** Một lưỡi lửa uốn: chân tròn, thân lượn, đỉnh nhọn. */
function tongue(bx, by, w, h, lean, wav = 0) {
  const p = new Path2D(), tx = bx + lean, ty = by - h;
  p.moveTo(bx - w, by);
  p.bezierCurveTo(bx - w * 1.15, by - h * 0.35, bx - w * 0.25 + wav, by - h * 0.55, tx - w * 0.2 + wav * 0.5, by - h * 0.8);
  p.quadraticCurveTo(tx - wav * 0.3, ty + h * 0.08, tx, ty);
  p.quadraticCurveTo(tx + w * 0.3, by - h * 0.72, bx + w * 0.45 + wav * 0.6, by - h * 0.48);
  p.bezierCurveTo(bx + w * 1.15, by - h * 0.3, bx + w, by - h * 0.1, bx + w, by);
  p.quadraticCurveTo(bx, by + w * 0.7, bx - w, by); return p;
}
/** Lửa vẽ tay: quầng nền, lưỡi lửa mờ phía sau, lưỡi lửa sắc, lõi trắng vàng, tàn lửa bay. */
function flames(x, r, cx, cy, s, n = 7, c = ['#fff2a0', '#ffa020', '#e0300a']) {
  glow(x, cx, cy - 16 * s, 46 * s, c[1], 0.55);
  const T = Array.from({ length: n + 3 }, () => [cx + r.range(-22, 22) * s, r.range(10, 15) * s, r.range(26, 52) * s, r.range(-10, 10) * s, r.range(-6, 6) * s]);
  const l = mk(); for (const [bx, w, h, le, wa] of T) { l.fillStyle = lin(l, bx, cy, bx + le, cy - h * 1.2, [[0, c[2], 0.9], [0.5, c[1], 0.7], [1, c[1], 0]]); l.fill(tongue(bx, cy, w * 1.3, h * 1.25, le, wa)); }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.85; x.imageSmoothingQuality = 'high'; x.drawImage(blurred(l.canvas, 10), 0, 0, S, S); x.restore();
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const [bx, w, h, le, wa] of T) { x.fillStyle = lin(x, bx, cy + 4, bx + le, cy - h, [[0, c[2], 0.0], [0.12, c[2], 0.85], [0.45, c[1], 0.8], [0.8, c[0], 0.55], [1, c[0], 0]]); x.fill(tongue(bx, cy, w, h, le, wa)); }
  for (const [bx, w, h, le, wa] of T.slice(0, n)) { x.fillStyle = lin(x, bx, cy, bx + le * 0.5, cy - h * 0.55, [[0, '#ffffff', 0.0], [0.2, '#ffffff', 0.7], [0.6, c[0], 0.6], [1, c[0], 0]]); x.fill(tongue(bx, cy, w * 0.45, h * 0.55, le * 0.5, wa * 0.4)); }
  for (let i = 0; i < 10; i++) { const X = cx + r.range(-30, 30) * s, Y = cy - r.range(20, 70) * s, L = r.range(2, 6); x.fillStyle = lin(x, X, Y + L, X, Y, [[0, c[1], 0], [1, '#fff6d0', 0.95]]); x.fill(ribbon(linePts(X - 0.6, Y + L, X, Y, 4), (t) => 0.3 + 1.1 * t)); }
  x.restore();
}
function shards(x, r, n, box, c = ['#e8fbff', '#8ad8ff']) {
  for (let i = 0; i < n; i++) {
    const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), h = r.range(5, 13), a = r.range(0, 360), T = { cx: X, cy: Y, deg: a, s: 1 };
    const p = P(`M0 ${-h}L${h * 0.3} ${-h * 0.1}L${h * 0.1} ${h * 0.45}L${-h * 0.28} ${h * 0.05}Z`, T); glow(x, X, Y, h * 1.3, c[1], 0.35);
    fillA(x, p, LG(x, T, -4, 0, 4, 0, 'ice')); fillA(x, P(`M0 ${-h}L${h * 0.3} ${-h * 0.1}L0 0Z`, T), 'rgba(255,255,255,0.55)'); stroke(x, p, c[0], 0.4, 0.8);
  }
}
function drops(x, r, n, box, c = '#d0101e') { for (let i = 0; i < n; i++) { const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), s = r.range(0.6, 1.2), T = { cx: X, cy: Y, s }; const p = P('M0-7C3-2 5 1 5 3.5a5 5 0 0 1-10 0C-5 1-3-2 0-7Z', T); solid(x, p, RG(x, T, -1.5, 1, 7, [[0, '#ff9a9a'], [0.5, c], [1, '#3a0006']]), { shadow: false, rd: 0.8, sd: 1.5, surf: 0, ao: 0 }); fillA(x, P(circ(-1.6, 1.5, 1.1), T), 'rgba(255,255,255,0.85)'); } }
function stars(x, r, n, box, c = '#ffffff') { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const X = r.range(box[0], box[2]), Y = r.range(box[1], box[3]), s = r.range(1.2, 3.4); glow(x, X, Y, s * 3.4, c, 0.6); x.fillStyle = '#fff'; x.fill(P('M0-5L0.8-0.8L5 0L0.8 0.8L0 5L-0.8 0.8L-5 0L-0.8-0.8Z', { cx: X, cy: Y, s: s / 2.5 })); } x.restore(); }
function wisps(x, r, n, cx, cy, c = '#bfe8ff', R = 46) { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const a0 = r.range(0, TAU), sp = r.range(1.2, 2.2), pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30, a = a0 + t * sp, rr = R * (0.55 + 0.5 * t); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75]); } x.fillStyle = col(c, 0.32); x.fill(ribbon(pts, (t) => 6 * Math.sin(Math.PI * t))); x.fillStyle = col('#ffffff', 0.4); x.fill(ribbon(pts, (t) => 1.4 * Math.sin(Math.PI * t))); } x.restore(); }
const col = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function leaves(x, r, pts, c = ['#b4f070', '#2a7a20']) { for (const [X, Y, a, s] of pts) { const T = { cx: X, cy: Y, deg: a, s }; const p = P('M0 0C6-7 18-9 27-2C18 6 6 7 0 0Z', T); solid(x, p, LG(x, T, 0, -7, 0, 6, [[0, c[0]], [0.55, c[1]], [1, '#0e3a0a']]), { shadow: false, rd: 0.8, sd: 1.5, surf: 0.2, ao: 0 }); stroke(x, P('M2 0Q12-2 23-2', T), 'rgba(230,255,200,0.7)', 0.6); for (const k of [7, 12, 17]) stroke(x, P(`M${k} -1.2l3-3M${k} -1.2l3 2.6`, T), 'rgba(20,60,10,0.4)', 0.4); } }
// —— chi tiết chạm khắc ——
/** Nét khắc chìm: rãnh tối + gờ sáng lệch nửa điểm. */
function etch(x, p, a = 0.6, w = 0.9) { stroke(x, p, `rgba(0,0,0,${a})`, w); x.save(); x.translate(0.5, 0.6); stroke(x, p, `rgba(255,246,220,${a * 0.55})`, w * 0.5); x.restore(); }
/** Dây kim loại uốn (hoa văn cuộn): viền tối, thân kim loại, chỉ sáng. */
function wire(x, p, w, fill) { x.save(); x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 2 * K; x.shadowOffsetY = 0.8 * K; stroke(x, p, '#1a0e02', w + 1.3); x.restore(); stroke(x, p, fill, w); x.save(); x.translate(-0.3, -0.4); stroke(x, p, 'rgba(255,250,225,0.75)', w * 0.32); x.restore(); }
/** Đá quý cắt mài gắn ổ kim loại: ổ viền, mặt cắt sao, đáy tối, điểm loá. */
function jewel(x, T, cx, cy, R, c, bezel = 'gold') {
  solid(x, P(circ(cx, cy, R + 1.5), T), LG(x, T, cx - R, cy - R, cx + R, cy + R, bezel), { shadow: true, sd: 1, rd: 0.6, surf: 0, ao: 0 });
  const g = P(circ(cx, cy, R), T), [gx, gy] = pt(T, cx, cy), s = R * (T.s || 1);
  glow(x, gx, gy, s * 3.2, c, 0.45);
  fillA(x, g, rad(x, gx - s * 0.25, gy - s * 0.3, s * 1.35, [[0, '#ffffff'], [0.2, mix(c, 0.82)], [0.55, c], [1, mix(c, 0.12)]]));
  x.save(); x.clip(g); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 0.35; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + Math.cos(a) * s * 1.2, gy + Math.sin(a) * s * 1.2); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 0.4; x.beginPath(); x.arc(gx, gy, s * 0.5, 0, TAU); x.stroke();
  x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(gx + s * 0.35, gy + s * 0.4, s * 0.85, 0, TAU); x.arc(gx + s * 0.1, gy + s * 0.1, s * 0.95, 0, TAU, true); x.fill('evenodd');
  x.restore();
  x.save(); x.globalCompositeOperation = 'lighter'; glow(x, gx - s * 0.35, gy - s * 0.4, s * 0.9, '#ffffff', 0.9); x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(gx - s * 0.35, gy - s * 0.42, s * 0.28, s * 0.18, -0.6, 0, TAU); x.fill(); x.restore();
}
/** Hoa văn cuộn đối xứng (chữ S cuộn tròn hai đầu). */
const SCROLL = 'M0 0C3-6 10-7 13-3C15 0 13 4 10 3C8 2 9-1 11 0M0 0C-3 6-10 7-13 3C-15 0-13-4-10-3C-8-2-9 1-11 0';

// —— vật thể ——
/** Dải màu lưỡi vát hai mặt: nửa trái sáng, nửa phải tối, gờ giữa sắc. */
const bevel = (m) => { const k = MAT[m]; return [[0, k[0][1]], [0.07, k[1][1]], [0.45, k[3][1]], [0.5, k[2][1]], [0.56, k[0][1]], [0.92, k[2][1]], [1, k[4][1]]]; };
const RUNE = ['M-1.6-2L1.6 2M1.6-2L-1.6 2', 'M0-2.4V2.4M-1.8-1L1.8 1', 'M-1.8 2L0-2.4L1.8 2', 'M-1.6-2H1.6L-1.6 2H1.6'];
function sword(x, T, { blade = 'steel', hilt = 'gold', grip = 'leather', gem = '#ff3048', len = 1, wide = 1, rune = null } = {}) {
  const L = 70 * len, w = 7.2 * wide;
  const bp = P(`M${-w} 12L${-w * 0.86} ${-L + 20}L0 ${-L}L${w * 0.86} ${-L + 20}L${w} 12Z`, T);
  solid(x, bp, LG(x, T, -w, 0, w, 0, bevel(blade)), { sd: 2.5, rd: 1.1 });
  x.save(); x.clip(bp);
  stroke(x, P(`M${-w + 0.9} 12L${-w * 0.86 + 0.9} ${-L + 20}L0 ${-L + 1.6}`, T), 'rgba(255,255,255,0.85)', 1.1);
  stroke(x, P(`M${w - 0.9} 12L${w * 0.86 - 0.9} ${-L + 20}L0 ${-L + 1.6}`, T), 'rgba(0,0,0,0.35)', 1.2);
  x.fillStyle = LG(x, T, 0, -L, 0, -L + 30, [[0, '#ffffff', 0.6], [1, '#ffffff', 0]]); x.fill(bp); x.restore();
  etch(x, P(`M0 9V${-L * 0.58}`, T), 0.5, 2);
  if (rune) for (let i = 0; i < 4; i++) { const p = P(RUNE[i], { ...T, cx: pt(T, 0, 2 - i * L * 0.13)[0], cy: pt(T, 0, 2 - i * L * 0.13)[1], s: (T.s || 1) * 0.9 }); shine(x, p, rune, 3, 0.9); stroke(x, p, '#ffffff', 0.5, 0.9); }
  const g = P('M-33 12C-28 8-14 10 0 7C14 10 28 8 33 12C37 14 37 21 31 21C22 19 12 23 0 25C-12 23-22 19-31 21C-37 21-37 14-33 12Z', T);
  solid(x, g, LG(x, T, 0, 7, 0, 25, hilt), { sd: 2 });
  etch(x, P('M-26 15C-16 13-8 15 0 13C8 15 16 13 26 15', T), 0.45, 0.8);
  for (const s of [-1, 1]) solid(x, P(`M${s * 30} 12C${s * 33} 6 ${s * 31} 2 ${s * 27} 1C${s * 30} 5 ${s * 28} 9 ${s * 24} 11Z`, T), LG(x, T, 0, 0, 0, 14, hilt), { shadow: false, sd: 1, surf: 0, ao: 0 });
  for (const s of [-1, 1]) jewel(x, T, s * 34, 16.5, 2.6, gem, hilt);
  jewel(x, T, 0, 16, 4.6, gem, hilt);
  solid(x, P('M-4.6 25h9.2v26h-9.2z', T), across(x, T, 4.6, grip), { shadow: false, sd: 1.5 });
  for (let y = 26.5; y < 50; y += 3.4) etch(x, P(`M-4.4 ${y}l8.8 2.6`, T), 0.65, 0.9);
  solid(x, P('M-8 50h16l-3 5h-10z', T), across(x, T, 8, hilt), { shadow: false, sd: 1 });
  jewel(x, T, 0, 60, 5.2, gem, hilt);
}
function axe(x, T, { blade = 'bronze', haft = 'wood', double = false, band = 'gold', gemC = '#ff8a20' } = {}) {
  solid(x, P('M-4-54h8v114h-8z', T), across(x, T, 4, haft), { sd: 2 });
  for (const y of [28, 33, 38, 43]) etch(x, P(`M-3.8 ${y}l7.6 2.5`, T), 0.55, 0.9);
  solid(x, P('M-5.5 56h11l-1.5 6h-8z', T), across(x, T, 5.5, band), { shadow: false, sd: 1 });
  const edge = (m) => `M${4 * m}-46C${30 * m}-64 ${60 * m}-42 ${56 * m}-2C${54 * m} 9 ${50 * m} 17 ${45 * m} 24`;
  const b = (m) => edge(m) + `C${37 * m} 9 ${22 * m} 0 ${4 * m}-2Z`;
  for (const m of double ? [1, -1] : [1]) {
    const p = P(b(m), T); solid(x, p, LG(x, T, 0, -50, 54 * m, 10, blade), { sd: 3 });
    x.save(); x.clip(p); stroke(x, P(edge(m), T), LG(x, T, 30 * m, -60, 50 * m, 20, [[0, '#ffffff', 0.75], [0.5, '#ffffff', 0.35], [1, '#ffffff', 0.7]]), 9); stroke(x, P(edge(m), T), 'rgba(0,0,0,0.3)', 18, 0.35); stroke(x, P(edge(m), T), '#ffffff', 1.3, 0.9); x.restore();
    etch(x, P(`M${14 * m}-32C${24 * m}-38 ${36 * m}-30 ${34 * m}-18C${32 * m}-8 ${20 * m}-8 ${20 * m}-16C${20 * m}-22 ${27 * m}-24 ${29 * m}-19`, T), 0.55, 1.1);
  }
  if (!double) solid(x, P('M-4-42L-20-34L-24-30L-20-26L-4-20Z', T), LG(x, T, -24, -40, -4, -20, blade), { sd: 2 });
  solid(x, P('M-7-56h14v10h-14zM-6.5-6h13v8h-13z', T), across(x, T, 7, band), { shadow: false, sd: 1.2 });
  jewel(x, T, 0, -24, 4, gemC, band);
}
function knife(x, T, o = {}) { sword(x, T, { len: 0.62, wide: 1.3, ...o }); }
function crescent(x, T, { mat = 'crimson', handle = 'dark', R = 46, thick = 16 } = {}) {
  const h = R - thick, pts = [], inner = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = (-150 + 180 * t) * Math.PI / 180; pts.push(`${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`); }
  for (let i = 39; i >= 1; i--) { const t = i / 40, a = (-150 + 180 * t) * Math.PI / 180, rr = R - thick * Math.pow(Math.sin(Math.PI * t), 0.8); inner.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`); }
  const p = P('M' + pts.join('L') + 'L' + inner.join('L') + 'Z', T);
  const ring = mat === 'crimson' ? [[0.5, '#2a0006'], [0.68, '#a00c1c'], [0.86, '#ff5a6a'], [0.94, '#ffd0d0'], [1, '#ffffff']] : [[0.5, '#1a2030'], [0.68, '#6a7a98'], [0.86, '#dce8ff'], [0.94, '#ffffff'], [1, '#c8d8f0']];
  shine(x, p, mat === 'crimson' ? '#ff2a3a' : '#9ac8ff', 10, 0.5);
  solid(x, p, RG(x, T, 0, 0, R, ring), { sd: 2.5 });
  stroke(x, P('M' + pts.join('L'), T), '#ffffff', 1.2, 0.95);
  x.save(); x.clip(p); etch(x, P('M' + pts.map((q) => q.split(' ').map((v) => +v * 0.86).join(' ')).slice(8, 33).join('L'), T), 0.4, 1); x.restore();
  const u = [0.5, -0.866], d = h - 14, [hx, hy] = pt(T, u[0] * d, u[1] * d), T2 = { cx: hx, cy: hy, deg: (T.deg || 0) + 30, s: T.s || 1 };
  solid(x, P('M-4.5-12h9v30h-9z', T2), across(x, T2, 4.5, handle), { sd: 1.5 });
  for (let y = -8; y < 16; y += 3.4) etch(x, P(`M-4.3 ${y}l8.6 2.4`, T2), 0.5, 0.8);
  solid(x, P('M-12-17C-6-20 6-20 12-17L10-10H-10Z', T2), across(x, T2, 12, 'gold'), { shadow: false, sd: 1 });
  jewel(x, T2, 0, 22, 4.2, mat === 'crimson' ? '#ff2a3a' : '#7ab8ff');
}
function spear(x, T, { head = 'steel', shaft = 'wood' } = {}) {
  solid(x, P('M-2.8-30h5.6v98h-5.6z', T), across(x, T, 2.8, shaft), { sd: 2 });
  for (const y of [6, 30, 54]) solid(x, P(`M-3.6 ${y}h7.2v4h-7.2z`, T), across(x, T, 3.6, 'gold'), { shadow: false, sd: 0.8, surf: 0, ao: 0 });
  const bl = P('M0-72C11-58 12-44 4-30H-4C-12-44-11-58 0-72Z', T);
  solid(x, bl, LG(x, T, -11, 0, 11, 0, bevel(head)), { sd: 2.5 });
  x.save(); x.clip(bl); stroke(x, P('M-1-70C-10-58-10-44-4-30', T), 'rgba(255,255,255,0.85)', 1); x.restore();
  etch(x, P('M0-66V-33', T), 0.45, 1.2);
  for (const s of [-1, 1]) solid(x, P(`M${s * 3}-31C${s * 10}-33 ${s * 14}-29 ${s * 15}-23C${s * 10}-26 ${s * 6}-26 ${s * 3}-24Z`, T), across(x, T, 15, 'gold'), { shadow: false, sd: 1 });
  solid(x, P('M-5.5-31h11v9h-11z', T), across(x, T, 5.5, 'gold'), { shadow: false, sd: 1 });
  jewel(x, T, 0, -26, 2.6, '#ff3a2a');
  x.save(); for (let i = 0; i < 9; i++) { const a = -0.45 + i * 0.11, l = 20 + (i % 3) * 4, T2 = { ...T, deg: (T.deg || 0) + a * 57 }; fillA(x, P(`M-1.4-21C-3 ${-21 + l * 0.4} -0.8 ${-21 + l * 0.8} 0 ${-21 + l}C0.8 ${-21 + l * 0.8} 3 ${-21 + l * 0.4} 1.4-21Z`, T2), LG(x, T2, 0, -21, 0, -21 + l, [[0, '#ff6a4a'], [0.6, '#c81a10'], [1, '#5a0404']])); } x.restore();
}
function bow(x, T, { limb = 'wood', tip = 'gold', string = '#f4f0e0', arrow = true, glowC = null } = {}) {
  const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 20 - 1, a = Math.abs(t); pts.push([-10 + 36 * (1 - t * t) - (a > 0.78 ? (a - 0.78) * 46 : 0), 60 * t]); }
  const lp = ribbon(pts.map(([a, b]) => pt(T, a, b)), (t) => (3.4 + 5.6 * Math.pow(1 - Math.abs(t * 2 - 1), 0.7)) * (T.s || 1));
  solid(x, lp, LG(x, T, -8, -50, 34, 10, limb), { sd: 2.2, rd: 1.2 });
  x.save(); x.clip(lp); stroke(x, P('M-8-50C10-46 24-30 24-4', T), 'rgba(255,255,255,0.5)', 1.4); for (const y of [-38, -24, 24, 38]) etch(x, P(`M${-10 + 36 * (1 - (y / 60) ** 2) - 6} ${y}l12 0`, T), 0.4, 0.8); x.restore();
  for (const s of [-1, 1]) { solid(x, P(`M-17 ${57 * s}c-4 ${-6 * s} 2 ${-12 * s} 9 ${-11 * s}l1 ${5 * s}c-4 0-7 ${3 * s}-6 ${7 * s}z`, T), across(x, T, 8, tip), { shadow: false, sd: 1 }); wire(x, P(`M-4 ${42 * s}c-4 ${6 * s} -10 ${8 * s} -12 ${4 * s}`, T), 1.2, across(x, T, 8, tip)); }
  solid(x, P('M19-11h10v22h-10z', T), across(x, T, 6, 'leather'), { shadow: false, sd: 1 });
  for (const y of [-9, -5, -1, 3, 7]) etch(x, P(`M19 ${y}l10 2`, T), 0.5, 0.7);
  jewel(x, T, 24, -15, 3, glowC || '#ff4a3a', tip); jewel(x, T, 24, 15, 3, glowC || '#ff4a3a', tip);
  const sp = P('M-18-58L-18 58', T); if (glowC) shine(x, sp, glowC, 4, 0.7); stroke(x, sp, string, 1.1);
  if (arrow) {
    const ap = P('M-30 0H52', T); stroke(x, ap, '#1a0e04', 3.6); stroke(x, ap, LG(x, T, -30, -1, -30, 1, 'wood'), 2.4);
    solid(x, P('M48-7L64 0L48 7L51 0Z', T), LG(x, T, 48, -7, 48, 7, bevel('steel')), { shadow: false, sd: 1 });
    if (glowC) glow(x, ...pt(T, 58, 0), 12, glowC, 0.8);
    for (const s of [-1, 1]) solid(x, P(`M-30 0L-40 ${9 * s}L-22 ${7 * s}L-17 0Z`, T), LG(x, T, -40, 0, -17, 0, [[0, '#ffffff'], [1, '#c8b8a0']]), { shadow: false, sd: 0.8, surf: 0, ao: 0 });
  }
}
function glove(x, T, { mat = 'leather', cuff = 'bronze' } = {}) {
  for (const [fx, h] of [[-18, 26], [-7, 32], [4, 30], [15, 24]]) {
    solid(x, P(`M${fx - 4.8}-30v${-h + 6}a4.8 4.8 0 0 1 9.6 0v${h - 6}z`, T), across(x, T, 22, mat), { sd: 2 });
    for (const k of [0.38, 0.72]) solid(x, P(`M${fx - 5}${-30 - h * k}h10v4.5h-10z`, T), across(x, T, 5, cuff), { shadow: false, sd: 0.8, ao: 0 });
  }
  const back = P('M-24-6C-24-28-12-34 0-34C14-34 24-28 24-6L24 22C24 34 12 40 0 40C-12 40-24 34-24 22Z', T);
  solid(x, back, RG(x, T, -8, -12, 50, [[0, '#d8a070'], [0.5, MAT[mat][2][1]], [1, '#20100a']]), { sd: 3 });
  solid(x, P('M-16-30C-6-34 6-34 16-30L18-10C6-14-6-14-18-10Z', T), LG(x, T, -18, -34, 18, -10, cuff), { shadow: false, sd: 1.5 });
  for (const xx of [-12, -4, 4, 12]) solid(x, P(circ(xx, -24, 1.4), T), RG(x, T, xx - 0.5, -25, 2, [[0, '#ffffff'], [1, '#6a3a10']]), { shadow: false, sd: 0.5, surf: 0, ao: 0, back: null });
  solid(x, P('M-23 6C-35 0-41-12-37-20C-31-22-25-14-19-6Z', T), across(x, T, 30, mat), { shadow: false, sd: 2 });
  x.setLineDash([2, 2]); stroke(x, P('M-20 -4C-20 12-18 26-10 34M20-4C20 12 18 26 10 34', T), 'rgba(255,230,190,0.55)', 0.7); x.setLineDash([]);
  solid(x, P('M-26 32h52v18h-52z', T), LG(x, T, 0, 32, 0, 50, cuff), { sd: 2 });
  etch(x, P('M-23 37H23M-23 45H23', T), 0.45, 0.8); jewel(x, T, 0, 41, 4, '#ff7a2a', cuff);
}
function hammer(x, T, { head = 'steel', handle = 'wood', band = 'gold', core = '#ff9a20' } = {}) {
  solid(x, P('M-4.4-18h8.8v84h-8.8z', T), across(x, T, 4.4, handle), { sd: 2 });
  for (let y = 30; y < 60; y += 3.6) etch(x, P(`M-4.2 ${y}l8.4 2.6`, T), 0.55, 0.9);
  solid(x, P('M-6 62h12l-2 6h-8z', T), across(x, T, 6, band), { shadow: false, sd: 1 });
  const hd = P('M-38-50h76a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4h-76a4 4 0 0 1-4-4v-32a4 4 0 0 1 4-4z', T);
  solid(x, hd, LG(x, T, 0, -50, 0, -10, bevel(head)), { sd: 3.5 });
  for (const s of [-1, 1]) solid(x, P(`M${s * 42}-46h${s * 6}v28h${-s * 6}z`, T), LG(x, T, 0, -46, 0, -18, head), { shadow: false, sd: 1.5 });
  solid(x, P('M-28-53h8v46h-8zM20-53h8v46h-8z', T), LG(x, T, 0, -53, 0, -7, band), { shadow: false, sd: 1.2 });
  for (const xx of [-24, 24]) for (const y of [-46, -30, -14]) solid(x, P(circ(xx, y, 1.5), T), RG(x, T, xx - 0.5, y - 0.5, 2, [[0, '#ffffff'], [1, '#7a4a10']]), { shadow: false, sd: 0.5, surf: 0, ao: 0, back: null });
  etch(x, P('M-14-42L-8-36M-14-18L-8-24M14-42L8-36M14-18L8-24', T), 0.5, 1);
  jewel(x, T, 0, -30, 7, core, band);
  etch(x, P('M-38-14H38', T), 0.4, 0.8);
}
function mask(x, T, { mat = 'gold', eye = '#6affe8' } = {}) {
  const face = P('M0-48C31-48 40-20 36 6C32 31 16 45 0 49C-16 45-32 31-36 6C-40-20-31-48 0-48Z', T);
  solid(x, face, LG(x, T, -36, -40, 36, 40, mat), { sd: 4 });
  x.save(); x.clip(face); x.fillStyle = LG(x, T, -36, 0, 36, 0, [[0, '#000000', 0.35], [0.3, '#000000', 0], [0.7, '#000000', 0], [1, '#000000', 0.45]]); x.fill(face); x.restore();
  for (const s of [-1, 1]) wire(x, P(`M${s * 8}-36C${s * 18}-40 ${s * 28}-34 ${s * 28}-24C${s * 28}-16 ${s * 20}-16 ${s * 20}-22`, T), 1.4, LG(x, T, -30, -40, 30, -10, 'gold'));
  for (const s of [-1, 1]) wire(x, P(`M${s * 28}8C${s * 30}18 ${s * 24}28 ${s * 14}30C${s * 20}24 ${s * 22}18 ${s * 20}12`, T), 1.2, LG(x, T, -30, 8, 30, 30, 'gold'));
  for (const s of [-1, 1]) { const e = P(`M${-22 * s}-10C${-15 * s}-19 ${-6 * s}-18 ${-2 * s}-9C${-8 * s}-3 ${-16 * s}-3 ${-22 * s}-10Z`, T); fillA(x, e, '#06040a'); shine(x, e, eye, 4, 0.6); fillA(x, P(`M${-15 * s}-11C${-12 * s}-14 ${-8 * s}-14 ${-6 * s}-10C${-9 * s}-8 ${-12 * s}-8 ${-15 * s}-11Z`, T), '#ffffff'); }
  stroke(x, P('M-29-26C-17-32-6-29 0-23C6-29 17-32 29-26', T), 'rgba(90,50,0,0.8)', 1.8);
  etch(x, P('M0-4V12M-5 13C-2 15 2 15 5 13M-9 25C-4 23 4 23 9 25C4 28-4 28-9 25', T), 0.6, 1.1);
  stroke(x, P('M-25 4C-29 14-27 24-19 32M25 4C29 14 27 24 19 32', T), 'rgba(255,250,210,0.6)', 1);
  for (const s of [-1, 1]) { solid(x, P(`M${s * 2}-40C${s * 10}-52 ${s * 22}-54 ${s * 30}-48C${s * 22}-46 ${s * 14}-42 ${s * 8}-36Z`, T), LG(x, T, 0, -54, 0, -36, 'gold'), { shadow: true, sd: 1.2 }); }
  jewel(x, T, 0, -38, 4.6, eye);
}
function gem(x, T, c = ['#d8f2ff', '#4a8aff', '#0a1650']) {
  const V = { tl: [-24, -32], tr: [24, -32], r: [40, -12], l: [-40, -12], ml: [-15, -12], mr: [15, -12], t: [0, -32], b: [0, 46], bl: [-16, 14], br: [16, 14] };
  const [cx, cy] = pt(T, 0, 0); glow(x, cx, cy, 70 * (T.s || 1), c[1], 0.45);
  const f = (ks, cc) => { const p = P('M' + ks.map((k) => V[k].join(' ')).join('L') + 'Z', T); x.fillStyle = cc; x.fill(p); stroke(x, p, 'rgba(255,255,255,0.4)', 0.5); };
  x.save(); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 8 * K; x.shadowOffsetY = 3 * K; x.fillStyle = c[2]; x.fill(P('M-24-32L24-32L40-12L0 46L-40-12Z', T)); x.restore();
  f(['tl', 't', 'ml'], LG(x, T, -24, -32, -15, -12, [[0, '#ffffff'], [1, c[0]]])); f(['t', 'mr', 'ml'], LG(x, T, 0, -32, 0, -12, [[0, c[0]], [1, c[1]]])); f(['t', 'tr', 'mr'], LG(x, T, 0, -32, 24, -12, [[0, c[0]], [1, mix(c[1], 0.7)]]));
  f(['tl', 'ml', 'l'], mix(c[1], 0.72)); f(['tr', 'r', 'mr'], c[1]);
  f(['l', 'ml', 'bl'], LG(x, T, -40, -12, -16, 14, [[0, c[1]], [1, mix(c[1], 0.3)]])); f(['ml', 'mr', 'br', 'bl'], LG(x, T, 0, -12, 0, 14, [[0, c[0]], [0.5, c[1]], [1, mix(c[1], 0.35)]])); f(['mr', 'r', 'br'], LG(x, T, 15, -12, 40, -12, [[0, mix(c[1], 0.35)], [1, c[2]]]));
  f(['l', 'bl', 'b'], LG(x, T, -40, -12, 0, 46, [[0, c[1]], [1, c[2]]])); f(['bl', 'br', 'b'], LG(x, T, 0, 14, 0, 46, [[0, mix(c[1], 0.8)], [1, c[2]]])); f(['br', 'r', 'b'], c[2]);
  x.save(); x.clip(P('M-24-32L24-32L40-12L0 46L-40-12Z', T)); x.globalCompositeOperation = 'lighter'; for (const [a, b2] of [[-30, 20], [10, 40]]) { x.fillStyle = LG(x, T, a, -40, b2, 40, [[0, '#ffffff', 0], [0.5, '#ffffff', 0.18], [1, '#ffffff', 0]]); x.fill(P(`M${a}-40L${a + 8}-40L${b2 + 8} 46L${b2} 46Z`, T)); } x.restore();
  for (const [sx, sy, sz] of [[-14, -26, 1], [20, -16, 0.6], [-4, 8, 0.5]]) { const [gx, gy] = pt(T, sx, sy); glow(x, gx, gy, 9 * sz, '#ffffff', 0.9); x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ffffff'; x.fill(P('M0-7L1-1L7 0L1 1L0 7L-1 1L-7 0L-1-1Z', { cx: gx, cy: gy, s: sz })); x.restore(); }
}
function orb(x, r, T, { c = ['#ffffff', '#8ad8ff', '#1a3a8a'], R = 30, swirlC = '#bfefff', holder = null } = {}) {
  const p = P(circ(0, 0, R), T), [ox, oy] = pt(T, 0, 0); glow(x, ox, oy, R * 2.1 * (T.s || 1), c[1], 0.55);
  if (holder) { for (const s of [-1, 1]) solid(x, P(`M${s * 6} ${R + 10}C${s * (R + 6)} ${R + 6} ${s * (R + 8)} ${R * 0.2} ${s * (R * 0.8)} ${-R * 0.5}C${s * (R + 1)} 0 ${s * (R - 4)} ${R * 0.8} ${s * 2} ${R + 4}Z`, T), LG(x, T, -R, 0, R, 0, holder), { sd: 2 }); solid(x, P(`M-12 ${R + 4}h24l-4 12h-16z`, T), across(x, T, 12, holder), { sd: 2 }); jewel(x, T, 0, R + 10, 3.4, c[1], holder); }
  solid(x, p, RG(x, T, -R * 0.3, -R * 0.35, R * 1.3, [[0, c[0]], [0.35, c[1]], [1, c[2]]]), { sd: 3, surf: 0 });
  x.save(); x.clip(p); swirl(x, r, ox, oy, { arms: 5, r0: 2, r1: R * (T.s || 1), turns: 0.9, w: [1.5, 4], c: swirlC, alpha: 0.6 }); glow(x, ox, oy, R * 0.7 * (T.s || 1), '#ffffff', 0.7);
  x.fillStyle = rad(x, ox, oy, R * (T.s || 1), [[0.7, '#000000', 0], [1, '#000000', 0.35]]); x.fill(p); x.restore();
  stroke(x, p, 'rgba(255,255,255,0.5)', 0.8);
  fillA(x, P(`M${-R * 0.55} ${-R * 0.35}a${R * 0.4} ${R * 0.25} -30 1 1 ${R * 0.5} ${-R * 0.25}a${R * 0.3} ${R * 0.18} -30 1 0 ${-R * 0.5} ${R * 0.25}Z`, T), 'rgba(255,255,255,0.85)');
  if (holder) for (const s of [-1, 1]) { solid(x, P(`M${s * R * 0.8} ${-R * 0.5}C${s * R * 0.9} ${-R * 0.75} ${s * R * 0.6} ${-R * 0.95} ${s * R * 0.35} ${-R * 0.98}L${s * R * 0.5} ${-R * 0.7}Z`, T), LG(x, T, -R, 0, R, 0, holder), { shadow: false, sd: 1 }); }
}
function book(x, T, { cover = ['#a0482a', '#4a1408'], trim = 'gold', rune = '#ffd86a' } = {}) {
  solid(x, P('M-28-38h60v84h-60z', { ...T, cx: T.cx + 3, cy: T.cy + 3 }), LG(x, T, 0, -40, 0, 46, [[0, cover[1]], [1, '#100402']]), { sd: 2 });
  const pages = P('M-27-37h59l2 4v78l-2 2h-59z', T); solid(x, pages, LG(x, T, 26, 0, 34, 0, [[0, '#f8f0d8'], [1, '#b8a47a']]), { shadow: false, sd: 1, surf: 0.15 });
  for (let i = 0; i < 12; i++) stroke(x, P(`M29.5 ${-33 + i * 6.6}h4`, T), 'rgba(120,90,50,0.45)', 0.4);
  const cv = P('M-32-42h58a3 3 0 0 1 3 3v80a3 3 0 0 1-3 3h-58z', T);
  solid(x, cv, LG(x, T, -32, -42, 26, 44, [[0, mix(cover[0], 0.7)], [0.4, cover[0]], [1, cover[1]]]), { sd: 3, surf: 0.45 });
  x.save(); x.clip(cv); etch(x, P('M-22-34h42v68h-42z', T), 0.5, 1); etch(x, P('M-19-31h36v62h-36z', T), 0.35, 0.6); x.restore();
  solid(x, P('M-33-42h9v86h-9z', T), across(x, T, 4.5, trim, 0), { shadow: false, sd: 1 });
  for (const y of [-30, -10, 10, 30]) etch(x, P(`M-33 ${y}h9`, T), 0.6, 1.2);
  for (const [cx, cy, a] of [[29, -42, 90], [29, 44, 180]]) solid(x, P('M0 0h-13l3 3h7v7l3 3z', { cx: pt(T, cx, cy)[0], cy: pt(T, cx, cy)[1], deg: (T.deg || 0) + a - 90, s: T.s || 1 }), across(x, T, 6, trim), { shadow: false, sd: 1 });
  for (const s of [-1, 1]) wire(x, P(`M-2 ${s * 18}C8 ${s * 18} 14 ${s * 12} 14 ${s * 4}M-2 ${s * 18}C-12 ${s * 18}-18 ${s * 12}-18 ${s * 4}`, T), 1.3, across(x, T, 16, trim));
  const em = P(circ(-2, 1, 12), T); solid(x, em, RG(x, T, -2, 1, 13, [[0, '#1a0a14'], [0.8, '#2a1020'], [1, '#000']]), { shadow: false, sd: 1.5, surf: 0 }); wire(x, em, 2, across(x, T, 12, trim));
  const rp = P('M-2-8L4 1L-2 10L-8 1Z', T); shine(x, rp, rune, 8, 0.9); fillA(x, rp, LG(x, T, -2, -8, -2, 10, [[0, '#ffffff'], [1, rune]])); shine(x, P(circ(-2, 1, 9), T), rune, 6, 0.25);
  solid(x, P('M26-6h8v14h-8z', T), across(x, T, 4, trim), { shadow: false, sd: 1 });
}
function staff(x, r, T, { shaft = 'wood', head = 'gold', orbC = ['#ffffff', '#6ad8ff', '#0a3a7a'] } = {}) {
  solid(x, P('M-3.4-30h6.8v100h-6.8z', T), across(x, T, 3.4, shaft), { sd: 2 });
  for (const y of [-6, 26, 58]) solid(x, P(`M-5 ${y}h10v5h-10z`, T), across(x, T, 5, head), { shadow: false, sd: 0.8 });
  for (const y of [0, 4, 8, 12, 16]) etch(x, P(`M-3.2 ${y}l6.4 2`, T), 0.5, 0.8);
  const [ox, oy] = pt(T, 0, -50); glow(x, ox, oy, 30 * (T.s || 1), orbC[1], 0.7);
  orb(x, r, { cx: ox, cy: oy, s: T.s || 1 }, { c: orbC, R: 13, swirlC: orbC[0] });
  for (const s of [-1, 1]) {
    solid(x, P(`M${s * 3}-30C${s * 22}-34 ${s * 24}-56 ${s * 12}-70C${s * 10}-62 ${s * 14}-50 ${s * 4}-40Z`, T), LG(x, T, -24, -70, 24, -30, head), { sd: 2 });
    wire(x, P(`M${s * 12}-70c${s * -4}-3 ${s * -9} 0 ${s * -7} 4`, T), 1.2, across(x, T, 12, head));
  }
  solid(x, P('M-7-34h14l-2 8h-10z', T), across(x, T, 7, head), { shadow: false, sd: 1 });
  jewel(x, T, 0, -24, 2.6, orbC[1], head);
  x.save(); x.globalCompositeOperation = 'lighter'; for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(pt(T, s * (6 + Math.sin(t * 7) * 5 + t * 8), -28 + t * 40)); } x.fillStyle = col(orbC[1], 0.4); x.fill(ribbon(pts, (t) => 3.5 * (1 - t))); } x.restore();
}
function hat(x, T, { c = ['#7a4ad8', '#1a0a4a'], band = 'gold' } = {}) {
  solid(x, P('M-50 12C-32-1 32-1 50 12C32 28-32 28-50 12Z', T), LG(x, T, 0, 0, 0, 26, [[0, mix(c[0], 0.65)], [0.5, c[0]], [1, c[1]]]), { sd: 3, surf: 0.45 });
  const cone = P('M-30 10C-18-16-12-44 4-58C10-66 22-70 30-62C22-64 14-60 10-52C14-30 22-10 30 10Z', T);
  solid(x, cone, LG(x, T, -30, -40, 30, 10, [[0, mix(c[0], 0.7)], [0.45, c[0]], [1, c[1]]]), { sd: 3, surf: 0.45 });
  x.save(); x.clip(cone); for (const [a, b] of [[-14, -20], [4, 8]]) stroke(x, P(`M${a} 10C${a + 4}-14 ${b}-30 ${b + 8}-50`, T), 'rgba(0,0,20,0.35)', 3); x.restore();
  solid(x, P('M-30 0C-10-7 10-7 30 0L32 10C10 3-10 3-32 10Z', T), LG(x, T, 0, -5, 0, 10, band), { shadow: false, sd: 1 });
  etch(x, P('M-28 4C-10-2 10-2 28 4', T), 0.4, 0.6);
  solid(x, P('M-7-4h14v12h-14z', T), across(x, T, 7, band), { shadow: false, sd: 1 }); jewel(x, T, 0, 2, 3.6, '#7ae8ff', band);
  stars(x, rngFor(5), 5, [pt(T, -20, -30)[0], pt(T, -20, -30)[1], pt(T, 16, 0)[0], pt(T, 16, 0)[1]], '#e0d0ff');
  const [tx, ty] = pt(T, 30, -62); glow(x, tx, ty, 10, '#e0d0ff', 0.8); solid(x, P('M0-5L1.4-1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4-1.4Z', { cx: tx, cy: ty, s: 1.1 }), '#fff6c0', { shadow: false, sd: 0.6, surf: 0, ao: 0 });
}
function ring(x, T, { band = 'gold', gem: g = ['#ffd0d8', '#e0102a', '#3a0008'] } = {}) {
  const p = new Path2D(), m = M(T), e1 = new Path2D(), e2 = new Path2D(); e1.ellipse(0, 14, 34, 21, 0, 0, TAU); e2.ellipse(0, 14, 24, 13, 0, 0, TAU, true); p.addPath(e1, m); p.addPath(e2, m);
  solid(x, p, LG(x, T, -34, 0, 34, 30, band), { sd: 3 });
  x.save(); x.clip(p); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; etch(x, P(`M${Math.cos(a) * 25} ${14 + Math.sin(a) * 14}L${Math.cos(a) * 33} ${14 + Math.sin(a) * 20}`, T), 0.35, 0.6); } x.restore();
  for (const s of [-1, 1]) solid(x, P(`M${s * 8}-2C${s * 14}-8 ${s * 18}-14 ${s * 16}-22L${s * 10}-18C${s * 10}-12 ${s * 6}-6 ${s * 2}-2Z`, T), LG(x, T, -18, -22, 18, 0, band), { sd: 2 });
  solid(x, P('M-13-4L-9-14H9L13-4Z', T), LG(x, T, 0, -14, 0, -4, band), { sd: 2 });
  const [gx, gy] = pt(T, 0, -24); glow(x, gx, gy, 30, g[1], 0.7);
  const gp = P('M0-38L12-30L13-18L0-10L-13-18L-12-30Z', T);
  solid(x, gp, RG(x, T, -4, -28, 18, [[0, g[0]], [0.4, g[1]], [1, g[2]]]), { sd: 2.5, surf: 0 });
  for (const d of ['M0-38L0-24L12-30', 'M0-24L13-18M0-24L-13-18M0-24L-12-30M0-24L0-10']) stroke(x, P(d, T), 'rgba(255,255,255,0.35)', 0.5);
  fillA(x, P('M0-38L-12-30L0-24Z', T), 'rgba(255,255,255,0.4)');
  for (const [px, py] of [[0, -38], [12, -30], [-12, -30], [0, -10]]) solid(x, P(circ(px, py, 1.6), T), LG(x, T, px - 2, py - 2, px + 2, py + 2, band), { shadow: false, sd: 0.5, surf: 0, ao: 0 });
  glow(x, ...pt(T, -4, -31), 6, '#ffffff', 0.9);
}
function hourglass(x, T, { frame = 'silver', fill = ['#e8fbff', '#7ad0f4'] } = {}) {
  const glass = P('M-18-42C-18-18-4-8-2 0C-4 8-18 18-18 42H18C18 18 4 8 2 0C4-8 18-18 18-42Z', T);
  fillA(x, glass, LG(x, T, -18, 0, 18, 0, [[0, 'rgba(200,240,255,0.3)'], [0.5, 'rgba(255,255,255,0.06)'], [1, 'rgba(200,240,255,0.35)']]));
  const [cx, cy] = pt(T, 0, 26); glow(x, cx, cy, 22, fill[1], 0.7);
  fillA(x, P('M-15 40C-15 26-6 18-1 12H1C6 18 15 26 15 40Z', T), LG(x, T, 0, 12, 0, 40, [[0, fill[0]], [1, fill[1]]]));
  fillA(x, P('M-15-38C-14-30-8-24-1-20H1C8-24 14-30 15-38Z', T), LG(x, T, 0, -38, 0, -20, [[0, fill[1]], [1, fill[0]]]));
  shine(x, P('M-0.8-20h1.6v32h-1.6z', T), fill[1], 4, 0.9);
  stroke(x, glass, 'rgba(230,250,255,0.9)', 1.3); stroke(x, P('M-13-38C-13-20-4-10-3-4', T), 'rgba(255,255,255,0.7)', 1.2);
  for (const y of [-52, 42]) { solid(x, P(`M-32 ${y}h64v10h-64z`, T), LG(x, T, 0, y, 0, y + 10, bevel(frame)), { sd: 2 }); etch(x, P(`M-28 ${y + 5}h56`, T), 0.4, 0.7); for (const xx of [-26, 26]) jewel(x, T, xx, y + 5, 2.4, fill[1], frame); }
  for (const xx of [-28, 23]) { solid(x, P(`M${xx}-42h5v84h-5z`, T), across(x, T, 3, frame), { shadow: false, sd: 1 }); for (let y = -38; y < 40; y += 8) etch(x, P(`M${xx} ${y}l5 4`, T), 0.45, 0.6); }
}
function crystals(x, T, { c = 'ice', list = [[0, -6, 0, 1.15], [-18, 8, -24, 0.8], [17, 6, 22, 0.85], [-6, 18, -48, 0.55], [10, 20, 52, 0.5]], glowC = '#8ae8ff' } = {}) {
  const [bx, by] = pt(T, 0, 22); glow(x, bx, by - 20, 50, glowC, 0.5);
  solid(x, P('M-36 30C-30 18-12 16 0 18C14 16 30 18 36 30C24 36-24 36-36 30Z', T), LG(x, T, 0, 16, 0, 34, 'stone'), { sd: 2 });
  for (const [ox, oy, a, s] of list) {
    const T2 = { cx: T.cx + ox * (T.s || 1), cy: T.cy + oy * (T.s || 1), deg: (T.deg || 0) + a, s: (T.s || 1) * s }, h = 46, w = 11;
    const p = P(`M0${-h}L${w} ${-h + w * 1.2}L${w} 18L0 24L${-w} 18L${-w} ${-h + w * 1.2}Z`, T2);
    solid(x, p, across(x, T2, w, c), { sd: 2.5, surf: 0 });
    x.save(); x.clip(p); x.globalCompositeOperation = 'lighter'; x.fillStyle = LG(x, T2, 0, 20, 0, -h, [[0, glowC, 0.6], [0.6, glowC, 0.1], [1, '#ffffff', 0.4]]); x.fill(p); x.restore();
    fillA(x, P(`M0${-h}L${w} ${-h + w * 1.2}L0 ${-h + w * 2}Z`, T2), 'rgba(255,255,255,0.45)');
    stroke(x, P(`M0${-h}V24M0 ${-h + w * 2}L${-w} ${-h + w * 1.2}`, T2), 'rgba(255,255,255,0.55)', 0.7);
  }
}
function kite(x, T, { face = ['#7a8a9a', '#2a323c'], rim = 'stone', emblem = null, rivets = true } = {}) {
  const o = 'M0-54L42-40L38 10C32 35 14 48 0 58C-14 48-32 35-38 10L-42-40Z';
  solid(x, P(o, T), LG(x, T, -42, -50, 42, 50, bevel(rim)), { sd: 4 });
  const T2 = { ...T, s: (T.s || 1) * 0.82, cy: T.cy + 1 * (T.s || 1) };
  solid(x, P(o, T2), LG(x, T2, -30, -40, 30, 50, [[0, face[0]], [0.6, mix(face[0], 0.4)], [1, face[1]]]), { shadow: false, sd: 2.5, surf: 0.5 });
  if (rivets) for (const [rx, ry] of [[0, -50], [36, -37], [-36, -37], [34, 8], [-34, 8], [16, 40], [-16, 40]]) solid(x, P(circ(rx, ry, 2), T), RG(x, T, rx - 0.6, ry - 0.6, 3, [[0, '#ffffff'], [1, '#3a3020']]), { shadow: false, sd: 0.6, surf: 0, ao: 0, back: null });
  if (emblem) emblem(T); else { solid(x, P('M0-24L16-4L0 26L-16-4Z', T), LG(x, T, -16, -24, 16, 26, bevel('silver')), { shadow: true, sd: 2 }); jewel(x, T, 0, -2, 5, '#4ae0b0', 'silver'); }
}
function chest(x, r, T, { mat = 'steel', trim = 'gold', variant = '' } = {}) {
  const body = P('M-30-40L-14-46C-8-36 8-36 14-46L30-40L38-12L28-6L27 40C10 48-10 48-27 40L-28-6L-38-12Z', T);
  solid(x, body, LG(x, T, -38, -46, 38, 46, mat), { sd: 4, surf: variant === 'leather' ? 0.55 : 0.35 });
  x.save(); x.clip(body);
  x.fillStyle = LG(x, T, -30, 0, 30, 0, [[0, '#000000', 0.4], [0.35, '#000000', 0], [0.5, '#ffffff', 0.12], [0.65, '#000000', 0], [1, '#000000', 0.5]]); x.fill(body);
  if (variant === 'scales') for (let row = 0; row < 10; row++) for (let i = -5; i <= 5; i++) { const cx = i * 8 + (row % 2) * 4, cy = -36 + row * 8; const sp = P(`M${cx - 4.5} ${cy}a4.5 5.5 0 0 0 9 0`, T); fillA(x, sp, LG(x, T, cx, cy, cx, cy + 6, [[0, 'rgba(255,255,255,0.0)'], [1, 'rgba(0,30,20,0.35)']])); stroke(x, sp, 'rgba(0,40,30,0.6)', 1); stroke(x, P(`M${cx - 3.5} ${cy + 1}a3.5 3.5 0 0 0 3.5 3`, T), 'rgba(220,255,240,0.55)', 0.6); }
  if (variant === 'leather') { for (const xx of [-11, 11]) { x.setLineDash([2, 2]); stroke(x, P(`M${xx}-36V44`, T), 'rgba(255,230,190,0.6)', 0.7); x.setLineDash([]); etch(x, P(`M${xx + 2}-36V44`, T), 0.4, 0.8); } const st = P('M-26-30L-18-36L28 34L20 40Z', T); solid(x, st, LG(x, T, -20, -30, 20, 30, [[0, '#8a5a34'], [1, '#3a1e0c']]), { shadow: true, sd: 1.5, surf: 0.5 }); x.setLineDash([1.5, 1.5]); stroke(x, P('M-22-30L24 36', T), 'rgba(255,230,190,0.6)', 0.5); x.setLineDash([]); solid(x, P('M-2 2h10v9h-10z', { ...T, deg: (T.deg || 0) + 34 }), across(x, T, 6, 'bronze'), { shadow: false, sd: 0.8, surf: 0, ao: 0 }); }
  if (variant !== 'scales' && variant !== 'leather') { etch(x, P('M0-36V44', T), 0.5, 1.2); for (const y of [16, 26, 36]) etch(x, P(`M-26 ${y}C-10 ${y + 4} 10 ${y + 4} 26 ${y}`, T), 0.55, 1); }
  x.restore();
  for (const s of [-1, 1]) {
    const pa = P(`M${s * 12}-44C${s * 30}-52 ${s * 46}-44 ${s * 48}-26C${s * 48}-18 ${s * 44}-12 ${s * 38}-10C${s * 36}-22 ${s * 30}-30 ${s * 18}-34Z`, T);
    solid(x, pa, LG(x, T, s * 14, -50, s * 48, -10, variant === 'leather' ? 'leather' : bevel(mat)), { sd: 3 });
    stroke(x, P(`M${s * 18}-40C${s * 32}-44 ${s * 42}-36 ${s * 44}-22`, T), LG(x, T, 0, -44, 0, -22, trim), 2);
    for (const k of [0.3, 0.7]) solid(x, P(circ(s * (20 + 22 * k), -44 + 20 * k, 1.5), T), RG(x, T, s * (20 + 22 * k), -45 + 20 * k, 2, [[0, '#ffffff'], [1, '#4a3010']]), { shadow: false, sd: 0.5, surf: 0, ao: 0, back: null });
  }
  stroke(x, P('M-14-46C-8-36 8-36 14-46', T), LG(x, T, -14, 0, 14, 0, trim), 3.2);
  solid(x, P('M-28-8H28L27 2H-27Z', T), LG(x, T, 0, -8, 0, 2, trim), { shadow: false, sd: 1 });
  if (variant === 'spikes') for (const [sx, sy, a] of [[-40, -30, -60], [-30, -48, -25], [40, -30, 60], [30, -48, 25], [-16, 14, -10], [0, 16, 0], [16, 14, 10], [-8, 30, -8], [8, 30, 8]]) { const [qx, qy] = pt(T, sx, sy), T2 = { cx: qx, cy: qy, deg: (T.deg || 0) + a, s: T.s || 1 }; solid(x, P('M-4.5 2L0-14L4.5 2Z', T2), LG(x, T2, -4.5, 0, 4.5, 0, bevel('steel')), { shadow: true, sd: 1, rd: 0.6 }); fillA(x, P('M-1 -10L0-14L1-10Z', T2), '#ff3a3a'); }
  if (variant === 'lantern') { const [lx, ly] = pt(T, 0, 18); lantern(x, lx, ly, 0.46 * (T.s || 1)); glow(x, lx, ly, 26, '#ffb040', 0.6); }
  if (variant === 'core') { const [cx, cy] = pt(T, 0, 14); glow(x, cx, cy, 18, '#6ae8ff', 0.8); jewel(x, T, 0, 14, 6, '#6ae8ff'); }
  else jewel(x, T, 0, -3, variant === 'leather' ? 3.4 : 4.4, variant === 'scales' ? '#ffd040' : variant === 'spikes' ? '#ff3a3a' : '#ff8a2a', trim);
}
function cloak(x, r, T, { c = ['#9ab0d8', '#2a3a6a'], clasp = '#7ad8ff', variant = '' } = {}) {
  const p = P('M-24-44C-10-50 10-50 24-44L44 42C30 32 18 52 5 40C-6 52-18 34-31 46C-36 40-40 42-46 40Z', T);
  solid(x, p, LG(x, T, -40, -40, 40, 44, [[0, mix(c[0], 0.7)], [0.4, c[0]], [1, c[1]]]), { sd: 4, surf: 0.4 });
  x.save(); x.clip(p);
  for (const [a, b] of [[-16, -32], [-2, -6], [12, 16], [22, 34]]) { stroke(x, P(`M${a * 0.5}-42C${a} -10 ${b} 10 ${b} 46`, T), 'rgba(0,0,10,0.4)', 4.5); stroke(x, P(`M${a * 0.5 + 3}-42C${a + 3} -10 ${b + 4} 10 ${b + 4} 46`, T), 'rgba(255,255,255,0.2)', 1.6); }
  if (variant === 'night') { const [x0, y0] = pt(T, -36, -40), [x1, y1] = pt(T, 36, 40); stars(x, r, 16, [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], '#c8a8ff'); }
  const hem = P('M-46 40C-40 42-36 40-31 46C-18 34-6 52 5 40C18 52 30 32 44 42', T);
  stroke(x, hem, LG(x, T, -46, 40, 44, 40, 'gold'), 7); stroke(x, hem, 'rgba(0,0,0,0.5)', 7.5, 0.3);
  x.restore();
  x.save(); x.clip(p); x.translate(0, -4 * (T.s || 1)); wire(x, P('M-44 38C-38 40-34 38-30 43C-18 32-6 49 5 37C18 49 30 30 42 38', T), 1.6, LG(x, T, -46, 30, 44, 50, 'gold')); x.restore();
  for (const s of [-1, 1]) { solid(x, P(`M${s * 2}-50C${s * 16}-56 ${s * 30}-50 ${s * 32}-40C${s * 22}-38 ${s * 12}-40 ${s * 2}-36Z`, T), LG(x, T, 0, -56, 0, -36, [[0, mix(c[0], 0.85)], [1, c[1]]]), { shadow: true, sd: 1.5 }); wire(x, P(`M${s * 4}-48C${s * 16}-53 ${s * 27}-48 ${s * 30}-41`, T), 1.1, LG(x, T, 0, -50, 0, -40, 'gold')); }
  wire(x, P('M-16-40C-8-34 8-34 16-40', T), 1, LG(x, T, 0, -40, 0, -34, 'gold'));
  jewel(x, T, 0, -42, 5.5, clasp);
}
function heart(x, T, { mat = 'wood', core = '#8aff6a' } = {}) {
  const p = P('M0 46C-30 26-48 6-48-16C-48-34-34-46-20-46C-10-46-3-40 0-32C3-40 10-46 20-46C34-46 48-34 48-16C48 6 30 26 0 46Z', T);
  solid(x, p, LG(x, T, -48, -40, 48, 40, mat), { sd: 4, surf: 0.6 });
  x.save(); x.clip(p); for (let i = 0; i < 8; i++) etch(x, P(`M${-44 + i * 12}-46C${-32 + i * 10} -10 ${-36 + i * 11} 20 ${-12 + i * 4} 46`, T), 0.5, 1);
  const cr = P('M0-30L-6-16L2-6L-8 8L0 20M2-6L14 0L20 16M-6-16L-20-20', T); shine(x, cr, core, 4, 0.9); stroke(x, cr, core, 2.6, 0.9, 'lighter'); stroke(x, cr, '#ffffff', 0.8, 1); x.restore();
  const [cx, cy] = pt(T, 0, -4); glow(x, cx, cy, 26 * (T.s || 1), core, 0.85);
  const vine = P('M-46-10C-34 0-30 18-14 30M46-10C38 4 30 16 16 28', T); wire(x, vine, 2, LG(x, T, 0, -10, 0, 30, [[0, '#6ac040'], [1, '#2a6a18']]));
  shine(x, P('M0 8C-8 2-12-4-12-9a6 6 0 0 1 12-2a6 6 0 0 1 12 2C12-4 8 2 0 8Z', T), core, 8, 1); fillA(x, P('M0 4C-5 0-7-4-7-7a3.5 3.5 0 0 1 7-1a3.5 3.5 0 0 1 7 1C7-4 5 0 0 4Z', T), '#ffffff');
}
function pouch(x, r, T) {
  const p = P('M-32 40C-44 20-38-6-19-18L-12-26C-18-32-15-38-8-36L0-31L8-36C15-38 18-32 12-26L19-18C38-6 44 20 32 40C21 48-21 48-32 40Z', T);
  glow(x, ...pt(T, 0, 10), 50, '#c8ff8a', 0.4);
  solid(x, p, LG(x, T, -40, -30, 40, 44, [[0, '#e8c88a'], [0.45, '#a07a44'], [1, '#3a2408']]), { sd: 4, surf: 0.6 });
  x.save(); x.clip(p); for (const [a, b] of [[-20, -26], [0, 0], [20, 24]]) stroke(x, P(`M${a * 0.4}-18C${a} 0 ${b} 20 ${b} 46`, T), 'rgba(40,20,0,0.35)', 3); x.restore();
  x.setLineDash([2, 2]); stroke(x, P('M-30 30C-10 38 10 38 30 30', T), 'rgba(255,240,200,0.6)', 0.8); x.setLineDash([]);
  stroke(x, P('M-18-19C-6-14 6-14 18-19', T), '#4a1206', 3.4); stroke(x, P('M-18-19C-6-14 6-14 18-19', T), '#a83a14', 1.8);
  wire(x, P('M10-17C16-8 20 2 14 12', T), 1.6, '#b84a1a'); jewel(x, T, 14, 14, 3, '#ffd040', 'gold');
  solid(x, P('M-14 4h28v20h-28z', T), LG(x, T, 0, 4, 0, 24, 'leather'), { shadow: false, sd: 1 }); x.setLineDash([1.5, 1.5]); stroke(x, P('M-12 6h24v16h-24z', T), 'rgba(255,230,190,0.6)', 0.6); x.setLineDash([]);
  shine(x, P('M0 8C4 12 4 18 0 20C-4 18-4 12 0 8Z', T), '#aaff6a', 5, 0.9);
  for (let i = 0; i < 9; i++) { const [sx, sy] = pt(T, r.range(-26, 26), r.range(-36, -26)); const T2 = { cx: sx, cy: sy - 6, deg: r.range(0, 360), s: (T.s || 1) * r.range(0.7, 1.1) }; glow(x, T2.cx, T2.cy, 6, '#ffe070', 0.5); solid(x, P('M0-4C3-4 4 0 4 2C4 4 2 5 0 5C-2 5-4 4-4 2C-4 0-3-4 0-4Z', T2), RG(x, T2, -1, -1, 6, [[0, '#fffbd0'], [0.5, '#e8c03a'], [1, '#6a4808']]), { shadow: false, sd: 0.8, rd: 0.5, surf: 0, ao: 0 }); }
  leaves(x, r, [[pt(T, 2, -36)[0], pt(T, 2, -36)[1], -70, 0.8 * (T.s || 1)], [pt(T, 0, -34)[0], pt(T, 0, -34)[1], -125, 0.7 * (T.s || 1)]]);
}
/** Giày giáp nhìn nghiêng (mũi sang phải): ống giày, giáp gối, giáp ống quyển, mũi giáp cong, đế + gót. */
function boot(x, r, T, { mat = 'leather', cuff = 'bronze', sole = '#2a1a10', variant = '' } = {}) {
  const wingOn = variant === 'wings' || variant === 'wings2';
  if (wingOn) for (const [s, o, d] of [[1.05, 0, 0], [0.85, -9, 12], [0.7, -16, 24]]) { const [wx, wy] = pt(T, -16, -26 + o), T2 = { cx: wx, cy: wy, deg: (T.deg || 0) - 14 - d, s: (T.s || 1) * s }; const wp = P('M0 0C-12-10-30-14-46-30C-42-16-40-8-46 0C-36 0-30 2-40 8C-28 10-20 12-28 18C-16 16-6 10 0 6Z', T2); solid(x, wp, LG(x, T2, -46, -30, 0, 10, variant === 'wings2' ? 'ivory' : 'silver'), { shadow: true, sd: 1.5, rd: 0.8 }); for (const k of [[-38, -18], [-36, -4], [-30, 10]]) etch(x, P(`M-4 2L${k[0]} ${k[1]}`, T2), 0.3, 0.6); }
  const sh = P('M-21-52H13L12-16C18-7 31-1 42 6C52 12 56 22 52 28C50 31 46 31 42 31H-22C-26 26-27 16-25 6C-23-6-22-30-21-52Z', T);
  solid(x, sh, LG(x, T, -26, -40, 52, 30, mat), { sd: 4, surf: 0.5 });
  x.save(); x.clip(sh); x.fillStyle = LG(x, T, -26, 0, 14, 0, [[0, '#000000', 0.35], [0.4, '#ffffff', 0.14], [1, '#000000', 0.3]]); x.fill(sh);
  etch(x, P('M-24 10C0 12 18 10 30 4', T), 0.45, 1);
  const [hx, hy] = pt(T, -34, 44), sc = T.s || 1;
  for (const R of [80, 66, 52]) { // giáp mu bàn chân: các lá thép cong chồng lên nhau
    const band = new Path2D(); band.arc(hx, hy, (R + 8) * sc, -1.25, 0.2); band.arc(hx, hy, (R - 8) * sc, 0.2, -1.25, true); band.closePath();
    x.save(); x.clip(P('M8-30H70V40H8Z', T)); x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 3 * K; x.shadowOffsetX = 1.2 * K; x.fillStyle = rad(x, hx, hy, (R + 8) * sc, [[(R - 8) / (R + 8), mix(MAT[cuff][2][1], 0.3)], [(R - 3) / (R + 8), MAT[cuff][3][1]], [(R + 3) / (R + 8), MAT[cuff][2][1]], [1, MAT[cuff][0][1]]]); x.fill(band); x.restore();
    x.save(); x.clip(P('M8-30H70V40H8Z', T)); x.strokeStyle = 'rgba(255,250,230,0.7)'; x.lineWidth = 0.7; x.beginPath(); x.arc(hx, hy, (R - 7.4) * sc, -1.2, 0.18); x.stroke(); x.restore();
  }
  solid(x, P('M-30 20C-10 22 20 24 62 22V40H-30Z', T), LG(x, T, 0, 20, 0, 34, [[0, mix(sole === '#2a1a10' ? '#7a5a3a' : '#5a5a6a', 0.6)], [1, sole]]), { shadow: false, sd: 1, surf: 0.4 });
  x.restore();
  stroke(x, P('M-22 30H44', T), 'rgba(255,240,210,0.35)', 0.8);
  solid(x, P('M-13-46H10L10-22C10-12 4-5-1.5-2C-7-5-13-12-13-22Z', T), LG(x, T, -13, 0, 10, 0, bevel(cuff)), { shadow: true, sd: 2 });
  etch(x, P('M-1.5-44V-5', T), 0.4, 0.8);
  solid(x, P(circ(-12, 12, 7), T), RG(x, T, -14, 10, 9, [[0, MAT[cuff][1][1]], [0.6, MAT[cuff][2][1]], [1, MAT[cuff][0][1]]]), { shadow: true, sd: 1.5 }); jewel(x, T, -12, 12, 2.8, '#ff5a3a', cuff);
  solid(x, P('M-26-58C-14-64 10-64 17-56L15-44C2-48-14-48-25-44Z', T), LG(x, T, 0, -64, 0, -44, bevel(cuff)), { sd: 2 });
  wire(x, P('M-22-52C-10-56 6-56 14-51', T), 1, LG(x, T, 0, -56, 0, -50, 'gold'));
  for (const xx of [-18, 2]) solid(x, P(circ(xx, -51, 1.5), T), RG(x, T, xx - 0.5, -52, 2, [[0, '#ffffff'], [1, '#4a3010']]), { shadow: false, sd: 0.4, surf: 0, ao: 0, back: null });
  if (variant === 'plate') for (const y of [-6, 6]) solid(x, P(`M-24 ${y}h36v7h-36z`, T), LG(x, T, 0, y, 0, y + 7, bevel('steel')), { shadow: false, sd: 1 });
  if (variant === 'leaf') leaves(x, r, [[pt(T, -22, -54)[0], pt(T, -22, -54)[1], -150, 0.85 * (T.s || 1)], [pt(T, -18, -56)[0], pt(T, -18, -56)[1], -110, 0.75 * (T.s || 1)], [pt(T, 12, -56)[0], pt(T, 12, -56)[1], -40, 0.7 * (T.s || 1)], [pt(T, 40, 20)[0], pt(T, 40, 20)[1], 20, 0.55 * (T.s || 1)]]);
  const emb = { stars: ['M0-7L2-2L7-2L3 1L5 7L0 3L-5 7L-3 1L-7-2L-2-2Z', '#e8c8ff'], clock: [circ(0, 0, 6), '#9ae0ff'], shield: ['M0-8L7-5L6 2C5 6 2 8 0 9C-2 8-5 6-6 2L-7-5Z', '#fff0b0'], bolt: ['M2-9L-5 1H0L-2 9L5-1H0Z', '#fff4a0'] }[variant];
  if (emb) { const T2 = { cx: pt(T, -2, -30)[0], cy: pt(T, -2, -30)[1], deg: T.deg || 0, s: (T.s || 1) * 1.45 }; glow(x, T2.cx, T2.cy, 18, emb[1], 0.7);
    solid(x, P(emb[0], T2), RG(x, T2, -2, -3, 10, [[0, '#ffffff'], [0.45, emb[1]], [1, mix(emb[1], 0.15)]]), { shadow: true, sd: 1.2, rd: 0.7, surf: 0 }); wire(x, P(emb[0], T2), 0.7, LG(x, T2, -8, -8, 8, 8, 'gold'));
    if (variant === 'clock') stroke(x, P('M0-4V0L3 2', T2), '#20304a', 1); }
  if (variant === 'wings2' || variant === 'bolt') jewel(x, T, -2, -30, 3.6, variant === 'bolt' ? '#ffd040' : '#7ad8ff', cuff);
}
function seed(x, r, T, { c = ['#fffbe0', '#ffd23a', '#c86a08'] } = {}) {
  const [cx, cy] = pt(T, 0, 0); rays(x, r, cx, cy, { n: 34, r0: 10, len: [24, 56], w: [2, 5], c: ['#ffe28a', '#ffffff'], alpha: 0.5 }); glow(x, cx, cy, 48, '#ffc840', 0.85);
  const p = P('M0-36C21-23 23 15 0 36C-23 15-21-23 0-36Z', T); solid(x, p, RG(x, T, -6, -10, 42, [[0, c[0]], [0.4, c[1]], [1, c[2]]]), { sd: 3, surf: 0.3 });
  x.save(); x.clip(p); for (const k of [-10, 0, 10]) etch(x, P(`M${k}-32C${k + 6}-10 ${k + 6} 10 ${k} 32`, T), 0.35, 1); x.restore();
  shine(x, P('M-6-20C-2-24 2-24 4-18C0-14-4-14-6-20Z', T), '#ffffff', 4, 0.9);
  leaves(x, r, [[pt(T, 0, -34)[0], pt(T, 0, -34)[1], -60, 0.7 * (T.s || 1)], [pt(T, 0, -34)[0], pt(T, 0, -34)[1], -130, 0.55 * (T.s || 1)]]);
}
function fang(x, T) {
  const f = P('M-12-44C10-40 24-20 20 6C18 24 9 38 0 50C2 30 2 10-5-10C-9-24-16-34-12-44Z', T);
  solid(x, f, LG(x, T, -14, 0, 22, 0, bevel('ivory')), { sd: 3, surf: 0.4 });
  x.save(); x.clip(f); for (const y of [-30, -16, -2]) etch(x, P(`M-10 ${y}C0 ${y - 3} 10 ${y - 2} 22 ${y + 2}`, T), 0.25, 0.8); x.restore();
  stroke(x, P('M14-20C20-4 16 20 2 44', T), 'rgba(255,255,255,0.7)', 1.2);
  solid(x, P('M-18-46C-8-54 10-50 14-40L-12-36C-14-40-16-42-18-46Z', T), LG(x, T, 0, -52, 0, -36, 'leather'), { shadow: false, sd: 1.5 });
  wire(x, P('M-36-52C-20-58 0-58 16-50', T), 1.6, '#7a3a14');
  for (const [xx, c] of [[-28, '#ff5a2a'], [-14, '#ffd040'], [2, '#5ae08a']]) jewel(x, T, xx, -55, 2.8, c, 'bronze');
}
function crown(x, T, { mat = 'silver', gemC = ['#eafcff', '#7ac8ff', '#0a2a5a'] } = {}) {
  const top = P('M-44 8L-48-28L-30-10L-22-36L-10-12L0-44L10-12L22-36L30-10L48-28L44 8Z', T);
  solid(x, top, LG(x, T, -48, -44, 48, 8, bevel(mat)), { sd: 3 });
  x.save(); x.clip(top); for (const xx of [-22, 0, 22]) etch(x, P(`M${xx}-30V4`, T), 0.35, 0.8); x.restore();
  solid(x, P('M-45 6h90v22h-90z', T), LG(x, T, 0, 6, 0, 28, bevel(mat)), { sd: 3 });
  etch(x, P('M-43 10H43M-43 24H43', T), 0.45, 0.8);
  for (const xx of [-34, -12, 12, 34]) wire(x, P(SCROLL, { cx: pt(T, xx, 17)[0], cy: pt(T, xx, 17)[1], deg: T.deg || 0, s: (T.s || 1) * 0.5 }), 0.9, LG(x, T, 0, 10, 0, 24, mat));
  for (const [gx, gy, rr] of [[-48, -30, 3.4], [48, -30, 3.4], [-22, -38, 3], [22, -38, 3], [0, -46, 4.6]]) jewel(x, T, gx, gy, rr, gemC[1], mat);
  const [mx, my] = pt(T, 0, 17); glow(x, mx, my, 20, '#e0f0ff', 0.7);
  solid(x, P('M-6 9A10 10 0 1 0 6 25A8 8 0 1 1-6 9Z', T), RG(x, T, 0, 16, 12, [[0, '#ffffff'], [0.5, '#e0f0ff'], [1, '#7aa8d8']]), { shadow: true, sd: 1, surf: 0 });
}
function bell(x, T, { mat = 'bronze' } = {}) {
  wire(x, P('M0-58C-10-58-10-46 0-46C10-46 10-58 0-58', T), 2.4, across(x, T, 10, mat));
  const b = P('M-30 24C-30-8-24-38 0-42C24-38 30-8 30 24L38 32H-38Z', T);
  solid(x, b, LG(x, T, -38, 0, 38, 0, bevel(mat)), { sd: 4 });
  x.save(); x.clip(b); for (const y of [-26, 6, 20]) { etch(x, P(`M${-26 - (y + 26) * 0.1} ${y}C-10 ${y + 3} 10 ${y + 3} ${26 + (y + 26) * 0.1} ${y}`, T), 0.5, 1.2); }
  for (let i = -3; i <= 3; i++) solid(x, P(circ(i * 7.5, -10 + Math.abs(i) * 0.6, 1.9), T), RG(x, T, i * 7.5 - 0.6, -10.6, 2.6, [[0, '#ffe8b0'], [1, '#5a2e0a']]), { shadow: false, sd: 0.6, surf: 0, ao: 0, back: null });
  etch(x, P('M-20-2C-10 1 10 1 20-2M-18-18C-8-15 8-15 18-18', T), 0.4, 0.7);
  x.restore();
  jewel(x, T, 0, -34, 3, '#4ae0d0', 'gold');
  const [cx, cy] = pt(T, 0, 40); glow(x, cx, cy, 16, '#ffd070', 0.6);
  solid(x, P(circ(0, 39, 6), T), RG(x, T, -2, 37, 7, [[0, '#fff0c0'], [0.5, '#c88a3a'], [1, '#3a1a06']]), { shadow: false, sd: 1 });
}
function bracelet(x, T, { mat = 'silver', gemC = '#7ae0ff' } = {}) {
  const m = M(T), p = new Path2D(), e1 = new Path2D(), e2 = new Path2D(); e1.ellipse(0, 0, 42, 27, 0, 0, TAU); e2.ellipse(0, 0, 31, 17, 0, 0, TAU, true); p.addPath(e1, m); p.addPath(e2, m);
  solid(x, p, LG(x, T, -42, -27, 42, 27, bevel(mat)), { sd: 3 });
  x.save(); x.clip(p); for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; etch(x, P(`M${Math.cos(a) * 32} ${Math.sin(a) * 18}L${Math.cos(a + 0.12) * 41} ${Math.sin(a + 0.12) * 26}`, T), 0.3, 0.6); } x.restore();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, gx = Math.cos(a) * 36.5, gy = Math.sin(a) * 22; if (i % 2) solid(x, P(circ(gx, gy, 1.8), T), RG(x, T, gx - 0.6, gy - 0.6, 2.4, [[0, '#ffffff'], [1, '#4a5060']]), { shadow: false, sd: 0.5, surf: 0, ao: 0, back: null }); else jewel(x, T, gx, gy, 3.2, gemC, mat); }
}
function claws(x, r, T) {
  for (const [ox, a, s] of [[-20, -16, 0.9], [0, 0, 1.08], [20, 16, 0.9]]) { const [cx, cy] = pt(T, ox, 6), T2 = { cx, cy, deg: (T.deg || 0) + a, s: (T.s || 1) * s }; const cp = P('M-7 30C-15 4-11-24 6-50C0-20 4 6 9 28Z', T2); solid(x, cp, LG(x, T2, -10, 0, 8, 0, bevel('ivory')), { sd: 2.5 }); x.save(); x.clip(cp); x.fillStyle = LG(x, T2, 0, -50, 0, 0, [[0, '#ff8a2a', 0.5], [1, '#ff8a2a', 0]]); x.fill(cp); x.restore(); stroke(x, P('M-9 26C-12 4-8-20 4-44', T2), 'rgba(255,255,255,0.6)', 0.9); }
  const g = P('M-36 28C-30 18 30 18 36 28L32 48H-32Z', T);
  solid(x, g, LG(x, T, 0, 20, 0, 48, [[0, '#f0b050'], [0.5, '#a05a12'], [1, '#3a1a04']]), { sd: 3, surf: 0.5 });
  for (const xx of [-22, -8, 8, 22]) { etch(x, P(`M${xx - 3} 26l4 18`, T), 0.7, 2); }
  wire(x, P('M-34 30C-10 24 10 24 34 30', T), 1.4, LG(x, T, 0, 24, 0, 32, 'gold')); jewel(x, T, 0, 38, 4, '#ff7a1a', 'gold');
}
function scepter(x, r, T, { mat = 'gold', starC = '#fff4b0' } = {}) {
  solid(x, P('M-3.4-20h6.8v88h-6.8z', T), across(x, T, 3.4, mat), { sd: 2 });
  for (const y of [-14, 20, 56]) { solid(x, P(`M-6.5 ${y}h13v6h-13z`, T), across(x, T, 6.5, mat), { shadow: false, sd: 1 }); }
  jewel(x, T, 0, 23, 2.4, '#b8a0ff', mat); jewel(x, T, 0, 70, 3.6, '#b8a0ff', mat);
  for (const s of [-1, 1]) wire(x, P(`M${s * 3}-18C${s * 18}-20 ${s * 22}-34 ${s * 14}-46`, T), 2, across(x, T, 14, mat));
  const [cx, cy] = pt(T, 0, -42); glow(x, cx, cy, 40, '#b8a8ff', 0.75);
  for (const [rx, ry, rot] of [[30, 10, -20], [26, 9, 40]]) { const ringP = new Path2D(); ringP.ellipse(cx, cy, rx * (T.s || 1), ry * (T.s || 1), ((T.deg || 0) + rot) * Math.PI / 180, 0, TAU); x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = '#b8a0ff'; x.shadowBlur = 5 * K; stroke(x, ringP, 'rgba(220,200,255,0.85)', 1.4); x.restore(); }
  const st = P('M0-24L6-8L23-8L9 2L14 19L0 9L-14 19L-9 2L-23-8L-6-8Z', { cx, cy, deg: T.deg || 0, s: T.s || 1 });
  shine(x, st, '#fff0a0', 8, 0.5);
  solid(x, st, RG(x, { cx, cy, s: T.s || 1 }, -4, -6, 26, [[0, '#ffffff'], [0.45, starC], [1, '#a06a10']]), { sd: 2.5, surf: 0 });
  for (const d of ['M0-24L0 0', 'M23-8L0 0', 'M14 19L0 0', 'M-14 19L0 0', 'M-23-8L0 0']) stroke(x, P(d, { cx, cy, deg: T.deg || 0, s: T.s || 1 }), 'rgba(160,100,10,0.5)', 0.6);
  glow(x, cx, cy, 8, '#ffffff', 1);
}
function helmet(x, T, { mat = 'bronze', horn = 'ivory' } = {}) {
  for (const s of [-1, 1]) { const hp = P(`M${-28 * s}-16C${-52 * s}-24 ${-60 * s}-48 ${-46 * s}-68C${-44 * s}-46 ${-36 * s}-34 ${-24 * s}-30Z`, T); solid(x, hp, LG(x, T, -40 * s, -66, -24 * s, -16, bevel(horn)), { sd: 3 }); x.save(); x.clip(hp); for (let k = 0; k < 5; k++) etch(x, P(`M${-30 * s - k * 4 * s}${-20 - k * 8}l${-8 * s}-4`, T), 0.35, 0.9); x.restore(); }
  const hb = P('M-34 12C-34-24-18-46 0-46C18-46 34-24 34 12L34 34L18 36L15 4H-15L-18 36L-34 34Z', T);
  solid(x, hb, LG(x, T, -34, -46, 34, 36, bevel(mat)), { sd: 4 });
  x.save(); x.clip(hb); x.fillStyle = LG(x, T, -34, 0, 34, 0, [[0, '#000000', 0.35], [0.4, '#ffffff', 0.15], [1, '#000000', 0.45]]); x.fill(hb); x.restore();
  fillA(x, P('M-15 4H15L18 36H-18Z', T), LG(x, T, 0, 4, 0, 36, [[0, '#0a0606'], [1, '#2a1410']]));
  const ey = P('M-13 8C-8 12-3 12-1 10M13 8C8 12 3 12 1 10', T); shine(x, ey, '#ff5a2a', 4, 0.9); stroke(x, ey, '#ffb060', 1.2);
  solid(x, P('M-4.5-44h9v52h-9z', T), across(x, T, 4.5, 'gold'), { shadow: false, sd: 1 });
  etch(x, P('M-33 0C-20-6 20-6 33 0M-34 20H-18M18 20H34', T), 0.5, 1);
  for (const xx of [-26, -24, 24, 26]) solid(x, P(circ(xx, xx < 0 ? -12 : -12, 1.8), T), RG(x, T, xx, -13, 2.5, [[0, '#fff'], [1, '#8a5a1a']]), { shadow: false, sd: 0.6, surf: 0, ao: 0, back: null });
  jewel(x, T, 0, -32, 4.4, '#ff3a2a', 'gold');
}
function roundShield(x, r, T, { rim = 'gold', face = ['#ffd860', '#c86a10'] } = {}) {
  solid(x, P(circ(0, 0, 48), T), LG(x, T, -48, -48, 48, 48, bevel(rim)), { sd: 4 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; solid(x, P(circ(Math.cos(a) * 44, Math.sin(a) * 44, 1.6), T), RG(x, T, Math.cos(a) * 44 - 0.5, Math.sin(a) * 44 - 0.5, 2.2, [[0, '#ffffff'], [1, '#6a3a08']]), { shadow: false, sd: 0.5, surf: 0, ao: 0, back: null }); }
  solid(x, P(circ(0, 0, 39), T), RG(x, T, -8, -10, 50, [[0, face[0]], [0.6, face[1]], [1, '#4a1a04']]), { shadow: false, sd: 2 });
  for (let i = 0; i < 12; i++) { const T2 = { ...T, deg: (T.deg || 0) + i * 30 }; const rp = P('M-5-16L0-36L5-16Z', T2); fillA(x, rp, LG(x, T2, -5, 0, 5, 0, [[0, '#fff6c0'], [0.5, '#ffd050'], [0.52, '#d88a18'], [1, '#a05a08']])); stroke(x, rp, 'rgba(90,40,0,0.5)', 0.5); }
  for (let i = 0; i < 12; i++) { const T2 = { ...T, deg: (T.deg || 0) + i * 30 + 15 }; fillA(x, P('M-2.5-16L0-27L2.5-16Z', T2), 'rgba(255,240,180,0.7)'); }
  const [cx, cy] = pt(T, 0, 0); glow(x, cx, cy, 30, '#ffd040', 0.9);
  solid(x, P(circ(0, 0, 14), T), RG(x, T, -4, -4, 17, [[0, '#ffffff'], [0.4, '#ffe070'], [1, '#c86a08']]), { shadow: true, sd: 1.5, surf: 0 });
  wire(x, P(circ(0, 0, 15), T), 1.4, LG(x, T, -15, -15, 15, 15, 'gold'));
}

// —— khung theo bậc ——
const FRAME = { 1: '#d89a62', 2: '#c4d0e4', 3: '#f0c040' };
const rr = (a, rad_) => { const q = new Path2D(); q.roundRect(a, a, 128 - 2 * a, 128 - 2 * a, rad_); return q; };
function finishItem(x, tier) {
  bloom(x, 0.42); grade(x);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.07; x.drawImage(grain(), 0, 0); x.restore();
  x.save();
  x.fillStyle = rad(x, 64, 60, 92, [[0.55, '#000000', 0], [0.85, '#000000', 0.35], [1, '#000000', 0.75]]); x.fillRect(0, 0, 128, 128);
  x.fillStyle = lin(x, 0, 0, 0, 46, [[0, '#ffffff', 0.17], [1, '#ffffff', 0]]); x.beginPath(); x.ellipse(64, 12, 60, 24, 0, 0, TAU); x.fill();
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; x.fill(rr(0.5, 17)); x.globalCompositeOperation = 'source-over';
  const c = FRAME[tier] || FRAME[1], w = tier === 3 ? 4.6 : tier === 2 ? 3.8 : 3.2, m = 0.5 + w / 2 + 0.6;
  // quầng màu chủ đề hắt vào trong khung
  x.save(); x.clip(rr(m + w / 2, 13)); x.shadowColor = col(c, 0.8); x.shadowBlur = 4 * K; x.lineWidth = 1.6; x.strokeStyle = col(c, 0.4); x.stroke(rr(m + w / 2 - 0.6, 13)); x.restore();
  x.lineWidth = w + 2.2; x.strokeStyle = 'rgba(4,4,8,0.95)'; x.stroke(rr(m, 15));
  const g = x.createConicGradient(-2.4, 64, 64);
  for (const [o, k] of [[0, 1], [0.1, 0.45], [0.22, 0.85], [0.38, 0.22], [0.52, 0.72], [0.68, 0.2], [0.84, 0.62], [1, 1]]) g.addColorStop(o, mix(c, k));
  x.lineWidth = w; x.strokeStyle = g; x.stroke(rr(m, 15));
  x.lineWidth = 0.6; x.strokeStyle = 'rgba(255,255,255,0.6)'; x.stroke(rr(m - w / 2 + 0.5, 15.5));
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.stroke(rr(m + w / 2 - 0.4, 14));
  if (tier >= 2) for (const [cx, cy] of [[m, m], [128 - m, m], [128 - m, 128 - m], [m, 128 - m]]) { // đinh tán góc
    const k = tier === 3 ? 3.4 : 2.2; solid(x, P(circ(0, 0, k), { cx: cx + (cx < 64 ? 3 : -3), cy: cy + (cy < 64 ? 3 : -3) }), rad(x, cx - 1, cy - 1, k * 1.6, [[0, '#ffffff'], [0.45, mix(c, 0.7)], [1, mix(c, 0.1)]]), { shadow: false, sd: 0.8, rd: 0.5, surf: 0, back: null, ao: 0 });
  }
  if (tier === 3) { // chạm vàng: hoa văn cuộn ở bốn góc + đá đỏ đỉnh khung
    for (const [cx, cy, a] of [[m, m, 0], [128 - m, m, 90], [128 - m, 128 - m, 180], [m, 128 - m, 270]]) {
      const T = { cx, cy, deg: a, s: 1 };
      solid(x, P('M-2 4C6 4 12 0 20-1C14 2 10 6 4 7C8 9 10 13 9 18C6 12 3 9-2 9Z', T), lin(x, cx - 6, cy - 6, cx + 12, cy + 12, [[0, '#fff6c8'], [0.5, mix(c, 0.6)], [1, mix(c, 0.15)]]), { shadow: true, sd: 1, rd: 0.6, surf: 0, back: null, ao: 0 });
      solid(x, P('M4-2C10-2 15 2 18 8C12 6 8 6 4 8C2 6 2 2 4-2Z', T), lin(x, cx, cy, cx + 14, cy + 10, [[0, '#fff2b8'], [1, mix(c, 0.25)]]), { shadow: false, sd: 0.8, rd: 0.5, surf: 0, back: null, ao: 0 });
      solid(x, P(circ(4, 4, 2.4), T), rad(x, cx + 1, cy + 1, 5, [[0, '#ffffff'], [0.4, '#ff5a6a'], [1, '#4a0010']]), { shadow: false, sd: 0.5, rd: 0.4, surf: 0, back: null, ao: 0 });
    }
    solid(x, P('M0-6L5 0L0 6L-5 0Z', { cx: 64, cy: m }), rad(x, 63, m - 2, 7, [[0, '#ffffff'], [0.35, '#ff7080'], [1, '#5a0010']]), { shadow: true, sd: 0.8, rd: 0.5, surf: 0, back: null, ao: 0 });
    for (const s of [-1, 1]) solid(x, P(`M${6 * s} -2C${12 * s} -3 ${18 * s} -1 ${22 * s} 2C${16 * s} 1 ${11 * s} 2 ${6 * s} 2Z`, { cx: 64, cy: m }), lin(x, 50, m - 3, 50, m + 3, [[0, '#fff6c8'], [1, mix(c, 0.2)]]), { shadow: false, sd: 0.6, rd: 0.4, surf: 0, back: null, ao: 0 });
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
  giay_co: ['#9ad870', '#14300e', (x, r) => { boot(x, r, C(55, 74, -8, 0.9), { mat: 'jade', cuff: 'wood', variant: 'leaf' }); }],
  giay_chien: ['#d88a6a', '#2a1010', (x, r) => { rays(x, r, 64, 64, { n: 18, r0: 14, len: [30, 60], w: [3, 6], c: '#ffb08a', alpha: 0.25 }); boot(x, r, C(55, 74, -8, 0.9), { mat: 'steel', cuff: 'gold', sole: '#1a1a20', variant: 'plate' }); }],
  giay_toc_chien: ['#ffb44a', '#3a1404', (x, r) => { streaks(x, r, 0, { n: 16, box: [60, 20, 124, 110], len: [20, 50], w: [1.5, 3.5], c: '#ffe0a0', alpha: 0.6 }); boot(x, r, C(53, 74, -12, 0.9), { mat: 'crimson', cuff: 'gold', variant: 'bolt' }); bolt(x, r, 100, 18, 84, 56, '#ffe070'); }],
  giay_phap_su: ['#b47aff', '#1a0a3a', (x, r) => { stars(x, r, 12, [10, 10, 118, 118], '#e0c8ff'); boot(x, r, C(55, 74, -8, 0.9), { mat: 'violet', cuff: 'gold', variant: 'stars' }); }],
  giay_tinh_tam: ['#7ac0ff', '#0a1a3a', (x, r) => { swirl(x, r, 64, 64, { arms: 5, r0: 20, r1: 60, turns: 0.5, w: [1, 3], c: '#bfe0ff', alpha: 0.4 }); boot(x, r, C(55, 74, -8, 0.9), { mat: 'ice', cuff: 'silver', variant: 'clock' }); }],
  giay_kien_nhan: ['#6ad0b0', '#0a2a24', (x, r) => { glow(x, 64, 60, 50, '#8affd8', 0.35); boot(x, r, C(55, 74, -8, 0.9), { mat: 'emerald', cuff: 'gold', variant: 'shield' }); }],
  giay_lu_hanh: ['#8ad0ff', '#14243a', (x, r) => { streaks(x, r, -0.3, { n: 10, box: [70, 20, 124, 100], len: [20, 40], c: '#e8f8ff', alpha: 0.5 }); boot(x, r, C(60, 76, -8, 0.88), { mat: 'leather', cuff: 'silver', variant: 'wings2' }); }],
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
  const h = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 11) >>> 0, [c0, c1, draw] = ITEM[id], x = mk(), r = rngFor(h);
  begin(); backdrop(x, c0, c1, h % 997);
  // vật thể vẽ trên lớp riêng → quầng sáng màu chủ đề ôm viền vật (tách vật khỏi nền như tranh icon MOBA)
  const o = mk(); draw(o, r);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  const a = mk(); a.setTransform(1, 0, 0, 1, 0, 0); a.imageSmoothingQuality = 'high'; a.drawImage(blurred(o.canvas, 14), 0, 0, S, S); a.globalCompositeOperation = 'source-in'; a.fillStyle = c0; a.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5; x.drawImage(a.canvas, 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(o.canvas, 0, 0); x.restore();
  finishItem(x, tier);
  const url = x.canvas.toDataURL('image/png'); cache.set(id, url); return url;
}
export const ITEM_ART_IDS = Object.keys(ITEM);
// bộ vẽ vật thể dùng lại cho icon kỹ năng (paint.js gọi lúc vẽ, không lúc nạp module)
export const D = { sword, axe, hammer, boot, chest, kite, crescent, bow, spear, flames, bolt, jewel, wire, etch, bevel, across, LG, RG, P, pt, circ, MAT, stroke, fillA };
/** Vẽ sẵn icon trang bị lúc rảnh, mỗi lượt một món (tránh khựng khi mở shop lần đầu); món nào đã vẽ thì bỏ qua. */
export function warmItemArt(tierOf, ids = ITEM_ART_IDS) {
  if (typeof document === 'undefined') return;
  const q = ids.filter((id) => !cache.has(id)), idle = globalThis.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 50));
  const step = (dl) => { do { const id = q.shift(); if (id) itemArtURL(id, tierOf(id)); } while (q.length && dl.timeRemaining() > 40); if (q.length) idle(step); };
  idle(step);
}
