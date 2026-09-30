import { T } from './util.js';
import { removeStatus, isStealthed } from './status.js';

/** Sát thương nhận = raw × 100 / (100 + giáp hiệu dụng) (02 §7). Chuẩn không giảm. */
export function mitigate(src, tgt, raw, type) {
  if (type === 'true') return raw;
  if (type === 'physical') {
    const st = src?.stats;
    const eff = Math.max(0, tgt.stats.armor * (1 - (st?.armorPenPct || 0)) - (st?.armorPenFlat || 0));
    return (raw * 100) / (100 + eff);
  }
  return (raw * 100) / (100 + Math.max(0, tgt.stats.mr));
}

/** Gây sát thương: hook onDealDamage, giảm giáp/KP, khiên, chết. Trả sát thương thực vào máu. */
export function dealDamage(world, src, tgt, amount, type = 'physical') {
  if (!tgt || !tgt.alive || amount <= 0) return 0;
  const hook = src?.data?.passive?.hooks?.onDealDamage;
  if (hook) { const ctx = { world, self: src, target: tgt, amount, type }; hook(ctx); amount = ctx.amount; }
  let dmg = mitigate(src, tgt, amount, type) * (1 - Math.min(0.8, tgt.stats.dmgReduce || 0));
  let absorbed = 0;
  tgt.shields.sort((a, b) => a.until - b.until);
  for (const sh of tgt.shields) {
    if (dmg <= 0) break;
    const a = Math.min(sh.amount, dmg); sh.amount -= a; dmg -= a; absorbed += a;
  }
  tgt.shields = tgt.shields.filter((s) => s.amount > 0.01);
  dmg = Math.max(0, dmg);
  tgt.hp -= dmg;
  tgt.lastDamagedTick = world.tick;
  if (isStealthed(tgt)) removeStatus(tgt, 'stealth');
  world.emit('damage', { id: tgt.id, src: src?.id, amount: Math.round(dmg + absorbed), dmgType: type, shield: absorbed > 0 && dmg <= 0 });
  if (tgt.hp <= 0) kill(world, src, tgt);
  return dmg;
}

function kill(world, src, tgt) {
  if (tgt.data?.dummy) { tgt.hp = tgt.stats.maxHp; world.emit('reset', { id: tgt.id }); return; } // hình nộm hồi đầy
  tgt.hp = 0; tgt.alive = false; tgt.deaths++; tgt.respawnTick = world.tick + T(3);
  tgt.dash = null; tgt.moveDir = { x: 0, y: 0 }; tgt.attacking = false; tgt.statuses = []; tgt.shields = [];
  if (src) src.kills++;
  world.emit('death', { id: tgt.id, killer: src?.id });
}

export function heal(world, tgt, amount) {
  if (!tgt.alive) return 0;
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
