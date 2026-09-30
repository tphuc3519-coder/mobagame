import { hero } from './_make.js';
export default hero({
  id: 'meo_than_tai', name: 'Mèo Thần Tài', title: 'Mèo Vẫy Tay Bảo Bối', role: 'tank', roles: ['tank', 'support'], lanes: ['support'], difficulty: 3,
  base: { range: 165, atk: 52, armor: 40 }, basicAttack: { melee: true },
  origin: 'Cơ chế: khống chế bằng bảo bối, cánh chong chóng thoát hiểm, chiêu cuối tua ngược thời gian.',
  passive: { id: 'chong_chong', name: 'Chong Chóng Thoát Hiểm', desc: 'Bị khống chế cứng: bay lên 1.5s, gỡ khống chế và +30% tốc chạy (hồi 25s).', params: { cooldown: 25, flyTime: 1.5, haste: 0.3 } },
  skills: {
    s1: { id: 'nen_bung', name: 'Nện Bụng', type: 'cone', aim: 'direction', range: 260, angle: 100, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [30, 30, 35, 35, 40, 40], damage: { base: 60, perLevel: 30, ad: 0.8, type: 'physical' }, effects: [{ status: 'knockback', dist: 100 }], desc: 'Húc bụng: đẩy lùi; đòn thứ ba của mỗi chuỗi choáng 0.6s.' },
    s2: { id: 'sung_hoi', name: 'Súng Hơi', type: 'skillshot', aim: 'direction', range: 750, width: 90, speed: 1700, cooldown: [10, 9.5, 9, 8.5, 8, 7.5], cost: [55, 55, 60, 60, 65, 65], damage: { base: 70, perLevel: 35, ap: 0.5, type: 'magic' }, effects: [{ status: 'knockback', dist: 260 }, { status: 'interrupt' }], desc: 'Vòng khí nén: đẩy lùi, cắt ngang chiêu đang gồng.' },
    s3: { id: 'dong_ho_nguoc', name: 'Đồng Hồ Ngược', type: 'selfBuff', aim: 'none', cooldown: [130, 110, 90], cost: [100, 100, 100], params: { rewindSeconds: 4, restorePosition: true, restoreHp: true }, desc: 'Tua ngược 4s: quay lại vị trí và máu của 4 giây trước (không hồi thêm khi HP hiện tại cao hơn).' },
  },
  ai: { combo: ['s2', 's1'], preferredRange: 180, engageHpRatio: 0.6, ultRule: 'hpBelow0.25' },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_giap', 'khien_da', 'ao_giap_dong', 'ngoc_binh_an', 'giap_gai', 'mat_na_hoi_sinh'],
});
