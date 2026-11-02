// Hệ chữ (một nguồn cho CSS lẫn canvas) — UI v4 "hoạt hình phẳng": Baloo 2 — tiêu đề, nút, nhãn, mọi con số (đồng hồ, vàng, máu, sát thương,
// K/D/A): tròn, đậm, kiểu game hoạt hình, dấu tiếng Việt rõ; Be Vietnam Pro — câu chữ dài (mô tả chiêu, nhật ký). Cả hai SIL OFL 1.1,
// tự lưu ở assets/fonts (chơi không mạng). Canvas phải dùng đúng chuỗi ở đây: tên phông khớp @font-face trong index.html, main.js nạp trước khi vào sảnh.
export const DISP = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';
export const BODY = '"Be Vietnam Pro", system-ui, sans-serif';
/** Chuỗi ctx.font: font(800, 14) → chữ tiêu đề / số; font(600, 11, BODY) → chữ thường. */
export const font = (w, px, fam = DISP) => `${w} ${px}px ${fam}`;
/** Các kiểu cần nạp trước (main.js) — canvas vẽ ngay khung đầu, phông chưa về thì chữ bị vẽ bằng phông dự phòng và đệm sẵn luôn. */
export const PRELOAD = [...['500', '600', '700', '800'].map((w) => `${w} 16px "Be Vietnam Pro"`), ...['600', '700', '800'].map((w) => `${w} 16px "Baloo 2"`)];
