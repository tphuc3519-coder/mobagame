// Điểm đánh giá sau trận (thang 16 như Liên Quân), MVP, danh hiệu, huy chương — tính từ chỉ số mô phỏng ghi trong trận:
// hạ / chết / hỗ trợ, vàng kiếm được (goldEarned), sát thương gây lên tướng địch (dmgHero), sát thương chịu (dmgTaken),
// sát thương công trình (dmgTower), lính/quái kết liễu (cs).
//
// Điểm = 3 (nền) + Giao tranh ≤4 (KDA = (H + 0,7·HT) / (C + 1), đủ 6 thì tối đa) + Tham gia hạ gục ≤2 + Kinh tế ≤2 (≥30% vàng đội)
//      + Sát thương ≤2 (≥35% của đội) + Chống chịu ≤1,5 (≥35%) + Mục tiêu ≤1 (≥40% sát thương công trình của đội) + Thắng 0,5.
// Trận không ai giao tranh vẫn được ~4,3–4,8 (chia đều vàng), giống Liên Quân. MVP: điểm cao nhất mỗi đội (đội thắng: vàng, thua: bạc).

export const statsOf = (h) => ({ k: h.kills || 0, d: h.deaths || 0, a: h.assists || 0, gold: Math.round(h.goldEarned || 0), dmg: Math.round(h.dmgHero || 0), taken: Math.round(h.dmgTaken || 0), tower: Math.round(h.dmgTower || 0), cs: h.cs || 0 });

/** heroes: thực thể tướng trong trận; winner: đội thắng (0/1). Trả về [{ id, team, heroId, ...chỉ số, score, mvp, parts }] (đúng thứ tự vào). */
export function scoreMatch(heroes, winner) {
  const rows = heroes.map((h) => ({ id: h.id, team: h.team, heroId: h.heroId, level: h.level, items: [...(h.items || [])], ...statsOf(h) }));
  const sum = (t, k) => rows.reduce((a, r) => a + (r.team === t ? r[k] : 0), 0);
  for (const r of rows) {
    const kills = sum(r.team, 'k'), gold = sum(r.team, 'gold'), dmg = sum(r.team, 'dmg'), taken = sum(r.team, 'taken'), tower = sum(r.team, 'tower');
    const share = (v, tot, n) => (tot > 0 ? v / tot : 1 / n);
    const n = rows.filter((x) => x.team === r.team).length || 1;
    const kda = (r.k + 0.7 * r.a) / (r.d + 1);
    const parts = {
      base: 3,
      combat: 4 * Math.min(1, kda / 6),
      join: 2 * (kills > 0 ? Math.min(1, (r.k + r.a) / kills) : 0),
      gold: 2 * Math.min(1, share(r.gold, gold, n) / 0.3),
      dmg: 2 * Math.min(1, (dmg > 0 ? r.dmg / dmg : 0) / 0.35),
      tank: 1.5 * Math.min(1, (taken > 0 ? r.taken / taken : 0) / 0.35),
      obj: 1 * Math.min(1, (tower > 0 ? r.tower / tower : 0) / 0.4),
      win: r.team === winner ? 0.5 : 0,
    };
    r.parts = parts;
    r.score = Math.round(Math.min(16, Math.max(1, Object.values(parts).reduce((a, v) => a + v, 0))) * 10) / 10;
    r.kda = Math.round(((r.k + r.a) / Math.max(1, r.d)) * 10) / 10;
  }
  for (const t of [0, 1]) {
    const best = rows.filter((r) => r.team === t).sort((a, b) => b.score - a.score || b.k + b.a - (a.k + a.a))[0];
    if (best) best.mvp = t === winner ? 'gold' : 'silver';
  }
  return rows;
}

const TITLES = [
  ['mvp', 'MVP', 'Người chơi xuất sắc nhất trận'],
  ['k', 'Sát Thần', 'Hạ gục nhiều nhất trận'],
  ['dmg', 'Đao Phủ', 'Gây sát thương lên tướng nhiều nhất'],
  ['gold', 'Máy Cày Vàng', 'Vàng tổng cao nhất trận'],
  ['taken', 'Tường Thành', 'Chịu sát thương nhiều nhất trận'],
  ['a', 'Đồng Đội Vàng', 'Hỗ trợ nhiều nhất trận'],
  ['tower', 'Phá Thành', 'Gây sát thương công trình nhiều nhất'],
];
/** Danh hiệu nổi bật nhất của một người (so với cả 10 người trong trận). */
export function titleOf(r, rows) {
  if (r.mvp === 'gold') return { name: TITLES[0][1], desc: TITLES[0][2] };
  for (const [k, name, desc] of TITLES.slice(1)) if (r[k] > 0 && rows.every((x) => x === r || x[k] <= r[k])) return { name, desc };
  if (r.d === 0 && r.k + r.a >= 3) return { name: 'Bất Tử', desc: 'Không gục ngã lần nào' };
  if (r.mvp === 'silver') return { name: 'MVP', desc: 'Xuất sắc nhất đội thua' };
  return { name: 'Chiến Binh', desc: 'Đã chiến đấu hết mình' };
}
/** Hạng huy chương của một chỉ số trong 10 người: 1 vàng, 2–3 bạc, 4–5 đồng, còn lại không. */
export function medalOf(r, rows, k) {
  if (!r[k]) return 'none';
  const pos = rows.filter((x) => x[k] > r[k]).length;
  return pos === 0 ? 'gold' : pos <= 2 ? 'silver' : pos <= 4 ? 'bronze' : 'none';
}
/** Số gọn kiểu Liên Quân: 312 → 0,3k; 12345 → 12,3k. */
export const kfmt = (n) => (Math.round((n || 0) / 100) / 10).toFixed(1).replace('.', ',') + 'k';
