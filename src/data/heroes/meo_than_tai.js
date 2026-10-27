import { hero } from './_make.js';
// Chong Chóng Thoát Hiểm: bị khống chế cứng thì bay lên — gỡ khống chế, miễn khống chế 1.5s, +30% tốc chạy (hồi 25s).
const P = { cooldown: 25, flyTime: 1.5, haste: 0.3, chain: 3, chainStun: 0.6, chainReset: 5 };
const FREE = ['stun', 'knockup', 'root', 'slow', 'silence', 'taunt', 'blind', 'noDash']; // áp chế / bất động thì không thoát được
export default hero({
  id: 'meo_than_tai', name: 'Doraemon', title: 'Mèo Vẫy Tay Bảo Bối', role: 'tank', roles: ['tank', 'support'], lanes: ['support'], difficulty: 3,
  base: { range: 165, atk: 52, armor: 40 }, basicAttack: { melee: true },
  origin: 'Cơ chế: khống chế bằng bảo bối, cánh chong chóng thoát hiểm, chiêu cuối tua ngược thời gian.',
  passive: { id: 'chong_chong', name: 'Chong Chóng Thoát Hiểm', desc: 'Bị khống chế cứng: bay lên 1.5s, gỡ khống chế, miễn khống chế và +30% tốc chạy (hồi 25s).', params: P,
    gauge: (e, w) => { const left = Math.max(0, ((e.flags.escapeCd || 0) - (w?.tick || 0)) / 30); return { v: 0, max: 1, label: 'Chong chóng ' + (left > 0 ? Math.ceil(left) + 's' : 'sẵn sàng') }; },
    hooks: {
      onTick(ctx) {
        const s = ctx.self, w = ctx.world;
        if (w.tick < (s.flags.escapeCd || 0) || !ctx.isHardCC(s) || s.statuses.some((x) => x.kind === 'suppress' || x.kind === 'stasis')) return;
        for (const k of FREE) ctx.removeStatus(s, k);
        s.forced = null;
        ctx.applyStatus(s, { status: 'ccImmune', id: 'chong_chong', duration: P.flyTime });
        ctx.applyStatus(s, { status: 'haste', id: 'chong_chong_haste', pct: P.haste, duration: P.flyTime });
        s.flags.escapeCd = w.tick + ctx.T(P.cooldown); ctx.emit('proc', { kind: 'chong_chong', dur: P.flyTime });
      },
      onCast(ctx) { // Nện Bụng: lần thứ ba của mỗi chuỗi (các lần cách nhau ≤ 5s) kèm choáng
        if (ctx.slot !== 's1') return; const s = ctx.self, w = ctx.world;
        if (w.tick - (s.flags.bungAt ?? -1e9) > ctx.T(P.chainReset)) s.flags.bung = 0;
        s.flags.bung = (s.flags.bung || 0) + 1; s.flags.bungAt = w.tick;
        if (s.flags.bung % P.chain === 0) ctx.cast.extraEffects = [{ status: 'stun', id: 'nen_bung_stun', duration: P.chainStun }];
      },
    } },
  skills: {
    s1: { id: 'nen_bung', name: 'Nện Bụng', type: 'cone', aim: 'direction', range: 260, angle: 100, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [30, 30, 35, 35, 40, 40], damage: { base: 60, perLevel: 30, ad: 0.8, type: 'physical' }, effects: [{ status: 'knockback', dist: 100 }], desc: 'Húc bụng: đẩy lùi; lần thứ ba của mỗi chuỗi choáng 0.6s.' },
    s2: { id: 'sung_hoi', name: 'Súng Hơi', type: 'skillshot', aim: 'direction', range: 750, width: 90, speed: 1700, cooldown: [10, 9.5, 9, 8.5, 8, 7.5], cost: [55, 55, 60, 60, 65, 65], damage: { base: 70, perLevel: 35, ap: 0.5, type: 'magic' }, effects: [{ status: 'knockback', dist: 260 }, { status: 'interrupt' }], desc: 'Vòng khí nén: đẩy lùi, cắt ngang chiêu đang gồng.' },
    s3: { id: 'dong_ho_nguoc', name: 'Đồng Hồ Ngược', type: 'selfBuff', aim: 'none', cooldown: [130, 110, 90], cost: [100, 100, 100], params: { rewindSeconds: 4, restorePosition: true, restoreHp: true }, desc: 'Tua ngược 4s: quay lại vị trí và máu của 4 giây trước (không mất máu khi HP hiện tại cao hơn).' },
  },
  ai: { combo: ['s2', 's1', 's3'], preferredRange: 180, engageHpRatio: 0.6, ultRule: 'hpBelow0.25' },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_giap', 'khien_da', 'ao_giap_dong', 'long_ho_menh', 'giap_gai', 'mat_na_hoi_sinh'],
});
