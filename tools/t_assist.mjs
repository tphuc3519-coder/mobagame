// Kiểm thử hỗ trợ thao tác của tướng người chơi (sim/assist.js, lệnh 'assist'): nút Đánh tự đi tới địch ngoài tầm (trong tầm + reach),
// kéo cần thì thôi, không tự đi vào tầm trụ địch, chạm nhanh vẫn ra đúng một đòn, đang đánh tướng thì không nhảy mục tiêu, bộ đệm bấm
// chiêu, chiêu khoá mục tiêu ngoài tầm thì đi tới rồi tung; bot / tướng chưa bật thì y như cũ. Dùng: node tools/t_assist.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { ASSIST } from '../src/data/controls.js';
import { spawnMinion } from '../src/sim/minions.js';
import { sanitizeCommand } from '../src/net/protocol.js';
import { dist } from '../src/sim/util.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const place = (u, x, y) => { u.pos.x = u.prevPos.x = x; u.pos.y = u.prevPos.y = y; u.moveDir.x = u.moveDir.y = 0; };
const gap = (a, b) => dist(a.pos, b.pos) - b.radius;

/** Người chơi Hoả Rèn (cận chiến, tầm 170) ở (1000, 1200), một tướng địch đứng yên cách mép `far` về bên phải. Không trụ, không lính. */
function setup({ reach = 'near', far = 170 + 150, hero = 'hoa_ren', foe = 'thach_quy', structures = false } = {}) {
  const w = createWorld({ map: DUEL, seed: 9, structures, waves: false });
  const p = w.spawnHero(hero, 0, { x: 1000, y: 1200 });
  const f = w.spawnHero(foe, 1, { x: 1000 + far + 40, y: 1200 });
  place(p, 1000, 1200); place(f, 1000 + far + f.radius, 1200);
  w.command(p.id, { type: 'targetBy', value: 'pct' });
  if (reach) w.command(p.id, { type: 'assist', reach });
  const s = { w, p, f, t: 0, events: [] };
  s.step = (n = 1) => { for (let i = 0; i < n; i++) { w.update(++s.t); s.events.push(...w.drainEvents()); f.moveDir.x = f.moveDir.y = 0; } };
  return s;
}

{ // 1. giữ Đánh, địch ngoài tầm 150: đi tới rồi đánh trúng nó
  const s = setup(); const x0 = s.p.pos.x;
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step();
  ok('địch ngoài tầm 150 (trong tầm + reach): bắt đầu đuổi, không vung vào khoảng không', s.p.chase?.id === s.f.id && !s.events.some((e) => e.type === 'attack' && e.whiff));
  s.step(45);
  const hit = s.events.find((e) => e.type === 'attack' && !e.whiff);
  ok('đi tới rồi đánh đúng tướng địch', !!hit && s.p.swingTarget === s.f.id && s.p.pos.x > x0 + 100, `x ${x0} → ${s.p.pos.x.toFixed(0)}, đòn ${hit ? 'có' : 'không'}`);
  ok('dừng ở trong tầm (không đi xuyên qua địch)', gap(s.p, s.f) <= s.p.stats.range && gap(s.p, s.f) > 0, gap(s.p, s.f).toFixed(0));
}
{ // 2. chưa bật / tắt: như cũ — đứng tại chỗ vung vào khoảng không
  for (const reach of [null, 'off']) {
    const s = setup({ reach }); const x0 = s.p.pos.x;
    s.w.command(s.p.id, { type: 'attack', on: true }); s.step(30);
    ok(`${reach ? "reach 'off'" : 'chưa bật (bot / bản cũ)'}: không đi, vung vào khoảng không`, s.p.pos.x === x0 && !s.p.chase && s.events.some((e) => e.type === 'attack' && e.whiff));
  }
}
{ // 3. tầm 'far' với tới xa hơn 'near'
  const near = setup({ far: 170 + 400 }), farS = setup({ far: 170 + 400, reach: 'far' });
  for (const s of [near, farS]) { s.w.command(s.p.id, { type: 'attack', on: true }); s.step(); }
  ok("địch ngoài tầm 400: 'near' (260) không đuổi, 'far' (520) đuổi", !near.p.chase && farS.p.chase?.id === farS.f.id);
}
{ // 4. đang kéo cần: không đuổi; kéo cần giữa lúc đuổi: thôi ngay
  const s = setup();
  s.w.command(s.p.id, { type: 'move', dir: { x: 0, y: 1 } }); s.w.command(s.p.id, { type: 'attack', on: true }); s.step(10);
  ok('đang kéo cần + giữ Đánh: không tự đuổi, không khựng lại vung vào khoảng không (đi đều theo cần)', !s.p.chase && s.p.pos.y > 1200 + 90 && Math.abs(s.p.pos.x - 1000) < 1 && !s.events.some((e) => e.type === 'attack' && e.id === s.p.id), `y ${s.p.pos.y.toFixed(0)}`);
  const s2 = setup();
  s2.w.command(s2.p.id, { type: 'attack', on: true }); s2.step(5);
  const mid = s2.p.chase?.id === s2.f.id;
  s2.w.command(s2.p.id, { type: 'move', dir: { x: -1, y: 0 } }); s2.step(); const x1 = s2.p.pos.x; s2.step(8);
  ok('kéo cần giữa lúc đuổi: thôi đuổi, đi theo cần', mid && !s2.p.chase && s2.p.pos.x < x1);
}
{ // 5. chạm nhanh (thả trước khi kịp vung): vẫn đi tới đánh đúng một đòn rồi thôi
  const s = setup();
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step();
  s.w.command(s.p.id, { type: 'attack', on: false }); s.step(60);
  const swings = s.events.filter((e) => e.type === 'attack' && e.id === s.p.id && !e.whiff).length;
  ok('chạm nhanh nút Đánh: đi tới, đúng một đòn, rồi thôi đánh', swings === 1 && !s.p.attacking && !s.p.chase, `${swings} đòn, attacking ${s.p.attacking}`);
}
{ // 6. địch ngoài tầm + reach: không đuổi; chạy thoát giữa lúc đuổi: thôi
  const s = setup({ far: 170 + 260 + 60 });
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step();
  ok('địch ngoài tầm + reach: không đuổi (vung tại chỗ như cũ)', !s.p.chase);
  const s2 = setup();
  s2.w.command(s2.p.id, { type: 'attack', on: true }); s2.step(3);
  place(s2.f, s2.p.pos.x + 170 + 260 + ASSIST.escape + 120, 1200); s2.step();
  ok('mục tiêu chạy xa quá tầm + reach + escape: thôi đuổi', !s2.p.chase);
}
{ // 7. không tự lao vào tầm trụ địch
  const s = setup({ structures: true });
  const tower = s.w.entities.filter((e) => e.structure && e.team === 1 && e.kind === 'tower').sort((a, b) => a.pos.x - b.pos.x)[0]; // trụ ngoài cùng của địch
  const R = tower.stats.range, y = tower.pos.y;
  place(s.f, tower.pos.x - R + 300, y); place(s.p, s.f.pos.x - s.f.radius - 170 - 200, y); // địch đứng sâu trong tầm trụ, mình ngoài tầm
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step(20);
  ok('địch đứng trong tầm trụ địch, mình ngoài: không tự đi vào', !s.p.chase && dist(s.p.pos, tower.pos) > R + s.p.radius, `cách trụ ${dist(s.p.pos, tower.pos).toFixed(0)} / tầm ${R}`);
  const s2 = setup({ structures: true });
  place(s2.p, tower.pos.x - R + 100, y); place(s2.f, s2.p.pos.x + s2.f.radius + 170 + 150, y); // đã đứng trong tầm trụ (đang lao vào): đuổi như thường
  s2.w.command(s2.p.id, { type: 'attack', on: true }); s2.step();
  ok('đã đứng trong tầm trụ: vẫn đuổi', s2.p.chase?.id === s2.f.id);
}
{ // 8. đang đuổi tướng: lính lọt vào tầm không làm đổi mục tiêu
  const s = setup();
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step(2);
  const m = spawnMinion(s.w, 'sword', 1, 0); place(m, s.p.pos.x, s.p.pos.y + 120); m.attacking = false;
  let first = null;
  for (let i = 0; i < 60 && !first; i++) { s.step(); first = s.events.find((e) => e.type === 'attack' && e.id === s.p.id && !e.whiff); }
  ok('đang đuổi tướng: lính lọt vào tầm không cướp mục tiêu', !!first && s.p.swingTarget === s.f.id, `đòn đầu vào ${s.p.swingTarget} (tướng ${s.f.id}, lính ${m.id})`);
}
{ // 9. giữ mục tiêu: đang đánh tướng A, tướng B tụt % máu thấp hơn — vẫn đánh A
  const s = setup({ far: 60 });
  const b = s.w.spawnHero('nguyet_ha', 1, { x: 1000, y: 1330 }); place(b, 1000, 1330);
  s.f.hp = s.f.stats.maxHp * 0.5; b.hp = b.stats.maxHp * 0.9;
  s.w.command(s.p.id, { type: 'attack', on: true }); s.step(); b.moveDir.x = b.moveDir.y = 0;
  const a0 = s.p.swingTarget; b.hp = b.stats.maxHp * 0.2; s.step(60);
  const tg = s.events.filter((e) => e.type === 'attack' && e.id === s.p.id && !e.whiff).length;
  ok('đang đánh tướng A, B tụt % máu thấp hơn: vẫn đánh A (không nhảy mục tiêu)', a0 === s.f.id && s.p.swingTarget === s.f.id && tg >= 2, `đòn ${tg}, mục tiêu ${s.p.swingTarget}`);
}
{ // 10. bộ đệm bấm chiêu: còn hồi ≤ 0,3 s thì giữ lệnh, hết hồi là tung; còn lâu thì báo hỏng ngay
  const s = setup({ far: 60 });
  s.w.debug.level15(s.p); s.step(); s.events.length = 0;
  s.p.cooldowns.s1 = s.t + 6; s.p.mana = s.p.stats.maxMana;
  s.w.command(s.p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); s.step();
  const failNow = s.events.some((e) => e.type === 'castFail');
  s.step(8);
  ok('chiêu còn hồi 0,2 s: không báo hỏng, hết hồi thì tự tung', !failNow && s.events.some((e) => e.type === 'cast' && e.slot === 's1' && e.id === s.p.id), s.events.map((e) => e.type).filter((x) => /cast/i.test(x)).join(','));
  s.events.length = 0; s.p.cooldowns.s2 = s.t + 60;
  s.w.command(s.p.id, { type: 'cast', slot: 's2', aim: { x: 1, y: 0 } }); s.step();
  ok('chiêu còn hồi 2 s: báo hỏng ngay như cũ', s.events.some((e) => e.type === 'castFail' && e.reason === 'cooldown'));
  const n = setup({ far: 60, reach: null }); n.w.debug.level15(n.p); n.step(); n.events.length = 0; n.p.cooldowns.s1 = n.t + 6;
  n.w.command(n.p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); n.step(10);
  ok('chưa bật hỗ trợ (bot): không có bộ đệm, như cũ', n.events.some((e) => e.type === 'castFail') && !n.events.some((e) => e.type === 'cast' && e.slot === 's1'));
}
{ // 11. chiêu khoá mục tiêu ngoài tầm: đi tới rồi tung (Ba Nắm K3 — lướt tới mục tiêu, tầm 650)
  const s = setup({ hero: 'ba_nam', far: 650 + 180 });
  s.w.debug.level15(s.p); s.step(); s.events.length = 0; s.p.mana = s.p.stats.maxMana;
  s.w.command(s.p.id, { type: 'cast', slot: 's3', aim: null }); s.step();
  ok('chiêu khoá mục tiêu, địch ngoài tầm 180: không báo hỏng, đi tới', !s.events.some((e) => e.type === 'castFail') && s.p.chase?.kind === 'cast');
  s.step(40);
  const c = s.events.find((e) => e.type === 'cast' && e.slot === 's3');
  ok('vào tầm thì tung, đúng mục tiêu', !!c && c.target === s.f.id && !s.p.chase, c ? `mục tiêu ${c.target}` : 'chưa tung');
  const s2 = setup({ hero: 'ba_nam', far: 650 + 180, reach: 'off' });
  s2.w.debug.level15(s2.p); s2.step(); s2.events.length = 0;
  s2.w.command(s2.p.id, { type: 'cast', slot: 's3', aim: null }); s2.step();
  ok("reach 'off': như cũ — báo không có mục tiêu", s2.events.some((e) => e.type === 'castFail' && e.reason === 'noTarget') && !s2.p.chase);
}
{ // 12. lệnh qua bộ lọc online + lúc chết
  ok("bộ lọc lệnh: reach lạ → 'off', thừa trường bị bỏ", JSON.stringify(sanitizeCommand({ type: 'assist', reach: '__proto__', x: 1 })) === '{"type":"assist","reach":"off"}' && sanitizeCommand({ type: 'assist', reach: 'far' }).reach === 'far');
  const s = setup({ reach: null }); s.p.alive = false; s.w.command(s.p.id, { type: 'assist', reach: 'far' }); s.step();
  ok('đổi lúc đang chết vẫn nhận', s.p.assist?.reach === ASSIST.reach.far);
}
{ // 13. trận toàn bot không bao giờ bật hỗ trợ
  const w = createWorld({ map: DUEL, seed: 5 });
  const a = w.spawnHero('hoa_ren', 0, { x: DUEL.spawn[0].x + 250, y: DUEL.road.y }), b = w.spawnHero('nguyet_ha', 1, { x: DUEL.spawn[1].x - 250, y: DUEL.road.y });
  w.addBot(a, 'normal'); w.addBot(b, 'normal');
  for (let t = 1; t <= 1200; t++) w.update(t);
  ok('bot không có assist / chase / bộ đệm', !w.entities.some((e) => e.assist || e.chase || e.castBuf || e.steer));
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
