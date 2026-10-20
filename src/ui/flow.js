// Điều phối các màn ngoài trận kiểu Liên Quân: sảnh → (chọn chế độ) → phòng chờ → ghép trận → chọn tướng → đội hình → tải trận → trận
// → kết quả (3 màn). Mỗi lúc một màn (go đóng màn cũ, mở màn mới); trạng thái trận đang chuẩn bị nằm trong S (modes.js).
// Rời màn kết quả (Sảnh / Đấu lại) ngay trong trang: trận tự dọn (game.js dispose — listener, DOM, bộ nhớ GPU; renderer cất lại giữ
// shader đã dịch). Dọn lỗi, hoặc đã đủ END.reloadEvery trận trong lần mở trang này, thì tải lại trang như cũ (màn kế ghi vào sessionStorage).
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
import { openDraft } from './draft.js';
import { openLineup } from './lineup.js';
import { openLoading } from './loading.js';
import { openPostgame } from './postgame.js';
import { screenSound } from '../audio/uiSounds.js';
import { END } from '../data/endgame.js';
import { pwaLobby } from './pwa.js';

const SCREENS = { home: openHome, room: openRoom, pick: openPick, draft: openDraft, lineup: openLineup, loading: openLoading };
const NEXT = 'la.next';
const ui = () => document.getElementById('ui');
let cur = null, match = null, played = 0;

export const nav = {
  /** Mở màn `name` (home | room | pick | draft (cấm/chọn đấu hạng) | lineup | loading), đóng màn đang mở. */
  go(name, args = {}) {
    const prev = cur; cur = null;
    try { prev?.close?.(); } catch (e) { console.warn(e); }
    ui().querySelectorAll(':scope > .ui-dlg, :scope > .ui-panel').forEach((x) => x.remove()); // hộp thoại / bảng còn mở của màn cũ (vd. hết giờ chọn tướng khi đang chọn phép)
    ui().hidden = false; screenSound(name);
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
    match = startMatch({
      mode: M.map, heroId: P.heroId, enemyId: P.foeHeroes[0] || null, allies: M.map === '5v5' ? P.allyHeroes : undefined, foes: M.map === '5v5' ? P.foeHeroes : undefined,
      spellId: P.spellId, charmId: P.charmId, loadout: P.charm ? { spellId: P.spellId, charm: P.charm, emblem: P.emblem } : undefined, difficulty: modeDiff(S.mode), dummies: P.dummies, bot: !P.dummies, seed: A.seed, names,
      ...(M.map === '5v5' ? { playerRole: P.role || undefined, allyRoles: P.allyRoles, foeRoles: P.foeRoles } : {}), // vị trí chốt ở màn chọn
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
function hardLeave(next) {
  try { sessionStorage.setItem(NEXT, JSON.stringify(next)); } catch (_) { /* không lưu được: về sảnh */ }
  location.reload();
}
function leave(next) {
  const t0 = performance.now();
  if (++played >= END.reloadEvery) return hardLeave(next); // phòng rò bộ nhớ chưa biết: lâu lâu làm mới cả trang
  try {
    document.getElementById('pg')?.remove(); window.__post = null;
    const m = match; match = null; m?.dispose?.();
    ensureStageDom();
    nav.go(next.to, { mode: next.mode || S.mode });
    window.__flow.backMs = Math.round(performance.now() - t0); // kiểm thử: thời gian từ bấm tới màn kế
    pwaLobby(); // có bản mới đang chờ thì hỏi ở Sảnh / Phòng chờ
  } catch (e) { console.warn('Dọn trận lỗi — tải lại trang', e); hardLeave(next); }
}
/** Sân khấu sảnh (#showbg, #show, #showload) — vào trận đã gỡ hai phần tử; về sảnh trong trang thì dựng lại phần còn thiếu. */
function ensureStageDom() {
  const u = ui();
  if (!u.querySelector(':scope > #showbg')) u.insertAdjacentHTML('afterbegin', '<div id="showbg" class="home"></div>');
  if (!u.querySelector(':scope > #show')) u.querySelector(':scope > #showbg').insertAdjacentHTML('afterend', '<canvas id="show"></canvas>');
  if (!u.querySelector(':scope > #showload')) u.querySelector(':scope > #show').insertAdjacentHTML('afterend', '<div id="showload"><i></i><span>Đang tải tướng…</span></div>');
}
/** Chỉ hỏi cập nhật ở Sảnh / Phòng chờ (không bao giờ giữa chọn tướng / trận / kết quả). */
export const canPromptUpdate = () => nav.screen === 'home' || nav.screen === 'room';
/** Màn cần mở sau khi tải lại trang (Sảnh / Đấu lại từ màn kết quả), đọc một lần. */
export function takeNext() {
  try { const v = JSON.parse(sessionStorage.getItem(NEXT) || 'null'); sessionStorage.removeItem(NEXT); return v && SCREENS[v.to] ? v : null; } catch (_) { return null; }
}
/** Mở màn đầu tiên sau màn tải game. */
export function enter(next) {
  ensureStageDom();
  if (next?.party) S.party = FRIENDS.filter((f) => next.party.includes(f.id));
  if (next?.mode && MODES[next.mode]) S.mode = next.mode;
  nav.go(next?.to || 'home', { mode: next?.mode || S.mode });
}
window.__flow = { nav, S, seen: [] };
