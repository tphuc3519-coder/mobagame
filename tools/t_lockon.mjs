// Kiểm thử chiêu khoá mục tiêu: mục tiêu chỉ định qua aim.id (HUD khoá / xem trước / bot), đạn khoá mục tiêu trượt khi mục tiêu thành không
// thể chọn giữa đường (Sương Đông), bot gửi đúng id mục tiêu đã chọn. node tools/t_lockon.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { HEROES } from '../src/data/heroes/index.js';
import { castSkill } from '../src/sim/skills.js';
import { pickSkillTarget } from '../src/sim/skillTypes.js';
import { applyStatus } from '../src/sim/status.js';
import { createBot } from '../src/ai/heroBot.js';
import { trySkill } from '../src/ai/botSkills.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra ? '  ' + extra : '')); if (!cond) fail++; };

function world() {
  const w = createWorld({ map: DUEL, seed: 7, structures: false, waves: false });
  let t = 0; const evs = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { w.update(++t); evs.push(...w.drainEvents()); } };
  return { w, step, evs };
}
const hero = (w, id, team, x, y) => { const e = w.spawnHero(id, team, { x, y }); w.debug.bare(e); for (const s of ['s1', 's2', 's3']) e.skillLevels[s] = 1; return e; };
const clue = (w, t, p, n = 2) => t.statuses.push({ id: 'manh_moi_' + p.id, kind: 'mark', n, src: p.id, until: w.tick + 300 });

{ // 1: chọn mục tiêu theo aim.id
  const { w } = world();
  const p = hero(w, 'ba_nam', 0, 1000, 1200);
  const a = hero(w, 'cau_may', 1, 1500, 1200), b = hero(w, 'phu_dong', 1, 1250, 1600), far = hero(w, 'canh_dieu', 1, 1000, 2100), st = hero(w, 'kep_cheo', 1, 1300, 1000), hid = hero(w, 'tieu_anh', 1, 1300, 1400);
  const S = HEROES.ba_nam.skills.s3, dir = { x: 1, y: 0 };
  applyStatus(w, st, { status: 'stasis', duration: 2 }, st); hid.seenBy = { 0: false, 1: true };
  ok('không aim.id: chọn tướng thẳng hướng kéo', pickSkillTarget(w, p, S, dir) === a);
  ok('aim.id tướng lệch hướng (trong tầm): chọn đúng nó', pickSkillTarget(w, p, S, { ...dir, id: b.id }) === b);
  ok('aim.id ngoài tầm → chọn như thường', pickSkillTarget(w, p, S, { ...dir, id: far.id }) === a);
  ok('aim.id đang Sương Đông → chọn như thường', pickSkillTarget(w, p, S, { ...dir, id: st.id }) === a);
  ok('aim.id đang khuất (sương mù) → chọn như thường', pickSkillTarget(w, p, S, { ...dir, id: hid.id }) === a);
  ok('aim.id là đồng đội → chọn như thường', pickSkillTarget(w, p, S, { ...dir, id: p.id }) === a);
  const q = hero(w, 'trang_nhi', 0, 1000, 1250), T3 = HEROES.trang_nhi.skills.s3;
  ok('chiêu có điều kiện (Manh Mối): aim.id không đủ điều kiện → không có mục tiêu', pickSkillTarget(w, q, T3, { ...dir, id: b.id }) === null);
  clue(w, a, q);
  ok('chiêu có điều kiện: aim.id không đủ → rơi về tướng đủ điều kiện', pickSkillTarget(w, q, T3, { ...dir, id: b.id }) === a);
  clue(w, b, q);
  ok('chiêu có điều kiện: aim.id đủ điều kiện → đúng nó', pickSkillTarget(w, q, T3, { ...dir, id: b.id }) === b);
  const ms = hero(w, 'cau_may', 1, 1150, 1180); ms.isHero = false; // giả làm lính: heroOnly bỏ qua
  ok('heroOnly: aim.id không phải tướng → chọn tướng như thường', pickSkillTarget(w, q, T3, { ...dir, id: ms.id }) === a);
}
{ // 2: castSkill với aim.id
  const { w, step, evs } = world();
  const p = hero(w, 'ba_nam', 0, 1000, 1200); hero(w, 'cau_may', 1, 1500, 1200); const b = hero(w, 'phu_dong', 1, 1250, 1600);
  const r = castSkill(w, p, 's3', { x: 1, y: 0, id: b.id }); step(1);
  ok('castSkill khoá đúng tướng chỉ định (sự kiện cast.target)', r.ok && evs.some((e) => e.type === 'cast' && e.id === p.id && e.target === b.id));
  step(20);
  ok('Dép Bay lao vào đúng tướng chỉ định', b.hp < b.stats.maxHp);
}
{ // 3: đạn khoá mục tiêu trượt khi mục tiêu vào Sương Đông giữa đường
  const { w, step, evs } = world();
  const p = hero(w, 'trang_nhi', 0, 1000, 1200), d = hero(w, 'cau_may', 1, 1700, 1200);
  clue(w, d, p);
  const r = castSkill(w, p, 's3', { x: 1, y: 0 }); step(3);
  applyStatus(w, d, { status: 'stasis', duration: 2 }, d); step(25);
  ok('đạn khoá mục tiêu: Sương Đông giữa đường → trượt, không sát thương', r.ok && d.hp === d.stats.maxHp && !evs.some((e) => e.type === 'damage' && e.id === d.id && e.slot === 's3'));
  ok('đạn khoá mục tiêu trượt: không mất Manh Mối (onSkillMiss)', d.statuses.some((s) => s.id === 'manh_moi_' + p.id));
  ok('Sương Đông: choáng của chiêu không bám', !d.statuses.some((s) => s.kind === 'stun'));
}
{ // 4: bot gửi đúng id mục tiêu
  const { w } = world();
  const p = hero(w, 'trang_nhi', 0, 1000, 1200), d = hero(w, 'cau_may', 1, 1600, 1200); hero(w, 'phu_dong', 1, 1580, 1260);
  clue(w, d, p);
  const bot = createBot(w, p); bot.next = 1e9;
  const sent = []; const cmd = w.command; w.command = (id, c) => { if (id === p.id) sent.push(c); cmd(id, c); };
  const r = trySkill(bot, 's3', d, 'fight');
  ok('bot: lệnh chiêu khoá mục tiêu mang aim.id đúng mục tiêu', r && sent.some((c) => c.type === 'cast' && c.slot === 's3' && c.aim?.id === d.id));
}

console.log(fail ? `${fail} mục LỖI` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
