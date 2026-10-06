import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(), ready = new Map(), arts = new Map();

const artOf = (id) => {
  if (!arts.has(id)) arts.set(id, fetch(`./assets/heroes/${id}/hero.art.json`).then((r) => r.json()));
  return arts.get(id);
};

async function loadGltf(base, file) {
  try { return await loader.loadAsync(base + file); }
  catch (_) { // máy chủ không phục vụ .glb (trang xem trước đăng dạng artifact): dùng bản base64 .glb.json
    const j = await (await fetch(base + file + '.json')).json();
    const bin = atob(j.b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return loader.parseAsync(buf.buffer, base);
  }
}

/** Nạp model tướng + hero.art.json. Thiếu file hoặc lỗi thì trả null để dùng model giữ chỗ (02 §13.4).
 *  showcase: bản trưng bày chi tiết cho sảnh/chọn tướng (art.showcase, 09 §3.4); tướng không có bản này hoặc nạp lỗi thì dùng bản trong trận. */
export function loadHero(id, { showcase = false } = {}) {
  const key = showcase ? id + ':showcase' : id;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    try {
      const art = await artOf(id);
      if (showcase && !art.showcase) return loadHero(id);
      return { art, gltf: await loadGltf(`./assets/heroes/${id}/`, showcase ? art.showcase : art.model), showcase };
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

/** Bản sao riêng xương cho mỗi entity, đổi mét → đơn vị thế giới (cm). */
export function instantiate({ art, gltf }) {
  const obj = clone(gltf.scene);
  obj.scale.setScalar(art.scale || 100);
  obj.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { object: obj, animations: gltf.animations, art };
}
