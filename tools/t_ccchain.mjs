// Chống khoá chết (04 §3, GĐ5a): khống chế cứng liên tiếp lên một mục tiêu quá 3s → khống chế mới giảm 50% trong 2s tiếp theo.
// Dùng: node tools/t_ccchain.mjs
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';
import { applyStatus } from '../src/sim/status.js';
import { COMBAT_EXTRA } from '../src/data/economy.js';
import { T } from '../src/sim/util.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const C = COMBAT_EXTRA.ccChain;

function setup() {
  const w = createWorld({ map: DUEL, seed: 3, structures: false, waves: false });
  const p = w.spawnHero('phu_dong', 0, { x: 1000, y: 1200 }); w.debug.bare(p);
  const d = w.spawnHero('kiem_thuy', 1, { x: 1300, y: 1200 }); w.debug.bare(d);
  d.stats.tenacity = 0;
  let t = w.tick; const evs = [];
  const step = (sec) => { for (let i = 0; i < T(sec); i++) { w.update(++t); evs.push(...w.drainEvents()); } };
  const len = (s) => (s.until - s.t0) / T(1); // giây thực áp
  return { w, p, d, step, evs, len };
}

{ // 1: chuỗi 2 + 2 giây choáng nối nhau → quá 3s; choáng thứ ba trong cửa sổ bị giảm 50%
  const { w, p, d, step, evs, len } = setup();
  const a = applyStatus(w, d, { status: 'stun', duration: 2, id: 'a' }, p); step(1.9);
  const b = applyStatus(w, d, { status: 'stun', duration: 2, id: 'b' }, p);
  ok('hai choáng nối nhau: đều đủ thời gian (chuỗi chưa quá 3s lúc áp)', len(a) === 2 && len(b) === 2, `${len(a)} / ${len(b)}`);
  step(1.4); // giây 3.3: chuỗi 0 → 3.9 đã quá 3s, đang trong cửa sổ [3, 5)
  const c = applyStatus(w, d, { status: 'stun', duration: 1.5, id: 'c' }, p);
  ok(`choáng mới trong ${C.window}s sau ngưỡng ${C.max}s: còn ${C.mul * 100}%`, Math.abs(len(c) - 1.5 * C.mul) < 0.04, len(c).toFixed(2));
  ok('phát sự kiện ccResist (HUD hiện "Kháng")', evs.length >= 0 && w.drainEvents().some((e) => e.type === 'ccResist' && e.id === d.id));
  const r = applyStatus(w, d, { status: 'root', duration: 2, id: 'r' }, p);
  ok('trói / câm lặng / khiêu khích cũng bị giảm', Math.abs(len(r) - 1) < 0.04, len(r).toFixed(2));
  const sl = applyStatus(w, d, { status: 'slow', duration: 2, pct: 0.3, id: 'sl' }, p);
  ok('làm chậm không bị giảm (không phải khống chế cứng)', Math.abs(len(sl) - 2) < 0.04, len(sl).toFixed(2));
  step(2); // giây 5.3: hết cửa sổ
  const e2 = applyStatus(w, d, { status: 'stun', duration: 1, id: 'e2' }, p);
  ok('hết cửa sổ 2s: khống chế lại đủ thời gian', Math.abs(len(e2) - 1) < 0.04, len(e2).toFixed(2));
}

{ // 2: hai choáng có khoảng nghỉ → không phải "liên tiếp"
  const { w, p, d, step, len } = setup();
  applyStatus(w, d, { status: 'stun', duration: 2, id: 'a' }, p); step(2.5);
  applyStatus(w, d, { status: 'stun', duration: 2, id: 'b' }, p); step(1);
  const c = applyStatus(w, d, { status: 'stun', duration: 1, id: 'c' }, p);
  ok('khoảng nghỉ 0.5s giữa hai choáng: chuỗi tính lại, choáng thứ ba đủ', Math.abs(len(c) - 1) < 0.04, len(c).toFixed(2));
}

{ // 3: một choáng dài 3.5s → khống chế đến sau trong cửa sổ bị giảm
  const { w, p, d, step, len } = setup();
  applyStatus(w, d, { status: 'stun', duration: 3.5, id: 'a' }, p); step(3.2);
  const c = applyStatus(w, d, { status: 'silence', duration: 2, id: 'c' }, p);
  ok('một choáng 3.5s: câm lặng áp ở giây 3.2 còn 1s', Math.abs(len(c) - 1) < 0.04, len(c).toFixed(2));
}

{ // 4: hất tung và áp chế: tính vào chuỗi nhưng không bị giảm; hiệu ứng của đồng minh không tính
  const { w, p, d, step, len } = setup();
  applyStatus(w, d, { status: 'stun', duration: 3.5, id: 'a' }, p); step(3.2);
  const k = applyStatus(w, d, { status: 'knockup', duration: 0.8, id: 'k' }, p);
  ok('hất tung trong cửa sổ: giữ nguyên (gắn với chuyển động)', Math.abs(len(k) - 0.8) < 0.04, len(k).toFixed(2));
  const ally = w.spawnHero('long_dang', 1, { x: 1400, y: 1200 });
  const own = applyStatus(w, d, { status: 'root', duration: 2, id: 'own' }, ally);
  ok('hiệu ứng do đồng minh đặt (cùng đội) không bị giảm', Math.abs(len(own) - 2) < 0.04, len(own).toFixed(2));
}

{ // 5: tất định — cùng chuỗi lệnh ra cùng kết quả
  const run = () => { const { w, p, d, step } = setup(); applyStatus(w, d, { status: 'stun', duration: 2 }, p); step(1.9); applyStatus(w, d, { status: 'stun', duration: 2, id: 'b' }, p); step(1.4); const c = applyStatus(w, d, { status: 'stun', duration: 1.5, id: 'c' }, p); return c.until - c.t0; };
  ok('tất định', run() === run());
}

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
