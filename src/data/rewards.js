// Tiền tệ, vật phẩm túi đồ, rương, cửa hàng mảnh (08 §3, §5 — GĐ4d). Mọi con số ở đây; ui/profile.js chỉ đọc.
// Vàng ở sảnh đóng vai Xu Đèn của 08 §5 (giữ tên "vàng" như các màn đã có). Cả 20 tướng mở sẵn (DECISIONS GĐ4) nên vàng không dùng mở tướng.

/** Tiền tệ trong hồ sơ: trường → tên + biểu tượng (ui/kit ICONS). */
export const CURRENCY = {
  gold: { name: 'Vàng', icon: 'coin', desc: 'Tiền sảnh: mua rương, đổi quà sự kiện.' },
  gems: { name: 'Ngọc', icon: 'gem', desc: 'Tiền hiếm, dành cho trang phục.' },
  manh: { name: 'Mảnh Tướng', icon: 'helmet', desc: 'Đổi vật phẩm ở cửa hàng mảnh (Túi đồ). Nhận từ rương.' },
  gao: { name: 'Gạo Hội', icon: 'lantern', desc: 'Quà sự kiện tích luỹ, đổi quà sự kiện.' },
};

/** Vật phẩm túi đồ (08 §3). ttl: hạn dùng tính từ lúc nhận (giờ); season: hết hạn khi hết mùa; không có cả hai: không hạn. */
export const BAG = {
  giu_sao_mvp: { name: 'Bùa Giữ Sao (MVP thua)', icon: 'trophy', ttl: 24, desc: 'Tự dùng sau trận đấu hạng thua khi bạn là MVP đội thua: không bị trừ sao.' },
  bua_giu_sao: { name: 'Bùa Giữ Sao', icon: 'scroll', season: true, desc: 'Tự dùng sau trận đấu hạng thua bất kỳ: không bị trừ sao.' },
  the_x2_sao: { name: 'Thẻ Nhân Đôi Sao', icon: 'star', ttl: 24 * 7, use: true, desc: 'Dùng trước trận đấu hạng: trận hạng kế tiếp thắng được +2 sao.' },
};

/** Rương thường: cứ `every` trận (mọi chế độ trừ luyện tập) được 1 rương; mua thêm bằng vàng. */
export const CHEST = { every: 3, gold: [50, 200], manh: [1, 5], itemOdds: 0.15, item: 'giu_sao_mvp', price: 300 };

/** Cửa hàng mảnh: đổi Mảnh Tướng lấy vật phẩm. */
export const SHARD_SHOP = [
  { id: 'giu_sao_mvp', cost: 8 },
  { id: 'bua_giu_sao', cost: 24 },
  { id: 'the_x2_sao', cost: 30 },
];
