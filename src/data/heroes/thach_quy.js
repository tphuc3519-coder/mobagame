// Thạch Quy — Người Gác Đền Rêu Phủ (04 §6.1). Khiên tự hồi và khiêu khích.
export default {
  id: 'thach_quy', name: 'Thạch Quy', title: 'Người Gác Đền Rêu Phủ', roles: ['tank', 'support'], lanes: ['temple', 'support'], difficulty: 1, resource: 'mana', radius: 55,
  base: { maxHp: 1000, maxMana: 320, atk: 58, ap: 0, armor: 36, mr: 32, atkSpeed: 0.62, moveSpeed: 310, range: 160 },
  perLevel: { maxHp: 130, maxMana: 35, atk: 4.5, armor: 4.2, mr: 2.2, atkSpeedPct: 0.015 },
  basicAttack: { melee: true, delay: 0.32 },
  passive: {
    id: 'mai_da', name: 'Mai Đá', desc: 'Sau 8s không nhận sát thương, nhận khiên 8% HP tối đa (không cộng dồn).',
    hooks: { onTick(ctx) { const s = ctx.self; if (ctx.world.tick - s.lastDamagedTick >= 240 && !ctx.hasShield(s, 'mai_da')) ctx.addShield(s, s.stats.maxHp * 0.08, 9999, 'mai_da'); } },
  },
  skills: {
    s1: { id: 'huc_nui', name: 'Húc Núi', type: 'dash', aim: 'direction', range: 450, speed: 1800, stopOnHero: true, cooldown: [10, 9.5, 9, 8.5, 8, 7.5], cost: [50, 50, 50, 50, 50, 50],
      damage: { base: 60, perLevel: 30, hpPct: 0.06, type: 'physical' }, effects: [{ status: 'knockup', duration: 0.6 }] },
    s2: { id: 'chan_dia', name: 'Chấn Địa', type: 'aoeSelf', aim: 'none', radius: 280, cooldown: [8, 8, 8, 8, 8, 8], cost: [40, 40, 40, 40, 40, 40],
      damage: { base: 50, perLevel: 25, hpPct: 0.04, type: 'magic' }, effects: [{ status: 'slow', pct: 0.3, duration: 1.5 }] },
    s3: { id: 'den_thieng', name: 'Đền Thiêng', type: 'aoeSelf', aim: 'none', radius: 350, cooldown: [60, 52, 44], cost: [100, 100, 100],
      effects: [{ status: 'taunt', duration: [1.5, 1.75, 2] }], selfEffects: [{ status: 'statMod', armor: [40, 60, 80], mr: [40, 60, 80], duration: 5 }] },
  },
  ai: { combo: ['s1', 's3', 's2'], preferredRange: 160, engageHpRatio: 0.8 }, defaultSpell: 'chop_buoc', art: 'heroes/thach_quy/hero.art.json',
};
