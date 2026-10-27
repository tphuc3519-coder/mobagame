// Kiểm thử Áp chế (sợi xích sim/suppress.js), Không thể cản (unstoppable) và lướt khi bị trói: node tools/t_suppress.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { castSkill } from '../src/sim/skills.js';
import { applyStatus } from '../src/sim/status.js';
import { applyInstant } from '../src/sim/effects.js';
import { dealDamage } from '../src/sim/damage.js';
import { startSuppress } from '../src/sim/suppress.js';
import { T } from '../src/sim/util.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

/** p: tướng thử ở (1000,1200); d: tướng địch đứng yên cách dx — cùng cách dựng với t_heroes. */
function setup(heroId, dx = 400, foe = 'phu_dong', seed = 7) {
  const w = createWorld({ map: DUEL, seed, structures: false, waves: false });
  const p = w.spawnHero(heroId, 0, { x: 1000, y: 1200 }); w.debug.bare(p);
  const d = w.spawnHero(foe, 1, { x: 1000 + dx, y: 1200 }); w.debug.bare(d);
  for (const s of ['s1', 's2', 's3']) { p.skillLevels[s] = 1; d.skillLevels[s] = 1; }
  let t = 0; const evs = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { w.update(++t); evs.push(...w.drainEvents()); } };
  const cast = (slot, aim = { x: 1, y: 0 }) => { w.debug.resetCooldowns(p); return castSkill(w, p, slot, aim); };
  return { w, p, d, step, cast, evs };
}
const sup = (d, p) => d.statuses.some((s) => s.kind === 'suppress' && s.src === p.id);
const ends = (evs) => evs.filter((e) => e.type === 'suppressEnd');

{ // 1–2: Shikamaru K2 áp chế Superman; người bị áp chế không làm gì được
  const { w, p, d, step, cast, evs } = setup('bong_den');
  const r = cast('s2'); step(12);
  ok('Trói Bóng: mục tiêu bị áp chế (src = Shikamaru)', r.ok && sup(d, p));
  ok('Trói Bóng: Shikamaru đứng niệm giữ dây', p.channel?.target === d.id && w.tick < p.castUntil, `castUntil ${p.castUntil} tick ${w.tick}`);
  ok('bị áp chế: không tung chiêu (cc)', castSkill(w, d, 's1', { x: -1, y: 0 }).reason === 'cc');
  d.spell = { id: 'giai_troi', ready: 0 };
  w.command(d.id, { type: 'spell' }); step(1);
  ok('bị áp chế: Giải Trói bị từ chối (suppressed), không mất hồi', evs.some((e) => e.type === 'castFail' && e.id === d.id && e.reason === 'suppressed') && d.spell.ready === 0 && sup(d, p));
  const x0 = d.pos.x, y0 = d.pos.y;
  for (let i = 0; i < 5; i++) { w.command(d.id, { type: 'move', dir: { x: -1, y: 0 } }); step(1); }
  ok('bị áp chế: không di chuyển được', Math.abs(d.pos.x - x0) < 0.01 && Math.abs(d.pos.y - y0) < 0.01, `${(d.pos.x - x0).toFixed(2)}`);
  const n0 = evs.length; w.command(d.id, { type: 'attack', on: true }); step(10);
  ok('bị áp chế: không đánh thường', !evs.slice(n0).some((e) => e.type === 'attack' && e.id === d.id));
  for (const c of [{ type: 'restore' }, { type: 'recall' }, { type: 'cast', slot: 's2', aim: { x: -1, y: 0 } }]) w.command(d.id, c);
  step(1);
  ok('bị áp chế: Hồi Máu / Biến về / chiêu đều bị từ chối', evs.filter((e) => e.type === 'castFail' && e.id === d.id && e.reason === 'suppressed').length >= 4 && !d.recall && !(d.restore.ready > 0));
  ok('Shikamaru đang giữ dây: không tung chiêu khác (channel)', castSkill(w, p, 's1', { x: 1, y: 0 }).reason === 'channel');
}
{ // 3: kháng hiệu ứng không rút ngắn áp chế
  const { w, p, d, step, cast } = setup('bong_den');
  d.bonus.tenacity = 0.6; step(1);
  cast('s2'); step(12);
  const st = d.statuses.find((s) => s.kind === 'suppress');
  ok('áp chế không bị kháng hiệu ứng rút ngắn', d.stats.tenacity >= 0.59 && p.channel && p.channel.until - p.channel.start === T(1.25) && st && st.until >= p.channel.until, `tenacity ${d.stats.tenacity} dài ${p.channel && p.channel.until - p.channel.start}`);
}
{ // 4: hết giờ tự nhiên → choáng cuối
  const { w, p, d, step, cast, evs } = setup('bong_den');
  cast('s2'); step(12); step(32);
  ok('giữ đủ 1,25s: hết áp chế, choáng 0,8s, Shikamaru được thả', !sup(d, p) && d.statuses.some((s) => s.id === 'troi_bong_stun') && !p.channel);
  ok('sự kiện suppressEnd ok = true', ends(evs).some((e) => e.ok === true && e.target === d.id));
  ok('dây bóng: sát thương chia nhịp', d.hp < d.stats.maxHp, `${(d.stats.maxHp - d.hp).toFixed(0)}`);
}
for (const [name, spec] of [['choáng', { status: 'stun', duration: 1 }], ['câm lặng', { status: 'silence', duration: 1 }], ['khiêu khích', { status: 'taunt', duration: 1 }]]) { // 5
  const { w, p, d, step, cast, evs } = setup('bong_den');
  cast('s2'); step(12);
  applyStatus(w, p, spec, d); step(1);
  ok(`Shikamaru bị ${name}: dây đứt (ok = false)`, !sup(d, p) && !p.channel && ends(evs).some((e) => e.ok === false));
  step(40);
  ok(`Shikamaru bị ${name}: không có choáng cuối`, !d.statuses.some((s) => s.id === 'troi_bong_stun'));
}
{ // 6: bị đẩy lùi (cắt chiêu)
  const { w, p, d, step, cast, evs } = setup('bong_den');
  cast('s2'); step(12);
  applyInstant(w, p, { status: 'knockback', dist: 120 }, d); step(1);
  ok('Shikamaru bị đẩy lùi: dây đứt', !sup(d, p) && ends(evs).some((e) => e.ok === false));
}
{ // 7: người gây chết
  const { w, p, d, step, cast, evs } = setup('bong_den');
  cast('s2'); step(12);
  dealDamage(w, d, p, 99999, 'true'); step(1);
  ok('Shikamaru chết: dây đứt, mục tiêu được thả', !p.alive && !sup(d, p) && ends(evs).some((e) => e.ok === false));
}
{ // 8: giải khống chế không gỡ áp chế
  const { w, p, d, step, cast } = setup('bong_den');
  cast('s2'); step(12);
  applyInstant(w, d, { status: 'cleanse' }, d); step(1);
  ok('Châm Cứu / giải khống chế không gỡ áp chế', sup(d, p) && !!p.channel);
}
{ // 9: mục tiêu miễn khống chế → dây thường (không áp chế, không niệm)
  const { w, p, d, step, cast } = setup('bong_den');
  applyStatus(w, d, { status: 'ccImmune', duration: 3 }, d);
  cast('s2'); step(12);
  ok('mục tiêu miễn khống chế: không áp chế, Shikamaru không niệm', !sup(d, p) && !p.channel);
  ok('mục tiêu miễn khống chế: vẫn nối dây bóng thường (sát thương)', (w.tethers || []).length === 1 && d.hp < d.stats.maxHp);
}
{ // 11: Shikamaru tự dùng phép (Chớp Bước) giữa lúc giữ dây → thả dây
  const { w, p, d, step, cast, evs } = setup('bong_den');
  cast('s2'); step(12);
  p.spell = { id: 'chop_buoc', ready: 0 };
  w.command(p.id, { type: 'spell', aim: { x: -1, y: 0 } }); step(1);
  ok('tự dùng Chớp Bước: thả dây (ok = false)', !sup(d, p) && !p.channel && ends(evs).some((e) => e.ok === false) && p.spell.ready > w.tick);
}
{ // 12: Doraemon không thoát được áp chế bằng chong chóng
  const { w, p, d, step, cast, evs } = setup('bong_den', 400, 'meo_than_tai');
  step(30 * 2);
  cast('s2'); step(12);
  const held = sup(d, p); step(20);
  ok('Mèo bị áp chế: chong chóng không bung', held && !evs.some((e) => e.type === 'proc' && e.kind === 'chong_chong'));
}
{ // 13: đường chung — chiêu bất kỳ có `suppress` áp chế tướng trúng đầu tiên rồi áp hiệu ứng atEnd
  const { w, p, d, step, cast } = setup('trang_nhi', 500);
  const s3 = p.data.skills.s3;
  p.data = { ...p.data, skills: { ...p.data.skills, s3: { ...s3, canTarget: undefined, canCast: undefined, suppress: { duration: 1 }, effects: [{ status: 'stun', id: 'syn_end', duration: 0.5, atEnd: true }] } } };
  const r = cast('s3', { x: 1, y: 0 }); step(10);
  ok('chiêu có suppress (đạn khoá mục tiêu): trúng thì áp chế', r.ok && sup(d, p) && p.channel?.target === d.id, r.reason || '');
  step(35);
  ok('chiêu có suppress: hết giờ áp hiệu ứng atEnd', !sup(d, p) && d.statuses.some((s) => s.id === 'syn_end'));
}
{ // 14: Không thể cản — Dép Bay của ChiChi
  const { w, p, d, step, cast } = setup('ba_nam', 600, 'cau_may');
  const r = cast('s3', null); step(2);
  ok('Dép Bay: đang lao thì miễn khống chế', r.ok && !!p.dash && applyStatus(w, p, { status: 'stun', duration: 1 }, d) === null && p.statuses.some((s) => s.id === 'unstoppable'));
  applyInstant(w, p, { status: 'knockback', dist: 200 }, d);
  ok('Dép Bay: bị đẩy / cắt chiêu không dừng được cú lao', !!p.dash && !p.forced);
  step(20);
  ok('Dép Bay: vẫn trúng + choáng', d.hp < d.stats.maxHp && d.statuses.some((s) => s.kind === 'stun'));
  ok('Dép Bay: hết lao thì hết không thể cản, khống chế mới bám lại', !p.statuses.some((s) => s.id === 'unstoppable') && applyStatus(w, p, { status: 'stun', duration: 0.5 }, d) !== null);
}
{ // 15: Không thể cản — Nhật Vũ của Tanjiro: chuỗi 13 nhát vẫn ra đủ
  const { w, p, d, step, cast, evs } = setup('kiem_thuy', 500, 'cau_may');
  p.flags.seals = 5;
  const r = cast('s3', { x: 1, y: 0 }); step(2);
  ok('Nhật Vũ: đang lướt thì miễn khống chế', r.ok && applyStatus(w, p, { status: 'stun', duration: 1 }, d) === null, r.reason || '');
  step(60);
  ok('Nhật Vũ: đủ 13 nhát chém', evs.filter((e) => e.type === 'slash' && e.id === p.id).length === 13, String(evs.filter((e) => e.type === 'slash').length));
}
{ // 16: không áp chế được người đang không thể cản
  const { w, p, d } = setup('bong_den');
  applyStatus(w, p, { status: 'ccImmune', id: 'unstoppable', duration: 1 }, p);
  ok('không áp chế được người đang không thể cản', startSuppress(w, d, p, { duration: 1 }) === null && !d.channel);
}
{ // 17: bị trói không lướt được (04 §3)
  const { w, p, d } = setup('ba_nam', 500, 'cau_may');
  applyStatus(w, p, { status: 'root', duration: 2 }, d);
  ok('bị trói: lao khoá mục tiêu bị từ chối (rooted)', castSkill(w, p, 's3', null).reason === 'rooted');
  const c = setup('canh_dieu', 500, 'cau_may');
  applyStatus(c.w, c.p, { status: 'root', duration: 2 }, c.d);
  ok('bị trói: lướt bị từ chối (rooted)', castSkill(c.w, c.p, 's2', { x: 1, y: 0 }).reason === 'rooted');
}
{ // ccImmune nay chặn cả đẩy / hút / cắt chiêu (Giải Trói, chong chóng)
  const { w, p, d, step } = setup('bong_den');
  applyStatus(w, d, { status: 'ccImmune', duration: 1 }, d);
  const x0 = d.pos.x; applyInstant(w, d, { status: 'knockback', dist: 200 }, p); step(10);
  ok('miễn khống chế: không bị đẩy lùi', Math.abs(d.pos.x - x0) < 1 && !d.statuses.some((s) => s.id === 'knock_stun'));
}

console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
