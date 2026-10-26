// Bản quyền asset (Mốc 14, 10_LO_TRINH): mọi tệp đem lên mạng trong assets/ và lib/ phải có dòng trong assets/LICENSES.md; dòng nào trỏ vào
// assets/ hay lib/ thì phải khớp ít nhất một tệp (không để dòng cũ trỏ vào tệp đã xoá). Model thừa không đem lên mạng (tools/site_files.mjs).
// Đọc cột đầu bảng: mỗi `đường/dẫn` là một mẫu ('*' trong một đoạn; kết thúc '/*' = mọi thứ bên dưới); tên tệp trần dùng thư mục của mẫu đứng trước.
// Dùng: node tools/t_licenses.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteFiles, unusedHeroDirs } from './site_files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };

const rows = readFileSync(join(ROOT, 'assets/LICENSES.md'), 'utf8').split('\n').filter((l) => l.startsWith('| `'));
const pats = [];
for (const r of rows) {
  const cell = r.split('|')[1]; let dir = '';
  for (const [, tok] of cell.matchAll(/`([^`]+)`/g)) {
    const full = tok.includes('/') ? tok : (dir ? `${dir}/${tok}` : tok);
    if (tok.includes('/')) dir = tok.slice(0, tok.lastIndexOf('/'));
    const rx = full.endsWith('/*') ? new RegExp('^' + full.slice(0, -2).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '/.+$')
      : new RegExp('^' + full.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    pats.push({ tok: full, rx, row: r.slice(0, 60) });
  }
}
const files = siteFiles(ROOT).filter((f) => f !== 'assets/LICENSES.md');
const miss = files.filter((f) => !pats.some((p) => p.rx.test(f)));
ok(`mọi tệp đem lên mạng (${files.length} tệp trong assets/ + lib/) đều có dòng bản quyền`, !miss.length, miss.slice(0, 8).join(', ') + (miss.length > 8 ? ` … (+${miss.length - 8})` : ''));
const stale = pats.filter((p) => /^(assets|lib)\//.test(p.tok) && !siteFiles(ROOT).some((f) => p.rx.test(f)));
ok('không dòng nào trỏ vào tệp đã xoá', !stale.length, stale.map((p) => p.tok).join(', '));
const prem = ['hoa_ren', 'thach_quy', 'bong_tre', 'nguyet_ha'].map((h) => `assets/heroes/${h}/${h}.glb`);
ok('4 model cao cấp có dòng riêng ghi rõ "chủ dự án gửi"', prem.every((f) => rows.some((r) => r.includes(f) && /chủ dự án gửi/.test(r))));
ok('phông chữ: giấy phép OFL đi kèm', rows.some((r) => r.includes('assets/fonts') && /Open Font License/.test(r)) && files.includes('assets/fonts/OFL.txt'));
const unused = unusedHeroDirs(ROOT);
ok(`model thừa không đem lên mạng (${unused.length} thư mục)`, unused.length >= 0 && !files.some((f) => unused.some((d) => f.startsWith(`assets/heroes/${d}/`))), unused.join(', '));

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
