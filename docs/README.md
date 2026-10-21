# LANTERN ARENA — Bộ spec MOBA mobile 3D, 5v5 + 1v1

> Tên game "Lantern Arena / Đấu Trường Đèn Lồng" là tên tạm.
> Bộ tài liệu này là đầu vào cho AI coding. **Mỗi phiên làm việc: cho AI đọc README.md trước, sau đó chỉ đọc các file liên quan tới mốc đang làm** (ghi trong `10_LO_TRINH.md`).

## Danh mục

| File | Nội dung |
|---|---|
| `01_TONG_QUAN.md` | Tầm nhìn, chế độ chơi, phạm vi, quy tắc bản quyền |
| `02_KY_THUAT.md` | Công nghệ, kiến trúc, cấu trúc thư mục, công thức, lưu dữ liệu |
| `03_BAN_DO.md` | Bản đồ 5v5 và 1v1: toạ độ, trụ, lính, quái rừng, mục tiêu lớn, bụi cỏ |
| `04_TUONG.md` | Hệ kỹ năng, hiệu ứng, 16 tướng gốc (chỉ số, kỹ năng, build) |
| `05_DO_PHEP_BUA.md` | 38 món đồ, 6 phép bổ trợ, bảng bùa |
| `06_AI.md` | AI lính, trụ, quái, bot tướng 1v1 và 5v5, não đội |
| `07_GIAO_DIEN.md` | Luồng màn hình, sảnh, chọn tướng, cấm chọn, HUD trong trận, kết quả, nhận thưởng |
| `08_XEP_HANG_TIEN_TRINH.md` | Bậc hạng, sao, điểm Hào Quang, MVP, mùa giải, tiền tệ, nhiệm vụ |
| `09_HINH_ANH.md` | Hướng nghệ thuật, bảng màu, mô tả ngoại hình từng tướng, quy trình làm asset |
| `10_LO_TRINH.md` | 14 mốc phát triển, tiêu chí hoàn thành, prompt mẫu |
| `11_HUONG_DAN_MODEL_3D.md` | Hướng dẫn từng bước có model 3D đẹp: mua, tạo bằng AI, thuê hoạ sĩ; Blender, gắn xương, xuất GLB, nén, kiểm tra, giấy phép |
| `KIEM_TOAN.md` | Báo cáo kiểm toán 19/10/2026 + lộ trình nâng cấp GĐ0–3 (kế hoạch gốc) và phần đã hoàn thiện, số đo theo tiêu chí từng giai đoạn |

## Quy tắc bắt buộc cho AI coding

1. JavaScript thuần (ES modules) + HTML/CSS + Web Audio. **Thư viện duy nhất được phép: Three.js r186** (bản tải về đặt trong `lib/three/`, kèm addon chính thức GLTFLoader, KTX2Loader, meshopt decoder, SkeletonUtils). Không thư viện khác, không bước build. Không nâng phiên bản Three.js khi chưa được yêu cầu.
2. Logic mô phỏng **không dùng** `Math.random()`, `Date.now()`, `performance.now()`. Dùng `core/rng.js` (có seed) và bộ đếm tick.
3. Mọi số liệu nằm trong `src/data/`. System không được hard-code tên tướng, tên đồ. Cơ chế riêng của tướng dùng hook khai báo trong data.
4. Người chơi và bot điều khiển tướng qua **cùng một kiểu Command**.
5. Mỗi file dưới ~400 dòng. Dài hơn thì tách.
6. Chỉ làm đúng mốc được giao. Không tự thêm tính năng.
7. Kết thúc mỗi phiên: liệt kê file đã sửa, cách chạy, checklist test trên điện thoại.
8. Không dùng tên, hình, model, icon, âm thanh, font, bộ kỹ năng đặc trưng hay tên vật phẩm của game thương mại khác.
10. Model 3D chỉ nạp từ `assets/` và mỗi file phải có dòng ghi nguồn trong `assets/LICENSES.md`.
9. Khi spec mâu thuẫn hoặc thiếu: chọn cách đơn giản nhất, ghi lại trong `docs/DECISIONS.md`.
11. **Bốn model cao cấp do chủ dự án gửi — Hoả Rèn (`hoa_ren`), Thạch Quy (`thach_quy`), Bóng Tre (`bong_tre`), Nguyệt Hạ (`nguyet_ha`) — không được sửa, dựng lại hay chụp lại**: file GLB / `hero.art.json`, file gốc trong `tools/modelgen/imports/`, animation viết tay trong `tools/modelgen/heroes/<id>*.mjs` và ảnh thẻ trong `assets/ui/heroes/<id>_*`. `node tools/t_premium.mjs` kiểm mã băm của 35 file đó; `tools/modelgen/build.mjs` và `tools/uiart/render.cjs` tự bỏ qua 4 tướng này (chỉ chủ dự án dùng `FORCE_PREMIUM=1` khi chính họ gửi bản mới). Không đổi chất liệu / đổ bóng / animation chung theo cách làm 4 tướng này trông khác đi.

## Chạy local
```
python3 -m http.server 8080
# mở http://<IP-máy-tính>:8080 trên điện thoại cùng mạng wifi
```
