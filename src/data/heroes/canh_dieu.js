// Cánh Diều — Cung Thủ Theo Gió (04 §6.12). Đòn thứ tư bắn đôi, lướt thả diều.
export default {
  id: 'canh_dieu', name: 'Cánh Diều', title: 'Cung Thủ Theo Gió', roles: ['marksman'], lanes: ['river'], difficulty: 1, resource: 'mana', radius: 36,
  base: { maxHp: 620, maxMana: 300, atk: 64, ap: 0, armor: 20, mr: 26, atkSpeed: 0.72, moveSpeed: 325, range: 600 },
  perLevel: { maxHp: 82, maxMana: 30, atk: 6, armor: 2.8, mr: 1.5, atkSpeedPct: 0.03 },
  basicAttack: { projectile: { speed: 2200 }, delay: 0.36 },
  passive: {
    id: 'gio_thuan', name: 'Gió Thuận', desc: 'Mỗi đòn đánh thứ 4 bắn thêm 1 mũi tên gây 50% sát thương.',
    hooks: { onAttack(ctx) { const s = ctx.self; s.atkCount = (s.atkCount || 0) + 1; if (s.atkCount % 4 === 0) ctx.extraArrow = 0.5; } },
  },
  skills: {
    s1: { id: 'mui_ten_gio', name: 'Mũi Tên Gió', type: 'skillshot', aim: 'direction', range: 950, width: 70, speed: 2400, cooldown: [7, 6.6, 6.2, 5.8, 5.4, 5], cost: [40, 40, 40, 40, 40, 40],
      damage: { base: 70, perLevel: 35, ad: 1.1, type: 'physical' }, effects: [{ status: 'slow', pct: 0.25, duration: 1.5 }] },
    s2: { id: 'lon_dieu', name: 'Lộn Diều', type: 'dash', aim: 'direction', range: 300, speed: 2200, cooldown: [10, 9.5, 9, 8.5, 8, 7.5], cost: [30, 30, 30, 30, 30, 30],
      selfEffects: [{ status: 'statMod', id: 'lon_dieu', atkSpeedPct: 0.5, duration: 3 }] , nextAttackRange: 100 },
    s3: { id: 'mua_ten', name: 'Mưa Tên', type: 'zone', aim: 'point', range: 950, radius: 300, duration: 2.5, tickInterval: 0.25, cooldown: [50, 44, 38], cost: [100, 100, 100],
      damage: { base: 40, perLevel: 20, ad: 0.35, type: 'physical' }, effects: [{ status: 'slow', pct: 0.2, duration: 0.5 }] },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 550, engageHpRatio: 0.9 }, defaultSpell: 'chop_buoc', recommendedBuild: ['giay_toc_chien', 'cung_gio', 'dao_trang_khuyet', 'huyet_kiem', 'bua_than_ren', 'mat_na_hoi_sinh'], art: 'heroes/canh_dieu/hero.art.json',
};
