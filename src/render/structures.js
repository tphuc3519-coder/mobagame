import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './env/textures.js';

// Công trình dựng bằng code (03 §C): tháp đèn đá mái cong hai tầng, nhà chính đèn lồng khổng lồ trên bệ sen,
// đài Suối Đèn có mặt nước sáng. Mỗi loại gộp hình học theo vật liệu để ít draw call.
export const TEAM_COL = [0x5fe3d0, 0xff6a4a];
const TEAM_ROOF = [0x2c7a72, 0x9a3328], TEAM_CLOTH = [0x3fb8a8, 0xd8453a];
const M = {
  stone: new THREE.MeshLambertMaterial({ color: 0xb8b2c4 }),
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x7e7890 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9a84a, roughness: 0.35, metalness: 0.85 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x6a3a26 }),
};
const roofMat = TEAM_ROOF.map((c) => new THREE.MeshLambertMaterial({ color: c }));
const clothMat = TEAM_CLOTH.map((c) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));

/** Mái cong 8 góc: lathe lõm, các góc hất lên (kiểu mái đình). */
function curvedRoof(r, h, flare = 0.35) {
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(r * (1 - t) + 4, h * Math.pow(t, 1.8))); }
  const g = new THREE.LatheGeometry(pts, 8, Math.PI / 8); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), a = Math.atan2(z, x);
    const corner = Math.pow(Math.abs(Math.cos(4 * a)), 6); // gần góc bát giác
    p.setY(i, p.getY(i) + corner * flare * h * Math.pow(rr / r, 3));
  }
  g.computeVertexNormals(); return g;
}
const at = (g, x, y, z, rx = 0, ry = 0, rz = 0) => { g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g; };
function merged(list, mat) { const m = new THREE.Mesh(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))), mat); return m; }

function lanternCore(team, r) {
  const g = new THREE.Group(), base = new THREE.Color(TEAM_COL[team]);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), new THREE.MeshBasicMaterial({ color: base.clone() }));
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.35, 1), new THREE.MeshBasicMaterial({ color: base.clone(), transparent: true, opacity: 0.25, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: base.clone(), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  halo.scale.setScalar(r * 6);
  g.add(core, shell, halo);
  return { object: g, core, shell, halo, base };
}

function finish(root, lan, extra = () => {}) {
  let t = 0;
  return {
    object: root,
    /** hp01: 0..1 để chập chờn khi yếu; dead: đã vỡ. */
    update(dt, hp01, dead) {
      t += dt;
      const f = dead ? 0.05 : hp01 < 0.3 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 22) * Math.sin(t * 7.3)) : 0.85 + 0.15 * Math.sin(t * 2.2);
      lan.core.material.color.copy(lan.base).multiplyScalar(0.8 + 1.4 * f); lan.halo.material.opacity = 0.9 * f; lan.shell.rotation.y += dt * 0.6; lan.shell.rotation.x += dt * 0.25;
      lan.object.position.y = lan.y0 + Math.sin(t * 1.6) * 8;
      extra(t, dt, dead);
      if (dead) { root.scale.y += (0.14 - root.scale.y) * Math.min(1, dt * 4); root.rotation.z += (0.22 - root.rotation.z) * Math.min(1, dt * 3); }
    },
  };
}

export function createTower(team) {
  const g = new THREE.Group(), stone = [], dark = [], gold = [], wood = [];
  // bệ bậc bát giác
  stone.push(at(new THREE.CylinderGeometry(120, 135, 30, 8), 0, 15, 0), at(new THREE.CylinderGeometry(100, 112, 26, 8), 0, 43, 0));
  // thân tháp thon, có đai chạm
  stone.push(at(new THREE.CylinderGeometry(62, 84, 250, 8), 0, 181, 0));
  for (const y of [70, 170, 300]) dark.push(at(new THREE.CylinderGeometry(y === 300 ? 72 : 88, y === 300 ? 72 : 88, 16, 8), 0, y, 0));
  gold.push(at(new THREE.TorusGeometry(76, 5, 6, 24), 0, 235, 0, Math.PI / 2));
  // mái dưới
  const r1 = curvedRoof(108, 50, 0.55); r1.translate(0, 318, 0);
  // tầng đèn: 4 cột gỗ + lan can
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; wood.push(at(new THREE.CylinderGeometry(6, 7, 150, 6), Math.cos(a) * 46, 460, Math.sin(a) * 46)); }
  dark.push(at(new THREE.CylinderGeometry(70, 74, 14, 8), 0, 390, 0));
  const r2 = curvedRoof(86, 64, 0.6); r2.translate(0, 535, 0);
  gold.push(at(new THREE.ConeGeometry(10, 70, 6), 0, 650, 0), at(new THREE.SphereGeometry(14, 10, 8), 0, 612, 0));
  g.add(merged(stone, M.stone), merged(dark, M.stoneDark), merged(gold, M.gold), merged(wood, M.wood));
  const roofs = new THREE.Mesh(mergeGeometries([r1, r2]), roofMat[team]); g.add(roofs);
  // cờ phướn màu đội hai bên
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(34, 130), clothMat[team]); b.position.set(s * 96, 200, 30); b.rotation.y = s * 0.3; g.add(b); }
  const lan = lanternCore(team, 34); lan.y0 = 462; lan.object.position.y = 462; g.add(lan.object);
  const flags = g.children.filter((c) => c.geometry?.type === 'PlaneGeometry');
  return finish(g, lan, (t) => { flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 2 + i) * 0.08; }); });
}

export function createCore(team) {
  const g = new THREE.Group(), stone = [], dark = [], gold = [];
  stone.push(at(new THREE.CylinderGeometry(190, 215, 40, 16), 0, 20, 0), at(new THREE.CylinderGeometry(165, 180, 30, 16), 0, 55, 0));
  dark.push(at(new THREE.CylinderGeometry(120, 150, 70, 16), 0, 105, 0));
  gold.push(at(new THREE.TorusGeometry(182, 6, 6, 40), 0, 70, 0, Math.PI / 2), at(new THREE.TorusGeometry(128, 5, 6, 40), 0, 140, 0, Math.PI / 2));
  g.add(merged(stone, M.stone), merged(dark, M.stoneDark), merged(gold, M.gold));
  // hai vòng cánh sen cong
  const petalGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(46, 60, 0, 170); s.quadraticCurveTo(-46, 60, 0, 0);
    const e = new THREE.ExtrudeGeometry(s, { depth: 10, bevelEnabled: true, bevelSize: 4, bevelThickness: 4, bevelSegments: 1, curveSegments: 6 }); e.translate(0, 0, -5); return e; })();
  const petals = [], col = team ? [0xf0a090, 0xd85a4a] : [0x9ff0e4, 0x46c2b2];
  for (const [n, R, tilt, y0, s] of [[12, 130, 0.62, 140, 1], [10, 95, 0.38, 150, 0.85]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (s < 1 ? 0.3 : 0); const p = petalGeo.clone(); p.scale(s, s, s); p.rotateX(-tilt); p.rotateY(-a + Math.PI / 2); p.translate(Math.cos(a) * R, y0, Math.sin(a) * R); petals.push(p);
  }
  const pm = new THREE.MeshLambertMaterial({ color: col[1], emissive: col[0], emissiveIntensity: 0.25 });
  g.add(new THREE.Mesh(mergeGeometries(petals), pm));
  const lan = lanternCore(team, 95); lan.y0 = 420; lan.object.position.y = 420; g.add(lan.object);
  // vòng vàng xoay quanh đèn
  const rings = [0, 1].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(150 + i * 25, 4, 6, 64), M.gold); r.position.y = 420; g.add(r); return r; });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(40, 95, 2600, 16, 1, true), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1600; g.add(beam);
  return finish(g, lan, (t, dt, dead) => { rings[0].rotation.set(t * 0.7, t * 0.4, 0); rings[1].rotation.set(-t * 0.5, 0, t * 0.6); beam.visible = !dead; });
}

export function createFountain(team) {
  const g = new THREE.Group();
  const stone = [at(new THREE.CylinderGeometry(260, 275, 30, 32), 0, 15, 0)], gold = [at(new THREE.TorusGeometry(262, 7, 6, 64), 0, 32, 0, Math.PI / 2)];
  stone.push(at(new THREE.TorusGeometry(245, 16, 8, 48), 0, 34, 0, Math.PI / 2));
  // trụ đèn quanh hồ
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; stone.push(at(new THREE.CylinderGeometry(14, 18, 120, 8), Math.sin(a) * 262, 90, Math.cos(a) * 262)); gold.push(at(new THREE.SphereGeometry(20, 10, 8), Math.sin(a) * 262, 160, Math.cos(a) * 262)); }
  // bệ giữa hình sen nhỏ
  stone.push(at(new THREE.CylinderGeometry(40, 60, 70, 16), 0, 45, 0));
  g.add(merged(stone, M.stone), merged(gold, M.gold));
  const wmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(TEAM_COL[team]) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vP; void main(){ float r = length(vP) / 240.0;
      float ring = 0.5 + 0.5 * sin(r * 38.0 - uT * 3.0); vec3 c = mix(uC * 0.5, uC * 1.3, ring * (1.0 - r)); gl_FragColor = vec4(c + vec3(0.15) * pow(ring, 8.0), 0.78); }` });
  const water = new THREE.Mesh(new THREE.CircleGeometry(240, 48), wmat); water.rotation.x = -Math.PI / 2; water.position.y = 30; g.add(water);
  // cột nước sáng ở giữa
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(10, 26, 160, 12, 1, true), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  jet.position.y = 160; g.add(jet);
  const lamps = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + 0.5; return [Math.sin(a) * 262, 165, Math.cos(a) * 262]; }).flat(), 3)),
    new THREE.PointsMaterial({ map: glowTexture(), color: TEAM_COL[team], size: 160, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(lamps);
  return { object: g, update(dt) { wmat.uniforms.uT.value += dt; jet.scale.y = 1 + Math.sin(wmat.uniforms.uT.value * 5) * 0.08; } };
}

// Lính: người giấy bồi (kiếm/cung) đội nón, xe đá, người rơm khổng lồ mang đèn. Mỗi loại dùng chung hình học và vật liệu.
const geo = { body: new THREE.CylinderGeometry(18, 28, 70, 10), head: new THREE.SphereGeometry(19, 12, 10), stick: new THREE.CylinderGeometry(3, 3, 80, 5), box: new THREE.BoxGeometry(1, 1, 1), wheel: new THREE.CylinderGeometry(24, 24, 10, 12), hat: new THREE.ConeGeometry(30, 18, 12) };
const mats = {};
const paper = (team) => (mats['p' + team] ||= new THREE.MeshLambertMaterial({ color: team ? 0xe8806e : 0x6ad6c6 }));
const trim = (team) => (mats['t' + team] ||= new THREE.MeshLambertMaterial({ color: team ? 0x8a2a24 : 0x1f6a64 }));
const skin = new THREE.MeshLambertMaterial({ color: 0xf6e7d0 });
const straw = new THREE.MeshLambertMaterial({ color: 0xd8b86a });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1216 });

export function createMinion(type, team) {
  const g = new THREE.Group();
  const add = (geometry, mat, x, y, z, s = [1, 1, 1]) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(...s); g.add(m); return m; };
  let bob = 1;
  if (type === 'siege') {
    add(geo.box, M.wood, 0, 45, 0, [90, 30, 70]); for (const s of [1, -1]) add(geo.wheel, M.stoneDark, 0, 26, s * 42).rotation.x = Math.PI / 2;
    const arm = add(geo.stick, M.wood, 0, 90, 0, [1.4, 1, 1.4]); arm.rotation.z = 0.7; add(geo.head, paper(team), 30, 130, 0, [1.3, 1.3, 1.3]);
    bob = 0.3;
  } else if (type === 'giant') {
    add(geo.body, straw, 0, 100, 0, [2.6, 2.6, 2.6]); add(geo.head, straw, 0, 230, 0, [2.6, 2.6, 2.6]);
    add(new THREE.SphereGeometry(30, 10, 8), new THREE.MeshBasicMaterial({ color: TEAM_COL[team] }), 0, 300, 0);
  } else {
    add(geo.body, paper(team), 0, 40, 0); add(geo.head, skin, 0, 92, 0); add(geo.hat, trim(team), 0, 112, 0);
    for (const s of [1, -1]) add(geo.head, eyeMat, s * 7, 95, 16, [0.14, 0.2, 0.1]);
    add(geo.wheel, trim(team), 0, 58, 0, [0.95, 0.4, 0.95]);
    if (type === 'sword') { const s = add(geo.stick, M.gold, 28, 60, 12); s.rotation.x = 0.3; }
    else { const b = add(new THREE.TorusGeometry(24, 2.5, 4, 12, Math.PI), M.wood, 30, 62, 10); b.rotation.set(0, 0, Math.PI / 2); }
  }
  let t = (type.length * 1.7) % 6;
  return { object: g, update(dt, moving) { t += dt * (moving ? 10 : 2); g.position.y = Math.abs(Math.sin(t)) * (moving ? 5 : 1) * bob; } };
}
