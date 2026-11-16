// Đòn đánh thường (docs/12_DANH_THUONG.md). Một đòn đi qua 5 mốc, đều tính bằng tick của mô phỏng (animation chỉ để nhìn — 02 §13.5):
//   1. KHỞI ĐỘNG  updateCombat: nút Đánh đang giữ, hết nhịp đánh trước (attackReady), không bị khống chế / đang lướt / đang ra chiêu
//                 → chọn mục tiêu TRONG TẦM (khoá → đang đuổi → tướng vừa đánh → luật của người chơi → con đang đánh dở → gần nhất).
//                 Không có ai trong tầm: tướng người chơi tự đi tới (assist.js) hoặc vung vào khoảng không (whiff).
//   2. VUNG       `delay` giây (basicAttack.delay của tướng, tối đa 80% nhịp đánh): đứng yên, mặt bám theo mục tiêu (movement.js).
//   3. CHẠM       fire(): kiểm lại mục tiêu (strikeMiss) — chết / thành không thể chọn / ra khỏi tầm với thì đòn TRƯỢT và nhịp đánh được
//                 trả lại (cancelSwing); không thì cận chiến gây sát thương ngay, đánh xa thả đạn bám mục tiêu.
//   4. THU ĐÒN    sau mốc chạm tướng đi lại được ngay (đánh rồi chạy), animation tự thu về.
//   5. ĐÒN KẾ     attackReady = lúc khởi động + 1 / tốc đánh.
// Mọi sát thương sinh ra ở đây từ lệnh { type: 'attack' } — máy khách không gửi "tôi đã đánh trúng" (chơi online: mọi máy + máy chủ cùng tính).
import { D } from '../core/dmath.js';
import { T, dist } from './util.js';
import { isHardCC, removeStatus, tauntSource, applyStatus, missChance } from './status.js';
import { dealDamage } from './damage.js';
import { nearestEnemy, isTargetable, pickByRule, strikeMiss } from './targeting.js';
import { BASIC } from '../data/economy.js';
import { canSee } from './vision.js';
import { spawnProjectile } from './projectiles.js';
import { makeCtx } from './ctx.js';
import { onBasicAttack, onBasicHit } from './items.js';
import { applyInstant, INSTANT } from './effects.js';
import { reachOf, startChase, chaseTarget, stopChase, steering } from './assist.js';
import { ASSIST } from '../data/controls.js';

function nextRange(e) { return e.statuses.find((s) => s.kind === 'nextRange')?.value || 0; }

/** Kết quả một đòn đánh: sát thương thường + phần thêm (nội tại, phục kích), rồi hook onHit.
 *  pay.hitEffects (hook onAttack đặt): hiệu ứng kèm đòn này (choáng, đẩy lùi); pay.cleave: lan sang 1 địch gần mục tiêu (hệ số Công). */
function resolveHit(world, owner, target, pay) {
  if (!owner || !target.alive) return;
  const miss = missChance(owner); // bị Hào Quang Sân Khấu: có tỉ lệ đánh trượt
  if (miss > 0 && world.rng.next() < miss) { world.emit('miss', { id: target.id, src: owner.id }); return; }
  const it = onBasicAttack(world, owner, { amount: pay.amount, targetMaxHp: target.stats.maxHp });
  const dealt = dealDamage(world, owner, target, it.amount, 'physical', { basic: true, crit: it.crit });
  for (const x of it.extra) dealDamage(world, owner, target, x.amount, x.type);
  onBasicHit(world, owner, target, dealt);
  const burn = owner.statuses.find((s) => s.burn)?.burn; // Ấn Hoả: thiêu đốt + làm chậm
  if (burn && target.alive) { applyStatus(world, target, { status: 'dot', id: 'an_hoa_burn', dps: burn.dps + burn.perLevel * (owner.level - 1), duration: burn.duration, type: 'true' }, owner); applyStatus(world, target, { status: 'slow', id: 'an_hoa_slow', pct: burn.slow, duration: 1 }, owner); }
  if (pay.bonusMagic) dealDamage(world, owner, target, pay.bonusMagic, 'magic');
  if (pay.ambush) {
    dealDamage(world, owner, target, pay.ambush.base + pay.ambush.perLevel * (pay.level - 1) + pay.ambush.adBonus * Math.max(0, owner.stats.atk - owner.data.base.atk), 'physical');
    applyStatus(world, target, { status: 'slow', pct: pay.ambush.slow, duration: pay.ambush.slowDuration }, owner);
  }
  for (const ef of pay.hitEffects || []) { if (!target.alive) break; if (INSTANT.has(ef.status)) applyInstant(world, target, ef, owner); else applyStatus(world, target, ef, owner); }
  if (pay.cleave) {
    let best = null, bd = 280;
    for (const t of world.entities) { if (t === target || t.team === owner.team || t.structure || !isTargetable(owner, t)) continue; const d = dist(t.pos, target.pos) - t.radius; if (d < bd) { bd = d; best = t; } }
    if (best) dealDamage(world, owner, best, owner.stats.atk * pay.cleave, 'physical', { basic: true });
  }
  if (pay.hooks && target.isHero) owner.data.passive?.hooks?.onHit?.(makeCtx(world, owner, { target, proc: !!pay.proc }));
}
/** Đòn đánh thường không nhắm được mục tiêu đang có trạng thái basicImmune (Thái Cực Giới). */
const basicSkip = (t) => t.statuses.some((s) => s.kind === 'basicImmune');

/** Đòn bị huỷ giữa lúc vung (chưa gây sát thương): trả lại nhịp đánh — ra đòn lại được sau BASIC.retry giây thay vì chờ hết cả nhịp
 *  (trước đây mục tiêu chết / mình bị choáng 0,3 giây giữa lúc vung là đứng chờ thêm ~1,4 giây). why: 'dead' | 'untargetable' | 'range' | 'cc'. */
function cancelSwing(world, e, target, why) {
  e.attackReady = Math.min(e.attackReady, world.tick + T(BASIC.retry));
  if (e.swingUntil > world.tick) e.swingUntil = world.tick; // hết đứng yên: đi lại được ngay
  world.emit('attackMiss', { id: e.id, target: target?.id ?? null, reason: why });
}

function fire(world, e, target, range) {
  if (!e.alive) return;
  if (isHardCC(e)) { cancelSwing(world, e, target, 'cc'); return; }
  const ba = e.data.basicAttack, why = strikeMiss(e, target, range, !!ba.melee);
  if (why) { cancelSwing(world, e, target, why); return; }
  if (!e.dash && world.tick >= (e.castUntil || 0)) e.facing = D.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x); // đòn chạm: mặt đúng hướng mục tiêu
  removeStatus(e, 'stealth');
  const ctx = makeCtx(world, e, { target, bonusMagic: 0, extraArrow: 0, hitEffects: null, cleave: 0, proc: false });
  e.data.passive?.hooks?.onAttack?.(ctx);
  const amb = e.flags.ambush; e.flags.ambush = null;
  const level = Math.max(1, e.skillLevels.s3);
  const pay = { amount: e.stats.atk, bonusMagic: ctx.bonusMagic, ambush: amb, level, hooks: true, hitEffects: ctx.hitEffects, cleave: ctx.cleave, proc: ctx.proc };
  removeStatus(e, 'nextRange');
  if (ba.melee) { resolveHit(world, e, target, pay); return; }
  const shoot = (p, delayTicks) => world.pending.push({ tick: world.tick + delayTicks, run: () => {
    if (!e.alive || strikeMiss(e, target, range, false)) return; // mũi tên phụ / đạn ra chậm một nhịp: mục tiêu vừa chết / thành không thể chọn thì thôi
    spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: 0, dy: 0, speed: ba.projectile.speed, remaining: 9999, homing: target.id, kind: 'basic', onHit: (t) => resolveHit(world, e, t, p) });
  } });
  shoot(pay, 0);
  if (ctx.extraArrow) shoot({ amount: e.stats.atk * ctx.extraArrow, bonusMagic: 0, hooks: false }, T(0.12));
}

/** Nút "ăn lính": lính (rồi quái) máu thấp nhất trong tầm để kết liễu lấy vàng; nút "đẩy trụ": công trình gần nhất trong tầm. */
export function pickByMode(world, e, range, mode) {
  let best = null, bs = Infinity;
  for (const t of world.entities) {
    if (t.team === e.team || !isTargetable(e, t) || !canSee(e.team, t)) continue;
    const d = dist(t.pos, e.pos) - t.radius; if (d > range) continue;
    let sc;
    if (mode === 'minion') { if (t.kind !== 'minion' && t.kind !== 'monster') continue; sc = (t.kind === 'monster' ? 1e6 : 0) + t.hp; }
    else if (mode === 'tower') { if (!t.structure || t.kind === 'fountain' || t.invulnerable) continue; sc = d; }
    else continue;
    if (sc < bs) { bs = sc; best = t; }
  }
  return best;
}

/** Đòn vung không mục tiêu: cận chiến trúng địch đầu tiên trong nửa quạt phía trước; đánh xa bắn đạn thẳng theo hướng nhìn, trúng địch đầu tiên. */
function whiff(world, e, range) {
  if (!e.alive || isHardCC(e)) return;
  const fx = D.cos(e.facing), fy = D.sin(e.facing), ba = e.data.basicAttack;
  const pay = { amount: e.stats.atk, bonusMagic: 0, ambush: null, level: Math.max(1, e.skillLevels.s3), hooks: false };
  if (ba.melee) {
    let best = null, bd = Infinity;
    for (const t of world.entities) {
      if (t.team === e.team || !t.alive || t.noTarget || t.structure && t.kind === 'fountain' || basicSkip(t)) continue;
      const dx = t.pos.x - e.pos.x, dy = t.pos.y - e.pos.y, d = D.hypot(dx, dy) - t.radius;
      if (d > range + 30 || (dx * fx + dy * fy) < 0.5 * D.hypot(dx, dy)) continue;
      if (d < bd) { bd = d; best = t; }
    }
    if (best && nearestEnemy(world, e, range + 30 + best.radius, best.id) === best) resolveHit(world, e, best, pay);
    return;
  }
  spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: fx, dy: fy, speed: ba.projectile?.speed || 1800, remaining: range + 60, width: 50, kind: 'basic', skip: basicSkip, onHit: (t) => { resolveHit(world, e, t, pay); return true; } });
}

export function updateCombat(world) {
  for (const e of world.entities) {
    // cú chạm nút Đánh đang được giữ hộ (commands.js): đã ra được một đòn, hết hạn bộ đệm, hoặc tướng ngã → thả
    if (e.atkOnce != null && (!e.alive || e.atkIndex !== e.atkPress || world.tick > e.atkOnce)) { e.atkOnce = null; e.attacking = false; }
    if (!e.alive || !e.attacking || e.data.dummy || isHardCC(e) || e.dash) continue;
    const ready = world.tick >= e.attackReady && world.tick >= (e.castUntil || 0); // đang ra chiêu: đòn đánh chờ chiêu phát ra xong (không giật mặt sang mục tiêu khác)
    // chưa tới nhịp đánh: thường thì chờ. Riêng tướng người chơi đang giữ Đánh mà không đuổi ai thì vẫn phải nhìn quanh — mục tiêu vừa lùi ra
    // khỏi tầm thì bám theo ngay trong lúc chờ nhịp (trước đây đứng yên tới hết nhịp đánh, mục tiêu đi bộ cũng thoát được)
    if (!ready && !(e.assist && !e.chase && e.kind === 'hero' && !steering(e))) continue;
    const forced = tauntSource(e) != null ? world.byId(tauntSource(e)) : null;
    const range = e.stats.range + nextRange(e);
    // tướng người chơi (assist.js): ưu tiên mục tiêu khoá → mục tiêu đang đuổi → tướng vừa đánh (đang đánh tướng thì không nhảy sang tướng
    // khác chỉ vì % máu hai bên vừa đổi thứ tự); bot: như cũ
    const chased = e.assist ? chaseTarget(world, e) : null, last = e.assist && e.lastAtk != null ? world.byId(e.lastAtk) : null;
    const prefer = e.assist ? e.preferTarget ?? chased?.id ?? (last?.isHero ? last.id : null) : e.preferTarget;
    const pick = (r) => (e.attackMode ? pickByMode(world, e, r, e.attackMode)
      : e.targetBy ? pickByRule(world, e, r, e.targetBy, prefer, basicSkip) : nearestEnemy(world, e, r, prefer, basicSkip)); // targetBy: chỉ tướng người chơi (Cài đặt)
    let target = forced && forced.alive ? (dist(forced.pos, e.pos) - forced.radius <= range ? forced : null) : pick(range);
    // đang đánh dở một con lính / quái / trụ: đánh tiếp con đó khi nó còn trong tầm — không nhảy sang con CÙNG LOẠI vừa nhích lại gần hơn
    // (tướng địch vào tầm, mục tiêu khoá, nút Ăn lính / Đẩy trụ vẫn được ưu tiên như cũ vì chúng đã thắng ở pick())
    if (BASIC.stick && e.assist && !forced && !e.attackMode && e.preferTarget == null && target && !target.isHero && last && last !== target && !last.isHero
      && last.kind === target.kind && last.team !== e.team && isTargetable(e, last) && canSee(e.team, last) && !basicSkip(last) && dist(last.pos, e.pos) - last.radius <= range) target = last;
    if (!forced && chased?.isHero && target && !target.isHero && e.chase.kind === 'atk') target = null; // đang đuổi tướng: không quay sang lính / trụ dọc đường
    if (!target && !forced && e.assist) { // không có ai trong tầm: đang đuổi thì đi tiếp; có địch trong tầm + reach thì đi tới (kéo cần là thôi)
      if (chased) continue; // (đang đi tới để tung chiêu khoá mục tiêu: cũng không đổi hướng)
      const reach = reachOf(e), far = reach ? pick(range + reach) : null;
      if (far && startChase(world, e, far, 'atk', range)) { if (e.atkOnce != null) { e.atkOnce = null; e.chase.once = true; } continue; } // cú chạm đang giữ hộ: đi tới đánh đúng một đòn
    }
    if (!ready) continue; // (chỉ vào đây để tìm người mà bám theo)
    if (!target) { // không có mục tiêu: tướng người chơi vẫn vung đòn vào khoảng không theo hướng đang nhìn (như Liên Quân)
      if (e.kind !== 'hero' || e.bot || forced || e.attackMode) continue; // nút ăn lính/đẩy trụ: không có mục tiêu đúng loại thì không vung
      if (e.assist && steering(e)) continue; // đang kéo cần mà không có ai để đánh: cứ đi, không khựng lại vung vào khoảng không mỗi nhịp
      const iv = 1 / e.stats.atkSpeed, delay = Math.min(e.data.basicAttack.delay ?? 0.25, iv * 0.8);
      e.attackReady = world.tick + T(iv); e.atkIndex = (e.atkIndex || 0) + 1; e.swingUntil = world.tick + T(delay) + 1; e.swingTarget = null;
      world.emit('attack', { id: e.id, n: e.atkIndex, interval: iv, delay, whiff: true });
      world.pending.push({ tick: world.tick + T(delay), run: () => whiff(world, e, range) });
      continue;
    }
    const iv = 1 / e.stats.atkSpeed;
    e.attackReady = world.tick + T(iv);
    e.atkIndex = (e.atkIndex || 0) + 1;
    e.facing = D.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x);
    const delay = Math.min(e.data.basicAttack.delay ?? 0.25, iv * 0.8);
    if (e.kind === 'hero') { e.swingUntil = world.tick + T(delay) + 1; e.swingTarget = target.id; } // vung đòn: đứng lại, quay mặt về địch tới lúc đòn chạm
    if (e.assist) { // chạm nhanh: đúng một đòn; đang giữ Đánh và vừa ra đòn vào đúng người đang đuổi: gia hạn lượt đuổi (đuổi mà còn đánh trúng đều
      // thì không bỏ cuộc sau chaseSec giây — hạn đó là cho lượt đuổi không tới được đích)
      e.lastAtk = target.id;
      if (e.chase?.once) stopChase(e);
      else if (e.chase?.kind === 'atk') { if (e.chase.id !== target.id) { e.chase = null; e.steer = null; } else e.chase.until = world.tick + T(ASSIST.chaseSec); }
    }
    world.emit('attack', { id: e.id, n: e.atkIndex, interval: iv, delay }); // delay: thời điểm gây sát thương, để animation khớp cú chạm
    world.pending.push({ tick: world.tick + T(delay), run: () => fire(world, e, target, range) });
  }
}
