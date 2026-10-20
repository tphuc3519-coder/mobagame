// Cụm nút phụ ở đáy màn hình, bên trái cụm kỹ năng (như Liên Quân): Biến về · Hồi Máu (cố định) · Phép bổ trợ (tự chọn) · Đồ kích hoạt (tối đa
// ACTIVE_MAX = 2 nút; nút thứ hai xếp trên nút thứ nhất — CSS index.html). Icon lớn có nhãn tên bên dưới; chạm nhanh = dùng, giữ yên ~0.35s = xem
// mô tả (thả ra không dùng). Phím: B/R về, H hồi máu, F phép, E đồ thứ nhất, Q đồ thứ hai.
// Phép / đồ có hướng (Chớp Bước, Lụa Gió): kéo để ngắm như nút kỹ năng — vòng ngắm quanh nút, kéo ngón vào ô X góc phải rồi thả để huỷ (độ nhạy /
// tâm vòng / cách huỷ theo Cài đặt, aimPad.js). Chạm nhanh không kéo: hướng theo Cài đặt "Hướng tốc biến" (flashDir, tapDir dưới đây).
// Đồ khoá mục tiêu (Xích Giữ): giữ nút thì hiện vòng tầm + dấu vàng ở tướng sẽ bị xích (mục tiêu đang khoá nếu hợp lệ, không thì gần nhất);
// chạm là gửi kèm id mục tiêu đang khoá (lockId từ skillButtons.js), mô phỏng tự chọn lại nếu không còn hợp lệ.
// Số giây hồi: số lẻ dưới 10s khi bật cdDecimal (như cũ), tắt thì làm tròn lên giây.
import { smiteTarget, smiteDamage } from '../sim/spells.js';
import { SPELLS, RESTORE } from '../data/spells.js';
import { ITEMS, ACTIVE_MAX } from '../data/items.js';
import { ECON } from '../data/economy.js';
import { itemIcon } from './icons.js';
import { spellArt, recallArt, restoreArt } from './art.js';
import { showTip, hideTip } from './tip.js';
import { DRAG_MIN, dragMax, aimOrigin, isCancel, aimUI, setAimFocus, lastAim } from './aimPad.js';
import { pref } from '../core/prefs.js';
import { canTarget } from '../sim/vision.js';
import { pickItemTarget } from '../sim/itemActives.js';
import { isLocked } from '../sim/status.js';

const HOLD = 350;
const TAP = { move: 'hướng đang chạy (đứng yên: hướng nhìn)', skill: 'hướng chiêu vừa ngắm', enemy: 'về phía tướng địch gần nhất' }; // chạm nhanh phép có hướng (flashDir)
const IA = Array.from({ length: ACTIVE_MAX }, (_, i) => 'itemAct' + i); // ô nút đồ kích hoạt: itemAct0, itemAct1
const BOX = (k) => `<div class="xb" data-k="${k}" hidden><button class="sb mini"><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button><label></label></div>`;

/** lockId / preview: mục tiêu đang khoá và dấu xem trước (skillButtons.js) — đồ khoá mục tiêu dùng chung. */
export function createSpellButtons(root, { world, player, indicators, lockId = () => null, preview = () => {} }) {
  const sp = () => SPELLS[player.spell.id];
  root.innerHTML = `
    <div class="xb" data-k="recall"><button class="sb mini"><span class="ico">${recallArt()}</span><i class="prog"></i></button><label>Biến về</label></div>
    <div class="xb" data-k="restore"><button class="sb mini"><span class="ico">${restoreArt()}</span><i class="cd"></i><b class="cdt"></b></button><label>${RESTORE.name}</label></div>
    <div class="xb" data-k="spell"><button class="sb mini"><span class="ico"></span><i class="cd"></i><b class="cdt"></b></button><label></label></div>
    ${IA.map(BOX).join('')}`;
  const box = (k) => root.querySelector(`[data-k="${k}"]`);
  const spellEl = box('spell'), recallEl = box('recall'), restoreEl = box('restore');
  spellEl.querySelector('.ico').innerHTML = spellArt(player.spell.id); spellEl.querySelector('label').textContent = sp().name;
  /** Ô túi đồ của các món có kích hoạt, theo thứ tự túi (tối đa ACTIVE_MAX). */
  const actSlots = () => { const o = []; player.items.forEach((id, i) => { if (id && ITEMS[id].active && o.length < ACTIVE_MAX) o.push(i); }); return o; };
  /** Món của nút itemActN: { slot, id, a (active) } hoặc null. */
  const actOf = (k) => { if (!k.startsWith('itemAct')) return null; const s = actSlots()[+k.slice(7)]; return s == null ? null : { slot: s, id: player.items[s], a: ITEMS[player.items[s]].active }; };
  const aimOf = (k) => (k === 'spell' ? sp().aim : actOf(k)?.a.aim ?? 'none');
  const reachOf = (k) => (k === 'spell' ? sp().range : actOf(k)?.a.range ?? 0);
  /** Hướng phép có hướng khi chạm nhanh (không kéo), theo flashDir: 'move' → null (mô phỏng tự lấy hướng đang chạy, đứng yên thì hướng
   *  đang nhìn — như cũ); 'skill' → hướng lần ngắm kỹ năng / Chớp Bước gần nhất; 'enemy' → về phía tướng địch thấy được gần nhất trong 1200.
   *  Không có thì như 'move'. */
  function tapDir() {
    const m = pref('flashDir');
    if (m === 'skill' && lastAim.dir) return { ...lastAim.dir };
    if (m === 'enemy') {
      let best = null, bd = 1200;
      for (const t of world.entities) {
        if (!t.isHero || t.team === player.team || !canTarget(player, t)) continue;
        const d = Math.hypot(t.pos.x - player.pos.x, t.pos.y - player.pos.y); if (d > 1 && d < bd) { bd = d; best = t; }
      }
      if (best) return { x: (best.pos.x - player.pos.x) / bd, y: (best.pos.y - player.pos.y) / bd };
    }
    return null;
  }

  const itemInfo = (k) => { const o = actOf(k); return o ? { title: o.a.name || ITEMS[o.id].name, sub: `${ITEMS[o.id].name} · hồi ${o.a.cooldown}s${o.a.aim === 'direction' ? ` · chạm nhanh: ${TAP[pref('flashDir')]}` : ''}`, body: ITEMS[o.id].note || '' } : null; };
  const info = {
    recall: () => ({ title: 'Biến về', sub: `Niệm ${ECON.recall?.channel ?? 6}s`, body: 'Về Suối Đèn của đội. Bị trúng đòn, di chuyển hay ra đòn sẽ huỷ. Về tới nơi được tăng tốc chạy trong chốc lát.' }),
    restore: () => ({ title: RESTORE.name, sub: `Hồi chiêu ${RESTORE.cooldown}s · có sẵn`, body: RESTORE.desc }),
    spell: () => ({ title: sp().name, sub: `Hồi chiêu ${sp().cooldown}s${sp().aim === 'direction' ? ` · chạm nhanh: ${TAP[pref('flashDir')]}` : ''}`, body: sp().desc }),
  };
  /** Dùng đồ của nút k: hướng (kéo / chạm nhanh theo flashDir), mục tiêu đang khoá (đồ khoá mục tiêu), hoặc không ngắm. */
  const useAct = (k, aim) => {
    const o = actOf(k); if (!o) return;
    const cmdAim = o.a.aim === 'direction' ? aim ?? tapDir() : o.a.aim === 'target' ? { id: lockId() } : null;
    world.command(player.id, { type: 'useItem', slot: o.slot, aim: cmdAim });
  };
  const act = {
    recall: () => world.command(player.id, { type: 'recall' }),
    restore: () => world.command(player.id, { type: 'restore' }),
    spell: (aim) => world.command(player.id, { type: 'spell', aim: aim ?? (sp().aim === 'direction' ? tapDir() : null) }),
  };
  for (const k of IA) { info[k] = () => itemInfo(k); act[k] = (aim) => useAct(k, aim); }
  const owner = (k) => (k === 'spell' ? 'spell' : k); // chủ vòng ngắm (aimPad.js)
  const presses = new Map(); // mỗi nút một ngón (nhiều ngón cùng lúc không cướp lượt của nhau)
  const unmark = (p) => { if (p.marked) { p.marked = false; preview(null); indicators.hide(); } }; // chỉ xoá dấu do chính lượt giữ này đặt
  for (const k of ['recall', 'restore', 'spell', ...IA]) {
    const b = box(k).querySelector('button');
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (presses.has(k)) return; // nút đã có ngón khác giữ
      b.setPointerCapture?.(e.pointerId); b.classList.add('down');
      const r = b.getBoundingClientRect();
      const press = { k, id: e.pointerId, ...aimOrigin(e, r), dir: null, tip: false, f: 1, cancel: false, marked: false };
      press.timer = setTimeout(() => { if (presses.get(k) === press && !press.dir) { press.tip = true; unmark(press); showTip(info[k](), r); } }, HOLD);
      presses.set(k, press);
    });
    b.addEventListener('pointermove', (e) => {
      const press = presses.get(k);
      if (!press || e.pointerId !== press.id || aimOf(k) !== 'direction' || press.tip || !player.alive) return;
      const dx = e.clientX - press.cx, dy = e.clientY - press.cy, l = Math.hypot(dx, dy);
      if (l > DRAG_MIN) { press.dir = { x: dx / l, y: dy / l }; press.f = Math.min(1, l / dragMax()); clearTimeout(press.timer); }
      if (press.dir) { press.cancel = isCancel(press, e.clientX, e.clientY); aimUI({ aiming: true, cx: press.cx, cy: press.cy, dir: press.dir, f: press.f, cancel: press.cancel }, owner(k)); }
    });
    const end = (e, cancel) => {
      const press = presses.get(k); if (!press || e.pointerId !== press.id) return;
      const p = press; presses.delete(k); clearTimeout(p.timer); b.classList.remove('down'); indicators.hide(); if (p.dir) aimUI(null, owner(k)); unmark(p);
      if (p.tip) { hideTip(); return; }
      if (cancel || p.cancel) return; // thả trong ô X / kéo ra quá xa: huỷ, không dùng phép
      if (p.dir) lastAim.dir = { x: p.dir.x, y: p.dir.y };
      act[k](p.dir ? { x: p.dir.x, y: p.dir.y } : null);
    };
    b.addEventListener('pointerup', (e) => end(e, false)); b.addEventListener('pointercancel', (e) => end(e, true));
  }
  addEventListener('keydown', (e) => {
    if (e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'f') act.spell(null); else if (k === 'r' || k === 'b') act.recall(); else if (k === 'h') act.restore(); else if (k === 'e') act.itemAct0(null); else if (k === 'q') act.itemAct1?.(null);
  });

  const set = (o, k, v) => { if (o[k] !== v) o[k] = v; }; // chỉ ghi DOM khi đổi (đỡ tính lại bố cục mỗi khung)
  const overlay = (el, left, total) => { const c = el._c ||= { cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt') }; set(c.cd.style, 'transform', `scaleY(${Math.min(1, Math.round((left / total) * 1000) / 1000)})`); set(c.cdt, 'textContent', left > 0.05 ? String(left >= 10 || !pref('cdDecimal') ? Math.ceil(left) : left.toFixed(1)) : ''); };
  const lastItem = IA.map(() => '');
  return {
    update() {
      const s = sp(), left = Math.max(0, (player.spell.ready - world.tick) / 30);
      overlay(spellEl, left, s.cooldown);
      if (s.id === 'thu_hoach') { // Trừng Trị: mờ khi không có mục tiêu trong tầm, loé vàng khi đủ kết liễu quái
        const t = left <= 0 && player.alive ? smiteTarget(world, player, s) : null;
        spellEl.classList.toggle('notarget', !t && left <= 0); spellEl.classList.toggle('killable', !!t && t.kind === 'monster' && t.hp <= smiteDamage(player, s));
      }
      overlay(restoreEl, Math.max(0, ((player.restore?.ready || 0) - world.tick) / 30), RESTORE.cooldown);
      spellEl.classList.toggle('locked', !!(s.disabledIn1v1 && world.map.id === 'duel1v1'));
      for (const [k, press] of presses) { // đang kéo phép / đồ có hướng: chỉ báo lướt; đang giữ đồ khoá mục tiêu: vòng tầm + dấu vàng
        if (press.dir && aimOf(k) === 'direction') { const R = reachOf(k); indicators.show({ type: 'dash', aim: 'direction', range: R, width: 60 }, player.pos, press.dir, player.pos, press.cancel); setAimFocus(owner(k), { x: player.pos.x + press.dir.x * R, y: player.pos.y + press.dir.y * R }, R); }
        else if (!press.tip && aimOf(k) === 'target' && player.alive) {
          const o = actOf(k); indicators.show({ type: 'aoeSelf', aim: 'none', radius: o.a.range }, player.pos, { x: 1, y: 0 }, player.pos, false);
          press.marked = true; preview(pickItemTarget(world, player, o.a, { id: lockId() })?.id ?? null);
        }
        if (press.dir && !player.alive) { indicators.hide(); aimUI(null, owner(k)); press.cancel = true; } // chết giữa lúc ngắm: bỏ ngắm, thả ra không dùng
        if (press.marked && !player.alive) unmark(press);
      }
      const r = player.recall;
      recallEl.classList.toggle('on', !!r);
      set(recallEl.querySelector('.prog').style, 'height', r ? `${Math.min(100, Math.round(((world.tick - r.start) / ((r.until - r.start) || 1)) * 1000) / 10)}%` : '0%');
      const slots = actSlots();
      IA.forEach((k, i) => {
        const el = box(k), id = slots[i] != null ? player.items[slots[i]] : '';
        set(el, 'hidden', !id);
        if (id !== lastItem[i]) { lastItem[i] = id; if (id) { el.querySelector('.ico').innerHTML = itemIcon(id); el.querySelector('label').textContent = ITEMS[id].active.name || ITEMS[id].name; } }
        if (!id) return;
        const a = ITEMS[id].active, cd = Math.max(0, ((player.itemCd?.[id] || 0) - world.tick) / 30);
        overlay(el, cd, a.cooldown);
        el.classList.toggle('notarget', a.aim === 'target' && cd <= 0 && player.alive && !pickItemTarget(world, player, a, { id: lockId() })); // đồ khoá mục tiêu: mờ khi không có tướng địch trong tầm
      });
      root.classList.toggle('cc', player.alive && isLocked(player)); // bị áp chế / Sương Đông: cụm nút phụ xám
    },
  };
}
