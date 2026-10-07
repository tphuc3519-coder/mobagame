// Sân khấu 3D dùng chung cho sảnh, chọn tướng và màn đội hình (một ngữ cảnh WebGL duy nhất, tạo khi cần): ẩn + ngừng vẽ ở phòng chờ,
// giải phóng hẳn trước khi vào trận (trận tạo renderer riêng — hai ngữ cảnh cùng lúc dễ làm điện thoại yếu mất đồ hoạ).
import { createShowcase } from '../showcase/showcase.js';
import { pickLevel } from '../render/quality.js';

let show = null;
const canvas = () => document.getElementById('show');
export function stage() {
  if (!show) show = createShowcase(canvas(), { quality: pickLevel(), autoSpin: false });
  return show;
}
export function stageOn(on) {
  canvas()?.classList.toggle('off', !on);
  if (show) (on ? show.resume() : show.pause());
}
export function stageDispose() {
  if (show) { show.dispose(); show = null; }
}
