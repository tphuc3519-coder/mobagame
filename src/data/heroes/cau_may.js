import { hero } from './_make.js';
// Cánh Sếu: dưới 35% HP thì giảm sát thương nhận, hồi chiêu trôi nhanh hơn 50%, kháng hiệu ứng — tới khi hồi lên trên 50%.
const P = { hpBelow: 0.35, hpRecover: 0.5, dmgReduce: 0.35, castSpeed: 0.5, tenacity: 0.4 };
export default hero({
  id: 'cau_may', name: 'Ozora Tsubasa', title: 'Chàng Đá Cầu Xóm Đình', role: 'marksman', roles: ['marksman'], lanes: ['river'], difficulty: 2,
  base: { range: 520 }, basicAttack: { projectile: { speed: 1700, vfx: 'shuttlecock' } },
  origin: 'Cơ chế: sút xa, có phát Đá Lộn Ngược ngẫu nhiên, dưới 35% máu nổi Cánh Sếu mạnh hơn hẳn.',
  passive: { id: 'canh_seu', name: 'Cánh Sếu', desc: 'Dưới 35% HP tối đa: giảm 35% sát thương nhận, hồi chiêu trôi nhanh hơn 50%, kháng hiệu ứng 40%, cho đến khi hồi lên trên 50%.', params: P,
    gauge: (e) => (e.flags.seu ? { v: 1, max: 1, label: 'Cánh Sếu' } : null),
    hooks: {
      onTick(ctx) {
        const s = ctx.self, w = ctx.world, r = s.hp / s.stats.maxHp;
        if (!s.flags.seu && r < P.hpBelow) { s.flags.seu = true; ctx.emit('proc', { kind: 'canh_seu' }); }
        else if (s.flags.seu && r > P.hpRecover) s.flags.seu = false;
        if (!s.flags.seu) return;
        if (w.tick % 10 === 0) ctx.applyStatus(s, { status: 'statMod', id: 'canh_seu', dmgReducePct: P.dmgReduce, tenacity: P.tenacity, duration: 0.5 });
        if (w.tick % 2 === 0) for (const k of ['s1', 's2', 's3']) if (s.cooldowns[k] > w.tick) s.cooldowns[k] -= 1; // +50% tốc ra chiêu
      },
    } },
  skills: {
    s1: { id: 'tat_cau', name: 'Tạt Cầu', type: 'skillshot', aim: 'direction', range: 800, width: 50, speed: 1800, cooldown: [4, 3.8, 3.6, 3.4, 3.2, 3], cost: [30, 30, 35, 35, 40, 40], damage: { base: 60, perLevel: 30, ad: 0.8, type: 'physical' }, params: { overheadChance: 0.3, overheadDmg: 140, overheadStun: 0.5 }, desc: '30% số phát thành Đá Lộn Ngược: thêm 80 sát thương kèm choáng 0.5s.' },
    s2: { id: 'da_xoay_lua', name: 'Đá Xoáy Lửa', type: 'skillshot', aim: 'direction', range: 900, width: 70, speed: 2100, cooldown: [9, 8.5, 8, 7.5, 7, 6.5], cost: [55, 55, 60, 60, 65, 65], damage: { base: 90, perLevel: 45, ad: 1.0, type: 'physical' }, effects: [{ status: 'dot', id: 'da_xoay_lua', dps: 25, duration: 3, type: 'magic' }], desc: 'Quả cầu xoáy gây cháy 3s.' },
    s3: { id: 'song_cau_thang', name: 'Song Cầu Thắng', type: 'skillshot', aim: 'direction', range: 950, width: 90, speed: 2400, count: 2, interval: 0.25, cooldown: [42, 36, 30], cost: [90, 90, 90], damage: { base: 130, perLevel: 70, ad: 0.9, type: 'physical' }, params: { followFirst: true }, desc: 'Hai phát liên tiếp; phát đầu trúng tướng thì phát thứ hai bám theo người đó.' },
  },
  ai: { combo: ['s3', 's2', 's1'], preferredRange: 520, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_xa_thu', 'cung_gio', 'kiem_nhanh', 'ao_giap_nhe', 'nhan_bao_kich', 'mat_na_hoi_sinh'],
});
