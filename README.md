# Lantern Arena — Đấu Trường Đèn Lồng

MOBA 3D chạy trên trình duyệt điện thoại (màn ngang): 5v5 ba đường và 1v1, đấu với máy hoặc trực tuyến.
JavaScript thuần (ES module) + Three.js r186 để sẵn trong `lib/` — **không có bước build, không cần `npm install`**.

Bản đang chạy: https://tphuc3519-coder.github.io/mobagame/ (GitHub Pages, tự deploy khi có commit lên `main`).

## Chạy trên máy mình

```
node server/index.mjs          # Node 18+; phục vụ game + máy chủ online ở http://localhost:8787
```

Chỉ cần đấu với máy thì máy chủ tĩnh nào cũng được: `python3 -m http.server 8080`.
Điện thoại cùng Wi-Fi mở `http://<IP máy tính>:8787`. Chi tiết chơi online + đưa máy chủ lên mạng: [`docs/ONLINE.md`](docs/ONLINE.md).

## Thư mục

| Thư mục | Chứa |
|---|---|
| `src/sim` | Luật trận — mô phỏng tất định 30 tick / giây, không chạm DOM / Three.js (máy chủ chạy chung mã này) |
| `src/ai` | Tướng máy 1v1 / 5v5, não đội |
| `src/data` | Mọi số liệu: tướng, đồ, phép, bùa, bản đồ, quái, hạng, nhiệm vụ |
| `src/net` | Chơi online kiểu lockstep: khuôn lệnh, phiên trong trận, kết nối |
| `src/render`, `src/showcase` | Cảnh 3D trong trận và ở sảnh (chỉ hai nơi này import `three`) |
| `src/hud` | Giao diện trong trận (cần điều khiển, nút chiêu, bản đồ nhỏ, cửa hàng…) |
| `src/ui` | Các màn ngoài trận (sảnh, phòng chờ, chọn tướng, cấm / chọn, kết quả, cài đặt…) |
| `server/` | Máy chủ online bằng Node thuần (HTTP + WebSocket tự viết, không gói npm) |
| `tools/` | Kiểm thử, công cụ sinh model / âm thanh / ảnh, bước dựng thư mục đem lên mạng |
| `docs/` | Bộ spec, quyết định thiết kế, tiến độ, báo cáo kiểm toán — **đọc `docs/README.md` trước khi sửa code** |

## Kiểm thử

```
for f in tools/t_*.mjs tools/simtest.mjs; do node "$f" || echo "LỖI: $f"; done   # không cần trình duyệt (bỏ t_arena_batch / t_ui_draft nếu vội)
node tools/b_layout.cjs 8787    # trình duyệt thật (Playwright + Chromium), cần máy chủ đang chạy ở cổng đó
node tools/b_flow.cjs 8787      # cũng vậy: b_match, b_prog, b_gd3, b_pwa, b_perf
```

Mỗi bộ in `ĐẠT` / `LỖI` từng mục, dòng cuối `Tất cả đạt`, mã thoát 1 khi có lỗi. Các bộ trình duyệt nên chạy **lần lượt** (máy không GPU chạy
hai bộ cùng lúc là trình duyệt tự tắt).

## Tài liệu chính

- [`docs/README.md`](docs/README.md) — danh mục spec + quy tắc bắt buộc khi sửa code
- [`docs/KIEM_TOAN.md`](docs/KIEM_TOAN.md) — các đợt kiểm toán (mới nhất: Phần V, 14/11/2026)
- [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/PROGRESS.md`](docs/PROGRESS.md) — vì sao làm thế, đã làm tới đâu
- [`assets/LICENSES.md`](assets/LICENSES.md) — nguồn + giấy phép từng tệp hình / âm thanh / phông
