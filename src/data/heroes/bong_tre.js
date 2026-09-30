// Bóng Tre — Sát Thủ Rừng Tre (04 §6.7). Tàng hình và kết liễu.
export default {
  id: 'bong_tre', name: 'Bóng Tre', title: 'Sát Thủ Rừng Tre', roles: ['assassin'], lanes: ['jungle'], difficulty: 2, resource: 'mana', radius: 36,
  base: { maxHp: 700, maxMana: 260, atk: 74, ap: 0, armor: 24, mr: 26, atkSpeed: 0.78, moveSpeed: 345, range: 160 },
  perLevel: { maxHp: 85, maxMana: 25, atk: 7.5, armor: 3, mr: 1.6, atkSpeedPct: 0.028 },
  basicAttack: { melee: true, delay: 0.2 },
  passive: {
    id: 'mui_tre', name: 'Mũi Tre', desc: 'Gây thêm 15% sát thương lên tướng dưới 40% HP.',
    hooks: { onDealDamage(ctx) { const t = ctx.target; if (t.isHero && t.hp < t.stats.maxHp * 0.4) ctx.amount *= 1.15; } },
  },
  skills: {
    s1: { id: 'la_bay', name: 'Lá Bay', type: 'skillshot', aim: 'direction', range: 700, width: 60, speed: 2000, cooldown: [5, 5, 5, 5, 5, 5], cost: [30, 30, 30, 30, 30, 30],
      damage: { base: 60, perLevel: 30, ad: 0.9, type: 'physical' }, onHitHero: 'cutS2' },
    s2: { id: 'luot_dot', name: 'Lướt Đốt', type: 'dash', aim: 'direction', range: 400, speed: 2400, hitAlongPath: true, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [40, 40, 40, 40, 40, 40],
      damage: { base: 50, perLevel: 25, ad: 0.6, type: 'physical' } },
    s3: { id: 'rung_nuot_bong', name: 'Rừng Nuốt Bóng', type: 'selfBuff', aim: 'none', cooldown: [55, 48, 40], cost: [80, 80, 80],
      selfEffects: [{ status: 'stealth', duration: 2.5 }, { status: 'haste', pct: 0.3, duration: 2.5 }],
      ambush: { base: 150, perLevel: 90, adBonus: 1.2, slow: 0.4, slowDuration: 1 } },
  },
  ai: { combo: ['s3', 's1', 's2'], preferredRange: 160, engageHpRatio: 0.8 }, defaultSpell: 'thu_hoach', art: 'heroes/bong_tre/hero.art.json',
};
