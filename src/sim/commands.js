// Người chơi và bot dùng cùng một kiểu Command (02 §6). useItem: { slot, aim? } — aim { x, y } hướng (đồ aim 'direction') hoặc { id } mục tiêu
// chỉ định (aim 'target'). Đang bị áp chế / Sương Đông: chiêu, phép, Hồi Máu, đồ, Biến về đều bị từ chối (castFail 'suppressed').
import { castSkill } from './skills.js';
import { levelSkill } from './stats.js';
import { castSpell, castRestore } from './spells.js';
import { buyItem, sellItem } from './inventory.js';
import { useItem } from './items.js';
import { startRecall, cancelRecall } from './economy.js';
import { isLocked } from './status.js';
import { cancelChannel } from './suppress.js';
import { placePing } from './pings.js';

const ACT = new Set(['cast', 'spell', 'restore', 'useItem', 'recall']); // lệnh hành động: bị chặn khi bị áp chế / Sương Đông

export function applyCommand(world, e, cmd) {
  if (!e) return;
  // lúc chết vẫn được mua/bán đồ, nâng kỹ năng (như Liên Quân) và đổi cài đặt chọn mục tiêu; các lệnh khác bỏ qua
  if (!e.alive && !['buy', 'sell', 'levelSkill', 'targetBy', 'ping'].includes(cmd.type)) return; // ping: lúc chết vẫn ra tín hiệu được
  if (ACT.has(cmd.type) && isLocked(e)) { world.emit('castFail', { id: e.id, slot: cmd.type === 'cast' ? cmd.slot : cmd.type === 'useItem' ? 'item' : cmd.type, reason: 'suppressed' }); return; }
  if (e.channel && (cmd.type === 'spell' || cmd.type === 'useItem' || cmd.type === 'recall')) cancelChannel(world, e); // tự dùng phép / đồ / Biến về: thả xích
  switch (cmd.type) {
    case 'move': e.moveDir.x = cmd.dir.x; e.moveDir.y = cmd.dir.y; break;
    case 'attack': e.attacking = cmd.on !== false; e.preferTarget = cmd.preferTarget ?? null; e.attackMode = cmd.mode || null; break; // mode: 'minion' (ăn lính) | 'tower' (đẩy trụ)
    case 'cast': { const r = castSkill(world, e, cmd.slot, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: cmd.slot, reason: r.reason }); break; }
    case 'spell': { const r = castSpell(world, e, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'spell', reason: r.reason }); break; }
    case 'restore': { const r = castRestore(world, e); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'restore', reason: r.reason }); break; }
    case 'buy': { const r = buyItem(world, e, cmd.item); if (!r.ok) world.emit('buyFail', { id: e.id, item: cmd.item, reason: r.reason }); break; }
    case 'sell': sellItem(world, e, cmd.slot); break;
    case 'useItem': { const r = useItem(world, e, cmd.slot, cmd.aim ?? null); if (!r.ok) world.emit('castFail', { id: e.id, slot: 'item', reason: r.reason }); break; }
    case 'recall': if (e.recall) cancelRecall(world, e); else startRecall(world, e); break;
    case 'levelSkill': levelSkill(e, cmd.slot); break;
    case 'ping': { const r = placePing(world, e, cmd); if (!r.ok) world.emit('pingFail', { id: e.id, reason: r.reason }); break; }
    case 'targetBy': e.targetBy = ['pct', 'hp', 'near'].includes(cmd.value) ? cmd.value : null; break; // Cài đặt "Lựa chọn mục tiêu" của người chơi (combat.js → pickByRule); bot không gửi
    default: break;
  }
}
