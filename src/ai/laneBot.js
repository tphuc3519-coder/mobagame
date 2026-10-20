// Bot đội 5v5 (06 §4.3): mỗi bot có một vị trí (Đền / Giữa / Sông / Đi rừng / Trợ thủ). Trạng thái LANE / FIGHT / RETREAT / RECALL / HEAL,
// xuất Command như người chơi. Vị trí tính theo quãng s dọc đường (lanes.js) nên dùng được cho đường cong; có tính số lượng đồng đội khi
// giao tranh. Khi rảnh (LANE) thì theo lệnh của não đội (teamBrain.js: thủ trụ, mục tiêu lớn, dồn đường), không có lệnh thì làm việc của
// vị trí: đi rừng dọn trại phía mình + gank, trợ thủ kèm xạ thủ; mọi bot né chiêu theo độ khó (dodge.js).
import { DIFFICULTY, BOT } from '../data/ai.js';
import { mulberry32 } from '../core/rng.js';
import { T, dist, norm } from '../sim/util.js';
import { mitigate } from '../sim/damage.js';
import { isTargetable } from '../sim/targeting.js';
import { canSee } from '../sim/vision.js';
import { quickBuys } from '../sim/inventory.js';
import { lanePath, project, pointAt } from '../sim/lanes.js';
import { findPath, lineClear } from '../sim/pathfind.js';
import { minionsOf, towersOf, fountainOf, hp01, towerCovering, tankedBy, burst, canKill } from './perception.js';
import { combo, survival, useItems } from './botSkills.js';
import { isLocked } from '../sim/status.js';
import { dodgeStep } from './dodge.js';
import { orderOf } from './teamBrain.js';
import { MONSTERS } from '../data/jungle.js';

export function createLaneBot(world, e, difficulty = 'normal', laneIdx = 0) {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const bot = { world, e, diff, cfg: BOT, rng: mulberry32(0x9e3779b1 ^ (e.id * 7919) ^ world.seed), state: 'LANE', next: e.id % 7, stuck: 0, lastPos: { ...e.pos }, laneIdx, path: lanePath(world.map, laneIdx, e.team) };
  bot.home = () => fountainOf(world, e.team).pos;
  bot.homeDir = () => norm(bot.home().x - e.pos.x, bot.home().y - e.pos.y);
  e.bot = bot;
  return bot;
}

/** Lách quanh công trình chắn đường thẳng: đi tới điểm bên hông. */
function steer(bot, p) {
  const { world, e } = bot;
  for (const s of world.entities) {
    if (!s.structure || !s.alive || s.noTarget) continue;
    const dx = p.x - e.pos.x, dy = p.y - e.pos.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((s.pos.x - e.pos.x) * dx + (s.pos.y - e.pos.y) * dy) / L2));
    const cx = e.pos.x + dx * t, cy = e.pos.y + dy * t, clear = s.radius * 0.8 + e.radius + 25;
    if (t > 0 && t < 1 && Math.hypot(cx - s.pos.x, cy - s.pos.y) < clear && dist(p, s.pos) > clear) {
      const L = Math.sqrt(L2), nx = -dy / L, ny = dx / L, side = (s.pos.x - e.pos.x) * nx + (s.pos.y - e.pos.y) * ny > 0 ? -1 : 1;
      return { x: s.pos.x + nx * side * (clear + 30), y: s.pos.y + ny * side * (clear + 30) };
    }
  }
  return p;
}
/** Đi tới p0. Bot đi thẳng (không né tường); kẹt ~0,5 giây mà đường thẳng tới đích bị tường chắn (góc bệ đá, sau bệ chắn đường) thì tìm
 *  đường vòng trên lưới (sim/pathfind.js) và đi theo các điểm tới khi thấy thẳng tới đích, đích đổi xa hoặc hết 8 giây. */
const move = (bot, p0, tol = 30, plan = false) => {
  const { e, world } = bot, nav = world.nav;
  if (bot.route && (world.tick > bot.route.until || dist(bot.route.dest, p0) > 350)) bot.route = null;
  // plan: đích trong rừng / hang mục tiêu lớn (có vách bao) — tìm đường ngay khi đường thẳng bị chắn, không đợi kẹt (trượt dọc vách thì không bị coi là kẹt)
  if (!bot.route && nav && (bot.stuck >= T(0.5) || (plan && dist(e.pos, p0) > 250)) && !lineClear(nav, e.pos, p0)) {
    const pts = findPath(nav, e.pos, p0); bot.stuck = 0;
    if (pts?.length) bot.route = { pts, i: 0, dest: { x: p0.x, y: p0.y }, until: world.tick + T(8) };
  }
  let tgt = p0;
  if (bot.route) {
    const r = bot.route;
    while (r.i < r.pts.length - 1 && dist(e.pos, r.pts[r.i]) < 90) r.i++;
    if (lineClear(nav, e.pos, p0)) bot.route = null; else { tgt = r.pts[r.i]; if (r.i < r.pts.length - 1) tol = Math.min(tol, 30); } // điểm trung gian: đi tới sát (khoảng dừng của đích cuối không áp cho điểm giữa đường)
  }
  const p = steer(bot, tgt), dx = p.x - e.pos.x, dy = p.y - e.pos.y, l = Math.hypot(dx, dy);
  world.command(e.id, { type: 'move', dir: l > tol ? { x: dx / l, y: dy / l } : { x: 0, y: 0 } });
  return l;
};
const attack = (bot, target) => bot.world.command(bot.e.id, { type: 'attack', on: !!target, preferTarget: target?.id ?? null });

/** Đi tới vị trí trên đường ở quãng s: nếu lệch đường quá xa thì về đường trước (tránh cắt qua tường). */
function goLane(bot, s, tol = 40, path = bot.path) {
  const { e } = bot, pr = project(path, e.pos), tgt = pointAt(path, s);
  if (pr.d > path.width * 0.9 && Math.abs(pr.s - s) > 400) return move(bot, pointAt(path, pr.s + Math.sign(s - pr.s) * 250), tol);
  return move(bot, tgt, tol);
}

/** Chọn lính để đánh: ưu tiên lính kết liễu được (theo tỉ lệ độ khó), sau đó lính ít máu nhất trong tầm. */
function pickMinion(bot, foes) {
  const { e, rng, diff } = bot;
  if (!foes.length) return null;
  const reach = e.stats.range + 250, near = foes.filter((m) => dist(m.pos, e.pos) <= reach);
  const lethal = near.filter((m) => m.hp <= mitigate(e, m, e.stats.atk, 'physical') * 1.05).sort((a, b) => a.hp - b.hp)[0];
  if (lethal && rng.next() < diff.lastHit) return lethal;
  if (near.length && rng.next() > diff.lastHit) return near[Math.floor(rng.next() * near.length)];
  return near.sort((a, b) => a.hp - b.hp)[0] || foes.reduce((b, m) => (!b || dist(m.pos, e.pos) < dist(b.pos, e.pos) ? m : b), null);
}

const power = (h) => (0.25 + hp01(h)) * (1 + h.level * 0.12) * (h.stats.atk + h.stats.ap * 0.8 + 120) / 200;

function think(bot) {
  const { world, e, cfg, path } = bot;
  if (!e.alive) { bot.state = 'DEAD'; return; }
  const heroesOf = (team) => world.entities.filter((h) => h.kind === 'hero' && h.alive && h.team === team);
  const prio = (f) => dist(f.pos, e.pos) - (isLocked(f) ? 500 : 0) - (f.channel ? 300 : 0); // địch đang bị áp chế / đang niệm giữ xích: đánh trước
  const foes = heroesOf(1 - e.team).filter((f) => isTargetable(e, f) && canSee(e.team, f) && dist(f.pos, e.pos) < 1500).sort((a, b) => prio(a) - prio(b));
  const allies = heroesOf(e.team).filter((a) => a !== e && dist(a.pos, e.pos) < 1300);
  const foe = foes[0] || null, fd = foe ? dist(foe.pos, e.pos) : Infinity, h = hp01(e);
  const home = bot.home(), atHome = dist(e.pos, home) < 550, me = project(path, e.pos);

  const qb = quickBuys(e, 1)[0]; if (qb?.ok) world.command(e.id, { type: 'buy', item: qb.id });
  if (survival(bot, foe)) return;
  if (e.channel && world.tick < e.channel.until) { attack(bot, null); return; } // giữ xích / dây bóng
  if (!e.recall && dodgeStep(bot, move)) { attack(bot, foe && fd < e.stats.range + 150 ? foe : null); return; } // né chiêu: bước ngang, vẫn đánh nếu địch trong tầm

  const foesNear = foes.filter((f) => dist(f.pos, e.pos) < 1000);
  const myPow = power(e) + allies.reduce((a, b) => a + power(b), 0), foePow = foesNear.reduce((a, b) => a + power(b), 0) * (foesNear.length ? 1 + 0.1 * (foes.length - foesNear.length) : 1);

  if (e.recall) { if (fd < 700) bot.state = 'RETREAT'; else { move(bot, e.pos); attack(bot, null); return; } }
  if (atHome && (h < 0.92 || e.mana < e.stats.maxMana * 0.8) && fd > 1200) { bot.state = 'HEAL'; move(bot, home, 60); attack(bot, null); return; }

  const coverMe = towerCovering(world, e.team, e.pos, 30);
  const underFire = coverMe && !tankedBy(world, coverMe, e.team) && (coverMe.streakTarget === e.id || coverMe.aggro === e.id);
  const killable = foe && canKill(world, e, foe);
  const foeCovered = foe && towerCovering(world, e.team, foe.pos, 0);

  let st = 'LANE';
  const outnumbered = foesNear.length >= 2 && foePow > myPow * 1.35;
  if ((h < cfg.retreatHp && fd < 1200 && !killable) || underFire || outnumbered) st = 'RETREAT';
  else if (fd > cfg.safeRange && !atHome && (h < cfg.recallHp || e.mana < e.stats.maxMana * cfg.recallMana || e.gold > 2400)) st = 'RECALL';
  else if (foe && fd < cfg.fightRange + 100 && (killable || (myPow >= foePow * 0.9 && h > 0.45)) && (!foeCovered || (killable && h > 0.45) || myPow > foePow * 2)) st = 'FIGHT';
  if (bot.state === 'FIGHT' && st === 'LANE' && foe && fd < cfg.fightRange && myPow >= foePow * 0.9) st = 'FIGHT'; // quán tính
  bot.state = st;

  if (st === 'RETREAT') {
    // lùi dọc đường về phía nhà (đi rừng / trợ thủ: về trụ mình gần nhất ở phía nhà); máu thấp thì về thẳng Suối Đèn
    const lane = e.role !== 'jungle' && project(path, e.pos).d < path.width * 1.5;
    const safe = towersOf(world, e.team).filter((t) => dist(t.pos, home) < dist(e.pos, home) - 300).sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0];
    const back = h <= 0.18 ? home : lane ? pointAt(path, Math.max(0, me.s - 1100)) : safe ? safe.pos : home;
    move(bot, dist(back, home) < 700 ? home : back);
    attack(bot, null);
    if (foe && fd < 450) combo(bot, foe, 'escape');
    return;
  }
  if (st === 'RECALL') { move(bot, e.pos); attack(bot, null); world.command(e.id, { type: 'recall' }); return; }
  if (st === 'FIGHT') {
    const pr = e.data.ai?.preferredRange ?? e.stats.range, melee = e.stats.range < 250;
    const kite = !melee && foe.stats.range < 250 && fd < cfg.kiteDist;
    if (kite) move(bot, { x: e.pos.x - (foe.pos.x - e.pos.x), y: e.pos.y - (foe.pos.y - e.pos.y) });
    else if (fd > pr - 30) move(bot, foe.pos, 10); else move(bot, e.pos);
    attack(bot, foe);
    if (!useItems(bot, foe, 'fight')) combo(bot, foe, 'fight');
    return;
  }

  // rảnh: lệnh não đội trước, rồi việc riêng của vị trí
  const order = orderOf(world, e);
  if (order && order.kind !== 'push' && doOrder(bot, order, foe, fd)) return;
  if (!order && e.role === 'jungle' && jungle(bot, h)) return;
  if (!order && e.role === 'support' && support(bot, foe, fd)) return;
  const push = order?.kind === 'push';
  lanePlay(bot, push ? order.lane : bot.laneIdx, { foe, fd, h, allies, push });
}

/** Đánh đường `laneIdx`: đứng sau lính mình, kết liễu lính, đánh trụ khi lính mình đỡ, trao đổi chiêu khi có dịp. */
function lanePlay(bot, laneIdx, { foe, fd, h, allies, push = false }) {
  const { world, e, cfg } = bot;
  const path = laneIdx === bot.laneIdx ? bot.path : lanePath(world.map, laneIdx, e.team);
  const mine = minionsOf(world, e.team).filter((m) => m.lane === laneIdx), theirs = minionsOf(world, 1 - e.team).filter((m) => m.lane === laneIdx && canSee(e.team, m));
  const foeCovered = foe && towerCovering(world, e.team, foe.pos, 0);
  const frontS = mine.reduce((m, x) => Math.max(m, project(path, x.pos).s), -1);
  const enemyStructs = towersOf(world, 1 - e.team).filter((t) => !t.invulnerable);
  const tower = enemyStructs.map((t) => ({ t, p: project(path, t.pos) })).filter((o) => o.p.d < path.width + 300).sort((a, b) => a.p.s - b.p.s)[0]?.t || null;
  const frontEnemyS = theirs.reduce((m, x) => Math.min(m, project(path, x.pos).s), Infinity);
  const target = pickMinion(bot, theirs.filter((m) => project(path, m.pos).s < (frontS < 0 ? Infinity : frontS) + 900));
  let s;
  if (target) s = project(path, target.pos).s - Math.max(80, e.stats.range * 0.8);
  else if (frontS >= 0) s = frontS - Math.max(150, e.stats.range * cfg.holdBack);
  else if (push && tower) s = project(path, tower.pos).s - tower.stats.range - cfg.towerMargin - 60; // đang dồn đường: chờ lính ngay ngoài tầm trụ địch
  else { // chưa có lính (đầu trận hoặc lính chết hết): đứng gần trụ ngoài cùng còn sống của mình trên đường
    const own = towersOf(world, e.team).map((t) => ({ t, p: project(path, t.pos) })).filter((o) => o.p.d < path.width + 300 && o.t.kind === 'tower').sort((a, b) => b.p.s - a.p.s)[0];
    s = own ? own.p.s + 260 : path.length * 0.08;
  }
  s = Math.min(s, frontEnemyS - 60);
  // không bước vào tầm trụ địch khi lính mình chưa đỡ
  let spot = pointAt(path, s);
  const cov = towerCovering(world, e.team, spot, cfg.towerMargin);
  if (cov && !tankedBy(world, cov, e.team)) { const cs = project(path, cov.pos).s; spot = pointAt(path, Math.min(s, cs - cov.stats.range - cfg.towerMargin - 40)); s = project(path, spot).s; }
  let hit = target;
  const defenders = tower ? theirs.filter((m) => dist(m.pos, tower.pos) < tower.stats.range + 100).length : 0;
  const alone = !foe || fd > 1500;
  const pushing = alone || (defenders <= 1 && h > 0.45) || (allies.length >= 2 && h > 0.6) || (world.tick > 30 * 60 * 14 && h > 0.6);
  const dive = push && allies.length >= 2 && h > 0.5 && (alone || tower?.hp < tower?.stats.maxHp * 0.45); // dồn đường đông người: đánh trụ cả khi lính chưa đỡ (trụ yếu / địch vắng)
  if ((!target || pushing || push) && tower && (tankedBy(world, tower, e.team) || (alone && h > 0.5 && allies.length >= 1) || dive) && dist(tower.pos, e.pos) < tower.stats.range + 400) { hit = tower; spot = { x: tower.pos.x, y: tower.pos.y }; const st2 = project(path, tower.pos).s; spot = pointAt(path, st2 - Math.max(e.stats.range * 0.85, tower.radius + 90)); }
  goLane(bot, project(path, spot).s, 40, path);
  attack(bot, hit);
  if (hit && hit === tower && e.mana > e.stats.maxMana * 0.3) combo(bot, tower, 'farm');
  else if (target && (alone || e.mana > e.stats.maxMana * 0.4) && theirs.filter((m) => dist(m.pos, target.pos) < 320).length >= 2) combo(bot, target, 'farm');
  if (foe && !foeCovered && fd < 800 && burst(world, e, foe) >= foe.hp * 0.25 && bot.rng.next() < bot.diff.trade) combo(bot, foe, 'trade');
}

const aliveMembers = (world, camp) => camp.alive.map((id) => world.byId(id)).filter((m) => m && m.alive);

/** Làm theo lệnh não đội. Trả false nếu lệnh không còn ý nghĩa (để bot làm việc thường). */
function doOrder(bot, order, foe, fd) {
  const { world, e } = bot;
  if (order.kind === 'defend') {
    const s = world.byId(order.id); if (!s?.alive) return false;
    const home = bot.home(), d = dist(home, s.pos) || 1, at = { x: s.pos.x + ((home.x - s.pos.x) / d) * 220, y: s.pos.y + ((home.y - s.pos.y) / d) * 220 };
    if (foe && fd < 850 && dist(foe.pos, s.pos) < s.stats.range + 300) { move(bot, foe.pos, e.stats.range * 0.8); attack(bot, foe); combo(bot, foe, 'fight'); return true; }
    move(bot, at, 80, true); world.command(e.id, { type: 'attack', on: dist(e.pos, at) < 600, preferTarget: null });
    return true;
  }
  if (order.kind === 'boss') {
    const camp = world.camps?.find((c) => c.id === order.camp), ms = camp ? aliveMembers(world, camp) : [];
    if (!ms.length) return false;
    const m = ms.sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0], gap = dist(m.pos, e.pos) - m.radius;
    if (foe && fd < 700) return false; // địch tới cướp: giao tranh trước
    if (gap > e.stats.range) move(bot, m.pos, Math.max(60, m.radius + e.stats.range * 0.7), true); else move(bot, e.pos);
    attack(bot, m);
    if (gap < 650 && e.mana > e.stats.maxMana * 0.25) combo(bot, m, 'farm');
    return true;
  }
  return false;
}

/** Đi rừng: gank địch máu thấp / đang bị đồng đội đánh gần đó; không thì dọn trại phía mình gần nhất; hết trại thì chờ trại sắp mọc. */
function jungle(bot, h) {
  const { world, e, cfg } = bot;
  if (h > 0.55) {
    const prey = world.entities.filter((f) => f.kind === 'hero' && f.alive && f.team !== e.team && canSee(e.team, f) && isTargetable(e, f) && dist(f.pos, e.pos) < 3200
      && !towerCovering(world, e.team, f.pos, 0) && (hp01(f) < 0.5 || world.entities.some((a) => a.kind === 'hero' && a.alive && a.team === e.team && a !== e && dist(a.pos, f.pos) < 700)))
      .sort((a, b) => hp01(a) - hp01(b))[0];
    if (prey) {
      const d = dist(prey.pos, e.pos);
      move(bot, prey.pos, d < cfg.fightRange ? Math.max(60, e.stats.range * 0.8) : 40, true);
      attack(bot, d < cfg.fightRange ? prey : null);
      if (d < cfg.fightRange) combo(bot, prey, 'fight');
      return true;
    }
  }
  const own = (world.camps || []).filter((c) => !MONSTERS[c.type]?.boss && c.side === e.team);
  const ready = own.filter((c) => c.respawnAt == null && aliveMembers(world, c).length).sort((a, b) => dist(a, e.pos) - dist(b, e.pos))[0];
  if (ready) {
    const m = aliveMembers(world, ready).sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0], gap = dist(m.pos, e.pos) - m.radius;
    if (gap > e.stats.range) move(bot, m.pos, Math.max(60, m.radius + e.stats.range * 0.6), true); else move(bot, e.pos);
    attack(bot, m);
    if (gap < 600 && e.mana > e.stats.maxMana * 0.3) combo(bot, m, 'farm');
    return true;
  }
  const next = own.filter((c) => c.respawnAt != null).sort((a, b) => a.respawnAt - b.respawnAt)[0];
  if (next && next.respawnAt - world.tick < T(14)) { move(bot, next, 160, true); attack(bot, null); return true; }
  return false; // không còn gì trong rừng: ra đường Giữa giúp
}

/** Trợ thủ: đứng sau xạ thủ đường Sông (hướng về nhà), không tranh lính; đánh / dùng chiêu khi tướng địch tới gần. */
function support(bot, foe, fd) {
  const { world, e } = bot;
  const carry = world.entities.find((a) => a.kind === 'hero' && a.alive && a !== e && a.team === e.team && (a.role === 'river' || a.laneId === 'river'));
  if (!carry || dist(carry.pos, e.pos) > 3500) return false;
  const home = bot.home(), d = dist(home, carry.pos) || 1;
  move(bot, { x: carry.pos.x + ((home.x - carry.pos.x) / d) * 170, y: carry.pos.y + ((home.y - carry.pos.y) / d) * 170 }, 70);
  const near = foe && fd < e.stats.range + 120;
  attack(bot, near ? foe : null);
  if (foe && fd < 900 && bot.rng.next() < bot.diff.trade) combo(bot, foe, 'trade');
  return true;
}

/** Gọi mỗi tick; bot tự giãn nhịp suy nghĩ theo độ khó (giống heroBot). */
export function updateLaneBot(world, e) {
  const bot = e.bot;
  if (world.tick < bot.next) return;
  bot.next = world.tick + Math.max(3, T(bot.diff.react));
  const moved = dist(e.pos, bot.lastPos), wants = Math.hypot(e.moveDir.x, e.moveDir.y) > 0.1; bot.lastPos = { ...e.pos }; // kẹt: muốn đi mà gần như đứng yên
  bot.stuck = e.alive && wants && moved < 3 && !e.recall && !e.dash ? bot.stuck + (bot.next - world.tick) : 0;
  think(bot);
}
