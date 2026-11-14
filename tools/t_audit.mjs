// Các lỗi lối chơi bắt được ở đợt kiểm toán 14/11/2026 (docs/KIEM_TOAN.md Phần V) — mỗi lỗi một bài thử, cộng một trận 5v5 toàn máy chạy
// kèm bộ dò "bất biến" mỗi tick (trạng thái không thể có: máu vượt tối đa, số NaN, tướng máy kẹt tường, khống chế không hết…).
// Dùng: node tools/t_audit.mjs [phút=9] [seed=3]
import { createWorld } from '../src/sim/world.js';
import { ARENA, DUEL } from '../src/data/maps.js';
import { setupTeams } from '../src/sim/lineup.js';
import { ALPHA } from '../src/data/heroes/index.js';
import { ITEMS } from '../src/data/items.js';
import { ECON } from '../src/data/economy.js';
import { gainXp } from '../src/sim/economy.js';
import { clampToMap } from '../src/sim/util.js';
import { isRooted, isHardCC } from '../src/sim/status.js';
import { maxSkillLevel } from '../src/sim/stats.js';
import { findPath, lineClear, nearestFree } from '../src/sim/pathfind.js';
import { buildNavGrid, CELL } from '../src/sim/navgrid.js';

const minutes = +(process.argv[2] || 9), seed = +(process.argv[3] || 3);
let fail = 0; const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };

// —— 1. lên cấp: máu tăng đúng bằng phần máu tối đa tăng, không vượt máu tối đa ——
{
  const w = createWorld({ map: DUEL, seed: 1 }), h = w.spawnHero(ALPHA[0], 0, { x: 2000, y: DUEL.road.y });
  w.update(1);
  const max1 = h.stats.maxHp; h.hp = max1; gainXp(w, h, ECON.xpNeed(1));
  ok('lên cấp lúc đầy máu: vẫn đầy, không vượt máu tối đa', h.level === 2 && h.stats.maxHp > max1 && h.hp === h.stats.maxHp, `cấp ${h.level}: ${h.hp} / ${h.stats.maxHp}`);
  const max2 = h.stats.maxHp; h.hp = max2 / 2; gainXp(w, h, ECON.xpNeed(2));
  const up = h.stats.maxHp - max2;
  ok('lên cấp lúc nửa máu: hồi đúng bằng phần máu tối đa tăng (không cộng hai lần)', h.level === 3 && Math.abs(h.hp - (max2 / 2 + up)) < 1e-6, `+${(h.hp - max2 / 2).toFixed(1)} (máu tối đa +${up.toFixed(1)})`);
  h.hp = h.stats.maxHp - 1; gainXp(w, h, 1e6);
  ok('lên nhiều cấp một lúc: tới cấp tối đa, máu không vượt tối đa', h.level === ECON.maxLevel && h.hp <= h.stats.maxHp + 1e-9);
}

// —— 2. tìm đường: xuất phát trong hốc tường / đích xa / đích sát vách ——
const nav = buildNavGrid(ARENA);
/** Đi thật theo đường (va chạm tường như tướng): tới điểm kế khi còn cách < 90, hết đoạn dở dang thì tìm tiếp. Trả khoảng cách còn lại tới đích. */
function walk(from, to, { r = 40, speed = 13, ticks = 4000 } = {}) {
  const p = { ...from }; let route = null, i = 0, plans = 0, still = 0;
  for (let t = 0; t < ticks; t++) {
    if (Math.hypot(to.x - p.x, to.y - p.y) < 120) break;
    if (!route || (i >= route.length - 1 && Math.hypot(route[i].x - p.x, route[i].y - p.y) < 130)) { route = findPath(nav, p, to, r); i = 0; plans++; if (!route) return { left: Infinity, plans, at: p }; }
    while (i < route.length - 1 && Math.hypot(route[i].x - p.x, route[i].y - p.y) < 90) i++;
    const g = route[i], dx = g.x - p.x, dy = g.y - p.y, l = Math.hypot(dx, dy) || 1, x0 = p.x, y0 = p.y;
    p.x += (dx / l) * Math.min(speed, l); p.y += (dy / l) * Math.min(speed, l); clampToMap(ARENA, p, r); // một bước mỗi tick như sim/movement.js
    still = Math.hypot(p.x - x0, p.y - y0) < 1 ? still + 1 : 0; if (still > 60) return { left: Math.hypot(to.x - p.x, to.y - p.y), plans, stuck: true, at: { x: p.x | 0, y: p.y | 0 } };
  }
  return { left: Math.hypot(to.x - p.x, to.y - p.y), plans, at: { x: p.x | 0, y: p.y | 0 } };
}
// các hốc tường tướng máy từng kẹt (đo ở trận 5v5 seed 2 / 3 / 4) + điểm đối xứng qua tâm bản đồ
const NOTCH = [[13627, 14782, 9199, 10000], [13742, 10559, 11368, 7831], [5639, 4493, 9600, 9600]];
for (const [x, y, gx, gy] of [...NOTCH, ...NOTCH.map(([a, b, c, d]) => [ARENA.w - a, ARENA.h - b, ARENA.w - c, ARENA.h - d])]) {
  const from = clampToMap(ARENA, { x, y }, 40), to = { x: gx, y: gy };
  const pts = findPath(nav, from, to, 40), res = walk(from, to);
  ok(`hốc tường (${x}, ${y}) → (${gx}, ${gy}): có đường${nav.isBlocked(from.x, from.y) ? ' (ô xuất phát là "tường" trên lưới)' : ''}, đi thật tới được đích`, !!pts?.length && res.left < 130, `còn cách ${res.left.toFixed(0)}, tìm ${res.plans} lần${res.stuck ? ' — KẸT tại ' + JSON.stringify(res.at) : ''}`);
}
{
  const a = { x: 3000, y: 3000 }, b = { x: 16200, y: 16200 }, far = findPath(nav, { x: 9197, y: 10049 }, { x: 13410, y: 9450 });
  ok('đích xa quá ngân sách tìm đường: trả đoạn đầu (partial) đưa tới gần đích hơn, không bỏ cuộc', !!far?.length && (far.partial ? Math.hypot(far[far.length - 1].x - 13410, far[far.length - 1].y - 9450) < Math.hypot(9197 - 13410, 10049 - 9450) - 300 : true), far ? `${far.length} điểm${far.partial ? ', dở dang' : ''}` : 'null');
  const res = walk(a, b, { ticks: 6000 });
  ok('đi chéo cả bản đồ (góc Xanh → góc Đỏ) qua nhiều lượt tìm đường: tới đích', res.left < 130, `còn cách ${res.left.toFixed(0)}, tìm ${res.plans} lần`);
  // đích nằm trong tường: tới ô đi được gần đó
  const seg = ARENA.walls.segs.find((s) => (s.w ?? ARENA.walls.thickness) >= 300), mid = { x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 };
  const start = { x: mid.x + 900, y: mid.y + 900 }; clampToMap(ARENA, start, 40);
  const pw = nav.isBlocked(start.x, start.y) ? null : findPath(nav, start, mid, 40);
  ok('đích nằm giữa một bức tường: đường dẫn tới ô đi được sát đó (không trả null)', nav.isBlocked(mid.x, mid.y) && (!!pw?.length ? !nav.isBlocked(pw[pw.length - 1].x, pw[pw.length - 1].y) && Math.hypot(pw[pw.length - 1].x - mid.x, pw[pw.length - 1].y - mid.y) < 6 * CELL : nav.isBlocked(start.x, start.y)), pw ? `cuối đường cách tâm tường ${Math.hypot(pw[pw.length - 1].x - mid.x, pw[pw.length - 1].y - mid.y).toFixed(0)}` : 'điểm thử nằm trong tường');
  ok('nearestFree: ô đi được thì trả chính nó; ngoài bản đồ thì -1 hoặc ô sát biên', nearestFree(nav, 9600, 9600) === Math.floor(9600 / CELL) * nav.cols + Math.floor(9600 / CELL) && nearestFree(nav, -5000, -5000) === -1);
  ok('đường thẳng thông thoáng: một điểm (không tìm kiếm)', lineClear(nav, { x: 9000, y: 9600 }, { x: 9600, y: 9600 }) && findPath(nav, { x: 9000, y: 9600 }, { x: 9600, y: 9600 }).length === 1);
}

// —— 3. trận 5v5 toàn máy + bộ dò bất biến mỗi tick ——
{
  const w = createWorld({ map: ARENA, seed });
  const { player } = setupTeams(w, { heroId: ALPHA[seed % ALPHA.length], difficulty: 'normal' }); w.addBot(player, 'normal', player.laneIdx);
  const bad = new Map(), flag = (k, msg) => { const o = bad.get(k) || { n: 0, msg, t: w.tick }; o.n++; bad.set(k, o); };
  const stuck = new Map(), cc = new Map(), seenProj = new Map(); let err = null, maxPending = 0, levelUps = 0;
  for (let t = 1; t <= minutes * 1800 && !w.over; t++) {
    try { w.update(t); } catch (e) { err = e; break; }
    for (const ev of w.events) if (ev.type === 'levelup') levelUps++;
    w.events.length = 0; maxPending = Math.max(maxPending, w.pending.length);
    for (const p of w.projectiles) { if (!seenProj.has(p.id)) seenProj.set(p.id, t); else if (t - seenProj.get(p.id) > 300) flag('đạn sống quá 10 giây', p.kind); }
    if (t % 600 === 0) for (const [id, t0] of seenProj) if (t - t0 > 900) seenProj.delete(id);
    for (const e of w.entities) {
      const who = e.heroId || e.minionType || e.monsterType || e.sid || e.kind;
      if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y) || !Number.isFinite(e.hp)) flag('NaN vị trí / máu', who);
      if (e.hp > e.stats.maxHp + 0.5) flag('máu vượt máu tối đa', `${who} ${e.hp.toFixed(0)} / ${e.stats.maxHp.toFixed(0)}`);
      if (e.alive && e.hp <= 0 && !e.noTarget) flag('còn sống mà máu ≤ 0', who);
      if (e.kind !== 'hero') continue;
      if (!Number.isFinite(e.gold) || e.gold < -0.01 || !Number.isFinite(e.mana) || e.mana < -0.01 || e.mana > e.stats.maxMana + 0.5) flag('vàng / năng lượng sai', `${who} vàng ${e.gold} mana ${e.mana}`);
      if (e.level > ECON.maxLevel || e.skillPoints < 0 || ['s1', 's2', 's3'].some((s) => e.skillLevels[s] > maxSkillLevel(s, e.level) || !Number.isFinite(e.cooldowns[s]))) flag('cấp / điểm kỹ năng / hồi chiêu sai', who);
      if (e.items.some((i) => i && !ITEMS[i]) || e.items.filter((i) => i && ITEMS[i].active).length > 2) flag('túi đồ sai', `${who} ${e.items}`);
      if (!e.alive) { if (!(e.respawnTick > t - 2) || e.respawnTick - t > 30 * 90 || e.statuses.length || e.shields.length || e.dash || e.recall) flag('tướng chết còn trạng thái / không có giờ hồi sinh', who); continue; }
      if (isHardCC(e)) { const s0 = cc.get(e.id) ?? t; cc.set(e.id, s0); if (t - s0 > 30 * 8) flag('khống chế cứng liền hơn 8 giây', who); } else cc.delete(e.id);
      if (e.statuses.some((s) => s.kind === 'suppress') && !w.suppressions.some((l) => l.alive && l.target === e.id)) { const n = (e._orph || 0) + 1; e._orph = n; if (n > 12) flag('bị áp chế mà xích đã mất', who); } else e._orph = 0;
      const want = Math.hypot(e.moveDir.x, e.moveDir.y) > 0.1 && !isRooted(e) && !e.dash && !e.forced && t >= (e.castUntil || 0) && t >= (e.swingUntil || 0), st = stuck.get(e.id) || { x: e.pos.x, y: e.pos.y, n: 0 };
      if (want && Math.hypot(e.pos.x - st.x, e.pos.y - st.y) < 12) { if (++st.n === 30 * 6) flag('tướng máy muốn đi mà đứng yên 6 giây (kẹt tường)', `${who} tại ${e.pos.x | 0},${e.pos.y | 0}`); } else { st.x = e.pos.x; st.y = e.pos.y; st.n = 0; }
      stuck.set(e.id, st);
    }
  }
  ok(`trận 5v5 toàn máy seed ${seed}, ${(w.tick / 1800).toFixed(1)} phút: mô phỏng không văng`, !err, err ? String(err.stack).split('\n').slice(0, 3).join(' | ') : `${levelUps} lần lên cấp, hàng chờ hẹn giờ tối đa ${maxPending}`);
  ok('không có trạng thái "không thể có" nào trong cả trận', !bad.size, [...bad].map(([k, o]) => `${k} ×${o.n} (tick ${o.t}: ${o.msg})`).join(' ; '));
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
