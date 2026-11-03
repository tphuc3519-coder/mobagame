// Chơi online (lockstep có máy chủ làm nhịp — DECISIONS 2026-11-01): dùng chung cho máy chủ (server/) và trình duyệt. Không chạm DOM / three.
// Máy chủ giữ đồng hồ 30 tick/giây, gom lệnh của người chơi theo tick và phát cho mọi máy; mỗi máy (kể cả máy chủ) chạy CÙNG mô phỏng
// src/sim/ với cùng seed + cùng lệnh theo đúng tick ⇒ cùng một trận. Mô phỏng tất định (core/rng.js, core/dmath.js).
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { DUEL, ARENA } from '../data/maps.js';
import { STARTER, starterFor } from '../data/items.js';
import { DIFFICULTY, botSpellOf } from '../data/ai.js';
import { SPELLS } from '../data/spells.js';
import { setupTeams } from '../sim/lineup.js';

export const NET = {
  version: 1,
  pack: 1,          // số tick mỗi gói khung máy chủ gửi: 1 = gửi ngay mỗi tick (30 gói/giây, vài chục byte/gói) — bớt ~17 ms trễ so với gói 2 tick
  hashEvery: 60,    // máy khách gửi mã băm trạng thái mỗi 2 giây để máy chủ dò lệch đồng bộ
  botAfter: 6,      // giây mất kết nối trước khi máy tạm điều khiển tướng
  loadTimeout: 45,  // giây chờ mọi máy tải xong trước khi trận tự bắt đầu
  queueWait: 60,    // ghép trận: chờ người thật tối đa 60 giây (tính từ người vào hàng sớm nhất), quá thì máy điền chỗ trống
  acceptSec: 12,    // "Đã tìm thấy trận": thời gian bấm Chấp nhận
  pickSec: 30,      // chọn tướng
  readySec: 3,      // cả phòng khoá xong → đếm ngược vào trận
};

export const MODES_ONLINE = { '1v1': { name: 'Đấu đơn 1v1', map: DUEL }, '5v5': { name: 'Đấu 5v5', map: ARENA } };
/** Hàng chờ ghép trận trực tuyến (Đấu thường / Đấu hạng / Đỉnh cao) — luôn 5v5, máy điền chỗ trống. Phòng tuỳ chỉnh (custom) không qua hàng chờ. */
export const QUEUES = { normal: { mode: '5v5' }, ranked: { mode: '5v5' }, peak: { mode: '5v5' } };
/** 5 vị trí 5v5 (như sim/lineup.js). */
export const ROLES5 = ['temple', 'mid', 'river', 'jungle', 'support'];

const CMD_TYPES = new Set(['move', 'attack', 'cast', 'spell', 'restore', 'buy', 'sell', 'useItem', 'recall', 'levelSkill', 'ping', 'targetBy', 'surrender']);
/** Làm sạch dữ liệu trong lệnh: chỉ số hữu hạn, chuỗi ngắn, đối tượng / mảng nông. */
function clean(v, depth) {
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') return v.slice(0, 40);
  if (depth <= 0 || typeof v !== 'object') return undefined;
  if (Array.isArray(v)) return v.slice(0, 8).map((x) => clean(x, depth - 1));
  const o = {}; let n = 0;
  for (const k of Object.keys(v)) { if (++n > 12) break; const c = clean(v[k], depth - 1); if (c !== undefined) o[k.slice(0, 16)] = c; }
  return o;
}
/** Lệnh người chơi gửi lên máy chủ → bản sạch (hoặc null nếu không hợp lệ). Lệnh 'bot' chỉ máy chủ được tạo. */
export function sanitizeCommand(cmd) {
  if (!cmd || typeof cmd !== 'object' || !CMD_TYPES.has(cmd.type)) return null;
  const c = clean(cmd, 3);
  if (c.type === 'move') { const d = c.dir || {}; let x = +d.x || 0, y = +d.y || 0; const l = Math.sqrt(x * x + y * y); if (l > 1) { x /= l; y /= l; } c.dir = { x, y }; }
  return c;
}
/** Hướng cần điều khiển → lưới 1/64 (gửi ít lệnh hơn, và mọi máy nhận đúng cùng một số). */
export const quantDir = (d) => ({ x: Math.round(d.x * 64) / 64, y: Math.round(d.y * 64) / 64 });

/** Kiểm tra cấu hình trận do máy chủ dựng. */
export function sanitizeHero(id) { return ALPHA.includes(id) ? id : ALPHA[0]; }
/** Phép bổ trợ người chơi chọn (không hợp lệ → null: dùng phép mặc định). */
export const sanitizeSpell = (id, mode) => (SPELLS[id] && !(mode !== '5v5' && SPELLS[id].disabledIn1v1) ? id : null);

/**
 * Dựng trận online — máy chủ và mọi máy khách gọi y hệt nhau (cùng thứ tự spawn / lệnh tick 0 ⇒ cùng trận).
 * cfg: { mode: '1v1' | '5v5', seed, difficulty, bots (mặc định true: máy điền chỗ trống; false: chỉ người thật),
 *        players: [{ team, heroId, name, role?, spellId?, lo?: { charm, emblem } }] } — 5v5 tối đa 5 người mỗi đội, 1v1 một người mỗi đội.
 * Trả về { humans: [entity theo thứ tự players] }.
 */
export function setupOnline(world, cfg) {
  const diff = DIFFICULTY[cfg.difficulty] ? cfg.difficulty : 'normal', bots = cfg.bots !== false;
  let ents;
  if (cfg.mode === '5v5') {
    ents = setupTeams(world, { humans: cfg.players.map((p) => ({ team: p.team, heroId: p.heroId, role: p.role || undefined })), difficulty: diff, bots }).humans;
  } else {
    const byTeam = [null, null], first = [cfg.players.find((p) => p.team === 0), cfg.players.find((p) => p.team === 1)];
    for (const t of [0, 1]) {
      const p = first[t], x = t ? DUEL.spawn[1].x - 250 : DUEL.spawn[0].x + 250;
      if (p) { byTeam[t] = world.spawnHero(p.heroId, t, { x, y: DUEL.road.y }); continue; }
      if (!bots) continue;
      const other = first[1 - t], foeId = ALPHA[(ALPHA.indexOf(other ? other.heroId : ALPHA[0]) + 3) % ALPHA.length];
      const foe = world.spawnHero(foeId, t, { x, y: DUEL.road.y });
      world.setLoadout(foe, {}); for (const id of STARTER[HEROES[foeId].roles[0]] || []) world.command(foe.id, { type: 'buy', item: id }); world.addBot(foe, diff);
    }
    ents = cfg.players.map((p) => byTeam[p.team]);
  }
  const humans = cfg.players.map((p, i) => {
    const e = ents[i], sp = sanitizeSpell(p.spellId, cfg.mode);
    // phép đã chọn ở màn chọn tướng; không có thì theo vị trí (rừng: Trừng Trị) / mặc định của tướng. Bảng bùa / phù hiệu: world.setLoadout tự làm sạch
    world.setLoadout(e, { spellId: sp || (cfg.mode === '5v5' ? botSpellOf(e.heroId, e.role) : undefined), ...(p.lo && typeof p.lo === 'object' ? { charm: p.lo.charm, emblem: p.lo.emblem } : {}) });
    e.autoLevel = false; e.skillLevels = { s1: 0, s2: 0, s3: 0 }; e.skillPoints = e.level; // người chơi tự cộng điểm (như game.js)
    e.playerName = String(p.name || 'Người chơi').slice(0, 16); e.online = true;
    for (const id of starterFor(HEROES[e.heroId], e.role, e.spell?.id)) world.command(e.id, { type: 'buy', item: id });
    return e;
  });
  return { humans };
}

/**
 * Áp một khung (lệnh của một tick) rồi chạy tick đó. cmds: mảng [entityId, lệnh] theo đúng thứ tự máy chủ nhận. Lệnh đặc biệt:
 * surrender (đầu hàng — đội của tướng gửi), bot { on } (máy chủ: người chơi mất kết nối → máy tạm điều khiển / trả lại).
 * localCommand: world.command gốc (máy khách đã bọc world.command để gửi lệnh của mình lên máy chủ).
 */
export function applyFrame(world, tick, cmds, localCommand = world.command) {
  if (cmds) for (const [id, c0] of cmds) {
    const c = JSON.parse(JSON.stringify(c0)); // bản sao: mô phỏng có giữ / sửa đối tượng lệnh thì khung đã gửi đi (và nhật ký) vẫn nguyên
    const e = world.byId(id); if (!e) continue;
    if (c.type === 'surrender') world.surrender(e.team);
    else if (c.type === 'bot') {
      if (c.on && !e.bot) { const gm = e.goldMult; world.addBot(e, 'normal', e.laneIdx ?? null); e.goldMult = gm; e.autoLevel = true; }
      else if (!c.on && e.bot) { e.bot = null; e.autoLevel = false; e.moveDir.x = 0; e.moveDir.y = 0; e.attacking = false; }
    } else localCommand(id, c);
  }
  world.update(tick);
}

/** Mã băm trạng thái (bit chính xác của số thực) — hai máy lệch nhau dù một bit cũng ra mã khác. */
export function hashWorld(world) {
  const dv = new DataView(new ArrayBuffer(8)); let h = 2166136261 >>> 0;
  const u = (n) => { h ^= n >>> 0; h = Math.imul(h, 16777619) >>> 0; };
  const f = (x) => { dv.setFloat64(0, +x || 0); u(dv.getUint32(0)); u(dv.getUint32(4)); };
  u(world.tick); u(world.entities.length); u(world.projectiles.length);
  const str = (v) => { const t = String(v); for (let i = 0; i < t.length; i++) u(t.charCodeAt(i)); };
  for (const e of world.entities) {
    u(e.id); f(e.pos.x); f(e.pos.y); f(e.hp); u(e.alive ? 1 : 0); f(e.gold ?? 0); u(e.level ?? 0); f(e.mana ?? 0); f(e.xp ?? 0); u(e.statuses.length);
    if (e.kind === 'hero') { u(e.skillPoints | 0); for (const k of ['s1', 's2', 's3']) { u(e.skillLevels[k] | 0); f(e.cooldowns[k] || 0); } str(e.items || ''); }
  }
  return h.toString(16).padStart(8, '0');
}

/** Bản đồ theo chế độ. */
export const mapOf = (mode) => (mode === '5v5' ? ARENA : DUEL);
