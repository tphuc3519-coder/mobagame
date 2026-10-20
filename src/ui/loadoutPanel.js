// Bảng "Bảng Bùa" (mở từ Sảnh hoặc từ màn chọn tướng): hai thẻ Bảng bùa / Phù hiệu trên thanh tiêu đề. Từ màn chọn tướng: thẻ bùa có nút
// "Dùng trang này" (onSelect), thẻ phù hiệu khoá vào tướng đang xem (lockHero). Hết giờ chọn tướng, nav xoá mọi .ui-panel — đã tự lưu sẵn.
import { HEROES } from '../data/heroes/index.js';
import { panel } from './kit.js';
import { profile } from './profile.js';
import { defaultPageId } from './loadout.js';
import { loadoutCss } from './loadoutCss.js';
import { renderCharmTab } from './charmEditor.js';
import { renderEmblemTab } from './emblemEditor.js';

export function openLoadout({ tab = 'charm', heroId = profile().lastHero, lockHero = false, pageId = null, onSelect = null, onClose = null } = {}) {
  loadoutCss();
  const P = panel({ title: 'Bảng Bùa', cls: 'lo-panel', onClose,
    right: '<div class="lo-tabs"><button type="button" id="loTabCharm" data-tab="charm">Bảng bùa</button><button type="button" id="loTabEmblem" data-tab="emblem">Phù hiệu</button></div>' });
  P.el.id = 'loadout';
  const st = { tab, charm: { pageId: pageId || defaultPageId(heroId) }, emblem: { heroId, lockHero } };
  const api = onSelect ? { onSelect: (id) => { onSelect(id); P.close(); } } : {};
  const show = (t) => {
    st.tab = t;
    P.el.querySelectorAll('.lo-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    P.el.querySelector('h2').textContent = t === 'emblem' && lockHero ? `Phù Hiệu · ${HEROES[heroId]?.name || ''}` : t === 'emblem' ? 'Phù Hiệu' : 'Bảng Bùa';
    if (t === 'emblem') renderEmblemTab(P.body, st.emblem); else renderCharmTab(P.body, st.charm, api);
  };
  P.el.querySelector('.lo-tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b && b.dataset.tab !== st.tab) show(b.dataset.tab); };
  show(tab);
  window.__loadout = { st, close: P.close };
  return { close: P.close };
}
