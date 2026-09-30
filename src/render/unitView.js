import * as THREE from 'three';
import { lerp, lerpAngle } from '../core/math.js';
import { loadHero, instantiate } from './assets.js';
import { createAnimator } from './animator.js';
import { createCapsule } from './placeholder/capsule.js';
import { createDummy } from './placeholder/dummy.js';
import { createBlobShadow } from './shadows.js';
import { prepareUnitMaterials, RIM } from './materials.js';

const CAST_CLIP = { s1: 'Cast1', s2: 'Cast2', s3: 'Ult' };

/** Entity mô phỏng ↔ object 3D. Render chỉ đọc trạng thái (nội suy prevPos → pos). */
export function createUnitViews(scene, localTeam, localId) {
  const views = new Map();
  const spawn = (e) => {
    const root = new THREE.Group();
    root.add(createBlobShadow(e.radius));
    scene.add(root);
    const v = { root, animator: null, mats: null, angle: e.facing, lift: null, flash: 0, ghost: false, art: null, dead: false };
    views.set(e.id, v);
    const rim = e.id === localId ? RIM.self : e.team === localTeam ? RIM.ally : RIM.enemy;
    const attach = (obj) => { root.add(obj); v.mats = prepareUnitMaterials(obj, rim); };
    if (e.kind === 'dummy') { const d = createDummy(); attach(d.object); return v; }
    const useCapsule = () => { const c = createCapsule(); attach(c.object); v.animator = { update: (s, sp, dt) => c.update(s, sp, dt), trigger() {}, revive() {} }; };
    loadHero(e.heroId).then((m) => {
      if (!m) return useCapsule();
      const inst = instantiate(m); attach(inst.object);
      v.art = inst.art; v.animator = createAnimator(inst);
    }).catch(useCapsule);
    return v;
  };
  return {
    handle(events) {
      for (const ev of events) {
        const v = views.get(ev.id);
        if (ev.type === 'attack') v?.animator?.trigger(ev.n % 2 ? 'Attack1' : 'Attack2', Math.min(0.9, ev.interval * 0.95));
        else if (ev.type === 'cast') v?.animator?.trigger(CAST_CLIP[ev.slot], ev.slot === 's3' ? 1.2 : 0.7);
        else if (ev.type === 'damage' && v) v.flash = 0.08;
        else if (ev.type === 'knockup' && v) v.lift = { t: 0, dur: ev.dur, h: 130 };
        else if (ev.type === 'jump' && v) v.lift = { t: 0, dur: ev.dur, h: 320 };
        else if (ev.type === 'death' && v) { v.animator?.trigger('Death', null, true); v.dead = true; }
        else if (ev.type === 'respawn' && v) { v.animator?.revive(); v.dead = false; }
      }
    },
    update(world, alpha, dt) {
      for (const e of world.entities) {
        const v = views.get(e.id) || spawn(e);
        const y = v.lift ? Math.sin(Math.min(1, v.lift.t / v.lift.dur) * Math.PI) * v.lift.h : 0;
        if (v.lift) { v.lift.t += dt; if (v.lift.t >= v.lift.dur) v.lift = null; }
        v.root.position.set(lerp(e.prevPos.x, e.pos.x, alpha), y, lerp(e.prevPos.y, e.pos.y, alpha));
        v.angle = lerpAngle(v.angle, e.facing, 1 - Math.exp(-18 * dt));
        v.root.rotation.y = -v.angle + Math.PI / 2; // model nhìn +Z (02 §13.1)
        if (v.mats) {
          v.flash = Math.max(0, v.flash - dt); v.mats.setFlash(v.flash > 0 ? 0.6 : 0);
          const ghost = e.statuses.some((s) => s.kind === 'stealth');
          if (ghost !== v.ghost) { v.ghost = ghost; v.mats.setGhost(ghost); }
          v.root.visible = !(ghost && e.team !== localTeam);
        }
        v.animator?.update(e.speed > 1 ? 'Run' : 'Idle', e.speed, dt, v.art);
      }
    },
  };
}
