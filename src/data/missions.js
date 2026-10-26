// Nhiệm vụ (08 §6, GĐ4e): ngày — 3 nhiệm vụ bốc từ DAILY_POOL theo seed của ngày, làm mới 04:00 giờ thiết bị; tuần — 4 nhiệm vụ cố định,
// làm mới thứ Hai 04:00, xong cả 4 thì nhận thêm Rương tuần; sự kiện tích luỹ — tham gia EVENT.goal trận trong tuần → Gạo Hội.
// key: bộ đếm cộng sau mỗi trận (ui/profile.js applyResult): played, won, kills, assists, towers (trụ địch bị phá), ranked, rankedWon, mvp,
// win_<vai> (thắng với tướng có vai đó). Thưởng: gold (vàng), item (vật phẩm túi đồ, data/rewards.js), chest (rương).
export const RESET_HOUR = 4;
export const DAILY_N = 3;
export const DAILY_POOL = [
  { id: 'd_play2', name: 'Chơi 2 trận bất kỳ', key: 'played', goal: 2, gold: 80 },
  { id: 'd_play3', name: 'Chơi 3 trận bất kỳ', key: 'played', goal: 3, gold: 120, item: 'giu_sao_mvp' },
  { id: 'd_win1', name: 'Giành chiến thắng 1 trận', key: 'won', goal: 1, gold: 120 },
  { id: 'd_kill10', name: 'Hạ gục 10 tướng địch', key: 'kills', goal: 10, gold: 150 },
  { id: 'd_assist15', name: 'Hỗ trợ hạ gục 15 lần', key: 'assists', goal: 15, gold: 120 },
  { id: 'd_tower3', name: 'Phá 3 trụ địch', key: 'towers', goal: 3, gold: 150 },
  { id: 'd_ranked1', name: 'Chơi 1 trận đấu hạng', key: 'ranked', goal: 1, gold: 100 },
  { id: 'd_mvp1', name: 'Đạt MVP 1 lần', key: 'mvp', goal: 1, gold: 150, item: 'giu_sao_mvp' },
  { id: 'd_win_marksman', name: 'Thắng 1 trận với Xạ thủ', key: 'win_marksman', goal: 1, gold: 150 },
  { id: 'd_win_mage', name: 'Thắng 1 trận với Pháp sư', key: 'win_mage', goal: 1, gold: 150 },
  { id: 'd_win_tank', name: 'Thắng 1 trận với Đỡ đòn', key: 'win_tank', goal: 1, gold: 150 },
  { id: 'd_win_assassin', name: 'Thắng 1 trận với Sát thủ', key: 'win_assassin', goal: 1, gold: 150 },
  { id: 'd_win_fighter', name: 'Thắng 1 trận với Đấu sĩ', key: 'win_fighter', goal: 1, gold: 150 },
  { id: 'd_win_support', name: 'Thắng 1 trận với Trợ thủ', key: 'win_support', goal: 1, gold: 150 },
];
export const WEEKLY = [
  { id: 'w_play15', name: 'Chơi 15 trận bất kỳ', key: 'played', goal: 15, gold: 400 },
  { id: 'w_win8', name: 'Giành chiến thắng 8 trận', key: 'won', goal: 8, gold: 500 },
  { id: 'w_kill40', name: 'Hạ gục 40 tướng địch', key: 'kills', goal: 40, gold: 400, chest: 1 },
  { id: 'w_rwin5', name: 'Thắng 5 trận đấu hạng', key: 'rankedWon', goal: 5, gold: 500, item: 'bua_giu_sao' },
];
/** Rương tuần: nhận khi xong (đã nhận thưởng) cả 4 nhiệm vụ tuần. */
export const WEEK_BONUS = { name: 'Rương tuần', gold: 300, item: 'bua_giu_sao', chest: 1 };
export const EVENT = { id: 'ev_join3', name: 'Tham gia sự kiện tích luỹ', goal: 3, gao: 8 };
