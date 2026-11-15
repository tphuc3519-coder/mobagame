#!/usr/bin/env node
// Máy chủ chơi online — chỉ cần Node 18+ (không cài gói npm nào). Chạy: node server/index.mjs   (PORT=8787 mặc định)
//  • ws(s)://<máy>:<cổng>/ws  — kết nối trò chơi (phòng, lệnh, khung trận — server/rooms.mjs)
//  • http://<máy>:<cổng>/     — phục vụ luôn thư mục game (thử trong mạng LAN: điện thoại mở http://<IP máy tính>:8787)
//  • /health                  — kiểm tra máy chủ sống (số phòng / người)
// Biến môi trường: PORT, HOST (mặc định 0.0.0.0), STATIC=0 (tắt phục vụ file game — khi game nằm trên GitHub Pages),
// ORIGINS=https://a.github.io,https://b.com (chỉ nhận kết nối từ các trang này; bỏ trống = nhận mọi trang).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accept } from './ws.mjs';
import { handle, stats } from './rooms.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 8787), HOST = process.env.HOST || '0.0.0.0';
const STATIC = process.env.STATIC !== '0';
const ORIGINS = (process.env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

/** Địa chỉ yêu cầu → đường dẫn đã giải mã, hoặc null khi sai dạng (new URL / decodeURIComponent ném lỗi với "//[" hay "%zz" — trước đây
 *  một yêu cầu như vậy là lỗi không ai bắt, làm sập cả máy chủ). */
function pathOf(req) { try { return decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (_) { return null; } }

const server = http.createServer(async (req, res) => {
  const pathname = pathOf(req);
  if (pathname === null) { res.writeHead(400); return res.end('bad request'); }
  const url = { pathname };
  if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ ok: true, ...stats() })); }
  if (!STATIC) { res.writeHead(404); return res.end('not found'); }
  let rel = url.pathname; if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('\0')) { res.writeHead(400); return res.end('bad request'); }
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT + path.sep) || /[\\/]\./.test(rel) || rel.startsWith('/server/')) { res.writeHead(403); return res.end(); }
  try {
    const st = await stat(file); if (!st.isFile()) throw new Error('dir');
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch (_) { res.writeHead(404); res.end('not found'); }
});

// Số kết nối trò chơi cùng lúc trên cả máy chủ và từ một địa chỉ IP. Mức mỗi IP để rộng (64): nhà mạng di động cho rất nhiều thuê bao dùng
// chung một IP công cộng (CGNAT), quán net cũng vậy — mục đích chỉ là chặn MỘT máy mở hàng nghìn kết nối. MAX_PER_IP=0: không giới hạn.
// IP lấy như server/ws.mjs (cf-connecting-ip / phần tử đầu x-forwarded-for do proxy của nền tảng đặt, không có thì địa chỉ socket): kẻ
// gửi thẳng không qua proxy giả được header này để né mức mỗi IP — khi đó vẫn còn mức tổng MAX_CONNS.
const envNum = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' && Number.isFinite(+process.env[k]) ? +process.env[k] : d);
const MAX_PER_IP = envNum('MAX_PER_IP', 64), MAX_CONNS = envNum('MAX_CONNS', 2000);
const perIp = new Map(); let total = 0;
server.on('upgrade', (req, socket) => {
  socket.on('error', () => {}); // bên kia ngắt giữa lúc bắt tay: không để thành lỗi không ai bắt
  if (pathOf(req) !== '/ws') return socket.destroy();
  if (ORIGINS.length && !ORIGINS.includes(req.headers.origin)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || socket.remoteAddress || '?').trim().slice(0, 64), n = perIp.get(ip) || 0;
  if ((MAX_PER_IP > 0 && n >= MAX_PER_IP) || total >= MAX_CONNS) { socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return; }
  const ws = accept(req, socket); if (!ws) return;
  perIp.set(ip, n + 1); total++;
  ws.on('close', () => { total--; const k = (perIp.get(ip) || 1) - 1; if (k > 0) perIp.set(ip, k); else perIp.delete(ip); });
  handle(ws);
});
server.on('clientError', (_e, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); else socket.destroy(); });
// Lưới an toàn cuối: một lỗi lọt qua mọi chỗ bắt không được kéo sập các trận đang chơi — ghi lại rồi chạy tiếp.
process.on('uncaughtException', (e) => console.error(new Date().toISOString(), 'LỖI KHÔNG AI BẮT:', e?.stack || e));
process.on('unhandledRejection', (e) => console.error(new Date().toISOString(), 'PROMISE KHÔNG AI BẮT:', e?.stack || e));

server.listen(PORT, HOST, () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`Máy chủ online đang chạy — cổng ${PORT}`);
  console.log(`  Máy này:       http://localhost:${PORT}/`);
  for (const ip of ips) console.log(`  Trong mạng LAN: http://${ip}:${PORT}/   (điện thoại cùng Wi-Fi mở địa chỉ này)`);
  if (!STATIC) console.log('  (STATIC=0: chỉ nhận kết nối trò chơi ở /ws)');
});
