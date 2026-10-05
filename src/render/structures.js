import * as THREE from 'three';
import { buildMinionModel, loadMonsterModel, MINION_MODEL } from './monsterModels.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './env/textures.js';
import { wallStoneSurface, flagstoneSurface, roofTileSurface, marbleSurface, ashlarSurface, roofTileHD } from './env/surfaces.js';

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
      if (lan.core.material.emissive) lan.core.material.emissiveIntensity = 0.15 + 0.45 * f; else lan.core.material.color.copy(lan.base).multiplyScalar(0.8 + 1.4 * f); lan.halo.material.opacity = (lan.haloA ?? 0.9) * f; lan.shell.rotation.y += dt * 0.6; lan.shell.rotation.x += dt * 0.25;
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

const marbleMat = () => texMat('marble', marbleSurface, 0xf4f0e8);   // cẩm thạch trắng ngà có vân
const marbleDark = () => texMat('marble', marbleSurface, 0x6e6c78);
const glowMat = (team, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(TEAM_COL[team]).multiplyScalar(k), side: THREE.DoubleSide });
const ring = (r, tube, y, seg = 48) => at(new THREE.TorusGeometry(r, tube, 6, seg), 0, y, 0, Math.PI / 2);
/** Ống cong thon (gân lồng đèn, trụ chống cong). */
function rib(pts, r0, r1, seg = 16) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), g = new THREE.TubeGeometry(curve, seg, 1, 6, false);
  const p = g.attributes.position, uv = g.attributes.uv, cp = curve.getSpacedPoints(seg);
  for (let i = 0; i < p.count; i++) { const t = uv.getX(i), c = cp[Math.min(seg, Math.round(t * seg))], rr = r0 + (r1 - r0) * t; p.setXYZ(i, c.x + (p.getX(i) - c.x) * rr, c.y + (p.getY(i) - c.y) * rr, c.z + (p.getZ(i) - c.z) * rr); }
  g.computeVertexNormals(); return g;
}
/** Pha lê nhiều mặt: bát diện kéo dài + lõi sáng bên trong. */
function crystal(team, rx, ry) {
  const g = new THREE.Group(), base = new THREE.Color(TEAM_COL[team]);
  const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(rx, ry, rx);
  const outer = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color(0xffffff), 0.25), emissive: base.clone(), emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }));
  const ig = new THREE.OctahedronGeometry(1, 0); ig.scale(rx * 0.45, ry * 0.6, rx * 0.45);
  const inner = new THREE.Mesh(ig, new THREE.MeshBasicMaterial({ color: base.clone().lerp(new THREE.Color(0xffffff), 0.6).multiplyScalar(1.8) }));
  g.add(inner, outer);
  return { object: g, core: outer, base };
}

// —— vật liệu "người lớn" cho công trình: đá khối xây có pháp tuyến (nổi mạch, vết đục), đồng thau cổ, ngói men có pháp tuyến ——
const STD = {};
const stoneStd = (color) => (STD['s' + color] ||= (() => { const a = ashlarSurface(); return new THREE.MeshStandardMaterial({ map: a.map, normalMap: a.normal, normalScale: new THREE.Vector2(1.3, 1.3), color, roughness: 0.9, metalness: 0 }); })());
const bronze = () => (STD.bronze ||= new THREE.MeshStandardMaterial({ color: 0xa07c44, roughness: 0.38, metalness: 0.92 }));
const roofStd = (team) => (STD['r' + team] ||= (() => { const t = roofTileHD(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: [0x2f8478, 0xa8382c][team], roughness: 0.42, metalness: 0.05 }); })());
const teamPlate = (team) => (STD['p' + team] ||= new THREE.MeshStandardMaterial({ color: [0x1f6e66, 0x8a2620][team], roughness: 0.55, metalness: 0.2 }));
const SH = (() => { const s = new THREE.Shape(); s.moveTo(-1, 1); s.lineTo(1, 1); s.lineTo(1, 0.1); s.quadraticCurveTo(0.9, -0.8, 0, -1.25); s.quadraticCurveTo(-0.9, -0.8, -1, 0.1); s.closePath(); return s; })();

export function createTower(team) {
  // Tháp canh đá khối: nền bát giác ba bậc đá xây lớn, 4 trụ ốp góc + 4 trụ chống xiên, thân hai tầng có gờ phào, lỗ châu mai dọc (ánh đèn
  // vàng bên trong), khiên huy hiệu màu đội viền đồng, ban công trên con-xơn có tường răng cưa, lồng đèn 4 gân đồng giữ pha lê màu đội,
  // mái ngói men cong hai tầng, chóp đồng. Đá thật (pháp tuyến), không còn bề mặt nhựa trắng.
  const g = new THREE.Group(), stone = [], dark = [], brz = [], glow = [], slit = [], plates = [];
  const S = 300; // cỡ lặp texture đá (đơn vị thế giới cho 1 ô texture)
  stone.push(octo(186, 202, 40, 20, 8, S), octo(160, 172, 34, 57, 8, S), octo(138, 148, 24, 86, 8, S));
  dark.push(octo(204, 206, 6, 3, 8, S));
  for (const [r, y] of [[188, 40], [162, 74], [140, 98]]) brz.push(at(new THREE.TorusGeometry(r, 2.2, 4, 8), 0, y, 0, Math.PI / 2, Math.PI / 8));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, rn = new THREE.PlaneGeometry(26, 6); rn.rotateY(-a + Math.PI / 2); rn.translate(Math.cos(a) * 154.5, 57, Math.sin(a) * 154.5); glow.push(rn); }
  for (let i = 0; i < 4; i++) { // 4 trụ ốp góc thân (pilaster) đầu đồng
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 112, z = Math.sin(a) * 112;
    stone.push(uvs(at(new THREE.BoxGeometry(34, 170, 34), x, 183, z, 0, -a), 0.12, 0.6)); dark.push(at(new THREE.BoxGeometry(42, 14, 42), x, 272, z, 0, -a));
    brz.push(at(new THREE.ConeGeometry(18, 26, 4), x, 292, z, 0, -a + Math.PI / 4));
    // trụ chống xiên từ nền lên thân trên
    stone.push(rib([[Math.cos(a) * 176, 60, Math.sin(a) * 176], [Math.cos(a) * 150, 200, Math.sin(a) * 150], [Math.cos(a) * 104, 360, Math.sin(a) * 104]], 22, 13, 12));
  }
  stone.push(octo(96, 108, 160, 178, 8, S));                                     // thân dưới
  dark.push(octo(112, 106, 14, 263, 8, S), octo(104, 112, 10, 274, 8, S));        // gờ phào giữa
  stone.push(octo(84, 96, 140, 349, 8, S));                                      // thân trên
  dark.push(octo(102, 92, 18, 428, 8, S));
  brz.push(at(new THREE.TorusGeometry(97, 2.4, 4, 8), 0, 270, 0, Math.PI / 2, Math.PI / 8), at(new THREE.TorusGeometry(87, 2.2, 4, 8), 0, 420, 0, Math.PI / 2, Math.PI / 8));
  for (let i = 0; i < 8; i++) { // con-xơn đỡ ban công
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, c = new THREE.BoxGeometry(18, 34, 30); c.translate(0, -17, 15); c.rotateX(0.5); c.rotateY(-a + Math.PI / 2); c.translate(Math.cos(a) * 96, 446, Math.sin(a) * 96); dark.push(c);
  }
  stone.push(octo(128, 118, 20, 446, 8, S));                                     // sàn ban công
  for (let i = 0; i < 16; i++) { if (i % 2) continue; const a = (i / 16) * Math.PI * 2 + Math.PI / 16, m = uvs(new THREE.BoxGeometry(34, 34, 18), 0.15, 0.15); m.rotateY(-a + Math.PI / 2); m.translate(Math.cos(a) * 120, 472, Math.sin(a) * 120); stone.push(m); }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + Math.PI / 16, m = new THREE.BoxGeometry(14, 14, 18); m.rotateY(-a + Math.PI / 2); m.translate(Math.cos(a) * 120, 460, Math.sin(a) * 120); stone.push(m); }
  for (const [y, r] of [[200, 102], [350, 90]]) for (let i = 0; i < 4; i++) { // lỗ châu mai dọc + ánh đèn bên trong
    const a = i * Math.PI / 2 + Math.PI / 8 + (y > 300 ? Math.PI / 4 : 0), f = new THREE.BoxGeometry(18, 64, 6); f.rotateY(-a + Math.PI / 2); f.translate(Math.cos(a) * (r - 1), y, Math.sin(a) * (r - 1)); dark.push(f);
    const w = new THREE.PlaneGeometry(8, 50); w.rotateY(-a + Math.PI / 2); w.translate(Math.cos(a) * (r + 2.6), y, Math.sin(a) * (r + 2.6)); slit.push(w);
  }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), sn = Math.sin(a); brz.push(rib([[c * 100, 476, sn * 100], [c * 114, 560, sn * 114], [c * 74, 640, sn * 74], [c * 30, 668, sn * 30]], 6, 4, 14)); }
  dark.push(octo(92, 98, 12, 664, 8, S));
  const r1 = uvs(curvedRoof(156, 76, 0.6), 7, 2); r1.translate(0, 667, 0);
  const r2 = uvs(curvedRoof(86, 70, 0.65), 4, 2); r2.translate(0, 745, 0);
  brz.push(at(new THREE.TorusGeometry(156, 3, 4, 8), 0, 669, 0, Math.PI / 2, Math.PI / 8), at(new THREE.CylinderGeometry(4, 10, 40, 8), 0, 830, 0), at(new THREE.ConeGeometry(7, 80, 8), 0, 888, 0), at(new THREE.TorusGeometry(11, 3, 6, 16), 0, 852, 0, Math.PI / 2));
  for (let i = 0; i < 2; i++) { // khiên huy hiệu hai mặt trước/sau
    const a = i * Math.PI + Math.PI / 2 + Math.PI / 8, sg = new THREE.ExtrudeGeometry(SH, { depth: 4, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 2, bevelSegments: 1 }); sg.scale(26, 30, 1);
    const rim = sg.clone(); rim.scale(1.14, 1.12, 0.6);
    for (const [geo, list, dz] of [[sg, plates, 96], [rim, brz, 94]]) { const q = geo.clone(); q.rotateY(-a + Math.PI / 2); q.translate(Math.cos(a) * dz, 360, Math.sin(a) * dz); list.push(q); }
  }
  g.add(merged(stone, stoneStd(0xeae2d4)), merged(dark, stoneStd(0x7a7268)), merged(brz, bronze()), merged(plates, teamPlate(team)), new THREE.Mesh(mergeGeometries([r1, r2]), roofStd(team)));
  g.add(new THREE.Mesh(mergeGeometries(glow), glowMat(team, 1.25)), new THREE.Mesh(mergeGeometries(slit), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb860).multiplyScalar(1.3) })));
  for (let i = 0; i < 2; i++) { // phướn hai bên
    const a = i * Math.PI, bn = new THREE.Mesh(new THREE.PlaneGeometry(52, 180, 1, 6), bannerMat(team)); bn.geometry.translate(0, -90, 0);
    bn.position.set(Math.cos(a) * 124, 444, Math.sin(a) * 124 + 24); bn.rotation.y = a === 0 ? 0.25 : -0.25; g.add(bn);
  }
  const cr = crystal(team, 40, 78), halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: cr.base.clone(), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
  halo.scale.setScalar(240); cr.object.add(halo);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(64, 1.8, 6, 48), bronze()); orbit.rotation.x = 1.2; cr.object.add(orbit);
  const lan = { object: cr.object, core: cr.core, shell: orbit, halo, haloA: 0.6, base: cr.base, y0: 568 }; cr.object.position.y = 568; g.add(cr.object);
  g.traverse((m) => { if (m.isMesh && !m.material.transparent) { m.castShadow = false; m.receiveShadow = true; } });
  const flags = g.children.filter((c) => c.geometry?.type === 'PlaneGeometry');
  return finish(g, lan, (t) => { cr.core.rotation.y += 0.01; flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 2 + i) * 0.08; }); });
}

export function createCore(team) {
  // TẾ ĐÀN: đàn tế đá trắng ba tầng viền vàng, kênh sáng màu đội quanh mỗi tầng, bậc thang bốn phía, 8 cột đá đầu vàng có ấn sáng
  // nối tia năng lượng tới pha lê; bệ sen; cụm pha lê lớn (1 chính + 6 vệ tinh) lơ lửng xoay, 2 vòng phù văn vàng quay ngược chiều,
  // 4 cột phướn ở góc, cột sáng lên trời.
  const g = new THREE.Group(), stone = [], dark = [], gold = [], flag = [], glow = [];
  const tiers = [[540, 580, 60, 30], [430, 470, 70, 95], [320, 350, 70, 165]];
  for (const [rt, rb, h, y] of tiers) {
    stone.push(octo(rt, rb, h, y, 12, 160)); flag.push(uvs(at(new THREE.CircleGeometry(rt, 12), 0, y + h / 2 + 0.5, 0, -Math.PI / 2), rt / 300, rt / 300));
    gold.push(at(new THREE.TorusGeometry(rt + 2, 5, 6, 12), 0, y + h / 2, 0, Math.PI / 2, Math.PI / 12));
    const ch = new THREE.RingGeometry(rt - 40, rt - 28, 12, 1, Math.PI / 12); ch.rotateX(-Math.PI / 2); ch.translate(0, y + h / 2 + 1.5, 0); glow.push(ch);
  }
  for (let k = 0; k < 4; k++) { // bậc thang bốn phía + lan can vàng
    const a = k * Math.PI / 2;
    for (let i = 0; i < 6; i++) { const st = uvs(new THREE.BoxGeometry(200, 22, 50), 1, 0.15); st.translate(0, 11 + i * 33, 0); st.translate(0, 0, 600 - i * 46); st.rotateY(a); stone.push(st); }
  }
  const tops = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 490, z = Math.sin(a) * 490;
    stone.push(uvs(at(new THREE.BoxGeometry(56, 300, 56), x, 210, z, 0, -a), 0.4, 2.2));
    dark.push(at(new THREE.BoxGeometry(72, 26, 72), x, 70, z, 0, -a), at(new THREE.BoxGeometry(74, 22, 74), x, 365, z, 0, -a));
    gold.push(at(new THREE.ConeGeometry(30, 76, 4), x, 414, z, 0, -a + Math.PI / 4), at(new THREE.SphereGeometry(10, 10, 8), x, 460, z));
    const rn = new THREE.PlaneGeometry(22, 200); rn.translate(0, 0, 29); rn.rotateY(-a + Math.PI / 2); rn.translate(x, 210, z); glow.push(rn);
    tops.push([x, 460, z]);
  }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 600, z = Math.sin(a) * 600; dark.push(at(new THREE.CylinderGeometry(8, 10, 520, 6), x, 290, z)); gold.push(at(new THREE.SphereGeometry(14, 10, 8), x, 556, z)); }
  dark.push(octo(190, 230, 110, 255, 16, 120));
  gold.push(at(new THREE.TorusGeometry(232, 8, 6, 48), 0, 205, 0, Math.PI / 2), at(new THREE.TorusGeometry(192, 6, 6, 48), 0, 310, 0, Math.PI / 2));
  g.add(merged(stone, stoneStd(0xf2ebe0)), merged(dark, stoneStd(0x7a7268)), merged(gold, bronze()), merged(flag, flagMat()));
  g.add(new THREE.Mesh(mergeGeometries(glow), glowMat(team, 1.5)));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, bn = new THREE.Mesh(new THREE.PlaneGeometry(90, 300, 1, 6), bannerMat(team)); bn.geometry.translate(46, -150, 0); bn.position.set(Math.cos(a) * 600, 540, Math.sin(a) * 600); bn.rotation.y = -a; g.add(bn); }
  const petalGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(60, 80, 0, 230); s.quadraticCurveTo(-60, 80, 0, 0);
    const e = new THREE.ExtrudeGeometry(s, { depth: 12, bevelEnabled: true, bevelSize: 5, bevelThickness: 5, bevelSegments: 1, curveSegments: 6 }); e.translate(0, 0, -6); return e; })();
  const petals = [], col = team ? [0xf0a090, 0xc84a3a] : [0x9ff0e4, 0x36b2a2];
  for (const [n, R, tilt, y0, sc] of [[14, 200, 0.7, 300, 1], [12, 150, 0.42, 310, 0.85]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (sc < 1 ? 0.25 : 0); const p = petalGeo.clone(); p.scale(sc, sc, sc); p.rotateX(-tilt); p.rotateY(-a + Math.PI / 2); p.translate(Math.cos(a) * R, y0, Math.sin(a) * R); petals.push(p);
  }
  g.add(new THREE.Mesh(mergeGeometries(petals), new THREE.MeshLambertMaterial({ color: col[1], emissive: col[0], emissiveIntensity: 0.25 })));
  // cụm pha lê
  const lanG = new THREE.Group(); lanG.position.y = 640; g.add(lanG);
  const main = crystal(team, 170, 360); lanG.add(main.object);
  const sats = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = crystal(team, 40, 95); c.object.position.set(Math.cos(a) * 250, -180 + (i % 2) * 50, Math.sin(a) * 250); c.object.rotation.z = Math.cos(a) * 0.35; c.object.rotation.x = -Math.sin(a) * 0.35; lanG.add(c.object); sats.push(c); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: main.base.clone(), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); halo.scale.setScalar(900); lanG.add(halo);
  // vòng phù văn vàng (torus + bản khắc sáng)
  const rings = [0, 1].map((k) => {
    const rg = new THREE.Group(), R = 330 + k * 70; rg.add(new THREE.Mesh(new THREE.TorusGeometry(R, 7, 6, 96), bronze()));
    const plates = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, pl = new THREE.PlaneGeometry(36, 22); pl.rotateY(-a + Math.PI / 2); pl.translate(Math.cos(a) * R, 0, Math.sin(a) * R); plates.push(pl); }
    rg.add(new THREE.Mesh(mergeGeometries(plates), glowMat(team, 1.7))); rg.position.y = 640; g.add(rg); return rg;
  });
  // tia năng lượng từ 8 đầu cột tới pha lê
  const beamMat = new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const beams = tops.map(([x, y, z]) => { const L = Math.hypot(x, 640 - y, z), b = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, L, 6, 1, true), beamMat); b.position.set(x / 2, (y + 640) / 2, z / 2); b.lookAt(0, 640, 0); b.rotateX(Math.PI / 2); g.add(b); return b; });
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(40, 120, 3200, 16, 1, true), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  sky.position.y = 2000; g.add(sky);
  const lan = { object: lanG, core: main.core, shell: new THREE.Object3D(), halo, haloA: 0.45, base: main.base, y0: 640 };
  const flags = g.children.filter((c) => c.geometry?.type === 'PlaneGeometry');
  return finish(g, lan, (t, dt, dead) => {
    main.object.rotation.y += dt * 0.35; sats.forEach((c, i) => { c.object.rotation.y -= dt * (0.6 + i * 0.05); c.object.position.y = -180 + (i % 2) * 50 + Math.sin(t * 1.4 + i) * 14; });
    rings[0].rotation.set(0.25 * Math.sin(t * 0.3), t * 0.35, 0.18); rings[1].rotation.set(-0.2, -t * 0.25, 0.25 * Math.cos(t * 0.3));
    beamMat.opacity = dead ? 0 : 0.25 + 0.15 * Math.sin(t * 3); sky.visible = !dead; flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 1.8 + i) * 0.06; });
  });
}

/** SUỐI ĐÈN (chỗ hồi sinh) — khác hẳn trụ/tế đàn: sân thiêng tròn lát đá có vòng ấn sáng màu đội (đúng vùng hồi máu),
 *  giữa sân là đài phun sen ba tầng nước chảy tràn, trên đỉnh treo lơ lửng một chiếc đèn lồng giấy lục giác khổng lồ xoay chậm;
 *  vòng đèn đá quanh mép, hàng cột cổng có phướn màu đội ôm phía sau, linh hồn đom đóm bay xoắn lên. Lối vào (+Z) quay ra giữa bản đồ.
 *  scale: 1 ở 5v5 (vùng hồi 650), nhỏ hơn ở 1v1. */
export function createFountain(team, scale = 1) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g); g.scale.setScalar(scale);
  const C = new THREE.Color(TEAM_COL[team]), RT = 500;
  const stone = [], dark = [], gold = [], flag = [];
  // —— sân: nền lát đá tròn sát đất (tướng đi lại trên đó) + lan can đá thấp chỉ ở nửa sau, chừa trống phía trước (+Z) ——
  const behind = (a, lim) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI / 2) > lim; // xa hướng lối vào
  stone.push(octo(RT + 4, RT + 22, 8, 4, 48, 150));
  flag.push(uvs(at(new THREE.CircleGeometry(RT + 4, 48), 0, 8.5, 0, -Math.PI / 2), 2.8, 2.8));
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2; if (!behind(a, 1.95)) continue;
    const b = uvs(new THREE.BoxGeometry(70, 34, 26), 0.5, 0.25); b.rotateY(-a + Math.PI / 2); b.translate(Math.cos(a) * (RT + 10), 22, Math.sin(a) * (RT + 10)); stone.push(b);
    if (i % 3 === 0) { const c = uvs(new THREE.BoxGeometry(34, 58, 34), 0.3, 0.4); c.rotateY(-a); c.translate(Math.cos(a) * (RT + 10), 29, Math.sin(a) * (RT + 10)); dark.push(c); }
  }
  // —— đài phun sen ba tầng ——
  stone.push(octo(232, 244, 58, 29, 16, 120)); dark.push(octo(212, 212, 6, 60, 16, 120));
  stone.push(uvs(at(new THREE.CylinderGeometry(34, 56, 150, 12), 0, 110, 0), 2, 1)); // thân sen
  stone.push(octo(120, 66, 36, 186, 16, 80), octo(58, 26, 26, 276, 12, 60), uvs(at(new THREE.CylinderGeometry(18, 24, 70, 10), 0, 236, 0), 1, 0.6));
  gold.push(at(new THREE.TorusGeometry(238, 5, 6, 64), 0, 58, 0, Math.PI / 2), at(new THREE.TorusGeometry(120, 4, 6, 48), 0, 204, 0, Math.PI / 2), at(new THREE.TorusGeometry(58, 3, 6, 32), 0, 289, 0, Math.PI / 2));
  // —— đèn đá quanh mép sân (kiểu đèn đá chùa) ——
  const lampPos = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8; if (!behind(a, 1.5)) continue; // đèn đá hai bên + phía sau
    const x = Math.cos(a) * (RT - 34), z = Math.sin(a) * (RT - 34);
    stone.push(uvs(at(new THREE.CylinderGeometry(30, 38, 26, 6), x, 21, z), 0.6, 0.2), uvs(at(new THREE.CylinderGeometry(13, 16, 140, 6), x, 104, z), 0.4, 0.8), uvs(at(new THREE.CylinderGeometry(34, 26, 16, 6), x, 182, z), 0.6, 0.15));
    dark.push(at(new THREE.BoxGeometry(40, 46, 40), x, 217, z, 0, -a));
    const rf = curvedRoof(44, 26, 0.8); rf.translate(x, 240, z); dark.push(rf.index ? rf.toNonIndexed() : rf);
    gold.push(at(new THREE.SphereGeometry(7, 8, 6), x, 272, z));
    lampPos.push([x, 217, z, a]);
  }
  // —— hàng cột cổng ôm phía sau (−Z), dầm cong nối đầu cột ——
  const back = [-70, -35, 0, 35, 70].map((d) => d * Math.PI / 180 - Math.PI / 2); // 5 cột trên cung sau (−Z)
  const RP = RT + 70, tops = [];
  for (const a of back) {
    const x = Math.cos(a) * RP, z = Math.sin(a) * RP;
    stone.push(uvs(at(new THREE.BoxGeometry(56, 440, 56), x, 230, z, 0, -a), 0.45, 3));
    dark.push(at(new THREE.BoxGeometry(76, 34, 76), x, 17, z, 0, -a), at(new THREE.BoxGeometry(80, 26, 80), x, 460, z, 0, -a));
    gold.push(at(new THREE.ConeGeometry(26, 60, 4), x, 503, z, 0, -a + Math.PI / 4));
    tops.push([x, z]);
  }
  for (let i = 0; i + 1 < tops.length; i++) { // dầm ngang + mái ngói nhỏ trên dầm
    const [x1, z1] = tops[i], [x2, z2] = tops[i + 1], L = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    const bm = uvs(new THREE.BoxGeometry(L + 40, 30, 40), L / 120, 0.25); bm.rotateY(-ang); bm.translate((x1 + x2) / 2, 430, (z1 + z2) / 2); dark.push(bm);
  }
  { const fl = merged(flag, flagMat()), st = merged(stone, stoneMat()); fl.receiveShadow = st.receiveShadow = true; g.add(st, merged(dark, stoneMatDark()), merged(gold, M.gold), fl); }
  // phướn màu đội giữa các cột (đung đưa)
  const banners = [];
  for (let i = 0; i + 1 < tops.length; i++) {
    const [x1, z1] = tops[i], [x2, z2] = tops[i + 1], bn = new THREE.Mesh(new THREE.PlaneGeometry(70, 260, 1, 6), bannerMat(team));
    bn.geometry.translate(0, -130, 0); bn.position.set((x1 + x2) / 2, 410, (z1 + z2) / 2); bn.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(bn); banners.push(bn);
  }
  // —— vòng ấn sáng trên sân (đúng vùng hồi máu) + hoa văn sen mờ giữa sân ——
  const U = { uT: { value: 0 }, uC: { value: C.clone() } };
  const rune = new THREE.Mesh(new THREE.RingGeometry(RT - 110, RT - 30, 96, 1), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5); float k = (r - ${RT - 110}.0) / 80.0;
        float edge = smoothstep(0.0, 0.08, k) * smoothstep(1.0, 0.92, k);
        float lines = smoothstep(0.06, 0.0, abs(k - 0.18)) + smoothstep(0.06, 0.0, abs(k - 0.82));
        float glyph = step(0.55, fract(a * 24.0 / 6.2832)) * step(0.3, k) * step(k, 0.7) * step(0.35, fract(a * 72.0 / 6.2832 + k));
        float pulse = 0.6 + 0.4 * sin(uT * 1.6 - a * 2.0);
        float v = (lines + glyph * 0.8) * edge * pulse;
        gl_FragColor = vec4(uC * (1.2 + v), v * 0.9); }` }));
  rune.rotation.x = -Math.PI / 2; rune.position.y = 9.5; g.add(rune);
  const mandala = new THREE.Mesh(new THREE.RingGeometry(250, RT - 120, 96, 1), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vP;
      void main(){ float r = length(vP) / ${RT - 120}.0, a = atan(vP.y, vP.x + 1e-5);
        float petal = abs(cos(a * 6.0)); float shape = smoothstep(0.02, 0.0, abs(r - (0.78 + 0.2 * pow(petal, 3.0))));
        float v = shape * (0.5 + 0.5 * sin(uT * 2.0 + r * 10.0));
        gl_FragColor = vec4(uC * 1.4, v * 0.55); }` }));
  mandala.rotation.x = -Math.PI / 2; mandala.position.y = 9.2; g.add(mandala);
  // —— mặt nước ba tầng + màn nước chảy tràn ——
  const W = { uT: U.uT, uC: U.uC };
  const waterMat = new THREE.ShaderMaterial({ uniforms: W, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vP;
      void main(){ float r = length(vP); float w = sin(r * 0.11 - uT * 3.0) * 0.5 + 0.5; w = pow(w, 6.0);
        float c2 = sin(vP.x * 0.05 + uT) * sin(vP.y * 0.06 - uT * 1.3) * 0.5 + 0.5;
        vec3 deep = mix(vec3(0.05, 0.22, 0.3), uC * 0.5, 0.35), lit = mix(vec3(0.6, 0.95, 1.0), uC, 0.35);
        gl_FragColor = vec4(mix(deep, lit, w * 0.6 + c2 * 0.25) + vec3(0.9) * (w * c2) * (w * c2) * (w * c2), 0.86); }` });
  for (const [r, y] of [[214, 56], [112, 202], [52, 287]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), waterMat); m.rotation.x = -Math.PI / 2; m.position.y = y; g.add(m); }
  const fallMat = new THREE.ShaderMaterial({ uniforms: W, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vUv;
      void main(){ float x = vUv.x * 6.2832;
        float lines = 0.5 + 0.5 * sin(x * 38.0 + sin(x * 7.0) * 2.0) * sin(x * 23.0 + 1.3);       // sợi nước mảnh dọc
        float flow = 0.5 + 0.5 * sin((vUv.y * 9.0 + uT * 4.0) + sin(x * 11.0) * 2.0);             // nhịp chảy xuống
        float a = (0.05 + 0.28 * lines * lines * (0.4 + 0.6 * flow)) * smoothstep(0.0, 0.25, vUv.y) * (0.6 + 0.4 * vUv.y);
        gl_FragColor = vec4(mix(vec3(0.75, 0.94, 1.0), uC, 0.3) * (0.85 + 0.4 * lines * flow), a); }` });
  for (const [r0, r1, y0, y1] of [[121, 150, 186, 60], [59, 86, 276, 204]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, y0 - y1, 40, 1, true), fallMat); f.position.y = (y0 + y1) / 2; g.add(f); }
  // —— đèn lồng giấy lục giác khổng lồ treo lơ lửng trên đỉnh ——
  const lanG = new THREE.Group(); lanG.position.y = 470; g.add(lanG);
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(78, 78, 150, 6, 4, true), lanternPaperMat(team));
  { const p = paper.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 75, k = 1 + 0.32 * (1 - y * y); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } paper.geometry.computeVertexNormals(); }
  const frame = [at(new THREE.CylinderGeometry(70, 86, 18, 6), 0, 84, 0), at(new THREE.CylinderGeometry(86, 70, 18, 6), 0, -84, 0), at(new THREE.ConeGeometry(30, 50, 6), 0, 116, 0), at(new THREE.SphereGeometry(12, 8, 6), 0, -104, 0)];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; frame.push(at(new THREE.CylinderGeometry(3.5, 3.5, 160, 4), Math.cos(a) * 96, 0, Math.sin(a) * 96)); }
  lanG.add(paper, merged(frame, M.gold));
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(4, 12, 80, 6), clothMat[team]); tassel.position.y = -150; lanG.add(tassel);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: C.clone(), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 })); halo.scale.setScalar(720); lanG.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(70, 200, 900, 20, 1, true), new THREE.MeshBasicMaterial({ color: C.clone(), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 470; g.add(beam); // quầng sáng toả xuống mặt nước
  // quầng sáng ấm của đèn đá
  const warm = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lampPos.flatMap(([x, y, z]) => [x, y, z]), 3)),
    new THREE.PointsMaterial({ map: glowTexture(), color: 0xffb860, size: 150, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(warm);
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(1.6) });
  const wins = [];
  for (const [x, y, z, a] of lampPos) for (let k = 0; k < 4; k++) { const th = -a + k * Math.PI / 2, w = new THREE.PlaneGeometry(22, 26); w.rotateY(th); w.translate(x + Math.sin(th) * 20.5, y, z + Math.cos(th) * 20.5); wins.push(w); }
  g.add(new THREE.Mesh(mergeGeometries(wins), winMat)); // ô cửa giấy sáng của đèn đá
  // —— linh hồn đom đóm bay xoắn lên ——
  const NS = 70, sp = new Float32Array(NS * 3), seed = Array.from({ length: NS }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), r: 120 + ((i * 53) % 330), h: (i * 37) % 600, v: 40 + ((i * 29) % 60) }));
  const spirits = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ map: glowTexture(), color: C.clone().lerp(new THREE.Color(0xffffff), 0.35), size: 38, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  spirits.frustumCulled = false; g.add(spirits);
  let t = 0;
  return {
    object: root,
    update(dt) {
      t += dt; U.uT.value = t;
      lanG.rotation.y += dt * 0.25; lanG.position.y = 470 + Math.sin(t * 1.2) * 12; halo.material.opacity = 0.65 + 0.1 * Math.sin(t * 2.3);
      banners.forEach((b, i) => { b.rotation.x = Math.sin(t * 1.7 + i) * 0.07; });
      for (let i = 0; i < NS; i++) { const s = seed[i], h = (s.h + t * s.v) % 600, a = s.a + t * 0.35 + h * 0.004, r = s.r * (1 - h / 1400); sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = 60 + h; sp[i * 3 + 2] = Math.sin(a) * r; }
      spirits.geometry.attributes.position.needsUpdate = true;
    },
  };
}
const BANNER = {};
function bannerMat(team) { // phướn: vải màu đội, viền vàng, hình đèn lồng ở giữa
  if (BANNER[team]) return BANNER[team];
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
  const col = ['#2f9e90', '#c23c30'][team], dk = ['#1b5e56', '#7a2018'][team];
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, dk); gr.addColorStop(0.2, col); gr.addColorStop(1, dk); x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
  x.strokeStyle = '#e8c070'; x.lineWidth = 4; x.strokeRect(5, 5, 54, 238);
  x.fillStyle = '#f4dc98'; x.beginPath(); x.ellipse(32, 110, 15, 22, 0, 0, Math.PI * 2); x.fill(); x.fillRect(24, 84, 16, 5); x.fillRect(24, 131, 16, 5); x.fillRect(30, 136, 4, 18);
  x.beginPath(); x.moveTo(0, 244); x.lineTo(32, 256); x.lineTo(64, 244); x.lineTo(64, 256); x.lineTo(0, 256); x.closePath(); x.globalCompositeOperation = 'destination-out'; x.fill();
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return (BANNER[team] = new THREE.MeshLambertMaterial({ map: tx, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
}
function lanternPaperMat(team) { // giấy đèn màu đội sáng từ trong ra, nan tre, dải viền đậm trên/dưới, hoa sen giữa mỗi mặt
  const c = document.createElement('canvas'); c.width = 384; c.height = 192; const x = c.getContext('2d');
  const [lt, md, dk] = team ? ['#ffd2a0', '#ff6a3a', '#8a1e10'] : ['#d8fff4', '#3fd8c0', '#0f5a52'];
  const gr = x.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, dk); gr.addColorStop(0.12, md); gr.addColorStop(0.5, lt); gr.addColorStop(0.88, md); gr.addColorStop(1, dk);
  x.fillStyle = gr; x.fillRect(0, 0, 384, 192);
  x.fillStyle = '#e8c070'; x.fillRect(0, 14, 384, 4); x.fillRect(0, 174, 384, 4);
  x.strokeStyle = 'rgba(40,20,8,0.55)'; x.lineWidth = 3; for (let i = 0; i <= 6; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 192); x.stroke(); }
  for (let i = 0; i < 6; i++) { // hoa sen cách điệu
    const cx = i * 64 + 32, cy = 98; x.fillStyle = dk; x.globalAlpha = 0.55;
    for (let k = -2; k <= 2; k++) { x.save(); x.translate(cx, cy + 14); x.rotate(k * 0.42); x.beginPath(); x.ellipse(0, -16, 7, 18, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.globalAlpha = 1;
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tx, color: new THREE.Color(1.15, 1.15, 1.15), side: THREE.DoubleSide });
}

// Lính: người giấy bồi (kiếm/cung) đội nón, xe đá, người rơm khổng lồ mang đèn. Mỗi loại dùng chung hình học và vật liệu.
const geo = { body: new THREE.CylinderGeometry(18, 28, 70, 10), head: new THREE.SphereGeometry(19, 12, 10), stick: new THREE.CylinderGeometry(3, 3, 80, 5), box: new THREE.BoxGeometry(1, 1, 1), wheel: new THREE.CylinderGeometry(24, 24, 10, 12), hat: new THREE.ConeGeometry(30, 18, 12) };
const mats = {};
const paper = (team) => (mats['p' + team] ||= new THREE.MeshLambertMaterial({ color: team ? 0xe8806e : 0x6ad6c6 }));
const trim = (team) => (mats['t' + team] ||= new THREE.MeshLambertMaterial({ color: team ? 0x8a2a24 : 0x1f6a64 }));
const skin = new THREE.MeshLambertMaterial({ color: 0xf6e7d0 });
const straw = new THREE.MeshLambertMaterial({ color: 0xd8b86a });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1216 });

/** Lính dùng model SDF có xương (monsterModels.js); chưa nạp xong thì tạm dùng hình giấy bồi cũ rồi tự thay. */
export function createMinion(type, team) {
  const ready = buildMinionModel(type, team); if (ready) return ready;
  const root = new THREE.Group(), legacy = createLegacyMinion(type, team); root.add(legacy.object);
  let impl = legacy;
  loadMonsterModel(MINION_MODEL[type]).then(() => { const m = buildMinionModel(type, team); if (!m) return; root.remove(legacy.object); root.add(m.object); impl = m; });
  return { object: root, update: (dt, mv, atk) => impl.update(dt, mv, atk) };
}
function createLegacyMinion(type, team) {
  const g = new THREE.Group();
  const add = (geometry, mat, x, y, z, s = [1, 1, 1]) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(...s); g.add(m); return m; };
  let bob = 1;
  if (type === 'siege') {
    add(geo.box, M.wood, 0, 45, 0, [90, 30, 70]); for (const s of [1, -1]) add(geo.wheel, M.stoneDark, 0, 26, s * 42).rotation.x = Math.PI / 2;
    const arm = add(geo.stick, M.wood, 0, 90, 0, [1.4, 1, 1.4]); arm.rotation.z = 0.7; add(geo.head, paper(team), 30, 130, 0, [1.3, 1.3, 1.3]);
    bob = 0.3;
  } else if (type === 'giant') {
    add(geo.body, straw, 0, 100, 0, [2.6, 2.6, 2.6]); add(geo.head, straw, 0, 230, 0, [2.6, 2.6, 2.6]);
    add(geo.orb ||= new THREE.SphereGeometry(30, 10, 8), mats['o' + team] ||= new THREE.MeshBasicMaterial({ color: TEAM_COL[team] }), 0, 300, 0); // dùng chung: lính tạo liên tục, không được rò bộ nhớ GPU
  } else {
    add(geo.body, paper(team), 0, 40, 0); add(geo.head, skin, 0, 92, 0); add(geo.hat, trim(team), 0, 112, 0);
    for (const s of [1, -1]) add(geo.head, eyeMat, s * 7, 95, 16, [0.14, 0.2, 0.1]);
    add(geo.wheel, trim(team), 0, 58, 0, [0.95, 0.4, 0.95]);
    if (type === 'sword') { const s = add(geo.stick, M.gold, 28, 60, 12); s.rotation.x = 0.3; }
    else { const b = add(geo.bow ||= new THREE.TorusGeometry(24, 2.5, 4, 12, Math.PI), M.wood, 30, 62, 10); b.rotation.set(0, 0, Math.PI / 2); }
  }
  let t = (type.length * 1.7) % 6;
  return { object: g, update(dt, moving) { t += dt * (moving ? 10 : 2); g.position.y = Math.abs(Math.sin(t)) * (moving ? 5 : 1) * bob; } };
}
