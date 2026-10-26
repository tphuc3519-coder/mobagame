// Lưu dữ liệu người chơi (GĐ4a — 08 §7, Mốc 13): số phiên bản hồ sơ + chuỗi chuyển đổi bản cũ, mã lưu để chuyển sang trình duyệt / máy khác.
// Mã lưu gói ba khoá trong máy: hồ sơ (la.profile), cài đặt (la.prefs), đồ hoạ (la.gfx).
// Định dạng mã: "LA1-" + base64url(UTF-8 JSON { v, t, d: { khoá: giá trị } }) + "-" + FNV-1a 32 bit (8 chữ hex) của phần base64.
// Tổng kiểm chỉ để bắt dán thiếu / dán nhầm, không phải bảo mật. Date.now chỉ dùng ở tầng tiến trình, không đụng mô phỏng (08 §7).
// Không import profile.js (profile.js import file này) — mọi hàm ở đây thuần, kiểm thử được bằng node.

export const SAVE_VER = 2;
export const SAVE_KEYS = ['la.profile', 'la.prefs', 'la.gfx'];
const PREFIX = 'LA1-';

const num = (v, d = 0, min = 0) => (Number.isFinite(v) ? Math.max(min, v) : d);
const int = (v, d = 0, min = 0) => Math.round(num(v, d, min));
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, d = '') => (typeof v === 'string' ? v : d);

/** Bước chuyển đổi: MIGRATE[n](hồ sơ bản n) → hồ sơ bản n + 1. Thêm bước mới thì tăng SAVE_VER. */
const MIGRATE = {
  // bản 1 (chưa có số phiên bản, trước GĐ4): chuẩn hoá kiểu dữ liệu — hồ sơ sửa tay / ghi dở không làm hỏng sảnh
  1(p) {
    for (const k of ['gold', 'gems', 'exp', 'stars', 'best', 'games', 'wins', 'ranked', 'rankedWins', 'kills', 'deaths', 'assists', 'mvp', 'scoreSum', 'courage', 'manh', 'gao', 'chestN', 'chests']) p[k] = int(p[k]);
    p.timed = arr(p.timed).filter((t) => t && typeof t.id === 'string' && Number.isFinite(t.exp)); p.x2Armed = !!p.x2Armed; // GĐ4d
    p.level = int(p.level, 1, 1); p.best = Math.max(p.best, p.stars); p.wins = Math.min(p.wins, p.games); p.rankedWins = Math.min(p.rankedWins, p.ranked);
    p.streak = Number.isFinite(p.streak) ? Math.round(p.streak) : 0;
    p.name = str(p.name, 'Hiệp Sĩ Đèn').slice(0, 24) || 'Hiệp Sĩ Đèn';
    p.history = arr(p.history).filter((h) => h && typeof h === 'object').slice(0, 20);
    p.mail = arr(p.mail).filter((m) => m && typeof m.id === 'string').slice(-12);
    p.charmPages = arr(p.charmPages);
    p.bag = Object.fromEntries(Object.entries(obj(p.bag)).map(([k, v]) => [k, int(v)]).filter(([, v]) => v > 0));
    for (const k of ['heroPage', 'emblems']) p[k] = obj(p[k]);
    for (const k of ['daily', 'weekly', 'event']) p[k] = p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) ? p[k] : null; // nhiệm vụ: ui/profile.js cycle() tự kiểm + dựng lại
    return p;
  },
};

/** Hồ sơ bất kỳ bản nào → bản hiện tại. Bản mới hơn bản game (mở game cũ sau khi đã chơi bản mới) thì giữ nguyên, không xoá trường nào. */
export function migrateProfile(p, ver = p?.version) {
  let v = Number.isInteger(ver) && ver >= 1 ? ver : 1;
  while (v < SAVE_VER) { p = MIGRATE[v](p); v++; }
  p.version = Math.max(v, p.version | 0);
  return p;
}

// —— mã lưu ——
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
function b64e(text) {
  const u8 = new TextEncoder().encode(text); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(b) {
  const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b.length % 4)) % 4));
  const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(u8);
}

/** Dữ liệu các khoá → mã lưu. data: { 'la.profile': {...}, ... } (khoá thiếu thì bỏ qua). */
export function encodeSave(data, t = Date.now()) {
  const d = {}; for (const k of SAVE_KEYS) if (data[k] && typeof data[k] === 'object') d[k] = data[k];
  const body = b64e(JSON.stringify({ v: SAVE_VER, t, d }));
  return PREFIX + body + '-' + fnv(body);
}

/** Mã lưu → { ok: true, v, t, d (hồ sơ đã chuyển sang bản hiện tại) } hoặc { ok: false, err (câu báo cho người chơi) }. */
export function decodeSave(code) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!c) return { ok: false, err: 'Chưa dán mã lưu.' };
  if (!c.startsWith(PREFIX)) return { ok: false, err: 'Đây không phải mã lưu Lantern Arena (mã đúng bắt đầu bằng "LA1-").' };
  const cut = c.lastIndexOf('-');
  const body = c.slice(PREFIX.length, cut), sum = c.slice(cut + 1);
  if (cut <= PREFIX.length || !/^[0-9a-f]{8}$/.test(sum) || !/^[A-Za-z0-9_-]+$/.test(body)) return { ok: false, err: 'Mã lưu bị thiếu hoặc sai ký tự — hãy chép lại toàn bộ mã.' };
  if (fnv(body) !== sum) return { ok: false, err: 'Mã lưu bị thiếu hoặc sai ký tự — hãy chép lại toàn bộ mã.' };
  let o = null; try { o = JSON.parse(b64d(body)); } catch (_) { return { ok: false, err: 'Mã lưu hỏng, không đọc được.' }; }
  if (!o || !Number.isInteger(o.v) || o.v < 1 || !o.d || typeof o.d !== 'object') return { ok: false, err: 'Mã lưu hỏng, không đọc được.' };
  if (o.v > SAVE_VER) return { ok: false, err: 'Mã lưu tạo từ bản game mới hơn. Hãy cập nhật game rồi nhập lại.' };
  const prof = o.d['la.profile'];
  if (!prof || typeof prof !== 'object' || Array.isArray(prof)) return { ok: false, err: 'Mã lưu không có hồ sơ người chơi.' };
  const d = {}; for (const k of SAVE_KEYS) if (o.d[k] && typeof o.d[k] === 'object' && !Array.isArray(o.d[k])) d[k] = o.d[k];
  d['la.profile'] = migrateProfile({ ...prof }, prof.version);
  return { ok: true, v: o.v, t: Number.isFinite(o.t) ? o.t : 0, d };
}
