// Dựng âm thanh của game: node tools/sfx/build.mjs [tên…]  (cần ffmpeg có libmp3lame)
//   → assets/audio/sfx.mp3 + sfx.json: mọi hiệu ứng ghép thành một file ("audio sprite": một lần tải, một lần giải mã), có vạch đồng bộ
//     ở đầu để trình chơi tự bù độ trễ bộ mã MP3; assets/audio/lobby.mp3: nhạc sảnh lặp liền mạch (stereo).
// Độ to: chuẩn hoá theo nhóm bằng RMS ngắn hạn lớn nhất (cửa sổ 50 ms), đo trung bình nhân giữa toàn dải và "dải loa điện thoại"
// (lọc bỏ dưới ~220 Hz) — tiếng nặng phần trầm (đòn đánh vào người, sập trụ) không bị nhỏ hẳn trên loa iPhone; bỏ phần dưới 55 Hz
// (chỉ tốn đỉnh; vài tiếng nặng đặt `low` cao hơn); đỉnh vượt 0,88 thì giới hạn nhìn trước (tối đa ~6 dB, không xén méo).
// Thêm --preview: ghi ảnh phổ (spectrogram) từng tiếng vào thư mục tạm để soát bằng mắt.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SR, N, rng, fade, dcBlock, trim, peak, wav, hp, limit } from './dsp.mjs';
import { BANK, lobbyMusic, fieldAmbience } from './bank.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), OUT = path.join(ROOT, 'assets/audio');
const TARGET = { ui: 0.11, minor: 0.09, combat: 0.2, skill: 0.19, econ: 0.15, sting: 0.24 }; // RMS ngắn hạn mục tiêu theo nhóm
const GAP = 0.25, LEAD = 0.05;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function stRms(x, win = N(0.05)) { let best = 0; for (let s = 0; s < x.length; s += win >> 1) { let a = 0; const e = Math.min(x.length, s + win); for (let i = s; i < e; i++) a += x[i] * x[i]; best = Math.max(best, Math.sqrt(a / win)); } return best; }
const phoneBand = (x) => hp(hp(x, 220, 0.7), 220, 0.7);
export const loudness = (x) => Math.sqrt(stRms(x) * stRms(phoneBand(x)) / 0.8); // tiếng dải giữa (tỉ lệ dải loa ≈ 0,8) giữ nguyên số đo cũ
function level(x, cat, low = 55) { // low: tần số cắt trầm (tiếng va đập nặng cắt cao hơn: dồn độ to sang dải loa điện thoại phát được)
  x = hp(x, low, 0.7);
  const k = Math.min(TARGET[cat] / (loudness(x) || 1), 1.76 / (peak(x) || 1)), y = new Float32Array(x.length); // giới hạn tối đa ~6 dB
  for (let i = 0; i < x.length; i++) y[i] = x[i] * k;
  return limit(y, 0.88); // chừa khoảng cho MP3 vượt đỉnh
}
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

const only = process.argv.slice(2).filter((a) => !a.startsWith('--')), preview = process.argv.includes('--preview');
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-'));

// ——— hiệu ứng ———
const t0 = Date.now(), parts = [], meta = {};
const sync = new Float32Array(N(0.005)); for (let i = 0; i < sync.length; i++) sync[i] = 0.9 * Math.sin((2 * Math.PI * 1000 * i) / SR); // vạch đồng bộ
let pos = LEAD + sync.length / SR + GAP;
for (const [name, def] of Object.entries(BANK)) {
  if (only.length && !only.includes(name)) continue;
  let x = def.build(rng(hash(name)));
  x = level(fade(trim(dcBlock(x)), 0.001, 0.03), def.cat, def.low); // cắt đuôi im lặng TRƯỚC rồi mới hạ dần: không còn tiếng tách ở cuối
  meta[name] = [+pos.toFixed(4), +(x.length / SR).toFixed(4), def.cat];
  parts.push([x, pos]); pos += x.length / SR + GAP;
  if (preview) { const f = path.join(tmp, name + '.wav'); fs.writeFileSync(f, wav(x)); }
}
const sprite = new Float32Array(N(pos + 0.1));
sprite.set(sync, N(LEAD));
for (const [x, at] of parts) sprite.set(x, N(at));
fs.writeFileSync(path.join(tmp, 'sfx.wav'), wav(sprite));
if (!only.length) {
  ff(['-i', path.join(tmp, 'sfx.wav'), '-ac', '1', '-c:a', 'libmp3lame', '-q:a', '3', path.join(OUT, 'sfx.mp3')]);
  const music = {};
  console.log(`hiệu ứng: ${Object.keys(meta).length} tiếng, ${(pos).toFixed(1)} giây → sfx.mp3 ${(fs.statSync(path.join(OUT, 'sfx.mp3')).size / 1024).toFixed(0)} KB (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  // ——— nhạc sảnh ———
  // file nhạc: [vạch đồng bộ][1 s cuối bài][cả bài][1 s đầu bài] — vùng lặp [start, end) nằm giữa, hai bên là phần nối tiếp đúng của vòng lặp
  // nên bộ mã MP3 không tạo tiếng "bụp" ở điểm nối; trình chơi đặt loopStart/loopEnd đã bù độ trễ đo bằng vạch đồng bộ.
  const t1 = Date.now(), [L, R] = lobbyMusic(), p = Math.max(peak(L), peak(R)), k = 0.82 / p, W = N(1), len = L.length, at = LEAD + sync.length / SR + 0.2;
  const ML = new Float32Array(N(at) + len + 2 * W + N(0.1)), MR = new Float32Array(ML.length);
  ML.set(sync, N(LEAD)); MR.set(sync, N(LEAD));
  for (let i = 0; i < len + 2 * W; i++) { const j = (i - W + len) % len; ML[N(at) + i] = L[j] * k; MR[N(at) + i] = R[j] * k; }
  fs.writeFileSync(path.join(tmp, 'lobby.wav'), wav([ML, MR]));
  ff(['-i', path.join(tmp, 'lobby.wav'), '-c:a', 'libmp3lame', '-b:a', '112k', path.join(OUT, 'lobby.mp3')]);
  const start = (N(at) + W) / SR; music.lobby = { file: 'lobby.mp3', sync: LEAD, start: +start.toFixed(5), end: +(start + len / SR).toFixed(5) };
  console.log(`nhạc sảnh: ${(len / SR).toFixed(1)} giây → lobby.mp3 ${(fs.statSync(path.join(OUT, 'lobby.mp3')).size / 1024).toFixed(0)} KB (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
  // ——— âm nền trong trận (một kênh, cùng cách quấn vòng + vạch đồng bộ) ———
  {
    const A = fieldAmbience(), p2 = peak(A), k2 = 0.7 / p2, len2 = A.length, M = new Float32Array(N(at) + len2 + 2 * W + N(0.1));
    M.set(sync, N(LEAD)); for (let i = 0; i < len2 + 2 * W; i++) M[N(at) + i] = A[(i - W + len2) % len2] * k2;
    fs.writeFileSync(path.join(tmp, 'field.wav'), wav(M));
    ff(['-i', path.join(tmp, 'field.wav'), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', path.join(OUT, 'field.mp3')]);
    const s2 = (N(at) + W) / SR; music.field = { file: 'field.mp3', sync: LEAD, start: +s2.toFixed(5), end: +(s2 + len2 / SR).toFixed(5), ch: 1 };
    console.log(`âm nền trận: ${(len2 / SR).toFixed(1)} giây → field.mp3 ${(fs.statSync(path.join(OUT, 'field.mp3')).size / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(path.join(OUT, 'sfx.json'), JSON.stringify({ sync: LEAD, sounds: meta, music }));
}
if (preview) {
  const dir = process.env.PREVIEW_DIR || path.join(tmp, 'spec'); fs.mkdirSync(dir, { recursive: true });
  for (const name of Object.keys(meta)) ff(['-i', path.join(tmp, name + '.wav'), '-lavfi', 'showspectrumpic=s=400x200:legend=0:scale=log:fscale=log', path.join(dir, name + '.png')]);
  console.log('ảnh phổ:', dir);
}
for (const [name, [at, d, cat]] of Object.entries(meta)) if (process.env.VERBOSE) console.log(name.padEnd(14), cat.padEnd(7), d.toFixed(2) + 's');
fs.rmSync(path.join(tmp, 'sfx.wav'), { force: true });
