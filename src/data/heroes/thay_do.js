import { hero } from './_make.js';
export default hero({
  id: 'thay_do', name: 'Thầy Đồ', title: 'Ông Đồ Chữ Nghĩa', role: 'fighter', roles: ['fighter', 'mage'], lanes: ['temple'], difficulty: 3,
  base: { range: 200, atk: 62, ap: 0, moveSpeed: 320 }, basicAttack: { melee: true },
  origin: 'Cơ chế: tiến hoá theo điểm Học, ba cấp Nghĩa; mỗi cấp mạnh và tầm xa hơn.',
  passive: { id: 'diem_hoc', name: 'Điểm Học', desc: 'Đòn đánh và kỹ năng trúng tướng +1 Điểm. 12 Điểm: lên Nghĩa II (+15% tốc đánh, +40 tầm, đòn đánh +25 phép). 30 Điểm: Nghĩa III (+30% sát thương kỹ năng, đòn đánh xuyên 1 mục tiêu).', params: { tiers: [0, 12, 30] } },
  skills: {
    s1: { id: 'net_but', name: 'Nét Bút', type: 'line', aim: 'direction', range: 650, width: 110, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [40, 40, 45, 45, 50, 50], damage: { base: 70, perLevel: 35, ad: 0.5, ap: 0.5, type: 'magic' }, desc: 'Vạch một nét mực thẳng; ở Nghĩa II để lại vệt chậm 1s.' },
    s2: { id: 'quyet_sach', name: 'Quyết Sách', type: 'selfBuff', aim: 'none', duration: 5, cooldown: [16, 15, 14, 13, 12, 11], cost: [50, 50, 50, 50, 50, 50], shield: { base: 90, perLevel: 40, ap: 0.4 }, effects: [{ status: 'haste', pct: 0.2, duration: 2 }], desc: 'Khiên 5s, +20% tốc chạy 2s; +2 Điểm.' },
    s3: { id: 'dung_mot_minh', name: 'Đứng Một Mình', type: 'selfBuff', aim: 'none', duration: 6, cooldown: [75, 65, 55], cost: [100, 100, 100], effects: [{ status: 'statMod', tenacity: 0.5, dmgReducePct: 0.25, atkPct: 0.25 }], desc: '6s: kháng hiệu ứng 50%, giảm 25% sát thương nhận, +25% Công; nhận 6 Điểm.' },
  },
  ai: { combo: ['s1', 's2', 's3'], preferredRange: 200, engageHpRatio: 0.7 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'bua_than_ren', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
