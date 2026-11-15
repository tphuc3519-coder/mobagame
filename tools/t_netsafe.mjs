// An toàn của phần chơi online (không cần trình duyệt): máy khách là thứ KHÔNG tin được.
//  1. sanitizeCommand dựng lại lệnh theo đúng khuôn — lệnh sai kiểu / thừa trường / tên lạ bị bỏ.
//  2. Bắn hàng nghìn lệnh rác qua sanitizeCommand vào mô phỏng: không văng, không NaN (vàng, máu, vị trí).
//  3. Mô phỏng tự chống đỡ khi lệnh xấu lọt thẳng vào (trước đây: { sell, slot: 'length' } văng cả trận; { buy, item: '__proto__' } → vàng NaN, mua gì cũng được).
//  4. Đầu hàng trực tuyến: một người không đầu hàng thay cả đội (biểu quyết quá nửa), đấu hạng chỉ từ phút 8 — do mô phỏng giữ.
//  5. Máy chủ thật: yêu cầu HTTP sai dạng, tin WebSocket rác / gửi dồn, kết nối im lặng → máy chủ vẫn sống, trận vẫn chạy.
//  6. Lỗi trong mô phỏng của một phòng chỉ đóng phòng đó (người chơi nhận 'abort'), phòng khác chạy tiếp.
// Dùng: node tools/t_netsafe.mjs
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../src/sim/world.js';
import { sanitizeCommand, setupOnline, applyFrame, mapOf } from '../src/net/protocol.js';
import { ALPHA } from '../src/data/heroes/index.js';
import { ITEMS } from '../src/data/items.js';
import { SURRENDER } from '../src/data/signals.js';
import { mulberry32 } from '../src/core/rng.js';
import { connect } from '../src/net/client.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0; const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// —— 1. khuôn lệnh ——
const S = sanitizeCommand;
ok('lệnh không phải đối tượng / loại lạ / lệnh của máy chủ: bỏ', [null, 5, 'x', [1], {}, { type: 'bot', on: true }, { type: 'nonsense' }, { type: 'toString' }].every((c) => S(c) === null));
ok('bán / dùng đồ: ô phải là số nguyên 0–5', S({ type: 'sell', slot: 'length' }) === null && S({ type: 'sell', slot: 6 }) === null && S({ type: 'sell', slot: 1.5 }) === null && S({ type: 'useItem', slot: '__proto__' }) === null && J(S({ type: 'sell', slot: 5 })) === '{"type":"sell","slot":5}');
ok('mua: chỉ món có thật', S({ type: 'buy', item: '__proto__' }) === null && S({ type: 'buy', item: 'constructor' }) === null && S({ type: 'buy', item: 5 }) === null && J(S({ type: 'buy', item: 'kiem_sat', x: 1 })) === '{"type":"buy","item":"kiem_sat"}');
ok('chiêu / nâng kỹ năng: chỉ s1–s3', S({ type: 'cast', slot: 'constructor' }) === null && S({ type: 'levelSkill', slot: 's4' }) === null && J(S({ type: 'cast', slot: 's2' })) === '{"type":"cast","slot":"s2","aim":null}');
ok('ngắm: chỉ nhận số hữu hạn + id nguyên dương', J(S({ type: 'cast', slot: 's1', aim: { x: 'a', y: 1, id: -3 } }).aim) === 'null' && J(S({ type: 'cast', slot: 's1', aim: { x: 0.5, y: -2, id: 7, z: {} } }).aim) === '{"x":0.5,"y":-2,"id":7}' && J(S({ type: 'spell', aim: { x: 1e99, y: -1e99 } }).aim) === '{"x":100000,"y":-100000}');
ok('đi: hướng chuẩn hoá ≤ 1, số xấu thành 0', (() => { const a = S({ type: 'move', dir: { x: 1e300, y: 1e300 } }).dir, b = S({ type: 'move', dir: { x: NaN, y: 'q' } }).dir, c = S({ type: 'move' }).dir; return Math.abs(Math.hypot(a.x, a.y) - 1) < 1e-9 && b.x === 0 && b.y === 0 && c.x === 0 && c.y === 0; })());
ok('đánh / tín hiệu / chọn mục tiêu: trường sai bị thay bằng giá trị an toàn', J(S({ type: 'attack', mode: 'x', preferTarget: 2.5 })) === '{"type":"attack","on":true,"mode":null,"preferTarget":null}' && S({ type: 'ping', kind: 'toString', x: 1, y: 2 }) === null && S({ type: 'ping', kind: 'attack', x: 1, y: NaN }) === null && J(S({ type: 'targetBy', value: {} })) === '{"type":"targetBy","value":null}');

// —— 2. lệnh rác qua bộ lọc → mô phỏng ——
const rng = mulberry32(20261114).next, pick = (a) => a[Math.floor(rng() * a.length)];
const JUNK = [undefined, null, NaN, Infinity, -1, 0, 1, 2.5, 6, 1e308, '', 'length', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 's1', 's2', 's3', 'kiem_sat', 'attack', 'minion', {}, [], { x: 1, y: 2 }, { x: 'a', y: {} }, { id: 3 }, { id: 'x' }, true, false];
const TYPES = ['move', 'attack', 'cast', 'spell', 'restore', 'buy', 'sell', 'useItem', 'recall', 'levelSkill', 'ping', 'targetBy'];
const KEYS = ['dir', 'on', 'mode', 'preferTarget', 'slot', 'aim', 'item', 'kind', 'x', 'y', 'target', 'value'];
const junkCmd = () => { const c = { type: pick(TYPES) }; for (const k of KEYS) if (rng() < 0.6) c[k] = rng() < 0.5 ? pick(JUNK) : pick([rng() * 6000, pick(Object.keys(ITEMS)), Math.floor(rng() * 8)]); return c; };
const sane = (w) => w.entities.every((e) => Number.isFinite(e.pos.x) && Number.isFinite(e.pos.y) && Number.isFinite(e.hp) && (e.kind !== 'hero' || (Number.isFinite(e.gold) && Number.isFinite(e.mana) && e.items.length === 6 && e.items.every((i) => i === null || Object.hasOwn(ITEMS, i)))));
for (const mode of ['1v1', '5v5']) {
  const cfg = { mode, seed: 77, difficulty: 'normal', bots: true, players: [{ team: 0, heroId: ALPHA[0], name: 'A' }, { team: 1, heroId: ALPHA[5], name: 'B' }] };
  const w = createWorld({ map: mapOf(mode), seed: cfg.seed }), { humans } = setupOnline(w, cfg);
  let err = null, sent = 0;
  try {
    for (let t = 1; t <= 1500 && !w.over; t++) {
      const cmds = [];
      for (let i = 0; i < 4; i++) { const c = sanitizeCommand(junkCmd()); if (c) { cmds.push([pick(humans).id, c]); sent++; } }
      applyFrame(w, t, cmds); w.events.length = 0;
    }
  } catch (e) { err = e; }
  ok(`${mode}: ${sent} lệnh rác (đã lọc) trong 1500 tick — mô phỏng không văng, không NaN`, !err && sane(w), err ? String(err.stack).split('\n').slice(0, 3).join(' | ') : '');
}

// —— 3. lệnh xấu lọt thẳng vào mô phỏng ——
{
  const w = createWorld({ map: mapOf('1v1'), seed: 3 }), { humans: [h] } = setupOnline(w, { mode: '1v1', seed: 3, players: [{ team: 0, heroId: ALPHA[0], name: 'A' }] });
  w.update(1); const g0 = h.gold; let err = null;
  try {
    for (const c of [{ type: 'sell', slot: 'length' }, { type: 'sell', slot: '__proto__' }, { type: 'useItem', slot: 'length' }, { type: 'useItem', slot: 99 }, { type: 'buy', item: '__proto__' }, { type: 'buy', item: 'constructor' }, { type: 'buy', item: 'toString' }, { type: 'cast', slot: 'constructor' }, { type: 'levelSkill', slot: '__proto__' }]) w.command(h.id, c);
    w.update(2);
  } catch (e) { err = e; }
  ok('lệnh xấu vào thẳng mô phỏng: không văng', !err, err ? String(err.stack).split('\n').slice(0, 2).join(' | ') : '');
  ok('mua "__proto__" / "constructor": vàng vẫn là số, túi đồ không dính món lạ', Number.isFinite(h.gold) && Math.abs(h.gold - g0) < 1 && h.items.every((i) => i === null || Object.hasOwn(ITEMS, i)), `vàng ${g0} → ${h.gold}`);
}

// —— 4. đầu hàng trực tuyến ——
const team5 = (q, players) => { const cfg = { mode: '5v5', seed: 9, q, difficulty: 'normal', bots: true, players }; const w = createWorld({ map: mapOf('5v5'), seed: 9 }); return { w, hs: setupOnline(w, cfg).humans }; };
const P = (team, i) => ({ team, heroId: ALPHA[i], name: 'P' + i });
const vote = (w, t, ...ids) => { applyFrame(w, t, ids.map((id) => [id, { type: 'surrender' }])); return w.drainEvents().filter((e) => e.type === 'surrenderVote'); };
{
  const { w, hs } = team5('normal', [P(0, 0), P(0, 1), P(0, 2), P(1, 3)]);
  let ev = vote(w, 1, hs[0].id);
  ok('đội 3 người thật: 1 phiếu chưa đầu hàng, báo 1/2', !w.over && ev.length === 1 && ev[0].yes === 1 && ev[0].need === 2 && ev[0].team === 0, J(ev));
  ev = vote(w, 2, hs[0].id);
  ok('bỏ phiếu lần hai của cùng một người: không cộng', !w.over && ev[0]?.yes === 1);
  vote(w, 3, hs[1].id);
  ok('phiếu thứ hai (quá nửa): đội đầu hàng, đối thủ thắng', w.over?.winner === 1 && w.over.surrender === 0);
}
{
  const { w, hs } = team5('normal', [P(0, 0), P(0, 1), P(0, 2), P(1, 3)]);
  vote(w, 1, hs[3].id);
  ok('đội chỉ có một người thật: đầu hàng ngay', w.over?.winner === 0 && w.over.surrender === 1);
}
{
  const { w, hs } = team5('normal', [P(0, 0), P(0, 1), P(0, 2), P(1, 3)]);
  vote(w, 1, hs[0].id);
  let t = 2; for (; t <= 1 + SURRENDER.voteSec * 30 + 5; t++) { w.update(t); w.events.length = 0; }
  let ev = vote(w, t++, hs[1].id);
  ok(`biểu quyết hết ${SURRENDER.voteSec} giây không đủ phiếu: phiếu cũ mất, chưa mở lại được (chờ ${SURRENDER.retrySec} giây)`, !w.over && ev[0]?.fail === 'cooldown' && ev[0].wait > 0, J(ev));
  for (; t <= 1 + SURRENDER.retrySec * 30 + 5; t++) { w.update(t); w.events.length = 0; }
  ev = vote(w, t++, hs[1].id);
  ok('sau thời gian chờ: mở biểu quyết mới, đếm lại từ 1', !w.over && ev[0]?.yes === 1 && ev[0].need === 2, J(ev));
  // người rớt mạng đã giao cho máy không còn tính: 2 người thật còn lại cần cả 2 phiếu; 1 người còn lại thì đầu hàng ngay
  applyFrame(w, t++, [[hs[2].id, { type: 'bot', on: true }]]); w.events.length = 0;
  ev = vote(w, t++, hs[2].id);
  ok('tướng đang do máy điều khiển (người rớt mạng): không bỏ phiếu được', !w.over && !ev.length);
  applyFrame(w, t++, [[hs[0].id, { type: 'bot', on: true }]]); w.events.length = 0;
  ev = vote(w, t++, hs[1].id);
  ok('chỉ còn một người thật đang chơi: phiếu của họ là đủ', !!w.over && w.over.surrender === 0);
}
{
  const { w, hs } = team5('ranked', [P(0, 0), P(1, 3)]);
  let ev = vote(w, 1, hs[0].id);
  ok(`đấu hạng trước phút ${SURRENDER.rankedFrom / 60}: mô phỏng từ chối (không chỉ khoá nút)`, !w.over && ev[0]?.fail === 'early' && ev[0].wait === SURRENDER.rankedFrom, J(ev));
  w.tick = SURRENDER.rankedFrom * 30; ev = vote(w, SURRENDER.rankedFrom * 30 + 1, hs[0].id);
  ok('đấu hạng từ phút 8: đầu hàng được', w.over?.surrender === 0);
}

// —— 5. máy chủ thật ——
const PORT = 20000 + Math.floor(Math.random() * 20000);
const srv = spawn(process.execPath, [path.join(ROOT, 'server/index.mjs')], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', NET_SPEED: '4', READY_SEC: '0.2', IDLE_SEC: '3', MAX_MSGS: '200', MAX_PER_IP: '6' }, stdio: ['ignore', 'pipe', 'pipe'] });
let srvLog = ''; srv.stdout.on('data', (d) => { srvLog += d; }); srv.stderr.on('data', (d) => { srvLog += d; });
let exited = null; srv.on('exit', (c) => { exited = c; });
await new Promise((r) => { const t = setInterval(() => { if (srvLog.includes('Máy chủ online')) { clearInterval(t); r(); } }, 50); });
const health = async () => { try { return await (await fetch(`http://127.0.0.1:${PORT}/health`)).json(); } catch (_) { return null; } };
const raw = (text) => new Promise((r) => { const s = net.connect(PORT, '127.0.0.1', () => s.write(text)); let d = ''; s.on('data', (x) => { d += x; }); s.on('close', () => r(d)); s.on('error', () => r(d)); setTimeout(() => { s.destroy(); r(d); }, 1500); });
const URL = `ws://127.0.0.1:${PORT}/ws`;
const wait = (conn, type, pred = () => true, ms = 8000) => new Promise((r, j) => { const off = conn.on(type, (m) => { if (pred(m)) { off(); r(m); } }); setTimeout(() => j(new Error('chờ ' + type)), ms); });
try {
  const bad = await Promise.all(['GET //[ HTTP/1.1\r\nHost: x\r\n\r\n', 'GET /%zz HTTP/1.1\r\nHost: x\r\n\r\n', 'GET /%00 HTTP/1.1\r\nHost: x\r\n\r\n', 'GET /../../etc/passwd HTTP/1.1\r\nHost: x\r\n\r\n', 'GET /server/index.mjs HTTP/1.1\r\nHost: x\r\n\r\n', 'GET /.git/config HTTP/1.1\r\nHost: x\r\n\r\n',
    'GET //[ HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n', 'RÁC RÁC RÁC\r\n\r\n'].map(raw));
  await sleep(200);
  ok('yêu cầu HTTP sai dạng ("//[", "%zz", nâng cấp WebSocket với địa chỉ hỏng…): máy chủ không sập', exited === null && (await health())?.ok === true, bad.map((b) => b.split('\r\n')[0]).join(' ; '));
  ok('không đọc được tệp ngoài thư mục game / mã máy chủ / tệp ẩn', bad.slice(3, 6).every((b) => / (403|404) /.test(b.split('\r\n')[0])) && !bad.some((b) => /root:|createServer|\[core\]/.test(b)));

  // một người vào trận 1v1 với máy rồi gửi tin rác
  const A = await connect(URL); A.send({ t: 'create', mode: '1v1', name: 'An' });
  await wait(A, 'room'); const stP = wait(A, 'start'); A.send({ t: 'start' });
  await wait(A, 'room', (m) => m.state === 'pick'); A.send({ t: 'lock', heroId: ALPHA[0], lo: { charm: { name: 'x'.repeat(50), red: 'toString', blue: {}, gray: [] }, emblem: { key: '__proto__', minors: ['constructor'] } } });
  await stP; A.send({ t: 'loaded' }); await wait(A, 'go');
  let lastK = 0; A.on('f', (m) => { lastK = m.k; });
  for (const c of [{ type: 'sell', slot: 'length' }, { type: 'buy', item: '__proto__' }, { type: 'useItem', slot: 'length' }, { type: 'cast', slot: 's1', aim: { x: 'a', y: {} } }, { type: 'cast', slot: 'constructor' }, 'x', null, 5, [], { type: 'bot', on: true }, { type: 'ping', kind: 'attack', x: {}, y: [] }]) A.send({ t: 'c', c });
  for (const m of [{ t: 'c' }, { t: 'seat', team: 0, slot: 0.5 }, { t: 'seat' }, { t: 'lock' }, { t: 'h' }, { t: 'h', k: {}, h: {} }, { t: 'rejoin' }, { t: 'rejoin', code: {}, token: {} }, { t: 'queue', q: '__proto__' }, { t: 'queue', q: 'constructor' }, { t: 'create' }, { t: 'join', code: null }, { t: 'opts', mode: 'toString' }, { t: 'hover', heroId: {} }, { t: 'accept' }, { t: 'ready' }, { t: 'toString' }, { t: '__proto__' }, 7, 'chuỗi', [1, 2], null]) A.send(m);
  const k0 = lastK; await sleep(700);
  ok('trong trận, tin WebSocket rác đủ kiểu: máy chủ vẫn phát khung, không sập', exited === null && lastK > k0 + 10 && (await health())?.playing === 1, `khung ${k0} → ${lastK}`);

  // gửi dồn: bị cắt kết nối, máy chủ còn sống
  const F = await connect(URL); let closedF = false; F.onDrop = () => { closedF = true; };
  for (let i = 0; i < 1200; i++) F.send({ t: 'p', c: i });
  await sleep(500);
  ok('gửi dồn 1200 tin trong một nhịp: kết nối đó bị cắt, máy chủ vẫn sống', closedF && exited === null && (await health())?.ok === true);

  // quá nhiều kết nối từ một địa chỉ
  const extra = []; let refused = 0;
  for (let i = 0; i < 9; i++) { try { extra.push(await connect(URL, 1500)); } catch (_) { refused++; } }
  ok('quá số kết nối cho phép từ một địa chỉ IP: kết nối thừa bị từ chối', refused >= 3 && extra.length <= 6, `mở được ${extra.length}, từ chối ${refused}`);
  for (const c of extra) c.close();

  // kết nối im lặng (không gửi gì, kể cả tin đo độ trễ): máy chủ tự đóng
  await sleep(300);
  const quiet = new WebSocket(URL); let quietClosed = false; quiet.onclose = () => { quietClosed = true; };
  await new Promise((r) => { quiet.onopen = r; quiet.onerror = r; });
  for (let i = 0; i < 100 && !quietClosed; i++) await sleep(100);
  ok('kết nối im lặng quá hạn (IDLE_SEC): máy chủ tự đóng (trận không còn "người chơi ma")', quietClosed);
  ok('máy chủ còn sống sau mọi bài thử', exited === null && (await health())?.ok === true, exited !== null ? srvLog.slice(-600) : '');
  A.close();
} catch (e) { ok('các bài thử máy chủ chạy hết', false, String(e.stack).split('\n').slice(0, 3).join(' | ') + ' || ' + srvLog.slice(-400)); }
srv.kill();

// —— 5b. máy khách tự cứu (net/session.js): máy chủ treo → tự nối lại; máy chủ khởi động lại (phòng mất) → báo onEnd thay vì đứng hình ——
{
  const { createSession } = await import('../src/net/session.js');
  const P2 = PORT + 1, URL2 = `ws://127.0.0.1:${P2}/ws`;
  const boot = async () => { const p = spawn(process.execPath, [path.join(ROOT, 'server/index.mjs')], { env: { ...process.env, PORT: String(P2), HOST: '127.0.0.1', STATIC: '0', NET_SPEED: '2', READY_SEC: '0.2' }, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; }); for (let i = 0; i < 100 && !log.includes('Máy chủ online'); i++) await sleep(50); return p; };
  let srv2 = await boot(), pump = 0;
  try {
    const conn = await connect(URL2); conn.send({ t: 'create', mode: '1v1', name: 'Cứu' });
    await wait(conn, 'room'); const stP = wait(conn, 'start'); conn.send({ t: 'start' }); await wait(conn, 'room', (m) => m.state === 'pick'); conn.send({ t: 'lock', heroId: ALPHA[2] });
    const st = await stP, world = createWorld({ map: mapOf(st.cfg.mode), seed: st.cfg.seed }), { humans } = setupOnline(world, st.cfg);
    const notes = []; let ended = null;
    const sess = createSession({ conn, cfg: st.cfg, me: st.me, code: st.code, token: st.token, notify: (t) => notes.push(t), onEnd: (t) => { ended = t; } });
    sess.attach(world, humans[st.me]); sess.loaded();
    pump = setInterval(() => { try { sess.step(world); world.events.length = 0; } catch (e) { notes.push('LỖI ' + e.message); } }, 10);
    const till = async (f, ms) => { for (let t = 0; t < ms && !f(); t += 50) await sleep(50); return !!f(); };
    ok('phiên trực tuyến chạy (nhận khung từ máy chủ)', await till(() => world.tick > 40, 8000), `tick ${world.tick}`);
    // (a) máy chủ treo 7,5 giây: không khung, không tin trả lời đo độ trễ, kết nối KHÔNG đóng — như điện thoại mất sóng
    srv2.kill('SIGSTOP'); const t1 = world.tick; await sleep(7500);
    ok('im lặng quá 6 giây: máy khách tự coi kết nối đã chết và bắt đầu nối lại (không chờ trình duyệt báo đóng)', notes.some((n) => /đang nối lại/.test(n)) && !ended, notes.join(' | '));
    srv2.kill('SIGCONT');
    ok('máy chủ chạy lại: nối lại được, nhận bù khung, trận chạy tiếp', await till(() => world.tick > t1 + 90 && notes.some((n) => /Đã nối lại/.test(n)), 20000) && !ended && !world.over, `tick ${t1} → ${world.tick}; ${notes.join(' | ')}`);
    ok('sau khi nối lại không báo lệch đồng bộ', !sess.stats().desync && !notes.some((n) => /Lệch|LỖI/.test(n)));
    // (b) máy chủ khởi động lại: phòng không còn → phiên phải báo kết thúc (màn ngoài đưa người chơi về Sảnh)
    srv2.kill('SIGKILL'); await sleep(300); srv2 = await boot();
    ok('máy chủ khởi động lại (phòng mất): phiên báo onEnd thay vì đứng hình', await till(() => !!ended, 20000) && /đã đóng|kết thúc/.test(ended || ''), String(ended));
    sess.dispose();
  } catch (e) { ok('bài thử máy khách tự cứu chạy hết', false, String(e.stack).split('\n').slice(0, 3).join(' | ')); }
  clearInterval(pump); srv2.kill('SIGKILL');
}

// —— 6. lỗi mô phỏng của một phòng không kéo sập phòng khác (chạy rooms.mjs ngay trong tiến trình này, kết nối giả) ——
process.env.READY_SEC = '0.05'; process.env.NET_SPEED = '4';
const { handle, _rooms } = await import('../server/rooms.mjs');
const fake = () => { const h = { message: [], close: [] }, out = []; const ws = { ip: 't', open: true, buffered: 0, out, send: (o) => out.push(typeof o === 'string' ? JSON.parse(o) : o), close() { if (!ws.open) return; ws.open = false; h.close.forEach((f) => f()); }, on: (n, f) => h[n].push(f), say: (m) => h.message.forEach((f) => f(m)) }; handle(ws); return ws; };
const until = async (f, ms = 5000) => { for (let t = 0; t < ms && !f(); t += 20) await sleep(20); return !!f(); };
const enter = async (ws, name) => { ws.say({ t: 'create', mode: '1v1', name }); ws.say({ t: 'start' }); ws.say({ t: 'lock', heroId: ALPHA[1] }); await until(() => ws.out.some((m) => m.t === 'start')); ws.say({ t: 'loaded' }); return until(() => ws.out.some((m) => m.t === 'f')); };
const origLog = console.log; console.log = () => {}; // (nhật ký của máy chủ chạy trong tiến trình này)
const a = fake(), b = fake();
const both = await enter(a, 'A') && await enter(b, 'B');
console.log = origLog;
ok('hai phòng (kết nối giả) cùng vào trận', both && _rooms.size === 2);
const [ra, rb] = [..._rooms.values()];
ra.world.update = () => { throw new Error('lỗi giả trong mô phỏng'); };
console.log = () => {};
await until(() => a.out.some((m) => m.t === 'abort'));
console.log = origLog;
const kb = b.out.filter((m) => m.t === 'f').length; await sleep(300);
ok('phòng có mô phỏng lỗi: người chơi nhận "abort", phòng bị đóng', a.out.some((m) => m.t === 'abort') && !_rooms.has(ra.code));
ok('phòng còn lại vẫn chạy bình thường', _rooms.has(rb.code) && b.out.filter((m) => m.t === 'f').length > kb && rb.state === 'playing');
console.log = () => {}; a.say({ t: 'create', mode: '1v1', name: 'A2' }); console.log = origLog;
ok('người ở phòng vừa đóng tạo được phòng mới ngay', _rooms.size === 2);

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
