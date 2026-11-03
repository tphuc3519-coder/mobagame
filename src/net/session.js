// Phiên chơi online trong trận (máy khách). Lệnh của mình → máy chủ (không áp thẳng vào mô phỏng); khung tick từ máy chủ → áp lệnh của mọi
// người + chạy world.update đúng tick đó. Không có khung thì mô phỏng đứng chờ; bị tụt lại (mạng giật, chuyển tab) thì chạy bù nhanh.
// Mất kết nối giữa trận: tự nối lại mỗi 1,5 giây và xin máy chủ các khung còn thiếu (tướng mình đứng yên, quá vài giây máy tạm điều khiển).
import { NET, applyFrame, hashWorld, quantDir } from './protocol.js';
import { connect } from './client.js';

/** Sự kiện giữ lại khi chạy bù xa — đổi trạng thái hình (chết / hồi sinh / trụ đổ / trại quái …), phần còn lại là hiệu ứng nhất thời. */
const KEEP = new Set(['gameover', 'death', 'respawn', 'revive', 'structureDown', 'towerOff', 'orbUp', 'orbTaken', 'campSpawn', 'campCleared', 'monsterKill',
  'clones', 'cloneEnd', 'cloneSwap', 'tetherEnd', 'suppressEnd', 'levelup', 'buy', 'sell', 'itemUpgrade', 'recalled', 'recallCancel']);

/** opts: { conn, cfg, me, code, token, notify(text) } */
export function createSession({ conn, cfg, me, code, token, notify = () => {} }) {
  const queue = []; // [tick, lệnh | null] theo thứ tự
  const history = [0]; // mọi khung đã nhận (xem lại / dò lỗi lệch đồng bộ: dựng lại trận từ cfg + history)
  let lastRecv = 0, ran = 0, inSim = false, local = null, player = null, disposed = false, reconnecting = false, desync = false;
  let lastDir = { x: 0, y: 0 }, lastDirT = 0, started = false, drops = 0;
  const offs = [];
  const bind = (c) => {
    offs.splice(0).forEach((f) => f());
    offs.push(c.on('f', (m) => {
      const n = m.c.length;
      for (let i = 0; i < n; i++) { const k = m.k - n + 1 + i; if (k <= lastRecv) continue; queue.push([k, m.c[i] || null]); history[k] = m.c[i] || 0; lastRecv = k; }
    }));
    offs.push(c.on('go', () => { started = true; }));
    offs.push(c.on('note', (m) => notify(m.m)));
    offs.push(c.on('desync', () => { if (!desync) { desync = true; notify('Lệch đồng bộ với máy chủ — trận có thể hiển thị sai (đã ghi lại để sửa)'); } }));
    c.onDrop = () => { if (!disposed) reconnect(); };
  };
  bind(conn);
  async function reconnect() {
    if (reconnecting || disposed) return; reconnecting = true; drops++;
    notify('Mất kết nối — đang nối lại…');
    while (!disposed) {
      try {
        const c = await connect(conn.url); if (disposed) { c.close(); break; }
        conn = c; bind(c); // nhận khung ngay từ gói đầu máy chủ gửi bù
        const ok = await new Promise((r) => { const b = c.on('rejoinFail', () => { b(); r(false); }); c.send({ t: 'rejoin', code, token, have: lastRecv }); setTimeout(() => { b(); r(true); }, 2500); });
        if (!ok) { notify('Trận đã kết thúc hoặc phòng đã đóng'); c.onDrop = null; c.close(); break; }
        notify('Đã nối lại'); break;
      } catch (_) { await new Promise((r) => setTimeout(r, 1500)); }
    }
    reconnecting = false;
  }

  const api = {
    cfg, me, code, token, history,
    get conn() { return conn; },
    /** Gắn vào trận vừa dựng: bọc world.command — lệnh của tướng mình (ngoài lúc mô phỏng chạy) gửi lên máy chủ. */
    attach(world, me_) {
      player = me_; local = world.command;
      world.localCommand = local;
      world.command = (id, c) => { if (id === player.id && !inSim) api.cmd(c); else local(id, c); };
    },
    cmd(c) { conn.send({ t: 'c', c }); },
    /** Hướng cần điều khiển mỗi tick: gửi khi đổi (tối đa ~15 lần/giây; dừng lại thì gửi ngay). */
    input(d) {
      const q = quantDir(d), now = performance.now();
      if (q.x === lastDir.x && q.y === lastDir.y) return;
      if (now - lastDirT < 60 && (q.x || q.y)) return;
      lastDir = q; lastDirT = now; api.cmd({ type: 'move', dir: q });
    },
    /** Rời tab / ẩn trang: thả cần (không để tướng chạy mãi về một hướng). */
    release() { if (lastDir.x || lastDir.y) { lastDir = { x: 0, y: 0 }; api.cmd({ type: 'move', dir: lastDir }); } },
    loaded() { conn.send({ t: 'loaded' }); },
    /** Chạy các khung đã nhận. Bình thường 1 khung / tick; tụt ≥ 4 khung thì 2; tụt xa thì chạy bù tới ~24 ms mỗi lượt. Trả về số khung đã chạy. */
    step(world) {
      const behind = queue.length; if (!behind) return 0;
      const max = behind > 8 ? Infinity : behind > 3 ? 2 : 1, t0 = performance.now(), skim = behind > 90; let n = 0;
      inSim = true;
      try {
        while (queue.length && n < max) {
          const [k, c] = queue.shift(); applyFrame(world, k, c, local); ran = k; n++;
          if (skim) world.events = world.events.filter((ev) => KEEP.has(ev.type)); // bù xa (vào lại trận, chuyển tab lâu): bỏ hiệu ứng / tiếng của quá khứ
          if (k % NET.hashEvery === 0) conn.send({ t: 'h', k, h: hashWorld(world) });
          if (max === Infinity && performance.now() - t0 > 24) break;
        }
      } finally { inSim = false; }
      return n;
    },
    get started() { return started || lastRecv > 0; },
    stats() { return { rtt: conn.rtt, buffer: queue.length, tick: ran, online: conn.open, drops, desync }; },
    dispose() { if (disposed) return; disposed = true; offs.forEach((f) => f()); try { conn.send({ t: 'leave' }); } catch (_) { /* */ } conn.close(); },
  };
  return api;
}
