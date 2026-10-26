// Hồ sơ người chơi (lưu trong máy, localStorage): tên, ảnh đại diện, tướng đứng ở sảnh, vàng, ngọc, cấp/kinh nghiệm, sao hạng, thống kê,
// nhiệm vụ ngày / tuần / sự kiện, thư, túi đồ, rương, lịch sử trận. Bậc hạng theo 08 §1 (tên tự đặt): Đèn Dầu → Đèn Lồng → Đèn Kéo Quân → Đèn Trời → Hải Đăng →
// Sao Mai (mỗi bậc chia phân hạng, mỗi phân hạng vài sao) → Nguyệt Quang (tích sao không giới hạn) → Thái Dương (từ 30 sao Nguyệt Quang).
// Luật cộng/trừ sao: xem applyResult.
import { ALPHA, HEROES } from '../data/heroes/index.js';
import { RESET_HOUR, DAILY_N, DAILY_POOL, WEEKLY, WEEK_BONUS, EVENT } from '../data/missions.js';
import { migrateProfile, SAVE_VER } from './save.js';
import { BAG, CHEST, SHARD_SHOP } from '../data/rewards.js';
import { seasonAt } from '../data/seasons.js';
import { seasonFields, rollSeason, seasonTrack, journeyList, journeyTake, chooseSkinHero, toggleSkin, ownsCostume, wearCostume } from './season.js';
import { COSTUMES, GEM_SHOP, GEM_FROM, costumeOf } from '../data/shop.js';
import { SKIN_LOCKED } from '../data/seasons.js';
import { hqFields, hqApply, rankFull, peakState } from './haoQuang.js';

const KEY = 'la.profile';
const DEF = () => ({
  name: 'Hiệp Sĩ Đèn', avatar: 'hoa_ren', feature: 'hoa_ren', gold: 1500, gems: 0, level: 1, exp: 0, stars: 0, best: 0,
  games: 0, wins: 0, ranked: 0, rankedWins: 0, kills: 0, deaths: 0, assists: 0, streak: 0, mvp: 0, scoreSum: 0, courage: 0, history: [], diff: 'normal',
  bag: { giu_sao_mvp: 2 }, // quà tân thủ: 2 Bùa Giữ Sao (MVP thua) — không hạn (vật phẩm không hạn đếm ở bag, có hạn ở timed)
  timed: [], manh: 0, gao: 0, chestN: 0, chests: 0, x2Armed: false, // GĐ4d: vật phẩm có hạn [{ id, exp }], Mảnh Tướng, Gạo Hội, rương
  season: null, seasonPeak: 0, seasonWins: 0, mastery: {}, journey: [], frames: [], frame: null, skins: [], skinHero: null, skinOn: {}, // GĐ4b: mùa giải (ui/season.js)
  costumes: [], // GĐ5b: trang phục cửa hàng ngọc 'tướng:màu'
  hq: null, hqBest: 0, hqTitle: 0, galaxyPeak: false, // GĐ4c: Điểm Hào Quang (null: chưa vào Nguyệt Quang), Thiên Hà (ui/haoQuang.js)
  daily: null, weekly: null, event: null, mail: [], login: '', lastHero: 'hoa_ren', spell: 'chop_buoc', page: null,
  rolePri: null, roleSec: null, spellJungle: 'thu_hoach', // vị trí 5v5 (data/roles.js) + phép nhớ riêng khi đi rừng
  charmPages: [], heroPage: {}, emblems: {}, // trang bùa riêng (u1..u10), trang nhớ theo tướng, phù hiệu theo tướng — ui/loadout.js
});

let P = null;
/** Hồ sơ hiện tại (đọc một lần, sửa trực tiếp rồi gọi saveProfile). Không đọc/ghi được bộ nhớ (chế độ riêng tư) thì dùng bản tạm. */
export function profile() {
  if (P) return P;
  let raw = null, text = null;
  try { text = localStorage.getItem(KEY); raw = JSON.parse(text || 'null'); } catch (_) { raw = null; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    // hồ sơ hỏng (ghi dở, sửa tay): cất bản gốc vào la.profile.bak rồi bắt đầu hồ sơ mới — không mất hẳn dữ liệu cũ
    if (text) try { localStorage.setItem(KEY + '.bak', text); } catch (_) { /* riêng tư */ }
    raw = null;
  }
  P = migrateProfile({ ...DEF(), ...(raw || {}) }, raw ? raw.version : SAVE_VER); // GĐ4a: bản cũ chuyển sang bản hiện tại (ui/save.js)
  if (!ALPHA.includes(P.feature)) P.feature = 'hoa_ren';
  if (!ALPHA.includes(P.avatar)) P.avatar = P.feature;
  pruneBag(); seasonFields(P); hqFields(P);
  return P;
}
export function saveProfile() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) { /* không lưu được thì thôi */ } }

// —— Bậc hạng (08 §1): bảng + rankOf ở data/ranks.js (dùng chung với logic mùa giải ui/season.js) ——
import { TIERS, HAI_DANG, rankOf, starsAt } from '../data/ranks.js';
export { TIERS, HAI_DANG, rankOf, starsAt };

/** Bậc để hiển thị của người chơi (Thái Dương lọt top 50 bảng Hào Quang → Thiên Hà). */
export const rankNow = () => rankFull(profile());
/** Đấu Đỉnh Cao có mở không (giờ thiết bị + bậc): { open, reason }. */
export const peakNow = (now = Date.now()) => peakState(profile(), now);
/** Chế độ tính sao hạng: Đấu hạng và Đấu Đỉnh Cao. */
export const isRankedMode = (mode) => mode === 'ranked' || mode === 'peak';

/** Độ khó máy ở đấu hạng theo bậc (Đèn Dầu: Dễ … Nguyệt Quang / Thái Dương: Ác mộng). */
export const rankDifficulty = (total) => ['easy', 'easy', 'normal', 'normal', 'hard', 'hard', 'nightmare', 'nightmare'][rankOf(total).tier];

/** Kinh nghiệm cần để lên cấp kế tiếp. */
export const expNeed = (lv) => 80 + lv * 40;

// —— Nhiệm vụ ngày / tuần / sự kiện tích luỹ (08 §6, GĐ4e — số liệu: data/missions.js) ——
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Khoá ngày / tuần theo giờ thiết bị, làm mới lúc 04:00 (tuần: thứ Hai 04:00). */
export const dayKey = (now = Date.now()) => ymd(new Date(now - RESET_HOUR * 3600000));
export function weekKey(now = Date.now()) { const d = new Date(now - RESET_HOUR * 3600000); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
/** 3 nhiệm vụ ngày bốc theo seed của ngày (mọi lần mở trong ngày ra cùng 3 nhiệm vụ), tối đa 1 nhiệm vụ "thắng với vai…". */
export function dailyIds(key) {
  let a = 2166136261; for (const ch of key) { a ^= ch.charCodeAt(0); a = Math.imul(a, 16777619) >>> 0; }
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = DAILY_POOL.slice(), out = [];
  while (out.length < DAILY_N && pool.length) { const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; if (!(m.key.startsWith('win_') && out.some((x) => x.key.startsWith('win_')))) out.push(m); }
  return out.map((m) => m.id);
}
const okBox = (o, k, v) => o && typeof o === 'object' && o[k] === v && o.c && typeof o.c === 'object' && Array.isArray(o.claimed);
/** Sang ngày / tuần mới thì dựng lại bảng nhiệm vụ tương ứng. */
function cycle(now) {
  const p = profile(), d = dayKey(now), w = weekKey(now);
  if (!okBox(p.daily, 'day', d) || !Array.isArray(p.daily.ids)) p.daily = { day: d, ids: dailyIds(d), c: {}, claimed: [] };
  if (!okBox(p.weekly, 'week', w)) p.weekly = { week: w, c: {}, claimed: [], bonus: false };
  if (!p.event || p.event.week !== w || !Number.isFinite(p.event.n)) p.event = { week: w, n: 0, claimed: false };
  return p;
}
const state = (box, m) => { const v = Math.min(m.goal, box.c[m.key] || 0); return { ...m, v, done: v >= m.goal, claimed: box.claimed.includes(m.id) }; };
/** Danh sách nhiệm vụ: scope 'daily' | 'weekly' → [{ ...nhiệm vụ, v, done, claimed }]. */
export function missionList(scope, now = Date.now()) {
  const p = cycle(now);
  return scope === 'weekly' ? WEEKLY.map((m) => state(p.weekly, m)) : p.daily.ids.map((id) => DAILY_POOL.find((m) => m.id === id)).filter(Boolean).map((m) => state(p.daily, m));
}
/** Cộng một mô tả thưởng { gold, gems, manh, gao, item, chest, frame: { id, season }, skin: { hero, season } } vào hồ sơ; trả danh sách quà cho
 *  màn Nhận thưởng (ui/rewards.js). Trang phục đã được ui/season.js ghi vào p.skins — ở đây chỉ báo. */
export function grant(r, now = Date.now()) {
  const p = profile(), out = [];
  for (const k of ['gold', 'gems', 'manh', 'gao']) if (r[k]) { p[k] = (p[k] || 0) + r[k]; out.push({ k, n: r[k] }); }
  if (r.item) { addItem(r.item, 1, now); out.push({ k: 'item', id: r.item, n: 1 }); }
  if (r.chest) { p.chests = (p.chests || 0) + r.chest; out.push({ k: 'chest', n: r.chest }); }
  if (r.frame && !p.frames.some((f) => f.id === r.frame.id && f.season === r.frame.season)) { p.frames.push(r.frame); out.push({ k: 'frame', id: r.frame.id, n: 1 }); }
  if (r.skin) out.push({ k: 'skin', id: r.skin.hero, season: r.skin.season, n: 1 });
  saveProfile(); return out;
}
const giveAll = grant;
/** Nhận thưởng một nhiệm vụ (đã xong, chưa nhận). Trả về danh sách quà hoặc null. */
export function claimMission(scope, id, now = Date.now()) {
  const p = cycle(now), box = scope === 'weekly' ? p.weekly : p.daily, m = missionList(scope, now).find((x) => x.id === id);
  if (!m || !m.done || m.claimed) return null;
  box.claimed.push(id); return giveAll(m, now);
}
/** Rương tuần: xong (đã nhận) cả 4 nhiệm vụ tuần. */
export const weekBonusReady = (now = Date.now()) => { const p = cycle(now); return !p.weekly.bonus && WEEKLY.every((m) => p.weekly.claimed.includes(m.id)); };
export function claimWeekBonus(now = Date.now()) { const p = cycle(now); if (!weekBonusReady(now)) return null; p.weekly.bonus = true; return giveAll(WEEK_BONUS, now); }
/** Sự kiện tích luỹ: { n, goal, done, claimed }. */
export function eventState(now = Date.now()) { const p = cycle(now), n = Math.min(EVENT.goal, p.event.n); return { ...EVENT, n, done: n >= EVENT.goal, claimed: !!p.event.claimed }; }
export function claimEvent(now = Date.now()) { const p = cycle(now), e = eventState(now); if (!e.done || e.claimed) return null; p.event.claimed = true; return giveAll({ gao: EVENT.gao }, now); }
/** Số phần thưởng đang chờ nhận (huy hiệu ở sảnh). */
export function missionsReady(now = Date.now()) {
  const n = ['daily', 'weekly'].reduce((a, sc) => a + missionList(sc, now).filter((m) => m.done && !m.claimed).length, 0), e = eventState(now);
  return n + (weekBonusReady(now) ? 1 : 0) + (e.done && !e.claimed ? 1 : 0);
}
/** Cộng tiến độ sau một trận (không tính luyện tập). ctx: { won, kills, assists, towers, ranked, mvp, heroId }. */
function missionProgress(ctx, now) {
  const p = cycle(now), add = { played: 1, won: ctx.won ? 1 : 0, kills: ctx.kills || 0, assists: ctx.assists || 0, towers: ctx.towers || 0, ranked: ctx.ranked ? 1 : 0, rankedWon: ctx.ranked && ctx.won ? 1 : 0, mvp: ctx.mvp ? 1 : 0 };
  if (ctx.won) for (const r of HEROES[ctx.heroId]?.roles || []) add['win_' + r] = 1;
  for (const box of [p.daily, p.weekly]) for (const [k, v] of Object.entries(add)) if (v) box.c[k] = (box.c[k] || 0) + v;
  p.event.n++;
}

// —— Túi đồ (08 §3, GĐ4d): vật phẩm không hạn đếm ở p.bag, có hạn là từng chiếc trong p.timed [{ id, exp }] (dùng chiếc sắp hết hạn trước) ——
export const BAG_ITEMS = BAG;
const alive = (now) => (t) => t.exp > now;
/** Số chiếc còn dùng được (không hạn + có hạn chưa hết). */
export function itemCount(id, now = Date.now()) { const p = profile(); return (p.bag?.[id] || 0) + (p.timed || []).filter((t) => t.id === id && t.exp > now).length; }
/** Thêm n chiếc (n âm: dùng bớt). Vật phẩm có ttl / hạn mùa thì mỗi chiếc mang hạn riêng tính từ lúc nhận. */
export function addItem(id, n = 1, now = Date.now()) {
  if (n < 0) { for (let i = 0; i < -n; i++) useItem(id, now); return; }
  const p = profile(), d = BAG[id];
  if (d?.ttl || d?.season) { const exp = d.ttl ? now + d.ttl * 3600000 : seasonAt(now).end; for (let i = 0; i < n; i++) p.timed.push({ id, exp }); }
  else { p.bag = { ...(p.bag || {}) }; p.bag[id] = (p.bag[id] || 0) + n; }
}
/** Dùng 1 chiếc: chiếc có hạn sắp hết trước, rồi mới tới chiếc không hạn. Trả về true nếu có để dùng. */
export function useItem(id, now = Date.now()) {
  const p = profile(), T = (p.timed || []).filter((t) => t.id === id && t.exp > now).sort((a, b) => a.exp - b.exp);
  if (T.length) { p.timed.splice(p.timed.indexOf(T[0]), 1); return true; }
  if ((p.bag?.[id] || 0) > 0) { p.bag = { ...p.bag }; p.bag[id]--; if (!p.bag[id]) delete p.bag[id]; return true; }
  return false;
}
/** Bỏ chiếc đã hết hạn. Trả về số chiếc bị bỏ. */
export function pruneBag(now = Date.now()) { const p = P || profile(), before = (p.timed || []).length; p.timed = (p.timed || []).filter(alive(now)); return before - p.timed.length; }
/** Danh sách túi đồ: [{ id, n, timed (số chiếc có hạn), exp (hạn gần nhất | null) }]. */
export function bagList(now = Date.now()) {
  const p = profile(), ids = [...new Set([...Object.keys(p.bag || {}), ...(p.timed || []).map((t) => t.id)])].filter((id) => BAG[id]);
  return ids.map((id) => { const T = p.timed.filter((t) => t.id === id && t.exp > now); return { id, n: itemCount(id, now), timed: T.length, exp: T.length ? Math.min(...T.map((t) => t.exp)) : null }; }).filter((x) => x.n > 0);
}
/** Dùng Thẻ Nhân Đôi Sao: trận đấu hạng kế tiếp thắng được +2 sao (thua thì mất thẻ). */
export function armX2(now = Date.now()) { const p = profile(); if (p.x2Armed || !useItem('the_x2_sao', now)) return false; p.x2Armed = true; saveProfile(); return true; }

// —— Rương (08 §5) + cửa hàng mảnh ——
const roll = (rng, [a, b]) => a + Math.floor(rng() * (b - a + 1));
/** Mở 1 rương: vàng, Mảnh Tướng, có tỉ lệ ra Bùa Giữ Sao (MVP thua). Trả về danh sách quà [{ k, id?, n }] hoặc null nếu không còn rương. */
export function openChest(rng = Math.random, now = Date.now()) {
  const p = profile(); if (!(p.chests > 0)) return null;
  p.chests--; const gold = roll(rng, CHEST.gold), manh = roll(rng, CHEST.manh), out = [{ k: 'gold', n: gold }, { k: 'manh', n: manh }];
  p.gold += gold; p.manh += manh;
  if (rng() < CHEST.itemOdds) { addItem(CHEST.item, 1, now); out.push({ k: 'item', id: CHEST.item, n: 1 }); }
  saveProfile(); return out;
}
/** Mua 1 rương bằng vàng. */
export function buyChest() { const p = profile(); if (p.gold < CHEST.price) return false; p.gold -= CHEST.price; p.chests++; saveProfile(); return true; }
/** Đổi Mảnh Tướng lấy vật phẩm ở cửa hàng mảnh. */
export function shardBuy(id, now = Date.now()) {
  const p = profile(), it = SHARD_SHOP.find((x) => x.id === id); if (!it || p.manh < it.cost) return false;
  p.manh -= it.cost; addItem(id, 1, now); saveProfile(); return true;
}

// —— Thư (quà chào mừng + quà đăng nhập mỗi ngày) ——
export function mailbox() {
  const p = profile();
  if (!p.mail.some((m) => m.id === 'welcome')) p.mail.push({ id: 'welcome', title: 'Chào mừng tới Lantern Arena!', body: 'Đèn lồng đã thắp, đấu trường đã mở. Nhận chút lộ phí để bắt đầu hành trình nhé.', gold: 500, got: false });
  const d = dayKey();
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
 * Trả về phần thưởng cho màn kết quả: { gold, exp, stars (±), notes: [lý do], courage: { gain, now, used } (điểm tích luỹ), rankBefore, rankAfter, levelUp, level,
 *   chest (vừa được 1 rương), chestLeft (số trận nữa tới rương kế) }. now: thời điểm (ms) — kiểm thử truyền vào.
 */
export function applyResult({ mode, win, heroId = null, kills = 0, deaths = 0, assists = 0, score = 0, mvp = null, towers = 0, now = Date.now() }) {
  const p = profile();
  let before = rankOf(p.stars);
  const out = { gold: 0, exp: 0, stars: 0, notes: [], courage: null, rankBefore: rankFull(p), rankAfter: rankFull(p), levelUp: false, level: p.level, chest: false, chestLeft: 0, unlocks: [], seasonEnd: null, hq: null };
  if (mode === 'training') return out;
  out.seasonEnd = seasonCheck(now); // mùa vừa hết giữa trận: thưởng + reset mềm trước khi tính trận này vào mùa mới
  if (out.seasonEnd) { before = rankOf(p.stars); out.rankBefore = out.rankAfter = rankFull(p); }
  const mult = MODE_GOLD[mode] || 1;
  out.gold = Math.round(((win ? 100 : 50) + score * 6 + (mvp ? 30 : 0)) * mult);
  out.exp = Math.round((win ? 60 : 30) + score * 2);
  p.games++; if (win) p.wins++; p.kills += kills; p.deaths += deaths; p.assists += assists; p.streak = win ? Math.max(1, p.streak + 1) : Math.min(-1, p.streak - 1);
  p.scoreSum = (p.scoreSum || 0) + score; if (mvp) p.mvp = (p.mvp || 0) + 1;
  const ranked = isRankedMode(mode);
  missionProgress({ won: win, kills, assists, towers, ranked, mvp, heroId }, now);
  if (ranked) {
    p.ranked++; if (win) p.rankedWins++;
    const gain = Math.round(win ? 10 + score : score / 2); let cg = Math.min(COURAGE_MAX, (p.courage || 0) + gain), used = false;
    if (win) {
      out.stars = 1;
      if (p.streak >= 3 && before.tier < TIERS.length - 1) { out.stars++; out.notes.push(`Chuỗi ${p.streak} trận thắng: +1 sao`); }
      if (cg >= COURAGE_MAX) { out.stars++; cg = 0; used = true; out.notes.push('Điểm tích luỹ đầy: +1 sao'); }
    } else if (TIERS[before.tier]?.safe) out.notes.push(`${before.short}: thua không mất sao`);
    else if (before.tier < HAI_DANG && p.stars <= before.start) out.notes.push(`Sàn bậc ${before.short}: không rớt bậc`);
    else if (mvp && useItem('giu_sao_mvp', now)) out.notes.push('Dùng Bùa Giữ Sao (MVP thua): không mất sao');
    else if (useItem('bua_giu_sao', now)) out.notes.push('Dùng Bùa Giữ Sao: không mất sao');
    else if (cg >= COURAGE_MAX) { cg = 0; used = true; out.notes.push('Điểm tích luỹ đầy: giữ sao'); }
    else out.stars = -1;
    if (p.x2Armed) { p.x2Armed = false; if (win) { out.stars++; out.notes.push('Thẻ Nhân Đôi Sao: +1 sao'); } else out.notes.push('Thẻ Nhân Đôi Sao đã dùng (thua)'); }
    p.courage = cg; out.courage = { gain, now: cg, used };
    p.stars = Math.max(0, p.stars + out.stars); p.best = Math.max(p.best, p.stars);
    out.rankAfter = rankOf(p.stars);
    for (const r of seasonTrack(p, { won: win, heroId })) out.unlocks.push(...grant(r, now)); // GĐ4b: bậc cao nhất mùa, thành thạo, trang phục mùa
    out.hq = hqApply(p, { win, score, peak: mode === 'peak', before, after: out.rankAfter }); // GĐ4c: Hào Quang (Nguyệt Quang trở lên), mốc 2000, Thiên Hà
    if (out.hq.reward) out.unlocks.push(...grant(out.hq.reward, now));
    out.rankAfter = rankFull(p);
  }
  p.chestN = (p.chestN || 0) + 1; // rương: cứ CHEST.every trận (trừ luyện tập) được 1 rương
  if (p.chestN >= CHEST.every) { p.chestN = 0; p.chests = (p.chests || 0) + 1; out.chest = true; }
  out.chestLeft = CHEST.every - p.chestN;
  p.gold += out.gold; p.exp += out.exp;
  let ups = 0; while (p.exp >= expNeed(p.level)) { p.exp -= expNeed(p.level); p.level++; ups++; out.levelUp = true; }
  if (ups) out.unlocks.push(...grant({ gems: ups * GEM_FROM.levelUp }, now)); // GĐ5b: mỗi lần lên cấp +ngọc
  out.level = p.level;
  p.history = [{ t: Date.now(), mode, win, heroId, k: kills, d: deaths, a: assists, score, mvp: mvp || null }, ...(p.history || [])].slice(0, 20);
  saveProfile();
  return out;
}

// —— Mùa giải (GĐ4b, ui/season.js) ——
/** Kiểm tra sang mùa mới theo đồng hồ thiết bị: thưởng hết mùa + reset mềm. Trả về null hoặc { n, name, peak, from, to, skipped, list (quà) }. */
export function seasonCheck(now = Date.now()) { const r = rollSeason(profile(), now); if (!r) { return null; } r.list = grant(r.reward, now); return r; }
export const journey = () => journeyList(profile());
export function claimJourney(tier, now = Date.now()) { const r = journeyTake(profile(), tier); return r ? grant(r, now) : null; }
/** Chọn tướng nhận trang phục mùa. Trả về false (không chọn được), true (đã chọn) hoặc danh sách quà (đủ trận thắng → nhận luôn). */
export function chooseSkin(hero, now = Date.now()) { const r = chooseSkinHero(profile(), hero); if (r === false) return false; if (r === true) { saveProfile(); return true; } return grant(r, now); }
export function setSkinOn(hero, season) { const ok = toggleSkin(profile(), hero, season); if (ok) saveProfile(); return ok; }
export function equipFrame(id) { const p = profile(); if (id && !p.frames.some((f) => f.id === id)) return false; p.frame = id || null; saveProfile(); return true; }

// —— Cửa hàng ngọc (GĐ5b, data/shop.js) ——
/** Mua trang phục phối màu: trừ ngọc, mặc luôn. Trả về danh sách quà (màn Nhận thưởng) hoặc { err }. */
export function buyCostume(hero, look) {
  const p = profile(), c = costumeOf(look);
  if (!c || !ALPHA.includes(hero) || SKIN_LOCKED.includes(hero)) return { err: 'Tướng này không có trang phục' };
  if (ownsCostume(p, hero, look)) return { err: 'Đã có trang phục này' };
  if ((p.gems || 0) < c.price) return { err: `Thiếu ${c.price - (p.gems || 0)} ngọc` };
  p.gems -= c.price; p.costumes.push(`${hero}:${look}`); wearCostume(p, hero, look); saveProfile();
  return [{ k: 'costume', id: hero, look, n: 1 }];
}
/** Mặc (look) / cởi (null) trang phục đã mua. */
export function wearShopCostume(hero, look) { const ok = wearCostume(profile(), hero, look); if (ok) saveProfile(); return ok; }
/** Đổi ngọc lấy vật phẩm GEM_SHOP. Trả về danh sách quà hoặc { err }. */
export function buyGemItem(id, now = Date.now()) {
  const p = profile(), it = GEM_SHOP.find((x) => x.id === id);
  if (!it) return { err: 'Không có món này' };
  if ((p.gems || 0) < it.price) return { err: `Thiếu ${it.price - (p.gems || 0)} ngọc` };
  p.gems -= it.price; return grant(it.give, now);
}
export { COSTUMES, GEM_SHOP };

