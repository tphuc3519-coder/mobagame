import { HEROES } from './heroes/index.js';
import { DEFAULT_SPELL } from './spells.js';
import { ROLE_SPELL } from './roles.js';

// Độ khó bot (06 §4.8). react: giây giữa hai lần suy nghĩ; aimErr: độ lệch ngắm; lastHit: tỉ lệ chọn đúng lính kết liễu;
// spell: tỉ lệ dùng 4 phép chiến thuật (Tắt Đèn / Loá Mắt / Trống Trận / Bùa Mỏi) mỗi khi gặp thời cơ (ai/botSpells.js).
export const DIFFICULTY = {
  easy:      { name: 'Dễ', react: 0.6, aimErr: 20, dodge: 0.1, lastHit: 0.45, trade: 0.25, goldMult: 0.9, spell: 0.5 },
  normal:    { name: 'Thường', react: 0.35, aimErr: 10, dodge: 0.35, lastHit: 0.7, trade: 0.5, goldMult: 1, spell: 0.8 },
  hard:      { name: 'Khó', react: 0.2, aimErr: 4, dodge: 0.6, lastHit: 0.88, trade: 0.75, goldMult: 1, spell: 0.95 },
  nightmare: { name: 'Ác mộng', react: 0.12, aimErr: 2, dodge: 0.8, lastHit: 0.95, trade: 0.9, goldMult: 1.1, spell: 1 },
};
export const BOT = {
  retreatHp: 0.3, recallHp: 0.45, recallMana: 0.2, safeRange: 1400, fightRange: 900,
  escapeHp: 0.15, itemHp: 0.25, kiteDist: 320, towerMargin: 60, holdBack: 0.55,
};
/** Não đội 5v5 (ai/teamBrain.js). push: giây sau khi hạ mục tiêu lớn vẫn dồn đường, phút bắt đầu dồn khi hơn 2 người,
 *  phút cuối trận dồn khi hơn 1 người, giây giữ một đường đã chọn. */
export const BRAIN = {
  push: { afterBoss: 25, advFrom: 6, lateFrom: 14, hold: 20 },
};
/** Phép bổ trợ của bot 5v5 theo vị trí → vai (lớp tướng); không khớp thì phép mặc định của tướng. */
export const BOT_SPELL = {
  temple: { tank: 'loa_mat', fighter: 'tat_den' },
  mid: { assassin: 'bua_moi' },
  river: { marksman: 'trong_tran' },
  support: { tank: 'loa_mat', support: 'bua_moi' },
};
/** Phép bot mang vào trận 5v5 (thuần, tất định): đi rừng → Trừng Trị; tướng có phép riêng khác Chớp Bước thì giữ (vd Long Đăng: Hồi
 *  Phục); còn lại theo BOT_SPELL[vị trí][vai] (vai đầu tiên khớp trong HEROES[id].roles); không có thì phép mặc định của tướng. */
export function botSpellOf(heroId, lane) {
  if (ROLE_SPELL[lane]) return ROLE_SPELL[lane];
  const h = HEROES[heroId], def = h?.defaultSpell;
  if (def && def !== DEFAULT_SPELL) return def;
  const tbl = BOT_SPELL[lane];
  const r = tbl && (h?.roles || []).find((x) => tbl[x]);
  return r ? tbl[r] : def || DEFAULT_SPELL;
}
