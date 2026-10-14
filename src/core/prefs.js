// Cài đặt người chơi cho bảng Cài đặt kiểu Liên Quân (ui/settingsModal.js): điều khiển, giao diện, thiết lập chung, âm thanh, dữ liệu.
// Lưu trong máy (localStorage 'la.prefs'); cài đặt đồ hoạ để riêng ở render/quality.js ('la.gfx').
// Đọc: prefs().aimSens hoặc pref('aimSens'). Đổi: setPref(k, v) → lưu ngay + gọi mọi hàm đã đăng ký bằng onPref (áp dụng tức thì trong trận).
// Giá trị đọc từ máy sai kiểu / ngoài danh sách lựa chọn / ngoài khoảng → về mặc định (không để cài đặt hỏng làm hỏng trận).
const KEY = 'la.prefs';

export const PREF_DEFAULTS = Object.freeze({
  // —— Điều khiển ——
  preciseAtk: false,   // Đánh thường chính xác: kéo nút Đánh về phía một địch để chọn đúng mục tiêu đó
  aimSens: 0.5,        // Độ nhạy xoay chiêu 0 (chậm: kéo xa mới hết tầm) … 1 (cao: kéo ngắn đã hết tầm); 0,5 = như cũ
  camMode: 'slide',    // Camera: 'off' chỉ bản đồ nhỏ | 'hold' giữ-kéo nút mắt | 'slide' nút mắt + vuốt vùng trống nửa phải màn hình
  camSpeed: 0.5,       // Tốc độ camera khi kéo nhìn 0..1
  atkMode: 'farm',     // Chế độ công chỉ định: 'auto' một nút Đánh | 'farm' thêm nút Ăn lính + Đẩy trụ | 'manual' chạm vào địch để chọn mục tiêu
  targetBy: 'pct',     // Lựa chọn mục tiêu (ưu tiên tướng địch trong tầm): 'pct' % máu thấp nhất | 'hp' máu thấp nhất | 'near' gần nhất
  flashDir: 'move',    // Hướng tốc biến mặc định (chạm nhanh Chớp Bước): 'move' hướng chạy | 'skill' hướng chiêu vừa ngắm | 'enemy' về phía địch gần nhất
  targetMark: false,   // Hiển thị mục tiêu chỉ định: dấu trên mục tiêu đang đánh
  castMode: 'aim',     // Phương pháp tung chiêu: 'aim' hỗ trợ xoay chiêu (kéo để ngắm, chạm nhanh tự ngắm) | 'auto' tung chiêu tự nhắm (chạm là ra)
  aimAt: 'button',     // Vị trí xoay chiêu: 'button' vòng ngắm quanh nút | 'finger' vòng ngắm đặt tại chỗ ngón chạm
  cancelBy: 'zone',    // Huỷ chiêu: 'zone' kéo vào ô X | 'distance' kéo ngón ra quá xa vòng ngắm
  stick: 'follow',     // Lệnh di chuyển (cần điều khiển): 'follow' cần dời tới chỗ chạm | 'fixed' cần cố định ở góc
  camAim: false,       // Góc quay theo định vị: camera lệch dần về chỗ đang ngắm chiêu tầm xa
  // —— Giao diện ——
  shop: 'left',        // Vị trí cửa hàng: 'left' dưới bản đồ nhỏ | 'right'
  recommend: true,     // Đồ đề cử cạnh nút cửa hàng
  itemDesc: true,      // Mô tả trang bị trong cửa hàng
  targetInfo: false,   // Thông số mục tiêu (khung máu / chỉ số mục tiêu đang đánh)
  camFrame: true,      // Khung camera trên bản đồ nhỏ
  cdDecimal: true,     // Thời gian hồi số thập phân (dưới 10 giây)
  ultSplash: false,    // Hiển thị ảnh tướng khi tung chiêu cuối
  edgeFoes: true,      // Vị trí tướng địch ở rìa màn hình
  skillTips: true,     // Miêu tả chiêu trong trận (giữ nút chiêu để xem)
  skillNames: false,   // Miêu tả nút chiêu (tên chiêu dưới nút)
  // —— Thiết lập ——
  camDist: 'far',      // Góc camera: 'near' gần | 'far' xa
  bright: 3,           // Độ sáng 1..5 (3 = đề cử)
  killFx: true,        // Dùng hiệu ứng thông báo (bảng hạ gục giữa màn hình)
  fogFx: true,         // Hiệu ứng sương mù (vùng chưa có tầm nhìn tối đi)
  // —— Âm thanh ——
  music: true, musicVol: 0.6,   // Nhạc nền (sảnh)
  sfx: true, sfxVol: 0.85,      // Hiệu ứng âm thanh
  announcer: true,              // Tiếng thông báo trong trận (hạ gục, chuỗi, trụ…)
  // —— Dữ liệu ——
  saveData: false,     // Tiết kiệm dữ liệu: không tải trước model mọi tướng khi đang ở sảnh
});
/** Các mục có danh sách lựa chọn cố định. */
export const PREF_CHOICES = Object.freeze({
  camMode: ['off', 'hold', 'slide'], atkMode: ['auto', 'farm', 'manual'], targetBy: ['pct', 'hp', 'near'], flashDir: ['move', 'skill', 'enemy'],
  castMode: ['aim', 'auto'], aimAt: ['button', 'finger'], cancelBy: ['zone', 'distance'], stick: ['follow', 'fixed'], shop: ['left', 'right'], camDist: ['near', 'far'],
});
/** Các mục số: [nhỏ nhất, lớn nhất, bước]. */
export const PREF_RANGES = Object.freeze({ aimSens: [0, 1, 0], camSpeed: [0, 1, 0], bright: [1, 5, 1], musicVol: [0, 1, 0], sfxVol: [0, 1, 0] });

let cur = null;
const subs = new Set();
const read = (k) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; } };
function valid(k, v) {
  const d = PREF_DEFAULTS[k];
  if (typeof v !== typeof d) return false;
  if (PREF_CHOICES[k]) return PREF_CHOICES[k].includes(v);
  if (PREF_RANGES[k]) { const [a, b, s] = PREF_RANGES[k]; return Number.isFinite(v) && v >= a && v <= b && (!s || Number.isInteger((v - a) / s)); }
  return true;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (_) { /* chế độ riêng tư: chỉ áp dụng phiên này */ } }

/** Cài đặt hiện tại (đọc từ máy một lần). Vị trí cửa hàng cũ ('la.hud') được chuyển sang. */
export function prefs() {
  if (cur) return cur;
  const old = read('la.hud'), saved = { ...(old.shop ? { shop: old.shop } : {}), ...read(KEY) };
  cur = { ...PREF_DEFAULTS };
  for (const k of Object.keys(PREF_DEFAULTS)) if (k in saved && valid(k, saved[k])) cur[k] = saved[k];
  return cur;
}
export const pref = (k) => prefs()[k];
/** Đổi một mục (giá trị không hợp lệ thì bỏ qua): lưu + báo các hàm onPref. */
export function setPref(k, v) {
  const p = prefs(); if (!(k in PREF_DEFAULTS) || !valid(k, v) || p[k] === v) return;
  p[k] = v; save();
  for (const fn of [...subs]) { try { fn(k, v, p); } catch (e) { console.warn(e); } }
}
/** Nghe thay đổi cài đặt: fn(khoá, giá trị, toàn bộ). Trả về hàm huỷ đăng ký. */
export function onPref(fn) { subs.add(fn); return () => subs.delete(fn); }
/** Đưa các mục về mặc định. */
export function resetPrefs(keys = Object.keys(PREF_DEFAULTS)) { for (const k of keys) setPref(k, PREF_DEFAULTS[k]); }
