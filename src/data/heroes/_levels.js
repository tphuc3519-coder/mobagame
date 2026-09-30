/** Giá trị theo cấp: mảng thì lấy phần tử (cấp-1), số thì giữ nguyên. */
export const lv = (v, level) => (Array.isArray(v) ? v[Math.min(v.length, Math.max(1, level)) - 1] : v);
