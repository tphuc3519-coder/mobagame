// Cụm nút kỹ năng (hud/layout.js clusterDims / computeHudLayout, 07 §9) — hàm thuần, không cần trình duyệt. Quét ~9 000 khổ màn (cao 230 → 1 100,
// ba tỉ lệ ngang, màn chạm / chuột, cỡ nút Nhỏ / Vừa / Lớn, cửa hàng trái / phải, có / không thanh vuốt) và kiểm:
//  - ba nút chiêu bằng nhau; đủ chỗ thì bằng 0,8 nút Đánh và cách đều tâm nút Đánh (một cung tròn), cách đều nhau;
//  - không hai nút nào trong cụm chồng / sát nhau dưới 2 px (Đánh, K1–K3, Ăn lính, Đẩy trụ), không nút nào thò ra ngoài khung cụm;
//  - nút "+" nâng chiêu không đè nút khác; nút camera ở góc cụm không đè nút chiêu / nút "+" và không lấn sang cột nút phụ;
//  - màn chạm: nút chiêu, Ăn lính / Đẩy trụ ≥ 44 px; cụm không cao quá chỗ trống (trừ màn dưới mức thu nhỏ tối thiểu).
// Dùng: node tools/t_hudlayout.mjs
import { computeHudLayout, clusterDims, SKILL_K, TOUCH_MIN } from '../src/hud/layout.js';

let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? 'ĐẠT ' : 'LỖI ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const CAM = 50, PLUS = 34, PLUS_UP = 24; // nút camera 50 px; nút "+" 34 px, mép trên cao hơn đỉnh nút chiêu 24 px (index.html .sk .lvl)

/** Tâm + bán kính mọi nút trong cụm, gốc ở góc phải-dưới khung (x sang trái, y lên trên) — nút Ăn lính / Đẩy trụ theo công thức CSS .amode. */
function circles(L) {
  const ra = L.a / 2, rs = L.s / 2, rm = L.m / 2, dm = ra + rm + 9;
  return { atk: [ra, ra, ra], k1: [L.k1r + rs, L.k1b + rs, rs], k2: [L.k2r + rs, L.k2b + rs, rs], k3: [L.k3r + rs, L.k3b + rs, rs],
    minion: [ra + 0.94 * dm, Math.max(0, ra - 0.342 * dm - rm) + rm, rm], tower: [Math.max(0, ra - 0.469 * dm - rm) + rm, ra + 0.883 * dm, rm] };
}
const gap = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1]) - A[2] - B[2];
const plusBox = (c) => ({ l: c[0] - PLUS / 2, r: c[0] + PLUS / 2, b: c[1] + c[2] + PLUS_UP - PLUS, t: c[1] + c[2] + PLUS_UP });
const boxCircle = (b, c) => Math.hypot(c[0] - Math.max(b.l, Math.min(c[0], b.r)), c[1] - Math.max(b.b, Math.min(c[1], b.t))) - c[2];
const boxes = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.t, b.t) - Math.max(a.b, b.b) > 0.5;

// 1. Số đo ở vài máy quen: nút chiêu to hơn hẳn bản trước (0,68 nút Đánh, K3 riêng 0,75)
{
  const L = computeHudLayout({ W: 844, H: 390, safe: { l: 47, r: 47, b: 21 }, touch: true });
  ok('iPhone 14 ngang: nút chiêu = 0,8 nút Đánh, ≥ 70 px (trước 17/11: 59 px)', Math.abs(L.s - SKILL_K.roomy * L.a) < 0.11 && L.s >= 70, `Đánh ${L.a} · chiêu ${L.s} · Ăn lính ${L.m} · khung ${L.skw}×${L.skh}`);
  const C = circles(L), d = ['k1', 'k2', 'k3'].map((k) => Math.hypot(C[k][0] - C.atk[0], C[k][1] - C.atk[1]));
  ok('iPhone 14 ngang: ba nút chiêu cách đều tâm nút Đánh (một cung tròn)', Math.max(...d) - Math.min(...d) < 0.3, d.map((v) => v.toFixed(1)).join(' / '));
  ok('iPhone 14 ngang: K1–K2 và K2–K3 cách nhau bằng nhau', Math.abs(gap(C.k1, C.k2) - gap(C.k2, C.k3)) < 0.3, `${gap(C.k1, C.k2).toFixed(1)} / ${gap(C.k2, C.k3).toFixed(1)} px`);
  ok('iPhone 14 ngang: giữa nút Đánh và nút chiêu vừa một nút Ăn lính / Đẩy trụ', gap(C.atk, C.k2) >= L.m + 8 && gap(C.k1, C.minion) >= 3 && gap(C.k3, C.tower) >= 3, `khe ${gap(C.atk, C.k2).toFixed(1)} px, nút ${L.m}`);
  const T = computeHudLayout({ W: 667, H: 235, touch: true });
  ok('màn rất thấp (667×235): cụm nén lại, nút chiêu vẫn ≥ 44 px và cụm vừa chỗ trống', T.s >= TOUCH_MIN && T.s < SKILL_K.roomy * T.a - 1 && T.skh <= 235 - T.bot - T.topRight - 6 + 0.5, `Đánh ${T.a} · chiêu ${T.s} · cao ${T.skh}`);
  const big = clusterDims(100), small = clusterDims(100, true, 0);
  ok('clusterDims: q = 1 nút chiêu 0,8a trên cung; q = 0 nút chiêu 0,68a, khung thấp hơn', Math.abs(big.s - 80) < 1e-9 && Math.abs(small.s - 68) < 1e-9 && small.skh < big.skh - 20);
}

// 2. Quét mọi khổ màn
{
  let n = 0, minGap = Infinity, worst = ''; const bad = { size: [], overlap: [], out: [], plus: [], cam: [], touch: [], tall: [], arc: [] };
  const note = (k, s) => { if (bad[k].length < 4) bad[k].push(s); else bad[k].more = (bad[k].more || 0) + 1; };
  for (const touch of [true, false]) for (const size of ['sm', 'md', 'lg']) for (const shopRight of [false, true])
    for (let H = 230; H <= 1100; H += 7) for (const W of [Math.round(H * 1.6), Math.round(H * 2.17), Math.round(H * 2.9)]) for (const sb of [0, 21]) {
      const L = computeHudLayout({ W, H, safe: { b: sb }, touch, size, shopRight }), C = circles(L), tag = `${W}×${H}${sb ? ' vuốt' : ''} ${touch ? 'chạm' : 'chuột'} ${size}${shopRight ? ' cửa hàng phải' : ''}`; n++;
      const keys = Object.keys(C), room = H - L.bot - L.topRight - 6;
      if (L.s > L.a * SKILL_K.roomy + 0.11 || L.s < L.a * SKILL_K.tight - 0.11) note('size', `${tag}: chiêu ${L.s} / Đánh ${L.a}`);
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const g = gap(C[keys[i]], C[keys[j]]); if (g < minGap) { minGap = g; worst = `${keys[i]}×${keys[j]} ${tag}`; } if (g < 2) note('overlap', `${tag}: ${keys[i]}×${keys[j]} ${g.toFixed(1)}`); }
      for (const k of ['k1', 'k2', 'k3']) if (L[k + 'r'] < -0.05 || L[k + 'b'] < -0.05 || L[k + 'r'] + L.s > L.skw + 0.2 || L[k + 'b'] + L.s > L.skh + 0.2) note('out', `${tag}: ${k}`);
      for (const k of ['k1', 'k2', 'k3']) for (const o of ['k1', 'k2', 'k3', 'tower']) if (o !== k && boxCircle(plusBox(C[k]), C[o]) < 1) note('plus', `${tag}: "+" ${k} × ${o}`);
      if (!L.camAbove) {
        const cl = L.camR - L.right, cam = { l: cl, r: cl + CAM, b: L.skh - CAM, t: L.skh };
        if (cl + CAM > L.skw + 10.05) note('cam', `${tag}: camera lấn cột nút phụ`);
        for (const k of ['k1', 'k2', 'k3']) { if (boxes(cam, { l: L[k + 'r'], r: L[k + 'r'] + L.s, b: L[k + 'b'], t: L[k + 'b'] + L.s })) note('cam', `${tag}: camera × ${k}`); if (boxes(cam, plusBox(C[k]))) note('cam', `${tag}: camera × "+" ${k}`); }
      }
      if (touch && Math.min(L.s, L.m) < TOUCH_MIN - 0.1) note('touch', `${tag}: chiêu ${L.s} · Ăn lính ${L.m}`);
      if (L.skh > room + 0.5 && L.a > 66.05) note('tall', `${tag}: cao ${L.skh} > ${room}`); // a = 66 (CLUSTER_MIN): đã thu nhỏ hết mức
      if (L.s >= L.a * SKILL_K.roomy - 0.11) { const d = ['k1', 'k2', 'k3'].map((k) => Math.hypot(C[k][0] - C.atk[0], C[k][1] - C.atk[1])); if (Math.max(...d) - Math.min(...d) > 0.4) note('arc', `${tag}: ${d.map((v) => v.toFixed(1)).join('/')}`); }
    }
  const show = (k) => bad[k].join(' | ') + (bad[k].more ? ` … +${bad[k].more}` : '');
  ok(`${n} khổ màn: nút chiêu luôn trong khoảng 0,68–0,8 nút Đánh`, !bad.size.length, show('size'));
  ok('không hai nút nào trong cụm chồng / sát nhau dưới 2 px', !bad.overlap.length, show('overlap') || `khe hẹp nhất ${minGap.toFixed(1)} px (${worst})`);
  ok('ba nút chiêu nằm trọn trong khung cụm', !bad.out.length, show('out'));
  ok('nút "+" nâng chiêu không đè nút chiêu khác / nút Đẩy trụ', !bad.plus.length, show('plus'));
  ok('nút camera ở góc cụm không đè nút chiêu, nút "+", không lấn cột nút phụ', !bad.cam.length, show('cam'));
  ok(`màn chạm: nút chiêu + Ăn lính / Đẩy trụ ≥ ${TOUCH_MIN} px`, !bad.touch.length, show('touch'));
  ok('cụm không cao quá chỗ trống dưới khối góc phải trên', !bad.tall.length, show('tall'));
  ok('đủ chỗ (tỉ lệ 0,8): ba nút chiêu cách đều tâm nút Đánh', !bad.arc.length, show('arc'));
}
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt'); process.exit(fail ? 1 : 0);
