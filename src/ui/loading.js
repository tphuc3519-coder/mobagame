// Màn tải trận (ảnh 5): nền mờ, hàng thẻ đội mình (trên) và đối thủ (dưới) — ảnh tướng, huy hiệu hạng, tên tướng, tên người chơi, phép
// bổ trợ, thanh tiến độ riêng từng người; giữa là mẹo chơi, chữ VS, phần trăm tổng. Tiến độ theo việc tải thật (model tướng trong trận,
// model quái/lính); thanh của máy chạy nhanh chậm khác nhau như người chơi thật nhưng không bao giờ xong trước model thật.
import { HEROES } from '../data/heroes/index.js';
import { SPELLS } from '../data/spells.js';
import { spellArt } from '../hud/art.js';
import { loadHero, heroProgress } from '../render/assets.js';
import { preloadMonsters } from '../render/monsterModels.js';
import { cardSrc, rankBadge } from './kit.js';
import { profile, rankOf } from './profile.js';
import { botLabel, tip } from './people.js';
import { MODES, S } from './modes.js';
import { stageDispose, stageOn } from './stage.js';

const MIN_SEC = 2.6;

export function openLoading(nav) {
  stageDispose(); stageOn(false); // trận tạo ngữ cảnh WebGL riêng: giải phóng sân khấu trước
  const p = profile(), M = MODES[S.mode], P = S.pick, A = S.match;
  const spellOf = (id) => { const s = HEROES[id].defaultSpell; return SPELLS[s] && !(M.map === '1v1' && SPELLS[s].disabledIn1v1) ? s : 'chop_buoc'; };
  const me = { hero: P.heroId, name: p.name, stars: p.stars, spell: P.spellId, me: true };
  const allies = P.allyHeroes.map((h, i) => ({ hero: h, name: `${A.allies[i].name} ${botLabel}`, stars: A.allies[i].stars, spell: spellOf(h) }));
  const ally = M.size === 5 ? [allies[0], allies[1], me, allies[2], allies[3]] : [me];
  const foe = P.foeHeroes.map((h, i) => ({ hero: h, name: `${A.foes[i].name} ${botLabel}`, stars: A.foes[i].stars, spell: spellOf(h) }));
  const all = [...ally, ...foe];
  for (const c of all) { c.v = 0; c.fake = c.me ? 1 : 0; c.speed = 0.22 + Math.random() * 0.55; c.stall = Math.random() < 0.3 ? 0.55 + Math.random() * 0.3 : 2; }

  const el = document.createElement('div'); el.id = 'loadscr'; el.className = 'scr' + (M.size === 1 ? ' solo' : '');
  const cardHtml = (c, i) => `<div class="ld-card ${c.me ? 'me' : ''}" data-i="${i}"><span class="crest">${rankBadge(rankOf(c.stars), 40)}</span><div class="pic"><img class="cd" src="${cardSrc(c.hero)}" alt="" draggable="false">
    <div class="info"><b>${HEROES[c.hero].name}</b><small>${c.name}</small><span class="ic">${spellArt(c.spell)}</span></div></div><div class="pb"><i></i></div></div>`;
  const ai = ally.map((c, i) => cardHtml(c, i)).join(''), fi = foe.map((c, i) => cardHtml(c, ally.length + i)).join('');
  const mid = `<div class="ld-mid"><span class="ld-tip">Mẹo: ${tip()}</span><b class="vs">VS</b><span class="ld-pct">Đang tải 0%</span></div>`;
  el.innerHTML = `<div class="bg" style="background-image:url(./assets/ui/keyart.jpg)"></div>` + (M.size === 1
    ? `<div class="ld-rows"><div class="ld-teams"><div class="ld-team ally">${ai}</div>${fi ? '<b class="vs">VS</b>' : ''}<div class="ld-team foe">${fi}</div></div>${mid.replace('<b class="vs">VS</b>', '<b></b>')}</div>`
    : `<div class="ld-rows"><div class="ld-team ally">${ai}</div>${mid}<div class="ld-team foe">${fi}</div></div>`);
  document.getElementById('ui').append(el);
  const bars = [...el.querySelectorAll('.pb i')], pct = el.querySelector('.ld-pct');

  // việc tải thật: model trong trận của mọi tướng (trùng thì một lần) + quái rừng/lính
  const heroes = [...new Set(all.map((c) => c.hero))];
  heroes.forEach((id) => loadHero(id));
  let mobs = 0; preloadMonsters().catch(() => {}).then(() => { mobs = 1; });
  const t0 = performance.now(); let last = t0, raf = 0, started = false;
  const step = (now) => {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = Math.max(last, now); // mốc rAF có thể sớm hơn performance.now() lúc mở màn
    let sum = 0;
    all.forEach((c, i) => {
      if (!c.me) { c.fake = Math.min(1, c.fake + dt * c.speed * (0.4 + Math.random())); if (c.fake > c.stall) { c.fake = c.stall; if (Math.random() < dt * 0.8) c.stall = 2; } } // có người "khựng mạng" một lúc
      const target = Math.min(c.fake, heroProgress(c.hero));
      c.v += (target - c.v) * Math.min(1, dt * 6); if (target >= 1 && c.v > 0.995) c.v = 1;
      bars[i].style.width = (c.v * 100).toFixed(1) + '%'; sum += c.v;
    });
    const total = (now - t0) > 30000 ? 1 : (sum / all.length) * 0.9 + mobs * 0.1; // mạng treo quá lâu: vào trận luôn (model còn thiếu dùng bản giữ chỗ)
    pct.textContent = `Đang tải ${Math.floor(total * 100)}%`;
    if (total >= 1 && (now - t0) / 1000 >= MIN_SEC) { if (!started) { started = true; pct.textContent = 'Vào trận…'; setTimeout(() => nav.start(), 250); } return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); el.remove(); };
}
