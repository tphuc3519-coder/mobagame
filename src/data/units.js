// Lính (03 §A5). Chỉ số gốc; mỗi phút: +5% HP, +4% công, tối đa +100% (tính từ phút 1).
export const MINIONS = {
  sword: { name: 'Lính Kiếm', maxHp: 450, atk: 22, armor: 10, mr: 10, range: 120, atkSpeed: 0.8, moveSpeed: 280, radius: 30, melee: true, delay: 0.3, gold: 22, xp: 32, towerPct: 0.45, structureMult: 2.5 },
  archer: { name: 'Lính Cung', maxHp: 300, atk: 32, armor: 0, mr: 10, range: 500, atkSpeed: 0.7, moveSpeed: 280, radius: 28, melee: false, delay: 0.4, projSpeed: 1800, gold: 17, xp: 26, towerPct: 0.45, structureMult: 2.5 },
  siege: { name: 'Xe Đá', maxHp: 900, atk: 50, armor: 30, mr: 30, range: 600, atkSpeed: 0.5, moveSpeed: 260, radius: 42, melee: false, delay: 0.6, projSpeed: 1500, gold: 55, xp: 65, towerPct: 0.2, structureMult: 4 },
  giant: { name: 'Lính Đèn Lớn', maxHp: 1800, atk: 90, armor: 60, mr: 60, range: 150, atkSpeed: 0.8, moveSpeed: 290, radius: 50, melee: true, delay: 0.35, gold: 40, xp: 60, towerPct: 0.45, structureMult: 2.5 },
};
export const scaleFor = (minute) => ({ hp: 1 + Math.min(1, 0.05 * Math.max(0, minute)), atk: 1 + Math.min(1, 0.04 * Math.max(0, minute)) });
