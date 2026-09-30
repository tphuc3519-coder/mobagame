import { hero } from './_make.js';
export default hero({
  id: 'cau_may', name: 'Cầu Mây', title: 'Chàng Đá Cầu Xóm Đình', role: 'marksman', roles: ['marksman'], lanes: ['river'], difficulty: 2,
  base: { range: 520 }, basicAttack: { projectile: { speed: 1700, vfx: 'shuttlecock' } },
  origin: 'Cơ chế: sút xa, chưa sung thì hay trượt, dưới 35% máu nổi Cánh Sếu mạnh hơn hẳn.',
  passive: { id: 'canh_seu', name: 'Cánh Sếu', desc: 'Dưới 35% HP tối đa: giảm 35% sát thương nhận, +50% tốc ra chiêu, kháng hiệu ứng 40%, cho đến khi hồi lên trên 50%.', params: { hpBelow: 0.35, hpRecover: 0.5, dmgReduce: 0.35, cdrLike: 0.5, tenacity: 0.4 } },
  skills: {
    s1: { id: 'tat_cau', name: 'Tạt Cầu', type: 'skillshot', aim: 'direction', range: 800, width: 50, speed: 1800, cooldown: [4, 3.8, 3.6, 3.4, 3.2, 3], cost: [30, 30, 35, 35, 40, 40], damage: { base: 60, perLevel: 30, ad: 0.8, type: 'physical' }, params: { overheadChance: 0.3, overheadDmg: 140 }, desc: '30% số phát thành Đá Lộn Ngược 140 sát thương kèm choáng ngắn.' },
    s2: { id: 'da_xoay_lua', name: 'Đá Xoáy Lửa', type: 'skillshot', aim: 'direction', range: 900, width: 70, speed: 2100, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [55, 55, 60, 60, 65, 65], damage: { base: 90, perLevel: 45, ad: 1.0, type: 'physical' }, effects: [{ status: 'dot', dps: 25, duration: 3, type: 'magic' }], desc: 'Quả cầu xoáy gây cháy 3s.' },
    s3: { id: 'song_cau_thang', name: 'Song Cầu Thắng', type: 'skillshot', aim: 'direction', range: 950, width: 90, speed: 2400, count: 2, interval: 0.25, cooldown: [42, 36, 30], cost: [90, 90, 90], damage: { base: 130, perLevel: 70, ad: 0.9, type: 'physical' }, desc: 'Hai phát liên tiếp, phát thứ hai theo dấu phát đầu.' },
  },
  ai: { combo: ['s3', 's2', 's1'], preferredRange: 520, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
