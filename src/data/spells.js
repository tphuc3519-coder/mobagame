// Phép bổ trợ (05 §6). Chọn 1 trước trận; nút nhỏ cạnh cụm kỹ năng.
export const SPELLS = {
  chop_buoc: { name: 'Chớp Bước', cooldown: 120, aim: 'direction', range: 450, desc: 'Dịch chuyển tức thời 450 theo hướng kéo (chạm nhanh: theo hướng đang chạy/nhìn).' },
  hoi_phuc: { name: 'Hồi Phục', cooldown: 120, aim: 'none', radius: 600, healPct: 0.15, haste: { pct: 0.2, duration: 2 }, desc: 'Hồi 15% HP tối đa cho bản thân và đồng minh gần nhất trong 600; +20% tốc chạy 2s.' },
  tram_hon: { name: 'Trảm Hồn', cooldown: 90, aim: 'none', radius: 500, missingHpPct: 0.14, slow: { pct: 0.5, duration: 1 }, desc: 'Sát thương chuẩn bằng 14% HP đã mất của tướng địch trong 500, làm chậm 50% 1s.' },
  thu_hoach: { name: 'Thu Hoạch', cooldown: 30, aim: 'none', radius: 500, base: 600, perLevel: 40, heroDamage: 300, slow: { pct: 0.3, duration: 1 }, disabledIn1v1: true, desc: 'Sát thương chuẩn lên quái/lính/mục tiêu lớn trong 500; lên tướng địch 300 và làm chậm 30%. Cần để mua Nanh Thú Rừng.' },
  gio_luot: { name: 'Gió Lướt', cooldown: 100, aim: 'none', haste: { pct: 0.4, duration: 5 }, ghost: true, desc: '+40% tốc chạy trong 5s, đi xuyên lính.' },
  giai_troi: { name: 'Giải Trói', cooldown: 100, aim: 'none', immune: 1, desc: 'Xoá mọi khống chế (trừ hất tung đang diễn ra) và miễn khống chế 1s.' },
};
for (const [id, v] of Object.entries(SPELLS)) v.id = id;
// Nút cố định mọi tướng đều có (như Biến về): không chiếm ô phép bổ trợ tự chọn.
export const RESTORE = { id: 'hoi_mau', name: 'Hồi Máu', cooldown: 120, healPct: 0.15, duration: 3, desc: 'Hồi 15% HP tối đa trong 3 giây. Nút cố định, không chiếm ô phép bổ trợ. Dùng sẽ huỷ Biến về.' };
export const SPELL_LIST_1V1 = Object.keys(SPELLS).filter((k) => !SPELLS[k].disabledIn1v1);
