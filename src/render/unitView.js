import * as THREE from 'three';
import { lerp, lerpAngle } from '../core/math.js';
import { loadHero, instantiate } from './assets.js';
import { createAnimator } from './animator.js';
import { createCapsule } from './placeholder/capsule.js';
import { createDummy } from './placeholder/dummy.js';
import { createBlobShadow } from './shadows.js';
import { prepareUnitMaterials, RIM } from './materials.js';
import { createTower, createCore, createFountain, createMinion } from './structures.js';
import { canSee, bushAt } from '../sim/vision.js';
import { createMonster } from './monsters.js';

const CAST_CLIP = { s1: 'Cast1', s2: 'Cast2', s3: 'Ult' };
/** Tướng trong trận to hơn tỉ lệ gốc (bớt cảm giác chibi khi nhìn từ camera trên cao); bán kính va chạm mô phỏng giữ nguyên. */
export const HERO_SCALE = 1.35;
/** Nhân vật đổ bóng thật (khi bật bóng ở mức Vừa/Cao); vật trong suốt/cộng sáng thì không. */
const castShadows = (obj) => obj.traverse((m) => { if (m.isMesh && m.material?.depthWrite !== false && m.material?.blending !== THREE.AdditiveBlending && m.material?.side !== THREE.BackSide) m.castShadow = true; });

/** Entity mô phỏng ↔ object 3D. Render chỉ đọc trạng thái (nội suy prevPos → pos). */
export function createUnitViews(scene, localTeam, localId) {
  const views = new Map();
  const spawn = (e, world) => {
    const root = new THREE.Group();
    scene.add(root);
    const v = { root, animator: null, mats: null, angle: e.facing, lift: null, flash: 0, ghost: false, art: null, part: null, fall: 0 };
    views.set(e.id, v);
    if (!e.structure) { v.blob = createBlobShadow(e.kind === 'hero' ? e.radius * 1.25 : e.radius); scene.add(v.blob); } // bóng tiếp đất: không xoay theo nhân vật
    if (e.kind === 'tower' || e.kind === 'core' || e.kind === 'fountain') {
      v.part = e.kind === 'tower' ? createTower(e.team) : e.kind === 'core' ? createCore(e.team) : createFountain(e.team, Math.min(1, (world.map.fountain?.healRadius || 650) / 650));
      if (e.kind === 'fountain') { const m = world.map, a = Math.atan2(m.h / 2 - e.pos.y, m.w / 2 - e.pos.x); v.part.object.rotation.y = -a + Math.PI / 2; } // lối vào quay ra giữa bản đồ
      if (e.kind === 'core' && e.radius < 200) v.part.object.scale.setScalar(0.72); // bản 1v1 hẹp: tế đàn thu nhỏ để nằm gọn giữa hai tường
      root.add(v.part.object); return v;
    }
    if (e.kind === 'minion') { v.part = createMinion(e.minionType, e.team); root.add(v.part.object); castShadows(v.part.object); v.atk = 0; return v; }
    if (e.kind === 'monster') { v.part = createMonster(e.monsterType, e.member); root.add(v.part.object); castShadows(v.part.object); v.atk = 0; return v; }
    const rim = e.id === localId ? RIM.self : e.team === localTeam ? RIM.ally : RIM.enemy;
    const attach = (obj, art) => { root.add(obj); v.mats = prepareUnitMaterials(obj, rim, { shading: art?.shading, outline: art?.outline !== false }); castShadows(obj); };
    if (e.kind === 'dummy') { attach(createDummy().object); return v; }
    const useCapsule = () => { const c = createCapsule(); c.object.scale.multiplyScalar(HERO_SCALE); attach(c.object); v.animator = { update: (s, sp, dt) => c.update(s, sp, dt), trigger() {}, revive() {} }; };
    loadHero(e.heroId).then((m) => {
      if (!m) return useCapsule();
      const inst = instantiate(m); inst.object.scale.multiplyScalar(HERO_SCALE); attach(inst.object, inst.art);
      // sải chân dài theo tỉ lệ → tốc độ phát clip chạy chia cho tỉ lệ để chân không trượt; chiều cao cho hiệu ứng bám đầu
      v.art = { ...inst.art, runRefSpeed: (inst.art.runRefSpeed || 320) * HERO_SCALE, height: (inst.art.height || 250) * HERO_SCALE }; v.animator = createAnimator(inst);
      v.bones = Object.fromEntries(['HandR', 'HandR_Tip', 'HandL', 'HandL_Tip', 'Head', 'Chest'].map((n) => [n, inst.object.getObjectByName('Bone_' + n)]).filter(([, b]) => b)); // cho hiệu ứng bám xương (vệt vũ khí, sao choáng)
    }).catch(useCapsule);
    return v;
  };
  return {
    get: (id) => views.get(id),
    handle(events) {
      for (const ev of events) {
        const v = views.get(ev.id);
        if (ev.type === 'attack' && v && v.atk !== undefined) v.atk = 0.001;
        if (ev.type === 'attack') v?.animator?.trigger(ev.n % 2 ? 'Attack1' : 'Attack2', Math.min(0.9, ev.interval * 0.95), false, ev.delay);
        else if (ev.type === 'cast') v?.animator?.trigger(CAST_CLIP[ev.slot], ev.slot === 's3' ? 1.2 : 0.7, false, ev.delay ?? 0);
        else if (ev.type === 'damage' && v) v.flash = 0.08;
        else if (ev.type === 'knockup' && v) v.lift = { t: 0, dur: ev.dur, h: 130 };
        else if (ev.type === 'jump' && v) v.lift = { t: 0, dur: ev.dur, h: 320 };
        else if (ev.type === 'death' && v) v.animator?.trigger('Death', null, true);
        else if (ev.type === 'respawn' && v) v.animator?.revive();
      }
    },
    update(world, alpha, dt) {
      const alive = new Set();
      for (const e of world.entities) {
        alive.add(e.id);
        const v = views.get(e.id) || spawn(e, world);
        const y = v.lift ? Math.sin(Math.min(1, v.lift.t / v.lift.dur) * Math.PI) * v.lift.h : 0;
        if (v.lift) { v.lift.t += dt; if (v.lift.t >= v.lift.dur) v.lift = null; }
        v.root.position.set(lerp(e.prevPos.x, e.pos.x, alpha), y, lerp(e.prevPos.y, e.pos.y, alpha));
        if (v.blob) { v.blob.position.set(v.root.position.x, 0, v.root.position.z); v.blob.visible = e.alive && v.root.visible !== false; const k = 1 - Math.min(0.5, y / 400); v.blob.scale.setScalar(k); }
        if (e.structure) { v.part?.update(dt, e.hp / e.stats.maxHp, !e.alive); continue; }
        v.angle = lerpAngle(v.angle, e.facing, 1 - Math.exp(-18 * dt));
        v.root.rotation.y = -v.angle + Math.PI / 2; // model nhìn +Z (02 §13.1)
        const seen = canSee(localTeam, e); // sương mù / bụi cỏ: địch ngoài tầm nhìn không vẽ
        if (e.kind === 'monster') {
          v.root.visible = seen; if (v.atk > 0) { v.atk += dt / 0.7; if (v.atk >= 1) v.atk = 0; }
          v.part?.update(dt, e.speed > 1, v.atk);
          if (!e.alive) { v.fall = Math.min(1, v.fall + dt * 1.5); v.root.scale.setScalar(1 - v.fall * 0.95); v.root.position.y -= v.fall * 60; }
          continue;
        }
        if (e.kind === 'minion') { v.root.visible = seen; if (v.atk > 0) { v.atk += dt / 0.6; if (v.atk >= 1) v.atk = 0; } v.part?.update(dt, e.speed > 1, v.atk); if (!e.alive) { v.fall = Math.min(1, v.fall + dt * 3); v.root.scale.setScalar(1 - v.fall * 0.9); v.root.rotation.z = v.fall * 1.2; } continue; }
        if (v.mats) {
          v.flash = Math.max(0, v.flash - dt); v.mats.setFlash(v.flash > 0 ? 0.6 : v.ghost ? 0.14 : 0); // trong bụi: sáng lên chút để không chìm vào màu bụi tối v.mats.update(dt);
          const inBush = e.team === localTeam && !!world.map.vision && !!bushAt(world.map, e.pos); // mình đứng trong bụi: mờ đi như Liên Quân
          const ghost = e.statuses.some((s) => s.kind === 'stealth') || inBush;
          if (ghost !== v.ghost) { v.ghost = ghost; v.mats.setGhost(ghost); }
          v.root.visible = seen && !(ghost && e.team !== localTeam);
        }
        v.animator?.update(e.speed > 1 ? 'Run' : 'Idle', e.speed, dt, v.art);
      }
      for (const [id, v] of views) if (!alive.has(id)) { scene.remove(v.root); if (v.blob) scene.remove(v.blob); views.delete(id); }
    },
  };
}
