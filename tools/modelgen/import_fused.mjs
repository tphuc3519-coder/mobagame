// Nhập model liền khối có texture (kiểu AI/scan: 1 mesh PBR, không xương, gltfpack + meshopt) thành model game:
// giải nén meshopt, đưa về chiều cao tướng, tự tính trọng số xương theo khoảng cách tới từng đoạn xương, gắn riêng phần vũ khí vào tay,
// rồi dùng lại bộ clip anim.mjs. Texture (JPEG) giữ nguyên, ghép lại vào file xuất. Gọi qua build.mjs khi `import.mode === 'fused'`.
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import jpeg from 'jpeg-js';
import { MeshoptSimplifier } from 'meshoptimizer';
import { buildClips } from './anim.mjs';
import { makeRig } from './import_glb.mjs';

const B = (n) => 'Bone_' + n;
const align4 = (n) => (n + 3) & ~3;

/** Tách GLB thành JSON + BIN. */
function parseGlb(buf) {
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jl).toString());
  const bl = buf.readUInt32LE(20 + jl);
  return { json, bin: buf.subarray(28 + jl, 28 + jl + bl) };
}
function packGlb(json, bin) {
  const jb = Buffer.from(JSON.stringify(json)); const jp = Buffer.concat([jb, Buffer.alloc(align4(jb.length) - jb.length, 0x20)]);
  const bp = Buffer.concat([bin, Buffer.alloc(align4(bin.length) - bin.length, 0)]);
  const out = Buffer.alloc(12 + 8 + jp.length + 8 + bp.length);
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jp.length, 12); out.writeUInt32LE(0x4E4F534A, 16); jp.copy(out, 20);
  const o = 20 + jp.length; out.writeUInt32LE(bp.length, o); out.writeUInt32LE(0x004E4942, o + 4); bp.copy(out, o + 8);
  return out;
}

/** Đọc mesh: bỏ texture khỏi bản đưa cho GLTFLoader (Node không giải mã được ảnh), lấy vị trí/pháp tuyến/uv đã giải nén, thế giới, float. */
async function readMesh(file) {
  const { json, bin } = parseGlb(fs.readFileSync(file));
  const imgs = (json.images || []).map((im) => { const bv = json.bufferViews[im.bufferView]; return Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); });
  const mat = json.materials[0], tex = (t) => t && t.index;
  const refs = { base: tex(mat.pbrMetallicRoughness?.baseColorTexture), mr: tex(mat.pbrMetallicRoughness?.metallicRoughnessTexture), normal: tex(mat.normalTexture) };
  const tt = mat.pbrMetallicRoughness?.baseColorTexture?.extensions?.KHR_texture_transform || { offset: [0, 0], scale: [1, 1] };
  const j2 = JSON.parse(JSON.stringify(json)); delete j2.textures; delete j2.images; delete j2.samplers;
  j2.materials = [{ name: mat.name || 'm' }];
  const glb = packGlb(j2, Buffer.from(bin));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  let mesh; gltf.scene.traverse((o) => { if (o.isMesh) mesh = o; });
  const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, v = new THREE.Vector3();
  const pos = new Float32Array(P.count * 3), nor = new Float32Array(P.count * 3), uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(mesh.matrixWorld); pos.set([v.x, v.y, v.z], i * 3);
    nor.set([N.getX(i), N.getY(i), N.getZ(i)], i * 3);
    uv.set([U.getX(i) * tt.scale[0] + tt.offset[0], U.getY(i) * tt.scale[1] + tt.offset[1]], i * 2); // khôi phục uv thật (gltfpack nén uv rồi bù bằng KHR_texture_transform)
  }
  return { pos, nor, uv, index: Array.from(g.index.array), imgs, refs, baseImg: json.textures[refs.base]?.source, matName: mat.name };
}

/** Thu nhỏ ảnh JPEG (lọc hộp) về cạnh dài tối đa `max` rồi mã hoá lại; ảnh nhỏ hơn thì giữ nguyên. */
function shrinkJpeg(buf, max, quality = 84) {
  const im = jpeg.decode(buf, { useTArray: true }), k = Math.floor(Math.max(im.width, im.height) / max);
  if (k < 2) return buf;
  const w = Math.floor(im.width / k), h = Math.floor(im.height / k), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) { let a = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) a += im.data[((y * k + j) * im.width + x * k + i) * 4 + c]; out[(y * w + x) * 4 + c] = a / (k * k); }
  console.log(`  ảnh ${im.width}×${im.height} → ${w}×${h}`);
  return Buffer.from(jpeg.encode({ data: out, width: w, height: h }, quality).data);
}

/** Khoảng cách từ điểm tới đoạn thẳng a→b. */
function segDist(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], L = abx * abx + aby * aby + abz * abz || 1e-9;
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby + (p[2] - a[2]) * abz) / L; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t, p[2] - a[2] - abz * t);
}

/** Giảm tam giác bằng meshoptimizer (giữ biên uv/pháp tuyến), rồi dồn lại đỉnh. cfg: { tris, error }. */
async function simplifyMesh(src, { tris, error = 0.02, flags = [] }) {
  await MeshoptSimplifier.ready;
  const n = src.pos.length / 3, attr = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) { attr.set([src.uv[2 * i], src.uv[2 * i + 1]], i * 5); attr.set([src.nor[3 * i], src.nor[3 * i + 1], src.nor[3 * i + 2]], i * 5 + 2); }
  const before = src.index.length / 3;
  const [out] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(src.index), src.pos, 3, attr, 5, [4, 4, 0.6, 0.6, 0.6], null, tris * 3, error, flags);
  const remap = new Int32Array(n).fill(-1); let m = 0; for (const v of out) if (remap[v] < 0) remap[v] = m++;
  const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), uv = new Float32Array(m * 2);
  for (let i = 0; i < n; i++) { const j = remap[i]; if (j < 0) continue; pos.set(src.pos.subarray(3 * i, 3 * i + 3), 3 * j); nor.set(src.nor.subarray(3 * i, 3 * i + 3), 3 * j); uv.set(src.uv.subarray(2 * i, 2 * i + 2), 2 * j); }
  src.pos = pos; src.nor = nor; src.uv = uv; src.index = Array.from(out, (v) => remap[v]);
  console.log(`  giảm ${before} → ${src.index.length / 3} tam giác, ${n} → ${m} đỉnh`);
}

export async function importFused(id, def, outRoot, here) {
  const cfg = def.import;
  const src = await readMesh(path.resolve(here, cfg.file));
  if (cfg.simplify) await simplifyMesh(src, cfg.simplify);
  const n = src.pos.length / 3;
  // màu texture tại từng đỉnh (0..255 sRGB): để phân biệt cây búa (gỗ/kim loại tối) với da, tóc, vải sát bên khi gắn xương
  const tex = src.refs.base != null ? jpeg.decode(src.imgs[src.baseImg], { useTArray: true }) : null;
  const rgbOf = (i) => { if (!tex) return [128, 128, 128]; const u = src.uv[2 * i] - Math.floor(src.uv[2 * i]), v = src.uv[2 * i + 1] - Math.floor(src.uv[2 * i + 1]); const x = Math.min(tex.width - 1, Math.floor(u * tex.width)), y = Math.min(tex.height - 1, Math.floor(v * tex.height)); const o = 4 * (y * tex.width + x); return [tex.data[o], tex.data[o + 1], tex.data[o + 2]]; };
  const X = cfg.centerX ?? 0, Z = cfg.centerZ ?? 0; // dời để thân nằm giữa x=0, z=0 (đơn vị file gốc)
  const isStaff = (x) => cfg.staffMaxX != null && x - X < cfg.staffMaxX; // (tuỳ chọn) cắt cứng theo x; mặc định dùng đoạn vũ khí mềm bên dưới
  // chiều cao thân (bỏ vũ khí) → hệ số co
  let top = 0; for (let i = 0; i < n; i++) if (!isStaff(src.pos[3 * i])) top = Math.max(top, src.pos[3 * i + 1]);
  const H = cfg.height ?? 2.5, s = H / (cfg.bodyTop ?? top);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[3 * i] = (src.pos[3 * i] - X) * s; pos[3 * i + 1] = src.pos[3 * i + 1] * s; pos[3 * i + 2] = (src.pos[3 * i + 2] - Z) * s; }

  // —— Khớp (đơn vị file gốc, x tương đối thân; trái nhân vật = +x) ——
  const K = (cfg.bodyTop ?? top) / 0.66; // bán kính ảnh hưởng mặc định đặt cho thân cao 0.66 (file thợ lặn); co theo chiều cao thân của file khác
  const J = { hips: 0.27, thighX: 0.05, knee: 0.15, ankle: 0.05, spine: 0.34, chest: 0.45, neck: 0.56, head: 0.6, headTop: 0.64,
    shoulder: [0.15, 0.5], elbow: [0.165, 0.37], wrist: [0.17, 0.25], tip: [0.17, 0.2], wristR: [-0.2, 0.27], tipR: [-0.2, 0.75], toe: 0.1, ...(cfg.joints || {}) };
  const V = (x, y, z = 0) => new THREE.Vector3(x * s, y * s, z * s);
  const W = {
    Root: V(0, 0), Hips: V(0, J.hips), Spine: V(0, J.spine), Chest: V(0, J.chest), Neck: V(0, J.neck), Head: V(0, J.head),
    ThighL: V(J.thighX, J.hips), ThighR: V(-J.thighX, J.hips), ShinL: V(J.thighX, J.knee), ShinR: V(-J.thighX, J.knee), FootL: V(J.thighX, J.ankle), FootR: V(-J.thighX, J.ankle),
    UpperArmL: V(...J.shoulder), UpperArmR: V(-J.shoulder[0], J.shoulder[1]), ForearmL: V(...J.elbow), ForearmR: V(-J.elbow[0], J.elbow[1]),
    HandL: V(...J.wrist), HandR: V(...J.wristR), HandL_Tip: V(...J.tip), HandR_Tip: V(...J.tipR),
  };
  for (const [k, q] of Object.entries(cfg.rig || {})) if (W[k]) W[k] = V(q[0], q[1], q[2] || 0); // (khoá không phải khớp như HandEndR/ToeL/HeadTop chỉ dùng tính trọng số) // cfg.rig: đặt thẳng từng khớp [x,y,z] khi tư thế không phải T/đứng thẳng
  // xương phụ cho vải/váy: 4 xương quanh hông (trước/sau/trái/phải), quay quanh hông để vải đung đưa trễ nhịp so với thân
  const SK = cfg.skirt, skDirs = { F: [0, 1], B: [0, -1], L: [1, 0], R: [-1, 0] }, extra = [];
  if (SK) for (const k of Object.keys(skDirs)) { W['Skirt' + k] = W.Hips.clone(); extra.push(['Skirt' + k, 'Hips']); }
  const { bones, idx, root } = makeRig(W, extra);

  // —— Đoạn xương + bán kính ảnh hưởng (đơn vị file gốc) để tính trọng số ——
  const w3 = (k) => W[k].toArray().map((v) => v);
  const segs = [
    ['Hips', 'Hips', 'Spine', 0.12], ['Spine', 'Spine', 'Chest', 0.115], ['Chest', 'Chest', 'Neck', 0.115], ['Neck', 'Neck', 'Head', 0.07],
    ['Head', 'Head', null, 0.11, cfg.rig?.HeadTop ? V(...cfg.rig.HeadTop).toArray() : [W.Head.x, J.headTop * s, W.Head.z]],
    ...['L', 'R'].flatMap((d) => [
      ['UpperArm' + d, 'UpperArm' + d, 'Forearm' + d, 0.065], ['Forearm' + d, 'Forearm' + d, 'Hand' + d, 0.06], ['Hand' + d, 'Hand' + d, 'Hand' + d + '_Tip', 0.06, cfg.rig?.['HandEnd' + d] ? V(...cfg.rig['HandEnd' + d]).toArray() : null],
      ['Thigh' + d, 'Thigh' + d, 'Shin' + d, 0.05], ['Shin' + d, 'Shin' + d, 'Foot' + d, 0.045], ['Foot' + d, 'Foot' + d, null, 0.05, cfg.rig?.['Toe' + d] ? V(...cfg.rig['Toe' + d]).toArray() : [W['Foot' + d].x, 0, W['Foot' + d].z + J.toe * s]],
    ]),
  ].map(([bone, a, b, r, end]) => ({ bone, a: w3(a), b: end || w3(b), r: r * K * (cfg.radii?.[bone] ?? 1) * s }));
  // Vũ khí liền khối với thân: coi như một "xương phụ" dạng đoạn thẳng gắn vào tay phải (đơn vị file gốc, x tương đối thân)
  for (const w of [].concat(cfg.weapon || [])) segs.push({ bone: w.bone || 'HandR', a: w.a.map((v) => v * s), b: w.b.map((v) => v * s), r: w.r * s, sig: (w.soft ?? 0.01) * s, cut: (w.cut ?? 0.025) * s, hard: (w.hard ?? 0.012) * s, test: w.test }); // sig nhỏ: vũ khí ăn trọng số gắt, không kéo vải/tóc sát bên // toạ độ vũ khí cũng tương đối thân (đã trừ centerX/centerZ)
  const sig = (cfg.softness ?? 0.02) * K * s;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const hand = idx[B('HandR')], isHard = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
    if (isStaff(src.pos[3 * i])) { si[4 * i] = hand; sw[4 * i] = 1; continue; }
    const rgb = rgbOf(i), segsI = segs.filter((sg) => !sg.test || sg.test(rgb)); // vũ khí chỉ nhận đỉnh có màu texture hợp lệ (loại da/tóc sát bên)
    const hs = segsI.find((sg) => sg.cut != null && segDist(p, sg.a, sg.b) - sg.r <= sg.hard);
    if (hs) { si[4 * i] = idx[B(hs.bone)]; sw[4 * i] = 1; isHard[i] = idx[B(hs.bone)] + 1; continue; } // nằm trong thân vũ khí: gắn cứng 100% vào tay, không trộn với cẳng tay (tránh méo khi xoay cổ tay mạnh)
    const dd = segsI.map((sg) => ({ b: idx[B(sg.bone)], sig: sg.sig || sig, d: Math.max(0, segDist(p, sg.a, sg.b) - sg.r), cut: sg.cut })).filter((c, _, all) => !(c.cut != null && c.d > c.cut && all.length > 1)); // vũ khí chỉ ăn đỉnh nằm sát nó, không cướp vải ở xa
    const dmin = Math.min(...dd.map((c) => c.d)); // trừ khoảng cách nhỏ nhất: xương gần nhất luôn có trọng số 1, không bị underflow
    const acc = new Map(); for (const c of dd) acc.set(c.b, (acc.get(c.b) || 0) + Math.exp(-Math.pow((c.d - dmin) / c.sig, 2)));
    let cand = [...acc].map(([b, w]) => ({ b, w })).sort((a, b) => b.w - a.w).slice(0, 4);
    cand = cand.filter((c) => c.w > 1e-3 * cand[0].w); // bỏ khe trọng số ~0 (glTF cấm chỉ số khác 0 mà trọng số 0)
    let tot = cand.reduce((a, c) => a + c.w, 0);
    if (SK) { // vải thả dưới hông và cách xa chân: chuyển một phần trọng số sang xương váy theo hướng đỉnh nhìn từ hông
      const hy = W.Hips.y, v = Math.min(1, Math.max(0, (hy + (SK.from ?? 0.05) * K * s - p[1]) / ((SK.span ?? 0.5) * K * s)));
      const dLeg = Math.min(...segs.filter((sg) => /^(Thigh|Shin|Foot)/.test(sg.bone)).map((sg) => Math.max(0, segDist(p, sg.a, sg.b) - sg.r)));
      const g0 = (SK.gap0 ?? 0.04) * K * s, g1 = (SK.gap1 ?? 0.2) * K * s, hz = Math.min(1, Math.max(0, (dLeg - g0) / (g1 - g0)));
      const sk = (SK.max ?? 0.9) * v * v * (3 - 2 * v) * hz * hz * (3 - 2 * hz);
      if (sk > 1e-3) {
        const ux = p[0] - W.Hips.x, uz = p[2] - W.Hips.z, L = Math.hypot(ux, uz) || 1;
        const dw = Object.entries(skDirs).map(([k, d]) => ({ b: idx[B('Skirt' + k)], w: Math.pow(Math.max(0, (ux * d[0] + uz * d[1]) / L), 2) })).filter((c) => c.w > 1e-3);
        cand = cand.map((c) => ({ b: c.b, w: (c.w / tot) * (1 - sk) })).concat(dw.map((c) => ({ b: c.b, w: c.w * sk })));
        cand = cand.sort((a, b) => b.w - a.w).slice(0, 4); tot = cand.reduce((a, c) => a + c.w, 0);
      }
    }
    cand.forEach((c, k) => { si[4 * i + k] = c.b; sw[4 * i + k] = c.w / tot; });
  }

  if (process.env.DUMP_WEIGHTS) fs.writeFileSync(process.env.DUMP_WEIGHTS, JSON.stringify({ pos: Array.from(pos), si: Array.from(si), sw: Array.from(sw), rgb: Array.from({ length: n }, (_, i) => rgbOf(i)), names: bones.map((b) => b.name) })); // gỡ lỗi: xuất trọng số để vẽ
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(src.nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(src.uv, 2));
  geo.setAttribute('_mat', new THREE.Float32BufferAttribute(new Float32Array(n).fill(5), 1)); // 5: không tô vệt cọ giả lên texture thật
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  // Cắt các tam giác nối vũ khí với thân (lưới liền khối: cán búa dính vai/cổ nên kéo thành dải khi xoay mạnh). Giữ lại vùng quanh bàn tay để cổ tay không hở.
  let index = src.index;
  if (cfg.cutMixed) {
    const keep = cfg.cutMixed.keep * s; let cut = 0; const out = [];
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2], k = (isHard[a] > 0) + (isHard[b] > 0) + (isHard[c] > 0);
      if (k > 0 && k < 3) { const hp = W[bones[(isHard[a] || isHard[b] || isHard[c]) - 1].name.replace('Bone_', '')]; const cx = (pos[3 * a] + pos[3 * b] + pos[3 * c]) / 3 - hp.x, cy = (pos[3 * a + 1] + pos[3 * b + 1] + pos[3 * c + 1]) / 3 - hp.y, cz = (pos[3 * a + 2] + pos[3 * b + 2] + pos[3 * c + 2]) / 3 - hp.z; if (Math.hypot(cx, cy, cz) > keep) { cut++; continue; } }
      out.push(a, b, c);
    }
    index = out; console.log(`  cắt ${cut} tam giác nối vũ khí–thân`);
  }
  if (cfg.maxEdge) { // tam giác sợi chỉ nối hai chỗ xa nhau (lỗi lưới quét): bỏ
    const lim = (cfg.maxEdge * s) ** 2, e = (a, b) => (pos[3 * a] - pos[3 * b]) ** 2 + (pos[3 * a + 1] - pos[3 * b + 1]) ** 2 + (pos[3 * a + 2] - pos[3 * b + 2]) ** 2; const out = [];
    for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; if (e(a, b) > lim || e(b, c) > lim || e(a, c) > lim) continue; out.push(a, b, c); }
    console.log(`  bỏ ${(index.length - out.length) / 3} tam giác quá dài`); index = out;
  }
  { // bỏ mảnh vụn rời (sau khi cắt, vài cụm tam giác nhỏ mất liên kết sẽ bay lơ lửng khi vung mạnh)
    const par = Int32Array.from({ length: n }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const wid = new Map(), key = (i) => `${Math.round(pos[3 * i] * 1e4)},${Math.round(pos[3 * i + 1] * 1e4)},${Math.round(pos[3 * i + 2] * 1e4)}`; // gộp đỉnh trùng vị trí (lưới chưa hàn)
    const rep = new Int32Array(n); for (let i = 0; i < n; i++) { const k = key(i); if (!wid.has(k)) wid.set(k, i); rep[i] = wid.get(k); }
    for (let t = 0; t < index.length; t += 3) { const a = f(rep[index[t]]), b = f(rep[index[t + 1]]), c = f(rep[index[t + 2]]); if (a !== b) par[a] = b; if (f(b) !== f(c)) par[f(c)] = f(b); }
    const cnt = new Map(); for (let t = 0; t < index.length; t += 3) { const r = f(rep[index[t]]); cnt.set(r, (cnt.get(r) || 0) + 1); }
    const minC = cfg.minComponent ?? 60, out = []; let dropped = 0, comps = 0;
    for (let t = 0; t < index.length; t += 3) { const r = f(rep[index[t]]); if (cnt.get(r) < minC) { dropped++; continue; } out.push(index[t], index[t + 1], index[t + 2]); }
    comps = [...cnt.values()].filter((c) => c >= minC).length; index = out; console.log(`  bỏ ${dropped} tam giác ở các mảnh rời nhỏ (< ${minC} tam giác); còn ${comps} khối`);
  }
  geo.setIndex(index);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const body = new THREE.MeshStandardMaterial({ name: `${id}_body`, color: 0xffffff, roughness: 1, metalness: 1 });
  const mesh = new THREE.SkinnedMesh(geo, body);
  mesh.name = `${id}_body`; mesh.frustumCulled = false;
  root.add(mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.userData = { heroId: id, unit: 'm', facing: '+Z', name: def.name, height: H };

  const ctx = { H, legLen: W.ThighL.y - W.FootL.y, hipsRest: [W.Hips.x, W.Hips.y, W.Hips.z] };
  const clips = buildClips(ctx, bones, def.anim || {});
  const scene = new THREE.Scene();
  for (const ch of root.children.slice()) scene.add(ch);
  const glb0 = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, animations: Object.values(clips), onlyVisible: false }));

  // —— Ghép texture vào file xuất ——
  const { json, bin } = parseGlb(glb0);
  let off = align4(bin.length); const parts = [bin, Buffer.alloc(off - bin.length)];
  json.images = []; json.textures = []; json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  const addTex = (imgIdx) => {
    const data = cfg.texMax ? shrinkJpeg(src.imgs[imgIdx], cfg.texMax) : src.imgs[imgIdx]; const bv = json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: data.length }) - 1;
    json.images.push({ bufferView: bv, mimeType: 'image/jpeg' }); json.textures.push({ sampler: 0, source: json.images.length - 1 });
    parts.push(data, Buffer.alloc(align4(data.length) - data.length)); off += align4(data.length);
    return json.textures.length - 1;
  };
  const m = json.materials[0];
  m.pbrMetallicRoughness = { baseColorFactor: [1, 1, 1, 1], metallicFactor: 1, roughnessFactor: 1 };
  const refs = src.refs;
  if (refs.base != null) m.pbrMetallicRoughness.baseColorTexture = { index: addTex(refs.base) };
  if (refs.mr != null) m.pbrMetallicRoughness.metallicRoughnessTexture = { index: addTex(refs.mr) };
  if (refs.normal != null) m.normalTexture = { index: addTex(refs.normal) };
  m.doubleSided = true;
  json.buffers[0].byteLength = off;
  const glb = packGlb(json, Buffer.concat(parts));

  const dir = path.join(outRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.glb`), glb);
  const art = {
    model: `${id}.glb`, scale: 100, height: Math.round(H * 100), runRefSpeed: ctx.runRefSpeed,
    hitTime: def.hitTime || { Attack1: 0.28, Attack2: 0.28 },
    attach: { weapon_tip: 'Bone_HandR_Tip', head: 'Bone_Head', ...(def.attach || {}) },
    rim: def.rim || def.palette?.[1] || '#ffffff', palette: def.palette || [],
    clips: Object.keys(clips), generator: 'tools/modelgen/import_fused.mjs', source: path.basename(cfg.file), ...(cfg.portrait && { portrait: cfg.portrait }),
  };
  fs.writeFileSync(path.join(dir, 'hero.art.json'), JSON.stringify(art, null, 2) + '\n');
  console.log(`${id.padEnd(10)} nhập ${path.basename(cfg.file)}: tris ${index.length / 3}, xương ${bones.length}, ${Math.round(glb.length / 1024)} KB, hệ số co ${s.toFixed(2)}, runRef ${ctx.runRefSpeed}`);
  return { id, tris: index.length / 3, bones: bones.length, kb: Math.round(glb.length / 1024), mats: 1, runRef: ctx.runRefSpeed };
}
