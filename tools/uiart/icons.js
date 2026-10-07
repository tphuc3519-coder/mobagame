// Biểu tượng sảnh kiểu tranh vẽ (cùng bộ vẽ với icon kỹ năng / trang bị: src/hud/paint.js, src/hud/itemArt.js): vật thể có khối, kim loại vát,
// viền sáng, quầng sáng, bloom — nền trong suốt. Dựng sẵn thành assets/ui/icons/<tên>.webp bằng tools/uiart/icons.cjs (không vẽ lúc chạy game).
// Toạ độ vẽ 0..128 (ảnh 256²).
import { mk, lin, rad, solid, shine, glow, sparks, rays, bloom, grade, lantern, mix, begin, setAccent, TAU, K } from '../../src/hud/paint.js';
import { D } from '../../src/hud/itemArt.js';
import { rngFor } from '../../src/render/env/noise.js';

const T = (cx = 64, cy = 64, deg = 0, s = 1) => ({ cx, cy, deg, s });
const P = D.P, LG = D.LG, RG = D.RG, circ = D.circ, stroke = D.stroke, fillA = D.fillA;
const bev = (m) => D.bevel(m);
/** Sao lấp lánh 4 cánh (điểm nhấn kim loại / đá quý). */
function twinkle(x, cx, cy, s = 8, c = '#fff6d0') {
  glow(x, cx, cy, s * 1.8, c, 0.8);
  x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(cx, cy - s); x.quadraticCurveTo(cx, cy, cx + s * 0.18, cy); x.quadraticCurveTo(cx, cy, cx, cy + s); x.quadraticCurveTo(cx, cy, cx - s * 0.18, cy); x.quadraticCurveTo(cx, cy, cx, cy - s); x.fill();
  x.beginPath(); x.moveTo(cx - s * 0.7, cy); x.quadraticCurveTo(cx, cy, cx, cy + s * 0.14); x.quadraticCurveTo(cx, cy, cx + s * 0.7, cy); x.quadraticCurveTo(cx, cy, cx, cy - s * 0.14); x.quadraticCurveTo(cx, cy, cx - s * 0.7, cy); x.fill();
  x.restore();
}
const starPath = (n, R, r0, rot = -90) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * Math.PI / 180, rr = i % 2 ? r0 : R; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(2) + ' ' + (Math.sin(a) * rr).toFixed(2); } return d + 'Z'; };

// ———————————————— đồ vật ————————————————
function coin(x, r, t = T(64, 62)) {
  setAccent('#ffcf5a'); glow(x, t.cx, t.cy, 58 * t.s, '#ffb840', 0.32);
  solid(x, P(circ(0, 6, 44), t), LG(x, t, -44, 0, 44, 0, 'gold'), { sd: 2.5, surf: 0.15 });
  solid(x, P(circ(0, 0, 44), t), RG(x, t, -16, -18, 72, [[0, '#fffbe0'], [0.3, '#ffd866'], [0.72, '#cf8c20'], [1, '#6a3e08']]), { sd: 2, surf: 0.2, shadow: false });
  stroke(x, P(circ(0, 0, 36), t), 'rgba(120,64,0,0.75)', 2.6); stroke(x, P(circ(0, 0, 34.2), t), 'rgba(255,246,200,0.7)', 1);
  for (const [dx, dy] of [[0, -23], [23, 0], [0, 23], [-23, 0]]) D.etch(x, P(`M${dx - 4.5} ${dy - 2}h9M${dx - 4.5} ${dy + 2}h9M${dx} ${dy - 5}v10`, t), 0.55, 1.4);
  fillA(x, P('M-11-11h22v22h-22z', t), 'rgba(36,18,0,0.95)');
  stroke(x, P('M-11 11V-11H11', t), 'rgba(70,36,0,0.95)', 1.8); stroke(x, P('M11-11V11H-11', t), 'rgba(255,238,180,0.85)', 1.3);
  twinkle(x, t.cx - 22 * t.s, t.cy - 24 * t.s, 10 * t.s);
}
function coins(x, r) { coin(x, r, T(78, 74, 0, 0.62)); coin(x, r, T(48, 80, 0, 0.62)); coin(x, r, T(62, 50, 0, 0.7)); }
function gem(x, r) { setAccent('#5ab0ff'); D.gem(x, T(64, 58, 0, 1.12), ['#eafaff', '#3a8cff', '#081850']); twinkle(x, 44, 32, 10, '#d8f4ff'); }
function mail(x, r) {
  setAccent('#ffd27a'); glow(x, 64, 66, 56, '#ffc870', 0.28);
  const t = T(64, 68, -7, 1);
  solid(x, P('M-44-26Q-44-30-40-30H40Q44-30 44-26V28Q44 32 40 32H-40Q-44 32-44 28Z', t), LG(x, t, 0, -30, 0, 32, [[0, '#fffaf0'], [0.55, '#eadcbc'], [1, '#b49e72']]), { sd: 3, surf: 0.12 });
  stroke(x, P('M-42 30L-6 2M42 30L6 2', t), 'rgba(120,96,56,0.55)', 1.6);
  solid(x, P('M-44-28L0 8L44-28Z', t), LG(x, t, 0, -28, 0, 8, [[0, '#fbf2dc'], [1, '#c8b086']]), { shadow: false, sd: 1.5, surf: 0.08, rd: 1 });
  stroke(x, P('M-40-28L0 4L40-28', t), 'rgba(184,140,60,0.7)', 1.6);
  solid(x, P(circ(0, 6, 12), t), RG(x, t, -4, 2, 18, [[0, '#ff8a7a'], [0.45, '#c8101e'], [1, '#4a0008']]), { sd: 1.5, surf: 0.1 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; solid(x, P(circ(Math.cos(a) * 12.5, 6 + Math.sin(a) * 12.5, 3), t), RG(x, t, Math.cos(a) * 12, 6 + Math.sin(a) * 12, 4, [[0, '#e83a3a'], [1, '#5a0010']]), { shadow: false, sd: 0.6, surf: 0, ao: 0, back: null }); }
  D.etch(x, P(starPath(5, 6.5, 2.8).replace(/([-\d.]+) ([-\d.]+)/g, (m, a, b) => `${a} ${(+b + 6).toFixed(2)}`), t), 0.55, 1);
  twinkle(x, 34, 40, 7);
}
function gear(x, r) {
  setAccent('#9ad8ff');
  const t = T(64, 64, 8, 1), n = 9; let d = '';
  for (let i = 0; i < n; i++) { const a0 = i / n * TAU, w = TAU / n; for (const [f, R] of [[0.0, 34], [0.12, 46], [0.38, 46], [0.5, 34]]) { const a = a0 + w * f; d += (d ? 'L' : 'M') + (Math.cos(a) * R).toFixed(2) + ' ' + (Math.sin(a) * R).toFixed(2); } }
  solid(x, P(d + 'Z', t), LG(x, t, -46, -46, 46, 46, bev('silver')), { sd: 3, surf: 0.25 });
  solid(x, P(circ(0, 0, 26), t), RG(x, t, -8, -10, 40, [[0, '#ffffff'], [0.45, '#9aa4b8'], [1, '#3a4252']]), { shadow: false, sd: 2 });
  stroke(x, P(circ(0, 0, 21), t), 'rgba(40,48,64,0.7)', 1.6);
  D.jewel(x, t, 0, 0, 10, '#4aa8ff', 'gold');
  twinkle(x, 40, 34, 8, '#e8f6ff');
}
function trophy(x, r) {
  setAccent('#ffd25a'); glow(x, 64, 52, 56, '#ffc84a', 0.42);
  rays(x, r, 64, 46, { n: 18, r0: 18, len: [26, 50], w: [2, 5], c: ['#fff0b0', '#ffd060'], alpha: 0.28 });
  const t = T(64, 60, 0, 1);
  for (const s of [-1, 1]) { const h = P(`M${30 * s}-30C${50 * s}-32 ${52 * s}-6 ${28 * s} 2`, t); stroke(x, h, '#3a2000', 9); stroke(x, h, '#e0a030', 6.4); stroke(x, h, 'rgba(255,246,200,0.8)', 2); }
  solid(x, P('M-32-40H32C32-4 18 12 0 16C-18 12-32-4-32-40Z', t), LG(x, t, -32, 0, 32, 0, bev('gold')), { sd: 3.5, surf: 0.2 });
  solid(x, P('M-34-44h68v7h-68z', t), LG(x, t, 0, -44, 0, -37, bev('gold')), { shadow: false, sd: 1.2 });
  solid(x, P(starPath(5, 13, 5.6), T(64, 52, 0, 1)), RG(x, t, -3, -14, 18, [[0, '#ffffff'], [0.4, '#ff6a6a'], [1, '#7a0010']]), { shadow: false, sd: 1, surf: 0 });
  solid(x, P('M-6 16h12v12h-12z', t), LG(x, t, -6, 0, 6, 0, bev('gold')), { shadow: false, sd: 1 });
  solid(x, P('M-22 28h44l4 8h-52z', t), LG(x, t, 0, 28, 0, 36, bev('gold')), { sd: 2 });
  solid(x, P('M-30 36h60v12h-60z', t), LG(x, t, -30, 0, 30, 0, bev('wood')), { sd: 2.5, surf: 0.4 });
  stroke(x, P('M-26 42h52', t), 'rgba(255,220,150,0.55)', 1.2);
  twinkle(x, 44, 28, 9);
}
function friends(x, r) {
  setAccent('#7ae0ff');
  const back = T(78, 60, 0, 1), front = T(54, 68, 0, 1.1);
  for (const [t, c] of [[back, [['0', '#d8f6ff'], ['0.5', '#3aa8e8'], ['1', '#0a2a5a']]], [front, [['0', '#fff6d0'], ['0.5', '#e8a83a'], ['1', '#5a3006']]]]) {
    const st = c.map(([o, cc]) => [+o, cc]);
    solid(x, P('M-26 40C-26 16-14 6 0 6S26 16 26 40Z', t), LG(x, t, -26, 6, 26, 40, st), { sd: 3, surf: 0.15 });
    solid(x, P(circ(0, -12, 15), t), RG(x, t, -5, -18, 22, st), { sd: 2.5, surf: 0.1 });
  }
  glow(x, 54, 50, 30, '#ffd27a', 0.25);
}
function chat(x, r) {
  setAccent('#7ad8ff');
  const t = T(64, 60, 0, 1);
  solid(x, P('M-40-30Q-46-30-46-24V14Q-46 20-40 20H-14L-26 38L2 20H40Q46 20 46 14V-24Q46-30 40-30Z', t), LG(x, t, 0, -30, 0, 38, [[0, '#d8f6ff'], [0.35, '#4ab8ff'], [1, '#0a3a8a']]), { sd: 3, surf: 0.1 });
  for (const dx of [-20, 0, 20]) solid(x, P(circ(dx, -5, 6), t), RG(x, t, dx - 2, -8, 8, [[0, '#ffffff'], [1, '#bfe8ff']]), { shadow: false, sd: 0.8, surf: 0, ao: 0 });
  twinkle(x, 36, 38, 7, '#e8f8ff');
}
function scroll(x, r) { // bản đồ cuộn: chọn chế độ
  setAccent('#ffc86a'); glow(x, 64, 64, 56, '#ffd080', 0.25);
  const t = T(64, 64, -14, 1);
  solid(x, P('M-30-38C-20-34-10-40 0-36S20-34 30-38V36C20 40 10 34 0 38S-20 40-30 36Z', t), LG(x, t, -30, -38, 30, 38, [[0, '#fff4d0'], [0.5, '#e8cc8a'], [1, '#a07a3a']]), { sd: 3, surf: 0.45 });
  x.save(); x.clip(P('M-30-38C-20-34-10-40 0-36S20-34 30-38V36C20 40 10 34 0 38S-20 40-30 36Z', t));
  stroke(x, P('M-24 20L-14 8L-6 14L4-2L14 6L24-10', t), 'rgba(110,70,30,0.6)', 1.6);
  stroke(x, P('M-22-20L-14-28L-8-22M2-26L10-32L18-24', t), 'rgba(110,70,30,0.55)', 1.4);
  x.setLineDash([3, 2.5]); stroke(x, P('M-20 26C-8 18-6 2 6-6S16-20 20-24', t), '#c81e1e', 2); x.setLineDash([]);
  x.restore();
  stroke(x, P('M14-28L22-20M22-28L14-20', t), '#c81e1e', 2.6);
  for (const y of [-40, 36]) {
    solid(x, P(`M-34 ${y - 5}h68v10h-68z`, t), LG(x, t, 0, y - 5, 0, y + 5, bev('wood')), { sd: 2, surf: 0.4 });
    for (const sx of [-1, 1]) solid(x, P(circ(sx * 37, y, 5.5), t), RG(x, t, sx * 37 - 2, y - 2, 8, [[0, '#fff2b8'], [0.5, '#d89a30'], [1, '#5a3006']]), { shadow: false, sd: 1 });
  }
  twinkle(x, 40, 30, 8);
}
function swords(x, r) {
  setAccent('#ffb84a'); glow(x, 64, 60, 58, '#ff9a40', 0.35);
  rays(x, r, 64, 58, { n: 20, r0: 10, len: [24, 52], w: [2, 5], c: ['#ffe0a0', '#ffffff'], alpha: 0.22 });
  D.sword(x, T(40, 86, 42, 0.66), { blade: 'steel', hilt: 'gold', gem: '#3a9aff' });
  D.sword(x, T(88, 86, -42, 0.66), { blade: 'steel', hilt: 'gold', gem: '#ff3048' });
  sparks(x, r, 10, [46, 40, 82, 76], ['#ffffff', '#ffd27a']);
  twinkle(x, 64, 58, 11);
}
function helmet(x, r) { setAccent('#ffc86a'); glow(x, 64, 64, 54, '#ffb84a', 0.3); D.helmet(x, T(64, 78, 0, 0.9), { mat: 'gold', horn: 'ivory' }); twinkle(x, 50, 46, 8); }
function items(x, r) {
  setAccent('#7ab8ff'); glow(x, 64, 64, 56, '#5a9aff', 0.3);
  D.sword(x, T(46, 88, 36, 0.6), { blade: 'steel', hilt: 'gold', gem: '#ffd040' });
  D.kite(x, T(72, 64, 6, 0.78), { face: ['#3a6ad8', '#0a1a4a'], rim: 'gold' });
  twinkle(x, 62, 34, 8, '#e8f4ff');
}
function bag(x, r) { setAccent('#ffc870'); D.pouch(x, r, T(64, 68, 0, 1)); }
function book(x, r) { setAccent('#ffd86a'); glow(x, 64, 64, 54, '#7ab0ff', 0.3); D.book(x, T(62, 64, -8, 0.95), { cover: ['#2f62e0', '#0a1a5a'], trim: 'gold', rune: '#ffe08a' }); twinkle(x, 82, 30, 8); }
function hourglass(x, r) { setAccent('#ffd27a'); glow(x, 64, 64, 50, '#ffc870', 0.3); D.hourglass(x, T(64, 64, 10, 1.1), { frame: 'gold', fill: ['#fff4c8', '#ffb84a'] }); twinkle(x, 46, 26, 7); }
function chest(x, r) { // rương báu: sự kiện / quà
  setAccent('#ffd27a'); glow(x, 64, 58, 60, '#ffc84a', 0.45);
  rays(x, r, 64, 52, { n: 22, a0: -Math.PI, a1: 0, r0: 14, len: [30, 60], w: [3, 7], c: ['#fff4c0', '#ffd060'], alpha: 0.32 });
  const t = T(64, 70, 0, 1);
  solid(x, P('M-42-6h84v38h-84z', t), LG(x, t, -42, 0, 42, 0, bev('wood')), { sd: 3.5, surf: 0.5 });
  solid(x, P('M-42-10C-42-34-24-42 0-42S42-34 42-10Z', t), LG(x, t, 0, -42, 0, -10, [[0, '#d8925a'], [0.5, '#8a4a22'], [1, '#3a1a08']]), { sd: 3, surf: 0.5 });
  for (const dx of [-30, 30]) solid(x, P(`M${dx - 5}-40h10v72h-10z`, t), LG(x, t, dx - 5, 0, dx + 5, 0, bev('gold')), { shadow: false, sd: 1 });
  solid(x, P('M-44-12h88v7h-88z', t), LG(x, t, 0, -12, 0, -5, bev('gold')), { shadow: false, sd: 1 });
  solid(x, P('M-8-14h16v18h-16z', t), LG(x, t, -8, 0, 8, 0, bev('gold')), { shadow: false, sd: 1 });
  fillA(x, P('M-2-8h4v8h-4z', t), '#3a2006');
  glow(x, 64, 58, 22, '#fff4c0', 0.6);
  sparks(x, r, 12, [30, 20, 100, 60], ['#ffffff', '#ffe08a']);
}
function lanternIcon(x, r) { setAccent('#ff8a3a'); lantern(x, 64, 62, 1.38); }
function star(x, r) { setAccent('#ffd25a'); glow(x, 64, 64, 50, '#ffc84a', 0.4); solid(x, P(starPath(5, 44, 19), T(64, 68)), LG(x, T(64, 68), -44, -44, 44, 44, bev('gold')), { sd: 3, surf: 0.15 }); twinkle(x, 50, 44, 8); }
function target(x, r) { // luyện tập: bia tập bắn + mũi tên
  setAccent('#ff7a5a');
  const t = T(60, 66, 0, 1);
  for (const [R, c] of [[42, ['#fff2e8', '#c8b8a8']], [33, ['#ff6a5a', '#8a1010']], [24, ['#fff2e8', '#c8b8a8']], [15, ['#ff6a5a', '#8a1010']], [7, ['#ffe08a', '#c88a10']]])
    solid(x, P(circ(0, 0, R), t), RG(x, t, -R * 0.3, -R * 0.35, R * 1.3, [[0, c[0]], [1, c[1]]]), { shadow: R === 42, sd: 1.5, surf: 0.15 });
  const a = T(60, 66, 45, 1);
  solid(x, P('M-2-2h48v4h-48z', a), LG(x, a, 0, -2, 0, 2, bev('wood')), { sd: 1.5 });
  for (const s of [-1, 1]) solid(x, P(`M36 0L46 ${s * 9}L52 ${s * 9}L44 0Z`, a), LG(x, a, 36, 0, 52, 0, [[0, '#ffffff'], [1, '#3a8aff']]), { shadow: false, sd: 0.8 });
  twinkle(x, 60, 66, 9);
}
function shop(x, r) { setAccent('#ffc86a'); D.pouch(x, r, T(58, 66, -8, 0.92)); coin(x, r, T(92, 92, 0, 0.36)); coin(x, r, T(78, 102, 0, 0.32)); }
function bolt(x, r) { setAccent('#ffd25a'); glow(x, 64, 64, 50, '#ffc84a', 0.35); const p = P('M8-46L-22 4h18L-10 46L24-8H6L14-46Z', T(64, 64)); shine(x, p, '#ffb84a', 10, 0.8); solid(x, p, LG(x, T(64, 64), -20, -46, 20, 46, bev('gold')), { sd: 2.5 }); }

// ———————————————— huy hiệu bậc hạng ————————————————
// kim loại khiên/cánh, màu năng lượng, biểu tượng giữa (theo tên bậc: đèn dầu, đèn lồng, đèn kéo quân, đèn trời, hải đăng, sao mai, trăng, mặt trời)
const TIER = [
  { id: 'den_dau', m: 'bronze', c: '#ff9a40', wings: 0 },
  { id: 'den_long', m: 'crimson', c: '#ff5a3a', wings: 0 },
  { id: 'keo_quan', m: 'gold', c: '#ffb84a', wings: 1 },
  { id: 'den_troi', m: 'ice', c: '#6ac8ff', wings: 1 },
  { id: 'hai_dang', m: 'emerald', c: '#5ae8d0', wings: 2 },
  { id: 'sao_mai', m: 'gold', c: '#ffe07a', wings: 2 },
  { id: 'nguyet_quang', m: 'violet', c: '#c8a8ff', wings: 3 },
  { id: 'thai_duong', m: 'gold', c: '#ff8a2a', wings: 3 },
];
function wingsOf(x, t, m, n) { // n+2 lông vũ mỗi bên, lông trên dài và vểnh cao, toả ra ngoài hai bên khiên
  const k0 = n + 1;
  for (const s of [-1, 1]) for (let k = k0; k >= 0; k--) {
    const len = 26 + (k0 - k) * 7, ang = -48 + k * 20, deg = s === 1 ? ang : 180 - ang;
    const tt = { cx: t.cx + s * 22 * t.s, cy: t.cy + (-14 + k * 8) * t.s, deg, s: t.s };
    solid(x, P('M0-5C14-9 30-7 ' + len + ' 0C30 7 14 9 0 5Z', tt), LG(x, tt, 0, -6, 0, 6, bev(m)), { sd: 1.8, rd: 1, surf: 0.1 });
  }
}
function symbol(x, r, i, t, c) {
  const cx = t.cx, cy = t.cy, s = t.s;
  if (i === 0) { // đèn dầu: đĩa đất nung + ngọn lửa
    solid(x, P('M-14 4C-14 14 14 14 14 4Z', { cx, cy: cy + 4 * s, s }), RG(x, { cx, cy, s }, -4, 4, 18, [[0, '#f0a868'], [1, '#5a2a10']]), { sd: 1.2, surf: 0.3 });
    const f = P('M0-18C6-10 7-4 3 2C1 4-1 4-3 2C-7-4-6-10 0-18Z', { cx, cy: cy + 4 * s, s }); shine(x, f, c, 8, 0.9); x.fillStyle = lin(x, cx, cy - 14 * s, cx, cy + 6 * s, [[0, '#ffffff'], [0.5, '#ffd07a'], [1, c]]); x.fill(f);
  } else if (i <= 2) { lantern(x, cx, cy + 2 * s, 0.62 * s, i === 1 ? ['#fff0e0', '#ff6a3a', '#a01808'] : ['#fff8d8', '#ffb84a', '#c8620e']); if (i === 2) { x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,220,140,0.7)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy + 2 * s, 24 * s, 7 * s, 0, 0, TAU); x.stroke(); x.restore(); } }
  else if (i === 3) { // đèn trời: hình thang giấy sáng + lửa đáy
    const b = P('M-10-14H10L14 12H-14Z', { cx, cy: cy + 2 * s, s }); glow(x, cx, cy, 26 * s, c, 0.6);
    x.fillStyle = lin(x, cx, cy - 14 * s, cx, cy + 14 * s, [[0, '#fffaf0'], [0.6, '#ffd8a0'], [1, '#ff9a40']]); x.fill(b); glow(x, cx, cy + 12 * s, 8 * s, '#ffffff', 0.9);
  } else if (i === 4) { // hải đăng: tháp + chùm sáng quét
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = lin(x, cx, cy - 10 * s, cx + 30 * s, cy - 16 * s, [[0, c, 0.9], [1, c, 0]]); x.beginPath(); x.moveTo(cx, cy - 12 * s); x.lineTo(cx + 34 * s, cy - 24 * s); x.lineTo(cx + 34 * s, cy - 4 * s); x.closePath(); x.fill(); x.restore();
    solid(x, P('M-6-12h12l4 30h-20z', { cx, cy, s }), LG(x, { cx, cy, s }, -10, 0, 10, 0, [[0, '#d8f8ff'], [0.5, '#ffffff'], [1, '#6a9aa8']]), { sd: 1, surf: 0.1 });
    fillA(x, P('M-7 0h14v4h-14zM-8 10h16v4h-16z', { cx, cy, s }), 'rgba(200,40,40,0.85)'); glow(x, cx, cy - 12 * s, 9 * s, '#ffffff', 0.9);
  } else if (i === 5) { const p = P(starPath(8, 17, 7), { cx, cy, s }); shine(x, p, c, 10, 0.8); x.fillStyle = rad(x, cx, cy, 18 * s, [[0, '#ffffff'], [0.5, '#fff0b0'], [1, c]]); x.fill(p); }
  else if (i === 6) { const p = P('M6-18A18 18 0 1 0 6 18A14 14 0 1 1 6-18Z', { cx: cx - 2 * s, cy, s }); shine(x, p, c, 10, 0.8); x.fillStyle = rad(x, cx - 8 * s, cy, 20 * s, [[0, '#ffffff'], [0.6, '#e8e0ff'], [1, c]]); x.fill(p); }
  else { rays(x, rngFor(77), cx, cy, { n: 16, r0: 10, len: [10, 16], w: [3, 5], c: ['#ffe08a', '#ff9a40'], alpha: 0.9 }); const p = P(circ(0, 0, 11), { cx, cy, s }); shine(x, p, c, 10, 0.9); x.fillStyle = rad(x, cx - 3 * s, cy - 3 * s, 14 * s, [[0, '#ffffff'], [0.5, '#ffe08a'], [1, '#ff7a1a']]); x.fill(p); }
}
function emblem(i) {
  return (x, r) => {
    const E = TIER[i], t = T(64, 66, 0, 1);
    setAccent(E.c); glow(x, 64, 62, 58, E.c, 0.35);
    if (i >= 5) rays(x, r, 64, 60, { n: 26, r0: 22, len: [26, 46], w: [2, 5], c: [E.c, '#ffffff'], alpha: 0.3 });
    if (E.wings) wingsOf(x, T(64, 58, 0, 0.92), E.m, E.wings);
    if (i >= 5) { const cr = P('M-20-38L-12-48L-6-40L0-52L6-40L12-48L20-38Z', t); solid(x, cr, LG(x, t, -20, -52, 20, -38, bev('gold')), { sd: 1.5 }); D.jewel(x, t, 0, -44, 3.2, E.c, 'gold'); }
    const sh = 'M0-40L30-30C32-6 24 18 0 38C-24 18-32-6-30-30Z';
    solid(x, P(sh, t), LG(x, t, -32, -40, 32, 38, bev(E.m)), { sd: 3.5, surf: 0.18 });
    const t2 = T(64, 67, 0, 0.8);
    solid(x, P(sh, t2), RG(x, t2, 0, -6, 46, [[0, '#2a2a5a'], [0.6, '#12123a'], [1, '#05051a']]), { shadow: false, sd: 2, surf: 0.1 });
    x.save(); x.clip(P(sh, t2)); glow(x, 64, 62, 30, E.c, 0.55); x.restore();
    symbol(x, r, i, T(64, 62, 0, 1), E.c);
    stroke(x, P(sh, t2), mix(E.c, 0.75), 1.1, 0.8);
    twinkle(x, 50, 34, 7);
  };
}

export const ICONS = {
  coin, coins, gem, mail, gear, trophy, friends, chat, scroll, swords, helmet, items, bag, book, hourglass, chest, lantern: lanternIcon, star, target, shop, bolt,
  ...Object.fromEntries(TIER.map((e, i) => ['rank_' + e.id, emblem(i)])),
};
/** Vẽ một biểu tượng → canvas 256² nền trong suốt. */
export function paintIcon(name) {
  const fn = ICONS[name]; if (!fn) throw new Error('không có biểu tượng ' + name);
  const x = mk(), r = rngFor([...name].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7) >>> 0);
  begin(); fn(x, r); bloom(x, 0.32); grade(x, { con: 1.08, sat: 1.14, bri: 1.02, sharp: 0.6 });
  return x.canvas;
}
