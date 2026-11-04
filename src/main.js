// Điểm vào: màn tải game (ảnh tranh mở màn + thanh tiến độ) → sảnh chính và các màn trước/sau trận (src/ui/flow.js).
// ?hero=<id> vào thẳng trận 1v1/5v5 với bot (kiểm thử: ?enemy=, ?mode=5v5, ?diff=, ?nobot, ?dummies, ?debug…).
import { initViewport } from './ui/viewport.js';
import { ALPHA, HEROES } from './data/heroes/index.js';
import { startMatch } from './game.js';
import { loadHero, heroProgress } from './render/assets.js';
import { injectCss } from './ui/css.js';
import { injectDraftCss } from './ui/cssDraft.js';
import { bootStart, bootRun, bootDone, loadImg } from './ui/boot.js';
import { faceSrc, cardSrc, ICONS, iconSrc, toast } from './ui/kit.js';
import { profile, rankOf } from './ui/profile.js';
import { FRIENDS } from './ui/people.js';
import { enter, takeNext, canPromptUpdate, nav } from './ui/flow.js';
import { checkCrash } from './ui/crashGuard.js';
import { initPwa, warmHeroes } from './ui/pwa.js';
import { LITE, preloadHeroes } from './render/assets.js';
import { loadAudio } from './audio/audio.js';
import { hookUiSounds } from './audio/uiSounds.js';
import { prefs } from './core/prefs.js';
import { PRELOAD as FONT_PRELOAD } from './ui/fonts.js';

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
initViewport(); // tỉ lệ giao diện theo cỡ màn (+ biến --vh / --vw đúng phần nhìn thấy) — trước khi dựng giao diện
injectCss(); injectDraftCss();
initPwa({ canPrompt: canPromptUpdate }); // cài như ứng dụng + chơi không mạng (src/ui/pwa.js, sw.js)
loadAudio(); hookUiSounds(); // âm thanh: tải + giải mã song song với màn tải game (không chặn vào game); phát được sau lần chạm đầu
// model tướng tải lỗi hẳn (sau các lần thử lại): báo kèm lỗi (để biết lý do khi chơi trên điện thoại); game tự thử lại sau
const failShown = new Map();
addEventListener('la:modelfail', (e) => {
  const { id, error } = e.detail, now = Date.now(); if (now - (failShown.get(id) || 0) < 20000) return; failShown.set(id, now);
  toast(`Chưa tải được tướng ${HEROES[id]?.name || id} (${error}) — đang thử lại…`, 4500);
});

if (q.has('hero')) {
  bootDone();
  const bot = !q.has('nobot') && !q.has('dummies');
  const heroId = ALPHA.includes(q.get('hero')) ? q.get('hero') : 'hoa_ren';
  const enemyId = ALPHA.includes(q.get('enemy')) ? q.get('enemy') : ALPHA[(ALPHA.indexOf(heroId) + 3) % ALPHA.length];
  startMatch({ heroId, enemyId, bot, dummies: q.has('dummies'), difficulty: q.get('diff') || 'normal', mode: q.get('mode') || '1v1', playerRole: q.get('role') || undefined }); // ?role=jungle: vị trí người chơi (5v5)
} else {
  const next = takeNext(), p = profile();
  bootStart(next ? 'Đang trở về sảnh…' : undefined);
  await bootRun([
    { w: 1, run: () => Promise.all(FONT_PRELOAD.map((f) => document.fonts?.load?.(f, 'ĐẤU HẠNG 0123456789'))) }, // ui/fonts.js
    { w: 2, run: () => Promise.all([...new Set([...ALPHA, ...FRIENDS.map((f) => f.avatar)])].map((id) => loadImg(faceSrc(id)))) },
    { w: 2, run: () => Promise.all(['./assets/ui/lobby.jpg', './assets/ui/lobby_soft.jpg', './assets/ui/keyart.jpg'].map(loadImg)) }, // chỉ ảnh Sảnh cần (Mốc 14: tải theo nhu cầu)
    { w: 1, run: () => Promise.all([...ICONS, 'rank_' + rankOf(p.stars).id].map((n) => loadImg(iconSrc(n)))) },
    { w: 6, run: () => loadHero(p.feature, { showcase: true }), part: () => Math.max(heroProgress(p.feature, { showcase: true }), heroProgress(p.feature)) },
  ]);
  enter(next);
  bootDone();
  checkCrash(nav); // lần trước trình duyệt tắt game giữa lúc vào trận (thiếu bộ nhớ): hạ đồ hoạ + báo (ui/crashGuard.js)
  // ảnh thẻ tướng (chọn tướng / màn tải / sau trận / chiêu cuối) + ảnh phòng chờ: Sảnh không dùng nên không bắt màn khởi động chờ — tải nền
  // sau khi vào Sảnh (Tiết kiệm dữ liệu: bỏ, tải khi màn cần)
  if (!prefs().saveData) setTimeout(() => { for (const src of [...ALPHA.map(cardSrc), './assets/ui/room.jpg']) loadImg(src).catch(() => {}); }, 800);
  // model trong trận của các tướng: service worker lưu sẵn tệp (chơi không mạng, màn tải trận khỏi tải qua mạng); máy tính / máy tính bảng
  // giải mã luôn vào bộ nhớ để màn tải trận nhanh. Điện thoại (LITE) KHÔNG giải mã sẵn: 20 tướng ≈ 70 MB ảnh + hình khối nằm thừa trong
  // bộ nhớ làm trình duyệt tắt tab lúc vào trận 5v5 — màn tải chỉ giải mã đúng 10 tướng của trận (Cài đặt → Dữ liệu → Tiết kiệm dữ liệu: bỏ cả hai)
  if (!prefs().saveData) setTimeout(() => { if (!LITE) preloadHeroes(ALPHA); warmHeroes(ALPHA, LITE); }, 2500);
}
