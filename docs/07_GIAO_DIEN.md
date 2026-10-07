# 07 — Giao diện

Bố cục học theo kiểu MOBA mobile phổ biến (như ảnh tham khảo người dùng gửi), nhưng **mọi hình vẽ, icon, khung viền, màu và font là thiết kế riêng**. Không cắt ghép hay đồ lại ảnh chụp từ game khác.

## 1. Hệ thống thiết kế

### 1.1 Màu (CSS variables trong `ui/styles/tokens.css`)
```css
:root {
  --bg-deep:   #0b1030;   /* nền đêm */
  --bg-panel:  #151c4a;   /* thẻ, panel */
  --bg-panel-2:#1e2862;
  --line:      #3a4aa8;   /* viền mảnh */
  --line-glow: #6f86ff;
  --text:      #e9ecff;
  --text-dim:  #9aa3d6;
  --gold-1:    #ffe08a;   /* nút chính: gradient */
  --gold-2:    #e7a93a;
  --gold-text: #4a2a00;
  --team-ally: #3fd6c8;   /* ngọc lam */
  --team-enemy:#ff5a4e;   /* đỏ son */
  --danger:    #ff4d6d;
  --ok:        #5de39a;
  --rarity-common:#8fa0b8; --rarity-rare:#4aa8ff; --rarity-epic:#b56cff; --rarity-legend:#ffb347;
}
```

### 1.2 Chữ
- Font: **"Be Vietnam Pro"** (Google Fonts, giấy phép OFL) cho nội dung; **"Bai Jamjuree"** hoặc **"Chakra Petch"** (OFL) cho tiêu đề và số. Tải từ Google Fonts hoặc tự host trong `assets/fonts/` (ghi giấy phép).
- Cỡ tối thiểu trên điện thoại ngang: 12px; nút chính 22–26px đậm.

### 1.3 Thành phần dùng chung (`ui/components/`)
| Thành phần | Mô tả |
|---|---|
| `PrimaryButton` | Hình thang lệch hai đầu (clip-path), gradient vàng `--gold-1 → --gold-2`, chữ `--gold-text` đậm, viền sáng mảnh, ánh quét chéo lặp mỗi 3s. Dùng cho: Sẵn sàng, Đấu hạng, Chọn mục tiêu, Xác nhận |
| `GhostButton` | Viền `--line`, nền trong suốt 20%, chữ `--text` |
| `PillButton` | Bo tròn hoàn toàn, icon trái + chữ (vd. "Chỉnh") |
| `TabBar` | Tab chữ, tab đang chọn có gạch chân phát sáng + mũi tên nhỏ |
| `HeroCard` | Ô chân dung vuông bo 6px, viền vàng mảnh, tên dưới ảnh; trạng thái: thường / đang chọn (viền trắng sáng + nền sáng) / bị khoá (xám + ổ khoá) / bị cấm (chéo đỏ) / đồng đội đã chọn (mờ) |
| `SkillIcon` | Tròn, viền kim loại, dùng cho cột kỹ năng ở màn chọn tướng; chạm hiện tooltip kỹ năng |
| `Tooltip` | Panel `--bg-panel` viền `--line-glow`, tiêu đề + dòng phụ + mô tả |
| `RewardTile` | Ô vật phẩm vuông, dải màu độ hiếm dưới đáy, số lượng góc dưới phải, nhãn góc trên (vd. "Có hạn") |
| `Modal` | Nền mờ + khối giữa, tiêu đề lớn có đường trang trí hai bên, dòng "Chạm vào khoảng trống để tiếp tục" |
| `Toast` | Thông báo ngắn ở trên cùng |
| `Countdown` | Đồng hồ đếm ngược dạng `104 ngày 14:58:40` |
| `RankBadge` | Huy hiệu bậc hạng (SVG theo bậc) + hàng sao phía trên |

### 1.4 Chuyển cảnh
- Đổi màn: mờ dần 180ms + trượt 24px.
- Vào trận: màn tải (xem §7).
- Mọi animation tôn trọng `prefers-reduced-motion`.

### 1.5 Bố cục an toàn
- Tỉ lệ thiết kế chuẩn 19.5:9 (2340×1080) và co giãn theo chiều cao. Chừa `env(safe-area-inset-*)` cho tai thỏ.
- Chiều cao tham chiếu: 1080; mọi kích thước UI tính bằng `vh`-based unit: `--u: calc(100vh / 1080)`.

## 2. Bản đồ màn hình (router)

> **Hiện trạng (07/10):** đã có Màn tải game → Sảnh → Chọn chế độ → Phòng chờ (mời bạn, tìm trận, chấp nhận) → Chọn tướng (chọn ẩn,
> 30 giây; luyện tập chọn tự do) → Đội hình → Tải trận → Trận → Kết quả (3 màn: đội, cá nhân, bảng tỉ số). Code `src/ui/flow.js` và các
> màn trong `src/ui/`. Khác thiết kế: đếm ngược sau khi cả đội khoá 3 giây (thay 10), chưa có màn Mùa giải và Nhận thưởng riêng (phần
> thưởng hiện ở màn kết quả cá nhân), chưa có cấm/chọn.

```
Khởi động → Tạo hồ sơ (lần đầu) → SẢNH CHÍNH
SẢNH CHÍNH
 ├─ Chơi → CHỌN CHẾ ĐỘ
 │     ├─ Đấu thường 5v5 ─┐
 │     ├─ Đấu đơn 1v1 ────┼→ PHÒNG CHỜ → (Ghép trận) → CHỌN TƯỚNG (hoặc CẤM/CHỌN) → TẢI TRẬN → TRẬN → KẾT QUẢ → NHẬN THƯỞNG → PHÒNG CHỜ
 │     ├─ Luyện tập ──────┘            (Luyện tập bỏ qua ghép trận, dùng màn CHỌN TƯỚNG LUYỆN TẬP)
 │     └─ Đấu hạng → MÙA GIẢI / HẠNG → PHÒNG CHỜ (hạng) → …
 ├─ Tướng (bộ sưu tập, chi tiết tướng)
 ├─ Bùa (bảng bùa)
 ├─ Nhiệm vụ
 ├─ Kho đồ
 ├─ Lịch sử trận
 └─ Cài đặt
```

## 3. Sảnh chính
- Nền: **cảnh 3D trưng bày** tướng người chơi chọn (model LOD0, animation `Showcase`, hạt đèn trời bay lên, camera trôi chậm). Máy yếu hoặc chất lượng Thấp: thay bằng ảnh splash tĩnh có parallax.
- Trên trái: ảnh đại diện, tên, cấp tài khoản, bậc hạng nhỏ.
- Trên phải: tiền tệ (Xu Đèn, Mảnh Tướng), nút Cài đặt.
- Phải dưới: nút lớn **Chơi** (PrimaryButton).
- Dưới: thanh menu icon: Tướng, Bùa, Nhiệm vụ, Kho, Lịch sử.
- Trái giữa: banner sự kiện dạng thẻ trượt.

## 4. Chọn chế độ
- 4 thẻ lớn ngang: Đấu hạng, Đấu thường 5v5, Đấu đơn 1v1, Luyện tập. Mỗi thẻ có ảnh minh hoạ, tên, mô tả 1 dòng, số người.
- Thẻ Đấu hạng hiện bậc hạng hiện tại + sao.

## 5. Mùa giải / Xếp hạng (theo ảnh 4)
Bố cục 3 cột:
- **Trên trái:** nút Quay lại (mũi tên lớn); `S4 2026 Mùa` (chữ số lớn + năm nhỏ); icon ?, icon ghi chú, icon sách luật; pill "Điều chỉnh" (đổi tướng trưng bày); dưới đó `Countdown` "Thời hạn mùa giải".
- **Cột trái (danh sách thẻ nhiệm vụ mùa):**
  - *Đấu Đỉnh Cao* — chế độ đặc biệt chỉ mở trong khung giờ (vd. "Mở từ 19–24"), khoá tới bậc Nguyệt Quang.
  - *Trang phục mùa chờ nhận* — tiến độ `10/10`, khi đủ hiện tooltip "Được nhận trang phục mùa – [tên]" và nút nhận.
  - *Hành trình đỉnh cao* — lộ trình phần thưởng theo bậc.
  - *Thăng hạng Top 100* — tiến độ điểm Hào Quang so với ngưỡng Top 100 (vd. `3312/3373`), kèm avatar tướng.
- **Giữa:** tướng trưng bày cỡ lớn (cảnh 3D như sảnh, hoặc splash 2D nếu chất lượng Thấp).
- **Phải:** khung huy hiệu dọc (banner treo) có: hàng **5 sao** (sao đạt vàng sáng, sao chưa đạt tối), `RankBadge`, thanh **điểm tích luỹ bậc** `60/100`, tên bậc (vd. `Hải Đăng IV`). Dưới banner: **3 vòng tướng thành thạo** (đánh dấu ✓ khi đạt yêu cầu mùa).
- **Phải dưới:** nút **Đấu hạng** (PrimaryButton); dưới nút: icon + `1997/2000` điểm Hào Quang và mũi tên mở bảng chi tiết.
- Trên phải: pill "Cấm/chọn ?" (giải thích luật), pill "ID phòng" (phòng tuỳ chỉnh – offline: tạo trận riêng với bot).

## 6. Phòng chờ / Tổ đội (theo ảnh 3)
- **Trên trái:** nút Quay lại, tên chế độ (vd. "Đấu hạng"), icon nhà (về sảnh), pill "Điều chỉnh gần đây" (avatar tướng gần đây).
- Dòng phụ: luật ghép (vd. "Ghép nhiều: Hải Đăng I – Sao Mai · Đội 5 người: Đèn Trời I – Sao Mai 25 sao").
- **Giữa:** 5 ô người chơi (1v1 chỉ 1 ô, đối thủ hiện "?"). Ô chủ phòng ở giữa: avatar, tên, bậc hạng + sao, 3 nút nhỏ (đổi tướng thường dùng, đổi khung, sửa). Ô trống: dấu "?" lớn, chạm để mời/thêm bot.
- Nền: minh hoạ phong cảnh với dáng người đứng quay lưng (silhouette các tướng gốc).
- **Trên phải:** ID người chơi, icon cài đặt tổ đội, icon mạng + pin (offline: ẩn).
- **Panel phải:** 4 tab icon (Bạn bè / Chiến đội / Gần đây / Gần bạn). Offline: danh sách là **đồng đội máy** có tên, avatar, bậc hạng, trạng thái ("Rảnh", "Đang đấu 3 phút"); nút "Thêm vào đội". Trên cùng: banner sự kiện tiến độ `0/3`. Dòng "Hiện không có phòng đề cử nào" + nút làm mới.
- Dưới panel: `Sảnh tổ đội`, `Mời bạn` (GhostButton).
- **Dưới phải:** dòng quà "Đấu tiếp 1 trận sẽ nhận được rương" + icon rương; nút **Sẵn sàng** lớn.
- **Dưới trái:** ô chat (icon chat, số tin chưa đọc), các nút micro/loa/cờ (offline: ẩn hoặc mờ).
- Bấm **Sẵn sàng** → lớp phủ "Đang tìm trận… 00:07" với nút Huỷ → sau 3–8s "Đã tìm thấy trận" với nút **Chấp nhận** (10s) → màn chọn tướng.

## 7. Chọn tướng

### 7.1 Chọn tướng luyện tập (theo ảnh 1)
- **Trái:** `TabBar` 2 tab **Tướng** / **Trang phục**. Dưới là lưới **2 cột** `HeroCard` cuộn dọc, mũi tên ">" ở mép phải lưới để mở rộng lưới toàn màn hình (bộ lọc theo vai).
- **Giữa:** **model 3D** tướng đang chọn cỡ lớn trong cảnh trưng bày (02 §13.9): đứng trên bệ phát sáng, animation `Idle`/`Showcase`, **vuốt ngang để xoay 360°**, chạm đúp phát `Victory`. Đổi tướng: model cũ tan thành hạt sáng, model mới hiện ra. Trên trái vùng giữa: **tên tướng** (chữ nghiêng đậm lớn) và dòng vai `icon + Xạ thủ/Trợ thủ`.
- **Cột kỹ năng** (giữa phải): 4 `SkillIcon` dọc — nội tại (viền sáng), K1, K2, K3. Chạm hiện tooltip.
- **Phải:** đội hình: `[avatar] Tên tướng mình` (dải sáng xanh) — `VS` — `[avatar máy] Máy` (dải đỏ). Chạm vào "Máy" để chọn tướng cho máy (mở lại lưới trái cho phe địch).
- **Trên phải:** nút **Huỷ**.
- **Dưới trái:** pill **Chỉnh** (mở bảng bùa), icon **phép bổ trợ** (chạm để đổi), pill trang bùa `[cấp 90] ST liên tục`.
- **Dưới phải:** nút **Chọn mục tiêu** (bước tiếp: chọn tướng máy) → khi đã có đủ thì đổi thành **Bắt đầu**.
- Tuỳ chọn luyện tập (bánh răng): hồi chiêu 0, vàng vô hạn, máy đứng yên/đánh trả, bản đồ 1v1 / 5v5.

### 7.2 Chọn tướng thường (chọn ẩn)
- Như 7.1 nhưng phần phải là **danh sách 5 người đội mình** (dọc), mỗi dòng: avatar tướng đã chọn / "Đang chọn…", tên người chơi, vai dự kiến, phép bổ trợ.
- Đồng hồ **30s** ở trên giữa. Hết giờ chưa chọn: tự chọn tướng đầu tiên phù hợp vai còn thiếu.
- Nút **Xác nhận** khoá lựa chọn. Sau khi mọi người khoá: 10s đếm ngược đổi trang phục/bùa → vào màn tải.
- Tướng đồng đội đã chọn bị mờ trong lưới.

### 7.3 Cấm/chọn (từ bậc Hải Đăng)
Thứ tự (X = Xanh, Đ = Đỏ):
```
Cấm lượt 1: X1, Đ1, X2, Đ2                (mỗi lượt 20s)
Chọn lượt 1: X1 | Đ1 Đ2 | X2 X3 | Đ3        (mỗi lượt 30s)
Cấm lượt 2: Đ3, X3                          (Đ cấm trước)
Chọn lượt 2: Đ4 | X4 X5 | Đ5
Đổi tướng trong đội + chỉnh bùa: 20s
```
- Bố cục: đội Xanh cột trái (5 dòng), đội Đỏ cột phải (5 dòng), lưới tướng ở giữa. Hàng ô cấm nhỏ trên cùng mỗi bên (3 ô).
- Người đang tới lượt có viền sáng chạy và đồng hồ riêng.
- Tướng bị cấm: gạch chéo đỏ trong lưới, không chọn được.
- Offline: mọi người khác là bot (`draftBot.js`).

## 8. Màn tải trận
- 2 hàng thẻ dọc (Xanh trên / Đỏ dưới; 1v1: 1 thẻ mỗi bên đối diện nhau), mỗi thẻ: splash cắt dọc của tướng, tên người chơi, bậc hạng, phép bổ trợ, **% tải**.
- Mẹo chơi ngẫu nhiên ở dưới.

## 9. HUD trong trận (canvas `#hud`)

```
┌─────────────────────────────────────────────────────────────────────┐
│[Minimap]  [Mua nhanh][Mua nhanh]    X 5 ⚔ 3 Đ   12:34    💰1450 [≡] │
│                                                         [Bảng tỉ số]│
│                                                                     │
│                         (thông báo hạ gục)                          │
│                                                                     │
│                                                   [Huỷ]             │
│                                               [K3]                  │
│   ( Joystick )                            [K2]      [Phép]          │
│                                         [K1]   ( ĐÁNH )             │
│ [Về nhà][Hồi máu*]       [ping][chat]              [Đồ kích hoạt]   │
└─────────────────────────────────────────────────────────────────────┘
```
- **Minimap** trên trái 200×200 (5v5) / 260×110 (1v1). Chạm giữ + kéo = xem khu vực đó; thả = quay về. Chạm 2 lần = ping.
- **Mua nhanh**: 1–2 ô cạnh minimap, sáng lên khi đủ tiền.
- **Tỉ số**: hạ gục hai đội + đồng hồ ở trên giữa. Chạm mở **Bảng tỉ số** (10 tướng, cấp, K/D/A, đồ, vàng).
- **Cửa hàng** (nút ≡): panel trượt từ phải, tab: Gợi ý / Tấn công / Phép / Phòng thủ / Giày / Rừng-Hỗ trợ. Chọn món → cây công thức → Mua.
- **Joystick**: động, chạm bất kỳ ở 45% trái màn hình (trừ vùng nút). Bán kính 90 đơn vị UI, vùng chết 10%.
- **Cụm nút phải**: ĐÁNH (lớn, 150), K1/K2/K3 (100) theo vòng cung, Phép bổ trợ (80), nút đồ kích hoạt (70, chỉ hiện khi có). Nút "+" nâng kỹ năng xuất hiện trên góc nút khi có điểm.
- Mỗi nút kỹ năng: icon, lớp phủ hồi chiêu quét tròn + số giây, mờ khi thiếu mana, ổ khoá khi chưa học.
- **Chỉ báo ngắm** vẽ trong cảnh 3D, sát mặt đất (02 §13.7): mũi tên (skillshot/dash), vòng tròn + điểm (aoeCircle/zone/blink), hình nón (cone), vòng tầm bắn quanh tướng. Màu ngọc lam; chuyển đỏ khi kéo vào vùng Huỷ.
- **Nút phụ dưới trái**: Về nhà, (tuỳ chọn) Hồi máu nhanh nếu sau này có thuốc.
- **Ping và chat nhanh**: nút ping mở vòng tròn 4 lệnh: Tấn công / Rút lui / Tập hợp / Cẩn thận. Chat nhanh: danh sách câu soạn sẵn.
- **Thông báo giữa màn**: hạ gục đầu tiên, chuỗi hạ gục (2, 3, 4, 5 liên tiếp), trụ bị phá, mục tiêu lớn. Tên chuỗi tự đặt: "Song Sát", "Tam Hùng", "Tứ Tuyệt", "Ngũ Long" — hiển thị kèm avatar người hạ → người bị hạ.
- **Thanh máu trên đầu**: tướng (máu có vạch mỗi 100 HP, khiên màu trắng, mana xanh dương mảnh, cấp trong ô tròn, tên người chơi); lính/quái (thanh nhỏ); công trình (thanh dày).
- **Màu**: bản thân viền vàng; đồng minh xanh ngọc; địch đỏ.
- **Khi chết**: màn xám nhẹ, đồng hồ hồi sinh lớn ở giữa, vẫn mở được cửa hàng.
- **Tạm dừng** (offline): nút ≡ → Tiếp tục / Cài đặt / Đầu hàng (5v5 sau 8:00) / Thoát.

## 10. Kết quả trận
- **Bước 1 – Chiến thắng / Thất bại**: chữ lớn đổ bóng + hiệu ứng (thắng: đèn trời bay lên, vàng; thua: mưa, xanh xám).
- **Bước 2 – Bảng thống kê**: 2 đội, mỗi dòng: tướng, tên, K/D/A, sát thương gây ra, sát thương nhận, vàng, 6 ô đồ, **điểm trận** (0–16, xem `08`). Người MVP có nhãn "MVP" vàng; MVP đội thua có nhãn "MVP" bạc.
- Tab: Tổng quan / Sát thương / Biểu đồ vàng theo thời gian.
- **Bước 3 – Thay đổi hạng** (nếu đấu hạng): sao được/mất bay vào/ra khỏi huy hiệu, thanh điểm bậc tăng, điểm Hào Quang +/−.
- Nếu là MVP đội thua và có **Bùa Giữ Sao** trong kho: popup hỏi "Dùng Bùa Giữ Sao để không bị trừ sao?" [Dùng] [Bỏ qua].
- Nút: Tiếp tục → Nhận thưởng.

## 11. Nhận thưởng (theo ảnh 2)
- Nền mờ tối có hạt sáng.
- Tiêu đề lớn **"Nhận thưởng thành công"** giữa trên, đường trang trí hai bên + hoạ tiết mũi nhọn ở giữa.
- Hàng `RewardTile` căn giữa (tối đa 5/hàng), từng ô bật vào lần lượt 120ms.
- Chạm vào một ô: `Tooltip` bên trên: icon nhỏ, tên (vd. "Bùa Giữ Sao (MVP thua)"), "Hiện sở hữu: 3", mô tả, thời hạn.
- Dưới cùng: thanh bo tròn **"Chạm vào khoảng trống để tiếp tục."**

## 12. Các màn khác (ngắn gọn)
- **Tướng**: lưới đầy đủ + bộ lọc vai; chi tiết tướng có tab Kỹ năng (video/mô phỏng nhỏ), Chỉ số (biểu đồ radar: Sống sót, Tấn công, Kỹ năng, Độ khó), Trang phục, Cốt truyện.
- **Bùa**: chọn trang, 3 hàng 5 ô, danh sách bùa bên phải, tổng chỉ số dưới cùng, đổi tên trang.
- **Nhiệm vụ**: tab Ngày / Tuần / Mùa, thanh tiến độ, nút Nhận.
- **Kho đồ**: lưới vật phẩm theo loại, chạm xem chi tiết/dùng.
- **Lịch sử**: 20 trận gần nhất, chạm xem bảng thống kê.
- **Cài đặt**: Âm thanh (nhạc, hiệu ứng), Đồ hoạ (chất lượng, FPS 30/60, hạt), Điều khiển (kích thước nút, độ trong suốt, vị trí nút có thể kéo đổi, độ nhạy joystick, tự nâng kỹ năng, tự mua đồ, ưu tiên mục tiêu: máu thấp nhất / gần nhất), Ngôn ngữ, Xuất/Nhập mã lưu, Xoá dữ liệu.

## 13. Âm thanh giao diện
- Chạm nút: tick ngắn. Nút chính: âm "đồng" nhẹ. Tìm thấy trận: tiếng chiêng. Chọn tướng: câu thoại ngắn tự viết (text + âm hiệu ứng, lồng tiếng sau).
