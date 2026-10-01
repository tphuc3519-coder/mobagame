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
import { buildNavGrid } from './navgrid.js';
import { spawnStructures, updateStructures, onHeroDamaged } from './structures.js';
import { updateWaves, updateMinions } from './minions.js';
import { checkMatch } from './match.js';
import { initEconomy, updateEconomy } from './economy.js';
import { SPELLS } from '../data/spells.js';
import { equip, computeBonus } from './inventory.js';
import { updateItems } from './items.js';
import { createBot, updateBots } from '../ai/heroBot.js';
import { createLaneBot } from '../ai/laneBot.js';
import { DIFFICULTY } from '../data/ai.js';

const DUMMY = { id: 'dummy', dummy: true, name: 'Hình nộm', radius: 45, base: { maxHp: 6000, maxMana: 0, atk: 0, ap: 0, armor: 30, mr: 30, atkSpeed: 1, moveSpeed: 0, range: 0 }, perLevel: {}, basicAttack: {}, skills: {} };

export function createWorld({ map, seed = 1, structures = true, waves = true }) {
  const world = { map, seed, tick: 0, rng: mulberry32(seed), entities: [], projectiles: [], zones: [], pending: [], events: [], nextId: 1, queue: new Map(), over: null, waves, nav: buildNavGrid(map) };
  world.byId = (id) => world.entities.find((e) => e.id === id) || null;
  world.emit = (type, data) => world.events.push({ type, tick: world.tick, ...data });
  world.drainEvents = () => { const ev = world.events; world.events = []; return ev; };
  world.onHeroDamaged = (src, tgt) => onHeroDamaged(world, src, tgt);

  /** Tạo entity với giá trị mặc định chung cho mọi loại (tướng, hình nộm, lính, công trình). */
  world.spawnEntity = (f) => {
    const pos = f.pos || { x: 0, y: 0 };
    const e = { id: world.nextId++, isHero: false, alive: true, speed: 0, moveDir: { x: 0, y: 0 }, level: 1, xp: 0, skillPoints: 0, skillLevels: { s1: 0, s2: 0, s3: 0 },
      cooldowns: { s1: 0, s2: 0, s3: 0 }, statuses: [], shields: [], stats: null, hp: 1, mana: 0, attacking: false, attackReady: 0, lastDamagedTick: -99999, dash: null,
      heat: 0, heatUntil: 0, flags: {}, kills: 0, deaths: 0, atkIndex: 0, height: 200, facing: f.team === 0 ? 0 : Math.PI, ...f,
      pos: { ...pos }, prevPos: { ...pos }, spawn: { ...pos } };
    refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana;
    world.entities.push(e);
    return e;
  };
  const makeHero = (data, team, pos, kind) => {
    const e = world.spawnEntity({ kind, isHero: true, team, heroId: data.id, data, radius: data.radius ?? 40, pos, skillPoints: 1, autoLevel: true, teamMode: map.id !== 'duel1v1' });
    if (kind === 'hero') { initEconomy(e); equip(e, { spellId: SPELLS[data.defaultSpell]?.disabledIn1v1 && !e.teamMode ? 'chop_buoc' : data.defaultSpell || 'chop_buoc' }); refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; }
    autoLevel(e);
    return e;
  };
  world.spawnHero = (heroId, team, pos) => makeHero(HEROES[heroId], team, pos, 'hero');
  world.spawnDummy = (team, pos) => makeHero(DUMMY, team, pos, 'dummy');
  /** Gắn bot điều khiển tướng (06 §5). */
  world.addBot = (e, difficulty = 'normal', laneIdx = null) => { e.goldMult = DIFFICULTY[difficulty]?.goldMult ?? 1; return laneIdx != null && map.lanes.length > 1 ? createLaneBot(world, e, difficulty, laneIdx) : createBot(world, e, difficulty); };
  world.command = (entityId, cmd) => {
    let q = world.queue.get(entityId); if (!q) world.queue.set(entityId, (q = []));
    if (cmd.type === 'move' || cmd.type === 'attack') { const i = q.findIndex((c) => c.type === cmd.type); if (i >= 0) { q[i] = cmd; return; } }
    q.push(cmd);
  };
  world.debug = {
    /** Bỏ bùa và đồ để đo sát thương thuần (dùng trong kiểm thử). */
    bare(e) { e.charm = null; e.items = e.items.map(() => null); e.bonus = computeBonus(e); refreshStats(world, e); e.hp = e.stats.maxHp; },
    resetCooldowns(e) { e.cooldowns.s1 = e.cooldowns.s2 = e.cooldowns.s3 = 0; e.mana = e.stats.maxMana; },
    level15(e) { setLevel(world, e, 15); },
    fullHeal(e) { e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; },
  };
  if (structures) spawnStructures(world);

  world.update = (tick) => {
    if (world.over) return;
    world.tick = tick;
    for (const e of world.entities) { e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; }
    for (const [id, q] of world.queue) { const e = world.byId(id); for (const c of q) applyCommand(world, e, c); world.queue.delete(id); }
    for (const e of world.entities) {
      if (!e.alive) { if (e.isHero && e.kind === 'hero' && world.tick >= e.respawnTick) { e.alive = true; e.pos.x = e.spawn.x; e.pos.y = e.spawn.y; e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; refreshStats(world, e); e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; world.emit('respawn', { id: e.id }); } continue; }
      updateStatuses(world, e, dealDamage);
      refreshStats(world, e);
      if (e.kind === 'dummy') { if (world.tick - e.lastDamagedTick > 150) e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.maxHp / 30); continue; }
      if (e.kind !== 'hero') continue;
      e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.regenHp / 150);
      e.mana = Math.min(e.stats.maxMana, e.mana + e.stats.regenMana / 150);
      updateItems(world, e);
      e.data.passive?.hooks?.onTick?.(makeCtx(world, e));
    }
    updateEconomy(world);
    if (world.waves) updateWaves(world);
    updateMinions(world);
    updateStructures(world);
    const due = world.pending.filter((p) => p.tick <= world.tick);
    if (due.length) { world.pending = world.pending.filter((p) => p.tick > world.tick); for (const p of due) p.run(); }
    updateProjectiles(world); updateZones(world);
    updateMovement(world);
    updateCombat(world);
    // dọn lính đã chết sau 1 giây (để hiệu ứng ngã kịp chạy)
    world.entities = world.entities.filter((e) => !(e.kind === 'minion' && !e.alive && world.tick - e.deadTick > 30));
    checkMatch(world);
    updateBots(world);
  };
  return world;
}
