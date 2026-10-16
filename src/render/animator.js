import * as THREE from 'three';

/**
 * Điều khiển clip: trạng thái nền Idle/Run (timeScale Run = moveSpeed / runRefSpeed) và clip hành động chạy một lần
 * (Attack/Cast/Ult/Death). Animation chỉ để nhìn; thời điểm gây sát thương do mô phỏng quyết định (02 §13.5).
 * Clip hành động có `feel` thì tự phát theo nhịp riêng (uốn thời gian): gồng chậm dần vào thế → giáng rất nhanh, tư thế chạm rơi đúng lúc
 * chiêu phát ra (mô phỏng) → khựng ngắn → thu đòn; cộng lớp thân (ngả, lao tới / giật lùi, co – duỗi, lò xo tắt dần) lên node model,
 * khựng khi đòn trúng (hitStop) và giật người khi bị đánh (flinch). Không đụng mô phỏng.
 */

// —— Phân tích clip: tìm điểm chạm (hit) và đỉnh gồng (coil) một lần cho mỗi clip (clip dùng chung giữa các bản sao cùng model) ——
const INFO = new WeakMap(), SR = 60; // mẫu/giây khi phân tích
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4();
/** Tốc độ chuyển động theo thời gian = Σ tốc độ góc mỗi xương × cánh tay đòn (khoảng cách tới đầu xương con xa nhất, tư thế gốc) + tốc độ
 *  dời hông/gốc (bỏ xương vải/tóc). Cú đánh = đoạn nhanh nhất kết thúc trước 82% clip (ưu tiên nhẹ đoạn sau: đòn đi sau thế gồng); điểm
 *  chạm = lúc tốc độ rơi dưới 25% đỉnh đoạn đó, đỉnh gồng = lúc tốc độ trước đỉnh còn dưới 25%. hitTime (giây) có sẵn thì dùng làm điểm chạm. */
export function analyzeClip(clip, object, hitTime = null) {
  const key = hitTime == null ? 'a' : 'h' + hitTime;
  let box = INFO.get(clip); if (box?.[key]) return box[key];
  const D = clip.duration, N = Math.max(8, Math.round(D * SR)), h = D / N, sp = new Float32Array(N + 2);
  object.updateWorldMatrix(true, true);
  for (const tr of clip.tracks) {
    const k = tr.name.lastIndexOf('.'), prop = tr.name.slice(k + 1), node = object.getObjectByName(tr.name.slice(0, k)), rot = prop === 'quaternion';
    if (!node || /sway/i.test(node.name) || (!rot && prop !== 'position')) continue;
    let w = 0; node.getWorldPosition(_a);
    if (rot) node.traverse((c) => { if (c !== node && c.isBone) w = Math.max(w, c.getWorldPosition(_b).distanceTo(_a)); });
    else w = node.parent ? node.parent.getWorldScale(_b).x : 1;
    if (!(w > 0)) continue;
    const it = tr.createInterpolant();
    for (let i = 0; i <= N; i++) { // sp[i]: tốc độ trong khoảng [i-1, i]
      const r = it.evaluate(i * h);
      if (rot) { if (i) sp[i] += (w * 2 * Math.acos(Math.min(1, Math.abs(_q.x * r[0] + _q.y * r[1] + _q.z * r[2] + _q.w * r[3])))) / h; _q.set(r[0], r[1], r[2], r[3]); }
      else { if (i) sp[i] += (w * Math.hypot(r[0] - _p.x, r[1] - _p.y, r[2] - _p.z)) / h; _p.set(r[0], r[1], r[2]); }
    }
  }
  const s = new Float32Array(N + 2); let top = 0;
  for (let i = 1; i <= N; i++) { s[i] = (sp[i - 1 > 0 ? i - 1 : 1] + 2 * sp[i] + sp[i < N ? i + 1 : N]) / 4; top = Math.max(top, s[i]); }
  // đoạn quanh đỉnh i: đi tới / lùi tới khi tốc độ < 25% đỉnh (hoặc gặp đáy giữa hai đỉnh)
  const end = (i) => { let j = i; while (j < N && s[j + 1] > 0.25 * s[i] && !(s[j + 1] > s[j] && s[j] < 0.6 * s[i])) j++; return j * h; };
  const start = (i) => { let j = i; while (j > 1 && s[j - 1] > 0.25 * s[i] && !(s[j - 1] > s[j] && s[j] < 0.6 * s[i])) j--; return (j - 1) * h; };
  const peak = (i) => s[i] >= 0.1 * top && s[i] >= s[i - 1] && s[i] > s[i + 1];
  let out = null;
  if (hitTime != null) { // điểm chạm cho sẵn: đỉnh gồng = đầu đoạn nhanh của đỉnh tốc độ gần điểm chạm nhất (trước nó, hoặc sau ≤ 0,1 s)
    let bi = 0, bd = Infinity;
    for (let i = 1; i <= N; i++) { const t = (i - 0.5) * h, d = Math.abs(t - hitTime); if (peak(i) && t <= hitTime + 0.1 && t >= hitTime - 0.35 * D && d < bd) { bd = d; bi = i; } }
    // đỉnh nằm SAU hitTime: hitTime đặt sớm (còn đang gồng, vd giương cung) → điểm chạm thật là cuối đoạn nhanh đó (lúc buông dây)
    out = bi ? { hit: (bi - 0.5) * h > hitTime ? Math.max(hitTime, end(bi)) : hitTime, coil: start(bi) } : { hit: hitTime, coil: hitTime - 0.12 * D };
  } else {
    let best = -1;
    for (let i = 1; i <= N; i++) {
      if (s[i] < 0.18 * top || !peak(i)) continue;
      const hit = end(i), sc = s[i] * (0.75 + (0.5 * hit) / D);
      if (hit <= 0.82 * D && sc > best) { best = sc; out = { hit, coil: start(i) }; }
    }
    out ||= { hit: 0.5 * D, coil: 0.3 * D };
  }
  out.hit = Math.max(0.03, Math.min(out.hit, D * 0.95)); out.coil = Math.max(0, Math.min(out.coil, out.hit - 0.03));
  (box ||= {})[key] = out; INFO.set(clip, box);
  return out;
}

// —— Nhịp phát (giây, × tốc độ clip gốc) theo loại: rate tốc độ giáng, sMin/sMax thời lượng giáng, hold khựng ở tư thế chạm (creep: clip
// vẫn trôi chậm cho khỏi đơ), rec tốc độ thu đòn, wMax gồng nhanh nhất. Gồng luôn chậm hơn giáng ≥ CONTRAST lần (không đủ thời gian thì
// bỏ bớt đầu đoạn gồng, không gồng vội) ——
const PACE = {
  attack: { rate: 2.2, sMin: 0.045, sMax: 0.09, hold: 0.045, creep: 0.25, rec: 1.1, wMax: 1.9 },
  cast: { rate: 2.6, sMin: 0.05, sMax: 0.12, hold: 0.075, creep: 0.18, rec: 1, wMax: 1.8 },
  ult: { rate: 2.4, sMin: 0.06, sMax: 0.16, hold: 0.12, creep: 0.12, rec: 1, wMax: 1.7 },
};
const CONTRAST = 1.6;
// Lớp thân theo kiểu đòn (cộng lên node model, không đổi mô phỏng): lw/ls ngả người lúc gồng / lúc giáng (rad, + chúi tới trước),
// zw/zs lùi / lao tới (phần chiều cao tướng, + tới trước), qw/qs/qi co lúc gồng / duỗi lúc giáng / nén lúc chạm (tỉ lệ chiều cao)
const BODY = {
  swing: { lw: -0.07, zw: -0.03, qw: -0.035, ls: 0.12, zs: 0.085, qs: 0.03, qi: -0.035 }, // vung vũ khí cận chiến: ngả sau, chúi + lao theo đòn
  chop: { lw: -0.08, zw: -0.03, qw: -0.04, ls: 0.13, zs: 0.075, qs: 0.03, qi: -0.045 }, // bổ từ trên xuống (tay đi xuống mạnh): nén người lúc chạm
  slam: { lw: -0.08, zw: -0.02, qw: -0.045, ls: 0.12, zs: 0.04, qs: 0.035, qi: -0.045 }, // đập đất: co người gồng, duỗi, nén mạnh lúc chạm
  shot: { lw: -0.025, zw: 0, qw: -0.015, ls: -0.06, zs: -0.045, qs: 0.012, qi: 0 }, // bắn: giật lùi
  spell: { lw: -0.045, zw: -0.015, qw: -0.025, ls: 0.07, zs: 0.035, qs: 0.03, qi: -0.015 }, // phép: ngả sau tụ lực, đẩy tới
  raise: { lw: 0.025, zw: 0.005, qw: -0.045, ls: -0.06, zs: -0.012, qs: 0.05, qi: 0.015 }, // giơ tay lên trời (clip): khom tụ lực rồi vươn người, ưỡn ngực
  buff: { lw: -0.02, zw: 0, qw: -0.05, ls: -0.035, zs: 0, qs: 0.05, qi: -0.02 }, // tự cường hoá: co rồi bung người lên
  dash: { lw: 0, zw: 0, qw: -0.02, ls: 0.16, zs: 0.03, qs: 0.03, qi: 0 }, // lướt: chúi hẳn người tới trước
};
const POWER = { attack: 0.6, cast: 1, ult: 1.35 };
const KICK = { attack: 0, cast: 1, ult: 1.8 }; // độ giật camera (camera.js kick) lúc chạm — chỉ dùng cho tướng người chơi

export function createAnimator({ object, animations, art }) {
  const mixer = new THREE.AnimationMixer(object);
  const map = art.clipMap || {};
  const actions = {};
  for (const clip of animations) actions[clip.name] = mixer.clipAction(clip);
  const clipOf = (n) => actions[map[n] || n];
  // phân tích sẵn lúc nạp model (không để khựng lần tung chiêu đầu). Hướng cú đánh: tay / mũi vũ khí đi từ thế gồng tới tư thế chạm (hệ model:
  // +Z trước mặt, +Y lên, theo chiều cao) — dựng thử tư thế ở hai mốc (dừng action thì xương về lại tư thế cũ); giơ lên trời thì lớp thân vươn
  // người thay vì chúi tới, bổ xuống thì nén người lúc chạm
  const tips = ['R', 'L'].map((k) => object.getObjectByName(`Bone_Hand${k}_Tip`) || object.getObjectByName(`Bone_Hand${k}`)).filter(Boolean);
  for (const n of ['Attack1', 'Attack2', 'Cast1', 'Cast2', 'Ult']) {
    const a = clipOf(n); if (!a) continue;
    const info = analyzeClip(a.getClip(), object, art.hitTime?.[n] ?? null);
    if (info.up != null || !tips.length) continue;
    a.reset().play(); a.timeScale = 0; _a.set(0, 0, 0);
    for (const [t, k] of [[info.coil, -1], [info.hit, 1]]) {
      a.time = t; mixer.update(0); object.updateMatrixWorld(true); _m.copy(object.matrixWorld).invert();
      for (const b of tips) _a.addScaledVector(b.getWorldPosition(_b).applyMatrix4(_m), k / tips.length);
    }
    a.stop(); const H = (art.height || 250) / (art.scale || 100); info.up = _a.y / H; info.fwd = _a.z / H;
  }
  let cur = null, oneShot = null, time = 0, dead = false, stop = 0, lunge = 0, react = 0; // react: vừa bị đánh — lò xo cứng hơn để giật nhanh, về nhanh
  let pendIn = 0, pendStop = 0, pendLean = 0; // khựng / giật chờ tới lúc vũ khí người đánh tới tư thế chạm (chiêu trúng ngay khi bấm)
  // lớp thân: lò xo [lao tới, vận tốc, ngả, vận tốc, co/duỗi, vận tốc] + đích; giá trị gốc của node model
  const S = new Float32Array(6), G = new Float32Array(3), p0 = object.position.clone(), r0 = object.rotation.x, s0 = object.scale.clone();
  const base = (name) => {
    const next = clipOf(name); if (!next || next === cur) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
    if (cur) cur.fadeOut(0.12);
    cur = next;
  };
  /** τ (giây kể từ lúc bấm) → thời gian clip theo lịch w; ghi pha hiện tại (1 gồng, 2 giáng, 3 khựng, 4 thu, 0 xong) và tiến độ pha. */
  const warp = (w, t) => {
    if (t < w.tW) { const x = t / w.tW; w.ph = 1; w.x = x; return w.c0 + (w.cS - w.c0) * x * (1.3 - 0.3 * x); } // gồng: chậm dần vào thế
    t -= w.tW;
    if (t < w.tS) { const x = t / w.tS; w.ph = 2; w.x = x; return w.cS + (w.cI - w.cS) * (1 - (1 - x) * (1 - x)); } // giáng: dồn lực ngay đầu đoạn
    t -= w.tS;
    if (t < w.tH) { const x = t / w.tH; w.ph = 3; w.x = x; return w.cI + (w.cH - w.cI) * x; } // khựng ở tư thế chạm
    t -= w.tH;
    const x = Math.min(1, t / w.tR); w.ph = x < 1 ? 4 : 0; w.x = x; return w.cH + (w.D - w.cH) * x; // thu đòn
  };
  /** Lớp thân: đích theo pha của đòn đang phát → lò xo (bước nhỏ ≤ 1/120 s, không phụ thuộc FPS) → ghi lên node model. */
  const body = (dt, H) => {
    const w = oneShot?.w, B = w?.body;
    let k = 14, z = 0.75; // độ cứng (rad/s) và hệ số tắt dần: về thế đứng chậm, mềm, hơi lố
    if (!B || !w.ph) G[0] = G[1] = G[2] = 0;
    else if (w.ph === 1) { const e = Math.sin((w.x * Math.PI) / 2), p = w.pow; G[0] = B.zw * p * e; G[1] = B.lw * p * e; G[2] = B.qw * p * e; k = 18; }
    else if (w.ph === 4) { G[0] = G[1] = G[2] = 0; k = 11; z = 0.62; }
    else { const p = w.pow; G[0] = B.zs * p; G[1] = B.ls * p; G[2] = (w.ph === 2 ? B.qs : B.qi) * p; k = 32; z = 0.6; }
    if (react > 0) { react -= dt; k = Math.max(k, 26); }
    const k2 = k * k, c = 2 * z * k;
    for (let n = Math.ceil(dt * 120), h = n ? dt / n : 0; n > 0; n--) for (let i = 0; i < 3; i++) { const j = 2 * i; S[j + 1] += (k2 * (G[i] - S[j]) - c * S[j + 1]) * h; S[j] += S[j + 1] * h; }
    const q = Math.max(-0.08, Math.min(0.08, S[4])); // co / duỗi tối đa 8% chiều cao
    lunge = S[0] * H;
    object.position.set(p0.x, p0.y, p0.z + lunge);
    object.rotation.x = r0 + Math.max(-0.3, Math.min(0.3, S[2]));
    object.scale.set(s0.x * (1 - q * 0.5), s0.y * (1 + q), s0.z * (1 - q * 0.5));
  };
  base('Idle');
  return {
    /** Phát clip hành động một lần. hitAt: thời điểm (giây, từ lúc bắt đầu) chiêu / đòn phát ra trong mô phỏng; minT: sau mốc này, tướng chạy
     *  thì clip nhường cho Run. feel = { kind: 'attack' | 'cast' | 'ult', style (BODY), late (giây sự kiện đã trễ) }: phát theo nhịp uốn để
     *  tư thế chạm rơi đúng hitAt. Không có feel (Chết): nhịp đều như cũ — có art.hitTime[tên clip] thì chỉnh tốc độ cho cú chạm khớp
     *  hitAt, không thì dùng seconds (thời gian muốn clip chiếm). */
    trigger(name, seconds = null, hold = false, hitAt = null, minT = null, feel = null) {
      const a = clipOf(name); if (!a) return;
      const clip = a.getClip(), dur = clip.duration, ht = art.hitTime?.[name];
      const fade = feel && (hitAt ?? 1) - (feel.late || 0) < 0.12 ? 0.035 : 0.06; // đòn phải chạm ngay: chuyển gần như tức thì vào thế đánh
      a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = hold; a.fadeIn(fade).play();
      if (cur && cur !== a) cur.fadeOut(fade);
      if (oneShot && oneShot.a !== a) oneShot.a.fadeOut(fade);
      if (name === 'Death') dead = true;
      if (!feel || hold) {
        const scale = hitAt != null && ht ? Math.min(2.5, Math.max(0.6, ht / Math.max(0.08, hitAt))) : seconds ? Math.min(3, Math.max(0.5, dur / seconds)) : 1;
        a.timeScale = scale;
        oneShot = { a, end: time + dur / scale, hold, cut: minT != null ? time + minT : Infinity, w: null };
        return;
      }
      const P = PACE[feel.kind] || PACE.cast, info = analyzeClip(clip, object, ht ?? null), late = Math.max(0, feel.late || 0);
      const cI = info.hit, cS = info.coil, T = Math.max(0, (hitAt ?? Math.min(0.45, Math.max(0.15, cI / 1.15))) - late); // không có mốc mô phỏng (tự cường hoá): nhịp tự nhiên của clip
      let tS = Math.min(P.sMax, Math.max(P.sMin, (cI - cS) / P.rate));
      if (T < tS) tS = Math.max(T, P.sMin); // chiêu phát ra ngay: vào thẳng cú giáng (tư thế chạm trễ ≤ 2 khung)
      const tW = Math.max(0, T - tS), c0 = Math.max(0, cS - tW * Math.min(P.wMax, (cI - cS) / tS / CONTRAST)); // gồng hết không kịp: bỏ bớt đầu
      const hit = tW + tS, tH = P.hold * (feel.hold ?? 1), cH = Math.min(dur, cI + tH * P.creep); // hit: lúc tới tư thế chạm (giây, tính từ khung này)
      let tR = (dur - cH) / P.rec;
      if (seconds && hit + tH + tR > seconds - late) tR = Math.max((dur - cH) / 3.5, seconds - late - hit - tH); // đánh nhanh: thu đòn gọn cho kịp đòn sau
      const st = feel.style, B = (st === 'swing' || st === 'spell' || st === 'slam') && info.up > 0.2 ? BODY.raise : st === 'swing' && info.up < -0.35 ? BODY.chop : BODY[st];
      const w = { D: dur, c0, cS, cI, cH, tW, tS, tH, tR: Math.max(0.01, tR), hit, ph: 1, x: 0, struck: false, body: B || null, pow: POWER[feel.kind] ?? 1,
        kick: (KICK[feel.kind] ?? 0) * (feel.style === 'slam' ? 1.3 : feel.style === 'dash' ? 0.5 : 1) };
      if (B && tW < 0.06) { const p = w.pow; S[0] += (B.zw * p - S[0]) * 0.8; S[2] += (B.lw * p - S[2]) * 0.8; S[4] += (B.qw * p - S[4]) * 0.8; } // không kịp gồng: thân vào ngay thế gồng (khung đầu) rồi bật ra cú giáng
      a.timeScale = 0; a.time = c0; // tự đặt thời gian clip mỗi khung (timeScale 0: mixer không tự chạy action này, vẫn lo trộn / mờ dần)
      const m = minT != null ? minT - late : Infinity, cut = m >= hit - 0.1 && m < hit + tH * 0.6 ? hit + tH * 0.6 : m; // hết đứng ra chiêu ngay lúc chạm: vẫn cho thấy tư thế chạm
      oneShot = { a, end: time + hit + tH + w.tR, hold: false, cut: time + cut, w, t: 0 };
    },
    /** Khựng (hit-stop): thời gian tướng gần như dừng `sec` giây (lần mới dài hơn thì đè); wait: chờ bao lâu mới khựng (đòn trúng trước khi
     *  vũ khí vung tới tư thế chạm — chiêu trúng ngay lúc bấm — thì khựng đúng lúc chạm). */
    hitStop(sec, wait = 0) { if (wait > 0) { pendIn = wait; pendStop = Math.max(pendStop, sec); } else stop = Math.max(stop, sec); },
    /** Đòn đang phát vừa tới / đang ở quanh tư thế chạm (để chỉ khựng người đánh khi đòn trúng đúng lúc vung tới). */
    nearImpact() { const o = oneShot; return !!o?.w && o.t > o.w.hit - 0.08 && o.t < o.w.hit + o.w.tH + 0.14; },
    /** Bị đánh: giật người (ngả, + = chúi tới trước theo hướng mặt) — lò xo đưa về. */
    flinch(lean, wait = 0) { if (dead) return; if (wait > 0) { pendIn = wait; pendLean = lean; } else { S[2] += lean; react = 0.2; } },
    /** Còn bao lâu (giây) tới tư thế chạm của đòn đang phát (null: không có) — hiệu ứng "loé lúc phát chiêu" hẹn đúng lúc này. */
    get impactIn() { const o = oneShot; return o?.w && o.t <= o.w.hit ? o.w.hit - o.t : null; },
    /** Độ giật camera vừa tới tư thế chạm ở khung này (0: không có). */
    struck: 0,
    /** Bước lao tới / giật lùi hiện tại của lớp thân (đơn vị thế giới, theo hướng mặt) — bóng tròn dưới chân đi theo. */
    get lunge() { return lunge; },
    // hồi sinh: dừng hẳn mọi clip (clip Chết giữ khung cuối với trọng số 1 — chỉ phát Idle chồng lên thì tướng vẫn nằm/trượt theo dáng chết)
    revive() { mixer.stopAllAction(); dead = false; oneShot = null; cur = null; stop = pendIn = pendStop = pendLean = react = 0; S.fill(0); base('Idle'); },
    update(state, speed, dt, art2) {
      let d = dt;
      if (pendIn > 0 && (pendIn -= dt) <= 0) { stop = Math.max(stop, pendStop); if (pendLean && !dead) { S[2] += pendLean; react = 0.2; } pendStop = pendLean = 0; }
      if (stop > 0) { const f = Math.min(stop, dt); stop -= f; d = dt - f + f * 0.04; } // khựng: chỉ còn 4% tốc độ
      time += d; this.struck = 0;
      const o = oneShot;
      if (o?.w) { // nhịp uốn: tự tính thời gian clip
        o.t += d; o.a.time = warp(o.w, o.t);
        if (!o.w.struck && o.t >= o.w.hit) { o.w.struck = true; this.struck = o.w.kick; }
      }
      if (oneShot && !oneShot.hold && state === 'Run' && time >= oneShot.cut) { oneShot.a.fadeOut(0.15); oneShot = null; cur = null; } // đã ra đòn xong mà tướng chạy: về dáng chạy ngay
      if (oneShot && (time < oneShot.end || oneShot.hold)) { mixer.update(d); body(d, (art2 || art).height || 250); return; }
      if (oneShot) { oneShot.a.fadeOut(0.12); oneShot = null; cur = null; }
      if (!dead) {
        base(state);
        const run = clipOf('Run');
        if (state === 'Run' && run) run.timeScale = speed / ((art2 || art).runRefSpeed || 320);
      }
      mixer.update(d);
      body(d, (art2 || art).height || 250);
    },
  };
}
