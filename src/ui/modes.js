// Các chế độ chơi + bảng "Chọn chế độ" (từ sảnh). Ba nhóm:
//  • Trực tuyến (mặc định): Đấu thường 5v5, Đấu hạng, Đấu Đỉnh Cao — Bắt đầu ở phòng chờ là vào hàng chờ máy chủ, ưu tiên ghép người thật;
//    sau 60 giây chưa đủ người thì máy điền chỗ trống (server/rooms.mjs). Không nối được máy chủ thì ghép với máy như cũ.
//  • Phòng tuỳ chỉnh (ui/online.js): tạo phòng có mã, mời bạn vào bằng mã, chọn đội, bật / tắt máy điền chỗ trống.
//  • Đấu máy: Đấu máy 5v5, Đấu đơn 1v1, Luyện tập — chơi một mình với máy, không cần mạng; độ khó tự chọn (lưu trong hồ sơ).
import { DIFFICULTY } from '../data/ai.js';
import { panel, rankBadge, toast } from './kit.js';
import { profile, saveProfile, rankDifficulty, rankNow, peakNow } from './profile.js';
import { PEAK } from '../data/haoQuang.js';

const VALLEY = 'Thung Lũng Đèn Lồng', DUEL_MAP = 'Đường Đơn Suối Đèn';
export const MODES = {
  normal: { name: 'Đấu thường 5v5', short: 'Đấu thường', size: 5, map: '5v5', mapName: VALLEY, room: true, online: true },
  ranked: { name: 'Đấu hạng 5v5', short: 'Đấu hạng', size: 5, map: '5v5', mapName: VALLEY, room: true, ranked: true, online: true },
  // GĐ4c (08 §4): 19:00–24:00, từ Nguyệt Quang; tính sao như đấu hạng, máy Ác mộng, cấm/chọn đầy đủ, thắng ×1,5 Hào Quang
  peak: { name: 'Đấu Đỉnh Cao 5v5', short: 'Đấu Đỉnh Cao', size: 5, map: '5v5', mapName: VALLEY, room: true, ranked: true, peak: true, online: true },
  custom: { name: 'Phòng tuỳ chỉnh', short: 'Tuỳ chỉnh', size: 5, map: '5v5', mapName: VALLEY, room: false, online: true, custom: true },
  ai: { name: 'Đấu máy 5v5', short: 'Đấu máy 5v5', size: 5, map: '5v5', mapName: VALLEY, room: true, ai: true },
  solo: { name: 'Đấu đơn 1v1', short: 'Đấu đơn', size: 1, map: '1v1', mapName: DUEL_MAP, room: true, ai: true },
  training: { name: 'Luyện tập', short: 'Luyện tập', size: 1, map: '1v1', mapName: DUEL_MAP, room: false, ai: true },
};
/** Trận đang chuẩn bị: mode; party (bạn bè đã vào phòng); match (người chơi hai đội sau khi ghép: { allies, foes, seed });
 *  pick (sau chọn tướng: { heroId, spellId, charmId, charm (trang bùa đã làm sạch), emblem (phù hiệu), allyHeroes, foeHeroes, dummies }). */
export const S = { mode: 'normal', party: [], match: null, pick: null };
/** Độ khó máy của chế độ (theo hồ sơ hiện tại). */
export function modeDiff(mode) {
  const p = profile();
  if (mode === 'ranked') return rankDifficulty(p.stars);
  if (mode === 'peak') return PEAK.diff;
  if (mode === 'ai' || mode === 'solo' || mode === 'training') return DIFFICULTY[p.diff] ? p.diff : 'normal';
  return 'normal';
}

const CARDS = [
  { mode: 'normal', tag: 'TRỰC TUYẾN', pos: '48%', desc: () => 'Ghép người thật · thiếu người thì máy vào sau 1 phút' },
  { mode: 'ranked', tag: 'XẾP HẠNG', pos: '22%', hot: true, badge: true, desc: () => 'Thắng +1 sao, thua −1 sao' },
  { mode: 'peak', tag: 'ĐỈNH CAO', pos: '62%', badge: true, peak: true, desc: () => { const s = peakNow(); return s.open ? 'Thắng ×1,5 Hào Quang · mở tới 24:00' : s.tierOk ? s.reason : `Từ Nguyệt Quang · ${PEAK.from}:00–24:00`; } },
  { mode: 'custom', tag: 'MÃ PHÒNG', pos: '50%', img: 'room.jpg', go: 'custom', desc: () => 'Tạo phòng, gửi link mời bạn bè' },
  { mode: 'ai', title: 'Đấu máy', tag: 'NGOẠI TUYẾN', pos: '78%', blue: true, sub: true, desc: () => 'Một mình với máy · không cần mạng' },
];
const AI_CARDS = [
  { mode: 'ai', tag: '5V5', pos: '48%', diff: true, desc: () => 'Ba đường · 10 tướng' },
  { mode: 'solo', tag: '1V1', pos: '78%', diff: true, desc: () => 'Một đường · tay đôi với máy' },
  { mode: 'training', tag: 'TẬP', pos: '50%', img: 'room.jpg', blue: true, diff: true, desc: () => 'Hình nộm hoặc đối thủ tự chọn' },
];

function cardsPanel(nav, { title, cards, onSub }) {
  const p = profile();
  const pn = panel({ title });
  const render = () => {
    pn.body.innerHTML = `<div class="md-list">${cards.map((c) => {
      const r = rankNow(), lock = c.peak && !peakNow().open;
      return `<button type="button" class="md-card fr ${c.hot ? 'hot' : ''} ${lock ? 'lock' : ''}" data-m="${c.mode}" ${c.sub ? 'data-sub="1"' : ''} ${lock ? 'aria-disabled="true"' : ''}><i class="pic" style="background-image:url(./assets/ui/${c.img || 'keyart.jpg'});background-size:${c.img ? 'auto 100%' : 'auto 135%'};background-position:${c.pos} ${c.img ? '30%' : '78%'}"></i>
      <em class="tagr ${c.hot ? 'gold' : c.blue ? 'blue' : ''}">${c.tag}</em><div class="in">${c.badge ? `<span class="md-rank">${rankBadge(r, 50)}${r.name}</span>` : ''}<h3 class="gt">${c.title || MODES[c.mode].short}</h3><p>${c.desc()}</p>
      ${c.diff ? `<div class="md-diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<span role="button" data-d="${k}" class="${k === (p.diff || 'normal') ? 'on' : ''}">${d.name}</span>`).join('')}</div>` : ''}</div></button>`;
    }).join('')}</div>`;
  };
  render();
  pn.body.onclick = (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { e.stopPropagation(); p.diff = d.dataset.d; saveProfile(); render(); return; }
    const c = e.target.closest('[data-m]'); if (!c) return;
    if (c.dataset.sub) { onSub?.(); return; }
    const m = c.dataset.m, card = cards.find((x) => x.mode === m);
    if (m === 'peak') { const s = peakNow(); if (!s.open) { toast(s.reason); return; } }
    pn.close(); nav.go(card.go || (MODES[m].room ? 'room' : 'pick'), { mode: m });
  };
  return pn;
}
/** Bảng chọn chế độ; chạm thẻ → phòng chờ (Đấu thường / Đấu hạng / Đỉnh cao: trực tuyến) · Phòng tuỳ chỉnh · Đấu máy (bảng con). */
export function openModes(nav) {
  cardsPanel(nav, { title: 'Chọn chế độ', cards: CARDS, onSub: () => openAiModes(nav) });
}
/** Bảng con "Đấu máy": Đấu máy 5v5 / Đấu đơn 1v1 / Luyện tập (chọn độ khó trên thẻ). */
export function openAiModes(nav) { cardsPanel(nav, { title: 'Đấu máy', cards: AI_CARDS }); } // chọn thẻ → nav.go đóng luôn bảng cha
