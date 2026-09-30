// Khuôn dựng file tướng (04 §7): điền chỉ số gốc/tăng theo vai, tướng chỉ ghi phần khác biệt.
const ROLE = {
  tank:      { base: { maxHp: 1000, maxMana: 320, atk: 58, ap: 0, armor: 36, mr: 32, atkSpeed: 0.62, moveSpeed: 310, range: 160 }, per: { maxHp: 130, maxMana: 35, atk: 4.5, armor: 4.2, mr: 2.2, atkSpeedPct: 0.015 } },
  fighter:   { base: { maxHp: 860, maxMana: 300, atk: 70, ap: 0, armor: 28, mr: 28, atkSpeed: 0.7, moveSpeed: 325, range: 170 }, per: { maxHp: 102, maxMana: 32, atk: 6.8, armor: 3.4, mr: 1.9, atkSpeedPct: 0.025 } },
  assassin:  { base: { maxHp: 700, maxMana: 260, atk: 74, ap: 0, armor: 24, mr: 26, atkSpeed: 0.78, moveSpeed: 345, range: 160 }, per: { maxHp: 85, maxMana: 25, atk: 7.5, armor: 3, mr: 1.6, atkSpeedPct: 0.028 } },
  mage:      { base: { maxHp: 650, maxMana: 470, atk: 50, ap: 0, armor: 21, mr: 28, atkSpeed: 0.62, moveSpeed: 315, range: 520 }, per: { maxHp: 80, maxMana: 46, atk: 3.2, armor: 2.8, mr: 1.6, atkSpeedPct: 0.012 } },
  marksman:  { base: { maxHp: 640, maxMana: 300, atk: 66, ap: 0, armor: 22, mr: 26, atkSpeed: 0.75, moveSpeed: 320, range: 540 }, per: { maxHp: 78, maxMana: 30, atk: 5.5, armor: 3, mr: 1.5, atkSpeedPct: 0.03 } },
  support:   { base: { maxHp: 720, maxMana: 420, atk: 52, ap: 0, armor: 26, mr: 30, atkSpeed: 0.62, moveSpeed: 315, range: 480 }, per: { maxHp: 92, maxMana: 42, atk: 3.6, armor: 3.2, mr: 1.8, atkSpeedPct: 0.012 } },
};

/** spec: { id, name, title, role, roles, lanes, difficulty, base?, basicAttack?, passive, skills, ai, defaultSpell, recommendedBuild, origin } */
export function hero(spec) {
  const r = ROLE[spec.role];
  if (!r) throw new Error('Vai không hợp lệ: ' + spec.role);
  const { role, base, ...rest } = spec;
  return {
    resource: 'mana',
    ...rest,
    base: { ...r.base, ...(base || {}) },
    perLevel: { ...r.per },
    art: `heroes/${spec.id}/hero.art.json`,
  };
}
