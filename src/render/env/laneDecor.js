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

/** Sàn đường kiểu tranh vẽ Liên Quân (1024×2048, lặp khít theo chiều dọc): đá xám tím chia thành TẤM LỚN bằng các rãnh cong
 *  vắt ngang đường (lượn sóng, so le) + một rãnh dọc lượn ngắt quãng; mỗi tấm sáng giữa, tối dần về mép (vẽ tay, mềm), cạnh trên rãnh
 *  có viền sáng mảnh, loang màu lớn, vệt mòn sáng giữa đường, vài vết nứt; hai bên là gờ viền đá bo tròn ngắt đoạn bởi khe cong. */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 1024, H = 2048, r = rngFor(23), cloud = tileFbm(401, 5, 4), mid = tileFbm(409, 20, 3), grain = tileFbm(419, 160, 2);
  const Hm = new Float32Array(W * H), C = new Float32Array(W * H * 3), TAU = Math.PI * 2;
  const LIGHT = [170, 164, 190], MIDC = [126, 120, 150], DARK = [58, 54, 80], CURB = [104, 100, 130], CURBL = [150, 146, 176];
  const B = 78, nS = 4, SP = H / nS;
  const seams = Array.from({ length: nS }, (_, k) => ({ y0: k * SP + SP * 0.5, a1: r.range(70, 120), p1: r.range(0, TAU), a2: r.range(20, 40), p2: r.range(0, TAU), tilt: r.range(-140, 140) }));
  const seamY = (sm, u) => sm.y0 + sm.a1 * Math.sin(Math.PI * u + sm.p1) + sm.a2 * Math.sin(TAU * 1.5 * u + sm.p2) + sm.tilt * (u - 0.5);
  const lonX = (v) => 0.5 + 0.13 * Math.sin(TAU * v * 2 + 0.7) + 0.05 * Math.sin(TAU * v * 5);
  const cracks = Array.from({ length: 10 }, () => { const pts = [[r.range(B + 40, W - B - 40), r.range(0, H)]]; for (let i = 0; i < 9; i++) { const [px, py] = pts[pts.length - 1]; pts.push([px + r.range(-16, 16), py + r.range(6, 18)]); } return pts; });
  const crackD = (x, y) => { let m = 99; for (const c of cracks) for (let i = 1; i < c.length; i++) { const [ax, ay] = c[i - 1], [bx, by] = c[i]; let dy = y - ay; if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H; const dx = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + dy * ey) / (dx * dx + ey * ey))); m = Math.min(m, Math.hypot(x - ax - dx * t, dy - ey * t)); } return m; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, u = x / W, v = y / H, cl = (cloud(u, v) - 0.5), md = (mid(u, v) - 0.5), gn = (grain(u, v) - 0.5);
    let h, c;
    if (x < B || x >= W - B) { // gờ viền bo tròn, ngắt đoạn bởi khe cong mỗi ~340px
      const lx = x < B ? x : W - 1 - x, t = lx / B, prof = Math.sin(Math.PI * Math.min(1, t * 1.05));
      const gy = (y + (x < B ? 0 : 170) + 30 * Math.sin(t * 3)) % 340, gap = Math.min(gy, 340 - gy);
      const cut = gap < 4 ? 0 : Math.min(1, (gap - 4) / 14);
      h = 0.6 + 0.4 * prof * cut; const lit = Math.max(0, Math.min(1, prof * 0.8 + (x < B ? (1 - t) : t) * 0.2));
      c = CURB.map((q, i) => (q + (CURBL[i] - q) * lit * cut) * (1 + cl * 0.18 + gn * 0.06) * (gap < 4 ? 0.55 : 1));
      if (t > 0.94) { c = DARK; h = 0.2; } // rãnh tiếp giáp lòng đường
    } else {
      let d = 1e9, side = 1; // khoảng cách tới rãnh ngang gần nhất (có dấu: phía trên/dưới)
      for (const sm of seams) for (const off of [-H, 0, H]) { const dy = y - (seamY(sm, u) + off); if (Math.abs(dy) < Math.abs(d)) { d = dy; side = Math.sign(dy); } }
      d = Math.abs(d);
      const segOn = Math.floor(((y + 0.25 * SP) % H) / SP) % 2 === 0; // rãnh dọc chỉ có ở tấm xen kẽ
      const dl = segOn ? Math.abs(u - lonX(v)) * W : 1e9, dd = Math.min(d, dl);
      const groove = dd < 4.5 ? 1 : 0, ao = 1 - Math.exp(-dd / 40);
      h = groove ? 0.2 : 0.5 + 0.5 * Math.min(1, (dd - 4.5) / 12);
      const center = 1 - Math.pow(Math.abs(u - 0.5) * 2, 2);                       // vệt mòn sáng giữa đường
      let t = 0.3 + 0.42 * ao + 0.14 * center + cl * 0.6 + md * 0.22 - Math.pow(1 - Math.min(1, (Math.min(x, W - x) - B) / 120), 2) * 0.25;              // sáng giữa tấm, tối về mép rãnh
      t = Math.max(0, Math.min(1.15, t));
      c = t < 0.5 ? MIDC.map((q, i) => DARK[i] + (q - DARK[i]) * (t / 0.5)) : MIDC.map((q, i) => q + (LIGHT[i] - q) * ((t - 0.5) / 0.5));
      if (!groove && side < 0 && d > 4.5 && d < 9 && dd === d) c = c.map((q) => q * 1.2);   // viền sáng mảnh cạnh trên rãnh
      if (groove) c = DARK.map((q, i) => q + (MIDC[i] - q) * 0.25 * (dd / 4.5)); // rãnh mềm: lõi tối, mép nhạt dần
      if (!groove && crackD(x, y) < 1.1) { c = c.map((q) => q * 0.62); h -= 0.08; }          // vết nứt
      c = c.map((q) => q * (1 + gn * 0.12));
    }
    Hm[k] = h; C.set(c, 3 * k);
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
  const m = new THREE.MeshLambertMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.2, 1.2), transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
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
