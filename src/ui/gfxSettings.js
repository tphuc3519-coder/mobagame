// Các dòng cài đặt đồ hoạ dùng chung cho bảng Cài đặt ở sảnh (ui/panels.js) và bảng cài đặt trong trận (hud/settings.js).
// Bấm mức đặt sẵn → đổi mọi mục theo mức; bấm từng mục → thành "Tuỳ chỉnh" (trừ khi trùng một mức). Lưu ngay (render/quality.js).
import { PRESETS, presetOf, saveGfx } from '../render/quality.js';

const ON_OFF = [[false, 'Tắt'], [true, 'Bật']];
const ROWS = [
  ['preset', 'Chất lượng', [['low', 'Thấp'], ['mid', 'Vừa'], ['high', 'Cao']]],
  ['scale', 'Độ nét', [[1, 'Thấp'], [1.5, 'Vừa'], [2, 'Cao']]],
  ['fps', 'Khung hình', [[30, '30'], [60, '60']]],
  ['shadows', 'Bóng đổ', ON_OFF],
  ['bloom', 'Ánh sáng rực', ON_OFF],
  ['aa', 'Khử răng cưa', [[0, 'Tắt'], [4, 'Bật']]],
  ['detail', 'Chi tiết cảnh', [['low', 'Thấp'], ['mid', 'Vừa'], ['high', 'Cao']]],
  ['auto', 'Tự giảm khi giật', ON_OFF],
  ['showFps', 'Hiện FPS', ON_OFF],
];

/** HTML các dòng cài đặt; live: đang trong trận (chi tiết cảnh ghi chú "trận sau"). */
export function gfxRows(g, { live = false } = {}) {
  return ROWS.map(([k, label, opts]) => {
    const cur = k === 'preset' ? g.preset : g[k];
    const note = k === 'preset' && g.preset === 'custom' ? '<small>Tuỳ chỉnh</small>' : k === 'detail' && live ? '<small>áp dụng trận sau</small>' : '';
    return `<div class="row gfx"><span>${label}${note}</span><span class="seg">${opts.map(([v, n]) => `<button type="button" data-gk="${k}" data-gv="${v}" class="${cur === v ? 'on' : ''}">${n}</button>`).join('')}</span></div>`;
  }).join('');
}
/** Xử lý bấm vào một nút cài đặt đồ hoạ: sửa g tại chỗ, lưu, trả về khoá đã đổi (hoặc null nếu không phải nút đồ hoạ). */
export function gfxClick(e, g) {
  const b = e.target.closest?.('[data-gk]'); if (!b) return null;
  const k = b.dataset.gk, row = ROWS.find((r) => r[0] === k), opt = row?.[2].find(([v]) => String(v) === b.dataset.gv); if (!opt) return null;
  if (k === 'preset') Object.assign(g, PRESETS[opt[0]]); else g[k] = opt[0];
  g.preset = presetOf(g); saveGfx(g);
  return k;
}
