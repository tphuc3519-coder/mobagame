// Phép bổ trợ (05 §6). Dùng chung một kiểu Command với kỹ năng: { type:'spell', aim }. Cơ chế chọn theo `kind` của dữ liệu (không theo id);
// phép `needTarget` không có mục tiêu thì báo 'noTarget' và không mất hồi chiêu.
import { SPELLS, RESTORE } from '../data/spells.js';
import { T, dist, norm } from './util.js';
import { applyStatus, removeStatus, isHardCC, cannotDash, CLEANSE_KINDS } from './status.js';
import { dealDamage, heal } from './damage.js';
import { enemiesOf, alliesOf } from './targeting.js';
import { canTarget } from './vision.js';
import { clampToMap } from './util.js';
import { cancelRecall } from './economy.js';

/** Điểm đáp của Chớp Bước: đi thẳng theo hướng, bị giữ trong đường/bản đồ, không rơi vào công trình. */
export function blinkTarget(world, e, dir, range) {
  const solids = world.entities.filter((s) => s.alive && s.structure && !s.noTarget);
  for (let d = range; d >= 0; d -= 25) {
    const p = clampToMap(world.map, { x: e.pos.x + dir.x * d, y: e.pos.y + dir.y * d }, e.radius);
    if (!solids.some((s) => dist(p, s.pos) < e.radius + s.radius * 0.8)) return p;
  }
  return { x: e.pos.x, y: e.pos.y };
}

export const smiteDamage = (e, sp = SPELLS.thu_hoach) => sp.base + sp.perLevel * (e.level - 1);
/** Mục tiêu của Trừng Trị: trong tầm (tính bán kính mục tiêu), ưu tiên mục tiêu lớn > bùa > quái > lính > tướng địch, cùng hạng thì gần nhất. */
export function smiteTarget(world, e, sp = SPELLS.thu_hoach) {
  const rank = (t) => (t.kind === 'monster' ? (t.boss ? 4 : t.monsterType === 'linh_thuy' || t.monsterType === 'hoa_nham' ? 3 : 2) : t.kind === 'minion' ? 1 : t.kind === 'hero' ? 0 : -1);
  let best = null, br = -1, bd = Infinity;
  for (const t of enemiesOf(world, e)) {
    const r = rank(t), d = dist(t.pos, e.pos) - t.radius; if (r < 0 || d > sp.radius) continue;
    if (r > br || (r === br && d < bd)) { best = t; br = r; bd = d; }
  }
  return best;
}

/** Tắt Đèn: trụ / nhà chính địch còn đứng gần nhất, tính tới mép công trình (kể cả đang bất tử). */
export function towerOffTarget(world, e, sp) {
  let best = null, bd = Infinity;
  for (const s of world.entities) {
    if (!s.structure || !s.alive || s.noTarget || s.team === e.team || (s.kind !== 'tower' && s.kind !== 'core')) continue;
    const d = dist(s.pos, e.pos) - s.radius; if (d <= sp.radius && (d < bd || (d === bd && s.id < best.id))) { best = s; bd = d; }
  }
  return best;
}
/** Tướng địch (cả hình nộm) nhắm được và thấy được trong r (tính bán kính mục tiêu), gần trước. */
export function enemyHeroesNear(world, e, r) {
  const out = [];
  for (const t of world.entities) { if (!t.isHero || t.team === e.team || !canTarget(e, t)) continue; const d = dist(t.pos, e.pos) - t.radius; if (d <= r) out.push([d, t]); }
  return out.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id).map((x) => x[1]);
}
/** Mục tiêu của phép cần mục tiêu (null / mảng rỗng = không dùng được). Dùng chung cho mô phỏng, bot, HUD. */
export function spellTarget(world, e, sp) {
  switch (sp.kind) {
    case 'smite': return smiteTarget(world, e, sp);
    case 'towerOff': return towerOffTarget(world, e, sp);
    case 'flashStun': return enemyHeroesNear(world, e, sp.radius);
    case 'hex': return enemyHeroesNear(world, e, sp.radius)[0] || null;
    default: return null;
  }
}

export function castSpell(world, e, aim) {
  const sp = e.spell && SPELLS[e.spell.id];
  if (!sp || !e.alive) return { ok: false, reason: 'none' };
  if (sp.disabledIn1v1 && world.map.id === 'duel1v1') return { ok: false, reason: 'mode' };
  if (world.tick < e.spell.ready) return { ok: false, reason: 'cooldown' };
  if (isHardCC(e) && sp.kind !== 'cleanse') return { ok: false, reason: 'cc' };
  const tgt = sp.needTarget ? spellTarget(world, e, sp) : null;
  if (sp.needTarget && (!tgt || (Array.isArray(tgt) && !tgt.length))) return { ok: false, reason: 'noTarget' }; // không có mục tiêu: không mất hồi chiêu
  if (sp.kind === 'blink' && cannotDash(e)) return { ok: false, reason: 'noDash' }; // kết giới / lãnh địa bóng chặn cả Chớp Bước
  e.spell.ready = world.tick + T(sp.cooldown);
  cancelRecall(world, e); // huỷ Biến về kèm sự kiện (trước chỉ gán null: tiếng niệm kêu tiếp tới hết)
  world.emit('spell', { id: e.id, spell: sp.id });
  switch (sp.kind) {
    case 'blink': {
      let d = aim && (aim.x || aim.y) ? norm(aim.x, aim.y) : null;
      if (!d) { const m = Math.hypot(e.moveDir.x, e.moveDir.y); d = m > 0.1 ? norm(e.moveDir.x, e.moveDir.y) : { x: Math.cos(e.facing), y: Math.sin(e.facing) }; }
      const from = { x: e.pos.x, y: e.pos.y }, to = blinkTarget(world, e, d, sp.range);
      e.pos.x = to.x; e.pos.y = to.y; e.prevPos.x = to.x; e.prevPos.y = to.y; e.dash = null; e.facing = Math.atan2(d.y, d.x);
      world.emit('blink', { id: e.id, from, to });
      break;
    }
    case 'heal': {
      const near = alliesOf(world, e, sp.radius).filter((a) => a.kind === 'hero').sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0];
      for (const t of [e, near]) if (t) { heal(world, t, t.stats.maxHp * sp.healPct, e); applyStatus(world, t, { status: 'haste', id: 'spellHaste', pct: sp.haste.pct, duration: sp.haste.duration }, e); }
      break;
    }
    case 'execute':
      for (const t of enemiesOf(world, e).filter((x) => x.kind === 'hero' && dist(x.pos, e.pos) - x.radius <= sp.radius)) {
        dealDamage(world, e, t, (t.stats.maxHp - t.hp) * sp.missingHpPct, 'true');
        applyStatus(world, t, { status: 'slow', id: 'tramhon', pct: sp.slow.pct, duration: sp.slow.duration }, e);
      }
      break;
    case 'smite': { // Trừng Trị: sét giáng một mục tiêu
      const t = tgt;
      world.emit('smite', { id: e.id, target: t.id, x: t.pos.x, y: t.pos.y });
      if (t.kind === 'hero') { dealDamage(world, e, t, sp.heroDamage, 'true'); applyStatus(world, t, { status: 'slow', id: 'trungtri', pct: sp.slow.pct, duration: sp.slow.duration }, e); }
      else { dealDamage(world, e, t, smiteDamage(e, sp), 'true'); if (t.alive) applyStatus(world, t, { status: 'stun', duration: sp.stun }, e); }
      break;
    }
    case 'haste':
      applyStatus(world, e, { status: 'haste', id: 'gioluot', pct: sp.haste.pct, duration: sp.haste.duration }, e);
      applyStatus(world, e, { status: 'ghost', duration: sp.haste.duration }, e);
      break;
    case 'cleanse':
      for (const k of CLEANSE_KINDS) removeStatus(e, k);
      applyStatus(world, e, { status: 'ccImmune', duration: sp.immune }, e);
      break;
    case 'towerOff': // Tắt Đèn: công trình là trường của đơn vị (công trình miễn nhiễm hiệu ứng — status.js), dùng lại thì cộng dồn tới mốc xa hơn
      tgt.disabledUntil = Math.max(tgt.disabledUntil || 0, world.tick + T(sp.disable)); tgt.aggro = null; tgt.streak = 0;
      world.emit('towerOff', { id: e.id, target: tgt.id, x: tgt.pos.x, y: tgt.pos.y, dur: sp.disable });
      break;
    case 'flashStun': // Loá Mắt: choáng mọi tướng địch trong vùng
      for (const t of tgt) applyStatus(world, t, { status: 'stun', id: 'loamat', duration: sp.stun }, e);
      world.emit('flashBang', { id: e.id, x: e.pos.x, y: e.pos.y, r: sp.radius, hits: tgt.map((t) => t.id) });
      break;
    case 'warDrum': { // Trống Trận: bản thân mạnh hơn đồng minh (id khác nhau nên buff của mình không bị bản yếu đè)
      applyStatus(world, e, { status: 'statMod', id: 'trongtran', ...sp.self, duration: sp.duration }, e);
      const allies = alliesOf(world, e, sp.radius).filter((a) => a.kind === 'hero');
      for (const a of allies) applyStatus(world, a, { status: 'statMod', id: 'trongtranAlly', ...sp.ally, duration: sp.duration }, e);
      world.emit('warDrum', { id: e.id, x: e.pos.x, y: e.pos.y, r: sp.radius, allies: allies.map((a) => a.id), dur: sp.duration });
      break;
    }
    case 'hex': // Bùa Mỏi: giảm sát thương gây ra + làm chậm
      applyStatus(world, tgt, { status: 'weaken', id: 'buamoi', pct: sp.weaken, duration: sp.duration }, e);
      applyStatus(world, tgt, { status: 'slow', id: 'buamoiSlow', pct: sp.slow, duration: sp.duration }, e);
      world.emit('hex', { id: e.id, target: tgt.id, dur: sp.duration });
      break;
    default: break;
  }
  return { ok: true };
}

/** Hồi Máu (nút cố định): hồi theo thời gian, không cần chọn trước trận. */
export function castRestore(world, e) {
  if (!e.alive) return { ok: false, reason: 'none' };
  if (!e.restore) e.restore = { ready: 0 };
  if (world.tick < e.restore.ready) return { ok: false, reason: 'cooldown' };
  e.restore.ready = world.tick + T(RESTORE.cooldown);
  cancelRecall(world, e); // huỷ Biến về kèm sự kiện (trước chỉ gán null: tiếng niệm kêu tiếp tới hết)
  applyStatus(world, e, { status: 'hot', id: 'hoiMau', hps: (e.stats.maxHp * RESTORE.healPct) / RESTORE.duration, duration: RESTORE.duration }, e);
  world.emit('restore', { id: e.id, dur: RESTORE.duration });
  return { ok: true };
}
