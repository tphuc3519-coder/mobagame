# Tiến độ dự án (cập nhật mỗi lần commit)

Nguồn plan: bộ spec 3D trong `docs/` (bản 3D thay thế bản 2D cũ). Lộ trình chi tiết: `10_LO_TRINH.md`.

## Tổng quan mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| — | Chép bộ spec 3D vào repo, vendor Three.js r186 (`lib/three/`) | ✅ Xong |
| Đường hình ảnh (v3) | Thân liền khối SDF mượt + AO khe, mặt anime (mống mắt chuyển sắc, 2 đốm sáng, mi), tóc từng lọn, trang phục có độ dày (6 tướng Alpha); bloom + cảnh trưng bày | ✅ Bản v3 |
| Đường hình ảnh | Model 3D 30 tướng (16 gốc + 14 port cơ chế từ autobattle) (tạo bằng code, `tools/modelgen/`) | ✅ Bản đầu xong, đạt ngân sách; còn tinh chỉnh |
| 1 (phần công cụ) | `tools/model-check.html` (trang kiểm tra model theo 11 §8.2) | ✅ Xong |
| 1 | Khung 3D, vòng lặp 30Hz, joystick/WASD, bản đồ 1v1 trống, nạp model + Idle/Run, `?debug=1` | 🚧 Code xong, đã chạy thử bằng trình duyệt headless; **chờ bạn thử trên điện thoại** |
| 2 | Chiến đấu và kỹ năng (6 tướng Alpha, hình nộm, HUD nút, chỉ báo ngắm) | 🚧 Code xong, `tools/t_combat.mjs` đạt; **chờ bạn thử trên điện thoại** |
| 3 | Bản đồ 1v1 hoàn chỉnh (trụ, nhà chính, Suối Đèn, lính, tường, bụi, thắng/thua) | 🚧 Code xong, `simtest` và `t_map` đạt; **chờ bạn thử trên điện thoại** |
| 4 | Kinh tế, đồ, phép, bùa (+ HUD cửa hàng/thanh đồ/nút phép kiểu video tham khảo) | 🚧 Code xong, `tools/t_items.mjs` đạt (49 kiểm tra); **chờ bạn thử trên điện thoại** |
| 5 | Bot 1v1, màn chọn tướng luyện tập (cảnh trưng bày 3D) | 🚧 Code xong; `tools/t_bot.mjs` 50 trận: ~92% kết thúc trong 40 phút, không bot kẹt; **chờ bạn thử** |
| 6 | Hoàn thiện Alpha | ⬜ Chưa |
| 7 (một phần) | Bản đồ 5v5 chạy được: 3 đường, 9 trụ + nhà chính mỗi đội, lính theo đường, 10 tướng (4 đồng đội + 5 địch là bot), bản đồ nhỏ toàn bản đồ, camera gần hơn | 🚧 Code xong, `tools/t_arena.mjs` đạt; **chưa có quái rừng, mục tiêu lớn, sương mù**; chờ bạn thử |
| 7–11 | Beta 5v5 | ⬜ Chưa |
| 12–14 | Bản 1.0 | ⬜ Chưa |

## Model 3D tướng (`assets/heroes/<id>/<id>.glb`)

Sinh bằng script `tools/modelgen` (`node build.mjs`), **không phải tác phẩm thủ công của hoạ sĩ**: hình khối nguyên thuỷ
tô màu theo đỉnh, phong cách "đồ chơi cách điệu". Đủ để chạy game, nhận diện từng tướng từ camera trận và làm Mốc 1–6;
khi có model hoạ sĩ thì chỉ cần đè file cùng tên. Cả 16 file qua Khronos glTF-Validator (0 lỗi, 0 cảnh báo), đủ 11 clip
(Idle, Run, Attack1/2, Cast1/2, Ult, Death, Recall, Victory, Showcase), nhìn về +Z, đơn vị mét.

| id | Tướng | Tam giác | Xương | KB | Vật liệu | runRefSpeed |
|---|---|---|---|---|---|---|
| thach_quy | Mossback | 13048 | 35 | 1132 | 2 | 310 |
| trau_dong | Trâu Đồng | 10736 | 20 | 691 | 1 | 315 |
| co_thu | Cổ Thụ | 9550 | 44 | 1083 | 2 | 305 |
| hoa_ren | Emberforge | 6630 | 24 | 557 | 2 | 320 |
| kiem_may | Kiếm Mây | 7606 | 32 | 701 | 2 | 330 |
| soi_nui | Sói Núi | 6064 | 24 | 529 | 2 | 335 |
| bong_tre | Bamboo Shade | 6164 | 26 | 573 | 2 | 345 |
| doi_dem | Dơi Đêm | 6626 | 26 | 591 | 2 | 340 |
| nguyet_ha | Moonstream | 31589 | 24 | 3051 | 3 | 315 |
| sam_trong | Sấm Trống | 7940 | 22 | 689 | 2 | 315 |
| hoa_doc | Hoa Độc | 10006 | 23 | 838 | 2 | 315 |
| canh_dieu | Kitewing | 6810 | 25 | 574 | 2 | 325 |
| phao_hoa | Pháo Hoa | 7860 | 22 | 572 | 2 | 320 |
| trang_no | Trạng Nỏ | 7872 | 27 | 654 | 2 | 315 |
| long_dang | Lanternward | 7516 | 26 | 607 | 2 | 315 |
| moc_cam | Mộc Cầm | 7704 | 23 | 604 | 2 | 315 |

Ảnh xem trước: `docs/previews/heroes_1-8.png`, `docs/previews/heroes_9-16.png`.

**Chưa làm / còn hạn chế**
- Chưa có `_showcase.glb` (LOD0) (trừ Moonstream), splash/portrait/icon kỹ năng; model sinh bằng code chưa có texture (màu chỉ ở đỉnh, chưa có normal/ORM).
- Chưa có lính, quái, trụ, nhà chính, mục tiêu lớn (Mốc 3, 8).
- Animation là nội suy bằng code: `hitTime`, `runRefSpeed` đã đặt nhưng **chưa chỉnh khớp trong game thật**; chân có thể trượt nhẹ.
- Váy/áo choàng dài xuyên chân khi chạy ở vài tướng (Mộc Cầm, Dơi Đêm); chưa nén meshopt (chỉ bản sảnh của Moonstream nén).
- Chưa thử trên điện thoại thật; ảnh xem trước chụp bằng Chromium headless.

## Nhật ký
- 2026-09-30: nhập spec 3D + hướng dẫn model; vendor Three.js r186.
- 2026-09-30: `tools/modelgen` + 16 model GLB + `tools/model-check.html`, `tools/model-sheet.html`.
- 2026-09-30: Mốc 1 code: `index.html`, `src/{core,sim,render,hud,data}`; chạy `python3 -m http.server 8080` rồi mở `/index.html?debug=1`.
- 2026-09-30: port 14 đấu thủ autobattle thành tướng gốc (đổi tên/ngoại hình theo dân gian Việt): data `src/data/heroes/*.js` (bộ kỹ năng, hook dạng khai báo), model 3D `tools/modelgen/heroes/*.mjs`, mục 8 trong `docs/04_TUONG.md`.
- 2026-09-30: Mốc 2: `src/sim/{stats,status,damage,combat,skills,projectiles,ctx,targeting}.js`, HUD nút kéo ngắm `src/hud/skillButtons.js`, `render/{materials,fx,indicators,project}.js`, màn thử 3 hình nộm (`/index.html?hero=<id>`). Kiểm thử: `node tools/t_combat.mjs`.
- 2026-09-30: Mốc 3: `src/sim/{navgrid,pathfind,structures,minions,match}.js`, `data/{maps,units}.js`, `render/{structures,mapBuilder}.js`; kiểm thử `node tools/simtest.mjs 10`, `node tools/t_map.mjs`; `?ff=<giây>` tua nhanh, `?dummies=1` thêm hình nộm.
- 2026-09-30: Mốc 4: `data/{items,spells,charms,economy}.js`, `sim/{economy,inventory,items,spells}.js`, `hud/{shop,spellButtons,icons}.js`; kiểm thử `node tools/t_items.mjs`. Vào trận có sẵn đồ khởi đầu theo vai; nút **Cửa hàng** (hoặc phím B), ô **Mua nhanh** góc trái trên, thanh 6 ô đồ giữa dưới, nút Phép/Về/đồ kích hoạt cạnh cụm kỹ năng (phím F / R / E). Bảng lab có nút +3000 vàng để thử mua.
- 2026-09-30: Mốc 5: `ai/{heroBot,botSkills,perception}.js`, `data/ai.js` (4 độ khó), `ui/select.js` + `showcase/showcase.js` (chọn tướng 07 §7.1: lưới 2 cột có chân dung chụp từ model, tướng 3D trên bệ sen phát sáng, đèn trời, bloom, xoay 360°, Mình VS Máy, phép, trang bùa, độ khó). `game.js` tách từ `main.js`: vào trận 1v1 với bot; tỉ số giữa trên, đếm hồi sinh. Kiểm thử `node tools/t_bot.mjs 50`.
- 2026-09-30: Model v3: `tools/modelgen/sdf.mjs` (surface nets + meshoptimizer), `costume.mjs`, `humanoid.mjs` (thân SDF, `hairLocks`, mặt anime). Bản đồ: công trình mới (tháp đèn mái cong 2 tầng, nhà chính bệ sen + vòng vàng xoay, suối đèn có mặt nước), lính có nón, bloom trong trận (tắt ở mức Thấp / `?nobloom=1`).
- 2026-09-30: Model v4: tỉ lệ anime bán thực, mặt anime vẽ texture (chớp mắt), Emberforge làm kỹ (búa bát giác viền vàng lõi lửa, tóc lửa, dải lụa bay); phông splash động ở màn chọn tướng.
- 2026-10-06: Moonstream dùng model hoạ sĩ có texture PBR: `imports/moonstream_pbr_game.glb` trong trận (101k → 31.589 tam giác, texture 1024, 3,0 MB, không nén để không cần WebAssembly), `moonstream_pbr_hq.glb` ở sảnh/chọn tướng (454k → 113.957 tam giác, texture 2048, nén meshopt 7,8 MB, nạp sau bản trong trận rồi thay vào; không giải nén được thì giữ bản trong trận). `import_fused.mjs`: nhiều vật liệu (thân / đầu-tóc / mắt), giảm lưới và giới hạn texture theo từng vật liệu, nén meshopt (`compress`), `showcase` → `<id>_showcase.glb`; 24 xương (4 xương váy), 11 clip viết tay `heroes/nguyet_ha.anim.mjs`. `hero.art.json` thêm `shading` (`toon` mặc định / `pbr` / `unlit`), `outline`, `showcaseShading`, `showcaseOutline` (09 §3.4); so sánh trong trận và ở sảnh: Moonstream dùng `pbr` (sảnh bỏ viền đen).
- 2026-10-06: Phản hồi chơi thử: nút X huỷ Chớp Bước (`hud/aimPad.js` dùng chung với nút kỹ năng), tướng quay mặt theo hướng chiêu tới hết lúc ra chiêu (`castUntil`/`castFacing`, `CAST_LOCK` 0,25s) rồi mới theo cần di chuyển, tướng to ×1,5, máu tướng ×1,3 (`HERO_HP_MULT`), quái yếu đi (`MONSTER_POWER`), 6 kiểu số sát thương (vật lý / phép / chuẩn × thường / chí mạng, `DMG_STYLE`), hiệu ứng kỹ năng v2 (lớp theo loại sát thương + chí mạng, đạn và hiệu ứng trúng riêng từng chiêu, dấu hiệu ra chiêu, atlas hạt 16 ô), hiệu ứng/đơn vị nổi trên bệ trại quái (`render/env/floor.js`), cảm ứng ≥ 5 ngón, người chơi tự cộng điểm kỹ năng bằng nút +, gộp font Be Vietnam Pro + bộ biểu tượng SVG.
- 2026-10-06: Model quái rừng + lính làm lại (`tools/modelgen/monsters.mjs`, `render/monsterModels.js`: đá cắt giác, pha lê, sừng, lông vũ, vây, lửa; shader vảy cá / lông vũ; mỗi model một draw call; lính: khiên quay ra trước mang màu đội, lính đèn khoác giáp màu đội, xe đá đầu rồng). Sảnh: sửa tóc Moonstream bị cắt ngang (`morph` + `hair` trong `import_fused.mjs`), Emberforge đứng chống búa (`ShowIdle`), tướng nhỏ hơn trong khung và khung tự chứa vũ khí giơ cao.

## Sảnh và luồng trước/sau trận kiểu Liên Quân + điểm trận (07/10)
- **Màn tải game** (ảnh 1): tranh mở màn dựng sẵn (6 tướng dưới trăng), thanh vàng + "Đang tải tài nguyên game (không tốn dung lượng)"
  + %. Phần tĩnh nằm sẵn trong `index.html` (thanh tự chạy bằng CSS lúc trình duyệt tải mã), JS tiếp quản và chạy theo việc tải thật:
  font, chân dung, thẻ tướng, nền phòng chờ, model trưng bày của tướng đứng ở sảnh (`src/ui/boot.js`, `src/main.js`).
- **Sảnh chính** (ảnh 2, `src/ui/home.js`): tướng 3D trên bệ giữa màn; trái trên ảnh đại diện + cấp + bậc hạng; cột bạn bè; phải trên
  vàng / ngọc / thư (số chưa đọc) / toàn màn hình / cài đặt; cột phải: sự kiện Lễ Hội Đèn Lồng (điểm danh 7 ngày), Sổ sứ mệnh, Xếp hạng
  bạn bè, Lịch sử đấu, thanh Điểm tích luỹ; dưới: kênh thế giới, Túi đồ / Tướng / Trang bị / N.vụ, nút thoi "Chọn chế độ", "Đấu thường",
  nút lớn ĐẤU HẠNG (huy hiệu + bậc). Các bảng: hồ sơ (đổi tên, ảnh đại diện, thống kê), bạn bè, thư, nhiệm vụ ngày, tướng (đặt tướng đứng
  ở sảnh), trang bị, túi đồ, cài đặt (chất lượng đồ hoạ — trận sau dùng), sự kiện, xếp hạng, lịch sử (`src/ui/panels.js`).
- **Chọn chế độ** (`src/ui/modes.js`): Đấu thường 5v5, Đấu hạng 5v5, Đấu đơn 1v1, Luyện tập (chọn độ khó máy cho đấu đơn/luyện tập).
- **Phòng chờ ghép trận** (ảnh 3, `src/ui/room.js`): nền 5 tướng quay lưng nhìn về nhà chính (dựng sẵn), 5 ô người chơi (mình ở giữa,
  bậc hạng), danh sách bạn để mời (bạn trực tuyến nhận lời sau 1–2 giây, đôi khi bận), Mời nhanh / Giải tán; Bắt đầu → "Đang tìm trận
  00:0x" (huỷ được) → "ĐÃ TÌM THẤY TRẬN": chấp nhận trong 12 giây, 10 ô sáng dần; bỏ lỡ thì về phòng.
- **Chọn tướng** (`src/ui/pick.js`): đồng hồ 30 giây, đồng đội máy chọn dần (tướng đồng đội khoá thì mình không chọn được), phép bổ trợ
  (hộp chọn có mô tả), bảng bùa, Khoá tướng; cả đội khoá → đếm 3 giây "VÀO TRẬN". Luyện tập: không giới hạn giờ, chọn đối thủ / hình nộm.
- **Đội hình** (ảnh 4, `src/ui/lineup.js`) và **tải trận VS** (ảnh 5, `src/ui/loading.js`): hàng 5 thẻ đội mình trên, 5 thẻ đối thủ dưới
  (ảnh tướng, huy hiệu hạng, tên tướng, tên người chơi "[Máy]", phép bổ trợ, thanh tiến độ riêng), mẹo, VS, % tổng — chạy theo việc tải
  model thật của từng tướng + quái/lính. Sân khấu 3D được giải phóng trước khi vào trận (một ngữ cảnh WebGL tại một thời điểm).
- **Hết trận**: chữ CHIẾN THẮNG / THẤT BẠI giữa màn ~3 giây (cảnh nhà chính nổ vẫn chạy), rồi 3 màn kết quả (`src/ui/postgame.js`):
  đội (tướng mình giữa, 4 đồng đội hai bên, điểm, MVP) → cá nhân (điểm trận lớn, Hạ/Chết/Hỗ trợ/KDA, danh hiệu, 4 huy chương Vàng tổng /
  Hạ / Chịu ST / Gây ST, các phần cộng thành điểm, vàng / kinh nghiệm / sao, điểm tích luỹ) → bảng tỉ số (Giản lược / Chi tiết, Số liệu =
  bảng điểm từng phần của cả 10 người + cách tính, Sảnh, Đấu lại).
- **Điểm trận + MVP** theo 08 §2 (`src/ui/score.js`); mô phỏng ghi thêm sát thương lên tướng / công trình / mục tiêu lớn, sát thương gánh
  chịu, hồi máu + khiên cho đồng minh, lính/quái kết liễu (`src/sim/damage.js`, `skills.js`, `spells.js`, `status.js`, `ctx.js`).
- **Bậc hạng theo 08 §1** (Đèn Dầu → … → Nguyệt Quang, Thái Dương), luật sao + Điểm tích luỹ + Bùa Giữ Sao (MVP thua) (`src/ui/profile.js`).
- Tên người chơi trên đầu tướng và trong bảng tỉ số trong trận. `?hero=<id>` vẫn vào thẳng trận để kiểm thử.
- Kiểm thử: `tools/` mô phỏng đều đạt; chạy trình duyệt headless trọn luồng (sảnh → … → kết quả → Đấu lại) cho cả 4 chế độ ở
  844×390 và 640×360, không lỗi console.
