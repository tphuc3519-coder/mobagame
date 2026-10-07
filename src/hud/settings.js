import { ICON } from './uiIcons.js';
// Cài đặt HUD (nút bánh răng góc phải trên): vị trí cửa hàng (dưới bản đồ nhỏ bên trái / bên phải, lưu trong máy) + Đầu hàng
// (07 §9; đấu hạng chỉ được đầu hàng từ phút 8). Chạm Đầu hàng hai lần trong 5 giây để xác nhận.
const KEY = 'la.hud';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { /* chế độ riêng tư */ } };

export function createHudSettings({ surrender = null, surrenderAfter = 0, now = () => 0 } = {}) {
  const st = { shop: 'left', ...load() };
  const apply = () => document.body.classList.toggle('shop-right', st.shop === 'right');
  apply();
  const btn = document.createElement('button'); btn.id = 'hudSet'; btn.type = 'button'; btn.setAttribute('aria-label', 'Cài đặt'); btn.innerHTML = ICON.gear();
  const panel = document.createElement('div'); panel.className = 'setp'; panel.hidden = true;
  let armed = 0;
  const render = () => {
    const wait = Math.max(0, Math.ceil(surrenderAfter - now()));
    panel.innerHTML = `<h4>Cài đặt giao diện</h4>
      <div class="row"><span>Cửa hàng</span><span class="seg">${[['left', 'Trái (dưới bản đồ)'], ['right', 'Phải']].map(([v, n]) => `<button data-shop="${v}" class="${st.shop === v ? 'on' : ''}">${n}</button>`).join('')}</span></div>
      ${surrender ? `<div class="row"><span>Trận đấu</span><span class="seg"><button data-sur="1" ${wait ? 'disabled' : ''} class="${armed ? 'on' : ''}">${wait ? `Đầu hàng (sau ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')})` : armed ? 'Chạm lần nữa để đầu hàng' : 'Đầu hàng'}</button></span></div>` : ''}`;
  };
  render();
  for (const el of [btn, panel]) for (const t of ['pointerdown', 'pointerup', 'pointermove']) el.addEventListener(t, (e) => e.stopPropagation());
  btn.onclick = () => { panel.hidden = !panel.hidden; armed = 0; if (!panel.hidden) render(); };
  panel.onclick = (e) => {
    if (e.target.closest('[data-sur]')) {
      if (armed && performance.now() - armed < 5000) { panel.hidden = true; surrender?.(); return; }
      armed = performance.now(); render(); setTimeout(() => { if (armed && performance.now() - armed >= 5000) { armed = 0; render(); } }, 5100); return;
    }
    const b = e.target.closest('[data-shop]'); if (!b) return; st.shop = b.dataset.shop; save(st); apply(); render();
  };
  document.body.append(btn, panel);
  return st;
}
