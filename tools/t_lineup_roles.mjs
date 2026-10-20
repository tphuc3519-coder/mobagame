// Kiểm thử vị trí chốt ở màn chọn đi vào dựng đội 5v5 (sim/lineup.js) + đồ khởi đầu theo vị trí: node tools/t_lineup_roles.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';
import { HEROES } from '../src/data/heroes/index.js';
import { STARTER, starterFor } from '../src/data/items.js';
import { ROLE_IDS } from '../src/data/roles.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const perm = (roles) => JSON.stringify([...roles].sort()) === JSON.stringify([...ROLE_IDS].sort());
const laneIdx = (id) => ARENA.lanes.findIndex((l) => l.id === id);

const ALLIES = ['hoa_ren', 'nguyet_ha', 'tieu_anh', 'long_dang'], FOES = ['phu_dong', 'thu_linh', 'cau_may', 'bong_tre', 'hanh_hoa'];
const ALLY_R = ['temple', 'mid', 'river', 'support'], FOE_R = ['temple', 'mid', 'river', 'jungle', 'support'];

// (1) đủ vị trí: người chơi Kitewing (xạ thủ) đi rừng
{
  const w = createWorld({ map: ARENA, seed: 7 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', playerRole: 'jungle', allies: ALLIES, allyRoles: ALLY_R, foes: FOES, foeRoles: FOE_R });
  ok('người chơi: Kitewing, đi rừng, không có bot, về đường Giữa khi cần', player?.isPlayer && player.heroId === 'canh_dieu' && player.role === 'jungle' && !player.bot && player.laneIdx === laneIdx('mid'), `${player?.heroId} ${player?.role} lane ${player?.laneIdx}`);
  ok('đồng đội đúng vị trí đã chốt', ALLIES.every((h, i) => teams[0].find((e) => e.heroId === h)?.role === ALLY_R[i]));
  ok('đối thủ đúng vị trí đã chốt', FOES.every((h, i) => teams[1].find((e) => e.heroId === h)?.role === FOE_R[i]));
  ok('mỗi đội đủ 5 vị trí', perm(teams[0].map((e) => e.role)) && perm(teams[1].map((e) => e.role)));
  w.update(1); // lệnh mua đồ khởi đầu xử lý ở tick đầu
  const jg = teams[1].find((e) => e.role === 'jungle'), items = (jg.items || []).filter(Boolean);
  ok('máy đi rừng đối thủ mang Trừng Trị + Nanh Thú Rừng', jg.spell?.id === 'thu_hoach' && items.includes('nanh_thu_rung'), `${jg.heroId} ${jg.spell?.id} ${items.join(',')}`);
  ok('đúng 1 người chơi', teams[0].filter((e) => e.isPlayer).length === 1 && !teams[1].some((e) => e.isPlayer));
}
// (2) chỉ có vị trí người chơi
{
  const w = createWorld({ map: ARENA, seed: 3 });
  const { player, teams } = setupTeams(w, { heroId: 'hoa_ren', playerRole: 'support' });
  ok('chỉ playerRole: người chơi nhận đúng vị trí, đội vẫn đủ 5 vị trí', player?.isPlayer && player.heroId === 'hoa_ren' && player.role === 'support' && perm(teams[0].map((e) => e.role)), player?.role);
}
// (3) vị trí sai / thiếu = như cũ (theo đường ưu tiên), tất định
{
  const sig = (opts, seed) => { const w = createWorld({ map: ARENA, seed }); const r = setupTeams(w, opts); return JSON.stringify(r.teams.map((t) => t.map((e) => [e.heroId, e.role, e.isPlayer ? 1 : 0, Math.round(e.pos.x), Math.round(e.pos.y)]))); };
  let same = true;
  for (let s = 1; s <= 20; s++) { const base = sig({ heroId: 'hoa_ren' }, s); if (sig({ heroId: 'hoa_ren', playerRole: 'xyz' }, s) !== base || sig({ heroId: 'hoa_ren', playerRole: undefined, allyRoles: [], foeRoles: undefined }, s) !== base) same = false; }
  ok('vị trí sai / thiếu: đội hình + chỗ đứng y như không truyền (20 seed)', same);
}
// (4) đối thủ trùng tướng người chơi: vẫn nhận ra người chơi theo vị trí
{
  const w = createWorld({ map: ARENA, seed: 11 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', playerRole: 'mid', allies: ['hoa_ren', 'tieu_anh', 'bong_tre', 'long_dang'], allyRoles: ['temple', 'river', 'jungle', 'support'], foes: ['canh_dieu', 'thu_linh', 'phu_dong', 'bong_tre', 'hanh_hoa'], foeRoles: ['river', 'mid', 'temple', 'jungle', 'support'] });
  ok('trùng tướng hai đội: đúng 1 người chơi, đúng vị trí', teams[0].filter((e) => e.isPlayer).length === 1 && player.role === 'mid' && player.team === 0 && player.heroId === 'canh_dieu');
}
// (5) đồ khởi đầu theo vị trí
{
  const H = HEROES.canh_dieu, S = JSON.stringify;
  ok('starterFor: đi rừng + Trừng Trị → Nanh Thú Rừng + Túi Hạt', S(starterFor(H, 'jungle', 'thu_hoach')) === S(['nanh_thu_rung', 'tui_hat']));
  ok('starterFor: đi rừng không mang Trừng Trị → theo lớp tướng', S(starterFor(H, 'jungle', 'chop_buoc')) === S(STARTER.marksman));
  ok('starterFor: trợ thủ → đồ trợ thủ', S(starterFor(HEROES.hoa_ren, 'support', 'chop_buoc')) === S(STARTER.support));
  ok('starterFor: không vị trí (1v1) → theo lớp tướng', S(starterFor(HEROES.hoa_ren, undefined, 'chop_buoc')) === S(STARTER.fighter));
}
// (6) 2 phút 5v5, người chơi đi rừng do máy cầm hộ
{
  const w = createWorld({ map: ARENA, seed: 7 });
  const { player } = setupTeams(w, { heroId: 'canh_dieu', playerRole: 'jungle', allies: ALLIES, allyRoles: ALLY_R, foes: FOES, foeRoles: FOE_R });
  w.addBot(player, 'normal', player.laneIdx);
  let err = null; try { for (let t = 1; t <= 3600; t++) { w.update(t); w.events.length = 0; } } catch (e) { err = e; }
  ok('2 phút trận 5v5 (người chơi đi rừng) chạy không lỗi', !err, err ? err.stack.split('\n').slice(0, 2).join(' ') : `vàng ${Math.round(player.gold)} cấp ${player.level}`);
}

console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
