import { hero } from './_make.js';
export default hero({
  id: 'kiem_thuy', name: 'Kiếm Thuỷ', title: 'Kiếm Sĩ Sông Xanh', role: 'fighter', roles: ['fighter', 'assassin'], lanes: ['temple', 'jungle'], difficulty: 3,
  base: { range: 175 }, basicAttack: { melee: true },
  origin: 'Cơ chế: đổi thế kiếm theo dòng nước; tích Ấn rồi tung chuỗi mười ba nhát.',
  passive: { id: 'the_thuy', name: 'Thế Thuỷ', desc: 'Mỗi kỹ năng chuyển sang thế kế tiếp: Sông (+15% tốc chạy), Thác (+20% sát thương đòn kế), Xoáy (làm chậm 20% 1s). Kỹ năng trúng tướng +1 Ấn (tối đa 5).', params: { stances: ['song', 'thac', 'xoay'], sealMax: 5 } },
  skills: {
    s1: { id: 'nhat_song', name: 'Nhát Sông', type: 'line', aim: 'direction', range: 500, width: 130, hits: 2, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [30, 30, 35, 35, 40, 40], damage: { base: 45, perLevel: 25, ad: 0.6, type: 'physical' }, desc: 'Hai nhát chém liên tiếp theo hướng.' },
    s2: { id: 'banh_xe_nuoc', name: 'Bánh Xe Nước', type: 'aoeSelf', aim: 'none', radius: 300, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [50, 50, 55, 55, 60, 60], damage: { base: 80, perLevel: 40, ad: 0.8, type: 'physical' }, effects: [{ status: 'knockback', dist: 100 }], desc: 'Xoay kiếm quanh mình, hất lùi nhẹ.' },
    s3: { id: 'nhat_vu', name: 'Nhật Vũ Mười Ba Thức', type: 'dash', aim: 'direction', range: 700, hitAlongPath: true, requires: 'Ấn đủ 5', cooldown: [60, 50, 40], cost: [0, 0, 0], damage: { base: 30, perLevel: 20, ad: 0.35, type: 'physical' }, params: { slashes: 13, finisherBonus: 0.5 }, desc: 'Cần đủ 5 Ấn: lướt và chém 13 nhát liên hoàn, nhát cuối gây thêm 50%.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 180, engageHpRatio: 0.75 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'kiem_nhanh', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
