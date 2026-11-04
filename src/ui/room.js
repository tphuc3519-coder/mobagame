// Phòng chờ ghép trận (ảnh 3): nền 5 tướng nhìn về nhà chính, 5 ô người chơi (mình ở giữa, có hạng), cột phải danh sách bạn bè để mời
// (bạn bè cũng là máy — vào trận vẫn ghi "[Máy]"), nút Bắt đầu → đang tìm trận (đồng hồ, huỷ được) → "Đã tìm thấy trận": chấp nhận
// trong 12 giây, 10 ô sáng dần khi mọi người chấp nhận → màn chọn tướng (đấu hạng: cấm/chọn). 5v5: chọn vị trí dưới ô của mình (roleSelect.js);
// lúc tìm thấy trận chia vị trí (vị trí chính / phụ) cho mình, đồng đội và đối thủ.
// Chế độ trực tuyến (Đấu thường / Đấu hạng / Đỉnh cao — MODES.online): Bắt đầu = vào hàng chờ máy chủ (ui/netLobby.js). Máy chủ ưu tiên ghép
// người thật; người vào hàng sớm nhất chờ quá 60 giây thì ghép luôn, máy điền chỗ trống. Tìm thấy → Chấp nhận (chấm sáng theo người thật đã
// chấp nhận) → màn chọn tướng trực tuyến. Không nối được máy chủ (hoặc ?server=off) thì ghép với máy như chế độ Đấu máy. Bạn bè trong danh
// sách là máy nên không mời vào trận trực tuyến được — chơi cùng bạn thật: Phòng tuỳ chỉnh.
import { DIFFICULTY } from '../data/ai.js';
import { ICON, icon, face, rankBadge, stars, toast } from './kit.js';
import { profile, rankNow, peakNow, eventState } from './profile.js';
import { FRIENDS, statusText, chatLine, botNames, nearStars } from './people.js';
import { MODES, S, modeDiff } from './modes.js';
import { stageOn } from './stage.js';
import { roleChip, openRoleDialog } from './roleSelect.js';
import { assignRoles, roleIcon } from './roles.js';
import { ROLE_INFO } from '../data/roles.js';
import { DRAFT, DRAFT_NAME } from '../data/draft.js';
import { sfx } from '../audio/audio.js';
import { net, onNet, lobbyConn, netCancel, netLeave, send } from './netLobby.js';
import { NET } from '../net/protocol.js';

const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function openRoom(nav, { mode = S.mode } = {}) {
  const p = profile(), M = MODES[mode] || MODES.normal;
  if (S.mode !== mode) S.party = [];
  S.mode = mode; S.match = null; S.pick = null;
  stageOn(false);
  const el = document.createElement('div'); el.id = 'room'; el.className = 'scr';
  el.style.backgroundImage = 'url(./assets/ui/room.jpg)';
  document.getElementById('ui').append(el);
  const timers = new Set();
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const pending = new Map(); // bạn đang được mời → hẹn giờ trả lời
  let tab = 'fr', mm = null, foundEl = null;
  S.party = M.online ? [] : S.party.filter((f) => FRIENDS.includes(f)).slice(0, M.size - 1); // trực tuyến: không kéo bạn bè máy vào trận

  // thứ tự ô từ giữa ra hai bên: ô giữa là mình
  const order = M.size === 5 ? [3, 1, 4, 0] : [];
  const slotHtml = () => {
    const cells = Array.from({ length: M.size }, () => ({ kind: 'empty' }));
    const mid = Math.floor(M.size / 2); cells[mid] = { kind: 'me' };
    const members = [...S.party.map((f) => ({ kind: 'fr', f })), ...[...pending.keys()].map((f) => ({ kind: 'wait', f }))];
    members.forEach((m, i) => { if (order[i] !== undefined) cells[order[i]] = m; });
    return cells.map((c) => {
      if (c.kind === 'me') { const r = rankNow(); return `<div class="seat me"><div class="box fr hot">${face(p.avatar)}</div>${icon('star', 'host')}<b class="sn">${p.name}</b><span class="rk">${rankBadge(r, 22)}<em>${r.name}</em></span>${M.map === '5v5' ? roleChip(p) : ''}</div>`; }
      if (c.kind === 'fr') return `<div class="seat mate"><div class="box fr blue">${face(c.f.avatar)}</div>${mm ? '' : `<button type="button" class="kick" data-kick="${c.f.id}" aria-label="Mời ra">✕</button>`}<b class="sn">${c.f.name}</b><span class="rk">${rankBadge(c.f.rank, 22)}<em>${c.f.rank.name}</em></span></div>`;
      if (c.kind === 'wait') return `<div class="seat wait"><div class="box fr blue">${face(c.f.avatar)}</div><b class="sn">${c.f.name}</b><span class="rk">Đang mời…</span></div>`;
      return M.online ? `<div class="seat empty on"><div class="box" data-a="invite"><i class="plus">?</i></div><b class="sn">Ngẫu nhiên</b></div>`
        : `<div class="seat empty"><div class="box" data-a="invite"><i class="plus">+</i></div><b class="sn">Mời bạn</b></div>`;
    }).join('');
  };
  const listHtml = () => {
    if (tab === 'chat') return Array.from({ length: 8 }, (_, i) => { const [n, t] = chatLine(i); return `<div class="frow"><div><b>${n}</b><small>${t}</small></div></div>`; }).join('');
    return FRIENDS.map((f) => {
      const inP = S.party.includes(f), wait = pending.has(f), can = !M.online && M.size > 1 && f.status === 'online' && !inP && !wait && !mm;
      const cls = f.status === 'online' ? 'on' : f.status === 'playing' ? 'st' : 'off';
      return `<div class="frow">${face(f.avatar)}<div><b>${f.name}</b><small>${rankBadge(f.rank, 18)}${f.rank.name}</small><small class="${cls}">${inP ? 'Trong phòng' : wait ? 'Đang mời…' : statusText(f)}</small></div>
        <button type="button" data-inv="${f.id}" ${can ? '' : 'disabled'} aria-label="Mời">${inP ? ICON.check() : ICON.plus()}</button></div>`;
    }).join('');
  };
  const ev = eventState(); // banner sự kiện tích luỹ (08 §6)
  const r = rankNow(), full = M.peak || r.tier >= DRAFT.fullFromTier;
  el.innerHTML = `
    <div class="rm-head"><button type="button" class="ui-back" data-a="back" aria-label="Quay lại">${ICON.back()}</button><h2 class="gt">${M.name}</h2></div>
    <div class="rm-sub">${M.online ? '<span class="olc"><i></i><b>Trực tuyến</b>&nbsp;· ghép người thật</span>' : ''}<span>Bản đồ <b>${M.mapName}</b></span><span>Máy <b>${DIFFICULTY[modeDiff(mode)].name}</b></span>${M.ranked ? `<span>${rankBadge(r, 20)}<b>${r.name}</b> <i class="stars">${stars(r)}</i></span><span>Cấm/chọn <b>${DRAFT_NAME[full ? 'full' : 'lite']}</b></span>` : ''}${M.peak ? `<span>Hào Quang <b>${p.hq ?? '—'}</b> · thắng <b>×1,5</b></span>` : ''}</div>
    <div class="rm-slots"></div>
    <aside class="rm-side">
      <div class="rm-tabs"><button type="button" data-tab="fr" class="on">${icon('friends')}<span>Bạn bè</span></button><button type="button" data-tab="chat">${icon('chat')}<span>Trò chuyện</span></button></div>
      <div class="rm-ev">${icon('target')}<span>${ev.name} ${ev.n}/${ev.goal}</span><b>${ev.done ? (ev.claimed ? 'Đã nhận ✓' : 'Nhận ở Nhiệm vụ') : `+${ev.gao} Gạo Hội`}</b></div>
      <div class="rm-list"></div>
      <div class="rm-btns">${M.online ? '<button type="button" class="btn-ghost wide" data-a="custom">Chơi cùng bạn: Phòng tuỳ chỉnh</button>'
        : `<button type="button" class="btn-ghost" data-a="quick" ${M.size > 1 ? '' : 'disabled'}>Mời nhanh</button><button type="button" class="btn-ghost" data-a="clear" ${M.size > 1 ? '' : 'disabled'}>Giải tán</button>`}</div>
      <button type="button" class="btn-gold rm-go" data-a="go">Bắt đầu</button>
    </aside>
    <div class="rm-bot"><div class="chatln">${icon('chat')}<span></span></div><button type="button" class="icb" data-a="mute" aria-label="Micro">${ICON.mic()}</button><button type="button" class="icb" data-a="mute" aria-label="Âm thanh">${ICON.sound()}</button></div>`;
  const $ = (s) => el.querySelector(s);
  const render = () => {
    const list = $('.rm-list'), sc = list.scrollTop; // giữ vị trí cuộn danh sách khi dựng lại
    $('.rm-slots').innerHTML = slotHtml(); list.innerHTML = listHtml(); list.scrollTop = sc;
    el.querySelectorAll('.rm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const go = $('.rm-go'); go.textContent = mm ? 'Huỷ tìm trận' : 'Bắt đầu'; go.classList.toggle('btn-red', !!mm); go.classList.toggle('btn-gold', !mm);
    el.querySelectorAll('.rm-btns button').forEach((b) => { b.disabled = (!M.online && M.size === 1) || !!mm; });
  };
  let ci = 0; const chat = () => { const [n, t] = chatLine(ci++); $('.rm-bot .chatln span').innerHTML = `<b>[Thế giới] ${n}:</b> ${t}`; };
  chat(); const chatT = setInterval(chat, 4500);
  render();

  const room = () => M.size - 1 - S.party.length - pending.size;
  function invite(f) {
    if (room() <= 0) { toast('Phòng đã đủ người'); return; }
    if (S.party.includes(f) || pending.has(f)) return;
    pending.set(f, later(700 + Math.random() * 1500, () => {
      pending.delete(f);
      if (Math.random() < 0.85) { S.party.push(f); toast(`${f.name} đã vào phòng`); } else toast(`${f.name} đang bận, thử lại sau nhé`);
      render();
    }));
    render();
  }
  // —— tìm trận ——
  function startSearch() {
    if (pending.size) { toast('Chờ bạn bè trả lời lời mời đã'); return; }
    if (M.map === '5v5' && !p.rolePri) { openRoleDialog({ onDone: () => { render(); startSearch(); } }); return; } // chưa chọn vị trí: chọn trước
    const online = M.online && !!net.url;
    const pill = document.createElement('div'); pill.className = 'mm';
    pill.innerHTML = `<i class="spin"></i><span>${online ? 'Đang kết nối máy chủ…' : 'Đang tìm trận'}</span><b>00:00</b><button type="button" class="btn-red">Huỷ</button>`;
    pill.querySelector('button').onclick = stopSearch;
    el.append(pill);
    const cur = { pill, sec: 0, wait: online ? Infinity : 3 + Math.floor(Math.random() * 4), online, off: null };
    cur.t = setInterval(() => { cur.sec++; pill.querySelector('b').textContent = fmtT(cur.sec); if (cur.sec >= cur.wait) found(); }, 1000);
    mm = cur;
    render();
    if (online) searchOnline(cur);
  }
  const say = (cur, t) => { const s = cur.pill.querySelector('span'); if (s) s.textContent = t; };
  /** Không nối được máy chủ: ghép với máy (vài giây nữa "tìm thấy trận"). */
  function toBots(cur, why) {
    if (mm !== cur || cur.found) return;
    if (cur.online && net.conn?.open) send({ t: 'unqueue' }); // đang trong hàng chờ máy chủ: ra khỏi hàng (khỏi bị ghép sau lưng)
    cur.online = false; cur.off?.(); cur.off = null; toast(why, 3000); say(cur, 'Đang tìm trận (máy)'); cur.wait = cur.sec + 1 + Math.floor(Math.random() * 3);
  }
  async function searchOnline(cur) {
    cur.off = onNet((ev, m) => {
      if (mm !== cur) return;
      if (ev === 'wake') say(cur, 'Đang đánh thức máy chủ…');
      else if (ev === 'queue') { cur.acked = true; say(cur, m.n > 1 ? `Đang tìm người chơi · ${m.n} người` : 'Đang tìm người chơi'); }
      else if (ev === 'match') foundOnline(cur, m);
      else if (ev === 'room' && foundEl && cur.found) foundRoom(cur, m);
      else if (ev === 'kicked') stopSearch();
      else if (ev === 'drop') { if (cur.found) { toast('Mất kết nối máy chủ'); stopSearch(); } else toBots(cur, 'Mất kết nối máy chủ — ghép với máy'); }
    });
    try { await lobbyConn({ maxMs: 60000 }); } catch (_) { toBots(cur, 'Không kết nối được máy chủ — ghép với máy'); return; }
    if (mm !== cur) return;
    say(cur, 'Đang tìm người chơi');
    send({ t: 'queue', q: mode, name: p.name, avatar: p.avatar, diff: modeDiff(mode), pri: p.rolePri, sec: p.roleSec });
    // máy chủ bản cũ (chưa có hàng chờ) không trả lời: 6 giây chưa nhận 'queue' thì ghép máy; quá hạn chờ (60 giây + dư) chưa ghép được cũng ghép máy
    later(6000, () => { if (mm === cur && cur.online && !cur.acked) toBots(cur, 'Máy chủ chưa hỗ trợ ghép trận — ghép với máy'); });
    later((NET.queueWait + 20) * 1000, () => { if (mm === cur && cur.online) toBots(cur, 'Chưa ghép được trận — ghép với máy'); });
  }
  function stopSearch() {
    if (!mm) return;
    const cur = mm; clearInterval(cur.t); clearInterval(cur.tick); cur.off?.();
    if (cur.online) { netCancel(); netLeave(); }
    cur.pill.remove(); mm = null; foundEl?.remove(); foundEl = null; render();
  }
  /** Máy chủ đã ghép: hộp "Đã tìm thấy trận" — chấm sáng theo người thật đã chấp nhận (máy chấp nhận dần), hết 12 giây máy chủ loại người chưa bấm. */
  function foundOnline(cur, m) {
    clearInterval(cur.t); cur.found = true; say(cur, 'Đã tìm thấy trận'); sfx('ui_found');
    foundEl = document.createElement('div'); foundEl.className = 'ui-dlg';
    foundEl.innerHTML = `<div class="box fr found"><h3><span class="gt">Đã tìm thấy trận</span></h3><div class="txt">${M.name} · ${M.mapName}<div class="rl-got">${m.humans > 1 ? `<b>${m.humans}</b> người thật` : 'Chưa có người chơi khác'} · <b>${10 - m.humans}</b> máy</div><div class="rl-got rr"></div></div><div class="dots">${'<i></i>'.repeat(10)}</div><div class="tm">12</div>
      <div class="btns"><button type="button" class="btn-gold" data-a="accept">Chấp nhận</button></div></div>`;
    el.append(foundEl);
    cur.bots = 10 - m.humans; cur.botOk = 0;
    for (let i = 0; i < cur.bots; i++) later(500 + Math.random() * 3000, () => { if (mm === cur) { cur.botOk++; if (net.room) foundRoom(cur, net.room); } });
    let left = 12; const tm = foundEl.querySelector('.tm');
    cur.tick = setInterval(() => { left = Math.max(0, left - 1); tm.textContent = left; }, 1000);
    foundEl.onclick = (e) => { const b = e.target.closest('[data-a="accept"]'); if (!b || b.disabled) return; b.disabled = true; b.textContent = 'Đã chấp nhận'; send({ t: 'accept' }); };
    if (net.room) foundRoom(cur, net.room);
  }
  function foundRoom(cur, r) {
    if (r.state === 'pick' || r.state === 'ready') { // mọi người đã chấp nhận (hoặc hết giờ, người chưa bấm bị loại)
      const me = r.players[r.you];
      clearInterval(cur.tick); cur.off?.(); cur.off = null;
      S.match = { seed: 0, online: true, role: me?.role || null, gotSec: !!me?.role && me.role !== p.rolePri, seat: 2, allies: [], foes: [] };
      later(400, () => { if (mm === cur) nav.go('pick', { mode }); });
      return;
    }
    const dots = foundEl.querySelectorAll('.dots i'), n = r.players.filter((x) => x.accepted).length;
    dots.forEach((d, i) => d.classList.toggle('ok', i < n || (i >= r.players.length && i - r.players.length < cur.botOk)));
    const me = r.players[r.you], rr = foundEl.querySelector('.rr');
    if (me?.role && rr && !rr.textContent) rr.innerHTML = `Vị trí của bạn: ${roleIcon(me.role)}<b>${ROLE_INFO[me.role].name}</b>${me.role !== p.rolePri ? ' <small>(vị trí phụ)</small>' : ''}`;
  }
  function found() {
    clearInterval(mm.t); mm.pill.querySelector('span').textContent = 'Đã tìm thấy trận'; sfx('ui_found');
    const n = M.size * 2, acc = new Array(n).fill(false);
    const rr = M.map === '5v5' ? assignRoles({ pri: p.rolePri, sec: p.roleSec }, Math.random) : null; // vị trí trận này (giao diện: Math.random)
    foundEl = document.createElement('div'); foundEl.className = 'ui-dlg';
    foundEl.innerHTML = `<div class="box fr found"><h3><span class="gt">Đã tìm thấy trận</span></h3><div class="txt">${M.name} · ${M.mapName}${rr ? `<div class="rl-got">Vị trí của bạn: ${roleIcon(rr.me)}<b>${ROLE_INFO[rr.me].name}</b>${rr.gotSec ? ' <small>(vị trí phụ)</small>' : ''}</div>` : ''}</div><div class="dots">${'<i></i>'.repeat(n)}</div><div class="tm">12</div>
      <div class="btns"><button type="button" class="btn-gold" data-a="accept">Chấp nhận</button></div></div>`;
    el.append(foundEl);
    const dots = foundEl.querySelectorAll('.dots i'), cur = mm;
    const ok = (i) => { if (mm !== cur) return; acc[i] = true; dots[i].classList.add('ok'); if (acc.every(Boolean)) { clearInterval(cur.tick); later(600, () => mm === cur && begin(rr)); } };
    // người khác chấp nhận dần (bạn trong phòng nhanh hơn); mình là ô đầu
    for (let i = 1; i < n; i++) later(i <= S.party.length ? 300 + Math.random() * 600 : 600 + Math.random() * 3200, () => ok(i));
    let left = 12; const tm = foundEl.querySelector('.tm');
    cur.tick = setInterval(() => { left--; tm.textContent = left; if (left <= 0) { clearInterval(cur.tick); if (!acc[0]) { toast('Bạn đã bỏ lỡ trận đấu'); stopSearch(); } } }, 1000);
    foundEl.onclick = (e) => { const b = e.target.closest('[data-a="accept"]'); if (!b || acc[0]) return; b.disabled = true; b.textContent = 'Đã chấp nhận'; ok(0); };
  }
  function begin(rr) {
    const used = [p.name, ...FRIENDS.map((f) => f.name)], nBots = M.size - 1 - S.party.length;
    const names = botNames(nBots + M.size, Math.random, used);
    const qs = new URLSearchParams(location.search).get('seat'); // ?seat=0..4: ghế chọn của mình (kiểm thử); mặc định ngẫu nhiên
    S.match = {
      seed: (Math.random() * 1e9) | 0, role: rr?.me ?? null, gotSec: !!rr?.gotSec, seat: qs !== null && /^[0-4]$/.test(qs) ? +qs : Math.floor(Math.random() * 5),
      allies: [...S.party.map((f) => ({ name: f.name, stars: f.stars, friend: true })), ...names.slice(0, nBots).map((name) => ({ name, stars: nearStars(p.stars) }))].map((a, i) => ({ ...a, role: rr?.allies[i] ?? null })),
      foes: names.slice(nBots).map((name, i) => ({ name, stars: nearStars(p.stars), role: rr?.foes[i] ?? null })),
    };
    nav.go(M.ranked ? 'draft' : 'pick', { mode });
  }

  el.onclick = (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
    const inv = e.target.closest('[data-inv]'); if (inv) { invite(FRIENDS.find((f) => f.id === inv.dataset.inv)); return; }
    const k = e.target.closest('[data-kick]'); if (k) { S.party = S.party.filter((f) => f.id !== k.dataset.kick); render(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'back') { stopSearch(); nav.go('home'); }
    else if (a === 'go') { if (!mm && M.peak && !peakNow().open) { toast(peakNow().reason); return; } (mm ? stopSearch() : startSearch()); } // Đỉnh Cao: hết giờ trong lúc ngồi phòng
    else if (a === 'role') { if (mm) toast('Đang tìm trận — huỷ tìm để đổi vị trí'); else openRoleDialog({ onDone: render }); }
    else if (a === 'custom') { stopSearch(); nav.go('custom'); }
    else if (a === 'invite') { if (M.online) { toast('Trực tuyến: chỗ trống được ghép ngẫu nhiên. Chơi cùng bạn: Phòng tuỳ chỉnh'); return; } if (M.size === 1 || mm) return; const f = FRIENDS.find((x) => x.status === 'online' && !S.party.includes(x) && !pending.has(x)); if (f) invite(f); else toast('Không còn bạn nào đang trực tuyến'); }
    else if (a === 'quick') { for (const f of FRIENDS.filter((x) => x.status === 'online' && !S.party.includes(x) && !pending.has(x))) if (room() > 0) invite(f); }
    else if (a === 'clear') { S.party = []; for (const t of pending.values()) clearTimeout(t); pending.clear(); render(); }
    else if (a === 'mute') toast('Trò chuyện thoại chưa hỗ trợ');
  };
  return () => { clearInterval(chatT); if (mm) { clearInterval(mm.t); clearInterval(mm.tick); mm.off?.(); if (mm.online && !mm.found) { netCancel(); netLeave(); } } for (const t of timers) { clearTimeout(t); clearInterval(t); } for (const t of pending.values()) clearTimeout(t); el.remove(); };
}
