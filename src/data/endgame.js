// Nhịp kết thúc trận (chỉ phần nhìn — mô phỏng không đọc): nhà chính nổ → camera lướt tới nhà chính → nổ + rung → băng-rôn → màn kết quả.
export const END = {
  bannerSec: 3.2, // giây băng-rôn CHIẾN THẮNG / THẤT BẠI trước khi mở màn kết quả (vòng vẽ dừng sau đó)
  panSec: 0.9, // giây camera lướt từ chỗ đang nhìn tới nhà chính vừa vỡ (êm đầu êm cuối, không phụ thuộc FPS)
  liftZ: 480, // camera nhìn lệch xuống dưới nhà chính một đoạn: nhà chính nằm nửa trên màn, không bị dải băng-rôn giữa màn che
  camDist: 1900, // khoảng cách camera lúc xem nổ (gần hơn 2400 lúc chơi)
  blastAt: 0.75, // giây sau khi bắt đầu lướt thì nổ (gần tới nơi)
  shake: 34, shakeSec: 0.7, // rung màn khi nổ: biên độ (đơn vị thế giới), giây
  reloadEvery: 12, // sau 12 trận trong một lần mở trang thì "Đấu lại" tải lại trang (phòng rò bộ nhớ chưa biết)
};
