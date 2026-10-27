import { hero } from './_make.js';
// Thế Thuỷ: mỗi lần tung chiêu đổi sang thế kế tiếp — Sông (+15% tốc chạy 3s) → Thác (đòn kế +20% sát thương) → Xoáy (đòn kế làm chậm).
// Kỹ năng trúng tướng +1 Ấn (tối đa 5); đủ 5 Ấn mới tung được Nhật Vũ (lướt rồi chém 13 nhát tại chỗ).
const P = { stances: ['song', 'thac', 'xoay'], sealMax: 5, songHaste: 0.15, thacBonus: 0.2, xoaySlow: 0.2 };
const seals = (e) => e.flags.seals || 0;
export default hero({
  id: 'kiem_thuy', name: 'Tanjiro Kamado', title: 'Kiếm Sĩ Sông Xanh', role: 'fighter', roles: ['fighter', 'assassin'], lanes: ['temple', 'jungle'], difficulty: 3,
  base: { range: 175 }, basicAttack: { melee: true },
  origin: 'Cơ chế: đổi thế kiếm theo dòng nước; tích Ấn rồi tung chuỗi mười ba nhát.',
  passive: { id: 'the_thuy', name: 'Thế Thuỷ', desc: 'Mỗi kỹ năng chuyển sang thế kế tiếp: Sông (+15% tốc chạy 3s), Thác (+20% sát thương đòn kế), Xoáy (đòn kế làm chậm 20% 1s). Kỹ năng trúng tướng +1 Ấn (tối đa 5).', params: P,
    gauge: (e) => ({ v: seals(e), max: P.sealMax, label: 'Ấn' }),
    hooks: {
      onCast(ctx) {
        const s = ctx.self; s.flags.stance = ((s.flags.stance ?? -1) + 1) % 3; const st = P.stances[s.flags.stance];
        if (st === 'song') ctx.applyStatus(s, { status: 'haste', id: 'the_song', pct: P.songHaste, duration: 3 });
        else if (st === 'thac') s.flags.thac = true; else s.flags.xoay = true;
        if (ctx.slot === 's3') s.flags.seals = 0;
        ctx.emit('proc', { kind: 'the_thuy', stance: st });
      },
      onDealDamage(ctx) { const s = ctx.self; if (s.flags.thac && !ctx.opts?.dot) { s.flags.thac = false; ctx.amount *= 1 + P.thacBonus; } },
      onHit(ctx) {
        const s = ctx.self, c = ctx.cast;
        if (s.flags.xoay) { s.flags.xoay = false; ctx.applyStatus(ctx.target, { status: 'slow', id: 'the_xoay', pct: P.xoaySlow, duration: 1 }); }
        if (c && c.slot !== 's3' && !c.flags.seal) { c.flags.seal = true; s.flags.seals = Math.min(P.sealMax, seals(s) + 1); }
      },
    } },
  skills: {
    s1: { id: 'nhat_song', name: 'Nhát Sông', type: 'line', aim: 'direction', range: 500, width: 130, ticks: 2, tickInterval: 0.2, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [30, 30, 35, 35, 40, 40], damage: { base: 45, perLevel: 25, ad: 0.6, type: 'physical' }, desc: 'Hai nhát chém liên tiếp theo hướng.' },
    s2: { id: 'banh_xe_nuoc', name: 'Bánh Xe Nước', type: 'aoeSelf', aim: 'none', radius: 300, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [50, 50, 55, 55, 60, 60], damage: { base: 80, perLevel: 40, ad: 0.8, type: 'physical' }, effects: [{ status: 'knockback', dist: 100 }], desc: 'Xoay kiếm quanh mình, hất lùi nhẹ.' },
    s3: { id: 'nhat_vu', name: 'Nhật Vũ Mười Ba Thức', type: 'dash', aim: 'direction', range: 700, speed: 2400, requires: 'Ấn đủ 5', canCast: (e) => seals(e) >= P.sealMax, cooldown: [60, 50, 40], cost: [0, 0, 0], damage: { base: 18, perLevel: 12, ad: 0.18, type: 'physical' }, unstoppable: 0.35, params: { slashes: 13, slashInterval: 0.1, slashRadius: 280, finisherBonus: 0.5 }, desc: 'Cần đủ 5 Ấn: lướt tới (không thể bị cản khi lướt, dừng ở tướng đầu tiên) rồi chém 13 nhát quanh mình, không thể bị chọn trong lúc chém; nhát cuối gây thêm 50%.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 180, engageHpRatio: 0.75 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'kiem_nhanh', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
