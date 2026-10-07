// Các bảng mở từ sảnh: hồ sơ, bạn bè, thư, nhiệm vụ, tướng, trang bị, túi đồ, cài đặt, sự kiện. Bảng phủ toàn màn kiểu Liên Quân.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { ITEMS, SHOP_TABS } from '../data/items.js';
import { itemArtURL } from '../hud/itemArt.js';
import { ICON, icon, face, cardSrc, panel, dialog, toast, fmt, rankBadge, stars } from './kit.js';
import { hasPaintedSkill, paintedSkill } from '../hud/paint.js';
import { profile, saveProfile, rankOf, expNeed, MISSIONS, missionState, claimMission, mailbox, claimMail, BAG_ITEMS } from './profile.js';
import { FRIENDS, statusText } from './people.js';
import { MODES } from './modes.js';
import { skillDesc } from './skilltext.js';

export const ROLE_VI = { fighter: 'Đấu sĩ', tank: 'Đỡ đòn', assassin: 'Sát thủ', mage: 'Pháp sư', marksman: 'Xạ thủ', support: 'Trợ thủ' };
const STYLE = `
.pn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(96px, 15vw, 128px), 1fr)); gap: 12px; padding: 4px; }
.pn-hero { position: relative; aspect-ratio: .72; padding: 0; border: 1.5px solid transparent; border-radius: 6px; overflow: hidden; background: #151332 padding-box, linear-gradient(180deg, rgba(200,214,255,.55), rgba(90,110,170,.3)) border-box; box-shadow: 0 4px 10px rgba(0,0,0,.5); }
.pn-hero img.hcard, .pn-hero .face, .pn-hero .ini { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
.pn-hero span { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 8px 6px; text-align: left; background: linear-gradient(0deg, rgba(4,5,16,.96) 35%, rgba(4,5,16,0)); }
.pn-hero b { display: block; font: 700 15px/1.05 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; } .pn-hero small { font-size: 10.5px; color: #cdb8ff; }
.pn-hero.lock { filter: grayscale(.85) brightness(.5); } .pn-hero em { position: absolute; top: 6px; right: 6px; padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,.7); font: 700 11px/1.2 var(--u-disp); font-style: normal; letter-spacing: .05em; text-transform: uppercase; color: #ffd28a; }
.pn-hero.on { background: #2a1a40 padding-box, var(--u-rim) border-box; box-shadow: 0 0 0 1px rgba(255,214,120,.35), 0 0 16px rgba(255,176,64,.6); }
.pn-hero.on::after { content: 'Ở sảnh'; position: absolute; top: 6px; left: 6px; padding: 2px 7px; border-radius: 6px; background: var(--u-gold); font: 700 11px/1.2 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: #3b1a02; }
.pn-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 8px; border-radius: 6px; background: linear-gradient(90deg, rgba(30,38,90,.78), rgba(12,16,42,.62)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.16), 0 3px 8px rgba(0,0,0,.35); }
.pn-row .face, .pn-row .ini { width: 44px; height: 44px; border-radius: 50%; flex: none; box-shadow: 0 0 0 1.5px rgba(255,214,140,.55); }
.pn-row > img.ui-ic { width: 48px; height: 48px; flex: none; margin: -4px 0; filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }
.pn-row div { flex: 1; min-width: 0; } .pn-row b { display: block; font: 700 16px/1.15 var(--u-disp); letter-spacing: .02em; color: #fff0c8; } .pn-row small { font-size: 12px; color: #b8c4e8; }
.pn-row .go { flex: none; min-width: 92px; height: 34px; padding: 0 14px; font-size: 16px; }
.pn-row .pbar { margin-top: 6px; height: 5px; }
.pn-tabs { display: flex; gap: 2px; margin-bottom: 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,214,140,.2); }
.pn-tabs button { position: relative; height: 36px; padding: 0 16px; border: 0; background: none; font: 700 15px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #aeb8de; }
.pn-tabs button.on { color: var(--u-gc); background: linear-gradient(0deg, rgba(255,214,140,.16), rgba(255,214,140,0)); } .pn-tabs button.on::after { content: ''; position: absolute; left: 8%; right: 8%; bottom: -1px; height: 2px; background: var(--u-line); }
.pn-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px 8px; border: 0; border-radius: 6px; background: linear-gradient(180deg, rgba(30,38,90,.8), rgba(12,16,42,.75)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.18), 0 3px 8px rgba(0,0,0,.35); }
.pn-item > img { width: 54px; height: 54px; border-radius: 8px; box-shadow: 0 0 0 1.5px rgba(255,214,140,.5), 0 3px 6px rgba(0,0,0,.5); } .pn-item b { font: 700 13.5px/1.1 var(--u-disp); letter-spacing: .02em; text-align: center; }
.pn-item small { display: flex; gap: 3px; align-items: center; font: 700 14px/1 var(--u-disp); color: #ffe08a; } .pn-item small img.ui-ic { width: 18px; height: 18px; }
.pn-prof { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: start; }
.pn-prof .av { width: 96px; height: 96px; padding: 3px; box-sizing: border-box; border-radius: 12px; background: var(--u-rim); box-shadow: 0 0 0 1px #2a1606, 0 0 18px rgba(255,180,70,.45); } .pn-prof .av .face, .pn-prof .av .ini { width: 100%; height: 100%; border-radius: 9px; }
.pn-prof h3 { margin: 0; display: flex; align-items: center; gap: 10px; } .pn-prof h3 span { font: 800 italic 32px/1 var(--u-disp); letter-spacing: .02em; } .pn-prof h3 .icb { width: 32px; height: 32px; }
.pn-prof .rkrow { display: flex; gap: 10px; align-items: center; margin-top: 10px; } .pn-prof .rkrow > div { display: flex; flex-direction: column; gap: 2px; } .pn-prof .rkrow b { font: 700 19px/1 var(--u-disp); letter-spacing: .03em; color: var(--u-gc); } .pn-prof .rkrow small { color: #a8b4d8; font-size: 12px; }
.pn-prof .lvrow { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 13px; color: #cfd6ef; } .pn-prof .lvrow b { font: 700 16px var(--u-disp); color: var(--u-gc); } .pn-prof .lvrow .pbar { width: 160px; }
.pn-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px; margin-top: 16px; }
.pn-stats div, .pn-sum div { padding: 9px 12px; border-radius: 6px; background: linear-gradient(180deg, rgba(30,38,90,.75), rgba(12,16,42,.75)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.18); }
.pn-stats small, .pn-sum small { display: block; font-size: 11px; color: #a8b4d8; } .pn-stats b, .pn-sum b { font: 700 22px/1.15 var(--u-disp); letter-spacing: .02em; color: #ffe8a8; }
.pn-avs { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; } .pn-avs button { width: 50px; height: 50px; padding: 2px; border: 0; border-radius: 50%; background: linear-gradient(180deg, rgba(200,214,255,.5), rgba(90,110,170,.3)); }
.pn-avs button.on { background: var(--u-rim); box-shadow: 0 0 12px rgba(255,180,70,.6); } .pn-avs .face, .pn-avs .ini { width: 100%; height: 100%; border-radius: 50%; }
.pn-detail { display: grid; grid-template-columns: minmax(150px, 30%) 1fr; gap: 20px; align-items: start; }
.pn-detail .pic { aspect-ratio: .72; } .pn-detail .pic img.hcard, .pn-detail .pic .face, .pn-detail .pic .ini { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; border-radius: 4px; }
.pn-detail h3 { margin: 0; font: 800 italic clamp(30px, 9vh, 42px)/1 var(--u-disp); letter-spacing: .02em; text-transform: uppercase; display: inline-block; padding-right: 6px; }
.pn-detail .rl { margin: 4px 0 10px; font: 700 14px var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: var(--u-gc); } .pn-detail .rl i { font: 500 13px var(--u-body); font-style: normal; letter-spacing: 0; text-transform: none; color: #d8def4; }
.pn-detail .skd { display: grid; grid-template-columns: 44px 1fr; gap: 10px; align-items: start; margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #d8def4; }
.pn-detail .skd > img, .pn-detail .skd > i { width: 44px; height: 44px; border-radius: 50%; box-shadow: 0 0 0 2px #c89a48, 0 3px 6px rgba(0,0,0,.6); }
.pn-detail .skd > i { display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #3a2a5a, #120c24); } .pn-detail .skd > i img { width: 80%; height: 80%; }
.pn-detail .skd b { display: block; font: 700 16px/1.2 var(--u-disp); letter-spacing: .03em; color: var(--u-gc); } .pn-detail .btns { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; align-items: center; }
.pn-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 14px 0; }
.pn-cal div { position: relative; aspect-ratio: .8; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: linear-gradient(180deg, rgba(30,38,90,.85), rgba(12,16,42,.85)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.2), 0 3px 8px rgba(0,0,0,.4); }
.pn-cal div img.ui-ic { width: 66%; filter: drop-shadow(0 3px 4px rgba(0,0,0,.6)); } .pn-cal b { font: 700 13px/1 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: #e8e0cc; } .pn-cal small { font: 700 15px/1 var(--u-disp); color: #ffe08a; }
.pn-cal div.got { opacity: .55; } .pn-cal div.got::after { content: '✓'; position: absolute; top: 4px; right: 6px; font: 800 18px/1 var(--u-disp); color: #7dffa8; text-shadow: 0 0 6px #3ddc6a; }
.pn-cal div.today { box-shadow: inset 0 0 0 1.5px #ffd36a, 0 0 16px rgba(255,180,70,.6); } .pn-cal div.big { background: linear-gradient(180deg, rgba(110,70,20,.85), rgba(40,24,6,.85)); box-shadow: inset 0 0 0 1.5px rgba(255,214,120,.7), 0 3px 8px rgba(0,0,0,.4); }
.pn-ev { display: flex; align-items: center; gap: 14px; } .pn-ev > img.ui-ic { width: 72px; height: 72px; flex: none; filter: drop-shadow(0 4px 6px rgba(0,0,0,.6)); } .pn-ev h3 { margin: 0; font: 800 italic 26px/1 var(--u-disp); letter-spacing: .03em; display: inline-block; padding-right: 4px; } .pn-ev p { margin: 4px 0 0; font-size: 13px; color: #dfe6ff; }
.pn-sum { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; margin-bottom: 12px; } .pn-sum div { text-align: center; }
.pn-row .wl { flex: none; width: 54px; text-align: center; font: 800 italic 17px/1 var(--u-disp); letter-spacing: .04em; } .pn-row .wl.w { color: #ffd36a; text-shadow: 0 0 8px rgba(255,180,70,.6); } .pn-row .wl.l { color: #9fb0d8; }
.pn-row .sc { flex: none; min-width: 54px; text-align: center; font: 800 italic 22px/1 var(--u-disp); color: #fff; } .pn-row .sc small { display: block; margin-top: 2px; font: 700 10px/1 var(--u-disp); letter-spacing: .08em; color: #ffd27a; }
.pn-row .kd { flex: none; min-width: 70px; text-align: center; font: 700 17px/1 var(--u-disp); letter-spacing: .03em; color: #dfe6ff; }
.pn-row.me { background: linear-gradient(90deg, rgba(130,86,22,.7), rgba(40,26,8,.55)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.7), 0 0 12px rgba(255,180,70,.3); }
.pn-row .no { flex: none; width: 30px; text-align: center; font: 800 italic 24px/1 var(--u-disp); color: #9fb0d8; } .pn-row .no.n1 { color: #ffd36a; text-shadow: 0 0 8px rgba(255,180,70,.7); } .pn-row .no.n2 { color: #e6ecff; } .pn-row .no.n3 { color: #e0a070; }
.pn-row > .rkb { flex: none; } .pn-row > .rkb b { font-size: 11px; }
.pn-set .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; margin-bottom: 10px; border-radius: 6px; background: linear-gradient(90deg, rgba(30,38,90,.78), rgba(12,16,42,.62)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.16); font: 600 14px var(--u-body); }
.pn-set .seg { display: flex; border-radius: 17px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,214,140,.5); } .pn-set .seg button { padding: 8px 16px; border: 0; background: transparent; font: 700 14px/1 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: #cfd6ef; }
.pn-set .seg button.on { background: var(--u-gold); color: #3b1a02; }
.pn-note { font-size: 12px; color: #a8b4d8; text-align: center; margin: 12px 0 4px; }
`;
let styled = false;
const css = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); };
const gold = (n) => `<span class="cur">${icon('coin')}<b>${fmt(n)}</b></span>`;

export function openProfile(onChange) {
  css(); const p = profile(), r = rankOf(p.stars), best = rankOf(p.best);
  const { body } = panel({ title: 'Hồ sơ', right: gold(p.gold) });
  const render = () => {
    const kda = p.deaths ? ((p.kills + p.assists) / p.deaths).toFixed(1) : (p.kills + p.assists).toFixed(1);
    body.innerHTML = `<div class="pn-prof"><div class="av">${face(p.avatar)}</div><div>
      <h3><span class="gt">${p.name}</span><button type="button" class="icb" data-a="name" aria-label="Đổi tên">${ICON.edit()}</button></h3>
      <div class="rkrow">${rankBadge(r, 60)}<div><b>${r.name}</b><span class="stars">${stars(r)}</span><small>Cao nhất: ${best.name}</small></div></div>
      <div class="lvrow">Cấp <b>${p.level}</b><span class="pbar blue"><i style="width:${Math.min(100, Math.round((p.exp / expNeed(p.level)) * 100))}%"></i></span><span>${p.exp}/${expNeed(p.level)} KN</span></div>
      <div class="pn-avs">${ALPHA.map((id) => `<button type="button" data-av="${id}" class="${id === p.avatar ? 'on' : ''}">${face(id)}</button>`).join('')}</div></div></div>
      <div class="pn-stats"><div><small>Tổng số trận</small><b>${p.games}</b></div><div><small>Tỉ lệ thắng</small><b>${p.games ? Math.round(p.wins / p.games * 100) : 0}%</b></div>
      <div><small>Trận đấu hạng</small><b>${p.ranked}</b></div><div><small>Thắng đấu hạng</small><b>${p.rankedWins}</b></div>
      <div><small>Hạ / Chết / Hỗ trợ</small><b>${p.kills} / ${p.deaths} / ${p.assists}</b></div><div><small>KDA trung bình</small><b>${kda}</b></div><div><small>Số lần MVP</small><b>${p.mvp || 0}</b></div><div><small>Điểm trung bình</small><b>${p.games ? (p.scoreSum / p.games || 0).toFixed(1) : '—'}</b></div></div>`;
  };
  render();
  body.onclick = (e) => {
    const av = e.target.closest('[data-av]'); if (av) { p.avatar = av.dataset.av; saveProfile(); render(); onChange?.(); return; }
    if (e.target.closest('[data-a="name"]')) {
      dialog({ title: 'Đổi tên', html: `Tên hiển thị (2–16 ký tự)<input maxlength="16" value="${p.name.replace(/"/g, '&quot;')}">`, buttons: [{ text: 'Huỷ' }, { text: 'Lưu', cls: 'gold', on: (w) => {
        const v = w.querySelector('input').value.trim().replace(/[<>&"]/g, ''); if (v.length < 2) { toast('Tên quá ngắn'); return false; }
        p.name = v; saveProfile(); render(); onChange?.(); return true; } }] });
      setTimeout(() => document.querySelector('.ui-dlg input')?.focus(), 50);
    }
  };
}

export function openFriends() {
  css(); const { body } = panel({ title: 'Bạn bè' });
  body.innerHTML = FRIENDS.map((f) => `<div class="pn-row">${face(f.avatar)}<div><b>${f.name}</b><small>${f.rank.name} · ${statusText(f)}</small></div>${rankBadge(f.rank, 40)}<button type="button" class="btn-blue go" data-f="${f.id}" ${f.status === 'online' ? '' : 'disabled'}>Nhắn</button></div>`).join('');
  body.onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) toast('Đã gửi lời chào tới ' + FRIENDS.find((f) => f.id === b.dataset.f).name); };
}

export function openMail(onChange) {
  css(); const p = profile(); const { body, el } = panel({ title: 'Hộp thư', right: gold(p.gold) });
  const render = () => {
    body.innerHTML = mailbox().slice().reverse().map((m) => `<div class="pn-row">${icon(m.got ? 'mail' : 'chest')}<div><b>${m.title}</b><small>${m.body}</small></div><button type="button" class="btn-gold go" data-m="${m.id}" ${m.got ? 'disabled' : ''}>${m.got ? 'Đã nhận' : `Nhận ${m.gold}`}</button></div>`).join('');
    el.querySelector('.ui-hr').innerHTML = gold(p.gold);
  };
  render();
  body.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const g = claimMail(b.dataset.m); if (g) toast(`+${g} vàng`); render(); onChange?.(); };
}

export function openMissions(onChange) {
  css(); const p = profile(); const { body, el } = panel({ title: 'Nhiệm vụ hằng ngày', right: gold(p.gold) });
  const render = () => {
    body.innerHTML = MISSIONS.map((m) => { const s = missionState(m); return `<div class="pn-row">${icon(s.done ? 'chest' : 'scroll')}<div><b>${m.name}</b><small>${s.v}/${m.goal} · thưởng ${m.gold} vàng${m.item ? ' + 1 ' + BAG_ITEMS[m.item].name : ''}</small><span class="pbar"><i style="width:${(s.v / m.goal) * 100}%"></i></span></div><button type="button" class="btn-gold go" data-m="${m.id}" ${s.done && !s.claimed ? '' : 'disabled'}>${s.claimed ? 'Đã nhận' : s.done ? 'Nhận' : 'Chưa xong'}</button></div>`; }).join('')
      + '<p class="pn-note">Nhiệm vụ làm mới mỗi ngày.</p>';
    el.querySelector('.ui-hr').innerHTML = gold(p.gold);
  };
  render();
  body.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const g = claimMission(b.dataset.m); if (g) toast(`+${g} vàng`); render(); onChange?.(); };
}

/** Danh sách tướng: tướng chơi được (6) + tướng sắp có; chạm tướng xem kỹ năng, đặt làm tướng đứng ở sảnh. */
export function openHeroes(onFeature) {
  css(); const p = profile(); const { body } = panel({ title: 'Tướng', right: `<span style="font-size:13px;color:#a8b4d8">Sở hữu ${ALPHA.length}/${Object.keys(HEROES).length}</span>` });
  const ids = Object.keys(HEROES).sort((a, b) => (ALPHA.includes(b) - ALPHA.includes(a)) || ALPHA.indexOf(a) - ALPHA.indexOf(b));
  const grid = () => {
    body.innerHTML = `<div class="pn-grid">${ids.map((id) => { const h = HEROES[id], ok = ALPHA.includes(id);
      return `<button type="button" class="pn-hero ${ok ? '' : 'lock'} ${id === p.feature ? 'on' : ''}" data-id="${id}">${ok ? `<img class="hcard" src="${cardSrc(id)}" alt="">` : face(id)}<span><b>${h.name}</b><small>${ROLE_VI[h.roles[0]] || ''}</small></span>${ok ? '' : '<em>Sắp có</em>'}</button>`; }).join('')}</div>`;
  };
  const detail = (id) => {
    const h = HEROES[id], ok = ALPHA.includes(id), sk = [['Nội tại', h.passive], ['K1', h.skills.s1], ['K2', h.skills.s2], ['K3', h.skills.s3]];
    const art = (i) => (i && hasPaintedSkill(id, 's' + i) ? paintedSkill(id, 's' + i) : `<i>${icon('star')}</i>`);
    body.innerHTML = `<div class="pn-detail"><div class="pic fr">${ok ? `<img class="hcard" src="${cardSrc(id)}" alt="">` : face(id, 'face hcard')}</div><div>
      <h3 class="gt">${h.name}</h3><p class="rl">${h.roles.map((r) => ROLE_VI[r]).join(' · ')} — <i>${h.title}</i></p>
      ${sk.map(([k, s], i) => (s ? `<div class="skd">${art(i)}<div><b>${k} · ${s.name}</b>${i ? skillDesc(s) : s.desc || ''}</div></div>` : '')).join('')}
      <div class="btns">${ok ? `<button type="button" class="btn-gold" data-a="feature">Đặt làm tướng ở sảnh</button>` : '<span style="color:#ffd28a">Tướng sắp ra mắt</span>'}<button type="button" class="btn-ghost" data-a="back">Danh sách</button></div></div></div>`;
    body.onclick = (e) => {
      if (e.target.closest('[data-a="back"]')) { grid(); body.onclick = onGrid; }
      else if (e.target.closest('[data-a="feature"]')) { p.feature = id; saveProfile(); onFeature?.(id); toast(`${h.name} sẽ đứng ở sảnh`); grid(); body.onclick = onGrid; }
    };
  };
  const onGrid = (e) => { const b = e.target.closest('[data-id]'); if (b) detail(b.dataset.id); };
  grid(); body.onclick = onGrid;
}

/** Danh mục trang bị (xem chỉ số, giá) theo các thẻ của cửa hàng trong trận. */
export function openItems() {
  css(); const { body } = panel({ title: 'Trang bị' });
  let tab = SHOP_TABS[0]?.id;
  const STAT = { atk: 'Công', ap: 'Phép', maxHp: 'Máu', maxMana: 'Năng lượng', armor: 'Giáp', mr: 'Kháng phép', atkSpeedPct: 'Tốc đánh', crit: 'Chí mạng', moveSpeed: 'Tốc chạy', lifesteal: 'Hút máu', spellvamp: 'Hút máu phép', cdr: 'Giảm hồi chiêu', armorPen: 'Xuyên giáp', magicPen: 'Xuyên phép', hpRegen: 'Hồi máu', manaRegen: 'Hồi năng lượng' };
  const pct = (k) => /Pct|crit|lifesteal|spellvamp|cdr/.test(k);
  const hero = HEROES[profile().feature];
  const render = () => { // thẻ "Gợi ý": bộ đồ đề xuất của tướng đang đứng ở sảnh (trong trận: của tướng đang chơi)
    const list = tab === 'rec' ? (hero.recommendedBuild || []).filter((id) => ITEMS[id]).map((id) => [id, ITEMS[id]])
      : Object.entries(ITEMS).filter(([, it]) => it.tab === tab).sort((a, b) => a[1].cost - b[1].cost);
    body.innerHTML = `<div class="pn-tabs">${SHOP_TABS.map((t) => `<button type="button" data-t="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.name}</button>`).join('')}</div>
      ${tab === 'rec' ? `<p style="margin:0 0 8px;font-size:12px;color:#a8b4d8">Bộ đồ gợi ý cho <b style="color:#ffe08a">${hero.name}</b> (đổi tướng ở mục Tướng)</p>` : ''}
      <div class="pn-grid" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">${list.map(([id, it]) => `<button type="button" class="pn-item" data-i="${id}"><img src="${itemArtURL(id, it.tier)}" alt=""><b>${it.name}</b><small>${icon('coin')}${it.cost}</small></button>`).join('')}</div>`;
  };
  render();
  body.onclick = (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
    const b = e.target.closest('[data-i]'); if (!b) return; const it = ITEMS[b.dataset.i];
    const st = Object.entries(it.stats || {}).map(([k, v]) => `+${pct(k) ? Math.round(v * 100) + '%' : v} ${STAT[k] || k}`).join('<br>');
    dialog({ title: it.name, html: `<img src="${itemArtURL(b.dataset.i, it.tier)}" alt="" style="width:64px;height:64px;border-radius:10px"><p>${st || ''}</p>${it.desc ? `<p style="color:#ffd28a">${it.desc}</p>` : ''}<p>Giá: <b style="color:#ffe08a">${it.cost}</b> vàng</p>` });
  };
}

export function openBag() {
  css(); const p = profile(); const { body } = panel({ title: 'Túi đồ' });
  body.innerHTML = Object.entries(p.bag || {}).filter(([id, n]) => n > 0 && BAG_ITEMS[id]).map(([id, n]) => `<div class="pn-row">${icon('star')}<div><b>${BAG_ITEMS[id].name} ×${n}</b><small>${BAG_ITEMS[id].desc}</small></div></div>`).join('') + `<div class="pn-row">${icon('scroll')}<div><b>Thẻ đổi tên</b><small>Đổi tên miễn phí ở mục Hồ sơ.</small></div></div>
    <div class="pn-row">${icon('lantern')}<div><b>Đèn lồng may mắn ×3</b><small>Dùng trong sự kiện Lễ Hội Đèn Lồng (sắp mở).</small></div></div>`;
}

export function openSettings() {
  css(); const { body } = panel({ title: 'Cài đặt' });
  const Q = 'la.quality', cur = (() => { try { return localStorage.getItem(Q) || 'mid'; } catch (_) { return 'mid'; } })();
  body.innerHTML = `<div class="pn-set"><div class="row"><span>Chất lượng đồ hoạ</span><span class="seg">${[['low', 'Thấp'], ['mid', 'Vừa'], ['high', 'Cao']].map(([v, n]) => `<button type="button" data-q="${v}" class="${v === cur ? 'on' : ''}">${n}</button>`).join('')}</span></div>
    <div class="row"><span>Dữ liệu người chơi</span><button type="button" class="btn-ghost" data-a="reset">Xoá & bắt đầu lại</button></div>
    <p class="pn-note">Vị trí cửa hàng trong trận: nút bánh răng góc phải khi đang chơi.</p></div>`;
  body.onclick = (e) => {
    const b = e.target.closest('[data-q]'); if (b) { try { localStorage.setItem(Q, b.dataset.q); } catch (_) { /* riêng tư */ } body.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b)); toast('Áp dụng từ trận sau'); }
    if (e.target.closest('[data-a="reset"]')) dialog({ title: 'Xoá dữ liệu?', html: 'Vàng, hạng, thống kê sẽ về ban đầu.', buttons: [{ text: 'Huỷ' }, { text: 'Xoá', cls: 'gold', on: () => { try { localStorage.removeItem('la.profile'); } catch (_) { /* riêng tư */ } location.reload(); } }] });
  };
}

/** Sự kiện Lễ Hội Đèn Lồng: điểm danh 7 ngày, mỗi ngày nhận một phần quà vàng. */
export function openEvent(onChange) {
  css(); const p = profile(); const { body, el } = panel({ title: 'Lễ Hội Đèn Lồng', right: gold(p.gold) });
  const REW = [100, 150, 200, 250, 300, 400, 800], today = new Date().toISOString().slice(0, 10);
  const render = () => {
    const got = p.checkin || 0, canToday = p.checkinDay !== today && got < 7;
    body.innerHTML = `<div class="pn-ev">${icon('lantern')}<div><h3 class="gt">Lễ Hội Đèn Lồng</h3><p>Điểm danh mỗi ngày để nhận quà. Ngày thứ 7: <b style="color:#ffe08a">800 vàng</b>.</p></div></div>
      <div class="pn-cal">${REW.map((g, i) => `<div class="${i < got ? 'got' : ''} ${i === got && canToday ? 'today' : ''} ${i === 6 ? 'big' : ''}">${icon(i === 6 ? 'chest' : i % 2 ? 'coins' : 'coin')}<b>Ngày ${i + 1}</b><small>${g}</small></div>`).join('')}</div>
      <button type="button" class="btn-gold" data-a="claim" ${canToday ? '' : 'disabled'}>${canToday ? 'Điểm danh hôm nay' : got >= 7 ? 'Đã hoàn thành' : 'Mai quay lại nhé'}</button>`;
    el.querySelector('.ui-hr').innerHTML = gold(p.gold);
  };
  render();
  body.onclick = (e) => {
    if (!e.target.closest('[data-a="claim"]')) return;
    const got = p.checkin || 0; if (p.checkinDay === today || got >= 7) return;
    p.gold += REW[got]; p.checkin = got + 1; p.checkinDay = today; saveProfile(); toast(`+${REW[got]} vàng`); render(); onChange?.();
  };
}

/** Bảng xếp hạng bạn bè (theo sao hạng) — có cả mình. */
export function openLeaderboard() {
  css(); const p = profile(); const { body } = panel({ title: 'Xếp hạng bạn bè' });
  const rows = [...FRIENDS.map((f) => ({ name: f.name, avatar: f.avatar, stars: f.stars })), { name: p.name, avatar: p.avatar, stars: p.stars, me: true }].sort((a, b) => b.stars - a.stars);
  body.innerHTML = rows.map((r, i) => { const rk = rankOf(r.stars);
    return `<div class="pn-row ${r.me ? 'me' : ''}"><span class="no n${i + 1}">${i + 1}</span>${face(r.avatar)}<div><b>${r.name}${r.me ? ' (bạn)' : ''}</b><small>${rk.name} · ${rk.max ? `${rk.star}/${rk.max} sao` : `${rk.star} sao`}</small></div>${rankBadge(rk, 40)}</div>`; }).join('');
}

/** Lịch sử đấu + tổng hợp: số trận, tỉ lệ thắng, K/D/A tổng, KDA và điểm trung bình, số lần MVP; từng trận gần nhất (tối đa 20). */
export function openHistory() {
  css(); const p = profile(); const { body } = panel({ title: 'Lịch sử đấu' });
  const H = p.history || [], n = H.length, sum = (k) => H.reduce((a, m) => a + (m[k] || 0), 0);
  const kda = (k, d, a) => ((k + a) / Math.max(1, d)).toFixed(1);
  const date = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  body.innerHTML = `<div class="pn-sum"><div><small>Tổng số trận</small><b>${p.games}</b></div><div><small>Tỉ lệ thắng</small><b>${p.games ? Math.round((p.wins / p.games) * 100) : 0}%</b></div>
    <div><small>Hạ / Chết / Hỗ trợ</small><b>${p.kills}/${p.deaths}/${p.assists}</b></div><div><small>KDA trung bình</small><b>${kda(p.kills, p.deaths, p.assists)}</b></div>
    <div><small>Điểm trung bình</small><b>${p.games ? ((p.scoreSum || 0) / p.games).toFixed(1) : '—'}</b></div><div><small>Số lần MVP</small><b>${p.mvp || 0}</b></div>
    <div><small>${n} trận gần nhất</small><b>${n ? kda(sum('k'), sum('d'), sum('a')) : '—'}</b></div></div>
    ${n ? H.map((m) => `<div class="pn-row">${face(m.heroId || p.avatar)}<div><b>${HEROES[m.heroId]?.name || ''}</b><small>${MODES[m.mode]?.short || ''} · ${date(m.t)}</small></div>
      <span class="wl ${m.win ? 'w' : 'l'}">${m.win ? 'THẮNG' : 'THUA'}</span><span class="kd">${m.k}/${m.d}/${m.a}</span><span class="sc">${m.score.toFixed(1)}${m.mvp ? '<small>MVP</small>' : ''}</span></div>`).join('')
      : '<p class="pn-note">Chưa có trận nào — vào Đấu thường hoặc Đấu hạng để bắt đầu.</p>'}`;
}
