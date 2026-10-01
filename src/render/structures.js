import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './env/textures.js';
import { wallStoneSurface, flagstoneSurface, roofTileSurface } from './env/surfaces.js';

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
      if (lan.core.material.emissive) lan.core.material.emissiveIntensity = 0.15 + 0.45 * f; else lan.core.material.color.copy(lan.base).multiplyScalar(0.8 + 1.4 * f); lan.halo.material.opacity = 0.9 * f; lan.shell.rotation.y += dt * 0.6; lan.shell.rotation.x += dt * 0.25;
      lan.object.position.y = lan.y0 + Math.sin(t * 1.6) * 8;
      extra(t, dt, dead);
      if (dead) { root.scale.y += (0.14 - root.scale.y) * Math.min(1, dt * 4); root.rotation.z += (0.22 - root.rotation.z) * Math.min(1, dt * 3); }
    },
  };
}

/** Nhân UV của hình học (để texture đá lặp đúng tỉ lệ trên khối to/nhỏ). */
const uvs = (g, sx, sy) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return g; };
const TEX = {};
const texMat = (key, make, color) => (TEX[key + color] ||= new THREE.MeshLambertMaterial({ map: make(), color }));
const blockStone = () => wallStoneSurface(false);
const stoneMat = () => texMat('block', blockStone, 0xe2dccf);
const stoneMatDark = () => texMat('block', blockStone, 0x8e887e);
const flagMat = () => texMat('flag', flagstoneSurface, 0xe0dad0);
const tileMat = (team) => texMat('roof' + team, roofTileSurface, [0x4ab8a6, 0xd0503e][team]); // ngói men màu đội
/** Bát giác có UV quấn quanh theo chu vi (đá xếp lặp theo kích thước thật). */
const octo = (rTop, rBot, h, y, seg = 8, sTile = 140) => uvs(at(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1), 0, y, 0), (2 * Math.PI * rBot) / (sTile * 1.6), h / sTile);

export function createTower(team) {
  // Tháp canh đá: bệ ba bậc, thân đá xếp thon có 4 trụ chống, sàn lỗ châu mai, tầng đèn 4 cột đá, mái ngói cong màu đội, chóp đồng.
  const g = new THREE.Group(), stone = [], dark = [], gold = [], flag = [];
  stone.push(octo(150, 168, 34, 17), octo(128, 142, 30, 49), octo(110, 120, 26, 77));
  flag.push(at(new THREE.CircleGeometry(150, 8), 0, 34.5, 0, -Math.PI / 2), at(new THREE.CircleGeometry(128, 8), 0, 64.5, 0, -Math.PI / 2));
  stone.push(octo(66, 92, 300, 240));
  for (let i = 0; i < 4; i++) { // trụ chống nghiêng
    const a = i * Math.PI / 2 + Math.PI / 4, b = uvs(new THREE.BoxGeometry(34, 220, 40), 0.3, 1.6);
    b.rotateZ(0.16); b.rotateY(-a); b.translate(Math.cos(a) * 92, 180, Math.sin(a) * 92); stone.push(b);
  }
  for (const y of [100, 250]) dark.push(octo(y === 250 ? 80 : 92, y === 250 ? 80 : 92, 14, y));
  // sàn + lỗ châu mai
  dark.push(octo(104, 82, 34, 405)); stone.push(octo(108, 108, 16, 428));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, m = uvs(new THREE.BoxGeometry(40, 34, 22), 0.4, 0.3); m.rotateY(-a + Math.PI / 2); m.translate(Math.cos(a) * 96, 453, Math.sin(a) * 96); stone.push(m); }
  // tầng đèn: 4 cột đá + dầm
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; stone.push(uvs(at(new THREE.CylinderGeometry(11, 13, 150, 8), Math.cos(a) * 58, 510, Math.sin(a) * 58), 0.5, 1.2)); }
  dark.push(octo(84, 84, 16, 590));
  gold.push(at(new THREE.TorusGeometry(90, 4, 6, 32), 0, 600, 0, Math.PI / 2));
  const r1 = uvs(curvedRoof(118, 60, 0.55), 6, 2); r1.translate(0, 598, 0);
  const r2 = uvs(curvedRoof(70, 70, 0.6), 4, 2); r2.translate(0, 668, 0);
  gold.push(at(new THREE.ConeGeometry(9, 80, 6), 0, 778, 0), at(new THREE.SphereGeometry(14, 10, 8), 0, 735, 0));
  g.add(merged(stone, stoneMat()), merged(dark, stoneMatDark()), merged(gold, M.gold), merged(flag, flagMat()));
  g.add(new THREE.Mesh(mergeGeometries([r1, r2]), tileMat(team)));
  // cờ phướn màu đội hai bên
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(36, 150), clothMat[team]); b.position.set(s * 112, 300, 40); b.rotation.y = s * 0.3; g.add(b); }
  const lan = lanternCore(team, 32); lan.y0 = 512; lan.object.position.y = 512; g.add(lan.object);
  const flags = g.children.filter((c) => c.geometry?.type === 'PlaneGeometry');
  return finish(g, lan, (t) => { flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 2 + i) * 0.08; }); });
}

export function createCore(team) {
  // TẾ ĐÀN (nhà chính): đàn tế đá ba tầng rất lớn (đường kính ~1100), bậc thang bốn phía, vòng 8 cột đá khắc ấn phát sáng màu đội,
  // bệ sen giữa đàn, viên pha lê khổng lồ lơ lửng xoay chậm, vòng vàng quay quanh, cột sáng lên trời. To gấp ~3 trụ thường.
  const g = new THREE.Group(), stone = [], dark = [], gold = [], flag = [], glow = [];
  const tiers = [[540, 580, 60, 30], [430, 470, 70, 95], [320, 350, 70, 165]];
  for (const [rt, rb, h, y] of tiers) { stone.push(octo(rt, rb, h, y, 12, 160)); flag.push(uvs(at(new THREE.CircleGeometry(rt, 12), 0, y + h / 2 + 0.5, 0, -Math.PI / 2), rt / 300, rt / 300)); }
  for (let k = 0; k < 4; k++) { // bậc thang bốn phía
    const a = k * Math.PI / 2;
    for (let i = 0; i < 6; i++) { const st = uvs(new THREE.BoxGeometry(200, 22, 50), 1, 0.15); st.translate(0, 11 + i * 33, 0); st.translate(0, 0, 600 - i * 46); st.rotateY(a); stone.push(st); }
  }
  // vòng 8 cột đá (trên tầng 1) có đầu vàng + ấn khắc phát sáng
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 490, z = Math.sin(a) * 490;
    stone.push(uvs(at(new THREE.BoxGeometry(56, 300, 56), x, 210, z, 0, -a), 0.4, 2.2));
    dark.push(at(new THREE.BoxGeometry(70, 26, 70), x, 70, z, 0, -a), at(new THREE.BoxGeometry(70, 20, 70), x, 365, z, 0, -a));
    gold.push(at(new THREE.ConeGeometry(30, 70, 4), x, 410, z, 0, -a + Math.PI / 4));
    const rn = new THREE.PlaneGeometry(26, 120); rn.translate(0, 0, 29); rn.rotateY(-a + Math.PI / 2); rn.translate(x, 220, z); glow.push(rn);
  }
  // trống đá + bệ sen giữa đàn
  dark.push(octo(190, 230, 110, 255, 16, 120));
  gold.push(at(new THREE.TorusGeometry(232, 8, 6, 48), 0, 205, 0, Math.PI / 2), at(new THREE.TorusGeometry(192, 6, 6, 48), 0, 310, 0, Math.PI / 2));
  g.add(merged(stone, stoneMat()), merged(dark, stoneMatDark()), merged(gold, M.gold), merged(flag, flagMat()));
  const runeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(TEAM_COL[team]).multiplyScalar(1.8), side: THREE.DoubleSide });
  g.add(new THREE.Mesh(mergeGeometries(glow), runeMat));
  const petalGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(60, 80, 0, 230); s.quadraticCurveTo(-60, 80, 0, 0);
    const e = new THREE.ExtrudeGeometry(s, { depth: 12, bevelEnabled: true, bevelSize: 5, bevelThickness: 5, bevelSegments: 1, curveSegments: 6 }); e.translate(0, 0, -6); return e; })();
  const petals = [], col = team ? [0xf0a090, 0xc84a3a] : [0x9ff0e4, 0x36b2a2];
  for (const [n, R, tilt, y0, sc] of [[14, 200, 0.7, 300, 1], [12, 150, 0.42, 310, 0.85]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (sc < 1 ? 0.25 : 0); const p = petalGeo.clone(); p.scale(sc, sc, sc); p.rotateX(-tilt); p.rotateY(-a + Math.PI / 2); p.translate(Math.cos(a) * R, y0, Math.sin(a) * R); petals.push(p);
  }
  g.add(new THREE.Mesh(mergeGeometries(petals), new THREE.MeshLambertMaterial({ color: col[1], emissive: col[0], emissiveIntensity: 0.25 })));
  // pha lê khổng lồ (bát diện kéo dài) thay cho đèn tròn
  const base = new THREE.Color(TEAM_COL[team]), cg = new THREE.OctahedronGeometry(1, 0); cg.scale(185, 360, 185);
  const lanG = new THREE.Group();
  const core = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: base.clone(), emissive: base.clone().multiplyScalar(0.45), emissiveIntensity: 0.6, flatShading: true, roughness: 0.15, metalness: 0.2 })); // pha lê nhiều mặt cắt: mặt sáng/tối rõ
  const shellG = new THREE.OctahedronGeometry(1, 1); shellG.scale(245, 440, 245);
  const shell = new THREE.Mesh(shellG, new THREE.MeshBasicMaterial({ color: base.clone(), transparent: true, opacity: 0.18, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: base.clone(), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); halo.scale.setScalar(760);
  lanG.add(core, shell, halo);
  const lan = { object: lanG, core, shell, halo, base, y0: 620 }; lanG.position.y = 620; g.add(lanG);
  const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(300 + i * 60, 8, 6, 72), M.gold); r.position.y = 620; g.add(r); return r; });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(40, 120, 3200, 16, 1, true), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 2000; g.add(beam);
  return finish(g, lan, (t, dt, dead) => { core.rotation.y += dt * 0.4; rings[0].rotation.set(t * 0.5, t * 0.3, 0); rings[1].rotation.set(-t * 0.35, 0, t * 0.45); rings[2].rotation.set(Math.PI / 2, t * 0.2, 0); beam.visible = !dead; runeMat.color.copy(base).multiplyScalar(dead ? 0.2 : 1.4 + 0.4 * Math.sin(t * 2)); });
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
