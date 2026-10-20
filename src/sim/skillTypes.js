// Kiểu kỹ năng mở rộng (04 §2) cho 14 tướng mở khoá ở đợt kiểm toán: đường thẳng nhiều nhịp, trói nối, phân thân kích hoạt lại,
// lao khoá mục tiêu, đạn khoá mục tiêu; cùng các phần chạy mỗi tick (dây trói, phân thân, lịch sử vị trí cho tua ngược).
// Mọi con số nằm trong file tướng (src/data/heroes); đây chỉ là luật chung, không gọi tên tướng nào.
import { T, dist, norm, dirTo, clampToMap } from './util.js';
import { applyStatus, isHardCC } from './status.js';
import { heal } from './damage.js';
import { enemiesOf, isTargetable } from './targeting.js';
import { canSee } from './vision.js';
import { spawnProjectile } from './projectiles.js';
import { makeCtx } from './ctx.js';
import { skillHit, applyEffects, aimDir, aimPoint, inRadius, startSkillSuppress } from './skills.js';
import { updateSuppressions } from './suppress.js';
import { lv } from '../data/heroes/_levels.js';

const missHook = (world, e, cast) => e.data.passive?.hooks?.onSkillMiss?.(makeCtx(world, e, { cast, skill: cast.skill }));

/** Mục tiêu của chiêu khoá mục tiêu: trong tầm, nhìn thấy, chọn được; tướng trước, rồi gần hướng kéo nhất (aim là hướng), rồi gần nhất.
 *  aim.id: mục tiêu chỉ định (người chơi khoá trên HUD / đang xem trước khi kéo / bot chọn) — dùng nếu qua đúng các điều kiện trên, không thì
 *  chọn như thường (không bất ngờ báo "không có mục tiêu"). skill.heroOnly: chỉ tướng; skill.canTarget(e, t, world): điều kiện riêng. */
export function pickSkillTarget(world, e, skill, aim) {
  const R = skill.range || 600, dir = aim && (aim.x || aim.y) && Math.hypot(aim.x, aim.y) <= 1.5 ? norm(aim.x, aim.y) : null;
  const valid = (t) => !!t && t.team !== e.team && !t.structure && isTargetable(e, t) && canSee(e.team, t) && (!skill.heroOnly || t.isHero)
    && dist(t.pos, e.pos) - t.radius <= R && (!skill.canTarget || skill.canTarget(e, t, world));
  if (aim?.id != null) { const t = world.byId(aim.id); if (valid(t)) return t; } // mục tiêu chỉ định (khoá trên HUD / xem trước khi kéo / bot)
  let best = null, bs = -Infinity;
  for (const t of world.entities) {
    if (!valid(t)) continue;
    const d = dist(t.pos, e.pos);
    const dd = d > 0 ? { x: (t.pos.x - e.pos.x) / d, y: (t.pos.y - e.pos.y) / d } : { x: 0, y: 0 }, align = dir ? dd.x * dir.x + dd.y * dir.y : 0;
    const sc = (t.isHero ? 1e5 : 0) + (dir ? align * 3000 : 0) - d;
    if (sc > bs) { bs = sc; best = t; }
  }
  return best;
}

/** Phân thân bay tới điểm; kích hoạt lại trong cửa sổ để đổi chỗ với một phân thân (gần điểm ngắm nhất). */
export function recastAgain(world, e, slot, aim) {
  const r = e.recast, cl = r.clones.map((id) => world.byId(id)).filter((c) => c?.alive && !r.used.includes(c.id));
  if (!cl.length || r.left <= 0) { e.recast = null; return { ok: false, reason: 'cooldown' }; }
  let c = cl[0];
  if (aim) { let bd = Infinity; for (const x of cl) { const d = dist(x.pos, aim); if (d < bd) { bd = d; c = x; } } }
  const from = { x: e.pos.x, y: e.pos.y }, to = { x: c.pos.x, y: c.pos.y };
  e.pos.x = e.prevPos.x = to.x; e.pos.y = e.prevPos.y = to.y; e.dash = null; e.forced = null;
  c.pos.x = c.prevPos.x = from.x; c.pos.y = c.prevPos.y = from.y;
  r.used.push(c.id); if (--r.left <= 0) e.recast = null;
  world.emit('blink', { id: e.id, from, to }); world.emit('cloneSwap', { id: e.id, clone: c.id });
  return { ok: true };
}

/** Tua ngược: về vị trí và máu của `secs` giây trước (không mất máu nếu hiện tại cao hơn). Lịch sử ghi mỗi 0,5 s (recordHistory). */
export function rewind(world, e, secs) {
  const want = world.tick - T(secs), h = e.hist || [];
  let pick = null; for (const s of h) if (s.tick <= want) pick = s;
  pick ||= h[0]; if (!pick) return;
  const from = { x: e.pos.x, y: e.pos.y };
  e.pos.x = e.prevPos.x = pick.x; e.pos.y = e.prevPos.y = pick.y; e.dash = null; e.forced = null;
  if (pick.hp > e.hp) heal(world, e, pick.hp - e.hp, e);
  world.emit('rewind', { id: e.id, from, to: { x: pick.x, y: pick.y }, secs });
}

/** Chém liên hoàn tại chỗ sau cú lướt: N nhát quanh mình, nhát cuối mạnh hơn; không thể bị chọn làm mục tiêu suốt chuỗi chém. */
export function startSlashes(world, e, cast) {
  const P = cast.skill.params, n = P.slashes || 13, iv = P.slashInterval || 0.1, R = P.slashRadius || 280;
  applyStatus(world, e, { status: 'untargetable', id: 'slashes', duration: n * iv }, e);
  e.castUntil = world.tick + T(n * iv); e.castFacing = e.facing;
  world.emit('slashes', { id: e.id, n, dur: n * iv, radius: R, slot: cast.slot });
  for (let i = 0; i < n; i++) world.pending.push({ tick: world.tick + T(iv * i), run: () => {
    if (!e.alive) return;
    const last = i === n - 1;
    world.emit('slash', { id: e.id, n: i, last, x: e.pos.x, y: e.pos.y, slot: cast.slot });
    for (const t of inRadius(world, e, e.pos, R)) skillHit(world, e, t, cast, { mult: last ? 1 + (P.finisherBonus || 0) : 1, noEffects: !last });
  } });
}

export const EXTRA_HANDLERS = {
  /** Đường thẳng tức thời (nét mực, tia lửa, nhát chém): hình chữ nhật dài `range`, rộng `width`, `ticks` nhịp cách `tickInterval`.
   *  Hiệu ứng `ifAllTicksHit` chỉ áp lên mục tiêu trúng đủ mọi nhịp. */
  line(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim), n = skill.ticks || skill.hits || 1, iv = skill.tickInterval || 0.2, hits = new Map();
    const tick = (i) => {
      if (!e.alive || (i > 0 && isHardCC(e))) return;
      const ox = e.pos.x, oy = e.pos.y;
      world.emit('line', { id: e.id, x: ox, y: oy, dx: d.x, dy: d.y, range: skill.range, width: skill.width, slot: cast.slot, team: e.team, n: i, of: n });
      for (const t of enemiesOf(world, e)) {
        const rx = t.pos.x - ox, ry = t.pos.y - oy, along = rx * d.x + ry * d.y, side = Math.abs(rx * d.y - ry * d.x);
        if (along < -t.radius || along > skill.range + t.radius || side > (skill.width || 100) / 2 + t.radius) continue;
        hits.set(t.id, (hits.get(t.id) || 0) + 1);
        skillHit(world, e, t, cast, { noEffects: i > 0 });
      }
      if (i === n - 1) for (const [id, k] of hits) { const t = world.byId(id); if (k >= n && t?.alive) applyEffects(world, e, t, skill.effects, cast.level, null, 'ifAllTicksHit'); }
    };
    tick(0);
    for (let i = 1; i < n; i++) world.pending.push({ tick: world.tick + T(iv * i), run: () => tick(i) });
  },
  /** Trói nối: phóng một sợi bóng; trúng thì nối với mục tiêu `duration` giây (gây sát thương chia nhịp 0,5 s), hết giờ còn trong tầm
   *  thì áp hiệu ứng `atEnd`. Đứt khi người trói chết / bị khống chế cứng hoặc hai bên kéo giãn quá 115% tầm. */
  tether(world, e, cast, aim) {
    const { skill } = cast, d = aimDir(e, aim);
    spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: d.x, dy: d.y, speed: skill.speed || 1800, remaining: skill.range, width: skill.width || 70, kind: 'skill', slot: cast.slot, heroOnly: !!skill.heroOnly,
      onHit: (t) => { startTether(world, e, t, cast); return true; },
      onEnd: (p) => { if (!p.hit.size) missHook(world, e, cast); } });
    world.emit('shot', { id: e.id, slot: cast.slot });
  },
  /** Phân thân: thả `params.clones` bản sao (không thể chọn làm mục tiêu) quanh điểm ngắm, tự đánh địch gần nhất `recastWindow` giây. */
  recast(world, e, cast, aim) {
    const { skill } = cast, P = skill.params || {}, p = aimPoint(world, e, aim, skill.range), n = P.clones || 2, win = skill.recastWindow || 4;
    const d = dirTo(e.pos, p), side = { x: -d.y, y: d.x }, ids = [];
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? (i / (n - 1) - 0.5) * 2 : 0;
      const pos = clampToMap(world.map, { x: p.x + side.x * k * 100, y: p.y + side.y * k * 100 }, e.radius);
      const c = world.spawnEntity({ kind: 'clone', team: e.team, heroId: e.heroId, data: e.data, radius: e.radius, pos, noTarget: true, owner: e.id, until: world.tick + T(win), cast, atkReady: world.tick + T(0.35), facing: e.facing, height: e.height });
      ids.push(c.id);
    }
    e.recast = { slot: cast.slot, until: world.tick + T(win), clones: ids, left: skill.recasts || 1, used: [] };
    world.emit('clones', { id: e.id, clones: ids, x: p.x, y: p.y, dur: win, slot: cast.slot });
  },
  /** Lao vào mục tiêu đã khoá: bám theo mục tiêu, chạm thì trúng đòn; mục tiêu biến mất / không thể chọn giữa chừng thì trượt. */
  targetedDash(world, e, cast) {
    const { skill } = cast, t = cast.target, d = dirTo(e.pos, t.pos);
    e.dash = { dx: d.x, dy: d.y, perTick: (skill.speed || 2400) / 30, left: (skill.range || 600) * 1.6, target: t.id, along: false, stop: false, hit: new Set(), cast,
      onEnd: (hit) => { if (!hit) missHook(world, e, cast); } };
    world.emit('dashTo', { id: e.id, target: t.id, slot: cast.slot });
  },
  /** Đạn khoá mục tiêu: bay theo mục tiêu cho tới khi trúng; mục tiêu chết / mất dấu thì trượt. */
  targeted(world, e, cast) {
    const { skill } = cast, t = cast.target;
    spawnProjectile(world, { owner: e.id, x: e.pos.x, y: e.pos.y, dx: 0, dy: 0, speed: skill.speed || 2200, remaining: 9999, homing: t.id, kind: 'skill', slot: cast.slot,
      onHit: (tt) => { skillHit(world, e, tt, cast); return true; }, onEnd: () => missHook(world, e, cast) });
    world.emit('shot', { id: e.id, slot: cast.slot, target: t.id });
  },
};

function startTether(world, e, t, cast) {
  const { skill, level } = cast, S = skill.suppress, dur = S ? lv(S.duration ?? skill.duration ?? 1, level) : skill.duration || 2, n = Math.max(1, Math.round(dur / 0.5));
  applyEffects(world, e, t, skill.effects, level);
  if (S) { // dây áp chế (Trói Bóng): sợi xích của suppress.js chạy cả nhịp sát thương lẫn hiệu ứng cuối; không áp được (miễn khống chế) thì dây thường
    const link = startSkillSuppress(world, e, t, cast, { via: 'tether', every: 15, onTick: () => skillHit(world, e, t, cast, { mult: 1 / n, noEffects: true }),
      onEnd: (ok) => world.emit('tetherEnd', { id: e.id, target: t.id, ok }) });
    if (link) { world.emit('tether', { id: e.id, target: t.id, dur, slot: cast.slot }); skillHit(world, e, t, cast, { mult: 1 / n, noEffects: true }); return; }
  }
  (world.tethers ||= []).push({ owner: e.id, target: t.id, cast, until: world.tick + T(dur), next: world.tick + 15, n, maxD: (skill.range || 700) * 1.15 });
  world.emit('tether', { id: e.id, target: t.id, dur, slot: cast.slot });
  skillHit(world, e, t, cast, { mult: 1 / n, noEffects: true });
}

export function updateTethers(world) {
  if (!world.tethers?.length) return;
  world.tethers = world.tethers.filter((th) => {
    const e = world.byId(th.owner), t = world.byId(th.target);
    if (!e?.alive || !t?.alive || isHardCC(e) || dist(e.pos, t.pos) > th.maxD) { // đứt: gỡ trói do sợi này gây ra
      if (t) t.statuses = t.statuses.filter((s) => !(s.src === th.owner && s.kind === 'root'));
      world.emit('tetherEnd', { id: th.owner, target: th.target, ok: false });
      return false;
    }
    if (world.tick >= th.next && world.tick < th.until) { th.next += 15; skillHit(world, e, t, th.cast, { mult: 1 / th.n, noEffects: true }); }
    if (world.tick >= th.until) { applyEffects(world, e, t, th.cast.skill.effects, th.cast.level, null, 'atEnd'); world.emit('tetherEnd', { id: th.owner, target: th.target, ok: true }); return false; }
    return true;
  });
}

const CLONE_RANGE = 450, CLONE_SPEED = 380, CLONE_IV = 0.8;
/** Phân thân: đi tới địch gần nhất (ưu tiên tướng) và bắn đạn khoá mục tiêu; hết giờ / chủ chết thì tan. Sát thương tính cho chủ. */
export function updateClones(world) {
  let gone = false;
  for (const c of world.entities) {
    if (c.recast && world.tick > c.recast.until) c.recast = null;
    if (c.kind !== 'clone') continue;
    const o = world.byId(c.owner);
    if (!o?.alive || world.tick >= c.until) { c.alive = false; gone = true; world.emit('cloneEnd', { id: c.id, x: c.pos.x, y: c.pos.y }); continue; }
    c.prevPos.x = c.pos.x; c.prevPos.y = c.pos.y;
    let t = null, bs = Infinity;
    for (const x of enemiesOf(world, o)) {
      if (x.structure || !canSee(o.team, x)) continue;
      const d = dist(x.pos, c.pos) - x.radius; if (d > 900) continue;
      const sc = d - (x.isHero ? 600 : 0); if (sc < bs) { bs = sc; t = x; }
    }
    if (!t) { c.speed = 0; continue; }
    const d = dist(c.pos, t.pos) - t.radius;
    c.facing = Math.atan2(t.pos.y - c.pos.y, t.pos.x - c.pos.x);
    if (d > CLONE_RANGE) { const dd = dirTo(c.pos, t.pos), s = CLONE_SPEED / 30; c.pos.x += dd.x * s; c.pos.y += dd.y * s; clampToMap(world.map, c.pos, c.radius); c.speed = CLONE_SPEED; continue; }
    c.speed = 0;
    if (world.tick < c.atkReady) continue;
    const iv = c.cast.skill.params?.cloneIv || CLONE_IV;
    c.atkReady = world.tick + T(iv); c.atkIndex = (c.atkIndex || 0) + 1;
    world.emit('attack', { id: c.id, n: c.atkIndex, interval: iv, delay: 0.2 });
    world.pending.push({ tick: world.tick + T(0.2), run: () => {
      if (!c.alive || !t.alive || !o.alive) return;
      spawnProjectile(world, { owner: o.id, x: c.pos.x, y: c.pos.y, dx: 0, dy: 0, speed: 1900, remaining: 9999, homing: t.id, kind: 'basic', slot: c.cast.slot, onHit: (tt) => skillHit(world, o, tt, c.cast, { noEffects: true }) });
    } });
  }
  if (gone) world.entities = world.entities.filter((c) => !(c.kind === 'clone' && !c.alive));
}

const HIST_EVERY = 15, HIST_KEEP = 14; // 0,5 s một mẫu, giữ 7 s
/** Lịch sử vị trí / máu của tướng (tua ngược). Chết thì xoá: hồi sinh không tua về chỗ cũ trước khi chết. */
export function recordHistory(world) {
  if (world.tick % HIST_EVERY) return;
  for (const e of world.entities) {
    if (e.kind !== 'hero') continue;
    if (!e.alive) { e.hist = null; continue; }
    const h = (e.hist ||= []); h.push({ tick: world.tick, x: e.pos.x, y: e.pos.y, hp: e.hp }); if (h.length > HIST_KEEP) h.shift();
  }
}

/** Mọi phần chạy mỗi tick của kỹ năng mở rộng. */
export function updateSkillEntities(world) { updateSuppressions(world); updateTethers(world); updateClones(world); recordHistory(world); }
