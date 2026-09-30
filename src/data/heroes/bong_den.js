import { hero } from './_make.js';
export default hero({
  id: 'bong_den', name: 'Bóng Đèn', title: 'Nghệ Nhân Rối Bóng', role: 'mage', roles: ['mage'], lanes: ['mid'], difficulty: 3,
  base: { range: 500 }, basicAttack: { projectile: { speed: 1700, vfx: 'shadow_dart' } },
  origin: 'Cơ chế: khống chế bằng bóng, trói cổ rồi choáng, mở lãnh địa rối bóng làm cả nhóm địch chậm.',
  passive: { id: 'bong_sau_lung', name: 'Bóng Sau Lưng', desc: 'Sát thương gây từ sau lưng mục tiêu +30%. Đứng yên 2s hồi 4% mana mỗi giây.', params: { backBonus: 0.3, idleMana: 0.04 } },
  skills: {
    s1: { id: 'phi_tieu_bong', name: 'Phi Tiêu Bóng', type: 'skillshot', aim: 'direction', range: 800, width: 55, speed: 1900, count: 2, interval: 0.15, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [40, 42, 44, 46, 48, 50], damage: { base: 35, perLevel: 20, ap: 0.4, type: 'magic' }, effects: [{ status: 'dot', dps: 12, duration: 3, type: 'magic' }], desc: 'Hai phi tiêu, mỗi cái kèm chảy máu 3s.' },
    s2: { id: 'troi_bong', name: 'Trói Bóng', type: 'tether', aim: 'direction', range: 700, duration: 2, cooldown: [12, 11.5, 11, 10.5, 10, 9.5], cost: [70, 70, 75, 75, 80, 80], damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'root', duration: 2 }, { status: 'stun', duration: 0.8, atEnd: true }], desc: 'Bóng quấn cổ 2s (trói, sát thương theo thời gian) rồi choáng 0.8s nếu còn trong tầm.' },
    s3: { id: 'lanh_dia_bong', name: 'Lãnh Địa Bóng', type: 'zone', aim: 'point', range: 600, radius: 480, duration: 5, tickInterval: 0.5, cooldown: [70, 62, 54], cost: [120, 120, 120], damage: { base: 30, perLevel: 20, ap: 0.25, type: 'magic' }, effects: [{ status: 'slow', pct: 0.4, duration: 0.6 }, { status: 'silenceDash' }], desc: 'Vùng rối bóng 5s: địch bên trong chậm 40% và không thể lướt.' },
  },
  ai: { combo: ['s3', 's2', 's1'], preferredRange: 520, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_phap_su', 'truong_song', 'mu_sam', 'sach_pha_gioi', 'binh_suong_dong', 'ngoc_bang'],
});
