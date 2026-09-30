import * as THREE from 'three';

// Viền sáng theo màu đội thêm bằng shader (không vẽ sẵn trong texture) và nháy trắng khi trúng đòn (02 §13.3).
export const RIM = { self: '#ffe9a0', ally: '#5fe3d0', enemy: '#ff5a4a', neutral: '#b0b8d0' };

function patch(mat, u) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = u.rim; sh.uniforms.flashAmt = u.flash;
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float flashAmt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n float rimF = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);\n totalEmissiveRadiance += rimColor * rimF * 0.9 + vec3(flashAmt);');
  };
  mat.customProgramCacheKey = () => 'unit-rim';
}

/** Mỗi đơn vị có bản sao vật liệu riêng (clone một lần lúc spawn) để đổi màu viền/độ trong suốt. */
export function prepareUnitMaterials(object, rimHex) {
  const u = { rim: { value: new THREE.Color(rimHex) }, flash: { value: 0 } };
  const mats = [];
  object.traverse((o) => {
    if (!o.isMesh) return;
    const list = [].concat(o.material).map((m) => { const c = m.clone(); patch(c, u); mats.push(c); return c; });
    o.material = Array.isArray(o.material) ? list : list[0];
  });
  return {
    uniforms: u,
    setFlash(v) { u.flash.value = v; },
    setGhost(on) { for (const m of mats) { m.transparent = on; m.opacity = on ? 0.35 : 1; m.depthWrite = !on; m.needsUpdate = true; } },
  };
}
