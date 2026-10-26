// Các chế độ chơi + bảng "Chọn chế độ" (từ sảnh): Đấu thường 5v5, Đấu hạng, Đấu đơn 1v1, Luyện tập. Đối thủ và đồng đội đều là máy;
// độ khó máy: đấu thường = Thường, đấu hạng theo bậc hạng, đấu đơn / luyện tập tự chọn (lưu trong hồ sơ).
import { DIFFICULTY } from '../data/ai.js';
import { panel, rankBadge, toast } from './kit.js';
import { profile, saveProfile, rankDifficulty, rankNow, peakNow } from './profile.js';
import { PEAK } from '../data/haoQuang.js';

export const MODES = {
  normal: { name: 'Đấu thường 5v5', short: 'Đấu thường', size: 5, map: '5v5', mapName: 'Thung Lũng Đèn Lồng', room: true },
  ranked: { name: 'Đấu hạng 5v5', short: 'Đấu hạng', size: 5, map: '5v5', mapName: 'Thung Lũng Đèn Lồng', room: true, ranked: true },
  // GĐ4c (08 §4): 19:00–24:00, từ Nguyệt Quang; tính sao như đấu hạng, máy Ác mộng, cấm/chọn đầy đủ, thắng ×1,5 Hào Quang
  peak: { name: 'Đấu Đỉnh Cao 5v5', short: 'Đấu Đỉnh Cao', size: 5, map: '5v5', mapName: 'Thung Lũng Đèn Lồng', room: true, ranked: true, peak: true },
  solo: { name: 'Đấu đơn 1v1', short: 'Đấu đơn', size: 1, map: '1v1', mapName: 'Đường Đơn Suối Đèn', room: true },
  training: { name: 'Luyện tập', short: 'Luyện tập', size: 1, map: '1v1', mapName: 'Đường Đơn Suối Đèn', room: false },
};
/** Trận đang chuẩn bị: mode; party (bạn bè đã vào phòng); match (người chơi hai đội sau khi ghép: { allies, foes, seed });
 *  pick (sau chọn tướng: { heroId, spellId, charmId, charm (trang bùa đã làm sạch), emblem (phù hiệu), allyHeroes, foeHeroes, dummies }). */
export const S = { mode: 'normal', party: [], match: null, pick: null };
/** Độ khó máy của chế độ (theo hồ sơ hiện tại). */
export function modeDiff(mode) {
  const p = profile();
  if (mode === 'ranked') return rankDifficulty(p.stars);
  if (mode === 'peak') return PEAK.diff;
  if (mode === 'solo' || mode === 'training') return DIFFICULTY[p.diff] ? p.diff : 'normal';
  return 'normal';
}

const CARDS = [
  { mode: 'normal', tag: '5V5', pos: '48%', desc: () => 'Bản đồ ba đường, 10 tướng. Đồng đội và đối thủ là máy (Thường).' },
  { mode: 'ranked', tag: 'XẾP HẠNG', pos: '22%', hot: true, badge: true, desc: () => `Leo hạng: thắng +1 sao, thua −1 sao. Hạng hiện tại: ${rankNow().name} · máy ${DIFFICULTY[modeDiff('ranked')].name}.` },
  { mode: 'peak', tag: 'ĐỈNH CAO', pos: '62%', badge: true, peak: true, desc: () => { const s = peakNow(); return s.open ? `Máy ${DIFFICULTY.nightmare.name}, cấm/chọn đầy đủ, thắng ×1,5 Hào Quang. Mở tới 24:00.` : s.tierOk ? `${s.reason}. Máy ${DIFFICULTY.nightmare.name}, thắng ×1,5 Hào Quang.` : `Từ Nguyệt Quang, mở ${PEAK.from}:00–24:00. Máy ${DIFFICULTY.nightmare.name}.`; } },
  { mode: 'solo', tag: '1V1', pos: '78%', diff: true, desc: () => 'Một đường, đối đầu tay đôi với máy. Nhận 70% vàng.' },
  { mode: 'training', tag: 'TẬP', pos: '50%', img: 'room.jpg', diff: true, desc: () => 'Tự chọn đối thủ hoặc hình nộm, không tính thưởng.' },
];

/** Bảng chọn chế độ; chạm thẻ → phòng chờ (hoặc thẳng màn chọn tướng với Luyện tập). */
export function openModes(nav) {
  const p = profile();
  const pn = panel({ title: 'Chọn chế độ' });
  const render = () => {
    pn.body.innerHTML = `<div class="md-list">${CARDS.map((c) => {
      const r = rankNow(), lock = c.peak && !peakNow().open;
      return `<button type="button" class="md-card fr ${c.hot ? 'hot' : ''} ${lock ? 'lock' : ''}" data-m="${c.mode}" ${lock ? 'aria-disabled="true"' : ''}><i class="pic" style="background-image:url(./assets/ui/${c.img || 'keyart.jpg'});background-size:${c.img ? 'auto 100%' : 'auto 135%'};background-position:${c.pos} ${c.img ? '30%' : '78%'}"></i>
      <em class="tagr ${c.hot ? 'gold' : c.mode === 'training' ? 'blue' : ''}">${c.tag}</em><div class="in">${c.badge ? `<span class="md-rank">${rankBadge(r, 50)}${r.name}</span>` : ''}<h3 class="gt">${MODES[c.mode].short}</h3><p>${c.desc()}</p>
      ${c.diff ? `<div class="md-diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<span role="button" data-d="${k}" class="${k === (p.diff || 'normal') ? 'on' : ''}">${d.name}</span>`).join('')}</div>` : ''}</div></button>`;
    }).join('')}</div>`;
  };
  render();
  pn.body.onclick = (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { e.stopPropagation(); p.diff = d.dataset.d; saveProfile(); render(); return; }
    const c = e.target.closest('[data-m]'); if (!c) return;
    if (c.dataset.m === 'peak') { const s = peakNow(); if (!s.open) { toast(s.reason); return; } }
    pn.close(); nav.go(MODES[c.dataset.m].room ? 'room' : 'pick', { mode: c.dataset.m });
  };
}
