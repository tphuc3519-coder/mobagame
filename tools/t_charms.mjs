// Kho bảng bùa / phù hiệu của người chơi (ui/loadout.js — không DOM): trang mẫu chỉ đọc, sửa là tạo bản sao, tối đa 10 trang riêng,
// làm sạch dữ liệu hỏng, nhớ trang theo tướng, gói đưa vào trận.
// Dùng: node tools/t_charms.mjs
import { profile } from '../src/ui/profile.js';
import * as L from '../src/ui/loadout.js';
const { pageFor, finishLoadout } = L;
import { CHARM_PAGE_MAX, CHARM_PAGES, pageLevel, sanitizePage } from '../src/data/charms.js';
import { createWorld } from '../src/sim/world.js';
import { DUEL } from '../src/data/maps.js';

let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ĐẠT ' : 'LỖI ') + name + (extra !== '' ? '  ' + extra : '')); if (!cond) fail++; };
const p = profile();

// —— 1. trang mẫu + trang riêng ——
ok('5 trang mẫu, chưa có trang riêng', L.allPages().length === 5 && L.allPages().every((x) => x.preset));
ok('trang mặc định theo vai (Hoả Rèn đấu sĩ → Sát thủ vật lý)', L.defaultPageId('hoa_ren') === 'assassin' && L.defaultPageId('nguyet_ha') === 'mage', L.defaultPageId('nguyet_ha'));
const e1 = L.editable('mage');
ok('sửa trang mẫu: tạo bản sao u1, mẫu không đổi', e1.copied && e1.id === 'u1' && L.pageById('u1').name === 'Trang 1' && L.pageById('u1').red.join() === CHARM_PAGES.mage.red.join());
ok('gắn ô: đúng màu thì nhận', L.setSlot('u1', 'red', 0, 'r_gio') && L.pageById('u1').red[0] === 'r_gio');
ok('gắn ô: sai màu thì từ chối', !L.setSlot('u1', 'red', 1, 'b_mach') && L.pageById('u1').red[1] === 'r_lua');
ok('gắn ô trên trang mẫu: từ chối (chỉ đọc)', !L.setSlot('mage', 'red', 0, 'r_gio') && CHARM_PAGES.mage.red[0] === 'r_lua');
L.setSlot('u1', 'blue', 4, null);
ok('gỡ ô: cấp trang giảm (15 → 14)', pageLevel(L.pageById('u1')) === 14);
L.fillColor('u1', 'gray', 'g_suoi');
ok('×5: lấp cả hàng', L.pageById('u1').gray.every((c) => c === 'g_suoi'));
L.renamePage('u1', '  <Rừng>&"Đêm" thật là dài quá chừng  ');
ok('đổi tên: bỏ <>&", tối đa 16 ký tự', L.pageById('u1').name === 'RừngĐêm thật là' || (L.pageById('u1').name.length <= 16 && !/[<>&"]/.test(L.pageById('u1').name)), L.pageById('u1').name);
L.clearPage('u1');
ok('gỡ hết: cấp 0', pageLevel(L.pageById('u1')) === 0);

// —— 2. giới hạn 10 trang, xoá, id nhỏ nhất còn trống ——
for (let i = 0; i < 20; i++) L.newPage();
ok(`tối đa ${CHARM_PAGE_MAX} trang riêng`, L.customPages().length === CHARM_PAGE_MAX && L.newPage() === null && L.editable('tank').id === null);
L.rememberPick('thach_quy', 'u4');
ok('nhớ trang theo tướng', L.defaultPageId('thach_quy') === 'u4');
L.deletePage('u4');
ok('xoá trang: mất khỏi danh sách và tướng quay về mẫu theo vai', !L.pageById('u4') && L.defaultPageId('thach_quy') === 'tank' && !L.deletePage('tank'));
ok('trang mới lấy id nhỏ nhất còn trống (u4)', L.newPage('dps').id === 'u4' && L.pageById('u4').red.join() === CHARM_PAGES.dps.red.join());

// —— 3. dữ liệu hỏng trong hồ sơ ——
p.charmPages = [{ id: 'u1', name: 'ok', red: ['r_lua', 'r_lua', 'zz', null, 'g_da'] }, { id: 'u1', name: 'trùng' }, { id: 'hack', name: 'x' }, null, 'rác', { id: 'u11', name: 'quá' }];
p.heroPage = 'rác'; p.emblems = [1, 2];
ok('hồ sơ hỏng: chỉ giữ trang hợp lệ, ô lạ thành trống', L.customPages().length === 1 && L.pageById('u1').red.join() === 'r_lua,r_lua,,,' && L.pageById('u1').blue.length === 5);
ok('hồ sơ hỏng: heroPage / emblems sửa lại thành object', typeof p.heroPage === 'object' && !Array.isArray(p.emblems) && L.defaultPageId('hoa_ren') === 'assassin');

// —— 4. phù hiệu theo tướng ——
ok('phù hiệu mặc định theo vai (Thạch Quy đỡ đòn → Mai Rùa)', L.emblemFor('thach_quy').key === 'mai_rua');
L.setEmblem('thach_quy', { key: 'tam_hoa', minors: ['m_kien_cuong', 'khong_co'] });
ok('đổi phù hiệu: nét lạ về mặc định hàng, lưu theo tướng', L.emblemFor('thach_quy').key === 'tam_hoa' && L.emblemFor('thach_quy').minors.join() === 'm_kien_cuong,m_tinh_tao' && L.emblemFor('hoa_ren').key !== 'tam_hoa' || L.emblemFor('hoa_ren').key === 'song_don');
L.resetEmblem('thach_quy');
ok('về mặc định theo vai', L.emblemFor('thach_quy').key === 'mai_rua');

// —— 5. gói vào trận ——
L.setSlot('u1', 'blue', 0, 'b_chan');
const lo = finishLoadout('hoa_ren', 'u1');
ok('chốt trước trận: đúng trang + nhớ cho tướng', lo.charmId === 'u1' && lo.charm.blue[0] === 'b_chan' && L.defaultPageId('hoa_ren') === 'u1' && !('id' in lo.charm));
ok('trang đã chọn bị xoá giữa chừng → về trang nhớ / mẫu', pageFor('u9', 'nguyet_ha') === 'mage');
const w = createWorld({ map: DUEL, seed: 1 }), h = w.spawnHero('hoa_ren', 0, { x: 1500, y: 1500 });
const atk0 = h.stats.atk;
w.setLoadout(h, { spellId: 'trong_tran', charm: lo.charm, emblem: lo.emblem });
ok('vào trận: phép + trang bùa + phù hiệu đều nhận', h.spell.id === 'trong_tran' && h.charm.blue[0] === 'b_chan' && h.emblem.key === lo.emblem.key && sanitizePage(h.charm) != null, `${atk0}→${h.stats.atk}`);

// —— 6. chữ chỉ số ——
globalThis.Path2D ||= class { rect() {} moveTo() {} lineTo() {} closePath() {} arc() {} }; // charmArt → hud/icons → ảnh vẽ (chỉ khai, không vẽ)
const { statText, pageLines } = await import('../src/ui/charmArt.js');
ok('chữ chỉ số: phần trăm + HP/giây + số phẳng', statText('atkSpeedPct', 0.036) === '+3,6% Tốc đánh' && statText('regenHp', 1.6) === '+1,6 HP/giây' && statText('ap', 10.8) === '+10,8 Phép', `${statText('atkSpeedPct', 0.036)} ${statText('ap', 10.8)}`);
ok('tổng trang mẫu Pháp sư có dòng Phép', pageLines(CHARM_PAGES.mage).some((t) => t.endsWith('Phép')), pageLines(CHARM_PAGES.mage).join(' | '));

console.log(fail ? `LỖI: ${fail} mục` : 'Tất cả đạt');
process.exit(fail ? 1 : 0);
