# Quyết định

- 2026-09-30 (Mốc 1): thay file thử `assets/test/test_character.glb` bằng chính model Hoả Rèn do `tools/modelgen` sinh (`assets/heroes/hoa_ren/`), vì đã có sẵn clip Idle/Run đúng chuẩn. Không cần tải bộ CC0.
- 2026-09-30 (Mốc 1): giới hạn FPS vẽ bằng cách bỏ khung hình (30 ở mức Thấp), mô phỏng luôn 30Hz cố định.
- 2026-09-30 (Mốc 1): tướng bị giữ trong đường (y 750–1650) và trong bản đồ; tường, bụi, khe nước chưa chặn (Mốc 3).
- 2026-09-30: GLB xuất mét, `hero.art.json.scale = 100` để ra cm trong thế giới.
- 2026-09-30: roster autobattle (nhân vật có bản quyền) không copy nguyên; port **cơ chế** sang 14 tướng gốc theo lựa chọn của chủ dự án. Đối chiếu: Sakura→Hạnh Hoa, Konohamaru→Tiểu Ảnh, ChiChi→Bà Năm Chảo, Tsubasa→Cầu Mây, Shikamaru→Bóng Đèn, Suzune→Thầy Đồ, Ginyu→Kép Chèo, Doraemon→Mèo Thần Tài, Superman→Phù Đổng, Beatrice→Thư Linh, Tanjiro→Kiếm Thuỷ, Gojo→Lưỡng Cực, Isagi→Nhãn Sư, Conan→Trạng Nhí. Không dùng lại tên chiêu, trang phục, biểu tượng đặc trưng gốc.
- 2026-09-30: mỗi tướng chỉ có nội tại + K1/K2/K3 (chiêu cuối gộp vào K3); các chiêu phụ của bản gốc được gộp/bỏ. Hook cơ chế mới ở dạng `params` khai báo, chưa có engine.
- Bản đầu chưa cân bằng; chưa có mặt hàng đồ mới (`recommendedBuild` dùng id giữ chỗ giống 04).
