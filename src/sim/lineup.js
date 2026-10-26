// Dựng đội hình 5v5: chọn tướng cho đồng đội và đối thủ, phân đường theo vai, đặt vị trí xuất phát quanh Suối Đèn, gắn bot.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { starterFor } from '../data/items.js';
import { botSpellOf } from '../data/ai.js';

/** Vị trí theo dữ liệu tướng (như Liên Quân): Đường Đền, Đường Giữa, Đường Sông, Đi rừng, Trợ thủ. */
const LANE_OF = { temple: 'temple', mid: 'mid', river: 'river', jungle: 'jungle', support: 'support' };
const SLOTS = ['temple', 'mid', 'river', 'jungle', 'support'];   // 5 vị trí mỗi đội
/** Đường gốc của vị trí không có đường riêng: đi rừng lấy đường Giữa (khi phải về đường), trợ thủ theo xạ thủ ở đường Sông. */
export const LANE_BASE = { jungle: 'mid', support: 'river' };

/** Phân tướng vào các vị trí: `fixed[j]` (vị trí đã chốt ở màn chọn, nếu hợp lệ) ghim tướng j trước; mỗi tướng còn lại chọn vị trí
 *  đầu tiên còn trống khớp đường ưu tiên, còn lại điền chỗ trống. Không có `fixed` thì y như cũ. */
export function assignSlots(heroIds, fixed = []) {
  const free = SLOTS.map((lane, i) => ({ lane, i, hero: null }));
  const left = [], rest = [];
  heroIds.forEach((id, j) => { const s = fixed[j] && free.find((x) => !x.hero && x.lane === fixed[j]); if (s) s.hero = id; else rest.push(id); });
  for (const id of rest) {
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
 * Spawn đủ 10 tướng. opts: { heroId (người chơi), difficulty, allies?: [id×4], foes?: [id×5], playerRole?, allyRoles?: [vị trí×4],
 * foeRoles?: [vị trí×5] } — vị trí (id trong SLOTS) chốt ở màn chọn; thiếu / sai thì phân theo đường ưu tiên của tướng như cũ.
 * Trả về { player, teams: [[hero…], [hero…]] }; tướng người chơi không có bot.
 */
export function setupTeams(world, opts) {
  const map = world.map, rng = world.rng;
  const allyIds = opts.allies || pick(rng, 4, [opts.heroId]);
  const foeIds = opts.foes || pick(rng, 5, []);
  const teams = [[], []];
  [[0, [opts.heroId, ...allyIds]], [1, foeIds]].forEach(([team, ids]) => {
    const fixed = team ? (opts.foeRoles || []) : [opts.playerRole, ...(opts.allyRoles || [])];
    const slots = assignSlots(ids, fixed);
    const f = team ? map.mirror(map.fountain.x, map.fountain.y) : { x: map.fountain.x, y: map.fountain.y };
    slots.forEach((sl, k) => {
      // xếp thành cung quanh Suối, hướng ra cổng nhà chính
      const toCore = team ? map.mirror(map.structures[0].x, map.structures[0].y) : map.structures[0];
      const bx = toCore.x - f.x, by = toCore.y - f.y, L = Math.hypot(bx, by) || 1, ang = Math.atan2(by, bx) + (k - 2) * 0.5, r = 330;
      const e = world.spawnHero(sl.hero, team, { x: f.x + Math.cos(ang) * r, y: f.y + Math.sin(ang) * r });
      e.slot = k; e.laneId = sl.lane; e.role = sl.lane;
      const laneIdx = map.lanes.findIndex((l) => l.id === (LANE_BASE[sl.lane] || sl.lane));
      e.laneIdx = laneIdx;
      const byRole = SLOTS.includes(opts.playerRole); // có vị trí người chơi: nhận ra người chơi theo vị trí (đồng đội có thể trùng tướng)
      const mine = team === 0 && !teams[0].some((h) => h.isPlayer) && (byRole ? sl.lane === opts.playerRole : sl.hero === opts.heroId);
      if (mine) e.isPlayer = true; // đồ khởi đầu của người chơi do game.js mua
      else {
        world.setLoadout(e, { spellId: botSpellOf(sl.hero, sl.lane) }); // vị trí → phép (rừng: Trừng Trị) + phù hiệu mặc định theo vai
        const start = starterFor(HEROES[sl.hero], sl.lane, e.spell?.id); // đồ khởi đầu theo vị trí
        for (const id of start || []) world.command(e.id, { type: 'buy', item: id }); world.addBot(e, opts.difficulty || 'normal', laneIdx);
      }
      teams[team].push(e);
    });
  });
  return { player: teams[0].find((h) => h.isPlayer), teams };
}
