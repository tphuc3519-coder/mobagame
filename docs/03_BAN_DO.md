# 03 — Bản đồ

Tất cả toạ độ tính bằng đơn vị thế giới, gốc (0,0) ở góc trên trái. Đây là **toạ độ gợi ý**, được phép chỉnh khi chơi thử nhưng phải giữ đối xứng.

Ảnh xem trước bố cục (vẽ tự động từ toạ độ trong file này): `map_5v5_preview.png`, `map_1v1_preview.png`. Chấm ngọc lam = Xanh, đỏ = Đỏ, vòng = tầm trụ, vàng = quái rừng, cam = Hộ Vệ Đèn, tím = Thuồng Luồng, ô xanh lá = bụi cỏ.

---

## A. Bản đồ 5v5 — "Đấu Trường Đèn Cả"

### A1. Khung
- Kích thước **6400 × 6400**.
- Đội Xanh (team 0) góc **dưới trái**, đội Đỏ (team 1) góc **trên phải**.
- **Đối xứng qua đường chéo y = x:** mọi vật thể của Đỏ = vật thể tương ứng của Xanh với `(x, y) → (y, x)`. Code chỉ khai báo phía Xanh + vật thể trung lập, rồi sinh phía Đỏ bằng hàm `mirror()`.
- **Sông** chạy theo đường chéo từ (700,700) tới (5700,5700), rộng 500. Mục tiêu lớn và vật thể trung lập nằm trên trục này.

### A2. Ba đường

| Đường | Vai trò chính | Waypoint của lính Xanh (Đỏ đi ngược lại) |
|---|---|---|
| **Đường Đền** (cạnh trái + cạnh trên) | Đấu sĩ / Đỡ đòn đi một mình | (800,5600) → (800,800) → (5600,800) |
| **Đường Giữa** (chéo) | Pháp sư / Sát thủ | (800,5600) → (5600,800) |
| **Đường Sông** (cạnh dưới + cạnh phải) | Xạ thủ + Trợ thủ | (800,5600) → (5600,5600) → (5600,800) |
| **Rừng** | Sát thủ / Đấu sĩ đi rừng | Các vùng giữa đường và sông |

Độ rộng mỗi đường: 700. Góc cua bo tròn bán kính 500.

### A3. Công trình (phía Xanh; phía Đỏ = swap x,y)

| Công trình | Toạ độ | Ghi chú |
|---|---|---|
| **Nhà chính (Đèn Cả)** | (800, 5600) | Bán kính 220 |
| **Suối Đèn** (điểm hồi sinh) | (350, 6050) | Vùng bán kính 600 |
| Trụ ngoài – Đền | (800, 2500) | |
| Trụ trong – Đền | (800, 3700) | |
| Trụ nhà – Đền | (800, 4700) | |
| Trụ ngoài – Giữa | (2500, 3900) | Nằm trên x + y = 6400 |
| Trụ trong – Giữa | (1900, 4500) | |
| Trụ nhà – Giữa | (1400, 5000) | |
| Trụ ngoài – Sông | (3900, 5600) | |
| Trụ trong – Sông | (2700, 5600) | |
| Trụ nhà – Sông | (1700, 5600) | |

Mỗi đội: **9 trụ + 1 nhà chính**.

### A4. Chỉ số công trình

| Loại | HP | Giáp/KP | Sát thương | Tầm | Tốc bắn | Ghi chú |
|---|---|---|---|---|---|---|
| Trụ ngoài | 4000 | 80/80 | 220 | 750 | 1.0/s | 4 phút đầu nhận ít hơn 40% sát thương |
| Trụ trong | 4500 | 90/90 | 260 | 750 | 1.0/s | Bất tử tới khi trụ ngoài cùng đường vỡ |
| Trụ nhà | 5000 | 100/100 | 300 | 750 | 1.0/s | Bất tử tới khi trụ trong cùng đường vỡ. Hồi 15 HP/s nếu 8s không bị đánh |
| Nhà chính | 7000 | 100/100 | 350 | 850 | 1.2/s | Bất tử tới khi ít nhất 1 trụ nhà vỡ. Hồi 20 HP/s nếu 8s không bị đánh |
| Suối Đèn | – | – | 1000 chuẩn/s | 700 | – | Chỉ bắn địch. Hồi đồng minh 15% HP + mana mỗi giây |

**Luật bắn của trụ và nhà chính:**
1. Mục tiêu mặc định: lính địch gần nhất → tướng địch gần nhất.
2. Tướng địch gây sát thương lên tướng phe mình trong tầm → trụ chuyển sang bắn tướng đó ngay.
3. Bắn liên tiếp cùng một tướng: +30% mỗi phát, tối đa +150%. Reset khi đổi mục tiêu.
4. Sát thương lên lính = 45% HP tối đa của lính (xe đá: 20%).
5. **Chống phá lén:** trụ nhận ít hơn 60% sát thương khi không có lính địch trong bán kính 900 quanh trụ.
6. Khi trụ bị phá: đội phá nhận 100 vàng mỗi người; tướng kết liễu nhận thêm 100. Tướng trong bán kính 1200 nhận 120 KN.
7. Trụ có chỉ báo tầm bắn (vòng tròn mờ) khi tướng địch lại gần 900; vòng đỏ khi đang nhắm vào người chơi.

### A5. Lính

| Loại | HP | Công | Giáp/KP | Tầm | Tốc đánh | Tốc chạy | Vàng | KN |
|---|---|---|---|---|---|---|---|---|
| Lính Kiếm (cận chiến) | 450 | 22 | 10/10 | 120 | 0.8 | 280 | 22 | 32 |
| Lính Cung (đánh xa) | 300 | 32 | 0/10 | 500 | 0.7 | 280 | 17 | 26 |
| Xe Đá (công thành) | 900 | 50 | 30/30 | 600 | 0.5 | 260 | 55 | 65 |
| Lính Đèn Lớn (siêu lính) | 1800 | 90 | 60/60 | 150 | 0.8 | 290 | 40 | 60 |

- Đợt đầu lúc **0:20**, mỗi **30 giây** một đợt ở cả 3 đường.
- Mỗi đợt: **3 Lính Kiếm + 2 Lính Cung**. Mỗi **3 đợt** thêm 1 Xe Đá; sau phút 10, mỗi **2 đợt**.
- Mỗi phút: lính +5% HP, +4% công (tính từ phút 1), tối đa +100%.
- Khi đội A phá trụ nhà của đội B ở một đường, đường đó của đội A thêm **1 Lính Đèn Lớn mỗi đợt**. Phá cả 3 trụ nhà: **2 Lính Đèn Lớn mỗi đợt ở mọi đường**.
- Lính chỉ cho vàng cho tướng kết liễu (last hit); KN chia đều cho tướng phe địch trong bán kính 1000.
- Lính không kết liễu mất 50% vàng (không ai nhận).

### A6. Rừng (phía Xanh; phía Đỏ = swap)

**Rừng trên** (giữa Đường Đền và Đường Giữa, dưới sông) và **Rừng dưới** (giữa Đường Giữa và Đường Sông).

| Bãi quái | Toạ độ | Thành phần | HP | Công | Xuất hiện | Hồi sinh | Thưởng |
|---|---|---|---|---|---|---|---|
| **Tinh Thể Lam** (bùa xanh) | (1500, 3100) | 1 Rùa Ngọc lớn | 2800 | 70 | 0:30 | 90s | 80 vàng, 150 KN, bùa Lam |
| **Lò Hồng Hoả** (bùa đỏ) | (3300, 4900) | 1 Kỳ Đà Lửa lớn | 2800 | 80 | 0:30 | 90s | 80 vàng, 150 KN, bùa Hoả |
| Bầy Đom Đóm | (1300, 2100) | 3 con nhỏ | 500 mỗi con | 25 | 0:30 | 60s | 45 vàng, 70 KN |
| Heo Rừng Nanh Bạc | (2200, 3450) | 1 lớn + 1 nhỏ | 1400 + 500 | 45 | 0:30 | 60s | 55 vàng, 90 KN |
| Bầy Quạ Đá | (4300, 5000) | 3 con nhỏ | 500 mỗi con | 25 | 0:30 | 60s | 45 vàng, 70 KN |
| Nhện Đất | (3000, 4250) | 1 lớn | 1600 | 50 | 0:30 | 60s | 55 vàng, 90 KN |

- Quái rừng tăng +6% HP và +5% công mỗi phút.
- **Bùa Lam** (90s): +10% giảm hồi chiêu, hồi 2% mana tối đa/s, kỹ năng gây sát thương làm chậm 15% trong 1s.
- **Bùa Hoả** (90s): đòn đánh thường đốt 1.5% HP tối đa mục tiêu/s trong 3s (tối đa 60/s với quái) và làm chậm 20% 1s; hồi 1% HP tối đa/s khi ngoài giao tranh.
- Bùa rơi sang tướng hạ gục người đang giữ bùa (thời gian còn lại).
- **Kéo quái:** quái đuổi tối đa 700 từ chỗ đứng; vượt quá thì quay về, hồi đầy máu, không bị đánh trong lúc về.

### A7. Mục tiêu lớn (trung lập, trên trục sông)

| Mục tiêu | Toạ độ | Xuất hiện | Hồi sinh | HP | Thưởng khi hạ |
|---|---|---|---|---|---|
| **Thuồng Luồng** | (4750, 4750), hố bán kính 450 | 2:00 | 3:00 | 6000 (+300/phút) | Mỗi thành viên đội +120 vàng, +150 KN. Đội nhận 1 **Ấn Thuồng Luồng** (mỗi ấn +3% sát thương lên công trình và quái, tối đa 4 ấn) |
| **Thuồng Luồng Cổ** (thay Thuồng Luồng từ phút 12) | (4750, 4750) | 12:00 | 4:00 | 14000 (+400/phút) | Đội nhận **Uy Linh Sông** 150s: +15% sát thương, hồi 1% HP/s ngoài giao tranh; lính cả 3 đường của đội +50% HP, +30% công |
| **Hộ Vệ Đèn** | (1650, 1650), hố bán kính 450 | 4:00 | 3:30 | 7000 (+350/phút) | Đội nhận **Ánh Hộ Vệ** 90s (+12% công và phép) và triệu hồi 1 **Người Đá Đèn** đi đẩy Đường Đền (HP 5000, công 180, ưu tiên trụ) |
| **Cá Chép Vàng** | (2450, 2450) và (3950, 3950) | 1:30 | 2:00 | 1200, chạy trốn khi bị đánh | Người hạ nhận 60 vàng, +30% tốc chạy 3s; đội nhận tầm nhìn bán kính 1000 quanh hố mục tiêu gần nhất trong 60s |

- Mục tiêu lớn **không di chuyển khỏi hố**, có kỹ năng riêng:
  - Thuồng Luồng: quét đuôi hình nón 120° gây sát thương + đẩy lùi mỗi 6s; phun nước theo đường thẳng mỗi 8s.
  - Hộ Vệ Đèn: dậm đất vùng tròn 350 gây choáng 0.5s mỗi 7s; ưu tiên đánh tướng gây nhiều sát thương nhất.
- Phần thưởng của bùa và mục tiêu lớn luôn thuộc **đội có tướng kết liễu**, kể cả khi đội kia gây phần lớn sát thương (cướp bằng Thu Hoạch là hợp lệ).
- Thông báo toàn trận khi mục tiêu lớn xuất hiện (30s trước) và khi bị hạ.

### A8. Địa hình
- **Tường:** khai báo trong `maps/arena5v5.js` dạng hình chữ nhật xoay được và đa giác lồi. Yêu cầu tối thiểu:
  - Tường bao quanh căn cứ, mở 3 cửa đúng hướng 3 đường.
  - Mỗi vùng rừng có 3–5 khối tường tạo lối mòn, mỗi bãi quái có ít nhất 2 lối vào.
  - Hố mục tiêu lớn có 2 lối vào từ sông và 1 lối từ rừng mỗi bên.
- **Bụi cỏ** (phía Xanh, Đỏ = swap): cạnh Đường Đền (1250, 1600), (650, 3100); cạnh Đường Giữa (2050, 3600), (2900, 4050); cạnh Đường Sông (3300, 5150), (4800, 5750); cửa sông (2150, 2750), (3650, 4350). Ngoài ra 2 bụi trung lập giữa sông: (3000, 3450), (3450, 3000). Kích thước bụi 350×220 xoay theo hướng đường gần nhất.
- Tường phải được khai báo sao cho **không chặn** bất kỳ đường nào của lính.

### A9. Nhịp trận mục tiêu
| Mốc | Sự kiện |
|---|---|
| 0:00 | Vào trận, mua đồ khởi đầu, vàng khởi đầu 600 |
| 0:20 | Lính đợt 1; bắt đầu cộng vàng thụ động 4 vàng/s |
| 0:30 | Quái rừng xuất hiện |
| 1:30 | Cá Chép Vàng |
| 2:00 | Thuồng Luồng |
| 4:00 | Hộ Vệ Đèn; hết giáp bảo vệ trụ ngoài |
| 8:00 | Mở đầu hàng (surrender) |
| 12:00 | Thuồng Luồng Cổ |
| 12–18 | Kết thúc trận điển hình |

### A10. Kinh tế và kinh nghiệm (5v5)
- Cấp tối đa **15**. KN cần lên cấp tiếp theo: `120 + 90 × (cấp − 1)`.
- Hạ gục tướng: `200 + 20 × (chuỗi hạ gục của nạn nhân, tối đa 5)` vàng; chuỗi chết của nạn nhân từ 3 trở lên giảm 20% mỗi lần, tối thiểu 80 vàng. Hỗ trợ chia 50% giá trị cho những người hỗ trợ (tối đa 150 mỗi người).
- KN hạ gục: `100 + 30 × cấp nạn nhân`, chia cho người hạ và người hỗ trợ trong bán kính 1200.
- Thời gian hồi sinh: `6 + 2.5 × cấp` giây, sau phút 15 cộng thêm 5s.
- Về nhà: 6s, bị trúng sát thương thì huỷ. Tốc chạy +40% trong 4s sau khi rời Suối.
- Tướng dưới cấp trung bình trận 2 cấp trở lên nhận thêm 20% KN (bắt kịp).

---

## B. Bản đồ 1v1 — "Cầu Đá Đơn"

### B1. Khung
- Kích thước **5600 × 2400**. Một đường ngang ở y = 1200, rộng 900.
- Xanh bên trái, Đỏ bên phải. **Đối xứng qua trục x = 2800:** `(x, y) → (5600 − x, y)`.
- Một khe nước cắt ngang giữa bản đồ ở x = 2800, rộng 400 (chỉ để trang trí, không làm chậm).

### B2. Công trình (Xanh; Đỏ đối xứng)

| Công trình | Toạ độ | HP | Công | Tầm |
|---|---|---|---|---|
| Nhà chính | (600, 1200) | 5000 | 300 | 850 |
| Suối Đèn | (250, 1200) | – | 1000 chuẩn/s | 650 |
| Trụ trong | (1350, 1200) | 3800 | 240 | 750 |
| Trụ ngoài | (2050, 1200) | 3200 | 200 | 750 |

Luật trụ giống 5v5, trừ: không có giáp bảo vệ 4 phút đầu; chống phá lén vẫn áp dụng.

### B3. Lính và rừng
- Đợt đầu 0:15, mỗi **25 giây** một đợt: 3 Lính Kiếm + 1 Lính Cung; mỗi 3 đợt thêm Xe Đá. Chỉ số như 5v5.
- Mỗi bên 2 bãi quái nhỏ: Xanh (1800, 450) Bầy Đom Đóm và (1800, 1950) Nhện Đất; Đỏ đối xứng. Xuất hiện 0:30, hồi sinh 60s.
- **Cá Chép Vàng** ở (2800, 400), xuất hiện 1:00, hồi sinh 90s.
- **Giếng Sen** ở (2800, 2000): hồi 30% HP và 30% mana cho người chạm vào đầu tiên, hồi sinh 60s.
- Bụi cỏ: (2250, 850), (2250, 1550) (mép trong của đường, không chồng lên tường) và đối xứng.
- Tường: hai dải tường dọc đường (y = 700 và y = 1700) có khe hở ở x = 1800 và 3800 dẫn vào bãi quái.

### B4. Luật trận
- Vàng khởi đầu 800. KN và vàng từ lính, quái ×1.3. Cấp tối đa 15.
- Thời gian hồi sinh: `4 + 1.5 × cấp`.
- **Thắng:** phá nhà chính đối phương.
- Tuỳ chọn trong Luyện tập: **Luật nhanh**: thắng khi hạ gục 2 lần **hoặc** phá trụ ngoài trước.
- Thời lượng mục tiêu 6–10 phút.

---

## C. Bản đồ 3D

### C1. Hai giai đoạn
1. **Bản đồ dựng từ dữ liệu (Alpha → Beta):** `render/mapBuilder.js` đọc chính file `maps/*.js` và dựng cảnh: mặt đất (plane lớn có texture cỏ lặp), đường lát đá (dải mesh theo waypoint, bo góc), sông (mặt nước bán trong suốt có vệt sáng trôi), tường (đùn khối từ đa giác, cao 300), bụi cỏ (cụm cỏ instancing), công trình và cây/đá/đèn trang trí rải theo seed. Không cần hoạ sĩ, luôn khớp logic.
2. **Bản đồ vẽ tay (1.0):** hoạ sĩ dựng trong Blender trên **ảnh nền xuất từ `map_*_preview.png`** (đặt đúng tỉ lệ 1 px = 6.4 đơn vị), nướng ánh sáng, xuất `arena5v5_env.glb`. Logic (tường, bụi, toạ độ) **vẫn lấy từ `maps/*.js`**; GLB chỉ để nhìn. Chế độ `?debug=1` vẽ đè tường logic lên để kiểm tra lệch.

### C2. Phong cách
- Đêm hội: đèn lồng treo dọc đường (instancing, phát sáng bằng emissive + bloom ở mức Cao), sông phản chiếu ánh trăng, căn Xanh tông ngọc lam, căn Đỏ tông đỏ son.
- Nhà chính: đèn lồng khổng lồ trên bệ sen, cột sáng lên trời. Trụ: tháp đèn đá, ngọn đèn đổi màu theo đội, chập chờn khi yếu máu, sụp đổ khi vỡ (animation hoặc tách mảnh).
- Ngân sách bản đồ: ≤ 150k tam giác toàn bản đồ, ≤ 60 draw call, 1–2 lightmap 2048.

### C3. Minimap
- Ảnh minimap vẽ sẵn một lần (render cảnh từ trên xuống bằng camera trực giao lúc tải trận, hoặc dùng ảnh do hoạ sĩ làm) + chấm đơn vị vẽ trên canvas HUD mỗi 0.25s.
