import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Cục máu sau trụ ngoài (sim/orbs.js), tạo hình như Liên Quân: đài sen xanh trên lá súng, quả cầu sinh lực xanh lơ lửng phát sáng (lõi
// sáng quá ngưỡng bloom), quầng sáng, vòng sáng trên đất. Đã bị nhặt: cầu tắt, đài sen tối đi, vòng trên đất chạy đếm ngược tới lúc mọc lại.
// Mọi cục dùng chung hình học / vật liệu (vật liệu riêng chỉ cho phần có độ mờ thay đổi).
const ORB_Y = 108, ORB_R = 44, LOTUS = 1.35;

let glowTex = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Đài sen: lá súng tròn có khía + 8 cánh ngoài xanh lá nằm thấp + 6 cánh trong xanh nhạt dựng đứng + nhuỵ; màu đỉnh, gộp một lưới. */
function lotusGeometry() {
  const parts = [], col = new THREE.Color();
  const paint = (g, hex, top) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { col.set(hex); if (top) col.lerp(new THREE.Color(top), THREE.MathUtils.clamp(p.getY(i) / 40, 0, 1)); c.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const pad = new THREE.CircleGeometry(78, 28, 0.35, Math.PI * 2 - 0.35); pad.rotateX(-Math.PI / 2); pad.translate(0, 2, 0); parts.push(paint(pad, 0x1f5a28));
  const rim = new THREE.TorusGeometry(76, 3, 4, 28, Math.PI * 2 - 0.35); rim.rotateX(Math.PI / 2); rim.rotateY(0.35); rim.translate(0, 3, 0); parts.push(paint(rim, 0x3a8a3c));
  const petal = (len, wid, tilt, yaw, y, hex, top) => {
    const g = new THREE.SphereGeometry(1, 10, 6); g.scale(wid, 0.22 * wid, len); g.translate(0, 0, len * 0.85); g.rotateX(-tilt); g.rotateY(yaw); g.translate(0, y, 0); parts.push(paint(g, hex, top));
  };
  for (let i = 0; i < 8; i++) petal(30, 13, 0.32, (i / 8) * Math.PI * 2, 6, 0x3f9a4a, 0x9adf7a);
  for (let i = 0; i < 6; i++) petal(22, 10, 0.95, (i / 6) * Math.PI * 2 + 0.26, 10, 0x8fd88a, 0xeaffd8);
  const core = new THREE.SphereGeometry(9, 10, 6); core.scale(1, 0.6, 1); core.translate(0, 16, 0); parts.push(paint(core, 0xd8f070));
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed ? p.toNonIndexed() : p)); g.computeVertexNormals();
  return g;
}

/** Vỏ cầu kiểu bong bóng: sáng viền (fresnel), giữa trong; cộng sáng. */
const SHELL_VS = 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }';
const SHELL_FS = `uniform vec3 uColor; uniform float uAlpha; varying vec3 vN, vV;
  void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = (0.34 + 0.9 * f * f) * uAlpha; gl_FragColor = vec4(uColor * (0.8 + 1.2 * f * f), a); }`;

/** Vòng sáng trên đất: đầy khi cục máu sẵn sàng, chạy dần theo thời gian mọc lại khi đã bị nhặt. */
const RING_FS = `uniform float uProg, uAlpha; uniform vec3 uColor; varying vec2 vUv;
  void main(){ vec2 d = vUv - 0.5; float a = atan(d.x, -d.y) / 6.2831853 + 0.5;            // 0 → 1 theo chiều kim đồng hồ từ phía trên
    float on = step(a, uProg), r = length(d) * 2.0, band = smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.94, 1.0, r));
    gl_FragColor = vec4(uColor, band * uAlpha * mix(0.22, 1.0, on)); }`;

export function createOrbViews(scene, world, { floor = () => 0 } = {}) {
  const orbs = world.orbs || [], cfg = world.map.orbs;
  if (!orbs.length || !cfg) return { update() {} };
  const lotusGeo = lotusGeometry(), sphere = new THREE.SphereGeometry(1, 24, 16), ringGeo = new THREE.PlaneGeometry(330, 330); ringGeo.rotateX(-Math.PI / 2); lotusGeo.scale(LOTUS, LOTUS, LOTUS);
  const lotusMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0a2010 });
  const views = orbs.map((o) => {
    const g = new THREE.Group(), y0 = floor(o.x, o.y); g.position.set(o.x, y0, o.y);
    const lotus = new THREE.Mesh(lotusGeo, lotusMat.clone()); lotus.receiveShadow = true;
    // cầu: vỏ xanh trong suốt (cộng sáng) + lõi sáng trắng xanh (quá ngưỡng bloom) + quầng
    const shell = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uColor: { value: new THREE.Color(0.14, 1.3, 0.34) }, uAlpha: { value: 1 } }, vertexShader: SHELL_VS, fragmentShader: SHELL_FS }));
    const core = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.38, 1.85, 0.52), transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: new THREE.Color(0.12, 0.7, 0.26), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const motes = [0, 1, 2, 3, 4].map(() => new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: new THREE.Color(0.75, 1.5, 0.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); // đốm sáng bay quanh
    const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uProg: { value: 1 }, uAlpha: { value: 0.8 }, uColor: { value: new THREE.Color(0.45, 1.25, 0.6) } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: RING_FS }));
    ring.position.y = 4; ring.renderOrder = 2;
    shell.scale.setScalar(ORB_R); core.scale.setScalar(ORB_R * 0.5); halo.scale.setScalar(ORB_R * 6);
    for (const m of [shell, core, halo]) m.position.y = ORB_Y;
    for (const m of motes) m.scale.setScalar(16);
    g.add(lotus, shell, core, halo, ring, ...motes); scene.add(g);
    return { o, g, lotus, shell, core, halo, ring, motes, k: 1, pop: 0, phase: o.id * 1.7 };
  });
  const full = 30 * cfg.respawn;
  return {
    /** Mỗi khung vẽ: cầu lơ lửng / nhấp nháy; nhặt → nổ phồng rồi tắt; mọc lại → hiện dần; vòng đất đếm ngược. */
    update(w, dt, time) {
      for (const v of views) {
        const up = w.tick >= v.o.readyAt, prev = v.k;
        v.k = up ? Math.min(1, v.k + dt * 2.2) : Math.max(0, v.k - dt * 5);
        if (!up && prev === 1) v.pop = 1; // vừa bị nhặt
        v.pop = Math.max(0, v.pop - dt * 4);
        const bob = Math.sin(time * 2.1 + v.phase) * 9, s = v.k * (1 + v.pop * 0.8), pulse = 0.85 + 0.15 * Math.sin(time * 3.3 + v.phase);
        for (const m of [v.shell, v.core, v.halo]) { m.visible = s > 0.01; m.position.y = ORB_Y + bob; }
        v.shell.scale.setScalar(ORB_R * s); v.core.scale.setScalar(ORB_R * 0.5 * s * (0.9 + 0.1 * pulse)); v.halo.scale.setScalar(ORB_R * 6 * s);
        v.halo.material.opacity = 0.7 * pulse * v.k; v.shell.material.uniforms.uAlpha.value = v.k;
        v.motes.forEach((m, i) => { // đốm sáng xoáy lên quanh cầu
          const a = time * (1.1 + i * 0.13) + i * 1.257 + v.phase, h = ((time * 0.35 + i * 0.2) % 1);
          m.visible = v.k > 0.05; m.position.set(Math.cos(a) * ORB_R * (1.25 - h * 0.4), ORB_Y - 35 + h * 110 + bob, Math.sin(a) * ORB_R * (1.25 - h * 0.4));
          m.material.opacity = 0.9 * v.k * Math.sin(Math.PI * h);
        });
        const left = Math.max(0, v.o.readyAt - w.tick);
        v.ring.material.uniforms.uProg.value = up ? 1 : 1 - left / full;
        v.ring.material.uniforms.uAlpha.value = up ? 0.55 + 0.25 * pulse : 0.6;
        v.lotus.material.emissive.setRGB(0.03 + 0.05 * v.k * pulse, 0.08 + 0.14 * v.k * pulse, 0.04 + 0.05 * v.k * pulse);
      }
    },
  };
}
