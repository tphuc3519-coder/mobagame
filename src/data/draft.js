// Cấm/chọn ở đấu hạng 5v5 (07 §7.3). Thời gian tính bằng giây; máy (đồng đội + đối thủ) suy nghĩ trong khoảng botThink khi người chơi
// cùng lượt, botThinkSolo khi chỉ có máy. Dưới Hải Đăng dùng thứ tự 'lite' (2 cấm mỗi bên), từ Hải Đăng dùng 'full' (đúng 07 §7.3).
export const DRAFT = {
  banSec: 20, pickSec: 30, prepSec: 15, gapSec: 0.7, botThink: [2, 6], botThinkSolo: [1.2, 3.5], lowSec: 5,
  fullFromTier: 4, // = profile.HAI_DANG
  banHistoryMin: 5, banHeroMin: 2, banMainMinRate: 0.6, banMainOdds: 0.5, // đối thủ cấm tướng tủ của người chơi (06 §6)
  banDenyWeight: 2, protectMin: 1, pickNoise: 3, reservePenalty: 2, seedSalt: 0x5eed, readyDelay: 0.6, introSec: 0.9,
};
const B = (team) => ({ act: 'ban', team, n: 1 }), P = (team, n) => ({ act: 'pick', team, n });
/** Đội 0 = Xanh (luôn chọn trước — người chơi ở đội Xanh), đội 1 = Đỏ. Lượt cấm thứ k của một đội do ghế k thực hiện. */
export const DRAFT_SEQ = {
  lite: [B(0), B(1), B(0), B(1), P(0, 1), P(1, 2), P(0, 2), P(1, 2), P(0, 2), P(1, 1)],
  full: [B(0), B(1), B(0), B(1), P(0, 1), P(1, 2), P(0, 2), P(1, 1), B(1), B(0), P(1, 1), P(0, 2), P(1, 1)],
};
export const DRAFT_NAME = { lite: 'Cơ bản · 4 cấm', full: 'Đầy đủ · 6 cấm' };
/** id tướng → trọng số cộng thêm khi máy cấm (trống = đều nhau; điền sau khi đo tỉ lệ thắng bằng tools/t_arena_batch.mjs). */
export const BAN_BIAS = {};
