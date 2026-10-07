// Sảnh chính (ảnh 2): tướng 3D đứng giữa trên bệ, góc trái trên ảnh đại diện + cấp + hạng, cột bạn bè, góc phải trên tiền tệ / thư /
// cài đặt, cột phải sự kiện + sổ sứ mệnh + xếp hạng / lịch sử, dưới trái kênh thế giới + thanh Túi đồ / Tướng / Trang bị / N.vụ,
// dưới phải "Chọn chế độ", "Đấu thường" (nút thoi) và nút lớn ĐẤU HẠNG. Đổi tướng đứng ở sảnh: mục Tướng.
import { ICON, face, fmt, rankBadge, fullscreen } from './kit.js';
import { profile, rankOf, missionsReady, mailUnread, COURAGE_MAX } from './profile.js';
import { FRIENDS, chatLine } from './people.js';
import { stage, stageOn } from './stage.js';
import { openModes } from './modes.js';
import { openProfile, openFriends, openMail, openMissions, openHeroes, openItems, openBag, openSettings, openEvent, openLeaderboard, openHistory } from './panels.js';

export function openHome(nav) {
  const p = profile();
  const el = document.createElement('div'); el.id = 'home'; el.className = 'scr';
  document.getElementById('ui').append(el);
  const show = stage(); stageOn(true); show.autoSpin(false); show.frame({ zoom: 1, dy: 0, dx: 0.25 });
  const place = () => show.setOffset(-Math.min(innerWidth * 0.07, 70)); // lệch trái một chút: cột sự kiện chiếm bên phải
  place(); addEventListener('resize', place);
  show.show(p.feature);

  const friends = FRIENDS.filter((f) => f.status !== 'offline').slice(0, 4);
  const render = () => {
    const r = rankOf(p.stars), miss = missionsReady(), mail = mailUnread();
    el.innerHTML = `
      <button type="button" class="hm-me" data-a="profile">${face(p.avatar)}<div><b>${p.name}</b><span class="lv">Cấp ${p.level}</span><small>${r.name}</small></div></button>
      <div class="hm-fr">${friends.map((f) => `<button type="button" data-a="friends" aria-label="${f.name}">${face(f.avatar)}${f.status === 'online' ? '<i class="dot"></i>' : ''}</button>`).join('')}
        <button type="button" class="more" data-a="friends" aria-label="Bạn bè">${ICON.friends()}</button></div>
      <div class="hm-title"><b>LANTERN ARENA</b><small>ĐẤU TRƯỜNG ĐÈN LỒNG</small></div>
      <div class="hm-top"><span class="cur">${ICON.coin()}<b>${fmt(p.gold)}</b></span><span class="cur gem">${ICON.gem()}<b>${fmt(p.gems)}</b></span>
        <button type="button" class="icb" data-a="mail" aria-label="Thư">${ICON.mail()}${mail ? `<i class="badge">${mail}</i>` : ''}</button>
        <button type="button" class="icb" data-a="full" aria-label="Toàn màn hình">${ICON.full()}</button>
        <button type="button" class="icb" data-a="settings" aria-label="Cài đặt">${ICON.gear()}</button></div>
      <div class="hm-side">
        <button type="button" class="ev" data-a="event" style="background-image:url(./assets/ui/keyart.jpg);background-position:62% 34%;background-size:cover"><em>MỚI</em><b>LỄ HỘI ĐÈN LỒNG</b><small>Điểm danh 7 ngày · nhận tới 2.200 vàng</small></button>
        <button type="button" class="bar" data-a="missions">${ICON.book()}<span>Sổ sứ mệnh</span><small>${p.daily.claimed.length}/4 đã nhận</small>${miss ? `<i class="badge">${miss}</i>` : ''}</button>
        <div class="row2"><button type="button" class="bar" data-a="leader">${ICON.trophy()}<span>Xếp hạng</span></button>
          <button type="button" class="bar" data-a="history">${ICON.clock()}<span>Lịch sử đấu</span></button></div>
        ${p.ranked ? `<div class="hm-cg" title="Điểm tích luỹ: đầy thì thắng +1 sao / thua được giữ sao"><span>Tích luỹ</span><i><b style="width:${Math.round(((p.courage || 0) / COURAGE_MAX) * 100)}%"></b></i><small>${p.courage || 0}/${COURAGE_MAX}</small></div>` : ''}
      </div>
      <div class="hm-chat" data-a="chat">${ICON.chat()}<span></span></div>
      <nav class="hm-nav">
        <button type="button" data-a="bag">${ICON.bag()}<span>Túi đồ</span></button>
        <button type="button" data-a="heroes">${ICON.helmet()}<span>Tướng</span></button>
        <button type="button" data-a="items">${ICON.sword()}<span>Trang bị</span></button>
        <button type="button" data-a="missions">${ICON.book()}<span>N.vụ</span>${miss ? `<i class="badge">${miss}</i>` : ''}</button>
      </nav>
      <div class="hm-play">
        <div class="dias">
          <button type="button" class="dia" data-a="modes"><i>${ICON.map()}</i><span>Chọn chế độ</span></button>
          <button type="button" class="dia" data-a="normal"><i>${ICON.swords()}</i><span>Đấu thường</span></button>
        </div>
        <button type="button" class="rank-go" data-a="ranked">${rankBadge(r, 52)}<div><b>ĐẤU HẠNG</b><small>${r.name}</small></div></button>
      </div>`;
    chat();
  };
  let ci = Math.floor(Math.random() * 8);
  const chat = () => { const s = el.querySelector('.hm-chat span'); if (!s) return; const [n, t] = chatLine(ci); s.innerHTML = `<b>[Thế giới] ${n}:</b> ${t}`; };
  const chatT = setInterval(() => { ci++; chat(); }, 4500);
  render();

  const A = {
    profile: () => openProfile(render), friends: () => openFriends(), mail: () => openMail(render), settings: () => openSettings(),
    event: () => openEvent(render), missions: () => openMissions(render), leader: () => openLeaderboard(), history: () => openHistory(),
    bag: () => openBag(), heroes: () => openHeroes((id) => { show.show(id); render(); }), items: () => openItems(), full: () => fullscreen(),
    chat: () => openFriends(), modes: () => openModes(nav), normal: () => nav.go('room', { mode: 'normal' }), ranked: () => nav.go('room', { mode: 'ranked' }),
  };
  el.onclick = (e) => { const b = e.target.closest('[data-a]'); if (b) A[b.dataset.a]?.(); };
  window.__home = { render };
  return () => { clearInterval(chatT); removeEventListener('resize', place); el.remove(); };
}
