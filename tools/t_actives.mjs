// Kiểm thử đồ kích hoạt (sim/itemActives.js): Xích Đồng (áp chế), Lọng Hộ Mệnh (khiên đội), Dải Lụa Gió (lướt), Bình Sương Đông; giới hạn
// 2 món có kích hoạt; cổng lệnh khi bị áp chế / Sương Đông; bot dùng đồ (ai/botSkills.js useItems). node tools/t_actives.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { ITEMS, ACTIVE_MAX } from '../src/data/items.js';
import { computeBonus, planBuy, buyItem } from '../src/sim/inventory.js';
import { refreshStats } from '../src/sim/stats.js';
import { applyStatus } from '../src/sim/status.js';
import { startRecall } from '../src/sim/economy.js';
import { T } from '../src/sim/util.js';
import { createBot } from '../src/ai/heroBot.js';
import { useItems } from '../src/ai/botSkills.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

/** p (đội 0) ở (1000,1200) cầm `items`; f tướng địch cách dx. */
function setup(heroId = 'phu_dong', items = [], dx = 400, foe = 'canh_dieu', seed = 7) {
  const w = createWorld({ map: DUEL, seed, structures: false, waves: false });
  const p = w.spawnHero(heroId, 0, { x: 1000, y: 1200 }); w.debug.bare(p);
  const f = w.spawnHero(foe, 1, { x: 1000 + dx, y: 1200 }); w.debug.bare(f);
  give(w, p, items);
  let t = 0; const evs = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { w.update(++t); evs.push(...w.drainEvents()); } };
  const use = (e, id, aim = null) => { w.command(e.id, { type: 'useItem', slot: e.items.indexOf(id), aim }); step(1); };
  const fails = (e) => evs.filter((x) => x.type === 'castFail' && x.id === e.id).map((x) => x.reason);
  return { w, p, f, step, use, evs, fails };
}
function give(w, e, items) { e.items = e.items.map((_, i) => items[i] || null); e.bonus = computeBonus(e); refreshStats(w, e); e.hp = e.stats.maxHp; }
const sup = (t, by) => t.statuses.some((s) => s.kind === 'suppress' && s.src === by.id);

{ // 1: danh mục
  const ids = Object.keys(ITEMS), act = ids.filter((id) => ITEMS[id].active);
  ok('danh mục 56 món, 4 món có kích hoạt', ids.length === 56 && ['binh_suong_dong', 'xich_dong', 'long_ho_menh', 'dai_lua_gio'].every((id) => act.includes(id)) && act.length === 4, act.join(','));
  ok('mọi món kích hoạt có tên, kiểu ngắm, hồi chiêu', act.every((id) => { const a = ITEMS[id].active; return a.name && ['none', 'target', 'direction'].includes(a.aim) && a.cooldown > 0; }));
  ok('công thức ghép hợp lệ (giá ≥ tổng thành phần)', ['xich_dong', 'long_ho_menh', 'dai_lua_gio'].every((id) => { const it = ITEMS[id]; return it.from.every((c) => ITEMS[c]) && it.cost >= it.from.reduce((a, c) => a + ITEMS[c].cost, 0); }));
  ok('ACTIVE_MAX = 2', ACTIVE_MAX === 2);
}
{ // 2: tối đa 2 món kích hoạt
  const { w, p } = setup('phu_dong');
  p.gold = 99999;
  const a = buyItem(w, p, 'xich_dong'), b = buyItem(w, p, 'long_ho_menh');
  ok('mua được 2 món kích hoạt', a.ok && b.ok);
  ok('món kích hoạt thứ ba bị từ chối (active)', planBuy(p, 'dai_lua_gio').reason === 'active' && buyItem(w, p, 'dai_lua_gio').reason === 'active');
  ok('món thường vẫn mua được', planBuy(p, 'giap_gai').ok);
}
{ // 3: Xích Giữ
  const { w, p, f, step, use, evs } = setup('phu_dong', ['xich_dong']);
  use(p, 'xich_dong');
  ok('Xích Giữ: tướng địch bị áp chế, người dùng niệm giữ', sup(f, p) && p.channel?.target === f.id && evs.some((e) => e.type === 'suppress' && e.item));
  ok('Xích Giữ: hồi 80s (không giảm bởi giảm hồi chiêu)', p.itemCd.xich_dong === evs.find((e) => e.type === 'itemUse').tick + T(80));
  const x0 = p.pos.x; w.command(p.id, { type: 'move', dir: { x: -1, y: 0 } }); step(5);
  ok('Xích Giữ: người dùng cũng đứng yên', Math.abs(p.pos.x - x0) < 0.01);
  step(40);
  ok('Xích Giữ: hết 1,25s cả hai được thả', !sup(f, p) && !p.channel && evs.some((e) => e.type === 'suppressEnd' && e.ok));
}
{ // 4: không có mục tiêu trong tầm
  const { p, use, fails } = setup('phu_dong', ['xich_dong'], 700);
  use(p, 'xich_dong');
  ok('Xích Giữ: địch ngoài 450 → noTarget, không mất hồi', fails(p).includes('noTarget') && p.itemCd?.xich_dong === undefined);
}
{ // 5: mục tiêu trong Sương Đông / miễn khống chế
  const { w, p, f, use, fails } = setup('phu_dong', ['xich_dong']);
  give(w, f, ['binh_suong_dong']); use(f, 'binh_suong_dong'); use(p, 'xich_dong');
  ok('Xích Giữ: địch đang Sương Đông → noTarget', fails(p).includes('noTarget') && !sup(f, p) && p.itemCd?.xich_dong === undefined);
  const s2 = setup('phu_dong', ['xich_dong']);
  applyStatus(s2.w, s2.f, { status: 'ccImmune', duration: 2 }, s2.f); s2.use(s2.p, 'xich_dong');
  ok('Xích Giữ: địch miễn khống chế → noTarget', s2.fails(s2.p).includes('noTarget') && !sup(s2.f, s2.p));
}
{ // 6: mục tiêu chỉ định
  const { w, p, f, use } = setup('phu_dong', ['xich_dong'], 300);
  const far = w.spawnHero('cau_may', 1, { x: 1000, y: 1200 + 420 }); w.debug.bare(far);
  use(p, 'xich_dong', { id: far.id });
  ok('Xích Giữ: aim.id chọn đúng tướng xa hơn (420 thay vì 300)', sup(far, p) && !sup(f, p));
}
{ // 7–8: người dùng bị khống chế
  const { w, p, f, step, use, fails } = setup('phu_dong', ['xich_dong']);
  applyStatus(w, p, { status: 'stun', duration: 1 }, f); use(p, 'xich_dong');
  ok('người dùng bị choáng: cc, không mất hồi', fails(p).includes('cc') && p.itemCd?.xich_dong === undefined && !sup(f, p));
  step(35); applyStatus(w, p, { status: 'silence', duration: 1 }, f); use(p, 'xich_dong');
  ok('người dùng bị câm lặng: cc', fails(p).filter((r) => r === 'cc').length >= 2 && !sup(f, p));
  const s = setup('phu_dong', ['xich_dong']);
  s.use(s.p, 'xich_dong'); s.step(5); applyStatus(s.w, s.p, { status: 'stun', duration: 0.5 }, s.f); s.step(1);
  ok('người dùng bị choáng giữa chừng: xích đứt', !sup(s.f, s.p) && !s.p.channel && s.evs.some((e) => e.type === 'suppressEnd' && e.ok === false));
}
{ // 9: Lọng Che
  const { w, p, f, use, fails } = setup('long_dang', ['long_ho_menh'], 600, 'canh_dieu');
  const a5 = w.spawnHero('phu_dong', 0, { x: 1000, y: 1700 }), a7 = w.spawnHero('cau_may', 0, { x: 1000, y: 1900 });
  use(p, 'long_ho_menh');
  const want = 80 + 12 * (p.level - 1) + 0.05 * p.stats.maxHp, sh = (e) => e.shields.find((s) => s.id === 'ward_' + p.id)?.amount ?? 0;
  ok('Lọng Che: khiên cho mình + đồng minh trong 600', Math.abs(sh(p) - want) <= 1 && Math.abs(sh(a5) - want) <= 1, `${sh(p).toFixed(0)} / ${sh(a5).toFixed(0)} / ${want.toFixed(0)}`);
  ok('Lọng Che: đồng minh ngoài 600 không có khiên', sh(a7) === 0);
  ok('Lọng Che: hồi 70s', p.itemCd.long_ho_menh === w.tick + T(70), `${p.itemCd.long_ho_menh - w.tick}`);
  const s = setup('long_dang', ['long_ho_menh']);
  applyStatus(s.w, s.p, { status: 'stun', duration: 1 }, s.f); s.use(s.p, 'long_ho_menh');
  ok('Lọng Che: bị choáng thì không dùng được', s.fails(s.p).includes('cc') && !s.p.shields.length);
}
{ // 10: Lụa Gió
  const { w, p, f, step, use, fails } = setup('phu_dong', ['dai_lua_gio'], 400, 'canh_dieu');
  f.pos.y = f.prevPos.y = 1700;
  const x0 = p.pos.x; use(p, 'dai_lua_gio', { x: 1, y: 0 });
  p.itemCd.dai_lua_gio = 0; use(p, 'dai_lua_gio', { x: 1, y: 0 });
  ok('Lụa Gió: đang lướt thì không dùng lại được (busy)', fails(p).includes('busy'));
  step(7);
  const hs = p.statuses.find((s) => s.id === 'lua_gio');
  ok('Lụa Gió: lướt ~320', Math.abs(p.pos.x - x0 - 320) <= 30, `${(p.pos.x - x0).toFixed(0)}`);
  ok('Lụa Gió: +25% tốc chạy 1,5s', hs && hs.kind === 'haste' && hs.pct === 0.25);
  const s = setup('phu_dong', ['dai_lua_gio']);
  applyStatus(s.w, s.p, { status: 'noDash', duration: 1 }, s.f); s.use(s.p, 'dai_lua_gio', { x: 1, y: 0 });
  ok('Lụa Gió: trong kết giới → noDash, không mất hồi', s.fails(s.p).includes('noDash') && s.p.itemCd?.dai_lua_gio === undefined);
  const r = setup('phu_dong', ['dai_lua_gio']);
  applyStatus(r.w, r.p, { status: 'root', duration: 1 }, r.f); r.use(r.p, 'dai_lua_gio', { x: 1, y: 0 });
  ok('Lụa Gió: bị trói → cc', r.fails(r.p).includes('cc') && !r.p.dash);
}
{ // 11–13: cổng lệnh khi bị áp chế; Sương Đông chặn hiệu ứng của địch; dùng được khi bị choáng
  const { w, p, f, step, use, fails } = setup('phu_dong', ['xich_dong']);
  give(w, f, ['binh_suong_dong']);
  use(p, 'xich_dong'); use(f, 'binh_suong_dong');
  w.command(f.id, { type: 'restore' }); w.command(f.id, { type: 'recall' }); step(1);
  ok('bị áp chế: đồ / Hồi Máu / Biến về bị từ chối (suppressed), không mất hồi', fails(f).filter((r) => r === 'suppressed').length === 3 && f.itemCd?.binh_suong_dong === undefined && !f.recall);
  step(45);
  const s = setup('phu_dong', [], 400, 'canh_dieu'); give(s.w, s.f, ['binh_suong_dong']);
  applyStatus(s.w, s.f, { status: 'stun', duration: 1 }, s.p); s.use(s.f, 'binh_suong_dong');
  ok('Sương Đông: dùng được cả khi bị choáng (inCC)', s.f.statuses.some((x) => x.kind === 'stasis'));
  ok('Sương Đông: hiệu ứng của địch không bám', applyStatus(s.w, s.f, { status: 'stun', duration: 1 }, s.p) === null && applyStatus(s.w, s.f, { status: 'slow', pct: 0.5, duration: 1 }, s.p) === null);
  ok('Sương Đông: hiệu ứng của chính mình vẫn bám', applyStatus(s.w, s.f, { status: 'haste', id: 'x', pct: 0.1, duration: 1 }, s.f) !== null);
}
{ // 14: hồi chiêu riêng từng món
  const { w, p, f, use, fails } = setup('phu_dong', ['long_ho_menh', 'xich_dong']);
  use(p, 'long_ho_menh'); use(p, 'xich_dong');
  ok('hai món kích hoạt có hồi chiêu riêng', p.itemCd.long_ho_menh > w.tick && p.itemCd.xich_dong > w.tick && sup(f, p) && !fails(p).length);
}
{ // 16: dùng đồ huỷ Biến về
  const { w, p, use, evs } = setup('phu_dong', ['long_ho_menh'], 1500);
  startRecall(w, p); use(p, 'long_ho_menh');
  ok('dùng đồ kích hoạt thì huỷ Biến về', !p.recall && evs.some((e) => e.type === 'recallCancel'));
}
{ // 15: bot dùng đồ
  const mk = (heroId, items, dx = 400) => {
    const s = setup(heroId, items, dx); const bot = createBot(s.w, s.p); bot.next = 1e9; // không cho think chạy (bản đồ thử không có Suối Đèn)
    const sent = []; const cmd = s.w.command; s.w.command = (id, c) => { if (id === s.p.id) sent.push(c); cmd(id, c); };
    return { ...s, bot, sent };
  };
  const a = mk('phu_dong', ['xich_dong']);
  const ally = a.w.spawnHero('cau_may', 0, { x: 1300, y: 1300 }); void ally;
  const r = useItems(a.bot, a.f, 'fight');
  ok('bot: Xích Giữ khi có đồng minh gần mục tiêu, aim.id = mục tiêu', r && a.sent.some((c) => c.type === 'useItem' && c.aim?.id === a.f.id));
  a.step(1);
  ok('bot: lệnh của bot áp chế thật', sup(a.f, a.p));
  const sent0 = a.sent.length; a.p.itemCd = {};
  give(a.w, a.p, ['xich_dong', 'long_ho_menh', 'dai_lua_gio']); a.p.channel = { link: 1, start: a.w.tick, until: a.w.tick + 30, target: a.f.id }; ally.hp = ally.stats.maxHp * 0.2; a.f.hp = 30; // Lọng / Lụa (đuổi kết liễu) đều đủ điều kiện
  const rr = useItems(a.bot, a.f, 'fight') || useItems(a.bot, a.f, 'survive');
  ok('bot đang niệm giữ xích: không dùng Lọng / Lụa (chỉ Sương Đông)', !rr && a.sent.length === sent0);
  const b = mk('phu_dong', ['xich_dong']); b.w.spawnHero('cau_may', 0, { x: 1300, y: 1300 });
  b.p.hp = b.p.stats.maxHp * 0.3;
  ok('bot: máu dưới 35% thì không xích', !useItems(b.bot, b.f, 'fight') && !b.sent.length);
  const c = mk('bong_den', ['binh_suong_dong']); c.p.hp = c.p.stats.maxHp * 0.2;
  ok('bot: máu thấp + địch trong 500 → Sương Đông', useItems(c.bot, c.f, 'survive') && c.sent.some((x) => x.type === 'useItem' && x.slot === 0));
  const d = mk('long_dang', ['long_ho_menh']); const al = d.w.spawnHero('phu_dong', 0, { x: 1100, y: 1300 }); al.hp = al.stats.maxHp * 0.3;
  ok('bot: đồng minh dưới 40% có tướng địch gần → Lọng Che', useItems(d.bot, d.f, 'survive') && d.sent.some((x) => x.type === 'useItem'));
  const e = mk('long_dang', ['long_ho_menh']);
  ok('bot: không ai thấp máu → không dùng Lọng', !useItems(e.bot, e.f, 'survive') && !e.sent.length);
  const g = mk('phu_dong', ['dai_lua_gio']); g.f.hp = 30;
  ok('bot: Lụa Gió đuổi kết liễu địch ngoài tầm đánh', useItems(g.bot, g.f, 'fight') && g.sent.some((x) => x.type === 'useItem' && x.aim?.x > 0.9));
}

console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
