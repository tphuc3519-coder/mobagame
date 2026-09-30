import { hero } from './_make.js';
export default hero({
  id: 'thu_linh', name: 'Thư Linh', title: 'Nàng Sách Cổ', role: 'mage', roles: ['mage'], lanes: ['mid'], difficulty: 2,
  base: { range: 540 }, basicAttack: { projectile: { speed: 1700, vfx: 'glyph' } },
  origin: 'Cơ chế: pháp sư khống chế tầm xa, mở sách dựng kết giới.',
  passive: { id: 'trang_sach', name: 'Trang Sách', desc: 'Mỗi kỹ năng trúng tướng để lại 1 Trang trên địch (5s). Đủ 3 Trang: địch bị Câm lặng 1s và nhận 60 (+0.4 Phép) sát thương phép.', params: { pages: 3, ttl: 5, silence: 1, dmg: 60 } },
  skills: {
    s1: { id: 'tinh_the_chu', name: 'Tinh Thể Chữ', type: 'skillshot', aim: 'direction', range: 900, width: 65, speed: 1900, cooldown: [4.5, 4.3, 4.1, 3.9, 3.7, 3.5], cost: [45, 47, 49, 51, 53, 55], damage: { base: 75, perLevel: 40, ap: 0.7, type: 'magic' }, desc: 'Bắn tinh thể chữ xuyên một mục tiêu.' },
    s2: { id: 'an_giu', name: 'Ấn Giữ', type: 'aoeCircle', aim: 'point', range: 700, radius: 240, delay: 0.5, cooldown: [13, 12.3, 11.6, 10.9, 10.2, 9.5], cost: [70, 70, 75, 75, 80, 80], damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'root', duration: 1.2 }], desc: 'Vòng ấn giữ chân 1.2s.' },
    s3: { id: 'vong_ket_gioi', name: 'Vòng Kết Giới', type: 'zone', aim: 'point', range: 750, radius: 340, duration: 4, tickInterval: 0.5, cooldown: [70, 60, 50], cost: [120, 120, 120], damage: { base: 30, perLevel: 20, ap: 0.3, type: 'magic' }, effects: [{ status: 'slow', pct: 0.3, duration: 0.6 }], params: { blocksDash: true, allyShield: 70 }, desc: 'Mở sách dựng kết giới 4s: địch trong vùng chậm, không lướt được; đồng minh nhận khiên.' },
  },
  ai: { combo: ['s2', 's1', 's3'], preferredRange: 560, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_phap_su', 'truong_song', 'mu_sam', 'sach_pha_gioi', 'binh_suong_dong', 'ngoc_bang'],
});
