// Bản đồ 1v1 "Cầu Đá Đơn" (03 §B). 5600 × 2400, đường ngang y=1200 rộng 900, khe nước x=2800 rộng 400.
// Phía Xanh (team 0) khai báo ở đây; phía Đỏ (team 1) lấy đối xứng qua x = 2800: (x, y) → (5600 − x, y).
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
  waves: { first: 15, every: 25, sword: 3, archer: 1, siegeEvery: 3, spawnX: 900, gap: 14 },
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
  return Math.hypot(p.x - x1 - dx * t, p.y - y1 - dy * t) <= b.r;
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
const K = 3.0, A = 6400 * K, KS = K / 2.7; // KS: hệ số so với bản K = 2.7 (các khoảng tính theo đơn vị thế giới)
const P = (x, y) => [x * K, y * K];
const swap = (x, y) => ({ x: y, y: x });

/** Bo tròn các góc của đường gấp khúc: thay mỗi góc bằng cung 2 điểm cách đỉnh r (xấp xỉ bằng bezier bậc 2, 6 đoạn). */
function roundPath(pts, r) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const da = Math.hypot(a[0] - b[0], a[1] - b[1]), dc = Math.hypot(c[0] - b[0], c[1] - b[1]), rr = Math.min(r, da * 0.45, dc * 0.45);
    const p0 = [b[0] + ((a[0] - b[0]) / da) * rr, b[1] + ((a[1] - b[1]) / da) * rr], p2 = [b[0] + ((c[0] - b[0]) / dc) * rr, b[1] + ((c[1] - b[1]) / dc) * rr];
    for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const LANE_W = 1200; // rộng hơn (880 → 1060 → 1200)
// Ba đường, đi từ nhà chính Xanh sang nhà chính Đỏ (đối xứng nên đường phía Đỏ chỉ là đi ngược lại).
const BASE = P(800, 5600), FOE = P(5600, 800);
const LANES = [
  { id: 'temple', width: LANE_W, pts: roundPath([BASE, P(800, 800), FOE], 500 * K) },
  { id: 'mid', width: LANE_W, pts: [BASE, FOE] },
  { id: 'river', width: LANE_W, pts: roundPath([BASE, P(5600, 5600), FOE], 500 * K) },
];

const tower = (id, tier, x, y, invulnUntil) => {
  const T = { outer: [4000, 80, 220], inner: [4500, 90, 260], home: [5000, 100, 300] }[tier];
  return { id, kind: 'tower', x: x * K, y: y * K, hp: T[0], atk: T[2], range: 950, rate: 1.0, armor: T[1], radius: 85, invulnUntil, lane: id.split('_')[0] };
};

/** Tường dọc mép đường: đoạn dài `piece`, cách nhau `gap`, lùi `inset` ở hai đầu (chừa sân căn cứ và ngã tư giữa bản đồ). */
function edgeWalls(path, sides, { w = 300, off = LANE_W / 2 + w / 2 + 40, from = 0, to = Infinity, piece = 1100, gap = 520, phase = 0 } = {}) {
  const out = [];
  let acc = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
    if (L < 200) { acc += L; continue; } // đoạn ngắn của cung bo góc: bỏ (góc cua để trống)
    for (const sd of sides) {
      let t = Math.max(0, from - acc) + phase;
      while (t < L - 60 && acc + t < to) {
        const t1 = Math.min(L, t + piece, to - acc);
        if (t1 - t > 250) out.push({ x1: ax + ux * t - uy * off * sd, y1: ay + uy * t + ux * off * sd, x2: ax + ux * t1 - uy * off * sd, y2: ay + uy * t1 + ux * off * sd, w });
        t = t1 + gap;
      }
    }
    acc += L;
  }
  return out;
}

const guard = (path, sides, o) => edgeWalls(path, sides, o);

/** Cung đá bao quanh điểm (cx, cy) bán kính r (toạ độ gốc), chừa cửa mở về hướng `face` (độ, 0 = +x, 90 = +y), góc bao `span`. */
function arcWalls(cx, cy, r0, face, span = 200, n = 3, w = 460) {
  const out = [], back = face + 180, a0 = back - span / 2, step = span / n, r = r0 + w / 2 / K; // dày ra phía sau, lòng trại giữ nguyên
  for (let i = 0; i < n; i++) {
    const a = (a0 + i * step + 6) * Math.PI / 180, b = (a0 + (i + 1) * step - 6) * Math.PI / 180;
    out.push({ x1: (cx + Math.cos(a) * r) * K, y1: (cy + Math.sin(a) * r) * K, x2: (cx + Math.cos(b) * r) * K, y2: (cy + Math.sin(b) * r) * K, rock: true, w });
  }
  return out;
}

// Trại quái rừng phía Xanh (toạ độ gốc; phía Đỏ đối xứng). type: xem data/jungle.js. arc: bệ đá lãnh thổ sau trại.
const CAMPS_BLUE = [
  { id: 'blue', type: 'linh_thuy', x: 1400, y: 2800, arc: { r: 400, face: 300 } }, // cửa trại mở lên phía hang Long Ngư
  { id: 'wolves_l', type: 'soi_da', x: 1380, y: 4050, arc: { r: 360, face: -60 } },
  { id: 'toad_l', type: 'coc_reu', x: 2080, y: 3250, arc: { r: 330, face: 200 } },
  { id: 'red', type: 'hoa_nham', x: 3700, y: 4880, arc: { r: 400, face: 200 } },
  { id: 'wolves_b', type: 'soi_da', x: 2350, y: 4900, arc: { r: 360, face: -15 } },
  { id: 'toad_b', type: 'coc_reu', x: 3150, y: 4470, arc: { r: 330, face: 90 } },
];
// Mục tiêu lớn giữa sông (nằm trên trục đối xứng nên chỉ có một mỗi loại)
const BOSSES = [ // hang nằm ở mép rừng mỗi bên sông, sát hai đường cánh (như Liên Quân): Long Ngư phía Xanh gần đường trên, Hổ Lôi phía Đỏ gần đường dưới
  // Hai hang nằm trên MŨI ĐÁ chìa ra vực ở hai đầu sông (sông đổ xuống vực quanh mũi đá) — Long Ngư (tổ rồng) góc trên-trái cạnh đường Đền,
  // Hổ Lôi (hang tím) góc dưới-phải cạnh đường Sông; nằm trên trục đối xứng nên công bằng cho hai phe. back: hướng lưng hang (ra vực).
  { id: 'long_ngu', type: 'long_ngu', x: 560, y: 560, boss: true, back: -2.356 },
  { id: 'ho_loi', type: 'ho_loi', x: 5840, y: 5840, boss: true, back: 0.785 },
];
// Bụi cỏ phía Xanh (toạ độ gốc; phía Đỏ đối xứng). Không bụi nào nằm trong tầm bắn trụ (750); bụi gần trụ có tảng đá ghép cạnh (BUSH_ROCKS).
const BUSHES_BLUE = [
  { x: 2750, y: 4700, w: 440, h: 300, big: true }, { x: 3250, y: 4980, w: 440, h: 260, big: true },              // bụi lớn "macro" giữa rừng dưới
  ...[[1330, 3230], [1750, 3500], [2880, 5100]]
    .map(([x, y], i) => ({ x, y, w: (i % 3 ? 220 : 260), h: (i % 2 ? 170 : 200) })),
];
// Trụ phía Xanh (toạ độ gốc): mỗi đường ba trụ CÁCH ĐỀU (nhà → trong → ngoài), hai đường cánh giống hệt nhau qua đường chéo phụ,
// phía Đỏ là ảnh x↔y. Đường cánh: nhà cách nhà chính 950, khoảng cách 1575, trụ ngoài cách góc sông 700. Đường giữa: khoảng 997.
const md = (d) => [800 + d / Math.SQRT2, 5600 - d / Math.SQRT2];
const TOWER_POS = {
  temple_outer: [800, 1500], temple_inner: [800, 3075], temple_home: [800, 4650],
  mid_outer: md(2894), mid_inner: md(1897), mid_home: md(900),
  river_outer: [4900, 5600], river_inner: [3325, 5600], river_home: [1750, 5600],
};
const TOWERS_BLUE = Object.values(TOWER_POS);
const allTowers = [...TOWERS_BLUE, ...TOWERS_BLUE.map(([x, y]) => [y, x])];
/** Bụi gần trụ (cách vùng bắn < ~700 gốc): một dải tảng đá áp sát cạnh bụi phía xa trụ, làm chỗ núp có lưng tựa như Liên Quân. */
function bushRocks(b) {
  let best = null, bd = Infinity;
  for (const [tx, ty] of allTowers) { const d = Math.hypot(Math.max(Math.abs(tx - b.x) - b.w / 2, 0), Math.max(Math.abs(ty - b.y) - b.h / 2, 0)); if (d < bd) { bd = d; best = [tx, ty]; } }
  if (bd > 700) return [];
  // 4 cạnh ứng viên; bỏ cạnh làm đá lấn vào đường, chọn cạnh xa trụ nhất
  const g = 60, sides = [
    [b.x + b.w / 2 + g, b.y - b.h * 0.55, b.x + b.w / 2 + g, b.y + b.h * 0.55], [b.x - b.w / 2 - g, b.y - b.h * 0.55, b.x - b.w / 2 - g, b.y + b.h * 0.55],
    [b.x - b.w * 0.55, b.y + b.h / 2 + g, b.x + b.w * 0.55, b.y + b.h / 2 + g], [b.x - b.w * 0.55, b.y - b.h / 2 - g, b.x + b.w * 0.55, b.y - b.h / 2 - g]];
  const onLane = (x, y) => LANES.some((ln) => ln.pts.some((q, i) => i > 0 && segDist(x * K, y * K, ln.pts[i - 1], q) < LANE_W / 2 + 120));
  const ok = sides.filter(([x1, y1, x2, y2]) => ![0, 0.5, 1].some((t) => onLane(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)));
  if (!ok.length) return [];
  const far = ok.reduce((a, c) => (Math.hypot((c[0] + c[2]) / 2 - best[0], (c[1] + c[3]) / 2 - best[1]) > Math.hypot((a[0] + a[2]) / 2 - best[0], (a[1] + a[3]) / 2 - best[1]) ? c : a));
  return [{ x1: far[0] * K, y1: far[1] * K, x2: far[2] * K, y2: far[3] * K, rock: true, bushRock: true, w: 180 }];
}
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); }
/** Bệ đá trong rừng (kiểu Liên Quân): chia rừng thành lối đi vòng giữa các trại, chắn bờ sông, túi núp cạnh mục tiêu lớn. */
const rockLine = (pts, w = 520) => pts.slice(1).map((p, i) => ({ x1: pts[i][0] * K, y1: pts[i][1] * K, x2: p[0] * K, y2: p[1] * K, rock: true, w }));
const JUNGLE_ROCKS = [
  ...rockLine([[1650, 3000], [1850, 2850]]),                 // giữa bùa xanh và trại cóc
  ...rockLine([[1500, 3470], [1420, 3730]]),                 // giữa trại sói và trại cóc
  ...rockLine([[2250, 2900], [2450, 3050]]),                 // túi bờ sông trước trại cóc
  ...rockLine([[1620, 2260], [1800, 2440]]),                 // bờ sông cạnh đầm Long Ngư
  ...rockLine([[2540, 5100], [2680, 4980]]),                 // giữa trại sói dưới và bụi lớn
  ...rockLine([[3330, 4740], [3420, 4580]]),                 // giữa trại cóc dưới và bùa đỏ
];
// Phía Xanh: dọc Đường Đền (mép trong, về phía rừng), hai bên Đường Giữa (tới sát sông), mép trong Đường Sông.
const W_BLUE = [
  // bệ đá ngăn rừng với đường, chạy gần hết nửa đường phía Xanh, có khe đi tắt (không có lướt thì phải đi vòng qua khe)
  ...guard(LANES[0].pts, [1], { from: 1100 * KS, to: 9300 * KS, phase: 300, gap: 640 }),
  ...guard(LANES[1].pts, [-1, 1], { from: 1500 * KS, to: 6300 * KS, phase: 120, gap: 600 }),
  ...guard(LANES[2].pts, [-1], { from: 1600 * KS, to: 9300 * KS, phase: 500, gap: 640 }),
  // bệ đá trên hai bờ sông nối tiếp đầu hai bụi giữa sông (tạo túi núp); bờ phía Đỏ là ảnh đối xứng
  ...[[2303, 2803, 1953, 2453], [3597, 4097, 3880, 4380]].map(([a, b, c, d]) => ({ x1: a * K, y1: b * K, x2: c * K, y2: d * K, ledge: true, w: 220 })),
  // bệ đá "lãnh thổ" ôm phía sau mỗi trại quái (cung đá, mở về phía lối đi trong rừng)
  ...CAMPS_BLUE.flatMap((c) => arcWalls(c.x, c.y, c.arc.r, c.arc.face, c.arc.span)),
  ...JUNGLE_ROCKS,
  // bệ đá điêu khắc ngăn hai khoảng trống giữa ba trụ nhà (lãnh địa nhà) — cung quanh nhà chính
  ...[[-84, -51, 0], [-39, -6, 1]].flatMap(([a0, a1, k]) => { const R = 1400, n = 6, pts = Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [800 + Math.cos(a) * R, 5600 + Math.sin(a) * R]; });
    return pts.slice(1).map((p, i) => ({ x1: pts[i][0] * K, y1: pts[i][1] * K, x2: p[0] * K, y2: p[1] * K, w: 260, baseWall: k })); }),
  ...BUSHES_BLUE.flatMap(bushRocks),
];
/** Cắt bỏ phần đoạn tường lấn vào lòng đường (đường rộng hơn thì cung đá trại/đá rừng sát đường tự ngắn lại); giữ đoạn liền dài nhất. */
function trimToLanes(w) {
  const half = (w.w ?? 110) / 2, n = 40, ok = [];
  const laneD = (x, y) => Math.min(...LANES.flatMap((ln) => ln.pts.slice(1).map((q, i) => segDist(x, y, ln.pts[i], q))));
  for (let i = 0; i <= n; i++) { const t = i / n; ok.push(laneD(w.x1 + (w.x2 - w.x1) * t, w.y1 + (w.y2 - w.y1) * t) >= LANE_W / 2 + half + 10); }
  let best = null, start = -1;
  for (let i = 0; i <= n + 1; i++) { if (i <= n && ok[i]) { if (start < 0) start = i; } else if (start >= 0) { if (!best || i - 1 - start > best[1] - best[0]) best = [start, i - 1]; start = -1; } }
  if (!best || (best[1] - best[0]) / n * Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 140) return null;
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
  const d = Math.hypot(BC - PX, BC - PY), ux = (BC - PX) / d, uy = (BC - PY) / d, aa = (d * d + PR * PR - BR * BR) / (2 * d), hh = Math.sqrt(PR * PR - aa * aa);
  const ix = PX + aa * ux - hh * uy, iy = PY + aa * uy + hh * ux, phi = Math.atan2(iy - BC, ix - BC + 0) + (Math.atan2(iy - BC, ix - BC) < 0 ? Math.PI * 2 : 0), th0 = Math.atan2(iy - PY, ix - PX);
  const pts = [[BX, BEND]]; // đường Đền: mép trái, lên tới góc, bo cung quanh góc tới vành mũi đá
  for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * (phi - Math.PI); pts.push([BC + Math.cos(a) * BR, BC + Math.sin(a) * BR]); }
  for (let i = 1; i <= 6; i++) { const a = th0 + (i / 6) * (Math.PI * 1.25 - th0); pts.push([PX + Math.cos(a) * PR, PY + Math.sin(a) * PR]); } // vành mũi đá (nửa phía Xanh) tới đường chéo
  const seg = (a, b) => ({ x1: a[0] * K, y1: a[1] * K, x2: b[0] * K, y2: b[1] * K, w: BORDER_W, border: true });
  const temple = [seg([60, BEND], [BX, BEND]), ...pts.slice(1).map((p, i) => seg(pts[i], p))];
  const flip = ([x, y]) => [6400 - y, 6400 - x]; // đường Sông = ảnh của đường Đền qua đường chéo phụ
  const river = temple.map((w) => { const a = flip([w.x1 / K, w.y1 / K]), b = flip([w.x2 / K, w.y2 / K]); return seg(a, b); });
  return [...temple, ...river];
})();
const W_BLUE_T = (() => { // bệ nhà ưu tiên: bỏ các đoạn tường/đá khác chồng lên nó
  const all = [...W_BLUE.map(trimToLanes).filter(Boolean), ...borderHalf], base = all.filter((w) => w.baseWall != null);
  const segD = (w, o) => { let m = Infinity; for (let t = 0; t <= 1; t += 0.1) { const x = w.x1 + (w.x2 - w.x1) * t, y = w.y1 + (w.y2 - w.y1) * t, dx = o.x2 - o.x1, dy = o.y2 - o.y1, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - o.x1) * dx + (y - o.y1) * dy) / L2)); m = Math.min(m, Math.hypot(x - o.x1 - dx * u, y - o.y1 - dy * u)); } return m; };
  return all.filter((w) => w.baseWall != null || w.border || !base.some((b) => segD(b, w) < ((b.w ?? 110) + (w.w ?? 110)) / 2 + 60));
})();
/** Điểm (toạ độ thế giới) nằm ngoài tường biên (vùng không thuộc sân chơi) — dùng để trồng rừng dày phía ngoài khung. */
function outOfBounds(x, y, pad = 0) {
  const test = (u, v) => { u /= K; v /= K; const p = pad / K, e = BX - BORDER_W / K / 2 - p;
    if (Math.hypot(u - PX, v - PY) < PR + BORDER_W / K / 2 + p) return false; // mũi đá chìa ra vực
    return (u < e && v < BEND - p) || (u < BC && v < BC && Math.hypot(u - BC, v - BC) > BR + BORDER_W / K / 2 + p) || (v < e && u < BEND - p); };
  return test(x, y) || test(A - y, A - x);
}
const mirrorSeg = (w) => ({ ...w, x1: w.y1, y1: w.x1, x2: w.y2, y2: w.x2 });

export const ARENA = {
  id: 'arena5v5', w: A, h: A,
  margin: 260,                        // viền ngoài không đi được (vách núi)
  outOfBounds,                        // ngoài tường biên hai đường cánh
  oobShape: { K, BX, BEND, BC, BR, BW: BORDER_W, A, PX, PY, PR }, // hình học vùng ngoài biên (shader cắt nền / vực)
  lanes: LANES,
  river: { width: 500 * K, diag: true },   // chạy theo đường chéo y = x
  spawn: [{ x: 430 * K, y: 5970 * K }, { x: 5970 * K, y: 430 * K }],
  structures: [
    { id: 'core', kind: 'core', x: BASE[0], y: BASE[1], hp: 7000, atk: 350, range: 1050, rate: 1.2, armor: 100, radius: 220, invulnUntil: ['temple_home', 'mid_home', 'river_home'] },
    ...['temple', 'mid', 'river'].flatMap((l) => [tower(l + '_outer', 'outer', ...TOWER_POS[l + '_outer'], null), tower(l + '_inner', 'inner', ...TOWER_POS[l + '_inner'], l + '_outer'), tower(l + '_home', 'home', ...TOWER_POS[l + '_home'], l + '_inner')]),
  ],
  fountain: { x: 430 * K, y: 5970 * K, range: 800, dps: 1000, healRadius: 650, healPct: 0.15 },
  // tường: danh sách đoạn dày (capsule); phía Đỏ là ảnh đối xứng
  walls: { thickness: 110, segs: [...W_BLUE_T, ...W_BLUE_T.map(mirrorSeg)] },
  // bụi cỏ: hình chữ nhật xoay theo trục (x, y, w, h) quanh tâm
  // bụi cỏ (hình chữ nhật theo trục, toạ độ gốc ×K): bụi vừa (cũ), bụi lớn để "macro" (núp cả nhóm, chặn đường rừng/bờ sông) và nhiều bụi nhỏ rải rác
  bushes: [
    ...BUSHES_BLUE.map((b) => ({ ...b, x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K })),
    // bụi cỏ dài mọc mép nước dọc bờ sông, sát hai đường cánh (đường trên/đường dưới) — như Liên Quân; phía Đỏ đối xứng
    // (không đối xứng: mỗi bờ đặt riêng vì hai hang boss nằm lệch về hai phía)
    ...[[1560, 1250, 1870, 1560], [4530, 4840, 4840, 5150]].map(([a, b, c, d]) => ({ cap: [a * K, b * K, c * K, d * K], r: 95 * K, bank: true, noMirror: true })), // đối xứng tâm (như hai hang): mỗi đường cánh một bụi bờ đối diện hang
    // hai bụi lớn liền khối NGAY GIỮA SÔNG, nằm NGANG lòng sông (song song đường Giữa), hai bên cầu: chốt chặn quan trọng nhất.
    // Nằm trên trục đối xứng nên mỗi bụi chỉ có một.
    ...[-470, 470].map((d) => { const c = 3200 + d, h = 250; return { cap: [(c - h) * K, (c + h) * K, (c + h) * K, (c - h) * K], r: 190 * K, big: true, river: true }; }),
  ],
  vision: true, // sương mù chiến trường + bụi cỏ ẩn (sim/vision.js)
  // quái rừng (đủ hai phía) + mục tiêu lớn; toạ độ thế giới. Phía Đỏ lấy đối xứng của phía Xanh.
  camps: [
    ...CAMPS_BLUE.flatMap((c) => [{ ...c, x: c.x * K, y: c.y * K, side: 0 }, { ...c, id: c.id + '_r', x: c.y * K, y: c.x * K, side: 1 }]),
    ...BOSSES.map((b) => ({ ...b, x: b.x * K, y: b.y * K, side: null })),
  ],
  tower: { minionAggroRadius: 900, backdoorTaken: 0.4, streakStep: 0.3, streakMax: 1.5, minionPct: 0.45, siegePct: 0.2, aggroLinger: 90 },
  waves: { first: 20, every: 30, sword: 3, archer: 2, siegeEvery: 3, gap: 14, spawnDist: 900 },
  laneMult: 1,
  mirror: swap,
};
