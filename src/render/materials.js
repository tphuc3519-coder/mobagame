import * as THREE from 'three';
import { faceMaterial } from './face.js';

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

// Chất "vẽ tay" theo loại chất liệu (thuộc tính _mat do tools/modelgen ghi): 0 vải, 1 da, 2 kim loại, 3 tóc, 4 da thuộc/gỗ, 5 phát sáng.
// Vệt cọ + vân vải theo toạ độ vật thể (bám bề mặt khi chuyển động), kim loại có dải sáng và điểm loé vẽ tay,
// tóc có vòng bóng, da có sắc ấm ở vùng tối. Không cần UV hay texture.
const PAINT_V = `attribute float _mat;
varying float vMat; varying vec3 vObj;`;
const PAINT_F = `varying float vMat; varying vec3 vObj;
float ph3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float pn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(ph3(i), ph3(i + vec3(1,0,0)), f.x), mix(ph3(i + vec3(0,1,0)), ph3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(ph3(i + vec3(0,0,1)), ph3(i + vec3(1,0,1)), f.x), mix(ph3(i + vec3(0,1,1)), ph3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function patch(mat, u) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = u.rim; sh.uniforms.flashAmt = u.flash; sh.uniforms.rimAmt = u.rimAmt;
    sh.vertexShader = PAINT_V + '\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMat = _mat; vObj = position;');
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float flashAmt;\nuniform float rimAmt;\n' + PAINT_F + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float pn1 = pn3(vObj * 9.0), pn2 = pn3(vObj * 42.0), stroke = pn3(vec3(vObj.x * 14.0, vObj.y * 3.5, vObj.z * 14.0));
        if (vMat < 0.5) diffuseColor.rgb *= 0.88 + 0.16 * pn1 + 0.08 * (stroke - 0.5) + 0.05 * (pn2 - 0.5);
        else if (vMat < 1.5) diffuseColor.rgb *= 0.97 + 0.05 * pn1;
        else if (vMat < 2.5) diffuseColor.rgb *= 0.8 + 0.3 * stroke;
        else if (vMat < 3.5) diffuseColor.rgb *= 0.86 + 0.22 * pn3(vec3(vObj.x * 60.0, vObj.y * 6.0, vObj.z * 60.0));
        else if (vMat < 4.5) diffuseColor.rgb *= 0.85 + 0.2 * pn3(vec3(vObj.x * 30.0, vObj.y * 90.0, vObj.z * 30.0));`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a = diffuseColor.a;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Vv = normalize(vViewPosition); float ndv = saturate(dot(normal, Vv));
        float rimF = smoothstep(0.55, 1.0, 1.0 - ndv);
        totalEmissiveRadiance += rimColor * rimF * rimAmt + vec3(flashAmt);
        if (vMat > 0.5 && vMat < 1.5) totalEmissiveRadiance += diffuseColor.rgb * vec3(0.16, 0.06, 0.05) * (1.0 - ndv * 0.6);
        else if (vMat > 1.5 && vMat < 2.5) {
          float wob = (pn2 - 0.5) * 0.12, band = smoothstep(0.18, 0.3, normal.y + wob) * (1.0 - smoothstep(0.45, 0.6, normal.y + wob));
          float spec = pow(saturate(dot(reflect(-Vv, normal), normalize(vec3(0.35, 0.8, 0.5)))), 28.0);
          totalEmissiveRadiance += diffuseColor.rgb * band * 0.45 + vec3(1.0, 0.97, 0.9) * spec * 0.7 + diffuseColor.rgb * rimF * 0.3;
        } else if (vMat > 2.5 && vMat < 3.5) {
          float w = normal.y + (pn2 - 0.5) * 0.14, ring = smoothstep(0.3, 0.4, w) * (1.0 - smoothstep(0.52, 0.64, w));
          totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0), 0.55) * ring * 0.5;
        } else if (vMat > 3.5 && vMat < 4.5) {
          totalEmissiveRadiance += vec3(1.0, 0.9, 0.75) * pow(saturate(dot(reflect(-Vv, normal), normalize(vec3(0.35, 0.8, 0.5)))), 10.0) * 0.18;
        }`);
  };
  mat.customProgramCacheKey = () => 'unit-toon-paint';
}

function toToon(m, u) { // map/normalMap: model có texture (Mossback dùng ảnh); model tô màu theo đỉnh thì để trống
  const t = new THREE.MeshToonMaterial({ color: m.color.clone(), map: m.map, normalMap: m.normalMap, vertexColors: m.vertexColors, emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity * (m.emissive.getHex() ? 1.6 : 1), gradientMap: gradientMap() }); // phần phát sáng mạnh hơn để bloom chỉ bắt chỗ này
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
const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });

/** Mỗi đơn vị có bản sao vật liệu riêng (clone một lần lúc spawn) để đổi màu viền/độ trong suốt. */
export function prepareUnitMaterials(object, rimHex, { outline = true, rim = 0.8 } = {}) {
  const u = { rim: { value: new THREE.Color(rimHex) }, flash: { value: 0 }, rimAmt: { value: rim } };
  const mats = [], outlines = [], faces = [];
  const meshes = [];
  object.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const src = [].concat(o.material);
    const list = src.map((m) => {
      if (/_face$/.test(m.name)) { const f = o.userData?.face || o.parent?.userData?.face; if (!f) { const k = m.clone(); k.visible = false; return k; } const fm = faceMaterial(f); faces.push(fm); return fm.material; }
      const c = m.isMeshStandardMaterial ? toToon(m, u) : (() => { const k = m.clone(); patch(k, u); return k; })(); mats.push(c); return c;
    });
    o.material = Array.isArray(o.material) ? list : list[0];
    if (outline && o.isSkinnedMesh) { // viền đen: bản sao cùng xương, mặt trong, đẩy ra theo pháp tuyến
      const ol = new THREE.SkinnedMesh(o.geometry, src.length > 1 ? src.map((s) => (/_face$/.test(s.name) ? hiddenMat : outlineMat)) : outlineMat);
      ol.bind(o.skeleton, o.bindMatrix); ol.frustumCulled = false; ol.renderOrder = -1;
      o.parent.add(ol); outlines.push(ol);
    }
  }
  return {
    uniforms: u,
    setFlash(v) { u.flash.value = v; },
    /** Chớp mắt (gọi mỗi khung hình). */
    update(dt) { for (const f of faces) f.update(dt); },
    setGhost(on) { for (const m of mats) { m.transparent = on; m.opacity = on ? 0.35 : 1; m.depthWrite = !on; m.needsUpdate = true; } for (const ol of outlines) ol.visible = !on; },
  };
}
