// Hỗ trợ thao tác cho tướng người chơi (chỉ tướng đã nhận lệnh 'assist' — bot không gửi nên không đổi). Ba việc, theo cách các game MOBA
// trên điện thoại làm cho thao tác "ăn tay":
// 1. Đuổi đánh: bấm Đánh mà không có địch trong tầm nhưng có địch trong tầm + reach (data/controls.js) thì tướng tự đi tới rồi đánh
//    (combat.js gọi startChase). Kéo cần là thôi đuổi ngay (người chơi muốn đi chỗ khác / rút lui); không tự đi vào tầm trụ địch khi đang
//    đứng ngoài tầm trụ; mục tiêu chạy xa / khuất / chết, vướng tường hoặc quá chaseSec giây thì thôi. Chạm nhanh nút Đánh (thả ra trước khi
//    kịp vung) vẫn đi tới đánh đúng một đòn (chase.once — commands.js).
// 2. Chiêu khoá mục tiêu bấm khi địch ngoài tầm (castSkill trả 'noTarget') nhưng trong tầm + reach: đi tới, vào tầm thì tung.
// 3. Bộ đệm bấm chiêu: chiêu bấm lúc đang lướt ('busy'), đang bị khống chế ('cc') hoặc còn hồi ≤ bufferSec giây được giữ bufferSec giây và
//    tự tung ngay khi được — bấm sớm một nhịp không bị "nuốt". Hết giờ mà vẫn không được thì mới báo castFail như cũ.
// e.steer: hướng đi tự động (movement.js chỉ dùng khi cần không kéo). Mọi phép tính tất định (dmath, bộ đếm tick).
import { ASSIST } from '../data/controls.js';
import { T, dist, dirTo } from './util.js';
import { isTargetable } from './targeting.js';
import { isRooted } from './status.js';
import { canSee } from './vision.js';
import { castSkill } from './skills.js';
import { pickSkillTarget } from './skillTypes.js';

/** Bật / đổi hỗ trợ thao tác (lệnh 'assist'): reach 'off' | 'near' | 'far'. */
export function setAssist(e, reach) {
  e.assist = { reach: ASSIST.reach[reach] ?? 0 };
  if (!e.assist.reach && e.chase) stopChase(e);
}
/** Cần di chuyển đang kéo? */
export const steering = (e) => Math.abs(e.moveDir.x) + Math.abs(e.moveDir.y) > 0.001;
/** Tầm đuổi thêm của tướng (0: không đuổi — bot, tắt trong Cài đặt, hoặc đang kéo cần). */
export const reachOf = (e) => (e.assist && !steering(e) ? e.assist.reach : 0);

const valid = (e, t) => !!t && t.alive && t.team !== e.team && isTargetable(e, t) && canSee(e.team, t);
/** Điểm p nằm trong tầm bắn của trụ / nhà chính địch còn sống? */
function inEnemyTower(world, e, p) {
  for (const s of world.entities) {
    if (!s.structure || !s.alive || s.noTarget || s.kind === 'fountain' || s.team === e.team || s.team === 2) continue;
    if (dist(s.pos, p) <= s.stats.range + e.radius) return true;
  }
  return false;
}
/** Đi tới t (đứng cách `need` tính cả bán kính) có phải bước vào tầm trụ địch khi đang đứng ngoài không? Đuổi công trình thì không tính. */
function towerDive(world, e, t, need) {
  if (t.structure || inEnemyTower(world, e, e.pos)) return false;
  const d = dirTo(t.pos, e.pos), k = need + t.radius;
  return inEnemyTower(world, e, { x: t.pos.x + d.x * k, y: t.pos.y + d.y * k });
}

/** Bắt đầu đuổi t. kind 'atk' (đánh thường, need = tầm đánh) | 'cast' (chiêu slot, need = tầm chiêu). false: không đuổi (vào trụ địch). */
export function startChase(world, e, t, kind, need, extra = {}) {
  if (towerDive(world, e, t, need)) return false;
  const d = dist(t.pos, e.pos) - t.radius;
  e.chase = { id: t.id, kind, need, until: world.tick + T(ASSIST.chaseSec), best: d, bestTick: world.tick, once: false, ...extra };
  e.steer = dirTo(e.pos, t.pos);
  return true;
}
/** Thôi đuổi (chạm nhanh nút Đánh mà chưa kịp đánh: thôi luôn lệnh đánh). */
export function stopChase(e) {
  if (e.chase?.once) e.attacking = false;
  e.chase = null; e.steer = null;
}
/** Mục tiêu đang đuổi (còn hợp lệ) hoặc null. */
export function chaseTarget(world, e) {
  const c = e.chase; if (!c) return null;
  const t = world.byId(c.id); return valid(e, t) ? t : null;
}

const BUFFER = new Set(['busy', 'cc', 'cooldown']);
const bufferable = (world, e, slot, reason) => BUFFER.has(reason) && (reason !== 'cooldown' || e.cooldowns[slot] - world.tick <= T(ASSIST.bufferSec));

/** Lệnh tung chiêu (commands.js). Tướng không có hỗ trợ: như castSkill. Có: hỏng vì đang bận thì giữ lại (bộ đệm), chiêu khoá mục tiêu
 *  ngoài tầm thì đi tới. Trả kết quả castSkill, hoặc null khi lệnh đã được giữ lại / đang đi tới (chưa báo hỏng). */
export function assistCast(world, e, slot, aim) {
  const r = castSkill(world, e, slot, aim);
  if (r.ok || !e.assist) return r;
  if (bufferable(world, e, slot, r.reason)) { e.castBuf = { slot, aim, until: world.tick + T(ASSIST.bufferSec) }; return null; }
  if (r.reason === 'noTarget') {
    const sk = e.data.skills[slot], reach = reachOf(e), R = sk.range || 600;
    const t = reach ? pickSkillTarget(world, e, { ...sk, range: R + reach }, aim) : null;
    if (t && startChase(world, e, t, 'cast', R, { slot, aim: { ...(aim || {}), id: t.id } })) return null;
  }
  return r;
}

/** Mỗi tick, trước updateMovement: bộ đệm chiêu, đuổi mục tiêu (đặt e.steer). */
export function updateAssist(world) {
  for (const e of world.entities) {
    if (!e.assist) continue;
    if (!e.alive) { if (e.chase || e.castBuf) { e.castBuf = null; stopChase(e); } continue; }
    const b = e.castBuf;
    if (b) {
      const r = castSkill(world, e, b.slot, b.aim);
      if (r.ok) e.castBuf = null;
      else if (world.tick >= b.until || !bufferable(world, e, b.slot, r.reason)) { e.castBuf = null; world.emit('castFail', { id: e.id, slot: b.slot, reason: r.reason }); }
    }
    const c = e.chase; if (!c) continue;
    const t = chaseTarget(world, e);
    if (!t || steering(e) || world.tick > c.until || (c.kind === 'atk' && !e.attacking)) { stopChase(e); continue; }
    const d = dist(t.pos, e.pos) - t.radius;
    if (d > c.need + e.assist.reach + ASSIST.escape) { stopChase(e); continue; } // chạy thoát
    if (c.kind === 'cast' && d <= c.need) { // vào tầm chiêu: tung (hỏng vì bận thì vào bộ đệm như bấm thường)
      e.chase = null; e.steer = null;
      const r = assistCast(world, e, c.slot, c.aim);
      if (r && !r.ok) world.emit('castFail', { id: e.id, slot: c.slot, reason: r.reason });
      continue;
    }
    if (d <= c.need) { e.steer = null; c.best = d; c.bestTick = world.tick; continue; } // trong tầm đánh: đứng đánh (combat.js), mục tiêu chạy ra thì đuổi tiếp
    const held = isRooted(e) || !!e.dash || world.tick < (e.castUntil || 0) || world.tick < (e.swingUntil || 0); // đang không tự đi được: không tính là kẹt
    if (held || d < c.best - 4) { c.best = Math.min(c.best, d); c.bestTick = world.tick; } else if (world.tick - c.bestTick > T(ASSIST.stuckSec)) { stopChase(e); continue; } // kẹt
    e.steer = dirTo(e.pos, t.pos);
  }
}
