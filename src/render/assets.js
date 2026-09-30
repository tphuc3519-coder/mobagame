import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/** Nạp model tướng + hero.art.json. Thiếu file hoặc lỗi thì trả null để dùng model giữ chỗ (02 §13.4). */
export async function loadHero(id) {
  if (cache.has(id)) return cache.get(id);
  const p = (async () => {
    try {
      const base = `./assets/heroes/${id}/`;
      const art = await (await fetch(base + 'hero.art.json')).json();
      const gltf = await loader.loadAsync(base + art.model);
      return { art, gltf };
    } catch (e) { console.warn('Không nạp được model', id, e.message); return null; }
  })();
  cache.set(id, p);
  return p;
}

/** Tạo bản sao riêng xương cho mỗi entity, đổi mét → đơn vị thế giới (cm). */
export function instantiate({ art, gltf }) {
  const obj = clone(gltf.scene);
  obj.scale.setScalar(art.scale || 100);
  obj.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { object: obj, animations: gltf.animations, art };
}
