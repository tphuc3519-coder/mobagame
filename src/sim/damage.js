import { T, dist } from './util.js';
import { removeStatus, isStealthed, isInvulnerable } from './status.js';
import { onKill, respawnSeconds } from './economy.js';
import { tryRevive, onMagicTaken } from './items.js';
import { revealOnAttack } from './vision.js';

/** Sát thương nhận = raw × 100 / (100 + giáp hiệu dụng) (02 §7). Chuẩn không giảm. */
export function mitigate(src, tgt, raw, type) {
  if (type === 'true') return raw;
  if (type === 'physical') {
    const st = src?.stats;
    const eff = Math.max(0, tgt.stats.armor * (1 - (st?.armorPenPct || 0)) - (st?.armorPenFlat || 0));
    return (raw * 100) / (100 + eff);
  }
  const st = src?.stats;
  return (raw * 100) / (100 + Math.max(0, tgt.stats.mr * (1 - (st?.mrPenPct || 0)) - (st?.mrPen || 0)));
}

/** Chống phá lén: công trình nhận ít hơn 60% sát thương khi không có lính bên tấn công trong bán kính 900 (03 §A4). */
function backdoorFactor(world, src, tgt) {
  if (!tgt.structure || !src) return 1;
  const R = world.map.tower.minionAggroRadius;
  return world.entities.some((m) => m.kind === 'minion' && m.alive && m.team === src.team && dist(m.pos, tgt.pos) <= R) ? 1 : world.map.tower.backdoorTaken;
}

/** Gây sát thương: hook, bất tử, giảm giáp/KP, khiên, chết. Trả sát thương thực vào máu. */
export function dealDamage(world, src, tgt, amount, type = 'physical', opts = {}) {
  if (!tgt || !tgt.alive || amount <= 0 || tgt.noTarget) return 0;
  if (tgt.invulnerable || isInvulnerable(tgt)) { world.emit('immune', { id: tgt.id }); return 0; }
  if (src && src !== tgt) revealOnAttack(world, src, tgt); // đánh người thì lộ mặt (bụi, sương mù)
  const hook = src?.data?.passive?.hooks?.onDealDamage;
  if (hook) { const ctx = { world, self: src, target: tgt, amount, type }; hook(ctx); amount = ctx.amount; }
  let dmg = mitigate(src, tgt, amount, type) * (1 - Math.min(0.8, tgt.stats.dmgReduce || 0)) * (opts.basic ? 1 - (tgt.stats.basicReduce || 0) : 1) * backdoorFactor(world, src, tgt);
  let absorbed = 0;
  tgt.shields.sort((a, b) => a.until - b.until);
  for (const sh of tgt.shields) {
    if (dmg <= 0) break;
    const a = Math.min(sh.amount, dmg); sh.amount -= a; dmg -= a; absorbed += a;
  }
  tgt.shields = tgt.shields.filter((s) => s.amount > 0.01);
  dmg = Math.max(0, dmg);
  tgt.hp -= dmg;
  tgt.lastDamagedTick = world.tick; if (src) tgt.lastAttacker = src.id;
  if (dmg > 0 && src?.kind === 'hero' && !opts.dot && !opts.reflect) { // hút máu (đòn đánh) và hút máu phép (kỹ năng)
    const rate = opts.basic && type === 'physical' ? src.stats.lifesteal : !opts.basic && type === 'magic' ? src.stats.spellvamp : 0;
    if (rate > 0) heal(world, src, dmg * rate);
  }
  if (type === 'magic' && tgt.kind === 'hero') onMagicTaken(world, tgt);
  if (isStealthed(tgt)) removeStatus(tgt, 'stealth');
  if (src?.kind === 'hero' && tgt.kind === 'hero') world.onHeroDamaged?.(src, tgt);
  world.emit('damage', { id: tgt.id, src: src?.id, amount: Math.round(dmg + absorbed), dmgType: type, shield: absorbed > 0 && dmg <= 0 });
  if (tgt.hp <= 0 && !tryRevive(world, tgt)) kill(world, src, tgt);
  return dmg;
}

function kill(world, src, tgt) {
  if (tgt.kind === 'dummy') { tgt.hp = tgt.stats.maxHp; world.emit('reset', { id: tgt.id }); return; } // hình nộm hồi đầy
  tgt.hp = 0; tgt.alive = false; tgt.deaths++; tgt.deadTick = world.tick;
  tgt.dash = null; tgt.moveDir = { x: 0, y: 0 }; tgt.attacking = false; tgt.statuses = []; tgt.shields = [];
  if (src?.kind === 'hero' && tgt.kind === 'hero') src.kills++;
  onKill(world, src, tgt);
  if (tgt.structure) { world.emit('structureDown', { id: tgt.id, sid: tgt.sid, team: tgt.team, kind: tgt.kind }); return; }
  if (tgt.kind === 'hero') tgt.respawnTick = world.tick + T(respawnSeconds(tgt));
  world.emit('death', { id: tgt.id, killer: src?.id });
}

export function heal(world, tgt, amount) {
  if (!tgt.alive) return 0;
  const ah = tgt.statuses.find((s) => s.kind === 'antiheal'); if (ah) amount *= 1 - ah.pct; // giảm hồi máu (Giáp Gai)
  const a = Math.min(tgt.stats.maxHp - tgt.hp, amount); tgt.hp += a;
  if (a > 0.5) world.emit('heal', { id: tgt.id, amount: Math.round(a) });
  return a;
}
export function addShield(world, tgt, amount, seconds, id = null) {
  if (!tgt.alive) return;
  const until = seconds >= 9000 ? Infinity : world.tick + T(seconds);
  if (id) { const o = tgt.shields.find((s) => s.id === id); if (o) { o.amount = Math.max(o.amount, amount); o.until = until; return; } }
  tgt.shields.push({ amount, until, id });
  world.emit('shield', { id: tgt.id, amount: Math.round(amount) });
}
export const hasShield = (tgt, id) => tgt.shields.some((s) => s.id === id);
