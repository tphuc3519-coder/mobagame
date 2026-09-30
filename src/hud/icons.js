// Biểu tượng tự vẽ (SVG đơn giản) cho đồ và phép bổ trợ — không dùng hình của game khác (docs/01 §5).
import { ITEMS } from '../data/items.js';

const G = {
  sword: 'M17 2l5 5-10 10-3-1-1-3zM5 14l5 5-3 3-5-5z', star: 'M12 1l3 8 8 3-8 3-3 8-3-8-8-3 8-3z',
  heart: 'M12 21s-8-5.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.5-8 11-8 11z', shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  ring: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 110 10 5 5 0 010-10z', drop: 'M12 2s7 7.5 7 12a7 7 0 01-14 0c0-4.5 7-12 7-12z',
  bolt: 'M14 1L4 14h6l-1 9 10-13h-6z', gem: 'M12 2l9 10-9 10-9-10z', boot: 'M7 3h6v8l7 3v6H4V9z',
  hour: 'M6 2h12v4l-4 6 4 6v4H6v-4l4-6-4-6z', leaf: 'M4 20C4 10 10 4 21 3c0 10-5 16-14 17z', plus: 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z',
  arrow: 'M2 10h11V5l9 7-9 7v-5H2z', wing: 'M2 18C4 8 10 4 22 4c-3 5-6 7-9 8 3 0 5-1 8-2-2 6-8 10-19 8z', cross: 'M4 2l8 8 8-8 2 2-8 8 8 8-2 2-8-8-8 8-2-2 8-8-8-8z',
};
const STAT_GLYPH = { atk: 'sword', ap: 'star', maxHp: 'heart', maxMana: 'drop', armor: 'shield', mr: 'ring', atkSpeedPct: 'bolt', crit: 'gem', cdr: 'hour', moveSpeed: 'boot', mrPen: 'star', tenacity: 'ring' };
const TAB_COLOR = { atk: '#c4553c', mag: '#5d6fd8', def: '#5f8f9c', boots: '#b98a36', jungle: '#4f9f78' };
const TIER_RING = ['#6d7388', '#6d7388', '#c9d2e6', '#f2c25a'];

const svg = (path, fill = '#fff') => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="${fill}" fill-rule="evenodd"/></svg>`;

/** Ô đồ: nền theo nhóm, viền theo bậc, hình theo chỉ số chính. */
export function itemIcon(id) {
  const it = ITEMS[id];
  if (!it) return '<i class="ic empty"></i>';
  const key = Object.keys(it.stats || {})[0];
  const glyph = it.tags?.includes('boots') ? 'boot' : it.tags?.some((t) => t === 'jungle' || t === 'support') ? 'leaf' : STAT_GLYPH[key] || 'gem';
  const c = TAB_COLOR[it.tab] || '#777';
  const keys = Object.keys(it.stats || {}), second = keys[1] && STAT_GLYPH[keys[1]] && STAT_GLYPH[keys[1]] !== glyph ? STAT_GLYPH[keys[1]] : it.passive || it.unique ? 'gem' : '';
  const hue = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 40, 0) - 20; // mỗi món lệch màu nhẹ để dễ phân biệt
  return `<i class="ic" style="background:linear-gradient(160deg,${c},#1b1f38);border-color:${TIER_RING[it.tier] || TIER_RING[1]};--h:${hue}deg">${svg(G[glyph])}${second ? `<svg class="sub" viewBox="0 0 24 24"><path d="${G[second]}" fill="#ffe08a" stroke="#000" stroke-width="1.5" paint-order="stroke"/></svg>` : ''}</i>`;
}

const SPELL_GLYPH = { chop_buoc: 'arrow', hoi_phuc: 'plus', tram_hon: 'cross', thu_hoach: 'leaf', gio_luot: 'wing', giai_troi: 'ring' };
const SPELL_COLOR = { chop_buoc: '#4fb3d9', hoi_phuc: '#4fbf7a', tram_hon: '#d05a4a', thu_hoach: '#c9a13a', gio_luot: '#8a7ad8', giai_troi: '#d99a4f' };
export function spellIcon(id) {
  return `<i class="ic round" style="background:linear-gradient(160deg,${SPELL_COLOR[id] || '#888'},#1b1f38)">${svg(G[SPELL_GLYPH[id]] || G.gem)}</i>`;
}
export const homeIcon = () => `<i class="ic round" style="background:linear-gradient(160deg,#6a7fbf,#1b1f38)">${svg('M12 3l10 9h-3v9h-5v-6h-4v6H5v-9H2z')}</i>`;
export const coinIcon = () => '<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f2c25a" stroke="#8a5a12" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#8a5a12" stroke-width="2"/></svg>';

const STAT_LABEL = { atk: ['Công', ''], ap: ['Phép', ''], maxHp: ['HP', ''], maxMana: ['Mana', ''], armor: ['Giáp', ''], mr: ['KP', ''], atkSpeedPct: ['Tốc đánh', '%'], crit: ['Chí mạng', '%'],
  lifesteal: ['Hút máu', '%'], spellvamp: ['Hút máu phép', '%'], cdr: ['Giảm hồi chiêu', '%'], mrPen: ['Xuyên KP', ''], moveSpeed: ['Tốc chạy', ''], tenacity: ['Kháng hiệu ứng', '%'] };
/** Danh sách chỉ số dạng chữ. */
export function statLines(it) {
  return Object.entries(it.stats || {}).map(([k, v]) => {
    const [n, u] = STAT_LABEL[k] || [k, ''];
    return `+${u ? Math.round(v * 100) : v}${u} ${n}`;
  });
}
