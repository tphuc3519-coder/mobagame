// Hỗ trợ thao tác cho tướng người chơi (sim/assist.js) — bật bằng lệnh { type: 'assist', reach } mà HUD gửi lúc vào trận và mỗi lần đổi
// Cài đặt → Điều khiển → "Tầm kích hoạt đánh thường". Bot không gửi lệnh này nên hành vi bot không đổi.
export const ASSIST = Object.freeze({
  reach: Object.freeze({ off: 0, near: 260, far: 520 }), // nút Đánh / chiêu khoá mục tiêu: địch ngoài tầm thêm chừng này (đơn vị bản đồ) thì tự đi tới
  escape: 220,      // đang đuổi mà mục tiêu chạy xa hơn tầm + reach + escape: thôi đuổi
  chaseSec: 3,      // một lần đuổi (chạm nhanh nút Đánh / bấm chiêu khoá mục tiêu) kéo dài tối đa chừng này giây
  stuckSec: 0.6,    // đuổi mà không lại gần thêm được (vướng tường / bị chặn) chừng này giây thì thôi
  bufferSec: 0.3,   // bộ đệm bấm chiêu: bấm lúc đang lướt / bị khống chế / chiêu còn hồi ≤ chừng này giây thì giữ lệnh, được là tung ngay
});
