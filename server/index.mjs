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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ ok: true, ...stats() })); }
  if (!STATIC) { res.writeHead(404); return res.end('not found'); }
  let rel = decodeURIComponent(url.pathname); if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT + path.sep) || /[\\/]\./.test(rel) || rel.startsWith('/server/')) { res.writeHead(403); return res.end(); }
  try {
    const st = await stat(file); if (!st.isFile()) throw new Error('dir');
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch (_) { res.writeHead(404); res.end('not found'); }
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws') return socket.destroy();
  if (ORIGINS.length && !ORIGINS.includes(req.headers.origin)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
  const ws = accept(req, socket); if (ws) handle(ws);
});

server.listen(PORT, HOST, () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`Máy chủ online đang chạy — cổng ${PORT}`);
  console.log(`  Máy này:       http://localhost:${PORT}/`);
  for (const ip of ips) console.log(`  Trong mạng LAN: http://${ip}:${PORT}/   (điện thoại cùng Wi-Fi mở địa chỉ này)`);
  if (!STATIC) console.log('  (STATIC=0: chỉ nhận kết nối trò chơi ở /ws)');
});
