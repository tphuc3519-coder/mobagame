// Kiểm tra định dạng glTF bằng Khronos glTF-Validator (npm i --no-save gltf-validator).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import validator from 'gltf-validator';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../assets/heroes'), mon = path.resolve(here, '../../assets/monsters');
let bad = 0;
const files = [...fs.readdirSync(root).map((id) => [id, path.join(root, id, `${id}.glb`)]), ...fs.readdirSync(mon).filter((f) => f.endsWith('.glb')).map((f) => [f.slice(0, -4), path.join(mon, f)])]; // tướng + lính / quái
for (const [id, f] of files) {
  if (!fs.existsSync(f)) continue;
  const r = await validator.validateBytes(new Uint8Array(fs.readFileSync(f)), { uri: f });
  const { numErrors, numWarnings, numInfos } = r.issues;
  if (numErrors) bad++;
  console.log(`${id.padEnd(10)} lỗi ${numErrors}  cảnh báo ${numWarnings}  ghi chú ${numInfos}  clip ${r.info.animationCount}  tam giác ${r.info.totalTriangleCount}`);
  if (numErrors || numWarnings) for (const m of r.issues.messages.filter((x) => x.severity < 2).slice(0, 4)) console.log('   ', m.severity === 0 ? 'LỖI' : 'CB', m.code, m.message);
}
process.exit(bad ? 1 : 0);
