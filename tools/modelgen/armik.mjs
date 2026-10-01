// IK cánh tay cầm vũ khí, giải từng khung khi dựng clip.
// Thay vì nội suy góc khớp (dễ làm vũ khí quay vòng xuyên người), clip mô tả QUỸ ĐẠO vũ khí: vị trí bàn tay + hướng vũ khí
// theo thời gian (toạ độ tư thế gốc, gắn theo Hông nên thân nhún/xoay/ngã thì quỹ đạo đi theo). Mỗi khung: đặt thân theo tư thế,
// rồi tìm góc vai/khuỷu/cổ tay sao cho tay + đầu vũ khí trùng đích, vũ khí không xuyên thân/đầu/chân/đất, và gần nghiệm khung trước
// (liền mạch, không lật). Kết quả ghi vào p.uaR/faR/hdR (hoặc L).
import * as THREE from 'three';

const D2R = Math.PI / 180;
const KEYS = { ua: 'UpperArm', fa: 'Forearm', hd: 'Hand' };
const LIM = { ua: [[-200, 80], [-110, 110], [-120, 120]], fa: [[-150, 15], [-80, 80], [-40, 40]], hd: [[-170, 170], [-85, 85], [-85, 85]] };

/** Khoảng cách điểm p tới đoạn a-b. */
function segDist(p, a, b) {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1)));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

/**
 * bones: mảng THREE.Bone (Bone_*); NM: khoá tư thế → tên xương; cfg: {
 *   body: bán kính thân (m), head: bán kính đầu, leg: bán kính chân, back: { R, L } độ dài vũ khí phía sau tay (cán thò ra),
 *   wSmooth, wWrist }
 */
export function createIK(bones, ctx, NM, cfg = {}) {
  const by = Object.fromEntries(bones.map((b) => [b.name.replace('Bone_', ''), b]));
  const root = by.Root.parent || by.Root;
  const rest = bones.map((b) => ({ b, p: b.position.clone(), q: b.quaternion.clone() }));
  root.updateMatrixWorld(true);
  const hipsRestInv = by.Hips.matrixWorld.clone().invert();
  const H = ctx.H, E = new THREE.Euler(), v = new THREE.Vector3();
  const wp = (n) => new THREE.Vector3().setFromMatrixPosition(by[n].matrixWorld);
  const len = {}, back = cfg.back || {};
  for (const s of ['R', 'L']) if (by['Hand' + s + '_Tip']) len[s] = wp('Hand' + s).distanceTo(wp('Hand' + s + '_Tip'));
  const setRot = (b, r) => { E.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'); b.quaternion.setFromEuler(E); };

  function applyBody(p) {
    for (const [k, nm] of Object.entries(NM)) if (by[nm]) setRot(by[nm], p[k] || [0, 0, 0]);
    const hp = p.hipsPos || [0, 0, 0], rp = p.rootPos || [0, 0, 0];
    by.Hips.position.set(ctx.hipsRest[0] + hp[0] * H, ctx.hipsRest[1] + hp[1] * H, ctx.hipsRest[2] + hp[2] * H);
    by.Root.position.set(rp[0] * H, rp[1] * H, rp[2] * H);
    root.updateMatrixWorld(true);
  }
  const prev = { R: null, L: null }, stats = [];
  let lastErr = 0;

  function solveSide(s, tgt, p, opts = {}) {
    const ua = by['UpperArm' + s], hand = by['Hand' + s], tip = by['Hand' + s + '_Tip'], L = len[s], bk = back[s] || 0;
    const M = by.Hips.matrixWorld.clone().multiply(hipsRestInv);
    const Ht = new THREE.Vector3(...tgt.hand).applyMatrix4(M), D = new THREE.Vector3(...tgt.dir).normalize().transformDirection(M), Tt = Ht.clone().addScaledVector(D, L);
    // vật cản: thân (hông→cổ), đầu, hai chân, mặt đất
    const hips = wp('Hips'), neck = wp('Chest'), head = wp('Head').add(new THREE.Vector3(0, cfg.headUp ?? 0.12, 0).applyQuaternion(by.Head.getWorldQuaternion(new THREE.Quaternion()))), legs = [['ThighL', 'FootL'], ['ThighR', 'FootR']].map(([a, b]) => [wp(a), wp(b)]);
    const gY = cfg.ground ?? 0.05, rB = cfg.body ?? 0.3, rH = cfg.head ?? 0.25, rL = cfg.leg ?? 0.12;
    const names = ['ua', 'fa', 'hd'], bonesS = names.map((k) => by[KEYS[k] + s]);
    const pv = prev[s] || (names.flatMap((k) => p[k + s] || [0, 0, 0]));
    const wS = cfg.wSmooth ?? 1.5e-6, wW = cfg.wWrist ?? 4e-7, wC = cfg.wCollide ?? 6;
    const pts = [];
    const err = (x) => {
      for (let i = 0; i < 3; i++) setRot(bonesS[i], [x[3 * i], x[3 * i + 1], x[3 * i + 2]]);
      ua.updateMatrixWorld(true);
      const h = v.setFromMatrixPosition(hand.matrixWorld).clone(), t = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
      let e = h.distanceToSquared(Ht) + t.distanceToSquared(Tt);
      // va chạm: lấy mẫu dọc vũ khí (bỏ 15 cm sát tay) và khuỷu tay
      const d = t.clone().sub(h).normalize();
      pts.length = 0;
      for (let k = 0; k <= 6; k++) { const a = -bk + (L + bk) * (k / 6); if (Math.abs(a) > 0.15) pts.push(h.clone().addScaledVector(d, a)); }
      pts.push(new THREE.Vector3().setFromMatrixPosition(by['Forearm' + s].matrixWorld));
      for (const q of pts) {
        const db = rB - segDist(q, hips, neck); if (db > 0) e += wC * db * db;
        const dh = rH - q.distanceTo(head); if (dh > 0) e += wC * dh * dh;
        for (const [a, b] of legs) { const dl = rL - segDist(q, a, b); if (dl > 0) e += wC * dl * dl; }
        if (q.y < gY) e += wC * (gY - q.y) ** 2;
      }
      for (let i = 0; i < 9; i++) e += wS * (x[i] - pv[i]) ** 2;
      for (let i = 6; i < 9; i++) e += wW * x[i] * x[i];
      return e;
    };
    const lim = names.flatMap((k) => LIM[k]);
    const descend = (x0) => {
      let x = x0.slice(), e = err(x);
      for (const step of [12, 6, 3, 1.5, 0.75, 0.35]) {
        for (let it = 0; it < 40; it++) {
          let imp = false;
          for (let k = 0; k < 9; k++) for (const sg of [1, -1]) {
            const y = x.slice(); y[k] = Math.min(lim[k][1], Math.max(lim[k][0], y[k] + sg * step));
            const e2 = err(y); if (e2 < e) { e = e2; x = y; imp = true; }
          }
          if (!imp) break;
        }
      }
      return { x, e };
    };
    let best = descend(pv);
    if (!prev[s] || opts.restart) { // khung đầu: thử thêm tư thế gốc, gợi ý trong p và vài điểm ngẫu nhiên
      const cands = [new Array(9).fill(0), names.flatMap((k) => p[k + s] || [0, 0, 0])];
      let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let r = 0; r < 10; r++) cands.push(lim.map(([a, b]) => a + (b - a) * (0.2 + 0.6 * rnd())));
      for (const c0 of cands) { const c = descend(c0); if (c.e < best.e) best = c; }
    }
    if (process.env.IK_DEBUG && prev[s] && !opts.quiet) { const j = Math.max(...best.x.map((x, i) => Math.abs(x - prev[s][i]))); if (j > 25) console.log('   nhảy góc', stats.length, s, j.toFixed(0)); }
    prev[s] = best.x;
    if (process.env.IK_DEBUG && !opts.quiet) { const x = best.x; err(x); const h = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld), t = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld); stats.push([h.distanceTo(Ht), t.distanceTo(Tt)]); if (h.distanceTo(Ht) > 0.25 || t.distanceTo(Tt) > 0.25) console.log('   khung', stats.length - 1, s, h.distanceTo(Ht).toFixed(2), t.distanceTo(Tt).toFixed(2)); }
    names.forEach((k, i) => { p[k + s] = best.x.slice(3 * i, 3 * i + 3); });
    err(best.x);
    { const h = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld), t = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld); lastErr = Math.max(lastErr, h.distanceTo(Ht), t.distanceTo(Tt)); }
    return Math.sqrt(best.e);
  }

  return {
    reset() { if (process.env.IK_DEBUG && stats.length) { const m = (k) => Math.max(...stats.map((x) => x[k])).toFixed(2), a = (k) => (stats.reduce((q, x) => q + x[k], 0) / stats.length).toFixed(2); console.log(`  IK sai số tay TB ${a(0)} max ${m(0)} | đầu vũ khí TB ${a(1)} max ${m(1)}`); } stats.length = 0; prev.R = prev.L = null; },
    /** Ghi góc tay vào p theo đích tgt = { R: { hand, dir }, L: ... } (toạ độ tư thế gốc). */
    get lastErr() { return lastErr; },
    solve(p, tgt) {
      lastErr = 0;
      applyBody(p);
      for (const s of ['R', 'L']) if (tgt?.[s] && len[s]) solveSide(s, tgt[s], p);
      return p;
    },
    /** Bám quỹ đạo liên tục: chia khoảng [u0, u1] thành n bước nhỏ, mỗi bước xuất phát từ nghiệm bước trước (không nhảy nhánh). */
    track(p, tgtFn, u0, u1, n = 4) {
      applyBody(p);
      for (let k = 1; k <= n; k++) {
        lastErr = 0;
        const tg = tgtFn(u0 + ((u1 - u0) * k) / n);
        for (const s of ['R', 'L']) if (tg?.[s] && len[s]) solveSide(s, tg[s], p, { quiet: k < n });
      }
      return p;
    },
    restore() { for (const r of rest) { r.b.position.copy(r.p); r.b.quaternion.copy(r.q); } root.updateMatrixWorld(true); },
  };
}
