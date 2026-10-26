// Cài như ứng dụng + chơi không cần mạng (service worker ở sw.js, đánh phiên bản lúc deploy bằng tools/mk_sw.mjs).
// Chỉ đăng ký trên https (hoặc localhost khi có ?sw — để các bộ kiểm thử trên máy không bị bộ nhớ đệm chen vào); ?nosw luôn bỏ qua.
// Bản mới tải xong: đang ở màn khởi động thì áp ngay; còn lại chỉ hỏi "Có bản mới" ở Sảnh / Phòng chờ (không bao giờ giữa trận), "Để sau" hoãn 30 phút.
import { dialog } from './kit.js';

let deferred = null, reg = null, waiting = null, asked = false, snoozeUntil = 0, canPrompt = () => false, st = null, lastCheck = 0;
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const standalone = () => typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
const buildOf = () => document.querySelector('meta[name="la-build"]')?.content || '__BUILD__';

export function initPwa(o = {}) {
  canPrompt = o.canPrompt || canPrompt;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  addEventListener('appinstalled', () => { deferred = null; });
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!('serviceWorker' in navigator) || q.has('nosw') || !(location.protocol === 'https:' || (local && q.has('sw')))) return;
  const sw = navigator.serviceWorker, had = !!sw.controller;
  let reloading = false;
  sw.addEventListener('controllerchange', () => { if (had && asked && !reloading) { reloading = true; location.reload(); } });
  sw.addEventListener('message', (e) => { if (e.data?.type === 'STATUS') st = e.data; });
  const seen = (w) => { if (!w || !sw.controller) return; waiting = w; if (document.getElementById('boot')) apply(); else offer(); };
  sw.register('./sw.js', { scope: './', updateViaCache: 'none' }).then((r) => {
    reg = r; seen(r.waiting);
    r.addEventListener('updatefound', () => { const n = r.installing; n?.addEventListener('statechange', () => { if (n.state === 'installed') seen(n); }); });
    sw.ready.then((x) => x.active?.postMessage({ type: 'STATUS' }));
  }).catch(() => { /* trình duyệt chặn (chế độ riêng tư…): game vẫn chạy bình thường */ });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && reg && Date.now() - lastCheck > 600000) { lastCheck = Date.now(); reg.update().catch(() => {}); } });
  if (standalone()) navigator.storage?.persist?.().catch(() => {});
}
function offer() {
  if (!waiting || asked || Date.now() < snoozeUntil || !canPrompt()) return;
  dialog({ title: 'Có bản mới', html: '<p>Bản cập nhật đã tải xong. Cập nhật ngay? Game sẽ tải lại trong vài giây.</p>',
    buttons: [{ text: 'Để sau', on: () => { snoozeUntil = Date.now() + 1800000; } }, { text: 'Cập nhật', cls: 'gold', on: apply }] });
}
function apply() { if (!waiting) return; asked = true; waiting.postMessage({ type: 'SKIP_WAITING' }); }
/** Gọi khi về Sảnh / Phòng chờ (sau trận): có bản mới đang chờ thì hỏi. */
export const pwaLobby = () => offer();
/** Nhờ service worker lưu sẵn model các tướng để chơi không mạng. */
export const warmHeroes = (ids, lite) => { navigator.serviceWorker?.ready?.then((r) => r.active?.postMessage({ type: 'WARM', ids, lite })).catch(() => {}); };
export const canInstall = () => !!deferred;
export function promptInstall() { const d = deferred; if (!d) return; d.prompt(); d.userChoice?.finally?.(() => { deferred = null; }); }
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Dòng ghi chú ở Cài đặt → Dữ liệu. */
export function pwaNote() {
  const b = buildOf();
  if (b === '__BUILD__' || st?.dev) return 'Bản thử trên máy — chưa lưu để chơi không mạng.';
  const n = st?.heroes?.length ?? 0, ios = isIos() && !standalone() ? '<br>iPhone: Safari → Chia sẻ → <b>Thêm vào MH chính</b>, mở một lần khi có mạng là chơi được không mạng.' : '';
  return `Phiên bản <b>${b}</b> · Chơi không cần mạng: đã lưu <b>${n}/20</b> tướng.${ios}`;
}
