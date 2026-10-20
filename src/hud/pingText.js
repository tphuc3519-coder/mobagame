// Tên chỗ cho dòng chữ tín hiệu (chỉ HUD): mục tiêu được đánh dấu → công trình gần → trại quái / mục tiêu lớn gần → đường → sông → rừng.
import { MONSTERS } from '../data/jungle.js';
import { lanePath, project } from '../sim/lanes.js';
import { dist } from '../sim/util.js';

const LANE = { temple: 'Đường Đền', mid: 'Đường Giữa', river: 'Đường Sông' };
const TIER = { outer: 'Trụ ngoài', inner: 'Trụ trong', home: 'Trụ nhà' };
const side = (team, t) => (t === team ? 'phe ta' : 'phe địch');

/** Tên chỗ `p` nhìn từ đội `team`; `tgt`: đơn vị được đánh dấu (nếu có). */
export function placeName(world, team, p, tgt = null) {
  if (tgt) return tgt.playerName || tgt.data?.name || 'mục tiêu';
  const map = world.map;
  const st = world.entities.filter((s) => s.structure && !s.noTarget && s.alive && (s.kind === 'tower' || s.kind === 'core') && dist(s.pos, p) < 1300).sort((a, b) => dist(a.pos, p) - dist(b.pos, p))[0];
  if (st) return st.kind === 'core' ? `Nhà chính ${side(team, st.team)}` : `${TIER[st.tier] || 'Trụ'} ${LANE[st.sid?.split('_')[0]] || ''} ${side(team, st.team)}`.replace(/\s+/g, ' ');
  const camp = (world.camps || []).map((c) => ({ c, d: dist(c, p), boss: !!MONSTERS[c.type]?.boss })).filter((o) => o.d < (o.boss ? 1600 : 1100)).sort((a, b) => a.d - b.d)[0];
  if (camp) { const nm = MONSTERS[camp.c.type]?.camp || MONSTERS[camp.c.type]?.name || 'trại quái'; return camp.c.side == null ? nm : `${nm} ${side(team, camp.c.side)}`; }
  let lane = -1, bd = Infinity;
  map.lanes.forEach((ln, i) => { const pr = project(lanePath(map, i, team), p); if (pr.d < ln.width * 0.75 && pr.d < bd) { bd = pr.d; lane = i; } });
  if (lane >= 0) {
    const path = lanePath(map, lane, team), pr = project(path, p), f = pr.s / Math.max(1, path.length);
    return `${LANE[map.lanes[lane].id] || 'Đường'}${f < 0.4 ? ' phe ta' : f > 0.6 ? ' phe địch' : ''}`;
  }
  if (map.river?.diag ? Math.abs(p.x - p.y) / Math.SQRT2 < map.river.width / 2 : Math.abs(p.x - map.river.x) < map.river.width / 2) return 'Sông';
  const f0 = world.entities.find((s) => s.kind === 'fountain' && s.team === team), f1 = world.entities.find((s) => s.kind === 'fountain' && s.team !== team);
  return f0 && f1 && dist(f0.pos, p) > dist(f1.pos, p) ? 'Rừng phe địch' : 'Rừng phe ta';
}
