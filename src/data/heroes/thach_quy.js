// Mossback — Guardian of the Mossy Temple (04 §6.1). Thợ lặn canh đền chìm: vác ống đồng nặng, mũ lặn, bình dưỡng khí sau lưng.
// Lối chơi đỡ đòn/mở giao tranh: móc neo kéo một địch về, dậm ống tạo sóng áp suất làm chậm, chiêu cuối xoáy nước hút cả nhóm địch rồi khiêu khích.
export default {
  id: 'thach_quy', name: 'Mossback', title: 'Guardian of the Mossy Temple', roles: ['tank', 'support'], lanes: ['temple', 'support'], difficulty: 1, resource: 'mana', radius: 55,
  base: { maxHp: 1000, maxMana: 320, atk: 58, ap: 0, armor: 36, mr: 32, atkSpeed: 0.62, moveSpeed: 310, range: 160 },
  perLevel: { maxHp: 130, maxMana: 35, atk: 4.5, armor: 4.2, mr: 2.2, atkSpeedPct: 0.015 },
  basicAttack: { melee: true, delay: 0.32 },
  passive: {
    id: 'mai_da', name: 'Bình Dưỡng Khí', desc: 'Sau 8s không nhận sát thương, bình dưỡng khí bơm một lớp bong bóng: khiên bằng 8% HP tối đa (không cộng dồn).',
    hooks: { onTick(ctx) { const s = ctx.self; if (ctx.world.tick - s.lastDamagedTick >= 240 && !ctx.hasShield(s, 'mai_da')) ctx.addShield(s, s.stats.maxHp * 0.08, 9999, 'mai_da'); } },
  },
  skills: {
    s1: { id: 'moc_neo', name: 'Móc Neo', type: 'skillshot', aim: 'direction', windup: 0.2, range: 850, width: 80, speed: 1900, hook: { speed: 1700, stun: 0.5 }, cooldown: [14, 13, 12, 11, 10, 9], cost: [60, 60, 60, 60, 60, 60],
      damage: { base: 60, perLevel: 30, hpPct: 0.04, type: 'physical' },
      desc: 'Phóng móc neo từ đầu ống theo một hướng. Địch đầu tiên trúng móc bị kéo về sát trước mặt Mossback và choáng thêm 0.5s.' },
    s2: { id: 'chan_dia', name: 'Dậm Áp Suất', type: 'aoeSelf', aim: 'none', windup: 0.3, radius: 300, cooldown: [8, 8, 8, 8, 8, 8], cost: [40, 40, 40, 40, 40, 40],
      damage: { base: 50, perLevel: 25, hpPct: 0.04, type: 'magic' }, effects: [{ status: 'slow', pct: 0.35, duration: 1.5 }],
      desc: 'Giơ ống đồng lên rồi dộng xuống đất, bắn ra vòng sóng nước áp suất quanh mình: gây sát thương và làm chậm 35% trong 1.5s.' },
    s3: { id: 'den_thieng', name: 'Xoáy Nước Sâu', type: 'aoeSelf', aim: 'none', windup: 0.3, radius: 420, pullIn: 90, pullSpeed: 1500, cooldown: [60, 52, 44], cost: [100, 100, 100],
      effects: [{ status: 'taunt', duration: [1.5, 1.75, 2] }], selfEffects: [{ status: 'statMod', armor: [40, 60, 80], mr: [40, 60, 80], duration: 5 }],
      desc: 'Cắm ống xuống đất mở xoáy nước: hút mọi địch trong vùng về sát quanh Mossback, khiêu khích chúng 1.5/1.75/2s (buộc phải đánh Mossback). Mossback +40/60/80 giáp và kháng phép trong 5s.' },
  },
  ai: { combo: ['s1', 's3', 's2'], preferredRange: 160, engageHpRatio: 0.8 }, defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'khien_da', 'giap_den_long', 'giap_gai', 'tim_co_thu', 'ao_choang_suong'], art: 'heroes/thach_quy/hero.art.json',
};
