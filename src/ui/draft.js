// Cấm/chọn đấu hạng 5v5 (07 §7.3): đội Xanh (mình, chọn trước) cột trái, đội Đỏ cột phải, lưới tướng giữa (lọc Tất cả / Đề cử / theo
// vị trí), hàng ô cấm trên cùng mỗi bên, đồng hồ lượt ở giữa. Dưới Hải Đăng: thứ tự 'lite' (2 cấm mỗi bên), từ Hải Đăng: 'full'.
// Máy (đồng đội + đối thủ) cấm/chọn qua ui/draftRules.js với ngẫu nhiên theo seed trận. Xong lượt chọn cuối: 15 giây chuẩn bị (tướng
// của mình đứng trên sân khấu 3D, đổi phép bổ trợ / bảng bùa) → đội hình → tải trận. Luật thuần nằm ở draftRules.js; file này chỉ vẽ + hẹn giờ.
import { HEROES, ALPHA } from '../data/heroes/index.js';
import { SPELLS } from '../data/spells.js';
import { CHARM_PAGES, PAGE_BY_ROLE } from '../data/charms.js';
import { ROLE_IDS, ROLE_INFO } from '../data/roles.js';
import { DRAFT, DRAFT_SEQ, DRAFT_NAME } from '../data/draft.js';
import { mulberry32 } from '../core/rng.js';
import { spellArt } from '../hud/art.js';
import { face, cardSrc, toast } from './kit.js';
import { profile, saveProfile, rankOf } from './profile.js';
import { botLabel } from './people.js';
import { MODES, S } from './modes.js';
import { stage, stageOn, backdrop } from './stage.js';
import { ROLE_VI } from './panels.js';
import { fit, recommend, assignRoles, roleIcon, roleTag } from './roles.js';
import { createDraft, startTurn, act, turnDone, isAvail, available, bansPerSide, botBan, botPick, autoPick, heroMain } from './draftRules.js';
import { spellList, initialSpell, saveSpell, openSpellPicker, nextPage } from './pickLoadout.js';
import { sfx } from '../audio/audio.js';

export function openDraft(nav, { mode = 'ranked' } = {}) {
  const p = profile(), M = MODES[mode] || MODES.ranked;
  S.mode = mode;
  if (!S.match?.foes?.length) { const rr = assignRoles({ pri: p.rolePri, sec: p.roleSec }); S.match = { seed: (Math.random() * 1e9) | 0, role: rr.me, seat: 0, allies: rr.allies.map((role, i) => ({ name: 'Máy ' + (i + 1), stars: p.stars, role })), foes: rr.foes.map((role, i) => ({ name: 'Máy ' + (i + 5), stars: p.stars, role })) }; }
  const A = S.match, myRole = A.role, seat = A.seat ?? 0;
  const rnd = mulberry32((A.seed ^ DRAFT.seedSalt) >>> 0).next, seqKey = rankOf(p.stars).tier >= DRAFT.fullFromTier ? 'full' : 'lite';
  const blue = [], allySeat = []; // ghế đội Xanh theo thứ tự chọn (mình ở ghế A.seat); allySeat[k] = ghế của đồng đội A.allies[k]
  for (let s = 0, k = 0; s < 5; s++) { if (s === seat) blue.push({ me: true, name: p.name, role: myRole }); else { allySeat[k] = s; blue.push(A.allies[k++]); } }
  const red = A.foes, D = createDraft({ seq: DRAFT_SEQ[seqKey], roles: [blue.map((r) => r.role), red.map((r) => r.role)], meSeat: seat });
  const main = heroMain(p.history || []), nBan = bansPerSide(D.seq), recFor = ALPHA.filter((id) => fit(myRole, id) === 2);
  const st = { hover: ALPHA.includes(p.lastHero) && fit(myRole, p.lastHero) >= 1 ? p.lastHero : recommend(myRole)[0], banSel: null, filter: 'all', left: DRAFT.banSec, sec: DRAFT.banSec, turnT: 0,
    gap: DRAFT.introSec, speed: 1, phase: 'draft', spell: initialSpell(p, '5v5', myRole), page: CHARM_PAGES[p.page] ? p.page : null, prep: DRAFT.prepSec, ready: false };
  stageOn(false);

  const el = document.createElement('div'); el.id = 'draft'; el.className = 'scr ph-ban';
  const tabs = [['all', 'Tất cả'], ['rec', 'Đề cử'], ...ROLE_IDS.map((r) => [r, roleIcon(r) + ROLE_INFO[r].short])];
  el.innerHTML = `<div class="dr-bg"></div>
    <header class="dr-top"><div class="dr-bans blue"></div><div class="dr-turn"><div class="dr-timer"><svg viewBox="0 0 64 64"><circle class="tr" cx="32" cy="32" r="28"/><circle class="tp" cx="32" cy="32" r="28" stroke-dasharray="175.9"/></svg><b></b></div>
      <div class="dr-tt"><b class="dr-phase gt"></b><small class="dr-who"></small></div></div><div class="dr-bans red"></div></header>
    <aside class="dr-col blue"><h4 class="hd">Đội Xanh</h4><div class="dr-rows"></div></aside><aside class="dr-col red"><h4 class="hd foe">Đội Đỏ</h4><div class="dr-rows"></div></aside>
    <main class="dr-mid"><nav class="dr-tabs">${tabs.map(([f, t]) => `<button type="button" data-f="${f}">${t}</button>`).join('')}</nav><div class="dr-grid"></div></main>
    <div class="dr-bar"><div class="dr-info"><b></b><small></small></div><button type="button" class="btn-ghost dr-skip" data-a="skip" hidden>Bỏ qua</button><button type="button" class="btn-gold dr-go" data-a="lock"></button></div>
    <div class="dr-prep"><button type="button" class="dr-spell" data-a="spell"></button><button type="button" class="dr-pill" data-a="charm"></button><button type="button" class="btn-gold dr-ready" data-a="ready">Sẵn sàng</button></div>`;
  document.getElementById('ui').append(el);
  const $ = (s) => el.querySelector(s);
  const put = (node, html) => { if (node._h !== html) { node._h = html; node.innerHTML = html; } }; // chỉ dựng lại khi đổi (giữ ảnh + nhịp sáng)
  const mine = () => D.actors.find((a) => a.me && !a.done) || null; // lượt của mình đang chờ
  const myHero = () => D.picks[0][seat];
  const pageOf = () => st.page || PAGE_BY_ROLE[HEROES[myHero() || st.hover].roles[0]] || 'dps';
  const name = (id) => HEROES[id]?.name || '';

  // —— vẽ ——
  function renderTop() {
    const m = mine(), pend = D.actors.find((a) => !a.done), T = D.turn || D.seq[0];
    $('.dr-phase').textContent = st.phase === 'prep' ? 'Chuẩn bị' : T.act === 'ban' ? 'Cấm tướng' : 'Chọn tướng';
    const who = $('.dr-who'); who.classList.toggle('me', !!m);
    who.textContent = st.phase === 'prep' ? 'Đổi phép bổ trợ, bảng bùa' : m ? 'Lượt của bạn' : pend ? `${pend.team ? 'Đối thủ' : 'Đồng đội'} đang ${pend.act === 'ban' ? 'cấm' : 'chọn'}…` : DRAFT_NAME[seqKey];
    const v = st.phase === 'prep' ? st.prep : st.left, k = Math.max(0, Math.min(1, v / st.sec)), t = $('.dr-timer');
    t.querySelector('b').textContent = Math.max(0, Math.ceil(v)); t.querySelector('.tp').setAttribute('stroke-dashoffset', (175.9 * (1 - k)).toFixed(1));
    t.classList.toggle('low', !!m && st.left <= DRAFT.lowSec);
  }
  function renderBans() {
    for (const [team, cls] of [[0, 'blue'], [1, 'red']]) {
      const b = D.bans[team], now = D.actors.some((a) => !a.done && a.act === 'ban' && a.team === team);
      put($(`.dr-bans.${cls}`), Array.from({ length: nBan }, (_, i) => (i < b.length ? (b[i] ? `<i class="bn x">${face(b[i])}</i>` : '<i class="bn skip">–</i>') : `<i class="bn ${now && i === b.length ? 'now' : ''}"></i>`)).join(''));
    }
  }
  function row(r, team, s) {
    const h = D.picks[team][s], a = D.actors.find((x) => !x.done && x.team === team && x.seat === s);
    const pic = h ? face(h) : r.me ? face(st.hover, 'face hov') : '<i class="qm">?</i>';
    const tag = team && !h ? '<em class="rl">?</em>' : roleTag(r.role);
    const sub = a ? (a.act === 'ban' ? 'Đang cấm…' : 'Đang chọn…') : h ? name(h) : '';
    return `<div class="dr-row ${r.me ? 'me' : ''} ${a ? 'now' : ''} ${h ? 'done' : ''}">${pic}<div><b>${r.name}${r.me ? '' : ' ' + botLabel}</b><span>${tag}<small>${sub}</small></span></div></div>`;
  }
  function renderCols() {
    put($('.dr-col.blue .dr-rows'), blue.map((r, s) => row(r, 0, s)).join(''));
    put($('.dr-col.red .dr-rows'), red.map((r, s) => row(r, 1, s)).join(''));
  }
  function renderGrid() { // dựng một lần (giữ vị trí cuộn), sau đó chỉ đổi lớp
    const g = $('.dr-grid');
    if (!g.firstChild) g.innerHTML = recommend(myRole, ALPHA).map((id) => { const rec = fit(myRole, id) === 2; return `<button type="button" class="hc ${rec ? 'rec' : ''}" data-id="${id}"><img src="${cardSrc(id)}" alt="" draggable="false"><span><b>${name(id)}</b><small>${ROLE_VI[HEROES[id].roles[0]] || ''}</small></span>${rec ? '<em class="rec">Đề cử</em>' : ''}</button>`; }).join('');
    const sel = mine()?.act === 'ban' ? st.banSel : st.hover, bans = D.bans.flat(), f = st.filter;
    for (const b of g.children) {
      const id = b.dataset.id, c = b.classList;
      c.toggle('on', id === sel); c.toggle('ban', bans.includes(id)); c.toggle('mine', myHero() === id); c.toggle('ally', D.picks[0].includes(id) && myHero() !== id); c.toggle('foe', D.picks[1].includes(id));
      c.toggle('hide', f === 'rec' ? fit(myRole, id) < 1 : f !== 'all' && !(HEROES[id].lanes || []).includes(f));
    }
    for (const b of el.querySelectorAll('.dr-tabs button')) b.classList.toggle('on', b.dataset.f === f);
  }
  function renderBar() {
    const m = mine(), banning = m?.act === 'ban', id = banning ? st.banSel : st.hover, h = HEROES[id];
    $('.dr-info b').textContent = h ? h.name : 'Chọn tướng để cấm';
    $('.dr-info small').textContent = h ? `${h.roles.map((r) => ROLE_VI[r]).join(' · ')} · ${h.title}` : 'Tướng bị cấm không ai chọn được trận này';
    const go = $('.dr-go'); go.classList.toggle('btn-red', banning); go.classList.toggle('btn-gold', !banning); go.dataset.a = banning ? 'ban' : 'lock';
    go.textContent = banning ? 'Cấm' : m ? 'Khoá tướng' : myHero() ? 'Đã khoá' : 'Chờ lượt…';
    go.disabled = !m || !isAvail(D, id); $('.dr-skip').hidden = !banning;
  }
  function renderPrep() {
    put($('.dr-spell'), `${spellArt(st.spell)}<small>${SPELLS[st.spell].name}</small>`);
    $('.dr-pill').innerHTML = `<b>Bùa</b>${CHARM_PAGES[pageOf()].name}`;
    $('.dr-ready').disabled = st.ready; $('.dr-ready').textContent = st.ready ? 'Đã sẵn sàng' : 'Sẵn sàng';
  }
  const render = () => { renderTop(); renderBans(); renderCols(); if (st.phase === 'draft') { renderGrid(); renderBar(); } else renderPrep(); };

  // —— lượt ——
  const rand = ([a, b]) => a + Math.random() * (b - a);
  function onTurn() {
    if (D.done) { toPrep(); return; }
    const T = D.turn, m = mine();
    st.sec = st.left = T.act === 'ban' ? DRAFT.banSec : DRAFT.pickSec; st.turnT = 0;
    for (const a of D.actors) if (!a.me) a.at = rand(m ? DRAFT.botThink : DRAFT.botThinkSolo);
    if (m) {
      sfx('ui_confirm'); toast(T.act === 'ban' ? 'Đến lượt bạn cấm tướng' : 'Đến lượt bạn chọn tướng', 1300); // ngắn: thông báo che đồng hồ lượt
      if (T.act === 'ban') st.banSel = null; else { st.filter = 'rec'; fixHover(); }
    }
  }
  function fixHover() { if (!isAvail(D, st.hover) && !myHero()) st.hover = recommend(myRole, available(D))[0]; }
  function done(a, hero) { // sau mỗi lượt (máy hoặc mình): báo nếu tướng mình đang xem vừa bị lấy
    if (st.banSel && !isAvail(D, st.banSel)) st.banSel = null;
    if (!myHero() && hero && hero === st.hover) { toast(`${name(hero)} vừa bị ${a.act === 'ban' ? 'cấm' : a.team ? 'đối thủ chọn' : 'đồng đội chọn'}`); fixHover(); }
    if (turnDone(D)) st.gap = DRAFT.gapSec;
  }
  function botAct(a) {
    const hero = a.act === 'ban' ? botBan(D, a.team, rnd, a.team ? { main } : { avoid: [st.hover, p.lastHero, ...recFor] }) // đồng đội không cấm tướng Đề cử cho vị trí của mình
      : botPick(D, a.team, a.seat, rnd, !a.team && !myHero() ? { avoid: [st.hover] } : {});
    if (!act(D, a.team, a.seat, hero).ok) return;
    if (a.act === 'ban') sfx('ui_lock', { vol: 0.55, rate: 0.8 }); else sfx('ui_select', { vol: 0.45 });
    done(a, hero);
  }
  function myAct(hero, how = '') {
    const m = mine(); if (!m) { toast('Chưa tới lượt bạn'); return false; }
    if (m.act === 'pick' && hero == null) { toast('Chọn một tướng trong lưới'); return false; }
    if (m.act === 'ban' && hero === undefined) { toast('Chọn một tướng để cấm'); return false; }
    const r = act(D, 0, seat, hero ?? null);
    if (!r.ok) { toast(D.bans.flat().includes(hero) ? 'Tướng đã bị cấm' : 'Đã có người chọn'); return false; }
    if (m.act === 'ban') { sfx('ui_lock', { vol: 0.55, rate: 0.8 }); if (how) toast(how); }
    else { st.hover = hero; sfx('ui_lock'); if (how) toast(how); for (const a of D.actors) if (!a.done) a.at = Math.min(a.at, st.turnT + 0.6 + Math.random() * 1.5); }
    done(m, null); render(); return true;
  }
  const doLock = () => { const m = mine(); return m?.act === 'ban' ? myAct(st.banSel ?? undefined) : myAct(isAvail(D, st.hover) ? st.hover : null); };
  const doSkip = () => mine()?.act === 'ban' && myAct(null, 'Đã bỏ lượt cấm');

  let last = performance.now(), show = null, poseT = 0, closed = false;
  const tick = setInterval(() => {
    const now = performance.now(), dt = Math.min(1, (now - last) / 1000) * st.speed; last = now;
    if (closed) return;
    if (st.phase === 'prep') { st.prep -= dt; if (st.prep <= 0) finish(); else renderTop(); return; }
    if (st.gap > 0) { st.gap -= dt; if (st.gap <= 0) { startTurn(D); onTurn(); } if (st.phase === 'draft') render(); return; }
    st.turnT += dt; const l0 = Math.ceil(st.left); st.left -= dt; const m = mine();
    if (m && Math.ceil(st.left) < l0 && l0 <= DRAFT.lowSec + 1 && st.left > 0) sfx('ui_tick'); // 5 giây cuối lượt của mình: tích tắc
    for (const a of D.actors) if (!a.done && !a.me && st.turnT >= a.at) botAct(a);
    if (st.left <= 0) {
      for (const a of D.actors) if (!a.done && !a.me) botAct(a);
      const me = mine();
      if (me?.act === 'ban') myAct(null, 'Hết giờ: bỏ lượt cấm');
      else if (me) { const h = autoPick(D, 0, seat, st.hover); myAct(h, `Hết giờ: tự khoá ${name(h)}`); }
    }
    if (st.phase === 'draft') render();
  }, 200);

  // —— chuẩn bị (sau lượt chọn cuối) ——
  function toPrep() {
    st.phase = 'prep'; st.sec = st.prep = DRAFT.prepSec; st.speed = 1; el.className = 'scr ph-prep'; // tua nhanh (kiểm thử) chỉ cho lượt cấm/chọn
    show = stage(); stageOn(true); backdrop('soft'); show.autoSpin(false); show.aura(true, 0.6); show.frame({ zoom: 1, dy: 0, dx: 0.25 }); show.setOffset(0);
    show.show(myHero()); poseT = setTimeout(() => show?.play('Victory'), 400); sfx('ui_confirm');
    toast(myRole && st.spell !== p.spell ? `${ROLE_INFO[myRole].name}: đã mang ${SPELLS[st.spell].name}` : 'Chỉnh phép bổ trợ và bảng bùa');
    render();
  }
  function finish() {
    if (closed || st.phase === 'done') return; st.phase = 'done';
    const heroId = myHero();
    S.pick = { heroId, spellId: st.spell, charmId: pageOf(), dummies: false, role: myRole, draft: seqKey,
      allyHeroes: A.allies.map((_, i) => D.picks[0][allySeat[i]]), allyRoles: A.allies.map((a) => a.role || null), // khớp chỉ số với A.allies (flow / đội hình / tải trận)
      foeHeroes: D.picks[1].slice(), foeRoles: red.map((f) => f.role || null), bans: D.bans.map((b) => b.filter(Boolean)) };
    p.lastHero = heroId; saveSpell(p, myRole, st.spell); p.page = st.page; saveProfile();
    nav.go('lineup');
  }

  el.onclick = (e) => {
    const c = e.target.closest('.hc');
    if (c) { hoverHero(c.dataset.id); return; }
    const f = e.target.closest('[data-f]'); if (f) { st.filter = f.dataset.f; renderGrid(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'ban' || a === 'lock') doLock();
    else if (a === 'skip') doSkip();
    else if (a === 'spell' && st.phase === 'prep') openSpellPicker(spellList('5v5'), st.spell, (id) => { st.spell = id; renderPrep(); });
    else if (a === 'charm' && st.phase === 'prep') { st.page = nextPage(pageOf()); renderPrep(); toast(`Bảng bùa: ${CHARM_PAGES[st.page].name}`); }
    else if (a === 'ready' && st.phase === 'prep' && !st.ready) { st.ready = true; st.prep = Math.min(st.prep, DRAFT.readyDelay); renderPrep(); sfx('ui_lock'); }
  };
  function hoverHero(id) {
    if (st.phase !== 'draft' || !HEROES[id]) return;
    if (myHero()) { toast('Bạn đã khoá tướng'); return; }
    if (!isAvail(D, id)) { toast(D.bans.flat().includes(id) ? 'Tướng đã bị cấm' : 'Đã có người chọn'); return; }
    if (mine()?.act === 'ban') st.banSel = id; else st.hover = id;
    render();
  }
  toast(`${M.short} · Cấm/chọn ${DRAFT_NAME[seqKey]}`);
  render();
  window.__draft = { D, st, seq: seqKey, blue, allySeat, get turn() { return mine()?.act || null; }, hover: hoverHero, act: doLock, skip: doSkip,
    ready: () => el.querySelector('[data-a="ready"]').click(), speed: (k) => { st.speed = k; } };
  return () => { closed = true; clearInterval(tick); clearTimeout(poseT); el.remove(); delete window.__draft; };
}
