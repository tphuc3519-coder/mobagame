// Điểm vào: màn chọn tướng luyện tập (07 §7.1) → trận 1v1 với bot. ?hero=<id> vào thẳng trận (kiểm thử).
import { ALPHA } from './data/heroes/index.js';
import { startMatch } from './game.js';
import { openSelect } from './ui/select.js';

const q = new URLSearchParams(location.search);
// Nhiều ngón cùng lúc (cần, nút đánh, kỹ năng, phép, kéo camera — 5 ngón trở lên): chặn cử chỉ của trình duyệt khi có từ 2 ngón
// (iOS Safari phóng to/cuộn trang, nhất là khi game nằm trong khung của trang khác) — nếu không, trình duyệt huỷ các chạm đang giữ
// (pointercancel): cần nhả, nút kỹ năng mất lượt. Một ngón thì để nguyên (cuộn danh sách đồ trong cửa hàng).
const multi = (e) => { if (e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault(); };
document.addEventListener('touchstart', multi, { passive: false });
document.addEventListener('touchmove', multi, { passive: false });
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
document.getElementById('fs').onclick = async () => {
  try { await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch (_) { /* tuỳ thiết bị */ }
};
const bot = !q.has('nobot') && !q.has('dummies');
if (q.has('hero')) {
  const heroId = ALPHA.includes(q.get('hero')) ? q.get('hero') : 'hoa_ren';
  const enemyId = ALPHA.includes(q.get('enemy')) ? q.get('enemy') : ALPHA[(ALPHA.indexOf(heroId) + 3) % ALPHA.length];
  startMatch({ heroId, enemyId, bot, difficulty: q.get('diff') || 'normal', mode: q.get('mode') || '1v1' });
} else {
  openSelect({ onStart: (cfg) => startMatch({ ...cfg, onExit: () => location.reload() }) });
}
