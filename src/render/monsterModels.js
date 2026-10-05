import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadGLB } from './assets.js';

// Quái rừng & mục tiêu lớn dùng model SDF có xương (tools/modelgen/monsters.mjs → assets/monsters/<id>.glb).
// Hoạt cảnh không dùng clip: xoay xương theo thời gian (đi/chạy, thở, vồ cắn, đập, vỗ cánh, uốn thân).
// Vật liệu: PBR + vẽ thêm theo loại chất liệu của đỉnh (_mat): sợi lông, da ẩm đốm, đá sần, vảy ánh kim, phần phát sáng.

const IDS = ['soi_da', 'coc_reu', 'linh_thuy', 'hoa_nham', 'long_ngu', 'ho_loi', 'than_dieu', 'ta_than', 'linh_kiem', 'linh_cung', 'linh_den', 'xe_da'];
/** Loại lính (mô phỏng) → model. */
export const MINION_MODEL = { sword: 'linh_kiem', archer: 'linh_cung', giant: 'linh_den', siege: 'xe_da' };
const TEAM_TINT = [new THREE.Color('#3fb4cc'), new THREE.Color('#e2523c')]; // giáp/vải màu đội (Xanh ngọc / Đỏ)
const cache = new Map();
/** Bắt đầu nạp model một loại quái (gọi sớm để khi quái xuất hiện đã có sẵn). Trả Promise<gltf|null>. */
export function loadMonsterModel(id) {
  if (!IDS.includes(id)) return Promise.resolve(null);
  if (!cache.has(id)) {
    const p = loadGLB(new URL(`../../assets/monsters/${id}.glb`, import.meta.url).href).then((g) => { p.gltf = g; return g; }).catch((e) => { console.warn('Không nạp được model quái', id, e?.message); p.gltf = null; return null; });
    cache.set(id, p);
  }
  return cache.get(id);
}
export const preloadMonsters = () => Promise.all(IDS.map(loadMonsterModel));
export const readyMonster = (id) => cache.get(id)?.gltf;

const FUR_V = 'attribute float _mat;\nvarying float vMat; varying vec3 vObj;';
const FUR_F = `varying float vMat; varying vec3 vObj; uniform float uGlow; uniform float uRim; uniform vec3 uTeam;
float mh3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mh3(i), mh3(i + vec3(1,0,0)), f.x), mix(mh3(i + vec3(0,1,0)), mh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mh3(i + vec3(0,0,1)), mh3(i + vec3(1,0,1)), f.x), mix(mh3(i + vec3(0,1,1)), mh3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
const mats = new Map(), SHARED = {}; // hình/vật liệu phụ dùng chung giữa các lần quái hồi sinh (không rò bộ nhớ GPU)
function monsterMaterial(id, team = 0) {
  const key = id + ':' + team; if (mats.has(key)) return mats.get(key);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
  const u = { uGlow: { value: id === 'hoa_nham' ? 2.4 : 1.9 }, uRim: { value: id === 'linh_thuy' ? 1.6 : 0.35 }, uTeam: { value: TEAM_TINT[team] || TEAM_TINT[0] } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = u.uGlow; sh.uniforms.uRim = u.uRim; sh.uniforms.uTeam = u.uTeam;
    sh.vertexShader = FUR_V + '\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMat = _mat; vObj = position;');
    sh.fragmentShader = FUR_F + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vMat < 0.5) { // lông: sợi dài theo chiều dọc + chùm lông
          float s = mn3(vObj * vec3(26.0, 6.0, 26.0)) * 0.55 + mn3(vObj * vec3(9.0, 2.5, 9.0)) * 0.45;
          diffuseColor.rgb *= 0.74 + 0.5 * s;
        } else if (vMat < 1.5) { diffuseColor.rgb *= 0.88 + 0.24 * mn3(vObj * 14.0); }       // da: đốm loang
        else if (vMat < 2.5) { diffuseColor.rgb *= 0.8 + 0.35 * mn3(vObj * 11.0) * mn3(vObj * 3.0 + 7.0) * 1.6; } // đá/giáp: sần
        else if (vMat < 3.5) { diffuseColor.rgb *= 0.92 + 0.16 * mn3(vObj * 6.0); }
        else if (vMat > 6.5 && vMat < 7.5) { diffuseColor.rgb *= 0.94 + 0.12 * mn3(vObj * 40.0); }          // kim loại sáng (lính): xước mịn
        else if (vMat > 7.5) { diffuseColor.rgb *= 0.9 + 0.2 * mn3(vObj * vec3(90.0, 30.0, 90.0)); }    // vải màu đội: thớ dệt
        if (vMat > 3.5 && vMat < 4.5 || vMat > 5.5 && vMat < 6.5 || vMat > 7.5) diffuseColor.rgb *= uTeam * 1.25; // vải/giáp/đèn màu đội`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = vMat < 0.5 ? 0.95 : vMat < 1.5 ? 0.45 : vMat < 2.5 ? 0.82 : vMat < 3.5 ? 0.32 : vMat < 4.5 ? 0.36 : vMat < 6.5 ? 0.6 : vMat < 7.5 ? 0.28 : 0.88;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = vMat > 2.5 && vMat < 3.5 ? 0.55 : vMat > 1.5 && vMat < 2.5 ? 0.08 : vMat > 3.5 && vMat < 4.5 ? 0.3 : vMat > 6.5 && vMat < 7.5 ? 0.88 : 0.0;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vMat > 4.5 && vMat < 6.5) totalEmissiveRadiance += diffuseColor.rgb * uGlow;
        { float rim = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0); totalEmissiveRadiance += diffuseColor.rgb * rim * uRim; } // viền sáng nhẹ tách khỏi nền`);
  };
  if (id === 'linh_thuy') { m.transparent = true; m.opacity = 0.86; m.emissive = new THREE.Color(0x0a3a6a); m.emissiveIntensity = 1; m.roughness = 0.2; }
  m.customProgramCacheKey = () => 'monster-fur';
  m.userData.u = u;
  mats.set(key, m);
  return m;
}

/** Tỉ lệ dựng trong trận so với model gốc (mét): hổ thần to gấp đôi sói đầu đàn. */
const SIZE = { soi_da: 1.25, coc_reu: 1.4, linh_thuy: 1.3, hoa_nham: 1.2, long_ngu: 1.4, ho_loi: 2.4, than_dieu: 1.1, ta_than: 1.05 }; // hợp cỡ tướng (đã phóng 1.35)
const e3 = new THREE.Euler(), q3 = new THREE.Quaternion();
/** Xoay xương quanh tư thế gốc (rad, trục thế giới lúc dựng: X ngang trái, Y lên, Z trước). */
const rot = (b, x = 0, y = 0, z = 0) => { if (b) b.quaternion.copy(b.userData.q0).multiply(q3.setFromEuler(e3.set(x, y, z))); };
const lunge = (a) => (a <= 0 ? 0 : a < 0.5 ? -Math.sin(a * Math.PI) * 0.4 : Math.sin((a - 0.5) * 2 * Math.PI)); // lùi lấy đà rồi vồ
const strike = (a) => (a <= 0 ? 0 : Math.sin(Math.min(1, a / 0.6) * Math.PI));

const ANIM = {
  quad(B, t, dt, mv, atk, s) { // sói, hổ: dáng chạy nước kiệu (chéo cặp), đuôi vẫy, há mồm khi vồ
    const ph = t * (s.gait || 9), sw = mv ? 0.55 : 0, k = (o) => Math.sin(ph + o);
    for (const [side, o] of [['L', 0], ['R', Math.PI]]) {
      rot(B['Bone_FUpper' + side], -k(o) * sw, 0, 0); rot(B['Bone_FLower' + side], Math.max(0, k(o + 1.2)) * sw * 0.9, 0, 0);
      rot(B['Bone_BUpper' + side], k(o) * sw * 0.9, 0, 0); rot(B['Bone_BLower' + side], -Math.max(0, -k(o + 0.6)) * sw * 0.7, 0, 0); rot(B['Bone_BHock' + side], Math.max(0, -k(o + 0.6)) * sw * 0.6, 0, 0);
    }
    const breathe = Math.sin(t * 2.2) * 0.03, bite = atk > 0.35 && atk < 0.85 ? Math.sin((atk - 0.35) / 0.5 * Math.PI) : 0;
    rot(B.Bone_Spine, mv ? Math.sin(ph * 2) * 0.04 : breathe, 0, 0); rot(B.Bone_Chest, -lunge(atk) * 0.15, 0, 0);
    rot(B.Bone_Neck, (mv ? 0.12 : -0.05) + bite * 0.25, Math.sin(t * 0.7) * (mv ? 0 : 0.18), 0);
    rot(B.Bone_Head, -bite * 0.35 + Math.sin(t * 1.3) * 0.04, 0, 0); rot(B.Bone_Jaw, bite * 0.55 + (mv ? 0.08 : 0), 0, 0);
    rot(B.Bone_Tail1, mv ? -0.2 : 0.15, Math.sin(t * (mv ? 9 : 2)) * 0.35, 0); rot(B.Bone_Tail2, 0.1, Math.sin(t * (mv ? 9 : 2) - 0.8) * 0.4, 0);
    s.body.position.set(0, mv ? Math.abs(Math.sin(ph)) * 8 * s.k : 0, lunge(atk) * 55 * s.k);
  },
  coc_reu(B, t, dt, mv, atk, s) { // cóc: nhảy cóc, phồng túi cổ, đớp
    const hop = mv ? Math.max(0, Math.sin(t * 6)) : 0, gulp = 1 + Math.max(0, Math.sin(t * 3)) * 0.12, snap = strike(atk);
    s.body.position.set(0, hop * 70, lunge(atk) * 45);
    rot(B.Bone_Body, -hop * 0.25, 0, 0); rot(B.Bone_Head, -snap * 0.25, 0, 0); rot(B.Bone_Jaw, snap * 0.6, 0, 0);
    if (B.Bone_Jaw) B.Bone_Jaw.scale.setScalar(gulp);
    for (const sd of ['L', 'R']) { rot(B['Bone_BUpper' + sd], hop * 0.9, 0, 0); rot(B['Bone_BLower' + sd], -hop * 0.8, 0, 0); rot(B['Bone_FUpper' + sd], -hop * 0.5 - snap * 0.3, 0, 0); }
  },
  hoa_nham(B, t, dt, mv, atk, s) { // người đá: bước nặng, đập hai tay
    const ph = t * 4.5, sw = mv ? 0.45 : 0, raise = atk > 0 && atk < 0.55 ? atk / 0.55 : atk >= 0.55 ? Math.max(0, 1 - (atk - 0.55) / 0.15) : 0;
    for (const [sd, o] of [['L', 0], ['R', Math.PI]]) {
      rot(B['Bone_LegU' + sd], -Math.sin(ph + o) * sw, 0, 0); rot(B['Bone_LegL' + sd], Math.max(0, Math.sin(ph + o + 1)) * sw, 0, 0);
      rot(B['Bone_ArmU' + sd], Math.sin(ph + o) * sw * 0.7 - raise * 2.3, 0, (sd === 'L' ? 1 : -1) * (0.1 + Math.sin(t * 1.4) * 0.04)); rot(B['Bone_ArmL' + sd], -raise * 0.4, 0, 0);
    }
    rot(B.Bone_Chest, Math.sin(t * 1.6) * 0.03 + raise * -0.15 + (atk > 0.55 && atk < 0.8 ? 0.25 : 0), mv ? Math.sin(ph) * 0.08 : 0, 0); rot(B.Bone_Head, Math.sin(t * 0.9) * 0.05, Math.sin(t * 0.6) * 0.15, 0);
    s.body.position.set(0, mv ? Math.abs(Math.sin(ph)) * 10 : 0, atk > 0.55 ? 30 : 0);
    s.mat.userData.u.uGlow.value = 2.2 + Math.sin(t * 3) * 0.5;
  },
  linh_thuy(B, t, dt, mv, atk, s) { // tinh linh nước: lơ lửng, tay uốn lượn, phóng tay khi bắn
    const cast = strike(atk);
    s.body.position.set(0, 18 + Math.sin(t * 1.6) * 12, 0);
    rot(B.Bone_Body, Math.sin(t * 1.2) * 0.04, 0, Math.sin(t * 0.9) * 0.05); rot(B.Bone_Chest, -cast * 0.2, Math.sin(t * 0.7) * 0.12, 0);
    for (const [sd, m] of [['L', 1], ['R', -1]]) { rot(B['Bone_ArmU' + sd], -cast * 1.2 + Math.sin(t * 1.5 + m) * 0.15, 0, m * (0.25 + Math.sin(t * 1.5 + m) * 0.1)); rot(B['Bone_ArmL' + sd], -cast * 0.5 + Math.sin(t * 2 + m) * 0.2, 0, 0); }
    rot(B.Bone_Head, Math.sin(t * 1.1) * 0.06, Math.sin(t * 0.5) * 0.2, 0);
    if (s.drops) { s.drops.children.forEach((d) => { if (d === s.ring) return; const a = d.userData.a + t * 1.4; d.position.set(Math.cos(a) * d.userData.r, d.userData.h + Math.sin(t * 2 + d.userData.a) * 20, Math.sin(a) * d.userData.r); }); s.ring.scale.setScalar(1 + Math.sin(t * 2) * 0.08); s.ring.position.y = 12 - s.body.position.y; }
  },
  long_ngu(B, t, dt, mv, atk, s) { // cá chép hoá rồng: dựng mình khỏi mặt nước thành chữ S, thân lượn sóng, vươn đầu khi phun
    const rear = strike(atk);
    const BEND = [-1.25, 0.38, 0.42, 0.36, 0.2, -0.12, -0.22]; // đầu dựng đứng, thân cong xuống nước rồi đuôi vểnh
    rot(B.Bone_S0, BEND[0] - rear * 0.3, Math.sin(t * 0.8) * 0.15, 0);
    for (let i = 1; i < 7; i++) { const k = i / 6; rot(B['Bone_S' + i], BEND[i] + Math.sin(t * 1.6 - k * 3) * 0.05 + rear * 0.05, Math.sin(t * 1.8 - k * 4) * 0.22 * k, 0); }
    rot(B.Bone_Jaw, rear * 0.5 + Math.max(0, Math.sin(t * 2)) * 0.1, 0, 0);
    s.body.position.set(0, 60 + Math.sin(t * 1.2) * 10, -60);
  },
  ho_loi(B, t, dt, mv, atk, s) { ANIM.quad(B, t, dt, mv, atk, s); if (atk > 0.4 && atk < 0.9) s.body.position.y += Math.sin((atk - 0.4) / 0.5 * Math.PI) * 70; },
  than_dieu(B, t, dt, mv, atk, s) { // chim sấm: lơ lửng vỗ cánh, mổ khi tấn công
    const flap = Math.sin(t * 2.4) * 0.38 + strike(atk) * 0.5;
    for (const [sd, m] of [['L', 1], ['R', -1]]) { rot(B['Bone_WingU' + sd], 0, 0, m * flap); rot(B['Bone_WingL' + sd], 0, 0, m * flap * 0.6); rot(B['Bone_WingTip' + sd], 0, 0, m * flap * 0.4); }
    rot(B.Bone_Neck, strike(atk) * 0.6 + Math.sin(t * 0.8) * 0.06, 0, 0); rot(B.Bone_Head, -strike(atk) * 0.3, Math.sin(t * 0.6) * 0.2, 0);
    rot(B.Bone_Tail, Math.sin(t * 1.3) * 0.1, Math.sin(t * 0.9) * 0.1, 0);
    s.body.position.set(0, 40 + Math.sin(t * 2.4 - 0.6) * 22, 0);
  },
  ta_than(B, t, dt, mv, atk, s) { // ác thần: thở nặng, vung vuốt
    const sl = strike(atk);
    rot(B.Bone_Chest, Math.sin(t * 1.5) * 0.04 - sl * 0.12, Math.sin(t * 0.5) * 0.08, 0); rot(B.Bone_Head, -sl * 0.25, Math.sin(t * 0.7) * 0.15, 0);
    rot(B.Bone_ArmUL, -sl * 1.5 + Math.sin(t) * 0.06, 0, 0.12); rot(B.Bone_ArmUR, -sl * 1.2 - Math.sin(t) * 0.06, 0, -0.12);
    rot(B.Bone_ArmLL, -sl * 0.6, 0, 0); rot(B.Bone_ArmLR, -sl * 0.5, 0, 0);
    s.body.position.set(0, 0, lunge(atk) * 70);
    if (s.rings) { s.rings.rotation.y += dt * 0.7; s.rings.children.forEach((r, i) => { r.rotation.z += dt * (0.3 + i * 0.2); }); }
    s.mat.userData.u.uGlow.value = 1.9 + Math.sin(t * 4) * 0.4;
  },
};
ANIM.soi_da = ANIM.quad;

const ANIM_MINION = {
  human(B, t, dt, mv, atk, s) { // bước đi tay vung ngược chân; đòn: kiếm chém từ trên xuống / kéo dây cung / đấm
    const ph = t * (s.gait || 8), sw = mv ? 0.6 : 0, k = (o) => Math.sin(ph + o);
    rot(B.Bone_LegUL, -k(0) * sw, 0, 0); rot(B.Bone_LegUR, -k(Math.PI) * sw, 0, 0);
    rot(B.Bone_LegLL, Math.max(0, k(1.2)) * sw * 0.9, 0, 0); rot(B.Bone_LegLR, Math.max(0, k(Math.PI + 1.2)) * sw * 0.9, 0, 0);
    rot(B.Bone_Hips, 0, mv ? k(0) * 0.08 : 0, 0); rot(B.Bone_Chest, mv ? 0.06 : Math.sin(t * 2) * 0.02, mv ? -k(0) * 0.12 : 0, 0);
    const a = atk > 0 ? atk : 0;
    if (s.kind === 'archer') {
      const draw = a > 0 ? Math.min(1, a / 0.5) : 0, rel = a > 0.6 ? 1 : 0;
      rot(B.Bone_ArmUL, -1.45 * draw + (mv && !a ? k(Math.PI) * 0.5 : 0), 0, 0); rot(B.Bone_ArmLL, 0, 0, 0);
      rot(B.Bone_ArmUR, -1.3 * draw + (mv && !a ? k(0) * 0.5 : 0), 0, -0.4 * draw * (1 - rel)); rot(B.Bone_ArmLR, -1.4 * draw * (1 - rel), 0, 0);
    } else {
      const up = a > 0 && a < 0.45 ? a / 0.45 : 0, down = a >= 0.45 ? Math.max(0, 1 - (a - 0.45) / 0.3) : 0, swing = up ? -2.3 * up : a >= 0.45 ? -2.3 * down + 0.5 * (1 - down) : 0;
      rot(B.Bone_ArmUR, (a ? swing : (mv ? k(0) * 0.5 : 0.05)), 0, -0.1); rot(B.Bone_ArmLR, a ? -0.4 : -0.25, 0, 0);
      rot(B.Bone_ArmUL, mv ? k(Math.PI) * 0.4 - 0.3 : -0.35, 0, 0.15); rot(B.Bone_ArmLL, -0.8, 0, 0); // tay khiên/đèn co trước ngực
    }
    s.body.position.y = mv ? Math.abs(k(0)) * 4 * s.k : 0;
  },
  siege(B, t, dt, mv, atk, s) { // bánh lăn khi chạy, cần ném bật lên khi bắn
    s.wheel = (s.wheel || 0) + (mv ? dt * 6 : 0); rot(B.Bone_WheelF, s.wheel, 0, 0); rot(B.Bone_WheelB, s.wheel, 0, 0);
    const th = atk > 0 ? (atk < 0.3 ? -atk / 0.3 * 0.3 : atk < 0.5 ? -0.3 + (atk - 0.3) / 0.2 * 1.9 : 1.6 * Math.max(0, 1 - (atk - 0.5) / 0.5)) : 0;
    rot(B.Bone_Arm, -th, 0, 0); rot(B.Bone_Body, mv ? Math.sin(t * 9) * 0.02 : 0, 0, mv ? Math.sin(t * 7) * 0.015 : 0);
  },
};
/** Dựng lính từ model đã nạp (màu đội tô bằng shader). Trả { object, update(dt, moving, atk) } hoặc null nếu chưa có model. */
export function buildMinionModel(type, team) {
  const id = MINION_MODEL[type], g = id && readyMonster(id); if (!g) return null;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const obj = cloneSkinned(g.scene), mat = monsterMaterial(id, team), k = { giant: 1.6, siege: 1.45 }[type] || 1.35; // hợp cỡ tướng (đã phóng 1.35)
  obj.scale.setScalar(100 * k); body.add(obj);
  const B = {};
  obj.traverse((o) => { if (o.isBone) { o.userData.q0 = o.quaternion.clone(); B[o.name] = o; } if (o.isMesh) { o.material = mat; o.frustumCulled = false; o.castShadow = true; } });
  const s = { body, k, kind: type, gait: type === 'giant' ? 5.5 : 8 }, anim = type === 'siege' ? ANIM_MINION.siege : ANIM_MINION.human;
  let t = Math.random() * 10;
  return { object: root, update(dt, moving, atk) { t += dt; anim(B, t, dt, moving, atk || 0, s); } };
}

/** Dựng quái từ model đã nạp. member: 'pup' (sói con nhỏ hơn). Trả { object, update } hoặc null nếu chưa có model. */
export function buildMonsterModel(type, member) {
  const g = readyMonster(type); if (!g) return null;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const obj = cloneSkinned(g.scene), mat = monsterMaterial(type), k = (SIZE[type] || 1) * (type === 'soi_da' && member === 'pup' ? 0.62 : 1);
  obj.scale.setScalar(100 * k); body.add(obj);
  const B = {};
  obj.traverse((o) => {
    if (o.isBone) { o.userData.q0 = o.quaternion.clone(); B[o.name] = o; }
    if (o.isMesh) { o.material = mat; o.frustumCulled = false; o.castShadow = true; }
  });
  const s = { body, mat, k, gait: type === 'ho_loi' ? 6.5 : 9 };
  if (type === 'ta_than') { // vòng phù văn trôi quanh ác thần
    s.rings = new THREE.Group(); s.rings.position.y = 320; body.add(s.rings);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(SHARED['rune' + i] ||= new THREE.TorusGeometry(300 + i * 45, 4, 6, 72), SHARED.runeMat ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb06aff).multiplyScalar(1.6), transparent: true, opacity: 0.85 })); r.rotation.x = Math.PI / 2 + (i - 1) * 0.35; s.rings.add(r); }
  }
  if (type === 'linh_thuy') { // giọt nước bay vòng quanh + vòng nước xoáy dưới chân
    s.drops = new THREE.Group(); body.add(s.drops);
    const dm = SHARED.dropMat ||= new THREE.MeshStandardMaterial({ color: 0x9ae8ff, emissive: 0x2a8ac8, emissiveIntensity: 1.2, roughness: 0.1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(SHARED['drop' + (i % 3)] ||= new THREE.SphereGeometry(10 + (i % 3) * 5, 12, 8), dm); d.userData.a = i / 9 * Math.PI * 2; d.userData.r = 120 + (i % 3) * 30; d.userData.h = 60 + (i % 4) * 50; s.drops.add(d); }
    const ring = new THREE.Mesh(SHARED.ringGeo ||= new THREE.TorusGeometry(130, 6, 8, 64), SHARED.ringMat ||= new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7ae0ff).multiplyScalar(1.5), transparent: true, opacity: 0.7 })); ring.rotation.x = Math.PI / 2; ring.position.y = 12; s.drops.add(ring); s.ring = ring;
  }
  let t = Math.random() * 10;
  const anim = ANIM[type] || ANIM.quad;
  return { object: root, update(dt, moving, atk) { t += dt; anim(B, t, dt, moving, atk || 0, s); } };
}
