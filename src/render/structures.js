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
      void main(){ float r = length(vP), a = atan(vP.y, vP.x); float k = (r - ${RT - 110}.0) / 80.0;
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
      void main(){ float r = length(vP) / ${RT - 120}.0, a = atan(vP.y, vP.x);
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
        gl_FragColor = vec4(mix(deep, lit, w * 0.6 + c2 * 0.25) + vec3(0.9) * pow(w * c2, 3.0), 0.86); }` });
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
