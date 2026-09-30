// Người chơi và bot dùng cùng một kiểu Command (02 §6). Mốc 1: chỉ có 'move'.
export function applyCommand(world, entity, cmd) {
  if (!entity || !entity.alive) return;
  if (cmd.type === 'move') { entity.moveDir.x = cmd.dir.x; entity.moveDir.y = cmd.dir.y; }
}
