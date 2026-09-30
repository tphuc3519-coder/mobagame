// 3 mức chất lượng (02 §13.8). Mốc 1: pixel ratio + FPS mục tiêu; đo tự động ở Mốc 6.
export const LEVELS = { low: { pixelRatio: 1.0, fps: 30 }, mid: { pixelRatio: 1.25, fps: 60 }, high: { pixelRatio: 1.5, fps: 60 } };
export function pickLevel(search = location.search) {
  const q = new URLSearchParams(search).get('q');
  return LEVELS[q] ? q : 'mid';
}
