// Service worker của Lantern Arena: chơi được khi không có mạng + cập nhật không trộn mã cũ / mới.
// Lúc deploy, tools/mk_sw.mjs thay chỗ trống BUILD bằng mã commit và chỗ trống FILES bằng danh sách { đường dẫn: [băm SHA-256 16 ký tự, loại,
// số byte] } (loại 'p' = tải sẵn lúc cài, 'r' = model tướng — lưu khi dùng / khi Sảnh nhờ tải trước). Mỗi tệp lưu dưới khoá
// <scope>/<đường dẫn>?v=<băm> trong MỘT bộ nhớ đệm 'la-files': deploy mới chỉ tải lại tệp đã đổi. Trong repo (chưa thay chỗ trống) chạy
// chế độ DEV: lấy mạng trước, lưu dự phòng 'la-dev' — sửa code ở máy không bao giờ bị phục vụ bản cũ.
const BUILD = '__BUILD__';
const FILES = /*__FILES__*/null;
const CACHE = 'la-files', DEV_CACHE = 'la-dev', DEV = !FILES, BASE = new URL('./', self.location).href;
const keyOf = (p, h) => BASE + p + '?v=' + h;
const pathOf = (url) => (url.startsWith(BASE) ? decodeURIComponent(url.slice(BASE.length).split(/[?#]/)[0]) : null);
const hex16 = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf)).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Tải tệp p, kiểm băm; lệch (bộ nhớ đệm HTTP 10 phút của Pages / CDN chưa kịp) thì tải lại bỏ đệm; vẫn lệch thì báo lỗi. */
async function getVerified(cache, p, h) {
  for (const mode of ['default', 'reload']) {
    const r = await fetch(BASE + p, { cache: mode });
    if (!r.ok) throw new Error(`${p}: ${r.status}`);
    const buf = await r.arrayBuffer();
    if ((await hex16(buf)) !== h) continue;
    const res = new Response(buf, { headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Content-Length': String(buf.byteLength) } });
    await cache.put(keyOf(p, h), res.clone());
    return res;
  }
  throw new Error(`${p}: băm không khớp`);
}

self.addEventListener('install', (e) => {
  if (DEV) { self.skipWaiting(); return; }
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE), todo = [];
    for (const [p, [h, kind]] of Object.entries(FILES)) if (kind === 'p' && !(await cache.match(keyOf(p, h)))) todo.push([p, h]);
    const lane = async () => { for (let it; (it = todo.shift());) await getVerified(cache, it[0], it[1]); };
    await Promise.all([lane(), lane(), lane(), lane()]); // một tệp lỗi ⇒ cài hỏng, bản cũ chạy tiếp
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = DEV ? DEV_CACHE : CACHE;
    for (const k of await caches.keys()) if (k.startsWith('la-') && k !== keep) await caches.delete(k);
    if (!DEV) {
      const live = new Set(Object.entries(FILES).map(([p, [h]]) => keyOf(p, h))), cache = await caches.open(CACHE);
      for (const req of await cache.keys()) if (!live.has(req.url)) await cache.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  let p = pathOf(req.url); if (p == null) return;
  if (req.mode === 'navigate' && (p === '' || p.endsWith('/'))) p += 'index.html';
  if (DEV) {
    e.respondWith(fetch(req).then((r) => { if (r.ok && r.type === 'basic') { const c = r.clone(); caches.open(DEV_CACHE).then((cc) => cc.put(req, c)); } return r; })
      .catch(() => caches.open(DEV_CACHE).then((cc) => cc.match(req, { ignoreSearch: req.mode === 'navigate' })).then((r) => r || Response.error())));
    return;
  }
  const f = FILES[p]; if (!f) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), hit = await cache.match(keyOf(p, f[0]));
    if (hit) return hit;
    try { return await getVerified(cache, p, f[0]); } catch (_) { return fetch(req).catch(() => Response.error()); }
  })());
});

/** Gửi tình trạng cho các trang: mã bản, chế độ thử, tướng nào đã lưu để chơi không mạng. */
async function status() {
  let heroes = [];
  if (!DEV) {
    const cache = await caches.open(CACHE);
    for (const [p, [h]] of Object.entries(FILES)) { const m = /^assets\/heroes\/([^/]+)\/\1\.glb$/.exec(p); if (m && (await cache.match(keyOf(p, h)))) heroes.push(m[1]); }
  }
  for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ type: 'STATUS', build: BUILD, dev: DEV, heroes });
}
/** Lưu sẵn model các tướng được nhờ (Sảnh gửi sau 2,5 giây khi không bật tiết kiệm dữ liệu). */
async function warm(ids, lite) {
  if (DEV || !Array.isArray(ids)) return;
  const cache = await caches.open(CACHE);
  for (const [p, [h, kind]] of Object.entries(FILES)) {
    const m = /^assets\/heroes\/([^/]+)\//.exec(p);
    if (kind !== 'r' || !m || !ids.includes(m[1]) || (lite && /_showcase\./.test(p))) continue;
    try { if (!(await cache.match(keyOf(p, h)))) await getVerified(cache, p, h); } catch (_) { /* mạng chập chờn: lần sau */ }
  }
}
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'WARM') e.waitUntil(warm(d.ids, d.lite).then(status));
  else if (d.type === 'STATUS') e.waitUntil(status());
});
