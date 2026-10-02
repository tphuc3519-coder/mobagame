import * as THREE from 'three';
import { tileFbm } from './surfaces.js';
import { rngFor } from './noise.js';

// Đường đi "đá mài khắc hoa văn" (tham khảo phong cách đường Liên Quân, tự vẽ — docs/01 §5): một dải lát chạy theo từng đường,
// mặt đá phẳng màu xám lạnh, chia tấm lớn, viền trang trí hai mép (gờ nổi + rãnh đôi + khấc), rãnh khắc uốn lượn hình chữ S chạy chéo
// mặt đường, huy hiệu khắc (thoi lồng + chữ V + vòng tròn) giữa mỗi đoạn, nứt mảnh, ố bẩn, rêu trong rãnh. Khắc nổi bằng bản đồ pháp tuyến
// (đèn thật quyết định sáng tối theo hướng đường), màu chỉ mang độ che khuất (rãnh tối). Chân trụ/nhà chính có vòng khắc tròn riêng.
// Mỗi texture vẽ một lần (canvas, lặp khít theo chiều dọc đường).

const cache = {};
/** Từ canvas độ cao (xám) → { map (màu + alpha mép), normal }. tileY: lặp khít theo trục dọc. edgeFade: làm mờ hai mép ngang (dải đường). */
function bake(hc, { base, groove, inlay, moss, edgeFade = 0, seed = 1, radial = false }) {
  const W = hc.width, H = hc.height, src = hc.getContext('2d').getImageData(0, 0, W, H).data, h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = src[4 * i] / 255;
  // làm mịn nhẹ (mép khắc vát)
  const tmp = new Float32Array(W * H), wrapY = (y) => (radial ? Math.max(0, Math.min(H - 1, y)) : (y + H) % H), cx = (x) => Math.max(0, Math.min(W - 1, x));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -1; d <= 1; d++) s += h[y * W + cx(x + d)]; tmp[y * W + x] = s / 3; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -1; d <= 1; d++) s += tmp[wrapY(y + d) * W + x]; h[y * W + x] = s / 3; }
  const big = tileFbm(seed, 4, 4), mid = tileFbm(seed + 5, 16, 3), fine = tileFbm(seed + 9, 128, 2), mo = tileFbm(seed + 13, 10, 3);
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const cx2 = cc.getContext('2d'), ci = cx2.createImageData(W, H);
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; const nx2 = nc.getContext('2d'), ni = nx2.createImageData(W, H);
  const inl = src; // kênh G của canvas độ cao: 255 = khảm sáng
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, u = x / W, v = y / H, hv = h[k];
    const hx = h[y * W + cx(x + 1)] - h[y * W + cx(x - 1)], hy = h[wrapY(y + 1) * W + x] - h[wrapY(y - 1) * W + x];
    let nx = -hx * 7, ny = hy * 7, nz = 1; const l = Math.hypot(nx, ny, nz);
    ni.data.set([(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (nz / l * 0.5 + 0.5) * 255, 255], 4 * k);
    const g = Math.max(0, Math.min(1, (0.8 - hv) / 0.5));                                   // độ sâu rãnh 0..1
    const tone = 0.9 + (big(u, v) - 0.5) * 0.34 + (mid(u, v) - 0.5) * 0.14 + (fine(u, v) - 0.5) * 0.1;
    let c = base.map((q) => q * tone * (0.93 + Math.min(0.12, (hv - 0.8) * 0.6)));        // mặt đá, chỗ nổi sáng hơn chút
    const warm = Math.max(0, big(u * 1.7 + 0.3, v * 1.3) - 0.55) * 1.6; c = [c[0] * (1 + warm * 0.08), c[1] * (1 + warm * 0.02), c[2] * (1 - warm * 0.1)]; // loang ấm/lạnh
    c = c.map((q, i) => q + (groove[i] - q) * g);                                           // rãnh tối
    if (g > 0.3 && mo(u, v) > 0.58) c = c.map((q, i) => q + (moss[i] - q) * 0.55);          // rêu trong rãnh
    const inlayK = inl[4 * k + 1] / 255 - inl[4 * k] / 255;                                  // G > R: đường khảm
    if (inlayK > 0.2) c = c.map((q, i) => q + (inlay[i] - q) * Math.min(1, inlayK * 1.3));
    let a = 255;
    if (edgeFade) { const e = Math.min(u, 1 - u); a = e < edgeFade ? Math.round(255 * Math.pow(e / edgeFade, 1.4)) : 255; }
    ci.data.set([Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2]), a], 4 * k);
  }
  cx2.putImageData(ci, 0, 0); nx2.putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(cc), normal = new THREE.CanvasTexture(nc);
  for (const t of [map, normal]) { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = radial ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = 16; }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, normal };
}

const STONE = { base: [188, 185, 202], groove: [78, 76, 92], inlay: [160, 196, 236], moss: [92, 112, 74] };

/** Một đoạn đường lặp (ngang = bề ngang đường 512px, dọc = 2048px). */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 512, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rngFor(77);
  const grey = (v) => `rgb(${v},${v},${v})`, inl = (v) => `rgb(${v},255,${v})`; // khảm: G=255
  x.fillStyle = grey(204); x.fillRect(0, 0, W, H);
  x.lineCap = 'round'; x.lineJoin = 'round';
  const stroke = (d, w, v, dup = true) => { for (const oy of dup ? [-H, 0, H] : [0]) { x.save(); x.translate(0, oy); x.strokeStyle = v; x.lineWidth = w; x.stroke(d); x.restore(); } };
  // tấm đá lớn: hàng ngang so le
  for (let y = 0, row = 0; y < H; y += 256, row++) {
    const p = new Path2D(); p.moveTo(52, y); p.lineTo(W - 52, y); stroke(p, 3, grey(110));
    const cuts = row % 2 ? [W * 0.5] : [W * 0.3, W * 0.7];
    for (const cxp of cuts) { const q = new Path2D(); q.moveTo(cxp + r.range(-20, 20), y); q.lineTo(cxp + r.range(-20, 20), y + 256); stroke(q, 3, grey(110)); }
  }
  // viền hai mép: gờ nổi + rãnh đôi + khấc đều
  for (const side of [0, 1]) {
    const x0 = side ? W - 46 : 0, x1 = side ? W : 46;
    x.fillStyle = grey(226); x.fillRect(x0, 0, x1 - x0, H);
    for (const off of [46, 58]) { const p = new Path2D(), xx = side ? W - off : off; p.moveTo(xx, 0); p.lineTo(xx, H); stroke(p, off === 46 ? 4 : 2.5, grey(96), false); }
    for (let y = 0; y < H; y += 128) { x.fillStyle = grey(120); x.fillRect(side ? W - 40 : 12, y + 58, 28, 12); x.fillStyle = grey(240); x.fillRect(side ? W - 38 : 14, y + 60, 24, 3); }
  }
  // rãnh khắc uốn lượn hình chữ S chạy chéo mặt đường (2 lần mỗi đoạn), đôi song song + đuôi cuộn
  const sweep = (y0, flip) => {
    for (const [o, w, v] of [[0, 7, grey(84)], [16, 3.5, grey(108)], [-14, 2.5, grey(120)]]) {
      const p = new Path2D(), L = flip ? W - 70 : 70, R = flip ? 70 : W - 70;
      p.moveTo(L, y0 + o); p.bezierCurveTo(L + (R - L) * 0.45, y0 + o + 40, L + (R - L) * 0.2, y0 + 420 + o, R - (R - L) * 0.1, y0 + 520 + o);
      stroke(p, w, v);
    }
    const cxp = flip ? 88 : W - 88, q = new Path2D(); // đuôi cuộn xoắn
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 3.2 + (flip ? Math.PI : 0), rr = 34 * (1 - t * 0.8); const px = cxp + Math.cos(a) * rr, py = y0 + 560 + Math.sin(a) * rr; i ? q.lineTo(px, py) : q.moveTo(px, py); }
    stroke(q, 4, grey(92));
  };
  sweep(140, false); sweep(1160, true);
  // rãnh phụ: đường cong mảnh lượn ngược chiều, đan với rãnh chính
  for (const [y0, fl] of [[620, true], [1640, false]]) { const p = new Path2D(), L = fl ? W - 90 : 90, R = fl ? 120 : W - 120; p.moveTo(L, y0); p.bezierCurveTo(L + (R - L) * 0.6, y0 + 20, L + (R - L) * 0.5, y0 + 300, R, y0 + 360); stroke(p, 3, grey(104)); const q = new Path2D(); q.moveTo(L, y0 + 12); q.bezierCurveTo(L + (R - L) * 0.6, y0 + 32, L + (R - L) * 0.5, y0 + 312, R, y0 + 372); stroke(q, 1.6, grey(124)); }
  // dải hoạ tiết sóng ngang ở mỗi mạch tấm (hàng chữ C nối nhau giữa hai rãnh)
  for (let y = 0; y < H; y += 512) {
    for (const off of [-14, 14]) { const p = new Path2D(); p.moveTo(64, y + off); p.lineTo(W - 64, y + off); stroke(p, 2.4, grey(104)); }
    const q = new Path2D(); for (let xx = 70; xx < W - 70; xx += 24) { q.moveTo(xx, y + 6); q.quadraticCurveTo(xx + 12, y - 10, xx + 24, y + 6); } stroke(q, 2, grey(112));
  }
  // vảy cá nhỏ khắc mờ quanh huy hiệu
  for (const [cy, sc] of [[700, 1], [1720, 0.7]]) for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, rr = 170 * sc, px = W / 2 + Math.cos(a) * rr * 0.9, py = cy + Math.sin(a) * rr * 1.25; x.beginPath(); x.arc(px, py, 9 * sc, 0, Math.PI); x.strokeStyle = grey(118); x.lineWidth = 2; x.stroke(); }
  // huy hiệu giữa đoạn: thoi lồng, chữ V, vòng tròn, khảm sáng
  const emb = (cy, s) => {
    x.save(); x.translate(W / 2, cy); x.scale(s, s);
    const dm = (r1) => { const p = new Path2D(); p.moveTo(0, -r1); p.lineTo(r1 * 0.72, 0); p.lineTo(0, r1); p.lineTo(-r1 * 0.72, 0); p.closePath(); return p; };
    x.fillStyle = grey(232); x.fill(dm(118));
    for (const [r1, w, v] of [[118, 6, grey(84)], [96, 3, grey(110)], [64, 4, grey(92)]]) { x.strokeStyle = v; x.lineWidth = w; x.stroke(dm(r1)); }
    x.strokeStyle = inl(150); x.lineWidth = 3; x.stroke(dm(80));
    for (const sy of [-1, 1]) { const p = new Path2D(); p.moveTo(-60, sy * 150); p.lineTo(0, sy * 190); p.lineTo(60, sy * 150); x.strokeStyle = grey(96); x.lineWidth = 6; x.stroke(p); const q = new Path2D(); q.moveTo(-40, sy * 172); q.lineTo(0, sy * 200); q.lineTo(40, sy * 172); x.lineWidth = 3; x.strokeStyle = grey(116); x.stroke(q); }
    x.beginPath(); x.arc(0, 0, 26, 0, Math.PI * 2); x.fillStyle = grey(244); x.fill(); x.strokeStyle = grey(88); x.lineWidth = 5; x.stroke();
    x.beginPath(); x.arc(0, 0, 14, 0, Math.PI * 2); x.strokeStyle = inl(150); x.lineWidth = 3; x.stroke();
    x.restore();
  };
  emb(700, 0.85); emb(1720, 0.6);
  // nứt mảnh
  for (let i = 0; i < 22; i++) { let px = r.range(60, W - 60), py = r.range(0, H); const p = new Path2D(); p.moveTo(px, py); for (let k = 0; k < 8; k++) { px += r.range(-14, 14); py += r.range(4, 14); p.lineTo(px, py); } stroke(p, 1.2, grey(140)); }
  return (cache.lane = bake(c, { ...STONE, edgeFade: 0.03, seed: 211 }));
}

/** Vòng khắc tròn dưới chân trụ / sân nhà chính (ảnh vuông, alpha mờ mép ngoài). kind: 'tower' | 'core'. */
export function plazaTexture(kind) {
  if (cache[kind]) return cache[kind];
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), C = N / 2;
  const grey = (v) => `rgb(${v},${v},${v})`, inl = (v) => `rgb(${v},255,${v})`;
  x.fillStyle = grey(204); x.fillRect(0, 0, N, N); x.lineCap = 'round';
  const ring = (r1, w, v) => { x.beginPath(); x.arc(C, C, r1, 0, Math.PI * 2); x.strokeStyle = v; x.lineWidth = w; x.stroke(); };
  const nSp = kind === 'core' ? 24 : 12;
  x.fillStyle = grey(226); x.beginPath(); x.arc(C, C, 500, 0, Math.PI * 2); x.arc(C, C, 452, 0, Math.PI * 2, true); x.fill();
  for (const [r1, w, v] of [[452, 5, grey(90)], [440, 2.5, grey(112)], [330, 5, grey(92)], [318, 2.5, grey(116)], [200, 4, grey(96)]]) ring(r1, w, v);
  ring(386, 3, inl(150));
  for (let i = 0; i < nSp; i++) { // nan toả + khấc
    const a = (i / nSp) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    x.beginPath(); x.moveTo(C + ca * 205, C + sa * 205); x.lineTo(C + ca * 316, C + sa * 316); x.strokeStyle = grey(104); x.lineWidth = 3; x.stroke();
    x.save(); x.translate(C + ca * 476, C + sa * 476); x.rotate(a); x.fillStyle = grey(118); x.fillRect(-8, -14, 16, 28); x.restore();
    if (kind === 'core') { x.beginPath(); x.moveTo(C + ca * 340, C + sa * 340); x.quadraticCurveTo(C + Math.cos(a + 0.13) * 400, C + Math.sin(a + 0.13) * 400, C + Math.cos(a + 0.26) * 432, C + Math.sin(a + 0.26) * 432); x.strokeStyle = grey(100); x.lineWidth = 3.5; x.stroke(); }
  }
  for (let i = 0; i < 8; i++) { // cánh sen khắc vòng trong
    const a = (i / 8) * Math.PI * 2; x.save(); x.translate(C, C); x.rotate(a);
    const p = new Path2D(); p.moveTo(0, -60); p.quadraticCurveTo(52, -130, 0, -192); p.quadraticCurveTo(-52, -130, 0, -60); x.fillStyle = grey(222); x.fill(p); x.strokeStyle = grey(96); x.lineWidth = 3.5; x.stroke(p);
    x.restore();
  }
  ring(60, 5, grey(92)); ring(44, 3, inl(150));
  const out = bake(c, { ...STONE, seed: kind === 'core' ? 223 : 229, radial: true });
  // alpha tròn: mờ dần ở mép ngoài
  const m = out.map.image, mx = m.getContext('2d'), d = mx.getImageData(0, 0, N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const rr = Math.hypot(i - C, j - C) / C; d.data[4 * (j * N + i) + 3] = rr > 1 ? 0 : rr > 0.97 ? Math.round(255 * (1 - rr) / 0.03) : 255; }
  mx.putImageData(d, 0, 0); out.map.needsUpdate = true;
  return (cache[kind] = out);
}

/** Vật liệu: Lambert + normal map, nhận bóng nướng sẵn (bản trộn nền) + bóng nhân vật thời gian thực. */
function stoneMat(t, baked, repeat) {
  const m = new THREE.MeshLambertMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.6, 1.6), transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (repeat) { m.map = t.map; }
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D uSplat; uniform vec4 uXf; varying vec2 vGxz;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(0.42, 1.0, texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw).b) * 0.88;`).replace('#include <opaque_fragment>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLightShadow dls0 = directionalLightShadows[ 0 ];
        outgoingLight *= mix( 0.42, 1.0, getShadow( directionalShadowMap[ 0 ], dls0.shadowMapSize, dls0.shadowIntensity, dls0.shadowBias, dls0.shadowRadius, vDirectionalShadowCoord[ 0 ] ) );
      #endif
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'lane-stone' + (repeat ? 'r' : 'p');
  return m;
}

/** Dải đường theo đường gấp khúc (đã bo góc) + vòng khắc chân trụ/nhà chính. baked: bản trộn nền (bóng nướng sẵn). */
export function buildLaneDecor(map, baked, structs) {
  const g = new THREE.Group(), t = laneTexture(), mat = stoneMat(t, baked, true);
  for (const ln of map.lanes) {
    const W = ln.width * 1.04, rep = ln.width * 2.2; // một đoạn hoa văn dài 2.2 lần bề ngang
    // lấy mẫu đều theo quãng + làm mượt hướng
    const pts = [];
    for (let i = 0; i + 1 < ln.pts.length; i++) { const [ax, ay] = ln.pts[i], [bx, by] = ln.pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 60)); for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
    pts.push(ln.pts[ln.pts.length - 1]);
    const P = [], UV = [], I = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      P.push(pts[i][0] - nx * W / 2, 0.6, pts[i][1] - nz * W / 2, pts[i][0] + nx * W / 2, 0.6, pts[i][1] + nz * W / 2);
      UV.push(0, s / rep, 1, s / rep);
      if (i) { const q = (i - 1) * 2; I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { geo.setIndex(I.map((_, k) => I[k - (k % 3) + [0, 2, 1][k % 3]])); geo.computeVertexNormals(); }
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.renderOrder = 0; g.add(mesh);
  }
  // vòng khắc chân trụ / nhà chính
  for (const s of structs) {
    if (s.kind !== 'tower' && s.kind !== 'core') continue;
    const R = s.kind === 'core' ? 1150 : 330, pt = plazaTexture(s.kind), m = stoneMat(pt, baked, false); m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4;
    const d = new THREE.Mesh(new THREE.CircleGeometry(R, 72), m); d.rotation.x = -Math.PI / 2; d.position.set(s.x, 0.9, s.y); d.receiveShadow = true; d.renderOrder = 0; g.add(d);
  }
  return g;
}
