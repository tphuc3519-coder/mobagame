// Bộ phần tử giao diện sảnh dùng chung: biểu tượng SVG (một phong cách: nét/khối trắng-vàng, viền tối mảnh), ảnh tướng dựng sẵn,
// huy hiệu hạng, thông báo nhanh (toast), bảng phủ toàn màn (panel) kiểu Liên Quân: thanh tiêu đề có nút quay lại.
import { HEROES } from '../data/heroes/index.js';
import { ICON as HUD_ICON } from '../hud/uiIcons.js';

let gid = 0;
const GOLD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#f0c868"/><stop offset="1" stop-color="#b8862e"/></linearGradient>`;
const svg = (body, vb = 24) => { const id = 'kg' + gid++; return `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true"><defs>${GOLD(id)}</defs>${body.replaceAll('$G', `url(#${id})`)}</svg>`; };

export const ICON = {
  // đồng tiền cổ lỗ vuông (vàng) và viên ngọc (lam)
  coin: () => svg('<circle cx="12" cy="12" r="9.5" fill="$G" stroke="#6a4512" stroke-width="1"/><circle cx="12" cy="12" r="7" fill="none" stroke="#9a6a1e" stroke-width="1"/><rect x="9.4" y="9.4" width="5.2" height="5.2" fill="#5a3a10" stroke="#fff3c4" stroke-width=".6"/>'),
  gem: () => svg('<path d="M12 2.5l8 6.2-8 12.8-8-12.8z" fill="#5fb6ff" stroke="#123a6a" stroke-width="1"/><path d="M4 8.7h16M12 2.5l-3.2 6.2L12 21.5l3.2-12.8z" fill="none" stroke="#d8efff" stroke-width=".8" opacity=".85"/>'),
  plus: () => svg('<path d="M12 5v14M5 12h14" stroke="$G" stroke-width="3" stroke-linecap="round"/>'),
  mail: () => svg('<rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="$G" stroke-width="2"/><path d="M3.8 6.6l8.2 6.4 8.2-6.4" fill="none" stroke="$G" stroke-width="2" stroke-linejoin="round"/>'),
  gear: () => HUD_ICON.gear(),
  friends: () => svg('<circle cx="9" cy="8.5" r="3.4" fill="$G"/><path d="M2.8 19.5c.6-3.6 3.1-5.6 6.2-5.6s5.6 2 6.2 5.6z" fill="$G"/><circle cx="16.5" cy="9" r="2.7" fill="$G" opacity=".75"/><path d="M15.4 14.1c2.9-.3 5.2 1.4 5.8 4.6h-4.4" fill="$G" opacity=".75"/>'),
  chat: () => svg('<path d="M4 5h16a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 17h-9l-5 3.5V17H4a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 014 5z" fill="none" stroke="$G" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h10M7 13h6" stroke="$G" stroke-width="1.8" stroke-linecap="round"/>'),
  bag: () => svg('<path d="M8 7V5.5a4 4 0 018 0V7" fill="none" stroke="$G" stroke-width="2"/><rect x="3.5" y="7" width="17" height="13.5" rx="3" fill="$G" stroke="#3a2608" stroke-width=".8"/><rect x="8" y="12" width="8" height="4" rx="1" fill="#3a2608" opacity=".55"/>'),
  helmet: () => svg('<path d="M12 2.8c-4.8 0-8 3.6-8 8.6v7.6h4.2l1-4.8h5.6l1 4.8H20v-7.6c0-5-3.2-8.6-8-8.6z" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M8.2 11.2h7.6v2H8.2z" fill="#20160a"/><path d="M12 2.8v5.4" stroke="#fff3c4" stroke-width="1.2"/>'),
  sword: () => svg('<path d="M18.8 3.2l2 2-10.6 10.6-2-2z" fill="$G" stroke="#3a2608" stroke-width=".7"/><path d="M5.6 13.2l5.2 5.2-1.4 1.4-1.8-1.8-2.6 2.6-1.4-1.4 2.6-2.6-1.8-1.8z" fill="$G" stroke="#3a2608" stroke-width=".7"/>'),
  book: () => svg('<path d="M4 4.5h6.5A2.5 2.5 0 0113 7v13a2 2 0 00-2-2H4z" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M20 4.5h-6.5A2.5 2.5 0 0011 7v13a2 2 0 012-2h7z" fill="$G" stroke="#3a2608" stroke-width=".8" opacity=".85"/><path d="M15.2 8.5l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.1 1.2.4-2.4" fill="#fff6d6" opacity=".9"/>'),
  cart: () => svg('<path d="M2.5 4h3l2.4 10.5h10.6L21 7H7" fill="none" stroke="$G" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="9.5" cy="19" r="1.7" fill="$G"/><circle cx="17" cy="19" r="1.7" fill="$G"/>'),
  gift: () => svg('<rect x="3.5" y="9" width="17" height="11.5" rx="1.5" fill="$G" stroke="#3a2608" stroke-width=".8"/><rect x="2.5" y="6.5" width="19" height="4" rx="1" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M12 6.5v14" stroke="#c8402f" stroke-width="2.4"/><path d="M12 6.5C10 2.5 6 3.5 7.2 6.5M12 6.5c2-4 6-3 4.8 0" fill="none" stroke="#c8402f" stroke-width="1.6"/>'),
  star: () => svg('<path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z" fill="$G" stroke="#3a2608" stroke-width=".7"/>'),
  trophy: () => svg('<path d="M7 3.5h10v5a5 5 0 01-10 0z" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M7 5H3.8c0 3.4 1.6 5 3.8 5.4M17 5h3.2c0 3.4-1.6 5-3.8 5.4" fill="none" stroke="$G" stroke-width="1.6"/><path d="M10.5 13.2h3l.6 3.8h-4.2zM7.5 17h9v3.5h-9z" fill="$G" stroke="#3a2608" stroke-width=".7"/>'),
  back: () => svg('<path d="M14.5 4.5L6.5 12l8 7.5" fill="none" stroke="$G" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4.5L12 12l8 7.5" fill="none" stroke="$G" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>'),
  home: () => svg('<path d="M3 11.5L12 4l9 7.5" fill="none" stroke="$G" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9.5h5v-5.5h3v5.5h5V10" fill="$G" stroke="#3a2608" stroke-width=".7"/>'),
  lock: () => svg('<rect x="5" y="10.5" width="14" height="10" rx="2" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="$G" stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.6" fill="#3a2608"/>'),
  close: () => svg('<path d="M6 6l12 12M18 6L6 18" stroke="$G" stroke-width="3" stroke-linecap="round"/>'),
  swords: () => svg('<path d="M4 3.5l9.8 9.8-1.6 1.6L2.4 5.1 2.6 3.6z M20 3.5l-9.8 9.8 1.6 1.6 9.8-9.8-.2-1.5z" fill="$G" stroke="#3a2608" stroke-width=".6"/><path d="M5.4 15.6l3 3-1.3 1.3-1-1-1.7 1.7-1.3-1.3 1.7-1.7-1-1zM18.6 15.6l-3 3 1.3 1.3 1-1 1.7 1.7 1.3-1.3-1.7-1.7 1-1z" fill="$G"/>'),
  map: () => svg('<path d="M3 6.5l5.5-2.5 7 2.5 5.5-2.5v13.5L15.5 20l-7-2.5L3 20z" fill="$G" stroke="#3a2608" stroke-width=".8" stroke-linejoin="round"/><path d="M8.5 4v13.5M15.5 6.5V20" stroke="#3a2608" stroke-width="1" opacity=".6"/><circle cx="12" cy="11" r="1.6" fill="#c8402f"/>'),
  mic: () => svg('<rect x="9" y="3.5" width="6" height="11" rx="3" fill="$G"/><path d="M6 11a6 6 0 0012 0M12 17v3.5" fill="none" stroke="$G" stroke-width="2" stroke-linecap="round"/><path d="M4 4l16 16" stroke="#e8505a" stroke-width="2.2" stroke-linecap="round"/>'),
  sound: () => svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="$G"/><path d="M15 9a4 4 0 010 6M17.6 6.6a7.5 7.5 0 010 10.8" fill="none" stroke="$G" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 4l17 16" stroke="#e8505a" stroke-width="2.2" stroke-linecap="round"/>'),
  flag: () => svg('<path d="M5.5 21V3.5" stroke="$G" stroke-width="2" stroke-linecap="round"/><path d="M6 4.5h12.5l-2.6 4 2.6 4H6z" fill="$G" stroke="#3a2608" stroke-width=".7"/>'),
  clock: () => HUD_ICON.clock(),
  check: () => svg('<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#7dffa8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  edit: () => svg('<path d="M4 20l1-4.4L15.6 5a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.4 19z" fill="$G" stroke="#3a2608" stroke-width=".8"/><path d="M13.6 7l3.4 3.4" stroke="#3a2608" stroke-width="1"/>'),
  lantern: () => svg('<path d="M12 2v2.5" stroke="$G" stroke-width="1.6"/><rect x="8.5" y="4" width="7" height="2" rx=".8" fill="$G"/><path d="M7 7.5c0-1 2.2-1.5 5-1.5s5 .5 5 1.5c1 2.2 1 6.8 0 9 0 1-2.2 1.5-5 1.5s-5-.5-5-1.5c-1-2.2-1-6.8 0-9z" fill="#ff7a3a" stroke="#ffd27a" stroke-width="1"/><path d="M9 9.5c.4 2 .4 4.5 0 6.5M15 9.5c-.4 2-.4 4.5 0 6.5M12 6v12" stroke="#ffd27a" stroke-width=".8" opacity=".8"/><path d="M12 18.5V22" stroke="#e8505a" stroke-width="1.6"/>'),
  people: () => svg('<circle cx="12" cy="7" r="3.2" fill="$G"/><path d="M6 20c.4-4 2.8-6.4 6-6.4s5.6 2.4 6 6.4z" fill="$G"/><circle cx="4.8" cy="10" r="2.2" fill="$G" opacity=".7"/><circle cx="19.2" cy="10" r="2.2" fill="$G" opacity=".7"/>'),
};

/** Ảnh chân dung (đầu) dựng sẵn từ model: assets/ui/heroes/<id>_face.webp; lỗi ảnh thì hiện chữ cái đầu (xem fallback bên dưới). */
export const faceSrc = (id) => `./assets/ui/heroes/${id}_face.webp`;
export const cardSrc = (id) => `./assets/ui/heroes/${id}_card.jpg`;
export const initials = (id) => (HEROES[id]?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2);
export const face = (id, cls = 'face') => `<img class="${cls}" src="${faceSrc(id)}" alt="" data-ini="${initials(id)}" draggable="false">`;
// ảnh không tải được (thiếu file / mạng lỗi): thay bằng ô chữ cái đầu — bắt ở pha capture vì sự kiện error của <img> không nổi bọt
addEventListener('error', (e) => {
  const im = e.target; if (!(im instanceof HTMLImageElement) || !im.dataset.ini || im.dataset.failed) return;
  im.dataset.failed = '1'; const s = document.createElement('i'); s.className = im.className + ' ini'; s.textContent = im.dataset.ini; im.replaceWith(s);
}, true);

/** Số vàng gọn: 1.500 · 12,3k · 979k (kiểu Liên Quân). */
export function fmt(n) {
  n = Math.floor(n || 0);
  if (n < 10000) return n.toLocaleString('vi-VN');
  if (n < 1e6) return (n >= 100000 ? Math.floor(n / 1000) : (Math.floor(n / 100) / 10).toString().replace('.', ',')) + 'k';
  return (Math.floor(n / 1e5) / 10).toString().replace('.', ',') + 'M';
}

/** Huy hiệu hạng: khiên có cánh màu bậc, viên đá giữa, số La Mã của hạng (rank = rankOf(...)). */
export function rankBadge(rank, size = 44) {
  const id = 'rb' + gid++, c = rank.col;
  const div = rank.name.split(' ').slice(-1)[0], roman = /^[IVX]+$/.test(div) ? div : '';
  return `<svg class="rkb" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="#3a2a14"/></linearGradient></defs>
    <path d="M32 6l-6 4H14l-9-5 4 11-5 6 9 2c1 9 6 16 14 21l5 3 5-3c8-5 13-12 14-21l9-2-5-6 4-11-9 5H38z" fill="url(#${id})" stroke="#2a1a08" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M32 14l10 6v10c0 8-4 13-10 17-6-4-10-9-10-17V20z" fill="#1a1630" stroke="${c}" stroke-width="2"/>
    <path d="M32 21l5 6-5 8-5-8z" fill="${c}" stroke="#fff" stroke-width=".8"/>${roman ? `<text x="32" y="44" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Be Vietnam Pro, system-ui">${roman}</text>` : ''}</svg>`;
}
export const stars = (rank) => (rank.max ? Array.from({ length: rank.max }, (_, i) => `<b class="${i < rank.star ? 'on' : ''}">✦</b>`).join('') : `<b class="on">✦</b><em>${rank.star}</em>`);

// —— Thông báo nhanh ——
let toastEl = null, toastT = 0;
export function toast(text, ms = 2200) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ui-toast'; document.body.append(toastEl); }
  toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}

/** Bảng phủ màn hình: thanh tiêu đề (nút quay lại + tiêu đề + phần phải), thân cuộn được. Trả về { el, body, close }. */
export function panel({ title, right = '', cls = '', onClose = null } = {}) {
  const el = document.createElement('div'); el.className = 'ui-panel ' + cls;
  el.innerHTML = `<header><button class="ui-back" type="button" aria-label="Quay lại">${ICON.back()}</button><h2>${title}</h2><div class="ui-hr">${right}</div></header><div class="ui-body"></div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); onClose?.(); };
  el.querySelector('.ui-back').onclick = close;
  document.getElementById('ui').append(el);
  requestAnimationFrame(() => el.classList.add('on'));
  return { el, body: el.querySelector('.ui-body'), close };
}

/** Hộp thoại nhỏ giữa màn: { title, html, buttons: [{ text, cls, on }] }. */
export function dialog({ title = '', html = '', buttons = [{ text: 'Đóng' }] } = {}) {
  const wrap = document.createElement('div'); wrap.className = 'ui-dlg';
  wrap.innerHTML = `<div class="box">${title ? `<h3>${title}</h3>` : ''}<div class="txt">${html}</div><div class="btns">${buttons.map((b, i) => `<button type="button" data-i="${i}" class="${b.cls || ''}">${b.text}</button>`).join('')}</div></div>`;
  const close = () => wrap.remove();
  wrap.onclick = (e) => { const b = e.target.closest('button[data-i]'); if (b) { const r = buttons[+b.dataset.i].on?.(wrap); if (r !== false) close(); } else if (e.target === wrap) close(); };
  document.getElementById('ui').append(wrap);
  return { el: wrap, close };
}
