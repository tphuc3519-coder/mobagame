import * as THREE from 'three';

// Hiệu ứng tối thiểu dạng khối phát sáng, vòng và quạt (đủ đọc được kỹ năng; hạt để Mốc 6).
const COL = { 0: 0x5fe3d0, 1: 0xff6a4a };
const add = (color, op = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const flat = (m) => { m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };

export function createFx(scene) {
  const projs = new Map();
  const rings = [];
  const ballGeo = new THREE.SphereGeometry(1, 10, 8);

  const ring = (x, z, r, life, color, o = {}) => {
    const m = flat(new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r, 48), add(color, o.op ?? 0.7)));
    const disc = flat(new THREE.Mesh(new THREE.CircleGeometry(r, 40), add(color, o.fill ?? 0.14)));
    m.position.set(x, 4, z); disc.position.set(x, 3, z);
    scene.add(m, disc); rings.push({ m, disc, t: 0, life, grow: o.grow, r });
  };
  const cone = (ev, color) => {
    const half = (ev.angle * Math.PI) / 360, ang = Math.atan2(ev.dy, ev.dx);
    const m = flat(new THREE.Mesh(new THREE.CircleGeometry(ev.range, 24, -half, half * 2), add(color, 0.35)));
    const g = new THREE.Group(); g.position.set(ev.x, 4, ev.y); g.rotation.y = -ang; g.add(m); // +X cục bộ quay về hướng ra đòn
    scene.add(g); rings.push({ m: g, disc: null, t: 0, life: 0.25, fadeMats: [m.material] });
  };

  return {
    handle(events) {
      for (const ev of events) {
        const c = COL[ev.team] ?? 0xffffff;
        if (ev.type === 'aoe') ring(ev.x, ev.y, ev.radius, ev.dur, c, { op: ev.warn ? 0.9 : 0.6 });
        else if (ev.type === 'impact') ring(ev.x, ev.y, ev.radius, 0.35, 0xffffff, { op: 0.9, fill: 0.3 });
        else if (ev.type === 'cone') cone(ev, c);
      }
    },
    update(world, dt) {
      // đạn
      const seen = new Set();
      for (const p of world.projectiles) {
        seen.add(p.id);
        let m = projs.get(p.id);
        if (!m) {
          const owner = world.byId(p.owner);
          m = new THREE.Mesh(ballGeo, add(COL[owner?.team] ?? 0xffffff, 0.95));
          const basic = p.kind === 'basic'; m.scale.set(basic ? 14 : Math.max(18, (p.width || 40) * 0.4), basic ? 14 : Math.max(18, (p.width || 40) * 0.4), basic ? 14 : 40);
          scene.add(m); projs.set(p.id, m);
        }
        m.position.set(p.x, 100, p.y); m.rotation.y = -Math.atan2(p.dy, p.dx) + Math.PI / 2;
      }
      for (const [id, m] of projs) if (!seen.has(id)) { scene.remove(m); m.material.dispose(); projs.delete(id); }
      // vòng
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.t += dt;
        const k = Math.min(1, r.t / r.life);
        if (r.disc) { r.m.material.opacity *= 1 - dt * 1.5; if (r.grow) r.m.scale.setScalar(1 + k * 0.1); r.disc.material.opacity = Math.max(0, r.disc.material.opacity * (1 - dt * 0.5)); }
        for (const mt of r.fadeMats || []) mt.opacity = 0.35 * (1 - k);
        if (r.t >= r.life) { scene.remove(r.m); if (r.disc) scene.remove(r.disc); rings.splice(i, 1); }
      }
    },
  };
}
