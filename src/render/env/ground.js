import * as THREE from 'three';
import { grassSurface, dirtSurface, flagstoneSurface, flagstoneHeight, noiseSurface, pebbleSurface } from './surfaces.js';

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
  const R = layer((g) => { for (const l of o.lanes) stroke(g, l.pts, l.width, '#fff'); for (const p of o.plazas) disc(g, p.x, p.z, p.r, '#fff'); }, 1.5);
  const G = layer((g) => {
    if (o.laneDirt !== false) for (const l of o.lanes) stroke(g, l.pts, l.width + 340, '#fff');
    for (const p of o.plazas) disc(g, p.x, p.z, p.r + 220, '#fff');
    for (const d of o.dirt || []) disc(g, d.x, d.z, d.r, `rgba(255,255,255,${d.k ?? 0.8})`);
  }, 10);
  const A = layer((g) => { if (o.river) stroke(g, o.river.pts, o.river.width + 60, '#fff'); }, 14);
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

/** Vật liệu nền: Lambert (rẻ, hợp mobile) + đoạn shader trộn lớp. Màu đỉnh (vertexColors) vẫn nhân vào: trắng trong sân, xám đá ở vách ngoài. */
export function groundMaterial(baked) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const U = { uSplat: { value: baked.tex }, uXf: { value: baked.xf }, uGrass: { value: grassSurface() }, uDirt: { value: dirtSurface() }, uStone: { value: flagstoneSurface() }, uStoneH: { value: flagstoneHeight() }, uNoise: { value: noiseSurface() }, uPeb: { value: pebbleSurface() } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vGxz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D uSplat, uGrass, uDirt, uStone, uStoneH, uNoise, uPeb; uniform vec4 uXf; varying vec2 vGxz;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 sp = texture2D(uSplat, (vGxz - uXf.xy) * uXf.zw);
      vec3 nz = texture2D(uNoise, vGxz / 2800.0).rgb, nz2 = texture2D(uNoise, vGxz / 640.0).rgb;
      vec3 gr = texture2D(uGrass, vGxz / 540.0).rgb * mix(0.86, 1.12, smoothstep(0.18, 0.42, dot(texture2D(uGrass, vGxz / 1870.0 + 0.37).rgb, vec3(0.333)))); // tầng lớn chỉ điều sáng tối → giữ nét ngọn cỏ
      gr *= 0.9 * mix(vec3(0.78, 0.88, 0.74), vec3(1.14, 1.08, 0.80), smoothstep(0.25, 0.75, nz.r));      // loang: cỏ đậm ẩm ↔ cỏ ngả vàng khô
      vec3 dt = mix(texture2D(uDirt, vGxz / 460.0).rgb, texture2D(uDirt, vGxz / 1500.0 + 0.21).rgb, 0.35);
      vec3 st = texture2D(uStone, vGxz / 380.0).rgb * 0.82 * mix(0.86, 1.06, nz2.r) * mix(vec3(1.0), vec3(1.04, 1.0, 0.92), nz.g); // đá ngả ấm/lạnh theo vùng
      float dm = smoothstep(0.30, 0.72, sp.g + (nz2.g - 0.5) * 0.6);
      float pm = smoothstep(0.40, 0.60, sp.r + (nz2.b - 0.5) * 0.35);
      vec3 c = mix(gr, dt, dm);
      // đường ngoài sân nhà: NỀN CỎ MƯỢT (cỏ mịn sáng, lấy mẫu mip cao cho mượt) XEN CÁC MẢNG ĐÁ LÁT, viền đất mòn quanh mảng đá
      float patchN = texture2D(uNoise, vGxz / 2600.0).g * 0.78 + texture2D(uNoise, vGxz / 700.0).b * 0.22;
      float stPatch = smoothstep(0.515, 0.545, patchN);
      vec3 smoothG = mix(texture2D(uGrass, vGxz / 700.0, 1.2).rgb, gr, 0.7) * vec3(0.98, 1.0, 0.96);
      vec3 laneC = smoothG; // đường ngoài sân nhà: cỏ mượt (phiến đá lớn vẽ ở laneDecor)
      laneC = mix(laneC, dt * 1.02, smoothstep(0.62, 0.7, patchN) * 0.35); // vệt đất mòn thưa       // đất mòn viền quanh mảng đá
      c = mix(c, laneC, pm);
      vec3 peb = texture2D(uPeb, vGxz / 420.0).rgb, peb2 = texture2D(uPeb, vGxz / 1100.0 + 0.4).rgb;
      vec3 bed = mix(dt * vec3(0.5, 0.55, 0.5), mix(peb, peb2, 0.3) * vec3(0.82, 0.9, 0.88), smoothstep(0.3, 0.55, nz2.b)); // lòng sông: cuội ướt + cát bùn
      c = mix(c, bed, smoothstep(0.25, 0.75, sp.a) * (1.0 - pm));                                     // lòng sông: bùn + sỏi ướt
      c *= mix(0.42, 1.0, sp.b);                                                                         // bóng nướng sẵn
      diffuseColor.rgb *= c;`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { // đá lát nổi khối: pháp tuyến từ trường độ cao của phiến đá (chỉ ở vùng lát), sáng mép trên-nắng, tối mép khuất
        vec2 su = vGxz / 460.0; float e = 1.5 / 1024.0;
        float h0 = texture2D(uStoneH, su).r, hx = texture2D(uStoneH, su + vec2(e, 0.0)).r, hz = texture2D(uStoneH, su + vec2(0.0, e)).r;
        vec3 dW = vec3((h0 - hx) * 6.0, 0.0, (h0 - hz) * 6.0) * pm * 0.0;
        normal = normalize(normal + (viewMatrix * vec4(dW, 0.0)).xyz);
      }`).replace('#include <opaque_fragment>', `
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        // bóng thật của nhân vật: tối thêm cả phần sáng môi trường cho đậm ngang bóng nướng sẵn
        DirectionalLightShadow dls0 = directionalLightShadows[ 0 ];
        float unitSh = getShadow( directionalShadowMap[ 0 ], dls0.shadowMapSize, dls0.shadowIntensity, dls0.shadowBias, dls0.shadowRadius, vDirectionalShadowCoord[ 0 ] );
        outgoingLight *= mix( 0.42, 1.0, unitSh );
      #endif
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'ground-splat';
  return mat;
}
