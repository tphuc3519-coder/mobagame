// Tiếng giao diện ngoài trận: MỘT bộ nghe chung ở #ui (bấm nút nào cũng có tiếng theo loại nút — không phải gắn từng nút) + nhạc nền
// theo màn (sảnh / phòng chờ / chọn tướng / đội hình: nhạc sảnh; màn tải trận: tắt dần). Tiếng riêng của từng màn (tìm thấy trận, khoá
// tướng, đếm giây, VS, kết quả) gọi thẳng sfx() ở màn đó.
import { sfx, music } from './audio.js';

const SCREEN_MUSIC = { home: 'lobby', room: 'lobby', pick: 'lobby', draft: 'lobby', lineup: 'lobby', loading: null };
const CONFIRM = new Set(['go', 'again', 'quick', 'normal', 'ranked', 'accept', 'invite']);
const OPEN = new Set(['settings', 'heroes', 'items', 'bag', 'friends', 'mail', 'missions', 'leader', 'history', 'event', 'profile', 'modes', 'gems', 'chat', 'spell', 'stats']);

export function hookUiSounds() {
  document.addEventListener('click', (e) => {
    const ui = document.getElementById('ui'); if (!ui || ui.hidden) return; // trong trận #ui ẩn: tiếng do HUD / gameSounds.js lo
    const b = e.target.closest('button, [data-a], .hc, [data-tab], [data-t], [data-inv], [data-sp]'); if (!b || !ui.contains(b) || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'lock' || a === 'ban' || a === 'skip') return; // khoá / cấm / bỏ cấm: tiếng riêng trong pick.js / draft.js (cả lúc hết giờ tự khoá)
    if (a === 'claim') sfx('ui_reward');
    else if (b.matches('.ui-back') || a === 'back' || a === 'home') sfx('ui_back');
    else if (CONFIRM.has(a)) sfx('ui_confirm');
    else if (OPEN.has(a)) sfx('ui_open');
    else if (b.matches('.hc, [data-sp]')) sfx('ui_select');
    else if (b.dataset.tab != null || b.dataset.t != null || b.closest('.seg, .pn-tabs, .rm-tabs')) sfx('ui_toggle');
    else sfx('ui_tap');
  }, true);
}
/** Chuyển màn (ui/flow.js nav.go): tiếng lướt + nhạc nền của màn đó. */
export function screenSound(name) {
  sfx('ui_whoosh', { vol: 0.7 });
  if (name in SCREEN_MUSIC) music(SCREEN_MUSIC[name]);
}
