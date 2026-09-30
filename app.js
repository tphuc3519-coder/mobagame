// --- 3D MOBA HERO SHOWCASE & 360 MOVEMENT ENGINE ---

let scene, camera, renderer, controls;
let heroGroup, swordGroup, shieldGroup, hpBarMesh, heroRingMesh;
let leftArm, rightArm, leftLeg, rightLeg, capeMesh;

// Character state
const moveState = { forward: 0, right: 0 };
let moveSpeed = 0.12;
let targetAngle = 0;
let isMoving = false;
let animTime = 0;

// Ability / Attack State
let isAttacking = false;
let isSpinning = false;
let isUlting = false;
let skillTimer = 0;

// Initialize 3D Engine
function init() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);
  scene.fog = new THREE.FogExp2(0x0a0e17, 0.035);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 6, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Orbit Controls (360 Showcase Camera)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't go below ground
  controls.minDistance = 3;
  controls.maxDistance = 25;
  controls.target.set(0, 1.8, 0);

  // Lights
  setupLights();

  // Environment / MOBA Ground Map
  createArenaGround();

  // Build Arthur 3D MOBA Model
  buildArthurModel();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  setupKeyboardAndJoystick();
  setupSkillButtons();

  // Animation Loop
  animate();
}

function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff3d1, 1.2);
  mainLight.position.set(10, 20, 15);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.bias = -0.0001;
  scene.add(mainLight);

  // Blue & Gold Rim lights for MOBA Hero Glow
  const blueRim = new THREE.PointLight(0x00a2ff, 2, 15);
  blueRim.position.set(-8, 5, -8);
  scene.add(blueRim);

  const goldRim = new THREE.PointLight(0xffb700, 2.5, 15);
  goldRim.position.set(8, 4, 8);
  scene.add(goldRim);
}

function createArenaGround() {
  // Main Arena Floor
  const groundGeo = new THREE.CylinderGeometry(20, 20, 0.5, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a2332,
    roughness: 0.6,
    metalness: 0.3
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  scene.add(ground);

  // Inner Rune Circle (MOBA Battlefield Center)
  const ringGeo = new THREE.RingGeometry(3, 3.2, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x3182ce,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  // Outer Decorative Ring
  const outerRingGeo = new THREE.RingGeometry(12, 12.3, 64);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xe2b041,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.01;
  scene.add(outerRing);

  // Grid / Pattern details
  const grid = new THREE.GridHelper(40, 40, 0x3182ce, 0x1d283a);
  grid.position.y = 0.02;
  scene.add(grid);
}

// --- ARTHUR 3D CHARACTER GENERATOR ---
function buildArthurModel() {
  heroGroup = new THREE.Group();

  // Materials
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x2b3e50, roughness: 0.3, metalness: 0.8 }); // Steel Blue
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xe2b041, roughness: 0.2, metalness: 0.9 }); // Gold
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xd0d7de, roughness: 0.2, metalness: 0.9 }); // Silver
  const capeMat = new THREE.MeshStandardMaterial({ color: 0x9b1c1c, roughness: 0.8, side: THREE.DoubleSide }); // Crimson Red
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5c19d, roughness: 0.7 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  // 1. Torso & Armor
  const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.y = 1.75;
  torso.castShadow = true;
  heroGroup.add(torso);

  // Gold Chest Plate emblem
  const emblemGeo = new THREE.ConeGeometry(0.25, 0.4, 4);
  const emblem = new THREE.Mesh(emblemGeo, goldTrimMat);
  emblem.position.set(0, 1.85, 0.27);
  emblem.rotation.x = Math.PI;
  heroGroup.add(emblem);

  // Belt / Waist
  const beltGeo = new THREE.BoxGeometry(0.85, 0.2, 0.55);
  const belt = new THREE.Mesh(beltGeo, goldTrimMat);
  belt.position.y = 1.2;
  heroGroup.add(belt);

  // 2. Head & Helmet
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.45, 0);

  const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  headGroup.add(head);

  // Golden Knight Helmet
  const helmetGeo = new THREE.ConeGeometry(0.32, 0.4, 16);
  const helmet = new THREE.Mesh(helmetGeo, goldTrimMat);
  helmet.position.y = 0.15;
  headGroup.add(helmet);

  // Helmet Visor Glowing Eyes
  const visorGeo = new THREE.BoxGeometry(0.3, 0.06, 0.1);
  const visor = new THREE.Mesh(visorGeo, glowMat);
  visor.position.set(0, 0.02, 0.22);
  headGroup.add(visor);

  heroGroup.add(headGroup);

  // 3. Shoulder Pads (Pauldrons - Classic MOBA Style Big Shoulders)
  const padGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const leftPauldron = new THREE.Mesh(padGeo, goldTrimMat);
  leftPauldron.position.set(0.6, 2.15, 0);
  leftPauldron.rotation.z = -0.2;
  heroGroup.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(padGeo, goldTrimMat);
  rightPauldron.position.set(-0.6, 2.15, 0);
  rightPauldron.rotation.z = 0.2;
  heroGroup.add(rightPauldron);

  // 4. Arms
  // Left Arm (Shield Arm)
  leftArm = new THREE.Group();
  leftArm.position.set(0.55, 2.0, 0);
  const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7);
  const lArmMesh = new THREE.Mesh(armGeo, armorMat);
  lArmMesh.position.y = -0.35;
  leftArm.add(lArmMesh);
  heroGroup.add(leftArm);

  // Right Arm (Sword Arm)
  rightArm = new THREE.Group();
  rightArm.position.set(-0.55, 2.0, 0);
  const rArmMesh = new THREE.Mesh(armGeo, armorMat);
  rArmMesh.position.y = -0.35;
  rightArm.add(rArmMesh);
  heroGroup.add(rightArm);

  // 5. Legs
  // Left Leg
  leftLeg = new THREE.Group();
  leftLeg.position.set(0.25, 1.1, 0);
  const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.0);
  const lLegMesh = new THREE.Mesh(legGeo, armorMat);
  lLegMesh.position.y = -0.5;
  leftLeg.add(lLegMesh);
  heroGroup.add(leftLeg);

  // Right Leg
  rightLeg = new THREE.Group();
  rightLeg.position.set(-0.25, 1.1, 0);
  const rLegMesh = new THREE.Mesh(legGeo, armorMat);
  rLegMesh.position.y = -0.5;
  rightLeg.add(rLegMesh);
  heroGroup.add(rightLeg);

  // 6. Crimson Red Hero Cape
  const capeGeo = new THREE.PlaneGeometry(0.8, 1.4, 8, 8);
  capeMesh = new THREE.Mesh(capeGeo, capeMat);
  capeMesh.position.set(0, 1.5, -0.3);
  capeMesh.rotation.x = 0.15;
  heroGroup.add(capeMesh);

  // 7. WEAPON: Holy Glowing Sword
  swordGroup = new THREE.Group();
  swordGroup.position.set(0, -0.6, 0.2);

  // Hilt & Guard
  const guardGeo = new THREE.BoxGeometry(0.5, 0.08, 0.12);
  const guard = new THREE.Mesh(guardGeo, goldTrimMat);
  swordGroup.add(guard);

  const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
  const hilt = new THREE.Mesh(hiltGeo, armorMat);
  hilt.position.y = -0.15;
  swordGroup.add(hilt);

  // Sword Blade
  const bladeGeo = new THREE.BoxGeometry(0.14, 1.5, 0.04);
  const blade = new THREE.Mesh(bladeGeo, silverMat);
  blade.position.y = 0.8;
  swordGroup.add(blade);

  // Glowing Blade Core (Blue Energy)
  const coreGeo = new THREE.BoxGeometry(0.06, 1.4, 0.05);
  const bladeCore = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0x00d2ff }));
  bladeCore.position.y = 0.8;
  swordGroup.add(bladeCore);

  rightArm.add(swordGroup);

  // 8. WEAPON: Lion Shield
  shieldGroup = new THREE.Group();
  shieldGroup.position.set(0.15, -0.35, 0.2);
  shieldGroup.rotation.y = -Math.PI / 2;

  const shieldGeo = new THREE.BoxGeometry(0.7, 1.0, 0.1);
  const shield = new THREE.Mesh(shieldGeo, goldTrimMat);
  shieldGroup.add(shield);

  const shieldEmblem = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 4), armorMat);
  shieldEmblem.position.z = 0.08;
  shieldGroup.add(shieldEmblem);

  leftArm.add(shieldGroup);

  // 9. MOBA Floating HP Bar & Hero Ring Underfoot
  createHeroHUD();

  scene.add(heroGroup);
}

function createHeroHUD() {
  // Ground Targeting Ring under Hero (Liên Quân Style Ring)
  const ringGeo = new THREE.RingGeometry(0.9, 1.0, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  heroRingMesh = new THREE.Mesh(ringGeo, ringMat);
  heroRingMesh.rotation.x = -Math.PI / 2;
  heroRingMesh.position.y = 0.03;
  heroGroup.add(heroRingMesh);

  // Floating HP Bar (Canvas Texture)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  // Draw HP Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#22c55e'; // Green HP
  ctx.fillRect(4, 4, 248, 24);
  // Level Badge
  ctx.fillStyle = '#e2b041';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Lv.15', 10, 22);

  const texture = new THREE.CanvasTexture(canvas);
  const hpGeo = new THREE.PlaneGeometry(1.6, 0.2);
  const hpMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  hpBarMesh = new THREE.Mesh(hpGeo, hpMat);
  hpBarMesh.position.set(0, 2.9, 0);
  heroGroup.add(hpBarMesh);
}

// --- CONTROLS & MOVEMENT (360 DEGREES) ---
function setupKeyboardAndJoystick() {
  const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    updateMoveStateFromKeys();
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    updateMoveStateFromKeys();
  });

  function updateMoveStateFromKeys() {
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
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
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

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      stick.style.transform = 'translate(0px, 0px)';
      moveState.forward = 0;
      moveState.right = 0;
    }
  };

  base.addEventListener('pointerup', stopDrag);
  base.addEventListener('pointercancel', stopDrag);
}

function setupSkillButtons() {
  document.getElementById('btn-anim-attack').addEventListener('click', triggerAttack);
  document.getElementById('skill-q').addEventListener('click', triggerAttack);

  document.getElementById('btn-anim-spin').addEventListener('click', triggerSpin);
  document.getElementById('skill-w').addEventListener('click', triggerSpin);

  document.getElementById('btn-anim-ult').addEventListener('click', triggerUlt);
  document.getElementById('skill-r').addEventListener('click', triggerUlt);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') triggerAttack();
    if (e.code === 'KeyW' && !isMoving) triggerSpin();
    if (e.code === 'KeyR') triggerUlt();
  });
}

function triggerAttack() {
  if (isAttacking || isSpinning || isUlting) return;
  isAttacking = true;
  skillTimer = 0;
}

function triggerSpin() {
  if (isAttacking || isSpinning || isUlting) return;
  isSpinning = true;
  skillTimer = 0;
}

function triggerUlt() {
  if (isAttacking || isSpinning || isUlting) return;
  isUlting = true;
  skillTimer = 0;
}

// --- ANIMATION & RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);

  const delta = 0.016; // ~60 FPS
  animTime += delta * 5;

  // Make HP Bar face the 360 Camera always
  if (hpBarMesh) {
    hpBarMesh.quaternion.copy(camera.quaternion);
  }

  // Handle 360 Movement Logic
  const inputLength = Math.hypot(moveState.forward, moveState.right);
  if (inputLength > 0.1) {
    isMoving = true;

    // Calculate angle relative to camera view angle
    const cameraAngle = Math.atan2(
      camera.position.x - heroGroup.position.x,
      camera.position.z - heroGroup.position.z
    );

    const inputAngle = Math.atan2(moveState.right, moveState.forward);
    targetAngle = cameraAngle + inputAngle;

    // Smoothly rotate hero towards movement direction (360 Rotation)
    let diff = targetAngle - heroGroup.rotation.y;
    // Normalize diff to [-PI, PI]
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    heroGroup.rotation.y += diff * 0.15;

    // Move Hero in 3D Space
    heroGroup.position.x += Math.sin(heroGroup.rotation.y) * moveSpeed * Math.min(inputLength, 1);
    heroGroup.position.z += Math.cos(heroGroup.rotation.y) * moveSpeed * Math.min(inputLength, 1);

    // Keep Orbit controls centered on hero
    controls.target.copy(heroGroup.position).add(new THREE.Vector3(0, 1.8, 0));

    // Walk Animation (Limb Swinging)
    leftArm.rotation.x = Math.sin(animTime) * 0.5;
    rightArm.rotation.x = -Math.sin(animTime) * 0.5;
    leftLeg.rotation.x = -Math.sin(animTime) * 0.6;
    rightLeg.rotation.x = Math.sin(animTime) * 0.6;
    capeMesh.rotation.x = 0.3 + Math.sin(animTime * 1.5) * 0.15;
  } else {
    isMoving = false;
    // Idle Animation
    if (!isAttacking && !isSpinning && !isUlting) {
      leftArm.rotation.x = Math.sin(animTime * 0.5) * 0.05;
      rightArm.rotation.x = -Math.sin(animTime * 0.5) * 0.05;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      capeMesh.rotation.x = 0.15 + Math.sin(animTime * 0.5) * 0.03;
      heroGroup.position.y = Math.sin(animTime * 0.5) * 0.02;
    }
  }

  // Handle Skills & Attacks Animations
  if (isAttacking) {
    skillTimer += delta * 6;
    rightArm.rotation.x = -Math.PI / 2 + Math.sin(skillTimer) * 1.2;
    swordGroup.rotation.z = Math.sin(skillTimer) * 0.8;
    if (skillTimer >= Math.PI) {
      isAttacking = false;
      rightArm.rotation.x = 0;
      swordGroup.rotation.z = 0;
    }
  }

  if (isSpinning) {
    skillTimer += delta * 8;
    heroGroup.rotation.y += 0.4; // 360 Spin attack!
    rightArm.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -Math.PI / 2;
    if (skillTimer >= Math.PI * 4) { // 2 full 360 spins
      isSpinning = false;
      rightArm.rotation.x = 0;
      leftArm.rotation.x = 0;
    }
  }

  if (isUlting) {
    skillTimer += delta * 5;
    if (skillTimer < Math.PI / 2) {
      // Jump up
      heroGroup.position.y = Math.sin(skillTimer) * 2.5;
      rightArm.rotation.x = -Math.PI;
    } else {
      // Slam down
      heroGroup.position.y = Math.max(0, (Math.PI - skillTimer) * 2.5);
      rightArm.rotation.x = 0.5;
    }
    if (skillTimer >= Math.PI) {
      isUlting = false;
      heroGroup.position.y = 0;
      rightArm.rotation.x = 0;
    }
  }

  // Pulsating ground ring effect
  if (heroRingMesh) {
    heroRingMesh.scale.setScalar(1 + Math.sin(animTime * 0.8) * 0.05);
  }

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start
window.onload = init;
