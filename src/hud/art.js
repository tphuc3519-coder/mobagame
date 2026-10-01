import { paintedSpell } from './paint.js';
// Icon "huy hiệu" vẽ bằng SVG có chiều sâu (nền chuyển sắc toả tâm, viền kim loại, hình chính có đổ bóng + quầng sáng, vệt bóng kính)
// cho phép bổ trợ, Biến về và kỹ năng tướng. Tự vẽ, không dùng hình của game khác (docs/01 §5).
let uid = 0;

/** Khung chung: nền tròn (round) hoặc bo góc. c0 sáng, c1 tối; glyph là chuỗi SVG trong toạ độ 0..64. */
export function badge(glyph, { c0, c1, rim = '#e9d9a8', glow = '#fff', round = true } = {}) {
  const id = 'b' + uid++, R = round ? 32 : 12;
  return `<svg class="art" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <radialGradient id="${id}g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${c0}"/><stop offset="0.7" stop-color="${c1}"/><stop offset="1" stop-color="#0a0b18"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8e0"/><stop offset="0.45" stop-color="${rim}"/><stop offset="1" stop-color="#5a4a2a"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/><feOffset dy="1.6"/><feComponentTransfer><feFuncA type="linear" slope="0.8"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}h" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="${id}c"><rect x="3" y="3" width="58" height="58" rx="${R - 3}"/></clipPath>
  </defs>
  <rect x="1" y="1" width="62" height="62" rx="${R}" fill="url(#${id}r)"/>
  <rect x="3.5" y="3.5" width="57" height="57" rx="${R - 3}" fill="url(#${id}g)"/>
  <g clip-path="url(#${id}c)">
    <g opacity="0.55" filter="url(#${id}h)" fill="${glow}" stroke="${glow}">${glyph}</g>
    <g filter="url(#${id}f)">${glyph}</g>
    <ellipse cx="32" cy="10" rx="${round ? 22 : 26}" ry="11" fill="url(#${id}s)"/>
  </g>
</svg>`;
}

// —— Hình chính (toạ độ 0..64), tô bằng chuyển sắc trắng → màu chủ đề để có khối ——
const L = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const withGrad = (a, b, body) => { const id = 'q' + uid++; return `<defs>${L(id, a, b)}</defs>` + body.replaceAll('FILL', `url(#${id})`); };

export const GLYPHS = {
  // Chớp Bước: tia chớp + vệt dịch chuyển
  blink: (a, b) => withGrad(a, b, `<path d="M14 40h10M10 46h14M16 34h8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/><path d="M38 8L24 34h10l-6 22 20-30H37l7-18z" fill="FILL" stroke="#fffbe8" stroke-width="1.5" stroke-linejoin="round"/>`),
  // Hồi Phục: chữ thập + lá non + giọt sáng
  heal: (a, b) => withGrad(a, b, `<path d="M26 12h12v14h14v12H38v14H26V38H12V26h14z" fill="FILL" stroke="#f4fff0" stroke-width="2" stroke-linejoin="round"/><circle cx="46" cy="48" r="4" fill="#fff" opacity="0.85"/><circle cx="17" cy="17" r="2.5" fill="#fff" opacity="0.8"/>`),
  // Trảm Hồn: lưỡi rìu + vết chém
  execute: (a, b) => withGrad(a, b, `<path d="M18 50L46 14" stroke="#5a3a22" stroke-width="5" stroke-linecap="round"/><path d="M36 10c10 0 18 8 18 18-6-2-10-6-12-10l-8 4z" fill="FILL" stroke="#fff4f0" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 30c8 4 14 10 16 22" stroke="#ffd0c8" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/>`),
  // Thu Hoạch: lưỡi liềm + bông lúa
  smite: (a, b) => withGrad(a, b, `<path d="M20 52c-6-14 0-32 18-40-10 10-12 22-8 34z" fill="FILL" stroke="#fffbe0" stroke-width="1.6"/><path d="M40 52V24" stroke="#fff3c0" stroke-width="2.5"/><g fill="#ffe8a0">${[0, 1, 2, 3].map((i) => `<ellipse cx="${i % 2 ? 44 : 36}" cy="${30 + i * 5}" rx="3.2" ry="5" transform="rotate(${i % 2 ? 30 : -30} ${i % 2 ? 44 : 36} ${30 + i * 5})"/>`).join('')}</g>`),
  // Gió Lướt: ba dải gió cuộn + chiếc lông
  haste: (a, b) => withGrad(a, b, `<path d="M8 22h30a7 7 0 10-7-7M8 34h40a8 8 0 11-8 8M8 46h22" fill="none" stroke="FILL" stroke-width="5" stroke-linecap="round"/>`),
  // Giải Trói: xích đứt
  cleanse: (a, b) => withGrad(a, b, `<rect x="8" y="24" width="20" height="12" rx="6" fill="none" stroke="FILL" stroke-width="5" transform="rotate(-25 18 30)"/><rect x="36" y="28" width="20" height="12" rx="6" fill="none" stroke="FILL" stroke-width="5" transform="rotate(-25 46 34)"/><path d="M30 18l2 8M36 16l-2 9M33 40l-1 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`),
  // Hồi Máu: bình thuốc tròn, chất lỏng đỏ có trái tim sáng
  flask: (a, b) => withGrad(a, b, `<path d="M27 8h10v4h-2v8c8 3 13 9 13 17 0 10-7 17-16 17s-16-7-16-17c0-8 5-14 13-17v-8h-2z" fill="#eaf6ff" fill-opacity="0.25" stroke="#f4fbff" stroke-width="2" stroke-linejoin="round"/><path d="M19 37c4-2 8 1 13 0s9-3 13 0c0 8-6 14-13 14s-13-6-13-14z" fill="FILL"/><path d="M32 47s-7-4-7-9a3.6 3.6 0 017-1.4 3.6 3.6 0 017 1.4c0 5-7 9-7 9z" fill="#fff" opacity="0.9"/><path d="M23 30c1-3 3-5 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7" fill="none"/>`),
  // Biến về: cổng xoáy + mái nhà
  recall: (a, b) => withGrad(a, b, `<circle cx="32" cy="34" r="20" fill="none" stroke="FILL" stroke-width="3" stroke-dasharray="20 6"/><path d="M32 16L14 32h5v16h10V38h6v10h10V32h5z" fill="FILL" stroke="#f0f8ff" stroke-width="1.5" stroke-linejoin="round"/>`),
  // —— kỹ năng theo kiểu ——
  shot: (a, b) => withGrad(a, b, `<path d="M8 50L40 18" stroke="#fff" stroke-width="2" opacity="0.6"/><circle cx="44" cy="20" r="10" fill="FILL" stroke="#fff" stroke-width="1.5"/><path d="M14 52l8-16 8 8z" fill="FILL" opacity="0.7"/>`),
  arrow: (a, b) => withGrad(a, b, `<path d="M10 54L48 16" stroke="FILL" stroke-width="4" stroke-linecap="round"/><path d="M52 12l-4 16-12-12z" fill="FILL" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 54l2-10M10 54l10-2" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
  dash: (a, b) => withGrad(a, b, `<path d="M12 44h14M8 36h16M12 28h12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.75"/><path d="M28 18l24 14-24 14 6-14z" fill="FILL" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`),
  wave: (a, b) => withGrad(a, b, `<circle cx="32" cy="34" r="8" fill="FILL"/><circle cx="32" cy="34" r="15" fill="none" stroke="FILL" stroke-width="3.5"/><circle cx="32" cy="34" r="23" fill="none" stroke="FILL" stroke-width="2.5" opacity="0.7"/>`),
  meteor: (a, b) => withGrad(a, b, `<ellipse cx="34" cy="48" rx="20" ry="6" fill="none" stroke="FILL" stroke-width="3"/><path d="M14 8l16 30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.6"/><circle cx="32" cy="40" r="9" fill="FILL" stroke="#fff" stroke-width="1.5"/>`),
  fan: (a, b) => withGrad(a, b, `<path d="M32 54L10 18a40 40 0 0144 0z" fill="FILL" opacity="0.9" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M32 54L22 22M32 54V16M32 54l10-32" stroke="#fff" stroke-width="1.5" opacity="0.6"/>`),
  vortex: (a, b) => withGrad(a, b, `<path d="M32 32m-4 0a4 4 0 118 0 10 10 0 11-18 2 16 16 0 1130-6 22 22 0 11-34 20" fill="none" stroke="FILL" stroke-width="4" stroke-linecap="round"/>`),
  shield: (a, b) => withGrad(a, b, `<path d="M32 8l20 7v14c0 13-9 23-20 27-11-4-20-14-20-27V15z" fill="FILL" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M32 16v32M22 28h20" stroke="#fff" stroke-width="2" opacity="0.5"/>`),
  heart: (a, b) => withGrad(a, b, `<path d="M32 54S10 40 10 24a11 11 0 0122-5 11 11 0 0122 5c0 16-22 30-22 30z" fill="FILL" stroke="#fff" stroke-width="2"/>`),
  anchor: (a, b) => withGrad(a, b, `<circle cx="32" cy="12" r="5" fill="none" stroke="FILL" stroke-width="3.5"/><path d="M32 17v34M22 26h20M12 38c2 10 10 14 20 14s18-4 20-14" fill="none" stroke="FILL" stroke-width="4.5" stroke-linecap="round"/><path d="M12 38l-2 7 8-2M52 38l2 7-8-2" fill="FILL"/>`),
  stomp: (a, b) => withGrad(a, b, `<path d="M28 6h8v30h-8z" fill="FILL" stroke="#fff" stroke-width="1.4"/><path d="M14 44c6-4 12-6 18-6s12 2 18 6M8 52c8-5 16-8 24-8s16 3 24 8" fill="none" stroke="FILL" stroke-width="3.5" stroke-linecap="round"/>`),
  hammer: (a, b) => withGrad(a, b, `<path d="M20 54l18-26" stroke="#7a4a2a" stroke-width="5" stroke-linecap="round"/><path d="M28 10l20 10-8 14-20-10z" fill="FILL" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`),
  sword: (a, b) => withGrad(a, b, `<path d="M48 8l8 0 0 8-26 26-8-8z" fill="FILL" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M18 36l10 10M14 50l8-8" stroke="#e8d0a0" stroke-width="5" stroke-linecap="round"/>`),
  stealth: (a, b) => withGrad(a, b, `<path d="M8 32c8-12 16-16 24-16s16 4 24 16c-8 12-16 16-24 16S16 44 8 32z" fill="none" stroke="FILL" stroke-width="3.5"/><circle cx="32" cy="32" r="7" fill="FILL"/><path d="M12 52L52 12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`),
  lantern: (a, b) => withGrad(a, b, `<path d="M26 10h12M32 10v6" stroke="#fff" stroke-width="2.5"/><path d="M20 22c0-4 5-6 12-6s12 2 12 6v18c0 4-5 8-12 8s-12-4-12-8z" fill="FILL" stroke="#fff" stroke-width="1.6"/><path d="M24 50h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
};

const SPELL_ART = {
  chop_buoc: ['blink', '#5fd0ff', '#0d3a6a', '#fff8c0', '#e8f8ff'], hoi_phuc: ['heal', '#7af0a0', '#0e4a2c', '#ffffff', '#3fcf6a'],
  tram_hon: ['execute', '#ff7a5a', '#4a0e10', '#fff0e8', '#ff5a3a'], thu_hoach: ['smite', '#ffd25a', '#4a320a', '#fff6d0', '#e8a82a'],
  gio_luot: ['haste', '#b8a8ff', '#2a1a5a', '#ffffff', '#d8d0ff'], giai_troi: ['cleanse', '#ffc87a', '#4a2a0a', '#ffffff', '#ffd89a'],
};
export function spellArt(id) {
  const pt = typeof document !== 'undefined' && paintedSpell(id); if (pt) return pt;
  const [g, c0, c1, a, b] = SPELL_ART[id] || ['blink', '#888', '#222', '#fff', '#ccc'];
  return badge(GLYPHS[g](a, b), { c0, c1, glow: b });
}
export const restoreArt = () => paintedSpell('restore') || badge(GLYPHS.flask('#ffd0d8', '#e8243c'), { c0: '#e0506a', c1: '#3a0a18', glow: '#ff6a80' });
export const recallArt = () => paintedSpell('recall') || badge(GLYPHS.recall('#ffffff', '#8fd8ff'), { c0: '#5f8fe0', c1: '#10204a', glow: '#8fd8ff' });

/** Hình kỹ năng: chọn theo cơ chế (móc, xoáy, khiên…) rồi theo kiểu; màu theo chủ đề tướng. */
export function skillArt(skill, theme = '#ffb84d') {
  const t = skill.type, g = skill.hook ? 'anchor' : skill.pullIn != null ? 'vortex' : skill.ambush ? 'stealth'
    : t === 'skillshot' ? (skill.pierce ? 'arrow' : 'shot') : t === 'dash' || t === 'targetedDash' ? 'dash' : t === 'aoeSelf' ? (skill.windup ? 'stomp' : 'wave')
      : t === 'aoeCircle' ? 'meteor' : t === 'cone' ? 'fan' : t === 'zone' ? 'vortex' : t === 'selfBuff' ? 'shield' : t === 'allyTarget' ? 'heart' : t === 'tether' ? 'anchor' : 'sword';
  return badge(GLYPHS[g]('#ffffff', theme), { c0: theme, c1: '#141428', glow: theme });
}
