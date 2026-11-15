import { ACE, SURRENDER } from '../data/signals.js';
import { T } from './util.js';
// Thắng/thua: phá nhà chính đối phương (03 §B4), hoặc một đội đầu hàng.
export function checkMatch(world) {
  if (world.over) return;
  for (const s of world.entities) {
    if (s.kind === 'core' && !s.alive) { world.over = { winner: 1 - s.team, tick: world.tick }; world.emit('gameover', { winner: world.over.winner }); return; }
  }
}
/** Đội `team` đầu hàng: đội kia thắng ngay. */
export function surrender(world, team) {
  if (world.over) return;
  world.over = { winner: 1 - team, tick: world.tick, surrender: team };
  world.emit('gameover', { winner: world.over.winner, surrender: team });
}

/** Người thật đang tự điều khiển tướng của đội `team` (trận trực tuyến): người rớt mạng đã giao cho máy thì không tính. */
const voters = (world, team) => world.entities.filter((h) => h.kind === 'hero' && h.team === team && h.online && !h.bot);

/**
 * Phiếu đầu hàng của tướng `e` — lệnh 'surrender' của trận trực tuyến (net/protocol.js applyFrame). Một người không còn quyết định thay cả
 * đội: cần quá nửa số người thật của đội đồng ý trong SURRENDER.voteSec giây (đội chỉ có một người thật: đầu hàng ngay). Trước mốc
 * world.surrenderFrom (đấu hạng: phút 8) thì từ chối — trước đây mốc này chỉ chặn ở nút bấm, máy khách sửa là đầu hàng được từ giây đầu.
 * Sự kiện 'surrenderVote' { id, team, yes, need, left } hoặc { id, team, fail: 'early' | 'cooldown', wait } để HUD báo. Trả { ok, reason }.
 */
export function voteSurrender(world, e) {
  if (world.over || !e || e.kind !== 'hero') return { ok: false, reason: 'over' };
  const team = e.team, now = world.tick, fail = (reason, until) => { world.emit('surrenderVote', { id: e.id, team, fail: reason, wait: Math.ceil((until - now) / 30) }); return { ok: false, reason }; };
  if (now < (world.surrenderFrom || 0)) return fail('early', world.surrenderFrom);
  const list = voters(world, team);
  if (!list.includes(e)) return { ok: false, reason: 'voter' };
  const need = Math.floor(list.length / 2) + 1, votes = (world.surrenderVotes ||= [null, null]);
  let v = votes[team];
  if (!v || now > v.until) { // chưa có / đã hết giờ: mở lượt biểu quyết mới (sau thời gian chờ)
    if (v && now < v.start + T(SURRENDER.retrySec)) return fail('cooldown', v.start + T(SURRENDER.retrySec));
    v = votes[team] = { start: now, until: now + T(SURRENDER.voteSec), yes: [] };
  }
  if (!v.yes.includes(e.id)) v.yes.push(e.id);
  const yes = v.yes.filter((id) => list.some((h) => h.id === id)).length; // người đã bỏ phiếu rồi rớt mạng: phiếu không còn tính
  world.emit('surrenderVote', { id: e.id, team, yes, need, left: Math.ceil((v.until - now) / 30) });
  if (yes >= need) surrender(world, team);
  return { ok: true };
}

/** Quét Sạch: `victim` vừa ngã và cả đội của họ (≥ ACE.minTeam tướng) đều đang chết — báo một lần cho mỗi lần cả đội bị hạ hết
 *  (ai đã chết từ trước lần Quét Sạch trước và chưa hồi sinh thì không tính lại). Chỉ ở bản đồ nhiều đường. */
export function checkAce(world, victim, killerId = null) {
  if (victim.kind !== 'hero' || world.map.lanes.length < 2) return;
  const team = victim.team, mates = world.entities.filter((h) => h.kind === 'hero' && h.team === team);
  if (mates.length < ACE.minTeam || mates.some((h) => h.alive)) return;
  const last = (world.aceTick ||= [-1, -1])[team];
  if (mates.some((h) => h.deadTick <= last)) return;
  world.aceTick[team] = world.tick;
  world.emit('ace', { id: victim.id, team, by: 1 - team, killer: killerId, victims: mates.map((h) => h.id) });
}
