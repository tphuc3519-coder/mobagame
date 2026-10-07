// Chọn tướng (sau khi chấp nhận trận): lưới tướng bên trái, tướng 3D giữa (vuốt xoay, chạm đúp xem động tác), tên + vai trò, cột kỹ năng,
// đồng hồ 30 giây, cột đội mình bên phải (đồng đội máy chọn dần, tướng đồng đội đã khoá thì mình không chọn được), phép bổ trợ + bảng
// bùa, nút Khoá. Hết giờ tự khoá tướng đang xem. Cả đội khoá xong → đếm 3 giây → màn đội hình. Luyện tập: không giới hạn giờ,
// chọn đối thủ (ngẫu nhiên / một tướng / hình nộm).
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { SPELLS, SPELL_LIST_1V1 } from '../data/spells.js';
import { CHARM_PAGES, PAGE_BY_ROLE } from '../data/charms.js';
import { spellArt } from '../hud/art.js';
import { ICON, face, cardSrc, toast, dialog } from './kit.js';
import { profile, saveProfile } from './profile.js';
import { botLabel, pickHeroes } from './people.js';
import { MODES, S } from './modes.js';
import { stage, stageOn } from './stage.js';
import { ROLE_VI } from './panels.js';
import { skillDesc } from './skilltext.js';

const PICK_SEC = 30, READY_SEC = 3;
const ROLE_ICO = { fighter: '⚔', tank: '⛨', assassin: '✦', mage: '✺', marksman: '➶', support: '✚' };

export function openPick(nav, { mode = S.mode } = {}) {
  const p = profile(), M = MODES[mode] || MODES.normal, training = mode === 'training';
  S.mode = mode;
  if (!S.match) S.match = { seed: (Math.random() * 1e9) | 0, allies: [], foes: [{ name: 'Máy', stars: p.stars }] };
  const spells = M.map === '1v1' ? SPELL_LIST_1V1 : Object.keys(SPELLS);
  const team = S.match.allies.map((a) => ({ ...a, hero: null, locked: false, at: 3 + Math.random() * (PICK_SEC - 12) }));
  const st = { sel: ALPHA.includes(p.lastHero) ? p.lastHero : p.feature, locked: false, spell: spells.includes(p.spell) ? p.spell : 'chop_buoc',
    page: CHARM_PAGES[p.page] ? p.page : null, foe: null, left: training ? Infinity : PICK_SEC, ready: -1 };
  const taken = () => team.filter((t) => t.locked).map((t) => t.hero);
  const pageOf = () => st.page || PAGE_BY_ROLE[HEROES[st.sel].roles[0]] || 'dps';
  const ids = Object.keys(HEROES).sort((a, b) => (ALPHA.includes(b) - ALPHA.includes(a)) || ALPHA.indexOf(a) - ALPHA.indexOf(b));

  const el = document.createElement('div'); el.id = 'pick'; el.className = 'scr';
  document.getElementById('ui').append(el);
  const show = stage(); stageOn(true); show.autoSpin(false); show.frame({ zoom: 1, dy: 0, dx: 0.25 });
  const place = () => show.setOffset((Math.min(260, innerWidth * 0.31) - Math.min(240, innerWidth * 0.29)) / 2 - 20);
  place(); addEventListener('resize', place);

  el.innerHTML = `
    <aside class="pk-left"><h4>Tướng <small>${M.name}</small></h4><div class="pk-grid"></div></aside>
    <div class="pk-title"><h1></h1><p></p></div>
    <div class="pk-timer" ${training ? 'hidden' : ''}><b></b><small></small></div>
    <div class="pk-skills"></div><div class="pk-tip" hidden></div>
    <aside class="pk-team"><div class="pk-rows"></div><button type="button" class="btn-gold pk-go" data-a="lock"></button></aside>
    <div class="pk-bl"><button type="button" class="pk-spell" data-a="spell"></button><button type="button" class="pk-pill" data-a="charm"></button>${training ? '<button type="button" class="pk-pill" data-a="foe"></button>' : ''}</div>
    <p class="pk-hint">Vuốt ngang để xoay · chạm đúp để xem động tác</p>`;
  const $ = (s) => el.querySelector(s);

  function renderGrid() { // dựng một lần, sau đó chỉ đổi lớp (giữ vị trí cuộn của lưới khi đồng đội chọn)
    const g = $('.pk-grid'), tk = taken();
    if (!g.firstChild) g.innerHTML = ids.map((id) => {
      const h = HEROES[id], ok = ALPHA.includes(id);
      return `<button type="button" class="hc ${ok ? '' : 'lock'}" data-id="${id}">${ok ? `<img src="${cardSrc(id)}" alt="" draggable="false">` : face(id)}<span><b>${h.name}</b><small>${ROLE_VI[h.roles[0]] || ''}</small></span>${ok ? '' : '<em>Sắp có</em>'}</button>`;
    }).join('');
    for (const b of g.children) { b.classList.toggle('on', b.dataset.id === st.sel); b.classList.toggle('taken', tk.includes(b.dataset.id)); }
  }
  function renderInfo() {
    const h = HEROES[st.sel];
    $('.pk-title h1').textContent = h.name;
    $('.pk-title p').innerHTML = `${h.roles.map((r) => `<span>${ROLE_ICO[r] || ''} ${ROLE_VI[r]}</span>`).join('')}<i>${h.title}</i>`;
    const sk = [['Nội tại', h.passive], ['K1', h.skills.s1], ['K2', h.skills.s2], ['K3', h.skills.s3]];
    $('.pk-skills').innerHTML = sk.map(([k, s], i) => `<button type="button" data-sk="${i}" class="${i ? '' : 'pas'}"><b>${k}</b><span>${s?.name || ''}</span></button>`).join('');
    $('.pk-skills').onclick = (e) => {
      const b = e.target.closest('[data-sk]'); if (!b) return; const s = sk[+b.dataset.sk][1]; if (!s) return;
      const tip = $('.pk-tip'); tip.innerHTML = `<b>${s.name}</b><p>${+b.dataset.sk === 0 ? s.desc || "" : skillDesc(s)}</p>`; tip.hidden = false; clearTimeout(tip.t); tip.t = setTimeout(() => (tip.hidden = true), 6000);
    };
  }
  function renderTeam() {
    const meRow = `<div class="tm me ${st.locked ? '' : 'picking'}">${face(st.sel)}<div><b>${p.name}</b><small class="${st.locked ? 'ok' : ''}">${st.locked ? 'Đã khoá · ' + HEROES[st.sel].name : 'Đang chọn…'}</small></div></div>`;
    const rows = team.map((t) => `<div class="tm ${t.locked ? '' : 'picking'}">${t.hero ? face(t.hero) : '<i class="qm">?</i>'}<div><b>${t.name} ${botLabel}</b><small class="${t.locked ? 'ok' : ''}">${t.locked ? 'Đã khoá · ' + HEROES[t.hero].name : 'Đang chọn…'}</small></div></div>`);
    let foe = '';
    if (M.size === 1) {
      const f = training ? (st.foe === 'dummy' ? null : st.foe) : null;
      foe = `<h4 style="color:#ff9a8a;margin-top:8px">ĐỐI THỦ</h4><div class="tm foe">${f ? face(f) : '<i class="qm">?</i>'}<div><b>${training && st.foe === 'dummy' ? 'Hình nộm' : S.match.foes[0].name + ' ' + botLabel}</b><small>${training ? (st.foe === 'dummy' ? '3 hình nộm đứng yên' : f ? HEROES[f].name : 'Ngẫu nhiên') : 'Ẩn tới lúc vào trận'}</small></div></div>`;
    }
    $('.pk-rows').innerHTML = `<h4>${M.size === 1 ? 'BẠN' : 'ĐỘI CỦA BẠN'}</h4>${meRow}${rows.join('')}${foe}`;
  }
  function renderBottom() {
    $('.pk-spell').innerHTML = `${spellArt(st.spell)}<small>${SPELLS[st.spell].name}</small>`;
    $('.pk-pill[data-a="charm"]').innerHTML = `<b>Bùa</b>${CHARM_PAGES[pageOf()].name}`;
    if (training) $('.pk-pill[data-a="foe"]').innerHTML = `<b>Đối thủ</b>${st.foe === 'dummy' ? 'Hình nộm' : st.foe ? HEROES[st.foe].name : 'Ngẫu nhiên'}`;
    const go = $('.pk-go'); go.disabled = st.locked || taken().includes(st.sel);
    go.textContent = training ? 'Bắt đầu' : st.locked ? 'Đã khoá' : 'Khoá tướng';
  }
  function renderTimer() {
    if (training) return;
    const t = $('.pk-timer'), ready = st.ready >= 0, v = ready ? st.ready : st.left;
    t.querySelector('b').textContent = Math.max(0, Math.ceil(v)); t.querySelector('small').textContent = ready ? 'VÀO TRẬN' : 'CHỌN TƯỚNG';
    t.classList.toggle('low', !ready && st.left <= 5);
  }
  const refresh = () => { renderGrid(); renderInfo(); renderTeam(); renderBottom(); renderTimer(); };
  refresh(); show.show(st.sel);

  // —— máy chọn: đến giờ của mình thì chọn một tướng chưa ai trong đội khoá (tránh tướng người chơi đang xem nếu còn lựa chọn khác) ——
  function botPick(t) {
    const tk = [...taken(), ...(st.locked ? [st.sel] : [])];
    let opts = ALPHA.filter((h) => !tk.includes(h));
    if (opts.length > 1) opts = opts.filter((h) => h !== st.sel);
    t.hero = opts[Math.floor(Math.random() * opts.length)] || ALPHA[0]; t.locked = true;
    if (!st.locked && t.hero === st.sel) { const alt = ALPHA.find((h) => !taken().includes(h)); if (alt) { st.sel = alt; show.show(alt); toast(`${HEROES[t.hero].name} đã được đồng đội chọn`); } }
    refresh(); checkAll();
  }
  function lock() {
    if (st.locked || taken().includes(st.sel)) return;
    st.locked = true; show.play('Victory');
    if (training) { finish(); return; }
    for (const t of team) if (!t.locked) t.at = Math.min(t.at, PICK_SEC - st.left + 0.6 + Math.random() * 2); // mình khoá rồi thì máy nhanh tay hơn
    refresh(); checkAll();
  }
  function checkAll() { if (st.locked && team.every((t) => t.locked) && st.ready < 0) { st.ready = READY_SEC; renderTimer(); } }
  let last = performance.now(), done = false;
  const tick = setInterval(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (training || done) return;
    if (st.ready >= 0) { st.ready -= dt; renderTimer(); if (st.ready <= 0) finish(); return; }
    st.left -= dt; const el2 = PICK_SEC - st.left;
    for (const t of team) if (!t.locked && el2 >= t.at) botPick(t);
    if (st.left <= 0) {
      for (const t of team) if (!t.locked) botPick(t);
      if (!st.locked) { if (taken().includes(st.sel)) st.sel = ALPHA.find((h) => !taken().includes(h)); show.show(st.sel); lock(); }
    }
    renderTimer();
  }, 200);

  function finish() {
    if (done) return; done = true; clearInterval(tick);
    const heroId = st.sel;
    let foeHeroes, dummies = false;
    if (M.size === 5) foeHeroes = pickHeroes(5);
    else if (training && st.foe === 'dummy') { foeHeroes = []; dummies = true; }
    else foeHeroes = [training && st.foe ? st.foe : pickHeroes(1, [heroId])[0]];
    S.pick = { heroId, spellId: st.spell, charmId: pageOf(), allyHeroes: team.map((t) => t.hero), foeHeroes, dummies };
    p.lastHero = heroId; p.spell = st.spell; p.page = st.page; saveProfile();
    nav.go('lineup');
  }

  el.onclick = (e) => {
    const c = e.target.closest('.hc');
    if (c) {
      const id = c.dataset.id;
      if (!ALPHA.includes(id)) { toast('Tướng sắp ra mắt'); return; }
      if (st.locked) { toast('Bạn đã khoá tướng'); return; }
      if (taken().includes(id)) { toast('Đồng đội đã chọn tướng này'); return; }
      if (id !== st.sel) { st.sel = id; refresh(); show.show(id); }
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'lock') lock();
    else if (a === 'charm') { const k = Object.keys(CHARM_PAGES); st.page = k[(k.indexOf(pageOf()) + 1) % k.length]; renderBottom(); toast(`Bảng bùa: ${CHARM_PAGES[st.page].name}`); }
    else if (a === 'foe') { const opts = [null, ...ALPHA, 'dummy']; st.foe = opts[(opts.indexOf(st.foe) + 1) % opts.length]; renderTeam(); renderBottom(); }
    else if (a === 'spell') {
      const d = dialog({ title: 'Phép bổ trợ', html: `<div class="pk-spells">${spells.map((id) => `<button type="button" data-sp="${id}" class="${id === st.spell ? 'on' : ''}">${spellArt(id)}<b>${SPELLS[id].name}</b><small>${SPELLS[id].desc}</small></button>`).join('')}</div>`, buttons: [{ text: 'Đóng' }] });
      d.el.querySelector('.pk-spells').onclick = (ev) => { const b = ev.target.closest('[data-sp]'); if (!b) return; st.spell = b.dataset.sp; renderBottom(); d.close(); };
    }
  };
  window.__pick = { st, team, lock, finish };
  return () => { clearInterval(tick); removeEventListener('resize', place); el.remove(); delete window.__pick; };
}
