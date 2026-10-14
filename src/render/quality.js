// Cài đặt đồ hoạ (02 §13.8; phản hồi 13/10 "trên điện thoại còn lag, cần tuỳ chỉnh đồ hoạ"): 3 mức đặt sẵn + tuỳ chỉnh từng mục,
// lưu trong máy (localStorage 'la.gfx'). Trong trận đổi được ngay: độ nét, khung hình, bóng đổ, ánh sáng rực, khử răng cưa, tự giảm khi
// giật, hiện FPS. Chi tiết cảnh (mật độ cây cỏ + độ chi tiết shader nền / sông) áp dụng từ trận sau (phải dựng lại cảnh).
//   scale   — tỉ lệ điểm ảnh tối đa khi vẽ (≤ devicePixelRatio): 1 / 1,5 / 2
//   fps     — giới hạn khung hình: 30 (mát máy, đều) / 60
//   shadows — bóng đổ thời gian thực của nhân vật (bóng cảnh tĩnh luôn nướng sẵn trên nền)
//   bloom   — quầng sáng đèn lồng / lõi trụ / hiệu ứng chiêu (hậu kỳ)
//   aa      — khử răng cưa nhiều mẫu (MSAA) khi vẽ cảnh: 0 / 4
//   detail  — chi tiết cảnh 'low' | 'mid' | 'high'
//   auto    — tự hạ (rồi nâng lại) khi máy không giữ nổi FPS (render/autoQuality.js)
export const PRESETS = {
  low: { scale: 1, fps: 60, shadows: false, bloom: false, aa: 0, detail: 'low' },
  mid: { scale: 1.5, fps: 60, shadows: true, bloom: true, aa: 0, detail: 'mid' },
  high: { scale: 2, fps: 60, shadows: true, bloom: true, aa: 4, detail: 'high' },
};
const OPTS = { scale: [1, 1.5, 2], fps: [30, 60], shadows: [false, true], bloom: [false, true], aa: [0, 4], detail: ['low', 'mid', 'high'] };
const KEY = 'la.gfx';
const phone = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Mức đặt sẵn trùng với cài đặt hiện tại, hoặc 'custom'. */
export const presetOf = (g) => Object.keys(PRESETS).find((k) => Object.keys(OPTS).every((o) => PRESETS[k][o] === g[o])) || 'custom';

/** Đọc cài đặt: lưu trong máy (chuyển từ 'la.quality' cũ nếu có) → mặc định (điện thoại: Vừa, máy tính: Cao). ?q= (kiểm thử) đè mức, không lưu. */
export function loadGfx(search = typeof location !== 'undefined' ? location.search : '') {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { saved = null; }
  if (!saved || typeof saved !== 'object') { let old = null; try { old = localStorage.getItem('la.quality'); } catch (_) { /* riêng tư */ } saved = { preset: PRESETS[old] ? old : phone() ? 'mid' : 'high' }; }
  const g = { ...(PRESETS[saved.preset] || PRESETS.mid), auto: saved.auto !== false, showFps: !!saved.showFps };
  for (const [k, vals] of Object.entries(OPTS)) if (vals.includes(saved[k])) g[k] = saved[k];
  const q = new URLSearchParams(search).get('q'); if (PRESETS[q]) Object.assign(g, PRESETS[q]);
  g.preset = presetOf(g);
  return g;
}
export function saveGfx(g) {
  const o = { preset: presetOf(g), auto: !!g.auto, showFps: !!g.showFps }; for (const k of Object.keys(OPTS)) o[k] = g[k];
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { /* chế độ riêng tư: chỉ áp dụng phiên này */ }
}
/** Mức chung 'low' | 'mid' | 'high' cho chỗ chỉ cần một mức (sân khấu sảnh, mật độ cảnh): theo chi tiết cảnh. */
export const pickLevel = (search) => loadGfx(search).detail;
/** (cũ) thông số theo mức — giữ cho mã chưa chuyển sang cài đặt chi tiết. */
export const LEVELS = Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, { pixelRatio: p.scale, fps: p.fps, msaa: p.aa, shadow: p.shadows ? (p.scale >= 2 ? 2048 : 1024) : 0 }]));
/** Cỡ bản đồ bóng theo độ nét (bóng chỉ của nhân vật trong khung quanh camera). */
export const shadowSize = (g) => (g.scale >= 2 ? 2048 : 1024);
