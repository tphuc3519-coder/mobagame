import * as THREE from 'three';

/**
 * Điều khiển clip: trạng thái nền Idle/Run (timeScale Run = moveSpeed / runRefSpeed) và clip hành động chạy một lần
 * (Attack/Cast/Ult/Death). Animation chỉ để nhìn; thời điểm gây sát thương do mô phỏng quyết định (02 §13.5).
 */
export function createAnimator({ object, animations, art }) {
  const mixer = new THREE.AnimationMixer(object);
  const map = art.clipMap || {};
  const actions = {};
  for (const clip of animations) actions[clip.name] = mixer.clipAction(clip);
  const clipOf = (n) => actions[map[n] || n];
  let cur = null, oneShot = null, time = 0, dead = false;
  const base = (name) => {
    const next = clipOf(name); if (!next || next === cur) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
    if (cur) cur.fadeOut(0.12);
    cur = next;
  };
  base('Idle');
  return {
    /** Phát clip hành động một lần. seconds: thời gian muốn clip chiếm (đòn đánh vừa khít nhịp đánh). */
    trigger(name, seconds = null, hold = false) {
      const a = clipOf(name); if (!a) return;
      const dur = a.getClip().duration;
      const scale = seconds ? Math.min(3, Math.max(0.5, dur / seconds)) : 1;
      a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = hold; a.timeScale = scale; a.fadeIn(0.06).play();
      if (cur && cur !== a) cur.fadeOut(0.06);
      if (oneShot && oneShot.a !== a) oneShot.a.fadeOut(0.06);
      oneShot = { a, end: time + dur / scale, hold };
      if (name === 'Death') dead = true;
    },
    revive() { dead = false; oneShot = null; cur = null; base('Idle'); },
    update(state, speed, dt, art2) {
      time += dt;
      if (oneShot && (time < oneShot.end || oneShot.hold)) { mixer.update(dt); return; }
      if (oneShot) { oneShot.a.fadeOut(0.12); oneShot = null; cur = null; }
      if (dead) { mixer.update(dt); return; }
      base(state);
      const run = clipOf('Run');
      if (state === 'Run' && run) run.timeScale = speed / ((art2 || art).runRefSpeed || 320);
      mixer.update(dt);
    },
  };
}
