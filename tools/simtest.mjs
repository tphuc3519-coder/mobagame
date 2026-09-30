// Chạy trận không cần DOM ở tốc độ tối đa. Dùng: node tools/simtest.mjs [phút=10] [seed=1]
// Kiểm tra (Mốc 3): lính hai bên gặp nhau gần giữa đường, không lỗi/NaN, không công trình nào vỡ khi không có tướng.
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';

const minutes = +(process.argv[2] || 10), seed = +(process.argv[3] || 1);
const w = createWorld({ map: DUEL, seed });
let errors = 0, nan = 0, clash = [], maxMinions = 0, shots = 0;
const t0 = Date.now();
for (let t = 1; t <= minutes * 60 * 30; t++) {
  try { w.update(t); } catch (e) { errors++; console.error('LỖI tick', t, e.stack); break; }
  for (const ev of w.events) if (ev.type === 'towerShot') shots++;
  w.events.length = 0;
  if (t % 30 === 0) {
    const ms = w.entities.filter((e) => e.kind === 'minion' && e.alive);
    maxMinions = Math.max(maxMinions, ms.length);
    for (const e of ms) if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.hp)) nan++;
    // điểm gặp nhau: trung bình x của lính đang đánh nhau (có mục tiêu là lính địch)
    const fighting = ms.filter((e) => { const tg = e.target != null && w.byId(e.target); return tg && tg.kind === 'minion'; });
    if (fighting.length) clash.push(fighting.reduce((a, e) => a + e.pos.x, 0) / fighting.length);
  }
}
const towersLost = w.entities.filter((e) => e.structure && !e.noTarget && !e.alive).length;
const avg = clash.length ? clash.reduce((a, b) => a + b, 0) / clash.length : NaN;
console.log(`Mô phỏng ${minutes} phút trong ${Date.now() - t0} ms`);
console.log(`lính tối đa cùng lúc: ${maxMinions}, đợt: ${w.waveNo}, phát bắn của trụ: ${shots}`);
console.log(`điểm giao chiến trung bình x = ${avg.toFixed(0)} (giữa bản đồ = 2800)`);
let fail = errors + nan;
const okMid = Math.abs(avg - 2800) < 400;
console.log((okMid ? 'ĐẠT' : 'LỖI') + ' lính gặp nhau gần giữa đường'); if (!okMid) fail++;
console.log((towersLost === 0 ? 'ĐẠT' : 'LỖI') + ` không có công trình nào vỡ (${towersLost})`); if (towersLost) fail++;
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
