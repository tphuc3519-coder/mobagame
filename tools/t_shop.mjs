// Cửa hàng ngọc (GĐ5b, ui/profile.js + ui/season.js + data/shop.js — không DOM): mua / mặc / cởi trang phục phối màu (không cho 4 model cao cấp),
// trang phục mùa và trang phục cửa hàng dùng chung một chỗ mặc, đổi ngọc lấy vật phẩm, nguồn ngọc (lên cấp, Rương tuần), lưu / làm sạch.
// Dùng: node tools/t_shop.mjs
import { COSTUMES, GEM_SHOP, GEM_FROM } from '../src/data/shop.js';
import { SKIN_LOCKED, skinLook } from '../src/data/seasons.js';
import { WEEK_BONUS } from '../src/data/missions.js';
import { skinTint } from '../src/ui/season.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let v = 0; const fresh = async (prof) => { store.clear(); if (prof) store.set('la.profile', JSON.stringify({ version: 2, bag: {}, season: 1, ...prof })); return import(`../src/ui/profile.js?s=${++v}`); };
const C0 = COSTUMES[0], C1 = COSTUMES[1];

// —— 1. trang phục ——
let M = await fresh({ gems: C0.price - 1 }), p = M.profile();
ok('thiếu ngọc: không mua được, báo thiếu bao nhiêu', /Thiếu 1 ngọc/.test(M.buyCostume('kiem_thuy', C0.id).err) && !p.costumes.length);
p.gems = 200;
let r = M.buyCostume('kiem_thuy', C0.id);
ok(`mua ${C0.name} cho Tanjiro: trừ ${C0.price} ngọc, mặc luôn, phủ đúng màu`, Array.isArray(r) && r[0].k === 'costume' && p.gems === 200 - C0.price && skinTint(p, 'kiem_thuy') === C0.tint, JSON.stringify(r));
ok('mua lại cùng món: từ chối', /Đã có/.test(M.buyCostume('kiem_thuy', C0.id).err) && p.gems === 200 - C0.price);
ok('4 model cao cấp: không bán trang phục', SKIN_LOCKED.every((h) => M.buyCostume(h, C0.id).err) && p.gems === 200 - C0.price);
ok('tướng / màu không tồn tại: từ chối', !!M.buyCostume('khong_co', C0.id).err && !!M.buyCostume('kiem_thuy', 'khong_co').err);
M.buyCostume('kiem_thuy', C1.id);
ok('có hai màu: mặc màu vừa mua', skinTint(p, 'kiem_thuy') === C1.tint);
ok('cởi → không phủ màu; mặc lại màu cũ', M.wearShopCostume('kiem_thuy', null) && skinTint(p, 'kiem_thuy') === null && M.wearShopCostume('kiem_thuy', C0.id) && skinTint(p, 'kiem_thuy') === C0.tint);
ok('không mặc được màu chưa mua', !M.wearShopCostume('kiem_thuy', COSTUMES[2].id) && skinTint(p, 'kiem_thuy') === C0.tint);
p.skins.push({ hero: 'kiem_thuy', season: 1 }); M.setSkinOn('kiem_thuy', 1);
ok('bật trang phục mùa thay cho trang phục cửa hàng (cùng một chỗ mặc)', skinTint(p, 'kiem_thuy') === skinLook(1).tint);
M.wearShopCostume('kiem_thuy', C1.id);
ok('mặc lại trang phục cửa hàng thay cho trang phục mùa', skinTint(p, 'kiem_thuy') === C1.tint);
p.costumes.push(`hoa_ren:${C0.id}`); p.skinOn.hoa_ren = C0.id;
ok('dữ liệu có trang phục cho model cao cấp vẫn không phủ', skinTint(p, 'hoa_ren') === null);

// —— 2. vật phẩm ——
p.gems = 1000; const ch0 = p.chests || 0, g0 = p.gold;
ok('3 Rương', M.buyGemItem('g_chest3').some((x) => x.k === 'chest' && x.n === 3) && p.chests === ch0 + 3);
ok('Bùa Giữ Sao, Thẻ Nhân Đôi Sao vào túi', M.buyGemItem('g_bua') && M.buyGemItem('g_x2') && M.itemCount('bua_giu_sao') >= 1 && M.itemCount('the_x2_sao') >= 1);
ok('800 vàng', M.buyGemItem('g_gold') && p.gold === g0 + 800);
ok('trừ đúng tổng ngọc', p.gems === 1000 - GEM_SHOP.reduce((a, x) => a + x.price, 0), p.gems);
p.gems = 0;
ok('hết ngọc: từ chối, không trừ', /Thiếu/.test(M.buyGemItem('g_gold').err) && p.gems === 0);

// —— 3. nguồn ngọc ——
M = await fresh({ level: 1, exp: 100, gems: 0 }); p = M.profile(); // cần 120 KN, một trận thắng điểm 14 cho 88
const res = M.applyResult({ mode: 'normal', win: true, heroId: 'kiem_thuy', score: 14, now: Date.now() });
const lv = p.level - 1;
ok(`lên cấp: +${GEM_FROM.levelUp} ngọc mỗi cấp, có trong màn Nhận thưởng`, lv >= 1 && p.gems === lv * GEM_FROM.levelUp && res.unlocks.some((x) => x.k === 'gems' && x.n === lv * GEM_FROM.levelUp), `${lv} cấp → ${p.gems} ngọc`);
ok(`Rương tuần có ${WEEK_BONUS.gems} ngọc`, WEEK_BONUS.gems > 0);

// —— 4. lưu / làm sạch ——
M = await fresh({ gems: 300, costumes: [`kiem_thuy:${C0.id}`, 'bậy', 5, null], skinOn: { kiem_thuy: C0.id } }); p = M.profile();
ok('dữ liệu rác trong danh sách trang phục bị bỏ', p.costumes.length === 1 && skinTint(p, 'kiem_thuy') === C0.tint);
M.buyCostume('trang_nhi', C1.id); M.saveProfile();
const M2 = await import(`../src/ui/profile.js?s=${++v}`), p2 = M2.profile();
ok('tắt / mở lại: trang phục + đồ đang mặc còn nguyên', p2.costumes.length === 2 && skinTint(p2, 'trang_nhi') === C1.tint && p2.gems === 300 - C1.price);

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
