// Sảnh chính (ảnh 2): tướng 3D đứng trên bệ giữa quảng trường đêm (phông dựng sẵn), góc trái trên thẻ người chơi (ảnh đại diện viền vàng
// + cấp + huy hiệu hạng + thanh kinh nghiệm), cột bạn bè trực tuyến, góc phải trên tiền tệ / thư / toàn màn / cài đặt, cột phải băng sự
// kiện + 3 ô Sứ mệnh / Xếp hạng / Lịch sử, dưới trái kênh thế giới + thanh Tướng / Trang bị / Túi đồ / Bạn bè, dưới phải hai nút pha lê
// "Chọn chế độ" / "Đấu thường" và nút vàng lớn ĐẤU HẠNG có huy hiệu bậc. Đổi tướng đứng ở sảnh: mục Tướng.
import { ICON, icon, face, fmt, rankBadge, stars, fullscreen, toast } from './kit.js';
import { profile, rankOf, expNeed, missionsReady, mailUnread, COURAGE_MAX } from './profile.js';
import { FRIENDS, chatLine } from './people.js';
import { stage, stageOn, backdrop } from './stage.js';
import { openModes } from './modes.js';
import { openProfile, openFriends, openMail, openMissions, openHeroes, openItems, openBag, openSettings, openEvent, openLeaderboard, openHistory } from './panels.js';

export function openHome(nav) {
  const p = profile();
  const el = document.createElement('div'); el.id = 'home'; el.className = 'scr';
  document.getElementById('ui').append(el);
  const show = stage(); stageOn(true); backdrop('home'); show.autoSpin(false); show.aura(true, 0.45); show.frame({ zoom: 0.98, dy: -0.03, dx: 0.25 });
  // tướng đứng giữa khoảng trống giữa cột bạn bè (trái) và cột sự kiện (phải)
  const place = () => { const side = Math.min(300, Math.max(196, innerWidth * 0.29)); show.setOffset(-(side - 60) / 2 + 10); };
  place(); addEventListener('resize', place);
  show.show(p.feature);

  const friends = FRIENDS.filter((f) => f.status !== 'offline').slice(0, 3);
  const render = () => {
    const r = rankOf(p.stars), miss = missionsReady(), mail = mailUnread(), ev = Math.min(7, p.checkin || 0);
    el.innerHTML = `
      <button type="button" class="hm-me" data-a="profile"><span class="av">${face(p.avatar)}<i class="lvb"><b>${p.level}</b></i></span>
        <span class="who"><b>${p.name}</b><span class="rk">${rankBadge(r, 24)}${r.name}</span><span class="pbar blue"><i style="width:${Math.min(100, Math.round((p.exp / expNeed(p.level)) * 100))}%"></i></span></span></button>
      <div class="hm-fr">${friends.map((f) => `<button type="button" data-a="friends" aria-label="${f.name}">${face(f.avatar)}${f.status === 'online' ? '<i class="dot"></i>' : ''}</button>`).join('')}
        <button type="button" class="more" data-a="friends" aria-label="Bạn bè">${icon('friends')}</button></div>
      <div class="hm-top"><span class="cur">${icon('coin')}<b>${fmt(p.gold)}</b><i class="add" data-a="event" role="button" aria-label="Nhận thêm vàng">+</i></span>
        <span class="cur gem">${icon('gem')}<b>${fmt(p.gems)}</b><i class="add" data-a="gems" role="button" aria-label="Nạp ngọc">+</i></span>
        <button type="button" class="icb" data-a="mail" aria-label="Thư">${icon('mail')}${mail ? `<i class="badge">${mail}</i>` : ''}</button>
        <button type="button" class="icb" data-a="full" aria-label="Toàn màn hình">${ICON.full()}</button>
        <button type="button" class="icb" data-a="settings" aria-label="Cài đặt">${icon('gear')}</button></div>
      <div class="hm-side">
        <button type="button" class="hm-ev fr" data-a="event"><i class="pic"></i><em class="tagr">Sự kiện</em>
          <span class="tt"><b class="gt">LỄ HỘI ĐÈN LỒNG</b><small>Điểm danh 7 ngày nhận tới 2.200 vàng</small></span>
          <span class="evp"><span class="pbar"><i style="width:${Math.round((ev / 7) * 100)}%"></i></span><em>${ev}/7</em></span>${icon('chest', 'deco')}</button>
        <div class="hm-tiles">
          <button type="button" class="tile fr" data-a="missions">${icon('scroll')}<span>Sứ mệnh</span>${miss ? `<i class="badge">${miss}</i>` : ''}</button>
          <button type="button" class="tile fr" data-a="leader">${icon('trophy')}<span>Xếp hạng</span></button>
          <button type="button" class="tile fr" data-a="history">${icon('hourglass')}<span>Lịch sử</span></button>
        </div>
        ${p.ranked ? `<div class="hm-cg" title="Điểm tích luỹ: đầy thì thắng +1 sao / thua được giữ sao"><span>Tích luỹ</span><span class="pbar"><i style="width:${Math.round(((p.courage || 0) / COURAGE_MAX) * 100)}%"></i></span><small>${p.courage || 0}/${COURAGE_MAX}</small></div>` : ''}
      </div>
      <nav class="hm-nav">
        <button type="button" data-a="heroes">${icon('helmet')}<span>Tướng</span></button>
        <button type="button" data-a="items">${icon('items')}<span>Trang bị</span></button>
        <button type="button" data-a="bag">${icon('bag')}<span>Túi đồ</span></button>
        <button type="button" data-a="friends">${icon('friends')}<span>Bạn bè</span></button>
      </nav>
      <div class="chatln" data-a="chat">${icon('chat')}<span></span></div>
      <div class="hm-play">
        <div class="dias">
          <button type="button" class="dia" data-a="modes"><i>${icon('target')}</i><span>Chọn chế độ</span></button>
          <button type="button" class="dia" data-a="normal"><i>${icon('swords')}</i><span>Đấu thường</span></button>
        </div>
        <button type="button" class="rank-go" data-a="ranked"><i class="f shine"></i>${rankBadge(r, 88)}<span class="tx"><b>ĐẤU HẠNG</b><small>${r.name}<i class="stars">${stars(r)}</i></small></span></button>
      </div>`;
    chat();
  };
  let ci = Math.floor(Math.random() * 8);
  const chat = () => { const s = el.querySelector('.chatln span'); if (!s) return; const [n, t] = chatLine(ci); s.innerHTML = `<b>[Thế giới] ${n}:</b> ${t}`; };
  const chatT = setInterval(() => { ci++; chat(); }, 4500);
  render();

  const A = {
    profile: () => openProfile(render), friends: () => openFriends(), mail: () => openMail(render), settings: () => openSettings(),
    event: () => openEvent(render), missions: () => openMissions(render), leader: () => openLeaderboard(), history: () => openHistory(),
    bag: () => openBag(), heroes: () => openHeroes((id) => { show.show(id); render(); }), items: () => openItems(), full: () => fullscreen(),
    chat: () => openFriends(), gems: () => toast('Cửa hàng ngọc sắp mở'), modes: () => openModes(nav), normal: () => nav.go('room', { mode: 'normal' }), ranked: () => nav.go('room', { mode: 'ranked' }),
  };
  el.onclick = (e) => { const b = e.target.closest('[data-a]'); if (b) { e.stopPropagation(); A[b.dataset.a]?.(); } };
  window.__home = { render };
  return () => { clearInterval(chatT); removeEventListener('resize', place); el.remove(); };
}
