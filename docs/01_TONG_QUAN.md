# 01 — Tổng quan

## 1. Tầm nhìn
MOBA mobile **3D** (Three.js, chạy trên trình duyệt điện thoại), màn hình ngang, camera nhìn chéo từ trên xuống. Trận 5v5 dài 12–18 phút, điều khiển joystick + nút kỹ năng kéo để ngắm. Cảm giác nhanh, dễ vào, chiều sâu nằm ở phối hợp đội và kiểm soát mục tiêu lớn.

Thế giới: **Vùng đất Đèn Lồng**, nơi mỗi đêm hội các bộ tộc thi đấu để giữ ngọn Đèn Cả của mình. Pha trộn thần thoại dân gian Việt (rùa đá, trống đồng, thuồng luồng, cây đa, đèn trời) với phiêu lưu kỳ ảo.

## 2. Chế độ chơi

| Chế độ | Bản đồ | Mô tả | Chọn tướng |
|---|---|---|---|
| **Đấu thường 5v5** | Đấu Trường Đèn Cả | Trận chuẩn, không ảnh hưởng hạng | Chọn ẩn (blind pick) |
| **Đấu hạng 5v5** | Đấu Trường Đèn Cả | Tính sao, điểm Hào Quang | Chọn ẩn dưới bậc Hải Đăng; từ Hải Đăng trở lên cấm/chọn |
| **Đấu đơn 1v1** | Cầu Đá Đơn | 1 đường, 6–10 phút | Chọn ẩn |
| **Luyện tập** | Chọn một trong hai bản đồ | Chọn tướng mình + tướng máy, có hình nộm, bật/tắt hồi chiêu, vàng vô hạn | Màn chọn tướng luyện tập (07 §7.1) |

Giai đoạn offline: mọi đối thủ và đồng đội là bot. Giai đoạn online (sau MVP): ghép người thật, bot lấp chỗ trống.

## 3. Phạm vi theo giai đoạn

| Giai đoạn | Nội dung |
|---|---|
| **Alpha (Mốc 1–6)** | Đấu đơn 1v1 hoàn chỉnh với 6 tướng, bot 1v1 |
| **Beta (Mốc 7–11)** | 5v5 đầy đủ: 16 tướng, rừng, mục tiêu lớn, bụi cỏ, sương mù, bot 5v5 |
| **Bản 1.0 (Mốc 12–14)** | Toàn bộ giao diện ngoài trận, xếp hạng, cấm/chọn, phần thưởng, lưu dữ liệu, PWA |
| **Sau 1.0** | Online PvP, trang phục, thêm tướng, bọc Android bằng Capacitor |

Hình ảnh đi song song với code: Alpha dùng model giữ chỗ miễn phí (CC0), Beta–1.0 thay dần bằng model đẹp theo `11_HUONG_DAN_MODEL_3D.md`. Code không phụ thuộc vào việc model đã xong hay chưa.

## 4. Nguyên tắc thiết kế
- Mỗi tướng có **một cơ chế cốt lõi dễ nhận ra** trong 1 câu.
- Kỹ năng đọc được bằng mắt: chỉ báo ngắm rõ, hiệu ứng khác màu theo đội (đội mình viền xanh ngọc, đội địch viền đỏ cam).
- Chơi được bằng một tay trái + một tay phải, không cần thao tác đa ngón phức tạp.
- Bot đủ giỏi để trận offline có ý nghĩa.

## 5. Quy tắc bản quyền (bắt buộc)
- **Được học:** thể loại MOBA, 3 đường, trụ, lính, rừng, vai trò tướng, bố cục giao diện phổ biến (lưới tướng bên trái, hình tướng ở giữa, danh sách đội bên phải), hệ thống sao/bậc hạng nói chung.
- **Không được lấy:** tên tướng, ngoại hình, bộ kỹ năng đặc trưng, tên vật phẩm, tên bậc hạng, tên quái/mục tiêu lớn, icon, logo, font riêng, âm thanh, lời thoại của Liên Quân, Honor of Kings, LMHT hay bất kỳ game nào.
- Mọi asset hình ảnh phải tự làm, thuê làm, hoặc có giấy phép thương mại. Ghi nguồn trong `assets/LICENSES.md`.
