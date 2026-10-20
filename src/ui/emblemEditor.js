// Thẻ "Phù hiệu" của bảng Bảng Bùa (05 §9): hàng tướng (ẩn khi mở từ màn chọn tướng — đang xem tướng nào thì chỉnh tướng đó), 4 phù hiệu
// chính, 2 hàng nét phụ (Thân / Tâm, mỗi hàng chọn 1), nút về mặc định theo vai. Lưu theo tướng, tự lưu sau mỗi lần chạm.
import { KEYSTONES, KEYSTONE_LIST, MINORS, MINOR_ROWS, MINOR_LIST_BY_ROW } from '../data/emblems.js';
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { emblemArt } from '../hud/art.js';
import { emblemFor, setEmblem, resetEmblem } from './loadout.js';
import { minorIcon } from './charmArt.js';
import { face, toast } from './kit.js';

/** st = { heroId, lockHero }. */
export function renderEmblemTab(host, st) {
  if (!HEROES[st.heroId]) st.heroId = ALPHA[0];
  const draw = () => {
    const em = emblemFor(st.heroId), k = KEYSTONES[em.key];
    host.innerHTML = `<div id="loEmblem" class="lo-emb">
      ${st.lockHero ? '' : `<div class="lo-heroes">${ALPHA.map((h) => `<button type="button" data-h="${h}" class="${h === st.heroId ? 'on' : ''}" aria-label="${HEROES[h].name}">${face(h)}</button>`).join('')}</div>`}
      <div class="lo-keys">${KEYSTONE_LIST.map((key) => `<button type="button" class="lo-key ${key === em.key ? 'on' : ''}" data-k="${key}">${emblemArt(key)}<b>${KEYSTONES[key].name}</b><small>${KEYSTONES[key].short}</small></button>`).join('')}</div>
      <div class="lo-mins">${MINOR_ROWS.map((row, r) => `<div class="lo-mrow" data-row="${r}"><span class="lo-cl">${row.name}<small>nét phụ</small></span>
        ${MINOR_LIST_BY_ROW[r].map((id) => `<button type="button" class="lo-min ${em.minors[r] === id ? 'on' : ''}" data-r="${r}" data-m="${id}">${minorIcon(id)}<b>${MINORS[id].name}</b><small>${MINORS[id].desc}</small></button>`).join('')}</div>`).join('')}</div>
      <div class="lo-eact"><button type="button" class="btn-ghost" data-a="emreset">Mặc định theo vai</button><p class="lo-edesc"><b style="color:#ffe08a">${k.name}:</b> ${k.desc}</p></div></div>`;
  };
  host.onclick = (ev) => {
    const t = ev.target, em = emblemFor(st.heroId);
    const h = t.closest('[data-h]'); if (h) { st.heroId = h.dataset.h; draw(); return; }
    const kb = t.closest('[data-k]'); if (kb) { setEmblem(st.heroId, { ...em, key: kb.dataset.k }); draw(); return; }
    const mb = t.closest('[data-m]'); if (mb) { const minors = [...em.minors]; minors[+mb.dataset.r] = mb.dataset.m; setEmblem(st.heroId, { ...em, minors }); draw(); return; }
    if (t.closest('[data-a="emreset"]')) { resetEmblem(st.heroId); toast(`${HEROES[st.heroId].name}: phù hiệu mặc định theo vai`); draw(); }
  };
  draw();
  return { draw };
}
