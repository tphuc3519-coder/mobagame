// Túi đồ (GĐ4d — 08 §3, §5, 07 §12): thẻ Vật phẩm (rương: mở / mua bằng vàng / đấu tiếp N trận; vật phẩm có nhãn "Có hạn" + thời gian còn lại,
// Thẻ Nhân Đôi Sao bấm Dùng cho trận hạng kế tiếp) và thẻ Cửa hàng mảnh (đổi Mảnh Tướng lấy vật phẩm). Quà nhận được hiện ở màn Nhận thưởng.
import { icon, panel, toast, fmt } from './kit.js';
import { profile, bagList, openChest, buyChest, shardBuy, armX2 } from './profile.js';
import { BAG, CHEST, SHARD_SHOP, CURRENCY } from '../data/rewards.js';
import { showRewards } from './rewards.js';
import { panelCss } from './panels.js';

const STYLE = `.bg-cur { display: flex; gap: 10px; } .bg-cur .cur { display: inline-flex; align-items: center; gap: 4px; font: 700 15px/1 var(--u-disp); color: #ffe8a8; } .bg-cur img.ui-ic { width: 22px; height: 22px; }
.pn-row .lim { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 8px; font: 700 10.5px/1.5 var(--u-body); font-style: normal; color: #1c1206; background: #ffc85a; vertical-align: 2px; }
.pn-row .lim.on { background: #7dffa8; } .pn-row .btns2 { display: flex; gap: 8px; flex: none; } .pn-row .btns2 .go { min-width: 84px; }
.pn-row .go img.ui-ic { width: 20px; height: 20px; margin: 0 4px 0 0; vertical-align: -4px; filter: none; }
.pn-row.chest { background: linear-gradient(90deg, rgba(110,70,20,.8), rgba(40,24,6,.6)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.55), 0 3px 8px rgba(0,0,0,.35); }`;
let styled = false;
const left = (exp, now) => { const ms = exp - now, h = Math.floor(ms / 3600000); return h >= 48 ? `${Math.floor(h / 24)} ngày` : h >= 1 ? `${h} giờ` : `${Math.max(1, Math.ceil(ms / 60000))} phút`; };
const cur = (k, n) => `<span class="cur" title="${CURRENCY[k].name}">${icon(CURRENCY[k].icon)}<b>${fmt(n)}</b></span>`;

export function openBag(onChange) {
  panelCss();
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.append(s); }
  const p = profile(); const { body, el } = panel({ title: 'Túi đồ' });
  let tab = 'items';
  const render = () => {
    const now = Date.now(), list = bagList(now), chests = p.chests || 0, nextIn = CHEST.every - (p.chestN || 0);
    el.querySelector('.ui-hr').innerHTML = `<span class="bg-cur">${cur('gold', p.gold)}${cur('manh', p.manh || 0)}${cur('gao', p.gao || 0)}</span>`;
    const tabs = `<div class="pn-tabs"><button type="button" data-t="items" class="${tab === 'items' ? 'on' : ''}">Vật phẩm</button><button type="button" data-t="shop" class="${tab === 'shop' ? 'on' : ''}">Cửa hàng mảnh</button></div>`;
    if (tab === 'items') {
      body.innerHTML = tabs + `<div class="pn-row chest">${icon('chest')}<div><b>Rương Đèn ×${chests}</b><small>Đấu tiếp ${nextIn} trận sẽ nhận được rương · vàng ${CHEST.gold[0]}–${CHEST.gold[1]}, Mảnh Tướng ${CHEST.manh[0]}–${CHEST.manh[1]}, ${Math.round(CHEST.itemOdds * 100)}% ra ${BAG[CHEST.item].name}</small></div>
        <span class="btns2"><button type="button" class="btn-gold go" data-a="open" ${chests ? '' : 'disabled'}>Mở</button><button type="button" class="btn-blue go" data-a="buy" ${p.gold >= CHEST.price ? '' : 'disabled'}>${icon('coin')}${CHEST.price}</button></span></div>`
        + (list.length ? list.map((x) => { const d = BAG[x.id];
          const act = d.use ? (x.id === 'the_x2_sao' && p.x2Armed ? '<button type="button" class="btn-blue go" disabled>Đã bật</button>' : `<button type="button" class="btn-gold go" data-use="${x.id}">Dùng</button>`) : '';
          return `<div class="pn-row">${icon(d.icon)}<div><b>${d.name} ×${x.n}${x.exp ? `<em class="lim">Có hạn · còn ${left(x.exp, now)}</em>` : ''}</b><small>${d.desc}</small></div>${act}</div>`; }).join('')
          : '<p class="pn-note">Chưa có vật phẩm nào. Mở rương hoặc đổi ở Cửa hàng mảnh.</p>')
        + (p.x2Armed ? '<p class="pn-note">Thẻ Nhân Đôi Sao đang bật: trận đấu hạng kế tiếp thắng được +2 sao.</p>' : '');
    } else {
      body.innerHTML = tabs + SHARD_SHOP.map((it) => { const d = BAG[it.id], can = (p.manh || 0) >= it.cost;
        return `<div class="pn-row">${icon(d.icon)}<div><b>${d.name}${d.ttl || d.season ? '<em class="lim">Có hạn</em>' : ''}</b><small>${d.desc}</small></div><button type="button" class="btn-gold go" data-buy="${it.id}" ${can ? '' : 'disabled'}>${icon('helmet')}${it.cost}</button></div>`; }).join('')
        + `<p class="pn-note">Mảnh Tướng nhận từ rương. Đang có ${fmt(p.manh || 0)} mảnh.</p>`;
    }
  };
  render();
  body.onclick = (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'open') { const got = openChest(); if (got) showRewards(got, { onDone: () => { render(); onChange?.(); } }); render(); onChange?.(); return; }
    if (a === 'buy') { if (buyChest()) toast(`Đã mua 1 rương (−${CHEST.price} vàng)`); render(); onChange?.(); return; }
    const u = e.target.closest('[data-use]')?.dataset.use;
    if (u === 'the_x2_sao') { if (armX2()) toast('Thẻ Nhân Đôi Sao: trận đấu hạng kế tiếp thắng được +2 sao'); render(); return; }
    const b = e.target.closest('[data-buy]')?.dataset.buy;
    if (b) { if (shardBuy(b)) showRewards([{ k: 'item', id: b, n: 1 }], { onDone: render }); render(); onChange?.(); }
  };
  window.__bag = { render };
}
