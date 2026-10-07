// "Người chơi" quanh sảnh: danh sách bạn bè (máy đóng vai, tên gọi kiểu game thủ Việt), trạng thái, hạng; tin nhắn kênh thế giới.
// Chỉ để sảnh có sức sống — mọi đồng đội/đối thủ trong trận vẫn là máy (thẻ trận ghi rõ "[Máy]", bạn được mời thì hiện tên bạn).
import { ALPHA } from '../data/heroes/index.js';
import { rankOf } from './profile.js';

// stars: sao hạng tổng (rankOf → "Đèn Trời III"…)
export const FRIENDS = [
  { id: 'f1', name: 'Mây Chiều', avatar: 'nguyet_ha', stars: 65, status: 'online' },
  { id: 'f2', name: 'Tí Đèn Lồng', avatar: 'long_dang', stars: 31, status: 'online' },
  { id: 'f3', name: 'Sói Bạc 99', avatar: 'bong_tre', stars: 120, status: 'playing', min: 8 },
  { id: 'f4', name: 'Bánh Bao Nhân Thịt', avatar: 'thach_quy', stars: 47, status: 'online' },
  { id: 'f5', name: 'Gió Bấc', avatar: 'canh_dieu', stars: 152, status: 'playing', min: 15 },
  { id: 'f6', name: 'Trà Đá Vỉa Hè', avatar: 'hoa_ren', stars: 13, status: 'online' },
  { id: 'f7', name: 'Dế Mèn Phiêu Lưu', avatar: 'canh_dieu', stars: 23, status: 'offline', ago: '2 giờ' },
  { id: 'f8', name: 'Hoa Sữa', avatar: 'nguyet_ha', stars: 56, status: 'offline', ago: '1 ngày' },
];
for (const f of FRIENDS) f.rank = rankOf(f.stars);
export const statusText = (f) => (f.status === 'online' ? 'Đang trực tuyến' : f.status === 'playing' ? `Đang đấu ${f.min} phút` : `Ngoại tuyến ${f.ago}`);

const WORLD_CHAT = [
  ['Cơm Tấm', 'ai leo Đèn Trời không, thiếu 1 đường Đền'], ['Kẹo Kéo', 'Emberforge dậm búa vào bùa Ấn Hoả là xong game'],
  ['Thỏ Ngọc', 'Moonstream tay to quá trời'], ['Vịt Bầu', 'đi rừng nhớ lấy Trừng Trị nha mấy ông'], ['Nắng Hạ', 'Kitewing bắn xa ghê'],
  ['Ông Ba Mươi', 'Mossback móc là chết, khỏi chạy'], ['Lá Me', 'tối nay leo Hải Đăng 🔥'], ['Phở Bò', 'Lanternward hồi máu cứu cả team'],
];
export const chatLine = (i) => WORLD_CHAT[((i % WORLD_CHAT.length) + WORLD_CHAT.length) % WORLD_CHAT.length];

const TIPS = [
  'Giữ nút kỹ năng rồi kéo để ngắm; kéo vào ô X để huỷ chiêu.',
  'Hạ Trùm Rừng giúp cả đội mạnh lên — nhớ mang Trừng Trị khi đi rừng.',
  'Mỗi lần lên cấp, chạm dấu + trên nút kỹ năng để cộng điểm.',
  'Về thành (Biến về) để hồi đầy máu và mua trang bị.',
  'Đánh lính cuối cùng (kết liễu) để nhận nhiều vàng hơn.',
  'Đứng trong bụi cỏ để ẩn mình khỏi tầm nhìn của địch.',
  'Đẩy trụ khi có lính đi trước đỡ đòn cho bạn.',
  'Chớp Bước có thể huỷ: kéo vào ô X trước khi thả tay.',
];
export const tip = (seed = Math.random()) => TIPS[Math.floor(seed * TIPS.length) % TIPS.length];

/** Nhãn sau tên mọi người chơi do máy điều khiển (kể cả bạn bè được mời — họ cũng là máy): "Mây Chiều [Máy]". */
export const botLabel = '[Máy]';

const BOT_NAMES = ['Bánh Mì Pate', 'Sương Sớm', 'Mèo Mướp', 'Gà Rán Giòn', 'Cá Kho Tộ', 'Hạt Tiêu', 'Trăng Khuyết', 'Bão Cát', 'Lục Bình', 'Rêu Phong',
  'Mưa Ngâu', 'Sao Băng', 'Chè Khúc Bạch', 'Cỏ May', 'Đậu Phộng', 'Bắp Nướng', 'Gió Lào', 'Sấm Rền', 'Đom Đóm', 'Diều Giấy', 'Kẹo Dừa', 'Nắng Mai',
  'Tre Xanh', 'Cáo Lửa', 'Sói Đêm', 'Ốc Len', 'Bún Chả', 'Trà Sữa Trân Châu', 'Hoa Gạo', 'Vịt Quay', 'Sen Hồng', 'Phượng Vĩ', 'Khói Lam', 'Quạ Đen',
  'Cú Mèo', 'Rồng Con', 'Thỏ Bông', 'Mít Tố Nữ', 'Hến Xúc Bánh Đa', 'Lá Chanh'];
/** n tên máy khác nhau, không trùng `used`. */
export function botNames(n, rnd = Math.random, used = []) {
  const pool = BOT_NAMES.filter((x) => !used.includes(x)), out = [];
  while (out.length < n) out.push(pool.length ? pool.splice(Math.floor(rnd() * pool.length), 1)[0] : 'Máy ' + (out.length + 1));
  return out;
}
/** Sao hạng của máy quanh hạng người chơi (lệch tối đa ~±6 sao). */
export const nearStars = (stars, rnd = Math.random) => Math.max(0, Math.round(stars + (rnd() - 0.5) * 12));

/** Chọn n tướng khác nhau cho một đội (bỏ `taken`), ngẫu nhiên. */
export function pickHeroes(n, taken = [], rnd = Math.random) {
  const pool = ALPHA.filter((h) => !taken.includes(h)), out = [];
  while (out.length < n) { if (!pool.length) pool.push(...ALPHA.filter((h) => !out.includes(h))); out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); }
  return out;
}
