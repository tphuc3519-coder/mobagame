import * as THREE from 'three';

// Mô hình công trình dựng từ khối (placeholder Mốc 3): tháp đèn đá, đèn lồng khổng lồ trên bệ sen, đài Suối Đèn.
export const TEAM_COL = [0x5fe3d0, 0xff6a4a];
const stone = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.9 });
const stoneDark = new THREE.MeshStandardMaterial({ color: 0x5c574f, roughness: 0.95 });
const roofMat = [0x2c6f6a, 0x8a2f26].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));

function lantern(team, r) {
  const g = new THREE.Group();
  const base = new THREE.Color(TEAM_COL[team]);
  const core = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: base.clone() }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 16, 12), new THREE.MeshBasicMaterial({ color: base.clone(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(core, halo);
  return { object: g, core, halo, base };
}

function finish(root, lan) {
  let t = 0;
  return {
    object: root,
    /** hp01: 0..1 để chập chờn khi yếu; dead: đã vỡ. */
    update(dt, hp01, dead) {
      t += dt;
      const f = dead ? 0.05 : hp01 < 0.3 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 22) * Math.sin(t * 7.3)) : 1;
      lan.core.material.color.copy(lan.base).multiplyScalar(f); lan.halo.material.opacity = 0.16 * f;
      if (dead) { root.scale.y += (0.12 - root.scale.y) * Math.min(1, dt * 4); root.rotation.z += (0.25 - root.rotation.z) * Math.min(1, dt * 3); }
    },
  };
}

export function createTower(team) {
  const g = new THREE.Group();
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  add(new THREE.CylinderGeometry(105, 120, 40, 8), stoneDark, 20);
  add(new THREE.CylinderGeometry(72, 88, 240, 8), stone, 160);
  add(new THREE.TorusGeometry(80, 9, 6, 16), stoneDark, 285).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(52, 66, 170, 8), stone, 390);
  add(new THREE.CylinderGeometry(96, 66, 26, 8), stoneDark, 490);
  const lan = lantern(team, 44); lan.object.position.y = 545; g.add(lan.object);
  add(new THREE.ConeGeometry(88, 70, 8), roofMat[team], 640);
  return finish(g, lan);
}

export function createCore(team) {
  const g = new THREE.Group();
  const petal = new THREE.MeshStandardMaterial({ color: team ? 0xd85a4a : 0x66d4c4, roughness: 0.6 });
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  add(new THREE.CylinderGeometry(150, 175, 50, 12), stoneDark, 25);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const p = new THREE.Mesh(new THREE.ConeGeometry(48, 190, 6), petal); p.position.set(Math.sin(a) * 125, 130, Math.cos(a) * 125); p.rotation.set(Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55); g.add(p); }
  add(new THREE.CylinderGeometry(90, 110, 90, 12), stone, 160);
  const lan = lantern(team, 110); lan.object.position.y = 400; g.add(lan.object);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(40, 90, 2600, 12, 1, true), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1500; g.add(beam);
  const fin = finish(g, lan);
  const upd = fin.update; fin.update = (dt, hp, dead) => { upd(dt, hp, dead); beam.visible = !dead; };
  return fin;
}

export function createFountain(team) {
  const g = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(230, 250, 24, 24), new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.4 })); pool.position.y = 12; g.add(pool);
  const water = new THREE.Mesh(new THREE.CircleGeometry(210, 24), new THREE.MeshBasicMaterial({ color: TEAM_COL[team], transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); water.rotation.x = -Math.PI / 2; water.position.y = 26; g.add(water);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; const p = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 120, 6), stone); p.position.set(Math.sin(a) * 230, 60, Math.cos(a) * 230); g.add(p); const l = new THREE.Mesh(new THREE.SphereGeometry(20, 8, 6), new THREE.MeshBasicMaterial({ color: TEAM_COL[team] })); l.position.set(Math.sin(a) * 230, 135, Math.cos(a) * 230); g.add(l); }
  return { object: g, update() {} };
}

// Lính: người giấy bồi (kiếm/cung), xe đá, người rơm khổng lồ mang đèn. Mỗi loại dùng chung hình học và vật liệu.
const geo = { body: new THREE.CylinderGeometry(20, 26, 70, 8), head: new THREE.SphereGeometry(18, 10, 8), stick: new THREE.CylinderGeometry(3, 3, 80, 5), box: new THREE.BoxGeometry(1, 1, 1), wheel: new THREE.CylinderGeometry(24, 24, 10, 10) };
const mats = {};
const paper = (team) => (mats['p' + team] ||= new THREE.MeshStandardMaterial({ color: team ? 0xe8a89a : 0xa6e6dc, roughness: 0.8 }));
const skin = new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.9 });
const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
const straw = new THREE.MeshStandardMaterial({ color: 0xd8b86a, roughness: 0.9 });

export function createMinion(type, team) {
  const g = new THREE.Group();
  const add = (geometry, mat, x, y, z, s = [1, 1, 1]) => { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(...s); g.add(m); return m; };
  let bob = 1;
  if (type === 'siege') {
    add(geo.box, wood, 0, 45, 0, [90, 30, 70]); for (const s of [1, -1]) add(geo.wheel, wood, 0, 26, s * 42).rotation.x = Math.PI / 2;
    const arm = add(geo.stick, wood, 0, 90, 0, [1.4, 1, 1.4]); arm.rotation.z = 0.7; add(geo.head, paper(team), 30, 130, 0, [1.3, 1.3, 1.3]);
    bob = 0.3;
  } else if (type === 'giant') {
    add(geo.body, straw, 0, 100, 0, [2.6, 2.6, 2.6]); add(geo.head, straw, 0, 230, 0, [2.6, 2.6, 2.6]);
    const lamp = add(new THREE.SphereGeometry(30, 10, 8), new THREE.MeshBasicMaterial({ color: TEAM_COL[team] }), 0, 300, 0); void lamp;
  } else {
    add(geo.body, paper(team), 0, 40, 0); add(geo.head, skin, 0, 92, 0);
    if (type === 'sword') { const s = add(geo.stick, wood, 28, 60, 12); s.rotation.x = 0.3; }
    else { const b = add(new THREE.TorusGeometry(24, 2.5, 4, 12, Math.PI), wood, 30, 62, 10); b.rotation.set(0, 0, Math.PI / 2); }
  }
  let t = Math.random() * 6;
  return { object: g, update(dt, moving) { t += dt * (moving ? 10 : 2); g.children[0].position.y += 0; g.position.y = Math.abs(Math.sin(t)) * (moving ? 5 : 1) * bob; } };
}
