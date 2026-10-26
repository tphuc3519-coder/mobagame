import * as THREE from 'three';

// Lọc TỪNG cây / đá / bụi cỏ theo khung nhìn (Mốc 14, ngân sách 02 §2). Cảnh rải bằng InstancedMesh cả bản đồ: chia ô 3 200 (chunk.js)
// vẫn vẽ trọn ô — đo ở giao tranh giữa đường: 123 lệnh vẽ, 437k tam giác cây cỏ mỗi khung trong khi chỉ ~10k nằm trong màn hình.
// Ở đây mỗi loại giữ MỘT InstancedMesh cả bản đồ; khi camera dịch đáng kể thì chép các bản sao chạm khung nhìn (nới thêm lề, mesh đổ
// bóng nới thêm tầm bóng hắt) lên đầu mảng, đặt count = số đó, chỉ tải lên phần đã đổi; loại nào không còn bản sao trong khung thì ẩn
// (khỏi tốn lệnh vẽ rỗng). Giữ nguyên thứ tự, ma trận, màu và thuộc tính theo bản sao — hình ảnh không đổi một điểm ảnh nào.
// Lúc dịch sẵn shader (game.js warmUp) culler chưa chạy: mọi mesh còn đủ bản sao nên mọi biến thể shader được dịch trước khi vào trận.

const CELL = 1600, PICK = [];
/** Vật đổ bóng ngoài khung nhìn vẫn có thể hắt bóng vào màn hình: nắng chiếu xiên (lights.js: hướng (600, 1200, 800)) ⇒ bóng dài ~0,83 × chiều
 *  cao — cây cao nhất ~1 300 hắt xa ~1 100. Mesh đổ bóng nới thêm SHADOW_REACH thay vì xét cả hộp bóng 6 000 × 6 000 quanh camera. */
const SHADOW_REACH = 1200;
const _f = new THREE.Frustum(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();

/** Gom mọi InstancedMesh trong root (bỏ qua mesh frustumCulled = false / userData.noCull). pad: lề nới thêm quanh mỗi bản sao (đơn vị thế giới,
 *  để khỏi tính lại mỗi khung khi camera trôi nhẹ — chỉ tính lại khi camera dịch quá pad/3, đổi góc, đổi khung nhìn). */
export function createInstanceCuller(root, { pad = 80, merge = true } = {}) {
  root.updateMatrixWorld(true);
  if (merge) mergeInstances(root);
  const list = [];
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.frustumCulled === false || o.userData.noCull || o.count < 2) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    const n = o.count, cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n), cr = new Float32Array(n), s = g.boundingSphere;
    for (let i = 0; i < n; i++) {
      o.getMatrixAt(i, _m); _m.premultiply(o.matrixWorld);
      _p.copy(s.center).applyMatrix4(_m); cx[i] = _p.x; cy[i] = _p.y; cz[i] = _p.z; cr[i] = s.radius * _m.getMaxScaleOnAxis() + pad;
    }
    const attrs = [o.instanceMatrix, o.instanceColor, ...Object.values(g.attributes).filter((a) => a.isInstancedBufferAttribute)].filter(Boolean);
    // lọc thô theo ô CELL: ô nằm ngoài khung nhìn thì bỏ qua mọi bản sao bên trong (bản đồ 5v5 ~15–20 nghìn bản sao, mỗi lượt chỉ xét vài trăm)
    const bins = new Map();
    for (let i = 0; i < n; i++) { const k = Math.floor(cx[i] / CELL) * 4096 + Math.floor(cz[i] / CELL); let b = bins.get(k); if (!b) bins.set(k, (b = [])); b.push(i); }
    const cells = [...bins.values()].map((ids) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, rm = 0;
      for (const i of ids) { x0 = Math.min(x0, cx[i]); x1 = Math.max(x1, cx[i]); y0 = Math.min(y0, cy[i]); y1 = Math.max(y1, cy[i]); z0 = Math.min(z0, cz[i]); z1 = Math.max(z1, cz[i]); rm = Math.max(rm, cr[i]); }
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, r: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + rm, ids: Uint32Array.from(ids) };
    });
    list.push({ o, n, cx, cy, cz, cr, cells, attrs, src: attrs.map((a) => a.array.slice(0, n * a.itemSize)), shown: n });
    o.frustumCulled = false; // culler lo việc lọc; khối bao của mesh tính theo count hiện tại sẽ sai khi count đổi
  });
  const last = { x: NaN, y: 0, z: 0, q: new THREE.Quaternion(), pm: new THREE.Matrix4() };
  const inside = (fr, x, y, z, r) => { for (const pl of fr.planes) if (pl.normal.x * x + pl.normal.y * y + pl.normal.z * z + pl.constant < -r) return false; return true; };
  const api = {
    /** Số mesh đang quản lý, tổng bản sao, bản sao đang vẽ. */
    get stats() { return { meshes: list.length, total: list.reduce((a, e) => a + e.n, 0), shown: list.reduce((a, e) => a + (e.o.visible ? e.shown : 0), 0) }; },
    /** Gọi mỗi khung trước khi vẽ (env.update). force: tính lại bất kể camera có dịch hay không. */
    update(camera, force = false) {
      if (!list.length) return;
      camera.updateMatrixWorld(); camera.getWorldQuaternion(_q); _p.setFromMatrixPosition(camera.matrixWorld);
      const moved = force || !(Math.hypot(_p.x - last.x, _p.y - last.y, _p.z - last.z) < pad / 3) || Math.abs(_q.dot(last.q)) < 0.99995 || !camera.projectionMatrix.equals(last.pm);
      if (!moved) return;
      last.x = _p.x; last.y = _p.y; last.z = _p.z; last.q.copy(_q); last.pm.copy(camera.projectionMatrix);
      _f.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (const e of list) {
        const { o, cx, cy, cz, cr, cells, attrs, src } = e, ex = o.castShadow ? SHADOW_REACH : 0, pick = PICK; pick.length = 0;
        for (const c of cells) {
          if (!inside(_f, c.x, c.y, c.z, c.r + ex)) continue;
          for (const i of c.ids) if (inside(_f, cx[i], cy[i], cz[i], cr[i] + ex)) pick.push(i);
        }
        if (cells.length > 1) pick.sort((a, b) => a - b); // giữ thứ tự gốc của bản sao
        let k = 0;
        for (const i of pick) {
          for (let a = 0; a < attrs.length; a++) { const s = attrs[a].itemSize, d = attrs[a].array, from = src[a]; for (let c = 0; c < s; c++) d[k * s + c] = from[i * s + c]; } // ô k có thể còn bản sao khác từ lượt lọc trước
          k++;
        }
        if (k) for (const a of attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
        o.count = k; o.visible = k > 0; e.shown = k;
      }
    },
    /** Trả mọi bản sao về (vd trước một lượt dịch shader / chụp toàn bản đồ). */
    all() {
      for (const e of list) { e.attrs.forEach((a, j) => { a.array.set(e.src[j]); a.clearUpdateRanges(); a.needsUpdate = true; }); e.o.count = e.n; e.o.visible = true; e.shown = e.n; }
      last.x = NaN;
    },
  };
  return api;
}

/** Gộp các InstancedMesh cùng hình học + cùng vật liệu (+ cùng cờ bóng, thứ tự vẽ, lớp, bố cục thuộc tính theo bản sao) thành MỘT mesh:
 *  cảnh rải theo ô 3 200 và theo từng trại quái nên một loại cỏ / đá nằm rải ở hàng chục mesh — mỗi mesh một lệnh vẽ dù chỉ thấy vài bản sao.
 *  Chỉ gộp mesh nằm đúng gốc toạ độ của root (shader gió đọc instanceMatrix[3] làm pha — không được đổi toạ độ bản sao). Trả số mesh đã bỏ. */
export function mergeInstances(root) {
  const groups = new Map(), inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4();
  const sig = (o) => { const g = o.geometry, inst = Object.entries(g.attributes).filter(([, a]) => a.isInstancedBufferAttribute).map(([n, a]) => n + a.itemSize).join();
    return [g.uuid, o.material.uuid, o.castShadow, o.receiveShadow, o.renderOrder, o.layers.mask, !!o.instanceColor, inst, !!o.customDepthMaterial, o.visible].join('|'); };
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.frustumCulled === false || o.userData.noCull || Array.isArray(o.material) || o.morphTexture) return;
    if (!rel.multiplyMatrices(inv, o.matrixWorld).equals(IDENT)) return;
    const k = sig(o); let l = groups.get(k); if (!l) groups.set(k, (l = [])); l.push(o);
  });
  let removed = 0;
  for (const l of groups.values()) {
    if (l.length < 2) continue;
    const first = l[0], n = l.reduce((a, o) => a + o.count, 0), g0 = first.geometry;
    const inst = Object.entries(g0.attributes).filter(([, a]) => a.isInstancedBufferAttribute);
    let geo = g0;
    if (inst.length) { geo = new THREE.BufferGeometry(); geo.index = g0.index; for (const [name, a] of Object.entries(g0.attributes)) if (!a.isInstancedBufferAttribute) geo.setAttribute(name, a); geo.boundingBox = g0.boundingBox; geo.boundingSphere = g0.boundingSphere; }
    const m = new THREE.InstancedMesh(geo, first.material, n);
    if (first.instanceColor) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const arrs = inst.map(([name, a]) => [name, new a.array.constructor(n * a.itemSize), a]);
    let off = 0;
    for (const o of l) {
      m.instanceMatrix.array.set(o.instanceMatrix.array.subarray(0, o.count * 16), off * 16);
      if (first.instanceColor) m.instanceColor.array.set(o.instanceColor.array.subarray(0, o.count * 3), off * 3);
      for (const [name, arr, a] of arrs) arr.set(o.geometry.attributes[name].array.subarray(0, o.count * a.itemSize), off * a.itemSize);
      off += o.count;
    }
    for (const [name, arr, a] of arrs) geo.setAttribute(name, new THREE.InstancedBufferAttribute(arr, a.itemSize, a.normalized, a.meshPerAttribute));
    m.name = first.name; m.castShadow = first.castShadow; m.receiveShadow = first.receiveShadow; m.renderOrder = first.renderOrder; m.layers.mask = first.layers.mask;
    m.customDepthMaterial = first.customDepthMaterial; m.customDistanceMaterial = first.customDistanceMaterial; m.userData = { ...first.userData };
    m.matrixAutoUpdate = false; m.matrix.identity(); root.add(m); m.updateMatrixWorld(true);
    for (const o of l) { o.parent.remove(o); o.dispose(); removed++; } // instanceMatrix / màu của mesh cũ; hình học + vật liệu dùng chung với mesh gộp
  }
  return removed;
}
const IDENT = new THREE.Matrix4();
