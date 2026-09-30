// Nhận thức của bot: chỉ đọc trạng thái thế giới, không sửa (06 §4.2).
import { dist } from '../sim/util.js';
import { mitigate } from '../sim/damage.js';
import { amountOf } from '../sim/ctx.js';
import { lv } from '../data/heroes/_levels.js';

export const foeHero = (world, e) => world.entities.find((h) => h.kind === 'hero' && h.team !== e.team) || null;
export const minionsOf = (world, team) => world.entities.filter((m) => m.kind === 'minion' && m.alive && m.team === team);
export const towersOf = (world, team) => world.entities.filter((s) => (s.kind === 'tower' || s.kind === 'core') && s.alive && s.team === team);
export const fountainOf = (world, team) => world.entities.find((s) => s.kind === 'fountain' && s.team === team);
export const hp01 = (e) => e.hp / e.stats.maxHp;
export const ready = (world, e, slot) => {
  const sk = e.data.skills?.[slot], L = e.skillLevels[slot];
  return !!sk && L > 0 && world.tick >= e.cooldowns[slot] && e.mana >= lv(sk.cost, L);
};

/** Trụ địch đang che điểm p (tính cả lề an toàn). */
export function towerCovering(world, team, p, margin = 0) {
  return towersOf(world, 1 - team).find((t) => dist(t.pos, p) <= t.stats.range + margin) || null;
}
/** Trụ có lính phe `team` đỡ đòn trong tầm. */
export const tankedBy = (world, tower, team) => minionsOf(world, team).some((m) => dist(m.pos, tower.pos) <= tower.stats.range - 40);

/** Sát thương dồn ước lượng: kỹ năng sẵn sàng + 3 đòn đánh (06 §4.2). */
export function burst(world, e, t) {
  let raw = 0, magic = 0;
  for (const slot of ['s1', 's2', 's3']) {
    if (!ready(world, e, slot)) continue;
    const d = e.data.skills[slot].damage; if (!d) continue;
    const a = amountOf(d, e.skillLevels[slot], e);
    if (d.type === 'magic') magic += a; else if (d.type === 'true') raw += a * (100 + t.stats.armor) / 100; else raw += a;
  }
  raw += 3 * e.stats.atk;
  return mitigate(e, t, raw, 'physical') + mitigate(e, t, magic, 'magic');
}
export const shieldOf = (e) => e.shields.reduce((a, s) => a + s.amount, 0);
export const canKill = (world, e, t) => t && t.alive && burst(world, e, t) >= t.hp + shieldOf(t);

/** Vận tốc ước lượng (cm/s) từ vị trí tick trước. */
export const velocity = (e) => ({ x: (e.pos.x - e.prevPos.x) * 30, y: (e.pos.y - e.prevPos.y) * 30 });
