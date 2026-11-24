// Kiểu dáng màn tải trận (VS) và chữ lớn hết trận (#gover) — tách khỏi css.js (quá 400 dòng) ở đợt UI v6 "Đêm lam đèn lồng"; dùng lại
// biến màu / lớp chung của css.js (--u-title, --gold, .gt / .gs, keyframes scrIn / spin).
const CSS = `
/* —— TẢI TRẬN (VS) —— */
#loadscr { background: #080c14; overflow: hidden; }
/* màn tải làm màn che lúc dựng trận (ui/loading.js asCover, ui/matchLoading.js): nằm trên trận, chặn chạm xuống trận, mờ dần khi trận chạy;
   màn chuyển từ màn tải đấu máy sang (moved) không chạy lại hiệu ứng xuất hiện */
#loadscr.cover { position: fixed; z-index: 60; pointer-events: auto; transition: opacity .3s; } #loadscr.cover.out { opacity: 0; }
#loadscr.cover.moved, #loadscr.cover.moved * { animation: none !important; }
#loadscr .bg { position: absolute; inset: -30px; background: #090e17 center / cover; filter: blur(10px) brightness(.46) saturate(.85); }
#loadscr .bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,80,170,.42) 0, rgba(6,10,19,.55) 46%, rgba(6,10,19,.55) 54%, rgba(150,30,30,.4) 100%); }
#loadscr.solo .bg::after { background: linear-gradient(90deg, rgba(20,50,130,.5) 0, rgba(5,7,24,.55) 50%, rgba(120,20,30,.5) 100%); }
#loadscr .ld-rows { position: absolute; inset: max(10px, var(--st, env(safe-area-inset-top))) max(10px, var(--sr, env(safe-area-inset-right))) max(4px, var(--sb, env(safe-area-inset-bottom))) max(10px, var(--sl, env(safe-area-inset-left))); display: grid; grid-template-rows: 1fr auto 1fr; grid-template-columns: minmax(0, 1fr); align-items: center; justify-items: center; }
#loadscr .ld-team { display: flex; gap: clamp(8px, calc(1.6 * var(--vw, 1vw)), 18px); justify-content: center; height: 100%; align-items: center; }
#loadscr .ld-card { position: relative; height: 100%; max-height: calc(43 * var(--vh, 1vh)); aspect-ratio: .68; display: flex; flex-direction: column; animation: ldIn .45s backwards; } @keyframes ldIn { from { opacity: 0; transform: translateY(12px); } }
#loadscr:not(.solo) .ld-team { justify-self: stretch; width: 100%; min-width: 0; } #loadscr:not(.solo) .ld-card { flex: 0 1 auto; min-width: 0; } /* 5 thẻ một hàng: thiếu bề ngang (máy tính bảng 4:3) thì thẻ hẹp lại thay vì tràn khỏi màn */
#loadscr .ld-team.foe .ld-card { animation-name: ldInF; } @keyframes ldInF { from { opacity: 0; transform: translateY(-12px); } }
#loadscr .ld-card .pic { position: relative; flex: 1; min-height: 0; border: 3px solid transparent; border-radius: 6px; background: #101826 padding-box, var(--u-rimb) border-box; box-shadow: var(--hl), 0 6px 16px rgba(0,0,0,.3); }
#loadscr .ld-team.foe .ld-card .pic { background: #4a1020 padding-box, var(--u-rimr) border-box; }
#loadscr .ld-card.me .pic { background: var(--ink) padding-box, var(--u-rim) border-box; box-shadow: 0 0 0 2px var(--gold), 0 6px 16px rgba(0,0,0,.3); }
#loadscr .ld-card .pic img.hcard { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; border-radius: 4px; }
#loadscr .ld-card .pic::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(5,8,14,.96) 0, rgba(5,8,14,.45) 36%, rgba(5,8,14,0) 56%); }
#loadscr .ld-card .info { position: absolute; left: 0; right: 0; bottom: 7px; z-index: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1px; }
#loadscr .ld-card .info b { font: 700 clamp(12px, calc(3.8 * var(--vh, 1vh)), 17px)/1 var(--u-disp);   color: #b5cbe8; text-shadow: 0 1px 3px rgba(0,0,0,.7); } #loadscr .ld-team.foe .info b { color: #ffa898; } #loadscr .ld-card.me .info b { color: var(--c-yel); }
#loadscr .ld-card .info small { font-size: clamp(9px, calc(2.9 * var(--vh, 1vh)), 12px); color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); max-width: 96%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#loadscr .ld-card .info .sp { display: flex; gap: 4px; margin-top: 3px; } #loadscr .ld-card .info .sp > * { flex: none; display: block; width: clamp(16px, calc(5.4 * var(--vh, 1vh)), 24px); height: clamp(16px, calc(5.4 * var(--vh, 1vh)), 24px); border-radius: 50%; overflow: hidden; background: rgba(0,0,0,.5); box-shadow: 0 0 0 1px var(--line); }
#loadscr .ld-card.me .info small { color: var(--c-yel); font-weight: 800; }
#loadscr .ld-card .crest { position: absolute; left: 50%; top: calc(-1 * clamp(12px, calc(3.6 * var(--vh, 1vh)), 18px)); transform: translateX(-50%); z-index: 2; } #loadscr .ld-card .crest .rkb { width: clamp(30px, calc(9 * var(--vh, 1vh)), 46px); height: clamp(30px, calc(9 * var(--vh, 1vh)), 46px); } #loadscr .ld-card .crest .rkb b { display: none; }
#loadscr .ld-card .pb { flex: none; height: 4px; margin-top: 5px; border-radius: 2px; background: rgba(0,0,0,.55); box-shadow: inset 0 0 0 1px var(--line); overflow: hidden; }
#loadscr .ld-card .pb i { display: block; height: 100%; width: 0; background: var(--g-blu); box-shadow: none; transition: width .25s linear; }
#loadscr .ld-team.foe .ld-card .pb i { background: var(--g-red); box-shadow: none; } #loadscr .ld-card.me .pb i { background: var(--g-yel); box-shadow: 0 0 0 2px var(--gold); }
#loadscr .ld-mid { position: relative; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; gap: 12px; box-sizing: border-box; }
#loadscr .ld-mid::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: linear-gradient(90deg, transparent, rgba(110,175,255,.7) 20%, rgba(224,185,97,.9) 50%, rgba(255,120,100,.7) 80%, transparent); }
#loadscr .ld-tip, #loadscr .ld-pct { position: relative; padding: 4px 12px; background: rgba(6,10,19,.85); border: 1px solid var(--line2); border-radius: 4px; }
#loadscr .ld-tip { font-size: clamp(10px, calc(3.1 * var(--vh, 1vh)), 12.5px); color: #d1d9e6; max-width: 42%; } #loadscr .ld-tip b { font: 700 12px var(--u-disp);  color: var(--u-gc); margin-right: 6px; }
#loadscr .vs { position: relative; font: 700 clamp(34px, calc(12 * var(--vh, 1vh)), 62px)/1 var(--u-title); letter-spacing: -.01em; padding: 0 .3em; background: radial-gradient(closest-side, rgba(6,10,19,.9), rgba(6,10,19,0)); }
#loadscr .ld-pct { font: 700 clamp(13px, calc(4 * var(--vh, 1vh)), 16px)/1.2 var(--u-disp);  color: var(--ivory); text-align: right;  max-width: 42%; white-space: nowrap; }
#loadscr.solo .ld-card { max-height: calc(72 * var(--vh, 1vh)); } #loadscr.solo .ld-rows { grid-template-rows: 1fr auto; } #loadscr.solo .ld-teams { display: flex; align-items: center; gap: calc(5 * var(--vw, 1vw)); height: 100%; justify-content: center; }
#loadscr.solo .ld-mid::before { display: none; }

/* —— hết trận: chữ lớn giữa màn rồi sang màn kết quả —— */
#gover { position: fixed; inset: 0; z-index: 12; display: grid; place-content: center; text-align: center; pointer-events: none; font-family: var(--u-disp); }
#gover::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: clamp(120px, calc(36 * var(--rvh, 1vh)), 200px); transform: translateY(-50%); background: linear-gradient(90deg, rgba(5,8,14,0), rgba(5,8,14,.82) 24%, rgba(5,8,14,.82) 76%, rgba(5,8,14,0)); animation: goBand .45s backwards; }
#gover::after { content: ''; position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; margin-top: calc(clamp(120px, calc(36 * var(--rvh, 1vh)), 200px) / 2); background: linear-gradient(rgba(216,180,104,0.9), rgba(216,180,104,0.9)); animation: goBand .45s backwards; }
#gover.lose::after { background: linear-gradient(90deg, rgba(168,180,197,0), #919fb5 22%, #dbe2ec 50%, #919fb5 78%, rgba(168,180,197,0)); }
@keyframes goBand { from { transform: translateY(-50%) scaleX(0); } }
#gover b { position: relative; display: block; font: 800 clamp(56px, calc(19 * var(--rvh, 1vh)), 118px)/1 var(--u-disp);  padding: .3em .1em .06em; margin-top: -.3em; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: goIn .6s cubic-bezier(.2,.9,.3,1.2) .1s backwards; }
#gover.win b { background-image: linear-gradient(var(--c-yel), var(--c-yel)); filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
#gover.lose b { background-image: linear-gradient(#a5b2c6, #a5b2c6); filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
#gover small { position: relative; margin-top: 6px; font: 700 clamp(13px, calc(4 * var(--rvh, 1vh)), 20px)/1 var(--u-disp);  color: #fff; opacity: .85; animation: scrIn .6s .3s backwards; }
@keyframes goIn { from { opacity: 0; transform: scale(1.6); } }
body.over #skills, body.over #extras, body.over #camBtn, body.over #scoreboard, body.over .lqs-wrap { visibility: hidden; }
body.post #hud, body.post #skills, body.post #extras, body.post #shopRoot, body.post #scoreTop, body.post #scoreboard, body.post #fs, body.post #hudSet, body.post #lab, body.post #camBtn { display: none !important; }
`;

let done = false;
export function injectMatchCss() {
  if (done) return; done = true;
  const s = document.createElement('style'); s.id = 'ui-css-match'; s.textContent = CSS; document.head.append(s);
}
