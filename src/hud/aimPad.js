// Vòng ngắm quanh nút đang kéo (bán kính = độ kéo tối đa) + núm, và ô X huỷ góc phải (kéo ngón vào rồi thả để huỷ) — như Liên Quân.
// Dùng chung cho nút kỹ năng (skillButtons.js), nút phép bổ trợ có hướng (Chớp Bước…, spellButtons.js) và nút Đánh khi bật Đánh thường chính xác:
// một bộ phần tử DOM duy nhất. Theo Cài đặt → Điều khiển (core/prefs.js, đọc lúc dùng nên đổi giữa trận là áp dụng ngay):
// aimSens = độ kéo hết tầm (vòng ngắm to/nhỏ theo), aimAt = tâm vòng ngắm ở giữa nút / chỗ ngón vừa chạm, cancelBy = huỷ bằng ô X / kéo ngón ra xa.
import { pref } from '../core/prefs.js';

export const DRAG_MIN = 15;
/** Độ kéo hết tầm (px): độ nhạy 0 → 150, 0,5 → 110 (như cũ), 1 → 70. */
export const dragMax = () => 150 - 80 * pref('aimSens');
/** Tâm vòng ngắm của lượt chạm e trên nút có khung r: giữa nút (như cũ) hoặc chỗ ngón vừa chạm (aimAt = 'finger'). */
export const aimOrigin = (e, r) => (pref('aimAt') === 'finger' ? { cx: e.clientX, cy: e.clientY } : { cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
/** Hướng của lần ngắm gần nhất (kỹ năng / Chớp Bước kéo rồi thả; trục màn hình = trục bản đồ) — Chớp Bước chạm nhanh khi flashDir = 'skill'. */
export const lastAim = { dir: null };

let pad = null, xz = null, knob = null, lab = null, owner = null; // owner: nút đang vẽ vòng ngắm (nhiều ngón: nút khác thả ra không tắt nhầm)
const focus = { pt: null, range: 0 }; // điểm đang ngắm (thế giới) của owner — camAim (camLook.js)
function ensure() {
  if (pad) return;
  pad = document.createElement('div'); pad.className = 'aimpad'; pad.hidden = true; pad.innerHTML = '<i></i><b hidden>Thả để huỷ</b>';
  xz = document.createElement('div'); xz.className = 'cancelZone'; xz.hidden = true; xz.innerHTML = '<svg viewBox="0 0 40 40"><path d="M11 11L29 29M29 11L11 29" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
  document.body.append(pad, xz);
  knob = pad.firstChild; lab = pad.lastChild;
}

/** Ngón đang ở trong ô X huỷ? */
export function inCancel(x, y) {
  ensure();
  const r = xz.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  return Math.hypot(x - cx, y - cy) < r.width * 0.62;
}
/** Thả ngón ở (x, y) thì huỷ? Ô X (cancelBy = 'zone', như cũ) hoặc ngón xa tâm vòng ngắm a quá 1,6 × độ kéo hết tầm ('distance'). */
export const isCancel = (a, x, y) => (pref('cancelBy') === 'distance' ? Math.hypot(x - a.cx, y - a.cy) > 1.6 * dragMax() : inCancel(x, y));

/** Vẽ phiên ngắm a = { aiming, cx, cy, dir: {x, y}, f (0..1 độ kéo), cancel } của nút `who`, hoặc ẩn khi a = null (chỉ khi `who` đang vẽ). */
export function aimUI(a, who = 'skill') {
  ensure();
  const on = !!a?.aiming;
  if (!on && owner !== who) return;
  owner = on ? who : null; if (!on) focus.pt = null;
  const far = pref('cancelBy') === 'distance'; // huỷ bằng khoảng cách: ẩn ô X, vòng đỏ + chữ "Thả để huỷ" trên vòng
  pad.hidden = !on; xz.hidden = !on || far; document.body.classList.toggle('aiming', on);
  if (!on) return;
  const R = dragMax();
  pad.style.left = a.cx + 'px'; pad.style.top = a.cy + 'px'; pad.style.width = pad.style.height = R * 2 + 'px';
  knob.style.transform = `translate(${a.dir.x * a.f * R}px, ${a.dir.y * a.f * R}px)`;
  xz.classList.toggle('hot', !!a.cancel); pad.classList.toggle('bad', !!a.cancel); lab.hidden = !(far && a.cancel);
}
/** Điểm đang ngắm (toạ độ thế giới) + tầm chiêu của nút `who` — chỉ nhận khi `who` đang vẽ vòng ngắm. */
export function setAimFocus(who, pt, range) { if (owner === who) { focus.pt = pt; focus.range = range; } }
/** { pt, range } của lượt ngắm đang hiện, hoặc null. */
export const aimFocus = () => (owner && focus.pt ? focus : null);
