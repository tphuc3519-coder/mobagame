// Bảng bùa (05 §7): 3 màu × 5 ô. Mỗi viên cộng chỉ số phẳng theo bảng; trùng viên được, ô trống được, cấp trang = số ô đã gắn (0..15).
// Người chơi tự xếp ở Sảnh → Bảng Bùa (ui/charmEditor.js; tối đa CHARM_PAGE_MAX trang riêng, 5 trang mẫu chỉ đọc — sửa là tạo bản sao).
// Mọi trang vào mô phỏng đều đi qua sanitizePage (localStorage hỏng / sửa tay không lọt vào trận).
export const CHARMS = {
  r_luoi: { name: 'Bùa Lưỡi', color: 'red', stats: { atk: 2.4 } },
  r_lua: { name: 'Bùa Lửa', color: 'red', stats: { ap: 3.6 } },
  r_gio: { name: 'Bùa Gió', color: 'red', stats: { atkSpeedPct: 0.012 } },
  r_nanh: { name: 'Bùa Nanh', color: 'red', stats: { crit: 0.008, atk: 1 } },
  r_xuyen: { name: 'Bùa Xuyên', color: 'red', stats: { armorPenFlat: 2, atk: 1.6 } },
  r_sam: { name: 'Bùa Sấm', color: 'red', stats: { mrPen: 3, ap: 1.8 } },
  b_suong: { name: 'Bùa Sương', color: 'blue', stats: { cdr: 0.01, maxMana: 20 } },
  b_mach: { name: 'Bùa Mạch', color: 'blue', stats: { lifesteal: 0.008 } },
  b_nguyet: { name: 'Bùa Nguyệt', color: 'blue', stats: { spellvamp: 0.008 } },
  b_chan: { name: 'Bùa Chân', color: 'blue', stats: { moveSpeedPct: 0.008 } },
  b_nhan: { name: 'Bùa Nhẫn', color: 'blue', stats: { tenacity: 0.016 } },
  g_da: { name: 'Bùa Đá', color: 'gray', stats: { armor: 3 } },
  g_may: { name: 'Bùa Mây', color: 'gray', stats: { mr: 3 } },
  g_re: { name: 'Bùa Rễ', color: 'gray', stats: { maxHp: 40 } },
  g_suoi: { name: 'Bùa Suối', color: 'gray', stats: { regenHp: 1.6, maxHp: 20 } }, // 8 HP / 5s = 1.6 HP/s
};

const x = (id, n) => Array(n).fill(id);
export const CHARM_PAGES = {
  dps: { name: 'ST liên tục', red: [...x('r_gio', 3), ...x('r_nanh', 2)], blue: [...x('b_mach', 3), ...x('b_chan', 2)], gray: x('g_re', 5) },
  assassin: { name: 'Sát thủ vật lý', red: x('r_xuyen', 5), blue: [...x('b_suong', 3), ...x('b_chan', 2)], gray: [...x('g_re', 3), ...x('g_da', 2)] },
  mage: { name: 'Pháp sư', red: [...x('r_lua', 3), ...x('r_sam', 2)], blue: x('b_suong', 5), gray: [...x('g_re', 3), ...x('g_may', 2)] },
  tank: { name: 'Đỡ đòn', red: x('r_luoi', 5), blue: [...x('b_nhan', 3), ...x('b_suong', 2)], gray: [...x('g_da', 3), ...x('g_may', 2)] },
  support: { name: 'Trợ thủ', red: x('r_lua', 5), blue: x('b_suong', 5), gray: [...x('g_re', 3), ...x('g_suoi', 2)] },
};
export const PAGE_BY_ROLE = { marksman: 'dps', assassin: 'assassin', mage: 'mage', tank: 'tank', fighter: 'assassin', support: 'support' };

export const CHARM_SLOTS = 5;
export const CHARM_COLORS = ['red', 'blue', 'gray'];
export const CHARM_PAGE_MAX = 10;
export const CHARM_NAME_MAX = 16;
export const COLOR_INFO = { red: { name: 'Đỏ', sub: 'Tấn công', hex: '#ff6a5a' }, blue: { name: 'Xanh', sub: 'Tiện ích', hex: '#5fb6ff' }, gray: { name: 'Xám', sub: 'Phòng thủ', hex: '#b8c0d8' } };

/** Tên trang: bỏ khoảng trắng hai đầu, bỏ ký tự <>&", tối đa CHARM_NAME_MAX; rỗng thì 'Bảng bùa'. */
export const cleanName = (raw) => String(raw ?? '').replace(/[<>&"]/g, '').trim().slice(0, CHARM_NAME_MAX).trim() || 'Bảng bùa';
/** Trang hợp lệ từ dữ liệu bất kỳ: không phải object → null; mỗi màu đúng 5 ô, ô sai màu / id lạ → null (ô trống). */
export function sanitizePage(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = { name: cleanName(raw.name) };
  for (const c of CHARM_COLORS) {
    const src = Array.isArray(raw[c]) ? raw[c] : [];
    out[c] = Array.from({ length: CHARM_SLOTS }, (_, i) => (typeof src[i] === 'string' && CHARMS[src[i]]?.color === c ? src[i] : null));
  }
  return out;
}
/** Cấp trang = số ô đã gắn bùa (0..15). */
export const pageLevel = (page) => (page ? CHARM_COLORS.reduce((n, c) => n + (page[c] || []).filter((id) => id && CHARMS[id]).length, 0) : 0);

/** Cộng dồn chỉ số của một trang bùa (bỏ qua ô trống / id lạ). */
export function pageStats(page) {
  const sum = {};
  for (const id of [...(page.red || []), ...(page.blue || []), ...(page.gray || [])]) { const ch = id && CHARMS[id]; if (ch) for (const [k, v] of Object.entries(ch.stats)) sum[k] = (sum[k] || 0) + v; }
  return sum;
}
