// Kiểm thử các lỗi sửa trong đợt kiểm toán (19/10): siêu lính, vàng thụ động lúc chết, KN hỗ trợ, hút máu, đồ rừng / hỗ trợ,
// huỷ Biến về phát sự kiện, kinh tế 5v5.   node tools/t_fixes.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { ECON, ECON_5V5 } from '../src/data/economy.js';
import { ITEM_PASSIVE } from '../src/data/items.js';
import { dealDamage, heal, addShield } from '../src/sim/damage.js';
import { computeBonus } from '../src/sim/inventory.js';
import { spawnMinion } from '../src/sim/minions.js';
import { castSkill } from '../src/sim/skills.js';
import { respawnSeconds } from '../src/sim/economy.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const give = (w, e, ...ids) => { e.items = Array.from({ length: 6 }, (_, i) => ids[i] || null); e.bonus = computeBonus(e); e.stats = null; w.update(w.tick + 1); };

{ // 1) siêu lính: đúng 1 mỗi đợt mỗi đường khi mất một trụ nhà, 2 ở mọi đường khi mất cả 3
  const count = (homes) => {
    const w = createWorld({ map: ARENA, seed: 1 });
    for (const lane of homes) { const t = w.entities.find((e) => e.structure && e.team === 1 && e.sid === `${lane}_home`); t.alive = false; t.hp = 0; }
    const seen = new Set(), per = {};
    for (let t = 1; t <= 30 * 85; t++) {
      w.update(t); w.events.length = 0;
      for (const e of w.entities) if (e.kind === 'minion' && e.minionType === 'giant' && e.team === 0 && !seen.has(e.id)) { seen.add(e.id); const k = `${w.waveNo}/${e.lane}`; per[k] = (per[k] || 0) + 1; }
    }
    return per;
  };
  const one = count(['mid']);
  ok('mất trụ nhà đường giữa: 1 siêu lính mỗi đợt, chỉ đường giữa', Object.keys(one).length >= 2 && Object.entries(one).every(([k, n]) => n === 1 && k.endsWith('/1')), JSON.stringify(one));
  const all = count(['temple', 'mid', 'river']);
  ok('mất cả 3 trụ nhà: 2 siêu lính mỗi đợt ở mọi đường', Object.values(all).length >= 6 && Object.values(all).every((n) => n === 2), JSON.stringify(all));
}
{ // 2) xe đá mỗi 2 đợt sau phút 10 (03 §A5)
  const w = createWorld({ map: ARENA, seed: 1, structures: false });
  const seen = new Set(), waves = [];
  for (let t = 1; t <= 30 * 60 * 12.5; t++) {
    w.update(t); w.events.length = 0;
    if (t % 30 === 0) for (const e of w.entities) if (e.kind === 'minion' && e.minionType === 'siege' && e.team === 0 && e.lane === 0 && !seen.has(e.id)) { seen.add(e.id); waves.push(w.waveNo); }
    w.entities = w.entities.filter((e) => e.kind !== 'minion' || e.minionType === 'siege');
  }
  const late = waves.filter((n) => n > 20);
  ok('xe đá mỗi 3 đợt trước phút 10, mỗi 2 đợt sau', waves.slice(0, 4).join() === '3,6,9,12' && late.length >= 2 && late[1] - late[0] === 2, waves.join());
}
{ // 3) vàng thụ động vẫn chạy lúc tướng chết; 5v5 là 4/s từ 0:20
  const w = createWorld({ map: ARENA, seed: 2, waves: false });
  const a = w.spawnHero('hoa_ren', 0, { x: 9000, y: 9000 }), b = w.spawnHero('hoa_ren', 1, { x: 9300, y: 9000 });
  for (let t = 1; t <= 30 * 25; t++) w.update(t);
  dealDamage(w, b, a, a.hp + 9999, 'true'); w.update(w.tick + 1);
  const g0 = a.goldEarned; for (let i = 0; i < 30 * 5; i++) w.update(w.tick + 1);
  ok('đang chết vẫn nhận vàng thụ động (5v5: 4/s)', !a.alive && Math.abs(a.goldEarned - g0 - 4 * 5) < 0.5, `+${(a.goldEarned - g0).toFixed(1)} trong 5s`);
  ok('hồi sinh 5v5 = 6 + 2.5×cấp', Math.abs(respawnSeconds(w, a) - (6 + 2.5 * a.level)) < 1e-9, String(respawnSeconds(w, a)));
  const d = createWorld({ map: DUEL, seed: 2, structures: false, waves: false }), h = d.spawnHero('hoa_ren', 0, { x: 1500, y: 1200 });
  ok('1v1 giữ luật cũ: hồi sinh 4 + 1.5×cấp', respawnSeconds(d, h) === ECON.respawn(h.level));
  ok('5v5 sau phút 15 hồi sinh thêm 5s', ECON_5V5.respawn(10, 901) === ECON_5V5.respawn(10, 100) + 5);
}
{ // 4) KN mạng hạ chia cho người hạ + người hỗ trợ trong 1200
  const w = createWorld({ map: ARENA, seed: 3, waves: false });
  const a = w.spawnHero('hoa_ren', 0, { x: 9000, y: 9000 }), c = w.spawnHero('hoa_ren', 0, { x: 9060, y: 9000 }), far = w.spawnHero('hoa_ren', 0, { x: 3000, y: 3000 });
  const v = w.spawnHero('thach_quy', 1, { x: 9000, y: 9200 }); w.update(1);
  dealDamage(w, far, v, 10, 'true'); dealDamage(w, c, v, 10, 'true'); w.update(2);
  const xa = a.xp + a.level * 1000, xc = c.xp + c.level * 1000, xf = far.xp + far.level * 1000;
  dealDamage(w, a, v, v.hp + 9999, 'true'); w.update(3);
  const da = a.xp + a.level * 1000 - xa, dc = c.xp + c.level * 1000 - xc, df = far.xp + far.level * 1000 - xf;
  const kx = ECON.killXp(1);
  ok('KN mạng: người hạ và người hỗ trợ gần chia đôi', Math.abs(da - kx / 2) < 1 && Math.abs(dc - kx / 2) < 1, `${da.toFixed(0)} / ${dc.toFixed(0)} (đủ ${kx})`);
  ok('người hỗ trợ đứng xa (ngoài 1200) không nhận KN mạng', df < 1, df.toFixed(1));
}
{ // 5) hút máu vật lý tính cả kỹ năng
  const w = createWorld({ map: DUEL, seed: 4, structures: false, waves: false });
  const a = w.spawnHero('hoa_ren', 0, { x: 1500, y: 1200 }), b = w.spawnHero('thach_quy', 1, { x: 1700, y: 1200 }); w.debug.bare(a); w.debug.bare(b);
  give(w, a, 'huyet_kiem'); a.hp = 300; a.skillLevels.s1 = 1; a.mana = 999;
  const h0 = a.hp; castSkill(w, a, 's1', { x: 1, y: 0 }); w.update(w.tick + 1);
  ok('kỹ năng vật lý (Vung Búa) hồi máu theo Hút máu 15%', a.hp > h0 + 5, `${h0.toFixed(0)} → ${a.hp.toFixed(0)}`);
}
{ // 6) Nanh Thú Rừng: +30% sát thương lên quái, hồi 30 mỗi đòn, +30% vàng; nâng sau 20 bãi
  const w = createWorld({ map: ARENA, seed: 5, waves: false });
  const j = w.spawnHero('bong_tre', 0, { x: 9000, y: 9000 }); j.spell = { id: 'thu_hoach', ready: 0 }; w.debug.bare(j);
  for (let t = 1; t <= 30 * 31; t++) w.update(t);
  const m = w.entities.find((e) => e.kind === 'monster' && !e.boss && e.alive), hp0 = m.hp;
  dealDamage(w, j, m, 100, 'true'); const plain = hp0 - m.hp;
  give(w, j, 'nanh_thu_rung'); m.hp = hp0; j.hp = 500;
  dealDamage(w, j, m, 100, 'true');
  ok('Nanh Thú Rừng: sát thương lên quái +30%', Math.abs(hp0 - m.hp - plain * 1.3) < 0.01, `${plain} → ${(hp0 - m.hp).toFixed(1)}`);
  ok('Nanh Thú Rừng: hồi 30 HP mỗi đòn lên quái', Math.abs(j.hp - 530) < 0.01, String(j.hp));
  const g0 = j.goldEarned; dealDamage(w, j, m, 999999, 'true'); w.update(w.tick + 1);
  ok('Nanh Thú Rừng: +30% vàng từ quái', j.goldEarned - g0 > 1, `+${(j.goldEarned - g0).toFixed(0)}`);
  j.flags.fangCamps = ITEM_PASSIVE.jungleFang.upCamps - 1;
  const camp = w.camps.find((c) => c.respawnAt == null && c.alive.some((id) => w.byId(id)?.alive));
  for (const id of camp.alive) { const e = w.byId(id); if (e?.alive) dealDamage(w, j, e, 999999, 'true'); }
  const atk0 = j.stats.atk; w.update(w.tick + 1); w.update(w.tick + 1);
  ok('Nanh Thú Rừng tự nâng sau 20 bãi: +15 Công nữa', j.flags.fangUp && Math.abs(j.stats.atk - atk0 - 15) < 0.01, `${atk0} → ${j.stats.atk}`);
}
{ // 7) Đèn Đồng Hành: chia vàng khi đồng minh kết liễu lính trong 800, tự nâng sau 600; Đèn Soi Đường: hồi/khiên người khác +15%
  const w = createWorld({ map: ARENA, seed: 6, waves: false });
  const s = w.spawnHero('long_dang', 0, { x: 9000, y: 9000 }), c = w.spawnHero('hoa_ren', 0, { x: 9100, y: 9000 }); w.update(1);
  give(w, s, 'den_dong_hanh');
  const mn = spawnMinion(w, 'sword', 1, 1, 0); mn.pos.x = 9100; mn.pos.y = 9200;
  const gs = s.goldEarned, gc = c.goldEarned;
  dealDamage(w, c, mn, 99999, 'true'); w.update(w.tick + 1);
  ok('Đèn Đồng Hành: đồng minh kết liễu lính → người mang đèn nhận vàng bằng giá lính', s.goldEarned - gs > 15 && c.goldEarned - gc > 15, `${(s.goldEarned - gs).toFixed(0)} / ${(c.goldEarned - gc).toFixed(0)}`);
  const own = spawnMinion(w, 'sword', 1, 1, 0); own.pos.x = 9000; own.pos.y = 9200; const g1 = s.goldEarned;
  dealDamage(w, s, own, 99999, 'true'); w.update(w.tick + 1);
  ok('Đèn Đồng Hành: tự kết liễu lính không nhận vàng lính', s.goldEarned - g1 < 1, (s.goldEarned - g1).toFixed(1));
  s.flags.lanternGold = 590; const m3 = spawnMinion(w, 'siege', 1, 1, 0); m3.pos.x = 9100; m3.pos.y = 9200;
  dealDamage(w, c, m3, 99999, 'true'); w.update(w.tick + 1);
  ok('Đèn Đồng Hành tự nâng thành Đèn Soi Đường sau 600 vàng', s.items.includes('den_soi_duong') && !s.items.includes('den_dong_hanh'), s.items.filter(Boolean).join());
  c.hp = 100; const h0 = c.hp; heal(w, c, 100, s);
  ok('Đèn Soi Đường: hồi cho người khác +15%', Math.abs(c.hp - h0 - 115) < 0.01, String(c.hp - h0));
  addShield(w, c, 100, 3, 'x', s);
  ok('Đèn Soi Đường: khiên cho người khác +15%', Math.abs(c.shields.find((x) => x.id === 'x').amount - 115) < 0.01);
  s.hp = 100; heal(w, s, 100, s);
  ok('Đèn Soi Đường: tự hồi cho mình không cộng', Math.abs(s.hp - 200) < 0.01, String(s.hp));
}
{ // 8) huỷ Biến về bằng phép / Hồi Máu / kỹ năng phải phát recallCancel
  for (const [name, cmd] of [['phép', { type: 'spell', aim: { x: 1, y: 0 } }], ['Hồi Máu', { type: 'restore' }], ['kỹ năng', { type: 'cast', slot: 's2', aim: null }]]) {
    const w = createWorld({ map: DUEL, seed: 7, structures: false, waves: false });
    const a = w.spawnHero('hoa_ren', 0, { x: 1500, y: 1200 }); a.skillLevels.s2 = 1; w.update(1); w.drainEvents();
    w.command(a.id, { type: 'recall' }); w.update(2); w.update(3);
    w.command(a.id, cmd); w.update(4);
    const ev = w.drainEvents();
    ok(`dùng ${name} lúc Biến về: phát sự kiện huỷ`, !a.recall && ev.some((e) => e.type === 'recallCancel'), ev.map((e) => e.type).join());
  }
}
process.exit(fail ? 1 : 0);
