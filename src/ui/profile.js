// Hồ sơ người chơi (lưu trong máy, localStorage): tên, ảnh đại diện, tướng đứng ở sảnh, vàng, ngọc, cấp/kinh nghiệm, sao hạng, thống kê,
// nhiệm vụ ngày, thư, túi đồ, lịch sử trận. Bậc hạng theo 08 §1 (tên tự đặt): Đèn Dầu → Đèn Lồng → Đèn Kéo Quân → Đèn Trời → Hải Đăng →
// Sao Mai (mỗi bậc chia phân hạng, mỗi phân hạng vài sao) → Nguyệt Quang (tích sao không giới hạn) → Thái Dương (từ 30 sao Nguyệt Quang).
// Luật cộng/trừ sao: xem applyResult.
import { ALPHA } from '../data/heroes/index.js';

const KEY = 'la.profile';
const today = () => new Date().toISOString().slice(0, 10);
const DEF = () => ({
  name: 'Hiệp Sĩ Đèn', avatar: 'hoa_ren', feature: 'hoa_ren', gold: 1500, gems: 0, level: 1, exp: 0, stars: 0, best: 0,
  games: 0, wins: 0, ranked: 0, rankedWins: 0, kills: 0, deaths: 0, assists: 0, streak: 0, mvp: 0, scoreSum: 0, courage: 0, history: [], diff: 'normal',
  bag: { giu_sao_mvp: 2 }, // quà tân thủ: 2 Bùa Giữ Sao (MVP thua)
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

// —— Bậc hạng (08 §1) ——
export const TIERS = [
  { id: 'den_dau', name: 'Đèn Dầu', divs: 3, stars: 3, col: '#d0905c', safe: true },
  { id: 'den_long', name: 'Đèn Lồng', divs: 4, stars: 4, col: '#ff6a5a', safe: true },
  { id: 'keo_quan', name: 'Đèn Kéo Quân', divs: 4, stars: 4, col: '#ffb84a' },
  { id: 'den_troi', name: 'Đèn Trời', divs: 5, stars: 5, col: '#8fd0ff' },
  { id: 'hai_dang', name: 'Hải Đăng', divs: 5, stars: 5, col: '#7fe6d6' },
  { id: 'sao_mai', name: 'Sao Mai', divs: 5, stars: 5, col: '#ffd36a' },
  { id: 'nguyet_quang', name: 'Nguyệt Quang', divs: 0, stars: 0, col: '#d8d0ff' },
];
const SUN = { id: 'thai_duong', name: 'Thái Dương', col: '#ff9a3a', from: 30 }; // từ 30 sao Nguyệt Quang
export const HAI_DANG = 4; // từ bậc này trở lên mới rớt được bậc lớn
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** Sao tổng → { tier (chỉ số 0..7), name ("Đèn Lồng II"), short (tên bậc), star (sao trong phân hạng), max (sao tối đa, 0 = không giới hạn),
 *  col, start (sao tổng ở đầu bậc — "sàn bậc") }. */
export function rankOf(total) {
  let s = Math.max(0, total | 0), start = 0;
  for (let t = 0; t < TIERS.length; t++) {
    const T = TIERS[t];
    if (!T.divs) {
      if (s >= SUN.from) return { tier: t + 1, id: SUN.id, name: SUN.name, short: SUN.name, star: s, max: 0, col: SUN.col, start };
      return { tier: t, id: T.id, name: T.name, short: T.name, star: s, max: 0, col: T.col, start };
    }
    const span = T.divs * T.stars;
    if (s < span) { const d = Math.floor(s / T.stars); return { tier: t, id: T.id, name: `${T.name} ${ROMAN[T.divs - d]}`, short: T.name, star: s % T.stars, max: T.stars, col: T.col, start }; }
    s -= span; start += span;
  }
  return null;
}
/** Độ khó máy ở đấu hạng theo bậc (Đèn Dầu: Dễ … Nguyệt Quang / Thái Dương: Ác mộng). */
export const rankDifficulty = (total) => ['easy', 'easy', 'normal', 'normal', 'hard', 'hard', 'nightmare', 'nightmare'][rankOf(total).tier];

/** Kinh nghiệm cần để lên cấp kế tiếp. */
export const expNeed = (lv) => 80 + lv * 40;

// —— Nhiệm vụ ngày ——
export const MISSIONS = [
  { id: 'play1', name: 'Tham gia 1 trận bất kỳ', goal: 1, key: 'played', gold: 80 },
  { id: 'win1', name: 'Giành chiến thắng 1 trận', goal: 1, key: 'won', gold: 120 },
  { id: 'play3', name: 'Tham gia 3 trận', goal: 3, key: 'played', gold: 150, item: 'giu_sao_mvp' },
  { id: 'kill10', name: 'Hạ gục 10 tướng địch', goal: 10, key: 'kills', gold: 150 },
];
export function missionState(m) { const p = profile(), v = Math.min(m.goal, p.daily[m.key] || 0); return { v, done: v >= m.goal, claimed: p.daily.claimed.includes(m.id) }; }
export function claimMission(id) {
  const p = profile(), m = MISSIONS.find((x) => x.id === id); if (!m) return 0;
  const st = missionState(m); if (!st.done || st.claimed) return 0;
  p.daily.claimed.push(id); p.gold += m.gold; if (m.item) addItem(m.item); saveProfile(); return m.gold;
}
export const missionsReady = () => MISSIONS.filter((m) => { const s = missionState(m); return s.done && !s.claimed; }).length;

// —— Túi đồ (08 §3) ——
export const BAG_ITEMS = {
  giu_sao_mvp: { name: 'Bùa Giữ Sao (MVP thua)', desc: 'Tự dùng sau trận đấu hạng thua khi bạn là MVP đội thua: không bị trừ sao.' },
};
export const itemCount = (id) => profile().bag?.[id] || 0;
export function addItem(id, n = 1) { const p = profile(); p.bag = { ...(p.bag || {}) }; p.bag[id] = Math.max(0, (p.bag[id] || 0) + n); }

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

// —— Cơ chế tính điểm thắng / thua (đấu hạng, 08 §1) ——
// Thắng +1 sao; chuỗi thắng từ 3 trận (dưới Nguyệt Quang) +1 sao thưởng. Thua −1 sao, trừ khi:
//  • đang ở Đèn Dầu / Đèn Lồng (bảo vệ người mới); • dưới Hải Đăng đã ở "sàn bậc" (không rớt bậc lớn);
//  • là MVP đội thua và có Bùa Giữ Sao (MVP thua) — tự dùng; • thanh Điểm tích luỹ đầy.
// Điểm tích luỹ mỗi trận: thắng 10 + điểm trận, thua điểm trận / 2. Đầy 100 thì dùng ngay trong trận đó: thắng → +1 sao, thua → giữ sao
// (thua mà không mất sao vì luật khác thì giữ lại thanh đầy cho lần sau).
// Vàng / kinh nghiệm (mọi chế độ trừ luyện tập): nền thắng/thua + theo điểm trận + thưởng MVP; đấu đơn 1v1 nhận 70%.
export const COURAGE_MAX = 100;
const MODE_GOLD = { normal: 1, ranked: 1, solo: 0.7 };

/**
 * Ghi kết quả trận vào hồ sơ. r: { mode: 'normal'|'ranked'|'solo'|'training', win, heroId, kills, deaths, assists, score, mvp ('gold'|'silver'|null) }.
 * Trả về phần thưởng cho màn kết quả: { gold, exp, stars (±), notes: [lý do], courage: { gain, now, used } (điểm tích luỹ), rankBefore, rankAfter, levelUp, level }.
 */
export function applyResult({ mode, win, heroId = null, kills = 0, deaths = 0, assists = 0, score = 0, mvp = null }) {
  const p = profile(), before = rankOf(p.stars);
  const out = { gold: 0, exp: 0, stars: 0, notes: [], courage: null, rankBefore: before, rankAfter: before, levelUp: false, level: p.level };
  if (mode === 'training') return out;
  const mult = MODE_GOLD[mode] || 1;
  out.gold = Math.round(((win ? 100 : 50) + score * 6 + (mvp ? 30 : 0)) * mult);
  out.exp = Math.round((win ? 60 : 30) + score * 2);
  p.games++; if (win) p.wins++; p.kills += kills; p.deaths += deaths; p.assists += assists; p.streak = win ? Math.max(1, p.streak + 1) : Math.min(-1, p.streak - 1);
  p.scoreSum = (p.scoreSum || 0) + score; if (mvp) p.mvp = (p.mvp || 0) + 1;
  p.daily.played++; if (win) p.daily.won++; p.daily.kills += kills;
  if (mode === 'ranked') {
    p.ranked++; if (win) p.rankedWins++;
    const gain = Math.round(win ? 10 + score : score / 2); let cg = Math.min(COURAGE_MAX, (p.courage || 0) + gain), used = false;
    if (win) {
      out.stars = 1;
      if (p.streak >= 3 && before.tier < TIERS.length - 1) { out.stars++; out.notes.push(`Chuỗi ${p.streak} trận thắng: +1 sao`); }
      if (cg >= COURAGE_MAX) { out.stars++; cg = 0; used = true; out.notes.push('Điểm tích luỹ đầy: +1 sao'); }
    } else if (TIERS[before.tier]?.safe) out.notes.push(`${before.short}: thua không mất sao`);
    else if (before.tier < HAI_DANG && p.stars <= before.start) out.notes.push(`Sàn bậc ${before.short}: không rớt bậc`);
    else if (mvp && itemCount('giu_sao_mvp') > 0) { addItem('giu_sao_mvp', -1); out.notes.push('Dùng Bùa Giữ Sao (MVP thua): không mất sao'); }
    else if (cg >= COURAGE_MAX) { cg = 0; used = true; out.notes.push('Điểm tích luỹ đầy: giữ sao'); }
    else out.stars = -1;
    p.courage = cg; out.courage = { gain, now: cg, used };
    p.stars = Math.max(0, p.stars + out.stars); p.best = Math.max(p.best, p.stars);
    out.rankAfter = rankOf(p.stars);
  }
  p.gold += out.gold; p.exp += out.exp;
  while (p.exp >= expNeed(p.level)) { p.exp -= expNeed(p.level); p.level++; out.levelUp = true; }
  out.level = p.level;
  p.history = [{ t: Date.now(), mode, win, heroId, k: kills, d: deaths, a: assists, score, mvp: mvp || null }, ...(p.history || [])].slice(0, 20);
  saveProfile();
  return out;
}
