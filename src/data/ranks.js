// Bậc hạng (08 §1, tên tự đặt): Đèn Dầu → Đèn Lồng → Đèn Kéo Quân → Đèn Trời → Hải Đăng → Sao Mai (mỗi bậc chia phân hạng, mỗi phân hạng
// vài sao) → Nguyệt Quang (tích sao không giới hạn) → Thái Dương (từ 30 sao Nguyệt Quang). Hồ sơ lưu một con số: tổng sao (p.stars).
export const TIERS = [
  { id: 'den_dau', name: 'Đèn Dầu', divs: 3, stars: 3, col: '#d0905c', safe: true },
  { id: 'den_long', name: 'Đèn Lồng', divs: 4, stars: 4, col: '#ff6a5a', safe: true },
  { id: 'keo_quan', name: 'Đèn Kéo Quân', divs: 4, stars: 4, col: '#ffb84a' },
  { id: 'den_troi', name: 'Đèn Trời', divs: 5, stars: 5, col: '#8fd0ff' },
  { id: 'hai_dang', name: 'Hải Đăng', divs: 5, stars: 5, col: '#7fe6d6' },
  { id: 'sao_mai', name: 'Sao Mai', divs: 5, stars: 5, col: '#ffd36a' },
  { id: 'nguyet_quang', name: 'Nguyệt Quang', divs: 0, stars: 0, col: '#d8d0ff' },
];
export const SUN = { id: 'thai_duong', name: 'Thái Dương', col: '#ff9a3a', from: 30 }; // từ 30 sao Nguyệt Quang
/** Thiên Hà (bậc 9, chỉ số 8): không tính bằng sao — Thái Dương lọt top 50 bảng Hào Quang (ui/haoQuang.js rankFull). */
export const GALAXY = { tier: 8, id: 'thien_ha', name: 'Thiên Hà', col: '#b88aff' };
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
const roman = (r) => ROMAN.indexOf(r);
/** Tổng sao ở đầu phân hạng `div` ('I'…'V') của bậc chỉ số `tier` (0 = Đèn Dầu); bậc không chia phân hạng thì là đầu bậc. */
export function starsAt(tier, div = null) {
  let start = 0; for (let t = 0; t < tier && t < TIERS.length; t++) start += TIERS[t].divs * TIERS[t].stars;
  const T = TIERS[Math.min(tier, TIERS.length - 1)];
  if (tier >= TIERS.length) return start + SUN.from; // Thái Dương
  if (!T.divs || !div) return start;
  return start + (T.divs - roman(div)) * T.stars;
}
