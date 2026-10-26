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
/** Còn lại của mùa hiện tại, dạng "12 ngày 4 giờ" / "5 giờ 20 phút". */
export function seasonLeft(now = Date.now()) {
  const ms = Math.max(0, seasonAt(now).end - now), d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d} ngày ${h} giờ` : `${h} giờ ${m} phút`;
}
