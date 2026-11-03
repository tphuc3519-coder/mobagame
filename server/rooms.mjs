// Phòng chơi online: tạo / vào bằng mã 4 ký tự, chọn tướng, sẵn sàng, chủ phòng bắt đầu. Trong trận máy chủ là "nhạc trưởng": giữ đồng hồ
// 30 tick/giây, gom lệnh người chơi vào tick kế tiếp, phát gói khung (NET.pack tick/gói) cho mọi máy, và tự chạy cùng mô phỏng để biết trận
// kết thúc + dò lệch đồng bộ (so mã băm máy khách gửi lên). Người chơi rớt mạng: tướng đứng yên, sau NET.botAfter giây máy tạm điều khiển;
// vào lại (cùng mã + token) thì nhận tiếp các khung còn thiếu và lấy lại quyền điều khiển.
import { randomBytes, randomInt } from 'node:crypto';
import { createWorld } from '../src/sim/world.js';
import { NET, MODES_ONLINE, sanitizeCommand, sanitizeHero, setupOnline, applyFrame, hashWorld, mapOf } from '../src/net/protocol.js';
import { DIFFICULTY } from '../src/data/ai.js';

const TICK_MS = 1000 / 30 / (+process.env.NET_SPEED || 1); // NET_SPEED: tua nhanh (chỉ dùng trong kiểm thử tools/t_online.mjs)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const newCode = () => { for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[randomInt(CODE_CHARS.length)]; if (!rooms.has(c)) return c; } };

export const stats = () => ({ rooms: rooms.size, playing: [...rooms.values()].filter((r) => r.state === 'playing').length, players: [...rooms.values()].reduce((s, r) => s + r.players.filter((p) => p.online).length, 0) });

class Room {
  constructor(mode, difficulty) {
    this.code = newCode(); this.mode = MODES_ONLINE[mode] ? mode : '1v1'; this.difficulty = DIFFICULTY[difficulty] ? difficulty : 'normal';
    this.players = []; this.state = 'lobby'; this.frames = [0]; this.pending = []; this.hashes = new Map(); this.tick = 0; this.timer = null; this.created = Date.now();
    rooms.set(this.code, this);
  }
  view(p) {
    return { t: 'room', code: this.code, mode: this.mode, difficulty: this.difficulty, state: this.state, you: this.players.indexOf(p),
      players: this.players.map((q, i) => ({ name: q.name, heroId: q.heroId, team: q.team, ready: q.ready, host: i === 0, online: q.online })) };
  }
  broadcast(msg) { const s = JSON.stringify(msg); for (const p of this.players) if (p.online) p.ws.send(s); }
  sync() { for (const p of this.players) if (p.online) p.ws.send(this.view(p)); }
  add(ws, name, heroId) {
    const p = { ws, token: randomBytes(9).toString('base64url'), name: String(name || 'Người chơi').slice(0, 16), heroId: sanitizeHero(heroId), team: this.players.length ? 1 - this.players[0].team : 0, ready: false, online: true, eid: 0, botOn: false, offAt: 0, rate: { t: 0, n: 0 } };
    this.players.push(p); return p;
  }
  remove(p) {
    this.players = this.players.filter((q) => q !== p);
    if (!this.players.length) return this.destroy();
    this.players[0].team = 0; if (this.players[1]) this.players[1].team = 1; // người còn lại làm chủ phòng (đội xanh)
    this.sync();
  }
  destroy() { clearInterval(this.timer); this.timer = null; rooms.delete(this.code); }

  start() {
    this.state = 'loading';
    const cfg = { v: NET.version, mode: this.mode, difficulty: this.difficulty, seed: randomInt(1, 2 ** 31 - 1), players: this.players.map((p) => ({ team: p.team, heroId: p.heroId, name: p.name })) };
    this.cfg = cfg; this.world = createWorld({ map: mapOf(cfg.mode), seed: cfg.seed });
    const { humans } = setupOnline(this.world, cfg);
    this.players.forEach((p, i) => { p.eid = humans[i].id; p.loaded = false; p.ws.send({ t: 'start', cfg, me: i, token: p.token, code: this.code }); });
    this.loadUntil = Date.now() + NET.loadTimeout * 1000;
    this.timer = setInterval(() => this.step(), 5);
    log(`phòng ${this.code}: bắt đầu ${cfg.mode} seed ${cfg.seed} —`, cfg.players.map((p) => `${p.name}/${p.heroId}`).join(' vs '));
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
    if (this.state === 'lobby') return this.remove(p);
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

/** Gắn một kết nối WebSocket vào hệ thống phòng. */
export function handle(ws) {
  const sess = { room: null, p: null };
  const err = (m) => ws.send({ t: 'err', m });
  ws.on('message', (m) => {
    if (!m || typeof m.t !== 'string') return;
    const { room, p } = sess;
    switch (m.t) {
      case 'p': ws.send({ t: 'P', c: m.c }); return; // đo độ trễ
      case 'c': room?.command(p, m.c); return;
      case 'h': room?.hash(p, m.k | 0, String(m.h)); return;
      case 'create': {
        if (room) return err('Bạn đang ở trong phòng');
        const r = new Room(m.mode, m.difficulty); sess.room = r; sess.p = r.add(ws, m.name, m.heroId); r.sync();
        log(`phòng ${r.code}: tạo (${r.mode}) bởi ${sess.p.name}`); return;
      }
      case 'join': {
        if (room) return err('Bạn đang ở trong phòng');
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r) return err('Không thấy phòng này');
        if (r.state !== 'lobby') return err('Phòng đã vào trận');
        if (r.players.length >= 2) return err('Phòng đã đủ 2 người');
        sess.room = r; sess.p = r.add(ws, m.name, m.heroId); r.sync(); return;
      }
      case 'rejoin': {
        const r = rooms.get(String(m.code || '').toUpperCase()), q = r?.players.find((x) => x.token === m.token);
        if (!r || !q || r.state === 'lobby' || r.state === 'over') return ws.send({ t: 'rejoinFail' });
        sess.room = r; sess.p = q; r.rejoin(q, ws, Number.isInteger(m.have) ? m.have : -1); return;
      }
      case 'pick': if (room?.state === 'lobby') { p.heroId = sanitizeHero(m.heroId); p.ready = false; room.sync(); } return;
      case 'ready': if (room?.state === 'lobby') { p.ready = !!m.on; room.sync(); } return;
      case 'opts': if (room?.state === 'lobby' && room.players[0] === p) { if (MODES_ONLINE[m.mode]) room.mode = m.mode; if (DIFFICULTY[m.difficulty]) room.difficulty = m.difficulty; for (const q of room.players) q.ready = false; room.sync(); } return;
      case 'start': {
        if (!room || room.state !== 'lobby') return;
        if (room.players[0] !== p) return err('Chỉ chủ phòng bắt đầu được');
        if (room.players.some((q, i) => i > 0 && !q.ready)) return err('Đối thủ chưa sẵn sàng');
        room.start(); return;
      }
      case 'loaded': if (p) p.loaded = true; return;
      case 'leave': if (room) { room.state === 'lobby' ? room.remove(p) : room.drop(p); sess.room = sess.p = null; } return;
      default:
    }
  });
  ws.on('close', () => { const { room, p } = sess; if (room && p && p.ws === ws) room.drop(p); });
}
