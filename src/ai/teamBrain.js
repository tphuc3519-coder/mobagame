// Não đội 5v5 (06 §4.6): mỗi giây mỗi đội xem cả bản đồ rồi giao lệnh cho bot của đội (không giao cho người chơi):
//   thủ — trụ / nhà chính của mình đang bị tướng địch đánh: những bot gần nhất về giữ;
//   mục tiêu lớn — đông người hơn (hoặc địch chết gần hết) thì kéo 3–4 bot đánh mục tiêu lớn đang có, người đi rừng giữ Trừng Trị kết liễu;
//   dồn đường — cuối trận (từ phút 16) đội hơn người thì gom cả đội đẩy một đường.
// Lệnh chỉ là gợi ý: bot vẫn tự lùi khi máu thấp, vẫn giao tranh khi gặp địch (laneBot.js đọc bot.order khi đang rảnh).
import { T, dist } from '../sim/util.js';
import { canSee } from '../sim/vision.js';
import { MONSTERS } from '../data/jungle.js';

const BOSS_RANK = { ta_than: 4, than_dieu: 3, ho_loi: 2, long_ngu: 1 };
const hp01 = (h) => h.hp / h.stats.maxHp;

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

  // 1. thủ trụ / nhà chính đang bị tướng địch đánh
  for (const s of world.entities) {
    if (!s.structure || s.noTarget || !s.alive || s.team !== team || world.tick - s.lastDamagedTick > T(2)) continue;
    const raiders = seenFoes.filter((f) => dist(f.pos, s.pos) < s.stats.range + 400);
    if (!raiders.length) continue;
    const helpers = nearest(s.pos, Math.min(4, raiders.length + 1), (b) => dist(b.pos, s.pos) < 4500 + (s.kind === 'core' ? 4000 : 0));
    give(helpers, { kind: 'defend', id: s.id, x: s.pos.x, y: s.pos.y, until: world.tick + T(6) });
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
      else boss = null;
    }
  }

  // 3. cuối trận hơn người: gom cả đội đẩy một đường (đường có trụ địch ngoài cùng yếu nhất)
  let push = null;
  if (!boss && minute >= 16 && advantage >= 2 && free.length >= 3) {
    const lanes = world.map.lanes.map((ln, i) => {
      const t = world.entities.filter((s) => s.kind === 'tower' && s.alive && s.team !== team && !s.invulnerable && s.sid?.startsWith(ln.id));
      return { i, hp: t.length ? Math.min(...t.map((s) => s.hp)) : 0 };
    }).sort((a, b) => a.hp - b.hp);
    push = lanes[0].i;
    give(bots.filter((b) => !taken.has(b.id)), { kind: 'push', lane: push, until: world.tick + T(20) });
  }
  return { orders, boss: boss?.id ?? null, push };
}

/** Lệnh hiện tại của bot (hoặc null). */
export const orderOf = (world, e) => world.brains?.[e.team]?.orders?.get(e.id) || null;
