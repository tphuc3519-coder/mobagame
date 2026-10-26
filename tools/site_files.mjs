// Tệp đem lên mạng (pages.yml dựng thư mục site/): bỏ model tướng thừa (thư mục trong assets/heroes không thuộc 20 tướng trong game — còn lại từ bản
// sinh model cũ, chỉ tools/modelgen đọc). Dùng chung cho deploy và tools/t_licenses.mjs.
//   node tools/site_files.mjs <thư mục site>   → xoá model thừa trong site/assets/heroes (chạy trước tools/mk_sw.mjs)
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ALPHA } from '../src/data/heroes/index.js';

/** Thư mục model tướng không dùng trong game. */
export const unusedHeroDirs = (root) => readdirSync(join(root, 'assets/heroes')).filter((d) => statSync(join(root, 'assets/heroes', d)).isDirectory() && !ALPHA.includes(d));

/** Mọi tệp dưới các thư mục `dirs` (đường dẫn tương đối, dấu '/'), bỏ tệp ẩn và model thừa. */
export function siteFiles(root, dirs = ['assets', 'lib']) {
  const skip = new Set(unusedHeroDirs(root).map((d) => `assets/heroes/${d}`)), out = [];
  const walk = (rel) => {
    if (skip.has(rel)) return;
    for (const n of readdirSync(join(root, rel))) {
      if (n.startsWith('.')) continue;
      const r = `${rel}/${n}`;
      if (statSync(join(root, r)).isDirectory()) walk(r); else out.push(r);
    }
  };
  for (const d of dirs) walk(d);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const site = process.argv[2];
  if (!site) { console.error('Dùng: node tools/site_files.mjs <thư mục site>'); process.exit(1); }
  for (const d of unusedHeroDirs(site)) { rmSync(join(site, 'assets/heroes', d), { recursive: true, force: true }); console.log('bỏ model thừa:', d); }
}
