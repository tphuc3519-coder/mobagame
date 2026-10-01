// Công cụ viết animation tay: nội suy spline (vận tốc liên tục, không dừng cứng ở mỗi khung như smoothstep),
// cộng lớp thở/đung đưa, trễ pha cho vải/vũ khí. Tư thế là { khoá: [rx, ry, rz] độ, hipsPos: [x,y,z] theo chiều cao, rootPos }.
const keysOf = (ks) => [...new Set(ks.flatMap(([, p]) => Object.keys(p)))];
const get = (p, k) => p[k] || [0, 0, 0];

/** Spline Catmull-Rom (không đều theo thời gian) qua các khung [[u, pose], ...]. loop=true: nối đuôi với đầu. */
export function spline(frames, loop = false) {
  const ks = keysOf(frames), n = frames.length;
  const T = frames.map(([u]) => u);
  return (u) => {
    if (loop) u = ((u % 1) + 1) % 1;
    let i = 0;
    if (loop) { while (i < n - 1 && u >= T[i + 1]) i++; } else { if (u <= T[0]) return frames[0][1]; if (u >= T[n - 1]) return frames[n - 1][1]; while (u > T[i + 1]) i++; }
    const j = (i + 1) % n, h = loop && j === 0 ? 1 - T[i] + T[0] : T[j] - T[i];
    const t = Math.min(1, Math.max(0, h > 0 ? (u - T[i]) / h : 0));
    const im = loop ? (i - 1 + n) % n : Math.max(0, i - 1), jp = loop ? (j + 1) % n : Math.min(n - 1, j + 1);
    const span = (a, b) => { const d = T[b] - T[a]; return loop && d <= 0 ? d + 1 : d || 1e-6; };
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const out = {};
    for (const k of ks) {
      const a = get(frames[i][1], k), b = get(frames[j][1], k), am = get(frames[im][1], k), bp = get(frames[jp][1], k);
      out[k] = [0, 1, 2].map((c) => {
        const m0 = (loop || i > 0) ? (b[c] - am[c]) / span(im, j) * h : 0;
        const m1 = (loop || j < n - 1) ? (bp[c] - a[c]) / span(i, jp) * h : 0;
        return h00 * a[c] + h10 * m0 + h01 * b[c] + h11 * m1;
      });
    }
    return out;
  };
}

/** Cộng nhiều tư thế (cộng từng khoá). */
export function add(...ps) {
  const o = {};
  for (const p of ps) for (const [k, v] of Object.entries(p || {})) { const a = o[k] || [0, 0, 0]; o[k] = [a[0] + v[0], a[1] + v[1], a[2] + v[2]]; }
  return o;
}
export const scale = (p, f) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.map((x) => x * f)]));
const TAU = Math.PI * 2;
/** Sóng trễ pha: s(u, pha, tần số). */
export const wave = (u, phase = 0, f = 1) => Math.sin(TAU * (u * f - phase));
