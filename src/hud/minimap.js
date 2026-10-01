// Bản đồ nhỏ toàn bản đồ (07 §9): nền vẽ một lần (đất, sông, đường, tường, bụi), phía trên vẽ lại mỗi khung: công trình, lính, tướng, khung nhìn camera.
// Chưa có sương mù chiến trường nên hiện mọi đơn vị; sau này chỉ cần lọc theo tầm nhìn tại đây.
import { bushRects } from '../data/maps.js';
import * as THREE from 'three';
import { canSee } from '../sim/vision.js';

const TEAM = ['#38b8ff', '#ff4a3a'];
// Chú ý: bản đồ nhỏ chỉ hiện thứ đội mình thấy (02 §9); công trình luôn hiện.

export function createMinimap({ world, player, map, cam, fog = null, portraits = null }) {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.id = 'minimap';
  cv.style.cssText = 'position:fixed;z-index:4;left:max(8px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));border:2px solid #c9b47a;border-radius:6px;background:#0f1224;box-shadow:0 2px 12px #000a;touch-action:none';
  document.body.appendChild(cv);
  cv.addEventListener('pointerdown', (e) => e.stopPropagation()); // không kích hoạt joystick khi chạm bản đồ nhỏ

  let W = 0, H = 0, dpr = 1, sx = 1, sy = 1, bg = null;
  const wx = (x) => x * sx, wy = (y) => y * sy;
  const col = (e) => (e.team === player.team ? TEAM[0] : TEAM[1]); // đồng đội xanh, địch đỏ (như Liên Quân)

  function paintBackground(c) {
    c.fillStyle = '#4a8a4c'; c.fillRect(0, 0, W, H);
    // vùng ngoài viền (vách núi)
    const M = map.margin || 0;
    if (M) { c.fillStyle = '#34503a'; const mx = wx(M), my = wy(M); c.fillRect(0, 0, W, my); c.fillRect(0, H - my, W, my); c.fillRect(0, 0, mx, H); c.fillRect(W - mx, 0, mx, H); }
    // sông
    c.save();
    if (map.river.diag) { c.strokeStyle = '#4fb4d8'; c.lineWidth = map.river.width * sx; c.lineCap = 'butt'; c.beginPath(); c.moveTo(-50, -50); c.lineTo(W + 50, H + 50); c.stroke(); }
    else { c.fillStyle = '#4fb4d8'; c.fillRect(wx(map.river.x - map.river.width / 2), 0, map.river.width * sx, H); }
    c.restore();
    // đường
    c.lineJoin = 'round'; c.lineCap = 'butt';
    for (const ln of map.lanes) { c.strokeStyle = '#d6c79e'; c.lineWidth = ln.width * sx; strokePath(c, ln.pts); }
    // tường
    c.strokeStyle = '#3b3946'; c.lineCap = 'round';
    if (map.walls?.segs) { c.lineWidth = Math.max(1.5, map.walls.thickness * sx); for (const s of map.walls.segs) { c.beginPath(); c.moveTo(wx(s.x1), wy(s.y1)); c.lineTo(wx(s.x2), wy(s.y2)); c.stroke(); } }
    else if (map.walls?.ys) { c.lineWidth = Math.max(1.5, map.walls.thickness * sy); for (const y of map.walls.ys) { c.beginPath(); c.moveTo(0, wy(y)); c.lineTo(W, wy(y)); c.stroke(); } }
    // bụi cỏ: xanh ngọc đậm viền sáng, nổi hẳn trên nền cỏ (bụi giữa sông viền vàng: chốt quan trọng)
    for (const q of bushRects(map)) {
      if (q.cap) { // bụi chéo dọc sông: nét dày bo tròn
        const line = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(wx(q.cap[0]), wy(q.cap[1])); c.lineTo(wx(q.cap[2]), wy(q.cap[3])); c.stroke(); };
        line(q.r * 2 * sx + 3, q.river ? '#ffd86a' : '#6af0c4'); line(q.r * 2 * sx, '#0b4f45'); line(q.r * sx * 0.6, '#2fbf8f'); continue;
      }
      const x = wx(q.x - q.w / 2), y = wy(q.y - q.h / 2), w = Math.max(4, q.w * sx), h = Math.max(4, q.h * sy);
      c.beginPath(); c.roundRect(x, y, w, h, Math.min(w, h) * 0.45);
      c.fillStyle = '#0b4f45'; c.fill(); c.lineWidth = q.river ? 1.8 : 1.2; c.strokeStyle = q.river ? '#ffd86a' : '#6af0c4'; c.stroke();
      c.fillStyle = '#2fbf8f'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + w * (0.3 + k * 0.2), y + h * (k % 2 ? 0.4 : 0.6), Math.min(w, h) * 0.16, 0, 7); c.fill(); }
    }
  }
  function strokePath(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(wx(x), wy(y)) : c.moveTo(wx(x), wy(y)))); c.stroke(); }

  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    const box = Math.max(120, Math.min(230, Math.min(innerWidth, innerHeight) * 0.36)), long = map.w / map.h > 1.3 ? Math.min(box * 1.3, innerWidth * 0.3) : box; // bản 1v1 dẹt nên rộng hơn
    W = Math.round(map.w >= map.h ? long : long * (map.w / map.h)); H = Math.round(map.w >= map.h ? long * (map.h / map.w) : long);
    sx = W / map.w; sy = H / map.h;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
    const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground(c);
    document.documentElement.style.setProperty('--mmh', H + 'px'); document.documentElement.style.setProperty('--mmw', W + 'px'); // cửa hàng xếp ngay dưới
  }
  addEventListener('resize', resize); resize();

  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function viewPoly() {
    const pts = [];
    for (const [nx, ny] of corners) {
      ray.setFromCamera({ x: nx, y: ny }, cam.camera);
      if (!ray.ray.intersectPlane(ground, hit)) { ray.setFromCamera({ x: nx, y: Math.max(ny, -0.2) }, cam.camera); if (!ray.ray.intersectPlane(ground, hit)) return null; }
      pts.push([Math.max(0, Math.min(map.w, hit.x)), Math.max(0, Math.min(map.h, hit.z))]);
    }
    return pts;
  }

  return {
    canvas: cv,
    draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(bg, 0, 0, W, H);
      if (fog) { const r = fog.mapRect; ctx.drawImage(fog.canvas, r.x, r.y, r.w, r.h, 0, 0, W, H); } // vùng chưa thấy tối đi
      const ents = world.entities.filter((e) => canSee(player.team, e)); // địch ngoài tầm nhìn không hiện
      // công trình: trụ (tháp nhọn) và nhà chính (pha lê), màu đội; bị phá thì xám
      for (const e of ents) {
        if (!e.structure || e.noTarget || e.kind === 'fountain') continue;
        const x = wx(e.pos.x), y = wy(e.pos.y), c = e.alive ? col(e) : '#5a5a66';
        ctx.lineWidth = 1.4; ctx.strokeStyle = '#0b0d1a'; ctx.fillStyle = c;
        if (e.kind === 'core') { const r = 8; ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffffaa'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x + r * 0.35, y); ctx.lineTo(x, y + r * 0.2); ctx.closePath(); ctx.fill(); }
        else { const r = 5.2; ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x + r * 0.8, y + r); ctx.lineTo(x - r * 0.8, y + r); ctx.lineTo(x - r, y - r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0b0d1a99'; ctx.fillRect(x - r * 0.35, y - r * 0.2, r * 0.7, r * 0.6); }
      }
      for (const e of ents) if (e.kind === 'fountain') { ctx.strokeStyle = col(e); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wx(e.pos.x), wy(e.pos.y), 6, 0, 7); ctx.stroke(); }
      // lính
      for (const e of ents) if (e.kind === 'minion' && e.alive) { ctx.fillStyle = col(e); ctx.fillRect(wx(e.pos.x) - 1, wy(e.pos.y) - 1, 2, 2); }
      // khung nhìn camera
      const vp = viewPoly();
      if (vp) { ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1.2; ctx.beginPath(); vp.forEach(([x, y], i) => (i ? ctx.lineTo(wx(x), wy(y)) : ctx.moveTo(wx(x), wy(y)))); ctx.closePath(); ctx.stroke(); }
      // tướng: chân dung tròn viền màu đội (xanh mình, đỏ địch); người chơi vẽ sau cùng, viền trắng
      const heroes = ents.filter((e) => e.kind === 'hero' && e.alive).sort((a, b) => (a.id === player.id) - (b.id === player.id));
      const R = Math.max(10, Math.min(15, W * 0.075));
      for (const e of heroes) {
        const me = e.id === player.id, x = Math.max(R, Math.min(W - R, wx(e.pos.x))), y = Math.max(R, Math.min(H - R, wy(e.pos.y)));
        if (portraits) portraits.draw(ctx, e.heroId, e.data.name, x, y, me ? R * 1.12 : R, col(e), { me });
        else { ctx.fillStyle = col(e); ctx.beginPath(); ctx.arc(x, y, R * 0.6, 0, 7); ctx.fill(); }
      }
    },
  };
}
