// Lượng giác tất định cho mô phỏng (chơi online kiểu lockstep — DECISIONS 2026-11-01): Math.sin / cos / atan2 / acos / hypot KHÔNG được
// chuẩn JS quy định chính xác tới bit, mỗi trình duyệt (V8 của Chrome / Android, JavaScriptCore của Safari / iPhone) có thể lệch ở chữ số
// cuối → hai máy chạy cùng trận dần dần lệch nhau. Các hàm ở đây chỉ dùng + − × ÷ và Math.sqrt / Math.round (chuẩn IEEE quy định kết quả
// đúng tới bit) nên mọi máy ra cùng một số. Sai số so với Math.* < 1e-14 — không ảnh hưởng lối chơi.
// Quy tắc: src/sim, src/ai, src/data (phần mô phỏng dùng) gọi D.sin / D.cos / D.atan2 / D.acos / D.hypot, không gọi Math.* tương ứng
// (tools/t_online.mjs kiểm). Phần vẽ (render, hud) cứ dùng Math.* cho nhanh.

const PIO2_HI = 1.5707963267341256, PIO2_LO = 6.077100506506192e-11, PI = Math.PI, PIO2 = Math.PI / 2;
// hệ số Taylor 1/n! (tính bằng phép chia lúc nạp module — phép chia IEEE cũng tất định)
const F = [1]; for (let i = 1; i <= 17; i++) F[i] = F[i - 1] * i;
const S3 = -1 / F[3], S5 = 1 / F[5], S7 = -1 / F[7], S9 = 1 / F[9], S11 = -1 / F[11], S13 = 1 / F[13], S15 = -1 / F[15];
const C2 = -1 / F[2], C4 = 1 / F[4], C6 = -1 / F[6], C8 = 1 / F[8], C10 = -1 / F[10], C12 = 1 / F[12], C14 = -1 / F[14], C16 = 1 / F[16];
/** sin trên [-π/4, π/4] */
const ksin = (x) => { const z = x * x; return x + x * z * (S3 + z * (S5 + z * (S7 + z * (S9 + z * (S11 + z * (S13 + z * S15)))))); };
/** cos trên [-π/4, π/4] */
const kcos = (x) => { const z = x * x; return 1 + z * (C2 + z * (C4 + z * (C6 + z * (C8 + z * (C10 + z * (C12 + z * (C14 + z * C16))))))); };
/** x = k·π/2 + r, |r| ≤ π/4 (Cody–Waite hai phần, đủ chính xác với |x| < 1e6) */
function reduce(x) { const k = Math.round(x / PIO2); return [k, (x - k * PIO2_HI) - k * PIO2_LO]; }
function sin(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  const [k, r] = reduce(x), q = ((k % 4) + 4) % 4;
  return q === 0 ? ksin(r) : q === 1 ? kcos(r) : q === 2 ? -ksin(r) : -kcos(r);
}
function cos(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  const [k, r] = reduce(x), q = ((k % 4) + 4) % 4;
  return q === 0 ? kcos(r) : q === 1 ? -ksin(r) : q === 2 ? -kcos(r) : ksin(r);
}
const T12 = 0.2679491924311227; // tan(π/12)
const R3 = Math.sqrt(3), I3 = 1 / R3, PI6 = PI / 6;
/** atan trên |t| ≤ tan(π/12): chuỗi Taylor tới t^23 */
const katan = (t) => { const z = t * t; let s = 0; for (let n = 23; n >= 3; n -= 2) s = z * ((n % 4 === 1 ? 1 : -1) / n + s); return t + t * s; };
function atan(x) {
  if (!(x === x)) return NaN;
  let sign = 1; if (x < 0) { sign = -1; x = -x; }
  let r;
  if (x > 1) { const a = 1 / x; r = PIO2 - (a > T12 ? PI6 + katan((a - I3) / (1 + a * I3)) : katan(a)); }
  else r = x > T12 ? PI6 + katan((x - I3) / (1 + x * I3)) : katan(x);
  return sign * r;
}
function atan2(y, x) {
  if (!(y === y) || !(x === x)) return NaN;
  if (x === 0) return y > 0 ? PIO2 : y < 0 ? -PIO2 : 0;
  if (y === 0) return x > 0 ? 0 : PI;
  const a = atan(y / x);
  return x > 0 ? a : y > 0 ? a + PI : a - PI;
}
function acos(x) { if (!(x >= -1 && x <= 1)) return NaN; return atan2(Math.sqrt((1 - x) * (1 + x)), x); }
/** √(x² + y² [+ z²]) — Math.hypot cũng không quy định chính xác tới bit (và chậm hơn) */
const hypot = (x, y, z = 0) => Math.sqrt(x * x + y * y + z * z);

export const D = { sin, cos, atan, atan2, acos, hypot, PI };
