// Hình dạng sông bản 5v5 (03 §A1, §A7): MỘT nguồn dữ liệu cho mọi nơi cần biết "chỗ này là nước hay bờ" — nền đất + mặt nước
// (render/env), cây cỏ ven bờ (render/arenaMap.js), bản đồ nhỏ (hud/minimap.js), tên vùng khi ra tín hiệu (hud/pingText.js), sơ đồ
// tools/mapplan.html và bụi mép nước (data/maps.js). Sông chỉ để NHÌN và định hướng: mô phỏng không đọc hình này (nước không cản, không làm
// chậm). Tệp nằm trong src/data (máy chủ nạp cùng maps.js) nên chỉ dùng phép tính tất định (core/dmath.js — tools/t_online.mjs kiểm).
//
// Sông chảy từ góc Thần Điểu (0, 0) tới góc Tà Thần dọc trục y = x, ĐỐI XỨNG XOAY 180° quanh tâm bản đồ (như rừng và hai hang lớn):
//   - dòng chính rộng `width`, hẹp lại ở hai đầu (chỗ đường cánh băng qua);
//   - mỗi hang lớn nằm trong một HÕM BỜ (hang gần đường Đền ở bờ Đỏ, hang gần đường Sông ở bờ Xanh), bệ hang lấn ra lòng sông; quanh hang
//     tim dòng UỐN tránh sang bờ bên kia và lòng sông nở rộng, nên nước vẫn chảy liền một mạch qua trước miệng hang (khúc chữ S).
//
// Hệ toạ độ dòng sông (đơn vị thế giới): a = (x + y) / √2 dọc dòng (0 ở góc Thần Điểu), c = (y − x) / √2 ngang dòng (dương: bờ phía Xanh).
import { D } from '../core/dmath.js';
const R2 = Math.SQRT2;
const smin = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + (b - a) / (2 * k))); return b + (a - b) * h - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);
const sstep = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/** Nhân mềm có biên: 1 ở giữa, 0 từ |t| ≥ 1 (khúc uốn / chỗ nở chỉ tác động trong đoạn của nó). */
export const riverBump = (t) => { const u = 1 - Math.min(1, t * t); return u * u; };

/**
 * Dựng hình sông.
 *  size: cạnh bản đồ; width: bề rộng dòng chính; narrow: { at, to, width } — hẹp dần còn `width` trong khoảng cách `at`→`to` tính từ
 *  hai đầu trục; bends: [{ a, shift, widen, half }] — khúc uốn quanh vị trí a dọc trục: tim dòng lệch `shift` (dương: về bờ Xanh), lòng
 *  sông nở thêm `widen` (hai bên), tác động trong ±`half`; isles: [{ x, y, r }] — phần đất (bệ hang) lấn ra lòng sông.
 * Trả { width, diag, narrow, bends, isles, len, sd(x, y), center(a), half(a), axis(x, y) }: sd = khoảng cách có dấu tới MÉP NƯỚC (âm: trong
 *  nước; dương: trên bờ / trên bệ hang) — xấp xỉ (sai số vài chục đơn vị ở khúc uốn và chỗ nối với bệ hang), đủ cho vẽ và rải cây cỏ.
 */
export function makeRiver({ size, width, narrow = null, bends = [], isles = [] }) {
  const len = size * R2;
  const base = (a) => (narrow ? narrow.width / 2 + (width - narrow.width) / 2 * sstep(narrow.at, narrow.to, Math.min(a, len - a)) : width / 2);
  /** Tim dòng (toạ độ c) tại vị trí a dọc trục. */
  const center = (a) => bends.reduce((s, b) => s + b.shift * riverBump((a - b.a) / b.half), 0);
  /** Nửa bề rộng lòng sông tại vị trí a. */
  const half = (a) => base(a) + bends.reduce((s, b) => s + b.widen * riverBump((a - b.a) / b.half), 0);
  const axis = (x, y) => ({ a: (x + y) / R2, c: (y - x) / R2 });
  const sd = (x, y) => {
    const a = (x + y) / R2, c = (y - x) / R2;
    let d = Math.abs(c - center(a)) - half(a);
    for (const q of isles) d = smax(d, q.r - D.hypot(x - q.x, y - q.y), 90); // bệ hang: đất nổi lấn ra lòng sông
    return d;
  };
  return { width, diag: true, narrow, bends, isles, len, sd, center, half, axis };
}
