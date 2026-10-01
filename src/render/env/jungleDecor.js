import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildGrass } from './grass.js';
import { fbm, rngFor } from './noise.js';
import { scatter } from './foliage.js';
import { flagstoneSurface, wallStoneSurface } from './surfaces.js';
import { MONSTERS } from '../../data/jungle.js';

// Bệ đá kiểu tảng đá tự nhiên (tham khảo các khối đá rêu trong rừng): mỗi đoạn tường là cụm tảng đá tròn gồ ghề xám lam,
// mặt trên phủ rêu + cỏ/dương xỉ; và "lãnh thổ" của từng trại quái: bệ đá tròn lát phiến, viền đá, đầm sen (Long Ngư), đài sấm (Hổ Lôi).

const ROCK_HI = new THREE.Color(0x6c7484), ROCK_LO = new THREE.Color(0x363c48), ROCK_DK = new THREE.Color(0x1a1d24), MOSS = new THREE.Color(0x4a7330), TOPG = new THREE.Color(0x3d6a2a);
/** Tô màu đá kiểu Liên Quân: xám lam sáng ở mặt ngửa, tối dần xuống chân (giả che khuất), vân lớp ngang, rêu loang trên vai đá. */
function rockColor(c, x, y, z, ny, h01, seed) {
  const v = fbm(x * 0.004 + seed, z * 0.004 + y * 0.003, 3), strata = 0.5 + 0.5 * Math.sin(y * 0.06 + v * 6);
  c.copy(ROCK_LO).lerp(ROCK_HI, Math.min(1, 0.25 + h01 * 0.55 + Math.max(0, ny) * 0.35 + (v - 0.5) * 0.3));
  c.multiplyScalar(0.92 + strata * 0.1);
  c.lerp(ROCK_DK, Math.max(0, 0.35 - h01) * 0.9);                              // chân đá tối
  if (ny > 0.35 && v > 0.48) c.lerp(MOSS, Math.min(0.75, (ny - 0.35) * 1.6) * (v - 0.48) * 3);
  return c;
}

/** Tảng đá tròn mượt (bán kính 1): ít mặt gồ, bóng mượt — không còn kiểu khối gãy cạnh. */
function boulderGeo(seed) {
  const g0 = new THREE.IcosahedronGeometry(1, 3); g0.deleteAttribute('normal'); g0.deleteAttribute('uv');
  const g = mergeVertices(g0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 0.9 + seed, z * 0.9 + y * 0.7 + seed * 0.37, 3) - 0.5) * 0.55;
    p.setXYZ(i, x * k * (1 + Math.max(0, -y) * 0.08), Math.max(-0.2, y * k * (y > 0 ? 0.82 : 0.5)), z * k);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { rockColor(c, p.getX(i) * 300, p.getY(i) * 300, p.getZ(i) * 300, n.getY(i), (p.getY(i) + 0.2) / 1.1, seed); col.set([c.r, c.g, c.b], 3 * i); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Khối đá (vách) theo một đoạn tường dày: lưới "nâng" từ đường viền capsule, vách dốc gồ ghề, vai bo, đỉnh phủ cỏ. */
function massGeo(w, H, seed) {
  const hw = (w.w ?? 110) / 2, ax = w.x1, az = w.y1, bx = w.x2, bz = w.y2, L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
  // đường viền: cạnh phải A→B, nửa tròn B, cạnh trái B→A, nửa tròn A (điểm + tâm "xương sống" tương ứng)
  const ring = [], ns = Math.max(3, Math.round(L / 70)), nc = 9;
  for (let i = 0; i <= ns; i++) { const t = i / ns; ring.push({ cx: ax + ux * L * t, cz: az + uz * L * t, dx: nx, dz: nz }); }
  const capPt = (cx, cz, a) => ({ cx, cz, dx: nx * Math.cos(a) + ux * Math.sin(a), dz: nz * Math.cos(a) + uz * Math.sin(a) }); // a: 0 = +n, π/2 = +u (đầu B), π = −n, 3π/2 = −u (đầu A)
  for (let i = 1; i < nc; i++) ring.push(capPt(bx, bz, (i / nc) * Math.PI));
  for (let i = 0; i <= ns; i++) { const t = 1 - i / ns; ring.push({ cx: ax + ux * L * t, cz: az + uz * L * t, dx: -nx, dz: -nz }); }
  for (let i = 1; i < nc; i++) ring.push(capPt(ax, az, Math.PI + (i / nc) * Math.PI));
  const levels = [[0, 1.08], [0.12, 1.02], [0.45, 0.96], [0.78, 0.86], [0.93, 0.68], [1.0, 0.4]];
  const P = [], I = [], R = ring.length;
  for (const [hy, k] of levels) for (let i = 0; i < R; i++) {
    const q = ring[i], n1 = fbm(q.cx * 0.006 + seed, q.cz * 0.006 + hy * 2, 3), n2 = fbm(q.cx * 0.02 + seed * 3, q.cz * 0.02 + hy * 5, 2);
    const off = hw * k * (0.78 + n1 * 0.44) + (n2 - 0.5) * hw * 0.32 * (hy > 0.05 && hy < 0.95 ? 1 : 0.4);
    P.push(q.cx + q.dx * off, H * hy * (0.75 + n1 * 0.5), q.cz + q.dz * off);
  }
  for (let l = 0; l + 1 < levels.length; l++) for (let i = 0; i < R; i++) { const a = l * R + i, b = l * R + (i + 1) % R, c = (l + 1) * R + i, d = (l + 1) * R + (i + 1) % R; I.push(a, b, c, b, d, c); }
  // nắp đỉnh: dải dọc xương sống, nối vòng trên cùng
  const top = (levels.length - 1) * R, spine = [];
  for (let i = 0; i < R; i++) { const q = ring[i]; spine.push(P.length / 3); P.push(q.cx, H * (0.85 + fbm(q.cx * 0.006 + seed, q.cz * 0.006, 2) * 0.45), q.cz); }
  for (let i = 0; i < R; i++) { const a = top + i, b = top + (i + 1) % R; I.push(a, b, spine[i], b, spine[(i + 1) % R], spine[i]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const gm = mergeVertices(g, 1); gm.computeVertexNormals();
  const p = gm.attributes.position, n = gm.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), ny = n.getY(i), h01 = y / H;
    rockColor(c, p.getX(i), y, p.getZ(i), ny, h01, seed);
    if (ny > 0.7 && h01 > 0.72) { const v = fbm(p.getX(i) * 0.01, p.getZ(i) * 0.01, 2); if (v > 0.42) c.lerp(TOPG.clone().multiplyScalar(0.75 + v * 0.5), Math.min(1, (v - 0.42) * 4)); } // mảng cỏ rêu trên đỉnh (lộ đá chỗ khác)
    col.set([c.r, c.g, c.b], 3 * i);
  }
  gm.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return gm;
}

/** Tường → khối đá lớn kiểu Liên Quân (mỗi đoạn một khối, các khối nối liền chồng lên nhau), đá tảng tròn quanh chân,
 *  cỏ lá dài + khóm hoa xanh trên đỉnh và quanh chân. Trả về group. */
export function buildRockWalls(map, dens = 1) {
  const g = new THREE.Group(), r = rngFor(404), geos = [], boulders = [[], [], []], grassTop = [], grassFoot = [], flowers = [];
  map.walls.segs.forEach((w, si) => {
    const W = w.w ?? map.walls.thickness, H = w.bushRock ? 105 : w.ledge ? 115 : Math.min(240, 120 + W * 0.33);
    geos.push(massGeo(w, H, si * 1.37));
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.y2 - w.y1) / L, nx = -uz, nz = ux;
    // đá tảng tròn ghé chân khối (hai đầu + vài chỗ dọc cạnh)
    const nb = Math.max(1, Math.round(L / 260));
    for (let i = 0; i < nb + 1; i++) {
      const t = (i + r.range(0.1, 0.9)) / (nb + 1), sd = r.next() < 0.5 ? -1 : 1, off = W * r.range(0.38, 0.55), sc = W * r.range(0.22, 0.36);
      boulders[r.int(3)].push({ x: w.x1 + ux * L * t + nx * sd * off, y: -8, z: w.y1 + uz * L * t + nz * sd * off, ry: r.range(0, 7), sx: sc * r.range(1, 1.4), sy: H * r.range(0.35, 0.6), sz: sc });
    }
    // cỏ trên đỉnh
    const nTop = Math.round(L * W / 9000 * dens);
    for (let i = 0; i < nTop; i++) {
      const t = r.next(), o = r.range(-0.32, 0.32) * W;
      grassTop.push({ x: w.x1 + ux * L * t + nx * o, y: H * 0.92, z: w.y1 + uz * L * t + nz * o, ry: r.range(0, 7), sx: r.range(70, 120), sy: r.range(60, 110), color: 0xffffff });
      if (r.next() < 0.18) flowers.push({ x: w.x1 + ux * L * t + nx * o * 0.8, y: H * 0.9, z: w.y1 + uz * L * t + nz * o * 0.8, ry: r.range(0, 7), sx: r.range(90, 130), sy: r.range(80, 110) });
    }
    // cỏ dài quanh chân
    const nFoot = Math.round(L / 110 * dens);
    for (let i = 0; i < nFoot; i++) {
      const t = r.next(), sd = r.next() < 0.5 ? -1 : 1, o = W * r.range(0.5, 0.62);
      grassFoot.push({ x: w.x1 + ux * L * t + nx * sd * o, y: 0, z: w.y1 + uz * L * t + nz * sd * o, ry: r.range(0, 7), sx: r.range(80, 130), sy: r.range(70, 130), color: 0xffffff });
    }
  });
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  g.add(new THREE.Mesh(mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x))), mat));
  boulders.forEach((l, i) => l.length && g.add(scatter(new THREE.InstancedMesh(boulderGeo(i * 7 + 3), mat, l.length), l, true)));
  g.add(buildGrass(grassTop, 'wild', 14), buildGrass(grassFoot, 'wild', 16), buildGrass(flowers, 'blue', 8));
  return g;
}

/** Bán kính bệ lãnh thổ theo loại trại. */
export const campRadius = (type) => ({ soi_da: 300, coc_reu: 250, linh_thuy: 300, hoa_nham: 300, long_ngu: 560, ho_loi: 600 }[type] || 260);

/** Bệ đá lãnh thổ cho mọi trại + đầm sen Long Ngư + đài sấm Hổ Lôi. */
export function buildCampSites(map) {
  const g = new THREE.Group(), r = rngFor(505);
  const top = flagstoneSurface().clone(); top.repeat.set(3, 3); top.needsUpdate = true;
  const topMat = new THREE.MeshLambertMaterial({ map: top, color: 0xd8d2c4 }), sideMat = new THREE.MeshLambertMaterial({ map: wallStoneSurface(false), color: 0xb8b0a0 });
  const rim = [];
  for (const c of map.camps || []) {
    const R = campRadius(c.type), def = MONSTERS[c.type];
    if (def.boss) { buildLair(g, c, R, r, c.type === 'ho_loi' ? 0xa266ff : 0xffa63a); continue; }
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.06, 22, 40, 1), [sideMat, topMat, topMat]); dais.position.set(c.x, 11, c.y); g.add(dais);
    if (def.buff && !def.boss) { // ấn khắc màu bùa giữa bệ
      const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.55, R * 0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.type === 'linh_thuy' ? 0x4fb8ff : 0xff6a2a).multiplyScalar(1.3), transparent: true, opacity: 0.75 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, 23, c.y); g.add(ring);
    }
    const n = Math.round(R / 22); // viền đá quanh bệ, chừa lối vào
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (Math.cos(a - (c.side === 1 ? 0 : 0)) > 0.93) continue; rim.push({ x: c.x + Math.cos(a) * R * 1.04, y: 0, z: c.y + Math.sin(a) * R * 1.04, ry: r.range(0, 7), sx: r.range(28, 46), sy: r.range(20, 38), sz: r.range(28, 46) }); }
  }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(57), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), rim.length), rim, true));
  return g;
}

/** Hang mục tiêu lớn (kiểu hang Tà thần/Rồng của Liên Quân): bệ đá tối thấp gồ ghề giữa sông, hàng "móng đá" cong khổng lồ
 *  ôm phía sau như nanh vuốt, vết nứt phát sáng (tím: Hổ Lôi, vàng cam: Long Ngư) toả ra mặt bệ và lan xuống nước, quả cầu năng lượng. */
function buildLair(g, c, R, r, glowHex) {
  const glow = new THREE.Color(glowHex), seed = c.x * 0.001, back = c.back ?? -Math.PI / 2; // hướng lưng hang (phía rừng), mặt hở ra sông
  // bệ: đĩa đá thấp, mép vỡ gồ ghề, mặt trên lồi lõm nhẹ
  const pg = new THREE.CylinderGeometry(R * 0.98, R * 1.12, 36, 64, 3); pg.deleteAttribute('uv'); pg.deleteAttribute('normal');
  const plat = mergeVertices(pg), pp = plat.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + (fbm(Math.cos(a) * 2 + seed, Math.sin(a) * 2, 3) - 0.5) * 0.22; pp.setXYZ(i, x * k, y + (y > 0 ? (fbm(x * 0.006, z * 0.006 + seed, 3) - 0.5) * 18 : 0), z * k); }
  plat.computeVertexNormals();
  { const n = plat.attributes.normal, col = new Float32Array(pp.count * 3), cc = new THREE.Color(), hi = new THREE.Color(0x5a566a), lo = new THREE.Color(0x24222c);
    for (let i = 0; i < pp.count; i++) { const v = fbm(pp.getX(i) * 0.01 + seed, pp.getZ(i) * 0.01, 3); cc.copy(lo).lerp(hi, 0.25 + v * 0.5 + Math.max(0, n.getY(i)) * 0.25); col.set([cc.r, cc.g, cc.b], 3 * i); }
    plat.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const platM = new THREE.Mesh(plat, new THREE.MeshLambertMaterial({ vertexColors: true })); platM.position.set(c.x, 14, c.y); platM.receiveShadow = true; g.add(platM);
  // móng đá cong ôm phía sau (−z, xa camera) và hai bên
  const claws = [], rockM = new THREE.MeshLambertMaterial({ vertexColors: true });
  const nC = 7;
  for (let i = 0; i < nC; i++) {
    const a = back + (i / (nC - 1) - 0.5) * Math.PI * 0.8, len = R * r.range(0.75, 1.05) * (1 - Math.abs(i / (nC - 1) - 0.5) * 0.5), x0 = Math.cos(a) * R * 1.02, z0 = Math.sin(a) * R * 1.02;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0 * 1.1, -20, z0 * 1.1), new THREE.Vector3(x0 * 1.05, len * 0.45, z0 * 1.05), new THREE.Vector3(x0 * 0.82, len * 0.85, z0 * 0.82), new THREE.Vector3(x0 * 0.55, len * 1.0, z0 * 0.55)]);
    const tg = new THREE.TubeGeometry(curve, 12, 1, 7, false), tp = tg.attributes.position, uv = tg.attributes.uv, pts = curve.getSpacedPoints(12);
    for (let k = 0; k < tp.count; k++) { const t = uv.getX(k), q = pts[Math.min(12, Math.round(t * 12))], rad = R * 0.11 * Math.pow(1 - t, 1.1) + 4; tp.setXYZ(k, q.x + (tp.getX(k) - q.x) * rad * 1.5, q.y + (tp.getY(k) - q.y) * rad, q.z + (tp.getZ(k) - q.z) * rad * 0.8); }
    tg.computeVertexNormals();
    const tn = tg.attributes.normal, col = new Float32Array(tp.count * 3), cc = new THREE.Color();
    for (let k = 0; k < tp.count; k++) { const t = uv.getX(k); cc.set(0x2e2c38).lerp(new THREE.Color(0x7a768c), Math.max(0, tn.getY(k)) * 0.6 + t * 0.25); if (t > 0.1 && t < 0.7 && Math.abs(Math.sin(uv.getY(k) * Math.PI * 2)) < 0.12) cc.lerp(glow, 0.8); col.set([cc.r, cc.g, cc.b], 3 * k); } // gân sáng dọc móng
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.deleteAttribute('uv'); claws.push(tg);
  }
  const clawM = new THREE.Mesh(mergeGeometries(claws), rockM); clawM.position.set(c.x, 0, c.y); g.add(clawM);
  // tảng đá lớn chặn mép sau
  const big = [];
  for (let i = 0; i < 6; i++) { const a = back + r.range(-1.2, 1.2), d = R * r.range(1.05, 1.3); big.push({ x: c.x + Math.cos(a) * d, y: -10, z: c.y + Math.sin(a) * d, ry: r.range(0, 7), sx: R * r.range(0.22, 0.32), sy: R * r.range(0.18, 0.3), sz: R * r.range(0.18, 0.26), color: 0x8a86a0 }); }
  g.add(scatter(new THREE.InstancedMesh(boulderGeo(91), rockM, big.length), big, true));
  // vết nứt phát sáng: mặt trên bệ + lan ra nước quanh hang
  const U = { uT: LAIR_T, uC: { value: glow.clone().multiplyScalar(1.8) }, uR: { value: R }, uS: { value: seed * 37.0 } };
  const crack = (rad, y, outer) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 64), new THREE.ShaderMaterial({ uniforms: { ...U, uO: { value: outer ? 1 : 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uR, uS, uO; uniform vec3 uC; varying vec2 vP;
      vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      float vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = h2(i + g + uS); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return d2 - d1; }
      void main(){ float r = length(vP) / uR, a = atan(vP.y, vP.x);
        vec2 q = vec2(a * 3.0, log(max(r, 0.05)) * 3.2);                       // toạ độ cực: nứt toả tia
        float e = vor(q * vec2(1.0, 1.0) + vec2(0.0, -uT * 0.05));
        float line = smoothstep(0.13, 0.0, e) + smoothstep(0.03, 0.0, e) * 1.5;
        float fall = uO > 0.5 ? smoothstep(1.6, 0.95, r) * smoothstep(0.85, 1.0, r) : smoothstep(1.0, 0.2, r) * 0.9 + 0.1;
        float pulse = 0.65 + 0.35 * sin(uT * 2.2 - r * 6.0);
        float v = line * fall * pulse;
        gl_FragColor = vec4(uC * v, v); }` }));
    m.rotation.x = -Math.PI / 2; m.position.set(c.x, y, c.y); m.renderOrder = 2; g.add(m); };
  crack(R * 0.98, 33, false); crack(R * 1.6, 6, true);
  // quả cầu năng lượng trên móng giữa
  const orb = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 20, 14), new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(1.8) })); orb.position.set(c.x + Math.cos(back) * R * 0.55, R * 0.95, c.y + Math.sin(back) * R * 0.55); g.add(orb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: glow, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); halo.scale.setScalar(R * 0.6); halo.position.copy(orb.position); g.add(halo);
}
export const LAIR_T = { value: 0 };
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (_glow = new THREE.CanvasTexture(c));
}
