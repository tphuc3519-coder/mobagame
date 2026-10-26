// Phép bổ trợ (05 §6). Chọn 1 trước trận; nút nhỏ cạnh cụm kỹ năng. `kind`: cơ chế (mô phỏng / bot / HUD chọn theo kind, không theo id);
// `needTarget`: không có mục tiêu hợp lệ thì không dùng được và không mất hồi chiêu.
export const SPELLS = {
  chop_buoc: { name: 'Chớp Bước', kind: 'blink', cooldown: 120, aim: 'direction', range: 450, desc: 'Dịch chuyển tức thời 450 theo hướng kéo (chạm nhanh: theo hướng đang chạy/nhìn).' },
  hoi_phuc: { name: 'Hồi Phục', kind: 'heal', cooldown: 120, aim: 'none', radius: 600, healPct: 0.15, haste: { pct: 0.2, duration: 2 }, desc: 'Hồi 15% HP tối đa cho bản thân và đồng minh gần nhất trong 600; +20% tốc chạy 2s.' },
  tram_hon: { name: 'Trảm Hồn', kind: 'execute', cooldown: 90, aim: 'none', radius: 500, missingHpPct: 0.14, slow: { pct: 0.5, duration: 1 }, desc: 'Sát thương chuẩn bằng 14% HP đã mất của tướng địch trong 500, làm chậm 50% 1s.' },
  thu_hoach: { name: 'Trừng Trị', kind: 'smite', cooldown: 30, aim: 'none', needTarget: true, radius: 520, base: 700, perLevel: 50, stun: 1, heroDamage: 350, slow: { pct: 0.3, duration: 1 }, disabledIn1v1: true, desc: 'Phép đi rừng: giáng sét lên MỘT mục tiêu gần nhất trong 520 (ưu tiên mục tiêu lớn > bùa > quái > lính > tướng). Quái/lính: 700 (+50/cấp) sát thương chuẩn và choáng 1s; tướng địch: 350 sát thương chuẩn, làm chậm 30%. Cần để mua Nanh Thú Rừng.' },
  gio_luot: { name: 'Gió Lướt', kind: 'haste', cooldown: 100, aim: 'none', haste: { pct: 0.4, duration: 5 }, ghost: true, desc: '+40% tốc chạy trong 5s, đi xuyên lính.' },
  giai_troi: { name: 'Giải Trói', kind: 'cleanse', cooldown: 100, aim: 'none', immune: 1, desc: 'Xoá mọi khống chế (trừ hất tung đang diễn ra) và miễn khống chế 1s.' },
  tat_den: { name: 'Tắt Đèn', kind: 'towerOff', cooldown: 90, aim: 'none', needTarget: true, radius: 900, disable: 4, desc: 'Thổi tắt đèn của trụ hoặc nhà chính địch gần nhất trong 900: công trình đó ngừng bắn 4 giây. Không có công trình địch trong tầm thì không mất hồi chiêu.' },
  loa_mat: { name: 'Loá Mắt', kind: 'flashStun', cooldown: 110, aim: 'none', needTarget: true, radius: 380, stun: 0.75, desc: 'Bùng chớp sáng quanh mình: mọi tướng địch trong 380 bị choáng 0,75 giây. Không có tướng địch trong vùng thì không dùng được.' },
  trong_tran: { name: 'Trống Trận', kind: 'warDrum', cooldown: 100, aim: 'none', radius: 700, duration: 5, self: { atkSpeedPct: 0.3, atkPct: 0.1 }, ally: { atkSpeedPct: 0.15, atkPct: 0.05 }, desc: 'Nổi trống trận: bản thân +30% tốc đánh và +10% Công trong 5 giây; đồng minh tướng trong 700 nhận một nửa (+15% tốc đánh, +5% Công).' },
  bua_moi: { name: 'Bùa Mỏi', kind: 'hex', cooldown: 100, aim: 'none', needTarget: true, radius: 600, duration: 3, weaken: 0.35, slow: 0.25, desc: 'Dán bùa lên tướng địch gần nhất trong 600: sát thương nó gây ra giảm 35% và tốc chạy giảm 25% trong 3 giây.' },
};
for (const [id, v] of Object.entries(SPELLS)) v.id = id;
// Nút cố định mọi tướng đều có (như Biến về): không chiếm ô phép bổ trợ tự chọn.
export const RESTORE = { id: 'hoi_mau', name: 'Hồi Máu', cooldown: 60, healPct: 0.15, duration: 3, desc: 'Hồi 15% HP tối đa trong 3 giây; bị tướng địch gây sát thương thì mất hiệu ứng hồi. Nút cố định, không chiếm ô phép bổ trợ. Dùng sẽ huỷ Biến về.' };
export const DEFAULT_SPELL = 'chop_buoc';
/** Thứ tự hiện ở hộp thoại chọn phép. */
export const SPELL_LIST = ['chop_buoc', 'tat_den', 'loa_mat', 'trong_tran', 'bua_moi', 'hoi_phuc', 'tram_hon', 'gio_luot', 'giai_troi', 'thu_hoach'];
export const SPELL_LIST_1V1 = SPELL_LIST.filter((k) => !SPELLS[k].disabledIn1v1);
