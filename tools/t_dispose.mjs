// Dọn GPU khi rời trận (render/dispose.js) bằng đồ giả kiểu vịt: hình khối dùng chung huỷ đúng một lần, ảnh trong uniform (kể cả mảng và
// uniform của chương trình), bỏ qua ảnh của render target, khung xương / lưới instanced, vật liệu không bị huỷ; giữ / nhả vật liệu đúng
// một thế hệ. Dùng: node tools/t_dispose.mjs
import { collectGpu, freeGpu, holdMaterials, releaseHeld, forgetHeld, heldCount } from '../src/render/dispose.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const spy = (o = {}) => { o.n = 0; o.dispose = () => o.n++; return o; };
const tex = (rt = false) => spy({ isTexture: true, isRenderTargetTexture: rt });
const node = (o) => ({ ...o, traverse(f) { f(this); for (const c of this.children || []) c.traverse ? c.traverse(f) : f(c); } });

const g = spy(), t1 = tex(), t2 = tex(), t3 = tex(), t4 = tex(), trt = tex(true), tp = tex();
const m1 = spy({ map: t1, normalMap: trt }), m2 = spy({ uniforms: { a: { value: t2 }, b: { value: [t3, null] } } }), m3 = spy({ envMap: t4 });
const sk = spy(), inst = spy({ isInstancedMesh: true, geometry: spy(), material: m1 });
const root = node({ children: [node({ geometry: g, material: m1 }), node({ geometry: g, material: [m2, m3] }), node({ isSkinnedMesh: true, skeleton: sk, geometry: spy(), material: m1 }), inst] });
const progU = (m) => (m === m3 ? { custom: { value: tp } } : null);
const c = collectGpu([root], undefined, progU);
ok('gom: hình khối dùng chung một lần, đủ vật liệu', c.geometries.size === 3 && c.materials.size === 3, `${c.geometries.size} ${c.materials.size}`);
ok('gom: ảnh trong thuộc tính, uniform, mảng uniform, uniform của chương trình; bỏ ảnh render target', [t1, t2, t3, t4, tp].every((t) => c.textures.has(t)) && !c.textures.has(trt));
freeGpu(c);
ok('trả: hình khối dùng chung huỷ đúng 1 lần', g.n === 1);
ok('trả: khung xương + lưới instanced huỷ 1 lần, ảnh huỷ 1 lần', sk.n === 1 && inst.n === 1 && t1.n === 1 && tp.n === 1 && trt.n === 0);
ok('trả: vật liệu KHÔNG bị huỷ', m1.n === 0 && m2.n === 0 && m3.n === 0);
holdMaterials([m1, m2, m3]); ok('giữ 3 vật liệu', heldCount() === 3);
releaseHeld(new Set([m1])); ok('nhả: huỷ đúng phần không còn dùng (m2, m3), giữ m1', m1.n === 0 && m2.n === 1 && m3.n === 1 && heldCount() === 0);
const a = spy(), b = spy(), d = spy(); holdMaterials([a, b]); holdMaterials([b, d]);
ok('giữ bộ mới khi đang giữ bộ cũ: huỷ phần cũ không trùng', a.n === 1 && b.n === 0 && d.n === 0 && heldCount() === 2);
forgetHeld(); ok('bỏ bộ giữ không huỷ gì', b.n === 0 && d.n === 0 && heldCount() === 0);
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
