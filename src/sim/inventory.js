// Túi đồ: mua (tự tiêu thành phần), bán 60%, cộng chỉ số từ đồ + bùa (05 §1, §8).
import { ITEMS, ITEM_MAX, SELL_RATE, cleanBuild } from '../data/items.js';
import { CHARM_PAGES, PAGE_BY_ROLE, pageStats } from '../data/charms.js';

const NUMERIC = ['atk', 'ap', 'maxHp', 'maxMana', 'armor', 'mr', 'atkSpeedPct', 'crit', 'lifesteal', 'spellvamp', 'cdr', 'armorPenPct', 'armorPenFlat', 'mrPen', 'moveSpeed', 'moveSpeedPct', 'tenacity', 'regenHp'];

/** Tổng chỉ số từ đồ và bùa. Nội tại "Duy nhất": cùng khoá chỉ tính một lần. Gọi lại mỗi khi đổi túi đồ. */
export function computeBonus(e) {
  const b = Object.fromEntries(NUMERIC.map((k) => [k, 0]));
  b.uniq = {}; b.passives = new Set(); b.active = [];
  const add = (stats) => { for (const [k, v] of Object.entries(stats || {})) b[k] = (b[k] || 0) + v; };
  for (const id of e.items) {
    if (!id) continue;
    const it = ITEMS[id];
    add(it.stats);
    for (const [k, v] of Object.entries(it.unique || {})) b.uniq[k] = Math.max(b.uniq[k] || 0, v);
    if (it.passive) b.passives.add(it.passive);
  }
  b.armorPenPct += b.uniq.armorPenPct || 0; b.mrPenPct = b.uniq.mrPenPct || 0; b.critDmg = b.uniq.critDmg || 0;
  b.apMult = b.uniq.apMult || 0; b.basicReduce = b.uniq.basicReduce || 0;
  if (e.charm) add(pageStats(e.charm));
  return b;
}

export function equip(e, { items = [], charmId = null, spellId = null } = {}) {
  e.items = Array.from({ length: ITEM_MAX }, (_, i) => items[i] || null);
  const role = e.data.roles?.[0] ?? e.data.role; e.charm = CHARM_PAGES[charmId || PAGE_BY_ROLE[role] || 'dps'];
  if (spellId) e.spell = { id: spellId, ready: 0 };
  e.bonus = computeBonus(e);
}

export const ownedCount = (e, id) => e.items.filter((x) => x === id).length;
const usedSlots = (e) => e.items.filter(Boolean).length;

/** Kế hoạch mua: dùng lại thành phần đang có (đệ quy), trả { cost, consume:[slot], ok, reason }. */
export function planBuy(e, id) {
  const it = ITEMS[id]; if (!it) return { ok: false, reason: 'unknown' };
  if (it.auto) return { ok: false, reason: 'auto' };
  if (it.teamOnly && !e.teamMode) return { ok: false, reason: 'mode' };
  if (it.needSpell && e.spell?.id !== it.needSpell) return { ok: false, reason: 'spell' };
  const taken = new Set(), consume = [];
  const take = (want) => {
    let saved = 0;
    for (const c of ITEMS[want].from || []) {
      const slot = e.items.findIndex((x, i) => x === c && !taken.has(i));
      if (slot >= 0) { taken.add(slot); consume.push(slot); saved += ITEMS[c].cost; } else saved += take(c);
    }
    return saved;
  };
  const cost = it.cost - take(id);
  const left = e.items.filter((x, i) => x && !taken.has(i));
  if (left.length >= ITEM_MAX) return { ok: false, reason: 'full', cost, consume };
  for (const tag of it.tags || []) if (['boots', 'jungle', 'support'].includes(tag) && left.some((x) => ITEMS[x].tags?.includes(tag))) return { ok: false, reason: 'limit', cost, consume };
  return { ok: true, cost, consume };
}

export function buyItem(world, e, id) {
  const p = planBuy(e, id);
  if (!p.ok) return p;
  if (e.gold < p.cost) return { ok: false, reason: 'gold', cost: p.cost };
  e.gold -= p.cost;
  for (const s of p.consume) e.items[s] = null;
  e.items[e.items.indexOf(null)] = id;
  e.bonus = computeBonus(e);
  world.emit('buy', { id: e.id, item: id, cost: p.cost });
  return { ok: true, cost: p.cost };
}

export function sellItem(world, e, slot) {
  const id = e.items[slot]; if (!id) return { ok: false, reason: 'empty' };
  const g = Math.floor(ITEMS[id].cost * SELL_RATE);
  e.gold += g; e.items[slot] = null; e.bonus = computeBonus(e);
  world.emit('sell', { id: e.id, item: id, gold: g });
  return { ok: true, gold: g };
}

/** Món cần mua kế tiếp cho ô "Mua nhanh": nếu chưa đủ vàng cho cả món thì gợi thành phần rẻ nhất còn thiếu. */
export function quickBuys(e, count = 2) {
  const out = [], have = new Set(e.items.filter(Boolean));
  for (const id of cleanBuild(e.data.recommendedBuild)) {
    if (have.has(id) || out.length >= count) continue;
    let target = id, p = planBuy(e, id);
    if (!p.ok && p.reason !== 'gold') continue;
    if (p.cost > e.gold) {
      const missing = (ITEMS[id].from || []).filter((c) => !e.items.includes(c)).sort((a, b) => ITEMS[a].cost - ITEMS[b].cost)[0];
      if (missing) { target = missing; p = planBuy(e, missing); }
    }
    out.push({ id: target, goal: id, cost: p.cost ?? ITEMS[target].cost, ok: p.ok && e.gold >= p.cost });
  }
  return out;
}
