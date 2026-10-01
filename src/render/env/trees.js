import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngFor, fbm } from './noise.js';
import { sway } from './foliage.js';
import { SUN } from './ground.js';

// Cây bán chân thực bằng "thẻ lá" (cùng kỹ thuật với bụi núp): thân + cành cong có vỏ cây, tán là nhiều chùm lá; mỗi chùm phủ
// hàng trăm thẻ ảnh chùm lá (alphaTest) áp theo mặt cầu, pháp tuyến hướng ra từ tâm chùm → tán đổ sáng tròn như khối lá thật.
// Màu đỉnh: phía nắng sáng ngả vàng, lòng tán và mặt khuất tối (giả AO). Mỗi loại cây = 2 lưới (thân, lá) dùng chung ma trận bản sao.

const SUN3 = new THREE.Vector3(-SUN.x, 1.15, -SUN.z).normalize(); // hướng TỚI mặt trời (bóng đổ theo SUN)

/** Ảnh chùm lá. kind: 'leaf' (lá rộng xanh lục), 'needle' (lá kim xanh lam sẫm), 'blossom' (hoa hồng lẫn lá). */
const TEX = {};
function foliageTexture(kind) {
  if (TEX[kind]) return TEX[kind];
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), r = rngFor(kind.length * 31 + 5);
  if (kind === 'needle') {
    for (let i = 0; i < 26; i++) { // cành kim: trục + kim toả hai bên
      const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 70, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d, ang = r.range(0, Math.PI * 2), len = r.range(60, 100);
      g.save(); g.translate(x, y); g.rotate(ang);
      g.strokeStyle = 'hsl(30 30% 22%)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.stroke();
      for (let k = 6; k < len; k += 3.2) for (const sd of [-1, 1]) { const l = r.range(10, 18) * (1 - k / len * 0.5); g.strokeStyle = `hsl(${150 + r.range(-12, 10)} ${38 + r.range(0, 15)}% ${16 + r.range(0, 16) + k / len * 8}%)`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + l * 0.45, sd * l); g.stroke(); }
      g.restore();
    }
  } else {
    const leaf = (x, y, len, wid, ang, h, s, l) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, `hsl(${h} ${s}% ${l * 0.7}%)`); gr.addColorStop(1, `hsl(${h - 6} ${s + 6}% ${l * 1.12}%)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.4, -wid, len, 0); g.quadraticCurveTo(len * 0.4, wid, 0, 0); g.fill();
      g.strokeStyle = `hsla(${h - 10}, 50%, ${l * 1.5}%, 0.5)`; g.lineWidth = 1; g.beginPath(); g.moveTo(len * 0.06, 0); g.lineTo(len * 0.92, 0); g.stroke();
      g.restore();
    };
    // cuống/cành nhỏ phía dưới để chùm lá có "xương"
    g.strokeStyle = 'hsl(28 35% 22%)'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(N / 2, N * 0.95); g.quadraticCurveTo(N / 2 + r.range(-40, 40), N * 0.6, N / 2 + r.range(-90, 90), r.range(40, 110)); g.stroke(); }
    for (let i = 0; i < 260; i++) {
      const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 104, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d * 0.94;
      leaf(x, y, r.range(24, 38), r.range(8, 13), r.range(0, Math.PI * 2), 96 + r.range(-14, 12), 46 + r.range(0, 14), 22 + r.range(0, 22) + (1 - y / N) * 10);
    }
    if (kind === 'blossom') for (let i = 0; i < 170; i++) { // chùm hoa 5 cánh hồng nhạt
      const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 100, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d, s = r.range(4, 7.5), l = r.range(72, 90);
      g.fillStyle = `hsl(${340 + r.range(-8, 12)} ${62 + r.range(0, 20)}% ${l}%)`;
      for (let k = 0; k < 5; k++) { const b = k * 1.2566 + a; g.beginPath(); g.arc(x + Math.cos(b) * s * 0.8, y + Math.sin(b) * s * 0.8, s * 0.62, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f8e070'; g.beginPath(); g.arc(x, y, s * 0.3, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TEX[kind] = t);
}

/** Ảnh vỏ cây: sọc dọc gồ ghề, lặp theo chiều ngang. */
let barkTex = null;
function barkTexture() {
  if (barkTex) return barkTex;
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), d = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ridge = Math.pow(Math.abs(Math.sin((x / N) * Math.PI * 7 + fbm(x / 9, y / 40, 3) * 5)), 0.5), n = fbm(x / 6, y / 14, 3);
    const v = 0.35 + ridge * 0.45 + n * 0.25, i = 4 * (y * N + x);
    d.data[i] = 92 * v + 18; d.data[i + 1] = 72 * v + 14; d.data[i + 2] = 56 * v + 12; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  barkTex = new THREE.CanvasTexture(c); barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping; barkTex.colorSpace = THREE.SRGBColorSpace;
  return barkTex;
}

/** Ống cong theo đường cong 3D, bán kính thon dần (cho thân/cành). */
function limb(curve, r0, r1, seg = 8, radial = 7) {
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false), p = g.attributes.position, uv = g.attributes.uv;
  const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i < p.count; i++) {
    const t = uv.getX(i), k = Math.min(seg, Math.round(t * seg)), c = pts[k], rr = r0 + (r1 - r0) * t;
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * rr, c.y + (p.getY(i) - c.y) * rr, c.z + (p.getZ(i) - c.z) * rr);
    uv.setXY(i, uv.getY(i) * Math.max(1, Math.round(r0 / 8)), t * curve.getLength() / 120);
  }
  g.computeVertexNormals(); return g;
}

/**
 * Một loại cây. type: 'oak' (lá rộng tán tròn), 'tall' (cao, tán thuôn), 'blossom' (hoa hồng), 'pine' (thông).
 * Trả về { trunk, leaves } hình học (toạ độ cục bộ, gốc ở mặt đất), cao ~500–650.
 */
export function treeParts(type, seed = 1, density = 1) {
  const r = rngFor(seed * 97 + type.length);
  const trunkParts = [], clusters = [];
  if (type === 'pine') {
    const H = 640;
    trunkParts.push(limb(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -10, 0), new THREE.Vector3(r.range(-8, 8), H * 0.5, r.range(-8, 8)), new THREE.Vector3(0, H, 0)]), 20, 4, 6, 7));
    for (let i = 0; i < 7; i++) { const y = 150 + i * 70, rad = 190 * (1 - i / 8) + 30; clusters.push({ x: 0, y, z: 0, rx: rad, ry: 46, rz: rad, droop: 1 }); }
    clusters.push({ x: 0, y: 650, z: 0, rx: 34, ry: 60, rz: 34 });
  } else {
    const tall = type === 'tall', H = tall ? 300 : 230;
    const top = new THREE.Vector3(r.range(-30, 30), H, r.range(-30, 30));
    trunkParts.push(limb(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -10, 0), new THREE.Vector3(r.range(-14, 14), H * 0.45, r.range(-14, 14)), top]), tall ? 24 : 30, 13, 6, 8));
    // rễ nổi
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + r.range(-0.3, 0.3); trunkParts.push(limb(new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 12, 30, Math.sin(a) * 12), new THREE.Vector3(Math.cos(a) * 34, 6, Math.sin(a) * 34), new THREE.Vector3(Math.cos(a) * 56, -6, Math.sin(a) * 56)]), 13, 4, 3, 5)); }
    const nb = tall ? 4 : 5;
    for (let i = 0; i < nb; i++) { // cành chính toả ra, đầu cành mang chùm lá
      const a = (i / nb) * Math.PI * 2 + r.range(-0.4, 0.4), y0 = H * r.range(0.55, 0.95), out = (tall ? 120 : 175) * r.range(0.8, 1.15), up = (tall ? 200 : 140) * r.range(0.8, 1.2);
      const p0 = new THREE.Vector3(top.x * y0 / H, y0, top.z * y0 / H), p2 = new THREE.Vector3(Math.cos(a) * out, y0 + up, Math.sin(a) * out);
      const p1 = p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, -up * 0.15, 0));
      trunkParts.push(limb(new THREE.CatmullRomCurve3([p0, p1, p2]), 11, 4, 5, 6));
      const cr = (tall ? 95 : 118) * r.range(0.85, 1.15);
      clusters.push({ x: p2.x, y: p2.y + cr * 0.15, z: p2.z, rx: cr, ry: cr * 0.78, rz: cr });
    }
    const cr = tall ? 120 : 135; // chùm đỉnh + chùm lấp giữa
    clusters.push({ x: top.x, y: H + (tall ? 300 : 220), z: top.z, rx: cr, ry: cr * (tall ? 1.1 : 0.82), rz: cr });
    clusters.push({ x: top.x * 0.5, y: H + (tall ? 140 : 110), z: top.z * 0.5, rx: cr * 1.15, ry: cr * 0.7, rz: cr * 1.15 });
    if (tall) clusters.push({ x: top.x, y: H + 440, z: top.z, rx: 80, ry: 90, rz: 80 });
  }
  // —— thẻ lá ——
  const P = [], N = [], U = [], C = [], I = [];
  const nv = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), rv = new THREE.Vector3(), col = new THREE.Color();
  let minY = Infinity, maxY = -Infinity; for (const c of clusters) { minY = Math.min(minY, c.y - c.ry); maxY = Math.max(maxY, c.y + c.ry); }
  const baseCol = type === 'pine' ? new THREE.Color(0.86, 0.95, 0.92) : new THREE.Color(1, 1, 1);
  for (const c of clusters) {
    const area = 4 * Math.PI * Math.pow((c.rx * c.rz * c.ry) ** (1 / 3), 2), cardS = type === 'pine' ? 95 : 105, n = Math.round(area / (cardS * cardS) * 3.2 * density);
    for (let i = 0; i < n; i++) {
      // điểm trên mặt elipsoid (thiên về nửa trên), lún vào chút cho dày
      let dx = r.range(-1, 1), dy = r.range(-0.55, 1), dz = r.range(-1, 1); const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      if (c.droop) dy = Math.min(dy, 0.25) - 0.1;
      const k = r.range(0.72, 1.02) * (0.85 + fbm(dx * 2 + c.x / 200, dz * 2 + dy + seed, 2) * 0.3);
      const x = c.x + dx * c.rx * k, y = c.y + dy * c.ry * k, z = c.z + dz * c.rz * k;
      nv.set(dx + r.range(-0.3, 0.3), dy + 0.25 + r.range(-0.2, 0.3), dz + r.range(-0.3, 0.3)).normalize();
      rv.set(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)); t1.crossVectors(nv, rv).normalize(); t2.crossVectors(nv, t1);
      const size = cardS * r.range(0.8, 1.2), base = P.length / 3;
      const sun = Math.max(0, dx * SUN3.x + dy * SUN3.y + dz * SUN3.z), hgt = (y - minY) / (maxY - minY || 1);
      const shade = 0.42 + sun * 0.42 + hgt * 0.28 + (k - 0.85) * 0.6 + r.range(-0.06, 0.06);
      for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        P.push(x + (t1.x * u + t2.x * v) * size, y + (t1.y * u + t2.y * v) * size, z + (t1.z * u + t2.z * v) * size);
        N.push(dx * 0.75, dy * 0.75 + 0.35, dz * 0.75); U.push(u + 0.5, v + 0.5);
        col.copy(baseCol).multiplyScalar(shade); if (sun > 0.5 && type !== 'pine') col.r *= 1.06; C.push(col.r, col.g, col.b);
      }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); leaves.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); leaves.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); leaves.setIndex(I);
  // lõi tán tối (che khe giữa các thẻ, tạo chiều sâu)
  const cores = clusters.map((c, i) => { const g0 = new THREE.IcosahedronGeometry(1, 1); g0.deleteAttribute('normal'); const g = mergeVertices(g0); g.scale(c.rx * 0.7, c.ry * 0.62, c.rz * 0.7); g.translate(c.x, c.y, c.z); g.computeVertexNormals(); void i; return g; });
  const coreGeo = mergeGeometries(cores.map((g) => (g.index ? g.toNonIndexed() : g)));
  { const p = coreGeo.attributes.position, cc = new Float32Array(p.count * 3); const k = type === 'pine' ? [0.05, 0.11, 0.1] : type === 'blossom' ? [0.2, 0.12, 0.13] : [0.07, 0.13, 0.04]; for (let i = 0; i < p.count; i++) cc.set(k, 3 * i); coreGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
  const trunk = mergeGeometries(trunkParts.map((g) => (g.index ? g.toNonIndexed() : g)));
  return { trunk, leaves, core: coreGeo };
}

/**
 * Rải nhiều cây (InstancedMesh theo ô vùng để frustum culling). list: [{x,y,z,ry,sx,type,color?}].
 * Trả về Group. density: 0.4..1 (mức đồ hoạ) → số thẻ lá mỗi cây.
 */
export function buildTrees(list, density = 1, cell = 3200) {
  const grp = new THREE.Group(), types = ['oak', 'tall', 'blossom', 'pine'], variants = 2;
  const barkMat = new THREE.MeshLambertMaterial({ map: barkTexture(), color: 0xc8b8a8 });
  const coreMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.03);
  const leafMat = {}; for (const t of types) leafMat[t] = sway(new THREE.MeshLambertMaterial({ map: foliageTexture(t === 'pine' ? 'needle' : t === 'blossom' ? 'blossom' : 'leaf'), vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide }), t === 'pine' ? 0.025 : 0.045);
  const parts = {}; for (const t of types) for (let v = 0; v < variants; v++) parts[t + v] = treeParts(t, v * 13 + 3, density);
  const bins = new Map();
  list.forEach((it, i) => { const k = `${it.type}${i % variants}|${Math.floor(it.x / cell)},${Math.floor(it.z / cell)}`; if (!bins.has(k)) bins.set(k, []); bins.get(k).push(it); });
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (const [k, items] of bins) {
    const key = k.split('|')[0], pr = parts[key], type = key.slice(0, -1);
    for (const [geo, mat] of [[pr.trunk, barkMat], [pr.core, coreMat], [pr.leaves, leafMat[type]]]) {
      const m = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((it, j) => { d.position.set(it.x, it.y, it.z); d.rotation.set(0, it.ry, 0); d.scale.set(it.sx, it.sy ?? it.sx, it.sx); d.updateMatrix(); m.setMatrixAt(j, d.matrix); m.setColorAt(j, c.set(it.color ?? 0xffffff)); });
      m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); grp.add(m);
    }
  }
  return grp;
}
