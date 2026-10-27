import { hero } from './_make.js';
// Chiêu Chảo: mỗi đòn đánh +4% chí mạng (tối đa +36%, giữ 6s); Dép Bay trúng tướng +3 tầng; chí mạng 210%.
const P = { perHit: 0.04, max: 0.36, ttl: 6, critDmg: 2.1, ultStacks: 3 };
const tiers = (e) => e.statuses.find((s) => s.id === 'chieu_chao')?.n || 0;
const addCrit = (ctx, n) => { const k = Math.min(Math.round(P.max / P.perHit), tiers(ctx.self) + n); ctx.applyStatus(ctx.self, { status: 'statMod', id: 'chieu_chao', n: k, crit: k * P.perHit, duration: P.ttl }); };
export default hero({
  id: 'ba_nam', name: 'ChiChi', title: 'Bà Nội Trợ Xóm Chợ', role: 'fighter', roles: ['fighter'], lanes: ['temple'], difficulty: 1,
  base: { range: 165, moveSpeed: 335, maxHp: 900, critDmg: P.critDmg }, basicAttack: { melee: true },
  origin: 'Cơ chế: cận chiến chí mạng tích dần, mắng xối phản lại đạn bay.',
  passive: { id: 'chieu_chao', name: 'Chiêu Chảo', desc: 'Mỗi đòn đánh trúng +4% tỉ lệ chí mạng (tối đa +36%, giữ 6s); chí mạng gây 210% sát thương.', params: P,
    gauge: (e) => ({ v: Math.round(tiers(e) * P.perHit * 100), max: Math.round(P.max * 100), label: 'Chí mạng', unit: '%' }),
    hooks: {
      onAttack(ctx) { addCrit(ctx, 1); }, // cận chiến: đòn chạm ngay lúc ra
      onSkillHit(ctx) { if (ctx.cast.slot !== 's3' || !ctx.target.isHero || ctx.cast.flags.chao) return; ctx.cast.flags.chao = true; addCrit(ctx, P.ultStacks); },
    } },
  skills: {
    s1: { id: 'dap_chao', name: 'Đập Chảo', type: 'cone', aim: 'direction', range: 320, angle: 100, cooldown: [6, 5.6, 5.2, 4.8, 4.4, 4], cost: [30, 30, 35, 35, 40, 40], damage: { base: 75, perLevel: 40, ad: 1.0, type: 'physical' }, effects: [{ status: 'slow', pct: 0.25, duration: 1 }], desc: 'Vung chảo hình quạt, làm chậm 25% trong 1s.' },
    s2: { id: 'mang_xoi', name: 'Mắng Xối', type: 'aoeSelf', aim: 'none', radius: 380, waves: 5, interval: 0.2, cooldown: [16, 15, 14, 13, 12, 11], cost: [60, 60, 60, 60, 60, 60], damage: { base: 20, perLevel: 10, ad: 0.25, type: 'physical' }, params: { reflectProjectiles: true, reflectWindow: 1 }, desc: '5 đợt sóng xung kích trong 1s; đạn của tướng địch bay vào sóng bị hất ngược về phía người bắn.' },
    s3: { id: 'dep_bay', name: 'Dép Bay', type: 'targetedDash', aim: 'target', range: 650, speed: 2200, cooldown: [45, 40, 35], cost: [90, 90, 90], unstoppable: 0.5, damage: { base: 190, perLevel: 90, ad: 1.2, type: 'physical' }, effects: [{ status: 'stun', duration: 1 }], desc: 'Lao đá vào mục tiêu đã khoá — không thể bị cản (miễn khống chế, không bị đẩy) khi đang lao: choáng 1s, tích thêm 3 tầng chí mạng.' },
  },
  ai: { combo: ['s3', 's1', 's2'], preferredRange: 160, engageHpRatio: 0.75 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_chien', 'kiem_nhanh', 'huyet_kiem', 'khien_da', 'thuong_pha_giap', 'mat_na_hoi_sinh'],
});
