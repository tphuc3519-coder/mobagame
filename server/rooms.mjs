// Phòng chơi online. Hai loại phòng:
//  • Phòng tuỳ chỉnh (kind 'custom'): tạo / vào bằng mã 4 ký tự, tối đa 2 × 5 người (1v1: 2 người), chọn đội / ô, chủ phòng chọn bản đồ,
//    bật / tắt máy điền chỗ trống, độ khó máy; mọi người Sẵn sàng → chủ phòng bắt đầu → chọn tướng → trận.
//  • Trận ghép (kind 'match'): người chơi vào hàng chờ Đấu thường / Đấu hạng / Đỉnh cao (5v5). Đủ 10 người thì ghép ngay; người vào hàng
//    sớm nhất đã chờ NET.queueWait giây (60) thì ghép luôn những ai đang chờ, máy điền chỗ trống. Người thật chia xen kẽ hai đội, vị trí theo
//    vị trí chính / phụ. Ghép xong: Chấp nhận (12 giây — ai không bấm thì bị loại, máy thay) → chọn tướng (30 giây) → trận.
// Trong trận máy chủ là "nhạc trưởng": giữ đồng hồ 30 tick/giây, gom lệnh người chơi vào tick kế tiếp, phát gói khung (NET.pack tick/gói)
// cho mọi máy, và tự chạy cùng mô phỏng để biết trận kết thúc + dò lệch đồng bộ (so mã băm máy khách gửi lên). Người chơi rớt mạng: tướng
// đứng yên, sau NET.botAfter giây máy tạm điều khiển; vào lại (cùng mã + token) thì nhận tiếp các khung còn thiếu và lấy lại quyền điều khiển.
import { randomBytes, randomInt } from 'node:crypto';
import { createWorld } from '../src/sim/world.js';
import { NET, MODES_ONLINE, QUEUES, ROLES5, sanitizeCommand, sanitizeHero, sanitizeSpell, setupOnline, applyFrame, hashWorld, mapOf } from '../src/net/protocol.js';
import { DIFFICULTY } from '../src/data/ai.js';
import { ALPHA } from '../src/data/heroes/index.js';

const TICK_MS = 1000 / 30 / (+process.env.NET_SPEED || 1); // NET_SPEED: tua nhanh (chỉ dùng trong kiểm thử tools/t_online.mjs)
// kiểm thử: rút ngắn thời gian chờ ghép / chấp nhận / chọn tướng (giây)
const SEC = { queue: +process.env.QUEUE_WAIT || NET.queueWait, accept: +process.env.ACCEPT_SEC || NET.acceptSec, pick: +process.env.PICK_SEC || NET.pickSec, ready: +process.env.READY_SEC || NET.readySec };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();
const pools = Object.fromEntries(Object.keys(QUEUES).map((q) => [q, []])); // hàng chờ: [{ ws, sess, info, at }]
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const PRE = new Set(['lobby', 'accept', 'pick', 'ready']); // chưa vào trận: rời phòng = ra hẳn (máy thay chỗ)

const newCode = () => { for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[randomInt(CODE_CHARS.length)]; if (!rooms.has(c)) return c; } };
const cleanName = (n) => String(n || 'Người chơi').slice(0, 16);
const cleanAvatar = (a) => (typeof a === 'string' && /^[a-z_]{1,24}$/.test(a) ? a : null);
const cleanDiff = (d) => (DIFFICULTY[d] ? d : 'normal');
const cleanLo = (lo) => { try { return lo && typeof lo === 'object' && JSON.stringify(lo).length < 4000 ? JSON.parse(JSON.stringify({ charm: lo.charm, emblem: lo.emblem })) : null; } catch (_) { return null; } };

export const stats = () => ({ rooms: rooms.size, playing: [...rooms.values()].filter((r) => r.state === 'playing').length, players: [...rooms.values()].reduce((s, r) => s + r.players.filter((p) => p.online).length, 0),
  queue: Object.fromEntries(Object.entries(pools).map(([q, a]) => [q, a.length])) });

class Room {
  /** opts: { kind: 'custom' | 'match', q (custom | normal | ranked | peak), mode, difficulty, bots } */
  constructor({ kind = 'custom', q = 'custom', mode, difficulty, bots = true }) {
    this.code = newCode(); this.kind = kind; this.q = q; this.difficulty = cleanDiff(difficulty); this.bots = bots !== false;
    this.setMode(MODES_ONLINE[mode] ? mode : '1v1');
    this.players = []; this.state = kind === 'custom' ? 'lobby' : 'accept'; this.deadline = 0;
    this.frames = [0]; this.pending = []; this.hashes = new Map(); this.tick = 0; this.timer = null; this.pre = null; this.created = Date.now();
    rooms.set(this.code, this);
  }
  setMode(mode) { this.mode = mode; this.size = mode === '5v5' ? 5 : 1; }
  view(p) {
    const vis = (q) => this.state !== 'lobby' && (q.team === p.team || this.state === 'loading' || this.state === 'playing'); // chọn ẩn: chỉ thấy tướng đồng đội
    return { t: 'room', code: this.code, kind: this.kind, q: this.q, mode: this.mode, size: this.size, bots: this.bots, difficulty: this.difficulty, state: this.state,
      left: this.deadline ? Math.max(0, this.deadline - Date.now()) : 0, you: this.players.indexOf(p),
      players: this.players.map((q, i) => ({ name: q.name, avatar: q.avatar, team: q.team, slot: q.slot, ready: q.ready, host: this.kind === 'custom' && i === 0, online: q.online,
        accepted: q.accepted, locked: q.locked, role: q.role, heroId: vis(q) ? q.heroId : null, spellId: vis(q) ? q.spellId : null })) };
  }
  broadcast(msg) { const s = JSON.stringify(msg); for (const p of this.players) if (p.online) p.ws.send(s); }
  sync() { for (const p of this.players) if (p.online) p.ws.send(this.view(p)); }
  freeSlot(team) { for (let s = 0; s < this.size; s++) if (!this.players.some((q) => q.team === team && q.slot === s)) return s; return -1; }
  count(team) { return this.players.filter((q) => q.team === team).length; }
  /** Thêm người: đội chỉ định (ghép trận) hoặc đội ít người hơn. Hết chỗ → null. */
  add(ws, info, team = null) {
    if (team === null) team = this.count(1) < this.count(0) ? 1 : 0;
    if (this.freeSlot(team) < 0) team = 1 - team;
    const slot = this.freeSlot(team); if (slot < 0) return null;
    const p = { ws, token: randomBytes(9).toString('base64url'), name: cleanName(info.name), avatar: cleanAvatar(info.avatar), team, slot, ready: false, online: true,
      pri: ROLES5.includes(info.pri) ? info.pri : null, sec: ROLES5.includes(info.sec) ? info.sec : null, role: null,
      accepted: false, locked: false, heroId: null, hover: null, spellId: null, lo: null, eid: 0, botOn: false, offAt: 0, rate: { t: 0, n: 0 } };
    this.players.push(p); return p;
  }
  remove(p) {
    this.players = this.players.filter((q) => q !== p);
    if (!this.players.length) return this.destroy();
    if (this.state === 'pick' || this.state === 'ready') this.checkLocked();
    if (this.state === 'accept') this.checkAccepted();
    this.sync();
  }
  destroy() { clearInterval(this.timer); clearInterval(this.pre); this.timer = this.pre = null; rooms.delete(this.code); }

  // —— phòng tuỳ chỉnh ——
  seat(p, team, slot) {
    if (this.state !== 'lobby' || (team !== 0 && team !== 1) || !(slot >= 0 && slot < this.size)) return;
    if (this.players.some((q) => q !== p && q.team === team && q.slot === slot)) return;
    p.team = team; p.slot = slot; p.ready = false; this.sync();
  }
  opts(p, m) {
    if (this.state !== 'lobby' || this.players[0] !== p) return 'Chỉ chủ phòng đổi được';
    if (MODES_ONLINE[m.mode] && m.mode !== this.mode) {
      if (m.mode === '1v1' && this.players.length > 2) return 'Phòng quá 2 người — không đổi sang 1v1 được';
      this.setMode(m.mode);
      const seated = [[], []]; // xếp lại chỗ: giữ đội nếu còn chỗ
      for (const q of this.players) { const t = seated[q.team].length < this.size ? q.team : 1 - q.team; q.team = t; q.slot = seated[t].length; seated[t].push(q); }
    }
    if (DIFFICULTY[m.difficulty]) this.difficulty = m.difficulty;
    if (typeof m.bots === 'boolean') this.bots = m.bots;
    for (const q of this.players) q.ready = false;
    this.sync(); return null;
  }
  startCustom(p) {
    if (this.state !== 'lobby') return null;
    if (this.players[0] !== p) return 'Chỉ chủ phòng bắt đầu được';
    if (this.players.some((q, i) => i > 0 && !q.ready)) return 'Còn người chưa sẵn sàng';
    if (!this.bots && (!this.count(0) || !this.count(1))) return 'Tắt máy thì mỗi đội cần ít nhất 1 người';
    log(`phòng ${this.code}: chủ phòng bắt đầu (${this.mode}, ${this.players.length} người, máy ${this.bots ? 'bật' : 'tắt'})`);
    this.beginPick(); return null;
  }

  // —— trận ghép: chấp nhận ——
  beginAccept() {
    this.state = 'accept'; this.deadline = Date.now() + SEC.accept * 1000;
    this.pre = setInterval(() => this.preStep(), 200);
    for (const p of this.players) p.ws.send({ t: 'match', q: this.q, code: this.code, humans: this.players.length });
    this.sync();
  }
  accept(p) { if (this.state !== 'accept' || p.accepted) return; p.accepted = true; this.sync(); this.checkAccepted(); }
  checkAccepted() { if (this.state === 'accept' && this.players.length && this.players.every((q) => q.accepted)) this.beginPick(); }
  /** Vị trí mỗi đội theo vị trí chính → phụ → còn trống (5v5). */
  assignRoles() {
    if (this.mode !== '5v5') return;
    for (const t of [0, 1]) {
      const used = new Set();
      for (const p of this.players.filter((q) => q.team === t)) { p.role = [p.pri, p.sec].find((r) => r && !used.has(r)) || ROLES5.find((r) => !used.has(r)); used.add(p.role); }
    }
  }

  // —— chọn tướng ——
  beginPick() {
    this.state = 'pick'; this.deadline = Date.now() + SEC.pick * 1000;
    for (const p of this.players) { p.heroId = null; p.locked = false; p.hover = null; }
    if (!this.pre) this.pre = setInterval(() => this.preStep(), 200);
    this.sync();
  }
  takenBy(team, except) { return this.players.filter((q) => q !== except && q.team === team && q.locked).map((q) => q.heroId); }
  lock(p, m) {
    if (this.state !== 'pick' || p.locked) return null;
    const id = sanitizeHero(m.heroId);
    if (this.takenBy(p.team, p).includes(id)) return 'Đồng đội đã chọn tướng này';
    p.heroId = id; p.locked = true; p.spellId = sanitizeSpell(m.spellId, this.mode); p.lo = cleanLo(m.lo);
    this.checkLocked(); this.sync(); return null;
  }
  checkLocked() { if (this.state === 'pick' && this.players.length && this.players.every((q) => q.locked)) { this.state = 'ready'; this.deadline = Date.now() + SEC.ready * 1000; } }
  /** Hết giờ chọn: khoá giúp tướng đang xem (nếu còn trống) hoặc một tướng ngẫu nhiên đồng đội chưa chọn. */
  autoLock() {
    for (const p of this.players) if (!p.locked) {
      const tk = this.takenBy(p.team, p), free = ALPHA.filter((h) => !tk.includes(h));
      p.heroId = p.hover && free.includes(p.hover) ? p.hover : free[randomInt(free.length)] || ALPHA[0]; p.locked = true;
    }
  }
  preStep() {
    const now = Date.now();
    if (this.state === 'accept' && now > this.deadline + 800) {
      for (const p of this.players.filter((q) => !q.accepted)) { p.ws.send({ t: 'kicked', m: 'Bạn đã bỏ lỡ trận đấu' }); p.sess && (p.sess.room = p.sess.p = null); }
      this.players = this.players.filter((q) => q.accepted);
      if (!this.players.length) return this.destroy();
      this.beginPick();
    } else if (this.state === 'pick' && now > this.deadline + 1500) { this.autoLock(); this.checkLocked(); this.sync(); }
    else if (this.state === 'ready' && now >= this.deadline) { clearInterval(this.pre); this.pre = null; this.start(); }
  }

  // —— trong trận ——
  start() {
    this.state = 'loading'; this.deadline = 0;
    const cfg = { v: NET.version, q: this.q, mode: this.mode, difficulty: this.difficulty, bots: this.bots, seed: randomInt(1, 2 ** 31 - 1),
      players: this.players.map((p) => ({ team: p.team, heroId: p.heroId, name: p.name, role: p.role, spellId: p.spellId, lo: p.lo })) };
    this.cfg = cfg; this.world = createWorld({ map: mapOf(cfg.mode), seed: cfg.seed });
    const { humans } = setupOnline(this.world, cfg);
    this.players.forEach((p, i) => { p.eid = humans[i].id; p.loaded = false; if (p.online) p.ws.send({ t: 'start', cfg, me: i, token: p.token, code: this.code }); });
    this.loadUntil = Date.now() + NET.loadTimeout * 1000;
    this.timer = setInterval(() => this.step(), 5);
    log(`phòng ${this.code}: bắt đầu ${this.q} ${cfg.mode} seed ${cfg.seed} —`, cfg.players.map((p) => `${p.name}/${p.heroId}/đội ${p.team}`).join(', '));
  }
  step() {
    const now = Date.now();
    if (this.state === 'loading') {
      if (this.players.every((p) => p.loaded || !p.online) || now > this.loadUntil) { this.state = 'playing'; this.t0 = now; this.broadcast({ t: 'go' }); this.sync(); log(`phòng ${this.code}: vào trận`); }
      return;
    }
    if (this.state !== 'playing') return;
    for (const p of this.players) if (!p.online && !p.botOn && now - p.offAt > NET.botAfter * 1000) { p.botOn = true; this.pending.push([p.eid, { type: 'bot', on: true }]); }
    const due = Math.min(Math.floor((now - this.t0) / TICK_MS), this.tick + 30); // máy chủ khựng: bù tối đa 1 giây mỗi lượt
    while (this.tick < due && this.state === 'playing') {
      const t = ++this.tick, cmds = this.pending.length ? this.pending : 0; this.pending = [];
      this.frames[t] = cmds;
      applyFrame(this.world, t, cmds || null); this.world.events.length = 0;
      if (t % NET.hashEvery === 0) { this.hashes.set(t, hashWorld(this.world)); this.hashes.delete(t - NET.hashEvery * 30); }
      if (this.world.over) this.finish();
      else if (t % NET.pack === 0) this.broadcast({ t: 'f', k: t, c: this.frames.slice(t - NET.pack + 1, t + 1) });
    }
  }
  finish() {
    const t = this.tick, from = t - (t % NET.pack || NET.pack) + 1;
    this.broadcast({ t: 'f', k: t, c: this.frames.slice(from, t + 1) }); // gói cuối (có thể thiếu) để mọi máy chạy tới đúng tick kết thúc
    this.state = 'over'; clearInterval(this.timer); this.timer = null;
    log(`phòng ${this.code}: hết trận ở tick ${t}, đội ${this.world.over.winner} thắng`);
    setTimeout(() => this.destroy(), 120000);
  }
  command(p, cmd) {
    if (this.state !== 'playing' && this.state !== 'loading') return; // lúc tải: lệnh đầu trận (vd. cài đặt chọn mục tiêu) áp ở tick 1
    const now = Date.now(); if (now - p.rate.t > 1000) { p.rate.t = now; p.rate.n = 0; } if (++p.rate.n > 60) return; // chống gửi dồn
    const c = sanitizeCommand(cmd); if (!c) return;
    if (p.botOn) return; // máy đang điều khiển (chưa nhận lại)
    this.pending.push([p.eid, c]);
  }
  hash(p, k, h) {
    const mine = this.hashes.get(k); if (!mine || mine === h) return;
    if (!p.desynced) log(`phòng ${this.code}: LỆCH ĐỒNG BỘ — ${p.name} ở tick ${k} (${h} ≠ ${mine})`);
    p.desynced = true; p.ws.send({ t: 'desync', k });
  }
  drop(p) {
    if (PRE.has(this.state)) return this.remove(p); // chưa vào trận: ra khỏi phòng (máy thay chỗ)
    p.online = false; p.offAt = Date.now();
    if (this.state === 'playing') { this.pending.push([p.eid, { type: 'move', dir: { x: 0, y: 0 } }], [p.eid, { type: 'attack', on: false }]); this.broadcast({ t: 'note', m: `${p.name} mất kết nối` }); }
    // mọi người đều rớt: chờ 60 giây (tải lại trang / đổi mạng vẫn vào lại được) rồi mới đóng phòng
    if (this.players.every((q) => !q.online)) setTimeout(() => { if (rooms.get(this.code) === this && this.players.every((q) => !q.online)) { log(`phòng ${this.code}: mọi người đã rời — đóng`); this.destroy(); } }, 60000);
  }
  /** Vào lại trận: have = tick cuối máy khách đã nhận (-1: tải lại trang, cần cả cấu hình trận). */
  rejoin(p, ws, have) {
    const old = p.ws; p.ws = ws; p.online = true; if (old !== ws) old.close?.();
    if (have < 0) ws.send({ t: 'start', cfg: this.cfg, me: this.players.indexOf(p), token: p.token, code: this.code, resume: true });
    if (this.state === 'loading') return;
    if (have < 0) ws.send({ t: 'go' });
    const from = Math.max(1, have + 1);
    if (this.tick >= from) ws.send({ t: 'f', k: this.tick, c: this.frames.slice(from, this.tick + 1) });
    if (p.botOn) { p.botOn = false; this.pending.push([p.eid, { type: 'bot', on: false }]); }
    if (this.state === 'playing') this.broadcast({ t: 'note', m: `${p.name} đã vào lại` });
  }
}

// —— hàng chờ ghép trận ——
function unqueue(sess) {
  if (!sess.queued) return;
  const a = pools[sess.queued], i = a.findIndex((x) => x.sess === sess); if (i >= 0) a.splice(i, 1);
  sess.queued = null;
}
function form(q, entries) {
  const first = entries[0].info, r = new Room({ kind: 'match', q, mode: QUEUES[q].mode, difficulty: first.diff, bots: true });
  entries.forEach((en, i) => { const p = r.add(en.ws, en.info, i % 2); p.sess = en.sess; en.sess.room = r; en.sess.p = p; en.sess.queued = null; }); // người thật chia xen kẽ hai đội
  r.assignRoles(); r.beginAccept();
  log(`ghép ${q}: phòng ${r.code} — ${entries.length} người thật, ${10 - entries.length} máy (chờ lâu nhất ${Math.round((Date.now() - entries[0].at) / 1000)} giây)`);
}
function matchmake() {
  const now = Date.now();
  for (const [q, pool] of Object.entries(pools)) {
    for (let i = pool.length - 1; i >= 0; i--) if (!pool[i].ws.open) { pool[i].sess.queued = null; pool.splice(i, 1); }
    const need = QUEUES[q].mode === '5v5' ? 10 : 2;
    while (pool.length >= need) form(q, pool.splice(0, need));
    if (pool.length && now - pool[0].at >= SEC.queue * 1000) form(q, pool.splice(0, pool.length));
    for (const en of pool) en.ws.send({ t: 'queue', q, n: pool.length, need, waited: Math.round((now - en.at) / 1000), max: SEC.queue });
  }
}
setInterval(matchmake, 1000).unref?.();

/** Gắn một kết nối WebSocket vào hệ thống phòng. */
export function handle(ws) {
  const sess = { room: null, p: null, queued: null };
  const err = (m) => { if (m) ws.send({ t: 'err', m }); };
  const leave = () => {
    unqueue(sess);
    const { room, p } = sess; if (!room || !p) return;
    sess.room = sess.p = null;
    if (p.ws === ws) room.drop(p);
  };
  ws.on('message', (m) => {
    if (!m || typeof m.t !== 'string') return;
    const { room, p } = sess;
    switch (m.t) {
      case 'p': ws.send({ t: 'P', c: m.c }); return; // đo độ trễ
      case 'c': room?.command(p, m.c); return;
      case 'h': room?.hash(p, m.k | 0, String(m.h)); return;
      case 'create': {
        if (room || sess.queued) return err('Bạn đang ở trong phòng / hàng chờ');
        const r = new Room({ kind: 'custom', mode: m.mode, difficulty: m.difficulty, bots: m.bots });
        sess.room = r; sess.p = r.add(ws, m, 0); sess.p.sess = sess; r.sync();
        log(`phòng ${r.code}: tạo (${r.mode}, máy ${r.bots ? 'bật' : 'tắt'}) bởi ${sess.p.name}`); return;
      }
      case 'join': {
        if (room || sess.queued) return err('Bạn đang ở trong phòng / hàng chờ');
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r || r.kind !== 'custom') return err('Không thấy phòng này');
        if (r.state !== 'lobby') return err('Phòng đã vào trận');
        const q = r.add(ws, m); if (!q) return err('Phòng đã đủ người');
        q.sess = sess; sess.room = r; sess.p = q; r.sync(); return;
      }
      case 'rejoin': {
        const r = rooms.get(String(m.code || '').toUpperCase()), q = r?.players.find((x) => x.token === m.token);
        if (!r || !q || PRE.has(r.state) || r.state === 'over') return ws.send({ t: 'rejoinFail' });
        sess.room = r; sess.p = q; q.sess = sess; r.rejoin(q, ws, Number.isInteger(m.have) ? m.have : -1); return;
      }
      case 'queue': {
        if (room || sess.queued) return err('Bạn đang ở trong phòng / hàng chờ');
        if (!QUEUES[m.q]) return err('Chế độ không hợp lệ');
        const info = { name: m.name, avatar: m.avatar, diff: cleanDiff(m.diff), pri: m.pri, sec: m.sec };
        sess.queued = m.q; pools[m.q].push({ ws, sess, info, at: Date.now() });
        ws.send({ t: 'queue', q: m.q, n: pools[m.q].length, need: 10, waited: 0, max: SEC.queue }); return;
      }
      case 'unqueue': unqueue(sess); return;
      case 'accept': room?.accept(p); return;
      case 'seat': room?.seat(p, m.team, m.slot); return;
      case 'hover': if (room?.state === 'pick' && !p.locked && ALPHA.includes(m.heroId)) p.hover = m.heroId; return;
      case 'lock': if (room) err(room.lock(p, m)); return;
      case 'ready': if (room?.state === 'lobby') { p.ready = !!m.on; room.sync(); } return;
      case 'opts': if (room) err(room.opts(p, m)); return;
      case 'start': if (room) err(room.startCustom(p)); return;
      case 'loaded': if (p) p.loaded = true; return;
      case 'leave': leave(); return;
      default:
    }
  });
  ws.on('close', leave);
}
