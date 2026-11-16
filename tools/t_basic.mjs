// Đòn đánh thường (docs/12_DANH_THUONG.md) — 15 kịch bản của đợt rà soát 16/11 + các lỗi đã đo được trước khi sửa. Chạy thẳng mô phỏng
// (không trình duyệt), tất định. Mỗi kịch bản kiểm: sát thương đúng lúc đòn chạm, không trúng mục tiêu không hợp lệ, không trúng hai lần,
// giữ đúng mục tiêu, đứng / đi đúng, nhịp đánh đúng tốc đánh. Dùng: node tools/t_basic.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { ALPHA, HEROES } from '../src/data/heroes/index.js';
import { BASIC } from '../src/data/economy.js';
import { applyStatus } from '../src/sim/status.js';
import { dealDamage } from '../src/sim/damage.js';
import { spawnMinion } from '../src/sim/minions.js';
import { strikeMiss } from '../src/sim/targeting.js';
import { T } from '../src/sim/util.js';
import { setupOnline, applyFrame, hashWorld, sanitizeCommand, mapOf } from '../src/net/protocol.js';
import { mulberry32 } from '../src/core/rng.js';

let fail = 0; const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const Y = DUEL.road.y, MELEE = 'kiem_thuy', RANGED = 'nguyet_ha';
const gapOf = (a, b) => Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y) - b.radius;
const face = (a, b) => { let d = Math.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x) - a.facing; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

/** Hai tướng trên bản đồ 1v1 trống (không trụ, không lính): a đội Xanh ở x = 2000, b đội Đỏ cách `gap`. b rất nhiều máu (đánh mãi không chết). */
function mk(aId, bId, gap, { assist = 'near', tank = true } = {}) {
  const w = createWorld({ map: DUEL, seed: 11, structures: false, waves: false });
  const a = w.spawnHero(aId, 0, { x: 2000, y: Y }), b = w.spawnHero(bId, 1, { x: 2000 + gap, y: Y });
  w.debug.bare(a); w.debug.bare(b);
  if (tank) { b.data = { ...b.data, base: { ...b.data.base, maxHp: 5e5 } }; w.update(0); b.hp = b.stats.maxHp; }
  if (assist) w.command(a.id, { type: 'assist', reach: assist });
  const s = { w, a, b, t: 0, log: [], swings: [] };
  s.step = (n = 1, each = null) => { for (let i = 0; i < n; i++) { each?.(s.t + 1); w.update(++s.t);
    for (const ev of w.events) { s.log.push({ ...ev }); if (ev.type === 'attack' && ev.id === a.id) s.swings.push({ tick: ev.tick, target: a.swingTarget, delay: ev.delay, interval: ev.interval, whiff: !!ev.whiff }); }
    w.events.length = 0; } };
  s.hits = (id = b.id, src = a.id) => s.log.filter((e) => e.type === 'damage' && e.id === id && e.src === src);
  s.place = (e, x, y = Y) => { e.pos.x = e.prevPos.x = x; e.pos.y = e.prevPos.y = y; };
  return s;
}
const tankify = (w, e) => { e.data = { ...e.data, base: { ...e.data.base, maxHp: 5e5 } }; w.debug.bare(e); e.hp = e.stats.maxHp; };

// ————— TEST 1: cận chiến đánh mục tiêu đứng yên —————
{
  const s = mk(MELEE, RANGED, 150), x0 = s.a.pos.x;
  s.w.command(s.a.id, { type: 'attack', on: true }); s.step(200);
  const sw = s.swings, h = s.hits(), delayT = T(sw[0].delay), iv = T(1 / s.a.stats.atkSpeed);
  ok('1. cận chiến / đứng yên: sát thương rơi đúng lúc đòn chạm (hết thời gian vung), không phải lúc bắt đầu vung', h.length > 3 && h.every((d, i) => d.tick === sw[i].tick + delayT) && delayT >= 3, `vung ${delayT} tick (${sw[0].delay} giây)`);
  ok('1. mỗi lần vung đúng một lần trúng, không trúng lặp', h.length === sw.filter((x) => x.tick + delayT <= s.t).length && new Set(h.map((d) => d.tick)).size === h.length, `${sw.length} lần vung, ${h.length} lần trúng`);
  ok('1. hai lần vung cách nhau đúng một nhịp đánh (1 / tốc đánh)', sw.slice(1).every((x, i) => x.tick - sw[i].tick === iv), `${iv} tick`);
  ok('1. sát thương các đòn như nhau và > 0; tướng đứng yên, mặt hướng mục tiêu', h.every((d) => d.amount === h[0].amount && d.amount > 0) && Math.abs(s.a.pos.x - x0) < 1 && face(s.a, s.b) < 0.01, `mỗi đòn ${h[0].amount}`);
}

// ————— TEST 2: cận chiến đánh mục tiêu đang chạy đi —————
{
  const s = mk(MELEE, RANGED, 150); let far = 0;
  applyStatus(s.w, s.b, { status: 'slow', pct: 0.45, duration: 60 }, s.a);
  s.w.command(s.a.id, { type: 'attack', on: true });
  s.step(330, () => s.w.command(s.b.id, { type: 'move', dir: { x: 1, y: 0 } }));
  const h = s.hits(), reach = s.a.stats.range + BASIC.leash;
  for (const d of h) { /* khoảng cách lúc trúng không lưu trong sự kiện: kiểm bằng điều kiện tổng quát bên dưới */ void d; }
  ok('2. cận chiến / mục tiêu chạy đi (chậm hơn mình): tự đuổi theo và vẫn đánh trúng đều', h.length >= 5 && s.b.pos.x > 2600, `${h.length} lần trúng, mục tiêu đã chạy ${Math.round(s.b.pos.x - 2150)} đơn vị`);
  ok('2. đuổi mà không dính sát / chạy vượt mục tiêu: luôn ở sau mục tiêu, trong tầm với', s.a.pos.x < s.b.pos.x && gapOf(s.a, s.b) <= reach + 60, `cách ${Math.round(gapOf(s.a, s.b))} (tầm đánh ${s.a.stats.range})`);
  // mục tiêu chạy nhanh hơn hẳn: không đuổi mãi, không trúng đòn nào từ xa
  const s2 = mk(MELEE, RANGED, 150); applyStatus(s2.w, s2.b, { status: 'haste', pct: 1.2, duration: 60 }, s2.b);
  s2.w.command(s2.a.id, { type: 'attack', on: true });
  s2.step(240, () => { s2.w.command(s2.b.id, { type: 'move', dir: { x: 1, y: 0 } }); if (gapOf(s2.a, s2.b) > s2.a.stats.range + BASIC.leash + 80) far++; });
  const lateHits = s2.hits().filter((d) => d.tick > 60).length;
  ok('2. mục tiêu chạy nhanh hơn hẳn: thoát được, không ăn đòn nào khi đã ra khỏi tầm với', far > 100 && lateHits === 0, `ngoài tầm với ${far} tick, trúng muộn ${lateHits}`);
}

// ————— TEST 3: mục tiêu chạy vòng quanh người đánh —————
{
  const s = mk(MELEE, RANGED, 140, { assist: 'off' }); let worst = 0; const at = new Map();
  s.w.command(s.a.id, { type: 'attack', on: true });
  s.step(300, (t) => { const ang = t * 0.05; s.place(s.b, s.a.pos.x + Math.cos(ang) * 140, Y + Math.sin(ang) * 140); });
  // lúc mỗi đòn chạm: mặt người đánh phải đang hướng về mục tiêu
  const s3 = mk(MELEE, RANGED, 140, { assist: 'off' }); s3.w.command(s3.a.id, { type: 'attack', on: true });
  for (let t = 1; t <= 300; t++) { const ang = t * 0.05; s3.place(s3.b, s3.a.pos.x + Math.cos(ang) * 140, Y + Math.sin(ang) * 140); const n = s3.hits().length; s3.step(1); if (s3.hits().length > n) { const f = face(s3.a, s3.b); at.set(t, f); worst = Math.max(worst, f); } }
  ok('3. mục tiêu chạy vòng quanh (1,5 rad / giây): vẫn trúng đủ nhịp', s.hits().length >= 6, `${s.hits().length} lần trúng`);
  ok('3. lúc đòn chạm, mặt người đánh hướng đúng mục tiêu (không chém một hướng mà trúng hướng khác)', at.size >= 6 && worst < 0.12, `lệch nhiều nhất ${(worst * 57.3).toFixed(1)}°`);
}

// ————— TEST 4: đánh xa, mục tiêu đứng yên —————
{
  const s = mk(RANGED, MELEE, 450), x0 = s.a.pos.x; let maxProj = 0;
  s.w.command(s.a.id, { type: 'attack', on: true });
  s.step(260, () => { maxProj = Math.max(maxProj, s.w.projectiles.length); });
  const sw = s.swings, h = s.hits(), delayT = T(sw[0].delay), speed = HEROES[RANGED].basicAttack.projectile.speed;
  const travel = h[0].tick - (sw[0].tick + delayT);
  ok('4. đánh xa / đứng yên: đạn rời tay sau thời gian vung, bay rồi mới gây sát thương', h.length >= 4 && travel >= 2 && Math.abs(travel - (1 + Math.ceil((450 - s.b.radius * 0.6) / (speed / 30)))) <= 2, `vung ${delayT} tick + bay ${travel} tick (tốc độ đạn ${speed})`);
  ok('4. mỗi viên đạn trúng đúng một lần, đạn trúng xong là được dọn', h.length === sw.filter((x) => x.tick + delayT + travel <= s.t).length && maxProj <= 2 && s.w.projectiles.every((p) => p.homing === s.b.id), `${h.length} lần trúng, nhiều nhất ${maxProj} viên cùng lúc`);
  ok('4. tướng đánh xa đứng tại chỗ khi mục tiêu đã trong tầm (không tự áp sát)', Math.abs(s.a.pos.x - x0) < 1);
}

// ————— TEST 5: đánh xa, mục tiêu di chuyển —————
{
  const s = mk(RANGED, MELEE, 380, { assist: 'off' }); let old = 0; const born = new Map();
  s.w.command(s.a.id, { type: 'attack', on: true });
  s.step(300, (t) => { s.place(s.b, s.a.pos.x + 380, Y + Math.sin(t * 0.07) * 260); for (const p of s.w.projectiles) { if (!born.has(p.id)) born.set(p.id, t); else if (t - born.get(p.id) > 60) old++; } });
  const rel = s.swings.filter((x) => !x.whiff && x.tick + T(x.delay) + 20 <= s.t).length;
  ok('5. đánh xa / mục tiêu chạy ngang: đạn bám theo và trúng hết, không viên nào bay xuyên qua', s.hits().length >= rel && rel >= 4, `${rel} viên đã bắn đủ lâu, ${s.hits().length} lần trúng`);
  ok('5. không viên đạn nào sống quá 2 giây', old === 0);
  // mục tiêu trong tầm + tầm tự đi tới: tướng đánh xa dừng ở mép tầm đánh, không lao vào cận chiến
  const s2 = mk(RANGED, MELEE, 0, { assist: 'far' }); const R = s2.a.stats.range; s2.place(s2.b, s2.a.pos.x + R + s2.b.radius + 300);
  s2.w.command(s2.a.id, { type: 'attack', on: true }); s2.step(120);
  ok('5. mục tiêu ngoài tầm một đoạn: tướng đánh xa tiến tới đúng mép tầm đánh rồi bắn (không áp sát)', s2.hits().length >= 1 && gapOf(s2.a, s2.b) > R - 60 && gapOf(s2.a, s2.b) <= R + 1, `dừng cách ${Math.round(gapOf(s2.a, s2.b))} (tầm đánh ${R})`);
}

// ————— TEST 6: nhiều địch trong tầm —————
{
  const s = mk(MELEE, RANGED, 140, { tank: false });
  const c = s.w.spawnHero('long_dang', 1, { x: 2000 + 120, y: Y + 70 }), d = s.w.spawnHero('thu_linh', 1, { x: 2000 + 120, y: Y - 70 });
  for (const e of [s.b, c, d]) { s.w.debug.bare(e); e.hp = 160; e.spawn = { x: 5200, y: Y }; } // ít máu (3 đòn là ngã); hồi sinh thì ở xa, không lẫn vào phép đếm
  s.w.command(s.a.id, { type: 'attack', on: true });
  const order = []; let after = 0; const dead = new Set();
  for (let i = 0; i < 2400 && dead.size < 3; i++) { const n = s.log.length; s.step(1); for (const ev of s.log.slice(n)) { if (ev.type === 'damage' && ev.src === s.a.id) { if (dead.has(ev.id)) after++; if (order[order.length - 1] !== ev.id) order.push(ev.id); } if (ev.type === 'death') dead.add(ev.id); } }
  const perTick = new Map(); for (const ev of s.log) if (ev.type === 'damage' && ev.src === s.a.id) perTick.set(ev.tick, (perTick.get(ev.tick) || new Set()).add(ev.id));
  ok('6. ba tướng địch trong tầm: đánh xong con này mới sang con khác (không nhảy qua lại)', dead.size === 3 && order.length === 3, `thứ tự mục tiêu: ${order.length} lượt đổi cho 3 mục tiêu`);
  ok('6. đòn đơn mục tiêu chỉ trúng một địch mỗi lần vung; địch đã chết không nhận thêm sát thương', [...perTick.values()].every((x) => x.size === 1) && after === 0);
}

// ————— TEST 7: mục tiêu ra / vào tầm —————
{
  const s = mk(MELEE, RANGED, 150, { assist: 'off' }), R = s.a.stats.range;
  s.w.command(s.a.id, { type: 'attack', on: true }); s.step(3);
  s.place(s.b, s.a.pos.x + 150 + 900); s.step(8); // dời đi 900 ngay giữa lúc vung (tốc biến / bị đẩy)
  const miss = s.log.find((e) => e.type === 'attackMiss' && e.id === s.a.id);
  ok('7. mục tiêu ra khỏi tầm với giữa lúc vung: đòn TRƯỢT (trước đây vẫn trúng ở cách 1 050 đơn vị)', s.hits().length === 0 && miss?.reason === 'range', JSON.stringify(miss || {}));
  const t0 = s.t; s.place(s.b, s.a.pos.x + 150); s.step(14);
  ok('7. vào lại tầm: ra đòn lại ngay (không phải chờ hết nhịp đánh của đòn trượt)', s.hits().length === 1 && s.hits()[0].tick - t0 <= T(BASIC.retry) + T(s.swings[0].delay) + 2, `trúng sau ${s.hits()[0] ? s.hits()[0].tick - t0 : '?'} tick`);
  // đi bộ ra xa trong lúc vung không thoát được đòn (chỉ lướt / tốc biến mới thoát)
  const s2 = mk(MELEE, RANGED, 0, { assist: 'off' }); s2.place(s2.b, s2.a.pos.x + R + s2.b.radius - 2);
  s2.w.command(s2.a.id, { type: 'attack', on: true }); s2.step(1); s2.step(12, () => s2.w.command(s2.b.id, { type: 'move', dir: { x: 1, y: 0 } }));
  ok('7. mục tiêu chỉ ĐI BỘ ra xa trong lúc vung: đòn vẫn trúng (không "trượt oan" khi nhìn thấy còn trong tầm)', s2.hits().length === 1, `mục tiêu đã đi ${Math.round(gapOf(s2.a, s2.b) - R)} quá tầm lúc kiểm`);
  // ngoài tầm hẳn, không tự đi tới: không có sát thương
  const s3 = mk(MELEE, RANGED, 150 + 700, { assist: 'off' }); s3.w.command(s3.a.id, { type: 'attack', on: true }); s3.step(90);
  ok('7. mục tiêu đứng ngoài tầm (không bật tự đi tới): không gây sát thương nào', s3.hits().length === 0);
}

// ————— TEST 8 + 9: tốc đánh cao / thấp —————
for (const [label, mod] of [['8. tốc đánh cao (kịch trần 2,5 đòn / giây)', 5], ['9. tốc đánh thấp (−50%)', -0.5]]) {
  for (const id of [MELEE, RANGED]) {
    const s = mk(id, id === MELEE ? RANGED : MELEE, id === MELEE ? 150 : 400);
    applyStatus(s.w, s.a, { status: 'statMod', id: 'test_as', atkSpeedPct: mod, duration: 60 }, s.a); s.step(1);
    const as = s.a.stats.atkSpeed, iv = T(1 / as);
    s.w.command(s.a.id, { type: 'attack', on: true }); s.step(mod < 0 ? 420 : 240);
    const sw = s.swings, gaps = sw.slice(1).map((x, i) => x.tick - sw[i].tick), done = sw.filter((x) => x.tick + T(x.delay) + 12 <= s.t).length;
    ok(`${label} — ${id}: nhịp vung đúng 1 / tốc đánh, các đòn không chồng nhau`, gaps.length > 2 && gaps.every((g) => g === iv) && sw.every((x) => T(x.delay) <= Math.round(iv * 0.8) + 0 && T(x.delay) < iv), `tốc đánh ${as.toFixed(2)} → ${iv} tick / đòn, vung ${T(sw[0].delay)} tick, ${sw.length} đòn trong ${mod < 0 ? 14 : 8} giây`);
    ok(`${label} — ${id}: số lần trúng = số đòn đã chạm`, s.hits().length >= done && s.hits().length <= sw.length, `${s.hits().length} trúng / ${sw.length} vung`);
  }
}

// ————— TEST 10: người đánh chết giữa lúc vung —————
{
  const s = mk(MELEE, RANGED, 150); s.w.command(s.a.id, { type: 'attack', on: true }); s.step(3);
  dealDamage(s.w, s.b, s.a, 1e6, 'true'); s.step(20);
  ok('10. người đánh chết giữa lúc vung: đòn đó không gây sát thương', !s.a.alive && s.hits().length === 0);
  const r = mk(RANGED, MELEE, 400); r.w.command(r.a.id, { type: 'attack', on: true }); r.step(3); dealDamage(r.w, r.b, r.a, 1e6, 'true'); r.step(30);
  ok('10. tướng đánh xa chết trước khi đạn rời tay: không có đạn, không sát thương', r.hits().length === 0 && r.w.projectiles.length === 0);
}

// ————— TEST 11: mục tiêu chết khi đạn đang bay —————
{
  const s = mk(RANGED, MELEE, 500, { tank: false }); s.w.command(s.a.id, { type: 'attack', on: true });
  let n = 0; while (!s.w.projectiles.length && n++ < 60) s.step(1);
  s.w.command(s.a.id, { type: 'attack', on: false });
  const c = s.w.spawnHero('long_dang', 0, { x: 2000, y: Y + 300 }); dealDamage(s.w, c, s.b, 1e6, 'true'); // đồng đội hạ mục tiêu trước khi đạn tới
  let err = null; try { s.step(30); } catch (e) { err = e; }
  ok('11. mục tiêu chết khi đạn đang bay: đạn được dọn, không sát thương, không lỗi', !err && !s.b.alive && s.w.projectiles.length === 0 && s.hits().length === 0 && s.log.some((e) => e.type === 'attackMiss' && e.reason === 'dead' && e.proj), err ? String(err) : '');
  const u = mk(RANGED, MELEE, 500); u.w.command(u.a.id, { type: 'attack', on: true }); n = 0; while (!u.w.projectiles.length && n++ < 60) u.step(1);
  u.w.command(u.a.id, { type: 'attack', on: false }); applyStatus(u.w, u.b, { status: 'untargetable', duration: 1.5 }, u.b); u.step(25);
  ok('11. mục tiêu thành "không thể chọn" (đang nhảy) khi đạn đang bay: đạn tan, không sát thương (trước đây vẫn trúng)', u.hits().length === 0 && u.w.projectiles.length === 0);
  const m = mk(MELEE, RANGED, 150); m.w.command(m.a.id, { type: 'attack', on: true }); m.step(3); applyStatus(m.w, m.b, { status: 'untargetable', duration: 0.6 }, m.b); m.step(8);
  ok('11. cận chiến: mục tiêu thành không thể chọn giữa lúc vung → trượt (trước đây vẫn trúng)', m.hits().length === 0 && m.log.some((e) => e.type === 'attackMiss' && e.reason === 'untargetable'));
}

// ————— TEST 12: chơi online có độ trễ —————
{
  const cfg = { mode: '1v1', seed: 4242, difficulty: 'normal', bots: false, players: [{ team: 0, heroId: MELEE, name: 'A' }, { team: 1, heroId: RANGED, name: 'B' }] };
  const boot = () => { const w = createWorld({ map: mapOf('1v1'), seed: cfg.seed }); const { humans } = setupOnline(w, cfg); return { w, humans, dmg: 0, atk: 0 }; };
  const X = boot(), Z = boot(), rng = mulberry32(99).next, LAT = [4, 9]; // người 1 trễ 4 tick (~130 ms), người 2 trễ 9 tick (~300 ms)
  for (const m of [X, Z]) { m.humans[0].pos.x = m.humans[0].prevPos.x = 2600; m.humans[1].pos.x = m.humans[1].prevPos.x = 2900; }
  const due = new Map(), push = (t, id, c) => { const k = sanitizeCommand(c); if (!k) return; if (!due.has(t)) due.set(t, []); due.get(t).push([id, k]); };
  let same = true, bad = sanitizeCommand({ type: 'attack', on: true, damage: 9999, target: 5, hit: true });
  for (let t = 1; t <= 900; t++) {
    for (const i of [0, 1]) { // mỗi người bấm theo ý mình ở tick t; lệnh tới mọi máy ở tick t + độ trễ của người đó — CÙNG một tick trên mọi máy
      const me = X.humans[i], foe = X.humans[1 - i];
      if (t === 1) push(t + LAT[i], me.id, { type: 'assist', reach: 'near' });
      if (rng() < 0.08) push(t + LAT[i], me.id, { type: 'attack', on: rng() < 0.8, preferTarget: rng() < 0.5 ? foe.id : null });
      if (rng() < 0.05) push(t + LAT[i], me.id, { type: 'move', dir: rng() < 0.5 ? { x: 0, y: 0 } : { x: rng() * 2 - 1, y: rng() * 2 - 1 } });
      if (rng() < 0.02) { const c = { type: 'attack', on: true }; push(t + LAT[i], me.id, c); push(t + LAT[i], me.id, c); push(t + LAT[i], me.id, c); } // bấm dồn 3 lần trong một nhịp
    }
    const frame = due.get(t) || null; due.delete(t);
    for (const m of [X, Z]) { applyFrame(m.w, t, frame); for (const ev of m.w.events) { if (ev.type === 'damage') m.dmg += ev.amount; if (ev.type === 'attack') m.atk++; } m.w.events.length = 0; }
    if (t % 30 === 0 && hashWorld(X.w) !== hashWorld(Z.w)) same = false;
  }
  const maxAtk = X.humans.reduce((n, h) => n + Math.ceil(30 * 2.5) + 1, 0); // trần lý thuyết: 2,5 đòn / giây mỗi người trong 30 giây
  ok('12. online, hai người trễ 130 ms / 300 ms: hai máy ra cùng một trận (mã băm trùng mọi mốc, cùng tổng sát thương)', same && X.dmg === Z.dmg && X.dmg > 0 && X.atk === Z.atk, `${X.atk} lần vung, tổng sát thương ${X.dmg}`);
  ok('12. bấm dồn / lệnh lặp không sinh thêm đòn (số lần vung không vượt nhịp đánh)', X.atk <= maxAtk, `${X.atk} ≤ ${maxAtk}`);
  ok('12. lệnh đánh từ máy khách không mang được "sát thương" hay "đã trúng": bộ lọc chỉ giữ on / mode / preferTarget', JSON.stringify(bad) === '{"type":"attack","on":true,"mode":null,"preferTarget":null}', JSON.stringify(bad));
}

// ————— TEST 13: đổi mục tiêu liên tục —————
{
  const s = mk(MELEE, RANGED, 140); const c = s.w.spawnHero('long_dang', 1, { x: 2000 + 120, y: Y + 80 }); tankify(s.w, c);
  const iv = T(1 / s.a.stats.atkSpeed); let wrong = 0;
  s.step(240, (t) => s.w.command(s.a.id, { type: 'attack', on: true, preferTarget: t % 2 ? s.b.id : c.id })); // mỗi tick khoá một mục tiêu khác
  const sw = s.swings, dm = s.log.filter((e) => e.type === 'damage' && e.src === s.a.id);
  for (const d of dm) { const w0 = sw.filter((x) => x.tick <= d.tick).pop(); if (!w0 || w0.target !== d.id) wrong++; }
  ok('13. đổi mục tiêu khoá mỗi tick: nhịp đánh không đổi (không ra thêm đòn, không mất đòn)', sw.slice(1).every((x, i) => x.tick - sw[i].tick === iv) && sw.length >= 4, `${sw.length} lần vung, cách nhau ${iv} tick`);
  ok('13. đòn nào trúng đúng mục tiêu đã chọn lúc bắt đầu vung đòn đó (không vung vào A mà trúng B)', wrong === 0 && dm.length >= 4, `${dm.length} lần trúng, sai mục tiêu ${wrong}`);
}

// ————— TEST 14: hai tướng đánh nhau cùng lúc —————
{
  const s = mk(MELEE, MELEE, 150, { tank: false }); s.w.command(s.b.id, { type: 'assist', reach: 'near' });
  s.w.command(s.a.id, { type: 'attack', on: true }); s.w.command(s.b.id, { type: 'attack', on: true });
  let guard = 0; while (s.a.alive && s.b.alive && guard++ < 3000) s.step(1);
  const ab = s.hits(s.b.id, s.a.id), ba = s.hits(s.a.id, s.b.id), deadAt = s.log.find((e) => e.type === 'death')?.tick;
  ok('14. hai tướng giống nhau đánh nhau cùng lúc: hai bên trúng cùng nhịp, cùng sát thương mỗi đòn', ab.length > 3 && Math.abs(ab.length - ba.length) <= 1 && ab[0].tick === ba[0].tick && ab[0].amount === ba[0].amount, `${ab.length} / ${ba.length} lần trúng, mỗi đòn ${ab[0]?.amount}`);
  ok('14. một bên ngã: không còn sát thương nào sau đó, không ai trúng hai lần trong một tick', s.log.filter((e) => e.type === 'damage' && e.tick > deadAt).length === 0 && new Set(ab.map((d) => d.tick)).size === ab.length && new Set(ba.map((d) => d.tick)).size === ba.length);
}

// ————— TEST 15: mọi tướng, mọi kiểu đánh —————
{
  const bad = []; let melee = 0, ranged = 0;
  for (const id of ALPHA) {
    const H = HEROES[id], isMelee = !!H.basicAttack.melee, foe = id === 'thach_quy' ? 'hoa_ren' : 'thach_quy';
    let s, err = null;
    try {
      s = mk(id, foe, 0); const R = s.a.stats.range; s.place(s.b, s.a.pos.x + R + s.b.radius - (isMelee ? 20 : 60));
      s.w.command(s.a.id, { type: 'attack', on: true }); let proj = 0; s.step(150, () => { proj = Math.max(proj, s.w.projectiles.filter((p) => p.owner === s.a.id).length); });
      const sw = s.swings, h = s.hits(), iv = 1 / s.a.stats.atkSpeed, want = Math.min(H.basicAttack.delay ?? 0.25, iv * 0.8);
      const first = h[0] ? h[0].tick - sw[0].tick : -1;
      if (!sw.length || sw.some((x) => Math.abs(x.delay - want) > 1e-9)) bad.push(`${id}: thời gian vung ${sw[0]?.delay} ≠ ${want}`);
      if (h.length < Math.floor(5 * s.a.stats.atkSpeed) - 1) bad.push(`${id}: chỉ ${h.length} lần trúng trong 5 giây (tốc đánh ${s.a.stats.atkSpeed.toFixed(2)})`);
      if (first < T(want) || (isMelee && first !== T(want)) || (!isMelee && first <= T(want))) bad.push(`${id}: đòn đầu trúng sau ${first} tick (vung ${T(want)})`);
      if (isMelee ? proj > 0 && !H.passive?.params : proj === 0) bad.push(`${id}: ${isMelee ? 'cận chiến mà có đạn' : 'đánh xa mà không có đạn'}`);
      if (h.some((d) => !(d.amount > 0)) || !Number.isFinite(s.a.pos.x)) bad.push(`${id}: sát thương / vị trí sai`);
      if (isMelee) melee++; else ranged++;
    } catch (e) { err = e; bad.push(`${id}: ${String(e.stack).split('\n').slice(0, 2).join(' | ')}`); }
  }
  ok(`15. cả ${ALPHA.length} tướng (${melee} cận chiến, ${ranged} đánh xa): vung đúng thời gian riêng của tướng, trúng sau khi vung, đủ số đòn theo tốc đánh`, !bad.length, bad.slice(0, 4).join(' ; '));
}

// ————— thêm: các lỗi đã đo được trước khi sửa —————
{
  // mục tiêu chết giữa lúc vung: không phải chờ hết nhịp đánh mới đánh được con kế bên (đo trước khi sửa: 1,63 giây)
  const s = mk(MELEE, RANGED, 150, { tank: false }); const c = s.w.spawnHero('long_dang', 1, { x: 2000 + 140, y: Y + 60 }); tankify(s.w, c);
  s.w.command(s.a.id, { type: 'attack', on: true, preferTarget: s.b.id }); s.step(3);
  const ally = s.w.spawnHero('thu_linh', 0, { x: 1700, y: Y }); dealDamage(s.w, ally, s.b, 1e6, 'true');
  const t0 = s.t; s.w.command(s.a.id, { type: 'attack', on: true }); let n = 0; while (!s.hits(c.id).length && n++ < 90) s.step(1);
  ok('mục tiêu chết giữa lúc vung: quay sang mục tiêu kế bên ngay (trước: chờ trọn nhịp đánh ~1,6 giây)', s.hits(c.id).length === 1 && s.t - t0 <= T(BASIC.retry) + T(s.swings[0].delay) + 12, `${((s.t - t0) / 30).toFixed(2)} giây (nhịp đánh ${(1 / s.a.stats.atkSpeed).toFixed(2)})`);
  // bị choáng ngắn giữa lúc vung: hết choáng là đánh lại ngay
  const z = mk(MELEE, RANGED, 150); z.w.command(z.a.id, { type: 'attack', on: true }); z.step(3); applyStatus(z.w, z.a, { status: 'stun', duration: 0.3 }, z.b);
  const z0 = z.t; n = 0; while (!z.hits().length && n++ < 120) z.step(1);
  ok('bị choáng 0,3 giây giữa lúc vung: hết choáng là ra đòn lại (trước: 1,63 giây)', z.hits().length === 1 && (z.t - z0) / 30 < 0.75, `${((z.t - z0) / 30).toFixed(2)} giây`);
  // người đánh bị dời đi giữa lúc vung
  const d = mk(MELEE, RANGED, 150, { assist: null }); d.w.command(d.a.id, { type: 'attack', on: true }); d.step(3); d.place(d.a, d.a.pos.x - 900); d.w.command(d.a.id, { type: 'attack', on: false }); d.step(12);
  ok('người đánh bị dời đi 900 giữa lúc vung: đòn không trúng từ xa', d.hits().length === 0);
  // hai lính xê dịch gần bằng nhau: đánh dở con nào đánh tiếp con đó
  const k = mk(MELEE, RANGED, 3000); const m1 = spawnMinion(k.w, 'sword', 1, 0, 0), m2 = spawnMinion(k.w, 'sword', 1, 0, 0), seq = [];
  for (const m of [m1, m2]) { m.data = { ...m.data, base: { ...m.data.base, maxHp: 99999, moveSpeed: 0, atk: 0 } }; m.stats.maxHp = 99999; m.hp = 99999; }
  k.w.command(k.a.id, { type: 'attack', on: true });
  for (let i = 0; i < 260 && seq.length < 6; i++) { k.place(m1, k.a.pos.x + 120 + (i % 46 < 23 ? 0 : 12), Y - 40); k.place(m2, k.a.pos.x + 120 + (i % 46 < 23 ? 12 : 0), Y + 40); const b4 = k.log.length; k.step(1); for (const e of k.log.slice(b4)) if (e.type === 'damage' && e.src === k.a.id) seq.push(e.id === m1.id ? 'A' : 'B'); }
  ok('hai lính xê dịch gần bằng nhau: đánh dở con nào đánh tiếp con đó', seq.length === 6 && new Set(seq).size === 1, seq.join(''));
  // lính cận chiến: tướng tốc biến đi giữa lúc lính vung thì lính đánh trượt
  const q = mk(MELEE, RANGED, 3000, { assist: null }); const mm = spawnMinion(q.w, 'sword', 1, 0, 0); q.place(mm, q.a.pos.x + 90);
  let hit0 = 0; for (let i = 0; i < 90 && !q.log.some((e) => e.type === 'attack' && e.id === mm.id); i++) q.step(1);
  q.step(1); q.place(q.a, q.a.pos.x - 900); q.step(20); hit0 = q.log.filter((e) => e.type === 'damage' && e.id === q.a.id && e.src === mm.id).length;
  ok('lính cận chiến đang vung mà tướng đã tốc biến đi 900: không trúng', q.log.some((e) => e.type === 'attack' && e.id === mm.id) && hit0 === 0);
  ok('strikeMiss: chết / không thể chọn / cận chiến quá tầm với → trượt; đánh xa không xét tầm', strikeMiss(k.a, null, 100, true) === 'dead' && strikeMiss(k.a, { ...m1, alive: false }, 100, true) === 'dead'
    && strikeMiss(k.a, { ...m1, statuses: [{ kind: 'untargetable', until: 1e9 }] }, 9999, true) === 'untargetable' && strikeMiss({ pos: { x: 0, y: 0 } }, { alive: true, statuses: [], radius: 40, pos: { x: 100 + BASIC.leash + 41, y: 0 } }, 100, true) === 'range'
    && strikeMiss({ pos: { x: 0, y: 0 } }, { alive: true, statuses: [], radius: 40, pos: { x: 100 + BASIC.leash + 39, y: 0 } }, 100, true) === null && strikeMiss({ pos: { x: 0, y: 0 } }, { alive: true, statuses: [], radius: 40, pos: { x: 5000, y: 0 } }, 100, false) === null);
}

// ————— cú chạm nhanh nút Đánh không bị nuốt —————
{
  const A = (s) => s.swings.filter((x) => !x.whiff).length;
  const s1 = mk(MELEE, RANGED, 150); s1.w.command(s1.a.id, { type: 'attack', on: true }); s1.w.command(s1.a.id, { type: 'attack', on: false }); s1.step(100);
  ok('bấm rồi thả trong cùng một tick (chạm rất nhanh / mạng dồn tin): vẫn ra đúng một đòn (trước: không ra đòn nào)', A(s1) === 1 && s1.hits().length === 1 && !s1.a.attacking, `${A(s1)} lần vung, ${s1.hits().length} lần trúng`);
  const s2 = mk(MELEE, RANGED, 150); s2.w.command(s2.a.id, { type: 'attack', on: true }); s2.step(12); s2.w.command(s2.a.id, { type: 'attack', on: false }); s2.step(1);
  const iv = T(1 / s2.a.stats.atkSpeed); s2.step(iv - 13 - 6); // còn ~0,2 giây nữa mới tới nhịp đánh kế
  s2.w.command(s2.a.id, { type: 'attack', on: true }); s2.step(2); s2.w.command(s2.a.id, { type: 'attack', on: false }); s2.step(120);
  ok('chạm nhanh khi còn 0,2 giây mới tới nhịp đánh: đòn ra ngay khi tới nhịp, đúng một đòn rồi thôi (trước: cú chạm bị nuốt)', A(s2) === 2 && s2.swings[1].tick - s2.swings[0].tick === iv && !s2.a.attacking, `${A(s2)} lần vung, cách nhau ${s2.swings[1] ? s2.swings[1].tick - s2.swings[0].tick : '?'} tick (nhịp ${iv})`);
  const s3 = mk(MELEE, RANGED, 150); applyStatus(s3.w, s3.a, { status: 'stun', duration: 0.2 }, s3.b); s3.step(1);
  s3.w.command(s3.a.id, { type: 'attack', on: true }); s3.step(2); s3.w.command(s3.a.id, { type: 'attack', on: false }); s3.step(60);
  ok('chạm nhanh lúc đang bị choáng 0,2 giây: hết choáng là ra đòn (một đòn)', A(s3) === 1 && s3.hits().length === 1 && !s3.a.attacking);
  const s4 = mk(MELEE, RANGED, 150); s4.w.command(s4.a.id, { type: 'attack', on: true }); s4.step(12); s4.w.command(s4.a.id, { type: 'attack', on: false }); s4.step(4);
  s4.w.command(s4.a.id, { type: 'attack', on: true }); s4.step(2); s4.w.command(s4.a.id, { type: 'attack', on: false }); s4.step(120); // chạm khi còn ~0,9 giây mới tới nhịp: quá hạn bộ đệm
  ok('chạm quá sớm (còn gần 1 giây mới tới nhịp đánh): hết bộ đệm thì thôi, không tự đánh muộn, không kẹt lệnh đánh', A(s4) === 1 && !s4.a.attacking && s4.a.atkOnce == null);
  const s5 = mk(MELEE, RANGED, 150 + 200); s5.w.command(s5.a.id, { type: 'attack', on: true }); s5.w.command(s5.a.id, { type: 'attack', on: false }); s5.step(150);
  ok('chạm rất nhanh khi địch ngay ngoài tầm: tự đi tới, đánh đúng một đòn rồi đứng', A(s5) === 1 && s5.hits().length === 1 && !s5.a.attacking && !s5.a.chase, `${A(s5)} lần vung, cách mục tiêu ${Math.round(gapOf(s5.a, s5.b))}`);
  const s6 = mk(MELEE, RANGED, 150); s6.w.command(s6.a.id, { type: 'attack', on: true }); s6.step(200); s6.w.command(s6.a.id, { type: 'attack', on: false }); const n6 = A(s6); s6.step(120);
  ok('giữ nút rồi thả: thả là thôi đánh (bộ đệm không làm ra thêm đòn)', A(s6) === n6 && n6 >= 4 && !s6.a.attacking);
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
