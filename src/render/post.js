import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Hậu kỳ trong trận: bloom chỉ bắt phần rất sáng (đèn lồng, lõi trụ, phần phát sáng của tướng, vệt nước). Tắt ở mức Thấp. */
export function createPost(renderer, scene, camera, level) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), level === 'high' ? 0.55 : 0.45, 0.5, 1.0);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const resize = () => { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); };
  addEventListener('resize', resize); resize();
  return { render: () => composer.render(), composer };
}
