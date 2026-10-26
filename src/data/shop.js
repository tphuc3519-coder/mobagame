// Cửa hàng ngọc (GĐ5b): ngọc là tiền hiếm dành cho trang phục (data/rewards.js). Không có nạp tiền — ngọc kiếm trong game (GEM_FROM).

/** Trang phục phối màu vĩnh viễn: nhân màu vật liệu tướng (như trang phục mùa), không đổi chỉ số. 4 model cao cấp không có (SKIN_LOCKED). */
export const COSTUMES = [
  { id: 'hong_ngoc', name: 'Hồng Ngọc', tint: '#ffb3b3', price: 60 },
  { id: 'luc_bao', name: 'Lục Bảo', tint: '#a8f0c8', price: 60 },
  { id: 'hoang_hon', name: 'Hoàng Hôn', tint: '#ffc98a', price: 60 },
  { id: 'thach_anh', name: 'Thạch Anh', tint: '#cfc0ff', price: 60 },
];
export const costumeOf = (id) => COSTUMES.find((c) => c.id === id) || null;

/** Vật phẩm đổi bằng ngọc: mỗi món là một mô tả thưởng (ui/profile.js grant). */
export const GEM_SHOP = [
  { id: 'g_chest3', name: '3 Rương', desc: 'Mỗi rương: vàng, Mảnh Tướng, có thể có Bùa Giữ Sao (MVP thua).', icon: 'chest', price: 30, give: { chest: 3 } },
  { id: 'g_bua', name: 'Bùa Giữ Sao', desc: 'Thua bất kỳ trận hạng nào cũng không mất sao (dùng tự động).', icon: 'lantern', price: 40, give: { item: 'bua_giu_sao' } },
  { id: 'g_x2', name: 'Thẻ Nhân Đôi Sao', desc: 'Bật trước trận hạng: thắng được +2 sao. Hạn 7 ngày.', icon: 'star', price: 50, give: { item: 'the_x2_sao' } },
  { id: 'g_gold', name: '800 vàng', desc: 'Đổi ngọc lấy vàng.', icon: 'coin', price: 20, give: { gold: 800 } },
];

/** Nguồn ngọc: mỗi lần lên cấp, Rương tuần (data/missions.js WEEK_BONUS), thưởng hết mùa từ Nguyệt Quang, Hành trình đỉnh cao (data/seasons.js). */
export const GEM_FROM = { levelUp: 10 };
