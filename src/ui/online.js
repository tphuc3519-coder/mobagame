// Phòng tuỳ chỉnh (trực tuyến, chơi cùng bạn bè thật). Chưa vào phòng: cột trái Tạo phòng — hai thẻ bản đồ có sơ đồ (5v5 ba đường / 1v1
// một đường), công tắc "Máy điền chỗ trống", độ khó máy; cột phải Vào phòng — 4 ô mã (gõ đủ 4 ký tự là vào luôn; dán cả link mời cũng
// được), trận đang dở thì có nút Vào lại trận. Trong phòng: MÃ PHÒNG trên đầu (chạm để chép) + nút Mời (chia sẻ link ?room=MÃ — bạn mở
// link là vào thẳng phòng), hai cột Đội Xanh / Đội Đỏ — mỗi đội 5 ô (1v1: 1 ô), chạm ô trống để đổi chỗ / đổi đội; ô trống ghi "Máy" khi
// bật máy, "Trống" khi tắt. Cột phải: tuỳ chọn phòng (chủ phòng đổi được), Sẵn sàng / Bắt đầu, Rời phòng. Chủ phòng bắt đầu khi mọi người
// Sẵn sàng → màn chọn tướng trực tuyến → trận. Máy chủ: server/rooms.mjs (docs/ONLINE.md). Kết nối dùng chung: ui/netLobby.js.
import { DIFFICULTY } from '../data/ai.js';
import { ICON, face, toast } from './kit.js';
import { profile } from './profile.js';
import { stageOn } from './stage.js';
import { S, MODES } from './modes.js';
import { NET } from '../net/protocol.js';
import { DEFAULT_SERVER, sameOrigin } from '../net/client.js';
import { net, onNet, lobbyConn, connecting, netCancel, netLeave, send, setServer, wakeServer, savedMatch, rejoinSaved } from './netLobby.js';

const CSS = `
#online { background: #0f0b09 center/cover no-repeat; display: flex; flex-direction: column; padding: var(--t) var(--r) var(--b) var(--l); box-sizing: border-box; gap: 8px; }
#online::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(12,8,7,.55), rgba(12,8,7,.82)); pointer-events: none; }
#online > * { position: relative; }
#online .ol-head { display: flex; align-items: center; gap: 10px; min-height: 40px; min-width: 0; }
#online .ol-head h2 { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; font: 800 clamp(20px, calc(6.4 * var(--vh, 1vh)), 26px)/1.1 var(--u-disp); white-space: nowrap; }
#online .ol-st { margin-left: auto; font: 600 12px var(--u-body); color: var(--u-dim); display: flex; align-items: center; gap: 6px; white-space: nowrap; flex: none; }
#online .ol-st i { width: 9px; height: 9px; border-radius: 50%; background: #6f604f; border: 1px solid var(--line); flex: none; }
#online .ol-st i.on { background: var(--c-grn); } #online .ol-st i.wait { background: var(--c-yel); animation: olBlink 1s steps(2) infinite; }
@keyframes olBlink { 50% { opacity: .35; } }
/* mã phòng trên đầu (trong phòng): chạm số để chép, nút Mời chia sẻ link */
#online .ol-code { display: flex; align-items: center; gap: 8px; flex: none; padding: 3px 4px 3px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--g-head); box-shadow: var(--hl), 0 4px 12px rgba(0,0,0,.28); }
#online .ol-code small { font: 700 10px/1.05 var(--u-disp); color: var(--u-dim); text-transform: uppercase; }
#online .ol-code .ol-cd { border: 0; background: none; padding: 0 2px; font: 800 clamp(22px, calc(7 * var(--vh, 1vh)), 28px)/1 var(--u-disp); letter-spacing: .18em; color: var(--c-yel);  }
#online .ol-code .sh { height: 32px; padding: 0 12px 0 9px; font-size: 15px; gap: 5px; border-radius: 10px; } #online .ol-code .sh svg { width: 17px; height: 17px; }
#online .ol-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 12px; }
#online .ol-main.in { grid-template-columns: minmax(0, 1fr) clamp(196px, calc(27 * var(--vw, 1vw)), 270px); }
#online .ol-box { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: auto; }
#online .ol-box.pin { overflow: hidden; } #online .ol-box.pin > .btn-gold { flex: none; } /* nút chính ghim đáy khung, phần trên tự cuộn khi thiếu chỗ */
#online .ol-scroll { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: inherit; overscroll-behavior: contain; }
#online .ol-box h4 { margin: 0; display: flex; align-items: center; gap: 8px; font: 800 14px/1 var(--u-disp); color: var(--c-yel); white-space: nowrap; }
#online .ol-box h4::after { content: ''; flex: 1; height: 3px; border-radius: 2px; background: var(--ink); }
#online .ol-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } #online .ol-row > span { font: 700 13px var(--u-disp); color: #e9dcc1; min-width: 74px; }
#online .ol-row > span small { display: block; font: 500 11px/1.2 var(--u-body); color: var(--u-dim); }
#online .ol-row.sw-row > span { flex: 1; }
#online .seg { display: inline-flex; border-radius: 12px; background: var(--ink); padding: 3px; gap: 2px; flex-wrap: wrap; }
#online .seg button { border: 0; background: none; padding: 5px 10px; border-radius: 9px; font: 700 13px/1.1 var(--u-disp); color: #cdbe9f; }
#online .seg button.on { background: var(--g-yel); color: var(--ink); }
#online .seg button:disabled { opacity: .55; } #online .seg button.on:disabled { opacity: .8; }
/* công tắc bật / tắt (giống Cài đặt) */
#online .ol-sw { flex: none; position: relative; width: 54px; height: 30px; box-sizing: border-box; border: 1px solid var(--line); border-radius: 15px; background: var(--g-head); padding: 0; transition: background .14s; }
#online .ol-sw i { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; box-sizing: border-box; border-radius: 50%; border: 1px solid var(--line); background: #b9a888; transition: left .14s, background .14s; }
#online .ol-sw.on { background: var(--g-grn); } #online .ol-sw.on i { left: 26px; background: #fff; }
#online .ol-sw:disabled { opacity: .6; }
/* thẻ bản đồ (chưa vào phòng) */
#online .cr-maps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
#online .cr-map { position: relative; display: flex; align-items: center; gap: 9px; min-width: 0; padding: 7px 9px 7px 7px; text-align: left; border: 1px solid var(--line); border-radius: 12px; background: var(--g-card); box-shadow: var(--hl), 0 4px 12px rgba(0,0,0,.28); color: inherit; }
#online .cr-map svg { flex: none; width: clamp(44px, calc(14 * var(--vh, 1vh)), 56px); height: clamp(44px, calc(14 * var(--vh, 1vh)), 56px); }
#online .cr-map div { min-width: 0; } #online .cr-map b { display: block; font: 800 21px/1 var(--u-disp); color: #fff;  }
#online .cr-map small { display: block; margin-top: 3px; font: 600 11px/1.25 var(--u-body); color: var(--u-dim); }
#online .cr-map.on { background: var(--g-me); box-shadow: 0 0 0 2px var(--gold), 0 4px 12px rgba(0,0,0,.28); } #online .cr-map.on b { color: var(--c-yel); }
#online .cr-map.on::after { content: '✓'; position: absolute; top: -9px; right: -8px; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--c-yel); border: 1px solid var(--line); color: var(--ink); font: 800 12px/1 var(--u-disp); }
#online .cr-map:active { transform: translateY(2px); }
/* 4 ô mã phòng: một ô nhập thật (trong suốt) phủ lên 4 ô vẽ — bàn phím, dán, tự điền đều chạy như ô nhập thường */
#online .otp { position: relative; display: block; width: 100%; margin: 0; }
#online .otp input { position: absolute; inset: 0; width: 100%; height: 100%; box-sizing: border-box; padding: 0; margin: 0; border: 0; outline: 0; background: transparent; color: transparent; caret-color: transparent; font-size: 16px; opacity: .01; }
#online .otp .bx { display: flex; justify-content: center; gap: 10px; pointer-events: none; }
#online .otp .bx i { position: relative; flex: 1; max-width: 64px; height: clamp(48px, calc(15.5 * var(--vh, 1vh)), 60px); box-sizing: border-box; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 12px; background: var(--g-head); box-shadow: var(--hl), 0 4px 12px rgba(0,0,0,.28);
  font: 800 clamp(24px, calc(8 * var(--vh, 1vh)), 30px)/1 var(--u-disp); font-style: normal; color: var(--c-yel); }
#online .otp.focus .bx i.ol-at { box-shadow: 0 0 0 2px var(--gold), 0 4px 12px rgba(0,0,0,.28); }
#online .otp.focus .bx i.ol-at:empty::before { display: none; }
#online .otp.focus .bx i.ol-at:empty::after { content: ''; width: 3px; height: 50%; border-radius: 2px; background: var(--c-yel); animation: olBlink 1s steps(2) infinite; }
#online .otp .bx i:empty::before { content: ''; position: absolute; left: 30%; right: 30%; bottom: 22%; height: 3px; border-radius: 2px; background: rgba(203,187,155,.3); }
#online .otp.bad .bx { animation: olShake .35s; } @keyframes olShake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
#online .ol-join { display: flex; flex-direction: column; gap: 10px; margin: auto 0; padding: 0 4px; }
#online .ol-join .btn-blue { width: 100%; max-width: calc(4 * 64px + 30px); align-self: center; }
#online .ol-join .ol-tip { text-align: center; }
#online .ol-tip { font: 500 11.5px/1.45 var(--u-body); color: var(--u-dim); margin: 0; } #online .ol-tip b { color: #fff; }
#online .ol-srv { display: flex; align-items: center; gap: 6px; font: 600 11px var(--u-body); color: var(--u-dim); margin-top: auto; min-height: 26px; }
#online .ol-srv code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cdbe9f; font: 600 11px var(--u-body); }
#online .ol-srv input { flex: 1; min-width: 0; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--ink); color: #fff; font: 600 13px var(--u-body); outline: none; user-select: text; -webkit-user-select: text; }
#online .ol-srv input:focus { box-shadow: 0 0 0 2px var(--c-yel); }
#online .ol-srv button { height: 28px; padding: 0 10px; font-size: 12.5px; border-radius: 9px; }
#online .ol-rejoin { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--g-tb); box-shadow: 0 0 0 2px var(--c-yel); font: 600 13px var(--u-body); color: #fff; }
#online .ol-rejoin span { flex: 1; min-width: 0; } #online .ol-rejoin .btn-gold { height: 34px; padding: 0 12px; font-size: 15px; }
#online .btn-gold.big, #online .btn-blue.big { height: clamp(40px, calc(12 * var(--vh, 1vh)), 46px); font-size: 18px; }
#online .ol-busy { display: inline-block; width: 15px; height: 15px; box-sizing: border-box; border-radius: 50%; border: 3px solid rgba(8,5,4,.3); border-top-color: currentColor; animation: spin .8s linear infinite; }
/* trong phòng: hai đội */
#online .cr-teams { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: center; min-height: 0; overflow: auto; margin: auto 0; } /* màn cao (máy tính bảng): hai đội nằm giữa khung */
#online .cr-team { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
#online .cr-team h4 { justify-content: center; margin: 0 0 2px; font-size: 14px; } #online .cr-team h4::after { display: none; }
#online .cr-team.b h4 { color: #9db8e0; } #online .cr-team.r h4 { color: #e8957f; }
#online .cr-vs { font: 900 clamp(22px, calc(7 * var(--vh, 1vh)), 34px)/1 var(--u-disp); }
#online .cr-slot { display: flex; align-items: center; gap: 8px; padding: 0 8px 0 4px; height: clamp(38px, calc(10.6 * var(--vh, 1vh)), 58px); box-sizing: border-box; border: 1px solid var(--line); border-radius: 11px; text-align: left; color: inherit; background: var(--g-tb); box-shadow: var(--hl), 0 2px 8px rgba(0,0,0,.28); min-width: 0; }
#online .cr-team.r .cr-slot { background: var(--g-tr); }
#online .cr-slot .face, #online .cr-slot .ph, #online .cr-slot .ini { width: clamp(28px, calc(8.2 * var(--vh, 1vh)), 44px); height: clamp(28px, calc(8.2 * var(--vh, 1vh)), 44px); border-radius: 7px; object-fit: cover; flex: none; box-sizing: border-box; border: 1px solid var(--line); }
#online .cr-slot .ph { display: grid; place-items: center; background: rgba(8,5,4,.35); font: 800 15px var(--u-disp); color: rgba(242,231,208,.6); border: 2px dashed rgba(203,187,155,.45); font-style: normal; }
#online .cr-slot .t { flex: 1; min-width: 0; } #online .cr-slot .t b { display: block; font: 700 13.5px/1.15 var(--u-body); color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#online .cr-slot .t small { display: block; font: 600 11px/1.2 var(--u-body); color: var(--u-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #online .cr-slot .t small.off { color: #eba595; }
#online .cr-slot em { font: 700 11px/1 var(--u-disp); font-style: normal; padding: 4px 7px; border-radius: 8px; background: rgba(8,5,4,.55); color: #cdbe9f; white-space: nowrap; flex: none; }
#online .cr-slot em.ok { background: var(--c-grn); color: var(--ink); } #online .cr-slot em.host { background: var(--c-yel); color: var(--ink); }
#online .cr-slot.me { box-shadow: 0 0 0 2px var(--gold), 0 2px 8px rgba(0,0,0,.28); }
#online .cr-slot.empty { background: rgba(8,5,4,.55); border-style: dashed; border-color: rgba(216,180,104,.4); box-shadow: none; }
#online .cr-team.r .cr-slot.empty { background: rgba(8,5,4,.55); } #online .cr-slot.empty.can { cursor: pointer; } #online .cr-slot.empty.can:active { transform: scale(.98); }
#online .cr-slot.bot .t b { color: #cbbb9b; font-weight: 600; }
#online .ol-acts { display: flex; gap: 6px; margin-top: auto; flex: none; } #online .ol-acts button { height: 40px; } #online .ol-acts .big { flex: 1; min-width: 0; font-size: 16px; padding: 0 6px; }
#online .ol-acts .btn-ghost { flex: none; padding: 0 12px; font-size: 14px; }
#online .ol-main.in .ol-box:last-child { gap: 7px; } #online .ol-main.in .ol-row:not(.sw-row) > span { min-width: 0; width: 100%; font-size: 12px; margin-bottom: -4px; }
#online .ol-main.in .seg button { padding: 4px 8px; font-size: 12.5px; }
@media (max-width: 520px) { #online .ol-main, #online .ol-main.in { grid-template-columns: 1fr; grid-template-rows: auto; overflow: auto; } }
`;
let cssDone = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Mã phòng trong chữ người dùng gõ / dán (dán cả link mời "…?room=AB7K" cũng nhận). */
export function parseCode(raw) {
  const s = String(raw || ''), link = s.match(/[?&#]room=([a-z0-9]{4})\b/i);
  return (link ? link[1] : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}
/** Link mời vào phòng: trang hiện tại + ?room=MÃ (máy chủ khác mặc định thì kèm ?server= để bạn nối cùng máy chủ). */
export function inviteUrl(code, url = net.url) {
  const u = new URL(location.href), q = new URLSearchParams(), srv = u.searchParams.get('server');
  if (srv && srv !== 'off') q.set('server', srv); else if (url && url !== DEFAULT_SERVER && url !== sameOrigin()) q.set('server', url);
  q.set('room', code); u.search = q.toString(); u.hash = '';
  return u.toString();
}

// sơ đồ bản đồ (nhà Xanh dưới trái, nhà Đỏ trên phải, sông chéo): 5v5 ba đường + rừng, 1v1 một đường
const MAP_BASE = '<rect x="1.5" y="1.5" width="61" height="61" rx="11" fill="#1f4a33" stroke="#0f1729" stroke-width="3"/><path d="M7 7 57 57" stroke="#3d8fc4" stroke-width="7" stroke-linecap="round" opacity=".9"/>';
const MAP_ENDS = '<circle cx="13" cy="51" r="6.5" fill="#4aa8ff" stroke="#0f1729" stroke-width="2.5"/><circle cx="51" cy="13" r="6.5" fill="#ff5a5f" stroke="#0f1729" stroke-width="2.5"/>';
const MAP_SVG = {
  '5v5': `<svg viewBox="0 0 64 64" aria-hidden="true">${MAP_BASE}<g fill="#2f6b45"><circle cx="21" cy="31" r="4.5"/><circle cx="31" cy="21" r="4.5"/><circle cx="43" cy="33" r="4.5"/><circle cx="33" cy="43" r="4.5"/></g>
    <path d="M13 51V13h38M13 51h38V13M13 51 51 13" fill="none" stroke="#f0d999" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>${MAP_ENDS}</svg>`,
  '1v1': `<svg viewBox="0 0 64 64" aria-hidden="true">${MAP_BASE}<g fill="#2f6b45"><circle cx="24" cy="30" r="4"/><circle cx="40" cy="34" r="4"/><circle cx="30" cy="44" r="3.5"/><circle cx="34" cy="20" r="3.5"/></g>
    <path d="M13 51 51 13" fill="none" stroke="#f0d999" stroke-width="5" stroke-linecap="round"/>${MAP_ENDS}</svg>`,
};
const MAP_INFO = { '5v5': { name: MODES.normal.mapName, sub: '10 người · 3 đường' }, '1v1': { name: MODES.solo.mapName, sub: '2 người · 1 đường' } };
const srvHost = (u) => { try { return new URL(u).host; } catch (_) { return u; } };

export function openOnline(nav, args = {}) {
  if (!cssDone) { const st = document.createElement('style'); st.textContent = CSS; document.head.append(st); cssDone = true; }
  stageOn(false); S.mode = 'custom';
  const p = profile();
  wakeServer(); // máy chủ miễn phí đang ngủ thì bắt đầu thức dậy ngay khi mở màn
  let closed = false, waking = false, editSrv = false, joining = false, joinAt = -1e9;
  let mode = '5v5', bots = true, diff = DIFFICULTY[p.diff] ? p.diff : 'normal', code = parseCode(args.join);
  const el = document.createElement('div'); el.id = 'online'; el.className = 'scr';
  el.style.setProperty('--bg', 'url(./assets/ui/room.jpg)'); // css.js: phủ lớp ngả ấm (UI v5)
  document.getElementById('ui').append(el);
  const $ = (s) => el.querySelector(s);
  const room = () => (net.room?.kind === 'custom' && net.room.state === 'lobby' ? net.room : null);
  const host = () => room()?.you === 0;

  const statusHtml = () => {
    const c = net.conn;
    return `<i class="${c?.open ? 'on' : connecting() ? 'wait' : ''}"></i>${c?.open ? `Đã nối máy chủ${c.rtt ? ` · ${Math.round(c.rtt)} ms` : ''}` : connecting() ? (waking ? 'Đang đánh thức máy chủ (tối đa ~1 phút)…' : 'Đang kết nối…') : 'Chưa kết nối'}`;
  };
  const segHtml = (key, items, cur, off) => `<div class="seg" data-seg="${key}">${items.map(([k, n]) => `<button type="button" data-v="${k}" class="${k === cur ? 'on' : ''}" ${off ? 'disabled' : ''}>${n}</button>`).join('')}</div>`;
  const swHtml = (key, on, off) => `<button type="button" class="ol-sw ${on ? 'on' : ''}" data-sw="${key}" aria-pressed="${on}" aria-label="Máy điền chỗ trống" ${off ? 'disabled' : ''}><i></i></button>`;
  const botRows = (b, d, off) => `<div class="ol-row sw-row"><span>Máy điền chỗ trống<small>${b ? 'Ô không có người do máy chơi' : 'Chỉ người trong phòng vào trận'}</small></span>${swHtml('bots', b, off)}</div>
    ${b ? `<div class="ol-row"><span>Độ khó máy</span>${segHtml('diff', Object.entries(DIFFICULTY).map(([k, x]) => [k, x.name]), d, off)}</div>` : ''}`;
  const mapTile = (m) => `<button type="button" class="cr-map ${m === mode ? 'on' : ''}" data-map="${m}" aria-pressed="${m === mode}">${MAP_SVG[m]}<div><b>${m}</b><small>${MAP_INFO[m].name}<br>${MAP_INFO[m].sub}</small></div></button>`;
  const otpHtml = () => `<label class="otp" for="olCode"><input id="olCode" value="${esc(code)}" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Mã phòng 4 ký tự">
    <span class="bx">${[0, 1, 2, 3].map((i) => `<i class="${i === Math.min(code.length, 3) ? 'ol-at' : ''}">${esc(code[i] || '')}</i>`).join('')}</span></label>`;
  /** Vẽ lại 4 ô mã tại chỗ (không dựng lại cả màn — giữ bàn phím đang mở). */
  const otpPaint = () => {
    el.querySelectorAll('.otp .bx i').forEach((c, i) => { c.textContent = code[i] || ''; c.classList.toggle('ol-at', i === Math.min(code.length, 3)); });
  };

  function slotHtml(r, team, slot) {
    const i = r.players.findIndex((x) => x.team === team && x.slot === slot), pl = r.players[i];
    if (pl) {
      const tag = pl.host ? '<em class="host">Chủ phòng</em>' : pl.ready ? '<em class="ok">Sẵn sàng ✓</em>' : '<em>Chưa sẵn sàng</em>';
      return `<div class="cr-slot ${i === r.you ? 'me' : ''}">${pl.avatar ? face(pl.avatar) : '<i class="ph">?</i>'}<div class="t"><b>${esc(pl.name)}${i === r.you ? ' (bạn)' : ''}</b>${pl.online ? '' : '<small class="off">Mất kết nối</small>'}</div>${tag}</div>`;
    }
    const me = r.players[r.you], can = !me.ready || me.host;
    return `<button type="button" class="cr-slot empty ${r.bots ? 'bot' : ''} ${can ? 'can' : ''}" data-seat="${team},${slot}"><i class="ph">${r.bots ? '⚙' : '+'}</i><div class="t"><b>${r.bots ? `Máy · ${DIFFICULTY[r.difficulty].name}` : 'Trống'}</b><small>Chạm để vào ô này</small></div></button>`;
  }
  function render() {
    const r = room();
    const head = `<div class="ol-head"><button type="button" class="ui-back" data-a="back" aria-label="Quay lại">${ICON.back()}</button><h2 class="gt">Phòng tuỳ chỉnh</h2>
      ${r ? `<span class="ol-code"><small>Mã<br>phòng</small><button type="button" class="ol-cd" data-a="copy" aria-label="Chép mã phòng">${r.code}</button><button type="button" class="btn-gold sh" data-a="share">${ICON.share()}Mời</button></span>` : ''}<span class="ol-st">${statusHtml()}</span></div>`;
    if (r) {
      const me = r.players[r.you], others = r.players.filter((x, i) => i > 0), allReady = others.every((x) => x.ready);
      const okTeams = r.bots || ([0, 1].every((t) => r.players.some((x) => x.team === t)));
      const startTxt = !allReady ? 'Chờ sẵn sàng…' : !okTeams ? 'Mỗi đội cần 1 người' : 'Bắt đầu';
      const col = (t) => `<div class="cr-team ${t ? 'r' : 'b'}"><h4>${t ? 'Đội Đỏ' : 'Đội Xanh'}</h4>${Array.from({ length: r.size }, (_, s) => slotHtml(r, t, s)).join('')}</div>`;
      const empty = r.size * 2 - r.players.length;
      el.innerHTML = head + `<div class="ol-main in">
        <div class="ol-box fr"><div class="cr-teams">${col(0)}<b class="cr-vs gt">VS</b>${col(1)}</div></div>
        <div class="ol-box fr pin"><div class="ol-scroll"><h4>Tuỳ chọn phòng</h4>
          <div class="ol-row"><span>Bản đồ</span>${segHtml('mode', [['1v1', '1v1'], ['5v5', '5v5']], r.mode, !host())}</div>${botRows(r.bots, r.difficulty, !host())}
          <p class="ol-tip"><b>${r.players.length}/${r.size * 2}</b> người.${empty ? ` Bấm <b>Mời</b> gửi link cho bạn bè — mở link là vào phòng.` : ''}${host() ? '' : ' Chỉ chủ phòng đổi tuỳ chọn.'}</p></div>
          <div class="ol-acts">${host()
            ? `<button type="button" class="btn-gold big" data-a="start" ${allReady && okTeams ? '' : 'disabled'}>${startTxt}</button>`
            : `<button type="button" class="${me.ready ? 'btn-blue' : 'btn-gold'} big" data-a="ready">${me.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'}</button>`}
            <button type="button" class="btn-ghost" data-a="leave">Rời</button></div></div></div>`;
      return;
    }
    const saved = savedMatch(), busy = connecting() || joining;
    el.innerHTML = head + `<div class="ol-main">
      <div class="ol-box fr pin"><div class="ol-scroll"><h4>Tạo phòng</h4><div class="cr-maps">${mapTile('5v5')}${mapTile('1v1')}</div>${botRows(bots, diff, false)}
        <p class="ol-tip">Tạo xong bấm <b>Mời</b> gửi link cho bạn bè. Chủ phòng bấm Bắt đầu khi mọi người Sẵn sàng.</p></div>
        <button type="button" class="btn-gold big" data-a="create" ${busy ? 'disabled' : ''}>Tạo phòng</button></div>
      <div class="ol-box fr">
        ${saved ? `<div class="ol-rejoin"><span>Trận đang dở · phòng <b>${esc(saved.code)}</b></span><button type="button" class="btn-gold" data-a="rejoin">Vào lại</button></div>` : ''}
        <h4>Vào phòng bằng mã</h4>
        <div class="ol-join">${otpHtml()}<button type="button" class="btn-blue big" data-a="join" ${busy ? 'disabled' : ''}>${joining ? '<i class="ol-busy"></i>Đang vào…' : 'Vào phòng'}</button>
          <p class="ol-tip">Nhập mã 4 ký tự bạn bè gửi — hoặc mở <b>link mời</b> là vào thẳng phòng.</p></div>
        <div class="ol-srv">${editSrv ? `<input id="olUrl" value="${esc(net.url)}" placeholder="vd. 192.168.1.5:8787 hoặc wss://ten-may-chu.onrender.com" autocomplete="off" spellcheck="false"><button type="button" class="btn-blue" data-a="srvok">Lưu</button>`
          : `Máy chủ <code>${esc(net.url ? srvHost(net.url) : '(chưa đặt)')}</code><button type="button" class="btn-ghost" data-a="srv">Đổi</button>`}</div>
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
    } else if (ev === 'err') { if (!room() && performance.now() - joinAt < 8000) { const o = $('.otp'); if (o) { o.classList.remove('bad'); void o.offsetWidth; o.classList.add('bad'); } } } // mã sai / phòng đầy: rung 4 ô mã
    else if (ev === 'drop') { toast('Mất kết nối máy chủ'); render(); }
  });

  async function ensureConn() {
    render();
    try { const c = await lobbyConn(); return c; } catch (e) { if (!closed) toast(`${e.message} (${net.url || 'chưa đặt máy chủ'})`, 3500); return null; } finally { waking = false; if (!closed) render(); }
  }
  async function join() {
    if (room() || joining) return;
    if (code.length !== 4) { toast('Nhập đủ mã phòng 4 ký tự'); $('#olCode')?.focus(); return; }
    joining = true;
    try { if (!(await ensureConn()) || closed) return; joinAt = performance.now(); send({ t: 'join', v: NET.version, code, name: p.name, avatar: p.avatar, stars: p.stars }); }
    finally { joining = false; if (!closed && !room()) render(); }
  }
  async function share() {
    const c = room()?.code; if (!c) return;
    const url = inviteUrl(c), text = `Vào phòng ${c} chơi Lantern Arena cùng mình nhé!`;
    if (navigator.share) { try { await navigator.share({ title: 'Lantern Arena', text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Đã chép link mời — dán gửi bạn bè'); } catch (_) { toast(`Mã phòng: ${c}`, 3000); }
  }
  el.onclick = async (e) => {
    const seat = e.target.closest('[data-seat]');
    if (seat) { const [t, s] = seat.dataset.seat.split(',').map(Number); if (room()?.players[room().you].ready && !host()) { toast('Huỷ sẵn sàng để đổi chỗ'); return; } send({ t: 'seat', team: t, slot: s }); return; }
    const mp = e.target.closest('[data-map]'); if (mp) { mode = mp.dataset.map; render(); return; }
    const sw = e.target.closest('[data-sw]');
    if (sw) { if (room()) { if (host()) send({ t: 'opts', bots: !room().bots }); } else { bots = !bots; render(); } return; }
    const sg = e.target.closest('[data-seg] button');
    if (sg) {
      const k = sg.parentElement.dataset.seg, v = sg.dataset.v;
      if (room()) { if (host()) send({ t: 'opts', ...(k === 'mode' ? { mode: v } : { difficulty: v }) }); return; }
      if (k === 'diff') diff = v;
      render(); return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'back') { nav.go('home'); return; }
    if (a === 'srv') { editSrv = true; render(); $('#olUrl')?.focus(); return; }
    if (a === 'srvok') { const v = $('#olUrl').value.trim(); netCancel(); net.conn?.close(); net.conn = null; net.room = null; setServer(v); wakeServer(); editSrv = false; render(); return; }
    if (a === 'rejoin') { await rejoinSaved(() => render()); return; }
    if (a === 'create') { if (!(await ensureConn()) || closed) return; send({ t: 'create', v: NET.version, mode, bots, difficulty: diff, name: p.name, avatar: p.avatar, stars: p.stars }); }
    else if (a === 'join') join();
    else if (a === 'ready') send({ t: 'ready', on: !room().players[room().you].ready });
    else if (a === 'start') send({ t: 'start' });
    else if (a === 'leave') { netLeave(); render(); }
    else if (a === 'share') share();
    else if (a === 'copy') { const c = room()?.code; try { await navigator.clipboard.writeText(c); toast('Đã chép mã phòng'); } catch (_) { toast(`Mã phòng: ${c}`); } }
  };
  el.oninput = (e) => {
    if (e.target.id !== 'olCode') return;
    const before = code; code = parseCode(e.target.value); e.target.value = code; otpPaint();
    if (code.length === 4 && code !== before) { e.target.blur(); join(); } // gõ / dán đủ 4 ký tự (cả khi dán đè lên mã cũ): vào luôn
  };
  el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'olCode') { e.preventDefault(); e.target.blur(); join(); } else if (e.key === 'Enter' && e.target.id === 'olUrl') $('[data-a="srvok"]')?.click(); };
  el.addEventListener('focusin', (e) => { if (e.target.id === 'olCode') e.target.closest('.otp').classList.add('focus'); });
  el.addEventListener('focusout', (e) => { if (e.target.id === 'olCode') e.target.closest('.otp')?.classList.remove('focus'); });
  if (code.length === 4) join(); // mở link mời (?room=MÃ): vào phòng luôn
  window.__online = { get room() { return room(); }, get conn() { return net.conn; }, render }; // kiểm thử tự động (b_fit: vẽ lại sau khi gán phòng giả)
  return () => {
    closed = true; clearInterval(rttT); off();
    const going = net.room && (net.room.state === 'pick' || net.room.state === 'ready'); // sang màn chọn tướng: giữ phòng
    if (!going && !net.started) { netCancel(); netLeave(); }
    el.remove();
  };
}
