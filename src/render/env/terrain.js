import { fbm } from './noise.js';

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
