// Phép bổ trợ (05 §6). Dùng chung một kiểu Command với kỹ năng: { type:'spell', aim }.
import { SPELLS, RESTORE } from '../data/spells.js';
import { T, dist, norm } from './util.js';
import { applyStatus, removeStatus, isHardCC } from './status.js';
import { dealDamage, heal } from './damage.js';
import { enemiesOf, alliesOf } from './targeting.js';
import { clampToMap } from './util.js';

const CLEANSE = ['stun', 'root', 'slow', 'silence', 'taunt']; // hất tung đang diễn ra thì giữ nguyên

/** Điểm đáp của Chớp Bước: đi thẳng theo hướng, bị giữ trong đường/bản đồ, không rơi vào công trình. */
export function blinkTarget(world, e, dir, range) {
  const solids = world.entities.filter((s) => s.alive && s.structure && !s.noTarget);
  for (let d = range; d >= 0; d -= 25) {
    const p = clampToMap(world.map, { x: e.pos.x + dir.x * d, y: e.pos.y + dir.y * d }, e.radius);
    if (!solids.some((s) => dist(p, s.pos) < e.radius + s.radius * 0.8)) return p;
  }
  return { x: e.pos.x, y: e.pos.y };
}

export function castSpell(world, e, aim) {
  const sp = e.spell && SPELLS[e.spell.id];
  if (!sp || !e.alive) return { ok: false, reason: 'none' };
  if (sp.disabledIn1v1 && world.map.id === 'duel1v1') return { ok: false, reason: 'mode' };
  if (world.tick < e.spell.ready) return { ok: false, reason: 'cooldown' };
  if (isHardCC(e) && sp.id !== 'giai_troi') return { ok: false, reason: 'cc' };
  e.spell.ready = world.tick + T(sp.cooldown);
  e.recall = null;
  world.emit('spell', { id: e.id, spell: sp.id });
  switch (sp.id) {
    case 'chop_buoc': {
      let d = aim && (aim.x || aim.y) ? norm(aim.x, aim.y) : null;
      if (!d) { const m = Math.hypot(e.moveDir.x, e.moveDir.y); d = m > 0.1 ? norm(e.moveDir.x, e.moveDir.y) : { x: Math.cos(e.facing), y: Math.sin(e.facing) }; }
      const from = { x: e.pos.x, y: e.pos.y }, to = blinkTarget(world, e, d, sp.range);
      e.pos.x = to.x; e.pos.y = to.y; e.prevPos.x = to.x; e.prevPos.y = to.y; e.dash = null; e.facing = Math.atan2(d.y, d.x);
      world.emit('blink', { id: e.id, from, to });
      break;
    }
    case 'hoi_phuc': {
      const near = alliesOf(world, e, sp.radius).filter((a) => a.kind === 'hero').sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0];
      for (const t of [e, near]) if (t) { heal(world, t, t.stats.maxHp * sp.healPct); applyStatus(world, t, { status: 'haste', id: 'spellHaste', pct: sp.haste.pct, duration: sp.haste.duration }, e); }
      break;
    }
    case 'tram_hon':
      for (const t of enemiesOf(world, e).filter((x) => x.kind === 'hero' && dist(x.pos, e.pos) - x.radius <= sp.radius)) {
        dealDamage(world, e, t, (t.stats.maxHp - t.hp) * sp.missingHpPct, 'true');
        applyStatus(world, t, { status: 'slow', id: 'tramhon', pct: sp.slow.pct, duration: sp.slow.duration }, e);
      }
      break;
    case 'thu_hoach':
      for (const t of enemiesOf(world, e).filter((x) => dist(x.pos, e.pos) - x.radius <= sp.radius)) {
        if (t.kind === 'hero') { dealDamage(world, e, t, sp.heroDamage, 'true'); applyStatus(world, t, { status: 'slow', id: 'thuhoach', pct: sp.slow.pct, duration: sp.slow.duration }, e); }
        else if (t.kind === 'minion') dealDamage(world, e, t, sp.base + sp.perLevel * (e.level - 1), 'true');
      }
      break;
    case 'gio_luot':
      applyStatus(world, e, { status: 'haste', id: 'gioluot', pct: sp.haste.pct, duration: sp.haste.duration }, e);
      applyStatus(world, e, { status: 'ghost', duration: sp.haste.duration }, e);
      break;
    case 'giai_troi':
      for (const k of CLEANSE) removeStatus(e, k);
      applyStatus(world, e, { status: 'ccImmune', duration: sp.immune }, e);
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
  e.recall = null;
  applyStatus(world, e, { status: 'hot', id: 'hoiMau', hps: (e.stats.maxHp * RESTORE.healPct) / RESTORE.duration, duration: RESTORE.duration }, e);
  world.emit('restore', { id: e.id, dur: RESTORE.duration });
  return { ok: true };
}
