import { ICON } from './uiIcons.js';
// Cài đặt HUD (nút bánh răng góc phải trên): vị trí cửa hàng (dưới bản đồ nhỏ bên trái / bên phải). Lưu trong máy (localStorage).
const KEY = 'la.hud';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { /* chế độ riêng tư */ } };

export function createHudSettings() {
  const st = { shop: 'left', ...load() };
  const apply = () => document.body.classList.toggle('shop-right', st.shop === 'right');
  apply();
  const btn = document.createElement('button'); btn.id = 'hudSet'; btn.type = 'button'; btn.setAttribute('aria-label', 'Cài đặt'); btn.innerHTML = ICON.gear();
  const panel = document.createElement('div'); panel.className = 'setp'; panel.hidden = true;
  const render = () => {
    panel.innerHTML = `<h4>Cài đặt giao diện</h4>
      <div class="row"><span>Cửa hàng</span><span class="seg">${[['left', 'Trái (dưới bản đồ)'], ['right', 'Phải']].map(([v, n]) => `<button data-shop="${v}" class="${st.shop === v ? 'on' : ''}">${n}</button>`).join('')}</span></div>`;
  };
  render();
  for (const el of [btn, panel]) for (const t of ['pointerdown', 'pointerup', 'pointermove']) el.addEventListener(t, (e) => e.stopPropagation());
  btn.onclick = () => { panel.hidden = !panel.hidden; };
  panel.onclick = (e) => { const b = e.target.closest('[data-shop]'); if (!b) return; st.shop = b.dataset.shop; save(st); apply(); render(); };
  document.body.append(btn, panel);
  return st;
}
