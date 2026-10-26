// Điểm Hào Quang, bảng Top 100 ảo, Thiên Hà và Đấu Đỉnh Cao (08 §1, §4 — GĐ4c). Chỉ dùng ở tầng tiến trình / giao diện (đồng hồ thiết bị),
// không dùng trong mô phỏng trận.

/** Hào Quang: bắt đầu `start` khi vào Nguyệt Quang (bậc chỉ số `fromTier`); thắng `win + (điểm − mid)`, thua `lose + (điểm − mid)/2`, giới hạn ±cap
 *  mỗi trận; Đấu Đỉnh Cao: phần cộng khi thắng × peakMul. Đạt `title` điểm trong mùa: danh hiệu + khung ảnh mùa. */
export const HQ = { start: 1000, fromTier: 6, win: 15, lose: -15, mid: 8, cap: 25, peakMul: 1.5, title: 2000, titleName: 'Hào Quang Chói Sáng', frame: 'hao_quang' };

/** Bảng Top 100 khu (offline): 100 người chơi ảo, Hào Quang phân bố chuẩn quanh `mean` (σ = `sd`), cố định theo seed của mùa.
 *  Người ảo coi như đều ở Thái Dương; Thiên Hà = `galaxy` hạng đầu bảng. */
export const BOARD = { n: 100, mean: 2800, sd: 300, galaxy: 50, salt: 0x4a0f1e };

/** Đấu Đỉnh Cao: mở `from`:00 → `to`:00 giờ thiết bị, cần bậc chỉ số `tier` (Nguyệt Quang) trở lên; máy Ác mộng, cấm/chọn đầy đủ. */
export const PEAK = { from: 19, to: 24, tier: 6, diff: 'nightmare' };

/** Tên người chơi ảo: ghép hai vế (kiểu tên game thủ Việt), đôi khi thêm số. */
export const NAME_A = ['Mây', 'Gió', 'Sói', 'Trăng', 'Đèn', 'Rồng', 'Hổ', 'Cáo', 'Sấm', 'Lửa', 'Bão', 'Nắng', 'Sương', 'Tuyết', 'Hạc', 'Ưng', 'Mèo', 'Rùa', 'Sen', 'Trúc', 'Kiếm', 'Bóng', 'Sao', 'Lân'];
export const NAME_B = ['Bạc', 'Đêm', 'Chiều', 'Xanh', 'Đỏ', 'Núi', 'Sông', 'Biển', 'Lặng', 'Vàng', 'Tím', 'Hoang', 'Nhỏ', 'Bấc', 'Mùa Thu', 'Phố Cổ', 'Đầu Ngõ', 'Cuối Trời', 'Lang Thang', 'Ngủ Gật'];
