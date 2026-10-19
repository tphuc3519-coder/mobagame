// Bot né chiêu (06 §4.5): thấy đạn kỹ năng của tướng địch đang bay thẳng về phía mình, hoặc đứng trong vòng cảnh báo của chiêu giáng
// xuống điểm (world.dangers — skills.js ghi lúc chiêu bắt đầu) thì bước ngang ra. Mỗi đạn / vòng chỉ xét một lần, né được theo tỉ lệ
// `dodge` của độ khó (bot dễ hay đứng trúng). Trả hướng né (đơn vị) hoặc null. Chỉ đọc trạng thái trận, không đổi gì.
import { T } from '../sim/util.js';

const seenOf = (bot) => { if (!bot.seen || bot.seen.size > 120) bot.seen = new Set(); return bot.seen; };

export function dodgeDir(bot) {
  const { world, e, diff, rng } = bot, seen = seenOf(bot);
  for (const p of world.projectiles) {
    if (p.homing != null || p.kind === 'basic' || p.kind === 'tower' || seen.has(p.id)) continue;
    const o = world.byId(p.owner); if (!o || o.team === e.team || !o.isHero) continue;
    const rx = e.pos.x - p.x, ry = e.pos.y - p.y, along = rx * p.dx + ry * p.dy;
    if (along < 0 || along > Math.min(p.remaining, 1000)) continue;
    const side = rx * p.dy - ry * p.dx; // khoảng cách lệch ngang có dấu tới đường bay
    if (Math.abs(side) > (p.width || 40) / 2 + e.radius + 25) continue;
    seen.add(p.id);
    if (rng.next() >= diff.dodge) continue;
    const s = side >= 0 ? 1 : -1; return { x: p.dy * s, y: -p.dx * s };
  }
  for (const z of world.dangers || []) {
    if (z.team === e.team || world.tick > z.until || seen.has(z.key)) continue;
    const dx = e.pos.x - z.x, dy = e.pos.y - z.y, d = Math.hypot(dx, dy); if (d > z.r + e.radius) continue;
    seen.add(z.key);
    if (rng.next() >= diff.dodge) continue;
    if (d < 1) { const a = rng.next() * Math.PI * 2; return { x: Math.cos(a), y: Math.sin(a) }; }
    return { x: dx / d, y: dy / d };
  }
  return null;
}

/** Gọi đầu mỗi lượt nghĩ của bot: đang né thì tiếp tục bước ngang (trả true — lượt nghĩ dừng ở đây), thấy nguy hiểm mới thì bắt đầu né. */
export function dodgeStep(bot, move) {
  const { world, e } = bot;
  if (!bot.dodge || world.tick > bot.dodge.until) { bot.dodge = null; const d = dodgeDir(bot); if (d) bot.dodge = { dir: d, until: world.tick + T(0.45) }; }
  if (!bot.dodge) return false;
  move(bot, { x: e.pos.x + bot.dodge.dir.x * 300, y: e.pos.y + bot.dodge.dir.y * 300 }, 5);
  return true;
}
