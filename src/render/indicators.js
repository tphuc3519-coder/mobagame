import * as THREE from 'three';

// Chỉ báo ngắm kiểu Liên Quân, vẽ sát đất bằng shader theo đơn vị thế giới (nét sắc ở mọi cỡ):
// - vùng tầm: đĩa xanh trong mờ, đậm dần ra mép + viền sáng (thấy rõ chiêu "vùng rộng" tới đâu)
// - chiêu bắn thẳng (skillshot/line): dải rộng đúng bề ngang đạn, sáng dần về đầu, mũi tên nhọn, viền sáng
// - chiêu lướt/nhảy (dash, targetedDash, Chớp Bước): thân mảnh → lưỡi rộng có ô kim cương (chỗ đáp) + mũi nhọn
// - chiêu vùng tại điểm (aoeCircle/zone): vòng mục tiêu có tâm ngắm 4 mũi chụm vào; quạt (cone): hình quạt sáng dần ra mép
const OK = new THREE.Color(0x6fd6ff), BAD = new THREE.Color(0xff5a4a);
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const HEAD = `varying vec2 vUv; uniform vec3 uC; uniform float uA; uniform vec2 uSize;
float edge(float d, float w){ return 1.0 - smoothstep(0.0, w, abs(d)); }`;
const mk = (frag, extra = {}) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: OK.clone() }, uA: { value: 1 }, uSize: { value: new THREE.Vector2(1, 1) }, ...extra },
  vertexShader: VERT, fragmentShader: HEAD + frag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
});

// đĩa tầm: tâm (0.5,0.5), toạ độ chuẩn hoá theo bán kính
const RANGE = mk(`void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); if (r > 1.0) discard;
  float px = 2.0 / uSize.x; // 1 đơn vị thế giới theo bán kính
  float fill = 0.1 + 0.24 * pow(r, 4.0);
  float rim = edge(r - 1.0 + 7.0 * px, 7.0 * px) * 0.85 + edge(r - 1.0 + 26.0 * px, 3.0 * px) * 0.25;
  gl_FragColor = vec4(uC * (1.0 + rim * 0.6), (fill + rim) * uA); }`);
// vòng mục tiêu tại điểm: đĩa + viền + 4 mũi chụm vào tâm + chấm giữa
const RETICLE = mk(`void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); if (r > 1.0) discard;
  float px = 2.0 / uSize.x;
  float fill = 0.16 + 0.16 * r * r;
  float rim = edge(r - 1.0 + 6.0 * px, 6.0 * px);
  float a = atan(p.y, p.x + 1e-5), k = abs(mod(a + 0.785398, 1.570796) - 0.785398); // khoảng cách góc tới trục chéo gần nhất
  float arrows = step(0.36, r) * step(r, 0.62) * step(k * r, (0.62 - r) * 0.55 + 0.012);
  float ring2 = edge(r - 0.3, 4.0 * px) * 0.8 + step(r, 0.06) * 0.9;
  gl_FragColor = vec4(uC * (1.0 + (rim + arrows) * 0.5), (fill + rim * 0.9 + arrows * 0.75 + ring2) * uA); }`);
// mũi chiêu: x dọc theo hướng (0..L), y ngang (−W/2..W/2); uKind 0 = bắn thẳng, 1 = lướt (ô kim cương)
const ARROW = mk(`uniform float uKind; void main(){
  float L = uSize.x, W = uSize.y, x = vUv.x * L, y = (vUv.y - 0.5) * W, hw = W * 0.5;
  float tip = min(W * 0.9, L * 0.3);
  float a = 0.0, line = 0.0;
  if (uKind < 0.5) { // dải đạn + mũi tên
    float w = x < L - tip ? hw : hw * (L - x) / tip;
    float d = abs(y) - w; if (d > 0.0) discard;
    a = 0.16 + 0.3 * smoothstep(0.0, L, x);
    line = edge(d, 5.0) + edge(x - 1.0, 4.0) * 0.6;
  } else { // lướt: thân mảnh rồi nở thành lưỡi, ô kim cương ở chỗ đáp, mũi nhọn
    float b0 = L * 0.38, b1 = L - tip * 0.7;
    float w = x < b0 ? 7.0 : x < b1 ? mix(7.0, hw, smoothstep(b0, b1, x)) : hw * (L - x) / (L - b1);
    float d = abs(y) - w; if (d > 0.0) discard;
    a = 0.12 + 0.3 * smoothstep(b0, L, x);
    line = edge(d, 4.0) * step(b0 * 0.9, x);
    vec2 c = vec2(x - (L - tip * 1.25), y); float dm = abs(c.x) + abs(c.y) - hw * 0.62; // ô kim cương
    line += edge(dm, 5.0) + edge(dm + hw * 0.22, 3.0) * 0.6;
  }
  gl_FragColor = vec4(uC * (1.0 + line * 0.6), min(1.0, a + line * 0.9) * uA); }`, { uKind: { value: 0 } });
// quạt: x = khoảng cách chuẩn hoá, sáng dần ra mép cung, viền hai cạnh
const SECTOR = mk(`uniform float uHalf; void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x + 1e-5);
  if (r > 1.0 || abs(a) > uHalf) discard; float px = 2.0 / uSize.x;
  float rim = edge(r - 1.0 + 6.0 * px, 6.0 * px) + edge((uHalf - abs(a)) * r, 5.0 * px) * 0.8;
  gl_FragColor = vec4(uC * (1.0 + rim * 0.5), (0.2 + 0.3 * r * r + rim * 0.9) * uA); }`, { uHalf: { value: 0.78 } });

export function createIndicators(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const plane = (m, xOff = 0) => { const geo = new THREE.PlaneGeometry(1, 1); geo.translate(xOff, 0, 0); geo.rotateX(-Math.PI / 2); const o = new THREE.Mesh(geo, m); o.renderOrder = 3; o.frustumCulled = false; o.visible = false; g.add(o); return o; };
  const range = plane(RANGE), ret = plane(RETICLE), arrow = plane(ARROW, 0.5), sector = plane(SECTOR), self = plane(RANGE.clone());
  self.material.uniforms.uSize = { value: new THREE.Vector2(1, 1) };
  const all = [range, ret, arrow, sector, self];
  const put = (o, x, z, sx, sz, ang = 0) => { o.visible = true; o.position.set(x, 6, z); o.scale.set(sx, 1, sz); o.rotation.y = -ang; o.material.uniforms.uSize.value.set(sx, sz); };
  return {
    hide() { g.visible = false; },
    /** spec: { type, aim, range, width, radius, angle }; dir: {x,y} chuẩn hoá; point: {x,y} thế giới; cancel: bool */
    show(spec, origin, dir, point, cancel) {
      g.visible = true;
      for (const o of all) { o.visible = false; o.material.uniforms.uC.value.copy(cancel ? BAD : OK); }
      const ang = Math.atan2(dir.y, dir.x), t = spec.type, R = spec.range || 0;
      if (R && spec.aim !== 'none') put(range, origin.x, origin.y, R * 2, R * 2);
      if (t === 'skillshot' || t === 'line' || t === 'tether') {
        arrow.material.uniforms.uKind.value = 0; put(arrow, origin.x, origin.y, R, Math.max(70, (spec.width || 60) * (t === 'line' ? 1 : 1.2)), ang);
      } else if (t === 'dash' || t === 'targetedDash' || t === 'blink') {
        arrow.material.uniforms.uKind.value = 1; put(arrow, origin.x, origin.y, R, Math.max(110, (spec.width || 80) * 1.3), ang);
      } else if (t === 'cone') {
        sector.material.uniforms.uHalf.value = ((spec.angle || 90) * Math.PI) / 360; put(sector, origin.x, origin.y, R * 2, R * 2, ang);
      } else if (t === 'aoeCircle' || t === 'zone') {
        const r = spec.radius || 150; put(ret, point.x, point.y, r * 2, r * 2);
      } else if (t === 'aoeSelf') {
        const r = spec.radius || R || 300; put(self, origin.x, origin.y, r * 2, r * 2);
      } else if (t === 'allyTarget') {
        arrow.material.uniforms.uKind.value = 0; put(arrow, origin.x, origin.y, R, 50, ang);
      }
    },
  };
}
