import * as THREE from 'three';

// Bản đồ 5v5 rộng 19 200 × 19 200 nhưng camera chỉ thấy ~4% diện tích: đá / tường / vách gộp thành một khối cả bản đồ thì khung nào
// cũng vẽ đủ (cả lượt bóng đổ) — gần 1 triệu tam giác thừa mỗi khung, nặng nhất trên điện thoại. Ở đây chia các khối tĩnh trải rộng
// thành ô vuông: mỗi ô một mesh có khối bao riêng → ô ngoài khung nhìn / ngoài hộp bóng bị bỏ qua. Hình ảnh giữ nguyên từng đỉnh.

/** Chia mesh tĩnh trải rộng trong root thành ô cell×cell (đơn vị thế giới). Chỉ chia khi đáng: phủ ≥ 2 ô và trung bình mỗi ô
 *  ≥ minTris tam giác (khối thưa như mặt đất thì để nguyên — thêm lệnh vẽ không bõ). Bỏ qua mesh có xương, trong suốt, nhiều vật liệu,
 *  morph, thuộc tính xen kẽ, hoặc đánh dấu userData.noChunk / frustumCulled = false. Trả về số mesh đã chia. */
export function chunkStatic(root, { cell = 3200, minTris = 1500 } = {}) {
  root.updateMatrixWorld(true);
  const list = [], users = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    users.set(o.geometry, (users.get(o.geometry) || 0) + 1);
    const g = o.geometry, m = o.material;
    if (o.isSkinnedMesh || o.isBatchedMesh || o.frustumCulled === false || o.userData.noChunk || Array.isArray(m) || m.transparent) return;
    if (Object.keys(g.morphAttributes).length || Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return;
    list.push(o);
  });
  let n = 0;
  for (const o of list) {
    const parts = o.isInstancedMesh ? splitInstances(o, cell, minTris) : splitTriangles(o, cell, minTris);
    if (!parts) continue;
    const parent = o.parent;
    for (const p of parts) {
      p.name = o.name; p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.renderOrder = o.renderOrder; p.layers.mask = o.layers.mask; p.visible = o.visible;
      p.customDepthMaterial = o.customDepthMaterial; p.customDistanceMaterial = o.customDistanceMaterial; p.userData = { ...o.userData, chunkOf: o.uuid };
      p.position.copy(o.position); p.quaternion.copy(o.quaternion); p.scale.copy(o.scale);
      parent.add(p);
    }
    parent.remove(o);
    if (o.isInstancedMesh) o.dispose(); else if (users.get(o.geometry) === 1) o.geometry.dispose(); // hình học gốc đã tách xong
    n++;
  }
  return n;
}

/** Khoá ô của điểm thế giới. */
const keyOf = (x, z, cell) => Math.floor(x / cell) * 100003 + Math.floor(z / cell);

/** Mesh thường: xếp từng tam giác vào ô theo trọng tâm (toạ độ thế giới), mỗi ô một hình học con chỉ giữ các đỉnh dùng tới. */
function splitTriangles(o, cell, minTris) {
  const g = o.geometry, pos = g.attributes.position, idx = g.index, triCount = (idx ? idx.count : pos.count) / 3;
  if (triCount < minTris * 2) return null;
  const mw = o.matrixWorld, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
  const bins = new Map();
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, vi(t, 0)).applyMatrix4(mw); b.fromBufferAttribute(pos, vi(t, 1)).applyMatrix4(mw); c.fromBufferAttribute(pos, vi(t, 2)).applyMatrix4(mw);
    const k = keyOf((a.x + b.x + c.x) / 3, (a.z + b.z + c.z) / 3, cell);
    let l = bins.get(k); if (!l) bins.set(k, (l = [])); l.push(t);
  }
  if (bins.size < 2 || triCount / bins.size < minTris) return null;
  const names = Object.keys(g.attributes), out = [];
  for (const tris of bins.values()) {
    const remap = new Map(), order = [], index = new Uint32Array(tris.length * 3);
    tris.forEach((t, i) => { for (let k = 0; k < 3; k++) { const v = vi(t, k); let r = remap.get(v); if (r === undefined) { r = order.length; remap.set(v, r); order.push(v); } index[i * 3 + k] = r; } });
    const sub = new THREE.BufferGeometry();
    for (const name of names) {
      const src = g.attributes[name], s = src.itemSize, arr = new src.array.constructor(order.length * s);
      for (let i = 0; i < order.length; i++) for (let k = 0; k < s; k++) arr[i * s + k] = src.array[order[i] * s + k];
      sub.setAttribute(name, new THREE.BufferAttribute(arr, s, src.normalized));
    }
    sub.setIndex(new THREE.BufferAttribute(order.length > 65535 ? index : new Uint16Array(index), 1));
    sub.computeBoundingBox(); sub.computeBoundingSphere();
    out.push(new THREE.Mesh(sub, o.material));
  }
  return out;
}

/** InstancedMesh: chia bản sao theo vị trí (thế giới); hình học + vật liệu dùng chung, thuộc tính theo bản sao (nếu có) tách theo ô. */
function splitInstances(o, cell, minTris) {
  const g = o.geometry, per = (g.index ? g.index.count : g.attributes.position.count) / 3, cnt = o.count;
  if (per * cnt < minTris * 2 || cnt < 2) return null;
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), bins = new Map();
  for (let i = 0; i < cnt; i++) {
    o.getMatrixAt(i, m); p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
    const k = keyOf(p.x, p.z, cell); let l = bins.get(k); if (!l) bins.set(k, (l = [])); l.push(i);
  }
  if (bins.size < 2 || (per * cnt) / bins.size < minTris) return null;
  const inst = Object.entries(g.attributes).filter(([, a]) => a.isInstancedBufferAttribute), out = [];
  for (const ids of bins.values()) {
    let geo = g;
    if (inst.length) { // thuộc tính theo bản sao: hình học con dùng chung đỉnh/chỉ mục, riêng mảng theo bản sao
      geo = new THREE.BufferGeometry(); geo.index = g.index;
      for (const [name, a] of Object.entries(g.attributes)) {
        if (!a.isInstancedBufferAttribute) { geo.setAttribute(name, a); continue; }
        const s = a.itemSize, arr = new a.array.constructor(ids.length * s);
        ids.forEach((id, i) => { for (let k = 0; k < s; k++) arr[i * s + k] = a.array[id * s + k]; });
        geo.setAttribute(name, new THREE.InstancedBufferAttribute(arr, s, a.normalized, a.meshPerAttribute));
      }
      geo.boundingBox = g.boundingBox; geo.boundingSphere = g.boundingSphere;
    }
    const im = new THREE.InstancedMesh(geo, o.material, ids.length);
    ids.forEach((id, i) => { o.getMatrixAt(id, m); im.setMatrixAt(i, m); });
    if (o.instanceColor) { const c = new THREE.Color(); ids.forEach((id, i) => { o.getColorAt(id, c); im.setColorAt(i, c); }); im.instanceColor.needsUpdate = true; }
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.computeBoundingBox();
    out.push(im);
  }
  return out;
}

/** Cảnh tĩnh không đổi vị trí sau khi dựng: tính ma trận một lần rồi thôi tính lại mỗi khung (đỡ duyệt ~2 000 vật thể / khung). */
export function freezeStatic(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => { o.matrixAutoUpdate = false; });
}
