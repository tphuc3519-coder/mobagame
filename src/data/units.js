// Lính (03 §A5). Chỉ số gốc (đầu trận yếu hơn để tướng đi đường thoải mái); mỗi phút: +7% HP, +7% công, tối đa +125% HP / +140% công.
export const MINIONS = {
  sword: { name: 'Lính Kiếm', maxHp: 400, atk: 15, armor: 10, mr: 10, range: 120, atkSpeed: 0.8, moveSpeed: 330, radius: 36, melee: true, delay: 0.3, gold: 22, xp: 32, towerPct: 0.45, structureMult: 2.5 },
  archer: { name: 'Lính Cung', maxHp: 260, atk: 22, armor: 0, mr: 10, range: 500, atkSpeed: 0.7, moveSpeed: 330, radius: 34, melee: false, delay: 0.4, projSpeed: 1800, gold: 17, xp: 26, towerPct: 0.45, structureMult: 2.5 },
  siege: { name: 'Xe Đá', maxHp: 800, atk: 38, armor: 30, mr: 30, range: 600, atkSpeed: 0.5, moveSpeed: 305, radius: 50, melee: false, delay: 0.6, projSpeed: 1500, gold: 55, xp: 65, towerPct: 0.2, structureMult: 4 },
  // Người Đá Đèn: chỉ sinh khi hạ Tà Thần (data/jungle.js pushers) — trâu, phá trụ mạnh, trụ chỉ bắn 8% máu tối đa mỗi phát
  golem: { name: 'Người Đá Đèn', maxHp: 5200, atk: 180, armor: 110, mr: 110, range: 190, atkSpeed: 0.6, moveSpeed: 330, radius: 75, melee: true, delay: 0.4, gold: 120, xp: 120, towerPct: 0.08, structureMult: 3 },
  giant: { name: 'Lính Đèn Lớn', maxHp: 1600, atk: 70, armor: 60, mr: 60, range: 150, atkSpeed: 0.8, moveSpeed: 340, radius: 58, melee: true, delay: 0.35, gold: 40, xp: 60, towerPct: 0.2, structureMult: 2.5 }, // siêu lính: trụ bắn 20% máu mỗi phát (như Xe Đá) — đủ trâu để đẩy trụ
};
export const scaleFor = (minute) => ({ hp: 1 + Math.min(1.25, 0.07 * Math.max(0, minute)), atk: 1 + Math.min(1.4, 0.07 * Math.max(0, minute)) });
