import { bushRects } from '../../data/maps.js';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { WIND } from './foliage.js';
import { crispAlpha } from './trees.js';

// Bụi núp (vùng giấu tầm nhìn) kiểu bán chân thực: lõi bụi tối + hàng trăm "thẻ lá" (ảnh chùm lá có alpha, cắt alphaTest)
// phủ lên một vòm bo theo hình chữ nhật của vùng bụi (siêu elip, phủ gần kín góc). Pháp tuyến thẻ lá hướng ra từ tâm vòm
// nên cả bụi đổ sáng tròn trịa như một khối lá thật; màu đỉnh: trong lòng tối, đỉnh nắng ngả vàng. Tất cả gộp một lưới, một draw call.

/** Ảnh chùm lá: nhiều lá hình thoi bo, gân giữa, chuyển sắc gốc tối → đầu sáng; nền trong suốt. */
let leafTex = null;
function leafTexture() {
  if (leafTex) return leafTex;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), r = rngFor(77);
  const leaf = (x, y, len, wid, ang, l) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, `hsl(${168 + r.range(-8, 8)} 55% ${l * 0.6}%)`); gr.addColorStop(1, `hsl(${155 + r.range(-12, 12)} 62% ${l * 1.05}%)`); // xanh ngọc (khác hẳn cỏ vàng-xanh dưới đất)
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -wid, len, 0); g.quadraticCurveTo(len * 0.45, wid, 0, 0); g.fill();
    g.strokeStyle = `hsla(150, 70%, ${l * 1.4}%, 0.6)`; g.lineWidth = 1.1; g.beginPath(); g.moveTo(len * 0.08, 0); g.lineTo(len * 0.9, 0); g.stroke();
    g.restore();
  };
  // chùm lá toả từ gốc dưới giữa ra mọi phía, lá trong tối, lá ngoài sáng; mật độ dày ở giữa để mipmap còn đặc
  for (let i = 0; i < 230; i++) { // lá rải đều trong vòng tròn, hướng ngẫu nhiên, sáng tối ngẫu nhiên (không thành hoa văn toả tròn)
    const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 96, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d;
    leaf(x, y, r.range(26, 42), r.range(9, 15), r.range(0, Math.PI * 2), 24 + r.range(0, 24) + (1 - y / N) * 8);
  }
  leafTex = new THREE.CanvasTexture(c); leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 4;
  return leafTex;
}

/** Điểm trên vòm bụi: u, v ∈ [-1, 1] (theo hình chữ nhật), trả về chiều cao vòm (0 ở mép). Siêu elip bậc 4 phủ gần kín góc chữ nhật. */
const dome = (u, v) => { const e = Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4); return e >= 1 ? 0 : Math.pow(1 - e, 0.35); };

/** Dựng toàn bộ bụi của bản đồ. density: 0.4..1 (mức đồ hoạ). */
export function buildBushes(map, density = 1) {
  const r = rngFor(202), rects = bushRects(map);
  const P = [], N = [], U = [], C = [], I = [];
  const col = new THREE.Color(), v3 = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const nv = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), rv = new THREE.Vector3();
  /** Thẻ lá nằm ÁP theo bề mặt vòm (vuông góc pháp tuyến, xoay ngẫu nhiên, nghiêng lệch chút) như vảy lợp: nhìn từ trên vẫn phủ kín. */
  const card = (cx, cy, cz, size, nx, ny, nz, shade, hue) => {
    nv.set(nx + r.range(-0.35, 0.35), ny + r.range(-0.2, 0.3), nz + r.range(-0.35, 0.35)).normalize();
    rv.set(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)); t1.crossVectors(nv, rv).normalize(); t2.crossVectors(nv, t1);
    const base = P.length / 3, ln = Math.hypot(nx, ny, nz) || 1;
    for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      P.push(cx + (t1.x * x + t2.x * y) * size, cy + (t1.y * x + t2.y * y) * size, cz + (t1.z * x + t2.z * y) * size);
      N.push(nx / ln, ny / ln, nz / ln); // pháp tuyến theo vòm (tô bóng tròn cả bụi)
      U.push(x + 0.5, y + 0.5);
      col.setHSL(0.45 + hue, 0.55, 0.5).multiplyScalar(shade * r.range(0.92, 1.08)); C.push(col.r, col.g, col.b);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const core = [];
  for (const b of rects) {
    // khung cục bộ của bụi: trục dài (cos, sin) — bụi chữ nhật theo trục x; bụi "con nhộng" (cap) xoay theo đoạn thẳng của nó
    let cx = b.x, cz = b.y, ca = 1, sa = 0, hw = b.w / 2, hh = b.h / 2, half = 0, shape = dome;
    if (b.cap) {
      const dx = b.cap[2] - b.cap[0], dz = b.cap[3] - b.cap[1], L = Math.hypot(dx, dz);
      ca = dx / L; sa = dz / L; half = L / 2; hw = half + b.r; hh = b.r;
      shape = (u, v) => { const ax = Math.max(0, Math.abs(u * hw) - half), d = Math.hypot(ax, v * hh) / b.r; return d >= 1 ? 0 : Math.pow(1 - Math.pow(d, 4), 0.35); };
    }
    const toW = (lx, lz) => [cx + lx * ca - lz * sa, cz + lx * sa + lz * ca]; // cục bộ → thế giới
    const rotN = (nx, nz) => [nx * ca - nz * sa, nx * sa + nz * ca];
    const H = Math.min(240, 120 + Math.min(hw, hh) * 0.24) * (b.big ? 1.12 : 1);
    // lõi: vòm tối gồ ghề (che khe giữa các thẻ lá) — bụi con nhộng dùng vài lõi dọc trục
    if (b.cap) for (let k = 0; k <= 4; k++) { const [x, z] = toW(-half + (2 * half * k) / 4, 0); core.push({ x, z, sx: hh * 0.92, sz: hh * 0.92, h: H * 0.78 }); }
    else core.push({ x: cx, z: cz, sx: hw * 0.92, sz: hh * 0.92, h: H * 0.78, rot: 0 });
    const step = 62 / Math.sqrt(density), area = 4 * hw * hh, n = Math.round(area / (step * step) * 1.6);
    for (let i = 0; i < n; i++) {
      const u = r.range(-1, 1), v = r.range(-1, 1), d = shape(u, v); if (d <= 0.02) continue;
      const [x, z] = toW(u * hw, v * hh);
      const lump = 0.82 + fbm(x / 440, z / 440, 3) * 0.4, y = H * d * lump;
      const lnx = b.cap ? Math.sign(u) * Math.max(0, Math.abs(u * hw) - half) / b.r : u, lnz = v;
      const [nx, nz] = rotN(lnx * (1 - d * 0.6), lnz * (1 - d * 0.6)), ny = 0.35 + d;
      const sun = Math.max(0, ny - 0.7) * 0.6 + d * 0.5;  // đỉnh nắng
      const hueJ = (fbm(x / 200, z / 200, 2) - 0.5) * 0.08 - sun * 0.03; // đỉnh nắng ngả xanh lá sáng, lòng xanh lam đậm
      card(x, y + 6, z, r.range(110, 170) * (b.big ? 1.1 : 1), nx, ny, nz, 0.6 + sun * 0.7 + r.range(-0.08, 0.08), hueJ);
    }
    // vành lá sát đất quanh mép (che chân lõi)
    const ring = Math.round((hw + hh) * 4 / 70 * Math.sqrt(density));
    for (let i = 0; i < ring; i++) {
      let lx, lz, nlx, nlz;
      if (b.cap) { // chu vi con nhộng: hai cạnh thẳng + hai đầu tròn
        const per = 4 * half + 2 * Math.PI * b.r, t = (i / ring) * per;
        if (t < 2 * half) { lx = -half + t; lz = b.r; nlx = 0; nlz = 1; } else if (t < 4 * half) { lx = half - (t - 2 * half); lz = -b.r; nlx = 0; nlz = -1; }
        else { const a2 = ((t - 4 * half) / (2 * Math.PI * b.r)) * Math.PI * 2, c = Math.cos(a2), s2 = Math.sin(a2); lx = (c >= 0 ? half : -half) + c * b.r; lz = s2 * b.r; nlx = c; nlz = s2; }
        lx *= r.range(0.97, 1.01); lz *= r.range(0.9, 1.02);
      } else {
        const a2 = (i / ring) * Math.PI * 2 + r.range(-0.1, 0.1), c = Math.cos(a2), s2 = Math.sin(a2), k = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s2), 4), -0.25) * r.range(0.9, 1.02);
        lx = c * hw * k; lz = s2 * hh * k; nlx = c; nlz = s2;
      }
      const [x, z] = toW(lx, lz), [nx, nz] = rotN(nlx, nlz);
      card(x, 30, z, r.range(90, 130), nx, 0.25, nz, 0.48 + r.range(-0.05, 0.08), r.range(-0.02, 0.02));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshLambertMaterial({ map: leafTexture(), vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => { // gió: lá lay nhẹ, đỉnh lay nhiều hơn gốc
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = position.x * 0.011 + position.z * 0.013; float hg = clamp(position.y / 200.0, 0.0, 1.0);
      transformed.x += sin(uWind * 1.9 + ph) * 7.0 * hg; transformed.z += cos(uWind * 1.5 + ph * 1.2) * 5.0 * hg; transformed.y += sin(uWind * 2.3 + ph * 2.0) * 2.0 * hg;`);
  };
  mat.customProgramCacheKey = () => 'bush-cards';
  crispAlpha(mat); // mép lá sắc, không răng cưa
  const g = new THREE.Group();
  // lõi tối: bán cầu gồ ghề co theo từng bụi (InstancedMesh)
  const cg0 = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); cg0.deleteAttribute('uv'); cg0.deleteAttribute('normal');
  const cg = mergeVertices(cg0); { const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + fbm(p.getX(i) * 3 + 2, p.getZ(i) * 3 + p.getY(i) * 2, 2) * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } cg.computeVertexNormals(); }
  const coreMesh = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0x13423a }), core.length), d = new THREE.Object3D();
  core.forEach((c, i) => { d.position.set(c.x, 0, c.z); d.scale.set(c.sx, c.h, c.sz); d.updateMatrix(); coreMesh.setMatrixAt(i, d.matrix); });
  g.add(coreMesh, new THREE.Mesh(geo, mat));
  // bụi giữa sông mọc trên cồn bùn: đĩa đất gồ ghề nhô khỏi mặt nước, viền đá cuội
  const islets = rects.filter((b) => b.river);
  if (islets.length) {
    const ig0 = new THREE.CylinderGeometry(1, 1.12, 1, 28, 1); ig0.deleteAttribute('uv'); ig0.deleteAttribute('normal'); const ig = mergeVertices(ig0);
    { const p = ig.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + (fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2, 3) - 0.5) * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } ig.computeVertexNormals(); }
    const im = new THREE.InstancedMesh(ig, new THREE.MeshLambertMaterial({ color: 0x6a5a42 }), islets.length);
    islets.forEach((b, i) => { if (b.cap) { const dx = b.cap[2] - b.cap[0], dz = b.cap[3] - b.cap[1], L = Math.hypot(dx, dz); d.position.set(b.x, 4, b.y); d.rotation.set(0, -Math.atan2(dz, dx), 0); d.scale.set(L / 2 + b.r * 1.05, 16, b.r * 1.15); } else { d.position.set(b.x, 4, b.y); d.rotation.set(0, i, 0); d.scale.set(b.w * 0.62, 16, b.h * 0.62); } d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    g.add(im);
  }
  return g;
}
