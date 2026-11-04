// Màn tải lúc dựng trận (màn che `cover` cho game.js — thay màn đen "Đang vào trận…"). Cùng giao diện với màn tải trận đấu máy (ui/loading.js
// buildLoadScreen): nền mờ, hàng thẻ đội mình (trên, mình ở giữa) và đội kia (dưới), thanh tiến độ từng người, mẹo, chữ VS, phần trăm.
//  • Trận trực tuyến (openOnlineLoading): hiện ngay khi máy chủ báo vào trận (trước cả khi dựng trận — game.js dựng liền một mạch ~1 giây).
//    Tướng máy chọn biết trước bằng cách dựng thử trận từ cấu hình máy chủ (cùng seed ⇒ cùng đội hình). Thanh của mình = tải thật trên máy
//    này (model tướng + quái, rồi dịch shader); của người chơi khác = tiến độ máy họ báo lên máy chủ (session.loads); của máy = model trên
//    máy này. Máy này xong mà người khác chưa: "Chờ người chơi khác… 1/2" — màn tải giữ tới khi khung trận đầu tiên chạy.
//  • Vào thẳng trận không qua màn tải (?hero=…): openWorldCover dựng từ trận đã có.
import { HEROES } from '../data/heroes/index.js';
import { createWorld } from '../sim/world.js';
import { setupOnline, mapOf } from '../net/protocol.js';
import { loadHero, heroProgress, releaseHeroes, LITE } from '../render/assets.js';
import { preloadMonsters } from '../render/monsterModels.js';
import { buildLoadScreen, asCover } from './loading.js';
import { profile } from './profile.js';
import { botLabel } from './people.js';

/** Hai hàng thẻ: đội mình (mình ở giữa hàng) / đội kia (theo thứ tự vị trí). */
function rowsOf(heroes, myTeam, entryOf) {
  const ally = heroes.filter((e) => e.team === myTeam).map(entryOf), foe = heroes.filter((e) => e.team !== myTeam).map(entryOf);
  const i = ally.findIndex((c) => c.me); if (i >= 0) { const [me] = ally.splice(i, 1); ally.splice(Math.floor(ally.length / 2), 0, me); }
  return { ally, foe };
}

/** Gắn màn tải vào body (trên trận), tự tải model các tướng, cập nhật thanh mỗi khung. Trả về cover { el, ready(), close() }. */
function mount({ ally, foe, solo, humans = 1, loads = () => [], report = null, started = () => false }) {
  const { el, bars, pct } = buildLoadScreen({ ally, foe, solo });
  el.classList.add('cover'); document.body.append(el);
  const all = [...ally, ...foe], ids = [...new Set(all.map((c) => c.hero))];
  // chỉ giữ model tướng trong trận (render/assets.js) rồi tải: điện thoại tối đa 2 model một lúc (đỡ một đợt bộ nhớ tạm lớn)
  releaseHeroes(ids);
  let queued = 0; const next = () => (queued < ids.length ? loadHero(ids[queued++]).catch(() => null).then(next) : null);
  Promise.all(Array.from({ length: Math.min(LITE ? 2 : ids.length, ids.length) }, next));
  let mobs = 0; preloadMonsters().catch(() => {}).then(() => { mobs = 1; });
  for (const c of all) c.v = 0;
  let ready = false, raf = 0, last = performance.now();
  const step = (now) => {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = Math.max(last, now);
    const models = ids.reduce((s, id) => s + heroProgress(id), 0) / Math.max(1, ids.length);
    const local = ready ? 1 : Math.min(0.95, models * 0.85 + mobs * 0.1); // 5% cuối: dịch shader (game.js báo ready())
    report?.(local);
    const L = loads() || [];
    all.forEach((c, i) => {
      const target = c.me ? local : c.human >= 0 ? (L[c.human] ?? 0) / 100 : heroProgress(c.hero);
      c.v += (target - c.v) * Math.min(1, dt * 6); if (target >= 1 && c.v > 0.995) c.v = 1;
      bars[i].style.width = (c.v * 100).toFixed(1) + '%';
    });
    if (!ready) pct.textContent = `Đang tải ${Math.floor(local * 100)}%`;
    else if (!started() && humans > 1) {
      const done = all.filter((c) => c.human >= 0 && (c.me || (L[c.human] ?? 0) >= 100)).length;
      pct.textContent = `Chờ người chơi khác… ${done}/${humans}`;
    } else pct.textContent = 'Vào trận…';
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return asCover(el, { onReady: () => { ready = true; }, onClose: () => cancelAnimationFrame(raf) });
}

/** Trận trực tuyến (session = net/session.js): màn tải hiện ngay khi máy chủ báo vào trận. */
export function openOnlineLoading(session) {
  const cfg = session.cfg, p = profile();
  const w = createWorld({ map: mapOf(cfg.mode), seed: cfg.seed }), { humans } = setupOnline(w, cfg); // dựng thử: biết tướng máy chọn + phép
  const me = humans[session.me], heroes = w.entities.filter((e) => e.kind === 'hero');
  const entryOf = (e) => {
    const hi = humans.indexOf(e), pl = hi >= 0 ? cfg.players[hi] : null;
    return { hero: e.heroId, name: pl ? pl.name : `${HEROES[e.heroId].name} ${botLabel}`, me: hi === session.me, human: hi, spell: e.spell?.id || 'chop_buoc',
      stars: hi === session.me ? p.stars : pl ? (Number.isFinite(pl.stars) ? pl.stars : null) : p.stars };
  };
  const { ally, foe } = rowsOf(heroes, me.team, entryOf);
  return mount({ ally, foe, solo: cfg.mode !== '5v5', humans: humans.length, loads: () => session.loads, report: (f) => session.progress(f), started: () => session.started });
}

/** Vào thẳng trận (không qua màn tải của luồng ngoài trận): dựng màn tải từ trận vừa tạo. */
export function openWorldCover({ world, player }) {
  const heroes = world.entities.filter((e) => e.kind === 'hero');
  const entryOf = (e) => ({ hero: e.heroId, name: e === player ? profile().name : `${e.playerName || HEROES[e.heroId].name} ${botLabel}`, me: e === player, human: e === player ? 0 : -1, spell: e.spell?.id || 'chop_buoc', stars: null });
  const { ally, foe } = rowsOf(heroes, player.team, entryOf);
  return mount({ ally, foe, solo: world.map.lanes.length <= 1 });
}
