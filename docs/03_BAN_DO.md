# 03 — Bản đồ

Tất cả toạ độ tính bằng đơn vị thế giới, gốc (0,0) ở góc trên trái. Đây là **toạ độ gợi ý**, được phép chỉnh khi chơi thử nhưng phải giữ đối xứng.

Ảnh xem trước bố cục: `map_5v5_preview.png` (chụp `tools/mapplan.html` — bố cục đang chạy, 17/11/2026), `map_1v1_preview.png`. Ô vuông xanh / đỏ = trụ hai đội, vòng = tầm trụ, chấm vàng = trại quái, chấm cam = mục tiêu lớn, nét tím = vách hang, chấm vàng kim = cột đá đèn (cổng rừng, cổng hang), nét tối = khối đá / bờ rào, ô xanh lá sẫm = bụi cỏ, xanh lam = nước (đúng hình sông).

---

## A. Bản đồ 5v5 — "Đấu Trường Đèn Cả"

### A1. Khung
- Kích thước **6400 × 6400**.
- Đội Xanh (team 0) góc **dưới trái**, đội Đỏ (team 1) góc **trên phải**.
- **Đối xứng qua đường chéo y = x:** mọi vật thể của Đỏ = vật thể tương ứng của Xanh với `(x, y) → (y, x)`. Code chỉ khai báo phía Xanh + vật thể trung lập, rồi sinh phía Đỏ bằng hàm `mirror()`.
- **Sông** chạy theo đường chéo từ (700,700) tới (5700,5700), rộng 500 (hẹp 400 ở hai đầu), uốn chữ S tránh hai hang lớn nằm trong hõm bờ hai bên (xem *Bản đang chạy* ở A8). Mục tiêu lớn và vật thể trung lập ở quanh trục này.

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

**Cục máu sau trụ ngoài** (`sim/orbs.js`, `ARENA.orbs`; tạo hình `render/orbs.js`): mỗi đội 3 cục, cách trụ ngoài mỗi đường 560 về phía
nhà, trên đường lùi. Tướng phe đó chạm vào (bán kính 120) khi thiếu máu hoặc năng lượng → hồi ngay 15% HP + 15% năng lượng tối đa; mọc
lại sau 60s (vòng sáng trên đất chạy đếm ngược). Tướng địch không lấy được; đi ngang lúc đầy máu/năng lượng thì không mất. Bản đồ nhỏ:
chấm xanh lá (mờ khi đang chờ).

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
  - Hố mục tiêu lớn có 2 lối vào từ sông và 1 lối từ rừng mỗi bên. *(Bản đang chạy: hang trong hõm bờ — miệng hang ra sông + cửa sau về rừng phe chủ; xem dưới.)*
- **Bụi cỏ** (phía Xanh, Đỏ = swap): cạnh Đường Đền (1250, 1600), (650, 3100); cạnh Đường Giữa (2050, 3600), (2900, 4050); cạnh Đường Sông (3300, 5150), (4800, 5750); cửa sông (2150, 2750), (3650, 4350). Ngoài ra 2 bụi trung lập giữa sông: (3000, 3450), (3450, 3000). Kích thước bụi 350×220 xoay theo hướng đường gần nhất.
- Tường phải được khai báo sao cho **không chặn** bất kỳ đường nào của lính.

**Bản đang chạy — bố cục 18/11/2026** (`src/data/maps.js` + `src/data/river.js`; toạ độ gốc 6400 × 6400, nhân K = 3 ra đơn vị thế giới;
sơ đồ 2D: `tools/mapplan.html`, `?nav=1` tô thêm ô lưới bị chặn; kiểm bằng số đo: `node tools/t_mapnav.mjs`; thiên lệch phe: `node tools/t_side.mjs`).
Bảng toạ độ A6–A7 ở trên là bản gợi ý ban đầu; số đúng là các số dưới đây.

*Lịch sử.* 17/11: sông thẳng có hai hang đè giữa dòng chặn ngang sông → nắn thành đầm, hang là cù lao trên trục sông, rừng bốn phần tư
có bờ rào + cổng (thay hàng chục tảng đá rời và đá trang trí đi xuyên được). 18/11: chủ dự án gửi ảnh bản đồ 5v5 của một game thương mại,
yêu cầu xây lại "y chang". **Không sao chép màn chơi đó** (quy tắc 8, và chính đề bài ban đầu: "không chép bản đồ có sẵn") — chỉ lấy
CẤU TRÚC chung của thể loại đọc được từ ảnh: rừng + hang đối xứng xoay 180°, mỗi đội một hang trong hõm bờ phía mình, sông uốn tránh hang,
bùa đỏ ở phần rừng có hang của đội đó, bụi dọc bờ sông. Vị trí cụ thể, tên, hình, quái là của game.

*Đối xứng.* Đường + trụ + nhà chính + Suối Đèn đối xứng gương qua trục sông y = x (như cũ — đường Đền của Xanh ↔ đường Đền của Đỏ). Rừng,
sông, bụi, trại, hai hang lớn đối xứng **xoay 180° quanh tâm** `(x, y) → (6400 − x, 6400 − y)`. Phía Xanh khai hai phần tư: rừng Đền
(phần tư mẫu) và rừng Sông = ảnh của rừng Đền qua trục đường Giữa (trụ hai đường cánh của một đội đối xứng qua trục này nên cổng rừng
vẫn rơi đúng khe giữa hai vòng trụ); phía Đỏ = ảnh xoay của cả hai. Hệ quả: bùa xanh của Đỏ nằm ở rừng phía đường Sông, bùa đỏ của Đỏ ở
rừng phía đường Đền (cạnh hang Hổ Lôi).

*Sông* (`data/river.js`, chỉ để nhìn / định hướng — nước không cản, không làm chậm; mô phỏng không đọc):
- Dòng chính rộng 1500, hẹp dần còn 1200 ở hai đầu (chỗ đường cánh băng qua; khoảng 2600 → 5200 tính từ đầu trục).
- **Khúc chữ S**: quanh mỗi hang, tim dòng lệch 650 sang bờ đối diện hang và lòng sông nở thêm 250 mỗi bên, tác động trong ±2600 dọc trục
  (nhân mềm có biên). Bệ hang (bán kính 907 — lấy theo hang lớn hơn cho hai bên đối xứng tuyệt đối) lấn ra lòng sông; nước vẫn chảy liền
  qua trước miệng hang với lòng rộng ≥ 900 (`t_mapnav` đo dọc tim dòng).
- Một hàm `sd(x, y)` (khoảng cách có dấu tới mép nước) dùng chung cho mặt nước (shader `riverGLSL` + dải lưới bám theo tim dòng), lòng sông
  trên nền, cỏ lau / lá sen / đá ven bờ, thác đổ xuống vực, khe tường biên, bản đồ nhỏ, tên vùng "Sông" khi ra tín hiệu, bụi mép nước.

*Hang lớn trong hõm bờ* (`lairWallSegs`, cùng một danh sách đoạn cho va chạm và dựng hình):
- **Hổ Lôi** (2077, 1723) — bờ Đỏ, gần đường Đền (phút 8); **Long Ngư** (4323, 4677) — bờ Xanh, gần đường Sông (phút 2, "rồng" của đường
  đôi Xạ thủ + Trợ thủ). Tâm hang nằm đúng mép dòng chính (cách trục 250 gốc); hai hang là ảnh xoay 180° của nhau.
- Hai vách sườn hình cung (mỗi vách 4 đoạn, cao dần về giữa), **miệng hang** rộng (nửa góc 0,96 rad) mở ra sông — đội kia tới bằng đường sông;
  **cửa sau** hẹp (nửa góc 0,44 rad) mở về rừng phe chủ — đi từ cổng ngoài đường cánh vào tới cửa sau ~1 150. `t_mapnav` kiểm: tâm hang trên đất,
  trước miệng là nước, sau cửa là đất liền; chặn tạm từng lối trên lưới đường đi vẫn vào được qua lối kia.
- Bốn cột đá đèn ở bốn đầu vách đánh dấu hai lối vào (cùng kiểu cột cổng rừng), đèn mang màu nhận diện (`PIT_GLOW`: Long Ngư hổ phách, Hổ
  Lôi lam). Nhận diện thêm bằng chất đá: vách Long Ngư sa thạch ấm + nước quanh hang nở sen dày; vách Hổ Lôi bazan sẫm, nước trống.
- Bùa đỏ của mỗi đội ở phần rừng có hang của đội đó (rừng Sông phía Xanh, rừng Đền phía Đỏ); bụi bãi bờ ngay sau cửa sau hang.

*Một phần tư rừng mẫu* — rừng Đền phía Xanh (toạ độ gốc; rừng Sông phía Xanh = ảnh qua trục đường Giữa, phía Đỏ = ảnh xoay 180°):
- **Bờ rào đường Đền** x = 1180 (dày 300, mép cách mép đường 40), từ mép đầm y 1780 tới tường nhà y 4185, mở **cổng ngoài** y 2120–2340 (giữa
  vòng trụ ngoài và trụ trong) và **cổng trong** y 3265–3485 (giữa trụ trong và trụ nhà). Vào rừng qua cổng không ăn đạn trụ.
- **Bờ rào đường Giữa** song song đường, lùi 380 vào rừng, từ tường nhà (quãng 1480 tính từ nhà chính) tới quãng 2860, mở **cổng đường Giữa**
  quãng 2200–2420 (giữa trụ trong và trụ ngoài).
- **Cột đá đèn lồng** đứng ở hai đầu mỗi cổng (đoạn dài 0 = va chạm tròn, nằm trong đầu bờ rào nên không làm hẹp cổng): 12 cổng toàn bản đồ.
- **Sống đá bờ sông** (tim cách trục sông 460, dày 750, s = (x + y)/2 từ 2330 tới 2480 — lùi khỏi khúc sông uốn tránh hang bờ bên kia): ngăn
  rừng với sông, chừa hai cửa sông — **bãi bờ** (giữa bờ rào đường cánh và đầu sống đá) và **cửa mũi rừng** (giữa cuối sống đá và trại cóc).
- **Ba phòng trại**, mỗi phòng có cung đá ôm lưng (r = lòng phòng, face = hướng miệng, span = góc ôm):
  bùa (1590, 2900; r 250, mở về đông, span 180 — tựa bờ rào giữa hai cổng), sói (1490, 3935; r 230, mở lên bắc, span 200 — lưng lấp kín góc
  bờ rào / tường nhà, không để túi đất kín), cóc (2274, 3193; r 180, mở về tây bắc, span 140 — mũi rừng, lưng tựa bờ rào đường Giữa).
  Rừng Đền: bùa xanh (Linh Thuỷ); rừng Sông: bùa đỏ (Hoả Nham).
- **Đảo đá giữa ngã ba** (1880, 3330) → (1960, 3450), dày 330 (18/11): chia ngã ba trống giữa ba miệng phòng trại thành hai lối vòng, chỗ
  núp cạnh trại — cách mép phòng bùa ~640, phòng cóc ~510, phòng sói ~1 170, cổng đường Giữa ~800 (thế giới).
- **Bụi**: bãi bờ (1405, 2265) ngay trong cổng ngoài (rừng Đền: nhìn sang hang địch; rừng Sông: ngay sau cửa sau hang mình); cửa mũi rừng
  (2308, 2972); trong cổng đường Giữa (1905, 3760). Không bụi nào trong tầm trụ.
- Lối chính: cổng ngoài → bãi bờ → sông (rừng Đền: sang hang địch qua sông; rừng Sông: thẳng tới cửa sau hang mình); bãi bờ → (giữa phòng bùa và sống đá) → ngã ba giữa rừng; cổng trong → sân giữa phòng bùa
  và phòng sói → ngã ba; cổng đường Giữa → giữa phòng sói và phòng cóc → ngã ba; ngã ba ↔ cửa mũi rừng ↔ sông. Mọi tuyến tới trại / hang /
  cổng rộng ≥ 530 (hẹp nhất là cổng: 660 giữa hai đầu bờ rào).

*Bụi ngoài rừng* (khai phía Xanh, phía Đỏ là ảnh xoay; bám đúng mép nước của sông uốn — `bankBush`): hai bụi mép nước ở cửa sông đầu đường Đền
(hai bờ); một bụi mép nước canh lối hông hang Long Ngư (giữa sống đá và vách hang); hai **bãi lau sậy giữa dòng** hai bên chỗ đường Giữa băng
qua sông, chạy dọc dòng chảy (s 2730 ± 210 và 3670 ± 210, bán kính 330 thế giới), hai bên còn lạch nước trống ~420.

*Kiểm thử* `tools/t_mapnav.mjs`: vùng chơi liền một khối, không túi đất kín > 12 ô; độ rộng hẹp nhất của tuyến rộng nhất (maximin) tới từng trại /
hang / cổng ≥ 420; hang trên đất, miệng ra nước, cửa sau về đất, hai lối vào thật; sông liền dòng theo tim dòng uốn, lòng hẹp nhất ≥ 900;
cổng / bụi / trại ngoài tầm trụ; tim ba đường cách mọi khối đá ≥ nửa bề rộng đường − 60; đối xứng xoay 180° tường / bụi / trại / sông; một tướng bán kính 40 đi thật (bước 10 + đẩy khỏi tường như mô phỏng) theo đường A* tới
mọi trại, hang, cổng và nhà địch không kẹt.

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
- Hạ gục tướng: `200 + 20 × (chuỗi hạ gục của nạn nhân, tối đa 5)` vàng; chuỗi chết của nạn nhân từ 3 trở lên giảm 20% mỗi lần, tối thiểu 80 vàng. Hỗ trợ chia 50% giá trị cho những người hỗ trợ (tối đa 150 mỗi người) — đã làm (`ECON.assistGoldShare`).
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
