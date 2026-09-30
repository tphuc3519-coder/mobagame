// --- HIGH-FIDELITY 3D MOBA CHAMPION SHOWCASE (CYBER FANTASY WARRIOR - ARTHUR) ---

let scene, camera, renderer, controls;
let heroGroup, swordGroup, hpBarMesh, heroRingMesh;
let leftArm, rightArm, leftLeg, rightLeg, capeMesh, furCollarMesh;
let swordLightningParticles = [], ambientParticles = [];

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
  scene.background = new THREE.Color(0x060913);
  scene.fog = new THREE.FogExp2(0x0a0f1d, 0.025);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 11);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // Orbit Controls (360 Showcase Camera)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.01; // Don't go below ground
  controls.minDistance = 3;
  controls.maxDistance = 25;
  controls.target.set(0, 1.8, 0);

  // Lighting System matching image.png
  setupLightingSystem();

  // Environment / MOBA Showcase Arena Platform
  createShowcaseEnvironment();

  // High-Detail Sci-Fi Fantasy Champion (Matching image.png)
  buildHighDetailChampionModel();

  // Floating Sparkle Particles
  createAmbientParticles();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  setupKeyboardAndJoystick();
  setupSkillButtons();

  // Animation Loop
  animate();
}

function setupLightingSystem() {
  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0x2a3d5e, 0.8);
  scene.add(ambientLight);

  // Key Directional Light (Warm Sunset Sunlight from top right)
  const keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
  keyLight.position.set(12, 18, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  // Cyan Cyber Sword Rim Light
  const cyanRim = new THREE.PointLight(0x00d2ff, 3.5, 12);
  cyanRim.position.set(-5, 4, 3);
  scene.add(cyanRim);

  // Gold Back Rim Light
  const goldRim = new THREE.PointLight(0xffa800, 3.0, 15);
  goldRim.position.set(6, 6, -6);
  scene.add(goldRim);

  // Soft Blue Fill Light
  const fillLight = new THREE.DirectionalLight(0x4080ff, 0.6);
  fillLight.position.set(-10, 10, -10);
  scene.add(fillLight);
}

function createShowcaseEnvironment() {
  // Starry Sky Background Points
  const starGeo = new THREE.BufferGeometry();
  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i] = (Math.random() - 0.5) * 120;
    starPos[i + 1] = Math.random() * 50 + 5;
    starPos[i + 2] = (Math.random() - 0.5) * 120;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xcceeff, size: 0.15, transparent: true, opacity: 0.8 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Pedestal Base Center Platform (Multi-tier Metallic Arena Platform like image.png)
  const tier1Geo = new THREE.CylinderGeometry(5.5, 6.0, 0.4, 64);
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x121722,
    roughness: 0.4,
    metalness: 0.8
  });
  const tier1 = new THREE.Mesh(tier1Geo, darkMetalMat);
  tier1.position.y = -0.2;
  tier1.receiveShadow = true;
  scene.add(tier1);

  // Gold Rim Ring on Pedestal Base
  const goldRingGeo = new THREE.TorusGeometry(5.4, 0.08, 16, 64);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.9 });
  const goldRing = new THREE.Mesh(goldRingGeo, goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.01;
  scene.add(goldRing);

  // Inner Pedestal Tier
  const tier2Geo = new THREE.CylinderGeometry(4.0, 4.2, 0.2, 64);
  const metallicMat = new THREE.MeshStandardMaterial({ color: 0x1a2332, roughness: 0.3, metalness: 0.7 });
  const tier2 = new THREE.Mesh(tier2Geo, metallicMat);
  tier2.position.y = 0.05;
  tier2.receiveShadow = true;
  scene.add(tier2);

  // Cyan Glowing Rune Circle on Pedestal
  const runeGeo = new THREE.RingGeometry(2.5, 2.7, 64);
  const runeMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const rune = new THREE.Mesh(runeGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.16;
  scene.add(rune);

  // Outer Golden Pattern Ring
  const outerRuneGeo = new THREE.RingGeometry(3.6, 3.75, 64);
  const outerRuneMat = new THREE.MeshBasicMaterial({
    color: 0xffb700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const outerRune = new THREE.Mesh(outerRuneGeo, outerRuneMat);
  outerRune.rotation.x = -Math.PI / 2;
  outerRune.position.y = 0.16;
  scene.add(outerRune);

  // Outer Arena Ground Grid
  const grid = new THREE.GridHelper(30, 30, 0x00f0ff, 0x162238);
  grid.position.y = -0.39;
  scene.add(grid);

  // Background Sci-Fi Arena Pillars (Pillars with Orange Glowing Strips as in image.png)
  const pillarPositions = [
    { x: -10, z: -12 }, { x: -16, z: -4 }, { x: 10, z: -12 }, { x: 16, z: -4 },
    { x: -12, z: 8 }, { x: 12, z: 8 }
  ];

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x161e2e, roughness: 0.5, metalness: 0.8 });
  const orangeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

  pillarPositions.forEach(pos => {
    const pGroup = new THREE.Group();
    pGroup.position.set(pos.x, 3.5, pos.z);

    const pillarGeo = new THREE.BoxGeometry(1.6, 8, 1.6);
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.castShadow = true;
    pGroup.add(pillarMesh);

    // Orange glowing vertical strip
    const stripGeo = new THREE.BoxGeometry(0.2, 7, 0.2);
    const strip1 = new THREE.Mesh(stripGeo, orangeGlowMat);
    strip1.position.set(0, 0, 0.82);
    pGroup.add(strip1);

    scene.add(pGroup);
  });
}

// --- HIGH DETAIL CHAMPION MODEL GENERATOR (CYBER FANTASY ARTHUR) ---
function buildHighDetailChampionModel() {
  heroGroup = new THREE.Group();

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd8be, roughness: 0.6 }); // Anime skin
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4, metalness: 0.1 }); // Spiky golden hair
  const whiteJacketMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.3, metalness: 0.2 }); // White Cyber Coat
  const darkClothMat = new THREE.MeshStandardMaterial({ color: 0x222938, roughness: 0.7 }); // Dark pants/undergarment
  const armorSteelMat = new THREE.MeshStandardMaterial({ color: 0x7a8b9e, roughness: 0.25, metalness: 0.85 }); // Steel Armor Plates
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xecb338, roughness: 0.2, metalness: 0.9 }); // Gold accents
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff }); // Cyan Energy Glow
  const furMat = new THREE.MeshStandardMaterial({ color: 0xe6eaf0, roughness: 0.9 }); // Fluffy White Fur Cape/Collar

  // 1. TORSO & LAYERED CYBER JACKET
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.75;

  // Inner Dark Shirt
  const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), darkClothMat);
  innerShirt.castShadow = true;
  torsoGroup.add(innerShirt);

  // Outer White Sci-Fi Jacket Wings
  const jacketLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.95, 0.52), whiteJacketMat);
  jacketLeft.position.set(0.32, 0, 0.02);
  torsoGroup.add(jacketLeft);

  const jacketRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.95, 0.52), whiteJacketMat);
  jacketRight.position.set(-0.32, 0, 0.02);
  torsoGroup.add(jacketRight);

  // High Sci-Fi Collar around Neck
  const collarGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.35, 16, 1, true);
  const collar = new THREE.Mesh(collarGeo, whiteJacketMat);
  collar.position.set(0, 0.55, 0);
  torsoGroup.add(collar);

  // Collar Cyan Energy Light Strips
  const collarStrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.42), cyanGlowMat);
  collarStrip.position.set(0, 0.5, 0);
  torsoGroup.add(collarStrip);

  // Sci-Fi Belt & Big Buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.5), armorSteelMat);
  belt.position.y = -0.42;
  torsoGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.55), goldTrimMat);
  buckle.position.set(0, -0.42, 0);
  torsoGroup.add(buckle);

  heroGroup.add(torsoGroup);

  // 2. HEAD & ANIME HAIR & HEADBAND (As in image.png)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.5, 0);

  // Face Mesh
  const faceGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
  const face = new THREE.Mesh(faceGeo, skinMat);
  headGroup.add(face);

  // White Headband
  const headband = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), whiteJacketMat);
  headband.position.y = 0.12;
  headGroup.add(headband);

  // Spiky Golden Hair (Multiple Cone Spikes)
  const hairGroup = new THREE.Group();
  hairGroup.position.set(0, 0.18, 0);

  const spikeGeo = new THREE.ConeGeometry(0.1, 0.35, 5);
  const spikePositions = [
    { x: 0, y: 0.12, z: 0.05, rx: -0.3, ry: 0, rz: 0 },
    { x: 0.12, y: 0.1, z: 0.02, rx: -0.2, ry: 0.4, rz: -0.4 },
    { x: -0.12, y: 0.1, z: 0.02, rx: -0.2, ry: -0.4, rz: 0.4 },
    { x: 0.08, y: 0.15, z: -0.08, rx: 0.3, ry: 0.2, rz: -0.2 },
    { x: -0.08, y: 0.15, z: -0.08, rx: 0.3, ry: -0.2, rz: 0.2 },
    { x: 0, y: 0.2, z: -0.02, rx: 0, ry: 0, rz: 0 }
  ];

  spikePositions.forEach(sp => {
    const spike = new THREE.Mesh(spikeGeo, hairMat);
    spike.position.set(sp.x, sp.y, sp.z);
    spike.rotation.set(sp.rx, sp.ry, sp.rz);
    hairGroup.add(spike);
  });
  headGroup.add(hairGroup);

  heroGroup.add(headGroup);

  // 3. FLUFFY WHITE FUR COLLAR & CAPE (Matching white fur in image.png)
  furCollarMesh = new THREE.Group();
  furCollarMesh.position.set(-0.35, 2.35, -0.15);

  const furClusterGeo = new THREE.DodecahedronGeometry(0.28, 1);
  for (let i = 0; i < 7; i++) {
    const furBlob = new THREE.Mesh(furClusterGeo, furMat);
    furBlob.position.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, -i * 0.18);
    furBlob.scale.set(1 + Math.random() * 0.3, 0.8, 1);
    furCollarMesh.add(furBlob);
  }

  // Long flowing cape attached under fur
  const capeGeo = new THREE.PlaneGeometry(1.1, 1.8, 10, 10);
  capeMesh = new THREE.Mesh(capeGeo, furMat);
  capeMesh.position.set(-0.2, 1.3, -0.4);
  capeMesh.rotation.set(0.2, -0.15, 0.1);
  heroGroup.add(capeMesh);
  heroGroup.add(furCollarMesh);

  // 4. SHOULDER PAULDRONS (CYBER ARMOR)
  // Left Shoulder Heavy Armor
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(0.55, 2.15, 0);
  const pauldronGeo = new THREE.BoxGeometry(0.42, 0.45, 0.45);
  const lPauldron = new THREE.Mesh(pauldronGeo, armorSteelMat);
  leftShoulder.add(lPauldron);

  const lGlowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.1), cyanGlowMat);
  lGlowStrip.position.set(0, 0.05, 0.2);
  leftShoulder.add(lGlowStrip);
  heroGroup.add(leftShoulder);

  // Right Shoulder Armor (Slightly smaller, sleek)
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(-0.55, 2.15, 0);
  const rPauldron = new THREE.Mesh(pauldronGeo, whiteJacketMat);
  rightShoulder.add(rPauldron);
  heroGroup.add(rightShoulder);

  // 5. ARMS
  // Left Arm
  leftArm = new THREE.Group();
  leftArm.position.set(0.5, 1.95, 0);
  const armSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65), whiteJacketMat);
  armSleeve.position.y = -0.3;
  leftArm.add(armSleeve);

  const leftGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.4), darkClothMat);
  leftGauntlet.position.y = -0.6;
  leftArm.add(leftGauntlet);
  heroGroup.add(leftArm);

  // Right Arm (Holding Greatsword)
  rightArm = new THREE.Group();
  rightArm.position.set(-0.5, 1.95, 0);
  const rArmSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65), whiteJacketMat);
  rArmSleeve.position.y = -0.3;
  rightArm.add(rArmSleeve);

  const rightGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.4), darkClothMat);
  rightGauntlet.position.y = -0.6;
  rightArm.add(rightGauntlet);
  heroGroup.add(rightArm);

  // 6. LEGS & BOOTS (Boots with knee guards as in image.png)
  // Left Leg
  leftLeg = new THREE.Group();
  leftLeg.position.set(0.25, 1.1, 0);
  const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.6), darkClothMat);
  lThigh.position.y = -0.25;
  leftLeg.add(lThigh);

  const lBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.6), armorSteelMat);
  lBoot.position.y = -0.7;
  leftLeg.add(lBoot);

  const lKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.12), goldTrimMat);
  lKneePad.position.set(0, -0.48, 0.12);
  leftLeg.add(lKneePad);
  heroGroup.add(leftLeg);

  // Right Leg
  rightLeg = new THREE.Group();
  rightLeg.position.set(-0.25, 1.1, 0);
  const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.6), darkClothMat);
  rThigh.position.y = -0.25;
  rightLeg.add(rThigh);

  const rBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.6), armorSteelMat);
  rBoot.position.y = -0.7;
  rightLeg.add(rBoot);

  const rKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.12), goldTrimMat);
  rKneePad.position.set(0, -0.48, 0.12);
  rightLeg.add(rKneePad);
  heroGroup.add(rightLeg);

  // 7. WEAPON: MASSIVE CRYSTAL BLUE GREATSWORD WITH GOLD HILT (Matching image.png)
  swordGroup = new THREE.Group();
  swordGroup.position.set(0, -0.65, 0.15);

  // Gold Hilt & Ornate Guard
  const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45);
  const hilt = new THREE.Mesh(hiltGeo, armorSteelMat);
  hilt.position.y = -0.2;
  swordGroup.add(hilt);

  // Ornate Wings Guard (Gold)
  const guardGroup = new THREE.Group();
  guardGroup.position.y = 0.05;
  const guardWingL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 4), goldTrimMat);
  guardWingL.rotation.z = Math.PI / 3;
  guardWingL.position.x = 0.3;
  guardGroup.add(guardWingL);

  const guardWingR = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 4), goldTrimMat);
  guardWingR.rotation.z = -Math.PI / 3;
  guardWingR.position.x = -0.3;
  guardGroup.add(guardWingR);

  const guardCenterGem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), cyanGlowMat);
  guardGroup.add(guardCenterGem);
  swordGroup.add(guardGroup);

  // Wide Translucent Crystal Blue Blade Body
  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0x00bfff,
    emissive: 0x0077ff,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.6, // Glass/Crystal look
    thickness: 0.5,
    transparent: true,
    opacity: 0.95
  });

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.35, 0.3);
  bladeShape.lineTo(0.28, 2.2);
  bladeShape.lineTo(0, 2.6); // Tip
  bladeShape.lineTo(-0.28, 2.2);
  bladeShape.lineTo(-0.35, 0.3);
  bladeShape.closePath();

  const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
  bladeGeo.center();
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh.position.y = 1.35;
  bladeMesh.castShadow = true;
  swordGroup.add(bladeMesh);

  // Glowing Core Beam inside Blade
  const bladeCoreMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.2, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x88ffff })
  );
  bladeCoreMesh.position.y = 1.35;
  swordGroup.add(bladeCoreMesh);

  // Lightning Particles along Greatsword
  createSwordLightningParticles();

  rightArm.add(swordGroup);

  // 8. MOBA Floating HP Bar & Hero Selection Ring
  createHeroHUD();

  scene.add(heroGroup);
}

function createSwordLightningParticles() {
  const pCount = 15;
  const pGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const pMat = new THREE.MeshBasicMaterial({ color: 0x88ffff });

  for (let i = 0; i < pCount; i++) {
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(
      (Math.random() - 0.5) * 0.5,
      0.3 + Math.random() * 2.0,
      (Math.random() - 0.5) * 0.2
    );
    swordGroup.add(p);
    swordLightningParticles.push({
      mesh: p,
      speedY: 0.01 + Math.random() * 0.02,
      baseX: p.position.x
    });
  }
}

function createAmbientParticles() {
  const count = 40;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    pos[i] = (Math.random() - 0.5) * 8;
    pos[i + 1] = Math.random() * 4;
    pos[i + 2] = (Math.random() - 0.5) * 8;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.08,
    transparent: true,
    opacity: 0.7
  });

  const particleSystem = new THREE.Points(geo, mat);
  scene.add(particleSystem);
  ambientParticles.push(particleSystem);
}

function createHeroHUD() {
  // Ground Targeting Ring under Hero (Liên Quân Style Ring)
  const ringGeo = new THREE.RingGeometry(0.95, 1.1, 32);
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
  ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
  ctx.fillRect(0, 0, 256, 32);
  ctx.strokeStyle = '#ecb338';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 252, 28);

  ctx.fillStyle = '#22c55e'; // Green HP
  ctx.fillRect(4, 4, 248, 24);

  // Level Badge
  ctx.fillStyle = '#ffb700';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Lv.15', 10, 22);

  const texture = new THREE.CanvasTexture(canvas);
  const hpGeo = new THREE.PlaneGeometry(1.6, 0.2);
  const hpMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  hpBarMesh = new THREE.Mesh(hpGeo, hpMat);
  hpBarMesh.position.set(0, 3.1, 0);
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

  // Make HP Bar face camera
  if (hpBarMesh) {
    hpBarMesh.quaternion.copy(camera.quaternion);
  }

  // Animate Sword Lightning Particles
  swordLightningParticles.forEach(p => {
    p.mesh.position.y += p.speedY;
    p.mesh.position.x = p.baseX + Math.sin(animTime * 3 + p.mesh.position.y) * 0.08;
    if (p.mesh.position.y > 2.5) p.mesh.position.y = 0.3;
  });

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
      capeMesh.rotation.x = 0.2 + Math.sin(animTime * 0.5) * 0.03;
      heroGroup.position.y = Math.sin(animTime * 0.5) * 0.03;
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
    if (skillTimer >= Math.PI * 4) {
      isSpinning = false;
      rightArm.rotation.x = 0;
      leftArm.rotation.x = 0;
    }
  }

  if (isUlting) {
    skillTimer += delta * 5;
    if (skillTimer < Math.PI / 2) {
      heroGroup.position.y = Math.sin(skillTimer) * 2.5;
      rightArm.rotation.x = -Math.PI;
    } else {
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
