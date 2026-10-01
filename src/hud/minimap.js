// Bản đồ nhỏ toàn bản đồ (07 §9): nền vẽ một lần (đất, sông, đường, tường, bụi), phía trên vẽ lại mỗi khung: công trình, lính, tướng, khung nhìn camera.
// Chưa có sương mù chiến trường nên hiện mọi đơn vị; sau này chỉ cần lọc theo tầm nhìn tại đây.
import * as THREE from 'three';

const TEAM = ['#5fe3d0', '#ff6a5a'];

export function createMinimap({ world, player, map, cam }) {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.id = 'minimap';
  cv.style.cssText = 'position:fixed;z-index:4;inset:auto;left:auto;right:max(10px,env(safe-area-inset-right));top:calc(max(10px,env(safe-area-inset-top)) + 44px);border:2px solid #f3e9d6aa;border-radius:8px;background:#0f1224;box-shadow:0 2px 10px #0008;touch-action:none;pointer-events:auto';
  document.body.appendChild(cv);
  cv.addEventListener('pointerdown', (e) => e.stopPropagation()); // không kích hoạt joystick khi chạm bản đồ nhỏ

  let W = 0, H = 0, dpr = 1, sx = 1, sy = 1, bg = null;
  const wx = (x) => x * sx, wy = (y) => y * sy;

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
    // bụi cỏ
    c.fillStyle = '#2f7a3a';
    for (const b of map.bushes || []) for (const q of [b, { ...b, ...map.mirror(b.x, b.y) }]) c.fillRect(wx(q.x - b.w / 2), wy(q.y - b.h / 2), b.w * sx, b.h * sy);
  }
  function strokePath(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(wx(x), wy(y)) : c.moveTo(wx(x), wy(y)))); c.stroke(); }

  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    const box = Math.max(110, Math.min(200, Math.min(innerWidth, innerHeight) * 0.3)), long = map.w / map.h > 1.3 ? Math.min(box * 1.3, innerWidth * 0.3) : box; // bản 1v1 dẹt nên rộng hơn
    W = Math.round(map.w >= map.h ? long : long * (map.w / map.h)); H = Math.round(map.w >= map.h ? long * (map.h / map.w) : long);
    sx = W / map.w; sy = H / map.h;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
    const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground(c);
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
      const ents = world.entities;
      // công trình
      for (const e of ents) {
        if (!e.structure || e.noTarget || e.kind === 'fountain') continue;
        const x = wx(e.pos.x), y = wy(e.pos.y), r = e.kind === 'core' ? 5.5 : 3.4;
        ctx.fillStyle = e.alive ? TEAM[e.team] : '#555';
        ctx.strokeStyle = '#0f1224'; ctx.lineWidth = 1.2;
        ctx.beginPath(); if (e.kind === 'core') ctx.arc(x, y, r, 0, 7); else ctx.rect(x - r, y - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
      }
      for (const e of ents) if (e.kind === 'fountain') { ctx.fillStyle = TEAM[e.team] + '88'; ctx.beginPath(); ctx.arc(wx(e.pos.x), wy(e.pos.y), 4, 0, 7); ctx.fill(); }
      // lính
      for (const e of ents) if (e.kind === 'minion' && e.alive) { ctx.fillStyle = TEAM[e.team]; ctx.fillRect(wx(e.pos.x) - 1, wy(e.pos.y) - 1, 2, 2); }
      // khung nhìn camera
      const vp = viewPoly();
      if (vp) { ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1.2; ctx.beginPath(); vp.forEach(([x, y], i) => (i ? ctx.lineTo(wx(x), wy(y)) : ctx.moveTo(wx(x), wy(y)))); ctx.closePath(); ctx.stroke(); }
      // tướng (người chơi vẽ sau cùng, to và có viền trắng)
      ctx.font = '700 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const heroes = ents.filter((e) => e.kind === 'hero' && e.alive).sort((a, b) => (a.id === player.id) - (b.id === player.id));
      for (const e of heroes) {
        const me = e.id === player.id, r = me ? 6 : 5, x = wx(e.pos.x), y = wy(e.pos.y);
        ctx.fillStyle = TEAM[e.team]; ctx.strokeStyle = me ? '#ffffff' : '#0f1224'; ctx.lineWidth = me ? 2 : 1.4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0f1224'; ctx.fillText((e.data.name || '?')[0], x, y + 0.5);
      }
    },
  };
}
