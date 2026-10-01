// Công trình: trụ, nhà chính, Suối Đèn (03 §A4, §B2).
import { structuresOf } from '../data/maps.js';
import { dist } from './util.js';
import { T } from './util.js';
import { dealDamage } from './damage.js';
import { spawnProjectile } from './projectiles.js';
import { enemiesOf } from './targeting.js';
import { canSee } from './vision.js';

export function spawnStructures(world) {
  const { map } = world;
  for (const s of structuresOf(map)) {
    const data = { name: s.kind === 'core' ? 'Nhà chính' : 'Trụ', structure: true, base: { maxHp: s.hp, maxMana: 0, atk: s.atk, ap: 0, armor: s.armor, mr: s.armor, atkSpeed: s.rate, moveSpeed: 0, range: s.range }, perLevel: {}, basicAttack: {}, skills: {} };
    const e = world.spawnEntity({ kind: s.kind, structure: true, team: s.team, sid: s.id, data, radius: s.radius, pos: { x: s.x, y: s.y }, invulnUntil: s.invulnUntil, invulnerable: !!s.invulnUntil,
      streak: 0, streakTarget: null, aggro: null, aggroUntil: 0, height: s.kind === 'core' ? 900 : 700 });
    e.hp = e.stats.maxHp;
  }
  for (const team of [0, 1]) {
    const f = map.fountain;
    world.spawnEntity({ kind: 'fountain', structure: true, noTarget: true, team, data: { name: 'Suối Đèn', base: { maxHp: 1, maxMana: 0, atk: 0, ap: 0, armor: 0, mr: 0, atkSpeed: 1, moveSpeed: 0, range: f.range }, perLevel: {}, basicAttack: {}, skills: {} },
      radius: 60, pos: team ? map.mirror(f.x, f.y) : { x: f.x, y: f.y } });
  }
}

/** Trụ đang bị đánh sau khi tướng địch đánh tướng phe trụ trong tầm: đổi mục tiêu ngay (luật 2). */
export function onHeroDamaged(world, src, tgt) {
  for (const s of world.entities) {
    if (!s.structure || s.noTarget || !s.alive || s.team !== tgt.team) continue;
    if (dist(s.pos, tgt.pos) - tgt.radius <= s.stats.range && dist(s.pos, src.pos) - src.radius <= s.stats.range) { s.aggro = src.id; s.aggroUntil = world.tick + world.map.tower.aggroLinger; }
  }
}

function pickTarget(world, s) {
  const range = s.stats.range, inRange = enemiesOf(world, s).filter((t) => !t.noTarget && canSee(s.team, t) && dist(t.pos, s.pos) - t.radius <= range);
  if (!inRange.length) return null;
  if (s.aggro != null && world.tick < s.aggroUntil) { const a = inRange.find((t) => t.id === s.aggro); if (a) return a; }
  const near = (list) => list.reduce((b, t) => (!b || dist(t.pos, s.pos) < dist(b.pos, s.pos) ? t : b), null);
  return near(inRange.filter((t) => t.kind === 'minion')) || near(inRange);
}

export function updateStructures(world) {
  const { map } = world;
  for (const s of world.entities) {
    if (!s.structure || !s.alive) continue;
    if (s.kind === 'fountain') {
      for (const t of world.entities) {
        if (!t.alive || t.kind === 'minion' || t.structure) continue;
        const d = dist(t.pos, s.pos);
        if (t.team !== s.team && d - t.radius <= map.fountain.range) dealDamage(world, s, t, map.fountain.dps / 30, 'true');
        else if (t.team === s.team && d <= map.fountain.healRadius && t.kind === 'hero') { t.hp = Math.min(t.stats.maxHp, t.hp + (t.stats.maxHp * map.fountain.healPct) / 30); t.mana = Math.min(t.stats.maxMana, t.mana + (t.stats.maxMana * map.fountain.healPct) / 30); }
      }
      continue;
    }
    // luật bất tử: trụ trong chờ trụ ngoài vỡ, nhà chính chờ trụ trong vỡ
    if (s.invulnUntil) { // chuỗi: tới khi trụ đứng trước vỡ; mảng: tới khi MỘT trong các trụ vỡ (nhà chính 5v5)
      const peers = world.entities.filter((p) => p.structure && p.team === s.team && [].concat(s.invulnUntil).includes(p.sid));
      s.invulnerable = Array.isArray(s.invulnUntil) ? peers.length > 0 && peers.every((p) => p.alive) : peers.some((p) => p.alive);
    }
    // hồi máu khi lâu không bị đánh (nhà chính)
    if (s.kind === 'core' && world.tick - s.lastDamagedTick > T(8)) s.hp = Math.min(s.stats.maxHp, s.hp + 20 / 30);
    if (world.tick < s.attackReady) continue;
    const t = pickTarget(world, s);
    if (!t) { s.streak = 0; s.streakTarget = null; continue; }
    s.attackReady = world.tick + T(1 / s.stats.atkSpeed);
    if (s.streakTarget === t.id) s.streak++; else { s.streak = 0; s.streakTarget = t.id; }
    const isMinion = t.kind === 'minion';
    const amount = isMinion ? t.stats.maxHp * (t.data.towerPct ?? map.tower.minionPct) : s.stats.atk * (1 + Math.min(map.tower.streakMax, map.tower.streakStep * s.streak));
    world.emit('towerShot', { id: s.id, target: t.id });
    spawnProjectile(world, { owner: s.id, x: s.pos.x, y: s.pos.y, dx: 0, dy: 0, speed: 2600, remaining: 99999, homing: t.id, kind: 'tower',
      onHit: (tt) => dealDamage(world, s, tt, amount, isMinion ? 'true' : 'physical') });
  }
}
