# Tiến độ dự án (cập nhật mỗi lần commit)

Nguồn plan: bộ spec 3D trong `docs/` (bản 3D thay thế bản 2D cũ). Lộ trình chi tiết: `10_LO_TRINH.md`.

## Tổng quan mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| — | Chép bộ spec 3D vào repo, vendor Three.js r186 (`lib/three/`) | ✅ Xong |
| Đường hình ảnh | Model 3D 30 tướng (16 gốc + 14 port cơ chế từ autobattle) (tạo bằng code, `tools/modelgen/`) | ✅ Bản đầu xong, đạt ngân sách; còn tinh chỉnh |
| 1 (phần công cụ) | `tools/model-check.html` (trang kiểm tra model theo 11 §8.2) | ✅ Xong |
| 1 | Khung 3D, vòng lặp 30Hz, joystick/WASD, bản đồ 1v1 trống, nạp model + Idle/Run, `?debug=1` | 🚧 Code xong, đã chạy thử bằng trình duyệt headless; **chờ bạn thử trên điện thoại** |
| 2 | Chiến đấu và kỹ năng (6 tướng Alpha, hình nộm, HUD nút, chỉ báo ngắm) | 🚧 Code xong, `tools/t_combat.mjs` đạt; **chờ bạn thử trên điện thoại** |
| 3 | Bản đồ 1v1 hoàn chỉnh | ⬜ Chưa |
| 4 | Kinh tế, đồ, phép, bùa | ⬜ Chưa |
| 5 | Bot 1v1, màn chọn tướng luyện tập | ⬜ Chưa |
| 6 | Hoàn thiện Alpha | ⬜ Chưa |
| 7–11 | Beta 5v5 | ⬜ Chưa |
| 12–14 | Bản 1.0 | ⬜ Chưa |

## Model 3D tướng (`assets/heroes/<id>/<id>.glb`)

Sinh bằng script `tools/modelgen` (`node build.mjs`), **không phải tác phẩm thủ công của hoạ sĩ**: hình khối nguyên thuỷ
tô màu theo đỉnh, phong cách "đồ chơi cách điệu". Đủ để chạy game, nhận diện từng tướng từ camera trận và làm Mốc 1–6;
khi có model hoạ sĩ thì chỉ cần đè file cùng tên. Cả 16 file qua Khronos glTF-Validator (0 lỗi, 0 cảnh báo), đủ 11 clip
(Idle, Run, Attack1/2, Cast1/2, Ult, Death, Recall, Victory, Showcase), nhìn về +Z, đơn vị mét.

| id | Tướng | Tam giác | Xương | KB | Vật liệu | runRefSpeed |
|---|---|---|---|---|---|---|
| thach_quy | Thạch Quy | 13048 | 35 | 1132 | 2 | 310 |
| trau_dong | Trâu Đồng | 10736 | 20 | 691 | 1 | 315 |
| co_thu | Cổ Thụ | 9550 | 44 | 1083 | 2 | 305 |
| hoa_ren | Hoả Rèn | 6630 | 24 | 557 | 2 | 320 |
| kiem_may | Kiếm Mây | 7606 | 32 | 701 | 2 | 330 |
| soi_nui | Sói Núi | 6064 | 24 | 529 | 2 | 335 |
| bong_tre | Bóng Tre | 6164 | 26 | 573 | 2 | 345 |
| doi_dem | Dơi Đêm | 6626 | 26 | 591 | 2 | 340 |
| nguyet_ha | Nguyệt Hà | 8698 | 30 | 708 | 2 | 315 |
| sam_trong | Sấm Trống | 7940 | 22 | 689 | 2 | 315 |
| hoa_doc | Hoa Độc | 10006 | 23 | 838 | 2 | 315 |
| canh_dieu | Cánh Diều | 6810 | 25 | 574 | 2 | 325 |
| phao_hoa | Pháo Hoa | 7860 | 22 | 572 | 2 | 320 |
| trang_no | Trạng Nỏ | 7872 | 27 | 654 | 2 | 315 |
| long_dang | Lồng Đăng | 7516 | 26 | 607 | 2 | 315 |
| moc_cam | Mộc Cầm | 7704 | 23 | 604 | 2 | 315 |

Ảnh xem trước: `docs/previews/heroes_1-8.png`, `docs/previews/heroes_9-16.png`.

**Chưa làm / còn hạn chế**
- Chưa có `_showcase.glb` (LOD0), splash/portrait/icon kỹ năng, texture (màu chỉ ở đỉnh, chưa có normal/ORM).
- Chưa có lính, quái, trụ, nhà chính, mục tiêu lớn (Mốc 3, 8).
- Animation là nội suy bằng code: `hitTime`, `runRefSpeed` đã đặt nhưng **chưa chỉnh khớp trong game thật**; chân có thể trượt nhẹ.
- Váy/áo choàng dài xuyên chân khi chạy ở vài tướng (Nguyệt Hà, Mộc Cầm, Dơi Đêm); chưa nén meshopt.
- Chưa thử trên điện thoại thật; ảnh xem trước chụp bằng Chromium headless.

## Nhật ký
- 2026-09-30: nhập spec 3D + hướng dẫn model; vendor Three.js r186.
- 2026-09-30: `tools/modelgen` + 16 model GLB + `tools/model-check.html`, `tools/model-sheet.html`.
- 2026-09-30: Mốc 1 code: `index.html`, `src/{core,sim,render,hud,data}`; chạy `python3 -m http.server 8080` rồi mở `/index.html?debug=1`.
- 2026-09-30: port 14 đấu thủ autobattle thành tướng gốc (đổi tên/ngoại hình theo dân gian Việt): data `src/data/heroes/*.js` (bộ kỹ năng, hook dạng khai báo), model 3D `tools/modelgen/heroes/*.mjs`, mục 8 trong `docs/04_TUONG.md`.
- 2026-09-30: Mốc 2: `src/sim/{stats,status,damage,combat,skills,projectiles,ctx,targeting}.js`, HUD nút kéo ngắm `src/hud/skillButtons.js`, `render/{materials,fx,indicators,project}.js`, màn thử 3 hình nộm (`/index.html?hero=<id>`). Kiểm thử: `node tools/t_combat.mjs`.
