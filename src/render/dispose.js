// Dọn bộ nhớ GPU khi rời trận (GĐ3 — đấu lại ngay trong trang). Không import three (duyệt theo kiểu vịt) để kiểm thử bằng node.
// Hình khối / ảnh / khung xương / lưới instanced: trả hết (three tải lại y nguyên từ dữ liệu còn trong bộ nhớ khi trận sau dùng lại).
// Vật liệu thì GIỮ một thế hệ: three r186 đếm tham chiếu chương trình shader theo từng vật liệu và khoá chương trình của ShaderMaterial theo
// mã số từng chặng shader (WebGLShaderStage) — huỷ vật liệu trước khi trận sau dịch xong là mất cả chương trình lẫn mã chặng ⇒ dịch lại từ
// đầu (khung đầu 66 s thay vì 16 s trên máy không GPU, iPhone 0,05–0,3 s mỗi shader). Nên: rời trận holdMaterials(...), trận sau dịch sẵn
// xong thì releaseHeld(vật liệu đang dùng) — chỉ huỷ những vật liệu cũ không còn dùng. Bất biến: lúc dọn, sân khấu sảnh (showcase) không tồn
// tại (đã huỷ ở màn tải trận) nên huỷ hình khối dùng chung của model tướng không ảnh hưởng ngữ cảnh khác.
/** progUniforms(m): uniform thật của chương trình (renderer.properties.get(m).uniforms) — bắt cả ảnh do onBeforeCompile gắn trong closure. */
export function collectGpu(roots, out = { geometries: new Set(), materials: new Set(), textures: new Set(), skeletons: new Set(), instanced: new Set() }, progUniforms = null) {
  const tex = (v) => { if (v && v.isTexture && !v.isRenderTargetTexture) out.textures.add(v); };
  const addMat = (m) => {
    if (!m || out.materials.has(m)) return; out.materials.add(m);
    for (const k of Object.keys(m)) tex(m[k]);
    for (const U of [m.uniforms, progUniforms?.(m)]) if (U) for (const u of Object.values(U)) { const v = u?.value; if (Array.isArray(v)) v.forEach(tex); else tex(v); }
  };
  const visit = (o) => {
    if (o.geometry) out.geometries.add(o.geometry);
    for (const m of [].concat(o.material || [])) addMat(m);
    addMat(o.customDepthMaterial); addMat(o.customDistanceMaterial);
    if (o.isSkinnedMesh && o.skeleton) out.skeletons.add(o.skeleton);
    if (o.isInstancedMesh) out.instanced.add(o);
  };
  for (const r of roots) { if (!r) continue; if (r.traverse) r.traverse(visit); else visit(r); }
  return out;
}
/** Trả bộ nhớ GPU của mọi thứ đã gom (vật liệu KHÔNG huỷ ở đây). */
export function freeGpu(c) {
  for (const o of c.instanced) o.dispose?.();
  for (const s of c.skeletons) s.dispose?.();
  for (const g of c.geometries) g.dispose?.();
  for (const t of c.textures) t.dispose?.();
}
let held = null;
/** Giữ vật liệu của trận vừa rời (chương trình shader còn sống cho trận sau). Đang giữ một bộ khác thì huỷ phần không trùng. */
export function holdMaterials(mats) { const set = new Set(mats); if (held) for (const m of held) if (!set.has(m)) m.dispose(); held = set; }
/** Trận sau đã dịch xong: huỷ vật liệu cũ không còn dùng. */
export function releaseHeld(live = new Set()) { if (!held) return; for (const m of held) if (!live.has(m)) m.dispose(); held = null; }
/** Bỏ bộ đang giữ mà không huỷ (ngữ cảnh WebGL đã bị bỏ — chương trình mất theo). */
export function forgetHeld() { held = null; }
export const heldCount = () => held?.size || 0;
