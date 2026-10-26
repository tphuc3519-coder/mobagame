// Chọn vị trí ở phòng chờ 5v5 (đấu thường + đấu hạng): nút nhỏ dưới ô của mình + hộp thoại "Vị trí chính" (5 vị trí + Tuỳ ý) và
// "Vị trí phụ" (không bắt buộc). Lưu trong hồ sơ (rolePri / roleSec); lúc ghép trận ui/roles.js assignRoles chia vị trí.
import { dialog, toast } from './kit.js';
import { profile, saveProfile } from './profile.js';
import { roleIcon } from './roles.js';
import { ROLE_IDS, ROLE_INFO, ROLE_PRI_ODDS } from '../data/roles.js';

/** Nút vị trí dưới ô người chơi (chưa chọn: nhấp nháy "Chọn vị trí"). */
export function roleChip(p) {
  const r = ROLE_INFO[p.rolePri];
  const s2 = ROLE_INFO[p.roleSec], tip = r ? `Vị trí chính: ${r.name}${s2 ? ` · phụ: ${s2.name}` : ''}` : 'Chọn vị trí';
  return `<button type="button" class="rl-chip ${r ? '' : 'need'}" data-a="role" title="${tip}">${r ? `${roleIcon(p.rolePri)}<b>${r.short}</b>${s2 ? `<small>· ${s2.short}</small>` : ''}` : '<b>Chọn vị trí</b>'}</button>`;
}

const tile = (id) => `<button type="button" class="rl-tile" data-r="${id}">${roleIcon(id || 'none')}<b>${id ? ROLE_INFO[id].short : 'Không'}</b></button>`;
const HINT0 = `Ghép trận: khoảng ${Math.round(ROLE_PRI_ODDS * 100)}% số trận nhận vị trí chính, còn lại nhận vị trí phụ (nếu có).`;

/** Hộp thoại chọn vị trí; Xác nhận → lưu hồ sơ rồi gọi onDone. */
export function openRoleDialog({ onDone } = {}) {
  const p = profile(), st = { pri: ROLE_INFO[p.rolePri] ? p.rolePri : null, sec: ROLE_INFO[p.roleSec] ? p.roleSec : null };
  const d = dialog({
    title: 'Chọn vị trí',
    html: `<div class="rl-dlg"><div class="rl-lab">Vị trí chính</div><div class="rl-pick" data-k="pri">${[...ROLE_IDS, 'fill'].map(tile).join('')}</div>
      <div class="rl-lab">Vị trí phụ <small>(không bắt buộc)</small></div><div class="rl-pick" data-k="sec">${[...ROLE_IDS, ''].map(tile).join('')}</div><p class="rl-hint"></p></div>`,
    buttons: [{ text: 'Huỷ' }, { text: 'Xác nhận', cls: 'gold', on: () => {
      if (!st.pri) { toast('Chọn vị trí chính trước đã'); return false; }
      p.rolePri = st.pri; p.roleSec = st.pri === 'fill' ? null : st.sec || null; saveProfile(); onDone?.();
    } }],
  });
  const box = d.el.querySelector('.rl-dlg');
  const paint = () => {
    if (st.pri === 'fill' || st.sec === st.pri) st.sec = null;
    for (const b of box.querySelectorAll('[data-k="pri"] .rl-tile')) b.classList.toggle('on', b.dataset.r === st.pri);
    for (const b of box.querySelectorAll('[data-k="sec"] .rl-tile')) {
      b.disabled = st.pri === 'fill' || (!!b.dataset.r && b.dataset.r === st.pri);
      b.classList.toggle('on', !b.disabled && b.dataset.r === (st.sec || ''));
    }
    box.querySelector('.rl-hint').textContent = st.pri ? ROLE_INFO[st.pri].hint : HINT0;
  };
  box.onclick = (e) => {
    const b = e.target.closest('.rl-tile'); if (!b || b.disabled) return;
    if (b.parentElement.dataset.k === 'pri') st.pri = b.dataset.r; else st.sec = b.dataset.r || null;
    paint();
  };
  paint();
  return d;
}
