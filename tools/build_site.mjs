// Dựng thư mục đem lên mạng — dùng chung cho GitHub Pages (.github/workflows/pages.yml), Netlify (netlify.toml), Vercel (vercel.json):
//   node tools/build_site.mjs <thư mục ra> <mã bản>
// Chỉ chép thứ game cần khi chạy (index.html, demo.html, manifest, sw.js, src/, lib/, assets/ — không tools/, docs/), bỏ model tướng thừa
// (tools/site_files.mjs), rồi đánh phiên bản: mã bản vào <meta name="la-build"> và sw.js nhận danh sách tệp + băm (tools/mk_sw.mjs) —
// máy người chơi chỉ tải lại tệp đã đổi. Phần tải sẵn lúc cài vượt 25 MiB thì dừng lỗi.
import { cpSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unusedHeroDirs } from './site_files.mjs';
import { stamp, PRE_MAX } from './mk_sw.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [out, build0] = process.argv.slice(2), build = (build0 || '').slice(0, 12) || 'dev';
if (!out) { console.error('Dùng: node tools/build_site.mjs <thư mục ra> <mã bản>'); process.exit(1); }
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'demo.html', 'manifest.webmanifest', 'sw.js']) copyFileSync(join(ROOT, f), join(out, f));
for (const d of ['src', 'lib', 'assets']) cpSync(join(ROOT, d), join(out, d), { recursive: true });
for (const d of unusedHeroDirs(out)) rmSync(join(out, 'assets/heroes', d), { recursive: true, force: true });
try {
  const m = stamp(out, build), mb = (b) => (b / 1048576).toFixed(1);
  console.log(`site ${out}: precache ${m.pre.n} tệp, ${mb(m.pre.bytes)} MB · tải dần ${m.run.n} tệp, ${mb(m.run.bytes)} MB · bản ${build}`);
  if (m.pre.bytes > PRE_MAX) { console.error(`Phần tải sẵn vượt ${mb(PRE_MAX)} MB`); process.exit(1); }
} catch (e) { console.error('build_site: ' + e.message); process.exit(1); }
