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
    const b = norm(b0); out.push(b);
    let m;
    if (b.cap) { const p = map.mirror(b.cap[0], b.cap[1]), q = map.mirror(b.cap[2], b.cap[3]); m = norm({ ...b, cap: [p.x, p.y, q.x, q.y] }); }
    else m = { ...b, ...map.mirror(b.x, b.y) };
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

/** Cung đá bao quanh điểm (cx, cy) bán kính r (toạ độ gốc), chừa cửa mở về hướng `face` (độ, 0 = +x, 90 = +y), góc bao `span`. */
function arcWalls(cx, cy, r, face, span = 200, n = 3) {
  const out = [], back = face + 180, a0 = back - span / 2, step = span / n;
  for (let i = 0; i < n; i++) {
    const a = (a0 + i * step + 6) * Math.PI / 180, b = (a0 + (i + 1) * step - 6) * Math.PI / 180;
    out.push({ x1: (cx + Math.cos(a) * r) * K, y1: (cy + Math.sin(a) * r) * K, x2: (cx + Math.cos(b) * r) * K, y2: (cy + Math.sin(b) * r) * K, rock: true });
  }
  return out;
}

// Trại quái rừng phía Xanh (toạ độ gốc; phía Đỏ đối xứng). type: xem data/jungle.js. arc: bệ đá lãnh thổ sau trại.
const CAMPS_BLUE = [
  { id: 'blue', type: 'linh_thuy', x: 1480, y: 2560, arc: { r: 400, face: 75 } },
  { id: 'wolves_l', type: 'soi_da', x: 1380, y: 4050, arc: { r: 360, face: -60 } },
  { id: 'toad_l', type: 'coc_reu', x: 2080, y: 3250, arc: { r: 330, face: 200 } },
  { id: 'red', type: 'hoa_nham', x: 3700, y: 4880, arc: { r: 400, face: 200 } },
  { id: 'wolves_b', type: 'soi_da', x: 2350, y: 4900, arc: { r: 360, face: -15 } },
  { id: 'toad_b', type: 'coc_reu', x: 3150, y: 4470, arc: { r: 330, face: 90 } },
];
// Mục tiêu lớn giữa sông (nằm trên trục đối xứng nên chỉ có một mỗi loại)
const BOSSES = [
  { id: 'long_ngu', type: 'long_ngu', x: 1950, y: 1950, boss: true },
  { id: 'ho_loi', type: 'ho_loi', x: 4450, y: 4450, boss: true },
];
// Phía Xanh: dọc Đường Đền (mép trong, về phía rừng), hai bên Đường Giữa (tới sát sông), mép trong Đường Sông.
const W_BLUE = [
  // bệ đá ngăn rừng với đường, chạy gần hết nửa đường phía Xanh, có khe đi tắt (không có lướt thì phải đi vòng qua khe)
  ...guard(LANES[0].pts, [1], { from: 1100, to: 9300, phase: 300, gap: 640 }),
  ...guard(LANES[1].pts, [-1, 1], { from: 1500, to: 6300, phase: 120, gap: 600 }),
  ...guard(LANES[2].pts, [-1], { from: 1600, to: 9300, phase: 500, gap: 640 }),
  // bệ đá trên hai bờ sông nối tiếp đầu hai bụi giữa sông (tạo túi núp); bờ phía Đỏ là ảnh đối xứng
  ...[[2303, 2803, 1953, 2453], [3597, 4097, 3947, 4447]].map(([a, b, c, d]) => ({ x1: a * K, y1: b * K, x2: c * K, y2: d * K, ledge: true })),
  // bệ đá "lãnh thổ" ôm phía sau mỗi trại quái (cung đá, mở về phía lối đi trong rừng)
  ...CAMPS_BLUE.flatMap((c) => arcWalls(c.x, c.y, c.arc.r, c.arc.face, c.arc.span)),
];
const mirrorSeg = (w) => ({ ...w, x1: w.y1, y1: w.x1, x2: w.y2, y2: w.x2 });

export const ARENA = {
  id: 'arena5v5', w: A, h: A,
  margin: 260,                        // viền ngoài không đi được (vách núi)
  lanes: LANES,
  river: { width: 500 * K, diag: true },   // chạy theo đường chéo y = x
  spawn: [{ x: 430 * K, y: 5970 * K }, { x: 5970 * K, y: 430 * K }],
  structures: [
    { id: 'core', kind: 'core', x: BASE[0], y: BASE[1], hp: 7000, atk: 350, range: 850, rate: 1.2, armor: 100, radius: 220, invulnUntil: ['temple_home', 'mid_home', 'river_home'] },
    tower('temple_outer', 'outer', 800, 1700, null), tower('temple_inner', 'inner', 800, 3350, 'temple_outer'), tower('temple_home', 'home', 800, 4700, 'temple_inner'),
    tower('mid_outer', 'outer', 2750, 3650, null), tower('mid_inner', 'inner', 1900, 4500, 'mid_outer'), tower('mid_home', 'home', 1400, 5000, 'mid_inner'),
    tower('river_outer', 'outer', 4700, 5600, null), tower('river_inner', 'inner', 3350, 5600, 'river_outer'), tower('river_home', 'home', 1700, 5600, 'river_inner'),
  ],
  fountain: { x: 430 * K, y: 5970 * K, range: 800, dps: 1000, healRadius: 650, healPct: 0.15 },
  // tường: danh sách đoạn dày (capsule); phía Đỏ là ảnh đối xứng
  walls: { thickness: 110, segs: [...W_BLUE, ...W_BLUE.map(mirrorSeg)] },
  // bụi cỏ: hình chữ nhật xoay theo trục (x, y, w, h) quanh tâm
  // bụi cỏ (hình chữ nhật theo trục, toạ độ gốc ×K): bụi vừa (cũ), bụi lớn để "macro" (núp cả nhóm, chặn đường rừng/bờ sông) và nhiều bụi nhỏ rải rác
  bushes: [
    ...[[1300, 1700], [650, 3100], [3650, 4350], [4950, 5850]].map(([x, y]) => ({ x: x * K, y: y * K, w: 320 * K, h: 240 * K })),
    ...[[2900, 4050, 480, 320], [3300, 5150, 520, 280]].map(([x, y, w, h]) => ({ x: x * K, y: y * K, w: w * K, h: h * K, big: true })),
    // hai bụi lớn liền khối NGAY GIỮA SÔNG, nằm NGANG lòng sông (song song đường Giữa), hai bên cầu: chốt chặn quan trọng nhất.
    // Nằm trên trục đối xứng nên mỗi bụi chỉ có một.
    ...[-470, 470].map((d) => { const c = 3200 + d, h = 250; return { cap: [(c - h) * K, (c + h) * K, (c + h) * K, (c - h) * K], r: 190 * K, big: true, river: true }; }),
    ...[[1150, 3050], [1750, 3500], [1150, 4600], [1900, 4300], [2700, 3500], [2750, 4700], [4300, 5120], [2880, 5250], [380, 4400], [2000, 5950], [4400, 6000]]
      .map(([x, y], i) => ({ x: x * K, y: y * K, w: (i % 3 ? 220 : 260) * K, h: (i % 2 ? 170 : 200) * K })),
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
