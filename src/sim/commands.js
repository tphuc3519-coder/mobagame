// Người chơi và bot dùng cùng một kiểu Command (02 §6).
import { castSkill } from './skills.js';
import { levelSkill } from './stats.js';
import { castSpell, castRestore } from './spells.js';
import { buyItem, sellItem } from './inventory.js';
import { useItem } from './items.js';
import { startRecall, cancelRecall } from './economy.js';

export function applyCommand(world, e, cmd) {
  if (!e) return;
  // lúc chết vẫn được mua/bán đồ và nâng kỹ năng (như Liên Quân); các lệnh khác bỏ qua
  if (!e.alive && !['buy', 'sell', 'levelSkill'].includes(cmd.type)) return;
  switch (cmd.type) {
    case 'move': e.moveDir.x = cmd.dir.x; e.moveDir.y = cmd.dir.y; break;
    case 'attack': e.attacking = cmd.on !== false; e.preferTarget = cmd.preferTarget ?? null; break;
    case 'cast': { const r = castSkill(world, e, cmd.slot, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: cmd.slot, reason: r.reason }); break; }
    case 'spell': { const r = castSpell(world, e, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'spell', reason: r.reason }); break; }
    case 'restore': { const r = castRestore(world, e); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'restore', reason: r.reason }); break; }
    case 'buy': { const r = buyItem(world, e, cmd.item); if (!r.ok) world.emit('buyFail', { id: e.id, item: cmd.item, reason: r.reason }); break; }
    case 'sell': sellItem(world, e, cmd.slot); break;
    case 'useItem': { const r = useItem(world, e, cmd.slot); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'item', reason: r.reason }); break; }
    case 'recall': if (e.recall) cancelRecall(world, e); else startRecall(world, e); break;
    case 'levelSkill': levelSkill(e, cmd.slot); break;
    default: break;
  }
}
