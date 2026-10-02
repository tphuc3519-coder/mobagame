// Kiểm thử nút Hồi Máu cố định: node tools/t_restore.mjs
import { createWorld } from '../src/sim/world.js';
import { ARENA } from '../src/data/maps.js';
import { RESTORE } from '../src/data/spells.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const w = createWorld({ map: ARENA, seed: 5, waves: false });
let t = 0; const step = (n) => { for (let i = 0; i < n; i++) w.update(++t); };
const h = w.spawnHero('hoa_ren', 0, { x: 3000, y: 3000 }), c = w.spawnHero('hoa_ren', 0, { x: 3300, y: 3000 }); // c: đối chứng (chỉ hồi máu tự nhiên)
step(1);
ok('tướng có nút Hồi Máu, phép bổ trợ vẫn riêng', !!h.restore && h.spell?.id && h.spell.id !== RESTORE.id, h.spell?.id);
h.hp = c.hp = h.stats.maxHp * 0.3;
w.command(h.id, { type: 'restore' }); step(RESTORE.duration * 30 + 2);
const gained = (h.hp - c.hp) / h.stats.maxHp;
ok('hồi ~15% HP tối đa trong 3s', Math.abs(gained - RESTORE.healPct) < 0.01, (gained * 100).toFixed(1) + '%');
const d1 = h.hp - c.hp;
w.command(h.id, { type: 'restore' }); step(60);
ok('đang hồi chiêu thì không dùng lại', Math.abs(h.hp - c.hp - d1) < 1);
step(RESTORE.cooldown * 30);
h.hp = c.hp = h.stats.maxHp * 0.3; const d2 = 0;
w.command(h.id, { type: 'restore' }); step(RESTORE.duration * 30 + 2);
ok('hết hồi chiêu dùng lại được', h.hp - c.hp > d2 + 50);
w.command(h.id, { type: 'recall' }); step(10); ok('đang biến về', !!h.recall);
step(RESTORE.cooldown * 30); w.command(h.id, { type: 'restore' }); step(1);
ok('dùng Hồi Máu huỷ Biến về', !h.recall);
console.log(fail ? `\n${fail} lỗi` : '\nTất cả đạt'); process.exit(fail ? 1 : 0);
