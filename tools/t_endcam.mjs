// Camera cuối trận (render/endCam.js, data/endgame.js). Dùng: node tools/t_endcam.mjs
import { smoother, createEndCam, endTarget } from '../src/render/endCam.js';
import { END } from '../src/data/endgame.js';
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
ok('smootherstep 0 / 0,5 / 1', smoother(0) === 0 && smoother(1) === 1 && Math.abs(smoother(0.5) - 0.5) < 1e-12);
let mono = true; for (let i = 1; i <= 100; i++) if (smoother(i / 100) < smoother((i - 1) / 100)) mono = false; ok('smootherstep đơn điệu', mono);
const c = createEndCam({ from: { x: 0, z: 0 }, to: { x: 100, z: 200 }, panSec: 0.9 });
const mid = c.look(0.45); ok('giữa quãng: đúng nửa đường, rate đủ lớn', Math.abs(mid.x - 50) < 1e-9 && Math.abs(mid.z - 100) < 1e-9 && mid.rate >= 1000);
const end = c.look(0.5); ok('hết quãng: tới đúng đích', end.x === 100 && end.z === 200 && c.t >= 0.9);
for (const [map, name] of [[ARENA, '5v5'], [DUEL, '1v1']]) {
  const w = createWorld({ map, seed: 1 }); if (map === ARENA) setupTeams(w, { heroId: 'hoa_ren', difficulty: 'normal' }); else w.spawnHero('hoa_ren', 0, { x: 1500, y: 1500 });
  ok(`${name}: nhà chính bên thua`, endTarget(w, 0)?.team === 1 && endTarget(w, 1)?.team === 0);
  w.surrender(1); w.update(w.tick + 1); const go = w.drainEvents().find((e) => e.type === 'gameover');
  ok(`${name}: đầu hàng — thắng đội 0, camera tới nhà chính đội 1`, go?.winner === 0 && endTarget(w, go.winner).team === 1);
}
ok('nhịp: nổ trước khi tới nơi, tới nơi trước khi mở màn kết quả', END.blastAt < END.panSec && END.panSec <= END.bannerSec);
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
