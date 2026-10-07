// Tự hạ / nâng chất lượng theo FPS thực đo được trong trận (điện thoại yếu, máy nóng bị hạ xung): mỗi cửa sổ ~2 giây lấy TRUNG VỊ
// khoảng cách giữa các khung (một lần khựng lẻ — dịch shader, tải ảnh — không làm hạ nhầm). Chậm hơn ~85% mục tiêu → xuống một bậc,
// rồi đo thử một cửa sổ: bậc mới không nhanh hơn ≥ 8% (máy nghẽn ở CPU, hoặc iPhone bật Nguồn điện thấp khoá 30 khung/giây) thì trả
// lại bậc cũ và thôi hạ một lúc. Chạy đủ nhanh lâu thì thử nâng lại một bậc; nâng xong tụt thì hạ lại và chờ lâu gấp đôi mới thử tiếp.
const WINDOW = 2000, MIN_FRAMES = 20;
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

/** steps: danh sách bậc (0 = tốt nhất); apply(step, i) áp bậc. target: số khung/giây mục tiêu. */
export function createAutoQuality({ target, steps, apply, delay = 5000 }) {
  const goal = 1000 / target, slow = goal / 0.85, fast = goal * 1.04;
  let i = 0, t = -delay, gaps = [], phase = 'watch', base = 0, from = 0, good = 0, need = 4, hold = 0, holdN = 10;
  const set = (k) => { i = k; apply(steps[i], i); gaps = []; t = 0; };
  return {
    get step() { return i; },
    /** Gọi mỗi khung đã vẽ với số mili giây kể từ khung vẽ trước. */
    frame(ms) {
      ms = Math.min(ms, 1000);                             // khựng lẻ (chuyển tab, tải ảnh) đã bị trung vị bỏ qua; chặn trên cho cửa sổ khỏi kéo dài
      t += ms; if (t <= 0) return;                         // đầu trận: chờ shader, model ổn định
      gaps.push(ms); if (t < WINDOW || (gaps.length < MIN_FRAMES && t < WINDOW * 3)) return; // máy rất chậm: cửa sổ dài hơn cho đủ mẫu
      const m = median(gaps); gaps = []; t = 0;
      if (phase === 'probe') {                             // vừa hạ: có nhanh hơn thật không?
        if (m < base * 0.92) phase = 'watch'; else { set(from); phase = 'watch'; hold = holdN; holdN *= 2; } // hạ không giúp: chờ lâu dần mới thử lại
        return;
      }
      if (phase === 'up') {                                // vừa nâng: giữ được không?
        phase = 'watch'; if (m > slow) { set(from); need *= 2; }
        return;
      }
      if (hold > 0) { hold--; return; }
      if (m > slow && i < steps.length - 1) { base = m; from = i; set(i + 1); phase = 'probe'; good = 0; return; }
      if (m <= fast && i > 0) { if (++good >= need) { from = i; set(i - 1); phase = 'up'; good = 0; } } else good = 0;
    },
    reset() { gaps = []; t = 0; },
  };
}
