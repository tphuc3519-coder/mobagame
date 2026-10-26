# Quyết định

- 2026-09-30 (Mốc 1): thay file thử `assets/test/test_character.glb` bằng chính model Emberforge do `tools/modelgen` sinh (`assets/heroes/hoa_ren/`), vì đã có sẵn clip Idle/Run đúng chuẩn. Không cần tải bộ CC0.
- 2026-09-30 (Mốc 1): giới hạn FPS vẽ bằng cách bỏ khung hình (30 ở mức Thấp), mô phỏng luôn 30Hz cố định.
- 2026-09-30 (Mốc 1): tướng bị giữ trong đường (y 750–1650) và trong bản đồ; tường, bụi, khe nước chưa chặn (Mốc 3).
- 2026-09-30: GLB xuất mét, `hero.art.json.scale = 100` để ra cm trong thế giới.
- 2026-09-30: roster autobattle (nhân vật có bản quyền) không copy nguyên; port **cơ chế** sang 14 tướng gốc theo lựa chọn của chủ dự án. Đối chiếu: Sakura→Hạnh Hoa, Konohamaru→Tiểu Ảnh, ChiChi→Bà Năm Chảo, Tsubasa→Cầu Mây, Shikamaru→Bóng Đèn, Suzune→Thầy Đồ, Ginyu→Kép Chèo, Doraemon→Mèo Thần Tài, Superman→Phù Đổng, Beatrice→Thư Linh, Tanjiro→Kiếm Thuỷ, Gojo→Lưỡng Cực, Isagi→Nhãn Sư, Conan→Trạng Nhí. Không dùng lại tên chiêu, trang phục, biểu tượng đặc trưng gốc.
- 2026-09-30: mỗi tướng chỉ có nội tại + K1/K2/K3 (chiêu cuối gộp vào K3); các chiêu phụ của bản gốc được gộp/bỏ. Hook cơ chế mới ở dạng `params` khai báo, chưa có engine.
- Bản đầu chưa cân bằng; chưa có mặt hàng đồ mới (`recommendedBuild` dùng id giữ chỗ giống 04).
- 2026-09-30 (Mốc 2): 6 tướng Alpha có engine đầy đủ; 14 tướng port và 10 tướng còn lại giữ dạng khai báo. Kỹ năng kiểu `recast`, `tether`, `trap`, `targetedDash`, `line` chưa có handler (chưa cần cho Alpha).
- Hình nộm có 6000 HP, giáp/KP 30, hồi đầy sau 5s không bị đánh; chết thì hồi đầy ngay.
- Đòn đánh chỉ ra đòn khi mục tiêu đã trong tầm (chưa tự đuổi); nút Đánh giữ để đánh liên tục.
- Ba ví dụ tính tay công thức sát thương (đều nằm trong `tools/t_combat.mjs`): Emberforge K1 cấp 1 = (70 + 1.0×68)×100/130 = 106.15; Moonstream K1 = 80×100/130 = 61.54 phép; Mossback K2 = (50 + 4%×1000)×100/130 = 69.23.
- 2026-09-30 (Mốc 3): trụ 1v1 dùng chỉ số ở 03 §B2 (HP 3200/3800/5000); 'nhà chính' đóng vai trụ nhà nên bất tử tới khi trụ trong vỡ; giáp trụ 80/90/100, không có giáp bảo vệ 4 phút.
- Lính: chưa cho vàng/KN (Mốc 4); model lính là khối đơn giản, mỗi lính vài draw call (chưa InstancedMesh) — 16 lính đồng thời ổn; sẽ instancing khi lên 5v5.
- Tướng bị giữ trong đường, không đi vào khe hở tường (bãi quái ở Mốc 6); lưới đi được đã dựng sẵn từ tường/biên.
- Đợt lính theo 03 §B3: đầu 0:15, mỗi 25s, 3 Kiếm + 1 Cung, mỗi 3 đợt thêm Xe Đá. Lính Đèn Lớn chưa có (cần luật phá trụ nhà 5v5).
- 2026-09-30 (Mốc 4): 38 món đúng 05 §2–§4; giá ghép = giá tổng − thành phần đang có (đệ quy), bán 60% giá tổng. Đồ hỗ trợ/đi rừng khoá ở 1v1 (`teamOnly`), chờ chế độ nhiều người.
- Vàng thụ động ở 1v1 không có trong tài liệu: chọn **3 vàng/s từ giây 15** (5v5 là 4/s từ 0:20). Chỉnh ở `data/economy.js`.
- Vàng lính chỉ cho tướng kết liễu; lính chết do lính/trụ thì mất vàng (ai cũng không nhận). KN lính chia đều tướng địch trong 1000. Hạ trụ: +100 vàng cả đội, +100 cho người kết liễu, 120 KN trong 1200.
- Hạ gục tướng: 200 + 20×chuỗi (tối đa 5) vàng, giảm 20%/lần khi nạn nhân đã chết ≥3 lần liên tiếp (sàn 80); 100 + 30×cấp nạn nhân KN. Chưa có hỗ trợ chia vàng (1v1 không cần).
- Hồi sinh 4 + 1.5×cấp giây (luật 1v1). Về thành 6s, huỷ khi bị sát thương/di chuyển/đánh/ra chiêu, +40% tốc chạy 4s sau khi về.
- Bùa: trang mặc định theo vai (`PAGE_BY_ROLE`), cộng phẳng vào chỉ số; chưa có UI chỉnh bùa. Kiểm thử sát thương dùng `world.debug.bare(e)` để bỏ bùa/đồ.
- Chí mạng dùng `world.rng` (tất định), sát thương chí mạng gốc ×1.75 (+50% từ Dao Trăng Khuyết); tối đa giảm hồi chiêu 40%, kháng hiệu ứng 80%, xuyên giáp 80%.
- Hút máu chỉ tính đòn đánh thường (vật lý); hút máu phép chỉ tính sát thương phép của kỹ năng.
- Tên đồ trong `recommendedBuild` của tướng port chưa có trong bảng chính thức được quy về đồ hợp lệ bằng `ALIAS` trong `data/items.js` (`kiem_nhanh`→Lưỡi Huyết Nguyệt…); Bamboo Shade mang Thu Hoạch bị đổi sang Chớp Bước ở 1v1.
- HUD kiểu video tham khảo (bố cục, không sao chép hình): cửa hàng trượt từ trái với 6 tab, chi tiết + công thức bên phải; biểu tượng đồ/phép là SVG tự vẽ (hình theo chỉ số chính, viền theo bậc).
- `stasis` (Bình Sương Đông) xếp cùng nhóm khống chế cứng để dừng di chuyển/đánh/ra chiêu; thêm `invuln` (Mặt Nạ Hồi Sinh) và `ccImmune` (Giải Trói).
- 2026-09-30 (bản đồ đẹp): dựng môi trường bằng code trong `src/render/env/` (địa hình dốc + nhiễu, đường lát đá/gạch/cỏ vẽ canvas lúc chạy, sông shader chảy, cầu đá, tường rêu thấp 120, cây/đá/cỏ/hoa/bụi bằng InstancedMesh có gió, quầng đèn lồng, đom đóm, vòm trời). Không có file ảnh ngoài. Mật độ theo mức chất lượng (thấp 0.4 / vừa 0.7 / cao 1): ~66 draw call, ~110k–240k tam giác. Phía gần camera (nam) chỉ đặt vật thấp để không che HUD. Nhịp trận trong video tham khảo đã bị làm chậm nên không dùng làm chuẩn tốc độ.
- 2026-09-30 (Mốc 5): bot 1v1 theo 06 §5 rút gọn: LANE/PUSH, FIGHT/KITE, RETREAT, RECALL, HEAL tại suối; lách quanh công trình bằng điểm bên hông (lưới A* chưa có công trình). Bot dùng RNG riêng seed theo (world.seed, id) → trận tất định.
- Lính gây ×2.5 sát thương lên công trình (Xe Đá ×4) để đợt lính có sức đẩy; không có trong tài liệu, chỉnh ở `data/units.js` (`structureMult`).
- Bot vs bot trung bình ~19 phút (tài liệu mong 6–10 phút với người); vài cặp (Lanternward vs Bamboo Shade) còn quá 40 phút. Cân bằng nhịp trận để Mốc 6.
- Màn chọn tướng: chỉ 6 tướng Alpha chọn được, 14 tướng còn lại hiện "Sắp có". Chân dung thẻ chụp từ model lúc chạy (render target), không có file ảnh.
- 2026-09-30 (model v3): thân người dựng bằng SDF (loft elip cho thân theo đúng số đo cũ + nón tròn tay chân, hoà trộn smooth-min), lưới surface-nets ô 1.3 cm rồi giảm còn ~8 nghìn tam giác bằng meshoptimizer; pháp tuyến từ gradient, AO khe nướng vào màu đỉnh, trọng số xương hoà theo khoảng cách tới từng khối. Tổng mỗi tướng 9–18 nghìn tam giác.
- Toon ramp đổi từ 4 nấc cứng sang 2 tông mềm (bóng 60%) để mặt không loang lổ; phần phát sáng ×2.2 để bloom chỉ bắt chỗ đó.
- 2026-09-30 (model v4 — theo phản hồi "trông như Roblox"): bỏ tỉ lệ chibi, chuyển sang anime bán thực (~7 đầu: `STYLE.head 0.86`, tay chân thon 0.94, cằm nhọn, bắp tay/bắp chân, bàn tay có cụm ngón + ngón cái, mũi giày thon).
- Mặt anime vẽ bằng canvas lúc chạy (`src/render/face.js`) lên một mảng da mặt có UV bám bề mặt đầu (nhóm vật liệu thứ 3 `<id>_face`); thông số mặt (màu mống mắt, mi, mày, môi, kiểu mắt) nằm trong `userData.face` của mesh (glTF extras). Mặt không chịu ánh sáng để nét mực luôn rõ; có chớp mắt.
- Cảnh trưng bày thêm phông kiểu tranh splash bằng shader (`src/showcase/splash.js`): mây xoáy, tia sáng, 6 dải "cánh" năng lượng, tàn lửa — màu theo palette tướng. Bloom giảm (0.3 / 0.15 / ngưỡng 1.6) vì bloom mạnh làm tướng bị loá, trông trong suốt.
- Ảnh splash vẽ tay như game thương mại cần hoạ sĩ hoặc công cụ tạo ảnh; không làm được bằng code trong dự án này.
- 2026-09-30 (chất vẽ tay): mỗi đỉnh model có thuộc tính `_mat` (0 vải, 1 da, 2 kim loại, 3 tóc, 4 da thuộc/gỗ, 5 phát sáng; tự đoán theo màu, tóc/da gán rõ). Shader toon thêm vệt cọ/vân vải theo toạ độ vật thể, kim loại có dải sáng và điểm loé vẽ tay, tóc có vòng bóng, da có sắc ấm. Không cần texture/UV.
- Cảnh trưng bày vẽ thẳng không hậu kỳ (thử bloom + lọc tranh sơn Kuwahara: làm tướng nhạt màu, bỏ). Canvas `alpha: false` và shader ghi alpha = diffuse.a để tướng không bị trong suốt khi ghép lớp.
- 2026-10-01: Mossback (`thach_quy`) đổi sang model liền khối có texture `diver_pbr_20000.glb` (thợ lặn đồng thau, 20k tam giác, PBR) thay cho bản dựng từ `thach_quy_moba_prototype.glb` (file đó vẫn giữ ở `tools/modelgen/imports/`, importer `import_glb.mjs` dùng cho model nhiều mảnh). `tools/modelgen/import_fused.mjs` tự tính trọng số xương theo khoảng cách tới đoạn xương (cây gậy là một "xương phụ" gắn tay phải), giữ nguyên 3 ảnh JPEG (màu, pháp tuyến, kim loại/nhám), dùng lại 11 clip chuẩn. `render/materials.js` giờ giữ `map`/`normalMap` khi đổi sang vật liệu toon. Hạn chế: model nặng ~2.4 MB (texture 3×JPEG); tư thế giơ tay cao còn méo ở vai; không có phần phát sáng riêng (cửa sổ hổ phách chỉ là màu texture). Ngoại hình khác mô tả cũ ở `09_HINH_ANH.md` §4.1 (rùa đá/rêu) — chờ hoạ sĩ xác nhận hướng thiết kế.
- 2026-10-01: Emberforge (`hoa_ren`) đổi sang model liền khối có texture `hammer_pbr_20000.glb` (thợ rèn cởi trần vác búa, chân rộng) bằng cùng đường `import_fused.mjs` như Mossback. Tư thế trong file không đứng thẳng nên khớp xương đặt tay theo ảnh chiếu (`import.rig` trong `heroes/hoa_ren.mjs`), búa gồm 2 đoạn (đầu + cán) gắn tay phải với trọng số gắt và bán kính cắt để không kéo vải sát bên. Hạn chế: clip dùng chung tính từ tư thế đứng thẳng nên khi vung đòn tay phải (đang vác búa) lệch so với ý đồ; còn một dải khăn đỏ bị kéo theo cán búa ở Attack2; ngoại hình khác mô tả cũ ở `09_HINH_ANH.md` §4.4.
- 2026-10-01: Animation viết tay cho Emberforge và Mossback (`heroes/hoa_ren.anim.mjs`, `heroes/thach_quy.anim.mjs`, thư viện `animlib.mjs`): spline Catmull-Rom thay cho smoothstep từng khung (không còn dừng cứng ở mỗi khung), có đà/giật khi chạm, thở và đung đưa trễ pha; Emberforge có 4 xương váy để vải bay theo. Góc tay cầm búa giải bằng IK (đích tay + hướng cán). `import_fused.mjs` thêm: cắt tam giác nối vũ khí–thân, gắn cứng vũ khí, tam giác sợi chỉ, mút bàn tay riêng cho trọng số. Hạn chế: một vài mảnh vụn nhỏ bay lơ lửng cạnh đầu khi vung; chưa tinh chỉnh khớp hitTime trong trận thật.
- 2026-10-01: Vòng chỉnh animation lần 2: chuyển động chồng lấp (`animlib.lagged`: thân dẫn, đầu/cổ/tay trái/vải theo sau), viết lại Death/Recall/Victory của Emberforge, giảm giơ tay trái cao của Mossback, bỏ mảnh vụn rời (`minComponent` trong `import_fused`). `art.hitTime` giờ được dùng thật: sự kiện `attack`/`cast` mang `delay` (độ trễ tới lúc trúng) và `animator.trigger(name, seconds, hold, hitAt)` chỉnh tốc độ clip để cú chạm khớp lúc mô phỏng gây sát thương.
- 2026-10-01: Camera gần hơn: `CAM_DISTANCE` 2000 → 1300 (`render/camera.js`), độ lệch theo joystick 150 → 120; `?camdist=` vẫn ghi đè.
- 2026-10-01: Bản đồ 5v5 `ARENA` (`data/maps.js`): toạ độ trong `03_BAN_DO.md` §A **nhân K = 1.5** → 9600 × 9600 (băng qua bản đồ ~30 giây thay vì ~20) để rộng hơn; kích thước công trình, tầm trụ, đơn vị tính không đổi. Ba đường bo góc (`roundPath`), chín trụ + nhà chính mỗi đội theo bảng §A3–A4, bất tử theo chuỗi trụ cùng đường, nhà chính bất tử tới khi ≥1 trụ nhà vỡ; sông chéo y = x chỉ để nhìn (đi qua được); tường là các đoạn dày (capsule) dọc mép đường có khe + vài lối mòn trong rừng; viền ngoài 260 không đi được. Chưa có quái rừng, mục tiêu lớn, sương mù chiến trường (Mốc 8–9). Lính đợt 0:20, mỗi 30s, 3 Kiếm + 2 Cung, Xe Đá mỗi 3 đợt, Lính Đèn Lớn khi phá trụ nhà địch (§A5).
- 2026-10-01: Sim tổng quát hoá cho nhiều đường: `sim/lanes.js` (đường gấp khúc theo đội, hình chiếu, điểm theo quãng), lính đi theo đường (`minions.js` `followLane`), `clampToMap` đẩy tướng/lính ra khỏi tường ở bản 5v5, `structuresOf` dùng `map.mirror`. 1v1 giữ nguyên hành vi (simtest, t_map, t_items, t_bot đạt).
- 2026-10-01: Bot đội `ai/laneBot.js`: mỗi bot một đường; LANE / FIGHT / RETREAT / RECALL / HEAL, so sánh sức mạnh theo số đồng đội gần (`power`), không đánh khi ngang trụ địch nếu lính mình chưa đỡ. `sim/lineup.js` chọn tướng (4 đồng đội + 5 đối thủ từ bộ Alpha, không trùng trong đội), xếp vị trí 1 Đền / 2 Giữa / 2 Sông theo `lanes` của tướng (jungle → Giữa, support → Sông vì chưa có quái rừng). Kiểm thử: `node tools/t_arena.mjs [phút] [seed]` (10 bot, không DOM): không lỗi/NaN/ra ngoài bản đồ, trận kết thúc ~15–26 phút, hai đội thắng ngang nhau qua các seed.
- 2026-10-01: Bản đồ nhỏ toàn bản đồ `hud/minimap.js` (cả 1v1 và 5v5), góc phải trên dưới nút Toàn màn hình: nền vẽ một lần, công trình / lính / tướng / khung nhìn camera vẽ lại mỗi khung. Hiện mọi đơn vị vì chưa có sương mù. Tỉ số trên cùng giờ là tổng hạ gục của đội.
- 2026-10-01: Vào 5v5: màn chọn tướng có nút **Chế độ 1v1 / 5v5**; hoặc `?hero=<id>&mode=5v5`.
- 2026-10-01: Phản hồi "map chưa đủ rộng, góc nhìn rộng hơn": hệ số bản đồ K 1.5 → **2.2** (14080 × 14080, băng qua đường Giữa ~45s), đường rộng 880, Suối Đèn đặt theo K; camera 1300/38° → **1650/42°** (`CAM_DISTANCE`, `CAM_FOV`). 7 seed `t_arena`: trận kết thúc 15–30 phút.
- 2026-10-01: Camera lần 3: 1650/42° → **2400/45°** (far plane 11000, sương mù xa 4200–9500, bầu trời 10000).
- 2026-10-01: **Tầm nhìn kiểu Liên Quân** (`sim/vision.js`, chỉ bật khi `map.vision`, tức 5v5): đội chỉ thấy địch khi có đơn vị mình trong tầm nhìn (tướng 1300, lính 900, trụ 1100, nhà chính 1300; theo 02 §9 nhưng nới theo camera rộng) và không bị tường chắn; địch trong bụi cỏ chỉ thấy khi có đơn vị mình đứng cùng bụi (hoặc sát dưới 220); đánh người thì lộ 1.5s (kể cả khi đang trong bụi); công trình luôn hiện. Kết quả ghi vào `e.seenBy[team]` mỗi 3 tick. Dùng ở: tự nhắm/đánh thường (`nearestEnemy`), lính, trụ, bot (`laneBot` không nhìn thấy địch ẩn) và hiển thị (`unitView` ẩn model, `hud` ẩn thanh máu, `minimap` ẩn chấm). Chiêu có vùng/đạn vẫn trúng đơn vị đang ẩn (như MOBA). Đứng trong bụi: model của mình mờ đi. `render/fog.js`: tấm phẳng tối khoét theo tầm nhìn phe mình, dùng lại cho bản đồ nhỏ. Bản 1v1 hiện mọi thứ như cũ. Chưa có: mắt (ward), bẫy tàng hình, tầm nhìn nhờ Cá Chép Vàng, nhớ vùng đã khám phá.
- 2026-10-01: Bamboo Shade (`bong_tre`) đổi sang model `ronin_pbr_100000.glb` (kiếm sĩ nón lá, hai kiếm; 100k tam giác, 4.6 MB). `import_fused.mjs` thêm: giảm tam giác bằng meshoptimizer (`simplify`, còn ~28k), thu nhỏ ảnh JPEG (`texMax`), nhiều vũ khí gắn nhiều xương (`weapon[].bone`), xương váy cho vạt áo. Model sau xử lý ~2.8 MB. Animation viết tay `heroes/bong_tre.anim.mjs`; góc hai tay cầm kiếm giải bằng IK (`bong_tre.poses.mjs`). Hạn chế: chưa chỉnh `hitTime`; vài mảnh lá trên nón có thể rung khi xoay; mặt bị khẩu trang/nón che nên chân dung chỉ thấy nón.
- 2026-10-01: Chống mảnh vụn (`import_fused.mjs` `deshard`): chạy thử mọi clip, tam giác nào có cạnh giãn quá `ratio`× so với tư thế gốc thì bỏ, rồi bỏ cụm tam giác nhỏ rời; tam giác chạm vũ khí không cắt (kiếm không rời tay). Emberforge/Mossback ratio 2.0, Bamboo Shade 1.6. Ratio quá chặt (1.45) làm thủng mũ/đầu. Cast2 của Emberforge viết lại: nhấc búa → giáng đầu búa xuống đất trước mặt (IK) → chống búa gồng người → rút về vai.
- 2026-10-01: Animation vũ khí chuyển sang **quỹ đạo + IK từng khung** (`tools/modelgen/armik.mjs`, `animlib.weaponPath`): mỗi clip mô tả vị trí tay và hướng vũ khí theo thời gian (toạ độ tư thế gốc, gắn theo Hông); khi dựng clip, góc vai/khuỷu/cổ tay được giải từng khung, có vật cản (thân, đầu, chân, mặt đất) để vũ khí không xuyên người, bám xuôi và bám ngược rồi ghép để không lật tay. Áp dụng cho Emberforge (búa), Mossback (gậy), Bamboo Shade (hai kiếm). Kiểm lỗi: `IK_DEBUG=1 node build.mjs <id>` in sai số tay/đầu vũ khí (đạt: trung bình 1–5 cm).

- 2026-10-01: **Hết mảnh vụn trên model texture** (`import_fused.mjs`). Nguyên nhân gốc: lưới AI là MỘT khối liền (búa dính mặt/vai, gậy dính găng) và nhiều bản sao đỉnh ở đường may uv; cách cũ gắn vũ khí theo từng đỉnh (theo màu texture) rồi xoá tam giác lẫn lộn (`cutMixed`) và tam giác bị giãn (`deshard`) → thủng mặt Emberforge, lởm chởm mũ Mossback. Cách mới: (1) `splitByLabel`: nhãn thô theo đỉnh → nhãn tam giác → bỏ phiếu theo mảng uv (chart) → lọc đa số theo hàng xóm → xoá đảo nhỏ → nhân đôi đỉnh nằm trên ranh giới vũ khí/thân (không xoá tam giác nào); (2) trọng số thân tính theo điểm đã hàn (bản sao ở đường may nhận y hệt trọng số) rồi làm mượt Laplace 8 vòng theo cạnh lưới (`smoothWeights`). Bỏ `cutMixed` và `deshard` khỏi 3 tướng (vẫn còn cờ `deshard`, tắt bằng `NO_DESHARD=1`). `model-sheet.html` thêm `&dbg=1` (tô đỏ phần gắn cứng vào tay) và góc `head`/`chest` bám theo xương.
- 2026-10-01: **Đòn đánh dứt khoát**: `animlib.snap` uốn thời gian clip (`custom.warp`): gồng chậm dần tới đỉnh ('out'), giáng tăng tốc ('in') trong ~0.04–0.06 s, khựng vài khung ở điểm chạm ('lin' gần như đứng yên), rồi thu đòn giảm tốc. Áp cho Attack/Cast/Ult/Death của Emberforge, Mossback, Bamboo Shade; `hitTime` đổi theo điểm chạm mới (0.26/0.22, 0.28/0.22, 0.17/0.17). Cast2 Emberforge viết lại theo yêu cầu: nhấc búa giơ thẳng lên cao qua đầu, khựng, giáng xuống đất trước mặt, ghì rồi vác lại.
- 2026-10-01: **Mossback đổi bộ kỹ năng** cho hợp model thợ lặn (trước là "rùa đá" húc/chấn/đền thiêng, khó hiểu): Nội tại Bình Dưỡng Khí (khiên 8% HP sau 8s không trúng đòn); K1 **Móc Neo** (skillshot 850, móc trúng địch đầu tiên thì kéo về sát trước mặt + choáng 0.5s); K2 **Dậm Áp Suất** (dộng ống tạo sóng nước quanh mình, chậm 35%); K3 **Xoáy Nước Sâu** (hút mọi địch trong 420 về quanh mình rồi khiêu khích, +giáp/kháng). Engine thêm: `forceMove` (kéo cưỡng bức, `movement.js`), `skill.hook`, `aoeSelf.pullIn`, `skill.windup` (chiêu phát ra sau nhịp vung, khớp lúc ống chạm đất; animator dùng `hitTime.Cast1/Cast2/Ult`). Mọi chiêu có `desc`.
- 2026-10-01: Mossback hết giãn lưới: đo bằng `STRETCH=1` (số tam giác giãn >1.5×/2× từng clip). Gộp Spine/Neck/Head vào Chest (`import.merge`: mũ lặn + thân là một vỏ cứng, chỉ gập ở thắt lưng), làm mượt trọng số 64 vòng, giảm biên độ cúi/ngửa thân (`stiff`), không giơ tay quá vai (giơ nắm đấm bằng gập khuỷu). Số tam giác giãn >2× ở Ult/Victory giảm từ ~1000 xuống ~200.
- 2026-10-01: **Hệ hiệu ứng kỹ năng** (`src/render/vfx/`, thay `fx.js` cũ chỉ có vòng tròn). `particles.js`: hạt CPU + một draw call `THREE.Points` (shader riêng, atlas canvas 8 ô: quầng sáng, khói, lá, sao, bong bóng, giọt nước, mảnh đá, vệt), hai hệ cộng sáng/trộn thường, có cản/trọng lực/xoáy quanh tâm/bám theo vật thể. `shapes.js`: sóng xung kích, vệt trên đất (nứt dung nham, cháy xém, nước loang, vòng ký tự sao sáu cánh), cung chém, xoáy nước, bong bóng khiên fresnel, cột sáng, xích, **dải vệt theo đầu vũ khí thật** (xương HandR/L → HandR/L_Tip, chỉ hiện khi vũ khí vung nhanh). Hình chính dùng trộn thường (màu đậm, không trắng bệch trên nền đá sáng), lõi > 1 để bloom bắt. `library.js`: chủ đề từng tướng (Emberforge lửa rèn, Mossback nước sâu, Bamboo Shade lá trúc, Moonstream nước trăng, Kitewing gió, Lanternward đèn vàng) + bộ riêng cho từng chiêu; tướng khác dùng mặc định theo kiểu sự kiện. Hiệu ứng chung: tia trúng đòn theo chủ đề người đánh, sao choáng/khiêu khích xoay trên đầu, bong bóng khiên, hồi máu, lên cấp, về thành, chết, tốc biến. Rung camera (`camera.shake`) cho chiêu đập đất. Sự kiện `aoe/impact/cone` thêm `id` người tung; ẩn hiệu ứng của địch ngoài tầm nhìn. Kiểm thử: `?fxslow=` và `__game.advance(giây)` (bước tay mô phỏng + vẽ, chụp từng khung).
- 2026-10-01: **Đồ hoạ map bán chân thực** (5v5 + 1v1). `env/surfaces.js`: texture vẽ từng điểm ảnh, lặp khít (cỏ nhiều tông + ngọn cỏ, đất nện, đá lát phiến đa giác Voronoi có vát mép + rêu khe, tường đá xếp có rêu leo chân, nhiễu dữ liệu). `env/ground.js`: **bản đồ trộn nướng sẵn** (DataTexture 1024², R đá lát / G đất mòn / B bóng / A lòng sông) vẽ từ đường, sân, trụ, tường, cây, đá, bụi; shader nền (Lambert + onBeforeCompile) trộn cỏ–đất–đá–bùn sỏi, phá đều mép bằng nhiễu, lặp texture hai tỉ lệ, loang cỏ ẩm/khô theo vùng; **bóng đổ nướng sẵn** theo hướng nắng (cây, đá, trụ, tường) — không tốn bóng thời gian thực. Làm mờ bằng hộp tách hai chiều trên mảng (ctx.filter quá chậm), canvas `willReadFrequently` → nướng ~0.5 s. Bỏ dải đường + lề đá cũ; đá vụn lác đác dọc mép đường. Nước: trong, sâu dần ra giữa dòng, sóng từ nhiễu cuộn theo dòng, fresnel + lấp lánh nắng, bọt mép bờ; chỗ đường băng qua sông (5v5) thành ghềnh cạn thấy đá. Cây lá rộng nhiều cụm gồ ghề (pháp tuyến mượt, tối trong tán) + cây thông; đá xám ấm có rêu; cây/đá/cỏ rải theo ô vùng (`scatterChunked`) để frustum culling bỏ phần ngoài màn hình. Ánh sáng dịu hơn; hậu kỳ thêm chỉnh màu (tương phản, giảm bão hoà nhẹ, bóng lạnh/sáng ấm, vignette). Xem texture: `tools/surfaces.html`.
- 2026-10-01: Map gọn hơn theo góp ý: **trong sân chơi không còn cây rải rác**, chỉ có **bụi núp lớn** (đúng vùng `map.bushes` giấu tầm nhìn): khối bụi elip rậm nhiều cụm lá, giữa cao mép thấp, dương xỉ nhô đỉnh, cỏ cao quanh mép, xanh đậm để đọc ngay là chỗ núp. Cây chỉ còn ở rừng viền ngoài (5v5: 620 cây, 1v1: 160); đá trong sân giảm còn ~30%. Đèn lồng thưa (5v5 cách 1500, 1v1 cách 1100) và so le hai bên đường.
- 2026-10-01: **Bụi núp bán chân thực** (`env/bushes.js`): lõi vòm tối + hàng nghìn thẻ lá (ảnh chùm lá vẽ canvas, alphaTest) nằm áp theo bề mặt vòm siêu elip (phủ gần kín hình chữ nhật vùng bụi), pháp tuyến theo vòm → cả bụi đổ sáng tròn; đỉnh nắng ngả vàng, lòng tối; gió lay; gộp một draw call. **Thêm nhiều bụi** (5v5: 40 bụi = 5 vừa + 3 lớn "macro" + 12 nhỏ mỗi phía, đặt né đường/sông/tường, bỏ bụi cũ nằm dưới sông; 1v1: thêm 2 bụi nhỏ mỗi phía, nới bụi giữa). Minimap vẽ bụi dạng elip.
- 2026-10-01: **HUD kiểu Liên Quân**. Bản đồ nhỏ góc trái trên (to hơn, công trình vẽ hình tháp/pha lê, tướng là **chân dung tròn** chụp từ model thật — `hud/portraits.js` dùng renderer của trận, viền xanh đồng đội / đỏ địch, mình viền trắng). Khối cửa hàng (nút giỏ + vàng, gợi ý mua nhanh có tên + công dụng, 6 ô đồ) ngay dưới bản đồ nhỏ; nút ⚙ góc phải trên chọn **cửa hàng bên trái hoặc bên phải** (lưu localStorage `la.hud`; bảng cửa hàng trượt ra từ phía tương ứng). Cụm nút phụ ở đáy, trái cụm kỹ năng: **Biến về · phép bổ trợ · đồ kích hoạt**, icon to có nhãn tên; **giữ ~0.35s để xem mô tả** (`hud/tip.js`). Icon vẽ SVG có chiều sâu (`hud/art.js`: nền toả tâm, viền kim loại, hình có khối + quầng sáng + vệt bóng kính) cho 6 phép bổ trợ, Biến về, nút Đánh và kỹ năng (chọn hình theo cơ chế: móc neo, xoáy, khiên, quạt, sóng…, màu theo chủ đề tướng). Nút kỹ năng/Đánh to theo màn hình (clamp theo vh). Thanh máu trên đầu tướng: huy hiệu cấp lục giác, vạch mỗi 250 HP, thanh mana, tên.
- 2026-10-01: **Trụ & tế đàn chân thực hơn** (`render/structures.js`, xem nhanh `tools/structures.html`). Trụ: tháp canh đá khối (texture đá xếp ấm `wallStoneSurface(false)`, UV quấn theo chu vi), bệ 3 bậc, 4 trụ chống nghiêng, sàn lỗ châu mai, tầng đèn 4 cột đá, mái **ngói men** màu đội (`roofTileSurface`), chóp đồng. **Tế đàn** (nhà chính) to gấp ~3 trụ: đàn đá 3 tầng đường kính ~1160, bậc thang 4 phía, 8 cột đá có ấn khắc phát sáng màu đội, bệ sen lớn, **pha lê nhiều mặt cắt khổng lồ** + 3 vòng vàng quay, cột sáng; bản 1v1 thu 0,72 cho vừa giữa hai tường. Sân lát/đất mòn/bóng nướng quanh tế đàn nới theo.
- 2026-10-01: Bụi cỏ đổi sang **tông xanh ngọc đậm** (lá + lõi), khác hẳn cỏ vàng-xanh dưới đất; minimap vẽ bụi ô bo tròn xanh ngọc viền sáng (bụi giữa sông viền vàng). Thêm **2 bụi lớn giữa sông** (2300,2300) và (4100,4100) hai phía ngã tư giữa, mọc trên cồn bùn — chốt chặn quan trọng nhất; bụi nằm đúng trục đối xứng nên chỉ có một (hàm `bushRects` khử bản sao, dùng chung cho tầm nhìn, dựng hình, minimap). **6 ô trang bị không còn hiện thường trực** — chỉ thấy trong bảng cửa hàng (hàng "Trang bị" ở đầu bảng).
- 2026-10-01: Cấp kỹ năng hiển thị bằng **viền nấc** quanh nút (SVG `levelRing` trong `hud/skillButtons.js`): vòng tròn chia theo số cấp tối đa của chiêu (6 với K1/K2, 3 với chiêu cuối), bắt đầu từ đỉnh theo chiều kim đồng hồ; nấc đã nâng sáng vàng có quầng, nấc chưa nâng tối; nấc vừa nâng loé trắng rồi thu về (`@keyframes lvup`). Nút "+" nâng chiêu nhấp nháy khi có điểm. Bỏ dấu chấm cấp cũ.
- 2026-10-01: Chỉnh map 5v5 theo ảnh khoanh của người chơi: bỏ bụi tròn giữa sông cũ + bụi lớn bờ sông (2150,2750); thay bằng **hai bụi lớn liền khối dạng "con nhộng"** chạy dọc lòng sông, ôm sát hai bên cầu đường Giữa (`bushes[].cap = [x1,y1,x2,y2], r`; `inBush` trong `maps.js` dùng cho tầm nhìn, `bushes.js` dựng thẻ lá theo khung xoay + cồn bùn kéo dài, minimap vẽ nét dày bo tròn). **Bệ đá hai bờ sông** kẹp hai bụi (4 đoạn, `ledge`). **Bệ đá ngăn rừng–đường** kéo dài gần hết nửa mỗi đường (Đền/Sông tới 9300, Giữa tới 6300), có khe đi tắt: không có lướt thì phải vòng qua khe; tường dày 110. Bệ đá vẽ thành dãy khối đá tảng cao thấp lệch nhau trên nền đá thấp, mặt trên đá khối. **Trụ ngoài đường Giữa** dời gần ngã tư giữa: (2500,3900) → (2750,3650).
- 2026-10-01: **Rừng 5v5** (`data/jungle.js`, `sim/jungle.js`, đội 2 = quái trung lập). Mỗi phía 6 trại: **Linh Thuỷ** (bùa xanh — Ấn Thuỷ: −10% hồi chiêu, +30 hồi mana/5s, 90s), **Hoả Nham** (bùa đỏ — Ấn Hoả: đánh thường đốt 25+3/cấp mỗi giây trong 2s và làm chậm 20%, 90s), 2 trại **Sói Đá** (1 sói đầu đàn + 2 sói con), 2 trại **Cóc Rêu**. Hai mục tiêu lớn giữa sông (tên/tạo hình riêng, không dùng rồng/Caesar): **Long Ngư** (cá chép rồng, đánh xa nổ lan, xuất hiện 2:00, hồi 3:00; hạ được cả đội +150 vàng +220 kinh nghiệm) ở đầm sen (1950,1950); **Hổ Lôi** (hổ sấm, xuất hiện 6:00, hồi 4:00; cả đội nhận **Uy Hổ** +30 công +50 phép −8% sát thương nhận trong 120s, +100 vàng) trên đài sấm 4 cột (4450,4450). Quái đánh trả theo nhóm (`lastAttacker`), kéo quá 900 thì chạy về bệ, hồi đầy máu. Lính/trụ bỏ qua quái; tự nhắm ưu tiên tướng/lính hơn quái. **Mỗi trại có bệ đá lát phiến tròn làm "lãnh thổ"** (viền đá rêu, vòng ấn màu bùa) và **cung bệ đá tảng** ôm trại chừa cửa vào (`arcWalls`). Model quái dựng thủ tục (`render/monsters.js`). HUD: thanh máu vàng có tên cho quái bùa/boss, huy hiệu bùa đang có (vòng đếm thời gian) cạnh cấp tướng, thông báo khi một đội hạ Long Ngư/Hổ Lôi. Kiểm thử `node tools/t_jungle.mjs`. Chưa có: bot đi rừng (bot vẫn chỉ đi đường), trừng phạt.
- 2026-10-01: **Bệ đá kiểu tảng đá rêu** (`render/env/jungleDecor.js`): mọi đoạn tường thành cụm tảng đá xám lam gồ ghề, mặt trên phủ rêu + cỏ + bụi lá, đá nhỏ dưới chân (thay khối đá xếp cũ). **Hai bụi giữa sông nằm ngang** (băng ngang lòng sông, song song đường Giữa, hai bên ngã tư) thay cho bụi dọc lòng sông. **Minimap bỏ bụi cỏ**, vẽ bệ đá thành nét đá dày + biểu tượng trại quái (xanh/đỏ/vàng, L = Long Ngư, H = Hổ Lôi), trại đã dọn thì mờ và đếm giờ hồi.
- 2026-10-01: **Nút Hồi Máu cố định** (như Liên Quân): mọi tướng mặc định có 3 nút phụ **Biến về · Hồi Máu · 1 phép bổ trợ tự chọn** (phép tự chọn vẫn chọn ở màn chọn tướng; danh sách sẽ thêm sau). Hồi Máu (`RESTORE` trong `data/spells.js`, `castRestore` trong `sim/spells.js`, lệnh `{ type: 'restore' }`): hồi 15% HP tối đa trong 3s (status `hot`, giờ đi qua `heal()` nên tính giảm hồi máu và hiện số xanh), hồi chiêu 120s, dùng sẽ huỷ Biến về; không chiếm ô phép bổ trợ (Hồi Phục vẫn là một phép tự chọn riêng, hồi cả đồng minh). Icon bình thuốc đỏ có trái tim, hiệu ứng vòng + cột sáng hồng. Phím: H hồi máu, B/R biến về. Bot dùng khi HP < 45%. Kiểm thử `node tools/t_restore.mjs`.
- 2026-10-01: **Trụ ngoài hai đường cánh dời lên sát sông** như trụ ngoài đường Giữa (cùng khoảng cách tới lòng sông): Đền (800,2500) → (800,1700), Sông (3900,5600) → (4700,5600); trụ trong dời theo cho đều: (800,3700) → (800,3350), (2700,5600) → (3350,5600) (toạ độ gốc ×K, phía Đỏ đối xứng). Bụi cạnh trụ ngoài Sông dời (4800,5750) → (4950,5850) để không đè trụ. 6 seed `t_arena`: 3 Xanh / 3 Đỏ thắng, 15–27 phút.
- 2026-10-01: **Suối Đèn (chỗ hồi sinh) làm lại** (`createFountain(team, scale)` trong `render/structures.js`), khác hẳn trụ/tế đàn: sân lát đá tròn sát đất (tướng đi lại không bị lún) có **vòng ấn sáng màu đội** đúng vùng hồi máu + hoa văn sen mờ; giữa sân **đài phun sen ba tầng** nước chảy tràn (màn nước động); trên đỉnh **đèn lồng giấy lục giác khổng lồ** màu đội lơ lửng xoay chậm + quầng sáng; đèn đá hai bên và phía sau; **hàng 5 cột cổng có dầm + phướn màu đội** ôm phía sau; linh hồn đom đóm bay xoắn lên. Lối vào quay ra giữa bản đồ (`unitView` xoay theo hướng tâm bản đồ). Bản 1v1 thu nhỏ theo vùng hồi (350/650).
- 2026-10-01: **Cây bán chân thực bằng thẻ lá** (`render/env/trees.js`, thay cây khối tròn cũ ở cả 5v5 và 1v1): thân + rễ nổi + cành cong (ống thon, ảnh vỏ cây), tán là nhiều chùm; mỗi chùm phủ thẻ ảnh chùm lá (alphaTest) theo mặt elipsoid, pháp tuyến hướng ra từ tâm chùm, màu đỉnh sáng phía nắng/tối trong lòng tán; lõi tán tối lấp khe. 4 loại: lá rộng tán tròn, cây cao tán thuôn, **cây hoa hồng**, thông (thẻ lá kim, tầng rủ). **Rừng dày ngay sau mỗi Suối Đèn** (~110 cây ngoài sân chơi, cây hoa hồng ở gần hai bên hàng cột); cây phía camera (mép dưới bản đồ) lùi xa và thấp hơn để không che sân.
- 2026-10-01: **Nâng chất lượng hình**: pixel ratio Vừa 1.25 → 1.5, Cao 1.5 → 2; **khử răng cưa MSAA 4 mẫu** cho đường hậu kỳ (trước đây bật hậu kỳ thì mất khử răng cưa); **làm nét** (unsharp mask nhẹ có giới hạn) trong pass chỉnh màu; **bóng đổ thời gian thực cho tướng/quái/lính** ở mức Vừa (1024) và Cao (2048): nắng đổ bóng trong hộp ±2300 đi theo camera (bám lưới texel cho khỏi rung), cùng hướng với bóng nướng sẵn của cảnh tĩnh; nền tối thêm phần sáng môi trường dưới bóng cho đậm ngang bóng nướng. Mức Thấp giữ như cũ (không MSAA, không bóng thật). `__game` có thêm `scene`, `views` cho kiểm thử.
- 2026-10-01: **Bụi cỏ & bệ đá kiểu Liên Quân** (`data/maps.js`): danh sách bụi phía Xanh gom vào `BUSHES_BLUE`; **không bụi nào nằm trong tầm bắn trụ** (750): bụi trong tầm trụ Giữa ngoài/trong, Đền trong/nhà, Sông nhà bị bỏ hoặc dời ra ngoài tầm (2 bụi lớn "macro" chuyển vào rừng dưới, cạnh trại sói/bùa đỏ). **Bụi gần trụ** (cách vùng bắn < ~1500) tự có **dải tảng đá áp sát cạnh phía xa trụ** (`bushRocks`) làm chỗ núp có lưng tựa. Thêm 7 đoạn **bệ đá trong rừng** mỗi phía (`JUNGLE_ROCKS`): giữa bùa xanh–trại cóc, sói–cóc, túi bờ sông trước trại cóc, bờ sông cạnh đầm Long Ngư và đài Hổ Lôi, giữa trại sói dưới–bụi lớn, cóc dưới–bùa đỏ. Bot vẫn tìm đường được (6 seed `t_arena`: 4 Xanh / 2 Đỏ, 15–26 phút, không lỗi).
- 2026-10-01: **Icon kỹ năng riêng từng tướng** (`hud/heroArt.js`, xem `tools/icons.html`): khung kim loại theo tướng (sắt nung / đồng thau đinh tán / ngọc bích / bạc / bạch kim / vàng) + viên đá đỉnh, nền chuyển sắc và hoa văn chủ đề (tia lửa lò rèn, bọt nước, rừng trúc, trăng sao, mây gió, đèn lồng), hình vẽ riêng cho 18 chiêu của 6 tướng bộ Alpha (búa vung cung lửa, giáp xỉ sắt, đe trời; mỏ neo, ủng lặn dậm, xoáy quanh mũ lặn; lá trúc bay, vệt chém lướt, mặt nạ trong rừng trúc; giọt bạc, xoáy dưới trăng khuyết, trăng tròn trên sóng; mũi tên gió, diều lộn, mưa tên; đèn trôi, tay trao lửa, vòng đèn hội). Tướng chưa có thiết kế riêng dùng icon chung theo cơ chế như cũ. **Nút Đánh thường là nắm đấm** cho mọi tướng.
- 2026-10-01: Bỏ đèn lồng dọc đường rơi vào lòng sông (5v5: không cắm đèn trong phạm vi lòng sông + 220). **Nước sông làm lại** (`env/water.js`): vân sóng 3 tầng kéo dài theo dòng, trôi theo dòng với tốc độ giữa dòng nhanh/sát bờ chậm (hai pha luân phiên để vân không bị kéo giãn), ánh sáng khúc xạ dưới đáy chỗ nước cạn (caustics), phản chiếu trời theo pháp tuyến, lấp lánh nắng, vệt bọt dài trôi theo dòng, bọt vỗ bờ, nước xiết qua ghềnh đá chỗ đường băng qua, lá và cánh hoa trôi theo dòng; màu nông → sâu ba bậc, bóng bờ đổ xuống mép nước. Giới hạn màu đầu ra (tránh giá trị vô hạn làm bloom trắng màn hình).
- 2026-10-01: **Lá cây/bụi sắc nét hơn**: ảnh chùm lá 256 → 512 (vẽ cùng bố cục), mỗi lá có viền tối + gân + ánh bóng, hoa có viền cánh; vật liệu thẻ lá dùng **alpha-to-coverage + làm dốc alpha theo fwidth** (`crispAlpha` trong `env/trees.js`, áp cho cây và bụi) thay alphaTest: mép lá sắc, không răng cưa, lá ở xa không bị mòn vì mipmap.
- 2026-10-01: **Rừng kiểu Liên Quân** theo ảnh người chơi gửi. (1) **Tường có độ dày riêng từng đoạn** (`w`, đơn vị thế giới; mặc định `walls.thickness`): sim (`clampToMap`, tầm nhìn, lưới đường đi — ô bị chặn khi tâm ô nằm trong capsule) và minimap đều dùng. Tường dọc đường dày 300 (lùi ra khỏi mép đường), cung đá sau trại 320 (dày ra phía sau, lòng trại giữ nguyên), bệ đá rừng 340, bệ bờ sông 220, đá cạnh bụi 180 → thành **khối đá lớn** như mảng tối trên minimap Liên Quân. (2) Dựng hình (`env/jungleDecor.js`): mỗi đoạn là một **khối vách đá** nâng từ viền capsule (vách dốc gồ ghề, vai bo, đỉnh lồi lõm có mảng rêu cỏ), màu xám lam kiểu Liên Quân (sáng mặt ngửa, tối chân), đá tảng **tròn mượt** quanh chân, cỏ lá dài + khóm hoa xanh trên đỉnh và quanh chân. (3) **Bụi núp = cỏ lá dài** (`env/grass.js`: khóm 4 thẻ đan chéo, ảnh ~40 lá cỏ gốc tối ngọn sáng, mép sắc alpha-to-coverage, gió lay ngọn) thay bụi lá vòm. (4) **Thêm bụi cỏ mép nước dọc bờ sông sát hai đường cánh** (mỗi bên sông 1 bụi ở đường trên, 1 ở đường dưới). (5) **Hang mục tiêu lớn** như hang Tà thần/Rồng: bệ đá tối thấp, 7 móng đá cong ôm phía sau có gân sáng, tảng đá chặn mép sau, **vết nứt phát sáng** (tím: Hổ Lôi, vàng cam: Long Ngư) toả trên bệ và lan xuống nước, quả cầu năng lượng; thay đầm sen/đài 4 cột. (6) Bờ sông: lá sen nổi + sen hồng, cỏ dài, khóm hoa xanh. Sửa lỗi cũ: bụi phía Đỏ đối xứng nhưng không đổi rộng/cao (`bushRects`). Một số bụi/bệ đá dời nhẹ để không chồng lên nhau. 6 seed `t_arena`: 4 Xanh / 2 Đỏ, 17–28 phút.
- 2026-10-01: **Hang mục tiêu lớn dời ra mép rừng mỗi bên sông** (như Liên Quân, không còn ở giữa lòng sông): Long Ngư ở bờ phía Xanh gần đường trên (1450,1880), Hổ Lôi ở bờ phía Đỏ gần đường dưới (4950,4520) — đối xứng tâm; nửa bệ lấn ra mép nước, móng đá ôm phía rừng (`back`), mặt hở ra sông và về phía camera. Bùa xanh quay cửa trại lên phía hang; bỏ bệ đá cũ cạnh đài Hổ Lôi, dời 1 bụi. Bụi mép sông giờ đặt riêng từng bờ (`noMirror`): mỗi đường cánh có bụi ở bờ đối diện hang + bụi nhỏ cạnh hang.
- 2026-10-01: **Phối màu & độ nét kiểu Liên Quân**: chỉnh màu cuối bão hoà 118% (trước 90%), tương phản 1.1, bóng ngả lam ngọc / sáng ngả ấm, vignette nhẹ hơn; ánh sáng nền phản lam ngọc. **Đá lát đường 1024²** vẽ lại: phiến lớn xám lam/xám be, mép vát tính từ trường độ cao (sáng trên-trái, tối dưới-phải), hạt đá, vết ố, khe vữa có rêu và ngọn cỏ mọc lên; phiến to hơn (lặp mỗi 460). **Cỏ nền 1024²** với 42k ngọn cỏ sắc; tầng nhiễu lớn chỉ điều sáng tối (không trộn màu làm nhoè). **Cỏ lá dài + khóm hoa tràn mép đường lát** dọc cả ba đường (thưa quanh trụ/nhà chính). Cỏ/hoa/sen không mọc trên bệ trại quái và hang.
- 2026-10-01: **Ba đường rộng thêm ~20%**: `LANE_W` 880 → 1060 (thế giới). Tường dọc đường tự lùi theo (offset tính từ `LANE_W`); thêm `trimToLanes`: mọi đoạn tường (cung đá trại, đá rừng) phần nào lấn vào lòng đường thì bị cắt, giữ đoạn liền dài nhất (bỏ nếu còn < 140). Bụi (600,2650) dời ra (380,2650) cho khỏi nằm trên đường; hang Long Ngư (1480,1900) / Hổ Lôi (4920,4500) chỉnh nhẹ để không chạm tường đường. 6 seed `t_arena`: 4 Xanh / 2 Đỏ, 17–25 phút.
- 2026-10-01: **Bản đồ to thêm**: hệ số K 2.2 → 2.4 (15360 × 15360, +9%), đường 1060 → 1200. Tường tự lùi/cắt theo (`trimToLanes`). 6 seed `t_arena`: 5 Xanh / 1 Đỏ (bản trước cùng 6 seed: 4/2 — lệch về Xanh có từ trước, bot chưa đánh boss nên không do hang; cần xem lại AI sau).
- 2026-10-01: **Vòng tầm bắn trụ địch** (`render/towerRange.js`): đến gần trụ/nhà chính địch (cách mép tầm < 650) hiện viền tầm bắn trên đất (vàng nhạt khi ở ngoài, đỏ khi đã vào tầm, vạch chạy quanh viền, mờ dần theo khoảng cách); trụ đang nhắm vào mình (`streakTarget`) thì viền đỏ đập + tia đỏ trên đất từ trụ tới chân mình.
- 2026-10-01: **Icon kỹ năng vẽ lại theo phong cách tranh vẽ chuyên nghiệp** (`hud/heroArt.js`, khung 128): nền tối có vân sơn (feTurbulence) + quầng sáng sau vật thể, vật thể đổ khối bằng chuyển sắc nhiều nấc + viền sáng mảnh phía nắng (bỏ viền đen dày, bỏ đá quý/đinh tán), đổ bóng mềm, lớp hiệu ứng phát sáng (lửa, nước, gió, trăng), viền tối + khung kim loại mảnh. Vẽ lại 18 chiêu + nút đánh thường (găng sắt nắm đấm, vụ nổ lực).
- 2026-10-01: **Icon vẽ canvas kiểu tranh MOBA** (`hud/paint.js`) theo ảnh Liên Quân người chơi gửi: ảnh 256² (data URL, lưu đệm) **tràn kín vòng tròn**, hiệu ứng năng lượng chiếm chủ đạo (tia sáng toả, vệt chuyển động, xoáy, cung lửa/nhát chém dạng dải thon), vật thể to cắt khung, đổ khối (viền sáng trên-trái, bóng dưới-phải, đổ bóng mềm), bloom có ngưỡng (thu nhỏ + nhân chính nó + cộng sáng), hạt nhiễu, viền tròn tối + viền kim loại mảnh. Áp cho 18 chiêu bộ Alpha, nút đánh thường (găng sắt đấm, nổ lực phía sau), Biến về (vòng phù văn + cột sáng xanh), Hồi Máu (tay nâng cầu sinh lực xanh) và 6 phép bổ trợ. `heroArt.js`/`art.js` giữ SVG làm dự phòng (tướng chưa có icon vẽ, môi trường không có DOM). CSS `.art` dùng chung cho `<img>`/`<svg>`. Xem `tools/icons.html`.
- 2026-10-01: **Tầm bắn trụ 5v5 rộng hơn**: trụ 750 → 950, nhà chính 850 → 1050 (bản 1v1 giữ nguyên). Vòng tầm bắn trên đất tự theo. Bỏ các bụi ngoài mép hai đường cánh; không bụi nào trong tầm 950. 6 seed `t_arena`: 3 Xanh / 3 Đỏ, 20–35 phút (trận dài hơn vì trụ khó phá hơn).
- 2026-10-01: **Tường biên đóng khung bản đồ**: dãy tấm đá xẻ lớn (dày 260, cao ~190: đế, thân, nắp vát; mạch nối lộ ra) chạy suốt mép ngoài đường Đền và đường Sông, bo cong theo góc đường, hai đầu có đoạn chặn ra tới viền ngay trên sân nhà → phía ngoài không đi được, không thuộc sân chơi (`border: true` trong `walls.segs`, `ARENA.outOfBounds(x, y)`); phía ngoài trồng rừng dày (phía camera lùi xa để không che đường). Va chạm/tầm nhìn/tìm đường dùng chung hệ tường.
- 2026-10-01: **Vân đá phân lớp** (`strataSurface`): khối đá rừng có lớp ngang lượn sóng sáng/tối, rãnh giữa lớp có viền sáng (giả khối), nứt dọc, hạt đá; chiếu ba mặt theo toạ độ thế giới (`strataMat`, cả đá tảng). Tường biên dùng `cutStoneSurface` (đá mài vân sọc, rêu chân).
- 2026-10-01: **Trụ & tế đàn làm lại** (`render/structures.js`, xem `tools/structures.html`): chất liệu **cẩm thạch trắng ngà có vân** (`marbleSurface`) + viền vàng. Trụ: bệ ba bậc có ấn sáng màu đội, thân bát giác thon có gờ góc + kênh sáng dọc + 3 vòng vàng, 4 trụ chống cong như cánh ôm thân, ban công lỗ châu mai, lồng đèn 4 gân vàng giữ **pha lê màu đội** (lõi sáng, vòng quỹ đạo vàng), mái ngói cong hai tầng có chuông góc, chóp vàng, phướn hai bên. Tế đàn: ba tầng cẩm thạch viền vàng + kênh sáng quanh mỗi tầng, 8 cột đầu vàng có ấn sáng **bắn tia năng lượng** vào pha lê, **cụm pha lê** (1 lớn + 6 vệ tinh lơ lửng), 2 vòng phù văn vàng có bản khắc sáng quay ngược chiều (bỏ khung lưới cũ), 4 cột phướn ở góc, cột sáng lên trời.
- 2026-10-02: **Đường đi chi tiết hơn**: đá lát có **pháp tuyến thật** (trường độ cao của phiến đá → shader nền làm lệch pháp tuyến ở vùng lát: mép phiến sáng phía nắng, tối phía khuất, hạt đá nổi) — `flagstoneHeight()`; **viền đá bó vỉa** dọc hai mép cả ba đường (khối đá xẻ thấp nối nhau, lệch/nghiêng nhẹ, thỉnh thoảng thiếu viên; tránh chỗ qua sông, sân trụ, sân nhà).
- 2026-10-02: **Trụ làm lại cho "người lớn"**: bỏ cẩm thạch trắng bóng + vàng sáng; dùng **đá khối xây có pháp tuyến** (`ashlarSurface`: viên đá lệch mạch, vết đục, mép sứt, mạch vữa sâu, 1024²; `MeshStandardMaterial` nhám) + **đồng thau cổ** + **ngói men có pháp tuyến** (`roofTileHD`). Hình: nền bát giác ba bậc, 4 trụ ốp góc đầu đồng + 4 trụ chống xiên, thân hai tầng có gờ phào, lỗ châu mai dọc có ánh đèn vàng bên trong, khiên huy hiệu màu đội viền đồng, ban công trên con-xơn với tường răng cưa, lồng đèn 4 gân đồng giữ pha lê, mái hai tầng, chóp đồng (bỏ chuông tròn góc mái, giảm độ chói kênh sáng). Tế đàn đổi sang cùng chất đá khối sáng + đồng thau cho đồng bộ.
- 2026-10-02: **Nước trên mặt đường trong suốt**: chỗ đường lát băng qua sông, lớp nước gần như trong (độ đục giảm ~94%), không còn bọt/vệt che, chỉ còn chút bọt ở mép đường → thấy rõ đá lát bên dưới.
- 2026-10-02: **Hạ tông màu toàn map**: chỉnh màu cuối bão hoà 118% → 98%, tương phản 1.1 → 1.06, thêm hạ sáng chung 6%; phơi sáng 0.9 → 0.84; đá lát đường tối 20%, cỏ nền tối 10%.
- 2026-10-02: **Bóng đổ**: thân cây + lõi tán đổ bóng nắng thật (thẻ lá không đổ để tránh bóng ô vuông), vùng bóng nắng ±3000 quanh camera; bóng thật trên nền đậm hơn (0.6 → 0.42). **Bóng tiếp đất nhỏ** dưới mọi nhân vật/lính/quái: hình bầu dục đậm ở tâm, lệch nhẹ về hướng bóng nắng, không xoay theo nhân vật, thu nhỏ khi bị hất tung; bóng nướng sẵn của cây ngoài rừng đậm hơn.
- 2026-10-02: **Đường đá mài khắc hoa văn** (`render/env/laneDecor.js`, theo ảnh Liên Quân người chơi gửi) thay đường lát đá cuội: mỗi đường là một **dải lát** (lưới chạy theo đường đã bo góc, UV dọc theo quãng đường) với texture vẽ canvas 512×2048 lặp mỗi 2.2 lần bề ngang: mặt đá phẳng xám lạnh hơi tím, loang ấm/lạnh, chia tấm lớn so le; viền trang trí hai mép (gờ nổi, rãnh đôi, khấc đều); rãnh khắc uốn lượn chữ S chạy chéo mặt đường có đuôi cuộn xoắn + rãnh phụ đan ngược; dải hoạ tiết sóng ở mạch tấm; huy hiệu khắc (thoi lồng, chữ V, vòng tròn, vảy) có đường khảm xanh nhạt; nứt mảnh, rêu trong rãnh. Khắc nổi bằng **bản đồ pháp tuyến** (sáng tối theo đèn thật nên đúng ở mọi hướng đường), màu chỉ mang độ che khuất rãnh. **Vòng khắc tròn** dưới chân trụ (r 330) và sân nhà chính (r 1150): vòng đồng tâm, nan toả, cánh sen, khấc, đường khảm. Dải lát nằm dưới mặt nước (chỗ qua sông vẫn thấy hoa văn), nhận bóng nướng sẵn + bóng nhân vật. Bỏ viền đá bó vỉa (dải lát đã có viền khắc).
- 2026-10-02: **Sông chảy liền một mạch, đè lên mặt đường**: mặt nước nâng lên trên dải đường (y 5 > 0.2), chỗ đường băng qua nước vẫn đậm (độ đục tối thiểu 80%, giữ màu sâu, bớt phản chiếu trời) → đá lát chỉ mờ mờ dưới dòng nước (đảo lại thay đổi "nước trong suốt" trước đó theo yêu cầu).
- 2026-10-02: **Bệ đá chồng phiến kiểu Liên Quân** (theo video người chơi gửi; `slabStackGeo` thay khối vách cũ): mỗi đoạn tường là 3–4 phiến đá phẳng dày bo cạnh xếp chồng, viền gồ ghề theo nhiễu, lệch nhau, lớp giữa chìa ra như mái hiên (đáy mái tối hẳn) → có chiều sâu; mặt phiến xám lam sáng có rêu loang, cạnh tối dần xuống chân, bề mặt gồ ghề nhẹ. **Quầng tối ánh tím** dưới chân mỗi bệ (vành trong suốt dần). **Cỏ cao mọc thành cụm ở chân đá** (1–2 cụm dày mỗi bệ, ưu tiên hai đầu) thay cho cỏ rải trên đỉnh; đá tảng ghé chân thưa hơn. **Bệ lãnh thổ trại quái** đổi sang đá mài khắc vòng tròn (cùng kiểu chân trụ), thấp hơn, cạnh tối — đồng bộ với đường.
- 2026-10-02: **Đường đá mài liền mạch kiểu Liên Quân** (thay hoa văn hình học "gượng"): texture dải đường vẽ bằng nét thon mềm (`softStroke` — đóng dấu chấm toả sáng/tối): các mảng đá nổi uốn lượn như vệt nước chảy so le hai bên, rãnh mềm thon hai đầu ôm theo mảng, xoáy cuộn mềm, gờ mềm sát mép, vết mòn rất mờ; làm mịn độ cao 3 lượt; **mép đường lượn sóng hoà vào cỏ**; tông xám lạnh hơi tím; dải rộng hơn đường 12%. Sân chân trụ/nhà chính: cánh xoáy nổi mềm toả từ tâm + rãnh vòng mềm, mép ngoài lượn.
- 2026-10-02: **Bệ nhà (lãnh địa)**: mỗi phía 2 cung tường quanh nhà chính (bán kính 1400 gốc) nằm ở hai khoảng trống giữa ba trụ nhà (giữa đường Đền–Giữa và Giữa–Sông), tự cắt chừa lòng đường; phe Đỏ là ảnh đối xứng. Dựng thành một khối đá điêu khắc liền mạch mỗi cung (thân cong thon hai đầu, đầu vểnh, mặt cắt chân loe đỉnh hẹp, sống lưng sáng) + **dải khảm phát sáng màu đội** dọc thân (xanh/đỏ) + quầng sáng mờ dưới chân. Tường/đá khác chồng lên bệ nhà bị bỏ (vài đoạn tường dọc đường Giữa sát nhà, một phần cung đá trại sói). 4 seed `t_arena` 35 phút: không lỗi, Xanh thắng cả 4 (lệch về Xanh đã thấy từ trước — bản đồ đối xứng hoàn toàn, cần kiểm tra AI bot).
- 2026-10-02: Bỏ toàn bộ đèn lồng dọc đường. **Dải đá mài chỉ còn trong lãnh thổ nhà chính hai bên** (mờ dần từ bán kính 3300 quanh nhà chính, mép xé theo hoa văn; vòng khắc chỉ còn dưới nhà chính). **Đường ngoài sân nhà = nền cỏ mượt xen các mảng đá lát** (mảng đá theo nhiễu tầng lớn, viền đất mòn quanh mảng; đá lát chỉ nổi khối ở các mảng).
- 2026-10-02: **Tường đá sắc cạnh**: mỗi bệ là 4–5 lớp phiến mỏng, mỗi lớp chia khối có khe nứt dọc, viền khối là đa giác ít cạnh có nhiễu, **flat shading** (từng mặt vát bắt sáng rõ), lớp so le thụt/chìa tạo khe tối, màu theo từng mặt (mặt trên xám lam + rêu, cạnh tối dần xuống chân, đáy mái tối hẳn). Bệ nhà (lãnh địa) dùng cùng kiểu đá + giữ dải sáng màu đội. **Hang boss**: bỏ móng ống tròn, thay bằng **tường đá sắc cạnh hình móng ngựa** ôm lưng hang (cao dần về giữa, chừa mặt mở ra sông) + khối đá nhọn lởm chởm quanh mép bệ; quả cầu năng lượng hạ thấp vào giữa hang.
- 2026-10-02: **Bụi cỏ giữa sông mọc thẳng từ mặt nước**: bỏ cồn đất và lõi tối, gốc cỏ ngang mặt nước, thêm vành gợn nước mảnh quanh bụi (áp cả cho bụi mép sông).
- 2026-10-02: **Bố cục 5v5 làm lại**: K 2.4 → 2.7 (17280 × 17280, rộng thêm 12.5%; tường/đường/bụi giữ bề dày thế giới nên các mảng rừng tách bạch hơn). **Trụ cách đều**: đường Đền y 1700/3150/4600 (cách nhau 1450), đường Sông x 4700/3250/1800, đường Giữa (2750,3650)/(2100,4300)/(1450,4950) (~920) — trụ ngoài vẫn sát sông, cả bản đồ đối xứng gương x↔y (đã kiểm: mọi trụ ngoài cách lòng sông đúng như nhau). **Hang mục tiêu lớn dời vào mé rừng** (cửa mở ra sông, lưng tựa rừng): Long Ngư (1340,2020) phía Xanh, Hổ Lôi (5060,4380) phía Đỏ (đối xứng tâm như Liên Quân), tường móng ngựa thấp hơn để không che camera; bùa xanh dời (1400,2800). Bụi bờ sông đặt đối xứng tâm (mỗi đường cánh một bụi ở bờ đối diện hang).
- 2026-10-02: **Đường ngoài sân nhà = phiến đá lớn mài nhẵn có hoa văn** (dải đá mài khắc uốn lượn của `laneDecor` cắt thành ô Voronoi lớn ~640, giữ ~70% ô, khe cỏ giữa các phiến, cạnh phiến vát tối) trên nền cỏ mượt; bỏ mảng đá cuội. Bỏ chỏm cỏ lẻ và hoa lẻ rải rác trong sân chơi. 4 seed `t_arena`: 2 Xanh / 2 Đỏ, 16–26 phút, không lỗi.
- 2026-10-02: **Mặt đường kiểu hiện đại, dễ nhìn** (thay phiến Voronoi lởm chởm): dải đường lát kín, texture 1024×2048 (điểm ảnh vuông, anisotropy 16) — hai dải viền đá sẫm vát cạnh ở mép (khối dài, có rãnh ngăn với lòng đường), lòng đường là tấm đá chữ nhật lớn xếp so le 4 hàng, mạch vữa mảnh sắc, mép tấm vát nhẹ, lệch tông rất nhẹ, hạt mịn; pháp tuyến từ trường độ cao. Sân nhà chính/bệ trại: lát tròn đồng tâm (vòng tấm cong, mạch hướng tâm so le, viền sẫm). Bỏ hoa văn uốn lượn và phần cắt ô.
- 2026-10-02: **Bệ đá sắc nét hơn**: vật liệu đá (`ROCK_FACET`) thêm vân lớp + hạt mịn chiếu ba mặt theo toạ độ thế giới (pháp tuyến mặt từ đạo hàm), tối dần ở chân (che khuất), mặt trên sáng lạnh; tăng tương phản mặt trên/cạnh.

## Bệ đá mượt có vân sọc + sàn đường vẽ tay kiểu Liên Quân
- Bệ đá (`slabStackGeo`): 3–4 lớp phiến dày, mỗi lớp chỉ 1–2 khối dài (~600), vát nhỏ, hàn đỉnh → pháp tuyến mượt (không còn mặt vát góc cạnh, cũng không phồng như gối). Màu xám lam, đỉnh sáng hơn vách.
- `ROCK_FACET`: shader vân sọc ngang lượn theo nhiễu chỉ chạy trên vách (theo pháp tuyến thế giới): dải sáng/tối, vạch tối mảnh + gờ sáng ngay trên; mặt đỉnh loang mảng 2 tầng nhiễu; chân đá tối dần.
- Sàn đường (`laneTexture`): đá lam tím vẽ tay — tấm lớn chia bởi rãnh cong ngang lòng đường + rãnh dọc xen kẽ, rãnh mềm (lõi tối nhạt dần ra mép), viền sáng mảnh phía trên rãnh, bóng AO về mép tấm, vệt mòn sáng giữa đường, loang mây, tối dần sát gờ viền; gờ viền bo tròn ngắt đoạn. Tông hạ thấp cho đỡ chói.

## Đá tròn nhẵn liền khối + sàn đá phiến thật + sông tự nhiên (bỏ kiểu hoạt hình)
- Bỏ đá chồng phiến. Mọi bệ đá/tường rừng, bệ nhà, vách hang boss dùng `roundRockGeo`: mặt bằng capsule bo tròn hai đầu, mặt cắt phồng
  vòm tròn, sống lưng nhấp nhô thành các tảng liền nhau, biến dạng nhiễu nhẹ theo pháp tuyến, pháp tuyến mượt. Màu đỉnh chỉ là che khuất.
- Vật liệu đá chung `ROCK_FACET` (MeshStandard): nhiễu 3D theo toạ độ thế giới → vân lớp lượn sóng (vằn), gân thạch anh mảnh, hạt mịn,
  loang ấm/lạnh, bump từ nhiễu (đạo hàm màn hình), độ nhám thay đổi (chỗ mài bóng phản chiếu môi trường). Đá tảng ghé chân, đá viền bệ
  trại, trụ đá quanh hang cũng dùng vật liệu này. Quầng dưới chân đá đổi từ tím sang bóng tối trung tính.
- Sàn đường: phiến đá lớn xếp so le theo hàng (1–2 mạch dọc mỗi hàng), mạch lượn nhẹ, góc bo, mép vát (normal map), mạch lõm đầy sạn
  tối, mỗi tấm một tông xám lam/tím khác nhau, loang + gân mảnh + hạt + ố; bó vỉa đá dài hai mép. Vật liệu đường đổi sang MeshStandard.
- Sông: bờ lượn theo nhiễu (không thẳng tắp), vũng sâu/bãi cạn loang, màu xanh rêu → lam sẫm, phản chiếu trời dịu hơn, bọt bờ mỏng
  đứt quãng, bớt vệt dòng/lá trôi, nước ở mép đục hơn (đáy ít lộ), đoạn đè lên đường tối hơn, bớt gợn trắng.

## Thêm chi tiết chân thực: rêu/nứt/tảng phụ cho đá, sàn mòn vỡ, nền rừng, lòng sông cuội
- Đá (`ROCK_FACET`): rêu xanh trên mặt ngửa + rêu ẩm ở chân theo nhiễu, khe nứt sâu theo vùng (tối + lõm bump), mặt úp tối; rêu/khe nhám hơn.
- `roundRockGeo`: thêm 1–4 tảng tròn dính liền thân (lún một phần) phá dáng ống đều; trả mẫu đỉnh để cắm cỏ dại trên lưng đá;
  sỏi vụn quanh chân mọi bệ đá.
- Đá rải rác trong rừng/mép đường dùng chung đá tròn + vật liệu đá thật (bỏ đá low-poly mặt phẳng).
- Nền rừng: thảm cỏ thấp theo khoảnh (tránh đường), ~1400 sỏi nhỏ, lá rụng nâu/vàng theo vùng (ít trên đường), đá cuội nhô khỏi mặt nước ven sông.
- Sàn đường: vết nứt gấp khúc trên một số tấm, góc tấm sứt mẻ, rêu trong mạch và loang ra mép tấm, vết ố ẩm; tông tấm trung tính hơn.
- Lòng sông: texture cuội tròn nhiều cỡ trên cát bùn (`pebbleSurface`) thay cho phiến đá.
- Sóng nước: sai phân pháp tuyến bước ~4.6 texel (trước 1 texel trên noise 8-bit gây sọc bậc thang song song), bỏ vệt dòng chảy.

## Đường cỏ toàn map, chỉ lát đá hoa văn đoạn nhà chính → trụ nhà; đá nét hơn
- "Trụ 1" hiểu là trụ đầu tiên tính từ tế đàn ra (trụ `*_home`). `pavedRange`: mỗi đường chỉ lát từ nhà chính tới quá trụ nhà
  `PAVE_EXT`=380, sau đó mép lát vỡ lởm chởm theo nhiễu 3 tầng (discard, viền sẫm) trong `PAVE_FADE`=320. Phần còn lại của đường là
  nền cỏ y như rừng (bản trộn nền chỉ vẽ phần lát, đất mòn + đá vụn mép chỉ ở phần lát); mép vỡ có đất mòn và mảnh đá lát rơi vãi.
- Texture đoạn lát (`laneTexture`): cẩm thạch xám lam mài nhẵn (MeshStandard nhám 0.48), không nứt/rêu; đĩa hoa văn lớn mỗi chu kỳ
  (vòng khảm + chuỗi hạt, sao 8 cánh đá sẫm lồng sao xoay, hoa 8 cánh khảm ngà) trong khung thoi viền đôi; thoi nhỏ lồng vòng giữa
  hai đĩa; viền hai mép: dải đá sẫm có thừng bện (hai sin đan chéo) + hạt thoi, chỉ khảm thẳng, gờ bó vỉa bo tròn.
- Đá nét hơn: lưới dày hơn (22 × 34), mép rêu sắc lởm chởm, rỗ li ti, gờ cạnh sáng theo độ cong (fwidth pháp tuyến), hạt khoáng lấp
  lánh, bump chi tiết nhỏ; tương phản màu cao hơn.

## Thêm 15 trang bị + icon vẽ tay riêng từng món (53 món)
- Mới: thành phần Chuông Đồng (giảm hồi chiêu + mana), Vòng Bạc (hồi máu/giây); Giày Lữ Hành (tốc chạy 80 + hồi máu);
  Kiếm Bão Táp (đòn thứ 3 phóng sét +80 phép), Cung Băng Lam (đòn đánh làm chậm 15%), Vuốt Hổ (xuyên giáp phẳng + tốc chạy %),
  Rìu Bạo Quân (dưới 50% HP +25% tốc đánh); Trượng Hoả Thần (kỹ năng thiêu 1% HP tối đa/giây × 2s), Quyền Trượng Tinh Tú,
  Vương Miện Nguyệt Quang, Đèn Hồn Lam; Giáp Vảy Rồng, Khiên Mặt Trời (thiêu địch trong 300 mỗi giây), Áo Choàng Bóng Đêm,
  Mũ Chiến Thần. Nội tại mới ở sim/items.js, có kiểm thử trong t_items.
- Icon (`src/hud/itemArt.js`): vẽ canvas 256², không dùng ảnh ngoài: vật thể có khối (kim loại chuyển sắc hai mặt vát, viền sáng,
  bóng đổ), hiệu ứng theo chất món (lửa, băng, sét, máu, gió, sao, sương), nền toả sáng theo màu chủ đề, bloom + hạt nhiễu; khung
  vuông bo góc theo bậc (đồng: thành phần, bạc: giày bậc 2, vàng chạm góc: đồ hoàn chỉnh). Xem toàn bộ ở tools/items.html.

## Tường thành lãnh địa nhà kiểu Liên Quân (thay bệ đá tự nhiên quanh nhà chính)
- `buildBaseWalls`: mỗi cung tường giữa hai trụ nhà là tường đá xây chạm khắc chạy cong theo cung, mặt cắt nhiều tầng (`BW_PROF`:
  đế loe, thân hơi vát, gờ đai, tầng trên thụt vào, gờ mũ, mặt đỉnh phẳng); mỗi đoạn mặt cắt là dải riêng nên cạnh gờ sắc.
- Vật liệu `baseWallMat`: đá xám tím, khối xây so le (mạch đứng 150, mạch ngang 44 theo toạ độ dọc cung `wuv`), mạch vữa lõm (bump),
  mặt ngửa sáng, chân tối. Dải khảm phát sáng màu đội (xanh/đỏ) trong rãnh gờ đai hai mặt + gờ mũ mặt ngoài.
- Cột vuông lớn ở hai đầu và giữa mỗi cung (đế, thân, đai, mũ, chóp tháp), ngọc màu đội + vạch sáng dọc thân + quầng sáng.
- Hàng gai đá chĩa ra phía rừng dọc chân tường. Va chạm (sim) giữ nguyên các đoạn `baseWall` dày 260.

## Sàn lát chạm khắc kiểu Liên Quân + chuyển tiếp lát → cỏ + tường thành chạm hoa văn
- Sàn đường (`laneTexture`) và sân nhà chính (`corePlazaTexture`) cùng ngôn ngữ chạm khắc: đá xám tím ấm; rãnh cung vắt ngang
  (rãnh sâu + chỉ vàng + hai cặp chỉ khắc + chuỗi hạt vàng), dải sáng/tối xen kẽ, đĩa hoa văn (vạch chia độ, sao 8 cánh viền vàng),
  hoa bốn cánh, khung thoi chỉ đôi lồng thoi + hoa nhỏ; viền mép là dải hoa văn chữ 回 giữa hai chỉ vàng + bó vỉa. Sân nhà chính:
  viền 回 vòng tròn, vành cánh sen, vành chia độ, vành xoáy, sao 12 cánh, đĩa tâm vàng.
- Độ phủ lát theo quãng đường (`ramp`): kín từ nhà chính tới ~700 trước trụ nhà → quanh trụ lẫn ít cỏ → sau đó cỏ là chính, còn lác
  đác phiến lát vỡ (ô 150, chọn theo hash + nhiễu, mép mòn sẫm). Dải lát giờ chạy suốt đường (shader bỏ phần cỏ).
- Lá phong đỏ/cam rụng thành đám trên sân lát (phối màu kiểu Liên Quân).
- Tường thành: vật liệu chạm theo từng tầng mặt cắt (`bwseg`): chân rãnh dọc, khối xây vát cạnh, gờ đai dây thừng, ô phù điêu (trụ áp,
  khung chỉ đôi, thoi khảm vàng + nhuỵ), răng cưa đỡ mũ, gờ mũ hoa văn 回 vàng, mặt đỉnh chỉ vàng hai mép + chuỗi thoi; vàng khảm có
  metalness. Cột: thân đá + đai/viền mũ/núm vàng.

## Nền sân nhà dựng lại bằng PHIẾN ĐÁ NỔI KHỐI 3D (thay texture lát kẻ chỉ)
- Theo ảnh Liên Quân: nền trong sân nhà là các phiến đá nổi (vát cạnh rộng, hai tầng: phiến + mặt nổi thụt vào), khe giữa là cỏ/lá.
- `env/baseFloor.js`: quanh nhà chính: đài tròn + 12 lưỡi xoáy + 5 hàng phiến cong đồng tâm chia khúc (chỉ sáng màu đội giữa 2 hàng);
  đường trong sân nhà: hàng phiến cong vắt ngang (cong ngược chiều xen kẽ) + gờ viền lượn hai mép; quanh trụ nhà thưa dần, sau trụ chỉ
  còn mảnh phiến vỡ lởm chởm lác đác giữa cỏ; quanh chân MỌI trụ: đĩa đế + 7 lưỡi đá xoáy (có sống lưỡi nổi). Phe Xanh ánh lam, Đỏ ánh ấm.
- Vật liệu: đá xám tím, hạt + loang, thành/cạnh vát tối (khối rõ từ trên nhìn xuống), rêu bám thành phiến, bump.
- Bỏ dải lát texture, vòng sân nhà chính phẳng, đá vụn + mảnh lát mép đường, vệt đất dọc đường trong sân nhà (ground `laneDirt: false`).

## Nền sân nhà mềm, có chiều sâu (theo ảnh Liên Quân): nét đá quét cọ chìm trong cỏ
- `baseFloor.js` viết lại: phiến/nét đá THẤP (chân lún dưới đất), vát rộng; tương phản thấp, tông lam xám (Xanh) / xám ấm (Đỏ);
  mép và sườn phiến trộn chính texture cỏ của nền (cùng tỉ lệ, cùng loang) theo độ cao + nhiễu → tan dần vào cỏ, rêu cỏ bò lên sườn;
  ám nhẹ màu cỏ cho hài hoà. Mặt cao/gân sáng hơn sườn.
- Quầng tối mềm (AO) quanh chân mọi phiến: footprints từ baseFloor → `aoPolys` của bản trộn nền (vẽ đặc + viền rộng rồi làm mờ).
- Hoa văn: quanh chân mọi trụ là xoáy 9 NÉT CỌ dài (thon hai đầu, gân nổi giữa) như ảnh trụ phe Xanh; sân nhà chính: đài tròn + 10 nét
  xoáy, ba bậc thềm cong lớn (chỉ sáng màu đội ở bậc giữa), 14 nét cọ bao ngoài; đường trong sân nhà: phiến cong lớn khe hẹp, thưa dần
  quanh trụ nhà, sau đó mảnh vỡ lác đác.

## Họa tiết sân nhà KHẮC CHÌM vào nền (bỏ phiến đá 3D nổi)
- Người chơi: họa tiết Liên Quân khá chìm, không nổi khối. `baseFloor.js` giờ chỉ VẼ bố cục (nét cọ xoáy quanh mọi trụ, bậc thềm cong +
  nét cọ quanh nhà chính, phiến cong trong đường sân nhà → mảnh vỡ) thành texture 2048² phủ cả bản đồ (`basePattern`):
  R mặt đá, G độ cao (mặt + gân, làm mờ), B chỉ sáng màu đội.
- Shader nền (`groundMaterial(baked, pattern)`): mặt đá lam xám dịu pha màu cỏ, phủ ~45–58%, rêu cỏ loang che bớt; viền rãnh tối nhẹ ở mép
  khắc; sáng tối theo hướng nắng như rãnh lõm (gradient G); chỉ sáng màu đội cộng vào emissive. Không còn hình học nổi / quầng AO.

## Họa tiết khắc chìm phức tạp hơn
- Nét cọ có ĐUÔI CUỘN xoắn (`curl`), chỉ viền khắc bên trong + gân giữa; giữa các nét có CHỈ LÔNG CỌ mảnh; quanh chân trụ: 3 vòng chỉ +
  chuỗi hạt; lá xoắn nhỏ ở đầu nét. Nhà chính: tâm nổi + 2 vòng chỉ, 10 gân xoáy có viền + chỉ lông, 3 vòng chỉ + chuỗi hạt quanh đài,
  phiến bậc thềm có chỉ viền trong + thoi khắc giữa phiến, 2 vòng mũi tên giữa các bậc, nét cọ ngoài cuộn xen chiều + chỉ lông.
  Phiến đường: chỉ viền trong + chuỗi 3 thoi khắc + nhuỵ; mảnh vỡ có chỉ viền.
- Texture họa tiết 3072² (mức thấp/vừa 2048²), kênh A = chỉ khắc mảnh (shader nền làm tối theo chỉ), G gồm cả rãnh chỉ.

## Phối cỏ/họa tiết sắc nét hơn; bỏ viền dưới trụ và lá đỏ
- Mép họa tiết sắc (smoothstep theo fwidth quanh ngưỡng 0.5), ngọn cỏ lấn qua mép theo texture cỏ (mép lởm chởm tự nhiên, không nhoè);
  lòng đá ~66% che, bóng mép trong lòng lõm (AO từ hiệu face/height), chỉ khắc, sáng tối theo nắng mạnh hơn; rêu chỉ còn vài mảng nhỏ;
  đường tiếp giáp cỏ/đá tối nhẹ.
- Bỏ các vòng chỉ + chuỗi hạt dưới chân trụ (chỉ còn đế). Bỏ lá phong đỏ/cam/vàng rải trên nền.

## Nền sân nhà: phù điêu thấp kiểu Liên Quân (sắc nét, có khối, phối cỏ xanh lam)
- `basePattern` vẽ: R = mặt đá (làm mờ 2px → shader lấy ngưỡng theo fwidth: mép sắc ở mọi độ phóng), G/B = độ cao 16 bit (mỗi phiến vát
  mép, mặt phẳng; phiến xếp lớp cao thấp, làm mờ 4px), A = rãnh khắc. Bỏ kênh chỉ sáng màu đội.
- Shader nền: pháp tuyến từ độ cao (HS 200) → đá tô theo độ dốc ↔ hướng đèn chính (tối/trung/sáng), bóng đổ mềm (so độ cao phía đèn) và
  AO (so độ cao mip mờ) đè lên cả cỏ quanh phiến; rãnh khắc tối; vài mảng rêu. Đá lam xám nhạt (Xanh) / xám tím ấm (Đỏ). Không vẽ
  dưới lòng sông.
- Cỏ trong sân nhà (cách nhà chính < ~6000) chuyển dần sang xanh lam ngả xám như ảnh Liên Quân.
- Bố cục: sân đá liền quanh nhà chính + 4 vòng bậc thềm cong chia khúc (có rãnh), đài 2 tầng + xoáy khắc, 16 nét cọ bao ngoài; quanh
  mỗi trụ: đế 2 bậc + 6 cánh chính (có gân) + 6 cánh phụ lớp dưới; đường trong sân nhà: sân đá liền + phiến cong (gần trụ nhà thưa,
  lộ cỏ), sau đó nét đá thon dọc mép thưa dần.

## Nền sân nhà chìm, tông mờ; bỏ xoáy dưới trụ
- Người chơi: phù điêu nổi rõ quá xấu → giảm hẳn: HS 90, đá xám lam/xám tím rất gần tông nền (ám 18% màu nền), sáng tối hẹp, phủ 82%;
  bóng đổ/AO lên cỏ nhẹ; rãnh khắc mờ.
- Bỏ toàn bộ xoáy cánh phiến dưới chân trụ; bỏ vòng đất mòn dưới chân trụ (bản trộn nền). Sân đá dọc đường trong sân nhà thon dần
  ở đầu cuối (không cắt vuông).

## Tường biên rìa map làm lại; cỏ trả về màu cũ; quanh trụ 1 không lát đá
- `buildBorderWall`: bỏ dãy hộp đá ốp rêu. Các đoạn biên được nối thành đường liền (khớp miter, gãy > 50° tách đoạn), dựng cùng kiến trúc
  tường thành lãnh địa: mặt cắt nhiều tầng `BW_PROF` + vật liệu chạm theo tầng (thoi, thừng, răng cưa, hoa văn 回, chỉ vàng), dải khảm
  sáng trong gờ đai theo nửa bản đồ (Xanh dưới-trái, Đỏ trên-phải), cột vuông đai/núm vàng + ngọc màu đội mỗi ~1400 và ở mọi đầu/khớp.
- Cỏ: bỏ phần chuyển cỏ sân nhà sang xanh lam (người chơi thích cỏ xanh trước đó); mép cỏ/đá gọn hơn (giảm ngọn cỏ lấn mép), đá bớt ám
  màu nền.
- Theo góp ý "ngay trụ 1 không cần đá, chỉ cần bệ tường ngang": sân đá dọc đường dừng ~760 trước trụ nhà (thon dần), bỏ phiến cong quanh
  trụ nhà và nét đá dọc mép đường phía sau. Thêm viền chỉ khắc đôi theo mép sân đá (quanh nhà chính + hai mép sân đá dọc đường).

## Tường biên rìa map: bỏ tường xây, thay bằng gờ đá tự nhiên lượn mềm
- Người chơi chê tường xây chạm khắc ở rìa. `buildBorderWall` giờ là hai lớp gờ đá bo tròn gồ ghề (lớp trên cao hơn, lùi ra phía ngoài sân,
  phía ngoài xác định bằng `outOfBounds`), nhấp nhô theo chiều dài, đầu dải thấp xuống; dùng chung vật liệu đá rừng `ROCK_FACET`
  (vân lớp, rêu, khe nứt), màu đỉnh làm che khuất; vài viên ngọc màu đội nhỏ trên sống gờ.
- Lỗi đã gặp: đầu dải dẹt hẳn (h=0) → tam giác suy biến → pháp tuyến NaN → hậu kỳ lan NaN làm cả khung hình trống. Giữ đầu dải ≥ 30% cao.

## Ngoài viền rìa map: vườn rừng dày thay bãi cỏ trống
- Hàng bụi lá liền sát sau gờ đá biên (phía ngoài xác định bằng `outOfBounds`), xen khóm hoa xanh.
- ~260 cụm trang trí trong vùng ngoài biên: bụi lá, khóm hoa, đá tảng, mảng nền lá mục (bản trộn nền), thêm cây (lá rộng/cao/thông/hoa hồng)
  — mép dưới phía camera chỉ đặt đồ thấp để không che sân.

## Trụ cách đều + map giãn; ngoài tường biên là vực + thung lũng (kiểu Liên Quân)
- `maps.js`: K 2.7 → 3.0 (map 19200²). Trụ đặt theo bảng `TOWER_POS`: mỗi đường 3 trụ CÁCH ĐỀU; hai đường cánh giống hệt nhau
  (nhà cách nhà chính 950 gốc, khoảng 1575, trụ ngoài cách góc sông 700); đường giữa khoảng ~997; phía Đỏ ảnh x↔y. Khoảng tường dọc đường
  (`guard`) nhân theo KS = K/2.7. Thêm `oobShape` (hình học vùng ngoài biên) cho shader. Mọi kiểm thử sim đạt.
- `env/abyss.js`: vùng `outOfBounds(x, z, 420)` là VỰC — nền và sông bỏ (discard, GLSL `abyssAt` cùng công thức với sim); vách đá dựng
  theo mép vực (22 hàng, gờ phân tầng, ngả vào trong, ám tím lam + tối theo chiều sâu), đá + bụi che mép; thung lũng ở −2600 (ảnh canvas
  vẽ một lần: đồng cỏ, rừng, sông uốn, bóng mây; mờ theo khoảng cách); 2 lớp mây mỏng (ảnh nhiễu); THÁC nơi sông chính chảy ra vực.
  Gờ đá biên chừa khe ở lòng sông. Sương chiến trường không phủ vực. Dải đất sau tường: cây nhỏ lác đác, đá, nền lá mục.
- Hiệu năng: thung lũng/mây ban đầu tính nhiễu 3D theo điểm ảnh (rất nặng) → đổi sang ảnh vẽ sẵn / ảnh nhiễu.
- Vòng import: ground → abyss → jungleDecor → grass → trees → ground(SUN) gây TDZ → tách ROCK_GLSL ra `env/rockGlsl.js`.

## Hang mục tiêu lớn trên MŨI ĐÁ ở hai đầu sông, sát mép vực
- `maps.js`: mũi đá tâm (600, 600) gốc, bán kính sân 330 (góc dưới-phải là ảnh qua đường chéo phụ). Cung tường biên góc dừng ở giao điểm
  với vành mũi đá, nối tiếp bằng vành tường bao mũi đá (phía vực), để trống phía trong (nối đường cánh + sông). `outOfBounds` coi lòng mũi
  đá là trong sân (sim, shader `abyssAt`, đường mép vực `abyssEdges` đều phình theo). Long Ngư → (560, 560), Hổ Lôi → (5840, 5840), trên
  trục đối xứng (công bằng hai phe). Tìm đường tới hang thông; vùng vực không tới được. Mọi kiểm thử sim đạt.
- Hang Hổ Lôi (kiểu hang Tà thần trong ảnh): rễ cổ thụ tím xoắn to thon dần (`taperTube`) vươn lên cuộn qua, cụm pha lê tím phát sáng, cột đá
  nhỏ có đèn xanh, khóm hoa xanh tím; phần trang trí cao xoay về phía xa camera để không che hang.
- Tổ Long Ngư ("hang chim" ngoài rìa): ~120 cành cong đan nhiều lớp thành vành tổ, cành chĩa ra, cỏ cài, 3 trứng rồng phát sáng.
- Nứt sáng mặt bệ dịu hơn (×0.55), vòng nứt lan ra nước nhỏ lại.

## So tổng quan với Liên Quân: chế độ chụp `?overview=` + chỉnh tông tổng thể
- `game.js`: `?overview=<hệ số>` đặt camera nhìn toàn bản đồ (nghiêng 52°), ẩn sương chiến trường + HUD, nới sương cảnh — để chụp so sánh.
- Khác biệt chính so với ảnh Liên Quân và cách sửa:
  - cỏ xanh chói, lộ ô lặp → trộn hai tỉ lệ xoay lệch; rừng sẫm ngả lam, giảm bão hoà; đường là cỏ giẫm mòn sáng hơn, mép mềm
    (bản trộn nền vẽ lại cả 3 đường, làm mờ 8); hậu kỳ giảm bão hoà 0.98 → 0.9, bóng ngả lam;
  - đá rừng mảnh như que → bệ đá rừng dày hơn (đá rừng 340 → 520, cung trại 320 → 460, sim + hình), CÂY MỌC TRÊN BỆ ĐÁ (mỗi ~130–200)
    và cây lùi sau bệ đá dọc đường → các mảng rừng đặc; bệ trại quái mờ/ám xanh;
  - sông thẳng như kẻ thước → mặt nước rộng 1.4×, bờ lượn mạnh (vịnh, mũi đất), lòng bùn rộng 1.25×;
  - bụi vuông → khối tròn lượn (siêu elip 2.4 + biên nhiễu).
- Kiểm thử sim đạt (t_map, simtest, t_jungle, t_bot 50 trận không kẹt).

## Bốn hang mục tiêu lớn (như Liên Quân)
- Hai hang lớn ở mép rừng hai bên sông (đối xứng tâm) trở về vị trí cũ: Long Ngư phút 2 (phía Xanh, gần đường Đền), Hổ Lôi phút 8
  (phía Đỏ, gần đường Sông; trước là phút 6). Dựng lại vách đá móng ngựa (7 khối, cao dần về giữa lưng) + bụi quanh lưng hang.
- Hai mục tiêu cuối trận phút 15 trên mũi đá chìa ra vực: Thần Điểu (tổ đan cành, góc đường Đền) — buff đội Lôi Vũ (+20% tốc đánh,
  −10% hồi chiêu, +20 giáp/KP, 150s); Tà Thần (hang tím rễ xoắn + pha lê, góc đường Sông) — buff đội Tà Lực (+60 công, +90 phép,
  −12% sát thương nhận, 150s). Hồi sinh 300s, thưởng vàng/KN cả đội. Model mới: chim thần cánh vỗ, đuôi phượng; ác thần tím sừng
  cong, vuốt pha lê, vòng phù văn. Bản đồ nhỏ: L/H/Đ/T với màu riêng.

## Nâng cấp icon trang bị + kỹ năng (bản tranh vẽ chi tiết)
- Bộ vẽ chung (src/hud/paint.js): nền có chiều sâu (khói xoắn domain-warp sáng quanh nguồn sáng, khói tối dày ra mép, đốm bokeh,
  bụi lấp lánh); mọi vật thể có kết cấu bề mặt (nhiễu mài/mòn), tối mép trong (AO), viền ngược sáng mép dưới-phải theo màu năng
  lượng chủ đạo của icon, viền sáng trên-trái; hậu kỳ tăng tương phản/độ rực + làm nét (unsharp mask) trước khi vẽ khung.
  Bóng/viền vẽ trực tiếp bằng clip + evenodd (không lớp nháp) nên tốc độ sinh icon giữ ~như cũ; làm mờ bằng thu nhỏ–phóng lại
  (không dùng ctx.filter để chạy đúng cả Safari).
- Khung: kỹ năng — vành kim loại vát (conic) + quầng màu chủ đề hắt vào trong; trang bị — viền kim loại vát theo bậc
  (đồng/bạc/vàng), bậc 2–3 có đinh tán góc, bậc 3 thêm hoa văn cuộn góc + đá đỏ đỉnh khung.
- Trang bị (src/hud/itemArt.js): vẽ lại toàn bộ vật thể — lưỡi vát hai mặt + rãnh máu + mũi loá, chuôi chạm khắc, đá quý cắt mài
  gắn ổ (jewel), dây kim loại cuộn (wire), nét khắc chìm (etch), lửa nhiều lớp (lưỡi lửa mờ + sắc + lõi trắng + tàn lửa), giày giáp
  nhìn nghiêng (giáp gối, giáp ống quyển, lá thép mu bàn chân chồng nhau, đĩa mắt cá), giáp ngực có giáp vai, áo choàng viền thêu
  vàng, đèn lồng giấy căng tròn có tua rua... Vật thể vẽ trên lớp riêng rồi thêm quầng sáng màu chủ đề ôm viền.
- Kỹ năng: dùng lại bộ vẽ vật thể của trang bị (búa, ủng, kiếm, lưỡi liềm); vẽ lại Nắm đấm (găng thép nhìn thẳng), Hồi Máu/Hồi
  Phục/Thắp Sáng (đài sen nâng vật thay đôi tay), Mũi Tên Gió, Mưa Tên, Lộn Diều, Rừng Nuốt Bóng, Thu Hoạch, Giải Trói.
- Icon trang bị được vẽ sẵn lúc rảnh (requestIdleCallback) ngay khi vào trận để mở shop lần đầu không khựng.
- Trang xem trước: tools/items.html?s=200&ids=a,b (lọc món), tools/icons.html?s=180.

## Sửa lỗi vận hành + quái rừng làm lại (theo phản hồi chơi thử trên iPhone)
- **Màn hình đen khi dùng chiêu**: vài shader hiệu ứng có `pow()` cơ số âm (khiên, cột sáng) và `atan(0,0)` (xoáy nước, vòng phù văn)
  → GPU di động trả NaN; chỉ một điểm ảnh NaN lọt vào bloom sẽ bị làm mờ lan cả khung → đen lòm. Sửa các shader + chặn NaN/vô cực
  ngay ở bước lọc vùng sáng của bloom và ở bước chỉnh màu cuối (không tốn thêm lượt vẽ). Thêm: rò bộ nhớ GPU (bóng chân, cung lính,
  phụ kiện quái tạo mới mỗi lần sinh) đã dùng chung — máy yếu hết bộ nhớ cũng gây mất đồ hoạ/đen màn.
- **Hồi sinh vẫn nằm**: clip Chết giữ khung cuối với trọng số 1; hồi sinh giờ dừng hẳn mọi clip rồi mới về Idle.
- **Thanh máu trên đầu**: neo cao hơn (372) và gọn hơn (86×8, huy hiệu cấp nhỏ) để tên không bị đầu tướng che.
- **Đi xuyên tường/bệ đá**: vách đá móng ngựa của hang Long Ngư/Hổ Lôi, vòng rễ hang Tà Thần, vòng cành tổ Thần Điểu trước chỉ là hình
  (không có va chạm) → thêm thành tường va chạm dùng chung dữ liệu với phần dựng hình (`lairWallSegs`). Đẩy ra khỏi tường lặp tối đa
  3 lượt (góc hai tảng giao nhau). Lướt/kéo chia bước ≤30 để không xuyên bệ mỏng; bị kéo vào tường thì dừng kéo (trước kẹt mãi).
  Tảng đá phụ quanh bệ thu gọn vào trong vùng va chạm (trước thò ra gấp đôi, nhìn như đi xuyên).
- **Trong bụi**: độ mờ 0.62 (trước 0.35) + sáng nhẹ, vẫn ghi chiều sâu (không lộ mặt trong tối).
- **Tướng to hơn**: hệ số 1.35 khi dựng trong trận (bán kính va chạm giữ nguyên); tốc độ phát clip chạy chia theo tỉ lệ để chân không trượt.
- **Cần di chuyển**: luôn hiện ở góc trái dưới (mờ khi nghỉ), chạm đâu ở nửa trái thì dời tới đó. **Tốc độ chạy** không phụ thuộc độ kéo:
  mô phỏng chuẩn hoá hướng, mọi tướng chạy đúng tốc độ của mình; chỉ kỹ năng/trang bị/bổ trợ thay đổi tốc độ.
- **Quái rừng làm lại** (`tools/modelgen/monsters.mjs` → `assets/monsters/*.glb`): thân liền khối SDF có xương (sói, cóc, tinh linh
  nước, người đá nham thạch, cá chép hoá rồng, hổ thần, chim sấm, tà thần), màu tô theo vùng (lưng sẫm/bụng nhạt, vằn hổ, vảy cá, khe
  dung nham phát sáng, rêu, đốm cóc) + AO khe; shader vẽ thêm sợi lông/da/đá/vảy theo loại chất liệu đỉnh, viền sáng tách nền.
  Hoạt cảnh xoay xương: chạy nước kiệu chéo cặp, đuôi vẫy, há mồm vồ; cóc nhảy, phồng túi cổ; người đá bước nặng, đập hai tay; chim vỗ
  cánh; cá uốn thân chữ S. Model chưa nạp xong thì tạm dùng hình khối cũ. Xem: `tools/monsters.html?game=1`.
- **Lỗi tự tìm thêm**: lúc chết không mua đồ/nâng chiêu được (Liên Quân cho phép) → cho phép; giữ nút Đánh qua lúc hồi sinh; chết
  giữa lúc ngắm thì bỏ ngắm; rời ứng dụng giữa lúc giữ cần thì nhả cần; chuyển tab về không chạy tiếp khi đồ hoạ còn mất; tán cây quanh
  tướng thưa dần (lưới điểm) để không che tướng; nút kỹ năng/bổ trợ chỉ ghi DOM khi giá trị đổi (đỡ giật trên điện thoại); thanh
  máu/mana của mình mảnh, sát mép dưới để không đè cần di chuyển.
- **Màn đen (cả laptop)**: chốt chặn thêm `max/min` trước bloom và ở bước chỉnh màu cuối — trên GPU D3D (ANGLE Windows)/Metal
  `max(NaN, 0)` trả 0 nên vẫn chặn được kể cả khi trình dịch shader bỏ qua `isnan`. Nguồn hay gặp nhất: cột sáng/khiên tính
  `pow(1 − |N·V|, k)` — ở mép vật |N·V| có thể nhỉnh hơn 1 một chút → cơ số âm → NaN (đã kẹp về [0,1]).
- **Lính làm lại** (cùng bộ sinh `monsters.mjs`): lính kiếm (nón lá, giáp vảy, kiếm + khiên tròn), lính cung (khăn đội đầu, cung,
  ống tên), lính đèn lớn (hộ pháp áo tơi rơm vác cột đèn lồng phát sáng), xe đá (4 bánh lăn, cần ném gàu đá, cờ). Màu đội tô bằng
  shader (vùng đỉnh _mat 4/6) nên một model dùng cho cả hai phe. Hoạt cảnh: bước đi tay vung ngược chân, chém kiếm từ trên xuống,
  kéo dây cung, bánh xe lăn + cần ném bật. Cỡ phóng theo tướng.

## Lúc chết + điều khiển góc nhìn (kiểu Liên Quân)
- **Mua đồ lúc chết**: mô phỏng đã cho mua/bán/nâng chiêu khi chết; giao diện giữ nguyên cửa hàng + Mua nhanh, nút giỏ hàng nhấp
  nháy trong lúc chờ hồi sinh để nhắc.
- **Bảng bị hạ** (giữa trên, ngay dưới tỉ số) thay cho dòng chữ to "Hồi sinh sau Xs" giữa màn: vòng đếm ngược (số giây + vòng cạn
  dần) + "Bị hạ bởi" chân dung/tên kẻ hạ (tướng, Trụ, lính, quái; tự hạ thì ghi "Tự hạ gục"). Màn 3D chuyển xám bằng CSS filter
  (không thêm lượt vẽ), HUD vẫn đủ màu.
- **Giữ bản đồ nhỏ**: chạm/rê ngón trên bản đồ nhỏ thì camera tới chỗ đó (khung nhìn trắng trên bản đồ nhỏ đi theo), thả tay trượt
  về tướng. Vẫn chạy bằng ngón khác được.
- **Kéo camera bên phải**: nút mắt ngay trên cụm kỹ năng — kéo về hướng nào camera lệch về hướng đó, tối đa ~1700 ngang/1300 dọc
  (thấy "đoạn sau" ngoài mép màn hình); vuốt vùng trống nửa phải màn hình cũng kéo được (chạm trúng nút thì không). Thả tay về tướng.
  Bóng đổ của mặt trời đi theo chỗ camera nhìn để vùng đang xem vẫn có bóng.
- **Tướng trắng toát (mất màu) trên bản chơi thử**: Emberforge/Mossback/Bamboo Shade dùng ảnh JPEG nhúng trong .glb; GLTFLoader
  tạo URL `blob:` rồi fetch — trang có chính sách bảo mật chặn `blob:` thì texture hỏng. Giờ giải mã thẳng từ bộ đệm bằng
  `createImageBitmap` (plugin trong `assets.js`), lỗi thì quay về cách cũ. Đã tái hiện bằng máy chủ thử có CSP chặn blob:.
- **Lính làm lại lần 2 (kiểu Liên Quân)**: đầu + mũ trụ to (dễ đọc từ camera cao), chân ngắn chắc, giáp ngực sơn màu đội viền vàng
  có huy hiệu, vai giáp hai lớp, váy giáp 5 tấm, áo choàng màu đội, ống tay/ống quyển thép, gối đồng. Lính kiếm: mũ chỏm lông màu đội,
  kiếm lưỡi rộng + khiên diều; lính cung: mũ trùm vải màu đội, cung sừng cong ngược, ống tên; lính đèn lớn: mũ sừng, vai gai, áo tơi
  rơm, chuỳ đèn lồng có nan; xe đá: khung gỗ đóng ván, vách sơn màu đội đinh tán vàng, bánh nan có đai sắt, giá chữ A, gàu đá, đối
  trọng, cờ đuôi én. Phần giáp/vũ khí dựng bằng khối hình học sắc cạnh (không qua SDF) nên rõ nét. Shader thêm 2 loại chất liệu:
  7 = kim loại sáng (phản chiếu môi trường), 8 = vải màu đội; 4 (giáp màu đội) bóng như sơn mài. ~11–14k tam giác/lính.
  Sửa kèm: hàm trọng số của `m.add()` nhận Vector3 (trước viết như blob → NaN, model không hiện).
- **Trụ/tế đàn sắc nét hơn**: mái trụ trước bị phẳng do công thức hất góc lệch pha (góc rơi vào giữa mặt, không trúng đỉnh) → mái
  đình bát giác mép thẳng, sống mái đồng 8 góc có đầu đao cong vút, chuông gió ở góc. Pha lê (trụ + tế đàn) cắt giác 8 mặt có đai,
  flat shading + cạnh viền sáng mảnh, giảm phát sáng/quầng (trước loá trắng dưới bloom). Tế đàn: cột có đế bậc + đai vàng, lan can
  đá đầu tầng chừa lối bậc thang.
- **Vệt vũ khí kéo dài cả màn hình** khi tướng dịch chuyển tức thời (Chớp Bước, hồi sinh, về nhà): vệt nối chỗ cũ → chỗ mới. Đầu vũ
  khí nhảy > 350 trong một khung thì xoá lịch sử vệt.

## Ngắm chiêu, bảng tỉ số, đánh không mục tiêu, Trừng Trị, đường rộng (theo ảnh Liên Quân người chơi gửi)
- **Chỉ báo ngắm** (`render/indicators.js`, vẽ bằng shader theo đơn vị thế giới nên sắc nét): vùng tầm = đĩa xanh trong mờ đậm dần
  ra mép + viền sáng; chiêu bắn thẳng = dải đúng bề ngang đạn sáng dần + mũi tên; chiêu lướt/nhảy (và Chớp Bước) = thân mảnh nở
  thành lưỡi có **ô kim cương** ở chỗ đáp; chiêu vùng tại điểm = vòng mục tiêu có tâm ngắm 4 mũi chụm; quạt sáng dần ra mép.
  Khi kéo nút: vòng ngắm quanh nút + núm; **ô X huỷ** ở góc phải (kéo ngón vào rồi thả để huỷ, thay cho "kéo xa 210px").
- **Tỉ số góc phải trên**: đồng hồ, tỉ số hai đội, K/D/A của mình (mới tính **hỗ trợ**: tướng địch khác gây sát thương trong 10 giây
  cuối). Chạm (hoặc phím Tab) mở **bảng tỉ số**: tab Thông số tướng (K/D/A, vàng kiếm được, 6 ô trang bị của cả hai đội; tổng đội:
  mục tiêu lớn, trụ đã phá, tổng vàng) và tab Thuộc tính tướng (máu, công, phép, giáp, kháng phép hiện tại). Bỏ ô tỉ số giữa trên;
  bảng "Bị hạ bởi" lên sát mép trên. Nút toàn màn hình thành biểu tượng tròn.
- **Đánh thường không mục tiêu**: tướng người chơi bấm đánh khi không có ai trong tầm vẫn vung đòn theo hướng đang nhìn (cận chiến
  trúng địch đầu tiên trong nửa quạt trước mặt; đánh xa bắn đạn thẳng trúng địch đầu tiên). Bot không vung vào khoảng không.
- **Trừng Trị** (thay Thu Hoạch, giữ id `thu_hoach`): sét giáng MỘT mục tiêu gần nhất trong 520, ưu tiên mục tiêu lớn > bùa > quái >
  lính > tướng; quái/lính 700 (+50/cấp) sát thương chuẩn + choáng 1s, tướng 350 + chậm 30%. Không có mục tiêu thì không dùng được
  (không mất hồi chiêu); nút mờ khi không có mục tiêu, loé vàng khi đủ kết liễu quái. Bot có Trừng Trị dùng để cướp/kết liễu quái.
  Sửa kèm: phép cũ không hề gây sát thương lên quái rừng (chỉ lính/tướng).
- **Cân bằng đầu trận**: lính yếu hơn (kiếm 400 HP/15 công, cung 260/22, xe 800/38, lính lớn 1600/70) nhưng tăng 7%/phút (trần
  +125% HP/+140% công); quái nhỏ/bùa giảm ~30% công, ~13% máu, Long Ngư 8000/130, tăng 7%/phút (trần +180%). Model lính to hơn
  (1.6×, lính lớn 1.85×, xe 1.7×), bán kính va chạm theo đó.
- **Trụ + đường**: tầm trụ 950 → 1050; đường rộng 1200 → 1900 (vòng trụ gần vừa khít bề ngang đường, không lố vào rừng). Trụ mỗi
  đường dồn lại cách nhau ~2700 đơn vị: giữa hai trụ chỉ còn khe ~600 không bị bắn. Hai hang Long Ngư/Hổ Lôi lùi vào rừng một chút
  để vách hang không lấn đường. `tools/mapplan.html`: sơ đồ 2D để chỉnh bố cục (đường, tường, trại, vòng trụ).

## Nhịp trận nhanh hơn, nút ăn lính/đẩy trụ, trụ cánh sát sông
- **Tốc chạy**: tướng ×1.15 so với số gốc (giữ chênh lệch riêng từng tướng; vd. đấu sĩ 325 → 374), lính +18% (kiếm/cung 330, xe
  305, lính lớn 340) — bản đồ rộng nên nhịp trận cao hơn.
- **Đánh thường luôn hướng mặt về địch**: trong lúc vung đòn (từ lúc bắt đầu tới lúc đòn chạm) tướng đứng lại và mặt luôn quay về
  mục tiêu, kể cả khi đang kéo cần chạy hướng khác — như Liên Quân; trước đây chạy mà đánh thì tướng vẫn quay theo hướng chạy.
- **Nút Ăn lính / Đẩy trụ** cạnh nút Đánh (dưới-trái và trên-phải, như Liên Quân; phím K / L): ăn lính = đánh lính máu thấp nhất
  trong tầm (rồi tới quái) để kết liễu lấy vàng; đẩy trụ = chỉ đánh trụ/nhà chính đang đánh được trong tầm. Không có mục tiêu đúng
  loại thì không vung. Cụm kỹ năng giãn ra chút để chừa chỗ.
- **Trụ ngoài hai đường cánh sát sông**: đặt đúng chỗ vòng bắn (1050) tiếp xúc mép sông (cách ~20 đơn vị) — sát nhất có thể mà
  không chạm nước (vị trí cũ y=1500 thật ra vòng bắn đã lấn xuống sông ~200). Trụ ngoài giữa cũng tiếp xúc mép sông. Trụ trong/nhà
  chia đều phía sau: khe giữa hai vòng trụ ~1350 ở đường cánh, ~730 ở đường giữa (đổi lại cho trụ ngoài sát sông).

## Moonstream: model hoạ sĩ có texture PBR, tô kiểu PBR; bản trong trận không nén meshopt
- **Model**: file hoạ sĩ gửi, `_pbr_game` dùng trong trận, `_hq` dùng ở sảnh/chọn tướng (`<id>_showcase.glb`, nạp sau bản trong
  trận rồi thay vào). Giảm lưới theo từng vật liệu: trong trận 101k → 31,6k tam giác (texture 1024), sảnh 454k → 114k (texture 2048).
- **Cách tô (`shading` trong `hero.art.json`)**: so sánh toon / PBR / unlit ở sảnh và trong trận. Texture của model là PBR (màu nền
  không vẽ sẵn sáng tối): toon làm váy tối và tóc xám, unlit phẳng như dán giấy, bình bạc như nhựa; PBR + env map giữ khối, mặt sạch,
  nhận cùng nắng với bản đồ. Chọn `pbr` (trong trận giữ viền đen như các tướng khác; sảnh bỏ viền vì viền kẻ vệt trên lọn tóc).
  `unlit` để dành cho model có texture vẽ tay sẵn sáng tối.
- **Không nén meshopt bản trong trận**: giải nén meshopt cần WebAssembly; thử máy chủ có CSP chặn WASM (`script-src` không có
  `'wasm-unsafe-eval'`) thì Moonstream thành khối giữ chỗ. Bản trong trận để không nén (3,0 MB thay vì 2,1 MB); bản sảnh vẫn nén
  (7,8 MB thay vì ~12 MB), không giải nén được thì sảnh dùng bản trong trận.

## Phản hồi chơi thử 06/10: ra chiêu quay mặt, nút huỷ Chớp Bước, 6 kiểu số sát thương, máu tướng, quái yếu đi
- **Nút huỷ cho Chớp Bước**: phép bổ trợ có hướng dùng chung vòng ngắm + ô X huỷ với nút kỹ năng (`src/hud/aimPad.js`): kéo nút
  phép để ngắm, kéo ngón vào ô X góc phải (ô đỏ lên) rồi thả là huỷ, không mất hồi chiêu.
- **Ra chiêu quay mặt về hướng chiêu**: chiêu có hướng/điểm làm tướng quay về hướng chiêu và đứng ra chiêu tới lúc chiêu phát ra
  + 0,25 s (Móc Neo vung 0,2 s → 0,45 s; Đe Trời: suốt lúc bay). Trong lúc đó cần di chuyển không xoay người, đòn đánh thường chờ
  chiêu xong. Lướt (Lướt Đốt, Lộn Diều) không khoá vì tự di chuyển. Hết mốc mà đang giữ cần thì clip ra chiêu nhường dáng chạy ngay
  (trước đây tướng chạy đi ngay, mặt quay theo cần, rồi trượt trong tư thế ra chiêu tới hết clip 0,7 s). Đòn đánh thường cũng vậy.
- **Tướng to hơn**: `HERO_SCALE` 1,35 → 1,5 (chỉ phần hình; bán kính va chạm giữ nguyên). Thanh máu trên đầu cao theo tỉ lệ.
- **Máu tướng +30%** (`HERO_HP_MULT`, máu gốc + máu theo cấp; máu cộng từ đồ/bùa giữ nguyên): ít bị dồn chết trong một combo. Chiêu
  tính theo % máu tối đa của chính tướng (Dậm Áp Suất, khiên Mai Đá của Mossback) mạnh lên tương ứng (test t_combat đã sửa số).
- **Quái rừng yếu đi** (`MONSTER_POWER`): công ×0,7, máu ×0,85 cho mọi quái và mục tiêu lớn; mức tăng theo phút giữ nguyên.
- **Số sát thương 6 kiểu** (`DMG_STYLE` trong `hud.js`): vật lý cam vàng, phép tím lam, chuẩn trắng có quầng sáng. Chí mạng: chữ to
  1,5 lần, nghiêng, nảy mạnh + rung, hình nổ răng cưa phía sau và biểu tượng (vết chém / sao bốn cánh / viên kim cương). Sự kiện
  `damage` mang cờ `crit` (`dealDamage(..., { crit: true })`). Hiện chỉ đòn đánh thường chí mạng được (vật lý); kiểu chí mạng phép
  và chuẩn đã sẵn cho chiêu/đồ sau này, xem trước bằng nút "Số sát thương" ở bảng thử `?debug=1`. Số bay tính theo giây thật
  (trước đây cộng 1/60 mỗi khung: máy 30 FPS thấy số lơ lửng gấp đôi).
- **Sửa kèm**: lệnh chớp mắt (`mats.update`) bị dính vào sau dấu `//` của chú thích nên mặt anime không chớp.
- **Hiệu ứng chìm dưới bệ trại bùa** (Moonstream tung chiêu vào hang bùa): bệ đá lãnh thổ trại quái cao 12, bệ hang mục tiêu lớn
  ~32–40, còn hiệu ứng mặt đất vẽ ở độ cao cố định 4–8 nên bị bệ che. `src/render/env/floor.js` (`floorAt`) cho độ cao mặt nền
  phần nhìn; vòng/vệt/xoáy/cột sáng, hạt sát đất, vòng ngắm chiêu, thanh máu, số bay và chính các đơn vị + bóng chân đặt lên
  trên mặt đó (đơn vị bước lên/xuống bệ êm). Mô phỏng vẫn phẳng.
- **Cảm ứng nhiều ngón (≥ 5)**: trước đây nút kỹ năng chỉ nhớ một ngón (bấm K2 lúc đang ngắm K1 thì K1 mất lượt), nút phép cũng
  vậy; trên iPhone, ngón thứ 2–3 còn bị trình duyệt hiểu là phóng to/cuộn trang và huỷ các chạm đang giữ. Giờ mỗi nút giữ ngón
  riêng, chặn cử chỉ trình duyệt khi có từ 2 ngón (touchstart/touchmove/gesturestart), vòng ngắm dùng chung có "chủ". Đã thử bằng
  sự kiện chạm CDP: cần + giữ nút đánh + ngắm K1 + ngắm Chớp Bước + vuốt camera cùng lúc, thả từng ngón đều đúng.
- **Người chơi tự cộng điểm kỹ năng**: tướng người chơi không tự cộng nữa — đầu trận 1 điểm, nút + (to 34 px, nằm trên nút kỹ
  năng, nhấp nháy) hiện trên K1/K2 để chọn; mỗi lần lên cấp lại hiện + trên các chiêu cộng được (K3 từ cấp 4). Bot vẫn tự cộng.


## Chữ và biểu tượng giao diện
- **Font Be Vietnam Pro** (SIL OFL 1.1, tự lưu ở `assets/fonts/`, 12 tệp woff2 ~220 KB: đậm 500–800 × latin/latin-ext/vietnamese,
  chỉ tải phần chữ cần dùng): thiết kế riêng cho tiếng Việt, dấu rõ ở cỡ nhỏ, số đều nhau (tabular) nên đồng hồ/vàng không nhảy.
  Dùng cho toàn bộ HUD DOM lẫn chữ vẽ trên canvas (thanh máu, tên, số bay, bảng bị hạ, bản đồ nhỏ); không cần mạng ngoài.
- **Biểu tượng** (`src/hud/uiIcons.js`): một bộ SVG nét vàng ánh kim chuyển sắc + viền tối, thay emoji ⚙/⛶ và các icon cũ:
  bánh răng, toàn màn hình, đồng hồ, K/D/A (kiếm chéo, đầu lâu, nắm tay), menu, nút Ăn lính (mũ trụ chỏm đỏ + kiếm) và Đẩy trụ
  (tháp mái đình + pha lê). Nút tròn nền xanh thẫm viền vàng như Liên Quân.
- **Cụm nút giãn ra**: nút Ăn lính/Đẩy trụ lùi xa nút Đánh thêm 7px, K1 dạt trái 16px, K3 lên 14px, K2 lệch ra 6px.

## Hiệu ứng kỹ năng v2 (06/10)
- **Ba lớp cho mỗi đòn trúng**: (1) hiệu ứng trúng theo chủ đề tướng (lửa / nước / lá / gió / trăng / đèn — `hitFx`), (2) lớp
  theo **loại sát thương** (`typeFx`): vật lý = vệt chém cam + mảnh văng, phép = ký tự phép tím lam + sao, chuẩn = mảnh kim cương
  trắng + vòng sáng; **chí mạng** thêm vết chém chữ X lớn + vòng nổ, và rung màn hình nhẹ nếu là đòn của chính mình; (3) hiệu ứng
  riêng từng chiêu (`SKILL_HIT[tướng][K1|K2|K3]`). Cùng một đòn vì thế đọc được cả "ai đánh", "loại gì", "có chí mạng không".
- **Đạn chiêu riêng** (`PROJ`): lưỡi lá tre xoay (Bamboo Shade K1), trăng khuyết bạc (Moonstream K1), mũi tên gió có luồng xoắn
  (Kitewing K1), đèn lồng giấy lắc lư (Lanternward K1); các đạn khác giữ lõi sáng + vệt hạt theo chủ đề.
- **Dấu hiệu ra chiêu** (`castTell`): vũ khí loé + tia sáng tụ vào lúc bắt đầu, loé vòng **trước mặt tướng theo hướng chiêu** đúng
  lúc phát (không đặt ở mũi vũ khí vì lúc vung ngược mũi vũ khí nằm sau lưng). Mỗi tướng có thêm phần riêng lúc ra chiêu (lửa ở
  búa, vết chém chéo, trăng lớn trên đầu, vòng gió + lông vũ, đèn lồng trên tay...).
- **Atlas hạt 4×4 = 16 ô** (thêm trăng, lông vũ, đèn lồng, vòng, vết chém, lưỡi lá, ký tự phép, kim cương).
- **Soát bằng bảng chụp** (K1/K2/K3/chí mạng × 3 khung, cả 6 tướng). Sửa sau khi soát: vệt vũ khí bớt trắng (màu tướng đậm, lõi
  trắng chỉ ở mép đầu), ngưỡng tốc độ hiện vệt nhân theo cỡ tướng; quầng loé to (billboard) cắm xuống đất thành mảng sáng cạnh
  thẳng → phần dư đổ thành vầng sáng nằm trên mặt đất; khiên cầu bao đủ tướng to (bán kính × cỡ tướng) và lòng khiên gần trong
  suốt (trước đây trắng xoá tướng bên trong); Mưa Tên của Kitewing là tên gió mảnh (lõi trắng + vệt xanh + đầu sáng, rơi rồi cắm
  đất) với mật độ theo thời gian (~55 mũi/giây, trước đây theo khung hình nên 60 FPS dày gấp 3 thành những vạch trắng).

## Sảnh: tóc Moonstream, búa Emberforge, cỡ tướng (06/10)
- **Tóc Moonstream "bị cắt ngang"**: lỗi có sẵn trong cả hai file gốc (hq và game) — mái tóc bị cắt đôi theo một mặt phẳng ngang vai: nửa
  trên thuộc vật liệu đầu và khép lại thành "búi" tròn, nửa dưới (các lọn trắng sau lưng) thuộc vật liệu áo với mép trên thẳng. Sửa khi
  nhập (`import_fused.mjs`): `morph` nắn lưới gốc trước khi gắn xương — nửa dưới búi giãn dọc ×1,7 và nở ra phủ mép → một mái tóc dài
  liền tới giữa lưng; `drop` bỏ hẳn các lọn tóc lởm chởm phía dưới (người chơi thấy như "búi tóc thừa"; lưng áo bên dưới vẫn còn lưới,
  không thủng). Thêm `hair`: mọi đỉnh tóc (cả hai vật liệu, trừ mặt/cằm) gắn xương
  CHỈ theo độ cao dọc chuỗi Đầu → Cổ → Ngực → Lưng (cùng một hàm), trước đây phần trên theo đầu với vùng chuyển rất hẹp còn các lọn
  dưới bị gắn cả vào cánh tay → khi cử động gãy ngang và xoè ra.
- **Emberforge "mất búa" ở sảnh**: dáng đứng vác búa trên vai làm đầu búa khuất sau lưng; clip trưng bày giơ búa thẳng lên thì đầu búa
  vượt khỏi mép trên khung. Thêm clip `ShowIdle` (sảnh dùng thay `Idle` nếu có): đứng chống búa xuống đất bên phải; `Showcase` mới:
  nhấc búa đưa ra trước khoe rồi dộng xuống chống lại — búa luôn trong khung.
- **Khung hình sảnh**: tướng chiếm ~52% chiều cao khung (trước ~61%, người chơi thấy to quá) và khung tự lùi xa đủ chứa tầm với cao
  nhất của bàn tay/mũi vũ khí trong clip trưng bày + dáng đứng (tính khi nạp model bằng cách lấy mẫu clip).

- **Số máu quái khi giao chiến** (như Liên Quân, cả quái thường lẫn boss — số của boss to hơn, 16px): quái đang có mục tiêu hoặc vừa bị đánh trong 4 giây hiện số máu hiện tại (trắng viền
  đen) ngay trên thanh máu; tên quái lớn đẩy lên trên số. Thanh máu quái có thêm vệt trắng phần máu vừa mất, rút dần (~45%/giây).

## Vũ khí đứt khúc khi vung (06/10)
- **Emberforge búa vỡ thành 4–5 khúc** khi giơ/bổ: lưới AI là một khối liền, cán búa đi qua vai/cổ/nắm tay nên bị chia thành nhiều
  đoạn nhỏ giữa các vòng đai. Bước dọn ranh giới vũ khí (`splitByLabel`) coi các đoạn nhỏ đó là "đảo vũ khí lẻ loi" và trả về thân →
  chúng gắn theo ngực/cẳng tay, khi vung thì ở lại → cán đứt khúc. Sửa: đoạn vũ khí có thêm phép thử `core` (màu, vd không phải da):
  đỉnh nằm hẳn trong thân vũ khí (≤ r) và qua phép thử là **lõi** — không bước dọn nào được trả về thân; da vai/cổ sát cán (trượt phép
  thử) vẫn được dọn như cũ. Thêm: bước bỏ "tam giác sợi chỉ" (`maxEdge`) không xoá tam giác vũ khí cứng (cả 3 đỉnh cùng gắn một xương).
- **Lanternward** (model sinh bằng code): chiêu cuối và động tác chiến thắng dùng kiểu chung "giơ hai tay" xoay cánh tay ~165° nên gậy đèn
  gắn ở tay phải bị lật ngược — đầu đèn chúc xuống hông, thân gậy xuyên qua đầu. Thêm khung riêng (`LANTERN_UP`, `LANTERN_VICTORY`):
  tay trái giơ cao, tay phải nâng gậy trước mặt và bẻ cổ tay bù để gậy dựng đứng; `anim.mjs` cho phép `style` là mảng khung và `victory` riêng.
- Đã soi bảng tư thế (mọi clip × 5 thời điểm) của cả 6 tướng: Mossback (pháo), Bamboo Shade (2 kiếm), Moonstream (bình), Kitewing (cung)
  không đứt; chỗ "lỗ" ở găng tay Mossback quanh pháo là lưới gốc (găng rỗng ôm pháo), không phải đứt khúc.

## Sảnh và luồng ngoài trận (07/10)
- **Mọi người chơi khác là máy**, kể cả "bạn bè" (danh sách bạn hư cấu để sảnh có sức sống): tên luôn kèm "[Máy]" ở màn tải, bảng tỉ số,
  kết quả. Ghép trận chỉ là hiệu ứng chờ (3–6 giây).
- ~~Rời màn kết quả = tải lại trang~~ → **từ GĐ3 (20/10) rời màn kết quả ngay trong trang** (xem mục GĐ3 cuối tệp); tải lại trang chỉ còn
  là đường dự phòng (dọn lỗi, hoặc sau `END.reloadEvery` = 12 trận trong một lần mở trang), vẫn qua `sessionStorage` `la.next`.
- **Ảnh giao diện dựng sẵn từ model** (`tools/uiart.html` + `tools/uiart/render.cjs`): tranh mở màn, nền phòng chờ, thẻ tướng, chân dung
  20 tướng, ảnh toàn thân nền trong 6 tướng — chụp chân dung bằng WebGL lúc chạy (cách cũ) tốn thời gian và bộ nhớ trên điện thoại.
- **Một ngữ cảnh WebGL ĐANG VẼ tại mỗi lúc**: sân khấu 3D của sảnh / chọn tướng / đội hình dùng chung một renderer, tạm dừng khi bị che,
  giải phóng ở màn tải trận. Từ GĐ3 renderer trận dùng lại cả phiên: giữa hai trận nó được **cất** (khung vẽ 1×1, canvas ẩn, không còn hình
  khối / ảnh trên GPU, chỉ giữ chương trình shader) nên ở sảnh có hai ngữ cảnh nhưng chỉ một ngữ cảnh vẽ.
- **Đơn giản hoá so với 08**: thanh Điểm tích luỹ đầy được dùng ngay trong trận đó (thắng → +1 sao, thua → giữ sao) thay vì để người chơi
  chọn chế độ; Bùa Giữ Sao (MVP thua) tự dùng (không hỏi); chưa có Điểm Hào Quang, Thiên Hà, mùa giải, cấm/chọn. Quà tân thủ 2 bùa;
  nhiệm vụ "Tham gia 3 trận" thưởng thêm 1 bùa.
- Danh hiệu sau trận: MVP, Sát Thần (hạ nhiều nhất — tránh trùng chữ "Sát thủ" của vai trò), Đao Phủ, Máy Cày Vàng, Tường Thành,
  Ánh Sáng, Đồng Đội Vàng, Phá Thành, Bất Tử, Chiến Binh.

## Giao diện ngoài trận v2 (07/10)
- **Ảnh vẽ sẵn thay SVG phẳng** cho biểu tượng sảnh: vẽ canvas lúc chạy (như biểu tượng kỹ năng) tốn thời gian khởi động trên điện thoại;
  29 ảnh webp 256² tổng ~800 KB, nạp trong màn tải đầu game. Các nét nhỏ (quay lại, đóng, cộng, micro, toàn màn) vẫn là SVG.
- **Phông sảnh là ảnh dựng sẵn + canvas trong suốt** thay vì dựng cả quảng trường 3D lúc chạy: một ảnh 1600×740 rẻ hơn nhiều so với
  đài phun + tháp + đèn trong cùng ngữ cảnh WebGL với tướng trưng bày. Canvas nền trong suốt dùng kênh alpha nhân sẵn; vật liệu cộng
  màu (quầng sáng, tia, hạt) chỉ cộng vào RGB, giữ alpha (`keepAlpha` trong `src/showcase/showcase.js`) để ánh sáng cộng lên ảnh phông
  thay vì phủ đục; tấm mây xoáy (đục) của phông splash tắt khi có ảnh phông.
- **Font tiêu đề Barlow Condensed** (SIL OFL 1.1, 700 thường + 800 nghiêng, có dấu tiếng Việt) cho chữ lớn / nút / số; chữ thường vẫn
  Be Vietnam Pro. Chữ vàng kim dùng `background-clip: text` + `drop-shadow`; chừa đệm trên cho dấu chồng (Ễ, Ồ) vì nền chỉ phủ trong hộp chữ.
- **Màn lớn phóng bằng CSS `zoom`** (1,25 / 1,5) thay vì đặt lại mọi kích thước: bố cục được canh cho điện thoại ngang 360–430 px cao.
- Đặt lại `#ui button` thành `:where(#ui) button` (độ ưu tiên thấp) — trước đây nó đè màu / font của lớp `.pn-tabs`, `.seg`… nên tab
  đang chọn không đổi màu.

## Tối ưu FPS trận (07/10)
- **Chia ô cảnh sau khi dựng, không sửa từng bộ dựng**: `chunkStatic` duyệt nhóm cảnh, tách mesh / InstancedMesh trải rộng thành ô
  3 200 đơn vị (theo trọng tâm tam giác / vị trí bản sao), chép nguyên thuộc tính đỉnh — hình ảnh không đổi từng đỉnh, mọi bộ dựng cũ và
  mới đều được hưởng. Chỉ chia khi phủ ≥ 2 ô và trung bình ≥ 1 500 tam giác mỗi ô (mặt đất thưa thì thêm lệnh vẽ không bõ); bỏ qua
  mesh trong suốt / nhiều vật liệu / có xương. Ô 3 200 cân bằng: khung nhìn chạm ~5 ô mỗi khối, lệnh vẽ tổng vẫn giảm.
- **Cắt đơn vị theo khung nhìn ở tầng view, không dựa vào frustumCulled**: khối bao của mesh có xương không theo động tác nên three
  không cắt được; view tự xét cầu quanh chân đơn vị (bán kính đủ trùm thân + bóng nắng xiên + camera trượt một khung, theo khung của lần vẽ
  trước). Lính / quái ngoài khung tách hẳn khỏi cảnh (đỡ cả cập nhật ma trận xương); tướng chỉ ẩn vì hiệu ứng bám xương tay / đầu cần
  vị trí xương đúng kể cả ngoài màn.
- **Giảm lưới offline, không làm LOD lúc chạy**: lính / quái trên màn hình nhỏ, một mức chi tiết là đủ; meshoptimizer khoá ranh giới
  vùng `_MAT` (phát sáng / màu đội / giáp) và mép hở, có sai số theo pháp tuyến + màu. Đặt trong `monsters.mjs` để sinh lại vẫn giữ.
- **Dịch shader trước, đúng biến thể**: có hậu kỳ thì cảnh vẽ vào render target của composer — biến thể shader khác vẽ thẳng ra màn
  (không tone map trong vật liệu, màu tuyến tính); dịch nhầm biến thể thì giữa trận vẫn dịch lại. Vật liệu hiệu ứng mẫu không được huỷ
  (three xoá chương trình đã dịch khi vật liệu cuối cùng dùng nó bị huỷ). Bóng đổ của vật liệu dùng chung `_depthMaterial` phụ thuộc thứ
  tự vẽ (three không đổi chương trình khi chỉ `map` đổi) nên còn 1 biến thể dịch muộn — chấp nhận (shader bóng nhỏ, dịch nhanh).
- **Tắt bóng đổ mà không dịch lại shader**: đổi `shadowMap.enabled` / `castShadow` buộc dịch lại mọi vật liệu (khựng vài giây trên
  iPhone); thay vào đó vẽ bản đồ bóng một lần ở chỗ không có vật nào rồi thôi cập nhật (`autoUpdate = false`).
- **Bộ tự chỉnh chất lượng đo trung vị và đo thử từng bậc**: trung vị bỏ qua khựng lẻ; hạ một bậc mà khung không nhanh hơn ≥ 8% thì
  trả lại (nghẽn CPU hoặc bị khoá 30 khung/giây thì hạ độ phân giải chỉ làm mờ hình), thời gian chờ thử lại tăng gấp đôi.
- **Tối ưu mô phỏng phải giữ kết quả từng bit**: chỉ thêm đường tắt chứng minh được tương đương (ô lưới chứa mọi đoạn tường có thể chạm
  điểm trong ô; không đoạn nào chạm thì vòng đầy đủ cũng không đẩy gì; có đoạn chạm thì chạy vòng đầy đủ như cũ). `hypot(dx, dy) ≥ |dx|`
  nên loại cặp lính xa theo một trục không đổi kết quả. Kiểm bằng `tools/t_determinism.mjs`.


## Cài đặt đồ hoạ + hiệu năng điện thoại (13/10)
- **Luôn vẽ qua hậu kỳ, kể cả khi tắt ánh sáng rực / khử răng cưa**: vật liệu vẽ vào render target (màu tuyến tính, không tone map)
  và vẽ thẳng ra màn là hai biến thể shader khác nhau — chuyển qua lại giữa trận buộc dịch lại cả cảnh (khựng vài giây trên iPhone).
  Tắt bloom chỉ bỏ 5 lượt nhỏ; đổi MSAA chỉ tạo lại render target cảnh. Đổi độ nét = đổi pixel ratio + cỡ render target.
- **Bloom tự viết thay UnrealBloomPass**: 5 tầng mip × (ngang + dọc) + ghép + cộng = 12 lượt; GPU xếp ô trả giá theo số lượt (mỗi lượt
  ghi / đọc cả khung qua bộ nhớ chung) hơn là theo số phép tính. Bốn bán kính σ khớp đường suy giảm của 5 tầng cũ (4 / 14 / 40 / 104 /
  257 điểm ảnh), cùng tổng cường độ (3 × strength × 0,6 mỗi tầng); một lượt ngang ghi hai bán kính vào hai texture (MRT).
- **Nhánh động trong shader nền chỉ đặt nơi kết quả nhân ~0 ở biên nhánh**: đạo hàm ngầm (chọn mip) của `texture2D` trong nhánh không
  đều giữa 4 điểm ảnh một quad là không xác định; các nhánh (đường, lòng sông, mặt đá hoạ tiết) có điều kiện rộng hơn vùng góp màu, nên ở
  biên nhánh phần tính trong nhánh bị nhân với 0 — sai mip (nếu có) không thấy được. Mẫu sắc + mẫu mờ của hoạ tiết lấy ngoài nhánh.
- **Chia nền theo biến thể shader thay vì một shader cho cả sân**: GPU Apple chỉ loại sẵn điểm ảnh bị che (HSR) với shader không
  `discard`; vực chỉ chạm vài phần trăm sân. Biên an toàn theo cạnh tam giác dài nhất (vực) và ~200 texel (hoạ tiết: tầm bóng đổ / AO
  mờ kể cả khi nhìn toàn bản đồ) để biến thể rút gọn luôn cho đúng kết quả của bản đủ; các phần dùng chung đỉnh, chỉ khác chỉ mục.
- **Bộ tự giảm đo trung bình cắt 10% chậm nhất, không đo trung vị; bậc không giúp thì thử bậc dưới**: khoảng cách khung bị lượng tử
  theo nhịp màn hình nên cải thiện từng phần không thấy được tới khi vượt nhịp — hạ thử liên tiếp tới khi nhanh hơn ≥ 8%, không bậc nào
  giúp (nghẽn CPU, khoá 30 FPS) thì trả lại và chờ lâu dần. Trả giá: máy nghẽn CPU thỉnh thoảng thấy hình mờ đi ~10 giây khi thử.
- **Chỉ nhân vật đổ bóng thời gian thực**: bóng cây / đá / tường đã nướng sẵn trên nền (ground.js, kênh B bản đồ trộn); vẽ thêm vào bản
  đồ bóng chỉ nhân đôi bóng và tốn ~40% lệnh vẽ.

## Thông báo hạ gục, tính mạng, cục máu (14/10)
- **Mạng thuộc người gây sát thương cuối trong 10 giây** (như tài liệu 02 §7, trước đây chưa làm đúng): lính / trụ / quái kết liễu vẫn
  tính cho tướng địch đánh gần nhất; hỗ trợ là mọi tướng địch khác đã đánh trong 10 giây (chỉ tính sát thương — người chơi nêu đúng
  luật này). Vàng mạng + chuỗi + chiến công đầu đi theo người được tính mạng. Không ai đánh trong 10 giây: không ai được mạng, chiến công
  đầu vẫn để dành.
- **Tên hạ liên tiếp tiếng Anh (Double … Penta Kill)** theo đúng lời người chơi, thay cho tên tự đặt "Song Sát / Tam Hùng…" trong tài liệu
  07; chuỗi hạ gục dùng tiếng Việt, mức cao nhất "Truyền thuyết" theo lời người chơi. Cửa sổ hạ liên tiếp 10 giây cho mọi bậc.
- **Thông báo vẽ trên canvas HUD, thời gian theo giờ thật** (không theo số khung: bảng cũ cộng 1/60 mỗi khung nên máy 30 FPS hiện lâu
  gấp đôi). Một hàng đợi duy nhất cho hạ tướng + hạ mục tiêu lớn; cái mới tới thì cái đang hiện rút gọn (hạ liên tiếp chen sau ~0,9 giây).
- **Cục máu chỉ phe mình lấy, đầy máu/năng lượng đi qua không mất**: đặt trên đường lùi sau trụ ngoài (tầm trụ che), địch lấy được thì
  thành mồi lặn sâu; đi đường lúc đầy mà mất cục máu thì khó chịu. Hồi ngay (không theo thời gian) cho cảm giác "ăn" rõ ràng.
- **Hồi Máu bị cắt bởi mọi sát thương của tướng địch (kể cả bị khiên đỡ, kể cả sát thương theo thời gian)**; lính / trụ / quái không cắt —
  để vẫn hồi được khi lùi dưới trụ.
- **`world.emit` không cho dữ liệu đè loại sự kiện**: `{ ...data, type, tick }`. Lỗi cũ: `monsterKill` mang `type: 'long_ngu'` nên HUD
  không bao giờ nhận ra.

## Âm thanh + bảng Cài đặt kiểu Liên Quân (14/10)
- **Tự tổng hợp mọi tiếng bằng code thay vì gói âm thanh có sẵn**: môi trường làm việc không tải được kho asset ngoài, và tiếng tự làm thì
  không vướng giấy phép, chỉnh được theo từng tướng (vũ khí, nguyên tố) và độ dài khớp hoạt ảnh. Không có giọng đọc thông báo ("Linh bảo")
  — tổng hợp giọng nói bằng code nghe rất giả; thay bằng nhạc báo ngắn (trống, kèn, chuông) đi cùng bảng thông báo.
- **Một file sprite + vạch đồng bộ** thay vì 79 file: một lần tải / giải mã; độ trễ đầu file của bộ mã MP3 khác nhau giữa trình duyệt
  nên đo vạch 5 ms sau giải mã để bù (lệch 25 ms là tiếng đánh trễ hình rõ rệt).
- **Giải mã bằng OfflineAudioContext, tạo AudioContext ở lần chạm đầu**: có tiếng ngay từ cú chạm đầu tiên mà không cần ngữ cảnh chạy sớm
  (Chrome cảnh báo, iPhone kích hoạt phiên âm thanh khi chưa cần).
- **Không ép phiên âm thanh "playback" trên iPhone** (`navigator.audioSession`): ép thì vẫn kêu khi gạt im lặng nhưng tắt nhạc ứng dụng
  khác đang nghe; giữ mặc định như đa số game (gạt im lặng = không tiếng) và ghi chú trong thẻ Âm thanh.
- **Độ to chuẩn hoá đo trung bình nhân toàn dải × dải loa điện thoại**: chỉ đo toàn dải thì tiếng nhiều trầm bị chỉnh nhỏ trên loa iPhone
  (~−20 dB so với tiếng phép); chỉ đo dải loa thì đeo tai nghe tiếng trầm lại quá to. Kèm làm lại các tiếng va đập có thân 250–1000 Hz.
- **Bảng Cài đặt chỉ có mục chạy thật**: thẻ "Th.lập mạng" của Liên Quân thành "Dữ liệu" (Tiết kiệm dữ liệu: không tải trước model mọi
  tướng ở sảnh); bỏ các mục chỉ có khi chơi mạng. Mặc định giữ đúng cách chơi cũ (Ăn lính + Đẩy trụ hiện sẵn, cần đi theo ngón, camera
  trượt…), trừ "Lựa chọn mục tiêu" mặc định **% máu thấp nhất** như Liên Quân.
- **Cài đặt đồ hoạ để riêng (`la.gfx`), cài đặt khác chung một kho (`la.prefs`)**: đồ hoạ có mức đặt sẵn + tự giảm khi giật đã ổn định;
  kho mới chỉ cần đọc / ghi / nghe thay đổi. Mô phỏng không đọc cài đặt — mục ảnh hưởng luật chơi đi qua lệnh như thao tác.
- **Bụi bờ sông theo cặp đối xứng tâm (x, y) → (6400 − x, 6400 − y)**, không lấy ảnh x↔y như phần lớn bản đồ: bờ đối diện mỗi bụi là
  một hang (Long Ngư / Hổ Lôi) và hai hang đối xứng tâm, nên bụi cũng phải vậy mới công bằng cho hai đội.
- **Cột đá là đoạn tường dài 0** (va chạm tròn, cờ `pillar`): dùng lại va chạm / tầm nhìn / lưới tìm đường của tường, chỉ khác phần dựng
  hình — không thêm loại vật cản mới vào mô phỏng.
- **Bot chỉ tìm đường khi bị kẹt**, không tìm đường cho mọi bước đi: đi thẳng + lách công trình vẫn đúng ở gần như mọi chỗ và rẻ; A* chỉ
  chạy khi muốn đi mà đứng yên ~0,5 giây và tường chắn thật (lưới `world.nav`).

## Tối ưu Safari + tướng nét hơn, bỏ viền (16/10)
- **Bỏ hẳn viền nhân vật trong trận** (viền đen "vỏ đảo" + viền sáng màu đội) thay vì chỉ tắt mặc định: người chơi chê chướng mắt; bản
  cài cũ đã lưu `outline: true`; viền đen tốn thêm một lượt vẽ có xương mỗi tướng. Phe nhận bằng màu thanh máu như Liên Quân.
- **Mức Vừa thêm MSAA 2x thay vì tăng độ phân giải**: mép tướng là chỗ nhìn ra "không nét" rõ nhất; tô thêm điểm ảnh tốn hơn (shader nền
  nhiều lớp texture) còn MSAA trên GPU xếp ô của iPhone khá rẻ; bộ tự giảm tắt MSAA đầu tiên khi máy không kham nổi. Bản lưu cũ đang
  theo mức đặt sẵn thì nhận định nghĩa mới (`la.gfx` có `v: 2`), bản Tuỳ chỉnh giữ nguyên.
- **A* có trọng số + giới hạn ô** (không cần đường ngắn nhất): bot chỉ cần đường vòng hợp lý khi kẹt; trọng số 2 mở ít ô hơn nhiều mà
  đường chỉ dài hơn ~1%; giới hạn 1500 ô để không lần tìm nào quá vài ms.
- **Sương mù bằng DataTexture** thay vì CanvasTexture: Safari vẽ canvas 2D bằng GPU nên mỗi lần nạp canvas thành texture phải đọc ngược.
- **Số bay chỉ cho đòn của mình / vào mình**: giống Liên Quân, đỡ rối mắt và đỡ vẽ chữ (phần nặng nhất của lớp HUD trên Safari).

## Kiểm toán 19/10 — Giai đoạn 0 (sửa lỗi đã đo được)
- **Lính Đèn Lớn** tính MỘT lần lúc tạo đợt (`sim/minions.js` `giantsFor`). Trước đây xét theo từng lô lính ra; ba Lính Kiếm của một đợt ra ở ba tick khác nhau nên mỗi đợt sinh 3 siêu lính/đường (6 khi mất cả 3 nhà). Xe Đá mỗi 2 đợt sau phút 10 ở 5v5 (03 §A5).
- **Vàng thụ động chạy cả lúc chết** (như Liên Quân). Trước đây dừng: 2 trận 5v5 toàn bot mất ~2.400–2.600 vàng mỗi trận, đội đang thua thiệt thêm.
- **Kinh tế 5v5 tách khỏi 1v1** (`data/economy.js` `ECON_5V5`, `econOf(map)`): vàng thụ động 4/s từ 0:20, hồi sinh `6 + 2.5×cấp` (+5s sau phút 15), KN mạng hạ chia đều cho người hạ + người hỗ trợ đứng trong 1200, KN bắt kịp so với cấp trung bình cả trận (03 §A9–A10). **Vàng khởi đầu giữ 800** thay vì 600 của tài liệu: đồ khởi đầu xạ thủ (Dao Nhỏ + Găng Tay Da) giá 650, với 600 sẽ không mua đủ.
- **Hút máu tính mọi sát thương vật lý, hút máu phép tính mọi sát thương phép** (trừ sát thương theo thời gian và phản đòn). Thay quyết định Mốc 4 ("chỉ đòn đánh thường") theo yêu cầu làm giống Liên Quân.
- **Nội tại đồ rừng / hỗ trợ chạy thật** (`ITEM_PASSIVE` trong `data/items.js`; trước chỉ có chỉ số):
  - Nanh Thú Rừng: +30% sát thương lên quái, hồi 30 HP mỗi đòn trúng quái, +30% vàng/KN từ quái cho người kết liễu. Đếm "bãi đã hạ" là số trại mà người mang đồ kết liễu con cuối; đủ 20 bãi thì nâng: tổng +25 Công/Phép, +50% sát thương lên quái.
  - Đèn Đồng Hành: đồng minh kết liễu lính khi người mang đèn đứng trong 800 → người mang đèn nhận vàng bằng giá con lính (người kết liễu vẫn nhận đủ); người mang đèn tự kết liễu lính thì không nhận vàng lính. Nhận đủ 600 vàng từ nội tại → đổi ô đồ thành Đèn Soi Đường.
  - Đèn Soi Đường: hồi máu và khiên cho người khác +15% (cho chính mình không cộng).
- **Huỷ Biến về bằng kỹ năng / phép / Hồi Máu / chết** đi qua `cancelRecall` để phát sự kiện `recallCancel` (trước chỉ gán `recall = null`: tiếng niệm kêu tiếp tới hết).
- **Màn kết quả dừng hẳn vòng vẽ** (`loop.stop()` — huỷ requestAnimationFrame). Trước đây chỉ dừng mô phỏng, cảnh 3D + hậu kỳ vẫn vẽ ~60 khung/giây phía sau lớp kết quả che kín.
- **Deploy tự chạy khi push `main`** (vẫn bấm tay được) và chỉ đẩy `index.html`, `demo.html`, `src/`, `lib/`, `assets/` (trước đẩy cả repo: `tools/modelgen/imports` 26 MB, `docs/`). Xoá `play.html` (bản dựng cho artifact từ Mốc 5, không còn dùng, vẫn mở được ở `/play.html`).
- Biểu tượng ứng dụng (đèn lồng) `assets/ui/app/`: favicon SVG + PNG, `apple-touch-icon` — hết lỗi 404 `favicon.ico`.

## Kiểm toán 19/10 — Giai đoạn 1a + 1b
- **Kiểu chiêu mới nằm ở `sim/skillTypes.js`, tra lúc gọi** (`HANDLERS[type] || EXTRA_HANDLERS[type]`), không trải vào bảng lúc nạp module:
  `skills.js` ↔ `skillTypes.js` nhập vòng nhau, trải lúc nạp sẽ gãy (TDZ) tuỳ thứ tự import.
- **Cơ chế riêng của tướng vẫn chỉ ở file tướng** (hook + `params`), hệ thống không gọi tên tướng nào. Hook được đổi đòn sắp ra qua `cast`
  (`dmgAdd`, `dmgMult`, `extraEffects`) trong `onCast` thay vì thêm cờ riêng cho từng tướng vào `skills.js`.
- **Đổi vài chỗ trong dữ liệu tướng để chạy được thật**: `silenceDash` → `noDash`; Phân Thân Giấy sát thương mỗi phát của phân thân hạ
  còn 18 (+0.22 Công) (2 phân thân bắn mỗi giây trong 4 s — để 40 (+0.5 Công) thì một chiêu thường gây ~900); Nhật Vũ 13 nhát hạ còn
  18 (+0.18 Công) mỗi nhát (vẫn ~1.300 ở cấp 3); Chân Lý Duy Nhất là đạn khoá mục tiêu (`targeted`) thay vì lao vào (tướng xạ thủ);
  Đá Lộn Ngược = +80 sát thương + choáng 0,5 s (mô tả cũ "140 sát thương"); Cánh Sếu "+50% tốc ra chiêu" = hồi chiêu trôi nhanh hơn 50%.
- **Bùa rơi sang người hạ chỉ là bùa cá nhân** (xanh / đỏ — `to: 'killer'`); bùa cả đội (Uy Hổ, Lôi Vũ, Tà Lực) không rơi.
- **1v1 có luật cuối trận riêng** (`DUEL.waves.giantFrom`, `DUEL.suddenDeath`); 5v5 không có — ở 5v5 đã có Lính Đèn Lớn khi mất trụ nhà và mục
  tiêu lớn cuối trận.
- **Phân thân là entity `kind: 'clone'`** (`noTarget`, không thanh máu) để dùng lại đường vẽ tướng (`unitView` nạp model theo `heroId`); sát
  thương tính cho chủ; tan khi chủ chết / hết giờ.

## Khoá 4 model cao cấp (19/10)
- **Hoả Rèn, Thạch Quy, Bóng Tre, Nguyệt Hạ dùng model hoạ sĩ có texture do chủ dự án gửi** (`tools/modelgen/imports/hammer_pbr_20000.glb`, `diver_pbr_20000.glb`, `ronin_pbr_100000.glb`, `moonstream_pbr_*.glb`). Chủ dự án chốt: *không thay đổi model của 4 tướng này*.
- Khoá bằng mã băm: `tools/premium.lock.json` (35 file: GLB, `hero.art.json`, file gốc, animation viết tay, ảnh thẻ / toàn thân / mặt), kiểm bằng `node tools/t_premium.mjs`. Danh sách tướng nằm ở `tools/premium.mjs`, dùng chung cho test và công cụ.
- `tools/modelgen/build.mjs` và `tools/uiart/render.cjs` bỏ qua 4 tướng này kể cả khi chạy "dựng tất cả"; chỉ `FORCE_PREMIUM=1` (khi chính chủ dự án gửi bản mới, rồi chạy `node tools/t_premium.mjs --lock`).
- Đã soát lại hai đợt sửa Giai đoạn 0 / 1: không file nào trong 35 file bị đụng tới (ảnh thẻ mới chỉ thêm cho 14 tướng kia).

## GĐ1c — bot 5v5 có não đội (20/10)
- **Não đội là gợi ý, không phải điều khiển cứng** (`ai/teamBrain.js`): một lượt mỗi giây cho mỗi đội, giao lệnh `defend / boss / push`
  cho bot rảnh; `laneBot.js` chỉ làm theo khi đang LANE (rảnh). Tất định (không rng). Người chơi không nhận lệnh.
- **Hai hang mục tiêu lớn lên đúng trục sông y = x** (03 §A7 "trung lập, trên trục sông"): Long Ngư (1725, 1725) gần đường Đền, Hổ Lôi
  (4675, 4675) gần đường Sông, lưng hang quay về mũi đá cuối sông. *Lý do đo được*: 64 trận toàn bot cùng đội hình đổi bên — Xanh thắng
  **65%** vì hang Long Ngư (phút 2, thưởng vàng + kinh nghiệm cả đội) nằm sát rừng Xanh; bỏ Long Ngư → 50%, dời lên trục → 47–54%. Bốn bụi
  bờ sông đối xứng qua cả hai trục (một khai báo, ba ảnh).
- **Thần Điểu / Tà Thần mọc phút 12** (cũ 15) — đúng nhịp 03 §A9 và kéo trận về 12–18 phút.
- **Gom đội đẩy đường từ phút 10** khi không thua người và máu trung bình > 65% (`BRAIN.push.groupFrom/groupHp`). Thử thêm "giảm 20% máu
  công trình" chỉ làm trận còn 18,9 phút và lệch Xanh 63% nên **không dùng**.
- **Kết quả chốt** (`node tools/t_arena_batch.mjs 50 normal`): 50/50 trận kết thúc, **trung vị 15,9 phút** (trước GĐ1c 22,6), **Xanh thắng
  54%**, mục tiêu lớn bị hạ **3,6 lần / trận**, 17 mạng / trận, 0 lỗi. Đổi bên cùng đội hình (64 trận): Xanh 52%, trung vị 15,9 phút.
  Cả ba tiêu chí của lộ trình (12–18 phút, 45–55%, ≥ 2 mục tiêu lớn) đạt.

## GĐ2 — Khoá mục tiêu, Áp chế, Không thể cản, đồ kích hoạt mới (nhánh gd2-trongtran)
- **Áp chế (`suppress`) là một SỢI XÍCH, không chỉ là trạng thái** (`sim/suppress.js`, `world.suppressions`). Sợi xích giữ trạng thái
  `suppress` trên mục tiêu (thời lượng + `COMBAT_EXTRA.suppress.pad` 0,2s để không bao giờ hết trước xích; xích tự gỡ) và — mặc định
  `channel` — giữ luôn người gây đứng niệm (`e.channel`, `castUntil`). Không giảm bởi kháng hiệu ứng (cố ý không có trong `TENACITY`), không
  nằm trong hai danh sách giải khống chế (Giải Trói / Châm Cứu không gỡ), bị chặn bởi miễn khống chế và Sương Đông. Mã sợi xích dùng
  `world.supSeq` (không dùng `world.nextId` để không xê dịch id đơn vị của các kịch bản cũ).
- **Xích chỉ đứt khi**: hết giờ (ok = true → hiệu ứng `atEnd` của chiêu), người gây / mục tiêu chết, mục tiêu không còn mang trạng thái,
  kéo giãn quá `breakRange` (mặc định 115% tầm chiêu; Xích Giữ 650), và — khi niệm — người gây bị câm lặng (gồm mọi khống chế cứng, kể cả
  bị áp chế / Sương Đông), bị khiêu khích, hoặc bị cắt chiêu (đếm `interrupts`). Kiểm hết giờ trước mỗi tick.
- **Người niệm giữ**: không đi, không đánh thường (`castUntil`), không tung chiêu (`castSkill` → `channel`); được dùng phép / đồ / Biến về
  nhưng làm vậy là thả xích trước (`cancelChannel`, ok = false). Hồi Máu được dùng, không thả xích. **Không phát sự kiện `cast` / không có
  hoạt cảnh** cho lúc niệm — để không đụng đường hoạt cảnh (và 4 model cao cấp); người niệm chỉ đứng yên trong lúc xích vẽ.
- **Một cửa chặn duy nhất cho người bị khoá** (`commands.js`): bị áp chế hoặc Sương Đông thì `cast`, `spell`, `restore`, `useItem`, `recall`
  đều bị từ chối (castFail `suppressed`) — thay cho các chỗ hở rải rác cũ (Giải Trói dùng được khi bị khống chế cứng, đồ không kiểm khống chế,
  Hồi Máu không kiểm). Lúc bắt đầu áp chế mục tiêu bị cắt chiêu (mất lượt vung, dừng lướt, huỷ Biến về).
- **Tướng dùng áp chế: Bóng Đèn** (Nghệ Nhân Rối Bóng — "trói cổ rồi choáng" khớp nhất). K2 Trói Bóng: trói 2s → áp chế 1,25s (niệm),
  choáng cuối 0,8s giữ nguyên, hồi chiêu [12..9,5] → [13..10,5] vì tổng khoá cứng tăng từ 0,8s lên 2,05s nhưng người gây cũng bị giữ chân.
  Sát thương / mana / tầm không đổi; chỉ đổi dữ liệu `bong_den.js`. Loại: Trạng Nhí K3 (bộ chiêu là sát thương chuẩn), Lưỡng Cực K3 (vùng
  câm lặng + chậm, không phải niệm).
- **Hai đường vào áp chế từ chiêu** (`skill.suppress: { duration?, channel?, breakRange? }`): type `tether` — cả sợi dây là một lần áp chế
  (sợi xích chạy cả nhịp sát thương chia đều lẫn hiệu ứng cuối; không áp được vì miễn khống chế / Sương Đông thì quay về dây trói thường);
  type khác — `skillHit` áp chế một lần mỗi lượt tung lên tướng trúng đầu tiên.
- **Không thể cản (`unstoppable: giây`)**: `castSkill` áp `ccImmune` id `unstoppable` ngay sau khi trả mana (trước lúc vung), phát sự kiện
  `unstoppable`; chiêu lướt thì cửa sổ hết đúng lúc cú lướt dừng (`endDash`). Dữ liệu: Bà Năm K3 Dép Bay 0,5s (≈ thời gian lao), Kiếm Thuỷ K3
  Nhật Vũ 0,35s (13 nhát chém sau đó vốn đã không thể bị chọn). Không đụng dữ liệu 4 tướng cao cấp.
- **Miễn khống chế giờ chặn cả dời chỗ / cắt chiêu** trên toàn engine: `applyInstant` bỏ qua đẩy / hút / cắt chiêu của địch lên người miễn
  khống chế, `forceMove` không dời người miễn khống chế — nên Giải Trói và cú bay của Mèo cũng chống được đẩy / hút (chủ ý).
- **Khoá mục tiêu**: lệnh chiêu `aim: 'target'` có thể mang `id`. `pickSkillTarget` dùng `world.byId(aim.id)` nếu qua đúng bộ lọc cũ (địch,
  không phải công trình, chọn được, thấy được, `heroOnly`, tầm tính bán kính, `canTarget`), không thì chấm điểm như cũ (không bất ngờ báo
  "không có mục tiêu"). HUD gửi id mục tiêu đang khoá khi chạm nhanh, id tướng đang xem trước khi kéo; bot gửi id nó đã chọn — mọi dữ liệu
  vào mô phỏng qua lệnh, vẫn tất định.
- **Đạn khoá mục tiêu của chiêu trượt** (onEnd → `onSkillMiss`) nếu mục tiêu thành không thể chọn / Sương Đông giữa đường; đạn đánh thường giữ
  như cũ. **Sương Đông chặn mọi hiệu ứng của địch** (`applyStatus` trả null khi mục tiêu đang stasis và nguồn là địch) — kể cả dấu / tầng như
  Manh Mối (chủ ý: bất tử là không bị đụng tới).
- **Bị trói không tung được chiêu lướt** (04 §3; `castSkill` → `rooted`; bot bỏ qua chiêu lướt khi bị trói để khỏi bấm hỏng liên tục). Luật
  chống khoá chết của 04 §3 (> 3s khống chế cứng → 50% trong 2s) **vẫn chưa làm** (ngoài phạm vi).
- **Đồ kích hoạt**: tối đa 2 món mỗi túi (`ACTIVE_MAX`, `planBuy` → `active`) nên HUD có tối đa 2 nút. Hồi chiêu không giảm bởi giảm hồi
  chiêu (như cũ), chỉ tính khi kích hoạt thành công (không có mục tiêu / mục tiêu miễn khống chế → castFail, không mất hồi). Dùng thành công
  thì huỷ Biến về. Bị khống chế cứng thì không dùng được (`cc`) trừ món `inCC` (chỉ Bình Sương Đông — giữ hành vi cũ); bị áp chế / Sương Đông
  thì chặn ở cửa lệnh. Mỗi loại kích hoạt một hàm trong `sim/itemActives.js` theo `active.id` — hệ thống không gọi tên món nào.
- **Ba món mới (tên riêng, không lấy từ game thương mại)**:
  - **Xích Đồng** (`xich_dong`, Phòng thủ, 2300 = Túi Hạt + Áo Lụa + Áo Da + 1400; +450 HP, +30 Giáp, +30 KP) — *Xích Giữ*: khoá mục tiêu,
    áp chế 1,25s tướng địch chỉ định (không thì gần nhất tính bán kính, thấy được, chọn được, không miễn khống chế; hình nộm cũng được) trong
    450, đứt quá 650, hồi 80s. Người dùng niệm giữ; bị câm lặng thì không dùng được.
  - **Lọng Hộ Mệnh** (`long_ho_menh`, Phòng thủ, 2200 = Hạt Nắng + Áo Da + 1500; +300 HP, +30 Giáp, +10% GHC) — *Lọng Che*: khiên 80
    (+12 mỗi cấp tướng) + 5% HP tối đa người dùng trong 2,5s cho mình và tướng đồng minh trong 600, hồi 70s. Khiên id `ward_<người dùng>`
    (dùng lại thì làm mới, hai người dùng thì cộng); Đèn Soi Đường +15% áp qua `addShield`. Chọn "Lọng" (lọng che nghi lễ) thay cho
    "Đèn Hộ Mệnh" được gợi ý vì cửa hàng đã có Đèn Đồng Hành, Đèn Soi Đường, Đèn Hồn Lam, Giáp Đèn Lồng.
  - **Dải Lụa Gió** (`dai_lua_gio`, Tấn công, 2200 = Găng Tay Da + Kiếm Sắt + 1650; +40 Công, +20% TĐ, +5% tốc chạy) — *Lụa Gió*: lướt
    thật 320 (tốc 1700, dừng ở tường / khi bị khống chế cứng) theo hướng kéo, không thì hướng đang chạy, không thì hướng nhìn (như Chớp Bước),
    +25% tốc chạy 1,5s, hồi 45s. Bị trói / khống chế cứng → `cc`, trong kết giới → `noDash`, đang lướt → `busy`.
  - Bình Sương Đông thêm `aim: 'none', inCC: true` (hành vi không đổi). Danh mục 53 → 56 món.
- **Bot mua món mới qua `recommendedBuild`** (chỉ tướng không cao cấp): Phù Đổng Ngọc Bình An → Xích Đồng; Mèo Thần Tài Ngọc Bình An → Lọng
  Hộ Mệnh; Long Đăng Khiên Đá → Lọng Hộ Mệnh; Nhãn Sư Áo Giáp Nhẹ → Dải Lụa Gió. Mọi build vẫn ≤ 2 món kích hoạt, ≥ 5 món hợp lệ.
- **Luật bot dùng đồ** (số ở `data/ai.js BOT.items`, Sương Đông vẫn `BOT.itemHp` 0,25): xem 06 §4.7. Đang niệm giữ xích thì bot chỉ được dùng
  Sương Đông và bỏ phần còn lại của lượt nghĩ (giữ xích). Bot 5v5 ưu tiên đánh kẻ đang bị áp chế (−500 điểm) và kẻ đang niệm giữ xích (−300).
- **Chữ / hình / tiếng**: chữ trên đầu `ÁP CHẾ` (#d8a0ff, ưu tiên nhất) và `KHÔNG THỂ CẢN` (#ffcf6a, chỉ khi không có chữ khống chế); chữ nổi
  lý do castFail của chính mình (6 lý do); cửa hàng lý do `active`. Phím E = nút đồ 1, Q = nút đồ 2. Hiệu ứng chỉ dùng hình có sẵn (xích, vòng
  ký tự, vòng, kén, cột sáng — không shader mới) ở `render/vfx/extra.js` (không đụng `library.js` 493 dòng), tiếng chỉ dùng id có sẵn trong
  sprite (`stun`, `hit_armor`, `restore_break`, `haste`, `shield`, `dash`) — không dựng lại `assets/audio`. Icon 3 món mới dùng hình vẽ SVG dự
  phòng của `icons.js` theo loại kích hoạt (xích, lọng, cánh) — không thêm vào `itemArt.js` (đã 643 dòng).
- **Nút đồ thứ hai xếp TRÊN nút thứ nhất** (`position: absolute` trong `#extras`) thay vì nối dài hàng nút đáy: ở 844×390 hàng đáy đã sát cụm
  kỹ năng và thanh máu vẽ trên canvas.
- **Nút phép / đồ có hướng: giữ hơi lâu rồi mới kéo vẫn ngắm được** (`spellButtons.js`): trước đây giữ quá 0,35s là nút khoá vào chế độ "xem
  mô tả" và kéo sau đó bị bỏ qua (thả ra không dùng). Giờ kéo quá ngưỡng thì tắt mô tả và ngắm — giống nút kỹ năng. Lộ ra khi đo Lụa Gió trên
  máy kiểm thử không GPU (mỗi khung vài giây nên đồng hồ 0,35s luôn chạy trước lượt kéo đầu).
- **Cân bằng Bóng Đèn sau khi đổi K2 sang áp chế** (bot thường vs bot thường, 1v1, 6 đối thủ × 4 seed, đổi phe xen kẽ): thắng 1/24 → 5/24.
  Tướng vẫn yếu ở 1v1 bot (bộ chiêu dựa vào đồng đội); không chỉnh thêm số.

## GĐ2 — Khoá mục tiêu, Áp chế, Không thể cản, đồ kích hoạt mới
- **Áp chế (`suppress`) là một liên kết**, không chỉ là trạng thái: `sim/suppress.js` giữ `world.suppressions`. Mục tiêu mang trạng thái
  `suppress` (sống lâu hơn liên kết 0,2 s để không hết trước), người gây thường **niệm giữ** (`e.channel`). Áp chế **không bị kháng hiệu
  ứng rút ngắn, Giải Trói không gỡ**; chỉ hết khi: hết giờ, một trong hai chết, mục tiêu mất trạng thái, kéo giãn quá xa (tầm chiêu × 1,15;
  đồ: 650), hoặc người niệm bị câm / khống chế cứng / khiêu khích / cắt chiêu.
- Người đang niệm: không đi, không đánh, không tung chiêu; dùng phép / đồ / Biến về thì **thôi niệm** trước; Hồi Máu được dùng và không cắt.
- Người bị áp chế (hoặc đang Sương Đông): lệnh `cast/spell/restore/useItem/recall` bị chặn ở **một cửa** (`applyCommand`, lý do `suppressed`).
- **Không thể cản** = tham số chiêu `unstoppable: giây`: lúc tung chiêu người gây nhận `ccImmune` (id `unstoppable`), hết khi cú lướt kết thúc.
  `ccImmune` chặn cả hiệu ứng tức thời của địch (đẩy, hút, cắt chiêu). Gắn cho Bà Năm K3 (0,5 s) và Kiếm Thuỷ K3 (0,35 s).
- **Bóng Đèn K2 Trói Bóng** dùng áp chế 1,25 s (thay trói 2 s) rồi choáng 0,8 s; hồi chiêu +1 s vì tổng thời gian khống chế cứng dài hơn.
  Không đụng dữ liệu 4 tướng có model cao cấp.
- Chiêu khoá mục tiêu: lệnh tung có thể mang `aim.id`; còn hợp lệ (địch, nhìn thấy, chọn được, trong tầm) thì nhắm đúng tướng đó, không thì
  chọn như cũ. Đạn chiêu bám mục tiêu trượt khi mục tiêu thành không chọn được giữa đường. Đang bị trói thì không lướt được (04 §3).
- **Tối đa 2 món có kích hoạt** mỗi người (`ACTIVE_MAX`), HUD có 2 nút đồ. Hồi chiêu đồ không giảm theo giảm hồi chiêu và chỉ tính khi
  kích hoạt thành công (không có mục tiêu → không mất hồi chiêu).
- Đồ mới (tên gốc): **Xích Đồng** (áp chế tướng địch gần nhất trong 450 trong 1,25 s, hồi 80 s), **Lọng Hộ Mệnh** (khiên cho đồng minh
  trong 600, hồi 70 s — không gọi "Đèn Hộ Mệnh" vì cửa hàng đã có 4 món tên Đèn), **Dải Lụa Gió** (lướt 320 + tăng tốc chạy, hồi 45 s).
  Bot mua qua `recommendedBuild` của Phù Đổng, Mèo Thần Tài, Long Đăng, Nhãn Sư; quy tắc dùng ở `data/ai.js` `BOT.items`.
- Chưa làm: luật chống khống chế liên tiếp (> 3 s khống chế cứng → 50% trong 2 s, 04 §3).

## GĐ2 — Tín hiệu, mua nhanh 2 món, thanh khống chế, Quét Sạch
- **Tín hiệu là lệnh của mô phỏng** (`{ type: 'ping', kind, x, y, target? }`, `sim/pings.js`), người chơi và bot dùng chung — bot đồng đội
  đọc `world.pings` nên vẫn tất định. 4 loại (tên gốc): Tấn công, Tập hợp, Rút lui, Cẩn thận (mất dấu địch). Chỉ có ở 5v5. Lúc chết vẫn
  ra tín hiệu được. Giới hạn: tối đa 3 tín hiệu / 6 s, cách nhau ≥ 0,6 s; mỗi đội tối đa 8 tín hiệu sống. Số ở `data/signals.js`.
- Tấn công chỉ bám mục tiêu khi đội mình đang thấy nó (không lộ thông tin trong sương mù); lính không đánh dấu được.
- **Bot làm theo tín hiệu của người chơi, bỏ qua tín hiệu của bot**: Tấn công → tối đa 3 bot gần nhất (trong 7000, máu ≥ 50%), Tập hợp →
  tối đa 4 bot (trong 8000, máu ≥ 40%); Rút lui mới hơn gần đó (2500) huỷ hai loại này; Rút lui làm bot trong 1800 lùi (trừ khi hạ được
  ngay); Cẩn thận làm bot cùng đường / trong 4000 đứng lùi 700, không đẩy trụ, không trao đổi chiêu, chỉ đánh khi chắc thắng.
  Lần đầu có bot nhận, dòng chữ báo "Đang tới!" / "Tới ngay!".
- **Bot cũng ra tín hiệu** (Tập hợp khi não đội gọi đánh mục tiêu lớn, Tấn công khi đổi đường dồn) — chỉ khi đội có người chơi, tối đa mỗi 25 s,
  nên trận toàn bot không đổi.
- Âm thanh tín hiệu dùng lại tiếng có sẵn (không dựng lại bộ âm thanh). Màn tín hiệu: nút cờ cạnh bản đồ nhỏ → 4 lựa chọn; chạm bản đồ nhỏ
  hoặc mặt đất để đặt; chạm lại lựa chọn đang chọn = tín hiệu tại chỗ mình; chạm đúp bản đồ nhỏ = tín hiệu nhanh; máy tính G + Z/X/C/V.
- **Mua nhanh 2 món**: món thứ hai là món tiếp theo trong bộ đồ đề cử (giá tính trên túi đồ thật); màn thấp (< 560 px) món thứ hai chỉ hiện
  biểu tượng + giá. Bot vẫn chỉ đọc món đầu.
- **Thanh khống chế**: mỗi hiệu ứng ghi lúc áp (`t0`); trên đầu tướng hiện loại khống chế cứng mạnh nhất (áp chế > hất tung > choáng >
  khiêu khích > trói > câm lặng) kèm dải thời gian rút dần; tướng mình có thêm ô "CHOÁNG 1,2s" dưới chân.
- **Quét Sạch** do mô phỏng phát (`sim/match.js` `checkAce`): cả đội (≥ 2 tướng) cùng nằm, báo đúng một lần mỗi lần bị hạ hết; chỉ 5v5.

## GĐ2 — chọn vị trí + cấm/chọn (20/10)
- **Vị trí = 5 ô của mô phỏng** (`temple`, `mid`, `river`, `jungle`, `support` — `data/roles.js`, trùng `SLOTS` trong `sim/lineup.js`) cộng
  `fill` (Tuỳ ý) chỉ có ở giao diện. Tên hiện: Đường Đền / Đường Giữa / Đường Sông / Đi rừng / Trợ thủ / Tuỳ ý (không đặt tên đường theo mục tiêu lớn).
- **Chọn vị trí ở phòng chờ 5v5** (đấu thường + đấu hạng): nút dưới ô của mình mở hộp "Vị trí chính" (5 + Tuỳ ý) và "Vị trí phụ" (không bắt
  buộc; khoá khi chính là Tuỳ ý hoặc trùng chính). Lưu hồ sơ (`rolePri`, `roleSec`). Bấm Bắt đầu khi chưa chọn → mở hộp trước rồi mới tìm.
  1v1 / luyện tập không có vị trí.
- **Chia vị trí lúc tìm thấy trận** (giao diện, `Math.random`): 85% vị trí chính (`ROLE_PRI_ODDS`), còn lại vị trí phụ nếu có; Tuỳ ý = một vị
  trí ngẫu nhiên. Đồng đội nhận 4 vị trí còn lại (xáo), đối thủ một hoán vị đủ 5. Hộp "Đã tìm thấy trận" ghi vị trí. Bạn bè trong phòng là
  máy nên nhận vị trí còn lại như máy.
- **Vị trí vào mô phỏng chỉ như dữ liệu dựng trận**: `startMatch({ playerRole, allyRoles, foeRoles })` → `setupTeams` → `assignSlots(ids,
  fixed)` ghim tướng vào ô trước, ô sai / thiếu thì phân theo đường ưu tiên như cũ → gọi không có vị trí (t_determinism, t_arena_batch,
  `?hero=`) giống từng bit (đã đo băm trước/sau: trùng). Có `playerRole` hợp lệ thì nhận ra người chơi theo **ô**, không theo id tướng
  (đối thủ có thể trùng tướng ở đấu thường). `?role=` trên đường `?hero=&mode=5v5` để thử thẳng.
- **Độ hợp tướng ↔ vị trí** (`ui/roles.js fit`): 2 nếu `lanes` có vị trí đó ("Đề cử"), 1 nếu **lớp chính** (`roles[0]`) nằm trong
  `ROLE_CLASS_FIT` (Đền: đấu sĩ/đỡ đòn, Giữa: pháp sư, Sông: xạ thủ, Rừng: sát thủ/đấu sĩ, Trợ thủ: trợ thủ/đỡ đòn), còn lại 0 — cần vì chỉ 2
  tướng ghi `lanes` đi rừng. Lưới xếp độ hợp giảm dần; máy chọn theo `FIT_WEIGHT [0,5,10]` + nhiễu 0..3.
- **Đấu hạng luôn qua cấm/chọn**, kể cả dưới Hải Đăng (tiêu chí xong của lộ trình yêu cầu Đấu hạng → Cấm/chọn cho mọi người chơi; hồ sơ mới
  là Đèn Dầu). Luật bậc của 07 §7.3 giữ ở **kích thước** thứ tự: dưới Hải Đăng `lite` (2 cấm mỗi bên, 1 pha cấm, chọn rắn 1-2-2-2-2-1, 14
  tướng), từ Hải Đăng `full` đúng 07 §7.3 (3 cấm, 2 pha cấm, 16 tướng ≤ 20). Đấu thường vẫn chọn ẩn (có vị trí).
- **Người chơi luôn ở đội Xanh** (chọn trước — trùng mô phỏng: người chơi là đội 0). Ghế chọn `S.match.seat` ngẫu nhiên 0..4, đè được bằng
  `?seat=N` (kiểm thử). Lượt cấm thứ k của một đội do ghế k làm → người chơi chỉ cấm khi ghế < số lượt cấm (thật, vẫn thấy pha cấm). Muốn ai
  cũng được cấm thì chỉ sửa ánh xạ ghế trong `draftRules.startTurn`.
- **Đấu hạng: mỗi tướng chỉ cấm hoặc chọn một lần cho cả hai đội**; đối thủ chọn hiện ngay ở cột đỏ, vị trí đối thủ chỉ hiện sau khi họ chọn.
  Đấu thường chọn ẩn: chỉ không trùng trong đội, đối thủ có thể trùng tướng đội mình (như trước).
- **Giờ** (`data/draft.js`): cấm 20 s, chọn 30 s (07 §7.3), chuẩn bị **15 s** (07 ghi 20 s cho đổi tướng + bùa; offline đồng đội là máy nên
  không có đổi tướng), nghỉ 0,7 s giữa lượt, máy nghĩ 2–6 s khi cùng lượt với người chơi, 1,2–3,5 s khi chỉ có máy (cả ván lite ~45–60 s).
  Hết giờ: lượt cấm → bỏ lượt (ghi null, báo "Hết giờ: bỏ lượt cấm"); lượt chọn → tướng đang xem nếu còn, không thì tướng hợp vị trí nhất. Có
  nút "Bỏ qua" lượt cấm.
- **Máy cấm** (`draftRules.botBan`, tất định theo rnd): đối thủ xem `heroMain(lịch sử)` — ≥ 5 trận, tướng ≥ 2 trận thắng ≥ 60% → cấm với
  tỉ lệ 50% (06 §6); còn lại bốc theo trọng số `1 + BAN_BIAS[id] + 2` (nếu tướng đúng vị trí đội kia còn thiếu). `BAN_BIAS` để trống
  (điền sau khi đo tỉ lệ thắng). Một đội **không bao giờ cấm** tướng đúng vị trí cuối cùng (≤ `protectMin` 1) của vị trí mình chưa chọn;
  hết lựa chọn thì bỏ lượt. Đồng đội máy không cấm tướng mình đang xem, tướng quen dùng, và **tướng Đề cử cho vị trí của mình** (thêm khi chạy
  thật: máy đồng đội từng cấm mất 1 trong 2 tướng đi rừng Đề cử của người chơi).
- **Máy chọn** (`draftRules.botPick`): điểm `FIT_WEIGHT[độ hợp] + nhiễu − 2` nếu tướng là lựa chọn đúng vị trí cuối cùng của **đồng đội khác**
  chưa chọn. *Khác spec:* spec chỉ phạt khi độ hợp của chính máy < 2; đo được máy Đường Đền vẫn lấy Kiếm Thuỷ (Đền + Rừng) — tướng đi rừng
  cuối cùng của đồng đội — 64/400 lần, nên phạt mọi trường hợp (phạt 2 < khoảng cách giữa hai mức hợp 5 nên chỉ đổi thứ tự trong cùng mức):
  còn 0/400. Máy đồng đội tránh tướng người chơi đang xem tới khi người chơi khoá.
- **Ngẫu nhiên cấm/chọn ở giao diện nhưng có seed**: `mulberry32((seed trận ^ DRAFT.seedSalt) >>> 0)`; máy chọn ở chọn ẩn dùng seed + 1. Node
  dựng lại được từng ván; mô phỏng không đụng tới. Thời điểm máy bấm (2–6 s) dùng `Math.random` (chỉ là nhịp hình).
- **Luật cấm/chọn là module thuần `src/ui/draftRules.js`** (cùng `ui/roles.js`), không đặt ở `src/ai/draftBot.js` như 02 gợi ý: cấm/chọn không
  bao giờ chạy trong mô phỏng, để ở `ai/` dễ kéo theo import mô phỏng.
- **Đi rừng mang sẵn Trừng Trị**: vị trí có `ROLE_SPELL` (đi rừng) thì chọn tướng / cấm chọn chọn sẵn phép đó (báo "Đi rừng: đã mang Trừng
  Trị"); nhớ riêng ở `profile.spellJungle` để trận không đi rừng vẫn giữ `profile.spell`. Đồ khởi đầu người chơi theo vị trí qua
  `starterFor(hero, lane, spellId)` (`data/items.js`): đi rừng (chỉ khi mang Trừng Trị) Nanh Thú Rừng + Túi Hạt, trợ thủ đồ trợ thủ, còn lại
  theo lớp tướng. Máy dùng đúng hàm đó (đồ y như cũ) — mô phỏng hết ghi cứng id đồ / phép.
- **Pha chuẩn bị** sau lượt chọn cuối (15 s): ẩn lưới, tướng mình đứng trên sân khấu 3D dùng chung (`stage()`, không tạo ngữ cảnh WebGL thứ
  hai), đổi phép / bảng bùa, "Sẵn sàng" kết thúc sớm → đội hình → tải → trận như cũ.
- **CSS mới ở `src/ui/cssDraft.js`** (tự chèn `<style>`), không thêm vào `css.js` (đã 414 dòng). Nhãn vị trí dùng `em.rl` (không đặt lớp `.rl`
  chung: `.pn-detail .rl` của bảng tướng đã dùng tên đó cho một `<p>`).
- **Âm thanh**: không thêm file — cấm `ui_lock` (nhỏ, trầm), mình khoá `ui_lock`, máy chọn `ui_select`, tới lượt `ui_confirm`, 5 s cuối `ui_tick`;
  `ban` / `skip` / `lock` bỏ khỏi bộ nghe chung (draft.js tự phát).
- **Hộp thoại phép / bùa tách ra `src/ui/pickLoadout.js`** (không đặt tên `loadout.js` như spec — tên đó để dành cho module dữ liệu của cụm kế).
- **Đồ khởi đầu của người chơi theo vị trí cả trên đường `?hero=&mode=5v5`**: `game.js` gọi `starterFor(hero, player.role, phép)` nên người
  chơi rơi vào ô Trợ thủ (do đường ưu tiên của tướng) giờ nhận đồ trợ thủ thay vì đồ theo lớp — đúng như máy cùng ô. Đi rừng chỉ nhận Nanh
  Thú Rừng khi thật sự mang Trừng Trị (`?role=jungle` không kèm phép thì vẫn đồ theo lớp).
- *Khác spec (số dòng):* spec trỏ `main.js` dòng 117/138/152 nhưng file thật chỉ ~58 dòng; đã sửa theo code thật (import + `injectDraftCss()`
  cạnh `injectCss()`, `?role=` ở nhánh `?hero=`).

## GĐ2 — phép bổ trợ, bảng bùa, phù hiệu (20/10)
- **Phép theo `kind`, không theo id**: mỗi phép có `kind` (`blink, heal, execute, smite, haste, cleanse, towerOff, flashStun, warDrum, hex`);
  mô phỏng (`sim/spells.js`), bot (`ai/botSkills.js`, `ai/botSpells.js`) và HUD (`hud/spellButtons.js`) rẽ nhánh theo `kind`. Phép cần mục
  tiêu có `needTarget` — không có mục tiêu: `castFail 'noTarget'`, không mất hồi chiêu (luật cũ của Trừng Trị, giờ chung cho cả 4).
- **4 phép mới, tên tự đặt**: Tắt Đèn (90s, trụ / nhà chính gần nhất trong 900 ngừng bắn 4s), Loá Mắt (110s, choáng 0,75s mọi tướng địch thấy
  được trong 380), Trống Trận (100s, +30% tốc đánh +10% Công / đồng minh một nửa, 5s), Bùa Mỏi (100s, giảm 35% sát thương gây ra + chậm 25%
  3s). Cả 4 dùng được ở 1v1.
- **Tắt Đèn là trường `disabledUntil` trên công trình**, không phải trạng thái: `applyStatus` từ chối công trình. Tung lại thì lấy `max`.
  Đang tắt: không bắn, xoá chuỗi bắn / thù hận mỗi nhịp; đạn đã bay vẫn tới; hồi máu / miễn sát thương của trụ không đổi.
- **"Suy yếu" (weaken) là khống chế**: nằm trong CC + TENACITY, Giải Trói xoá, miễn khống chế chặn. Nhân vào **sát thương của người bị dán**
  (mọi loại kể cả chuẩn và theo thời gian) sau hook của người gây, trước giảm giáp.
- **Loá Mắt bỏ qua tướng đang miễn khống chế** khi đếm "trúng" (sửa lúc kiểm thử: trước đó tướng vừa Giải Trói vẫn bị tính trúng).
- **Bộ trang bị vào mô phỏng chỉ qua `world.setLoadout(e, { spellId, charm, emblem })`, chỉ nhận ở tick 0** (sau đó trả false, không đổi gì).
  Dữ liệu làm sạch bằng `sanitizePage` / `sanitizeEmblem` (localStorage hỏng / sửa tay không lọt vào trận). Cùng seed + cùng bộ ⇒ cùng trận.
  `spawnHero` **không** gắn phù hiệu (giữ nguyên mọi số đo cũ); `setupTeams` gắn cho bot; `game.js` gắn cho người chơi (`opts.loadout`) và bot 1v1.
- **Phù hiệu chạy theo `kind`** (`sim/emblems.js`), gọi từ đúng 2 chỗ trong `dealDamage` (trước giảm giáp: Săn Mồi; sau khi trừ máu: phù hiệu
  chính của người gây / người nhận) — không thêm hook vào tướng. Sát thương phù hiệu / theo thời gian / phản không kích phù hiệu.
- **Bảng bùa**: ô trống được; cấp = số ô đã gắn; 5 trang mẫu chỉ đọc, **sửa trang mẫu là tự tạo bản sao** (đỡ một bước "sao chép" trên điện
  thoại); tối đa 10 trang riêng (id `u1..u10`, lấy id nhỏ nhất còn trống); nhớ trang theo tướng (`profile.heroPage`, ghi lúc chốt tướng);
  phù hiệu theo tướng (`profile.emblems`). Trường cũ `profile.page` không còn đọc. **Mở hết 15 bùa** — tiền "Xu Đèn" của 05 §7 để sau.
- **Kho dữ liệu không DOM** (`ui/loadout.js`) tách khỏi giao diện (`charmEditor.js`, `emblemEditor.js`, `loadoutPanel.js`) để kiểm bằng node
  (`tools/t_charms.mjs`). CSS riêng `ui/loadoutCss.js` (css.js đã quá dài).
- **Âm thanh / hình phép mới dùng lại bộ có sẵn** (không dựng lại `sfx.mp3`): Trống Trận `horn`, Loá Mắt `light_cast`, Tắt Đèn `tower_down`,
  Bùa Mỏi `arcane_hit`; phù hiệu `fire_hit` / `haste` / `heal` (Mai Rùa dùng tiếng khiên sẵn có). Biểu tượng phép / phù hiệu là huy hiệu SVG
  (`hud/art.js`) — chưa vẽ ảnh webp như 6 phép cũ. Hiệu ứng 3D trong `render/vfx/extra.js`, không vẽ khi kẻ tung đang trong sương mù.
- **Màn tải trận lấy phép máy từ đúng hàm của mô phỏng** (`assignSlots` + `botSpellOf`) — trước đây đoán theo `defaultSpell` nên sai với máy
  đi rừng.

## GĐ3 — kết thúc trận, đấu lại trong trang, cài như ứng dụng (20/10)
- **Camera cuối trận** (`render/endCam.js`, số ở `data/endgame.js`): nhà chính vỡ (hoặc đầu hàng) → camera trượt êm (smootherstep 0,9 s, không
  phụ thuộc FPS) tới nhà chính bên thua, lệch xuống 480 để nhà chính nằm nửa trên màn (dải băng-rôn giữa màn không che) + lùi gần 1900; tới
  0,75 s thì nổ (`fx.coreBlast`: sóng lan, cột sáng, vết cháy, tia lửa, khói) + rung + tiếng `tower_down` (gameSounds không phát tiếng đó
  cho nhà chính lúc sự kiện nữa để khỏi kêu hai lần). Sương mù chiến trường tắt lúc lướt. **Đầu hàng**: nhà chính trong mô phỏng vẫn sống
  nhưng phần nhìn vẽ như đã đổ (`views.down(id)`) — chỉ tầng render, mô phỏng không đổi.
- **Thẻ "Chi tiết" màn kết quả = phần trăm có thanh** (`ui/score.js` `pct100` + `r.pct`): sát thương lên tướng / gánh chịu tính theo đội
  (chia bằng phần dư lớn nhất nên mỗi đội cộng đúng 100, bằng nhau thì người đứng trước), tham gia = round(100·min(1,(H+HT)/hạ của đội));
  1v1 tính trên cả trận và cột thứ ba là "Tỉ lệ hạ". Người cao nhất đội tô vàng. Mục tiêu / hồi-khiên / lính-quái dời sang bảng "Số liệu"
  (5 cột mới) nên không mất số nào. Điểm trận / MVP không đổi (đã kiểm bằng số chụp).
- **Đấu lại / Về sảnh ngay trong trang** (`ui/flow.js leave`): trận trả `dispose()` — dừng vòng lặp; gỡ mọi listener toàn cục, phần tử gắn
  body, hẹn giờ, đăng ký cài đặt qua **một phạm vi** (`core/scope.js`: `startMatch` dựng trận trong `enterScope`, module HUD gọi
  `on()` / `track()`; `onPref` tự gỡ khi có phạm vi); trả bộ nhớ GPU (`render/dispose.js`: hình khối, ảnh — kể cả ảnh gắn qua
  `onBeforeCompile`, đọc từ `renderer.properties.get(m).uniforms` — khung xương, lưới instanced, render target hậu kỳ, bản đồ bóng);
  cất renderer (`render/renderer.js park`). **LUẬT: listener toàn cục mới trong trận phải dùng `on()`, phần tử gắn vào body phải bọc `track()`.**
  Màn kết quả mở ra là gỡ luôn phạm vi trận (cần điều khiển giữ con trỏ chuột trên body — để lại thì chuột không bấm được nút màn kết quả;
  lỗi này có từ trước, giờ hết).
- **Giữ chương trình shader giữa các trận**: three r186 đếm tham chiếu chương trình theo vật liệu và khoá chương trình ShaderMaterial theo mã
  từng chặng shader — huỷ vật liệu trước khi trận sau dịch xong là dịch lại từ đầu. Nên vật liệu trận cũ được **giữ một thế hệ**
  (`holdMaterials`) và chỉ huỷ sau khi trận mới dịch sẵn xong (`releaseHeld(vật liệu đang dùng)`, gọi trước khi gỡ nhóm lính / quái mẫu).
  Đo (máy không GPU): trận 1 dịch sẵn 7,1–8,4 s → trận 2 **0,46–0,56 s**, số chương trình đứng yên (69 → 69). PMREM env map giữ một bản
  mỗi renderer (`WeakMap`). Vật liệu mẫu hiệu ứng (`shapes.js keep`) giữ cả phiên, không chép thêm mỗi trận.
- **Chính sách 'drop'** (an toàn): từng mất ngữ cảnh WebGL, hoặc `?freshgl` → rời trận huỷ hẳn renderer + `forceContextLoss` + thay canvas
  mới (trận sau dịch lại như trước GĐ3). `stageDispose()` cũng thay canvas `#show` (canvas đã mất ngữ cảnh không dựng được renderer mới).
  Lý do giữ mặc định 'keep': iPhone dịch mỗi shader 0,05–0,3 s × ~70–100 chương trình.
- **Cài như ứng dụng + chơi không mạng**: `manifest.webmanifest` (toàn màn ngang, biểu tượng có maskable), `sw.js` + `tools/mk_sw.mjs`
  lúc deploy ghi mã commit + danh sách tệp kèm băm SHA-256 (16 ký tự). **Một bộ đệm `la-files`, khoá theo băm** (`đường dẫn?v=băm`): deploy
  mới chỉ tải lại tệp đổi (model tướng không tải lại khi chỉ đổi code), mã cũ / mới không bao giờ trộn. Tải sẵn lúc cài 429 tệp / 13,8 MB;
  model 20 tướng (36,7 MB gồm cả bản trưng bày) lưu khi dùng + Sảnh nhờ lưu sau 2,5 s (trừ khi bật Tiết kiệm dữ liệu). Mỗi tệp kiểm băm;
  lệch (bộ đệm HTTP 10 phút của Pages) thì tải lại bỏ đệm, vẫn lệch thì cài hỏng và bản cũ chạy tiếp.
- **Không tự `skipWaiting`**: bản mới tải xong thì đang ở màn khởi động áp ngay, còn lại chỉ hỏi "Có bản mới" ở Sảnh / Phòng chờ (không bao
  giờ giữa chọn tướng / trận / kết quả), "Để sau" hoãn 30 phút. Đăng ký chỉ trên https (localhost cần `?sw` để bộ kiểm thử trên máy không bị
  bộ đệm chen vào; `?nosw` luôn bỏ). Trong repo (chưa đánh phiên bản) `sw.js` chạy chế độ DEV: lấy mạng trước — sửa code không bị bản cũ.
- iPhone: ứng dụng ở màn hình chính có bộ nhớ riêng với Safari — **mở một lần khi có mạng** rồi mới chơi không mạng được (ghi ở Cài đặt →
  Dữ liệu). Đang ở chế độ ứng dụng thì ẩn nút toàn màn (`#fs`, nút ở Sảnh).


## GĐ4 (26/10) — mở sẵn cả 20 tướng
- 08 §5 cho người chơi mới 6 tướng khởi đầu, phần còn lại mở bằng Xu Đèn hoặc tuần miễn phí. **Chủ dự án chốt: mở sẵn cả 20 tướng** cho mọi hồ
  sơ (game chơi với máy, khoá tướng chỉ làm hụt nội dung). Xu Đèn chỉ dùng cho rương, bùa, trang phục; không có tuần miễn phí, không giá tướng.
- **Mã lưu (GĐ4a)** là chuỗi chữ để dán / gửi qua tin nhắn — không cần máy chủ, chạy được cả khi chơi không mạng.
  - Tổng kiểm FNV-1a 32 bit chỉ để bắt chép thiếu / dán nhầm, **không chống sửa**. Game chơi với máy, không có gì để gian lận.
  - Nhập mã thì tải lại trang thay vì vá từng màn đang mở: đơn giản và chắc chắn mọi màn đọc lại hồ sơ mới.
- **Tiền tệ GĐ4d:** vàng ở sảnh giữ tên "vàng" nhưng đóng vai Xu Đèn của 08 §5. Mọi màn đã gọi là vàng; đổi tên sẽ lẫn với vàng trong trận.
  Hai tiền tệ mới: Mảnh Tướng, Gạo Hội.
- **2 Bùa Giữ Sao (MVP thua) quà tân thủ không có hạn** — hồ sơ cũ đã có sẵn. Bùa nhận từ nay (nhiệm vụ, rương, đổi mảnh) có hạn 24 giờ như 08 §3.
- **Thứ tự giữ sao khi thua:** vật phẩm có hạn dùng trước Điểm tích luỹ, vì thanh tích luỹ không hết hạn.
- **Thẻ Nhân Đôi Sao:** bấm Dùng là tiêu thẻ ngay, gắn cho đúng một trận hạng kế tiếp (thua cũng mất). Giá cửa hàng mảnh tự đặt: 8 / 24 / 30.
- **Mùa giải GĐ4b — chỗ tự chốt:**
  - mùa 1 bắt đầu 01/10/2026, tính theo giờ thiết bị (offline, 08 §4) — đổi giờ máy là sang mùa, game chơi với máy nên chấp nhận;
  - bảng thưởng hết mùa, quà Hành trình đỉnh cao, tên / màu khung là số tự đặt (08 chỉ nêu loại quà);
  - **trang phục mùa = phối màu**, không phải model mới: dự án chưa có bộ model trang phục, nhân màu vật liệu đổi được ngay mà không phải tải gì thêm.
    Chỉ phủ tướng của mình (trong trận + sảnh), vì bot không có trang phục.
  - **4 model cao cấp không có trang phục mùa** (luật 11) — chặn cả ở chỗ chọn lẫn chỗ phủ màu;
  - bỏ lỡ nhiều mùa thì chỉ thưởng mùa vừa chơi, mỗi mùa bỏ lỡ reset thêm một lượt.
- **Hào Quang / Thiên Hà / Đấu Đỉnh Cao GĐ4c — chỗ tự chốt:**
  - Hào Quang **theo mùa**: 08 §1 ghi "bắt đầu 1000 khi vào Nguyệt Quang", reset mềm đưa mọi người dưới Nguyệt Quang ⇒ mùa mới bắt đầu lại 1000.
    Danh hiệu + khung ở mốc 2000 cũng theo mùa.
  - Đỉnh Cao **×1,5 chỉ khi thắng** (thua tính như thường), và nhân **sau** giới hạn ±25 — nhân trước thì gần như không khác (23 → 25).
  - Đỉnh Cao **tính sao như đấu hạng** (cùng luật sàn, bùa, tích luỹ, thẻ x2) và tính vào nhiệm vụ / thành thạo / trang phục mùa.
  - Người ảo trên bảng coi như đều ở Thái Dương, nên Thiên Hà = 50 dòng đầu bảng. Bằng điểm thì người chơi đứng trên.
  - Bảng ảo **đứng yên cả mùa** (08 §1 "cố định theo seed mùa") — muốn bảng nhích theo ngày thì sửa `virtualBoard`.
  - Thưởng hết mùa cho Thiên Hà (3000 vàng, 150 ngọc, Khung Thiên Hà) là số tự đặt, nhỉnh hơn Thái Dương một bậc.

## GĐ5 (26/10) — phần còn lại của lộ trình 1.0
- **Chống khoá chết (04 §3, GĐ5a):** chuỗi khống chế cứng (choáng / hất tung / áp chế) nối nhau không khoảng nghỉ lên một mục tiêu quá 3 s ⇒ trong
  2 s kể từ mốc 3 s, choáng / trói / câm lặng / khiêu khích mới chỉ còn 50%. Số ở `COMBAT_EXTRA.ccChain`.
  - **Hất tung và áp chế tính vào chuỗi nhưng không bị giảm**: hất tung gắn với chuyển động / hoạt ảnh bay lên, áp chế được thiết kế giữ đủ thời gian
    (cùng lý do nó không ăn kháng hiệu ứng).
  - **Làm chậm, mù, suy yếu không bị giảm** — không phải khống chế cứng.
  - Chỉ hiệu ứng **của địch** (khác đội) mới tính và mới bị giảm.
  - Hiệu ứng làm chuỗi vượt ngưỡng vẫn đủ thời gian; chỉ hiệu ứng áp trong cửa sổ sau đó mới giảm.
  - HUD hiện "Kháng 50%" trên đầu tướng của mình hoặc tướng địch khi bị giảm.
