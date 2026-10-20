// Tung kỹ năng: kiểm tra hồi chiêu/mana/khống chế, rồi chạy theo kiểu (skillTypes) — 04 §2.
// Kiểu cơ bản ở đây; kiểu mới (đường thẳng, trói nối, phân thân, lao khoá mục tiêu, đạn khoá mục tiêu) ở skillTypes.js.
import { lv } from '../data/heroes/_levels.js';
import { T, dist, norm, dirTo, clampToMap } from './util.js';
import { applyStatus, removeStatus, isSilenced, isHardCC, isRooted, cannotDash } from './status.js';
import { dealDamage, heal, addShield } from './damage.js';
import { enemiesOf, alliesOf } from './targeting.js';
import { spawnProjectile, spawnZone } from './projectiles.js';
import { makeCtx, amountOf, resolveEffect } from './ctx.js';
import { onSkillDamage, onCastSkill } from './items.js';
import { COMBAT_EXTRA } from '../data/economy.js';
import { forceMove } from './movement.js';
import { cancelRecall } from './economy.js';
import { INSTANT, applyInstant } from './effects.js';
import { EXTRA_HANDLERS, pickSkillTarget, recastAgain, rewind, startSlashes } from './skillTypes.js';
import { startSuppress } from './suppress.js';

/** Áp danh sách hiệu ứng của chiêu lên `t`: hiệu ứng tức thời (đẩy, hút, giải, cắt chiêu) hoặc trạng thái. Hiệu ứng đánh dấu `atEnd`
 *  (cuối lúc trói) và `ifAllTicksHit` (trúng đủ nhịp) do kiểu chiêu tự áp đúng lúc; `include` để áp riêng các hiệu ứng đó. */
export function applyEffects(world, owner, t, list, level, origin = null, include = null) {
  for (const eff of list || []) {
    if (include ? !eff[include] : eff.atEnd || eff.ifAllTicksHit) continue;
    if (INSTANT.has(eff.status)) applyInstant(world, t, eff, owner, origin);
    else applyStatus(world, t, resolveEffect(eff, level), owner);
  }
}

/** Sát thương + hiệu ứng lên một mục tiêu, rồi gọi hook onHit/onSkillHit của tướng.
 *  opt: mult (hệ số sát thương nhịp này), noDamage, noEffects, origin (tâm đẩy/hút). cast.dmgAdd / cast.dmgMult / cast.extraEffects: hook
 *  onCast của tướng đổi đòn này (vd phát bắn được nạp, đòn thứ ba của chuỗi). */
export function skillHit(world, owner, target, cast, opt = {}) {
  const { skill, level } = cast;
  if (skill.damage && !opt.noDamage) {
    const amt = (amountOf(skill.damage, level, owner) + (cast.dmgAdd || 0)) * (opt.mult ?? 1) * (cast.dmgMult ?? 1);
    dealDamage(world, owner, target, amt, skill.damage.type, { slot: cast.slot, armorPenPct: skill.params?.armorPenPct || 0 }); // slot: hiệu ứng trúng đòn riêng của chiêu
    onSkillDamage(world, owner, target);
  }
  if (!opt.noEffects) applyEffects(world, owner, target, cast.extraEffects ? [...(skill.effects || []), ...cast.extraEffects] : skill.effects, level, opt.origin);
  if (skill.suppress && skill.type !== 'tether' && target.isHero && !opt.noEffects && !cast.flags.suppressed) { cast.flags.suppressed = true; startSkillSuppress(world, owner, target, cast); } // áp chế: một lần mỗi lượt tung, tướng trúng đầu tiên
  const hooks = owner.data.passive?.hooks;
  const ctx = makeCtx(world, owner, { target, cast, skill });
  if (target.isHero) cast.hitHero = true;
  if (target.isHero) hooks?.onHit?.(ctx);
  hooks?.onSkillHit?.(ctx);
  if (skill.onHitHero === 'cutS2' && target.isHero) { const left = owner.cooldowns.s2 - world.tick; if (left > 0) owner.cooldowns.s2 = world.tick + Math.floor(left / 2); }
}

/** Áp chế từ chiêu có `suppress: { duration?, channel?, breakRange? }` (suppress.js): mặc định thời lượng = skill.duration, đứt khi kéo giãn
 *  quá 115% tầm chiêu; hết giờ (không đứt) thì áp các hiệu ứng `atEnd` của chiêu. extra: via, every, onTick, onEnd (dây bóng — skillTypes.js). */
export function startSkillSuppress(world, e, t, cast, extra = {}) {
  const { skill, level } = cast, S = skill.suppress;
  return startSuppress(world, e, t, { duration: lv(S.duration ?? skill.duration ?? 1, level), channel: S.channel !== false, breakRange: S.breakRange ?? (skill.range || 600) * COMBAT_EXTRA.suppress.breakMult,
    slot: cast.slot, via: extra.via, every: extra.every, onTick: extra.onTick,
    onEnd: (ok) => { if (ok && t.alive) applyEffects(world, e, t, skill.effects, level, null, 'atEnd'); extra.onEnd?.(ok); } });
}

/** Nhịp đứng ra chiêu (giây) của chiêu có hướng/điểm sau khi chiêu phát ra: đủ để thấy tướng quay về hướng chiêu rồi mới chạy tiếp. */
export const CAST_LOCK = 0.25;

export const selfEffects = (world, e, list, level, duration = null) => {
  for (const eff of list || []) {
    if (INSTANT.has(eff.status)) { applyInstant(world, e, eff, e); continue; }
    const s = resolveEffect(eff, level); if (s.duration == null && duration != null) s.duration = duration;
    applyStatus(world, e, s, e);
  }
};
export const inRadius = (world, e, pos, r) => enemiesOf(world, e).filter((t) => dist(t.pos, pos) - t.radius <= r);

export function aimDir(e, aim) { return aim && (aim.x || aim.y) ? norm(aim.x, aim.y) : { x: Math.cos(e.facing), y: Math.sin(e.facing) }; }
export function aimPoint(world, e, aim, range) {
  const p = aim ? { x: aim.x, y: aim.y } : { x: e.pos.x + Math.cos(e.facing) * range * 0.7, y: e.pos.y + Math.sin(e.facing) * range * 0.7 };
  const d = dist(p, e.pos);
  if (d > range) { p.x = e.pos.x + ((p.x - e.pos.x) / d) * range; p.y = e.pos.y + ((p.y - e.pos.y) / d) * range; }
  return clampToMap(world.map, p);
}
const hooksOf = (e) => e.data.passive?.hooks;
const missHook = (world, e, cast) => hooksOf(e)?.onSkillMiss?.(makeCtx(world, e, { cast, skill: cast.skill }));

/** Biến thể ngẫu nhiên của một phát bắn (04 §3): Pháo Giấy (nổ vùng), Đá Lộn Ngược (mạnh hơn + choáng ngắn). Bốc bằng rng của trận. */
function variant(world, e, cast) {
  const P = cast.skill.params; if (!P) return null;
  if (P.bombChance && world.rng.next() < P.bombChance) return 'bomb';
  if (P.overheadChance && world.rng.next() < P.overheadChance) {
    cast.dmgAdd = (cast.dmgAdd || 0) + (P.overheadDmg || 0) - (cast.skill.damage?.base || 0);
    cast.extraEffects = [...(cast.extraEffects || []), { status: 'stun', id: 'overhead_stun', duration: P.overheadStun ?? 0.5 }];
    return 'overhead';
  }
  return null;
}
/** Nổ vùng có giảm dần: sát thương 100% ở tâm, còn 50% ở mép (tính tới mép mục tiêu). */
function explode(world, e, cast, x, y) {
  const r = cast.skill.params.bombRadius || 200;
  world.emit('impact', { id: e.id, x, y, radius: r, slot: cast.slot, bomb: true });
  for (const t of inRadius(world, e, { x, y }, r)) {
    const d = Math.max(0, dist(t.pos, { x, y }) - t.radius);
    skillHit(world, e, t, cast, { mult: 1 - 0.5 * Math.min(1, d / r), origin: { x, y } });
  }
}

function fireShot(world, e, cast, d, i) {
  const { skill } = cast, kind = cast.variant === 'bomb' ? 'bomb' : skill.hook ? 'hook' : 'skill';
  const follow = i > 0 && skill.params?.followFirst && cast.firstHit != null ? world.byId(cast.firstHit) : null; // phát sau theo dấu phát đầu
  spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: d.x, dy: d.y, speed: skill.speed, remaining: skill.range, width: skill.width, pierce: skill.pierce ?? false, heroOnly: !!skill.heroOnly,
    kind, slot: cast.slot, variant: cast.variant, homing: follow && follow.alive ? follow.id : null,
    onHit: (t) => {
      if (cast.firstHit == null && t.isHero) cast.firstHit = t.id;
      if (cast.variant === 'bomb') { explode(world, e, cast, t.pos.x, t.pos.y); return true; }
      skillHit(world, e, t, cast);
      if (skill.hook && e.alive) { // móc kéo: lôi mục tiêu về sát trước mặt người móc, choáng suốt lúc bị kéo + thêm hook.stun
        const dd = dirTo(e.pos, t.pos), stop = e.radius + t.radius + 20, to = { x: e.pos.x + dd.x * stop, y: e.pos.y + dd.y * stop };
        const time = forceMove(world, t, to, skill.hook.speed || 1600) || 0;
        applyStatus(world, t, { status: 'stun', id: 'hook_stun', duration: time + (skill.hook.stun || 0) }, e);
        world.emit('hook', { id: e.id, target: t.id, dur: time, slot: cast.slot });
      }
      return true;
    },
    onEnd: (p) => { // hết tầm: Pháo Giấy nổ tại chỗ rơi; không trúng ai thì gọi hook trượt (Đổi Vai)
      if (cast.variant === 'bomb' && p.hit.size === 0) explode(world, e, cast, p.x, p.y);
      else if (p.hit.size === 0) missHook(world, e, cast);
    } });
  world.emit('shot', { id: e.id, slot: cast.slot, variant: cast.variant || null, n: i });
}

const HANDLERS = {
  skillshot(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim), n = skill.count || 1;
    cast.variant = variant(world, e, cast);
    fireShot(world, e, cast, d, 0);
    for (let i = 1; i < n; i++) world.pending.push({ tick: world.tick + T((skill.interval || 0.2) * i), run: () => { if (e.alive && !isHardCC(e)) fireShot(world, e, cast, d, i); } });
  },
  dash(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim), slashes = skill.params?.slashes;
    // lướt có chém liên hoàn (Nhật Vũ): đường lướt không gây sát thương, dừng ở tướng đầu tiên rồi chém tại chỗ
    e.dash = { dx: d.x, dy: d.y, perTick: (skill.speed || 2000) / 30, left: skill.range, along: !!skill.hitAlongPath && !slashes, stop: !!skill.stopOnHero || !!slashes, noHit: !!slashes, hit: new Set(), cast,
      onEnd: slashes ? () => startSlashes(world, e, cast) : null };
    selfEffects(world, e, skill.selfEffects, cast.level);
    if (!skill.damage) selfEffects(world, e, skill.effects, cast.level); // lướt không gây sát thương: hiệu ứng là của người lướt (Chạy Mù Điểm)
    if (skill.nextAttackRange) applyStatus(world, e, { status: 'nextRange', value: skill.nextAttackRange, duration: 6 }, e);
  },
  aoeSelf(world, e, cast) {
    const { skill, level } = cast, waves = skill.waves || 1, P = skill.params || {};
    const wave = (i) => {
      if (!e.alive) return;
      world.emit('aoe', { id: e.id, x: e.pos.x, y: e.pos.y, radius: skill.radius, dur: 0.35, slot: cast.slot, team: e.team, wave: i });
      for (const t of inRadius(world, e, e.pos, skill.radius)) {
        skillHit(world, e, t, cast, { origin: e.pos, noEffects: i > 0 && waves > 1 && !P.effectsEveryWave }); // nhiều đợt: hiệu ứng chỉ ở đợt đầu (không đẩy liên tục)
        if (skill.pullIn != null && dist(t.pos, e.pos) > skill.pullIn + e.radius) { // xoáy: hút địch về quanh mình
          const dd = dirTo(e.pos, t.pos), r = skill.pullIn + e.radius + t.radius;
          const time = forceMove(world, t, { x: e.pos.x + dd.x * r, y: e.pos.y + dd.y * r }, skill.pullSpeed || 1400) || 0;
          applyStatus(world, t, { status: 'stun', id: 'pull_stun', duration: time }, e);
        }
      }
    };
    wave(0);
    for (let i = 1; i < waves; i++) world.pending.push({ tick: world.tick + T((skill.interval || 0.2) * i), run: () => wave(i) });
    if (P.reflectProjectiles) reflectZone(world, e, cast, P.reflectWindow ?? 1);
    for (const a of [e, ...alliesOf(world, e, skill.radius).filter((x) => x.isHero)]) {
      if (skill.allyShield) addShield(world, a, amountOf(skill.allyShield, level, e), skill.allyShield.duration, null, e);
      for (const eff of skill.allyEffects || []) applyStatus(world, a, resolveEffect(eff, level), e);
    }
    selfEffects(world, e, skill.selfEffects, level);
  },
  aoeCircle(world, e, cast, aim) {
    const { skill } = cast, p = aimPoint(world, e, aim, skill.range), delay = skill.delay || 0.5, leap = skill.untargetableDuringDelay || skill.untargetableDuringLeap;
    world.emit('aoe', { id: e.id, x: p.x, y: p.y, radius: skill.radius, dur: delay, slot: cast.slot, team: e.team, warn: true });
    world.dangers = (world.dangers || []).filter((z) => z.until >= world.tick); // vòng cảnh báo cho bot né (ai/dodge.js)
    world.dangers.push({ key: 'z' + world.tick + '_' + e.id, x: p.x, y: p.y, r: skill.radius, team: e.team, until: world.tick + T(delay) });
    if (leap) { applyStatus(world, e, { status: 'untargetable', duration: delay }, e); world.emit('jump', { id: e.id, dur: delay }); }
    world.pending.push({ tick: world.tick + T(delay), run: () => {
      if (!e.alive) return;
      if (leap) { e.pos.x = p.x; e.pos.y = p.y; e.prevPos.x = p.x; e.prevPos.y = p.y; }
      world.emit('impact', { id: e.id, x: p.x, y: p.y, radius: skill.radius, slot: cast.slot });
      for (const t of inRadius(world, e, p, skill.radius)) skillHit(world, e, t, cast, { origin: p });
      if (skill.heat && cast.hitHero) makeCtx(world, e).addHeat(e, skill.heat);
    } });
  },
  cone(world, e, cast, aim) {
    const { skill, level } = cast, d = aimDir(e, aim), half = ((skill.angle || 90) / 2) * Math.PI / 180, beams = skill.beams || 0, P = skill.params || {};
    world.emit('cone', { id: e.id, x: e.pos.x, y: e.pos.y, dx: d.x, dy: d.y, range: skill.range, angle: skill.angle, slot: cast.slot, team: e.team, beams });
    const base = Math.atan2(d.y, d.x);
    for (const t of enemiesOf(world, e)) {
      const td = dist(t.pos, e.pos); if (td - t.radius > skill.range) continue;
      const dd = dirTo(e.pos, t.pos), off = Math.acos(Math.max(-1, Math.min(1, dd.x * d.x + dd.y * d.y)));
      if (off > half + (beams ? Math.atan2(t.radius, Math.max(1, td)) : 0)) continue;
      if (!beams) { skillHit(world, e, t, cast); continue; }
      // nhiều tia toả đều trong quạt: mỗi tia trúng thì tính một lần sát thương; trúng đủ N tia thì kiệt sức
      const ta = Math.atan2(dd.y, dd.x), w = Math.atan2(t.radius + 40, Math.max(1, td));
      let hits = 0;
      for (let i = 0; i < beams; i++) { const a = base - half + (beams > 1 ? (2 * half * i) / (beams - 1) : half); let da = Math.abs(a - ta); if (da > Math.PI) da = 2 * Math.PI - da; if (da <= w) hits++; }
      if (!hits) hits = 1;
      skillHit(world, e, t, cast, { mult: hits });
      if (P.exhaustIfHits && hits >= P.exhaustIfHits) applyStatus(world, t, resolveEffect({ status: 'slow', id: 'exhaust', pct: P.exhaustSlow ?? 0.6, duration: P.exhaustDuration ?? 1.5 }, level), e);
    }
  },
  zone(world, e, cast, aim) {
    const { skill, level } = cast, p = aimPoint(world, e, aim, skill.range), P = skill.params || {};
    world.emit('aoe', { id: e.id, x: p.x, y: p.y, radius: skill.radius, dur: skill.duration, slot: cast.slot, team: e.team, zone: true });
    selfEffects(world, e, skill.selfEffects, level, skill.duration);
    const zid = 'zone' + world.tick + '_' + e.id;
    spawnZone(world, { owner: e.id, x: p.x, y: p.y, radius: skill.radius, until: world.tick + T(skill.duration), interval: T(skill.tickInterval),
      onTick: () => {
        for (const t of inRadius(world, e, p, skill.radius)) skillHit(world, e, t, cast, { origin: p });
        if (P.allyShield) for (const a of [e, ...alliesOf(world, e)].filter((x) => x.isHero && x.alive && dist(x.pos, p) <= skill.radius)) addShield(world, a, amountOf(P.allyShield, level, e), P.allyShield.duration ?? 1, zid, e);
      } });
  },
  selfBuff(world, e, cast) {
    const { skill, level } = cast;
    if (skill.shield) addShield(world, e, amountOf(skill.shield, level, e), skill.shield.duration ?? skill.duration ?? 3);
    selfEffects(world, e, skill.selfEffects, level, skill.duration);
    selfEffects(world, e, skill.effects, level, skill.duration); // trạng thái của chiêu tự cường hoá: thời lượng mặc định là thời lượng chiêu
    if (skill.heat) makeCtx(world, e).addHeat(e, skill.heat);
    if (skill.ambush) e.flags.ambush = skill.ambush;
    if (skill.params?.rewindSeconds) rewind(world, e, skill.params.rewindSeconds);
  },
  allyTarget(world, e, cast, aim) {
    const { skill, level } = cast, d = aimDir(e, aim);
    let best = e, bs = -1;
    for (const a of alliesOf(world, e, skill.range)) { if (!a.isHero) continue; const dd = dirTo(e.pos, a.pos), s = dd.x * d.x + dd.y * d.y; if (s > 0.6 && s > bs) { bs = s; best = a; } } // chỉ tướng đồng minh (trước có thể hồi nhầm lính)
    if (skill.heal) heal(world, best, amountOf(skill.heal, level, e), e);
    if (skill.shield) addShield(world, best, amountOf(skill.shield, level, e), skill.shield.duration, null, e);
    applyEffects(world, e, best, skill.effects, level);
    world.emit('aoe', { id: e.id, target: best.id, x: best.pos.x, y: best.pos.y, radius: 120, dur: 0.5, slot: cast.slot, team: e.team });
  },
};

/** Mắng Xối: trong `win` giây, đạn của tướng địch bay vào vòng sóng bị hất ngược — đổi chủ, bay về phía người bắn, gây sát thương vật lý
 *  bằng 2 đợt sóng. Đạn của tướng có nội tại `unreflectable` (Lưỡng Cực) không hất được. */
function reflectZone(world, e, cast, win) {
  const { skill, level } = cast, R = skill.radius;
  spawnZone(world, { owner: e.id, x: e.pos.x, y: e.pos.y, radius: R, until: world.tick + T(win), interval: 1, onTick: () => {
    if (!e.alive) return;
    for (const p of world.projectiles) {
      const o = world.byId(p.owner);
      if (p.reflected || !o || o.team === e.team || !o.isHero || o.data?.passive?.params?.unreflectable || dist({ x: p.x, y: p.y }, e.pos) > R) continue;
      let d = o.alive ? norm(o.pos.x - p.x, o.pos.y - p.y) : { x: -p.dx, y: -p.dy }; if (!d.x && !d.y) d = { x: -p.dx || 1, y: -p.dy };
      const dmg = (skill.damage ? amountOf(skill.damage, level, e) : 40) * 2;
      Object.assign(p, { reflected: true, owner: e.id, homing: null, dx: d.x, dy: d.y, remaining: 900, hit: new Set(), pierce: false, heroOnly: false, width: Math.max(60, p.width || 40), slot: cast.slot, onEnd: null,
        onHit: (t) => { dealDamage(world, e, t, dmg, 'physical', { slot: cast.slot }); return true; } });
      world.emit('reflect', { id: e.id, proj: p.id, x: p.x, y: p.y });
    }
  } });
}

/** Trả { ok, reason }. aim: hướng (kiểu direction) hoặc điểm thế giới (kiểu point); kiểu target: hướng để chọn mục tiêu (null = gần nhất). */
export function castSkill(world, e, slot, aim) {
  const skill = e.data.skills?.[slot], level = e.skillLevels[slot];
  if (!skill || !e.alive) return { ok: false, reason: 'none' };
  if (!level) return { ok: false, reason: 'locked' };
  if (e.channel && world.tick < e.channel.until) return { ok: false, reason: 'channel' }; // đang niệm giữ áp chế
  if (e.recast?.slot === slot && world.tick <= e.recast.until && !isHardCC(e)) return recastAgain(world, e, slot, aim); // kích hoạt lại (đổi chỗ phân thân): không tốn mana, không tính hồi chiêu
  if (world.tick < e.cooldowns[slot]) return { ok: false, reason: 'cooldown' };
  if (isSilenced(e) || isHardCC(e)) return { ok: false, reason: 'cc' };
  if (e.dash) return { ok: false, reason: 'busy' };
  if (skill.type === 'dash' || skill.type === 'targetedDash') { // lướt: không được trong kết giới / lãnh địa bóng, khi bị trói (04 §3)
    if (cannotDash(e)) return { ok: false, reason: 'noDash' };
    if (isRooted(e)) return { ok: false, reason: 'rooted' };
  }
  if (skill.canCast && !skill.canCast(e, world)) return { ok: false, reason: 'cond' }; // điều kiện riêng (đủ Ấn, đủ Tầm Nhìn, máu dưới 30%…)
  const cost = lv(skill.cost, level);
  if (e.mana < cost) return { ok: false, reason: 'mana' };
  const handler = HANDLERS[skill.type] || EXTRA_HANDLERS[skill.type];
  if (!handler) return { ok: false, reason: 'unsupported' };
  const target = skill.aim === 'target' ? pickSkillTarget(world, e, skill, aim) : null;
  if (skill.aim === 'target' && !target) return { ok: false, reason: 'noTarget' }; // không có mục tiêu hợp lệ: không mất mana / hồi chiêu
  e.mana -= cost;
  e.cooldowns[slot] = world.tick + T(lv(skill.cooldown, level) * (1 - Math.min(COMBAT_EXTRA.cdrCap, e.stats.cdr || 0)));
  cancelRecall(world, e); onCastSkill(world, e); // huỷ Biến về kèm sự kiện (dừng tiếng niệm, vòng sáng)
  if (skill.type !== 'selfBuff') removeStatus(e, 'stealth'); // ra đòn làm lộ hình
  if (skill.unstoppable) { const d = lv(skill.unstoppable, level); applyStatus(world, e, { status: 'ccImmune', id: 'unstoppable', duration: d }, e); world.emit('unstoppable', { id: e.id, dur: d, slot }); } // không thể cản (lướt: hết khi cú lướt dừng — movement.js)
  if (target) e.facing = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x);
  else if (skill.aim === 'direction' || skill.aim === 'point') { const d = skill.aim === 'point' && aim ? norm(aim.x - e.pos.x, aim.y - e.pos.y) : aim ? norm(aim.x, aim.y) : null; if (d && (d.x || d.y)) e.facing = Math.atan2(d.y, d.x); }
  // khoá ra chiêu: đứng yên, mặt giữ hướng chiêu tới lúc chiêu phát ra (+ một nhịp ngắn), sau đó mới đi/quay theo cần di chuyển.
  // Lướt tự di chuyển nên không khoá; chiêu nhảy tới điểm (Đe Trời) khoá suốt lúc bay; chiêu nhiều nhịp (đường thẳng) khoá tới nhịp cuối.
  const moving = skill.type === 'dash' || skill.type === 'targetedDash', aimed = skill.aim === 'direction' || skill.aim === 'point' || skill.aim === 'target';
  const multi = skill.type === 'line' ? ((skill.ticks || skill.hits || 1) - 1) * (skill.tickInterval || 0.2) : skill.count > 1 ? (skill.count - 1) * (skill.interval || 0.2) : 0;
  const lock = moving ? 0 : skill.untargetableDuringDelay || skill.untargetableDuringLeap ? (skill.delay || 0.5) : aimed ? (skill.windup || 0) + CAST_LOCK + multi : skill.windup || 0;
  if (lock > 0) { e.castUntil = world.tick + T(lock); e.castFacing = e.facing; }
  const cast = { slot, skill, level, flags: {}, hitHero: false, target };
  world.emit('cast', { id: e.id, slot, skillType: skill.type, delay: skill.windup ?? skill.delay ?? 0, lock, target: target?.id }); // delay: độ trễ tới lúc chiêu trúng (animation khớp theo art.hitTime); lock: thời gian đứng ra chiêu
  hooksOf(e)?.onCast?.(makeCtx(world, e, { cast, skill, slot, target }));
  // windup: chiêu phát ra sau một nhịp vung (đúng lúc ống/búa chạm đất trong animation); bị khống chế cứng, bị cắt chiêu hoặc chết trong lúc vung thì mất chiêu
  const intr = e.interrupts || 0; // effects.js interrupt() tăng bộ đếm này: chiêu đang vung bị cắt
  if (skill.windup) world.pending.push({ tick: world.tick + T(skill.windup), run: () => { if (e.alive && !isHardCC(e) && (e.interrupts || 0) === intr) handler(world, e, cast, aim); } });
  else handler(world, e, cast, aim);
  return { ok: true };
}
