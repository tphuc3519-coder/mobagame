import { project } from '../render/project.js';
import { canSee } from '../sim/vision.js';

const DMG = { physical: '#ffd6a0', magic: '#a8c8ff', true: '#ffffff' };

/** Canvas 2D phủ trên cảnh: joystick, thanh máu trên đầu, số sát thương bay, thanh máu/mana của mình, debug. */
export function createHud(canvas, input) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const floats = [];
  const resize = () => { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; };
  addEventListener('resize', resize); resize();

  const bar = (x, y, bw, bh, pct, fill, back = 'rgba(10,12,24,0.75)') => {
    ctx.fillStyle = back; ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = fill; ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, pct)), bh);
  };

  return {
    handle(events, world) {
      for (const ev of events) {
        const e = world.byId(ev.id);
        if (!e) continue;
        if (ev.type === 'damage') floats.push({ x: e.pos.x + (Math.random() - 0.5) * 40, y: e.pos.y, t: 0, text: ev.shield ? 'Khiên' : String(ev.amount), color: DMG[ev.dmgType] || '#fff', size: ev.amount > 150 ? 22 : 16 });
        else if (ev.type === 'heal') floats.push({ x: e.pos.x, y: e.pos.y, t: 0, text: '+' + ev.amount, color: '#8affb0', size: 16 });
      }
    },
    draw(world, cam, player, enemy, debugLines) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // thanh máu trên đầu
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const e of world.entities) {
        if (!e.alive || e.noTarget || (e.team !== player.team && e.statuses.some((s) => s.kind === 'stealth')) || !canSee(player.team, e)) continue;
        const p = project(cam, e.pos.x, e.kind === 'hero' || e.kind === 'dummy' ? 230 : e.height, e.pos.y, w, h); if (!p.visible) continue;
        const isHero = e.kind === 'hero', col = e.id === player.id ? '#52d860' : e.team === player.team ? '#38b8ff' : '#ff4a3a';
        if (isHero) { // kiểu Liên Quân: huy hiệu cấp lục giác bên trái, thanh máu chia vạch mỗi 250 HP, tên ở trên
          const bw = 104, bh = 11, x0 = p.x - bw / 2 + 10, y0 = p.y - 8;
          ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 9);
          ctx.fillStyle = e.invulnerable ? '#9a9aa8' : col; ctx.fillRect(x0, y0, bw * Math.max(0, Math.min(1, e.hp / e.stats.maxHp)), bh);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x0 + bw * Math.min(1, e.hp / e.stats.maxHp), y0, Math.min(bw, bw * sh / e.stats.maxHp), bh); }
          ctx.fillStyle = 'rgba(8,10,20,0.75)'; for (let v = 250; v < e.stats.maxHp; v += 250) { const tx = x0 + bw * v / e.stats.maxHp; ctx.fillRect(tx, y0, v % 1000 ? 1 : 2, v % 1000 ? bh * 0.55 : bh); }
          ctx.fillStyle = '#4a9cff'; ctx.fillRect(x0, y0 + bh + 2, bw * (e.mana / Math.max(1, e.stats.maxMana || 1)), 3);
          const hx = x0 - 12, hy = y0 + bh / 2 + 2, hr = 11; // huy hiệu cấp
          ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr); } ctx.closePath();
          ctx.fillStyle = '#141830'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '800 12px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(String(e.level), hx, hy + 0.5);
          ctx.textBaseline = 'bottom'; ctx.font = '700 12px system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(e.data.name, p.x + 10, y0 - 4); ctx.fillStyle = e.team === player.team ? '#e8f4ff' : '#ffd8d0'; ctx.fillText(e.data.name, p.x + 10, y0 - 4);
          ctx.font = '600 11px system-ui, sans-serif';
        } else {
          const bw = e.structure ? 120 : e.kind === 'minion' ? 44 : e.kind === 'dummy' ? 74 : 84;
          bar(p.x - bw / 2, p.y - 6, bw, e.kind === 'minion' ? 4 : 7, e.hp / e.stats.maxHp, e.invulnerable ? '#9a9aa8' : col);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) bar(p.x - bw / 2, p.y - 6, bw, 3, sh / e.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
        }
        if (e.invulnerable) { ctx.fillStyle = '#c8c8d8'; ctx.fillText('BẤT TỬ', p.x, p.y - (isHero ? 26 : 10)); }
        // hiệu ứng khống chế trên đầu
        const cc = e.statuses.find((s) => ['stun', 'knockup', 'root', 'taunt', 'silence'].includes(s.kind));
        if (cc) { ctx.fillStyle = '#ffd23a'; ctx.font = '800 13px system-ui, sans-serif'; ctx.fillText({ stun: 'CHOÁNG', knockup: 'HẤT TUNG', root: 'TRÓI', taunt: 'KHIÊU KHÍCH', silence: 'CÂM' }[cc.kind], p.x, p.y - (isHero ? 40 : 24)); }
      }
      // số bay
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.t += 1 / 60;
        if (f.t > 0.9) { floats.splice(i, 1); continue; }
        const p = project(cam, f.x, 200 + f.t * 120, f.y, w, h);
        ctx.globalAlpha = Math.min(1, (0.9 - f.t) * 2.5); ctx.font = `800 ${f.size}px system-ui, sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, p.x, p.y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, p.x, p.y); ctx.globalAlpha = 1;
      }
      // thanh máu / mana của mình
      const bx = 16, by = h - 44, bw = Math.min(240, w * 0.26);
      bar(bx, by, bw, 14, player.hp / player.stats.maxHp, '#3ecf74');
      const sh = player.shields.reduce((a, s) => a + s.amount, 0);
      if (sh > 0) bar(bx, by, bw, 5, sh / player.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
      bar(bx, by + 19, bw, 8, player.mana / Math.max(1, player.stats.maxMana), '#4a9cff');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 11px ui-monospace, monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.round(player.hp)} / ${Math.round(player.stats.maxHp)}    Cấp ${player.level}${player.heat ? '    Nhiệt ' + player.heat : ''}`, bx + 6, by + 7);
      { // tỉ số + đồng hồ ở giữa trên (07 §9)
        const sec = Math.floor(world.tick / 30), cx = w / 2, ty = 10;
        ctx.fillStyle = 'rgba(12,15,32,0.72)'; ctx.beginPath(); ctx.roundRect(cx - 92, ty, 184, 30, 15); ctx.fill();
        ctx.textBaseline = 'middle'; ctx.font = '800 17px system-ui, sans-serif';
        const kills = (team) => world.entities.reduce((a, h) => a + (h.kind === 'hero' && h.team === team ? h.kills : 0), 0); // tổng hạ gục của đội
        ctx.textAlign = 'right'; ctx.fillStyle = '#5fe3d0'; ctx.fillText(String(kills(player.team)), cx - 40, ty + 15);
        ctx.textAlign = 'left'; ctx.fillStyle = '#ff6a5a'; ctx.fillText(String(kills(1 - player.team)), cx + 40, ty + 15);
        ctx.textAlign = 'center'; ctx.fillStyle = '#f3e9d6'; ctx.font = '700 13px ui-monospace, monospace';
        ctx.fillText(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, cx, ty + 15);
        if (!player.alive && player.respawnTick) {
          const left = Math.max(0, Math.ceil((player.respawnTick - world.tick) / 30));
          ctx.fillStyle = 'rgba(10,6,12,0.55)'; ctx.fillRect(0, 0, w, h);
          ctx.font = '800 26px system-ui, sans-serif'; ctx.fillStyle = '#ffb84d'; ctx.fillText(`Hồi sinh sau ${left}s`, cx, h * 0.42);
        }
      }
      // joystick
      const { js, R } = input;
      if (js.active) {
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(243,233,214,0.5)'; ctx.fillStyle = 'rgba(15,18,36,0.35)';
        ctx.beginPath(); ctx.arc(js.ox, js.oy, R, 0, 7); ctx.fill(); ctx.stroke();
        const dx = js.x - js.ox, dy = js.y - js.oy, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
        ctx.fillStyle = 'rgba(255,184,77,0.85)';
        ctx.beginPath(); ctx.arc(js.ox + dx * k, js.oy + dy * k, 34, 0, 7); ctx.fill();
      }
      if (debugLines?.length) {
        ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#f3e9d6'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        debugLines.forEach((t, i) => ctx.fillText(t, 260, 56 + i * 15));
      }
    },
  };
}
