import * as THREE from 'three';
import { decalTexture } from './atlas.js';

// Các hình hiệu ứng dạng lưới (ngoài hạt): sóng xung kích, vệt trên đất, vệt chém hình cung, xoáy nước, bong bóng khiên,
// cột sáng, xích, dải vệt theo đầu vũ khí. Mỗi hình tự mờ dần theo thời gian sống rồi tự huỷ. Toạ độ: x, z mặt đất (y lên).
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
const NRM = { transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide }; // màu đậm, không bị trắng bệch trên nền sáng; lõi > 1 để bloom bắt
const TAIL = '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
const VS_UV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const col = (c) => new THREE.Color(c);
const ground = (m, y = 4) => { m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };

/** floor(x, z, r): độ cao mặt nền phần nhìn (bệ trại quái, hang mục tiêu lớn — env/floor.js); hình sát đất đặt lên trên mặt đó. */
export function createShapes(scene, { floor = null } = {}) {
  const live = [], fl = (x, z, r = 0) => (floor ? floor(x, z, r) : 0);
  const add = (obj, life, update, opts = {}) => { scene.add(obj); const it = { obj, life, t: 0, update, ...opts }; live.push(it); return it; };

  /** Sóng xung kích: vòng sáng nở từ r0 đến r1. o: { color, width (0..1), fill, alpha, life, y, ease } */
  function ring(x, z, r0, r1, o = {}) {
    const mat = new THREE.ShaderMaterial({ ...NRM, uniforms: { uC: { value: col(o.color ?? 0xffffff) }, uK: { value: col(o.core ?? 0xffffff) }, uR: { value: 0 }, uW: { value: o.width ?? 0.08 }, uA: { value: o.alpha ?? 1 }, uF: { value: o.fill ?? 0.25 } },
      vertexShader: VS_UV,
      fragmentShader: `uniform vec3 uC, uK; uniform float uR, uW, uA, uF; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; if (d > 1.0) discard;
          float x = abs(d - uR) / uW, band = exp(-x * x * 2.5); float inner = d < uR ? uF * pow(d / max(uR, 0.001), 3.0) : 0.0;
          float a = clamp(band + inner, 0.0, 1.0) * uA; vec3 c = mix(uC, uK * 2.2, band * band * 0.6);
          gl_FragColor = vec4(c, a);
        ${TAIL}` });
    const m = ground(new THREE.Mesh(new THREE.PlaneGeometry(2 * r1, 2 * r1), mat), (o.y ?? 5) + fl(x, z, r1)); m.position.x = x; m.position.z = z; m.renderOrder = 4;
    const life = o.life ?? 0.5;
    return add(m, life, (k) => { const e = 1 - Math.pow(1 - k, o.ease ?? 2.2); mat.uniforms.uR.value = (r0 + (r1 - r0) * e) / r1; mat.uniforms.uA.value = (o.alpha ?? 1) * (1 - k) * (1 - k); });
  }

  /** Vệt trên mặt đất (nứt, cháy xém, nước loang, vòng ký tự). o: { color, alpha, life, fadeIn, additive, spin, y, rot, grow } */
  function decal(kind, x, z, r, o = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: decalTexture(kind), color: col(o.color ?? 0xffffff).multiplyScalar(o.glow ?? (o.additive === false ? 1 : 1.8)), transparent: true, depthWrite: false, opacity: 0,
      blending: THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: o.additive === false }); // vệt sáng (nứt dung nham, ký tự): màu > 1 cho bloom
    const m = ground(new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), mat), (o.y ?? 8) + fl(x, z, r)); m.position.x = x; m.position.z = z; m.rotation.z = o.rot ?? Math.random() * 6.28; m.renderOrder = 3;
    const life = o.life ?? 1.5, a = o.alpha ?? 1, fi = o.fadeIn ?? 0.05;
    return add(m, life, (k, dt, t) => {
      mat.opacity = a * Math.min(1, t / Math.max(0.001, fi)) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      if (o.spin) m.rotation.z += o.spin * dt;
      if (o.grow) m.scale.setScalar(1 + o.grow * (1 - Math.pow(1 - k, 3)));
    });
  }

  /** Vệt chém hình cung trên mặt phẳng ngang quanh (x, z): quét từ góc a0 sang a1 (rad, hệ x-z), bán kính r0→r1.
   *  o: { color, core, life, y, tilt (nghiêng mặt cung, rad), alpha } */
  function arc(x, z, a0, a1, r0, r1, o = {}) {
    const N = 40, P = [], T = [], I = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= 1; j++) { const t = i / N, a = a0 + (a1 - a0) * t, r = j ? r1 : r0; P.push(Math.cos(a) * r, 0, Math.sin(a) * r); T.push(t, j); }
    for (let i = 0; i < N; i++) { const q = 2 * i; I.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2)); g.setIndex(I);
    const mat = new THREE.ShaderMaterial({ ...NRM, uniforms: { uC: { value: col(o.color ?? 0xffffff) }, uK: { value: col(o.core ?? 0xffffff) }, uH: { value: 0 }, uA: { value: 1 } },
      vertexShader: VS_UV,
      fragmentShader: `uniform vec3 uC, uK; uniform float uH, uA; varying vec2 vUv;
        void main(){ float t = vUv.x, r = vUv.y; if (t > uH) discard;
          float tail = smoothstep(uH - 0.8, uH, t); float w = 0.35 + 0.65 * tail; // vệt dày ở đầu, thon dần về đuôi
          float edge = smoothstep(1.0 - w, 1.0 - w * 0.4, r) * smoothstep(1.0, 0.9, r);
          float hot = smoothstep(0.75, 0.97, r) * smoothstep(1.0, 0.95, r) * tail;
          float a = clamp(edge * tail * 1.7, 0.0, 1.0) * uA; vec3 c = mix(uC * 1.3, uK * 2.6, hot);
          gl_FragColor = vec4(c, a);
        ${TAIL}` });
    const m = new THREE.Mesh(g, mat); m.position.set(x, (o.y ?? 120) + fl(x, z), z); m.rotation.x = o.tilt ?? 0; m.renderOrder = 7;
    const life = o.life ?? 0.28;
    return add(m, life, (k) => { mat.uniforms.uH.value = Math.min(1.3, k * 2.6); mat.uniforms.uA.value = (o.alpha ?? 1) * (k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6); });
  }

  /** Xoáy nước/gió trên mặt đất. o: { color, deep (màu tâm), life, speed, arms, alpha } */
  function vortex(x, z, r, o = {}) {
    const mat = new THREE.ShaderMaterial({ ...NRM, uniforms: { uC: { value: col(o.color ?? 0x7fe0ff) }, uD: { value: col(o.deep ?? 0x0a3a6a) }, uT: { value: 0 }, uA: { value: 0 }, uN: { value: o.arms ?? 4 } },
      vertexShader: VS_UV,
      fragmentShader: `uniform vec3 uC, uD; uniform float uT, uA, uN; varying vec2 vUv;
        void main(){ vec2 p = (vUv - 0.5) * 2.0; float d = length(p); if (d > 1.0) discard; float a = atan(p.y, p.x + 1e-5);
          float s = 0.5 + 0.5 * sin(uN * a + 9.0 * log(d + 0.05) + uT * 7.0); float arms = pow(s, 4.0);
          float rim = smoothstep(1.0, 0.75, d) * smoothstep(0.02, 0.25, d);
          float lip = 1.0 - smoothstep(0.0, 0.05, abs(d - 0.93));
          vec3 c = mix(uD, uC * 1.6, arms) + vec3(1.0) * lip * 0.8;
          gl_FragColor = vec4(c, (rim * (0.55 + 0.45 * arms) + lip * 0.6) * uA);
        ${TAIL}` });
    const m = ground(new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), mat), (o.y ?? 6) + fl(x, z, r)); m.position.x = x; m.position.z = z; m.renderOrder = 4;
    const life = o.life ?? 1.2;
    return add(m, life, (k, dt, t) => { mat.uniforms.uT.value = t * (o.speed ?? 1); mat.uniforms.uA.value = (o.alpha ?? 1) * Math.min(1, t / 0.15) * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3); m.scale.setScalar(0.6 + 0.4 * Math.min(1, t / 0.25)); });
  }

  /** Bong bóng/khiên cầu bám theo vật thể (follow() → Vector3). o: { color, life, alpha, hex (vân lục giác) } */
  function bubble(follow, r, o = {}) {
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uC: { value: col(o.color ?? 0x8fe8ff) }, uA: { value: 0 }, uT: { value: 0 }, uH: { value: o.hex ? 1 : 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 uC; uniform float uA, uT, uH; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2);
          float band = 0.5 + 0.5 * sin(vP.y * 0.12 - uT * 4.0); float hex = uH > 0.5 ? step(0.88, fract(atan(vP.z, vP.x + 1e-5) * 2.5)) + step(0.9, fract(vP.y * 0.05)) : 0.0;
          gl_FragColor = vec4(uC * (f * 1.05 + 0.03 + band * 0.05 + hex * 0.22) * uA, 1.0); // cộng màu: lòng khiên gần trong suốt (không trắng xoá tướng bên trong)
        ${TAIL}` });
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), mat); m.renderOrder = 8;
    const life = o.life ?? 2;
    return add(m, life, (k, dt, t) => {
      const p = follow(); if (p) m.position.set(p.x, p.y + r * 0.55, p.z);
      mat.uniforms.uT.value = t; const pop = Math.min(1, t / 0.18);
      m.scale.setScalar((0.6 + 0.4 * pop) * (1 + 0.03 * Math.sin(t * 6)));
      mat.uniforms.uA.value = (o.alpha ?? 1) * pop * (k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15);
    }, { kill: o.kill });
  }

  /** Cột sáng (lửa, nước phun, ánh đèn). o: { color, top, life, alpha, h } */
  function pillar(x, z, r, h, o = {}) {
    const mat = new THREE.ShaderMaterial({ ...ADD, uniforms: { uC: { value: col(o.color ?? 0xffc060) }, uK: { value: col(o.top ?? 0xffffff) }, uA: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 uC, uK; uniform float uA, uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float side = 1.0 - pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.5);
          float v = vUv.y; float fade = pow(1.0 - v, 1.4) * smoothstep(0.0, 0.05, v);
          float streak = 0.6 + 0.4 * sin(vUv.x * 40.0 + v * 6.0 - uT * 14.0);
          gl_FragColor = vec4(mix(uC, uK, 1.0 - v) * side * fade * streak * uA * 1.4, 1.0);
        ${TAIL}` });
    const base = fl(x, z, r), m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, h, 24, 1, true), mat); m.position.set(x, h / 2 + base, z); m.renderOrder = 7;
    const life = o.life ?? 0.6;
    return add(m, life, (k, dt, t) => { mat.uniforms.uT.value = t; mat.uniforms.uA.value = (o.alpha ?? 1) * Math.min(1, t / 0.06) * (1 - k); m.scale.set(1 + k * 0.4, 0.3 + 0.7 * Math.min(1, t / 0.12), 1 + k * 0.4); m.position.y = base + (h * m.scale.y) / 2; });
  }

  /** Xích/dây nối hai điểm (cập nhật mỗi khung bằng a(), b()). o: { color, width, life, kill } */
  function chain(a, b, o = {}) {
    const mat = new THREE.ShaderMaterial({ ...ADD, uniforms: { uC: { value: col(o.color ?? 0xc8b070) }, uA: { value: 1 }, uL: { value: 1 } },
      vertexShader: VS_UV,
      fragmentShader: `uniform vec3 uC; uniform float uA, uL; varying vec2 vUv;
        void main(){ float link = 0.55 + 0.45 * step(0.5, fract(vUv.y * uL / 26.0)); float edge = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
          gl_FragColor = vec4(uC * link * edge * uA * 1.3, 1.0);
        ${TAIL}` });
    const geo = new THREE.CylinderGeometry(o.width ?? 7, o.width ?? 7, 1, 6, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 7;
    return add(m, o.life ?? 1, (k) => {
      const p = a(), q = b(); if (!p || !q) return;
      const L = p.distanceTo(q); m.position.copy(p); m.lookAt(q); m.scale.set(1, 1, Math.max(1, L)); mat.uniforms.uL.value = L;
      mat.uniforms.uA.value = k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15;
    }, { kill: o.kill });
  }

  /** Dải vệt theo đầu vũ khí: mỗi khung đưa vào cặp điểm (chuôi, mũi); chỉ hiện khi vũ khí vung nhanh. o: { color, core, n, minSpeed, maxSpeed } */
  function trail(o = {}) {
    const n = o.n ?? 14, pos = new Float32Array(n * 2 * 3), alp = new Float32Array(n * 2), I = [];
    for (let i = 0; i < n - 1; i++) { const q = 2 * i; I.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(alp, 1)); g.setIndex(I);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    const mat = new THREE.ShaderMaterial({ ...NRM, uniforms: { uC: { value: col(o.color ?? 0xffffff) }, uK: { value: col(o.core ?? 0xffffff) } },
      vertexShader: 'attribute float aA; varying float vA; varying float vS; void main(){ vA = aA; vS = mod(float(gl_VertexID), 2.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uC, uK; varying float vA; varying float vS;
        void main(){ float a = vA * (0.15 + 0.85 * vS * vS), k = vA * vS; k *= k; gl_FragColor = vec4(mix(uC, uK * 1.6, k * k), a * 0.8);
        ${TAIL}` });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 9; scene.add(m);
    const hist = []; let lastTip = null;
    const self = {
      mesh: m, maxSp: 0,
      push(base, tip, dt) { // base/tip: Vector3 thế giới
        const jump = lastTip ? tip.distanceTo(lastTip) : 0;
        if (jump > 350) { hist.length = 0; lastTip = null; } // dịch chuyển tức thời (Chớp Bước, hồi sinh, về nhà): không kéo vệt nối chỗ cũ → chỗ mới
        const sp = lastTip && dt > 0 ? jump / dt : 0; lastTip = tip.clone(); self.maxSp = Math.max(self.maxSp, sp);
        const w = Math.min(1, Math.max(0, (sp - (o.minSpeed ?? 700)) / ((o.maxSpeed ?? 1600) - (o.minSpeed ?? 700))));
        hist.unshift({ b: base.clone(), t: tip.clone(), w }); if (hist.length > n) hist.pop();
        for (let i = 0; i < n; i++) {
          const h = hist[Math.min(i, hist.length - 1)], a = h ? h.w * (1 - i / (n - 1)) : 0;
          if (h) { pos.set([h.b.x, h.b.y, h.b.z], 6 * i); pos.set([h.t.x, h.t.y, h.t.z], 6 * i + 3); }
          alp[2 * i] = a; alp[2 * i + 1] = a;
        }
        g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
      },
      dispose() { scene.remove(m); g.dispose(); mat.dispose(); },
    };
    return self;
  }

  return {
    ring, decal, arc, vortex, bubble, pillar, chain, trail,
    get count() { return live.length; },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const it = live[i]; it.t += dt;
        const k = Math.min(1, it.t / it.life);
        if (it.kill?.()) it.t = Math.max(it.t, it.life * 0.85), it.kill = null;
        it.update(k, dt, it.t);
        if (it.t >= it.life) { scene.remove(it.obj); it.obj.geometry?.dispose(); it.obj.material?.dispose(); live.splice(i, 1); }
      }
    },
  };
}
