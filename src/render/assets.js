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
const cache = new Map(), ready = new Map(), arts = new Map();

const artOf = (id) => {
  if (!arts.has(id)) arts.set(id, fetch(`./assets/heroes/${id}/hero.art.json`).then((r) => r.json()));
  return arts.get(id);
};

/** Nạp model tướng + hero.art.json. Thiếu file hoặc lỗi thì trả null để dùng model giữ chỗ (02 §13.4).
 *  showcase: bản trưng bày chi tiết cho sảnh/chọn tướng (art.showcase, 09 §3.4); tướng không có bản này hoặc nạp lỗi thì dùng bản trong trận. */
export function loadHero(id, { showcase = false } = {}) {
  const key = showcase ? id + ':showcase' : id;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    try {
      const art = await artOf(id);
      if (showcase && !art.showcase) return loadHero(id);
      return { art, gltf: await loadGLB(`./assets/heroes/${id}/${showcase ? art.showcase : art.model}`), showcase };
    } catch (e) {
      console.warn('Không nạp được model', id, showcase ? '(bản trưng bày)' : '', e.message);
      return showcase ? loadHero(id) : null;
    }
  })().then((m) => { ready.set(key, m); return m; });
  cache.set(key, p);
  return p;
}

/** Model đã nạp xong (không chờ); chưa xong thì undefined. */
export const peekHero = (id, { showcase = false } = {}) => ready.get(showcase ? id + ':showcase' : id);

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
