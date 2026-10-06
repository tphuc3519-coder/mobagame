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
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
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

/** Đọc mesh: bỏ texture khỏi bản đưa cho GLTFLoader (Node không giải mã được ảnh), lấy vị trí/pháp tuyến/uv đã giải nén, thế giới, float.
 *  File có nhiều vật liệu (vd thân / đầu / mắt, mỗi vật liệu một primitive): gộp thành một lưới, `mat[i]` = vật liệu của đỉnh i,
 *  `mats[k]` = { name, refs, baseImg } của từng vật liệu (refs/baseImg/matName ở gốc là của vật liệu đầu tiên, như bản một vật liệu). */
export async function readMesh(file) {
  const { json, bin } = parseGlb(fs.readFileSync(file));
  const imgs = (json.images || []).map((im) => { const bv = json.bufferViews[im.bufferView]; return Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); });
  const tex = (t) => t && t.index;
  const mats = json.materials.map((mat) => {
    const refs = { base: tex(mat.pbrMetallicRoughness?.baseColorTexture), mr: tex(mat.pbrMetallicRoughness?.metallicRoughnessTexture), normal: tex(mat.normalTexture) };
    const tt = (mat.pbrMetallicRoughness?.baseColorTexture || mat.normalTexture)?.extensions?.KHR_texture_transform || { offset: [0, 0], scale: [1, 1] };
    return { name: mat.name || 'm', refs, tt, baseImg: json.textures?.[refs.base]?.source };
  });
  const j2 = JSON.parse(JSON.stringify(json)); delete j2.textures; delete j2.images; delete j2.samplers;
  j2.materials = mats.map((m) => ({ name: m.name }));
  const glb = packGlb(j2, Buffer.from(bin));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const meshes = []; gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const total = meshes.reduce((a, m) => a + m.geometry.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), mat = new Uint8Array(total), index = [], v = new THREE.Vector3();
  let base = 0;
  for (const mesh of meshes) {
    const k = Math.max(0, mats.findIndex((m) => m.name === mesh.material.name)), tt = mats[k].tt;
    const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const j = base + i;
      v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(mesh.matrixWorld); pos.set([v.x, v.y, v.z], j * 3);
      nor.set([N.getX(i), N.getY(i), N.getZ(i)], j * 3);
      uv.set([U.getX(i) * tt.scale[0] + tt.offset[0], U.getY(i) * tt.scale[1] + tt.offset[1]], j * 2); // khôi phục uv thật (gltfpack nén uv rồi bù bằng KHR_texture_transform)
      mat[j] = k;
    }
    for (const t of g.index.array) index.push(base + t);
    base += P.count;
  }
  return { pos, nor, uv, mat, index, imgs, mats, texSource: (json.textures || []).map((t) => t.source), refs: mats[0].refs, baseImg: mats[0].baseImg, matName: mats[0].name };
}

/** Chạy thử mọi clip và cắt các tam giác bị kéo giãn thành "mảnh vụn" (cạnh dài ra quá nhiều so với tư thế gốc, hoặc có đỉnh bay quá xa thân).
 *  Đây là lỗi của trọng số xương trên lưới liền khối: tam giác nối hai vùng có trọng số khác nhau bị kéo thành dải khi xoay mạnh.
 *  Sau khi cắt, bỏ nốt các cụm tam giác nhỏ rời ra (trừ cụm chứa vũ khí). cfg: { ratio, slack, samples, minComponent, report }. */
function deshard(mesh, geo, root, clips, pos, index0, cfg, isHard) {
  const { ratio = 2.2, slack = 0.05, samples = 16, minComponent = 150 } = cfg, n = pos.length / 3, v = new THREE.Vector3();
  const mixer = new THREE.AnimationMixer(root), cur = new Float32Array(n * 3);
  const tris = index0.length / 3, bad = new Uint8Array(tris), maxStretch = new Float32Array(tris);
  const bind = (a, b) => Math.hypot(pos[3 * a] - pos[3 * b], pos[3 * a + 1] - pos[3 * b + 1], pos[3 * a + 2] - pos[3 * b + 2]);
  const bl = new Float32Array(tris * 3);
  for (let t = 0; t < tris; t++) { const a = index0[3 * t], b = index0[3 * t + 1], c = index0[3 * t + 2]; bl[3 * t] = bind(a, b); bl[3 * t + 1] = bind(b, c); bl[3 * t + 2] = bind(c, a); }
  const sample = () => {
    root.updateMatrixWorld(true); mesh.skeleton.update();
    for (let i = 0; i < n; i++) { v.set(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); mesh.applyBoneTransform(i, v); cur[3 * i] = v.x; cur[3 * i + 1] = v.y; cur[3 * i + 2] = v.z; }
    for (let t = 0; t < tris; t++) {
      if (bad[t] || isHard[index0[3 * t]] || isHard[index0[3 * t + 1]] || isHard[index0[3 * t + 2]]) continue; // tam giác chạm vũ khí (đã xử lý ở cutMixed): không cắt để kiếm không rời tay
      const a = index0[3 * t], b = index0[3 * t + 1], c = index0[3 * t + 2], e = [[a, b], [b, c], [c, a]];
      for (let k = 0; k < 3; k++) {
        const [p, q] = e[k], d = Math.hypot(cur[3 * p] - cur[3 * q], cur[3 * p + 1] - cur[3 * q + 1], cur[3 * p + 2] - cur[3 * q + 2]), lim = bl[3 * t + k] * ratio + slack;
        if (d > maxStretch[t]) maxStretch[t] = d;
        if (d > lim) { bad[t] = 1; break; }
      }
    }
  };
  for (const clip of Object.values(clips)) {
    mixer.stopAllAction(); const act = mixer.clipAction(clip); act.play();
    for (let i = 0; i <= samples; i++) { mixer.setTime((clip.duration * i) / samples); sample(); }
  }
  mixer.stopAllAction(); mixer.setTime(0); root.updateMatrixWorld(true);
  let out = []; for (let t = 0; t < tris; t++) if (!bad[t]) out.push(index0[3 * t], index0[3 * t + 1], index0[3 * t + 2]);
  const cutN = tris - out.length / 3;
  // bỏ cụm tam giác nhỏ rời ra (vị trí trùng thì coi như một đỉnh); cụm có đỉnh gắn cứng vào vũ khí thì giữ
  const par = Int32Array.from({ length: n }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const key = (i) => `${Math.round(pos[3 * i] * 1e4)},${Math.round(pos[3 * i + 1] * 1e4)},${Math.round(pos[3 * i + 2] * 1e4)}`, wid = new Map(), rep = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = key(i); if (!wid.has(k)) wid.set(k, i); rep[i] = wid.get(k); }
  for (let t = 0; t < out.length; t += 3) { const a = f(rep[out[t]]), b = f(rep[out[t + 1]]), c = f(rep[out[t + 2]]); if (a !== b) par[a] = b; if (f(b) !== f(c)) par[f(c)] = f(b); }
  const cnt = new Map(), keep = new Set();
  for (let t = 0; t < out.length; t += 3) { const r = f(rep[out[t]]); cnt.set(r, (cnt.get(r) || 0) + 1); if (isHard[out[t]] || isHard[out[t + 1]] || isHard[out[t + 2]]) keep.add(r); }
  const fin = []; let drop = 0;
  for (let t = 0; t < out.length; t += 3) { const r = f(rep[out[t]]); if (cnt.get(r) < minComponent && !keep.has(r)) { drop++; continue; } fin.push(out[t], out[t + 1], out[t + 2]); }
  geo.setIndex(fin);
  console.log(`  deshard: cắt ${cutN} tam giác bị kéo giãn + bỏ ${drop} tam giác ở cụm rời nhỏ (< ${minComponent}); còn ${fin.length / 3}`);
  return fin;
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

/** Giảm tam giác bằng meshoptimizer (giữ biên uv/pháp tuyến), rồi dồn lại đỉnh. cfg: { tris, error, flags }.
 *  Nhiều vật liệu: giảm riêng từng vật liệu để không gộp đỉnh qua ranh giới vật liệu. `tris` là số (chia theo tỉ lệ số tam giác
 *  từng vật liệu) hoặc { tênVậtLiệu: số } (vật liệu không có tên trong bảng thì giữ nguyên). */
async function simplifyMesh(src, { tris, error = 0.02, flags = [] }) {
  await MeshoptSimplifier.ready;
  const n = src.pos.length / 3, attr = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) { attr.set([src.uv[2 * i], src.uv[2 * i + 1]], i * 5); attr.set([src.nor[3 * i], src.nor[3 * i + 1], src.nor[3 * i + 2]], i * 5 + 2); }
  const before = src.index.length / 3, mats = src.mats || [{ name: 'm' }], mat = src.mat || new Uint8Array(n);
  const parts = mats.map(() => []); for (let t = 0; t < src.index.length; t += 3) parts[mat[src.index[t]]].push(src.index[t], src.index[t + 1], src.index[t + 2]);
  const out = [];
  mats.forEach((m, k) => {
    const idx = parts[k]; if (!idx.length) return;
    const target = typeof tris === 'number' ? Math.round((tris * idx.length) / src.index.length) : tris[m.name];
    if (target == null || target * 3 >= idx.length) { out.push(...idx); return; }
    const [res] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(idx), src.pos, 3, attr, 5, [4, 4, 0.6, 0.6, 0.6], null, target * 3, error, flags);
    if (mats.length > 1) console.log(`  giảm ${m.name}: ${idx.length / 3} → ${res.length / 3} tam giác`);
    for (const v of res) out.push(v);
  });
  const remap = new Int32Array(n).fill(-1); let m = 0; for (const v of out) if (remap[v] < 0) remap[v] = m++;
  const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), uv = new Float32Array(m * 2), mat2 = new Uint8Array(m);
  for (let i = 0; i < n; i++) { const j = remap[i]; if (j < 0) continue; pos.set(src.pos.subarray(3 * i, 3 * i + 3), 3 * j); nor.set(src.nor.subarray(3 * i, 3 * i + 3), 3 * j); uv.set(src.uv.subarray(2 * i, 2 * i + 2), 2 * j); mat2[j] = mat[i]; }
  src.pos = pos; src.nor = nor; src.uv = uv; src.mat = mat2; src.index = out.map((v) => remap[v]);
  console.log(`  giảm ${before} → ${src.index.length / 3} tam giác, ${n} → ${m} đỉnh`);
}

/** Hàn đỉnh trùng vị trí: rep[i] = chỉ số điểm hàn (0..R-1), reps[r] = một đỉnh đại diện. */
function weld(pos, n) {
  const key = (i) => `${Math.round(pos[3 * i] * 1e5)},${Math.round(pos[3 * i + 1] * 1e5)},${Math.round(pos[3 * i + 2] * 1e5)}`, m = new Map(), rep = new Int32Array(n), reps = [];
  for (let i = 0; i < n; i++) { const k = key(i); let r = m.get(k); if (r == null) { r = reps.length; reps.push(i); m.set(k, r); } rep[i] = r; }
  return { rep, reps };
}

/** Gán nhãn vũ khí theo vùng rồi nhân đôi đỉnh ở ranh giới nhãn.
 *  vlab0: nhãn thô theo đỉnh (0 thân, >0 vũ khí). cfg: { chartMin, chartHi, chartLo, passes, island }.
 *  Trả về mảng mới (pos/nor/uv/index), nhãn từng đỉnh và chỉ số điểm hàn. */
function splitByLabel(pos, nor, uv, index, vlab0, cfg, mat = new Uint8Array(pos.length / 3), core = null) {
  const n = pos.length / 3, T = index.length / 3, { rep } = weld(pos, n);
  const tl = new Int16Array(T);
  for (let t = 0; t < T; t++) { const a = vlab0[index[3 * t]], b = vlab0[index[3 * t + 1]], c = vlab0[index[3 * t + 2]]; tl[t] = a && (a === b || a === c) ? a : b && b === c ? b : 0; }
  const all3 = (arr, t) => arr && arr[index[3 * t]] && arr[index[3 * t + 1]] && arr[index[3 * t + 2]];
  const keep = Uint8Array.from({ length: T }, (_, t) => (tl[t] && all3(core, t) ? 1 : 0)); // tam giác lõi vũ khí: giữ nhãn qua mọi bước dọn
  const before = tl.reduce((q, l) => q + (l > 0), 0);
  // 1) bỏ phiếu theo mảng uv: mảng lớn nằm phần lớn trên vũ khí thì cả mảng là vũ khí (và ngược lại)
  const par = Int32Array.from({ length: n }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < T; t++) { const a = f(index[3 * t]), b = f(index[3 * t + 1]); if (a !== b) par[a] = b; const c = f(index[3 * t + 2]), d = f(b); if (c !== d) par[c] = d; }
  const ch = new Map();
  for (let t = 0; t < T; t++) { const r = f(index[3 * t]); let c = ch.get(r); if (!c) ch.set(r, (c = { n: 0, l: new Map() })); c.n++; c.l.set(tl[t], (c.l.get(tl[t]) || 0) + 1); }
  const chartMin = cfg.chartMin ?? 6, hi = cfg.chartHi ?? 0.55, lo = cfg.chartLo ?? 0.45;
  for (let t = 0; t < T; t++) {
    const c = ch.get(f(index[3 * t])); if (c.n < chartMin) continue;
    let bl = 0, bc = 0; for (const [l, k] of c.l) if (l && k > bc) { bl = l; bc = k; }
    if (bc / c.n >= hi) tl[t] = bl; else if (bc / c.n <= lo && tl[t] && !keep[t]) tl[t] = 0;
  }
  // 2) lọc đa số theo hàng xóm qua cạnh (đã hàn) để ranh giới gọn, không lởm chởm
  const ek = (a, b) => (a < b ? a * 4194304 + b : b * 4194304 + a), edges = new Map();
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) { const e = ek(rep[index[3 * t + k]], rep[index[3 * t + (k + 1) % 3]]); const l = edges.get(e); if (l) l.push(t); else edges.set(e, [t]); }
  const nbr = Array.from({ length: T }, () => []);
  for (const l of edges.values()) for (const a of l) for (const b of l) if (a !== b) nbr[a].push(b);
  for (let pass = 0; pass < (cfg.passes ?? 4); pass++) {
    const nt = tl.slice();
    for (let t = 0; t < T; t++) { if (keep[t]) continue; const cnt = new Map(); for (const q of nbr[t]) cnt.set(tl[q], (cnt.get(tl[q]) || 0) + 1); for (const [l, k] of cnt) if (l !== tl[t] && k >= 2 && k > (cnt.get(tl[t]) || 0)) nt[t] = l; }
    tl.set(nt);
  }
  // 3) đảo nhỏ: cụm vũ khí lẻ loi → thân; lỗ thân nhỏ nằm giữa vũ khí → vũ khí
  const island = cfg.island ?? 40, seen = new Uint8Array(T);
  for (let t0 = 0; t0 < T; t0++) {
    if (seen[t0]) continue; const L = tl[t0], comp = [t0], border = new Set(); seen[t0] = 1;
    for (let k = 0; k < comp.length; k++) for (const q of nbr[comp[k]]) { if (tl[q] !== L) { border.add(tl[q]); continue; } if (!seen[q]) { seen[q] = 1; comp.push(q); } }
    if (comp.length >= island) continue;
    if (L && border.size) { if (comp.filter((t) => keep[t]).length * 2 < comp.length) for (const t of comp) tl[t] = 0; } // đảo vũ khí nằm hẳn trong thân vũ khí (khúc cán giữa 2 vòng đai) thì giữ
    else if (!L && border.size === 1) { const b = [...border][0]; for (const t of comp) tl[t] = b; }
  }
  // 4) nhân đôi đỉnh dùng chung bởi tam giác khác nhãn
  const vl = new Int16Array(n).fill(-1), dup = new Map(), P = Array.from(pos), N = Array.from(nor), U = Array.from(uv), R = Array.from(rep), M = Array.from(mat), out = index.slice(), VL = [];
  let m = n, nd = 0;
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = index[3 * t + k], L = tl[t];
    if (vl[v] < 0) { vl[v] = L; continue; }
    if (vl[v] === L) continue;
    const key = v * 64 + L; let d = dup.get(key);
    if (d == null) { d = m++; nd++; dup.set(key, d); P.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); N.push(nor[3 * v], nor[3 * v + 1], nor[3 * v + 2]); U.push(uv[2 * v], uv[2 * v + 1]); R.push(rep[v]); M.push(mat[v]); VL[d - n] = L; }
    out[3 * t + k] = d;
  }
  const vlab = new Int16Array(m); for (let i = 0; i < n; i++) vlab[i] = Math.max(0, vl[i]); for (let i = n; i < m; i++) vlab[i] = VL[i - n];
  const after = tl.reduce((q, l) => q + (l > 0), 0), reps = []; const repA = Int32Array.from(R); for (let i = 0; i < m; i++) if (reps[repA[i]] == null) reps[repA[i]] = i;
  console.log(`  tách vũ khí theo vùng: ${before} → ${after} tam giác vũ khí, nhân đôi ${nd} đỉnh ở ranh giới`);
  return { n: m, pos: Float32Array.from(P), nor: Float32Array.from(N), uv: Float32Array.from(U), mat: Uint8Array.from(M), index: out, vlab, rep: repA, reps };
}

/** Báo cáo độ giãn lưới theo clip (STRETCH=1): số tam giác có cạnh dài ra > 1.5× / 2× so với tư thế gốc, và xương chính của chúng. */
function stretchReport(mesh, root, clips, pos, index, names) {
  const n = pos.length / 3, v = new THREE.Vector3(), cur = new Float32Array(n * 3), T = index.length / 3, mixer = new THREE.AnimationMixer(root);
  const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  const L = (P, a, b) => Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
  for (const clip of Object.values(clips)) {
    const worst = new Float32Array(T);
    mixer.stopAllAction(); mixer.clipAction(clip).play();
    for (let k = 0; k <= 30; k++) {
      mixer.setTime((clip.duration * k) / 30); root.updateMatrixWorld(true); mesh.skeleton.update();
      for (let i = 0; i < n; i++) { v.set(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); mesh.applyBoneTransform(i, v); cur[3 * i] = v.x; cur[3 * i + 1] = v.y; cur[3 * i + 2] = v.z; }
      for (let t = 0; t < T; t++) for (let e = 0; e < 3; e++) { const a = index[3 * t + e], b = index[3 * t + (e + 1) % 3], r = L(cur, a, b) / Math.max(1e-4, L(pos, a, b) + 0.01); if (r > worst[t]) worst[t] = r; }
    }
    const bad = {}; let n15 = 0, n2 = 0;
    for (let t = 0; t < T; t++) { if (worst[t] > 1.5) n15++; if (worst[t] > 2) { n2++; const a = index[3 * t]; let bi = 0, bw = 0; for (let k = 0; k < 4; k++) if (sw.getComponent(a, k) > bw) { bw = sw.getComponent(a, k); bi = si.getComponent(a, k); } const nm = names[bi].replace('Bone_', ''); bad[nm] = (bad[nm] || 0) + 1; } }
    console.log(`  giãn ${clip.name.padEnd(9)} >1.5×: ${String(n15).padStart(4)}  >2×: ${String(n2).padStart(4)}  ${Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => k + ':' + c).join(' ')}`);
  }
  mixer.stopAllAction(); mixer.setTime(0); root.updateMatrixWorld(true);
}


/** Sắp lại tam giác (bộ đệm đỉnh) và thứ tự đỉnh theo từng nhóm vật liệu để bộ nén meshopt nén tốt hơn; hình không đổi. */
async function reorderForCompression(geo) {
  await MeshoptEncoder.ready;
  const idx = geo.index.array, n = geo.attributes.position.count, groups = geo.groups.length ? geo.groups : [{ start: 0, count: idx.length }];
  const out = new Uint32Array(idx.length), pairs = []; let next = 0;
  for (const g of groups) {
    const sub = Uint32Array.from(idx.subarray(g.start, g.start + g.count));
    const [remap, used] = MeshoptEncoder.reorderMesh(sub, true, true); // sub: tam giác đã sắp, chỉ số đỉnh mới cục bộ; remap: đỉnh cũ → mới (0xffffffff = không dùng)
    for (let v = 0; v < remap.length; v++) if (remap[v] !== 0xffffffff) pairs.push(v, next + remap[v]);
    for (let i = 0; i < sub.length; i++) out[g.start + i] = next + sub[i];
    next += used;
  }
  for (const [name, a] of Object.entries(geo.attributes)) {
    const it = a.itemSize, arr = new a.array.constructor(next * it);
    for (let k = 0; k < pairs.length; k += 2) for (let c = 0; c < it; c++) arr[pairs[k + 1] * it + c] = a.array[pairs[k] * it + c];
    geo.setAttribute(name, new THREE.BufferAttribute(arr, it, a.normalized));
  }
  geo.setIndex(new THREE.BufferAttribute(next > 65535 ? out : Uint16Array.from(out), 1));
  console.log(`  sắp lại cho nén: ${n} → ${next} đỉnh`);
}

/** Nén lưới, xương, clip trong GLB bằng EXT_meshopt_compression (game đã có MeshoptDecoder trong assets.js); ảnh JPEG giữ nguyên.
 *  Mỗi bufferView nén trỏ tới bộ đệm "fallback" rỗng (buffer 1), dữ liệu nén nằm trong buffer 0 như file gltfpack. */
async function compressGlb(glb) {
  await MeshoptEncoder.ready;
  const { json, bin } = parseGlb(glb);
  const CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, CN = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const plan = new Map(); // bufferView → { mode, stride, count }
  const mark = (ai, mode) => {
    if (ai == null) return; const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], el = CS[a.componentType] * CN[a.type], stride = bv.byteStride || el;
    if ((a.byteOffset || 0) !== 0 || plan.has(a.bufferView)) return;
    if (mode === 'ATTRIBUTES' && stride % 4 !== 0) return;
    if (mode === 'TRIANGLES' && (a.count % 3 !== 0 || !(stride === 2 || stride === 4))) return;
    plan.set(a.bufferView, { mode, stride, count: a.count });
  };
  for (const m of json.meshes || []) for (const p of m.primitives) { for (const ai of Object.values(p.attributes)) mark(ai, 'ATTRIBUTES'); mark(p.indices, 'TRIANGLES'); }
  for (const sk of json.skins || []) mark(sk.inverseBindMatrices, 'ATTRIBUTES');
  for (const an of json.animations || []) for (const sm of an.samplers) { mark(sm.input, 'ATTRIBUTES'); mark(sm.output, 'ATTRIBUTES'); }
  const parts = []; let off = 0, fb = 0, raw = 0, packed = 0;
  const put = (buf) => { const o = off; parts.push(buf, Buffer.alloc(align4(buf.length) - buf.length)); off += align4(buf.length); return o; };
  json.bufferViews.forEach((bv, i) => {
    const src = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength), p = plan.get(i);
    if (!p) { bv.byteOffset = put(Buffer.from(src)); bv.buffer = 0; return; }
    const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(new Uint8Array(src.buffer, src.byteOffset, p.count * p.stride), p.count, p.stride, p.mode));
    raw += p.count * p.stride; packed += enc.length;
    bv.extensions = { EXT_meshopt_compression: { buffer: 0, byteOffset: put(enc), byteLength: enc.length, byteStride: p.stride, mode: p.mode, count: p.count } };
    bv.buffer = 1; bv.byteOffset = fb; fb += align4(bv.byteLength);
  });
  json.buffers = [{ byteLength: off }, { byteLength: fb, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  for (const k of ['extensionsUsed', 'extensionsRequired']) json[k] = [...new Set([...(json[k] || []), 'EXT_meshopt_compression'])];
  console.log(`  nén meshopt: lưới/xương/clip ${Math.round(raw / 1024)} KB → ${Math.round(packed / 1024)} KB`);
  return packGlb(json, Buffer.concat(parts));
}

/** Dựng một bản model từ file nhập. cfg = def.import (bản trong trận), hoặc def.import ghép def.import.showcase (bản trưng bày ở sảnh). */
async function buildFused(id, def, cfg, here) {
  const src = await readMesh(path.resolve(here, cfg.file));
  if (cfg.simplify) await simplifyMesh(src, cfg.simplify);
  const n = src.pos.length / 3;
  if (cfg.morph) { // nắn hình lưới gốc trước khi gắn xương (sửa lỗi sẵn có trong file, vd tóc bị cắt đôi theo mặt phẳng ngang): toạ độ file gốc tương đối thân
    const tx = new Map(), cX = cfg.centerX ?? 0, cZ = cfg.centerZ ?? 0;
    const rgbAt = (i) => { const k = src.mat[i], m = src.mats[k]; if (m.refs.base == null) return [128, 128, 128]; if (!tx.has(k)) tx.set(k, jpeg.decode(src.imgs[src.texSource[m.refs.base]], { useTArray: true })); const t = tx.get(k), u = src.uv[2 * i] - Math.floor(src.uv[2 * i]), v = src.uv[2 * i + 1] - Math.floor(src.uv[2 * i + 1]), o = 4 * (Math.min(t.height - 1, Math.floor(v * t.height)) * t.width + Math.min(t.width - 1, Math.floor(u * t.width))); return [t.data[o], t.data[o + 1], t.data[o + 2]]; };
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const r = cfg.morph({ x: src.pos[3 * i] - cX, y: src.pos[3 * i + 1], z: src.pos[3 * i + 2] - cZ, mat: src.mats[src.mat[i]].name, rgb: rgbAt(i) }); if (!r) continue;
      src.pos[3 * i] = r.x + cX; src.pos[3 * i + 1] = r.y; src.pos[3 * i + 2] = r.z + cZ; moved++;
    }
    console.log(`  nắn hình: ${moved} đỉnh`);
  }
  // màu texture tại từng đỉnh (0..255 sRGB): để phân biệt cây búa (gỗ/kim loại tối) với da, tóc, vải sát bên khi gắn xương
  const texCache = new Map(), texOf = (k) => { if (!texCache.has(k)) { const m = src.mats[k]; texCache.set(k, m.refs.base != null ? jpeg.decode(src.imgs[src.texSource[m.refs.base]], { useTArray: true }) : null); } return texCache.get(k); };
  const rgbOf = (i) => { const tex = texOf(src.mat[i]); if (!tex) return [128, 128, 128]; const u = src.uv[2 * i] - Math.floor(src.uv[2 * i]), v = src.uv[2 * i + 1] - Math.floor(src.uv[2 * i + 1]); const x = Math.min(tex.width - 1, Math.floor(u * tex.width)), y = Math.min(tex.height - 1, Math.floor(v * tex.height)); const o = 4 * (y * tex.width + x); return [tex.data[o], tex.data[o + 1], tex.data[o + 2]]; };
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
  ].map(([bone, a, b, r, end]) => ({ bone: cfg.merge?.[bone] ?? bone, a: w3(a), b: end || w3(b), r: r * K * (cfg.radii?.[bone] ?? 1) * s })); // merge: gộp vùng của xương này vào xương khác (khối vỏ cứng, vd mũ lặn liền ngực)
  // Vũ khí liền khối với thân: coi như một "xương phụ" dạng đoạn thẳng gắn vào tay phải (đơn vị file gốc, x tương đối thân)
  for (const w of [].concat(cfg.weapon || [])) segs.push({ bone: w.bone || 'HandR', a: w.a.map((v) => v * s), b: w.b.map((v) => v * s), r: w.r * s, sig: (w.soft ?? 0.01) * s, cut: (w.cut ?? 0.025) * s, hard: (w.hard ?? 0.012) * s, test: w.test }); // sig nhỏ: vũ khí ăn trọng số gắt, không kéo vải/tóc sát bên // toạ độ vũ khí cũng tương đối thân (đã trừ centerX/centerZ)
  const sig = (cfg.softness ?? 0.02) * K * s;
  const hand = idx[B('HandR')];
  // —— Tách vũ khí theo VÙNG chứ không theo từng đỉnh ——
  // Lưới AI là một khối liền: cán búa dính vào mặt/vai, gậy dính vào găng tay. Gắn từng đỉnh rồi xoá tam giác lẫn lộn (cách cũ) làm thủng mặt, thủng thân.
  // Cách mới: nhãn thô theo đỉnh → nhãn tam giác → bỏ phiếu theo mảng uv (chart) và theo hàng xóm → xoá đảo nhỏ; rồi NHÂN ĐÔI đỉnh nằm trên ranh giới
  // để hai bên tách ra khi vung (không xoá tam giác nào, không có tam giác nối tay–thân bị kéo thành dải).
  const wsegs = segs.filter((sg) => sg.cut != null), bsegs = segs.filter((sg) => sg.cut == null);
  const vlab0 = new Int16Array(n); // 0 = thân, b+1 = gắn cứng vào xương b
  // core: đỉnh nằm hẳn trong thân vũ khí (≤ r) và qua phép thử màu `core` của đoạn (vd không phải da) → bước dọn ranh giới không được trả
  // về thân. Trước đây các khúc cán búa giữa những vòng đai là "đảo vũ khí nhỏ" nên bị trả về thân → khi vung, cán đứt thành nhiều khúc.
  const core = new Uint8Array(n), needRgb = wsegs.some((sg) => sg.test || sg.core);
  for (let i = 0; i < n; i++) {
    if (isStaff(src.pos[3 * i])) { vlab0[i] = hand + 1; continue; }
    const p = [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]], rgb = needRgb ? rgbOf(i) : null;
    for (const sg of wsegs) {
      const d = segDist(p, sg.a, sg.b) - sg.r; if (d > sg.hard || (sg.test && !sg.test(rgb))) continue;
      if (!vlab0[i]) vlab0[i] = idx[B(sg.bone)] + 1;
      if (d <= 0 && (!sg.core || sg.core(rgb))) core[i] = 1;
    }
  }
  const split = splitByLabel(pos, src.nor, src.uv, src.index, vlab0, cfg.split || {}, src.mat, core);
  const n2 = split.n, vlab = split.vlab, rep = split.rep, index0 = split.index;
  src.pos = null; src.nor = split.nor; src.uv = split.uv; src.mat = split.mat;
  const posN = split.pos;
  // —— Trọng số thân: tính theo điểm đã hàn (bản sao ở đường may uv nhận y hệt trọng số → không nứt), rồi làm mượt trên bề mặt lưới ——
  const NB = bones.length, R = split.reps, Wd = new Float32Array(R.length * NB);
  // cfg.allow: { tênVậtLiệu: [xương…] } — đỉnh của vật liệu đó chỉ nhận trọng số từ các xương liệt kê (vd tóc dài chỉ theo đầu/cổ/ngực, không dính tay)
  const allowOf = src.mats.map((m) => cfg.allow?.[m.name] && new Set(cfg.allow[m.name].map((b) => cfg.merge?.[b] ?? b)));
  // cfg.hair: tóc dài không có xương riêng (thường nằm ở hai vật liệu: phần trên chung với đầu, lọn dưới chung với áo) → trọng số CHỈ theo độ cao
  // dọc chuỗi xương thân, cùng một hàm cho mọi vật liệu: không còn đường gãy ngang giữa phần theo đầu và phần theo ngực, lọn dưới không bị
  // tay kéo xoè ra. { chain: [[xương, y], …] từ trên xuống (đơn vị file gốc), pick({ x, y, z, mat, rgb }) → đỉnh có phải tóc (toạ độ file gốc, tương đối thân) }
  const HC = cfg.hair, hairW = (y) => {
    const ch = HC.chain, out = new Float32Array(NB), sm = (t) => t * t * (3 - 2 * t);
    if (y >= ch[0][1]) { out[idx[B(ch[0][0])]] = 1; return out; }
    for (let k = 1; k < ch.length; k++) if (y >= ch[k][1]) { const t = sm((y - ch[k][1]) / (ch[k - 1][1] - ch[k][1])); out[idx[B(ch[k - 1][0])]] += t; out[idx[B(ch[k][0])]] += 1 - t; return out; }
    out[idx[B(ch[ch.length - 1][0])]] = 1; return out;
  };
  let hairN = 0;
  R.forEach((v, r) => {
    const p = [posN[3 * v], posN[3 * v + 1], posN[3 * v + 2]], al = allowOf[src.mat[v]];
    if (HC && HC.pick({ x: p[0] / s, y: p[1] / s, z: p[2] / s, mat: src.mats[src.mat[v]].name, rgb: rgbOf(v) })) { Wd.set(hairW(p[1] / s), r * NB); hairN++; return; }
    const dd = (al ? bsegs.filter((sg) => al.has(sg.bone)) : bsegs).map((sg) => ({ b: idx[B(sg.bone)], sig, d: Math.max(0, segDist(p, sg.a, sg.b) - sg.r) }));
    const dmin = Math.min(...dd.map((c) => c.d)); // trừ khoảng cách nhỏ nhất: xương gần nhất luôn có trọng số 1, không bị underflow
    const acc = new Float32Array(NB); for (const c of dd) acc[c.b] += Math.exp(-Math.pow((c.d - dmin) / c.sig, 2));
    let tot = acc.reduce((a, w) => a + w, 0); for (let b = 0; b < NB; b++) acc[b] /= tot;
    if (SK && (!al || al.has('Hips'))) { // vải thả dưới hông và cách xa chân: chuyển một phần trọng số sang xương váy theo hướng đỉnh nhìn từ hông
      const hy = W.Hips.y, v2 = Math.min(1, Math.max(0, (hy + (SK.from ?? 0.05) * K * s - p[1]) / ((SK.span ?? 0.5) * K * s)));
      const dLeg = Math.min(...segs.filter((sg) => /^(Thigh|Shin|Foot)/.test(sg.bone)).map((sg) => Math.max(0, segDist(p, sg.a, sg.b) - sg.r)));
      const g0 = (SK.gap0 ?? 0.04) * K * s, g1 = (SK.gap1 ?? 0.2) * K * s, hz = Math.min(1, Math.max(0, (dLeg - g0) / (g1 - g0)));
      const sk = (SK.max ?? 0.9) * v2 * v2 * (3 - 2 * v2) * hz * hz * (3 - 2 * hz);
      if (sk > 1e-3) {
        const ux = p[0] - W.Hips.x, uz = p[2] - W.Hips.z, L = Math.hypot(ux, uz) || 1;
        const dw = Object.entries(skDirs).map(([k, d]) => ({ b: idx[B('Skirt' + k)], w: Math.pow(Math.max(0, (ux * d[0] + uz * d[1]) / L), 2) }));
        const dt = dw.reduce((a, c) => a + c.w, 0) || 1;
        for (let b = 0; b < NB; b++) acc[b] *= 1 - sk;
        for (const c of dw) acc[c.b] += (sk * c.w) / dt;
      }
    }
    Wd.set(acc, r * NB);
  });
  if (HC) console.log(`  tóc: ${hairN} điểm gắn theo chuỗi ${HC.chain.map((c) => c[0]).join(' → ')}`);
  { // làm mượt Laplace theo cạnh lưới (chỉ phần thân): chỗ chuyển giữa hai xương trải trên nhiều tam giác hơn → tam giác không bị kéo thành mảnh
    const nb = Array.from({ length: R.length }, () => new Set());
    for (let t = 0; t < index0.length; t += 3) { if (vlab[index0[t]]) continue; const a = rep[index0[t]], b = rep[index0[t + 1]], c = rep[index0[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
    const it = cfg.smoothWeights ?? 8, lam = 0.5, tmp = new Float32Array(Wd.length);
    for (let k = 0; k < it; k++) {
      tmp.set(Wd);
      for (let r = 0; r < R.length; r++) { const N = nb[r]; if (!N.size) continue; for (let b = 0; b < NB; b++) { let a = 0; for (const q of N) a += tmp[q * NB + b]; Wd[r * NB + b] = (1 - lam) * tmp[r * NB + b] + (lam * a) / N.size; } }
    }
  }
  const si = new Uint16Array(n2 * 4), sw = new Float32Array(n2 * 4), isHard = new Uint8Array(n2);
  for (let i = 0; i < n2; i++) {
    if (vlab[i]) { si[4 * i] = vlab[i] - 1; sw[4 * i] = 1; isHard[i] = vlab[i]; continue; } // vũ khí: gắn cứng 100% vào tay
    const r = rep[i]; let cand = []; for (let b = 0; b < NB; b++) { const w = Wd[r * NB + b]; if (w > 0) cand.push({ b, w }); }
    cand = cand.sort((a, b) => b.w - a.w).slice(0, 4); cand = cand.filter((c) => c.w > 1e-3 * cand[0].w); // bỏ khe trọng số ~0 (glTF cấm chỉ số khác 0 mà trọng số 0)
    const tot = cand.reduce((a, c) => a + c.w, 0); cand.forEach((c, k) => { si[4 * i + k] = c.b; sw[4 * i + k] = c.w / tot; });
  }
  if (process.env.DUMP_WEIGHTS) fs.writeFileSync(process.env.DUMP_WEIGHTS, JSON.stringify({ pos: Array.from(posN), si: Array.from(si), sw: Array.from(sw), rgb: Array.from({ length: n2 }, (_, i) => rgbOf(i)), names: bones.map((b) => b.name) })); // gỡ lỗi: xuất trọng số để vẽ
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posN, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(src.nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(src.uv, 2));
  geo.setAttribute('_mat', new THREE.Float32BufferAttribute(new Float32Array(n2).fill(5), 1)); // 5: không tô vệt cọ giả lên texture thật
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  let index = index0;
  if (cfg.maxEdge) { // tam giác sợi chỉ nối hai chỗ xa nhau (lỗi lưới quét): bỏ
    const lim = (cfg.maxEdge * s) ** 2, e = (a, b) => (posN[3 * a] - posN[3 * b]) ** 2 + (posN[3 * a + 1] - posN[3 * b + 1]) ** 2 + (posN[3 * a + 2] - posN[3 * b + 2]) ** 2; const out = [];
    // trừ tam giác của vũ khí (cả 3 đỉnh gắn cứng cùng một xương): khối cứng không bị kéo giãn, mặt dài là thân cán thật — xoá đi thì cán búa thành từng khúc hở
    for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; const rigid = vlab[a] && vlab[a] === vlab[b] && vlab[a] === vlab[c]; if (!rigid && (e(a, b) > lim || e(b, c) > lim || e(a, c) > lim)) continue; out.push(a, b, c); }
    console.log(`  bỏ ${(index.length - out.length) / 3} tam giác quá dài`); index = out;
  }
  { // bỏ mảnh vụn rời (sau khi cắt, vài cụm tam giác nhỏ mất liên kết sẽ bay lơ lửng khi vung mạnh)
    const par = Int32Array.from({ length: n2 }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const wid = new Map(), key = (i) => `${Math.round(posN[3 * i] * 1e4)},${Math.round(posN[3 * i + 1] * 1e4)},${Math.round(posN[3 * i + 2] * 1e4)}`; // gộp đỉnh trùng vị trí (lưới chưa hàn)
    const rep = new Int32Array(n2); for (let i = 0; i < n2; i++) { const k = key(i); if (!wid.has(k)) wid.set(k, i); rep[i] = wid.get(k); }
    for (let t = 0; t < index.length; t += 3) { const a = f(rep[index[t]]), b = f(rep[index[t + 1]]), c = f(rep[index[t + 2]]); if (a !== b) par[a] = b; if (f(b) !== f(c)) par[f(c)] = f(b); }
    const cnt = new Map(); for (let t = 0; t < index.length; t += 3) { const r = f(rep[index[t]]); cnt.set(r, (cnt.get(r) || 0) + 1); }
    if (process.env.DEBUG_COMP) { const sz = [...cnt.values()].sort((a, b) => b - a); console.log('  thành phần (tam giác):', sz.slice(0, 40).join(' '), '… tổng', sz.length); }
    const minC = cfg.minComponent ?? 60, out = []; let dropped = 0, comps = 0;
    for (let t = 0; t < index.length; t += 3) { const r = f(rep[index[t]]); if (cnt.get(r) < minC) { dropped++; continue; } out.push(index[t], index[t + 1], index[t + 2]); }
    comps = [...cnt.values()].filter((c) => c >= minC).length; index = out; console.log(`  bỏ ${dropped} tam giác ở các mảnh rời nhỏ (< ${minC} tam giác); còn ${comps} khối`);
  }
  const nm = src.mats.length; // nhiều vật liệu: xếp tam giác theo vật liệu, mỗi vật liệu một nhóm (xuất thành nhiều primitive dùng chung xương)
  if (nm > 1) {
    if (cfg.deshard) throw new Error('deshard chưa hỗ trợ model nhiều vật liệu');
    const by = Array.from({ length: nm }, () => []); for (let t = 0; t < index.length; t += 3) by[src.mat[index[t]]].push(index[t], index[t + 1], index[t + 2]);
    index = []; by.forEach((b, k) => { if (b.length) geo.addGroup(index.length, b.length, k); for (const v of b) index.push(v); });
  }
  geo.setIndex(index);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const mkMat = (name) => new THREE.MeshStandardMaterial({ name, color: 0xffffff, roughness: 1, metalness: 1 });
  const matList = nm > 1 ? src.mats.map((m) => mkMat(`${id}_${m.name}`)) : [mkMat(`${id}_body`)];
  const mesh = new THREE.SkinnedMesh(geo, nm > 1 ? matList : matList[0]);
  mesh.name = `${id}_body`; mesh.frustumCulled = false;
  root.add(mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.userData = { heroId: id, unit: 'm', facing: '+Z', name: def.name, height: H };

  const ctx = { H, legLen: W.ThighL.y - W.FootL.y, hipsRest: [W.Hips.x, W.Hips.y, W.Hips.z] };
  const clips = buildClips(ctx, bones, def.anim || {});
  if (process.env.STRETCH) stretchReport(mesh, root, clips, posN, index, bones.map((b) => b.name));
  if (cfg.deshard && !process.env.NO_DESHARD) index = deshard(mesh, geo, root, clips, posN, index, cfg.deshard, isHard);
  if (cfg.compress) await reorderForCompression(geo); // sắp lại đỉnh/tam giác cho bộ nén meshopt (không đổi hình)
  const scene = new THREE.Scene();
  for (const ch of root.children.slice()) scene.add(ch);
  const glb0 = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, animations: Object.values(clips), onlyVisible: false }));

  // —— Ghép texture vào file xuất ——
  const { json, bin } = parseGlb(glb0);
  let off = align4(bin.length); const parts = [bin, Buffer.alloc(off - bin.length)];
  json.images = []; json.textures = []; json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  const added = new Map(), limit = (kind) => (cfg.texMax && typeof cfg.texMax === 'object' ? cfg.texMax[kind] : cfg.texMax); // texMax: số, hoặc { base, normal, mr }
  const addTex = (texIdx, kind) => {
    const imgIdx = src.texSource[texIdx], key = imgIdx + ':' + kind; if (added.has(key)) return added.get(key);
    const data = limit(kind) ? shrinkJpeg(src.imgs[imgIdx], limit(kind)) : src.imgs[imgIdx]; const bv = json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: data.length }) - 1;
    json.images.push({ bufferView: bv, mimeType: 'image/jpeg' }); json.textures.push({ sampler: 0, source: json.images.length - 1 });
    parts.push(data, Buffer.alloc(align4(data.length) - data.length)); off += align4(data.length);
    added.set(key, json.textures.length - 1); return json.textures.length - 1;
  };
  for (const m of json.materials) {
    const refs = src.mats[nm > 1 ? Math.max(0, src.mats.findIndex((sm) => `${id}_${sm.name}` === m.name)) : 0].refs;
    m.pbrMetallicRoughness = { baseColorFactor: [1, 1, 1, 1], metallicFactor: 1, roughnessFactor: 1 };
    if (refs.base != null) m.pbrMetallicRoughness.baseColorTexture = { index: addTex(refs.base, 'base') };
    if (refs.mr != null) m.pbrMetallicRoughness.metallicRoughnessTexture = { index: addTex(refs.mr, 'mr') };
    if (refs.normal != null) m.normalTexture = { index: addTex(refs.normal, 'normal') };
    m.doubleSided = true;
  }
  json.buffers[0].byteLength = off;
  let glb = packGlb(json, Buffer.concat(parts));
  if (cfg.compress) glb = await compressGlb(glb);
  return { glb, H, s, runRefSpeed: ctx.runRefSpeed, clips, tris: index.length / 3, bones: bones.length, mats: json.materials.length };
}

export async function importFused(id, def, outRoot, here) {
  const cfg = def.import;
  const dir = path.join(outRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  const main = await buildFused(id, def, cfg, here);
  fs.writeFileSync(path.join(dir, `${id}.glb`), main.glb);
  const log = (tag, file, r) => console.log(`${(id + tag).padEnd(10)} nhập ${path.basename(file)}: tris ${r.tris}, xương ${r.bones}, ${r.mats} vật liệu, ${Math.round(r.glb.length / 1024)} KB, hệ số co ${r.s.toFixed(2)}, runRef ${r.runRefSpeed}`);
  log('', cfg.file, main);
  // bản trưng bày (sảnh, chọn tướng): cùng xương, cùng clip, lưới/texture chi tiết hơn (09 §3.1 LOD0)
  let showcase = null;
  if (cfg.showcase) {
    const scCfg = { ...cfg, ...cfg.showcase }; delete scCfg.showcase;
    const sc = await buildFused(id, def, scCfg, here);
    showcase = `${id}_showcase.glb`;
    fs.writeFileSync(path.join(dir, showcase), sc.glb);
    log(' (sảnh)', scCfg.file, sc);
  }
  const art = {
    model: `${id}.glb`, ...(showcase && { showcase }), scale: 100, height: Math.round(main.H * 100), runRefSpeed: main.runRefSpeed,
    hitTime: def.hitTime || { Attack1: 0.28, Attack2: 0.28 },
    attach: { weapon_tip: 'Bone_HandR_Tip', head: 'Bone_Head', ...(def.attach || {}) },
    rim: def.rim || def.palette?.[1] || '#ffffff', palette: def.palette || [],
    clips: Object.keys(main.clips), generator: 'tools/modelgen/import_fused.mjs', source: path.basename(cfg.file), ...(showcase && { showcaseSource: path.basename(cfg.showcase.file) }), ...(cfg.portrait && { portrait: cfg.portrait }),
    // cách tô vật liệu (materials.js): mặc định toon + viền; model PBR có texture có thể giữ vật liệu gốc ('pbr') hoặc chỉ màu texture ('unlit')
    ...(cfg.shading && { shading: cfg.shading }), ...(cfg.outline === false && { outline: false }),
    ...(showcase && cfg.showcase.shading && { showcaseShading: cfg.showcase.shading }), ...(showcase && cfg.showcase.outline !== undefined && { showcaseOutline: cfg.showcase.outline }),
  };
  fs.writeFileSync(path.join(dir, 'hero.art.json'), JSON.stringify(art, null, 2) + '\n');
  return { id, tris: main.tris, bones: main.bones, kb: Math.round(main.glb.length / 1024), mats: main.mats, runRef: main.runRefSpeed };
}
