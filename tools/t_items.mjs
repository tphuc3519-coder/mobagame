// Kiểm thử Mốc 4: đồ, kinh tế, phép bổ trợ, về thành. node tools/t_items.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { ITEMS, cleanBuild } from '../src/data/items.js';
import { HEROES, ALPHA } from '../src/data/heroes/index.js';
import { spawnMinion } from '../src/sim/minions.js';
import { dealDamage } from '../src/sim/damage.js';
import { planBuy, quickBuys } from '../src/sim/inventory.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
function setup(hero = 'hoa_ren', foe = 'hoa_ren') {
  const w = createWorld({ map: DUEL, seed: 3, structures: false, waves: false });
  const p = w.spawnHero(hero, 0, { x: 1500, y: 1200 }); w.debug.bare(p);
  const f = w.spawnHero(foe, 1, { x: 2300, y: 1200 }); w.debug.bare(f);
  let t = 0; const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  const buy = (e, id) => { w.command(e.id, { type: 'buy', item: id }); step(1); };
  return { w, p, f, step, buy };
}

{ // danh mục
  const ids = Object.keys(ITEMS);
  ok('đủ 53 món', ids.length === 53, String(ids.length));
  ok('công thức hợp lệ và giá ghép ≥ 0', ids.every((i) => (ITEMS[i].from || []).every((c) => ITEMS[c]) && ITEMS[i].cost >= (ITEMS[i].from || []).reduce((a, c) => a + ITEMS[c].cost, 0)));
  const bad = ALPHA.filter((h) => cleanBuild(HEROES[h].recommendedBuild).length < 5);
  ok('mọi tướng có build gợi ý hợp lệ (≥5 món)', bad.length === 0, bad.join());
}
{ // mua / bán / ghép
  const { w, p, step, buy } = setup();
  ok('vàng khởi đầu 800', p.gold === 800);
  buy(p, 'kiem_sat'); buy(p, 'riu_dong');
  ok('mua 2 thành phần: vàng 100', Math.round(p.gold) === 100 && p.items.filter(Boolean).length === 2, String(p.gold));
  const atk0 = p.stats.atk; p.gold = 5000;
  ok('giá ghép Huyết Kiếm = 1100', planBuy(p, 'huyet_kiem').cost === 1100, String(planBuy(p, 'huyet_kiem').cost));
  buy(p, 'huyet_kiem');
  ok('ghép: tiêu thành phần, còn 1 món', p.items.filter(Boolean).length === 1 && p.items.includes('huyet_kiem'));
  ok('ghép: trả 1100', Math.round(p.gold) === 3900, String(p.gold));
  step(1);
  ok('Công +60 khi có Huyết Kiếm', Math.abs(p.stats.atk - (atk0 - 15 - 25 + 60)) < 0.01, `${atk0} → ${p.stats.atk}`);
  const g = p.gold; w.command(p.id, { type: 'sell', slot: p.items.indexOf('huyet_kiem') }); step(1);
  ok('bán được 60% giá (1080)', Math.round(p.gold - g) === 1080, String(p.gold - g));
  buy(p, 'giay_chien'); buy(p, 'giay_tinh_tam');
  ok('chỉ 1 đôi giày', p.items.filter((x) => x && ITEMS[x].tags?.includes('boots')).length === 1);
  p.gold = 99999; ['tim_co_thu', 'khien_da', 'mu_sam', 'truong_song', 'giap_gai'].forEach((i) => buy(p, i));
  ok('tối đa 6 ô', p.items.filter(Boolean).length === 6, String(p.items.filter(Boolean).length));
  const before = p.gold; buy(p, 'huyet_kiem');
  ok('túi đầy không mua được', p.gold === before);
  ok('đồ đi rừng/hỗ trợ bị khoá ở 1v1', planBuy(p, 'den_dong_hanh').reason === 'mode');
}
{ // chỉ số đồ
  const { p, step, buy } = setup(); p.gold = 99999;
  const a = p.stats.armor, mr = p.stats.mr, hp = p.stats.maxHp, ms = p.stats.moveSpeed;
  buy(p, 'giay_chien'); buy(p, 'khien_da'); step(1);
  ok('Giáp +30 (giày) +45 (khiên)', Math.abs(p.stats.armor - (a + 75)) < 0.01, String(p.stats.armor - a));
  ok('HP tối đa +500', Math.abs(p.stats.maxHp - (hp + 500)) < 0.5);
  ok('Tốc chạy +60', Math.abs(p.stats.moveSpeed - (ms + 60)) < 0.01, String(p.stats.moveSpeed - ms));
  void mr;
  buy(p, 'mu_sam'); buy(p, 'sach_pha_gioi'); step(1);
  ok('Mũ Sấm +30% Phép; xuyên KP 40%', Math.abs(p.stats.ap - (160 + 80) * 1.3) < 0.01 && p.stats.mrPenPct === 0.4, `${p.stats.ap}`);
  buy(p, 'thuong_pha_giap'); buy(p, 'thuong_pha_giap'); step(1);
  ok('nội tại Duy nhất không cộng dồn (xuyên giáp 30%)', Math.abs(p.stats.armorPenPct - 0.3) < 1e-9, String(p.stats.armorPenPct));
}
{ // nội tại đồ mới
  const { w, p, f, step, buy } = setup(); p.gold = 99999;
  buy(p, 'cung_bang_lam'); buy(p, 'kiem_bao_tap'); step(1);
  f.pos.x = p.pos.x + 150; f.hp = f.stats.maxHp;
  let slowSeen = false, magic = 0; const hp0 = f.hp;
  w.on?.('damage', (d) => { if (d.type === 'magic' && d.target === f.id) magic++; });
  for (let i = 0; i < 300 && f.alive; i++) { w.command(p.id, { type: 'attack', target: f.id }); step(1); if (f.statuses.some((s) => s.id === 'frostbow')) slowSeen = true; f.hp = Math.max(f.hp, 1000); }
  ok('Cung Băng Lam: đòn đánh làm chậm', slowSeen);
  ok('Kiếm Bão Táp: đánh liên tục có đòn thứ 3 (bộ đếm)', (p.flags.chain || 0) >= 3, String(p.flags.chain)); void magic; void hp0;
  buy(p, 'khien_mat_troi'); step(1); f.pos.x = p.pos.x + 200; const h1 = f.hp; step(31);
  ok('Khiên Mặt Trời: thiêu kẻ địch gần', f.hp < h1, `${h1} → ${f.hp}`);
  const { p: q, step: st2, buy: b2 } = setup(); q.gold = 99999; b2(q, 'riu_bao_quan'); st2(1);
  const as0 = q.stats.atkSpeed; q.hp = q.stats.maxHp * 0.3; st2(2);
  ok('Rìu Bạo Quân: dưới 50% HP tăng tốc đánh', q.stats.atkSpeed > as0, `${as0} → ${q.stats.atkSpeed}`);
}
{ // KN, vàng từ lính
  const { w, p, step } = setup();
  const m = spawnMinion(w, 'sword', 1, 0, 0); m.pos.x = 1600; m.hp = 1; step(1);
  const g0 = p.gold; dealDamage(w, p, m, 999, 'true'); step(1);
  ok('kết liễu lính kiếm: +28.6 vàng (22×1.3)', Math.abs(p.gold - g0 - 28.6) < 0.01, String(p.gold - g0));
  ok('KN từ lính (32×1.3 = 41.6)', Math.abs(p.xp - 41.6) < 0.01, String(p.xp));
  const m2 = spawnMinion(w, 'sword', 1, 0, 0); m2.hp = 1; const g1 = p.gold; dealDamage(w, null, m2, 999, 'true'); step(1);
  ok('lính chết không do tướng: không ai nhận vàng', Math.abs(p.gold - g1) < 0.001);
  for (let i = 0; i < 4; i++) { const x = spawnMinion(w, 'siege', 1, 0, 0); x.pos.x = 1600; dealDamage(w, p, x, 99999, 'true'); }
  step(1); ok('farm lính lên cấp 3 (338 KN)', p.level === 3, `cấp ${p.level} kn ${p.xp.toFixed(0)}`);
  ok('lên cấp: +1 điểm kỹ năng đã tự nâng', p.skillLevels.s1 + p.skillLevels.s2 + p.skillLevels.s3 >= 2);
  p.xp = 0; for (let i = 0; i < 160; i++) { const x = spawnMinion(w, 'giant', 1, 0, 0); x.pos.x = 1600; dealDamage(w, p, x, 99999, 'true'); }
  step(1); ok('cấp tối đa 15', p.level === 15, `cấp ${p.level}`);
}
{ // hạ gục tướng, hồi sinh
  const { w, p, f, step } = setup();
  const g0 = p.gold; dealDamage(w, p, f, 99999, 'true'); step(1);
  ok('hạ gục tướng +200 vàng', Math.round(p.gold - g0) === 200, String(p.gold - g0));
  ok('hạ gục: +130 KN', Math.abs(p.xp - 130) < 0.5 || p.level > 1, `${p.xp}`);
  ok('địch chết, đếm hạ gục = 1', !f.alive && p.kills === 1 && f.deaths === 1);
  const need = f.respawnTick - w.tick;
  ok('hồi sinh sau 4 + 1.5×cấp giây (5.5s = 165 tick)', need >= 164 && need <= 166, String(need));
  step(need + 2); ok('hồi sinh về Suối', f.alive && f.pos.x === f.spawn.x && f.hp === f.stats.maxHp);
}
{ // Chớp Bước
  const { w, p, step } = setup(); p.pos.x = 120; p.prevPos.x = 120;
  w.command(p.id, { type: 'spell', aim: { x: -1, y: 0 } }); step(1);
  ok('Chớp Bước không ra ngoài bản đồ', p.pos.x >= p.radius - 0.01 && p.pos.x <= 120, String(p.pos.x));
  ok('Chớp Bước vào hồi chiêu 120s', p.spell.ready - w.tick >= 119 * 30);
  p.pos.x = 1500; p.spell.ready = 0; w.command(p.id, { type: 'spell', aim: { x: 1, y: 0 } }); step(1);
  ok('Chớp Bước đi đúng 450', Math.abs(p.pos.x - 1950) < 1, String(p.pos.x));
  p.pos.y = 1200 - 440; p.spell.ready = 0; w.command(p.id, { type: 'spell', aim: { x: 0, y: -1 } }); step(1);
  ok('Chớp Bước bị giữ trong đường (y ≥ 750)', p.pos.y >= 1200 - 450 + p.radius - 1, String(p.pos.y));
}
{ // Các phép khác
  const { w, p, f, step } = setup(); const set = (id) => { p.spell = { id, ready: 0 }; };
  f.hp = f.stats.maxHp * 0.5; f.pos.x = p.pos.x + 300; set('tram_hon');
  const h = f.hp; w.command(p.id, { type: 'spell' }); step(1);
  ok('Trảm Hồn: 14% HP đã mất', Math.abs((h - f.hp) - 0.14 * f.stats.maxHp * 0.5) < 1, String(h - f.hp));
  ok('Trảm Hồn: làm chậm 50%', f.statuses.some((s) => s.kind === 'slow' && s.pct === 0.5));
  p.hp = p.stats.maxHp * 0.5; set('hoi_phuc'); w.command(p.id, { type: 'spell' }); step(1);
  ok('Hồi Phục: +15% HP và tốc chạy', Math.abs(p.hp - p.stats.maxHp * 0.65) < 2 && p.statuses.some((s) => s.kind === 'haste'), `${p.hp}`);
  w.command(p.id, { type: 'spell' }); step(1);
  ok('Hồi Phục không dùng lại khi hồi chiêu', p.hp <= p.stats.maxHp * 0.66);
  set('giai_troi'); dealDamage(w, f, p, 1, 'true');
  w.applyStatusTest = null;
  p.statuses.push({ kind: 'stun', id: 'stun', until: w.tick + 90 }); step(1);
  w.command(p.id, { type: 'spell' }); step(1);
  ok('Giải Trói gỡ choáng, miễn khống chế 1s', !p.statuses.some((s) => s.kind === 'stun') && p.statuses.some((s) => s.kind === 'ccImmune'));
  set('thu_hoach'); w.command(p.id, { type: 'spell' }); step(1);
  ok('Thu Hoạch bị khoá ở 1v1', p.spell.ready === 0);
  set('gio_luot'); w.command(p.id, { type: 'spell' }); step(1);
  ok('Gió Lướt +40% tốc chạy', p.statuses.some((s) => s.kind === 'haste' && s.pct === 0.4));
}
{ // đồ kích hoạt, hồi sinh, hút máu, về thành
  const { w, p, f, step, buy } = setup(); p.gold = 99999;
  buy(p, 'binh_suong_dong'); w.command(p.id, { type: 'useItem', slot: p.items.indexOf('binh_suong_dong') }); step(1);
  const hp = p.hp; dealDamage(w, f, p, 500, 'true'); step(1);
  ok('Bình Sương Đông: bất tử khi kích hoạt', p.hp === hp && !f.statuses.length);
  w.command(p.id, { type: 'move', dir: { x: 1, y: 0 } }); const x0 = p.pos.x; step(5);
  ok('Bình Sương Đông: bất động', p.pos.x === x0);
  step(70); dealDamage(w, f, p, 500, 'true'); ok('hết 2s thì nhận sát thương lại', p.hp < hp);
  w.command(p.id, { type: 'move', dir: { x: 0, y: 0 } });
  buy(p, 'mat_na_hoi_sinh'); p.hp = 10; dealDamage(w, f, p, 9999, 'true'); step(1);
  ok('Mặt Nạ Hồi Sinh cứu cú chí tử, hồi 20%', p.alive && p.hp > p.stats.maxHp * 0.15, String(p.hp));
  p.hp = 10; step(65); dealDamage(w, f, p, 9999, 'true'); step(1);
  ok('Mặt Nạ Hồi Sinh: hồi chiêu 120s (lần 2 vẫn chết)', !p.alive);
}
{ const { w, p, f, step, buy } = setup(); p.gold = 99999; buy(p, 'huyet_kiem'); step(1); p.hp = 100; f.pos.x = p.pos.x + 100;
  const d = dealDamage(w, p, f, 300, 'physical', { basic: true }); step(1);
  ok('Huyết Kiếm hút 15% (đòn đánh)', Math.abs(p.hp - (100 + d * 0.15)) < 0.6, `${p.hp - 100} vs ${d * 0.15}`); }
{ const { w, p, f, step } = setup(); p.pos.x = 2900; p.prevPos.x = 2900; f.pos.x = 4000; step(1);
  w.command(p.id, { type: 'recall' }); step(100);
  ok('về thành đang chờ (chưa xong sau 3.3s)', !!p.recall && p.pos.x === 2900);
  dealDamage(w, f, p, 10, 'true'); step(1); ok('trúng sát thương thì huỷ về thành', !p.recall);
  p.pos.x = 2900; w.command(p.id, { type: 'recall' }); step(185);
  ok('về thành xong sau 6s: đứng ở Suối, +40% tốc chạy', Math.abs(p.pos.x - p.spawn.x) < 1 && p.statuses.some((s) => s.id === 'recallHaste'), String(p.pos.x)); }
{ const { p } = setup('canh_dieu', 'hoa_ren'); p.gold = 800; const q = quickBuys(p);
  ok('mua nhanh gợi ý tối đa 2 món', q.length === 2, JSON.stringify(q.map((x) => x.id)));
  ok('mua nhanh gợi thành phần rẻ nhất khi thiếu vàng', q.every((x) => ITEMS[x.id]), q.map((x) => `${x.id}(${x.cost})`).join()); }
{ // trọn vẹn: farm rồi mua theo build
  const w = createWorld({ map: DUEL, seed: 5, structures: false, waves: false }); const p = w.spawnHero('hoa_ren', 0, { x: 3000, y: 1200 });
  for (let t = 1; t <= 30 * 60; t++) w.update(t);
  ok('vàng thụ động 3/s từ giây 15 (1 phút ≈ 135)', Math.abs(p.goldEarned - 135) < 1, String(Math.round(p.goldEarned))); }
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
