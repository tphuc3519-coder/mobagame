// Ngân hàng hiệu ứng âm thanh của Lantern Arena — tổng hợp hoàn toàn bằng code (dsp.mjs), không dùng file ghi âm của ai.
// Mỗi tiếng: { cat, low? (Hz cắt trầm, mặc định 55), build(r) → Float32Array }. cat quyết định độ to chuẩn hoá (build.mjs) và nhóm âm lượng khi chơi (src/audio/audio.js).
// Nguyên tắc cho tiếng "chuyên nghiệp": nhiều lớp (tiếng nứt đầu + thân trầm + đuôi), cao độ trượt, nhiễu lọc quét, bão hoà nhẹ, vang ngắn.
import { SR, N, buf, rng, midi, white, pink, brown, osc, ensemble, fm, modal, pluck, biquad, lp, hp, bp, formant, envAD, envPts, envBell, mul, gain, mix, sat, fade, reverb, echo, grains, click, reverse, dcBlock } from './dsp.mjs';

// ——— khối dựng ———
/** Tiếng thịch: sin trượt cao độ f0 → f1, tắt dần. */
const thump = (f0, f1, dur, tau = 0.18) => mul(osc(dur, (t) => f1 + (f0 - f1) * Math.exp(-t / (dur * tau))), envAD(dur, 0.0015, dur * 0.28));
/** Thịch nghe được cả trên loa điện thoại (loa nhỏ gần như không phát dưới ~200 Hz): thân trượt từ f0 (≥ 250 Hz) xuống f1 + hoạ âm do
 *  bão hoà + tiếng "bộp" nhiễu dải giữa quanh `mid` + nứt cao. Dùng chồng lên thịch trầm (thump) ở các tiếng va đập nặng. */
const punch = (r, f0, f1, dur, mid = 520) => sat(mix(dur, [thump(f0, f1, dur, 0.2), 1], [mul(bp(white(dur, r), mid, 0.8), envAD(dur, 0.0006, Math.min(0.05, dur * 0.2))), 0.7], [crack(r, mid * 3.2, Math.min(0.05, dur * 0.4), 1), 0.35]), 2.2);
/** Tiếng nứt / vỗ: nhiễu trắng lọc dải, tắt rất nhanh. */
const crack = (r, f = 2600, dur = 0.07, q = 0.9) => mul(bp(white(dur, r), f, q), envAD(dur, 0.0004, dur * 0.18));
/** Tiếng vút: nhiễu lọc dải tâm quét f0 → f1 (đỉnh lúc pk) → f2, bao hình chuông. */
function whoosh(r, dur, f0, f1, f2, { q = 1.4, pk = 0.45, air = 0.3, noise = 'pink' } = {}) {
  const src = noise === 'white' ? white(dur, r) : pink(dur, r), fc = (t) => { const u = t / dur; return u < pk ? f0 * (f1 / f0) ** (u / pk) : f1 * (f2 / f1) ** ((u - pk) / (1 - pk)); };
  const body = bp(src, fc, q), a = hp(white(dur, r), (t) => fc(t) * 2.2, 0.7);
  return mul(mix(dur, [body, 1], [a, air]), envBell(dur, pk, 1.6));
}
/** Chuông: partials kiểu chuông đồng (hum, prime, tierce, quint, nominal…). */
const BELL = [[0.5, 0.35, 1.6], [1, 1, 1.2], [1.19, 0.45, 0.9], [1.5, 0.35, 0.8], [2, 0.6, 0.6], [2.52, 0.25, 0.4], [3, 0.2, 0.32], [4.18, 0.12, 0.2]];
const bell = (f, dur, dk = 1, r = rng(11)) => modal(dur, BELL.map(([k, a, d]) => [f * k, a, d * dk]), { r });
/** Chuông nhỏ trong (celesta / chuông gió): ít partial, sáng. */
const chime = (f, dur, dk = 1, r = rng(12)) => modal(dur, [[f, 1, 0.5 * dk], [f * 2.01, 0.35, 0.3 * dk], [f * 3.98, 0.15, 0.15 * dk], [f * 5.43, 0.08, 0.08 * dk]], { r });
/** Kim loại (lưỡi kiếm, giáp): partial không hoà âm, ngân dài, hai partial gần nhau cho tiếng rung. */
const metal = (base, dur, dk = 1, r = rng(13)) => modal(dur, [[base, 0.6, 0.25 * dk], [base * 1.007, 0.5, 0.22 * dk], [base * 2.31, 0.5, 0.18 * dk], [base * 3.43, 0.35, 0.14 * dk], [base * 4.97, 0.25, 0.1 * dk], [base * 6.8, 0.15, 0.06 * dk]], { r });
/** Gỗ / tre: partial ngắn, trầm ấm. */
const wood = (base, dur, r = rng(14)) => modal(dur, [[base, 1, 0.05], [base * 2.57, 0.5, 0.03], [base * 4.1, 0.3, 0.018], [base * 6.2, 0.15, 0.01]], { r });
/** Bong bóng nước: sin cao độ đi lên nhanh, tắt nhanh. */
const bubble = (r, f, d = 0.05) => mul(osc(d, (t) => f * (1 + 2.2 * t / d)), envAD(d, 0.001, d * 0.25));
/** Trống taiko: màng trống (thịch trầm) + tiếng đập (nhiễu trầm) + vành + cộng hưởng mặt trống (250–600 Hz: loa điện thoại vẫn phát). */
function taiko(r, f = 62, dur = 1.1, hard = 1) {
  const skin = thump(f * 2.6, f, dur, 0.06), body = mul(lp(white(dur, r), 380, 0.8), envAD(dur, 0.001, 0.07)), slap = crack(r, 1200, 0.05, 0.7);
  const head = modal(Math.min(dur, 0.5), [[f * 4.1, 0.6, 0.12], [f * 6.3, 0.4, 0.08], [f * 8.7, 0.25, 0.05]], { r });
  return sat(mix(dur, [skin, 1], [body, 0.6 * hard], [slap, 0.45 * hard], [head, 0.5]), 1.8);
}
/** Kèn đồng (dàn saw lệch tông, lọc thông thấp có bao hình độ sáng). notes: MIDI; bright: Hz đỉnh. */
function brass(notes, dur, { a = 0.03, bright = 2600, d = 0.6, sustain = 0.55, r = rng(21) } = {}) {
  const out = buf(dur);
  for (const m of notes) { const s = ensemble(dur, midi(m) * 1.0, { type: 'saw', voices: 4, detune: 9, r }); for (let i = 0; i < s.length; i++) out[i] += s[i] / notes.length; }
  const cut = (t) => 300 + (bright - 300) * (t < a ? t / a : sustain + (1 - sustain) * Math.exp(-(t - a) / d));
  return mul(lp(lp(out, cut, 0.9), cut, 0.6), envAD(dur, a, d * 2.2, { sustain: 0.6 }));
}
/** Hợp xướng "a": dàn saw qua formant, lên chậm. */
function choir(notes, dur, { a = 0.25, r = rng(22) } = {}) {
  const out = buf(dur);
  for (const m of notes) { const s = ensemble(dur, (t) => midi(m) * (1 + 0.004 * Math.sin(TAU5 * t)), { type: 'saw', voices: 6, detune: 14, r }); for (let i = 0; i < s.length; i++) out[i] += s[i] / notes.length; }
  return mul(formant(out, [[700, 6, 1], [1220, 7, 0.7], [2600, 8, 0.35]]), envAD(dur, a, dur * 0.5, { sustain: 0.5 }));
}
const TAU5 = Math.PI * 2 * 5.2;
/** Lá xạc / cát: hạt nhiễu ngắn cao tần. */
const rustle = (r, dur, dens, f = 4200) => grains(dur, dens, (rr) => mul(bp(white(0.012, rr), f * (0.7 + rr() * 0.6), 2), envAD(0.012, 0.0005, 0.003)), r);
/** Lửa lách tách. */
const crackle = (r, dur, dens) => grains(dur, dens, (rr) => { const d = 0.004 + rr() * 0.01; return gain(mul(hp(white(d, rr), 1800 + rr() * 2500), envAD(d, 0.0003, d * 0.3)), 0.5 + rr()); }, r);
/** Sỏi đá vụn lăn. */
const debris = (r, dur, dens) => grains(dur, dens, (rr) => { const d = 0.02 + rr() * 0.03; return gain(mul(bp(white(d, rr), 500 + rr() * 1500, 1.5), envAD(d, 0.001, d * 0.25)), 0.4 + rr()); }, r);
/** Lấp lánh: nhiều chuông nhỏ cao, rải ngẫu nhiên. */
function sparkle(r, dur, dens, f0 = 2400, spread = 2) {
  return grains(dur, dens, (rr) => { const f = f0 * spread ** rr(); return gain(chime(f, 0.25, 0.3, rr), 0.12 + rr() * 0.12); }, r);
}
/** Vút lên (riser): nhiễu thông cao quét lên + sin lên. */
const riser = (r, dur, f0 = 300, f1 = 6000) => mul(mix(dur, [bp(white(dur, r), (t) => f0 * (f1 / f0) ** (t / dur), 2.5), 1], [osc(dur, (t) => 120 * (8) ** (t / dur), 'saw'), 0.05]), envPts(dur, [[0, 0], [dur * 0.85, 1], [dur, 0]], 1.8));
/** Chập cheng (crash cymbal). */
const cymbal = (r, dur) => mul(mix(dur, [hp(white(dur, r), 5200, 0.6), 0.7], [metal(3100, dur, 3, r), 0.25], [bp(white(dur, r), 8500, 1.2), 0.4]), envAD(dur, 0.002, dur * 0.3));
/** Tiếng gió xoáy: nhiễu hồng lọc dải với tâm dao động chậm. */
const wind = (r, dur, fc = 900, q = 2) => bp(pink(dur, r), (t) => fc * (1 + 0.35 * Math.sin(t * 7.1) + 0.2 * Math.sin(t * 13.7 + 1)), q);
const room = (x, wet = 0.18, size = 0.55) => reverb(x, { size, damp: 0.45, wet, scale: 0.45, tail: 0.35 });
const hall = (x, wet = 0.3, size = 0.86, tail = 1.6) => reverb(x, { size, damp: 0.3, wet, scale: 1, tail });

// ——— ngân hàng ———
export const BANK = {
  // ——— giao diện / sảnh ———
  ui_tap: { cat: 'ui', build: (r) => room(mix(0.12, [wood(1250, 0.12, r), 0.8], [crack(r, 4200, 0.02, 1.5), 0.25], [mul(osc(0.06, (t) => 2100 - 9000 * t), envAD(0.06, 0.001, 0.012)), 0.2]), 0.08) },
  ui_toggle: { cat: 'ui', build: (r) => room(mix(0.2, [chime(1760, 0.2, 0.25, r), 0.45], [wood(1500, 0.08, r), 0.5]), 0.1) },
  ui_select: { cat: 'ui', build: (r) => room(mix(0.5, [whoosh(r, 0.22, 1200, 3600, 2000, { q: 1.2, air: 0.5 }), 0.4], [chime(1318, 0.45, 0.5, r), 0.35, 0.05], [chime(1976, 0.4, 0.4, r), 0.22, 0.09]), 0.15) },
  ui_confirm: { cat: 'ui', build: (r) => hall(mix(0.7, [chime(1047, 0.6, 0.7, r), 0.45], [chime(1568, 0.6, 0.7, r), 0.4, 0.07], [chime(2093, 0.5, 0.6, r), 0.25, 0.13], [whoosh(r, 0.25, 900, 3200, 1800, { air: 0.6 }), 0.25]), 0.18, 0.7, 0.6) },
  ui_back: { cat: 'ui', build: (r) => room(mix(0.25, [mul(osc(0.18, (t) => 900 * 0.6 ** (t / 0.18), 'tri'), envAD(0.18, 0.004, 0.05)), 0.4], [whoosh(r, 0.18, 2400, 1400, 700, { air: 0.3 }), 0.35]), 0.1) },
  ui_open: { cat: 'ui', build: (r) => room(mix(0.45, [whoosh(r, 0.32, 500, 2200, 1400, { pk: 0.6, air: 0.4 }), 0.6], [chime(1568, 0.35, 0.4, r), 0.2, 0.2]), 0.15) },
  ui_whoosh: { cat: 'ui', build: (r) => hall(whoosh(r, 0.5, 300, 1800, 500, { q: 1.1, pk: 0.5, air: 0.45 }), 0.15, 0.6, 0.4) },
  ui_tick: { cat: 'ui', build: (r) => mix(0.08, [wood(1900, 0.08, r), 0.7], [crack(r, 5000, 0.02, 2), 0.2]) },
  ui_error: { cat: 'ui', build: (r) => room(mul(lp(mix(0.25, [osc(0.25, 160, 'sqr'), 0.5], [osc(0.25, 167, 'sqr'), 0.5]), 900), envPts(0.25, [[0, 0], [0.01, 1], [0.09, 0.8], [0.1, 0], [0.12, 0.9], [0.22, 0.6], [0.25, 0]])), 0.1) },
  ui_reward: { cat: 'ui', build: (r) => hall(mix(1.1, ...[0, 1, 2, 3, 4, 5].map((i) => [coinTone(r, 2600 + i * 180), 0.35, i * 0.06]), [sparkle(r, 1.0, 26, 3000, 2), 0.6], [chime(2093, 0.8, 0.8, r), 0.3, 0.32]), 0.22, 0.7, 0.8) },
  ui_found: { cat: 'sting', build: (r) => hall(mix(1.9, [taiko(r, 58, 1.2), 0.9], [taiko(r, 66, 1.0, 0.7), 0.6, 0.18], [brass([62, 66, 69, 74], 1.6, { a: 0.04, bright: 3200, d: 0.5, r }), 0.55, 0.18], [bell(587, 1.6, 1, r), 0.3, 0.18], [cymbal(r, 1.4), 0.25, 0.18], [sparkle(r, 1.2, 18, 2600, 2), 0.5, 0.25]), 0.28, 0.85, 1.2) },
  ui_lock: { cat: 'sting', build: (r) => hall(mix(1.6, [thump(160, 38, 0.9, 0.12), 1], [crack(r, 1800, 0.08, 0.8), 0.5], [metal(1450, 1.2, 1.4, r), 0.35, 0.01], [whoosh(r, 0.25, 4000, 1500, 600, { air: 0.5 }), 0.3], [choir([62, 69, 74], 1.4, { a: 0.08, r }), 0.25, 0.05], [sparkle(r, 1.1, 22, 2200, 2.5), 0.5, 0.08]), 0.25, 0.8, 1.0) },
  ui_vs: { cat: 'sting', build: (r) => hall(mix(2.4, [riser(r, 0.9, 400, 7000), 0.55], [thump(120, 34, 1.4, 0.1), 0.55, 0.9], [punch(r, 280, 70, 0.8, 420), 0.8, 0.9], [crack(r, 1500, 0.12, 0.7), 0.7, 0.9], [cymbal(r, 1.5), 0.35, 0.9], [brass([50, 57, 62, 65], 1.3, { a: 0.02, bright: 2400, d: 0.4, r }), 0.5, 0.9], [debris(r, 0.8, 120), 0.4, 0.95]), 0.3, 0.88, 1.4) },
  match_start: { cat: 'sting', build: (r) => {
    const horn = mul(lp(ensemble(2.6, (t) => midi(50) * (1 + 0.006 * Math.sin(t * 31)) * (t < 0.25 ? 0.94 + 0.06 * t / 0.25 : 1), { type: 'saw', voices: 6, detune: 7, r }), (t) => 500 + 900 * Math.min(1, t / 0.5) * Math.exp(-Math.max(0, t - 1.6) * 3), 0.8), envPts(2.6, [[0, 0], [0.25, 0.9], [1.7, 1], [2.5, 0]]));
    return hall(mix(3.2, [horn, 0.85], [taiko(r, 55, 1.2), 0.65, 0.05], [taiko(r, 55, 1.2), 0.5, 0.62], [taiko(r, 70, 1.0, 0.8), 0.5, 1.0], [taiko(r, 50, 1.6, 1.2), 0.75, 1.9], [cymbal(r, 1.6), 0.35, 1.9]), 0.32, 0.9, 1.6);
  } },
  horn: { cat: 'sting', build: (r) => { // tù và báo lính ra trận (đợt lính đầu tiên)
    const tone = (m, d) => mul(lp(ensemble(d, (t) => midi(m) * (1 + 0.005 * Math.sin(t * 29)) * (t < 0.3 ? 0.95 + 0.05 * t / 0.3 : 1), { type: 'saw', voices: 5, detune: 6, r }), (t) => 420 + 1300 * Math.min(1, t / 0.6) * Math.exp(-Math.max(0, t - 1.3) * 2.5), 0.8), envPts(d, [[0, 0], [0.3, 0.85], [1.4, 1], [d, 0]]));
    return hall(mix(2.8, [formant(tone(50, 2.3), [[520, 3, 1], [1150, 4, 0.7], [2500, 5, 0.25]]), 0.9], [tone(57, 2.1), 0.3, 0.12], [taiko(r, 62, 1.3, 0.8), 0.6, 0.05]), 0.34, 0.9, 1.4);
  } },
  victory: { cat: 'sting', build: (r) => {
    const ch = [[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [72, 76, 79, 84]], t = [0, 0.32, 0.64, 1.0];
    const layers = ch.map((n, i) => [brass(n, i === 3 ? 2.6 : 0.5, { a: 0.02, bright: 3600, d: i === 3 ? 0.9 : 0.25, r }), i === 3 ? 0.75 : 0.6, t[i]]);
    return hall(mix(4.2, ...layers, ...t.map((x, i) => [taiko(r, i === 3 ? 52 : 64, 1.2, i === 3 ? 1.3 : 0.8), i === 3 ? 1 : 0.6, x]), [cymbal(r, 2.2), 0.4, 1.0], [bell(1047, 2.4, 1.2, r), 0.25, 1.0], [sparkle(r, 2.5, 20, 2600, 2.2), 0.6, 1.0]), 0.34, 0.9, 1.8);
  } },
  defeat: { cat: 'sting', build: (r) => {
    const pad = (n, d) => mul(lp(ensemble(d, midi(n), { type: 'saw', voices: 5, detune: 10, r }), 700, 0.7), envAD(d, 0.35, d * 0.5, { sustain: 0.5 }));
    return hall(mix(4.0, [pad(57, 3.4), 0.45], [pad(60, 3.4), 0.32], [pad(64, 3.4), 0.28], [pad(45, 3.4), 0.3], [pad(53, 2.2), 0.4, 1.3], [taiko(r, 46, 1.8, 0.8), 0.6], [taiko(r, 42, 2.0, 0.7), 0.5, 1.3], [bell(440, 3.0, 1.4, r), 0.3, 0.05]), 0.36, 0.92, 2.0);
  } },

  // ——— vung / bắn (đánh thường) ———
  swing_light: { cat: 'combat', build: (r) => whoosh(r, 0.17, 900, 3600, 1600, { q: 1.6, pk: 0.4, air: 0.5, noise: 'white' }) },
  swing_heavy: { cat: 'combat', build: (r) => mix(0.32, [whoosh(r, 0.3, 250, 1100, 380, { q: 1.3, pk: 0.5, air: 0.35 }), 1], [mul(osc(0.3, (t) => 70 + 40 * Math.sin(Math.PI * t / 0.3)), envBell(0.3, 0.5)), 0.25]) },
  shot_bow: { cat: 'combat', build: (r) => room(mix(0.32, [mul(pluck(0.25, 196, { r, bright: 0.9, decay: 0.985, pick: 0.3 }), envAD(0.25, 0.001, 0.06)), 0.6], [whoosh(r, 0.22, 2200, 4200, 1800, { q: 2, pk: 0.25, air: 0.4, noise: 'white' }), 0.55, 0.02]), 0.1) },
  shot_magic: { cat: 'combat', build: (r) => room(mix(0.3, [mul(fm(0.22, (t) => 520 * 2.4 ** (t / 0.22), 1.5, (t) => 3 * Math.exp(-t * 12)), envAD(0.22, 0.003, 0.07)), 0.5], [whoosh(r, 0.2, 1500, 4800, 2400, { q: 2.5, pk: 0.3, air: 0.3, noise: 'white' }), 0.45], [sparkle(r, 0.25, 40, 3000, 2), 0.5]), 0.12) },
  shot_minion: { cat: 'minor', build: (r) => mix(0.14, [mul(pluck(0.12, 262, { r, bright: 0.8, decay: 0.97, pick: 0.3 }), envAD(0.12, 0.001, 0.035)), 0.6], [whoosh(r, 0.12, 2600, 4400, 2200, { q: 2, pk: 0.25, noise: 'white' }), 0.4]) },
  tower_shot: { cat: 'combat', build: (r) => room(mix(0.55, [mul(fm(0.45, (t) => 180 * 1.9 ** (t / 0.12), 2.01, (t) => 2.5 * Math.exp(-t * 6)), envPts(0.45, [[0, 0], [0.08, 1], [0.45, 0]])), 0.5], [whoosh(r, 0.4, 700, 3600, 1800, { q: 1.8, pk: 0.3, air: 0.5 }), 0.55], [crack(r, 2200, 0.05, 1), 0.3]), 0.2, 0.6) },

  // ——— trúng đòn ———
  hit_flesh: { cat: 'combat', build: (r) => room(sat(mix(0.22, [thump(160, 60, 0.16, 0.25), 0.55], [thump(420, 140, 0.09, 0.3), 0.6], [mul(bp(white(0.14, r), 620, 0.75), envAD(0.14, 0.0006, 0.024)), 0.9], [crack(r, 1900, 0.06, 0.9), 0.55], [click(r, 5200, 1, 0.0015, 0.01), 0.3]), 2.1), 0.12) },
  hit_slash: { cat: 'combat', build: (r) => room(mix(0.32, [sat(mix(0.16, [thump(160, 62, 0.14, 0.22), 0.8], [crack(r, 2400, 0.05, 1), 0.6]), 1.6), 1], [metal(2350, 0.3, 0.8, r), 0.28, 0.004], [whoosh(r, 0.1, 5000, 2600, 1200, { q: 1.5, pk: 0.15, noise: 'white' }), 0.35]), 0.12) },
  hit_armor: { cat: 'combat', build: (r) => room(mix(0.45, [metal(820, 0.45, 1, r), 0.6], [crack(r, 3200, 0.04, 1.2), 0.6], [thump(120, 70, 0.12, 0.3), 0.5], [debris(r, 0.25, 70), 0.35, 0.01]), 0.15) },
  hit_magic: { cat: 'combat', build: (r) => room(mix(0.32, [mul(fm(0.18, (t) => 1600 * 0.22 ** (t / 0.18), 2.7, (t) => 4 * Math.exp(-t * 18)), envAD(0.18, 0.001, 0.05)), 0.45], [mul(hp(white(0.25, r), 3500, 0.7), mul(envAD(0.25, 0.001, 0.06), osc(0.25, 43, 'sqr').map((v) => 0.6 + 0.4 * v))), 0.35], [thump(130, 55, 0.14, 0.25), 0.6], [sparkle(r, 0.2, 60, 3200, 2), 0.4]), 0.16) },
  hit_true: { cat: 'combat', build: (r) => room(mix(0.4, [modal(0.4, [[1760, 0.6, 0.18], [2637, 0.45, 0.14], [3520, 0.3, 0.1], [4699, 0.22, 0.07], [6271, 0.12, 0.05]], { r }), 0.55], [crack(r, 5200, 0.03, 1.5), 0.55], [thump(140, 60, 0.12, 0.25), 0.45]), 0.16) },
  hit_crit: { cat: 'combat', build: (r) => hall(mix(0.6, [sat(mix(0.35, [thump(180, 42, 0.32, 0.15), 1], [crack(r, 1600, 0.09, 0.7), 0.7], [mul(lp(white(0.2, r), 900), envAD(0.2, 0.001, 0.05)), 0.5]), 2.2), 1], [metal(1900, 0.5, 1.2, r), 0.35, 0.005], [whoosh(r, 0.14, 6000, 3000, 1000, { q: 1.4, pk: 0.1, noise: 'white' }), 0.4], [sparkle(r, 0.35, 50, 2800, 2.2), 0.45, 0.02]), 0.14, 0.6, 0.5) },
  hit_minion: { cat: 'minor', build: (r) => mix(0.12, [thump(380, 150, 0.08, 0.3), 0.6], [mul(bp(white(0.08, r), 800, 0.9), envAD(0.08, 0.0005, 0.015)), 0.5], [crack(r, 2600, 0.04, 1.1), 0.5]) },
  tower_hit: { cat: 'combat', build: (r) => room(sat(mix(0.6, [thump(130, 40, 0.45, 0.14), 1], [crack(r, 1400, 0.1, 0.7), 0.6], [mul(fm(0.35, (t) => 900 * 0.3 ** (t / 0.35), 1.41, 3), envAD(0.35, 0.002, 0.08)), 0.3], [sparkle(r, 0.4, 40, 2400, 2), 0.4]), 1.5), 0.2, 0.65) },

  // ——— chiêu theo nguyên tố (tung chiêu / trúng) ———
  fire_cast: { cat: 'skill', build: (r) => room(mix(0.75, [mul(lp(brown(0.7, r), (t) => 250 + 1300 * Math.sin(Math.PI * Math.min(1, t / 0.6)), 0.9), envBell(0.7, 0.35)), 1], [whoosh(r, 0.5, 400, 2400, 700, { q: 1.2, pk: 0.35, air: 0.4 }), 0.5], [crackle(r, 0.7, (t) => 140 * Math.exp(-t * 2.5)), 0.4]), 0.18) },
  fire_hit: { cat: 'skill', build: (r) => hall(mix(1.2, [sat(mix(0.7, [thump(110, 32, 0.6, 0.12), 1], [mul(lp(white(0.6, r), (t) => 2200 * Math.exp(-t * 5) + 200, 0.7), envAD(0.6, 0.001, 0.14)), 0.9]), 2.4), 1], [crackle(r, 1.1, (t) => 220 * Math.exp(-t * 2.2)), 0.5, 0.02], [debris(r, 0.6, 50), 0.25, 0.05]), 0.2, 0.75, 0.8) },
  water_cast: { cat: 'skill', build: (r) => room(mix(0.65, [whoosh(r, 0.5, 600, 2600, 900, { q: 1.4, pk: 0.4, air: 0.3 }), 0.7], [grains(0.6, (t) => 70 * Math.exp(-t * 3), (rr) => gain(bubble(rr, 500 + rr() * 1100), 0.25 + rr() * 0.3), r), 0.7], [mul(bp(white(0.4, r), 1800, 0.7), envAD(0.4, 0.01, 0.1)), 0.3]), 0.18) },
  water_hit: { cat: 'skill', build: (r) => hall(mix(0.9, [mul(bp(white(0.6, r), (t) => 2600 * Math.exp(-t * 3) + 500, 0.6), envAD(0.6, 0.002, 0.12)), 0.9], [thump(120, 50, 0.3, 0.2), 0.7], [grains(0.8, (t) => 160 * Math.exp(-t * 4), (rr) => gain(bubble(rr, 700 + rr() * 1700, 0.04), 0.2 + rr() * 0.3), r), 0.6, 0.03], [grains(0.6, (t) => 80 * Math.exp(-t * 5), (rr) => gain(chime(2500 + rr() * 2500, 0.12, 0.2, rr), 0.15), r), 0.4, 0.05]), 0.18, 0.7, 0.6) },
  leaf_cast: { cat: 'skill', build: (r) => room(mix(0.5, [whoosh(r, 0.32, 1400, 5200, 2200, { q: 1.6, pk: 0.35, air: 0.5, noise: 'white' }), 0.6], [rustle(r, 0.45, (t) => 500 * Math.exp(-t * 6)), 0.45], [wood(640, 0.12, r), 0.45, 0.02], [wood(820, 0.1, r), 0.3, 0.09]), 0.14) },
  leaf_hit: { cat: 'skill', build: (r) => room(mix(0.45, [sat(mix(0.15, [thump(170, 70, 0.12, 0.25), 0.7], [crack(r, 3000, 0.04, 1.2), 0.6]), 1.5), 1], [metal(2900, 0.25, 0.6, r), 0.18], [rustle(r, 0.4, (t) => 700 * Math.exp(-t * 7)), 0.5], [wood(560, 0.12, r), 0.4]), 0.14) },
  wind_cast: { cat: 'skill', build: (r) => room(mix(0.7, [mul(wind(r, 0.65, 1100, 1.8), envBell(0.65, 0.35)), 0.9], [whoosh(r, 0.4, 700, 3000, 1500, { q: 1.3, pk: 0.4, air: 0.6 }), 0.5], [mul(osc(0.6, (t) => 1500 + 500 * Math.sin(t * 9) - 600 * t), envBell(0.6, 0.4)), 0.06]), 0.16) },
  wind_hit: { cat: 'skill', build: (r) => room(mix(0.4, [whoosh(r, 0.22, 5000, 2600, 700, { q: 1.6, pk: 0.12, air: 0.5, noise: 'white' }), 0.8], [crack(r, 3800, 0.04, 1), 0.4], [thump(140, 70, 0.1, 0.3), 0.4], [mul(osc(0.3, (t) => 2400 * 0.5 ** (t / 0.3)), envAD(0.3, 0.002, 0.08)), 0.08]), 0.14) },
  light_cast: { cat: 'skill', build: (r) => hall(mix(1.0, [chime(1175, 0.9, 1, r), 0.4], [chime(1480, 0.9, 1, r), 0.3, 0.05], [chime(1760, 0.9, 1, r), 0.28, 0.1], [choir([74, 78, 81], 0.9, { a: 0.12, r }), 0.25], [sparkle(r, 0.8, 30, 2600, 2.4), 0.6], [whoosh(r, 0.3, 800, 3000, 1500, { air: 0.6 }), 0.25]), 0.25, 0.8, 0.9) },
  light_hit: { cat: 'skill', build: (r) => hall(mix(0.9, [bell(880, 0.8, 0.8, r), 0.45], [thump(140, 55, 0.25, 0.2), 0.6], [crack(r, 3800, 0.04, 1.2), 0.4], [sparkle(r, 0.6, 70, 2800, 2.4), 0.7, 0.01]), 0.22, 0.75, 0.7) },
  arcane_cast: { cat: 'skill', build: (r) => room(mix(0.6, [mul(fm(0.5, (t) => 300 * 2.6 ** (t / 0.5), 1.5, (t) => 2 + 3 * Math.sin(Math.PI * t / 0.5)), envBell(0.5, 0.3)), 0.4], [whoosh(r, 0.45, 600, 3000, 1400, { q: 1.6, air: 0.4 }), 0.6], [sparkle(r, 0.5, 30, 2200, 2.2), 0.45]), 0.18) },
  arcane_hit: { cat: 'skill', build: (r) => room(mix(0.55, [mul(fm(0.35, (t) => 1200 * 0.25 ** (t / 0.35), 2.4, (t) => 5 * Math.exp(-t * 9)), envAD(0.35, 0.001, 0.08)), 0.45], [thump(130, 48, 0.25, 0.18), 0.7], [mul(hp(white(0.3, r), 2600), envAD(0.3, 0.001, 0.06)), 0.3], [sparkle(r, 0.35, 50, 2600, 2.2), 0.4]), 0.18) },
  earth_hit: { cat: 'skill', low: 100, build: (r) => hall(mix(1.1, [punch(r, 260, 60, 0.6, 380), 1], [sat(thump(95, 30, 0.7, 0.1), 2), 0.3], [mul(bp(brown(0.6, r), 500, 0.6), envAD(0.6, 0.002, 0.15)), 0.7], [debris(r, 1.0, (t) => 200 * Math.exp(-t * 3)), 0.7, 0.02], [crack(r, 900, 0.1, 0.6), 0.5]), 0.18, 0.75, 0.7) },
  earth_cast: { cat: 'skill', low: 100, build: (r) => room(mix(0.8, [mul(bp(brown(0.75, r), (t) => 220 + 600 * Math.sin(Math.PI * Math.min(1, t / 0.6)), 0.8), envBell(0.75, 0.45)), 1], [debris(r, 0.7, (t) => 60 + 140 * Math.sin(Math.PI * t / 0.7)), 0.6], [whoosh(r, 0.4, 250, 1100, 350, { q: 1.2, pk: 0.6, air: 0.2 }), 0.5, 0.25], [punch(r, 300, 90, 0.3, 420), 0.6, 0.5]), 0.18) },
  ult_cast: { cat: 'skill', low: 100, build: (r) => hall(mix(1.6, [thump(70, 26, 1.2, 0.14), 0.3], [punch(r, 240, 70, 0.7, 360), 0.9], [mul(bp(brown(1.4, r), (t) => 300 + 900 * Math.exp(-t * 2), 0.7), envAD(1.4, 0.005, 0.35)), 0.6], [riser(r, 0.35, 800, 6000), 0.3], [choir([57, 62, 69], 1.4, { a: 0.05, r }), 0.4], [cymbal(r, 1.2), 0.2, 0.02]), 0.3, 0.88, 1.2) },
  dash: { cat: 'skill', build: (r) => whoosh(r, 0.24, 600, 3200, 900, { q: 1.4, pk: 0.35, air: 0.5 }) },
  slam: { cat: 'skill', low: 100, build: (r) => hall(mix(1.0, [punch(r, 300, 70, 0.55, 420), 0.9], [sat(thump(100, 28, 0.7, 0.1), 2.2), 0.45], [crack(r, 1100, 0.1, 0.6), 0.6], [debris(r, 0.9, (t) => 220 * Math.exp(-t * 3.5)), 0.7, 0.02], [mul(bp(white(0.5, r), 450, 0.7), envAD(0.5, 0.002, 0.1)), 0.5]), 0.2, 0.75, 0.7) },

  // ——— phép bổ trợ / trạng thái ———
  blink: { cat: 'skill', build: (r) => room(mix(0.5, [mul(fm(0.35, (t) => 2400 * 0.18 ** (t / 0.35), 1.5, 2.5), envAD(0.35, 0.002, 0.08)), 0.4], [whoosh(r, 0.3, 4000, 2000, 600, { q: 1.8, pk: 0.15, air: 0.5, noise: 'white' }), 0.6], [sparkle(r, 0.4, 50, 3000, 2), 0.5, 0.05]), 0.2) },
  heal: { cat: 'skill', build: (r) => hall(mix(1.0, [chime(784, 0.9, 1, r), 0.35], [chime(988, 0.9, 1, r), 0.3, 0.08], [chime(1175, 0.9, 1, r), 0.3, 0.16], [chime(1568, 0.8, 1, r), 0.25, 0.24], [sparkle(r, 0.8, 26, 2000, 2.5), 0.5, 0.05]), 0.25, 0.8, 0.8) },
  restore: { cat: 'skill', build: (r) => hall(mix(0.8, [mul(osc(0.7, (t) => 440 * 2 ** (t * 0.9), 'tri'), envBell(0.7, 0.3)), 0.12], [chime(880, 0.7, 0.9, r), 0.3, 0.05], [chime(1319, 0.7, 0.9, r), 0.25, 0.15], [sparkle(r, 0.7, 20, 1800, 2.5), 0.45]), 0.25, 0.8, 0.7) },
  restore_break: { cat: 'skill', build: (r) => room(mix(0.35, [modal(0.35, [[2900, 0.5, 0.06], [4100, 0.4, 0.05], [5600, 0.3, 0.04], [7300, 0.2, 0.03]], { r }), 0.6], [grains(0.3, (t) => 300 * Math.exp(-t * 12), (rr) => gain(mul(hp(white(0.01, rr), 4000), envAD(0.01, 0.0003, 0.002)), 0.5), r), 0.6], [mul(osc(0.25, (t) => 600 * 0.5 ** (t / 0.25), 'tri'), envAD(0.25, 0.002, 0.06)), 0.15]), 0.14) },
  smite: { cat: 'skill', build: (r) => hall(mix(1.6, [sat(mix(0.2, [crack(r, 2600, 0.12, 0.5), 1], [hp(white(0.2, r), 1500).map((v, i) => v * Math.exp(-i / (SR * 0.03))), 0.8]), 2.5), 1], [mul(lp(brown(1.5, r), 380, 0.7), envPts(1.5, [[0, 0], [0.05, 1], [1.5, 0]], 0.6)), 0.9, 0.03], [thump(90, 30, 0.8, 0.12), 0.7, 0.02]), 0.25, 0.85, 1.1) },
  haste: { cat: 'skill', build: (r) => room(mix(0.5, [whoosh(r, 0.45, 500, 2600, 1800, { q: 1.2, pk: 0.6, air: 0.5 }), 0.8], [mul(osc(0.4, (t) => 600 * 2 ** (t * 2.5), 'tri'), envBell(0.4, 0.6)), 0.08]), 0.14) },
  cleanse: { cat: 'skill', build: (r) => hall(mix(0.6, [modal(0.5, [[1320, 0.5, 0.2], [1980, 0.4, 0.16], [2970, 0.3, 0.12]], { r }), 0.5], [whoosh(r, 0.35, 900, 4200, 2400, { air: 0.6 }), 0.5], [sparkle(r, 0.5, 30, 2400, 2.2), 0.4]), 0.2, 0.75, 0.6) },
  shield: { cat: 'skill', build: (r) => room(mix(0.55, [metal(1180, 0.5, 1.3, r), 0.35], [mul(osc(0.5, (t) => 330 * (1 + 0.5 * Math.min(1, t * 6)), 'tri'), envAD(0.5, 0.02, 0.15)), 0.15], [whoosh(r, 0.3, 700, 2600, 1800, { pk: 0.6, air: 0.5 }), 0.4]), 0.2) },
  stun: { cat: 'skill', build: (r) => room(mix(0.5, [thump(200, 90, 0.12, 0.25), 0.6], [chime(1568, 0.45, 0.6, r), 0.3, 0.02], [chime(1661, 0.45, 0.6, r), 0.25, 0.02]), 0.16) },
  knockup: { cat: 'skill', build: (r) => room(mix(0.4, [whoosh(r, 0.35, 300, 1800, 2600, { q: 1.4, pk: 0.75, air: 0.4 }), 0.7], [thump(140, 60, 0.12, 0.3), 0.5]), 0.14) },
  recall_start: { cat: 'skill', build: (r) => hall(mix(1.6, [mul(ensemble(1.5, (t) => 330 * (1 + 0.004 * Math.sin(t * 22)), { type: 'tri', voices: 3, detune: 6, r }), envAD(1.5, 0.3, 0.6, { sustain: 0.4 })), 0.15], [sparkle(r, 1.4, 14, 1800, 2.6), 0.5], [chime(659, 1.2, 1.3, r), 0.25, 0.05]), 0.3, 0.85, 1.0) },
  recall_end: { cat: 'skill', build: (r) => hall(mix(0.9, [riser(r, 0.45, 400, 5000), 0.45], [chime(1319, 0.7, 0.8, r), 0.3, 0.4], [chime(1976, 0.6, 0.8, r), 0.25, 0.45], [whoosh(r, 0.4, 3000, 1200, 600, { air: 0.5 }), 0.35, 0.42]), 0.25, 0.8, 0.7) },
  respawn: { cat: 'skill', build: (r) => hall(mix(1.0, [mul(osc(0.8, (t) => 220 * 2 ** (t * 1.5), 'tri'), envBell(0.8, 0.4)), 0.1], [chime(880, 0.8, 1, r), 0.25, 0.2], [chime(1319, 0.8, 1, r), 0.22, 0.3], [sparkle(r, 0.9, 24, 1800, 2.5), 0.5]), 0.28, 0.8, 0.9) },

  // ——— tiền / tiến trình ———
  coin: { cat: 'econ', build: (r) => room(mix(0.32, [coinTone(r, 2900), 0.6], [coinTone(r, 3700), 0.35, 0.05]), 0.1) },
  coins: { cat: 'econ', build: (r) => room(mix(0.8, ...[0, 1, 2, 3, 4, 5, 6].map((i) => [coinTone(r, 2500 + ((i * 397) % 1400)), 0.4 - i * 0.03, i * 0.055 + r() * 0.02]), [mul(hp(white(0.5, r), 5000), envAD(0.5, 0.01, 0.12)), 0.08]), 0.14) },
  buy: { cat: 'econ', build: (r) => room(mix(0.6, ...[0, 1, 2].map((i) => [coinTone(r, 2700 + i * 420), 0.4, i * 0.05]), [metal(980, 0.35, 0.9, r), 0.18, 0.12], [wood(520, 0.1, r), 0.35, 0.12]), 0.14) },
  levelup: { cat: 'econ', build: (r) => hall(mix(1.3, ...[72, 76, 79, 84].map((m, i) => [chime(midi(m), 0.9, 1, r), 0.32, i * 0.08]), [bell(midi(84), 1.0, 1, r), 0.18, 0.32], [sparkle(r, 1.0, 32, 2400, 2.6), 0.55, 0.1], [riser(r, 0.35, 600, 6000), 0.12]), 0.28, 0.82, 1.0) },
  skill_up: { cat: 'econ', build: (r) => room(mix(0.4, [chime(midi(79), 0.35, 0.6, r), 0.4], [chime(midi(86), 0.3, 0.5, r), 0.3, 0.06], [whoosh(r, 0.18, 1500, 4000, 2500, { air: 0.5 }), 0.2]), 0.15) },
  orb: { cat: 'econ', build: (r) => hall(mix(0.8, [grains(0.4, (t) => 90 * Math.exp(-t * 6), (rr) => gain(bubble(rr, 600 + rr() * 900), 0.3), r), 0.6], [chime(1047, 0.7, 0.9, r), 0.3, 0.05], [chime(1568, 0.6, 0.8, r), 0.25, 0.12], [sparkle(r, 0.6, 24, 2200, 2.4), 0.45, 0.05]), 0.24, 0.78, 0.7) },

  // ——— chết / mục tiêu ———
  death_hero: { cat: 'combat', low: 100, build: (r) => hall(mix(1.3, [punch(r, 280, 70, 0.5, 420), 0.85], [thump(110, 38, 0.6, 0.15), 0.4], [mul(lp(brown(0.9, r), 900), envAD(0.9, 0.005, 0.22)), 0.35], [mul(osc(1.1, (t) => 660 * 0.5 ** (t / 0.9) * (1 + 0.012 * Math.sin(t * 31)), 'tri'), envAD(1.1, 0.01, 0.35)), 0.2], [choir([57, 64], 1.1, { a: 0.04, r }), 0.22], [whoosh(r, 0.6, 2400, 900, 300, { q: 1.2, pk: 0.15, air: 0.3 }), 0.22, 0.04]), 0.28, 0.85, 1.0) },
  death_minion: { cat: 'minor', build: (r) => mix(0.34, [punch(r, 320, 110, 0.2, 480), 0.7], [debris(r, 0.3, 90), 0.4, 0.02], [crack(r, 1500, 0.05, 0.8), 0.25]) },
  death_monster: { cat: 'combat', build: (r) => hall(mix(1.0, [mul(lp(sat(mix(0.9, [osc(0.9, (t) => 95 * 0.6 ** (t / 0.9), 'saw'), 0.8], [brown(0.9, r), 0.5]), 2), (t) => 900 * Math.exp(-t * 2.5) + 150, 1.2), envAD(0.9, 0.04, 0.3)), 1], [thump(90, 34, 0.5, 0.15), 0.6, 0.15]), 0.24, 0.8, 0.8) },
  boss_roar: { cat: 'sting', build: (r) => hall(mix(1.8, [mul(formant(sat(mix(1.6, [osc(1.6, (t) => 70 + 25 * Math.sin(Math.PI * t / 1.6) + 6 * Math.sin(t * 40), 'saw'), 1], [brown(1.6, r), 0.8]), 2.5), [[400, 4, 1], [900, 5, 0.8], [2400, 6, 0.4]]), envPts(1.6, [[0, 0], [0.15, 1], [1.1, 0.8], [1.6, 0]])), 1], [thump(80, 28, 0.9, 0.12), 0.7]), 0.32, 0.9, 1.3) },
  tower_down: { cat: 'sting', low: 100, build: (r) => hall(mix(2.6, [sat(thump(85, 24, 1.2, 0.1), 2.4), 0.4], [punch(r, 240, 60, 1.0, 330), 1], [mul(bp(brown(2.2, r), (t) => 1400 * Math.exp(-t * 1.5) + 250, 0.6), envAD(2.2, 0.005, 0.5)), 0.9], [debris(r, 2.4, (t) => 300 * Math.exp(-t * 1.4)), 0.85, 0.05], [crack(r, 900, 0.15, 0.6), 0.6], [metal(410, 1.6, 2, r), 0.25, 0.02]), 0.3, 0.88, 1.5) },

  // ——— thông báo hạ gục (nhạc ngắn) ———
  ann_ally: { cat: 'sting', build: (r) => hall(mix(1.2, [taiko(r, 70, 0.9), 0.8], [crack(r, 2000, 0.06, 0.8), 0.3], [chime(1175, 0.9, 0.9, r), 0.3, 0.04], [chime(1760, 0.8, 0.9, r), 0.25, 0.1], [sparkle(r, 0.8, 22, 2400, 2.3), 0.45, 0.05]), 0.25, 0.8, 0.9) },
  ann_enemy: { cat: 'sting', build: (r) => hall(mix(1.3, [taiko(r, 66, 1.1), 0.85], [brass([58, 61, 65], 1.0, { a: 0.03, bright: 2000, d: 0.4, r }), 0.55, 0.02], [bell(466, 1.1, 1, r), 0.2, 0.02]), 0.28, 0.85, 1.0) },
  ann_first: { cat: 'sting', build: (r) => hall(mix(1.8, [taiko(r, 62, 1.0), 0.55], [taiko(r, 54, 1.3, 1.2), 0.7, 0.16], [brass([55, 62, 67, 71], 1.4, { a: 0.02, bright: 3200, d: 0.5, r }), 0.8, 0.16], [cymbal(r, 1.3), 0.3, 0.16], [sparkle(r, 1.2, 22, 2400, 2.3), 0.5, 0.2]), 0.3, 0.87, 1.2) },
  ann_multi: { cat: 'sting', build: (r) => hall(mix(2.0, [taiko(r, 66, 0.8, 0.8), 0.55], [taiko(r, 66, 0.8, 0.8), 0.55, 0.11], [taiko(r, 52, 1.4, 1.3), 0.75, 0.22], [brass([57, 64, 69, 73, 76], 1.6, { a: 0.02, bright: 3600, d: 0.55, r }), 0.8, 0.22], [cymbal(r, 1.5), 0.35, 0.22], [choir([69, 73, 76], 1.6, { a: 0.1, r }), 0.25, 0.25], [sparkle(r, 1.4, 30, 2400, 2.4), 0.55, 0.25]), 0.32, 0.88, 1.4) },
  ann_streak: { cat: 'sting', build: (r) => hall(mix(2.0, [riser(r, 0.4, 500, 6000), 0.3], [taiko(r, 48, 1.6, 1.3), 1, 0.38], [choir([50, 57, 62, 66], 1.6, { a: 0.06, r }), 0.4, 0.36], [brass([50, 57, 62], 1.4, { a: 0.03, bright: 2600, d: 0.6, r }), 0.45, 0.38], [cymbal(r, 1.4), 0.3, 0.38], [bell(587, 1.4, 1, r), 0.2, 0.38]), 0.34, 0.9, 1.5) },
  ann_shutdown: { cat: 'sting', build: (r) => hall(mix(1.5, [whoosh(r, 0.2, 6000, 2500, 700, { q: 1.4, pk: 0.1, noise: 'white' }), 0.6], [punch(r, 260, 60, 0.7, 400), 0.9, 0.08], [crack(r, 1300, 0.1, 0.6), 0.6, 0.08], [brass([57, 60, 64], 1.0, { a: 0.02, bright: 2400, d: 0.35, r }), 0.5, 0.08]), 0.3, 0.86, 1.1) },
  ann_executed: { cat: 'sting', build: (r) => hall(mix(0.9, [taiko(r, 66, 0.8, 0.7), 0.7], [metal(620, 0.7, 1.2, r), 0.22], [brass([57, 60], 0.6, { a: 0.03, bright: 1600, d: 0.3, r }), 0.3]), 0.25, 0.8, 0.8) },
};

/** Một tiếng đồng xu: partial kim loại nhỏ, tần số cao, ngân ngắn. */
function coinTone(r, f) { return mul(modal(0.3, [[f, 0.6, 0.09], [f * 1.48, 0.4, 0.07], [f * 2.31, 0.3, 0.05], [f * 3.06, 0.15, 0.03]], { r }), envAD(0.3, 0.0008, 0.3)); }

// ——— nhạc sảnh: ngũ cung Rê (Re Mi Fa# La Si), 80 BPM, 16 ô nhịp = 48 giây, lặp liền mạch ———
export function lobbyMusic() {
  const r = rng(2024), BPM = 80, beat = 60 / BPM, bars = 16, len = bars * 4 * beat, tail = 4, total = len + tail;
  const L = buf(total), R = buf(total);
  const put = (x, g, at, pan = 0) => { const o = Math.round(at * SR), gl = g * Math.cos((pan + 1) * Math.PI / 4), gr = g * Math.sin((pan + 1) * Math.PI / 4); for (let i = 0; i < x.length && o + i < L.length; i++) { L[o + i] += x[i] * gl; R[o + i] += x[i] * gr; } };
  // hợp âm: Dsus2 – Bm7 – Gmaj7 – A(sus4) mỗi 2 ô nhịp
  const CH = [[50, 57, 62, 64], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 57, 62]];
  for (let b = 0; b < bars; b += 2) {
    const ch = CH[(b / 2) % 4], at = b * 4 * beat, d = 8 * beat + 0.6;
    for (const m of ch) { // nền: dàn dây ấm (saw lệch tông, lọc tối), lên chậm
      const pad = mul(lp(ensemble(d, midi(m), { type: 'saw', voices: 4, detune: 11, r }), 950, 0.6), envPts(d, [[0, 0], [1.2, 1], [d - 1.4, 0.85], [d, 0]]));
      put(pad, 0.05, at, (m % 5) / 4 - 0.5);
    }
    // trầm: nốt gốc
    const bass = mul(lp(osc(d, midi(ch[0] - 12), 'tri'), 500), envPts(d, [[0, 0], [0.05, 1], [d - 0.4, 0.7], [d, 0]]));
    put(bass, 0.16, at, 0);
  }
  // giai điệu đàn tranh (Karplus-Strong), ngũ cung; câu 8 ô nhịp lặp 2 lần với biến tấu
  const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81];
  const phrase = [[0, 4, 1], [1, 3, 0.5], [1.5, 2, 0.5], [2, 3, 1], [3, 5, 1], [4, 4, 1.5], [5.5, 3, 0.5], [6, 2, 2], [8, 1, 1], [9, 2, 0.5], [9.5, 3, 0.5], [10, 4, 1], [11, 6, 1], [12, 5, 1.5], [13.5, 4, 0.5], [14, 3, 2],
    [16, 5, 1], [17, 6, 0.5], [17.5, 7, 0.5], [18, 6, 1], [19, 4, 1], [20, 5, 1.5], [21.5, 4, 0.5], [22, 3, 2], [24, 2, 1], [25, 3, 0.5], [25.5, 4, 0.5], [26, 3, 1], [27, 1, 1], [28, 0, 3]];
  for (let rep = 0; rep < 2; rep++) for (const [t, k, d] of phrase) {
    const at = (rep * 32 + t) * beat, f = midi(scale[k] + (rep && k > 4 ? 0 : 0));
    const n = mul(pluck(Math.min(3.5, d * beat + 2), f, { r, bright: 0.55, decay: 0.9985, pick: 0.18 }), envPts(Math.min(3.5, d * beat + 2), [[0, 1], [3.4, 0.6], [3.5, 0]]));
    // tiếng nhấn dây (bend): thêm bản cao hơn chút ở đầu nốt cho chất đàn tranh
    put(n, 0.22, at, -0.25);
    if (rep === 1 && k >= 3) put(pluck(1.5, f * 2, { r, bright: 0.4, decay: 0.997 }), 0.05, at + beat * 0.5, 0.4); // tiếng vọng quãng tám nhẹ
  }
  // sáo trúc (dizi): sin + hơi thở, rung nhẹ — ở nửa sau, câu dài
  const flute = [[34, 7, 2], [36, 8, 1], [37, 7, 1], [38, 6, 2], [42, 5, 1], [43, 6, 1], [44, 4, 2.5], [48, 5, 2], [50, 3, 1], [51, 4, 1], [52, 2, 3], [56, 3, 1.5], [58, 1, 1.5], [60, 0, 3.5]];
  for (const [t, k, d] of flute) {
    const dur = d * beat + 0.3, f = midi(scale[k]), vib = (tt) => f * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * tt) * Math.min(1, tt / 0.4));
    const tone = mix(dur, [osc(dur, vib), 1], [osc(dur, (tt) => vib(tt) * 2), 0.12], [bp(white(dur, r), f * 2, 3), 0.1]);
    put(mul(tone, envPts(dur, [[0, 0], [0.08, 1], [dur - 0.25, 0.8], [dur, 0]])), 0.07, (t - 32) * beat + 32 * beat, 0.2);
  }
  // trống: taiko nhẹ phách 1 và 3 (từ ô 5), lắc (shaker) móc đơn nhẹ
  for (let b = 4; b < bars; b++) for (const q of [0, 2]) put(taiko(r, q ? 66 : 58, 0.8, 0.5), 0.12, (b * 4 + q) * beat, 0);
  for (let b = 8; b < bars; b++) for (let e = 0; e < 8; e++) { const g = mul(hp(white(0.05, r), 6500), envAD(0.05, 0.002, e % 2 ? 0.008 : 0.014)); put(g, e % 2 ? 0.025 : 0.04, (b * 4 + e / 2) * beat, 0.5); }
  // chuông gió mở đầu mỗi vòng 8 ô nhịp
  for (const b of [0, 8]) put(sparkle(r, 2.5, 10, 2600, 2.2), 0.4, b * 4 * beat, -0.4);
  // vang lớn (hai kênh lệch nhau cho rộng)
  const wl = reverb(L, { size: 0.9, damp: 0.3, wet: 0.35, dry: 0.85, tail: 0.1 }), wr = reverb(R, { size: 0.9, damp: 0.3, wet: 0.35, dry: 0.85, tail: 0.1, stereo: 23 });
  // lặp liền mạch: cộng phần đuôi (vượt quá len) vào đầu
  const outL = wl.slice(0, N(len)), outR = wr.slice(0, N(len));
  for (let i = N(len); i < wl.length; i++) { const k = i - N(len); if (k < outL.length) { outL[k] += wl[i]; outR[k] += wr[i]; } }
  return [dcBlock(outL), dcBlock(outR)];
}
