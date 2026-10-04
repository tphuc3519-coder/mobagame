// Quái rừng và mục tiêu lớn (03 §A7). Chỉ số gốc ở phút 0; mỗi phút +6% máu, +5% công (tối đa +150%).
// members: vị trí từng con so với tâm trại (đơn vị thế giới). reward: vàng/KN cho người kết liễu (chia KN cho đồng đội gần).
// buff: bùa cho người kết liễu (killer) hoặc cả đội (team). Tên và tạo hình riêng của Lantern Arena.
export const MONSTERS = {
  soi_da: { name: 'Sói Đá', camp: 'Bầy Sói Đá', members: [{ kind: 'alpha', x: 0, y: 0 }, { kind: 'pup', x: -170, y: 120 }, { kind: 'pup', x: 170, y: 120 }],
    stats: { alpha: { maxHp: 1500, atk: 55, armor: 25, mr: 15, radius: 60, range: 160 }, pup: { maxHp: 650, atk: 28, armor: 10, mr: 10, radius: 42, range: 140 } },
    atkSpeed: 0.9, moveSpeed: 330, gold: { alpha: 55, pup: 18 }, xp: { alpha: 80, pup: 30 }, first: 30, respawn: 70 },
  coc_reu: { name: 'Cóc Rêu', camp: 'Cóc Rêu', members: [{ kind: 'toad', x: 0, y: 0 }],
    stats: { toad: { maxHp: 2200, atk: 70, armor: 30, mr: 20, radius: 80, range: 200 } }, atkSpeed: 0.7, moveSpeed: 280, gold: { toad: 80 }, xp: { toad: 110 }, first: 30, respawn: 70 },
  linh_thuy: { name: 'Linh Thuỷ', camp: 'Linh Thuỷ (bùa xanh)', members: [{ kind: 'spirit', x: 0, y: 0 }],
    stats: { spirit: { maxHp: 3200, atk: 80, armor: 30, mr: 40, radius: 90, range: 380 } }, atkSpeed: 0.75, moveSpeed: 300, ranged: 1500, gold: { spirit: 100 }, xp: { spirit: 150 }, first: 30, respawn: 90,
    buff: { to: 'killer', id: 'an_thuy', name: 'Ấn Thuỷ', duration: 90, mod: { cdr: 0.1, regenMana: 30 }, desc: '-10% hồi chiêu, hồi năng lượng nhanh' } },
  hoa_nham: { name: 'Hoả Nham', camp: 'Hoả Nham (bùa đỏ)', members: [{ kind: 'golem', x: 0, y: 0 }],
    stats: { golem: { maxHp: 3600, atk: 95, armor: 40, mr: 25, radius: 100, range: 200 } }, atkSpeed: 0.7, moveSpeed: 290, gold: { golem: 100 }, xp: { golem: 150 }, first: 30, respawn: 90,
    buff: { to: 'killer', id: 'an_hoa', name: 'Ấn Hoả', duration: 90, mod: {}, burn: { dps: 25, perLevel: 3, duration: 2, slow: 0.2 }, desc: 'Đòn đánh thiêu đốt và làm chậm 20%' } },
  long_ngu: { name: 'Long Ngư', camp: 'Long Ngư', boss: true, members: [{ kind: 'carp', x: 0, y: 0 }],
    stats: { carp: { maxHp: 9000, atk: 160, armor: 60, mr: 60, radius: 170, range: 420 } }, atkSpeed: 0.6, moveSpeed: 0, ranged: 1400, splash: 260, gold: { carp: 100 }, xp: { carp: 250 }, first: 120, respawn: 180,
    teamReward: { gold: 150, xp: 220 }, desc: 'Cá chép vàng sắp hoá rồng. Hạ được: cả đội +150 vàng, +220 KN.' },
  ho_loi: { name: 'Hổ Lôi', camp: 'Hổ Lôi', boss: true, members: [{ kind: 'tiger', x: 0, y: 0 }],
    stats: { tiger: { maxHp: 16000, atk: 240, armor: 90, mr: 90, radius: 190, range: 280 } }, atkSpeed: 0.6, moveSpeed: 0, splash: 320, gold: { tiger: 150 }, xp: { tiger: 300 }, first: 480, respawn: 240,
    teamReward: { gold: 100, xp: 150 },
    buff: { to: 'team', id: 'uy_ho', name: 'Uy Hổ', duration: 120, mod: { atk: 30, ap: 50, dmgReducePct: 0.08 }, desc: '+30 công, +50 phép, giảm 8% sát thương nhận' },
    desc: 'Thần hổ mang sấm. Hạ được: cả đội nhận Uy Hổ 120s.' },
  // —— hai mục tiêu cuối trận (phút 15) trên hai mũi đá chìa ra vực ở hai đầu sông ——
  than_dieu: { name: 'Thần Điểu', camp: 'Tổ Thần Điểu', boss: true, members: [{ kind: 'bird', x: 0, y: 0 }],
    stats: { bird: { maxHp: 26000, atk: 320, armor: 110, mr: 110, radius: 180, range: 520 } }, atkSpeed: 0.55, moveSpeed: 0, ranged: 1600, splash: 340, gold: { bird: 200 }, xp: { bird: 400 }, first: 900, respawn: 300,
    teamReward: { gold: 200, xp: 300 },
    buff: { to: 'team', id: 'loi_vu', name: 'Lôi Vũ', duration: 150, mod: { atkSpeedPct: 0.2, cdr: 0.1, armor: 20, mr: 20 }, desc: '+20% tốc đánh, -10% hồi chiêu, +20 giáp/KP' },
    desc: 'Chim thần làm tổ ngoài mép vực, xuất hiện phút 15. Hạ được: cả đội nhận Lôi Vũ 150s.' },
  ta_than: { name: 'Tà Thần', camp: 'Hang Tà Thần', boss: true, members: [{ kind: 'demon', x: 0, y: 0 }],
    stats: { demon: { maxHp: 32000, atk: 400, armor: 120, mr: 120, radius: 200, range: 300 } }, atkSpeed: 0.55, moveSpeed: 0, splash: 380, gold: { demon: 250 }, xp: { demon: 450 }, first: 900, respawn: 300,
    teamReward: { gold: 250, xp: 300 },
    buff: { to: 'team', id: 'ta_luc', name: 'Tà Lực', duration: 150, mod: { atk: 60, ap: 90, dmgReducePct: 0.12 }, desc: '+60 công, +90 phép, giảm 12% sát thương nhận' },
    desc: 'Tà thần trong hang tím ngoài mép vực, xuất hiện phút 15. Hạ được: cả đội nhận Tà Lực 150s.' },
};
export const monsterScale = (minute) => ({ hp: 1 + Math.min(1.5, 0.06 * Math.max(0, minute)), atk: 1 + Math.min(1.5, 0.05 * Math.max(0, minute)) });
export const LEASH = 900;      // đuổi quá xa trại thì quay về
export const RESET_HEAL = 0.25; // hồi 25% máu/giây khi quay về trại
