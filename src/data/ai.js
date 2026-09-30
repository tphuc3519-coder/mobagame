// Độ khó bot (06 §4.8). react: giây giữa hai lần suy nghĩ; aimErr: độ lệch ngắm; lastHit: tỉ lệ chọn đúng lính kết liễu.
export const DIFFICULTY = {
  easy:      { name: 'Dễ', react: 0.6, aimErr: 20, dodge: 0.1, lastHit: 0.45, trade: 0.25, goldMult: 0.9 },
  normal:    { name: 'Thường', react: 0.35, aimErr: 10, dodge: 0.35, lastHit: 0.7, trade: 0.5, goldMult: 1 },
  hard:      { name: 'Khó', react: 0.2, aimErr: 4, dodge: 0.6, lastHit: 0.88, trade: 0.75, goldMult: 1 },
  nightmare: { name: 'Ác mộng', react: 0.12, aimErr: 2, dodge: 0.8, lastHit: 0.95, trade: 0.9, goldMult: 1.1 },
};
export const BOT = {
  retreatHp: 0.3, recallHp: 0.45, recallMana: 0.2, safeRange: 1400, fightRange: 900,
  escapeHp: 0.15, itemHp: 0.25, kiteDist: 320, towerMargin: 60, holdBack: 0.55,
};
