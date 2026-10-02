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

/** Chuyển động chồng lấp (follow-through): các khoá liệt kê chạy trễ `delays[khoá]` (đơn vị u) so với phần còn lại, nên thân dẫn trước,
 *  đầu/vai/vải theo sau thay vì cả người cứng đờ cùng pha. Chỉ dùng cho clip không lặp. */
export function lagged(fn, delays) {
  return (u, t) => {
    const out = { ...fn(u, t) };
    for (const [k, d] of Object.entries(delays)) { const p = fn(Math.max(0, u - d), t); out[k] = p[k] || [0, 0, 0]; }
    return out;
  };
}
/** Trộn tư thế a→b theo k (0..1), dùng để nối clip với tư thế đứng yên. */
export function mix(a, b, k) {
  const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[key] || [0, 0, 0], y = b[key] || [0, 0, 0]; o[key] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; }
  return o;
}

/** Quỹ đạo vũ khí cho IK: khung [[u, { R: [hand, dir], L: [hand, dir] }], …] → hàm u → { R: { hand, dir }, L: … } (nội suy spline). */
export function weaponPath(frames, loop = false) {
  const flat = frames.map(([u, k]) => [u, Object.fromEntries(Object.entries(k).flatMap(([s, [h, d]]) => [['h' + s, h], ['d' + s, d]]))]);
  const f = spline(flat, loop), sides = [...new Set(frames.flatMap(([, k]) => Object.keys(k)))];
  return (u) => { const o = f(u), r = {}; for (const s of sides) r[s] = { hand: o['h' + s], dir: o['d' + s] }; return r; };
}

/** Uốn thời gian cho đòn đánh dứt khoát: keys [[t, u, ease], …] (t = thời gian clip 0..1, u = thời gian của tư thế/quỹ đạo đã viết).
 *  ease của đoạn kết thúc ở khoá đó: 'in' tăng tốc (giáng đòn), 'out' giảm tốc (lấy đà chậm dần, thu đòn), 'io' mềm hai đầu, 'lin' đều.
 *  Ví dụ: gồng chậm dần tới đỉnh, giáng 'in' rất nhanh vào điểm chạm, giữ gần như đứng yên vài khung (khựng), rồi 'out' về thế. */
const EASE = { lin: (x) => x, in: (x) => x ** 2.4, out: (x) => 1 - (1 - x) ** 2.4, io: (x) => x * x * (3 - 2 * x) };
export function snap(keys) {
  const K = [[0, 0], ...keys];
  return (t) => {
    if (t <= 0) return 0; if (t >= K[K.length - 1][0]) return K[K.length - 1][1];
    let i = 1; while (t > K[i][0]) i++;
    const [t0, u0] = K[i - 1], [t1, u1, e = 'io'] = K[i];
    return u0 + (u1 - u0) * EASE[e]((t - t0) / (t1 - t0 || 1));
  };
}
/** Thời điểm (giây) của tư thế u trong clip đã uốn (để đặt hitTime khớp điểm chạm). */
export function snapTime(keys, u, dur) { const w = snap(keys); let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (w(m) < u) lo = m; else hi = m; } return +(hi * dur).toFixed(3); }
