// Nhắc chơi toàn màn hình khi thanh trình duyệt che bớt khung game (Safari iPhone còn thanh địa chỉ + thanh tab ngang: khung chỉ còn ~250 px
// cao thay vì ~390). Giao diện vẫn chơi được nhờ thu nhỏ đều (ui/viewport.js) nhưng chữ / nút nhỏ đi — nên ở Sảnh hiện một dải nhắc nhỏ
// giữa màn trên: máy cho bật toàn màn hình (Android Chrome…) thì bấm là bật, Safari iPhone thì mở hướng dẫn (ẩn thanh công cụ / Thêm vào
// MH chính). Tự ẩn sau 12 giây, khi khung đã đủ cao, hoặc khi bấm ✕ (không nhắc lại trong phiên này).
import { fullscreen, fullscreenHelp, isIos } from './kit.js';

const KEY = 'la.fullhint';
const standalone = () => (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true;
/** Khung game đang bị thanh trình duyệt che bớt: màn ngang, không toàn màn hình / không chạy như ứng dụng, chiều cao thấy được thấp hơn cạnh
 *  ngắn của màn hình ≥ 40 px (iOS báo screen theo hướng dọc nên lấy cạnh ngắn). */
export function cramped() {
  if (standalone() || document.fullscreenElement) return false;
  const short = Math.min(screen.width || 0, screen.height || 0);
  return innerWidth > innerHeight && short > 0 && innerHeight < short - 40;
}
/** Sảnh: hiện dải nhắc trong `host` (màn #home). Trả về hàm gỡ. */
export function maybeFullHint(host) {
  let seen = false; try { seen = !!sessionStorage.getItem(KEY); } catch (_) { /* */ }
  if (seen || !cramped()) return () => {};
  const el = document.createElement('div'); el.className = 'fh-tip';
  const canFs = !isIos() && !!document.fullscreenEnabled;
  el.innerHTML = `<span>Thanh trình duyệt đang che bớt màn hình</span><button type="button" class="btn-gold" data-fh="go">${canFs ? 'Toàn màn hình' : 'Cách chơi toàn màn'}</button><button type="button" class="fh-x" data-fh="x" aria-label="Đóng">✕</button>`;
  host.append(el);
  const done = () => { try { sessionStorage.setItem(KEY, '1'); } catch (_) { /* */ } close(); };
  const onResize = () => { if (!cramped()) close(); };
  const t = setTimeout(close, 12000);
  function close() { clearTimeout(t); removeEventListener('resize', onResize); el.classList.add('out'); setTimeout(() => el.remove(), 250); }
  addEventListener('resize', onResize);
  el.onclick = (e) => {
    e.stopPropagation();
    const a = e.target.closest('[data-fh]')?.dataset.fh; if (!a) return;
    if (a === 'go') { if (canFs) fullscreen(); else fullscreenHelp(); }
    done();
  };
  return close;
}
