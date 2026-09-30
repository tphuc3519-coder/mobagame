import { hero } from './_make.js';
export default hero({
  id: 'luong_cuc', name: 'Lưỡng Cực', title: 'Đạo Sĩ Âm Dương', role: 'mage', roles: ['mage'], lanes: ['mid'], difficulty: 3,
  base: { range: 520 }, basicAttack: { projectile: { speed: 1800, vfx: 'yin_yang' } },
  origin: 'Cơ chế: điều khiển không gian — hút, đẩy, rồi hợp Thái Cực; chiêu cuối mở cõi giam địch.',
  passive: { id: 'vo_han', name: 'Vô Hạn', desc: 'Đòn đánh của Lưỡng Cực không bị chặn bởi đạn/khiên đường bay; +10% tốc chạy khi không có địch trong 700.', params: { haste: 0.1, safeRange: 700 } },
  skills: {
    s1: { id: 'am_hut', name: 'Âm Hút', type: 'aoeCircle', aim: 'point', range: 750, radius: 230, delay: 0.4, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [60, 60, 65, 65, 70, 70], damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'pull', dist: 260 }], desc: 'Hút địch về tâm vùng.' },
    s2: { id: 'duong_day', name: 'Dương Đẩy', type: 'aoeCircle', aim: 'point', range: 750, radius: 230, delay: 0.4, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [60, 60, 65, 65, 70, 70], damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'knockback', dist: 300 }], params: { combo: 'Nếu tung sau Âm Hút trong 3s: thành Chùm Thái Cực, thêm 120 (+0.6 Phép) sát thương xuyên giáp' }, desc: 'Đẩy văng địch; tung sau Âm Hút trong 3s thì hợp Chùm Thái Cực.' },
    s3: { id: 'thai_cuc_gioi', name: 'Thái Cực Giới', type: 'zone', aim: 'point', range: 700, radius: 520, duration: 4, tickInterval: 0.5, cooldown: [100, 90, 80], cost: [140, 140, 140], damage: { base: 30, perLevel: 20, ap: 0.25, type: 'magic' }, effects: [{ status: 'silence', duration: 0.6 }, { status: 'slow', pct: 0.6, duration: 0.6 }], desc: 'Mở cõi 4s: địch trong vùng bị câm lặng và chậm mạnh; Lưỡng Cực không bị chọn làm mục tiêu bởi đòn đánh thường trong lúc mở.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 540, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_phap_su', 'truong_song', 'mu_sam', 'sach_pha_gioi', 'binh_suong_dong', 'ngoc_bang'],
});
