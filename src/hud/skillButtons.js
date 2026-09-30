// Nút Đánh + K1–K3: chạm nhanh tự ngắm; kéo để chỉ báo hướng/điểm; kéo ra xa (vùng Huỷ) để huỷ (04 §2, 07 §9).
import { lv } from '../data/heroes/_levels.js';
import { nearestEnemy } from '../sim/targeting.js';
import { canLevelSkill } from '../sim/stats.js';
import { T } from '../sim/util.js';

const DRAG_MIN = 15, DRAG_MAX = 110, CANCEL = 210;
const SLOTS = ['s1', 's2', 's3'];

export function createSkillButtons(root, { world, player, indicators }) {
  root.innerHTML = `
    <button class="sb atk" data-k="atk" aria-label="Đánh"><span>Đánh</span></button>
    ${SLOTS.map((s, i) => `<button class="sb sk" data-k="${s}"><span class="nm">K${i + 1}</span><i class="cd"></i><b class="cdt"></b><em class="lvl" data-up="${s}">+</em><u class="pips"></u></button>`).join('')}
    <div class="cancel" hidden>Thả để huỷ</div>`;
  const btn = (k) => root.querySelector(`[data-k="${k}"]`);
  const cancelEl = root.querySelector('.cancel');
  let active = null;

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
      if (e.target.dataset.up) return;
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      active = { slot, id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, aiming: false, dir: facingDir(), f: 1, cancel: false };
      el.classList.add('down');
    });
    el.addEventListener('pointermove', (e) => {
      if (!active || e.pointerId !== active.id) return;
      const dx = e.clientX - active.cx, dy = e.clientY - active.cy, l = Math.hypot(dx, dy), sp = spec(slot);
      if (l > DRAG_MIN && sp.aim !== 'none') { active.aiming = true; active.dir = { x: dx / l, y: dy / l }; active.f = Math.min(1, l / DRAG_MAX); }
      active.cancel = active.aiming && l > CANCEL; cancelEl.hidden = !active.cancel;
    });
    const end = (e) => {
      if (!active || e.pointerId !== active.id) return;
      const a = active, sp = spec(slot); active = null; el.classList.remove('down'); indicators.hide(); cancelEl.hidden = true;
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
  const atk = btn('atk');
  atk.addEventListener('pointerdown', (e) => { e.preventDefault(); atk.setPointerCapture(e.pointerId); atk.classList.add('down'); world.command(player.id, { type: 'attack', on: true }); });
  const atkEnd = () => { atk.classList.remove('down'); world.command(player.id, { type: 'attack', on: false }); };
  atk.addEventListener('pointerup', atkEnd); atk.addEventListener('pointercancel', atkEnd);

  // bàn phím: J giữ để đánh, 1/2/3 (hoặc U/I/O) tung chiêu tự ngắm
  const KEYS = { 1: 's1', 2: 's2', 3: 's3', u: 's1', i: 's2', o: 's3' };
  addEventListener('keydown', (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'j' || k === ' ') world.command(player.id, { type: 'attack', on: true }); else if (KEYS[k]) cast(KEYS[k], autoAim(KEYS[k])); });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (k === 'j' || k === ' ') world.command(player.id, { type: 'attack', on: false }); });

  return {
    /** Mỗi khung hình: hồi chiêu, mana, nút cộng cấp, chỉ báo ngắm. */
    update() {
      for (const slot of SLOTS) {
        const el = btn(slot), sk = spec(slot), level = player.skillLevels[slot];
        const left = Math.max(0, (player.cooldowns[slot] - world.tick) / 30), total = level ? lv(sk.cooldown, level) : 1;
        const cost = level ? lv(sk.cost, level) : 0;
        el.querySelector('.cd').style.height = level ? `${Math.min(100, (left / total) * 100)}%` : '100%';
        el.querySelector('.cdt').textContent = left > 0.05 ? (left >= 10 ? Math.ceil(left) : left.toFixed(1)) : '';
        el.classList.toggle('nomana', level > 0 && player.mana < cost);
        el.classList.toggle('locked', !level); el.classList.toggle('cooling', left > 0.05);
        el.querySelector('.lvl').style.display = canLevelSkill(player, slot) ? 'grid' : 'none';
        el.querySelector('.pips').textContent = '●'.repeat(level);
        el.title = `${sk.name}: ${sk.desc || ''}`;
      }
      if (active?.aiming) {
        const sp = spec(active.slot), pt = { x: player.pos.x + active.dir.x * (sp.range || 0) * active.f, y: player.pos.y + active.dir.y * (sp.range || 0) * active.f };
        indicators.show(sp, player.pos, active.dir, pt, active.cancel);
      }
    },
  };
}
void T;
