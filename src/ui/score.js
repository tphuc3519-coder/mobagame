// Điểm trận sau trận (0–16, 08 §2), MVP, danh hiệu, huy chương — tính từ chỉ số mô phỏng ghi trong trận: hạ / chết / hỗ trợ, vàng kiếm
// được (goldEarned), sát thương lên tướng địch (dmgHero), sát thương gánh chịu (dmgTaken), sát thương công trình (dmgTower) + mục tiêu
// lớn (dmgBoss), hồi máu + khiên cho đồng minh (healAlly), lính/quái kết liễu (cs).
//
//   kda  = (H + 0,7·HT) / max(1, C)           part = (H + HT) / max(1, tổng hạ gục của đội)
//   dmg, tank, gold, obj, heal = chỉ số của mình / chỉ số cao nhất trong đội (0..1)
//   điểm = 2 + 3·min(kda, 6)/6 + 3·part + 2·dmg + 1,5·tank + 1,5·gold + 1,5·obj + 1,5·heal (+1 nếu thắng), tối đa 16.
// MVP: điểm cao nhất đội thắng (vàng); MVP đội thua: điểm cao nhất đội thua (bạc).

export const statsOf = (h) => ({ k: h.kills || 0, d: h.deaths || 0, a: h.assists || 0, gold: Math.round(h.goldEarned || 0), dmg: Math.round(h.dmgHero || 0),
  taken: Math.round(h.dmgTaken || 0), tower: Math.round(h.dmgTower || 0), boss: Math.round(h.dmgBoss || 0), heal: Math.round(h.healAlly || 0), cs: h.cs || 0 });

/** Các phần cộng thành điểm: [khoá, tên, tối đa]. */
export const PARTS = [['base', 'Cơ bản', 2], ['combat', 'Giao tranh', 3], ['join', 'Tham gia', 3], ['dmg', 'Sát thương', 2], ['tank', 'Chống chịu', 1.5],
  ['gold', 'Kinh tế', 1.5], ['obj', 'Mục tiêu', 1.5], ['heal', 'Hồi/khiên', 1.5], ['win', 'Thắng', 1]];

/** heroes: thực thể tướng trong trận; winner: đội thắng (0/1). Trả về [{ id, team, heroId, ...chỉ số, score, kda, mvp, parts }] (đúng thứ tự vào). */
export function scoreMatch(heroes, winner) {
  const rows = heroes.map((h) => { const r = { id: h.id, team: h.team, heroId: h.heroId, level: h.level, items: [...(h.items || [])], ...statsOf(h) }; r.obj = r.tower + r.boss; return r; });
  const team = (t) => rows.filter((r) => r.team === t);
  const max = (rs, k) => rs.reduce((m, r) => Math.max(m, r[k]), 0);
  const rel = (v, m) => (m > 0 ? v / m : 0);
  for (const r of rows) {
    const mine = team(r.team), kills = mine.reduce((a, x) => a + x.k, 0);
    const parts = {
      base: 2,
      combat: 3 * Math.min((r.k + 0.7 * r.a) / Math.max(1, r.d), 6) / 6,
      join: 3 * Math.min(1, (r.k + r.a) / Math.max(1, kills)),
      dmg: 2 * rel(r.dmg, max(mine, 'dmg')),
      tank: 1.5 * rel(r.taken, max(mine, 'taken')),
      gold: 1.5 * rel(r.gold, max(mine, 'gold')),
      obj: 1.5 * rel(r.obj, max(mine, 'obj')),
      heal: 1.5 * rel(r.heal, max(mine, 'heal')),
      win: r.team === winner ? 1 : 0,
    };
    r.parts = parts;
    r.score = Math.round(Math.min(16, Object.values(parts).reduce((a, v) => a + v, 0)) * 10) / 10;
    r.kda = Math.round(((r.k + r.a) / Math.max(1, r.d)) * 10) / 10; // KDA hiển thị kiểu quen thuộc: (H + HT) / C
  }
  for (const t of [0, 1]) {
    const best = team(t).sort((a, b) => b.score - a.score || b.k + b.a - (a.k + a.a))[0];
    if (best) best.mvp = t === winner ? 'gold' : 'silver';
  }
  return rows;
}

const TITLES = [
  ['k', 'Sát Thần', 'Hạ gục nhiều nhất trận'],
  ['dmg', 'Đao Phủ', 'Gây sát thương lên tướng nhiều nhất'],
  ['gold', 'Máy Cày Vàng', 'Vàng tổng cao nhất trận'],
  ['taken', 'Tường Thành', 'Gánh chịu sát thương nhiều nhất trận'],
  ['heal', 'Ánh Sáng', 'Hồi máu / khiên cho đồng đội nhiều nhất'],
  ['a', 'Đồng Đội Vàng', 'Hỗ trợ nhiều nhất trận'],
  ['obj', 'Phá Thành', 'Sát thương công trình + mục tiêu lớn nhiều nhất'],
];
/** Danh hiệu nổi bật nhất của một người (so với cả trận). */
export function titleOf(r, rows) {
  if (r.mvp === 'gold') return { name: 'MVP', desc: 'Người chơi xuất sắc nhất trận' };
  for (const [k, name, desc] of TITLES) if (r[k] > 0 && rows.every((x) => x === r || x[k] <= r[k])) return { name, desc };
  if (r.d === 0 && r.k + r.a >= 3) return { name: 'Bất Tử', desc: 'Không gục ngã lần nào' };
  if (r.mvp === 'silver') return { name: 'MVP', desc: 'Xuất sắc nhất đội thua' };
  return { name: 'Chiến Binh', desc: 'Đã chiến đấu hết mình' };
}
/** Hạng huy chương của một chỉ số trong cả trận: 1 vàng, 2–3 bạc, 4–5 đồng, còn lại không. */
export function medalOf(r, rows, k) {
  if (!r[k]) return 'none';
  const pos = rows.filter((x) => x[k] > r[k]).length;
  return pos === 0 ? 'gold' : pos <= 2 ? 'silver' : pos <= 4 ? 'bronze' : 'none';
}
/** Số gọn: 312 → 0,3k; 12345 → 12,3k. */
export const kfmt = (n) => (Math.round((n || 0) / 100) / 10).toFixed(1).replace('.', ',') + 'k';
