// Hình dạng sông bản 5v5 (03 §A1, §A7): MỘT nguồn dữ liệu cho mọi nơi cần biết "chỗ này là nước hay bờ" — nền đất + mặt nước
// (render/env), cây cỏ ven bờ (render/arenaMap.js), bản đồ nhỏ (hud/minimap.js), tên vùng khi ra tín hiệu (hud/pingText.js) và sơ đồ
// tools/mapplan.html. Sông chỉ để NHÌN và định hướng: mô phỏng không đọc hình này (nước không cản, không làm chậm). Tệp vẫn nằm trong
// src/data (máy chủ nạp cùng maps.js) nên chỉ dùng phép tính tất định (core/dmath.js — tools/t_online.mjs kiểm).
//
// Sông chảy dọc trục đối xứng y = x. Trước đây là một dải thẳng rộng đều, hai hang lớn đặt đè lên chặn ngang dòng. Nay:
//   - dòng chính rộng `width`, hẹp lại ở hai đầu (chỗ đường cánh băng qua);
//   - quanh mỗi hang lớn (Long Ngư, Hổ Lôi) sông PHÌNH thành đầm, hang là một CÙ LAO đá giữa đầm: nước chia hai nhánh ôm hai bên cù lao,
//     mỗi nhánh rộng đủ một đội đi qua — đi dọc sông từ đường Giữa ra đường cánh không còn bị hang chặn.
// Mọi hình đều đối xứng qua trục sông (mỗi đội một nhánh, một bờ như nhau) và hai đầm là ảnh của nhau qua đường Giữa.
//
// Hệ toạ độ dòng sông (đơn vị thế giới): a = (x + y) / √2 dọc dòng (0 ở góc Thần Điểu), c = (y − x) / √2 ngang dòng (dương: bờ phía Xanh).
import { D } from '../core/dmath.js';
const R2 = Math.SQRT2;
const smin = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + (b - a) / (2 * k))); return b + (a - b) * h - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);
const sstep = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/**
 * Dựng hình sông.
 *  size: cạnh bản đồ; width: bề rộng dòng chính; narrow: { at, to, width } — hẹp dần còn `width` trong khoảng cách `at`→`to` tính từ
 *  hai đầu trục; pools: [{ x, y, along, across, isle }] — đầm hình elip tâm (x, y) (nằm trên trục), bán trục dọc / ngang dòng, bán kính
 *  cù lao giữa đầm (0 = không có).
 * Trả { width, diag, pools, sd(x, y), half(a), axis(x, y) }: sd = khoảng cách có dấu tới MÉP NƯỚC (âm: trong nước; dương: trên bờ hoặc
 *  trên cù lao), sai số vài chục đơn vị quanh chỗ dòng chính nối vào đầm (đủ cho việc rải cây cỏ và vẽ).
 */
export function makeRiver({ size, width, narrow = null, pools = [] }) {
  const len = size * R2;
  const P = pools.map((p) => ({ ...p, a: (p.x + p.y) / R2 }));
  /** Nửa bề rộng dòng chính tại vị trí a dọc trục. */
  const half = (a) => {
    if (!narrow) return width / 2;
    const e = Math.min(a, len - a); // khoảng cách tới đầu trục gần hơn
    return narrow.width / 2 + (width - narrow.width) / 2 * sstep(narrow.at, narrow.to, e);
  };
  const axis = (x, y) => ({ a: (x + y) / R2, c: (y - x) / R2 });
  const sd = (x, y) => {
    const a = (x + y) / R2, c = Math.abs(y - x) / R2;
    let d = c - half(a);
    for (const p of P) {
      const da = a - p.a, k = D.hypot(da / p.along, c / p.across);
      d = smin(d, (k - 1) * Math.min(p.along, p.across), 260);             // đầm: hợp mềm với dòng chính (cửa đầm loe dần)
      if (p.isle) d = smax(d, p.isle - D.hypot(x - p.x, y - p.y), 90);    // cù lao: phần đất nổi giữa đầm
    }
    return d;
  };
  return { width, diag: true, narrow, pools: P, len, sd, half, axis };
}

/** Đường viền mép nước (các đa giác kín, toạ độ thế giới) — dò theo ô lưới `step`; dùng để tô sông trên bản đồ nhỏ và sơ đồ. */
export function riverOutline(river, size, step = 120) {
  const n = Math.ceil(size / step) + 1, v = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = river.sd(i * step, j * step);
  // marching squares: mỗi ô cho 0–2 đoạn; nối các đoạn thành vòng
  const segs = [], lerp = (i0, j0, i1, j1) => { const a = v[j0 * n + i0], b = v[j1 * n + i1], t = a / (a - b || 1e-9); return [(i0 + (i1 - i0) * t) * step, (j0 + (j1 - j0) * t) * step]; };
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) {
    const k = (v[j * n + i] < 0 ? 1 : 0) | (v[j * n + i + 1] < 0 ? 2 : 0) | (v[(j + 1) * n + i + 1] < 0 ? 4 : 0) | (v[(j + 1) * n + i] < 0 ? 8 : 0);
    if (k === 0 || k === 15) continue;
    const T = () => lerp(i, j, i + 1, j), Rr = () => lerp(i + 1, j, i + 1, j + 1), B = () => lerp(i, j + 1, i + 1, j + 1), L = () => lerp(i, j, i, j + 1);
    const add = (p, q) => segs.push([p, q]);
    switch (k) {
      case 1: case 14: add(L(), T()); break; case 2: case 13: add(T(), Rr()); break; case 4: case 11: add(Rr(), B()); break; case 8: case 7: add(B(), L()); break;
      case 3: case 12: add(L(), Rr()); break; case 6: case 9: add(T(), B()); break;
      case 5: add(L(), T()); add(Rr(), B()); break; case 10: add(T(), Rr()); add(B(), L()); break;
    }
  }
  const key = (p) => Math.round(p[0]) + ',' + Math.round(p[1]), ends = new Map();
  segs.forEach((s, i) => { for (const e of [0, 1]) { const k = key(s[e]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push([i, e]); } });
  const used = new Uint8Array(segs.length), loops = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    const pts = [segs[s][0], segs[s][1]]; used[s] = 1;
    for (let guard = 0; guard < segs.length; guard++) {
      const nx = (ends.get(key(pts[pts.length - 1])) || []).find(([i]) => !used[i]);
      if (!nx) break;
      used[nx[0]] = 1; pts.push(segs[nx[0]][1 - nx[1]]);
    }
    for (let guard = 0; guard < segs.length; guard++) { // nối tiếp về phía đầu (vòng hở ở mép bản đồ)
      const nx = (ends.get(key(pts[0])) || []).find(([i]) => !used[i]);
      if (!nx) break;
      used[nx[0]] = 1; pts.unshift(segs[nx[0]][1 - nx[1]]);
    }
    if (pts.length > 3) loops.push(pts);
  }
  return loops;
}
