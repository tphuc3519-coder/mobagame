// Người chơi và bot dùng cùng một kiểu Command (02 §6).
import { castSkill } from './skills.js';
import { levelSkill } from './stats.js';

export function applyCommand(world, e, cmd) {
  if (!e || !e.alive) return;
  switch (cmd.type) {
    case 'move': e.moveDir.x = cmd.dir.x; e.moveDir.y = cmd.dir.y; break;
    case 'attack': e.attacking = cmd.on !== false; e.preferTarget = cmd.preferTarget ?? null; break;
    case 'cast': { const r = castSkill(world, e, cmd.slot, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: cmd.slot, reason: r.reason }); break; }
    case 'levelSkill': levelSkill(e, cmd.slot); break;
    default: break;
  }
}
