# 10 — Lộ trình phát triển

Mỗi mốc = 1 đến vài phiên với AI coding. **Chơi thử trên điện thoại và đạt "Xong khi" rồi mới qua mốc tiếp theo.** Sau mỗi mốc: commit git, ghi quyết định vào `docs/DECISIONS.md`.

## Công cụ kiểm thử (tạo từ Mốc 3)
- `tools/simtest.mjs` chạy bằng Node.js: import `src/sim/` (không có DOM), tạo trận toàn bot, chạy nhanh hết tốc lực, in kết quả (thời lượng, ai thắng, tổng hạ gục, tướng kẹt tường, lỗi). Node chỉ là công cụ phát triển; game vẫn không cần bước build.
- `?debug=1` trên URL: hiện FPS, số entity, nav grid, vùng va chạm, tầm nhìn, trạng thái AI trên đầu bot.
- `?seed=12345`: ép seed trận để tái hiện lỗi.

---

## Đường hình ảnh (song song với code)
Việc bạn (hoặc hoạ sĩ) làm song song, theo `11_HUONG_DAN_MODEL_3D.md`:

| Khi code đang ở | Việc hình ảnh nên làm |
|---|---|
| Mốc 1 | Tải 1 nhân vật CC0 có animation để thử quy trình (11 §2) |
| Mốc 2–4 | Chọn hướng làm model (mua / AI / thuê). Làm **1 tướng thử** (đề xuất Lanternward) từ đầu tới cuối |
| Mốc 5–6 | Hoàn thành 6 tướng Alpha |
| Mốc 7–11 | 10 tướng còn lại, lính, quái, mục tiêu lớn, trụ |
| Mốc 12–14 | Splash + chân dung render từ model, icon kỹ năng, bản đồ vẽ tay |

---

## ALPHA — Đấu đơn 1v1

### Mốc 1 — Khung 3D, vòng lặp, điều khiển
**Đọc:** README, 02 (§1–6, §13.1–13.4, §13.8), 03 (§B1, §C1 phần 1), 07 (§9 phần joystick), 09 (§3, §5)
- Chép Three.js r186 vào `lib/three/` (thư mục `build/` và các addon cần dùng trong `examples/jsm/`), import map trong `index.html`.
- `main.js`, `core/*` (loop 30Hz + nội suy, rng, math, pool, events), `sim/world.js`, `sim/commands.js`, `sim/movement.js`.
- `render/renderer.js, scene.js, camera.js, lights.js, quality.js, mapBuilder.js` (bản đồ 1v1 trống: mặt đất, đường, khe nước), `render/assets.js`, `render/animator.js`, `render/placeholder/capsule.js`, `render/shadows.js` (bóng tròn).
- Một tướng (Emberforge) dùng model giữ chỗ. **Thử quy trình model ngay:** nạp 1 file GLB CC0 có animation đặt ở `assets/test/test_character.glb` (người dùng tự tải, xem 11 §2), phát `Idle`/`Run` theo trạng thái di chuyển, `timeScale` theo tốc chạy.
- Joystick động, bàn phím WASD cho máy tính. Lớp phủ "Xoay ngang thiết bị", nút toàn màn hình. Xử lý mất ngữ cảnh WebGL.
- `?debug=1` hiện FPS, draw call, số tam giác.
- `tools/model-check.html` theo 11 §8.2: chọn file GLB từ máy, hiện số tam giác/xương/vật liệu/texture/dung lượng so với ngân sách 09 §3 (xanh/đỏ), danh sách clip bấm để phát, thanh `timeScale`, mũi tên +Z, khối 1.8 m so tỉ lệ, nút chuyển sang góc camera trận.

**Xong khi:** trên điện thoại tầm trung chạy 60fps ở mức Trung bình; joystick mượt, không cuộn/zoom trang; đổi FPS màn hình (30/60/120) không làm đổi tốc độ di chuyển; model GLB thử chạy/đứng đúng clip, chân không trượt rõ; xoá file GLB thì tự dùng model giữ chỗ, không lỗi; `tools/model-check.html` mở được file thử và báo đúng số liệu.

### Mốc 2 — Chiến đấu và kỹ năng
**Đọc:** 02 (§7), 04 (§1–5, tướng Alpha 6.1, 6.4, 6.7, 6.9, 6.12, 6.15, §7)
- `stats, damage, combat, targeting, skills, skillTypes/* (đủ 14 kiểu), status, projectiles, zones`.
- Render: `unitView.js` (entity ↔ object 3D), `materials.js` (viền sáng màu đội, nháy trắng khi trúng), `indicators.js` (chỉ báo ngắm 3D sát đất), `project.js` + thanh máu và số sát thương trên HUD, animation Attack/Cast/Ult/Death, hiệu ứng tối thiểu (`vfx/` dạng khối phát sáng, vệt, vòng).
- Dữ liệu 6 tướng Alpha. Nâng kỹ năng, tự nâng.
- HUD: nút Đánh, K1–K3, kéo để ngắm, vùng Huỷ, hồi chiêu, mana, chỉ báo ngắm; số sát thương bay.
- Màn thử: 3 hình nộm cách 400/700/1000, nút đổi tướng, nút "Hồi chiêu 0", "Lên cấp 15".

**Xong khi:** cả 6 tướng dùng đủ nội tại và 3 kỹ năng đúng mô tả; chỉ báo ngắm đúng hình dạng; công thức sát thương khớp tính tay (kiểm 3 ví dụ ghi trong DECISIONS.md).

### Mốc 3 — Bản đồ 1v1 hoàn chỉnh
**Đọc:** 03 (§A4 luật trụ, §A5 lính, §B), 02 (§8)
- `navgrid, pathfind`, tường và bụi cỏ (chỉ hình, chưa ẩn), trụ, nhà chính, Suối Đèn, lính theo đợt, tăng sức mạnh lính theo phút.
- `mapBuilder.js` dựng tường (đùn khối), bụi (cỏ instancing), trụ/nhà chính/lính bằng model giữ chỗ; `instancing.js` cho lính và vật trang trí.
- `match.js`: thắng/thua khi nhà chính vỡ. `tools/simtest.mjs`.

**Xong khi:** để trận chạy không có tướng 10 phút: lính gặp nhau ở giữa, trụ bắn đúng thứ tự ưu tiên, luật bất tử trụ đúng; simtest không báo lỗi.

### Mốc 4 — Kinh tế, đồ, phép, bùa
**Đọc:** 03 (§A10, §B4), 05 (toàn bộ)
- Vàng, KN, cấp, hồi sinh, về nhà, suối hồi. Toàn bộ 38 món, công thức ghép, nội tại duy nhất, đồ kích hoạt. 6 phép bổ trợ. Bùa áp chỉ số (chưa cần UI chỉnh bùa; dùng trang mặc định).
- HUD: cửa hàng trượt, mua nhanh, vàng, nút phép.

**Xong khi:** farm lính lên cấp, mua đồ và chỉ số thay đổi đúng; bán lại 60%; Chớp Bước không xuyên ra ngoài bản đồ; chết hồi sinh đúng thời gian.

### Mốc 5 — Bot 1v1 và màn chọn tướng luyện tập
**Đọc:** 06 (§4.2, §4.3, §4.5–4.8, §5), 07 (§1, §7.1, §10 rút gọn)
- `ai/heroBot.js`, `ai/botSkills.js` với các trạng thái 1v1.
- `ui/router.js`, màn **Chọn tướng luyện tập** theo 07 §7.1 (lưới 2 cột, tên + vai, cột kỹ năng, Mình VS Máy, Chỉnh, phép, Chọn mục tiêu, Huỷ). Độ khó bot.
- `showcase/` (02 §13.9): cảnh trưng bày 3D ở giữa màn chọn tướng, vuốt xoay 360°, đổi tướng có hiệu ứng.
- Màn kết quả rút gọn (Thắng/Thua + K/D/A).

**Xong khi:** thắng được bot Dễ trong 6–10 phút; bot Khó thắng người mới đa số trận; simtest 50 trận bot vs bot đều kết thúc, không bot nào kẹt quá 5s.

### Mốc 6 — Hoàn thiện Alpha
**Đọc:** 03 (§B3), 07 (§9 đầy đủ), 09 (§6)
- Quái 1v1, Cá Chép Vàng, Giếng Sen. Thông báo hạ gục, chuỗi hạ gục. Bảng tỉ số. Âm thanh Web Audio. Hiệu ứng hạt (pool, blending cộng). Rung camera. Tuỳ chọn điều khiển và chất lượng đồ hoạ (tự chọn mức lần đầu). Tạm dừng.
- Nếu đã có model thật của 6 tướng Alpha (11): nối vào qua `hero.art.json`, chỉnh `runRefSpeed`, `hitTime`, `attach`.

**Xong khi:** 5 trận 1v1 liền trên điện thoại không lỗi, không dưới 50fps; người chơi thử (không phải bạn) hiểu cách chơi mà không cần giải thích.

---

## BETA — 5v5

### Mốc 7 — Bản đồ 5v5, công trình, lính
**Đọc:** 03 (§A1–A5, §A8, §A9)
- `maps/arena5v5.js` khai báo phía Xanh + `mirror()`. 3 đường, 9 trụ + nhà chính mỗi bên, tường, bụi, lính 3 đường, Lính Đèn Lớn khi mất trụ nhà. Giáp trụ ngoài 4 phút đầu.

**Xong khi:** chế độ debug hiện vẽ tầm trụ và waypoint đối xứng đúng; trận không tướng: lính 3 đường gặp nhau gần giữa đường (sai lệch < 300).

### Mốc 8 — Rừng và mục tiêu lớn
**Đọc:** 03 (§A6, §A7), 05 (§6 Thu Hoạch, nanh_thu_rung)
- 12 bãi quái, bùa Lam/Hoả (rơi khi chết), Thuồng Luồng, Thuồng Luồng Cổ, Hộ Vệ Đèn + Người Đá Đèn, Cá Chép Vàng. Kéo quái/reset. Ấn Thuồng Luồng. Thông báo toàn trận.

**Xong khi:** đi hết một vòng rừng ở cấp 1 với Bamboo Shade + Nanh Thú Rừng + Thu Hoạch mà không chết; mục tiêu lớn xuất hiện đúng giờ; buff hiện icon + thời gian trên HUD.

### Mốc 9 — Tầm nhìn
**Đọc:** 02 (§9), 03 (§A8 bụi cỏ), 07 (§9 minimap)
- `vision.js`, lớp sương mù (`render/fog.js`), bụi cỏ ẩn đơn vị, bẫy tàng hình, tàng hình Bamboo Shade. Minimap chỉ hiện thứ thấy được. Bot chỉ dùng thông tin thấy được.

**Xong khi:** đứng trong bụi thì bot không nhắm được mình; đánh từ bụi bị lộ 1s; FPS không giảm quá 5 so với Mốc 8.

### Mốc 10 — 10 tướng còn lại
**Đọc:** 04 (6.2, 6.3, 6.5, 6.6, 6.8, 6.10, 6.11, 6.13, 6.14, 6.16), 09 (§4 tương ứng)
- Dữ liệu + hook + hình giữ chỗ cho Trâu Đồng, Cổ Thụ, Kiếm Mây, Sói Núi, Dơi Đêm, Sấm Trống, Hoa Độc, Pháo Hoa, Trạng Nỏ, Mộc Cầm.

**Xong khi:** mỗi tướng qua bài thử ở màn luyện tập (đủ kỹ năng, số đúng); simtest 5v5 với đội hình ngẫu nhiên chạy 20 trận không lỗi.

### Mốc 11 — Bot 5v5
**Đọc:** 06 (toàn bộ)
- `teamBrain.js`, vai và đường, GANK, OBJECTIVE, PEEL, KITE, CONTEST, phản hồi ping người chơi. Màn chọn tướng thường (07 §7.2) để vào 5v5.

**Xong khi:** simtest 50 trận bot vs bot cùng độ khó: thời lượng trung vị 12–18 phút, tỉ lệ thắng Xanh/Đỏ trong khoảng 45–55%, mục tiêu lớn bị đánh ít nhất 2 lần mỗi trận; chơi thật cùng bot Thường thấy đồng đội có tập hợp đánh mục tiêu.

---

## 1.0 — Trọn bộ trải nghiệm

### Mốc 12 — Giao diện ngoài trận
**Đọc:** 07 (toàn bộ)
- Tokens, component, sảnh chính, chọn chế độ, mùa giải/xếp hạng (07 §5), phòng chờ (07 §6), ghép trận giả, cấm/chọn (07 §7.3), màn tải, kết quả 3 bước, nhận thưởng (07 §11), các màn phụ.

**Xong khi:** đi hết luồng Sảnh → Đấu hạng → Phòng chờ → Sẵn sàng → Cấm/chọn → Trận → Kết quả → Nhận thưởng → Phòng chờ không lỗi, trên màn 19.5:9 và 16:9, có tai thỏ.

### Mốc 13 — Tiến trình và lưu dữ liệu
**Đọc:** 02 (§10), 08 (toàn bộ), 05 (§7)
- `save.js` + migrate, bậc hạng/sao/điểm tích luỹ/Hào Quang, MVP, Bùa Giữ Sao, mùa + reset mềm, trang phục mùa 10/10, tướng thành thạo, Đấu Đỉnh Cao theo giờ, tiền tệ, mở tướng, tuần miễn phí, rương, nhiệm vụ, kho, lịch sử, màn chỉnh bùa.

**Xong khi:** chơi 10 trận hạng, tắt/mở lại trình duyệt, mọi số liệu còn nguyên; đổi giờ thiết bị sang ngày hết mùa → nhận thưởng và reset đúng bảng; Xuất/Nhập mã lưu sang trình duyệt khác thành công.

### Mốc 14 — Đóng gói và hình ảnh thật
**Đọc:** 09 (toàn bộ), 01 (§5)
- PWA: `manifest.webmanifest`, `sw.js` cache offline, icon riêng. Tải asset theo nhu cầu (splash chỉ tải khi vào màn cần).
- Thay model giữ chỗ bằng model thật cho mọi tướng, lính, quái, mục tiêu lớn, công trình; bản đồ vẽ tay nếu có (03 §C1 phần 2). Kiểm tra từng tướng theo 11 §8.
- Đo lại ngân sách hiệu năng (02 §2) với model thật trong giao tranh 5v5; hạ LOD/texture nếu vượt.
- Kiểm tra bản quyền: toàn bộ asset có dòng trong `assets/LICENSES.md`.
- Deploy Vercel/Netlify. (Tuỳ chọn) bọc Capacitor ra APK.

**Xong khi:** cài được lên màn hình chính điện thoại, chơi offline được; lần mở thứ hai vào sảnh dưới 3s.

---

## Sau 1.0
1. **Online PvP:** server Node.js chạy chính `src/sim/` (authoritative), WebSocket, client gửi Command, server gửi snapshot 15–20Hz, client dự đoán chuyển động tướng mình + nội suy tướng khác. Ghép trận, phòng tuỳ chỉnh, bạn bè thật.
2. Trang phục (đổi `art` + hiệu ứng, không đổi chỉ số).
3. Mắt (ward), chế độ mới, tướng mới mỗi mùa.

---

## Prompt mẫu

**Mở đầu mỗi phiên**
```
Đọc docs/README.md và docs/10_LO_TRINH.md. Hôm nay làm Mốc N.
Đọc thêm đúng các file/mục ghi ở dòng "Đọc" của Mốc N, và code hiện có trong src/.
Trước khi viết code: tóm tắt ngắn kế hoạch (file nào tạo/sửa, thứ tự làm).
Sau khi xong: liệt kê file đã sửa, cách chạy, và checklist "Xong khi" để tôi thử trên điện thoại.
```

**Khi có lỗi**
```
Mốc N lỗi: [mô tả]. Bước tái hiện: [1, 2, 3]. Seed: ?seed=[số]. Ảnh/quay màn hình: [đính kèm].
Tìm nguyên nhân gốc trước khi sửa, giải thích nguyên nhân bằng 2–3 câu. Không viết lại file không liên quan.
```

**Khi muốn chỉnh cân bằng**
```
Chỉ sửa src/data/. [Tướng X] đang quá mạnh ở [giai đoạn]: [số liệu quan sát từ simtest/bảng kết quả].
Đề xuất 2–3 thay đổi nhỏ kèm lý do, chờ tôi chọn rồi mới sửa.
```

**Khi thêm model thật**
```
Tôi đã thêm assets/heroes/[id]/[id].glb (và ảnh 2D nếu có) theo docs/09 §3 và docs/11.
Kiểm tra file: liệt kê tên clip, số tam giác, số xương, kích thước texture, dung lượng; báo mục nào vượt quy cách.
Tạo hero.art.json (ánh xạ clip nếu tên khác chuẩn, runRefSpeed, hitTime, attach), giữ fallback model giữ chỗ.
Thêm dòng vào assets/LICENSES.md: [nguồn, giấy phép, ngày].
```
