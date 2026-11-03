// Kiểm thử chơi online (không cần trình duyệt): bật máy chủ thật (server/index.mjs, tua nhanh NET_SPEED), các "máy khách" Node dùng đúng
// src/net/session.js vào chung một phòng tuỳ chỉnh (hoặc hàng chờ ghép trận: chờ → ghép, máy điền chỗ → chấp nhận → chọn tướng), bấm lệnh ngẫu nhiên (đi, đánh, chiêu, nâng kỹ năng, mua đồ), một máy rớt mạng giữa trận rồi tự
// nối lại. Đạt khi: hai máy + máy chủ cùng mã băm ở mọi mốc (không lệch đồng bộ), nối lại bù đủ khung, và mô phỏng không gọi Math.sin /
// cos / atan2 / acos / hypot … (khác nhau giữa trình duyệt) — phải dùng core/dmath.js.
// Dùng: node tools/t_online.mjs
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../src/sim/world.js';
import { setupOnline, hashWorld, mapOf, applyFrame } from '../src/net/protocol.js';
import { connect } from '../src/net/client.js';
import { createSession } from '../src/net/session.js';
import { mulberry32 } from '../src/core/rng.js';
import { D } from '../src/core/dmath.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

// 1) mô phỏng không dùng hàm lượng giác của trình duyệt
const bad = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/\bMath\.(sin|cos|tan|asin|acos|atan|atan2|hypot|exp|expm1|log|log2|log10|log1p|pow|cbrt|sinh|cosh|tanh)\(/.test(l) && !l.trim().startsWith('//')) bad.push(`${path.relative(ROOT, p)}:${i + 1}`); }); } };
for (const d of ['src/sim', 'src/ai', 'src/data', 'src/net']) walk(path.join(ROOT, d));
ok(!bad.length, `mô phỏng chỉ dùng lượng giác tất định (core/dmath.js)${bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''}`);
{ const imp = readdirSync(path.join(ROOT, 'src/net')).flatMap((f) => [...readFileSync(path.join(ROOT, 'src/net', f), 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]));
  ok(!imp.some((m) => /three|render\/|hud\/|ui\//.test(m)), 'src/net không import three / render / hud / ui (chạy được trong máy chủ Node)'); }
{ let m = 0; for (let i = 0; i < 20000; i++) { const x = (i - 10000) * 0.0137; m = Math.max(m, Math.abs(D.sin(x) - Math.sin(x)), Math.abs(D.cos(x) - Math.cos(x)), Math.abs(D.atan2(x, 1.3 - x * 0.2) - Math.atan2(x, 1.3 - x * 0.2))); } ok(m < 1e-13, `dmath sai số ${m.toExponential(1)} < 1e-13`); }

// 2) máy chủ thật + hai máy khách
const PORT = 20000 + Math.floor(Math.random() * 20000);
const srv = spawn(process.execPath, [path.join(ROOT, 'server/index.mjs')], { env: { ...process.env, PORT: String(PORT), STATIC: '0', NET_SPEED: '8', HOST: '127.0.0.1', QUEUE_WAIT: '2', READY_SEC: '0.3', ACCEPT_SEC: '3' }, stdio: ['ignore', 'pipe', 'pipe'] });
let srvLog = ''; srv.stdout.on('data', (d) => { srvLog += d; }); srv.stderr.on('data', (d) => { srvLog += d; });
await new Promise((r) => { const t = setInterval(() => { if (srvLog.includes('Máy chủ online')) { clearInterval(t); r(); } }, 50); });
const URL = `ws://127.0.0.1:${PORT}/ws`;
const wait = (conn, type, pred = () => true) => new Promise((r, j) => { const off = conn.on(type, (m) => { if (pred(m)) { off(); r(m); } }); setTimeout(() => j(new Error('chờ ' + type)), 8000); });

/** Pha chọn tướng: mọi máy khoá tướng của mình → chờ 'start'. */
async function pickAll(conns, heroes) {
  const starts = conns.map((c) => wait(c, 'start'));
  await Promise.all(conns.map((c) => wait(c, 'room', (m) => m.state === 'pick')));
  conns.forEach((c, i) => c.send({ t: 'lock', heroId: heroes[i] }));
  return Promise.all(starts);
}
async function run(mode, heroes, ticks, dropAt, { queue = null, bots = true } = {}) {
  console.log(`— ${queue ? 'ghép ' + queue : 'phòng tuỳ chỉnh'} ${mode}${bots ? '' : ' (tắt máy)'}: ${heroes.join(' vs ')}, ${ticks} tick`);
  const conns = []; for (let i = 0; i < heroes.length; i++) conns.push(await connect(URL));
  const [A, B] = conns;
  const errs = []; for (const c of conns) c.on('err', (m) => errs.push(m.m));
  let st;
  if (queue) {
    const t0 = Date.now(), matched = conns.map((c) => wait(c, 'match')), rmP = wait(A, 'room', (m) => m.state === 'accept');
    for (const [i, c] of conns.entries()) { const ack = wait(c, 'queue'); c.send({ t: 'queue', q: queue, name: 'Người ' + i, pri: ['mid', 'mid', 'jungle'][i % 3], sec: 'support' }); await ack; } // lần lượt: thứ tự vào hàng = thứ tự máy
    const ms = await Promise.all(matched);
    ok(ms.every((m) => m.code === ms[0].code && m.humans === heroes.length), `ghép ${heroes.length} người thật vào phòng ${ms[0].code} sau ${((Date.now() - t0) / 1000).toFixed(1)} giây (hết giờ chờ → máy điền chỗ)`);
    const rm = await rmP;
    ok(rm.players.length === heroes.length && rm.players.filter((p) => p.team === 0).length === Math.ceil(heroes.length / 2), 'người thật chia xen kẽ hai đội');
    ok(rm.players[0].role === 'mid' && rm.players[2]?.role === 'jungle', `vị trí theo vị trí chính (${rm.players.map((p) => p.role).join(', ')})`);
    conns.forEach((c) => c.send({ t: 'accept' }));
    st = await pickAll(conns, heroes);
  } else {
    A.send({ t: 'create', mode, bots, name: 'An' });
    const ra = await wait(A, 'room'); ok(/^[A-Z2-9]{4}$/.test(ra.code), `tạo phòng ${ra.code}`);
    for (let i = 1; i < conns.length; i++) { conns[i].send({ t: 'join', code: ra.code.toLowerCase(), name: 'Bình' + i }); await wait(conns[i], 'room', (m) => m.players.length === i + 1); }
    A.send({ t: 'start' }); await new Promise((r) => setTimeout(r, 100)); ok(errs.includes('Còn người chưa sẵn sàng'), 'chưa sẵn sàng thì không bắt đầu được');
    for (let i = 1; i < conns.length; i++) conns[i].send({ t: 'ready', on: true });
    await wait(A, 'room', (m) => m.players.slice(1).every((p) => p.ready));
    A.send({ t: 'start' });
    st = await pickAll(conns, heroes);
  }
  const clients = [];
  for (const [conn, st1] of conns.map((c, i) => [c, st[i]])) {
    const st = st1;
    const world = createWorld({ map: mapOf(st.cfg.mode), seed: st.cfg.seed });
    const { humans } = setupOnline(world, st.cfg); const me = humans[st.me];
    const notes = []; const s = createSession({ conn, cfg: st.cfg, me: st.me, code: st.code, token: st.token, notify: (t) => notes.push(t) });
    s.attach(world, me); s.loaded();
    clients.push({ world, me, s, notes, hashes: new Map(), rng: mulberry32(st.me + 7).next, dropped: false });
  }
  ok(clients[0].me.team === 0 && clients[1].me.team === 1, 'người thứ nhất đội 0, người thứ hai đội 1');
  ok(clients.every((c, i) => c.me.heroId === heroes[i]), 'đúng tướng đã khoá');
  const t0 = Date.now();
  while (clients.some((c) => c.world.tick < ticks && !c.world.over) && Date.now() - t0 < 60000) {
    for (const c of clients) {
      const before = c.world.tick; c.s.step(c.world); c.world.events.length = 0;
      if (c.world.tick !== before && c.world.tick % 150 === 0) c.hashes.set(c.world.tick, hashWorld(c.world));
      if (c.world.tick > before) { // bấm lệnh như người chơi (qua world.command đã bọc → lên máy chủ)
        const r = c.rng(), w = c.world, id = c.me.id;
        if (r < 0.08) w.command(id, { type: 'move', dir: { x: c.rng() * 2 - 1, y: c.rng() * 2 - 1 } });
        else if (r < 0.1) w.command(id, { type: 'attack', on: c.rng() < 0.7 });
        else if (r < 0.115) w.command(id, { type: 'cast', slot: ['s1', 's2', 's3'][Math.floor(c.rng() * 3)], aim: { x: c.rng() * 2 - 1, y: c.rng() * 2 - 1 } });
        else if (r < 0.12) w.command(id, { type: 'levelSkill', slot: ['s1', 's2', 's3'][Math.floor(c.rng() * 3)] });
        else if (r < 0.122) w.command(id, { type: 'buy', item: 'kiem_sat' });
        else if (r < 0.123) w.command(id, { type: 'nonsense', x: 1 }); // máy chủ phải bỏ qua
      }
      if (dropAt && c === clients[1] && !c.dropped && c.world.tick >= dropAt) { c.dropped = true; c.s.conn.drop(); }
    }
    await new Promise((r) => setTimeout(r, 2));
  }
  const [a, b] = clients;
  for (const c of clients.slice(2)) { let s2 = 0, d2 = 0; for (const [k, h] of a.hashes) if (c.hashes.has(k)) (h === c.hashes.get(k) ? s2++ : d2++); ok(s2 > 0 && d2 === 0, `máy thứ ${clients.indexOf(c) + 1}: mã băm trùng ${s2} mốc, lệch ${d2}`); }
  ok(a.world.tick >= ticks && b.world.tick >= ticks || a.world.over, `cả hai máy chạy tới tick ${Math.min(a.world.tick, b.world.tick)} (${((Date.now() - t0) / 1000).toFixed(1)} giây thật)`);
  let same = 0, diff = 0; for (const [k, h] of a.hashes) if (b.hashes.has(k)) (h === b.hashes.get(k) ? same++ : diff++);
  ok(same > 0 && diff === 0, `mã băm hai máy trùng ở ${same} mốc, lệch ${diff}`);
  ok(!clients.some((c) => c.s.stats().desync), 'máy chủ không báo lệch đồng bộ');
  if (dropAt) ok(b.s.stats().drops === 1 && b.notes.includes('Đã nối lại'), `máy B rớt mạng ở tick ${dropAt} rồi tự nối lại (${b.notes.join(' / ')})`);
  const nh = a.world.entities.filter((e) => e.kind === 'hero').length, want = !bots ? heroes.length : mode === '5v5' ? 10 : 2;
  ok(a.me.skillPoints !== undefined && nh === want, `đủ tướng: ${nh} (${heroes.length} người${bots ? `, ${want - heroes.length} máy` : ', không máy'})`);
  for (const c of clients) c.s.dispose();
}

try {
  await run('1v1', ['hoa_ren', 'nguyet_ha'], 2400, 900);
  await run('5v5', ['thach_quy', 'hanh_hoa'], 900, 0);
  await run('5v5', ['bong_tre', 'hoa_ren'], 600, 0, { bots: false });
  await run('5v5', ['hoa_ren', 'nguyet_ha', 'thach_quy'], 600, 0, { queue: 'normal' });
  // vào phòng sai mã / phòng đầy
  const C = await connect(URL); C.send({ t: 'join', code: 'ZZZZ', heroId: 'hoa_ren' }); const e = await wait(C, 'err'); ok(/Không thấy phòng/.test(e.m), 'mã phòng sai bị từ chối');
  // bỏ lỡ "Chấp nhận" → bị loại, người còn lại vẫn vào chọn tướng
  const D2 = await connect(URL); C.send({ t: 'queue', q: 'ranked', name: 'C' }); D2.send({ t: 'queue', q: 'ranked', name: 'D' });
  const kicked = wait(D2, 'kicked', () => true), picked = wait(C, 'room', (m) => m.state === 'pick');
  await wait(C, 'match'); C.send({ t: 'accept' });
  const [kk, pk] = await Promise.all([kicked.then(() => true, () => false), picked.then((m) => m, () => null)]);
  ok(kk && pk?.players.length === 1, 'không bấm Chấp nhận → bị loại, người đã chấp nhận vào chọn tướng (máy thay chỗ)');
  C.close(); D2.close();
} catch (e) { console.error(e); fail++; }
// 3) rớt mạng lâu: máy chủ chèn lệnh { bot on } → máy tạm điều khiển tướng người chơi, vào lại { bot off } (1v1 và 5v5)
for (const mode of ['1v1', '5v5']) {
  const cfg = { mode, seed: 77, difficulty: 'normal', players: [{ team: 0, heroId: 'bong_tre', name: 'A' }, { team: 1, heroId: 'hoa_ren', name: 'B' }] };
  const run2 = () => {
    const w = createWorld({ map: mapOf(mode), seed: cfg.seed }), { humans } = setupOnline(w, cfg), h = humans[1], x0 = h.pos.x;
    for (let t = 1; t <= 1500; t++) { applyFrame(w, t, t === 60 ? [[h.id, { type: 'bot', on: true }]] : t === 1200 ? [[h.id, { type: 'bot', on: false }]] : null); w.events.length = 0; }
    return { hash: hashWorld(w), moved: Math.abs(h.pos.x - x0) > 300, bot: !!h.bot };
  };
  const r1 = run2(), r2 = run2();
  ok(r1.moved && !r1.bot && r1.hash === r2.hash, `${mode}: máy tạm điều khiển tướng người rớt mạng (tướng tự đi đường), trả lại khi vào lại, tất định`);
}
const desyncLog = srvLog.split('\n').filter((l) => l.includes('LỆCH'));
ok(!desyncLog.length, 'nhật ký máy chủ không có dòng LỆCH ĐỒNG BỘ');
srv.kill();
console.log(fail ? `THẤT BẠI ${fail}` : 'ĐẠT');
process.exit(fail ? 1 : 0);
