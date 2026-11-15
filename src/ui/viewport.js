// Co giãn giao diện ngoài trận theo cỡ màn — mọi máy, mọi cấu hình thấy cùng một bố cục. Giao diện (sảnh, phòng chờ, chọn tướng, cấm/chọn,
// màn tải, kết quả, bảng, hộp thoại, Cài đặt) thiết kế cho khung tối thiểu 640×360. Màn thấp / hẹp hơn (iPhone trong Safari còn thanh
// địa chỉ + thanh tab: chỉ ~852×252; iPhone SE: ~667×235) thì cả giao diện thu nhỏ đều theo tỉ lệ (CSS zoom) — như đang xem khung 360 px
// cao; màn lớn (máy tính bảng / máy tính) phóng to 1,25 / 1,5 như trước. Đặt lên :root:
//   --uiz        tỉ lệ (số); .scr / .ui-panel / .ui-dlg / #rewardScr / .lqs-wrap dùng zoom: var(--uiz) (css.js)
//   --vh / --vw  1% khung nhìn tính theo toạ độ ĐÃ co giãn (H/uiz/100 px) — thay đơn vị vh / vw trong CSS giao diện: zoom của Chrome có nhân
//                cả vh còn Safari thì không, và vh của Safari iPhone là chiều cao khi ĐÃ ẩn thanh địa chỉ (lớn hơn phần nhìn thấy) → hộp thoại
//                cao "92vh" tràn khỏi màn. innerHeight là phần thật sự nhìn thấy.
//   --rvh / --rvw 1% phần nhìn thấy thật (cho phần KHÔNG co giãn: HUD trong trận, màn khởi động, băng-rôn kết thúc trận)
//   --sl / --sr / --st / --sb  vùng an toàn (tai thỏ / thanh vuốt) chia cho tỉ lệ — đặt trong phần co giãn vẫn đúng bằng vùng an toàn thật
export const DESIGN = { w: 640, h: 360 };
export const VP = { z: 1, w: 0, h: 0 };
/** Tỉ lệ giao diện hiện tại (đổi px của giao diện sang px thật: nhân với số này). */
export const uiZoom = () => VP.z;

/** Tỉ lệ cho khung W×H (hàm thuần — kiểm thử được bằng node). */
export function zoomFor(W, H) {
  if (!(W > 0 && H > 0)) return 1;
  const short = Math.min(W, H), long = Math.max(W, H); // màn dọc (đang hiện "Xoay ngang"): tính như đã xoay
  const z = Math.min(1, short / DESIGN.h, long / DESIGN.w);
  if (z < 1) return Math.max(0.5, Math.floor(z * 1000) / 1000);
  return short >= 760 && long >= 1200 ? 1.5 : short >= 560 && long >= 900 ? 1.25 : 1;
}

let started = false;
function apply() {
  const W = window.innerWidth, H = window.innerHeight;
  // bàn phím ảo (Android thu khung nhìn khi gõ mã phòng / tên): giữ tỉ lệ cũ — không co cả giao diện giữa lúc đang gõ; đóng bàn phím (cao lại) thì tính lại
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
  if (typing && VP.h && W === VP.w && H < VP.h) return;
  const z = zoomFor(W, H);
  VP.z = z; VP.w = W; VP.h = H;
  const s = document.documentElement.style, px = (v) => `${Math.round(v * 1000) / 1000}px`;
  s.setProperty('--uiz', String(z));
  s.setProperty('--vh', px(H / z / 100)); s.setProperty('--vw', px(W / z / 100));
  s.setProperty('--rvh', px(H / 100)); s.setProperty('--rvw', px(W / 100));
}
/** Gọi một lần khi mở game (trước khi dựng giao diện). */
export function initViewport() {
  if (started) return; started = true;
  const s = document.documentElement.style;
  for (const [k, side] of [['--sl', 'left'], ['--sr', 'right'], ['--st', 'top'], ['--sb', 'bottom']]) s.setProperty(k, `calc(env(safe-area-inset-${side}, 0px) / var(--uiz, 1))`);
  apply();
  addEventListener('resize', apply); addEventListener('orientationchange', () => setTimeout(apply, 50));
  window.visualViewport?.addEventListener('resize', apply); // Safari: thanh địa chỉ hiện / ẩn
}
