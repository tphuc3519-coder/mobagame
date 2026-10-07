// Hồ sơ người chơi (lưu trong máy, localStorage): tên, ảnh đại diện, tướng đứng ở sảnh, vàng, ngọc, cấp/kinh nghiệm, sao hạng, thống kê,
// nhiệm vụ ngày, thư đã nhận. Bậc hạng kiểu Liên Quân: Đồng → Bạc → Vàng → Bạch Kim → Kim Cương → Tinh Anh (mỗi bậc chia hạng, mỗi hạng
// vài sao) → Cao Thủ (cộng sao không giới hạn). Thắng đấu hạng +1 sao, thua −1 (không tụt khỏi bậc Đồng III 0 sao).
import { ALPHA } from '../data/heroes/index.js';

const KEY = 'la.profile';
const today = () => new Date().toISOString().slice(0, 10);
const DEF = () => ({
  name: 'Hiệp Sĩ Đèn', avatar: 'hoa_ren', feature: 'hoa_ren', gold: 1500, gems: 0, level: 1, exp: 0, stars: 0, best: 0,
  games: 0, wins: 0, ranked: 0, rankedWins: 0, kills: 0, deaths: 0, assists: 0, streak: 0,
  daily: { day: today(), played: 0, won: 0, kills: 0, claimed: [] }, mail: [], login: '', lastHero: 'hoa_ren', spell: 'chop_buoc', page: null,
});

let P = null;
/** Hồ sơ hiện tại (đọc một lần, sửa trực tiếp rồi gọi saveProfile). Không đọc/ghi được bộ nhớ (chế độ riêng tư) thì dùng bản tạm. */
export function profile() {
  if (P) return P;
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { raw = null; }
  P = { ...DEF(), ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!ALPHA.includes(P.feature)) P.feature = 'hoa_ren';
  if (!ALPHA.includes(P.avatar)) P.avatar = P.feature;
  if (!P.daily || P.daily.day !== today()) P.daily = { day: today(), played: 0, won: 0, kills: 0, claimed: [] };
  return P;
}
export function saveProfile() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) { /* không lưu được thì thôi */ } }

// —— Bậc hạng ——
export const TIERS = [
  { id: 'dong', name: 'Đồng', divs: 3, stars: 3, col: '#c98a5a' },
  { id: 'bac', name: 'Bạc', divs: 3, stars: 3, col: '#c9d4e4' },
  { id: 'vang', name: 'Vàng', divs: 4, stars: 4, col: '#ffd36a' },
  { id: 'bachkim', name: 'Bạch Kim', divs: 5, stars: 4, col: '#7fe6d6' },
  { id: 'kimcuong', name: 'Kim Cương', divs: 5, stars: 5, col: '#8fb8ff' },
  { id: 'tinhanh', name: 'Tinh Anh', divs: 5, stars: 5, col: '#c79bff' },
  { id: 'caothu', name: 'Cao Thủ', divs: 0, stars: 0, col: '#ffb15c' },
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** Sao tổng → { tier (chỉ số), name ("Vàng II"), star (sao trong hạng), max (sao tối đa của hạng, 0 = không giới hạn), col }. */
export function rankOf(total) {
  let s = Math.max(0, total | 0);
  for (let t = 0; t < TIERS.length; t++) {
    const T = TIERS[t];
    if (!T.divs) return { tier: t, id: T.id, name: T.name, short: T.name, star: s, max: 0, col: T.col };
    const span = T.divs * T.stars;
    if (s < span) { const d = Math.floor(s / T.stars); return { tier: t, id: T.id, name: `${T.name} ${ROMAN[T.divs - d]}`, short: T.name, star: s % T.stars, max: T.stars, col: T.col }; }
    s -= span;
  }
  return null;
}
/** Độ khó máy ở đấu hạng theo bậc (Đồng: Dễ … Tinh Anh/Cao Thủ: Ác mộng). */
export const rankDifficulty = (total) => ['easy', 'normal', 'normal', 'hard', 'hard', 'nightmare', 'nightmare'][rankOf(total).tier];

/** Kinh nghiệm cần để lên cấp kế tiếp. */
export const expNeed = (lv) => 80 + lv * 40;

// —— Nhiệm vụ ngày ——
export const MISSIONS = [
  { id: 'play1', name: 'Tham gia 1 trận bất kỳ', goal: 1, key: 'played', gold: 80 },
  { id: 'win1', name: 'Giành chiến thắng 1 trận', goal: 1, key: 'won', gold: 120 },
  { id: 'play3', name: 'Tham gia 3 trận', goal: 3, key: 'played', gold: 150 },
  { id: 'kill10', name: 'Hạ gục 10 tướng địch', goal: 10, key: 'kills', gold: 150 },
];
export function missionState(m) { const p = profile(), v = Math.min(m.goal, p.daily[m.key] || 0); return { v, done: v >= m.goal, claimed: p.daily.claimed.includes(m.id) }; }
export function claimMission(id) {
  const p = profile(), m = MISSIONS.find((x) => x.id === id); if (!m) return 0;
  const st = missionState(m); if (!st.done || st.claimed) return 0;
  p.daily.claimed.push(id); p.gold += m.gold; saveProfile(); return m.gold;
}
export const missionsReady = () => MISSIONS.filter((m) => { const s = missionState(m); return s.done && !s.claimed; }).length;

// —— Thư (quà chào mừng + quà đăng nhập mỗi ngày) ——
export function mailbox() {
  const p = profile();
  if (!p.mail.some((m) => m.id === 'welcome')) p.mail.push({ id: 'welcome', title: 'Chào mừng tới Lantern Arena!', body: 'Đèn lồng đã thắp, đấu trường đã mở. Nhận chút lộ phí để bắt đầu hành trình nhé.', gold: 500, got: false });
  const d = today();
  if (!p.mail.some((m) => m.id === 'login-' + d)) p.mail.push({ id: 'login-' + d, title: 'Quà đăng nhập hằng ngày', body: 'Cảm ơn bạn đã ghé đấu trường hôm nay.', gold: 100, got: false });
  if (p.mail.length > 12) p.mail = p.mail.slice(-12);
  return p.mail;
}
export const mailUnread = () => mailbox().filter((m) => !m.got).length;
export function claimMail(id) { const m = mailbox().find((x) => x.id === id); if (!m || m.got) return 0; m.got = true; profile().gold += m.gold || 0; saveProfile(); return m.gold || 0; }

/**
 * Ghi kết quả trận vào hồ sơ: { mode: 'normal'|'ranked'|'solo'|'training', win, kills, deaths, assists }.
 * Trả về phần thưởng để màn kết quả hiển thị: { gold, exp, stars (±), rankBefore, rankAfter, levelUp }.
 */
export function applyResult({ mode, win, kills = 0, deaths = 0, assists = 0 }) {
  const p = profile(), before = rankOf(p.stars), out = { gold: 0, exp: 0, stars: 0, rankBefore: before, rankAfter: before, levelUp: false };
  if (mode === 'training') return out;
  out.gold = (win ? 120 : 60) + Math.min(80, (kills + assists) * 6);
  out.exp = win ? 60 : 30;
  p.games++; if (win) p.wins++; p.kills += kills; p.deaths += deaths; p.assists += assists; p.streak = win ? Math.max(1, p.streak + 1) : Math.min(-1, p.streak - 1);
  p.daily.played++; if (win) p.daily.won++; p.daily.kills += kills;
  if (mode === 'ranked') {
    p.ranked++; if (win) p.rankedWins++;
    out.stars = win ? (p.streak >= 3 ? 2 : 1) : -1; // chuỗi thắng từ 3 trận: +2 sao
    p.stars = Math.max(0, p.stars + out.stars); p.best = Math.max(p.best, p.stars);
    out.rankAfter = rankOf(p.stars);
  }
  p.gold += out.gold; p.exp += out.exp;
  while (p.exp >= expNeed(p.level)) { p.exp -= expNeed(p.level); p.level++; out.levelUp = true; }
  saveProfile();
  return out;
}
