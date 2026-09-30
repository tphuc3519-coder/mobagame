# 04 — Tướng

## 1. Quy ước chung
- Cấp tối đa 15. Mỗi tướng có **Nội tại + K1 + K2 + Chiêu cuối (K3)**.
- K1, K2 tối đa **6 cấp**; K3 tối đa **3 cấp**, mở ở cấp tướng 4, 8, 12. (6 + 6 + 3 = 15 điểm.)
- Nâng kỹ năng: nút "+" hiện trên nút kỹ năng khi có điểm. Có tuỳ chọn **Tự nâng** (mặc định bật): K3 khi được → K1 → K2.
- Ký hiệu sát thương: **VL** = vật lý, **P** = phép, **C** = chuẩn.
- Ký hiệu số: `80 (+40) +0.7 Phép` nghĩa là `80 + 40 × (cấp kỹ năng − 1) + 0.7 × Sức mạnh phép`. `+1.0 Công` là tính theo Công vật lý tổng. `+0.8 Công thêm` là chỉ phần Công từ đồ/bùa/buff.
- `HP` trong công thức là HP tối đa của người dùng nếu không ghi khác.

## 2. Kiểu kỹ năng (engine)

| type | Mô tả | Chế độ ngắm |
|---|---|---|
| `skillshot` | Đạn bay theo hướng; `pierce`, `maxTargets`, `bounce`, `explodeRadius` | hướng |
| `dash` | Lướt theo hướng hoặc tới điểm; `stopOnHero`, `hitAlongPath` | hướng / điểm |
| `blink` | Dịch chuyển tức thời | điểm |
| `targetedDash` | Lao tới mục tiêu đã khoá | mục tiêu |
| `aoeCircle` | Vùng tròn tại điểm, có `delay` | điểm |
| `aoeSelf` | Vùng tròn quanh bản thân | không |
| `cone` | Hình nón phía trước; `angle`, `range` | hướng |
| `line` | Hình chữ nhật từ bản thân theo hướng | hướng |
| `zone` | Vùng tồn tại N giây, gây hiệu ứng theo `tickInterval`; `followCaster` | điểm / không |
| `selfBuff` | Tác dụng lên bản thân | không |
| `allyTarget` | Chọn đồng minh gần hướng kéo nhất trong tầm (hoặc bản thân) | hướng |
| `trap` | Đặt vật thể, kích hoạt khi địch chạm; `maxActive`, `lifetime` | điểm |
| `tether` | Nối dây với mục tiêu trúng, hiệu ứng khi hết thời gian nếu còn trong tầm | hướng |
| `recast` | Cho dùng lại N lần trong `recastWindow` giây, mỗi lần có thể là type khác | tuỳ |

**Chế độ ngắm trên mobile:**
- **Chạm nhanh** (không kéo quá 15px): tự nhắm, ưu tiên tướng địch gần nhất trong tầm, rồi lính gần nhất. `aoeSelf`/`selfBuff` dùng luôn.
- **Kéo:** hiện chỉ báo theo hướng/điểm kéo. Thả để tung chiêu. Kéo vào vùng **Huỷ** để huỷ.
- Kỹ năng `point` giới hạn điểm trong tầm; kéo ra ngoài vòng sẽ dính vào mép.

## 3. Hiệu ứng (status)

| id | Tác dụng | Giảm bởi kháng hiệu ứng |
|---|---|---|
| `stun` | Không di chuyển, không đánh, không dùng chiêu | Có |
| `knockup` | Như stun, bay lên (vẽ nảy lên) | Không |
| `knockback{dist}` | Bị đẩy theo hướng, dừng khi đụng tường | Không |
| `root` | Không di chuyển, vẫn đánh và dùng chiêu không phải lướt | Có |
| `silence` | Không dùng chiêu, vẫn đánh và đi | Có |
| `taunt` | Buộc đánh thường vào người khiêu khích | Có |
| `slow{pct}` | Giảm tốc chạy, cùng loại lấy mạnh nhất | Có |
| `haste{pct}` | Tăng tốc chạy | – |
| `shield{amount}` | Khiên | – |
| `stealth` | Tàng hình với địch, lộ khi ở gần tướng địch 250 hoặc bị trúng đòn | – |
| `untargetable` | Không thể bị chọn làm mục tiêu | – |
| `dot{dps, type}` | Sát thương theo thời gian | – |
| `hot{hps}` | Hồi máu theo thời gian | – |
| `antiHeal{pct}` | Giảm hồi máu nhận | – |
| `armorShred{pct}` / `mrShred{pct}` | Giảm giáp / KP | – |
| `mark{key}` | Dấu hiệu cho cơ chế tướng | – |
| `statMod{...}` | Tăng/giảm chỉ số tuỳ ý | – |

Quy tắc: **Tốc chạy tối thiểu 150**. Tổng thời gian khống chế cứng liên tiếp lên một mục tiêu > 3s thì các hiệu ứng mới giảm 50% trong 2s tiếp theo (chống khoá chết).

## 4. Hook cơ chế riêng
Khai báo trong file tướng, engine gọi đúng lúc:
`onSpawn, onTick, onAttackHit, onSkillHit, onDamaged, onDealDamage(modify), onKill, onAssist, onCast, onLevelUp`.
Hook nhận `ctx = { world, self, target, amount, skill, cast, emit(event), applyStatus(), dealDamage() }`. `skill` là dữ liệu tĩnh (chỉ đọc); `cast` là trạng thái của lần tung chiêu hiện tại (`cast.flags` tự do ghi); trạng thái lâu dài của tướng lưu ở `self.passiveState`.

## 5. Chỉ số cơ bản

Hồi máu/mana chung: HP hồi `40 (+4/cấp)` mỗi 5s; mana hồi `25 (+2.5/cấp)` mỗi 5s. Tướng dùng tài nguyên **"Không"** không cần mana.

| id | Tướng | Vai | Đường | Khó | HP | +HP | Mana | +Mana | Công | +Công | Giáp | +Giáp | KP | +KP | Tốc đánh | +TĐ/cấp | Chạy | Tầm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| thach_quy | Mossback | Đỡ đòn / Trợ thủ | Đền, Hỗ trợ | ★ | 1000 | 130 | 320 | 35 | 58 | 4.5 | 36 | 4.2 | 32 | 2.2 | 0.62 | 1.5% | 310 | 160 |
| trau_dong | Trâu Đồng | Đỡ đòn / Đấu sĩ | Đền | ★ | 1020 | 125 | 300 | 30 | 62 | 5 | 34 | 4 | 32 | 2 | 0.64 | 1.5% | 315 | 170 |
| co_thu | Cổ Thụ | Đỡ đòn / Trợ thủ | Hỗ trợ | ★★ | 980 | 125 | 380 | 40 | 52 | 3.5 | 34 | 4 | 34 | 2.4 | 0.60 | 1.2% | 305 | 180 |
| hoa_ren | Emberforge | Đấu sĩ | Đền | ★ | 880 | 105 | 300 | 32 | 68 | 6.5 | 30 | 3.6 | 30 | 2 | 0.68 | 2% | 320 | 170 |
| kiem_may | Kiếm Mây | Đấu sĩ / Sát thủ | Đền, Rừng | ★★★ | 820 | 98 | Không | – | 70 | 7 | 28 | 3.4 | 28 | 1.8 | 0.70 | 2.5% | 330 | 170 |
| soi_nui | Sói Núi | Đấu sĩ | Rừng, Đền | ★★ | 860 | 102 | Không | – | 72 | 7 | 27 | 3.3 | 27 | 1.8 | 0.72 | 2.8% | 335 | 160 |
| bong_tre | Bamboo Shade | Sát thủ | Rừng | ★★ | 700 | 85 | 260 | 25 | 74 | 7.5 | 24 | 3 | 26 | 1.6 | 0.78 | 2.8% | 345 | 160 |
| doi_dem | Dơi Đêm | Sát thủ / Pháp sư | Rừng, Giữa | ★★★ | 680 | 82 | 380 | 40 | 55 | 4 | 22 | 3 | 28 | 1.8 | 0.65 | 1.5% | 340 | 450 |
| nguyet_ha | Moonstream | Pháp sư | Giữa | ★ | 640 | 78 | 480 | 48 | 50 | 3.2 | 20 | 2.8 | 28 | 1.6 | 0.62 | 1.2% | 315 | 540 |
| sam_trong | Sấm Trống | Pháp sư | Giữa | ★★ | 660 | 80 | 460 | 46 | 52 | 3.2 | 21 | 2.8 | 28 | 1.6 | 0.62 | 1.2% | 315 | 520 |
| hoa_doc | Hoa Độc | Pháp sư / Trợ thủ | Giữa, Hỗ trợ | ★★ | 650 | 80 | 470 | 45 | 50 | 3 | 21 | 2.8 | 29 | 1.7 | 0.62 | 1.2% | 315 | 520 |
| canh_dieu | Kitewing | Xạ thủ | Sông | ★ | 620 | 82 | 300 | 30 | 64 | 6 | 20 | 2.8 | 26 | 1.5 | 0.72 | 3% | 325 | 600 |
| phao_hoa | Pháo Hoa | Xạ thủ | Sông | ★★ | 610 | 80 | 300 | 30 | 62 | 6.2 | 20 | 2.8 | 26 | 1.5 | 0.70 | 3% | 320 | 580 |
| trang_no | Trạng Nỏ | Xạ thủ | Sông | ★★ | 600 | 78 | 320 | 32 | 66 | 6.4 | 19 | 2.7 | 26 | 1.5 | 0.66 | 2.6% | 315 | 680 |
| long_dang | Lanternward | Trợ thủ | Hỗ trợ | ★ | 720 | 95 | 440 | 42 | 48 | 3 | 24 | 3.2 | 30 | 2 | 0.62 | 1.2% | 315 | 520 |
| moc_cam | Mộc Cầm | Trợ thủ / Pháp sư | Hỗ trợ | ★★ | 700 | 92 | 450 | 44 | 47 | 3 | 23 | 3 | 30 | 2 | 0.62 | 1.2% | 320 | 530 |

Tướng có tầm ≥ 400 bắn đạn đánh thường (tốc đạn 1800). Tướng cận chiến gây sát thương ngay tại khung đánh (0.25s sau khi bắt đầu đòn).

---

## 6. Bộ kỹ năng

Định dạng mỗi kỹ năng: **Tên** (`type`, tầm, hồi chiêu, tiêu hao) — hiệu ứng.

### 6.1 Mossback — "Guardian of the Mossy Temple" (Đỡ đòn)
Cơ chế cốt lõi: **khiên tự hồi và khiêu khích cả đám đông.**
- **Nội tại – Mai Đá:** sau 8s không nhận sát thương, nhận khiên 8% HP tối đa (không cộng dồn).
- **K1 – Húc Núi** (`dash`, 450, CD 10/9.5/9/8.5/8/7.5s, 50 mana): lao tới, `stopOnHero`. Mục tiêu đầu tiên chịu `60 (+30) +6% HP` VL và bị hất tung 0.6s.
- **K2 – Chấn Địa** (`aoeSelf`, bán kính 280, CD 8s, 40 mana): `50 (+25) +4% HP` P, làm chậm 30% trong 1.5s.
- **K3 – Đền Thiêng** (`aoeSelf`, bán kính 350, CD 60/52/44s, 100 mana): khiêu khích địch trong vùng 1.5/1.75/2s; bản thân +40/60/80 giáp và KP trong 5s.
- Combo bot: K1 → K3 → K2. Phép: Chớp Bước.
- Build: `giay_chien, khien_da, giap_den_long, ao_choang_suong, mat_na_hoi_sinh, tim_co_thu`.

### 6.2 Trâu Đồng — "Chiến Binh Trống Trận" (Đỡ đòn)
Cơ chế cốt lõi: **càng bị vây càng lì, đẩy địch vào tường để choáng.**
- **Nội tại – Da Đồng:** giảm 8% sát thương nhận khi có 2 tướng địch trong 600; 15% khi có từ 3 tướng.
- **K1 – Rống Trống** (`aoeSelf`, bán kính 320, CD 9s, 45 mana): `80 (+40) +5% HP` P, giảm tốc đánh địch 25% trong 2.5s.
- **K2 – Sừng Húc** (`dash`, 500, `stopOnHero`, CD 11/10.5/10/9.5/9/8.5s, 55 mana): mục tiêu chịu `90 (+45) +0.8 Công` VL và bị đẩy lùi 300. **Nếu đụng tường: choáng 1.25s**, nếu không: choáng 0.5s.
- **K3 – Đại Trống Đồng** (`aoeSelf`, bán kính 450, trễ 0.5s, CD 65/58/50s, 100 mana): hất tung 1s, `200 (+100) +8% HP` P; bản thân giảm 30% sát thương nhận trong 4s.
- Combo bot: K2 (ưu tiên hướng có tường sau lưng mục tiêu) → K3 → K1. Phép: Chớp Bước.
- Build: `giay_chien, khien_da, giap_gai, tim_co_thu, ao_choang_suong, mat_na_hoi_sinh`.

### 6.3 Cổ Thụ — "Cây Đa Nghìn Tuổi" (Đỡ đòn / Trợ thủ)
Cơ chế cốt lõi: **trói diện rộng, đứng yên để hồi máu.**
- **Nội tại – Rễ Sâu:** đứng yên 1.5s thì hồi 1.5% HP tối đa mỗi giây; mất khi di chuyển.
- **K1 – Rễ Trói** (`skillshot`, 750, rộng 90, CD 11/10.5/10/9.5/9/8.5s, 60 mana): tướng đầu tiên trúng chịu `70 (+35) +0.4 Phép` P và bị trói 1.25s.
- **K2 – Tán Lá** (`allyTarget`, 650, CD 12s, 70 mana): khiên `100 (+50) +6% HP của Cổ Thụ` trong 3s cho mục tiêu; nếu mục tiêu là đồng minh, Cổ Thụ cũng nhận 50%.
- **K3 – Rừng Già** (`zone`, tầm 750, bán kính 450, 3s, CD 70/62/54s, 120 mana): địch trong vùng bị chậm 50%; hết 3s, địch còn trong vùng chịu `150 (+75) +0.6 Phép` P và bị trói 1s.
- Combo bot: K3 → K1 → K2 cho đồng minh máu thấp nhất. Phép: Hồi Phục.
- Build: `giay_tinh_tam, den_dong_hanh, giap_den_long, tim_co_thu, khien_da, ao_choang_suong`.

### 6.4 Emberforge — "Blacksmith of Furnace Village" (Đấu sĩ)
Cơ chế cốt lõi: **đánh càng lâu càng nóng, tích đủ nhiệt thì nổ lớn.**
- **Nội tại – Lò Nung:** mỗi đòn đánh hoặc kỹ năng trúng tướng: +1 Nhiệt (tối đa 5, tồn tại 4s). Mỗi Nhiệt +5% tốc đánh. Đủ 5: đòn đánh kế tiếp gây thêm 8% HP tối đa của mục tiêu dạng P và xoá Nhiệt.
- **K1 – Vung Búa** (`cone`, 320, 100°, CD 6s, 30 mana): `70 (+35) +1.0 Công` VL, làm chậm 25% 1s.
- **K2 – Xỉ Sắt** (`selfBuff`, CD 12/11.5/11/10.5/10/9.5s, 40 mana): khiên `80 (+40) +0.5 Công` trong 3s, +20% tốc chạy 2s, +2 Nhiệt.
- **K3 – Đe Trời** (`aoeCircle`, tầm 600, bán kính 260, trễ 0.5s, CD 50/44/38s, 100 mana): nhảy lên rồi nện xuống, không thể bị chọn trong lúc nhảy; `200 (+120) +1.4 Công thêm` VL, choáng 1s; +5 Nhiệt.
- Combo bot: K3 → K1 → đánh thường → K2 khi bị dồn. Phép: Chớp Bước.
- Build: `giay_chien, bua_than_ren, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`.

### 6.5 Kiếm Mây — "Kiếm Khách Trên Mây" (Đấu sĩ / Sát thủ)
Cơ chế cốt lõi: **ba nhịp lướt liên tiếp và đỡ đòn đúng lúc.**
- **Nội tại – Mây Theo Gió:** sau mỗi kỹ năng, đòn đánh kế tiếp trong 3s gây thêm 30% sát thương và lướt ngắn 120 tới mục tiêu.
- **K1 – Mây Cuốn** (`recast` ×3, `dash` 320 mỗi lần, cửa sổ 3s, CD 9/8.5/8/7.5/7/6.5s, Không): mỗi lần `50 (+25) +0.7 Công` VL lên địch trên đường. **Lần 3 hất tung 0.5s.**
- **K2 – Kiếm Chắn** (`selfBuff`, CD 14/13/12/11/10/9s): trong 1.2s, chặn đòn đánh thường hoặc kỹ năng đơn mục tiêu đầu tiên. Chặn thành công: choáng kẻ tấn công nếu trong 400 trong 1s, hoàn 50% hồi chiêu K2.
- **K3 – Nhất Kiếm Thiên Vân** (`targetedDash`, 600, CD 45/38/30s): không thể bị chọn 0.6s, lao tới tướng địch, gây `200 (+120) +1.2 Công thêm +15% HP đã mất của mục tiêu` VL.
- Combo bot: K1×2 → K3 khi mục tiêu < 45% HP → K1 lần 3; K2 khi thấy đạn/kỹ năng đơn mục tiêu nhắm vào mình. Phép: Trảm Hồn (Rừng: Thu Hoạch).
- Build: `giay_toc_chien, thuong_pha_giap, luoi_huyet_nguyet, huyet_kiem, khien_da, mat_na_hoi_sinh`.

### 6.6 Sói Núi — "Kẻ Tru Dưới Trăng" (Đấu sĩ)
Cơ chế cốt lõi: **càng mất máu càng hút máu mạnh.**
- **Nội tại – Khát Máu:** cứ mỗi 10% HP đã mất: +2% hút máu và +3% tốc đánh (tối đa +16% hút máu, +24% tốc đánh).
- **K1 – Vồ Mồi** (`dash` tới điểm, 500, CD 8/7.5/7/6.5/6/5.5s, Không): `70 (+35) +0.8 Công` VL lên mục tiêu gần điểm rơi nhất trong 200, làm chậm 30% 1s.
- **K2 – Tru Trăng** (`aoeSelf`, bán kính 400, CD 12s): địch bị chậm 40% 1.5s và giảm 20% giáp trong 4s.
- **K3 – Cuồng Nộ** (`selfBuff`, CD 70/60/50s): 7s: +40/55/70% tốc đánh, +20% tốc chạy, +10% hút máu, to lên 20%. 2s đầu HP không thể xuống dưới 1.
- Combo bot: K1 → K2 → K3 khi giao tranh có ≥ 2 địch. Phép: Thu Hoạch khi đi Rừng, Trảm Hồn khi đi Đền.
- Build: `nanh_thu_rung (nếu Rừng), giay_toc_chien, huyet_kiem, cung_gio, khien_da, mat_na_hoi_sinh`.

### 6.7 Bamboo Shade — "Bamboo Forest Assassin" (Sát thủ)
Cơ chế cốt lõi: **tàng hình và kết liễu mục tiêu yếu máu.**
- **Nội tại – Mũi Tre:** gây thêm 15% sát thương lên tướng dưới 40% HP.
- **K1 – Lá Bay** (`skillshot`, 700, rộng 60, CD 5s, 30 mana): `60 (+30) +0.9 Công` VL; trúng tướng giảm 50% hồi chiêu còn lại của K2.
- **K2 – Lướt Đốt** (`dash`, 400, `hitAlongPath`, CD 9/8.5/8/7.5/7/6.5s, 40 mana): `50 (+25) +0.6 Công` VL lên mọi địch trên đường.
- **K3 – Rừng Nuốt Bóng** (`selfBuff`, CD 55/48/40s, 80 mana): tàng hình 2.5s, +30% tốc chạy; đòn đánh đầu tiên sau khi hiện gây thêm `150 (+90) +1.2 Công thêm` VL và làm chậm 40% 1s.
- Combo bot: K3 → tiếp cận → đánh thường → K1 → K2 (hoặc K2 để thoát). Phép: Thu Hoạch.
- Build: `nanh_thu_rung, giay_toc_chien, luoi_huyet_nguyet, dao_trang_khuyet, thuong_pha_giap, mat_na_hoi_sinh`.

### 6.8 Dơi Đêm — "Kẻ Săn Bằng Tiếng Vọng" (Sát thủ phép)
Cơ chế cốt lõi: **đánh dấu rồi kích nổ, lướt lại khi hạ gục.**
- **Nội tại – Tiếng Vọng:** kỹ năng trúng tướng để lại Dấu Vọng 4s. Kỹ năng kế tiếp trúng mục tiêu có dấu sẽ kích nổ thêm `40 (+10/cấp tướng) +0.3 Phép` P.
- **K1 – Sóng Âm** (`cone`, 500, 60°, CD 6/5.6/5.2/4.8/4.4/4s, 50 mana): `90 (+45) +0.6 Phép` P.
- **K2 – Bay Vút** (`dash`, 550, không thể bị chọn khi lướt, CD 12/11/10/9/8/7s, 60 mana): `60 (+30) +0.4 Phép` P lên địch trên đường. **Hạ gục hoặc hỗ trợ trong 3s sau khi dùng: làm mới hồi chiêu K2.**
- **K3 – Đàn Dơi** (`targetedDash`, 700, CD 50/42/34s, 100 mana): hoá bầy dơi không thể bị chọn 1s, xuất hiện cạnh mục tiêu gây `300 (+150) +1.0 Phép` P và câm lặng 1s.
- Combo bot: K1 → K3 → K1 → K2 (vào hoặc ra). Phép: Thu Hoạch (Rừng) / Chớp Bước (Giữa).
- Build: `giay_phap_su, sach_pha_gioi, nhan_huyet_phach, mu_sam, binh_suong_dong, truong_song`.

### 6.9 Moonstream — "Guide of the Moon River" (Pháp sư)
Cơ chế cốt lõi: **kiểm soát vùng và sát thương diện rộng từ xa.**
- **Nội tại – Triều Trăng:** mỗi kỹ năng trúng ít nhất 1 tướng hồi 3% mana tối đa.
- **K1 – Giọt Bạc** (`skillshot`, 800, xuyên, rộng 70, CD 5s, 50 mana): `80 (+40) +0.7 Phép` P.
- **K2 – Xoáy Nước** (`zone`, tầm 650, bán kính 220, 2s, tick 0.5s, CD 11/10.5/10/9.5/9/8.5s, 70 mana): `30 (+15) +0.2 Phép` P mỗi tick, làm chậm 35%.
- **K3 – Lũ Nguyệt** (`aoeCircle`, tầm 850, bán kính 320, trễ 0.8s, CD 55/48/40s, 120 mana): `250 (+130) +1.0 Phép` P, hất tung 0.8s.
- Combo bot: K2 → K3 (bắn vào tâm xoáy) → K1. Phép: Chớp Bước.
- Build: `giay_phap_su, truong_song, mu_sam, sach_pha_gioi, binh_suong_dong, ngoc_bang`.

### 6.10 Sấm Trống — "Tay Trống Gọi Mưa" (Pháp sư)
Cơ chế cốt lõi: **tích điện rồi làm choáng, sét nảy qua nhiều mục tiêu.**
- **Nội tại – Tích Điện:** mỗi lần kỹ năng gây sát thương lên tướng: +1 Điện (tối đa 4, tồn tại 8s). Đủ 4: kỹ năng kế tiếp choáng mục tiêu 1s và xoá Điện.
- **K1 – Tia Sét Nảy** (`skillshot`, 750, `bounce` 3 lần trong 450, CD 6s, 55 mana): `80 (+40) +0.6 Phép` P, giảm 15% mỗi lần nảy.
- **K2 – Trống Gọi Mưa** (`aoeCircle`, tầm 700, bán kính 220, trễ 0.6s, CD 9/8.5/8/7.5/7/6.5s, 65 mana): `100 (+50) +0.7 Phép` P, làm chậm 30% 1s.
- **K3 – Bão Giông** (`zone`, `followCaster`, bán kính 550, 4s, tick 0.5s, CD 60/52/44s, 120 mana): mỗi tick sét đánh 1 địch ngẫu nhiên trong vùng (ưu tiên tướng, RNG có seed) `70 (+35) +0.3 Phép` P. Mỗi sét tính là một lần gây sát thương của kỹ năng cho Tích Điện.
- Combo bot: K2 → K1 → K3 khi ≥ 2 tướng địch trong 550. Phép: Chớp Bước.
- Build: `giay_tinh_tam, truong_song, sach_pha_gioi, mu_sam, nhan_huyet_phach, binh_suong_dong`.

### 6.11 Hoa Độc — "Nàng Sen Đầm Độc" (Pháp sư / Trợ thủ)
Cơ chế cốt lõi: **độc cộng dồn theo thời gian và vùng hồi máu cho đồng đội.**
- **Nội tại – Nhựa Độc:** kỹ năng gây độc 3s: `1.5% HP tối đa mục tiêu` P mỗi giây (tối đa 80/s lên quái). Trúng lại làm mới thời gian.
- **K1 – Hạt Độc** (`aoeCircle`, tầm 750, bán kính 180, trễ 0.4s, CD 4s, 45 mana): `70 (+35) +0.5 Phép` P.
- **K2 – Dây Leo** (`skillshot`, 700, rộng 80, CD 12/11.5/11/10.5/10/9.5s, 60 mana): `60 (+30) +0.4 Phép` P, trói 1s tướng đầu tiên.
- **K3 – Vườn Độc** (`zone`, tầm 800, bán kính 400, 5s, tick 1s, CD 70/62/54s, 120 mana): địch trong vùng chậm 30% và chịu `50 (+25) +0.2 Phép` P mỗi giây; đồng minh trong vùng hồi `20 (+10) +0.1 Phép` mỗi giây.
- Combo bot: K2 → K1 → K3. Phép: Chớp Bước (Giữa) / Hồi Phục (Hỗ trợ).
- Build: `giay_phap_su, ngoc_bang, truong_song, mu_sam, sach_pha_gioi, binh_suong_dong`.

### 6.12 Kitewing — "Windchasing Archer" (Xạ thủ)
Cơ chế cốt lõi: **đòn đánh thứ tư bắn đôi, lướt để thả diều.**
- **Nội tại – Gió Thuận:** mỗi đòn đánh thứ 4 bắn thêm 1 mũi tên gây 50% sát thương (có thể chí mạng).
- **K1 – Mũi Tên Gió** (`skillshot`, 950, rộng 70, CD 7/6.6/6.2/5.8/5.4/5s, 40 mana): `70 (+35) +1.1 Công` VL, làm chậm 25% 1.5s.
- **K2 – Lộn Diều** (`dash`, 300, CD 10/9.5/9/8.5/8/7.5s, 30 mana): lướt ngắn; +50% tốc đánh trong 3s; đòn đánh kế tiếp +100 tầm.
- **K3 – Mưa Tên** (`zone`, tầm 950, bán kính 300, 2.5s, tick 0.25s, CD 50/44/38s, 100 mana): `40 (+20) +0.35 Công` VL mỗi tick, làm chậm 20%.
- Combo bot: K1 → đánh thường, K2 để giữ khoảng cách, K3 lên cụm ≥ 2 địch. Phép: Chớp Bước.
- Build: `giay_toc_chien, cung_gio, dao_trang_khuyet, huyet_kiem, thuong_pha_giap, mat_na_hoi_sinh`.

### 6.13 Pháo Hoa — "Cô Nàng Pháo Tết" (Xạ thủ)
Cơ chế cốt lõi: **đòn đánh lan, chiêu cuối bắn xuyên bản đồ.**
- **Nội tại – Ngòi Nổ:** đòn đánh thường gây 30% sát thương lan bán kính 160 quanh mục tiêu (không lan lên công trình).
- **K1 – Pháo Chuột** (`skillshot`, 800, `explodeRadius` 200, CD 8/7.5/7/6.5/6/5.5s, 45 mana): `90 (+45) +0.9 Công` VL, làm chậm 30% 1s.
- **K2 – Nhảy Pháo** (`dash`, 450, CD 12/11/10/9/8/7s, 40 mana): để lại 3 quả pháo tại điểm xuất phát, nổ sau 1s bán kính 150, mỗi quả `40 (+20) +0.3 Công` VL.
- **K3 – Pháo Hoa Đêm** (`skillshot`, 3000, rộng 180, tốc 2200, trúng tướng đầu tiên, CD 75/65/55s, 100 mana): `250 (+125) +1.0 Công thêm` VL, +1% sát thương cho mỗi 1% HP đã mất của mục tiêu (tối đa +50%). Vẫn gây sát thương lên lính trên đường nhưng không dừng lại.
- Combo bot: K1 → đánh thường, K2 khi bị áp sát, K3 để kết liễu tướng địch < 30% HP trong tầm nhìn đội. Phép: Chớp Bước.
- Build: `giay_toc_chien, cung_gio, dao_trang_khuyet, thuong_pha_giap, huyet_kiem, mat_na_hoi_sinh`.

### 6.14 Trạng Nỏ — "Xạ Thủ Nỏ Đồng" (Xạ thủ)
Cơ chế cốt lõi: **tầm xa nhất, bẫy tre kiểm soát lối đi.**
- **Nội tại – Tầm Xa:** đòn đánh vào mục tiêu cách hơn 500 gây thêm 15% sát thương.
- **K1 – Tên Xuyên** (`skillshot`, 1000, xuyên, rộng 60, CD 8/7.5/7/6.5/6/5.5s, 45 mana): `100 (+50) +1.0 Công` VL, giảm 10% mỗi mục tiêu xuyên qua (tối thiểu 50%).
- **K2 – Bẫy Tre** (`trap`, tầm 500, tối đa 3 bẫy, tồn tại 40s, CD 14/13/12/11/10/9s, 40 mana): địch chạm bẫy bị trói 1.25s, lộ vị trí 3s, chịu `60 (+30) +0.4 Công` VL. Bẫy tàng hình với địch sau 1s.
- **K3 – Tam Tiễn** (`skillshot` ×3 hình nón 30°, 1200, CD 50/44/38s, 100 mana): mỗi mũi `150 (+80) +0.8 Công thêm` VL; mũi thứ 2 và 3 trúng cùng mục tiêu chỉ gây 50%.
- Combo bot: K2 đặt ở bụi/cửa rừng gần đường; K1 lên cụm lính có tướng phía sau; K3 khi mục tiêu bị trói/choáng. Phép: Chớp Bước.
- Build: `giay_toc_chien, dao_trang_khuyet, cung_gio, thuong_pha_giap, huyet_kiem, mat_na_hoi_sinh`.

### 6.15 Lanternward — "The Lamp Keeper" (Trợ thủ)
Cơ chế cốt lõi: **khiên và hồi máu, soi sáng đồng đội.**
- **Nội tại – Ánh Lửa Nhỏ:** đồng minh trong bán kính 500 hồi 0.5% HP tối đa mỗi giây (không cộng dồn giữa nhiều Lanternward).
- **K1 – Đèn Trôi** (`skillshot`, 700, rộng 80, CD 9/8.6/8.2/7.8/7.4/7s, 50 mana): `60 (+30) +0.5 Phép` P, choáng 1s mục tiêu đầu tiên.
- **K2 – Thắp Sáng** (`allyTarget`, 600, CD 10/9.6/9.2/8.8/8.4/8s, 70 mana): hồi `80 (+40) +0.6 Phép` và khiên `60 (+30) +0.4 Phép` 3s.
- **K3 – Hội Đèn** (`aoeSelf`, bán kính 650, CD 70/62/54s, 120 mana): đồng minh trong vùng nhận khiên `200 (+100) +0.8 Phép` 4s và +25% tốc chạy 3s.
- Combo bot: K2 cho đồng minh máu thấp; K1 khi địch lao vào xạ thủ; K3 khi ≥ 2 đồng minh dưới 50% HP. Phép: Hồi Phục.
- Build: `den_dong_hanh, giay_tinh_tam, giap_den_long, truong_song, ao_choang_suong, tim_co_thu`.

### 6.16 Mộc Cầm — "Nhạc Sư Đàn Tranh" (Trợ thủ / Pháp sư)
Cơ chế cốt lõi: **giai điệu tăng tốc đội, dây đàn trói rồi câm lặng diện rộng.**
- **Nội tại – Giai Điệu:** mỗi lần dùng kỹ năng, đồng minh trong 500 (gồm bản thân) +10% tốc chạy 1.5s.
- **K1 – Khúc Chữa Lành** (`aoeSelf`, bán kính 500, CD 10/9.5/9/8.5/8/7.5s, 70 mana): hồi `60 (+30) +0.4 Phép` cho đồng minh, bản thân nhận 50%.
- **K2 – Dây Đàn** (`tether`, `skillshot` 750, rộng 70, CD 12/11.5/11/10.5/10/9.5s, 60 mana): tướng địch đầu tiên trúng chịu `60 (+30) +0.4 Phép` P và bị nối dây 2s; nếu hết 2s vẫn trong 650: choáng 1.25s và chịu thêm lượng sát thương đó.
- **K3 – Khúc Tĩnh Lặng** (`aoeSelf`, bán kính 600, CD 65/58/50s, 110 mana): câm lặng địch 1.5s; đồng minh +30% tốc chạy 3s và được xoá hiệu ứng làm chậm.
- Combo bot: K2 → giữ khoảng cách → K3 khi địch lao vào; K1 khi tổng máu đã mất của đồng minh gần > 600. Phép: Hồi Phục.
- Build: `den_dong_hanh, giay_tinh_tam, ngoc_bang, giap_den_long, truong_song, ao_choang_suong`.

---

## 7. Mẫu dữ liệu (một file tướng)

```js
// src/data/heroes/nguyet_ha.js
export default {
  id: 'nguyet_ha',
  name: 'Moonstream',
  title: 'Guide of the Moon River',
  roles: ['mage'], lanes: ['mid'], difficulty: 1,
  resource: 'mana',
  base: { maxHp: 640, maxMana: 480, atk: 50, ap: 0, armor: 20, mr: 28,
          atkSpeed: 0.62, moveSpeed: 315, range: 540 },
  perLevel: { maxHp: 78, maxMana: 48, atk: 3.2, armor: 2.8, mr: 1.6, atkSpeedPct: 0.012 },
  basicAttack: { projectile: { speed: 1800, vfx: 'moon_drop' } },
  passive: {
    id: 'tide_moon', name: 'Triều Trăng',
    // ctx.cast là object riêng của mỗi lần tung chiêu (engine tạo mới mỗi lần cast),
    // KHÔNG ghi trạng thái vào ctx.skill vì đó là dữ liệu dùng chung.
    hooks: { onSkillHit: (ctx) => { if (ctx.target.kind === 'hero' && !ctx.cast.flags.tideRestored) {
      ctx.self.mana = Math.min(ctx.self.stats.maxMana, ctx.self.mana + ctx.self.stats.maxMana * 0.03);
      ctx.cast.flags.tideRestored = true; } } }
  },
  skills: {
    s1: { id: 'silver_drop', name: 'Giọt Bạc', type: 'skillshot', aim: 'direction',
          range: 800, width: 70, speed: 1600, pierce: true,
          cooldown: [5,5,5,5,5,5], cost: [50,55,60,65,70,75],
          damage: { base: 80, perLevel: 40, ap: 0.7, type: 'magic' } },
    s2: { id: 'whirlpool', name: 'Xoáy Nước', type: 'zone', aim: 'point',
          range: 650, radius: 220, duration: 2, tickInterval: 0.5,
          cooldown: [11,10.5,10,9.5,9,8.5], cost: [70,70,70,70,70,70],
          damage: { base: 30, perLevel: 15, ap: 0.2, type: 'magic' },
          effects: [{ status: 'slow', pct: 0.35, duration: 0.6 }] },
    s3: { id: 'moon_flood', name: 'Lũ Nguyệt', type: 'aoeCircle', aim: 'point',
          range: 850, radius: 320, delay: 0.8,
          cooldown: [55,48,40], cost: [120,120,120],
          damage: { base: 250, perLevel: 130, ap: 1.0, type: 'magic' },
          effects: [{ status: 'knockup', duration: 0.8 }] }
  },
  ai: { combo: ['s2','s3','s1'], preferredRange: 600, engageHpRatio: 0.9 },
  defaultSpell: 'chop_buoc',
  recommendedBuild: ['giay_phap_su','truong_song','mu_sam','sach_pha_gioi','binh_suong_dong','ngoc_bang'],
  art: 'heroes/nguyet_ha/hero.art.json'   // model 3D, ánh xạ clip, hitTime… (09 §3.4)
};
```


---

## 8. Đợt 2: 14 tướng port cơ chế từ autobattle

Cơ chế lấy từ các đấu thủ của repo autobattle, nhưng **tên, ngoại hình, tên chiêu đều là nội dung gốc** (thần thoại/dân gian Việt hoặc nhân vật tự đặt), để tuân thủ 01 §5. Dữ liệu: `src/data/heroes/<id>.js`; model: `tools/modelgen/heroes/<id>.mjs`. Con số là bản đầu, cần cân bằng bằng simtest (Mốc 5, 11). Hook cơ chế trong `passive.params` và `skills[*].params` mới ở dạng khai báo, engine hiện thực ở Mốc 2.

| id | Tướng | Vai | Cơ chế cốt lõi (1 câu) |
|---|---|---|---|
| hanh_hoa | Hạnh Hoa — Thầy Lang Mai Vàng | support / fighter | thầy thuốc cận chiến, đánh tích nội lực để hồi máu, chiêu cuối mở trạng thái bùng nổ. |
| tieu_anh | Tiểu Ảnh — Cậu Bé Rối Giấy | marksman | đánh xa, phân thân giấy, tích Hứng để tung đòn xoáy. |
| ba_nam | Bà Năm Chảo — Bà Nội Trợ Xóm Chợ | fighter | cận chiến chí mạng tích dần, mắng xối phản lại đạn bay. |
| cau_may | Cầu Mây — Chàng Đá Cầu Xóm Đình | marksman | sút xa, chưa sung thì hay trượt, dưới 35% máu nổi Cánh Sếu mạnh hơn hẳn. |
| bong_den | Bóng Đèn — Nghệ Nhân Rối Bóng | mage | khống chế bằng bóng, trói cổ rồi choáng, mở lãnh địa rối bóng làm cả nhóm địch chậm. |
| thay_do | Thầy Đồ — Ông Đồ Chữ Nghĩa | fighter / mage | tiến hoá theo điểm Học, ba cấp Nghĩa; mỗi cấp mạnh và tầm xa hơn. |
| kep_cheo | Kép Chèo — Ông Kép Múa Hài | fighter | đánh có tỉ lệ choáng, sáu tia sáng đẩy lùi, chiêu cuối đổi vai (hoán đổi máu) khi sắp chết. |
| meo_than_tai | Mèo Thần Tài — Mèo Vẫy Tay Bảo Bối | tank / support | khống chế bằng bảo bối, cánh chong chóng thoát hiểm, chiêu cuối tua ngược thời gian. |
| phu_dong | Phù Đổng — Chàng Trai Ngựa Sắt | tank / fighter | tướng đỡ đòn cứng cáp, giáp sắt giảm sát thương vật lý, phun lửa, thổi băng, lao từ trời xuống. |
| thu_linh | Thư Linh — Nàng Sách Cổ | mage | pháp sư khống chế tầm xa, mở sách dựng kết giới. |
| kiem_thuy | Kiếm Thuỷ — Kiếm Sĩ Sông Xanh | fighter / assassin | đổi thế kiếm theo dòng nước; tích Ấn rồi tung chuỗi mười ba nhát. |
| luong_cuc | Lưỡng Cực — Đạo Sĩ Âm Dương | mage | điều khiển không gian — hút, đẩy, rồi hợp Thái Cực; chiêu cuối mở cõi giam địch. |
| nhan_su | Nhãn Sư — Thợ Săn Thấu Nhãn | marksman / assassin | tích Tầm Nhìn bằng thông tin, đủ 100 thì thấy điểm yếu và tung loạt bắn quyết định. |
| trang_nhi | Trạng Nhí — Thám Tử Nhí Phố Cổ | marksman / support | dùng bảo bối phá án — giày đá bóng, kim gây mê, ván trượt, ghép manh mối để kết án. |

### 8.1 Hạnh Hoa — "Thầy Lang Mai Vàng"
- **Nội tại – Nụ Mai:** Mỗi đòn đánh trúng tướng tích 1 Nụ (tối đa 4, giữ 5s). Đủ 4 Nụ: đòn kế tiếp gây thêm 50 (+0.3 Công) phép và hồi cho Hạnh Hoa 6% HP tối đa.
- **S1 – Đấm Mai** (`dash`, CD 7→5s): Lao tới và đấm sát thương tuyến đường; tích 1 Nụ.
- **S2 – Châm Cứu** (`allyTarget`, CD 10→7.5s): Hồi máu đồng minh (hoặc chính mình) và xoá khống chế.
- **S3 – Ấn Trăm Mai** (`selfBuff`, CD 70→50s): 8 giây: +30% Công, hồi 3% HP mỗi giây, kháng hiệu ứng 30%.
- Build: `giay_chien, bua_than_ren, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`

### 8.2 Tiểu Ảnh — "Cậu Bé Rối Giấy"
- **Nội tại – Xoáy Nhỏ:** Mỗi lần trúng tướng +1 Hứng. Đủ 20 Hứng: đòn đánh kế tiếp thành Xoáy Nhỏ 120 (+0.6 Công) phép, hất lùi nhẹ.
- **S1 – Phi Tiêu Giấy** (`skillshot`, CD 5→3.5s): 25% số phát thành Pháo Giấy nổ vùng 200, sát thương tối đa ở tâm.
- **S2 – Phân Thân Giấy** (`recast`, CD 13→8s): Tung 2 phân thân giấy đánh địch trong 4s; kích hoạt lại để đổi chỗ với một phân thân.
- **S3 – Xoáy Gió** (`dash`, CD 55→40s): Lao dọc theo hướng, nổ xoáy khi chạm tướng.
- Build: `giay_xa_thu, cung_gio, kiem_nhanh, ao_giap_nhe, nhan_bao_kich, mat_na_hoi_sinh`

### 8.3 Bà Năm Chảo — "Bà Nội Trợ Xóm Chợ"
- **Nội tại – Chiêu Chảo:** Mỗi đòn đánh trúng +4% tỉ lệ chí mạng (tối đa +36%, giữ 6s); chí mạng gây 210% sát thương.
- **S1 – Đập Chảo** (`cone`, CD 6→4s): Vung chảo hình quạt, làm chậm 25% trong 1s.
- **S2 – Mắng Xối** (`aoeSelf`, CD 16→11s): 5 đợt sóng xung kích trong 1s; đạn bay chạm sóng bị phản ngược về phía địch.
- **S3 – Dép Bay** (`targetedDash`, CD 45→35s): Lao đá vào mục tiêu đã khoá: choáng 1s, tích thêm 3 chí mạng.
- Build: `giay_chien, kiem_nhanh, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`

### 8.4 Cầu Mây — "Chàng Đá Cầu Xóm Đình"
- **Nội tại – Cánh Sếu:** Dưới 35% HP tối đa: giảm 35% sát thương nhận, +50% tốc ra chiêu, kháng hiệu ứng 40%, cho đến khi hồi lên trên 50%.
- **S1 – Tạt Cầu** (`skillshot`, CD 4→3s): 30% số phát thành Đá Lộn Ngược 140 sát thương kèm choáng ngắn.
- **S2 – Đá Xoáy Lửa** (`skillshot`, CD 9→6.5s): Quả cầu xoáy gây cháy 3s.
- **S3 – Song Cầu Thắng** (`skillshot`, CD 42→30s): Hai phát liên tiếp, phát thứ hai theo dấu phát đầu.
- Build: `giay_xa_thu, cung_gio, kiem_nhanh, ao_giap_nhe, nhan_bao_kich, mat_na_hoi_sinh`

### 8.5 Bóng Đèn — "Nghệ Nhân Rối Bóng"
- **Nội tại – Bóng Sau Lưng:** Sát thương gây từ sau lưng mục tiêu +30%. Đứng yên 2s hồi 4% mana mỗi giây.
- **S1 – Phi Tiêu Bóng** (`skillshot`, CD 5→3.5s): Hai phi tiêu, mỗi cái kèm chảy máu 3s.
- **S2 – Trói Bóng** (`tether`, CD 12→9.5s): Bóng quấn cổ 2s (trói, sát thương theo thời gian) rồi choáng 0.8s nếu còn trong tầm.
- **S3 – Lãnh Địa Bóng** (`zone`, CD 70→54s): Vùng rối bóng 5s: địch bên trong chậm 40% và không thể lướt.
- Build: `giay_phap_su, truong_song, mu_sam, sach_pha_gioi, binh_suong_dong, ngoc_bang`

### 8.6 Thầy Đồ — "Ông Đồ Chữ Nghĩa"
- **Nội tại – Điểm Học:** Đòn đánh và kỹ năng trúng tướng +1 Điểm. 12 Điểm: lên Nghĩa II (+15% tốc đánh, +40 tầm, đòn đánh +25 phép). 30 Điểm: Nghĩa III (+30% sát thương kỹ năng, đòn đánh xuyên 1 mục tiêu).
- **S1 – Nét Bút** (`line`, CD 6→4s): Vạch một nét mực thẳng; ở Nghĩa II để lại vệt chậm 1s.
- **S2 – Quyết Sách** (`selfBuff`, CD 16→11s): Khiên 5s, +20% tốc chạy 2s; +2 Điểm.
- **S3 – Đứng Một Mình** (`selfBuff`, CD 75→55s): 6s: kháng hiệu ứng 50%, giảm 25% sát thương nhận, +25% Công; nhận 6 Điểm.
- Build: `giay_chien, bua_than_ren, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`

### 8.7 Kép Chèo — "Ông Kép Múa Hài"
- **Nội tại – Hào Quang Sân Khấu:** Địch trong 400 quanh Kép Chèo có 10% đòn đánh trượt; bản thân +8% tốc đánh khi có địch trong vùng. Đòn đánh 25% kèm choáng 0.3s.
- **S1 – Quyền Chèo** (`cone`, CD 5→3.5s): Ba đòn quyền liên tiếp trước mặt.
- **S2 – Sáu Tia Sáng** (`cone`, CD 11→8.5s): Bắn xối 6 tia, mỗi tia đẩy lùi; trúng đủ 3 tia thì địch kiệt sức (chậm mạnh 1.5s).
- **S3 – Đổi Vai** (`skillshot`, CD 90→70s): Khi HP dưới 30%: bắn tia đổi vai. Trúng thì hai bên đổi phần trăm máu rồi cùng về ít nhất 20%; trượt thì Kép Chèo còn 10% máu.
- Build: `giay_chien, bua_than_ren, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`

### 8.8 Mèo Thần Tài — "Mèo Vẫy Tay Bảo Bối"
- **Nội tại – Chong Chóng Thoát Hiểm:** Bị khống chế cứng: bay lên 1.5s, gỡ khống chế và +30% tốc chạy (hồi 25s).
- **S1 – Nện Bụng** (`cone`, CD 6→4s): Húc bụng: đẩy lùi; đòn thứ ba của mỗi chuỗi choáng 0.6s.
- **S2 – Súng Hơi** (`skillshot`, CD 10→7.5s): Vòng khí nén: đẩy lùi, cắt ngang chiêu đang gồng.
- **S3 – Đồng Hồ Ngược** (`selfBuff`, CD 130→90s): Tua ngược 4s: quay lại vị trí và máu của 4 giây trước (không hồi thêm khi HP hiện tại cao hơn).
- Build: `giay_giap, khien_da, ao_giap_dong, ngoc_binh_an, giap_gai, mat_na_hoi_sinh`

### 8.9 Phù Đổng — "Chàng Trai Ngựa Sắt"
- **Nội tại – Giáp Sắt:** Giảm 20% sát thương vật lý và 40% lực đẩy; sát thương phép, đốt, độc và theo %HP vẫn nhận đủ.
- **S1 – Lửa Ngựa Sắt** (`line`, CD 8→5.5s): Hai tia lửa bốn nhịp; trúng đủ bốn nhịp thì địch bốc cháy 3s.
- **S2 – Gió Băng Núi Sóc** (`cone`, CD 12→9.5s): Luồng hơi nón: đóng băng 0.8s rồi làm chậm nặng.
- **S3 – Bay Lên Trời** (`aoeCircle`, CD 60→44s): Bay lên rồi lao xuống điểm chỉ định: không thể chọn khi bay, hất tung mục tiêu ở tâm, vùng chấn động quanh điểm rơi.
- Build: `giay_giap, khien_da, ao_giap_dong, ngoc_binh_an, giap_gai, mat_na_hoi_sinh`

### 8.10 Thư Linh — "Nàng Sách Cổ"
- **Nội tại – Trang Sách:** Mỗi kỹ năng trúng tướng để lại 1 Trang trên địch (5s). Đủ 3 Trang: địch bị Câm lặng 1s và nhận 60 (+0.4 Phép) sát thương phép.
- **S1 – Tinh Thể Chữ** (`skillshot`, CD 4.5→3.5s): Bắn tinh thể chữ xuyên một mục tiêu.
- **S2 – Ấn Giữ** (`aoeCircle`, CD 13→9.5s): Vòng ấn giữ chân 1.2s.
- **S3 – Vòng Kết Giới** (`zone`, CD 70→50s): Mở sách dựng kết giới 4s: địch trong vùng chậm, không lướt được; đồng minh nhận khiên.
- Build: `giay_phap_su, truong_song, mu_sam, sach_pha_gioi, binh_suong_dong, ngoc_bang`

### 8.11 Kiếm Thuỷ — "Kiếm Sĩ Sông Xanh"
- **Nội tại – Thế Thuỷ:** Mỗi kỹ năng chuyển sang thế kế tiếp: Sông (+15% tốc chạy), Thác (+20% sát thương đòn kế), Xoáy (làm chậm 20% 1s). Kỹ năng trúng tướng +1 Ấn (tối đa 5).
- **S1 – Nhát Sông** (`line`, CD 5→3.5s): Hai nhát chém liên tiếp theo hướng.
- **S2 – Bánh Xe Nước** (`aoeSelf`, CD 9→6.5s): Xoay kiếm quanh mình, hất lùi nhẹ.
- **S3 – Nhật Vũ Mười Ba Thức** (`dash`, CD 60→40s): Cần đủ 5 Ấn: lướt và chém 13 nhát liên hoàn, nhát cuối gây thêm 50%.
- Build: `giay_chien, kiem_nhanh, huyet_kiem, khien_da, thuong_pha_giap, mat_na_hoi_sinh`

### 8.12 Lưỡng Cực — "Đạo Sĩ Âm Dương"
- **Nội tại – Vô Hạn:** Đòn đánh của Lưỡng Cực không bị chặn bởi đạn/khiên đường bay; +10% tốc chạy khi không có địch trong 700.
- **S1 – Âm Hút** (`aoeCircle`, CD 9→6.5s): Hút địch về tâm vùng.
- **S2 – Dương Đẩy** (`aoeCircle`, CD 9→6.5s): Đẩy văng địch; tung sau Âm Hút trong 3s thì hợp Chùm Thái Cực.
- **S3 – Thái Cực Giới** (`zone`, CD 100→80s): Mở cõi 4s: địch trong vùng bị câm lặng và chậm mạnh; Lưỡng Cực không bị chọn làm mục tiêu bởi đòn đánh thường trong lúc mở.
- Build: `giay_phap_su, truong_song, mu_sam, sach_pha_gioi, binh_suong_dong, ngoc_bang`

### 8.13 Nhãn Sư — "Thợ Săn Thấu Nhãn"
- **Nội tại – Tầm Nhìn:** Tích Tầm Nhìn khi thấy tướng địch (tối đa 27/giây, dừng khi bị khống chế cứng). Đủ 100: Thấu Nhãn — lộ điểm yếu địch, +12% tốc chạy, né đòn trực tiếp đầu tiên.
- **S1 – Chạy Mù Điểm** (`dash`, CD 9→6.5s): Chạy vòng sườn: giảm 30% sát thương, miễn nhiễm làm chậm 1s; phát bắn kế tiếp được nạp.
- **S2 – Phát Bắn Thẳng** (`skillshot`, CD 7→5s): Phát bắn chính xác; đúng thời điểm (sau Chạy Mù Điểm) gây 80 và làm địch ngã ngắn.
- **S3 – Hai Nòng Liên Xạ** (`skillshot`, CD 55→40s): Cần Tầm Nhìn 100: loạt bắn 135 xuyên 15% giáp (157 nếu địch đang hở).
- Build: `giay_xa_thu, cung_gio, kiem_nhanh, ao_giap_nhe, nhan_bao_kich, mat_na_hoi_sinh`

### 8.14 Trạng Nhí — "Thám Tử Nhí Phố Cổ"
- **Nội tại – Manh Mối:** Mỗi kỹ năng trúng đánh dấu 1 Manh Mối lên địch (8s, tối đa 3). Đòn đánh vào mục tiêu có Manh Mối gây thêm 15 (+0.2 Công) sát thương chuẩn.
- **S1 – Đá Bóng Giày Lực** (`skillshot`, CD 6→4s): Đá quả bóng bằng giày tăng lực, đẩy lùi nhẹ.
- **S2 – Đồng Hồ Kim Mê** (`skillshot`, CD 12→8.5s): Bắn kim gây mê: choáng 1s.
- **S3 – Chân Lý Duy Nhất** (`targetedDash`, CD 65→45s): Kết án mục tiêu có từ 2 Manh Mối: sát thương chuẩn, mỗi Manh Mối cộng thêm 15%; trượt thì không mất Manh Mối.
- Build: `giay_xa_thu, cung_gio, kiem_nhanh, ao_giap_nhe, nhan_bao_kich, mat_na_hoi_sinh`
