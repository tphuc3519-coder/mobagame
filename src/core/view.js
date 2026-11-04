// Góc nhìn trận (chỉ phần vẽ / điều khiển — mô phỏng không đọc). Như Liên Quân: ai cũng thấy nhà mình ở bên trái / phía dưới. Người chơi
// đội Đỏ (trận trực tuyến) nhìn bản đồ xoay 180° quanh tâm: camera đứng phía bắc nhìn xuống nam, nên các đường hiện ngược lại, đối xứng với
// đội Xanh. Mọi chỗ đổi trục màn hình ↔ trục bản đồ đi qua đây: cần di chuyển, kéo ngắm chiêu / phép / nút Đánh, kéo camera, bản đồ nhỏ,
// tín hiệu, mũi tên địch ngoài khung, góc ảnh hạt. Đội Xanh / đấu máy: flip = false — y như cũ.
export const VIEW = { flip: false, w: 0, h: 0 };
/** Gọi khi dựng trận: flip = người chơi đội Đỏ; map = bản đồ (w, h). */
export function setView(flip, map) { VIEW.flip = !!flip; VIEW.w = map?.w || 0; VIEW.h = map?.h || 0; }
/** Hướng màn hình (x phải, y xuống) ↔ hướng bản đồ — phép đổi hai chiều như nhau. */
export const flipDir = (d) => (VIEW.flip && d ? { x: -d.x || 0, y: -d.y || 0 } : d);
/** Điểm bản đồ ↔ điểm "đã xoay" (vẽ / chạm bản đồ nhỏ) — phép đổi hai chiều như nhau. */
export const viewX = (x) => (VIEW.flip ? VIEW.w - x : x);
export const viewY = (y) => (VIEW.flip ? VIEW.h - y : y);
/** Dấu của trục: -1 khi xoay (màn hình phải = bản đồ trái, màn hình xuống = bản đồ lên). */
export const viewSign = () => (VIEW.flip ? -1 : 1);
