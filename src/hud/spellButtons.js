// Nút phép bổ trợ, về thành, đồ kích hoạt: nằm cạnh cụm kỹ năng (05 §6, 07).
import { SPELLS } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { spellIcon, homeIcon, itemIcon } from './icons.js';

export function createSpellButtons(root, { world, player, indicators }) {
  const sp = () => SPELLS[player.spell.id];
  root.innerHTML = `
    <button class="sb mini spell" data-k="spell"><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button>
    <button class="sb mini recall" data-k="recall"><span class="ico">${homeIcon()}</span><i class="prog"></i><small>Về</small></button>
    <button class="sb mini itemAct" data-k="itemAct" hidden><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button>`;
  const el = (k) => root.querySelector(`[data-k="${k}"]`);
  const spellEl = el('spell'), recallEl = el('recall'), itemEl = el('itemAct');
  spellEl.querySelector('.ico').innerHTML = spellIcon(player.spell.id);
  let drag = null;

  const aimOf = (d) => (d ? { x: d.x, y: d.y } : null);
  spellEl.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); spellEl.setPointerCapture(e.pointerId);
    const r = spellEl.getBoundingClientRect(); drag = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, dir: null };
  });
  spellEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || sp().aim !== 'direction') return;
    const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy, l = Math.hypot(dx, dy);
    if (l > 15) drag.dir = { x: dx / l, y: dy / l };
  });
  const endSpell = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; indicators.hide();
    world.command(player.id, { type: 'spell', aim: aimOf(d.dir) });
  };
  spellEl.addEventListener('pointerup', endSpell); spellEl.addEventListener('pointercancel', () => { drag = null; indicators.hide(); });
  recallEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); world.command(player.id, { type: 'recall' }); });
  itemEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); world.command(player.id, { type: 'useItem', slot: player.items.findIndex((i) => i && ITEMS[i].active) }); });
  addEventListener('keydown', (e) => {
    if (e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'f') world.command(player.id, { type: 'spell', aim: null });
    else if (k === 'r' || k === 'h') world.command(player.id, { type: 'recall' });
    else if (k === 'e') world.command(player.id, { type: 'useItem', slot: player.items.findIndex((i) => i && ITEMS[i].active) });
  });

  const overlay = (b, left, total) => { b.querySelector('.cd').style.height = `${Math.min(100, (left / total) * 100)}%`; b.querySelector('.cdt').textContent = left > 0.05 ? (left >= 10 ? Math.ceil(left) : left.toFixed(1)) : ''; };
  let lastItem = '';
  return {
    update() {
      const s = sp(), left = Math.max(0, (player.spell.ready - world.tick) / 30);
      overlay(spellEl, left, s.cooldown);
      spellEl.classList.toggle('locked', !!(s.disabledIn1v1 && world.map.id === 'duel1v1'));
      if (drag?.dir && s.aim === 'direction') indicators.show({ type: 'dash', aim: 'direction', range: s.range, width: 60 }, player.pos, drag.dir, player.pos, false);
      const r = player.recall;
      recallEl.classList.toggle('on', !!r);
      recallEl.querySelector('.prog').style.height = r ? `${Math.min(100, ((world.tick - r.start) / ((r.until - r.start) || 1)) * 100)}%` : '0%';
      const slot = player.items.findIndex((i) => i && ITEMS[i].active), id = slot >= 0 ? player.items[slot] : '';
      itemEl.hidden = !id;
      if (id !== lastItem) { lastItem = id; if (id) itemEl.querySelector('.ico').innerHTML = itemIcon(id); }
      if (id) overlay(itemEl, Math.max(0, ((player.itemCd?.[id] || 0) - world.tick) / 30), ITEMS[id].active.cooldown);
    },
  };
}
