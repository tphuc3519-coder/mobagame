import { MONSTERS } from '../../data/jungle.js';
import { campRadius } from './jungleDecor.js';

// Độ cao mặt nền phần nhìn (mô phỏng vẫn phẳng): bệ đá lãnh thổ trại quái cao 12 (jungleDecor.buildCampSites), bệ hang mục tiêu lớn
// cao ~32 ± gồ ghề (buildLair). Hiệu ứng mặt đất, vòng ngắm, bóng chân và chính các đơn vị đặt lên trên mặt này — trước đây vẽ ở
// độ cao cố định nên chiêu tung vào hang bùa bị chìm dưới bệ đá.
const DAIS = 12.5, LAIR = 38;

/** Mặt nền cao nhất trong vòng tròn (x, z, r) — r > 0 cho hình rộng (vòng nổ, vệt đất) chạm mép bệ cũng nổi lên trên bệ. */
export function floorAt(map, x, z, r = 0) {
  let h = 0;
  for (const c of map?.camps || []) {
    const boss = !!MONSTERS[c.type]?.boss, R = campRadius(c.type) * (boss ? 0.98 : 1);
    if ((x - c.x) ** 2 + (z - c.y) ** 2 <= (R + r * 0.6) ** 2) h = Math.max(h, boss ? LAIR : DAIS);
  }
  return h;
}
