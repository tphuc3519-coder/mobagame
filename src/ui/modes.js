// Các chế độ chơi + bảng "Chọn chế độ" (từ sảnh): Đấu thường 5v5, Đấu hạng, Đấu đơn 1v1, Luyện tập. Đối thủ và đồng đội đều là máy;
// độ khó máy: đấu thường = Thường, đấu hạng theo bậc hạng, đấu đơn / luyện tập tự chọn (lưu trong hồ sơ).
import { DIFFICULTY } from '../data/ai.js';
import { panel } from './kit.js';
import { profile, saveProfile, rankOf, rankDifficulty } from './profile.js';

export const MODES = {
  normal: { name: 'Đấu thường 5v5', short: 'Đấu thường', size: 5, map: '5v5', mapName: 'Thung Lũng Đèn Lồng', room: true },
  ranked: { name: 'Đấu hạng 5v5', short: 'Đấu hạng', size: 5, map: '5v5', mapName: 'Thung Lũng Đèn Lồng', room: true, ranked: true },
  solo: { name: 'Đấu đơn 1v1', short: 'Đấu đơn', size: 1, map: '1v1', mapName: 'Đường Đơn Suối Đèn', room: true },
  training: { name: 'Luyện tập', short: 'Luyện tập', size: 1, map: '1v1', mapName: 'Đường Đơn Suối Đèn', room: false },
};
/** Trận đang chuẩn bị: mode; party (bạn bè đã vào phòng); match (người chơi hai đội sau khi ghép: { allies, foes, seed });
 *  pick (sau chọn tướng: { heroId, spellId, charmId, allyHeroes, foeHeroes, dummies }). */
export const S = { mode: 'normal', party: [], match: null, pick: null };
/** Độ khó máy của chế độ (theo hồ sơ hiện tại). */
export function modeDiff(mode) {
  const p = profile();
  if (mode === 'ranked') return rankDifficulty(p.stars);
  if (mode === 'solo' || mode === 'training') return DIFFICULTY[p.diff] ? p.diff : 'normal';
  return 'normal';
}

const CARDS = [
  { mode: 'normal', tag: '5V5', pos: '48%', desc: () => 'Bản đồ ba đường, 10 tướng. Đồng đội và đối thủ là máy (Thường).' },
  { mode: 'ranked', tag: 'XẾP HẠNG', pos: '20%', hot: true, desc: () => `Leo hạng: thắng +1 sao, thua −1 sao. Hạng hiện tại: ${rankOf(profile().stars).name} · máy ${DIFFICULTY[modeDiff('ranked')].name}.` },
  { mode: 'solo', tag: '1V1', pos: '84%', diff: true, desc: () => 'Một đường, đối đầu tay đôi với máy. Nhận 70% vàng.' },
  { mode: 'training', tag: 'TẬP', pos: '50%', img: 'room.jpg', diff: true, desc: () => 'Tự chọn đối thủ hoặc hình nộm, không tính thưởng.' },
];

/** Bảng chọn chế độ; chạm thẻ → phòng chờ (hoặc thẳng màn chọn tướng với Luyện tập). */
export function openModes(nav) {
  const p = profile();
  const pn = panel({ title: 'Chọn chế độ' });
  const render = () => {
    pn.body.innerHTML = `<div class="md-list">${CARDS.map((c) => `<button type="button" class="md-card ${c.hot ? 'hot' : ''}" data-m="${c.mode}" style="background-image:url(./assets/ui/${c.img || 'keyart.jpg'});background-size:auto 100%;background-position:${c.pos} 30%">
      <span class="tag">${c.tag}</span><div class="in"><h3>${MODES[c.mode].short}</h3><p>${c.desc()}</p>
      ${c.diff ? `<div class="md-diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<span role="button" data-d="${k}" class="${k === (p.diff || 'normal') ? 'on' : ''}">${d.name}</span>`).join('')}</div>` : ''}</div></button>`).join('')}</div>`;
  };
  render();
  pn.body.onclick = (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { e.stopPropagation(); p.diff = d.dataset.d; saveProfile(); render(); return; }
    const c = e.target.closest('[data-m]'); if (!c) return;
    pn.close(); nav.go(MODES[c.dataset.m].room ? 'room' : 'pick', { mode: c.dataset.m });
  };
}
