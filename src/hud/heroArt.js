// Icon kỹ năng "chất riêng" của từng tướng: khung kim loại theo tướng (sắt nung, đồng thau, ngọc bích, bạc, bạch kim, vàng),
// nền chuyển sắc + hoa văn chủ đề (tia lửa lò rèn, bọt nước, rừng trúc, trăng sao, mây gió, đèn lồng), hình vẽ riêng cho từng chiêu.
// Toạ độ SVG 0..64. Tự vẽ, không dùng hình của game khác (docs/01 §5).
import { skillArt } from './art.js';

let uid = 0;
const P = {
  hoa_ren: { bg: ['#ff8a2a', '#5a1a06', '#120604'], rim: ['#fff0d8', '#8a8a92', '#2a2626'], hot: '#ff7a1a', gem: '#ffb040', glow: '#ff9a3a', fill: ['#fff4d8', '#ff8a2a'] },
  thach_quy: { bg: ['#3fd8e8', '#0a4a66', '#041220'], rim: ['#fff4c0', '#d8a850', '#5a3a12'], hot: '#2ad0ff', gem: '#5fe8ff', glow: '#7fefff', fill: ['#f0ffff', '#38c8e8'] },
  bong_tre: { bg: ['#7af0a0', '#0e5a30', '#04140a'], rim: ['#eaffe8', '#3fae6a', '#0c3a1e'], hot: '#5dff8a', gem: '#9affb8', glow: '#8affb0', fill: ['#f4fff0', '#5ae08a'] },
  nguyet_ha: { bg: ['#b8d8ff', '#2a3a8a', '#080a24'], rim: ['#ffffff', '#b8c4dc', '#4a5470'], hot: '#9ad8ff', gem: '#d8f0ff', glow: '#c8e8ff', fill: ['#ffffff', '#8ac8ff'] },
  canh_dieu: { bg: ['#7ac8f0', '#1a5090', '#06142a'], rim: ['#ffffff', '#e8e0c0', '#7a6a40'], hot: '#c8f4ff', gem: '#ff6a5a', glow: '#e8fbff', fill: ['#ffffff', '#9ae0ff'] },
  long_dang: { bg: ['#ffd27a', '#a0400e', '#2a0c04'], rim: ['#fff8d8', '#e8b040', '#6a3a08'], hot: '#ffc84a', gem: '#ff5a3a', glow: '#ffe08a', fill: ['#fffbe8', '#ffc84a'] },
};

/** Hoa văn nền theo tướng (vẽ mờ phía sau hình chính). */
const MOTIF = {
  hoa_ren: (r) => `${[[12, 46, 2.2], [20, 52, 1.4], [50, 44, 1.8], [46, 54, 1.2], [14, 18, 1.2], [52, 16, 1.6], [40, 10, 1]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#ffb050" opacity="0.8"/>`).join('')}
    <path d="M4 58l10-8 6 4 8-7M60 56l-9-6-5 3" stroke="#ff6a10" stroke-width="1.6" fill="none" opacity="0.55"/>`,
  thach_quy: () => `${[[10, 50, 3], [16, 42, 1.8], [52, 48, 2.6], [56, 38, 1.5], [12, 20, 1.6], [50, 14, 2]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="none" stroke="#bff6ff" stroke-width="0.9" opacity="0.7"/>`).join('')}
    <path d="M0 56c8-4 14 4 22 0s14-4 22 0 14 4 20 0M0 62c8-4 14 4 22 0s14-4 22 0 14 4 20 0" stroke="#5fe0ff" stroke-width="1.4" fill="none" opacity="0.4"/>`,
  bong_tre: () => `<g opacity="0.45" stroke="#1f8a4a" stroke-width="4" stroke-linecap="round"><path d="M9 64V2M55 64V0"/></g><g opacity="0.5" stroke="#0a3a1c" stroke-width="1.2"><path d="M6 18h6M6 36h6M52 12h6M52 30h6M52 48h6"/></g>
    <path d="M12 26c6-2 10 0 12 3-5 1-9 0-12-3zM52 40c-6-2-10 0-12 3 5 1 9 0 12-3z" fill="#3ad27a" opacity="0.55"/>`,
  nguyet_ha: () => `${[[10, 12, 1.2], [18, 8, 0.8], [54, 20, 1], [48, 8, 0.7], [8, 30, 0.7], [58, 34, 0.9]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff" opacity="0.9"/>`).join('')}
    <path d="M0 54c10-5 20 5 32 0s22-5 32 0" stroke="#9ad8ff" stroke-width="1.3" fill="none" opacity="0.5"/>`,
  canh_dieu: () => `<g fill="#ffffff" opacity="0.28"><ellipse cx="14" cy="52" rx="14" ry="6"/><ellipse cx="50" cy="54" rx="16" ry="6"/><ellipse cx="46" cy="12" rx="12" ry="4"/></g>
    <path d="M2 30c10-4 16 2 24-2M38 40c8-3 14 1 24-2" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.5"/>`,
  long_dang: () => `${[[10, 14, 5], [54, 12, 4], [8, 50, 4.5], [56, 50, 5.5], [32, 6, 3]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#ffd27a" opacity="0.32"/>`).join('')}
    <path d="M0 8c16 6 48 6 64 0" stroke="#7a2a08" stroke-width="1.2" fill="none" opacity="0.6"/>`,
};

/** Hình chính cho từng chiêu. F = chuyển sắc của hình (sáng → màu tướng), A = màu nhấn. */
const G = {
  hoa_ren: {
    // Vung Búa: búa rèn vung thành cung lửa
    s1: (F, A) => `<path d="M10 40A26 26 0 0 1 40 10" stroke="${A}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85"/><path d="M14 44A22 22 0 0 1 40 18" stroke="#ffe8a0" stroke-width="2" fill="none" opacity="0.8"/>
      <path d="M22 54l18-24" stroke="#5a3420" stroke-width="5.5" stroke-linecap="round"/><path d="M30 14l20 12-7 12-20-12z" fill="${F}" stroke="#2a1a14" stroke-width="2" stroke-linejoin="round"/><path d="M33 17l14 8" stroke="#fff" stroke-width="1.5" opacity="0.7"/>`,
    // Xỉ Sắt: giáp sắt nóng chảy nhỏ giọt
    s2: (F, A) => `<path d="M32 8l20 8v14c0 12-8 20-20 25-12-5-20-13-20-25V16z" fill="${F}" stroke="#2a1a14" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M18 30c4 2 6 6 5 10M46 30c-4 2-6 6-5 10M32 20v14" stroke="${A}" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="23" cy="44" r="2.2" fill="${A}"/><circle cx="41" cy="45" r="2.6" fill="${A}"/><path d="M26 14l6-3 6 3" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.7"/>`,
    // Đe Trời: đe sắt khổng lồ giáng xuống, đất nứt lửa
    s3: (F, A) => `<path d="M8 56c8-6 40-6 48 0" stroke="${A}" stroke-width="3" fill="none"/><path d="M20 55l4-6M32 56v-7M44 55l-4-6" stroke="#ffd070" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 22h36l-6 8h-6v8h8v6H18v-6h8v-8h-6z" fill="${F}" stroke="#2a1a14" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 6v10M32 4v12M40 6v10" stroke="#ffe0a0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`,
  },
  thach_quy: {
    // Móc Neo: mỏ neo đồng thau + xích
    s1: (F, A) => `<path d="M6 10l4 4M12 16l4 4M18 22l3 3" stroke="#d8d0c0" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="14" r="5" fill="none" stroke="${F}" stroke-width="3.5"/>
      <path d="M36 19v32M26 28h20M18 40c2 10 10 15 18 15s16-5 18-15" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round"/><path d="M18 40l-3 7 8-2M54 40l3 7-8-2" fill="${A}"/>`,
    // Dậm Áp Suất: chiếc ủng lặn dậm, vòng áp suất
    s2: (F, A) => `<ellipse cx="32" cy="50" rx="26" ry="7" fill="none" stroke="${A}" stroke-width="2.5" opacity="0.9"/><ellipse cx="32" cy="50" rx="16" ry="4" fill="none" stroke="#bff6ff" stroke-width="1.6"/>
      <path d="M22 10h16v22l12 6v8H18V32l4-2z" fill="${F}" stroke="#123040" stroke-width="2.2" stroke-linejoin="round"/><path d="M20 38h30" stroke="#123040" stroke-width="2"/><circle cx="26" cy="16" r="1.6" fill="#123040"/><circle cx="34" cy="16" r="1.6" fill="#123040"/>`,
    // Xoáy Nước Sâu: xoáy nước quanh mũ lặn
    s3: (F, A) => `<path d="M32 32m-6 0a6 6 0 1 1 12 0 12 12 0 1 1-22 2 18 18 0 1 1 34-6 24 24 0 1 1-40 18" fill="none" stroke="${A}" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>
      <circle cx="32" cy="32" r="11" fill="${F}" stroke="#123040" stroke-width="2"/><circle cx="32" cy="32" r="5.5" fill="#0a3a4a" stroke="#ffe8a0" stroke-width="1.6"/><path d="M28 29a4 4 0 0 1 4-2" stroke="#fff" stroke-width="1.2" fill="none"/>`,
  },
  bong_tre: {
    // Lá Bay: ba lá trúc phóng đi, vệt gió
    s1: (F, A) => `<path d="M6 44h14M4 34h12M8 24h10" stroke="#d8ffe0" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      ${[[24, 22, -20], [30, 34, -8], [26, 46, 6]].map(([x, y, r]) => `<path d="M${x} ${y}c10-7 22-6 30-1-9 6-21 6-30 1z" fill="${F}" stroke="#0a3a1c" stroke-width="1.6" transform="rotate(${r} ${x} ${y})"/><path d="M${x + 2} ${y}h24" stroke="${A}" stroke-width="1" transform="rotate(${r} ${x} ${y})"/>`).join('')}`,
    // Lướt Đốt: bóng người lướt + vệt chém chéo
    s2: (F, A) => `<path d="M8 52L52 10" stroke="${A}" stroke-width="5" stroke-linecap="round" opacity="0.9"/><path d="M12 54L54 14" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14 22h10M10 30h10M18 14h8" stroke="#d8ffe0" stroke-width="2" stroke-linecap="round" opacity="0.6"/><path d="M40 40l8 2-3 8z" fill="${F}"/><path d="M22 34l6-4 4 6-6 4z" fill="${F}" stroke="#0a3a1c" stroke-width="1.4"/>`,
    // Rừng Nuốt Bóng: mặt nạ trong bóng tối giữa thân trúc
    s3: (F, A) => `<path d="M14 64V4M50 64V4" stroke="#0a3a1c" stroke-width="6"/><path d="M14 20h0M14 40h0" stroke="${A}"/><path d="M11 22h6M11 42h6M47 16h6M47 36h6" stroke="${A}" stroke-width="1.6"/>
      <path d="M32 14c10 0 14 8 14 16 0 10-6 20-14 22-8-2-14-12-14-22 0-8 4-16 14-16z" fill="#0a1a10" stroke="${F}" stroke-width="2"/><path d="M24 30c3-3 6-3 7 0M33 30c1-3 4-3 7 0" stroke="${A}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  },
  nguyet_ha: {
    // Giọt Bạc: giọt nước bạc xuyên thấu
    s1: (F, A) => `<path d="M6 54L36 24" stroke="${A}" stroke-width="2.4" stroke-dasharray="4 3" opacity="0.8"/><path d="M44 8c-2 10-14 16-14 26a12 12 0 0 0 24 0c0-10-12-16-10-26z" fill="${F}" stroke="#2a3a8a" stroke-width="2" transform="rotate(45 42 32)"/>
      <circle cx="38" cy="30" r="3" fill="#fff" opacity="0.85"/>`,
    // Xoáy Nước: xoáy nước dưới trăng khuyết
    s2: (F, A) => `<path d="M44 8a10 10 0 1 0 8 15 8 8 0 1 1-8-15z" fill="#fff8e0" opacity="0.95"/>
      <path d="M32 40m-4 0a4 4 0 1 1 8 0 9 9 0 1 1-16 2 14 14 0 1 1 26-4 19 19 0 1 1-30 12" fill="none" stroke="${F}" stroke-width="3.6" stroke-linecap="round"/><path d="M22 52c6 3 14 3 20 0" stroke="${A}" stroke-width="1.6" fill="none"/>`,
    // Lũ Nguyệt: trăng tròn trên cơn sóng lớn
    s3: (F, A) => `<circle cx="34" cy="20" r="12" fill="#fff8e0"/><circle cx="30" cy="17" r="2.4" fill="#e8dcc0"/><circle cx="38" cy="24" r="1.8" fill="#e8dcc0"/>
      <path d="M4 56c4-14 14-22 26-20-6 2-9 6-8 10 6-8 16-8 22-2s10 6 16 2v14H4z" fill="${F}" stroke="#2a3a8a" stroke-width="2" stroke-linejoin="round"/><path d="M12 50c4-6 9-9 14-9" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.8"/>`,
  },
  canh_dieu: {
    // Mũi Tên Gió: mũi tên có vệt gió xoắn
    s1: (F, A) => `<path d="M6 46c8-2 10-10 18-10s8 8 16 6" stroke="${A}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8 56L50 14" stroke="${F}" stroke-width="4" stroke-linecap="round"/>
      <path d="M56 8l-4 16-12-12z" fill="${F}" stroke="#0a2a4a" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 56l1-10M8 56l10-1M12 52l1-9M12 52l9-1" stroke="#ff6a5a" stroke-width="2.4" stroke-linecap="round"/>`,
    // Lộn Diều: con diều lộn vòng
    s2: (F, A) => `<path d="M10 46c-4-16 8-30 22-30" stroke="${A}" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><path d="M40 8l14 16-14 24-14-24z" fill="${F}" stroke="#0a2a4a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M40 8v40M26 24h28" stroke="#ff6a5a" stroke-width="1.8"/><path d="M40 48c-4 4 0 6-4 10M36 54l-4 1M38 58l-4 2" stroke="#ff6a5a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    // Mưa Tên: mưa tên từ trên xuống
    s3: (F, A) => `<path d="M6 10c12-6 40-6 52 0" stroke="${A}" stroke-width="2" fill="none" opacity="0.8"/>
      ${[[14, 14], [26, 10], [38, 14], [50, 10], [20, 30], [44, 30], [32, 28]].map(([x, y]) => `<path d="M${x} ${y}v${16}" stroke="${F}" stroke-width="2.6" stroke-linecap="round"/><path d="M${x - 3} ${y + 13}l3 6 3-6z" fill="${F}"/>`).join('')}<path d="M10 58c10-4 34-4 44 0" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.7"/>`,
  },
  long_dang: {
    // Đèn Trôi: đèn lồng bay có vệt lửa
    s1: (F, A) => `<path d="M8 52c6-2 10-8 16-10" stroke="${A}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/><circle cx="12" cy="50" r="2" fill="#fff"/>
      <path d="M38 10v4" stroke="#7a2a08" stroke-width="2"/><path d="M28 18h20l2 6v12l-2 6H28l-2-6V24z" fill="${F}" stroke="#7a2a08" stroke-width="2" stroke-linejoin="round"/><path d="M28 18h20M28 42h20" stroke="#c8501a" stroke-width="3"/>
      <path d="M38 24c3 4 3 8 0 12-3-4-3-8 0-12z" fill="#fff6c0"/><path d="M38 44v8" stroke="#c8301a" stroke-width="2"/>`,
    // Thắp Sáng: bàn tay nâng ngọn lửa trao đồng đội
    s2: (F, A) => `<path d="M32 8c7 8 10 14 6 22-2 4-10 4-12 0-4-8-1-14 6-22z" fill="${F}" stroke="#7a2a08" stroke-width="1.8"/><path d="M32 18c3 4 4 7 2 10h-4c-2-3-1-6 2-10z" fill="#fffbe0"/>
      <path d="M12 40c6 0 10 4 14 4h12c2 0 2 4 0 4H28M12 52l8-4h16l14-8c3-2 5 2 2 4L36 56H12" fill="${F}" stroke="#7a2a08" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="20" r="2" fill="${A}"/><circle cx="14" cy="22" r="1.6" fill="${A}"/>`,
    // Hội Đèn: vòng đèn lồng thắp sáng quanh đội
    s3: (F, A) => `<circle cx="32" cy="34" r="20" fill="none" stroke="${A}" stroke-width="2" stroke-dasharray="3 4" opacity="0.8"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3 - Math.PI / 2, x = 32 + Math.cos(a) * 20, y = 34 + Math.sin(a) * 20; return `<path d="M${x - 5} ${y - 6}h10l1 3v6l-1 3h-10l-1-3v-6z" fill="${F}" stroke="#7a2a08" stroke-width="1.4"/>`; }).join('')}
      <path d="M32 26c5 6 6 10 3 14h-6c-3-4-2-8 3-14z" fill="#fff6c0" stroke="${A}" stroke-width="1.4"/>`,
  },
};

/** Khung + nền + hoa văn + hình chính cho (tướng, ô chiêu). Không có thiết kế riêng → icon chung theo cơ chế. */
export function heroSkillArt(heroId, slot, skill, theme) {
  const p = P[heroId], g = G[heroId]?.[slot];
  if (!p || !g) return skillArt(skill, theme);
  const id = 'h' + uid++, F = `url(#${id}f)`;
  return `<svg class="art" viewBox="0 0 64 64" aria-hidden="true"><defs>
    <radialGradient id="${id}b" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.rim[0]}"/><stop offset="0.45" stop-color="${p.rim[1]}"/><stop offset="1" stop-color="${p.rim[2]}"/></linearGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${p.fill[0]}"/><stop offset="1" stop-color="${p.fill[1]}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}v" cx="50%" cy="50%" r="50%"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>
    <filter id="${id}d" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.3"/><feOffset dy="1.5"/><feComponentTransfer><feFuncA type="linear" slope="0.85"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}h" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <clipPath id="${id}c"><circle cx="32" cy="32" r="27.5"/></clipPath>
  </defs>
  <circle cx="32" cy="32" r="31.5" fill="url(#${id}r)"/>
  <circle cx="32" cy="32" r="29.6" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="1"/>
  ${[0, 90, 180, 270].map((a) => `<circle cx="${32 + Math.sin(a * Math.PI / 180) * 30}" cy="${32 - Math.cos(a * Math.PI / 180) * 30}" r="1.4" fill="${p.rim[2]}" stroke="${p.rim[0]}" stroke-width="0.6"/>`).join('')}
  <circle cx="32" cy="32" r="28" fill="url(#${id}b)"/>
  <g clip-path="url(#${id}c)">
    <g>${MOTIF[heroId]()}</g>
    <g opacity="0.6" filter="url(#${id}h)" fill="${p.glow}" stroke="${p.glow}">${g(p.glow, p.glow)}</g>
    <g filter="url(#${id}d)">${g(F, p.hot)}</g>
    <circle cx="32" cy="32" r="28" fill="url(#${id}v)"/>
    <ellipse cx="32" cy="11" rx="21" ry="10" fill="url(#${id}s)"/>
  </g>
  <circle cx="32" cy="32" r="28" fill="none" stroke="${p.hot}" stroke-opacity="0.55" stroke-width="1"/>
  <path d="M32 0.8l3.2 4.2-3.2 3-3.2-3z" fill="${p.gem}" stroke="${p.rim[2]}" stroke-width="0.8"/>
</svg>`;
}

/** Nút đánh thường (mọi tướng): nắm đấm đỏ đồng, có vệt lực. */
export function fistArt() {
  const id = 'fist' + uid++;
  return `<svg class="art" viewBox="0 0 64 64" aria-hidden="true"><defs>
    <radialGradient id="${id}b" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="#e05a3a"/><stop offset="0.6" stop-color="#6a1410"/><stop offset="1" stop-color="#1a0606"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2d0"/><stop offset="0.45" stop-color="#d8a048"/><stop offset="1" stop-color="#5a3010"/></linearGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#fff4e6"/><stop offset="1" stop-color="#f0b48a"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}d" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/><feOffset dy="1.6"/><feComponentTransfer><feFuncA type="linear" slope="0.85"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}h"><feGaussianBlur stdDeviation="2.4"/></filter>
    <clipPath id="${id}c"><circle cx="32" cy="32" r="27.5"/></clipPath>
  </defs>
  <circle cx="32" cy="32" r="31.5" fill="url(#${id}r)"/><circle cx="32" cy="32" r="28" fill="url(#${id}b)"/>
  <g clip-path="url(#${id}c)">
    <g stroke="#ffd0a0" stroke-width="2.4" stroke-linecap="round" opacity="0.75"><path d="M6 26h10M4 34h12M7 42h9"/></g>
    <path d="M20 20l6-3M54 12l-6 6M56 30l-7 1M52 48l-6-4" stroke="#ffe8b0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <g opacity="0.55" filter="url(#${id}h)"><path d="M20 24c0-4 3-6 6-6h16c5 0 8 3 8 8v14c0 7-5 12-12 12H28c-5 0-8-4-8-8z" fill="#ffb07a"/></g>
    <g filter="url(#${id}d)" stroke="#4a1a10" stroke-width="2" stroke-linejoin="round">
      <path d="M20 26c0-4 3-6 6-6h18c4 0 7 3 7 7v13c0 7-5 12-12 12H29c-5 0-9-4-9-9z" fill="url(#${id}f)"/>
      <path d="M26 20v8M33 20v8M40 20v8M46 22v7" fill="none"/>
      <path d="M20 32c4-1 9 0 12 3 2 2 1 5-2 5h-8" fill="url(#${id}f)"/>
    </g>
    <path d="M24 23h20" stroke="#fff" stroke-width="1.4" opacity="0.7"/>
    <ellipse cx="32" cy="11" rx="21" ry="10" fill="url(#${id}s)"/>
  </g>
</svg>`;
}
