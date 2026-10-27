// Bố cục HUD theo thiết bị (07 §9): cỡ cụm kỹ năng, nút phụ, cửa hàng, bản đồ nhỏ và chỗ nút camera tính từ khổ màn, vùng an toàn
// (tai thỏ, thanh vuốt), loại màn (chạm hay chuột) và cài đặt "Cỡ nút bấm" / "Cỡ bản đồ nhỏ"; đặt thành biến CSS trên :root
// (--a nút Đánh, --s nút chiêu, --m nút Ăn lính / Đẩy trụ, --skw/--skh khung cụm, --mini/--item nút phụ, --gp nút cửa hàng, --camR/--camB).
// Cần điều khiển (joystick.js) đọc R + vị trí nghỉ ở đây: đo các khối thật (bản đồ nhỏ, nút tín hiệu, cửa hàng, hàng nút phụ) rồi đặt
// cần vào khoảng trống góc trái dưới — trước: cần cố định 180 px đè lên cửa hàng / nút Biến về trên mọi điện thoại.
import { prefs, onPref } from '../core/prefs.js';
import { on, track } from '../core/scope.js';

export const HUD_SIZES = Object.freeze({ sm: 0.88, md: 1, lg: 1.14 });
export const MM_SIZES = Object.freeze({ sm: 0.85, md: 1, lg: 1.2 });
/** Vùng chạm nhỏ nhất cho nút chính trên màn chạm (Apple HIG 44 pt). */
export const TOUCH_MIN = 44;
const CAM = 50, HUDSET = 38, CLUSTER_MIN = 66;
/** Thanh máu / mana / cấp của mình vẽ sát đáy trái (hud.js): đỉnh cách đáy SELF_BAR px, rộng min(220, 24% bề ngang). Cần điều khiển đứng trên nó. */
export const SELF_BAR = 25;
/** Bán kính cần nhỏ nhất: kéo gần hay xa đều chạy cùng tốc độ (joystick.js) nên R chủ yếu là phần nhìn — màn rất thấp (667×320) cho co tới 48 thay vì đè thanh máu. */
export const JOY_MIN = 48;
export const selfBarRect = (W, H, safeL = 0) => ({ l: 16 + safeL, t: H - SELF_BAR, r: 16 + safeL + Math.min(220, W * 0.24), b: H - 5 });
const clamp = (lo, v, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * clamp(0, t, 1);

/** Số đo cụm kỹ năng từ cỡ nút Đánh a (công thức cũ của index.html; bề ngang = tới mép trái nút chiêu 1, không chừa khoảng trống). */
export function clusterDims(a, touch = true) {
  const s = 0.68 * a, m = Math.max(touch ? TOUCH_MIN : 34, 0.66 * s);
  return { a, s, m, skw: a + 0.95 * m + 16 + s + 6, skh: a + 1.4 * s + 0.5 * m + 26 };
}

/**
 * Hàm thuần (test được bằng node): W×H khung nhìn, safe vùng an toàn {t,r,b,l}, touch màn chạm, size / mm cỡ trong Cài đặt,
 * shopRight cửa hàng đặt bên phải (chiếm góc phải trên dưới nút cài đặt). Trả về số đo (px) đã làm tròn.
 */
export function computeHudLayout({ W, H, safe = {}, touch = true, size = 'md', mm = 'md', shopRight = false }) {
  const sf = { t: safe.t || 0, r: safe.r || 0, b: safe.b || 0, l: safe.l || 0 };
  const top = Math.max(8, sf.t), right = Math.max(12, sf.r), bot = Math.max(10, sf.b);
  const hu = Math.max(200, H - sf.t - sf.b); // chiều cao dùng được
  const gp = Math.round(clamp(48, 0.15 * hu, 64)); // nút cửa hàng (giỏ + vàng)
  // khối góc phải trên: nút cài đặt / toàn màn hình; cửa hàng bên phải xếp ngay dưới (hàng ngang khi màn thấp, 2 dòng khi cao)
  const topRight = top + (shopRight ? 50 + (H < 560 ? Math.max(gp, Math.min(60, gp + 4)) : 124) : HUDSET); // một ô mua nhanh (ảnh co theo nút giỏ, --qi) cao hơn nút giỏ 4 px; 124 = hai ô xếp dọc
  // nút Đánh: theo chiều cao (màn chạm to hơn — ngón cái; chuột nhỏ hơn — thấy được nhiều sân hơn), nhân cỡ người chơi chọn
  const k = HUD_SIZES[size] ?? 1;
  let d = clusterDims((touch ? clamp(84, 0.235 * hu, 118) : clamp(80, 0.15 * hu, 104)) * k, touch);
  // cụm phải nằm dưới khối góc phải trên: màn thấp (Safari còn thanh địa chỉ, 667×320) thì thu nhỏ dần thay vì đè nút cài đặt / cửa hàng
  const room = H - bot - topRight - 6;
  while (d.skh > room && d.a > CLUSTER_MIN) d = clusterDims(d.a - 1, touch);
  // nút camera: trên cụm nếu đủ chỗ, không thì vào góc trái trên khung cụm (ô trống giữa nút chiêu 1 và chiêu 3)
  const camAbove = H - bot - d.skh - 16 - CAM >= topRight + 6;
  const camR = camAbove ? right + 6 : right + d.skw - CAM - 4, camB = camAbove ? bot + d.skh + 16 : bot + d.skh - CAM;
  const mini = clamp(touch ? 46 : 40, 0.58 * d.a, 66), item = mini * 1.1;
  // bản đồ nhỏ: ~35% chiều cao trên điện thoại (chừa chỗ cửa hàng + cần điều khiển bên dưới), ~30% trên máy tính bảng / máy tính, tối đa 320
  const mmBox = clamp(104, lerp(0.35, 0.3, (hu - 400) / 400) * hu * (MM_SIZES[mm] ?? 1), 320);
  const R = clamp(JOY_MIN, 0.9 * d.a, 104); // bán kính cần mong muốn — joystick đo chỗ trống thật rồi mới chốt
  const r = (v) => Math.round(v * 10) / 10;
  return { touch, hu, safe: sf, top, right, bot, a: r(d.a), s: r(d.s), m: r(d.m), skw: r(d.skw), skh: r(d.skh), mini: r(mini), item: r(item), gp,
    camAbove, camR: r(camR), camB: r(camB), mm: Math.round(mmBox), R: Math.round(R), topRight };
}

/**
 * Chỗ nghỉ của cần điều khiển trong khoảng trống góc trái dưới: bên dưới các khối trên (bản đồ nhỏ, nút tín hiệu, cửa hàng),
 * bên trái hàng nút phụ, trên thanh máu của mình ở đáy. Trả { R, x, y }; khoảng trống quá hẹp thì giữ R tối thiểu JOY_MIN (đè ít nhất có thể).
 */
export function joyRest({ H, safe = {}, Rwant = 90, above = 0, extrasLeft = Infinity }) {
  const L = Math.max(8, safe.l || 0) + 10, B = H - Math.max(Math.max(8, safe.b || 0) + 8, SELF_BAR + 6), T = above + 8, Rt = extrasLeft - 10; // B: trên thanh máu của mình
  const R = Math.round(clamp(JOY_MIN, Math.min(Rwant, (B - T) / 2, (Rt - L) / 2), Rwant));
  const x = Math.max(L + R, Math.min(Rt - R, (safe.l || 0) + 1.55 * R + 10));
  const y = Math.max(T + R, Math.min(B - R, H - (safe.b || 0) - 1.35 * R));
  return { R, x: Math.round(x), y: Math.round(y) };
}

/** Phần DOM: đặt biến CSS, nghe đổi khổ màn / xoay / cài đặt; rest() cho joystick (đo lại tối đa mỗi giây, không đổi khi đang giữ cần). */
export function createHudLayout() {
  const root = document.documentElement.style;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(track(probe));
  const subs = new Set();
  let cur = null, joy = { R: 90, x: 160, y: innerHeight - 130 }, at = -1e9, holding = () => false;
  const safe = () => { const c = getComputedStyle(probe), n = (v) => parseFloat(v) || 0; return { t: n(c.paddingTop), r: n(c.paddingRight), b: n(c.paddingBottom), l: n(c.paddingLeft) }; };
  const touch = () => (typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
  function update() {
    const p = prefs();
    cur = computeHudLayout({ W: innerWidth, H: innerHeight, safe: safe(), touch: touch(), size: p.hudSize, mm: p.mmSize, shopRight: p.shop === 'right' });
    for (const k of ['a', 's', 'm', 'skw', 'skh', 'mini', 'item', 'gp', 'camR', 'camB']) root.setProperty('--' + k, cur[k] + 'px');
    for (const fn of [...subs]) fn(cur);
    at = -1e9; // đo lại chỗ cần ở lần vẽ kế tiếp (khối đã đổi cỡ)
  }
  const box = (sel) => { const e = document.querySelector(sel); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? r : null; };
  function measure() {
    let above = 0, extrasLeft = Infinity;
    for (const s of ['#minimap', '#pingBtn', 'body:not(.shop-right) .dock']) { const r = box(s); if (r && r.left < innerWidth * 0.5) above = Math.max(above, r.bottom); }
    for (const e of document.querySelectorAll('#extras > .xb')) { if (e.hidden) continue; const r = e.getBoundingClientRect(); if (r.width) extrasLeft = Math.min(extrasLeft, r.left); }
    joy = joyRest({ H: innerHeight, safe: cur.safe, Rwant: cur.R, above, extrasLeft });
  }
  on(window, 'resize', update); on(window, 'orientationchange', update);
  onPref((k) => { if (k === 'hudSize' || k === 'mmSize' || k === 'shop') update(); });
  update();
  return {
    get cur() { return cur; },
    /** Cần điều khiển: { R, x, y } — đo lại khi khối quanh nó đổi (mua đồ kích hoạt thêm nút phụ…), không đổi lúc đang giữ cần. */
    joy(force = false) { const now = performance.now(); if ((force || now - at > 1000) && !holding()) { at = now; measure(); } return joy; },
    holdWith(fn) { holding = fn; },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    update,
  };
}
