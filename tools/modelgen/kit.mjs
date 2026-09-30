// Bộ dựng hình khối: gom nhiều khối nguyên thuỷ vào MỘT SkinnedMesh (1 draw call),
// tô màu theo đỉnh, gán xương (cứng hoặc pha trộn ở khớp). Đơn vị: mét, mặt nhìn về +Z,
// bên trái của nhân vật ở +X (chuẩn glTF).
import * as THREE from 'three';
import { SdfBody } from './sdf.mjs';

export const D2R = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const mirrorName = (n) => n.replace(/([LR])(_Tip)?$/, (m, s, t) => (s === 'L' ? 'R' : 'L') + (t || ''));

export class Model {
  constructor(id) {
    this.id = id;
    this.joints = [];            // {name,parent,pos}
    this.jointMap = new Map();
    this.pos = []; this.nor = []; this.col = []; this.si = []; this.sw = [];
    this.idx = [[], []];         // 0 = thân, 1 = phát sáng
    this.vcount = 0;
    this.glowColor = '#ffffff';
    this.glowStrength = 1.5;
    this.userData = {};
    this.sdf = new SdfBody();
    this.sdfCell = 0.013;
    this.sdfTris = 8000;
  }

  joint(name, parent, x, y, z) {
    const j = { name, parent, pos: V(x, y, z), index: this.joints.length };
    this.joints.push(j);
    this.jointMap.set(name, j);
    return j;
  }
  /** Tạo cặp khớp trái (+X) và phải (−X). */
  jointLR(nameL, parentL, x, y, z) {
    this.joint(nameL, parentL, x, y, z);
    const parentR = parentL && this.jointMap.has(mirrorName(parentL)) && /[LR](_Tip)?$/.test(parentL) ? mirrorName(parentL) : parentL;
    this.joint(mirrorName(nameL), parentR, -x, y, z);
  }
  J(name) {
    const j = this.jointMap.get(name);
    if (!j) throw new Error('Thiếu xương ' + name);
    return j.pos.clone();
  }
  has(name) { return this.jointMap.has(name); }

  /**
   * Thêm một khối.
   * o: bone, at, rot(độ), scale, color, color2 (chuyển sắc theo trục Y cục bộ), glow, flat,
   *    ao (độ tối phần hướng xuống), blend {b1,b2,from,to,t0,t1,w0,w1}, mirror
   */
  add(geom, o = {}) {
    this._emit(geom, o, false);
    if (o.mirror) this._emit(geom, o, true);
    return this;
  }

  _emit(geom, o, mirrored) {
    const { bone = 'Bone_Root', at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1],
      color = '#ffffff', color2 = null, glow = false, flat = false, ao = 0.3, blend = null } = o;
    let g = geom.clone();
    if (flat) { if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); }
    g.computeBoundingBox();
    const bb = { min: { y: g.boundingBox.min.y }, max: { y: g.boundingBox.max.y } }; // sao chép trước khi biến đổi
    const local = g.attributes.position.array.slice();
    const M = new THREE.Matrix4().compose(
      V(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R, 'XYZ')), V(...scale));
    if (mirrored) M.premultiply(new THREE.Matrix4().makeScale(-1, 1, 1));
    g.applyMatrix4(M);

    const pos = g.attributes.position, nor = g.attributes.normal;
    const n = pos.count;
    const c1 = new THREE.Color(color), c2 = color2 ? new THREE.Color(color2) : null;
    const tmp = new THREE.Color();
    const boneName = mirrored ? mirrorName(bone) : bone;
    const bi = this.jointMap.get(boneName);
    if (!bi) throw new Error('Thiếu xương ' + boneName);
    let b1, b2, f, tv, dl;
    const wfn = o.weights; // (p) => [[tên xương, trọng số], ...] tối đa 4 phần tử (đã phản chiếu nếu cần)
    if (blend) {
      b1 = this.jointMap.get(mirrored ? mirrorName(blend.b1) : blend.b1);
      b2 = this.jointMap.get(mirrored ? mirrorName(blend.b2) : blend.b2);
      if (!b1 || !b2) throw new Error('Thiếu xương blend ' + blend.b1 + '/' + blend.b2);
      f = V(...blend.from); tv = V(...blend.to);
      if (mirrored) { f.x = -f.x; tv.x = -tv.x; }
      dl = tv.clone().sub(f); dl.multiplyScalar(1 / dl.lengthSq());
    }
    const base = this.vcount;
    const p = V();
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      let k = 0;
      if (c2) k = (local[i * 3 + 1] - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y);
      tmp.copy(c1); if (c2) tmp.lerp(c2, 1 - k);
      const shade = (1 - ao) + ao * (nor.getY(i) * 0.5 + 0.5);
      this.col.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      if (wfn) {
        const pw = mirrored ? V(-p.x, p.y, p.z) : p;
        const list = wfn(pw).slice(0, 4);
        const si = [0, 0, 0, 0], sw = [0, 0, 0, 0];
        let tot = 0;
        list.forEach(([nm, w], k) => { const j = this.jointMap.get(mirrored ? mirrorName(nm) : nm); if (!j) throw new Error('Thiếu xương ' + nm); si[k] = j.index; sw[k] = w; tot += w; });
        this.si.push(...si.map((v, k) => (sw[k] > 0 ? v : 0))); this.sw.push(...sw.map((w) => w / (tot || 1)));
      } else if (blend) {
        const t = p.clone().sub(f).dot(dl);
        const w = blend.w0 + (blend.w1 - blend.w0) * smooth(blend.t0, blend.t1, t);
        this.si.push(1 - w > 0 ? b1.index : 0, w > 0 ? b2.index : 0, 0, 0); this.sw.push(1 - w, w, 0, 0);
      } else {
        this.si.push(bi.index, 0, 0, 0); this.sw.push(1, 0, 0, 0);
      }
    }
    const list = this.idx[glow ? 1 : 0];
    const ix = g.index;
    const tri = ix ? ix.count / 3 : n / 3;
    for (let t = 0; t < tri; t++) {
      const a = ix ? ix.getX(t * 3) : t * 3, b = ix ? ix.getX(t * 3 + 1) : t * 3 + 1, c = ix ? ix.getX(t * 3 + 2) : t * 3 + 2;
      if (mirrored) list.push(base + a, base + c, base + b); else list.push(base + a, base + b, base + c);
    }
    this.vcount += n;
  }

  // ---- khối nguyên thuỷ ----
  sphere(r, o = {}) { // ellipsoid nếu có o.radii
    const rr = o.radii || [r, r, r];
    const R = Math.max(...rr) * (o.scale ? Math.max(...o.scale) : 1); // chi tiết giảm theo kích thước
    const w = o.wseg || (R < 0.03 ? 6 : R < 0.06 ? 8 : R < 0.12 ? 11 : 14), h = o.hseg || (R < 0.03 ? 4 : R < 0.06 ? 6 : R < 0.12 ? 8 : 10);
    const g = new THREE.SphereGeometry(1, w, h);
    return this.add(g, { ...o, scale: rr.map((v, i) => v * (o.scale ? o.scale[i] : 1)) });
  }
  box(w, h, d, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), { flat: true, ...o }); }
  cyl(rTop, rBot, h, o = {}) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, o.seg || (Math.max(rTop, rBot) < 0.03 ? 6 : 10), 1, o.open || false), o);
  }
  cone(r, h, o = {}) { return this.add(new THREE.ConeGeometry(r, h, o.seg || (r < 0.03 ? 5 : 8)), o); }
  torus(R, r, o = {}) { return this.add(new THREE.TorusGeometry(R, r, o.rseg || (r < 0.015 ? 4 : 6), o.seg || (R < 0.08 ? 12 : 16), o.arc || Math.PI * 2), o); }
  /** profile: [[r,y],...] từ dưới lên. */
  lathe(profile, o = {}) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    return this.add(new THREE.LatheGeometry(pts, o.seg || 16), o);
  }
  /** Khối lăng trụ từ đa giác 2D (đùn theo Z). */
  extrude(points, depth, o = {}) {
    const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: o.bevel !== false, bevelSize: o.bevelSize ?? depth * 0.15, bevelThickness: o.bevelSize ?? depth * 0.15, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    return this.add(g, { flat: true, ...o });
  }
  /** Tấm phẳng (vải, lá): hình chữ nhật/thang, 2 mặt. */
  panel(wTop, wBot, h, o = {}) {
    const hw1 = wTop / 2, hw2 = wBot / 2;
    const g = new THREE.BufferGeometry();
    const v = [-hw1, h / 2, 0, hw1, h / 2, 0, hw2, -h / 2, 0, -hw2, -h / 2, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setIndex([0, 3, 1, 1, 3, 2]);
    const g2 = g.clone(); // mặt sau
    g2.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3));
    g2.setIndex([0, 1, 3, 1, 2, 3]);
    this.add(g, { ao: 0.1, ...o });
    return this.add(g2, { ao: 0.1, ...o });
  }
  /** Capsule/thân thon nối hai điểm, bán kính r0 ở p0 và r1 ở p1. */
  seg(p0, p1, r0, r1, o = {}) {
    const a = V(...p0), b = V(...p1);
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const rot = [e.x / D2R, e.y / D2R, e.z / D2R];
    const opt = { ...o, at: mid.toArray(), rot };
    // Với nhiều khối rời (không dùng blend chung) thì gọi trực tiếp; ở đây dùng thân + 2 mũ cầu
    this.add(new THREE.CylinderGeometry(r1, r0, len, o.seg || 8, 1, true), opt);
    const cap = (r) => (r > 0.03 ? new THREE.SphereGeometry(1, 8, 6) : new THREE.SphereGeometry(1, 5, 4));
    if (!o.noCap0) this.add(cap(r0), { ...o, at: a.toArray(), scale: [r0, r0, r0] });
    if (!o.noCap1) this.add(cap(r1), { ...o, at: b.toArray(), scale: [r1, r1, r1] });
    return this;
  }

  /**
   * Khối "loft": các mặt cắt elip xếp chồng theo trục Y. secs: [{y, rx, rz, cx, cz}] từ dưới lên.
   * Hai đầu tự đóng nắp. Dùng cho thân, váy, áo choàng, giáp.
   */
  loft(secs, o = {}) {
    const N = o.seg || 18;
    const pos = [], idx = [];
    secs.forEach((s) => {
      for (let j = 0; j < N; j++) {
        const a = (j / N) * Math.PI * 2;
        pos.push((s.cx || 0) + s.rx * Math.sin(a), s.y, (s.cz || 0) + s.rz * Math.cos(a));
      }
    });
    for (let r = 0; r < secs.length - 1; r++) {
      for (let j = 0; j < N; j++) {
        const A = r * N + j, B = r * N + ((j + 1) % N), C = (r + 1) * N + j, D = (r + 1) * N + ((j + 1) % N);
        idx.push(A, B, C, B, D, C);
      }
    }
    const cb = pos.length / 3; const s0 = secs[0], s1 = secs[secs.length - 1];
    pos.push(s0.cx || 0, s0.y, s0.cz || 0); pos.push(s1.cx || 0, s1.y, s1.cz || 0);
    const top = (secs.length - 1) * N;
    for (let j = 0; j < N; j++) {
      const j2 = (j + 1) % N;
      idx.push(cb, j2, j);
      idx.push(cb + 1, top + j, top + j2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return this.add(g, o);
  }

  /** Chi tiết chân/tay: mặt cắt tròn theo trục p0→p1, prof = [[t, r], ...] (t 0..1, r tuyệt đối). */
  limb(p0, p1, prof, o = {}) {
    const a = V(...p0), b = V(...p1);
    const len = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const secs = prof.map(([t, r]) => ({ y: (t - 0.5) * len, rx: r, rz: r }));
    return this.loft(secs, { seg: o.seg || 10, ...o, at: a.clone().add(b).multiplyScalar(0.5).toArray(), rot: [e.x / D2R, e.y / D2R, e.z / D2R] });
  }

  /** Khối SDF của thân liền (xem sdf.mjs). o.mirror: thêm bản đối xứng qua X (đổi tên xương L↔R). */
  blob(o) {
    this.sdf.add(o);
    if (o.mirror) {
      const mx = (p) => [-p[0], p[1], p[2]];
      const q = { ...o, mirror: false };
      if (o.cone) q.cone = [mx(o.cone[0]), mx(o.cone[1]), o.cone[2], o.cone[3]];
      if (o.ell) q.ell = [mx(o.ell[0]), o.ell[1], o.ell[2] ? [o.ell[2][0], -o.ell[2][1], -o.ell[2][2]] : undefined];
      if (o.loft) q.loft = o.loft.map((e) => ({ ...e, cx: -(e.cx || 0) }));
      const w = o.weights, c = o.color;
      q.weights = (x, y, z) => w(-x, y, z).map(([n, ww]) => [mirrorName(n), ww]);
      if (typeof c === 'function') q.color = (x, y, z) => c(-x, y, z);
      this.sdf.add(q);
    }
    return this;
  }
  _emitSdf() {
    const r = this.sdf.mesh(this.sdfCell, this.sdfTris); if (!r) return;
    const base = this.vcount, N = r.pos.length / 3;
    this.pos.push(...r.pos); this.nor.push(...r.nor); this.col.push(...r.col);
    for (const list of r.bones) {
      const si = [0, 0, 0, 0], sw = [0, 0, 0, 0];
      const keep = list.filter(([, w]) => w > 1e-3), tot = keep.reduce((a, [, w]) => a + w, 0) || 1;
      keep.forEach(([nm, w], i) => { const j = this.jointMap.get(nm); if (!j) throw new Error('Thiếu xương ' + nm); si[i] = j.index; sw[i] = w / tot; });
      this.si.push(...si); this.sw.push(...sw);
    }
    for (const i of r.idx) this.idx[0].push(base + i);
    this.vcount += N;
  }

  // ---- xuất ----
  build() {
    this._emitSdf();
    const bones = this.joints.map((j) => { const b = new THREE.Bone(); b.name = j.name; return b; });
    const root = new THREE.Group();
    root.name = this.id;
    this.joints.forEach((j, i) => {
      const local = j.pos.clone();
      if (j.parent) { local.sub(this.jointMap.get(j.parent).pos); bones[this.jointMap.get(j.parent).index].add(bones[i]); }
      else root.add(bones[i]);
      bones[i].position.copy(local);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    const all = [], mats = [];
    const body = new THREE.MeshStandardMaterial({ name: `${this.id}_body`, vertexColors: true, roughness: 0.62, metalness: 0.12 });
    const glow = new THREE.MeshStandardMaterial({ name: `${this.id}_glow`, vertexColors: true, roughness: 0.5, metalness: 0,
      emissive: new THREE.Color(this.glowColor), emissiveIntensity: 1 });
    [[0, body], [1, glow]].forEach(([k, m]) => {
      if (!this.idx[k].length) return;
      geo.addGroup(all.length, this.idx[k].length, mats.length);
      all.push(...this.idx[k]); mats.push(m);
    });
    geo.setIndex(all);
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const mesh = new THREE.SkinnedMesh(geo, mats);
    mesh.name = `${this.id}_body`;
    mesh.frustumCulled = false;
    root.add(mesh);
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    mesh.bind(skeleton);
    mesh.userData = { ...this.userData, heroId: this.id, unit: 'm', facing: '+Z' };
    return { root, mesh, skeleton, bones, tris: all.length / 3, verts: this.vcount };
  }
}
