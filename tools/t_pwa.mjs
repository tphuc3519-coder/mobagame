// Cài như ứng dụng + chơi không mạng: manifest, biểu tượng, chỗ trống của sw.js, danh sách tệp + băm (tools/mk_sw.mjs) và lần đánh phiên bản
// thử trên một bản sao tạm. Dùng: node tools/t_pwa.mjs
import { readFileSync, existsSync, mkdtempSync, copyFileSync, symlinkSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { swManifest, stamp, PRE_MAX } from './mk_sw.mjs';
import { ALPHA } from '../src/data/heroes/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');

// —— manifest + index.html ——
const M = JSON.parse(read('manifest.webmanifest')), html = read('index.html');
ok('manifest: tên, chế độ toàn màn ngang, phạm vi', M.name && M.short_name && M.short_name.length <= 12 && M.display === 'fullscreen' && M.orientation === 'landscape' && M.start_url === './' && M.scope === './' && M.id === './');
ok('manifest: màu chủ đạo trùng meta theme-color', html.includes(`<meta name="theme-color" content="${M.theme_color}">`), M.theme_color);
const png = (p) => { const b = readFileSync(join(ROOT, p)); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
const iconsOk = M.icons.every((ic) => { if (!existsSync(join(ROOT, ic.src))) return false; if (ic.sizes === 'any') return ic.type === 'image/svg+xml'; const [w, h] = ic.sizes.split('x').map(Number), d = png(ic.src); return d && d[0] === w && d[1] === h; });
ok('manifest: mọi biểu tượng có thật, đúng cỡ khai báo', iconsOk);
ok('manifest: có biểu tượng maskable 512', M.icons.some((ic) => ic.purpose === 'maskable' && ic.sizes === '512x512'));
ok('index.html: liên kết manifest + meta la-build còn chỗ trống', html.includes('<link rel="manifest" href="./manifest.webmanifest">') && html.includes('<meta name="la-build" content="__BUILD__">'));

// —— sw.js ——
const sw = read('sw.js');
ok("sw.js: đúng một chỗ trống mỗi loại ('__BUILD__', /*__FILES__*/null)", sw.split("'__BUILD__'").length === 2 && sw.split('/*__FILES__*/null').length === 2);
let compiles = true; try { new vm.Script(sw); } catch (_) { compiles = false; } ok('sw.js: biên dịch được', compiles);

// —— danh sách tệp ——
const m1 = swManifest(ROOT), m2 = swManifest(ROOT), F = m1.files, keys = Object.keys(F);
ok('danh sách: tất định (hai lần như nhau)', JSON.stringify(m1) === JSON.stringify(m2));
ok('danh sách: băm 16 ký tự hex', keys.every((k) => /^[0-9a-f]{16}$/.test(F[k][0])));
ok('danh sách: không có tools/ docs/ .github/ *.md *.txt', !keys.some((k) => /^(tools|docs|\.github)\//.test(k) || /\.(md|txt)$/i.test(k)));
const walk = new Set(), todo = ['src/main.js'];
while (todo.length) { const p = todo.pop(); if (walk.has(p)) continue; walk.add(p); for (const m of readFileSync(join(ROOT, p), 'utf8').matchAll(/(?:^|\n)\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) { const s = m[1] || m[2]; if (!s.startsWith('.')) continue; todo.push(join(dirname(p), s).replace(/\\/g, '/')); } }
const missing = [...walk].filter((p) => F[p]?.[1] !== 'p');
ok(`danh sách: mọi module nạp từ src/main.js (${walk.size} tệp) đều tải sẵn ('p')`, !missing.length, missing.slice(0, 3).join(', '));
ok('danh sách: three + index.html + manifest tải sẵn', F['lib/three/build/three.module.js']?.[1] === 'p' && F['index.html']?.[1] === 'p' && F['manifest.webmanifest']?.[1] === 'p');
ok('danh sách: model 20 tướng là loại tải dần (r)', ALPHA.every((id) => F[`assets/heroes/${id}/${id}.glb`]?.[1] === 'r'));
ok(`phần tải sẵn < ${PRE_MAX / 1048576} MB`, m1.pre.bytes < PRE_MAX, `${(m1.pre.bytes / 1048576).toFixed(1)} MB / ${m1.pre.n} tệp; tải dần ${(m1.run.bytes / 1048576).toFixed(1)} MB`);

// —— đánh phiên bản trên bản sao tạm ——
const before = ['index.html', 'sw.js'].map(sha);
const tmp = mkdtempSync(join(tmpdir(), 'la-sw-'));
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) copyFileSync(join(ROOT, f), join(tmp, f));
for (const d of ['src', 'lib', 'assets']) symlinkSync(join(ROOT, d), join(tmp, d), 'dir');
const r = stamp(tmp, 'test1234');
const sw2 = readFileSync(join(tmp, 'sw.js'), 'utf8'), html2 = readFileSync(join(tmp, 'index.html'), 'utf8');
let files2 = null; try { files2 = JSON.parse(/const FILES = (\{.*?\});\n/s.exec(sw2)[1]); } catch (_) { /* */ }
let c2 = true; try { new vm.Script(sw2); } catch (_) { c2 = false; }
ok("đánh phiên bản: sw.js có BUILD 'test1234' + FILES đọc được, biên dịch được", sw2.includes("const BUILD = 'test1234';") && files2 && Object.keys(files2).length === Object.keys(r.files).length && c2);
ok('đánh phiên bản: index.html thay meta la-build', html2.includes('<meta name="la-build" content="test1234">') && !html2.includes('__BUILD__'));
ok('đánh phiên bản: tệp trong repo không đổi', JSON.stringify(before) === JSON.stringify(['index.html', 'sw.js'].map(sha)));
let threw = false; try { stamp(tmp, 'again'); } catch (_) { threw = true; }
ok('đánh hai lần (đã hết chỗ trống): báo lỗi', threw);
rmSync(tmp, { recursive: true, force: true });

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
