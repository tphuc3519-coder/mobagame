// WebSocket tối giản (RFC 6455) bằng module có sẵn của Node — máy chủ không cần cài gói npm nào.
// Chỉ khung văn bản (JSON), có ping / pong, đóng kết nối, ghép khung phân mảnh. Đủ cho trò chơi; không nén (permessage-deflate).
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX = 64 * 1024; // khung lớn nhất nhận từ máy khách

/** Nâng cấp yêu cầu HTTP lên WebSocket. Trả về đối tượng { send(obj), close(), on(name, fn), ip } hoặc null nếu yêu cầu sai. */
export function accept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return null; }
  const acc = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
  socket.setNoDelay(true); // gói nhỏ đi ngay (không gom theo Nagle) — quan trọng cho độ trễ
  const handlers = { message: [], close: [] };
  let buf = Buffer.alloc(0), frag = [], closed = false;
  const emit = (n, v) => { for (const f of handlers[n]) try { f(v); } catch (e) { console.error(e); } };
  const frame = (op, payload) => {
    const n = payload.length; let head;
    if (n < 126) head = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    return Buffer.concat([head, payload]);
  };
  const ws = {
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || socket.remoteAddress,
    get open() { return !closed; },
    send(obj) { if (closed || socket.destroyed) return; socket.write(frame(1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)))); },
    close(code = 1000) { if (closed) return; closed = true; try { const b = Buffer.alloc(2); b.writeUInt16BE(code); socket.end(frame(8, b)); } catch (_) { /* đã đóng */ } emit('close'); },
    on(n, f) { handlers[n].push(f); },
    get buffered() { return socket.writableLength; },
  };
  socket.on('data', (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80; let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; const big = buf.readBigUInt64BE(2); if (big > BigInt(MAX)) return ws.close(1009); len = Number(big); off = 10; }
      if (len > MAX || !masked) return ws.close(len > MAX ? 1009 : 1002); // khung từ máy khách bắt buộc có mặt nạ
      if (buf.length < off + 4 + len) return;
      const mask = buf.subarray(off, off + 4), data = Buffer.from(buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      buf = buf.subarray(off + 4 + len);
      if (op === 8) return ws.close();
      if (op === 9) { socket.write(frame(10, data)); continue; } // ping → pong
      if (op === 10) continue;
      if (op === 1 || op === 2 || op === 0) {
        frag.push(data);
        if (frag.reduce((s, b) => s + b.length, 0) > MAX) return ws.close(1009);
        if (!fin) continue;
        const text = Buffer.concat(frag).toString('utf8'); frag = [];
        let msg; try { msg = JSON.parse(text); } catch (_) { continue; }
        emit('message', msg);
      }
    }
  });
  const gone = () => { if (!closed) { closed = true; emit('close'); } };
  socket.on('close', gone); socket.on('end', gone); socket.on('error', gone);
  return ws;
}
