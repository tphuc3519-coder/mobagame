import * as THREE from 'three';

// Hậu kỳ trong trận, gọn cho GPU điện thoại (TBDR: mỗi lượt vẽ toàn màn = đọc/ghi cả khung qua bộ nhớ chung). Trước: EffectComposer +
// UnrealBloomPass + OutputPass + chỉnh màu ≈ 15 lượt. Nay tối đa 7: cảnh → render target HalfFloat tuyến tính (MSAA tuỳ chọn) →
// (bloom) lọc sáng + thu 1/4 → làm mờ ngang/dọc ở 1/4 → ngang/dọc ở 1/8 → MỘT lượt cuối ra canvas: cộng bloom, tone map + sRGB, làm nét,
// chỉnh màu, vignette. Bloom giữ dáng 5 tầng mip cũ bằng 4 bán kính: lượt ngang ghi hai bán kính vào hai texture (MRT), lượt dọc gộp lại.

// σ (điểm ảnh khung vẽ) và tỉ phần năng lượng của 4 thành phần: s, m làm ở 1/4; w, vw ở 1/8 (từ kết quả 1/4). Khớp đường suy giảm của
// bloom cũ (5 tầng σ ≈ 4 / 14 / 40 / 104 / 257 px, mỗi tầng một phần, cường độ 3 × strength × 0,6).
const SIG = { s: 3.7, m: 14, w: 38, vw: 160 };
const PART = { s: 1, m: 1, w: 1.1, vw: 1.9 };
const GAIN = 1.8; // 3 × 0,6 (lerpBloomFactor của UnrealBloomPass với radius 0,5)

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const f = (x) => x.toFixed(6);

/** Nhân Gauss một chiều (σ tính bằng texel), gộp từng cặp texel kề nhau thành một lần đọc song tuyến: [[độ lệch, trọng số], …], đầu là tâm. */
function gauss(sigma) {
  const n = Math.max(1, Math.ceil(sigma * 3)), g = [];
  for (let i = 0; i <= n + 1; i++) g.push(i > n ? 0 : Math.exp(-0.5 * (i / sigma) ** 2));
  const sum = g.reduce((a, b, i) => a + (i ? 2 * b : b), 0), taps = [[0, g[0] / sum]];
  for (let i = 1; i <= n; i += 2) taps.push([(i * g[i] + (i + 1) * g[i + 1]) / (g[i] + g[i + 1]), (g[i] + g[i + 1]) / sum]);
  return taps;
}
/** Mã GLSL cộng dồn một nhân Gauss theo hướng uDir (đơn vị texel) vào biến `v`. */
const blurGlsl = (tex, v, taps) => taps.map(([o, w], i) => (i ? `${v} += (texture2D(${tex}, vUv + uDir * ${f(o)}).rgb + texture2D(${tex}, vUv - uDir * ${f(o)}).rgb) * ${f(w)};`
  : `vec3 ${v} = texture2D(${tex}, vUv).rgb * ${f(w)};`)).join('\n');

const passMat = (o) => new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending, ...o });

/** Lượt ngang: một nguồn → hai texture (hai bán kính). */
const blurH = (a, b) => passMat({
  glslVersion: THREE.GLSL3, toneMapped: false, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; layout(location = 0) out highp vec4 oA; layout(location = 1) out highp vec4 oB;
    void main(){ ${blurGlsl('tSrc', 'a', gauss(a))} ${blurGlsl('tSrc', 'b', gauss(b))} oA = vec4(a, 1.0); oB = vec4(b, 1.0); }`,
});
/** Lượt dọc: làm mờ tiếp từng texture theo bán kính của nó rồi trộn theo tỉ phần (tổng 1). */
const blurV = (a, b, ka, kb) => passMat({
  glslVersion: THREE.GLSL3, toneMapped: false, uniforms: { tA: { value: null }, tB: { value: null }, uDir: { value: new THREE.Vector2() } },
  fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform vec2 uDir; varying vec2 vUv; layout(location = 0) out highp vec4 oC;
    void main(){ ${blurGlsl('tA', 'a', gauss(a))} ${blurGlsl('tB', 'b', gauss(b))} oC = vec4(a * ${f(ka)} + b * ${f(kb)}, 1.0); }`,
});

/** Lọc sáng + thu nhỏ 1/4: 4 lần đọc song tuyến phủ ô 4×4 (mỗi lần = trung bình 2×2 như tầng nửa khung cũ), ngưỡng độ sáng 1.0 như cũ. */
const BRIGHT = `uniform sampler2D tScene; uniform vec2 uTexel; varying vec2 vUv;
  vec3 tap(vec2 o){ vec3 c = texture2D(tScene, vUv + o * uTexel).rgb;
    // chặn NaN/vô cực: chỉ một điểm ảnh NaN (shader hiệu ứng tính lỗi trên GPU di động) lọt vào bloom sẽ bị làm mờ lan ra toàn khung → màn
    // hình đen lòm. max/min trả về số hợp lệ khi gặp NaN trên GPU D3D/Metal — chốt chặn kể cả khi trình dịch bỏ isnan
    if (any(isnan(c)) || any(isinf(c)) || !(abs(dot(c, vec3(1.0))) < 1e5)) c = vec3(0.0);
    c = min(max(c, vec3(0.0)), vec3(64.0));
    return c * smoothstep(1.0, 1.01, luminance(c)); }
  void main(){ gl_FragColor = vec4(0.25 * (tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))), 1.0); }`;

/** Lượt cuối ra canvas: cộng bloom vào màu tuyến tính, tone map (renderer.toneMapping/Exposure) + sRGB như OutputPass cũ, rồi chỉnh màu
 *  như cũ: làm nét (unsharp mask 4 lân cận trên ảnh đã tone map, giới hạn để không tạo viền trắng), bão hoà, tương phản, bóng ngả lam ngọc
 *  / sáng ngả ấm, vignette. Bloom thay đổi chậm nên lân cận dùng chung giá trị bloom của điểm giữa. */
const FINAL = `uniform sampler2D tScene; uniform sampler2D tGlow4; uniform sampler2D tGlow8; uniform vec2 uPx; uniform float uSharp; uniform vec2 uBloom; varying vec2 vUv;
  vec3 hdr(vec2 uv){ return min(max(texture2D(tScene, uv).rgb, vec3(0.0)), vec3(64.0)); }
  vec3 tm(vec3 c){
  #ifdef TONE_MAPPING
    c = toneMapping(c);
  #endif
    return linearToOutputTexel(vec4(c, 1.0)).rgb; }
  void main(){ vec3 c = texture2D(tScene, vUv).rgb; if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0); c = min(max(c, vec3(0.0)), vec3(64.0));
    vec3 b = vec3(0.0);
  #ifdef BLOOM
    b = texture2D(tGlow4, vUv).rgb * uBloom.x + texture2D(tGlow8, vUv).rgb * uBloom.y;
  #endif
    vec3 x = tm(c + b);
    vec3 nb = tm(hdr(vUv + vec2(uPx.x, 0.0)) + b) + tm(hdr(vUv - vec2(uPx.x, 0.0)) + b) + tm(hdr(vUv + vec2(0.0, uPx.y)) + b) + tm(hdr(vUv - vec2(0.0, uPx.y)) + b);
    x = clamp(x + clamp((x * 4.0 - nb) * uSharp, -0.08, 0.08), 0.0, 1.0);
    float l = dot(x, vec3(0.299, 0.587, 0.114));
    x = mix(vec3(l), x, 0.9);                                          // bão hoà ~100%: dịu, không rực
    x = (x - 0.5) * 1.06 + 0.5;                                          // tương phản
    x *= 0.94;                                                           // hạ tông chung
    x += mix(vec3(-0.025, 0.012, 0.045), vec3(0.025, 0.015, -0.015), smoothstep(0.15, 0.75, l)); // bóng ngả lam ngọc, sáng ngả ấm
    float v = smoothstep(1.1, 0.4, length(vUv - 0.5) * 1.35); x *= mix(0.82, 1.0, v); // vignette nhẹ
    gl_FragColor = vec4(clamp(x, 0.0, 1.0), 1.0); }`;

/**
 * Hậu kỳ trong trận. bloom: bật quầng sáng (chỉ bắt phần rất sáng: đèn lồng, lõi trụ, phần phát sáng của tướng, hiệu ứng chiêu);
 * aa: số mẫu MSAA của render target cảnh (0/2/4 — khung mặc định có antialias không áp dụng khi vẽ qua hậu kỳ); strength: cường độ bloom
 * (thang như UnrealBloomPass cũ); sharp: độ làm nét. Trả về { render, resize, set({ bloom, aa, strength }), target } — target: render
 * target cảnh (dịch sẵn shader vật liệu vào đây). Đổi bloom / MSAA giữa trận không làm vật liệu cảnh dịch lại shader.
 */
export function createPost(renderer, scene, camera, { bloom = true, aa = 4, strength = 0.45, sharp = 0.32 } = {}) {
  const gl = renderer.getContext(), size = new THREE.Vector2();
  aa = aa | 0;
  // cảnh: HalfFloat tuyến tính (vật liệu không tone map — biến thể shader không phụ thuộc số mẫu). Độ sâu chỉ dùng trong lượt cảnh:
  // không giải đa mẫu, bỏ khỏi bộ nhớ sau lượt (đỡ băng thông trên GPU xếp ô)
  const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: aa, resolveDepthBuffer: false, storeMultisampledDepthBuffer: false });
  let rt = makeTarget();
  const lo = { type: THREE.HalfFloatType, depthBuffer: false };
  const b4 = new THREE.WebGLRenderTarget(1, 1, lo), h4 = new THREE.WebGLRenderTarget(1, 1, { ...lo, count: 2 }), g4 = new THREE.WebGLRenderTarget(1, 1, lo);
  const h8 = new THREE.WebGLRenderTarget(1, 1, { ...lo, count: 2 }), g8 = new THREE.WebGLRenderTarget(1, 1, lo);

  const bright = passMat({ toneMapped: false, uniforms: { tScene: { value: null }, uTexel: { value: new THREE.Vector2() } }, fragmentShader: BRIGHT });
  const hA = blurH(SIG.s / 4, SIG.m / 4), vA = blurV(SIG.s / 4, SIG.m / 4, PART.s / (PART.s + PART.m), PART.m / (PART.s + PART.m));
  const hB = blurH(SIG.w / 8, SIG.vw / 8), vB = blurV(SIG.w / 8, SIG.vw / 8, PART.w / (PART.w + PART.vw), PART.vw / (PART.w + PART.vw));
  const fin = [false, true].map((on) => passMat({
    defines: on ? { BLOOM: '' } : {}, // hai biến thể (có / không bloom), cùng dịch sẵn lúc tạo
    uniforms: { tScene: { value: null }, tGlow4: { value: g4.texture }, tGlow8: { value: g8.texture }, uPx: { value: new THREE.Vector2() }, uSharp: { value: sharp }, uBloom: { value: new THREE.Vector2() } },
    fragmentShader: FINAL,
  }));
  hA.uniforms.tSrc.value = b4.texture; vA.uniforms.tA.value = h4.textures[0]; vA.uniforms.tB.value = h4.textures[1];
  hB.uniforms.tSrc.value = g4.texture; vB.uniforms.tA.value = h8.textures[0]; vB.uniforms.tB.value = h8.textures[1];
  const bindScene = () => { bright.uniforms.tScene.value = rt.texture; for (const m of fin) m.uniforms.tScene.value = rt.texture; };
  const setStrength = (s) => fin[1].uniforms.uBloom.value.set(GAIN * s * (PART.s + PART.m), GAIN * s * (PART.w + PART.vw));
  bindScene(); setStrength(strength);

  const tri = new THREE.BufferGeometry(); // một tam giác phủ kín khung
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(tri, bright), qcam = new THREE.Camera();
  quad.frustumCulled = false;
  const draw = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quad, qcam); };

  const resize = () => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x), h = Math.max(1, size.y), w4 = Math.max(1, Math.round(w / 4)), h4h = Math.max(1, Math.round(h / 4));
    const w8 = Math.max(1, Math.round(w4 / 2)), h8h = Math.max(1, Math.round(h4h / 2));
    rt.setSize(w, h); b4.setSize(w4, h4h); h4.setSize(w4, h4h); g4.setSize(w4, h4h); h8.setSize(w8, h8h); g8.setSize(w8, h8h);
    bright.uniforms.uTexel.value.set(1 / w, 1 / h);
    hA.uniforms.uDir.value.set(1 / w4, 0); vA.uniforms.uDir.value.set(0, 1 / h4h);
    hB.uniforms.uDir.value.set(1 / w8, 0); vB.uniforms.uDir.value.set(0, 1 / h8h); // ngang 1/8 đọc thẳng texture 1/4 (thu nhỏ trong lúc làm mờ)
    for (const m of fin) m.uniforms.uPx.value.set(1 / w, 1 / h);
  };
  const passes = (on) => {
    if (on) { draw(bright, b4); draw(hA, h4); draw(vA, g4); draw(hB, h8); draw(vB, g8); }
    draw(fin[on ? 1 : 0], null);
  };
  addEventListener('resize', resize); resize();
  passes(false); passes(true); // dịch sẵn mọi shader hậu kỳ (cả biến thể không bloom) để bật / tắt giữa trận không khựng

  return {
    get target() { return rt; },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      if (!aa) gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_ATTACHMENT]); // không MSAA: three không tự bỏ độ sâu sau lượt
      const info = renderer.info, auto = info.autoReset;
      info.autoReset = false; // renderer.info đếm cả lượt hậu kỳ (bảng ?debug)
      passes(bloom);
      info.autoReset = auto;
    },
    resize,
    /** Đổi giữa trận: bloom bật/tắt, aa (0/2/4) tạo lại render target cảnh, strength cường độ bloom. */
    set(o = {}) {
      if (o.bloom !== undefined) bloom = !!o.bloom;
      if (o.strength !== undefined) setStrength(o.strength);
      if (o.aa !== undefined && (o.aa | 0) !== aa) { aa = o.aa | 0; rt.dispose(); rt = makeTarget(); bindScene(); resize(); }
    },
  };
}
