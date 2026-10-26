import { ACE } from '../data/signals.js';
// Thắng/thua: phá nhà chính đối phương (03 §B4), hoặc một đội đầu hàng.
export function checkMatch(world) {
  if (world.over) return;
  for (const s of world.entities) {
    if (s.kind === 'core' && !s.alive) { world.over = { winner: 1 - s.team, tick: world.tick }; world.emit('gameover', { winner: world.over.winner }); return; }
  }
}
/** Đội `team` đầu hàng: đội kia thắng ngay. */
export function surrender(world, team) {
  if (world.over) return;
  world.over = { winner: 1 - team, tick: world.tick, surrender: team };
  world.emit('gameover', { winner: world.over.winner, surrender: team });
}

/** Quét Sạch: `victim` vừa ngã và cả đội của họ (≥ ACE.minTeam tướng) đều đang chết — báo một lần cho mỗi lần cả đội bị hạ hết
 *  (ai đã chết từ trước lần Quét Sạch trước và chưa hồi sinh thì không tính lại). Chỉ ở bản đồ nhiều đường. */
export function checkAce(world, victim, killerId = null) {
  if (victim.kind !== 'hero' || world.map.lanes.length < 2) return;
  const team = victim.team, mates = world.entities.filter((h) => h.kind === 'hero' && h.team === team);
  if (mates.length < ACE.minTeam || mates.some((h) => h.alive)) return;
  const last = (world.aceTick ||= [-1, -1])[team];
  if (mates.some((h) => h.deadTick <= last)) return;
  world.aceTick[team] = world.tick;
  world.emit('ace', { id: victim.id, team, by: 1 - team, killer: killerId, victims: mates.map((h) => h.id) });
}
