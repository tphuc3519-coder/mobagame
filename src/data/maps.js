// Bản đồ 1v1 "Cầu Đá Đơn" (03 §B). 5600 × 2400, đường ngang y=1200 rộng 900, khe nước x=2800 rộng 400.
// Phía Xanh (team 0) khai báo ở đây; phía Đỏ (team 1) lấy đối xứng qua x = 2800: (x, y) → (5600 − x, y).
import { D } from '../core/dmath.js';
import { makeRiver } from './river.js';
const W = 5600, H = 2400;
export const mirrorX = (x) => W - x;

export const DUEL = {
  id: 'duel1v1', w: W, h: H,
  road: { y: 1200, width: 900 },
  river: { x: 2800, width: 400 },
  spawn: [{ x: 250, y: 1200 }, { x: mirrorX(250), y: 1200 }],
  // Công trình phía Xanh (03 §B2). tier quyết định luật bất tử: ngoài → trong → nhà chính.
  structures: [
    { id: 'core', kind: 'core', x: 600, y: 1200, hp: 5000, atk: 300, range: 850, rate: 1.2, armor: 100, radius: 110, invulnUntil: 'inner' },
    { id: 'inner', kind: 'tower', x: 1350, y: 1200, hp: 3800, atk: 240, range: 750, rate: 1.0, armor: 90, radius: 85, invulnUntil: 'outer' },
    { id: 'outer', kind: 'tower', x: 2050, y: 1200, hp: 3200, atk: 200, range: 750, rate: 1.0, armor: 80, radius: 85, invulnUntil: null },
  ],
  fountain: { x: 250, y: 1200, range: 650, dps: 1000, healRadius: 350, healPct: 0.15 },
  // Tường dọc đường (y=700 và y=1700), khe hở ở x=1800 và 3800; dày 80.
  walls: { ys: [700, 1700], thickness: 80, gaps: [{ x: 1800, w: 300 }, { x: 3800, w: 300 }] },
  // Bụi cỏ ở mép trong của đường (chỉ hình ở Mốc 3; ẩn đơn vị ở Mốc 9).
  bushes: [{ x: 2250, y: 850, w: 360, h: 220 }, { x: 2250, y: 1550, w: 360, h: 220 }, { x: 1650, y: 1520, w: 240, h: 180 }, { x: 1150, y: 880, w: 220, h: 160 }],
  tower: { minionAggroRadius: 900, backdoorTaken: 0.4, streakStep: 0.3, streakMax: 1.5, minionPct: 0.45, siegePct: 0.2, aggroLinger: 90 },
  // giantFrom: từ phút 18, đội đã phá trụ của địch có thêm Lính Đèn Lớn mỗi đợt (sim/minions.js giantsFor)
  waves: { first: 15, every: 25, sword: 3, archer: 1, siegeEvery: 3, spawnX: 900, gap: 14, giantFrom: 1080 },
  // đột tử: từ phút 30 công trình nhận gấp đôi sát thương và thôi tự hồi máu — hai tướng hồi máu / đỡ đòn đấu nhau không hoà mãi
  suddenDeath: { from: 1800, structureTaken: 2 },
  // Đường duy nhất cho lính, đi từ Xanh sang Đỏ (cùng định dạng với bản 5v5).
  lanes: [{ id: 'main', width: 900, pts: [[900, 1200], [W - 900, 1200]] }],
  mirror: (x, y) => ({ x: mirrorX(x), y }),
};

/** Mọi bụi cỏ đủ hai phía (đã đối xứng). Bụi nằm đúng trục đối xứng (ảnh đối xứng trùng chính nó, vd bụi giữa sông) chỉ tính một lần. */
export function bushRects(map) {
  if (map._bushRects) return map._bushRects;
  const out = [], norm = (b) => (b.cap ? { ...b, x: (b.cap[0] + b.cap[2]) / 2, y: (b.cap[1] + b.cap[3]) / 2, w: Math.abs(b.cap[2] - b.cap[0]) + 2 * b.r, h: Math.abs(b.cap[3] - b.cap[1]) + 2 * b.r } : b);
  for (const b0 of map.bushes || []) {
    const b = norm(b0); out.push(b); if (b0.noMirror) continue;
    let m;
    if (b.cap) { const p = map.mirror(b.cap[0], b.cap[1]), q = map.mirror(b.cap[2], b.cap[3]); m = norm({ ...b, cap: [p.x, p.y, q.x, q.y] }); }
    else { const o = map.mirror(0, 0), t = map.mirror(1000, 0), sw = Math.abs(t.y - o.y) > Math.abs(t.x - o.x); m = { ...b, ...map.mirror(b.x, b.y), ...(sw ? { w: b.h, h: b.w } : {}) }; } // phép đối xứng đổi trục x↔y thì đổi luôn rộng/cao
    if (Math.abs(m.x - b.x) > 1 || Math.abs(m.y - b.y) > 1) out.push(m);
  }
  return (map._bushRects = out);
}
/** Điểm p có nằm trong bụi b không (bụi chữ nhật theo trục, hoặc bụi "con nhộng" cap = đoạn thẳng + bán kính r — bụi chéo dọc sông). */
export function inBush(b, p) {
  if (!b.cap) return Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2;
  const [x1, y1, x2, y2] = b.cap, dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy || 1)));
  return D.hypot(p.x - x1 - dx * t, p.y - y1 - dy * t) <= b.r;
}

/** Danh sách công trình đủ hai phía (đã đối xứng bằng map.mirror). */
export function structuresOf(map) {
  const out = [];
  for (const team of [0, 1]) for (const s of map.structures) out.push({ ...s, team, ...(team ? map.mirror(s.x, s.y) : {}) });
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Bản đồ 5v5 "Đấu Trường Đèn Cả" (03 §A). Toạ độ gợi ý trong tài liệu (6400 × 6400) được NHÂN K = 2.4 → 15360 × 15360
// cho rộng hơn (băng qua đường Giữa ~45 giây thay vì ~20 ở bản gốc). Chỉ khai báo phía Xanh (dưới trái); phía Đỏ lấy (x, y) → (y, x).
// ───────────────────────────────────────────────────────────────────────────
const K = 3.0, A = 6400 * K;
const P = (x, y) => [x * K, y * K];
const swap = (x, y) => ({ x: y, y: x });

/** Bo tròn các góc của đường gấp khúc: thay mỗi góc bằng cung 2 điểm cách đỉnh r (xấp xỉ bằng bezier bậc 2, 6 đoạn). */
function roundPath(pts, r) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const da = D.hypot(a[0] - b[0], a[1] - b[1]), dc = D.hypot(c[0] - b[0], c[1] - b[1]), rr = Math.min(r, da * 0.45, dc * 0.45);
    const p0 = [b[0] + ((a[0] - b[0]) / da) * rr, b[1] + ((a[1] - b[1]) / da) * rr], p2 = [b[0] + ((c[0] - b[0]) / dc) * rr, b[1] + ((c[1] - b[1]) / dc) * rr];
    for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const LANE_W = 1900; // rộng gần bằng vòng bắn của trụ (đường kính 2100): vòng trụ nằm gọn trong đường, không lố vào rừng (880 → 1200 → 2000)
// Ba đường, đi từ nhà chính Xanh sang nhà chính Đỏ (đối xứng nên đường phía Đỏ chỉ là đi ngược lại).
const BASE = P(800, 5600), FOE = P(5600, 800);
const LANES = [
  { id: 'temple', width: LANE_W, pts: roundPath([BASE, P(800, 800), FOE], 500 * K) },
  { id: 'mid', width: LANE_W, pts: [BASE, FOE] },
  { id: 'river', width: LANE_W, pts: roundPath([BASE, P(5600, 5600), FOE], 500 * K) },
];

const tower = (id, tier, x, y, invulnUntil) => {
  const T = { outer: [4000, 80, 220], inner: [4500, 90, 260], home: [5000, 100, 300] }[tier];
  return { id, kind: 'tower', tier, x: x * K, y: y * K, hp: T[0], atk: T[2], range: 1050, rate: 1.0, armor: T[1], radius: 85, invulnUntil, lane: id.split('_')[0] };
};

/** Cung đá bao quanh điểm (cx, cy) bán kính r (toạ độ gốc), chừa cửa mở về hướng `face` (độ, 0 = +x, 90 = +y), góc bao `span`. */
function arcWalls(cx, cy, r0, face, span = 200, n = 3, w = 460) {
  const out = [], back = face + 180, a0 = back - span / 2, step = span / n, r = r0 + w / 2 / K; // dày ra phía sau, lòng trại giữ nguyên
  for (let i = 0; i < n; i++) {
    const a = (a0 + i * step + 6) * Math.PI / 180, b = (a0 + (i + 1) * step - 6) * Math.PI / 180;
    out.push({ x1: (cx + D.cos(a) * r) * K, y1: (cy + D.sin(a) * r) * K, x2: (cx + D.cos(b) * r) * K, y2: (cy + D.sin(b) * r) * K, rock: true, w });
  }
  return out;
}

// ── Bố cục rừng: MỘT phần tư rừng mẫu, ba phần tư kia là ảnh đối xứng ───────────────────────────────────────────────────────────────
// Bản đồ có hai trục đối xứng: trục sông y = x (Xanh ↔ Đỏ) và trục đường Giữa x + y = 6400 (rừng phía đường Đền ↔ rừng phía đường Sông).
// Chỉ khai phần tư "rừng Đền phía Xanh" — tam giác giữa đường Đền (x = 800), đường Giữa và sông; `anti` lật nó qua trục đường Giữa thành
// rừng Sông phía Xanh, `mirrorSeg` lật cả hai sang phía Đỏ. Bốn phần tư giống hệt nhau nên không đường nào, đội nào lợi hơn về địa hình.
//
// Mỗi phần tư là các KHỐI ĐẤT ĐÁ liền mảng (không còn rải tảng đá lẻ), giữa chúng là lối đi rộng ≥ 530 (nhiều tướng dàn hàng):
//   · bờ rào đường Đền: khối liền dọc mép đường, mở đúng HAI cổng giữa các vòng trụ (ngoài–trong, trong–nhà): vào rừng không ăn đạn trụ;
//   · bờ rào đường Giữa: mở MỘT cổng giữa trụ ngoài và trụ trong (khoảng trụ trong–nhà đã nằm trong tường nhà);
//   · sống đá bờ sông: ngăn rừng với sông, chừa HAI cửa sông — bãi đầm (cạnh hang lớn) và cửa mũi rừng (cạnh đường Giữa);
//   · ba hõm trại quái tựa lưng vào bờ rào, miệng mở ra lối dọc giữa rừng: bùa (giữa), sói (gần nhà), cóc (mũi rừng, gần cửa sông).
// Lối chính: cổng ngoài → bãi đầm → hang lớn; lối dọc giữa rừng nối bãi đầm – miệng trại bùa – cổng trong – trại sói – cổng đường Giữa;
// lối mũi rừng nối cửa sông – trại cóc – lối dọc. tools/t_mapnav.mjs đo: không túi đất kín, tuyến tới mọi trại / hang / cổng rộng ≥ 530.
const HEDGE_W = 300, HEDGE_X = 800 + (LANE_W / 2 + HEDGE_W / 2 + 40) / K;          // bờ rào: dày 300, mép cách mép đường 40 (đơn vị thế giới)
const anti = ([x, y]) => [6400 - y, 6400 - x];                                      // lật qua trục đường Giữa (toạ độ gốc)
const antiSeg = (w) => { const [x1, y1] = anti([w.x1 / K, w.y1 / K]), [x2, y2] = anti([w.x2 / K, w.y2 / K]); return { ...w, x1: x1 * K, y1: y1 * K, x2: x2 * K, y2: y2 * K }; };
const seg = (x1, y1, x2, y2, w, f = {}) => ({ x1: x1 * K, y1: y1 * K, x2: x2 * K, y2: y2 * K, w, ...f });
/** Điểm trên bờ rào đường Giữa (phía rừng Đền): cách nhà chính Xanh `d` dọc đường, lùi vào rừng `off` tính từ tim đường (toạ độ gốc). */
const midPt = (d, off = HEDGE_X - 800) => [800 + (d - off) / Math.SQRT2, 5600 - (d + off) / Math.SQRT2];
/** Điểm cách trục sông `c` về phía Xanh, tại vị trí s dọc trục (x = y = s) — toạ độ gốc. */
const bankPt = (s, c) => [s - c / Math.SQRT2, s + c / Math.SQRT2];
// Cổng (khoảng trống giữa hai đầu khối, toạ độ gốc): đường Đền theo y, đường Giữa theo quãng đường d từ nhà chính.
const GATE = { outer: [2120, 2340], inner: [3265, 3485], mid: [2200, 2420] }, HR = HEDGE_W / 2 / K; // HR: bán kính đầu khối bờ rào
const Q_HEDGE = [
  seg(HEDGE_X, 1780, HEDGE_X, GATE.outer[0] - HR, HEDGE_W),                          // mép đầm → cổng ngoài: đầu bắc chạm mép nước (đường ra sông qua góc)
  seg(HEDGE_X, GATE.outer[1] + HR, HEDGE_X, GATE.inner[0] - HR, HEDGE_W),            // lưng trại bùa
  seg(HEDGE_X, GATE.inner[1] + HR, HEDGE_X, 4185, HEDGE_W),                          // cổng trong → tường nhà (đầu nam gối lên tường nhà)
  (() => { const [a, b] = [midPt(1480), midPt(GATE.mid[0] - HR)]; return seg(...a, ...b, HEDGE_W); })(), // tường nhà → cổng đường Giữa
  (() => { const [a, b] = [midPt(GATE.mid[1] + HR), midPt(2860)]; return seg(...a, ...b, HEDGE_W); })(), // cổng đường Giữa → mũi rừng
];
// Cột đá đèn lồng đánh dấu cổng vào rừng (đoạn dài 0 = va chạm tròn, đứng ngay đầu khối bờ rào nên không làm hẹp cổng).
const Q_POSTS = [
  [HEDGE_X, GATE.outer[0] - HR], [HEDGE_X, GATE.outer[1] + HR], [HEDGE_X, GATE.inner[0] - HR], [HEDGE_X, GATE.inner[1] + HR],
  midPt(GATE.mid[0] - HR), midPt(GATE.mid[1] + HR),
].map(([x, y]) => seg(x, y, x, y, 240, { pillar: true }));
// Sống đá bờ sông: ngăn rừng với sông từ mép đầm tới trước cửa mũi rừng (tim khối cách trục sông 420, dày 750) — rừng ra sông qua hai cửa:
// bãi đầm (giữa bờ rào đường Đền và đầu sống đá) và cửa mũi rừng (giữa cuối sống đá và trại cóc).
const Q_RIDGE = (() => { const [a, b] = [bankPt(2227, 420), bankPt(2404, 420)]; return [seg(...a, ...b, 750, { rock: true })]; })();
// Trại quái của phần tư mẫu (toạ độ gốc). arc: hõm đá ôm lưng trại — r lòng hõm, face hướng miệng (độ, 0 = +x, 90 = +y), span góc ôm.
const Q_CAMPS = [
  { id: 'buff', x: 1590, y: 2900, arc: { r: 250, face: 0, span: 180 } },               // tựa bờ rào đường Đền giữa hai cổng, miệng mở ra ngã ba giữa rừng
  { id: 'wolves', x: 1490, y: 3935, arc: { r: 230, face: 270, span: 200 } },           // lưng lấp kín góc bờ rào – tường nhà, miệng mở lên sân cổng trong
  { id: 'toad', x: 2274, y: 3193, arc: { r: 180, face: 225, span: 140 } },             // mũi rừng: lưng tựa bờ rào đường Giữa, miệng nhìn ngược dòng về ngã ba
];
const Q_WALLS = [...Q_HEDGE, ...Q_RIDGE, ...Q_CAMPS.flatMap((c) => arcWalls(c.x, c.y, c.arc.r, c.arc.face, c.arc.span, 3, 420))];
// Bụi cỏ của phần tư mẫu (toạ độ gốc): mỗi bụi canh một ngã rẽ. Không bụi nào trong tầm trụ.
const Q_BUSHES = [
  { x: 1405, y: 2265, w: 250, h: 170 },                                               // bãi đầm, ngay trong cổng ngoài (canh cổng + sườn hang lớn)
  { x: 2190, y: 2860, w: 230, h: 190 },                                               // cửa mũi rừng (lối sông ↔ ngã ba, ngay trước miệng trại cóc)
  { x: 1905, y: 3760, w: 230, h: 170 },                                               // trong cổng đường Giữa, giữa trại sói và trại cóc
];
const antiBush = (b) => { const [x, y] = anti([b.x, b.y]); return { ...b, x, y, w: b.h, h: b.w }; };

// Trại quái rừng phía Xanh (toạ độ gốc; phía Đỏ đối xứng). type: xem data/jungle.js. Rừng Đền: bùa xanh; rừng Sông: bùa đỏ.
const CAMP_TYPE = { buff: ['linh_thuy', 'hoa_nham'], wolves: ['soi_da', 'soi_da'], toad: ['coc_reu', 'coc_reu'] };
const CAMP_ID = { buff: ['blue', 'red'], wolves: ['wolves_l', 'wolves_b'], toad: ['toad_l', 'toad_b'] };
const CAMPS_BLUE = [0, 1].flatMap((q) => Q_CAMPS.map((c) => { const [x, y] = q ? anti([c.x, c.y]) : [c.x, c.y]; return { id: CAMP_ID[c.id][q], type: CAMP_TYPE[c.id][q], x, y }; }));
// Mục tiêu lớn: cả bốn nằm TRÊN TRỤC SÔNG y = x nên cách đều hai đội (03 §A7). Đo 64 trận toàn máy đổi bên: hang lệch về một bờ thì đội
// bờ đó thắng 60–65%, trên trục 47–54% (docs/DECISIONS.md) — vì thế hang KHÔNG dời vào bờ như các game đối xứng tâm, mà sông được nắn lại:
// quanh Long Ngư (phút 2, gần đường Đền) và Hổ Lôi (phút 8, gần đường Sông) sông phình thành đầm, hang là cù lao giữa đầm, nước chảy
// vòng hai bên (data/river.js). Miệng hang mở về giữa bản đồ, cửa hậu hẹp mở về phía đường cánh, hai vách sườn quay ra hai nhánh sông.
const PIT = 1850;                    // toạ độ gốc của Long Ngư trên trục (Hổ Lôi: 6400 − PIT)
const BOSSES = [
  { id: 'long_ngu', type: 'long_ngu', x: PIT, y: PIT, boss: true, back: -Math.PI * 0.75 }, // lưng hang chĩa đúng về góc (ảnh x↔y trùng chính nó)
  { id: 'ho_loi', type: 'ho_loi', x: 6400 - PIT, y: 6400 - PIT, boss: true, back: Math.PI * 0.25 },
  // Hai mục tiêu cuối trận (phút 12, 03 §A9) trên mũi đá chìa ra vực ở hai đầu sông: Thần Điểu (tổ chim, góc đường Đền), Tà Thần (hang tím, góc đường Sông).
  { id: 'than_dieu', type: 'than_dieu', x: 560, y: 560, boss: true, back: -Math.PI * 0.75 },
  { id: 'ta_than', type: 'ta_than', x: 5840, y: 5840, boss: true, back: Math.PI * 0.25 },
];
/** Bán kính hang mục tiêu lớn (toạ độ thế giới) — dùng chung cho dựng hình và va chạm. */
export const LAIR_R = { long_ngu: 600, ho_loi: 640, than_dieu: 560, ta_than: 600 };
/** Cù lao hang giữa đầm: miệng hang rộng (nửa góc mở), cửa hậu hẹp (nửa góc mở) — radian, tính từ hướng trước / hướng lưng. */
export const PIT_GATE = { mouth: 0.96, rear: 0.44 };
/** Màu nhận diện của từng mục tiêu lớn (đèn cột cổng hang, vết nứt trên bệ, biểu tượng bản đồ nhỏ). */
export const PIT_GLOW = { long_ngu: 0xffa63a, ho_loi: 0x6ab8ff, than_dieu: 0x7ae8ff, ta_than: 0xb05aff };
/** Vách hang thành tường va chạm — CŨNG là dữ liệu dựng hình (render/env/jungleDecor.js đọc lại đúng các đoạn này, không tính riêng):
 *  cù lao giữa đầm (Long Ngư, Hổ Lôi) = hai vách sườn hình cung, chừa miệng hang phía trước và cửa hậu phía lưng; hang tím = vòng rễ
 *  phía sau; tổ chim = vòng cành quanh tổ chừa lối vào. Mỗi đoạn mang `rise` 0…1 (độ cao tương đối, cao nhất giữa vách). */
export function lairWallSegs(c) {
  const R = LAIR_R[c.type], back = c.back ?? -Math.PI / 2, arc = (r, a0, a1, n, w) => Array.from({ length: n }, (_, i) => {
    const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n;
    return { x1: c.x + D.cos(u0) * r, y1: c.y + D.sin(u0) * r, x2: c.x + D.cos(u1) * r, y2: c.y + D.sin(u1) * r, w, lair: true, rise: 1 - Math.abs((i + 0.5) / n - 0.5) * 2 };
  });
  if (c.type === 'long_ngu' || c.type === 'ho_loi') {
    const flanks = [1, -1].flatMap((sd) => arc(R * 1.12, back + sd * PIT_GATE.rear, back + sd * (Math.PI - PIT_GATE.mouth), 4, R * 0.4));
    // cột đá đèn ở bốn đầu vách (hai bên miệng hang, hai bên cửa hậu): cùng kiểu cột cổng rừng, đèn mang màu riêng của mục tiêu; nằm gọn trong
    // đầu vách nên không chặn thêm lối nào
    const posts = [1, -1].flatMap((sd) => [back + sd * PIT_GATE.rear, back + sd * (Math.PI - PIT_GATE.mouth)])
      .map((a) => { const x = c.x + D.cos(a) * R * 1.12, y = c.y + D.sin(a) * R * 1.12; return { x1: x, y1: y, x2: x, y2: y, w: 200, pillar: true, lair: true, glow: PIT_GLOW[c.type] }; });
    return [...flanks, ...posts];
  }
  if (c.type === 'ta_than') return arc(R * 1.05, back - 1.25, back + 1.25, 5, R * 0.28);
  if (c.type === 'than_dieu') return arc(R * 1.0, back - (Math.PI - 0.75), back + (Math.PI - 0.75), 8, R * 0.22);
  return [];
}
// Trụ phía Xanh (toạ độ gốc): mỗi đường ba trụ CÁCH ĐỀU (nhà → trong → ngoài), hai đường cánh giống hệt nhau qua đường chéo phụ,
// phía Đỏ là ảnh x↔y. Đường cánh: nhà cách nhà chính 950, khoảng cách 1575, trụ ngoài cách góc sông 700. Đường giữa: khoảng 997.
const md = (d) => [800 + d / Math.SQRT2, 5600 - d / Math.SQRT2];
const TOWER_POS = {
  // trụ ngoài sát sông nhất có thể mà vòng bắn (1050) không chạm nước: mép vòng cách mép sông ~20 đơn vị (tools/mapplan.html).
  // (vị trí cũ y=1500 thực ra vòng bắn lấn xuống sông ~200.) Trụ trong/nhà chia đều phía sau: khe giữa hai vòng trụ ~1350.
  temple_outer: [800, 1658], temple_inner: [800, 2800], temple_home: [800, 3950],
  mid_outer: md(2785), mid_inner: md(1840), mid_home: md(900),
  river_outer: [4742, 5600], river_inner: [3600, 5600], river_home: [2450, 5600],
};
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return D.hypot(x - a[0] - dx * t, y - a[1] - dy * t); }
// Phía Xanh: hai phần tư rừng (mẫu + ảnh qua trục đường Giữa) và tường nhà.
const W_BLUE = [
  ...Q_WALLS, ...Q_WALLS.map(antiSeg),
  // bệ đá điêu khắc ngăn hai khoảng trống giữa ba trụ nhà (lãnh địa nhà) — cung quanh nhà chính
  ...[[-84, -51, 0], [-39, -6, 1]].flatMap(([a0, a1, k]) => { const R = 1400, n = 6, pts = Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [800 + D.cos(a) * R, 5600 + D.sin(a) * R]; });
    return pts.slice(1).map((p, i) => ({ x1: pts[i][0] * K, y1: pts[i][1] * K, x2: p[0] * K, y2: p[1] * K, w: 260, baseWall: k })); }),
];
/** Cắt bỏ phần đoạn tường lấn vào lòng đường (đường rộng hơn thì cung đá trại/đá rừng sát đường tự ngắn lại); giữ đoạn liền dài nhất. */
function trimToLanes(w) {
  const half = (w.w ?? 110) / 2, n = 40, ok = [];
  const laneD = (x, y) => Math.min(...LANES.flatMap((ln) => ln.pts.slice(1).map((q, i) => segDist(x, y, ln.pts[i], q))));
  for (let i = 0; i <= n; i++) { const t = i / n; ok.push(laneD(w.x1 + (w.x2 - w.x1) * t, w.y1 + (w.y2 - w.y1) * t) >= LANE_W / 2 + half + 10); }
  let best = null, start = -1;
  for (let i = 0; i <= n + 1; i++) { if (i <= n && ok[i]) { if (start < 0) start = i; } else if (start >= 0) { if (!best || i - 1 - start > best[1] - best[0]) best = [start, i - 1]; start = -1; } }
  if (!best || (best[1] - best[0]) / n * D.hypot(w.x2 - w.x1, w.y2 - w.y1) < 140) return null;
  const [a, b] = [best[0] / n, best[1] / n], dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  return { ...w, x1: w.x1 + dx * a, y1: w.y1 + dy * a, x2: w.x1 + dx * b, y2: w.y1 + dy * b };
}
/** Tường biên: tấm đá xẻ lớn chạy suốt mép ngoài hai đường cánh (từ sân nhà này tới sân nhà kia), đóng khung bản đồ —
 *  phía ngoài không thuộc sân chơi. Chỉ khai nửa phía Xanh (phần còn lại là ảnh đối xứng x↔y); đầu tường có đoạn chặn ra tới viền. */
const BORDER_W = 260, BX = 440, BR = 860, BC = 1300, BEND = 5100;
// Mũi đá chìa ra vực ở góc trên-trái (góc dưới-phải là ảnh qua đường chéo phụ): tâm (PX, PY), bán kính sân trong PR (toạ độ gốc).
const PX = 600, PY = 600, PR = 330;
const borderHalf = (() => {
  // giao của cung tường góc (tâm BC, bán kính BR) với vành mũi đá (tâm PX, PY, bán kính PR) — phía Xanh (y > x)
  const d = D.hypot(BC - PX, BC - PY), ux = (BC - PX) / d, uy = (BC - PY) / d, aa = (d * d + PR * PR - BR * BR) / (2 * d), hh = Math.sqrt(PR * PR - aa * aa);
  const ix = PX + aa * ux - hh * uy, iy = PY + aa * uy + hh * ux, phi = D.atan2(iy - BC, ix - BC + 0) + (D.atan2(iy - BC, ix - BC) < 0 ? Math.PI * 2 : 0), th0 = D.atan2(iy - PY, ix - PX);
  const pts = [[BX, BEND]]; // đường Đền: mép trái, lên tới góc, bo cung quanh góc tới vành mũi đá
  for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * (phi - Math.PI); pts.push([BC + D.cos(a) * BR, BC + D.sin(a) * BR]); }
  for (let i = 1; i <= 6; i++) { const a = th0 + (i / 6) * (Math.PI * 1.25 - th0); pts.push([PX + D.cos(a) * PR, PY + D.sin(a) * PR]); } // vành mũi đá (nửa phía Xanh) tới đường chéo
  const seg = (a, b) => ({ x1: a[0] * K, y1: a[1] * K, x2: b[0] * K, y2: b[1] * K, w: BORDER_W, border: true });
  const temple = [seg([60, BEND], [BX, BEND]), ...pts.slice(1).map((p, i) => seg(pts[i], p))];
  const flip = ([x, y]) => [6400 - y, 6400 - x]; // đường Sông = ảnh của đường Đền qua đường chéo phụ
  const river = temple.map((w) => { const a = flip([w.x1 / K, w.y1 / K]), b = flip([w.x2 / K, w.y2 / K]); return seg(a, b); });
  return [...temple, ...river];
})();
// Khối đá rừng được đặt có chủ đích quanh tường nhà (lưng trại sói tựa vào tường nhà) nên không lọc bỏ đoạn chạm tường nhà như bản rải đá cũ;
// chỉ cắt phần lấn vào lòng đường. tools/t_mapnav.mjs kiểm không có túi đất kín / hành lang hẹp.
const W_BLUE_T = [...W_BLUE.map(trimToLanes).filter(Boolean), ...borderHalf];
/** Điểm (toạ độ thế giới) nằm ngoài tường biên (vùng không thuộc sân chơi) — dùng để trồng rừng dày phía ngoài khung. */
function outOfBounds(x, y, pad = 0) {
  const test = (u, v) => { u /= K; v /= K; const p = pad / K, e = BX - BORDER_W / K / 2 - p;
    if (D.hypot(u - PX, v - PY) < PR + BORDER_W / K / 2 + p) return false; // mũi đá chìa ra vực
    return (u < e && v < BEND - p) || (u < BC && v < BC && D.hypot(u - BC, v - BC) > BR + BORDER_W / K / 2 + p) || (v < e && u < BEND - p); };
  return test(x, y) || test(A - y, A - x);
}
const mirrorSeg = (w) => ({ ...w, x1: w.y1, y1: w.x1, x2: w.y2, y2: w.x2 });
const POSTS_BLUE = [...Q_POSTS, ...Q_POSTS.map(antiSeg)];

export const ARENA = {
  id: 'arena5v5', w: A, h: A,
  margin: 260,                        // viền ngoài không đi được (vách núi)
  outOfBounds,                        // ngoài tường biên hai đường cánh
  oobShape: { K, BX, BEND, BC, BR, BW: BORDER_W, A, PX, PY, PR }, // hình học vùng ngoài biên (shader cắt nền / vực)
  lanes: LANES,
  // sông dọc trục y = x: dòng chính rộng 1500, hẹp còn 1200 ở hai đầu (chỗ đường cánh băng qua), phình thành đầm quanh hai hang lớn —
  // hang là cù lao giữa đầm, nước chảy vòng hai bên (data/river.js). Chỉ để nhìn / định hướng: mô phỏng không đọc.
  river: makeRiver({ size: A, width: 500 * K, narrow: { at: 2600, to: 5200, width: 400 * K },
    pools: [PIT, 6400 - PIT].map((p, i) => ({ x: p * K, y: p * K, along: 2000, across: 1500, isle: LAIR_R[i ? 'ho_loi' : 'long_ngu'] * 1.12 + 190 })) }),
  spawn: [{ x: 430 * K, y: 5970 * K }, { x: 5970 * K, y: 430 * K }],
  structures: [
    { id: 'core', kind: 'core', x: BASE[0], y: BASE[1], hp: 7000, atk: 350, range: 1050, rate: 1.2, armor: 100, radius: 220, invulnUntil: ['temple_home', 'mid_home', 'river_home'] },
    ...['temple', 'mid', 'river'].flatMap((l) => [tower(l + '_outer', 'outer', ...TOWER_POS[l + '_outer'], null), tower(l + '_inner', 'inner', ...TOWER_POS[l + '_inner'], l + '_outer'), tower(l + '_home', 'home', ...TOWER_POS[l + '_home'], l + '_inner')]),
  ],
  fountain: { x: 430 * K, y: 5970 * K, range: 800, dps: 1000, healRadius: 650, healPct: 0.15 },
  // tường: danh sách đoạn dày (capsule). Phía Đỏ là ảnh qua trục sông; cột đèn cổng rừng và vách hang thêm sau khi cắt tỉa.
  walls: { thickness: 110, segs: [...W_BLUE_T, ...W_BLUE_T.map(mirrorSeg), ...POSTS_BLUE, ...POSTS_BLUE.map(mirrorSeg), ...BOSSES.flatMap((b) => lairWallSegs({ ...b, x: b.x * K, y: b.y * K }))] },
  // bụi cỏ (toạ độ thế giới): hình chữ nhật theo trục (x, y, w, h) hoặc "con nhộng" (cap = đoạn thẳng + bán kính r). Khai phía Xanh, phía Đỏ
  // do bushRects lấy đối xứng; bụi nằm trên trục / đã khai đủ các ảnh thì noMirror.
  bushes: [
    ...[...Q_BUSHES, ...Q_BUSHES.map(antiBush)].map((b) => ({ ...b, x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K })),
    // bụi mọc mép nước ở bốn cửa sông, giữa trụ ngoài đường cánh và cửa hậu hang lớn: khai một bụi (bờ phía Đỏ, đầu đường Đền), ba bụi kia là
    // ảnh qua hai trục. Đường tâm cách trục sông 219 (trong nước, sát bờ); đầu gần trụ giữ mép bụi ngoài tầm trụ (≥ 350 + bán kính tướng).
    ...[[1560, 1250, 1654, 1344, 95]].flatMap(([a, b, c, d, r]) => [[a, b, c, d], [b, a, d, c], [6400 - c, 6400 - d, 6400 - a, 6400 - b], [6400 - d, 6400 - c, 6400 - b, 6400 - a]]
      .map((q) => ({ cap: q.map((v) => v * K), r: r * K, bank: true, noMirror: true }))),
    // hai bãi lau sậy GIỮA DÒNG hai bên chỗ đường Giữa băng qua, chạy DỌC theo dòng chảy (trước đây là hai khối cỏ nằm ngang chắn cả lòng
    // sông, trông như cây cầu cỏ): chốt núp giữa bản đồ, hai bên còn lạch nước trống ~420 cho đi vòng. Trên trục đối xứng nên mỗi bãi một.
    ...[-470, 470].map((d) => { const c = 3200 + d, h = 210; return { cap: [(c - h) * K, (c - h) * K, (c + h) * K, (c + h) * K], r: 110 * K, big: true, river: true }; }),
  ],
  vision: true, // sương mù chiến trường + bụi cỏ ẩn (sim/vision.js)
  // quái rừng (đủ hai phía) + mục tiêu lớn; toạ độ thế giới. Phía Đỏ lấy đối xứng của phía Xanh.
  camps: [
    ...CAMPS_BLUE.flatMap((c) => [{ ...c, x: c.x * K, y: c.y * K, side: 0 }, { ...c, id: c.id + '_r', x: c.y * K, y: c.x * K, side: 1 }]),
    ...BOSSES.map((b) => ({ ...b, x: b.x * K, y: b.y * K, side: null })),
  ],
  // fortifyUntil / fortifyTaken: giáp trụ ngoài — trước phút 4 trụ ngoài chỉ nhận 60% sát thương (đầu trận không bị phá trụ quá sớm);
  // homeRegen: trụ nhà hồi 15 máu/giây khi không bị đánh `regenAfter` giây (nhà chính hồi riêng 20/giây). minionAggro: lính đổi mục tiêu
  // sang tướng địch vừa đánh tướng phe mình trong `minionAggroRange`, giữ `minionAggroFor` giây.
  tower: { minionAggroRadius: 900, backdoorTaken: 0.4, streakStep: 0.3, streakMax: 1.5, minionPct: 0.45, siegePct: 0.2, aggroLinger: 90,
    fortifyUntil: 240, fortifyTaken: 0.6, homeRegen: 15, regenAfter: 8, minionAggroRange: 700, minionAggroFor: 2.5 },
  // cục máu sau trụ ngoài mỗi đường (sim/orbs.js): cách trụ `behind` về phía nhà, tướng phe đó chạm vào → hồi máu + năng lượng, mọc lại sau `respawn` giây
  orbs: { behind: 560, radius: 120, respawn: 60, hpPct: 0.15, manaPct: 0.15 },
  waves: { first: 20, every: 30, sword: 3, archer: 2, siegeEvery: 3, siegeEveryLate: 2, siegeLateFrom: 600, gap: 14, spawnDist: 900 },
  laneMult: 1,
  mirror: swap,
};
