import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Chỉnh màu cuối (sau tone map): tương phản nhẹ, giảm bão hoà chút cho bớt "đồ chơi", bóng ngả lạnh, sáng ngả ấm, viền tối (vignette). */
const GRADE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb;
      float l = dot(x, vec3(0.299, 0.587, 0.114));
      x = mix(vec3(l), x, 0.9);                                         // bão hoà 90%
      x = (x - 0.5) * 1.08 + 0.5;                                        // tương phản
      x += mix(vec3(-0.012, 0.0, 0.02), vec3(0.03, 0.012, -0.02), smoothstep(0.2, 0.8, l)); // bóng lạnh, sáng ấm
      float v = smoothstep(1.05, 0.35, length(vUv - 0.5) * 1.35); x *= mix(0.72, 1.0, v); // vignette
      gl_FragColor = vec4(clamp(x, 0.0, 1.0), c.a); }`,
};

/** Hậu kỳ trong trận: bloom chỉ bắt phần rất sáng (đèn lồng, lõi trụ, phần phát sáng của tướng, vệt nước). Tắt ở mức Thấp. */
export function createPost(renderer, scene, camera, level) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), level === 'high' ? 0.55 : 0.45, 0.5, 1.0);
  composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(new ShaderPass(GRADE));
  const resize = () => { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); };
  addEventListener('resize', resize); resize();
  return { render: () => composer.render(), composer };
}
