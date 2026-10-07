// Màn tải đầu game (ảnh 1): phần tĩnh nằm sẵn trong index.html (hiện ngay khi trang mở, thanh tiến độ tự chạy bằng CSS trong lúc trình
// duyệt tải mã), JS tiếp quản từ vị trí thanh đang đứng: tải font, ảnh giao diện, model tướng đứng ở sảnh — tiến độ theo việc xong thật.
const el = () => document.getElementById('boot');
let base = 0, shown = 0;

/** Bắt đầu phần JS: thanh dừng hiệu ứng CSS, giữ nguyên chỗ đang đứng làm mốc. */
export function bootStart(text) {
  const b = el(); if (!b) return;
  const bar = b.querySelector('.bt-bar'), i = bar.querySelector('i');
  base = shown = Math.min(0.5, (i.getBoundingClientRect().width || 0) / (bar.getBoundingClientRect().width || 1));
  b.classList.add('js'); i.style.width = (shown * 100).toFixed(1) + '%';
  bootProgress(0, text);
}
/** p: 0..1 tiến độ phần JS (ánh xạ vào đoạn còn lại của thanh). */
export function bootProgress(p, text) {
  const b = el(); if (!b) return;
  const v = Math.max(shown, base + (1 - base) * Math.min(1, Math.max(0, p))); shown = v;
  b.querySelector('.bt-bar i').style.width = (v * 100).toFixed(1) + '%';
  b.querySelector('.bt-txt b').textContent = Math.round(v * 100) + '%';
  if (text) b.querySelector('.bt-txt span').textContent = text;
}
export function bootDone() {
  const b = el(); if (!b) return;
  bootProgress(1); setTimeout(() => { b.classList.add('done'); setTimeout(() => b.remove(), 600); }, 250);
}
/** Chạy các việc tải song song, mỗi việc { w (trọng số), run: () => Promise } — lỗi một việc không chặn vào game. */
export async function bootRun(tasks, text) {
  const total = tasks.reduce((a, t) => a + (t.w || 1), 0) || 1; let done = 0;
  await Promise.all(tasks.map((t) => Promise.resolve().then(t.run).catch(() => {}).then(() => { done += t.w || 1; bootProgress(done / total, text); })));
}
/** Promise tải một ảnh (xong hoặc lỗi đều coi là xong). */
export const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(im); im.src = src; });
