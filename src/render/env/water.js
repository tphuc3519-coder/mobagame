import * as THREE from 'three';
import { noiseSurface } from './surfaces.js';

/** Dòng sông: nước trong (thấy lòng sông bùn sỏi bên dưới), đậm dần ra giữa dòng, sóng lăn tăn từ nhiễu cuộn theo dòng,
 *  phản chiếu trời theo góc nhìn (fresnel), lấp lánh nắng, bọt trắng vỡ dọc hai bờ và quanh chỗ đường lát băng qua (ghềnh cạn).
 *  setMask(bản đồ trộn nền) để chỗ đường đá băng qua sông là nước cạn chảy xiết trên đá thay vì phủ kín. */
export function buildRiver(map) {
  const diag = !!map.river.diag, len = diag ? Math.hypot(map.w, map.h) + 3200 : map.h + 4400;
  const U = { uTime: { value: 0 }, uNoise: { value: noiseSurface() }, uSplat: { value: null }, uXf: { value: new THREE.Vector4(0, 0, 0, 0) }, uHasMask: { value: 0 }, uFlow: { value: diag ? new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2) : new THREE.Vector2(0, 1) } };
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: false, depthWrite: false, uniforms: U,
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime, uHasMask; uniform sampler2D uNoise, uSplat; uniform vec4 uXf; uniform vec2 uFlow;
      float h(vec2 p){ vec2 f = uFlow * uTime; return texture2D(uNoise, p / 900.0 - f * 0.05).g * 0.6 + texture2D(uNoise, p / 330.0 - f * 0.12 + 0.3).b * 0.4; }
      void main(){
        vec2 p = vW.xz; float e = 3.0;
        vec3 n = normalize(vec3(h(p - vec2(e, 0.0)) - h(p + vec2(e, 0.0)), 0.05, h(p - vec2(0.0, e)) - h(p + vec2(0.0, e))));
        vec3 V = normalize(cameraPosition - vW);
        float edge = abs(vUv.x - 0.5) * 2.0;                                   // 0 giữa dòng → 1 ở bờ
        float ford = uHasMask > 0.5 ? texture2D(uSplat, (p - uXf.xy) * uXf.zw).r : 0.0; // đường đá băng qua → nước cạn
        float depth = (1.0 - smoothstep(0.15, 0.95, edge)) * (1.0 - ford * 0.85);
        vec3 shallow = vec3(0.16, 0.40, 0.38), deep = vec3(0.015, 0.11, 0.16);
        vec3 col = mix(shallow, deep, depth);
        float fres = pow(1.0 - max(0.0, dot(n, V)), 3.0);
        vec3 sky = vec3(0.50, 0.68, 0.78);
        col = mix(col, sky, 0.06 + fres * 0.45);
        vec3 L = normalize(vec3(0.5, 1.0, 0.67)); vec3 H = normalize(L + V);
        float spec = pow(max(0.0, dot(n, H)), 140.0) * 2.4;                     // lấp lánh nắng
        col += vec3(1.0, 0.95, 0.85) * spec;
        float nz = texture2D(uNoise, p / 220.0 - uFlow * uTime * 0.18).b;
        float foam = smoothstep(0.80, 0.97, edge + (nz - 0.5) * 0.35) + smoothstep(0.35, 0.9, ford) * smoothstep(0.45, 0.75, nz + 0.15 * sin(uTime * 3.0 + p.x * 0.02));
        foam += smoothstep(0.74, 0.8, texture2D(uNoise, p / 140.0 - uFlow * uTime * 0.35).b) * 0.2 * (1.0 - depth); // vệt bọt trôi
        col = mix(col, vec3(0.86, 0.93, 0.92), clamp(foam, 0.0, 1.0) * 0.7);
        float a = mix(0.5, 0.92, depth) + foam * 0.2;
        a *= smoothstep(1.0, 0.94, edge) * (1.0 - ford * 0.5);                  // hoà vào bờ; chỗ ghềnh cạn thấy rõ đá
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.95));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(map.river.width + 120, len, 1, 1), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  if (diag) { m.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 4); m.position.set(map.w / 2, 1, map.h / 2); } // chảy theo đường chéo y = x
  else m.position.set(map.river.x, 3, map.h / 2);
  return {
    mesh: m,
    update: (t) => { U.uTime.value = t; },
    setMask: (baked) => { U.uSplat.value = baked.tex; U.uXf.value = baked.xf; U.uHasMask.value = 1; },
  };
}
