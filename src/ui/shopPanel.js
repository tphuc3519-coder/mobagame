// Cửa hàng ngọc (GĐ5b — mở từ dấu + cạnh ô ngọc ở sảnh): thẻ Trang phục (phối màu vĩnh viễn cho tướng, mặc / cởi), thẻ Vật phẩm (đổi ngọc lấy
// rương, bùa, thẻ, vàng), thẻ Nhận ngọc (ngọc kiếm ở đâu — không có nạp tiền). Mua xong hiện màn Nhận thưởng; trang phục phủ màu ngay ở sảnh.
import { icon, face, panel, toast, fmt, dialog } from './kit.js';
import { profile, buyCostume, wearShopCostume, buyGemItem, COSTUMES, GEM_SHOP } from './profile.js';
import { ownsCostume } from './season.js';
import { CURRENCY } from '../data/rewards.js';
import { GEM_FROM } from '../data/shop.js';
import { WEEK_BONUS } from '../data/missions.js';
import { SEASON_END, JOURNEY, SKIN_LOCKED } from '../data/seasons.js';
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { showRewards } from './rewards.js';
import { panelCss } from './panels.js';

const STYLE = `.sh-cur { display: flex; gap: 10px; } .sh-cur .cur { display: inline-flex; align-items: center; gap: 4px; font: 700 15px/1 var(--u-disp); color: #ffe8a8; } .sh-cur img.ui-ic { width: 22px; height: 22px; }
.sh-heroes { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: thin; }
.sh-heroes button { flex: none; width: 52px; height: 52px; padding: 2px; border: 0; border-radius: 50%; background: rgba(160,176,220,.25); position: relative; }
.sh-heroes button .face { width: 100%; height: 100%; border-radius: 50%; } .sh-heroes button.on { background: var(--u-gold); box-shadow: 0 0 10px rgba(255,190,80,.6); }
.sh-heroes button i { position: absolute; right: -2px; bottom: -2px; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 0 2px #10132a; }
.sh-looks { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.sh-look { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 8px; border-radius: 8px; background: linear-gradient(180deg, rgba(30,38,90,.8), rgba(12,16,42,.75)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.18); }
.sh-look.wear { box-shadow: inset 0 0 0 2px #7dffa8, 0 0 12px rgba(125,255,168,.35); }
.sh-look .sw { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; box-shadow: inset 0 0 0 2px rgba(255,255,255,.45); } .sh-look .sw .face { width: 100%; height: 100%; mix-blend-mode: multiply; }
.sh-look b { font: 700 15px/1.1 var(--u-disp); color: #fff0c8; } .sh-look .go { min-width: 110px; height: 32px; font-size: 14.5px; } .sh-look .go img.ui-ic { width: 18px; height: 18px; margin-right: 4px; vertical-align: -3px; }
.pn-row .go img.ui-ic { width: 20px; height: 20px; margin: 0 4px 0 0; vertical-align: -4px; filter: none; }`;
let styled = false;
const cur = (k, n) => `<span class="cur" title="${CURRENCY[k].name}">${icon(CURRENCY[k].icon)}<b>${fmt(n)}</b></span>`;
const HEROS = () => ALPHA.filter((h) => !SKIN_LOCKED.includes(h)); // 4 model cao cấp giữ nguyên hình (luật 11)

export function openShop(onChange, tab0 = 'costume') {
  panelCss();
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); }
  const p = profile(); const { body, el } = panel({ title: 'Cửa hàng', onClose: onChange });
  let tab = tab0, hero = HEROS().includes(p.feature) ? p.feature : HEROS()[0];
  const render = () => {
    el.querySelector('.ui-hr').innerHTML = `<span class="sh-cur">${cur('gems', p.gems || 0)}${cur('gold', p.gold)}</span>`;
    const tabs = `<div class="pn-tabs">${[['costume', 'Trang phục'], ['items', 'Vật phẩm'], ['earn', 'Nhận ngọc']].map(([k, n]) => `<button type="button" data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (tab === 'costume') {
      const wear = p.skinOn?.[hero];
      body.innerHTML = tabs + `<div class="sh-heroes">${HEROS().map((h) => { const w = p.skinOn?.[h], c = typeof w === 'string' ? COSTUMES.find((x) => x.id === w) : null;
        return `<button type="button" data-h="${h}" class="${h === hero ? 'on' : ''}" aria-label="${HEROES[h].name}">${face(h)}${c ? `<i style="background:${c.tint}"></i>` : ''}</button>`; }).join('')}</div>
        <p class="pn-note" style="margin:0 2px 10px"><b style="color:#fff0c8">${HEROES[hero].name}</b> — phối màu vĩnh viễn, không đổi chỉ số. Mặc trong trận và ở sảnh.</p>
        <div class="sh-looks">${COSTUMES.map((c) => { const own = ownsCostume(p, hero, c.id), on = wear === c.id;
          const btn = !own ? `<button type="button" class="btn-gold go" data-buy="${c.id}" ${(p.gems || 0) >= c.price ? '' : 'disabled'}>${icon('gem')}${c.price}</button>`
            : `<button type="button" class="${on ? 'btn-blue' : 'btn-gold'} go" data-wear="${c.id}">${on ? 'Cởi' : 'Mặc'}</button>`;
          return `<div class="sh-look ${on ? 'wear' : ''}"><span class="sw" style="background:${c.tint}">${face(hero)}</span><b>${c.name}</b>${btn}</div>`; }).join('')}</div>
        <p class="pn-note">Bốn tướng mang model cao cấp giữ nguyên hình, không có trang phục.</p>`;
    } else if (tab === 'items') {
      body.innerHTML = tabs + GEM_SHOP.map((it) => `<div class="pn-row">${icon(it.icon)}<div><b>${it.name}</b><small>${it.desc}</small></div><button type="button" class="btn-gold go" data-item="${it.id}" ${(p.gems || 0) >= it.price ? '' : 'disabled'}>${icon('gem')}${it.price}</button></div>`).join('');
    } else {
      const gal = SEASON_END[SEASON_END.length - 1], nq = SEASON_END[6], jr = JOURNEY.find((j) => j.gems);
      body.innerHTML = tabs + [
        ['star', 'Lên cấp tài khoản', `+${GEM_FROM.levelUp} ngọc mỗi lần lên cấp`],
        ['chest', WEEK_BONUS.name, `+${WEEK_BONUS.gems} ngọc khi nhận đủ 4 nhiệm vụ tuần`],
        ['trophy', 'Hành trình đỉnh cao', `+${jr?.gems || 0} ngọc ở mốc Nguyệt Quang`],
        ['lantern', 'Thưởng hết mùa', `+${nq.gems} ngọc (Nguyệt Quang) · +${SEASON_END[7].gems} (Thái Dương) · +${gal.gems} (Thiên Hà)`],
      ].map(([ic, n, d]) => `<div class="pn-row">${icon(ic)}<div><b>${n}</b><small>${d}</small></div></div>`).join('') + '<p class="pn-note">Game chơi với máy, không có nạp tiền — ngọc chỉ kiếm trong game.</p>';
    }
  };
  render();
  const done = () => { render(); onChange?.(); };
  body.onclick = (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
    const h = e.target.closest('[data-h]'); if (h) { hero = h.dataset.h; render(); return; }
    const b = e.target.closest('[data-buy]')?.dataset.buy;
    if (b) { const c = COSTUMES.find((x) => x.id === b);
      dialog({ title: 'Mua trang phục', html: `<p>${c.name} cho ${HEROES[hero].name} — ${c.price} ngọc?</p>`, buttons: [{ text: 'Huỷ' }, { text: 'Mua', cls: 'gold', on: () => { const r = buyCostume(hero, b); if (r.err) toast(r.err); else showRewards(r, { onDone: done }); done(); } }] });
      return; }
    const w = e.target.closest('[data-wear]')?.dataset.wear;
    if (w) { wearShopCostume(hero, p.skinOn?.[hero] === w ? null : w); done(); return; }
    const it = e.target.closest('[data-item]')?.dataset.item;
    if (it) { const r = buyGemItem(it); if (r.err) toast(r.err); else showRewards(r, { onDone: done }); done(); }
  };
  window.__shop = { render, tab: (k) => { tab = k; render(); }, hero: (h) => { hero = h; render(); } };
}
