import * as THREE from 'three';
import { fbm } from './noise.js';
import { grassTexture } from './textures.js';

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Độ cao đất: phẳng trong đường, dốc lên thành bờ rừng phía ngoài tường, trũng ở khe nước. Chỉ để nhìn — mô phỏng vẫn phẳng. */
export function heightAt(map, x, z) {
  const dz = Math.abs(z - map.road.y), dx = Math.max(0, -x, x - map.w);
  const bank = Math.max(sstep(560, 1250, dz), sstep(0, 700, dx));
  let h = bank * 300 + (fbm(x / 420 + 3, z / 420 + 7) - 0.4) * 190 * Math.max(bank, 0.25) * sstep(430, 560, dz);
  const rv = Math.abs(x - map.river.x);
  h = h * sstep(map.river.width / 2 + 20, map.river.width / 2 + 420, rv) - 55 * (1 - sstep(map.river.width / 2 - 40, map.river.width / 2 + 90, rv));
  return h;
}

export function buildTerrain(map, density = 1) {
  const pad = 2200, w = map.w + pad * 2, d = map.h + pad * 2, sx = Math.round(110 * density), sz = Math.round(80 * density);
  const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + map.w / 2, z = p.getZ(i) + map.h / 2, h = heightAt(map, x, z);
    p.setXYZ(i, x, h, z); uv.setXY(i, x / 380, z / 380);
    const n = fbm(x / 260, z / 260, 3), dz = Math.abs(z - map.road.y);
    c.setHSL(0.31 - Math.min(0.07, Math.max(0, h) / 4000) + (n - 0.5) * 0.06, 0.5, 0.47 + (n - 0.5) * 0.34 - (dz > 1300 ? 0.1 : 0) - (h < -20 ? 0.12 : 0));
    const dxo = Math.max(0, -x, x - map.w); if (dxo > 60) c.lerp(new THREE.Color(0.36, 0.34, 0.4), Math.min(0.75, (dxo - 60) / 500)); // vách đá sau chuồng
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: grassTexture(), vertexColors: true, color: 0xa2c096 }));
  mesh.position.y = -1;
  return mesh;
}
