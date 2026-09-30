# Tiến độ dự án (cập nhật mỗi lần commit)

Nguồn plan: bộ spec 3D trong `docs/` (bản 3D thay thế bản 2D cũ). Lộ trình chi tiết: `10_LO_TRINH.md`.

## Tổng quan mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| — | Chép bộ spec 3D vào repo, vendor Three.js r186 (`lib/three/`) | ✅ Xong |
| Đường hình ảnh | Model 3D 16 tướng (tạo bằng code, `tools/modelgen/`) | 🚧 Đang làm |
| 1 | Khung 3D, vòng lặp, điều khiển, `tools/model-check.html` | ⬜ Chưa |
| 2 | Chiến đấu và kỹ năng | ⬜ Chưa |
| 3 | Bản đồ 1v1 hoàn chỉnh | ⬜ Chưa |
| 4 | Kinh tế, đồ, phép, bùa | ⬜ Chưa |
| 5 | Bot 1v1, màn chọn tướng luyện tập | ⬜ Chưa |
| 6 | Hoàn thiện Alpha | ⬜ Chưa |
| 7–11 | Beta 5v5 | ⬜ Chưa |
| 12–14 | Bản 1.0 | ⬜ Chưa |

## Model 3D tướng (`assets/heroes/<id>/<id>.glb`)

Xem bảng chi tiết ở cuối file khi có model. Model được sinh bằng script (`node tools/modelgen/build.mjs`), không phải tác phẩm thủ công của hoạ sĩ; dùng làm bản chính thức tạm, thay bằng model hoạ sĩ khi có (chỉ cần đè file cùng tên).

## Nhật ký
- 2026-09-30: nhập spec 3D + hướng dẫn model; vendor Three.js r186.
