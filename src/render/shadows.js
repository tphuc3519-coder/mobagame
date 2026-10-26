import * as THREE from 'three';

let tex, mat;
const geos = new Map();
/** Bóng tiếp đất nhỏ, đậm ngay dưới chân (cộng thêm bóng nắng thời gian thực ở mức Vừa/Cao). */
export function createBlobShadow(radius) {
  if (!tex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.45, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    tex = new THREE.CanvasTexture(c);
  }
  // dùng chung hình + vật liệu (lính sinh ra liên tục cả trận: tạo mới mỗi lần sẽ rò bộ nhớ GPU → máy yếu mất đồ hoạ)
  const key = Math.round(radius);
  if (!geos.has(key)) geos.set(key, new THREE.PlaneGeometry(key * 2.8, key * 2.0));
  mat ||= new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(geos.get(key), mat);
  m.rotation.set(-Math.PI / 2, 0, 0.64); m.position.set(-radius * 0.8, 3, -radius * 1.0); m.renderOrder = 1; // lệch nhẹ theo hướng nắng (bóng thò ra sau lưng)
  const g = new THREE.Group(); g.add(m); return g;
}

const _o = new THREE.Object3D(), _r = new THREE.Euler(-Math.PI / 2, 0, 0.64);
let unitGeo = null;
/** Mọi bóng tròn dưới chân gom thành MỘT InstancedMesh (02 §2: trước đây mỗi đơn vị một lệnh vẽ — giao tranh 5v5 ~20 lệnh chỉ cho bóng tròn).
 *  Mỗi bóng giữ đúng hình như createBlobShadow: tấm (2,8 × 2,0)·round(r), lệch (−0,8r, 3, −r) theo nắng, cả cụm co theo độ cao k.
 *  Bóng đen cộng dồn theo phép nhân (1 − a) nên thứ tự vẽ giữa các bóng không đổi kết quả. add(r) → { x, y, z, k, visible } (gán mỗi khung),
 *  remove(b), update() (gọi sau khi gán xong, trước khi vẽ), mesh (để dọn GPU), dispose(). */
export function createBlobLayer(scene, cap = 128) {
  createBlobShadow(1); // dựng ảnh + vật liệu dùng chung
  unitGeo ||= new THREE.PlaneGeometry(2.8, 2.0);
  const items = new Set();
  const make = (n) => { const m = new THREE.InstancedMesh(unitGeo, mat, n); m.count = 0; m.frustumCulled = false; m.renderOrder = 1; m.name = 'blobShadows'; return m; };
  let mesh = make(cap); scene.add(mesh);
  return {
    get mesh() { return mesh; },
    add(radius) { const b = { r: radius, key: Math.round(radius), x: 0, y: 0, z: 0, k: 1, visible: true }; items.add(b); return b; },
    remove(b) { items.delete(b); },
    update() {
      let n = 0; for (const b of items) if (b.visible) n++;
      if (n > cap) { while (cap < n) cap *= 2; scene.remove(mesh); mesh.dispose(); mesh = make(cap); scene.add(mesh); }
      let i = 0;
      for (const b of items) {
        if (!b.visible) continue;
        _o.position.set(b.x + -b.r * 0.8 * b.k, b.y + 3 * b.k, b.z - b.r * b.k); _o.rotation.copy(_r); _o.scale.set(b.key * b.k, b.key * b.k, b.k); _o.updateMatrix();
        mesh.setMatrixAt(i++, _o.matrix);
      }
      mesh.count = i; const a = mesh.instanceMatrix; a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(1, i) * 16); a.needsUpdate = true;
    },
    dispose() { scene.remove(mesh); items.clear(); },
  };
}
