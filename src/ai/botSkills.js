// Bot dùng kỹ năng/phép/đồ: ngắm dự đoán có sai số theo độ khó (06 §4.5).
import { dist, norm } from '../sim/util.js';
import { smiteTarget, smiteDamage } from '../sim/spells.js';
import { SPELLS } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { ready, velocity, hp01 } from './perception.js';

const D2R = Math.PI / 180;
function rotate(d, deg) { const a = deg * D2R, c = Math.cos(a), s = Math.sin(a); return { x: d.x * c - d.y * s, y: d.x * s + d.y * c }; }

/** Điểm dự đoán của mục tiêu sau thời gian bay. */
export function predict(e, t, speed) {
  const v = velocity(t), time = speed ? dist(e.pos, t.pos) / speed : 0.25;
  return { x: t.pos.x + v.x * time, y: t.pos.y + v.y * time };
}

/** Thử tung một kỹ năng vào mục tiêu; trả true nếu đã ra lệnh. mode: 'fight' | 'trade' | 'escape' | 'farm'. */
export function trySkill(bot, slot, t, mode) {
  const { world, e, rng, diff } = bot;
  if (!ready(world, e, slot)) return false;
  const sk = e.data.skills[slot], d = t ? dist(e.pos, t.pos) - (t.radius || 0) : Infinity;
  const err = () => (rng.next() * 2 - 1) * diff.aimErr;
  let aim = null;
  switch (sk.type) {
    case 'skillshot': case 'cone': {
      if (!t || d > sk.range * (sk.type === 'cone' ? 0.95 : 0.92)) return false;
      const p = predict(e, t, sk.speed); aim = rotate(norm(p.x - e.pos.x, p.y - e.pos.y), err()); break;
    }
    case 'aoeCircle': case 'zone': {
      if (!t || d > sk.range + (sk.radius || 0) * 0.5) return false;
      const p = predict(e, t, 0), k = Math.min(1, sk.range / Math.max(1, dist(e.pos, p)));
      const off = rotate({ x: p.x - e.pos.x, y: p.y - e.pos.y }, err() * 0.5);
      aim = { x: e.pos.x + off.x * k, y: e.pos.y + off.y * k }; break;
    }
    case 'dash': {
      if (mode === 'escape') { aim = bot.homeDir(); break; }
      if (!t || d > sk.range + 60) return false;
      if (mode === 'trade' && !(e.data.roles || []).some((r) => r === 'fighter' || r === 'tank' || r === 'assassin')) return false;
      aim = rotate(norm(t.pos.x - e.pos.x, t.pos.y - e.pos.y), err()); break;
    }
    case 'aoeSelf': if (!t || d > (sk.radius || 300) * 0.9) return false; break;
    case 'selfBuff': if (mode === 'farm' || !t || d > 650) return false; break;
    case 'allyTarget': if (hp01(e) > 0.75 && mode !== 'escape') return false; aim = { x: 0, y: 0 }; break;
    default: return false;
  }
  world.command(e.id, { type: 'cast', slot, aim });
  return true;
}

/** Combo theo ai.combo của tướng; mỗi lần nghĩ tung tối đa một chiêu (tự nhiên hơn). */
export function combo(bot, t, mode) {
  const order = bot.e.data.ai?.combo || ['s1', 's2', 's3'];
  for (const slot of order) {
    if ((mode === 'trade' || mode === 'farm') && slot === 's3') continue; // giữ chiêu cuối
    if (mode === 'farm' && bot.e.data.skills[slot]?.type === 'dash') continue;
    if (trySkill(bot, slot, t, mode)) return slot;
  }
  return null;
}

/** Phép bổ trợ và đồ kích hoạt để thoát thân / kết liễu. */
export function survival(bot, foe) {
  const { world, e } = bot, h = hp01(e), near = foe && foe.alive && dist(foe.pos, e.pos) < 500;
  const sp = e.spell && SPELLS[e.spell.id], spReady = sp && world.tick >= e.spell.ready;
  const slot = e.items.findIndex((i) => i && ITEMS[i].active);
  if (slot >= 0 && h < bot.cfg.itemHp && near && world.tick >= (e.itemCd?.[e.items[slot]] || 0)) { world.command(e.id, { type: 'useItem', slot }); return true; }
  if (h < 0.45 && e.restore && world.tick >= e.restore.ready && !e.recall) { world.command(e.id, { type: 'restore' }); return true; }
  if (spReady && sp.id === 'thu_hoach') { // đi rừng: Trừng Trị kết liễu quái (cướp mục tiêu lớn/bùa) khi máu quái ≤ sát thương sét
    const t = smiteTarget(world, e, sp);
    if (t && t.kind === 'monster' && t.hp <= smiteDamage(e, sp) + (t.boss ? 60 : 0)) { world.command(e.id, { type: 'spell' }); return true; }
    if (t && t.kind === 'hero' && near && t.hp <= sp.heroDamage) { world.command(e.id, { type: 'spell' }); return true; }
  }
  if (!spReady || !near) return false;
  if (sp.id === 'chop_buoc' && h < bot.cfg.escapeHp) { world.command(e.id, { type: 'spell', aim: bot.homeDir() }); return true; }
  if (sp.id === 'hoi_phuc' && h < 0.3) { world.command(e.id, { type: 'spell' }); return true; }
  if (sp.id === 'tram_hon' && foe.hp < (foe.stats.maxHp - foe.hp) * 0.14 + 30) { world.command(e.id, { type: 'spell' }); return true; }
  if (sp.id === 'giai_troi' && e.statuses.some((s) => s.kind === 'stun' || s.kind === 'root')) { world.command(e.id, { type: 'spell' }); return true; }
  if (sp.id === 'gio_luot' && h < 0.3) { world.command(e.id, { type: 'spell' }); return true; }
  return false;
}
