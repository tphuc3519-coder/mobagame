// Vàng, kinh nghiệm, cấp, hồi sinh, về thành (03 §A10, §B4). Không dùng ngẫu nhiên hay giờ thật.
import { ECON, econOf } from '../data/economy.js';
import { ITEMS } from '../data/items.js';
import { computeBonus } from './inventory.js';
import { MINIONS } from '../data/units.js';
import { T, dist } from './util.js';
import { refreshStats, autoLevel } from './stats.js';
import { applyStatus, isHardCC } from './status.js';
import { onMonsterKilled } from './jungle.js';

const heroes = (world, team) => world.entities.filter((h) => h.kind === 'hero' && h.team === team);

export function initEconomy(e) { e.gold = ECON.startGold; e.goldEarned = 0; e.killStreak = 0; e.deathStreak = 0; e.recall = null; }
export function addGold(world, e, n) { if (!e || n <= 0) return; n *= e.goldMult ?? 1; e.gold += n; e.goldEarned += n; world.emit('gold', { id: e.id, amount: Math.round(n) }); }

/** KN → lên cấp (tối đa 15). Bắt kịp +20% KN: 1v1 — thấp hơn địch ≥2 cấp; 5v5 — thấp hơn cấp trung bình cả trận ≥2 cấp (03 §A10). */
export function gainXp(world, e, amount) {
  if (!e || !e.alive || e.level >= ECON.maxLevel || amount <= 0) return;
  const E = econOf(world.map);
  if (E.catchUpVsAverage) {
    const all = world.entities.filter((h) => h.kind === 'hero'), avg = all.reduce((a, h) => a + h.level, 0) / Math.max(1, all.length);
    if (avg - e.level >= ECON.catchUpLevels) amount *= 1 + ECON.catchUpXp;
  } else if (heroes(world, 1 - e.team).some((f) => f.level - e.level >= ECON.catchUpLevels)) amount *= 1 + ECON.catchUpXp;
  e.xp += amount;
  while (e.level < ECON.maxLevel && e.xp >= ECON.xpNeed(e.level)) {
    e.xp -= ECON.xpNeed(e.level); e.level++; e.skillPoints++;
    const before = e.stats.maxHp; refreshStats(world, e); e.hp += e.stats.maxHp - before; // lên cấp: máu tối đa tăng bao nhiêu thì hồi bấy nhiêu
    if (e.autoLevel) autoLevel(e);
    world.emit('levelup', { id: e.id, level: e.level });
  }
  if (e.level >= ECON.maxLevel) e.xp = 0;
}

export const respawnSeconds = (world, e) => econOf(world.map).respawn(e.level, world.tick / 30);

/** Gọi khi một đơn vị chết (damage.js). src có thể là tướng, lính, trụ hoặc null; assists: tướng được tính hỗ trợ (hạ tướng). */
export function onKill(world, src, tgt, assists = []) {
  const killer = src?.kind === 'hero' ? src : null;
  const near = (team, pos, r) => heroes(world, team).filter((h) => h.alive && dist(h.pos, pos) <= r);
  if (tgt.kind === 'minion') {
    const d = MINIONS[tgt.minionType], foe = 1 - tgt.team, mult = world.map.laneMult ?? ECON.laneMult;
    const xp = (d.xp * mult) / Math.max(1, near(foe, tgt.pos, ECON.xpShareRadius).length);
    for (const h of near(foe, tgt.pos, ECON.xpShareRadius)) gainXp(world, h, xp);
    if (killer && killer.team === foe) { // lính không do tướng kết liễu: vàng mất
      if (!hasPassive(killer, 'supportLantern')) addGold(world, killer, d.gold * mult); // người mang Đèn Đồng Hành không nhận vàng lính tự kết liễu (05 §4)
      supportShare(world, killer, d.gold * mult);
    }
  } else if (tgt.kind === 'monster') {
    onMonsterKilled(world, killer, tgt, { addGold, gainXp });
  } else if (tgt.kind === 'tower') {
    const foe = 1 - tgt.team;
    for (const h of heroes(world, foe)) addGold(world, h, ECON.towerGold.team);
    if (killer) addGold(world, killer, ECON.towerGold.killer);
    for (const h of near(foe, tgt.pos, ECON.towerXpRadius)) gainXp(world, h, ECON.towerXp);
  } else if (tgt.kind === 'hero') {
    tgt.deathStreak++; const streak = tgt.killStreak; tgt.killStreak = 0; cancelRecall(world, tgt);
    if (killer && killer.team !== tgt.team) {
      killer.killStreak++; killer.deathStreak = 0;
      let g = ECON.killGold(streak);
      if (tgt.deathStreak >= 3) g = Math.max(ECON.killGoldFloor, g * (1 - 0.2 * (tgt.deathStreak - 2)));
      addGold(world, killer, g);
      if (assists.length) { const each = Math.min(ECON.assistGoldMax, (g * ECON.assistGoldShare) / assists.length); for (const h of assists) addGold(world, h, each); } // hỗ trợ chia 50% (03 §A10)
      // KN mạng hạ: chia đều cho người hạ và người hỗ trợ đứng trong bán kính (03 §A10); 1v1 không có hỗ trợ nên người hạ nhận đủ
      const R = econOf(world.map).killXpShareRadius, share = [killer, ...(R ? assists.filter((h) => h.alive && dist(h.pos, tgt.pos) <= R) : [])];
      for (const h of share) gainXp(world, h, ECON.killXp(tgt.level) / share.length);
    }
  }
}

export function startRecall(world, e) {
  if (!e.alive || isHardCC(e) || e.recall) return;
  e.recall = { start: world.tick, until: world.tick + T(ECON.recall.channel) };
  world.emit('recallStart', { id: e.id, dur: ECON.recall.channel });
}
export function cancelRecall(world, e) { if (e.recall) { e.recall = null; world.emit('recallCancel', { id: e.id }); } }

/** Mỗi tick: vàng thụ động và về thành. Chạy sau khi xử lý lệnh. Vàng thụ động chạy cả lúc tướng đang chết (như Liên Quân) —
 *  trước đây dừng, mỗi trận 5v5 mất ~2.400–2.600 vàng và đội đang thua bị thiệt thêm. */
export function updateEconomy(world) {
  const pg = econOf(world.map).passiveGold, on = world.tick / 30 >= pg.from;
  for (const e of world.entities) {
    if (e.kind !== 'hero') continue;
    if (on) { e.gold += pg.perSec / 30; e.goldEarned += pg.perSec / 30; }
    if (!e.alive) continue;
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

const hasPassive = (e, p) => !!e?.bonus?.passives?.has(p);

/** Đèn Đồng Hành (05 §4): đồng minh kết liễu lính khi người mang đèn đứng trong 800 → người mang đèn nhận vàng bằng giá lính đó
 *  (người kết liễu vẫn nhận đủ). Tích đủ 600 vàng từ nội tại thì đèn tự nâng thành Đèn Soi Đường. */
export function supportShare(world, killer, gold) {
  for (const h of heroes(world, killer.team)) {
    if (h === killer || !h.alive || !hasPassive(h, 'supportLantern') || dist(h.pos, killer.pos) > 800) continue;
    addGold(world, h, gold);
    h.flags.lanternGold = (h.flags.lanternGold || 0) + gold;
    const slot = h.items.indexOf('den_dong_hanh'), up = ITEMS.den_dong_hanh.upgrade;
    if (slot >= 0 && up && h.flags.lanternGold >= up.gold) { h.items[slot] = up.to; h.bonus = computeBonus(h); world.emit('itemUpgrade', { id: h.id, from: 'den_dong_hanh', to: up.to }); }
  }
}
