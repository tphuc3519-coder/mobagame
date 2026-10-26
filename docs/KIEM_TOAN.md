# Kiểm toán Lantern Arena — kế hoạch ban đầu và tiến độ

Hai phần:
- **Phần I** chép lại nguyên văn báo cáo kiểm toán và lộ trình nâng cấp ngày 19/10/2026, khi repo ở commit `e954d15`.
- **Phần II** ghi những gì đã hoàn thiện tới 21/10/2026.

Code của Phần II đã gộp vào `main` qua PR #17 ngày 26/10/2026 và đang chạy trên GitHub Pages (workflow `pages.yml` tự deploy mỗi khi có commit lên `main`).
Phần III là kế hoạch của giai đoạn tiếp theo (GĐ4).

---

# Phần I — Kế hoạch ban đầu (báo cáo kiểm toán 19/10/2026)

Commit `e954d15` (17/10/2026), 178 commit kể từ 29/09/2026, rà ngày 19/10/2026.

Lantern Arena đã là một MOBA 3D chạy được trọn luồng như Liên Quân:
sảnh → chọn chế độ → phòng chờ → chọn tướng → tải trận → trận 1v1 hoặc 5v5 → ba màn kết quả.

Khung kỹ thuật chắc:
- mô phỏng tất định 30 tick/giây, tách khỏi đồ hoạ;
- 9 bộ kiểm thử đều đạt.

Ba chỗ yếu lớn nhất nằm ở nội dung 5v5:
- chỉ 6/20 tướng chơi được;
- bot 5v5 không đi rừng và không đánh mục tiêu lớn;
- một số lỗi logic đã đo được.

| Con số | Ý nghĩa |
|---|---|
| **6/20** | tướng chơi được. Trận 5v5 nào cũng có 5 cặp tướng trùng giữa hai đội. |
| **0** | mục tiêu lớn bị hạ trong 2 trận 5v5 toàn máy (23,9 và 29,3 phút). |
| **×3** | lính siêu cấp mỗi đợt mỗi đường (đúng ra là 1). |
| **9/9** | bộ kiểm thử mô phỏng trong `tools/` đạt; chạy thử trên trình duyệt không lỗi console. |

## 1. Bức tranh tổng thể

| Phần | Đang dùng |
|---|---|
| Đồ hoạ | Three.js r186 để sẵn trong `lib/three`, hậu kỳ bloom riêng (`render/post.js`), sương mù chiến trường, tự hạ chất lượng theo FPS |
| Ngôn ngữ / build | JavaScript ES module + importmap trong `index.html`. Không bundler, không `package.json` ở gốc — mở bằng `python3 -m http.server` là chạy |
| Mô phỏng | `src/sim` không đụng DOM/three: bước cố định 30 tick/giây, RNG có seed, lệnh (Command) dùng chung cho người và bot |
| Model | GLB sinh bằng code (`tools/modelgen`) + một model hoạ sĩ (Moonstream); 30 thư mục tướng trong `assets/heroes` |
| Âm thanh | 79 hiệu ứng + nhạc tổng hợp bằng code (`tools/sfx`), một file sprite MP3 |
| Lưu dữ liệu | `localStorage` (hồ sơ, hạng, cài đặt) — chơi offline với máy, chưa có máy chủ |
| Deploy | GitHub Pages qua `.github/workflows/pages.yml`, **chỉ chạy khi bấm tay** |
| Kiểm thử | 13 kịch bản Node trong `tools/` (combat, items, kills, jungle, map, rank, restore, target, determinism, arena, bot, simtest) |

**Thư mục:**

| Thư mục | Chứa |
|---|---|
| `src/core` | vòng lặp, sự kiện, RNG, cài đặt |
| `src/sim` | luật trận |
| `src/ai` | bot |
| `src/data` | tướng, đồ, phép, bản đồ, quái |
| `src/render` | cảnh 3D |
| `src/hud` | giao diện trong trận |
| `src/ui` | các màn ngoài trận |
| `src/audio` | âm thanh |

**Luồng chạy:** Màn tải → Sảnh → Chọn chế độ → Phòng chờ + tìm trận → Chọn tướng 30s → Đội hình → Tải trận VS → Dịch sẵn shader → Trận →
CHIẾN THẮNG/THẤT BẠI → 3 màn kết quả → tải lại trang.

Rời màn kết quả (Sảnh / Đấu lại) thì cả trang tải lại (`ui/flow.js:66–70`). Đây là lựa chọn có chủ đích để dọn sạch renderer, HUD và listener.
Đổi lại, mỗi ván mới phải qua lại màn tải.

## 2. Bảng kiểm toán

Chú giải: ✅ Hoàn thiện (code đủ, logic đúng) · 🟡 Dang dở (có khung, thiếu logic sâu) · 🔴 Lỗi (sai logic, đã chỉ ra dòng) · ⬜ Chưa có (cơ chế Liên Quân chưa làm).

### 2.1 Kiến trúc, hiệu năng, build / deploy

| | Mục | Chi tiết |
|---|---|---|
| ✅ | Vòng lặp bước cố định + nội suy khi vẽ | 30 tick/giây, chặn bù tối đa 0,25s khi tab bị treo; mô phỏng tất định (`t_determinism` băm trùng giữa các lần chạy). `core/loop.js` · `sim/world.js` |
| ✅ | Va chạm, tìm đường, camera, tối ưu khung hình | Tường theo lưới ô, A* dùng đống nhị phân giới hạn 1500 ô, không vẽ đơn vị ngoài khung, chia ô cảnh tĩnh, LOD lính/quái, dịch sẵn shader trước trận, tự hạ chất lượng 5 bậc. |
| 🔴 | Màn kết quả vẫn vẽ cảnh 3D ở mỗi khung hình | `loop.pause()` chỉ dừng mô phỏng; `frame` vẫn gọi `render()` vô điều kiện. Đo: 98 khung trong 3 giây ở màn kết quả. `core/loop.js:15` · `game.js:157` |
| 🟡 | Không có đường dọn trận trong cùng một trang | Vòng lặp không có `stop()`; listener `resize`, `visibilitychange`, `onPref` đăng ký mỗi trận và không gỡ. Muốn "Đấu lại" nhanh thì phải làm phần dispose này trước. |
| 🔴 | Deploy không tự chạy và đẩy lên cả thứ không dùng | Chỉ có `workflow_dispatch`; upload `path: .` gồm cả `tools/modelgen/imports` (26 MB), 10 thư mục model không còn dùng (≈ 8,5 MB) và `play.html` cũ. `.github/workflows/pages.yml:5, :26` |
| 🟡 | Không đánh phiên bản file | Module JS nạp theo đường dẫn cố định; GitHub Pages cache 10 phút nên máy người chơi có thể nạp lẫn module cũ và mới. |
| ⬜ | PWA: favicon, manifest, service worker | Lỗi 404 duy nhất khi chạy thử là `favicon.ico`. Chưa cài được lên màn hình chính, chưa chơi offline. |

### 2.2 Tiền trận

| | Mục | Chi tiết |
|---|---|---|
| ✅ | Màn tải, sảnh, chọn chế độ, phòng chờ, tìm trận, chấp nhận 12s | Sảnh có hồ sơ, bạn bè, thư, sứ mệnh, sự kiện, xếp hạng, lịch sử, cài đặt 6 thẻ. Bạn bè và ghép trận là giả lập. |
| ✅ | Chế độ | Đấu thường 5v5, Đấu hạng 5v5, Đấu đơn 1v1, Luyện tập, 4 độ khó máy. |
| ✅ | Chọn tướng | Đồng hồ 30 giây, đồng đội máy chọn dần, khoá tướng, đếm 3 giây; màn đội hình và màn tải VS theo tiến độ tải model thật. |
| 🟡 | Kho tướng: 6/20 chơi được | 14 tướng port từ autobattle còn khoá "Sắp có"; trận 5v5 luôn có 5 tướng trùng giữa hai đội. `data/heroes/index.js:23` |
| ⬜ | Chọn vị trí | Không có bước chọn đường; bot xếp cố định 1 Đền · 2 Giữa · 2 Sông và không ai đi rừng. `sim/lineup.js:6–7` |
| ⬜ | Cấm/chọn cho Đấu hạng | Đấu hạng dùng cùng màn chọn với Đấu thường. |
| 🟡 | Phép bổ trợ: 6 phép | Thiếu Bộc Phá, Gầm Thét, Ngất Ngư, Suy Nhược. `data/spells.js` |
| 🟡 | Bảng ngọc (bùa) | 15 loại bùa, 5 trang dựng sẵn; ở màn chọn tướng chỉ xoay vòng trang, chưa tự xếp được. Phù hiệu chưa có. |

### 2.3 Lối chơi lõi

| | Mục | Chi tiết |
|---|---|---|
| ✅ | Chỉ số theo cấp 1→15 | Máu, năng lượng, công, phép, giáp, giáp phép, xuyên, tốc đánh, chí mạng, hút máu, giảm hồi chiêu, kháng hiệu ứng. `sim/stats.js` |
| ✅ | Ba loại sát thương | Vật lý / phép / chuẩn; khiên vẫn đỡ sát thương chuẩn. Công thức `raw × 100 / (100 + giáp)` trùng Liên Quân nếu nhân giáp ×6. `sim/damage.js` |
| 🔴 | Hút máu vật lý chỉ ăn đòn đánh thường | Chiêu vật lý không hồi máu. `sim/damage.js:54` |
| ✅ | Kỹ năng | 8 kiểu chiêu, cắt chiêu khi bị khống chế cứng, khoá quay mặt 0,25s, móc kéo, hút về. `sim/skills.js` |
| ⬜ | Chiêu khoá mục tiêu | Chạm chọn một tướng rồi chiêu tự bay tới. |
| ✅ | Khống chế | Làm chậm, choáng, hất tung, trói, câm lặng, khiêu khích, bất động; miễn khống chế 1s từ Giải Trói. `sim/status.js` |
| ⬜ | Áp chế (Suppress) và miễn khống gắn với chiêu tướng | |
| ✅ | Bản đồ 5v5 | 3 đường, 9 trụ + nhà chính mỗi đội, bất tử theo tầng, tường, bụi, sương mù, cục máu sau trụ ngoài. |
| ✅ | Trụ | Ưu tiên lính, đổi sang tướng địch vừa đánh tướng phe mình, sát thương dồn, chống đẩy lẻ. |
| 🔴 | Lính siêu cấp sinh gấp 3 | Điều kiện `due.some(type === 'sword')` đúng ở cả ba tick ra lính kiếm. `sim/minions.js:43` |
| ⬜ | Lính đổi mục tiêu; giáp trụ ngoài 4 phút đầu | `sim/minions.js:53` |
| ✅ | Rừng | 12 trại, bùa xanh / đỏ, mục tiêu lớn Long Ngư, Hổ Lôi, Thần Điểu + Tà Thần từ phút 15; đồng hồ hồi sinh trên bản đồ nhỏ. |
| ⬜ | Bùa rơi / cướp bùa; Tiên Phong sau Tà Thần | `sim/damage.js:74` |
| ✅ | Kinh tế | Vàng khởi đầu 800, thụ động, last-hit, chia KN, thưởng chuỗi, chặn đứng, hỗ trợ chia vàng. |
| 🔴 | Vàng thụ động dừng lúc tướng chết | ≈ 2.400–2.600 vàng mỗi trận không vào túi ai. `sim/economy.js:70` |
| 🔴 | Người hỗ trợ không nhận kinh nghiệm từ mạng hạ | `sim/economy.js:53` |
| 🟡 | Bảng kinh tế 5v5 vẫn là số của 1v1 | `data/economy.js:1` |
| ✅ | Cửa hàng | Mua mọi nơi, ghép 3 tầng, 6 ô, bán 60%, giới hạn giày / rừng / trợ thủ, nội tại Duy nhất, ô mua nhanh. |
| 🔴 | Ba món rừng / trợ thủ chỉ có chỉ số | Nanh Thú Rừng, Đèn Đồng Hành, Đèn Soi Đường không chạy nội tại. `data/items.js:68–70` |
| 🟡 | Đồ kích hoạt | Mới có Bình Sương Đông. |
| ✅ | Bot 1v1 | Đi đường / Giao tranh / Rút lui / Biến về / Hồi máu, 4 độ khó, last-hit, trao đổi chiêu, ngắm đón đầu, gỡ kẹt A*, không gian lận sương mù. |
| 🟡 | Bot 5v5 chỉ biết giữ đường | Không đi rừng, không gank, không lấy mục tiêu lớn. Hai trận toàn máy: 0 mục tiêu lớn bị hạ, 29,3 và 23,9 phút. `ai/laneBot.js` |
| 🟡 | Bot không né chiêu | Tham số `dodge` khai cho 4 độ khó nhưng không chỗ nào đọc. `data/ai.js:3–6` |

### 2.4 HUD trong trận

| | Mục | Chi tiết |
|---|---|---|
| ✅ | Điều khiển | Cần di chuyển 2 kiểu, WASD, nút đánh + Ăn lính / Đẩy trụ, 3 nút chiêu kéo ngắm + ô X huỷ, tự nhắm, Biến về / Hồi Máu / phép / đồ. |
| ✅ | Bản đồ nhỏ, tỉ số + K/D/A, thanh máu trên đầu | |
| ✅ | Thông báo hạ gục | Chiến công đầu, Double → Penta, chuỗi, Chặn đứng, hạ mục tiêu lớn; 79 hiệu ứng âm thanh. |
| 🔴 | Tiếng niệm Biến về kêu tiếp sau khi đã huỷ | Huỷ bằng chiêu / phép / Hồi Máu không phát `recallCancel`. `sim/skills.js:137` · `sim/spells.js:42, :90` |
| 🟡 | Mua nhanh 1 món; khống chế chỉ hiện chữ | `hud/shop.js:84` |
| ⬜ | Ping tín hiệu; Quét sạch (Ace) | |

### 2.5 Kết thúc trận và tổng kết

| | Mục | Chi tiết |
|---|---|---|
| ✅ | CHIẾN THẮNG / THẤT BẠI rồi 3 màn kết quả | `game.js:150–157` · `ui/postgame.js` |
| ✅ | Điểm trận 0–16, MVP, 7 danh hiệu, huy chương | `ui/score.js` |
| 🟡 | Thẻ Chi tiết chỉ có số tuyệt đối | Chưa có thanh % sát thương, % gánh chịu, % tham gia. `ui/postgame.js:158` |
| ⬜ | Lia camera về nhà chính lúc nổ | |
| ✅ | Đấu lại / Về sảnh dọn trận bằng tải lại trang | (xem 2.1 về cái giá thời gian) |

## 3. Cân bằng và cảm giác chơi (ghi nhận 19/10)

- Điều khiển đã kỹ. Đợt 16/10 thêm nhịp gồng → giáng → khựng → thu đòn, cùng giật camera; độ trễ lệnh tối đa một tick (33 ms).
- Máu tướng ×1,3 và tốc chạy ×1,15 cho bản đồ 5v5. Tướng đỡ đòn cấp 15 đủ đồ giảm khoảng 76% sát thương vật lý — dai hơn mức Liên Quân thường thấy.
  Cần đo lại sau khi mở đủ 20 tướng.
- Thiếu hút máu vật lý cho chiêu nên đấu sĩ lệ thuộc vào đánh thường.
- Bot đi đường làm tốt. Ở tầm toàn bản đồ thì bot gần như không quyết định gì, nên trận kéo dài và kết thúc chủ yếu nhờ lính đẩy.
- 2 trận đo: đội Xanh thắng cả hai, cần thêm trận để biết có lệch phía hay không (mục tiêu 45–55%).

## 4. Lộ trình nâng cấp

### Giai đoạn 0 — Sửa dứt điểm lỗi đã xác nhận
- Siêu lính chỉ 1 con mỗi đợt (2 khi mất cả 3 nhà) — `sim/minions.js:43`
- Vàng thụ động chạy cả lúc chết — `sim/economy.js:70`; người hỗ trợ nhận KN mạng hạ — `:53`
- Hút máu vật lý tính cho mọi sát thương vật lý — `sim/damage.js:54`
- Nanh Thú Rừng, Đèn Đồng Hành, Đèn Soi Đường chạy đúng mô tả
- Huỷ Biến về luôn phát sự kiện huỷ (dừng tiếng niệm)
- Ngừng vẽ cảnh 3D khi đã sang màn kết quả
- Deploy tự chạy khi push `main`, chỉ đẩy `index.html` + `src` + `lib` + `assets` cần dùng; bỏ `play.html` cũ, 10 thư mục model thừa; thêm favicon

*Xong khi:* mỗi lỗi có một kiểm thử mới trong `tools/`, toàn bộ `t_*.mjs` + `simtest` vẫn đạt, trận 5v5 toàn máy đếm đúng 1 siêu lính/đợt.

### Giai đoạn 1 — Hoàn thiện lối chơi 5v5 (Mốc 10–11)
- Mở 14 tướng còn khoá để hết trùng tướng
- Xếp đội có người đi rừng.
- Bộ não đội cho bot: gank, lấy mục tiêu lớn, tập hợp giao tranh, thủ nhà.
- Bot né chiêu theo tham số `dodge`.
- Lính đổi mục tiêu khi tướng địch đánh tướng phe mình.
- Giáp trụ ngoài 4 phút đầu.
- Bùa rơi / cướp bùa.
- Tiên Phong sau Tà Thần.
- Tách bảng kinh tế 5v5 khỏi 1v1

*Xong khi:* 50 trận bot vs bot cho trung vị 12–18 phút, Xanh/Đỏ thắng 45–55%, mục tiêu lớn bị đánh ít nhất 2 lần mỗi trận.

### Giai đoạn 2 — UI/UX tiền trận và trong trận chuẩn Liên Quân (Mốc 12)
- Chọn vị trí trước khi chọn tướng; cấm/chọn cho Đấu hạng
- 4 phép bổ trợ còn thiếu; màn tự xếp bảng ngọc; phù hiệu
- Ping 4 loại; mua nhanh 2 món; thanh thời gian khống chế; thông báo Quét sạch
- Kiểu chiêu khoá mục tiêu, Áp chế, thêm đồ kích hoạt

*Xong khi:* đi hết Sảnh → Đấu hạng → Phòng chờ → Cấm/chọn → Trận → Kết quả không lỗi ở màn 19,5:9 và 16:9.

### Giai đoạn 3 — Kết thúc trận, Đấu lại nhanh, đóng gói (Mốc 13–14)
- Camera lia về nhà chính lúc nổ
- Thẻ Chi tiết có thanh % sát thương, % gánh chịu, % tham gia giao tranh
- Dọn trận trong cùng trang (dừng vòng lặp, gỡ listener, giải phóng renderer) để Đấu lại không qua màn tải
- PWA: manifest, service worker, icon; đánh phiên bản file khi deploy

*Xong khi:* cài được lên màn hình chính, chơi offline được, Đấu lại vào phòng chờ dưới 3 giây.

## 5. Cách đã kiểm (19/10)
- Đọc toàn bộ `src/sim`, `src/ai`, `src/data`, `game.js`, `main.js`, các màn `src/ui` chính, workflow deploy và tài liệu trong `docs/`.
- Chạy `t_combat`, `t_items`, `t_kills`, `t_jungle`, `t_map`, `t_rank`, `t_restore`, `t_target`, `t_determinism`: đều đạt.
- Kịch bản Node tái hiện lỗi siêu lính.
- 2 trận 5v5 toàn máy 30 phút (seed 1 và 2) để đếm mục tiêu lớn, quái rừng, siêu lính, thời gian chết.
- Chromium không giao diện (GPU giả lập) ở 844×390: sảnh → chọn tướng → trận 1v1 → đầu hàng → màn kết quả, và trận 5v5.
- Chưa kiểm: điện thoại thật, Safari thật.

---

# Phần II — Đã hoàn thiện tới 21/10/2026

Một luật cứng áp cho mọi giai đoạn: model, art và animation của 4 tướng đầu (Hoả Rèn, Thạch Quy, Bóng Tre, Nguyệt Hạ) là model cao cấp, **không được đổi**.
Bộ kiểm thử `tools/t_premium.mjs` + `tools/premium.lock.json` giữ 35 file của 4 model này; lần chạy cuối vẫn nguyên vẹn.

## Tổng quan

| Giai đoạn | Trạng thái | Tiêu chí "Xong khi" — đo được |
|---|---|---|
| 0 — sửa lỗi đã đo | ✅ Xong | `t_fixes.mjs` 25 kiểm tra đạt; deploy tự chạy khi lên `main` |
| 1 — lối chơi 5v5 | ✅ Xong | 50 trận bot: trung vị **15,9–16,4 phút** · Xanh thắng **46–54%** · **3,6–4,2** mục tiêu lớn / trận · 0 lỗi |
| 2 — UI/UX chuẩn Liên Quân | ✅ Xong | `b_flow.cjs` 7 kịch bản ở 844×390 (19,5:9) và 1280×720 (16:9) đạt hết, không lỗi trang / console |
| 3 — kết thúc trận, đấu lại, PWA | ✅ Xong | Đấu lại về phòng chờ **0,17–0,29 s** · cài được · tắt mạng vẫn đánh trọn trận 1v1 |

## Giai đoạn 0 — commit `6cafaca`
- ✅ Siêu lính 1 con / đợt / đường (2 khi mất cả 3 nhà).
- ✅ Vàng thụ động chạy cả lúc chết.
- ✅ Kinh tế 5v5 riêng theo 03 §A9–A10: 4 vàng/s, hồi sinh 6 + 2,5 × cấp, KN mạng chia cho người hỗ trợ.
- ✅ Hút máu vật lý / phép tính mọi sát thương cùng loại, kể cả kỹ năng.
- ✅ Nanh Thú Rừng, Đèn Đồng Hành, Đèn Soi Đường chạy đúng mô tả.
- ✅ Huỷ Biến về luôn phát sự kiện (dừng tiếng niệm).
- ✅ Màn kết quả dừng hẳn vòng vẽ 3D.
- ✅ Workflow Pages tự chạy khi push `main`, chỉ đẩy file game cần; bỏ `play.html` cũ; thêm icon ứng dụng.
- Kiểm thử: `tools/t_fixes.mjs` (25 kiểm tra).

## Giai đoạn 1 — commit `b20faa1` → `ab137d6`
- ✅ **Mở khoá 14 tướng**, `ALPHA` = 20 tướng, kèm 5 kiểu chiêu mới:
  - `line` — đường thẳng nhiều nhịp;
  - `tether` — trói nối;
  - `recast` — phân thân kích hoạt lại;
  - `targetedDash` — lao khoá mục tiêu;
  - `targeted` — đạn khoá mục tiêu.

  Thêm hook nội tại, trạng thái `noDash` / `blind` / `suppress` / `basicImmune` / `mark`, hiệu ứng hình và ảnh thẻ cho 14 tướng.
- ✅ **Luật 5v5:**
  - giáp trụ ngoài (−40% sát thương trước phút 4);
  - trụ nhà tự hồi máu;
  - lính quay sang đánh tướng địch vừa đánh tướng phe mình;
  - bùa xanh / đỏ rơi sang người hạ;
  - hạ Tà Thần thì mỗi đường có một Người Đá Đèn (Tiên Phong) đẩy đường;
  - Lính Đèn Lớn trâu hơn dưới trụ.
- ✅ 1v1 không hoà mãi: 50/50 trận kết thúc, trung bình 20,4 phút.
- ✅ **Não đội** (`ai/teamBrain.js`):
  - thủ trụ / nhà chính;
  - đánh mục tiêu lớn;
  - gom đội đẩy đường từ phút 10;
  - đi rừng + gank (`laneBot.js`).
- ✅ Hai hang Long Ngư / Hổ Lôi lên trục sông cho công bằng hai phe; Thần Điểu / Tà Thần mọc phút 12.
- ✅ Bot né chiêu theo `dodge` của độ khó (`ai/dodge.js`), cả bot 1v1 lẫn 5v5.
- Đo (`node tools/t_arena_batch.mjs 50 normal`), so với trước GĐ1:

  | | Trước GĐ1 | Sau GĐ1 |
  |---|---|---|
  | trung vị thời lượng | 22,6 phút | 15,9–16,4 phút |
  | Xanh thắng | 65% | 46–54% |
  | mục tiêu lớn / trận | gần như 0 | 3,6–4,2 |
- Kiểm thử mới: `t_heroes.mjs`, `t_rules5v5.mjs`, `t_arena_batch.mjs`.

## Giai đoạn 2 — commit `2b95a46` → `ac01f97`
- ✅ **Chọn vị trí** ở phòng chờ: vị trí chính + phụ, chia vị trí 85% vào vị trí chính, vào trận đứng đúng ô.
  Đi rừng mang sẵn Trừng Trị + Nanh Thú Rừng.
- ✅ **Cấm/chọn Đấu hạng** (`ui/draft.js`):
  - dưới Hải Đăng mỗi bên 2 cấm, từ Hải Đăng mỗi bên 3 cấm;
  - 15 s chuẩn bị;
  - máy chọn hợp vị trí 98,7%.
- ✅ **4 phép mới** (10 phép): Tắt Đèn, Loá Mắt, Trống Trận, Bùa Mỏi; bot mang và dùng theo vị trí (`ai/botSpells.js`).
- ✅ **Bảng Bùa tự xếp**: 5 trang mẫu + 10 trang riêng, sao chép / gỡ / xoá / đổi tên. **Phù hiệu** lưu theo từng tướng.
  Màn chọn tướng có hộp chọn trang nhanh.
- ✅ **Ping 4 loại** (Tấn công / Tập hợp / Rút lui / Cẩn thận): bot đồng đội làm theo, bot tự ra tín hiệu.
  Thêm **mua nhanh 2 món**, **thanh thời gian khống chế** dưới chân, **thông báo Quét Sạch**.
- ✅ **Chiêu khoá mục tiêu** (`aim.id`, dấu vàng xem trước).
- ✅ **Áp chế** (`sim/suppress.js`) và **Không thể cản**.
- ✅ **3 đồ kích hoạt mới**: Xích Đồng, Lọng Hộ Mệnh, Dải Lụa Gió. HUD có 2 nút đồ.
- ✅ HUD còn thiếu: chữ SUY YẾU; TẮT ĐÈN trên trụ bị tắt (vòng tầm mờ đi); chữ nổi tên phù hiệu.
- Kiểm thử:
  - node: `t_draft`, `t_lineup_roles`, `t_spells`, `t_emblems`, `t_charms`, `t_suppress`, `t_actives`, `t_lockon`, `t_pings`;
  - trình duyệt: `b_flow.cjs` (ranked, normal, role, loadout ở cả 2 cỡ màn), `b_match.cjs` (items, lockon, suppress, pings).

## Giai đoạn 3 — commit `09913d1`
- ✅ **Cuối trận:** camera lướt về nhà chính bên thua, nổ + rung màn (`render/endCam.js`, số trong `data/endgame.js`).
- ✅ **Màn kết quả → Chi tiết:**
  - 3 thanh % mỗi người: sát thương, gánh chịu, tham gia hạ gục;
  - mỗi đội cộng đúng 100%;
  - bảng Số liệu thêm 5 cột.
- ✅ **Đấu lại / Về sảnh không tải lại trang:**
  - `core/scope.js` gom listener / hẹn giờ / phần tử của trận;
  - renderer dùng chung cả phiên, giữ chương trình shader;
  - vật liệu giữ một thế hệ.
- Đo GĐ3 trên máy không GPU, CPU giả lập chậm 4×:

  | | Trước | Sau |
  |---|---|---|
  | về phòng chờ | tải lại cả trang | 0,17–0,29 s |
  | trận 2 dịch sẵn shader | 5–8,4 s | 0,36–0,56 s |
  | chương trình shader qua 3 trận | | 67 → 67 |
  | GPU sau khi dọn | | 0 hình khối, 3 ảnh dùng chung |
  | listener qua các trận | | không dồn |
- ✅ **Cài như ứng dụng + chơi không mạng:**
  - manifest + 4 biểu tượng;
  - `sw.js` khoá theo băm SHA-256 từng tệp;
  - `tools/mk_sw.mjs` đánh phiên bản lúc deploy.

  Đo:
  - tải sẵn 429 tệp / 13,8 MB, lưu đủ 20 tướng;
  - Chrome báo cài được;
  - tắt mạng vẫn vào Sảnh và đánh trọn trận 1v1;
  - bản mới hiện hộp "Có bản mới" ở Sảnh và không tải lại model tướng.
- Kiểm thử mới: node `t_share`, `t_scope`, `t_dispose`, `t_endcam`, `t_pwa`; trình duyệt `b_gd3`, `b_pwa`.

## Còn lại
- ✅ **Đã gộp vào `main`** (PR #17, 26/10); Pages tự deploy, lượt chạy 23 thành công — https://tphuc3519-coder.github.io/mobagame/
- ✅ **Đã chạy lại trên bản cuối (21/10):**
  - 50 trận bot: 50/50 kết thúc, trung vị 16,4 phút, Xanh thắng 46%, 4,18 mục tiêu lớn / trận, 0 lỗi;
  - `b_match.cjs --only=pings` 10/10 mục đạt, `b_flow.cjs` 7 kịch bản × 2 cỡ màn đạt, bộ `t_*.mjs` đạt, 4 model cao cấp nguyên vẹn.
- **Thử trên điện thoại thật:**
  - Android Chrome: Thêm vào màn hình chính → mở toàn màn ngang; chế độ máy bay vẫn đánh được trận 5v5.
  - iPhone Safari: Chia sẻ → Thêm vào MH chính; mở một lần khi có mạng rồi thử không mạng.
  - "Đấu lại" về phòng chờ dưới 3 s.
  - Cuối trận thấy nhà chính nổ phía trên băng-rôn ở màn 844×390.

---

# Phần III — Giai đoạn 4: tiến trình tài khoản và lưu dữ liệu (kế hoạch 26/10/2026)

GĐ0–3 phủ xong phần lối chơi, UI/UX và đóng gói. GĐ4 lấy những gì lộ trình gốc (`10_LO_TRINH.md`) còn thiếu:
- **Mốc 13** (tiến trình và lưu dữ liệu) — gần như chưa làm;
- **màn Nhận thưởng của Mốc 12** (07 §11).

Hiện có: bậc hạng 1–8 + sao, Điểm tích luỹ, Bùa Giữ Sao (MVP thua), nhiệm vụ ngày (4 cái cố định), thư, túi đồ, lịch sử 20 trận (`ui/profile.js`).

> **Chủ dự án chốt (26/10): mở sẵn cả 20 tướng** — không khoá tướng theo Xu Đèn / tuần miễn phí như 08 §5. Xu Đèn dùng cho rương, bùa và trang phục.

### 4a — Lưu dữ liệu ✅ (26/10 — `t_save.mjs` 25 mục, `b_prog.cjs` save844 / save1280)
- Hồ sơ có số phiên bản + chuỗi chuyển đổi bản cũ; hồ sơ hỏng thì giữ bản sao lưu rồi dựng hồ sơ mới.
- **Xuất / Nhập mã lưu** (Cài đặt → Dữ liệu): mã có tổng kiểm, nhập thì kiểm + chuyển đổi bản cũ, xem tóm tắt trước khi thay.

### 4b — Mùa giải ✅ (26/10 — `t_season.mjs` 35 mục, `b_prog.cjs` season844 / season1280 / skin)
- Mùa 120 ngày, tên `S{n} {năm}`, đếm ngược theo đồng hồ thiết bị.
- **Hết mùa:** thưởng theo bậc cao nhất (Xu, khung ảnh, trang phục mùa), rồi **reset mềm** theo bảng 08 §4.
- **Hành trình đỉnh cao:** quà mở theo bậc, nhận một lần mỗi mùa.
- **3 vòng tướng thành thạo:** 5 trận hạng thắng với mỗi tướng, 3 tướng khác nhau.
- **Trang phục mùa** (10/10 trận hạng thắng): phối màu riêng cho một tướng chọn trước mùa. **Không áp cho 4 model cao cấp** (luật 11).

### 4c — Điểm Hào Quang, Thiên Hà, Đấu Đỉnh Cao ✅ (26/10 — `t_haoquang.mjs` 28 mục, `b_prog.cjs` peak844 / peak1280)
- **Hào Quang:**
  - bắt đầu 1000 khi vào Nguyệt Quang;
  - thắng `+15 + (điểm − 8)`, thua `−15 + (điểm − 8)/2`, trần ±25;
  - mốc 2000 mở danh hiệu + khung.
- **Bảng 100 người chơi ảo** theo seed mùa (quanh 2800, σ 300). **Thiên Hà** = top 50 Thái Dương.
- **Đấu Đỉnh Cao:** chỉ mở 19:00–24:00, cần Nguyệt Quang, cấm/chọn đầy đủ, máy Ác mộng, Hào Quang ×1,5.

### 4d — Tiền tệ, rương, vật phẩm ✅ (26/10 — `t_bag.mjs` 31 mục, `b_prog.cjs` bag844 / bag1280)
- **Ba tiền tệ:** Xu Đèn, Mảnh Tướng, Gạo Hội.
- **Rương:** cứ 3 trận được 1 rương (Xu 50–200, Mảnh 1–5, 15% Bùa Giữ Sao MVP thua). Sảnh ghi "Đấu tiếp N trận sẽ nhận được rương".
- **Vật phẩm mới:** Bùa Giữ Sao (thua bất kỳ), Thẻ Nhân Đôi Sao (7 ngày). Nhãn **"Có hạn"**, hết hạn tự xoá.
- **Cửa hàng mảnh:** đổi Mảnh Tướng lấy vật phẩm / trang phục.

### 4e — Nhiệm vụ ✅ (26/10 — `t_missions.mjs` 27 mục, `b_prog.cjs` miss844 / miss1280)
- Ngày: 3 nhiệm vụ bốc theo seed ngày, làm mới 04:00.
- Tuần: 4 nhiệm vụ, làm mới thứ Hai.
- Sự kiện tích luỹ: 0/3 trận → Gạo Hội.
- Bảng nhiệm vụ có thẻ Ngày / Tuần / Mùa.

### 4f — Màn Nhận thưởng (07 §11) ✅ (26/10 — sau trận, rương, nhiệm vụ, thư, điểm danh; `b_flow.cjs` ranked có bước Nhận thưởng)
- Hàng ô quà bật vào lần lượt 120 ms.
- Chạm một ô thì hiện tooltip: tên, hiện sở hữu, mô tả, thời hạn.
- Dưới cùng ghi "Chạm vào khoảng trống để tiếp tục".
- Dùng cho: sau màn kết quả, nhận nhiệm vụ / thư / rương / quà mùa.

*Xong khi* (theo Mốc 12–13) — **đạt cả bốn (26/10)**:
- ✅ chơi 10 trận hạng, tắt / mở lại trình duyệt, mọi số liệu còn nguyên (`t_haoquang.mjs` mục 8);
- ✅ đổi giờ thiết bị sang ngày hết mùa → nhận thưởng và reset đúng bảng (`b_prog.cjs season844/1280`);
- ✅ Xuất / Nhập mã lưu sang trình duyệt khác thành công (`b_prog.cjs save844/1280`);
- ✅ đi hết Sảnh → Đấu hạng → Phòng chờ → Cấm/chọn → Trận → Kết quả → **Nhận thưởng** → Phòng chờ không lỗi ở 19,5:9 và 16:9, có tai thỏ (`b_flow.cjs ranked844/1280`).

Chi tiết từng đợt: `docs/PROGRESS.md`; quyết định thiết kế: `docs/DECISIONS.md`.

---

# Phần IV — Giai đoạn 5: phần còn lại tới 1.0 (26/10/2026)

### 5a — Chống khoá chết khống chế (04 §3) ✅ (`t_ccchain.mjs` 11 mục)
- Chuỗi khống chế cứng của địch nối nhau quá 3 s ⇒ trong 2 s tiếp theo choáng / trói / câm lặng / khiêu khích mới chỉ còn 50%; HUD hiện "Kháng 50%".

### 5b — Cửa hàng ngọc ✅ (`t_shop.mjs` 20 mục, `b_prog.cjs` shop844 / shop1280)
- Trang phục phối màu vĩnh viễn (4 màu × 16 tướng thường; không bán cho 4 model cao cấp), vật phẩm đổi ngọc, thẻ "Nhận ngọc". Không có nạp tiền.

### 5c — Mốc 14: đóng gói, hiệu năng, model, bản quyền ✅
- **Ngân sách vẽ 02 §2** (`b_perf.cjs`, giao tranh 10 tướng + lính, mức Vừa / Cao, và quét cả bản đồ):
  bản cũ 279 lệnh vẽ · 962k tam giác · 34 mesh có xương ⇒ nay mức Vừa: giao tranh tối đa **131 lệnh vẽ · 254k tam giác hiển thị** (+105k bóng đổ) · 12 đơn vị hoạt ảnh đủ; mức Cao: 129 · 292k; quét 36 điểm khắp bản đồ: tối đa 143–145 lệnh vẽ, 302k–342k tam giác (ngân sách ≤ 150 · ≤ 400k · ≤ 12).
- **Lính / quái theo 09 §3.2:** lính ≤ 3 000, quái nhỏ ≤ 4 000, quái bùa ≤ 10 000, mục tiêu lớn ≤ 25 000 tam giác; glTF-Validator 0 lỗi (cả tướng lẫn quái).
- **Kiểm model 11 §8** (`t_models.mjs`): 16 tướng sinh bằng code đủ clip, ≤ 15k (đỡ đòn 18k) tam giác, ≤ 60 xương, ≤ 2,5 MB; 4 model cao cấp chỉ ghi lại.
- **Bản quyền** (`t_licenses.mjs`): mọi tệp đem lên mạng có dòng trong `assets/LICENSES.md`; model thừa không đem lên.
- **Tải theo nhu cầu:** màn khởi động chỉ chờ thứ Sảnh dùng; ảnh thẻ tướng / phòng chờ tải nền sau khi vào Sảnh.
- **Deploy:** GitHub Pages (bản chính) + `netlify.toml` / `vercel.json` dùng chung `tools/build_site.mjs`.

*Xong khi* (Mốc 14):
- ✅ cài được lên màn hình chính, chơi không mạng (`b_pwa.cjs`, từ GĐ3);
- ✅ lần mở thứ hai vào Sảnh dưới 3 s (`b_pwa.cjs`: trung vị **2,3 s** (2,1 / 2,3 / 2,3 s trên máy thử không GPU)).

**Chưa làm, cần người / máy chủ:** model và bản đồ vẽ tay thật thay hàng sinh bằng code; bọc Capacitor ra APK (tuỳ chọn); phần "Sau 1.0"
(PvP trực tuyến cần máy chủ Node chạy `src/sim/` + WebSocket; mắt (ward), chế độ / tướng mới mỗi mùa).
