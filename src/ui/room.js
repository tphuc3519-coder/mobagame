// Phòng chờ ghép trận (ảnh 3): nền 5 tướng nhìn về nhà chính, 5 ô người chơi (mình ở giữa, có hạng), cột phải danh sách bạn bè để mời
// (bạn bè cũng là máy — vào trận vẫn ghi "[Máy]"), nút Bắt đầu → đang tìm trận (đồng hồ, huỷ được) → "Đã tìm thấy trận": chấp nhận
// trong 12 giây, 10 ô sáng dần khi mọi người chấp nhận → màn chọn tướng.
import { DIFFICULTY } from '../data/ai.js';
import { ICON, face, rankBadge, stars, toast } from './kit.js';
import { profile, rankOf, missionState, MISSIONS } from './profile.js';
import { FRIENDS, statusText, chatLine, botNames, nearStars } from './people.js';
import { MODES, S, modeDiff } from './modes.js';
import { stageOn } from './stage.js';

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
  S.party = S.party.filter((f) => FRIENDS.includes(f)).slice(0, M.size - 1);

  // thứ tự ô từ giữa ra hai bên: ô giữa là mình
  const order = M.size === 5 ? [3, 1, 4, 0] : [];
  const slotHtml = () => {
    const cells = Array.from({ length: M.size }, () => ({ kind: 'empty' }));
    const mid = Math.floor(M.size / 2); cells[mid] = { kind: 'me' };
    const members = [...S.party.map((f) => ({ kind: 'fr', f })), ...[...pending.keys()].map((f) => ({ kind: 'wait', f }))];
    members.forEach((m, i) => { if (order[i] !== undefined) cells[order[i]] = m; });
    return cells.map((c) => {
      if (c.kind === 'me') { const r = rankOf(p.stars); return `<div class="slot me"><div class="box">${face(p.avatar)}</div><span class="host">${ICON.star()}</span><b class="nm">${p.name}</b><span class="rk">${rankBadge(r, 20)}${r.name}</span></div>`; }
      if (c.kind === 'fr') return `<div class="slot fr"><div class="box">${face(c.f.avatar)}</div>${mm ? '' : `<button type="button" class="kick" data-kick="${c.f.id}" aria-label="Mời ra">✕</button>`}<b class="nm">${c.f.name}</b><span class="rk">${rankBadge(c.f.rank, 20)}${c.f.rank.name}</span></div>`;
      if (c.kind === 'wait') return `<div class="slot wait"><div class="box">${face(c.f.avatar)}</div><b class="nm">${c.f.name}</b><span class="rk">Đang mời…</span></div>`;
      return `<div class="slot empty"><div class="box" data-a="invite">+</div><b class="nm" style="color:#9fb4e8">Mời bạn</b></div>`;
    }).join('');
  };
  const listHtml = () => {
    if (tab === 'chat') return Array.from({ length: 8 }, (_, i) => { const [n, t] = chatLine(i); return `<div class="frow"><div><b>${n}</b><small>${t}</small></div></div>`; }).join('');
    return FRIENDS.map((f) => {
      const inP = S.party.includes(f), wait = pending.has(f), can = M.size > 1 && f.status === 'online' && !inP && !wait && !mm;
      const cls = f.status === 'online' ? 'on' : f.status === 'playing' ? 'st' : 'off';
      return `<div class="frow">${face(f.avatar)}<div><b>${f.name}</b><small>${rankBadge(f.rank, 14).replace('class="rkb"', 'class="rkb" style="display:inline-block;vertical-align:-3px"')} ${f.rank.name}</small><small class="${cls}">${inP ? 'Trong phòng' : wait ? 'Đang mời…' : statusText(f)}</small></div>
        <button type="button" data-inv="${f.id}" ${can ? '' : 'disabled'} aria-label="Mời">${inP ? ICON.check() : ICON.plus()}</button></div>`;
    }).join('');
  };
  const goal = MISSIONS.find((m) => m.id === 'win1'), gs = missionState(goal);
  const r = rankOf(p.stars);
  el.innerHTML = `
    <div class="rm-head"><button type="button" class="ui-back" data-a="back" aria-label="Quay lại">${ICON.back()}</button><h2>${M.name}</h2></div>
    <div class="rm-sub">Bản đồ <b>${M.mapName}</b> · Máy <b>${DIFFICULTY[modeDiff(mode)].name}</b>${M.ranked ? ` · Hạng <b>${r.name}</b> <span class="stars">${stars(r)}</span>` : ''}</div>
    <div class="rm-slots"></div>
    <aside class="rm-side">
      <div class="rm-tabs"><button type="button" data-tab="fr" class="on" aria-label="Bạn bè">${ICON.friends()}</button><button type="button" data-tab="chat" aria-label="Trò chuyện">${ICON.chat()}</button></div>
      <div class="rm-ev"><span>${goal.name}</span><b>${gs.done ? 'Đã xong ✓' : `+${goal.gold} vàng`}</b></div>
      <div class="rm-list"></div>
      <div class="rm-btns"><button type="button" data-a="quick" ${M.size > 1 ? '' : 'disabled'}>Mời nhanh</button><button type="button" data-a="clear" ${M.size > 1 ? '' : 'disabled'}>Giải tán</button></div>
      <button type="button" class="btn-gold rm-go" data-a="go">Bắt đầu</button>
    </aside>
    <div class="rm-bot"><div class="hm-chat">${ICON.chat()}<span></span></div><button type="button" class="icb" data-a="mute" aria-label="Micro">${ICON.mic()}</button><button type="button" class="icb" data-a="mute" aria-label="Âm thanh">${ICON.sound()}</button></div>`;
  const $ = (s) => el.querySelector(s);
  const render = () => {
    const list = $('.rm-list'), sc = list.scrollTop; // giữ vị trí cuộn danh sách khi dựng lại
    $('.rm-slots').innerHTML = slotHtml(); list.innerHTML = listHtml(); list.scrollTop = sc;
    el.querySelectorAll('.rm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const go = $('.rm-go'); go.textContent = mm ? 'Huỷ tìm trận' : 'Bắt đầu'; go.classList.toggle('btn-blue', !!mm); go.classList.toggle('btn-gold', !mm);
    el.querySelectorAll('.rm-btns button').forEach((b) => { b.disabled = M.size === 1 || !!mm; });
  };
  let ci = 0; const chat = () => { const [n, t] = chatLine(ci++); $('.rm-bot .hm-chat span').innerHTML = `<b>[Thế giới] ${n}:</b> ${t}`; };
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
    let sec = 0; const wait = 3 + Math.floor(Math.random() * 4);
    const pill = document.createElement('div'); pill.className = 'mm';
    pill.innerHTML = `<i class="spin"></i><span>Đang tìm trận</span><b>00:00</b><button type="button">Huỷ</button>`;
    pill.querySelector('button').onclick = stopSearch;
    el.append(pill);
    mm = { pill, t: setInterval(() => { sec++; pill.querySelector('b').textContent = fmtT(sec); if (sec >= wait) found(); }, 1000) };
    render();
  }
  function stopSearch() { if (!mm) return; clearInterval(mm.t); clearInterval(mm.tick); mm.pill.remove(); mm = null; foundEl?.remove(); foundEl = null; render(); }
  function found() {
    clearInterval(mm.t); mm.pill.querySelector('span').textContent = 'Đã tìm thấy trận';
    const n = M.size * 2, acc = new Array(n).fill(false);
    foundEl = document.createElement('div'); foundEl.className = 'ui-dlg';
    foundEl.innerHTML = `<div class="box found"><h3>ĐÃ TÌM THẤY TRẬN</h3><div class="txt">${M.name} · ${M.mapName}</div><div class="dots">${'<i></i>'.repeat(n)}</div><div class="tm">12</div>
      <div class="btns"><button type="button" class="gold" data-a="accept">Chấp nhận</button></div></div>`;
    el.append(foundEl);
    const dots = foundEl.querySelectorAll('.dots i'), cur = mm;
    const ok = (i) => { if (mm !== cur) return; acc[i] = true; dots[i].classList.add('ok'); if (acc.every(Boolean)) { clearInterval(cur.tick); later(600, () => mm === cur && begin()); } };
    // người khác chấp nhận dần (bạn trong phòng nhanh hơn); mình là ô đầu
    for (let i = 1; i < n; i++) later(i <= S.party.length ? 300 + Math.random() * 600 : 600 + Math.random() * 3200, () => ok(i));
    let left = 12; const tm = foundEl.querySelector('.tm');
    cur.tick = setInterval(() => { left--; tm.textContent = left; if (left <= 0) { clearInterval(cur.tick); if (!acc[0]) { toast('Bạn đã bỏ lỡ trận đấu'); stopSearch(); } } }, 1000);
    foundEl.onclick = (e) => { const b = e.target.closest('[data-a="accept"]'); if (!b || acc[0]) return; b.disabled = true; b.textContent = 'Đã chấp nhận'; ok(0); };
  }
  function begin() {
    const used = [p.name, ...FRIENDS.map((f) => f.name)], nBots = M.size - 1 - S.party.length;
    const names = botNames(nBots + M.size, Math.random, used);
    S.match = {
      seed: (Math.random() * 1e9) | 0,
      allies: [...S.party.map((f) => ({ name: f.name, stars: f.stars, friend: true })), ...names.slice(0, nBots).map((name) => ({ name, stars: nearStars(p.stars) }))],
      foes: names.slice(nBots).map((name) => ({ name, stars: nearStars(p.stars) })),
    };
    nav.go('pick', { mode });
  }

  el.onclick = (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
    const inv = e.target.closest('[data-inv]'); if (inv) { invite(FRIENDS.find((f) => f.id === inv.dataset.inv)); return; }
    const k = e.target.closest('[data-kick]'); if (k) { S.party = S.party.filter((f) => f.id !== k.dataset.kick); render(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'back') { stopSearch(); nav.go('home'); }
    else if (a === 'go') (mm ? stopSearch() : startSearch());
    else if (a === 'invite') { if (M.size === 1 || mm) return; const f = FRIENDS.find((x) => x.status === 'online' && !S.party.includes(x) && !pending.has(x)); if (f) invite(f); else toast('Không còn bạn nào đang trực tuyến'); }
    else if (a === 'quick') { for (const f of FRIENDS.filter((x) => x.status === 'online' && !S.party.includes(x) && !pending.has(x))) if (room() > 0) invite(f); }
    else if (a === 'clear') { S.party = []; for (const t of pending.values()) clearTimeout(t); pending.clear(); render(); }
    else if (a === 'mute') toast('Trò chuyện thoại chưa hỗ trợ');
  };
  return () => { clearInterval(chatT); if (mm) { clearInterval(mm.t); clearInterval(mm.tick); } for (const t of timers) { clearTimeout(t); clearInterval(t); } for (const t of pending.values()) clearTimeout(t); el.remove(); };
}
