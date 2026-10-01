import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { WIND } from './foliage.js';

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
    gr.addColorStop(0, `hsl(${95 + r.range(-10, 10)} 38% ${l * 0.7}%)`); gr.addColorStop(1, `hsl(${86 + r.range(-14, 14)} 44% ${l}%)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -wid, len, 0); g.quadraticCurveTo(len * 0.45, wid, 0, 0); g.fill();
    g.strokeStyle = `hsla(80, 40%, ${l * 1.25}%, 0.55)`; g.lineWidth = 1.1; g.beginPath(); g.moveTo(len * 0.08, 0); g.lineTo(len * 0.9, 0); g.stroke();
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
  const r = rngFor(202), rects = map.bushes.flatMap((b) => [b, { ...b, ...map.mirror(b.x, b.y) }]);
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
      col.setHSL(0.25 + hue, 0.42, 0.5).multiplyScalar(shade * r.range(0.92, 1.08)); C.push(col.r, col.g, col.b);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const core = [];
  for (const b of rects) {
    const hw = b.w / 2, hh = b.h / 2, H = Math.min(230, 120 + Math.min(b.w, b.h) * 0.12) * (b.big ? 1.12 : 1);
    // lõi: vòm tối gồ ghề (che khe giữa các thẻ lá)
    core.push({ x: b.x, z: b.y, sx: hw * 0.92, sz: hh * 0.92, h: H * 0.78 });
    const step = 62 / Math.sqrt(density), area = b.w * b.h, n = Math.round(area / (step * step) * 1.6);
    for (let i = 0; i < n; i++) {
      const u = r.range(-1, 1), v = r.range(-1, 1), d = dome(u, v); if (d <= 0.02) continue;
      const lump = 0.82 + fbm(b.x / 200 + u * 2.3, b.y / 200 + v * 2.3, 3) * 0.4, y = H * d * lump;
      const nx = u * (1 - d * 0.6), nz = v * (1 - d * 0.6), ny = 0.35 + d;
      const sun = Math.max(0, ny - 0.7) * 0.6 + d * 0.5;  // đỉnh nắng
      const hueJ = (fbm(b.x / 90 + u * 4, b.y / 90 + v * 4, 2) - 0.5) * 0.08 - sun * 0.035; // ngả vàng ở đỉnh, xanh lam ở dưới
      card(b.x + u * hw, y + 6, b.y + v * hh, r.range(110, 170) * (b.big ? 1.1 : 1), nx, ny, nz, 0.6 + sun * 0.7 + r.range(-0.08, 0.08), hueJ);
    }
    // vành lá sát đất quanh mép (che chân lõi)
    const ring = Math.round((b.w + b.h) * 2 / 70 * Math.sqrt(density));
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + r.range(-0.1, 0.1), c = Math.cos(a), s = Math.sin(a), k = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), -0.25) * r.range(0.9, 1.02);
      card(b.x + c * hw * k, 30, b.y + s * hh * k, r.range(90, 130), c, 0.25, s, 0.48 + r.range(-0.05, 0.08), r.range(-0.02, 0.02));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshLambertMaterial({ map: leafTexture(), vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => { // gió: lá lay nhẹ, đỉnh lay nhiều hơn gốc
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = position.x * 0.011 + position.z * 0.013; float hg = clamp(position.y / 200.0, 0.0, 1.0);
      transformed.x += sin(uWind * 1.9 + ph) * 7.0 * hg; transformed.z += cos(uWind * 1.5 + ph * 1.2) * 5.0 * hg; transformed.y += sin(uWind * 2.3 + ph * 2.0) * 2.0 * hg;`);
  };
  mat.customProgramCacheKey = () => 'bush-cards';
  const g = new THREE.Group();
  // lõi tối: bán cầu gồ ghề co theo từng bụi (InstancedMesh)
  const cg0 = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); cg0.deleteAttribute('uv'); cg0.deleteAttribute('normal');
  const cg = mergeVertices(cg0); { const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + fbm(p.getX(i) * 3 + 2, p.getZ(i) * 3 + p.getY(i) * 2, 2) * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } cg.computeVertexNormals(); }
  const coreMesh = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0x31562a }), core.length), d = new THREE.Object3D();
  core.forEach((c, i) => { d.position.set(c.x, 0, c.z); d.scale.set(c.sx, c.h, c.sz); d.updateMatrix(); coreMesh.setMatrixAt(i, d.matrix); });
  g.add(coreMesh, new THREE.Mesh(geo, mat));
  return g;
}
