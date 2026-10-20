// Phép bổ trợ + bảng bùa trước trận (dùng chung cho chọn tướng thường và cấm/chọn): danh sách phép theo bản đồ, phép mặc định theo vị trí
// (đi rừng: Trừng Trị, nhớ riêng trong hồ sơ), hộp thoại chọn phép, xoay vòng bảng bùa.
import { SPELLS, SPELL_LIST_1V1 } from '../data/spells.js';
import { CHARM_PAGES } from '../data/charms.js';
import { ROLE_SPELL } from '../data/roles.js';
import { spellArt } from '../hud/art.js';
import { dialog } from './kit.js';

/** Phép chọn được: 1v1 bỏ phép chỉ dùng ở chế độ nhiều người (Trừng Trị). */
export const spellList = (map) => (map === '1v1' ? SPELL_LIST_1V1 : Object.keys(SPELLS));
/** Phép mặc định: vị trí có phép riêng (đi rừng) → phép đã nhớ cho vị trí đó (mặc định Trừng Trị); còn lại → phép quen dùng. */
export function initialSpell(p, map, role) {
  const list = spellList(map), rs = ROLE_SPELL[role];
  if (rs && list.includes(rs)) return list.includes(p.spellJungle) ? p.spellJungle : rs;
  return list.includes(p.spell) ? p.spell : 'chop_buoc';
}
/** Lưu phép vừa dùng vào hồ sơ (đi rừng nhớ riêng, để trận không đi rừng vẫn giữ phép quen). */
export function saveSpell(p, role, id) { if (ROLE_SPELL[role]) p.spellJungle = id; else p.spell = id; }
/** Hộp thoại chọn phép bổ trợ. */
export function openSpellPicker(spells, cur, onPick) {
  const d = dialog({ title: 'Phép bổ trợ', html: `<div class="pk-spells">${spells.map((id) => `<button type="button" data-sp="${id}" class="${id === cur ? 'on' : ''}">${spellArt(id)}<b>${SPELLS[id].name}</b><small>${SPELLS[id].desc}</small></button>`).join('')}</div>`, buttons: [{ text: 'Đóng' }] });
  d.el.querySelector('.pk-spells').onclick = (ev) => { const b = ev.target.closest('[data-sp]'); if (!b) return; onPick(b.dataset.sp); d.close(); };
  return d;
}
/** Bảng bùa kế tiếp (xoay vòng). */
export const nextPage = (cur) => { const k = Object.keys(CHARM_PAGES); return k[(k.indexOf(cur) + 1) % k.length]; };
