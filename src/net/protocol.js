// Chơi online (lockstep có máy chủ làm nhịp — DECISIONS 2026-11-01): dùng chung cho máy chủ (server/) và trình duyệt. Không chạm DOM / three.
// Máy chủ giữ đồng hồ 30 tick/giây, gom lệnh của người chơi theo tick và phát cho mọi máy; mỗi máy (kể cả máy chủ) chạy CÙNG mô phỏng
// src/sim/ với cùng seed + cùng lệnh theo đúng tick ⇒ cùng một trận. Mô phỏng tất định (core/rng.js, core/dmath.js).
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { DUEL, ARENA } from '../data/maps.js';
import { STARTER, starterFor, ITEMS, ITEM_MAX } from '../data/items.js';
import { PING_KINDS, SURRENDER } from '../data/signals.js';
import { voteSurrender } from '../sim/match.js';
import { DIFFICULTY, botSpellOf } from '../data/ai.js';
import { SPELLS } from '../data/spells.js';
import { setupTeams } from '../sim/lineup.js';

export const NET = {
  version: 2,       // TĂNG mỗi khi đổi mô phỏng / khuôn tin: máy khách và máy chủ khác số thì từ chối nhau (lockstep — khác bản là lệch đồng bộ). 2: đợt 14/11
  pack: 1,          // số tick mỗi gói khung máy chủ gửi: 1 = gửi ngay mỗi tick (30 gói/giây, vài chục byte/gói) — bớt ~17 ms trễ so với gói 2 tick
  hashEvery: 60,    // máy khách gửi mã băm trạng thái mỗi 2 giây để máy chủ dò lệch đồng bộ
  botAfter: 6,      // giây mất kết nối trước khi máy tạm điều khiển tướng
  loadTimeout: 45,  // giây chờ mọi máy tải xong trước khi trận tự bắt đầu
  queueWait: 60,    // ghép trận: chờ người thật tối đa 60 giây (tính từ người vào hàng sớm nhất), quá thì máy điền chỗ trống
  acceptSec: 12,    // "Đã tìm thấy trận": thời gian bấm Chấp nhận
  pickSec: 30,      // chọn tướng
  readySec: 3,      // cả phòng khoá xong → đếm ngược vào trận
};

/** Câu báo khi bản game của máy khách khác bản của máy chủ (máy chủ gửi; máy khách bản cũ cũng hiện được vì là tin 'err' thường). */
export const VERSION_MSG = 'Bản game của bạn khác bản của máy chủ — tải lại trang (hoặc đóng mở lại ứng dụng) để cập nhật';

export const MODES_ONLINE = { '1v1': { name: 'Đấu đơn 1v1', map: DUEL }, '5v5': { name: 'Đấu 5v5', map: ARENA } };
/** Hàng chờ ghép trận trực tuyến (Đấu thường / Đấu hạng / Đỉnh cao) — luôn 5v5, máy điền chỗ trống. Phòng tuỳ chỉnh (custom) không qua hàng chờ. */
export const QUEUES = { normal: { mode: '5v5' }, ranked: { mode: '5v5', ranked: true }, peak: { mode: '5v5', ranked: true } }; // ranked: đầu hàng từ SURRENDER.rankedFrom
/** 5 vị trí 5v5 (như sim/lineup.js). */
export const ROLES5 = ['temple', 'mid', 'river', 'jungle', 'support'];

const CMD_TYPES = new Set(['move', 'attack', 'cast', 'spell', 'restore', 'buy', 'sell', 'useItem', 'recall', 'levelSkill', 'ping', 'targetBy', 'surrender']);
const SKILL_SLOTS = new Set(['s1', 's2', 's3']), ATK_MODES = new Set(['minion', 'tower']), TARGET_BY = new Set(['pct', 'hp', 'near']);
const COORD_MAX = 1e5; // toạ độ / hướng ngắm: bản đồ lớn nhất 6 400 — chặn số khổng lồ
const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const coord = (v) => Math.max(-COORD_MAX, Math.min(COORD_MAX, v));
/** id đơn vị hợp lệ (số nguyên dương) hoặc null. */
const entId = (v) => (Number.isInteger(v) && v > 0 && v < 2 ** 31 ? v : null);
/** Ô túi đồ hợp lệ (0 … ITEM_MAX − 1) hoặc -1. */
const bagSlot = (v) => (Number.isInteger(v) && v >= 0 && v < ITEM_MAX ? v : -1);
/** aim của chiêu / phép / đồ: hướng hoặc điểm { x, y } và / hoặc mục tiêu chỉ định { id }. Sai kiểu → null (mô phỏng tự ngắm). */
function cleanAim(a) {
  if (!a || typeof a !== 'object') return null;
  const o = {}, id = entId(a.id);
  if (fin(a.x) && fin(a.y)) { o.x = coord(a.x); o.y = coord(a.y); }
  if (id != null) o.id = id;
  return o.x === undefined && o.id === undefined ? null : o;
}
/**
 * Lệnh người chơi gửi lên máy chủ → bản sạch dựng lại TỪ ĐẦU theo đúng khuôn của từng loại lệnh (hoặc null nếu không hợp lệ). Không chép
 * trường lạ: máy khách là thứ không tin được — trước đây chỉ cắt ngắn chuỗi / số, nên { type: 'sell', slot: 'length' } làm mô phỏng văng
 * (sập luôn máy chủ) và { type: 'buy', item: '__proto__' } biến vàng thành NaN (mua gì cũng được). Lệnh 'bot' chỉ máy chủ được tạo.
 */
export function sanitizeCommand(cmd) {
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd) || !CMD_TYPES.has(cmd.type)) return null;
  switch (cmd.type) {
    case 'move': {
      const d = cmd.dir && typeof cmd.dir === 'object' ? cmd.dir : null; let x = d && fin(d.x) ? coord(d.x) : 0, y = d && fin(d.y) ? coord(d.y) : 0;
      const l = Math.sqrt(x * x + y * y); if (l > 1) { x /= l; y /= l; }
      return { type: 'move', dir: { x, y } };
    }
    case 'attack': return cmd.on === false ? { type: 'attack', on: false } : { type: 'attack', on: true, mode: ATK_MODES.has(cmd.mode) ? cmd.mode : null, preferTarget: entId(cmd.preferTarget) };
    case 'cast': return SKILL_SLOTS.has(cmd.slot) ? { type: 'cast', slot: cmd.slot, aim: cleanAim(cmd.aim) } : null;
    case 'spell': return { type: 'spell', aim: cleanAim(cmd.aim) };
    case 'restore': case 'recall': case 'surrender': return { type: cmd.type };
    case 'buy': return typeof cmd.item === 'string' && Object.hasOwn(ITEMS, cmd.item) ? { type: 'buy', item: cmd.item } : null;
    case 'sell': { const s = bagSlot(cmd.slot); return s < 0 ? null : { type: 'sell', slot: s }; }
    case 'useItem': { const s = bagSlot(cmd.slot); return s < 0 ? null : { type: 'useItem', slot: s, aim: cleanAim(cmd.aim) }; }
    case 'levelSkill': return SKILL_SLOTS.has(cmd.slot) ? { type: 'levelSkill', slot: cmd.slot } : null;
    case 'ping': return typeof cmd.kind === 'string' && Object.hasOwn(PING_KINDS, cmd.kind) && fin(cmd.x) && fin(cmd.y) ? { type: 'ping', kind: cmd.kind, x: coord(cmd.x), y: coord(cmd.y), target: entId(cmd.target) } : null;
    case 'targetBy': return { type: 'targetBy', value: TARGET_BY.has(cmd.value) ? cmd.value : null };
    default: return null;
  }
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
  world.surrenderFrom = Math.round((QUEUES[cfg.q]?.ranked ? SURRENDER.rankedFrom : 0) * 30); // tick: mốc đầu hàng do mô phỏng giữ (mọi máy như nhau), không chỉ ở nút bấm
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
 * surrender (phiếu đầu hàng của người gửi — sim/match.js voteSurrender), bot { on } (máy chủ: người chơi mất kết nối → máy tạm điều khiển / trả lại).
 * localCommand: world.command gốc (máy khách đã bọc world.command để gửi lệnh của mình lên máy chủ).
 */
export function applyFrame(world, tick, cmds, localCommand = world.command) {
  if (cmds) for (const [id, c0] of cmds) {
    const c = JSON.parse(JSON.stringify(c0)); // bản sao: mô phỏng có giữ / sửa đối tượng lệnh thì khung đã gửi đi (và nhật ký) vẫn nguyên
    const e = world.byId(id); if (!e) continue;
    if (c.type === 'surrender') voteSurrender(world, e); // biểu quyết (sim/match.js): một người không đầu hàng thay cả đội
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
