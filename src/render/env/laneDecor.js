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
function bake(hc, { base, groove, inlay, moss, edgeFade = 0, seed = 1, radial = false, smooth = 1, edgeWave = 0 }) {
  const W = hc.width, H = hc.height, src = hc.getContext('2d').getImageData(0, 0, W, H).data, h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = src[4 * i] / 255;
  // làm mịn nhẹ (mép khắc vát)
  const tmp = new Float32Array(W * H), wrapY = (y) => (radial ? Math.max(0, Math.min(H - 1, y)) : (y + H) % H), cx = (x) => Math.max(0, Math.min(W - 1, x));
  for (let pass = 0; pass < smooth; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -1; d <= 1; d++) s += h[y * W + cx(x + d)]; tmp[y * W + x] = s / 3; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -1; d <= 1; d++) s += tmp[wrapY(y + d) * W + x]; h[y * W + x] = s / 3; }
  }
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
    if (edgeFade) { const wv = edgeWave ? (mid(u < 0.5 ? 0.1 : 0.9, v) - 0.5) * edgeWave + (big(u < 0.5 ? 0.3 : 0.7, v) - 0.5) * edgeWave * 1.6 : 0, e = Math.min(u, 1 - u) - wv; a = e < 0 ? 0 : e < edgeFade ? Math.round(255 * Math.pow(e / edgeFade, 1.2)) : 255; } // mép lượn sóng hoà vào cỏ
    ci.data.set([Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2]), a], 4 * k);
  }
  cx2.putImageData(ci, 0, 0); nx2.putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(cc), normal = new THREE.CanvasTexture(nc);
  for (const t of [map, normal]) { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = radial ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = 16; }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, normal };
}

const STONE = { base: [188, 185, 202], groove: [78, 76, 92], inlay: [160, 196, 236], moss: [92, 112, 74] };

/** Đóng dấu một nét thon mềm (chuỗi chấm toả sáng/tối) — vẽ lên canvas độ cao, lặp khít theo trục dọc. op: 'lift' (nổi) | 'cut' (lõm). */
function softStroke(x, H, pts, wf, amount, op) {
  x.save(); x.globalCompositeOperation = op === 'lift' ? 'lighter' : 'multiply';
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), [px, py] = pts[i], R = wf(t); if (R <= 0.5) continue;
    for (const oy of [-H, 0, H]) {
      const g = x.createRadialGradient(px, py + oy, 0, px, py + oy, R);
      if (op === 'lift') { g.addColorStop(0, `rgba(${amount},${amount},${amount},0.5)`); g.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { const v = 255 - amount; g.addColorStop(0, `rgb(${v},${v},${v})`); g.addColorStop(0.55, `rgb(${Math.round(v + amount * 0.5)},${Math.round(v + amount * 0.5)},${Math.round(v + amount * 0.5)})`); g.addColorStop(1, 'rgb(255,255,255)'); }
      x.fillStyle = g; x.beginPath(); x.arc(px, py + oy, R, 0, Math.PI * 2); x.fill();
    }
  }
  x.restore();
}
const bez = (p0, p1, p2, p3, n = 120) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });

/** Một đoạn đường lặp (ngang 512px, dọc 2048px): đá mài liền mạch kiểu tranh vẽ — các mảng đá nổi uốn lượn như dòng chảy, rãnh mềm
 *  thon hai đầu ôm theo mảng, gờ mềm sát mép, mép đường lượn sóng hoà vào cỏ. Không chia ô gạch. */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 512, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rngFor(91);
  x.fillStyle = 'rgb(204,204,204)'; x.fillRect(0, 0, W, H);
  // gờ mềm hai mép (hơi nổi) + rãnh mềm phía trong gờ
  for (const side of [0, 1]) {
    const xs = side ? W - 34 : 34, pts = Array.from({ length: 161 }, (_, i) => [xs + Math.sin(i / 160 * Math.PI * 6 + side) * 6, (i / 160) * H]);
    softStroke(x, H, pts, () => 26, 60, 'lift');
    softStroke(x, H, pts.map(([px, py]) => [px + (side ? -30 : 30), py]), () => 9, 70, 'cut');
  }
  // mảng đá nổi lớn uốn lượn (như vệt nước chảy), so le hai bên
  const swirls = [
    [[90, 40], [380, 220], [120, 520], [430, 760]], [[440, 600], [140, 820], [430, 1090], [110, 1320]],
    [[110, 1180], [400, 1360], [140, 1640], [420, 1880]], [[420, 1760], [150, 1900], [380, 2040], [150, 2140]],
  ];
  for (const [a0, a1, a2, a3] of swirls) {
    const pts = bez(a0, a1, a2, a3);
    softStroke(x, H, pts, (t) => 44 * Math.sin(Math.PI * t) + 6, 110, 'lift');                         // thân mảng nổi
    for (const sd of [-1, 1]) { // rãnh mềm ôm hai bên mảng
      const off = pts.map(([px, py], i) => { const q = pts[Math.min(pts.length - 1, i + 1)], p = pts[Math.max(0, i - 1)], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, k = 46 * Math.sin(Math.PI * i / (pts.length - 1)) + 8; return [px - dy / l * k * sd, py + dx / l * k * sd]; });
      softStroke(x, H, off, (t) => 7 * Math.sin(Math.PI * t) + 1, 75, 'cut');
    }
  }
  // xoáy cuộn mềm ở đầu một số mảng
  for (const [cx0, cy0, dir] of [[420, 770, 1], [100, 1330, -1], [430, 1890, 1]]) {
    const pts = Array.from({ length: 90 }, (_, i) => { const t = i / 89, a = t * Math.PI * 2.6 * dir, rr = 40 * (1 - t * 0.85); return [cx0 + Math.cos(a) * rr, cy0 + Math.sin(a) * rr]; });
    softStroke(x, H, pts, (t) => 7 * (1 - t) + 1.5, 80, 'cut');
  }
  // vết mòn/nứt mảnh rất mờ
  for (let i = 0; i < 14; i++) { let px = r.range(70, W - 70), py = r.range(0, H); const pts = [[px, py]]; for (let k = 0; k < 10; k++) { px += r.range(-10, 10); py += r.range(6, 14); pts.push([px, py]); } softStroke(x, H, pts, () => 1.6, 45, 'cut'); }
  return (cache.lane = bake(c, { base: [168, 166, 188], groove: [98, 94, 118], inlay: [160, 196, 236], moss: [98, 118, 86], edgeFade: 0.035, edgeWave: 0.06, seed: 211, smooth: 3 }));
}

/** Sân tròn dưới chân trụ / nhà chính: đá mài liền mạch, các cánh xoáy nổi mềm toả từ tâm (như cánh hoa cuộn), rãnh vòng mềm,
 *  gờ mềm mép ngoài; mép ngoài mờ lượn hoà vào xung quanh. kind: 'tower' | 'core'. */
export function plazaTexture(kind) {
  if (cache[kind]) return cache[kind];
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), C = N / 2, H = 1e6;
  x.fillStyle = 'rgb(204,204,204)'; x.fillRect(0, 0, N, N);
  const circ = (R, n = 160) => Array.from({ length: n + 1 }, (_, i) => [C + Math.cos(i / n * Math.PI * 2) * R, C + Math.sin(i / n * Math.PI * 2) * R]);
  softStroke(x, H, circ(440), () => 40, 60, 'lift'); softStroke(x, H, circ(392), () => 9, 70, 'cut');
  softStroke(x, H, circ(150), () => 10, 70, 'cut'); softStroke(x, H, circ(110), () => 30, 55, 'lift');
  const arms = kind === 'core' ? 9 : 6;
  for (let k = 0; k < arms; k++) { // cánh xoáy nổi mềm
    const a0 = (k / arms) * Math.PI * 2, pts = Array.from({ length: 90 }, (_, i) => { const t = i / 89, a = a0 + t * 1.3, rr = 165 + t * 210; return [C + Math.cos(a) * rr, C + Math.sin(a) * rr]; });
    softStroke(x, H, pts, (t) => 34 * Math.sin(Math.PI * t) + 4, 65, 'lift');
    softStroke(x, H, pts.map(([px, py], i) => { const t = i / 89, a = a0 + t * 1.3 - 0.13; const rr = 165 + t * 210; return [C + Math.cos(a) * rr, C + Math.sin(a) * rr]; }), (t) => 6 * Math.sin(Math.PI * t) + 1, 75, 'cut');
  }
  const out = bake(c, { base: [178, 176, 196], groove: [104, 100, 122], inlay: [160, 196, 236], moss: [98, 118, 86], seed: kind === 'core' ? 223 : 229, radial: true, smooth: 3 });
  const m = out.map.image, mx = m.getContext('2d'), d = mx.getImageData(0, 0, N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = Math.atan2(j - C, i - C), rr = Math.hypot(i - C, j - C) / C + Math.sin(a * 7) * 0.012 + Math.sin(a * 3 + 1) * 0.015; d.data[4 * (j * N + i) + 3] = rr > 0.98 ? 0 : rr > 0.92 ? Math.round(255 * (0.98 - rr) / 0.06) : 255; }
  mx.putImageData(d, 0, 0); out.map.needsUpdate = true;
  return (cache[kind] = out);
}

/** Vật liệu: Lambert + normal map, nhận bóng nướng sẵn (bản trộn nền) + bóng nhân vật thời gian thực. */
function stoneMat(t, baked, repeat) {
  const m = new THREE.MeshLambertMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(2.4, 2.4), transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
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
    const W = ln.width * 1.12, rep = ln.width * 2.4; // một đoạn hoa văn dài 2.2 lần bề ngang
    // lấy mẫu đều theo quãng + làm mượt hướng
    const pts = [];
    for (let i = 0; i + 1 < ln.pts.length; i++) { const [ax, ay] = ln.pts[i], [bx, by] = ln.pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 60)); for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
    pts.push(ln.pts[ln.pts.length - 1]);
    const P = [], UV = [], I = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      P.push(pts[i][0] - nx * W / 2, 0.2, pts[i][1] - nz * W / 2, pts[i][0] + nx * W / 2, 0.2, pts[i][1] + nz * W / 2);
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
