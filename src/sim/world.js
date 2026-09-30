// Mô phỏng: KHÔNG chạm DOM/canvas/three. Đơn vị: cm; pos.x, pos.y là mặt phẳng đất.
import { HEROES } from '../data/heroes/index.js';
import { mulberry32 } from '../core/rng.js';
import { applyCommand } from './commands.js';
import { updateMovement } from './movement.js';
import { updateCombat } from './combat.js';
import { updateProjectiles, updateZones } from './projectiles.js';
import { updateStatuses } from './status.js';
import { dealDamage } from './damage.js';
import { refreshStats, setLevel, autoLevel } from './stats.js';
import { makeCtx } from './ctx.js';

const DUMMY = { id: 'dummy', dummy: true, name: 'Hình nộm', radius: 45, base: { maxHp: 6000, maxMana: 0, atk: 0, ap: 0, armor: 30, mr: 30, atkSpeed: 1, moveSpeed: 0, range: 0 }, perLevel: {}, basicAttack: {}, skills: {} };

export function createWorld({ map, seed = 1 }) {
  const world = { map, tick: 0, rng: mulberry32(seed), entities: [], projectiles: [], zones: [], pending: [], events: [], nextId: 1, queue: new Map() };
  world.byId = (id) => world.entities.find((e) => e.id === id) || null;
  world.emit = (type, data) => world.events.push({ type, tick: world.tick, ...data });
  world.drainEvents = () => { const ev = world.events; world.events = []; return ev; };

  const make = (data, team, pos, kind) => {
    const e = { id: world.nextId++, kind, isHero: true, team, heroId: data.id, data, radius: data.radius ?? 40, alive: true,
      pos: { ...pos }, prevPos: { ...pos }, spawn: { ...pos }, facing: team === 0 ? 0 : Math.PI, speed: 0, moveDir: { x: 0, y: 0 },
      level: 1, xp: 0, skillPoints: 1, skillLevels: { s1: 0, s2: 0, s3: 0 }, cooldowns: { s1: 0, s2: 0, s3: 0 },
      statuses: [], shields: [], stats: null, hp: 1, mana: 0, attacking: false, attackReady: 0, lastDamagedTick: -99999, dash: null,
      heat: 0, heatUntil: 0, flags: {}, kills: 0, deaths: 0, autoLevel: true, atkIndex: 0 };
    refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana;
    autoLevel(e);
    world.entities.push(e);
    return e;
  };
  world.spawnHero = (heroId, team, pos) => make(HEROES[heroId], team, pos, 'hero');
  world.spawnDummy = (team, pos) => make(DUMMY, team, pos, 'dummy');
  world.command = (entityId, cmd) => {
    let q = world.queue.get(entityId); if (!q) world.queue.set(entityId, (q = []));
    if (cmd.type === 'move' || cmd.type === 'attack') { const i = q.findIndex((c) => c.type === cmd.type); if (i >= 0) { q[i] = cmd; return; } }
    q.push(cmd);
  };
  // công cụ màn thử (Mốc 2)
  world.debug = {
    resetCooldowns(e) { e.cooldowns.s1 = e.cooldowns.s2 = e.cooldowns.s3 = 0; e.mana = e.stats.maxMana; },
    level15(e) { setLevel(world, e, 15); },
    fullHeal(e) { e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; },
  };

  world.update = (tick) => {
    world.tick = tick;
    for (const e of world.entities) { e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; }
    for (const [id, q] of world.queue) { const e = world.byId(id); for (const c of q) applyCommand(world, e, c); world.queue.delete(id); }
    for (const e of world.entities) {
      if (!e.alive) { if (world.tick >= e.respawnTick) { e.alive = true; e.pos.x = e.spawn.x; e.pos.y = e.spawn.y; e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; world.emit('respawn', { id: e.id }); } continue; }
      updateStatuses(world, e, dealDamage);
      refreshStats(world, e);
      if (e.data.dummy) { if (world.tick - (e.lastDamagedTick) > 150) e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.maxHp / 30); continue; }
      e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.regenHp / 150);
      e.mana = Math.min(e.stats.maxMana, e.mana + e.stats.regenMana / 150);
      e.data.passive?.hooks?.onTick?.(makeCtx(world, e));
    }
    const due = world.pending.filter((p) => p.tick <= world.tick);
    if (due.length) { world.pending = world.pending.filter((p) => p.tick > world.tick); for (const p of due) p.run(); }
    updateProjectiles(world); updateZones(world);
    updateMovement(world);
    updateCombat(world);
  };
  return world;
}
