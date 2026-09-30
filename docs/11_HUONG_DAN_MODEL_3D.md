# 11 — Hướng dẫn có model 3D đẹp cho game

Tài liệu này viết cho **bạn** (không phải cho AI coding). Đi theo thứ tự từ trên xuống. Phần code đọc model đã có trong `02_KY_THUAT.md` §13; ở đây chỉ nói cách **có được file model đúng chuẩn** để thả vào game.

## 0. Ai làm được phần nào

| Việc | Claude / AI coding | Bạn | Hoạ sĩ 3D (nếu thuê) |
|---|---|---|---|
| Code nạp model, animation, ánh sáng, viền sáng, hiệu ứng, cảnh trưng bày xoay 360° | ✅ | | |
| Trang kiểm tra model (`tools/model-check.html`) | ✅ | | |
| Viết mô tả nhân vật, prompt, bản giao việc cho hoạ sĩ | ✅ (đã có trong 09) | chỉnh theo ý | |
| Viết script Blender tự động (xuất hàng loạt, đổi tên clip, render chân dung) | ✅ | chạy trong Blender | |
| Tạo hình khối, điêu khắc, vẽ chất liệu **đẹp như game thương mại** | ❌ | chỉ khi bạn học 3D | ✅ |
| Chọn mua model, dùng công cụ AI tạo 3D, gắn xương tự động, xuất file | hướng dẫn từng bước | ✅ | ✅ |

Tóm lại: **model đẹp phải đến từ con người hoặc công cụ tạo 3D**, còn làm cho model đó chạy mượt và đẹp trong game là việc của code.

---

## 1. Chuẩn bị (một lần)
1. Cài **Blender** (miễn phí, blender.org). Dùng bản ổn định mới nhất.
2. Cài **Node.js** (nodejs.org, bản LTS), rồi mở Terminal/CMD chạy:
   ```
   npm install --global @gltf-transform/cli
   ```
   Kiểm tra: `gltf-transform --help`.
3. Tạo tài khoản **Adobe** (miễn phí) để dùng **Mixamo** (mixamo.com) gắn xương và lấy animation cho nhân vật dạng người.
4. Tạo thư mục làm việc ngoài dự án game, ví dụ `LanternArt/`:
   ```
   LanternArt/
     _licenses.txt          # ghi nguồn mọi thứ tải/mua
     long_dang/              # mỗi tướng 1 thư mục (dùng id trong 04)
       source/              # file gốc: .blend, ảnh thiết kế, texture gốc
       export/              # .glb đã xuất và đã nén
   ```
5. Mở hai trang kiểm tra file (bookmark lại):
   - **glTF Viewer**: gltf-viewer.donmccurdy.com (kéo thả .glb để xem, có danh sách animation)
   - **glTF Validator**: github.khronos.org/glTF-Validator (báo lỗi định dạng)

---

## 2. Model giữ chỗ miễn phí để thử quy trình (làm ngay, ~30 phút)
Mục đích: có 1 file GLB có animation để AI coding làm Mốc 1, và để bạn quen các bước.

1. Tìm bộ nhân vật **CC0** (miễn phí, dùng thương mại không cần ghi công) đã có sẵn animation, ví dụ các bộ của **Quaternius** hoặc **KayKit**. Tải bản có file `.glb` hoặc `.gltf`.
2. Trên trang tải, **chụp màn hình phần giấy phép** (ghi rõ CC0), lưu cùng file, ghi vào `_licenses.txt`: tên bộ, link, giấy phép, ngày tải.
3. Kéo file vào glTF Viewer: xem có animation không, tên các clip là gì (ví dụ `Idle`, `Running_A`, `1H_Melee_Attack_Chop`…).
4. Chép 1 file vào dự án game: `assets/test/test_character.glb`.
5. Báo cho AI coding tên các clip để nó làm bảng ánh xạ (`clipMap`), ví dụ `Run → Running_A`.

---

## 3. Chọn cách có model thật

| Cách | Chất lượng | Chi phí | Thời gian mỗi tướng | Độc quyền | Hợp khi |
|---|---|---|---|---|---|
| **A. Mua model có sẵn** | Trung bình → cao, tuỳ sản phẩm | Thấp → vừa | Vài giờ → 2 ngày (chỉnh sửa) | Không (người khác mua được) | Muốn nhanh, chấp nhận không độc quyền |
| **B. AI tạo 3D từ ảnh + tự chỉnh** | Trung bình, không đều | Thấp (phí công cụ) | 1–3 ngày | Tuỳ điều khoản công cụ | Ngân sách thấp, chịu học Blender cơ bản |
| **C. Thuê hoạ sĩ 3D** | Cao nhất, đúng ý | Cao nhất | 2–6 tuần | Có (nếu hợp đồng chuyển quyền) | Muốn đẹp như game thương mại, có ngân sách |

Có thể **kết hợp**: dùng B hoặc A cho bản thử, thuê C cho 3–6 tướng chủ lực. Dù chọn cách nào, **làm 1 tướng thử trọn vẹn trước** (đề xuất Lồng Đăng) rồi mới làm hàng loạt.

---

## 4. Cách A — Mua model có sẵn

### 4.1 Tìm ở đâu
- **Fab** (fab.com, chợ của Epic; kho Sketchfab cũ đã chuyển sang đây từ 2025)
- **CGTrader**, **TurboSquid**
- **Unity Asset Store** (nhiều bộ nhân vật fantasy kiểu mobile; đọc kỹ giấy phép vì một số giấy phép gắn với việc dùng trong Unity)
- **itch.io** (nhiều bộ low-poly giá rẻ)

Từ khoá tìm: `stylized fantasy character rigged animated`, `mobile game hero low poly PBR`, `MOBA character`, kèm loại nhân vật (`archer`, `mage`, `warrior`…).

### 4.2 Kiểm tra trước khi mua (bắt buộc)
- [ ] **Giấy phép cho phép dùng trong game thương mại** (Standard/Professional/Royalty-free). Tránh "Editorial", "Personal only", "CC-BY-NC", "CC-BY-SA" (SA buộc chia sẻ lại).
- [ ] Không phải nhân vật nhái game/phim nổi tiếng (người bán có thể vi phạm, bạn vẫn chịu rủi ro).
- [ ] **Có xương (rigged)** và dạng người (để dùng được Mixamo nếu thiếu animation).
- [ ] Số tam giác gần ngân sách (09 §3.1: 8k–15k trong trận). Model 50k+ vẫn dùng được nhưng phải giảm (§6.3).
- [ ] Có file **FBX** hoặc **glTF/GLB** và texture riêng (PNG/TGA).
- [ ] Ảnh xem trước có hiện **wireframe** và **texture** (để biết chất lượng lưới).

### 4.3 Sau khi mua
1. Lưu hoá đơn + ảnh chụp giấy phép vào `source/`, ghi `_licenses.txt`.
2. Chỉnh cho hợp thế giới game: **đổi màu texture** theo `palette` của tướng (09 §4), thay/ thêm vũ khí, phụ kiện đầu. Đây là bước làm model "của mình" và khác người khác cùng mua.
3. Đi tiếp §6.

---

## 5. Cách B — Dùng AI tạo 3D từ ảnh

### 5.1 Tạo ảnh thiết kế
1. Lấy prompt của tướng trong `09_HINH_ANH.md` §4, **bỏ phần tư thế/cảnh**, ghép **Đuôi A** (ảnh thiết kế dựng 3D).
2. Tạo bằng công cụ tạo ảnh có quyền dùng thương mại. Chọn ảnh: toàn thân, đứng thẳng, tay dang nhẹ (A-pose), nền trơn, **không có vật che tay/chân**, vũ khí tách rõ khỏi người.
3. Nếu được, tạo thêm ảnh nhìn nghiêng và nhìn sau cùng mô tả.

### 5.2 Tạo model
1. Đưa ảnh vào công cụ **ảnh → 3D** (ví dụ Meshy, Tripo, Rodin; **đọc điều khoản và gói tài khoản**: nhiều công cụ chỉ cho dùng thương mại ở gói trả phí).
2. Chọn tuỳ chọn: có texture PBR, số mặt thấp/trung bình (khoảng 20k–50k), xuất **GLB** hoặc **FBX**.
3. Một số công cụ có sẵn **gắn xương + animation**. Nếu dùng, vẫn kiểm tra như §6.
4. Ghi vào `_licenses.txt`: công cụ, gói, ngày, prompt, ảnh đầu vào.

### 5.3 Chỉnh sửa trong Blender (thường cần)
- **Lưới rối, quá nhiều mặt:** Modifier **Decimate** (Collapse, giảm dần tới ~12k tam giác, xem số ở thanh trạng thái Blender bật "Scene Statistics"). Chất lượng tốt hơn: làm lại lưới (retopology) bằng Remesh hoặc công cụ Instant Meshes, rồi bake texture từ bản gốc (việc này nên nhờ hoạ sĩ hoặc học riêng).
- **Tay/ngón dính nhau, vũ khí dính vào người:** tách bằng chế độ Edit (chọn phần, `P` → Selection). Vũ khí tách riêng sẽ gắn vào xương tay sau.
- **Mặt méo, chi tiết sai:** sửa trong Texture Paint của Blender hoặc xuất texture ra Krita/Photoshop sửa rồi nạp lại.
- **Màu sai chủ đề:** chỉnh Hue/Saturation của texture theo `palette`.

Nếu model chưa có xương → §6.2 (Mixamo).

---

## 6. Chuẩn hoá model trong Blender (mọi cách đều qua bước này)

### 6.1 Nhập và chuẩn tư thế, tỉ lệ, hướng
1. Blender → File → New → General. Xoá khối lập phương mặc định.
2. File → Import → FBX hoặc glTF 2.0.
3. Chọn toàn bộ nhân vật (mesh + armature). Kiểm tra:
   - **Chiều cao** (phím `N` → Dimensions): 1.8–2.6 m theo tướng (09 §3.1). Sai thì Scale lại.
   - **Chân chạm mặt đất**, đứng ở gốc toạ độ (0,0,0).
   - **Mặt nhìn về −Y** trong Blender (nhìn từ phía trước bằng phím `1` trên bàn phím số thấy mặt nhân vật). Khi xuất glTF sẽ thành nhìn về +Z đúng chuẩn game.
4. `Ctrl+A` → **All Transforms** (áp dụng vị trí, xoay, tỉ lệ).
5. Đặt tên: armature `Armature`, mesh `<id>_body`, vũ khí `<id>_weapon`.

### 6.2 Gắn xương và lấy animation bằng Mixamo (nếu cần)
Mixamo miễn phí với tài khoản Adobe, chỉ dùng cho **nhân vật hai chân dạng người** (Thuồng Luồng, Rùa, Sói bốn chân… không dùng được; xem §6.4).

1. Trong Blender: chỉ chọn mesh nhân vật (chưa có xương) ở tư thế T hoặc A, File → Export → FBX (Selected Objects, Path Mode: **Copy**, bật nút nhúng texture bên cạnh).
2. Vào mixamo.com → **Upload Character** → chọn file FBX.
3. Đặt các điểm: cằm, cổ tay, khuỷu tay, đầu gối, háng. Skeleton LOD: **Standard** hoặc **No fingers** (ít xương hơn, hợp mobile).
4. Chọn animation cho từng clip bắt buộc (02 §13.5). Với mỗi clip:
   - Clip di chuyển (chạy): **tích ô "In Place"** (chạy tại chỗ; game tự di chuyển nhân vật).
   - Tải về: Format **FBX Binary**, Skin: **With Skin** cho clip đầu tiên, **Without Skin** cho các clip sau, **30 fps**, Keyframe Reduction: none.
   Gợi ý tìm: Idle → "Idle"/"Breathing Idle"; Run → "Running"/"Fast Run" (In Place); Attack → "Sword Slash", "Punching", "Standing Draw Arrow", "Magic Attack"; Cast → "Spell Casting", "Standing 2H Magic Attack"; Ult → animation mạnh, dài hơn; Death → "Dying"; Recall → "Praying"/"Meditating"; Victory → "Victory".
5. Về Blender: nhập file With Skin, rồi lần lượt nhập các file Without Skin. Mỗi lần nhập tạo một armature thừa: mở **Action Editor**, lấy action đó gán cho armature chính, rồi xoá armature thừa.
6. **Đổi tên action** đúng chuẩn: `Idle`, `Run`, `Attack1`, `Attack2`, `Cast1`, `Cast2`, `Ult`, `Death`, `Recall`, `Victory`, `Showcase`.
7. Với từng action: bấm biểu tượng **khiên (Fake User)** để không bị mất, hoặc **Push Down** vào NLA.

Thay thế Mixamo: **AccuRIG** (ứng dụng máy tính, miễn phí, xuất FBX), hoặc bộ animation CC0 (ví dụ của Quaternius) rồi chuyển (retarget) sang xương của bạn. Kiểm tra giấy phép từng nguồn.

### 6.3 Giảm tải cho điện thoại
- **Số tam giác:** bật Overlays → Statistics. Trong trận: 8k–15k. Nếu dư, thêm modifier **Decimate** vào mesh (không áp lên xương), giảm từ từ, nhìn từ góc camera game (chéo 55°, từ xa) để chọn mức chấp nhận được.
- **Xương:** ≤ 60 (Mixamo "No fingers" ~ 25 xương là tốt).
- **Vật liệu:** gộp còn 1–2. **Texture:** 1024×1024 cho trong trận (Image → Resize nếu lớn hơn).
- **Vũ khí:** gộp vào mesh nhân vật và skin theo xương tay (đơn giản nhất), hoặc để riêng làm con của xương tay.

### 6.4 Nhân vật không phải dạng người
Thuồng Luồng, Hộ Vệ Đèn, Rùa Ngọc, Sói bốn chân (nếu làm), quái rừng: cần **hoạ sĩ gắn xương** hoặc mua model đã có sẵn animation, hoặc công cụ AI hỗ trợ sinh vật (một số công cụ ghi là hỗ trợ bốn chân). Với Sói Núi (người sói) và Thạch Quy, thiết kế ở 09 là **đứng hai chân** nên vẫn dùng Mixamo được.

### 6.5 Xuất GLB
File → Export → **glTF 2.0 (.glb/.gltf)**:
| Mục | Giá trị |
|---|---|
| Format | glTF Binary (.glb) |
| Include → Limit to | Selected Objects (chọn armature + mesh trước khi xuất) |
| Transform → +Y Up | Bật |
| Data → Mesh → Apply Modifiers | Bật (để Decimate được áp) |
| Data → Mesh → UVs, Normals | Bật; Tangents bật nếu có Normal map |
| Data → Material → Images | Automatic |
| Data → Armature → Export Deformation Bones Only | Bật |
| Data → Skinning → Bone Influences | 4 |
| Data → Compression | **Tắt** (sẽ nén bằng gltf-transform ở §7) |
| Animation → Mode | **Actions** |
| Animation → Reset pose bones between actions | Bật |
| Animation → Optimize Animation Size | Bật |

Lưu vào `export/<id>_raw.glb`. Tên và vị trí các tuỳ chọn có thể xê dịch nhẹ giữa các bản Blender.

---

## 7. Nén cho web
Mở Terminal tại thư mục `export/`:
```
gltf-transform inspect long_dang_raw.glb
```
Xem bảng: số tam giác, số animation và tên, kích thước texture.

Nén (hình học bằng meshopt, texture sang WebP, giới hạn 1024):
```
gltf-transform optimize long_dang_raw.glb long_dang.glb --compress meshopt --texture-compress webp --texture-size 1024
```
Nếu phiên bản bạn cài báo sai tuỳ chọn, chạy `gltf-transform optimize -h` để xem tên đúng.

Bản trưng bày (LOD0) thì dùng `--texture-size 2048` và đặt tên `<id>_showcase.glb`.

Mục tiêu dung lượng: trong trận ≤ 2.5 MB, trưng bày ≤ 8 MB (09 §3.1).

---

## 8. Kiểm tra trước khi đưa vào game

### 8.1 Kiểm tra bằng trang web
Kéo `long_dang.glb` vào glTF Viewer và Validator:
- [ ] Validator không báo **Error** (Warning có thể chấp nhận)
- [ ] Texture hiện đúng, không đen/không hồng
- [ ] Đủ clip bắt buộc, đúng tên
- [ ] Run chạy tại chỗ (không trôi đi)
- [ ] Không có phần lưới bị kéo giãn lạ khi chạy animation

### 8.2 Kiểm tra bằng công cụ trong dự án
AI coding sẽ làm `tools/model-check.html` (Mốc 1). Mở trang, chọn file, trang hiển thị:
- Số tam giác, xương, vật liệu, kích thước texture, dung lượng, **so với ngân sách** (xanh = đạt, đỏ = vượt)
- Danh sách clip, bấm để phát; thanh trượt `timeScale`
- Mũi tên hướng +Z và một khối cao 1.8 m để so tỉ lệ
- Góc nhìn camera trận (chéo 55°, từ xa) để xem nhân vật có dễ nhận ra không

### 8.3 Đưa vào game
1. Chép vào `assets/heroes/<id>/<id>.glb` (và `_showcase.glb` nếu có).
2. Thêm dòng vào `assets/LICENSES.md`: file, nguồn, giấy phép, ngày, người làm.
3. Dán prompt "Khi thêm model thật" (10, cuối file) cho AI coding.
4. Vào luyện tập, chạy thử: chân có trượt không (chỉnh `runRefSpeed`), đòn đánh khớp lúc số sát thương hiện không (chỉnh `hitTime`), hiệu ứng bắn ra đúng đầu vũ khí không (chỉnh `attach`).

---

## 9. Cách C — Thuê hoạ sĩ 3D

### 9.1 Tìm ở đâu
ArtStation (xem portfolio, nhắn tin), Upwork, Fiverr, các nhóm Facebook/Discord cộng đồng 3D và game Việt Nam. Chọn người có portfolio **nhân vật game stylized, có wireframe, có animation**, từng làm "mobile game character".

### 9.2 Gửi gì cho hoạ sĩ
Gói giao việc cho mỗi tướng:
1. Mô tả tướng: mục tướng trong `09_HINH_ANH.md` §4 (ngoại hình, màu, vũ khí, hiệu ứng).
2. Ảnh thiết kế (nếu đã tạo ở §5.1) hoặc yêu cầu họ vẽ concept trước.
3. Quy cách kỹ thuật: `09_HINH_ANH.md` §3.1 + bảng clip bắt buộc ở `02_KY_THUAT.md` §13.5 + cài đặt xuất §6.5 của file này.
4. Góc nhìn trong game: camera chéo 55°, nhân vật cao ~8–10% màn hình điện thoại → hình khối lớn và vũ khí quan trọng hơn chi tiết mặt.
5. Không được sao chép hay tham chiếu nhân vật của game khác.

### 9.3 Các mốc duyệt (trả tiền theo mốc)
1. **Concept 2D** (trước, nghiêng, sau) → duyệt
2. **Hình khối xám** (blockout/sculpt) → duyệt, xem từ góc camera trận
3. **Lưới game + texture** → duyệt trong glTF Viewer
4. **Xương + animation** → duyệt bằng `tools/model-check.html`
5. **Bàn giao cuối**

### 9.4 Hợp đồng cần có
- **Chuyển giao toàn bộ quyền tác giả** (hoặc giấy phép độc quyền, vĩnh viễn, dùng thương mại) cho sản phẩm cuối.
- Bàn giao **file gốc**: `.blend` (hoặc `.max/.ma`), texture gốc (PSD/Substance), GLB theo chuẩn.
- Cam kết không dùng tài sản của bên thứ ba không có giấy phép; nếu dùng công cụ AI thì phải báo trước và nêu công cụ.
- Số lần sửa ở mỗi mốc, thời hạn, điều khoản huỷ.
- Hoạ sĩ được đưa vào portfolio **sau khi game công bố** (thoả thuận).

### 9.5 Báo giá
Giá dao động rất rộng theo trình độ và khu vực. Hỏi 3–5 người, yêu cầu báo giá **tách theo hạng mục**: concept, model + texture, xương, mỗi animation, bản trưng bày LOD0. Đặt 1 tướng trước để đánh giá chất lượng và tốc độ.

---

## 10. Những thứ khác cần hình ảnh (thứ tự ưu tiên)
1. 6 tướng Alpha: Thạch Quy, Hoả Rèn, Bóng Tre, Nguyệt Hà, Cánh Diều, Lồng Đăng
2. Lính (4 loại), trụ, nhà chính
3. 10 tướng còn lại
4. Quái rừng, Thuồng Luồng, Hộ Vệ Đèn, Cá Chép Vàng
5. Bản đồ vẽ tay (03 §C1 phần 2)
6. Splash/chân dung (render từ model LOD0 trong Blender: ánh sáng 3 điểm, nền vẽ hoặc ảnh), icon kỹ năng

## 11. Lỗi thường gặp
| Hiện tượng | Nguyên nhân | Cách sửa |
|---|---|---|
| Nhân vật nằm ngang hoặc quay lưng | Chưa Apply transforms / sai hướng | §6.1 bước 3–4 |
| Nhân vật tí hon hoặc khổng lồ | Tỉ lệ FBX (Mixamo hay xuất theo cm) | Scale về đúng chiều cao, Apply |
| Chỉ có 1 animation trong file | Action chưa gán Fake User/NLA, hoặc Animation Mode sai | §6.2 bước 7, §6.5 |
| Chạy mà trôi khỏi chỗ | Quên "In Place" ở Mixamo | Tải lại clip với In Place |
| Texture hồng/đen | Mất đường dẫn ảnh | Blender: File → External Data → Pack Resources rồi xuất lại |
| Chân trượt khi chạy | `runRefSpeed` chưa khớp | Chỉnh trong `hero.art.json` |
| File quá nặng | Texture 4K, lưới dày | §6.3 + §7 |
