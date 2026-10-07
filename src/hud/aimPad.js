// Vòng ngắm quanh nút đang kéo (bán kính = độ kéo tối đa) + núm, và ô X huỷ góc phải (kéo ngón vào rồi thả để huỷ) — như Liên Quân.
// Dùng chung cho nút kỹ năng (skillButtons.js) và nút phép bổ trợ có hướng (Chớp Bước…, spellButtons.js): một bộ phần tử DOM duy nhất.
export const DRAG_MIN = 15, DRAG_MAX = 110;

let pad = null, xz = null, knob = null, owner = null; // owner: nút đang vẽ vòng ngắm (nhiều ngón: nút khác thả ra không tắt nhầm)
function ensure() {
  if (pad) return;
  pad = document.createElement('div'); pad.className = 'aimpad'; pad.hidden = true; pad.innerHTML = '<i></i>';
  xz = document.createElement('div'); xz.className = 'cancelZone'; xz.hidden = true; xz.innerHTML = '<svg viewBox="0 0 40 40"><path d="M11 11L29 29M29 11L11 29" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
  document.body.append(pad, xz);
  knob = pad.firstChild;
}

/** Ngón đang ở trong ô X huỷ? */
export function inCancel(x, y) {
  ensure();
  const r = xz.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  return Math.hypot(x - cx, y - cy) < r.width * 0.62;
}

/** Vẽ phiên ngắm a = { aiming, cx, cy, dir: {x, y}, f (0..1 độ kéo), cancel } của nút `who`, hoặc ẩn khi a = null (chỉ khi `who` đang vẽ). */
export function aimUI(a, who = 'skill') {
  ensure();
  const on = !!a?.aiming;
  if (!on && owner !== who) return;
  owner = on ? who : null; pad.hidden = !on; xz.hidden = !on; document.body.classList.toggle('aiming', on);
  if (!on) return;
  pad.style.left = a.cx + 'px'; pad.style.top = a.cy + 'px'; pad.style.width = pad.style.height = DRAG_MAX * 2 + 'px';
  knob.style.transform = `translate(${a.dir.x * a.f * DRAG_MAX}px, ${a.dir.y * a.f * DRAG_MAX}px)`;
  xz.classList.toggle('hot', !!a.cancel); pad.classList.toggle('bad', !!a.cancel);
}
