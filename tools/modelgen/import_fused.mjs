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
  return { pos, nor, uv, index: Array.from(g.index.array), imgs, refs, matName: mat.name };
}

/** Khoảng cách từ điểm tới đoạn thẳng a→b. */
function segDist(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], L = abx * abx + aby * aby + abz * abz || 1e-9;
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby + (p[2] - a[2]) * abz) / L; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t, p[2] - a[2] - abz * t);
}

export async function importFused(id, def, outRoot, here) {
  const cfg = def.import;
  const src = await readMesh(path.resolve(here, cfg.file));
  const n = src.pos.length / 3;
  const X = cfg.centerX ?? 0; // dời để thân nằm giữa x=0 (đơn vị file gốc)
  const isStaff = (x) => cfg.staffMaxX != null && x - X < cfg.staffMaxX; // (tuỳ chọn) cắt cứng theo x; mặc định dùng đoạn vũ khí mềm bên dưới
  // chiều cao thân (bỏ vũ khí) → hệ số co
  let top = 0; for (let i = 0; i < n; i++) if (!isStaff(src.pos[3 * i])) top = Math.max(top, src.pos[3 * i + 1]);
  const H = cfg.height ?? 2.5, s = H / (cfg.bodyTop ?? top);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[3 * i] = (src.pos[3 * i] - X) * s; pos[3 * i + 1] = src.pos[3 * i + 1] * s; pos[3 * i + 2] = src.pos[3 * i + 2] * s; }

  // —— Khớp (đơn vị file gốc, x tương đối thân; trái nhân vật = +x) ——
  const J = { hips: 0.27, thighX: 0.05, knee: 0.15, ankle: 0.05, spine: 0.34, chest: 0.45, neck: 0.56, head: 0.6, headTop: 0.64,
    shoulder: [0.15, 0.5], elbow: [0.165, 0.37], wrist: [0.17, 0.25], tip: [0.17, 0.2], wristR: [-0.2, 0.27], tipR: [-0.2, 0.75], toe: 0.1, ...(cfg.joints || {}) };
  const V = (x, y, z = 0) => new THREE.Vector3(x * s, y * s, z * s);
  const W = {
    Root: V(0, 0), Hips: V(0, J.hips), Spine: V(0, J.spine), Chest: V(0, J.chest), Neck: V(0, J.neck), Head: V(0, J.head),
    ThighL: V(J.thighX, J.hips), ThighR: V(-J.thighX, J.hips), ShinL: V(J.thighX, J.knee), ShinR: V(-J.thighX, J.knee), FootL: V(J.thighX, J.ankle), FootR: V(-J.thighX, J.ankle),
    UpperArmL: V(...J.shoulder), UpperArmR: V(-J.shoulder[0], J.shoulder[1]), ForearmL: V(...J.elbow), ForearmR: V(-J.elbow[0], J.elbow[1]),
    HandL: V(...J.wrist), HandR: V(...J.wristR), HandL_Tip: V(...J.tip), HandR_Tip: V(...J.tipR),
  };
  const { bones, idx, root } = makeRig(W);

  // —— Đoạn xương + bán kính ảnh hưởng (đơn vị file gốc) để tính trọng số ——
  const w3 = (k) => W[k].toArray().map((v) => v);
  const segs = [
    ['Hips', 'Hips', 'Spine', 0.12], ['Spine', 'Spine', 'Chest', 0.115], ['Chest', 'Chest', 'Neck', 0.115], ['Neck', 'Neck', 'Head', 0.07],
    ['Head', 'Head', null, 0.11, [0, J.headTop * s, 0]],
    ...['L', 'R'].flatMap((d) => [
      ['UpperArm' + d, 'UpperArm' + d, 'Forearm' + d, 0.065], ['Forearm' + d, 'Forearm' + d, 'Hand' + d, 0.06], ['Hand' + d, 'Hand' + d, 'Hand' + d + '_Tip', 0.06],
      ['Thigh' + d, 'Thigh' + d, 'Shin' + d, 0.05], ['Shin' + d, 'Shin' + d, 'Foot' + d, 0.045], ['Foot' + d, 'Foot' + d, null, 0.05, [W['Foot' + d].x, 0, J.toe * s]],
    ]),
  ].map(([bone, a, b, r, end]) => ({ bone, a: w3(a), b: end || w3(b), r: r * s }));
  // Vũ khí liền khối với thân: coi như một "xương phụ" dạng đoạn thẳng gắn vào tay phải (đơn vị file gốc, x tương đối thân)
  if (cfg.weapon) segs.push({ bone: 'HandR', a: cfg.weapon.a.map((v) => v * s), b: cfg.weapon.b.map((v) => v * s), r: cfg.weapon.r * s });
  const sig = (cfg.softness ?? 0.02) * s;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const hand = idx[B('HandR')];
  for (let i = 0; i < n; i++) {
    const p = [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
    if (isStaff(src.pos[3 * i])) { si[4 * i] = hand; sw[4 * i] = 1; continue; }
    const dd = segs.map((sg) => ({ b: idx[B(sg.bone)], d: Math.max(0, segDist(p, sg.a, sg.b) - sg.r) }));
    const dmin = Math.min(...dd.map((c) => c.d)); // trừ khoảng cách nhỏ nhất: xương gần nhất luôn có trọng số 1, không bị underflow
    const acc = new Map(); for (const c of dd) acc.set(c.b, (acc.get(c.b) || 0) + Math.exp(-Math.pow((c.d - dmin) / sig, 2)));
    let cand = [...acc].map(([b, w]) => ({ b, w })).sort((a, b) => b.w - a.w).slice(0, 4);
    cand = cand.filter((c) => c.w > 1e-3 * cand[0].w); // bỏ khe trọng số ~0 (glTF cấm chỉ số khác 0 mà trọng số 0)
    const tot = cand.reduce((a, c) => a + c.w, 0);
    cand.forEach((c, k) => { si[4 * i + k] = c.b; sw[4 * i + k] = c.w / tot; });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(src.nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(src.uv, 2));
  geo.setAttribute('_mat', new THREE.Float32BufferAttribute(new Float32Array(n).fill(5), 1)); // 5: không tô vệt cọ giả lên texture thật
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  geo.setIndex(src.index);
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
    const data = src.imgs[imgIdx]; const bv = json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: data.length }) - 1;
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
  console.log(`${id.padEnd(10)} nhập ${path.basename(cfg.file)}: tris ${src.index.length / 3}, xương ${bones.length}, ${Math.round(glb.length / 1024)} KB, hệ số co ${s.toFixed(2)}, runRef ${ctx.runRefSpeed}`);
  return { id, tris: src.index.length / 3, bones: bones.length, kb: Math.round(glb.length / 1024), mats: 1, runRef: ctx.runRefSpeed };
}
