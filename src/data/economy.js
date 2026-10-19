// Kinh tế và kinh nghiệm (03 §A10, §B4). ECON là số của bản 1v1; ECON_5V5 ghi đè phần khác ở bản 5v5 (03 §A9–A10).
export const ECON = {
  startGold: 800,
  passiveGold: { perSec: 3, from: 15 },        // 1v1: không có trong tài liệu, xem DECISIONS D-Mốc4
  maxLevel: 15,
  xpNeed: (level) => 120 + 90 * (level - 1),
  laneMult: 1.3,                               // vàng và KN từ lính ×1.3 ở 1v1
  xpShareRadius: 1000,
  killGold: (streak) => 200 + 20 * Math.min(5, streak),
  killGoldFloor: 80,
  killXp: (victimLevel) => 100 + 30 * victimLevel,
  assistGoldShare: 0.5, assistGoldMax: 150,    // người hỗ trợ chia nhau 50% vàng mạng hạ, tối đa 150 mỗi người (03 §A10)
  towerGold: { team: 100, killer: 100 }, towerXp: 120, towerXpRadius: 1200,
  respawn: (level) => 4 + 1.5 * level,         // (level, giây trận) — bản 1v1 không dùng tham số thứ hai
  recall: { channel: 6, haste: { pct: 0.4, duration: 4 } },
  catchUpLevels: 2, catchUpXp: 0.2,
};
/** Bản 5v5 (03 §A9–A10): vàng thụ động 4/s từ 0:20; hồi sinh 6 + 2.5×cấp (+5s sau phút 15); KN mạng hạ chia cho người hạ + người hỗ trợ
 *  trong 1200; KN bắt kịp khi thấp hơn cấp TRUNG BÌNH trận từ 2 cấp. Vàng khởi đầu giữ 800 (xem DECISIONS: đồ khởi đầu xạ thủ giá 650). */
export const ECON_5V5 = {
  passiveGold: { perSec: 4, from: 20 },
  respawn: (level, sec) => 6 + 2.5 * level + (sec >= 900 ? 5 : 0),
  killXpShareRadius: 1200,
  catchUpVsAverage: true,
};
/** Bảng kinh tế đang dùng cho trận (1v1 hoặc 5v5). */
export const econOf = (map) => (map && map.id !== 'duel1v1' && map.lanes?.length > 1 ? { ...ECON, ...ECON_5V5 } : ECON);
export const COMBAT_EXTRA = { critBase: 1.75, cdrCap: 0.4, tenacityCap: 0.8, penCap: 0.8 };
