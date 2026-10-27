// Kiểm tra model trước khi đưa vào game (11 §8, Mốc 14) cho 20 tướng + lính / quái — tự đọc GLB, không cần gói ngoài:
// clip bắt buộc (02 §13.5), tam giác / vật liệu / xương / texture / dung lượng so với ngân sách 09 §3.1–3.2, chiều cao, hero.art.json khớp model.
// Chiều cao: 09 §3.1 ghi 1,8–2,6 m cho model gửi vào; tướng sinh bằng code có dáng nhỏ CỐ Ý (Conan trẻ con, Doraemon, Konohamaru…) nên
// nhận 1,2–2,6 m (DECISIONS GĐ5c). Vật liệu: không đếm lớp mặt `<id>_face` (mắt / miệng dán, face.js thay bằng vật liệu riêng).
// Lính / quái hoạt ảnh bằng code trên khung xương (render/monsterModels.js) nên không cần clip — cần có xương.
// 4 model cao cấp do chủ dự án gửi (luật 11) được kiểm clip + chiều cao nhưng ngân sách chỉ GHI LẠI (không được sửa model).
// (Muốn chạy thêm Khronos glTF-Validator: cd tools/modelgen && npm i --no-save gltf-validator && node validate.mjs)
// Dùng: node tools/t_models.mjs
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALPHA, HEROES } from '../src/data/heroes/index.js';
import { PREMIUM } from './premium.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };

/** GLB → { json, bin }. */
function glb(file) {
  const b = readFileSync(file), len = b.readUInt32LE(12), json = JSON.parse(b.toString('utf8', 20, 20 + len));
  const o = 20 + len, bin = o + 8 <= b.length ? b.subarray(o + 8, o + 8 + b.readUInt32LE(o)) : Buffer.alloc(0);
  return { json, bin, bytes: b.length };
}
/** Kích thước ảnh nhúng (PNG / JPEG / WebP). */
function imgSize(buf) {
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) { let i = 2; while (i < buf.length) { const m = buf[i + 1], L = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]; i += 2 + L; } }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const t = buf.toString('ascii', 12, 16);
    if (t === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (t === 'VP8L') { const v = buf.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
    if (t === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  return [0, 0];
}
/** Số liệu một model: tam giác (theo node tham chiếu mesh), vật liệu, xương lớn nhất một skin, clip, texture lớn nhất, chiều cao bind (theo đơn vị model). */
function stats(file) {
  const { json: J, bin, bytes } = glb(file), A = J.accessors || [];
  let tris = 0;
  for (const n of J.nodes || []) if (n.mesh != null) for (const p of J.meshes[n.mesh].primitives) if ((p.mode ?? 4) === 4) tris += (p.indices != null ? A[p.indices].count : A[p.attributes.POSITION].count) / 3;
  let tex = 0;
  for (const im of J.images || []) { if (im.bufferView == null) continue; const bv = J.bufferViews[im.bufferView]; const [w, h] = imgSize(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); tex = Math.max(tex, w, h); }
  let minY = Infinity, maxY = -Infinity;
  for (const m of J.meshes || []) for (const p of m.primitives) { const a = A[p.attributes.POSITION]; if (a?.min && a?.max) { minY = Math.min(minY, a.min[1]); maxY = Math.max(maxY, a.max[1]); } }
  return { tris: Math.round(tris), mats: (J.materials || []).filter((m) => !/_face$/.test(m.name || '')).length, bones: Math.max(0, ...(J.skins || []).map((s) => s.joints.length)), clips: (J.animations || []).map((a) => a.name), tex, mb: bytes / 1048576, h: maxY - minY };
}

const REQ = ['Idle', 'Run', 'Attack1', 'Attack2', 'Cast1', 'Cast2', 'Ult', 'Death', 'Recall'];
const tankOf = (id) => (HEROES[id].roles || [HEROES[id].role]).includes('tank');
const rows = [], premiumNotes = [];
for (const id of ALPHA) {
  const dir = join(ROOT, 'assets/heroes', id), file = join(dir, `${id}.glb`);
  if (!existsSync(file)) { ok(`${id}: có model`, false); continue; }
  const s = stats(file), art = JSON.parse(readFileSync(join(dir, 'hero.art.json'), 'utf8')), prem = PREMIUM.includes(id);
  const miss = REQ.filter((c) => !s.clips.includes(c)), triMax = tankOf(id) ? 18000 : 15000;
  const hM = (art.height || 0) / 100; // hero.art.json: chiều cao cm (khớp 09 §3.1 tính mét)
  const over = [s.tris > triMax && `${s.tris} tam giác > ${triMax}`, s.mats > 2 && `${s.mats} vật liệu > 2`, s.bones > 60 && `${s.bones} xương > 60`, s.tex > 1024 && `texture ${s.tex}² > 1024²`, s.mb > 2.5 && `${s.mb.toFixed(2)} MB > 2,5`].filter(Boolean);
  rows.push({ id, ...s, hM, prem, over });
  ok(`${id}: đủ clip bắt buộc (02 §13.5)`, !miss.length, miss.join(','));
  ok(`${id}: hero.art.json khớp model (tên tệp, danh sách clip có thật)`, art.model === `${id}.glb` && (art.clips || []).every((c) => s.clips.includes(c)), (art.clips || []).filter((c) => !s.clips.includes(c)).join(','));
  ok(`${id}: cao 1,2–2,6 m (09 §3.1 + dáng nhỏ cố ý)`, hM >= 1.2 && hM <= 2.6, `${hM.toFixed(2)} m`);
  if (prem) { if (over.length) premiumNotes.push(`${id}: ${over.join(', ')}`); }
  else ok(`${id}: trong ngân sách trận (≤ ${triMax} tam giác, ≤ 2 vật liệu, ≤ 60 xương, texture ≤ 1024², ≤ 2,5 MB)`, !over.length, over.join(' · ') || `${s.tris} tam giác · ${s.bones} xương · ${s.mb.toFixed(2)} MB`);
}
if (premiumNotes.length) console.log('GHI  4 model cao cấp (khoá, không sửa — luật 11) vượt ngân sách trận:\n     ' + premiumNotes.join('\n     '));

// lính / quái / mục tiêu lớn (09 §3.2) — model sinh bằng code. Quái bùa (một con mỗi trại, to gần mục tiêu lớn) không có hàng riêng
// trong 09 §3.2: trần 10 000 (DECISIONS GĐ5c).
const MON = { linh_kiem: [3000, 'lính'], linh_cung: [3000, 'lính'], linh_den: [3000, 'lính'], xe_da: [3000, 'lính'], linh_thuy: [10000, 'quái bùa'], hoa_nham: [10000, 'quái bùa'], long_ngu: [25000, 'mục tiêu lớn'], ta_than: [25000, 'mục tiêu lớn'], than_dieu: [25000, 'mục tiêu lớn'], ho_loi: [25000, 'mục tiêu lớn'] };
for (const f of readdirSync(join(ROOT, 'assets/monsters')).filter((x) => x.endsWith('.glb'))) {
  const id = f.slice(0, -4), s = stats(join(ROOT, 'assets/monsters', f)), [cap, kind] = MON[id] || [4000, 'quái nhỏ'];
  ok(`${id} (${kind}): có khung xương (hoạt ảnh bằng code), ≤ ${cap} tam giác, texture ≤ 1024²`, s.bones > 0 && s.tris <= cap && s.tex <= 1024, `${s.tris} tam giác · ${s.bones} xương`);
}
const nonP = rows.filter((r) => !r.prem);
console.log(`     20 tướng: ${nonP.length} model sinh bằng code — tam giác ${Math.min(...nonP.map((r) => r.tris))}–${Math.max(...nonP.map((r) => r.tris))}, nặng nhất ${Math.max(...nonP.map((r) => r.mb)).toFixed(2)} MB`);
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
