import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Texture } from 'three';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// Ảnh texture nhúng trong .glb: GLTFLoader mặc định tạo URL blob: rồi fetch/<img> — trang có chính sách bảo mật chặn blob:
// (bản chơi thử đăng dạng artifact) thì texture hỏng → tướng trắng toát. Giải mã thẳng từ bộ đệm bằng createImageBitmap, không cần URL.
loader.register((parser) => {
  const orig = parser.loadImageSource.bind(parser);
  parser.loadImageSource = (i, l) => {
    const def = parser.json.images[i];
    if (def.bufferView === undefined || typeof createImageBitmap === 'undefined' || parser.sourceCache[i] !== undefined) return orig(i, l);
    const p = parser.getDependency('bufferView', def.bufferView)
      .then((bv) => createImageBitmap(new Blob([bv], { type: def.mimeType }), { premultiplyAlpha: 'none' }))
      .then((bmp) => { const t = new Texture(bmp); t.needsUpdate = true; t.userData.mimeType = def.mimeType; return t; })
      .catch(() => { delete parser.sourceCache[i]; return orig(i, l); }); // trình duyệt không giải mã được: quay về cách cũ
    parser.sourceCache[i] = p;
    return p;
  };
  return { name: 'LA_inline_images' };
});
const cache = new Map();

/** Nạp model tướng + hero.art.json. Thiếu file hoặc lỗi thì trả null để dùng model giữ chỗ (02 §13.4). */
export function loadHero(id) {
  if (cache.has(id)) return cache.get(id);
  const p = (async () => {
    try {
      const base = `./assets/heroes/${id}/`;
      const art = await (await fetch(base + 'hero.art.json')).json();
      let gltf;
      try { gltf = await loader.loadAsync(base + art.model); }
      catch (_) { // máy chủ không phục vụ .glb (trang xem trước đăng dạng artifact): dùng bản base64 .glb.json
        const j = await (await fetch(base + art.model + '.json')).json();
        const bin = atob(j.b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        gltf = await loader.parseAsync(buf.buffer, base);
      }
      return { art, gltf };
    } catch (e) { console.warn('Không nạp được model', id, e.message); return null; }
  })();
  cache.set(id, p);
  return p;
}

/** Nạp một file .glb bất kỳ (máy chủ không phục vụ .glb thì dùng bản base64 .glb.json). */
export async function loadGLB(url) {
  try { return await loader.loadAsync(url); }
  catch (_) {
    const j = await (await fetch(url + '.json')).json(), bin = atob(j.b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return loader.parseAsync(buf.buffer, url.slice(0, url.lastIndexOf('/') + 1));
  }
}

/** Bản sao riêng xương cho mỗi entity, đổi mét → đơn vị thế giới (cm). */
export function instantiate({ art, gltf }) {
  const obj = clone(gltf.scene);
  obj.scale.setScalar(art.scale || 100);
  obj.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { object: obj, animations: gltf.animations, art };
}
