// Phù hiệu (05 §9) trong mô phỏng + world.setLoadout (chỉ nhận ở tick 0, làm sạch dữ liệu, tất định).
// Dùng: node tools/t_emblems.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL, ARENA } from '../src/data/maps.js';
import { dealDamage } from '../src/sim/damage.js';
import { setupTeams } from '../src/sim/lineup.js';
import { KEYSTONES, MINORS, EMBLEM_BY_ROLE, sanitizeEmblem, emblemStats } from '../src/data/emblems.js';
import { HEROES } from '../src/data/heroes/index.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const run = (w, n) => { for (let i = 0; i < n; i++) w.update(w.tick + 1); };
const pair = (a = 'hoa_ren', b = 'thach_quy', em = null) => {
  const w = createWorld({ map: DUEL, seed: 3 });
  const x = w.spawnHero(a, 0, { x: 1500, y: DUEL.road.y }), y = w.spawnHero(b, 1, { x: 1700, y: DUEL.road.y });
  if (em) w.setLoadout(x, { emblem: em });
  return { w, x, y };
};
const shieldOf = (e, id) => (e.shields || []).filter((s) => s.id === id).reduce((n, s) => n + s.amount, 0);

// —— 1. dữ liệu ——
{
  ok('4 phù hiệu chính, 6 nét phụ, mặc định đủ 6 vai', Object.keys(KEYSTONES).length === 4 && Object.keys(MINORS).length === 6 && Object.keys(EMBLEM_BY_ROLE).length === 6);
  const s = sanitizeEmblem({ key: 'khong_co', minors: ['m_tinh_tao', 'm_da_day'] }, 'tank');
  ok('làm sạch: phù hiệu lạ → mặc định vai, nét phụ sai hàng → mặc định hàng', s.key === 'mai_rua' && s.minors[0] === 'm_da_day' && s.minors[1] === 'm_tinh_tao', JSON.stringify(s));
  ok('làm sạch: rác (chuỗi, null, mảng) không vỡ', sanitizeEmblem('xx', 'mage').key === 'tam_hoa' && sanitizeEmblem(null, 'lạ').key === EMBLEM_BY_ROLE.fighter.key && sanitizeEmblem([], 'support').key === 'den_ho_menh');
  const st = emblemStats({ key: 'tam_hoa', minors: ['m_suoi_nguon', 'm_san_moi'] });
  ok('chỉ số nét phụ: Suối Nguồn +60 HP, Săn Mồi không cộng chỉ số', st.maxHp === 60 && st.regenHp === 2.4 && Object.keys(st).length === 2, JSON.stringify(st));
}

// —— 2. setLoadout ——
{
  const { w, x } = pair();
  const hp0 = x.stats.maxHp;
  ok('spawnHero không tự gắn phù hiệu (giữ số đo cũ)', !x.emblem);
  ok('setLoadout ở tick 0: nhận', w.setLoadout(x, { emblem: { key: 'mai_rua', minors: ['m_suoi_nguon', 'm_buoc_nhe'] } }) === true && x.emblem.key === 'mai_rua');
  ok('nét phụ cộng vào chỉ số (+60 HP) và máu đầy', Math.round(x.stats.maxHp - hp0) === 60 && x.hp === x.stats.maxHp, `${hp0} → ${x.stats.maxHp}`);
  run(w, 1);
  ok('sau tick 0: từ chối, không đổi gì', w.setLoadout(x, { emblem: { key: 'tam_hoa' }, spellId: 'loa_mat' }) === false && x.emblem.key === 'mai_rua' && x.spell.id !== 'loa_mat');
  const w2 = createWorld({ map: DUEL, seed: 3 }), z = w2.spawnHero('hoa_ren', 0, { x: 1500, y: 1500 });
  w2.setLoadout(z, { emblem: false, charm: { name: '<b>x</b>', red: ['r_lua', 'b_mach', 7], blue: 'xx', gray: null } });
  ok('emblem:false → không phù hiệu; trang bùa rác được làm sạch', z.emblem === null && z.charm.red[0] === 'r_lua' && z.charm.red[1] === null && z.charm.blue.every((c) => c === null) && !/[<>]/.test(z.charm.name), JSON.stringify(z.charm.red));
  w2.setLoadout(z, { spellId: 'thu_hoach' });
  ok('1v1: phép chỉ dành cho 5v5 (Trừng Trị) bị từ chối', z.spell.id !== 'thu_hoach', z.spell.id);
  const a5 = createWorld({ map: ARENA, seed: 5 }), { teams } = setupTeams(a5, { heroId: 'hoa_ren', difficulty: 'normal' });
  ok('5v5: mọi bot có phù hiệu mặc định theo vai', teams.flat().filter((h) => !h.isPlayer).every((h) => h.emblem && h.emblem.key === (EMBLEM_BY_ROLE[HEROES[h.heroId].roles[0]] || EMBLEM_BY_ROLE.fighter).key));
}

// —— 3. Tam Hoả: 3 đòn riêng biệt trong 3s → nổ thêm, hồi 10s ——
{
  const { w, x, y } = pair('hoa_ren', 'thach_quy', { key: 'tam_hoa', minors: ['m_da_day', 'm_tinh_tao'] });
  run(w, 1); w.drainEvents();
  for (let i = 0; i < 2; i++) { dealDamage(w, x, y, 10, 'true', { basic: true }); run(w, 6); }
  ok('2 đòn: chưa nổ', !w.drainEvents().some((e) => e.type === 'emblem'));
  const hp = y.hp; dealDamage(w, x, y, 10, 'true', { basic: true });
  const ev = w.drainEvents().filter((e) => e.type === 'emblem');
  ok('đòn thứ 3: nổ đúng 1 lần, gây thêm sát thương', ev.length === 1 && ev[0].kind === 'triHit' && hp - y.hp > 10 + 20, `mất ${Math.round(hp - y.hp)}`);
  run(w, 6); for (let i = 0; i < 3; i++) { dealDamage(w, x, y, 10, 'true', { basic: true }); run(w, 6); }
  ok('đang hồi 10s: 3 đòn nữa không nổ', !w.drainEvents().some((e) => e.type === 'emblem'));
  const p2 = pair('hoa_ren', 'thach_quy', { key: 'tam_hoa', minors: ['m_da_day', 'm_tinh_tao'] }); run(p2.w, 1); p2.w.drainEvents();
  for (let i = 0; i < 3; i++) dealDamage(p2.w, p2.x, p2.y, 10, 'true', { basic: true });
  ok('3 đòn cùng một nhịp (cách < 0,1s) chỉ tính 1', !p2.w.drainEvents().some((e) => e.type === 'emblem'));
  const p3 = pair('hoa_ren', 'thach_quy', { key: 'tam_hoa', minors: ['m_da_day', 'm_tinh_tao'] }); run(p3.w, 1); p3.w.drainEvents();
  for (let i = 0; i < 3; i++) { dealDamage(p3.w, p3.x, p3.y, 10, 'true', { dot: true }); run(p3.w, 6); }
  ok('sát thương theo thời gian không tính', !p3.w.drainEvents().some((e) => e.type === 'emblem'));
}

// —— 4. Sóng Dồn: dồn tốc đánh, đủ 5 tầng thêm Công ——
{
  const { w, x, y } = pair('hoa_ren', 'thach_quy', { key: 'song_don', minors: ['m_suoi_nguon', 'm_buoc_nhe'] });
  run(w, 1); const as0 = x.stats.atkSpeed ?? x.stats.attackSpeed, atk0 = x.stats.atk;
  for (let i = 0; i < 5; i++) { dealDamage(w, x, y, 1, 'true', { basic: true }); run(w, 2); }
  const s = x.statuses.find((t) => t.id === 'em_ramp');
  ok('5 đòn thường: đủ 5 tầng (+25% tốc đánh, +8% Công)', s && Math.abs(s.atkSpeedPct - 0.25) < 1e-9 && s.atkPct === 0.08 && x.stats.atk > atk0, s && `${s.atkSpeedPct} ${s.atkPct}`);
  ok('đủ tầng: báo đúng 1 sự kiện', w.drainEvents().filter((e) => e.type === 'emblem').length === 1);
  dealDamage(w, x, y, 1, 'true', { slot: 's1' }); run(w, 2);
  ok('kỹ năng không cộng tầng', x.statuses.find((t) => t.id === 'em_ramp').atkSpeedPct === s.atkSpeedPct);
  run(w, 30 * 4 + 5);
  ok('4s không đánh: mất hết tầng', !x.statuses.some((t) => t.id === 'em_ramp' && t.until > w.tick), as0);
}

// —— 5. Mai Rùa: máu < 55% bị tướng đánh → khiên, hồi 22s ——
{
  const { w, x, y } = pair('thach_quy', 'hoa_ren', { key: 'mai_rua', minors: ['m_da_day', 'm_tinh_tao'] });
  run(w, 1);
  dealDamage(w, y, x, 10, 'true');
  ok('máu đầy: không khiên', shieldOf(x, 'em_guard') === 0);
  x.hp = x.stats.maxHp * 0.5; dealDamage(w, y, x, 10, 'true');
  const want = KEYSTONES.mai_rua.base + KEYSTONES.mai_rua.hpPct * x.stats.maxHp;
  ok('máu 50%: nhận khiên 60 + 7% HP tối đa', Math.abs(shieldOf(x, 'em_guard') - want) < 1, `${Math.round(shieldOf(x, 'em_guard'))} / ${Math.round(want)}`);
  run(w, 30 * 4); dealDamage(w, y, x, 10, 'true');
  ok('đang hồi: không khiên lần 2', shieldOf(x, 'em_guard') === 0);
}

// —— 6. Đèn Hộ Mệnh: kỹ năng trúng tướng địch → khiên cho đồng minh ít máu nhất ——
{
  const w = createWorld({ map: DUEL, seed: 4 });
  const s = w.spawnHero('nguyet_ha', 0, { x: 1500, y: DUEL.road.y }), m = w.spawnHero('thach_quy', 0, { x: 1600, y: DUEL.road.y + 200 }), f = w.spawnHero('hoa_ren', 1, { x: 1800, y: DUEL.road.y });
  w.setLoadout(s, { emblem: { key: 'den_ho_menh', minors: ['m_kien_cuong', 'm_tinh_tao'] } }); run(w, 1);
  m.hp = m.stats.maxHp * 0.3;
  dealDamage(w, s, f, 10, 'true', { basic: true });
  ok('đánh thường: không kích', shieldOf(m, 'em_ward') === 0);
  dealDamage(w, s, f, 10, 'true', { slot: 's2' });
  ok('kỹ năng trúng: đồng minh ít máu nhất nhận khiên, bản thân thì không', shieldOf(m, 'em_ward') > 40 && shieldOf(s, 'em_ward') === 0, Math.round(shieldOf(m, 'em_ward')));
}

// —— 7. Săn Mồi: +6% lên tướng dưới 40% máu ——
{
  const { w, x, y } = pair('hoa_ren', 'canh_dieu', { key: 'tam_hoa', minors: ['m_da_day', 'm_san_moi'] }); // Thạch Quy có nội tại chặn đòn — đo trên tướng không có
  run(w, 1); x.emState = { triCd: 1e9 };
  let hp = y.hp; dealDamage(w, x, y, 100, 'true'); const full = hp - y.hp;
  y.hp = y.stats.maxHp * 0.3; hp = y.hp; dealDamage(w, x, y, 100, 'true'); const low = hp - y.hp;
  ok('máu đầy 100 → 100; dưới 40% 100 → 106', Math.round(full) === 100 && Math.round(low) === 106, `${full} ${low}`);
}

// —— 8. tất định ——
{
  const fp = () => { const w = createWorld({ map: ARENA, seed: 77 }); setupTeams(w, { heroId: 'hoa_ren', difficulty: 'normal' }); run(w, 30 * 90); return w.entities.filter((e) => e.kind === 'hero').map((e) => `${Math.round(e.hp)}:${Math.round(e.pos.x)}`).join(','); };
  ok('cùng seed + cùng bộ: cùng trận (90s 5v5)', fp() === fp());
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
