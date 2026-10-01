import * as THREE from 'three';
import { pathTexture, brickTexture, grassTexture } from './env/textures.js';
import { buildRiver } from './env/water.js';
import { buildBushes, WIND, sway, treeGeo, rockGeo, tuftGeo, flowerGeo, scatter } from './env/foliage.js';
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
  {
    const pad = 2600, w = map.w + pad * 2, d = map.h + pad * 2, sx = Math.round(170 * dens + 20), sz = sx;
    const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + map.w / 2, z = p.getZ(i) + map.h / 2, h = heightAt(x, z), out = M - Math.min(x, z, map.w - x, map.h - z);
      p.setXYZ(i, x, h, z); uv.setXY(i, x / 380, z / 380);
      const n = fbm(x / 260, z / 260, 3);
      c.setHSL(0.31 - Math.min(0.07, Math.max(0, h) / 4000) + (n - 0.5) * 0.06, 0.5, 0.47 + (n - 0.5) * 0.34 - (h < -20 ? 0.12 : 0));
      if (out > 80) c.lerp(new THREE.Color(0.36, 0.34, 0.4), Math.min(0.75, (out - 80) / 700));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: grassTexture(), vertexColors: true, color: 0xa2c096 })); mesh.position.y = -1;
    g.add(mesh);
  }
  const sky = buildSky(); scene.add(sky);

  // —— đường lát đá: dải theo đường gấp khúc + hai lề đá ——
  const path = pathTexture();
  const ribbon = (pts, width, y, mat, uvScale) => {
    const pos = [], uv = [], idx = [];
    let acc = 0;
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      if (i) acc += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
      pos.push(q[0] + nx * width / 2, y, q[1] + ny * width / 2, q[0] - nx * width / 2, y, q[1] - ny * width / 2);
      uv.push(acc / uvScale, 0, acc / uvScale, width / uvScale);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };
  const laneMat = new THREE.MeshLambertMaterial({ map: path, side: THREE.DoubleSide }), curbMat = new THREE.MeshLambertMaterial({ color: 0x8d8a92, side: THREE.DoubleSide });
  map.lanes.forEach((ln) => {
    const dense = []; // lấy mẫu dày để dải cong mượt
    for (let i = 0; i + 1 < ln.pts.length; i++) { const a = ln.pts[i], b = ln.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 400)); for (let k = 0; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    dense.push(ln.pts[ln.pts.length - 1]);
    g.add(ribbon(dense, ln.width, 2.2 + map.lanes.indexOf(ln) * 0.5, laneMat, 380));
    for (const s of [-1, 1]) {
      const off = dense.map((q, i) => { const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [q[0] - dy / L * s * (ln.width / 2 + 18), q[1] + dx / L * s * (ln.width / 2 + 18)]; });
      g.add(ribbon(off, 36, 7, curbMat, 380));
    }
  });
  // sân lát đá quanh nhà chính và Suối Đèn hai phía
  for (const team of [0, 1]) {
    const fo = team ? map.mirror(map.fountain.x, map.fountain.y) : map.fountain, co = team ? map.mirror(map.structures[0].x, map.structures[0].y) : map.structures[0];
    for (const [pt, r] of [[fo, 600], [co, 520]]) {
      const t = path.clone(); t.repeat.set(r / 260, r / 260); t.needsUpdate = true;
      const plaza = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ map: t })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(pt.x, 4, pt.y); g.add(plaza);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 18, 5, 48), curbMat); ring.rotation.x = -Math.PI / 2; ring.position.set(pt.x, 10, pt.y); g.add(ring);
    }
  }

  // —— sông chéo ——
  const river = buildRiver(map); g.add(river.mesh);

  // —— tường rêu: mỗi đoạn là một khối hộp xoay theo hướng đoạn ——
  const th = map.walls.thickness, WH = 130, capMat = new THREE.MeshLambertMaterial({ color: 0x9a97a6 }), brick = brickTexture();
  for (const w of map.walls.segs) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = Math.hypot(dx, dy), ang = -Math.atan2(dy, dx), cx = (w.x1 + w.x2) / 2, cz = (w.y1 + w.y2) / 2;
    const geo = new THREE.BoxGeometry(L, WH, th), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 300, uv.getY(i) * WH / 300);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: brick })); m.position.set(cx, WH / 2, cz); m.rotation.y = ang; g.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(L + 16, 26, th + 26), capMat); cap.position.set(cx, WH + 10, cz); cap.rotation.y = ang; g.add(cap);
  }

  g.add(buildBushes(map));

  // —— cây, đá, cỏ, hoa: rừng đặc ngoài viền, thưa trong rừng giữa các đường, chừa đường và sông ——
  const r = rngFor(101), blockedByWall = (x, z, m) => map.walls.segs.some((w) => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (z - w.y1) * dy) / L2)); return Math.hypot(x - (w.x1 + dx * t), z - (w.y1 + dy * t)) < m;
  });
  const put = (n, ok, make) => { const out = []; for (let t = 0; out.length < n && t < n * 40; t++) { const x = r.range(-1800, map.w + 1800), z = r.range(-1800, map.h + 1800); if (!ok(x, z)) continue; out.push(make(x, heightAt(x, z), z)); } return out; };
  const outside = (x, z) => M - Math.min(x, z, map.w - x, map.h - z);
  const inPlay = (x, z) => outside(x, z) < 0;
  const plazas = [0, 1].flatMap((tm) => [tm ? map.mirror(map.fountain.x, map.fountain.y) : map.fountain]);
  const clear = (x, z, lane = halfW + 260) => laneDist(x, z) > lane && plazas.every((q) => Math.hypot(x - q.x, z - q.y) > 900) && riverDist(x, z) > rw / 2 + 160 && !blockedByWall(x, z, 220) && !map.structures.some((s) => [s, map.mirror(s.x, s.y)].some((q) => Math.hypot(x - (q.x ?? s.x), z - (q.y ?? s.y)) < 420));
  const trees = put(Math.round(900 * dens), (x, z) => outside(x, z) > 330 || (inPlay(x, z) && clear(x, z, halfW + 420) && fbm(x / 700, z / 700) > 0.45), (x, y, z) => ({ x, y: y - 8, z, ry: r.range(0, 7), sx: r.range(0.8, 1.5) * (outside(x, z) > 300 ? 1.4 : 1) }));
  trees.forEach((t) => { t.sz = t.sx; });
  g.add(scatter(new THREE.InstancedMesh(treeGeo(), sway(new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x7f9f7c }), 0.06), trees.length), trees, true));
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x9a9eb4 });
  for (const [seed, n] of [[1, 0.6], [7, 0.6]]) {
    const rocks = put(Math.round(200 * dens * n), (x, z) => outside(x, z) > 220 || (inPlay(x, z) && clear(x, z, halfW + 300)), (x, y, z) => ({ x, y: y + 6, z, ry: r.range(0, 7), sx: r.range(50, 170), sy: r.range(35, 120), sz: r.range(50, 170), color: r.next() < 0.3 ? 0xd8c8ff : 0xffffff }));
    g.add(scatter(new THREE.InstancedMesh(rockGeo(seed), rockMat, rocks.length), rocks, true));
  }
  const tuftMat = sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 0xb8d2a8 }), 0.35);
  const tufts = put(Math.round(2600 * dens), (x, z) => inPlay(x, z) && laneDist(x, z) > halfW + 40 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60), (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.9, 1.7), sy: r.range(0.8, 1.9), sz: r.range(0.9, 1.7) }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, tufts.length), tufts, true));
  const reeds = put(Math.round(300 * dens), (x, z) => inPlay(x, z) && riverDist(x, z) < rw / 2 + 120 && riverDist(x, z) > rw / 2 - 20 && laneDist(x, z) > halfW + 60, (x, y, z) => ({ x, y: y + 20, z, ry: r.range(0, 7), sx: 1.1, sy: r.range(1.4, 2.5), sz: 1.1 }));
  g.add(scatter(new THREE.InstancedMesh(tuftGeo(90), tuftMat, reeds.length), reeds, true));
  const pal = [0xff8fb8, 0xffd25e, 0xffffff, 0xff9d5c, 0xb99cff];
  const flowers = put(Math.round(900 * dens), (x, z) => inPlay(x, z) && laneDist(x, z) > halfW + 40 && riverDist(x, z) > rw / 2 + 40 && !blockedByWall(x, z, 60) && fbm(x / 300, z / 300) > 0.55, (x, y, z) => ({ x, y, z, ry: r.range(0, 7), sx: r.range(0.8, 1.4), color: pal[r.int(pal.length)] }));
  g.add(scatter(new THREE.InstancedMesh(flowerGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowers.length), flowers, true));

  // —— đèn lồng dọc hai mép đường ——
  const posts = [];
  paths.forEach((p) => { for (let s = 700; s < p.length - 400; s += 560) { const o = pointAt(p, s); for (const sd of [-1, 1]) posts.push({ x: o.x - o.dy * sd * (halfW + 90), z: o.y + o.dx * sd * (halfW + 90), y: 215, base: 8 }); } });
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
