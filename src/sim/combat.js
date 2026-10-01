// Đòn đánh thường: hẹn giờ theo tốc đánh, gây sát thương ở thời điểm `delay` (animation chỉ để nhìn — 02 §13.5).
import { T, dist } from './util.js';
import { isHardCC, removeStatus, tauntSource, applyStatus } from './status.js';
import { dealDamage } from './damage.js';
import { nearestEnemy } from './targeting.js';
import { spawnProjectile } from './projectiles.js';
import { makeCtx } from './ctx.js';
import { onBasicAttack, onBasicHit } from './items.js';

function nextRange(e) { return e.statuses.find((s) => s.kind === 'nextRange')?.value || 0; }

/** Kết quả một đòn đánh: sát thương thường + phần thêm (nội tại, phục kích), rồi hook onHit. */
function resolveHit(world, owner, target, pay) {
  if (!owner || !target.alive) return;
  const it = onBasicAttack(world, owner, { amount: pay.amount, targetMaxHp: target.stats.maxHp });
  const dealt = dealDamage(world, owner, target, it.amount, 'physical', { basic: true });
  for (const x of it.extra) dealDamage(world, owner, target, x.amount, x.type);
  onBasicHit(world, owner, target, dealt);
  const burn = owner.statuses.find((s) => s.burn)?.burn; // Ấn Hoả: thiêu đốt + làm chậm
  if (burn && target.alive) { applyStatus(world, target, { status: 'dot', id: 'an_hoa_burn', dps: burn.dps + burn.perLevel * (owner.level - 1), duration: burn.duration, type: 'true' }, owner); applyStatus(world, target, { status: 'slow', id: 'an_hoa_slow', pct: burn.slow, duration: 1 }, owner); }
  if (pay.bonusMagic) dealDamage(world, owner, target, pay.bonusMagic, 'magic');
  if (pay.ambush) {
    dealDamage(world, owner, target, pay.ambush.base + pay.ambush.perLevel * (pay.level - 1) + pay.ambush.adBonus * Math.max(0, owner.stats.atk - owner.data.base.atk), 'physical');
    applyStatus(world, target, { status: 'slow', pct: pay.ambush.slow, duration: pay.ambush.slowDuration }, owner);
  }
  if (pay.hooks && target.isHero) owner.data.passive?.hooks?.onHit?.(makeCtx(world, owner, { target }));
}

function fire(world, e, target, iv) {
  if (!e.alive || !target.alive || isHardCC(e)) return;
  removeStatus(e, 'stealth');
  const ctx = makeCtx(world, e, { target, bonusMagic: 0, extraArrow: 0 });
  e.data.passive?.hooks?.onAttack?.(ctx);
  const amb = e.flags.ambush; e.flags.ambush = null;
  const level = Math.max(1, e.skillLevels.s3);
  const pay = { amount: e.stats.atk, bonusMagic: ctx.bonusMagic, ambush: amb, level, hooks: true };
  removeStatus(e, 'nextRange');
  const ba = e.data.basicAttack;
  if (ba.melee) { resolveHit(world, e, target, pay); return; }
  const shoot = (p, delayTicks) => world.pending.push({ tick: world.tick + delayTicks, run: () => {
    if (!e.alive || !target.alive) return;
    spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: 0, dy: 0, speed: ba.projectile.speed, remaining: 9999, homing: target.id, kind: 'basic', onHit: (t) => resolveHit(world, e, t, p) });
  } });
  shoot(pay, 0);
  if (ctx.extraArrow) shoot({ amount: e.stats.atk * ctx.extraArrow, bonusMagic: 0, hooks: false }, T(0.12));
  void iv;
}

export function updateCombat(world) {
  for (const e of world.entities) {
    if (!e.alive || !e.attacking || e.data.dummy || isHardCC(e) || e.dash) continue;
    if (world.tick < e.attackReady) continue;
    const forced = tauntSource(e) != null ? world.byId(tauntSource(e)) : null;
    const range = e.stats.range + nextRange(e);
    const target = forced && forced.alive ? (dist(forced.pos, e.pos) - forced.radius <= range ? forced : null) : nearestEnemy(world, e, range, e.preferTarget);
    if (!target) continue;
    const iv = 1 / e.stats.atkSpeed;
    e.attackReady = world.tick + T(iv);
    e.atkIndex = (e.atkIndex || 0) + 1;
    e.facing = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x);
    const delay = Math.min(e.data.basicAttack.delay ?? 0.25, iv * 0.8);
    world.emit('attack', { id: e.id, n: e.atkIndex, interval: iv, delay }); // delay: thời điểm gây sát thương, để animation khớp cú chạm
    world.pending.push({ tick: world.tick + T(delay), run: () => fire(world, e, target, iv) });
  }
}
