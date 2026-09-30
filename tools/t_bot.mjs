// Mốc 5: bot vs bot. node tools/t_bot.mjs [số trận] [độ khó A] [độ khó B]
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { ALPHA } from '../src/data/heroes/index.js';
import { STARTER } from '../src/data/items.js';
import { HEROES } from '../src/data/heroes/index.js';

const N = parseInt(process.argv[2] || '50', 10), dA = process.argv[3] || 'normal', dB = process.argv[4] || 'normal';
const CAP = 30 * 60 * 30; // tối đa 30 phút
let ended = 0, stuckMax = 0, stuckGames = 0, total = 0; const wins = [0, 0], dur = [], kd = [];
const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const w = createWorld({ map: DUEL, seed: 1000 + g });
  const a = ALPHA[g % ALPHA.length], b = process.env.MIRROR ? a : ALPHA[(g * 7 + 3) % ALPHA.length];
  const p = [w.spawnHero(a, 0, { ...DUEL.spawn[0] }), w.spawnHero(b, 1, { ...DUEL.spawn[1] })];
  p.forEach((h, i) => { for (const it of STARTER[HEROES[h.heroId].roles[0]] || []) w.command(h.id, { type: 'buy', item: it }); w.addBot(h, i ? dB : dA); });
  let t = 0, sm = 0;
  while (!w.over && t < CAP) { w.update(++t); w.drainEvents(); for (const h of p) sm = Math.max(sm, h.bot.stuck); }
  if (sm > 150) stuckGames++;
  stuckMax = Math.max(stuckMax, sm);
  if (w.over) { ended++; wins[w.over.winner]++; dur.push(t / 1800); }
  kd.push(`${a}(${p[0].kills}/${p[0].deaths}) vs ${b}(${p[1].kills}/${p[1].deaths}) ${w.over ? 'thắng ' + (w.over.winner ? 'Đỏ' : 'Xanh') : 'HOÀ'} ${(t / 1800).toFixed(1)}p lv${p[0].level}/${p[1].level}`);
  total += t;
}
kd.slice(0, 12).forEach((s) => console.log(s));
const avg = dur.length ? dur.reduce((a, b) => a + b, 0) / dur.length : 0;
console.log(`\n${N} trận (${dA} vs ${dB}) trong ${((Date.now() - t0) / 1000).toFixed(1)}s · kết thúc ${ended}/${N} · Xanh ${wins[0]} Đỏ ${wins[1]} · TB ${avg.toFixed(1)} phút · kẹt lâu nhất ${(stuckMax / 30).toFixed(1)}s (${stuckGames} trận > 5s)`);
const ok = ended === N && stuckGames === 0;
console.log(ok ? 'Tất cả đạt' : 'LỖI'); process.exit(ok ? 0 : 1);
