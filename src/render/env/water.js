import * as THREE from 'three';
import { noiseSurface } from './surfaces.js';
import { abyssGLSL } from './abyss.js';

// Bước sai phân của pháp tuyến sóng (toạ độ texture nhiễu 256²: ~4,6 texel — tránh sọc bậc thang do nhiễu 8-bit).
const WAVE_E = 0.018;
let slopeTex = null;
/** Sai phân tiến của kênh G nhiễu nước, tính MỘT lần lúc dựng (lặp khít như nhiễu): R = h(q + e·x) − h(q), G = h(q + e·y) − h(q), lưu
 *  128 + d·k (8 bit, 0 chính xác). Mẫu "lệch e" nội suy song tuyến đúng như GPU lấy mẫu nhiễu gốc → mỗi tầng sóng 1 mẫu thay vì 3. */
function waveSlope() {
  if (slopeTex) return slopeTex;
  const src = noiseSurface().image, N = src.width, px = src.getContext('2d').getImageData(0, 0, N, N).data;
  const H = new Float32Array(N * N); // hàng texture (v tăng lên trên) = hàng canvas lật dọc (CanvasTexture.flipY)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[(N - 1 - j) * N + i] = px[4 * (j * N + i) + 1] / 255;
  const eT = WAVE_E * N, k0 = Math.floor(eT), f = eT - k0, at = (i, j) => H[(j & (N - 1)) * N + (i & (N - 1))];
  const dx = new Float32Array(N * N), dy = new Float32Array(N * N); let mx = 1e-3;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = at(i, j), k = j * N + i;
    dx[k] = at(i + k0, j) * (1 - f) + at(i + k0 + 1, j) * f - h; dy[k] = at(i, j + k0) * (1 - f) + at(i, j + k0 + 1) * f - h;
    mx = Math.max(mx, Math.abs(dx[k]), Math.abs(dy[k]));
  }
  const s = 127 / mx, data = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) { data[4 * k] = Math.round(128 + dx[k] * s); data[4 * k + 1] = Math.round(128 + dy[k] * s); data[4 * k + 2] = 128; data[4 * k + 3] = 255; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  return (slopeTex = { tex, k: 255 / s }); // d = (mẫu − 128/255) · k
}

/** Dòng sông: nước trong (thấy lòng sông bùn sỏi bên dưới), đậm dần ra giữa dòng, sóng lăn tăn từ nhiễu cuộn theo dòng,
 *  phản chiếu trời theo góc nhìn (fresnel), lấp lánh nắng, bọt trắng vỡ dọc hai bờ và quanh chỗ đường lát băng qua (ghềnh cạn).
 *  setMask(bản đồ trộn nền) để chỗ đường đá băng qua sông là nước cạn chảy xiết trên đá thay vì phủ kín.
 *  detail: 'high' = 3 tầng sóng, ánh đáy (chỉ nơi nước cạn, không phải ghềnh), lá trôi; 'mid' = 2 tầng sóng, không ánh đáy / lá;
 *  'low' = 1 tầng sóng + fresnel + bọt bờ đơn giản. Mẫu texture/điểm ảnh cao/vừa/thấp: 12/10/5 (trước: 26 + ánh đáy mọi nơi). */
export function buildRiver(map, { detail = 'high' } = {}) {
  const D = detail === 'low' ? 0 : detail === 'mid' ? 1 : 2;
  const diag = !!map.river.diag, len = diag ? Math.hypot(map.w, map.h) + 3200 : map.h + 4400;
  const slope = waveSlope();
  const U = { uTime: { value: 0 }, uNoise: { value: noiseSurface() }, uSlope: { value: slope.tex }, uSplat: { value: null }, uXf: { value: new THREE.Vector4(0, 0, 0, 0) }, uHasMask: { value: 0 }, uFlow: { value: diag ? new THREE.Vector2(Math.SQRT1_2, Math.SQRT1_2) : new THREE.Vector2(0, 1) } };
  // tầng sóng: [bước trôi, tỉ lệ, trọng số] (mức Thấp giữ tầng giữa, tăng trọng số cho mặt nước không phẳng lì)
  const layers = D === 2 ? [[900, '1100.0, 520.0', '2.0'], [1500, '380.0, 230.0', '1.4'], [2100, '150.0, 110.0', '0.9']]
    : D === 1 ? [[900, '1100.0, 520.0', '2.0'], [1500, '380.0, 230.0', '1.4']] : [[1500, '380.0, 230.0', '2.4']];
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: false, depthWrite: false, uniforms: U,
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime, uHasMask; uniform sampler2D uNoise, uSlope, uSplat; uniform vec4 uXf; uniform vec2 uFlow;
      ${abyssGLSL(map, 400)}
      // Toạ độ dòng chảy: s dọc dòng, t ngang dòng. Dòng giữa chảy nhanh, sát bờ chậm (cắt trượt) → dùng hai pha luân phiên để vân nước không bị kéo giãn.
      vec2 slope(vec2 q){ return (texture2D(uSlope, q).rg - 128.0 / 255.0) * ${slope.k.toFixed(6)}; } // = (h(q+e·x) − h(q), h(q+e·y) − h(q)), tính sẵn
      vec3 waveN(vec2 st, float spd){
        float ph0 = fract(uTime * 0.18), ph1 = fract(uTime * 0.18 + 0.5), w0 = 1.0 - abs(1.0 - 2.0 * ph0);
        vec3 n = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          float ph = k == 0 ? ph0 : ph1, w = k == 0 ? w0 : 1.0 - w0;
          vec2 o = vec2(ph * spd * 5.5, 0.0) + float(k) * vec2(0.37, 0.61);
          vec2 g = ${layers.map(([v, sc, wt]) => `slope((st - o * ${v}.0) / vec2(${sc})) * ${wt}`).join('\n                 + ')};
          n += vec3(g.x, 0.0, g.y) * w * 0.24;
        }
        return n;
      }${D === 2 ? `
      // tia sáng khúc xạ dưới đáy nước cạn (caustics)
      float caustic(vec2 p, float t){
        vec2 i = p; float c = 1.0, inten = 0.005;
        for (int n = 0; n < 4; n++) { float tt = t * (1.0 - 3.5 / float(n + 1)); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1.0 / max(length(vec2(p.x / (sin(i.x + tt) / inten + 1e-4), p.y / (cos(i.y + tt) / inten + 1e-4))), 1e-3); }
        c /= 4.0; c = 1.17 - pow(max(c, 0.0), 1.4); return clamp(pow(abs(c), 8.0), 0.0, 1.0);
      }
      float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }` : ''}
      void main(){
        if (abyssAt(vW.xz)) discard;                                             // sông đổ xuống vực (thác ở abyss.js)
        vec2 p = vW.xz, fl = uFlow, pr = vec2(-fl.y, fl.x);
        float edge0 = abs(vUv.x - 0.5) * 2.0 * 1.4;                               // 1 = bờ danh nghĩa (mặt nước rộng 1.4 lần để bờ phình ra được)
        vec2 stp = vec2(dot(p, uFlow), dot(p, vec2(-uFlow.y, uFlow.x)));
        float side = vUv.x > 0.5 ? 0.0 : 0.5;                                    // hai bờ lượn khác nhau
        float shore = (texture2D(uNoise, vec2(stp.x / 5200.0, 0.21 + side)).r - 0.5) * 0.55${D ? ' + (texture2D(uNoise, vec2(stp.x / 1400.0, 0.63 + side)).g - 0.5) * 0.14' : ''}; // bờ lượn mạnh: vịnh, mũi đất
        float edge = clamp(edge0 + shore + 0.11, 0.0, 1.2);                      // 0 giữa dòng → 1 ở bờ (bờ lượn tự nhiên, không thẳng tắp)
        float vis = smoothstep(1.0, 0.9, edge) * smoothstep(1.4, 1.36, edge0);    // mép nước tan dần vào bờ
        if (vis <= 0.0) discard;                                                  // dải mép trong suốt hẳn (~1/5 tấm nước): khỏi tính tiếp
        float spd = mix(1.0, 0.35, edge * edge);                                // giữa dòng nhanh
        vec2 st = vec2(dot(p, fl), dot(p, pr));
        float ford = uHasMask > 0.5 ? texture2D(uSplat, (p - uXf.xy) * uXf.zw).r : 0.0; // đường đá băng qua → nước cạn chảy xiết
        float pool = ${D ? 'texture2D(uNoise, st / vec2(2200.0, 900.0)).r' : '0.5'};                  // vũng sâu / bãi cạn loang lổ
        float depth = clamp((1.0 - smoothstep(0.05, 0.92, edge)) * (0.75 + pool * 0.5), 0.0, 1.0) * (1.0 - ford * 0.05); // sông chảy liền một mạch, đè lên cả mặt đường (đường chỉ mờ dưới nước)
        vec3 g = waveN(st, spd * (1.0 + ford * 1.5));
        vec3 n = normalize(vec3((g.x * fl.x + g.z * pr.x) * 0.35, 0.06, (g.x * fl.y + g.z * pr.y) * 0.35));
        vec3 V = normalize(cameraPosition - vW);
        vec3 shallow = vec3(0.19, 0.30, 0.24), mid = vec3(0.05, 0.17, 0.18), deep = vec3(0.012, 0.06, 0.085);   // nước sông: xanh rêu trong → lam sẫm
        vec3 col = mix(mix(shallow, mid, smoothstep(0.0, 0.5, depth)), deep, smoothstep(0.45, 1.0, depth));${D === 2 ? `
        // ánh sáng đáy nước cạn: chỉ tính nơi đóng góp thấy được (nước sâu / ghềnh trên mặt đường: bỏ, sai khác < 0,0005)
        float ck = (1.0 - depth) * (1.0 - ford);
        if (ck > 0.004) col += vec3(0.5, 0.7, 0.55) * caustic(st / 170.0 + vec2(uTime * 0.25 * spd, 0.0), uTime * 0.55 + 23.0) * ck * 0.16;` : ''}
        float fres = pow(1.0 - max(0.0, dot(n, V)), 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(vec3(0.30, 0.40, 0.46), vec3(0.62, 0.72, 0.80), clamp(R.y, 0.0, 1.0));
        col = mix(col, sky, (0.04 + fres * 0.32) * (1.0 - ford * 0.6));
        col *= mix(1.0, 0.72, smoothstep(0.6, 0.95, edge)) * (1.0 - 0.18 * ford);                     // bóng bờ đổ xuống mép nước
        vec3 L = normalize(vec3(0.5, 1.0, 0.67)); vec3 H = normalize(L + V);
        float spec = pow(max(0.0, dot(n, H)), 300.0) * 1.1${D ? ' + pow(max(0.0, dot(n, H)), 40.0) * 0.05' : ''};
        col += vec3(1.0, 0.95, 0.85) * spec;
        float nz = texture2D(uNoise, st / 260.0 - vec2(uTime * 0.16 * spd, 0.0)).b;${D ? `
        float nz2 = texture2D(uNoise, st / vec2(520.0, 90.0) - vec2(uTime * 0.07 * spd, 0.0)).r;
        float foam = smoothstep(0.86, 0.985, edge + (nz - 0.5) * 0.25) * smoothstep(0.35, 0.7, nz2) * 0.75     // bọt vỗ bờ: đứt quãng, mỏng` : `
        float foam = smoothstep(0.86, 0.985, edge + (nz - 0.5) * 0.25) * 0.5                                    // bọt bờ đơn giản`}
                   + smoothstep(0.3, 0.7, ford) * smoothstep(0.7, 0.85, nz + 0.12 * sin(uTime * 3.0 + st.x * 0.02)) * 0.12; // gợn nước chảy qua mặt đường
        col = mix(col, vec3(0.72, 0.80, 0.78), clamp(foam, 0.0, 1.0) * 0.5);
        float a = mix(0.7, 0.95, depth) + foam * 0.15;${D === 2 ? `
        // lá/cánh hoa trôi theo dòng
        vec2 cell = vec2(st.x - uTime * 95.0 * spd, st.y) / vec2(320.0, 150.0), ci = floor(cell), cf = fract(cell) - 0.5;
        float hs = hash(ci), leaf = 0.0;
        if (hs > 0.97 && edge < 0.75) { float an = hs * 40.0 + uTime * 0.6; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * (cf * vec2(320.0, 150.0)); leaf = smoothstep(1.0, 0.75, length(q / vec2(13.0, 6.5))); }
        col = mix(col, hs > 0.95 ? vec3(0.95, 0.62, 0.70) : vec3(0.42, 0.55, 0.18), leaf * 0.9);
        a += leaf;` : ''}
        a = max(a, 0.86 * ford) * vis;                                                                              // trên mặt đường nước vẫn đậm (~80%): đá lát chỉ thấp thoáng bên dưới
        gl_FragColor = vec4(clamp(col, 0.0, 3.0), clamp(a, 0.0, 0.96));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mat.customProgramCacheKey = () => 'river' + D;
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
