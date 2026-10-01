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
  bushes: [{ x: 2250, y: 850, w: 300, h: 200 }, { x: 2250, y: 1550, w: 300, h: 200 }],
  tower: { minionAggroRadius: 900, backdoorTaken: 0.4, streakStep: 0.3, streakMax: 1.5, minionPct: 0.45, siegePct: 0.2, aggroLinger: 90 },
  waves: { first: 15, every: 25, sword: 3, archer: 1, siegeEvery: 3, spawnX: 900, gap: 14 },
  // Đường duy nhất cho lính, đi từ Xanh sang Đỏ (cùng định dạng với bản 5v5).
  lanes: [{ id: 'main', width: 900, pts: [[900, 1200], [W - 900, 1200]] }],
  mirror: (x, y) => ({ x: mirrorX(x), y }),
};

/** Danh sách công trình đủ hai phía (đã đối xứng bằng map.mirror). */
export function structuresOf(map) {
  const out = [];
  for (const team of [0, 1]) for (const s of map.structures) out.push({ ...s, team, ...(team ? map.mirror(s.x, s.y) : {}) });
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Bản đồ 5v5 "Đấu Trường Đèn Cả" (03 §A). Toạ độ gợi ý trong tài liệu (6400 × 6400) được NHÂN K = 2.2 → 14080 × 14080
// cho rộng hơn (băng qua đường Giữa ~45 giây thay vì ~20 ở bản gốc). Chỉ khai báo phía Xanh (dưới trái); phía Đỏ lấy (x, y) → (y, x).
// ───────────────────────────────────────────────────────────────────────────
const K = 2.2, A = 6400 * K;
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

const LANE_W = 880;
// Ba đường, đi từ nhà chính Xanh sang nhà chính Đỏ (đối xứng nên đường phía Đỏ chỉ là đi ngược lại).
const BASE = P(800, 5600), FOE = P(5600, 800);
const LANES = [
  { id: 'temple', width: LANE_W, pts: roundPath([BASE, P(800, 800), FOE], 500 * K) },
  { id: 'mid', width: LANE_W, pts: [BASE, FOE] },
  { id: 'river', width: LANE_W, pts: roundPath([BASE, P(5600, 5600), FOE], 500 * K) },
];

const tower = (id, tier, x, y, invulnUntil) => {
  const T = { outer: [4000, 80, 220], inner: [4500, 90, 260], home: [5000, 100, 300] }[tier];
  return { id, kind: 'tower', x: x * K, y: y * K, hp: T[0], atk: T[2], range: 750, rate: 1.0, armor: T[1], radius: 85, invulnUntil, lane: id.split('_')[0] };
};

/** Tường dọc mép đường: đoạn dài `piece`, cách nhau `gap`, lùi `inset` ở hai đầu (chừa sân căn cứ và ngã tư giữa bản đồ). */
function edgeWalls(path, sides, { off = LANE_W / 2 + 50, from = 0, to = Infinity, piece = 1100, gap = 520, phase = 0 } = {}) {
  const out = [];
  let acc = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
    if (L < 200) { acc += L; continue; } // đoạn ngắn của cung bo góc: bỏ (góc cua để trống)
    for (const sd of sides) {
      let t = Math.max(0, from - acc) + phase;
      while (t < L - 60 && acc + t < to) {
        const t1 = Math.min(L, t + piece, to - acc);
        if (t1 - t > 250) out.push({ x1: ax + ux * t - uy * off * sd, y1: ay + uy * t + ux * off * sd, x2: ax + ux * t1 - uy * off * sd, y2: ay + uy * t1 + ux * off * sd });
        t = t1 + gap;
      }
    }
    acc += L;
  }
  return out;
}

const guard = (path, sides, o) => edgeWalls(path, sides, o);
// Phía Xanh: dọc Đường Đền (mép trong, về phía rừng), hai bên Đường Giữa (tới sát sông), mép trong Đường Sông.
const W_BLUE = [
  ...guard(LANES[0].pts, [1], { from: 1100, to: 6300, phase: 300 }),
  ...guard(LANES[1].pts, [-1, 1], { from: 1500, to: 3900, phase: 120 }),
  ...guard(LANES[2].pts, [-1], { from: 1600, to: 6400, phase: 500 }),
  // lối mòn trong rừng: mỗi vùng vài khối tường tạo ngã rẽ
  ...[[1500, 2500, 2100, 2500], [2000, 3100, 2000, 3600], [1300, 3700, 1700, 3900], [1700, 2900, 1700, 3300],
    [3000, 4900, 3500, 4900], [3300, 4350, 3300, 4750], [4000, 4500, 4500, 4500], [3800, 5050, 3800, 5350]].map(([a, b, c, d]) => ({ x1: a * K, y1: b * K, x2: c * K, y2: d * K })),
];
const mirrorSeg = (w) => ({ x1: w.y1, y1: w.x1, x2: w.y2, y2: w.x2 });

export const ARENA = {
  id: 'arena5v5', w: A, h: A,
  margin: 260,                        // viền ngoài không đi được (vách núi)
  lanes: LANES,
  river: { width: 500 * K, diag: true },   // chạy theo đường chéo y = x
  spawn: [{ x: 430 * K, y: 5970 * K }, { x: 5970 * K, y: 430 * K }],
  structures: [
    { id: 'core', kind: 'core', x: BASE[0], y: BASE[1], hp: 7000, atk: 350, range: 850, rate: 1.2, armor: 100, radius: 220, invulnUntil: ['temple_home', 'mid_home', 'river_home'] },
    tower('temple_outer', 'outer', 800, 2500, null), tower('temple_inner', 'inner', 800, 3700, 'temple_outer'), tower('temple_home', 'home', 800, 4700, 'temple_inner'),
    tower('mid_outer', 'outer', 2500, 3900, null), tower('mid_inner', 'inner', 1900, 4500, 'mid_outer'), tower('mid_home', 'home', 1400, 5000, 'mid_inner'),
    tower('river_outer', 'outer', 3900, 5600, null), tower('river_inner', 'inner', 2700, 5600, 'river_outer'), tower('river_home', 'home', 1700, 5600, 'river_inner'),
  ],
  fountain: { x: 430 * K, y: 5970 * K, range: 800, dps: 1000, healRadius: 650, healPct: 0.15 },
  // tường: danh sách đoạn dày (capsule); phía Đỏ là ảnh đối xứng
  walls: { thickness: 90, segs: [...W_BLUE, ...W_BLUE.map(mirrorSeg)] },
  // bụi cỏ: hình chữ nhật xoay theo trục (x, y, w, h) quanh tâm
  bushes: [[1250, 1600], [650, 3100], [2050, 3600], [2900, 4050], [3300, 5150], [4800, 5750], [2150, 2750], [3650, 4350]].map(([x, y]) => ({ x: x * K, y: y * K, w: 380 * K / 1.5, h: 280 * K / 1.5 })),
  camps: [], // quái rừng và mục tiêu lớn: chưa có (Mốc 8)
  tower: { minionAggroRadius: 900, backdoorTaken: 0.4, streakStep: 0.3, streakMax: 1.5, minionPct: 0.45, siegePct: 0.2, aggroLinger: 90 },
  waves: { first: 20, every: 30, sword: 3, archer: 2, siegeEvery: 3, gap: 14, spawnDist: 900 },
  laneMult: 1,
  mirror: swap,
};
