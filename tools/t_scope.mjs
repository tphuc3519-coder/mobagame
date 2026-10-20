// Phạm vi dọn dẹp của trận (core/scope.js) + onPref tự huỷ trong phạm vi. Dùng: node tools/t_scope.mjs
import { createScope, enterScope, on, track, currentScope } from '../src/core/scope.js';
import { onPref, setPref, prefs } from '../src/core/prefs.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tgt = new EventTarget(); let n = 0;
const s = createScope('t'); s.on(tgt, 'x', () => n++); tgt.dispatchEvent(new Event('x'));
s.dispose(); tgt.dispatchEvent(new Event('x'));
ok('scope.on: chạy khi còn sống, im sau dispose', n === 1, n);
let a = 0, b = 0; const s2 = createScope(), exit = enterScope(s2);
on(tgt, 'y', () => a++); ok('enterScope: currentScope đúng', currentScope() === s2); exit();
on(tgt, 'y', () => b++); // ngoài phạm vi: vĩnh viễn
s2.dispose(); tgt.dispatchEvent(new Event('y'));
ok('on() trong phạm vi bị gỡ khi dispose, ngoài phạm vi thì còn', a === 0 && b === 1, `${a} ${b}`);
let fired = 0, ev = 0; const s3 = createScope(); s3.later(() => fired++, 5); const s4 = createScope(); s4.later(() => fired += 10, 5); s4.every(() => ev++, 2); s4.dispose();
await sleep(30); ok('later: chạy khi còn sống, huỷ khi dispose; every bị dừng', fired === 1 && ev === 0, `${fired} ${ev}`);
const order = []; const s5 = createScope(); const el = (k) => ({ remove: () => order.push(k) });
s5.node(el('a')); s5.add(() => { throw new Error('cố ý'); }); s5.node(el('b'));
const warn = console.warn; console.warn = () => {}; s5.dispose(); s5.dispose(); console.warn = warn;
ok('node() gỡ đúng một lần, ngược thứ tự; một hàm dọn lỗi không chặn hàm khác; dispose hai lần không sao', order.join('') === 'ba', order.join(''));
const s6 = createScope(), ex6 = enterScope(s6); const t1 = track(el('x')); ex6(); ok('track() trả lại đúng phần tử', t1 && typeof t1.remove === 'function');
let p1 = 0, p2 = 0; const s7 = createScope(), ex7 = enterScope(s7); onPref(() => p1++); ex7(); onPref(() => p2++);
const cur = prefs().bright, nv = cur === 3 ? 4 : 3; setPref('bright', nv);
s7.dispose(); setPref('bright', cur);
ok('onPref trong phạm vi tự huỷ khi dispose; ngoài phạm vi thì giữ', p1 === 1 && p2 === 2, `${p1} ${p2}`);
console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
