// Hệ chữ (một nguồn cho CSS lẫn canvas) — UI v5 "Sơn mài" (09/11): Fraunces cho tiêu đề ngoài trận (TITLE); Be Vietnam Pro cho nút, nhãn, mọi con số (đồng hồ, vàng, máu, sát thương,
// K/D/A) và câu chữ dài (mô tả chiêu, nhật ký) — dấu tiếng Việt rõ, số đều nhau. Cả hai SIL OFL 1.1,
// tự lưu ở assets/fonts (chơi không mạng). Canvas phải dùng đúng chuỗi ở đây: tên phông khớp @font-face trong index.html, main.js nạp trước khi vào sảnh.
export const DISP = '"Be Vietnam Pro", system-ui, sans-serif'; // UI v5 (09/11): số / nhãn trong trận cũng Be Vietnam Pro (bỏ Baloo 2 tròn kiểu hoạt hình)
export const BODY = '"Be Vietnam Pro", system-ui, sans-serif';
/** UI v5 (09/11): chữ tiêu đề ngoài trận — Fraunces (có chân, ấm); nhãn, nút, số dùng Be Vietnam Pro (CSS: --u-title / --u-disp). */
export const TITLE = '"Fraunces", "Be Vietnam Pro", Georgia, serif';
/** Chuỗi ctx.font: font(800, 14) → chữ tiêu đề / số; font(600, 11, BODY) → chữ thường. */
export const font = (w, px, fam = DISP) => `${w} ${px}px ${fam}`;
/** Các kiểu cần nạp trước (main.js) — canvas vẽ ngay khung đầu, phông chưa về thì chữ bị vẽ bằng phông dự phòng và đệm sẵn luôn. */
export const PRELOAD = [...['500', '600', '700', '800'].map((w) => `${w} 16px "Be Vietnam Pro"`), ...['600', '700'].map((w) => `${w} 16px "Fraunces"`)];
