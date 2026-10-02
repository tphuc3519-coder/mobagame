// Ô mô tả nổi (giữ nút để xem): tiêu đề, dòng phụ (hồi chiêu…), nội dung. Một ô dùng chung cho cả HUD.
let el = null;
export function showTip(info, anchor) {
  if (!info) return;
  if (!el) { el = document.createElement('div'); el.className = 'hudtip'; document.body.appendChild(el); }
  el.innerHTML = `<b>${info.title}</b>${info.sub ? `<small>${info.sub}</small>` : ''}<p>${info.body || ''}</p>`;
  el.hidden = false;
  const w = Math.min(280, innerWidth * 0.5), x = Math.max(8, Math.min(innerWidth - w - 8, anchor.left + anchor.width / 2 - w / 2));
  el.style.width = w + 'px'; el.style.left = x + 'px';
  el.style.top = 'auto'; el.style.bottom = (innerHeight - anchor.top + 10) + 'px';
}
export function hideTip() { if (el) el.hidden = true; }
