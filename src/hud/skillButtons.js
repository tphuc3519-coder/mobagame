// Nút Đánh + K1–K3: chạm nhanh tự ngắm; kéo để chỉ báo hướng/điểm; kéo ra xa (vùng Huỷ) để huỷ (04 §2, 07 §9).
// Theo Cài đặt (core/prefs.js; đọc lúc dùng / onPref nên đổi giữa trận áp dụng ngay): castMode 'auto' (Tung chiêu tự nhắm) chạm là ra chiêu
// tự ngắm, không vòng ngắm; vòng ngắm theo aimSens / aimAt / cancelBy (aimPad.js); skillTips: giữ yên ≥ 0,35s xem mô tả chiêu (thả ra không
// dùng; kéo tiếp thì vẫn ngắm như thường); skillNames: tên chiêu dưới K1–K3; cdDecimal: số lẻ khi hồi chiêu dưới 10s (tắt: làm tròn lên giây);
// atkMode: 'farm' có thêm nút Ăn lính + Đẩy trụ, 'auto' / 'manual' chỉ một nút Đánh (phím K/L vẫn dùng được); preciseAtk (Đánh thường chính xác):
// kéo nút Đánh về phía một địch (vòng ngắm như kỹ năng) — thả ra thì đánh + khoá nó. Khoá / chạm chọn địch / dấu / luật chọn mục tiêu: atkTarget.js.
import { lv } from '../data/heroes/_levels.js';
import { nearestEnemy } from '../sim/targeting.js';
import { canLevelSkill } from '../sim/stats.js';
import { T } from '../sim/util.js';
import { heroSkillArt, fistArt } from './heroArt.js';
import { THEMES } from '../render/vfx/library.js';
import { DRAG_MIN, dragMax, aimOrigin, isCancel, aimUI, setAimFocus, lastAim } from './aimPad.js';
import { ICON } from './uiIcons.js';
import { showTip, hideTip } from './tip.js';
import { skillDesc } from '../ui/skilltext.js';
import { pref, onPref } from '../core/prefs.js';
import { createAtkTarget } from './atkTarget.js';

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

const MINION_IC = ICON.minion(), TOWER_IC = ICON.tower(); // nút ăn lính / đẩy trụ (uiIcons.js)
const SLOTS = ['s1', 's2', 's3'];
const HOLD = 350, PRECISE = 200; // giữ yên lâu chừng này (ms) thì hiện mô tả chiêu; kéo nút Đánh chọn địch trong tầm đánh + PRECISE

/** camera / input / views (game.js): chạm chọn địch trong cảnh 3D và dấu mục tiêu (atkTarget.js); thiếu thì các phần đó tắt. */
export function createSkillButtons(root, { world, player, indicators, camera = null, input = null, views = null }) {
  const tc = THEMES[player.heroId]?.col, theme = tc != null ? '#' + tc.toString(16).padStart(6, '0') : '#ffb84d'; // màu chủ đề tướng cho icon kỹ năng
  root.innerHTML = `
    <button class="sb atk" data-k="atk" aria-label="Đánh">${fistArt()}</button>
    <button class="sb amode" data-k="minion" aria-label="Ăn lính" title="Ăn lính: đánh lính máu thấp nhất trong tầm (kết liễu lấy vàng)">${MINION_IC}</button>
    <button class="sb amode" data-k="tower" aria-label="Đẩy trụ" title="Đẩy trụ: chỉ đánh trụ/nhà chính trong tầm">${TOWER_IC}</button>
    ${SLOTS.map((s, i) => `<button class="sb sk" data-k="${s}" aria-label="${player.data.skills[s]?.name || 'K' + (i + 1)}"><span class="clip">${player.data.skills[s] ? heroSkillArt(player.heroId, s, player.data.skills[s], theme) : ''}<span class="nm">K${i + 1}</span><i class="cd"></i><b class="cdt"></b></span><em class="lvl" data-up="${s}">+</em><svg class="lvring" viewBox="0 0 100 100" aria-hidden="true"></svg><small class="sknm">${player.data.skills[s]?.name || ''}</small></button>`).join('')}
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
  const tipInfo = (slot) => { const sk = spec(slot), level = player.skillLevels[slot]; return { title: sk.name, sub: `K${SLOTS.indexOf(slot) + 1} · ${level ? `cấp ${level}` : 'chưa học'}`, body: skillDesc(sk) }; };

  /** Tự ngắm khi chạm nhanh: địch gần nhất trong tầm, không có thì hướng đang nhìn. */
  function autoAim(slot) {
    const sp = spec(slot), range = rangeOf(sp) + 100;
    const t = nearestEnemy(world, player, range);
    const d = t ? { x: t.pos.x - player.pos.x, y: t.pos.y - player.pos.y } : facingDir();
    const l = Math.hypot(d.x, d.y) || 1;
    if (sp.aim === 'point') { const f = t ? Math.min(l, sp.range) : sp.range * 0.7; return { x: player.pos.x + (d.x / l) * f, y: player.pos.y + (d.y / l) * f }; }
    if (sp.aim === 'direction' || sp.aim === 'target') return { x: d.x / l, y: d.y / l }; // khoá mục tiêu: hướng để chọn (sim chọn tướng gần hướng nhất)
    return null;
  }
  const cast = (slot, aim) => world.command(player.id, { type: 'cast', slot, aim });

  for (const slot of SLOTS) {
    const el = btn(slot);
    el.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.up || actives.has(slot)) return; // nút đã có ngón khác giữ
      e.preventDefault(); el.setPointerCapture?.(e.pointerId);
      const r = el.getBoundingClientRect(), a = { slot, id: e.pointerId, ...aimOrigin(e, r), aiming: false, dir: facingDir(), f: 1, cancel: false, auto: pref('castMode') === 'auto', tip: false, timer: 0 };
      actives.set(slot, a); el.classList.add('down');
      if (a.auto) cast(slot, autoAim(slot)); // tung chiêu tự nhắm (tân thủ): chạm là ra, không vòng ngắm
      if (pref('skillTips')) a.timer = setTimeout(() => { if (actives.get(slot) === a && !a.aiming) { a.tip = true; showTip(tipInfo(slot), r); } }, HOLD);
    });
    el.addEventListener('pointermove', (e) => {
      const a = actives.get(slot); if (!a || e.pointerId !== a.id || a.auto) return;
      const dx = e.clientX - a.cx, dy = e.clientY - a.cy, l = Math.hypot(dx, dy), sp = spec(slot);
      if (l > DRAG_MIN && sp.aim !== 'none') { a.aiming = true; a.dir = { x: dx / l, y: dy / l }; a.f = Math.min(1, l / dragMax()); clearTimeout(a.timer); if (a.tip) { a.tip = false; hideTip(); } }
      a.cancel = a.aiming && isCancel(a, e.clientX, e.clientY);
      if (a.aiming) { shown = a; cancelEl.hidden = !a.cancel || pref('cancelBy') === 'distance'; aimUI(a); } // huỷ theo khoảng cách: chữ "Thả để huỷ" nằm trên vòng ngắm
    });
    const end = (e) => {
      const a = actives.get(slot); if (!a || e.pointerId !== a.id) return;
      const sp = spec(slot); actives.delete(slot); el.classList.remove('down'); clearTimeout(a.timer);
      if (a.tip) hideTip();
      if (shown === a) hideAim();
      if (a.cancel || a.auto || a.tip) return; // huỷ / đã ra chiêu lúc chạm / chỉ xem mô tả
      let aim = null;
      if (!a.aiming) aim = autoAim(slot);
      else if (sp.aim === 'point') aim = { x: player.pos.x + a.dir.x * sp.range * a.f, y: player.pos.y + a.dir.y * sp.range * a.f };
      else if (sp.aim === 'direction' || sp.aim === 'target') aim = a.dir;
      if (a.aiming) lastAim.dir = { ...a.dir }; // Chớp Bước chạm nhanh theo hướng chiêu vừa ngắm (flashDir = 'skill')
      cast(slot, aim);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.querySelector('.lvl').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); world.command(player.id, { type: 'levelSkill', slot }); });
  }
  // Nút Đánh / Ăn lính / Đẩy trụ: giữ để đánh liên tục theo chế độ của nút (heldMode: null = Đánh). atkAim: lượt kéo nút Đánh khi bật
  // Đánh thường chính xác; burst: thả ra sau khi chọn được địch trong tầm thì còn đánh tới khi ra một đòn (hoặc hết một nhịp đánh).
  let atkHeld = false, heldMode = null, atkAim = null, burst = null;
  /** Lệnh đánh; kèm mục tiêu ưu tiên (mặc định: mục tiêu khoá) — mô phỏng đánh nó trước khi nó còn trong tầm. */
  function attackCmd(on, mode = null, prefer = tgt.lockId()) { world.command(player.id, on ? { type: 'attack', on: true, mode, preferTarget: prefer } : { type: 'attack', on: false }); }
  const tgt = createAtkTarget({ world, player, camera, input, views, indicators, onChange: () => { if (atkHeld && heldMode === null && !atkAim?.cand) attackCmd(true); } }); // khoá đổi lúc đang giữ Đánh: gửi lại
  const inRange = (t) => Math.hypot(t.pos.x - player.pos.x, t.pos.y - player.pos.y) - t.radius <= player.stats.range;
  const set = (o, k, v) => { if (o[k] !== v) o[k] = v; };
  for (const [k, mode] of [['atk', null], ['minion', 'minion'], ['tower', 'tower']]) {
    const b = btn(k);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down'); atkHeld = true; heldMode = mode; burst = null; attackCmd(true, mode);
      if (!mode && !atkAim) atkAim = { id: e.pointerId, ...aimOrigin(e, b.getBoundingClientRect()), aiming: false, dir: facingDir(), f: 1, cancel: false, cand: null };
    });
    const end = (e) => {
      b.classList.remove('down');
      let keep = false;
      if (!mode && atkAim?.id === e.pointerId) {
        const a = atkAim; atkAim = null; tgt.preview(null);
        if (a.aiming) {
          aimUI(null, 'atk'); if (!shown?.aiming) indicators.hide();
          if (!a.cancel && e.type === 'pointerup' && player.alive && pref('preciseAtk')) { // thả: khoá địch gần hướng kéo nhất (không có thì bỏ khoá), trong tầm thì đánh nó
            const t = tgt.pickDir(a.dir, player.stats.range + PRECISE);
            tgt.setLock(t ? t.id : null);
            if (t && inRange(t) && heldMode === null) { burst = { n: player.atkIndex, until: world.tick + Math.ceil(30 / player.stats.atkSpeed) + 8 }; attackCmd(true, null, t.id); keep = true; }
          }
        }
      }
      if (heldMode !== mode) return; atkHeld = false; heldMode = null; if (!keep) attackCmd(false);
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }
  btn('atk').addEventListener('pointermove', (e) => { // Đánh thường chính xác: kéo nút Đánh như nút kỹ năng
    const a = atkAim; if (!a || e.pointerId !== a.id || !pref('preciseAtk') || !player.alive) return;
    const dx = e.clientX - a.cx, dy = e.clientY - a.cy, l = Math.hypot(dx, dy);
    if (l > DRAG_MIN) { a.aiming = true; a.dir = { x: dx / l, y: dy / l }; a.f = Math.min(1, l / dragMax()); }
    if (a.aiming) { a.cancel = isCancel(a, e.clientX, e.clientY); aimUI(a, 'atk'); }
  });
  // atkMode: 'farm' hiện Ăn lính + Đẩy trụ; 'auto' / 'manual' ẩn (đang giữ nút vừa ẩn thì thả). skillNames: tên chiêu dưới nút.
  const applyAtkMode = () => {
    const farm = pref('atkMode') === 'farm';
    for (const k of ['minion', 'tower']) set(btn(k), 'hidden', !farm);
    if (!farm && heldMode) { btn(heldMode).classList.remove('down'); atkHeld = false; heldMode = null; attackCmd(false); }
  };
  const applyNames = () => root.classList.toggle('names', !!pref('skillNames'));
  applyAtkMode(); applyNames();
  onPref((k) => { if (k === 'atkMode') applyAtkMode(); else if (k === 'skillNames') applyNames(); });

  // bàn phím: J giữ để đánh, K ăn lính, L đẩy trụ, 1/2/3 (hoặc U/I/O) tung chiêu tự ngắm
  const KEYS = { 1: 's1', 2: 's2', 3: 's3', u: 's1', i: 's2', o: 's3' };
  addEventListener('keydown', (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'j' || k === ' ') attackCmd(true); else if (k === 'k' || k === 'l') attackCmd(true, k === 'k' ? 'minion' : 'tower'); else if (KEYS[k]) cast(KEYS[k], autoAim(KEYS[k])); });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (k === 'j' || k === ' ' || k === 'k' || k === 'l') attackCmd(false); });

  return {
    /** Mỗi khung hình: hồi chiêu, mana, nút cộng cấp, chỉ báo ngắm. */
    update() {
      const dec = pref('cdDecimal');
      for (const slot of SLOTS) {
        const el = btn(slot), sk = spec(slot), level = player.skillLevels[slot];
        const left = Math.max(0, (player.cooldowns[slot] - world.tick) / 30), total = level ? lv(sk.cooldown, level) : 1;
        const cost = level ? lv(sk.cost, level) : 0;
        // chỉ ghi DOM khi giá trị đổi (ghi mỗi khung làm trình duyệt tính lại bố cục liên tục → giật trên điện thoại)
        const c = el._c ||= { cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt'), lvl: el.querySelector('.lvl') };
        set(c.cd.style, 'transform', `scaleY(${level ? Math.min(1, Math.round((left / total) * 1000) / 1000) : 1})`);
        set(c.cdt, 'textContent', left > 0.05 ? String(left >= 10 || !dec ? Math.ceil(left) : left.toFixed(1)) : '');
        el.classList.toggle('nomana', level > 0 && player.mana < cost);
        el.classList.toggle('nocond', level > 0 && !!sk.canCast && !sk.canCast(player, world)); // chưa đủ điều kiện riêng (Ấn, Tầm Nhìn, máu dưới 30%…)
        el.classList.toggle('recast', player.recast?.slot === slot); // đang trong cửa sổ kích hoạt lại (đổi chỗ phân thân)
        el.classList.toggle('locked', !level); el.classList.toggle('cooling', left > 0.05);
        set(c.lvl.style, 'display', canLevelSkill(player, slot) ? 'grid' : 'none');
        const max = Array.isArray(sk.cooldown) ? sk.cooldown.length : 3;
        if (el._lv !== level) { const ring = el.querySelector('.lvring'); ring.innerHTML = levelRing(max, level, el._lv != null && level > el._lv); el._lv = level; }
        set(el, 'title', `${sk.name}: ${sk.desc || ''}`);
      }
      if (!player.alive && actives.size) { for (const a of actives.values()) { btn(a.slot).classList.remove('down'); clearTimeout(a.timer); if (a.tip) hideTip(); } actives.clear(); hideAim(); } // chết giữa lúc ngắm: bỏ ngắm
      if (atkHeld && player.alive && !player.attacking) attackCmd(true, heldMode, atkAim?.cand ?? tgt.lockId()); // giữ nút đánh qua lúc hồi sinh / bị khống chế
      if (atkAim?.aiming) { // kéo nút Đánh: địch gần hướng kéo nhất (dấu vàng); đang giữ thì đánh luôn nó khi nó trong tầm
        const a = atkAim, R = player.stats.range + PRECISE, t = a.cancel || !player.alive ? null : tgt.pickDir(a.dir, R), id = t ? t.id : null;
        if (id !== a.cand) { a.cand = id; tgt.preview(id); if (atkHeld && heldMode === null) attackCmd(true, null, id ?? tgt.lockId()); }
        if (player.alive) indicators.show({ type: 'allyTarget', aim: 'direction', range: R }, player.pos, a.dir, player.pos, a.cancel);
        else { a.aiming = false; aimUI(null, 'atk'); tgt.preview(null); if (!shown?.aiming) indicators.hide(); } // chết giữa lúc kéo
      }
      if (burst && !atkHeld && (player.atkIndex !== burst.n || world.tick > burst.until || !player.alive)) { burst = null; attackCmd(false); }
      if (shown?.aiming) {
        const sp = spec(shown.slot), pt = { x: player.pos.x + shown.dir.x * (sp.range || 0) * shown.f, y: player.pos.y + shown.dir.y * (sp.range || 0) * shown.f };
        indicators.show(sp, player.pos, shown.dir, pt, shown.cancel);
        setAimFocus('skill', pt, rangeOf(sp)); // góc quay theo định vị (camLook.js)
      }
      tgt.update();
    },
  };
}
void T;
