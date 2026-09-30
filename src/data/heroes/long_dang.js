// Lồng Đăng — Người Giữ Đèn (04 §6.15). Khiên, hồi máu, soi sáng đồng đội.
export default {
  id: 'long_dang', name: 'Lồng Đăng', title: 'Người Giữ Đèn', roles: ['support'], lanes: ['support'], difficulty: 1, resource: 'mana', radius: 36,
  base: { maxHp: 720, maxMana: 440, atk: 48, ap: 0, armor: 24, mr: 30, atkSpeed: 0.62, moveSpeed: 315, range: 520 },
  perLevel: { maxHp: 95, maxMana: 42, atk: 3, armor: 3.2, mr: 2, atkSpeedPct: 0.012 },
  basicAttack: { projectile: { speed: 1700 }, delay: 0.3 },
  passive: {
    id: 'anh_lua_nho', name: 'Ánh Lửa Nhỏ', desc: 'Đồng minh trong bán kính 500 hồi 0.5% HP tối đa mỗi giây.',
    hooks: { onTick(ctx) { if (ctx.world.tick % 30 !== 0) return; for (const a of ctx.alliesOf(ctx.self, 500)) ctx.heal(a, a.stats.maxHp * 0.005); } },
  },
  skills: {
    s1: { id: 'den_troi', name: 'Đèn Trôi', type: 'skillshot', aim: 'direction', range: 700, width: 80, speed: 1400, cooldown: [9, 8.6, 8.2, 7.8, 7.4, 7], cost: [50, 50, 50, 50, 50, 50],
      damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'stun', duration: 1 }] },
    s2: { id: 'thap_sang', name: 'Thắp Sáng', type: 'allyTarget', aim: 'direction', range: 600, cooldown: [10, 9.6, 9.2, 8.8, 8.4, 8], cost: [70, 70, 70, 70, 70, 70],
      heal: { base: 80, perLevel: 40, ap: 0.6 }, shield: { base: 60, perLevel: 30, ap: 0.4, duration: 3 } },
    s3: { id: 'hoi_den', name: 'Hội Đèn', type: 'aoeSelf', aim: 'none', radius: 650, cooldown: [70, 62, 54], cost: [120, 120, 120],
      allyShield: { base: 200, perLevel: 100, ap: 0.8, duration: 4 }, allyEffects: [{ status: 'haste', pct: 0.25, duration: 3 }] },
  },
  ai: { combo: ['s2', 's1', 's3'], preferredRange: 520, engageHpRatio: 0.8 }, defaultSpell: 'hoi_phuc', recommendedBuild: ['giay_tinh_tam', 'giap_den_long', 'ao_choang_suong', 'truong_song', 'khien_da', 'tim_co_thu'], art: 'heroes/long_dang/hero.art.json',
};
