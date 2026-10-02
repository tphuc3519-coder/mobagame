import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { wallStoneSurface } from './env/surfaces.js';
import { bakeGroundMap, groundMaterial } from './env/ground.js';
import { structuresOf, bushRects } from '../data/maps.js';
import { buildRiver } from './env/water.js';
import { buildBushes } from './env/bushes.js';
import { buildRockWalls, buildCampSites, campRadius, LAIR_T } from './env/jungleDecor.js';
import { WIND, sway, rockGeo, tuftGeo, flowerGeo, scatterChunked } from './env/foliage.js';
import { buildTrees } from './env/trees.js';
import { buildGrass } from './env/grass.js';
import { buildSky, buildLampGlow, buildFireflies, FOG_COLOR } from './env/sky.js';
import { fbm, rngFor } from './env/noise.js';
import { lanePath, project, pointAt } from '../sim/lanes.js';

export { FOG_COLOR };
const DENSITY = { low: 0.4, mid: 0.7, high: 1 };
const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Dựng bản đồ 5v5: đất có vách núi ngoài viền, ba đường lát đá bo góc, sông chéo, tường rêu, bụi cỏ, đèn lồng, cây đá.
 *  Cùng giao diện với buildMap (1v1): trả về { group, update(time, dt, camera, viewH) }. Địa hình chỉ để nhìn, mô phỏng phẳng. */
export function buildArena(scene, map, level = 'mid') {
  const dens = DENSITY[level] ?? 1, g = new THREE.Group(), M = map.margin || 0;
  const paths = map.lanes.map((_, i) => lanePath(map, i, 0));
  const laneDist = (x, z) => { let d = Infinity; for (const p of paths) d = Math.min(d, project(p, { x, y: z }).d); return d; };
  const riverDist = (x, z) => Math.abs(x - z) / Math.SQRT2;
  const rw = map.river.width, halfW = map.lanes[0].width / 2;

  // —— địa hình ——
  const heightAt = (x, z) => {
    const out = M - Math.min(x, z, map.w - x, map.h - z), bank = sstep(-120, 1000, out);
    const h = bank * 360 + (fbm(x / 520 + 3, z / 520 + 7) - 0.4) * 160 * sstep(-100, 500, out); // trong sân chơi phẳng, dốc dần ra vách
    const land = sstep(halfW + 40, halfW + 320, laneDist(x, z));                                    // dưới đường là đất liền (cầu)
    return h - (1 - sstep(rw / 2 - 40, rw / 2 + 90, riverDist(x, z))) * 55 * land;
  };
  const sky = buildSky(); scene.add(sky);
  let groundMap = null;

  // —— sông chéo ——
  const river = buildRiver(map); g.add(river.mesh);

  // —— bệ đá: cụm tảng đá rêu tự nhiên; lãnh thổ trại quái (env/jungleDecor.js) ——
  g.add(buildRockWalls(map, dens), buildCampSites(map));

  g.add(buildBushes(map, dens));

  // —— cây, đá, cỏ, hoa: rừng đặc ngoài viền, thưa trong rừng giữa các đường, chừa đường và sông ——
  const r = rngFor(101), blockedByWall = (x, z, m) => map.walls.segs.some((w) => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (z - w.y1) * dy) / L2)); return Math.hypot(x - (w.x1 + dx * t), z - (w.y1 + dy * t)) < m + ((w.w ?? map.walls.thickness) - map.walls.thickness) / 2;
  });
  const put = (n, ok, make) => { const out = []; for (let t = 0; out.length < n && t < n * 40; t++) { const x = r.range(-1800, map.w + 1800), z = r.range(-1800, map.h + 1800); if (!ok(x, z)) continue; out.push(make(x, heightAt(x, z), z)); } return out; };
  const outside = (x, z) => M - Math.min(x, z, map.w - x, map.h - z);
  const inPlay = (x, z) => outside(x, z) < 0 && !map.outOfBounds?.(x, z, 0);
  const plazas = [0, 1].flatMap((tm) => [tm ? map.mirror(map.fountain.x, map.fountain.y) : map.fountain]);
  const clear = (x, z, lane = halfW + 260) => laneDist(x, z) > lane && plazas.every((q) => Math.hypot(x - q.x, z - q.y) > 900) && riverDist(x, z) > rw / 2 + 160 && !blockedByWall(x, z, 220) && !map.structures.some((s) => [s, map.mirror(s.x, s.y)].some((q) => Math.hypot(x - (q.x ?? s.x), z - (q.y ?? s.y)) < 420));
  const trees = put(Math.round(900 * dens), (x, z) => outside(x, z) > (z > map.h - M ? 650 : 330) || !!map.outOfBounds?.(x, z, z > map.h * 0.8 ? 900 : 260), /* phía camera (dưới) lùi xa để cây không che đường */ /* mép dưới (phía camera) lùi xa để không che */ /* cây chỉ ở rừng viền ngoài; trong sân chỉ có bụi núp */ (x, y, z) => ({ x, y: y - 8, z, ry: r.range(0, 7), sx: r.range(0.8, 1.5) * (outside(x, z) > 300 ? 1.4 : 1) }));
  const tint = new THREE.Color(), tint0 = new THREE.Color();
  trees.forEach((t) => { t.sz = t.sx; t.pine = fbm(t.x / 1600 + 9, t.z / 1600) > 0.56 || r.next() < 0.12; t.color = tint.setRGB(r.range(0.86, 1.0), r.range(0.9, 1.0), r.range(0.8, 0.96), THREE.SRGBColorSpace).getHex(); }); // mỗi cây một sắc độ
  trees.forEach((t) => { t.type = t.pine ? 'pine' : r.next() < 0.4 ? 'tall' : 'oak'; });
  // rừng dày ngay sau Suối Đèn mỗi đội (ngoài sân chơi): cây lá rộng to + vài cây hoa hồng hai bên hàng cột cổng
  for (const f of plazas) {
    const away = Math.atan2(f.y - map.h / 2, f.x - map.w / 2);
    for (let i = 0, n = 0; n < Math.round(110 * Math.max(0.6, dens)) && i < 3000; i++) {
      const a = away + r.range(-1.75, 1.75), d = r.range(780, 2900), x = f.x + Math.cos(a) * d, z = f.y + Math.sin(a) * d, o = outside(x, z);
      const camSide = z > f.y + 200; // phía camera (+z): lùi xa + thấp hơn để không che sân Suối
      if (o < 120 || (camSide && o < 750) || trees.some((q) => Math.hypot(q.x - x, q.z - z) < 150)) continue;
      const near = d < 1500, bl = near && r.next() < 0.45;
      const tint = tint0.setRGB(r.range(0.88, 1.0), r.range(0.9, 1.0), r.range(0.82, 0.96), THREE.SRGBColorSpace).getHex();
      trees.push({ x, y: heightAt(x, z) - 8, z, ry: r.range(0, 7), sx: r.range(1.0, 1.45) * (near ? 1 : 1.2) * (camSide ? 0.8 : 1), sz: 0, type: bl ? 'blossom' : r.next() < 0.25 ? 'pine' : r.next() < 0.4 ? 'tall' : 'oak', color: bl ? 0xffffff : tint }); n++;
    }
  }
  trees.forEach((t) => { t.sz = t.sx; });
  g.add(buildTrees(trees, dens));
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0xb4ad9e }), allRocks = [];
  for (const [seed, n] of [[1, 0.6], [7, 0.6]]) {
    const rocks = put(Math.round(150 * dens * n), (x, z) => outside(x, z) > 220 || (inPlay(x, z) && clear(x, z, halfW + 300) && r.next() < 0.3), (x, y, z) => ({ x, y: y + 6, z, ry: r.range(0, 7), sx: r.range(50, 170), sy: r.range(35, 120), sz: r.range(50, 170), color: r.next() < 0.3 ? 0xc8d0b0 : 0xffffff }));
    g.add(scatterChunked(rockGeo(seed), rockMat, rocks, true)); allRocks.push(...rocks);
  }
  const tuftMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.35);
  const inCamp = (x, z) => (map.camps || []).some((c) => Math.hypot(c.x - x, c.y - z) < campRadius(c.type) * (c.boss ? 1.25 : 1.05));
  const tufts = put(Math.round(2600 * dens), (x, z) => inPlay(x, z) && !inCamp(x, z) && laneDist(x, z) > halfW + 260 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60), (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.9, 1.7), sy: r.range(0.8, 1.9), sz: r.range(0.9, 1.7) }));
  g.add(scatterChunked(tuftGeo(90), tuftMat, tufts, true));
  const reeds = put(Math.round(300 * dens), (x, z) => inPlay(x, z) && !inCamp(x, z) && riverDist(x, z) < rw / 2 + 120 && riverDist(x, z) > rw / 2 - 20 && laneDist(x, z) > halfW + 60, (x, y, z) => ({ x, y: y + 20, z, ry: r.range(0, 7), sx: 1.1, sy: r.range(1.4, 2.5), sz: 1.1 }));
  g.add(scatterChunked(tuftGeo(90), tuftMat, reeds, true));
  // —— bờ sông kiểu Liên Quân: lá sen nổi + sen hồng ven nước, cỏ dài và khóm hoa xanh trên bờ ——
  {
    const lane = (x, z) => laneDist(x, z) > halfW + 120 && inPlay(x, z);
    const pads = put(Math.round(520 * dens), (x, z) => lane(x, z) && !inCamp(x, z) && riverDist(x, z) > rw / 2 - 190 && riverDist(x, z) < rw / 2 - 25, (x, y, z) => ({ x, y: 4 + r.range(0, 1.5), z, ry: r.range(0, 7), sx: r.range(26, 48), color: [0x4f9a3c, 0x5fae46, 0x3e8a3a][r.int(3)] }));
    const padGeo = new THREE.CircleGeometry(1, 18, 0.35, Math.PI * 2 - 0.35); padGeo.rotateX(-Math.PI / 2);
    g.add(scatterChunked(padGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), pads.map((p) => ({ ...p, sy: 1 })), true));
    const lotus = pads.filter(() => r.next() < 0.12).map((p) => ({ x: p.x, y: 6, z: p.z, ry: r.range(0, 7), sx: r.range(0.9, 1.3) }));
    const lg = []; for (let k = 0; k < 8; k++) { const c = new THREE.ConeGeometry(5, 18, 4); c.translate(0, 9, 0); c.rotateX(0.55); c.rotateY((k / 8) * Math.PI * 2); lg.push(c.toNonIndexed()); }
    g.add(scatterChunked(mergeGeometries(lg), new THREE.MeshLambertMaterial({ color: 0xf4a6c4, emissive: 0x3a1020 }), lotus, false));
    const bank = put(Math.round(700 * dens), (x, z) => lane(x, z) && !inCamp(x, z) && riverDist(x, z) > rw / 2 + 10 && riverDist(x, z) < rw / 2 + 170 && !blockedByWall(x, z, 40), (x, y, z) => ({ x, y: y - 4, z, ry: r.range(0, 7), sx: r.range(90, 150), sy: r.range(90, 170) }));
    g.add(buildGrass(bank, 'wild', 16));
    const blue = put(Math.round(110 * dens), (x, z) => lane(x, z) && riverDist(x, z) > rw / 2 + 40 && riverDist(x, z) < rw / 2 + 260 && !blockedByWall(x, z, 40), (x, y, z) => ({ x, y: y - 4, z, ry: r.range(0, 7), sx: r.range(110, 160), sy: r.range(90, 130) }));
    g.add(buildGrass(blue, 'blue', 8));
  }
  const pal = [0xe8a0b8, 0xf0d070, 0xf4f0e8, 0xe8a070, 0xc0b0e8];
  const flowers = put(Math.round(500 * dens), (x, z) => inPlay(x, z) && !inCamp(x, z) && laneDist(x, z) > halfW + 260 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60) && fbm(x / 300, z / 300) > 0.55, (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.8, 1.4), color: pal[r.int(pal.length)] }));
  g.add(scatterChunked(flowerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowers, true));

  // —— nền đất trộn lớp (env/ground.js): đá lát trên đường + sân, đất mòn mép đường/quanh trụ, lòng sông, bóng nướng sẵn ——
  {
    const pad = 2600, structs = structuresOf(map);
    const lanes = map.lanes.map((ln) => { const pts = []; for (let i = 0; i + 1 < ln.pts.length; i++) { const a = ln.pts[i], b = ln.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 300)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } pts.push(ln.pts[ln.pts.length - 1]); return { pts, width: ln.width }; });
    const fountains = [map.fountain, map.mirror(map.fountain.x, map.fountain.y)];
    const plazas = [...fountains.map((f) => ({ x: f.x, z: f.y, r: 640 })), ...structs.filter((q) => q.kind === 'core').map((q) => ({ x: q.x, z: q.y, r: 780 })), ...structs.filter((q) => q.kind !== 'core').map((q) => ({ x: q.x, z: q.y, r: 260 }))];
    const bushList = bushRects(map);
    const casters = [
      ...map.walls.segs.flatMap((w) => { const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), n = Math.max(2, Math.round(L / 150)); return Array.from({ length: n }, (_, i) => ({ x: w.x1 + (w.x2 - w.x1) * (i + 0.5) / n, z: w.y1 + (w.y2 - w.y1) * (i + 0.5) / n, r: (w.w ?? map.walls.thickness) * 0.55, h: w.ledge ? 110 : 200, k: 0.55 })); }),
      ...trees.map((t) => ({ x: t.x, z: t.z, r: 150 * t.sx, h: 420 * t.sx, k: 0.6 })),
      ...allRocks.map((q) => ({ x: q.x, z: q.z, r: q.sx * 0.9, h: q.sy * 1.2, k: 0.45 })),
      ...structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 520 : 140, h: q.kind === 'core' ? 900 : 700, k: 0.55 })),
      ...bushList.flatMap((b) => b.cap ? [0, 0.25, 0.5, 0.75, 1].map((f) => ({ x: b.cap[0] + (b.cap[2] - b.cap[0]) * f, z: b.cap[1] + (b.cap[3] - b.cap[1]) * f, r: b.r * 0.9, h: 170, k: 0.45 })) : [-0.25, 0, 0.25].map((f) => ({ x: b.x + f * b.w, z: b.y, r: Math.min(b.w, b.h) * 0.45, h: 160, k: 0.45 }))),
    ];
    const walls = []; // bóng tường tính theo từng tảng đá (casters)
    const dirt = [...structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 1100 : 430, k: 0.85 })), ...(map.camps || []).map((c) => ({ x: c.x, z: c.y, r: campRadius(c.type) * 1.6, k: 0.7 }))];
    const baked = bakeGroundMap({ x0: -pad, z0: -pad, w: map.w + pad * 2, h: map.h + pad * 2, n: 1024, lanes, plazas, dirt, casters, walls,
      river: { pts: [[-pad, -pad], [map.w + pad, map.h + pad]], width: rw } });
    const w = map.w + pad * 2, d = map.h + pad * 2, seg = Math.round(170 * dens + 20);
    const geo = new THREE.PlaneGeometry(w, d, seg, seg); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color(0.62, 0.6, 0.58);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + map.w / 2, z = p.getZ(i) + map.h / 2, h = heightAt(x, z), out = outside(x, z);
      p.setXYZ(i, x, h, z); c.setRGB(1, 1, 1);
      if (out > 80) c.lerp(rock, Math.min(0.8, (out - 80) / 700)); // vách ngoài: đá xám
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, groundMaterial(baked)); mesh.position.y = -1; mesh.receiveShadow = true; g.add(mesh);
    groundMap = baked; river.setMask?.(baked);
    // đá vụn lác đác dọc mép đường (thay lề đá thẳng tắp)
    const edge = [];
    for (const ln of lanes) for (let i = 1; i < ln.pts.length; i++) {
      const a = ln.pts[i - 1], b = ln.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      for (let t = 0; t < L; t += 90) { if (r.next() < 0.55) continue; const sd = r.next() < 0.5 ? -1 : 1, off = ln.width / 2 + r.range(-10, 70), x = a[0] + (b[0] - a[0]) * t / L + nx * sd * off, z = a[1] + (b[1] - a[1]) * t / L + nz * sd * off;
        if (riverDist(x, z) < rw / 2 + 40) continue; edge.push({ x, y: 2, z, ry: r.range(0, 7), sx: r.range(18, 46), sy: r.range(10, 26), sz: r.range(18, 46), color: r.next() < 0.4 ? 0xb8b0a0 : 0xffffff }); }
    }
    g.add(scatterChunked(rockGeo(11), rockMat, edge, true));
  }

  // —— đèn lồng dọc hai mép đường ——
  const posts = [];
  paths.forEach((p) => { let k = 0; for (let s = 900; s < p.length - 600; s += 1500) { const o = pointAt(p, s), sd = k++ % 2 ? -1 : 1; const x = o.x - o.dy * sd * (halfW + 90), z = o.y + o.dx * sd * (halfW + 90); if (riverDist(x, z) > rw / 2 + 220) posts.push({ x, z, y: 215, base: 8 }); } }); // đèn thưa, so le hai bên; không cắm đèn dưới lòng sông
  const d = new THREE.Object3D();
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(6, 9, 1, 6), new THREE.MeshLambertMaterial({ color: 0x5a3f2c }), posts.length);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(32, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(2.2) }), posts.length);
  const cap = new THREE.InstancedMesh(new THREE.ConeGeometry(30, 16, 8), new THREE.MeshLambertMaterial({ color: 0x8a3a2c }), posts.length);
  posts.forEach((p, i) => {
    const len = p.y - p.base;
    d.scale.set(1, len, 1); d.position.set(p.x, p.base + len / 2, p.z); d.updateMatrix(); pole.setMatrixAt(i, d.matrix);
    d.scale.set(1, 1.3, 1); d.position.set(p.x, p.y + 20, p.z); d.updateMatrix(); lamp.setMatrixAt(i, d.matrix);
    d.scale.set(1, 1, 1); d.position.set(p.x, p.y + 68, p.z); d.updateMatrix(); cap.setMatrixAt(i, d.matrix);
  });
  g.add(pole, lamp, cap, buildLampGlow(posts));

  const flies = buildFireflies(map, Math.round(420 * dens)); g.add(flies.object);
  scene.add(g);
  return {
    group: g,
    update(t, dt, camera, viewH) { WIND.value = t; LAIR_T.value = t; river.update(t); flies.update(t, viewH); sky.position.copy(camera.position); },
  };
}
