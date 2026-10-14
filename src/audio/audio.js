// Âm thanh game (Web Audio). Mọi hiệu ứng nằm trong MỘT file (assets/audio/sfx.mp3 + sfx.json — "audio sprite" dựng bằng
// tools/sfx/build.mjs, tổng hợp hoàn toàn bằng code), nhạc sảnh assets/audio/lobby.mp3 (lặp liền mạch nhờ điểm lặp ghi trong sfx.json).
// - Giải mã sớm bằng OfflineAudioContext (không cần chạm, không cảnh báo tự phát); AudioContext thật tạo ở lần chạm đầu tiên — iPhone
//   chỉ cho phát tiếng sau một cử chỉ của người chơi. Mỗi lần chạm sau đó nếu ngữ cảnh bị treo (gọi điện, chuyển ứng dụng) thì tiếp tục.
// - Đầu mỗi file có vạch đồng bộ 5 ms: đo vị trí thật sau giải mã để bù độ trễ bộ mã MP3 (mỗi trình duyệt cắt khác nhau).
// - Âm lượng = nhóm (ui, minor, combat, skill, econ, sting) × cài đặt (core/prefs.js: sfx/sfxVol, music/musicVol, announcer).
// - Tiếng có vị trí (x, y thế giới): đủ to trong ~700 quanh tâm camera, nhỏ dần tới im ở 3000; lệch trái/phải theo màn hình.
// - Chống rè khi giao tranh đông: cùng một tiếng cách nhau ≥ 35 ms, tối đa vài bản cùng lúc mỗi tiếng, tổng ≤ 24 tiếng (bỏ tiếng ưu tiên
//   thấp trước), bộ nén cuối đường hiệu ứng; cao độ lệch nhẹ ngẫu nhiên mỗi lần để tiếng lặp lại không bị "máy móc".
import { prefs, onPref } from '../core/prefs.js';

const BASE = './assets/audio/';
const CAT = { ui: 0.75, minor: 0.5, combat: 0.9, skill: 0.95, econ: 0.8, sting: 1 };
const PRI = { minor: 0, ui: 1, combat: 2, econ: 2, skill: 3, sting: 4 };
const JIT = { ui: 0.02, minor: 0.12, combat: 0.1, skill: 0.06, econ: 0.04, sting: 0 }; // biên độ lệch cao độ
const MAX_VOICES = 24, GAP = 0.035, NEAR = 700, FAR = 3000;
const PER = { hit_minion: 3, shot_minion: 3, death_minion: 3, swing_light: 4, swing_heavy: 4, coin: 3, tower_shot: 3 }; // số bản cùng lúc (mặc định 4)

let ctx = null, sfxBus = null, musBus = null, sprite = null, meta = null, delay = 0, loading = null;
const voices = [], last = new Map();
const listener = { x: 0, y: 0, rx: 1, ry: 0 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Vị trí vạch đồng bộ thật trong bản đã giải mã (giây) − vị trí ghi trong file = độ trễ cần bù. */
function syncDelay(buf, at) {
  const d = buf.getChannelData(0), n = Math.min(d.length, Math.round(buf.sampleRate * (at + 0.4)));
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > 0.3) return clamp(i / buf.sampleRate - at, -0.05, 0.12);
  return 0;
}
function decode(bytes, ch = 1) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
  const oc = new OAC(ch, 1, 44100);
  return new Promise((res, rej) => { const p = oc.decodeAudioData(bytes, res, rej); p?.catch?.(rej); });
}
const fetchBytes = (f) => fetch(BASE + f).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.arrayBuffer(); });

/** Tải + giải mã bộ hiệu ứng (gọi sớm ở màn tải game; lỗi thì game vẫn chạy, chỉ không có tiếng). */
export function loadAudio() {
  if (loading) return loading;
  loading = Promise.all([fetch(BASE + 'sfx.json').then((r) => r.json()), fetchBytes('sfx.mp3')])
    .then(([m, bytes]) => { meta = m; return decode(bytes); })
    .then((buf) => { sprite = buf; delay = syncDelay(buf, meta.sync); window.__audio && (window.__audio.delay = delay); if (want) startMusic(); })
    .catch((e) => { console.warn('âm thanh:', e?.message || e); });
  return loading;
}

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { try { ctx = new AC(); } catch (_) { return null; } }
  const comp = ctx.createDynamicsCompressor(); // hiệu ứng chồng nhiều: nén nhẹ thay vì vỡ tiếng
  comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
  sfxBus = ctx.createGain(); musBus = ctx.createGain();
  sfxBus.connect(comp); comp.connect(ctx.destination); musBus.connect(ctx.destination);
  volumes(true);
  return ctx;
}
function volumes(now = false) {
  if (!ctx) return;
  const p = prefs(), t = ctx.currentTime, set = (g, v) => { g.gain.cancelScheduledValues(t); if (now) g.gain.value = v; else g.gain.setTargetAtTime(v, t, 0.05); };
  set(sfxBus, p.sfx ? p.sfxVol : 0); set(musBus, p.music ? p.musicVol * 0.55 : 0); // nhạc nền nằm dưới tiếng hiệu ứng
}
/** Mở khoá âm thanh trong lúc người chơi chạm (bắt buộc trên iPhone). */
function unlock() {
  const c = context(); if (!c) return;
  if (c.state !== 'running') c.resume?.().catch(() => {});
  if (!unlock.done) { unlock.done = true; try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (_) { /* bỏ qua */ } }
  if (want && !musSrc) startMusic();
}
if (typeof window !== 'undefined') {
  for (const t of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(t, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { // ẩn trang: treo ngữ cảnh (đỡ tốn pin, nhạc không kêu nền); quay lại thì tiếp tục
    if (!ctx) return; if (document.hidden) ctx.suspend?.().catch(() => {}); else ctx.resume?.().catch(() => {});
  });
  onPref((k) => { if (/^(sfx|sfxVol|music|musicVol)$/.test(k)) volumes(); if (k === 'music') { if (prefs().music && want && !musSrc) startMusic(); } });
}

function cleanup(now) { for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end < now) voices.splice(i, 1); }
function kill(v, fade = 0.03) { try { const t = ctx.currentTime; v.gn.gain.cancelScheduledValues(t); v.gn.gain.setValueAtTime(v.gn.gain.value, t); v.gn.gain.linearRampToValueAtTime(0, t + fade); v.src.stop(t + fade + 0.01); } catch (_) { /* đã dừng */ } const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); }

/**
 * Phát một tiếng trong bộ. o: { x, y (vị trí thế giới → nhỏ dần theo khoảng cách + lệch trái/phải), vol, rate (cao độ), pan, delay (giây),
 *   gap (giây, khoảng cách tối thiểu cùng tiếng), announce (tiếng thông báo — tắt được bằng cài đặt) }. Trả về { stop(fade) } hoặc null.
 */
export function play(name, o = {}) {
  if (!ctx || ctx.state !== 'running' || !sprite) return null;
  const p = prefs(), m = meta.sounds[name]; if (!m || !p.sfx || p.sfxVol <= 0 || (o.announce && !p.announcer)) return null;
  const [at, dur, cat] = m, now = ctx.currentTime, when = now + Math.max(0, o.delay || 0);
  if (when - (last.get(name) ?? -9) < (o.gap ?? GAP)) return null;
  let vol = (o.vol ?? 1) * CAT[cat], pan = o.pan ?? 0;
  if (o.x != null) {
    const dx = o.x - listener.x, dy = o.y - listener.y, d = Math.hypot(dx, dy); if (d >= FAR) return null;
    vol *= d <= NEAR ? 1 : ((FAR - d) / (FAR - NEAR)) ** 1.5;
    pan = clamp((dx * listener.rx + dy * listener.ry) / 2600, -0.7, 0.7);
  }
  if (vol < 0.03) return null;
  cleanup(now);
  const same = voices.filter((v) => v.name === name);
  if (same.length >= (PER[name] ?? 4)) kill(same[0]); // quá nhiều bản cùng tiếng: tắt bản cũ nhất
  if (voices.length >= MAX_VOICES) { // đầy: thay tiếng ưu tiên thấp nhất (nếu thấp hơn tiếng mới), không thì bỏ tiếng mới
    let low = null; for (const v of voices) if (!low || v.pri < low.pri || (v.pri === low.pri && v.end < low.end)) low = v;
    if (!low || low.pri > PRI[cat]) return null; kill(low);
  }
  last.set(name, when);
  const src = ctx.createBufferSource(), gn = ctx.createGain();
  src.buffer = sprite; src.playbackRate.value = o.rate ?? 1 + (Math.random() - 0.5) * JIT[cat];
  gn.gain.value = vol; src.connect(gn);
  let out = gn;
  if (pan && ctx.createStereoPanner) { const sp = ctx.createStereoPanner(); sp.pan.value = pan; gn.connect(sp); out = sp; }
  out.connect(sfxBus);
  src.start(when, at + delay, dur);
  const v = { src, gn, name, pri: PRI[cat], end: when + dur / src.playbackRate.value + 0.05 };
  voices.push(v); src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); };
  if (window.__audio?.played.length < 400) window.__audio.played.push(name); // kiểm thử tự động: tiếng đã phát
  return { stop: (fade = 0.12) => kill(v, fade) };
}
/** Tiếng giao diện (không vị trí). */
export const sfx = (name, o) => play(name, o);
/** Tâm nghe = tâm camera (x, y thế giới) + hướng "sang phải" của màn hình trên mặt đất (rx, ry) để lệch trái/phải. */
export function setListener(x, y, rx = 1, ry = 0) { listener.x = x; listener.y = y; const l = Math.hypot(rx, ry) || 1; listener.rx = rx / l; listener.ry = ry / l; }

// —— nhạc nền (sảnh): giải mã khi cần, lặp liền mạch theo điểm lặp; vào trận thì tắt dần và trả bộ nhớ ——
let want = null, musSrc = null, musGain = null, musBuf = null, musBytes = null, musLoad = null;
function startMusic() {
  if (!want || !ctx || ctx.state !== 'running' || !meta?.music?.[want] || !prefs().music) return;
  const info = meta.music[want];
  if (!musBuf) {
    if (musLoad) return;
    musLoad = (musBytes ? Promise.resolve(musBytes) : fetchBytes(info.file).then((b) => (musBytes = b)))
      .then((b) => decode(b.slice(0), 2)).then((buf) => { musBuf = buf; musBuf.d = syncDelay(buf, info.sync); musLoad = null; startMusic(); })
      .catch((e) => { musLoad = null; console.warn('nhạc:', e?.message || e); });
    return;
  }
  if (musSrc) return;
  const d = musBuf.d || 0, t = ctx.currentTime;
  musSrc = ctx.createBufferSource(); musSrc.buffer = musBuf; musSrc.loop = true; musSrc.loopStart = info.start + d; musSrc.loopEnd = info.end + d;
  musGain = ctx.createGain(); musGain.gain.setValueAtTime(0, t); musGain.gain.linearRampToValueAtTime(1, t + 1.6);
  musSrc.connect(musGain); musGain.connect(musBus); musSrc.start(t, info.start + d);
}
/** Bật nhạc nền 'lobby' (bắt đầu ngay khi được phép phát), hoặc music(null) để tắt dần. */
export function music(name, fade = 1.2) {
  if (name === want && (name ? musSrc || musLoad : !musSrc)) return;
  want = name || null;
  if (musSrc && ctx) { const s = musSrc, g = musGain, t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); s.stop(t + fade + 0.05); musSrc = null; }
  if (want) startMusic(); else setTimeout(() => { if (!want) musBuf = null; }, (fade + 0.2) * 1000); // trong trận không giữ ~15 MB nhạc đã giải mã
}
export const audioReady = () => !!(sprite && ctx && ctx.state === 'running');
if (typeof window !== 'undefined') window.__audio = { play, music, get state() { return ctx?.state || 'none'; }, get voices() { return voices.length; }, get music() { return musSrc ? want : null; }, delay: 0, get loaded() { return !!sprite; }, played: [] }; // kiểm thử tự động
