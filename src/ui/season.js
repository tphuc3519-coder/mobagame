// Mùa giải (GĐ4b — 08 §4): hết mùa thì thưởng theo bậc cao nhất trong mùa + reset mềm theo bậc cuối mùa, Hành trình đỉnh cao, 3 vòng tướng
// thành thạo, trang phục mùa (10 trận hạng thắng), khung ảnh đại diện. Hàm thuần trên đối tượng hồ sơ p (không import ui/profile.js — profile.js
// gọi vào đây, tránh vòng import). Thưởng trả về dạng mô tả { gold, gems, manh, item, frame, skin }; profile.js cộng vào hồ sơ.
import { seasonAt, seasonByN, SOFT_RESET, SEASON_END, JOURNEY, MASTERY, SEASON_SKIN, SKIN_LOCKED, skinLook } from '../data/seasons.js';
import { rankOf, starsAt, GALAXY } from '../data/ranks.js';

const int = (v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
/** Làm sạch trường mùa giải (hồ sơ cũ / sửa tay). */
export function seasonFields(p) {
  p.seasonPeak = int(p.seasonPeak); p.seasonWins = int(p.seasonWins);
  p.mastery = p.mastery && typeof p.mastery === 'object' && !Array.isArray(p.mastery) ? p.mastery : {};
  p.journey = Array.isArray(p.journey) ? p.journey.filter(Number.isInteger) : [];
  p.frames = Array.isArray(p.frames) ? p.frames.filter((f) => f && typeof f.id === 'string') : [];
  p.skins = Array.isArray(p.skins) ? p.skins.filter((s) => s && typeof s.hero === 'string' && Number.isInteger(s.season)) : [];
  p.skinOn = p.skinOn && typeof p.skinOn === 'object' && !Array.isArray(p.skinOn) ? p.skinOn : {};
  if (p.skinHero != null && (typeof p.skinHero !== 'string' || SKIN_LOCKED.includes(p.skinHero))) p.skinHero = null;
  return p;
}

/**
 * Sang mùa mới (theo đồng hồ thiết bị)? Hồ sơ chưa gắn mùa thì gắn mùa hiện tại, không thưởng.
 * Trả về null hoặc { n, name (mùa vừa hết), peak (bậc cao nhất), reward (mô tả thưởng), from, to (bậc trước / sau reset), skipped (số mùa bỏ lỡ) }.
 */
export function rollSeason(p, now = Date.now()) {
  seasonFields(p);
  const cur = seasonAt(now);
  if (!Number.isInteger(p.season) || p.season < 1) { p.season = cur.n; p.seasonPeak = Math.max(p.seasonPeak, p.stars | 0); return null; }
  if (p.season >= cur.n) return null;
  const old = seasonByN(p.season), gal = p.galaxyPeak === true, from = rankOf(p.stars | 0);
  const peak = gal ? { ...rankOf(p.stars | 0), tier: GALAXY.tier, id: GALAXY.id, name: GALAXY.name, short: GALAXY.name, col: GALAXY.col } : rankOf(Math.max(p.seasonPeak, p.stars | 0));
  let stars = p.stars | 0;
  for (let s = p.season; s < cur.n; s++) { const to = SOFT_RESET[rankOf(stars).tier]; if (to) stars = Math.min(stars, starsAt(to[0], to[1])); } // mỗi mùa bỏ lỡ reset thêm một lần (mùa không chơi: không thưởng)
  p.stars = stars; p.season = cur.n; p.seasonPeak = stars; p.seasonWins = 0; p.mastery = {}; p.journey = [];
  p.hq = null; p.hqBest = 0; p.galaxyPeak = false; // Hào Quang theo mùa: reset xong ai cũng dưới Nguyệt Quang, vào lại thì bắt đầu 1000 (08 §1)
  const reward = { ...SEASON_END[Math.min(peak.tier, SEASON_END.length - 1)] };
  if (reward.frame) reward.frame = { id: reward.frame, season: old.n };
  return { n: old.n, name: old.name, peak, reward, from, to: rankOf(stars), skipped: cur.n - old.n - 1 };
}

/** Sau một trận hạng (sao đã cộng / trừ): bậc cao nhất trong mùa, số trận thắng, thành thạo. Trả về danh sách mô tả thưởng vừa mở. */
export function seasonTrack(p, { won, heroId }) {
  seasonFields(p);
  p.seasonPeak = Math.max(p.seasonPeak, p.stars | 0);
  const out = [];
  if (won) {
    p.seasonWins++;
    if (heroId) p.mastery[heroId] = (p.mastery[heroId] || 0) + 1;
    if (masteryRings(p).filter((r) => r.done).length >= MASTERY.heroes && !p.frames.some((f) => f.id === MASTERY.frame && f.season === p.season)) out.push({ frame: { id: MASTERY.frame, season: p.season } });
  }
  const sk = skinGrant(p); if (sk) out.push(sk);
  return out;
}
/** 3 vòng thành thạo: 3 tướng thắng nhiều nhất trong mùa → [{ hero, wins, done }]. */
export function masteryRings(p) {
  return Object.entries(p.mastery || {}).sort((a, b) => b[1] - a[1]).slice(0, MASTERY.heroes).map(([hero, wins]) => ({ hero, wins: Math.min(wins, MASTERY.wins), done: wins >= MASTERY.wins }));
}

// —— trang phục mùa ——
export function skinState(p) {
  const got = p.skins.find((s) => s.season === p.season);
  return { hero: got?.hero || p.skinHero || null, wins: Math.min(SEASON_SKIN.wins, p.seasonWins), need: SEASON_SKIN.wins, got: !!got, look: skinLook(p.season) };
}
/** Đủ trận thắng mà chưa nhận và đã chọn tướng → nhận ngay. */
function skinGrant(p) {
  if (p.seasonWins < SEASON_SKIN.wins || !p.skinHero || SKIN_LOCKED.includes(p.skinHero) || p.skins.some((s) => s.season === p.season)) return null;
  p.skins.push({ hero: p.skinHero, season: p.season }); p.skinOn[p.skinHero] = p.season;
  return { skin: { hero: p.skinHero, season: p.season } };
}
/** Chọn tướng nhận trang phục mùa (trước khi nhận; không chọn được 4 model cao cấp). Trả về mô tả thưởng nếu nhận được ngay. */
export function chooseSkinHero(p, hero) {
  seasonFields(p);
  if (!hero || SKIN_LOCKED.includes(hero) || p.skins.some((s) => s.season === p.season)) return false;
  p.skinHero = hero; return skinGrant(p) || true;
}
/** Bật / tắt trang phục đã có của một tướng (lưu mùa đang dùng). */
export function toggleSkin(p, hero, season) {
  if (!p.skins.some((s) => s.hero === hero && s.season === season)) return false;
  if (p.skinOn[hero] === season) delete p.skinOn[hero]; else p.skinOn[hero] = season;
  return true;
}
/** Màu phủ của tướng (nếu đang dùng trang phục mùa) — null nếu không, hoặc là model cao cấp. */
export function skinTint(p, hero) {
  const s = p?.skinOn?.[hero]; if (!s || SKIN_LOCKED.includes(hero) || !p.skins?.some((k) => k.hero === hero && k.season === s)) return null;
  return skinLook(s).tint;
}

// —— Hành trình đỉnh cao ——
export function journeyList(p) { const tier = rankOf(Math.max(p.seasonPeak | 0, p.stars | 0)).tier; return JOURNEY.map((j) => ({ ...j, open: tier >= j.tier, got: (p.journey || []).includes(j.tier) })); }
export function journeyTake(p, tier) {
  const j = journeyList(p).find((x) => x.tier === tier); if (!j || !j.open || j.got) return null;
  p.journey.push(tier); const { tier: _t, open, got, ...r } = j; // eslint-disable-line no-unused-vars
  if (r.frame) r.frame = { id: r.frame, season: p.season };
  return r;
}
