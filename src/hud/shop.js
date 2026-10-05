// Cửa hàng trượt vào từ trái (hoặc phải) — 6 ô trang bị chỉ hiện trong bảng cửa hàng — + ô "Mua nhanh" dưới bản đồ nhỏ (05 §1, 07). Mua được mọi lúc, kể cả khi đang chờ hồi sinh.
import { ITEMS, SHOP_TABS, SELL_RATE, cleanBuild } from '../data/items.js';
import { planBuy, quickBuys } from '../sim/inventory.js';
import { itemIcon, coinIcon, statLines } from './icons.js';

const CART = '<svg class="cart" viewBox="0 0 32 32"><defs><linearGradient id="cartg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset="1" stop-color="#e0a83a"/></linearGradient></defs><path d="M3 6h4l3 14h15l3-10H9" fill="none" stroke="url(#cartg)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="12" cy="25" r="2.4" fill="#ffe08a"/><circle cx="23" cy="25" r="2.4" fill="#ffe08a"/><path d="M13 13h11" stroke="#ffe08a" stroke-width="2"/></svg>';
const stop = (el) => { for (const t of ['pointerdown', 'pointerup', 'pointermove']) el.addEventListener(t, (e) => e.stopPropagation()); };
const REASON = { gold: 'Chưa đủ vàng', full: 'Túi đã đầy', limit: 'Chỉ mang 1 món cùng loại (giày/rừng/hỗ trợ)', mode: 'Chỉ dùng ở chế độ nhiều người', spell: 'Cần phép Thu Hoạch', auto: 'Nâng cấp tự động' };

export function createShop(root, { world, player }) {
  root.innerHTML = `
    <div class="dock" id="dock">
      <button class="goldPill" id="goldPill" aria-label="Cửa hàng"></button>
      <div class="qb" id="qb"></div>
    </div>
    <section class="shop" id="shop" aria-hidden="true">
      <header><b>Cửa hàng</b><span class="inv"><small>Trang bị</small><span class="bar" id="itemBar"></span></span><span class="sg" id="shopGold"></span><button class="x" id="shopX" aria-label="Đóng">×</button></header>
      <div class="sbody">
        <nav id="tabs"></nav>
        <div class="grid" id="grid"></div>
        <aside id="detail"></aside>
      </div>
    </section>`;
  const $ = (id) => root.querySelector('#' + id);
  const shop = $('shop'), grid = $('grid'), detail = $('detail'), tabsEl = $('tabs');
  stop(shop); stop($('dock'));
  let open = false, tab = 'rec', sel = null, selSlot = null, sig = '';

  const cmd = (c) => world.command(player.id, c);
  const setOpen = (v) => { open = v; shop.classList.toggle('on', v); shop.setAttribute('aria-hidden', String(!v)); sig = ''; };
  $('shopX').onclick = () => setOpen(false);
  $('goldPill').onclick = () => setOpen(!open);
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'b') setOpen(!open); });

  tabsEl.innerHTML = SHOP_TABS.map((t) => `<button data-t="${t.id}">${t.name}</button>`).join('');
  tabsEl.onclick = (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; sel = null; sig = ''; } };

  const listFor = () => {
    if (tab === 'rec') return cleanBuild(player.data.recommendedBuild);
    return Object.values(ITEMS).filter((i) => i.tab === tab && !i.auto && (!i.teamOnly || player.teamMode) && (tab !== 'boots' || true)).sort((a, b) => a.tier - b.tier || a.cost - b.cost).map((i) => i.id);
  };
  const owns = (id) => player.items.includes(id);
  const priceOf = (id) => { const p = planBuy(player, id); return p.cost ?? ITEMS[id].cost; };

  function renderGrid() {
    grid.innerHTML = listFor().map((id) => {
      const p = planBuy(player, id), can = p.ok && player.gold >= p.cost;
      return `<button class="cell ${sel === id ? 'sel' : ''} ${can ? '' : 'dim'} ${owns(id) ? 'own' : ''}" data-i="${id}">${itemIcon(id)}<span class="pr">${Math.ceil(p.cost ?? ITEMS[id].cost)}</span></button>`;
    }).join('') || '<p class="hint">Không có món nào.</p>';
  }
  grid.onclick = (e) => { const b = e.target.closest('.cell'); if (b) { sel = b.dataset.i; selSlot = player.items.indexOf(sel); sig = ''; } };

  function recipeTree(id) {
    const from = ITEMS[id].from; if (!from) return '';
    const have = [...player.items];
    return `<div class="recipe">${from.map((c) => { const i = have.indexOf(c); if (i >= 0) have[i] = null; return `<button class="cell mini ${i >= 0 ? 'got' : 'dim'}" data-i="${c}">${itemIcon(c)}<span class="pr">${ITEMS[c].cost}</span></button>`; }).join('<b>+</b>')}</div>`;
  }
  function renderDetail() {
    if (!sel) { detail.innerHTML = '<p class="hint">Chạm một món để xem chi tiết.<br>Giá ghép tự trừ thành phần bạn đang có.</p>'; return; }
    const it = ITEMS[sel], p = planBuy(player, sel), cost = Math.ceil(p.cost ?? it.cost), can = p.ok && player.gold >= cost;
    const why = !p.ok ? REASON[p.reason] : player.gold < cost ? REASON.gold : '';
    detail.innerHTML = `<div class="dh">${itemIcon(sel)}<div><b>${it.name}</b><small>Tổng ${it.cost}</small></div></div>
      <ul>${statLines(it).map((s) => `<li>${s}</li>`).join('')}</ul>
      ${it.note ? `<p class="note">${it.note}</p>` : ''}${it.active ? `<p class="note act">Kích hoạt: ${it.active.name}</p>` : ''}
      ${recipeTree(sel)}
      <div class="buyrow"><button class="buy ${can ? '' : 'off'}" id="doBuy">${coinIcon()} ${cost} · Mua</button>
      ${owns(sel) ? `<button class="sell" id="doSell">Bán +${Math.floor(it.cost * SELL_RATE)}</button>` : ''}</div>
      ${why ? `<p class="why">${why}</p>` : ''}`;
    const b = detail.querySelector('#doBuy'); if (b) b.onclick = () => { if (can) cmd({ type: 'buy', item: sel }); sig = ''; };
    const s = detail.querySelector('#doSell'); if (s) s.onclick = () => { cmd({ type: 'sell', slot: player.items.indexOf(sel) }); sig = ''; };
    detail.querySelectorAll('.recipe .cell').forEach((c) => { c.onclick = () => { sel = c.dataset.i; sig = ''; }; });
  }

  // thanh đồ: 6 ô (3×2); chạm ô có đồ mở cửa hàng với món đó
  const bar = $('itemBar');
  function renderBar() {
    bar.innerHTML = player.items.map((id, i) => `<button class="slot ${id ? '' : 'blank'}" data-s="${i}">${id ? itemIcon(id) : ''}</button>`).join('');
  }
  bar.onclick = (e) => { const b = e.target.closest('.slot'); if (!b) return; const id = player.items[+b.dataset.s]; if (id) { sel = id; tab = ITEMS[id].tab; } setOpen(true); sig = ''; };

  // Mua nhanh: món kế tiếp theo build gợi ý
  const qb = $('qb');
  function renderQb() {
    qb.innerHTML = quickBuys(player, 1).map((q) => { const it = ITEMS[q.goal], line = (it.note || statLines(it).join(', ')).replace(/^Duy nhất:\s*/, '').split(/[.;]/)[0];
      return `<button class="q ${q.ok ? 'ready' : ''}" data-i="${q.id}">${itemIcon(q.id)}<span class="pr">${Math.ceil(q.cost)}</span><span class="qn"><b>${ITEMS[q.id].name}</b><small>${q.id !== q.goal ? '→ ' + it.name : line}</small></span></button>`; }).join('');
  }
  qb.onclick = (e) => { const b = e.target.closest('.q'); if (!b) return; cmd({ type: 'buy', item: b.dataset.i }); sig = ''; };

  return {
    open: setOpen,
    isOpen: () => open,
    /** Gọi mỗi khung hình; chỉ dựng lại DOM khi trạng thái đổi. */
    update() {
      const g = Math.floor(player.gold);
      // dựng lại DOM chỉ khi thứ nhìn thấy đổi (không phải mỗi lần vàng nhích), để chạm không bị mất giữa chừng
      const afford = (id) => { const p = planBuy(player, id); return p.ok && player.gold >= Math.ceil(p.cost) ? 1 : 0; };
      const bits = (open ? listFor().map(afford).join('') + (sel ? afford(sel) : '') : '') + quickBuys(player, 1).map((q) => q.id + (q.ok ? 1 : 0)).join();
      const s = [player.items.join(), open, tab, sel, bits].join('|');
      if (g !== this.lastGold) { this.lastGold = g; $('goldPill').innerHTML = `${CART}<b>${g}</b>`; $('shopGold').innerHTML = `${coinIcon()} ${g}`; }
      if (s === sig) return;
      sig = s;
      renderBar(); renderQb();
      if (open) {
        tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
        renderGrid(); renderDetail();
      }
    },
  };
}
