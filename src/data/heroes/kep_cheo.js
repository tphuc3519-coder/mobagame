import { hero } from './_make.js';
export default hero({
  id: 'kep_cheo', name: 'Kép Chèo', title: 'Ông Kép Múa Hài', role: 'fighter', roles: ['fighter'], lanes: ['temple'], difficulty: 3,
  base: { range: 175, atk: 68 }, basicAttack: { melee: true },
  origin: 'Cơ chế: đánh có tỉ lệ choáng, sáu tia sáng đẩy lùi, chiêu cuối đổi vai (hoán đổi máu) khi sắp chết.',
  passive: { id: 'hao_quang_san_khau', name: 'Hào Quang Sân Khấu', desc: 'Địch trong 400 quanh Kép Chèo có 10% đòn đánh trượt; bản thân +8% tốc đánh khi có địch trong vùng. Đòn đánh 25% kèm choáng 0.3s.', params: { radius: 400, miss: 0.1, stunChance: 0.25 } },
  skills: {
    s1: { id: 'quyen_cheo', name: 'Quyền Chèo', type: 'cone', aim: 'direction', range: 300, angle: 110, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [30, 30, 35, 35, 40, 40], damage: { base: 65, perLevel: 35, ad: 0.9, type: 'physical' }, desc: 'Ba đòn quyền liên tiếp trước mặt.' },
    s2: { id: 'sau_tia_sang', name: 'Sáu Tia Sáng', type: 'cone', aim: 'direction', range: 700, angle: 60, beams: 6, cooldown: [11, 10.5, 10, 9.5, 9, 8.5], cost: [60, 60, 65, 65, 70, 70], damage: { base: 25, perLevel: 12, ad: 0.3, type: 'magic' }, effects: [{ status: 'knockback', dist: 140 }], params: { exhaustIfHits: 3, exhaustDuration: 1.5 }, desc: 'Bắn xối 6 tia, mỗi tia đẩy lùi; trúng đủ 3 tia thì địch kiệt sức (chậm mạnh 1.5s).' },
    s3: { id: 'doi_vai', name: 'Đổi Vai', type: 'skillshot', aim: 'direction', range: 750, width: 80, speed: 2200, cooldown: [90, 80, 70], cost: [80, 80, 80], params: { swapHpPct: true, setBothHp: 0.2, missSelfHp: 0.1, condition: 'Chỉ dùng được khi HP dưới 30%' }, desc: 'Khi HP dưới 30%: bắn tia đổi vai. Trúng thì hai bên đổi phần trăm máu rồi cùng về ít nhất 20%; trượt thì Kép Chèo còn 10% máu.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 200, engageHpRatio: 0.7, ultRule: 'hpBelow0.3' },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'bua_than_ren', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
