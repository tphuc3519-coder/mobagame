// Phát hiện "văng" lúc vào trận: điện thoại thiếu bộ nhớ thì trình duyệt tắt hẳn tab (không có sự kiện nào báo) rồi mở lại từ đầu — người
// chơi thấy bị đá về sảnh. Vào trận (màn tải / trận trực tuyến) ghi một dấu vào localStorage; trận chạy ổn 15 giây hoặc kết thúc bình
// thường thì xoá. Mở game mà dấu còn ⇒ lần trước bị tắt giữa lúc vào trận: tự hạ Đồ hoạ xuống Thấp (bớt bộ nhớ đồ hoạ: độ nét 1×, không
// bóng đổ / ánh sáng rực / khử răng cưa, cảnh ít chi tiết) và báo cho người chơi, kèm nút vào lại chế độ vừa chơi.
import { PRESETS, loadGfx, saveGfx } from '../render/quality.js';
import { dialog, toast } from './kit.js';
import { MODES } from './modes.js';
import { savedMatch } from './netLobby.js';

const KEY = 'la.crash', STABLE_MS = 15000;
let stableT = 0;
const write = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (_) { /* chế độ riêng tư */ } };
/** Bắt đầu vào trận: { mode, online? }. */
export function markMatch(info) { clearTimeout(stableT); write({ ...info, t: Date.now() }); }
/** Trận đã dựng xong và bắt đầu chạy: còn ổn sau 15 giây thì coi như vào trận thành công. */
export function matchStarted() { clearTimeout(stableT); stableT = setTimeout(() => write(null), STABLE_MS); }
/** Trận kết thúc / rời trận bình thường. */
export function clearMark() { clearTimeout(stableT); write(null); }

/** Gọi khi mở game (đã vào sảnh): lần trước văng lúc vào trận thì hạ đồ hoạ + báo. Trả về thông tin lần văng hoặc null. */
export function checkCrash(nav) {
  let c = null; try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { c = null; }
  write(null);
  if (!c || !(Date.now() - c.t < 6 * 3600 * 1000)) return null; // dấu cũ quá 6 giờ: bỏ qua
  const g = loadGfx(''), was = g.preset;
  const lowered = was !== 'low';
  if (lowered) { Object.assign(g, PRESETS.low); g.preset = 'low'; saveGfx(g); }
  const M = MODES[c.mode], again = M?.room ? c.mode : null;
  const msg = lowered
    ? 'Đã chuyển <b>Đồ hoạ → Thấp</b> để vào trận nhẹ hơn (đổi lại ở Cài đặt → Đồ hoạ).'
    : 'Đồ hoạ đang ở mức Thấp. Thử đóng bớt ứng dụng / tab khác rồi vào lại.';
  if (savedMatch()) { toast(lowered ? 'Trận trước bị tắt do thiếu bộ nhớ — đã hạ Đồ hoạ xuống Thấp' : 'Trận trước bị tắt do thiếu bộ nhớ', 4000); return c; } // trận trực tuyến: hộp "Vào lại" ở sảnh lo phần còn lại
  dialog({
    title: 'Trận vừa rồi bị tắt đột ngột',
    html: `<p>Trình duyệt đã tắt game lúc đang vào trận${M ? ` <b>${M.short}</b>` : ''} — thường do điện thoại thiếu bộ nhớ.</p><p>${msg}</p>`,
    buttons: [{ text: 'Đóng' }, ...(again ? [{ text: 'Vào lại', cls: 'gold', on: () => nav.go('room', { mode: again }) }] : [])],
  });
  return c;
}
