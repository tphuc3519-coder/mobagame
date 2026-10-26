import * as THREE from 'three';
import { faceMaterial } from './face.js';

// Vật liệu nhân vật: đổ bóng kiểu hoạt hình (toon), chất vẽ tay, nháy trắng khi trúng đòn (02 §13.3). Không còn viền: viền đen "vỏ
// đảo" (vẽ thêm cả tướng một lượt) và viền sáng màu đội trong trận bị người chơi chê chướng mắt, lại làm mép tướng răng cưa / lốm đốm ở
// độ phân giải điện thoại → bỏ (phe nhận bằng màu thanh máu). Viền sáng còn dùng ở sảnh (showcase, rim nhỏ theo màu tướng).

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

// Chất "vẽ tay" theo loại chất liệu (thuộc tính _mat do tools/modelgen ghi): 0 vải, 1 da, 2 kim loại, 3 tóc, 4 da thuộc/gỗ, 5 phát sáng.
// Vệt cọ + vân vải theo toạ độ vật thể (bám bề mặt khi chuyển động), kim loại có dải sáng và điểm loé vẽ tay,
// tóc có vòng bóng, da có sắc ấm ở vùng tối. Không cần UV hay texture. Chỉ giữ vân to (≥ ~5 điểm ảnh trên tướng cao ~150 px): vân mịn
// cũ (×42 … ×90 mỗi mét) nhỏ hơn một điểm ảnh ở màn điện thoại → lấm tấm, nhấp nháy khi tướng chạy, tướng trông nhoè.
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
        float pn1 = pn3(vObj * 9.0), stroke = pn3(vec3(vObj.x * 14.0, vObj.y * 3.5, vObj.z * 14.0));
        if (vMat < 0.5) diffuseColor.rgb *= 0.89 + 0.16 * pn1 + 0.08 * (stroke - 0.5);
        else if (vMat < 1.5) diffuseColor.rgb *= 0.97 + 0.05 * pn1;
        else if (vMat < 2.5) diffuseColor.rgb *= 0.8 + 0.3 * stroke;
        else if (vMat < 3.5) diffuseColor.rgb *= 0.9 + 0.16 * pn3(vec3(vObj.x * 16.0, vObj.y * 3.0, vObj.z * 16.0));
        else if (vMat < 4.5) diffuseColor.rgb *= 0.88 + 0.16 * pn3(vec3(vObj.x * 10.0, vObj.y * 24.0, vObj.z * 10.0));`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a = diffuseColor.a;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Vv = normalize(vViewPosition); float ndv = saturate(dot(normal, Vv));
        float rimF = smoothstep(0.55, 1.0, 1.0 - ndv);
        totalEmissiveRadiance += rimColor * rimF * rimAmt + vec3(flashAmt);
        if (vMat > 0.5 && vMat < 1.5) totalEmissiveRadiance += diffuseColor.rgb * vec3(0.16, 0.06, 0.05) * (1.0 - ndv * 0.6);
        else if (vMat > 1.5 && vMat < 2.5) {
          float wob = (pn1 - 0.5) * 0.12, band = smoothstep(0.18, 0.3, normal.y + wob) * (1.0 - smoothstep(0.45, 0.6, normal.y + wob));
          float spec = pow(saturate(dot(reflect(-Vv, normal), normalize(vec3(0.35, 0.8, 0.5)))), 28.0);
          totalEmissiveRadiance += diffuseColor.rgb * band * 0.45 + vec3(1.0, 0.97, 0.9) * spec * 0.7 + diffuseColor.rgb * rimF * 0.3;
        } else if (vMat > 2.5 && vMat < 3.5) {
          float w = normal.y + (pn1 - 0.5) * 0.14, ring = smoothstep(0.3, 0.4, w) * (1.0 - smoothstep(0.52, 0.64, w));
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

function toPbr(m, u, envMap) { // giữ vật liệu PBR gốc của model (màu, normal, kim loại/nhám) + ánh sáng môi trường; vẫn có viền sáng phe và chớp khi trúng đòn
  const c = m.clone(); if (envMap) c.envMap = envMap; c.envMapIntensity = 0.85; patch(c, u);
  return c;
}

/** Không chiếu sáng: chỉ màu texture như hoạ sĩ vẽ; viền sáng phe tính ở vertex shader (cần pháp tuyến, có khi skinning). */
function toUnlit(m, u) {
  const c = new THREE.MeshBasicMaterial({ name: m.name, map: m.map, color: m.color.clone(), transparent: m.transparent, alphaTest: m.alphaTest });
  c.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = u.rim; sh.uniforms.flashAmt = u.flash; sh.uniforms.rimAmt = u.rimAmt;
    sh.vertexShader = 'varying float vRimF;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_SKINNING
        vRimF = smoothstep(0.55, 1.0, 1.0 - abs(dot(normalize(normalMatrix * objectNormal), normalize(-mvPosition.xyz))));
      #else
        vRimF = 0.0;
      #endif`);
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float flashAmt;\nuniform float rimAmt;\nvarying float vRimF;\n' + sh.fragmentShader
      .replace('#include <opaque_fragment>', 'outgoingLight += rimColor * vRimF * rimAmt + vec3(flashAmt);\n#include <opaque_fragment>')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a = diffuseColor.a;');
  };
  c.customProgramCacheKey = () => 'unit-unlit';
  return c;
}

/** Mỗi đơn vị có bản sao vật liệu riêng (clone một lần lúc spawn) để đổi độ chớp/độ trong suốt.
 *  shading (hero.art.json): 'toon' (mặc định, chất vẽ tay), 'pbr' (vật liệu gốc của model có texture, cần envMap ở cảnh không có scene.environment),
 *  'unlit' (chỉ màu texture). Model tô màu theo đỉnh (không phải MeshStandardMaterial) luôn dùng chất vẽ tay. rim: độ viền sáng màu rimHex
 *  (trong trận 0; sảnh dùng nhẹ). anisotropy: lọc texture xiên (model có ảnh) — nét hơn khi nhìn chéo từ camera trên cao. soft (trong trận): normal map nửa độ, kim loại/PBR nhám hơn — bớt lấp lánh. */
export function prepareUnitMaterials(object, rimHex = '#ffffff', { rim = 0, shading = 'toon', envMap = null, anisotropy = 1, soft = false, tint = null } = {}) {
  const u = { rim: { value: new THREE.Color(rimHex) }, flash: { value: 0 }, rimAmt: { value: rim } };
  const tc = tint ? new THREE.Color(tint) : null; // trang phục mùa (GĐ4b): nhân màu vật liệu — chỉ đổi uniform, không dịch lại shader; mặt (mắt) giữ nguyên
  const mats = [], faces = [];
  const meshes = [];
  object.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const src = [].concat(o.material);
    const list = src.map((m) => {
      if (/_face$/.test(m.name)) { const f = o.userData?.face || o.parent?.userData?.face; if (!f) { const k = m.clone(); k.visible = false; return k; } const fm = faceMaterial(f); faces.push(fm); return fm.material; }
      const c = !m.isMeshStandardMaterial ? (() => { const k = m.clone(); patch(k, u); return k; })()
        : shading === 'pbr' ? toPbr(m, u, envMap) : shading === 'unlit' ? toUnlit(m, u) : toToon(m, u);
      for (const t of [c.map, c.normalMap]) if (t && t.anisotropy < anisotropy) { t.anisotropy = anisotropy; t.needsUpdate = true; } // texture dùng chung giữa các bản sao: đặt một lần
      if (soft && c.normalMap) c.normalScale?.multiplyScalar(0.5); // trong trận tướng chỉ cao ~150 px: gờ normal map mịn thành chấm sáng lấp lánh
      if (soft && c.isMeshStandardMaterial) c.roughness = Math.max(c.roughness, 0.6);
      if (tc && c.color) c.color.multiply(tc);
      mats.push(c); return c;
    });
    o.material = Array.isArray(o.material) ? list : list[0];
  }
  return {
    uniforms: u,
    setFlash(v) { u.flash.value = v; },
    /** Chớp mắt (gọi mỗi khung hình). */
    update(dt) { for (const f of faces) f.update(dt); },
    setGhost(on) { for (const m of mats) { m.transparent = on; m.opacity = on ? 0.62 : 1; m.needsUpdate = true; } }, // trong bụi: mờ vừa phải, vẫn ghi chiều sâu để không lộ mặt trong tối
  };
}
