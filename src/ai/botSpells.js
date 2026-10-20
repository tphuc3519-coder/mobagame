// Bot dùng 4 phép chiến thuật (06 §4.5b): Tắt Đèn (towerOff), Loá Mắt (flashStun), Trống Trận (warDrum), Bùa Mỏi (hex) — chọn theo `kind`.
// Chỉ khi thấy thời cơ mới bốc ngẫu nhiên theo độ khó (DIFFICULTY.spell), nên bot mang phép cũ không tiêu thêm số ngẫu nhiên nào.
import { dist } from '../sim/util.js';
import { SPELLS } from '../data/spells.js';
import { isHardCC } from '../sim/status.js';
import { spellTarget, enemyHeroesNear } from '../sim/spells.js';
import { canKill, hp01, tankedBy } from './perception.js';

const KINDS = new Set(['towerOff', 'flashStun', 'warDrum', 'hex']);
/** Công trình đang nhắm ai: kẻ khiêu khích còn hạn, không thì mục tiêu chuỗi bắn. */
export const towerAim = (s, world) => (s.aggro != null && world.tick < s.aggroUntil ? s.aggro : s.streakTarget);
const edge = (a, b) => dist(a.pos, b.pos) - (b.radius || 0);

function readySpell(bot) {
  const { world, e } = bot, sp = e.spell && SPELLS[e.spell.id];
  if (!sp || !KINDS.has(sp.kind) || world.tick < e.spell.ready || isHardCC(e)) return null;
  return sp;
}
/** Có thời cơ: bốc theo độ khó rồi ra lệnh. */
function go(bot) {
  if (bot.rng.next() >= (bot.diff.spell ?? 1)) return false;
  bot.world.command(bot.e.id, { type: 'spell' }); return true;
}

/** Trong combo (đánh / dọn trụ, quái lớn): trả true nếu đã ra lệnh dùng phép. */
export function spellFight(bot, t, mode) {
  const sp = readySpell(bot); if (!sp || !t || !t.alive) return false;
  const { world, e } = bot;
  switch (sp.kind) {
    case 'warDrum':
      if (mode === 'fight' && t.isHero && t.team !== e.team && edge(e, t) <= e.stats.range + 120) return go(bot);
      if (mode === 'farm' && edge(e, t) <= e.stats.range + 60 && ((t.structure && t.hp > t.stats.maxHp * 0.25) || (t.kind === 'monster' && t.boss && t.hp > 1500))) return go(bot);
      return false;
    case 'flashStun': {
      if (mode !== 'fight') return false;
      const list = spellTarget(world, e, sp); if (!list.length) return false;
      const main = list.includes(t) ? t : list[0], tanky = (e.data.roles || []).some((r) => r === 'tank' || r === 'support');
      return list.length >= 2 || canKill(world, e, main) || hp01(main) < 0.45 || tanky ? go(bot) : false;
    }
    case 'hex': {
      if (mode !== 'fight') return false;
      const h = spellTarget(world, e, sp);
      return h && (hp01(e) < 0.55 || hp01(h) < 0.5) ? go(bot) : false;
    }
    case 'towerOff': {
      const s = spellTarget(world, e, sp); if (!s) return false;
      if (mode === 'fight') return t.isHero && t.team !== e.team && edge(s, t) <= s.stats.range && canKill(world, e, t) ? go(bot) : false;
      if (mode === 'farm') return t === s && s.hp < s.stats.maxHp * 0.35 && !tankedBy(world, s, e.team) ? go(bot) : false;
      return false;
    }
    default: return false;
  }
}

/** Thoát thân (survival): trả true nếu đã ra lệnh. */
export function spellSurvive(bot, foe) {
  const sp = readySpell(bot); if (!sp) return false;
  const { world, e } = bot;
  switch (sp.kind) {
    case 'flashStun': return hp01(e) < 0.35 && spellTarget(world, e, sp).length > 0 ? go(bot) : false;
    case 'hex': return hp01(e) < 0.35 && !!spellTarget(world, e, sp) ? go(bot) : false;
    case 'towerOff': {
      const s = spellTarget(world, e, sp); if (!s) return false;
      const aim = world.byId(towerAim(s, world));
      if (!aim || aim.team !== e.team || aim.kind !== 'hero') return false; // trụ đang bắn mình hoặc đồng đội tướng
      return hp01(e) < 0.5 || enemyHeroesNear(world, e, Infinity).some((h) => dist(h.pos, s.pos) <= 700) ? go(bot) : false;
    }
    default: return false;
  }
}
