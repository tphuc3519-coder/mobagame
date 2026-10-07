import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LEVELS } from './quality.js';

/** Chỉnh màu cuối (sau tone map): tương phản nhẹ, giảm bão hoà chút cho bớt "đồ chơi", bóng ngả lạnh, sáng ngả ấm, viền tối (vignette). */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uSharp: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uPx; uniform float uSharp; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0); vec3 x = min(max(c.rgb, vec3(0.0)), vec3(1.0));
      // làm nét (unsharp mask 4 lân cận, giới hạn để không tạo viền trắng)
      vec3 nb = texture2D(tDiffuse, vUv + vec2(uPx.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uPx.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, uPx.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uPx.y)).rgb;
      x = clamp(x + clamp((x * 4.0 - nb) * uSharp, -0.08, 0.08), 0.0, 1.0);
      float l = dot(x, vec3(0.299, 0.587, 0.114));
      x = mix(vec3(l), x, 0.9);                                        // bão hoà ~100%: dịu, không rực
      x = (x - 0.5) * 1.06 + 0.5;                                        // tương phản
      x *= 0.94;                                                         // hạ tông chung
      x += mix(vec3(-0.025, 0.012, 0.045), vec3(0.025, 0.015, -0.015), smoothstep(0.15, 0.75, l)); // bóng ngả lam ngọc, sáng ngả ấm
      float v = smoothstep(1.1, 0.4, length(vUv - 0.5) * 1.35); x *= mix(0.82, 1.0, v); // vignette nhẹ
      gl_FragColor = vec4(clamp(x, 0.0, 1.0), c.a); }`,
};

/** Hậu kỳ trong trận: bloom chỉ bắt phần rất sáng (đèn lồng, lõi trụ, phần phát sáng của tướng, vệt nước). Tắt ở mức Thấp. */
export function createPost(renderer, scene, camera, level) {
  const msaa = LEVELS[level]?.msaa || 0; // khử răng cưa: render target nhiều mẫu (khung mặc định có antialias không áp dụng cho hậu kỳ)
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), level === 'high' ? 0.55 : 0.45, 0.5, 1.0);
  // chặn NaN/vô cực: chỉ một điểm ảnh NaN (shader hiệu ứng tính lỗi trên GPU di động) lọt vào bloom sẽ bị làm mờ lan ra
  // toàn khung → màn hình đen lòm. Lọc ngay ở bước lấy vùng sáng của bloom (không tốn thêm lượt vẽ).
  const hp = bloom.materialHighPassFilter;
  hp.fragmentShader = hp.fragmentShader.replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv ); if ( any( isnan( texel ) ) || any( isinf( texel ) ) || !( abs( dot( texel, vec4( 1.0 ) ) ) < 1e5 ) ) texel = vec4( 0.0 ); texel = min( max( texel, vec4( 0.0 ) ), vec4( 64.0 ) ); /* max/min trả về số hợp lệ khi gặp NaN trên GPU D3D/Metal — chốt chặn kể cả khi trình dịch bỏ isnan */');
  hp.needsUpdate = true;
  const grade = new ShaderPass(GRADE); grade.uniforms.uSharp.value = level === 'high' ? 0.4 : 0.32;
  composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);
  const resize = () => { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); const pr = renderer.getPixelRatio(); grade.uniforms.uPx.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr)); };
  addEventListener('resize', resize); resize();
  return { render: () => composer.render(), composer, resize };
}
