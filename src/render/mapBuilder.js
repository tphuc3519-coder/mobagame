import * as THREE from 'three';
import { heightAt } from './env/terrain.js';
import { flagstoneSurface, wallStoneSurface } from './env/surfaces.js';
import { bakeGroundMap, groundMaterial } from './env/ground.js';
import { structuresOf, bushRects } from '../data/maps.js';
import { buildRiver } from './env/water.js';
import { buildBushes } from './env/bushes.js';
import { buildFoliage, WIND } from './env/foliage.js';
import { buildSky, buildLampGlow, buildFireflies, FOG_COLOR } from './env/sky.js';

export { FOG_COLOR };
const DENSITY = { low: 0.4, mid: 0.7, high: 1 };

/** Dựng bản đồ 1v1: địa hình có bờ dốc, đường lát đá, sông chảy, cầu đá, tường rêu, cây/đá/cỏ/hoa, đèn lồng, đom đóm, trời.
 *  Trả về { group, update(time, dt, camera, viewH) }. Toàn bộ vẽ bằng code, không có file ảnh (assets/LICENSES.md). */
export function buildMap(scene, map, level = 'mid') {
  const dens = DENSITY[level] ?? 1, g = new THREE.Group();
  const lane = map.road, rw = lane.width;
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };

  // cây cỏ trước (cần vị trí cây để nướng bóng xuống nền)
  const foliage = buildFoliage(map, dens);
  const sky = buildSky(); scene.add(sky);
  const wl = map.walls, H = 120;
  const wallSegs = []; // các đoạn tường (giữa các khe) — dùng chung cho hình và bóng
  for (const wy of wl.ys) {
    let x0 = -400;
    for (const gap of [...wl.gaps, { x: map.river.x, w: map.river.width + 130, river: true }, { x: map.w + 550, w: 0 }].sort((a, b) => a.x - b.x)) {
      const x1 = Math.min(map.w + 400, gap.x - gap.w / 2);
      if (x1 > x0) wallSegs.push({ x0, x1, wy });
      if (gap.river) wallSegs.push({ pillar: true, x: gap.x, w: gap.w, wy });
      x0 = gap.x + gap.w / 2;
    }
  }
  // —— nền đất trộn lớp: đường + sân lát đá, đất mòn quanh trụ, lòng khe nước, bóng nướng sẵn (env/ground.js) ——
  {
    const pad = 2200, structs = structuresOf(map), fxs = [map.fountain.x, map.w - map.fountain.x];
    const bushList = bushRects(map);
    const baked = bakeGroundMap({
      x0: -pad, z0: -pad, w: map.w + pad * 2, h: map.h + pad * 2, n: 1024,
      lanes: [{ pts: [[-pad, lane.y], [map.w + pad, lane.y]], width: rw }],
      plazas: [...fxs.map((x) => ({ x, z: lane.y, r: 600 })), ...structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 460 : 230 }))],
      dirt: structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 700 : 420, k: 0.85 })),
      casters: [...(foliage.userData.casters || []), ...structs.map((q) => ({ x: q.x, z: q.y, r: q.kind === 'core' ? 360 : 130, h: q.kind === 'core' ? 800 : 700, k: 0.55 })),
        ...bushList.map((b) => ({ x: b.x, z: b.y, r: Math.min(b.w, b.h) * 0.55, h: 160, k: 0.45 }))],
      walls: wallSegs.filter((w) => !w.pillar).map((w) => ({ x1: w.x0, z1: w.wy, x2: w.x1, z2: w.wy, w: wl.thickness, h: 150 })),
      river: { pts: [[map.river.x, -pad], [map.river.x, map.h + pad]], width: map.river.width },
    });
    const w = map.w + pad * 2, d = map.h + pad * 2, sx = Math.round(110 * dens), sz = Math.round(80 * dens);
    const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color(0.62, 0.6, 0.58);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + map.w / 2, z = p.getZ(i) + map.h / 2; p.setXYZ(i, x, heightAt(map, x, z), z); c.setRGB(1, 1, 1);
      const dxo = Math.max(0, -x, x - map.w); if (dxo > 60) c.lerp(rock, Math.min(0.8, (dxo - 60) / 500)); // vách đá sau chuồng
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, groundMaterial(baked)); mesh.position.y = -1; mesh.receiveShadow = true; g.add(mesh);
  }
  const stone = (w, h, d, x, y, z, k = 1.6, color = 0xe8e0d0) => { // khối đá xếp: cả chiều cao một ảnh, chiều dài lặp theo tỉ lệ
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / (h * k), uv.getY(i));
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: wallStoneSurface(), color })); m.position.set(x, y, z); g.add(m); return m;
  };

  // sông + cầu đá có lan can
  const river = buildRiver(map); g.add(river.mesh);
  const bw = map.river.width + 90;
  stone(bw, 22, rw + 30, map.river.x, 6, lane.y, 0.5);
  const deckTex = flagstoneSurface().clone(); deckTex.repeat.set(bw / 340, rw / 340); deckTex.needsUpdate = true;
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(bw - 30, rw), new THREE.MeshLambertMaterial({ map: deckTex })); deck.rotation.x = -Math.PI / 2; deck.position.set(map.river.x, 18, lane.y); g.add(deck);
  for (const s of [-1, 1]) { stone(bw, 46, 26, map.river.x, 40, lane.y + s * (rw / 2 + 4)); stone(bw + 16, 12, 38, map.river.x, 66, lane.y + s * (rw / 2 + 4), 4, 0xd0c8b8); }

  // tường rêu: hai dải dọc đường, có khe hở (03 §B3)
  for (const w of wallSegs) {
    if (w.pillar) { for (const sx of [-1, 1]) stone(60, H + 50, wl.thickness + 40, w.x + sx * (w.w / 2 + 20), (H + 50) / 2, w.wy, 0.6, 0xd0c8b8); continue; } // trụ đá đỡ đầu tường hai bờ
    stone(w.x1 - w.x0, H, wl.thickness, (w.x0 + w.x1) / 2, H / 2, w.wy);
    stone(w.x1 - w.x0 + 14, 26, wl.thickness + 26, (w.x0 + w.x1) / 2, H + 10, w.wy, 4, 0xd0c8b8);
  }

  g.add(buildBushes(map, dens));
  g.add(foliage);

  // đèn lồng dọc hai mép đường: cột gỗ + lồng giấy phát sáng; quầng sáng gộp một Points
  const posts = [];
  for (let x = 600, k = 0; x < map.w - 300; x += 1100, k++) if (Math.abs(x - map.river.x) > 200) posts.push({ x, z: lane.y + (k % 2 ? -1 : 1) * 500, y: 215, base: H + 22 }); // đèn thưa, so le
  for (const s of [-1, 1]) for (const dx of [-1, 1]) posts.push({ x: map.river.x + dx * (bw / 2 - 20), z: lane.y + s * (rw / 2 + 4), y: 150, base: 66 });
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

  const flies = buildFireflies(map, Math.round(160 * dens)); g.add(flies.object);
  scene.add(g);
  return {
    group: g,
    update(t, dt, camera, viewH) { WIND.value = t; river.update(t); flies.update(t, viewH); sky.position.copy(camera.position); },
  };
}
