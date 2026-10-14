import * as THREE from 'three';
import { abyssGLSL } from './abyss.js';
import { grassSurface, dirtSurface, noiseSurface, pebbleSurface } from './surfaces.js';

// Nền đất trộn lớp: một "bản đồ trộn" nướng sẵn lúc dựng map (DataTexture RGBA phủ cả sân):
//   R = đá lát (đường, sân), G = đất mòn (mép đường, quanh trụ), B = sáng/tối (bóng nướng sẵn của cây, tường, trụ; 1 = sáng), A = lòng sông.
// Shader nền trộn cỏ / đất / đá lát / bùn sỏi theo bản đồ đó, phá đều mép bằng nhiễu, lặp texture ở hai tỉ lệ để không lộ ô lặp.
// Hướng nắng (để đổ bóng): ánh sáng chính ở lights.js đặt tại (600, 1200, 800) → bóng đổ về (-x, -z).
export const SUN = { x: -0.5, z: -0.667 };

/** Vẽ bản đồ trộn. o: { x0, z0, w, h, n, lanes: [[[x,z],…] , width], plazas: [{x,z,r}], dirt: [{x,z,r}], river: { pts:[[x,z],[x,z]], width },
 *  casters: [{ x, z, r, h, k }] (bóng tròn), walls: [{ x1,z1,x2,z2, w, h }] } */
export function bakeGroundMap(o) {
  const N = o.n || 1024, sx = N / o.w, sz = N / o.h, bs = N / 2048; // bán kính làm mờ quy về độ phân giải
  const layer = (draw, blur, fill = '#000') => {
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = fill; g.fillRect(0, 0, N, N); g.setTransform(sx, 0, 0, sz, -o.x0 * sx, -o.z0 * sz);
    draw(g); const d = g.getImageData(0, 0, N, N).data, ch = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) ch[i] = d[4 * i];
    if (blur) blurChannel(ch, N, Math.max(1, Math.round(blur * bs)));
    return ch;
  };
  const stroke = (g, pts, width, color) => { g.strokeStyle = color; g.lineWidth = width; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.stroke(); };
  const disc = (g, x, z, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, z, r, 0, Math.PI * 2); g.fill(); };
  const R = layer((g) => { for (const l of o.lanes) stroke(g, l.pts, l.width, '#fff'); for (const p of o.plazas) disc(g, p.x, p.z, p.r, '#fff'); }, 8);
  const G = layer((g) => {
    if (o.laneDirt !== false) for (const l of o.lanes) stroke(g, l.pts, l.width + 340, '#fff');
    for (const p of o.plazas) disc(g, p.x, p.z, p.r + 220, '#fff');
    for (const d of o.dirt || []) disc(g, d.x, d.z, d.r, `rgba(255,255,255,${d.k ?? 0.8})`);
  }, 10);
  const A = layer((g) => { if (o.river) stroke(g, o.river.pts, o.river.width * 1.25, '#fff'); }, 14);
  const shade = shadeLayer(o, N, sx, sz, Math.max(1, Math.round(5 * bs)));
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[4 * i] = R[i]; data[4 * i + 1] = G[i]; data[4 * i + 2] = shade[i]; data[4 * i + 3] = A[i]; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return { tex, xf: new THREE.Vector4(o.x0, o.z0, 1 / o.w, 1 / o.h), data, N };
}

/** Lớp sáng/tối: nền trắng, vẽ bóng đen mờ đè lên (đọc kênh R: 255 sáng, 0 tối). */
function shadeLayer(o, N, sx, sz, br) {
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.setTransform(sx, 0, 0, sz, -o.x0 * sx, -o.z0 * sz);
  for (const ca of o.casters || []) {
    const ox = SUN.x * ca.h * 0.55, oz = SUN.z * ca.h * 0.55;
    g.fillStyle = `rgba(0,0,0,${ca.k ?? 0.55})`; g.beginPath(); g.ellipse(ca.x + ox, ca.z + oz, ca.r * 1.05, ca.r * 0.85, Math.atan2(oz, ox), 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(0,0,0,${(ca.k ?? 0.55) * 0.45})`; g.beginPath(); g.arc(ca.x, ca.z, ca.r * 0.6, 0, Math.PI * 2); g.fill();
  }
  for (const poly of o.aoPolys || []) { // quầng tối mềm quanh chân phiến đá nền (phiến như lún trong đất)
    g.beginPath(); poly.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.closePath();
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 130; g.stroke(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
  }
  for (const w of o.walls || []) {
    const ox = SUN.x * w.h * 0.6, oz = SUN.z * w.h * 0.6; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = w.w + 40; g.beginPath(); g.moveTo(w.x1 + ox * 0.5, w.z1 + oz * 0.5); g.lineTo(w.x2 + ox * 0.5, w.z2 + oz * 0.5); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = w.w + 90; g.beginPath(); g.moveTo(w.x1 + ox, w.z1 + oz); g.lineTo(w.x2 + ox, w.z2 + oz); g.stroke();
  }
  const d = g.getImageData(0, 0, N, N).data, ch = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) ch[i] = d[4 * i];
  blurChannel(ch, N, br);
  return ch;
}

/** Làm mờ một kênh (hộp tách hai chiều, 2 lượt ≈ Gauss) — nhanh hơn ctx.filter trên canvas lớn. */
function blurChannel(a, N, r) {
  const tmp = new Float32Array(N * N), inv = 1 / (2 * r + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < N; y++) { const o = y * N; let acc = 0; for (let k = -r; k <= r; k++) acc += a[o + Math.min(N - 1, Math.max(0, k))];
      for (let x = 0; x < N; x++) { tmp[o + x] = acc * inv; acc += a[o + Math.min(N - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < N; x++) { let acc = 0; for (let k = -r; k <= r; k++) acc += tmp[Math.min(N - 1, Math.max(0, k)) * N + x];
      for (let y = 0; y < N; y++) { a[y * N + x] = acc * inv; acc += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x]; } }
  }
}

// Bóng thật của nắng (đèn hướng 0) tính trong vòng đèn của three.js: giữ lại giá trị để tối thêm phần sáng môi trường ở cuối shader nền,
// khỏi lấy mẫu bản đồ bóng lần hai (PCF 5 mẫu). Chuỗi chunk đổi theo phiên bản three → không khớp thì quay về cách cũ (gọi getShadow lại).
const DIR_SH = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
const LIGHTS_KEEP_SH = THREE.ShaderChunk.lights_fragment_begin.includes(DIR_SH) ? THREE.ShaderChunk.lights_fragment_begin.replace(DIR_SH,
  'gDirSh[ i ] = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= gDirSh[ i ];') : null;
const GROUND_DETAIL = { low: 0, mid: 1, high: 2 };

/** Vật liệu nền: Lambert (rẻ, hợp mobile) + đoạn shader trộn lớp. Màu đỉnh (vertexColors) vẫn nhân vào: trắng trong sân, xám đá ở vách ngoài.
 *  detail: 'high' = đủ lớp (nhánh động bỏ qua đường / lòng sông / mặt đá hoạ tiết nơi chúng không góp gì — ảnh như cũ);
 *  'mid' = bỏ tầng tỉ lệ phụ (cỏ, đất, sỏi), nhiễu đường dùng lại nhiễu nền, đá hoạ tiết không rêu/hạt; 'low' = splat + cỏ/đất một tỉ lệ
 *  + bóng nướng, hoạ tiết sân nhà phẳng (1 mẫu). Mẫu texture/điểm ảnh (cao/vừa/thấp): rừng 7/5/3, đường +3/0/0, lòng sông +2/1/0,
 *  sân nhà +3…11/3…7/1 (trước: ~28 mọi nơi, cộng 10 mẫu bóng PCF thay vì 5). */
export function groundMaterial(baked, pattern = null, map = null, { detail = 'high' } = {}) {
  const D = GROUND_DETAIL[detail] ?? 2;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf }, uGrass: { value: grassSurface() }, uDirt: { value: dirtSurface() } };
  if (D >= 1) { U.uNoise = { value: noiseSurface() }; U.uPeb = { value: pebbleSurface() }; }
  if (pattern) { U.uPat = { value: pattern.tex }; U.uPatXf = { value: pattern.xf }; }
  const HK = 'vec2(65280.0, 255.0) / 65535.0'; // độ cao 16 bit (G cao, B thấp)
  // —— cỏ / đất / đường / lòng sông ——
  const base = D === 2 ? `
      vec3 nz = texture2D(uNoise, vGxz / 2800.0).rgb, nz2 = texture2D(uNoise, vGxz / 640.0).rgb;
      vec4 g540 = texture2D(uGrass, vGxz / 540.0);                                                       // dùng chung: cỏ + nhiễu mép đá hoạ tiết
      vec3 gr = mix(g540.rgb, texture2D(uGrass, vec2(-vGxz.y, vGxz.x) / 1390.0 + 0.5).rgb, 0.4) * mix(0.9, 1.08, nz2.g); // hai tỉ lệ xoay lệch: không lộ ô lặp // tầng lớn chỉ điều sáng tối → giữ nét ngọn cỏ
      gr *= 0.9 * mix(vec3(0.78, 0.88, 0.74), vec3(1.14, 1.08, 0.80), smoothstep(0.25, 0.75, nz.r));      // loang: cỏ đậm ẩm ↔ cỏ ngả vàng khô
      vec3 dt = mix(texture2D(uDirt, vGxz / 460.0).rgb, texture2D(uDirt, vGxz / 1500.0 + 0.21).rgb, 0.35);
      float dm = smoothstep(0.30, 0.72, sp.g + (nz2.g - 0.5) * 0.6);
      float pm = smoothstep(0.25, 0.85, sp.r + (nz2.b - 0.5) * 0.5 + (nz.g - 0.5) * 0.3); // mép đường mềm, loang (không kẻ vạch)
      vec3 c = mix(gr, dt, dm);
      float lumc = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(lumc), c, 0.78) * vec3(0.68, 0.8, 0.86); // rừng: sẫm, ngả lam (như Liên Quân)
      if (pm > 0.0) { // đường ngoài sân nhà: NỀN CỎ MƯỢT (cỏ mịn sáng, lấy mẫu mip cao cho mượt), vệt đất mòn thưa — chỉ lấy mẫu nơi có đường
        float patchN = texture2D(uNoise, vGxz / 2600.0).g * 0.78 + texture2D(uNoise, vGxz / 700.0).b * 0.22;
        vec3 smoothG = mix(texture2D(uGrass, vGxz / 700.0, 1.2).rgb, gr, 0.7) * vec3(0.98, 1.0, 0.96);
        vec3 laneC = smoothG * vec3(1.0, 1.0, 0.86) * 1.2; // đường: cỏ giẫm mòn sáng, ngả vàng
        laneC = mix(laneC, dt * 0.95, smoothstep(0.5, 0.72, patchN) * 0.4);
        c = mix(c, mix(vec3(dot(laneC, vec3(0.3, 0.59, 0.11))), laneC, 0.85) * vec3(0.84, 0.92, 0.94), pm * 0.85);
      }
      float bk = smoothstep(0.25, 0.75, sp.a) * (1.0 - pm);
      if (bk > 0.0) { // lòng sông: bùn + cuội ướt (nơi khác smoothstep = 0 → bỏ, kết quả y hệt)
        vec3 peb = texture2D(uPeb, vGxz / 420.0).rgb, peb2 = texture2D(uPeb, vGxz / 1100.0 + 0.4).rgb;
        vec3 bed = mix(dt * vec3(0.5, 0.55, 0.5), mix(peb, peb2, 0.3) * vec3(0.82, 0.9, 0.88), smoothstep(0.3, 0.55, nz2.b));
        c = mix(c, bed, bk);
      }` : D === 1 ? `
      vec3 nz = texture2D(uNoise, vGxz / 2800.0).rgb, nz2 = texture2D(uNoise, vGxz / 640.0).rgb;
      vec4 g540 = texture2D(uGrass, vGxz / 540.0);
      vec3 gr = g540.rgb * mix(0.9, 1.08, nz2.g) * 0.9 * mix(vec3(0.78, 0.88, 0.74), vec3(1.14, 1.08, 0.80), smoothstep(0.25, 0.75, nz.r)); // một tỉ lệ
      vec3 dt = texture2D(uDirt, vGxz / 460.0).rgb;
      float dm = smoothstep(0.30, 0.72, sp.g + (nz2.g - 0.5) * 0.6);
      float pm = smoothstep(0.25, 0.85, sp.r + (nz2.b - 0.5) * 0.5 + (nz.g - 0.5) * 0.3);
      vec3 c = mix(gr, dt, dm);
      float lumc = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(lumc), c, 0.78) * vec3(0.68, 0.8, 0.86);
      vec3 laneC = gr * vec3(0.98, 1.0, 0.96) * vec3(1.0, 1.0, 0.86) * 1.2;
      laneC = mix(laneC, dt * 0.95, smoothstep(0.5, 0.72, nz.g * 0.78 + nz2.b * 0.22) * 0.4); // vệt đất mòn: dùng lại nhiễu nền
      c = mix(c, mix(vec3(dot(laneC, vec3(0.3, 0.59, 0.11))), laneC, 0.85) * vec3(0.84, 0.92, 0.94), pm * 0.85);
      float bk = smoothstep(0.25, 0.75, sp.a) * (1.0 - pm);
      if (bk > 0.0) {
        vec3 bed = mix(dt * vec3(0.5, 0.55, 0.5), texture2D(uPeb, vGxz / 420.0).rgb * vec3(0.82, 0.9, 0.88), smoothstep(0.3, 0.55, nz2.b));
        c = mix(c, bed, bk);
      }` : `
      vec3 gr = texture2D(uGrass, vGxz / 540.0).rgb * vec3(0.855, 0.873, 0.686);  // một tỉ lệ, sắc độ trung bình của bản đủ
      vec3 dt = texture2D(uDirt, vGxz / 460.0).rgb;
      float dm = smoothstep(0.30, 0.72, sp.g), pm = smoothstep(0.25, 0.85, sp.r);
      vec3 c = mix(gr, dt, dm);
      float lumc = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(lumc), c, 0.78) * vec3(0.68, 0.8, 0.86);
      vec3 laneC = gr * vec3(1.18, 1.2, 0.99);
      c = mix(c, mix(vec3(dot(laneC, vec3(0.3, 0.59, 0.11))), laneC, 0.85) * vec3(0.84, 0.92, 0.94), pm * 0.85);
      c = mix(c, dt * vec3(0.5, 0.55, 0.5), smoothstep(0.25, 0.75, sp.a) * (1.0 - pm));`;
  // —— PHÙ ĐIÊU THẤP sân nhà (baseFloor.js): mép sắc (ngưỡng trường mờ), đá tô theo độ dốc ↔ nắng, bóng đổ + AO lên cỏ, rãnh khắc ——
  // Mẫu sắc pt + hai mẫu mờ (hL: bóng đổ phía nắng, hB: AO) lấy ở luồng chung (đạo hàm hợp lệ) → bóng/AO và mép giữ nguyên; phần mặt đá
  // (4 mẫu sai phân, nhiễu, rêu) chỉ chạy khi pt.r đủ gần ngưỡng 0,5 (|jit·0,06| ≤ 0,05) — nơi khác m = 0 chính xác.
  const pat = !pattern ? '' : D === 0 ? `{
        vec4 pt = texture2D(uPat, vGxz * uPatXf.zw);
        float w = fwidth(pt.r) * 0.9 + 0.012, wl = fwidth(pt.a) * 0.9 + 0.02, groove = smoothstep(0.42 - wl, 0.42 + wl, pt.a);
        float m = smoothstep(0.5 - w, 0.5 + w, pt.r) * (1.0 - smoothstep(0.15, 0.55, sp.a));
        bool blue = vGxz.y > vGxz.x;
        vec3 sMid = blue ? vec3(0.15, 0.165, 0.2) : vec3(0.18, 0.16, 0.17), sDark = blue ? vec3(0.085, 0.095, 0.125) : vec3(0.105, 0.09, 0.1);
        vec3 st = mix(sMid * (0.94 + 0.1 * smoothstep(0.2, 0.6, dot(pt.gb, ${HK}))), sDark * 0.85, groove * 0.6);
        c = mix(c, mix(st, c * 1.25, 0.08), m * 0.82);
      }` : `{
        vec2 pu = vGxz * uPatXf.zw; vec4 pt = texture2D(uPat, pu);
        float h0 = dot(pt.gb, ${HK});
        vec3 Ln = normalize(vec3(0.37, 0.74, 0.56));
        vec2 Lt = normalize(Ln.xz) * uPatXf.zw;
        float hL = dot(texture2D(uPat, pu + Lt * 26.0, 1.0).gb, ${HK});
        float hB = dot(texture2D(uPat, pu, 3.5).gb, ${HK});
        float shade = smoothstep(0.012, 0.12, hL - h0), ao = clamp((hB - h0) * 5.0, 0.0, 1.0);
        float river = smoothstep(0.15, 0.55, sp.a);
        // nền cỏ trong sân nhà: bóng đổ + AO từ phiến đá
        c *= 1.0 - (shade * 0.18 + ao * 0.2) * (1.0 - river);
        float fwR = fwidth(pt.r), w = fwR * 0.9 + 0.012, wl = fwidth(pt.a) * 0.9 + 0.02;
        if (pt.r + fwR > 0.44 - w) { // mặt đá
          float E = ${(1.5 / pattern.size).toFixed(8)}, TW = ${(pattern.texel * 1.5).toFixed(3)}, HS = 90.0;
          #define PH(o) dot(texture2D(uPat, pu + (o)).gb, ${HK})
          float gx = (PH(vec2(E, 0.0)) - PH(vec2(-E, 0.0))) / (2.0 * TW) * HS, gz = (PH(vec2(0.0, E)) - PH(vec2(0.0, -E))) / (2.0 * TW) * HS;
          vec3 Nn = normalize(vec3(-gx, 1.0, -gz));
          float lit = dot(Nn, Ln) / Ln.y;                                                                 // 1 = mặt phẳng
          float jit = ${D === 2 ? '(g540.g - 0.3) * 0.9 + (texture2D(uNoise, vGxz / 240.0).b - 0.5) * 0.4' : '(g540.g - 0.3) * 0.9'};
          float m = smoothstep(0.5 - w, 0.5 + w, pt.r + jit * 0.06 * (1.0 - smoothstep(0.75, 1.0, pt.r))) * (1.0 - river);
          bool blue = vGxz.y > vGxz.x;
          vec3 sMid = blue ? vec3(0.15, 0.165, 0.2) : vec3(0.18, 0.16, 0.17), sLit = blue ? vec3(0.21, 0.225, 0.26) : vec3(0.24, 0.22, 0.225), sDark = blue ? vec3(0.085, 0.095, 0.125) : vec3(0.105, 0.09, 0.1);
          vec3 st = mix(sDark, sMid, smoothstep(0.55, 0.99, lit)); st = mix(st, sLit, smoothstep(1.0, 1.22, lit));
          st *= (0.94 + 0.1 * smoothstep(0.2, 0.6, h0)) * (0.92 + 0.16 * nz2.r)${D === 2 ? ' * (0.96 + 0.08 * texture2D(uNoise, vGxz / 70.0).b)' : ''};
          st = mix(st, c * 1.25, 0.08);                                                                    // ám màu nền cho hoà
          st *= 1.0 - shade * 0.12 - ao * 0.15;
          float groove = smoothstep(0.42 - wl, 0.42 + wl, pt.a);
          st = mix(st, sDark * 0.85, groove * 0.6);${D === 2 ? `
          float moss = smoothstep(0.62, 0.8, texture2D(uNoise, vGxz / 480.0).g * 0.65 + texture2D(uNoise, vGxz / 120.0).b * 0.35);
          st = mix(st, c, moss * (0.3 + groove * 0.4));                                           // rêu cỏ bám từng mảng / trong rãnh` : ''}
          c = mix(c, st, m * 0.82);                                                                        // nửa trong: chìm vào nền
        }
      }`;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    let fs = `uniform sampler2D ${Object.keys(U).filter((k) => k !== 'uXf' && k !== 'uPatXf').join(', ')}; uniform vec4 uXf${pattern ? ', uPatXf' : ''}; varying vec2 vGxz;\n` + (map ? abyssGLSL(map) : '') + '\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      ${map ? 'if (abyssAt(vGxz)) discard; // trên vực: bỏ nền (lộ thung lũng bên dưới)' : ''}
      vec4 sp = texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw);${base}
      ${pat}
      c *= mix(0.42, 1.0, sp.b);                                                                         // bóng nướng sẵn
      diffuseColor.rgb *= c;`);
    // bóng thật của nhân vật: tối thêm cả phần sáng môi trường cho đậm ngang bóng nướng sẵn
    if (LIGHTS_KEEP_SH) fs = fs.replace('#include <lights_fragment_begin>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        float gDirSh[ NUM_DIR_LIGHT_SHADOWS ];
      #endif
      ${LIGHTS_KEEP_SH}`).replace('#include <opaque_fragment>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        outgoingLight *= mix( 0.42, 1.0, gDirSh[ 0 ] );
      #endif
      #include <opaque_fragment>`);
    else fs = fs.replace('#include <opaque_fragment>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLightShadow dls0 = directionalLightShadows[ 0 ];
        outgoingLight *= mix( 0.42, 1.0, getShadow( directionalShadowMap[ 0 ], dls0.shadowMapSize, dls0.shadowIntensity, dls0.shadowBias, dls0.shadowRadius, vDirectionalShadowCoord[ 0 ] ) );
      #endif
      #include <opaque_fragment>`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'ground-splat' + (pattern ? 'p' : '') + (map ? 'a' : '') + D;
  return mat;
}

/** Chia lưới nền (toạ độ thế giới, có chỉ mục) theo biến thể shader cần cho từng tam giác — các phần dùng chung đỉnh, chỉ khác chỉ mục:
 *  bỏ tam giác nằm hẳn trên vực; còn lại: gần hoạ tiết sân nhà → bản có khối hoạ tiết, có thể chạm vực → bản có discard (+ hoạ tiết nếu
 *  cần, gộp cho bớt một chương trình), phần lớn sân → bản không discard, không hoạ tiết. (GPU iPhone chỉ loại sẵn điểm ảnh bị che trước
 *  khi tô với shader không discard; khối hoạ tiết tốn 3–11 mẫu texture.) Biên an toàn: vực nới / co theo cạnh tam giác dài nhất; hoạ tiết
 *  nới ~200 texel (tầm AO/bóng đổ mờ kể cả khi nhìn toàn bản đồ) → ở mọi điểm ảnh, biến thể được chọn cho đúng kết quả của bản đủ.
 *  abyss(x, z, pad): như isAbyss (pad lớn = vực co lại), pad0 = pad shader dùng. Trả về [{ abyss, pattern, geometry }]. */
export function splitGround(geo, { abyss = null, pad0 = 0, pattern = null } = {}) {
  const P = geo.attributes.position.array, idx = geo.index.array, nV = P.length / 3, nT = idx.length / 3;
  let diam = 0;
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = 3 * idx[t + k], b = 3 * idx[t + (k + 1) % 3]; diam = Math.max(diam, Math.hypot(P[a] - P[b], P[a + 2] - P[b + 2])); }
  const mA = diam + 20, near = new Uint8Array(nV), deep = new Uint8Array(nV);
  if (abyss) for (let i = 0; i < nV; i++) { const x = P[3 * i], z = P[3 * i + 2]; near[i] = abyss(x, z, pad0 - mA) ? 1 : 0; deep[i] = abyss(x, z, pad0 + mA) ? 1 : 0; }
  // ô 32×32 texel của hoạ tiết có dữ liệu (kênh nào khác 0), nới theo tầm ảnh hưởng
  const B = 32; let occ = null, nb = 1, sx = 0, sz = 0;
  if (pattern) {
    const N = pattern.size, d32 = new Uint32Array(pattern.tex.image.data.buffer, 0, N * N); nb = Math.ceil(N / B);
    const raw = new Uint8Array(nb * nb), tmp = new Uint8Array(nb * nb), r = Math.ceil(200 / B); occ = new Uint8Array(nb * nb);
    for (let j = 0; j < N; j++) { const row = j * N, bj = ((j / B) | 0) * nb; for (let i = 0; i < N; i++) if (d32[row + i]) { raw[bj + ((i / B) | 0)] = 1; i = (((i / B) | 0) + 1) * B - 1; } }
    for (let j = 0; j < nb; j++) for (let i = 0; i < nb; i++) { let v = 0; for (let k = Math.max(0, i - r); k <= Math.min(nb - 1, i + r) && !v; k++) v = raw[j * nb + k]; tmp[j * nb + i] = v; }
    for (let j = 0; j < nb; j++) for (let i = 0; i < nb; i++) { let v = 0; for (let k = Math.max(0, j - r); k <= Math.min(nb - 1, j + r) && !v; k++) v = tmp[k * nb + i]; occ[j * nb + i] = v; }
    sx = pattern.xf.z * N / B; sz = pattern.xf.w * N / B; // thế giới → chỉ số ô (xf.xy = 0)
  }
  const cl = (v) => Math.min(nb - 1, Math.max(0, Math.floor(v))); // ngoài texture: shader lấy texel mép (ClampToEdge)
  const lists = [[], [], [], []]; // bit 1 = vực, bit 2 = hoạ tiết
  for (let t = 0; t < nT; t++) {
    const a = idx[3 * t], b = idx[3 * t + 1], c = idx[3 * t + 2];
    if (deep[a] && deep[b] && deep[c]) continue;
    let p = false;
    if (occ) {
      const xa = P[3 * a], xb = P[3 * b], xc = P[3 * c], za = P[3 * a + 2], zb = P[3 * b + 2], zc = P[3 * c + 2];
      const i0 = cl(Math.min(xa, xb, xc) * sx), i1 = cl(Math.max(xa, xb, xc) * sx), j0 = cl(Math.min(za, zb, zc) * sz), j1 = cl(Math.max(za, zb, zc) * sz);
      for (let j = j0; j <= j1 && !p; j++) for (let i = i0; i <= i1 && !p; i++) p = occ[j * nb + i] === 1;
    }
    lists[(near[a] || near[b] || near[c] ? 1 : 0) | (p ? 2 : 0)].push(a, b, c);
  }
  if (lists[1].length && lists[3].length) { for (const i of lists[1]) lists[3].push(i); lists[1] = []; }
  const out = [];
  lists.forEach((l, key) => {
    if (!l.length) return;
    const g = new THREE.BufferGeometry();
    for (const [k, attr] of Object.entries(geo.attributes)) g.setAttribute(k, attr);
    g.setIndex(new THREE.BufferAttribute(nV > 65535 ? new Uint32Array(l) : new Uint16Array(l), 1));
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (const i of l) box.expandByPoint(v.set(P[3 * i], P[3 * i + 1], P[3 * i + 2]));
    g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    out.push({ abyss: !!(key & 1), pattern: !!(key & 2), geometry: g });
  });
  return out;
}
