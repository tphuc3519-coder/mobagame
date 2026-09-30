// Điểm vào: màn chọn tướng luyện tập (07 §7.1) → trận 1v1 với bot. ?hero=<id> vào thẳng trận (kiểm thử).
import { ALPHA } from './data/heroes/index.js';
import { startMatch } from './game.js';
import { openSelect } from './ui/select.js';

const q = new URLSearchParams(location.search);
document.getElementById('fs').onclick = async () => {
  try { await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch (_) { /* tuỳ thiết bị */ }
};
const bot = !q.has('nobot') && !q.has('dummies');
if (q.has('hero')) {
  const heroId = ALPHA.includes(q.get('hero')) ? q.get('hero') : 'hoa_ren';
  const enemyId = ALPHA.includes(q.get('enemy')) ? q.get('enemy') : ALPHA[(ALPHA.indexOf(heroId) + 3) % ALPHA.length];
  startMatch({ heroId, enemyId, bot, difficulty: q.get('diff') || 'normal' });
} else {
  openSelect({ onStart: (cfg) => startMatch({ ...cfg, onExit: () => location.reload() }) });
}
