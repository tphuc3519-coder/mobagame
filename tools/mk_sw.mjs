// Đánh phiên bản lúc deploy (pages.yml): node tools/mk_sw.mjs <thư mục site> <mã bản>
//  1. thay __BUILD__ trong <site>/index.html (<meta name="la-build">);
//  2. lập danh sách tệp game cần khi chạy (index.html, manifest, src/, lib/, assets/ — bỏ *.md, *.txt, LICENSE, tệp ẩn) kèm băm SHA-256 16 ký tự;
//     loại 'r' = assets/heroes/** (model tướng: lưu khi dùng / khi Sảnh nhờ tải trước), 'p' = còn lại (tải sẵn lúc cài);
//  3. ghi mã bản + danh sách vào <site>/sw.js (đúng một chỗ trống mỗi loại, thiếu thì dừng lỗi).
// Phần tải sẵn vượt 25 MiB cũng dừng lỗi (giữ lần cài đầu nhẹ trên điện thoại).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const INCLUDE = [/^index\.html$/, /^manifest\.webmanifest$/, /^src\//, /^lib\//, /^assets\//];
const EXCLUDE = [/\.md$/i, /\.txt$/i, /(^|\/)LICENSE$/, /(^|\/)\./];
export const PRE_MAX = 25 * 1024 * 1024;
export const kindOf = (p) => (p.startsWith('assets/heroes/') ? 'r' : 'p');

/** { files: { đường dẫn: [băm16, loại, byte] } (khoá đã sắp xếp), pre: {n, bytes}, run: {n, bytes} } */
export function swManifest(root) {
  const out = [];
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir)) {
      const p = rel ? `${rel}/${name}` : name, full = join(dir, name), st = statSync(full); // statSync theo cả liên kết tượng trưng
      if (EXCLUDE.some((r) => r.test(p))) continue;
      if (st.isDirectory()) { if (!rel && !['src', 'lib', 'assets'].includes(name)) continue; walk(full, p); }
      else if (INCLUDE.some((r) => r.test(p))) out.push([p, full, st.size]);
    }
  };
  walk(root, '');
  out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const files = {}, pre = { n: 0, bytes: 0 }, run = { n: 0, bytes: 0 };
  for (const [p, full, size] of out) {
    const k = kindOf(p); files[p] = [createHash('sha256').update(readFileSync(full)).digest('hex').slice(0, 16), k, size];
    const t = k === 'p' ? pre : run; t.n++; t.bytes += size;
  }
  return { files, pre, run };
}

export function stamp(site, build) {
  if (!/^[\w.-]{1,40}$/.test(build)) throw new Error('mã bản không hợp lệ: ' + build);
  const ip = join(site, 'index.html'), html = readFileSync(ip, 'utf8');
  if (!html.includes('__BUILD__')) throw new Error('index.html thiếu chỗ trống __BUILD__');
  writeFileSync(ip, html.replace('__BUILD__', build));
  const m = swManifest(site);
  const sp = join(site, 'sw.js'), sw = readFileSync(sp, 'utf8');
  const nB = sw.split("'__BUILD__'").length - 1, nF = sw.split('/*__FILES__*/null').length - 1;
  if (nB !== 1 || nF !== 1) throw new Error(`sw.js cần đúng một chỗ trống mỗi loại (BUILD ${nB}, FILES ${nF})`);
  writeFileSync(sp, sw.replace("'__BUILD__'", `'${build}'`).replace('/*__FILES__*/null', JSON.stringify(m.files)));
  return m;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [site, build] = process.argv.slice(2);
  if (!site || !build) { console.error('Dùng: node tools/mk_sw.mjs <thư mục site> <mã bản>'); process.exit(1); }
  try {
    const m = stamp(site, build), mb = (b) => (b / 1048576).toFixed(1);
    console.log(`precache: ${m.pre.n} tệp, ${mb(m.pre.bytes)} MB · tải dần: ${m.run.n} tệp, ${mb(m.run.bytes)} MB · bản ${build}`);
    if (m.pre.bytes > PRE_MAX) { console.error(`Phần tải sẵn vượt ${mb(PRE_MAX)} MB`); process.exit(1); }
  } catch (e) { console.error('mk_sw: ' + e.message); process.exit(1); }
}
