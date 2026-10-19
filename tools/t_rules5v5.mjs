// Luật 5v5 bổ sung ở đợt kiểm toán (GĐ1b): node tools/t_rules5v5.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { dealDamage } from '../src/sim/damage.js';
import { applyStatus } from '../src/sim/status.js';
import { onMonsterKilled } from '../src/sim/jungle.js';
import { spawnMinion, giantsFor } from '../src/sim/minions.js';
import { addGold, gainXp } from '../src/sim/economy.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const arena = () => createWorld({ map: ARENA, seed: 5, waves: false });

{ // giáp trụ ngoài: trước phút 4 trụ ngoài nhận 60% sát thương; trụ trong không
  const w = arena(), outer = w.entities.find((e) => e.sid === 'mid_outer' && e.team === 1), inner = w.entities.find((e) => e.sid === 'mid_inner' && e.team === 1);
  const h = w.spawnHero('hoa_ren', 0, { x: outer.pos.x - 300, y: outer.pos.y }); w.debug.bare(h);
  spawnMinion(w, 'sword', 0, 1, 0).pos = { ...outer.pos }; // lính mình đứng cạnh: không tính phá lén
  const a = dealDamage(w, h, outer, 100, 'true');
  w.tick = 30 * 241; const b = dealDamage(w, h, outer, 100, 'true');
  ok('giáp trụ ngoài: −40% trước phút 4', Math.abs(a - 60) < 0.01 && Math.abs(b - 100) < 0.01, `${a.toFixed(0)} → ${b.toFixed(0)}`);
  ok('trụ ngoài có tầng outer, trụ trong inner', outer.tier === 'outer' && inner.tier === 'inner');
}
{ // trụ nhà hồi 15 máu/giây khi không bị đánh 8s
  const w = arena(), home = w.entities.find((e) => e.sid === 'mid_home' && e.team === 1);
  home.hp = 3000; home.lastDamagedTick = 0; let t = 0;
  for (let i = 0; i < 30 * 12; i++) w.update(++t);
  ok('trụ nhà hồi máu khi yên (≈15/giây sau 8s)', home.hp > 3000 + 15 * 3 && home.hp < 3000 + 15 * 5, (home.hp - 3000).toFixed(0));
}
{ // lính đổi mục tiêu: tướng địch đánh tướng phe mình gần lính → lính quay sang đánh tướng đó
  const w = arena(), mid = { x: 3000, y: 3000 };
  const m = spawnMinion(w, 'sword', 0, 1, 0); m.pos = { x: mid.x, y: mid.y + 50 };
  const foeM = spawnMinion(w, 'sword', 1, 1, 0); foeM.pos = { x: mid.x + 120, y: mid.y + 60 };
  const ally = w.spawnHero('long_dang', 0, { x: mid.x - 100, y: mid.y }), foe = w.spawnHero('hoa_ren', 1, { x: mid.x + 200, y: mid.y });
  for (const e of w.entities) e.seenBy = [true, true];
  dealDamage(w, foe, ally, 50, 'physical');
  ok('lính đổi mục tiêu sang tướng địch vừa đánh tướng mình', m.target === foe.id && m.aggroUntil > w.tick);
}
{ // bùa cá nhân rơi sang người hạ
  const w = arena(), a = w.spawnHero('hoa_ren', 0, { x: 3000, y: 3000 }), b = w.spawnHero('bong_tre', 1, { x: 3100, y: 3000 });
  applyStatus(w, b, { status: 'statMod', id: 'an_thuy', buff: 'an_thuy', buffName: 'Ấn Thuỷ', cdr: 0.1, regenMana: 30, duration: 50, transfer: true, transferMin: 30 }, b);
  b.hp = 10; dealDamage(w, a, b, 500, 'true');
  const st = a.statuses.find((s) => s.id === 'an_thuy');
  ok('bùa Ấn Thuỷ chuyển sang người hạ, giữ thời gian còn lại', !b.alive && st && st.cdr === 0.1 && Math.abs((st.until - w.tick) / 30 - 50) < 0.1, st ? ((st.until - w.tick) / 30).toFixed(1) : 'không có');
}
{ // hạ Tà Thần: mỗi đường một Người Đá Đèn của đội hạ
  const w = arena(), k = w.spawnHero('hoa_ren', 1, { x: 3000, y: 3000 });
  const boss = w.entities.find((e) => e.kind === 'monster' && e.monsterType === 'ta_than') || { monsterType: 'ta_than', member: 'demon', pos: { x: 3000, y: 3000 }, campId: null };
  onMonsterKilled(w, k, boss, { addGold, gainXp });
  const g = w.entities.filter((e) => e.kind === 'minion' && e.minionType === 'golem');
  ok('Người Đá Đèn: 3 con (mỗi đường), đúng đội', g.length === 3 && g.every((e) => e.team === 1) && new Set(g.map((e) => e.lane)).size === 3);
}
{ // 1v1: siêu lính chỉ cho đội đã phá trụ địch, từ phút 18
  const w = createWorld({ map: DUEL, seed: 2 });
  const outer1 = w.entities.find((e) => e.sid === 'outer' && e.team === 1);
  ok('1v1: chưa phút 18 không có siêu lính', giantsFor(w, 0).length === 0);
  w.tick = 30 * 60 * 19;
  ok('1v1: chưa phá trụ thì không có siêu lính', giantsFor(w, 0).length === 0 && giantsFor(w, 1).length === 0);
  outer1.alive = false;
  ok('1v1: phá trụ ngoài địch → 1 siêu lính, bên kia không', giantsFor(w, 0).length === 1 && giantsFor(w, 1).length === 0);
}
{ // 1v1 đột tử từ phút 30: công trình nhận gấp đôi
  const w = createWorld({ map: DUEL, seed: 2 }), outer1 = w.entities.find((e) => e.sid === 'outer' && e.team === 1);
  const h = w.spawnHero('hoa_ren', 0, { x: outer1.pos.x - 300, y: outer1.pos.y });
  spawnMinion(w, 'sword', 0, 0, 0).pos = { ...outer1.pos };
  w.tick = 30 * 60 * 31; const d = dealDamage(w, h, outer1, 100, 'true');
  ok('1v1 đột tử: công trình nhận gấp đôi', Math.abs(d - 200) < 0.01, d.toFixed(0));
}
console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
