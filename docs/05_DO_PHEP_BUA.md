# 05 — Đồ, Phép bổ trợ, Bùa

## 1. Quy tắc cửa hàng
- 6 ô đồ. Mua được **ở bất kỳ đâu** khi còn sống (kiểu mobile). Bán lại được 60% giá.
- Món ghép: giá hiển thị = giá còn thiếu sau khi trừ món thành phần đang có. Mua món ghép tự tiêu món thành phần.
- **Mua nhanh:** góc trái trên HUD hiện 1–2 ô "món kế tiếp" theo build của tướng. Chạm là mua. Thứ tự mua: thành phần rẻ nhất còn thiếu của món kế tiếp trong `recommendedBuild`.
- Có tuỳ chọn **Tự mua đồ** (mặc định tắt cho người chơi, luôn bật cho bot).
- Chỉ được có **1 đôi giày** và **1 món đi rừng**.
- Nội tại "duy nhất" (ghi *Duy nhất*) không cộng dồn khi có 2 món cùng nội tại.

Ký hiệu chỉ số: Công, Phép, HP, Mana, Giáp, KP (kháng phép), TĐ (tốc đánh %), CM (tỉ lệ chí mạng), HM (hút máu), HMP (hút máu phép), GHC (giảm hồi chiêu), XG (xuyên giáp), XKP (xuyên kháng phép), Chạy (tốc chạy phẳng), KHU (kháng hiệu ứng).

## 2. Thành phần (tier 1)

| id | Tên | Giá | Chỉ số |
|---|---|---|---|
| kiem_sat | Kiếm Sắt | 250 | +15 Công |
| riu_dong | Rìu Đồng | 450 | +25 Công |
| gang_tay_da | Găng Tay Da | 300 | +10% TĐ |
| dao_nho | Dao Nhỏ | 350 | +10% CM |
| ngoc_trang | Ngọc Trăng | 300 | +25 Phép |
| sach_co | Sách Cổ | 500 | +45 Phép |
| ngoc_luu_ly | Ngọc Lưu Ly | 300 | +250 Mana |
| tui_hat | Túi Hạt | 300 | +250 HP |
| ao_da | Áo Da | 300 | +20 Giáp |
| ao_lua | Áo Lụa | 300 | +20 KP |
| hat_nang | Hạt Nắng | 400 | +5% GHC, +150 HP |
| giay_co | Giày Cỏ | 250 | +25 Chạy |

## 3. Giày (tier 2, chỉ 1 đôi)

| id | Tên | Giá tổng | Công thức | Chỉ số |
|---|---|---|---|---|
| giay_chien | Giày Chiến | 700 | giay_co + ao_da | +30 Giáp, +60 Chạy, *Duy nhất:* giảm 10% sát thương từ đòn đánh thường |
| giay_toc_chien | Giày Tốc Chiến | 700 | giay_co + gang_tay_da | +25% TĐ, +60 Chạy |
| giay_phap_su | Giày Pháp Sư | 750 | giay_co + ngoc_trang | +75 XKP, +60 Chạy |
| giay_tinh_tam | Giày Tĩnh Tâm | 700 | giay_co + hat_nang | +15% GHC, +60 Chạy |
| giay_kien_nhan | Giày Kiên Nhẫn | 700 | giay_co + ao_lua | +30 KP, +35% KHU, +60 Chạy |

## 4. Đồ hoàn chỉnh

### Vật lý
| id | Tên | Giá | Công thức | Chỉ số | Nội tại |
|---|---|---|---|---|---|
| huyet_kiem | Huyết Kiếm | 1800 | riu_dong + kiem_sat + 1100 | +60 Công, +15% HM | – |
| thuong_pha_giap | Thương Phá Giáp | 2000 | riu_dong + tui_hat + 1250 | +50 Công, +300 HP | *Duy nhất:* +30% XG |
| luoi_huyet_nguyet | Lưỡi Huyết Nguyệt | 2100 | riu_dong + hat_nang + 1250 | +60 Công, +10% GHC | *Duy nhất:* sau khi dùng kỹ năng, đòn đánh kế tiếp gây thêm 100% Công cơ bản dạng VL (CD 2s) |
| cung_gio | Cung Gió | 2000 | gang_tay_da + dao_nho + 1350 | +20 Công, +35% TĐ, +20% CM | *Duy nhất:* đòn đánh +5% tốc chạy 2s, cộng dồn 3 |
| dao_trang_khuyet | Dao Trăng Khuyết | 2300 | kiem_sat + dao_nho + 1700 | +70 Công, +25% CM | *Duy nhất:* sát thương chí mạng +50% |
| bua_than_ren | Búa Thần Rèn | 2200 | kiem_sat + tui_hat + gang_tay_da + 1350 | +35 Công, +20% TĐ, +400 HP | *Duy nhất:* đòn đánh +2% HP tối đa mục tiêu VL |
| mat_na_hoi_sinh | Mặt Nạ Hồi Sinh | 2600 | riu_dong + ao_da + 1850 | +45 Công, +30 Giáp | *Duy nhất:* khi nhận sát thương chí tử, bất tử 2s và hồi 20% HP (CD 120s) |

### Phép
| id | Tên | Giá | Công thức | Chỉ số | Nội tại |
|---|---|---|---|---|---|
| truong_song | Trượng Sông | 2000 | sach_co + ngoc_luu_ly + 1200 | +90 Phép, +10% GHC, +400 Mana | – |
| mu_sam | Mũ Sấm | 2800 | sach_co + sach_co + 1800 | +160 Phép | *Duy nhất:* +30% tổng Phép |
| sach_pha_gioi | Sách Phá Giới | 2100 | sach_co + ngoc_trang + 1300 | +80 Phép | *Duy nhất:* +40% XKP |
| nhan_huyet_phach | Nhẫn Huyết Phách | 2000 | sach_co + tui_hat + 1200 | +90 Phép, +250 HP, +15% HMP | – |
| binh_suong_dong | Bình Sương Đông | 2300 | sach_co + ao_da + 1500 | +100 Phép, +40 Giáp | *Kích hoạt (nút nổi trên HUD):* bất động và bất tử 2s (CD 90s) |
| ngoc_bang | Ngọc Băng | 1900 | ngoc_trang + tui_hat + 1300 | +70 Phép, +400 HP | *Duy nhất:* kỹ năng gây sát thương làm chậm 20% 1s |

### Phòng thủ
| id | Tên | Giá | Công thức | Chỉ số | Nội tại |
|---|---|---|---|---|---|
| khien_da | Khiên Đá | 2000 | tui_hat + ao_da + 1400 | +500 HP, +45 Giáp | *Duy nhất:* giảm 15% tốc đánh của địch đánh mình trong 2s |
| giap_gai | Giáp Gai | 1900 | ao_da + ao_da + 1300 | +90 Giáp | *Duy nhất:* phản 25% sát thương đòn đánh nhận được dạng P; gây giảm hồi máu 40% 2s |
| ao_choang_suong | Áo Choàng Sương | 2000 | ao_lua + tui_hat + 1400 | +55 KP, +450 HP | *Duy nhất:* hồi 2% HP/s khi vừa nhận sát thương phép trong 3s |
| tim_co_thu | Tim Cổ Thụ | 2500 | tui_hat + tui_hat + 1900 | +1000 HP | *Duy nhất:* hồi 1.5% HP tối đa/s khi 5s không nhận sát thương |
| giap_den_long | Giáp Đèn Lồng | 2100 | hat_nang + ao_lua + 1400 | +350 HP, +35 KP, +10% GHC | *Duy nhất:* đồng minh trong 700 +10 Giáp và KP |

### Hỗ trợ và đi rừng (mỗi loại tối đa 1)
| id | Tên | Giá | Chỉ số | Nội tại |
|---|---|---|---|---|
| den_dong_hanh | Đèn Đồng Hành | 400 | +200 HP, +5% GHC | *Hỗ trợ:* khi có đồng minh trong 800, được chia vàng khi đồng minh kết liễu lính (bản thân không nhận vàng lính). Sau khi tích 600 vàng từ nội tại, tự nâng thành **Đèn Soi Đường** (+400 HP, +10% GHC, hồi máu và khiên cho người khác +15%) |
| nanh_thu_rung | Nanh Thú Rừng | 400 | +10 Công, +10 Phép | *Đi rừng:* sát thương lên quái +30%, hồi 30 HP mỗi đòn lên quái; nhận thêm 30% vàng và KN từ quái. Tự nâng sau khi hạ 20 bãi: +25 Công/Phép và +20% sát thương lên quái. **Chỉ mua được khi mang phép Thu Hoạch.** |

Tổng: 12 thành phần + 5 giày + 18 đồ hoàn chỉnh + 2 đồ hỗ trợ/đi rừng + 1 đồ nâng tự động (Đèn Soi Đường) = **38 món**.

### Build có ghi "nanh_thu_rung (nếu Rừng)"
Khi tướng mang Thu Hoạch, `nanh_thu_rung` được thêm vào đầu build. Nếu không, bỏ qua. Engine xử lý bằng trường `buildJungle` riêng trong file tướng.

## 5. Đồ khởi đầu gợi ý (mua lúc 0:00)
| Vai | Mua |
|---|---|
| Đấu sĩ / Đỡ đòn đi đường | kiem_sat + tui_hat hoặc ao_da + tui_hat |
| Pháp sư | ngoc_trang + ngoc_luu_ly |
| Xạ thủ | dao_nho + gang_tay_da (hoặc kiem_sat) |
| Đi rừng | nanh_thu_rung |
| Trợ thủ | den_dong_hanh |

## 6. Phép bổ trợ

Chọn 1 trước trận (màn chọn tướng). Hiện ở nút nhỏ trên cụm kỹ năng.

| id | Tên | Hồi chiêu | Tác dụng |
|---|---|---|---|
| chop_buoc | Chớp Bước | 120s | Dịch chuyển tức thời 450 theo hướng kéo (chạm nhanh: theo hướng joystick/hướng nhìn) |
| hoi_phuc | Hồi Phục | 120s | Hồi 15% HP tối đa cho bản thân và đồng minh gần nhất trong 600; +20% tốc chạy 2s |
| tram_hon | Trảm Hồn | 90s | Gây sát thương chuẩn `14% HP đã mất` lên tướng địch trong 500, làm chậm 50% 1s |
| thu_hoach | Thu Hoạch | 30s | Gây `600 (+40/cấp)` sát thương chuẩn lên quái rừng/mục tiêu lớn/lính trong 500; lên tướng địch gây 300 và làm chậm 30% 1s. Bắt buộc để mua Nanh Thú Rừng |
| gio_luot | Gió Lướt | 100s | +40% tốc chạy trong 5s, bỏ qua va chạm với lính |
| giai_troi | Giải Trói | 100s | Xoá mọi hiệu ứng khống chế (trừ hất tung đang diễn ra) và miễn khống chế 1s |
| tat_den | Tắt Đèn | 90s | Thổi tắt đèn trụ / nhà chính địch gần nhất trong 900 (tính tới mép công trình): ngừng bắn 4s (đạn đã bay vẫn tới) |
| loa_mat | Loá Mắt | 110s | Chớp sáng quanh mình: mọi tướng địch nhìn thấy trong 380 bị choáng 0,75s |
| trong_tran | Trống Trận | 100s | Bản thân +30% tốc đánh, +10% Công trong 5s; đồng minh tướng trong 700 nhận một nửa (+15%, +5%) |
| bua_moi | Bùa Mỏi | 100s | Tướng địch gần nhất trong 600: sát thương gây ra giảm 35% (mọi loại, kể cả sát thương theo thời gian) và chậm 25% trong 3s |

Giới hạn theo chế độ: 1v1 không cho mang Thu Hoạch (không có mục tiêu lớn). **Phép cần mục tiêu** (Thu Hoạch, Tắt Đèn, Loá Mắt, Bùa Mỏi):
không có mục tiêu thì không dùng được và **không mất hồi chiêu**; nút xám "không có mục tiêu". Mô phỏng / bot / HUD đọc theo `kind` của phép
(`blink, heal, execute, smite, haste, cleanse, towerOff, flashStun, warDrum, hex`), không đọc theo id. "Suy yếu" (Bùa Mỏi) là khống chế:
Giải Trói xoá được, kháng hiệu ứng rút ngắn, miễn khống chế chặn được. Thứ tự hiện: `SPELL_LIST` trong `data/spells.js`.

## 7. Bảng bùa (charm)

Bảng bùa là trang chỉ số chọn trước trận, tương tự bảng ngọc nhưng **tự thiết kế**. Nút "Chỉnh" ở màn chọn tướng mở bảng này; tên trang hiện cạnh (vd. "ST liên tục"). Trang có **cấp** = tổng số bùa đã gắn.

### Cấu trúc
- 3 màu bùa, mỗi màu **5 ô** (15 ô/trang). Mỗi ô gắn 1 bùa cùng màu, được gắn trùng, được để trống. **Cấp trang = số ô đã gắn (0..15)**.
- Hiện tại **mở hết 15 bùa** (Xu Đèn để sau — xem DECISIONS).
- 5 trang mẫu (bảng dưới) chỉ đọc: sửa trang mẫu là **tự tạo bản sao** "Trang n". Tối đa **10 trang riêng**, đặt tên được (≤ 16 ký tự).
- Trang dùng gần nhất của mỗi tướng được nhớ làm trang mặc định của tướng đó; chưa có thì trang mẫu theo vai.

### Màn chỉnh (`ui/loadoutPanel.js` + `ui/charmEditor.js`)
- Mở ở Sảnh → nút **Bảng Bùa** (thanh dưới trái), hoặc ở màn chọn tướng / chuẩn bị cấm-chọn: nút "Bùa" mở hộp chọn trang nhanh, nút
  "Chỉnh trang" mở bảng có nút **Dùng trang này**.
- Cột trái danh sách trang; giữa 3 hàng × 5 ô + tổng chỉ số + Sao chép / Gỡ hết / Xoá; phải bảng bùa theo màu. Chạm ô → chọn ô (bảng
  đổi sang màu ô); chạm lại ô đang chọn → gỡ; chạm bùa → gắn vào ô đang chọn rồi nhảy sang ô trống kế; "×5" lấp cả hàng. Tự lưu.

### Danh sách bùa

**Đỏ — Tấn công**
| id | Tên | Mỗi viên |
|---|---|---|
| r_luoi | Bùa Lưỡi | +2.4 Công |
| r_lua | Bùa Lửa | +3.6 Phép |
| r_gio | Bùa Gió | +1.2% TĐ |
| r_nanh | Bùa Nanh | +0.8% CM, +1 Công |
| r_xuyen | Bùa Xuyên | +2 XG, +1.6 Công |
| r_sam | Bùa Sấm | +3 XKP, +1.8 Phép |

**Xanh — Tiện ích**
| id | Tên | Mỗi viên |
|---|---|---|
| b_suong | Bùa Sương | +1% GHC, +20 Mana |
| b_mach | Bùa Mạch | +0.8% HM |
| b_nguyet | Bùa Nguyệt | +0.8% HMP |
| b_chan | Bùa Chân | +0.8% tốc chạy |
| b_nhan | Bùa Nhẫn | +1.6% KHU |

**Xám — Phòng thủ**
| id | Tên | Mỗi viên |
|---|---|---|
| g_da | Bùa Đá | +3 Giáp |
| g_may | Bùa Mây | +3 KP |
| g_re | Bùa Rễ | +40 HP |
| g_suoi | Bùa Suối | +8 HP hồi/5s, +20 HP |

### Trang mặc định (sinh sẵn)
| Tên trang | Đỏ ×5 | Xanh ×5 | Xám ×5 |
|---|---|---|---|
| ST liên tục (xạ thủ) | r_gio ×3, r_nanh ×2 | b_mach ×3, b_chan ×2 | g_re ×5 |
| Sát thủ vật lý | r_xuyen ×5 | b_suong ×3, b_chan ×2 | g_re ×3, g_da ×2 |
| Pháp sư | r_lua ×3, r_sam ×2 | b_suong ×5 | g_re ×3, g_may ×2 |
| Đỡ đòn | r_luoi ×5 | b_nhan ×3, b_suong ×2 | g_da ×3, g_may ×2 |
| Trợ thủ | r_lua ×5 | b_suong ×5 | g_re ×3, g_suoi ×2 |

## 8. Mẫu dữ liệu

```js
// src/data/items.js (trích)
export const ITEMS = {
  riu_dong: { name: 'Rìu Đồng', cost: 450, tier: 1, stats: { atk: 25 } },
  huyet_kiem: { name: 'Huyết Kiếm', cost: 1800, tier: 3, from: ['riu_dong','kiem_sat'],
                stats: { atk: 60, lifesteal: 0.15 }, tags: ['physical'] },
  thuong_pha_giap: { name: 'Thương Phá Giáp', cost: 2000, tier: 3, from: ['riu_dong','tui_hat'],
                stats: { atk: 50, maxHp: 300 }, unique: { armorPenPct: 0.30 } },
  binh_suong_dong: { name: 'Bình Sương Đông', cost: 2300, tier: 3, from: ['sach_co','ao_da'],
                stats: { ap: 100, armor: 40 },
                active: { id: 'stasis', cooldown: 90, statuses: [{ status: 'stasis', duration: 2 }] } },
  // ...
};
```
Giá `cost` là **tổng giá**; phần "+1100" trong bảng là giá ghép = `cost − tổng giá thành phần`. Code tính tự động, không khai báo riêng.

Thêm status `stasis` vào hệ hiệu ứng: bất động + không thể bị chọn + không nhận sát thương + không hành động.

## 9. Phù hiệu (emblem)

Chọn theo **từng tướng** (Sảnh → Bảng Bùa → thẻ Phù hiệu, hoặc nút "Phù hiệu" ở màn chọn tướng): **1 phù hiệu chính** (cơ chế) + **1 nét phụ
mỗi hàng** (Thân, Tâm). Mở hết. Chưa chỉnh thì mặc định theo vai. Dữ liệu `data/emblems.js`, mô phỏng `sim/emblems.js` (chạy theo `kind`).

| id | Tên | Cơ chế |
|---|---|---|
| tam_hoa | Tam Hoả | 3 đòn riêng biệt (đánh thường hoặc kỹ năng, cách nhau ≥ 0,1s) trúng cùng tướng địch trong 3s: thêm 40 (+12/cấp, +25% Công cộng thêm, +20% Phép), vật lý nếu Công cộng thêm ≥ Phép, không thì phép. Hồi 10s |
| song_don | Sóng Dồn | Mỗi đòn đánh thường trúng tướng / quái: +5% tốc đánh (tối đa 5 tầng, giữ 4s); đủ 5 tầng thêm 8% Công |
| mai_rua | Mai Rùa | Máu < 55% bị tướng địch gây sát thương: khiên 60 + 7% HP tối đa trong 3s. Hồi 22s |
| den_ho_menh | Đèn Hộ Mệnh | Kỹ năng gây sát thương lên tướng địch: tướng phe mình ít máu nhất (%) trong 700 — kể cả mình — nhận khiên 45 (+9/cấp, +15% Phép) 2,5s. Hồi 8s |

| Hàng | Nét phụ |
|---|---|
| Thân | Da Dày (+6 Giáp, +6 KP) · Suối Nguồn (+60 HP, +2,4 HP/giây) · Kiên Cường (+8% kháng hiệu ứng) |
| Tâm | Tỉnh Táo (+5% giảm hồi chiêu) · Bước Nhẹ (+4% tốc chạy) · Săn Mồi (+6% sát thương lên tướng địch dưới 40% máu) |

Mặc định theo vai: xạ thủ Sóng Dồn (Suối Nguồn, Bước Nhẹ) · sát thủ Tam Hoả (Da Dày, Săn Mồi) · pháp sư Tam Hoả (Suối Nguồn, Tỉnh Táo) ·
đỡ đòn Mai Rùa (Da Dày, Tỉnh Táo) · đấu sĩ Sóng Dồn (Kiên Cường, Săn Mồi) · trợ thủ Đèn Hộ Mệnh (Kiên Cường, Tỉnh Táo).
Sát thương của phù hiệu, sát thương theo thời gian và sát thương phản không kích phù hiệu.
