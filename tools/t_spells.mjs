// Kiểm thử phép bổ trợ (05 §6): danh mục 10 phép, Tắt Đèn, Loá Mắt, Trống Trận, Bùa Mỏi, phép cũ (chạy lại t_items / t_jungle).
// node tools/t_spells.mjs
import { spawnSync } from 'child_process';
import { createWorld } from '../src/sim/world.js';
import { DUEL, ARENA } from '../src/data/maps.js';
import { SPELLS, SPELL_LIST, SPELL_LIST_1V1, DEFAULT_SPELL } from '../src/data/spells.js';
import { dealDamage } from '../src/sim/damage.js';
import { applyStatus } from '../src/sim/status.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

{ // (1) danh mục
  const keys = Object.keys(SPELLS);
  ok('đủ 10 phép', keys.length === 10, String(keys.length));
  ok('mỗi phép có kind / cooldown / name', keys.every((k) => SPELLS[k].kind && SPELLS[k].cooldown > 0 && SPELLS[k].name && SPELLS[k].id === k));
  ok('tên phép không trùng', new Set(keys.map((k) => SPELLS[k].name)).size === keys.length);
  ok('kind không trùng', new Set(keys.map((k) => SPELLS[k].kind)).size === keys.length);
  ok('SPELL_LIST là hoán vị các khoá', SPELL_LIST.length === keys.length && new Set(SPELL_LIST).size === keys.length && SPELL_LIST.every((k) => SPELLS[k]));
  ok('1v1 chỉ bỏ Trừng Trị', SPELL_LIST_1V1.length === keys.length - 1 && !SPELL_LIST_1V1.includes('thu_hoach'));
  ok('phép mặc định là Chớp Bước', DEFAULT_SPELL === 'chop_buoc' && SPELL_LIST[0] === DEFAULT_SPELL);
  ok('4 phép mới có mô tả tiếng Việt', ['tat_den', 'loa_mat', 'trong_tran', 'bua_moi'].every((k) => SPELLS[k].desc?.length > 40));
}

{ // (2) Tắt Đèn
  const w = createWorld({ map: DUEL, seed: 3, waves: false });
  const tw = w.entities.find((s) => s.kind === 'tower' && s.team === 1 && s.tier === 'outer');
  const p = w.spawnHero('thach_quy', 0, { x: tw.pos.x - 520, y: tw.pos.y }); w.debug.bare(p);
  p.spell = { id: 'tat_den', ready: 0 };
  let t = 0; const shots = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { w.update(++t); w.debug.fullHeal(p); for (const ev of w.drainEvents()) if (ev.type === 'towerShot' && ev.id === tw.id) shots.push(ev); else if (ev.type === 'castFail' && ev.id === p.id) shots.push(ev); } };
  step(60);
  ok('trước khi dùng: trụ bắn mình trong 2s', shots.some((s) => s.type === 'towerShot' && s.target === p.id), String(shots.length));
  shots.length = 0;
  w.command(p.id, { type: 'spell' }); step(1); const castTick = t;
  ok('trụ bị tắt đúng 4s (disabledUntil = tick + 120)', tw.disabledUntil === castTick + 120, `${tw.disabledUntil - castTick}`);
  ok('hồi chiêu 90s', p.spell.ready - castTick === 90 * 30, String(p.spell.ready - castTick));
  step(119);
  ok('4 giây không bắn phát nào', shots.filter((s) => s.type === 'towerShot').length === 0, String(shots.length));
  step(45);
  ok('hết 4 giây: bắn lại trong 1,5s', shots.some((s) => s.type === 'towerShot'));
  // ngoài tầm 900 (tính tới mép công trình): không dùng được, không mất hồi chiêu
  p.spell.ready = 0; p.pos.x = p.prevPos.x = tw.pos.x - tw.radius - 1000; shots.length = 0;
  w.command(p.id, { type: 'spell' }); step(1);
  ok('ngoài tầm: báo noTarget', shots.some((s) => s.type === 'castFail' && s.reason === 'noTarget'));
  ok('ngoài tầm: không mất hồi chiêu', p.spell.ready === 0);
  // dùng lại khi đang tắt: cộng tới mốc xa hơn
  p.pos.x = p.prevPos.x = tw.pos.x - 520; tw.disabledUntil = t + 200; w.command(p.id, { type: 'spell' }); step(1);
  ok('dùng khi trụ đang tắt lâu hơn: giữ mốc xa hơn', tw.disabledUntil === t - 1 + 200, String(tw.disabledUntil - t));
}

{ // (3) Loá Mắt
  const w = createWorld({ map: ARENA, seed: 5, structures: false, waves: false });
  const c = { x: 9600, y: 9600 };
  const p = w.spawnHero('thach_quy', 0, c); w.debug.bare(p);
  const at = (dx) => { const e = w.spawnHero('hoa_ren', 1, { x: c.x + dx, y: c.y }); w.debug.bare(e); return e; };
  const a = at(200), b = at(-300), far = at(500);
  const imm = w.spawnHero('hoa_ren', 1, { x: c.x, y: c.y + 250 }); w.debug.bare(imm);
  const ten = w.spawnHero('hoa_ren', 1, { x: c.x, y: c.y - 250 }); w.debug.bare(ten);
  let t = 0; const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  step(2);
  applyStatus(w, imm, { status: 'ccImmune', duration: 5 }, imm);
  applyStatus(w, ten, { status: 'statMod', id: 'tn', tenacity: 0.5, duration: 5 }, ten); step(1);
  p.spell = { id: 'loa_mat', ready: 0 }; w.drainEvents();
  w.command(p.id, { type: 'spell' }); step(1);
  const stun = (e) => e.statuses.find((s) => s.kind === 'stun');
  const d = (e) => (stun(e) ? stun(e).until - t : -1);
  ok('địch ở 200 và 300 bị choáng 0,75s', [a, b].every((e) => d(e) >= 22 && d(e) <= 23), `${d(a)} ${d(b)}`);
  ok('địch ở 500 không bị', !stun(far));
  ok('miễn khống chế: không bị choáng', !stun(imm));
  ok('kháng hiệu ứng 50%: choáng ~11 nhịp', Math.abs(d(ten) - 11) <= 1, String(d(ten)));
  ok('hồi chiêu 110s', p.spell.ready - t === 110 * 30);
  ok('sự kiện flashBang kèm danh sách trúng', w.drainEvents().some((ev) => ev.type === 'flashBang' && ev.hits.length === 3));
  // không có tướng địch trong 380: không dùng, không mất hồi chiêu
  const w2 = createWorld({ map: ARENA, seed: 5, structures: false, waves: false });
  const q = w2.spawnHero('thach_quy', 0, c); w2.spawnHero('hoa_ren', 1, { x: c.x + 600, y: c.y }); q.spell = { id: 'loa_mat', ready: 0 };
  w2.update(1); w2.command(q.id, { type: 'spell' }); w2.update(2);
  ok('không có ai trong vùng: noTarget, không mất hồi chiêu', q.spell.ready === 0 && w2.drainEvents().some((ev) => ev.type === 'castFail' && ev.reason === 'noTarget'));
}

{ // (4) Trống Trận
  const w = createWorld({ map: ARENA, seed: 5, structures: false, waves: false });
  const c = { x: 9600, y: 9600 };
  const p = w.spawnHero('canh_dieu', 0, c), al = w.spawnHero('hoa_ren', 0, { x: c.x + 500, y: c.y }), far = w.spawnHero('hoa_ren', 0, { x: c.x - 900, y: c.y });
  for (const e of [p, al, far]) w.debug.bare(e);
  let t = 0; const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  step(1);
  const base = new Map([p, al, far].map((e) => [e, { as: e.stats.atkSpeed, atk: e.stats.atk }]));
  p.spell = { id: 'trong_tran', ready: 0 }; w.command(p.id, { type: 'spell' }); step(1);
  const r = (e) => [e.stats.atkSpeed / base.get(e).as, e.stats.atk / base.get(e).atk];
  ok('bản thân +30% tốc đánh, +10% Công', near(r(p)[0], 1.3) && near(r(p)[1], 1.1), r(p).map((x) => x.toFixed(4)).join(' '));
  ok('đồng minh trong 700: +15% / +5%', near(r(al)[0], 1.15) && near(r(al)[1], 1.05), r(al).map((x) => x.toFixed(4)).join(' '));
  ok('đồng minh ở 900: không đổi', near(r(far)[0], 1) && near(r(far)[1], 1));
  step(150 + 1);
  ok('hết 5 giây: về như cũ', [p, al].every((e) => near(r(e)[0], 1) && near(r(e)[1], 1)), r(p).map((x) => x.toFixed(4)).join(' '));
}

{ // (5) Bùa Mỏi
  const w = createWorld({ map: ARENA, seed: 5, structures: false, waves: false });
  const c = { x: 9600, y: 9600 };
  const p = w.spawnHero('thach_quy', 0, c), q = w.spawnHero('hoa_ren', 1, { x: c.x + 400, y: c.y }), rr = w.spawnHero('hoa_ren', 0, { x: c.x - 300, y: c.y });
  for (const e of [p, q, rr]) w.debug.bare(e);
  let t = 0; const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(++t); };
  const hit = () => { w.debug.fullHeal(rr); return dealDamage(w, q, rr, 100, 'true'); };
  step(1);
  ok('trước: 100 sát thương chuẩn = 100', near(hit(), 100));
  const ms0 = q.stats.moveSpeed;
  p.spell = { id: 'bua_moi', ready: 0 }; w.command(p.id, { type: 'spell' }); step(1); const cast = t;
  ok('sau Bùa Mỏi: còn 65', near(hit(), 65), String(hit()));
  ok('tốc chạy còn 75%', near(q.stats.moveSpeed / ms0, 0.75, 1e-3), (q.stats.moveSpeed / ms0).toFixed(4));
  ok('hồi chiêu 100s', p.spell.ready - cast === 100 * 30);
  step(90 + 1);
  ok('hết 3 giây: 100 lại', near(hit(), 100));
  // Giải Trói gỡ được
  p.spell.ready = 0; w.command(p.id, { type: 'spell' }); step(1);
  ok('dán lại: 65', near(hit(), 65));
  q.spell = { id: 'giai_troi', ready: 0 }; w.command(q.id, { type: 'spell' }); step(1);
  ok('Giải Trói gỡ Bùa Mỏi', !q.statuses.some((s) => s.id === 'buamoi') && near(hit(), 100));
  // kháng hiệu ứng rút ngắn
  applyStatus(w, q, { status: 'statMod', id: 'tn', tenacity: 0.5, duration: 9 }, q); step(1);
  p.spell.ready = 0; w.command(p.id, { type: 'spell' }); step(1);
  const st = q.statuses.find((s) => s.id === 'buamoi');
  ok('kháng 50%: Bùa Mỏi ~45 nhịp', st && Math.abs(st.until - t - 45) <= 1, st ? String(st.until - t) : 'không có');
  // DoT của người bị dán cũng yếu đi
  w.debug.fullHeal(rr); const h0 = rr.hp; dealDamage(w, q, rr, 100, 'magic', { dot: true });
  ok('sát thương theo thời gian cũng bị giảm', rr.hp > h0 - 100 * 0.66);
  // không có ai trong 600
  q.pos.x = q.prevPos.x = c.x + 900; p.spell.ready = 0; w.drainEvents(); w.command(p.id, { type: 'spell' }); step(1);
  ok('không có tướng địch trong 600: noTarget, không mất hồi chiêu', p.spell.ready === 0 && w.drainEvents().some((ev) => ev.type === 'castFail' && ev.reason === 'noTarget'));
}

{ // (6) phép cũ: chạy lại bộ kiểm thử cũ (Chớp Bước 450, Trừng Trị, khoá 1v1…)
  for (const f of ['tools/t_items.mjs', 'tools/t_jungle.mjs']) {
    const r = spawnSync(process.execPath, [f], { encoding: 'utf8' });
    ok(`phép cũ không đổi: ${f}`, r.status === 0 && !/^LỖI/m.test(r.stdout), (r.stdout.match(/^LỖI.*$/m) || [''])[0]);
  }
}

console.log(fail ? `\n${fail} mục LỖI` : '\nTất cả đạt');
process.exit(fail ? 1 : 0);
