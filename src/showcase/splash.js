import * as THREE from 'three';

// Phông kiểu tranh splash sau lưng tướng (vẽ bằng shader, không ảnh): mây xoáy màu tướng, chùm tia sáng,
// đôi "cánh" dải lụa năng lượng chảy, hạt tàn lửa/cánh hoa bay xoáy. Đổi màu theo tướng qua setColors().
const U = () => ({ uT: { value: 0 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() } });

const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`;

function clouds(u) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 15), new THREE.ShaderMaterial({ uniforms: u, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uA, uB; varying vec2 vUv; ${NOISE}
      void main(){ vec2 p = (vUv - vec2(0.5, 0.42)) * vec2(2.6, 1.5); float r = length(p), a = atan(p.y, p.x);
        float swirl = fbm(vec2(a * 1.6 + uT * 0.05, r * 2.5 - uT * 0.12) * 1.3 + fbm(p * 2.0 + uT * 0.03));
        vec3 dark = mix(vec3(0.05, 0.03, 0.09), uA * 0.18, 0.5);
        vec3 c = mix(dark, uA * 0.42, smoothstep(0.35, 0.85, swirl) * (1.0 - smoothstep(0.2, 1.3, r)));
        c = mix(c, uB * 0.6, smoothstep(0.62, 0.95, swirl) * (1.0 - smoothstep(0.0, 0.9, r)) * 0.6);
        c += uB * pow(max(0.0, 1.0 - r * 1.3), 3.0) * 0.3;                       // lõi sáng sau lưng
        c *= 1.0 - 0.45 * smoothstep(0.9, 1.6, r);                               // tối viền
        gl_FragColor = vec4(c, 1.0); }` }));
  m.position.set(0, 2.2, -5); return m;
}

function rays(u) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uA, uB; varying vec2 vUv; ${NOISE}
      void main(){ vec2 p = vUv - 0.5; float r = length(p), a = atan(p.y, p.x);
        float ray = pow(vn(vec2(a * 9.0 + uT * 0.15, 0.0)), 3.0) * 0.8 + pow(vn(vec2(a * 23.0 - uT * 0.1, 3.0)), 5.0);
        float f = ray * smoothstep(0.5, 0.05, r) * smoothstep(0.0, 0.08, r);
        gl_FragColor = vec4(mix(uB, vec3(1.0), 0.3) * f * 0.14, 1.0); }` }));
  m.position.set(0, 1.6, -2.2); return m;
}

/** Một dải cánh: dải cong từ vai tung ra, shader lửa/lụa chảy dọc dải. */
function wing(u, side, i) {
  const n = 40, pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, ang = 0.25 + t * (1.25 + i * 0.22), R = 0.35 + t * (1.9 + i * 0.35);
    pts.push(new THREE.Vector3(side * Math.sin(ang) * R, 1.45 + Math.cos(ang) * R * 0.75 + t * (0.9 - i * 0.45), -0.45 - t * (0.6 + i * 0.25)));
  }
  const curve = new THREE.CatmullRomCurve3(pts), geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, p = curve.getPoint(t), tan = curve.getTangent(t), nrm = new THREE.Vector3(0, 0, 1).cross(tan).normalize();
    const w = (0.08 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.55 - i * 0.1)) * (1 - t * 0.3);
    pos.push(p.x + nrm.x * w, p.y + nrm.y * w, p.z, p.x - nrm.x * w, p.y - nrm.y * w, p.z); uv.push(t, 0, t, 1);
    if (k < n) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { ...u, uI: { value: i + (side > 0 ? 0 : 0.5) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT, uI; uniform vec3 uA, uB; varying vec2 vUv; ${NOISE}
      void main(){ float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float flow = fbm(vec2(vUv.x * 5.0 - uT * 0.9 + uI * 3.0, vUv.y * 2.5 + uT * 0.2));
        float streak = smoothstep(0.45, 0.9, fbm(vec2(vUv.x * 14.0 - uT * 1.6, vUv.y * 1.5 + uI)));
        float a = smoothstep(0.0, 0.5, edge) * (0.35 + flow * 0.9) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.08, vUv.x);
        vec3 c = mix(uA, uB, flow) * (0.9 + streak * 1.6) + vec3(1.0) * pow(edge, 8.0) * 0.3;
        gl_FragColor = vec4(c * a * 0.55, 1.0); }` }));
  return m;
}

function embers(u, n = 180) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.sin(i * 12.99) * 0.5) * 6; pos[i * 3 + 1] = (i * 0.618 % 1) * 5; pos[i * 3 + 2] = -1.5 + Math.cos(i * 7.7) * 1.5; ph[i] = i * 1.37; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...u, uH: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float ph; uniform float uT, uH; varying float vA; varying float vK;
      void main(){ vec3 p = position; p.y = mod(p.y + uT * (0.25 + fract(ph) * 0.3), 5.0) - 0.3; p.x += sin(uT * 0.7 + ph) * 0.4; p.z += cos(uT * 0.5 + ph) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = smoothstep(0.0, 0.6, p.y) * smoothstep(4.7, 3.5, p.y) * (0.5 + 0.5 * sin(uT * 4.0 + ph * 3.0)); vK = fract(ph * 0.37);
        gl_PointSize = uH * (0.012 + vK * 0.02) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uA, uB; varying float vA; varying float vK; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q * vec2(1.0, 1.8));
      float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(mix(uB, uA, vK) * a * 1.4, 1.0); }` }));
  m.frustumCulled = false; return m;
}

export function createSplash() {
  const u = U(), g = new THREE.Group();
  const cl = clouds(u), ry = rays(u), em = embers(u);
  g.add(cl, ry, em);
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) g.add(wing(u, s, i));
  return {
    group: g,
    setColors(a, b) { u.uA.value.set(a); u.uB.value.set(b); },
    update(t, viewH) { u.uT.value = t; em.material.uniforms.uH.value = viewH; },
  };
}
