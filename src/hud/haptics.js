// Rung phản hồi khi thao tác (Cài đặt → Điều khiển → "Rung khi thao tác", core/prefs.js haptics): tung chiêu rung rất nhẹ, huỷ chiêu rung
// hai nhịp, chiêu không dùng được (chữ báo trên đầu tướng — hud.js) rung một nhịp dài hơn. navigator.vibrate: điện thoại Android có;
// iPhone (Safari) và máy tính không có — lặng lẽ bỏ qua.
import { pref } from '../core/prefs.js';

const PAT = { cast: 8, cancel: [6, 40, 6], fail: 18 };
export function buzz(kind) {
  if (!pref('haptics')) return;
  try { navigator.vibrate?.(PAT[kind] ?? 8); } catch (_) { /* trình duyệt chặn khi chưa có thao tác chạm: bỏ qua */ }
}
