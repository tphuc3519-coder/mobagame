// Tín hiệu (ping) 5v5 — 07 §9: nút cờ cạnh bản đồ nhỏ mở vòng 4 lựa chọn (Tấn công / Tập hợp / Rút lui / Cẩn thận); chọn một loại rồi chạm
// bản đồ nhỏ hoặc mặt đất để đặt (Tấn công chạm trúng tướng / trụ / quái địch thì đánh dấu luôn mục tiêu đó); chạm lại lựa chọn đang chọn =
// tín hiệu ngay chỗ tướng mình. Chạm đúp bản đồ nhỏ = tín hiệu nhanh loại dùng gần nhất. Máy tính: G mở vòng, Z/X/C/V chọn loại.
// Tín hiệu đi vào mô phỏng bằng lệnh { type: 'ping' } (sim/pings.js) nên bot đồng đội đọc được; ở đây chỉ vẽ: vòng trên đất + huy hiệu nổi,
// vòng loang trên bản đồ nhỏ, dòng chữ báo bên trái ("Kitewing: Tập hợp tại Hang Long Ngư").
import * as THREE from 'three';
import { project } from '../render/project.js';
import { floorAt } from '../render/env/floor.js';
import { play } from '../audio/audio.js';
import { canSee } from '../sim/vision.js';
import { PING, PING_KINDS, PING_ORDER } from '../data/signals.js';
import { placeName } from './pingText.js';
import { on, track } from '../core/scope.js';

const KEYS = { z: 'attack', x: 'gather', c: 'retreat', v: 'careful' };
const SND = { attack: ['ui_lock', 1.2], gather: ['horn', 1.15], retreat: ['ui_back', 1], careful: ['ui_tick', 0.8] };
const CSS = `
#pingBtn{position:fixed;z-index:5;left:calc(max(8px,env(safe-area-inset-left)) + var(--mmw,140px) + 6px);top:calc(max(8px,env(safe-area-inset-top)) + var(--mmh,140px) - 44px);
  width:44px;height:44px;border-radius:50%;border:2px solid #c9b47a;background:radial-gradient(circle at 50% 35%,#2a3050,#11142a);display:grid;place-items:center;padding:0;touch-action:none}
#pingBtn svg{width:24px;height:24px} #pingBtn.on{box-shadow:0 0 12px #ffd27acc;border-color:#ffd27a}
#pingWheel{position:fixed;z-index:6;left:0;top:0;width:0;height:0;pointer-events:none}
#pingWheel button{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:2px solid var(--c);background:#11142aee;color:#fff;display:grid;place-items:center;padding:0;pointer-events:auto;touch-action:none}
#pingWheel button.armed{background:var(--c);box-shadow:0 0 14px var(--c)} #pingWheel button svg{width:22px;height:22px}
#pingWheel small{position:absolute;top:44px;left:50%;transform:translateX(-50%);font:700 10px 'Be Vietnam Pro',system-ui,sans-serif;white-space:nowrap;color:#f3e9d6;text-shadow:0 1px 2px #000}
#pingHint{position:fixed;z-index:6;left:50%;top:max(54px,calc(env(safe-area-inset-top) + 48px));transform:translateX(-50%);font:700 13px 'Be Vietnam Pro',system-ui,sans-serif;color:#fff;background:#11142acc;border:1px solid #c9b47a88;border-radius:14px;padding:4px 12px;pointer-events:none}
#pingFeed{position:fixed;z-index:4;left:calc(max(8px,env(safe-area-inset-left)));top:calc(max(8px,env(safe-area-inset-top)) + var(--mmh,140px) + 80px);width:min(300px,38vw);pointer-events:none;display:flex;flex-direction:column;gap:3px}
@media (min-height:560px){#pingFeed{top:calc(max(8px,env(safe-area-inset-top)) + var(--mmh,140px) + 146px)}}
body.shop-right #pingFeed{top:calc(max(8px,env(safe-area-inset-top)) + var(--mmh,140px) + 8px)}
#pingFeed div{font:600 12px 'Be Vietnam Pro',system-ui,sans-serif;color:#f3e9d6;text-shadow:0 1px 2px #000;background:linear-gradient(90deg,#0b0e1ecc,#0b0e1e00);padding:2px 6px;border-radius:6px;transition:opacity .5s}
#pingFeed div i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0} #pingFeed div b{color:#9fd8ff} #pingFeed div b.me{color:#ffd27a} #pingFeed div.fail{color:#aab;font-style:italic}`;
/** Biểu tượng từng loại (SVG trong nút, vẽ lại bằng canvas trên huy hiệu). */
const ICON = {
  attack: 'M5 5l14 14M19 5L5 19', gather: 'M12 3v9M12 12l-5 5M12 12l5 5M6 21h12', retreat: 'M12 4v14M6 12l6 6 6-6', careful: 'M12 4v10M12 18v2',
};
const svg = (k, c = '#fff') => `<svg viewBox="0 0 24 24"><path d="${ICON[k]}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FLAG = '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6" fill="#ffd27a" stroke="#ffd27a" stroke-width="2" stroke-linejoin="round"/></svg>';

export function createPingHud({ world, player, map, cam, minimap, hudCanvas }) {
  if (!document.getElementById('pingCss')) { const st = document.createElement('style'); st.id = 'pingCss'; st.textContent = CSS; document.head.appendChild(st); }
  const btn = document.createElement('button'); btn.id = 'pingBtn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Tín hiệu'); btn.innerHTML = FLAG;
  const wheel = document.createElement('div'); wheel.id = 'pingWheel'; wheel.hidden = true;
  const hint = document.createElement('div'); hint.id = 'pingHint'; hint.hidden = true;
  const feed = document.createElement('div'); feed.id = 'pingFeed';
  document.body.append(track(btn), track(wheel), track(hint), track(feed));
  PING_ORDER.forEach((k, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.style.setProperty('--c', PING_KINDS[k].color); b.innerHTML = svg(k) + `<small>${PING_KINDS[k].name}</small>`; wheel.appendChild(b); b.dataset.i = i; });

  let open = false, armed = null, last = 'gather', idle = 0, lastMm = { t: -9, x: 0, y: 0 }, pend = null;
  const send = (kind, x, y, target = null) => { world.command(player.id, { type: 'ping', kind, x: Math.round(x), y: Math.round(y), target }); last = kind; close(); };
  function layout() { // vòng 4 lựa chọn xoè quanh nút cờ (−40° … 80°, bán kính 76)
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    [...wheel.children].forEach((b, i) => { const a = (-40 + i * 40) * Math.PI / 180; b.style.left = cx + Math.cos(a) * 76 + 'px'; b.style.top = cy + Math.sin(a) * 76 + 'px'; });
  }
  function setOpen(v) { open = v; wheel.hidden = !v; btn.classList.toggle('on', v); if (v) { layout(); idle = performance.now(); } else arm(null); }
  function arm(k) { armed = k; for (const b of wheel.children) b.classList.toggle('armed', b.dataset.k === k); hint.hidden = !k; if (k) hint.textContent = `${PING_KINDS[k].name}: chạm bản đồ nhỏ hoặc mặt đất`; idle = performance.now(); }
  const close = () => setOpen(false);
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); });
  wheel.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); const k = b.dataset.k; if (armed === k) send(k, player.pos.x, player.pos.y); else arm(k); });
  on(window, 'keydown', (e) => { if (e.repeat || e.target.closest?.('input,textarea')) return; const k = e.key.toLowerCase(); if (k === 'g') setOpen(!open); else if (open && KEYS[k]) arm(KEYS[k]); });

  // chạm bản đồ nhỏ / mặt đất: bắt ở pha capture trên window (trước camLook / joystick) và chỉ chặn khi thật sự dùng cú chạm
  const mmPoint = (e) => { const r = minimap.canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(map.w, (e.clientX - r.left) / r.width * map.w)), y: Math.max(0, Math.min(map.h, (e.clientY - r.top) / r.height * map.h)), r }; };
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function groundAt(cx, cy) { ray.setFromCamera({ x: (cx / innerWidth) * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, cam.camera); return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : null; }
  const enemyMarks = (u) => u.alive && !u.noTarget && u.team !== player.team && (u.kind === 'hero' || u.kind === 'tower' || u.kind === 'core' || u.kind === 'monster') && canSee(player.team, u);
  function unitAtScreen(cx, cy) { // tướng / trụ / quái địch dưới ngón tay (70 px)
    let best = null, bd = 70;
    for (const u of world.entities) { if (!enemyMarks(u)) continue; const p = project(cam.camera, u.pos.x, 120 + floorAt(map, u.pos.x, u.pos.y), u.pos.y, innerWidth, innerHeight); if (!p.visible) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  function unitAtMinimap(pt) { // biểu tượng tướng / trụ / nhà chính địch trong 14 px trên bản đồ nhỏ
    const k = pt.r.width / map.w; let best = null, bd = 14;
    for (const u of world.entities) { if (!enemyMarks(u) || u.kind === 'monster') continue; const d = Math.hypot(u.pos.x - pt.x, u.pos.y - pt.y) * k; if (d < bd) { bd = d; best = u; } }
    return best;
  }
  const place = (kind, p, u) => (u && kind === 'attack' ? send(kind, u.pos.x, u.pos.y, u.id) : send(kind, p.x, p.y));
  on(window, 'pointerdown', (e) => {
    const onMm = e.target === minimap.canvas;
    if (onMm) {
      const pt = mmPoint(e), t = performance.now() / 1000;
      if (armed) { place(armed, pt, armed === 'attack' && unitAtMinimap(pt)); e.stopPropagation(); e.preventDefault(); return; }
      if (t - lastMm.t < 0.32 && Math.hypot(e.clientX - lastMm.x, e.clientY - lastMm.y) < 21) { send(last, pt.x, pt.y); lastMm.t = -9; e.stopPropagation(); e.preventDefault(); return; } // chạm đúp: tín hiệu nhanh
      lastMm = { t, x: e.clientX, y: e.clientY }; return;
    }
    if (!armed || (e.target !== hudCanvas && e.target.id !== 'world')) return;
    if (e.clientX > innerWidth * 0.45) { const g = groundAt(e.clientX, e.clientY); if (g) place(armed, g, armed === 'attack' && unitAtScreen(e.clientX, e.clientY)); e.stopPropagation(); e.preventDefault(); return; }
    pend = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; // vùng cần di chuyển: không chặn ngay (joystick vẫn chạy), thả tay nhanh + ít rê mới là chạm đặt tín hiệu
  }, true);
  on(window, 'pointerup', (e) => {
    if (!pend || e.pointerId !== pend.id) return; const p = pend; pend = null;
    if (armed && performance.now() - p.t < 280 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 14) { const g = groundAt(e.clientX, e.clientY); if (g) place(armed, g, armed === 'attack' && unitAtScreen(e.clientX, e.clientY)); }
  }, true);

  function say(html, cls = '') { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; feed.appendChild(d); while (feed.children.length > 4) feed.firstChild.remove(); setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 520); }, 5000); }
  const nameOf = (u) => (u ? (u.playerName || u.data?.name || '?') : '?');
  const esc = (s) => String(s).replace(/[<>&"]/g, '');
  const LINE = { attack: (p, t) => (t ? `Tấn công ${t}!` : `Tấn công tại ${p}!`), gather: (p) => `Tập hợp tại ${p}`, retreat: (p) => `Rút lui khỏi ${p}!`, careful: (p) => `Cẩn thận, mất dấu địch ở ${p}` };

  return {
    handle(events) {
      for (const ev of events) {
        if (ev.type === 'ping' && ev.team === player.team) {
          const who = world.byId(ev.id), tgt = ev.target != null ? world.byId(ev.target) : null;
          const where = esc(placeName(world, player.team, { x: ev.x, y: ev.y }, tgt));
          say(`<i style="background:${PING_KINDS[ev.kind].color}"></i><b class="${ev.id === player.id ? 'me' : ''}">${esc(nameOf(who))}:</b> ${LINE[ev.kind](where, tgt ? esc(nameOf(tgt)) : null)}`);
          const [s, rate] = SND[ev.kind]; play(s, { vol: ev.bot ? 0.55 : 0.9, rate, gap: 0.2 });
        } else if (ev.type === 'pingAck' && ev.team === player.team) {
          const names = (ev.bots || []).map((id) => esc(nameOf(world.byId(id)))), more = names.length > 2 ? ` +${names.length - 2}` : '';
          say(`<i style="background:${PING_KINDS[ev.kind].color}"></i><b>${names.slice(0, 2).join(', ')}${more}:</b> ${ev.kind === 'attack' ? 'Đang tới!' : 'Tới ngay!'}`);
        } else if (ev.type === 'pingFail' && ev.id === player.id && ev.reason === 'rate') { say('Phát tín hiệu chậm lại một chút', 'fail'); play('ui_error', { vol: 0.5 }); }
      }
    },
    /** Vẽ vòng + huy hiệu trên đất (lên canvas HUD, sau hud.draw) và giữ bản đồ nhỏ vẽ vòng loang (minimap.overlay). */
    draw() {
      if (open && performance.now() - idle > 4000) close();
      const ctx = hudCanvas.getContext('2d'), w = hudCanvas.clientWidth, h = hudCanvas.clientHeight, k = hudCanvas.width / Math.max(1, w), T = world.tick;
      ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
      for (const p of world.pings) {
        if (p.team !== player.team) continue;
        const age = (T - p.tick) / 30, left = PING.show - age; if (left <= 0) continue;
        const col = PING_KINDS[p.kind].color, a = Math.min(1, left / 0.5), gy = floorAt(map, p.x, p.y), tgt = p.target != null ? world.byId(p.target) : null;
        const pos = tgt?.alive ? tgt.pos : p;
        ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.strokeStyle = col;
        const ring = (r, al) => { ctx.globalAlpha = a * al; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const an = (i / 24) * Math.PI * 2, q = project(cam.camera, pos.x + Math.cos(an) * r, gy + 4, pos.y + Math.sin(an) * r, w, h); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke(); };
        ring(110, 0.55); for (const off of [0, 0.5]) { const f = ((age / 0.9) + off) % 1; ring(110 + 150 * f, 0.6 * (1 - f)); }
        const hy = tgt?.alive ? (tgt.kind === 'hero' ? 400 : (tgt.height || 300) + 160) : 240, bob = Math.sin(age * 5) * 12;
        let q = project(cam.camera, pos.x, gy + hy + bob, pos.y, w, h), off = !q.visible || q.x < 30 || q.y < 30 || q.x > w - 30 || q.y > h - 30;
        if (off) { const cx = w / 2, cy = h / 2, dx = q.x - cx, dy = q.y - cy, s = Math.min((w / 2 - 30) / Math.abs(dx || 1), (h / 2 - 30) / Math.abs(dy || 1)); q = { x: cx + dx * s, y: cy + dy * s }; }
        const pop = 1 + 0.6 * Math.max(0, 1 - age / 0.18), R = 17 * pop;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, Math.PI * 2); ctx.fillStyle = '#10142a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
        ctx.save(); ctx.translate(q.x - 12 * pop * 0.8, q.y - 12 * pop * 0.8); ctx.scale(pop * 0.8, pop * 0.8); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.lineCap = ctx.lineJoin = 'round'; ctx.stroke(new Path2D(ICON[p.kind])); ctx.restore();
        if (off) { const an = Math.atan2(q.y - h / 2, q.x - w / 2); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(an) * (R + 10), q.y + Math.sin(an) * (R + 10)); ctx.lineTo(q.x + Math.cos(an + 2.6) * (R + 2), q.y + Math.sin(an + 2.6) * (R + 2)); ctx.lineTo(q.x + Math.cos(an - 2.6) * (R + 2), q.y + Math.sin(an - 2.6) * (R + 2)); ctx.fill(); }
      }
      ctx.restore();
    },
    /** Vẽ trên bản đồ nhỏ (gọi trong minimap.draw): hai vòng loang + huy hiệu nhỏ. */
    minimap(ctx, wx, wy) {
      const T = world.tick;
      for (const p of world.pings) {
        if (p.team !== player.team) continue;
        const age = (T - p.tick) / 30; if (age > PING.show) continue;
        const col = PING_KINDS[p.kind].color, x = wx(p.x), y = wy(p.y);
        ctx.lineWidth = 2; ctx.strokeStyle = col;
        for (const off of [0, 0.5]) { const f = ((age / 0.9) + off) % 1; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(x, y, 5 + 12 * f, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = '#10142a'; ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(x - 5, y - 5); ctx.scale(10 / 24, 10 / 24); ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke(new Path2D(ICON[p.kind])); ctx.restore();
      }
    },
    get armed() { return armed; },
    open: () => setOpen(true),
    arm,
  };
}
