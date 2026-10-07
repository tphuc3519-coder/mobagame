import { COMBAT_EXTRA } from '../data/economy.js';

/** Chỉ số cuối = gốc + tăng/cấp × (cấp−1), cộng buff (02 §7). Tính lại mỗi tick. */
const NONE = {};
/** Bản đồ 5v5 rộng: mọi tướng chạy nhanh thêm 15% so với số gốc (vẫn giữ chênh lệch tốc độ riêng từng tướng) để nhịp trận cao hơn. */
export const HERO_SPEED_MULT = 1.15;
/** Máu tướng (gốc + tăng theo cấp) ×1.3: giao tranh lâu hơn, ít bị dồn chết trong một combo; máu cộng từ đồ/bùa giữ nguyên. */
export const HERO_HP_MULT = 1.3;
export function computeStats(world, e) {
  const d = e.data, b = d.base, p = d.perLevel || {}, L = e.level - 1;
  const bo = e.bonus || NONE, g = (k) => bo[k] || 0;
  const s = { maxHp: (b.maxHp + (p.maxHp || 0) * L) * (e.kind === 'hero' ? HERO_HP_MULT : 1) + g('maxHp'), maxMana: b.maxMana + (p.maxMana || 0) * L + g('maxMana'), baseAtk: b.atk + (p.atk || 0) * L, ap: (b.ap || 0) + g('ap'),
    armor: b.armor + (p.armor || 0) * L + g('armor'), mr: b.mr + (p.mr || 0) * L + g('mr'), range: b.range, armorPenPct: Math.min(COMBAT_EXTRA.penCap, g('armorPenPct')), armorPenFlat: g('armorPenFlat'),
    mrPen: g('mrPen'), mrPenPct: g('mrPenPct'), crit: Math.min(1, g('crit')), lifesteal: g('lifesteal'), spellvamp: g('spellvamp'), cdr: Math.min(COMBAT_EXTRA.cdrCap, g('cdr')),
    tenacity: Math.min(COMBAT_EXTRA.tenacityCap, g('tenacity')), basicReduce: g('basicReduce') };
  s.atk = s.baseAtk + g('atk');
  let asPct = (p.atkSpeedPct || 0) * L + g('atkSpeedPct'), msPct = 0, slow = 0, dmgReduce = 0, extraMana = 0;
  for (const st of e.statuses) {
    if (st.kind === 'statMod') {
      s.armor += st.armor || 0; s.mr += st.mr || 0; s.atk += st.atk || 0; s.ap += st.ap || 0; asPct += st.atkSpeedPct || 0; dmgReduce += st.dmgReducePct || 0;
      if (st.cdr) s.cdr = Math.min(COMBAT_EXTRA.cdrCap, s.cdr + st.cdr); if (st.regenMana) extraMana += st.regenMana;
    } else if (st.kind === 'haste') msPct = Math.max(msPct, st.pct);
    else if (st.kind === 'slow') slow = Math.max(slow, st.pct);
  }
  if (world.tick > (e.heatUntil || 0)) e.heat = 0;
  if (e.heat > 0) asPct += 0.05 * e.heat;
  s.ap *= 1 + g('apMult');
  s.atkSpeed = Math.min(2.5, b.atkSpeed * (1 + asPct));
  s.moveSpeed = b.moveSpeed > 0 ? Math.max(150, (b.moveSpeed * (e.kind === 'hero' ? HERO_SPEED_MULT : 1) + g('moveSpeed')) * (1 + msPct + g('moveSpeedPct')) * (1 - slow)) : 0;
  s.dmgReduce = dmgReduce;
  s.regenHp = 40 + 4 * L; // hồi thêm từ bùa/đồ cộng riêng trong items.js
  s.regenMana = 25 + 2.5 * L + extraMana;
  return s;
}

export function refreshStats(world, e) {
  const old = e.stats?.maxHp;
  e.stats = computeStats(world, e);
  if (old && old !== e.stats.maxHp) e.hp = Math.min(e.stats.maxHp, e.hp * (e.stats.maxHp / old));
  return e.stats;
}

/** Điểm kỹ năng: K1, K2 tối đa 6; K3 tối đa 3, mở ở cấp 4, 8, 12 (04 §1). */
export const maxSkillLevel = (slot, level) => (slot === 's3' ? Math.min(3, Math.floor(level / 4)) : 6);
export const canLevelSkill = (e, slot) => e.skillPoints > 0 && e.skillLevels[slot] < maxSkillLevel(slot, e.level);
export function levelSkill(e, slot) { if (!canLevelSkill(e, slot)) return false; e.skillLevels[slot]++; e.skillPoints--; return true; }
/** Tự nâng: K3 khi được → K1 → K2. */
export function autoLevel(e) {
  for (let guard = 0; e.skillPoints > 0 && guard < 20; guard++) {
    const a = e.skillLevels.s1 <= e.skillLevels.s2 ? ['s1', 's2'] : ['s2', 's1'];
    if (!['s3', ...a].some((s) => levelSkill(e, s))) break;
  }
}
export function setLevel(world, e, level) {
  e.skillPoints += Math.max(0, level - e.level); e.level = level;
  refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana;
  if (e.autoLevel) autoLevel(e);
}
