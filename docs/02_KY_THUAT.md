# 02 — Kỹ thuật

## 1. Nền tảng
- HTML5 + CSS + JavaScript ES modules, **không build**. Thư viện duy nhất: **Three.js r186**, tải về đặt trong `lib/three/` (không dùng CDN khi chạy thật, để PWA chạy offline). Nạp bằng import map:
```html
<script type="importmap">
{ "imports": { "three": "./lib/three/build/three.module.js",
                "three/addons/": "./lib/three/examples/jsm/" } }
</script>
```
  Từ r186 không còn bản minified; `three.module.js` tự import `three.core.js` nên phải chép cả thư mục `build/`.
- **Trong trận:** 2 lớp chồng nhau: canvas `#world` do Three.js `WebGLRenderer` vẽ (bản đồ 3D, nhân vật, hiệu ứng) và canvas 2D `#hud` (joystick, nút, minimap, thanh máu, số sát thương). Chi tiết ở §13.
- **Ngoài trận** (sảnh, chọn tướng, xếp hạng, phần thưởng): **DOM + CSS**, vì dễ làm chữ sắc nét, cuộn, hiệu ứng chuyển cảnh. Đặt trong `#ui-root` phủ trên canvas.
- Âm thanh: Web Audio (tổng hợp ở Alpha, thay bằng file âm thanh ở 1.0).
- Màn ngang. Khi xoay dọc hiện lớp phủ "Xoay ngang thiết bị". Thử `screen.orientation.lock('landscape')` sau khi vào toàn màn hình.
- CSS: `touch-action: none; user-select: none; overscroll-behavior: none;` trên body khi ở trong trận.
- Độ phân giải: `renderer.setPixelRatio(min(devicePixelRatio, 1.5))` ở mức Cao, 1.0 ở mức Thấp. Có 3 mức chất lượng (xem §13.8).

## 2. Hiệu năng mục tiêu
- 60fps trên điện thoại tầm trung (Snapdragon 6-series / Helio G9x) ở mức chất lượng Trung bình; tối thiểu 30fps ổn định ở mức Thấp trên máy yếu. Tình huống nặng nhất: giao tranh 5v5 với 10 tướng, ~60 lính, ~40 đạn, ~200 hạt.
- Ngân sách mỗi frame: **≤ 150 draw call**, **≤ 400k tam giác** hiển thị, **≤ 12 skinned mesh** cập nhật xương đầy đủ (còn lại cập nhật thưa hơn, §13.6).
- Không cấp phát object trong vòng lặp nóng: dùng **object pool** cho đạn, hạt, số sát thương, lính.
- Truy vấn không gian bằng **spatial hash** ô 400 đơn vị.
- Quyết định AI rải đều: mỗi bot quyết định mỗi 0.3–0.5s, lệch pha theo id.

## 3. Vòng lặp
- Mô phỏng **cố định 30 tick/giây** (`TICK = 1/30`), render nội suy bằng `prevPos` và `pos` với `alpha = accumulator / TICK`.
- Giới hạn `accumulator` tối đa 250ms (tránh xoáy chết khi tab bị treo).
- Tạm dừng khi `visibilitychange` ẩn (chế độ offline).

```
frame(dt):
  acc += min(dt, 0.25)
  while acc >= TICK:
    tick++
    input.flush() -> commands của người chơi
    ai.update()           // bot tướng, lính, trụ, quái sinh commands
    commands.apply()
    skills.update(); status.update(); projectiles.update()
    movement.update(); combat.update()
    vision.update() (mỗi 3 tick)
    objectives.update(); economy.update(); match.update()
    world.cleanup()
    acc -= TICK
  render(alpha)
```

## 4. Cấu trúc thư mục

```
/index.html
/manifest.webmanifest
/sw.js
/assets/            (ảnh, âm thanh, LICENSES.md)
/src/main.js
/src/core/
  loop.js  rng.js  math.js  pool.js  events.js  save.js  i18n.js
/src/sim/                      # mô phỏng, KHÔNG được chạm DOM/canvas
  world.js  spatial.js  commands.js  stats.js  damage.js
  movement.js  navgrid.js  pathfind.js
  combat.js  targeting.js  skills.js  skillTypes/*.js  status.js  projectiles.js  zones.js
  minions.js  towers.js  jungle.js  objectives.js
  vision.js  economy.js  items.js  spells.js  match.js  scoring.js
/src/ai/
  heroBot.js  teamBrain.js  botSkills.js  draftBot.js
/src/data/
  balance.js  maps/arena5v5.js  maps/duel1v1.js
  heroes/*.js (mỗi tướng 1 file) heroes/index.js
  items.js  spells.js  charms.js  ranks.js  rewards.js  missions.js
/lib/three/                    # Three.js r186 (build/ + examples/jsm/ cần dùng)
/src/render/                   # chỉ tầng này được import 'three'
  renderer.js  scene.js  camera.js  lights.js  quality.js
  assets.js (nạp + cache GLB, clone bằng SkeletonUtils)  mapBuilder.js
  unitView.js (entity sim ↔ object 3D)  animator.js  placeholder/*.js
  materials.js (toon/rim, màu đội)  shadows.js (bóng tròn)  instancing.js
  vfx/*.js  indicators.js  fog.js  project.js (3D → toạ độ màn hình cho HUD)
/src/showcase/                 # cảnh 3D riêng cho sảnh, chọn tướng, xếp hạng
  showcase.js  turntable.js
/src/hud/
  hud.js  joystick.js  skillButtons.js  minimap.js  scoreboard.js  shopQuick.js  announcer.js
/src/ui/                       # DOM screens
  router.js  screens/*.js  components/*.js  styles/*.css
/src/audio/
  audio.js  sfx.js
```

**Quy tắc tầng:** chỉ `render/` và `showcase/` được import `three`. `sim/` không import từ `render/`, `hud/`, `ui/`. Render chỉ đọc trạng thái. Điều này giữ khả năng chạy mô phỏng trên server Node.js về sau.

## 5. Entity

```js
{
  id, kind: 'hero'|'minion'|'tower'|'core'|'monster'|'projectile'|'zone'|'trap'|'ward',
  team: 0 | 1 | 2,          // 0 Xanh, 1 Đỏ, 2 trung lập
  pos:{x,y}, prevPos:{x,y}, facing: rad, radius,
  alive, hp, maxHp, mana, maxMana, shield: [{amount, expiresTick, sourceId}],
  base: {...chỉ số gốc}, stats: {...chỉ số cuối, tính lại khi dirty},
  statuses: [], cooldowns: {s1, s2, s3, spell, recall},
  // hero
  heroId, level, xp, gold, items:[6], skillLevels:{s1,s2,s3}, spellId, charmPage,
  kills, deaths, assists, damageToHeroes, damageTaken, healingDone, goldEarned, cs,
  respawnTick, lastDamagedByHeroes: Map<id, tick>
}
```

## 6. Command

```js
{ type:'move', dir:{x,y} }                    // joystick; {0,0} = đứng
{ type:'moveTo', pos:{x,y} }                  // bot, chạm minimap
{ type:'attack', preferTarget?: id }           // nút đánh
{ type:'cast', slot:'s1'|'s2'|'s3'|'spell', aim:{x,y}|null, targetId? }
{ type:'levelSkill', slot }
{ type:'buy', itemId } | { type:'sell', slot }
{ type:'recall' } | { type:'cancel' }
{ type:'ping', kind:'attack'|'retreat'|'gather', pos }
```
Người chơi: `input.js` → Command. Bot: `heroBot.js` → Command. Online sau này: Command đi qua mạng.

## 7. Chỉ số và công thức

Chỉ số: `maxHp, hpRegen (/5s), maxMana, manaRegen (/5s), atk, ap, armor, mr, atkSpeed, moveSpeed, range, critChance, critDmg (mặc định 1.75), lifesteal, spellVamp, armorPenFlat, armorPenPct, magicPenFlat, magicPenPct, cdr (tối đa 40%), tenacity, healPower`.

- Chỉ số cuối = `(gốc + tăng/cấp × (cấp−1) + đồ + bùa) × (1 + %buff) + buff phẳng`.
- Tốc đánh: `atkSpeed = baseAS × (1 + ASPerLevel×(cấp−1) + %AS từ đồ/bùa)`, tối đa 2.5 đòn/s.
- Giáp hiệu dụng = `max(0, armor × (1 − armorPenPct) − armorPenFlat)`.
- Sát thương vật lý nhận = `raw × 100 / (100 + giáp hiệu dụng)`. Phép tương tự với MR.
- Sát thương chuẩn không giảm.
- Chí mạng chỉ áp cho đòn đánh thường (trừ khi kỹ năng ghi `canCrit`).
- Kháng hiệu ứng `tenacity` giảm thời gian choáng, làm chậm, trói, câm lặng; không giảm hất tung.
- Khiên hấp thụ trước máu, khiên hết hạn sớm nhất bị trừ trước.
- Hồi máu nhận = `heal × (1 + healPower của người hồi) × (1 − giảm hồi máu của mục tiêu)`.
- Sát thương từ trụ và nhà chính là vật lý.

### Tính hạ gục và hỗ trợ
- Hạ gục thuộc về tướng gây đòn kết liễu. Nếu lính/trụ/quái kết liễu: thuộc tướng địch gây sát thương gần nhất trong 10s, nếu không có thì "Hạ gục bởi trụ/lính".
- Hỗ trợ: tướng gây sát thương, hoặc dùng hiệu ứng khống chế lên nạn nhân, hoặc hồi máu/khiên cho người hạ gục trong 10s trước đó.

## 8. Tìm đường
- **Nav grid** ô 80 đơn vị, tạo từ vật cản trong file bản đồ lúc tải.
- A* 8 hướng + làm mượt đường (string pulling / line-of-sight check).
- Lính dùng waypoint theo đường, chỉ A* khi đuổi mục tiêu lệch đường.
- Tướng: A* khi có `moveTo`; joystick đi thẳng với trượt dọc tường (wall sliding).
- Tính lại đường tối đa mỗi 0.5s mỗi entity; cache theo (ô đầu, ô cuối).
- Va chạm entity: hình tròn, tách nhẹ (soft separation). Tướng không bị lính chặn cứng.

## 9. Tầm nhìn
- Lưới tầm nhìn ô 100 đơn vị, cập nhật mỗi 3 tick cho mỗi đội.
- Tầm nhìn: tướng 1200, lính 800, trụ 1000, nhà chính 1200, mắt (ward) 900.
- **Bụi cỏ:** đơn vị trong bụi chỉ bị đội địch thấy nếu có đơn vị địch **đứng trong cùng bụi**, hoặc có mắt soi bụi, hoặc vừa tấn công (lộ 1s).
- Tường chặn tầm nhìn (raycast thô theo ô).
- Đơn vị địch ngoài tầm nhìn: không vẽ, không thể chọn làm mục tiêu, không hiện trên minimap.
- Bot chỉ được dùng thông tin mà đội của nó nhìn thấy (không "nhìn xuyên sương").

## 10. Lưu dữ liệu
- `localStorage` key `lantern_save_v1`. Có trường `version` và hàm migrate.
- Nội dung: hồ sơ, tiền tệ, tướng đã mở, bảng bùa, cài đặt, hạng + sao + điểm Hào Quang, lịch sử 20 trận, nhiệm vụ, vật phẩm trong kho.
- Ghi mỗi khi kết thúc trận và khi đổi cài đặt. Bọc try/catch; nếu lỗi thì chạy với dữ liệu tạm.
- Cài đặt có nút **Xuất/Nhập mã lưu** (base64 JSON) để chuyển máy.

## 11. RNG
`mulberry32(seed)`. Seed trận = số nguyên sinh lúc tạo trận, ghi vào lịch sử để phát lại. Hiệu ứng hình ảnh (hạt) dùng RNG riêng không ảnh hưởng mô phỏng.

## 12. Đa ngôn ngữ
Mọi chữ hiển thị đi qua `i18n.js` (`t('ui.ready')`). Mặc định tiếng Việt; chừa sẵn tiếng Anh.

## 13. Render 3D (Three.js)

### 13.1 Toạ độ và đơn vị
- Mô phỏng vẫn **2D** trên mặt đất: `pos.x`, `pos.y` (xem các file trước). Render đổi sang 3D: `X = pos.x`, `Z = pos.y`, `Y` = độ cao (hất tung, nhảy, đạn bay).
- **1 đơn vị thế giới = 1 cm** trong model. Bản đồ 5v5 = 64 m × 64 m. Tướng cao 180–260 (tuỳ tướng, đỡ đòn to hơn), lính 110–140, trụ 700–900, nhà chính 1100.
- Model glTF xuất từ Blender dùng mét; `assets.js` nhân `scale = 100` lúc nạp, hoặc đọc `extras.scale` trong file.
- Hướng nhìn của tướng: `rotation.y = -facing + π/2` (quy ước chuẩn hoá trong `unitView.js`; model đứng nhìn về **+Z**).

### 13.2 Camera
- `PerspectiveCamera`, FOV dọc 38°, góc nghiêng 55° so với mặt đất, khoảng cách 2300 (5v5) / 2000 (1v1). Đội Đỏ nhìn bản đồ xoay 180° để căn nhà mình luôn ở dưới trái màn hình.
- Theo tướng với độ trễ mượt (lerp 12/s), lệch nhẹ về phía hướng joystick 150.
- Khi kéo minimap: camera trượt tới điểm; thả ra: quay về tướng trong 0.25s.
- Rung camera nhẹ khi trúng chiêu cuối/khống chế cứng (tắt được trong Cài đặt).

### 13.3 Ánh sáng và vật liệu
- **Không dùng bóng đổ thời gian thực cho đơn vị.** Mỗi đơn vị có **bóng tròn** (plane + texture mờ, dùng instancing).
- Bản đồ: ánh sáng **nướng sẵn (baked)** trong Blender thành lightmap/texture màu, vật liệu `MeshBasicMaterial` hoặc `MeshLambertMaterial` để rẻ.
- Nhân vật: `MeshStandardMaterial` (hoặc `MeshToonMaterial` nếu chọn phong cách toon), 1 `HemisphereLight` + 1 `DirectionalLight` + **environment map** nhỏ (PMREM từ ảnh HDR 256px, tối ưu cho mobile).
- **Viền sáng (rim light)** màu đội qua `material.onBeforeCompile` (thêm `fresnel` vào `emissive`): đồng minh ngọc lam, địch đỏ son, bản thân vàng nhạt. Chung một hàm trong `materials.js`.
- Hiệu ứng trúng đòn: nháy trắng 80ms (tăng emissive).
- Tàng hình: độ trong suốt 35% với đồng đội, không vẽ với địch.

### 13.4 Nạp model (`assets.js`)
- `GLTFLoader` + `KTX2Loader` (texture nén) + `MeshoptDecoder`. File chuẩn: `.glb`.
- Cache theo đường dẫn; mỗi entity dùng `SkeletonUtils.clone()` (chung geometry và texture, riêng xương).
- **Tải trước** toàn bộ model của trận trong màn tải trận (07 §8); % tải = số file xong / tổng.
- Thiếu file hoặc lỗi nạp → dùng **model giữ chỗ** (`render/placeholder/`), không được làm hỏng trận.
- Giải phóng (`dispose`) geometry/texture/material khi rời trận.

### 13.5 Animation (`animator.js`)
Tên clip bắt buộc trong mọi GLB tướng (xem 11 §6):

| Clip | Dùng khi | Ghi chú |
|---|---|---|
| `Idle` | đứng yên | lặp |
| `Run` | di chuyển | lặp; `timeScale = moveSpeed / runRefSpeed` (khai báo trong file tướng) |
| `Attack1`, `Attack2` | đánh thường, xen kẽ | `timeScale` theo tốc đánh để clip vừa khít thời gian 1 đòn |
| `Cast1`, `Cast2` | K1, K2 | |
| `Ult` | K3 | |
| `Death` | chết | chạy 1 lần, giữ khung cuối, mờ dần sau 2s |
| `Recall` | về nhà | lặp |
| `Victory` | màn chọn tướng, kết quả | tuỳ chọn |
| `Showcase` | sảnh/chọn tướng | tuỳ chọn, dùng `Idle` nếu thiếu |

- Chuyển clip bằng `crossFadeTo` 0.12s. Clip hành động (Attack/Cast/Ult) phát 1 lần rồi quay về Idle/Run.
- Animation **chỉ để nhìn**: thời điểm gây sát thương vẫn do mô phỏng quyết định. Nếu lệch, chỉnh `hitTime` trong file tướng cho khớp hình, không sửa mô phỏng theo hình.
- Lính/quái nhỏ: dùng **1 model + animation đơn giản** và tối đa 3 biến thể; có thể dùng `InstancedMesh` + vertex animation texture ở mức Thấp (tuỳ chọn, làm sau).

### 13.6 Hiệu năng
- Tướng ngoài khung nhìn: không cập nhật mixer. Tướng xa camera > 2500: cập nhật mixer 15 lần/s thay vì mỗi frame.
- Mỗi tướng có **LOD**: `LOD0` (đầy đủ, dùng ở sảnh và cận cảnh), `LOD1` (trong trận). File chỉ chứa LOD1 cũng được.
- Trụ, cây, đá, đèn lồng trang trí: `InstancedMesh`.
- Hạt: `Points` hoặc quad instancing, pool cố định, blending cộng (`AdditiveBlending`).
- Không tạo `Material` mới trong vòng lặp; dùng `material.clone()` một lần lúc spawn.
- Đo bằng `renderer.info` trong chế độ `?debug=1` (draw call, tam giác, texture).

### 13.7 Lớp HUD trên cảnh 3D
- Thanh máu, tên, số sát thương vẽ trên canvas `#hud` 2D: dùng `project.js` chiếu điểm đầu nhân vật (`Y = chiều cao model + 40`) ra toạ độ màn hình mỗi frame.
- Chỉ báo ngắm, vòng tầm, vùng AoE: vẽ **trong cảnh 3D** bằng mesh phẳng sát mặt đất (`indicators.js`) để đúng phối cảnh.
- Sương mù: texture tầm nhìn cập nhật mỗi 3 tick, phủ lên mặt đất bằng shader, và ẩn object của địch ngoài tầm nhìn.

### 13.8 Mức chất lượng (`quality.js`)
| Mục | Thấp | Trung bình | Cao |
|---|---|---|---|
| Pixel ratio | 1.0 | 1.25 | 1.5 |
| Khử răng cưa | tắt | tắt | MSAA 4x |
| Texture nhân vật | 512 | 1024 | 1024 (sảnh 2048) |
| Hạt | 40% | 70% | 100% |
| Bloom (hậu kỳ) | tắt | tắt | bật nhẹ |
| FPS | 30 | 60 | 60 |

Lần chạy đầu: đo 3s FPS ở màn tải, tự chọn mức phù hợp; người chơi đổi lại được trong Cài đặt.

### 13.9 Cảnh trưng bày (`showcase/`)
- Một `WebGLRenderer` riêng (hoặc dùng lại renderer chính khi không ở trong trận) vẽ phía sau DOM UI ở sảnh, chọn tướng, xếp hạng.
- Nhân vật LOD0, texture 2048, ánh sáng 3 điểm (key ấm, fill lạnh, rim theo màu tướng), sàn phản chiếu nhẹ hoặc đĩa bệ phát sáng, hạt đèn trời bay.
- Vuốt ngang để **xoay 360°**, chạm đúp để phát `Showcase`/`Victory`. Khi chọn tướng khác: model cũ mờ đi, model mới hiện ra với hiệu ứng ánh sáng.
- Khi chưa có model đẹp: dùng ảnh splash 2D (nếu có) hoặc model giữ chỗ.

### 13.10 Trình duyệt và WebGPU
- Dùng `WebGLRenderer` (WebGL 2) để tương thích rộng nhất, kể cả trình duyệt trong app (Facebook, Zalo).
- `WebGPURenderer` của Three.js có cơ chế tự lùi về WebGL 2 nhưng dùng hệ vật liệu khác (TSL); chỉ cân nhắc sau 1.0.
- Mất ngữ cảnh WebGL (`webglcontextlost`): tạm dừng trận, hiện "Đang khôi phục đồ hoạ…", nạp lại tài nguyên khi `webglcontextrestored`.
