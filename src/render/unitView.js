import * as THREE from 'three';
import { lerp, lerpAngle } from '../core/math.js';
import { loadHero, instantiate } from './assets.js';
import { createAnimator } from './animator.js';
import { createCapsule } from './placeholder/capsule.js';
import { createBlobShadow } from './shadows.js';

/** Entity mô phỏng ↔ object 3D. Render chỉ đọc trạng thái (nội suy prevPos → pos). */
export function createUnitViews(scene) {
  const views = new Map();
  const spawn = (e) => {
    const root = new THREE.Group();
    root.add(createBlobShadow(e.radius));
    scene.add(root);
    const v = { root, animator: null, angle: e.facing };
    views.set(e.id, v);
    const useCapsule = () => { const c = createCapsule(); root.add(c.object); v.animator = { update: (s, sp, dt) => c.update(s, sp, dt) }; };
    loadHero(e.heroId).then((m) => {
      if (!m) return useCapsule();
      const inst = instantiate(m);
      root.add(inst.object);
      v.animator = createAnimator(inst);
    }).catch(useCapsule);
    return v;
  };
  return {
    update(world, alpha, dt) {
      for (const e of world.entities) {
        const v = views.get(e.id) || spawn(e);
        v.root.position.set(lerp(e.prevPos.x, e.pos.x, alpha), 0, lerp(e.prevPos.y, e.pos.y, alpha));
        v.angle = lerpAngle(v.angle, e.facing, 1 - Math.exp(-18 * dt));
        v.root.rotation.y = -v.angle + Math.PI / 2; // model nhìn +Z (02 §13.1)
        v.animator?.update(e.speed > 1 ? 'Run' : 'Idle', e.speed, dt);
      }
    },
  };
}
