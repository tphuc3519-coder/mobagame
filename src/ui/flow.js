// Điều phối các màn ngoài trận kiểu Liên Quân: sảnh → (chọn chế độ) → phòng chờ → ghép trận → chọn tướng → đội hình → tải trận → trận
// → kết quả (3 màn). Mỗi lúc một màn (go đóng màn cũ, mở màn mới); trạng thái trận đang chuẩn bị nằm trong S (modes.js).
// Rời màn kết quả (Sảnh / Đấu lại) thì tải lại trang: trận dựng nhiều thứ toàn cục (renderer, HUD, sự kiện) nên làm mới là sạch nhất;
// màn cần mở tiếp ghi tạm vào sessionStorage.
import { HEROES } from '../data/heroes/index.js';
import { startMatch } from '../game.js';
import { profile, applyResult } from './profile.js';
import { scoreMatch } from './score.js';
import { botLabel, FRIENDS } from './people.js';
import { MODES, S, modeDiff } from './modes.js';
import { stageDispose } from './stage.js';
import { openHome } from './home.js';
import { openRoom } from './room.js';
import { openPick } from './pick.js';
import { openLineup } from './lineup.js';
import { openLoading } from './loading.js';
import { openPostgame } from './postgame.js';

const SCREENS = { home: openHome, room: openRoom, pick: openPick, lineup: openLineup, loading: openLoading };
const NEXT = 'la.next';
const ui = () => document.getElementById('ui');
let cur = null;

export const nav = {
  /** Mở màn `name` (home | room | pick | lineup | loading), đóng màn đang mở. */
  go(name, args = {}) {
    const prev = cur; cur = null;
    try { prev?.close?.(); } catch (e) { console.warn(e); }
    ui().querySelectorAll(':scope > .ui-dlg, :scope > .ui-panel').forEach((x) => x.remove()); // hộp thoại / bảng còn mở của màn cũ (vd. hết giờ chọn tướng khi đang chọn phép)
    ui().hidden = false;
    cur = { name, close: SCREENS[name](nav, args) };
    window.__flow.seen.push(name); // kiểm thử tự động: các màn đã qua
  },
  get screen() { return cur?.name || null; },
  /** Vào trận theo S (sau màn tải). */
  start() {
    try { cur?.close?.(); } catch (e) { console.warn(e); }
    cur = null; stageDispose();
    const u = ui(); u.hidden = true; u.querySelectorAll(':scope > :not(#show)').forEach((x) => x.remove());
    const p = profile(), M = MODES[S.mode], P = S.pick, A = S.match;
    const names = [{ [P.heroId]: p.name }, {}];
    P.allyHeroes.forEach((h, i) => { names[0][h] = A.allies[i].name; });
    P.foeHeroes.forEach((h, i) => { names[1][h] = A.foes[i].name; });
    startMatch({
      mode: M.map, heroId: P.heroId, enemyId: P.foeHeroes[0] || null, allies: M.map === '5v5' ? P.allyHeroes : undefined, foes: M.map === '5v5' ? P.foeHeroes : undefined,
      spellId: P.spellId, charmId: P.charmId, difficulty: modeDiff(S.mode), dummies: P.dummies, bot: !P.dummies, seed: A.seed, names,
      surrenderAfter: M.ranked ? 480 : 0, // đấu hạng: đầu hàng từ phút 8 (07 §9)
      onGameOver: gameOver,
    });
  },
};

function gameOver({ world, player, winner }) {
  const heroes = world.entities.filter((e) => e.kind === 'hero');
  const rows = scoreMatch(heroes, winner), me = rows.find((r) => r.id === player.id);
  const rewards = applyResult({ mode: S.mode, win: winner === player.team, heroId: player.heroId, kills: me.k, deaths: me.d, assists: me.a, score: me.score, mvp: me.mvp, kda: me.kda });
  const names = {}; for (const h of heroes) names[h.id] = h === player ? profile().name : `${h.playerName || HEROES[h.heroId].name} ${botLabel}`;
  openPostgame({
    rows, myId: player.id, myTeam: player.team, winner, names, ticks: world.tick, mode: S.mode, modeName: MODES[S.mode].name, rewards,
    surrender: world.over?.surrender === undefined ? null : world.over.surrender === player.team ? 'Đội ta đầu hàng' : 'Đối thủ đầu hàng',
    onHome: () => leave({ to: 'home' }),
    onAgain: () => leave({ to: MODES[S.mode].room ? 'room' : 'pick', mode: S.mode, party: S.party.map((f) => f.id) }),
  });
  window.__flow.result = { rows, rewards };
}
function leave(next) {
  try { sessionStorage.setItem(NEXT, JSON.stringify(next)); } catch (_) { /* không lưu được: về sảnh */ }
  location.reload();
}
/** Màn cần mở sau khi tải lại trang (Sảnh / Đấu lại từ màn kết quả), đọc một lần. */
export function takeNext() {
  try { const v = JSON.parse(sessionStorage.getItem(NEXT) || 'null'); sessionStorage.removeItem(NEXT); return v && SCREENS[v.to] ? v : null; } catch (_) { return null; }
}
/** Mở màn đầu tiên sau màn tải game. */
export function enter(next) {
  const u = ui(); if (!u.querySelector('#show')) u.insertAdjacentHTML('afterbegin', '<div id="showbg" class="home"></div><canvas id="show"></canvas><div id="showload"><i></i><span>Đang tải tướng…</span></div>');
  if (next?.party) S.party = FRIENDS.filter((f) => next.party.includes(f.id));
  if (next?.mode && MODES[next.mode]) S.mode = next.mode;
  nav.go(next?.to || 'home', { mode: next?.mode || S.mode });
}
window.__flow = { nav, S, seen: [] };
