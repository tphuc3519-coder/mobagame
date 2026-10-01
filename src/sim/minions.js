// Lính: sinh theo đợt, đi dọc đường, đánh mục tiêu gần nhất (03 §A5, §B3).
import { MINIONS, scaleFor } from '../data/units.js';
import { T, dist, norm, clampToMap } from './util.js';
import { TICK } from '../core/loop.js';
import { dealDamage } from './damage.js';
import { isTargetable } from './targeting.js';
import { isRooted, isHardCC } from './status.js';
import { spawnProjectile } from './projectiles.js';
import { lanePath, pointAt, project } from './lanes.js';

/** Sinh lính ở đầu đường `laneIdx` của đội `team`; lệch ngang `off` để không dồn một điểm. */
export function spawnMinion(world, type, team, laneIdx = 0, off = 0) {
  const d = MINIONS[type], sc = scaleFor(Math.floor(world.tick / 1800)), map = world.map;
  const base = { maxHp: d.maxHp * sc.hp, maxMana: 0, atk: d.atk * sc.atk, ap: 0, armor: d.armor, mr: d.mr, atkSpeed: d.atkSpeed, moveSpeed: d.moveSpeed, range: d.range };
  const path = lanePath(map, laneIdx, team), s0 = map.waves.spawnDist ?? 0;
  const o = pointAt(path, s0), pos = { x: o.x - o.dy * off, y: o.y + o.dx * off };
  const e = world.spawnEntity({ kind: 'minion', minionType: type, team, data: { name: d.name, base, perLevel: {}, basicAttack: { melee: d.melee, delay: d.delay }, skills: {}, towerPct: d.towerPct },
    radius: d.radius, pos, height: 150, lane: laneIdx, laneOff: off, target: null, wp: 1, wpSync: 0 });
  e.hp = e.stats.maxHp; e.facing = Math.atan2(o.dy, o.dx);
  return e;
}

/** Lịch sinh lính: đợt đầu lúc first giây, mỗi every giây một đợt, ở mọi đường; mỗi siegeEvery đợt thêm Xe Đá. */
export function updateWaves(world) {
  const w = world.map.waves;
  const sec = world.tick / 30;
  if (world.nextWave === undefined) { world.nextWave = w.first; world.waveNo = 0; world.spawnQueue = []; }
  if (sec >= world.nextWave) {
    const list = [];
    for (let i = 0; i < w.sword; i++) list.push('sword');
    for (let i = 0; i < w.archer; i++) list.push('archer');
    if ((world.waveNo + 1) % w.siegeEvery === 0) list.push('siege');
    list.forEach((type, i) => world.spawnQueue.push({ tick: world.tick + i * w.gap, type }));
    world.waveNo++; world.nextWave += w.every;
  }
  const due = world.spawnQueue.filter((s) => s.tick <= world.tick);
  if (due.length) {
    world.spawnQueue = world.spawnQueue.filter((s) => s.tick > world.tick);
    const jit = world.map.lanes.length > 1 ? 160 : 120;
    for (const s of due) for (const team of [0, 1]) for (let l = 0; l < world.map.lanes.length; l++) spawnMinion(world, s.type, team, l, (world.rng.next() - 0.5) * jit);
    // Lính Đèn Lớn (03 §A5): phá được trụ nhà của địch ở đường nào thì đường đó thêm 1 siêu lính mỗi đợt; phá cả 3 trụ nhà: 2 mỗi đường
    if (world.map.lanes.length > 1 && due.some((s) => s.type === 'sword')) {
      for (const team of [0, 1]) {
        const homes = world.map.lanes.map((ln) => { const t = world.entities.find((e) => e.structure && e.team === 1 - team && e.sid === `${ln.id}_home`); return !!t && !t.alive; });
        const all = homes.every(Boolean);
        homes.forEach((down, l) => { if (down || all) for (let k = 0; k < (all ? 2 : 1); k++) spawnMinion(world, 'giant', team, l, (world.rng.next() - 0.5) * jit); });
      }
    }
  }
}

function pickTarget(world, e) {
  const range = e.stats.range, cur = e.target != null ? world.byId(e.target) : null;
  if (cur && cur.alive && isTargetable(e, cur) && dist(cur.pos, e.pos) <= range + 700) return cur;
  let best = null, bs = Infinity;
  for (const t of world.entities) {
    if (t.team === e.team || t.noTarget || !isTargetable(e, t)) continue;
    const d = dist(t.pos, e.pos) - t.radius;
    // lính ưu tiên lính địch, rồi công trình/tướng trong tầm đánh
    const lim = t.kind === 'minion' ? 450 : range + 40;
    if (d > lim) continue;
    const score = d + (t.kind === 'minion' ? 0 : 400);
    if (score < bs) { bs = score; best = t; }
  }
  return best;
}

function attack(world, e, t) {
  e.attackReady = world.tick + T(1 / e.stats.atkSpeed);
  e.facing = Math.atan2(t.pos.y - e.pos.y, t.pos.x - e.pos.x);
  world.emit('attack', { id: e.id, n: 1, interval: 1 / e.stats.atkSpeed });
  const ba = e.data.basicAttack, d = MINIONS[e.minionType];
  world.pending.push({ tick: world.tick + T(ba.delay), run: () => {
    if (!e.alive || !t.alive || isHardCC(e)) return;
    const amt = (tt) => e.stats.atk * (tt.structure ? d.structureMult || 1 : 1); // lính phá công trình mạnh hơn để đợt lính có sức đẩy
    if (ba.melee) dealDamage(world, e, t, amt(t), 'physical');
    else spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: 0, dy: 0, speed: d.projSpeed, remaining: 9999, homing: t.id, kind: 'basic', onHit: (tt) => dealDamage(world, e, tt, amt(tt), 'physical') });
  } });
}

/** Đi theo đường: tới điểm đường kế tiếp; tới cuối đường thì tiếp tục theo hướng đoạn cuối (về phía nhà chính địch). */
function followLane(world, e) {
  if (e.wp === undefined) { e.wp = 1; e.wpSync = 0; e.lane ??= 0; e.laneOff ??= 0; } // lính dựng tay (kiểm thử) không có thông tin đường
  const path = lanePath(world.map, e.lane, e.team), last = path.pts.length - 1;
  if (world.tick >= e.wpSync) { // định kỳ chọn lại điểm đích: sau khi đuổi mục tiêu có thể đã lệch đường
    e.wpSync = world.tick + 30;
    const pr = project(path, e.pos);
    let i = 1; while (i < last && path.cum[i] < pr.s + 40) i++;
    e.wp = i;
  }
  while (e.wp < last && dist(e.pos, path.pts[e.wp]) < 110) e.wp++;
  const tgt = path.pts[e.wp], a = path.pts[Math.max(0, e.wp - 1)], dxs = tgt.x - a.x, dys = tgt.y - a.y, L = Math.hypot(dxs, dys) || 1;
  const goal = { x: tgt.x - (dys / L) * e.laneOff, y: tgt.y + (dxs / L) * e.laneOff };
  if (e.wp >= last && dist(e.pos, goal) < 110) return norm(dxs, dys);
  return norm(goal.x - e.pos.x, goal.y - e.pos.y);
}

export function updateMinions(world) {
  const minions = world.entities.filter((e) => e.kind === 'minion' && e.alive);
  for (const e of minions) {
    if (isHardCC(e)) { e.speed = 0; continue; }
    const t = pickTarget(world, e); e.target = t ? t.id : null;
    let move = null;
    if (t) {
      const d = dist(t.pos, e.pos) - t.radius;
      if (d <= e.stats.range) { if (world.tick >= e.attackReady) attack(world, e, t); e.facing = Math.atan2(t.pos.y - e.pos.y, t.pos.x - e.pos.x); }
      else move = norm(t.pos.x - e.pos.x, t.pos.y - e.pos.y);
    } else move = followLane(world, e);
    if (move && !isRooted(e)) {
      const step = e.stats.moveSpeed * TICK;
      e.pos.x += move.x * step; e.pos.y += move.y * step; e.facing = Math.atan2(move.y, move.x); e.speed = e.stats.moveSpeed;
    } else e.speed = 0;
  }
  // tách nhau nhẹ và không xuyên công trình
  const solids = world.entities.filter((s) => s.alive && s.structure && !s.noTarget);
  for (let i = 0; i < minions.length; i++) {
    const a = minions[i];
    for (let j = i + 1; j < minions.length; j++) {
      const b = minions[j], dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, d = Math.hypot(dx, dy), min = (a.radius + b.radius) * 0.9;
      if (d < min && d > 0.01) { const p = Math.min(8, (min - d) / 2); a.pos.x -= (dx / d) * p; a.pos.y -= (dy / d) * p; b.pos.x += (dx / d) * p; b.pos.y += (dy / d) * p; }
    }
    for (const s of solids) { const dx = a.pos.x - s.pos.x, dy = a.pos.y - s.pos.y, d = Math.hypot(dx, dy), min = a.radius + s.radius; if (d < min && d > 0.01) { a.pos.x = s.pos.x + (dx / d) * min; a.pos.y = s.pos.y + (dy / d) * min; } }
    clampToMap(world.map, a.pos, a.radius);
  }
}
