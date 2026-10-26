// Túi đồ, rương, cửa hàng mảnh (GĐ4d, ui/profile.js + data/rewards.js — không DOM): vật phẩm có hạn hết hạn đúng giờ / hết mùa, dùng chiếc
// sắp hết hạn trước, Bùa Giữ Sao tự dùng khi thua (sau bùa MVP, trước Điểm tích luỹ), Thẻ Nhân Đôi Sao, rương mỗi 3 trận, mở / mua rương,
// đổi mảnh. Dùng: node tools/t_bag.mjs
import { BAG, CHEST, SHARD_SHOP } from '../src/data/rewards.js';
import { seasonAt } from '../src/data/seasons.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let v = 0; const fresh = async (prof) => { store.clear(); if (prof) store.set('la.profile', JSON.stringify(prof)); return import(`../src/ui/profile.js?b=${++v}`); };
const H = 3600000, NOW = new Date(2026, 9, 26, 12).getTime();

// —— 1. vật phẩm có hạn ——
let M = await fresh(), p = M.profile();
ok('quà tân thủ: 2 Bùa Giữ Sao (MVP thua) không hạn', M.itemCount('giu_sao_mvp', NOW) === 2 && !p.timed.length);
M.addItem('giu_sao_mvp', 1, NOW);
ok('Bùa Giữ Sao (MVP thua) mới nhận: hạn 24 giờ', p.timed.length === 1 && p.timed[0].exp === NOW + 24 * H && M.itemCount('giu_sao_mvp', NOW) === 3);
ok('qua 25 giờ: chiếc có hạn không còn đếm', M.itemCount('giu_sao_mvp', NOW + 25 * H) === 2);
M.addItem('bua_giu_sao', 2, NOW);
ok('Bùa Giữ Sao: hạn tới hết mùa', p.timed.filter((t) => t.id === 'bua_giu_sao').every((t) => t.exp === seasonAt(NOW).end));
M.addItem('the_x2_sao', 1, NOW);
ok('Thẻ Nhân Đôi Sao: hạn 7 ngày', p.timed.find((t) => t.id === 'the_x2_sao').exp === NOW + 7 * 24 * H);
const bl = M.bagList(NOW), gm = bl.find((x) => x.id === 'giu_sao_mvp');
ok('danh sách túi đồ: số chiếc + hạn gần nhất', bl.length === 3 && gm.n === 3 && gm.timed === 1 && gm.exp === NOW + 24 * H, JSON.stringify(bl.map((x) => [x.id, x.n])));
ok('dùng: chiếc có hạn trước, rồi mới tới chiếc không hạn', M.useItem('giu_sao_mvp', NOW) && !p.timed.some((t) => t.id === 'giu_sao_mvp') && p.bag.giu_sao_mvp === 2);
ok('bỏ chiếc hết hạn (qua hết mùa)', M.pruneBag(seasonAt(NOW).end + 1) === 3 && !p.timed.length);
M = await fresh({ timed: [{ id: 'giu_sao_mvp', exp: 1 }, { id: 'bua_giu_sao', exp: Date.now() + 9 * H }] }); p = M.profile();
ok('mở hồ sơ: tự bỏ chiếc đã hết hạn', p.timed.length === 1 && p.timed[0].id === 'bua_giu_sao');

// —— 2. thua trận hạng: thứ tự giữ sao ——
const ranked = (o) => M.applyResult({ mode: 'ranked', win: false, score: 6, now: NOW, ...o });
M = await fresh({ stars: 27, bag: {}, courage: 0 }); p = M.profile();
let r = ranked({});
ok('Đèn Kéo Quân, không bùa: thua mất 1 sao', r.stars === -1 && p.stars === 26);
M = await fresh({ stars: 27, bag: { giu_sao_mvp: 1 }, courage: 0 }); p = M.profile(); M.addItem('bua_giu_sao', 1, NOW);
r = ranked({ mvp: 'silver' });
ok('MVP đội thua: dùng Bùa Giữ Sao (MVP thua) trước', r.stars === 0 && p.bag.giu_sao_mvp === undefined && M.itemCount('bua_giu_sao', NOW) === 1, r.notes.join(' | '));
r = ranked({});
ok('không MVP: dùng Bùa Giữ Sao (thua bất kỳ)', r.stars === 0 && M.itemCount('bua_giu_sao', NOW) === 0 && r.notes.some((n) => /Bùa Giữ Sao:/.test(n)), r.notes.join(' | '));
M = await fresh({ stars: 27, bag: {}, courage: 100 }); p = M.profile(); M.addItem('bua_giu_sao', 1, NOW);
r = ranked({});
ok('có cả Bùa Giữ Sao lẫn Điểm tích luỹ đầy: dùng bùa, giữ thanh tích luỹ', r.stars === 0 && M.itemCount('bua_giu_sao', NOW) === 0 && p.courage === 100);
M = await fresh({ stars: 3, bag: {} }); p = M.profile(); M.addItem('bua_giu_sao', 1, NOW);
r = ranked({});
ok('Đèn Dầu (thua không mất sao): không phí bùa', r.stars === 0 && M.itemCount('bua_giu_sao', NOW) === 1);

// —— 3. Thẻ Nhân Đôi Sao ——
M = await fresh({ stars: 27, bag: {}, streak: 0 }); p = M.profile();
ok('chưa có thẻ: không bật được', !M.armX2(NOW));
M.addItem('the_x2_sao', 1, NOW);
ok('bật thẻ: thẻ bị dùng, cờ bật', M.armX2(NOW) && p.x2Armed && M.itemCount('the_x2_sao', NOW) === 0);
r = M.applyResult({ mode: 'normal', win: true, score: 6, now: NOW });
ok('trận thường không tiêu thẻ', p.x2Armed && r.stars === 0);
p.streak = 0; r = M.applyResult({ mode: 'ranked', win: true, score: 6, now: NOW });
ok('trận hạng thắng: +2 sao, thẻ hết', r.stars === 2 && !p.x2Armed && r.notes.some((n) => /Nhân Đôi/.test(n)), r.notes.join(' | '));
M.addItem('the_x2_sao', 1, NOW); M.armX2(NOW); p.streak = 0;
r = ranked({});
ok('trận hạng thua: mất thẻ, vẫn trừ sao như thường', r.stars === -1 && !p.x2Armed);

// —— 4. rương ——
M = await fresh({ bag: {} }); p = M.profile();
const res = [];
for (const mode of ['normal', 'training', 'solo', 'ranked']) res.push(M.applyResult({ mode, win: true, score: 5, now: NOW }));
ok(`cứ ${CHEST.every} trận (trừ luyện tập) được 1 rương`, p.chests === 1 && res[3].chest && !res[2].chest && res[0].chestLeft === 2 && res[1].chestLeft === 0 && res[3].chestLeft === CHEST.every, JSON.stringify(res.map((x) => [x.chest, x.chestLeft])));
const g0 = p.gold, m0 = p.manh;
let seq = [0, 0, 0.5]; let got = M.openChest(() => seq.shift(), NOW);
ok('mở rương: vàng + Mảnh Tướng nhỏ nhất khi bốc thấp, không ra bùa khi bốc ≥ 15%', got.length === 2 && got[0].n === CHEST.gold[0] && got[1].n === CHEST.manh[0] && p.gold === g0 + CHEST.gold[0] && p.manh === m0 + CHEST.manh[0] && p.chests === 0);
ok('hết rương: mở không được', M.openChest(() => 0.5, NOW) === null);
p.gold = CHEST.price - 1;
ok('không đủ vàng: không mua được rương', !M.buyChest() && p.chests === 0);
p.gold = CHEST.price + 10;
ok('mua rương: trừ vàng, +1 rương', M.buyChest() && p.chests === 1 && p.gold === 10);
seq = [0.9999, 0.9999, 0.01]; got = M.openChest(() => seq.shift(), NOW);
ok('bốc cao: vàng / mảnh lớn nhất + ra Bùa Giữ Sao (MVP thua) có hạn', got[0].n === CHEST.gold[1] && got[1].n === CHEST.manh[1] && got[2]?.id === CHEST.item && p.timed.some((t) => t.id === CHEST.item));
let draws = 0; const tally = { item: 0 }; M.profile().chests = 2000;
for (let i = 0; i < 2000; i++) { const o = M.openChest(Math.random, NOW); draws++; if (o.length === 3) tally.item++; }
ok('2000 rương: tỉ lệ ra bùa quanh 15%', Math.abs(tally.item / draws - CHEST.itemOdds) < 0.03, (tally.item / draws * 100).toFixed(1) + '%');

// —— 5. cửa hàng mảnh ——
M = await fresh({ bag: {}, manh: 30 }); p = M.profile();
const x2 = SHARD_SHOP.find((s) => s.id === 'the_x2_sao');
ok('đổi mảnh: trừ đúng giá, nhận vật phẩm', M.shardBuy('the_x2_sao', NOW) && p.manh === 30 - x2.cost && M.itemCount('the_x2_sao', NOW) === 1);
ok('không đủ mảnh: từ chối', !M.shardBuy('the_x2_sao', NOW) && p.manh === 30 - x2.cost);
ok('vật phẩm lạ: từ chối', !M.shardBuy('khong_co', NOW));
ok('mọi món trong cửa hàng mảnh đều có trong bảng vật phẩm', SHARD_SHOP.every((s) => BAG[s.id] && s.cost > 0));

// —— 6. lưu / mở lại ——
p.gold = 4242; M.saveProfile();
const M2 = await import(`../src/ui/profile.js?b=${++v}`), p2 = M2.profile();
ok('tắt / mở lại: tiền tệ, rương, vật phẩm có hạn còn nguyên', p2.gold === 4242 && p2.manh === p.manh && p2.chests === p.chests && M2.itemCount('the_x2_sao', NOW) === 1);

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
