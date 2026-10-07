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
