import { ICON } from './uiIcons.js';
import { openSettings } from '../ui/settingsModal.js';
import { prefs, onPref } from '../core/prefs.js';
import { track } from '../core/scope.js';
// Nút bánh răng góc phải trên (trong trận): mở bảng Cài đặt kiểu Liên Quân (ui/settingsModal.js). Đồ hoạ áp dụng ngay qua onGfx (trừ chi
// tiết cảnh), điều khiển / giao diện / âm thanh qua core/prefs.js; chân bảng có nút Đầu hàng (07 §9: đấu hạng chỉ từ phút 8; chạm hai
// lần trong 5 giây để xác nhận). Vị trí cửa hàng (Thiết lập giao diện) đổi lớp body.shop-right.
export function createHudSettings({ surrender = null, surrenderAfter = 0, now = () => 0, gfx = null, onGfx = null } = {}) {
  const apply = () => document.body.classList.toggle('shop-right', prefs().shop === 'right');
  apply(); onPref((k) => { if (k === 'shop') apply(); });
  const btn = document.createElement('button'); btn.id = 'hudSet'; btn.type = 'button'; btn.setAttribute('aria-label', 'Cài đặt'); btn.innerHTML = ICON.gear();
  for (const t of ['pointerdown', 'pointerup', 'pointermove']) btn.addEventListener(t, (e) => e.stopPropagation());
  btn.onclick = () => openSettings({ inMatch: true, gfx, onGfx, surrender, surrenderAfter, now });
  document.body.append(track(btn));
  return prefs();
}
