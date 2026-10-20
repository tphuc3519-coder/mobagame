// Phù hiệu (05 §9): mỗi tướng chọn 1 phù hiệu chính (cơ chế riêng, sim/emblems.js đọc theo `kind`) + 1 nét phụ ở mỗi hàng
// (hàng 0 'Thân', hàng 1 'Tâm'; nét phụ chỉ cộng chỉ số, trừ Săn Mồi có `kind`). Lưu theo tướng trong hồ sơ, mở hết (chưa có tiền mở khoá).
// Thời gian tính bằng giây; bán kính cm. Tên tự đặt.
export const KEYSTONES = {
  tam_hoa: { name: 'Tam Hoả', kind: 'triHit', hits: 3, window: 3, gap: 0.1, cd: 10, base: 40, perLevel: 12, adBonus: 0.25, ap: 0.2,
    short: '3 đòn trúng một tướng địch trong 3s: nổ thêm sát thương',
    desc: 'Đánh trúng cùng một tướng địch 3 lần riêng biệt (đánh thường hoặc kỹ năng) trong 3 giây: gây thêm 40 (+12 mỗi cấp, +25% Công cộng thêm, +20% Phép) sát thương — vật lý nếu Công cộng thêm ≥ Phép, không thì phép. Hồi 10 giây.' },
  song_don: { name: 'Sóng Dồn', kind: 'ramp', max: 5, asPer: 0.05, atkPctMax: 0.08, duration: 4,
    short: 'Đánh thường dồn tốc đánh, đủ 5 tầng thêm Công',
    desc: 'Mỗi đòn đánh thường trúng tướng địch hoặc quái: +5% tốc đánh (tối đa 5 tầng, giữ 4 giây). Đủ 5 tầng: thêm 8% Công.' },
  mai_rua: { name: 'Mai Rùa', kind: 'guard', below: 0.55, base: 60, hpPct: 0.07, duration: 3, cd: 22,
    short: 'Máu dưới 55% bị tướng đánh: nhận khiên',
    desc: 'Khi máu dưới 55% và bị tướng địch gây sát thương: nhận khiên 60 (+7% HP tối đa) trong 3 giây. Hồi 22 giây.' },
  den_ho_menh: { name: 'Đèn Hộ Mệnh', kind: 'ward', radius: 700, base: 45, perLevel: 9, ap: 0.15, duration: 2.5, cd: 8,
    short: 'Kỹ năng trúng tướng địch: khiên cho đồng minh yếu nhất',
    desc: 'Kỹ năng gây sát thương lên tướng địch: tướng phe mình ít máu nhất (theo %) trong 700 quanh bạn — kể cả bạn — nhận khiên 45 (+9 mỗi cấp, +15% Phép) trong 2,5 giây. Hồi 8 giây.' },
};
export const KEYSTONE_LIST = ['tam_hoa', 'song_don', 'mai_rua', 'den_ho_menh'];
export const MINOR_ROWS = [{ id: 'than', name: 'Thân' }, { id: 'tam', name: 'Tâm' }];
export const MINORS = {
  m_da_day: { name: 'Da Dày', row: 0, stats: { armor: 6, mr: 6 }, desc: '+6 Giáp, +6 Kháng phép' },
  m_suoi_nguon: { name: 'Suối Nguồn', row: 0, stats: { maxHp: 60, regenHp: 2.4 }, desc: '+60 HP, hồi thêm 2,4 HP mỗi giây' },
  m_kien_cuong: { name: 'Kiên Cường', row: 0, stats: { tenacity: 0.08 }, desc: '+8% Kháng hiệu ứng' },
  m_tinh_tao: { name: 'Tỉnh Táo', row: 1, stats: { cdr: 0.05 }, desc: '+5% Giảm hồi chiêu' },
  m_buoc_nhe: { name: 'Bước Nhẹ', row: 1, stats: { moveSpeedPct: 0.04 }, desc: '+4% Tốc chạy' },
  m_san_moi: { name: 'Săn Mồi', row: 1, kind: 'executeAmp', below: 0.4, pct: 0.06, desc: '+6% sát thương lên tướng địch dưới 40% máu' },
};
export const MINOR_LIST_BY_ROW = [['m_da_day', 'm_suoi_nguon', 'm_kien_cuong'], ['m_tinh_tao', 'm_buoc_nhe', 'm_san_moi']];
/** Phù hiệu mặc định theo vai chính (HEROES[id].roles[0]). */
export const EMBLEM_BY_ROLE = {
  marksman: { key: 'song_don', minors: ['m_suoi_nguon', 'm_buoc_nhe'] },
  assassin: { key: 'tam_hoa', minors: ['m_da_day', 'm_san_moi'] },
  mage: { key: 'tam_hoa', minors: ['m_suoi_nguon', 'm_tinh_tao'] },
  tank: { key: 'mai_rua', minors: ['m_da_day', 'm_tinh_tao'] },
  fighter: { key: 'song_don', minors: ['m_kien_cuong', 'm_san_moi'] },
  support: { key: 'den_ho_menh', minors: ['m_kien_cuong', 'm_tinh_tao'] },
};

/** Phù hiệu hợp lệ từ dữ liệu bất kỳ: phù hiệu chính lạ → mặc định theo vai; nét phụ hàng i chỉ giữ khi đúng hàng, không thì mặc định
 *  của hàng đó. Vai lạ → mặc định Đấu sĩ. Luôn trả bản sao mới. */
export function sanitizeEmblem(raw, role) {
  const def = EMBLEM_BY_ROLE[role] || EMBLEM_BY_ROLE.fighter, r = raw && typeof raw === 'object' ? raw : {};
  const key = typeof r.key === 'string' && KEYSTONES[r.key] ? r.key : def.key;
  const mins = Array.isArray(r.minors) ? r.minors : [];
  return { key, minors: [0, 1].map((i) => (typeof mins[i] === 'string' && MINORS[mins[i]]?.row === i ? mins[i] : def.minors[i])) };
}
/** Tổng chỉ số của các nét phụ (nét có `kind` không cộng chỉ số). */
export function emblemStats(em) {
  const sum = {};
  for (const id of em?.minors || []) for (const [k, v] of Object.entries(MINORS[id]?.stats || {})) sum[k] = (sum[k] || 0) + v;
  return sum;
}
