import { T, dist } from './util.js';
import { removeStatus, isStealthed, isInvulnerable, applyStatus } from './status.js';
import { onKill, respawnSeconds } from './economy.js';
import { tryRevive, onMagicTaken } from './items.js';
import { revealOnAttack } from './vision.js';
import { ITEM_PASSIVE } from '../data/items.js';

const hasPassive = (e, p) => !!e?.bonus?.passives?.has(p);

/** Sát thương nhận = raw × 100 / (100 + giáp hiệu dụng) (02 §7). Chuẩn không giảm. */
export function mitigate(src, tgt, raw, type, extraPen = 0) {
  if (type === 'true') return raw;
  if (type === 'physical') {
    const st = src?.stats;
    const eff = Math.max(0, tgt.stats.armor * (1 - Math.min(1, (st?.armorPenPct || 0) + extraPen)) - (st?.armorPenFlat || 0)); // extraPen: xuyên giáp riêng của chiêu (Hai Nòng Liên Xạ)
    return (raw * 100) / (100 + eff);
  }
  const st = src?.stats;
  return (raw * 100) / (100 + Math.max(0, tgt.stats.mr * (1 - (st?.mrPenPct || 0)) - (st?.mrPen || 0)));
}

/** Chống phá lén: công trình nhận ít hơn 60% sát thương khi không có lính bên tấn công trong bán kính 900 (03 §A4).
 *  Giáp trụ ngoài: trước phút `fortifyUntil` trụ ngoài chỉ nhận `fortifyTaken` sát thương (đầu trận không mất trụ quá sớm). */
function backdoorFactor(world, src, tgt) {
  if (!tgt.structure || !src) return 1;
  const TW = world.map.tower, R = TW.minionAggroRadius;
  const sd = world.map.suddenDeath, fort = (tgt.tier === 'outer' && TW.fortifyUntil && world.tick < T(TW.fortifyUntil) ? TW.fortifyTaken : 1) * (sd && world.tick >= T(sd.from) ? sd.structureTaken : 1);
  return fort * (world.entities.some((m) => m.kind === 'minion' && m.alive && m.team === src.team && dist(m.pos, tgt.pos) <= R) ? 1 : TW.backdoorTaken);
}

/** Gây sát thương: hook, bất tử, giảm giáp/KP, khiên, chết. Trả sát thương thực vào máu.
 *  opts: basic (đòn đánh thường), crit (chí mạng — mọi loại sát thương đều hiện được kiểu chí mạng), dot, reflect, slot (chiêu gây ra),
 *  armorPenPct (xuyên giáp riêng của chiêu). Hook nội tại: onDealDamage của người gây (đổi ctx.amount), onTakeDamage của người nhận
 *  (đổi ctx.amount; ctx.cancel = true là né hẳn đòn — Thấu Nhãn). */
export function dealDamage(world, src, tgt, amount, type = 'physical', opts = {}) {
  if (!tgt || !tgt.alive || amount <= 0 || tgt.noTarget) return 0;
  if (tgt.invulnerable || isInvulnerable(tgt)) { world.emit('immune', { id: tgt.id }); return 0; }
  if (src && src !== tgt) revealOnAttack(world, src, tgt); // đánh người thì lộ mặt (bụi, sương mù)
  const hook = src?.data?.passive?.hooks?.onDealDamage;
  if (hook) { const ctx = { world, self: src, target: tgt, amount, type, opts }; hook(ctx); amount = ctx.amount; }
  const take = tgt.data?.passive?.hooks?.onTakeDamage;
  if (take) {
    const ctx = { world, self: tgt, src, amount, type, opts }; take(ctx);
    if (ctx.cancel) { world.emit('dodge', { id: tgt.id, src: src?.id }); return 0; }
    amount = ctx.amount;
  }
  if (tgt.kind === 'monster' && hasPassive(src, 'jungleFang')) { // Nanh Thú Rừng: +30% (đã nâng: +50%) sát thương lên quái
    const J = ITEM_PASSIVE.jungleFang; amount *= 1 + (src.flags.fangUp ? J.monsterDmgUp : J.monsterDmg);
  }
  let dmg = mitigate(src, tgt, amount, type, opts.armorPenPct || 0) * (1 - Math.min(0.8, tgt.stats.dmgReduce || 0)) * (opts.basic ? 1 - (tgt.stats.basicReduce || 0) : 1) * backdoorFactor(world, src, tgt);
  let absorbed = 0;
  tgt.shields.sort((a, b) => a.until - b.until);
  for (const sh of tgt.shields) {
    if (dmg <= 0) break;
    const a = Math.min(sh.amount, dmg); sh.amount -= a; dmg -= a; absorbed += a;
  }
  tgt.shields = tgt.shields.filter((s) => s.amount > 0.01);
  dmg = Math.max(0, dmg);
  tgt.hp -= dmg;
  // chỉ số cho bảng tổng kết trận (tính cả phần khiên đỡ): gây lên tướng địch, chịu từ mọi nguồn, phá công trình, đánh mục tiêu lớn (boss)
  const got = dmg + absorbed;
  if (src?.kind === 'hero' && src.team !== tgt.team) {
    if (tgt.kind === 'hero') src.dmgHero = (src.dmgHero || 0) + got;
    else if (tgt.structure) src.dmgTower = (src.dmgTower || 0) + got;
    else if (tgt.kind === 'monster' && tgt.boss) src.dmgBoss = (src.dmgBoss || 0) + got;
  }
  if (tgt.kind === 'hero') tgt.dmgTaken = (tgt.dmgTaken || 0) + got;
  tgt.lastDamagedTick = world.tick; if (src) tgt.lastAttacker = src.id;
  if (dmg > 0 && src?.kind === 'hero' && !opts.dot && !opts.reflect) { // hút máu: mọi sát thương vật lý (đòn đánh lẫn kỹ năng); hút máu phép: mọi sát thương phép
    const rate = type === 'physical' ? src.stats.lifesteal : type === 'magic' ? src.stats.spellvamp : 0;
    if (rate > 0) heal(world, src, dmg * rate);
    if (tgt.kind === 'monster' && hasPassive(src, 'jungleFang')) heal(world, src, ITEM_PASSIVE.jungleFang.healPerHit); // Nanh Thú Rừng: hồi mỗi đòn lên quái
  }
  if (type === 'magic' && tgt.kind === 'hero') onMagicTaken(world, tgt);
  if (isStealthed(tgt)) removeStatus(tgt, 'stealth');
  if (src?.kind === 'hero' && tgt.kind === 'hero') { world.onHeroDamaged?.(src, tgt); (tgt.hitBy ||= {})[src.id] = world.tick; } // ghi ai đánh tướng (tính mạng hạ / hỗ trợ)
  if (src?.kind === 'hero' && tgt.kind === 'hero' && src.team !== tgt.team && got > 0 && tgt.statuses.some((s) => s.id === 'hoiMau')) { removeStatus(tgt, 'hoiMau'); world.emit('restoreBreak', { id: tgt.id }); } // Hồi Máu: tướng địch đánh trúng là mất hồi
  world.emit('damage', { id: tgt.id, src: src?.id, amount: Math.round(dmg + absorbed), dmgType: type, crit: !!opts.crit, slot: opts.slot, shield: absorbed > 0 && dmg <= 0 }); // crit: số bay kiểu chí mạng (hud.js)
  if (tgt.hp <= 0 && !tryRevive(world, tgt)) kill(world, src, tgt);
  return dmg;
}

/** Luật tính mạng hạ (như Liên Quân): người hạ là tướng địch gây sát thương CUỐI CÙNG trong KILL_WINDOW giây — kể cả khi lính / trụ /
 *  quái kết liễu; mọi tướng địch khác đã gây sát thương trong khoảng đó được tính hỗ trợ. Không tướng địch nào đánh: bị trụ / lính hạ
 *  (không ai được mạng). Hạ liên tiếp cách nhau ≤ MULTI_WINDOW giây: Double → Penta Kill. */
export const KILL_WINDOW = 10, MULTI_WINDOW = 10;

function kill(world, src, tgt) {
  if (tgt.kind === 'dummy') { tgt.hp = tgt.stats.maxHp; world.emit('reset', { id: tgt.id }); return; } // hình nộm hồi đầy
  tgt.hp = 0; tgt.alive = false; tgt.deaths++; tgt.deadTick = world.tick;
  const carry = tgt.kind === 'hero' ? tgt.statuses.filter((st) => st.transfer && st.until > world.tick) : []; // bùa xanh / đỏ: rơi sang người hạ
  tgt.dash = null; tgt.moveDir = { x: 0, y: 0 }; tgt.attacking = false; tgt.statuses = []; tgt.shields = [];
  if (src?.kind === 'hero' && (tgt.kind === 'minion' || tgt.kind === 'monster')) src.cs = (src.cs || 0) + 1; // lính / quái kết liễu
  if (tgt.structure && src && tgt.kind === 'tower') { const tm = 1 - tgt.team; (world.teamStats ||= [{}, {}])[tm].towers = ((world.teamStats[tm].towers) || 0) + 1; }
  if (tgt.kind !== 'hero') {
    onKill(world, src, tgt);
    if (tgt.structure) { world.emit('structureDown', { id: tgt.id, sid: tgt.sid, team: tgt.team, kind: tgt.kind }); return; }
    world.emit('death', { id: tgt.id, killer: src?.id });
    return;
  }
  const hit = Object.entries(tgt.hitBy || {}).map(([id, tk]) => ({ h: world.byId(+id), tk })).filter((o) => o.h && o.h.team !== tgt.team && world.tick - o.tk <= T(KILL_WINDOW));
  const killer = src?.kind === 'hero' && src.team !== tgt.team ? src : hit.reduce((b, o) => (!b || o.tk > b.tk ? o : b), null)?.h || null;
  const assists = hit.filter((o) => o.h !== killer).map((o) => o.h).sort((a, b) => a.id - b.id);
  for (const h of assists) h.assists = (h.assists || 0) + 1;
  tgt.hitBy = {};
  const victimStreak = tgt.killStreak || 0; tgt.multi = null;
  onKill(world, killer, tgt, killer ? assists : []); // vàng / KN cho người được tính mạng (+ phần chia hỗ trợ); chuỗi hạ gục của người hạ tăng, của nạn nhân về 0
  if (killer?.alive) for (const st of carry) { // bùa chuyển sang người hạ, giữ thời gian còn lại (ít nhất `transferMin` giây)
    const { kind, id, src, until, ...rest } = st, left = Math.max(st.transferMin || 0, (until - world.tick) / 30);
    applyStatus(world, killer, { ...rest, status: kind, id, duration: left }, killer);
    world.emit('buff', { id: killer.id, buff: st.buff, name: st.buffName, duration: left, stolen: true });
  }
  tgt.respawnTick = world.tick + T(respawnSeconds(world, tgt));
  const ev = { id: tgt.id, killer: killer ? killer.id : src?.id, by: src?.id, assists: assists.map((h) => h.id) };
  if (killer) {
    killer.kills++;
    const m = killer.multi; killer.multi = { n: m && world.tick - m.tick <= T(MULTI_WINDOW) ? m.n + 1 : 1, tick: world.tick };
    ev.multi = killer.multi.n; ev.streak = killer.killStreak; ev.shutdown = victimStreak >= 3 ? victimStreak : 0;
    if (!world.firstBlood) { world.firstBlood = { tick: world.tick, killer: killer.id, victim: tgt.id }; ev.first = true; }
  }
  world.emit('death', ev);
}

/** Hồi máu nhận thêm và khiên tặng đồng minh (không tính cho chính mình) — chỉ số "hồi/khiên" của điểm trận (08 §2). */
const supportStat = (src, tgt, a) => { if (a > 0 && src && src !== tgt && src.kind === 'hero' && src.team === tgt.team) src.healAlly = (src.healAlly || 0) + a; };
export function heal(world, tgt, amount, src = null) {
  if (!tgt.alive) return 0;
  const ah = tgt.statuses.find((s) => s.kind === 'antiheal'); if (ah) amount *= 1 - ah.pct; // giảm hồi máu (Giáp Gai)
  if (src && src !== tgt && hasPassive(src, 'guideLantern')) amount *= ITEM_PASSIVE.guideLantern.healShieldMult; // Đèn Soi Đường: hồi cho người khác +15%
  const a = Math.min(tgt.stats.maxHp - tgt.hp, amount); tgt.hp += a; supportStat(src, tgt, a);
  if (a > 0.5) world.emit('heal', { id: tgt.id, amount: Math.round(a) });
  return a;
}
export function addShield(world, tgt, amount, seconds, id = null, src = null) {
  if (!tgt.alive) return;
  if (src && src !== tgt && hasPassive(src, 'guideLantern')) amount *= ITEM_PASSIVE.guideLantern.healShieldMult; // Đèn Soi Đường: khiên cho người khác +15%
  const until = seconds >= 9000 ? Infinity : world.tick + T(seconds);
  if (id) { const o = tgt.shields.find((s) => s.id === id); if (o) { supportStat(src, tgt, amount - o.amount); o.amount = Math.max(o.amount, amount); o.until = until; return; } }
  tgt.shields.push({ amount, until, id }); supportStat(src, tgt, amount);
  world.emit('shield', { id: tgt.id, amount: Math.round(amount) });
}
export const hasShield = (tgt, id) => tgt.shields.some((s) => s.id === id);
