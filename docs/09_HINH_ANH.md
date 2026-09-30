# 09 — Hình ảnh

## 1. Chất lượng mong muốn và cách đạt được
Mục tiêu: **nhân vật 3D đẹp, chi tiết như MOBA mobile thương mại**, xoay được ở màn chọn tướng, có animation mượt trong trận.

Việc chia làm hai phần độc lập:

| Phần | Ai làm | Ghi chú |
|---|---|---|
| **Code hiển thị model** (Three.js: nạp GLB, animation, ánh sáng, viền sáng, hiệu ứng, màn trưng bày xoay 360°) | AI coding, theo `02_KY_THUAT.md` §13 | Làm ngay từ Mốc 1, dùng model giữ chỗ |
| **Bản thân model** (hình khối, chất liệu, xương, animation) | Mua, tạo bằng AI rồi chỉnh, hoặc thuê hoạ sĩ 3D | Làm theo `11_HUONG_DAN_MODEL_3D.md`. Code chỉ cần đổi đường dẫn file |

Lộ trình hình ảnh:

| Giai đoạn | Nhân vật | Bản đồ |
|---|---|---|
| Alpha | Model giữ chỗ miễn phí giấy phép CC0 (ví dụ bộ nhân vật của Quaternius hoặc KayKit), đổi màu theo tướng + phụ kiện đơn giản | Dựng từ dữ liệu (03 §C1) |
| Beta | 6 tướng Alpha có model thật (mua/AI/thuê) | Dựng từ dữ liệu + tài nguyên trang trí |
| 1.0 | Đủ 16 tướng, lính, quái, mục tiêu lớn | Bản đồ vẽ tay nướng sáng |

Nếu bạn thuê được hoạ sĩ, nên đặt **1 tướng trước** (ví dụ Lồng Đăng) để thử toàn bộ quy trình từ file gửi tới lúc chạy trong game, rồi mới đặt các tướng còn lại.

### Quy tắc khi dùng công cụ AI (ảnh hoặc 3D)
- Đọc điều khoản của công cụ: gói đang dùng phải cho phép dùng thương mại.
- **Không** đưa tên game, tên nhân vật, tên hoạ sĩ, hay "phong cách [game X]" vào prompt.
- Không tải ảnh chụp game khác lên làm ảnh tham chiếu.
- Lưu prompt + ngày + công cụ + gói tài khoản vào `assets/LICENSES.md`.
- Kết quả AI thường sai chi tiết (tay, vũ khí, mặt, đối xứng) và lưới rối. Luôn chỉnh lại trước khi dùng chính thức (11 §4).

## 2. Hướng nghệ thuật chung
- **Chủ đề:** đêm hội đèn lồng; thần thoại dân gian Việt pha kỳ ảo. Vật liệu đặc trưng: đồng thau cổ, sơn mài đỏ son, lụa, tre, gốm men lam, ngọc bích, giấy dó phát sáng.
- **Phong cách:** bán thực tế kiểu "stylized realism": tỉ lệ người thật hơi cường điệu (vai rộng, tay chân dài), khuôn mặt đẹp rõ nét, chất liệu vẽ kỹ, ánh sáng viền mạnh (rim light) để tách khỏi nền tối.
- **Ánh sáng:** nguồn ấm từ đèn lồng (cam vàng) + ánh trăng lạnh (xanh lam). Mỗi splash có một nguồn sáng ma thuật riêng của tướng.
- **Hình khối nhận diện (silhouette):** mỗi tướng phải nhận ra được chỉ bằng bóng đen ở cỡ 64px. Vũ khí và phụ kiện đầu là phần tạo khác biệt chính.
- **Trong trận:** độ bão hoà nhân vật cao hơn nền 20%, viền sáng quanh nhân vật theo màu đội (ngọc lam / đỏ son) do shader thêm vào, **không** vẽ sẵn trong texture.
- **Nhìn từ camera trận:** góc chéo 55°, nhân vật chỉ cao khoảng 8–10% màn hình. Vì vậy chi tiết nhỏ trên mặt gần như không thấy; đầu, vai, vũ khí và màu sắc lớn mới quyết định nhận diện. Mặt và chi tiết nhỏ dành cho bản trưng bày.

## 3. Quy cách file

### 3.1 Nhân vật (tướng)
| Mục | Trong trận (LOD1) | Trưng bày (LOD0) |
|---|---|---|
| Định dạng | `.glb` (glTF 2.0 nhị phân) | `.glb` |
| Tam giác | 8.000–15.000 (đỡ đòn to tối đa 18.000) | 30.000–60.000 |
| Vật liệu | 1–2 | tối đa 4 |
| Texture | 1 bộ 1024²: màu (BaseColor), Normal (tuỳ chọn), ORM (AO-Roughness-Metallic) | 2048² |
| Xương | ≤ 60, mỗi đỉnh ≤ 4 xương | ≤ 90 |
| Animation | đủ clip bắt buộc (02 §13.5), 30 fps | + `Showcase`, `Victory` |
| Dung lượng sau nén | ≤ 2.5 MB | ≤ 8 MB |
| Tư thế gốc | Đứng tại gốc toạ độ, chân chạm mặt đất, **nhìn về +Z** (khi xuất từ Blender: nhìn về −Y) | như trong trận |
| Tỉ lệ | Mét: tướng cao 1.8–2.6 m | như trong trận |

Nếu chỉ có một bản: dùng bản trong trận cho cả sảnh (sảnh vẫn đẹp nếu texture 1024 tốt).

### 3.2 Đơn vị khác
| Loại | Tam giác | Texture | Animation |
|---|---|---|---|
| Lính (mỗi loại) | 1.500–3.000 | 512² | Idle, Run, Attack1, Death |
| Quái nhỏ | 2.000–4.000 | 512² | Idle, Run, Attack1, Death |
| Mục tiêu lớn (Thuồng Luồng, Hộ Vệ Đèn) | 15.000–25.000 | 1024² | Idle, Attack1, Attack2 (kỹ năng), Death, Spawn |
| Trụ, nhà chính | 3.000–8.000 | 1024² dùng chung | Idle (đèn nhấp nháy), Destroyed (hoặc mesh đổ nát riêng) |

### 3.3 Ảnh 2D vẫn cần
| Loại | Kích thước | Ghi chú |
|---|---|---|
| Splash (sảnh, xếp hạng, màn tải) | 2560×1440 | Có thể **render từ model LOD0** trong Blender với ánh sáng đẹp + nền vẽ, thay vì vẽ tay |
| Chân dung (lưới tướng) | 256×256 | Render từ model, cắt ngang vai |
| Avatar tròn | 128×128 | |
| Icon kỹ năng | 128×128 | Vẽ 2D, không chữ |

### 3.4 Thư mục
```
assets/heroes/<id>/
  <id>.glb            # trong trận (bắt buộc)
  <id>_showcase.glb   # trưng bày (tuỳ chọn)
  splash.webp  portrait.webp  avatar.webp
  skills/s0.webp s1.webp s2.webp s3.webp   # s0 = nội tại
  hero.art.json       # thông số hiển thị, xem dưới
assets/units/  assets/map/  assets/vfx/  assets/LICENSES.md
```

`hero.art.json`:
```json
{
  "model": "nguyet_ha.glb",
  "showcase": "nguyet_ha_showcase.glb",
  "scale": 100,
  "height": 210,
  "runRefSpeed": 320,
  "hitTime": { "Attack1": 0.28, "Attack2": 0.30 },
  "attach": { "weapon_tip": "Bone_HandR_Tip", "head": "Bone_Head" },
  "rim": "#8fd3ff",
  "palette": ["#1d2b64", "#8fd3ff", "#e8f4ff", "#c9a24a"]
}
```
- `attach`: tên xương để gắn hiệu ứng (đạn bắn ra từ đầu vũ khí, hào quang trên đầu). Không có thì dùng vị trí mặc định theo chiều cao.
- `runRefSpeed`: tốc chạy mà clip `Run` trông khớp chân (không trượt). Đo khi xem thử (11 §8).

## 4. Mô tả từng tướng

Mỗi tướng gồm: **Ngoại hình**, **Bảng màu**, **Vũ khí**, **Tư thế splash**, **Hiệu ứng kỹ năng**, **Prompt gợi ý** (tiếng Anh, dùng cho công cụ tạo ảnh hoặc gửi hoạ sĩ).

Mỗi prompt gợi ý mô tả **nhân vật + tư thế splash**. Dùng một trong hai đuôi dưới đây tuỳ mục đích:

**Đuôi A — ảnh thiết kế để dựng 3D** (gửi hoạ sĩ 3D, hoặc đưa vào công cụ AI tạo 3D từ ảnh). Bỏ phần tư thế/cảnh nền trong prompt, chỉ giữ phần mô tả ngoại hình + vũ khí:
> `, original character design, full body, A-pose, front view, neutral expression, standing straight, even soft lighting, plain light grey background, no shadow on background, clean readable shapes, stylized realism, game-ready character concept, no text, no logo, no watermark`

Nếu công cụ hỗ trợ nhiều ảnh: tạo thêm ảnh **nhìn nghiêng** và **nhìn sau** với cùng mô tả (thay `front view` bằng `side view` / `back view`).

**Đuôi B — splash art** (sảnh, màn tải):
> `, original character design, stylized realism, high-detail fantasy mobile game splash art, dramatic rim lighting, lantern festival night, painterly background with bokeh lights, no text, no logo, no watermark`

### 4.1 Thạch Quy — Người Gác Đền Rêu Phủ
- **Ngoại hình:** người khổng lồ lưng gù mang mai rùa đá phủ rêu, khắc hoa văn trống đồng. Da như đá xám xanh có vết nứt phát sáng ngọc bích. Râu dài như rễ cây. Cao gấp rưỡi người thường.
- **Màu:** `#4b5a4a` đá rêu, `#7fd1a8` ngọc, `#c9a24a` đồng, `#2b2f3a` bóng.
- **Vũ khí:** cột đá đền chạm rồng, quấn xích đồng.
- **Splash:** chống cột đá xuống đất, mai rùa toả vòng sáng ngọc hình khiên phía sau, bụi đá bay lên.
- **Hiệu ứng:** K1 vệt bụi đá; K2 vết nứt hình vòng lan trên đất; K3 mái đền đá ảo hiện trên đầu, vòng ngọc kéo địch.
- **Prompt:** `giant stone turtle guardian warrior, moss-covered carved stone shell with bronze drum patterns, glowing jade cracks on grey stone skin, long root-like beard, wielding a carved temple pillar wrapped in bronze chains, planting the pillar into the ground, jade shield-shaped aura behind`

### 4.2 Trâu Đồng — Chiến Binh Trống Trận
- **Ngoại hình:** chiến binh nửa người nửa trâu, sừng cong lớn bọc đồng, ngực trần xăm hoa văn chim Lạc, đeo trống đồng nhỏ bên hông, khố và giáp vai đồng thau.
- **Màu:** `#8a5a2b` đồng thau, `#d9a441`, `#3a2418` da, `#e0513b` dải vải đỏ.
- **Vũ khí:** hai dùi trống lớn bằng đồng (dùng như chuỳ).
- **Splash:** gầm lên giữa không trung, hai dùi giơ cao, trống đồng khổng lồ phía sau phát sóng âm vàng.
- **Hiệu ứng:** sóng âm vòng tròn vàng đồng; K2 vệt lao có bụi, đụng tường nổ tia lửa; K3 trống đồng khổng lồ rơi xuống, vòng hoa văn toả ra.
- **Prompt:** `half-man half-water-buffalo warrior, huge curved horns capped in bronze, bare chest with ancient bird tattoos, small bronze drum on his hip, bronze shoulder armor and red cloth sash, two giant bronze drumsticks used as maces, roaring mid-leap, huge bronze drum behind emitting golden sound waves`

### 4.3 Cổ Thụ — Cây Đa Nghìn Tuổi
- **Ngoại hình:** thực thể cây đa hình người, thân vỏ cây xoắn, rễ phụ buông như tóc và áo choàng, mặt nạ gỗ hiền từ, đèn lồng nhỏ treo trên cành vai.
- **Màu:** `#5a4030` vỏ cây, `#6fae5a` lá, `#ffd27a` đèn, `#2d3b2a`.
- **Vũ khí:** gậy gỗ mọc lá ở đầu.
- **Splash:** dang tay, rễ từ mặt đất vươn lên thành vòm bảo vệ, đom đóm bay quanh.
- **Hiệu ứng:** rễ chui lên khỏi đất; khiên lá xoay; K3 rừng rễ mọc thành vòng tròn.
- **Prompt:** `ancient banyan tree spirit in humanoid form, twisted bark body, hanging aerial roots forming hair and cloak, serene carved wooden mask face, tiny paper lanterns hanging from shoulder branches, leaf-topped wooden staff, arms spread as roots rise from the ground into a protective dome, fireflies`

### 4.4 Hoả Rèn — Thợ Rèn Làng Lò
- **Ngoại hình:** thợ rèn cơ bắp, tạp dề da cháy sém, găng tay sắt, tóc buộc cao, mắt ánh lửa, cánh tay có đường vân kim loại nóng đỏ khi tích Nhiệt.
- **Màu:** `#2a2a2e` sắt đen, `#ff7a1a` lửa, `#ffd166`, `#6b3b1e` da.
- **Vũ khí:** búa rèn lớn, đầu búa nung đỏ, cán quấn da.
- **Splash:** giáng búa xuống đe, tia lửa bắn toé tạo vòng cung, lò rèn rực sau lưng.
- **Hiệu ứng:** vệt búa cam; khiên xỉ sắt đen có vết nứt đỏ; K3 đe khổng lồ bằng lửa rơi xuống.
- **Prompt:** `muscular village blacksmith warrior, scorched leather apron, iron gauntlets, high-tied hair, ember-glowing eyes, glowing molten veins on forearms, giant red-hot forging hammer, slamming the hammer onto an anvil with an arc of sparks, blazing forge behind`

### 4.5 Kiếm Mây — Kiếm Khách Trên Mây
- **Ngoại hình:** kiếm khách thanh mảnh, áo dài xẻ tà trắng xanh, khăn lụa dài bay theo gió, tóc bạc buộc nửa, mặt lạnh lùng, có mảnh mây ngưng tụ quanh chân.
- **Màu:** `#eaf2ff`, `#7fb6ff`, `#2c3e70`, `#c0c8d8` thép.
- **Vũ khí:** thanh kiếm mảnh dài, lưỡi có vân mây.
- **Splash:** đứng trên mây giữa trời trăng, rút kiếm nửa chừng, dải lụa uốn thành đường cong.
- **Hiệu ứng:** 3 vệt lướt màu trắng xanh; khiên kiếm hình vòng cung; K3 một đường chém dài cắt đôi mây.
- **Prompt:** `slender swordsman in flowing white and sky-blue split tunic, long silk scarf fluttering, half-tied silver hair, cold expression, condensed wisps of cloud around his feet, long thin sword with cloud-pattern blade, standing on clouds under a full moon, half-drawing the sword`

### 4.6 Sói Núi — Kẻ Tru Dưới Trăng
- **Ngoại hình:** chiến binh người sói lông xám bạc, bờm dày, giáp da thú và xương, mắt vàng, móng vuốt kim loại.
- **Màu:** `#8c8f99`, `#3a3d48`, `#ffcc33` mắt, `#a33a2a` máu.
- **Vũ khí:** đôi móng vuốt thép gắn trên găng.
- **Splash:** ngửa cổ tru trên vách đá, trăng đỏ phía sau, gió cuốn lông bờm.
- **Hiệu ứng:** vết cào đỏ; sóng tru dạng vòng; K3 hào quang đỏ, mắt để lại vệt sáng khi chạy.
- **Prompt:** `werewolf warrior with silver-grey fur and a thick mane, hide and bone armor, golden eyes, steel claw gauntlets, howling on a cliff edge, huge crimson moon behind, wind whipping the mane`

### 4.7 Bóng Tre — Sát Thủ Rừng Tre
- **Ngoại hình:** sát thủ nữ, áo bó màu lục đậm, khăn che nửa mặt, nón lá tre cắt vát, lá tre khô gắn trên vai áo.
- **Màu:** `#1f3b2a`, `#6fbf73`, `#d8e8b0` lá khô, `#0f1a14`.
- **Vũ khí:** hai dao ngắn hình lá tre.
- **Splash:** lao ra từ rừng tre đêm, thân ẩn một nửa trong lá bay, ánh trăng rọi qua thân tre.
- **Hiệu ứng:** lá tre xanh bay; khi tàng hình để lại vài chiếc lá rơi; đòn kết thúc toả vòng lá.
- **Prompt:** `female assassin in dark green fitted outfit, face half-covered by a cloth mask, angled bamboo conical hat, dried bamboo leaves on shoulders, twin short blades shaped like bamboo leaves, bursting out of a night bamboo forest, body half-hidden in swirling leaves, moonlight through bamboo`

### 4.8 Dơi Đêm — Kẻ Săn Bằng Tiếng Vọng
- **Ngoại hình:** thanh niên tóc đen tím, áo choàng cổ cao có viền như cánh dơi, mắt nhắm (dùng tiếng vọng để "nhìn"), tai đeo khuyên chuông nhỏ.
- **Màu:** `#1b1330`, `#7a4dff`, `#c9b6ff`, `#0a0712`.
- **Vũ khí:** chuông đồng nhỏ và sóng âm; tay phải có móng dài.
- **Splash:** lơ lửng ngược trong hang động, áo choàng mở như cánh, vòng sóng âm tím lan ra.
- **Hiệu ứng:** sóng âm hình nón tím; dấu vọng là vòng sóng nhỏ trên đầu địch; K3 bầy dơi tím xoáy.
- **Prompt:** `young man with black-violet hair, high-collared cloak edged like bat wings, eyes closed, small bell earrings, long clawed right hand, floating upside down in a cave, cloak spread like wings, violet sonic rings spreading outward, swarm of small bats`

### 4.9 Nguyệt Hà — Người Dẫn Sông Trăng
- **Ngoại hình:** pháp sư nữ tóc bạc dài chạm đất, áo lụa xanh đêm có hoạ tiết sóng, vương miện trăng khuyết, dải lụa nước trôi quanh người.
- **Màu:** `#1d2b64`, `#8fd3ff`, `#e8f4ff`, `#c9a24a`.
- **Vũ khí:** không; điều khiển nước bằng tay và dải lụa.
- **Splash:** đứng trên mặt sông phẳng như gương, trăng tròn phía sau, xoáy nước dâng lên quanh chân.
- **Hiệu ứng:** giọt bạc sáng; xoáy nước xanh; K3 sóng lũ dạng tròn hất tung.
- **Prompt:** `sorceress with floor-length silver hair, midnight-blue silk robe with wave patterns, crescent moon crown, ribbons of flowing water orbiting her, standing on a mirror-still river, full moon behind, whirlpool rising around her feet`

### 4.10 Sấm Trống — Tay Trống Gọi Mưa
- **Ngoại hình:** thầy cúng trẻ, mặt vẽ hoạ tiết mây sấm, áo choàng lông vũ, đeo trống đồng nhỏ trước ngực, tóc dựng như có điện.
- **Màu:** `#20304a`, `#5fd0ff` sét, `#d9a441` đồng, `#f1f1f1`.
- **Vũ khí:** trống đồng + dùi phát sét.
- **Splash:** đánh trống giữa trời giông, sét toả xuống thành hình cây, mưa hạt lớn.
- **Hiệu ứng:** tia sét nảy xanh trắng; vòng mây mưa; K3 mây đen theo người, sét đánh ngẫu nhiên.
- **Prompt:** `young shaman drummer, face painted with cloud and thunder motifs, feathered cloak, small bronze drum on his chest, hair standing up with static, striking the drum with a lightning-crackling drumstick, stormy sky with branching lightning, heavy rain`

### 4.11 Hoa Độc — Nàng Sen Đầm Độc
- **Ngoại hình:** thiếu nữ trang phục cánh sen hồng tím, váy lá sen, tóc cài nhụy sen, dây leo quấn tay, đôi mắt xanh lục độc.
- **Màu:** `#b24f8f`, `#6bd36b`, `#2a1a2e`, `#f6c6e0`.
- **Vũ khí:** búp sen phát sáng trên tay.
- **Splash:** ngồi trên lá sen khổng lồ giữa đầm tối, sương độc xanh lục bốc lên, cánh sen bay.
- **Hiệu ứng:** hạt độc xanh lục nổ; dây leo trói; K3 đầm độc với hoa sen nở.
- **Prompt:** `young woman in a pink-violet lotus petal outfit, lotus-leaf skirt, lotus stamens in her hair, vines wrapped around her arms, toxic green eyes, glowing lotus bud in her hand, sitting on a giant lotus leaf in a dark swamp, green poisonous mist rising, floating petals`

### 4.12 Cánh Diều — Cung Thủ Theo Gió
- **Ngoại hình:** cung thủ nam trẻ, áo ngắn kiểu phi công cổ điển, kính bảo hộ đẩy lên trán, khăn quàng dài, lưng đeo diều gấp làm cánh.
- **Màu:** `#2b6cb0`, `#f6ad55`, `#fff5e1`, `#1a202c`.
- **Vũ khí:** cung gỗ tre cong với dây gió phát sáng.
- **Splash:** bay lượn bằng cánh diều trên mái nhà phố cổ, giương cung bắn xuống, đèn lồng bên dưới.
- **Hiệu ứng:** mũi tên kèm vệt gió xoáy; K3 mưa tên từ trên trời có dải gió.
- **Prompt:** `young male archer, short vintage aviator-style jacket, goggles pushed up on forehead, long scarf, folded kite wings on his back, bamboo recurve bow with a glowing wind string, gliding over old-town rooftops with kite wings, aiming downward, lanterns below`

### 4.13 Pháo Hoa — Cô Nàng Pháo Tết
- **Ngoại hình:** cô gái tinh nghịch, áo yếm đỏ phối áo khoác ngắn, tóc hai búi có pháo nhỏ cài, túi đeo đầy pháo, má dính muội.
- **Màu:** `#e53e3e`, `#f6e05e`, `#1a1a2e`, `#ffb3c1`.
- **Vũ khí:** ống phóng pháo bằng tre lớn vác vai.
- **Splash:** ngồi trên nóc nhà, ống phóng chĩa lên trời, pháo hoa nở rực phía sau, cười nháy mắt.
- **Hiệu ứng:** đạn pháo có đuôi lửa; nổ hoa giấy đỏ vàng; K3 quả pháo lớn bay xuyên bản đồ để lại vệt sáng.
- **Prompt:** `mischievous girl in a red traditional bodice with a short jacket, twin hair buns with small firecrackers tucked in, satchel full of fireworks, soot on her cheek, large bamboo firework launcher on her shoulder, sitting on a rooftop aiming at the sky, fireworks blooming behind, winking`

### 4.14 Trạng Nỏ — Xạ Thủ Nỏ Đồng
- **Ngoại hình:** xạ thủ nữ lạnh lùng, áo giáp nhẹ đồng xanh (patina), mũ trụ nhỏ cánh chuồn, áo choàng ngắn, kính một mắt bằng đồng.
- **Màu:** `#2f6f6a` đồng rỉ, `#d4a95f`, `#1e2a2a`, `#e8e0c8`.
- **Vũ khí:** nỏ liên châu bằng đồng, lẫy chạm khắc.
- **Splash:** quỳ một gối trên tường thành, ngắm nỏ qua kính một mắt, ba mũi tên sáng lên trong khe nỏ.
- **Hiệu ứng:** tên xuyên có vệt đồng xanh; bẫy tre hình chữ V; K3 ba mũi tên toả hình quạt.
- **Prompt:** `stern female crossbow sharpshooter, light verdigris-bronze armor, small winged helmet, short cape, bronze monocle scope, ornate bronze repeating crossbow, kneeling on a fortress wall aiming through the monocle, three glowing bolts loaded`

### 4.15 Lồng Đăng — Người Giữ Đèn
- **Ngoại hình:** cô gái dịu dàng, áo dài trắng ngà viền vàng, tóc đen dài thắt dải lụa, cầm đèn lồng giấy lớn phát sáng ấm, đom đóm bay quanh.
- **Màu:** `#fff4e0`, `#ffc15e`, `#e0513b`, `#2b2b52`.
- **Vũ khí:** đèn lồng treo trên cán gỗ dài.
- **Splash:** đứng giữa dòng sông đầy đèn hoa đăng, giơ đèn lên, ánh sáng lan thành vòng bảo vệ.
- **Hiệu ứng:** quả đèn trôi; khiên ánh sáng vàng ấm; K3 hàng chục đèn lồng nhỏ bay lên quanh đội.
- **Prompt:** `gentle young woman in an ivory ao-dai-inspired long tunic with gold trim, long black hair tied with a silk ribbon, holding up a large glowing paper lantern on a long wooden pole, fireflies around her, standing in a river full of floating flower lanterns, warm light spreading into a protective ring`

### 4.16 Mộc Cầm — Nhạc Sư Đàn Tranh
- **Ngoại hình:** nhạc sư nam trẻ, áo the dài màu trà, khăn đóng, đàn tranh bay lơ lửng trước người, dây đàn phát sáng.
- **Màu:** `#6b4f3a`, `#e9d8a6`, `#7ad3c6` dây đàn, `#2d2a32`.
- **Vũ khí:** đàn tranh lơ lửng.
- **Splash:** ngồi xếp bằng giữa rừng trúc, gảy đàn, nốt nhạc sáng bay thành dải, lá trúc rơi.
- **Hiệu ứng:** nốt nhạc xanh ngọc; dây đàn nối mục tiêu; K3 sóng âm câm lặng dạng vòng trong suốt.
- **Prompt:** `young male musician in a long tea-brown gauze robe and traditional turban, floating zither in front of him with glowing strings, seated cross-legged in a bamboo grove, plucking the strings, luminous music notes streaming out, falling bamboo leaves`

## 5. Model giữ chỗ (Alpha)
- Dùng **một bộ nhân vật CC0 có sẵn animation** (tải thủ công, kiểm tra giấy phép CC0 trên trang tải, ghi vào `LICENSES.md`). Đổi tên clip cho khớp bảng 02 §13.5 bằng cách khai báo bảng ánh xạ trong `hero.art.json` (`"clipMap": {"Run": "Running_A"}`), không cần sửa file GLB.
- Mỗi tướng giữ chỗ: chọn một nhân vật trong bộ, **nhuộm màu** theo `palette` (đổi `material.color`), gắn **vũ khí đặc trưng** dựng từ khối cơ bản Three.js (búa, cung, đèn lồng, cột đá, trống…) vào xương tay.
- Nếu chưa tải bộ CC0: `render/placeholder/capsule.js` dựng nhân vật từ khối (thân viên nang, đầu cầu, vũ khí), nhún khi chạy, vung vũ khí khi đánh. Luôn có sẵn, không cần file ngoài.
- Khi có model thật: chỉ cần đặt file vào `assets/heroes/<id>/`; `assets.js` ưu tiên model thật, thiếu mới dùng giữ chỗ.

## 6. Bản đồ, công trình, lính
- **Trụ:** tháp đèn đá nhiều tầng, đỉnh là ngọn đèn lớn phát sáng theo màu đội; khi yếu máu, đèn chập chờn; khi vỡ, sụp thành đống đá + đèn tắt.
- **Nhà chính (Đèn Cả):** đèn lồng khổng lồ trên bệ đá hình hoa sen, ánh sáng rọi lên trời.
- **Lính Kiếm:** người giấy bồi cầm kiếm gỗ; **Lính Cung:** người giấy cầm cung; **Xe Đá:** xe gỗ bắn đá; **Lính Đèn Lớn:** người rơm khổng lồ mang đèn.
- **Quái rừng:** rùa ngọc, kỳ đà lửa, đom đóm, heo rừng nanh bạc, quạ đá, nhện đất. **Thuồng Luồng:** mãng xà sông vảy xanh bạc có râu dài; **Hộ Vệ Đèn:** người đá khổng lồ mang đèn trên đầu.
- **Hiệu ứng chung:** vàng khi kết liễu (đồng xu nhỏ bay lên), lên cấp (vòng sáng vàng), hồi sinh (cột sáng).
