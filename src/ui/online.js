// Phòng tuỳ chỉnh (trực tuyến, chơi cùng bạn bè thật). Chưa vào phòng: Tạo phòng (bản đồ 1v1 / 5v5, Thêm máy bật / tắt, độ khó máy) hoặc
// nhập mã 4 ký tự để Vào phòng; trận đang dở thì có nút Vào lại trận. Trong phòng: MÃ PHÒNG lớn (chép được), hai cột Đội Xanh / Đội Đỏ —
// mỗi đội 5 ô (1v1: 1 ô), chạm ô trống để đổi chỗ / đổi đội; ô trống ghi "Máy" khi bật máy, "Trống" khi tắt. Cột phải: tuỳ chọn phòng
// (chủ phòng đổi được), Sẵn sàng / Bắt đầu, Rời phòng. Chủ phòng bắt đầu khi mọi người Sẵn sàng → màn chọn tướng trực tuyến → trận.
// Máy chủ: server/rooms.mjs (docs/ONLINE.md). Kết nối dùng chung: ui/netLobby.js.
import { DIFFICULTY } from '../data/ai.js';
import { ICON, face, toast } from './kit.js';
import { profile } from './profile.js';
import { stageOn } from './stage.js';
import { S } from './modes.js';
import { net, onNet, lobbyConn, connecting, netCancel, netLeave, send, setServer, wakeServer, savedMatch, rejoinSaved } from './netLobby.js';

const CSS = `
#online { background: #0b0e1a center/cover no-repeat; display: flex; flex-direction: column; padding: var(--t) var(--r) var(--b) var(--l); box-sizing: border-box; gap: 8px; }
#online::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,8,20,.55), rgba(6,8,20,.82)); pointer-events: none; }
#online > * { position: relative; }
#online .ol-head { display: flex; align-items: center; gap: 10px; min-height: 40px; }
#online .ol-head h2 { margin: 0; font: 800 clamp(20px, calc(6.4 * var(--vh, 1vh)), 26px)/1 var(--u-disp); letter-spacing: .01em; white-space: nowrap; }
#online .ol-st { margin-left: auto; font: 600 12px var(--u-body); color: var(--u-dim); display: flex; align-items: center; gap: 6px; white-space: nowrap; }
#online .ol-st i { width: 9px; height: 9px; border-radius: 50%; background: #777; box-shadow: 0 0 6px #0008; flex: none; }
#online .ol-st i.on { background: #6fe08a; box-shadow: 0 0 8px #6fe08a; }
#online .ol-code { display: flex; align-items: center; gap: 8px; padding: 4px 6px 4px 12px; border-radius: 22px; background: rgba(4,6,20,.82); box-shadow: inset 0 0 0 2px rgba(232,184,90,.55); }
#online .ol-code small { font: 700 10.5px/1.1 var(--u-disp); letter-spacing: .12em; color: var(--u-dim); text-transform: uppercase; }
#online .ol-code b { font: 800 clamp(22px, calc(7 * var(--vh, 1vh)), 30px)/1 var(--u-disp); letter-spacing: .22em; color: #ffe39a; text-shadow: 0 2px 0 #3a1a04, 0 0 14px rgba(255,180,70,.5); }
#online .ol-code button { height: 30px; padding: 0 10px; font-size: 12.5px; }
#online .ol-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 12px; }
#online .ol-main.in { grid-template-columns: minmax(0, 1fr) clamp(190px, calc(27 * var(--vw, 1vw)), 270px); }
#online .ol-box { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: auto; }
#online .ol-box.pin { overflow: hidden; } #online .ol-box.pin > .btn-gold { flex: none; } /* nút chính ghim đáy khung, phần trên tự cuộn khi thiếu chỗ */
#online .ol-scroll { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: inherit; overscroll-behavior: contain; }
#online .ol-box h4 { margin: 0; font: 700 12.5px/1 var(--u-disp); letter-spacing: .14em; text-transform: uppercase; color: var(--u-gc); }
#online .ol-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } #online .ol-row > span { font: 600 12.5px var(--u-body); color: #cfd6ea; min-width: 74px; }
#online input { flex: 1; min-width: 0; height: 36px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(232,184,90,.5); background: rgba(4,6,18,.75); color: #f3ead2; font: 600 14px var(--u-body); outline: none; }
#online input:focus { border-color: #ffd36a; box-shadow: 0 0 0 2px rgba(255,211,106,.25); }
#online input.code { text-transform: uppercase; letter-spacing: .35em; font: 800 22px var(--u-disp); text-align: center; max-width: 160px; height: 44px; }
#online .seg { display: inline-flex; border-radius: 18px; background: rgba(0,0,0,.45); padding: 3px; gap: 2px; flex-wrap: wrap; }
#online .seg button { border: 0; background: none; padding: 5px 10px; border-radius: 15px; font: 700 12.5px var(--u-disp); letter-spacing: .04em; color: #cfd6ea; }
#online .seg button.on { background: linear-gradient(180deg, #ffe390, #e09a2c); color: #3b1a02; }
#online .seg button:disabled { opacity: .55; }
#online .ol-tip { font: 500 11.5px/1.45 var(--u-body); color: var(--u-dim); margin: 0; }
#online .ol-srv { display: flex; align-items: center; gap: 6px; font: 600 11.5px var(--u-body); color: var(--u-dim); margin-top: auto; }
#online .ol-srv code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cfd6ea; }
#online .ol-srv button { height: 26px; padding: 0 10px; font-size: 12px; }
#online .ol-rejoin { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(255,190,80,.14); border: 1px solid rgba(255,200,90,.4); font: 600 13px var(--u-body); color: #f3ead2; }
#online .ol-rejoin span { flex: 1; } #online .ol-rejoin .btn-gold { height: 36px; padding: 0 14px; }
#online .btn-gold.big { height: 44px; font-size: 17px; }
/* trong phòng: hai đội */
#online .cr-teams { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: center; min-height: 0; overflow: auto; }
#online .cr-team { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
#online .cr-team h4 { margin: 0 0 2px; font: 800 13px/1 var(--u-disp); letter-spacing: .12em; text-transform: uppercase; text-align: center; }
#online .cr-team.b h4 { color: #8fc2ff; } #online .cr-team.r h4 { color: #ff9c8c; }
#online .cr-vs { font: 900 clamp(22px, calc(7 * var(--vh, 1vh)), 34px)/1 var(--u-disp); }
#online .cr-slot { display: flex; align-items: center; gap: 8px; padding: 0 8px 0 4px; height: clamp(38px, calc(10.6 * var(--vh, 1vh)), 50px); border-radius: 8px; border: 0; text-align: left; color: inherit; background: rgba(8,12,30,.78); box-shadow: inset 0 0 0 2px rgba(120,150,220,.28); min-width: 0; }
#online .cr-team.r .cr-slot { box-shadow: inset 0 0 0 2px rgba(230,120,110,.3); }
#online .cr-slot .face, #online .cr-slot .ph { width: clamp(30px, calc(8.6 * var(--vh, 1vh)), 40px); height: clamp(30px, calc(8.6 * var(--vh, 1vh)), 40px); border-radius: 6px; object-fit: cover; flex: none; }
#online .cr-slot .ph { display: grid; place-items: center; background: rgba(255,255,255,.06); font: 800 15px var(--u-disp); color: rgba(220,228,250,.55); border: 1.5px dashed rgba(200,210,240,.35); box-sizing: border-box; }
#online .cr-slot .t { flex: 1; min-width: 0; } #online .cr-slot .t b { display: block; font: 700 13.5px/1.15 var(--u-body); color: #f3ead2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#online .cr-slot .t small { display: block; font: 600 11px/1.2 var(--u-body); color: var(--u-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#online .cr-slot em { font: 700 11px var(--u-disp); letter-spacing: .04em; font-style: normal; padding: 3px 7px; border-radius: 10px; background: rgba(255,255,255,.08); color: #cfd6ea; white-space: nowrap; flex: none; }
#online .cr-slot em.ok { background: rgba(80,200,120,.25); color: #9fe3a0; } #online .cr-slot em.host { background: rgba(255,200,90,.2); color: #ffd36a; }
#online .cr-slot.me { box-shadow: inset 0 0 0 2px #ffd36a, 0 0 12px rgba(255,200,90,.35); }
#online .cr-slot.empty { background: rgba(8,12,30,.5); } #online .cr-slot.empty.can { cursor: pointer; } #online .cr-slot.empty.can:active { transform: scale(.98); }
#online .cr-slot.bot .t b { color: #b9c3dd; font-weight: 600; }
#online .ol-acts { display: flex; gap: 6px; margin-top: auto; flex: none; } #online .ol-acts button { height: 40px; } #online .ol-acts .big { flex: 1; min-width: 0; font-size: 15px; padding: 0 6px; }
#online .ol-acts .btn-ghost { flex: none; padding: 0 10px; font-size: 13px; }
#online .ol-main.in .ol-box:last-child { gap: 6px; } #online .ol-main.in .ol-row > span { min-width: 0; width: 100%; font-size: 11.5px; margin-bottom: -4px; }
#online .ol-main.in .seg button { padding: 4px 8px; font-size: 12px; }
@media (max-width: 520px) { #online .ol-main, #online .ol-main.in { grid-template-columns: 1fr; grid-template-rows: auto; overflow: auto; } }
`;
let cssDone = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openOnline(nav) {
  if (!cssDone) { const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); cssDone = true; }
  stageOn(false); S.mode = 'custom';
  const p = profile();
  wakeServer(); // máy chủ miễn phí đang ngủ thì bắt đầu thức dậy ngay khi mở màn
  let closed = false, waking = false, editSrv = false;
  let mode = '5v5', bots = true, diff = DIFFICULTY[p.diff] ? p.diff : 'normal', code = '';
  const el = document.createElement('div'); el.id = 'online'; el.className = 'scr';
  el.style.backgroundImage = 'url(./assets/ui/room.jpg)';
  document.getElementById('ui').append(el);
  const $ = (s) => el.querySelector(s);
  const room = () => (net.room?.kind === 'custom' && net.room.state === 'lobby' ? net.room : null);
  const host = () => room()?.you === 0;

  const statusHtml = () => {
    const c = net.conn;
    return `<i class="${c?.open ? 'on' : ''}"></i>${c?.open ? `Đã nối máy chủ${c.rtt ? ` · ${Math.round(c.rtt)} ms` : ''}` : connecting() ? (waking ? 'Đang đánh thức máy chủ (tối đa ~1 phút)…' : 'Đang kết nối…') : 'Chưa kết nối'}`;
  };
  const segHtml = (key, items, cur, off) => `<div class="seg" data-seg="${key}">${items.map(([k, n]) => `<button type="button" data-v="${k}" class="${k === cur ? 'on' : ''}" ${off ? 'disabled' : ''}>${n}</button>`).join('')}</div>`;
  const optsHtml = (m, b, d, off) => `
    <div class="ol-row"><span>Bản đồ</span>${segHtml('mode', [['1v1', '1v1'], ['5v5', '5v5']], m, off)}</div>
    <div class="ol-row"><span>Thêm máy</span>${segHtml('bots', [['on', 'Bật'], ['off', 'Tắt']], b ? 'on' : 'off', off)}</div>
    ${b ? `<div class="ol-row"><span>Độ khó máy</span>${segHtml('diff', Object.entries(DIFFICULTY).map(([k, x]) => [k, x.name]), d, off)}</div>` : ''}`;

  function slotHtml(r, team, slot) {
    const i = r.players.findIndex((x) => x.team === team && x.slot === slot), pl = r.players[i];
    if (pl) {
      const tag = pl.host ? '<em class="host">Chủ phòng</em>' : pl.ready ? '<em class="ok">Sẵn sàng ✓</em>' : '<em>Chưa sẵn sàng</em>';
      return `<div class="cr-slot ${i === r.you ? 'me' : ''}">${pl.avatar ? face(pl.avatar) : '<i class="ph">?</i>'}<div class="t"><b>${esc(pl.name)}${i === r.you ? ' (bạn)' : ''}</b><small>${pl.online ? '' : 'Mất kết nối'}</small></div>${tag}</div>`;
    }
    const me = r.players[r.you], can = !me.ready || me.host;
    return `<button type="button" class="cr-slot empty ${r.bots ? 'bot' : ''} ${can ? 'can' : ''}" data-seat="${team},${slot}"><i class="ph">${r.bots ? '⚙' : '+'}</i><div class="t"><b>${r.bots ? `Máy · ${DIFFICULTY[r.difficulty].name}` : 'Trống'}</b><small>Chạm để vào ô này</small></div></button>`;
  }
  function render() {
    const r = room();
    const head = `<div class="ol-head"><button type="button" class="ui-back" data-a="back" aria-label="Quay lại">${ICON.back()}</button><h2 class="gt">Phòng tuỳ chỉnh</h2>
      ${r ? `<span class="ol-code"><small>Mã<br>phòng</small><b>${r.code}</b><button type="button" class="btn-ghost" data-a="copy">Chép</button></span>` : ''}<span class="ol-st">${statusHtml()}</span></div>`;
    if (r) {
      const me = r.players[r.you], others = r.players.filter((x, i) => i > 0), allReady = others.every((x) => x.ready);
      const okTeams = r.bots || ([0, 1].every((t) => r.players.some((x) => x.team === t)));
      const startTxt = !allReady ? 'Chờ sẵn sàng…' : !okTeams ? 'Mỗi đội cần 1 người' : 'Bắt đầu';
      const col = (t) => `<div class="cr-team ${t ? 'r' : 'b'}"><h4>${t ? 'Đội Đỏ' : 'Đội Xanh'}</h4>${Array.from({ length: r.size }, (_, s) => slotHtml(r, t, s)).join('')}</div>`;
      el.innerHTML = head + `<div class="ol-main in">
        <div class="ol-box fr"><div class="cr-teams">${col(0)}<b class="cr-vs gt">VS</b>${col(1)}</div></div>
        <div class="ol-box fr pin"><div class="ol-scroll"><h4>Tuỳ chọn phòng</h4>${optsHtml(r.mode, r.bots, r.difficulty, !host())}
          <p class="ol-tip">${r.players.length}/${r.size * 2} người. ${r.bots ? 'Máy chơi các ô trống.' : 'Tắt máy: chỉ người trong phòng vào trận.'}${host() ? '' : ' Chỉ chủ phòng đổi tuỳ chọn.'}</p></div>
          <div class="ol-acts">${host()
            ? `<button type="button" class="btn-gold big" data-a="start" ${allReady && okTeams ? '' : 'disabled'}>${startTxt}</button>`
            : `<button type="button" class="${me.ready ? 'btn-blue' : 'btn-gold'} big" data-a="ready">${me.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'}</button>`}
            <button type="button" class="btn-ghost" data-a="leave">Rời</button></div></div></div>`;
      return;
    }
    const saved = savedMatch(), busy = connecting();
    el.innerHTML = head + `<div class="ol-main">
      <div class="ol-box fr pin"><div class="ol-scroll"><h4>Tạo phòng</h4>${optsHtml(mode, bots, diff, false)}
        <p class="ol-tip">Tạo xong gửi <b>mã phòng</b> cho bạn bè. Tối đa ${mode === '5v5' ? '10' : '2'} người, chọn tướng sau khi chủ phòng bấm Bắt đầu.</p></div>
        <button type="button" class="btn-gold big" data-a="create" ${busy ? 'disabled' : ''}>Tạo phòng</button></div>
      <div class="ol-box fr">
        ${saved ? `<div class="ol-rejoin"><span>Trận đang dở · phòng <b>${esc(saved.code)}</b></span><button type="button" class="btn-gold" data-a="rejoin">Vào lại trận</button></div>` : ''}
        <h4>Vào phòng của bạn</h4>
        <div class="ol-row"><input id="olCode" class="code" maxlength="4" value="${esc(code)}" placeholder="MÃ" autocomplete="off" spellcheck="false"><button type="button" class="btn-blue" data-a="join" ${busy ? 'disabled' : ''}>Vào phòng</button></div>
        <p class="ol-tip">Nhập mã 4 ký tự bạn bè gửi. Muốn ghép ngẫu nhiên với người lạ: Đấu thường / Đấu hạng ở sảnh.</p>
        <div class="ol-srv">${editSrv ? `<input id="olUrl" value="${esc(net.url)}" placeholder="vd. 192.168.1.5:8787 hoặc wss://ten-may-chu.onrender.com" autocomplete="off" spellcheck="false"><button type="button" class="btn-blue" data-a="srvok">Lưu</button>`
          : `Máy chủ: <code>${esc(net.url || '(chưa đặt)')}</code><button type="button" class="btn-ghost" data-a="srv">Đổi</button>`}</div>
      </div></div>`;
  }
  render();
  const rttT = setInterval(() => { const s = $('.ol-st'); if (s) s.innerHTML = statusHtml(); }, 2000);
  const off = onNet((ev, m) => {
    if (closed) return;
    if (ev === 'wake') { waking = true; render(); }
    else if (ev === 'room') {
      if (m.kind === 'custom' && (m.state === 'pick' || m.state === 'ready')) { nav.go('pick', { mode: 'custom' }); return; } // chủ phòng đã bắt đầu
      render();
    } else if (ev === 'drop') { toast('Mất kết nối máy chủ'); render(); }
  });

  async function ensureConn() {
    render();
    try { const c = await lobbyConn(); return c; } catch (e) { if (!closed) toast(`${e.message} (${net.url || 'chưa đặt máy chủ'})`, 3500); return null; } finally { waking = false; if (!closed) render(); }
  }
  el.onclick = async (e) => {
    const seat = e.target.closest('[data-seat]');
    if (seat) { const [t, s] = seat.dataset.seat.split(',').map(Number); if (room()?.players[room().you].ready && !host()) { toast('Huỷ sẵn sàng để đổi chỗ'); return; } send({ t: 'seat', team: t, slot: s }); return; }
    const sg = e.target.closest('[data-seg] button');
    if (sg) {
      const k = sg.parentElement.dataset.seg, v = sg.dataset.v;
      if (room()) { if (host()) send({ t: 'opts', ...(k === 'mode' ? { mode: v } : k === 'bots' ? { bots: v === 'on' } : { difficulty: v }) }); return; }
      if (k === 'mode') mode = v; else if (k === 'bots') bots = v === 'on'; else diff = v;
      render(); return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'back') { nav.go('home'); return; }
    if (a === 'srv') { editSrv = true; render(); $('#olUrl')?.focus(); return; }
    if (a === 'srvok') { const v = $('#olUrl').value.trim(); netCancel(); net.conn?.close(); net.conn = null; net.room = null; setServer(v); wakeServer(); editSrv = false; render(); return; }
    if (a === 'rejoin') { await rejoinSaved(() => render()); return; }
    if (a === 'create') { if (!(await ensureConn()) || closed) return; send({ t: 'create', mode, bots, difficulty: diff, name: p.name, avatar: p.avatar }); }
    else if (a === 'join') {
      code = ($('#olCode')?.value || '').trim().toUpperCase(); if (code.length !== 4) { toast('Nhập mã phòng 4 ký tự'); return; }
      if (!(await ensureConn()) || closed) return; send({ t: 'join', code, name: p.name, avatar: p.avatar });
    } else if (a === 'ready') send({ t: 'ready', on: !room().players[room().you].ready });
    else if (a === 'start') send({ t: 'start' });
    else if (a === 'leave') { netLeave(); render(); }
    else if (a === 'copy') { const c = room()?.code; try { await navigator.clipboard.writeText(c); toast('Đã chép mã phòng'); } catch (_) { toast(`Mã phòng: ${c}`); } }
  };
  el.oninput = (e) => { if (e.target.id === 'olCode') { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); code = e.target.value; } };
  window.__online = { get room() { return room(); }, get conn() { return net.conn; }, render }; // kiểm thử tự động (b_fit: vẽ lại sau khi gán phòng giả)
  return () => {
    closed = true; clearInterval(rttT); off();
    const going = net.room && (net.room.state === 'pick' || net.room.state === 'ready'); // sang màn chọn tướng: giữ phòng
    if (!going && !net.started) { netCancel(); netLeave(); }
    el.remove();
  };
}
