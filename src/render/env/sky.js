import * as THREE from 'three';
import { rngFor } from './noise.js';
import { glowTexture } from './textures.js';

export const FOG_COLOR = 0x86c4be;

/** Vòm trời chuyển màu (đỉnh xanh thẫm → chân trời ấm), đi theo camera, không chịu sương mù. */
export function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; void main(){
      float h = clamp(vD.y, -0.2, 1.0);
      vec3 top = vec3(0.16, 0.36, 0.62), mid = vec3(0.42, 0.72, 0.78), hor = vec3(1.0, 0.86, 0.66);
      vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.2, 0.85, h));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(7000, 24, 12), mat); m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

/** Quầng sáng ấm quanh đèn lồng và vệt sáng dưới đất: một Points + một InstancedMesh cho cả bản đồ. */
export function buildLampGlow(posts) {
  const g = new THREE.Group();
  const pos = new Float32Array(posts.length * 3); posts.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffb45c, size: 300, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(190, 20), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff9a44, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), posts.length);
  const d = new THREE.Object3D(); d.rotation.x = -Math.PI / 2;
  posts.forEach((p, i) => { d.position.set(p.x, 6, p.z); d.updateMatrix(); pool.setMatrixAt(i, d.matrix); });
  g.add(pool);
  return g;
}

/** Đom đóm bay lơ lửng (đổi chỗ và nhấp nháy trong shader, không tốn CPU). */
export function buildFireflies(map, count = 160) {
  const r = rngFor(303), zr = map.road ? [map.road.y - 1300, map.road.y + 1300] : [300, map.h - 300], xr = map.road ? [-300, map.w + 300] : [300, map.w - 300], base = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { base[i * 3] = r.range(xr[0], xr[1]); base[i * 3 + 1] = r.range(40, 260); base[i * 3 + 2] = r.range(zr[0], zr[1]); ph[i] = r.range(0, 100); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(base, 3)); geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 500 }, uMap: { value: glowTexture() } },
    vertexShader: `attribute float ph; uniform float uTime, uScale; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uTime*0.5+ph)*60.0, sin(uTime*0.8+ph*1.7)*30.0, cos(uTime*0.45+ph*1.3)*60.0);
        vec4 mv = modelViewMatrix * vec4(p,1.0); vA = 0.35 + 0.65*pow(0.5+0.5*sin(uTime*2.2+ph*3.0), 2.0);
        gl_PointSize = 90.0 * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a, a * vA); }',
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return { object: pts, update: (t, h) => { mat.uniforms.uTime.value = t; mat.uniforms.uScale.value = h * 0.5; } };
}
