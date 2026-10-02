import * as THREE from 'three';
import { createParticles } from './vfx/particles.js';
import { createShapes } from './vfx/shapes.js';
import { createLibrary } from './vfx/library.js';

// Hiệu ứng trận: hạt (cộng sáng + trộn thường), hình (sóng, vệt đất, cung chém, xoáy, khiên, cột sáng, xích, vệt vũ khí)
// và bộ hiệu ứng riêng từng tướng (vfx/library.js). Thêm vòng tầm bắn trụ địch (03 §A4 luật 7).
const add = (color, op = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const flat = (m) => { m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };

/** opts: { views (unitView), camera, renderer, shake(amount, dur), team (đội người chơi) } */
export function createFx(scene, opts = {}) {
  const A = createParticles(scene, { max: 2600, additive: true });
  const N = createParticles(scene, { max: 1600, additive: false });
  const sh = createShapes(scene);
  const lib = createLibrary({ A, N, sh, views: opts.views || { get: () => null }, shake: opts.shake || (() => {}), team: opts.team ?? 0 });
  const towerRings = new Map(), seenProj = new Set(), sz = new THREE.Vector2();

  if (typeof window !== 'undefined') window.__fxdbg = () => ({ add: A.count, norm: N.count, shapes: sh.count, trails: lib.dbg() });
  return {
    lib,
    handle(events, world) { lib.handle(events, world); },
    update(world, dt, player) {
      // vòng tầm bắn của trụ địch: hiện khi tướng mình lại gần 900, đỏ khi đang nhắm mình
      for (const s2 of world.entities) {
        if (!s2.structure || s2.noTarget || s2.team === player.team) continue;
        let r = towerRings.get(s2.id);
        if (!r) { r = flat(new THREE.Mesh(new THREE.RingGeometry(s2.stats.range - 8, s2.stats.range, 64), add(0xffffff, 0.5))); r.visible = false; r.position.set(s2.pos.x, 3, s2.pos.y); scene.add(r); towerRings.set(s2.id, r); }
        const d = Math.hypot(player.pos.x - s2.pos.x, player.pos.y - s2.pos.y);
        r.visible = s2.alive && player.alive && d < s2.stats.range + 900;
        r.material.color.setHex(s2.streakTarget === player.id && world.tick < s2.attackReady + 30 ? 0xff3a2a : 0xffd27a);
      }
      // đạn: lõi sáng + vệt theo chủ đề tướng
      const now = new Set();
      for (const p of world.projectiles) { now.add(p.id); const o = world.byId(p.owner); if (o) lib.projectile(p, o, dt); }
      for (const id of seenProj) if (!now.has(id)) lib.projectileGone(id);
      seenProj.clear(); for (const id of now) seenProj.add(id);
      lib.update(dt, world);
      if (opts.camera && opts.renderer) { opts.renderer.getDrawingBufferSize(sz); const s = sz.y / (2 * Math.tan((opts.camera.fov * Math.PI) / 360)); A.setScale(s); N.setScale(s); }
      A.update(dt); N.update(dt); sh.update(dt);
    },
  };
}
