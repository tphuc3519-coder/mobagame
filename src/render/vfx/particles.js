import * as THREE from 'three';
import { particleAtlas } from './atlas.js';

// Hệ hạt CPU + một draw call (THREE.Points, shader riêng): mỗi hạt có vị trí, vận tốc, cản, trọng lực, xoáy quanh tâm,
// cỡ/màu/độ trong đổi theo tuổi, ô ảnh trong atlas, góc xoay. Hai hệ: cộng sáng (lửa, tia, phép) và trộn thường (khói, bụi, lá, nước).
const VERT = `
attribute vec3 aColor; attribute float aAlpha; attribute float aSize; attribute float aTile; attribute float aRot;
uniform float uScale;
varying vec3 vColor; varying float vAlpha; varying float vTile; varying float vRot;
void main() {
  vColor = aColor; vAlpha = aAlpha; vTile = aTile; vRot = aRot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aAlpha <= 0.001 ? 0.0 : aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D uMap; uniform float uAdd;
varying vec3 vColor; varying float vAlpha; varying float vTile; varying float vRot;
void main() {
  vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard;
  float tx = mod(vTile, 4.0), ty = floor(vTile / 4.0);
  vec4 t = texture2D(uMap, vec2((tx + p.x) / 4.0, 1.0 - (ty + p.y) / 4.0)); // atlas 4×4 ô
  float a = t.a * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = uAdd > 0.5 ? vec4(vColor * t.rgb * a, 1.0) : vec4(vColor * t.rgb, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** floor(x, z): độ cao mặt nền phần nhìn; hạt sinh sát đất (y < 70, không bám theo vật thể) được nâng lên mặt đó (bệ trại quái…). */
export function createParticles(scene, { max = 2000, additive = true, floor = null } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), alpha = new Float32Array(max), size = new Float32Array(max), tile = new Float32Array(max), rot = new Float32Array(max);
  const attr = (a, n) => { const b = new THREE.BufferAttribute(a, n); b.setUsage(THREE.DynamicDrawUsage); return b; };
  geo.setAttribute('position', attr(pos, 3)); geo.setAttribute('aColor', attr(col, 3)); geo.setAttribute('aAlpha', attr(alpha, 1));
  geo.setAttribute('aSize', attr(size, 1)); geo.setAttribute('aTile', attr(tile, 1)); geo.setAttribute('aRot', attr(rot, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
    ...(additive && { blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation }),
    uniforms: { uMap: { value: particleAtlas() }, uScale: { value: 500 }, uAdd: { value: additive ? 1 : 0 } },
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; points.renderOrder = additive ? 6 : 5;
  scene.add(points);
  const P = []; // hạt đang sống
  const c0 = new THREE.Color(), c1 = new THREE.Color();

  /** Thêm một hạt. o: { x,y,z, vx,vy,vz, life, size:[đầu,cuối], color:[hex đầu, hex cuối], alpha:[đầu,cuối], fadeIn, drag, grav, tile, rot, spin,
   *  swirl: { x, z, w (rad/s), pull (1/s) } quay quanh tâm và hút vào, follow: () => {x,y,z} (gắn theo vật thể) } */
  function spawn(o) {
    if (P.length >= max) P.shift();
    const cs = [].concat(o.color ?? 0xffffff);
    let y = o.y ?? 0, fy = o.floor ?? -1e9;
    if (floor && !o.follow && y < 70) { const g = floor(o.x, o.z); if (g) { y += g; fy += g; } }
    P.push({
      x: o.x, y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, age: 0, life: o.life ?? 0.6,
      s0: o.size?.[0] ?? o.size ?? 30, s1: o.size?.[1] ?? o.size?.[0] ?? o.size ?? 30,
      c0: c0.set(cs[0]).toArray(), c1: c1.set(cs[1] ?? cs[0]).toArray(),
      a0: o.alpha?.[0] ?? o.alpha ?? 1, a1: o.alpha?.[1] ?? 0, fadeIn: o.fadeIn ?? 0.08,
      drag: o.drag ?? 0, grav: o.grav ?? 0, tile: o.tile ?? 0, rot: o.rot ?? Math.random() * 6.28, spin: o.spin ?? 0, swirl: o.swirl || null,
      follow: o.follow || null, ox: 0, oy: 0, oz: 0, floor: fy,
    });
  }

  return {
    spawn,
    get count() { return P.length; },
    setScale(v) { mat.uniforms.uScale.value = v; },
    update(dt) {
      let n = 0;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        p.age += dt;
        if (p.age >= p.life) continue;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
        p.vy -= p.grav * dt;
        if (p.swirl) { // quay quanh tâm (w) + hút vào (pull): dùng cho xoáy nước, lốc gió
          const s = p.swirl, dx = p.x - s.x, dz = p.z - s.z, a = s.w * dt, ca = Math.cos(a), sa = Math.sin(a), k = Math.max(0, 1 - (s.pull || 0) * dt);
          p.x = s.x + (dx * ca - dz * sa) * k; p.z = s.z + (dx * sa + dz * ca) * k;
        }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
        p.rot += p.spin * dt;
        let x = p.x, y = p.y, z = p.z;
        if (p.follow) { const f = p.follow(); if (!f) continue; x += f.x; y += f.y; z += f.z; } // vật thể mất (chết, ra khỏi tầm nhìn): bỏ hạt
        const t = p.age / p.life, fi = p.fadeIn > 0 ? Math.min(1, p.age / p.fadeIn) : 1;
        pos[3 * n] = x; pos[3 * n + 1] = y; pos[3 * n + 2] = z;
        col[3 * n] = p.c0[0] + (p.c1[0] - p.c0[0]) * t; col[3 * n + 1] = p.c0[1] + (p.c1[1] - p.c0[1]) * t; col[3 * n + 2] = p.c0[2] + (p.c1[2] - p.c0[2]) * t;
        alpha[n] = (p.a0 + (p.a1 - p.a0) * t) * fi; size[n] = p.s0 + (p.s1 - p.s0) * t; tile[n] = p.tile; rot[n] = p.rot;
        P[n++] = p;
      }
      P.length = n;
      geo.setDrawRange(0, n);
      for (const k of ['position', 'aColor', 'aAlpha', 'aSize', 'aTile', 'aRot']) geo.attributes[k].needsUpdate = true;
    },
  };
}
