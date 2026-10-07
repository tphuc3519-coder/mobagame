// Các bảng mở từ sảnh: hồ sơ, bạn bè, thư, nhiệm vụ, tướng, trang bị, túi đồ, cài đặt, sự kiện. Bảng phủ toàn màn kiểu Liên Quân.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { ITEMS, SHOP_TABS } from '../data/items.js';
import { itemArtURL } from '../hud/itemArt.js';
import { ICON, face, cardSrc, panel, dialog, toast, fmt, rankBadge, stars } from './kit.js';
import { profile, saveProfile, rankOf, expNeed, MISSIONS, missionState, claimMission, mailbox, claimMail, BAG_ITEMS } from './profile.js';
import { FRIENDS, statusText } from './people.js';
import { MODES } from './modes.js';

export const ROLE_VI = { fighter: 'Đấu sĩ', tank: 'Đỡ đòn', assassin: 'Sát thủ', mage: 'Pháp sư', marksman: 'Xạ thủ', support: 'Trợ thủ' };
const STYLE = `
.pn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(96px, 15vw, 128px), 1fr)); gap: 10px; }
.pn-hero { position: relative; aspect-ratio: .72; border-radius: 10px; overflow: hidden; border: 2px solid #8fb8ff44; background: #151332; padding: 0; display: flex; flex-direction: column; }
.pn-hero img.cd, .pn-hero .face, .pn-hero .ini { width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: 50% 20%; }
.pn-hero span { padding: 4px 6px; text-align: left; background: #0b0a18ee; } .pn-hero b { display: block; font-size: 13px; } .pn-hero small { font-size: 10px; color: #cdb8ff; }
.pn-hero.lock { filter: grayscale(.8) brightness(.55); } .pn-hero em { position: absolute; top: 6px; right: 6px; padding: 2px 6px; border-radius: 6px; background: #000b; font: 700 10px 'Be Vietnam Pro', system-ui; font-style: normal; color: #ffd28a; }
.pn-hero.on { border-color: #ffd27a; box-shadow: 0 0 14px #ffb84a88; }
.pn-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff12; margin-bottom: 8px; }
.pn-row .face, .pn-row .ini { width: 44px; height: 44px; border-radius: 8px; flex: none; } .pn-row div { flex: 1; min-width: 0; } .pn-row b { display: block; font-size: 14px; } .pn-row small { font-size: 12px; color: #b8c4e8; }
.pn-row .go { flex: none; min-width: 84px; height: 34px; border-radius: 17px; border: 0; font: 800 13px 'Be Vietnam Pro', system-ui; background: linear-gradient(180deg, #ffe58a, #e8a23a); color: #3a1c00; }
.pn-row .go[disabled] { background: #2a3050; color: #8a90b0; }
.pn-row .prog { height: 6px; border-radius: 3px; background: #0006; margin-top: 6px; overflow: hidden; } .pn-row .prog i { display: block; height: 100%; background: linear-gradient(90deg, #4fa8ff, #9fe8ff); }
.pn-tabs { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; } .pn-tabs button { height: 32px; padding: 0 14px; border-radius: 16px; border: 1px solid #8fb8ff55; background: #0b1a44; font: 700 13px 'Be Vietnam Pro', system-ui; } .pn-tabs button.on { background: #ffd27a; color: #3a1c00; border-color: #fff3b0; }
.pn-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff14; } .pn-item img { width: 52px; height: 52px; border-radius: 8px; } .pn-item b { font-size: 11px; text-align: center; line-height: 1.2; } .pn-item small { font-size: 11px; color: #ffe08a; display: flex; gap: 3px; align-items: center; } .pn-item small svg { width: 13px; height: 13px; }
.pn-prof { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: start; }
.pn-prof .av { width: 96px; height: 96px; border-radius: 14px; border: 3px solid #ffd27a; overflow: hidden; } .pn-prof .av .face, .pn-prof .av .ini { width: 100%; height: 100%; }
.pn-prof h3 { margin: 0; font-size: 22px; display: flex; align-items: center; gap: 8px; } .pn-prof h3 button { width: 30px; height: 30px; border: 0; background: none; padding: 4px; }
.pn-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 12px; } .pn-stats div { padding: 8px 10px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff12; } .pn-stats small { display: block; font-size: 11px; color: #a8b4d8; } .pn-stats b { font-size: 18px; color: #ffe8a8; }
.pn-avs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; } .pn-avs button { width: 48px; height: 48px; padding: 0; border-radius: 10px; overflow: hidden; border: 2px solid #ffffff22; background: #151332; } .pn-avs button.on { border-color: #ffd27a; } .pn-avs .face, .pn-avs .ini { width: 100%; height: 100%; }
.pn-detail { display: grid; grid-template-columns: minmax(150px, 34%) 1fr; gap: 16px; } .pn-detail img.cd { width: 100%; border-radius: 12px; border: 2px solid #ffd27a88; } .pn-detail h3 { margin: 0 0 4px; font-size: 24px; color: #fff4dc; } .pn-detail p { margin: 6px 0; font-size: 13px; line-height: 1.5; color: #d8def4; } .pn-detail .sk b { color: #ffd28a; }
.pn-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 10px 0; } .pn-cal div { aspect-ratio: .8; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff18; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; } .pn-cal div svg { width: 30px; height: 30px; } .pn-cal div.got { opacity: .45; } .pn-cal div.today { border-color: #ffd27a; box-shadow: 0 0 12px #ffb84a77; }
.pn-sum { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; margin-bottom: 10px; } .pn-sum div { padding: 8px 10px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffd27a33; text-align: center; } .pn-sum small { display: block; font-size: 11px; color: #a8b4d8; } .pn-sum b { font-size: 19px; color: #ffe8a8; }
.pn-row .wl { flex: none; width: 46px; text-align: center; font: italic 900 13px 'Be Vietnam Pro', system-ui; } .pn-row .wl.w { color: #ffd36a; } .pn-row .wl.l { color: #9fb0d8; }
.pn-row .sc { flex: none; min-width: 52px; text-align: center; font: 900 18px 'Be Vietnam Pro', system-ui; color: #fff; } .pn-row .sc small { display: block; font-size: 10px; color: #ffd27a; font-weight: 800; }
.pn-row .kd { flex: none; font: 800 14px 'Be Vietnam Pro', system-ui; color: #dfe6ff; min-width: 70px; text-align: center; }
.pn-row.me { border-color: #ffd27a; background: #ffd27a14; } .pn-row .no { flex: none; width: 26px; text-align: center; font: 900 16px 'Be Vietnam Pro', system-ui; color: #ffd27a; } .pn-row .rkb { flex: none; }
.pn-set .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-radius: 10px; background: #ffffff0a; margin-bottom: 8px; } .pn-set .seg { display: flex; border: 1px solid #c9b47a88; border-radius: 8px; overflow: hidden; } .pn-set .seg button { padding: 8px 12px; border: 0; background: #171b33; font: 600 13px 'Be Vietnam Pro', system-ui; } .pn-set .seg button.on { background: #c9b47a; color: #1a1200; }
`;
let styled = false;
const css = () => { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); };
const gold = (n) => `<span class="cur">${ICON.coin()}<b>${fmt(n)}</b></span>`;

export function openProfile(onChange) {
  css(); const p = profile(), r = rankOf(p.stars), best = rankOf(p.best);
  const { body } = panel({ title: 'Hồ sơ', right: gold(p.gold) });
  const render = () => {
    const kda = p.deaths ? ((p.kills + p.assists) / p.deaths).toFixed(1) : (p.kills + p.assists).toFixed(1);
    body.innerHTML = `<div class="pn-prof"><div class="av">${face(p.avatar)}</div><div>
      <h3>${p.name}<button type="button" data-a="name" aria-label="Đổi tên">${ICON.edit()}</button></h3>
      <div style="display:flex;gap:10px;align-items:center;margin-top:6px">${rankBadge(r, 46)}<div><b>${r.name}</b><div class="stars">${stars(r)}</div><small style="color:#a8b4d8">Cao nhất: ${best.name}</small></div></div>
      <div style="margin-top:8px;font-size:13px">Cấp <b style="color:#ffe08a">${p.level}</b> · KN ${p.exp}/${expNeed(p.level)}</div>
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
  body.innerHTML = FRIENDS.map((f) => `<div class="pn-row">${face(f.avatar)}<div><b>${f.name}</b><small>${f.rank.name} · ${statusText(f)}</small></div><button type="button" class="go" data-f="${f.id}" ${f.status === 'online' ? '' : 'disabled'}>Nhắn</button></div>`).join('');
  body.onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) toast('Đã gửi lời chào tới ' + FRIENDS.find((f) => f.id === b.dataset.f).name); };
}

export function openMail(onChange) {
  css(); const p = profile(); const { body, el } = panel({ title: 'Hộp thư', right: gold(p.gold) });
  const render = () => {
    body.innerHTML = mailbox().slice().reverse().map((m) => `<div class="pn-row"><i style="width:44px;height:44px;flex:none">${ICON.mail()}</i><div><b>${m.title}</b><small>${m.body}</small></div><button type="button" class="go" data-m="${m.id}" ${m.got ? 'disabled' : ''}>${m.got ? 'Đã nhận' : `Nhận ${m.gold}`}</button></div>`).join('');
    el.querySelector('.ui-hr').innerHTML = gold(p.gold);
  };
  render();
  body.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const g = claimMail(b.dataset.m); if (g) toast(`+${g} vàng`); render(); onChange?.(); };
}

export function openMissions(onChange) {
  css(); const p = profile(); const { body, el } = panel({ title: 'Nhiệm vụ hằng ngày', right: gold(p.gold) });
  const render = () => {
    body.innerHTML = MISSIONS.map((m) => { const s = missionState(m); return `<div class="pn-row"><i style="width:40px;height:40px;flex:none">${ICON.book()}</i><div><b>${m.name}</b><small>${s.v}/${m.goal} · thưởng ${m.gold} vàng${m.item ? ' + 1 ' + BAG_ITEMS[m.item].name : ''}</small><div class="prog"><i style="width:${(s.v / m.goal) * 100}%"></i></div></div><button type="button" class="go" data-m="${m.id}" ${s.done && !s.claimed ? '' : 'disabled'}>${s.claimed ? 'Đã nhận' : s.done ? 'Nhận' : 'Chưa xong'}</button></div>`; }).join('')
      + '<p style="font-size:12px;color:#a8b4d8;text-align:center">Nhiệm vụ làm mới mỗi ngày.</p>';
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
      return `<button type="button" class="pn-hero ${ok ? '' : 'lock'} ${id === p.feature ? 'on' : ''}" data-id="${id}">${ok ? `<img class="cd" src="${cardSrc(id)}" alt="">` : face(id)}<span><b>${h.name}</b><small>${ROLE_VI[h.roles[0]] || ''}</small></span>${ok ? '' : '<em>Sắp có</em>'}</button>`; }).join('')}</div>`;
  };
  const detail = (id) => {
    const h = HEROES[id], ok = ALPHA.includes(id), sk = [['Nội tại', h.passive], ['K1', h.skills.s1], ['K2', h.skills.s2], ['K3', h.skills.s3]];
    body.innerHTML = `<div class="pn-detail"><div>${ok ? `<img class="cd" src="${cardSrc(id)}" alt="">` : face(id, 'face cd')}</div><div>
      <h3>${h.name}</h3><p style="color:#ffd28a">${h.roles.map((r) => ROLE_VI[r]).join(' · ')} — ${h.title}</p>
      ${sk.map(([k, s]) => (s ? `<p class="sk"><b>${k} · ${s.name}:</b> ${s.desc || ''}</p>` : '')).join('')}
      <div style="display:flex;gap:10px;margin-top:12px">${ok ? `<button type="button" class="btn-gold" data-a="feature" style="height:42px;font-size:15px">Đặt làm tướng ở sảnh</button>` : '<span style="color:#ffd28a">Tướng sắp ra mắt</span>'}<button type="button" class="btn-ghost" data-a="back">Danh sách</button></div></div></div>`;
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
  const render = () => {
    const list = Object.entries(ITEMS).filter(([, it]) => it.tab === tab).sort((a, b) => a[1].cost - b[1].cost);
    body.innerHTML = `<div class="pn-tabs">${SHOP_TABS.map((t) => `<button type="button" data-t="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.name}</button>`).join('')}</div>
      <div class="pn-grid" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">${list.map(([id, it]) => `<button type="button" class="pn-item" data-i="${id}"><img src="${itemArtURL(id, it.tier)}" alt=""><b>${it.name}</b><small>${ICON.coin()}${it.cost}</small></button>`).join('')}</div>`;
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
  body.innerHTML = Object.entries(p.bag || {}).filter(([id, n]) => n > 0 && BAG_ITEMS[id]).map(([id, n]) => `<div class="pn-row"><i style="width:44px;height:44px;flex:none">${ICON.star()}</i><div><b>${BAG_ITEMS[id].name} ×${n}</b><small>${BAG_ITEMS[id].desc}</small></div></div>`).join('') + `<div class="pn-row"><i style="width:44px;height:44px;flex:none">${ICON.edit()}</i><div><b>Thẻ đổi tên</b><small>Đổi tên miễn phí ở mục Hồ sơ.</small></div></div>
    <div class="pn-row"><i style="width:44px;height:44px;flex:none">${ICON.lantern()}</i><div><b>Đèn lồng may mắn ×3</b><small>Dùng trong sự kiện Lễ Hội Đèn Lồng (sắp mở).</small></div></div>`;
}

export function openSettings() {
  css(); const { body } = panel({ title: 'Cài đặt' });
  const Q = 'la.quality', cur = (() => { try { return localStorage.getItem(Q) || 'mid'; } catch (_) { return 'mid'; } })();
  body.innerHTML = `<div class="pn-set"><div class="row"><span>Chất lượng đồ hoạ</span><span class="seg">${[['low', 'Thấp'], ['mid', 'Vừa'], ['high', 'Cao']].map(([v, n]) => `<button type="button" data-q="${v}" class="${v === cur ? 'on' : ''}">${n}</button>`).join('')}</span></div>
    <div class="row"><span>Dữ liệu người chơi</span><button type="button" class="btn-ghost" data-a="reset">Xoá & bắt đầu lại</button></div>
    <p style="font-size:12px;color:#a8b4d8">Vị trí cửa hàng trong trận: nút bánh răng góc phải khi đang chơi.</p></div>`;
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
    body.innerHTML = `<p style="margin:0;font-size:14px;color:#dfe6ff">Điểm danh mỗi ngày để nhận quà. Ngày thứ 7: <b style="color:#ffe08a">800 vàng</b>.</p>
      <div class="pn-cal">${REW.map((g, i) => `<div class="${i < got ? 'got' : ''} ${i === got && canToday ? 'today' : ''}">${ICON.lantern()}<b>Ngày ${i + 1}</b><small>${g}</small></div>`).join('')}</div>
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
    return `<div class="pn-row ${r.me ? 'me' : ''}"><span class="no">${i + 1}</span>${face(r.avatar)}<div><b>${r.name}${r.me ? ' (bạn)' : ''}</b><small>${rk.name} · ${rk.max ? `${rk.star}/${rk.max} sao` : `${rk.star} sao`}</small></div>${rankBadge(rk, 40)}</div>`; }).join('');
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
      : '<p style="text-align:center;color:#a8b4d8">Chưa có trận nào — vào Đấu thường hoặc Đấu hạng để bắt đầu.</p>'}`;
}
