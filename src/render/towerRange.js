import * as THREE from 'three';

// Vòng tầm bắn trụ địch (như Liên Quân): đến gần trụ địch thì hiện viền tầm bắn trên mặt đất — vàng nhạt khi còn ở ngoài,
// đỏ khi đã ở trong tầm; trụ đang nhắm vào mình thì viền đỏ đập mạnh + tia đỏ trên đất từ trụ tới chân mình.
const NEAR = 650; // hiện khi cách mép tầm bắn < NEAR

export function createTowerRanges(scene) {
  const g = new THREE.Group(); scene.add(g);
  const rings = new Map();
  const ringMat = () => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0 }, uIn: { value: 0 }, uHot: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uA, uIn, uHot; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5);
        vec3 out_ = vec3(1.0, 0.86, 0.45), in_ = vec3(1.0, 0.22, 0.16), c = mix(out_, in_, uIn);
        float pulse = 1.0 + uHot * (0.6 + 0.6 * sin(uT * 9.0));
        float edge = smoothstep(0.975, 0.993, r) * smoothstep(1.0, 0.993, r);                 // viền sắc
        float dash = 0.55 + 0.45 * step(0.5, fract(a * 36.0 / 6.2832 - uT * 0.25));            // vạch chạy quanh viền
        float fill = smoothstep(0.8, 1.0, r) * (0.05 + 0.12 * uIn + 0.12 * uHot);              // loang vào trong
        float v = (edge * dash * 1.25 + fill) * uA * pulse;
        gl_FragColor = vec4(c * (1.0 + edge * 0.6), clamp(v, 0.0, 1.0)); }` });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beamMat); beam.rotation.order = 'YXZ'; beam.visible = false; beam.renderOrder = 4; g.add(beam);
  let t = 0;
  return {
    update(world, player, dt) {
      t += dt; beam.visible = false;
      for (const s of world.entities) {
        if (!s.structure || (s.kind !== 'tower' && s.kind !== 'core') || s.team === player.team) continue;
        let ring = rings.get(s.id);
        const R = s.stats.range + player.radius, d = Math.hypot(player.pos.x - s.pos.x, player.pos.y - s.pos.y);
        const show = s.alive && player.alive && d < R + NEAR;
        if (!show) { if (ring) ring.visible = false; continue; }
        if (!ring) { ring = new THREE.Mesh(new THREE.CircleGeometry(1, 128), ringMat()); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 3; g.add(ring); rings.set(s.id, ring); }
        const inside = d <= R, hot = s.streakTarget === player.id && inside, U = ring.material.uniforms;
        ring.visible = true; ring.scale.set(R, R, 1); ring.position.set(s.pos.x, 9, s.pos.y);
        U.uT.value = t; U.uA.value = Math.min(1, (R + NEAR - d) / (NEAR * 0.6)); U.uIn.value += ((inside ? 1 : 0) - U.uIn.value) * Math.min(1, dt * 8); U.uHot.value += ((hot ? 1 : 0) - U.uHot.value) * Math.min(1, dt * 10);
        if (hot) { // tia nhắm từ trụ tới mình
          const dx = player.pos.x - s.pos.x, dz = player.pos.y - s.pos.y;
          beam.visible = true; beam.scale.set(d, 26, 1); beam.rotation.set(-Math.PI / 2, -Math.atan2(dz, dx), 0); beam.position.set(s.pos.x + dx / 2, 10, s.pos.y + dz / 2);
          beamMat.opacity = 0.35 + 0.25 * Math.sin(t * 9);
        }
      }
    },
  };
}
