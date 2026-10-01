// Bot đội 5v5 (06 §4.3): mỗi bot giữ một đường. Trạng thái LANE / FIGHT / RETREAT / RECALL / HEAL, xuất Command như người chơi.
// Khác bot 1v1: vị trí tính theo quãng s dọc đường (lanes.js) nên dùng được cho đường cong; có tính số lượng đồng đội khi giao tranh.
import { DIFFICULTY, BOT } from '../data/ai.js';
import { mulberry32 } from '../core/rng.js';
import { T, dist, norm } from '../sim/util.js';
import { mitigate } from '../sim/damage.js';
import { isTargetable } from '../sim/targeting.js';
import { quickBuys } from '../sim/inventory.js';
import { lanePath, project, pointAt } from '../sim/lanes.js';
import { minionsOf, towersOf, fountainOf, hp01, towerCovering, tankedBy, burst, canKill } from './perception.js';
import { combo, survival } from './botSkills.js';

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
const move = (bot, p0, tol = 30) => {
  const { e } = bot, p = steer(bot, p0), dx = p.x - e.pos.x, dy = p.y - e.pos.y, l = Math.hypot(dx, dy);
  bot.world.command(e.id, { type: 'move', dir: l > tol ? { x: dx / l, y: dy / l } : { x: 0, y: 0 } });
  return l;
};
const attack = (bot, target) => bot.world.command(bot.e.id, { type: 'attack', on: !!target, preferTarget: target?.id ?? null });

/** Đi tới vị trí trên đường ở quãng s: nếu lệch đường quá xa thì về đường trước (tránh cắt qua tường). */
function goLane(bot, s, tol = 40) {
  const { e, path } = bot, pr = project(path, e.pos), tgt = pointAt(path, s);
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
  const foes = heroesOf(1 - e.team).filter((f) => isTargetable(e, f) && dist(f.pos, e.pos) < 1500).sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos));
  const allies = heroesOf(e.team).filter((a) => a !== e && dist(a.pos, e.pos) < 1300);
  const foe = foes[0] || null, fd = foe ? dist(foe.pos, e.pos) : Infinity, h = hp01(e);
  const mine = minionsOf(world, e.team).filter((m) => m.lane === bot.laneIdx), theirs = minionsOf(world, 1 - e.team).filter((m) => m.lane === bot.laneIdx);
  const home = bot.home(), atHome = dist(e.pos, home) < 550, me = project(path, e.pos);

  const qb = quickBuys(e, 1)[0]; if (qb?.ok) world.command(e.id, { type: 'buy', item: qb.id });
  if (survival(bot, foe)) return;

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
    // lùi dọc đường về phía nhà; máu thấp thì về thẳng Suối Đèn
    const back = h > 0.18 ? pointAt(path, Math.max(0, me.s - 1100)) : home;
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
    combo(bot, foe, 'fight');
    return;
  }

  // LANE: đứng sau lính mình, kết liễu lính, đánh trụ khi lính mình đỡ, trao đổi chiêu khi có dịp
  const frontS = mine.reduce((m, x) => Math.max(m, project(path, x.pos).s), -1);
  const enemyStructs = towersOf(world, 1 - e.team).filter((t) => !t.invulnerable);
  const tower = enemyStructs.map((t) => ({ t, p: project(path, t.pos) })).filter((o) => o.p.d < path.width + 300).sort((a, b) => a.p.s - b.p.s)[0]?.t || null;
  const frontEnemyS = theirs.reduce((m, x) => Math.min(m, project(path, x.pos).s), Infinity);
  const target = pickMinion(bot, theirs.filter((m) => project(path, m.pos).s < (frontS < 0 ? Infinity : frontS) + 900));
  let s;
  if (target) s = project(path, target.pos).s - Math.max(80, e.stats.range * 0.8);
  else if (frontS >= 0) s = frontS - Math.max(150, e.stats.range * cfg.holdBack);
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
  if ((!target || pushing) && tower && (tankedBy(world, tower, e.team) || (alone && h > 0.5 && allies.length >= 1)) && dist(tower.pos, e.pos) < tower.stats.range + 400) { hit = tower; spot = { x: tower.pos.x, y: tower.pos.y }; const st2 = project(path, tower.pos).s; spot = pointAt(path, st2 - Math.max(e.stats.range * 0.85, tower.radius + 90)); }
  goLane(bot, project(path, spot).s, 40);
  attack(bot, hit);
  if (hit && hit === tower && e.mana > e.stats.maxMana * 0.3) combo(bot, tower, 'farm');
  else if (target && (alone || e.mana > e.stats.maxMana * 0.4) && theirs.filter((m) => dist(m.pos, target.pos) < 320).length >= 2) combo(bot, target, 'farm');
  if (foe && !foeCovered && fd < 800 && burst(world, e, foe) >= foe.hp * 0.25 && bot.rng.next() < bot.diff.trade) combo(bot, foe, 'trade');
}

/** Gọi mỗi tick; bot tự giãn nhịp suy nghĩ theo độ khó (giống heroBot). */
export function updateLaneBot(world, e) {
  const bot = e.bot;
  if (world.tick < bot.next) return;
  bot.next = world.tick + Math.max(3, T(bot.diff.react));
  think(bot);
}
