// Giảm lưới model quái / lính (assets/monsters/<id>.glb) bằng bộ giản lược của meshoptimizer: giữ nguyên xương, trọng số, màu đỉnh,
// chất liệu đỉnh (_MAT) — chỉ bỏ bớt đỉnh/tam giác. Lưới SDF gốc 8–21 nghìn tam giác cho một con lính cao vài chục điểm ảnh trên màn
// hình là thừa (lính đông nhất trận, mỗi con vẽ 2 lượt: cảnh + bóng). Ranh giới giữa các vùng chất liệu (phát sáng, màu đội, giáp…) và
// mép hở của chi tiết bị khoá để màu/hình không lem.
// Dùng: node lod.mjs [id[=tỉ_lệ] ...]   (không đối số: mọi model theo bảng RATIO). monsters.mjs gọi simplifyGLB() trước khi ghi file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier as S } from 'meshoptimizer';

/** Tỉ lệ tam giác giữ lại: lính (đông, nhỏ trên màn) giảm mạnh; quái rừng vừa; mục tiêu lớn (to, hay nhìn gần) giảm nhẹ. */
export const RATIO = {
  linh_kiem: 0.3, linh_cung: 0.3, linh_den: 0.32, xe_da: 0.45,
  soi_da: 0.4, coc_reu: 0.4, hoa_nham: 0.45, linh_thuy: 0.42,
  long_ngu: 0.5, ho_loi: 0.5, than_dieu: 0.5, ta_than: 0.5,
};
const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const MAXV = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

function parseGLB(buf) {
  const jl = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const bl = buf.readUInt32LE(20 + jl), bin = buf.subarray(28 + jl, 28 + jl + bl);
  return { json, bin };
}
function writeGLB(json, bin) {
  let js = Buffer.from(JSON.stringify(json), 'utf8'); if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - (js.length % 4), 0x20)]);
  let bn = bin; if (bn.length % 4) bn = Buffer.concat([bn, Buffer.alloc(4 - (bn.length % 4))]);
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bn.length, 8);
  const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.writeUInt32LE(0x4e4f534a, 4);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(bn.length, 0); c1.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, c0, js, c1, bn]);
}
/** Đọc accessor thành mảng số thực (đã chuẩn hoá nếu normalized) + thông tin vị trí byte để chép nguyên phần tử. */
function view(json, bin, ai) {
  const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], n = NCOMP[a.type], cs = SIZE[a.componentType];
  const stride = bv.byteStride || n * cs, base = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float32Array(a.count * n);
  const rd = { 5120: 'readInt8', 5121: 'readUInt8', 5122: 'readInt16LE', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) { let v = bin[rd](base + i * stride + k * cs); if (a.normalized) v /= MAXV[a.componentType]; out[i * n + k] = v; }
  return { a, bv, n, cs, stride, base, data: out };
}

/** Giản lược lưới GLB (một mesh, một primitive có chỉ mục). ratio: tỉ lệ tam giác giữ lại. Trả về Buffer GLB mới + thống kê. */
export async function simplifyGLB(buf, ratio, { error = 0.02 } = {}) {
  await S.ready;
  const { json, bin } = parseGLB(Buffer.from(buf));
  if (json.meshes.length !== 1 || json.meshes[0].primitives.length !== 1) throw new Error('chỉ hỗ trợ 1 mesh / 1 primitive');
  const prim = json.meshes[0].primitives[0], idx = view(json, bin, prim.indices), indices = Uint32Array.from(idx.data);
  const P = view(json, bin, prim.attributes.POSITION), nv = P.a.count;
  const N = prim.attributes.NORMAL != null ? view(json, bin, prim.attributes.NORMAL) : null;
  const C = prim.attributes.COLOR_0 != null ? view(json, bin, prim.attributes.COLOR_0) : null;
  const M = prim.attributes._MAT != null ? view(json, bin, prim.attributes._MAT) : null;
  // thuộc tính đưa vào sai số: pháp tuyến (0,5), màu (1), chất liệu (rời rạc: trọng số lớn)
  const AS = 7, attrs = new Float32Array(nv * AS);
  for (let i = 0; i < nv; i++) {
    for (let k = 0; k < 3; k++) attrs[i * AS + k] = N ? N.data[i * 3 + k] : 0;
    for (let k = 0; k < 3; k++) attrs[i * AS + 3 + k] = C ? C.data[i * C.n + k] : 0;
    attrs[i * AS + 6] = M ? M.data[i * M.n] / 9 : 0;
  }
  // khoá đỉnh nằm trên ranh giới hai vùng chất liệu (phát sáng / màu đội / giáp…) để vùng không co giãn
  const lock = new Uint8Array(nv);
  if (M) for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2], ma = M.data[a * M.n], mb = M.data[b * M.n], mc = M.data[c * M.n];
    if (ma !== mb || mb !== mc) lock[a] = lock[b] = lock[c] = 1;
  }
  const target = Math.floor((indices.length * ratio) / 3) * 3;
  const [simp] = S.simplifyWithAttributes(indices, P.data, 3, attrs, AS, [0.5, 0.5, 0.5, 1, 1, 1, 4], lock, target, error, ['LockBorder', 'RegularizeLight']);
  const out = simp.slice(), [remap, count] = S.compactMesh(out);
  const order = new Uint32Array(count); for (let i = 0; i < nv; i++) if (remap[i] !== 0xffffffff) order[remap[i]] = i;
  // dựng lại bin: các bufferView của thuộc tính đỉnh + chỉ mục được viết lại; phần còn lại (ma trận bind…) chép nguyên
  const repl = new Map(); // bufferView → Buffer mới
  for (const [, ai] of Object.entries(prim.attributes)) {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], n = NCOMP[a.type], cs = SIZE[a.componentType], stride = bv.byteStride || n * cs, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    if (repl.has(a.bufferView)) throw new Error('bufferView dùng chung giữa các thuộc tính — chưa hỗ trợ');
    const nb = Buffer.alloc(count * stride);
    for (let j = 0; j < count; j++) bin.copy(nb, j * stride, base + order[j] * stride, base + order[j] * stride + stride);
    repl.set(a.bufferView, nb); a.byteOffset = 0; a.count = count;
    if (a === P.a) { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let j = 0; j < count; j++) for (let k = 0; k < 3; k++) { const v = P.data[order[j] * 3 + k]; mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v); } a.min = mn; a.max = mx; }
  }
  { const a = json.accessors[prim.indices], u16 = count <= 65535, nb = Buffer.alloc(out.length * (u16 ? 2 : 4));
    out.forEach((v, i) => (u16 ? nb.writeUInt16LE(v, i * 2) : nb.writeUInt32LE(v, i * 4)));
    repl.set(a.bufferView, nb); a.byteOffset = 0; a.count = out.length; a.componentType = u16 ? 5123 : 5125; delete a.min; delete a.max; }
  const parts = []; let off = 0;
  json.bufferViews.forEach((bv, i) => {
    const data = repl.get(i) || bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
    bv.byteOffset = off; bv.byteLength = data.length; parts.push(data); off += data.length;
  });
  const nbin = Buffer.concat(parts); json.buffers[0].byteLength = nbin.length;
  return { glb: writeGLB(json, nbin), tris: [indices.length / 3, out.length / 3], verts: [nv, count] };
}

// —— dòng lệnh: giản lược tại chỗ ——
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/monsters');
  const args = process.argv.slice(2), jobs = args.length ? args.map((a) => { const [id, r] = a.split('='); return [id, r ? +r : RATIO[id]]; }) : Object.entries(RATIO);
  for (const [id, r] of jobs) {
    const f = path.join(dir, id + '.glb'), before = fs.statSync(f).size;
    const { glb, tris, verts } = await simplifyGLB(fs.readFileSync(f), r);
    fs.writeFileSync(f, glb);
    console.log(`${id.padEnd(10)} tam giác ${tris[0]} → ${tris[1]}  đỉnh ${verts[0]} → ${verts[1]}  ${Math.round(before / 1024)} → ${Math.round(glb.length / 1024)} KB`);
  }
}
