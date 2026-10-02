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
      // Toạ độ dòng chảy: s dọc dòng, t ngang dòng. Dòng giữa chảy nhanh, sát bờ chậm (cắt trượt) → dùng hai pha luân phiên để vân nước không bị kéo giãn.
      float hgt(vec2 q){ return texture2D(uNoise, q).g; }
      vec3 waveN(vec2 st, float spd){
        float ph0 = fract(uTime * 0.18), ph1 = fract(uTime * 0.18 + 0.5), w0 = 1.0 - abs(1.0 - 2.0 * ph0);
        vec3 n = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          float ph = k == 0 ? ph0 : ph1, w = k == 0 ? w0 : 1.0 - w0;
          vec2 o = vec2(ph * spd * 5.5, 0.0) + float(k) * vec2(0.37, 0.61);
          vec2 a = (st - o * 900.0) / vec2(1100.0, 520.0), b = (st - o * 1500.0) / vec2(380.0, 230.0), c = (st - o * 2100.0) / vec2(150.0, 110.0);
          float e = 0.004, ha = hgt(a), hb = hgt(b), hc = hgt(c); // sai phân tiến: 3 lần lấy mẫu mỗi tầng
          vec2 g = (vec2(hgt(a + vec2(e, 0.0)), hgt(a + vec2(0.0, e))) - ha) * 2.0
                 + (vec2(hgt(b + vec2(e, 0.0)), hgt(b + vec2(0.0, e))) - hb) * 1.4
                 + (vec2(hgt(c + vec2(e, 0.0)), hgt(c + vec2(0.0, e))) - hc) * 0.9;
          n += vec3(g.x, 0.0, g.y) * w;
        }
        return n;
      }
      // tia sáng khúc xạ dưới đáy nước cạn (caustics)
      float caustic(vec2 p, float t){
        vec2 i = p; float c = 1.0, inten = 0.005;
        for (int n = 0; n < 4; n++) { float tt = t * (1.0 - 3.5 / float(n + 1)); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1.0 / max(length(vec2(p.x / (sin(i.x + tt) / inten + 1e-4), p.y / (cos(i.y + tt) / inten + 1e-4))), 1e-3); }
        c /= 4.0; c = 1.17 - pow(max(c, 0.0), 1.4); return clamp(pow(abs(c), 8.0), 0.0, 1.0);
      }
      float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 p = vW.xz, fl = uFlow, pr = vec2(-fl.y, fl.x);
        float edge = abs(vUv.x - 0.5) * 2.0;                                   // 0 giữa dòng → 1 ở bờ
        float spd = mix(1.0, 0.35, edge * edge);                                // giữa dòng nhanh
        vec2 st = vec2(dot(p, fl), dot(p, pr));
        float ford = uHasMask > 0.5 ? texture2D(uSplat, (p - uXf.xy) * uXf.zw).r : 0.0; // đường đá băng qua → nước cạn chảy xiết
        float depth = (1.0 - smoothstep(0.12, 0.95, edge)) * (1.0 - ford * 0.85);
        vec3 g = waveN(st, spd * (1.0 + ford * 1.5));
        vec3 n = normalize(vec3((g.x * fl.x + g.z * pr.x) * 0.35, 0.06, (g.x * fl.y + g.z * pr.y) * 0.35));
        vec3 V = normalize(cameraPosition - vW);
        vec3 shallow = vec3(0.16, 0.40, 0.36), mid = vec3(0.04, 0.24, 0.29), deep = vec3(0.01, 0.08, 0.13);
        vec3 col = mix(mix(shallow, mid, smoothstep(0.0, 0.5, depth)), deep, smoothstep(0.45, 1.0, depth));
        // ánh sáng đáy nước cạn
        float ca = caustic(st / 170.0 + vec2(uTime * 0.25 * spd, 0.0), uTime * 0.55 + 23.0);
        col += vec3(0.45, 0.75, 0.62) * ca * (1.0 - depth) * 0.3 * (1.0 - ford);
        float fres = pow(1.0 - max(0.0, dot(n, V)), 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(vec3(0.42, 0.58, 0.70), vec3(0.78, 0.88, 0.95), clamp(R.y, 0.0, 1.0));
        col = mix(col, sky, 0.05 + fres * 0.4);
        col *= mix(1.0, 0.78, smoothstep(0.55, 0.9, edge));                     // bóng bờ đổ xuống mép nước
        vec3 L = normalize(vec3(0.5, 1.0, 0.67)); vec3 H = normalize(L + V);
        float spec = pow(max(0.0, dot(n, H)), 260.0) * 1.8 + pow(max(0.0, dot(n, H)), 50.0) * 0.08;
        col += vec3(1.0, 0.95, 0.85) * spec;
        // vệt bọt/dòng chảy kéo dài theo dòng (thấy rõ nước đang trôi)
        float lane = texture2D(uNoise, vec2(st.x / 1500.0 - uTime * 0.11 * spd, st.y / 140.0)).b;
        float streak = smoothstep(0.68, 0.74, lane) * smoothstep(0.82, 0.74, lane) * (0.3 + 0.5 * depth);
        float nz = texture2D(uNoise, st / 260.0 - vec2(uTime * 0.16 * spd, 0.0)).b;
        float foam = smoothstep(0.80, 0.97, edge + (nz - 0.5) * 0.35)                                         // bọt vỗ bờ
                   + smoothstep(0.35, 0.9, ford) * smoothstep(0.42, 0.72, nz + 0.18 * sin(uTime * 3.0 + st.x * 0.02)) // nước xiết qua ghềnh đá
                   + streak * 0.35;
        // lá/cánh hoa trôi theo dòng
        vec2 cell = vec2(st.x - uTime * 95.0 * spd, st.y) / vec2(320.0, 150.0), ci = floor(cell), cf = fract(cell) - 0.5;
        float hs = hash(ci), leaf = 0.0;
        if (hs > 0.86 && edge < 0.8) { float a = hs * 40.0 + uTime * 0.6; vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (cf * vec2(320.0, 150.0)); leaf = smoothstep(1.0, 0.75, length(q / vec2(13.0, 6.5))); }
        col = mix(col, vec3(0.86, 0.94, 0.93), clamp(foam, 0.0, 1.0) * 0.65);
        col = mix(col, hs > 0.95 ? vec3(0.95, 0.62, 0.70) : vec3(0.42, 0.55, 0.18), leaf * 0.9);
        float a = mix(0.58, 0.95, depth) + foam * 0.2 + leaf;
        a *= smoothstep(1.0, 0.94, edge) * (1.0 - ford * 0.45);                  // hoà vào bờ; chỗ ghềnh cạn thấy rõ đá
        gl_FragColor = vec4(clamp(col, 0.0, 3.0), clamp(a, 0.0, 0.96));
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
