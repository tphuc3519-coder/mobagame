// Tín hiệu (ping), bot đồng đội làm theo, Quét Sạch, mua nhanh 2 món, thời điểm áp khống chế (GĐ2 — HUD trong trận).
// Dùng: node tools/t_pings.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';
import { applyStatus } from '../src/sim/status.js';
import { dealDamage } from '../src/sim/damage.js';
import { quickBuys } from '../src/sim/inventory.js';
import { PING } from '../src/data/signals.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const run = (w, n) => { for (let i = 0; i < n; i++) w.update(w.tick + 1); };
const drain = (w) => w.drainEvents();

// --- 1. đặt tín hiệu, giới hạn tần suất, chỉ ở 5v5 ---
{
  const w = createWorld({ map: ARENA, seed: 7 });
  const { player } = setupTeams(w, { heroId: 'canh_dieu', difficulty: 'normal' });
  run(w, 2); drain(w);
  const at = { x: 5175, y: 5175 }; // hang Long Ngư
  w.command(player.id, { type: 'ping', kind: 'gather', x: at.x, y: at.y }); run(w, 1);
  let ev = drain(w).filter((e) => e.type === 'ping');
  ok('Tập hợp: có sự kiện ping + world.pings', ev.length === 1 && w.pings.some((p) => p.kind === 'gather' && p.src === player.id && !p.bot), JSON.stringify(ev[0] || {}).slice(0, 80));
  w.command(player.id, { type: 'ping', kind: 'retreat', x: at.x, y: at.y }); run(w, 1);
  ok('cách nhau < 0,6 s: bị chặn (rate)', drain(w).some((e) => e.type === 'pingFail' && e.reason === 'rate'));
  run(w, 20); w.command(player.id, { type: 'ping', kind: 'careful', x: 9000, y: 9000 }); run(w, 20); w.command(player.id, { type: 'ping', kind: 'attack', x: 9000, y: 9000 }); run(w, 20); w.command(player.id, { type: 'ping', kind: 'gather', x: 9000, y: 9000 }); run(w, 1);
  const evs = drain(w);
  ok('4 tín hiệu trong 6 s: cái thứ 4 bị chặn', evs.filter((e) => e.type === 'ping').length === 2 && evs.some((e) => e.type === 'pingFail' && e.reason === 'rate'), evs.map((e) => e.type).filter((t) => t.startsWith('ping')).join(','));
  run(w, 30 * 7); w.command(player.id, { type: 'ping', kind: 'bogus', x: 1, y: 1 }); run(w, 1);
  ok('loại lạ: từ chối (kind)', drain(w).some((e) => e.type === 'pingFail' && e.reason === 'kind'));
  run(w, 30 * (PING.show + 9)); ok('hết giờ: tín hiệu tự xoá', w.pings.length === 0, w.pings.length);
  const d = createWorld({ map: DUEL, seed: 1 }), a = d.spawnHero('hoa_ren', 0, { x: 900, y: 1200 });
  d.command(a.id, { type: 'ping', kind: 'gather', x: 1000, y: 1200 }); run(d, 1);
  ok('1v1: không có tín hiệu (mode)', d.drainEvents().some((e) => e.type === 'pingFail' && e.reason === 'mode') && d.pings.length === 0);
}

// --- 2. đánh dấu mục tiêu: chỉ khi đội mình thấy ---
{
  const w = createWorld({ map: ARENA, seed: 8 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', difficulty: 'normal' });
  run(w, 2); drain(w);
  const foe = teams[1][0];
  foe.pos.x = 15000; foe.pos.y = 3000; run(w, 5); drain(w); // xa, trong sương mù
  w.command(player.id, { type: 'ping', kind: 'attack', x: 15000, y: 3000, target: foe.id }); run(w, 1);
  const p1 = w.pings.at(-1); ok('địch trong sương mù: không lộ mục tiêu', p1 && p1.target == null);
  player.pos.x = player.pos.y = 9600; foe.pos.x = 10000; foe.pos.y = 9600; run(w, 20); drain(w); // giữa sông (xa Suối Đèn); chờ qua khoảng cách tối thiểu giữa 2 tín hiệu
  w.command(player.id, { type: 'ping', kind: 'attack', x: 0, y: 0, target: foe.id }); run(w, 1);
  const p2 = w.pings.at(-1); ok('địch nhìn thấy: tín hiệu bám đúng mục tiêu + chỗ', p2 && p2.target === foe.id && Math.abs(p2.x - Math.round(foe.pos.x)) < 40, p2 && `${p2.target} ${p2.x}`);
}

// --- 3. bot đồng đội làm theo: Tập hợp / Tấn công kéo bot gần nhất, Rút lui bắt bot lùi ---
{
  const w = createWorld({ map: ARENA, seed: 9 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', difficulty: 'normal' });
  run(w, 30 * 40); drain(w);
  const at = { x: 9600, y: 9600 }; // giữa sông
  w.command(player.id, { type: 'ping', kind: 'gather', x: at.x, y: at.y }); run(w, 31);
  const orders = teams[0].filter((b) => b.bot).map((b) => w.brains?.[0]?.orders?.get(b.id)).filter((o) => o?.kind === 'ping');
  const acks = drain(w).filter((e) => e.type === 'pingAck');
  ok('Tập hợp: 1–4 bot nhận lệnh đi tới', orders.length >= 1 && orders.length <= PING.gather.bots && orders.every((o) => o.mode === 'gather' && o.x === at.x), orders.length);
  ok('đúng một lần báo "Tới ngay" (pingAck)', acks.length === 1 && acks[0].bots.length === orders.length, acks.length);
  const crew = teams[0].filter((b) => b.bot && w.brains[0].orders.get(b.id)?.kind === 'ping'), d0 = crew.map((b) => Math.hypot(b.pos.x - at.x, b.pos.y - at.y));
  run(w, 30 * 6); drain(w);
  const d1 = crew.map((b) => Math.hypot(b.pos.x - at.x, b.pos.y - at.y));
  ok('bot nhận lệnh đi về phía điểm tập hợp', d1.reduce((a, b) => a + b, 0) < d0.reduce((a, b) => a + b, 0) - 1500, `${Math.round(d0.reduce((a, b) => a + b, 0))} → ${Math.round(d1.reduce((a, b) => a + b, 0))}`);
  run(w, 20);
  const near = teams[0].find((b) => b.bot && b.alive); const rp = { x: Math.round(near.pos.x + 300), y: Math.round(near.pos.y) };
  w.command(player.id, { type: 'ping', kind: 'retreat', x: rp.x, y: rp.y }); run(w, 3);
  near.bot.next = w.tick; run(w, 2);
  ok('Rút lui gần bot: bot chuyển sang RETREAT', near.bot.state === 'RETREAT' || !near.alive, near.bot.state);
  const allBot = createWorld({ map: ARENA, seed: 9 }), r2 = setupTeams(allBot, { heroId: 'canh_dieu', difficulty: 'normal' }); allBot.addBot(r2.player, 'normal', r2.player.laneIdx);
  run(allBot, 30 * 60 * 3); ok('trận toàn bot: bot không tự ra tín hiệu', allBot.pings.length === 0 && !allBot.drainEvents().some((e) => e.type === 'ping'));
}

// --- 4. Quét Sạch ---
{
  const w = createWorld({ map: ARENA, seed: 10 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', difficulty: 'normal' });
  run(w, 2); drain(w);
  for (const f of teams[1].slice(0, 4)) dealDamage(w, player, f, 1e6, 'true');
  ok('chưa hết đội: chưa Quét Sạch', !drain(w).some((e) => e.type === 'ace'));
  dealDamage(w, player, teams[1][4], 1e6, 'true');
  const ace = drain(w).filter((e) => e.type === 'ace');
  ok('hạ người cuối: đúng 1 sự kiện Quét Sạch', ace.length === 1 && ace[0].team === 1 && ace[0].by === 0 && ace[0].victims.length === 5, JSON.stringify(ace[0] || {}).slice(0, 90));
  const back = teams[1][0]; back.alive = true; back.hp = back.stats.maxHp; dealDamage(w, player, back, 1e6, 'true');
  ok('một người hồi sinh rồi chết lại khi cả đội vẫn nằm: không báo lại', !drain(w).some((e) => e.type === 'ace'));
}

// --- 5. mua nhanh 2 món + thời điểm áp khống chế ---
{
  const w = createWorld({ map: ARENA, seed: 11 });
  const { player, teams } = setupTeams(w, { heroId: 'canh_dieu', difficulty: 'normal' });
  player.gold = 9000; const q = quickBuys(player, 2);
  ok('mua nhanh: 2 món khác nhau', q.length === 2 && q[0].id !== q[1].id, q.map((x) => x.id).join(','));
  run(w, 10); const s = applyStatus(w, teams[1][0], { status: 'stun', duration: 1.5 }, player);
  ok('khống chế ghi lúc áp (t0) để HUD vẽ thanh thời gian', s && s.t0 === w.tick && s.until > s.t0, s && `${s.t0} ${s.until}`);
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
