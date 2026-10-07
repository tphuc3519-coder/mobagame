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
// Bộ đọc dự phòng (cách giải mã ảnh mặc định của three): trình duyệt nào giải mã ảnh nhúng kiểu nhanh ở trên bị lỗi thì đọc lại bằng nó.
const plain = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(), ready = new Map(), arts = new Map();
const prog = new Map(), urlOf = new Map(); // tiến độ tải từng file .glb (0..1) — màn tải trận vẽ thanh tiến độ theo model tướng của từng người
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Điện thoại (màn cảm ứng nhỏ): bỏ bản trưng bày chi tiết (texture 2048², ~8 MB) — bản trong trận đủ nét ở màn nhỏ, đỡ tốn bộ nhớ. */
const LITE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
/** Báo giao diện khi một tướng tải lỗi hẳn (sau các lần thử lại) — hiện thông báo kèm lỗi; nơi gọi tự thử lại sau. */
const fail = (id, e) => { try { dispatchEvent(new CustomEvent('la:modelfail', { detail: { id, error: e?.message || String(e) } })); } catch (_) { /* không có DOM */ } };

/** Tải cả file thành ArrayBuffer, báo tiến độ; không nhận thêm byte nào trong `idle` ms thì huỷ (mạng điện thoại treo, Safari treo tải
 *  khi chuyển tab) để nơi gọi thử lại thay vì chờ mãi. Lỗi HTTP gắn mã vào lỗi (e.http). */
async function fetchBytes(url, onP, idle = 20000) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let t = 0; const arm = () => { clearTimeout(t); t = setTimeout(() => ac?.abort(), idle); };
  arm();
  try {
    const r = await fetch(url, ac ? { signal: ac.signal } : {});
    if (!r.ok) { const e = new Error(`HTTP ${r.status} ${url.split('/').pop()}`); e.http = r.status; throw e; }
    const total = +r.headers.get('content-length') || 0;
    if (!r.body?.getReader) { const b = await r.arrayBuffer(); onP?.(1); return b; }
    const rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) { arm(); const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (total) onP?.(Math.min(1, got / total)); }
    const all = new Uint8Array(got); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    return all.buffer;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`mạng không phản hồi (${url.split('/').pop()})`);
    throw e;
  } finally { clearTimeout(t); }
}

const artOf = (id) => {
  if (!arts.has(id)) {
    const p = fetchBytes(`./assets/heroes/${id}/hero.art.json`).then((b) => JSON.parse(new TextDecoder().decode(b)));
    p.catch(() => arts.delete(id)); // lỗi mạng: lần sau tải lại, không giữ lỗi
    arts.set(id, p);
  }
  return arts.get(id);
};

/** Nạp model tướng + hero.art.json. Mỗi lần gọi thử tối đa 3 lần (cách nhau 1,2 s, 2,4 s); vẫn lỗi thì trả null (nơi gọi dùng model giữ
 *  chỗ / giữ tướng cũ và gọi lại sau) — lỗi KHÔNG được ghi nhớ: trước đây một lần tải hỏng (mạng chập chờn, Safari ngắt tải khi chuyển
 *  tab) làm tướng đó mất hẳn tới khi tải lại trang. showcase: bản trưng bày chi tiết cho sảnh/chọn tướng (art.showcase, 09 §3.4); tướng
 *  không có bản này, điện thoại, hoặc bản này lỗi thì dùng bản trong trận. */
export function loadHero(id, { showcase = false } = {}) {
  const key = showcase ? id + ':showcase' : id;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const art = await artOf(id);
    if (showcase && (!art.showcase || LITE)) return loadHero(id);
    const url = `./assets/heroes/${id}/${showcase ? art.showcase : art.model}`; urlOf.set(key, url);
    for (let a = 0; ; a++) {
      try { return { art, gltf: await loadGLB(url), showcase }; } catch (e) { if (a >= 2) throw e; await wait(1200 * (a + 1)); }
    }
  })().then((m) => { if (m) ready.set(key, m); else cache.delete(key); return m; }, (e) => {
    cache.delete(key);
    console.warn('Không nạp được model', id, showcase ? '(bản trưng bày)' : '', e?.message);
    if (showcase) return loadHero(id);
    fail(id, e);
    return null;
  });
  cache.set(key, p);
  return p;
}

/** Model đã nạp xong (không chờ); chưa xong thì undefined. */
export const peekHero = (id, { showcase = false } = {}) => ready.get(showcase ? id + ':showcase' : id);
/** Tiến độ tải model tướng 0..1 (đã xong = 1; chưa bắt đầu = 0). */
export function heroProgress(id, { showcase = false } = {}) {
  const key = showcase ? id + ':showcase' : id;
  if (ready.has(key)) return 1;
  const u = urlOf.get(key); return u ? Math.min(0.98, prog.get(u) || 0) : 0;
}

const b64buf = (s) => { const bin = atob(s), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf.buffer; };
/** Nạp một file .glb bất kỳ: tải (có tiến độ + hạn chờ); máy chủ không phục vụ .glb (bản chơi thử dạng artifact) thì dùng bản base64
 *  .glb.json; giải mã lỗi thì giải mã lại bằng bộ đọc mặc định. Lỗi ném ra là lỗi gốc của file .glb. */
export async function loadGLB(url) {
  const onP = (f) => prog.set(url, f);
  let buf;
  try { buf = await fetchBytes(url, onP); } catch (e) {
    try { buf = b64buf(JSON.parse(new TextDecoder().decode(await fetchBytes(url + '.json', (f) => onP(f * 0.9)))).b64); } catch (_) { throw e; }
  }
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  let g;
  try { g = await loader.parseAsync(buf, base); } catch (e) {
    console.warn('GLB: đọc lại bằng bộ đọc mặc định', url, e?.message);
    g = await plain.parseAsync(buf, base);
  }
  onP(1); return g;
}

/** Bản sao riêng xương cho mỗi entity, đổi mét → đơn vị thế giới (cm). */
export function instantiate({ art, gltf }) {
  const obj = clone(gltf.scene);
  obj.scale.setScalar(art.scale || 100);
  obj.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { object: obj, animations: gltf.animations, art };
}
