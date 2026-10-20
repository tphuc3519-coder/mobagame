// Vị trí trong đội 5v5 (chọn ở phòng chờ, hiện ở chọn tướng / cấm chọn / đội hình). Id trùng 5 ô của sim/lineup.js (SLOTS) — mô phỏng
// chỉ nhận vị trí như dữ liệu dựng trận; 'fill' (Tuỳ ý) chỉ có ở giao diện: lúc ghép trận nhận ngẫu nhiên một vị trí.
export const ROLE_IDS = ['temple', 'mid', 'river', 'jungle', 'support'];
export const ROLE_FILL = 'fill';
export const ROLE_INFO = {
  temple: { name: 'Đường Đền', short: 'Đền', hint: 'Đấu sĩ, đỡ đòn — đi đường một mình' },
  mid: { name: 'Đường Giữa', short: 'Giữa', hint: 'Pháp sư — dọn lính nhanh, hỗ trợ hai bên' },
  river: { name: 'Đường Sông', short: 'Sông', hint: 'Xạ thủ — đi cùng Trợ thủ' },
  jungle: { name: 'Đi rừng', short: 'Rừng', hint: 'Dọn trại, giành mục tiêu lớn — mang Trừng Trị' },
  support: { name: 'Trợ thủ', short: 'Trợ thủ', hint: 'Kèm xạ thủ, mở giao tranh' },
  fill: { name: 'Tuỳ ý', short: 'Tuỳ ý', hint: 'Nhận vị trí còn trống' },
};
/** Lớp tướng (vai chính, HEROES[id].roles[0]) hợp với vị trí khi tướng không ghi vị trí đó trong `lanes` — "hợp" (độ hợp 1). */
export const ROLE_CLASS_FIT = { temple: ['fighter', 'tank'], mid: ['mage'], river: ['marksman'], jungle: ['assassin', 'fighter'], support: ['support', 'tank'] };
/** Lúc ghép trận: tỉ lệ nhận vị trí chính (còn lại nhận vị trí phụ, nếu có). */
export const ROLE_PRI_ODDS = 0.85;
/** Phép bổ trợ mang sẵn khi nhận vị trí (đi rừng: Trừng Trị — cần để mua Nanh Thú Rừng). */
export const ROLE_SPELL = { jungle: 'thu_hoach' };
/** Điểm chọn tướng của máy theo độ hợp (0 không hợp · 1 hợp lớp · 2 đúng vị trí), cộng nhiễu DRAFT.pickNoise. */
export const FIT_WEIGHT = [0, 5, 10];
