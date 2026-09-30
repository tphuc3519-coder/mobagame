// Kinh tế và kinh nghiệm (03 §A10, §B4). Số của bản 1v1; bản 5v5 sẽ thêm sau.
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
  towerGold: { team: 100, killer: 100 }, towerXp: 120, towerXpRadius: 1200,
  respawn: (level) => 4 + 1.5 * level,
  recall: { channel: 6, haste: { pct: 0.4, duration: 4 } },
  catchUpLevels: 2, catchUpXp: 0.2,
};
export const COMBAT_EXTRA = { critBase: 1.75, cdrCap: 0.4, tenacityCap: 0.8, penCap: 0.8 };
