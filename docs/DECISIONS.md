# Quyết định

- 2026-09-30 (Mốc 1): thay file thử `assets/test/test_character.glb` bằng chính model Hoả Rèn do `tools/modelgen` sinh (`assets/heroes/hoa_ren/`), vì đã có sẵn clip Idle/Run đúng chuẩn. Không cần tải bộ CC0.
- 2026-09-30 (Mốc 1): giới hạn FPS vẽ bằng cách bỏ khung hình (30 ở mức Thấp), mô phỏng luôn 30Hz cố định.
- 2026-09-30 (Mốc 1): tướng bị giữ trong đường (y 750–1650) và trong bản đồ; tường, bụi, khe nước chưa chặn (Mốc 3).
- 2026-09-30: GLB xuất mét, `hero.art.json.scale = 100` để ra cm trong thế giới.
- 2026-09-30: roster autobattle (nhân vật có bản quyền) không copy nguyên; port **cơ chế** sang 14 tướng gốc theo lựa chọn của chủ dự án. Đối chiếu: Sakura→Hạnh Hoa, Konohamaru→Tiểu Ảnh, ChiChi→Bà Năm Chảo, Tsubasa→Cầu Mây, Shikamaru→Bóng Đèn, Suzune→Thầy Đồ, Ginyu→Kép Chèo, Doraemon→Mèo Thần Tài, Superman→Phù Đổng, Beatrice→Thư Linh, Tanjiro→Kiếm Thuỷ, Gojo→Lưỡng Cực, Isagi→Nhãn Sư, Conan→Trạng Nhí. Không dùng lại tên chiêu, trang phục, biểu tượng đặc trưng gốc.
- 2026-09-30: mỗi tướng chỉ có nội tại + K1/K2/K3 (chiêu cuối gộp vào K3); các chiêu phụ của bản gốc được gộp/bỏ. Hook cơ chế mới ở dạng `params` khai báo, chưa có engine.
- Bản đầu chưa cân bằng; chưa có mặt hàng đồ mới (`recommendedBuild` dùng id giữ chỗ giống 04).
- 2026-09-30 (Mốc 2): 6 tướng Alpha có engine đầy đủ; 14 tướng port và 10 tướng còn lại giữ dạng khai báo. Kỹ năng kiểu `recast`, `tether`, `trap`, `targetedDash`, `line` chưa có handler (chưa cần cho Alpha).
- Hình nộm có 6000 HP, giáp/KP 30, hồi đầy sau 5s không bị đánh; chết thì hồi đầy ngay.
- Đòn đánh chỉ ra đòn khi mục tiêu đã trong tầm (chưa tự đuổi); nút Đánh giữ để đánh liên tục.
- Ba ví dụ tính tay công thức sát thương (đều nằm trong `tools/t_combat.mjs`): Hoả Rèn K1 cấp 1 = (70 + 1.0×68)×100/130 = 106.15; Nguyệt Hà K1 = 80×100/130 = 61.54 phép; Thạch Quy K2 = (50 + 4%×1000)×100/130 = 69.23.
- 2026-09-30 (Mốc 3): trụ 1v1 dùng chỉ số ở 03 §B2 (HP 3200/3800/5000); 'nhà chính' đóng vai trụ nhà nên bất tử tới khi trụ trong vỡ; giáp trụ 80/90/100, không có giáp bảo vệ 4 phút.
- Lính: chưa cho vàng/KN (Mốc 4); model lính là khối đơn giản, mỗi lính vài draw call (chưa InstancedMesh) — 16 lính đồng thời ổn; sẽ instancing khi lên 5v5.
- Tướng bị giữ trong đường, không đi vào khe hở tường (bãi quái ở Mốc 6); lưới đi được đã dựng sẵn từ tường/biên.
- Đợt lính theo 03 §B3: đầu 0:15, mỗi 25s, 3 Kiếm + 1 Cung, mỗi 3 đợt thêm Xe Đá. Lính Đèn Lớn chưa có (cần luật phá trụ nhà 5v5).
