// Điểm vào: màn tải game (ảnh tranh mở màn + thanh tiến độ) → sảnh chính và các màn trước/sau trận (src/ui/flow.js).
// ?hero=<id> vào thẳng trận 1v1/5v5 với bot (kiểm thử: ?enemy=, ?mode=5v5, ?diff=, ?nobot, ?dummies, ?debug…).
import { ALPHA } from './data/heroes/index.js';
import { startMatch } from './game.js';
import { loadHero, heroProgress } from './render/assets.js';
import { injectCss } from './ui/css.js';
import { bootStart, bootRun, bootDone, loadImg } from './ui/boot.js';
import { faceSrc, cardSrc, ICONS, iconSrc } from './ui/kit.js';
import { profile, rankOf } from './ui/profile.js';
import { FRIENDS } from './ui/people.js';
import { enter, takeNext } from './ui/flow.js';

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
injectCss();

if (q.has('hero')) {
  bootDone();
  const bot = !q.has('nobot') && !q.has('dummies');
  const heroId = ALPHA.includes(q.get('hero')) ? q.get('hero') : 'hoa_ren';
  const enemyId = ALPHA.includes(q.get('enemy')) ? q.get('enemy') : ALPHA[(ALPHA.indexOf(heroId) + 3) % ALPHA.length];
  startMatch({ heroId, enemyId, bot, dummies: q.has('dummies'), difficulty: q.get('diff') || 'normal', mode: q.get('mode') || '1v1' });
} else {
  const next = takeNext(), p = profile();
  bootStart(next ? 'Đang trở về sảnh…' : undefined);
  await bootRun([
    { w: 1, run: () => Promise.all([...['500', '600', '700', '800'].map((w) => `${w} 16px "Be Vietnam Pro"`), '700 16px "Barlow Condensed"', 'italic 800 16px "Barlow Condensed"'].map((f) => document.fonts?.load?.(f, 'ĐẤU HẠNG'))) },
    { w: 2, run: () => Promise.all([...new Set([...ALPHA, ...FRIENDS.map((f) => f.avatar)])].map((id) => loadImg(faceSrc(id)))) },
    { w: 2, run: () => Promise.all(ALPHA.map((id) => loadImg(cardSrc(id)))) },
    { w: 2, run: () => Promise.all(['./assets/ui/lobby.jpg', './assets/ui/lobby_soft.jpg', './assets/ui/room.jpg', './assets/ui/keyart.jpg'].map(loadImg)) },
    { w: 1, run: () => Promise.all([...ICONS, 'rank_' + rankOf(p.stars).id].map((n) => loadImg(iconSrc(n)))) },
    { w: 6, run: () => loadHero(p.feature, { showcase: true }), part: () => Math.max(heroProgress(p.feature, { showcase: true }), heroProgress(p.feature)) },
  ]);
  enter(next);
  bootDone();
  // model trong trận của các tướng: tải dần lúc người chơi còn ở sảnh để màn tải trận nhanh
  setTimeout(() => ALPHA.reduce((pr, id) => pr.then(() => loadHero(id)), Promise.resolve()), 2500);
}
