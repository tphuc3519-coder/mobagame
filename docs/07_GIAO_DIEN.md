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
>
> **Cập nhật GĐ2 (20/10):** 5v5 (đấu thường + đấu hạng) có **chọn vị trí** ở phòng chờ (vị trí chính / phụ / Tuỳ ý — `ui/roleSelect.js`),
> lúc tìm thấy trận chia vị trí cho cả 10 người; chọn tướng thường ghi vị trí từng dòng, xếp tướng Đề cử lên đầu. **Đấu hạng luôn qua màn
> Cấm/chọn** (`ui/draft.js`, luật thuần `ui/draftRules.js`): dưới Hải Đăng thứ tự rút gọn 2 cấm mỗi bên, từ Hải Đăng đủ 3 cấm như §7.3;
> sau lượt chọn cuối 15 giây chuẩn bị (phép bổ trợ, bảng bùa). Vị trí đi thẳng vào dựng đội trong trận (`sim/lineup.js`).

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
- **Đã làm (GĐ2):** đấu hạng mọi bậc đều cấm/chọn; dưới Hải Đăng dùng thứ tự rút gọn: cấm `X1, Đ1, X2, Đ2`, chọn `X1 | Đ1 Đ2 | X2 X3 |
  Đ3 Đ4 | X4 X5 | Đ5` (2 cấm mỗi bên, chọn rắn 1-2-2-2-2-1, 14 tướng), từ Hải Đăng đúng bảng trên (3 cấm, 16 tướng). Người chơi luôn ở đội Xanh (chọn trước), ghế ngẫu nhiên;
  lượt cấm thứ k của một đội do ghế k làm. Không đổi tướng trong đội (đồng đội là máy) — pha chuẩn bị 15 giây chỉ đổi phép / bùa. Máy cấm/chọn
  ở `ui/draftRules.js` (thay cho `draftBot.js`), số liệu ở `data/draft.js`.

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
- **Nút phụ**: Biến về, Hồi Máu (hồi 15% HP trong 3s, hồi chiêu 60s, tướng địch đánh trúng thì mất hiệu ứng — hiện "Mất hồi máu"), phép bổ trợ.
- **Đồ kích hoạt: tối đa 2 nút** (chỉ hiện khi có món), nút thứ hai xếp trên nút thứ nhất (hàng nút đáy không dài ra, không đè thanh máu);
  phím **E** = nút 1, **Q** = nút 2. Đồ có hướng (Lụa Gió) kéo để ngắm như Chớp Bước; đồ khoá mục tiêu (Xích Giữ) giữ nút thì hiện vòng tầm +
  dấu vàng ở tướng sẽ bị xích. Giữ yên ~0,35s xem mô tả. Bị khống chế / áp chế / đang niệm giữ xích: các nút xám lại.
- **Chiêu khoá mục tiêu**: chạm nhanh dùng mục tiêu đang khoá (dấu đỏ); kéo thì dấu vàng xem trước đúng tướng sẽ bị chọn và thả ra gửi đúng
  tướng đó.
- **Chữ trên đầu**: `ÁP CHẾ` (tím, ưu tiên nhất), `CHOÁNG` / `HẤT TUNG` / `TRÓI` / `KHIÊU KHÍCH` / `CÂM` (vàng), `KHÔNG THỂ CẢN` (vàng cam,
  khi không có khống chế). Đang niệm giữ xích: thanh tím rút dần dưới thanh mana. Bấm chiêu / đồ không được: chữ nổi lý do trên đầu mình
  (Không có mục tiêu · Đang bị áp chế · Đang giữ chiêu · Không thể lướt · Đang bị trói · Đang bị khống chế).
- **Ping và chat nhanh**: nút ping mở vòng tròn 4 lệnh: Tấn công / Rút lui / Tập hợp / Cẩn thận. Chat nhanh: danh sách câu soạn sẵn.
- **Thông báo hạ gục giữa phía trên** (`hud/killBanner.js`, như Liên Quân): mọi lần tướng chết — đội ta hạ (dải xanh) hay đội địch hạ
  (dải đỏ). Vệt sáng quét ngang mở màn → dải: chân dung người hạ (viền màu đội) — tiêu đề — chân dung bị hạ (vạch chéo đỏ quẹt qua),
  người hỗ trợ là chân dung nhỏ dưới người hạ. Tiêu đề: Chiến công đầu; Double / Triple / Quadra / Penta Kill (chữ lớn vàng, tia sáng —
  người chơi yêu cầu dùng tên tiếng Anh thay cho "Song Sát…"); chuỗi hạ gục Liên tục hạ gục → Hủy diệt → Không thể cản phá → Thần thánh →
  Truyền thuyết; Chặn đứng; "Bị hạ gục" kèm biểu tượng trụ / lính / quái khi không ai được mạng; hạ mục tiêu lớn. Hàng đợi ~2,4 giây mỗi
  thông báo, dồn thì rút ngắn. Vàng nhận được hiện "+N" kèm đồng vàng trên đầu tướng mình.
- **Thanh máu trên đầu**: tướng (máu có vạch mỗi 100 HP, khiên màu trắng, mana xanh dương mảnh, cấp trong ô tròn, tên người chơi); lính/quái (thanh nhỏ); công trình (thanh dày).
- **Màu**: bản thân viền vàng; đồng minh xanh ngọc; địch đỏ.
- **Khi chết**: màn xám nhẹ, đồng hồ hồi sinh lớn ở giữa, vẫn mở được cửa hàng.
- **Tạm dừng** (offline): nút ≡ → Tiếp tục / Cài đặt / Đầu hàng (5v5 sau 8:00) / Thoát.

### 9.1 Cài đặt điều khiển trong trận
Kho cài đặt `src/core/prefs.js` (bảng Cài đặt kiểu Liên Quân). Mọi mục đọc lúc dùng hoặc nghe `onPref` → đổi giữa trận áp dụng ngay.
Mặc định giữ đúng cách chơi cũ, trừ chỗ ghi **mới**. Mỗi nút / ngón giữ lượt riêng: 5 ngón cùng lúc (cần + Đánh + kỹ năng + phép + camera) vẫn chạy.
- **Lệnh di chuyển** `stick` (`hud/joystick.js`, vẽ ở `hud/hud.js`): `follow` — chạm bất kỳ ở 45% trái là cần dời tới chỗ chạm;
  **mới**: kéo quá bán kính 90 px thì đế cần trượt theo ngón (đổi hướng không phải kéo ngược cả đoạn). `fixed` — đế đứng yên ở vị trí nghỉ
  góc trái dưới, hướng = ngón − tâm đế (chạm chỗ nào trong 45% trái cũng được).
- **Độ nhạy xoay chiêu** `aimSens` 0..1 (`hud/aimPad.js`): kéo hết tầm = 150 − 80 × độ nhạy px (0 → 150, 0,5 → 110 như cũ, 1 → 70); vòng
  ngắm to/nhỏ theo. Dùng cho kỹ năng, phép có hướng và kéo nút Đánh.
- **Vị trí xoay chiêu** `aimAt`: `button` vòng ngắm quanh tâm nút (như cũ) | `finger` tâm vòng ngắm ở chỗ ngón vừa chạm.
- **Huỷ chiêu** `cancelBy`: `zone` kéo vào ô X góc phải (như cũ) | `distance` kéo ngón xa tâm vòng ngắm quá 1,6 × độ kéo hết tầm → vòng đỏ,
  chỉ báo đỏ, chữ "Thả để huỷ" trên vòng; ô X ẩn.
- **Phương pháp tung chiêu** `castMode`: `aim` kéo để ngắm, chạm nhanh tự ngắm (như cũ) | `auto` (Tân thủ) chạm xuống là ra chiêu tự ngắm,
  không vòng ngắm. Không áp dụng cho phép bổ trợ.
- **Hướng tốc biến** `flashDir` — Chớp Bước (và phép có hướng) chạm nhanh không kéo, kể cả phím F: `move` hướng đang chạy, đứng yên thì hướng
  đang nhìn (gửi `aim: null`, mô phỏng tự chọn như cũ) | `skill` hướng của lần kéo ngắm kỹ năng / Chớp Bước gần nhất | `enemy` về phía tướng
  địch thấy được gần nhất trong 1200. Không có thì như `move`. Mô tả khi giữ nút phép ghi cách đang dùng.
- **Chế độ công chỉ định** `atkMode` (`hud/skillButtons.js`, `hud/atkTarget.js`): `farm` nút Đánh + Ăn lính + Đẩy trụ (như cũ) | `auto` chỉ
  một nút Đánh (phím K/L vẫn dùng được) | `manual` (Tự chọn mục tiêu) chỉ nút Đánh; **chạm nhanh vào một địch trong cảnh 3D** để khoá: không
  tính ngón đang là cần di chuyển (45% trái khi cần đang rảnh), chạm phải ngắn (< 0,45s, xê dịch < 14 px — kéo vẫn là vuốt camera nếu
  `camMode` cho phép); chọn đơn vị địch thấy được có hình chiếu (đoạn chân → đỉnh) gần chỗ chạm nhất trong 60 px, theo camera lúc chạm xuống.
  Chạm đất trống = bỏ khoá. Mục tiêu khoá đi kèm mọi lệnh đánh (`preferTarget`): mô phỏng đánh nó trước khi nó còn trong tầm. Tự bỏ khoá khi
  mục tiêu chết / khuất / xa quá 1800, khi đổi `atkMode` hay tắt `preciseAtk`.
- **Lựa chọn mục tiêu** `targetBy` — chỉ đòn đánh thường của tướng người chơi, tính trong mô phỏng: có tướng địch trong tầm đánh thì chọn
  `pct` % máu thấp nhất | `hp` máu thấp nhất | `near` gần nhất (bằng nhau thì gần hơn); không có tướng nào thì như cũ (`nearestEnemy`: lính /
  trụ / quái gần nhất). Mục tiêu khoá trong tầm luôn trước; nút Ăn lính / Đẩy trụ và khiêu khích không đổi. Gửi bằng lệnh
  `{ type: 'targetBy', value }` lúc vào trận và mỗi lần đổi (`sim/commands.js` → `e.targetBy` → `sim/targeting.js pickByRule`); bot không
  gửi nên trận toàn bot / băm tất định không đổi (`tools/t_target.mjs`). Mặc định `pct` = **mới**: trước đây không ưu tiên tướng.
- **Đánh thường chính xác** `preciseAtk`: kéo nút Đánh → vòng ngắm như kỹ năng + vùng tầm đánh + 200 trên đất; địch gần hướng kéo nhất (lệch
  ≤ 60°, trong tầm + 200) có dấu vàng, đang giữ thì đánh luôn nó khi nó trong tầm. Thả: khoá nó (như `manual`), nó trong tầm thì còn đánh tới
  khi ra một đòn (tối đa một nhịp đánh); kéo về phía không có địch rồi thả = bỏ khoá; huỷ (ô X / kéo xa) như kỹ năng. Chạm / giữ không kéo như cũ.
- **Hiển thị mục tiêu chỉ định** `targetMark` (`render/indicators.js mark`): vòng cam đứt nét xoay dưới mục tiêu đang bị đánh thường
  (`swingTarget`, lúc giữ đánh / vừa vung). Mục tiêu khoá luôn có vòng đỏ 3 mũi chụm vào + mũi chữ V lơ lửng trên tên (phản hồi của việc chọn,
  không phụ thuộc mục này); địch đang chọn khi kéo nút Đánh: cùng dấu, màu vàng.
- **Camera** `camMode` (`hud/camLook.js`): `off` ẩn nút mắt + tắt vuốt (còn giữ bản đồ nhỏ) | `hold` chỉ nút mắt | `slide` nút mắt + vuốt vùng
  trống nửa phải (như cũ). **Tốc độ camera** `camSpeed` 0..1: độ lệch tối đa và tốc độ trượt khi kéo × (0,5 + tốc độ) (0,5 = như cũ).
- **Góc quay theo định vị** `camAim`: đang ngắm kỹ năng / Chớp Bước có tầm > 700 thì camera trượt dần về nửa đường tới chỗ ngắm; thả ra về tướng.
- Nút kỹ năng (Cài đặt → Giao diện): **Thời gian hồi số thập phân** `cdDecimal` — số lẻ khi dưới 10s (như cũ), tắt thì làm tròn lên giây (cả
  nút phép); **Miêu tả chiêu trong trận** `skillTips` — giữ yên nút kỹ năng ≥ 0,35s hiện mô tả (tên, cấp, `ui/skilltext.js`), thả ra không dùng
  chiêu, kéo tiếp thì vẫn ngắm như thường (**mới**, mặc định tắt như Liên Quân — bật thì giữ lâu rồi thả không còn tự tung chiêu); **Miêu tả nút chiêu** `skillNames` — tên chiêu dưới K1–K3.

## 10. Kết quả trận
- **Bước 1 – Chiến thắng / Thất bại**: chữ lớn đổ bóng + hiệu ứng (thắng: đèn trời bay lên, vàng; thua: mưa, xanh xám).
- **Bước 2 – Bảng thống kê**: 2 đội, mỗi dòng: tướng, tên, K/D/A, sát thương gây ra, sát thương nhận, vàng, 6 ô đồ, **điểm trận** (0–16, xem `08`). Người MVP có nhãn "MVP" vàng; MVP đội thua có nhãn "MVP" bạc.
- Tab: Tổng quan / Sát thương / Biểu đồ vàng theo thời gian.
- **Bước 3 – Thay đổi hạng** (nếu đấu hạng): sao được/mất bay vào/ra khỏi huy hiệu, thanh điểm bậc tăng, điểm Hào Quang +/−.
- Nếu là MVP đội thua và có **Bùa Giữ Sao** trong kho: popup hỏi "Dùng Bùa Giữ Sao để không bị trừ sao?" [Dùng] [Bỏ qua].
- Nút: Tiếp tục → Nhận thưởng.

> **Đã làm (GĐ3, 20/10):** trước màn kết quả, camera lướt tới nhà chính bên thua rồi nổ (kể cả khi đầu hàng) — nhà chính nằm nửa trên màn,
> băng-rôn CHIẾN THẮNG / THẤT BẠI giữa màn không che. Màn bảng tỉ số có thẻ **Giản lược** (điểm, K/D/A, vàng) và **Chi tiết**: mỗi người 3 ô
> phần trăm có thanh — **Sát thương tướng**, **Gánh chịu** (mỗi đội cộng đúng 100%), **Tham gia** (1v1: **Tỉ lệ hạ**, tính trên cả trận),
> số tuyệt đối nhỏ bên dưới, người cao nhất đội tô vàng, cột trang bị (ẩn ở màn hẹp). Bảng **Số liệu** thêm Gây ST / Chịu ST / Mục tiêu /
> Hồi-khiên / Lính-quái. **Đấu lại / Sảnh không tải lại trang** (về phòng chờ ~0,3 s). Chưa có: biểu đồ vàng theo thời gian.

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
- **Cài đặt** (`ui/settingsModal.js`, kiểu Liên Quân, ở sảnh và nút bánh răng trong trận): hộp lớn tiêu đề vàng + nút X, cột thẻ bên trái:
  - *Thiết lập đồ hoạ*: thẻ Ưu tiên độ mượt / Cân bằng / Ưu tiên chất lượng / Tuỳ chỉnh; thanh Chất lượng hình ảnh (Mượt → Tối cao),
    Chất lượng chi tiết (Mượt / Cao / Tối cao), FPS (Tiết kiệm pin / Cao), Độ phân giải; bóng đổ, ánh sáng rực, khử răng cưa (Tắt / 2x /
    4x), tự giảm khi giật.
  - *Điều khiển*: đánh thường chính xác, độ nhạy xoay chiêu, camera (Tắt / Giữ / Trượt) + tốc độ, chế độ công chỉ định (Tự đánh / Ăn
    lính + Đẩy trụ / Tự chọn mục tiêu), lựa chọn mục tiêu (% máu / máu / gần nhất), hướng tốc biến mặc định, hiển thị mục tiêu chỉ định,
    phương pháp tung chiêu (hỗ trợ xoay / tự nhắm), vị trí xoay chiêu (nút / ngón tay), huỷ chiêu (vùng / cự ly), góc quay theo định vị,
    lệnh di chuyển (cần đi theo / cố định).
  - *Thiết lập giao diện*: vị trí cửa hàng, đồ đề cử, mô tả trang bị, thông số mục tiêu, khung camera trên bản đồ nhỏ, thời gian hồi số
    thập phân, ảnh tướng khi tung chiêu cuối, tướng địch ở rìa màn hình, FPS, miêu tả chiêu (giữ nút), tên chiêu dưới nút.
  - *Thiết lập*: góc camera Gần / Xa, độ sáng 5 nấc, hiệu ứng thông báo (bảng hạ gục), hiệu ứng sương mù; ở sảnh: xoá dữ liệu. (Mục
    "Viền" nhân vật đã bỏ cùng viền nhân vật — 02 §13.3.)
  - *Âm thanh*: âm thanh nền — nhạc sảnh + âm nền trận (bật/tắt + âm lượng), hiệu ứng âm thanh (bật/tắt + âm lượng), tiếng thông báo trong trận.
  - *Dữ liệu*: tiết kiệm dữ liệu (không tải trước model mọi tướng khi ở sảnh).
  - Trong trận: nút **Đầu hàng** ở chân hộp (đấu hạng từ phút 8; chạm hai lần để xác nhận).
  - Không làm (chưa có chơi trực tuyến): trò chuyện, mic, ping nhanh, like / nhận lỗi trong trận, tự từ chối đầu hàng, mạng WIFI + 3G/4G.

## 13. Âm thanh (kỹ thuật: 02 §13.11)
- **Sảnh**: nhạc nền ngũ cung (đàn tranh, sáo trúc, trống) ở sảnh / phòng chờ / chọn tướng / đội hình, tắt dần ở màn tải trận. Chạm nút:
  tiếng gỗ ngắn; nút chính (Bắt đầu, Chấp nhận, Đấu lại): chuông ba nốt; mở bảng: lướt + chuông; quay lại: nốt đi xuống; đổi thẻ: chuông nhỏ;
  chọn tướng: lướt + chuông; chuyển màn: tiếng lướt gió. **Tìm thấy trận**: trống + kèn đồng + chuông; **khoá tướng**: tiếng đập kim loại +
  hợp xướng; đồng đội khoá: chuông nhỏ; 5 giây cuối chưa khoá: tích tắc; màn đội hình: **VS** (vút lên + đập + kèn); kết quả: lướt giữa
  các màn, tiếng phần thưởng (đồng xu + lấp lánh).
- **Trận**: âm nền nhỏ (gió đồng, lá xào xạc, chim hót thưa, suối xa — theo công tắc Âm thanh), vào trận (tù và + trống), đợt lính đầu tiên (tù và), đánh thường theo vũ khí từng tướng (vung nặng/nhẹ, bắn cung, bắn phép),
  tiếng trúng (thịt, chém, giáp, phép, chuẩn, chí mạng), chiêu theo nguyên tố (lửa, nước, lá, gió, ánh sáng, huyền bí, đất) + chiêu cuối,
  lướt, choáng, hất tung, khiên, hồi máu / Hồi Máu bị cắt, phép bổ trợ, Trừng Trị, trụ bắn / trúng, lính, quái, chết, phá trụ, boss gầm,
  vàng, mua đồ, lên cấp, về thành, hồi sinh, nhặt cục máu; nhạc báo hạ gục / chiến công đầu / hạ liên tiếp (cao dần theo số mạng) /
  chặn đứng / bị trụ hạ; chiến thắng / thất bại.
