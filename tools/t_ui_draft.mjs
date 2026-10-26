// Kiểm thử trình duyệt luồng chọn vị trí + cấm/chọn: tự mở máy chủ tĩnh (nếu cổng chưa có) rồi chạy tools/b_flow.cjs.
//   node tools/t_ui_draft.mjs [cổng=8099] [kịch bản…]     (kịch bản: ranked844 ranked1280 normal844 normal1280 role844 — mặc định tất cả)
// Chậm: mỗi lần vào trận dịch shader trên WebGL phần mềm ~1 phút. Dòng cuối "Tất cả đạt" khi đạt hết.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = +(process.argv[2] || 8099), extra = process.argv.slice(3);
const up = async () => { try { return (await fetch(`http://127.0.0.1:${port}/index.html`)).ok; } catch (_) { return false; } };

let server = null;
if (!(await up())) {
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200));
}
const kid = spawn(process.execPath, [path.join(root, 'tools/b_flow.cjs'), String(port), ...extra], { cwd: root, stdio: 'inherit', env: process.env });
const code = await new Promise((r) => kid.on('exit', (c) => r(c ?? 1)));
server?.kill();
process.exit(code);
