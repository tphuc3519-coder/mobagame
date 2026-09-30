// Mô phỏng: KHÔNG chạm DOM/canvas/three. Đơn vị: cm; pos.x, pos.y là mặt phẳng đất.
import { HEROES } from '../data/heroes/index.js';
import { mulberry32 } from '../core/rng.js';
import { applyCommand } from './commands.js';
import { updateMovement } from './movement.js';

export function createWorld({ map, seed = 1 }) {
  const world = { map, tick: 0, rng: mulberry32(seed), entities: [], nextId: 1, commands: new Map() };
  world.spawnHero = (heroId, team, pos) => {
    const d = HEROES[heroId];
    const e = { id: world.nextId++, kind: 'hero', team, heroId, radius: d.radius ?? 40, alive: true,
      pos: { ...pos }, prevPos: { ...pos }, facing: team === 0 ? 0 : Math.PI, speed: 0,
      stats: { moveSpeed: d.moveSpeed ?? d.base.moveSpeed }, moveDir: { x: 0, y: 0 } };
    world.entities.push(e);
    return e;
  };
  world.command = (entityId, cmd) => world.commands.set(entityId, cmd); // bản mới nhất trong tick thắng
  world.update = (tick) => {
    world.tick = tick;
    for (const e of world.entities) { e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; }
    for (const [id, cmd] of world.commands) applyCommand(world, world.entities.find((e) => e.id === id), cmd);
    updateMovement(world);
  };
  return world;
}
