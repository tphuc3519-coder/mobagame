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
- 2026-10-07: Tối ưu FPS trận: icon vẽ tay dựng sẵn (`assets/ui/paint`), cắt đơn vị ngoài khung (`render/unitView.js`), chia ô cảnh tĩnh (`render/env/chunk.js`), giảm lưới lính/quái (`tools/modelgen/lod.mjs`), dịch sẵn shader khi vào trận, tự chỉnh chất lượng (`render/autoQuality.js`), mô phỏng nhanh gấp ~2,2 (kết quả y hệt, `tools/t_determinism.mjs`).

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

## Rà soát lỗi (07/10)
- **Rò rỉ bộ nhớ GPU cả trận**: mỗi lính/quái có xương tạo một texture xương; lính chết thì view bị gỡ nhưng bộ xương không được giải
  phóng → mỗi đợt lính rò ~30 texture (đo: 46 → 341 texture sau 3,5 phút 5v5). Nay giải phóng khi gỡ đơn vị, khi đổi tướng ở sảnh,
  sau khi chụp chân dung bản đồ nhỏ (đo lại: texture được xoá theo lính chết, số còn lại bám theo số đơn vị đang sống).
- **Lớp CSS trùng với HUD trong trận** (`.cd` lớp phủ hồi chiêu, `.ic`, `.q`, `.sk`): ảnh thẻ ở trang chi tiết tướng phình to che kín
  màn, ô phép ở màn tải trận to bất thường → đổi tên lớp của giao diện sảnh.
- Bảng Trang bị ở sảnh trống ở thẻ "Gợi ý" (thẻ ảo của cửa hàng trong trận) → hiện bộ đồ gợi ý của tướng đứng ở sảnh.
- Mô tả kỹ năng K1–K3 trống ở màn chọn tướng / chi tiết tướng (dữ liệu tướng chưa có câu mô tả) → tự sinh từ số liệu
  (`src/ui/skilltext.js`: kiểu thi triển, tầm, sát thương theo cấp + hệ số, khống chế, khiên/hồi máu, hồi chiêu, năng lượng).
- Trong trận không có cách rời trận → nút **Đầu hàng** trong bảng cài đặt (bánh răng; chạm 2 lần để xác nhận; đấu hạng từ phút 8 theo 07 §9).
- Chọn chất lượng đồ hoạ trong Cài đặt ở sảnh trước đây không có tác dụng → trận và sân khấu sảnh đọc lựa chọn này.
- Hộp chọn phép / bảng còn mở khi hết giờ chọn tướng bị kẹt sang màn sau → đóng khi đổi màn. Mời bạn khi đang tìm trận → chặn.
- Cảnh báo console `toNonIndexed()` (đá trang trí 1v1) → bỏ.
- **Mục tiêu lớn hồi đầy máu giữa trận đánh**: người giữ aggro (thường là tướng đỡ đòn) chết / nhảy / tàng hình thì Long Ngư… bỏ về hồi
  đầy dù đồng đội vẫn đang đánh → nay đổi sang tướng vừa đánh trại trong 3 giây (06 §3), mục tiêu chỉ tạm không chọn được thì đứng chờ.
  Móc Neo / xoáy nước kéo được mục tiêu lớn (tốc chạy 0) ra khỏi hang → kẹt "đang về" mãi, hồi máu liên tục → mục tiêu lớn không bị kéo.
- Bố cục màn nhỏ 640×360: nút ĐẤU HẠNG xuống dòng, viên thuốc phép/bùa/đối thủ đè nút ở màn chọn tướng, màn điểm cá nhân tràn,
  cột tên tướng ở bảng tỉ số → sửa. Ô nhập tên gõ được trên iOS.
- Đã chạy: toàn bộ `tools/t_*.mjs` + `simtest` (mới: `t_rank.mjs` luật hạng / điểm trận), trình duyệt headless trọn luồng 4 chế độ
  (thắng và thua), mở mọi bảng ở sảnh, trận 5v5 dài theo dõi texture / hình học / đối tượng cảnh / DOM / NaN vị trí — không lỗi console.

## Giao diện ngoài trận v2 (07/10)
- **Bộ nhận diện mới** (`src/ui/css.js`): khung viền vàng kim có hoa văn góc (`.fr`, SVG nội tuyến), chữ tiêu đề Barlow Condensed nghiêng
  phủ dải vàng kim / bạc (`.gt` / `.gs`), nút vàng bóng có vệt sáng lướt, nút lam / đỏ / kính, nút tròn viền vàng, viên tiền tệ có biểu
  tượng tràn mép + nút "+", thanh tiến độ, ruy-băng nhãn, dải chữ CHIẾN THẮNG / THẤT BẠI trong trận.
- **Biểu tượng vẽ sẵn** (`assets/ui/icons/*.webp`, 29 ảnh — tiền, ngọc, thư, bánh răng, cúp, bạn bè, trò chuyện, cuộn sứ mệnh, kiếm, mũ
  tướng, trang bị, túi, sách, đồng hồ cát, rương, đèn lồng, sao, bia, cửa hàng, tia sét, 8 huy hiệu bậc hạng) dựng bằng
  `tools/uiart/icons.cjs` (cùng kiểu vẽ canvas với biểu tượng kỹ năng `src/hud/paint.js`).
- **Sảnh**: tướng 3D đứng trên bệ giữa quảng trường đêm dựng sẵn (`assets/ui/lobby.jpg` — đài phun đèn lồng, hàng cột, tháp, đèn
  đường, dây đèn, trăng; canvas nền trong suốt chồng lên ảnh), thẻ người chơi (cấp, huy hiệu, thanh kinh nghiệm), cột bạn bè, tiền tệ,
  băng sự kiện có rương, 3 ô Sứ mệnh / Xếp hạng / Lịch sử, thanh Tướng / Trang bị / Túi đồ / Bạn bè, nút pha lê Chọn chế độ / Đấu thường,
  nút vàng ĐẤU HẠNG có huy hiệu bậc.
- Làm lại **chọn chế độ, phòng chờ, hộp "Đã tìm thấy trận", chọn tướng** (biểu tượng kỹ năng vẽ, đồng hồ vòng đếm ngược, khung đội),
  **đội hình** (tia sáng xoay sau tướng), **tải trận** (thẻ viền lam / đỏ / vàng, huy hiệu, chữ VS), **3 màn sau trận** (tia sáng, huy
  chương vàng / bạc / đồng vẽ sẵn), **mọi bảng** (hồ sơ, bạn bè, thư, nhiệm vụ, tướng + kỹ năng, trang bị, túi đồ, cài đặt, sự kiện
  điểm danh, xếp hạng, lịch sử) và **màn tải đầu game**.
- Ảnh toàn thân sau trận tự vừa khung theo hình (trước: búa của Emberforge bị cắt ở mép).
- Màn lớn (từ 900×560): phóng cả lớp giao diện 1,25–1,5 lần cho cân với cảnh 3D.
- Đã chạy: `t_rank`, `t_combat`, `t_items`; trình duyệt headless trọn luồng đấu hạng (sảnh → ghép trận → chọn tướng → trận → kết quả →
  Đấu lại), chụp mọi màn / bảng ở 844×390, 640×360, 1280×720 — không lỗi console.

## Tối ưu FPS trận trên web / iPhone (07/10)
- Báo lỗi: "Game trên web lag lắm". Đo trận 5v5 giữa trận (phút 2–3, mức Vừa): mỗi khung **~2,9 triệu tam giác, ~300 lệnh vẽ**
  (kể cả lượt bóng đổ) dù camera chỉ thấy ~4% bản đồ; đầu trận còn **vẽ lại ~50 icon trang bị trên luồng chính** (~0,1–0,3 giây mỗi
  icon → giật liên tục 15–20 giây đầu trận); giữa trận khựng mỗi khi shader mới được dịch (lính / quái / chiêu / vùng bản đồ mới lần đầu
  hiện ra — iPhone mất 0,05–0,3 giây mỗi shader).
- Sửa:
  - **Icon vẽ tay dựng sẵn thành ảnh** (`assets/ui/paint/*.webp`, 80 ảnh 192², ~770 KB, `tools/uiart/paintart.cjs`): 50 trang bị,
    18 kỹ năng, 8 phép bổ trợ, đánh thường. Màn chọn tướng, màn tải, cửa hàng, bảng kết quả chỉ tải ảnh; món chưa có ảnh vẫn vẽ như cũ.
  - **Không vẽ đơn vị ngoài khung hình** (`src/render/unitView.js`): lính / quái ngoài màn tách khỏi cảnh (không vẽ, không đổ bóng,
    không tính xương, ngừng hoạt ảnh); tướng chỉ ẩn. Trước đây mesh có xương đặt `frustumCulled = false` nên ~70 đơn vị cả bản đồ đều vẽ.
  - **Chia ô cảnh tĩnh** (`src/render/env/chunk.js`): đá / tường / vách gộp cả bản đồ tách thành ô 3 200 đơn vị để chỉ vẽ ô trong khung
    nhìn và hộp bóng; cảnh đứng yên thôi tính lại ma trận mỗi khung. Ảnh toàn bản đồ so với bản cũ: trùng khớp.
  - **Lính / quái nhẹ hơn** (`tools/modelgen/lod.mjs`, meshoptimizer): lính 12–15k → 3,6–4,8k tam giác, quái 16–21k → 6,4–10,7k (khoá
    ranh giới vùng chất liệu, giữ xương / màu); 12 file GLB 6,5 MB → 3,4 MB (tải nhanh hơn). `monsters.mjs` tự giảm lưới khi sinh lại.
  - **Dịch sẵn shader khi vào trận** (`warmUp` trong `src/game.js`, màn che "Đang vào trận…"): dựng tạm lính 4 loại × 2 đội, quái mọi
    loại, mỗi loại hình hiệu ứng một cái, dịch cả cảnh (gồm ô bản đồ ngoài màn hình, chỉ báo chiêu đang ẩn) đúng biến thể vẽ qua hậu
    kỳ, vẽ thử một khung với hộp bóng phủ cả bản đồ. Giữa trận chỉ còn 1 biến thể bóng đổ nhỏ được dịch (lúc ~25 giây).
  - **Tự chỉnh chất lượng theo FPS thực** (`src/render/autoQuality.js`): máy không giữ nổi FPS mục tiêu → độ phân giải ×0,84 → ×0,7 →
    tắt bóng đổ thời gian thực (không dịch lại shader) → ×0,6; mỗi bậc đo thử, không nhanh hơn (máy nghẽn CPU, iPhone bật Nguồn điện
    thấp khoá 30 khung/giây) thì trả lại; chạy đủ nhanh lâu thì thử nâng lại. `?noauto` tắt (kiểm thử).
  - **Mô phỏng nhanh gấp ~2,2 lần, kết quả y hệt**: tra tường bằng lưới ô (`clampToMap`), lính đẩy nhau bỏ qua cặp xa (`minions.js`).
    `tools/t_determinism.mjs` băm trạng thái mọi đơn vị mỗi phút: trùng khớp bản cũ (5v5 + 1v1, seed 1 và 7).
  - Khác: mức Thấp (khoá 30 khung/giây) trước đây hoạt ảnh / camera chạy chậm một nửa (lấy nhịp màn hình thay vì thời gian giữa hai lần
    vẽ) — đã sửa; bản đồ nhỏ vẽ ~20 lần/giây; số sát thương bay không đo chữ lại mỗi khung.
- Kết quả đo (cùng cảnh, kể cả lượt bóng): **2,92 triệu → 0,55 triệu tam giác/khung, ~300 → ~225 lệnh vẽ**; mô phỏng 5v5 2,6 → 1,2 ms/tick (Node, phút 1–6).
  Chưa đo được FPS thật trên iPhone ở đây (máy kiểm thử dùng GPU giả lập) — cần bạn thử lại.
- Đã chạy: toàn bộ `tools/t_*.mjs` + `simtest` + `t_determinism`, trọn luồng đấu hạng trên trình duyệt headless (sảnh → chọn tướng →
  tải → trận → kết quả → đấu lại), mức Thấp / Cao, bản đồ 1v1 — không lỗi console.

## Sửa lỗi tướng không hiện trên iPhone (07/10)
- Báo lỗi: ở màn chọn tướng đổi sang Moonstream mà sân khấu vẫn là Emberforge; vào trận không thấy model tướng, bản đồ nhỏ chỉ hiện
  chữ "M". Nguyên nhân: một lần tải model hỏng (mạng điện thoại chập chờn / Safari ngắt tải khi chuyển tab) bị **ghi nhớ thành "không có
  model"** tới khi tải lại trang. Tái hiện bằng cách chặn tải `nguyet_ha.glb` vài lần — ra đúng các triệu chứng trên.
- Sửa (`src/render/assets.js`): mỗi lần gọi thử tải 3 lần, lỗi không còn bị ghi nhớ (lần gọi sau tải lại); mạng treo 20 giây không nhận
  thêm byte nào thì huỷ để thử lại; giải mã lỗi thì đọc lại bằng bộ đọc mặc định của three; điện thoại bỏ bản trưng bày chi tiết
  (texture 2048², đỡ tốn bộ nhớ).
- Sân khấu sảnh / chọn tướng: tướng chưa tải được thì giữ tướng cũ, hiện "Đang tải tướng…", tự thử lại tới khi được. Trong trận: hình
  nhân giữ chỗ rồi tự thay bằng model thật; chân dung bản đồ nhỏ chụp lại; màn tải trận gọi tải lại tướng còn thiếu. Tải lỗi hẳn thì hiện
  thông báo kèm lý do (để biết nguyên nhân khi chơi trên điện thoại).
- Đã chạy: giả lập 4–6 lần tải hỏng ở màn chọn tướng và trong trận (tự hồi phục), trọn luồng đấu đơn với Moonstream — không lỗi console.

## Cài đặt đồ hoạ + mượt hơn trên điện thoại (13/10)
- Báo lỗi: "Trên điện thoại còn lag FPS lắm — cần tuỳ chỉnh đồ hoạ, đồ hoạ cao nhất cũng không được lag". Nguyên nhân tìm được:
  - **Bộ tự giảm kẹt ở 30 FPS**: nó đo trung vị khoảng cách khung, mà màn 60 Hz chỉ cho 16,7 / 33,3 ms. Máy vẽ mất 20–22 ms/khung thì
    khung nào cũng chờ 33,3 ms; bậc đầu (tắt khử răng cưa) không đủ vượt nhịp màn hình → bị coi là "hạ không giúp", trả lại và không bao
    giờ thử hạ độ phân giải → 30 FPS cả trận. Máy trễ nhịp ~40% số khung (~43 FPS, giật rõ) có trung vị 16,7 nên không bị phát hiện.
  - **Hậu kỳ ~15 lượt vẽ toàn màn** (EffectComposer + UnrealBloomPass 5 tầng + OutputPass + chỉnh màu) — nặng băng thông trên GPU iPhone.
  - **Shader nền ~28 lần lấy mẫu texture mọi điểm ảnh** (kể cả lớp không góp gì: đá lát nhân 0, pháp tuyến đá nhân 0, phát sáng 0) và
    lấy mẫu bóng PCF hai lần; **shader sông 26 mẫu** + tia sáng đáy (caustics) tính ở mọi điểm.
  - Cây / đá / tường vẫn vẽ vào bản đồ bóng mỗi khung dù bóng của chúng đã nướng sẵn trên nền.
- Sửa:
  - **Cài đặt đồ hoạ** (Cài đặt ở sảnh + nút bánh răng trong trận, `src/ui/gfxSettings.js`): mức Thấp / Vừa / Cao + chỉnh từng mục — độ
    nét, khung hình 30/60, bóng đổ, ánh sáng rực, khử răng cưa, chi tiết cảnh, tự giảm khi giật, hiện FPS. Đổi trong trận áp dụng ngay,
    không khựng (không dịch lại shader); chi tiết cảnh áp dụng từ trận sau. Lưu trong máy. Mặc định: điện thoại Vừa, máy tính Cao.
  - **Hậu kỳ mới** (`src/render/post.js`): tối đa 7 lượt — cảnh → lọc sáng thu 1/4 → làm mờ ở 1/4 và 1/8 (MRT: một lượt ngang ra hai
    bán kính) → một lượt cuối: cộng bloom, tone map, làm nét, chỉnh màu, vignette. Dáng và độ sáng quầng giữ như cũ (đo phần bloom cộng
    thêm ở sân nhà: năng lượng tương đương, phân bố trùng).
  - **Shader nền / sông theo chi tiết cảnh** (`env/ground.js`, `env/water.js`): mức Cao ra ảnh như cũ nhưng bỏ qua lớp không góp gì
    (nhánh động: đường, lòng sông, mặt đá hoạ tiết chỉ tính nơi có), bóng nắng lấy lại từ vòng đèn thay vì lấy mẫu lần hai; sóng nước
    tính sẵn sai phân (1 mẫu/tầng thay vì 3), tia sáng đáy chỉ nơi nước cạn. Vừa / Thấp bớt tầng. Nền chia 3–4 phần theo biến thể
    (`splitGround`): phần lớn sân không `discard` (GPU iPhone loại sẵn điểm ảnh bị che), không mang khối hoạ tiết sân nhà.
  - **Chỉ nhân vật đổ bóng thời gian thực**: ~225 → ~140 lệnh vẽ mỗi khung ở mức Vừa, ảnh không đổi.
  - **Bộ tự giảm mới** (`src/render/autoQuality.js`): trung bình 90% khung nhanh nhất thay trung vị; bậc nào không giúp (VD tắt MSAA trên
    GPU xếp ô) thì thử luôn bậc dưới; thêm bậc tắt ánh sáng rực. Mô phỏng màn 60 Hz: máy 20–22 ms/khung từ kẹt 30 FPS → ~58 FPS (hạ độ
    nét 1–2 bậc); máy nghẽn CPU / Nguồn điện thấp: giữ nguyên chất lượng, thỉnh thoảng thử lại (thưa dần).
  - CPU: tầm nhìn tra tường bằng lưới ô; bớt cấp phát mỗi khung (danh sách đơn vị, cập nhật hạt từng đoạn).
  - Sông: dải mép đã trong suốt hẳn (~1/5 tấm nước) thoát sớm khỏi shader — điểm ảnh trùng khớp, sông nhẹ hơn ~30%.
- Kết quả đo (GPU giả lập SwiftShader — chỉ so tương đối; khung 844×390 ×3 như iPhone, cùng cảnh giao tranh phút 1:15, kể cả bóng +
  hậu kỳ), mỗi khung: bản đang chạy (07/10) Vừa **1 879 ms** / 173 lệnh vẽ, Cao **3 354 ms** / 180 → bản mới Thấp **350 ms** / 116, Vừa
  **788 ms** / 131 (nhanh gấp ~2,4), Cao **2 136 ms** / 134 (nhanh gấp ~1,6, cùng độ nét 2 + MSAA 4x + bóng + bloom). Ảnh so với bản
  trước ở sân nhà, mép vực, rừng, sông, toàn bản đồ: trùng (khác do thời điểm hiệu ứng / vị trí tướng); phần bloom cộng thêm tương đương.
- Đã chạy: `tools/t_*.mjs` + `simtest` + `t_determinism` (băm trùng bản trước), mô phỏng bộ tự giảm (màn 60 Hz, 7 tình huống), bộ tự
  giảm trong trình duyệt (hạ đủ 5 bậc, không lỗi), bảng cài đặt sảnh + trong trận (lưu, áp ngay, đổi mức), trọn luồng đấu thường
  (sảnh → phòng → chọn tướng → trận → kết quả → đấu lại) — không lỗi console. Chưa đo được FPS thật trên iPhone ở đây.

## Thông báo hạ gục kiểu Liên Quân, luật tính mạng / hỗ trợ, cục máu sau trụ, Hồi Máu 60s (14/10)
- Theo video người chơi gửi (dải "Chiến công đầu" ở giữa phía trên, "+225v" trên đầu tướng) và yêu cầu:
  - **Thông báo hạ gục** (`src/hud/killBanner.js`): mọi lần tướng chết, cả đội ta hạ (dải xanh) lẫn đội địch hạ (dải đỏ). Vệt sáng quét
    ngang mở màn → dải: chân dung người hạ — tiêu đề — chân dung bị hạ có vạch chéo đỏ quẹt qua; người hỗ trợ là chân dung nhỏ.
    Chiến công đầu; **Double / Triple / Quadra / Penta Kill** (hai mạng cách nhau ≤ 10s; chữ lớn vàng, tia sáng toả); chuỗi hạ gục khi chưa
    chết: Liên tục hạ gục (3) → Hủy diệt → Không thể cản phá → Thần thánh → **Truyền thuyết** (7+); Chặn đứng (hạ người có chuỗi ≥ 3);
    "Bị hạ gục" + biểu tượng trụ / lính / quái khi không tướng nào được mạng; hạ mục tiêu lớn. Hàng đợi, dồn thì rút ngắn.
    Biểu tượng trụ vẽ dạng tháp răng cưa có cửa vòm sáng (bản đầu đầu nhọn thân loe trông như cái chuông của iPhone — người chơi báo).
  - **Vàng "+N"** kèm đồng vàng nảy lên trên đầu tướng mình mỗi khi nhận vàng (hạ tướng, hỗ trợ, kết liễu lính / quái, phá trụ).
  - **Luật tính mạng** (`src/sim/damage.js`): mạng thuộc tướng địch gây sát thương **cuối cùng** trong 10 giây — kể cả khi lính / trụ /
    quái kết liễu; mọi tướng địch khác đã đánh trong 10 giây là **hỗ trợ** và chia 50% vàng mạng (tối đa 150 mỗi người — như tài liệu
    03 §A10, trước đây chưa làm). Trước đây trụ / lính kết liễu thì không ai được mạng.
  - **Cục máu sau trụ ngoài** cả 3 đường, hai đội (`src/sim/orbs.js`, `src/render/orbs.js`): đài sen + quả cầu sinh lực xanh lơ lửng có
    đốm sáng bay quanh; chạm vào hồi 15% HP + 15% năng lượng, mọc lại sau **60 giây** (vòng sáng trên đất chạy đếm ngược); chỉ phe mình
    lấy, đầy máu đi qua không mất; chấm xanh trên bản đồ nhỏ.
  - **Hồi Máu**: hồi chiêu 120 → **60 giây**; tướng địch gây sát thương lên thì **mất hiệu ứng hồi** (hiện "Mất hồi máu", mảnh đỏ vỡ).
    Lính / trụ đánh không cắt. Bot chỉ dùng khi không có tướng địch trong 900.
- Sửa lỗi có sẵn: thông báo hạ mục tiêu lớn chưa bao giờ hiện — dữ liệu sự kiện có trường `type` (loại quái) đè lên loại sự kiện
  `monsterKill`. `world.emit` nay luôn giữ loại sự kiện; trường đổi tên `monster`.
- Trận 10 bot 20 phút (seed 1): 40 lần tướng chết, 11 lần trụ / lính kết liễu được tính cho tướng đánh cuối, 4 lần bị trụ hạ, chiến công
  đầu lúc 70s, 2 Double Kill, chuỗi tới 6, 3 lần chặn đứng; bot tự nhặt cục máu ~21 lần mỗi đội (đường lùi đi qua).
- Đã chạy: `tools/t_kills.mjs` (mới, 23 kiểm tra: tính mạng khi trụ kết liễu, hỗ trợ + chia vàng, quá 10 giây, Double → Penta, chuỗi,
  chặn đứng, Hồi Máu bị cắt / không bị lính trụ cắt, cục máu), toàn bộ `tools/t_*.mjs` + `simtest`, `t_determinism` (hai lần chạy trùng
  nhau), ảnh chụp từng loại thông báo + cục máu trên trình duyệt, trọn luồng chơi.

## Âm thanh kiểu MOBA + bảng Cài đặt kiểu Liên Quân + bản đồ (14/10)
- **Âm thanh** (người chơi: "thêm hiệu ứng âm thanh cho sảnh và tướng… thật chuyên nghiệp, đánh vào người…"): 79 hiệu ứng + nhạc sảnh +
  âm nền trận, **tổng hợp hoàn toàn bằng code** (`tools/sfx`, không dùng file ghi âm ngoài), một file sprite MP3 ~1,2 MB + nhạc 0,7 MB +
  âm nền 0,27 MB.
  - Sảnh: nhạc ngũ cung (đàn tranh, sáo trúc, trống) lặp liền mạch; tiếng cho mọi nút (một bộ nghe chung), chuyển màn, tìm thấy trận,
    khoá tướng, đồng đội khoá, tích tắc 5 giây cuối, VS, phần thưởng; nhạc tắt dần ở màn tải trận.
  - Trận: mỗi tướng một bộ tiếng — đánh thường theo vũ khí (búa / chảo / roi sắt: vung nặng; kiếm / song đao / quạt: vung nhẹ; cung, nỏ,
    ná, cầu đá: bắn; pháp sư: bắn phép), tiếng trúng (thịt, chém, giáp, phép, chuẩn, **chí mạng**), chiêu theo nguyên tố (lửa, nước, lá,
    gió, ánh sáng, huyền bí, đất) + gầm trầm khi tung chiêu cuối; trụ bắn / trúng, lính, quái, boss gầm, phá trụ, choáng, hất tung, khiên,
    Hồi Máu (+ bị cắt), phép bổ trợ, Trừng Trị, lướt, Chớp Bước, vàng, mua đồ, lên cấp, về thành, hồi sinh, cục máu; tù và khi vào trận và
    đợt lính đầu; nhạc báo theo thông báo hạ gục (chiến công đầu, Double → Penta cao dần, chuỗi, chặn đứng, bị trụ hạ, hạ boss); thắng/thua;
    âm nền gió – lá – chim – suối rất nhỏ. Tiếng theo vị trí (xa nhỏ dần, lệch trái/phải), chỉ phát thứ đội mình thấy, giới hạn số tiếng.
  - Cân độ to theo loa điện thoại: bản đầu tiếng đánh vào người / tướng chết gần như chỉ có phần trầm mà loa iPhone không phát — làm lại
    thân tiếng ở dải 250–1000 Hz, đo độ to cả dải loa: tiếng đánh vào người to hơn ~12 dB trên loa điện thoại.
- **Bảng Cài đặt kiểu Liên Quân** (theo 14 ảnh người chơi gửi; `src/ui/settingsModal.js`, kho cài đặt `src/core/prefs.js`): 6 thẻ
  Thiết lập đồ hoạ · Điều khiển · Thiết lập giao diện · Thiết lập · Âm thanh · Dữ liệu; dùng chung sảnh và trong trận (trận: nút Đầu hàng
  ở chân bảng); đổi là lưu + áp dụng ngay. Danh sách đầy đủ: 07 §12. Các mục chỉ có ý nghĩa khi chơi trực tuyến (trò chuyện, mic, ping,
  like, nhận/đáp lỗi, tự từ chối đầu hàng, mạng WIFI + 3G/4G) không làm — game đang đấu với máy ngay trên điện thoại.
- **Điều khiển theo cài đặt** (07 §9.1): cần di chuyển đi theo ngón (đế trượt theo khi kéo xa) / cố định, độ nhạy xoay chiêu, vòng ngắm quanh
  nút / tại chỗ ngón chạm, huỷ chiêu bằng ô X / kéo xa, tung chiêu tự nhắm, hướng Chớp Bước (hướng chạy / hướng chiêu / về phía địch), chế
  độ công chỉ định (một nút Đánh / thêm Ăn lính + Đẩy trụ / chạm vào địch để khoá), đánh thường chính xác, dấu mục tiêu, chế độ + tốc độ
  camera, luật chọn mục tiêu (mặc định % máu thấp nhất — trước đây không ưu tiên tướng; tính trong mô phỏng qua lệnh `targetBy`, bot không
  gửi nên trận toàn bot vẫn tất định như cũ).
- **Giao diện / thiết lập theo cài đặt**: vị trí cửa hàng, đồ đề cử, mô tả trang bị, thông số mục tiêu, khung camera trên bản đồ nhỏ, hồi
  chiêu số thập phân, ảnh tướng khi tung chiêu cuối, tướng địch ở rìa màn hình, miêu tả chiêu (mặc định tắt), tên chiêu dưới nút; góc
  camera gần / xa, độ sáng 5 mức, viền nhân vật, bảng hạ gục, sương mù.
- **Bản đồ** (người chơi khoanh ô vàng / vùng xanh trên ảnh; "thêm bụi đối xứng cho cả map từ chỗ gần trụ 1"): bụi bờ sông đủ bốn cửa sông
  cạnh trụ ngoài, đi theo cặp đối xứng tâm như hai hang; ruộng cạnh bụi bờ có dải bệ đá dọc mép bụi + bệ mép đường và **cột đá đèn lồng**
  ở khe mép đường (03 — "Bản đang chạy").
- **Tướng máy 5v5 tự gỡ kẹt** (`ai/laneBot.js`): muốn đi mà đứng yên ~0,5 giây và đường thẳng tới đích bị tường chắn → tìm đường vòng trên
  lưới và đi theo tới khi thấy thẳng tới đích. 4 trận 20 phút (seed 1–4): kẹt lâu nhất 287 giây → 11 giây, tổng thời gian kẹt > 3 giây
  809 → 98 giây. Bộ kiểm tra Node đều đạt (t_arena, t_bot, t_combat, t_determinism, t_items, t_jungle, t_kills, t_map, t_rank, t_restore,
  t_target, simtest).

## Tối ưu Safari + tướng nét hơn, bỏ viền + tung chiêu có lực (16/10)
Người chơi: "Tối ưu fps trên safari đi, đang bị lag, đồ hoạ model nhân vật nét hơn với đừng có mấy cái viền gây chướng mắt nữa. Nhân
vật tung skill cũng có hồn có lực hơn chứ đừng đơ đơ như vậy".
- **Khựng giữa trận do bản bot gỡ kẹt hôm trước**: tìm đường A* sắp xếp lại cả danh sách mở mỗi bước → có tick mô phỏng 150–340 ms
  (máy chủ; iPhone còn lâu hơn). Viết lại bằng đống nhị phân + A* có trọng số + giới hạn 1500 ô: tick nặng nhất 306 → 34 ms (bằng trước
  khi có bot gỡ kẹt), bot vẫn gỡ kẹt như cũ.
- **Bỏ viền nhân vật** (viền đen + viền sáng màu đội; bỏ mục "Viền" trong Cài đặt) và vân vẽ tay quá mịn (lốm đốm, nhấp nháy ở màn điện
  thoại); normal map nửa độ, PBR nhám hơn, lọc xiên texture. **Mức Vừa (mặc định điện thoại) thêm MSAA 2x** — mép tướng hết răng cưa;
  Cài đặt → Khử răng cưa Tắt / 2x / 4x. Ảnh so sánh: tướng sạch, hết chấm vàng và viền đen răng cưa.
- **Safari**: sương mù không còn nạp canvas 2D lên GPU 10 lần/giây (Safari đọc ngược ảnh canvas) — tính trên mảng số, 0,1 ms/lần; chân
  dung tướng chụp sẵn lúc vào trận; vòng tầm trụ dịch shader sẵn; không đọc nhật ký dịch shader (trừ ?debug); màn xám khi chết làm
  trong hậu kỳ thay vì CSS filter; lính chỉ bóng tròn. Đo trên Chromium (trận phút 5): JS mỗi khung giảm rõ, dịch shader giữa trận
  gần như hết.
- **HUD**: số bay chỉ cho đòn mình gây / mình nhận (như Liên Quân — trước có số cho cả lính đánh lính), tên + huy hiệu cấp vẽ sẵn
  (vẽ HUD ~3,3 → 0,6 ms/khung trên Chromium); số vàng chỉ đổi chữ.
- **Ra chiêu có hồn, có lực**. Nguyên nhân "đơ": clip sinh bằng code nội suy smoothstep
  giữa mọi khung (động tác nào cũng đều đều), phát một tốc độ cố định, thân không có lực; tư thế chạm thường lệch lúc chiêu phát ra — VD
  Vung Búa (Emberforge): lửa bung ở khung đầu nhưng búa ~0,3 giây sau mới giáng.
- Sửa (chỉ phần nhìn — không đụng mô phỏng, không dựng lại model; chi tiết 02 §13.5):
  - `render/animator.js`: phân tích mỗi clip một lần lúc nạp (điểm chạm, đỉnh gồng, hướng cú đánh); clip hành động phát theo nhịp uốn —
    gồng chậm dần → giáng nhanh, tư thế chạm rơi đúng tick chiêu / đòn phát ra → khựng → thu đòn; lớp thân lò xo trên node model (ngả,
    lao tới / giật lùi, co – duỗi, vươn người khi giơ trời, nén người khi bổ / đập); khựng khi đòn trúng.
  - `render/unitView.js`: lúc phát ra theo tick mô phỏng; quay mặt về hướng đòn trong ~2 khung; người trúng (tướng, hình nộm, quái lớn)
    bị đẩy giật + ngả theo cú đánh, chờ đúng lúc vũ khí người đánh tới.
  - `render/camera.js`: giật camera nhẹ theo hướng chiêu của người chơi (chiêu cuối mạnh hơn; tắt khi máy bật giảm chuyển động).
  - `render/vfx/library.js`: tụ lực ở tay / vũ khí suốt lúc gồng, loé + bùng ở mũi vũ khí đúng khung chạm; cú búa Xỉ Sắt theo clip.

## Kiểm toán 19/10 — Giai đoạn 1a + 1b: mở đủ 20 tướng, luật 5v5 còn thiếu
- **Mở khoá 14 tướng** (Hạnh Hoa, Tiểu Ảnh, Bà Năm Chảo, Cầu Mây, Bóng Đèn, Thầy Đồ, Kép Chèo, Mèo Thần Tài, Phù Đổng, Thư Linh, Kiếm Thuỷ,
  Lưỡng Cực, Nhãn Sư, Trạng Nhí) — `ALPHA` giờ là 20 tướng; màn chọn, đội hình bot, chế độ thử (`?hero=<id>`) đều dùng được.
  - Kiểu chiêu mới (`src/sim/skillTypes.js`): `line` (đường thẳng nhiều nhịp, hiệu ứng khi trúng đủ nhịp), `tether` (trói nối, hết giờ còn
    trong tầm thì choáng, đứt khi người trói bị khống chế / kéo giãn), `recast` (phân thân giấy tự bắn, kích hoạt lại đổi chỗ), `targetedDash`
    (lao khoá mục tiêu), `targeted` (đạn khoá mục tiêu); chém liên hoàn sau cú lướt; tua ngược vị trí + máu (lịch sử 0,5 s/mẫu).
  - Kiểu cũ thêm: bắn nhiều phát (`count`/`interval`, phát sau bám mục tiêu phát đầu), biến thể ngẫu nhiên (Pháo Giấy nổ vùng giảm dần,
    Đá Lộn Ngược), xuyên N mục tiêu, chỉ trúng tướng, nhiều đợt sóng + hất ngược đạn, nhiều tia trong quạt (đếm tia trúng → kiệt sức),
    khiên đồng minh trong vùng, miễn đòn đánh thường, hiệu ứng tức thời (đẩy lùi, hút về, giải khống chế, cắt chiêu — `sim/effects.js`).
  - Hook nội tại mới: `onCast` (đổi đòn sắp ra: `cast.dmgAdd/dmgMult/extraEffects`), `onTakeDamage` (giảm / né hẳn), `onSkillMiss`,
    `canCast` / `canTarget` (điều kiện riêng: đủ Ấn, đủ Tầm Nhìn, máu dưới 30%, đủ 2 Manh Mối); công cụ tầng dấu `addStack/stacks/clearStack`;
    `passive.gauge` hiện cạnh thanh máu (Nụ 2/4, Ấn 3/5, Tầm Nhìn 60/100…).
  - Trạng thái mới: `noDash` (không lướt / Chớp Bước), `blind` (đánh thường có tỉ lệ trượt), `suppress`, `basicImmune`, `mark`; hồi máu theo %.
  - HUD: chiêu khoá mục tiêu kéo để chọn, nút xám khi chưa đủ điều kiện, nút vàng khi đang trong cửa sổ kích hoạt lại; bot dùng đủ các kiểu mới
    (`ai.ultRule` hpBelowX cho Đổi Vai / Đồng Hồ Ngược; hồi máu nhắm đồng minh máu thấp nhất).
  - Hình: màu chủ đề 14 tướng, hiệu ứng mới `render/vfx/extra.js` (nét chém đường thẳng, dây trói, giấy vụn phân thân, phản đạn, tua ngược,
    chuỗi chém, né / trượt, tráo máu, nội tại bùng); phân thân vẽ mờ như bóng. Ảnh thẻ + toàn thân 14 tướng dựng bằng `tools/uiart/render.cjs`
    (sửa công cụ gãy vì gọi hàm viền đã bỏ).
- **Luật 5v5 (03 §A4–A7)**: giáp trụ ngoài (−40% sát thương trước phút 4), trụ nhà hồi 15 máu/giây khi yên 8 s, lính quay sang đánh tướng
  địch vừa đánh tướng phe mình (giữ 2,5 s), bùa xanh / đỏ rơi sang người hạ (giữ thời gian còn lại, ít nhất 30 s), hạ Tà Thần → mỗi đường
  một Người Đá Đèn đẩy đường cho đội hạ; Lính Đèn Lớn trâu hơn dưới trụ (trụ bắn 20% máu / phát thay vì 45%).
- **1v1 không hoà mãi**: tướng hồi máu / đỡ đòn đấu nhau từng kéo 40 phút (14/50 trận bot hoà). Từ phút 18 đội đã phá trụ địch có siêu lính,
  từ phút 30 công trình nhận gấp đôi sát thương và thôi hồi máu; bot lao phá trụ khi đối thủ còn chết ≥ 6 s. Đo lại: 50/50 trận kết thúc, TB 20,4 phút.
- Kiểm thử mới: `node tools/t_heroes.mjs` (cơ chế từng tướng + 14 trận bot 90 s), `node tools/t_rules5v5.mjs`. Toàn bộ `tools/t_*.mjs` đạt.

## Kiểm toán 19–20/10 — Giai đoạn 1c: bot 5v5 có não đội
- **Não đội** (`src/ai/teamBrain.js`): mỗi giây giao lệnh thủ trụ / đánh mục tiêu lớn / dồn đường cho bot rảnh; bot đường (`laneBot.js`) làm theo,
  đứng ngoài tầm trụ chờ lính khi đẩy, chỉ lặn trụ khi an toàn.
- **Hai hang Long Ngư / Hổ Lôi lên trục sông** cho công bằng hai phe; Thần Điểu / Tà Thần mọc phút 12; gom đội đẩy đường từ phút 10.
- **Đo** (`node tools/t_arena_batch.mjs 50 normal`, ~19 phút máy): 50/50 kết thúc, trung vị **15,9 phút**, Xanh **54%**, mục tiêu lớn **3,6 /
  trận**, 0 lỗi. Trước GĐ1c: trung vị 22,6 phút, Xanh 65% (đo đổi bên cùng đội hình), mục tiêu lớn gần như không ai đánh.

## GĐ2 (nhánh gd2-trongtran): chiêu khoá mục tiêu, Áp chế, Không thể cản, 3 đồ kích hoạt mới (20/10)
- **Áp chế** (`sim/suppress.js`): sợi xích nối người gây và mục tiêu — mục tiêu không đi / đánh / chiêu / phép / đồ / Hồi Máu / Biến về,
  không giảm bởi kháng hiệu ứng, Giải Trói không gỡ; người gây đứng niệm giữ, đứt khi bị khống chế cứng / câm lặng / khiêu khích / bị cắt chiêu
  / chết / tự dùng phép, đồ. Một cửa chặn lệnh duy nhất ở `sim/commands.js`. Bóng Đèn K2 Trói Bóng: áp chế 1,25s rồi choáng 0,8s (hồi 13→10,5s).
- **Không thể cản** (`unstoppable`): Bà Năm K3 Dép Bay 0,5s, Kiếm Thuỷ K3 Nhật Vũ 0,35s — miễn khống chế, không bị đẩy / hút / cắt chiêu (hết
  cùng cú lướt). Miễn khống chế (cả Giải Trói, cú bay của Mèo) giờ chặn luôn đẩy / hút / cắt chiêu. Bị trói không lướt được.
- **Chiêu khoá mục tiêu**: lệnh mang `aim.id` — chạm nhanh dùng mục tiêu đang khoá, kéo thì dấu vàng xem trước đúng tướng sẽ bị chọn và gửi đúng
  tướng đó; bot gửi đúng tướng nó chọn. Đạn khoá mục tiêu trượt khi mục tiêu vào Sương Đông / không thể chọn giữa đường; Sương Đông chặn mọi
  hiệu ứng của địch.
- **Đồ kích hoạt** (`sim/itemActives.js`): tối đa 2 món / túi, HUD 2 nút (nút 2 xếp trên nút 1; phím E / Q), mờ khi không có mục tiêu, xám khi bị
  khống chế. Món mới: **Xích Đồng** (Xích Giữ — áp chế 1,25s), **Lọng Hộ Mệnh** (Lọng Che — khiên cả nhóm), **Dải Lụa Gió** (Lụa Gió — lướt
  320). Danh mục 56 món. Bot dùng theo `BOT.items` (06 §4.7), bot 5v5 đánh trước kẻ bị áp chế / đang niệm.
- Chữ trên đầu `ÁP CHẾ` / `KHÔNG THỂ CẢN`, thanh niệm tím, chữ lý do khi bấm hỏng; hiệu ứng (xích, vòng ký tự, kén băng, vòng lọng, vệt lụa) và
  tiếng chỉ dùng hình / id có sẵn (không dựng lại `assets/audio`, không đụng `render/vfx/library.js`).
- Kiểm thử mới: `node tools/t_suppress.mjs` (37 mục), `node tools/t_actives.mjs` (41), `node tools/t_lockon.mjs` (16); `t_items` (56 món),
  `t_heroes` (Bóng Đèn) cập nhật. Toàn bộ bộ nhanh + `t_arena` + `t_bot` (50/50 trận kết thúc, TB 20,1 phút, kẹt lâu nhất 2,2s) đạt;
  `t_premium` đạt (35 file của 4 model cao cấp không đổi).
- **Dấu vân tay mô phỏng mới** (`node tools/t_determinism.mjs`, hai lần chạy trùng nhau): 5v5 `748f8cd9 60ce391c c9a30571 83d4ef8a e4036f30
  102485c6 778d3ec2 18041c25`; 1v1 `baae542e 454d9a52 170c06b7 bc096c4e 5925c156 34c07f7e bb44540f aedd9e61` (1v1 không đổi so với trước; 5v5
  khác từ phút 2 vì Bóng Đèn có trong đội hình bot).
- **Kiểm thử trình duyệt**: `node tools/b_match.cjs <PORT> [--only=items,lockon,suppress]` (trận 5v5 thật `?hero=<id>&mode=5v5`, 844×390 rồi
  1280×720): 2 nút đồ không đè nút khác / thanh máu / mép màn, chạm Xích Giữ áp chế địch, giữ nút Lọng xem mô tả, phím Q dùng Lọng, kéo Lụa Gió
  lướt ~320, kéo K3 Trạng Nhí hiện dấu vàng và gửi đúng `aim.id`, chạm K2 Bóng Đèn áp chế; không lỗi trang / console.
- Thử trên điện thoại: 2 nút đồ ở 844×390 (mua Xích Đồng + Lọng Hộ Mệnh), chạm Xích Giữ cạnh tướng địch, kéo Lụa Gió theo nhiều hướng, Bóng Đèn
  K2, chữ `ÁP CHẾ` / `KHÔNG THỂ CẢN`, giữ nút đồ xem mô tả rồi kéo tiếp.

## GĐ2 — Khoá mục tiêu, Áp chế, Không thể cản, đồ kích hoạt mới
- `src/sim/suppress.js` (áp chế + niệm giữ), `src/sim/itemActives.js` (Xích Giữ, Lọng Che, Lụa Gió, Sương Đông), cửa chặn lệnh khi bị
  áp chế / Sương Đông trong `sim/commands.js`, `unstoppable` trong `sim/skills.js` + `movement.js`, chiêu khoá mục tiêu nhận `aim.id`.
- HUD: 2 nút đồ kích hoạt, chữ trên đầu "ÁP CHẾ" / "KHÔNG THỂ CẢN", chữ báo lỗi tung chiêu; hiệu ứng xích / lọng / lụa (`render/vfx/extra.js`).
- Kiểm thử: `node tools/t_suppress.mjs`, `node tools/t_actives.mjs`, `node tools/t_lockon.mjs`; trình duyệt `node tools/b_match.cjs <port>`.
- Thử trên điện thoại: mua Xích Đồng + Lọng Hộ Mệnh → 2 nút đồ không đè nút nào ở 844×390; chạm Xích Giữ cạnh tướng địch; kéo Lụa Gió;
  Bóng Đèn K2 giữ được tướng địch, Giải Trói của địch không gỡ được.

## GĐ2 — Tín hiệu, mua nhanh 2 món, thanh khống chế, Quét Sạch
- Mô phỏng: `src/sim/pings.js` (lệnh `ping`, giới hạn tần suất, `pingMood`), `checkAce` trong `sim/match.js`, `t0` của hiệu ứng.
- Bot: `ai/teamBrain.js` giao lệnh `ping` theo tín hiệu người chơi + bot tự ra tín hiệu khi đội có người chơi; `ai/laneBot.js` đi theo,
  Rút lui / Cẩn thận.
- HUD: `src/hud/pings.js` (nút cờ, vòng 4 lựa chọn, vẽ vòng + huy hiệu trên đất và bản đồ nhỏ, dòng chữ), `src/hud/pingText.js` (tên chỗ),
  `killBanner.js` thêm Quét Sạch, `hud.js` thanh khống chế, `shop.js` mua nhanh 2 món.
- Kiểm thử: `node tools/t_pings.mjs`.
- Thử trên điện thoại: chạm nút cờ cạnh bản đồ nhỏ → chọn Tập hợp → chạm hang Long Ngư trên bản đồ nhỏ: dòng chữ hiện, bot đồng đội báo
  "Tới ngay!" và kéo tới; Rút lui gần bot thì bot lùi; bị choáng thấy ô "CHOÁNG 1,2s" dưới chân; mua nhanh hiện 2 món không đè cần di chuyển.

## GĐ2 (20/10) — chọn vị trí + cấm/chọn đấu hạng
- **Phòng chờ 5v5**: nút vị trí dưới ô của mình ("Chọn vị trí" nhấp nháy khi chưa chọn) → hộp Vị trí chính (Đền / Giữa / Sông / Rừng / Trợ
  thủ / Tuỳ ý) + Vị trí phụ; Bắt đầu khi chưa chọn thì mở hộp trước. Đấu hạng ghi luật "Cấm/chọn Cơ bản · 4 cấm / Đầy đủ · 6 cấm". Tìm thấy
  trận: chia vị trí (85% vị trí chính), hộp chấp nhận ghi "Vị trí của bạn: Đi rừng (vị trí phụ)".
- **Đấu thường (chọn ẩn) có vị trí**: mỗi dòng đội ghi vị trí, lưới xếp tướng hợp vị trí lên đầu + nhãn "Đề cử", máy chọn tướng hợp vị trí,
  đối thủ chọn ẩn theo vị trí của họ; đi rừng chọn sẵn Trừng Trị.
- **Đấu hạng → Cấm/chọn** (`src/ui/draft.js`): hàng ô cấm hai bên, đồng hồ lượt, cột Xanh / Đỏ (vị trí, "Đang cấm… / Đang chọn…", tướng đã
  chọn), lưới lọc Tất cả / Đề cử / theo vị trí, Cấm / Bỏ qua / Khoá tướng; dưới Hải Đăng 2 cấm mỗi bên, từ Hải Đăng đủ 3 (07 §7.3). Xong:
  15 s chuẩn bị (tướng trên sân khấu, phép bổ trợ, bảng bùa, Sẵn sàng) → đội hình (có vị trí) → tải trận (máy đi rừng hiện Trừng Trị) → trận.
- **Vị trí vào trận**: `startMatch` nhận `playerRole / allyRoles / foeRoles`; mỗi tướng đứng đúng ô đã chia; người chơi đi rừng có Trừng Trị +
  Nanh Thú Rừng. Gọi không có vị trí: y như cũ (băm `t_determinism 8 1` trước/sau trùng nhau).
- File mới: `src/data/roles.js`, `src/data/draft.js`, `src/ui/roles.js`, `src/ui/draftRules.js`, `src/ui/roleSelect.js`, `src/ui/pickLoadout.js`,
  `src/ui/draft.js`, `src/ui/cssDraft.js`; sửa nhỏ `sim/lineup.js` (ghim ô), `game.js`, `main.js`, `data/items.js` (`starterFor`), `ui/room.js`,
  `ui/pick.js`, `ui/flow.js`, `ui/lineup.js`, `ui/loading.js`, `ui/profile.js`, `audio/uiSounds.js`.
- Kiểm thử: `node tools/t_draft.mjs` (thứ tự lượt, 3000 ván máy: không trùng / không chọn tướng bị cấm / không tự cấm tướng được bảo vệ, 98,7%
  tướng máy chọn hợp vị trí, tất định theo seed, chia vị trí 85%, tướng tủ bị cấm ~50%), `node tools/t_lineup_roles.mjs` (vị trí vào sim, đường
  cũ giữ nguyên 20 seed, trùng tướng hai đội, đồ khởi đầu, 2 phút trận người chơi đi rừng), trình duyệt `node tools/b_flow.cjs <cổng>` (cần máy
  chủ tĩnh) hoặc `node tools/t_ui_draft.mjs [cổng]` (tự mở máy chủ): Sảnh → Đấu hạng → Phòng chờ → Tìm trận → Chấp nhận → Cấm/chọn → Chuẩn
  bị → Đội hình → Tải → Trận ở 844×390 (lite) và 1280×720 (full), Đấu thường ở cả hai cỡ, hộp chọn vị trí; đo trong khung nhìn, không cuộn
  ngang, không lỗi trang / console.
- Danh sách thử trên điện thoại: 19,5:9 ngang + máy tính bảng 16:9 — Sảnh → Đấu hạng → Phòng chờ (nút Vị trí) → Tìm trận → Chấp nhận (hiện vị
  trí) → Cấm/chọn (Cơ bản ở Đèn Dầu, Đầy đủ ở Hải Đăng) → Chuẩn bị → Đội hình → Tải → Trận (đúng đường; đi rừng có Trừng Trị + Nanh Thú Rừng) →
  Kết quả → Đấu lại về phòng chờ, vị trí vẫn giữ.
- **Kiểm chứng lượt hoàn thiện (20/10):** `node tools/b_flow.cjs 8781` cả 5 kịch bản đạt — ranked844 (Đèn Dầu → lite, 2 cấm mỗi bên),
  ranked1280 (Hải Đăng → full, 3 cấm mỗi bên), normal844, normal1280, role844 — vào trận đúng vị trí / đúng tướng, đi rừng có Trừng Trị +
  Nanh Thú Rừng, tướng bị cấm không có trong trận, không lỗi trang / console; ảnh ở `/tmp/claude-0/shots/gd2a/`. `t_determinism 8 1`:
  băm 5v5 / 1v1 trùng khớp bản trước cụm này (e6c2888). Sửa thêm: ô tướng bị cấm trong lưới có nền tối để chữ "Bị cấm" không đè lên tên tướng.

## GĐ2 (20/10) — phép bổ trợ, bảng bùa tự xếp, phù hiệu
- **4 phép mới** (10 phép): Tắt Đèn, Loá Mắt, Trống Trận, Bùa Mỏi — hộp chọn phép theo thứ tự `SPELL_LIST`, nút xám khi không có mục tiêu,
  hiệu ứng / tiếng / biểu tượng; bot 5v5 mang phép theo vị trí + vai và biết dùng (`ai/botSpells.js`).
- **Bảng Bùa** ở Sảnh (nút thứ 5 thanh dưới trái): thẻ Bảng bùa (5 trang mẫu + 10 trang riêng, 3×5 ô, ×5, sao chép / gỡ hết / xoá / đổi tên,
  tổng chỉ số, cấp n/15) và thẻ Phù hiệu (4 phù hiệu chính + 2 hàng nét phụ, theo từng tướng, "Mặc định theo vai").
- **Màn chọn tướng / chuẩn bị cấm-chọn**: nút "Bùa · <trang> Cấp n" mở hộp chọn trang nhanh (+ "Chỉnh trang" → "Dùng trang này"), nút "Phù hiệu ·
  <tên>" mở thẻ phù hiệu của tướng đang xem. Vào trận mang đúng phép + trang + phù hiệu (`world.setLoadout`).
- File mới: `src/sim/emblems.js`, `src/data/emblems.js`, `src/ai/botSpells.js`, `src/ui/loadout.js`, `src/ui/loadoutPanel.js`,
  `src/ui/charmEditor.js`, `src/ui/emblemEditor.js`, `src/ui/charmArt.js`, `src/ui/loadoutCss.js`.
- Kiểm thử: `node tools/t_spells.mjs` (4 phép: mục tiêu, hồi chiêu, khống chế, bot dùng đúng lúc), `node tools/t_emblems.mjs` (4 phù hiệu + nét phụ,
  `setLoadout` tick 0, làm sạch dữ liệu, tất định), `node tools/t_charms.mjs` (kho trang: bản sao, giới hạn 10, xoá, hồ sơ hỏng, gói vào trận);
  trình duyệt `node tools/b_flow.cjs <cổng> loadout844 loadout1280`: Sảnh → Bảng Bùa → sửa trang mẫu (tự sao) → ×5 → gỡ ô → Phù hiệu → Đấu
  thường → chọn tướng → hộp trang → vào trận đúng trang + phù hiệu, nằm trọn màn hình, không lỗi console.

## GĐ2 (20/10) — gộp hai cụm + HUD còn thiếu
- Gộp cụm trong trận (khoá mục tiêu, áp chế, 3 đồ kích hoạt, 4 tín hiệu, Quét Sạch, mua nhanh 2 món, thanh thời gian khống chế) và cụm tiền
  trận (chọn vị trí, cấm/chọn, 4 phép, bảng bùa, phù hiệu) vào nhánh chính. Sửa khi gộp: lệnh tín hiệu chen giữa `if/else` khối mục tiêu lớn
  của não đội làm đội đang đánh dở mục tiêu lớn quên mục tiêu.
- HUD: chữ "SUY YẾU" trên đầu tướng dính Bùa Mỏi, "TẮT ĐÈN 3s" trên trụ bị Tắt Đèn (vòng tầm trụ mờ đi, mất tia nhắm), chữ nổi tên phù hiệu
  khi phù hiệu của mình kích hoạt.
- Kiểm chứng: `node tools/b_flow.cjs <cổng> ranked844 ranked1280` (Sảnh → Đấu hạng → Phòng chờ → Cấm/chọn → Trận → Kết quả, 19,5:9 và 16:9,
  không lỗi), `b_match.cjs --only=pings`, cả bộ `tools/t_*.mjs`; 50 trận bot: trung vị 16,4 phút, Xanh 46%, mục tiêu lớn 4,2 / trận, 0 lỗi.

## GĐ3 (20/10) — kết thúc trận, đấu lại trong trang, cài như ứng dụng
- **Cuối trận**: camera lướt tới nhà chính bên thua rồi nổ + rung (cả khi đầu hàng); băng-rôn rồi màn kết quả như cũ.
- **Màn kết quả → Chi tiết**: mỗi người 3 ô phần trăm có thanh (sát thương lên tướng, gánh chịu, tham gia / 1v1: tỉ lệ hạ) + trang bị;
  bảng Số liệu thêm 5 cột.
- **Đấu lại / Về sảnh không tải lại trang**: đo bằng `tools/b_gd3.cjs` (máy không GPU, CPU giả lập chậm 4×): **về phòng chờ 0,3 s** (trước:
  tải lại cả trang); trận 2 dịch sẵn **0,46 s** thay vì 7,1 s; sau khi dọn: 0 hình khối trên GPU, 3 ảnh dùng chung cả phiên (không tăng qua
  3 trận), listener window / document / body không dồn qua các trận, không còn phần tử HUD.
- **Cài như ứng dụng + chơi không mạng**: đo bằng `tools/b_pwa.cjs`: tải sẵn 429 tệp / 13,8 MB, Sảnh lưu đủ 20 tướng, Chrome báo cài được,
  tắt mạng vẫn mở tới Sảnh và đánh trận 1v1 không hỏng yêu cầu nào; đẩy bản mới → hộp "Có bản mới" ở Sảnh → Cập nhật → đúng bản mới,
  chỉ tệp đổi được tải lại, không tải lại model tướng.
- Kiểm thử mới: `t_share.mjs`, `t_scope.mjs`, `t_dispose.mjs`, `t_endcam.mjs`, `t_pwa.mjs` (node); `b_gd3.cjs`, `b_pwa.cjs` (trình duyệt).
- Danh sách thử trên điện thoại: Android Chrome → Cài đặt → Dữ liệu → "Thêm vào màn hình chính" → mở toàn màn ngang, không có nút toàn màn;
  bật chế độ máy bay → mở game, đánh một trận 5v5; iPhone Safari → Chia sẻ → Thêm vào MH chính, mở một lần khi có mạng rồi thử không mạng;
  "Đấu lại" về phòng chờ dưới 3 s; cuối trận thấy nhà chính nổ phía trên băng-rôn ở màn 844×390.


## Tổng kết lộ trình kiểm toán (21/10) — cả 4 giai đoạn đã code xong, chưa gộp vào `main`

Kế hoạch gốc + bảng hoàn thiện từng mục: `docs/KIEM_TOAN.md` (báo cáo 19/10, mục 4 — Lộ trình nâng cấp). Toàn bộ nằm trên nhánh
`claude/kiem-toan-lien-quan` (19 commit trước `main`, chưa có PR) ⇒ **trang chơi trên GitHub Pages vẫn là bản 17/10** cho tới khi gộp vào `main`
(workflow tự deploy khi có commit lên `main`).

| Giai đoạn | Tiêu chí "xong khi" | Đo được |
|---|---|---|
| 0 — sửa lỗi đã đo | mỗi lỗi một kiểm thử, 1 siêu lính / đợt | ✅ đạt (`t_fixes.mjs` 25 kiểm tra, deploy tự động khi lên `main`) |
| 1 — lối chơi 5v5 | 50 trận bot: trung vị 12–18 phút, Xanh 45–55 %, mục tiêu lớn ≥ 2 / trận | ✅ trung vị 15,9–16,4 phút · Xanh 46–54 % · 3,6–4,2 mục tiêu lớn / trận · 20/20 tướng |
| 2 — UI/UX chuẩn Liên Quân | Sảnh → Đấu hạng → Phòng chờ → Cấm/chọn → Trận → Kết quả không lỗi ở 19,5:9 và 16:9 | ✅ `b_flow.cjs` 7 kịch bản × 2 cỡ màn đạt hết trên bản cuối (21/10) |
| 3 — kết thúc trận, đấu lại, PWA | cài được, chơi không mạng, Đấu lại < 3 s | ✅ về phòng chờ 0,17–0,29 s · cài được · không mạng vẫn đánh trọn trận 1v1 |

Còn lại:
- ✅ Đã chạy lại trên bản cuối (21/10): 50 trận bot 50/50 kết thúc, trung vị 16,4 phút, Xanh 46%, 4,18 mục tiêu lớn / trận, 0 lỗi;
  `b_match.cjs --only=pings` 10/10, `b_flow.cjs` 7 kịch bản × 2 cỡ màn, `t_*.mjs`, `t_premium` đều đạt.
- Gộp nhánh vào `main` (PR) ⇒ Pages tự deploy bản mới.
- Thử trên điện thoại thật: danh sách ở mục GĐ3 ngay trên.

## GĐ4a (26/10) — hồ sơ có phiên bản + Xuất / Nhập mã lưu
- `src/ui/save.js`:
  - hồ sơ mang `version` (hiện 2); bản cũ chưa có số chạy qua chuỗi chuyển đổi `MIGRATE[n]`;
  - bản 1 → 2 làm sạch kiểu dữ liệu (số âm / NaN, mảng / đối tượng hỏng, sao cao nhất < sao hiện tại);
  - hồ sơ từ bản game mới hơn thì giữ nguyên.
- Hồ sơ hỏng (JSON ghi dở / không phải đối tượng) được cất nguyên văn vào `la.profile.bak`, rồi mở hồ sơ mới (`ui/profile.js`).
- **Mã lưu**:
  - định dạng `LA1-` + base64url(JSON { v, t, d }) + `-` + FNV-1a 8 hex;
  - gói `la.profile`, `la.prefs`, `la.gfx`; mã sai / thiếu / sửa / bản mới hơn đều bị từ chối, kèm câu báo rõ;
  - hồ sơ đầy đủ (20 trận, 10 trang bùa) ≈ 6.500 ký tự.
- **Cài đặt → Dữ liệu** (chỉ ở sảnh) có thêm hai nút (`ui/saveDialogs.js`):
  - **Xuất mã lưu**: Sao chép / Tải tệp .txt;
  - **Nhập mã lưu**: dán hoặc chọn tệp → tóm tắt hồ sơ → Nhập và tải lại; hồ sơ đang có được cất ở `la.profile.bak`.
- Hộp Xoá dữ liệu nhắc xuất mã lưu trước.
- Kiểm thử:
  - `node tools/t_save.mjs` — 25 mục;
  - trình duyệt `node tools/b_prog.cjs <cổng> save844 save1280`: máy A xuất → máy B trống nhập. Mã thiếu bị báo; hồ sơ + cài đặt sang đúng; bản cũ được cất; các hộp nằm trọn màn hình; không lỗi console.

## GĐ4d (26/10) — tiền tệ, rương, vật phẩm có hạn, cửa hàng mảnh + màn Nhận thưởng
- **Số liệu** nằm ở `src/data/rewards.js` (tiền tệ, vật phẩm, rương, cửa hàng mảnh) và `src/data/seasons.js` (mùa 120 ngày, mùa 1 bắt đầu 01/10/2026 —
  để tính hạn "hết mùa"; phần thưởng mùa / reset mềm làm ở 4b).
- **Hai tiền tệ mới:** Mảnh Tướng, Gạo Hội. Vàng ở sảnh đóng vai Xu Đèn.
- **Vật phẩm có hạn** (từng chiếc mang hạn riêng ở `p.timed`; dùng chiếc sắp hết hạn trước; mở hồ sơ thì tự bỏ chiếc hết hạn):

  | Vật phẩm | Hạn |
  |---|---|
  | Bùa Giữ Sao (MVP thua) | 24 giờ |
  | Bùa Giữ Sao (thua bất kỳ) | hết mùa |
  | Thẻ Nhân Đôi Sao | 7 ngày |

- **Thứ tự giữ sao khi thua trận hạng:** bảo vệ Đèn Dầu / Đèn Lồng → sàn bậc → bùa MVP (nếu là MVP) → Bùa Giữ Sao → Điểm tích luỹ đầy.
- **Thẻ Nhân Đôi Sao:** bấm Dùng ở Túi đồ → trận hạng kế tiếp thắng +2 sao; thua thì mất thẻ.
- **Rương:**
  - cứ 3 trận (trừ luyện tập) được 1 rương; mua thêm 300 vàng;
  - mở ra vàng 50–200, Mảnh 1–5, 15% Bùa Giữ Sao (MVP thua);
  - nút Túi đồ ở sảnh có huy hiệu số rương.
- **Cửa hàng mảnh** (thẻ thứ hai của Túi đồ): Bùa Giữ Sao MVP 8 · Bùa Giữ Sao 24 · Thẻ Nhân Đôi Sao 30 mảnh.
- **Màn "Nhận thưởng thành công"** (`src/ui/rewards.js`, 07 §11):
  - ô quà bật lần lượt 120 ms, nhãn "Có hạn";
  - chạm ô → bảng tên / hiện sở hữu / mô tả / hạn; chạm khoảng trống để tiếp tục;
  - dùng cho mở rương, đổi mảnh, nhận nhiệm vụ, thư, điểm danh.
- Kiểm thử:
  - `node tools/t_bag.mjs` — 31 mục;
  - trình duyệt `node tools/b_prog.cjs <cổng> bag844 bag1280`: Túi đồ → mở rương → Nhận thưởng → mua rương → Thẻ Nhân Đôi Sao → đổi mảnh → nhận nhiệm vụ; mọi thứ nằm trọn màn hình, không lỗi console.

## GĐ4e + 4f (26/10) — nhiệm vụ ngày / tuần / sự kiện, màn Nhận thưởng sau trận
- **Nhiệm vụ** (`src/data/missions.js`, `ui/profile.js`):
  - Ngày: 3 nhiệm vụ bốc từ 14 mẫu theo seed của ngày (tối đa 1 nhiệm vụ "thắng với vai…"), làm mới 04:00 giờ thiết bị.
  - Tuần: 4 nhiệm vụ, làm mới thứ Hai 04:00; nhận đủ cả 4 thì mở **Rương tuần** (vàng + Bùa Giữ Sao + 1 rương).
  - Sự kiện tích luỹ: 3 trận trong tuần → 8 Gạo Hội.
  - Bộ đếm cộng sau mỗi trận (trừ luyện tập): trận, thắng, hạ gục, hỗ trợ, trụ địch bị phá, đấu hạng, thắng hạng, MVP, thắng theo vai.
  - Bảng Nhiệm vụ có thẻ **Ngày / Tuần / Sự kiện**; Phòng chờ hiện "Tham gia sự kiện tích luỹ n/3"; huy hiệu ở sảnh đếm mọi phần thưởng chờ nhận.
- **Kết quả → Nhận thưởng → Phòng chờ** (Mốc 12): rời màn kết quả (Đấu lại / Về sảnh) thì màn Nhận thưởng hiện vàng + kinh nghiệm của trận, cùng rương nếu vừa được.
  Rời bằng tải lại trang (mỗi 12 trận) vẫn hiện, quà mang qua `sessionStorage`.
- Kiểm thử:
  - `node tools/t_missions.mjs` — 27 mục;
  - `b_prog.cjs miss844 miss1280`;
  - `b_flow.cjs ranked844 ranked1280` thêm bước Nhận thưởng: Sảnh → Đấu hạng → Phòng chờ → Cấm/chọn → Trận → Kết quả → **Nhận thưởng** → Phòng chờ, đạt ở 844×390 và 1280×720.

## GĐ4b (26/10) — mùa giải
- **Lịch mùa** (`src/data/seasons.js`): mùa 120 ngày theo giờ thiết bị, mùa 1 bắt đầu 01/10/2026, tên `S{n} {năm}`.
  Bảng Xếp hạng có thẻ **Mùa giải**: tên mùa + đếm ngược "còn N ngày M giờ".
- **Hết mùa** (`ui/season.js` `rollSeason`, gọi lúc mở sảnh và đầu mỗi trận):
  - thưởng theo **bậc cao nhất** mùa: 200 → 2500 vàng, Mảnh Tướng, ngọc, khung ảnh từ Hải Đăng trở lên;
  - **reset mềm** theo **bậc cuối** mùa, đúng bảng 08 §4;
  - bỏ lỡ nhiều mùa: thưởng một lần, reset thêm mỗi mùa bỏ lỡ;
  - mùa hết giữa trận: thưởng + reset trước, trận đó tính vào mùa mới;
  - màn Nhận thưởng "Kết thúc mùa …" rồi hộp "Mùa mới bắt đầu" (bậc cao nhất → bậc mới).
- **Hành trình đỉnh cao**: 5 mốc quà theo bậc cao nhất (Đèn Kéo Quân → Nguyệt Quang), nhận một lần mỗi mùa.
- **3 vòng tướng thành thạo**: mỗi vòng = một tướng thắng 5 trận hạng trong mùa; đủ 3 vòng → Khung Thành Thạo.
- **Trang phục mùa**:
  - chọn một tướng, thắng 10 trận hạng trong mùa → phối màu riêng của mùa (Hoàng Kim / Băng Nguyệt / Anh Đào / Ngọc Bích);
  - bật / tắt được;
  - phủ màu tướng của mình trong trận và ở sảnh — chỉ nhân màu vật liệu, không dịch lại shader, mặt giữ nguyên;
  - **không chọn được 4 model cao cấp** (`SKIN_LOCKED`), dữ liệu có trang phục cũng không phủ.
- **Khung ảnh đại diện**: đeo ở thẻ Mùa giải, hiện quanh ảnh đại diện ở sảnh.
- Kiểm thử:
  - `node tools/t_season.mjs` — 35 mục;
  - `b_prog.cjs season844 season1280`: thẻ Mùa giải nằm trọn màn hình, nhận quà Hành trình, đeo khung; **đổi giờ thiết bị sang mùa sau** → Nhận thưởng Sao Mai + reset Hải Đăng II → Đèn Trời III, mở lại không thưởng lần hai;
  - `b_prog.cjs skin`: trong trận mọi vật liệu thân của Kiếm Thuỷ = bên địch × màu Hoàng Kim; Nguyệt Hạ không đổi.

## GĐ4c (26/10) — Điểm Hào Quang, bảng Top 100, Thiên Hà, Đấu Đỉnh Cao
- **Điểm Hào Quang** (`src/data/haoQuang.js`, `ui/haoQuang.js`):
  - bắt đầu 1000 khi vào Nguyệt Quang (hồ sơ đã ở Nguyệt Quang từ trước cũng có sẵn 1000);
  - thắng `+15 + (điểm − 8)`, thua `−15 + (điểm − 8)/2`, giới hạn ±25; rớt xuống dưới Nguyệt Quang thì điểm đứng yên;
  - chạm 2000: danh hiệu **Hào Quang Chói Sáng** + Khung Hào Quang (một lần mỗi mùa, hiện ở màn Nhận thưởng);
  - sảnh có thanh "Hào Quang n/2000", màn kết quả ghi "Hào Quang n +d", hồ sơ ghi điểm + danh hiệu;
  - hết mùa thì về lại (reset xong mọi người dưới Nguyệt Quang, vào lại thì bắt đầu 1000).
- **Bảng Top 100 khu** (thẻ mới trong bảng Xếp hạng): 100 người chơi ảo, điểm phân bố chuẩn quanh 2800 (σ 300), cố định theo seed mùa.
  Thẻ điểm + hạng của mình dính trên đầu khi cuộn; mở bảng là cuộn tới dòng của mình; ngoài top 100 thì ghi điểm người thứ 100.
- **Thiên Hà** (bậc 9): Thái Dương lọt top 50 bảng → huy hiệu Thiên Hà ở sảnh / phòng / hồ sơ / màn kết quả (`rankFull`).
  Huy hiệu mới `assets/ui/icons/rank_thien_ha.webp` dựng bằng `tools/uiart/icons.cjs` (xoáy thiên hà tím). Vào Thiên Hà lúc nào đó trong mùa
  → thưởng hết mùa riêng (3000 vàng, 150 ngọc, Khung Thiên Hà).
- **Đấu Đỉnh Cao** (chế độ `peak`):
  - mở 19:00–24:00 giờ thiết bị, cần Nguyệt Quang; thẻ trong Chọn chế độ khoá kèm giờ mở ("Mở lúc 19:00 (còn 9 giờ)"), chạm thì báo, không vào phòng;
  - tính sao như đấu hạng, máy Ác mộng, cấm/chọn đầy đủ 6 cấm; thắng ×1,5 Hào Quang;
  - ngồi phòng tới quá 24:00 thì nút tìm trận báo hết giờ.
- Kiểm thử:
  - `node tools/t_haoquang.mjs` — 28 mục (công thức, bắt đầu 1000, mốc 2000 một lần, Đỉnh Cao, bảng ảo, Thiên Hà, hết mùa, 10 trận rồi mở lại còn nguyên, giờ mở);
  - `b_prog.cjs peak844 peak1280`: sảnh có huy hiệu Thiên Hà + thanh Hào Quang; 10:00 thẻ Đỉnh Cao khoá; 20:00 vào phòng (Ác mộng, 6 cấm, ×1,5) → cấm/chọn → **đánh
    một trận thắng** → màn kết quả "Hào Quang 3088 +15 (×1,5)" → Nhận thưởng có Khung Hào Quang → bảng Top 100 đúng hạng.
- **Tai thỏ (Mốc 12):** `b_flow.cjs ranked844` giờ giả lập vùng an toàn (trái / phải 47 px, đáy 21 px — CDP `Emulation.setSafeAreaInsetsOverride`)
  và soi bảy màn: sảnh, phòng chờ, cấm/chọn, chuẩn bị, trong trận, kết quả, nhận thưởng — không nút nào được lấn vùng an toàn (phần bị khung cuộn che thì bỏ qua).
  Bắt được một lỗi thật: nút **Đẩy trụ** thò ra ngoài khung nút kỹ năng ~10 px (và **Ăn lính** ~1 px dưới đáy) nên lấn vào tai thỏ / thanh vuốt —
  kẹp vị trí ≥ 0 trong `index.html` (`.amode`).

## GĐ5a (26/10) — chống khoá chết khống chế (04 §3)
- `sim/status.js`: chuỗi khống chế cứng liên tiếp > 3 s ⇒ khống chế mới giảm 50% trong 2 s tiếp theo; HUD hiện "Kháng 50%".
- Kiểm thử: `node tools/t_ccchain.mjs` — 11 mục (nối chuỗi, khoảng nghỉ cắt chuỗi, một choáng dài, hất tung / áp chế không giảm, hiệu ứng đồng minh,
  tất định); `t_determinism`, `t_suppress`, `t_combat`, `t_heroes`, `t_spells`, `t_lockon`, `t_fixes`, `t_actives`, `t_kills`, `t_jungle`, `t_target` vẫn đạt.

## GĐ5b (26/10) — cửa hàng ngọc (sảnh trước đây báo "Cửa hàng ngọc sắp mở")
- `data/shop.js`, `ui/shopPanel.js` (dấu + cạnh ô ngọc): thẻ **Trang phục** (chọn tướng → 4 màu, mua có hộp xác nhận, Mặc / Cởi; phủ màu ngay ở sảnh và trong trận),
  **Vật phẩm** (3 rương / Bùa Giữ Sao / Thẻ Nhân Đôi Sao / 800 vàng), **Nhận ngọc** (lên cấp +10, Rương tuần +20, mùa, Hành trình).
- Kiểm thử: `node tools/t_shop.mjs` — 21 mục; `b_prog.cjs shop844 shop1280` (mua → Nhận thưởng → mặc / cởi → đổi rương → về sảnh số ngọc đúng);
  `t_missions` cập nhật (Rương tuần có ngọc).
