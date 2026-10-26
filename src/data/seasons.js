// Mùa giải (08 §4): mùa dài 120 ngày tính theo đồng hồ thiết bị (offline), tên "S{n} {năm}". Chỉ dùng ở tầng tiến trình / giao diện,
// không dùng trong mô phỏng trận (08 §7). Mùa 1 bắt đầu 01/10/2026 00:00 giờ thiết bị.
export const SEASON = { days: 120, epoch: [2026, 9, 1] }; // [năm, tháng (0 = tháng 1), ngày]

const DAY = 86400000;
const epochMs = () => new Date(SEASON.epoch[0], SEASON.epoch[1], SEASON.epoch[2]).getTime();

/** Mùa chứa thời điểm `now` (ms): { n, name, start, end } — end là lúc mùa sau bắt đầu. Trước mùa 1 thì coi là mùa 1. */
export function seasonAt(now = Date.now()) {
  const len = SEASON.days * DAY, e = epochMs(), n = Math.max(1, Math.floor((now - e) / len) + 1);
  const start = e + (n - 1) * len, end = start + len;
  return { n, name: `S${n} ${new Date(start).getFullYear()}`, start, end };
}
/** Mùa số n: { n, name, start, end }. */
export function seasonByN(n) { const len = SEASON.days * DAY, start = epochMs() + (Math.max(1, n) - 1) * len; return { n: Math.max(1, n), name: `S${Math.max(1, n)} ${new Date(start).getFullYear()}`, start, end: start + len }; }
/** Còn lại của mùa hiện tại, dạng "12 ngày 4 giờ" / "5 giờ 20 phút". */
export function seasonLeft(now = Date.now()) {
  const ms = Math.max(0, seasonAt(now).end - now), d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d} ngày ${h} giờ` : `${h} giờ ${m} phút`;
}

// —— Hết mùa (08 §4): thưởng theo bậc CAO NHẤT trong mùa, rồi reset mềm theo bậc CUỐI mùa ——
// Chỉ số bậc theo data/ranks.js: 0 Đèn Dầu · 1 Đèn Lồng · 2 Đèn Kéo Quân · 3 Đèn Trời · 4 Hải Đăng · 5 Sao Mai · 6 Nguyệt Quang · 7 Thái Dương.
/** Bậc cuối mùa → [bậc mùa sau, phân hạng] (null: giữ nguyên). */
export const SOFT_RESET = [null, null, null, [2, 'I'], [3, 'III'], [4, 'V'], [5, 'V'], [5, 'V']];
/** Thưởng hết mùa theo bậc cao nhất đạt được trong mùa; ô cuối (chỉ số 8) là Thiên Hà — đã lọt top 50 bảng Hào Quang lúc nào đó trong mùa. */
export const SEASON_END = [
  { gold: 200 }, { gold: 400 }, { gold: 600 }, { gold: 800, manh: 5 },
  { gold: 1200, manh: 10, frame: 'hai_dang' }, { gold: 1600, manh: 15, frame: 'sao_mai' }, { gold: 2000, gems: 50, frame: 'nguyet_quang' }, { gold: 2500, gems: 100, frame: 'thai_duong' },
  { gold: 3000, gems: 150, frame: 'thien_ha' },
];
/** Hành trình đỉnh cao: quà mở theo bậc cao nhất trong mùa, nhận một lần mỗi mùa. */
export const JOURNEY = [
  { tier: 2, gold: 300 },
  { tier: 3, gold: 500 },
  { tier: 4, frame: 'hanh_trinh' },
  { tier: 5, item: 'the_x2_sao', manh: 10 },
  { tier: 6, gems: 100 },
];
/** 3 vòng tướng thành thạo (dưới huy hiệu): mỗi vòng = một tướng thắng đủ `wins` trận hạng trong mùa; đủ `heroes` vòng → khung. */
export const MASTERY = { wins: 5, heroes: 3, frame: 'thanh_thao' };
/** Trang phục mùa: thắng `wins` trận hạng trong mùa → phối màu riêng cho tướng đã chọn (mỗi mùa một màu). */
export const SEASON_SKIN = { wins: 10, looks: [
  { name: 'Hoàng Kim', tint: '#ffd98a' }, { name: 'Băng Nguyệt', tint: '#b8d4ff' }, { name: 'Anh Đào', tint: '#ffbcd2' }, { name: 'Ngọc Bích', tint: '#b4f0cf' },
] };
export const skinLook = (season) => SEASON_SKIN.looks[(Math.max(1, season) - 1) % SEASON_SKIN.looks.length];
/** 4 model cao cấp do chủ dự án gửi: không đổi màu, không áp trang phục (docs/README.md quy tắc 11). */
export const SKIN_LOCKED = ['hoa_ren', 'thach_quy', 'bong_tre', 'nguyet_ha'];
/** Khung ảnh đại diện (màu viền). */
export const FRAMES = {
  hai_dang: { name: 'Khung Hải Đăng', col: '#7fe6d6' }, sao_mai: { name: 'Khung Sao Mai', col: '#ffd36a' }, nguyet_quang: { name: 'Khung Nguyệt Quang', col: '#d8d0ff' },
  thai_duong: { name: 'Khung Thái Dương', col: '#ff9a3a' }, hanh_trinh: { name: 'Khung Hành Trình', col: '#8fd0ff' }, thanh_thao: { name: 'Khung Thành Thạo', col: '#7dffa8' },
  hao_quang: { name: 'Khung Hào Quang Chói Sáng', col: '#fff1b0' },
  thien_ha: { name: 'Khung Thiên Hà', col: '#b88aff' },
};
