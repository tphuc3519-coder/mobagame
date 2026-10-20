// Tín hiệu (ping) trong trận: lệnh { type:'ping', kind, x, y, target? } — người chơi và bot dùng chung (02 §6). Chỉ có ở bản đồ nhiều đường.
// Tín hiệu là dữ liệu của mô phỏng (world.pings) nên bot đồng đội đọc được mà vẫn tất định.
import { T, dist } from './util.js';
import { canSee } from './vision.js';
import { lanePath, project } from './lanes.js';
import { PING, PING_KINDS } from '../data/signals.js';

/** Đường (chỉ số) chứa điểm p, hoặc -1. */
export function laneAt(map, p) {
  let best = -1, bd = Infinity;
  map.lanes.forEach((ln, i) => { const pr = project(lanePath(map, i, 0), p); if (pr.d < ln.width * PING.onLane && pr.d < bd) { bd = pr.d; best = i; } });
  return best;
}

export function placePing(world, e, cmd) {
  if (world.map.lanes.length < 2) return { ok: false, reason: 'mode' };
  const kind = PING_KINDS[cmd.kind]; if (!kind) return { ok: false, reason: 'kind' };
  let x = +cmd.x, y = +cmd.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: 'pos' };
  const log = (e.pingLog || []).filter((t) => world.tick - t < T(PING.rate.window));
  if (log.length >= PING.rate.burst || (log.length && world.tick - log[log.length - 1] < T(PING.rate.gap))) { e.pingLog = log; return { ok: false, reason: 'rate' }; }
  log.push(world.tick); e.pingLog = log;
  let target = null;
  if (cmd.kind === 'attack' && cmd.target != null) { // chỉ nhận mục tiêu đội mình đang thấy (không lộ thông tin trong sương mù)
    const u = world.byId(cmd.target);
    if (u && u.alive && !u.noTarget && u.team !== e.team && u.kind !== 'minion' && u.kind !== 'clone' && canSee(e.team, u)) { target = u.id; x = u.pos.x; y = u.pos.y; }
  }
  x = Math.round(Math.max(0, Math.min(world.map.w, x))); y = Math.round(Math.max(0, Math.min(world.map.h, y)));
  const p = { id: (world.pingSeq = (world.pingSeq || 0) + 1), team: e.team, src: e.id, kind: cmd.kind, x, y, target, lane: laneAt(world.map, { x, y }), bot: !!e.bot,
    tick: world.tick, until: world.tick + T(Math.max(kind.hold, PING.show)) };
  world.pings.push(p);
  const mine = world.pings.filter((q) => q.team === e.team);
  if (mine.length > PING.maxPerTeam) world.pings.splice(world.pings.indexOf(mine[0]), 1);
  world.emit('ping', { id: e.id, ping: p.id, team: p.team, kind: p.kind, x, y, target, bot: p.bot });
  return { ok: true };
}

export function updatePings(world) {
  if (world.pings.length && world.tick % 15 === 0) world.pings = world.pings.filter((p) => p.until > world.tick);
}

/** Tín hiệu của NGƯỜI CHƠI cùng đội còn hiệu lực (bot bỏ qua tín hiệu của bot), mới nhất sau cùng. */
export const livePings = (world, team, kind) => (world.pings || []).filter((p) => p.team === team && !p.bot && (!kind || p.kind === kind) && world.tick < p.tick + T(PING_KINDS[p.kind].hold));
/** Bot `e` có đang bị yêu cầu Rút lui / Cẩn thận không. */
export function pingMood(world, e) {
  const near = (p, r) => dist(p, e.pos) < r;
  const retreat = livePings(world, e.team, 'retreat').some((p) => near(p, PING.retreatRange));
  const careful = livePings(world, e.team, 'careful').some((p) => near(p, PING.carefulRange) || (p.lane >= 0 && p.lane === e.bot?.laneIdx));
  return { retreat, careful };
}
