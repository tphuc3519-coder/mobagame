# 08 — Xếp hạng và Tiến trình

Mọi tên bậc, tên điểm, tên vật phẩm ở đây là **tự đặt**, không dùng tên của game khác.

## 1. Bậc hạng (`data/ranks.js`)

| # | Bậc | Phân hạng | Sao mỗi phân hạng | Huy hiệu (ý tưởng) |
|---|---|---|---|---|
| 1 | **Đèn Dầu** | III, II, I | 3 | Đèn dầu đất nung, ngọn lửa nhỏ |
| 2 | **Đèn Lồng** | IV → I | 4 | Đèn lồng giấy đỏ |
| 3 | **Đèn Kéo Quân** | IV → I | 4 | Đèn xoay có bóng người |
| 4 | **Đèn Trời** | V → I | 5 | Đèn trời bay có vệt lửa |
| 5 | **Hải Đăng** | V → I | 5 | Ngọn hải đăng có tia sáng quét, cánh bạc |
| 6 | **Sao Mai** | V → I | 5 | Ngôi sao 8 cánh, khiên vàng |
| 7 | **Nguyệt Quang** | – | tích sao không giới hạn | Trăng lưỡi liềm ôm khiên, cánh bạch kim |
| 8 | **Thái Dương** | – | từ 30 sao Nguyệt Quang trở lên | Mặt trời nhiều tầng tia |
| 9 | **Thiên Hà** | – | Top 50 Thái Dương theo điểm Hào Quang | Xoáy thiên hà tím |

- Thắng: +1 sao. Thua: −1 sao. Đủ sao lên phân hạng kế tiếp (phân hạng I → bậc kế tiếp).
- Không rớt bậc lớn từ phân hạng thấp nhất của bậc (có "sàn bậc") cho tới Hải Đăng; từ Hải Đăng trở lên rớt được.
- Đèn Dầu và Đèn Lồng: **thua không mất sao** (bảo vệ người mới).
- **Chuỗi thắng**: thắng 3 trận liền trở lên và dưới Nguyệt Quang: +1 sao thưởng.

### Điểm tích luỹ bậc (thanh `60/100`)
- Mỗi trận hạng cộng điểm tích luỹ theo điểm trận: thắng `+10 + điểm trận`, thua `+ điểm trận / 2`.
- Đầy 100: **đổi 1 sao** (thắng) hoặc **giữ sao 1 lần** (tự dùng khi thua kế tiếp). Người chơi chọn chế độ trong popup lần đầu.

### Điểm Hào Quang (`1997/2000`)
- Điểm ẩn/hiện dùng cho bảng xếp hạng và để tính Thiên Hà. Bắt đầu 1000 khi vào Nguyệt Quang.
- Thắng `+15 + (điểm trận − 8)`, thua `−15 + (điểm trận − 8)/2`, giới hạn ±25/trận.
- Mốc 2000 ("1997/2000" trong UI): đạt thì mở danh hiệu "Hào Quang Chói Sáng" và khung avatar mùa.
- "Thăng hạng Top 100 khu": offline sinh bảng 100 người chơi ảo có điểm phân bố chuẩn quanh 2800 (σ = 300) cố định theo seed mùa; hiển thị điểm người chơi / điểm người thứ 100.

## 2. Điểm trận và MVP

Điểm trận (0–16, 1 chữ số thập phân), tính khi kết thúc:
```
kda   = (K + 0.7·A) / max(1, D)
part  = (K + A) / max(1, tổng hạ gục đội)            // tham gia giao tranh
dmg   = sát thương lên tướng / max sát thương đội
tank  = sát thương gánh chịu / max của đội
gold  = vàng / max vàng đội
obj   = (sát thương công trình + sát thương mục tiêu lớn) / max của đội
heal  = (hồi máu + khiên cho đồng minh) / max của đội

score = 2 + 3·min(kda,6)/6 + 3·part + 2·dmg + 1.5·tank + 1.5·gold + 1.5·obj + 1.5·heal
       (thắng: +1; giới hạn 16)
```
- **MVP**: điểm cao nhất đội thắng. **MVP đội thua**: điểm cao nhất đội thua.
- Nhãn phụ trên bảng kết quả (≥ 1 điều kiện): "Sát Thủ" (nhiều hạ gục nhất), "Tường Thành" (gánh nhiều nhất), "Ánh Sáng" (hồi/khiên nhiều nhất), "Phá Thành" (sát thương công trình nhiều nhất).

## 3. Vật phẩm bảo vệ

| id | Tên | Tác dụng | Nguồn | Thời hạn |
|---|---|---|---|---|
| bua_giu_sao_mvp | Bùa Giữ Sao (MVP thua) | Dùng sau trận thua khi là MVP đội thua: không bị trừ sao | Nhiệm vụ ngày, rương | 24 giờ kể từ khi nhận, chỉ trong mùa |
| bua_giu_sao | Bùa Giữ Sao | Dùng sau trận thua bất kỳ: không bị trừ sao | Rương tuần | Hết mùa |
| the_x2_sao | Thẻ Nhân Đôi Sao | Dùng trước trận hạng: thắng được +2 sao | Phần thưởng mùa | 7 ngày |

Ô vật phẩm có nhãn **"Có hạn"** khi có thời hạn. Hết hạn tự xoá khỏi kho.

## 4. Mùa giải
- Mùa dài **120 ngày** (cấu hình). Tên dạng `S{n} {năm}`.
- Đếm ngược "Thời hạn mùa giải" theo đồng hồ thiết bị (offline).
- **Hết mùa**: phần thưởng theo bậc cao nhất đạt được (khung avatar, xu, trang phục mùa), rồi **reset mềm**:

| Bậc cuối mùa | Bắt đầu mùa sau |
|---|---|
| Đèn Dầu → Đèn Kéo Quân | Giữ nguyên |
| Đèn Trời | Đèn Kéo Quân I |
| Hải Đăng | Đèn Trời III |
| Sao Mai | Hải Đăng V |
| Nguyệt Quang trở lên | Sao Mai V |

- **Trang phục mùa**: nhận sau khi hoàn thành **10 trận hạng thắng** trong mùa (`10/10`). Trang phục là phối màu/phụ kiện riêng cho một tướng được chọn trước mùa.
- **3 vòng tướng thành thạo** (dưới huy hiệu): hoàn thành khi thắng 5 trận hạng với 3 tướng khác nhau; thưởng khung huy hiệu.
- **Đấu Đỉnh Cao**: chỉ mở 19:00–24:00 (giờ thiết bị), yêu cầu Nguyệt Quang; luật cấm/chọn đầy đủ, bot độ khó Ác mộng, thắng +1.5 lần điểm Hào Quang.
- **Hành trình đỉnh cao**: danh sách phần thưởng mở theo bậc (Đèn Trời: 500 Xu, Hải Đăng: khung, Sao Mai: hiệu ứng về nhà, Nguyệt Quang: trang phục…).

## 5. Tiền tệ và tiến trình tài khoản
| Tiền tệ | Dùng để | Nguồn |
|---|---|---|
| **Xu Đèn** | Mở tướng (5.000–13.000), mở bùa, trang phục cơ bản | Mỗi trận (thắng 120, thua 60, ×1.2 đấu hạng), nhiệm vụ |
| **Mảnh Tướng** | Đổi tướng/trang phục trong cửa hàng mảnh | Rương, trùng lặp |
| **Gạo Hội** | Vật phẩm sự kiện, đổi quà sự kiện | Nhận thưởng sự kiện (vd. ảnh 2 hiện "Gạo ×8") |

- **Cấp tài khoản**: KN tài khoản = 60 mỗi trận thắng, 40 mỗi trận thua. Cấp 1–30. Mở Đấu hạng ở cấp 6 (offline có thể bỏ qua trong cài đặt).
- **Tướng khởi đầu**: 6 tướng Alpha (Mossback, Emberforge, Bamboo Shade, Moonstream, Kitewing, Lanternward). Các tướng khác mở bằng Xu Đèn hoặc tuần miễn phí (4 tướng xoay vòng mỗi tuần theo seed).
- **Rương**: "Đấu tiếp N trận sẽ nhận được rương" — mỗi 3 trận (bất kỳ chế độ) được 1 rương thường: Xu Đèn 50–200, Mảnh Tướng 1–5, 15% ra Bùa Giữ Sao (MVP thua).

## 6. Nhiệm vụ (`data/missions.js`)
- **Ngày** (làm mới 04:00 giờ thiết bị): 3 nhiệm vụ ngẫu nhiên có seed theo ngày, ví dụ: "Chơi 2 trận", "Hạ gục 10 tướng", "Thắng 1 trận với Xạ thủ", "Phá 3 trụ".
- **Tuần** (làm mới thứ Hai): 4 nhiệm vụ lớn hơn.
- **Sự kiện tích luỹ** (banner "Tham gia sự kiện tích luỹ 0/3"): tham gia 3 trận trong thời gian sự kiện → nhận Gạo Hội.

## 7. Dữ liệu lưu (trích)
```js
{
  version: 1,
  profile: { name, avatarId, frameId, level, xp, showcaseHero },
  currency: { xu: 0, manh: 0, gao: 0 },
  heroesOwned: ['thach_quy', ...], skinsOwned: [],
  charms: { owned: {...}, pages: [{ name, slots: { red:[...5], blue:[...5], gray:[...5] } }], defaultByHero: {} },
  rank: { season: 4, tier: 5, division: 4, stars: 4, progress: 60, aura: 1997,
          peakTier: 5, winStreak: 0, seasonWins: 10, masteredHeroes: [...] },
  inventory: [{ id: 'bua_giu_sao_mvp', count: 3, expiresAt: 1790000000000 }],
  missions: { daily: {...}, weekly: {...}, event: {...} },
  history: [{ seed, mode, heroId, result, k, d, a, score, date }],
  settings: {...}
}
```
Thời gian thực (`Date.now()`) chỉ dùng ở tầng tiến trình và UI, **không** dùng trong mô phỏng trận.
