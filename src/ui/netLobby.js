// Kết nối máy chủ dùng chung cho các màn ngoài trận khi chơi trực tuyến: Phòng chờ (hàng chờ ghép trận Đấu thường / Đấu hạng / Đỉnh cao),
// Phòng tuỳ chỉnh (mã phòng) và màn chọn tướng online. Một kết nối sống qua các màn (phòng → chọn tướng → trận); máy chủ gửi 'start' thì
// dựng phiên trong trận (net/session.js) và vào trận (flow.startOnline). Màn nào cần nghe thì đăng ký onNet(fn(sự kiện, tin)).
import { connect, serverUrl, saveServerUrl, normUrl, wake } from '../net/client.js';
import { createSession } from '../net/session.js';
import { toast } from './kit.js';

const SAVE = 'la.online';
/** conn: kết nối đang mở; room: trạng thái phòng mới nhất máy chủ gửi (kèm at = lúc nhận, để tính đồng hồ); url: máy chủ ('' = không dùng máy chủ). */
export const net = { conn: null, room: null, url: serverUrl(), nav: null, started: false };
const subs = new Set();
/** Nghe sự kiện: 'room' | 'queue' | 'match' | 'kicked' | 'err' | 'drop' | 'wake'. Trả về hàm gỡ. */
export function onNet(fn) { subs.add(fn); return () => subs.delete(fn); }
const emit = (ev, m) => { for (const f of [...subs]) try { f(ev, m); } catch (e) { console.error(e); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function setServer(u) { net.url = normUrl(u); saveServerUrl(net.url); }
export const wakeServer = () => { if (net.url) wake(net.url); };

let pending = null, gen = 0;
/** Kết nối (hoặc dùng lại kết nối đang mở). Máy chủ ngủ (Render free): đánh thức rồi thử lại tới maxMs. Huỷ bằng netCancel(). */
export function lobbyConn({ maxMs = 75000 } = {}) {
  if (net.conn?.open) return Promise.resolve(net.conn);
  if (!net.url) return Promise.reject(new Error('Chưa đặt máy chủ'));
  if (pending) return pending;
  const my = gen;
  pending = (async () => {
    const url = net.url, t0 = Date.now(); let woke = false;
    for (;;) {
      try {
        const c = await connect(url, 10000);
        if (my !== gen) { c.close(); throw new Error('Đã huỷ'); }
        attach(c); return c;
      } catch (e) {
        if (my !== gen || Date.now() - t0 > maxMs) throw e;
        if (!woke) { woke = true; wake(url); emit('wake'); }
        await sleep(2500);
      }
    }
  })().finally(() => { pending = null; });
  return pending;
}
/** Huỷ lần kết nối đang chờ (bấm Huỷ tìm trận / rời màn). */
export function netCancel() { gen++; pending = null; }
export const connecting = () => !!pending;

function attach(c) {
  net.conn = c; net.room = null; net.started = false;
  c.on('room', (m) => { m.at = performance.now(); net.room = m; emit('room', m); });
  c.on('err', (m) => { toast(m.m, 2600); emit('err', m); });
  c.on('start', (m) => begin(c, m));
  for (const t of ['queue', 'match']) c.on(t, (m) => emit(t, m));
  c.on('kicked', (m) => { net.room = null; toast(m.m, 2600); emit('kicked', m); });
  c.onDrop = () => { if (net.started) return; net.conn = null; net.room = null; emit('drop'); };
}
function begin(c, m) {
  if (net.started) return; net.started = true;
  const session = createSession({ conn: c, cfg: m.cfg, me: m.me, code: m.code, token: m.token, notify: (t) => toast(t, 2600) });
  try { sessionStorage.setItem(SAVE, JSON.stringify({ url: c.url, code: m.code, token: m.token })); } catch (_) { /* */ }
  net.nav.startOnline(session);
}
/** Gửi tin lên máy chủ (đang kết nối). */
export const send = (m) => net.conn?.send(m);
/** Rời phòng / hàng chờ (giữ kết nối để vào phòng khác nhanh). */
export function netLeave() { if (net.conn?.open) net.conn.send({ t: 'leave' }); net.room = null; }
/** Hết trận online: phiên trong trận đã đóng kết nối — lần sau nối mới. */
export function netReset() { net.conn = null; net.room = null; net.started = false; }

/** Trận đang dở (tải lại trang giữa trận): { url, code, token } hoặc null. */
export function savedMatch() { try { return JSON.parse(sessionStorage.getItem(SAVE) || 'null'); } catch (_) { return null; } }
export function clearSaved() { try { sessionStorage.removeItem(SAVE); } catch (_) { /* */ } }
/** Vào lại trận đang dở. onFail() khi trận đã hết / phòng đã đóng. */
export async function rejoinSaved(onFail) {
  const s = savedMatch(); if (!s) return;
  if (s.url && s.url !== net.url) { netCancel(); net.conn?.close(); net.conn = null; net.url = s.url; }
  let c; try { c = await lobbyConn({ maxMs: 60000 }); } catch (e) { toast(`${e.message} (${net.url})`, 3500); return; }
  const off = c.on('rejoinFail', () => { off(); clearSaved(); toast('Trận đã kết thúc hoặc phòng đã đóng'); onFail?.(); });
  c.send({ t: 'rejoin', code: s.code, token: s.token, have: -1 });
}
