/** Chỉ số cuối = gốc + tăng/cấp × (cấp−1), cộng buff (02 §7). Tính lại mỗi tick. */
export function computeStats(world, e) {
  const d = e.data, b = d.base, p = d.perLevel || {}, L = e.level - 1;
  const s = { maxHp: b.maxHp + (p.maxHp || 0) * L, maxMana: b.maxMana + (p.maxMana || 0) * L, atk: b.atk + (p.atk || 0) * L, ap: b.ap || 0,
    armor: b.armor + (p.armor || 0) * L, mr: b.mr + (p.mr || 0) * L, range: b.range, armorPenPct: 0, armorPenFlat: 0 };
  let asPct = (p.atkSpeedPct || 0) * L, msPct = 0, slow = 0, dmgReduce = 0;
  for (const st of e.statuses) {
    if (st.kind === 'statMod') {
      s.armor += st.armor || 0; s.mr += st.mr || 0; s.atk += st.atk || 0; s.ap += st.ap || 0; asPct += st.atkSpeedPct || 0; dmgReduce += st.dmgReducePct || 0;
    } else if (st.kind === 'haste') msPct = Math.max(msPct, st.pct);
    else if (st.kind === 'slow') slow = Math.max(slow, st.pct);
  }
  if (world.tick > (e.heatUntil || 0)) e.heat = 0;
  if (e.heat > 0) asPct += 0.05 * e.heat;
  s.atkSpeed = Math.min(2.5, b.atkSpeed * (1 + asPct));
  s.moveSpeed = b.moveSpeed > 0 ? Math.max(150, b.moveSpeed * (1 + msPct) * (1 - slow)) : 0;
  s.dmgReduce = dmgReduce;
  s.regenHp = 40 + 4 * L; s.regenMana = 25 + 2.5 * L;
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
