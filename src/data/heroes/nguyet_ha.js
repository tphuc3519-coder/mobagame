// Moonstream — Guide of the Moon River (04 §6.9). Kiểm soát vùng từ xa.
export default {
  id: 'nguyet_ha', name: 'Moonstream', title: 'Guide of the Moon River', roles: ['mage'], lanes: ['mid'], difficulty: 1, resource: 'mana', radius: 36,
  base: { maxHp: 640, maxMana: 480, atk: 50, ap: 0, armor: 20, mr: 28, atkSpeed: 0.62, moveSpeed: 315, range: 540 },
  perLevel: { maxHp: 78, maxMana: 48, atk: 3.2, armor: 2.8, mr: 1.6, atkSpeedPct: 0.012 },
  basicAttack: { projectile: { speed: 1800 }, delay: 0.3 },
  passive: {
    id: 'trieu_trang', name: 'Triều Trăng', desc: 'Mỗi kỹ năng trúng ít nhất 1 tướng hồi 3% mana tối đa.',
    hooks: { onSkillHit(ctx) { if (ctx.target.isHero && !ctx.cast.flags.tide) { ctx.cast.flags.tide = true; ctx.self.mana = Math.min(ctx.self.stats.maxMana, ctx.self.mana + ctx.self.stats.maxMana * 0.03); } } },
  },
  skills: {
    s1: { id: 'giot_bac', name: 'Giọt Bạc', type: 'skillshot', aim: 'direction', range: 800, width: 70, speed: 1600, pierce: true, cooldown: [5, 5, 5, 5, 5, 5], cost: [50, 50, 50, 50, 50, 50],
      damage: { base: 80, perLevel: 40, ap: 0.7, type: 'magic' } },
    s2: { id: 'xoay_nuoc', name: 'Xoáy Nước', type: 'zone', aim: 'point', range: 650, radius: 220, duration: 2, tickInterval: 0.5, cooldown: [11, 10.5, 10, 9.5, 9, 8.5], cost: [70, 70, 70, 70, 70, 70],
      damage: { base: 30, perLevel: 15, ap: 0.2, type: 'magic' }, effects: [{ status: 'slow', pct: 0.35, duration: 0.6 }] },
    s3: { id: 'lu_nguyet', name: 'Lũ Nguyệt', type: 'aoeCircle', aim: 'point', range: 850, radius: 320, delay: 0.8, cooldown: [55, 48, 40], cost: [120, 120, 120],
      damage: { base: 250, perLevel: 130, ap: 1.0, type: 'magic' }, effects: [{ status: 'knockup', duration: 0.8 }] },
  },
  ai: { combo: ['s2', 's3', 's1'], preferredRange: 600, engageHpRatio: 0.9 }, defaultSpell: 'chop_buoc', recommendedBuild: ['giay_phap_su', 'truong_song', 'mu_sam', 'sach_pha_gioi', 'binh_suong_dong', 'ngoc_bang'], art: 'heroes/nguyet_ha/hero.art.json',
};
