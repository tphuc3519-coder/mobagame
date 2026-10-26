// Khoá 4 model cao cấp (Hoả Rèn, Thạch Quy, Bóng Tre, Nguyệt Hạ): mọi file model, file gốc hoạ sĩ, animation viết tay và ảnh thẻ
// phải trùng mã băm đã chốt trong tools/premium.lock.json. Sửa một byte là test đổ.
// Dùng: node tools/t_premium.mjs            — kiểm
//       node tools/t_premium.mjs --lock     — CHỈ chủ dự án dùng khi chính họ gửi bản model mới
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PREMIUM, PREMIUM_IMPORTS } from './premium.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockFile = path.join(root, 'tools/premium.lock.json');
const files = () => {
  const out = [];
  for (const id of PREMIUM) {
    for (const f of fs.readdirSync(path.join(root, 'assets/heroes', id))) out.push(`assets/heroes/${id}/${f}`);
    for (const f of fs.readdirSync(path.join(root, 'tools/modelgen/heroes'))) if (f.startsWith(id + '.')) out.push(`tools/modelgen/heroes/${f}`);
    for (const f of fs.readdirSync(path.join(root, 'assets/ui/heroes'))) if (f.startsWith(id + '_')) out.push(`assets/ui/heroes/${f}`);
  }
  for (const f of PREMIUM_IMPORTS) out.push(`tools/modelgen/imports/${f}`);
  return out.sort();
};
const hash = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

if (process.argv.includes('--lock')) {
  const lock = Object.fromEntries(files().map((f) => [f, hash(f)]));
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 1) + '\n');
  console.log('đã chốt', Object.keys(lock).length, 'file');
  process.exit(0);
}
const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
let bad = 0;
for (const [f, h] of Object.entries(lock)) {
  if (!fs.existsSync(path.join(root, f))) { console.log('MẤT  ', f); bad++; continue; }
  if (hash(f) !== h) { console.log('ĐỔI  ', f); bad++; }
}
for (const f of files()) if (!(f in lock)) { console.log('THÊM ', f, '(file mới trong thư mục model cao cấp)'); bad++; }
console.log(bad ? `HỎNG: ${bad} file của 4 model cao cấp bị đụng tới` : `ĐẠT: ${Object.keys(lock).length} file của 4 model cao cấp nguyên vẹn`);
process.exit(bad ? 1 : 0);
