import * as THREE from 'three';
import { lerp, lerpAngle } from '../core/math.js';
import { loadHero, instantiate } from './assets.js';
import { createAnimator } from './animator.js';
import { createCapsule } from './placeholder/capsule.js';
import { createDummy } from './placeholder/dummy.js';
import { createBlobLayer } from './shadows.js';
import { prepareUnitMaterials } from './materials.js';
import { createTower, createCore, createFountain, createMinion } from './structures.js';
import { canSee, bushAt } from '../sim/vision.js';
import { createMonster } from './monsters.js';

const CAST_CLIP = { s1: 'Cast1', s2: 'Cast2', s3: 'Ult' };
/** Lúc chiêu "phát ra" (giây sau sự kiện cast, theo tick mô phỏng) — tư thế chạm của clip rơi đúng lúc này: `delay` của sự kiện (windup của
 *  chiêu, hay lúc vụ nổ chờ / cú nhảy chạm đất). Tự cường hoá (selfBuff) có hiệu lực ngay, không có lúc "phát ra": null → clip theo nhịp tự
 *  nhiên (animator.js). */
const castRelease = (ev) => (ev.skillType === 'selfBuff' ? null : Math.round((ev.delay || 0) * 30) / 30);
/** Kiểu lớp thân (animator.js BODY) theo kiểu chiêu và tướng cận chiến / đánh xa. */
const castStyle = (ev, e) => {
  const t = ev.skillType, melee = !!e?.data?.basicAttack?.melee;
  if (t === 'dash') return 'dash';
  if (t === 'aoeSelf') return melee ? 'slam' : 'buff';
  if (t === 'aoeCircle' && ev.lock >= ev.delay && ev.delay > 0) return 'slam'; // nhảy tới đập xuống (Đe Trời)
  if (t === 'selfBuff') return 'buff';
  if (t === 'cone' || t === 'skillshot') return melee ? 'swing' : t === 'cone' ? 'spell' : 'shot';
  return 'spell';
};
const SNAP = 0.09; // giây quay mặt nhanh về hướng đòn / chiêu khi bắt đầu ra đòn (thay vì lerp 18/s) — đòn đánh nhắm đúng hướng
const BIG_MONSTER = 80; // quái có bán kính từ đây trở lên tính là quái lớn (khựng + giật khi trúng đòn tướng)
/** Tướng trong trận to hơn tỉ lệ gốc (bớt cảm giác chibi khi nhìn từ camera trên cao); bán kính va chạm mô phỏng giữ nguyên. */
export const HERO_SCALE = 1.5;
/** Nhân vật đổ bóng thật (khi bật bóng ở mức Vừa/Cao); vật trong suốt/cộng sáng thì không, lớp mặt (mắt / miệng dán trên đầu — đầu đã đổ bóng),
 *  lớp phát sáng (<tướng>_glow: lửa đèn, vệt sáng vũ khí — vật phát sáng không đổ bóng) và vật liệu ẩn cũng không (mỗi lớp là một lượt vẽ bóng thừa — ngân sách 02 §2). */
const castShadows = (obj) => obj.traverse((m) => { if (m.isMesh && m.material?.name !== 'face' && !/_glow$/.test(m.material?.name || '') && m.material?.visible !== false && m.material?.depthWrite !== false && m.material?.blending !== THREE.AdditiveBlending && m.material?.side !== THREE.BackSide) m.castShadow = true; });

/** Entity mô phỏng ↔ object 3D. Render chỉ đọc trạng thái (nội suy prevPos → pos). */
/** floor(x, z): độ cao mặt nền phần nhìn (bệ trại quái, hang mục tiêu lớn): đơn vị đứng lên trên bệ thay vì lút chân. */
/** Mỗi SkinnedMesh nhân bản có bộ xương riêng kèm một texture xương trên GPU: gỡ đơn vị (lính/quái chết) phải giải phóng, nếu không
 *  mỗi đợt lính rò thêm vài chục texture. Hình học / vật liệu dùng chung nên không đụng tới. */
export function releaseSkeletons(root) { root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton?.dispose(); }); }
/** Bán kính cầu xét "trong khung nhìn" quanh chân đơn vị: đủ trùm thân + bóng đổ (nắng xiên ~0,8 × chiều cao) + camera trượt 1 khung. */
const cullR = (e) => (e.kind === 'minion' ? 300 : e.kind === 'monster' ? Math.max(380, e.radius * 4) : 560);
const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere(), camDir = new THREE.Vector3();
/** Hoạt ảnh thưa (02 §2 + §13.6): chỉ ANIM_FULL đơn vị có xương gần tâm màn hình nhất (theo xếp hạng khung trước) cập nhật mỗi khung; còn
 *  lại trong khung nhìn ~30 lần/giây, tướng xa tâm màn hình quá ANIM_FAR ~15 lần/giây, tướng ngoài khung nhìn / trong sương mù thì dừng (dồn
 *  thời gian lại, hiện ra cập nhật bù một lần). Tướng mình luôn mỗi khung (rung camera theo tư thế chạm). */
const ANIM_FULL = 12, ANIM_THIN = 1 / 30, ANIM_SLOW = 1 / 15, ANIM_FAR2 = 2500 * 2500;
export function createUnitViews(scene, localTeam, localId, { floor = null, anisotropy = 1, localTint = null } = {}) { // localTint: trang phục mùa của tướng người chơi (ui/season.js skinTint — không bao giờ có cho 4 model cao cấp) // anisotropy: lọc xiên texture tướng (renderer.capabilities)
  const views = new Map(), aliveIds = new Set(), blobs = createBlobLayer(scene), rankBuf = [], stats = { full: 0, thin: 0 };
  let dead = false; // đã dọn (rời trận): bỏ các lần tải model đang chờ
  // Lính / quái ngoài khung nhìn: tách khỏi cảnh (không vẽ, không vẽ bóng, không tính ma trận xương) và thôi chạy hoạt ảnh. Mesh có
  // xương đặt frustumCulled = false (khối bao không theo động tác) nên trước đây cả bản đồ ~70 đơn vị đều vẽ mỗi khung, kể cả lượt bóng.
  // Tướng chỉ ẩn (hiệu ứng bám xương tay/đầu vẫn cần ma trận xương cập nhật).
  const park = (v, on) => { if (on && v.root.parent !== scene) scene.add(v.root); else if (!on && v.root.parent === scene) scene.remove(v.root); };
  const spawn = (e, world) => {
    const root = new THREE.Group();
    scene.add(root);
    const v = { root, animator: null, mats: null, angle: e.facing, lift: null, flash: 0, ghost: false, art: null, part: null, fall: 0 };
    views.set(e.id, v);
    if (!e.structure) v.blob = blobs.add(e.kind === 'hero' ? e.radius * 1.25 : e.radius); // bóng tiếp đất: không xoay theo nhân vật
    if (e.kind === 'tower' || e.kind === 'core' || e.kind === 'fountain') {
      v.part = e.kind === 'tower' ? createTower(e.team) : e.kind === 'core' ? createCore(e.team) : createFountain(e.team, Math.min(1, (world.map.fountain?.healRadius || 650) / 650));
      if (e.kind === 'fountain') { const m = world.map, a = Math.atan2(m.h / 2 - e.pos.y, m.w / 2 - e.pos.x); v.part.object.rotation.y = -a + Math.PI / 2; } // lối vào quay ra giữa bản đồ
      if (e.kind === 'core' && e.radius < 200) v.part.object.scale.setScalar(0.72); // bản 1v1 hẹp: tế đàn thu nhỏ để nằm gọn giữa hai tường
      root.add(v.part.object); return v;
    }
    if (e.kind === 'minion') { const golem = e.minionType === 'golem'; v.part = createMinion(golem ? 'giant' : e.minionType, e.team); if (golem) v.part.object.scale.multiplyScalar(1.45); root.add(v.part.object); v.atk = 0; return v; } // Người Đá Đèn: thân Lính Đèn Lớn phóng to // lính chỉ bóng tròn: ~20 lính mỗi khung đổ bóng thật = thêm ~20 lượt vẽ có xương
    if (e.kind === 'monster') { v.part = createMonster(e.monsterType, e.member); root.add(v.part.object); castShadows(v.part.object); v.atk = 0; return v; }
    const attach = (obj, art) => { root.add(obj); v.mats = prepareUnitMaterials(obj, undefined, { shading: art?.shading, anisotropy, soft: true, tint: e.id === localId ? localTint : null }); castShadows(obj); }; // không viền (02 §13.3)
    if (e.kind === 'dummy') { attach(createDummy().object); return v; }
    const useCapsule = () => {
      if (v.capsule) return;
      const c = createCapsule(); c.object.scale.multiplyScalar(HERO_SCALE); attach(c.object); v.capsule = c.object;
      v.animator = { update: (s, sp, dt) => c.update(s, sp, dt), trigger() {}, revive() {} };
    };
    const real = (m) => {
      if (v.capsule) { root.remove(v.capsule); v.capsule = null; } // tải lại được: thay hình nhân giữ chỗ bằng model thật
      const inst = instantiate(m); inst.object.scale.multiplyScalar(HERO_SCALE); attach(inst.object, inst.art);
      // sải chân dài theo tỉ lệ → tốc độ phát clip chạy chia cho tỉ lệ để chân không trượt; chiều cao cho hiệu ứng bám đầu
      v.art = { ...inst.art, runRefSpeed: (inst.art.runRefSpeed || 320) * HERO_SCALE, height: (inst.art.height || 250) * HERO_SCALE }; v.animator = createAnimator(inst);
      v.bones = Object.fromEntries(['HandR', 'HandR_Tip', 'HandL', 'HandL_Tip', 'Head', 'Chest'].map((n) => [n, inst.object.getObjectByName('Bone_' + n)]).filter(([, b]) => b)); // cho hiệu ứng bám xương (vệt vũ khí, sao choáng)
      if (!e.alive) v.animator.trigger('Death', null, true);
    };
    // model tải lỗi (mạng chập chờn): hiện hình nhân giữ chỗ ngay, thử tải lại dần (2 s, 4 s … tối đa 15 s) rồi thay bằng model thật
    let tries = 0;
    const tryLoad = () => loadHero(e.heroId).then((m) => {
      if (dead || views.get(e.id) !== v) return; // đơn vị đã bị gỡ / trận đã dọn
      if (m) return real(m);
      useCapsule(); if (!dead) setTimeout(tryLoad, Math.min(15000, 2000 * ++tries));
    }).catch((err) => { console.warn('Model tướng lỗi', e.heroId, err?.message); useCapsule(); });
    tryLoad();
    return v;
  };
  /** Đòn của tướng trúng tướng địch / hình nộm / quái lớn đang thấy: người đánh khựng (nếu đòn vừa vung tới — đạn bay xa thì thôi), người trúng khựng
   *  nhẹ + bị đẩy giật khỏi hướng đòn (chỉ phần nhìn, ~0,1 s) + ngả người theo cú đánh. Liên quan tới người chơi thì mạnh hơn. */
  const hitReact = (ev, v, world) => {
    const src = world?.byId(ev.src), tgt = world?.byId(ev.id);
    if (!src || !tgt || src.kind !== 'hero' || src.team === tgt.team || !(tgt.kind === 'hero' || tgt.kind === 'dummy' || (tgt.kind === 'monster' && tgt.radius >= BIG_MONSTER))) return; // hình nộm luyện tập tính như tướng
    if (!ev.crit && ev.amount < Math.min(60, (tgt.stats?.maxHp || 1000) * 0.012)) return; // vết nhỏ (thiêu đốt, vùng độc từng nhịp): chỉ nháy trắng
    const mine = ev.src === localId || ev.id === localId, ult = ev.slot === 's3', k = (mine ? 1 : 0.7) * (ev.crit ? 1.3 : 1);
    const stop = (ult ? 0.1 : ev.slot ? 0.07 : 0.05) * k, sv = views.get(ev.src), near = !!(sv?.root.visible && sv.animator?.nearImpact?.());
    const wait = near ? Math.min(0.15, sv.animator.impactIn ?? 0) : 0; // chiêu trúng ngay lúc bấm: mọi phản ứng chờ vũ khí vung tới tư thế chạm
    if (near) sv.animator.hitStop(stop, wait);
    if (!v.root.visible) return;
    let dx = tgt.pos.x - src.pos.x, dz = tgt.pos.y - src.pos.y; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const amp = (ult ? 16 : ev.slot ? 12 : 8) * k * (tgt.kind === 'monster' ? 0.6 : 1);
    if (!(v.jt != null && v.jt < 0.05 && v.ja >= amp)) { v.jx = dx; v.jz = dz; v.ja = amp; v.jt = -wait; } // dồn nhiều cú trong một khung: giữ cú mạnh nhất
    v.animator?.hitStop?.(stop * 0.6, wait);
    v.animator?.flinch?.(0.07 * k * (ult ? 1.4 : 1) * (Math.cos(v.angle) * dx + Math.sin(v.angle) * dz), wait); // trúng từ trước mặt → ngả ra sau
  };
  const late = (ev, world) => (world && ev.tick != null ? Math.max(0, world.tick - ev.tick) / 30 : 0); // sự kiện của tick trước trong cùng lượt vẽ
  let W = null; // trận của lần update gần nhất (handle chạy trước update trong cùng khung)
  return {
    get: (id) => views.get(id),
    /** Khung vừa vẽ: số đơn vị có xương cập nhật hoạt ảnh đủ (mỗi khung) / thưa (02 §2: đủ ≤ 12). */
    animStats: () => ({ ...stats }),
    /** Gốc hình của mọi đơn vị (kể cả lính / quái đang được gỡ khỏi cảnh vì ở xa) — để dọn bộ nhớ GPU khi rời trận. */
    roots() { const out = [blobs.mesh]; for (const v of views.values()) out.push(v.root); return out; },
    /** Rời trận: gỡ mọi đơn vị khỏi cảnh, trả khung xương. */
    dispose() { dead = true; for (const v of views.values()) { scene.remove(v.root); releaseSkeletons(v.root); } views.clear(); blobs.dispose(); },
    /** Vẽ công trình như đã đổ (chỉ phần nhìn; mô phỏng không đổi) — nhà chính bên đầu hàng lúc kết thúc trận. */
    down(id) { const v = views.get(id); if (v) v.forced = true; },
    /** kick(dx, dz, độ): giật camera khi chiêu của người chơi tới tư thế chạm (game.js gắn camera.kick). */
    kick: null,
    handle(events, world = W) {
      for (const ev of events) {
        const v = views.get(ev.id);
        if (ev.type === 'attack' && v && v.atk !== undefined) v.atk = 0.001;
        if (ev.type === 'attack' && v?.animator) {
          const melee = !!world?.byId(ev.id)?.data?.basicAttack?.melee, hit = (Math.round((ev.delay ?? 0.25) * 30) + (melee ? 0 : 1)) / 30; // theo tick mô phỏng; đánh xa: đạn ra sau hẹn giờ thêm 1 tick (combat.js fire → shoot)
          v.animator.trigger(ev.n % 2 ? 'Attack1' : 'Attack2', Math.min(0.9, ev.interval * 0.95), false, hit, (ev.delay ?? 0.25) + 0.06, { kind: 'attack', style: melee ? 'swing' : 'shot', late: late(ev, world) });
          v.snap = SNAP;
        } else if (ev.type === 'cast' && v?.animator) {
          v.animator.trigger(CAST_CLIP[ev.slot], ev.slot === 's3' ? 1.2 : 0.7, false, castRelease(ev), ev.lock ?? 0, { kind: ev.slot === 's3' ? 'ult' : 'cast', style: castStyle(ev, world?.byId(ev.id)), late: late(ev, world) });
          v.snap = SNAP;
        } else if (ev.type === 'damage' && v) { v.flash = 0.08; hitReact(ev, v, world); }
        else if (ev.type === 'knockup' && v) v.lift = { t: 0, dur: ev.dur, h: 130 };
        else if (ev.type === 'jump' && v) v.lift = { t: 0, dur: ev.dur, h: 320 };
        else if (ev.type === 'death' && v) v.animator?.trigger('Death', null, true);
        else if (ev.type === 'respawn' && v) v.animator?.revive();
      }
    },
    update(world, alpha, dt, camera = null) {
      W = world;
      if (camera) { pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv); } // khung của lần vẽ trước
      const inView = (e, x, y, z) => { if (!camera) return true; const r = cullR(e); sph.center.set(x, y + r * 0.35, z); sph.radius = r; return frustum.intersectsSphere(sph); };
      const alive = aliveIds; alive.clear(); // dùng lại một Set (đỡ rác bộ nhớ mỗi khung)
      let cx = 0, cz = 0, nFull = 0, nThin = 0; const ranked = rankBuf; ranked.length = 0;
      if (camera) { camera.getWorldDirection(camDir); const t = camDir.y < -1e-3 ? -camera.position.y / camDir.y : 0; cx = camera.position.x + camDir.x * t; cz = camera.position.z + camDir.z * t; }
      const animDt = (v, rx, rz, local) => { // thời gian cần cập nhật hoạt ảnh khung này; -1: bỏ qua (đã dồn lại)
        const d2 = (rx - cx) ** 2 + (rz - cz) ** 2; ranked.push(v); v.animD2 = d2;
        v.animAcc = (v.animAcc || 0) + dt;
        const every = local || v.animFull ? 0 : d2 > ANIM_FAR2 ? ANIM_SLOW : ANIM_THIN;
        if (every && v.animAcc + 1e-6 < every) return -1;
        const d = v.animAcc; v.animAcc = 0; if (every) nThin++; else nFull++; return d;
      };
      const hold = (v) => { v.animAcc = Math.min(5, (v.animAcc || 0) + dt); }; // ngoài khung nhìn: dồn thời gian (trần 5 giây)
      for (const e of world.entities) {
        alive.add(e.id);
        const v = views.get(e.id) || spawn(e, world);
        const y = v.lift ? Math.sin(Math.min(1, v.lift.t / v.lift.dur) * Math.PI) * v.lift.h : 0;
        if (v.lift) { v.lift.t += dt; if (v.lift.t >= v.lift.dur) v.lift = null; }
        const rx = lerp(e.prevPos.x, e.pos.x, alpha), rz = lerp(e.prevPos.y, e.pos.y, alpha);
        if (!e.structure) { const g = floor ? floor(rx, rz) : 0; v.gy = v.gy == null ? g : v.gy + (g - v.gy) * (1 - Math.exp(-14 * dt)); } // bước lên/xuống bệ êm
        v.root.position.set(rx, y + (v.gy || 0), rz);
        if (v.jt != null && (v.jt += dt) > 0) { // bị đánh giật: bật ra ngay rồi về chỗ (~0,1 s), chỉ phần nhìn; jt < 0: chờ vũ khí người đánh tới
          const j = v.jt < 0.025 ? v.jt / 0.025 : (1 - Math.min(1, (v.jt - 0.025) / 0.09)) ** 2;
          v.root.position.x += v.jx * v.ja * j; v.root.position.z += v.jz * v.ja * j; if (v.jt > 0.12) v.jt = null;
        }
        if (v.blob) { const l = v.animator?.lunge || 0; const b = v.blob; b.x = v.root.position.x + Math.cos(v.angle) * l; b.y = v.gy || 0; b.z = v.root.position.z + Math.sin(v.angle) * l; b.visible = e.alive && v.root.visible !== false; b.k = 1 - Math.min(0.5, y / 400); } // bóng theo cả bước lao tới của lớp thân
        if (e.structure) { v.part?.update(dt, e.hp / e.stats.maxHp, !e.alive || !!v.forced); continue; } // forced: đầu hàng — nhà chính vẫn sống trong mô phỏng nhưng vẽ đổ
        v.angle = lerpAngle(v.angle, e.facing, 1 - Math.exp(-(v.snap > 0 ? 55 : 18) * dt)); if (v.snap > 0) v.snap -= dt; // ra đòn: quay phắt về hướng đòn trong ~2 khung
        v.root.rotation.y = -v.angle + Math.PI / 2; // model nhìn +Z (02 §13.1)
        const seen = canSee(localTeam, e), shown = inView(e, rx, v.root.position.y, rz); // sương mù / bụi cỏ: địch ngoài tầm nhìn không vẽ
        if (e.kind === 'monster') {
          v.root.visible = seen; park(v, shown); if (v.atk > 0) { v.atk += dt / 0.7; if (v.atk >= 1) v.atk = 0; }
          if (shown && seen && v.part) { const d = animDt(v, rx, rz, false); if (d >= 0) v.part.update(d, e.speed > 1, v.atk); }
          if (!e.alive) { v.fall = Math.min(1, v.fall + dt * 1.5); v.root.scale.setScalar(1 - v.fall * 0.95); v.root.position.y -= v.fall * 60; }
          continue;
        }
        if (e.kind === 'minion') { v.root.visible = seen; park(v, shown); if (v.atk > 0) { v.atk += dt / 0.6; if (v.atk >= 1) v.atk = 0; } if (shown && seen && v.part) { const d = animDt(v, rx, rz, false); if (d >= 0) v.part.update(d, e.speed > 1, v.atk); } if (!e.alive) { v.fall = Math.min(1, v.fall + dt * 3); v.root.scale.setScalar(1 - v.fall * 0.9); v.root.rotation.z = v.fall * 1.2; } continue; }
        if (v.mats) {
          v.flash = Math.max(0, v.flash - dt); v.mats.setFlash(v.flash > 0 ? 0.6 : v.ghost ? 0.14 : 0); v.mats.update(dt); // trong bụi: sáng lên chút để không chìm vào màu bụi tối; update: chớp mắt
          const inBush = e.team === localTeam && !!world.map.vision && !!bushAt(world.map, e.pos); // mình đứng trong bụi: mờ đi như Liên Quân
          const hide = e.statuses.some((s) => s.kind === 'stealth') || inBush, ghost = hide || e.kind === 'clone'; // phân thân: mờ như bóng, nhưng địch vẫn thấy
          if (ghost !== v.ghost) { v.ghost = ghost; v.mats.setGhost(ghost); }
          v.root.visible = seen && !(hide && e.team !== localTeam) && shown;
        }
        if (v.animator) { const local = e.id === localId; if (!local && (!shown || v.root.visible === false)) hold(v); else { const d = animDt(v, rx, rz, local); if (d >= 0) v.animator.update(e.speed > 1 ? 'Run' : 'Idle', e.speed, d, v.art); } }
        if (this.kick && e.id === localId && v.animator?.struck) this.kick(Math.cos(e.facing), Math.sin(e.facing), v.animator.struck); // chiêu của mình vừa tới tư thế chạm
      }
      for (const [id, v] of views) if (!alive.has(id)) { scene.remove(v.root); if (v.blob) blobs.remove(v.blob); views.delete(id); releaseSkeletons(v.root); }
      blobs.update();
      ranked.sort((a, b) => a.animD2 - b.animD2); for (let i = 0; i < ranked.length; i++) ranked[i].animFull = i < ANIM_FULL; // xếp hạng cho khung sau
      stats.full = nFull; stats.thin = nThin;
    },
  };
}
