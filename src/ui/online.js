// Màn "Chơi online" (bản thử đầu): nhập địa chỉ máy chủ, chọn tướng, tạo phòng (1v1 / 5v5 — máy điền chỗ trống) hoặc vào phòng bằng mã
// 4 ký tự. Chủ phòng bắt đầu khi đối thủ đã Sẵn sàng (hoặc bắt đầu một mình: đánh với máy). Máy chủ gửi cấu hình trận → flow.startOnline.
// Máy chủ: node server/index.mjs (xem docs/ONLINE.md).
import { ALPHA, HEROES } from '../data/heroes/index.js';
import { DIFFICULTY } from '../data/ai.js';
import { ICON, face, toast } from './kit.js';
import { profile } from './profile.js';
import { stageOn } from './stage.js';
import { connect, serverUrl, saveServerUrl, normUrl, wake } from '../net/client.js';
import { createSession } from '../net/session.js';
import { MODES_ONLINE } from '../net/protocol.js';

const CSS = `
#online { background: #0b0e1a center/cover no-repeat; display: flex; flex-direction: column; padding: var(--t) var(--r) var(--b) var(--l); box-sizing: border-box; gap: 8px; }
#online::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,8,20,.55), rgba(6,8,20,.8)); pointer-events: none; }
#online > * { position: relative; }
#online .ol-head { display: flex; align-items: center; gap: 10px; }
#online .ol-head h2 { margin: 0; font: 800 26px/1 var(--u-disp); letter-spacing: .01em; }
#online .ol-head .ol-st { margin-left: auto; font: 600 12px var(--u-body); color: var(--u-dim); display: flex; align-items: center; gap: 6px; }
#online .ol-st i { width: 9px; height: 9px; border-radius: 50%; background: #777; box-shadow: 0 0 6px #0008; }
#online .ol-st i.on { background: #6fe08a; box-shadow: 0 0 8px #6fe08a; }
#online .ol-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 12px; }
#online .ol-box { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: auto; }
#online .ol-box h4 { margin: 0; font: 700 13px/1 var(--u-disp); letter-spacing: .14em; text-transform: uppercase; color: var(--u-gc); }
#online .ol-row { display: flex; gap: 8px; align-items: center; }
#online input { flex: 1; min-width: 0; height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(232,184,90,.5); background: rgba(4,6,18,.75); color: #f3ead2; font: 600 14px var(--u-body); outline: none; }
#online input:focus { border-color: #ffd36a; box-shadow: 0 0 0 2px rgba(255,211,106,.25); }
#online input.code { text-transform: uppercase; letter-spacing: .35em; font: 800 20px var(--u-disp); text-align: center; max-width: 150px; }
#online .ol-heroes { display: grid; grid-template-columns: repeat(auto-fill, minmax(54px, 1fr)); gap: 6px; }
#online .ol-heroes button { position: relative; padding: 0; border: 2px solid transparent; border-radius: 8px; background: #0008; aspect-ratio: 1; overflow: hidden; }
#online .ol-heroes button img { width: 100%; height: 100%; object-fit: cover; display: block; }
#online .ol-heroes button.on { border-color: #ffd36a; box-shadow: 0 0 10px rgba(255,200,90,.7); }
#online .ol-heroes button:disabled { opacity: .45; }
#online .ol-name { font: 700 14px var(--u-body); color: #f3ead2; } #online .ol-name small { color: var(--u-dim); font-weight: 600; }
#online .seg { display: inline-flex; border-radius: 18px; background: rgba(0,0,0,.45); padding: 3px; gap: 2px; flex-wrap: nowrap; }
#online .seg button { border: 0; background: none; padding: 5px 10px; border-radius: 15px; font: 700 13px var(--u-disp); letter-spacing: .05em; color: #cfd6ea; }
#online .seg button.on { background: linear-gradient(180deg, #ffe390, #e09a2c); color: #3b1a02; }
#online .seg button:disabled { opacity: .5; }
#online .ol-or { text-align: center; font: 600 12px var(--u-body); color: var(--u-dim); }
#online .ol-code { display: flex; align-items: center; gap: 10px; }
#online .ol-code b { font: 800 30px/1 var(--u-disp); letter-spacing: .2em; color: #ffe39a; text-shadow: 0 2px 0 #3a1a04, 0 0 14px rgba(255,180,70,.5); }
#online .ol-seats { display: flex; flex-direction: column; gap: 8px; }
#online .ol-seat { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; background: rgba(0,0,0,.35); }
#online .ol-seat img.face { width: 46px; height: 46px; border-radius: 6px; object-fit: cover; }
#online .ol-seat .t { flex: 1; min-width: 0; } #online .ol-seat .t b { display: block; font: 700 14px var(--u-body); color: #f3ead2; }
#online .ol-seat .t small { font: 600 12px var(--u-body); color: var(--u-dim); }
#online .ol-seat em { font: 700 12px var(--u-disp); letter-spacing: .06em; font-style: normal; padding: 3px 8px; border-radius: 10px; background: rgba(255,255,255,.08); color: #cfd6ea; white-space: nowrap; }
#online .ol-seat em.ok { background: rgba(80,200,120,.25); color: #9fe3a0; } #online .ol-seat em.host { background: rgba(255,200,90,.2); color: #ffd36a; }
#online .ol-seat.empty { opacity: .75; } #online .ol-seat.empty .ph { width: 46px; height: 46px; border-radius: 6px; border: 1.5px dashed rgba(232,184,90,.5); }
#online .ol-acts { display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap; flex: none; } #online .ol-acts .btn-gold, #online .ol-acts .btn-blue, #online .ol-acts .btn-ghost { height: 40px; }
#online .ol-seat img.face, #online .ol-seat.empty .ph { width: 40px !important; height: 40px !important; } #online .ol-acts .btn-gold, #online .ol-acts .btn-blue { flex: 1; }
#online .ol-rejoin { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(255,190,80,.14); border: 1px solid rgba(255,200,90,.4); font: 600 13px var(--u-body); color: #f3ead2; }
#online .ol-rejoin span { flex: 1; } #online .ol-rejoin .btn-gold { height: 36px; padding: 0 14px; }
#online .ol-tip { font: 500 11.5px/1.45 var(--u-body); color: var(--u-dim); margin: 0; }
@media (max-width: 640px) { #online .ol-main { grid-template-columns: 1fr; } }
`;
let cssDone = false;

export function openOnline(nav) {
  if (!cssDone) { const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); cssDone = true; }
  stageOn(false);
  const p = profile();
  let closed = false, url = serverUrl(), conn = null, room = null, connecting = false, started = false, waking = false;
  wake(url); // máy chủ miễn phí đang ngủ thì bắt đầu thức dậy ngay khi mở màn
  let heroId = ALPHA.includes(p.lastHero) ? p.lastHero : ALPHA.includes(p.feature) ? p.feature : ALPHA[0];
  let mode = '1v1', diff = DIFFICULTY[p.diff] ? p.diff : 'normal', code = '';
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem('la.online') || 'null'); } catch (_) { /* */ } // trận đang dở (tải lại trang giữa trận)
  const el = document.createElement('div'); el.id = 'online'; el.className = 'scr';
  el.style.backgroundImage = 'url(./assets/ui/room.jpg)';
  document.getElementById('ui').append(el);
  const $ = (s) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const host = () => room && room.you === 0;

  function seatHtml(pl) {
    if (!pl) return `<div class="ol-seat empty"><i class="ph"></i><div class="t"><b>Đang chờ đối thủ…</b><small>Gửi mã phòng cho bạn. Bắt đầu luôn thì máy chơi thay.</small></div></div>`;
    const tag = pl.host ? '<em class="host">Chủ phòng</em>' : pl.ready ? '<em class="ok">Sẵn sàng ✓</em>' : '<em>Chưa sẵn sàng</em>';
    return `<div class="ol-seat">${face(pl.heroId)}<div class="t"><b>${esc(pl.name)}${pl.online ? '' : ' (rớt mạng)'}</b><small>${HEROES[pl.heroId]?.name || ''} · Đội ${pl.team ? 'Đỏ' : 'Xanh'}</small></div>${tag}</div>`;
  }
  const segHtml = (key, items, cur, off) => `<div class="seg" data-seg="${key}">${items.map(([k, n]) => `<button type="button" data-v="${k}" class="${k === cur ? 'on' : ''}" ${off ? 'disabled' : ''}>${n}</button>`).join('')}</div>`;
  function render() {
    const inRoom = !!room, me = inRoom ? room.players[room.you] : null, guest = room?.players[1];
    el.innerHTML = `
      <div class="ol-head"><button type="button" class="ui-back" data-a="back" aria-label="Quay lại">${ICON.back()}</button><h2 class="gt">Chơi online</h2>
        <span class="ol-st"><i class="${conn?.open ? 'on' : ''}"></i>${conn?.open ? `Đã nối máy chủ${conn.rtt ? ` · ${Math.round(conn.rtt)} ms` : ''}` : connecting ? (waking ? 'Đang đánh thức máy chủ (tối đa ~1 phút)…' : 'Đang kết nối…') : 'Chưa kết nối'}</span></div>
      <div class="ol-main">
        <div class="ol-box fr">
          <h4>Máy chủ</h4>
          <div class="ol-row"><input id="olUrl" value="${esc(url)}" placeholder="vd. 192.168.1.5:8787 hoặc wss://ten-may-chu.fly.dev" ${inRoom ? 'disabled' : ''} autocomplete="off" spellcheck="false"></div>
          <h4>Tướng của bạn</h4>
          <div class="ol-name">${esc(p.name)} <small>· ${HEROES[heroId].name}</small></div>
          <div class="ol-heroes">${ALPHA.map((id) => `<button type="button" data-h="${id}" class="${id === heroId ? 'on' : ''}" ${me?.ready && !host() ? 'disabled' : ''} aria-label="${HEROES[id].name}">${face(id)}</button>`).join('')}</div>
        </div>
        <div class="ol-box fr">${inRoom ? `
          <h4>Phòng</h4>
          <div class="ol-code"><b>${room.code}</b><button type="button" class="btn-ghost" data-a="copy">Chép mã</button></div>
          <div class="ol-row">${segHtml('mode', Object.entries(MODES_ONLINE).map(([k]) => [k, k]), room.mode, !host())}</div>
          <div class="ol-row">${segHtml('diff', Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name]), room.difficulty, !host())}</div>
          <p class="ol-tip">${MODES_ONLINE[room.mode].name}. Máy (bot) độ khó ${DIFFICULTY[room.difficulty].name} điền các chỗ trống.</p>
          <div class="ol-seats">${seatHtml(room.players[0])}${seatHtml(guest)}</div>
          <div class="ol-acts">${host()
            ? `<button type="button" class="btn-gold" data-a="start" ${guest && !guest.ready ? 'disabled' : ''}>${!guest ? 'Bắt đầu (đấu máy)' : guest.ready ? 'Bắt đầu' : 'Chờ đối thủ sẵn sàng'}</button>`
            : `<button type="button" class="${me?.ready ? 'btn-blue' : 'btn-gold'}" data-a="ready">${me?.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'}</button>`}
            <button type="button" class="btn-ghost" data-a="leave">Rời phòng</button></div>` : `
          ${saved ? `<div class="ol-rejoin"><span>Trận đang dở · phòng <b>${esc(saved.code)}</b></span><button type="button" class="btn-gold" data-a="rejoin">Vào lại trận</button></div>` : ''}
          <h4>Tạo phòng</h4>
          <div class="ol-row">${segHtml('mode', [['1v1', '1v1'], ['5v5', '5v5']], mode)}</div>
          <div class="ol-row">${segHtml('diff', Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name]), diff)}</div>
          <button type="button" class="btn-gold" data-a="create" ${connecting ? 'disabled' : ''}>Tạo phòng</button>
          <div class="ol-or">— hoặc vào phòng của bạn —</div>
          <div class="ol-row"><input id="olCode" class="code" maxlength="4" value="${esc(code)}" placeholder="MÃ" autocomplete="off" spellcheck="false"><button type="button" class="btn-blue" data-a="join" ${connecting ? 'disabled' : ''}>Vào phòng</button></div>
          <p class="ol-tip">Bản thử: hai người, mỗi người một đội (5v5: 8 máy còn lại do bot chơi). Trận chạy trên máy chủ theo nhịp 30 tick/giây, mạng ổn định thì trễ ≈ ping + 70 ms.</p>`}
        </div>
      </div>`;
  }
  render();
  const rttT = setInterval(() => { if (conn?.open) { const s = $('.ol-st'); if (s) s.lastChild.textContent = `Đã nối máy chủ${conn.rtt ? ` · ${Math.round(conn.rtt)} ms` : ''}`; } }, 2000);

  async function ensureConn() {
    if (conn?.open) return conn;
    const inp = $('#olUrl'); if (inp) { url = normUrl(inp.value); saveServerUrl(url); }
    connecting = true; render();
    try {
      // máy chủ ngủ: thử lại tới ~75 giây (lần đầu thường hỏng vài lần trong lúc máy chủ khởi động)
      let c = null; const t0 = Date.now();
      for (;;) {
        try { c = await connect(url, 10000); break; } catch (e) {
          if (Date.now() - t0 > 75000 || closed) throw e;
          if (!waking) { waking = true; wake(url); render(); }
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      waking = false; conn = c;
      c.on('room', (m) => { room = m; render(); });
      c.on('err', (m) => toast(m.m));
      c.on('start', (m) => begin(c, m));
      c.onDrop = () => { if (started) return; conn = null; room = null; toast('Mất kết nối máy chủ'); render(); };
      return c;
    } catch (e) { toast(`${e.message} (${url})`, 3500); return null; }
    finally { connecting = false; waking = false; render(); }
  }
  function begin(c, m) {
    if (started) return; started = true;
    const session = createSession({ conn: c, cfg: m.cfg, me: m.me, code: m.code, token: m.token, notify: (t) => toast(t, 2600) });
    try { sessionStorage.setItem('la.online', JSON.stringify({ url, code: m.code, token: m.token })); } catch (_) { /* */ }
    nav.startOnline(session);
  }

  el.onclick = async (e) => {
    const h = e.target.closest('[data-h]');
    if (h) { heroId = h.dataset.h; p.lastHero = heroId; if (room) conn?.send({ t: 'pick', heroId }); render(); return; }
    const sg = e.target.closest('[data-seg] button');
    if (sg) {
      const k = sg.parentElement.dataset.seg, v = sg.dataset.v;
      if (room) { if (host()) conn.send({ t: 'opts', [k === 'diff' ? 'difficulty' : 'mode']: v }); return; }
      if (k === 'mode') mode = v; else diff = v; render(); return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'back') { nav.go('home'); return; }
    if (a === 'rejoin') {
      const inp = $('#olUrl'); if (inp) inp.value = saved.url;
      const c = await ensureConn(); if (!c) return;
      const off = c.on('rejoinFail', () => { off(); toast('Trận đã kết thúc hoặc phòng đã đóng'); saved = null; try { sessionStorage.removeItem('la.online'); } catch (_) { /* */ } render(); });
      c.send({ t: 'rejoin', code: saved.code, token: saved.token, have: -1 }); return;
    }
        if (a === 'create') { const c = await ensureConn(); c?.send({ t: 'create', mode, difficulty: diff, heroId, name: p.name }); }
    else if (a === 'join') {
      code = ($('#olCode')?.value || '').trim().toUpperCase(); if (code.length !== 4) { toast('Nhập mã phòng 4 ký tự'); return; }
      const c = await ensureConn(); c?.send({ t: 'join', code, heroId, name: p.name });
    } else if (a === 'ready') conn?.send({ t: 'ready', on: !room.players[room.you].ready });
    else if (a === 'start') conn?.send({ t: 'start' });
    else if (a === 'leave') { conn?.send({ t: 'leave' }); room = null; render(); }
    else if (a === 'copy') { try { await navigator.clipboard.writeText(room.code); toast('Đã chép mã phòng'); } catch (_) { toast(`Mã phòng: ${room.code}`); } }
  };
  el.oninput = (e) => { if (e.target.id === 'olCode') { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); code = e.target.value; } };
  window.__online = { get room() { return room; }, get conn() { return conn; } }; // kiểm thử tự động
  return () => { closed = true; clearInterval(rttT); if (!started) conn?.close(); el.remove(); };
}
