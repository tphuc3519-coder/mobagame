// 3 mức chất lượng (02 §13.8): pixel ratio, FPS mục tiêu, khử răng cưa nhiều mẫu (MSAA) cho hậu kỳ, bóng đổ thời gian thực của nhân vật.
export const LEVELS = {
  low: { pixelRatio: 1.0, fps: 30, msaa: 0, shadow: 0 },
  mid: { pixelRatio: 1.5, fps: 60, msaa: 4, shadow: 1024 },
  high: { pixelRatio: 2.0, fps: 60, msaa: 4, shadow: 2048 },
};
export function pickLevel(search = location.search) {
  const q = new URLSearchParams(search).get('q');
  return LEVELS[q] ? q : 'mid';
}
