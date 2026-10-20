// Tín hiệu trong trận (07 §9): 4 loại ping + giới hạn tần suất + thời gian bot làm theo; Quét Sạch (hạ hết tướng một đội).
/** hold: giây bot đồng đội còn làm theo tín hiệu (Rút lui ngắn, Tập hợp dài). Màu dùng cho vòng trên đất, bản đồ nhỏ, dòng chữ. */
export const PING_KINDS = {
  attack: { name: 'Tấn công', color: '#ff5a46', hold: 10 },
  gather: { name: 'Tập hợp', color: '#46c6ff', hold: 12 },
  retreat: { name: 'Rút lui', color: '#ffb330', hold: 3 },
  careful: { name: 'Cẩn thận', color: '#c890ff', hold: 8 }, // mất dấu địch
};
export const PING_ORDER = ['attack', 'gather', 'retreat', 'careful'];
export const PING = {
  show: 4,                               // giây hiện vòng / huy hiệu
  rate: { burst: 3, window: 6, gap: 0.6 }, // tối đa 3 tín hiệu trong 6 giây, cách nhau ≥ 0,6 giây
  maxPerTeam: 8,                         // số tín hiệu sống cùng lúc của một đội (cũ nhất bị bỏ)
  onLane: 0.75,                          // điểm cách tâm đường ≤ 0,75 × bề rộng đường → thuộc đường đó
  attack: { bots: 3, range: 7000, hp: 0.5 }, // bot đồng đội gần nhất đi đánh cùng
  gather: { bots: 4, range: 8000, hp: 0.4 },
  retreatRange: 1800,                    // bot trong bán kính này rút lui
  carefulRange: 4000,                    // bot trong bán kính này / cùng đường chơi an toàn
  cancelBy: 2500,                        // tín hiệu Rút lui mới hơn gần đó huỷ Tấn công / Tập hợp
  botGap: 25,                            // bot tự ra tín hiệu (khi não đội gọi đánh mục tiêu lớn / dồn đường) tối đa mỗi 25 giây mỗi đội
};
export const ACE = { minTeam: 2 };       // Quét Sạch: đội có ≥ 2 tướng, cùng lúc không còn ai sống
