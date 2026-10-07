// Màn đội hình (ảnh 4) — ngay sau khi cả đội khoá tướng: tướng của mình đứng lớn trên sân khấu (động tác chiến thắng), tên tướng bên
// trái, hàng chân dung cả đội phía dưới (tên tướng + tên người chơi). Đấu đơn: mình VS đối thủ. ~3 giây hoặc chạm để qua màn tải trận.
import { HEROES } from '../data/heroes/index.js';
import { face } from './kit.js';
import { profile } from './profile.js';
import { botLabel } from './people.js';
import { MODES, S } from './modes.js';
import { stage, stageOn } from './stage.js';

export function openLineup(nav) {
  const p = profile(), M = MODES[S.mode], P = S.pick, A = S.match, h = HEROES[P.heroId];
  const el = document.createElement('div'); el.id = 'lineup'; el.className = 'scr'; el.style.pointerEvents = 'auto'; // chạm đâu cũng qua màn
  document.getElementById('ui').append(el);
  const show = stage(); stageOn(true); show.autoSpin(false); show.frame({ zoom: 1.0, dy: -0.12, dx: 0.25 }); // tướng đứng cao lên, chừa hàng chân dung phía dưới
  const place = () => show.setOffset(Math.min(innerWidth * 0.1, 110));
  place(); addEventListener('resize', place);
  show.show(P.heroId);
  const pose = setTimeout(() => show.play('Victory'), 450);

  const card = (heroId, name, me = false, i = 0) => `<div class="lu ${me ? 'me' : ''}" style="animation-delay:${0.08 * i}s"><div class="ring">${face(heroId)}</div><b>${HEROES[heroId].name}</b><small>${name}</small></div>`;
  let row;
  if (M.size === 5) {
    const al = P.allyHeroes.map((id, i) => card(id, `${A.allies[i].name} ${botLabel}`, false, i < 2 ? i : i + 1));
    row = [al[0], al[1], card(P.heroId, p.name, true, 2), al[2], al[3]].join('');
  } else {
    row = card(P.heroId, p.name, true, 0);
    if (P.foeHeroes[0]) row += `<div class="lu" style="align-self:center"><b class="vs" style="font:italic 900 clamp(26px,8vh,40px) 'Be Vietnam Pro',system-ui;color:#ffe08a;text-shadow:0 0 16px #ff9a40">VS</b></div>` + card(P.foeHeroes[0], `${A.foes[0].name} ${botLabel}`, false, 2).replace('class="lu ', 'class="lu foe ');
  }
  el.innerHTML = `<div class="lu-name"><small>${M.name.toUpperCase()}</small><h1>${h.name}</h1><p>${h.title}</p></div><div class="lu-row">${row}</div>`;
  const next = () => { clearTimeout(t); nav.go('loading'); };
  const t = setTimeout(next, 3400);
  el.addEventListener('click', next);
  return () => { clearTimeout(t); clearTimeout(pose); removeEventListener('resize', place); el.remove(); };
}
