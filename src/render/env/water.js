import * as THREE from 'three';

/** Dòng sông: mặt phẳng shader tối giản (không phản xạ): màu theo độ sâu, gợn sóng chạy, bọt ở mép. */
export function buildRiver(map) {
  const diag = !!map.river.diag, len = diag ? Math.hypot(map.w, map.h) + 3200 : map.h + 4400;
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime;
      float wave(vec2 p, float t){ return sin(p.x*0.021 + t*1.3) * sin(p.y*0.017 - t*0.9) + sin((p.x+p.y)*0.013 + t*0.7); }
      void main(){
        float edge = abs(vUv.x - 0.5) * 2.0;
        vec3 deep = vec3(0.05, 0.36, 0.48), shallow = vec3(0.16, 0.72, 0.70);
        vec3 col = mix(deep, shallow, smoothstep(0.0, 1.0, edge) * 0.9);
        float w = wave(vW.xz, uTime); col += vec3(0.06, 0.16, 0.14) * smoothstep(0.55, 1.0, w) ;
        float streak = smoothstep(0.92, 1.0, sin(vW.z*0.045 + sin(vW.x*0.03 + uTime*0.6)*2.0 - uTime*1.6));
        col += vec3(0.5, 0.85, 0.8) * streak * 0.35;
        float foam = smoothstep(0.86, 1.0, edge + 0.05*sin(vW.z*0.06 + uTime*2.0));
        col = mix(col, vec3(0.85, 1.0, 0.95), foam * 0.75);
        gl_FragColor = vec4(col, 0.94 - foam*0.1);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(map.river.width, len), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  if (diag) { m.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 4); m.position.set(map.w / 2, 1, map.h / 2); } // chảy theo đường chéo y = x
  else m.position.set(map.river.x, 3, map.h / 2);
  return { mesh: m, update: (t) => { mat.uniforms.uTime.value = t; } };
}
