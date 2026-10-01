// Icon kỹ năng phong cách tranh vẽ (kiểu icon MOBA chuyên nghiệp): nền tối có vân sơn + quầng sáng phía sau vật thể,
// vật thể đổ khối bằng chuyển sắc nhiều nấc (sáng trên-trái → bóng dưới-phải) + viền sáng mảnh phía nắng, không viền đen dày;
// lớp hiệu ứng phát sáng (lửa, nước, gió, ánh trăng) cộng sáng; khung kim loại mảnh. Toạ độ 0..128.
// Tự vẽ, không dùng hình của game khác (docs/01 §5).
import { skillArt } from './art.js';

let uid = 0;

/** Bộ dựng một icon: quản lý defs (chuyển sắc, bộ lọc) theo id duy nhất. */
function kit() {
  const id = 'i' + uid++, defs = [];
  const k = {
    id,
    /** chuyển sắc thẳng: stops = [[offset, màu, độ đục?], ...], hướng (x1,y1)→(x2,y2) theo tỉ lệ khung vật thể */
    lin(name, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) { defs.push(`<linearGradient id="${id}${name}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`); return `url(#${id}${name})`; },
    rad(name, stops, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) { defs.push(`<radialGradient id="${id}${name}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`); return `url(#${id}${name})`; },
    /** gradient theo toạ độ thật (userSpaceOnUse) — cho vệt/ cung kéo dài */
    linU(name, stops, x1, y1, x2, y2) { defs.push(`<linearGradient id="${id}${name}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`); return `url(#${id}${name})`; },
    defs: () => defs.join(''),
  };
  return k;
}

const BLUR = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
/** Khung + nền + các lớp. theme: { bg: [tâm, giữa, mép], glow, glowAt: [x,y], rim: [sáng, tối] } */
function frame(k, theme, body, fx = '') {
  const id = k.id, [gx, gy] = theme.glowAt || [64, 56];
  return `<svg class="art" viewBox="0 0 128 128" aria-hidden="true"><defs>
    <radialGradient id="${id}BG" cx="0.5" cy="0.42" r="0.68"><stop offset="0" stop-color="${theme.bg[0]}"/><stop offset="0.55" stop-color="${theme.bg[1]}"/><stop offset="1" stop-color="${theme.bg[2]}"/></radialGradient>
    <radialGradient id="${id}GL" cx="${gx / 128}" cy="${gy / 128}" r="0.42"><stop offset="0" stop-color="${theme.glow}" stop-opacity="0.85"/><stop offset="0.5" stop-color="${theme.glow}" stop-opacity="0.25"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}RIM" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.rim[0]}"/><stop offset="0.5" stop-color="${theme.rim[1]}"/><stop offset="1" stop-color="${theme.rim[2] || theme.rim[1]}"/></linearGradient>
    <radialGradient id="${id}VG" cx="0.5" cy="0.5" r="0.5"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>
    <linearGradient id="${id}SH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}TX" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="4" seed="${uid % 97}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 -0.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="${id}DS" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.6"/><feOffset dx="1.5" dy="3"/><feComponentTransfer><feFuncA type="linear" slope="0.75"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${BLUR(id + 'B2', 2)}${BLUR(id + 'B4', 4)}${BLUR(id + 'B8', 8)}
    <clipPath id="${id}C"><circle cx="64" cy="64" r="58"/></clipPath>
    ${k.defs()}
  </defs>
  <circle cx="64" cy="64" r="63" fill="#0b0d14"/>
  <circle cx="64" cy="64" r="61.5" fill="none" stroke="url(#${id}RIM)" stroke-width="3"/>
  <g clip-path="url(#${id}C)">
    <rect width="128" height="128" fill="url(#${id}BG)"/>
    <rect width="128" height="128" fill="${theme.bg[0]}" filter="url(#${id}TX)" opacity="0.5"/>
    <circle cx="${gx}" cy="${gy}" r="56" fill="url(#${id}GL)"/>
    ${theme.back ? theme.back(k) : ''}
    <g filter="url(#${id}DS)">${body}</g>
    <g style="mix-blend-mode:screen">${fx}</g>
    <rect width="128" height="128" fill="url(#${id}VG)"/>
    <ellipse cx="64" cy="18" rx="50" ry="22" fill="url(#${id}SH)"/>
  </g>
  <circle cx="64" cy="64" r="58" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="1.2"/>
  <circle cx="64" cy="64" r="59.6" fill="none" stroke="${theme.rim[0]}" stroke-opacity="0.35" stroke-width="0.8"/>
</svg>`;
}

const sparks = (k, pts, col, glow = true) => pts.map(([x, y, r]) => `${glow ? `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="${col}" opacity="0.35" filter="url(#${k.id}B2)"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('');

// ——— Chủ đề từng tướng ———
const TH = {
  hoa_ren: { bg: ['#6a2410', '#2a0c06', '#0a0404'], glow: '#ff7a22', rim: ['#f4e2c8', '#7a6a62', '#2a2220'] },
  thach_quy: { bg: ['#0e5a6e', '#06243a', '#020a14'], glow: '#36d8ff', rim: ['#ffe9b0', '#b88a3a', '#4a3010'] },
  bong_tre: { bg: ['#1a5a34', '#082414', '#020a06'], glow: '#5dffa0', rim: ['#e2ffe8', '#3f8a5a', '#0e2a18'] },
  nguyet_ha: { bg: ['#2a3a7a', '#0e1440', '#04061a'], glow: '#a8d4ff', rim: ['#ffffff', '#9aa8c4', '#3a4460'] },
  canh_dieu: { bg: ['#2a6aa8', '#0e2c54', '#040e1e'], glow: '#d8f4ff', rim: ['#ffffff', '#d8ccaa', '#6a5a36'] },
  long_dang: { bg: ['#7a3010', '#2e0e06', '#0c0402'], glow: '#ffbe4a', rim: ['#fff2cc', '#d8a040', '#5a3008'] },
};

/** Từng chiêu: trả về [body, fx, (tuỳ chọn) glowAt]. */
const ICONS = {
  hoa_ren: {
    s1: (k) => { // Vung Búa: búa rèn quét cung lửa
      const arc = k.linU('arc', [[0, '#ff3a00', 0], [0.55, '#ff7a1a', 0.9], [0.9, '#ffe2a0', 1], [1, '#fff', 1]], 24, 100, 104, 26);
      const steel = k.lin('st', [[0, '#e8e4e0'], [0.35, '#9a948e'], [0.7, '#4a4440'], [1, '#221e1c']], 0, 0, 1, 1);
      const hot = k.lin('hot', [[0, '#fff2c0'], [0.4, '#ffa040'], [1, '#c02a00']], 0, 0, 1, 0);
      const wood = k.lin('wd', [[0, '#a8724a'], [0.5, '#6a3e22'], [1, '#2e180c']], 0, 0, 1, 0);
      return [`<path d="M20 98C22 56 54 24 100 22" stroke="${arc}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
        <path d="M30 100C32 64 60 36 100 32" stroke="#ffd890" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M34 112L74 58" stroke="${wood}" stroke-width="9" stroke-linecap="round"/><path d="M33 110L72 57" stroke="#d8a070" stroke-width="1.4" opacity="0.6"/>
        <path d="M58 34l34 22-13 21-34-22z" fill="${steel}"/><path d="M58 34l34 22-3 5-34-22z" fill="#f4f0ea" opacity="0.55"/>
        <path d="M92 56l-13 21 6 4 13-21z" fill="${hot}"/><path d="M58 34l-13 21-4-3 13-21z" fill="#3a3430"/>`,
        `${sparks(k, [[100, 30, 1.6], [108, 44, 1.1], [88, 18, 1.2], [112, 26, 0.8], [96, 70, 1]], '#ffb040')}<circle cx="92" cy="64" r="14" fill="#ff8a2a" opacity="0.5" filter="url(#${k.id}B8)"/>`, [86, 52]];
    },
    s2: (k) => { // Xỉ Sắt: giáp ngực sắt đen nứt dung nham, nhỏ giọt
      const plate = k.lin('pl', [[0, '#8a8480'], [0.3, '#4e4844'], [0.75, '#24201e'], [1, '#100e0d']], 0.2, 0, 0.8, 1);
      const lava = k.lin('lv', [[0, '#fff6c8'], [0.35, '#ffb040'], [1, '#ff3a00']], 0, 0, 0, 1);
      return [`<path d="M64 18l34 12c2 26-6 52-34 74-28-22-36-48-34-74z" fill="${plate}"/>
        <path d="M64 18l34 12c0 4 0 6-1 9L64 28 31 39c-1-3-1-5-1-9z" fill="#c8c2bc" opacity="0.5"/>
        <path d="M64 28v70" stroke="#0a0808" stroke-width="2" opacity="0.6"/>
        <path d="M44 44l8 10-4 12 9 9M84 46l-8 9 5 13-10 8M64 52l-5 10 6 8" stroke="${lava}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M48 66c-1 6 2 12 0 18M80 74c1 5-1 9 0 14" stroke="${lava}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <ellipse cx="48" cy="88" rx="3" ry="4.5" fill="${lava}"/><ellipse cx="80" cy="92" rx="2.6" ry="4" fill="${lava}"/>`,
        `<path d="M44 44l8 10-4 12 9 9M84 46l-8 9 5 13-10 8M64 52l-5 10 6 8" stroke="#ff7a1a" stroke-width="7" fill="none" filter="url(#${k.id}B4)" opacity="0.8"/>${sparks(k, [[30, 30, 1], [100, 36, 1.2], [96, 96, 0.9], [26, 80, 0.8]], '#ffa040')}`, [64, 70]];
    },
    s3: (k) => { // Đe Trời: đe sắt rơi từ trời, vệt lửa, sóng chấn
      const steel = k.lin('st', [[0, '#d8d4d0'], [0.4, '#7a746e'], [1, '#1e1a18']], 0, 0, 0.6, 1);
      const trail = k.linU('tr', [[0, '#ff4a00', 0], [0.6, '#ff8a2a', 0.7], [1, '#fff0b0', 1]], 64, 0, 64, 52);
      const ring = k.rad('rg', [[0.55, '#ff7a1a', 0], [0.8, '#ffb040', 0.9], [1, '#ff4a00', 0]]);
      return [`<path d="M44 0h40l-6 52H50z" fill="${trail}" opacity="0.85"/>
        <ellipse cx="64" cy="104" rx="46" ry="12" fill="${ring}"/>
        <path d="M34 50h60l-10 12H74v14h12v10H42V76h12V62H44z" fill="${steel}"/><path d="M34 50h60l-2 3H36z" fill="#fff" opacity="0.6"/>
        <path d="M44 86h40l-3 4H47z" fill="#0c0a0a" opacity="0.7"/>
        <path d="M30 108l14-6 8 5M98 108l-14-6-8 5M64 100v12" stroke="#ffd080" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
        `<ellipse cx="64" cy="102" rx="34" ry="8" fill="#ff8a2a" opacity="0.6" filter="url(#${k.id}B8)"/>${sparks(k, [[22, 96, 1.2], [106, 94, 1.3], [40, 112, 0.9], [92, 114, 1], [64, 92, 1.2]], '#ffb040')}`, [64, 40]];
    },
  },
  thach_quy: {
    s1: (k) => { // Móc Neo: mỏ neo đồng thau, xích, bọt nước
      const brass = k.lin('br', [[0, '#fff0c0'], [0.3, '#e0b058'], [0.7, '#8a5a1c'], [1, '#3a240a']], 0, 0, 1, 1);
      const chain = k.lin('ch', [[0, '#e8eef2'], [1, '#5a6670']], 0, 0, 1, 1);
      return [`${[0, 1, 2, 3].map((i) => `<ellipse cx="${20 + i * 9}" cy="${20 + i * 9}" rx="6" ry="3.4" transform="rotate(45 ${20 + i * 9} ${20 + i * 9})" fill="none" stroke="${chain}" stroke-width="2.6"/>`).join('')}
        <circle cx="66" cy="34" r="8" fill="none" stroke="${brass}" stroke-width="6"/>
        <path d="M66 42v58" stroke="${brass}" stroke-width="9" stroke-linecap="round"/><path d="M50 56h32" stroke="${brass}" stroke-width="8" stroke-linecap="round"/>
        <path d="M30 76c4 20 18 30 36 30s32-10 36-30" stroke="${brass}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M24 70l6 12 10-6zM108 70l-6 12-10-6z" fill="${brass}"/>
        <path d="M64 44v52M32 80c4 14 16 22 32 22" stroke="#fff6d8" stroke-width="1.6" fill="none" opacity="0.65"/>`,
        `${[[22, 100, 4], [100, 102, 3], [14, 84, 2.5], [112, 86, 2], [40, 114, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#bff4ff" stroke-width="1.2" opacity="0.8"/>`).join('')}<path d="M18 110c16-6 30-4 46 0s32 6 48 0" stroke="#7fe8ff" stroke-width="3" fill="none" opacity="0.6" filter="url(#${k.id}B2)"/>`, [66, 70]];
    },
    s2: (k) => { // Dậm Áp Suất: ủng lặn nặng dậm, vòng sóng áp suất
      const boot = k.lin('bt', [[0, '#c8d4d8'], [0.35, '#6a7a82'], [1, '#1a2228']], 0, 0, 1, 1);
      const sole = k.lin('so', [[0, '#e8c070'], [1, '#6a4410']], 0, 0, 0, 1);
      const wave = k.rad('wv', [[0.6, '#36d8ff', 0], [0.86, '#9af0ff', 0.95], [1, '#36d8ff', 0]]);
      return [`<ellipse cx="64" cy="98" rx="54" ry="16" fill="${wave}"/><ellipse cx="64" cy="98" rx="32" ry="9" fill="${wave}"/>
        <path d="M46 16h26v38l20 10c4 2 6 6 6 10v6H38V30c0-8 2-14 8-14z" fill="${boot}"/>
        <path d="M36 80h64v8H36z" fill="${sole}"/><path d="M46 16h26v3H46z" fill="#fff" opacity="0.5"/>
        <path d="M50 36h18M50 46h18" stroke="#0e1418" stroke-width="2.4" opacity="0.7"/><circle cx="54" cy="26" r="2" fill="#e8c070"/><circle cx="66" cy="26" r="2" fill="#e8c070"/>
        <path d="M48 18v58" stroke="#fff" stroke-width="1.2" opacity="0.4"/>`,
        `<ellipse cx="64" cy="96" rx="46" ry="10" fill="#36d8ff" opacity="0.45" filter="url(#${k.id}B4)"/>${[[14, 84, 2], [116, 82, 2.4], [30, 70, 1.4], [100, 68, 1.6], [64, 112, 1.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dffbff"/>`).join('')}`, [64, 90]];
    },
    s3: (k) => { // Xoáy Nước Sâu: xoáy nước sâu quanh mũ lặn đồng
      const w1 = k.linU('w1', [[0, '#36d8ff', 0], [1, '#c8f8ff', 1]], 10, 64, 118, 64);
      const helm = k.rad('hm', [[0, '#fff2c0'], [0.45, '#d8a048'], [1, '#5a3810']], 0.35, 0.3, 0.75);
      const glass = k.rad('gl', [[0, '#c8fbff'], [0.5, '#2a9ab8'], [1, '#04222e']], 0.4, 0.35, 0.7);
      return [`${[50, 40, 30, 21].map((r, i) => `<path d="M${64 + r} 64A${r} ${r * 0.82} 0 1 1 ${64 - r * 0.2} ${64 - r * 0.8}" stroke="${w1}" stroke-width="${6 - i}" fill="none" stroke-linecap="round" opacity="${0.55 + i * 0.12}" transform="rotate(${i * 50} 64 64)"/>`).join('')}
        <circle cx="64" cy="64" r="20" fill="${helm}"/><circle cx="64" cy="64" r="10" fill="${glass}" stroke="#3a2408" stroke-width="2.5"/>
        ${[0, 90, 180, 270].map((a) => `<circle cx="${64 + Math.cos(a * Math.PI / 180) * 15.5}" cy="${64 + Math.sin(a * Math.PI / 180) * 15.5}" r="1.8" fill="#fff0c0"/>`).join('')}
        <path d="M58 60a7 7 0 0 1 6-4" stroke="#fff" stroke-width="1.6" fill="none"/>`,
        `<circle cx="64" cy="64" r="34" fill="none" stroke="#36d8ff" stroke-width="6" opacity="0.35" filter="url(#${k.id}B4)"/>`, [64, 64]];
    },
  },
  bong_tre: {
    s1: (k) => { // Lá Bay: ba lá trúc sắc như dao phóng đi
      const leaf = k.lin('lf', [[0, '#eaffd8'], [0.35, '#7ae08a'], [0.75, '#1e8a48'], [1, '#08361c']], 0, 0, 1, 1);
      const trail = k.linU('tl', [[0, '#5dffa0', 0], [1, '#c8ffd8', 0.9]], 8, 0, 70, 0);
      const L = (x, y, r, s) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-40 0h30" stroke="${trail}" stroke-width="3" opacity="0.7"/><path d="M-12 0C2-10 30-11 46 0 30 11 2 10-12 0z" fill="${leaf}"/><path d="M-10 0H44" stroke="#f4ffe8" stroke-width="1.2" opacity="0.8"/><path d="M-6-2C10-8 28-8 40-2" stroke="#fff" stroke-width="1" fill="none" opacity="0.6"/></g>`;
      return [L(58, 40, -18, 0.9) + L(66, 66, -6, 1.05) + L(58, 92, 8, 0.85), `${sparks(k, [[108, 30, 1.2], [112, 62, 1.4], [104, 98, 1]], '#9affc8')}`, [76, 64]];
    },
    s2: (k) => { // Lướt Đốt: nhát chém lưỡi liềm sáng + bóng lướt
      const slash = k.linU('sl', [[0, '#5dffa0', 0], [0.5, '#9affc8', 0.9], [0.8, '#ffffff', 1], [1, '#ffffff', 0]], 14, 110, 114, 18);
      const body = k.lin('bd', [[0, '#3a6a4a'], [1, '#081a10']], 0, 0, 1, 1);
      return [`${[0.25, 0.45, 0.7].map((o, i) => `<path d="M${22 + i * 12} ${86 - i * 8}l10-14 10 4-4 16z" fill="${body}" opacity="${o}"/>`).join('')}
        <path d="M14 110C40 72 76 40 114 18C86 48 54 80 22 114z" fill="${slash}"/>
        <path d="M20 108C46 74 80 44 112 22" stroke="#ffffff" stroke-width="1.6" fill="none"/>`,
        `<path d="M14 110C40 72 76 40 114 18" stroke="#5dffa0" stroke-width="10" fill="none" opacity="0.5" filter="url(#${k.id}B4)"/>${sparks(k, [[100, 30, 1.4], [86, 46, 1], [70, 62, 1.1]], '#c8ffd8')}`, [70, 60]];
    },
    s3: (k) => { // Rừng Nuốt Bóng: rừng trúc tối, mặt nạ sát thủ mắt phát sáng trong sương
      const stalk = k.lin('sk', [[0, '#2a6a40'], [0.5, '#123a22'], [1, '#04120a']], 0, 0, 1, 0);
      const mist = k.lin('ms', [[0, '#9affc8', 0], [0.5, '#9affc8', 0.35], [1, '#9affc8', 0]], 0, 0, 1, 0);
      const mask = k.rad('mk', [[0, '#3a4a40'], [0.7, '#141c18'], [1, '#05080a']], 0.4, 0.3, 0.8);
      return [`${[[14, 9], [30, 7], [96, 8], [112, 10]].map(([x, w]) => `<rect x="${x - w / 2}" y="-4" width="${w}" height="136" fill="${stalk}"/>${[22, 54, 86, 118].map((y) => `<rect x="${x - w / 2 - 1}" y="${y + (x % 7)}" width="${w + 2}" height="2.4" fill="#04120a"/>`).join('')}`).join('')}
        <path d="M64 30c18 0 26 14 26 30 0 20-12 36-26 40-14-4-26-20-26-40 0-16 8-30 26-30z" fill="${mask}"/>
        <path d="M44 56c6-6 14-6 16 0-6 2-12 2-16 0zM84 56c-6-6-14-6-16 0 6 2 12 2 16 0z" fill="#9affc8"/>
        <path d="M64 30c18 0 26 14 26 30" stroke="#6a8a78" stroke-width="1.2" fill="none" opacity="0.7"/>
        <rect x="0" y="86" width="128" height="20" fill="${mist}"/>`,
        `<path d="M44 56c6-6 14-6 16 0-6 2-12 2-16 0zM84 56c-6-6-14-6-16 0 6 2 12 2 16 0z" fill="#5dffa0" filter="url(#${k.id}B4)"/>`, [64, 58]];
    },
  },
  nguyet_ha: {
    s1: (k) => { // Giọt Bạc: giọt nước bạc lao đi xuyên qua, vòng gợn
      const drop = k.rad('dp', [[0, '#ffffff'], [0.35, '#cfe8ff'], [0.8, '#5a8ad8'], [1, '#1a2a6a']], 0.4, 0.35, 0.7);
      const trail = k.linU('tr', [[0, '#a8d4ff', 0], [1, '#e8f4ff', 0.9]], 10, 110, 70, 50);
      return [`<path d="M10 118L64 64" stroke="${trail}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>
        ${[16, 24, 32].map((r, i) => `<ellipse cx="44" cy="84" rx="${r}" ry="${r * 0.4}" transform="rotate(-45 44 84)" fill="none" stroke="#cfe8ff" stroke-width="${1.6 - i * 0.3}" opacity="${0.8 - i * 0.2}"/>`).join('')}
        <path d="M40 88Q62 56 76 36A17 17 0 1 1 98 60Q76 68 40 88Z" fill="${drop}"/>
        <path d="M80 38a12 12 0 0 1 12-2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
        `<circle cx="78" cy="50" r="18" fill="#a8d4ff" opacity="0.45" filter="url(#${k.id}B8)"/>${sparks(k, [[104, 24, 1.4], [96, 18, 0.8]], '#cfe8ff')}`, [78, 50]];
    },
    s2: (k) => { // Xoáy Nước: xoáy nước dưới trăng khuyết
      const moon = k.rad('mn', [[0, '#ffffff'], [0.7, '#f4f0dc'], [1, '#c8c0a0']], 0.35, 0.35, 0.7);
      const w = k.linU('w', [[0, '#5a8ad8', 0.3], [1, '#e8f4ff', 1]], 20, 110, 100, 60);
      return [`<path d="M92 14a16 16 0 1 0 14 24 13 13 0 1 1-14-24z" fill="${moon}"/>
        ${[38, 30, 22, 14].map((r, i) => `<path d="M${60 + r} 84A${r} ${r * 0.5} 0 1 1 ${60 - r * 0.3} ${84 - r * 0.48}" stroke="${w}" stroke-width="${5 - i * 0.7}" fill="none" stroke-linecap="round" transform="rotate(${i * 40} 60 84)"/>`).join('')}`,
        `<ellipse cx="60" cy="84" rx="30" ry="12" fill="#a8d4ff" opacity="0.45" filter="url(#${k.id}B8)"/><circle cx="96" cy="28" r="16" fill="#fff8e0" opacity="0.4" filter="url(#${k.id}B8)"/>`, [70, 70]];
    },
    s3: (k) => { // Lũ Nguyệt: sóng lớn cuộn dưới trăng tròn
      const moon = k.rad('mn', [[0, '#ffffff'], [0.75, '#f4ecd0'], [1, '#c8b890']], 0.4, 0.35, 0.65);
      const wave = k.lin('wv', [[0, '#e8f4ff'], [0.3, '#7aa8e8'], [0.75, '#24408a'], [1, '#0a1440']], 0, 0, 0.3, 1);
      return [`<circle cx="74" cy="38" r="22" fill="${moon}"/><circle cx="66" cy="32" r="3.5" fill="#d8ccb0" opacity="0.7"/><circle cx="82" cy="46" r="2.4" fill="#d8ccb0" opacity="0.7"/>
        <path d="M0 128V84c10-22 34-34 56-28-14 4-20 14-16 24 8-14 28-16 38-4 8 10 22 14 50 2v50z" fill="${wave}"/>
        <path d="M12 82c10-14 26-22 42-22M42 82c6-10 20-14 30-6" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.85"/>
        ${[[22, 74], [30, 68], [56, 72], [62, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('')}`,
        `<circle cx="74" cy="38" r="26" fill="#fff8e0" opacity="0.4" filter="url(#${k.id}B8)"/>`, [74, 40]];
    },
  },
  canh_dieu: {
    s1: (k) => { // Mũi Tên Gió: mũi tên có vệt gió xoắn
      const shaft = k.lin('sh', [[0, '#f4ecd8'], [1, '#8a6a3a']], 0, 0, 1, 1);
      const tip = k.lin('tp', [[0, '#ffffff'], [0.5, '#b8d8e8'], [1, '#3a5a72']], 0, 0, 1, 1);
      const wind = k.linU('wd', [[0, '#d8f4ff', 0], [1, '#ffffff', 0.95]], 10, 110, 90, 30);
      return [`<path d="M14 100c10-4 12-16 22-18s12 10 22 8 10-14 20-16" stroke="${wind}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M18 112c14-8 16-22 30-24" stroke="${wind}" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M22 106L94 34" stroke="${shaft}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M112 16l-8 28-20-20z" fill="${tip}"/><path d="M112 16l-8 28-4-4 8-20z" fill="#fff" opacity="0.4"/>
        <path d="M22 106l-2-16 8 8zM22 106l16 2-8-8zM30 98l-2-14 8 7zM30 98l14 2-7-8z" fill="#e85a4a"/>`,
        `<path d="M22 106L94 34" stroke="#d8f4ff" stroke-width="10" opacity="0.4" filter="url(#${k.id}B4)"/>${sparks(k, [[114, 14, 1.4]], '#ffffff')}`, [80, 48]];
    },
    s2: (k) => { // Lộn Diều: con diều lộn vòng theo cơn gió
      const kite = k.lin('kt', [[0, '#ffe2d8'], [0.4, '#ff8a6a'], [1, '#a8241a']], 0, 0, 1, 1);
      const swirl = k.linU('sw', [[0, '#ffffff', 0], [1, '#ffffff', 0.9]], 10, 110, 70, 30);
      return [`<path d="M16 108C4 70 30 38 66 36" stroke="${swirl}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M26 112C18 84 36 58 62 54" stroke="${swirl}" stroke-width="2" fill="none" opacity="0.6"/>
        <path d="M86 12l24 30-24 44-24-44z" fill="${kite}"/><path d="M86 12l24 30H86z" fill="#fff" opacity="0.28"/>
        <path d="M86 12v74M62 42h48" stroke="#fff6e8" stroke-width="1.6" opacity="0.8"/>
        <path d="M86 86c-6 6 2 10-4 16s2 10-2 14" stroke="#ffe2d8" stroke-width="1.6" fill="none"/>${[[82, 96], [84, 108]].map(([x, y]) => `<path d="M${x} ${y}l-6-2 2 6z" fill="#ff8a6a"/>`).join('')}`,
        `<path d="M86 12l24 30-24 44-24-44z" fill="#ff8a6a" opacity="0.35" filter="url(#${k.id}B8)"/>`, [86, 48]];
    },
    s3: (k) => { // Mưa Tên: mưa tên sáng từ trời rơi xuống
      const ar = k.linU('ar', [[0, '#ffffff', 0], [0.7, '#d8f4ff', 0.9], [1, '#ffffff', 1]], 0, 0, 0, 120);
      const A = (x, y, l) => `<path d="M${x} ${y}v${l}" stroke="${ar}" stroke-width="2.6" stroke-linecap="round"/><path d="M${x - 4} ${y + l - 2}l4 9 4-9z" fill="#ffffff"/>`;
      return [`<path d="M8 22c30-12 82-12 112 0" stroke="#d8f4ff" stroke-width="2" fill="none" opacity="0.6"/>
        ${A(28, 18, 50)}${A(48, 10, 64)}${A(68, 22, 56)}${A(88, 8, 66)}${A(104, 24, 48)}${A(38, 44, 50)}${A(78, 46, 52)}
        <ellipse cx="64" cy="108" rx="48" ry="9" fill="none" stroke="#d8f4ff" stroke-width="2" opacity="0.8"/>`,
        `<ellipse cx="64" cy="106" rx="44" ry="8" fill="#d8f4ff" opacity="0.5" filter="url(#${k.id}B4)"/>${sparks(k, [[28, 104, 1.2], [48, 110, 1.2], [68, 104, 1.1], [88, 110, 1.3], [104, 102, 1]], '#ffffff')}`, [64, 60]];
    },
  },
  long_dang: {
    s1: (k) => { // Đèn Trôi: đèn lồng giấy bay, vệt lửa
      const paper = k.rad('pp', [[0, '#fff6d0'], [0.45, '#ffb84a'], [1, '#b8320e']], 0.45, 0.45, 0.6);
      const trail = k.linU('tr', [[0, '#ff7a1a', 0], [1, '#ffd27a', 0.9]], 10, 110, 60, 64);
      return [`<path d="M10 116C24 98 38 84 56 74" stroke="#ff7a1a" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.6" filter="url(#${k.id}B4)"/><path d="M14 112C26 98 40 86 56 76" stroke="${trail}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M76 18v8" stroke="#3a1a08" stroke-width="2"/><path d="M60 30h32l4 10v26l-4 10H60l-4-10V40z" fill="${paper}"/>
        <path d="M60 30h32M60 76h32" stroke="#6a2a0a" stroke-width="5"/><path d="M66 32v42M76 32v42M86 32v42" stroke="#7a3a10" stroke-width="1" opacity="0.5"/>
        <path d="M76 80v12" stroke="#c8301a" stroke-width="2.4"/><path d="M73 92h6l-3 8z" fill="#c8301a"/>`,
        `<circle cx="76" cy="52" r="26" fill="#ffbe4a" opacity="0.55" filter="url(#${k.id}B8)"/>${sparks(k, [[30, 96, 1.2], [42, 84, 1], [20, 108, 0.9]], '#ffd27a')}`, [76, 52]];
    },
    s2: (k) => { // Thắp Sáng: đôi bàn tay nâng ngọn lửa
      const flame = k.rad('fl', [[0, '#ffffff'], [0.35, '#fff0a0'], [0.7, '#ffa030'], [1, '#d83a0a']], 0.5, 0.7, 0.7);
      const skin = k.lin('sk', [[0, '#ffe2c0'], [0.5, '#d89870'], [1, '#6a3a20']], 0, 0, 1, 1);
      return [`<path d="M64 14c14 16 22 28 14 42-4 8-24 8-28 0-8-14 0-26 14-42z" fill="${flame}"/>
        <path d="M18 76c10-2 20 4 28 6h16c4 0 4 8 0 8H50c8 2 20 4 30-2l26-14c6-3 10 4 4 8L82 102c-10 6-26 8-40 6l-24-2z" fill="${skin}"/>
        <path d="M24 78c8 0 16 4 22 6M86 84l20-12" stroke="#fff2e0" stroke-width="1.4" fill="none" opacity="0.7"/>`,
        `<circle cx="64" cy="44" r="24" fill="#ffbe4a" opacity="0.6" filter="url(#${k.id}B8)"/>${sparks(k, [[42, 22, 1.1], [88, 26, 1.2], [96, 46, 0.9], [34, 42, 0.8]], '#ffe08a')}`, [64, 44]];
    },
    s3: (k) => { // Hội Đèn: đèn lồng thả trời bay lên giữa đêm
      const paper = k.rad('pp', [[0, '#fff6d0'], [0.5, '#ffb84a'], [1, '#c8420e']], 0.5, 0.45, 0.6);
      const L = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-10-14h20l3 6v18l-3 6h-20l-3-6v-18z" fill="${paper}"/><path d="M-10-14h20M-10 16h20" stroke="#6a2a0a" stroke-width="3"/></g>`;
      return [`${L(64, 66, 1.5)}${L(32, 44, 0.9)}${L(98, 40, 1)}${L(44, 92, 0.75)}${L(92, 90, 0.85)}${L(64, 24, 0.6)}${L(20, 82, 0.55)}${L(110, 70, 0.6)}`,
        `${[[64, 66, 30], [32, 44, 16], [98, 40, 18], [44, 92, 13], [92, 90, 15], [64, 24, 11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffbe4a" opacity="0.45" filter="url(#${k.id}B8)"/>`).join('')}`, [64, 60]];
    },
  },
};

/** Icon kỹ năng theo (tướng, ô chiêu). Tướng chưa có thiết kế riêng → icon chung theo cơ chế. */
export function heroSkillArt(heroId, slot, skill, theme) {
  const t = TH[heroId], f = ICONS[heroId]?.[slot];
  if (!t || !f) return skillArt(skill, theme);
  const k = kit(), [body, fx, glowAt] = f(k);
  return frame(k, { ...t, glowAt }, body, fx);
}

/** Nút đánh thường (mọi tướng): nắm đấm bọc giáp tung cú đấm, vụ nổ lực phía trước. */
export function fistArt() {
  const k = kit();
  const steel = k.lin('st', [[0, '#f0ece8'], [0.3, '#b8b0a8'], [0.7, '#5a524c'], [1, '#221c18']], 0, 0, 1, 1);
  const leather = k.lin('lt', [[0, '#a8643a'], [0.6, '#5a2e16'], [1, '#2a120a']], 0, 0, 1, 1);
  const fing = k.lin('fg', [[0, '#f4f0ec'], [0.45, '#a8a098'], [1, '#3a3430']], 0, 0, 0.2, 1);
  const burst = k.rad('bu', [[0, '#ffffff', 1], [0.25, '#ffd27a', 0.95], [0.6, '#ff5a1a', 0.6], [1, '#ff2a00', 0]]);
  const body = `<circle cx="88" cy="44" r="34" fill="${burst}"/>
    ${[[-20, 34], [10, 30], [40, 34], [70, 30], [100, 34], [130, 32], [160, 34], [190, 30]].map(([a, l]) => { const r = a * Math.PI / 180; return `<path d="M${88 + Math.cos(r) * 22} ${44 + Math.sin(r) * 22}L${88 + Math.cos(r) * (22 + l)} ${44 + Math.sin(r) * (22 + l)}" stroke="#ffe2a0" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`; }).join('')}
    <path d="M6 122L42 88" stroke="${leather}" stroke-width="28" stroke-linecap="round"/><path d="M10 112L36 86" stroke="#c88050" stroke-width="2" opacity="0.5"/>
    <path d="M30 96c-4-10-2-26 6-36 6-8 14-12 22-12h8l2 52-18 10z" fill="${steel}"/><path d="M36 60c4-6 12-11 22-12" stroke="#fff" stroke-width="2" fill="none" opacity="0.6"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${58 + i * 1.5}" y="${42 + i * 12.5}" width="${34 - i * 2}" height="12.5" rx="6.2" fill="${fing}"/><path d="M${62 + i * 1.5} ${44.5 + i * 12.5}h${24 - i * 2}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/><ellipse cx="${88 - i * 0.5}" cy="${48 + i * 12.5}" rx="3.2" ry="4" fill="#fff" opacity="0.35"/>`).join('')}
    <path d="M40 92c8-6 20-10 34-12 4 0 6 4 4 7l-30 12z" fill="${steel}"/><path d="M44 90c8-5 18-8 28-9" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.7"/>
    <path d="M26 100l12-12 14 14-12 10z" fill="${leather}"/>`;
  return frame(k, { bg: ['#6a1a14', '#2a0a08', '#0a0404'], glow: '#ff6a2a', glowAt: [88, 44], rim: ['#fff0d0', '#c89048', '#4a2a0a'] }, body,
    `<circle cx="88" cy="44" r="22" fill="#ffb040" opacity="0.6" filter="url(#${k.id}B8)"/>${sparks(k, [[112, 26, 1.4], [116, 52, 1.2], [100, 14, 1]], '#ffd27a')}`);
}
