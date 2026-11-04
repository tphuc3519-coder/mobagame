# Chơi online (bản thử đầu — 01/11)

Nhiều người ở nhiều máy vào chung một trận thời gian thực. Chưa có tài khoản / bạn bè thật.

## Chế độ (03/11)

| Nhóm | Chế độ | Cách vào trận |
|---|---|---|
| **Trực tuyến (mặc định)** | Đấu thường 5v5, Đấu hạng, Đấu Đỉnh Cao | Phòng chờ → Bắt đầu = vào **hàng chờ máy chủ**. Đủ 10 người thì ghép ngay; người vào hàng sớm nhất chờ **60 giây** thì ghép luôn những ai đang chờ, **máy điền chỗ trống**. Người thật chia xen kẽ hai đội, vị trí theo vị trí chính → phụ. Tìm thấy trận → Chấp nhận (12 giây, ai không bấm bị loại, máy thay) → chọn tướng trực tuyến (30 giây, không trùng tướng trong đội) → trận. Có tính thưởng / sao như trước. Không nối được máy chủ → ghép với máy (chạy offline như Đấu máy). Đấu hạng trực tuyến chưa có cấm tướng (chọn ẩn). |
| **Phòng tuỳ chỉnh** | 1v1 / 5v5 | Sảnh → **Tạo phòng** (hoặc Chọn chế độ → Phòng tuỳ chỉnh). Tạo phòng có **mã 4 ký tự**, tối đa 2 × 5 người; chạm ô trống để đổi chỗ / đổi đội; chủ phòng chọn bản đồ, **Thêm máy bật / tắt**, độ khó máy. Mọi người Sẵn sàng → chủ phòng Bắt đầu → chọn tướng → trận. Tắt máy: chỉ người trong phòng vào trận (mỗi đội ≥ 1 người). Không tính thưởng. |
| **Đấu máy** | Đấu máy 5v5, Đấu đơn 1v1, Luyện tập | Chọn chế độ → Đấu máy. Chơi một mình, không cần mạng, tự chọn độ khó. |

Tin nhắn máy chủ mới: `queue` / `unqueue` (hàng chờ), `match` (đã ghép), `accept`, `hover` / `lock` (chọn tướng), `seat` / `opts` (phòng tuỳ chỉnh),
`kicked` (bỏ lỡ chấp nhận). Kiểm thử rút ngắn thời gian bằng biến môi trường `QUEUE_WAIT`, `ACCEPT_SEC`, `PICK_SEC`, `READY_SEC` (giây).

## Cách hoạt động (lockstep, máy chủ làm nhạc trưởng)

```
máy A ──lệnh──▶ ┌────────────┐ ──khung tick (15 gói/giây, 2 tick/gói)──▶ máy A
máy B ──lệnh──▶ │  máy chủ   │ ──────────────────────────────────────▶ máy B
                │ đồng hồ 30 │   mỗi máy (và máy chủ) chạy CÙNG src/sim/
                │ tick/giây  │   với cùng seed + cùng lệnh theo đúng tick
                └────────────┘   ⇒ ra cùng một trận
```

- Máy chủ (`server/`) giữ đồng hồ 30 tick/giây, gom lệnh người chơi nhận được vào tick kế tiếp và phát cho mọi máy. Lệnh là đúng kiểu
  Command của game (02 §6): đi, đánh, chiêu, phép, mua / bán đồ, nâng kỹ năng, tín hiệu, đầu hàng.
- Máy khách không tự chạy mô phỏng theo đồng hồ của mình nữa: chỉ chạy tick nào đã có khung từ máy chủ (`src/net/session.js`). Lệnh của mình
  cũng đi vòng qua máy chủ rồi mới có hiệu lực — độ trễ cảm nhận ≈ ping + ~70 ms (Liên Quân / Honor of Kings cũng làm kiểu "frame sync" này).
- Mô phỏng phải **tất định tuyệt đối** giữa các trình duyệt: RNG có seed (`core/rng.js`) và lượng giác tự viết (`core/dmath.js` — `Math.sin`,
  `atan2`, `hypot`… mỗi trình duyệt có thể lệch chữ số cuối). Mỗi 2 giây máy khách gửi mã băm trạng thái; máy chủ cũng chạy mô phỏng và so —
  lệch thì ghi `LỆCH ĐỒNG BỘ` vào nhật ký máy chủ, góc trên màn hình hiện "lệch".
- Rớt mạng: tướng đứng yên, quá 6 giây thì **máy tạm điều khiển**; tự nối lại mỗi 1,5 giây và nhận bù các khung thiếu. Tải lại trang giữa trận:
  về Sảnh là có hộp **Vào lại** (hoặc Phòng tuỳ chỉnh → **Vào lại trận**) (dựng lại trận từ đầu bằng các khung đã có rồi chạy bù nhanh).
- Vì sao không gửi "ảnh chụp trạng thái" (snapshot) như kế hoạch ở 10_LO_TRINH: phần vẽ / HUD / hiệu ứng đọc rất nhiều thứ trong `world` (sự kiện,
  đạn, vùng, trạng thái, hồi chiêu…) — gửi lệnh nhẹ hơn hàng trăm lần (vài byte / giây khi không bấm gì) và giữ nguyên toàn bộ phần vẽ. Đổi lại:
  máy khách biết hết trạng thái trận (kể cả trong sương mù) — chấp nhận ở bản thử; xem "Việc tiếp theo".

## Giảm cảm giác trễ (03/11)

- Máy chủ gửi khung **mỗi tick** (30 gói/giây, trước 15 gói × 2 tick) và máy khách giữ hàng chờ ≤ 2 tick (mỗi tick tồn trong hàng là thêm 33 ms).
- **Dự đoán chuyển động tướng mình** (chỉ phần vẽ, `session.lead`): kéo cần là tướng chạy + quay mặt ngay, vẽ lệch lên trước tối đa 0,4 giây
  quãng đường; mô phỏng (và mọi máy khác) vẫn y nguyên. Đánh / chiêu vẫn chờ máy chủ (~ping + 40 ms).
- Trận online chờ **đủ model 10 tướng** rồi mới báo máy chủ đã tải (tối đa 40 giây, màn che hiện "Đang tải tướng x/10") — trước đây vào trận khi
  model chưa về (điện thoại mạng chậm) nên tướng hiện hình nhân giữ chỗ / bóng đen.

## Chạy thử trên máy mình / trong nhà (LAN)

Cần Node 18 trở lên (không cài gói npm nào).

```
node server/index.mjs
```

Máy chủ in ra địa chỉ, ví dụ `http://192.168.1.5:8787/`. Máy chủ **phục vụ luôn game**, nên:

1. Máy tính: mở `http://localhost:8787/`.
2. Điện thoại cùng Wi-Fi: mở `http://192.168.1.5:8787/` (địa chỉ LAN máy chủ in ra).
3. Một máy: **Sảnh → Tạo phòng → Tạo phòng** → đọc mã 4 ký tự cho người kia.
4. Máy kia: **Sảnh → Tạo phòng → nhập mã → Vào phòng → Sẵn sàng**. Chủ phòng bấm **Bắt đầu** → cả hai chọn tướng.
5. Hoặc cả hai bấm **Đấu thường** → Bắt đầu: máy chủ ghép hai người vào một trận (chờ tối đa 60 giây, máy điền 8 chỗ còn lại).

Địa chỉ máy chủ ("Máy chủ: … Đổi" ở màn Phòng tuỳ chỉnh) tự điền đúng khi mở game từ máy chủ. Mở game từ chỗ khác (GitHub Pages) thì gõ địa chỉ máy chủ vào ô đó (lưu lại cho lần
sau), hoặc thêm `?server=…` vào đường dẫn.

> Trang game trên GitHub Pages là **https** → chỉ nối được máy chủ **wss://** (có chứng chỉ). `ws://192.168.…` chỉ dùng khi mở game bằng `http://`
> từ chính máy chủ đó (như trên).

## Đưa máy chủ lên mạng (chơi khác nhà)

**Đang chạy:** `wss://lantern-arena-online.onrender.com/ws` (Render gói free, Singapore, tạo từ `render.yaml`; kiểm tra:
https://lantern-arena-online.onrender.com/health). Đã đặt làm `DEFAULT_SERVER` — mở game trên GitHub Pages là kết nối thẳng. Máy chủ ngủ sau
15 phút không ai vào: người đầu tiên bấm Tạo phòng / Vào phòng có thể phải chờ ~1 phút (báo "Hết thời gian chờ" thì bấm lại).

Máy chủ chỉ cần thư mục `src/` + `server/`. Game vẫn để trên GitHub Pages; người chơi gõ địa chỉ `wss://…` vào ô Máy chủ (hoặc sửa
`DEFAULT_SERVER` trong `src/net/client.js` để khỏi phải gõ). Biến môi trường: `PORT`, `STATIC=0` (không phục vụ file game), `ORIGINS=https://<tên>.github.io`
(chỉ nhận kết nối từ trang game của mình).

**Chọn chỗ đặt — càng gần người chơi càng ít trễ.** Người chơi ở Việt Nam: máy chủ Singapore (ping ~30–50 ms) hoặc Hồng Kông / Tokyo.

1. **VPS Singapore** (Vultr / DigitalOcean / Linode / AWS Lightsail ~5–6 USD/tháng, 1 vCPU / 1 GB đủ vài chục phòng):
   ```
   # trên VPS (Ubuntu): cài Node 22, lấy code
   git clone https://github.com/tphuc3519-coder/mobagame && cd mobagame
   PORT=8787 STATIC=0 ORIGINS=https://tphuc3519-coder.github.io node server/index.mjs   # thử
   ```
   Chạy nền + tự bật lại: `pm2 start server/index.mjs --name moba` (hoặc dịch vụ systemd). Lấy **wss** miễn phí bằng Caddy + một tên miền
   (hoặc tên miền miễn phí như DuckDNS): `Caddyfile` → `moba.ten-mien.com { reverse_proxy localhost:8787 }` — Caddy tự xin chứng chỉ.
   Địa chỉ cho game: `wss://moba.ten-mien.com/ws`.
2. **Render / Railway / Fly.io** (không cần quản máy, có sẵn https/wss): dùng `Dockerfile` ở gốc repo (Node 22, `STATIC=0`, cổng `PORT` nền tảng cấp).
   Chọn vùng **Singapore**. Gói miễn phí của Render ngủ sau 15 phút không ai vào (lần đầu chờ ~30 giây) — được để thử, không hợp chơi thật.
   Địa chỉ cho game: `wss://<tên-app>.onrender.com/ws` (hoặc `.fly.dev`, `.up.railway.app`).

Kiểm tra máy chủ sống: mở `https://<địa chỉ>/health` → `{"ok":true,"rooms":…}`.

## Tệp

| Tệp | Việc |
|---|---|
| `server/index.mjs` | Máy chủ HTTP (phục vụ game, `/health`) + nâng cấp `/ws` |
| `server/ws.mjs` | WebSocket tự viết (RFC 6455) — không cần gói `ws` |
| `server/rooms.mjs` | Phòng: tạo / vào bằng mã, chọn tướng, sẵn sàng, bắt đầu; đồng hồ trận, gom lệnh, phát khung, so mã băm, rớt mạng / vào lại |
| `src/net/protocol.js` | Dùng chung: dựng trận online (`setupOnline`), áp khung (`applyFrame`), làm sạch lệnh, mã băm trạng thái |
| `src/net/client.js` | Kết nối WebSocket phía trình duyệt, đo ping, địa chỉ máy chủ |
| `src/net/session.js` | Trong trận: bọc `world.command` (lệnh mình → máy chủ), chạy khung, chạy bù, tự nối lại |
| `src/ui/online.js` | Phòng tuỳ chỉnh (tạo / vào bằng mã, hai đội, bật / tắt máy, vào lại trận) |
| `src/ui/netLobby.js` | Kết nối máy chủ dùng chung ngoài trận (hàng chờ, phòng, chọn tướng → vào trận) |
| `src/core/dmath.js` | Lượng giác tất định cho mô phỏng |
| `tools/t_online.mjs` | Kiểm thử không cần trình duyệt: máy chủ thật + 2 máy khách, rớt mạng / nối lại, máy thay người, so mã băm |

## Việc tiếp theo

- Dự đoán chuyển động tướng mình (đi ngay khi kéo cần, máy chủ xác nhận sau) để bớt cảm giác trễ khi ping cao.
- Chống gian lận sương mù: kiểu lockstep thì máy nào cũng có đủ trạng thái trận; muốn giấu phải chuyển sang máy chủ gửi trạng thái theo tầm nhìn
  từng đội (việc lớn — làm khi có xếp hạng thật).
- Ghép trận tự động, 2–10 người thật mỗi trận (hiện 1 người mỗi đội), chọn phép / bảng bùa / phù hiệu trước trận (hiện dùng mặc định), tính
  thưởng / hạng, chat nhanh.
