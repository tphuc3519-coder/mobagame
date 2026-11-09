// Bộ biểu tượng giao diện UI v5 "Sơn mài" (2026-11-09): nét vẽ tay bằng SVG, một kiểu nét — chỉ vàng 2,6/48, đầu nét tròn, nền trong
// mờ vàng, điểm nhấn son đỏ / ngọc / ngà. Thay bộ biểu tượng 3D bóng loáng cũ (assets/ui/icons/*.webp — vẽ canvas có dải màu kim loại,
// trông "ảnh AI"). Tiền (đồng tiền lỗ vuông), ngọc (xanh ngọc bích), đèn lồng, rương tô phẳng cho dễ nhận.
//   node tools/uiart/icons5.mjs   → ghi assets/ui/icons/<tên>.svg (src/ui/kit.js iconSrc đọc .svg, huy hiệu hạng vẫn .webp)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/ui/icons');
const G = '#d8b468', GL = '#ecd69f', GD = '#b08a45', GF = 'rgba(216,180,104,.16)', IV = 'rgba(242,231,208,.14)', VR = '#c4412f', VD = '#7a2418';
const S = (w = 2.6, c = G) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const SF = (fill = GF, w = 2.6, c = G) => `fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** đồng tiền lỗ vuông */
const coin = (cx, cy, r) => {
  const h = r * 0.27, k = r / 19;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${G}" stroke="#7d5f28" stroke-width="${1.6 * k}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r * 0.76}" fill="none" stroke="#97773a" stroke-width="${1.3 * k}"/>`
    + `<rect x="${cx - h}" y="${cy - h}" width="${2 * h}" height="${2 * h}" fill="#2a1d14" stroke="#7d5f28" stroke-width="${1.3 * k}"/>`
    + `<path d="M${cx} ${cy - r * 0.68}v${r * 0.2}M${cx} ${cy + r * 0.48}v${r * 0.2}M${cx - r * 0.68} ${cy}h${r * 0.2}M${cx + r * 0.48} ${cy}h${r * 0.2}" stroke="#7d5f28" stroke-width="${1.9 * k}" stroke-linecap="round"/>`
    + `<path d="M${cx - r * 0.6} ${cy - r * 0.34}a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.3}-${r * 0.3}" stroke="#f5e2ac" stroke-width="${2 * k}" stroke-linecap="round" fill="none"/>`;
};

const gear = () => {
  let teeth = '';
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a); teeth += `M${(24 + c * 14.2).toFixed(2)} ${(24 + s * 14.2).toFixed(2)}L${(24 + c * 18).toFixed(2)} ${(24 + s * 18).toFixed(2)}`; }
  return `<path d="${teeth}" ${S(5.2)}/><circle cx="24" cy="24" r="12.6" ${SF()}/><circle cx="24" cy="24" r="4.8" ${S(2.6, GL)}/>`;
};

export const ICONS5 = {
  coin: coin(24, 24, 19),
  coins: coin(30, 18, 13) + coin(19, 29, 14.5),
  gem: `<path d="M24 5 40 17 24 43 8 17Z" fill="#4f9a80" stroke="#1d463b" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M8 17 16 9h16l8 8Z" fill="#8fd0b6" stroke="#1d463b" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="M16 9l8 8 8-8M8 17h32M16 17l8 26 8-26" fill="none" stroke="#2b6655" stroke-width="1.2" stroke-linejoin="round"/>`
    + `<path d="M13 15.5l4-4" stroke="#e8f7f0" stroke-width="1.8" stroke-linecap="round"/>`,
  mail: `<rect x="7" y="12" width="34" height="24" rx="2.5" ${SF()}/><path d="M8.5 14 24 26 39.5 14" ${S()}/><circle cx="24" cy="26.5" r="4.4" fill="${VR}" stroke="${VD}" stroke-width="1"/>`,
  gear: gear(),
  trophy: `<path d="M15 9h18v9a9 9 0 0 1-18 0Z" ${SF()}/><path d="M15 12H9.5c0 5 2.5 8 6.5 8.6M33 12h5.5c0 5-2.5 8-6.5 8.6" ${S(2.4)}/>`
    + `<path d="M24 27v6M16.5 39.5h15M19 33h10v6.5H19z" ${S()}/><path d="M19.6 12.5v5" ${S(2, GL)}/>`,
  friends: `<circle cx="18" cy="17" r="6" ${SF()}/><path d="M7 38.5c.8-7 5.2-11 11-11s10.2 4 11 11" ${S()}/>`
    + `<circle cx="32.5" cy="15.5" r="5" ${S(2.2, GL)}/><path d="M31.5 24.5c5.5-.3 9.3 3.2 10 9.5" ${S(2.2, GL)}/>`,
  chat: `<path d="M9 10.5h30a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H22l-8 6.5v-6.5H9a3 3 0 0 1-3-3v-15a3 3 0 0 1 3-3Z" ${SF()}/>`
    + `<circle cx="16" cy="21" r="2.1" fill="${G}"/><circle cx="24" cy="21" r="2.1" fill="${G}"/><circle cx="32" cy="21" r="2.1" fill="${G}"/>`,
  scroll: `<path d="M13 9h22v30H13z" ${SF(IV)}/><path d="M9.5 9h29M9.5 39h29" ${S(4.2)}/>`
    + `<path d="M18 17h12M18 22h12M18 27h7" ${S(2, GL)}/><rect x="26.5" y="28.5" width="6.5" height="6.5" rx="1" fill="${VR}"/>`,
  swords: `<path d="M9 9 29 29M39 9 19 29" ${S(3.2, GL)}/><path d="M25 33l8-8M15 25l8 8" ${S(3)}/><path d="M31 31l6 6M17 31l-6 6" ${S(3.6)}/>`
    + `<circle cx="38.6" cy="38.6" r="2.3" fill="${G}"/><circle cx="9.4" cy="38.6" r="2.3" fill="${G}"/>`,
  helmet: `<path d="M24 3.5c2-2.8 6.5-3.3 9.5-1.6" ${S(3, VR)}/>`
    + `<path d="M24 8c-8.8 0-15 6.4-15 15.2V37h9l1.6-7h8.8l1.6 7h9V23.2C39 14.4 32.8 8 24 8Z" ${SF()}/>`
    + `<path d="M15.5 21.5h17" ${S(3.2)}/><path d="M24 8v8.5" ${S(2.4, GL)}/>`,
  items: `<path d="M24 5l3.6 5.2V30h-7.2V10.2Z" ${SF(IV, 2.4, GL)}/><path d="M24 12v16" stroke="${GL}" stroke-width="1.3" opacity=".7"/>`
    + `<path d="M14 31.5h20" ${S(3.6)}/><path d="M24 33v7" ${S(3.8)}/><circle cx="24" cy="42.6" r="2.5" fill="${G}"/>`,
  bag: `<path d="M18 14c-6 4-10 10-10 17 0 6 5 9 16 9s16-3 16-9c0-7-4-13-10-17" ${SF()}/><path d="M17 14h14" ${S()}/>`
    + `<path d="M19.5 14 17 8h14l-2.5 6" ${S(2.4)}/><path d="M24 14c-3 2.2-5 4.4-6 6.6" ${S(2.4, VR)}/>`,
  book: `<path d="M24 13c-4-3-10-4-16-3v27c6-1 12 0 16 3 4-3 10-4 16-3V10c-6-1-12 0-16 3Z" ${SF()}/><path d="M24 13v27" ${S(2.2)}/>`
    + `<path d="M12 17c3-.4 6 0 8 1M12 22c3-.4 6 0 8 1M28 18c2-1 5-1.4 8-1M28 23c2-1 5-1.4 8-1" ${S(1.8, GL)}/><circle cx="32" cy="31" r="2.6" fill="${VR}"/>`,
  hourglass: `<path d="M13 7h22M13 41h22" ${S(3.4)}/><path d="M16 8c0 9 8 11 8 16s-8 7-8 16M32 8c0 9-8 11-8 16s8 7 8 16" ${S()}/>`
    + `<path d="M19 37.5c1.5-4 3.5-5.5 5-6.5 1.5 1 3.5 2.5 5 6.5Z" fill="${GL}"/><path d="M20.4 15h7.2c-1 2.4-2.5 3.6-3.6 4.4-1.1-.8-2.6-2-3.6-4.4Z" fill="${GL}" opacity=".75"/>`,
  chest: `<path d="M8 21h32v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z" ${SF()}/><path d="M8 21v-3c0-5 4-9 9-9h14c5 0 9 4 9 9v3" ${SF('rgba(216,180,104,.08)')}/>`
    + `<path d="M8 25.5h32M17 9.5v29M31 9.5v29" stroke="${GD}" stroke-width="2"/><rect x="20.5" y="22" width="7" height="8.5" rx="1.4" fill="${VR}" stroke="${VD}" stroke-width="1.2"/>`,
  lantern: `<path d="M24 3v4" ${S(2.4)}/><rect x="17" y="7" width="14" height="4" rx="1.2" fill="${G}"/>`
    + `<path d="M14 14c0-1.6 4.5-3 10-3s10 1.4 10 3c2 4.5 2 13.5 0 18 0 1.6-4.5 3-10 3s-10-1.4-10-3c-2-4.5-2-13.5 0-18Z" fill="${VR}" stroke="${GL}" stroke-width="1.8"/>`
    + `<path d="M19 13c-1 6-1 13 0 21M29 13c1 6 1 13 0 21M24 11v24" stroke="#f0c48a" stroke-width="1.3" opacity=".8" fill="none"/>`
    + `<rect x="18" y="35" width="12" height="3.5" rx="1.2" fill="${G}"/><path d="M24 38.5v6.5M22 45h4" ${S(2.2, VR)}/>`,
  star: `<path d="M24 6l5.3 11.2 12.2 1.5-9 8.4 2.4 12.1L24 33.2l-10.9 6 2.4-12.1-9-8.4 12.2-1.5Z" ${SF('rgba(216,180,104,.2)')}/>`,
  target: `<circle cx="24" cy="24" r="16.5" ${S()}/><circle cx="24" cy="24" r="10" ${SF()}/><circle cx="24" cy="24" r="4" fill="${VR}"/>`
    + `<path d="M24 3.5v6M24 38.5v6M3.5 24h6M38.5 24h6" ${S(2.2, GL)}/>`,
  shop: `<path d="M8 18l3-9h26l3 9" ${S()}/>`
    + `<path d="M8 18c0 3 2 5 4.5 5S17 21 17 18c0 3 2 5 3.5 5S24 21 24 18c0 3 2 5 3.5 5S31 21 31 18c0 3 2 5 4.5 5S40 21 40 18Z" fill="${VR}" stroke="${G}" stroke-width="2" stroke-linejoin="round"/>`
    + `<path d="M11 23v16h26V23" ${SF('rgba(216,180,104,.12)')}/><path d="M20 39v-9h8v9" ${S(2.4)}/>`,
  bolt: `<path d="M27.5 5 12 27h10l-3 16 17-23H26Z" ${SF('rgba(216,180,104,.22)')}/>`,
};

export const svgOf = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96">${ICONS5[name]}</svg>\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const n of Object.keys(ICONS5)) writeFileSync(path.join(OUT, `${n}.svg`), svgOf(n));
  console.log(`ghi ${Object.keys(ICONS5).length} biểu tượng vào ${OUT}`);
}
