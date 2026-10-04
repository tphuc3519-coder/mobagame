import * as THREE from 'three';
import { noiseSurface } from './surfaces.js';
import { abyssGLSL } from './abyss.js';

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
      ${abyssGLSL(map, 400)}
      // Toạ độ dòng chảy: s dọc dòng, t ngang dòng. Dòng giữa chảy nhanh, sát bờ chậm (cắt trượt) → dùng hai pha luân phiên để vân nước không bị kéo giãn.
      float hgt(vec2 q){ return texture2D(uNoise, q).g; }
      vec3 waveN(vec2 st, float spd){
        float ph0 = fract(uTime * 0.18), ph1 = fract(uTime * 0.18 + 0.5), w0 = 1.0 - abs(1.0 - 2.0 * ph0);
        vec3 n = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          float ph = k == 0 ? ph0 : ph1, w = k == 0 ? w0 : 1.0 - w0;
          vec2 o = vec2(ph * spd * 5.5, 0.0) + float(k) * vec2(0.37, 0.61);
          vec2 a = (st - o * 900.0) / vec2(1100.0, 520.0), b = (st - o * 1500.0) / vec2(380.0, 230.0), c = (st - o * 2100.0) / vec2(150.0, 110.0);
          float e = 0.018, ha = hgt(a), hb = hgt(b), hc = hgt(c); // bước sai phân ~4.6 texel: tránh sọc bậc thang do noise 8-bit // sai phân tiến: 3 lần lấy mẫu mỗi tầng
          vec2 g = (vec2(hgt(a + vec2(e, 0.0)), hgt(a + vec2(0.0, e))) - ha) * 2.0
                 + (vec2(hgt(b + vec2(e, 0.0)), hgt(b + vec2(0.0, e))) - hb) * 1.4
                 + (vec2(hgt(c + vec2(e, 0.0)), hgt(c + vec2(0.0, e))) - hc) * 0.9;
          n += vec3(g.x, 0.0, g.y) * w * 0.24;
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
        if (abyssAt(vW.xz)) discard;                                             // sông đổ xuống vực (thác ở abyss.js)
        vec2 p = vW.xz, fl = uFlow, pr = vec2(-fl.y, fl.x);
        float edge0 = abs(vUv.x - 0.5) * 2.0 * 1.4;                               // 1 = bờ danh nghĩa (mặt nước rộng 1.4 lần để bờ phình ra được)
        vec2 stp = vec2(dot(p, uFlow), dot(p, vec2(-uFlow.y, uFlow.x)));
        float side = vUv.x > 0.5 ? 0.0 : 0.5;                                    // hai bờ lượn khác nhau
        float shore = (texture2D(uNoise, vec2(stp.x / 5200.0, 0.21 + side)).r - 0.5) * 0.55 + (texture2D(uNoise, vec2(stp.x / 1400.0, 0.63 + side)).g - 0.5) * 0.14; // bờ lượn mạnh: vịnh, mũi đất
        float edge = clamp(edge0 + shore + 0.11, 0.0, 1.2);                      // 0 giữa dòng → 1 ở bờ (bờ lượn tự nhiên, không thẳng tắp)
        float spd = mix(1.0, 0.35, edge * edge);                                // giữa dòng nhanh
        vec2 st = vec2(dot(p, fl), dot(p, pr));
        float ford = uHasMask > 0.5 ? texture2D(uSplat, (p - uXf.xy) * uXf.zw).r : 0.0; // đường đá băng qua → nước cạn chảy xiết
        float pool = texture2D(uNoise, st / vec2(2200.0, 900.0)).r;                  // vũng sâu / bãi cạn loang lổ
        float depth = clamp((1.0 - smoothstep(0.05, 0.92, edge)) * (0.75 + pool * 0.5), 0.0, 1.0) * (1.0 - ford * 0.05); // sông chảy liền một mạch, đè lên cả mặt đường (đường chỉ mờ dưới nước)
        vec3 g = waveN(st, spd * (1.0 + ford * 1.5));
        vec3 n = normalize(vec3((g.x * fl.x + g.z * pr.x) * 0.35, 0.06, (g.x * fl.y + g.z * pr.y) * 0.35));
        vec3 V = normalize(cameraPosition - vW);
        vec3 shallow = vec3(0.19, 0.30, 0.24), mid = vec3(0.05, 0.17, 0.18), deep = vec3(0.012, 0.06, 0.085);   // nước sông: xanh rêu trong → lam sẫm
        vec3 col = mix(mix(shallow, mid, smoothstep(0.0, 0.5, depth)), deep, smoothstep(0.45, 1.0, depth));
        // ánh sáng đáy nước cạn
        float ca = caustic(st / 170.0 + vec2(uTime * 0.25 * spd, 0.0), uTime * 0.55 + 23.0);
        col += vec3(0.5, 0.7, 0.55) * ca * (1.0 - depth) * 0.16 * (1.0 - ford);
        float fres = pow(1.0 - max(0.0, dot(n, V)), 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(vec3(0.30, 0.40, 0.46), vec3(0.62, 0.72, 0.80), clamp(R.y, 0.0, 1.0));
        col = mix(col, sky, (0.04 + fres * 0.32) * (1.0 - ford * 0.6));
        col *= mix(1.0, 0.72, smoothstep(0.6, 0.95, edge)) * (1.0 - 0.18 * ford);                     // bóng bờ đổ xuống mép nước
        vec3 L = normalize(vec3(0.5, 1.0, 0.67)); vec3 H = normalize(L + V);
        float spec = pow(max(0.0, dot(n, H)), 300.0) * 1.1 + pow(max(0.0, dot(n, H)), 40.0) * 0.05;
        col += vec3(1.0, 0.95, 0.85) * spec;
        // vệt bọt/dòng chảy kéo dài theo dòng (thấy rõ nước đang trôi)
        float lane = texture2D(uNoise, vec2(st.x / 1500.0 - uTime * 0.11 * spd, st.y / 140.0)).b;
        float streak = smoothstep(0.7, 0.74, lane) * smoothstep(0.8, 0.74, lane) * (0.2 + 0.3 * depth) * smoothstep(0.45, 0.6, texture2D(uNoise, st / 600.0 - vec2(uTime * 0.05, 0.0)).g);
        float nz = texture2D(uNoise, st / 260.0 - vec2(uTime * 0.16 * spd, 0.0)).b;
        float nz2 = texture2D(uNoise, st / vec2(520.0, 90.0) - vec2(uTime * 0.07 * spd, 0.0)).r;
        float foam = smoothstep(0.86, 0.985, edge + (nz - 0.5) * 0.25) * smoothstep(0.35, 0.7, nz2) * 0.75     // bọt vỗ bờ: đứt quãng, mỏng
                   + smoothstep(0.3, 0.7, ford) * smoothstep(0.7, 0.85, nz + 0.12 * sin(uTime * 3.0 + st.x * 0.02)) * 0.12 // gợn nước chảy qua mặt đường
                   + streak * 0.0;
        // lá/cánh hoa trôi theo dòng
        vec2 cell = vec2(st.x - uTime * 95.0 * spd, st.y) / vec2(320.0, 150.0), ci = floor(cell), cf = fract(cell) - 0.5;
        float hs = hash(ci), leaf = 0.0;
        if (hs > 0.97 && edge < 0.75) { float a = hs * 40.0 + uTime * 0.6; vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (cf * vec2(320.0, 150.0)); leaf = smoothstep(1.0, 0.75, length(q / vec2(13.0, 6.5))); }
        col = mix(col, vec3(0.72, 0.80, 0.78), clamp(foam, 0.0, 1.0) * 0.5);
        col = mix(col, hs > 0.95 ? vec3(0.95, 0.62, 0.70) : vec3(0.42, 0.55, 0.18), leaf * 0.9);
        float a = mix(0.7, 0.95, depth) + foam * 0.15 + leaf;
        a = max(a, 0.86 * ford); a *= smoothstep(1.0, 0.9, edge) * smoothstep(1.4, 1.36, edge0);                  // mép nước tan dần vào bờ                // trên mặt đường nước vẫn đậm (~80%): đá lát chỉ thấp thoáng bên dưới
        gl_FragColor = vec4(clamp(col, 0.0, 3.0), clamp(a, 0.0, 0.96));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(map.river.width * 1.4, len, 1, 1), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  if (diag) { m.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 4); m.position.set(map.w / 2, 5, map.h / 2); } // chảy theo đường chéo y = x
  else m.position.set(map.river.x, 3, map.h / 2);
  return {
    mesh: m,
    update: (t) => { U.uTime.value = t; },
    setMask: (baked) => { U.uSplat.value = baked.tex; U.uXf.value = baked.xf; U.uHasMask.value = 1; },
  };
}
