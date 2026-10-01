// Màn chọn tướng luyện tập (07 §7.1): lưới 2 cột bên trái, tướng 3D giữa, cột kỹ năng, Mình VS Máy, phép/bùa/độ khó, Bắt đầu.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { SPELLS, SPELL_LIST_1V1 } from '../data/spells.js';
import { CHARM_PAGES, PAGE_BY_ROLE } from '../data/charms.js';
import { DIFFICULTY } from '../data/ai.js';
import { createShowcase } from '../showcase/showcase.js';
import { spellArt } from '../hud/art.js';
import { pickLevel } from '../render/quality.js';

export const ROLE_VI = { fighter: 'Đấu sĩ', tank: 'Đỡ đòn', assassin: 'Sát thủ', mage: 'Pháp sư', marksman: 'Xạ thủ', support: 'Trợ thủ' };
const ROLE_ICO = { fighter: '⚔', tank: '⛨', assassin: '✦', mage: '✺', marksman: '➶', support: '✚' };
const KEY = 'la.select';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* không lưu được thì thôi */ } };

export function openSelect({ onStart }) {
  const root = document.getElementById('select');
  const saved = load();
  const st = { side: 'me', me: ALPHA.includes(saved.me) ? saved.me : 'hoa_ren', foe: ALPHA.includes(saved.foe) ? saved.foe : null,
    mode: saved.mode === '5v5' ? '5v5' : '1v1', spell: SPELL_LIST_1V1.includes(saved.spell) ? saved.spell : 'chop_buoc', page: saved.page || null, diff: DIFFICULTY[saved.diff] ? saved.diff : 'normal' };
  const portraits = {};
  root.innerHTML = `
    <canvas id="show"></canvas>
    <aside class="sl-left"><nav><b>Tướng</b><span>Trang phục</span></nav><div class="sl-grid"></div></aside>
    <div class="sl-title"><h1></h1><p></p></div>
    <div class="sl-skills"></div><div class="sl-tip" hidden></div>
    <div class="sl-vs"><button class="sl-me"></button><b>VS</b><button class="sl-foe"></button></div>
    <button class="sl-cancel">Huỷ</button>
    <div class="sl-bl"><button class="sl-pill sl-mode"></button><button class="sl-pill sl-charm"></button><button class="sl-spell"></button><button class="sl-pill sl-diff"></button></div>
    <button class="sl-go"></button>
    <p class="sl-hint">Vuốt ngang để xoay · chạm đúp để xem động tác</p>`;
  root.classList.add('on');
  const $ = (s) => root.querySelector(s);
  const show = createShowcase($('#show'), { quality: pickLevel() });
  const place = () => show.setOffset(Math.min(innerWidth * 0.05, 50));
  place(); addEventListener('resize', place);

  const ids = Object.keys(HEROES).sort((a, b) => (ALPHA.includes(b) - ALPHA.includes(a)) || ALPHA.indexOf(a) - ALPHA.indexOf(b));
  const avatar = (id) => portraits[id] ? `<img src="${portraits[id]}" alt="">` : `<i class="sl-ini">${HEROES[id].name.split(' ').map((w) => w[0]).join('')}</i>`;
  const pageOf = () => st.page || PAGE_BY_ROLE[HEROES[st.me].roles[0]] || 'dps';

  function renderGrid() {
    const selId = st.side === 'me' ? st.me : st.foe;
    $('.sl-grid').innerHTML = ids.map((id) => {
      const h = HEROES[id], ok = ALPHA.includes(id);
      return `<button class="sl-card ${id === selId ? 'on' : ''} ${ok ? '' : 'lock'}" data-id="${id}">${avatar(id)}<span><b>${h.name}</b><small>${ROLE_VI[h.roles[0]] || ''}</small></span>${ok ? '' : '<em>Sắp có</em>'}</button>`;
    }).join('');
  }
  function renderInfo() {
    const id = st.side === 'me' ? st.me : st.foe || st.me, h = HEROES[id];
    $('.sl-title h1').textContent = h.name;
    $('.sl-title p').innerHTML = `${h.roles.map((r) => `<span>${ROLE_ICO[r]} ${ROLE_VI[r]}</span>`).join('')}<i>${h.title}</i>`;
    const sk = [['Nội tại', h.passive], ['K1', h.skills.s1], ['K2', h.skills.s2], ['K3', h.skills.s3]];
    $('.sl-skills').innerHTML = sk.map(([k, s], i) => `<button data-i="${i}" class="${i ? '' : 'pas'}"><b>${k}</b><span>${s?.name || ''}</span></button>`).join('');
    $('.sl-skills').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const s = sk[+b.dataset.i][1]; const tip = $('.sl-tip'); tip.innerHTML = `<b>${s.name}</b><p>${s.desc || ''}</p>`; tip.hidden = false; clearTimeout(tip.t); tip.t = setTimeout(() => (tip.hidden = true), 4000); };
  }
  function renderVs() {
    $('.sl-me').innerHTML = `${avatar(st.me)}<span><small>Bạn</small><b>${HEROES[st.me].name}</b></span>`;
    $('.sl-foe').innerHTML = st.mode === '5v5' ? `<i class="sl-ini">5</i><span><small>Máy · ${DIFFICULTY[st.diff].name}</small><b>4 đồng đội + 5 đối thủ</b></span>` : st.foe ? `${avatar(st.foe)}<span><small>Máy · ${DIFFICULTY[st.diff].name}</small><b>${HEROES[st.foe].name}</b></span>` : '<i class="sl-ini">?</i><span><small>Máy</small><b>Chạm để chọn</b></span>';
    $('.sl-mode').innerHTML = `<b>Chế độ</b> ${st.mode}`;
    $('.sl-me').classList.toggle('on', st.side === 'me'); $('.sl-foe').classList.toggle('on', st.side === 'foe');
    $('.sl-go').textContent = st.mode === '5v5' || st.foe ? 'Bắt đầu' : 'Chọn mục tiêu';
    $('.sl-spell').innerHTML = `${spellArt(st.spell)}<small>${SPELLS[st.spell].name}</small>`;
    $('.sl-charm').innerHTML = `<b>Bùa</b> ${CHARM_PAGES[pageOf()].name}`;
    $('.sl-diff').innerHTML = `<b>Máy</b> ${DIFFICULTY[st.diff].name}`;
    save({ mode: st.mode, me: st.me, foe: st.foe, spell: st.spell, page: st.page, diff: st.diff });
  }
  const refresh = () => { renderGrid(); renderInfo(); renderVs(); };
  const focus = () => show.show(st.side === 'me' ? st.me : st.foe || st.me);

  $('.sl-grid').onclick = (e) => {
    const b = e.target.closest('.sl-card'); if (!b || b.classList.contains('lock')) return;
    if (st.side === 'me') st.me = b.dataset.id; else st.foe = b.dataset.id;
    refresh(); focus();
  };
  $('.sl-me').onclick = () => { st.side = 'me'; refresh(); focus(); };
  $('.sl-foe').onclick = () => { st.side = 'foe'; if (!st.foe) st.foe = ALPHA.find((h) => h !== st.me); refresh(); focus(); };
  $('.sl-mode').onclick = () => { st.mode = st.mode === '5v5' ? '1v1' : '5v5'; if (st.mode === '5v5') { st.side = 'me'; } renderVs(); };
  $('.sl-spell').onclick = () => { st.spell = SPELL_LIST_1V1[(SPELL_LIST_1V1.indexOf(st.spell) + 1) % SPELL_LIST_1V1.length]; renderVs(); const tip = $('.sl-tip'); tip.innerHTML = `<b>${SPELLS[st.spell].name}</b><p>${SPELLS[st.spell].desc}</p>`; tip.hidden = false; };
  $('.sl-charm').onclick = () => { const k = Object.keys(CHARM_PAGES); st.page = k[(k.indexOf(pageOf()) + 1) % k.length]; renderVs(); };
  $('.sl-diff').onclick = () => { const k = Object.keys(DIFFICULTY); st.diff = k[(k.indexOf(st.diff) + 1) % k.length]; renderVs(); };
  $('.sl-cancel').onclick = () => { st.side = 'me'; st.foe = null; refresh(); focus(); };
  $('.sl-go').onclick = () => {
    if (st.mode !== '5v5' && !st.foe) { $('.sl-foe').onclick(); return; }
    root.classList.remove('on'); show.dispose(); removeEventListener('resize', place); root.innerHTML = '';
    onStart({ mode: st.mode, heroId: st.me, enemyId: st.foe, spellId: st.spell, charmId: pageOf(), difficulty: st.diff });
  };
  refresh(); focus();
  // chân dung: chụp lần lượt sau khi cảnh đã chạy để không chặn khung hình đầu
  (async () => { for (const id of ALPHA) { portraits[id] = await show.portrait(id); renderGrid(); renderVs(); } })().catch(() => {});
  window.__select = { st, show };
}
