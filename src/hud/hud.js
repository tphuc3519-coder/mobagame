import { project } from '../render/project.js';
import { KEYSTONES } from '../data/emblems.js';
import { canSee } from '../sim/vision.js';
import { HERO_SCALE } from '../render/unitView.js';
import { floorAt } from '../render/env/floor.js';
import { createKillBanner } from './killBanner.js';
import { createHudExtras } from './hudExtras.js';
import { on } from '../core/scope.js';

// Số sát thương bay: 3 loại × thường/chí mạng. Màu lấy theo quy ước MOBA (vật lý cam, phép tím lam, chuẩn trắng);
// chí mạng: chữ to hơn, nghiêng, nảy mạnh, có hình nổ phía sau + biểu tượng (vật lý: vết chém, phép: sao lấp lánh, chuẩn: viên kim cương).
export const DMG_STYLE = {
  physical: { top: '#fff1cf', bot: '#ff9426', stroke: '#3c1500', burst: '#ff6a1c', icon: 'slash' },
  magic: { top: '#f0e4ff', bot: '#8f6bff', stroke: '#1c0d4c', burst: '#a64dff', icon: 'spark' },
  true: { top: '#ffffff', bot: '#d4dbef', stroke: '#2a2d3c', burst: '#e8f0ff', icon: 'gem', glow: true },
};
const HERO_BAR_Y = Math.round(250 * HERO_SCALE + 30); // thanh máu trên đầu tướng: trên đỉnh đầu tướng cao nhất (2,5 m × tỉ lệ trong trận)
/** Chữ khống chế trên đầu (áp chế ưu tiên cao nhất, màu tím riêng). */
const CC_STYLE = { suppress: ['ÁP CHẾ', '#c77dff'], knockup: ['HẤT TUNG', '#ffe066'], stun: ['CHOÁNG', '#ffc83a'], taunt: ['KHIÊU KHÍCH', '#ff7a3d'], root: ['TRÓI', '#5fe08a'], silence: ['CÂM LẶNG', '#7fb2ff'] };
const CC_ORDER = Object.keys(CC_STYLE); // thứ tự ưu tiên hiện: áp chế > hất tung > choáng > khiêu khích > trói > câm
/** Khống chế cứng mạnh nhất đang dính (cùng loại thì cái còn lâu nhất): { kind, left (giây), frac (0..1 phần còn lại) } hoặc null. */
export function hardCc(e, tick) {
  let best = null;
  for (const s of e.statuses) {
    const r = CC_ORDER.indexOf(s.kind); if (r < 0 || s.until <= tick) continue;
    if (!best || r < best.r || (r === best.r && s.until > best.s.until)) best = { r, s };
  }
  if (!best) return null;
  const s = best.s, total = Math.max(1, s.until - (s.t0 ?? s.until - (s.duration || 1) * 30));
  return { kind: s.kind, left: (s.until - tick) / 30, frac: Math.max(0, Math.min(1, (s.until - tick) / total)) };
}
/** Lý do không dùng được chiêu / phép / đồ của chính mình (sự kiện castFail) → chữ nổi trên đầu. */
const FAIL = { noTarget: 'Không có mục tiêu', suppressed: 'Đang bị áp chế', channel: 'Đang giữ chiêu', noDash: 'Không thể lướt', rooted: 'Đang bị trói', cc: 'Đang bị khống chế' };

/** Canvas 2D phủ trên cảnh: joystick, thanh máu trên đầu, số sát thương bay, thanh máu/mana của mình, debug. */
export function createHud(canvas, input, portraits = null) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const floats = [], golds = [], now = () => performance.now() / 1000;
  const kills = createKillBanner(portraits); // thông báo hạ gục / hạ mục tiêu lớn (killBanner.js)
  const extras = createHudExtras({ portraits }); // tướng địch rìa màn hình, thông số mục tiêu, ảnh tung chiêu cuối (hudExtras.js — bật/tắt trong Cài đặt)
  const monHit = new Map(), monTrail = new Map(); // quái: lúc bị đánh gần nhất (hiện số máu), phần máu vừa mất (rút dần)
  let death = null; // lý do bị hạ của mình: { name, heroId, kind, team, total }
  let lastFail = -9; // lần hiện chữ castFail gần nhất (giây): bấm liên tục không dồn chữ
  const tags = new Map(), mctx = document.createElement('canvas').getContext('2d'); // nhãn vẽ sẵn (tên tướng, huy hiệu cấp)
  const resize = () => { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; tags.clear(); };
  on(window, 'resize', resize); resize();
  /** Nhãn vẽ một lần ra canvas nhỏ rồi chỉ dán (drawImage) mỗi khung: strokeText + fillText cho từng tướng mỗi khung là phần nặng nhất của
   *  lớp HUD trên Safari. Chữ chưa tải xong phông thì không lưu (khỏi giữ mãi nhãn phông dự phòng). */
  function tag(key, font, text, bw, bh, paint) {
    let c = tags.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = Math.ceil(bw * dpr); c.height = Math.ceil(bh * dpr); c.w = bw; c.h = bh;
    const x = c.getContext('2d'); x.scale(dpr, dpr); paint(x);
    if (!document.fonts || document.fonts.check(font, text)) { tags.set(key, c); if (tags.size > 160) tags.delete(tags.keys().next().value); } // check theo chữ: phần dấu tiếng Việt là tệp phông riêng
    return c;
  }
  const NAME_F = '700 12px "Be Vietnam Pro", system-ui, sans-serif', LV_F = '800 10px "Be Vietnam Pro", system-ui, sans-serif';
  /** Tên trên đầu tướng: chữ trắng xanh / hồng viền tối, căn giữa, đáy chữ tại (x, y). */
  const nameTag = (nm, fill) => { mctx.font = NAME_F; const bw = Math.ceil(mctx.measureText(nm).width) + 8, bh = 18;
    return tag('n' + nm + fill, NAME_F, nm, bw, bh, (x) => { x.font = NAME_F; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.lineJoin = 'round'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,0.75)'; x.strokeText(nm, bw / 2, bh - 2); x.fillStyle = fill; x.fillText(nm, bw / 2, bh - 2); }); };
  /** Huy hiệu cấp lục giác viền màu phe, tâm ở giữa canvas. */
  const levelTag = (lv, col) => tag('l' + lv + col, LV_F, String(lv), 24, 24, (x) => {
    x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; x.lineTo(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9); } x.closePath();
    x.fillStyle = '#141830'; x.fill(); x.lineWidth = 2; x.strokeStyle = col; x.stroke();
    x.fillStyle = '#fff'; x.font = LV_F; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(lv), 12, 12.5); });

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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff3d6'; ctx.font = `800 ${left >= 10 ? 21 : 24}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillText(String(left), rx, ry + 1);
    // kẻ hạ
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffcf9a'; ctx.font = '700 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText(d.self ? 'Tự hạ gục' : 'Bị hạ bởi', rx + 34, ry - 11);
    let nx = rx + 34;
    const col = d.team == null ? '#e8d48a' : d.team === player.team ? '#38b8ff' : '#ff4a3a';
    if (d.heroId && portraits) { portraits.draw(ctx, d.heroId, d.name, nx + 11, ry + 9, 11, col, {}); nx += 27; }
    ctx.font = '800 15px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = d.kind === 'monster' ? '#ffe8b0' : d.team === player.team ? '#cfe8ff' : '#ffd0c8';
    ctx.fillText(d.name, nx, ry + 9);
    ctx.fillStyle = 'rgba(255,230,190,0.75)'; ctx.font = '600 10px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center';
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
      ctx.font = `800 ${size}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color || '#f4f4f4'; ctx.fillText(f.text, 0, 0); ctx.restore(); return;
    }
    const font = (px) => `${f.crit ? 'italic 900' : '800'} ${px}px "Be Vietnam Pro", system-ui, sans-serif`;
    if (f.crit) { // hình nổ răng cưa sau số + biểu tượng loại sát thương bên trái
      if (f.tw1 == null) { ctx.font = font(100); f.tw1 = ctx.measureText(f.text).width / 100; } // đo một lần (bề rộng tỉ lệ cỡ chữ) — measureText mỗi khung tốn
      const tw = f.tw1 * size; ctx.font = font(size);
      const rx = tw * 0.62 + size * 0.5, ry = size * 0.78, n = 14, spin = f.t * 1.6;
      ctx.beginPath();
      for (let j = 0; j < n * 2; j++) { const a = spin + (j / (n * 2)) * Math.PI * 2, r = j % 2 ? 0.62 : 1; ctx.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); }
      ctx.closePath(); ctx.globalAlpha *= 0.85; ctx.fillStyle = st.burst; ctx.fill(); ctx.globalAlpha /= 0.85;
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
      critIcon(st.icon, -tw / 2 - size * 0.55, -size * 0.05, size * 0.5, st);
    } else ctx.font = font(size);
    const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45); g.addColorStop(0, st.top); g.addColorStop(1, st.bot);
    if (st.glow) { ctx.lineWidth = f.crit ? 13 : 9; ctx.strokeStyle = 'rgba(205,220,255,0.32)'; ctx.strokeText(f.text, 0, 0); } // quầng sáng rẻ (shadowBlur chậm trên điện thoại)
    ctx.lineWidth = f.crit ? 5 : 3.5; ctx.strokeStyle = st.stroke; ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = g; ctx.fillText(f.text, 0, 0);
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
    /** Rời trận: xoá canvas HUD (về 1×1), bỏ nhãn / số bay đang giữ. */
    dispose() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.width = canvas.height = 1; tags.clear(); floats.length = 0; golds.length = 0; },
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
        extras.handle(ev, world, world.__localId);
        if (ev.type === 'monsterKill' && ev.boss) kills.boss(ev, world, world.__localId, world.__localTeam);
        if (ev.type === 'ace') kills.ace(ev, world, world.__localId, world.__localTeam);
        if (ev.type === 'death' && e.kind === 'hero') kills.death(ev, world, world.__localId, world.__localTeam);
        if (ev.type === 'gold' && ev.id === world.__localId && ev.amount > 0) golds.push({ amount: ev.amount, born: now() }); // vàng nhận được: "+225" kèm đồng vàng trên đầu tướng mình
        if (ev.type === 'castFail' && ev.id === world.__localId && FAIL[ev.reason] && now() - lastFail > 0.6) { lastFail = now(); floats.push({ x: e.pos.x, y: e.pos.y, gy: floorAt(world.map, e.pos.x, e.pos.y), t: 0, born: now(), text: FAIL[ev.reason], color: '#ffd0a0', size: 14, life: 1.1, drift: 0, tilt: 0 }); }
        if (ev.type === 'emblem' && ev.id === world.__localId && KEYSTONES[ev.key]) floats.push({ x: e.pos.x, y: e.pos.y, gy: floorAt(world.map, e.pos.x, e.pos.y), t: 0, born: now(), text: KEYSTONES[ev.key].name, color: '#ffd36a', size: 13, life: 1.0, drift: 0, tilt: 0 }); // phù hiệu kích hoạt
        if (ev.type === 'restoreBreak' && ev.id === world.__localId) floats.push({ x: e.pos.x, y: e.pos.y, gy: floorAt(world.map, e.pos.x, e.pos.y), t: 0, born: now(), text: 'Mất hồi máu', color: '#ff8aa0', size: 14, life: 1.2, drift: 0, tilt: 0 });
        if (ev.type === 'damage' && e.kind === 'monster') monHit.set(e.id, now());
        if (ev.type === 'death') { monHit.delete(ev.id); monTrail.delete(ev.id); }
        // số bay chỉ cho đòn mình gây ra / mình nhận (như Liên Quân): trước đây mọi đòn của mọi đơn vị (lính đánh lính…) đều có số — rối
        // mắt và mỗi số là vài lần vẽ chữ có viền trên canvas, giao tranh đông thì Safari tụt khung hình
        const mine = ev.src === world.__localId || ev.id === world.__localId;
        if (ev.type === 'damage' && mine) floats.push({ x: e.pos.x + (Math.random() - 0.5) * 40, y: e.pos.y, gy: floorAt(world.map, e.pos.x, e.pos.y), t: 0, born: now(), text: ev.shield ? 'Khiên' : String(ev.amount), st: ev.shield ? null : DMG_STYLE[ev.dmgType] || DMG_STYLE.physical, crit: !!ev.crit && !ev.shield,
          size: ev.amount > 150 ? 22 : 17, life: ev.crit ? 1.15 : 0.9, drift: (Math.random() - 0.5) * 36, tilt: (Math.random() - 0.5) * 0.18 });
        else if (ev.type === 'heal' && ev.id === world.__localId) floats.push({ x: e.pos.x, y: e.pos.y, gy: floorAt(world.map, e.pos.x, e.pos.y), t: 0, born: now(), text: '+' + ev.amount, color: '#8affb0', size: 16, life: 0.9, drift: 0, tilt: 0 });
      }
    },
    draw(world, cam, player, enemy, debugLines) {
      world.__localTeam = player.team; world.__localId = player.id;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // thanh máu trên đầu
      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      let ccPill = null; // khống chế đang dính trên tướng mình: vẽ thêm ô đếm giờ to dưới chân
      for (const e of world.entities) {
        if (!e.alive || e.noTarget || (e.team !== player.team && e.statuses.some((s) => s.kind === 'stealth')) || !canSee(player.team, e)) continue;
        const p = project(cam, e.pos.x, (e.kind === 'hero' ? HERO_BAR_Y : e.kind === 'dummy' ? 230 : e.height) + floorAt(world.map, e.pos.x, e.pos.y), e.pos.y, w, h); if (!p.visible) continue; // đứng trên bệ trại quái: thanh máu nâng theo
        const isHero = e.kind === 'hero', col = e.id === player.id ? '#52d860' : e.team === player.team ? '#38b8ff' : '#ff4a3a';
        if (isHero) { // kiểu Liên Quân: huy hiệu cấp lục giác bên trái, thanh máu chia vạch mỗi 250 HP, tên ở trên
          const bw = 86, bh = 8, x0 = p.x - bw / 2 + 8, y0 = p.y - 14; // gọn, cao trên đầu: tên không bị đầu tướng che
          ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fillRect(x0 - 1.5, y0 - 1.5, bw + 3, bh + 7);
          ctx.fillStyle = e.invulnerable ? '#9a9aa8' : col; ctx.fillRect(x0, y0, bw * Math.max(0, Math.min(1, e.hp / e.stats.maxHp)), bh);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x0 + bw * Math.min(1, e.hp / e.stats.maxHp), y0, Math.min(bw, bw * sh / e.stats.maxHp), bh); }
          ctx.fillStyle = 'rgba(8,10,20,0.75)'; for (let v = 250; v < e.stats.maxHp; v += 250) { const tx = x0 + bw * v / e.stats.maxHp; ctx.fillRect(tx, y0, v % 1000 ? 1 : 2, v % 1000 ? bh * 0.55 : bh); }
          ctx.fillStyle = '#4a9cff'; ctx.fillRect(x0, y0 + bh + 1.5, bw * (e.mana / Math.max(1, e.stats.maxMana || 1)), 2.5);
          if (e.channel && world.tick < e.channel.until) { ctx.fillStyle = '#d8a0ff'; ctx.fillRect(x0, y0 + bh + 5, bw * Math.max(0, (e.channel.until - world.tick) / Math.max(1, e.channel.until - e.channel.start)), 2.5); } // đang niệm giữ xích: thanh tím rút dần
          const hx = x0 - 10, hy = y0 + bh / 2 + 1.5; // huy hiệu cấp
          const lt = levelTag(e.level, col); ctx.drawImage(lt, hx - 12, hy - 12, lt.w, lt.h);
          const nm = e.playerName || e.data.name; // tên người chơi (như Liên Quân); vào thẳng trận không có tên thì hiện tên tướng
          const nt = nameTag(nm, e.team === player.team ? '#e8f4ff' : '#ffd8d0'); ctx.drawImage(nt, p.x + 8 - nt.w / 2, y0 - 4 - (nt.h - 2), nt.w, nt.h);
          ctx.textBaseline = 'bottom'; ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
          const buffs = e.statuses.filter((q) => q.buff); // huy hiệu bùa rừng cạnh huy hiệu cấp
          buffs.forEach((q, i) => { const bx2 = x0 - 10, by2 = y0 - 20 - i * 18, c2 = { an_thuy: '#3fa8ff', an_hoa: '#ff5a2a', uy_ho: '#b98aff' }[q.buff] || '#fff';
            ctx.beginPath(); ctx.arc(bx2, by2, 8, 0, 7); ctx.fillStyle = '#141830'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = c2; ctx.stroke();
            const left = Math.max(0, (q.until - world.tick) / 30), tot = q.duration || 90; ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.arc(bx2, by2, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, left / tot)); ctx.fillStyle = c2; ctx.fill(); });
        } else {
          const mon = e.kind === 'monster';
          const bw = e.structure ? 120 : mon ? (e.boss ? 150 : e.monsterType === 'linh_thuy' || e.monsterType === 'hoa_nham' ? 96 : 60) : e.kind === 'minion' ? 44 : e.kind === 'dummy' ? 74 : 84;
          if (mon) { // quái rừng: thanh vàng cam (phần máu vừa mất trắng, rút dần), có tên với bùa và mục tiêu lớn; đang giao chiến/vừa bị đánh: số máu trên thanh (như Liên Quân)
            const pct = Math.max(0, e.hp / e.stats.maxHp), bh = e.boss ? 9 : 6, x0 = p.x - bw / 2, y0 = p.y - 6, tn = now();
            const tr = monTrail.get(e.id) || { v: pct, t: tn }; tr.v = Math.max(pct, tr.v - (tn - tr.t) * 0.45); tr.t = tn; monTrail.set(e.id, tr);
            bar(x0, y0, bw, bh, pct, '#f2b33a');
            if (tr.v > pct + 0.002) { ctx.fillStyle = 'rgba(255,248,232,0.85)'; ctx.fillRect(x0 + bw * pct, y0, bw * (tr.v - pct), bh); }
            const hot = e.aggro != null || tn - (monHit.get(e.id) ?? -99) < 4;
            if (hot) { ctx.font = `800 ${e.boss ? 16 : 12}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.lineWidth = e.boss ? 4 : 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(String(Math.ceil(e.hp)), p.x, y0 - 2); ctx.fillStyle = '#ffffff'; ctx.fillText(String(Math.ceil(e.hp)), p.x, y0 - 2); } // boss: số to hơn
            if (e.boss || bw > 90) { const ny = hot ? y0 - (e.boss ? 20 : 16) : p.y - 10; ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(e.data.name, p.x, ny); ctx.fillStyle = '#ffe8b0'; ctx.fillText(e.data.name, p.x, ny); }
            ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
            continue;
          }
          bar(p.x - bw / 2, p.y - 6, bw, e.kind === 'minion' ? 4 : 7, e.hp / e.stats.maxHp, e.invulnerable ? '#9a9aa8' : col);
          const sh = e.shields.reduce((a, q) => a + q.amount, 0);
          if (sh > 0) bar(p.x - bw / 2, p.y - 6, bw, 3, sh / e.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
        }
        if (e.invulnerable) { ctx.fillStyle = '#c8c8d8'; ctx.fillText('BẤT TỬ', p.x, p.y - (isHero ? 34 : 10)); }
        // hiệu ứng khống chế trên đầu
        const cc = hardCc(e, world.tick); // khống chế cứng mạnh nhất: chữ + (tướng) dải thời gian rút dần dưới thanh năng lượng
        if (cc) {
          const [label, ccol] = CC_STYLE[cc.kind];
          ctx.fillStyle = ccol; ctx.font = '800 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText(label, p.x, p.y - (isHero ? 48 : 24));
          if (isHero) { const bw = 86, x0 = p.x - bw / 2 + 8, yb = p.y - 14 + 8 + (e.channel && world.tick < e.channel.until ? 8 : 5), th = e.id === player.id ? 5 : 4;
            ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fillRect(x0 - 1, yb - 1, bw + 2, th + 2); ctx.fillStyle = ccol; ctx.fillRect(x0, yb, bw * cc.frac, th); }
          if (e.id === player.id) ccPill = { cc, x: p.x };
        }
        else if (e.statuses.some((s) => s.id === 'unstoppable')) { ctx.fillStyle = '#ffcf6a'; ctx.font = '800 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText('KHÔNG THỂ CẢN', p.x, p.y - (isHero ? 48 : 24)); }
        else if (isHero && e.statuses.some((s) => s.kind === 'weaken' && s.until > world.tick)) { ctx.fillStyle = '#c89aff'; ctx.font = '800 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText('SUY YẾU', p.x, p.y - 48); } // Bùa Mỏi
        if (e.structure && world.tick < (e.disabledUntil || 0)) { ctx.fillStyle = '#9ad0ff'; ctx.font = '800 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText('TẮT ĐÈN ' + Math.ceil((e.disabledUntil - world.tick) / 30) + 's', p.x, p.y - 14); } // Tắt Đèn
      }
      if (ccPill) { // ô khống chế của mình: viền + nền màu loại khống chế rút dần, chữ "CHOÁNG 1,2s", nằm dưới chân, kẹp trong màn
        const fp = project(cam, player.pos.x, floorAt(world.map, player.pos.x, player.pos.y), player.pos.y, w, h), [label, ccol] = CC_STYLE[ccPill.cc.kind];
        const pw = 132, ph = 24, px = Math.max(8, Math.min(w - pw - 8, fp.x - pw / 2)), py = Math.max(8, Math.min(h - ph - 40, fp.y + 16));
        ctx.save(); ctx.globalAlpha = 0.92; ctx.fillStyle = 'rgba(10,12,24,0.85)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
        ctx.beginPath(); ctx.roundRect(px, py, Math.max(ph, pw * ccPill.cc.frac), ph, 12); ctx.fillStyle = ccol + '80'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = ccol; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${label} ${ccPill.cc.left.toFixed(1).replace('.', ',')}s`, px + pw / 2, py + ph / 2 + 0.5); ctx.restore();
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      }
      // số bay
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.t = now() - f.born; // giây thật (không phụ thuộc FPS)
        if (f.t > f.life) { floats.splice(i, 1); continue; }
        if (f.t >= 0) drawFloat(f, project(cam, f.x, 200 + (f.gy || 0) + Math.sqrt(f.t / f.life) * (f.crit ? 150 : 120), f.y, w, h)); // t < 0: số xem trước chờ tới lượt
      }
      // thanh máu / mana của mình
      const bx = 16, by = h - 25, bw = Math.min(220, w * 0.24); // sát mép dưới, mảnh: không đè lên cần di chuyển
      bar(bx, by, bw, 12, player.hp / player.stats.maxHp, '#3ecf74');
      const sh = player.shields.reduce((a, s) => a + s.amount, 0);
      if (sh > 0) bar(bx, by, bw, 4, sh / player.stats.maxHp, '#f4f4f4', 'rgba(0,0,0,0)');
      bar(bx, by + 15, bw, 5, player.mana / Math.max(1, player.stats.maxMana), '#4a9cff');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 10px "Be Vietnam Pro", ui-monospace, monospace'; ctx.fillStyle = '#fff';
      const gg = player.data.passive?.gauge?.(player, world); // thanh nội tại của tướng (Nụ, Ấn, Tầm Nhìn…)
      ctx.fillText(`${Math.round(player.hp)} / ${Math.round(player.stats.maxHp)}    Cấp ${player.level}${player.heat ? '    Nhiệt ' + player.heat : ''}${gg ? `    ${gg.label}${gg.max > 1 ? ` ${gg.v}${gg.unit || ''}/${gg.max}${gg.unit || ''}` : ''}` : ''}`, bx + 6, by + 6);
      // tỉ số, đồng hồ, K/D/A: góc phải trên (scoreboard.js, DOM)
      if (!player.alive && player.respawnTick) drawDeath(world, player);
      // vàng nhận được: trên đầu tướng mình, nảy lên rồi mờ dần (giết tướng: chữ to)
      for (let i = golds.length - 1; i >= 0; i--) {
        const g = golds[i], t = now() - g.born, life = g.amount >= 150 ? 1.6 : 1.1; if (t > life) { golds.splice(i, 1); continue; }
        if (!player.alive) continue;
        const p = project(cam, player.pos.x, HERO_BAR_Y + 70 + floorAt(world.map, player.pos.x, player.pos.y) + Math.sqrt(t / life) * 110, player.pos.y, w, h); if (!p.visible) continue;
        const big = g.amount >= 150, sz = (big ? 21 : 14) * (1 + 0.35 * Math.max(0, 1 - t / 0.12)), txt = '+' + g.amount;
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (life - t) * 3, t * 25)); ctx.font = `800 ${sz}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        const tw = ctx.measureText(txt).width, cr = sz * 0.42, x0 = p.x - (tw + cr * 2 + 3) / 2, cyy = p.y - (i % 3) * 6;
        const cg = ctx.createRadialGradient(x0 + cr - cr * 0.3, cyy - cr * 0.3, cr * 0.1, x0 + cr, cyy, cr); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(0.6, '#ffc83a'); cg.addColorStop(1, '#c47a00');
        ctx.beginPath(); ctx.arc(x0 + cr, cyy, cr, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a3200'; ctx.stroke();
        ctx.lineWidth = big ? 4 : 3; ctx.strokeStyle = '#3a2000'; ctx.lineJoin = 'round'; ctx.strokeText(txt, x0 + cr * 2 + 3, cyy);
        const tg = ctx.createLinearGradient(0, cyy - sz / 2, 0, cyy + sz / 2); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(1, '#ffc23a'); ctx.fillStyle = tg; ctx.fillText(txt, x0 + cr * 2 + 3, cyy);
        ctx.restore();
      }
      extras.draw(ctx, w, h, world, cam, player);
      // thông báo hạ gục / hạ mục tiêu lớn (giữa phía trên)
      kills.draw(ctx, w, h);
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
        ctx.font = '12px "Be Vietnam Pro", ui-monospace, monospace'; ctx.fillStyle = '#f3e9d6'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        debugLines.forEach((t, i) => ctx.fillText(t, 260, 56 + i * 15));
      }
    },
  };
}
