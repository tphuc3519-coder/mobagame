// Mục tiêu đánh thường do người chơi chỉ định (Cài đặt → Điều khiển, core/prefs.js; đọc lúc dùng / onPref nên đổi giữa trận áp dụng ngay):
// - atkMode 'manual' (Tự chọn mục tiêu): chạm nhanh vào một địch trong cảnh 3D để khoá nó, chạm đất trống để bỏ khoá. Không tính ngón đang
//   giữ cần di chuyển; ngón kéo đi quá 14 px / giữ quá 0,45s là vuốt camera (camLook.js), không phải chạm chọn. Địch được chọn: đơn vị thấy
//   được có hình chiếu (đoạn chân → đỉnh, trừ bán kính) gần chỗ chạm nhất trong 60 px, theo camera lúc chạm xuống.
// - preciseAtk (Đánh thường chính xác): kéo nút Đánh (skillButtons.js) → pickDir: địch gần hướng kéo nhất (lệch ≤ 60°) trong tầm đánh + 200.
// Mục tiêu khoá đi kèm mọi lệnh đánh (preferTarget): mô phỏng ưu tiên nó khi còn trong tầm. Tự bỏ khoá khi nó chết / khuất / xa quá 1800,
// hoặc khi đổi atkMode / tắt preciseAtk.
// - targetBy (Lựa chọn mục tiêu): lệnh { type: 'targetBy' } lúc vào trận và mỗi lần đổi — mô phỏng chọn mục tiêu (sim/targeting.js pickByRule).
// - Dấu mục tiêu (render/indicators.js mark): mục tiêu khoá luôn có vòng đỏ + mũi chữ V trên đầu (phản hồi của việc chọn), đang kéo nút Đánh
//   thì cùng dấu màu vàng ở địch sẽ chọn; bật targetMark thì thêm vòng cam đứt nét dưới mục tiêu đang bị đánh thường (swingTarget).
import { pref, onPref } from '../core/prefs.js';
import { project } from '../render/project.js';
import { HERO_SCALE } from '../render/unitView.js';
import { canTarget } from '../sim/vision.js';

const TAP_PX = 60, TAP_MOVE = 14, TAP_MS = 450, KEEP = 1800;
/** Khoảng cách điểm (x, y) tới đoạn a–b trên màn hình. */
const segDist = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, k = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a.x - dx * k, y - a.y - dy * k); };

export function createAtkTarget({ world, player, camera = null, input = null, views = null, indicators = null, onChange = null }) {
  let lock = null, pick = null; // id mục tiêu khoá; id địch sẽ chọn khi đang kéo nút Đánh (xem trước)
  const unit = (id) => (id == null ? null : world.byId(id));
  const valid = (t) => !!t && t.team !== player.team && t.kind !== 'fountain' && canTarget(player, t);
  const setLock = (id) => { if (lock === id) return; lock = id; onChange?.(); };
  /** Chỗ vẽ dấu: vị trí đơn vị đã nội suy (unitView) + độ cao nền, bán kính vòng theo cỡ đơn vị, mũi chữ V trên thanh máu + tên (hud.js). */
  const where = (t) => { const v = views?.get(t.id); return { x: v ? v.root.position.x : t.pos.x, z: v ? v.root.position.z : t.pos.y, y: v?.gy || 0, r: t.radius * 1.6 + 70, h: (t.kind === 'hero' ? 250 * HERO_SCALE + 30 : t.kind === 'dummy' ? 230 : t.height || 200) + 190 }; };

  const sendRule = () => world.command(player.id, { type: 'targetBy', value: pref('targetBy') });
  sendRule();
  onPref((k, v) => { if (k === 'targetBy') sendRule(); else if (k === 'atkMode' || (k === 'preciseAtk' && !v)) setLock(null); });

  /** Địch thấy được dưới điểm chạm (x, y) màn hình, hoặc null. */
  function pickAt(x, y) {
    if (!camera) return null;
    const W = innerWidth, H = innerHeight; let best = null, bd = TAP_PX;
    for (const t of world.entities) {
      if (!valid(t)) continue;
      const p = where(t), h = t.kind === 'hero' ? 250 * HERO_SCALE : t.kind === 'dummy' ? 230 : (t.height || 200) * 0.85;
      const a = project(camera, p.x, p.y, p.z, W, H); if (!a.visible) continue;
      const b = project(camera, p.x, p.y + h, p.z, W, H), e = project(camera, p.x + t.radius, p.y, p.z, W, H);
      const d = segDist(x, y, a, b) - Math.abs(e.x - a.x) * 0.8; // chạm vào thân / mép đơn vị to vẫn trúng
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  const world3d = document.getElementById('world'), taps = new Map(); // ngón đang chạm nền 3D: chỗ chạm, lúc chạm, địch dưới ngón
  document.body.addEventListener('pointerdown', (e) => {
    if (e.target !== world3d || pref('atkMode') !== 'manual') return;
    if (input?.js.active && input.js.id === e.pointerId) return; // ngón này vừa thành cần di chuyển (joystick.js nghe trước)
    taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), hit: pickAt(e.clientX, e.clientY) });
  });
  document.body.addEventListener('pointermove', (e) => { const t = taps.get(e.pointerId); if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_MOVE) taps.delete(e.pointerId); });
  const tapUp = (e) => {
    const t = taps.get(e.pointerId); if (!t) return; taps.delete(e.pointerId);
    if (e.type === 'pointerup' && performance.now() - t.t < TAP_MS && pref('atkMode') === 'manual') setLock(valid(t.hit) ? t.hit.id : null); // trúng địch: khoá; đất trống: bỏ khoá
  };
  document.body.addEventListener('pointerup', tapUp); document.body.addEventListener('pointercancel', tapUp);

  return {
    lockId: () => lock,
    setLock,
    /** Địch gần hướng dir (trục màn hình = trục bản đồ) nhất, lệch tối đa 60°, trong tầm range (tính bán kính); hoặc null. */
    pickDir(dir, range) {
      let best = null, bs = Infinity;
      for (const t of world.entities) {
        if (!valid(t)) continue;
        const dx = t.pos.x - player.pos.x, dy = t.pos.y - player.pos.y, l = Math.hypot(dx, dy);
        if (l < 1 || l - t.radius > range) continue;
        const c = (dx * dir.x + dy * dir.y) / l; if (c < 0.5) continue;
        const sc = Math.acos(Math.min(1, c)) + l / 5000; // lệch góc là chính; gần hơn một chút thì hơn
        if (sc < bs) { bs = sc; best = t; }
      }
      return best;
    },
    /** Địch đang xem trước khi kéo nút Đánh (null: thôi xem). */
    preview(id) { pick = id; },
    /** Mỗi khung: bỏ khoá mục tiêu hỏng, vẽ dấu. */
    update() {
      if (lock != null) { const t = unit(lock); if (!valid(t) || Math.hypot(t.pos.x - player.pos.x, t.pos.y - player.pos.y) > KEEP) setLock(null); }
      if (!indicators?.mark) return;
      const lt = unit(pick ?? lock);
      indicators.mark(0, valid(lt) ? where(lt) : null, pick != null ? 'pick' : 'lock');
      let at = null; // đang đánh thường: vòng cam dưới mục tiêu của đòn (vừa vung hoặc đang giữ nút Đánh)
      if (pref('targetMark') && player.alive && (player.attacking || world.tick < (player.swingUntil || 0) + 6)) { const t = unit(player.swingTarget); if (valid(t) && t.id !== (pick ?? lock)) at = t; }
      indicators.mark(1, at ? where(at) : null, 'atk');
    },
  };
}
