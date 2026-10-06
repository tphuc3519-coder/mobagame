// Tung kỹ năng: kiểm tra hồi chiêu/mana/khống chế, rồi chạy theo kiểu (skillTypes) — 04 §2.
import { lv } from '../data/heroes/_levels.js';
import { T, dist, norm, dirTo, clampToMap } from './util.js';
import { applyStatus, removeStatus, isSilenced, isHardCC } from './status.js';
import { dealDamage, heal, addShield } from './damage.js';
import { enemiesOf, alliesOf } from './targeting.js';
import { spawnProjectile, spawnZone } from './projectiles.js';
import { makeCtx, amountOf, resolveEffect } from './ctx.js';
import { onSkillDamage, onCastSkill } from './items.js';
import { COMBAT_EXTRA } from '../data/economy.js';
import { forceMove } from './movement.js';

/** Sát thương + hiệu ứng lên một mục tiêu, rồi gọi hook onHit/onSkillHit của tướng. */
export function skillHit(world, owner, target, cast) {
  const { skill, level } = cast;
  if (skill.damage) { dealDamage(world, owner, target, amountOf(skill.damage, level, owner), skill.damage.type); onSkillDamage(world, owner, target); }
  for (const eff of skill.effects || []) applyStatus(world, target, resolveEffect(eff, level), owner);
  const hooks = owner.data.passive?.hooks;
  const ctx = makeCtx(world, owner, { target, cast, skill });
  if (target.isHero) cast.hitHero = true;
  if (target.isHero) hooks?.onHit?.(ctx);
  hooks?.onSkillHit?.(ctx);
  if (skill.onHitHero === 'cutS2' && target.isHero) { const left = owner.cooldowns.s2 - world.tick; if (left > 0) owner.cooldowns.s2 = world.tick + Math.floor(left / 2); }
}

/** Nhịp đứng ra chiêu (giây) của chiêu có hướng/điểm sau khi chiêu phát ra: đủ để thấy tướng quay về hướng chiêu rồi mới chạy tiếp. */
export const CAST_LOCK = 0.25;

const selfEffects = (world, e, list, level) => { for (const eff of list || []) applyStatus(world, e, resolveEffect(eff, level), e); };
const inRadius = (world, e, pos, r) => enemiesOf(world, e).filter((t) => dist(t.pos, pos) - t.radius <= r);

function aimDir(e, aim) { return aim && (aim.x || aim.y) ? norm(aim.x, aim.y) : { x: Math.cos(e.facing), y: Math.sin(e.facing) }; }
function aimPoint(world, e, aim, range) {
  const p = aim ? { x: aim.x, y: aim.y } : { x: e.pos.x + Math.cos(e.facing) * range * 0.7, y: e.pos.y + Math.sin(e.facing) * range * 0.7 };
  const d = dist(p, e.pos);
  if (d > range) { p.x = e.pos.x + ((p.x - e.pos.x) / d) * range; p.y = e.pos.y + ((p.y - e.pos.y) / d) * range; }
  return clampToMap(world.map, p);
}

const HANDLERS = {
  skillshot(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim);
    spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: d.x, dy: d.y, speed: skill.speed, remaining: skill.range, width: skill.width, pierce: !!skill.pierce, kind: skill.hook ? 'hook' : 'skill', slot: cast.slot,
      onHit: (t) => {
        skillHit(world, e, t, cast);
        if (skill.hook && e.alive) { // móc kéo: lôi mục tiêu về sát trước mặt người móc, choáng suốt lúc bị kéo + thêm hook.stun
          const dd = dirTo(e.pos, t.pos), stop = e.radius + t.radius + 20, to = { x: e.pos.x + dd.x * stop, y: e.pos.y + dd.y * stop };
          const time = forceMove(world, t, to, skill.hook.speed || 1600) || 0;
          applyStatus(world, t, { status: 'stun', id: 'hook_stun', duration: time + (skill.hook.stun || 0) }, e);
          world.emit('hook', { id: e.id, target: t.id, dur: time, slot: cast.slot });
        }
        return true;
      } });
    world.emit('shot', { id: e.id, slot: cast.slot });
  },
  dash(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim);
    e.dash = { dx: d.x, dy: d.y, perTick: (skill.speed || 2000) / 30, left: skill.range, along: !!skill.hitAlongPath, stop: !!skill.stopOnHero, hit: new Set(), cast };
    selfEffects(world, e, skill.selfEffects, cast.level);
    if (skill.nextAttackRange) applyStatus(world, e, { status: 'nextRange', value: skill.nextAttackRange, duration: 6 }, e);
  },
  aoeSelf(world, e, cast) {
    const { skill, level } = cast;
    world.emit('aoe', { id: e.id, x: e.pos.x, y: e.pos.y, radius: skill.radius, dur: 0.35, slot: cast.slot, team: e.team });
    for (const t of inRadius(world, e, e.pos, skill.radius)) {
      skillHit(world, e, t, cast);
      if (skill.pullIn != null && dist(t.pos, e.pos) > skill.pullIn + e.radius) { // xoáy: hút địch về quanh mình
        const dd = dirTo(e.pos, t.pos), r = skill.pullIn + e.radius + t.radius;
        const time = forceMove(world, t, { x: e.pos.x + dd.x * r, y: e.pos.y + dd.y * r }, skill.pullSpeed || 1400) || 0;
        applyStatus(world, t, { status: 'stun', id: 'pull_stun', duration: time }, e);
      }
    }
    for (const a of [e, ...alliesOf(world, e, skill.radius)]) {
      if (skill.allyShield) addShield(world, a, amountOf(skill.allyShield, level, e), skill.allyShield.duration);
      for (const eff of skill.allyEffects || []) applyStatus(world, a, resolveEffect(eff, level), e);
    }
    selfEffects(world, e, skill.selfEffects, level);
  },
  aoeCircle(world, e, cast, aim) {
    const { skill, level } = cast, p = aimPoint(world, e, aim, skill.range), delay = skill.delay || 0.5;
    world.emit('aoe', { id: e.id, x: p.x, y: p.y, radius: skill.radius, dur: delay, slot: cast.slot, team: e.team, warn: true });
    if (skill.untargetableDuringDelay) { applyStatus(world, e, { status: 'untargetable', duration: delay }, e); world.emit('jump', { id: e.id, dur: delay }); }
    world.pending.push({ tick: world.tick + T(delay), run: () => {
      if (!e.alive) return;
      if (skill.untargetableDuringDelay) { e.pos.x = p.x; e.pos.y = p.y; e.prevPos.x = p.x; e.prevPos.y = p.y; }
      world.emit('impact', { id: e.id, x: p.x, y: p.y, radius: skill.radius, slot: cast.slot });
      for (const t of inRadius(world, e, p, skill.radius)) skillHit(world, e, t, cast);
      if (skill.heat && cast.hitHero) makeCtx(world, e).addHeat(e, skill.heat);
    } });
  },
  cone(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim), half = ((skill.angle || 90) / 2) * Math.PI / 180;
    world.emit('cone', { id: e.id, x: e.pos.x, y: e.pos.y, dx: d.x, dy: d.y, range: skill.range, angle: skill.angle, slot: cast.slot, team: e.team });
    for (const t of enemiesOf(world, e)) {
      if (dist(t.pos, e.pos) - t.radius > skill.range) continue;
      const dd = dirTo(e.pos, t.pos);
      if (Math.acos(Math.max(-1, Math.min(1, dd.x * d.x + dd.y * d.y))) <= half) skillHit(world, e, t, cast);
    }
  },
  zone(world, e, cast, aim) {
    const { skill } = cast, p = aimPoint(world, e, aim, skill.range);
    world.emit('aoe', { id: e.id, x: p.x, y: p.y, radius: skill.radius, dur: skill.duration, slot: cast.slot, team: e.team, zone: true });
    spawnZone(world, { owner: e.id, x: p.x, y: p.y, radius: skill.radius, until: world.tick + T(skill.duration), interval: T(skill.tickInterval),
      onTick: () => { for (const t of inRadius(world, e, p, skill.radius)) skillHit(world, e, t, cast); } });
  },
  selfBuff(world, e, cast) {
    const { skill, level } = cast;
    if (skill.shield) addShield(world, e, amountOf(skill.shield, level, e), skill.shield.duration);
    selfEffects(world, e, skill.selfEffects, level);
    if (skill.heat) makeCtx(world, e).addHeat(e, skill.heat);
    if (skill.ambush) e.flags.ambush = skill.ambush;
  },
  allyTarget(world, e, cast, aim) {
    const { skill, level } = cast, d = aimDir(e, aim);
    let best = e, bs = -1;
    for (const a of alliesOf(world, e, skill.range)) { const dd = dirTo(e.pos, a.pos), s = dd.x * d.x + dd.y * d.y; if (s > 0.6 && s > bs) { bs = s; best = a; } }
    if (skill.heal) heal(world, best, amountOf(skill.heal, level, e));
    if (skill.shield) addShield(world, best, amountOf(skill.shield, level, e), skill.shield.duration);
    world.emit('aoe', { id: e.id, target: best.id, x: best.pos.x, y: best.pos.y, radius: 120, dur: 0.5, slot: cast.slot, team: e.team });
  },
};

/** Trả { ok, reason }. aim: hướng (kiểu direction) hoặc điểm thế giới (kiểu point). */
export function castSkill(world, e, slot, aim) {
  const skill = e.data.skills?.[slot], level = e.skillLevels[slot];
  if (!skill || !e.alive) return { ok: false, reason: 'none' };
  if (!level) return { ok: false, reason: 'locked' };
  if (world.tick < e.cooldowns[slot]) return { ok: false, reason: 'cooldown' };
  if (isSilenced(e) || isHardCC(e)) return { ok: false, reason: 'cc' };
  if (e.dash) return { ok: false, reason: 'busy' };
  const cost = lv(skill.cost, level);
  if (e.mana < cost) return { ok: false, reason: 'mana' };
  const handler = HANDLERS[skill.type];
  if (!handler) return { ok: false, reason: 'unsupported' };
  e.mana -= cost;
  e.cooldowns[slot] = world.tick + T(lv(skill.cooldown, level) * (1 - Math.min(COMBAT_EXTRA.cdrCap, e.stats.cdr || 0)));
  e.recall = null; onCastSkill(world, e);
  if (skill.type !== 'selfBuff') removeStatus(e, 'stealth'); // ra đòn làm lộ hình
  if (skill.aim === 'direction' || skill.aim === 'point') { const d = skill.aim === 'point' && aim ? norm(aim.x - e.pos.x, aim.y - e.pos.y) : aim ? norm(aim.x, aim.y) : null; if (d && (d.x || d.y)) e.facing = Math.atan2(d.y, d.x); }
  // khoá ra chiêu: đứng yên, mặt giữ hướng chiêu tới lúc chiêu phát ra (+ một nhịp ngắn), sau đó mới đi/quay theo cần di chuyển.
  // Lướt tự di chuyển nên không khoá; chiêu nhảy tới điểm (Đe Trời) khoá suốt lúc bay.
  const lock = skill.type === 'dash' ? 0 : skill.untargetableDuringDelay ? (skill.delay || 0.5) : skill.aim === 'direction' || skill.aim === 'point' ? (skill.windup || 0) + CAST_LOCK : skill.windup || 0;
  if (lock > 0) { e.castUntil = world.tick + T(lock); e.castFacing = e.facing; }
  const cast = { slot, skill, level, flags: {}, hitHero: false };
  world.emit('cast', { id: e.id, slot, skillType: skill.type, delay: skill.windup ?? skill.delay ?? 0, lock }); // delay: độ trễ tới lúc chiêu trúng (animation khớp theo art.hitTime); lock: thời gian đứng ra chiêu
  // windup: chiêu phát ra sau một nhịp vung (đúng lúc ống/búa chạm đất trong animation); bị khống chế cứng hoặc chết trong lúc vung thì mất chiêu
  if (skill.windup) world.pending.push({ tick: world.tick + T(skill.windup), run: () => { if (e.alive && !isHardCC(e)) handler(world, e, cast, aim); } });
  else handler(world, e, cast, aim);
  return { ok: true };
}
