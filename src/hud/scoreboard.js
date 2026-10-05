// Tỉ số góc phải trên (như Liên Quân): đồng hồ, tỉ số hạ gục hai đội, K/D/A của mình. Chạm vào → bảng tỉ số toàn trận:
// tab "Thông số tướng" (vàng, K/D/A, trang bị từng tướng hai đội, tổng đội: mục tiêu lớn, trụ đã phá, tổng vàng)
// tab "Thuộc tính tướng" (máu, công, phép, giáp, kháng phép hiện tại của từng tướng).
import { itemIcon } from './icons.js';
import { ICON } from './uiIcons.js';

const IC = {
  clock: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5.5V10l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  kill: '<svg viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  death: '<svg viewBox="0 0 20 20"><path d="M10 2.5c-4 0-6.5 2.8-6.5 6.3 0 2.2 1 3.6 2.3 4.4V16h8.4v-2.8c1.3-.8 2.3-2.2 2.3-4.4 0-3.5-2.5-6.3-6.5-6.3z" fill="currentColor"/><circle cx="7.3" cy="9" r="1.7" fill="#101428"/><circle cx="12.7" cy="9" r="1.7" fill="#101428"/></svg>',
  assist: '<svg viewBox="0 0 20 20"><path d="M6 9V5.5a1.4 1.4 0 012.8 0V9V4a1.4 1.4 0 012.8 0v5-3.5a1.4 1.4 0 012.8 0V11c0 3.5-2 6-5 6s-5.2-2-5.8-4.5L4 10a1.2 1.2 0 012-1z" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 20 20"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  gold: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="#f2c24a" stroke="#8a5a10" stroke-width="1.5"/><text x="10" y="14" font-size="10" font-weight="900" text-anchor="middle" fill="#7a4a08">$</text></svg>',
  boss: '<svg viewBox="0 0 20 20"><path d="M3 15l2-9 3 4 2-6 2 6 3-4 2 9z" fill="#ffc23a" stroke="#7a4a08" stroke-width="1"/></svg>',
  tower: '<svg viewBox="0 0 20 20"><path d="M6 17h8l-1-9h2V4h-2v2h-1V4H8v2H7V4H5v4h2z" fill="#c9b47a"/></svg>',
  hp: '<svg viewBox="0 0 20 20"><path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5z" fill="#6fe08a"/></svg>',
  atk: '<svg viewBox="0 0 20 20"><path d="M15.5 2.5L17.5 4.5 8 14l-2-2zM5 12l3 3-1.5 1.5-1-1-2 2-1-1 2-2-1-1z" fill="#ffb060"/></svg>',
  ap: '<svg viewBox="0 0 20 20"><path d="M10 2l2.2 5.3L18 8l-4.4 3.8L15 17.5 10 14.5 5 17.5l1.4-5.7L2 8l5.8-.7z" fill="#b48aff"/></svg>',
  armor: '<svg viewBox="0 0 20 20"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z" fill="#e8c47a"/></svg>',
  mr: '<svg viewBox="0 0 20 20"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z" fill="#6fb8ff"/><path d="M10 6l1.2 3 3 .2-2.3 2 .8 3-2.7-1.7L7.3 14l.8-3-2.3-2 3-.2z" fill="#fff"/></svg>',
};
const fmtT = (tick) => { const s = Math.floor(tick / 30); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function createScoreboard({ world, player, portraits }) {
  const heroes = () => world.entities.filter((e) => e.kind === 'hero');
  const teamKills = (t) => heroes().reduce((a, h) => a + (h.team === t ? h.kills : 0), 0);
  const top = document.createElement('button'); top.id = 'scoreTop'; top.type = 'button'; top.setAttribute('aria-label', 'Bảng tỉ số');
  top.innerHTML = `<span class="clk">${ICON.clock()}<b></b></span><span class="kda"><i>${ICON.kill()}<b></b></i><i>${ICON.death()}<b></b></i><i>${ICON.assist()}<b></b></i></span>
    <span class="sc"><b class="bl"></b><em>vs</em><b class="rd"></b></span><span class="mn">${ICON.menu()}</span>`;
  const panel = document.createElement('section'); panel.id = 'scoreboard'; panel.hidden = true;
  panel.innerHTML = `<header><nav><button data-tab="info" class="on">Thông số tướng</button><button data-tab="stats">Thuộc tính tướng</button></nav><button class="x" aria-label="Đóng">✕</button></header>
    <div class="bars"><div class="tb bl"></div><div class="vs"><b class="k0"></b><em>VS</em><b class="k1"></b></div><div class="tb rd"></div></div>
    <div class="cols"><div class="col bl"></div><div class="col rd"></div></div>`;
  document.body.append(top, panel);
  for (const el of [top, panel]) for (const t of ['pointerdown', 'pointerup', 'pointermove']) el.addEventListener(t, (e) => e.stopPropagation());
  const $ = (r, s) => r.querySelector(s);
  const q = { clk: $(top, '.clk b'), k: top.querySelectorAll('.kda b'), bl: $(top, '.sc .bl'), rd: $(top, '.sc .rd') };
  let tab = 'info', open = false, sig = '', last = '';
  const setOpen = (v) => { open = v; panel.hidden = !v; sig = ''; };
  top.onclick = () => setOpen(!open);
  $(panel, '.x').onclick = () => setOpen(false);
  addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); setOpen(!open); } });
  $(panel, 'nav').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; panel.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b)); sig = ''; };

  const my = player.team, foe = 1 - my;
  const teamBar = (t) => { const ts = world.teamStats?.[t] || {}, gold = heroes().filter((h) => h.team === t).reduce((a, h) => a + (h.goldEarned || 0), 0);
    return `<span title="Mục tiêu lớn">${IC.boss}<b>${ts.boss || 0}</b></span><span title="Trụ đã phá">${IC.tower}<b>${ts.towers || 0}</b></span><span title="Tổng vàng">${IC.gold}<b>${Math.round(gold / 100) / 10}k</b></span>`; };
  const row = (h) => {
    const me = h === player, items = h.items.map((id) => `<i class="slot">${id ? itemIcon(id) : ''}</i>`).join('');
    const info = `<span class="kd">${h.kills} / ${h.deaths} / ${h.assists || 0}</span><span class="g">${IC.gold}${Math.round(h.goldEarned || 0)}</span><span class="its">${items}</span>`;
    const s = h.stats, stats = [['hp', Math.round(s.maxHp)], ['atk', Math.round(s.atk)], ['ap', Math.round(s.ap)], ['armor', Math.round(s.armor)], ['mr', Math.round(s.mr)]]
      .map(([k, v]) => `<span class="st">${IC[k]}<b>${v}</b></span>`).join('');
    return `<div class="row ${me ? 'me' : ''} ${h.alive ? '' : 'dead'}"><canvas data-h="${h.id}" width="80" height="80"></canvas><span class="nm"><b>${h.data.name}</b><small>Cấp ${h.level}${h.alive ? '' : ' · hồi sinh ' + Math.max(0, Math.ceil((h.respawnTick - world.tick) / 30)) + 's'}</small></span>${tab === 'info' ? info : stats}</div>`;
  };
  function render() {
    $(panel, '.bars .bl').innerHTML = teamBar(my); $(panel, '.bars .rd').innerHTML = teamBar(foe);
    $(panel, '.k0').textContent = teamKills(my); $(panel, '.k1').textContent = teamKills(foe);
    $(panel, '.col.bl').innerHTML = heroes().filter((h) => h.team === my).sort((a, b) => (b === player) - (a === player)).map(row).join('');
    $(panel, '.col.rd').innerHTML = heroes().filter((h) => h.team === foe).map(row).join('');
    for (const c of panel.querySelectorAll('canvas[data-h]')) { const h = world.byId(+c.dataset.h), x = c.getContext('2d'); portraits?.draw(x, h.heroId, h.data.name, 40, 40, 34, h.team === my ? '#38b8ff' : '#ff4a3a', { me: h === player, dead: !h.alive }); }
  }
  return {
    update() {
      const t = fmtT(world.tick), mk = teamKills(my), ek = teamKills(foe), kda = [player.kills, player.deaths, player.assists || 0];
      const s = [t, mk, ek, ...kda].join('|');
      if (s !== last) { last = s; q.clk.textContent = t; q.bl.textContent = mk; q.rd.textContent = ek; kda.forEach((v, i) => { q.k[i].textContent = v; }); }
      if (!open) return;
      // bảng chỉ dựng lại khi số liệu đổi (mỗi ~0.5 s một lần là đủ)
      const ns = tab + Math.floor(world.tick / 15) + heroes().map((h) => h.items.join() + h.kills + h.deaths + (h.assists || 0) + h.alive + h.level).join();
      if (ns !== sig) { sig = ns; render(); }
    },
  };
}
