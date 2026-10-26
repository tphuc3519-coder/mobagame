// Lưu dữ liệu (GĐ4a, ui/save.js + ui/profile.js — không DOM): số phiên bản + chuyển đổi bản cũ, hồ sơ hỏng được cất làm bản sao lưu,
// mã lưu đi một vòng giữ nguyên dữ liệu, mã sai / thiếu / sửa / bản mới hơn bị từ chối với câu báo rõ.
// Dùng: node tools/t_save.mjs
import { SAVE_VER, SAVE_KEYS, migrateProfile, encodeSave, decodeSave } from '../src/ui/save.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let n = 0; const fresh = async () => (await import(`../src/ui/profile.js?v=${++n}`)); // mỗi lần một bản module (profile() nhớ hồ sơ)

// —— 1. hồ sơ mới / bản cũ / hồ sơ hỏng ——
store.clear();
let M = await fresh(), p = M.profile();
ok(`hồ sơ mới: phiên bản ${SAVE_VER}, mặc định nguyên vẹn`, p.version === SAVE_VER && p.gold === 1500 && p.level === 1 && p.bag.giu_sao_mvp === 2);

store.set('la.profile', JSON.stringify({ name: 'Cũ', gold: 4321, stars: 17, best: 12, games: 40, wins: 25, level: 9, exp: 33, history: [{ t: 1, mode: 'ranked', win: true }], charmPages: [{ id: 'u1', name: 'Trang 1' }] }));
M = await fresh(); p = M.profile();
ok('hồ sơ bản 1 (chưa có số phiên bản) → bản hiện tại, giữ số liệu', p.version === SAVE_VER && p.name === 'Cũ' && p.gold === 4321 && p.stars === 17 && p.games === 40 && p.wins === 25 && p.level === 9 && p.history.length === 1 && p.charmPages[0].id === 'u1');
ok('chuyển đổi sửa luôn chỗ lệch: sao cao nhất ≥ sao hiện tại', p.best === 17, p.best);
ok('trường mới thêm sau này (mặc định) vẫn có sẵn', Array.isArray(p.mail) && Array.isArray(p.timed) && p.chests === 0 && typeof p.spell === 'string');

store.clear(); store.set('la.profile', '{"name":"hỏng", "gold": 12');
M = await fresh(); p = M.profile();
ok('hồ sơ hỏng (JSON ghi dở): cất bản gốc vào la.profile.bak, mở hồ sơ mới', store.get('la.profile.bak') === '{"name":"hỏng", "gold": 12' && p.gold === 1500 && p.version === SAVE_VER);
store.clear(); store.set('la.profile', '[1,2,3]');
M = await fresh(); p = M.profile();
ok('hồ sơ không phải đối tượng: cũng cất bản sao lưu', store.get('la.profile.bak') === '[1,2,3]' && p.gold === 1500);

const junk = migrateProfile({ gold: NaN, gems: -5, level: 0, exp: 'x', stars: 3.7, best: 1, games: 2, wins: 9, streak: 'a', name: 42, history: 'không', mail: [{ id: 'a' }, 5, null], bag: { giu_sao_mvp: -2, x: 3 }, daily: null, heroPage: [1], emblems: 'x' });
ok('dữ liệu rác: số âm / NaN / sai kiểu được làm sạch', junk.gold === 0 && junk.gems === 0 && junk.level === 1 && junk.exp === 0 && junk.stars === 4 && junk.best === 4 && junk.wins === 2 && junk.streak === 0 && junk.name === 'Hiệp Sĩ Đèn', JSON.stringify({ g: junk.gold, l: junk.level, s: junk.stars, b: junk.best, w: junk.wins }));
ok('dữ liệu rác: mảng / đối tượng hỏng được dựng lại', Array.isArray(junk.history) && !junk.history.length && junk.mail.length === 1 && junk.bag.x === 3 && !('giu_sao_mvp' in junk.bag) && junk.daily === null && !Array.isArray(junk.heroPage) && typeof junk.emblems === 'object');
const newer = migrateProfile({ version: SAVE_VER + 3, futureField: 7 }, SAVE_VER + 3);
ok('hồ sơ từ bản game mới hơn: giữ nguyên, không xoá trường lạ', newer.version === SAVE_VER + 3 && newer.futureField === 7);

// —— 2. mã lưu đi một vòng ——
store.clear(); M = await fresh(); p = M.profile();
Object.assign(p, { name: 'Nguyệt Hạ Thủ Lĩnh ✦', gold: 98765, stars: 41, best: 44, level: 23, games: 312, wins: 170, heroPage: { nguyet_ha: 'u2' }, emblems: { nguyet_ha: { key: 'den_ho_menh', minors: ['m_suoi_nguon', 'm_buoc_nhe'] } } });
p.history = Array.from({ length: 20 }, (_, i) => ({ t: 1790000000000 + i, mode: 'ranked', win: i % 2 === 0, heroId: 'nguyet_ha', k: i, d: 2, a: 7, score: 9.4, mvp: i % 5 ? null : 'gold' }));
p.charmPages = Array.from({ length: 10 }, (_, i) => ({ id: 'u' + (i + 1), name: 'Trang ' + (i + 1), red: Array(5).fill('r_lua'), blue: Array(5).fill('b_chan'), gray: Array(5).fill('g_suoi') }));
const prefs = { stick: 'follow', bright: 4, sfxVol: 0.6 }, gfx = { v: 2, preset: 'high', auto: false, showFps: true };
const code = encodeSave({ 'la.profile': p, 'la.prefs': prefs, 'la.gfx': gfx, 'la.lạ': { x: 1 } }, 1793000000000);
const back = decodeSave(code);
ok('mã lưu: bắt đầu "LA1-", chỉ ký tự an toàn', code.startsWith('LA1-') && /^[A-Za-z0-9_-]+$/.test(code), code.length + ' ký tự');
ok('mã lưu đầy đủ (20 trận, 10 trang bùa) dưới 30.000 ký tự', code.length < 30000, code.length);
ok('giải mã: hồ sơ y nguyên (cả chữ có dấu)', back.ok && JSON.stringify(back.d['la.profile']) === JSON.stringify(migrateProfile(JSON.parse(JSON.stringify(p)))) && back.d['la.profile'].name === 'Nguyệt Hạ Thủ Lĩnh ✦');
ok('giải mã: cài đặt + đồ hoạ y nguyên, khoá lạ bị bỏ', back.ok && JSON.stringify(back.d['la.prefs']) === JSON.stringify(prefs) && JSON.stringify(back.d['la.gfx']) === JSON.stringify(gfx) && Object.keys(back.d).every((k) => SAVE_KEYS.includes(k)));
ok('giải mã: thời điểm tạo mã', back.t === 1793000000000);
ok('dán có xuống dòng / dấu cách (chép từ tin nhắn) vẫn nhận', decodeSave(code.replace(/(.{60})/g, '$1\n ') + '  \n').ok);

const v1code = encodeSave({ 'la.profile': { name: 'Bản 1', gold: 50, stars: 3, games: 5, wins: 2 } });
const v1back = decodeSave(v1code);
ok('mã từ hồ sơ chưa có số phiên bản: chuyển sang bản hiện tại khi nhập', v1back.ok && v1back.d['la.profile'].version === SAVE_VER && v1back.d['la.profile'].gold === 50);

// —— 3. mã sai ——
const err = (c) => decodeSave(c).err || '';
ok('mã rỗng → "Chưa dán mã lưu"', /Chưa dán/.test(err('   ')));
ok('không phải mã của game → báo rõ', /không phải mã lưu/.test(err('xin chào')));
ok('chép thiếu một đoạn → báo chép lại', /thiếu hoặc sai/.test(err(code.slice(0, code.length - 40) + code.slice(-9))));
const mid = 4 + Math.floor((code.length - 13) / 2), swap = code[mid] === 'A' ? 'B' : 'A';
ok('sửa một ký tự → tổng kiểm bắt được', /thiếu hoặc sai/.test(err(code.slice(0, mid) + swap + code.slice(mid + 1))));
ok('thiếu đuôi tổng kiểm → báo chép lại', /thiếu hoặc sai/.test(err(code.slice(0, -9))));
const fake = (o) => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); let h = 0x811c9dc5; for (let i = 0; i < b.length; i++) { h ^= b.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return 'LA1-' + b + '-' + h.toString(16).padStart(8, '0'); };
ok('mã từ bản game mới hơn → bảo cập nhật game', /bản game mới hơn/.test(err(fake({ v: SAVE_VER + 1, t: 0, d: { 'la.profile': {} } }))));
ok('mã không có hồ sơ → báo rõ', /không có hồ sơ/.test(err(fake({ v: SAVE_VER, t: 0, d: { 'la.prefs': {} } }))));
ok('mã có hồ sơ là mảng → từ chối', /không có hồ sơ/.test(err(fake({ v: SAVE_VER, t: 0, d: { 'la.profile': [1] } }))));
ok('mã thiếu số phiên bản → từ chối', /hỏng/.test(err(fake({ t: 0, d: { 'la.profile': {} } }))));

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
