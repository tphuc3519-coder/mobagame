import { hero } from './_make.js';
export default hero({
  id: 'ba_nam', name: 'Bà Năm Chảo', title: 'Bà Nội Trợ Xóm Chợ', role: 'fighter', roles: ['fighter'], lanes: ['temple'], difficulty: 1,
  base: { range: 165, moveSpeed: 335, maxHp: 900 }, basicAttack: { melee: true },
  origin: 'Cơ chế: cận chiến chí mạng tích dần, mắng xối phản lại đạn bay.',
  passive: { id: 'chieu_chao', name: 'Chiêu Chảo', desc: 'Mỗi đòn đánh trúng +4% tỉ lệ chí mạng (tối đa +36%, giữ 6s); chí mạng gây 210% sát thương.', params: { perHit: 0.04, max: 0.36, ttl: 6, critDmg: 2.1 } },
  skills: {
    s1: { id: 'dap_chao', name: 'Đập Chảo', type: 'cone', aim: 'direction', range: 320, angle: 100, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [30, 30, 35, 35, 40, 40], damage: { base: 75, perLevel: 40, ad: 1.0, type: 'physical' }, effects: [{ status: 'slow', pct: 0.25, duration: 1 }], desc: 'Vung chảo hình quạt, làm chậm 25% trong 1s.' },
    s2: { id: 'mang_xoi', name: 'Mắng Xối', type: 'aoeSelf', aim: 'none', radius: 380, waves: 5, interval: 0.2, cooldown: [16, 15, 14, 13, 12, 11], cost: [60, 60, 60, 60, 60, 60], damage: { base: 20, perLevel: 10, ad: 0.25, type: 'physical' }, params: { reflectProjectiles: true, reflectWindow: 1 }, desc: '5 đợt sóng xung kích trong 1s; đạn bay chạm sóng bị phản ngược về phía địch.' },
    s3: { id: 'dep_bay', name: 'Dép Bay', type: 'targetedDash', aim: 'target', range: 650, cooldown: [45, 40, 35], cost: [90, 90, 90], damage: { base: 190, perLevel: 90, ad: 1.2, type: 'physical' }, effects: [{ status: 'stun', duration: 1 }], desc: 'Lao đá vào mục tiêu đã khoá: choáng 1s, tích thêm 3 chí mạng.' },
  },
  ai: { combo: ['s3', 's1', 's2'], preferredRange: 160, engageHpRatio: 0.75 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'kiem_nhanh', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
