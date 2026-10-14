// Dựng âm thanh của game: node tools/sfx/build.mjs [tên…]  (cần ffmpeg có libmp3lame)
//   → assets/audio/sfx.mp3 + sfx.json: mọi hiệu ứng ghép thành một file ("audio sprite": một lần tải, một lần giải mã), có vạch đồng bộ
//     ở đầu để trình chơi tự bù độ trễ bộ mã MP3; assets/audio/lobby.mp3: nhạc sảnh lặp liền mạch (stereo).
// Độ to: chuẩn hoá theo RMS ngắn hạn lớn nhất (cửa sổ 50 ms) theo nhóm, chặn đỉnh 0,88 — tiếng ngắn có tiếng nổ đầu không lấn tiếng dài.
// Thêm --preview: ghi ảnh phổ (spectrogram) từng tiếng vào thư mục tạm để soát bằng mắt.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SR, N, rng, fade, dcBlock, trim, peak, wav } from './dsp.mjs';
import { BANK, lobbyMusic } from './bank.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), OUT = path.join(ROOT, 'assets/audio');
const TARGET = { ui: 0.11, minor: 0.09, combat: 0.2, skill: 0.19, econ: 0.15, sting: 0.24 }; // RMS ngắn hạn mục tiêu theo nhóm
const GAP = 0.25, LEAD = 0.05;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function stRms(x, win = N(0.05)) { let best = 0; for (let s = 0; s < x.length; s += win >> 1) { let a = 0; const e = Math.min(x.length, s + win); for (let i = s; i < e; i++) a += x[i] * x[i]; best = Math.max(best, Math.sqrt(a / win)); } return best; }
function level(x, cat) {
  const k = Math.min(TARGET[cat] / (stRms(x) || 1), 0.88 / (peak(x) || 1)), y = new Float32Array(x.length); // chừa khoảng cho MP3 vượt đỉnh
  for (let i = 0; i < x.length; i++) y[i] = x[i] * k;
  return y;
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
  x = level(fade(trim(dcBlock(x)), 0.001, 0.03), def.cat); // cắt đuôi im lặng TRƯỚC rồi mới hạ dần: không còn tiếng tách ở cuối
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
  fs.writeFileSync(path.join(OUT, 'sfx.json'), JSON.stringify({ sync: LEAD, sounds: meta }));
  console.log(`hiệu ứng: ${Object.keys(meta).length} tiếng, ${(pos).toFixed(1)} giây → sfx.mp3 ${(fs.statSync(path.join(OUT, 'sfx.mp3')).size / 1024).toFixed(0)} KB (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  // ——— nhạc sảnh ———
  const t1 = Date.now(), [L, R] = lobbyMusic(), p = Math.max(peak(L), peak(R)), k = 0.82 / p;
  for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
  fs.writeFileSync(path.join(tmp, 'lobby.wav'), wav([L, R]));
  ff(['-i', path.join(tmp, 'lobby.wav'), '-c:a', 'libmp3lame', '-b:a', '112k', path.join(OUT, 'lobby.mp3')]);
  console.log(`nhạc sảnh: ${(L.length / SR).toFixed(1)} giây → lobby.mp3 ${(fs.statSync(path.join(OUT, 'lobby.mp3')).size / 1024).toFixed(0)} KB (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
}
if (preview) {
  const dir = process.env.PREVIEW_DIR || path.join(tmp, 'spec'); fs.mkdirSync(dir, { recursive: true });
  for (const name of Object.keys(meta)) ff(['-i', path.join(tmp, name + '.wav'), '-lavfi', 'showspectrumpic=s=400x200:legend=0:scale=log:fscale=log', path.join(dir, name + '.png')]);
  console.log('ảnh phổ:', dir);
}
for (const [name, [at, d, cat]] of Object.entries(meta)) if (process.env.VERBOSE) console.log(name.padEnd(14), cat.padEnd(7), d.toFixed(2) + 's');
fs.rmSync(path.join(tmp, 'sfx.wav'), { force: true });
