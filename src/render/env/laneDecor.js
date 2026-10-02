import * as THREE from 'three';
import { tileFbm } from './surfaces.js';
import { rngFor } from './noise.js';

// Đường đi "đá mài khắc hoa văn" (tham khảo phong cách đường Liên Quân, tự vẽ — docs/01 §5): một dải lát chạy theo từng đường,
// mặt đá phẳng màu xám lạnh, chia tấm lớn, viền trang trí hai mép (gờ nổi + rãnh đôi + khấc), rãnh khắc uốn lượn hình chữ S chạy chéo
// mặt đường, huy hiệu khắc (thoi lồng + chữ V + vòng tròn) giữa mỗi đoạn, nứt mảnh, ố bẩn, rêu trong rãnh. Khắc nổi bằng bản đồ pháp tuyến
// (đèn thật quyết định sáng tối theo hướng đường), màu chỉ mang độ che khuất (rãnh tối). Chân trụ/nhà chính có vòng khắc tròn riêng.
// Mỗi texture vẽ một lần (canvas, lặp khít theo chiều dọc đường).

const cache = {};
const STONE = { base: [188, 185, 202], groove: [78, 76, 92], inlay: [160, 196, 236], moss: [92, 112, 74] };

/** Từ trường độ cao + màu (Float32) → { map, normal } (texture sắc nét, mipmap + anisotropy 16). */
function toTex(W, H, Hm, C, wrapY, alphaFn) {
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const ci = cc.getContext('2d').createImageData(W, H);
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; const ni = nc.getContext('2d').createImageData(W, H);
  const cx = (x) => Math.max(0, Math.min(W - 1, x)), cy = (y) => (wrapY ? (y + H) % H : Math.max(0, Math.min(H - 1, y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, hx = Hm[y * W + cx(x + 1)] - Hm[y * W + cx(x - 1)], hy = Hm[cy(y + 1) * W + x] - Hm[cy(y - 1) * W + x];
    let nx = -hx * 4, ny = hy * 4, nz = 1; const l = Math.hypot(nx, ny, nz);
    ni.data.set([(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (nz / l * 0.5 + 0.5) * 255, 255], 4 * k);
    ci.data.set([C[3 * k], C[3 * k + 1], C[3 * k + 2], alphaFn ? alphaFn(x, y) : 255], 4 * k);
  }
  cc.getContext('2d').putImageData(ci, 0, 0); nc.getContext('2d').putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(cc), normal = new THREE.CanvasTexture(nc);
  for (const t of [map, normal]) { t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = wrapY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, normal };
}

/** Sàn đường đá thật (1024×2048, lặp khít theo chiều dọc): lát PHIẾN ĐÁ LỚN mài nhẵn xếp so le theo hàng (mỗi hàng 2–3 tấm,
 *  mạch nối hơi lượn theo nhiễu, góc bo), mỗi tấm một tông đá khác nhau (xám lam/xám tím/ngả ấm), loang màu tự nhiên, gân đá mảnh,
 *  hạt mịn, ố bẩn; mép tấm vát (bản đồ pháp tuyến bắt sáng thật), mạch nối lõm đầy sạn tối; hai mép là bó vỉa đá dài sẫm hơn. */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 1024, H = 2048, r = rngFor(31);
  const cloud = tileFbm(401, 3, 5), mid = tileFbm(409, 12, 4), fine = tileFbm(419, 90, 3), grain = tileFbm(421, 420, 2), vein = tileFbm(433, 7, 5), vein2 = tileFbm(437, 18, 4), wx = tileFbm(443, 10, 3), wy = tileFbm(449, 10, 3);
  const Hm = new Float32Array(W * H), C = new Float32Array(W * H * 3);
  const B = 64, IN0 = B, IN1 = W - B;                                       // bó vỉa hai bên
  // hàng tấm: chiều cao ngẫu nhiên, tổng đúng bằng H (lặp khít)
  const rows = []; { let y = 0; while (y < H - 1) { let h = r.range(300, 470); if (H - y - h < 260) h = H - y; rows.push({ y0: y, y1: y + h, cuts: [] }); y += h; } }
  for (const row of rows) { const n = r.next() < 0.45 ? 1 : 2; let prev = IN0; for (let k = 0; k < n; k++) { const c = prev + (IN1 - prev) / (n - k + 0.6) * r.range(0.75, 1.15); row.cuts.push(Math.min(IN1 - 180, Math.max(prev + 200, c))); prev = row.cuts[row.cuts.length - 1]; } }
  const tones = [[150, 150, 164], [141, 142, 158], [152, 149, 160], [146, 148, 162], [154, 152, 160], [138, 140, 154]];
  const slabTone = new Map(); let sid = 0; for (const row of rows) for (let k = 0; k <= row.cuts.length; k++) slabTone.set(row.y0 * 10 + k, tones[(sid++ * 7 + 3) % tones.length].map((q) => q * r.range(0.95, 1.04)));
  const curbLen = 300, JOINT = 2.6, BEV = 9, RC = 14;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, u = x / H, v = y / H;                              // u,v cùng tỉ lệ → nhiễu không bị kéo giãn
    const cl = cloud(u, v) - 0.5, md = mid(u, v) - 0.5, fn = fine(u, v) - 0.5, gn = grain(u, v) - 0.5;
    const X = x + (wx(u, v) - 0.5) * 22, Y = y + (wy(u, v) - 0.5) * 22;  // mạch nối hơi lượn
    let dx, dy, tone, curb = false;
    if (X < IN0 || X >= IN1) { // bó vỉa
      curb = true; const lx = X < IN0 ? X : W - 1 - X, yy = ((Y + (X < IN0 ? 0 : 150)) % curbLen + curbLen) % curbLen;
      dx = Math.min(Math.abs(lx), Math.abs(B - lx)); dy = Math.min(yy, curbLen - yy); tone = [120, 120, 134];
    } else {
      const Yw = ((Y % H) + H) % H; let ri = rows.findIndex((q) => Yw >= q.y0 && Yw < q.y1); if (ri < 0) ri = rows.length - 1;
      const row = rows[ri], edges = [IN0, ...row.cuts, IN1]; let si = 0; while (si < edges.length - 2 && X >= edges[si + 1]) si++;
      dx = Math.min(X - edges[si], edges[si + 1] - X); dy = Math.min(Yw - row.y0, row.y1 - Yw); tone = slabTone.get(row.y0 * 10 + si);
    }
    // khoảng cách tới mạch nối, bo góc
    let d = Math.min(dx, dy); if (dx < RC && dy < RC) d = Math.max(0, RC - Math.hypot(RC - dx, RC - dy));
    const joint = d < JOINT, bev = Math.min(1, Math.max(0, (d - JOINT) / BEV));
    let h = joint ? 0.12 + (fn + gn) * 0.08 : 0.35 + 0.65 * Math.sqrt(bev);
    h += cl * 0.05 + md * 0.03 + gn * 0.012;
    let c;
    if (joint) c = [52 + gn * 30, 50 + gn * 28, 56 + gn * 26].map((q) => q * (1 + fn * 0.3));
    else {
      const vA = Math.abs(vein(u, v) - 0.5), vB = Math.abs(vein2(u, v) - 0.5);
      const vl = vA < 0.007 ? 1 - vA / 0.007 : 0, vd = vB < 0.005 ? 1 - vB / 0.005 : 0;
      let f = 1 + cl * 0.22 + md * 0.12 + fn * 0.07 + gn * 0.09;            // loang lớn + vừa + hạt
      f *= 1 - (1 - Math.min(1, (d - JOINT) / 26)) * 0.16;                  // bẩn bám mép tấm
      if (!curb) f *= 1 + 0.035 * (1 - Math.pow(Math.abs((x - W / 2) / (W / 2 - B)), 2)); // lối giữa mòn sáng nhẹ
      c = tone.map((q) => q * f * 0.92);
      const warm = Math.max(0, cl - 0.12) * 0.9; c = [c[0] * (1 + warm * 0.12), c[1] * (1 + warm * 0.05), c[2] * (1 - warm * 0.06)]; // ố ngả ấm
      c = c.map((q) => q + (190 - q) * vl * 0.16); c = c.map((q) => q * (1 - vd * 0.12)); // gân đá sáng / tối
      h -= vd * 0.04;
    }
    Hm[k] = h; C.set(c.map((q) => Math.max(0, Math.min(255, q))), 3 * k);
  }
  return (cache.lane = toTex(W, H, Hm, C, true));
}

/** Sân nhà chính: lát tròn đồng tâm hiện đại — các vòng tấm đá cong, mạch hướng tâm so le, vòng viền sẫm ngoài cùng, đĩa giữa. */
export function plazaTexture(kind) {
  if (cache[kind]) return cache[kind];
  const N = 1024, C0 = N / 2, Hm = new Float32Array(N * N), C = new Float32Array(N * N * 3), r = rngFor(kind.length * 7), grain = tileFbm(311, 160, 2);
  const rings = [[0, 70, 1], [70, 170, 10], [170, 270, 18], [270, 370, 26], [370, 452, 32], [452, 500, 40]];
  const SL = [170, 170, 180], BD = [104, 108, 124], MORT = [58, 60, 72];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - C0, dy = y - C0, rr = Math.hypot(dx, dy), k = y * N + x; let h = 0, c = [0, 0, 0];
    if (rr < 500) {
      const ri = rings.findIndex(([a, b]) => rr >= a && rr < b), [a0, a1, n] = rings[ri], ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1 + (ri % 2) * 0.5 / n) % 1, seg = ang * n, sl = seg - Math.floor(seg);
      const eR = Math.min(rr - a0, a1 - rr), eA = Math.min(sl, 1 - sl) * (2 * Math.PI * rr / n), e = Math.min(eR, n > 1 ? eA : 1e9);
      const mort = e < 2.2; h = mort ? 0 : Math.min(1, (e - 2.2) / 8);
      const base = ri === rings.length - 1 || ri === 0 ? BD : SL, t = ((Math.floor(seg) * 0.618 + ri * 0.3) % 1 - 0.5) * 0.08 + (grain(x / N, y / N) - 0.5) * 0.06;
      c = mort ? MORT : base.map((q) => q * (1 + t) * (0.93 + 0.07 * h));
    }
    Hm[k] = h; C.set(c, 3 * k);
  }
  void r;
  return (cache[kind] = toTex(N, N, Hm, C, false, (x, y) => (Math.hypot(x - C0, y - C0) < 500 ? 255 : 0)));
}

/** Vật liệu: Lambert + normal map, nhận bóng nướng sẵn (bản trộn nền) + bóng nhân vật thời gian thực. */
function stoneMat(t, baked, repeat, cores = []) {
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.62, metalness: 0, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (repeat) { m.map = t.map; }
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf }, uCores: { value: new THREE.Vector4(cores[0]?.x ?? -1e6, cores[0]?.y ?? -1e6, cores[1]?.x ?? -1e6, cores[1]?.y ?? -1e6) }, uTerr: { value: new THREE.Vector2(3300, 1100) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D uSplat; uniform vec4 uXf, uCores; uniform vec2 uTerr; varying vec2 vGxz;\nvec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(0.42, 1.0, texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw).b) * 0.88;
      { // chỉ lát trong lãnh thổ nhà chính: mờ dần ra ngoài (mép xé theo nhiễu từ hoa văn)
        // lát kín cả dải đường (gọn, dễ nhìn)
      }`).replace('#include <opaque_fragment>', `
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
  const cores = structs.filter((q) => q.kind === 'core').map((q) => ({ x: q.x, y: q.y }));
  const g = new THREE.Group(), t = laneTexture(), mat = stoneMat(t, baked, true, cores);
  for (const ln of map.lanes) {
    const W = ln.width * 1.08, rep = W * 2; // texture 1024×2048 → điểm ảnh vuông // một đoạn hoa văn dài 2.2 lần bề ngang
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
    if (s.kind !== 'core') continue; // chỉ sân nhà chính (trụ thường đứng trên nền cỏ xen đá)
    const R = s.kind === 'core' ? 1150 : 330, pt = plazaTexture(s.kind), m = stoneMat(pt, baked, false); m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4;
    const d = new THREE.Mesh(new THREE.CircleGeometry(R, 72), m); d.rotation.x = -Math.PI / 2; d.position.set(s.x, 0.9, s.y); d.receiveShadow = true; d.renderOrder = 0; g.add(d);
  }
  return g;
}
