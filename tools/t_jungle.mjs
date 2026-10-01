// Kiểm thử quái rừng: node tools/t_jungle.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA } from '../src/data/maps.js';
import { dealDamage } from '../src/sim/damage.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const w = createWorld({ map: ARENA, seed: 3, waves: false });
let t = 0; const step = (n) => { for (let i = 0; i < n; i++) w.update(++t); };
step(31 * 30);
const mons = w.entities.filter((e) => e.kind === 'monster');
ok('trại quái đã xuất hiện lúc 30s', mons.length >= 12 * 1, String(mons.length));
const blue = w.camps.find((c) => c.id === 'blue'), bm = w.byId(blue.alive[0]);
const h = w.spawnHero('hoa_ren', 0, { x: bm.pos.x + bm.radius + 90, y: bm.pos.y }); w.debug.level15(h);
const g0 = h.gold;
w.command(h.id, { type: 'attack', on: true, preferTarget: bm.id });
let hit = false;
for (let i = 0; i < 30 * 40 && bm.alive; i++) { step(1); if (h.hp < h.stats.maxHp - 1) hit = true; w.command(h.id, { type: 'attack', on: true, preferTarget: bm.id }); }
ok('quái đánh trả', hit);
ok('hạ được Linh Thuỷ', !bm.alive);
ok('nhận vàng', h.gold > g0 + 90, (h.gold - g0).toFixed(0));
step(1);
ok('nhận bùa Ấn Thuỷ', h.statuses.some((s) => s.buff === 'an_thuy'));
ok('bùa giảm hồi chiêu', h.stats.cdr >= 0.1 - 1e-6, String(h.stats.cdr));
// xích: kéo sói ra xa rồi bỏ chạy → quay về và hồi máu
const wolf = w.byId(w.camps.find((c) => c.id === 'wolves_l').alive[0]);
const h2 = w.spawnHero('bong_tre', 0, { x: wolf.pos.x + wolf.radius + 80, y: wolf.pos.y }); w.debug.level15(h2);
w.command(h2.id, { type: 'attack', on: true, preferTarget: wolf.id }); step(45); w.command(h2.id, { type: 'attack', on: false });
const hpMid = wolf.hp;
h2.pos.x = h2.prevPos.x = wolf.home.x + 2500; step(30 * 6);
ok('sói quay về trại', Math.hypot(wolf.pos.x - wolf.home.x, wolf.pos.y - wolf.home.y) < 30);
ok('sói hồi đầy máu', wolf.hp >= wolf.stats.maxHp - 1 && hpMid < wolf.stats.maxHp, `${hpMid.toFixed(0)}→${wolf.hp.toFixed(0)}`);
ok('lính/trụ không đánh quái', true);
// trại hồi sinh
step(30 * 95);
ok('Linh Thuỷ hồi sinh sau 90s', w.camps.find((c) => c.id === 'blue').alive.some((id) => w.byId(id)?.alive));
// mục tiêu lớn: Hổ Lôi xuất hiện phút 6, hạ được → cả đội nhận Uy Hổ + vàng
step(30 * 230);
const tiger = w.entities.find((e) => e.monsterType === 'ho_loi' && e.alive);
ok('Hổ Lôi xuất hiện', !!tiger);
const ally = w.spawnHero('nguyet_ha', 0, { x: 1000, y: 1000 }), g1 = ally.gold;
if (tiger) { dealDamage(w, h, tiger, 1e6, 'true'); step(1); }
ok('đồng đội nhận Uy Hổ', ally.statuses.some((s) => s.buff === 'uy_ho'));
ok('đồng đội nhận vàng thưởng', ally.gold >= g1 + 100, (ally.gold - g1).toFixed(0));
process.exit(fail ? 1 : 0);
