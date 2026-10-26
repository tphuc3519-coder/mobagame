import { hero } from './_make.js';
// Xoáy Nhỏ: mỗi lần trúng tướng +1 Hứng; đủ 20 thì đòn đánh kế tiếp thành Xoáy Nhỏ (phép + hất lùi).
const P = { need: 20, dmg: 120, ad: 0.6, knock: 120 };
export default hero({
  id: 'tieu_anh', name: 'Tiểu Ảnh', title: 'Cậu Bé Rối Giấy', role: 'marksman', roles: ['marksman'], lanes: ['river'], difficulty: 2,
  base: { range: 500, moveSpeed: 330 }, basicAttack: { projectile: { speed: 1900, vfx: 'paper_dart' } },
  origin: 'Cơ chế: đánh xa, phân thân giấy, tích Hứng để tung đòn xoáy.',
  passive: { id: 'xoay_nho', name: 'Xoáy Nhỏ', desc: 'Mỗi lần trúng tướng +1 Hứng. Đủ 20 Hứng: đòn đánh kế tiếp thành Xoáy Nhỏ 120 (+0.6 Công) phép, hất lùi nhẹ.', params: P,
    gauge: (e) => ({ v: e.flags.hung || 0, max: P.need, label: 'Hứng' }),
    hooks: {
      onAttack(ctx) {
        const s = ctx.self; if ((s.flags.hung || 0) < P.need) return;
        s.flags.hung = 0; ctx.bonusMagic += P.dmg + P.ad * s.stats.atk; ctx.hitEffects = [{ status: 'knockback', dist: P.knock }]; ctx.proc = true;
        ctx.emit('proc', { kind: 'xoay_nho' });
      },
      onHit(ctx) { if (!ctx.proc) ctx.self.flags.hung = Math.min(P.need, (ctx.self.flags.hung || 0) + 1); }, // đòn đánh, chiêu, phân thân trúng tướng
    } },
  skills: {
    s1: { id: 'phi_tieu_giay', name: 'Phi Tiêu Giấy', type: 'skillshot', aim: 'direction', range: 850, width: 60, speed: 1800, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [40, 42, 44, 46, 48, 50], damage: { base: 70, perLevel: 35, ad: 0.9, type: 'physical' }, params: { bombChance: 0.25, bombRadius: 200 }, desc: '25% số phát thành Pháo Giấy nổ vùng 200, sát thương tối đa ở tâm, còn 50% ở mép.' },
    s2: { id: 'phan_than_giay', name: 'Phân Thân Giấy', type: 'recast', aim: 'point', range: 500, recasts: 2, recastWindow: 4, cooldown: [13, 12, 11, 10, 9, 8], cost: [60, 60, 60, 60, 60, 60], damage: { base: 18, perLevel: 9, ad: 0.22, type: 'physical' }, params: { clones: 2, cloneIv: 1 }, desc: 'Tung 2 phân thân giấy tự bắn địch gần nhất trong 4s; kích hoạt lại để đổi chỗ với một phân thân (tối đa 2 lần).' },
    s3: { id: 'xoay_gio', name: 'Xoáy Gió', type: 'dash', aim: 'direction', range: 550, hitAlongPath: true, stopOnHero: true, cooldown: [55, 47, 40], cost: [100, 100, 100], damage: { base: 180, perLevel: 100, ad: 1.1, type: 'magic' }, effects: [{ status: 'knockback', dist: 220 }], desc: 'Lao dọc theo hướng, nổ xoáy khi chạm tướng.' },
  },
  ai: { combo: ['s2', 's1', 's3'], preferredRange: 480, engageHpRatio: 0.85 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
