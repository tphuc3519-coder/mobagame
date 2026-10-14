// Thông báo hạ gục kiểu Liên Quân (dải giữa phía trên, canvas HUD): vệt sáng quét ngang mở màn → dải xanh (đội ta hạ) / đỏ (đội địch
// hạ): chân dung người hạ — tiêu đề — chân dung bị hạ (vạch chéo đỏ quẹt qua), người hỗ trợ là chân dung nhỏ dưới người hạ.
// Tiêu đề (ưu tiên): Double / Triple / Quadra / Penta Kill → Chiến công đầu → Chặn đứng (hạ người đang có chuỗi ≥ 3) → chuỗi hạ gục
// (3: Liên tục hạ gục … 7+: Truyền thuyết) → Hạ gục. Không tướng nào được mạng: biểu tượng trụ / lính / quái + "Bị hạ gục".
// Hàng đợi: mỗi thông báo ~2,4 giây, dồn nhiều thì rút ngắn. Thời gian theo giờ thật (không phụ thuộc FPS).
import { HEROES } from '../data/heroes/index.js';
import { play } from '../audio/audio.js';
import { prefs } from '../core/prefs.js';

export const MULTI = { 2: 'Double Kill', 3: 'Triple Kill', 4: 'Quadra Kill', 5: 'Penta Kill' };
const STREAK = { 3: 'Liên tục hạ gục', 4: 'Hủy diệt', 5: 'Không thể cản phá', 6: 'Thần thánh' };
export const streakName = (n) => (n >= 7 ? 'Truyền thuyết' : STREAK[n] || '');
const BODY = '"Be Vietnam Pro", system-ui, sans-serif', DISP = '"Barlow Condensed", "Be Vietnam Pro", system-ui, sans-serif';
const THEME = {
  ally: { mid: 'rgba(14,36,78,0.9)', edge: 'rgba(30,80,150,0.55)', line: '#6fd0ff', glow: [90, 200, 255], ring: '#38b8ff' },
  foe: { mid: 'rgba(78,14,20,0.9)', edge: 'rgba(150,34,30,0.55)', line: '#ff7a64', glow: [255, 100, 80], ring: '#ff4a3a' },
};
const now = () => performance.now() / 1000;
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
try { document.fonts?.load(`italic 800 24px ${DISP}`); document.fonts?.load(`700 18px ${BODY}`); } catch (_) { /* không có DOM */ }

/** Tiêu đề của một sự kiện chết (tướng): { title, sub, tier } — tier ≥ 2: hạ liên tiếp (chữ lớn vàng), 1: đặc biệt, 0: thường. */
export function titleOf(ev) {
  const n = Math.min(5, ev.multi || 0), st = streakName(ev.streak || 0);
  const sub = ev.first ? 'Chiến công đầu' : ev.shutdown ? `Chặn đứng chuỗi ${ev.shutdown} mạng` : st;
  if (n >= 2) return { title: MULTI[n], sub, tier: n };
  if (ev.first) return { title: 'Chiến công đầu', sub: '', tier: 1 };
  if (ev.shutdown) return { title: 'Chặn đứng', sub: `chuỗi ${ev.shutdown} mạng`, tier: 1 };
  if (st) return { title: st, sub: `${ev.streak} mạng liên tiếp`, tier: ev.streak >= 7 ? 1.5 : 1 };
  return { title: 'Hạ gục', sub: '', tier: 0 };
}

/** Nhạc báo đi cùng thông báo (phát lúc thông báo hiện ra, khớp hình): hạ liên tiếp cao dần theo số mạng. */
function announce(it) {
  const s = it.snd; if (!s || document.body.classList.contains('over')) return; // trận đã kết thúc: chỉ còn nhạc thắng/thua
  const o = { announce: true };
  if (s.k === 'multi') play('ann_multi', { ...o, rate: 1 + 0.06 * (s.n - 2) });
  else if (s.k === 'first') play('ann_first', o);
  else if (s.k === 'shutdown') play('ann_shutdown', o);
  else if (s.k === 'streak') play('ann_streak', o);
  else if (s.k === 'executed') play('ann_executed', o);
  else play(s.ally ? 'ann_ally' : 'ann_enemy', o);
}

export function createKillBanner(portraits) {
  const queue = [];
  let cur = null;
  const start = (it) => { cur = it; it.t0 = now(); it.life = queue.length ? 1.8 : it.tier >= 2 ? 2.8 : 2.4; announce(it); };
  const push = (it) => {
    if (!prefs().killFx) { announce(it); return; } // Cài đặt → Thiết lập → tắt hiệu ứng thông báo: chỉ còn nhạc báo
    if (queue.length >= 4) { const i = queue.findIndex((q) => q.tier < 2); queue.splice(i >= 0 ? i : 0, 1); } // dồn quá nhiều: bỏ bớt cái thường
    queue.push(it);
    if (cur) { const t = now() - cur.t0; cur.life = Math.min(cur.life, Math.max(t + 0.3, it.tier >= 2 ? 0.9 : 1.4)); } // có cái mới: cái đang hiện rút gọn (hạ liên tiếp chen nhanh hơn)
  };

  /** Hình tròn biểu tượng cho người hạ không phải tướng: trụ / lính / quái (vẽ bằng nét). */
  function glyph(ctx, kind, x, y, r, ring) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#3a3f5c'); g.addColorStop(1, '#141628'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.2); ctx.strokeStyle = ring; ctx.stroke();
    ctx.translate(x, y); ctx.scale(r / 20, r / 20); ctx.fillStyle = '#f3e3b8'; ctx.strokeStyle = '#f3e3b8'; ctx.lineWidth = 2.2; ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'tower') { // tháp răng cưa (kiểu quân xe) + cửa vòm sáng — tránh dáng đầu nhọn thân loe (trông như cái chuông)
      ctx.fillRect(-10, 8, 20, 4); ctx.fillRect(-6.5, -5, 13, 13); ctx.fillRect(-9, -9, 18, 4.5);
      for (const x of [-9, -2, 5]) ctx.fillRect(x, -14, 4, 5.5);
      ctx.fillStyle = '#7ad8ff'; ctx.beginPath(); ctx.moveTo(-2.2, 6); ctx.lineTo(-2.2, -0.5); ctx.arc(0, -0.5, 2.2, Math.PI, 0); ctx.lineTo(2.2, 6); ctx.closePath(); ctx.fill();
    }
    else if (kind === 'minion') { ctx.moveTo(-9, 9); ctx.lineTo(8, -8); ctx.moveTo(4, -9); ctx.lineTo(9, -4); ctx.moveTo(-9, 3); ctx.lineTo(-3, 9); ctx.stroke(); }
    else if (kind === 'monster') { for (const dx of [-6, 0, 6]) { ctx.moveTo(dx - 2, -10); ctx.quadraticCurveTo(dx + 4, -2, dx - 1, 10); } ctx.stroke(); }
    else { ctx.font = `800 20px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1); }
    ctx.restore();
  }
  const face = (ctx, f, x, y, r, ring, me) => {
    if (f.heroId && portraits) portraits.draw(ctx, f.heroId, f.name, x, y, r, ring, { me });
    else if (f.heroId) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#1a1d33'; ctx.fill(); ctx.lineWidth = r * 0.2; ctx.strokeStyle = ring; ctx.stroke(); ctx.fillStyle = '#f3e9d6'; ctx.font = `800 ${Math.round(r)}px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((f.name || '?')[0], x, y + 1); ctx.restore(); }
    else glyph(ctx, f.kind, x, y, r, ring);
  };

  function draw(ctx, w, h) {
    if (cur && now() - cur.t0 > cur.life) cur = null;
    if (!cur && queue.length) start(queue.shift());
    if (!cur) return;
    const it = cur, t = now() - it.t0, th = THEME[it.theme], big = it.tier >= 2;
    const bw = Math.min(big ? 430 : 390, w * 0.5), bh = big ? 40 : 34, cx = w / 2, cy = Math.max(86, h * 0.235), R = big ? 25 : 22;
    const out = Math.max(0, (t - (it.life - 0.32)) / 0.32), a = Math.min(1, ease((t - 0.06) / 0.2)) * (1 - out), open = 0.62 + 0.38 * ease((t - 0.05) / 0.25);
    const half = (bw / 2) * open, x0 = cx - half, x1 = cx + half, dy = -out * 10;
    ctx.save(); ctx.translate(0, dy);
    // vệt sáng quét ngang + chớp dọc ở giữa (0 → 0,35 giây)
    if (t < 0.4) {
      const k = t / 0.4, len = bw * (0.15 + 1.05 * ease(t / 0.22)), al = Math.max(0, 1 - k) ** 1.3, [r, g, b] = big ? [255, 214, 120] : [255, 246, 200];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      let gr = ctx.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0); gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(0.5, `rgba(${r},${g},${b},${0.95 * al})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr; ctx.fillRect(cx - len / 2, cy - 7 * (1 - k * 0.6), len, 14 * (1 - k * 0.6));
      ctx.fillStyle = `rgba(255,255,255,${0.9 * al})`; ctx.fillRect(cx - len * 0.35, cy - 1, len * 0.7, 2);
      const fl = ease(t / 0.12) * (1 - k); ctx.translate(cx, cy); ctx.scale(0.16, 1);
      gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 70); gr.addColorStop(0, `rgba(255,255,255,${0.95 * fl})`); gr.addColorStop(0.35, `rgba(${r},${g},${b},${0.6 * fl})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (a <= 0.01) { ctx.restore(); return; }
    ctx.globalAlpha = a;
    // dải: giữa đậm, hai đầu nhạt dần; viền sáng mảnh trên / dưới
    let gr = ctx.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.09, th.edge); gr.addColorStop(0.3, th.mid); gr.addColorStop(0.7, th.mid); gr.addColorStop(0.91, th.edge); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(x0, cy - bh / 2, x1 - x0, bh);
    gr = ctx.createLinearGradient(x0, 0, x1, 0); const [lr, lg, lb] = th.glow;
    gr.addColorStop(0, `rgba(${lr},${lg},${lb},0)`); gr.addColorStop(0.2, `rgba(${lr},${lg},${lb},0.9)`); gr.addColorStop(0.5, big ? 'rgba(255,224,140,1)' : `rgba(${lr},${lg},${lb},0.55)`); gr.addColorStop(0.8, `rgba(${lr},${lg},${lb},0.9)`); gr.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x0, cy - bh / 2 - 1, x1 - x0, 1.6); ctx.fillRect(x0, cy + bh / 2 - 0.6, x1 - x0, 1.6);
    // tiêu đề
    const pop = big ? 1 + 0.5 * (1 - ease((t - 0.05) / 0.22)) : 1;
    ctx.save(); ctx.translate(cx, cy + 1); ctx.scale(pop, pop); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (big) {
      ctx.font = `italic 800 ${it.tier >= 5 ? 30 : 27}px ${DISP}`;
      const txt = it.title.toUpperCase();
      ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,170,40,0.28)'; ctx.strokeText(txt, 0, 0); // quầng sáng rẻ (shadowBlur chậm trên điện thoại)
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#3a1800'; ctx.strokeText(txt, 0, 0);
      gr = ctx.createLinearGradient(0, -14, 0, 14); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.45, '#ffd76a'); gr.addColorStop(1, '#e88a12'); ctx.fillStyle = gr; ctx.fillText(txt, 0, 0);
    } else {
      ctx.font = `700 ${it.title.length > 15 ? 16 : 18}px ${BODY}`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeText(it.title, 0, 0);
      gr = ctx.createLinearGradient(0, -10, 0, 10); gr.addColorStop(0, '#fff8e4'); gr.addColorStop(1, it.tier >= 1 ? '#ffd27a' : '#ecd29a'); ctx.fillStyle = gr; ctx.fillText(it.title, 0, 0);
    }
    ctx.restore();
    if (it.sub) { // dòng phụ dưới dải (chiến công đầu / chuỗi / chặn đứng kèm theo)
      ctx.font = `700 11px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(it.sub, cx, cy + bh / 2 + 4); ctx.fillStyle = it.tier >= 1.5 || /Truyền thuyết/.test(it.sub) ? '#ffd86a' : '#f3e6c8'; ctx.fillText(it.sub, cx, cy + bh / 2 + 4);
    }
    // chân dung: người hạ (trái), bị hạ (phải); trượt từ giữa ra
    const sl = ease((t - 0.04) / 0.26), lx = cx - (bw / 2 - R * 0.55) * (0.7 + 0.3 * sl), rx = cx + (bw / 2 - R * 0.55) * (0.7 + 0.3 * sl);
    const otherRing = it.theme === 'ally' ? THEME.foe.ring : THEME.ally.ring;
    face(ctx, it.killer, lx, cy, R, th.ring, it.killer.me);
    face(ctx, it.victim, rx, cy, R, otherRing, it.victim.me);
    const s = ease((t - 0.3) / 0.14); // vạch chéo đỏ quẹt qua người bị hạ
    if (s > 0) {
      const ax = rx + R * 0.95, ay = cy - R * 1.05, bx = rx - R * 0.95, by = cy + R * 1.05, ex = ax + (bx - ax) * s, ey = ay + (by - ay) * s;
      ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#ff2a2a'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffd0c8'; ctx.stroke();
    }
    // người hỗ trợ: chân dung nhỏ dưới người hạ
    (it.assists || []).slice(0, 4).forEach((f, i) => face(ctx, f, lx - 6 + i * 17, cy + R + 10, 7.5, th.ring, f.me));
    if (big && t < 0.9) { // hạ liên tiếp: tia sáng toả quanh chữ
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (1 - t / 0.9);
      for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + t * 0.8, r0 = 26 + t * 60, r1 = r0 + 18 + it.tier * 3; ctx.strokeStyle = i % 2 ? '#ffe7a0' : '#ffb640'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0 * 2.2, cy + Math.sin(an) * r0 * 0.5); ctx.lineTo(cx + Math.cos(an) * r1 * 2.2, cy + Math.sin(an) * r1 * 0.5); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  /** Người / vật trong khung: tướng (chân dung) hoặc trụ / lính / quái. */
  const who = (e, me) => (e?.kind === 'hero' ? { heroId: e.heroId, name: e.playerName || e.data?.name || HEROES[e.heroId]?.name, me: e.id === me } : { kind: e?.kind === 'tower' || e?.kind === 'core' ? 'tower' : e?.kind || null });
  return {
    /** Sự kiện 'death' của tướng (sim/damage.js). me: id tướng người chơi; team: đội người chơi. */
    death(ev, world, me, team) {
      const v = world.byId(ev.id); if (!v || v.kind !== 'hero') return;
      const k = ev.killer != null ? world.byId(ev.killer) : null, hero = k?.kind === 'hero' && k.team !== v.team;
      const by = hero ? k : ev.by != null ? world.byId(ev.by) : k;
      const tt = hero ? titleOf(ev) : { title: 'Bị hạ gục', sub: '', tier: 0 }, ally = (hero ? k.team : 1 - v.team) === team;
      const snd = { ally, n: Math.min(5, ev.multi || 0), k: !hero ? 'executed' : (ev.multi || 0) >= 2 ? 'multi' : ev.first ? 'first' : ev.shutdown ? 'shutdown' : (ev.streak || 0) >= 3 ? 'streak' : 'kill' };
      push({ ...tt, snd, theme: ally ? 'ally' : 'foe', killer: who(hero ? k : by, me), victim: who(v, me),
        assists: (ev.assists || []).map((id) => world.byId(id)).filter(Boolean).map((e) => who(e, me)) });
    },
    /** Hạ mục tiêu lớn (boss). */
    boss(ev, world, me, team) {
      const k = world.byId(ev.killer);
      push({ title: `Hạ ${ev.name}`, sub: ev.team === team ? 'Cả đội nhận thưởng' : 'Đội địch nhận thưởng', tier: 1, snd: { k: 'boss', ally: ev.team === team }, theme: ev.team === team ? 'ally' : 'foe', killer: who(k, me), victim: { kind: 'monster' } });
    },
    draw,
    get busy() { return !!cur || queue.length > 0; },
  };
}
