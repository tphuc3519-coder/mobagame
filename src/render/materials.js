import * as THREE from 'three';

// Vật liệu nhân vật: đổ bóng kiểu hoạt hình (toon 4 nấc), viền sáng màu đội bằng shader (không vẽ sẵn trong texture),
// viền đen ngoài bằng "vỏ đảo" có bề dày cố định theo pixel, nháy trắng khi trúng đòn (02 §13.3).
export const RIM = { self: '#ffe9a0', ally: '#5fe3d0', enemy: '#ff5a4a', neutral: '#b0b8d0' };

let ramp;
function gradientMap() {
  if (!ramp) {
    // 2 tông kiểu anime (sáng / bóng) với ranh giới mềm, bóng không quá tối để mặt không loang lổ
    const N = 32, a = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const t = i / (N - 1), s = Math.min(1, Math.max(0, (t - 0.36) / 0.12)); a[i] = Math.round(255 * (0.6 + 0.4 * s * s * (3 - 2 * s))); }
    ramp = new THREE.DataTexture(a, N, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.LinearFilter; ramp.needsUpdate = true;
  }
  return ramp;
}

/** Độ dày viền tính theo pixel màn hình; cập nhật khi đổi kích thước. */
export const OUTLINE = { ndc: { value: new THREE.Vector2(0.004, 0.004) }, px: 1.2 };
export function setOutlineResolution(w, h) { OUTLINE.ndc.value.set((OUTLINE.px * 2) / w, (OUTLINE.px * 2) / h); }

function patch(mat, u) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = u.rim; sh.uniforms.flashAmt = u.flash; sh.uniforms.rimAmt = u.rimAmt;
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float flashAmt;\nuniform float rimAmt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n float rimF = smoothstep(0.55, 1.0, 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))));\n totalEmissiveRadiance += rimColor * rimF * rimAmt + vec3(flashAmt);');
  };
  mat.customProgramCacheKey = () => 'unit-toon-rim';
}

function toToon(m, u) {
  const t = new THREE.MeshToonMaterial({ color: m.color.clone(), vertexColors: m.vertexColors, emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity * (m.emissive.getHex() ? 2.2 : 1), gradientMap: gradientMap() }); // phần phát sáng mạnh hơn để bloom chỉ bắt chỗ này
  t.name = m.name; patch(t, u);
  return t;
}

function outlineMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: 0x120e1a, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.outlineNdc = OUTLINE.ndc;
    sh.vertexShader = 'uniform vec2 outlineNdc;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n vec3 nV = normalize(normalMatrix * objectNormal);\n vec2 nOff = (projectionMatrix * vec4(nV, 0.0)).xy;\n if (length(nOff) > 1e-5) gl_Position.xy += normalize(nOff) * outlineNdc * gl_Position.w;');
  };
  m.customProgramCacheKey = () => 'unit-outline';
  return m;
}
const outlineMat = outlineMaterial();

/** Mỗi đơn vị có bản sao vật liệu riêng (clone một lần lúc spawn) để đổi màu viền/độ trong suốt. */
export function prepareUnitMaterials(object, rimHex, { outline = true, rim = 0.8 } = {}) {
  const u = { rim: { value: new THREE.Color(rimHex) }, flash: { value: 0 }, rimAmt: { value: rim } };
  const mats = [], outlines = [];
  const meshes = [];
  object.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const src = [].concat(o.material);
    const list = src.map((m) => { const c = m.isMeshStandardMaterial ? toToon(m, u) : (() => { const k = m.clone(); patch(k, u); return k; })(); mats.push(c); return c; });
    o.material = Array.isArray(o.material) ? list : list[0];
    if (outline && o.isSkinnedMesh) { // viền đen: bản sao cùng xương, mặt trong, đẩy ra theo pháp tuyến
      const ol = new THREE.SkinnedMesh(o.geometry, src.length > 1 ? src.map(() => outlineMat) : outlineMat);
      ol.bind(o.skeleton, o.bindMatrix); ol.frustumCulled = false; ol.renderOrder = -1;
      o.parent.add(ol); outlines.push(ol);
    }
  }
  return {
    uniforms: u,
    setFlash(v) { u.flash.value = v; },
    setGhost(on) { for (const m of mats) { m.transparent = on; m.opacity = on ? 0.35 : 1; m.depthWrite = !on; m.needsUpdate = true; } for (const ol of outlines) ol.visible = !on; },
  };
}
