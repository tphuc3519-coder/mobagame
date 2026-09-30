import { hero } from './_make.js';
export default hero({
  id: 'phu_dong', name: 'Phù Đổng', title: 'Chàng Trai Ngựa Sắt', role: 'tank', roles: ['tank', 'fighter'], lanes: ['temple'], difficulty: 1,
  base: { range: 170, atk: 64, moveSpeed: 325 }, basicAttack: { melee: true },
  origin: 'Cơ chế: tướng đỡ đòn cứng cáp, giáp sắt giảm sát thương vật lý, phun lửa, thổi băng, lao từ trời xuống.',
  passive: { id: 'giap_sat', name: 'Giáp Sắt', desc: 'Giảm 20% sát thương vật lý và 40% lực đẩy; sát thương phép, đốt, độc và theo %HP vẫn nhận đủ.', params: { physReduce: 0.2, knockbackReduce: 0.4 } },
  skills: {
    s1: { id: 'lua_ngua_sat', name: 'Lửa Ngựa Sắt', type: 'line', aim: 'direction', range: 700, width: 120, ticks: 4, tickInterval: 0.15, cooldown: [8, 7.5, 7, 6.5, 6, 5.5], cost: [45, 45, 50, 50, 55, 55], damage: { base: 25, perLevel: 12, ap: 0.2, ad: 0.25, type: 'magic' }, effects: [{ status: 'dot', dps: 30, duration: 3, ifAllTicksHit: true, type: 'magic' }], desc: 'Hai tia lửa bốn nhịp; trúng đủ bốn nhịp thì địch bốc cháy 3s.' },
    s2: { id: 'gio_bang_nui_soc', name: 'Gió Băng Núi Sóc', type: 'cone', aim: 'direction', range: 550, angle: 70, cooldown: [12, 11.5, 11, 10.5, 10, 9.5], cost: [60, 60, 65, 65, 70, 70], damage: { base: 60, perLevel: 30, ap: 0.4, type: 'magic' }, effects: [{ status: 'stun', duration: 0.8, label: 'đóng băng' }, { status: 'slow', pct: 0.45, duration: 2 }], desc: 'Luồng hơi nón: đóng băng 0.8s rồi làm chậm nặng.' },
    s3: { id: 'bay_len_troi', name: 'Bay Lên Trời', type: 'aoeCircle', aim: 'point', range: 900, radius: 300, delay: 0.9, untargetableDuringLeap: true, cooldown: [60, 52, 44], cost: [100, 100, 100], damage: { base: 220, perLevel: 110, ad: 1.0, type: 'physical' }, effects: [{ status: 'knockup', duration: 0.8 }], desc: 'Bay lên rồi lao xuống điểm chỉ định: không thể chọn khi bay, hất tung mục tiêu ở tâm, vùng chấn động quanh điểm rơi.' },
  },
  ai: { combo: ['s3', 's2', 's1'], preferredRange: 190, engageHpRatio: 0.7 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_giap', 'khien_da', 'ao_giap_dong', 'ngoc_binh_an', 'giap_gai', 'mat_na_hoi_sinh'],
});
