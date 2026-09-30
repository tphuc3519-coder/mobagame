// Bot tướng 1v1 (06 §4.3, §5): LANE/PUSH, FIGHT/KITE, RETREAT, RECALL. Xuất Command như người chơi.
import { DIFFICULTY, BOT } from '../data/ai.js';
import { mulberry32 } from '../core/rng.js';
import { T, dist, norm } from '../sim/util.js';
import { mitigate } from '../sim/damage.js';
import { isTargetable } from '../sim/targeting.js';
import { quickBuys } from '../sim/inventory.js';
import { foeHero, minionsOf, towersOf, fountainOf, hp01, towerCovering, tankedBy, burst, canKill } from './perception.js';
import { combo, survival } from './botSkills.js';

export function createBot(world, e, difficulty = 'normal') {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const bot = { world, e, diff, cfg: BOT, rng: mulberry32(0x9e3779b1 ^ (e.id * 7919) ^ world.seed), state: 'LANE', next: e.id % 5, stuck: 0, lastPos: { ...e.pos }, sign: e.team === 0 ? 1 : -1 };
  bot.home = () => fountainOf(world, e.team).pos;
  bot.homeDir = () => norm(bot.home().x - e.pos.x, bot.home().y - e.pos.y);
  e.bot = bot;
  return bot;
}

/** Lách quanh công trình chắn đường thẳng (trụ, nhà chính): đi tới điểm bên hông. */
function steer(bot, p) {
  const { world, e } = bot;
  for (const s of world.entities) {
    if (!s.structure || !s.alive || s.noTarget) continue;
    const dx = p.x - e.pos.x, dy = p.y - e.pos.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((s.pos.x - e.pos.x) * dx + (s.pos.y - e.pos.y) * dy) / L2));
    const cx = e.pos.x + dx * t, cy = e.pos.y + dy * t, clear = s.radius * 0.8 + e.radius + 25;
    if (t > 0 && t < 1 && Math.hypot(cx - s.pos.x, cy - s.pos.y) < clear && dist(p, s.pos) > clear) {
      const side = e.pos.y >= s.pos.y ? 1 : -1;
      return { x: s.pos.x, y: s.pos.y + side * (clear + 30) };
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

/** Chọn lính để đánh: ưu tiên lính kết liễu được (theo tỉ lệ độ khó), sau đó lính gần nhất. */
function pickMinion(bot, foes) {
  const { e, rng, diff } = bot;
  if (!foes.length) return null;
  const reach = e.stats.range + 250;
  const near = foes.filter((m) => dist(m.pos, e.pos) <= reach);
  const lethal = near.filter((m) => m.hp <= mitigate(e, m, e.stats.atk, 'physical') * 1.05).sort((a, b) => a.hp - b.hp)[0];
  if (lethal && rng.next() < diff.lastHit) return lethal;
  if (near.length && rng.next() > diff.lastHit) return near[Math.floor(rng.next() * near.length)]; // bot yếu đánh bừa
  return near.sort((a, b) => a.hp - b.hp)[0] || foes.reduce((b, m) => (!b || dist(m.pos, e.pos) < dist(b.pos, e.pos) ? m : b), null);
}

function think(bot) {
  const { world, e, sign, cfg } = bot;
  if (!e.alive) { bot.state = 'DEAD'; return; }
  const foe = foeHero(world, e), foeSeen = foe && foe.alive && isTargetable(e, foe);
  const fd = foeSeen ? dist(foe.pos, e.pos) : Infinity, h = hp01(e);
  const mine = minionsOf(world, e.team), theirs = minionsOf(world, 1 - e.team);
  const home = bot.home(), atHome = dist(e.pos, home) < 400;

  // mua đồ theo build (bot mua ở bất kỳ đâu như người chơi)
  const qb = quickBuys(e, 1)[0]; if (qb?.ok) world.command(e.id, { type: 'buy', item: qb.id });
  if (survival(bot, foeSeen ? foe : null)) return;

  // đang về thành: giữ yên trừ khi địch áp sát
  if (e.recall) { if (fd < 700) { bot.state = 'RETREAT'; } else { move(bot, e.pos); attack(bot, null); return; } }
  if (atHome && (h < 0.92 || e.mana < e.stats.maxMana * 0.8) && fd > 1200) { bot.state = 'HEAL'; move(bot, home, 60); attack(bot, null); return; }

  const coverMe = towerCovering(world, e.team, e.pos, 30);
  const underFire = coverMe && !tankedBy(world, coverMe, e.team) && (coverMe.streakTarget === e.id || coverMe.aggro === e.id);
  const killable = foeSeen && canKill(world, e, foe);
  const foeCovered = foeSeen && towerCovering(world, e.team, foe.pos, 0);

  // chọn trạng thái
  const ahead = foeSeen && (e.level - foe.level >= 2 || e.goldEarned - foe.goldEarned > 1200);
  let st = 'LANE';
  if ((h < cfg.retreatHp && fd < 1100 && !killable) || underFire) st = 'RETREAT';
  else if (fd > cfg.safeRange && !atHome && (h < cfg.recallHp || e.mana < e.stats.maxMana * cfg.recallMana || e.gold > 2200)) st = 'RECALL';
  else if (foeSeen && fd < cfg.fightRange && (killable || (h > hp01(foe) + (ahead ? -0.1 : 0.15) && h > 0.5)) && (!foeCovered || (killable && h > 0.45))) st = 'FIGHT';
  if (bot.state === 'FIGHT' && st === 'LANE' && foeSeen && fd < cfg.fightRange && h > hp01(foe)) st = 'FIGHT'; // quán tính
  bot.state = st;

  if (st === 'RETREAT') {
    const safe = towersOf(world, e.team).filter((t) => (t.pos.x - e.pos.x) * sign < 0).sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0];
    move(bot, safe && h > 0.15 ? { x: safe.pos.x - sign * 250, y: safe.pos.y } : home);
    attack(bot, null);
    if (foeSeen && fd < 450) combo(bot, foe, 'escape');
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

  // LANE / PUSH: đứng sau lính mình, kết liễu lính, đánh trụ khi lính mình đỡ, trao đổi chiêu khi có dịp
  const front = mine.reduce((b, m) => (!b || (m.pos.x - b.pos.x) * sign > 0 ? m : b), null);
  const tower = towersOf(world, 1 - e.team).filter((t) => !t.invulnerable).sort((a, b) => dist(a.pos, e.pos) - dist(b.pos, e.pos))[0];
  const target = pickMinion(bot, theirs.filter((m) => !front || (m.pos.x - front.pos.x) * sign < 900));
  let spot;
  if (target) spot = { x: target.pos.x - sign * Math.max(80, e.stats.range * 0.8), y: target.pos.y };
  else if (front) spot = { x: front.pos.x - sign * Math.max(120, e.stats.range * bot.cfg.holdBack), y: front.pos.y };
  else { const own = towersOf(world, e.team).sort((a, b) => (b.pos.x - a.pos.x) * sign)[0]; spot = { x: own.pos.x + sign * 200, y: own.pos.y }; }
  // không bước vào tầm trụ địch khi lính mình chưa đỡ
  const cov = towerCovering(world, e.team, spot, cfg.towerMargin);
  if (cov && !tankedBy(world, cov, e.team)) spot = { x: cov.pos.x - sign * (cov.stats.range + cfg.towerMargin + 40), y: spot.y };
  let hit = target;
  const defenders = tower ? theirs.filter((m) => dist(m.pos, tower.pos) < tower.stats.range + 100).length : 0;
  const pushing = !foe?.alive || !foeSeen || fd > 1500 || (defenders <= 1 && h > 0.45); // đối thủ vắng hoặc trụ chỉ còn ít lính giữ: dồn trụ
  if ((!target || pushing) && tower && (tankedBy(world, tower, e.team) || (!foe?.alive && h > 0.5 && tower.hp < tower.stats.maxHp * 0.25)) && (pushing || !target) && dist(tower.pos, e.pos) < tower.stats.range + 400) { hit = tower; spot = { x: tower.pos.x - sign * (e.stats.range * 0.7 + tower.radius), y: tower.pos.y }; }
  move(bot, spot, 40);
  attack(bot, hit);
  // dọn lính nhanh bằng kỹ năng khi dư mana hoặc đối thủ vắng mặt → đợt lính mình tiến lên, trận có nhịp
  const foeAway = !foeSeen || fd > 1500;
  if (hit && hit === tower && e.mana > e.stats.maxMana * 0.3) combo(bot, tower, 'farm');
  else if (target && (foeAway || e.mana > e.stats.maxMana * 0.4) && theirs.filter((m) => dist(m.pos, target.pos) < 320).length >= 2) combo(bot, target, 'farm');
  // trao đổi chiêu: đối thủ trong tầm và dồn sát thương đủ 25% máu địch (06 §5)
  if (foeSeen && !foeCovered && fd < 800 && burst(world, e, foe) >= foe.hp * 0.25 && bot.rng.next() < bot.diff.trade) combo(bot, foe, 'trade');
}

/** Gọi mỗi tick sau khi thế giới cập nhật; bot tự giãn nhịp suy nghĩ theo độ khó. */
export function updateBots(world) {
  for (const e of world.entities) {
    const bot = e.bot; if (!bot) continue;
    if (world.tick < bot.next) continue;
    bot.next = world.tick + Math.max(3, T(bot.diff.react));
    const moved = dist(e.pos, bot.lastPos); bot.lastPos = { ...e.pos };
    const wants = Math.hypot(e.moveDir.x, e.moveDir.y) > 0.1;
    bot.stuck = e.alive && wants && moved < 2 && !e.recall ? bot.stuck + (bot.next - world.tick) : 0;
    think(bot);
  }
}
