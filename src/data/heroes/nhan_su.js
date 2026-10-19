import { hero } from './_make.js';
// Tầm Nhìn: tích khi thấy tướng địch (9/giây mỗi tướng trong 1600, tối đa 27/giây, dừng khi bị khống chế cứng). Đủ 100: Thấu Nhãn —
// +12% tốc chạy, né hẳn đòn trực tiếp đầu tiên từ tướng / trụ; mở Hai Nòng Liên Xạ (tung xong về 0).
const P = { maxGainPerSec: 27, perHero: 9, sight: 1600, need: 100, haste: 0.12, primeWindow: 3, perfectDmg: 80, knockdown: 0.5, oppMult: 157 / 135 };
const OPEN = new Set(['stun', 'knockup', 'root', 'slow', 'suppress', 'stasis']); // địch "đang hở": bị khống chế / làm chậm
const vis = (e) => e.flags.vision || 0;
export default hero({
  id: 'nhan_su', name: 'Nhãn Sư', title: 'Thợ Săn Thấu Nhãn', role: 'marksman', roles: ['marksman', 'assassin'], lanes: ['river'], difficulty: 3,
  base: { range: 500, moveSpeed: 330 }, basicAttack: { projectile: { speed: 2000, vfx: 'bolt' } },
  origin: 'Cơ chế: tích Tầm Nhìn bằng thông tin, đủ 100 thì thấy điểm yếu và tung loạt bắn quyết định.',
  passive: { id: 'tam_nhin', name: 'Tầm Nhìn', desc: 'Tích Tầm Nhìn khi thấy tướng địch (tối đa 27/giây, dừng khi bị khống chế cứng). Đủ 100: Thấu Nhãn — +12% tốc chạy, né đòn trực tiếp đầu tiên, mở Hai Nòng Liên Xạ.', params: P,
    gauge: (e) => ({ v: Math.floor(vis(e)), max: P.need, label: e.flags.thau ? 'Thấu Nhãn' : 'Tầm Nhìn' }),
    hooks: {
      onTick(ctx) {
        const s = ctx.self, w = ctx.world;
        if (s.flags.thau) { if (w.tick % 15 === 0) ctx.applyStatus(s, { status: 'haste', id: 'thau_nhan', pct: P.haste, duration: 0.6 }); return; }
        if (ctx.isHardCC(s)) return;
        let n = 0;
        for (const t of w.entities) if (t.kind === 'hero' && t.alive && t.team !== s.team && t.seenBy?.[s.team] && Math.hypot(t.pos.x - s.pos.x, t.pos.y - s.pos.y) <= P.sight) n++;
        if (!n) return;
        s.flags.vision = Math.min(P.need, vis(s) + Math.min(P.maxGainPerSec, P.perHero * n) / 30);
        if (vis(s) >= P.need) { s.flags.thau = true; s.flags.dodge = true; ctx.emit('proc', { kind: 'thau_nhan' }); }
      },
      onTakeDamage(ctx) { // ctx thường (damage.js)
        const s = ctx.self, src = ctx.src;
        if (!s.flags.dodge || ctx.opts?.dot || !src || src.team === s.team || !(src.isHero || src.kind === 'tower')) return;
        s.flags.dodge = false; ctx.cancel = true;
      },
      onCast(ctx) {
        const s = ctx.self, w = ctx.world;
        if (ctx.slot === 's1') s.flags.primed = w.tick + ctx.T(P.primeWindow);
        else if (ctx.slot === 's2' && w.tick <= (s.flags.primed || 0)) { // phát bắn được nạp: 80 gốc + làm ngã ngắn
          s.flags.primed = 0; ctx.cast.dmgAdd = P.perfectDmg - (ctx.skill.damage?.base || 0);
          ctx.cast.extraEffects = [{ status: 'stun', id: 'nga_ngan', duration: P.knockdown }]; ctx.emit('proc', { kind: 'phat_ban_nap' });
        } else if (ctx.slot === 's3') { s.flags.vision = 0; s.flags.thau = false; s.flags.dodge = false; }
      },
      onDealDamage(ctx) { if (ctx.opts?.slot === 's3' && ctx.target.statuses.some((x) => OPEN.has(x.kind))) ctx.amount *= P.oppMult; },
    } },
  skills: {
    s1: { id: 'chay_mu_diem', name: 'Chạy Mù Điểm', type: 'dash', aim: 'direction', range: 450, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [40, 40, 45, 45, 50, 50], effects: [{ status: 'statMod', id: 'chay_mu_diem', dmgReducePct: 0.3, slowImmune: true, duration: 1 }], params: { primesNextShot: true }, desc: 'Chạy vòng sườn: giảm 30% sát thương, miễn nhiễm làm chậm 1s; Phát Bắn Thẳng trong 3s sau đó được nạp.' },
    s2: { id: 'phat_ban_thang', name: 'Phát Bắn Thẳng', type: 'skillshot', aim: 'direction', range: 900, width: 55, speed: 2600, cooldown: [7, 6.6, 6.2, 5.8, 5.4, 5], cost: [50, 50, 55, 55, 60, 60], damage: { base: 62, perLevel: 30, ad: 0.9, type: 'physical' }, params: { perfectTimingDamage: 80, perfectTimingKnockdown: true }, desc: 'Phát bắn chính xác; được nạp (trong 3s sau Chạy Mù Điểm) thì gốc 80 và làm địch ngã 0.5s.' },
    s3: { id: 'hai_nong_lien_xa', name: 'Hai Nòng Liên Xạ', type: 'skillshot', aim: 'direction', range: 1000, width: 80, speed: 3000, requires: 'Tầm Nhìn 100', canCast: (e) => vis(e) >= P.need, cooldown: [55, 47, 40], cost: [0, 0, 0], damage: { base: 135, perLevel: 60, ad: 1.0, type: 'physical' }, params: { armorPenPct: 0.15, opportunityDamage: 157 }, desc: 'Cần Tầm Nhìn 100: loạt bắn 135 xuyên 15% giáp (×157/135 nếu địch đang bị khống chế / làm chậm).' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 500, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
