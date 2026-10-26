// Đồ (05 §2–§4). `cost` là TỔNG giá; giá ghép = cost − tổng giá thành phần (code tự tính).
// stats: atk, ap, maxHp, maxMana, armor, mr, atkSpeedPct, crit, lifesteal, spellvamp, cdr, armorPenPct, mrPen, moveSpeed, tenacity.
// unique: nội tại "Duy nhất" (không cộng dồn hai món cùng khoá). passive: id cho sim/items.js xử lý. tab: tab cửa hàng.
// active: đồ kích hoạt (sim/itemActives.js) — id (stasis | suppress | ward | dash), name (tên nút), aim ('none' | 'target' | 'direction'),
// cooldown (giây, không giảm bởi giảm hồi chiêu), inCC (dùng được cả khi bị khống chế cứng), cùng số riêng của từng loại (range, duration,
// breakRange, radius, shield, speed, haste…). Mỗi túi tối đa ACTIVE_MAX món có kích hoạt.
const it = (name, cost, o) => ({ name, cost, ...o });

export const ITEMS = {
  // ---- Thành phần (tier 1) ----
  kiem_sat:    it('Kiếm Sắt', 250, { tier: 1, tab: 'atk', stats: { atk: 15 } }),
  riu_dong:    it('Rìu Đồng', 450, { tier: 1, tab: 'atk', stats: { atk: 25 } }),
  gang_tay_da: it('Găng Tay Da', 300, { tier: 1, tab: 'atk', stats: { atkSpeedPct: 0.10 } }),
  dao_nho:     it('Dao Nhỏ', 350, { tier: 1, tab: 'atk', stats: { crit: 0.10 } }),
  ngoc_trang:  it('Ngọc Trăng', 300, { tier: 1, tab: 'mag', stats: { ap: 25 } }),
  sach_co:     it('Sách Cổ', 500, { tier: 1, tab: 'mag', stats: { ap: 45 } }),
  ngoc_luu_ly: it('Ngọc Lưu Ly', 300, { tier: 1, tab: 'mag', stats: { maxMana: 250 } }),
  tui_hat:     it('Túi Hạt', 300, { tier: 1, tab: 'def', stats: { maxHp: 250 } }),
  ao_da:       it('Áo Da', 300, { tier: 1, tab: 'def', stats: { armor: 20 } }),
  ao_lua:      it('Áo Lụa', 300, { tier: 1, tab: 'def', stats: { mr: 20 } }),
  hat_nang:    it('Hạt Nắng', 400, { tier: 1, tab: 'def', stats: { cdr: 0.05, maxHp: 150 } }),
  chuong_dong: it('Chuông Đồng', 350, { tier: 1, tab: 'mag', stats: { cdr: 0.05, maxMana: 150 } }),
  vong_bac:    it('Vòng Bạc', 300, { tier: 1, tab: 'def', stats: { regenHp: 6 } }),
  giay_co:     it('Giày Cỏ', 250, { tier: 1, tab: 'boots', tags: ['boots'], stats: { moveSpeed: 25 } }),

  // ---- Giày (chỉ 1 đôi) ----
  giay_chien:     it('Giày Chiến', 700, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'ao_da'], stats: { armor: 30, moveSpeed: 60 }, unique: { basicReduce: 0.10 }, note: 'Giảm 10% sát thương từ đòn đánh thường.' }),
  giay_toc_chien: it('Giày Tốc Chiến', 700, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'gang_tay_da'], stats: { atkSpeedPct: 0.25, moveSpeed: 60 } }),
  giay_phap_su:   it('Giày Pháp Sư', 750, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'ngoc_trang'], stats: { mrPen: 75, moveSpeed: 60 } }),
  giay_tinh_tam:  it('Giày Tĩnh Tâm', 700, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'hat_nang'], stats: { cdr: 0.15, moveSpeed: 60 } }),
  giay_lu_hanh:   it('Giày Lữ Hành', 700, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'vong_bac'], stats: { regenHp: 10, moveSpeed: 80 }, note: 'Tốc chạy cao nhất, hồi máu liên tục.' }),
  giay_kien_nhan: it('Giày Kiên Nhẫn', 700, { tier: 2, tab: 'boots', tags: ['boots'], from: ['giay_co', 'ao_lua'], stats: { mr: 30, tenacity: 0.35, moveSpeed: 60 } }),

  // ---- Vật lý ----
  huyet_kiem:        it('Huyết Kiếm', 1800, { tier: 3, tab: 'atk', from: ['riu_dong', 'kiem_sat'], stats: { atk: 60, lifesteal: 0.15 } }),
  thuong_pha_giap:   it('Thương Phá Giáp', 2000, { tier: 3, tab: 'atk', from: ['riu_dong', 'tui_hat'], stats: { atk: 50, maxHp: 300 }, unique: { armorPenPct: 0.30 }, note: 'Duy nhất: +30% xuyên giáp.' }),
  luoi_huyet_nguyet: it('Lưỡi Huyết Nguyệt', 2100, { tier: 3, tab: 'atk', from: ['riu_dong', 'hat_nang'], stats: { atk: 60, cdr: 0.10 }, passive: 'spellblade', note: 'Duy nhất: sau khi dùng kỹ năng, đòn đánh kế tiếp gây thêm 100% Công cơ bản (hồi 2s).' }),
  cung_gio:          it('Cung Gió', 2000, { tier: 3, tab: 'atk', from: ['gang_tay_da', 'dao_nho'], stats: { atk: 20, atkSpeedPct: 0.35, crit: 0.20 }, passive: 'windbow', note: 'Duy nhất: đòn đánh +5% tốc chạy trong 2s, cộng dồn 3 lần.' }),
  dao_trang_khuyet:  it('Dao Trăng Khuyết', 2300, { tier: 3, tab: 'atk', from: ['kiem_sat', 'dao_nho'], stats: { atk: 70, crit: 0.25 }, unique: { critDmg: 0.50 }, note: 'Duy nhất: sát thương chí mạng +50%.' }),
  bua_than_ren:      it('Búa Thần Rèn', 2200, { tier: 3, tab: 'atk', from: ['kiem_sat', 'tui_hat', 'gang_tay_da'], stats: { atk: 35, atkSpeedPct: 0.20, maxHp: 400 }, passive: 'forgehammer', note: 'Duy nhất: đòn đánh gây thêm 2% HP tối đa mục tiêu (vật lý).' }),
  kiem_bao_tap:      it('Kiếm Bão Táp', 2400, { tier: 3, tab: 'atk', from: ['gang_tay_da', 'dao_nho', 'kiem_sat'], stats: { atk: 45, atkSpeedPct: 0.25, crit: 0.15 }, passive: 'chainlight', note: 'Duy nhất: mỗi đòn đánh thứ 3 phóng sét gây thêm 80 sát thương phép.' }),
  cung_bang_lam:     it('Cung Băng Lam', 2200, { tier: 3, tab: 'atk', from: ['gang_tay_da', 'riu_dong'], stats: { atk: 40, atkSpeedPct: 0.30 }, passive: 'frostbow', note: 'Duy nhất: đòn đánh làm chậm mục tiêu 15% trong 1s.' }),
  vuot_ho:           it('Vuốt Hổ', 2300, { tier: 3, tab: 'atk', from: ['riu_dong', 'dao_nho'], stats: { atk: 55, armorPenFlat: 15, moveSpeedPct: 0.05 }, note: '+15 xuyên giáp, +5% tốc chạy.' }),
  riu_bao_quan:      it('Rìu Bạo Quân', 2700, { tier: 3, tab: 'atk', from: ['riu_dong', 'tui_hat', 'kiem_sat'], stats: { atk: 65, maxHp: 400, lifesteal: 0.08 }, passive: 'bloodrage', note: 'Duy nhất: khi dưới 50% HP, +25% tốc đánh.' }),
  dai_lua_gio:       it('Dải Lụa Gió', 2200, { tier: 3, tab: 'atk', from: ['gang_tay_da', 'kiem_sat'], stats: { atk: 40, atkSpeedPct: 0.20, moveSpeedPct: 0.05 }, active: { id: 'dash', name: 'Lụa Gió', aim: 'direction', cooldown: 45, range: 320, speed: 1700, haste: { pct: 0.25, duration: 1.5 } }, note: 'Kích hoạt (Lụa Gió): lướt 320 theo hướng kéo (chạm nhanh: theo Hướng tốc biến), +25% tốc chạy 1,5s. Hồi 45s.' }),
  mat_na_hoi_sinh:   it('Mặt Nạ Hồi Sinh', 2600, { tier: 3, tab: 'def', from: ['riu_dong', 'ao_da'], stats: { atk: 45, armor: 30 }, passive: 'revive', note: 'Duy nhất: khi nhận sát thương chí tử, bất tử 2s và hồi 20% HP (hồi 120s).' }),

  // ---- Phép ----
  truong_song:      it('Trượng Sông', 2000, { tier: 3, tab: 'mag', from: ['sach_co', 'ngoc_luu_ly'], stats: { ap: 90, cdr: 0.10, maxMana: 400 } }),
  mu_sam:           it('Mũ Sấm', 2800, { tier: 3, tab: 'mag', from: ['sach_co', 'sach_co'], stats: { ap: 160 }, unique: { apMult: 0.30 }, note: 'Duy nhất: +30% tổng Phép.' }),
  sach_pha_gioi:    it('Sách Phá Giới', 2100, { tier: 3, tab: 'mag', from: ['sach_co', 'ngoc_trang'], stats: { ap: 80 }, unique: { mrPenPct: 0.40 }, note: 'Duy nhất: +40% xuyên kháng phép.' }),
  nhan_huyet_phach: it('Nhẫn Huyết Phách', 2000, { tier: 3, tab: 'mag', from: ['sach_co', 'tui_hat'], stats: { ap: 90, maxHp: 250, spellvamp: 0.15 } }),
  binh_suong_dong:  it('Bình Sương Đông', 2300, { tier: 3, tab: 'mag', from: ['sach_co', 'ao_da'], stats: { ap: 100, armor: 40 }, active: { id: 'stasis', name: 'Sương Đông', aim: 'none', inCC: true, cooldown: 90, duration: 2 }, note: 'Kích hoạt: bất động và bất tử 2s (hồi 90s).' }),
  truong_hoa_than:  it('Trượng Hoả Thần', 2400, { tier: 3, tab: 'mag', from: ['sach_co', 'ngoc_trang'], stats: { ap: 120 }, passive: 'emberstaff', note: 'Duy nhất: kỹ năng thiêu đốt mục tiêu, mỗi giây 1% HP tối đa (phép) trong 2s.' }),
  quyen_truong_tinh_tu: it('Quyền Trượng Tinh Tú', 2200, { tier: 3, tab: 'mag', from: ['ngoc_luu_ly', 'chuong_dong', 'ngoc_trang'], stats: { ap: 90, maxMana: 500, cdr: 0.10 } }),
  vuong_mien_nguyet: it('Vương Miện Nguyệt Quang', 2900, { tier: 3, tab: 'mag', from: ['sach_co', 'sach_co'], stats: { ap: 140, mrPen: 40, spellvamp: 0.10 } }),
  den_hon_lam:      it('Đèn Hồn Lam', 2100, { tier: 3, tab: 'mag', from: ['sach_co', 'chuong_dong'], stats: { ap: 80, cdr: 0.10, moveSpeedPct: 0.08 } }),
  ngoc_bang:        it('Ngọc Băng', 1900, { tier: 3, tab: 'mag', from: ['ngoc_trang', 'tui_hat'], stats: { ap: 70, maxHp: 400 }, passive: 'frostgem', note: 'Duy nhất: kỹ năng gây sát thương làm chậm 20% trong 1s.' }),

  // ---- Phòng thủ ----
  khien_da:        it('Khiên Đá', 2000, { tier: 3, tab: 'def', from: ['tui_hat', 'ao_da'], stats: { maxHp: 500, armor: 45 }, passive: 'stoneshield', note: 'Duy nhất: kẻ đánh thường vào bạn bị giảm 15% tốc đánh trong 2s.' }),
  giap_gai:        it('Giáp Gai', 1900, { tier: 3, tab: 'def', from: ['ao_da', 'ao_da'], stats: { armor: 90 }, passive: 'thorns', note: 'Duy nhất: phản 25% sát thương đòn đánh nhận được; kẻ đánh bị giảm hồi máu 40% trong 2s.' }),
  ao_choang_suong: it('Áo Choàng Sương', 2000, { tier: 3, tab: 'def', from: ['ao_lua', 'tui_hat'], stats: { mr: 55, maxHp: 450 }, passive: 'mistcloak', note: 'Duy nhất: hồi 2% HP/s trong 3s sau khi nhận sát thương phép.' }),
  tim_co_thu:      it('Tim Cổ Thụ', 2500, { tier: 3, tab: 'def', from: ['tui_hat', 'tui_hat'], stats: { maxHp: 1000 }, passive: 'oldheart', note: 'Duy nhất: hồi 1.5% HP tối đa/s khi 5s không nhận sát thương.' }),
  giap_vay_rong:   it('Giáp Vảy Rồng', 2700, { tier: 3, tab: 'def', from: ['ao_da', 'ao_lua', 'tui_hat'], stats: { maxHp: 600, armor: 40, mr: 40 } }),
  khien_mat_troi:  it('Khiên Mặt Trời', 2300, { tier: 3, tab: 'def', from: ['tui_hat', 'ao_da'], stats: { maxHp: 500, armor: 35 }, passive: 'sunaura', note: 'Duy nhất: thiêu kẻ địch trong 300 mỗi giây 30 + 1% HP tối đa của bạn (phép).' }),
  ao_choang_bong_dem: it('Áo Choàng Bóng Đêm', 2200, { tier: 3, tab: 'def', from: ['ao_lua', 'vong_bac'], stats: { mr: 60, maxHp: 300, tenacity: 0.25 } }),
  mu_chien_than:   it('Mũ Chiến Thần', 2400, { tier: 3, tab: 'def', from: ['tui_hat', 'vong_bac', 'tui_hat'], stats: { maxHp: 700, regenHp: 15 } }),
  xich_dong:       it('Xích Đồng', 2300, { tier: 3, tab: 'def', from: ['tui_hat', 'ao_lua', 'ao_da'], stats: { maxHp: 450, armor: 30, mr: 30 }, active: { id: 'suppress', name: 'Xích Giữ', aim: 'target', cooldown: 80, range: 450, duration: 1.25, breakRange: 650 }, note: 'Kích hoạt (Xích Giữ): xích tướng địch gần nhất trong 450 — cả hai cùng đứng yên 1,25s (áp chế: không giảm bởi kháng hiệu ứng, Giải Trói không gỡ). Bạn bị khống chế cứng, câm lặng, bị cắt chiêu, chết hoặc dùng phép / đồ khác thì xích đứt. Hồi 80s.' }),
  long_ho_menh:    it('Lọng Hộ Mệnh', 2200, { tier: 3, tab: 'def', from: ['hat_nang', 'ao_da'], stats: { maxHp: 300, armor: 30, cdr: 0.10 }, active: { id: 'ward', name: 'Lọng Che', aim: 'none', cooldown: 70, radius: 600, duration: 2.5, shield: { base: 80, perLevel: 12, hpPct: 0.05 } }, note: 'Kích hoạt (Lọng Che): bạn và tướng đồng minh trong 600 nhận khiên 80 (+12 mỗi cấp tướng) + 5% HP tối đa của bạn trong 2,5s. Hồi 70s.' }),
  giap_den_long:   it('Giáp Đèn Lồng', 2100, { tier: 3, tab: 'def', from: ['hat_nang', 'ao_lua'], stats: { maxHp: 350, mr: 35, cdr: 0.10 }, passive: 'lanternaura', note: 'Duy nhất: đồng minh trong 700 được +10 Giáp và KP.' }),

  // ---- Hỗ trợ / đi rừng (mỗi loại tối đa 1; chỉ dùng ở chế độ nhiều người) ----
  den_dong_hanh: it('Đèn Đồng Hành', 400, { tier: 1, tab: 'jungle', tags: ['support'], teamOnly: true, stats: { maxHp: 200, cdr: 0.05 }, passive: 'supportLantern', upgrade: { to: 'den_soi_duong', gold: 600 }, note: 'Hỗ trợ: đồng minh kết liễu lính khi bạn đứng trong 800 thì bạn nhận vàng bằng giá lính (lính tự kết liễu không cho vàng); nhận đủ 600 vàng từ nội tại thì tự nâng thành Đèn Soi Đường.' }),
  nanh_thu_rung: it('Nanh Thú Rừng', 400, { tier: 1, tab: 'jungle', tags: ['jungle'], teamOnly: true, needSpell: 'thu_hoach', stats: { atk: 10, ap: 10 }, passive: 'jungleFang', note: 'Đi rừng: +30% sát thương lên quái, hồi 30 HP mỗi đòn lên quái, +30% vàng và KN từ quái. Hạ 20 bãi: +25 Công/Phép, +50% sát thương lên quái. Cần phép Trừng Trị.' }),
  den_soi_duong: it('Đèn Soi Đường', 1000, { tier: 2, tab: 'jungle', tags: ['support'], teamOnly: true, auto: true, stats: { maxHp: 400, cdr: 0.10 }, passive: 'guideLantern', note: 'Nâng tự động từ Đèn Đồng Hành: hồi máu và khiên cho người khác +15%.' }),
};
for (const [id, v] of Object.entries(ITEMS)) v.id = id;

/** Số của nội tại đồ rừng / hỗ trợ (05 §4). jungleFang: Nanh Thú Rừng; supportLantern: Đèn Đồng Hành; guideLantern: Đèn Soi Đường. */
export const ITEM_PASSIVE = {
  jungleFang: { monsterDmg: 0.3, monsterDmgUp: 0.5, healPerHit: 30, rewardMult: 1.3, upCamps: 20, upStats: { atk: 15, ap: 15 } },
  supportLantern: { radius: 800 },
  guideLantern: { healShieldMult: 1.15 },
};

export const ITEM_MAX = 6;
export const ACTIVE_MAX = 2; // tối đa 2 món có kích hoạt (HUD 2 nút)
export const SELL_RATE = 0.6;
export const SHOP_TABS = [
  { id: 'rec', name: 'Gợi ý' }, { id: 'atk', name: 'Tấn công' }, { id: 'mag', name: 'Phép' },
  { id: 'def', name: 'Phòng thủ' }, { id: 'boots', name: 'Giày' }, { id: 'jungle', name: 'Rừng/Hỗ trợ' },
];

/** Vài đồ khởi đầu theo vai (05 §5). */
export const STARTER = {
  tank: ['ao_da', 'tui_hat'], fighter: ['kiem_sat', 'tui_hat'], assassin: ['kiem_sat', 'tui_hat'],
  mage: ['ngoc_trang', 'ngoc_luu_ly'], marksman: ['dao_nho', 'gang_tay_da'], support: ['den_dong_hanh'],
};
/** Đồ khởi đầu theo vị trí 5v5 (đi rừng chỉ khi mang đúng phép — Nanh Thú Rừng cần Trừng Trị); vị trí khác: theo lớp tướng. */
export const STARTER_LANE = { jungle: { items: ['nanh_thu_rung', 'tui_hat'], needSpell: 'thu_hoach' }, support: { items: STARTER.support } };
export function starterFor(hero, lane, spellId) {
  const L = STARTER_LANE[lane];
  if (L && (!L.needSpell || L.needSpell === spellId)) return L.items;
  return STARTER[hero.roles[0]] || [];
}

// Tên đồ trong build gợi ý của tướng port chưa có trong bảng chính thức → quy về đồ hợp lệ gần nghĩa nhất.
const ALIAS = { kiem_nhanh: 'luoi_huyet_nguyet', giay_xa_thu: 'giay_toc_chien', ao_giap_nhe: 'ao_choang_suong', nhan_bao_kich: 'dao_trang_khuyet', ngoc_binh_an: 'giap_den_long', giay_giap: 'giay_chien', ao_giap_dong: 'tim_co_thu' };
export function cleanBuild(list = []) {
  const out = [];
  for (const raw of list) { const id = ALIAS[raw] || raw; if (ITEMS[id] && !ITEMS[id].teamOnly && !out.includes(id)) out.push(id); }
  return out;
}
