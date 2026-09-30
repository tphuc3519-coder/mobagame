// Nhập model tĩnh của hoạ sĩ (Z-up, nhiều mảnh rời, không xương) thành model game: xoay về Y-up, co về đúng chiều cao,
// gắn từng mảnh vào bộ xương `Bone_*` chuẩn (mảnh tay/chân trộn trọng số ở khuỷu/gối), rồi dùng lại bộ clip của anim.mjs.
// Dùng qua build.mjs khi tướng khai báo `import: { file, ... }` (xem heroes/thach_quy.mjs).
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { toCreasedNormals, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildClips } from './anim.mjs';
import { MAT } from './kit.mjs';

const B = (n) => 'Bone_' + n;

/** Khớp xương tính trên toạ độ của file gốc (Z-up, nhìn về -Y; x<0 = tay cầm gậy = bên PHẢI của nhân vật). */
const JOINTS = {
  hipsZ: 2.05, thighX: 0.48, kneeZ: 1.3, ankleZ: 0.85, footFwd: 0.25,
  spineZ: 2.5, chestZ: 2.95, neckZ: 3.5, headZ: 3.7,
  // tay chéo: vai ở đỉnh ngoài, bàn tay ở chỗ găng (x 1.22)
  shoulder: [1.9, 3.1], elbow: [1.65, 2.5], wrist: [1.3, 1.95], tip: [1.25, 1.7],
};

const loadGlb = async (p) => {
  const b = fs.readFileSync(p);
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};

/** Tên mảnh → { bone, kind }. Bên trái/phải theo dấu x (x<0 là phải của nhân vật). */
function classify(name, cx) {
  const side = cx < 0 ? 'R' : 'L';
  if (/ground/i.test(name)) return null;
  if (/staff/i.test(name)) return { kind: 'rigid', bone: B('HandR') };
  if (/glove/i.test(name)) return { kind: 'rigid', bone: B('Hand' + side) };
  if (/boot/i.test(name)) return { kind: 'rigid', bone: B('Foot' + side) };
  if (/_arm$/i.test(name)) return { kind: 'arm', side };
  if (/_leg$/i.test(name)) return { kind: 'leg', side };
  if (/helmet|valve/i.test(name)) return { kind: 'rigid', bone: B('Head') };
  if (/belt/i.test(name)) return { kind: 'rigid', bone: B('Hips') };
  return { kind: 'rigid', bone: B('Chest') }; // thân, cửa sổ hổ phách, bu-lông, bình khí, ống, ba lô
}

export async function importHero(id, def, outRoot, here) {
  const cfg = def.import;
  const src = await loadGlb(path.resolve(here, cfg.file));
  const H = cfg.height ?? 2.5;
  const J = { ...JOINTS, ...(cfg.joints || {}) };

  // Chiều cao file gốc = đỉnh van trên mũ (bỏ gậy và nền xem trước), đáy = đáy ủng
  src.scene.updateMatrixWorld(true);
  const parts = [];
  src.scene.traverse((o) => { if (o.isMesh) parts.push(o); });
  const floorZ = cfg.floorZ ?? 0.3;
  const topZ = cfg.topZ ?? Math.max(...parts.filter((o) => !/staff|ground/i.test(o.name)).map((o) => new THREE.Box3().setFromObject(o).max.z));
  const s = H / (topZ - floorZ);
  const M = new THREE.Matrix4().makeScale(s, s, s)
    .multiply(new THREE.Matrix4().makeTranslation(0, -floorZ, 0))
    .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); // (x,y,z) → (x, z, -y): nhìn về +Z
  const jp = (x, z) => new THREE.Vector3(x * s, (z - floorZ) * s, 0);

  // —— Bộ xương: toạ độ thế giới rồi đổi sang cục bộ ——
  const W = {
    Root: [0, 0, 0], Hips: jp(0, J.hipsZ), Spine: jp(0, J.spineZ), Chest: jp(0, J.chestZ), Neck: jp(0, J.neckZ), Head: jp(0, J.headZ),
    ThighL: jp(J.thighX, J.hipsZ), ThighR: jp(-J.thighX, J.hipsZ), ShinL: jp(J.thighX, J.kneeZ), ShinR: jp(-J.thighX, J.kneeZ),
    FootL: jp(J.thighX, J.ankleZ), FootR: jp(-J.thighX, J.ankleZ),
    UpperArmL: jp(...J.shoulder), UpperArmR: jp(-J.shoulder[0], J.shoulder[1]),
    ForearmL: jp(...J.elbow), ForearmR: jp(-J.elbow[0], J.elbow[1]),
    HandL: jp(...J.wrist), HandR: jp(...(J.wristR || [-J.wrist[0], J.wrist[1]])),
    HandL_Tip: jp(...J.tip), HandR_Tip: jp(...(J.tipR || [-J.tip[0], J.tip[1]])),
  };
  for (const k of Object.keys(W)) if (Array.isArray(W[k])) W[k] = new THREE.Vector3(...W[k]);
  const TREE = [['Root', null], ['Hips', 'Root'], ['Spine', 'Hips'], ['Chest', 'Spine'], ['Neck', 'Chest'], ['Head', 'Neck'],
    ['UpperArmL', 'Chest'], ['UpperArmR', 'Chest'], ['ForearmL', 'UpperArmL'], ['ForearmR', 'UpperArmR'], ['HandL', 'ForearmL'], ['HandR', 'ForearmR'],
    ['HandL_Tip', 'HandL'], ['HandR_Tip', 'HandR'], ['ThighL', 'Hips'], ['ThighR', 'Hips'], ['ShinL', 'ThighL'], ['ShinR', 'ThighR'], ['FootL', 'ShinL'], ['FootR', 'ShinR']];
  const bones = TREE.map(([n]) => { const b = new THREE.Bone(); b.name = B(n); return b; });
  const idx = Object.fromEntries(TREE.map(([n], i) => [B(n), i]));
  const root = new THREE.Group();
  TREE.forEach(([n, p], i) => {
    bones[i].position.copy(W[n]);
    if (p) { bones[i].position.sub(W[p]); bones[idx[B(p)]].add(bones[i]); } else root.add(bones[i]);
  });

  // —— Gộp hình học ——
  const pos = [], nor = [], col = [], uv = [], mat = [], si = [], sw = [], idxBody = [], idxGlow = [];
  const blend = (y, lo, bHi, bLo, half) => { // quanh cao độ lo: phía trên theo bHi, phía dưới theo bLo, trộn mượt trong ±half
    const t = THREE.MathUtils.smoothstep(y, lo - half, lo + half);
    return t >= 1 ? [[bHi, 1]] : t <= 0 ? [[bLo, 1]] : [[bHi, t], [bLo, 1 - t]];
  };
  const half = cfg.blend ?? 0.1;
  const yK = W.ShinL.y, yE = W.ForearmL.y, yA = W.FootL.y;
  for (const o of parts) {
    const box = new THREE.Box3().setFromObject(o);
    const cls = classify(o.name, (box.min.x + box.max.x) / 2);
    if (!cls) continue;
    const g = o.geometry.attributes.normal ? o.geometry.clone() : mergeVertices(toCreasedNormals(o.geometry, (cfg.crease ?? 40) * Math.PI / 180), 1e-4); // file gốc không có pháp tuyến: mượt trên mặt cong, sắc ở mép vuông
    const nd = cfg.nudge?.(o.name, (box.min.x + box.max.x) / 2); // chỉnh vị trí mảnh (toạ độ file gốc) cho khớp thiết kế
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(M, o.matrixWorld));
    if (nd) g.translate(nd[0] * s, nd[2] * s, -nd[1] * s);
    const mo = Array.isArray(o.material) ? o.material[0] : o.material;
    const glass = /glass/i.test(mo.name), metal = /brass/i.test(mo.name);
    const base = pos.length / 3, P = g.attributes.position, N = g.attributes.normal;
    const c = cfg.srgb ? new THREE.Color().setRGB(mo.color.r, mo.color.g, mo.color.b, THREE.SRGBColorSpace) : mo.color; // cfg.srgb: file gốc ghi màu sRGB/255 thẳng vào hệ số vật liệu
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i);
      pos.push(P.getX(i), y, P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(c.r, c.g, c.b); uv.push(0, 0);
      mat.push(glass ? MAT.glow : metal ? MAT.metal : MAT.cloth);
      let w;
      if (cls.kind === 'rigid') w = [[cls.bone, 1]];
      else if (cls.kind === 'arm') w = blend(y, yE, B('UpperArm' + cls.side), B('Forearm' + cls.side), half);
      else { // chân: đùi → cẳng ở gối, cẳng → bàn chân ở cổ chân
        const t1 = THREE.MathUtils.smoothstep(y, yK - half, yK + half), t2 = THREE.MathUtils.smoothstep(y, yA - half, yA + half);
        w = [[B('Thigh' + cls.side), t1], [B('Shin' + cls.side), (1 - t1) * t2], [B('Foot' + cls.side), (1 - t1) * (1 - t2)]].filter((e) => e[1] > 1e-4);
      }
      const slot = [0, 0, 0, 0], wt = [0, 0, 0, 0];
      w.slice(0, 4).forEach(([bn, v], k) => { slot[k] = idx[bn]; wt[k] = v; });
      si.push(...slot); sw.push(...wt);
    }
    const ind = g.index ? Array.from(g.index.array) : Array.from({ length: P.count }, (_, i) => i);
    (glass ? idxGlow : idxBody).push(...ind.map((v) => v + base));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('_mat', new THREE.Float32BufferAttribute(mat, 1));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const body = new THREE.MeshStandardMaterial({ name: `${id}_body`, vertexColors: true, roughness: 0.62, metalness: 0.12 });
  const glow = new THREE.MeshStandardMaterial({ name: `${id}_glow`, vertexColors: true, roughness: 0.5, metalness: 0, emissive: new THREE.Color(cfg.glow || def.glow || '#ffffff'), emissiveIntensity: 1 });
  const all = [], mats = [];
  [[idxBody, body], [idxGlow, glow]].forEach(([l, m]) => { if (!l.length) return; geo.addGroup(all.length, l.length, mats.length); all.push(...l); mats.push(m); });
  geo.setIndex(all);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geo, mats);
  mesh.name = `${id}_body`; mesh.frustumCulled = false;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.userData = { heroId: id, unit: 'm', facing: '+Z', name: def.name, height: H };

  // —— Clip: dùng lại thư viện anim.mjs ——
  const ctx = { H, legLen: W.ThighL.y - W.FootL.y, hipsRest: [W.Hips.x, W.Hips.y, W.Hips.z] };
  const clips = buildClips(ctx, bones, def.anim || {});
  const scene = new THREE.Scene();
  for (const ch of root.children.slice()) scene.add(ch);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: Object.values(clips), onlyVisible: false });
  const dir = path.join(outRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.glb`), Buffer.from(glb));
  const art = {
    model: `${id}.glb`, scale: 100, height: Math.round(H * 100), runRefSpeed: ctx.runRefSpeed,
    hitTime: def.hitTime || { Attack1: 0.28, Attack2: 0.28 },
    attach: { weapon_tip: 'Bone_HandR_Tip', head: 'Bone_Head', ...(def.attach || {}) },
    rim: def.rim || def.palette?.[1] || '#ffffff', palette: def.palette || [],
    clips: Object.keys(clips), generator: 'tools/modelgen/import_glb.mjs', source: path.basename(cfg.file), ...(cfg.portrait && { portrait: cfg.portrait }),
  };
  fs.writeFileSync(path.join(dir, 'hero.art.json'), JSON.stringify(art, null, 2) + '\n');
  console.log(`${id.padEnd(10)} nhập ${path.basename(cfg.file)}: ${parts.length - 1} mảnh, tris ${all.length / 3}, xương ${bones.length}, ${Math.round(glb.byteLength / 1024)} KB, runRef ${ctx.runRefSpeed}`);
  return { id, tris: all.length / 3, bones: bones.length, kb: Math.round(glb.byteLength / 1024), mats: mats.length, runRef: ctx.runRefSpeed };
}
