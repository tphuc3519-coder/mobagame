// Cụm nút phụ ở đáy màn hình, bên trái cụm kỹ năng (như Liên Quân): Biến về · Phép bổ trợ · Đồ kích hoạt.
// Icon lớn có nhãn tên bên dưới; chạm nhanh = dùng, giữ yên ~0.35s = xem mô tả (thả ra không dùng). Phím: B/H về, F phép, E đồ.
import { SPELLS } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { ECON } from '../data/economy.js';
import { itemIcon } from './icons.js';
import { spellArt, recallArt } from './art.js';
import { showTip, hideTip } from './tip.js';

const HOLD = 350;

export function createSpellButtons(root, { world, player, indicators }) {
  const sp = () => SPELLS[player.spell.id];
  root.innerHTML = `
    <div class="xb" data-k="recall"><button class="sb mini"><span class="ico">${recallArt()}</span><i class="prog"></i></button><label>Biến về</label></div>
    <div class="xb" data-k="spell"><button class="sb mini"><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button><label></label></div>
    <div class="xb" data-k="itemAct" hidden><button class="sb mini"><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button><label></label></div>`;
  const box = (k) => root.querySelector(`[data-k="${k}"]`);
  const spellEl = box('spell'), recallEl = box('recall'), itemEl = box('itemAct');
  spellEl.querySelector('.ico').innerHTML = spellArt(player.spell.id); spellEl.querySelector('label').textContent = sp().name;
  const activeSlot = () => player.items.findIndex((i) => i && ITEMS[i].active);

  const info = {
    recall: () => ({ title: 'Biến về', sub: `Niệm ${ECON.recall?.channel ?? 6}s`, body: 'Về Suối Đèn của đội. Bị trúng đòn, di chuyển hay ra đòn sẽ huỷ. Về tới nơi được tăng tốc chạy trong chốc lát.' }),
    spell: () => ({ title: sp().name, sub: `Hồi chiêu ${sp().cooldown}s`, body: sp().desc }),
    itemAct: () => { const id = player.items[activeSlot()], it = ITEMS[id]; return it ? { title: `${it.active.name || it.name}`, sub: `${it.name} · hồi ${it.active.cooldown}s`, body: it.note || it.active.desc || '' } : null; },
  };
  const act = {
    recall: () => world.command(player.id, { type: 'recall' }),
    spell: (aim) => world.command(player.id, { type: 'spell', aim }),
    itemAct: () => world.command(player.id, { type: 'useItem', slot: activeSlot() }),
  };
  let press = null;
  for (const k of ['recall', 'spell', 'itemAct']) {
    const b = box(k).querySelector('button');
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down');
      const r = b.getBoundingClientRect();
      press = { k, id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, dir: null, tip: false };
      press.timer = setTimeout(() => { if (press && !press.dir) { press.tip = true; showTip(info[k](), r); } }, HOLD);
    });
    b.addEventListener('pointermove', (e) => {
      if (!press || e.pointerId !== press.id || k !== 'spell' || sp().aim !== 'direction' || press.tip) return;
      const dx = e.clientX - press.cx, dy = e.clientY - press.cy, l = Math.hypot(dx, dy);
      if (l > 15) { press.dir = { x: dx / l, y: dy / l }; clearTimeout(press.timer); }
    });
    const end = (e, cancel) => {
      if (!press || e.pointerId !== press.id) return;
      const p = press; press = null; clearTimeout(p.timer); b.classList.remove('down'); indicators.hide();
      if (p.tip) { hideTip(); return; }
      if (!cancel) act[k](p.dir ? { x: p.dir.x, y: p.dir.y } : null);
    };
    b.addEventListener('pointerup', (e) => end(e, false)); b.addEventListener('pointercancel', (e) => end(e, true));
  }
  addEventListener('keydown', (e) => {
    if (e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'f') act.spell(null); else if (k === 'r' || k === 'h') act.recall(); else if (k === 'e') act.itemAct();
  });

  const overlay = (el, left, total) => { el.querySelector('.cd').style.height = `${Math.min(100, (left / total) * 100)}%`; el.querySelector('.cdt').textContent = left > 0.05 ? (left >= 10 ? Math.ceil(left) : left.toFixed(1)) : ''; };
  let lastItem = '';
  return {
    update() {
      const s = sp(), left = Math.max(0, (player.spell.ready - world.tick) / 30);
      overlay(spellEl, left, s.cooldown);
      spellEl.classList.toggle('locked', !!(s.disabledIn1v1 && world.map.id === 'duel1v1'));
      if (press?.dir && press.k === 'spell' && s.aim === 'direction') indicators.show({ type: 'dash', aim: 'direction', range: s.range, width: 60 }, player.pos, press.dir, player.pos, false);
      const r = player.recall;
      recallEl.classList.toggle('on', !!r);
      recallEl.querySelector('.prog').style.height = r ? `${Math.min(100, ((world.tick - r.start) / ((r.until - r.start) || 1)) * 100)}%` : '0%';
      const slot = activeSlot(), id = slot >= 0 ? player.items[slot] : '';
      itemEl.hidden = !id;
      if (id !== lastItem) { lastItem = id; if (id) { itemEl.querySelector('.ico').innerHTML = itemIcon(id); itemEl.querySelector('label').textContent = ITEMS[id].active.name || ITEMS[id].name; } }
      if (id) overlay(itemEl, Math.max(0, ((player.itemCd?.[id] || 0) - world.tick) / 30), ITEMS[id].active.cooldown);
    },
  };
}
