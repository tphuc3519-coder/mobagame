import { hero } from './_make.js';
// Nụ Mai: đòn đánh / Đấm Mai trúng tướng tích Nụ; đủ 4 Nụ thì đòn đánh kế tiếp bùng nổ (phép + hồi máu).
const P = { max: 4, ttl: 5, bonus: 50, ad: 0.3, healPct: 0.06 };
const nu = (e) => e.statuses.find((s) => s.id === 'nu_mai')?.n || 0;
export default hero({
  id: 'hanh_hoa', name: 'Hạnh Hoa', title: 'Thầy Lang Mai Vàng', role: 'support', roles: ['support', 'fighter'], lanes: ['support'], difficulty: 2,
  base: { range: 170, moveSpeed: 325, atk: 62 }, basicAttack: { melee: true },
  origin: 'Cơ chế: thầy thuốc cận chiến, đánh tích nội lực để hồi máu, chiêu cuối mở trạng thái bùng nổ.',
  passive: { id: 'nu_mai', name: 'Nụ Mai', desc: 'Mỗi đòn đánh trúng tướng tích 1 Nụ (tối đa 4, giữ 5s). Đủ 4 Nụ: đòn kế tiếp gây thêm 50 (+0.3 Công) phép và hồi cho Hạnh Hoa 6% HP tối đa.', params: P,
    gauge: (e) => ({ v: nu(e), max: P.max, label: 'Nụ' }),
    hooks: {
      onAttack(ctx) {
        const s = ctx.self; if (nu(s) < P.max) return;
        ctx.clearStack(s, 'nu_mai'); ctx.bonusMagic += P.bonus + P.ad * s.stats.atk; ctx.proc = true;
        ctx.heal(s, s.stats.maxHp * P.healPct); ctx.emit('proc', { kind: 'nu_mai' });
      },
      onHit(ctx) { // đòn đánh trúng tướng (không có cast) hoặc Đấm Mai: +1 Nụ; mỗi lần tung chiêu chỉ tính một lần
        if (ctx.proc) return;
        if (ctx.cast) { if (ctx.cast.slot !== 's1' || ctx.cast.flags.nu) return; ctx.cast.flags.nu = true; }
        ctx.addStack(ctx.self, 'nu_mai', P.max, P.ttl);
      },
    } },
  skills: {
    s1: { id: 'dam_mai', name: 'Đấm Mai', type: 'dash', aim: 'direction', range: 380, hitAlongPath: true, cooldown: [7, 6.6, 6.2, 5.8, 5.4, 5], cost: [40, 40, 45, 45, 50, 50], damage: { base: 80, perLevel: 40, ad: 0.9, type: 'physical' }, desc: 'Lao tới và đấm sát thương tuyến đường; tích 1 Nụ.' },
    s2: { id: 'cham_cuu', name: 'Châm Cứu', type: 'allyTarget', aim: 'direction', range: 700, cooldown: [10, 9.5, 9, 8.5, 8, 7.5], cost: [60, 65, 70, 75, 80, 85], heal: { base: 130, perLevel: 50, ap: 0.6 }, effects: [{ status: 'cleanse' }], desc: 'Hồi máu đồng minh (hoặc chính mình) và xoá khống chế.' },
    s3: { id: 'an_tram_mai', name: 'Ấn Trăm Mai', type: 'selfBuff', aim: 'none', duration: 8, cooldown: [70, 60, 50], cost: [100, 100, 100], effects: [{ status: 'statMod', id: 'an_tram_mai', atkPct: 0.3, tenacity: 0.3 }, { status: 'hot', id: 'an_tram_mai_hot', hpsPct: 0.03 }], desc: '8 giây: +30% Công, hồi 3% HP mỗi giây, kháng hiệu ứng 30%.' },
  },
  ai: { combo: ['s1', 's3', 's2'], preferredRange: 170, engageHpRatio: 0.7 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'bua_than_ren', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
