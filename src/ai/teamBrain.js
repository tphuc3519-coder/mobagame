// Não đội 5v5 (06 §4.6): mỗi giây mỗi đội xem cả bản đồ rồi giao lệnh cho bot của đội (không giao cho người chơi):
//   thủ — trụ / nhà chính của mình đang bị tướng địch đánh: những bot gần nhất về giữ;
//   mục tiêu lớn — đông người hơn (hoặc địch chết gần hết) thì kéo 3–4 bot đánh mục tiêu lớn đang có, người đi rừng giữ Trừng Trị kết liễu;
//   dồn đường — vừa hạ mục tiêu lớn / địch chết nhiều / chết hết / cuối trận hơn người: gom bot rảnh đẩy một đường (số trong data/ai.js BRAIN).
// Lệnh chỉ là gợi ý: bot vẫn tự lùi khi máu thấp, vẫn giao tranh khi gặp địch (laneBot.js đọc bot.order khi đang rảnh).
import { T, dist } from '../sim/util.js';
import { canSee } from '../sim/vision.js';
import { MONSTERS } from '../data/jungle.js';
import { BRAIN } from '../data/ai.js';
import { PING, PING_KINDS } from '../data/signals.js';
import { livePings } from '../sim/pings.js';
const PUSH = BRAIN.push;

const BOSS_RANK = { ta_than: 4, than_dieu: 3, ho_loi: 2, long_ngu: 1 };
const hp01 = (h) => h.hp / h.stats.maxHp;
const avgOf = (l) => (l.length ? l.reduce((a, b) => a + hp01(b), 0) / l.length : 0);

export function updateTeamBrains(world) {
  if (world.map.lanes.length < 2 || world.tick % 30) return;
  (world.brains ||= [{}, {}]);
  for (const team of [0, 1]) world.brains[team] = think(world, team, world.brains[team]);
}

function think(world, team, prev) {
  const heroes = world.entities.filter((h) => h.kind === 'hero');
  const mine = heroes.filter((h) => h.team === team && h.alive), foes = heroes.filter((h) => h.team !== team && h.alive);
  const seenFoes = foes.filter((f) => canSee(team, f));
  const bots = mine.filter((h) => h.bot && hp01(h) > 0.35 && !h.recall);
  const orders = new Map(), taken = new Set(), minute = world.tick / 1800;
  const nearest = (p, n, filter = () => true) => bots.filter((b) => !taken.has(b.id) && filter(b)).sort((a, b) => dist(a.pos, p) - dist(b.pos, p)).slice(0, n);
  const give = (list, order) => { for (const b of list) { taken.add(b.id); orders.set(b.id, order); } };
  // bot tự ra tín hiệu (chỉ khi đội có người chơi — trận toàn bot không đổi; bot không làm theo tín hiệu của bot), tối đa mỗi PING.botGap giây
  let botPingTick = prev.botPingTick ?? -1e9;
  const botPing = (b, kind, p) => { if (!heroes.some((h) => h.team === team && !h.bot) || world.tick - botPingTick < T(PING.botGap)) return; botPingTick = world.tick; world.command(b.id, { type: 'ping', kind, x: Math.round(p.x), y: Math.round(p.y) }); };

  // 1. thủ trụ / nhà chính đang bị tướng địch đánh
  for (const s of world.entities) {
    if (!s.structure || s.noTarget || !s.alive || s.team !== team || world.tick - s.lastDamagedTick > T(2)) continue;
    const raiders = seenFoes.filter((f) => dist(f.pos, s.pos) < s.stats.range + 400);
    if (!raiders.length) continue;
    const helpers = nearest(s.pos, Math.min(4, raiders.length + 1), (b) => dist(b.pos, s.pos) < 4500 + (s.kind === 'core' ? 4000 : 0));
    give(helpers, { kind: 'defend', id: s.id, x: s.pos.x, y: s.pos.y, until: world.tick + T(6) });
  }

  // 1b. tín hiệu của người chơi cùng đội (07 §9): Tấn công → tối đa 3 bot gần nhất đi đánh, Tập hợp → tối đa 4 bot tới; Rút lui mới hơn
  //     gần đó huỷ hai loại này. Bot đã nhận một tín hiệu thì giữ (không đổi người giữa chừng). Lần đầu có bot nhận → sự kiện pingAck.
  const crews = {}, acked = prev.acked || [];
  const asks = livePings(world, team).filter((p) => p.kind === 'attack' || p.kind === 'gather').slice(-2);
  const retreats = livePings(world, team, 'retreat');
  for (const p of asks) {
    if (retreats.some((r) => r.tick > p.tick && dist(r, p) < PING.cancelBy)) continue;
    const cfg = PING[p.kind], keep = (prev.crews?.[p.id] || []).map((id) => bots.find((b) => b.id === id)).filter((b) => b && !taken.has(b.id));
    const crew = [...keep, ...nearest(p, cfg.bots, (b) => !keep.includes(b) && dist(b.pos, p) < cfg.range && hp01(b) >= cfg.hp)].slice(0, cfg.bots);
    if (!crew.length) continue;
    give(crew, { kind: 'ping', mode: p.kind, ping: p.id, x: p.x, y: p.y, target: p.target, until: p.tick + T(PING_KINDS[p.kind].hold) });
    crews[p.id] = crew.map((b) => b.id);
    if (!acked.includes(p.id)) { acked.push(p.id); world.emit('pingAck', { id: crew[0].id, ping: p.id, team, kind: p.kind, bots: crews[p.id] }); }
  }

  // 2. mục tiêu lớn: hơn người, hoặc địch còn ít người sống, hoặc đang đánh dở
  const bosses = (world.camps || []).filter((c) => MONSTERS[c.type]?.boss && c.respawnAt == null && c.alive.some((id) => world.byId(id)?.alive));
  const free = bots.filter((b) => !taken.has(b.id));
  const avgHp = free.length ? free.reduce((a, b) => a + hp01(b), 0) / free.length : 0;
  const keep = prev.boss && bosses.find((c) => c.id === prev.boss);
  const advantage = mine.length - foes.length;
  const want = keep ? avgHp > 0.4 && mine.length >= foes.length : free.length >= 3 && avgHp > 0.6 && (advantage >= 1 || foes.length <= 2 || (minute >= 6 && advantage >= 0 && avgHp > 0.75));
  let boss = null;
  if (want && bosses.length) {
    const cx = free.reduce((a, b) => a + b.pos.x, 0) / free.length, cy = free.reduce((a, b) => a + b.pos.y, 0) / free.length;
    const threat = (c) => seenFoes.filter((f) => dist(f.pos, c) < 1800).length;
    boss = keep || bosses.filter((c) => threat(c) <= Math.max(0, advantage)).sort((a, b) => (BOSS_RANK[b.type] || 0) - (BOSS_RANK[a.type] || 0) || dist(a, { x: cx, y: cy }) - dist(b, { x: cx, y: cy }))[0] || null;
    if (boss) {
      const jungler = free.find((b) => b.role === 'jungle'), crew = nearest(boss, 4, (b) => dist(b.pos, boss) < 7000);
      if (jungler && !crew.includes(jungler) && !taken.has(jungler.id)) crew.splice(3, 1, jungler);
      if (crew.length >= 3) give(crew, { kind: 'boss', camp: boss.id, x: boss.x, y: boss.y });
      if (crew.length >= 3 && boss.id !== prev.boss) botPing(crew[0], 'gather', boss); // đội có người chơi: bot ra tín hiệu Tập hợp ở mục tiêu lớn
      else boss = null;
    }
  }

  // 3. dồn đường (06 §4.6): vừa hạ mục tiêu lớn, hơn hẳn người (địch chết), địch chết hết, hoặc cuối trận hơn người →
  //    gom bot rảnh đẩy một đường: đường có công trình địch gần nhóm nhất / ít máu nhất; giữ đường cũ khi lệnh còn hiệu lực
  let push = null;
  const freeNow = bots.filter((b) => !taken.has(b.id)), lb = world.lastBoss;
  const fresh = lb && lb.team === team && world.tick - lb.tick < T(PUSH.afterBoss);
  const why = !foes.length ? 'ace' : advantage >= 2 && minute >= PUSH.advFrom ? 'adv' : fresh && advantage >= 0 && avgOf(freeNow) > 0.5 ? 'boss'
    : minute >= PUSH.lateFrom && advantage >= 1 ? 'late' : null;
  if (!boss && why && freeNow.length >= (why === 'ace' ? 1 : 3)) {
    const cx = freeNow.reduce((a, b) => a + b.pos.x, 0) / freeNow.length, cy = freeNow.reduce((a, b) => a + b.pos.y, 0) / freeNow.length;
    const from = why === 'boss' ? { x: lb.x, y: lb.y } : { x: cx, y: cy };
    const lanes = world.map.lanes.map((ln, i) => {
      const t = world.entities.filter((s) => s.structure && !s.noTarget && s.alive && s.team !== team && !s.invulnerable && (s.kind === 'core' || s.sid?.startsWith(ln.id)));
      const best = t.map((s) => dist(s.pos, from) + (s.hp / s.stats.maxHp) * 2500).sort((a, b) => a - b)[0];
      return { i, score: best ?? Infinity };
    }).sort((a, b) => a.score - b.score);
    push = prev.push != null && world.tick < (prev.pushUntil || 0) && lanes.find((l) => l.i === prev.push && l.score < Infinity) ? prev.push : lanes[0].i;
    give(freeNow, { kind: 'push', lane: push, why, until: world.tick + T(PUSH.hold) });
    if (push !== prev.push) { const tgt = world.entities.filter((s) => s.structure && !s.noTarget && s.alive && s.team !== team && !s.invulnerable).sort((a, b) => dist(a.pos, freeNow[0].pos) - dist(b.pos, freeNow[0].pos))[0]; if (tgt) botPing(freeNow[0], 'attack', tgt.pos); }
  }
  return { orders, crews, acked: acked.slice(-16), botPingTick, boss: boss?.id ?? null, push, pushUntil: push == null ? 0 : prev.push === push && prev.pushUntil > world.tick ? prev.pushUntil : world.tick + T(PUSH.hold) };
}

/** Lệnh hiện tại của bot (hoặc null). */
export const orderOf = (world, e) => world.brains?.[e.team]?.orders?.get(e.id) || null;
