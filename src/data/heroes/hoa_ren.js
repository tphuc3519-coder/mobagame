// Hoả Rèn — Thợ Rèn Làng Lò (04 §6.4). Đánh càng lâu càng nóng, đủ 5 Nhiệt thì nổ.
export default {
  id: 'hoa_ren', name: 'Hoả Rèn', title: 'Thợ Rèn Làng Lò', roles: ['fighter'], lanes: ['temple'], difficulty: 1, resource: 'mana', radius: 42,
  base: { maxHp: 880, maxMana: 300, atk: 68, ap: 0, armor: 30, mr: 30, atkSpeed: 0.68, moveSpeed: 320, range: 170 },
  perLevel: { maxHp: 105, maxMana: 32, atk: 6.5, armor: 3.6, mr: 2, atkSpeedPct: 0.02 },
  basicAttack: { melee: true, delay: 0.28 },
  passive: {
    id: 'lo_nung', name: 'Lò Nung',
    desc: 'Mỗi đòn đánh hoặc kỹ năng trúng tướng +1 Nhiệt (tối đa 5, giữ 4s). Mỗi Nhiệt +5% tốc đánh. Đủ 5: đòn đánh kế tiếp gây thêm 8% HP tối đa mục tiêu (phép) và xoá Nhiệt.',
    hooks: {
      onAttack(ctx) { // trước khi tính sát thương đòn đánh
        if (ctx.self.heat >= 5) { ctx.bonusMagic = ctx.target.stats.maxHp * 0.08; ctx.setHeat(ctx.self, 0); }
      },
      onHit(ctx) { ctx.addHeat(ctx.self, 1); },
    },
  },
  skills: {
    s1: { id: 'vung_bua', name: 'Vung Búa', type: 'cone', aim: 'direction', range: 320, angle: 100, cooldown: [6, 6, 6, 6, 6, 6], cost: [30, 30, 30, 30, 30, 30],
      damage: { base: 70, perLevel: 35, ad: 1.0, type: 'physical' }, effects: [{ status: 'slow', pct: 0.25, duration: 1 }] },
    s2: { id: 'xi_sat', name: 'Xỉ Sắt', type: 'selfBuff', aim: 'none', cooldown: [12, 11.5, 11, 10.5, 10, 9.5], cost: [40, 40, 40, 40, 40, 40],
      shield: { base: 80, perLevel: 40, ad: 0.5, duration: 3 }, selfEffects: [{ status: 'haste', pct: 0.2, duration: 2 }], heat: 2 },
    s3: { id: 'de_troi', name: 'Đe Trời', type: 'aoeCircle', aim: 'point', range: 600, radius: 260, delay: 0.5, untargetableDuringDelay: true, cooldown: [50, 44, 38], cost: [100, 100, 100],
      damage: { base: 200, perLevel: 120, ad: 1.4, type: 'physical' }, effects: [{ status: 'stun', duration: 1 }], heat: 5 },
  },
  ai: { combo: ['s3', 's1', 's2'], preferredRange: 170, engageHpRatio: 0.7 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'huyet_kiem', 'bua_than_ren', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'], art: 'heroes/hoa_ren/hero.art.json',
};
