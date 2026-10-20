// Luật cấm/chọn đấu hạng (07 §7.3) — máy trạng thái thuần (không DOM, chạy được trong node; màn ui/draft.js chỉ vẽ + hẹn giờ).
// D.seq: danh sách lượt { act: 'ban'|'pick', team, n }; mỗi lượt có "người thực hiện" (actors) theo ghế: lượt cấm thứ k của một đội do
// ghế k làm, lượt chọn lần lượt ghế 0→4. Một tướng chỉ cấm / chọn được một lần cho cả hai đội. Máy cấm / chọn qua botBan / botPick
// với rnd truyền vào (ngẫu nhiên có seed) để kiểm thử dựng lại đúng từng ván.
import { ALPHA } from '../data/heroes/index.js';
import { DRAFT, BAN_BIAS } from '../data/draft.js';
import { fit, choose, recommend } from './roles.js';

/** Ván cấm/chọn mới. roles: [[vị trí 5 ghế đội Xanh], [5 ghế đội Đỏ]]; meSeat: ghế người chơi ở đội Xanh (0..4). */
export function createDraft({ seq, roles, meSeat }) {
  return { seq, ti: -1, roles, meSeat, bans: [[], []], picks: [Array(5).fill(null), Array(5).fill(null)], banSeat: [0, 0], pickSeat: [0, 0], turn: null, actors: [], done: false };
}
/** Sang lượt kế tiếp (hết lượt: D.done). */
export function startTurn(D) {
  D.ti++;
  if (D.ti >= D.seq.length) { D.done = true; D.turn = null; D.actors = []; return D; }
  const T = D.turn = D.seq[D.ti], mk = (seat) => ({ team: T.team, seat, act: T.act, done: false, hero: null, me: T.team === 0 && seat === D.meSeat });
  D.actors = T.act === 'ban' ? [mk(D.banSeat[T.team]++)] : Array.from({ length: T.n }, () => mk(D.pickSeat[T.team]++));
  return D;
}
export const isAvail = (D, id) => ALPHA.includes(id) && !D.bans[0].includes(id) && !D.bans[1].includes(id) && !D.picks[0].includes(id) && !D.picks[1].includes(id);
export const available = (D) => ALPHA.filter((id) => isAvail(D, id));
export const actorFor = (D, team, seat) => D.actors.find((a) => !a.done && a.team === team && a.seat === seat) || null;
export const turnDone = (D) => D.actors.length > 0 && D.actors.every((a) => a.done);
export const bansPerSide = (seq) => seq.filter((t) => t.act === 'ban' && t.team === 0).length;

/** Thực hiện lượt của ghế (team, seat): cấm hero (null = bỏ lượt cấm) hoặc chọn hero. → { ok, reason: 'turn' | 'taken' }. */
export function act(D, team, seat, hero) {
  const a = actorFor(D, team, seat);
  if (!a) return { ok: false, reason: 'turn' };
  if (a.act === 'ban') { if (hero != null && !isAvail(D, hero)) return { ok: false, reason: 'taken' }; D.bans[team].push(hero ?? null); }
  else { if (!isAvail(D, hero)) return { ok: false, reason: 'taken' }; D.picks[team][seat] = hero; }
  a.done = true; a.hero = hero ?? null;
  return { ok: true };
}
/** Vị trí của đội `team` chưa có tướng (bỏ ghế `except` — vd chính ghế đang chọn). */
export const unpickedRoles = (D, team, except = -1) => D.roles[team].filter((r, s) => r && s !== except && D.picks[team][s] == null);
/** Tướng còn lại đúng vị trí (độ hợp 2). */
export const fit2Left = (D, role) => ALPHA.filter((id) => isAvail(D, id) && fit(role, id) === 2);
/** Tướng đội `team` không tự cấm: lựa chọn đúng vị trí cuối cùng (≤ DRAFT.protectMin) của vị trí mình chưa chọn. */
export function protectedFor(D, team, except = -1) {
  const out = new Set();
  for (const r of unpickedRoles(D, team, except)) { const l = fit2Left(D, r); if (l.length <= DRAFT.protectMin) l.forEach((id) => out.add(id)); }
  return [...out];
}
/** Máy cấm cho đội `team`. Đối thủ (đội 1) có `main` (tướng tủ của người chơi) thì cấm nó với tỉ lệ banMainOdds; còn lại bốc theo trọng số
 *  1 + BAN_BIAS + banDenyWeight (tướng đúng vị trí mà đội kia còn thiếu). Không cấm tướng được bảo vệ của chính đội; hết lựa chọn → bỏ lượt (null). */
export function botBan(D, team, rnd, { avoid = [], main = null } = {}) {
  const av = available(D), prot = protectedFor(D, team);
  if (main && team === 1 && av.includes(main) && !prot.includes(main) && rnd() < DRAFT.banMainOdds) return main;
  let pool = av.filter((id) => !prot.includes(id) && !avoid.includes(id));
  if (!pool.length) pool = av.filter((id) => !prot.includes(id));
  if (!pool.length) return null;
  const opp = unpickedRoles(D, 1 - team);
  const w = pool.map((id) => 1 + (BAN_BIAS[id] || 0) + (opp.some((r) => fit(r, id) === 2) ? DRAFT.banDenyWeight : 0));
  let x = rnd() * w.reduce((s, v) => s + v, 0);
  for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x < 0) return pool[i]; }
  return pool[pool.length - 1];
}
/** Máy chọn tướng cho ghế (team, seat) theo vị trí của ghế; tránh lấy lựa chọn đúng vị trí cuối cùng của đồng đội khác chưa chọn. */
export function botPick(D, team, seat, rnd, { avoid = [] } = {}) {
  const role = D.roles[team][seat], pool = available(D), others = unpickedRoles(D, team, seat);
  const last = new Set(); for (const r of others) { const l = fit2Left(D, r); if (l.length <= DRAFT.protectMin) l.forEach((id) => last.add(id)); }
  const reserve = pool.filter((id) => last.has(id)); // phạt nhẹ (DRAFT.reservePenalty < khoảng cách giữa hai mức hợp): chỉ đổi thứ tự trong cùng mức hợp
  return choose(role, pool, rnd, { avoid, reserve });
}
/** Hết giờ: khoá tướng đang xem nếu còn chọn được, không thì tướng hợp vị trí nhất còn lại. */
export function autoPick(D, team, seat, hover) {
  return isAvail(D, hover) ? hover : recommend(D.roles[team][seat], available(D))[0];
}
/** Tướng tủ của người chơi từ lịch sử trận (≥ banHistoryMin trận; tướng ≥ banHeroMin trận, tỉ lệ thắng ≥ banMainMinRate); không có → null. */
export function heroMain(history = []) {
  if (history.length < DRAFT.banHistoryMin) return null;
  const by = {};
  for (const h of history) if (ALPHA.includes(h?.heroId)) { const o = (by[h.heroId] ||= { g: 0, w: 0 }); o.g++; if (h.win) o.w++; }
  const c = Object.entries(by).filter(([, o]) => o.g >= DRAFT.banHeroMin && o.w / o.g >= DRAFT.banMainMinRate)
    .sort((a, b) => b[1].w / b[1].g - a[1].w / a[1].g || b[1].g - a[1].g || (a[0] < b[0] ? -1 : 1));
  return c.length ? c[0][0] : null;
}
