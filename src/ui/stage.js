// Sân khấu 3D dùng chung cho sảnh, chọn tướng và màn đội hình (một ngữ cảnh WebGL duy nhất, tạo khi cần): canvas nền trong suốt vẽ
// tướng + bệ + đèn bay lên phông dựng sẵn (#showbg: quảng trường đêm ở sảnh, bản mờ ở chọn tướng / đội hình, có thể thêm tia sáng xoay
// sau lưng tướng); ẩn + ngừng vẽ ở phòng chờ, giải phóng hẳn trước khi vào trận (trận tạo renderer riêng — hai ngữ cảnh cùng lúc dễ làm
// điện thoại yếu mất đồ hoạ).
import { createShowcase } from '../showcase/showcase.js';
import { pickLevel } from '../render/quality.js';

let show = null, poll = 0, busy = 0;
const canvas = () => document.getElementById('show');
const bg = () => document.getElementById('showbg');
export function stage() {
  if (!show) { show = createShowcase(canvas(), { quality: pickLevel(), autoSpin: false, transparent: true }); poll = setInterval(loadHint, 300); }
  return show;
}
/** "Đang tải tướng…" giữa sân khấu khi tướng được chọn chưa hiện được quá ~0,6 s (model đang tải / tải lại sau lỗi mạng). */
function loadHint() {
  const el = document.getElementById('showload'); if (!el || !show) return;
  const waiting = !!show.wanted && show.current?.id !== show.wanted && !canvas()?.classList.contains('off');
  busy = waiting ? busy + 1 : 0;
  el.classList.toggle('on', busy >= 2);
  if (busy >= 2) el.style.left = `calc(50% + ${show.offsetX || 0}px)`;
}
export function stageOn(on) {
  canvas()?.classList.toggle('off', !on);
  bg()?.classList.toggle('off', !on);
  if (show) (on ? show.resume() : show.pause());
}
/** Phông sau tướng: kind 'home' (quảng trường đêm) | 'soft' (bản mờ, tối); rays: tia sáng xoay quanh tâm (cx, cy: vị trí trên màn). */
export function backdrop(kind, { rays = false, cx = '50%', cy = '42%' } = {}) {
  const b = bg(); if (!b) return;
  b.className = `${kind}${rays ? ' rays' : ''}`;
  b.style.setProperty('--cx', cx); b.style.setProperty('--cy', cy);
}
export function stageDispose() {
  if (show) { show.dispose(); show = null; }
  clearInterval(poll); busy = 0; document.getElementById('showload')?.classList.remove('on');
}
