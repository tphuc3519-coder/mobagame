import { hero } from './_make.js';
export default hero({
  id: 'nhan_su', name: 'Nhãn Sư', title: 'Thợ Săn Thấu Nhãn', role: 'marksman', roles: ['marksman', 'assassin'], lanes: ['river'], difficulty: 3,
  base: { range: 500, moveSpeed: 330 }, basicAttack: { projectile: { speed: 2000, vfx: 'bolt' } },
  origin: 'Cơ chế: tích Tầm Nhìn bằng thông tin, đủ 100 thì thấy điểm yếu và tung loạt bắn quyết định.',
  passive: { id: 'tam_nhin', name: 'Tầm Nhìn', desc: 'Tích Tầm Nhìn khi thấy tướng địch (tối đa 27/giây, dừng khi bị khống chế cứng). Đủ 100: Thấu Nhãn — lộ điểm yếu địch, +12% tốc chạy, né đòn trực tiếp đầu tiên.', params: { maxGainPerSec: 27, need: 100, haste: 0.12 } },
  skills: {
    s1: { id: 'chay_mu_diem', name: 'Chạy Mù Điểm', type: 'dash', aim: 'direction', range: 450, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [40, 40, 45, 45, 50, 50], effects: [{ status: 'statMod', dmgReducePct: 0.3, slowImmune: true, duration: 1 }], params: { primesNextShot: true }, desc: 'Chạy vòng sườn: giảm 30% sát thương, miễn nhiễm làm chậm 1s; phát bắn kế tiếp được nạp.' },
    s2: { id: 'phat_ban_thang', name: 'Phát Bắn Thẳng', type: 'skillshot', aim: 'direction', range: 900, width: 55, speed: 2600, cooldown: [7, 6.6, 6.2, 5.8, 5.4, 5], cost: [50, 50, 55, 55, 60, 60], damage: { base: 62, perLevel: 30, ad: 0.9, type: 'physical' }, params: { perfectTimingDamage: 80, perfectTimingKnockdown: true }, desc: 'Phát bắn chính xác; đúng thời điểm (sau Chạy Mù Điểm) gây 80 và làm địch ngã ngắn.' },
    s3: { id: 'hai_nong_lien_xa', name: 'Hai Nòng Liên Xạ', type: 'skillshot', aim: 'direction', range: 1000, width: 80, speed: 3000, requires: 'Tầm Nhìn 100', cooldown: [55, 47, 40], cost: [0, 0, 0], damage: { base: 135, perLevel: 60, ad: 1.0, type: 'physical' }, params: { armorPenPct: 0.15, opportunityDamage: 157 }, desc: 'Cần Tầm Nhìn 100: loạt bắn 135 xuyên 15% giáp (157 nếu địch đang hở).' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 500, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
