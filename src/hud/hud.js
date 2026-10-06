import { project } from '../render/project.js';
import { canSee } from '../sim/vision.js';
import { HERO_SCALE } from '../render/unitView.js';

// Số sát thương bay: 3 loại × thường/chí mạng. Màu lấy theo quy ước MOBA (vật lý cam, phép tím lam, chuẩn trắng);
// chí mạng: chữ to hơn, nghiêng, nảy mạnh, có hình nổ phía sau + biểu tượng (vật lý: vết chém, phép: sao lấp lánh, chuẩn: viên kim cương).
export const DMG_STYLE = {
  physical: { top: '#fff1cf', bot: '#ff9426', stroke: '#3c1500', burst: '#ff6a1c', icon: 'slash' },
  magic: { top: '#f0e4ff', bot: '#8f6bff', stroke: '#1c0d4c', burst: '#a64dff', icon: 'spark' },
  true: { top: '#ffffff', bot: '#d4dbef', stroke: '#2a2d3c', burst: '#e8f0ff', icon: 'gem', glow: true },
};
const HERO_BAR_Y = Math.round(250 * HERO_SCALE + 30); // thanh máu trên đầu tướng: trên đỉnh đầu tướng cao nhất (2,5 m × tỉ lệ trong trận)

/** Canvas 2D phủ trên cảnh: joystick, thanh máu trên đầu, số sát thương bay, thanh máu/mana của mình, debug. */
export function createHud(canvas, input, portraits = null) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const floats = [], banners = [], now = () => performance.now() / 1000;
  let death = null; // lý do bị hạ của mình: { name, heroId, kind, team, total }
  const resize = () => { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; };
  addEventListener('resize', resize); resize();

  const bar = (x, y, bw, bh, pct, fill, back = 'rgba(10,12,24,0.75)') => {
    ctx.fillStyle = back; ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = fill; ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, pct)), bh);
  };

  // Bảng bị hạ (giữa trên, dưới tỉ số): vòng đếm ngược hồi sinh + "Bị hạ bởi" chân dung/tên kẻ hạ. Màn hình xám do game.js bật lớp .dead.
  function drawDeath(world, player) {
    const leftT = Math.max(0, (player.respawnTick - world.tick) / 30), left = Math.ceil(leftT), d = death || { name: 'Bị hạ gục', total: leftT || 1 };
    const cx = w / 2, y = 10, pw = 268, ph = 58, x = cx - pw / 2;
    const g = ctx.createLinearGradient(x, 0, x + pw, 0); g.addColorStop(0, 'rgba(70,12,16,0.0)'); g.addColorStop(0.18, 'rgba(70,12,16,0.88)'); g.addColorStop(0.82, 'rgba(70,12,16,0.88)'); g.addColorStop(1, 'rgba(70,12,16,0.0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, pw, ph);
    ctx.fillStyle = 'rgba(255,190,110,0.55)'; ctx.fillRect(x + 30, y, pw - 60, 1.5); ctx.fillRect(x + 30, y + ph - 1.5, pw - 60, 1.5);
    // vòng đếm ngược
    const rx = x + 62, ry = y + ph / 2, rr = 22;
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 7); ctx.fillStyle = '#1a0c10'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, leftT / d.total)); ctx.strokeStyle = '#ffb84d'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff3d6'; ctx.font = `800 ${left >= 10 ? 21 : 24}px system-ui, sans-serif`; ctx.fillText(String(left), rx, ry + 1);
    // kẻ hạ
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffcf9a'; ctx.font = '700 11px system-ui, sans-serif'; ctx.fillText(d.self ? 'Tự hạ gục' : 'Bị hạ bởi', rx + 34, ry - 11);
    let nx = rx + 34;
    const col = d.team == null ? '#e8d48a' : d.team === player.team ? '#38b8ff' : '#ff4a3a';
    if (d.heroId && portraits) { portraits.draw(ctx, d.heroId, d.name, nx + 11, ry + 9, 11, col, {}); nx += 27; }
    ctx.font = '800 15px system-ui, sans-serif'; ctx.fillStyle = d.kind === 'monster' ? '#ffe8b0' : d.team === player.team ? '#cfe8ff' : '#ffd0c8';
    ctx.fillText(d.name, nx, ry + 9);
    ctx.fillStyle = 'rgba(255,230,190,0.75)'; ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Vẫn mua đồ được · giữ bản đồ nhỏ để xem trận', cx, y + ph + 10);
  }

  /** Một số bay: nảy lên (to rồi co lại), trôi lên, mờ dần. Chí mạng: hình nổ + biểu tượng + rung nhẹ lúc xuất hiện. */
  function drawFloat(f, p) {
    const k = f.t / f.life, pop = f.crit ? 1 + 1.1 * Math.max(0, 1 - f.t / 0.14) ** 2 : 1 + 0.45 * Math.max(0, 1 - f.t / 0.1) ** 2;
    const size = (f.crit ? f.size * 1.5 : f.size) * pop, x = p.x + f.drift * Math.sqrt(k) + (f.crit && f.t < 0.16 ? Math.sin(f.t * 120) * 3 : 0), y = p.y;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 3.2, f.t * 30)); ctx.translate(x, y); ctx.rotate(f.crit ? -0.12 + f.tilt * 0.5 : f.tilt * 0.3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const st = f.st;
    if (!st) { // hồi máu, chặn bằng khiên
      ctx.font = `800 ${size}px system-ui, sans-serif`; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color || '#f4f4f4'; ctx.fillText(f.text, 0, 0); ctx.restore(); return;
    }
    ctx.font = `${f.crit ? 'italic 900' : '800'} ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(f.text).width;
    if (f.crit) { // hình nổ răng cưa sau số + biểu tượng loại sát thương bên trái
      const rx = tw * 0.62 + size * 0.5, ry = size * 0.78, n = 14, spin = f.t * 1.6;
      ctx.beginPath();
      for (let j = 0; j < n * 2; j++) { const a = spin + (j / (n * 2)) * Math.PI * 2, r = j % 2 ? 0.62 : 1; ctx.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); }
      ctx.closePath(); ctx.globalAlpha *= 0.85; ctx.fillStyle = st.burst; ctx.fill(); ctx.globalAlpha /= 0.85;
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
      critIcon(st.icon, -tw / 2 - size * 0.55, -size * 0.05, size * 0.5, st);
    }
    const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45); g.addColorStop(0, st.top); g.addColorStop(1, st.bot);
    if (st.glow) { ctx.shadowColor = 'rgba(210,225,255,0.95)'; ctx.shadowBlur = f.crit ? 14 : 8; }
    ctx.lineWidth = f.crit ? 5 : 3.5; ctx.strokeStyle = st.stroke; ctx.strokeText(f.text, 0, 0);
    ctx.shadowBlur = 0; ctx.fillStyle = g; ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  /** Biểu tượng chí mạng: vết chém (vật lý), sao bốn cánh (phép), viên kim cương (chuẩn). */
  function critIcon(kind, x, y, s, st) {
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'slash') {
      for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(-s * 0.5 + j * s * 0.32, s * 0.55); ctx.lineTo(s * 0.45 + j * s * 0.32, -s * 0.55); ctx.lineWidth = s * 0.34; ctx.strokeStyle = st.stroke; ctx.stroke(); ctx.lineWidth = s * 0.16; ctx.strokeStyle = st.top; ctx.stroke(); }
    } else {
      ctx.beginPath();
      if (kind === 'spark') for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2 - Math.PI / 2, r = j % 2 ? s * 0.22 : s * 0.62; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      else { ctx.moveTo(0, -s * 0.62); ctx.lineTo(s * 0.46, 0); ctx.lineTo(0, s * 0.62); ctx.lineTo(-s * 0.46, 0); }
      ctx.closePath(); ctx.lineWidth = s * 0.2; ctx.strokeStyle = st.stroke; ctx.stroke();
      const g = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, st.bot); ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  }

  return {
    /** Xem trước 6 kiểu số sát thương trên đầu một đơn vị (bảng thử ?debug=1). */
    previewDamage(e) {
      const kinds = ['physical', 'magic', 'true'];
      kinds.forEach((t, j) => [false, true].forEach((c, m) => floats.push({ x: e.pos.x - 480 + j * 480, y: e.pos.y + (m ? 170 : -150), t: 0, born: now() + 0.22 * (j * 2 + m), text: String(c ? 486 + j * 37 : 128 + j * 21), st: DMG_STYLE[t], crit: c, size: 17, life: 2.6, drift: 0, tilt: 0 })));
    },
    handle(events, world) {
      for (const ev of events) {
        const e = world.byId(ev.id);
        if (!e) continue;
        if (ev.type === 'death' && ev.id === world.__localId) {
          const k = ev.killer != null ? world.byId(ev.killer) : null;
          death = { name: k?.data?.name || 'Bị hạ gục', heroId: k?.kind === 'hero' ? k.heroId : null, kind: k?.kind || null, team: k?.team, total: Math.max(1, (e.respawnTick - world.tick) / 30), self: k === e };
        }
        if (ev.type === 'monsterKill' && ev.boss) banners.push({ t: 0, ally: ev.team === world.__localTeam, text: `${ev.team === world.__localTeam ? 'Đội ta' : 'Đội địch'} đã hạ ${ev.name}!` });
        if (ev.type === 'damage') floats.push({ x: e.pos.x + (Math.random() - 0.5) * 40, y: e.pos.y, t: 0, born: now(), text: ev.shield ? 'Khiên' : String(ev.amount), st: ev.shield ? null : DMG_STYLE[ev.dmgType] || DMG_STYLE.physical, crit: !!ev.crit && !ev.shield,
          size: ev.amount > 150 ? 22 : 17, life: ev.crit ? 1.15 : 0.9, drift: (Math.random() - 0.5) * 36, tilt: (Math.random() - 0.5) * 0.18 });
        else if (ev.type === 'heal') floats.push({ x: e.pos.x, y: e.pos.y, t: 0, born: now(), text: '+' + ev.amount, color: '#8affb0', size: 16, life: 0.9, drift: 0, tilt: 0 });
      }
    },
    draw(world, cam, player, enemy, debugLines) {
      world.__localTeam = player.team; world.__localId = player.id;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // thanh máu trên đầu
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const e of world.entities) {
        if (!e.alive || e.noTarget || (e.team !== player.team && e.statuses.some((s) => s.kind === 'stealth')) || !canSee(player.team, e)) continue;
        const p = project(cam, e.pos.x, e.kind === 'hero' ? HERO_BAR_Y : e.kind === 'dummy' ? 230 : e.height, e.pos.y, w, h); if (!p.visible) continue;
        const isHero = e.kind === 'hero', col = e.id === player.id ? '#52d860' : e.team === player.team ? '#38b8ff' : '#ff4a3a';
        if (isHero) { // kiểu Liên Quân: huy hiệu cấp lục giác bên trái, thanh máu chia vạch mỗi 250 HP, tên ở trên
          const bw = 86, bh = 8, x0 = p.x - bw / 2 + 8, y0 = p.y - 14; // gọn, cao trên đầu: tên không bị đầu tướng che
          ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fillRect(x0 - 1.5, y0 - 1.5, bw + 3, bh + 7);
          ctx.fillStyle = e.invulnerable ? '#9a9aa8' : col; ctx.fillRect(x0, y0, bw * Math.max(0, Math.min(1, e.hp / e.stats.maxHp)), bh);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x0 + bw * Math.min(1, e.hp / e.stats.maxHp), y0, Math.min(bw, bw * sh / e.stats.maxHp), bh); }
          ctx.fillStyle = 'rgba(8,10,20,0.75)'; for (let v = 250; v < e.stats.maxHp; v += 250) { const tx = x0 + bw * v / e.stats.maxHp; ctx.fillRect(tx, y0, v % 1000 ? 1 : 2, v % 1000 ? bh * 0.55 : bh); }
          ctx.fillStyle = '#4a9cff'; ctx.fillRect(x0, y0 + bh + 1.5, bw * (e.mana / Math.max(1, e.stats.maxMana || 1)), 2.5);
          const hx = x0 - 10, hy = y0 + bh / 2 + 1.5, hr = 9; // huy hiệu cấp
          ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr); } ctx.closePath();
          ctx.fillStyle = '#141830'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '800 10px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(String(e.level), hx, hy + 0.5);
          ctx.textBaseline = 'bottom'; ctx.font = '700 12px system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(e.data.name, p.x + 8, y0 - 4); ctx.fillStyle = e.team === player.team ? '#e8f4ff' : '#ffd8d0'; ctx.fillText(e.data.name, p.x + 8, y0 - 4);
          ctx.font = '600 11px system-ui, sans-serif';
          const buffs = e.statuses.filter((q) => q.buff); // huy hiệu bùa rừng cạnh huy hiệu cấp
          buffs.forEach((q, i) => { const bx2 = x0 - 10, by2 = y0 - 20 - i * 18, c2 = { an_thuy: '#3fa8ff', an_hoa: '#ff5a2a', uy_ho: '#b98aff' }[q.buff] || '#fff';
            ctx.beginPath(); ctx.arc(bx2, by2, 8, 0, 7); ctx.fillStyle = '#141830'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = c2; ctx.stroke();
            const left = Math.max(0, (q.until - world.tick) / 30), tot = q.duration || 90; ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.arc(bx2, by2, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, left / tot)); ctx.fillStyle = c2; ctx.fill(); });
        } else {
          const mon = e.kind === 'monster';
          const bw = e.structure ? 120 : mon ? (e.boss ? 150 : e.monsterType === 'linh_thuy' || e.monsterType === 'hoa_nham' ? 96 : 60) : e.kind === 'minion' ? 44 : e.kind === 'dummy' ? 74 : 84;
          if (mon) { // quái rừng: thanh vàng cam, có tên với bùa và mục tiêu lớn
            bar(p.x - bw / 2, p.y - 6, bw, e.boss ? 9 : 6, e.hp / e.stats.maxHp, '#f2b33a');
            if (e.boss || bw > 90) { ctx.font = '700 12px system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(e.data.name, p.x, p.y - 10); ctx.fillStyle = '#ffe8b0'; ctx.fillText(e.data.name, p.x, p.y - 10); ctx.font = '600 11px system-ui, sans-serif'; }
            continue;
          }
          bar(p.x - bw / 2, p.y - 6, bw, e.kind === 'minion' ? 4 : 7, e.hp / e.stats.maxHp, e.invulnerable ? '#9a9aa8' : col);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) bar(p.x - bw / 2, p.y - 6, bw, 3, sh / e.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
        }
        if (e.invulnerable) { ctx.fillStyle = '#c8c8d8'; ctx.fillText('BẤT TỬ', p.x, p.y - (isHero ? 34 : 10)); }
        // hiệu ứng khống chế trên đầu
        const cc = e.statuses.find((s) => ['stun', 'knockup', 'root', 'taunt', 'silence'].includes(s.kind));
        if (cc) { ctx.fillStyle = '#ffd23a'; ctx.font = '800 13px system-ui, sans-serif'; ctx.fillText({ stun: 'CHOÁNG', knockup: 'HẤT TUNG', root: 'TRÓI', taunt: 'KHIÊU KHÍCH', silence: 'CÂM' }[cc.kind], p.x, p.y - (isHero ? 48 : 24)); }
      }
      // số bay
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.t = now() - f.born; // giây thật (không phụ thuộc FPS)
        if (f.t > f.life) { floats.splice(i, 1); continue; }
        if (f.t >= 0) drawFloat(f, project(cam, f.x, 200 + Math.sqrt(f.t / f.life) * (f.crit ? 150 : 120), f.y, w, h)); // t < 0: số xem trước chờ tới lượt
      }
      // thanh máu / mana của mình
      const bx = 16, by = h - 25, bw = Math.min(220, w * 0.24); // sát mép dưới, mảnh: không đè lên cần di chuyển
      bar(bx, by, bw, 12, player.hp / player.stats.maxHp, '#3ecf74');
      const sh = player.shields.reduce((a, s) => a + s.amount, 0);
      if (sh > 0) bar(bx, by, bw, 4, sh / player.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
      bar(bx, by + 15, bw, 5, player.mana / Math.max(1, player.stats.maxMana), '#4a9cff');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.round(player.hp)} / ${Math.round(player.stats.maxHp)}    Cấp ${player.level}${player.heat ? '    Nhiệt ' + player.heat : ''}`, bx + 6, by + 6);
      // tỉ số, đồng hồ, K/D/A: góc phải trên (scoreboard.js, DOM)
      if (!player.alive && player.respawnTick) drawDeath(world, player);
      // thông báo hạ mục tiêu lớn
      for (let i = banners.length - 1; i >= 0; i--) {
        const b = banners[i]; b.t += 1 / 60; if (b.t > 3.2) { banners.splice(i, 1); continue; }
        const a = Math.min(1, b.t * 4, (3.2 - b.t) * 2), cy = h * 0.22;
        ctx.globalAlpha = a; ctx.fillStyle = b.ally ? 'rgba(20,60,110,0.85)' : 'rgba(110,20,20,0.85)';
        ctx.beginPath(); ctx.roundRect(w / 2 - 190, cy - 22, 380, 44, 22); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffd86a'; ctx.stroke();
        ctx.fillStyle = '#fff4d0'; ctx.font = '800 18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, w / 2, cy + 1); ctx.globalAlpha = 1;
      }
      // joystick
      const { js, R } = input;
      { // cần di chuyển: luôn hiện (mờ khi nghỉ ở góc trái dưới), chạm ở đâu thì dời tới đó
        const o = js.active ? { x: js.ox, y: js.oy } : input.rest(), dx = js.active ? js.x - js.ox : 0, dy = js.active ? js.y - js.oy : 0, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
        ctx.globalAlpha = js.active ? 1 : 0.55;
        const g = ctx.createRadialGradient(o.x, o.y, R * 0.3, o.x, o.y, R); g.addColorStop(0, 'rgba(15,18,36,0.15)'); g.addColorStop(1, 'rgba(15,18,36,0.45)');
        ctx.fillStyle = g; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(243,233,214,0.55)';
        ctx.beginPath(); ctx.arc(o.x, o.y, R, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(243,233,214,0.5)'; // 4 mũi chỉ hướng
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, cx = o.x + Math.cos(a) * (R - 12), cy2 = o.y + Math.sin(a) * (R - 12); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 6, cy2 + Math.sin(a) * 6); ctx.lineTo(cx + Math.cos(a + 2.3) * 6, cy2 + Math.sin(a + 2.3) * 6); ctx.lineTo(cx + Math.cos(a - 2.3) * 6, cy2 + Math.sin(a - 2.3) * 6); ctx.fill(); }
        const kx = o.x + dx * k, ky = o.y + dy * k, kg = ctx.createRadialGradient(kx - 8, ky - 10, 4, kx, ky, 34);
        kg.addColorStop(0, 'rgba(255,236,190,0.95)'); kg.addColorStop(1, js.active ? 'rgba(255,170,60,0.9)' : 'rgba(200,170,120,0.75)');
        ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, 34, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,30,0,0.45)'; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (debugLines?.length) {
        ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#f3e9d6'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        debugLines.forEach((t, i) => ctx.fillText(t, 260, 56 + i * 15));
      }
    },
  };
}
