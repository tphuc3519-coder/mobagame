// Cảnh báo máu thấp: viền đỏ mờ quanh màn hình khi tướng mình dưới LOW máu, đậm hơn + nhịp chậm khi dưới CRIT — để người chơi đang nhìn
// giữa màn (giao tranh) vẫn biết mình sắp ngã mà không phải liếc thanh máu. Một phần tử phủ nằm GIỮA cảnh 3D và lớp HUD (thanh máu, số sát
// thương, nút bấm không bị nhuộm đỏ); chỉ đổi opacity (trình duyệt tự ghép lớp, không vẽ lại cảnh). Có ngưỡng trễ để máu dao động quanh mốc
// không làm viền chớp tắt. Tắt trong Cài đặt → Thiết lập giao diện → Cảnh báo máu thấp; máy bật "giảm chuyển động" thì viền đứng yên (CSS).
import { pref } from '../core/prefs.js';
import { track } from '../core/scope.js';

/** Dưới LOW thì hiện, lên lại quá LOW + HYST mới tắt; dưới CRIT thì đậm + nhịp, lên quá CRIT + HYST thì về mức thường. */
export const LOW_HP = { low: 0.3, crit: 0.15, hyst: 0.04 };

/** Mức cảnh báo kế tiếp (0 tắt | 1 thấp | 2 nguy kịch) từ mức hiện tại + tỉ lệ máu — hàm thuần, kiểm thử được bằng node. */
export function lowHpLevel(prev, frac, alive = true) {
  if (!alive || !(frac >= 0)) return 0;
  const { low, crit, hyst } = LOW_HP;
  if (frac < crit) return 2;
  if (frac < low) return prev === 2 && frac < crit + hyst ? 2 : 1;
  return prev >= 1 && frac < low + hyst ? 1 : 0;
}

export function createLowHp() {
  const el = document.createElement('div'); el.id = 'lowhp'; el.setAttribute('aria-hidden', 'true');
  const hud = document.getElementById('hud');
  if (hud) hud.before(track(el)); else document.body.append(track(el)); // dưới lớp HUD, trên cảnh 3D
  let level = 0;
  return {
    /** Mỗi khung: e = tướng mình, over = trận đã kết thúc. Chỉ ghi DOM khi mức đổi. */
    update(e, over = false) {
      const next = over || !pref('lowHpFx') ? 0 : lowHpLevel(level, e.hp / (e.stats?.maxHp || 1), e.alive);
      if (next === level) return;
      level = next; el.classList.toggle('on', level > 0); el.classList.toggle('crit', level > 1);
    },
    get level() { return level; },
  };
}
