// Kết nối tới máy chủ online (WebSocket, JSON). Tự đo độ trễ (ping) mỗi 2 giây; mất kết nối thì báo onDrop (phiên trong trận tự nối lại).
// Địa chỉ máy chủ: ?server=… trên URL > địa chỉ đã lưu (màn Phòng tuỳ chỉnh → Máy chủ: Đổi) > chính trang đang mở nếu do server/index.mjs phục vụ.

const KEY = 'la.server';
/** Máy chủ mặc định khi mở game từ trang khác máy chủ (GitHub Pages…): điền sau khi đưa máy chủ lên mạng, vd. 'wss://moba.ten-mien.com/ws'. */
export const DEFAULT_SERVER = 'wss://lantern-arena-online.onrender.com/ws'; // Render gói free, Singapore (render.yaml)
/** Địa chỉ máy chủ mặc định. */
export function serverUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q === 'off') return ''; // ?server=off: không dùng máy chủ — Đấu thường / Đấu hạng ghép máy ngay (kiểm thử luồng ngoài trận)
  if (q) return normUrl(q);
  try { const s = localStorage.getItem(KEY); if (s) return s; } catch (_) { /* chặn lưu trữ */ }
  return DEFAULT_SERVER && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) ? DEFAULT_SERVER : sameOrigin();
}
/** Máy chủ ngay tại trang này (khi mở game từ http://<máy chủ>:8787). */
export const sameOrigin = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
export function saveServerUrl(u) { try { localStorage.setItem(KEY, normUrl(u)); } catch (_) { /* không lưu được */ } }
/** "1.2.3.4:8787" / "https://x.fly.dev" → "ws://1.2.3.4:8787/ws" / "wss://x.fly.dev/ws". */
export function normUrl(u) {
  let s = String(u || '').trim(); if (!s) return sameOrigin();
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
  if (!/^wss?:\/\//i.test(s)) s = (location.protocol === 'https:' ? 'wss://' : 'ws://') + s;
  const url = new URL(s); if (url.pathname === '/' || !url.pathname) url.pathname = '/ws';
  return url.toString();
}

/** Gọi /health để đánh thức máy chủ đang ngủ (Render gói free ngủ sau 15 phút, thức dậy mất ~1 phút) — gọi sớm, lúc mở Phòng tuỳ chỉnh. */
export function wake(url) {
  try { const u = new URL(url); u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:'; u.pathname = '/health'; fetch(u, { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (_) { /* địa chỉ sai: bỏ qua */ }
}
/** Mở kết nối. Trả về { send, on(type, fn) → gỡ, close, rtt, open } — Promise resolve khi kết nối xong, reject khi lỗi / quá 8 giây. */
export function connect(url, ms = 8000) {
  return new Promise((resolve, reject) => {
    let ws; try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
    const subs = new Map(), conn = { url, rtt: 0, open: false, onDrop: null };
    const fire = (t, m) => { for (const f of subs.get(t) || []) try { f(m); } catch (e) { console.error(e); } };
    let pingT = 0;
    const timeout = setTimeout(() => { try { ws.close(); } catch (_) { /* */ } reject(new Error('Hết thời gian chờ máy chủ')); }, ms);
    ws.onopen = () => {
      clearTimeout(timeout); conn.open = true;
      const ping = () => conn.send({ t: 'p', c: performance.now() }); ping(); pingT = setInterval(ping, 2000);
      resolve(conn);
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.t === 'P') { const r = performance.now() - m.c; conn.rtt = conn.rtt ? conn.rtt * 0.7 + r * 0.3 : r; fire('rtt', conn.rtt); return; }
      fire(m.t, m); fire('*', m);
    };
    ws.onerror = () => { if (!conn.open) { clearTimeout(timeout); reject(new Error('Không kết nối được máy chủ')); } };
    ws.onclose = () => { clearInterval(pingT); const was = conn.open; conn.open = false; if (was) conn.onDrop?.(); };
    conn.send = (obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
    conn.on = (t, f) => { if (!subs.has(t)) subs.set(t, new Set()); subs.get(t).add(f); return () => subs.get(t).delete(f); };
    conn.drop = () => { try { ws.close(); } catch (_) { /* */ } }; // kiểm thử: cắt kết nối như rớt mạng (phiên tự nối lại)
    conn.close = () => { conn.onDrop = null; clearInterval(pingT); try { ws.close(); } catch (_) { /* */ } };
  });
}
