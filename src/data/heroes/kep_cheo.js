import { hero } from './_make.js';
// Hào Quang Sân Khấu: tướng địch quanh mình có tỉ lệ đánh trượt; đòn đánh có tỉ lệ choáng. Đổi Vai: tráo phần trăm máu khi sắp chết.
const P = { radius: 400, miss: 0.1, stunChance: 0.25, stun: 0.3, as: 0.08, setBothHp: 0.2, missSelfHp: 0.1, ultBelow: 0.3 };
export default hero({
  id: 'kep_cheo', name: 'Captain Ginyu', title: 'Ông Kép Múa Hài', role: 'fighter', roles: ['fighter'], lanes: ['temple'], difficulty: 3,
  base: { range: 175, atk: 68 }, basicAttack: { melee: true },
  origin: 'Cơ chế: đánh có tỉ lệ choáng, sáu tia sáng đẩy lùi, chiêu cuối đổi vai (hoán đổi máu) khi sắp chết.',
  passive: { id: 'hao_quang_san_khau', name: 'Hào Quang Sân Khấu', desc: 'Tướng địch trong 400 quanh Ginyu có 10% đòn đánh trượt; bản thân +8% tốc đánh khi có tướng địch trong vùng. Đòn đánh 25% kèm choáng 0.3s.', params: P,
    hooks: {
      onTick(ctx) {
        const w = ctx.world, s = ctx.self; if (w.tick % 15) return;
        let near = false;
        for (const t of ctx.enemiesNear(s.pos, P.radius)) { if (!t.isHero) continue; near = true; ctx.applyStatus(t, { status: 'blind', id: 'hao_quang', miss: P.miss, duration: 0.6 }); }
        if (near) ctx.applyStatus(s, { status: 'statMod', id: 'hao_quang_as', atkSpeedPct: P.as, duration: 0.6 });
      },
      onAttack(ctx) { if (ctx.world.rng.next() < P.stunChance) ctx.hitEffects = [{ status: 'stun', id: 'hao_quang_stun', duration: P.stun }]; },
      onSkillHit(ctx) { // Đổi Vai trúng: hai bên tráo phần trăm máu, rồi cùng về ít nhất 20%
        if (ctx.cast.slot !== 's3' || !ctx.target.isHero || ctx.cast.flags.swap) return; ctx.cast.flags.swap = true;
        const a = ctx.self, b = ctx.target, pa = a.hp / a.stats.maxHp, pb = b.hp / b.stats.maxHp;
        a.hp = Math.max(P.setBothHp, pb) * a.stats.maxHp; b.hp = Math.max(P.setBothHp, pa) * b.stats.maxHp;
        ctx.emit('swapHp', { target: b.id, mine: pa, theirs: pb });
      },
      onSkillMiss(ctx) { if (ctx.cast.slot !== 's3') return; const s = ctx.self; s.hp = Math.max(1, Math.min(s.hp, s.stats.maxHp * P.missSelfHp)); ctx.emit('proc', { kind: 'doi_vai_truot' }); },
    } },
  skills: {
    s1: { id: 'quyen_cheo', name: 'Quyền Chèo', type: 'cone', aim: 'direction', range: 300, angle: 110, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [30, 30, 35, 35, 40, 40], damage: { base: 65, perLevel: 35, ad: 0.9, type: 'physical' }, desc: 'Ba đòn quyền liên tiếp trước mặt.' },
    s2: { id: 'sau_tia_sang', name: 'Sáu Tia Sáng', type: 'cone', aim: 'direction', range: 700, angle: 60, beams: 6, cooldown: [11, 10.5, 10, 9.5, 9, 8.5], cost: [60, 60, 65, 65, 70, 70], damage: { base: 25, perLevel: 12, ad: 0.3, type: 'magic' }, effects: [{ status: 'knockback', dist: 140 }], params: { exhaustIfHits: 3, exhaustDuration: 1.5, exhaustSlow: 0.6 }, desc: 'Bắn xối 6 tia toả trong quạt, mỗi tia trúng gây sát thương, đẩy lùi; trúng đủ 3 tia thì địch kiệt sức (chậm 60% trong 1.5s).' },
    s3: { id: 'doi_vai', name: 'Đổi Vai', type: 'skillshot', aim: 'direction', range: 750, width: 80, speed: 2200, heroOnly: true, cooldown: [90, 80, 70], cost: [80, 80, 80], canCast: (e) => e.hp / e.stats.maxHp < P.ultBelow, params: { swapHpPct: true, setBothHp: P.setBothHp, missSelfHp: P.missSelfHp, condition: 'Chỉ dùng được khi HP dưới 30%' }, desc: 'Khi HP dưới 30%: bắn tia đổi vai. Trúng tướng thì hai bên đổi phần trăm máu rồi cùng về ít nhất 20%; trượt thì Ginyu còn 10% máu.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 200, engageHpRatio: 0.7, ultRule: 'hpBelow0.3' },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'bua_than_ren', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
