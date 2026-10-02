// Dựng đội hình 5v5: chọn tướng cho đồng đội và đối thủ, phân đường theo vai, đặt vị trí xuất phát quanh Suối Đèn, gắn bot.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { STARTER } from '../data/items.js';

/** Đường ưu tiên theo dữ liệu tướng: temple / mid / river (jungle và support quy về đường gần nhất vì chưa có quái rừng). */
const LANE_OF = { temple: 'temple', mid: 'mid', river: 'river', jungle: 'mid', support: 'river' };
const SLOTS = ['temple', 'mid', 'river', 'river', 'mid'];   // 5 vị trí mỗi đội: 1 Đền, 2 Giữa, 2 Sông

/** Phân tướng vào các vị trí: mỗi tướng chọn vị trí đầu tiên còn trống khớp đường ưu tiên, còn lại điền chỗ trống. */
export function assignSlots(heroIds) {
  const free = SLOTS.map((lane, i) => ({ lane, i, hero: null }));
  const left = [];
  for (const id of heroIds) {
    const pref = (HEROES[id].lanes || []).map((l) => LANE_OF[l]).filter(Boolean);
    const slot = pref.map((l) => free.find((s) => !s.hero && s.lane === l)).find(Boolean);
    if (slot) slot.hero = id; else left.push(id);
  }
  for (const id of left) free.find((s) => !s.hero).hero = id;
  return free.map((s) => ({ hero: s.hero, lane: s.lane }));
}

/** Chọn n tướng không trùng, bỏ các id trong `exclude`; ưu tiên bộ Alpha. */
function pick(rng, n, exclude = []) {
  const pool = ALPHA.filter((id) => !exclude.includes(id)), out = [];
  while (out.length < n) { if (!pool.length) pool.push(...ALPHA.filter((id) => !out.includes(id))); out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]); }
  return out;
}

/**
 * Spawn đủ 10 tướng. opts: { heroId (người chơi), difficulty, allies?: [id×4], foes?: [id×5] }.
 * Trả về { player, teams: [[hero…], [hero…]] }; tướng người chơi không có bot.
 */
export function setupTeams(world, opts) {
  const map = world.map, rng = world.rng;
  const allyIds = opts.allies || pick(rng, 4, [opts.heroId]);
  const foeIds = opts.foes || pick(rng, 5, []);
  const teams = [[], []];
  [[0, [opts.heroId, ...allyIds]], [1, foeIds]].forEach(([team, ids]) => {
    const slots = assignSlots(ids);
    const f = team ? map.mirror(map.fountain.x, map.fountain.y) : { x: map.fountain.x, y: map.fountain.y };
    slots.forEach((sl, k) => {
      // xếp thành cung quanh Suối, hướng ra cổng nhà chính
      const toCore = team ? map.mirror(map.structures[0].x, map.structures[0].y) : map.structures[0];
      const bx = toCore.x - f.x, by = toCore.y - f.y, L = Math.hypot(bx, by) || 1, ang = Math.atan2(by, bx) + (k - 2) * 0.5, r = 330;
      const e = world.spawnHero(sl.hero, team, { x: f.x + Math.cos(ang) * r, y: f.y + Math.sin(ang) * r });
      e.slot = k; e.laneId = sl.lane;
      const laneIdx = map.lanes.findIndex((l) => l.id === sl.lane);
      e.laneIdx = laneIdx;
      const mine = team === 0 && sl.hero === opts.heroId && !teams[0].some((h) => h.isPlayer);
      if (mine) e.isPlayer = true; // đồ khởi đầu của người chơi do game.js mua
      else { for (const id of STARTER[HEROES[sl.hero].roles[0]] || []) world.command(e.id, { type: 'buy', item: id }); world.addBot(e, opts.difficulty || 'normal', laneIdx); }
      teams[team].push(e);
    });
  });
  return { player: teams[0].find((h) => h.isPlayer), teams };
}
