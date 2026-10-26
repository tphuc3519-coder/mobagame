// Điểm Hào Quang, bảng Top 100 ảo, Thiên Hà, Đấu Đỉnh Cao (GĐ4c — 08 §1, §4). Hàm thuần trên hồ sơ p (không import ui/profile.js — profile.js
// gọi vào đây, tránh vòng import). Đồng hồ thiết bị chỉ dùng ở đây (tầng tiến trình), không bao giờ trong mô phỏng trận.
import { HQ, BOARD, PEAK, NAME_A, NAME_B } from '../data/haoQuang.js';
import { rankOf, GALAXY } from '../data/ranks.js';
import { mulberry32 } from '../core/rng.js';
import { ALPHA } from '../data/heroes/index.js';

/** Làm sạch trường Hào Quang. init: hồ sơ đã ở Nguyệt Quang trở lên mà chưa có điểm (hồ sơ trước GĐ4c) thì bắt đầu từ HQ.start. */
export function hqFields(p, init = true) {
  p.hq = Number.isFinite(p.hq) && p.hq >= 0 ? Math.round(p.hq) : null;
  if (init && p.hq == null && rankOf(p.stars | 0).tier >= HQ.fromTier) p.hq = HQ.start;
  p.hqBest = Number.isFinite(p.hqBest) ? Math.max(0, Math.round(p.hqBest)) : 0;
  if (p.hq != null) p.hqBest = Math.max(p.hqBest, p.hq);
  p.hqTitle = Number.isInteger(p.hqTitle) && p.hqTitle > 0 ? p.hqTitle : 0; // số mùa đã đạt danh hiệu (0: chưa)
  p.galaxyPeak = p.galaxyPeak === true; // đã vào Thiên Hà trong mùa này (thưởng hết mùa của Thiên Hà)
  return p;
}

/** Điểm Hào Quang một trận: thắng +15 + (điểm − 8), thua −15 + (điểm − 8)/2, giới hạn ±25; Đấu Đỉnh Cao thắng × 1,5. */
export function hqDelta(win, score, peak = false) {
  const s = Number.isFinite(score) ? score : HQ.mid;
  const d = Math.max(-HQ.cap, Math.min(HQ.cap, win ? HQ.win + (s - HQ.mid) : HQ.lose + (s - HQ.mid) / 2));
  return Math.round(win && peak ? d * HQ.peakMul : d);
}

const cache = new Map();
/** 100 người chơi ảo của mùa `season`, xếp điểm giảm dần: [{ name, hq, avatar }]. Cùng mùa luôn ra cùng một bảng. */
export function virtualBoard(season) {
  const n = Math.max(1, season | 0);
  if (cache.has(n)) return cache.get(n);
  const r = mulberry32((BOARD.salt ^ Math.imul(n, 0x9e3779b1)) >>> 0), used = new Set(), L = [];
  for (let i = 0; i < BOARD.n; i++) {
    let name;
    do name = `${NAME_A[r.int(NAME_A.length)]} ${NAME_B[r.int(NAME_B.length)]}${r.next() < 0.35 ? ' ' + (r.int(98) + 2) : ''}`; while (used.has(name));
    used.add(name);
    const z = Math.sqrt(-2 * Math.log(Math.max(1e-9, r.next()))) * Math.cos(2 * Math.PI * r.next()); // Box–Muller
    L.push({ name, hq: Math.max(0, Math.round(BOARD.mean + BOARD.sd * z)), avatar: ALPHA[r.int(ALPHA.length)] });
  }
  L.sort((a, b) => b.hq - a.hq || a.name.localeCompare(b.name));
  cache.set(n, L);
  return L;
}

/** Hạng của người chơi trên bảng khu (1 = đầu bảng; bằng điểm thì đứng trên người ảo). null khi chưa có Hào Quang. */
export const boardPos = (p) => (p.hq == null ? null : 1 + virtualBoard(p.season).filter((v) => v.hq > p.hq).length);
/** Thiên Hà: đang ở Thái Dương và lọt top 50 bảng Hào Quang. */
export const isGalaxy = (p) => rankOf(p.stars | 0).tier === GALAXY.tier - 1 && (boardPos(p) ?? Infinity) <= BOARD.galaxy;
/** Bậc để hiển thị: như rankOf(sao), riêng Thái Dương top 50 thì là Thiên Hà. */
export function rankFull(p) {
  const r = rankOf(p.stars | 0);
  return isGalaxy(p) ? { ...r, tier: GALAXY.tier, id: GALAXY.id, name: GALAXY.name, short: GALAXY.name, col: GALAXY.col } : r;
}

/** Bảng Top 100 kèm người chơi: { rows (≤ 100, người chơi có cờ me), pos, cut (điểm người thứ 100), galaxy (số suất Thiên Hà) }. */
export function boardView(p, me = {}) {
  const B = virtualBoard(p.season), pos = boardPos(p);
  const all = pos == null ? B : [...B.slice(0, pos - 1), { ...me, hq: p.hq, me: true }, ...B.slice(pos - 1)];
  const rows = all.slice(0, BOARD.n);
  return { rows, pos, cut: rows[rows.length - 1].hq, galaxy: BOARD.galaxy };
}

/**
 * Sau một trận hạng / Đỉnh Cao (sao đã cộng trừ xong; before / after: bậc trước / sau trận). Trả về
 * { delta, now, start (vừa vào Nguyệt Quang: bắt đầu HQ.start), reward (khung danh hiệu nếu vừa chạm mốc), galaxy }.
 */
export function hqApply(p, { win, score, peak = false, before, after }) {
  hqFields(p, false); // sao đã cộng: để nhánh dưới tự nhận ra lần vào Nguyệt Quang
  const out = { delta: 0, now: p.hq, start: false, reward: null, galaxy: false };
  if (p.hq == null) {
    if (after.tier >= HQ.fromTier) { p.hq = HQ.start; out.start = true; }
  } else if (before.tier >= HQ.fromTier) { out.delta = hqDelta(win, score, peak); p.hq = Math.max(0, p.hq + out.delta); } // rớt dưới Nguyệt Quang: điểm đứng yên
  out.now = p.hq;
  if (p.hq != null) p.hqBest = Math.max(p.hqBest, p.hq);
  if (p.hq != null && p.hq >= HQ.title && p.hqTitle !== p.season) { p.hqTitle = p.season; out.reward = { frame: { id: HQ.frame, season: p.season } }; }
  if (isGalaxy(p)) { p.galaxyPeak = out.galaxy = true; }
  return out;
}

/** Đấu Đỉnh Cao có mở không: { open, tierOk, timeOk, reason } — 19:00–24:00 giờ thiết bị, cần Nguyệt Quang. */
export function peakState(p, now = Date.now()) {
  const d = new Date(now), h = d.getHours(), tierOk = rankOf(p.stars | 0).tier >= PEAK.tier, timeOk = h >= PEAK.from && h < PEAK.to;
  let reason = '';
  if (!tierOk) reason = 'Cần đạt Nguyệt Quang';
  else if (!timeOk) { const m = (PEAK.from - h) * 60 - d.getMinutes(); reason = `Mở lúc ${PEAK.from}:00 (còn ${m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`})`; }
  return { open: tierOk && timeOk, tierOk, timeOk, reason };
}
