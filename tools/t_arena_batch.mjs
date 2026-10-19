// Đo N trận 5v5 toàn bot (06 §4.6, đợt kiểm toán GĐ1c): node tools/t_arena_batch.mjs [số trận=50] [độ khó=normal] [số tiến trình=4]
// In: số trận kết thúc trong 35 phút, trung vị / TB thời lượng, tỉ lệ Xanh thắng, mạng hạ / trận, mục tiêu lớn bị hạ / trận, trại rừng / trận, bot kẹt > 5s, lỗi.
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CAP = 35 * 60 * 30;
async function runOne(seed, diff) {
  const { createWorld } = await import('../src/sim/world.js');
  const { ARENA } = await import('../src/data/maps.js');
  const { setupTeams } = await import('../src/sim/lineup.js');
  const w = createWorld({ map: ARENA, seed });
  const { player } = setupTeams(w, { heroId: (await import('../src/data/heroes/index.js')).ALPHA[seed % 20], difficulty: diff });
  w.addBot(player, diff, player.laneIdx);
  const hs = w.entities.filter((e) => e.kind === 'hero');
  let t = 0, bosses = 0, camps = 0, stuck = 0, err = null;
  try {
    while (!w.over && t < CAP) {
      w.update(++t);
      for (const ev of w.events) { if (ev.type === 'monsterKill' && ev.boss) bosses++; else if (ev.type === 'campCleared') camps++; }
      w.events.length = 0;
      if (t % 30 === 0) for (const h of hs) if (h.bot && h.bot.stuck > 150) stuck++;
    }
  } catch (e) { err = e.message; }
  return { seed, over: !!w.over, win: w.over?.winner ?? null, min: t / 1800, kills: hs.reduce((a, h) => a + h.kills, 0), bosses, camps, stuck, err, lv: hs.reduce((a, h) => a + h.level, 0) / 10 };
}

if (process.argv[2] === '--child') {
  process.on('message', async ({ seeds, diff }) => { const out = []; for (const s of seeds) out.push(await runOne(s, diff)); process.send(out); process.exit(0); });
} else {
  const N = +(process.argv[2] || 50), diff = process.argv[3] || 'normal', P = +(process.argv[4] || 4), t0 = Date.now();
  const seeds = Array.from({ length: N }, (_, i) => 100 + i), parts = Array.from({ length: P }, (_, k) => seeds.filter((_, i) => i % P === k));
  const res = (await Promise.all(parts.map((ss) => new Promise((ok) => { const c = fork(fileURLToPath(import.meta.url), ['--child']); c.on('message', ok); c.send({ seeds: ss, diff }); })))).flat();
  const avg = (f, l = res) => l.reduce((a, r) => a + f(r), 0) / Math.max(1, l.length), ended = res.filter((r) => r.over);
  console.log(`${N} trận 5v5 (${diff}) trong ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const mins = ended.map((r) => r.min).sort((a, b) => a - b), med = mins.length ? mins[Math.floor(mins.length / 2)] : 0, blue = ended.filter((r) => r.win === 0).length;
  console.log(`kết thúc ${ended.length}/${N} · trung vị ${med.toFixed(1)} phút · Xanh thắng ${blue}/${ended.length} (${Math.round((100 * blue) / Math.max(1, ended.length))}%) · TB ${avg((r) => r.min, ended).toFixed(1)} phút · mạng hạ/trận ${avg((r) => r.kills).toFixed(1)} · mục tiêu lớn/trận ${avg((r) => r.bosses).toFixed(2)} · trại rừng/trận ${avg((r) => r.camps).toFixed(1)} · cấp TB cuối ${avg((r) => r.lv).toFixed(1)}`);
  const errs = res.filter((r) => r.err), stuck = res.reduce((a, r) => a + r.stuck, 0);
  console.log(`bot kẹt > 5s: ${stuck} lần · lỗi: ${errs.length}${errs.length ? ' ' + errs.map((r) => r.seed + ':' + r.err).join(' | ') : ''}`);
  const ok = !errs.length && ended.length >= N * 0.8;
  console.log(ok ? 'Tất cả đạt' : 'LỖI'); process.exit(ok ? 0 : 1);
}
