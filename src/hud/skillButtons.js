// Nút Đánh + K1–K3: chạm nhanh tự ngắm; kéo để chỉ báo hướng/điểm; kéo ra xa (vùng Huỷ) để huỷ (04 §2, 07 §9).
import { lv } from '../data/heroes/_levels.js';
import { nearestEnemy } from '../sim/targeting.js';
import { canLevelSkill } from '../sim/stats.js';
import { T } from '../sim/util.js';
import { heroSkillArt, fistArt } from './heroArt.js';
import { THEMES } from '../render/vfx/library.js';
import { DRAG_MIN, DRAG_MAX, inCancel, aimUI } from './aimPad.js';

/** Viền nấc cấp kỹ năng: vòng tròn chia `max` đoạn (bắt đầu từ đỉnh, theo chiều kim đồng hồ), `level` đoạn đầu sáng vàng;
 *  đoạn vừa nâng (fresh) loé sáng một nhịp. */
function levelRing(max, level, fresh) {
  const R = 46, gap = max > 4 ? 7 : 10, seg = 360 / max, pt = (a) => [50 + R * Math.sin(a * Math.PI / 180), 50 - R * Math.cos(a * Math.PI / 180)];
  let out = '<defs><linearGradient id="lvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#f0a83a"/></linearGradient></defs>';
  for (let i = 0; i < max; i++) {
    const a0 = i * seg + gap / 2, a1 = (i + 1) * seg - gap / 2, [x0, y0] = pt(a0), [x1, y1] = pt(a1), d = `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    const on = i < level;
    out += `<path d="${d}" class="${on ? 'on' : 'off'}${on && fresh && i === level - 1 ? ' fresh' : ''}"/>`;
  }
  return out;
}

// biểu tượng nút ăn lính (mũ lính) / đẩy trụ (tháp)
const MINION_IC = '<svg viewBox="0 0 40 40"><path d="M9 22c0-7 5-12 11-12s11 5 11 12v3H9z" fill="#e8dcc0"/><path d="M20 6l2.5 5h-5z" fill="#ffd27a"/><rect x="8" y="24" width="24" height="4" rx="2" fill="#c9a24a"/><path d="M13 28h14l-2 6H15z" fill="#e8dcc0"/><rect x="18.5" y="16" width="3" height="9" fill="#8a7a5a"/></svg>';
const TOWER_IC = '<svg viewBox="0 0 40 40"><path d="M12 34h16l-2-16h3l-2-6H13l-2 6h3z" fill="#e8dcc0"/><path d="M14 12l6-6 6 6z" fill="#c9a24a"/><rect x="18" y="22" width="4" height="7" rx="2" fill="#5a4a3a"/><circle cx="20" cy="16" r="2.2" fill="#ffd27a"/></svg>';
const SLOTS = ['s1', 's2', 's3'];

export function createSkillButtons(root, { world, player, indicators }) {
  const tc = THEMES[player.heroId]?.col, theme = tc != null ? '#' + tc.toString(16).padStart(6, '0') : '#ffb84d'; // màu chủ đề tướng cho icon kỹ năng
  root.innerHTML = `
    <button class="sb atk" data-k="atk" aria-label="Đánh">${fistArt()}</button>
    <button class="sb amode" data-k="minion" aria-label="Ăn lính" title="Ăn lính: đánh lính máu thấp nhất trong tầm (kết liễu lấy vàng)">${MINION_IC}</button>
    <button class="sb amode" data-k="tower" aria-label="Đẩy trụ" title="Đẩy trụ: chỉ đánh trụ/nhà chính trong tầm">${TOWER_IC}</button>
    ${SLOTS.map((s, i) => `<button class="sb sk" data-k="${s}" aria-label="${player.data.skills[s]?.name || 'K' + (i + 1)}">${player.data.skills[s] ? heroSkillArt(player.heroId, s, player.data.skills[s], theme) : ''}<span class="nm">K${i + 1}</span><i class="cd"></i><b class="cdt"></b><em class="lvl" data-up="${s}">+</em><svg class="lvring" viewBox="0 0 100 100" aria-hidden="true"></svg></button>`).join('')}
    <div class="cancel" hidden>Thả để huỷ</div>`;
  const btn = (k) => root.querySelector(`[data-k="${k}"]`);
  const cancelEl = root.querySelector('.cancel');
  // vòng ngắm + ô X huỷ: aimPad.js (dùng chung với nút phép bổ trợ)
  // Mỗi nút giữ ngón riêng (nhiều ngón cùng lúc: đang ngắm K1 vẫn chạm K2, giữ nút đánh, kéo cần…); chỉ báo vẽ theo ngón kéo gần nhất.
  const actives = new Map();
  let shown = null;
  const hideAim = () => { shown = null; indicators.hide(); cancelEl.hidden = true; aimUI(null); };

  const facingDir = () => ({ x: Math.cos(player.facing), y: Math.sin(player.facing) });
  function spec(slot) { return player.data.skills[slot]; }
  const rangeOf = (sp) => sp.range ?? sp.radius ?? 0;

  /** Tự ngắm khi chạm nhanh: địch gần nhất trong tầm, không có thì hướng đang nhìn. */
  function autoAim(slot) {
    const sp = spec(slot), range = rangeOf(sp) + 100;
    const t = nearestEnemy(world, player, range);
    const d = t ? { x: t.pos.x - player.pos.x, y: t.pos.y - player.pos.y } : facingDir();
    const l = Math.hypot(d.x, d.y) || 1;
    if (sp.aim === 'point') { const f = t ? Math.min(l, sp.range) : sp.range * 0.7; return { x: player.pos.x + (d.x / l) * f, y: player.pos.y + (d.y / l) * f }; }
    if (sp.aim === 'direction') return { x: d.x / l, y: d.y / l };
    return null;
  }
  const cast = (slot, aim) => world.command(player.id, { type: 'cast', slot, aim });

  for (const slot of SLOTS) {
    const el = btn(slot);
    el.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.up || actives.has(slot)) return; // nút đã có ngón khác giữ
      e.preventDefault(); el.setPointerCapture?.(e.pointerId);
      const r = el.getBoundingClientRect();
      actives.set(slot, { slot, id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, aiming: false, dir: facingDir(), f: 1, cancel: false });
      el.classList.add('down');
    });
    el.addEventListener('pointermove', (e) => {
      const a = actives.get(slot); if (!a || e.pointerId !== a.id) return;
      const dx = e.clientX - a.cx, dy = e.clientY - a.cy, l = Math.hypot(dx, dy), sp = spec(slot);
      if (l > DRAG_MIN && sp.aim !== 'none') { a.aiming = true; a.dir = { x: dx / l, y: dy / l }; a.f = Math.min(1, l / DRAG_MAX); }
      a.cancel = a.aiming && inCancel(e.clientX, e.clientY);
      if (a.aiming) { shown = a; cancelEl.hidden = !a.cancel; aimUI(a); }
    });
    const end = (e) => {
      const a = actives.get(slot); if (!a || e.pointerId !== a.id) return;
      const sp = spec(slot); actives.delete(slot); el.classList.remove('down');
      if (shown === a) hideAim();
      if (a.cancel) return;
      let aim = null;
      if (!a.aiming) aim = autoAim(slot);
      else if (sp.aim === 'point') aim = { x: player.pos.x + a.dir.x * sp.range * a.f, y: player.pos.y + a.dir.y * sp.range * a.f };
      else if (sp.aim === 'direction') aim = a.dir;
      cast(slot, aim);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.querySelector('.lvl').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); world.command(player.id, { type: 'levelSkill', slot }); });
  }
  let atkHeld = false, atkMode = null; // nút Đánh / Ăn lính / Đẩy trụ: giữ để đánh liên tục theo chế độ của nút
  const set = (o, k, v) => { if (o[k] !== v) o[k] = v; };
  for (const [k, mode] of [['atk', null], ['minion', 'minion'], ['tower', 'tower']]) {
    const b = btn(k);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down'); atkHeld = true; atkMode = mode; world.command(player.id, { type: 'attack', on: true, mode }); });
    const end = () => { b.classList.remove('down'); if (atkMode !== mode) return; atkHeld = false; atkMode = null; world.command(player.id, { type: 'attack', on: false }); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }

  // bàn phím: J giữ để đánh, K ăn lính, L đẩy trụ, 1/2/3 (hoặc U/I/O) tung chiêu tự ngắm
  const KEYS = { 1: 's1', 2: 's2', 3: 's3', u: 's1', i: 's2', o: 's3' };
  addEventListener('keydown', (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'j' || k === ' ') world.command(player.id, { type: 'attack', on: true }); else if (k === 'k' || k === 'l') world.command(player.id, { type: 'attack', on: true, mode: k === 'k' ? 'minion' : 'tower' }); else if (KEYS[k]) cast(KEYS[k], autoAim(KEYS[k])); });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (k === 'j' || k === ' ' || k === 'k' || k === 'l') world.command(player.id, { type: 'attack', on: false }); });

  return {
    /** Mỗi khung hình: hồi chiêu, mana, nút cộng cấp, chỉ báo ngắm. */
    update() {
      for (const slot of SLOTS) {
        const el = btn(slot), sk = spec(slot), level = player.skillLevels[slot];
        const left = Math.max(0, (player.cooldowns[slot] - world.tick) / 30), total = level ? lv(sk.cooldown, level) : 1;
        const cost = level ? lv(sk.cost, level) : 0;
        // chỉ ghi DOM khi giá trị đổi (ghi mỗi khung làm trình duyệt tính lại bố cục liên tục → giật trên điện thoại)
        const c = el._c ||= { cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt'), lvl: el.querySelector('.lvl') };
        set(c.cd.style, 'height', level ? `${Math.min(100, Math.round((left / total) * 1000) / 10)}%` : '100%');
        set(c.cdt, 'textContent', left > 0.05 ? String(left >= 10 ? Math.ceil(left) : left.toFixed(1)) : '');
        el.classList.toggle('nomana', level > 0 && player.mana < cost);
        el.classList.toggle('locked', !level); el.classList.toggle('cooling', left > 0.05);
        set(c.lvl.style, 'display', canLevelSkill(player, slot) ? 'grid' : 'none');
        const max = Array.isArray(sk.cooldown) ? sk.cooldown.length : 3;
        if (el._lv !== level) { const ring = el.querySelector('.lvring'); ring.innerHTML = levelRing(max, level, el._lv != null && level > el._lv); el._lv = level; }
        set(el, 'title', `${sk.name}: ${sk.desc || ''}`);
      }
      if (!player.alive && actives.size) { for (const a of actives.values()) btn(a.slot).classList.remove('down'); actives.clear(); hideAim(); } // chết giữa lúc ngắm: bỏ ngắm
      if (atkHeld && player.alive && !player.attacking) world.command(player.id, { type: 'attack', on: true, mode: atkMode }); // giữ nút đánh qua lúc hồi sinh / bị khống chế
      if (shown?.aiming) {
        const sp = spec(shown.slot), pt = { x: player.pos.x + shown.dir.x * (sp.range || 0) * shown.f, y: player.pos.y + shown.dir.y * (sp.range || 0) * shown.f };
        indicators.show(sp, player.pos, shown.dir, pt, shown.cancel);
      }
    },
  };
}
void T;
