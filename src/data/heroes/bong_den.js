import { hero } from './_make.js';
// Bóng Sau Lưng: đánh từ sau lưng mục tiêu +30% sát thương; đứng yên 2s thì hồi 4% mana mỗi giây.
const P = { backBonus: 0.3, idleMana: 0.04, idleAfter: 2 };
export default hero({
  id: 'bong_den', name: 'Bóng Đèn', title: 'Nghệ Nhân Rối Bóng', role: 'mage', roles: ['mage'], lanes: ['mid'], difficulty: 3,
  base: { range: 500 }, basicAttack: { projectile: { speed: 1700, vfx: 'shadow_dart' } },
  origin: 'Cơ chế: khống chế bằng bóng, áp chế bằng bóng rồi choáng, mở lãnh địa rối bóng làm cả nhóm địch chậm.',
  passive: { id: 'bong_sau_lung', name: 'Bóng Sau Lưng', desc: 'Sát thương gây từ sau lưng mục tiêu +30%. Đứng yên 2s hồi 4% mana mỗi giây.', params: P,
    hooks: {
      onDealDamage(ctx) { // ctx thường (damage.js): self, target, amount, opts
        const t = ctx.target, s = ctx.self; if (ctx.opts?.dot || t.structure) return;
        const dx = s.pos.x - t.pos.x, dy = s.pos.y - t.pos.y, l = Math.hypot(dx, dy);
        if (l > 1 && (dx * Math.cos(t.facing) + dy * Math.sin(t.facing)) / l < -0.35) ctx.amount *= 1 + P.backBonus;
      },
      onTick(ctx) {
        const s = ctx.self, w = ctx.world;
        if (s.flags.still == null || s.speed > 1) { s.flags.still = w.tick; return; }
        if (w.tick - s.flags.still >= ctx.T(P.idleAfter) && w.tick % 30 === 0) s.mana = Math.min(s.stats.maxMana, s.mana + s.stats.maxMana * P.idleMana);
      },
    } },
  skills: {
    s1: { id: 'phi_tieu_bong', name: 'Phi Tiêu Bóng', type: 'skillshot', aim: 'direction', range: 800, width: 55, speed: 1900, count: 2, interval: 0.15, cooldown: [5, 4.7, 4.4, 4.1, 3.8, 3.5], cost: [40, 42, 44, 46, 48, 50], damage: { base: 35, perLevel: 20, ap: 0.4, type: 'magic' }, effects: [{ status: 'dot', id: 'phi_tieu_bong', dps: 12, duration: 3, type: 'magic' }], desc: 'Hai phi tiêu, mỗi cái kèm chảy máu 3s.' },
    s2: { id: 'troi_bong', name: 'Trói Bóng', type: 'tether', aim: 'direction', range: 700, width: 70, speed: 1800, heroOnly: true, duration: 1.25, suppress: { channel: true }, cooldown: [13, 12.5, 12, 11.5, 11, 10.5], cost: [70, 70, 75, 75, 80, 80], damage: { base: 60, perLevel: 30, ap: 0.5, type: 'magic' }, effects: [{ status: 'stun', id: 'troi_bong_stun', duration: 0.8, atEnd: true }], desc: 'Bóng quấn cổ tướng địch trúng đầu tiên: áp chế 1,25s (không cử động, không đánh, không dùng chiêu / phép / đồ; không giảm bởi kháng hiệu ứng, Giải Trói không gỡ) — Bóng Đèn đứng niệm giữ dây suốt lúc đó, giữ đủ thì choáng thêm 0,8s. Bóng Đèn bị khống chế cứng, câm lặng, bị cắt chiêu, chết, hoặc tự dùng phép / đồ thì dây đứt.' },
    s3: { id: 'lanh_dia_bong', name: 'Lãnh Địa Bóng', type: 'zone', aim: 'point', range: 600, radius: 480, duration: 5, tickInterval: 0.5, cooldown: [70, 62, 54], cost: [120, 120, 120], damage: { base: 30, perLevel: 20, ap: 0.25, type: 'magic' }, effects: [{ status: 'slow', id: 'lanh_dia_bong', pct: 0.4, duration: 0.6 }, { status: 'noDash', id: 'lanh_dia_bong_nd', duration: 0.6 }], desc: 'Vùng rối bóng 5s: địch bên trong chậm 40% và không thể lướt / Chớp Bước.' },
  },
  ai: { combo: ['s3', 's2', 's1'], preferredRange: 520, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc', recommendedBuild: ['giay_phap_su', 'truong_song', 'mu_sam', 'sach_pha_gioi', 'binh_suong_dong', 'ngoc_bang'],
});
