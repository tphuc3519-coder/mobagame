// Quái rừng & mục tiêu lớn (đội trung lập = 2). Đứng yên ở trại; bị tướng đánh thì cả trại lao vào kẻ đánh,
// đuổi tới khi kẻ đó ra khỏi vòng xích (LEASH quanh trại) hoặc chết → quay về, hồi máu nhanh. Chết → hồi sinh sau `respawn` giây.
// Thưởng: vàng/KN cho người kết liễu, KN chia đồng đội gần; bùa cho người kết liễu hoặc cả đội (data/jungle.js).
import { MONSTERS, monsterScale, LEASH, RESET_HEAL } from '../data/jungle.js';
import { T, dist, norm } from './util.js';
import { TICK } from '../core/loop.js';
import { dealDamage } from './damage.js';
import { applyStatus, isHardCC, isRooted } from './status.js';
import { spawnProjectile } from './projectiles.js';
import { isTargetable } from './targeting.js';

export const NEUTRAL = 2;

function spawnCamp(world, camp) {
  const def = MONSTERS[camp.type], sc = monsterScale(Math.floor(world.tick / 1800));
  camp.alive = []; camp.threat = {};
  for (const m of def.members) {
    const st = def.stats[m.kind], pos = { x: camp.x + m.x, y: camp.y + m.y };
    const base = { maxHp: st.maxHp * sc.hp, maxMana: 0, atk: st.atk * sc.atk, ap: 0, armor: st.armor, mr: st.mr, atkSpeed: def.atkSpeed, moveSpeed: def.moveSpeed, range: st.range };
    const e = world.spawnEntity({ kind: 'monster', team: NEUTRAL, monsterType: camp.type, member: m.kind, campId: camp.id, boss: !!def.boss, data: { name: def.name, base, perLevel: {}, basicAttack: {}, skills: {} },
      radius: st.radius, pos, height: def.boss ? 560 : m.kind === 'spirit' || m.kind === 'golem' ? 400 : m.kind === 'pup' ? 150 : 220, home: { ...pos }, aggro: null, returning: false });
    e.hp = e.stats.maxHp;
    const face = camp.arc ? (camp.side === 1 ? 90 - camp.arc.face : camp.arc.face) * Math.PI / 180 : Math.PI / 2; // nhìn ra cửa trại; boss nhìn về phía camera
    e.facing = face; e.homeFacing = face;
    camp.alive.push(e.id);
  }
  camp.respawnAt = null;
  world.emit('campSpawn', { camp: camp.id, type: camp.type });
}

export function initJungle(world) {
  world.camps = (world.map.camps || []).map((c) => ({ ...c, alive: [], respawnAt: T(MONSTERS[c.type].first) }));
}

/** Trại có bị hạ hết chưa; đếm ngược hồi sinh. Gọi trong world.update. */
export function updateJungle(world) {
  if (!world.camps) return;
  for (const camp of world.camps) {
    if (camp.respawnAt != null) { if (world.tick >= camp.respawnAt) spawnCamp(world, camp); continue; }
    const members = camp.alive.map((id) => world.byId(id)).filter((e) => e && e.alive);
    if (!members.length) { camp.respawnAt = world.tick + T(MONSTERS[camp.type].respawn); world.emit('campCleared', { camp: camp.id, type: camp.type }); continue; }
    // gây hấn chung: con nào bị tướng đánh thì cả trại nhắm kẻ đó; nhớ mọi tướng vừa đánh trại (camp.threat) để đổi mục tiêu
    camp.threat ||= {};
    for (const m of members) {
      if (m.lastAttacker == null || world.tick - m.lastDamagedTick >= 2) continue;
      const a = world.byId(m.lastAttacker); if (!a || a.kind !== 'hero') continue;
      camp.threat[a.id] = m.lastDamagedTick;
      if (!m.returning && m.aggro == null) for (const o of members) if (!o.returning) o.aggro = a.id;
    }
    for (const m of members) think(world, m, MONSTERS[camp.type], camp);
  }
  world.entities = world.entities.filter((e) => !(e.kind === 'monster' && !e.alive && world.tick - e.deadTick > 60));
}

/** Mục tiêu còn đuổi được: sống, trong vòng xích quanh trại (mục tiêu lớn đứng yên: còn trong tầm đánh + 250). */
const inLeash = (m, t) => !!t && t.alive && dist(t.pos, m.home) <= LEASH + t.radius && !(m.stats.moveSpeed === 0 && dist(t.pos, m.pos) - t.radius > m.stats.range + 250);

function think(world, m, def, camp) {
  if (isHardCC(m)) { m.speed = 0; return; }
  if (m.returning) { // về trại, hồi máu, không nhận gây hấn
    const d = dist(m.pos, m.home);
    m.hp = Math.min(m.stats.maxHp, m.hp + m.stats.maxHp * RESET_HEAL * TICK);
    if (d < 20) { m.returning = false; m.speed = 0; m.lastAttacker = null; m.hp = m.stats.maxHp; m.facing = m.homeFacing ?? m.facing; return; }
    move(m, norm(m.home.x - m.pos.x, m.home.y - m.pos.y), Math.min(d, m.stats.moveSpeed * 1.6 * TICK) || 0);
    return;
  }
  let t = m.aggro != null ? world.byId(m.aggro) : null;
  if (!inLeash(m, t) || !isTargetable(m, t)) {
    // mất mục tiêu (chết, ra khỏi xích, không chọn được): đổi sang tướng khác vừa đánh trại trong 3s (06 §3) thay vì bỏ về hồi đầy máu —
    // trước đây tướng đỡ đòn chết, hay người giữ aggro nhảy Đe Trời/tàng hình, là mục tiêu lớn hồi đầy ngay dù cả đội vẫn đang đánh
    const hold = inLeash(m, t) ? t : null; t = null;
    for (const [id, tk] of Object.entries(camp?.threat || {})) {
      const c = world.tick - tk <= T(3) ? world.byId(+id) : null;
      if (inLeash(m, c) && isTargetable(m, c) && (!t || dist(c.pos, m.pos) < dist(t.pos, m.pos))) t = c;
    }
    if (t) m.aggro = t.id;
    else if (hold) { m.speed = 0; return; } // chỉ tạm không chọn được (nhảy, tàng hình, bất động): đứng chờ
    else {
      if (m.aggro != null || dist(m.pos, m.home) > 20) { m.aggro = null; m.returning = true; } // không còn ai đánh: về trại (tới nơi hồi đầy máu)
      else if (world.tick - m.lastDamagedTick > T(4)) m.hp = Math.min(m.stats.maxHp, m.hp + m.stats.maxHp * 0.02 * TICK);
      m.speed = 0; return;
    }
  }
  const d = dist(t.pos, m.pos) - t.radius;
  m.facing = Math.atan2(t.pos.y - m.pos.y, t.pos.x - m.pos.x);
  if (d <= m.stats.range) { m.speed = 0; if (world.tick >= m.attackReady) attack(world, m, t, def); }
  else if (m.stats.moveSpeed > 0 && !isRooted(m)) move(m, norm(t.pos.x - m.pos.x, t.pos.y - m.pos.y), m.stats.moveSpeed * TICK);
}

function move(m, dir, step) { m.pos.x += dir.x * step; m.pos.y += dir.y * step; m.facing = Math.atan2(dir.y, dir.x); m.speed = step / TICK; }

function attack(world, m, t, def) {
  m.attackReady = world.tick + T(1 / m.stats.atkSpeed);
  world.emit('attack', { id: m.id, n: 1, interval: 1 / m.stats.atkSpeed, delay: 0.35 });
  world.pending.push({ tick: world.tick + T(0.35), run: () => {
    if (!m.alive || !t.alive || isHardCC(m)) return;
    const hit = (tt) => {
      dealDamage(world, m, tt, m.stats.atk, 'physical');
      if (def.splash) for (const o of world.entities) if (o !== tt && o.alive && o.kind === 'hero' && dist(o.pos, tt.pos) <= def.splash) dealDamage(world, m, o, m.stats.atk * 0.5, 'physical');
      if (def.splash) world.emit('impact', { id: m.id, x: tt.pos.x, y: tt.pos.y, radius: def.splash, slot: 'boss' });
    };
    if (def.ranged) spawnProjectile(world, { owner: m.id, x: m.pos.x, y: m.pos.y, dx: 0, dy: 0, speed: def.ranged, remaining: 9999, homing: t.id, kind: 'basic', onHit: (tt) => hit(tt) });
    else hit(t);
  } });
}

/** Thưởng khi hạ quái (gọi từ economy.onKill). */
export function onMonsterKilled(world, killer, m, { addGold, gainXp }) {
  const def = MONSTERS[m.monsterType]; if (!def) return;
  const heroes = world.entities.filter((h) => h.kind === 'hero' && h.alive);
  if (killer && killer.kind === 'hero') {
    addGold(world, killer, def.gold[m.member] || 0);
    const near = heroes.filter((h) => h.team === killer.team && dist(h.pos, m.pos) <= 1200);
    for (const h of near) gainXp(world, h, (def.xp[m.member] || 0) * (h === killer ? 1 : 0.5));
    if (def.teamReward) for (const h of world.entities.filter((x) => x.kind === 'hero' && x.team === killer.team)) { addGold(world, h, def.teamReward.gold); gainXp(world, h, def.teamReward.xp); }
    const b = def.buff;
    if (b) for (const h of b.to === 'team' ? heroes.filter((x) => x.team === killer.team) : [killer]) {
      applyStatus(world, h, { status: 'statMod', id: b.id, buff: b.id, ...b.mod, burn: b.burn, duration: b.duration }, h);
      world.emit('buff', { id: h.id, buff: b.id, name: b.name, duration: b.duration });
    }
    if (def.boss) { const ts = (world.teamStats ||= [{}, {}])[killer.team]; ts[m.monsterType] = (ts[m.monsterType] || 0) + 1; ts.boss = (ts.boss || 0) + 1; } // bảng tỉ số
    world.emit('monsterKill', { id: m.id, killer: killer.id, team: killer.team, type: m.monsterType, boss: !!def.boss, name: def.name });
  }
}
