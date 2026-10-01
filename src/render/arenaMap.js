import * as THREE from 'three';
import { wallStoneSurface } from './env/surfaces.js';
import { bakeGroundMap, groundMaterial } from './env/ground.js';
import { structuresOf } from '../data/maps.js';
import { buildRiver } from './env/water.js';
import { buildBushes } from './env/bushes.js';
import { WIND, sway, treeGeo, pineGeo, rockGeo, tuftGeo, flowerGeo, scatterChunked } from './env/foliage.js';
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

  // —— tường rêu: mỗi đoạn là một khối hộp xoay theo hướng đoạn ——
  const th = map.walls.thickness, WH = 130, capMat = new THREE.MeshLambertMaterial({ map: wallStoneSurface(), color: 0xd0c8b8 }), brick = wallStoneSurface();
  for (const w of map.walls.segs) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = Math.hypot(dx, dy), ang = -Math.atan2(dy, dx), cx = (w.x1 + w.x2) / 2, cz = (w.y1 + w.y2) / 2;
    const geo = new THREE.BoxGeometry(L, WH, th), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / (WH * 1.6), uv.getY(i)); // cả chiều cao tường = một ảnh (rêu ở chân)
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: brick, color: 0xe8e0d0 })); m.position.set(cx, WH / 2, cz); m.rotation.y = ang; g.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(L + 16, 26, th + 26), capMat); cap.position.set(cx, WH + 10, cz); cap.rotation.y = ang; g.add(cap);
  }

  g.add(buildBushes(map, dens));

  // —— cây, đá, cỏ, hoa: rừng đặc ngoài viền, thưa trong rừng giữa các đường, chừa đường và sông ——
  const r = rngFor(101), blockedByWall = (x, z, m) => map.walls.segs.some((w) => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (z - w.y1) * dy) / L2)); return Math.hypot(x - (w.x1 + dx * t), z - (w.y1 + dy * t)) < m;
  });
  const put = (n, ok, make) => { const out = []; for (let t = 0; out.length < n && t < n * 40; t++) { const x = r.range(-1800, map.w + 1800), z = r.range(-1800, map.h + 1800); if (!ok(x, z)) continue; out.push(make(x, heightAt(x, z), z)); } return out; };
  const outside = (x, z) => M - Math.min(x, z, map.w - x, map.h - z);
  const inPlay = (x, z) => outside(x, z) < 0;
  const plazas = [0, 1].flatMap((tm) => [tm ? map.mirror(map.fountain.x, map.fountain.y) : map.fountain]);
  const clear = (x, z, lane = halfW + 260) => laneDist(x, z) > lane && plazas.every((q) => Math.hypot(x - q.x, z - q.y) > 900) && riverDist(x, z) > rw / 2 + 160 && !blockedByWall(x, z, 220) && !map.structures.some((s) => [s, map.mirror(s.x, s.y)].some((q) => Math.hypot(x - (q.x ?? s.x), z - (q.y ?? s.y)) < 420));
  const trees = put(Math.round(620 * dens), (x, z) => outside(x, z) > 330, /* cây chỉ ở rừng viền ngoài; trong sân chỉ có bụi núp */ (x, y, z) => ({ x, y: y - 8, z, ry: r.range(0, 7), sx: r.range(0.8, 1.5) * (outside(x, z) > 300 ? 1.4 : 1) }));
  const tint = new THREE.Color();
  trees.forEach((t) => { t.sz = t.sx; t.pine = fbm(t.x / 1600 + 9, t.z / 1600) > 0.56 || r.next() < 0.12; t.color = tint.setRGB(r.range(0.86, 1.0), r.range(0.9, 1.0), r.range(0.8, 0.96), THREE.SRGBColorSpace).getHex(); }); // mỗi cây một sắc độ
  const leafMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.06), broad = trees.filter((t) => !t.pine), pines = trees.filter((t) => t.pine);
  g.add(scatterChunked(treeGeo(), leafMat, broad, true));
  g.add(scatterChunked(pineGeo(), sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.04), pines, true));
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0xb4ad9e }), allRocks = [];
  for (const [seed, n] of [[1, 0.6], [7, 0.6]]) {
    const rocks = put(Math.round(150 * dens * n), (x, z) => outside(x, z) > 220 || (inPlay(x, z) && clear(x, z, halfW + 300) && r.next() < 0.3), (x, y, z) => ({ x, y: y + 6, z, ry: r.range(0, 7), sx: r.range(50, 170), sy: r.range(35, 120), sz: r.range(50, 170), color: r.next() < 0.3 ? 0xc8d0b0 : 0xffffff }));
    g.add(scatterChunked(rockGeo(seed), rockMat, rocks, true)); allRocks.push(...rocks);
  }
  const tuftMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.35);
  const tufts = put(Math.round(2600 * dens), (x, z) => inPlay(x, z) && laneDist(x, z) > halfW + 40 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60), (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.9, 1.7), sy: r.range(0.8, 1.9), sz: r.range(0.9, 1.7) }));
  g.add(scatterChunked(tuftGeo(90), tuftMat, tufts, true));
  const reeds = put(Math.round(300 * dens), (x, z) => inPlay(x, z) && riverDist(x, z) < rw / 2 + 120 && riverDist(x, z) > rw / 2 - 20 && laneDist(x, z) > halfW + 60, (x, y, z) => ({ x, y: y + 20, z, ry: r.range(0, 7), sx: 1.1, sy: r.range(1.4, 2.5), sz: 1.1 }));
  g.add(scatterChunked(tuftGeo(90), tuftMat, reeds, true));
  const pal = [0xe8a0b8, 0xf0d070, 0xf4f0e8, 0xe8a070, 0xc0b0e8];
  const flowers = put(Math.round(500 * dens), (x, z) => inPlay(x, z) && laneDist(x, z) > halfW + 40 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60) && fbm(x / 300, z / 300) > 0.55, (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.8, 1.4), color: pal[r.int(pal.length)] }));
  g.add(scatterChunked(flowerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowers, true));

  // —— nền đất trộn lớp (env/ground.js): đá lát trên đường + sân, đất mòn mép đường/quanh trụ, lòng sông, bóng nướng sẵn ——
  {
    const pad = 2600, structs = structuresOf(map);
    const lanes = map.lanes.map((ln) => { const pts = []; for (let i = 0; i + 1 < ln.pts.length; i++) { const a = ln.pts[i], b = ln.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 300)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } pts.push(ln.pts[ln.pts.length - 1]); return { pts, width: ln.width }; });
    const fountains = [map.fountain, map.mirror(map.fountain.x, map.fountain.y)];
    const plazas = [...fountains.map((f) => ({ x: f.x, z: f.y, r: 640 })), ...structs.filter((q) => q.kind === 'core').map((q) => ({ x: q.x, z: q.y, r: 560 })), ...structs.filter((q) => q.kind !== 'core').map((q) => ({ x: q.x, z: q.y, r: 260 }))];
    const bushRects = map.bushes.flatMap((b) => [b, { ...b, ...map.mirror(b.x, b.y) }]);
    const casters = [
      ...trees.map((t) => ({ x: t.x, z: t.z, r: 150 * t.sx, h: 420 * t.sx, k: 0.6 })),
      ...allRocks.map((q) => ({ x: q.x, z: q.z, r: q.sx * 0.9, h: q.sy * 1.2, k: 0.45 })),
      ...structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 260 : 120, h: q.kind === 'core' ? 700 : 520, k: 0.55 })),
      ...bushRects.flatMap((b) => [-0.25, 0, 0.25].map((f) => ({ x: b.x + f * b.w, z: b.y, r: Math.min(b.w, b.h) * 0.45, h: 160, k: 0.45 }))),
    ];
    const walls = map.walls.segs.map((w) => ({ x1: w.x1, z1: w.y1, x2: w.x2, z2: w.y2, w: map.walls.thickness, h: 150 }));
    const dirt = structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 820 : 430, k: 0.85 }));
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
    const mesh = new THREE.Mesh(geo, groundMaterial(baked)); mesh.position.y = -1; g.add(mesh);
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
  paths.forEach((p) => { let k = 0; for (let s = 900; s < p.length - 600; s += 1500) { const o = pointAt(p, s), sd = k++ % 2 ? -1 : 1; posts.push({ x: o.x - o.dy * sd * (halfW + 90), z: o.y + o.dx * sd * (halfW + 90), y: 215, base: 8 }); } }); // đèn thưa, so le hai bên
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
    update(t, dt, camera, viewH) { WIND.value = t; river.update(t); flies.update(t, viewH); sky.position.copy(camera.position); },
  };
}
