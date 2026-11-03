// Dựng đội hình 5v5: chọn tướng cho đồng đội và đối thủ, phân đường theo vai, đặt vị trí xuất phát quanh Suối Đèn, gắn bot.
import { D } from '../core/dmath.js';
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
  const free = SLOTS.map((lane, i) => ({ lane, i, hero: null, src: -1 }));
  const left = [], rest = [];
  heroIds.forEach((id, j) => { const s = fixed[j] && free.find((x) => !x.hero && x.lane === fixed[j]); if (s) { s.hero = id; s.src = j; } else rest.push(j); });
  for (const j of rest) {
    const id = heroIds[j], pref = (HEROES[id].lanes || []).map((l) => LANE_OF[l]).filter(Boolean);
    const slot = pref.map((l) => free.find((s) => !s.hero && s.lane === l)).find(Boolean);
    if (slot) { slot.hero = id; slot.src = j; } else left.push(j);
  }
  for (const j of left) { const s = free.find((x) => !x.hero); s.hero = heroIds[j]; s.src = j; }
  return free.map((s) => ({ hero: s.hero, lane: s.lane, src: s.src })); // src: chỉ số tướng trong heroIds (-1: vị trí trống khi ít hơn 5 tướng)
}

/** Chọn n tướng không trùng, bỏ các id trong `exclude`; ưu tiên bộ Alpha. */
function pick(rng, n, exclude = []) {
  const pool = ALPHA.filter((id) => !exclude.includes(id)), out = [];
  while (out.length < n) { if (!pool.length) pool.push(...ALPHA.filter((id) => !out.includes(id))); out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]); }
  return out;
}

/**
 * Spawn đủ 10 tướng. opts: { heroId (người chơi), difficulty, allies?: [id×4], foes?: [id×5], playerRole?, allyRoles?: [vị trí×4],
 * foeRoles?: [vị trí×5], foePlayer?: { heroId, role? } (online: người chơi ở đội 1) } — vị trí (id trong SLOTS) chốt ở màn chọn; thiếu / sai thì phân theo đường ưu tiên của tướng như cũ.
 * Online nhiều người: humans: [{ team, heroId, role? }] (thay heroId / playerRole / foePlayer), bots: false → chỉ spawn người thật (phòng tuỳ chỉnh tắt máy).
 * Trả về { player, player2, teams: [[hero…], [hero…]], humans: [entity theo thứ tự humans] }; tướng người chơi không có bot.
 */
export function setupTeams(world, opts) {
  const map = world.map, rng = world.rng, fill = opts.bots !== false;
  const fp = opts.foePlayer;
  const humans = opts.humans || [{ team: 0, heroId: opts.heroId, role: opts.playerRole }, ...(fp ? [{ team: 1, heroId: fp.heroId, role: fp.role }] : [])];
  const given = [opts.allies, opts.foes], moreRoles = [opts.allyRoles || [], opts.foeRoles || []];
  // id tướng mỗi đội: người thật trước, máy điền phần còn lại (thứ tự gọi rng y như bản cũ: đội 0 rồi đội 1)
  const plan = [0, 1].map((t) => {
    const hs = humans.filter((h) => h.team === t), hIds = hs.map((h) => h.heroId);
    const botIds = !fill ? [] : given[t] ? given[t] : pick(rng, Math.max(0, 5 - hIds.length), hIds);
    return { hs, ids: [...hIds, ...botIds].slice(0, 5), fixed: [...hs.map((h) => h.role), ...moreRoles[t]] };
  });
  const teams = [[], []], humanEnt = new Map();
  plan.forEach(({ hs, ids, fixed }, team) => {
    const slots = assignSlots(ids, fixed);
    const f = team ? map.mirror(map.fountain.x, map.fountain.y) : { x: map.fountain.x, y: map.fountain.y };
    slots.forEach((sl, k) => {
      if (!sl.hero) return; // ít hơn 5 tướng (tắt máy): vị trí trống
      // xếp thành cung quanh Suối, hướng ra cổng nhà chính
      const toCore = team ? map.mirror(map.structures[0].x, map.structures[0].y) : map.structures[0];
      const bx = toCore.x - f.x, by = toCore.y - f.y, L = D.hypot(bx, by) || 1, ang = D.atan2(by, bx) + (k - 2) * 0.5, r = 330;
      const e = world.spawnHero(sl.hero, team, { x: f.x + D.cos(ang) * r, y: f.y + D.sin(ang) * r });
      e.slot = k; e.laneId = sl.lane; e.role = sl.lane;
      const laneIdx = map.lanes.findIndex((l) => l.id === (LANE_BASE[sl.lane] || sl.lane));
      e.laneIdx = laneIdx;
      if (sl.src < hs.length) { e.isPlayer = true; humanEnt.set(hs[sl.src], e); } // đồ khởi đầu của người chơi do game.js / net/protocol.js mua
      else {
        world.setLoadout(e, { spellId: botSpellOf(sl.hero, sl.lane) }); // vị trí → phép (rừng: Trừng Trị) + phù hiệu mặc định theo vai
        const start = starterFor(HEROES[sl.hero], sl.lane, e.spell?.id); // đồ khởi đầu theo vị trí
        for (const id of start || []) world.command(e.id, { type: 'buy', item: id }); world.addBot(e, opts.difficulty || 'normal', laneIdx);
      }
      teams[team].push(e);
    });
  });
  const hum = humans.map((h) => humanEnt.get(h));
  return { player: hum.find((e) => e?.team === 0) || null, player2: hum.find((e) => e?.team === 1) || null, teams, humans: hum };
}
