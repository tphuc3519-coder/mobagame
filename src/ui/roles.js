// Vị trí 5v5 phía giao diện — thuần logic (không DOM, chạy được trong node): độ hợp tướng ↔ vị trí, gợi ý tướng, chia vị trí lúc ghép
// trận, máy chọn tướng theo vị trí, biểu tượng vị trí (nét SVG tự vẽ). Ngẫu nhiên luôn truyền vào (rnd), để kiểm thử dựng lại được.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { ROLE_IDS, ROLE_INFO, ROLE_CLASS_FIT, ROLE_PRI_ODDS, FIT_WEIGHT } from '../data/roles.js';
import { DRAFT } from '../data/draft.js';

/** Độ hợp tướng `id` với vị trí `role`: 2 = tướng ghi vị trí này trong `lanes` (Đề cử), 1 = lớp tướng hợp vị trí, 0 = không hợp. */
export function fit(role, id) {
  const h = HEROES[id], cls = ROLE_CLASS_FIT[role];
  if (!h || !cls) return 0;
  if ((h.lanes || []).includes(role)) return 2;
  return cls.includes(h.roles[0]) ? 1 : 0;
}
/** Danh sách tướng xếp theo độ hợp giảm dần (giữ thứ tự đầu vào khi bằng nhau); vị trí rỗng / Tuỳ ý: giữ nguyên. */
export function recommend(role, ids = ALPHA) {
  if (!ROLE_CLASS_FIT[role]) return ids.slice();
  return ids.map((id, i) => [id, fit(role, id), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map((x) => x[0]);
}
/** Xáo Fisher–Yates (mảng mới). */
export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Chia vị trí lúc ghép trận: người chơi nhận vị trí chính (ROLE_PRI_ODDS) hoặc phụ; Tuỳ ý / chưa chọn = một vị trí ngẫu nhiên.
 *  Đồng đội nhận 4 vị trí còn lại, đối thủ một hoán vị đủ 5 vị trí. Trả về { me, gotSec, allies: [4], foes: [5] }. */
export function assignRoles({ pri = null, sec = null } = {}, rnd = Math.random) {
  let me, gotSec = false;
  if (!ROLE_IDS.includes(pri)) me = ROLE_IDS[Math.floor(rnd() * ROLE_IDS.length)];
  else if (ROLE_IDS.includes(sec) && sec !== pri && rnd() >= ROLE_PRI_ODDS) { me = sec; gotSec = true; } else me = pri;
  return { me, gotSec, allies: shuffle(ROLE_IDS.filter((r) => r !== me), rnd), foes: shuffle(ROLE_IDS, rnd) };
}
/** Máy chọn tướng cho vị trí: điểm FIT_WEIGHT[độ hợp] + nhiễu − phạt nếu tướng là lựa chọn "đúng vị trí" cuối cùng của đồng đội khác
 *  (`reserve`). `avoid` (vd tướng người chơi đang xem) chỉ bỏ khi còn lựa chọn khác. Vị trí rỗng: ngẫu nhiên đều. */
export function choose(role, pool, rnd, { avoid = [], reserve = [] } = {}) {
  let P = pool;
  if (avoid.length) { const q = pool.filter((id) => !avoid.includes(id)); if (q.length) P = q; }
  if (!P.length) return null;
  if (!ROLE_CLASS_FIT[role]) return P[Math.floor(rnd() * P.length)];
  let best = null, bv = -Infinity;
  for (const id of P) {
    const v = FIT_WEIGHT[fit(role, id)] + rnd() * DRAFT.pickNoise - (reserve.includes(id) ? DRAFT.reservePenalty : 0);
    if (v > bv) { bv = v; best = id; }
  }
  return best;
}
/** Máy chọn cả đội theo danh sách vị trí (không trùng nhau, bỏ `exclude`) — chọn ẩn: đối thủ ở đấu thường. */
export function teamPicks(roles, exclude = [], rnd = Math.random) {
  const out = [];
  for (const r of roles) out.push(choose(r, ALPHA.filter((id) => !exclude.includes(id) && !out.includes(id)), rnd));
  return out;
}

// —— biểu tượng vị trí: nét SVG tự vẽ (mái đền, mũi tên giữa, sóng sông, lá rừng, khiên chữ thập, vòng tuỳ ý / gạch chéo "không") ——
const GLYPH = {
  temple: 'M3 10l9-6 9 6M6 10v9M12 10v9M18 10v9M3 20h18', mid: 'M5 19L19 5M11 5h8v8', river: 'M3 9c3-3 6 3 9 0s6-3 9 0M3 15c3-3 6 3 9 0s6-3 9 0',
  jungle: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l8-8', support: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM12 9v6M9 12h6',
  fill: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16M12 8v8M8 12h8', none: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16M6.5 17.5l11-11',
};
export const roleIcon = (id) => `<svg class="rl-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPH[id] || GLYPH.fill}"/></svg>`;
/** Nhãn nhỏ vị trí (biểu tượng + tên ngắn); không có vị trí: chuỗi rỗng. */
export const roleTag = (id) => (id && ROLE_INFO[id] ? `<em class="rl">${roleIcon(id)}${ROLE_INFO[id].short}</em>` : '');
