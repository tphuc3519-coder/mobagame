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

/** Sàn lát đá mài nhẵn hoa văn cầu kỳ (chỉ đoạn từ nhà chính ra trụ nhà, 1024×2048 lặp khít dọc đường):
 *  - lòng đường: phiến cẩm thạch xám lam mài bóng (gân mờ), mạch nối mảnh; mỗi chu kỳ một ĐĨA HOA VĂN lớn giữa đường
 *    (vòng ngoài khảm + chuỗi hạt, sao 8 cánh lát đá sẫm viền khảm, vòng trong, hoa 8 cánh ngà, nhuỵ), lồng trong khung thoi viền đôi;
 *    giữa hai đĩa là thoi nhỏ lồng vòng tròn;
 *  - hai mép: dải viền đá sẫm có vân thừng bện (hai đường sin đan chéo) + hạt thoi giữa mỗi mắt, chỉ khảm thẳng hai bên, gờ bó vỉa bo tròn.
 *  Khảm = đá ngà sáng phẳng mặt, viền rãnh khắc mảnh (bản đồ pháp tuyến bắt sáng sắc nét). */
export function laneTexture() {
  if (cache.lane) return cache.lane;
  const W = 1024, H = 2048, TAU = Math.PI * 2, cx = W / 2;
  const cloud = tileFbm(401, 3, 5), vein = tileFbm(433, 6, 5), grain = tileFbm(421, 300, 2);
  const Hm = new Float32Array(W * H), C = new Float32Array(W * H * 3);
  const MARBLE = [140, 139, 152], DARKM = [78, 82, 102], BORDER = [106, 106, 122], INLAY = [196, 182, 150], CURB = [96, 98, 112], JOINTC = [70, 70, 82];
  const B = 124, CURBW = 26;
  // sao 8 cánh: bán kính viền theo góc (nội suy tuyến tính giữa mũi và hõm)
  const starR = (a, ro, ri) => { const s = TAU / 16, t = ((a % (2 * s)) + 2 * s) % (2 * s), f = Math.abs(t - s) / s; return ri + (ro - ri) * f; };
  const wrapD = (y, y0) => { let d = y - y0; if (d > H / 2) d -= H; if (d < -H / 2) d += H; return d; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, u = x / H, v = y / H, cl = cloud(u, v) - 0.5, gn = grain(u, v) - 0.5, va = Math.abs(vein(u, v) - 0.5);
    let base, h = 1, inl = 1e9, groove = 1e9;                       // inl: khoảng cách tới nét khảm (px), groove: tới mạch nối
    const lx = Math.min(x, W - 1 - x);
    if (lx < B) { // —— dải viền ——
      base = BORDER;
      if (lx < CURBW) { const t = lx / CURBW; base = CURB; h = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.1)); const jy = ((y + (x < cx ? 0 : 128)) % 256 + 256) % 256; groove = Math.min(Math.min(jy, 256 - jy), Math.abs(lx - CURBW)); }
      else {
        inl = Math.min(Math.abs(lx - 34), Math.abs(lx - (B - 10)));          // chỉ khảm thẳng
        const xc = (34 + B - 10) / 2, A = (B - 10 - 34) / 2 - 12, P = 256, ph = (y / P) * TAU, sl = Math.cos(ph) * A * TAU / P;
        const s1 = Math.abs(lx - (xc + A * Math.sin(ph))) / Math.sqrt(1 + sl * sl), s2 = Math.abs(lx - (xc - A * Math.sin(ph))) / Math.sqrt(1 + sl * sl);
        inl = Math.min(inl, s1, s2);                                          // thừng bện
        const my = ((y - P / 4) % (P / 2) + P / 2) % (P / 2) - P / 4;            // hạt thoi giữa mắt bện
        if (Math.abs(lx - xc) + Math.abs(my) * 0.8 < 9) inl = 0;
      }
    } else { // —— lòng đường ——
      base = MARBLE;
      const dyM = wrapD(y, 1024), dx = x - cx, r = Math.hypot(dx, dyM), a = Math.atan2(dyM, dx);
      const rhomb = Math.abs(dx) / 360 + Math.abs(dyM) / 470;                // khung thoi quanh đĩa
      inl = Math.min(Math.abs(rhomb - 1) * 380, Math.abs(rhomb - 0.965) * 380);
      if (rhomb < 1) {
        if (r < 336) {
          inl = Math.min(inl, Math.abs(r - 334), Math.abs(r - 304));            // vòng ngoài + vòng trong
          const ba = ((a / TAU) * 28 % 1 + 1) % 1, bead = Math.hypot((ba - 0.5) * TAU * 319 / 28, r - 319);
          if (r > 306 && r < 332) { inl = Math.min(inl, bead - 6); base = DARKM; }   // chuỗi hạt trên nền sẫm
          const sr = starR(a + TAU / 32, 290, 168);
          if (r < 304) {
            if (r < sr) base = DARKM;                                             // sao 8 cánh đá sẫm
            inl = Math.min(inl, Math.abs(r - sr) * 0.9);
            const sr2 = starR(a, 250, 150);                                       // sao lồng xoay nửa bước
            if (r < sr) inl = Math.min(inl, Math.abs(r - sr2) * 0.9);
            if (r < 128) { base = MARBLE; inl = Math.min(inl, Math.abs(r - 126)); }
            const petal = 108 * Math.pow(Math.abs(Math.cos(4 * a)), 0.6);        // hoa 8 cánh
            if (r < 126 && r < petal) inl = 0;                                // cánh hoa khảm ngà
            if (r < 126 && r >= petal) inl = Math.min(inl, r - petal);
            if (r < 20) { base = DARKM; inl = Math.abs(r - 19); }
          }
        }
      } else {
        // mạch nối phiến ngoài khung: ngang ở đầu chu kỳ + dọc giữa (so le)
        groove = Math.min(Math.abs(wrapD(y, 0)), Math.abs(wrapD(y, 1024)) > 480 ? Math.abs(x - cx) : 1e9, Math.abs(lx - B));
        const d0 = wrapD(y, 0), dr = Math.abs(dx) / 150 + Math.abs(d0) / 190;   // thoi nhỏ lồng vòng ở giữa hai đĩa
        if (Math.abs(d0) < 200) { inl = Math.min(inl, Math.abs(dr - 1) * 140, Math.abs(Math.hypot(dx, d0) - 52)); if (dr < 1) groove = 1e9; }
      }
    }
    // —— tô màu + độ cao ——
    let c = base.map((q) => q * (1 + cl * 0.1 + gn * 0.035));
    if (base === MARBLE || base === DARKM) { const vl = va < 0.006 ? 1 - va / 0.006 : 0; c = c.map((q) => q + (235 - q) * vl * 0.22); } // gân cẩm thạch mờ
    if (inl < 2.4) { c = INLAY.map((q) => q * (1 + gn * 0.04)); }
    else if (inl < 3.6) { c = c.map((q) => q * 0.55); h -= 0.35; }            // rãnh khắc viền nét khảm
    if (groove < 1.6) { c = JOINTC; h = 0.25; } else if (groove < 4) h -= (4 - groove) / 2.4 * 0.3;
    Hm[k] = h; C.set(c.map((q) => Math.max(0, Math.min(255, q))), 3 * k);
  }
  return (cache.lane = toTex(W, H, Hm, C, true));
}

/** Đoạn lát đá của mỗi đường: từ nhà chính ra quá trụ nhà một đoạn (hai đầu đường). Trả [{ ln, s0, s1, sB, sR, total }] theo quãng đường. */
export const PAVE_EXT = 380, PAVE_FADE = 320;
export function pavedRange(map, ln) {
  const pts = ln.pts, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const sAt = (x, y) => { let best = 0, bd = Infinity; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (d < bd) { bd = d; best = cum[i - 1] + t * Math.sqrt(L2); } } return best; };
  const home = map.structures.find((s) => s.id === ln.id + '_home'), total = cum[cum.length - 1];
  if (!home) return { sB: total, sR: 0, total };
  const red = map.mirror(home.x, home.y);
  return { sB: sAt(home.x, home.y) + PAVE_EXT, sR: sAt(red.x, red.y) - PAVE_EXT, total };
}
/** Polyline các phần lát (cho bản trộn nền: đất mòn viền quanh phần lát, đá vụn mép). */
export function pavedPolylines(map, step = 300) {
  const out = [], ends = [];
  for (const ln of map.lanes) {
    const { sB, sR } = pavedRange(map, ln), pts = ln.pts; let s = 0; const a = [], b = [];
    for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k <= n; k++) { const ss = s + L * k / n, p = [ax + (bx - ax) * k / n, ay + (by - ay) * k / n]; if (ss <= sB - 680) a.push(p); if (ss >= sR + 680) b.push(p); } s += L; } // lùi 680: đầu tròn nét vẽ (~nửa bề ngang) chỉ lấn tới vùng vỡ mép
    for (const q of [a, b]) if (q.length > 1) out.push({ pts: q, width: ln.width });
    // điểm mép vỡ (cuối phần lát) + hướng đi ra phía cỏ: rải đất mòn, mảnh đá vỡ
    const at = (ss) => { let acc = 0; for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + L >= ss) { const t = (ss - acc) / L; return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, dx: (pts[i][0] - pts[i - 1][0]) / L, dy: (pts[i][1] - pts[i - 1][1]) / L }; } acc += L; } return null; };
    const e1 = at(sB), e2 = at(sR); if (e1) ends.push(e1); if (e2) ends.push({ ...e2, dx: -e2.dx, dy: -e2.dy });
  }
  out.ends = ends;
  return out;
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
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.3, 1.3), roughness: repeat ? 0.48 : 0.55, metalness: 0, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (repeat) m.color.setRGB(0.84, 0.84, 0.87); // đá mài phản chiếu trời → hạ tông cho khỏi chói
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf }, uCores: { value: new THREE.Vector4(cores[0]?.x ?? -1e6, cores[0]?.y ?? -1e6, cores[1]?.x ?? -1e6, cores[1]?.y ?? -1e6) }, uTerr: { value: new THREE.Vector2(3300, 1100) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = (repeat ? 'attribute float fade; varying float vFade;\n' : '') + 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;' + (repeat ? ' vFade = fade;' : ''));
    sh.fragmentShader = (repeat ? 'varying float vFade;\n' : '') + 'uniform sampler2D uSplat; uniform vec4 uXf, uCores; uniform vec2 uTerr; varying vec2 vGxz;\nvec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= mix(0.42, 1.0, texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw).b) * 0.88;
      ${repeat ? `{ // hết đoạn lát: mép vỡ lởm chởm theo nhiễu (không mờ nhoè), lộ dần nền cỏ
        float n = 0.0, amp = 0.62;
        for (int o = 0; o < 3; o++) { vec2 q = vGxz / (90.0 / pow(2.3, float(o))), i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
          n += amp * mix(mix(h22(i).x, h22(i + vec2(1.0, 0.0)).x, f.x), mix(h22(i + vec2(0.0, 1.0)).x, h22(i + vec2(1.0)).x, f.x), f.y); amp *= 0.45; }
        float e = vFade - (n * 0.85 + 0.04);
        if (e < 0.0) discard;
        diffuseColor.rgb *= 0.55 + 0.45 * smoothstep(0.0, 0.05, e);              // mép vỡ sẫm
      }` : ''}`).replace('#include <opaque_fragment>', `
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
    const P = [], UV = [], I = [], F = []; let s = 0; const { sB, sR } = pavedRange(map, ln);
    const fadeAt = (ss) => Math.max(Math.min(1, (sB - ss) / PAVE_FADE + 0.5), Math.min(1, (ss - sR) / PAVE_FADE + 0.5));
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      F.push(fadeAt(s), fadeAt(s));
      const a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      P.push(pts[i][0] - nx * W / 2, 0.2, pts[i][1] - nz * W / 2, pts[i][0] + nx * W / 2, 0.2, pts[i][1] + nz * W / 2);
      UV.push(0, s / rep, 1, s / rep);
      if (i && Math.max(F[2 * i - 2], F[2 * i]) > 0) { const q = (i - 1) * 2; I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } // chỉ dựng phần lát
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('fade', new THREE.Float32BufferAttribute(F, 1)); geo.setIndex(I); geo.computeVertexNormals();
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
