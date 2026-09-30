// Bảng bùa (05 §7): 3 màu × 5 ô. Mỗi viên cộng chỉ số phẳng theo bảng; UI chỉnh bùa làm sau, hiện dùng trang mặc định.
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

/** Cộng dồn chỉ số của một trang bùa. */
export function pageStats(page) {
  const sum = {};
  for (const id of [...page.red, ...page.blue, ...page.gray]) for (const [k, v] of Object.entries(CHARMS[id].stats)) sum[k] = (sum[k] || 0) + v;
  return sum;
}
