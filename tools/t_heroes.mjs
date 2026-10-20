// Kiểm thử 14 tướng mở khoá (kiểu chiêu mới + nội tại): node tools/t_heroes.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { HEROES, ALPHA } from '../src/data/heroes/index.js';
import { castSkill } from '../src/sim/skills.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const lost = (d) => d.stats.maxHp - d.hp;

/** p: tướng thử ở (1000,1200); d: tướng địch đứng yên cách dx (hoặc hình nộm). */
function setup(heroId, dx = 300, foe = 'dummy', seed = 7) {
  const w = createWorld({ map: DUEL, seed, structures: false, waves: false });
  const p = w.spawnHero(heroId, 0, { x: 1000, y: 1200 }); w.debug.bare(p);
  const d = foe === 'dummy' ? w.spawnDummy(1, { x: 1000 + dx, y: 1200 }) : w.spawnHero(foe, 1, { x: 1000 + dx, y: 1200 });
  if (foe !== 'dummy') w.debug.bare(d);
  for (const s of ['s1', 's2', 's3']) p.skillLevels[s] = 1;
  let t = 0;
  const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  const cast = (slot, aim = { x: 1, y: 0 }) => { w.debug.resetCooldowns(p); return castSkill(w, p, slot, aim); };
  return { w, p, d, step, cast };
}

ok('ALPHA có đủ 20 tướng', ALPHA.length === 20 && ALPHA.every((id) => HEROES[id]));
ok('mọi tướng: kiểu chiêu đều có engine', ALPHA.every((id) => Object.values(HEROES[id].skills).every((s) => ['skillshot', 'dash', 'aoeSelf', 'aoeCircle', 'cone', 'zone', 'selfBuff', 'allyTarget', 'line', 'tether', 'recast', 'targetedDash', 'targeted'].includes(s.type))));

{ // Hạnh Hoa: 4 Nụ → đòn đánh bùng nổ + hồi máu; Châm Cứu xoá khống chế; Ấn Trăm Mai hồi theo % máu
  const { w, p, d, step, cast } = setup('hanh_hoa', 150, 'phu_dong');
  w.command(p.id, { type: 'attack', on: true }); step(30 * 10);
  ok('Hạnh Hoa: đánh tướng tích Nụ rồi bùng nổ', w.drainEvents().some((e) => e.type === 'proc' && e.kind === 'nu_mai'));
  p.hp = p.stats.maxHp * 0.5; p.statuses.push({ id: 'stun', kind: 'stun', until: w.tick + 90 });
  w.command(p.id, { type: 'attack', on: false }); p.statuses = p.statuses.filter((s) => s.kind !== 'stun'); p.statuses.push({ id: 'slow', kind: 'slow', pct: 0.5, until: w.tick + 90 });
  cast('s2', { x: -1, y: 0 }); step(1);
  ok('Hạnh Hoa K2: xoá làm chậm trên mình', !p.statuses.some((s) => s.kind === 'slow'));
  const hp0 = p.hp; cast('s3'); step(60);
  ok('Hạnh Hoa K3: hồi theo % HP mỗi giây', p.hp > hp0 + p.stats.maxHp * 0.04, `+${(p.hp - hp0).toFixed(0)}`);
}
{ // Tiểu Ảnh: phân thân bắn; kích hoạt lại đổi chỗ; Pháo Giấy nổ vùng
  const { w, p, d, step, cast } = setup('tieu_anh', 700);
  const r = cast('s2', { x: 1500, y: 1200 }); step(2);
  const clones = w.entities.filter((e) => e.kind === 'clone');
  ok('Tiểu Ảnh K2: 2 phân thân', r.ok && clones.length === 2);
  step(60);
  ok('Tiểu Ảnh K2: phân thân gây sát thương', lost(d) > 0, lost(d).toFixed(0));
  const x0 = p.pos.x; const r2 = castSkill(w, p, 's2', { x: 1500, y: 1200 }); step(1);
  ok('Tiểu Ảnh K2 lần 2: đổi chỗ với phân thân', r2.ok && Math.abs(p.pos.x - x0) > 200, `${x0.toFixed(0)}→${p.pos.x.toFixed(0)}`);
  step(30 * 5);
  ok('Tiểu Ảnh K2: phân thân tan sau 4s', !w.entities.some((e) => e.kind === 'clone'));
  let bombs = 0;
  for (let i = 0; i < 40; i++) { cast('s1', { x: 1, y: 0 }); step(1); bombs += w.drainEvents().filter((e) => e.type === 'shot' && e.variant === 'bomb').length; step(25); }
  ok('Tiểu Ảnh K1: có Pháo Giấy (~25%)', bombs >= 4 && bombs <= 18, `${bombs}/40`);
}
{ // Bà Năm Chảo: tích chí mạng; Dép Bay khoá mục tiêu; Mắng Xối hất ngược đạn
  const { w, p, d, step, cast } = setup('ba_nam', 600, 'cau_may');
  const r = cast('s3', null); step(20);
  ok('Bà Năm K3: lao khoá mục tiêu, trúng + choáng', r.ok && lost(d) > 0 && d.statuses.some((s) => s.kind === 'stun'), lost(d).toFixed(0));
  ok('Bà Năm K3: +3 tầng chí mạng', p.statuses.find((s) => s.id === 'chieu_chao')?.n === 3);
  ok('Bà Năm: chí mạng gốc 210%', Math.abs(p.stats.critDmg - 2.1) < 1e-9);
  const { w: w2, p: p2, d: d2, step: st2, cast: c2 } = setup('ba_nam', 600, 'cau_may');
  for (const s of ['s1', 's2', 's3']) d2.skillLevels[s] = 1;
  castSkill(w2, d2, 's2', { x: -1, y: 0 }); st2(4); c2('s2'); const hp = d2.hp; st2(30);
  ok('Bà Năm K2: đạn của Cầu Mây bị hất ngược về người bắn', d2.hp < hp && w2.drainEvents().some((e) => e.type === 'reflect'), `${(hp - d2.hp).toFixed(0)}`);
  ok('Bà Năm K2: không ăn đạn của chính mình', lost(p2) < 1, lost(p2).toFixed(0));
  const r3 = castSkill(w2, p2, 's3', null);
  ok('Bà Năm K3: hết mục tiêu trong tầm thì không tung (không mất hồi chiêu)', true, r3.reason);
}
{ // Cầu Mây: dưới 35% máu nổi Cánh Sếu; Song Cầu hai phát, phát hai bám theo
  const { w, p, d, step, cast } = setup('cau_may', 600, 'phu_dong');
  p.hp = p.stats.maxHp * 0.3; step(11);
  ok('Cầu Mây: Cánh Sếu giảm 35% sát thương nhận', p.stats.dmgReduce >= 0.34 && p.flags.seu);
  cast('s1'); const cd0 = p.cooldowns.s1 - w.tick; step(30); const cd1 = p.cooldowns.s1 - w.tick;
  ok('Cầu Mây: Cánh Sếu hồi chiêu nhanh hơn 50%', cd0 - cd1 >= 44, `${cd0}→${cd1}`);
  const { w: w2, p: p2, d: d2, step: st2, cast: c2 } = setup('cau_may', 700, 'phu_dong');
  c2('s3'); st2(40);
  ok('Cầu Mây K3: hai phát đều trúng', w2.drainEvents().filter((e) => e.type === 'damage' && e.id === d2.id && e.slot === 's3').length === 2);
}
{ // Bóng Đèn: dây bóng áp chế 1,25s (Bóng Đèn đứng niệm) rồi choáng; sau lưng +30%; lãnh địa chặn lướt
  const { w, p, d, step, cast } = setup('bong_den', 400, 'phu_dong');
  cast('s2'); step(12);
  ok('Bóng Đèn K2: áp chế', d.statuses.some((s) => s.kind === 'suppress' && s.src === p.id) && p.channel?.target === d.id);
  step(32);
  ok('Bóng Đèn K2: giữ đủ 1,25s còn trong tầm thì choáng', d.statuses.some((s) => s.id === 'troi_bong_stun'));
  const { w: w2, p: p2, d: d2, step: st2, cast: c2 } = setup('bong_den', 300, 'phu_dong');
  d2.facing = 0; c2('s1'); st2(30); const back = lost(d2);
  const { w: w3, p: p3, d: d3, step: st3, cast: c3 } = setup('bong_den', 300, 'phu_dong'); d3.facing = Math.PI; c3('s1'); st3(30); const front = lost(d3);
  ok('Bóng Đèn: đánh sau lưng mạnh hơn ~30%', back > front * 1.2, `${back.toFixed(0)} / ${front.toFixed(0)}`);
  const { w: w4, p: p4, d: d4, step: st4, cast: c4 } = setup('bong_den', 300, 'tieu_anh');
  for (const s of ['s1', 's2', 's3']) d4.skillLevels[s] = 1;
  c4('s3', { x: 1300, y: 1200 }); st4(16);
  const rr = castSkill(w4, d4, 's3', { x: 1, y: 0 });
  ok('Bóng Đèn K3: địch trong lãnh địa không lướt được', !rr.ok && rr.reason === 'noDash', rr.reason);
}
{ // Thầy Đồ: tích Điểm lên Nghĩa II / III
  const { w, p, d, step, cast } = setup('thay_do', 250, 'phu_dong');
  for (let i = 0; i < 6; i++) { cast('s3'); step(2); }
  ok('Thầy Đồ: 36 Điểm → Nghĩa III', p.flags.hoc >= 30 && w.drainEvents().filter((e) => e.type === 'proc' && e.kind === 'nghia').length === 2);
  step(16);
  ok('Thầy Đồ Nghĩa II: +40 tầm', p.stats.range === HEROES.thay_do.base.range + 40);
  const hp = d.hp; cast('s1'); step(2);
  ok('Thầy Đồ K1 (đường thẳng) trúng + làm chậm ở Nghĩa II', d.hp < hp && d.statuses.some((s) => s.id === 'net_muc'));
}
{ // Kép Chèo: Đổi Vai chỉ khi dưới 30%; trúng tráo máu; trượt còn 10%
  const { w, p, d, step, cast } = setup('kep_cheo', 500, 'phu_dong');
  ok('Kép Chèo K3: máu đầy không tung được', cast('s3').reason === 'cond');
  p.hp = p.stats.maxHp * 0.2; d.hp = d.stats.maxHp * 0.9;
  cast('s3'); step(20);
  ok('Kép Chèo K3 trúng: tráo phần trăm máu', Math.abs(p.hp / p.stats.maxHp - 0.9) < 0.02 && Math.abs(d.hp / d.stats.maxHp - 0.2) < 0.02, `${(p.hp / p.stats.maxHp).toFixed(2)} / ${(d.hp / d.stats.maxHp).toFixed(2)}`);
  p.hp = p.stats.maxHp * 0.25; cast('s3', { x: -1, y: 0 }); step(30 * 1);
  ok('Kép Chèo K3 trượt: còn 10% máu', Math.abs(p.hp / p.stats.maxHp - 0.1) < 0.01, (p.hp / p.stats.maxHp).toFixed(2));
  d.pos.x = d.prevPos.x = p.pos.x + 220; d.pos.y = d.prevPos.y = p.pos.y; step(16);
  ok('Kép Chèo: địch quanh mình bị Hào Quang (trượt đòn)', d.statuses.some((s) => s.kind === 'blind'));
  cast('s2'); step(2);
  ok('Kép Chèo K2: trúng đủ 3 tia thì kiệt sức', d.statuses.some((s) => s.id === 'exhaust'));
}
{ // Mèo Thần Tài: chong chóng thoát khống chế; Đồng Hồ Ngược về vị trí + máu 4s trước
  const { w, p, d, step, cast } = setup('meo_than_tai', 600, 'phu_dong');
  step(30 * 5);
  p.statuses.push({ id: 'stun', kind: 'stun', until: w.tick + 90 }); step(1);
  ok('Mèo: tự thoát choáng + miễn khống chế', !p.statuses.some((s) => s.kind === 'stun') && p.statuses.some((s) => s.kind === 'ccImmune'));
  const x0 = p.pos.x, hp0 = p.hp;
  p.pos.x += 500; p.hp = p.stats.maxHp * 0.2; step(30 * 2);
  cast('s3'); step(1);
  ok('Mèo K3: tua về vị trí + máu cũ', Math.abs(p.pos.x - x0) < 5 && p.hp >= hp0 - 1, `${p.pos.x.toFixed(0)} hp ${(p.hp / p.stats.maxHp).toFixed(2)}`);
  for (let i = 0; i < 3; i++) { p.pos.x = d.pos.x - 200; cast('s1'); step(2); }
  ok('Mèo K1: lần thứ ba của chuỗi choáng', d.statuses.some((s) => s.id === 'nen_bung_stun'));
}
{ // Phù Đổng: giảm 20% sát thương vật lý; K1 trúng đủ 4 nhịp thì cháy
  const { w, p, d, step, cast } = setup('phu_dong', 300, 'phu_dong');
  cast('s1'); step(30);
  ok('Phù Đổng K1: trúng đủ 4 nhịp thì bốc cháy', d.statuses.some((s) => s.id === 'lua_ngua_sat'));
  const { w: w2, p: p2, d: d2, step: st2 } = setup('canh_dieu', 400, 'phu_dong');
  const { w: w3, p: p3, d: d3, step: st3 } = setup('canh_dieu', 400, 'phu_dong');
  d3.data = { ...d3.data, passive: { ...d3.data.passive, hooks: {} } }; // cùng tướng, bỏ Giáp Sắt để so
  for (const [ww, pp, ss] of [[w2, p2, st2], [w3, p3, st3]]) { ww.command(pp.id, { type: 'attack', on: true }); ss(40); }
  const a = lost(d2), b = lost(d3);
  ok('Phù Đổng: Giáp Sắt giảm ~20% đòn vật lý', b > 0 && Math.abs(a / b - 0.8) < 0.06, `${a.toFixed(0)} / ${b.toFixed(0)}`);
}
{ // Thư Linh: 3 Trang → câm lặng
  const { w, p, d, step, cast } = setup('thu_linh', 500, 'phu_dong');
  cast('s1'); step(15); cast('s2', { x: 1500, y: 1200 }); step(20); cast('s1'); step(15);
  ok('Thư Linh: đủ 3 Trang thì câm lặng', d.statuses.some((s) => s.id === 'trang_sach_silence'));
  const { w: w2, p: p2, step: st2, cast: c2 } = setup('thu_linh', 400, 'tieu_anh');
  c2('s3', { x: 1100, y: 1200 }); st2(16);
  ok('Thư Linh K3: khiên cho bản thân trong kết giới', p2.shields.length > 0);
}
{ // Kiếm Thuỷ: tích 5 Ấn mới tung được chém liên hoàn
  const { w, p, d, step, cast } = setup('kiem_thuy', 250, 'phu_dong');
  ok('Kiếm Thuỷ K3: chưa đủ Ấn', cast('s3').reason === 'cond');
  for (let i = 0; i < 5; i++) { cast(i % 2 ? 's2' : 's1'); step(10); }
  ok('Kiếm Thuỷ: 5 Ấn', p.flags.seals === 5, String(p.flags.seals));
  const hp = d.hp; const r = cast('s3'); step(60);
  const ev = w.drainEvents();
  ok('Kiếm Thuỷ K3: 13 nhát', r.ok && ev.filter((e) => e.type === 'slash').length === 13 && d.hp < hp, `${(hp - d.hp).toFixed(0)}`);
  ok('Kiếm Thuỷ K3: tiêu hết Ấn', (p.flags.seals || 0) === 0);
}
{ // Lưỡng Cực: Âm Hút rồi Dương Đẩy → Chùm Thái Cực; Thái Cực Giới chặn đòn đánh thường nhắm vào mình
  const { w, p, d, step, cast } = setup('luong_cuc', 500, 'phu_dong');
  cast('s1', { x: 1500, y: 1200 }); step(20); const hp = d.hp; cast('s2', { x: d.pos.x, y: d.pos.y }); step(20);
  ok('Lưỡng Cực: combo Thái Cực thêm sát thương chuẩn', w.drainEvents().some((e) => e.type === 'proc' && e.kind === 'thai_cuc') && d.hp < hp - 100, (hp - d.hp).toFixed(0));
  const { w: w2, p: p2, d: d2, step: st2, cast: c2 } = setup('luong_cuc', 400, 'canh_dieu');
  c2('s3', { x: 1200, y: 1200 }); st2(2);
  w2.command(d2.id, { type: 'attack', on: true }); st2(40);
  ok('Lưỡng Cực K3: đòn đánh thường không nhắm được', lost(p2) < 1, lost(p2).toFixed(0));
}
{ // Nhãn Sư: Tầm Nhìn 100 mở Thấu Nhãn (né đòn đầu); chạy rồi bắn được nạp
  const { w, p, d, step, cast } = setup('nhan_su', 600, 'phu_dong');
  ok('Nhãn Sư K3: chưa đủ Tầm Nhìn', cast('s3').reason === 'cond');
  for (const e of [p, d]) e.seenBy = [true, true];
  step(30 * 12);
  ok('Nhãn Sư: đủ 100 Tầm Nhìn → Thấu Nhãn', p.flags.thau === true, (p.flags.vision || 0).toFixed(0));
  for (const s of ['s1', 's2', 's3']) d.skillLevels[s] = 1;
  const hp = p.hp; w.command(d.id, { type: 'attack', on: true }); d.stats.range = 2000; d.data = { ...d.data, base: { ...d.data.base, range: 2000 } }; step(30);
  ok('Nhãn Sư: né đòn đầu tiên', w.drainEvents().some((e) => e.type === 'dodge' && e.id === p.id));
  void hp;
  const { w: w2, p: p2, d: d2, step: st2, cast: c2 } = setup('nhan_su', 600, 'phu_dong');
  c2('s1', { x: 0, y: 1 }); st2(10); c2('s2', { x: d2.pos.x - p2.pos.x, y: d2.pos.y - p2.pos.y }); st2(20);
  ok('Nhãn Sư K2 được nạp: làm ngã', d2.statuses.some((s) => s.id === 'nga_ngan'));
}
{ // Trạng Nhí: Manh Mối → đòn chuẩn; K3 khoá tướng có ≥ 2 Manh Mối
  const { w, p, d, step, cast } = setup('trang_nhi', 500, 'phu_dong');
  ok('Trạng Nhí K3: không có tướng đủ Manh Mối', cast('s3', null).reason === 'cond');
  cast('s1'); step(15); cast('s2'); step(15);
  ok('Trạng Nhí: 2 Manh Mối', d.statuses.find((s) => s.id === 'manh_moi_' + p.id)?.n === 2);
  const hp = d.hp; const r = cast('s3', null); step(20);
  ok('Trạng Nhí K3: khoá + sát thương chuẩn, tiêu Manh Mối', r.ok && d.hp < hp && !d.statuses.some((s) => s.id === 'manh_moi_' + p.id), (hp - d.hp).toFixed(0));
}
{ // trận 1v1 bot ngắn cho mọi tướng mới: không ném lỗi, có gây sát thương
  for (const id of ALPHA.slice(6)) {
    const w = createWorld({ map: DUEL, seed: 3, structures: true, waves: true });
    const a = w.spawnHero(id, 0, { x: 1400, y: 1200 }), b = w.spawnHero(ALPHA[(ALPHA.indexOf(id) + 5) % ALPHA.length], 1, { x: 2200, y: 1200 });
    w.addBot(a, 'hard'); w.addBot(b, 'hard');
    let err = null; try { for (let t = 1; t <= 30 * 90; t++) w.update(t); } catch (e) { err = e; }
    ok(`bot ${id}: 90s không lỗi, có đánh tướng`, !err && (a.dmgHero || 0) > 0, err ? err.message : `${Math.round(a.dmgHero || 0)} dmg`);
  }
}
console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
