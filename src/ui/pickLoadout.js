// Phép bổ trợ + bảng bùa + phù hiệu trước trận (dùng chung cho chọn tướng thường và cấm/chọn): danh sách phép theo bản đồ, phép mặc định
// theo vị trí (đi rừng: Trừng Trị, nhớ riêng trong hồ sơ), hộp thoại chọn phép, hộp chọn trang bùa nhanh (+ "Chỉnh trang" mở bảng Bảng Bùa),
// nút phù hiệu, và gói `loadout` đưa vào trận (world.setLoadout).
import { SPELLS, SPELL_LIST, SPELL_LIST_1V1, DEFAULT_SPELL } from '../data/spells.js';
import { pageLevel } from '../data/charms.js';
import { KEYSTONES } from '../data/emblems.js';
import { ROLE_SPELL } from '../data/roles.js';
import { spellArt } from '../hud/art.js';
import { dialog } from './kit.js';
import { allPages, pageById, emblemFor, pageFor, finishLoadout } from './loadout.js';
import { pageLines } from './charmArt.js';
import { loadoutCss } from './loadoutCss.js';
import { openLoadout } from './loadoutPanel.js';

/** Phép chọn được: 1v1 bỏ phép chỉ dùng ở chế độ nhiều người (Trừng Trị). Thứ tự hiển thị theo SPELL_LIST. */
export const spellList = (map) => (map === '1v1' ? SPELL_LIST_1V1 : SPELL_LIST);
/** Phép mặc định: vị trí có phép riêng (đi rừng) → phép đã nhớ cho vị trí đó (mặc định Trừng Trị); còn lại → phép quen dùng. */
export function initialSpell(p, map, role) {
  const list = spellList(map), rs = ROLE_SPELL[role];
  if (rs && list.includes(rs)) return list.includes(p.spellJungle) ? p.spellJungle : rs;
  return list.includes(p.spell) ? p.spell : DEFAULT_SPELL;
}
/** Lưu phép vừa dùng vào hồ sơ (đi rừng nhớ riêng, để trận không đi rừng vẫn giữ phép quen). */
export function saveSpell(p, role, id) { if (ROLE_SPELL[role]) p.spellJungle = id; else p.spell = id; }
/** Hộp thoại chọn phép bổ trợ. */
export function openSpellPicker(spells, cur, onPick) {
  const d = dialog({ title: 'Phép bổ trợ', html: `<div class="pk-spells many">${spells.map((id) => `<button type="button" data-sp="${id}" class="${id === cur ? 'on' : ''}">${spellArt(id)}<b>${SPELLS[id].name}</b><small>${SPELLS[id].desc}</small></button>`).join('')}</div>`, buttons: [{ text: 'Đóng' }] });
  d.el.querySelector('.pk-spells').onclick = (ev) => { const b = ev.target.closest('[data-sp]'); if (!b) return; onPick(b.dataset.sp); d.close(); };
  return d;
}

/** Chữ trên nút bùa / phù hiệu. */
export function charmPill(pageId) { loadoutCss(); const pg = pageById(pageId); return `<b>Bùa</b>${pg.name}<em class="lv">Cấp ${pageLevel(pg)}</em>`; }
export const emblemPill = (heroId) => `<b>Phù hiệu</b>${KEYSTONES[emblemFor(heroId).key].name}`;
/** Hộp chọn trang nhanh: chạm một trang là dùng; "Chỉnh trang" mở bảng Bảng Bùa (có nút "Dùng trang này"). */
export function openPagePicker(heroId, cur, onPick, onClosed = () => {}) {
  loadoutCss();
  const d = dialog({ title: 'Chọn bảng bùa',
    html: `<div class="lo-pick">${allPages().map((pg) => `<button type="button" data-pg="${pg.id}" class="${pg.id === cur ? 'on' : ''}"><b>${pg.name}</b><small>Cấp ${pageLevel(pg)}${pg.preset ? ' · Mẫu' : ''}</small><em>${pageLines(pg).slice(0, 2).join(' · ') || 'Chưa gắn bùa'}</em></button>`).join('')}</div>`,
    buttons: [{ text: 'Chỉnh trang', on: () => { openLoadout({ tab: 'charm', heroId, pageId: cur, onSelect: onPick, onClose: onClosed }); } }, { text: 'Đóng', cls: 'gold' }] });
  d.el.querySelector('.lo-pick').onclick = (ev) => { const b = ev.target.closest('[data-pg]'); if (!b) return; ev.stopPropagation(); onPick(b.dataset.pg); d.close(); };
  return d;
}
/** Bảng phù hiệu khoá vào tướng đang xem. */
export const openEmblemFor = (heroId, onClosed) => openLoadout({ tab: 'emblem', heroId, lockHero: true, onClose: onClosed });
export { pageFor, finishLoadout }; // (khai ở loadout.js — không DOM, kiểm thử được bằng node)
