import * as THREE from 'three';
import { loadHero, peekHero, instantiate } from '../render/assets.js';
import { prepareUnitMaterials, setOutlineResolution } from '../render/materials.js';
import { glowTexture } from '../render/env/textures.js';
import { makeEnvMap } from '../render/lights.js';
import { createSplash } from './splash.js';

// Cảnh trưng bày (02 §13.9): bệ đá sen phát sáng, ánh sáng 3 điểm (key ấm, fill lạnh, rim màu tướng), đèn trời bay,
// bụi sáng lung linh, bloom. Vuốt ngang xoay 360°, chạm đúp phát Victory; đổi tướng: tan thành hạt → hiện ra.
function lotusTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.translate(256, 256); x.strokeStyle = '#ffd89a'; x.lineWidth = 3; x.globalAlpha = 0.9;
  for (const r of [230, 200, 120]) { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
  for (let i = 0; i < 16; i++) { x.save(); x.rotate((i / 16) * Math.PI * 2); x.beginPath(); x.moveTo(0, -120); x.quadraticCurveTo(42, -165, 0, -198); x.quadraticCurveTo(-42, -165, 0, -120); x.stroke(); x.restore(); }
  for (let i = 0; i < 48; i++) { x.save(); x.rotate((i / 48) * Math.PI * 2); x.fillStyle = '#ffe7b8'; x.fillRect(-2, -222, 4, 12); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function backdrop() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
      vec3 c = mix(vec3(0.36,0.18,0.20), vec3(0.09,0.08,0.20), smoothstep(-0.05, 0.35, h)); c = mix(c, vec3(0.03,0.04,0.11), smoothstep(0.35, 0.9, h));
      float glow = exp(-pow((h + 0.02) * 7.0, 2.0)); c += vec3(0.9, 0.5, 0.25) * glow * 0.35; gl_FragColor = vec4(c, 1.0); }`,
  }));
  return m;
}

export function pedestal() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a3450, roughness: 0.55, metalness: 0.15 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.35, metalness: 0.8 });
  const a = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.22, 64), stone); a.position.y = -0.11; g.add(a);
  const b = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.035, 8, 96), trim); b.rotation.x = Math.PI / 2; g.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.16, 64), stone); c.position.y = -0.3; g.add(c);
  const rune = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.MeshBasicMaterial({ map: lotusTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffb85c }));
  rune.rotation.x = -Math.PI / 2; rune.position.y = 0.006; g.add(rune);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.02, 8, 128), new THREE.MeshBasicMaterial({ color: 0xffc070 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; g.add(ring);
  // cột sáng mờ
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 3.2, 48, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uCol: { value: new THREE.Color(0xffb060) }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uCol; uniform float uT; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 2.2) * 0.22 * (0.8 + 0.2 * sin(vUv.x * 40.0 + uT * 2.0)); gl_FragColor = vec4(uCol * a, a); }',
  }));
  beam.position.y = 1.6; g.add(beam);
  return { group: g, rune, ring, beam };
}

export function lanterns(n = 26) {
  const g = new THREE.Group(), list = [];
  const body = new THREE.CylinderGeometry(0.07, 0.055, 0.14, 8), mat = new THREE.MeshBasicMaterial({ color: 0xffa24a });
  const halo = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a40, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 });
  for (let i = 0; i < n; i++) {
    const l = new THREE.Group(); l.add(new THREE.Mesh(body, mat)); const s = new THREE.Sprite(halo); s.scale.setScalar(0.55); l.add(s);
    const a = (i / n) * Math.PI * 2 + i, r = 3 + (i * 37 % 9);
    l.userData = { a, r, y: (i * 0.73) % 7 - 1, sp: 0.12 + (i % 5) * 0.03 };
    g.add(l); list.push(l);
  }
  return { group: g, update(t, dt) { for (const l of list) { const u = l.userData; u.y += dt * u.sp; if (u.y > 7) u.y = -1; l.position.set(Math.cos(u.a + t * 0.02) * u.r, u.y, Math.sin(u.a + t * 0.02) * u.r - 3); l.rotation.y += dt * 0.3; } } };
}

export function sparkles(n = 220) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = i * 2.39996, r = 0.4 + (i % 17) / 17 * 1.6; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (i * 0.618 % 1) * 2.6; pos[i * 3 + 2] = Math.sin(a) * r; ph[i] = i * 1.7; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(0xffd28a) }, uMap: { value: glowTexture() }, uH: { value: 800 } },
    vertexShader: `attribute float ph; uniform float uT, uH; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uT * 0.25 + ph * 0.1, 2.6);
      float a = uT * 0.3 + ph; p.xz = mat2(cos(a*0.1), -sin(a*0.1), sin(a*0.1), cos(a*0.1)) * p.xz;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = (0.4 + 0.6 * pow(0.5 + 0.5 * sin(uT * 3.0 + ph * 5.0), 3.0)) * smoothstep(2.6, 1.6, p.y) * smoothstep(0.0, 0.3, p.y);
      gl_PointSize = uH * 0.028 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform sampler2D uMap; uniform vec3 uCol; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; gl_FragColor = vec4(uCol * a * 1.6, a); }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return { object: pts, mat };
}

/** Một tướng trên sân khấu trưng bày: bản sao model (đơn vị mét), vật liệu, bộ trộn clip. ctx: { renderer, env } — env map PBR tạo khi cần, dùng chung. */
export function makeHolder(m, id, ctx) {
  const inst = instantiate(m), obj = inst.object; obj.scale.multiplyScalar(0.01); // cm → m cho cảnh trưng bày
  const sh = inst.art.showcaseShading || inst.art.shading; // sảnh có thể dùng kiểu khác trong trận (bản trưng bày chi tiết)
  if (sh === 'pbr' && !ctx.env) ctx.env = makeEnvMap(ctx.renderer);
  const mats = prepareUnitMaterials(obj, inst.art.rim || '#ffd28a', { rim: 0.35, shading: sh, envMap: ctx.env, outline: (inst.art.showcaseOutline ?? inst.art.outline) !== false });
  const mixer = new THREE.AnimationMixer(obj), acts = {};
  for (const c of inst.animations) acts[c.name] = mixer.clipAction(c);
  const g = new THREE.Group(); g.add(obj);
  const h = (inst.art.height || 190) / 100;
  let base = null, shot = null;
  const play = (name) => { const a = acts[name]; if (!a) return; shot = name; a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.fadeIn(0.15).play(); base?.fadeOut(0.15);
    mixer.addEventListener('finished', function f(ev) { if (ev.action === a) { mixer.removeEventListener('finished', f); if (shot === name) shot = null; a.fadeOut(0.3); base?.reset().fadeIn(0.3).play(); } }); };
  // tầm với: độ cao cao nhất các xương (mũi vũ khí, bàn tay, đỉnh đầu) trong clip trưng bày + dáng đứng ở sảnh → khung hình chứa trọn vũ khí
  let reach = 0;
  { const v = new THREE.Vector3(), tips = []; obj.traverse((o) => { if (o.isBone && /Hand(L|R)(_Tip)?$/.test(o.name)) tips.push([o, /_Tip$/.test(o.name) ? 0.3 : 0.12]); }); // mũi vũ khí: + nửa đầu vũ khí
    for (const nm of ['Showcase', 'ShowIdle', 'Idle']) { const a = acts[nm]; if (!a) continue; const d = a.getClip().duration; a.reset().play();
      for (let k = 0; k <= 20; k++) { mixer.setTime((d * k) / 20); obj.updateMatrixWorld(true); for (const [b, m] of tips) reach = Math.max(reach, b.getWorldPosition(v).y + m); }
      a.stop(); }
    mixer.setTime(0); }
  base = acts.ShowIdle || acts.Idle; base?.play(); // ShowIdle: dáng đứng riêng cho sảnh (vd Emberforge chống búa thay vì vác búa khuất sau lưng)
  /** Nhận trạng thái clip của holder khác (cùng bộ xương, cùng clip) để đổi sang bản trưng bày mà không giật. */
  const syncFrom = (o) => {
    const w = (a) => (a ? a.getEffectiveWeight() : 0);
    if (o.shot) { play(o.shot); const a = acts[o.shot], b = o.acts[o.shot]; a.time = b.time; a.stopFading().setEffectiveWeight(w(b)); }
    if (base && o.base) { base.time = o.base.time; base.stopFading().setEffectiveWeight(w(o.base)); }
  };
  /** Đứng yên ở một khung của clip (dựng ảnh, màn đội hình). */
  const freeze = (name, time) => { const a = acts[name]; if (!a) return false; mixer.stopAllAction(); shot = null; a.reset().play(); a.paused = true; a.time = Math.min(time, a.getClip().duration); mixer.update(0); return true; };
  return { id, g, mixer, mats, h, reach, art: inst.art, play, freeze, life: 0, out: 0, acts, syncFrom, get shot() { return shot; }, get base() { return base; } };
}

/** Canvas nền trong suốt (kênh alpha nhân sẵn): vật liệu cộng màu (quầng sáng, tia, hạt) chỉ cộng vào RGB, giữ nguyên alpha — điểm ảnh
 *  alpha 0 mà có màu thì trình duyệt cộng ánh sáng đó lên ảnh phông phía sau; để mặc định (SRC_ALPHA, ONE cho cả alpha) thì chỗ có quầng
 *  sáng thành đục, che mất phông. */
function keepAlpha(root) {
  root.traverse((o) => {
    for (const m of [o.material].flat()) {
      if (!m || m.blending !== THREE.AdditiveBlending) continue;
      m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
      m.needsUpdate = true;
    }
  });
}

/**
 * Cảnh trưng bày một tướng (màn chọn tướng, sảnh chính, màn đội hình). o: { quality, stand (bệ đá, mặc định có), autoSpin (tự xoay chậm),
 * preserve (giữ bộ đệm vẽ để đọc ảnh — công cụ dựng ảnh) }.
 */
export function createShowcase(canvas, { quality = 'mid', stand = true, autoSpin = true, preserve = false, transparent = false } = {}) {
  // transparent: nền trong suốt (sảnh vẽ ảnh phông dựng sẵn phía sau canvas); ánh sáng cộng màu (đèn trời, bụi sáng) vẫn hiện đúng nhờ
  // kênh alpha nhân sẵn (điểm ảnh alpha 0 mà có màu = ánh sáng cộng lên phông)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, premultipliedAlpha: transparent, powerPreference: 'high-performance', preserveDrawingBuffer: preserve });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  if (transparent) renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(); if (!transparent) scene.add(backdrop()); scene.fog = new THREE.Fog(0x14122a, 12, 60);
  const splash = createSplash(); scene.add(splash.group);
  if (transparent) splash.clouds.visible = false; // mây xoáy là tấm nền đục — phông đã có ảnh dựng sẵn
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xbcc8ff, 0x4a3040, 0.65));
  const key = new THREE.DirectionalLight(0xfff6ec, 2.4); key.position.set(1.5, 3, 5); scene.add(key); // đèn chính trước mặt để tướng nổi trên phông
  const fill = new THREE.DirectionalLight(0x8ab4ff, 0.9); fill.position.set(-3, 2, 2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0); rim.position.set(-1.5, 3, -4); scene.add(rim);
  const warm = new THREE.PointLight(0xffa050, 1.0, 5, 1.5); warm.position.set(0, 0.35, 0.9); scene.add(warm);
  const ped = pedestal(); ped.group.visible = stand; scene.add(ped.group);
  const lan = lanterns(); scene.add(lan.group);
  const sp = sparkles(); scene.add(sp.object);
  const stage = new THREE.Group(); scene.add(stage);

  // Vẽ thẳng ra màn hình (không hậu kỳ): so sánh A/B cho thấy hậu kỳ làm nhạt màu tướng; đèn đã có quầng sáng riêng.

  let W = 1, H = 1, offX = 0;
  const resize = () => {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    const pr = Math.min(devicePixelRatio, quality === 'high' ? 2 : 1.5);
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.clearViewOffset(); if (offX) camera.setViewOffset(W, H, -offX, 0, W, H); camera.updateProjectionMatrix();
    setOutlineResolution(W * pr, H * pr); sp.mat.uniforms.uH.value = H * pr;
  };
  addEventListener('resize', resize); resize();

  const SPIN0 = -0.35; // góc 3/4 mặt trước; không tự xoay (sảnh): thả tay thì từ từ quay về góc này
  let SPIN_V = autoSpin ? 0.12 : 0;
  let cur = null, next = null, spin = SPIN0, spinV = SPIN_V, t = 0, running = true, drag = null, lastTap = 0, req = 0;
  let view = { zoom: 1, dy: 0, dx: 0.25 }; // khung hình: zoom > 1 = tướng to hơn; dy dịch tâm nhìn (theo chiều cao tướng)
  const rimCol = new THREE.Color();
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; const now = performance.now(); if (now - lastTap < 300) cur?.play('Victory'); lastTap = now; });
  const onMove = (e) => { if (!drag) return; spinV = 0; spin += (e.clientX - drag.x) * 0.012; drag.x = e.clientX; };
  const onUp = () => { if (!drag) return; drag = null; setTimeout(() => { if (!drag) spinV = SPIN_V; }, 1500); };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  const frameCam = () => { // khung theo chiều cao tướng, gồm cả vũ khí giơ cao (tầm với của xương + nửa đầu vũ khí); zoom 1: tướng ~52% chiều cao khung
    if (!cur) return; const hh = Math.max(1.6, cur.h, cur.reach || 0), z = view.zoom;
    camera.position.set(view.dx, hh * (0.47 + view.dy), (hh * 3.15 + 1.3) / z); camera.lookAt(view.dx, hh * (0.56 + view.dy), 0);
  };

  const hctx = { renderer, env: null }; // env map PBR dùng chung cho các tướng của cảnh này
  const drop = (g) => g.traverse((o) => { if (o.isSkinnedMesh) o.skeleton?.dispose(); }); // tướng cũ rời sân khấu: giải phóng texture xương
  const holder = (m, id) => makeHolder(m, id, hctx);

  const burst = (() => { // hạt sáng khi đổi tướng
    const n = 160, pos = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) vel.push(new THREE.Vector3());
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: glowTexture(), size: 0.09, color: 0xffd08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat); pts.visible = false; pts.frustumCulled = false; scene.add(pts); let life = 0;
    return { fire(h) { for (let i = 0; i < n; i++) { pos[i * 3] = (Math.sin(i * 12.9) * 0.35); pos[i * 3 + 1] = (i / n) * h; pos[i * 3 + 2] = Math.cos(i * 7.3) * 0.3; vel[i].set(Math.sin(i * 3.1) * 0.6, 0.6 + (i % 7) * 0.2, Math.cos(i * 5.7) * 0.6); } life = 1.2; pts.visible = true; },
      update(dt) { if (!pts.visible) return; life -= dt; mat.opacity = Math.max(0, life / 1.2); for (let i = 0; i < n; i++) { pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; } geo.attributes.position.needsUpdate = true; if (life <= 0) pts.visible = false; } };
  })();

  async function show(id) {
    const token = (next = id);
    // bản trưng bày (chi tiết, nặng) nạp sau: hiện ngay bản trong trận rồi đổi sang khi xong; đã nạp sẵn thì dùng luôn.
    // Tải lỗi (mạng chập chờn): giữ tướng đang đứng, thử lại dần chừng nào tướng này vẫn đang được chọn (sân khấu hiện "Đang tải tướng…").
    let m = peekHero(id, { showcase: true }) || peekHero(id);
    for (let a = 0; !m; a++) {
      m = await loadHero(id); if (next !== token) return;
      if (!m) { await new Promise((r) => setTimeout(r, Math.min(8000, 1500 * (a + 1)))); if (next !== token) return; }
    }
    if (m.art.showcase && !m.showcase) loadHero(id, { showcase: true }).then((hq) => {
      if (!hq?.showcase || next !== token || cur?.id !== id || cur.showcase) return;
      const h2 = holder(hq, id); h2.showcase = true; if (transparent) keepAlpha(h2.g); h2.life = cur.life; h2.g.scale.copy(cur.g.scale); h2.syncFrom(cur);
      stage.remove(cur.g); drop(cur.g); stage.add(h2.g); cur = h2;
    });
    const h = holder(m, id); h.showcase = !!m.showcase; if (transparent) keepAlpha(h.g);
    if (cur) { cur.out = 0.001; burst.fire(cur.h); }
    const old = cur; cur = h; h.g.scale.setScalar(0.001); stage.add(h.g); h.play('Showcase');
    spin = -0.35 - Math.round((spin + 0.35) / (Math.PI * 2)) * Math.PI * 2; // quay lại góc 3/4 mặt trước
    if (old) setTimeout(() => { stage.remove(old.g); drop(old.g); }, 400);
    rimCol.set(h.art.rim || '#ffd28a'); rim.color.copy(rimCol).lerp(new THREE.Color(0xffffff), 0.35); ped.beam.material.uniforms.uCol.value.copy(rimCol);
    sp.mat.uniforms.uCol.value.copy(rimCol).lerp(new THREE.Color(0xffe0a0), 0.5);
    const pal = h.art.palette || [], cA = new THREE.Color(pal[1] || h.art.rim || '#ff9a40'), cB = new THREE.Color(pal[2] || '#ffe0a0');
    splash.setColors(cA, cB);
    frameCam();
    return h;
  }

  function frame(now) {
    if (!running) return;
    req = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now; t += dt;
    spin += spinV * dt; if (!SPIN_V && !drag) spin += (SPIN0 - spin) * Math.min(1, dt * 2.5);
    stage.rotation.y = spin;
    for (const h of stage.children.map((g) => (cur && cur.g === g ? cur : null)).filter(Boolean)) {
      h.life += dt; const s = Math.min(1, h.life / 0.45); h.g.scale.setScalar(0.001 + (1 - Math.pow(1 - s, 3)) * 0.999);
      h.mats.setFlash(Math.max(0, 0.6 - h.life * 1.5)); h.mats.update(dt); h.mixer.update(dt);
    }
    stage.children.forEach((g) => { if (!cur || g !== cur.g) g.scale.multiplyScalar(Math.max(0, 1 - dt * 9)); });
    ped.rune.rotation.z = t * 0.15; ped.beam.material.uniforms.uT.value = t; sp.mat.uniforms.uT.value = t;
    lan.update(t, dt); burst.update(dt); splash.update(t, H * renderer.getPixelRatio());
    renderer.render(scene, camera);
  }
  req = requestAnimationFrame(frame);
  if (transparent) keepAlpha(scene);

  /** Ảnh chân dung (dataURL) chụp đầu tướng, dùng cho thẻ trong lưới. */
  async function portrait(id, size = 128) {
    const m = await loadHero(id); if (!m) return null;
    const h = holder(m, id), sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xdde4ff, 0x40303a, 1.2)); const k = new THREE.DirectionalLight(0xffe8d0, 2.4); k.position.set(1, 2, 3); sc.add(k);
    const r2 = new THREE.DirectionalLight(new THREE.Color(h.art.rim || '#fff'), 3); r2.position.set(-2, 2, -3); sc.add(r2);
    sc.add(h.g); h.mixer.update(0.01); h.g.updateMatrixWorld(true);
    const head = new THREE.Vector3(); let bone = null; h.g.traverse((o) => { if (o.name === 'Bone_Head') bone = o; });
    if (bone) bone.getWorldPosition(head); else head.set(0, h.h * 0.85, 0);
    const pf = h.art.portrait || {}; // art.json có thể chỉnh khung cho tướng đầu to / người lớn (dist: khoảng cách, dy: dịch xuống)
    const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20); cam.position.set(head.x + 0.1, head.y + 0.2 + (pf.dy || 0), head.z + (pf.dist || 1.2)); cam.lookAt(head.x, head.y + 0.1 + (pf.dy || 0), head.z);
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(null);
    const px = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, px); rt.dispose();
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), img = x.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    x.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  return {
    show, portrait, scene, stage, camera, renderer,
    get current() { return cur; },
    /** Tướng đang được yêu cầu hiện (có thể chưa tải xong) và độ lệch tâm cảnh (px) — cho dòng "Đang tải tướng…". */
    get wanted() { return next; },
    get offsetX() { return offX; },
    /** Dời tâm cảnh sang phải (px) để chừa chỗ cho lưới tướng bên trái. */
    setOffset(px) { offX = px; resize(); },
    /** Đổi khung hình: { zoom, dy, dx } (sảnh: tướng to, giữa màn). */
    frame(v) { view = { ...view, ...v }; frameCam(); },
    /** Phát một động tác (Victory…) / đứng yên ở một khung của clip. */
    play(name) { cur?.play(name); },
    pose(name, time) { return cur?.freeze(name, time); },
    /** Hiện/ẩn mây xoáy màu tướng sau lưng (sảnh có phông dựng sẵn thì để nhẹ); k: độ đậm 0..1. */
    aura(on, k = 1) { splash.group.visible = !!on; splash.group.scale.setScalar(0.6 + 0.4 * k); },
    /** Bật/tắt tự xoay chậm (màn chọn tướng xoay, sảnh đứng yên). */
    autoSpin(on) { SPIN_V = on ? 0.12 : 0; spinV = SPIN_V; if (!on) spin = SPIN0 + Math.round((spin - SPIN0) / (Math.PI * 2)) * Math.PI * 2; },
    /** Ngừng vẽ khi bị che (phòng chờ, màn tải) để đỡ tốn pin; tiếp tục khi hiện lại. */
    pause() { running = false; cancelAnimationFrame(req); },
    resume() { if (running) return; running = true; frame.last = performance.now(); req = requestAnimationFrame(frame); },
    dispose() {
      running = false; cancelAnimationFrame(req); renderer.dispose(); renderer.forceContextLoss();
      removeEventListener('resize', resize); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    },
  };
}
