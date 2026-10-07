// "Người chơi" quanh sảnh: danh sách bạn bè (máy đóng vai, tên gọi kiểu game thủ Việt), trạng thái, hạng; tin nhắn kênh thế giới.
// Chỉ để sảnh có sức sống — mọi đồng đội/đối thủ trong trận vẫn là máy (thẻ trận ghi rõ "[Máy]", bạn được mời thì hiện tên bạn).
import { ALPHA } from '../data/heroes/index.js';

export const FRIENDS = [
  { id: 'f1', name: 'Mây Chiều', avatar: 'nguyet_ha', rank: 'Kim Cương III', status: 'online' },
  { id: 'f2', name: 'Tí Đèn Lồng', avatar: 'long_dang', rank: 'Vàng I', status: 'online' },
  { id: 'f3', name: 'Sói Bạc 99', avatar: 'bong_tre', rank: 'Tinh Anh V', status: 'playing', min: 8 },
  { id: 'f4', name: 'Bánh Bao Nhân Thịt', avatar: 'thach_quy', rank: 'Bạch Kim II', status: 'online' },
  { id: 'f5', name: 'Gió Bấc', avatar: 'canh_dieu', rank: 'Cao Thủ', status: 'playing', min: 15 },
  { id: 'f6', name: 'Trà Đá Vỉa Hè', avatar: 'hoa_ren', rank: 'Bạc II', status: 'online' },
  { id: 'f7', name: 'Dế Mèn Phiêu Lưu', avatar: 'canh_dieu', rank: 'Vàng III', status: 'offline', ago: '2 giờ' },
  { id: 'f8', name: 'Hoa Sữa', avatar: 'nguyet_ha', rank: 'Kim Cương V', status: 'offline', ago: '1 ngày' },
];
export const statusText = (f) => (f.status === 'online' ? 'Đang trực tuyến' : f.status === 'playing' ? `Đang đấu ${f.min} phút` : `Ngoại tuyến ${f.ago}`);

const WORLD_CHAT = [
  ['Cơm Tấm', 'ai leo hạng Vàng không, thiếu 1 đường Đền'], ['Kẹo Kéo', 'Emberforge dậm búa vào bùa Ấn Hoả là xong game'],
  ['Thỏ Ngọc', 'Moonstream tay to quá trời'], ['Vịt Bầu', 'đi rừng nhớ lấy Trừng Trị nha mấy ông'], ['Nắng Hạ', 'Kitewing bắn xa ghê'],
  ['Ông Ba Mươi', 'Mossback móc là chết, khỏi chạy'], ['Lá Me', 'tối nay leo Kim Cương 🔥'], ['Phở Bò', 'Lanternward hồi máu cứu cả team'],
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

/** Tên hiển thị cho máy trong trận: "<Tên tướng> [Máy]" như Liên Quân. */
export const botLabel = '[Máy]';

/** Chọn n tướng khác nhau cho một đội (bỏ `taken`), ngẫu nhiên. */
export function pickHeroes(n, taken = [], rnd = Math.random) {
  const pool = ALPHA.filter((h) => !taken.includes(h)), out = [];
  while (out.length < n) { if (!pool.length) pool.push(...ALPHA.filter((h) => !out.includes(h))); out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); }
  return out;
}
