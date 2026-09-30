// --- REALISTIC 3D HUMAN MOBA CHAMPION SHOWCASE (GLTF SKELETAL RIG) ---

let scene, camera, renderer, controls;
let currentHeroGroup, hpBarMesh, heroRingMesh;
let mixer, actions = {}, activeAction, previousAction;
let gltfLoader;
let currentHeroIndex = 0;

// Camera preset angles
let targetCamPos = null;
let targetCamTarget = null;

const HERO_MODELS = [
  {
    name: "ARTHUR - HOÀNG KIM CHIẾN THẦN",
    badge: "ĐẤU SĨ / PALADIN",
    file: "Soldier.glb",
    scale: 1.8,
    offsetY: 0,
    hasWeapon: true
  },
  {
    name: "CYBER X-BOT - PHONG BẠO CHIẾN BINH",
    badge: "SÁT THỦ CYBER / CYBER ASSASSIN",
    file: "Xbot.glb",
    scale: 1.6,
    offsetY: 0,
    hasWeapon: false
  }
];

// Movement & State
const moveState = { forward: 0, right: 0 };
const moveSpeed = 0.12;
let targetAngle = 0;
let isMoving = false;
let clock = new THREE.Clock();

function init() {
  const container = document.getElementById('canvas-container');

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);

  // 2. Camera setup
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2.5, 6.5);

  // 3. Renderer setup (preserveDrawingBuffer required for canvas photo export)
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  // 4. Orbit Controls (360 Showcase Camera)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 1.5;
  controls.maxDistance = 20;
  controls.target.set(0, 1.6, 0);

  // 5. Lighting
  setupLights();

  // 6. Arena Pedestal Environment
  createShowcaseEnvironment();

  // 7. GLTF Loader Setup
  gltfLoader = new THREE.GLTFLoader();
  loadHeroModel(currentHeroIndex);

  // 8. Particle System
  createAmbientParticles();

  // 9. Event Listeners
  window.addEventListener('resize', onWindowResize);
  setupControlsAndUI();

  // 10. Animation Loop
  animate();
}

function setupLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const mainSun = new THREE.DirectionalLight(0xfff5ea, 1.8);
  mainSun.position.set(8, 15, 10);
  mainSun.castShadow = true;
  mainSun.shadow.mapSize.width = 2048;
  mainSun.shadow.mapSize.height = 2048;
  mainSun.shadow.bias = -0.0001;
  scene.add(mainSun);

  const cyanRim = new THREE.PointLight(0x00d2ff, 4.0, 15);
  cyanRim.position.set(-6, 4, -4);
  scene.add(cyanRim);

  const warmRim = new THREE.PointLight(0xffaa00, 3.5, 15);
  warmRim.position.set(6, 5, -5);
  scene.add(warmRim);
}

function createShowcaseEnvironment() {
  // Starry Sky
  const starGeo = new THREE.BufferGeometry();
  const starCount = 400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i] = (Math.random() - 0.5) * 100;
    starPos[i + 1] = Math.random() * 40 + 2;
    starPos[i + 2] = (Math.random() - 0.5) * 100;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.15, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Multi-tier Pedestal Arena
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.3, metalness: 0.8 });
  const goldMetal = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.9 });

  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.0, 0.3, 64), darkMetal);
  tier1.position.y = -0.15;
  tier1.receiveShadow = true;
  scene.add(tier1);

  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.06, 16, 64), goldMetal);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.01;
  scene.add(goldRing);

  // Glowing Rune Pedestal
  const runeGeo = new THREE.RingGeometry(2.0, 2.2, 64);
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const rune = new THREE.Mesh(runeGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.02;
  scene.add(rune);

  // Sci-Fi Arena Pillars
  const pillarPositions = [{ x: -8, z: -9 }, { x: 8, z: -9 }, { x: -12, z: 2 }, { x: 12, z: 2 }];
  pillarPositions.forEach(pos => {
    const pGroup = new THREE.Group();
    pGroup.position.set(pos.x, 3, pos.z);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.2), darkMetal);
    pillar.castShadow = true;
    pGroup.add(pillar);

    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 6, 0.15), new THREE.MeshBasicMaterial({ color: 0xffa800 }));
    glowStrip.position.set(0, 0, 0.62);
    pGroup.add(glowStrip);

    scene.add(pGroup);
  });
}

function loadHeroModel(index) {
  const config = HERO_MODELS[index];

  // Update UI Header
  document.getElementById('hero-display-name').innerText = config.name;
  document.querySelector('.hero-badge').innerText = config.badge;

  if (currentHeroGroup) {
    scene.remove(currentHeroGroup);
  }

  currentHeroGroup = new THREE.Group();
  scene.add(currentHeroGroup);

  gltfLoader.load(config.file, (gltf) => {
    const model = gltf.scene;
    model.scale.set(config.scale, config.scale, config.scale);
    model.position.y = config.offsetY;

    // Enable Shadows & Materials
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = 0.35;
          child.material.metalness = 0.4;
        }
      }
    });

    currentHeroGroup.add(model);

    // Setup Skeletal Animations
    mixer = new THREE.AnimationMixer(model);
    actions = {};

    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
    });

    // Default to Idle animation
    const clipNames = Object.keys(actions);
    if (clipNames.length > 0) {
      const idleClip = clipNames.find(name => name.toLowerCase().includes('idle')) || clipNames[0];
      activeAction = actions[idleClip];
      if (activeAction) activeAction.play();
    }

    // Attach Glowing Crystal Sword if weapon flag set
    if (config.hasWeapon) {
      attachGlowingGreatsword(model);
    }

    // Create Ground HUD Ring & Floating HP Bar
    createHeroHUD(currentHeroGroup);
  });
}

function attachGlowingGreatsword(model) {
  let rightHandBone = null;
  model.traverse((child) => {
    if (child.isBone && (child.name.includes('RightHand') || child.name.includes('HandR') || child.name.includes('mixamorigRightHand'))) {
      rightHandBone = child;
    }
  });

  if (!rightHandBone) {
    rightHandBone = model;
  }

  const swordGroup = new THREE.Group();
  swordGroup.position.set(0, 0.1, 0);

  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    emissive: 0x0088ff,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.9
  });

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.18, 0.2);
  bladeShape.lineTo(0.14, 1.8);
  bladeShape.lineTo(0, 2.1);
  bladeShape.lineTo(-0.14, 1.8);
  bladeShape.lineTo(-0.18, 0.2);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02 });
  bladeGeo.center();
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 1.0;
  swordGroup.add(blade);

  const hilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
  );
  hilt.position.y = -0.1;
  swordGroup.add(hilt);

  swordGroup.scale.set(0.6, 0.6, 0.6);
  swordGroup.rotation.x = Math.PI / 2;
  rightHandBone.add(swordGroup);
}

function createHeroHUD(parentGroup) {
  const ringGeo = new THREE.RingGeometry(0.9, 1.05, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  heroRingMesh = new THREE.Mesh(ringGeo, ringMat);
  heroRingMesh.rotation.x = -Math.PI / 2;
  heroRingMesh.position.y = 0.03;
  parentGroup.add(heroRingMesh);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
  ctx.fillRect(0, 0, 256, 32);
  ctx.strokeStyle = '#ecb338';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 252, 28);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(4, 4, 248, 24);
  ctx.fillStyle = '#ffb700';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Lv.15', 10, 22);

  const texture = new THREE.CanvasTexture(canvas);
  hpBarMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  );
  hpBarMesh.position.set(0, 3.4, 0);
  parentGroup.add(hpBarMesh);
}

function fadeToAction(name, duration = 0.2) {
  previousAction = activeAction;
  activeAction = actions[name];

  if (previousAction && activeAction && previousAction !== activeAction) {
    previousAction.fadeOut(duration);
    activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
  } else if (activeAction) {
    activeAction.reset().play();
  }
}

function createAmbientParticles() {
  const count = 50;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    pos[i] = (Math.random() - 0.5) * 10;
    pos[i + 1] = Math.random() * 5;
    pos[i + 2] = (Math.random() - 0.5) * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.08, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Points(geo, mat));
}

// Controls & Interactions
function setupControlsAndUI() {
  const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    updateMoveState();
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    updateMoveState();
  });

  function updateMoveState() {
    moveState.forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    moveState.right = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  }

  // Virtual Joystick
  const stick = document.getElementById('joystick-stick');
  const base = document.getElementById('joystick-base');
  let isDragging = false;
  const maxRadius = 35;

  function handleTouch(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    let deltaX = clientX - (rect.left + rect.width / 2);
    let deltaY = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > maxRadius) {
      deltaX = (deltaX / distance) * maxRadius;
      deltaY = (deltaY / distance) * maxRadius;
    }

    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    moveState.right = deltaX / maxRadius;
    moveState.forward = -deltaY / maxRadius;
  }

  base.addEventListener('pointerdown', (e) => {
    isDragging = true;
    base.setPointerCapture(e.pointerId);
    handleTouch(e.clientX, e.clientY);
  });

  base.addEventListener('pointermove', (e) => {
    if (isDragging) handleTouch(e.clientX, e.clientY);
  });

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      stick.style.transform = 'translate(0px, 0px)';
      moveState.forward = 0;
      moveState.right = 0;
    }
  };

  base.addEventListener('pointerup', stopDrag);
  base.addEventListener('pointercancel', stopDrag);

  // Switch Hero Button
  document.getElementById('btn-switch-hero').addEventListener('click', () => {
    currentHeroIndex = (currentHeroIndex + 1) % HERO_MODELS.length;
    loadHeroModel(currentHeroIndex);
  });

  // Photo / Snapshot Button
  document.getElementById('btn-take-photo').addEventListener('click', takeHeroPhoto);

  // Camera Presets
  const camBtns = {
    'cam-front': { pos: new THREE.Vector3(0, 2.2, 5.5), target: new THREE.Vector3(0, 1.6, 0) },
    'cam-back': { pos: new THREE.Vector3(0, 2.2, -5.5), target: new THREE.Vector3(0, 1.6, 0) },
    'cam-closeup': { pos: new THREE.Vector3(0, 2.7, 2.2), target: new THREE.Vector3(0, 2.5, 0) },
    'cam-top': { pos: new THREE.Vector3(0, 9.0, 1.0), target: new THREE.Vector3(0, 0, 0) },
    'cam-side': { pos: new THREE.Vector3(4.5, 2.5, 4.5), target: new THREE.Vector3(0, 1.6, 0) }
  };

  Object.keys(camBtns).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const preset = camBtns[id];
        const heroPos = currentHeroGroup ? currentHeroGroup.position : new THREE.Vector3(0, 0, 0);
        targetCamPos = preset.pos.clone().add(heroPos);
        targetCamTarget = preset.target.clone().add(heroPos);
      });
    }
  });

  // Skills
  document.getElementById('skill-q').addEventListener('click', triggerAttack);
  document.getElementById('skill-w').addEventListener('click', triggerSpin);
  document.getElementById('skill-r').addEventListener('click', triggerUlt);
}

function takeHeroPhoto() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `3D_MOBA_Hero_Snapshot_${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}

function triggerAttack() {
  const clipNames = Object.keys(actions);
  const actionClip = clipNames.find(n => n.toLowerCase().includes('attack') || n.toLowerCase().includes('spin') || n.toLowerCase().includes('action')) || clipNames[0];
  if (actionClip) fadeToAction(actionClip, 0.1);
}

function triggerSpin() {
  triggerAttack();
}

function triggerUlt() {
  triggerAttack();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  // Smooth Camera transition to presets
  if (targetCamPos && targetCamTarget) {
    camera.position.lerp(targetCamPos, 0.08);
    controls.target.lerp(targetCamTarget, 0.08);
    if (camera.position.distanceTo(targetCamPos) < 0.05) {
      targetCamPos = null;
      targetCamTarget = null;
    }
  }

  // Billboarding HP Bar
  if (hpBarMesh) {
    hpBarMesh.quaternion.copy(camera.quaternion);
  }

  // 360 Movement Logic
  const inputLength = Math.hypot(moveState.forward, moveState.right);
  if (inputLength > 0.1 && currentHeroGroup) {
    isMoving = true;

    const cameraAngle = Math.atan2(
      camera.position.x - currentHeroGroup.position.x,
      camera.position.z - currentHeroGroup.position.z
    );

    const inputAngle = Math.atan2(moveState.right, moveState.forward);
    targetAngle = cameraAngle + inputAngle;

    let diff = targetAngle - currentHeroGroup.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    currentHeroGroup.rotation.y += diff * 0.15;

    currentHeroGroup.position.x += Math.sin(currentHeroGroup.rotation.y) * moveSpeed * Math.min(inputLength, 1);
    currentHeroGroup.position.z += Math.cos(currentHeroGroup.rotation.y) * moveSpeed * Math.min(inputLength, 1);

    controls.target.copy(currentHeroGroup.position).add(new THREE.Vector3(0, 1.6, 0));

    const clipNames = Object.keys(actions);
    const runClip = clipNames.find(n => n.toLowerCase().includes('run') || n.toLowerCase().includes('walk'));
    if (runClip && actions[runClip] && activeAction !== actions[runClip]) {
      fadeToAction(runClip, 0.2);
    }
  } else if (isMoving && currentHeroGroup) {
    isMoving = false;
    const clipNames = Object.keys(actions);
    const idleClip = clipNames.find(n => n.toLowerCase().includes('idle')) || clipNames[0];
    if (idleClip && actions[idleClip] && activeAction !== actions[idleClip]) {
      fadeToAction(idleClip, 0.2);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
