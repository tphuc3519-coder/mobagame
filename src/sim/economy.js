// Vàng, kinh nghiệm, cấp, hồi sinh, về thành (03 §A10, §B4). Không dùng ngẫu nhiên hay giờ thật.
import { ECON } from '../data/economy.js';
import { MINIONS } from '../data/units.js';
import { T, dist } from './util.js';
import { refreshStats, autoLevel } from './stats.js';
import { applyStatus, isHardCC } from './status.js';
import { onMonsterKilled } from './jungle.js';

const heroes = (world, team) => world.entities.filter((h) => h.kind === 'hero' && h.team === team);

export function initEconomy(e) { e.gold = ECON.startGold; e.goldEarned = 0; e.killStreak = 0; e.deathStreak = 0; e.recall = null; }
export function addGold(world, e, n) { if (!e || n <= 0) return; n *= e.goldMult ?? 1; e.gold += n; e.goldEarned += n; world.emit('gold', { id: e.id, amount: Math.round(n) }); }

/** KN → lên cấp (tối đa 15). Tướng thấp hơn địch ≥2 cấp nhận thêm 20% KN. */
export function gainXp(world, e, amount) {
  if (!e || !e.alive || e.level >= ECON.maxLevel || amount <= 0) return;
  const foes = heroes(world, 1 - e.team);
  if (foes.some((f) => f.level - e.level >= ECON.catchUpLevels)) amount *= 1 + ECON.catchUpXp;
  e.xp += amount;
  while (e.level < ECON.maxLevel && e.xp >= ECON.xpNeed(e.level)) {
    e.xp -= ECON.xpNeed(e.level); e.level++; e.skillPoints++;
    const before = e.stats.maxHp; refreshStats(world, e); e.hp += e.stats.maxHp - before; // lên cấp: máu tối đa tăng bao nhiêu thì hồi bấy nhiêu
    if (e.autoLevel) autoLevel(e);
    world.emit('levelup', { id: e.id, level: e.level });
  }
  if (e.level >= ECON.maxLevel) e.xp = 0;
}

export const respawnSeconds = (e) => ECON.respawn(e.level);

/** Gọi khi một đơn vị chết (damage.js). src có thể là tướng, lính, trụ hoặc null. */
export function onKill(world, src, tgt) {
  const killer = src?.kind === 'hero' ? src : null;
  const near = (team, pos, r) => heroes(world, team).filter((h) => h.alive && dist(h.pos, pos) <= r);
  if (tgt.kind === 'minion') {
    const d = MINIONS[tgt.minionType], foe = 1 - tgt.team;
    const xp = (d.xp * (world.map.laneMult ?? ECON.laneMult)) / Math.max(1, near(foe, tgt.pos, ECON.xpShareRadius).length);
    for (const h of near(foe, tgt.pos, ECON.xpShareRadius)) gainXp(world, h, xp);
    if (killer && killer.team === foe) addGold(world, killer, d.gold * (world.map.laneMult ?? ECON.laneMult)); // lính không do tướng kết liễu: vàng mất
  } else if (tgt.kind === 'monster') {
    onMonsterKilled(world, killer, tgt, { addGold, gainXp });
  } else if (tgt.kind === 'tower') {
    const foe = 1 - tgt.team;
    for (const h of heroes(world, foe)) addGold(world, h, ECON.towerGold.team);
    if (killer) addGold(world, killer, ECON.towerGold.killer);
    for (const h of near(foe, tgt.pos, ECON.towerXpRadius)) gainXp(world, h, ECON.towerXp);
  } else if (tgt.kind === 'hero') {
    tgt.deathStreak++; const streak = tgt.killStreak; tgt.killStreak = 0; tgt.recall = null;
    if (killer && killer.team !== tgt.team) {
      killer.killStreak++; killer.deathStreak = 0;
      let g = ECON.killGold(streak);
      if (tgt.deathStreak >= 3) g = Math.max(ECON.killGoldFloor, g * (1 - 0.2 * (tgt.deathStreak - 2)));
      addGold(world, killer, g); gainXp(world, killer, ECON.killXp(tgt.level));
    }
  }
}

export function startRecall(world, e) {
  if (!e.alive || isHardCC(e) || e.recall) return;
  e.recall = { start: world.tick, until: world.tick + T(ECON.recall.channel) };
  world.emit('recallStart', { id: e.id, dur: ECON.recall.channel });
}
export function cancelRecall(world, e) { if (e.recall) { e.recall = null; world.emit('recallCancel', { id: e.id }); } }

/** Mỗi tick: vàng thụ động và về thành. Chạy sau khi xử lý lệnh. */
export function updateEconomy(world) {
  const pg = ECON.passiveGold, on = world.tick / 30 >= pg.from;
  for (const e of world.entities) {
    if (e.kind !== 'hero' || !e.alive) continue;
    if (on) { e.gold += pg.perSec / 30; e.goldEarned += pg.perSec / 30; }
    const r = e.recall; if (!r) continue;
    const m = Math.hypot(e.moveDir.x, e.moveDir.y);
    if (e.lastDamagedTick >= r.start || m > 0.05 || e.attacking || isHardCC(e) || e.dash) { cancelRecall(world, e); continue; }
    if (world.tick >= r.until) {
      e.recall = null; e.pos.x = e.spawn.x; e.pos.y = e.spawn.y; e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y;
      applyStatus(world, e, { status: 'haste', id: 'recallHaste', pct: ECON.recall.haste.pct, duration: ECON.recall.haste.duration }, e);
      world.emit('recalled', { id: e.id });
    }
  }
}
