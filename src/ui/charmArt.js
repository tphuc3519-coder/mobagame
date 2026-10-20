// Hình viên bùa / nét phụ phù hiệu (SVG tự vẽ, không mượn hình game khác) + chữ chỉ số kiểu "+1,2% Tốc đánh".
import { CHARMS, pageStats } from '../data/charms.js';
import { GLYPH, STAT_LABEL } from '../hud/icons.js';

const CHARM_GLYPH = { r_luoi: 'sword', r_lua: 'star', r_gio: 'bolt', r_nanh: 'gem', r_xuyen: 'arrow', r_sam: 'cross', b_suong: 'hour', b_mach: 'drop',
  b_nguyet: 'ring', b_chan: 'boot', b_nhan: 'shield', g_da: 'shield', g_may: 'ring', g_re: 'heart', g_suoi: 'plus' };
const MINOR_GLYPH = { m_da_day: 'shield', m_suoi_nguon: 'drop', m_kien_cuong: 'ring', m_tinh_tao: 'hour', m_buoc_nhe: 'boot', m_san_moi: 'cross' };
// viên đỏ: lục giác, viên xanh: giọt nước, viên xám: vuông bo góc
const SHAPE = { red: 'M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z', blue: 'M12 1.5s8.5 8.4 8.5 13.6a8.5 8.5 0 01-17 0C3.5 9.9 12 1.5 12 1.5z', gray: 'M6 2h12a4 4 0 014 4v12a4 4 0 01-4 4H6a4 4 0 01-4-4V6a4 4 0 014-4z' };
const GRAD = { red: ['#ffb09a', '#c8202a', '#5a0810'], blue: ['#c8ecff', '#2f7ade', '#0b2462'], gray: ['#eef0f8', '#7a84a0', '#2a3048'] };
let gid = 0;

/** Viên bùa 24×24 theo màu, hình trắng theo chỉ số chính. */
export function charmIcon(id, cls = '') {
  const ch = CHARMS[id]; if (!ch) return '';
  const g = 'cg' + gid++, [a, b, c] = GRAD[ch.color];
  return `<svg class="lo-gem ${cls}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>`
    + `<path d="${SHAPE[ch.color]}" fill="url(#${g})" stroke="rgba(255,255,255,.55)" stroke-width=".8"/><g transform="translate(6.6 7.4) scale(.45)"><path d="${GLYPH[CHARM_GLYPH[id]] || GLYPH.gem}" fill="#fff" fill-rule="evenodd" opacity=".92"/></g></svg>`;
}
/** Nút tròn nhỏ cho nét phụ phù hiệu. */
export function minorIcon(id) {
  return `<svg class="lo-mi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1c2340" stroke="#8fa0d8" stroke-width="1"/><g transform="translate(5.4 5.4) scale(.55)"><path d="${GLYPH[MINOR_GLYPH[id]] || GLYPH.gem}" fill="#d8e4ff" fill-rule="evenodd"/></g></svg>`;
}
const num = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
/** "+1,2% Tốc đánh" / "+40 HP" / "+1,6 HP/giây". */
export function statText(k, v) {
  if (k === 'regenHp') return `+${num(v)} HP/giây`;
  const [n, u] = STAT_LABEL[k] || [k, ''];
  return u ? `+${num(v * 100)}% ${n}` : `+${num(v)} ${n}`;
}
/** Tổng chỉ số của trang, mỗi dòng một chỉ số. */
export const pageLines = (page) => (page ? Object.entries(pageStats(page)).map(([k, v]) => statText(k, v)) : []);
/** Chữ chỉ số của một viên. */
export const charmLine = (id) => Object.entries(CHARMS[id]?.stats || {}).map(([k, v]) => statText(k, v)).join(' · ');
