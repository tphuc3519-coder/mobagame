import * as THREE from 'three';

/** Điều khiển clip theo trạng thái Idle/Run; timeScale Run = moveSpeed / runRefSpeed (02 §13.5). */
export function createAnimator({ object, animations, art }) {
  const mixer = new THREE.AnimationMixer(object);
  const map = art.clipMap || {};
  const actions = {};
  for (const name of ['Idle', 'Run']) {
    const clip = THREE.AnimationClip.findByName(animations, map[name] || name);
    if (clip) actions[name] = mixer.clipAction(clip);
  }
  let cur = null;
  const set = (name) => {
    const next = actions[name]; if (!next || next === cur) return;
    next.reset().fadeIn(0.12).play();
    if (cur) cur.fadeOut(0.12);
    cur = next;
  };
  set('Idle');
  return {
    update(state, speed, dt) {
      set(state);
      if (state === 'Run' && actions.Run) actions.Run.timeScale = speed / (art.runRefSpeed || 320);
      mixer.update(dt);
    },
  };
}
