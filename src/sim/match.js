// Thắng/thua: phá nhà chính đối phương (03 §B4).
export function checkMatch(world) {
  if (world.over) return;
  for (const s of world.entities) {
    if (s.kind === 'core' && !s.alive) { world.over = { winner: 1 - s.team, tick: world.tick }; world.emit('gameover', { winner: world.over.winner }); return; }
  }
}
