# 12 — Đòn đánh thường: nghiên cứu, hiện trạng, thiết kế (16/11/2026)

Tài liệu của đợt rà soát đòn đánh thường. Ba phần: (1) các game MOBA chuyên nghiệp làm đòn đánh thường thế nào và vì sao, (2) vòng đời một đòn
đánh trong mã của game này + những chỗ đã đo được là hỏng, (3) luật hiện hành sau khi sửa và nơi chỉnh số. Kiểm thử: `tools/t_basic.mjs`.

> **Nguồn.** Không có mã nguồn của Liên Quân / Vương Giả Vinh Diệu. Phần nghiên cứu dựa trên hành vi quan sát được trong game, các wiki công khai
> của thể loại (LoL: *Basic attack*; Dota 2: *Attack backswing*), bài hướng dẫn huỷ hoạt ảnh của Dignitas và các bài hướng dẫn cài đặt điều
> khiển của MOBA di động (ưu tiên mục tiêu: % máu thấp nhất / máu thấp nhất / gần nhất). **Không tìm được nguồn công khai nào mô tả riêng việc
> huỷ vung của Liên Quân** — chỗ nào là suy từ thể loại nói chung thì ghi rõ. Không chép số liệu của game nào.

## 1. Mười lăm cơ chế — thể loại làm thế nào, và game này làm gì

| # | Cơ chế | Game chuyên nghiệp làm thế nào | Vì sao quan trọng | Lỗi hay gặp | Trong game này |
|---|---|---|---|---|---|
| 1 | Chọn mục tiêu | Bấm Đánh = đánh mục tiêu hợp lệ theo luật người chơi đặt (gần nhất / ít máu / % máu thấp nhất), mục tiêu khoá thắng mọi luật; MOBA di động có thêm nút riêng cho lính và trụ. | Người chơi phải đoán được tướng sẽ đánh ai. | Chọn lại mỗi khung hình → nhảy mục tiêu; để lính "cướp" đòn khi đang đuổi tướng. | `combat.js updateCombat` → `targeting.js`: khoá → đang đuổi → tướng vừa đánh → luật `targetBy` → **con đang đánh dở cùng loại** → gần nhất. Nút Ăn lính / Đẩy trụ: `pickByMode`. |
| 2 | Tầm đánh | Tính từ tâm người đánh tới **mép** mục tiêu; bắt đầu đòn chỉ khi trong tầm. | Tướng to không được "ngoài tầm" khi nhìn thấy đã chạm. | So tâm–tâm; mỗi chỗ một công thức. | Mọi chỗ dùng `dist − bán kính mục tiêu ≤ tầm`. |
| 3 | Quay mặt | Tướng quay về mục tiêu trước / trong lúc vung; mặt bám mục tiêu tới lúc chạm. | Chém một hướng mà trúng hướng khác là lỗi dễ thấy nhất. | Mô phỏng quay tức thì nhưng hình vẫn nhìn hướng cũ; hoặc quay mượt nhưng sát thương ra trước khi quay xong. | Mô phỏng đặt `facing` về mục tiêu lúc bắt đầu, bám theo suốt lúc vung (`movement.js`) và lúc chạm; phần vẽ quay mượt 55 rad/s khi ra đòn (`unitView.js`). |
| 4 | Vung → chạm | Mỗi đòn có thời gian vung (wiki LoL: tính theo % nhịp đánh); sát thương ở cuối thời gian vung, không ở đầu. | Cho đối thủ một khoảng phản ứng; khớp hình với số. | Trừ máu ngay khi bấm; hình và số lệch nhau. | `basicAttack.delay` riêng từng tướng (0,20–0,36 giây, tối đa 80% nhịp đánh); `fire()` chạy đúng tick đó; animator uốn clip để tư thế chạm rơi đúng lúc. |
| 5 | Đạn vs trúng ngay | Cận chiến: trúng tại lúc chạm. Đánh xa: thả đạn lúc chạm, sát thương khi đạn tới; đạn đánh thường bám mục tiêu. | Đánh xa có thêm thời gian bay — né được bằng "không thể chọn", không né được bằng đi bộ. | Đạn bay thẳng trượt mục tiêu đang chạy; đạn sống mãi khi mục tiêu biến mất. | `projectiles.js`: đạn `homing`, tốc độ riêng từng tướng (1 700–2 200), tan khi mục tiêu chết / **thành không thể chọn**. |
| 6 | Trúng cận chiến | Đòn đã nhắm mục tiêu thì trúng mục tiêu đó — nhưng chỉ khi lúc chạm nó còn hợp lệ và còn trong tầm với (có khoảng dư). | "Nhìn thấy trúng thì phải trúng", "đã lướt đi thì không được trúng". | Đã vung là chắc chắn trúng dù mục tiêu đã ở bên kia màn hình; hoặc ngược lại, kiểm tầm quá chặt nên đi bộ cũng thoát. | `targeting.js strikeMiss`: lúc chạm, mục tiêu phải sống, chọn được, và (cận chiến) trong tầm + `BASIC.leash`. |
| 7 | Huỷ đòn | Wiki LoL / Dota 2: huỷ trong lúc vung ⇒ không có sát thương, nhịp đánh được trả lại; sau lúc chạm (thu đòn) thì huỷ tự do — nền của "đánh rồi chạy". | Không bị phạt oan một nhịp đánh khi đòn không thành. | Đòn hỏng vẫn tính trọn hồi đòn. | Người chơi không tự huỷ lúc vung (đứng yên tới lúc chạm — quyết định 16/10, giữ nguyên); đòn **bị** huỷ (mục tiêu chết / mất, bị khống chế) thì `cancelSwing` trả nhịp sau `BASIC.retry`. Sau lúc chạm đi lại được ngay. |
| 8 | Tốc đánh | Nhịp = 1 / tốc đánh; có trần; buff / debuff đổi nhịp ngay từ đòn kế. | DPS đúng với chỉ số. | Làm tròn sai, đòn chồng nhau ở tốc đánh cao. | `attackReady = lúc bắt đầu + T(1 / atkSpeed)`, trần 2,5 đòn/giây (`stats.js`); thời gian vung ≤ 80% nhịp nên không chồng. |
| 9 | Bám / đổi mục tiêu | Giữ mục tiêu đang đánh; đổi khi nó chết / mất, khi người chơi chọn khác, hoặc khi có mục tiêu ưu tiên hơn hẳn. | Tránh rải sát thương. | Đổi vì hai mục tiêu vừa đổi thứ tự khoảng cách / % máu. | Tướng: `lastAtk` (assist); lính / quái / trụ: bám con đang đánh dở cùng loại (`BASIC.stick`). |
| 10 | Phản hồi trúng đòn | Số sát thương, nháy sáng, khựng ngắn, tiếng trúng; đòn **không** gây sát thương cũng phải có chữ (trượt / né / miễn nhiễm). | Người chơi đọc được kết quả mà không nhìn thanh máu. | Hiệu ứng trúng phát ở đòn trượt; đòn trượt không báo gì. | Đã có: số bay, nháy trắng, khựng khi trúng, giật camera, tiếng theo vũ khí. **Thêm:** chữ "Trượt" / "Né" / "Miễn nhiễm" (`hud.js`). |
| 11 | Di chuyển khi đánh | Bấm Đánh khi địch ngay ngoài tầm: tự đi tới rồi đánh; kéo cần là thôi. Đánh xa dừng ở mép tầm. | Không phải tự căn từng bước chân. | Đuổi mãi không dừng; đứng ngoài tầm vung vào không khí; đuổi được vài giây rồi bỏ. | `assist.js` (15/11) + sửa đợt này: đang giữ Đánh thì bám theo cả trong lúc chờ nhịp, đuổi mà còn đánh trúng thì không bỏ cuộc. |
| 12 | Ưu tiên mục tiêu | Tướng > lính > công trình > quái theo ngữ cảnh; người chơi chỉnh được. | Đúng ý trong giao tranh lẫn lúc ăn lính. | Một luật cứng cho mọi tình huống. | Cài đặt "Lựa chọn mục tiêu" (lệnh `targetBy`), ba nút Đánh / Ăn lính / Đẩy trụ, chạm chọn mục tiêu. |
| 13 | Máy chủ quyết định | Máy khách chỉ gửi **ý định** (bấm / thả, mục tiêu ưu tiên); sát thương do mô phỏng có thẩm quyền tính. | Chống gian lận, mọi người thấy cùng kết quả. | Máy khách gửi "tôi đã trúng X". | Lockstep: lệnh `attack` qua `sanitizeCommand` (chỉ giữ `on` / `mode` / `preferTarget`), mọi máy + máy chủ cùng chạy `sim/`. |
| 14 | Phản hồi tức thì khi có trễ | Hình / tiếng phản hồi ngay ở máy mình, kết quả chờ xác nhận; bộ đệm thao tác để cú bấm sớm không bị nuốt. | Trễ 100–200 ms vẫn thấy "ăn tay". | Bấm trong lúc bận là mất lệnh. | Dự đoán chuyển động tướng mình (`session.lead`); bộ đệm chiêu 0,3 giây (15/11); **thêm:** bộ đệm cú chạm nút Đánh. |
| 15 | Trộn hoạt ảnh | Chuyển nhanh vào clip đánh, tư thế chạm trùng lúc gây sát thương, thu đòn nhường cho chạy. | Hình không được kéo trễ lối chơi. | Chờ clip hết mới cho đi; sát thương lệch tư thế chạm. | `render/animator.js` (02 §13.5) — không đổi ở đợt này; hoạt ảnh chỉ đọc sự kiện `attack` (kèm `delay`). |

## 2. Vòng đời một đòn đánh trong mã — và chỗ từng hỏng

```
NÚT ĐÁNH (hud/skillButtons.js)  bấm → lệnh { attack, on: true, mode?, preferTarget? } ; thả → { attack, on: false }
   │  (online: lệnh lên máy chủ, về mọi máy cùng một tick — net/session.js, protocol.js sanitizeCommand)
   ▼
commands.js   e.attacking / preferTarget / attackMode ; cú chạm chưa ra đòn → giữ hộ 0,3 giây (atkOnce)
   ▼
combat.js updateCombat (mỗi tick, sau di chuyển)
   ├─ chọn mục tiêu trong tầm (targeting.js)                 ── không có ai ──▶ assist.js: đi tới (e.steer) / vung vào khoảng không
   ├─ KHỞI ĐỘNG: attackReady = nay + 1/tốc đánh ; sự kiện 'attack' { delay } → animator + tiếng vung
   ├─ VUNG: movement.js giữ tướng đứng yên, mặt bám mục tiêu
   ▼
fire() đúng tick `delay`
   ├─ strikeMiss? (chết / không thể chọn / cận chiến quá tầm với / mình bị khống chế) ──▶ cancelSwing: trả nhịp, sự kiện 'attackMiss'
   ├─ cận chiến: resolveHit → damage.js dealDamage → sự kiện 'damage' (số bay, nháy, khựng, tiếng trúng)
   └─ đánh xa: projectiles.js thả đạn bám mục tiêu → tới nơi: resolveHit ; mục tiêu chết / không thể chọn giữa đường: đạn tan
```

Đo trên bản `c4b2425` (trước khi sửa), bản đồ 1v1 trống, tướng không bùa / đồ (`tools/t_basic.mjs` giữ lại từng phép đo):

| Tình huống | Trước | Sau |
|---|---|---|
| Cận chiến đang vung, mục tiêu tốc biến đi (cách 1 050 lúc đòn chạm) | vẫn trúng | trượt, hiện "Trượt" |
| Cận chiến đang vung, chính người đánh bị dời đi 900 | vẫn trúng | trượt |
| Mục tiêu thành "không thể chọn" (đang nhảy) giữa lúc vung / khi đạn đang bay | vẫn mất máu | trượt / đạn tan |
| Mục tiêu chết giữa lúc vung → thời gian tới đòn trúng mục tiêu kế bên | 1,63 giây | 0,57 giây |
| Bị choáng 0,3 giây giữa lúc vung → thời gian tới đòn kế | 1,63 giây | 0,57 giây |
| Giữ Đánh đuổi mục tiêu chạy bằng 55% tốc độ mình, 11 giây | 3 đòn trúng rồi **đứng lại** (cách 1 521) | 8 đòn, bám ở đúng tầm đánh |
| Bấm–thả nút Đánh trong cùng một tick (chạm rất nhanh / mạng dồn tin) | không ra đòn | một đòn |
| Chạm nút Đánh khi còn 0,2 giây mới tới nhịp | cú chạm bị nuốt | ra đòn đúng lúc tới nhịp |
| Hai lính xê dịch gần bằng nhau, 5–6 đòn | đổi mục tiêu giữa chừng | đánh một con tới cùng |
| Đòn trượt (bị loá), bị né (Thấu Nhãn), mục tiêu miễn nhiễm | không hiện gì | "Trượt" / "Né" / "Miễn nhiễm" |

Không hỏng (đã đo, giữ nguyên): nhịp đánh đúng `1 / tốc đánh` ở mọi tốc đánh kể cả kịch trần 2,5; sát thương rơi đúng tick `delay`; mỗi lần vung
đúng một lần trúng; đạn bám mục tiêu chạy ngang trúng 100%; hai tướng giống nhau đánh nhau ra cùng nhịp, cùng sát thương.

## 3. Luật hiện hành + nơi chỉnh số

| Số | Ở đâu | Ý nghĩa |
|---|---|---|
| `basicAttack.delay` | `src/data/heroes/<tướng>.js` (mặc định 0,25) | thời gian vung của tướng — đổi thì chỉnh luôn `hitTime` hoạt ảnh cho khớp |
| `basicAttack.projectile.speed` | file tướng | tốc độ đạn đánh xa |
| `base.atkSpeed`, `perLevel.atkSpeedPct`, trần 2,5 | file tướng, `sim/stats.js` | nhịp đánh |
| `BASIC.leash` = 200 | `src/data/economy.js` | khoảng dư ngoài tầm đánh mà đòn cận chiến vẫn trúng lúc chạm. Đi bộ trong lúc vung (≤ 0,36 giây × ≤ ~520 đơn vị/giây) không thoát được; lướt / tốc biến / bị đẩy thì thoát. |
| `BASIC.retry` = 0,1 giây | như trên | đòn bị huỷ giữa lúc vung thì ra đòn lại được sau chừng này |
| `BASIC.stick` | như trên | bám lính / quái / trụ đang đánh dở |
| `ASSIST.reach / escape / chaseSec / stuckSec / bufferSec` | `src/data/controls.js` | tầm tự đi tới, ngưỡng bỏ đuổi, bộ đệm thao tác (chiêu + cú chạm nút Đánh) |

Ghi chú cân bằng (không đổi chỉ số tướng nào): tướng có chiêu nhảy "không thể chọn" giờ né được đòn đánh thường đang vung / đạn đang bay tới trong
lúc nhảy; lướt / tốc biến đúng lúc né được một đòn cận chiến (của tướng, lính, quái). Đạn của trụ giữ như cũ.

Áp dụng cho ai: `strikeMiss` dùng chung cho tướng (`combat.js`), lính (`minions.js`), quái (`jungle.js`). Bám mục tiêu đang đánh dở, bộ đệm cú chạm
và tự đi tới chỉ áp cho tướng người chơi (có lệnh `assist`) — bot không gửi lệnh này nên cách bot chọn mục tiêu / di chuyển không đổi.

## 4. Chưa làm / cân nhắc tiếp

- **Người chơi tự huỷ đòn lúc vung bằng cần di chuyển** (kiểu LoL / Dota 2): hiện đòn đã vung là đứng yên tới lúc chạm (≤ 0,36 giây). Đổi sẽ ảnh
  hưởng thói quen giữ cần + giữ nút Đánh (đang tự "đánh rồi chạy") — nên là một mục Cài đặt, cần chủ dự án quyết.
- Chiêu bấm giữa lúc vung đòn đánh thường: hiện cả chiêu lẫn đòn đều ra. Nhiều game huỷ đòn khi tung chiêu; đổi là đổi nhịp combo của mọi tướng.
- Đạn trụ vẫn trúng mục tiêu đang "không thể chọn".
- Thời gian vung không co theo tốc đánh cho tới khi chạm trần 80% nhịp — khác cách tính theo % của LoL, nhưng là thiết kế hiện tại và hoạt ảnh
  đã khớp theo nó.
