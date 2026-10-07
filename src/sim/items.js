// Nội tại và kích hoạt của đồ (05 §4). Chỉ số phẳng nằm ở inventory.js; ở đây là hiệu ứng có điều kiện.
import { ITEMS } from '../data/items.js';
import { COMBAT_EXTRA } from '../data/economy.js';
import { T, dist } from './util.js';
import { applyStatus } from './status.js';
import { dealDamage } from './damage.js';
import { alliesOf, enemiesOf } from './targeting.js';

const has = (e, p) => !!e.bonus?.passives.has(p);

/** Đòn đánh của chủ đồ: tính chí mạng và các sát thương cộng thêm; trả về { amount, extra:[{amount,type}], crit }. */
export function onBasicAttack(world, e, pay) {
  const s = e.stats;
  let amount = pay.amount;
  let crit = false;
  if (s.crit > 0 && world.rng.next() < Math.min(1, s.crit)) { amount *= COMBAT_EXTRA.critBase + (e.bonus?.critDmg || 0); crit = pay.crit = true; }
  const extra = [];
  if (e.flags.spellblade && world.tick >= (e.flags.sbCd || 0)) { extra.push({ amount: s.baseAtk, type: 'physical' }); e.flags.spellblade = false; e.flags.sbCd = world.tick + T(2); }
  if (has(e, 'forgehammer')) extra.push({ amount: 0.02 * pay.targetMaxHp, type: 'physical' });
  if (has(e, 'chainlight')) { e.flags.chain = (e.flags.chain || 0) + 1; if (e.flags.chain % 3 === 0) extra.push({ amount: 80, type: 'magic' }); }
  if (has(e, 'windbow')) {
    const f = e.flags; f.windStacks = world.tick < (f.windUntil || 0) ? Math.min(3, (f.windStacks || 0) + 1) : 1; f.windUntil = world.tick + T(2);
    applyStatus(world, e, { status: 'haste', id: 'windbow', pct: 0.05 * f.windStacks, duration: 2 }, e);
  }
  return { amount, extra, crit };
}

/** Bên bị đánh thường: Khiên Đá, Giáp Gai. dealt = sát thương đã vào máu. */
export function onBasicHit(world, attacker, victim, dealt) {
  if (has(attacker, 'frostbow') && victim.alive) applyStatus(world, victim, { status: 'slow', id: 'frostbow', pct: 0.15, duration: 1 }, attacker);
  if (has(victim, 'stoneshield')) applyStatus(world, attacker, { status: 'statMod', id: 'stoneshield', atkSpeedPct: -0.15, duration: 2 }, victim);
  if (has(victim, 'thorns')) {
    applyStatus(world, attacker, { status: 'antiheal', id: 'thorns', pct: 0.4, duration: 2 }, victim);
    if (dealt > 0) dealDamage(world, victim, attacker, dealt * 0.25, 'physical', { reflect: true });
  }
}

/** Sau khi kỹ năng của chủ đồ trúng. */
export function onSkillDamage(world, e, target) {
  if (has(e, 'frostgem')) applyStatus(world, target, { status: 'slow', id: 'frostgem', pct: 0.2, duration: 1 }, e);
  if (has(e, 'emberstaff') && target.alive) applyStatus(world, target, { status: 'dot', id: 'emberstaff', dps: target.stats.maxHp * 0.01, duration: 2, type: 'magic' }, e);
}
export function onCastSkill(world, e) { if (has(e, 'spellblade') && world.tick >= (e.flags.sbCd || 0)) e.flags.spellblade = true; }
export function onMagicTaken(world, e) { if (has(e, 'mistcloak')) e.flags.mistUntil = world.tick + T(3); }

/** Mặt Nạ Hồi Sinh: chặn cú chí tử. Trả true nếu đã cứu. */
export function tryRevive(world, e) {
  if (!has(e, 'revive') || world.tick < (e.flags.reviveReady || 0)) return false;
  e.flags.reviveReady = world.tick + T(120);
  e.hp = e.stats.maxHp * 0.2;
  applyStatus(world, e, { status: 'invuln', duration: 2 }, e);
  world.emit('revive', { id: e.id });
  return true;
}

/** Hồi máu theo thời gian và hào quang. Gọi mỗi tick cho tướng còn sống. */
export function updateItems(world, e) {
  if (!e.bonus) return;
  const max = e.stats.maxHp, per = 1 / 30;
  if (has(e, 'oldheart') && world.tick - e.lastDamagedTick > 150) e.hp = Math.min(max, e.hp + max * 0.015 * per);
  if (has(e, 'mistcloak') && world.tick < (e.flags.mistUntil || 0)) e.hp = Math.min(max, e.hp + max * 0.02 * per);
  if (e.bonus.regenHp) e.hp = Math.min(max, e.hp + e.bonus.regenHp * per);
  if (has(e, 'bloodrage') && e.hp < max * 0.5) applyStatus(world, e, { status: 'statMod', id: 'bloodrage', atkSpeedPct: 0.25, duration: 0.3 }, e);
  if (has(e, 'sunaura') && world.tick % 30 === 0) for (const t of enemiesOf(world, e)) if (!t.structure && dist(t.pos, e.pos) <= 300 + (t.radius || 0)) dealDamage(world, e, t, 30 + max * 0.01, 'magic');
  if (has(e, 'lanternaura')) for (const a of alliesOf(world, e, 700)) applyStatus(world, a, { status: 'statMod', id: 'lanternaura', armor: 10, mr: 10, duration: 0.3 }, e);
}

/** Đồ kích hoạt (Bình Sương Đông). */
export function useItem(world, e, slot) {
  const id = e.items[slot], act = id && ITEMS[id].active;
  if (!act) return { ok: false, reason: 'none' };
  e.itemCd ||= {};
  if (world.tick < (e.itemCd[id] || 0)) return { ok: false, reason: 'cooldown' };
  e.itemCd[id] = world.tick + T(act.cooldown);
  if (act.id === 'stasis') { e.dash = null; e.moveDir = { x: 0, y: 0 }; applyStatus(world, e, { status: 'stasis', duration: act.duration }, e); }
  world.emit('itemUse', { id: e.id, item: id });
  return { ok: true };
}
