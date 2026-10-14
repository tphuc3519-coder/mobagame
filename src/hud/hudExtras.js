// Phần HUD bật/tắt theo Cài đặt → Thiết lập giao diện (core/prefs.js):
// - Vị trí tướng địch rìa màn hình: địch đang thấy trên bản đồ mà nằm ngoài màn hình (trong ~2 màn) → chân dung viền đỏ + mũi tên ở mép.
// - Thông số mục tiêu: khung cạnh bản đồ nhỏ — chân dung/tên, thanh máu số, công / giáp / kháng phép của mục tiêu đang đánh.
// - Ảnh tướng tung chiêu cuối: thẻ tướng lướt vào từ trái khi mình tung chiêu cuối.
// - Đồ đề cử cạnh nút cửa hàng, mô tả trang bị trong cửa hàng: ẩn bằng lớp trên body.
import { prefs, onPref } from '../core/prefs.js';
import { project } from '../render/project.js';
import { canSee } from '../sim/vision.js';
import { cardSrc } from '../ui/kit.js';

const STYLE = `
body.no-rec #qb { display: none !important; }
body.no-idesc .shop .note, body.no-idesc #qb .qn small { display: none !important; }
.ultsplash { position: fixed; left: 0; top: 18%; z-index: 4; height: 34%; aspect-ratio: 16 / 10; pointer-events: none; overflow: hidden; opacity: 0;
  -webkit-mask-image: linear-gradient(90deg, #000 55%, transparent); mask-image: linear-gradient(90deg, #000 55%, transparent); }
.ultsplash img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; filter: saturate(1.15) contrast(1.05); }
.ultsplash::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, rgba(255,214,120,0) 30%, rgba(255,236,190,.55) 45%, rgba(255,214,120,0) 60%); transform: translateX(-100%); }
.ultsplash.on { animation: ultIn 1.25s ease-out forwards; } .ultsplash.on::after { animation: ultShine .7s .1s ease-out forwards; }
@keyframes ultIn { 0% { opacity: 0; transform: translateX(-30%) skewX(-8deg); } 14% { opacity: 1; transform: translateX(0) skewX(-8deg); } 78% { opacity: 1; transform: translateX(3%) skewX(-8deg); } 100% { opacity: 0; transform: translateX(8%) skewX(-8deg); } }
@keyframes ultShine { to { transform: translateX(100%); } }
`;

export function createHudExtras({ portraits = null } = {}) {
  const st = document.createElement('style'); st.textContent = STYLE; document.head.append(st);
  const classes = () => { const p = prefs(); document.body.classList.toggle('no-rec', !p.recommend); document.body.classList.toggle('no-idesc', !p.itemDesc); };
  classes(); onPref((k) => { if (k === 'recommend' || k === 'itemDesc') classes(); });
  let splash = null, lastHit = null, mmw = 0;
  const mm = () => (mmw ||= parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mmw')) || 160);
  addEventListener('resize', () => { mmw = 0; });

  function ult(heroId) {
    if (!splash) { splash = document.createElement('div'); splash.className = 'ultsplash'; splash.innerHTML = '<img alt="">'; document.body.append(splash); }
    splash.firstChild.src = cardSrc(heroId); splash.classList.remove('on'); void splash.offsetWidth; splash.classList.add('on');
  }

  /** Mũi tên + chân dung ở mép màn hình cho địch đang thấy mà ngoài khung nhìn. */
  function edges(ctx, w, h, world, cam, player) {
    const m = 30, cx = w / 2, cy = h / 2, tx = cam.position.x, tz = cam.position.z - Math.cos(55 * Math.PI / 180) * cam.position.y / Math.sin(55 * Math.PI / 180);
    for (const e of world.entities) {
      if (e.kind !== 'hero' || !e.alive || e.team === player.team || !canSee(player.team, e) || e.statuses.some((s) => s.kind === 'stealth')) continue;
      const dx = e.pos.x - tx, dz = e.pos.y - tz; if (Math.hypot(dx, dz) > 6500) continue;
      const p = project(cam, e.pos.x, 150, e.pos.y, w, h);
      if (p.visible && p.x > 0 && p.x < w && p.y > 0 && p.y < h) continue;
      const sx = dx, sy = dz * 0.8, k = Math.min((cx - m) / (Math.abs(sx) || 1e-6), (cy - m) / (Math.abs(sy) || 1e-6)), x = cx + sx * k, y = cy + sy * k, a = Math.atan2(sy, sx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); // mũi tên chĩa ra ngoài
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(14, -8); ctx.lineTo(14, 8); ctx.closePath(); ctx.fillStyle = '#ff4a3a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
      ctx.restore();
      if (portraits) portraits.draw(ctx, e.heroId, e.data.name, x, y, 14, '#ff4a3a', {});
      else { ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fillStyle = '#ff4a3a'; ctx.fill(); }
      const hp = Math.max(0, e.hp / e.stats.maxHp); ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fillRect(x - 15, y + 16, 30, 4); ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x - 15, y + 16, 30 * hp, 4);
    }
  }

  /** Khung thông số mục tiêu đang đánh (mục tiêu của đòn vung, hoặc đơn vị mình vừa gây sát thương trong 4 giây). */
  function target(ctx, w, h, world, player) {
    const t0 = player.swingTarget != null ? world.byId(player.swingTarget) : null;
    const t = t0 && t0.alive ? t0 : lastHit && performance.now() - lastHit.at < 4000 ? world.byId(lastHit.id) : null;
    if (!t || !t.alive || t.team === player.team || !canSee(player.team, t)) return;
    const x = mm() + 18, y = 8, bw = 196, bh = 50, foe = '#ff4a3a';
    ctx.fillStyle = 'rgba(12,14,32,0.82)'; ctx.fillRect(x, y, bw, bh); ctx.fillStyle = 'rgba(255,120,100,0.6)'; ctx.fillRect(x, y, 2, bh);
    let nx = x + 10;
    if (t.kind === 'hero' && portraits) { portraits.draw(ctx, t.heroId, t.data.name, x + 26, y + bh / 2, 17, foe, {}); nx = x + 50; }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#ffd8d0';
    ctx.fillText(t.kind === 'hero' ? (t.playerName || t.data.name) : t.data?.name || '', nx, y + 15);
    const hw = x + bw - 8 - nx, pct = Math.max(0, t.hp / t.stats.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(nx, y + 20, hw, 9); ctx.fillStyle = foe; ctx.fillRect(nx, y + 20, hw * pct, 9);
    ctx.font = '700 8.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${Math.ceil(t.hp)} / ${Math.round(t.stats.maxHp)}`, nx + hw / 2, y + 28);
    ctx.textAlign = 'left'; ctx.font = '600 10px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#c8cff5';
    ctx.fillText(`Công ${Math.round(t.stats.atk || 0)} · Giáp ${Math.round(t.stats.armor || 0)} · KP ${Math.round(t.stats.mr || 0)}`, nx, y + 43);
  }

  return {
    handle(ev, world, me) {
      if (ev.type === 'cast' && ev.slot === 's3' && ev.id === me && prefs().ultSplash) { const e = world.byId(ev.id); if (e?.heroId) ult(e.heroId); }
      if (ev.type === 'damage' && ev.src === me) lastHit = { id: ev.id, at: performance.now() };
    },
    draw(ctx, w, h, world, cam, player) {
      const p = prefs();
      if (p.edgeFoes) edges(ctx, w, h, world, cam, player);
      if (p.targetInfo && player.alive) target(ctx, w, h, world, player);
    },
  };
}
