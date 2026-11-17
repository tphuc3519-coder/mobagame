// Đo THIÊN LỆCH PHE của bản đồ 5v5 (không lẫn với sức mạnh đội hình): mỗi cặp hai trận toàn máy cùng seed, cùng hai đội hình A / B, trận
// đầu A bên Xanh, trận sau A bên Đỏ. Đội hình mạnh thắng cả hai trận thì bù trừ nhau; còn lại là lợi thế của chính bên bản đồ.
// Dùng: node tools/t_side.mjs [số cặp=32] [độ khó=normal] [số tiến trình=4] [seed đầu=300]
// In: tỉ lệ Xanh thắng trên mọi trận đã kết thúc (kèm sai số chuẩn), số cặp "phe quyết định" (cùng một bên thắng cả hai trận) theo bên,
// số cặp "đội hình quyết định" (cùng đội hình thắng cả hai). Bản đồ công bằng: Xanh ≈ 50% trong khoảng ±2 sai số chuẩn.
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CAP = 35 * 60 * 30;
async function runOne(seed, swap, diff) {
  const { createWorld } = await import('../src/sim/world.js');
  const { ARENA } = await import('../src/data/maps.js');
  const { setupTeams } = await import('../src/sim/lineup.js');
  const { ALPHA } = await import('../src/data/heroes/index.js');
  // hai đội hình cố định theo seed (không phụ thuộc bên): 10 tướng khác nhau lấy vòng trong danh sách
  const ids = Array.from({ length: 10 }, (_, i) => ALPHA[(seed * 7 + i * 3) % ALPHA.length]);
  const uniq = [...new Set(ids)]; for (let k = 0; uniq.length < 10; k++) if (!uniq.includes(ALPHA[k])) uniq.push(ALPHA[k]);
  const A = uniq.slice(0, 5), B = uniq.slice(5, 10);
  const w = createWorld({ map: ARENA, seed });
  setupTeams(w, { humans: [], allies: swap ? B : A, foes: swap ? A : B, difficulty: diff });
  let t = 0, err = null;
  try { while (!w.over && t < CAP) { w.update(++t); w.events.length = 0; } } catch (e) { err = e.message; }
  return { seed, swap, over: !!w.over, win: w.over?.winner ?? null, min: t / 1800, err };
}

if (process.argv[2] === '--child') {
  process.on('message', async ({ jobs, diff }) => { const out = []; for (const [s, sw] of jobs) out.push(await runOne(s, sw, diff)); process.send(out); process.exit(0); });
} else {
  const N = +(process.argv[2] || 32), diff = process.argv[3] || 'normal', P = +(process.argv[4] || 4), S0 = +(process.argv[5] || 300), t0 = Date.now();
  const jobs = Array.from({ length: N }, (_, i) => [[S0 + i, 0], [S0 + i, 1]]).flat(), parts = Array.from({ length: P }, (_, k) => jobs.filter((_, i) => i % P === k));
  const res = (await Promise.all(parts.map((js) => new Promise((ok) => { const c = fork(fileURLToPath(import.meta.url), ['--child']); c.on('message', ok); c.send({ jobs: js, diff }); })))).flat();
  const ended = res.filter((r) => r.over), blue = ended.filter((r) => r.win === 0).length, p = blue / Math.max(1, ended.length), se = Math.sqrt(p * (1 - p) / Math.max(1, ended.length));
  let sideB = 0, sideR = 0, lineup = 0;
  for (let i = 0; i < N; i++) {
    const a = res.find((r) => r.seed === S0 + i && !r.swap), b = res.find((r) => r.seed === S0 + i && r.swap);
    if (!a?.over || !b?.over) continue;
    if (a.win === b.win) { if (a.win === 0) sideB++; else sideR++; } else lineup++; // cùng bên thắng cả hai → phe quyết định; khác bên → đội hình A (hoặc B) thắng cả hai
  }
  const errs = res.filter((r) => r.err);
  console.log(`${N} cặp trận đổi bên (${diff}, seed ${S0}…${S0 + N - 1}) trong ${((Date.now() - t0) / 1000).toFixed(0)}s · kết thúc ${ended.length}/${res.length}`);
  console.log(`Xanh thắng ${blue}/${ended.length} (${(100 * p).toFixed(0)}% ± ${(100 * se).toFixed(0)}% sai số chuẩn) · cặp phe quyết định: Xanh ${sideB}, Đỏ ${sideR} · cặp đội hình quyết định: ${lineup} · lỗi: ${errs.length}`);
  const ok = !errs.length && ended.length >= res.length * 0.8;
  console.log(ok ? 'Tất cả đạt' : 'LỖI'); process.exit(ok ? 0 : 1);
}
