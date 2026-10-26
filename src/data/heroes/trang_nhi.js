import { hero } from './_make.js';
// Manh Mối: mỗi chiêu trúng tướng để 1 Manh Mối (8s, tối đa 3); đòn đánh vào tướng có Manh Mối gây thêm sát thương chuẩn.
// Chân Lý Duy Nhất: chỉ khoá được tướng có ≥ 2 Manh Mối; mỗi Manh Mối +15% sát thương; trúng mới tiêu Manh Mối.
const P = { max: 3, ttl: 8, bonus: 15, ad: 0.2, perClue: 0.15, need: 2, ultRange: 800 };
const clues = (t, e) => t.statuses.find((s) => s.id === 'manh_moi_' + e.id)?.n || 0;
export default hero({
  id: 'trang_nhi', name: 'Trạng Nhí', title: 'Thám Tử Nhí Phố Cổ', role: 'marksman', roles: ['marksman', 'support'], lanes: ['river'], difficulty: 2,
  base: { range: 500, moveSpeed: 335, maxHp: 620 }, basicAttack: { projectile: { speed: 1800, vfx: 'pebble' } },
  origin: 'Cơ chế: dùng bảo bối phá án — giày đá bóng, kim gây mê, ghép manh mối để kết án.',
  passive: { id: 'manh_moi', name: 'Manh Mối', desc: 'Mỗi kỹ năng trúng tướng đánh dấu 1 Manh Mối (8s, tối đa 3). Đòn đánh vào tướng có Manh Mối gây thêm 15 (+0.2 Công) sát thương chuẩn.', params: P,
    hooks: {
      onSkillHit(ctx) {
        const t = ctx.target, c = ctx.cast, id = 'manh_moi_' + ctx.self.id; if (!t.isHero) return;
        if (c.slot === 's3') { if (!c.flags.closed) { c.flags.closed = true; ctx.clearStack(t, id); } return; }
        if (c.flags['m' + t.id]) return; c.flags['m' + t.id] = true;
        ctx.addStack(t, id, P.max, P.ttl);
      },
      onHit(ctx) { if (ctx.cast || clues(ctx.target, ctx.self) <= 0) return; ctx.dealDamage(ctx.target, P.bonus + P.ad * ctx.self.stats.atk, 'true'); },
      onCast(ctx) { if (ctx.slot === 's3' && ctx.target) ctx.cast.dmgMult = 1 + P.perClue * clues(ctx.target, ctx.self); },
    } },
  skills: {
    s1: { id: 'da_bong_giay_luc', name: 'Đá Bóng Giày Lực', type: 'skillshot', aim: 'direction', range: 850, width: 70, speed: 2000, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [40, 40, 45, 45, 50, 50], damage: { base: 75, perLevel: 38, ad: 0.9, type: 'physical' }, effects: [{ status: 'knockback', dist: 120 }], desc: 'Đá quả bóng bằng giày tăng lực, đẩy lùi nhẹ.' },
    s2: { id: 'dong_ho_kim_me', name: 'Đồng Hồ Kim Mê', type: 'skillshot', aim: 'direction', range: 800, width: 40, speed: 2400, cooldown: [12, 11.3, 10.6, 9.9, 9.2, 8.5], cost: [50, 50, 55, 55, 60, 60], damage: { base: 30, perLevel: 15, ad: 0.3, type: 'physical' }, effects: [{ status: 'stun', duration: 1 }], desc: 'Bắn kim gây mê: choáng 1s.' },
    s3: { id: 'chan_ly_duy_nhat', name: 'Chân Lý Duy Nhất', type: 'targeted', aim: 'target', range: P.ultRange, speed: 2600, heroOnly: true, requires: 'Mục tiêu có ít nhất 2 Manh Mối',
      canTarget: (e, t) => clues(t, e) >= P.need,
      canCast: (e, w) => w.entities.some((t) => t.kind === 'hero' && t.alive && t.team !== e.team && clues(t, e) >= P.need && Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) - t.radius <= P.ultRange),
      cooldown: [65, 55, 45], cost: [100, 100, 100], damage: { base: 200, perLevel: 100, ad: 1.1, type: 'true' }, params: { perClueBonus: P.perClue }, desc: 'Bắn chứng cứ khoá vào tướng có từ 2 Manh Mối: sát thương chuẩn, mỗi Manh Mối cộng thêm 15%; trượt thì không mất Manh Mối.' },
  },
  ai: { combo: ['s2', 's1', 's3'], preferredRange: 500, engageHpRatio: 0.85 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
