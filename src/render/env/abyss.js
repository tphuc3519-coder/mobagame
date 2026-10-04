import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, rngFor } from './noise.js';
import { ROCK_GLSL } from './rockGlsl.js';
import { FOG_COLOR } from './sky.js';
import { noiseSurface } from './surfaces.js';

// Vực ngoài biên (kiểu Liên Quân): sân đấu là một cao nguyên — sau tường biên là dải đất hẹp có cây, rồi VÁCH ĐÁ dựng đứng đổ xuống
// một THUNG LŨNG xa tít mờ sương (đồng cỏ, rừng, sông uốn lượn), có mây mỏng trôi giữa vách và đáy; sông chính đổ xuống vực thành THÁC.
// Hình học vùng vực = map.outOfBounds(x, z, PAD) (cùng công thức với sim) — có bản GLSL để shader nền/sông bỏ phần trên vực.

export const ABYSS_PAD = 420;      // mép vực cách mặt ngoài tường biên
export const ABYSS_DEPTH = 2600;   // đáy thung lũng

/** GLSL: bool abyssAt(vec2 w) — điểm thế giới (x, z) nằm trên vực. */
export function abyssGLSL(map, pad = ABYSS_PAD) {
  const s = map.oobShape; if (!s) return 'bool abyssAt(vec2 w){ return false; }';
  const f = (v) => v.toFixed(4);
  return `
  bool abyssT(vec2 w){ float u = w.x / ${f(s.K)}, v = w.y / ${f(s.K)}, p = ${f(pad / s.K)}, e = ${f(s.BX - s.BW / s.K / 2)} - p;
    if (length(vec2(u - ${f(s.PX ?? -1e4)}, v - ${f(s.PY ?? -1e4)})) < ${f((s.PR ?? 0) + s.BW / s.K / 2)} + p) return false;
    return (u < e && v < ${f(s.BEND)} - p) || (u < ${f(s.BC)} && v < ${f(s.BC)} && length(vec2(u - ${f(s.BC)}, v - ${f(s.BC)})) > ${f(s.BR + s.BW / s.K / 2)} + p) || (v < e && u < ${f(s.BEND)} - p); }
  bool abyssAt(vec2 w){ return abyssT(w) || abyssT(vec2(${f(s.A)} - w.y, ${f(s.A)} - w.x)); }`;
}
export const isAbyss = (map, x, z, pad = ABYSS_PAD) => !!map.outOfBounds?.(x, z, pad);

/** Đường mép vực (hai chuỗi: góc trên-trái, góc dưới-phải), toạ độ thế giới [x, z], lấy mẫu ~step. */
export function abyssEdges(map, pad = ABYSS_PAD, step = 60) {
  const s = map.oobShape; if (!s) return [];
  const K = s.K, e = s.BX * K - s.BW / 2 - pad, R = s.BR * K + s.BW / 2 + pad, C = s.BC * K, Bw = s.BEND * K - pad, FAR = -3600;
  const raw = [[FAR, Bw], [e, Bw], [e, C]];
  for (let i = 1; i <= 24; i++) { const a = Math.PI + (i / 24) * (Math.PI / 2); raw.push([C + Math.cos(a) * R, C + Math.sin(a) * R]); }
  raw.push([Bw, e], [Bw, FAR]);
  const resample = (pts) => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step)); for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } return out; };
  let tl = resample(raw);
  if (s.PR) { // mũi đá: điểm mép vực lọt trong vành mũi đá được đẩy ra theo bán kính → mép vực phình ra quanh mũi đá
    const px = s.PX * K, pz = s.PY * K, pr = s.PR * K + s.BW / 2 + pad;
    tl = resample(tl.map(([x, z]) => { const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz); return l < pr && l > 1 ? [px + dx / l * pr, pz + dz / l * pr] : [x, z]; }), step);
  }
  const br = tl.map(([x, z]) => [s.A - z, s.A - x]);
  return [tl, br];
}

/** Vật liệu vách: đá xám lam, vân lớp ngang, tối dần + ám tím xanh theo chiều sâu, rêu trên mặt ngửa. */
function cliffMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, fog: false });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWp, vWn;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'varying vec3 vWp, vWn;\n' + ROCK_GLSL + sh.fragmentShader.replace('#include <map_fragment>', `
      float d = clamp(-vWp.y / ${ABYSS_DEPTH.toFixed(1)}, 0.0, 1.0), up = normalize(vWn).y;
      float n1 = rfbm(vWp / 380.0), n2 = rvn(vWp / 9.0), band = 0.5 + 0.5 * sin(vWp.y / 46.0 + n1 * 5.0);
      vec3 c = mix(vec3(0.2, 0.2, 0.26), vec3(0.36, 0.36, 0.43), n1) * (0.78 + 0.26 * band) * (0.9 + 0.16 * n2);
      c = mix(c, vec3(0.2, 0.32, 0.12), smoothstep(0.55, 0.85, up) * smoothstep(0.45, 0.6, rfbm(vWp / 120.0 + 4.0)) * 0.8);  // rêu cỏ trên gờ ngửa
      c *= mix(1.0, 0.62, smoothstep(0.0, 0.5, d));                                                       // sâu thì tối
      c = mix(c, vec3(0.3, 0.3, 0.55), smoothstep(0.15, 1.0, d) * 0.6);                                 // ám tím lam (khí quyển)
      c *= mix(0.85, 0.55, smoothstep(0.0, 0.3, d)) * (0.75 + 0.35 * smoothstep(0.3, 0.9, up));            // vách đứng chìm bóng, gờ ngửa sáng
      diffuseColor.rgb = c;`);
  };
  m.customProgramCacheKey = () => 'abyss-cliff';
  return m;
}

/** Ảnh thung lũng (vẽ một lần bằng canvas, phủ VALLEY_SPAN): đồng cỏ loang, rừng sẫm, sông uốn lượn, bóng mây. */
const VALLEY_SPAN = 26000;
function valleyTexture() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  const f = (u, v, o, s) => fbm(u * s + o, v * s + o * 1.7, 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N, a = f(u, v, 3, 4), b = f(u, v, 11, 12), cc = f(u, v, 7, 60);
    const ta = Math.min(1, Math.max(0, (a - 0.35) / 0.35)); let col = [0.3 + 0.28 * ta, 0.56 + 0.12 * ta, 0.32 - 0.04 * ta];
    const forest = Math.min(1, Math.max(0, (f(u, v, 21, 10) * 0.8 + cc * 0.2 - 0.5) / 0.06));
    col = col.map((q, k) => q + ([0.12, 0.3, 0.2][k] * (0.8 + 0.4 * cc) - q) * forest);
    col = col.map((q, k) => q + ([0.3, 0.52, 0.42][k] - q) * Math.max(0, (b - 0.55) / 0.25) * 0.5);
    const wu = u + (f(u, v, 31, 6) - 0.5) * 0.12, wv = v + (f(u, v, 41, 6) - 0.5) * 0.12;
    const rv = Math.abs(fbm(wu * 3 + 2, wv * 3 + 5, 4) - 0.5), rv2 = Math.abs(fbm(wu * 8 + 9, wv * 8 + 3, 3) - 0.5);
    const river = Math.max(1 - Math.min(1, Math.max(0, (rv - 0.008) / 0.008)), (1 - Math.min(1, Math.max(0, (rv2 - 0.005) / 0.006))) * 0.75);
    col = col.map((q, k) => q + ([0.5, 0.85, 0.86][k] - q) * river);
    const sh = 0.8 + 0.4 * f(u, v, 51, 3); col = col.map((q) => q * sh);
    const o = 4 * (j * N + i); d[o] = Math.min(255, col[0] * 255); d[o + 1] = Math.min(255, col[1] * 255); d[o + 2] = Math.min(255, col[2] * 255); d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
/** Thung lũng xa: ảnh vẽ sẵn + mờ sương theo khoảng cách (khớp sương cảnh). Rẻ: 1 lần lấy mẫu ảnh / điểm ảnh. */
function valleyMat() {
  return new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uFog: { value: new THREE.Color(FOG_COLOR) }, uTex: { value: valleyTexture() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uFog; uniform sampler2D uTex; varying vec3 vW;
      void main(){
        vec3 col = texture2D(uTex, vW.xz / ${VALLEY_SPAN.toFixed(1)}).rgb;
        col = mix(col, vec3(0.7, 0.84, 0.9), 0.2);                                                         // xa tít dưới đáy: luôn mờ
        col = mix(col, uFog, smoothstep(5500.0, 11000.0, length(vW - cameraPosition)) * 0.8);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Lớp mây mỏng trôi giữa vách và đáy (lấy mẫu ảnh nhiễu, rẻ). */
function mistMat(seed) {
  const U = { uT: { value: 0 }, uS: { value: seed }, uN: { value: noiseSurface() } };
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, uS; uniform sampler2D uN; varying vec3 vW;
      void main(){ vec2 p = vW.xz + vec2(uT * 40.0, uT * 15.0) + uS * 3000.0;
        float n = texture2D(uN, p / 9000.0).r * 0.7 + texture2D(uN, p / 2600.0 + 0.3).g * 0.3, a = smoothstep(0.58, 0.82, n) * 0.24;
        gl_FragColor = vec4(vec3(0.92, 0.96, 1.0), a); }`,
  });
  return { m, U };
}

/** Thác: màn nước đổ theo vách, sọc chảy xuống, bọt ở mép trên, tan vào sương phía dưới. */
function fallMat() {
  const U = { uT: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, uniforms: U,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float x = vUv.x * 40.0, y = vUv.y * 9.0 + uT * 1.6;
        float s = vn(vec2(x, y)) * 0.6 + vn(vec2(x * 2.3, y * 1.7 + 3.0)) * 0.4;
        vec3 c = mix(vec3(0.42, 0.7, 0.78), vec3(0.95, 0.99, 1.0), smoothstep(0.45, 0.85, s));
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float a = edge * (0.75 + 0.25 * s) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        c = mix(c, vec3(1.0), smoothstep(0.08, 0.0, vUv.y) * 0.6);
        gl_FragColor = vec4(c, a);
      }`,
  });
  return { m, U };
}

/** Dựng vực: vách đá theo mép vực, đá + bụi che mép, thung lũng, mây, thác. heightAt(x, z): cao độ nền. */
export function buildAbyss(map, heightAt, { riverWidth = 0, dens = 1, grass = null, rockMat = null, boulder = null } = {}) {
  const g = new THREE.Group(), r = rngFor(808), D = ABYSS_DEPTH, cliffs = [], lipRocks = [], lipBush = [], falls = [];
  const riverD = (x, z) => Math.abs(x - z) / Math.SQRT2;
  for (const chain of abyssEdges(map)) {
    const n = chain.length, J = 22, P = [], I = [];
    // pháp tuyến hướng ra vực
    const N = chain.map((p, i) => { const a = chain[Math.max(0, i - 1)], b = chain[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; let nx = -tz / l, nz = tx / l;
      if (!isAbyss(map, p[0] + nx * 80, p[1] + nz * 80)) { nx = -nx; nz = -nz; } return [nx, nz]; });
    let s = 0;
    for (let i = 0; i < n; i++) {
      if (i) s += Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]);
      const [x, z] = chain[i], [nx, nz] = N[i], top = heightAt(x, z) - 1;
      for (let j = 0; j <= J; j++) {
        const t = j / J, y = top - D * Math.pow(t, 1.15);
        const ledge = Math.pow(Math.max(0, Math.sin(y / 300 + fbm(s / 900, 3) * 6)), 3) * 140;                              // gờ đá phân tầng
        const off = j === 0 ? 0 : ((fbm(s / 420 + 7, y / 380) - 0.5) * 260 + ledge) * Math.min(1, t * 6) - t * 220; // lồi lõm, vách hơi ngả vào trong
        P.push(x + nx * off, y, z + nz * off);
      }
    }
    for (let i = 0; i + 1 < n; i++) for (let j = 0; j < J; j++) { const a = i * (J + 1) + j, b = a + J + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
    // hướng mặt: pháp tuyến ở giữa vách phải chĩa ra vực
    { const k = Math.floor(n / 2) * (J + 1) + 6, nm = geo.attributes.normal, [nx, nz] = N[Math.floor(n / 2)]; if (nm.getX(k) * nx + nm.getZ(k) * nz < 0) { const ix = geo.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } geo.computeVertexNormals(); } }
    cliffs.push(geo);
    // đá + bụi che mép vực (phía đất liền), trừ chỗ sông đổ
    for (let i = 0; i < n; i += 2) {
      const [x, z] = chain[i], [nx, nz] = N[i]; if (riverWidth && riverD(x, z) < riverWidth / 2 + 80) continue;
      if (x < -3000 || z < -3000 || x > map.w + 3000 || z > map.h + 3000) continue;
      if (r.next() < 0.5) { const sc = r.range(40, 110); lipRocks.push({ x: x - nx * r.range(0, 50), y: heightAt(x, z) - sc * 0.3, z: z - nz * r.range(0, 50), ry: r.range(0, 7), sx: sc * r.range(1, 1.7), sy: sc * r.range(0.5, 0.9), sz: sc }); }
      if (r.next() < 0.3 * dens) lipBush.push({ x: x - nx * r.range(20, 120), y: heightAt(x, z) - 4, z: z - nz * r.range(20, 120), ry: r.range(0, 7), sx: r.range(110, 170), sy: r.range(80, 150) });
    }
    // thác: đoạn mép vực nằm trong lòng sông
    if (riverWidth) {
      const idx = chain.map((p, i) => i).filter((i) => riverD(...chain[i]) < riverWidth / 2 + 20);
      if (idx.length > 2) {
        const pts = idx.map((i) => chain[i]), nn = idx.map((i) => N[i]), M = 16, Pf = [], UV = [], If = [];
        pts.forEach(([x, z], k) => { const [nx, nz] = nn[k]; for (let j = 0; j <= M; j++) { const t = j / M, off = 30 + 260 * Math.sqrt(t); Pf.push(x + nx * off, 4 - D * 0.9 * t, z + nz * off); UV.push(k / (pts.length - 1), t); } });
        for (let k = 0; k + 1 < pts.length; k++) for (let j = 0; j < M; j++) { const a = k * (M + 1) + j, b = a + M + 1; If.push(a, b, a + 1, a + 1, b, b + 1); }
        const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(Pf, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); fg.setIndex(If);
        falls.push(fg);
      }
    }
  }
  const cm = new THREE.Mesh(mergeGeometries(cliffs), cliffMat()); cm.receiveShadow = true; g.add(cm);
  if (lipRocks.length && rockMat && boulder) { const im = new THREE.InstancedMesh(boulder, rockMat, lipRocks.length), o = new THREE.Object3D(); lipRocks.forEach((q, i) => { o.position.set(q.x, q.y, q.z); o.rotation.set(0, q.ry, 0); o.scale.set(q.sx, q.sy, q.sz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); g.add(im); }
  if (lipBush.length && grass) g.add(grass(lipBush));
  // thung lũng + mây
  const v = new THREE.Mesh(new THREE.PlaneGeometry(140000, 140000), valleyMat()); v.rotation.x = -Math.PI / 2; v.position.set(map.w / 2, -D, map.h / 2); g.add(v);
  const mists = [];
  for (const [y, sd] of [[-D * 0.35, 1], [-D * 0.7, 2]]) { const mm = mistMat(sd), pl = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), mm.m); pl.rotation.x = -Math.PI / 2; pl.position.set(map.w / 2, y, map.h / 2); g.add(pl); mists.push(mm.U); }
  const fm = fallMat(); if (falls.length) { const fmesh = new THREE.Mesh(mergeGeometries(falls), fm.m); fmesh.renderOrder = 2; g.add(fmesh); }
  return { group: g, update(t) { fm.U.uT.value = t; for (const U of mists) U.uT.value = t; } };
}
