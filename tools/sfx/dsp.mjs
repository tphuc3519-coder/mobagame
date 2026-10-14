// Bộ tổng hợp âm thanh offline (Node, không thư viện): dao động (khử răng cưa polyBLEP), nhiễu trắng / hồng / nâu, bộ lọc biquad
// tham số đổi theo thời gian, bao hình, FM, dây gảy Karplus-Strong (chỉnh cao độ bằng allpass), tổng hợp mode (chuông / kim loại / gỗ),
// vang Freeverb, bão hoà, trễ. Mọi hàm trả Float32Array 44,1 kHz; ngẫu nhiên có hạt giống → dựng lại ra y hệt.
export const SR = 44100;
export const N = (sec) => Math.max(1, Math.round(sec * SR));
export const buf = (sec) => new Float32Array(N(sec));
const TAU = Math.PI * 2;
const fnOf = (v) => (typeof v === 'function' ? v : () => v);

/** Ngẫu nhiên có hạt giống (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// ——— nguồn ———
export function white(sec, r) { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1; return b; }
/** Nhiễu hồng (bộ lọc Paul Kellet), biên độ ~±1. */
export function pink(sec, r) {
  const b = buf(sec); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < b.length; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return b;
}
/** Nhiễu nâu (tích phân có rò), trầm. */
export function brown(sec, r) { const b = buf(sec); let v = 0; for (let i = 0; i < b.length; i++) { v = (v + 0.02 * (r() * 2 - 1)) / 1.02; b[i] = v * 3.5; } return b; }

function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
/** Dao động; f: Hz hoặc hàm f(t). type: sin | tri | saw | sqr. */
export function osc(sec, f, type = 'sin', ph0 = 0) {
  const b = buf(sec), fn = fnOf(f); let ph = ph0;
  for (let i = 0; i < b.length; i++) {
    const dt = Math.max(0, fn(i / SR)) / SR;
    let v;
    if (type === 'sin') v = Math.sin(TAU * ph);
    else if (type === 'tri') v = 4 * Math.abs(ph - 0.5) - 1;
    else if (type === 'saw') v = 2 * ph - 1 - blep(ph, dt);
    else v = (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
    b[i] = v; ph += dt; ph -= Math.floor(ph);
  }
  return b;
}
/** Nhiều dao động lệch tông nhẹ (dàn kèn / dây / hợp xướng): voices cặp lệch ±detune cent. */
export function ensemble(sec, f, { type = 'saw', voices = 5, detune = 12, r = rng(7) } = {}) {
  const out = buf(sec), fn = fnOf(f);
  for (let v = 0; v < voices; v++) {
    const c = voices === 1 ? 0 : (v / (voices - 1) - 0.5) * 2 * detune, k = 2 ** (c / 1200), o = osc(sec, (t) => fn(t) * k, type, r());
    for (let i = 0; i < out.length; i++) out[i] += o[i] / Math.sqrt(voices);
  }
  return out;
}
/** FM hai toán tử: sin(2π fc t + I(t)·sin(2π fc·ratio t)). */
export function fm(sec, fc, ratio, index, { modType = 'sin' } = {}) {
  const b = buf(sec), fn = fnOf(fc), ix = fnOf(index); let pc = 0, pm = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, f = fn(t), m = modType === 'sin' ? Math.sin(TAU * pm) : 2 * pm - 1;
    b[i] = Math.sin(TAU * pc + ix(t) * m);
    pc += f / SR; pm += (f * ratio) / SR; pc -= Math.floor(pc); pm -= Math.floor(pm);
  }
  return b;
}
/** Tổng hợp mode: partials [[Hz, biên độ, thời gian tắt (giây, e⁻¹)], …] — chuông, kim loại, gỗ, pha lê. */
export function modal(sec, partials, { r = rng(3), bend = 0 } = {}) {
  const b = buf(sec);
  for (const [f, a, d] of partials) {
    let ph = r(); const k = Math.exp(-1 / (d * SR));
    let amp = a;
    for (let i = 0; i < b.length && amp > 1e-5; i++) { const t = i / SR, fr = f * (1 + bend * Math.exp(-t * 30)); b[i] += Math.sin(TAU * ph) * amp; ph += fr / SR; amp *= k; }
  }
  const F = Math.min(b.length, N(0.02)); for (let i = 0; i < F; i++) b[b.length - 1 - i] *= i / F; // hạ dần cuối buffer
  return b;
}
/** Dây gảy Karplus-Strong (đàn tranh, đàn dây), chỉnh cao độ chính xác bằng allpass. bright: 0..1 độ sáng tiếng gảy; decay: độ ngân. */
export function pluck(sec, f, { r = rng(5), bright = 0.6, decay = 0.997, pick = 0.12 } = {}) {
  const out = buf(sec), P = SR / f - 0.5, L = Math.max(2, Math.floor(P)), frac = P - L, C = (1 - frac) / (1 + frac), d = new Float32Array(L);
  // kích: nhiễu qua lọc thông thấp theo bright, lõm ở vị trí gảy (comb) cho tiếng dây thật hơn
  let lp = 0; for (let i = 0; i < L; i++) { lp += (r() * 2 - 1 - lp) * (0.15 + 0.85 * bright); d[i] = lp; }
  const pk = Math.max(1, Math.round(L * pick)); for (let i = L - 1; i >= pk; i--) d[i] -= d[i - pk];
  let idx = 0, last = 0, apx = 0, apy = 0;
  for (let i = 0; i < out.length; i++) {
    const v = d[idx], avg = 0.5 * (v + last); last = v;
    const ap = C * avg + apx - C * apy; apx = avg; apy = ap;
    d[idx] = ap * decay; out[i] = v; idx = (idx + 1) % L;
  }
  return out;
}

// ——— lọc ———
/** Biquad (RBJ): type lowpass | highpass | bandpass | peak | notch; f, Q, gain dB: số hoặc hàm theo thời gian (giây). */
export function biquad(x, type, f, Q = 0.707, gainDb = 0) {
  const y = new Float32Array(x.length), ff = fnOf(f), qf = fnOf(Q), gf = fnOf(gainDb);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let i = 0; i < x.length; i++) {
    if ((i & 15) === 0) {
      const t = i / SR, fr = Math.min(SR * 0.45, Math.max(10, ff(t))), q = Math.max(0.05, qf(t)), w = (TAU * fr) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
      let a0;
      if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else if (type === 'notch') { b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
      else { const A = 10 ** (gf(t) / 40); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
      b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    }
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
export const lp = (x, f, q) => biquad(x, 'lowpass', f, q);
export const hp = (x, f, q) => biquad(x, 'highpass', f, q);
export const bp = (x, f, q) => biquad(x, 'bandpass', f, q);
/** Lọc dải thông nhiều đỉnh song song (formant: "a", "o"… cho hợp xướng). */
export function formant(x, peaks) { const out = new Float32Array(x.length); for (const [f, q, g] of peaks) { const y = bp(x, f, q); for (let i = 0; i < x.length; i++) out[i] += y[i] * g; } return out; }

// ——— bao hình / tiện ích ———
/** Bao hình ADSR-ish: lên tuyến tính a giây, tắt dần mũ hằng số d giây (e⁻¹). */
export function envAD(sec, a, d, { hold = 0, sustain = 0 } = {}) {
  const b = buf(sec);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = t < a ? t / a : t < a + hold ? 1 : sustain + (1 - sustain) * Math.exp(-(t - a - hold) / d); }
  return b;
}
/** Bao hình từng điểm [[t, v], …] (nội suy tuyến tính; mũ nếu curve > 0). */
export function envPts(sec, pts, curve = 0) {
  const b = buf(sec); let k = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR; while (k < pts.length - 2 && t > pts[k + 1][0]) k++;
    const [t0, v0] = pts[k], [t1, v1] = pts[Math.min(k + 1, pts.length - 1)];
    let u = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1; if (curve) u = u ** curve;
    b[i] = t > pts[pts.length - 1][0] ? pts[pts.length - 1][1] : v0 + (v1 - v0) * u;
  }
  return b;
}
/** Bao hình chuông (lên rồi xuống, đỉnh ở peak tỉ lệ 0..1 độ dài). */
export function envBell(sec, peak = 0.4, pow = 1.5) { const b = buf(sec), n = b.length; for (let i = 0; i < n; i++) { const u = i / n, v = u < peak ? u / peak : (1 - u) / (1 - peak); b[i] = Math.sin((Math.PI / 2) * v) ** pow; } return b; }
export function mul(a, b) { const n = Math.min(a.length, b.length), y = new Float32Array(a.length); for (let i = 0; i < n; i++) y[i] = a[i] * b[i]; return y; }
export function gain(a, g) { const fn = fnOf(g), y = new Float32Array(a.length); for (let i = 0; i < a.length; i++) y[i] = a[i] * fn(i / SR); return y; }
/** Trộn: mix(độ dài giây, [tín hiệu, mức, lệch giây], …). Mỗi lớp (và cả bản trộn) được hạ dần 20 ms cuối — lớp bị cắt khi chưa tắt
 *  hẳn sẽ thành tiếng "tách" (thấy là vạch dọc trên ảnh phổ). */
export function mix(sec, ...layers) {
  const out = buf(sec), F = N(0.02);
  for (const [x, g = 1, at = 0] of layers) {
    const o = Math.round(at * SR), n = Math.min(x.length, out.length - o);
    for (let i = 0; i < n; i++) if (i + o >= 0) { const k = n - i < F ? (n - i) / F : 1; out[i + o] += x[i] * g * k; }
  }
  for (let i = 0; i < F && i < out.length; i++) out[out.length - 1 - i] *= i / F;
  return out;
}
/** Bão hoà mềm (tanh), giữ mức đỉnh. */
export function sat(x, drive = 2) { const k = Math.tanh(drive), y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = Math.tanh(drive * x[i]) / k; return y; }
export function fade(x, inSec = 0.002, outSec = 0.02) { const y = Float32Array.from(x), a = N(inSec), b = N(outSec); for (let i = 0; i < a && i < y.length; i++) y[i] *= i / a; for (let i = 0; i < b && i < y.length; i++) y[y.length - 1 - i] *= i / b; return y; }
export const peak = (x) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return m; };
export const rms = (x) => { let s = 0; for (const v of x) s += v * v; return Math.sqrt(s / Math.max(1, x.length)); };
export function normalize(x, to = 0.89) { const p = peak(x) || 1, y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = (x[i] / p) * to; return y; }
/** Hạ dần đầu / cuối một tín hiệu (tránh tiếng tách khi bị cắt). */
export function tail(x, outSec = 0.006) { const y = Float32Array.from(x), b = Math.min(y.length, N(outSec)); for (let i = 0; i < b; i++) y[y.length - 1 - i] *= i / b; return y; }
/** Bỏ thành phần một chiều (lọc thông cao rất thấp). */
export const dcBlock = (x) => hp(x, 25, 0.7);
/** Đảo ngược (tiếng hút vào / gió ngược). */
export const reverse = (x) => Float32Array.from(x).reverse();
/** Hạt: nhiều xung ngắn rải ngẫu nhiên (lửa lách tách, sỏi, lá xào xạc). density: số hạt/giây (số hoặc hàm), grain(r) trả Float32Array một hạt. */
export function grains(sec, density, grain, r) {
  const out = buf(sec), dn = fnOf(density);
  for (let i = 0; i < out.length; i += 64) {
    const t = i / SR, p = (dn(t) * 64) / SR;
    if (r() < p) { const g = grain(r, t), o = i + Math.floor(r() * 64); for (let k = 0; k < g.length && o + k < out.length; k++) out[o + k] += g[k]; }
  }
  return out;
}
/** Tiếng vỗ / gõ ngắn: nhiễu qua lọc dải, tắt mũ. */
export function click(r, f = 3000, q = 1.2, d = 0.004, sec = 0.03) { return mul(bp(white(sec, r), f, q), envAD(sec, 0.0005, d)); }

// ——— không gian ———
/** Vang Freeverb (8 comb có giảm cao tần + 4 allpass). size 0..1 (độ dài vang), damp 0..1, scale co giãn độ trễ (phòng nhỏ < 1). */
export function reverb(x, { size = 0.82, damp = 0.35, wet = 0.3, dry = 1, scale = 1, pre = 0, tail = 1.2, stereo = 0 } = {}) {
  const COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225];
  const n = x.length + N(tail), out = new Float32Array(n), wetBuf = new Float32Array(n), pd = N(pre), off = stereo;
  const fb = 0.7 + 0.28 * size, dm = damp * 0.4;
  for (const L0 of COMB) {
    const L = Math.max(8, Math.round((L0 + off) * scale)), d = new Float32Array(L); let idx = 0, f = 0;
    for (let i = 0; i < n; i++) { const xi = i - pd >= 0 && i - pd < x.length ? x[i - pd] * 0.015 : 0, o = d[idx]; f = o * (1 - dm) + f * dm; d[idx] = xi + f * fb; wetBuf[i] += o; idx = (idx + 1) % L; }
  }
  let y = wetBuf;
  for (const L0 of AP) {
    const L = Math.max(4, Math.round((L0 + off) * scale)), d = new Float32Array(L), z = new Float32Array(n); let idx = 0;
    for (let i = 0; i < n; i++) { const bo = d[idx], v = -y[i] + bo; d[idx] = y[i] + bo * 0.5; z[i] = v; idx = (idx + 1) % L; }
    y = z;
  }
  for (let i = 0; i < n; i++) out[i] = (i < x.length ? x[i] * dry : 0) + y[i] * wet;
  return out;
}
/** Tiếng vọng: trễ time giây, phản hồi fb. */
export function echo(x, time, fb = 0.35, mixv = 0.3, tail = 1) {
  const n = x.length + N(tail), out = new Float32Array(n), D = N(time), d = new Float32Array(D); let idx = 0;
  for (let i = 0; i < n; i++) { const xi = i < x.length ? x[i] : 0, o = d[idx]; d[idx] = xi + o * fb; out[i] = xi + o * mixv; idx = (idx + 1) % D; }
  return out;
}
/** Cắt đuôi im lặng (dưới ngưỡng) để file gọn. */
export function trim(x, thr = 0.0015, keep = 0.03) { let e = x.length - 1; while (e > 0 && Math.abs(x[e]) < thr) e--; return x.slice(0, Math.min(x.length, e + N(keep))); }

/** Ghi WAV PCM 16 bit (1 hoặc 2 kênh xen kẽ). */
export function wav(chans) {
  const ch = Array.isArray(chans) ? chans : [chans], n = ch[0].length, nc = ch.length, b = Buffer.alloc(44 + n * nc * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * nc * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(nc, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * nc * 2, 28); b.writeUInt16LE(nc * 2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * 32767))), 44 + (i * nc + c) * 2);
  return b;
}
