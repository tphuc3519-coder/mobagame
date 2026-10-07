// Kiểm thử mô phỏng chiến đấu không cần DOM: node tools/t_combat.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

function setup(heroId, dummyDx = 300) {
  const w = createWorld({ map: DUEL, seed: 7, structures: false, waves: false });
  const p = w.spawnHero(heroId, 0, { x: 1000, y: 1200 }); w.debug.bare(p);
  const d = w.spawnDummy(1, { x: 1000 + dummyDx, y: 1200 });
  p.skillLevels.s1 = p.skillLevels.s2 = p.skillLevels.s3 = 1; // học đủ ở cấp kỹ năng 1
  let t = 0;
  const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  return { w, p, d, step };
}
const lost = (d) => d.stats.maxHp - d.hp;

{ // Emberforge K1: (70 + 1.0×68 Công) × 100/(100+30) = 106.15 vật lý
  const { w, p, d, step } = setup('hoa_ren', 250);
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); step(2);
  ok('Emberforge K1 vật lý ≈106.2', near(lost(d), 106.15), lost(d).toFixed(2));
  ok('Emberforge K1 làm chậm 25%', d.statuses.some((s) => s.kind === 'slow' && s.pct === 0.25));
  ok('Emberforge tích 1 Nhiệt', p.heat === 1);
}
{ // Moonstream K1: 80 phép × 100/(100+30) = 61.54
  const { w, p, d, step } = setup('nguyet_ha', 500);
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); step(30);
  ok('Moonstream K1 phép ≈61.5', near(lost(d), 61.54), lost(d).toFixed(2));
  ok('Moonstream hồi 3% mana khi trúng tướng', p.mana > p.stats.maxMana - 50 + 14);
}
{ // Mossback K2: (50 + 4% × 1300 máu (1000 × HERO_HP_MULT 1.3)) = 102 phép → 78.46; làm chậm 30%
  const { w, p, d, step } = setup('thach_quy', 200);
  w.command(p.id, { type: 'cast', slot: 's2' }); step(12);
  ok('Mossback K2 ≈78.5', near(lost(d), 78.46), lost(d).toFixed(2));
}
{ // Mossback K1 Móc Neo: trúng địch ở xa → kéo về sát trước mặt, choáng
  const { w, p, d, step } = setup('thach_quy', 700);
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); step(19);
  ok('Mossback K1 móc trúng gây sát thương', lost(d) > 0, lost(d).toFixed(1));
  ok('Mossback K1 đang kéo + choáng', d.statuses.some((s) => s.kind === 'stun'));
  step(25);
  ok('Mossback K1 kéo về sát trước mặt', d.pos.x - p.pos.x < p.radius + d.radius + 40, (d.pos.x - p.pos.x).toFixed(0));
}
{ // Mossback K3 Xoáy Nước Sâu: hút địch trong 420 về quanh mình và khiêu khích
  const { w, p, d, step } = setup('thach_quy', 400);
  w.command(p.id, { type: 'cast', slot: 's3' }); step(20);
  ok('Mossback K3 hút về gần', d.pos.x - p.pos.x < 90 + p.radius + d.radius + 5, (d.pos.x - p.pos.x).toFixed(0));
  ok('Mossback K3 khiêu khích', d.statuses.some((s) => s.kind === 'taunt'));
}
{ // Bamboo Shade: dash trúng mọi địch trên đường; K3 tàng hình rồi đòn đánh phục kích
  const { w, p, d, step } = setup('bong_tre', 200);
  w.command(p.id, { type: 'cast', slot: 's3', aim: null }); step(2);
  ok('Bamboo Shade tàng hình', p.statuses.some((s) => s.kind === 'stealth'));
  w.command(p.id, { type: 'attack', on: true }); step(15);
  ok('Bamboo Shade hiện hình sau khi đánh', !p.statuses.some((s) => s.kind === 'stealth'));
  ok('Bamboo Shade phục kích gây thêm sát thương + chậm', lost(d) > 150 && d.statuses.some((s) => s.kind === 'slow'), lost(d).toFixed(1));
}
{ // Kitewing: đòn thứ 4 bắn thêm mũi tên (5 tên trong 4 đòn)
  const { w, p, d, step } = setup('canh_dieu', 500);
  w.command(p.id, { type: 'attack', on: true });
  let hits = 0; const seen = [];
  for (let i = 0; i < 30 * 8; i++) { const before = d.hp; step(1); if (d.hp < before - 0.01) hits++; }
  void seen;
  ok('Kitewing đánh nhiều lần và có mũi tên phụ', hits >= 5, 'số lần trúng ' + hits);
}
{ // Lanternward: K2 hồi + khiên lên chính mình; nội tại hồi đồng minh (không có đồng minh ở đây)
  const { w, p, step } = setup('long_dang', 500);
  p.hp = 300; w.command(p.id, { type: 'cast', slot: 's2', aim: { x: 1, y: 0 } }); step(2);
  ok('Lanternward K2 hồi máu', p.hp >= 380 - 1, p.hp.toFixed(1));
  ok('Lanternward K2 có khiên', p.shields.length === 1);
}
{ // Hồi chiêu và mana
  const { w, p, step } = setup('hoa_ren', 250);
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); step(1);
  const m = p.mana; w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 1, y: 0 } }); step(1);
  ok('Không tung lại khi đang hồi chiêu', p.mana >= m);
}
{ // Ra chiêu: quay mặt về hướng chiêu, đứng yên tới lúc chiêu phát ra (+0,25s), rồi mới chạy/quay theo cần di chuyển
  const { w, p, step } = setup('nguyet_ha', 600);
  w.command(p.id, { type: 'move', dir: { x: 1, y: 0 } }); step(5);
  const x0 = p.pos.x;
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 0, y: 1 } }); step(1);
  w.command(p.id, { type: 'move', dir: { x: 1, y: 0 } }); step(5); // vẫn giữ cần sang phải trong lúc ra chiêu
  ok('ra chiêu: mặt hướng chiêu', Math.abs(p.facing - Math.PI / 2) < 1e-6, p.facing.toFixed(3));
  ok('ra chiêu: đứng yên', Math.abs(p.pos.x - x0) < 1, (p.pos.x - x0).toFixed(1));
  step(6);
  ok('ra chiêu xong: quay lại theo cần di chuyển', Math.abs(p.facing) < 1e-6 && p.pos.x > x0 + 30, `${p.facing.toFixed(3)} ${(p.pos.x - x0).toFixed(1)}`);
}
{ // Chiêu có thời gian vung (Móc Neo 0,2s): đứng ra chiêu = vung + 0,25s
  const { w, p, step } = setup('thach_quy', 600);
  w.command(p.id, { type: 'cast', slot: 's1', aim: { x: 0, y: -1 } }); step(1);
  ok('Móc Neo: khoá ra chiêu 0,45s', p.castUntil - w.tick >= 12 && p.castUntil - w.tick <= 14, String(p.castUntil - w.tick));
}
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
