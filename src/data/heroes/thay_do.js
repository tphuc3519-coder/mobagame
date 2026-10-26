import { hero } from './_make.js';
// Điểm Học: trúng tướng +1 Điểm, Quyết Sách +2, Đứng Một Mình +6. 12 Điểm: Nghĩa II (tốc đánh, tầm, đòn đánh thêm phép, Nét Bút làm chậm).
// 30 Điểm: Nghĩa III (sát thương kỹ năng +30%, đòn đánh lan sang một địch gần mục tiêu).
const P = { tiers: [0, 12, 30], as2: 0.15, range2: 40, magic2: 25, skill3: 0.3, cleave3: 0.6, slow2: 0.3 };
const pts = (e) => e.flags.hoc || 0;
const tierOf = (e) => (pts(e) >= P.tiers[2] ? 3 : pts(e) >= P.tiers[1] ? 2 : 1);
function addPts(ctx, n) { const s = ctx.self, before = tierOf(s); s.flags.hoc = pts(s) + n; const t = tierOf(s); if (t > before) ctx.emit('proc', { kind: 'nghia', tier: t }); }
export default hero({
  id: 'thay_do', name: 'Thầy Đồ', title: 'Ông Đồ Chữ Nghĩa', role: 'fighter', roles: ['fighter', 'mage'], lanes: ['temple'], difficulty: 3,
  base: { range: 200, atk: 62, ap: 0, moveSpeed: 320 }, basicAttack: { melee: true },
  origin: 'Cơ chế: tiến hoá theo điểm Học, ba cấp Nghĩa; mỗi cấp mạnh và tầm xa hơn.',
  passive: { id: 'diem_hoc', name: 'Điểm Học', desc: 'Đòn đánh và kỹ năng trúng tướng +1 Điểm. 12 Điểm: lên Nghĩa II (+15% tốc đánh, +40 tầm, đòn đánh +25 phép). 30 Điểm: Nghĩa III (+30% sát thương kỹ năng, đòn đánh lan 60% sang một địch cạnh mục tiêu).', params: P,
    gauge: (e) => ({ v: Math.min(P.tiers[2], pts(e)), max: P.tiers[2], label: 'Nghĩa ' + ['I', 'II', 'III'][tierOf(e) - 1] }),
    hooks: {
      onCast(ctx) { if (ctx.slot === 's2') addPts(ctx, 2); else if (ctx.slot === 's3') addPts(ctx, 6); },
      onHit(ctx) {
        const c = ctx.cast;
        if (c?.slot === 's1' && tierOf(ctx.self) >= 2) ctx.applyStatus(ctx.target, { status: 'slow', id: 'net_muc', pct: P.slow2, duration: 1 }); // vệt mực
        if (c) { if (c.flags.hoc) return; c.flags.hoc = true; }
        addPts(ctx, 1);
      },
      onAttack(ctx) { const t = tierOf(ctx.self); if (t >= 2) ctx.bonusMagic += P.magic2; if (t >= 3) ctx.cleave = P.cleave3; },
      onDealDamage(ctx) { if (ctx.opts?.slot && tierOf(ctx.self) >= 3) ctx.amount *= 1 + P.skill3; },
      onTick(ctx) { if (ctx.world.tick % 15 || tierOf(ctx.self) < 2) return; ctx.applyStatus(ctx.self, { status: 'statMod', id: 'nghia', atkSpeedPct: P.as2, range: P.range2, duration: 1 }); },
    } },
  skills: {
    s1: { id: 'net_but', name: 'Nét Bút', type: 'line', aim: 'direction', range: 650, width: 110, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [40, 40, 45, 45, 50, 50], damage: { base: 70, perLevel: 35, ad: 0.5, ap: 0.5, type: 'magic' }, desc: 'Vạch một nét mực thẳng; từ Nghĩa II, tướng trúng nét mực bị chậm 30% trong 1s.' },
    s2: { id: 'quyet_sach', name: 'Quyết Sách', type: 'selfBuff', aim: 'none', duration: 5, cooldown: [16, 15, 14, 13, 12, 11], cost: [50, 50, 50, 50, 50, 50], shield: { base: 90, perLevel: 40, ap: 0.4 }, effects: [{ status: 'haste', id: 'quyet_sach', pct: 0.2, duration: 2 }], desc: 'Khiên 5s, +20% tốc chạy 2s; +2 Điểm.' },
    s3: { id: 'dung_mot_minh', name: 'Đứng Một Mình', type: 'selfBuff', aim: 'none', duration: 6, cooldown: [75, 65, 55], cost: [100, 100, 100], effects: [{ status: 'statMod', id: 'dung_mot_minh', tenacity: 0.5, dmgReducePct: 0.25, atkPct: 0.25 }], desc: '6s: kháng hiệu ứng 50%, giảm 25% sát thương nhận, +25% Công; nhận 6 Điểm.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 200, engageHpRatio: 0.7 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'bua_than_ren', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
