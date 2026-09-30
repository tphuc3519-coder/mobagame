import * as THREE from 'three';

// Chỉ báo ngắm vẽ trong cảnh 3D, sát đất, đúng phối cảnh (02 §13.7): vòng tầm, tuyến, quạt, vòng tại điểm.
const mat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
const OK = 0x8fe8ff, BAD = 0xff5a4a;

export function createIndicators(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const rangeRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.012, 64), mat(OK)); rangeRing.rotation.x = -Math.PI / 2;
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat(OK)); line.rotation.x = -Math.PI / 2;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(OK)); disc.rotation.x = -Math.PI / 2;
  const sector = new THREE.Mesh(new THREE.CircleGeometry(1, 28, -Math.PI / 4, Math.PI / 2), mat(OK)); sector.rotation.x = -Math.PI / 2;
  for (const o of [rangeRing, line, disc, sector]) { o.position.y = 5; o.renderOrder = 3; o.visible = false; g.add(o); }
  const colorAll = (c) => { for (const o of [rangeRing, line, disc, sector]) o.material.color.setHex(c); };
  return {
    hide() { g.visible = false; },
    /** spec: { type, range, width, radius, angle }; dir: {x,y} chuẩn hoá; point: {x,y} thế giới; cancel: bool */
    show(spec, origin, dir, point, cancel) {
      g.visible = true; colorAll(cancel ? BAD : OK);
      for (const o of [rangeRing, line, disc, sector]) o.visible = false;
      const ang = Math.atan2(dir.y, dir.x);
      if (spec.range && spec.aim !== 'none') { rangeRing.visible = true; rangeRing.scale.set(spec.range, spec.range, 1); rangeRing.position.set(origin.x, 5, origin.y); }
      const t = spec.type;
      if (t === 'skillshot' || t === 'dash') {
        line.visible = true; const w = spec.width || (spec.type === 'dash' ? 90 : 60);
        line.scale.set(spec.range, w, 1); line.rotation.set(-Math.PI / 2, 0, 0); line.rotation.order = 'YXZ'; line.rotation.y = -ang;
        line.position.set(origin.x + dir.x * spec.range / 2, 5, origin.y + dir.y * spec.range / 2);
      } else if (t === 'cone') {
        sector.visible = true; const half = ((spec.angle || 90) * Math.PI) / 360;
        sector.geometry.dispose(); sector.geometry = new THREE.CircleGeometry(spec.range, 28, -half, half * 2);
        sector.scale.set(1, 1, 1); sector.rotation.set(-Math.PI / 2, 0, 0); sector.rotation.order = 'YXZ'; sector.rotation.y = -ang; sector.position.set(origin.x, 5, origin.y);
      } else if (t === 'aoeCircle' || t === 'zone') {
        disc.visible = true; disc.scale.set(spec.radius, spec.radius, 1); disc.position.set(point.x, 5, point.y);
      } else if (t === 'aoeSelf') {
        disc.visible = true; disc.scale.set(spec.radius, spec.radius, 1); disc.position.set(origin.x, 5, origin.y);
      } else if (t === 'allyTarget') {
        line.visible = true; line.scale.set(spec.range, 50, 1); line.rotation.set(-Math.PI / 2, 0, 0); line.rotation.order = 'YXZ'; line.rotation.y = -ang;
        line.position.set(origin.x + dir.x * spec.range / 2, 5, origin.y + dir.y * spec.range / 2);
      }
    },
  };
}
