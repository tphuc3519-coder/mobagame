// Kiểu dáng các màn ngoài trận (sảnh, chọn chế độ, phòng chờ, chọn tướng, đội hình, tải trận) — chèn một lần bằng <style> (trang
// chơi thử dạng artifact chỉ cho phép CSS nội tuyến). Bộ nhận diện "UI v4 — hoạt hình phẳng" (2026-11-02): màu phẳng (vàng --c-yel, lam,
// đỏ, lục), viền mực dày 3px (--ink), bóng cứng không nhoè (0 4px 0), bo góc 12–16px, chữ tròn đậm Baloo 2 — src/ui/fonts.js. Không dải
// màu kim loại, không quầng sáng, không kính mờ, không chữ in hoa giãn. UI v4.1 thêm độ khối kiểu game mobile: thân sáng trên tối dưới
// (--g-*), mặt bóng nửa trên của nút (--gloss), mép sáng trong (--hl / --hl2), chữ tiêu đề đắp nổi (--extrude). Tiêu đề lớn: vàng (.gt) / trắng (.gs) đặc có viền mực. Nút vàng (.btn-gold),
// lam (.btn-blue), đỏ (.btn-red), xám lam (.btn-ghost) cùng khuôn, nhấn là lún xuống; mục đang chọn = vàng đặc chữ mực hoặc vòng vàng 3px.
// Kích thước theo chiều cao màn (vh) có kẹp min/max để điện thoại ngang 360–430 px cao vẫn vừa.
const CSS = `
:root { --u-disp: 'Baloo 2', 'Be Vietnam Pro', system-ui, sans-serif; --u-body: 'Be Vietnam Pro', system-ui, sans-serif;
  /* UI v4 "hoạt hình phẳng" (2026-11-02): màu phẳng, viền mực dày, bóng cứng, chữ tròn đậm — không dải màu, không quầng sáng, không kính mờ */
  --ink: #0f1729; --c-bg: #253553; --c-bg2: #1a2640; --c-card: #33476e; --c-card2: #2b3c5e;
  --c-yel: #ffd23f; --c-grn: #5be06f; --c-red: #ff5a5f; --c-blu: #4aa8ff; --c-pur: #a678ff;
  /* UI v4.1 "hoạt hình nổi khối" (2026-11-02): giữ viền mực + bóng cứng, thêm độ khối kiểu game mobile — thân sáng trên tối dưới,
     mặt bóng nửa trên của nút, mép sáng trong ở đỉnh thẻ, chữ tiêu đề đắp nổi. Vẫn KHÔNG quầng sáng, không vàng kim, không kính mờ. */
  --g-yel: linear-gradient(180deg, #ffe783 0%, #ffd23f 50%, #f4b51d 100%); --g-blu: linear-gradient(180deg, #8dcbff 0%, #4aa8ff 50%, #2c84de 100%);
  --g-red: linear-gradient(180deg, #ff9d8f 0%, #ff5a5f 50%, #dc3747 100%); --g-grn: linear-gradient(180deg, #a8f6a2 0%, #5be06f 50%, #34b54d 100%);
  --g-card: linear-gradient(180deg, #43598a 0%, #33476e 52%, #2b3c5e 100%); --g-card2: linear-gradient(180deg, #364c7c 0%, #2b3c5e 55%, #233250 100%);
  --g-head: linear-gradient(180deg, #273760 0%, #1a2640 100%); --g-me: linear-gradient(180deg, #5779b3 0%, #3e5a8e 100%);
  --g-tb: linear-gradient(180deg, #3d6cb0 0%, #2a4f86 55%, #213f6c 100%); --g-tr: linear-gradient(180deg, #a63d4b 0%, #7a2a36 55%, #62202b 100%);
  --g-mute: linear-gradient(180deg, #a6b2cc 0%, #8a97b4 100%);
  --gloss: linear-gradient(180deg, rgba(255,255,255,.3) 0 46%, rgba(255,255,255,0) 46%); /* mặt bóng nửa trên của nút (kẹo) */
  --hl: inset 0 2px 0 rgba(255,255,255,.16); /* mép sáng trong ở đỉnh thẻ */
  --hl2: inset 0 3px 0 rgba(255,255,255,.45), inset 0 -4px 0 rgba(0,0,0,.2); /* nút màu: mép sáng trên + gờ tối dưới */
  --extrude: 0 .03em 0 var(--ink), 0 .06em 0 var(--ink), 0 .09em 0 var(--ink), 0 .12em 0 var(--ink); /* chữ đắp nổi */
  /* tên cũ các màn còn đọc — ánh xạ sang màu phẳng (dải vàng → vàng đặc, viền vàng → viền mực) */
  --u-gold: linear-gradient(var(--c-yel), var(--c-yel)); --u-silver: linear-gradient(#fff, #fff);
  --u-rim: linear-gradient(#0f1729, #0f1729); --u-rimb: var(--u-rim); --u-rimr: var(--u-rim);
  --u-glass: linear-gradient(#2b3c5e, #2b3c5e); --u-line: linear-gradient(90deg, #0f1729, #0f1729);
  --u-txt: #ffffff; --u-dim: #c6d3ee; --u-gc: var(--c-yel);
  --u-surf: linear-gradient(#33476e, #33476e); --u-edge: #0f1729; --u-edge-g: var(--c-yel); --u-sh: 0 4px 0 #0f1729; --u-hl: inset 0 -3px 0 rgba(0,0,0,.15); }
/* màn lớn (máy tính bảng / máy tính): phóng cả lớp giao diện cho cân với cảnh 3D (bố cục tính theo màn điện thoại ngang 360–430 px cao) */
/* co giãn cả giao diện theo cỡ màn (ui/viewport.js: --uiz — màn thấp / hẹp hơn 640×360 thu nhỏ đều, máy tính bảng / máy tính 1,25 / 1,5);
   lớp lồng trong lớp (hộp thoại trong màn phòng chờ…) không co thêm lần nữa */
.scr, .ui-panel, .ui-dlg, #rewardScr, .lqs-wrap { zoom: var(--uiz, 1); }
:is(.scr, .ui-panel, .ui-dlg, #rewardScr, .lqs-wrap) :is(.scr, .ui-panel, .ui-dlg, #rewardScr, .lqs-wrap) { zoom: 1; }
@media (display-mode: fullscreen), (display-mode: standalone) { #home [data-a="full"] { display: none; } } /* đã cài như ứng dụng: luôn toàn màn */
/* dải nhắc chơi toàn màn hình (ui/fullHint.js) — giữa màn, dưới hàng trên cùng của sảnh */
.fh-tip { position: absolute; z-index: 6; left: 50%; top: calc(var(--t) + 52px); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 14px; border-radius: 20px; background: rgba(4,6,20,.9); box-shadow: 0 0 0 2px var(--c-yel), 0 4px 14px rgba(0,0,0,.5); font: 600 12.5px var(--u-body); color: #f3ead2; white-space: nowrap; animation: scrIn .3s; transition: opacity .25s; }
.fh-tip .btn-gold { height: 30px; padding: 0 12px; font-size: 13px; } .fh-tip .fh-x { width: 30px; height: 30px; border: 0; border-radius: 50%; background: rgba(255,255,255,.1); color: #fff; font-size: 13px; } .fh-tip.out { opacity: 0; }
#ui { position: fixed; inset: 0; z-index: 20; font-family: var(--u-body); color: var(--u-txt); user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; overflow: hidden; }
#ui[hidden] { display: none; }
:where(#ui) button { font-family: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; } /* :where — độ ưu tiên thấp, để lớp .btn-gold, .pn-tabs … đặt được font / màu chữ */
:where(#ui) svg { display: block; }
#showbg { position: absolute; inset: 0; overflow: hidden; background: #0b0a24 50% 58% / cover no-repeat; }
#showbg.home { background-image: url(./assets/ui/lobby.jpg); }
#showbg.soft { background-image: url(./assets/ui/lobby_soft.jpg); }
#showbg::after { content: ''; position: absolute; inset: 0; background: radial-gradient(130% 100% at 46% 46%, rgba(4,5,18,0) 50%, rgba(4,5,18,.7) 100%), linear-gradient(0deg, rgba(4,6,20,.8) 0, rgba(4,6,20,0) 28%), linear-gradient(180deg, rgba(4,6,20,.55) 0, rgba(4,6,20,0) 20%); }
#showbg::before { content: ''; position: absolute; left: var(--cx, 50%); top: var(--cy, 42%); width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; opacity: 0; transition: opacity .6s;
  background: repeating-conic-gradient(rgba(255,210,63,0.15) 0deg 4deg, rgba(255,210,63,0) 4deg 12deg);
  -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); animation: spin 90s linear infinite; }
#showbg.rays::before { opacity: 1; }
#showbg.off, #show.off { visibility: hidden; }
#show { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
#showload { position: absolute; left: 50%; top: 62%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 20px; background: rgba(4,6,20,.8);
  box-shadow: inset 0 0 0 2px var(--ink), 0 2px 0 var(--ink); font: 700 14px/1 var(--u-disp);   color: var(--u-gc); white-space: nowrap; opacity: 0; transition: opacity .25s; pointer-events: none; }
#showload.on { opacity: 1; }
#showload i { width: 16px; height: 16px; border-radius: 50%; border: 3px solid rgba(255,210,63,0.25); border-top-color: var(--c-yel); animation: spin .8s linear infinite; }
.scr { position: absolute; inset: 0; pointer-events: none; animation: scrIn .3s ease-out; --t: max(8px, var(--st, env(safe-area-inset-top))); --l: max(10px, var(--sl, env(safe-area-inset-left))); --r: max(10px, var(--sr, env(safe-area-inset-right))); --b: max(6px, var(--sb, env(safe-area-inset-bottom))); }
.scr > * { pointer-events: auto; }
@keyframes scrIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }
.face, .face.ini { display: block; object-fit: cover; }
i.ini { display: grid; place-items: center; font: 800 16px var(--u-disp); color: var(--c-yel); background: var(--g-card); }
img.ui-ic { display: block; object-fit: contain; pointer-events: none; }

/* —— chữ —— */
/* tiêu đề kiểu hoạt hình: vàng (.gt) / trắng (.gs) đặc, viền mực dày + bóng cứng — không dải màu, không quầng sáng */
.gt, .gs { -webkit-text-stroke: .09em var(--ink); paint-order: stroke fill; text-shadow: var(--extrude); background: none !important; filter: none !important; }
.gt { color: var(--c-yel) !important; -webkit-text-fill-color: var(--c-yel); } .gs { color: #fff !important; -webkit-text-fill-color: #fff; }
.hd { display: flex; align-items: center; gap: 8px; margin: 0; font: 800 14px/1 var(--u-disp); color: var(--c-yel); white-space: nowrap; }
.hd::before, .hd::after { content: ''; flex: 1; min-width: 10px; height: 3px; border-radius: 2px; background: var(--ink); }
.hd small { font: 600 11px var(--u-body); color: var(--u-dim); }

/* —— khung: thẻ phẳng, viền mực dày, bóng cứng —— */
.fr { position: relative; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 14px; background: var(--g-card2); box-shadow: var(--hl), 0 4px 0 var(--ink); }
.fr.blue { background: var(--g-tb); } .fr.red { background: var(--g-tr); }
.fr.hot { box-shadow: 0 0 0 3px var(--c-yel), 0 4px 0 var(--ink); }

/* —— nút kiểu kẹo nổi khối: thân sáng trên tối dưới + mặt bóng nửa trên, mép sáng trong, gờ tối mép dưới, viền mực, bóng cứng; nhấn là lún xuống —— */
.btn-gold, .btn-blue, .btn-red, .btn-ghost { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 12px; padding: 0 20px;
  height: clamp(40px, calc(11 * var(--vh, 1vh)), 48px); white-space: nowrap; font: 800 clamp(16px, calc(5 * var(--vh, 1vh)), 21px)/1 var(--u-disp); letter-spacing: .01em; text-transform: none;
  box-shadow: var(--hl2), 0 4px 0 var(--ink); transition: transform .06s, box-shadow .06s; }
.btn-gold { color: var(--ink) !important; background: var(--gloss), var(--g-yel); }
.btn-blue { color: #fff !important; background: var(--gloss), var(--g-blu); text-shadow: 0 2px 0 rgba(15,23,41,.55); }
.btn-red { color: #fff !important; background: var(--gloss), var(--g-red); text-shadow: 0 2px 0 rgba(15,23,41,.55); }
.btn-ghost { height: 38px; padding: 0 16px; color: #fff !important; background: var(--g-card); font-size: 15px; text-shadow: 0 2px 0 rgba(15,23,41,.55); }
.btn-gold:active, .btn-blue:active, .btn-red:active, .btn-ghost:active { transform: translateY(3px); box-shadow: inset 0 3px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.2), 0 1px 0 var(--ink); }
.icb:active, .ui-back:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); }
.btn-gold[disabled], .btn-blue[disabled], .btn-red[disabled], .btn-ghost[disabled] { background: var(--g-mute); color: #1a2640 !important; text-shadow: none; }
.icb, .ui-back { position: relative; flex: none; width: clamp(34px, calc(10 * var(--vh, 1vh)), 40px); height: clamp(34px, calc(10 * var(--vh, 1vh)), 40px); padding: 0; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 12px; display: grid; place-items: center;
  background: var(--g-head); box-shadow: var(--hl), 0 3px 0 var(--ink); }
.ui-back { background: var(--gloss), var(--g-yel); box-shadow: var(--hl2), 0 3px 0 var(--ink); }
.icb img.ui-ic { width: 86%; height: 86%; } .icb svg, .ui-back svg { width: 56%; height: 56%; }
/* vùng chạm rộng hơn nút vẽ: điện thoại thu nhỏ cả giao diện (--uiz ~0,7 — nút 34 px vẽ ra chỉ ~24 px thật) — lớp trong suốt thò ra quanh nút */
.icb::after, .ui-back::after { content: ''; position: absolute; inset: -7px; border-radius: 16px; }
#home .hm-top .cur { cursor: pointer; } #home .hm-top .cur:active { transform: translateY(1px); } /* cả ô tiền là nút (dấu + chỉ 18 px) */
.dia { position: relative; display: flex; flex-direction: column; align-items: center; gap: clamp(9px, calc(2.8 * var(--vh, 1vh)), 13px); padding: 0; border: 0; background: none; }
.dia > i { position: relative; width: clamp(38px, calc(11.5 * var(--vh, 1vh)), 50px); height: clamp(38px, calc(11.5 * var(--vh, 1vh)), 50px); transform: rotate(45deg); border-radius: 12px; display: grid; place-items: center; transition: transform .08s;
  background: linear-gradient(135deg, #8dcbff, #4aa8ff 50%, #2c84de); box-shadow: inset 0 0 0 3px var(--ink), inset 7px 7px 0 rgba(255,255,255,.3), inset -8px -8px 0 rgba(0,0,0,.2), 0 4px 0 var(--ink); }
.dia > i img.ui-ic { position: relative; z-index: 1; width: 94%; height: 94%; transform: rotate(-45deg); }
.dia > span { font: 800 clamp(13px, calc(4 * var(--vh, 1vh)), 16px)/1 var(--u-disp); color: #fff; -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill; white-space: nowrap; }
.dia:active > i { transform: rotate(45deg) translate(2px, 2px); }
.badge { position: absolute; top: -6px; right: -6px; z-index: 4; min-width: 19px; height: 19px; padding: 0 4px; box-sizing: border-box; border-radius: 10px; background: var(--g-red); border: 2px solid var(--ink);
  color: #fff; font: 800 11px/15px var(--u-disp); font-style: normal; text-align: center; }
.rkb { position: relative; display: inline-block; flex: none; vertical-align: middle; }
.rkb img { display: block; width: 100%; height: 100%; }
.rkb b { position: absolute; left: 50%; bottom: 1%; transform: translateX(-50%); padding: .1em .45em .04em; border-radius: 6px; background: var(--ink); font: 800 max(9px, calc(var(--s, 40px) * .2))/1 var(--u-disp); color: var(--c-yel); white-space: nowrap; }
.stars { display: inline-flex; gap: 1px; align-items: center; } .stars b { color: #56688f; font-size: 12px; } .stars b.on { color: var(--c-yel); } .stars em { font: 800 13px var(--u-disp); font-style: normal; margin-left: 2px; color: #fff; }
.pbar { position: relative; height: 7px; border-radius: 4px; background: var(--ink); overflow: hidden; }
.pbar > i { display: block; height: 100%; border-radius: 4px; background: var(--g-yel); }
.pbar.blue > i { background: var(--g-blu); }
.cur { position: relative; display: inline-flex; align-items: center; height: clamp(24px, calc(7 * var(--vh, 1vh)), 28px); margin-left: 14px; padding: 0 10px 0 22px; box-sizing: border-box; border-radius: 14px; background: var(--ink);
  font: 800 clamp(14px, calc(4.4 * var(--vh, 1vh)), 17px)/1 var(--u-disp); font-variant-numeric: tabular-nums; color: #fff; white-space: nowrap; }
.cur > img.ui-ic { position: absolute; left: -14px; top: 50%; width: 34px; height: 34px; transform: translateY(-50%); }
.cur b { font-weight: 800; min-width: 28px; } .cur.gem b { color: #cfe6ff; }
.cur .add { margin: 0 -6px 0 6px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: var(--c-grn); border: 2px solid var(--ink); color: var(--ink); font: 800 14px/1 var(--u-disp); font-style: normal; box-sizing: border-box; }
.chatln { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px 0 2px; box-sizing: border-box; border-radius: 13px; background: rgba(15,23,41,.8);
  font-size: 11.5px; color: #dbe4f7; white-space: nowrap; overflow: hidden; cursor: pointer; }
.chatln img.ui-ic { flex: none; width: 24px; height: 24px; } .chatln span { overflow: hidden; text-overflow: ellipsis; } .chatln b { color: var(--c-yel); font-weight: 700; }
.tagr { position: absolute; z-index: 4; padding: 1px 9px; border: 2px solid var(--ink); border-radius: 8px; font: 800 11px/1.3 var(--u-disp); color: #fff; background: var(--g-red); }
.tagr.gold { color: var(--ink); background: var(--g-yel); } .tagr.blue { background: var(--g-blu); }

/* —— thông báo nhanh, hộp thoại, bảng phủ —— */
.ui-toast { position: fixed; left: 50%; top: max(12px, env(safe-area-inset-top)); transform: translate(-50%, -160%); z-index: 60; padding: 8px 20px; border: 3px solid var(--ink); border-radius: 12px; background: var(--g-head);
  box-shadow: var(--hl), 0 4px 0 var(--ink); color: #fff; font: 700 15px var(--u-disp); transition: transform .25s; pointer-events: none; max-width: calc(80 * var(--rvw, 1vw)); text-align: center; }
.ui-toast.on { transform: translate(-50%, 0); }
.ui-dlg { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: rgba(10,15,30,.72); animation: scrIn .2s; }
.ui-dlg .box { min-width: min(380px, calc(86 * var(--vw, 1vw))); max-width: calc(92 * var(--vw, 1vw)); max-height: calc(92 * var(--vh, 1vh)); display: flex; flex-direction: column; padding: 0 22px 18px; text-align: center; animation: dlgIn .25s cubic-bezier(.2,.9,.3,1.2); }
@keyframes dlgIn { from { transform: scale(.9); opacity: 0; } }
.ui-dlg h3 { position: relative; margin: 0 -22px 14px; padding: 12px 22px 10px; font: 800 24px/1.1 var(--u-disp); background: var(--g-head); border-bottom: 3px solid var(--ink); border-radius: 11px 11px 0 0; }
.ui-dlg .box > :first-child:not(h3) { margin-top: 18px; }
.ui-dlg .txt { font-size: 14px; color: #dfe6ff; line-height: 1.5; } .ui-dlg .txt p { margin: 6px 0; }
/* Khung hộp thoại KHÔNG cuộn — chỉ nội dung cuộn khi dài: hoa văn góc .fr::before thò ra 3 px làm cả khung cuộn được 3 px, ngón tay hơi
   xê dịch lúc chạm là hộp rung lên xuống (hộp chọn vị trí). Tiêu đề + nút luôn hiện; nội dung tràn hai bên 22 px để quầng sáng ô chọn không bị cắt. */
.ui-dlg .box > h3, .ui-dlg .box > .btns { flex: none; }
.ui-dlg .box > .txt { min-height: 0; margin-inline: -22px; padding-inline: 22px; overflow: hidden auto; overscroll-behavior: contain; }
.ui-dlg .box > .txt > :first-child { margin-top: 0; } .ui-dlg .box > .txt > :last-child { margin-bottom: 0; } /* như lúc lề còn gộp với tiêu đề / hàng nút */
.ui-dlg .btns { display: flex; gap: 12px; justify-content: center; margin-top: 16px; } .ui-dlg .btns button { min-width: 120px; height: 44px; padding: 0 18px; font-size: 19px; }
.ui-dlg input { -webkit-user-select: text; user-select: text; touch-action: manipulation; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border-radius: 10px; border: 3px solid var(--ink); background: var(--g-head); color: #fff; font: 600 16px var(--u-body); outline: none; }
.ui-dlg input:focus { border-color: var(--c-yel); }
.ui-panel { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; background: radial-gradient(circle at 11px 11px, rgba(255,255,255,.055) 2px, transparent 2.6px) 0 0 / 22px 22px, radial-gradient(130% 90% at 50% 0%, #334b7e 0%, #253553 55%, #1b2843 100%); transform: translateY(14px); opacity: 0; transition: transform .22s, opacity .22s; }
.ui-panel > header, .ui-panel > .ui-body { position: relative; }
.ui-panel.on { transform: none; opacity: 1; } .ui-panel.out { opacity: 0; }
.ui-panel header { flex: none; display: flex; align-items: center; gap: 12px; height: clamp(46px, calc(13 * var(--vh, 1vh)), 56px); padding: 0 max(12px, var(--sr, env(safe-area-inset-right))) 0 max(8px, var(--sl, env(safe-area-inset-left))); background: var(--g-head); border-bottom: 3px solid var(--ink); box-shadow: var(--hl); }
.ui-panel header h2 { margin: 0; font: 800 clamp(22px, calc(7 * var(--vh, 1vh)), 30px)/1 var(--u-disp); letter-spacing: .01em; white-space: nowrap; }
.ui-hr { margin-left: auto; display: flex; gap: 10px; align-items: center; }
.ui-body { flex: 1; min-height: 0; overflow: auto; padding: 12px max(14px, var(--sr, env(safe-area-inset-right))) max(12px, var(--sb, env(safe-area-inset-bottom))) max(14px, var(--sl, env(safe-area-inset-left))); -webkit-overflow-scrolling: touch; }

/* —— SẢNH CHÍNH —— */
#home { --side: clamp(196px, calc(29 * var(--vw, 1vw)), 300px); --nav: clamp(48px, calc(14 * var(--vh, 1vh)), 60px); }
#home::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(54% 42% at 0 0, rgba(3,5,18,.8), rgba(3,5,18,0) 100%), linear-gradient(270deg, rgba(3,5,18,.62), rgba(3,5,18,0) calc(var(--side) + 70px)); }
#home .hm-me { position: absolute; top: var(--t); left: var(--l); display: flex; align-items: center; gap: 10px; padding: 0; background: none; border: 0; text-align: left; }
#home .hm-me .av { position: relative; flex: none; width: clamp(46px, calc(14 * var(--vh, 1vh)), 58px); height: clamp(46px, calc(14 * var(--vh, 1vh)), 58px); padding: 2px; box-sizing: border-box; border-radius: 9px; background: var(--u-rim); box-shadow: 0 0 0 2px var(--ink), 0 2px 0 var(--ink); }
#home .hm-me .av .face, #home .hm-me .av .ini { width: 100%; height: 100%; border-radius: 7px; background: var(--g-card2); }
#home .lvb { position: absolute; left: -7px; bottom: -7px; width: 26px; height: 23px; display: grid; place-items: center; background: var(--ink); clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); font-style: normal; }
#home .lvb::before { content: ''; position: absolute; inset: 1.5px; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); background: var(--g-yel); }
#home .lvb b { position: relative; font: 800 13px/1 var(--u-disp); color: var(--ink); }
#home .hm-me .who { display: flex; flex-direction: column; gap: 4px; }
#home .hm-me .who > b { font: 700 clamp(17px, calc(5.4 * var(--vh, 1vh)), 22px)/1 var(--u-disp);  color: #fff; text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#home .hm-me .rk { display: flex; align-items: center; gap: 4px; font: 700 13px/1 var(--u-disp);  color: var(--u-gc); text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#home .hm-me .rk .rkb { width: 24px; height: 24px; margin: -4px 0; } #home .hm-me .rk .rkb b { display: none; }
#home .hm-me .pbar { width: clamp(90px, calc(15 * var(--vw, 1vw)), 130px); height: 4px; }
#home .hm-fr { position: absolute; left: calc(var(--l) + 4px); top: calc(var(--t) + clamp(60px, calc(18 * var(--vh, 1vh)), 76px)); display: flex; flex-direction: column; gap: clamp(6px, calc(2 * var(--vh, 1vh)), 10px); }
#home .hm-fr button { position: relative; width: clamp(34px, calc(10.5 * var(--vh, 1vh)), 42px); height: clamp(34px, calc(10.5 * var(--vh, 1vh)), 42px); padding: 2px; box-sizing: border-box; border: 0; border-radius: 50%; background: var(--g-blu); box-shadow: 0 0 0 2px var(--ink), 0 2px 0 var(--ink); }
#home .hm-fr .face, #home .hm-fr .ini { width: 100%; height: 100%; border-radius: 50%; }
#home .hm-fr .dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border-radius: 50%; background: #3ddc6a; box-shadow: 0 0 0 2px var(--ink); }
#home .hm-fr .more { padding: 0; border: 3px solid transparent; display: grid; place-items: center; background: linear-gradient(#253553, #253553) padding-box, var(--u-rim) border-box; }
#home .hm-fr .more img.ui-ic { width: 88%; height: 88%; }
/* nút Online (chơi với người thật — ui/online.js) dưới cột bạn bè: viên thuốc vàng, rộng hơn nút tròn */
#home .hm-fr .ol { width: auto; height: clamp(30px, calc(9 * var(--vh, 1vh)), 38px); border-radius: 19px; padding: 0 12px 0 4px; display: flex; align-items: center; gap: 4px; background: var(--gloss), var(--g-yel); color: var(--ink); font: 800 clamp(13px, calc(4 * var(--vh, 1vh)), 16px)/1 var(--u-disp); white-space: nowrap; }
#home .hm-fr .ol img.ui-ic { width: clamp(24px, calc(7.5 * var(--vh, 1vh)), 30px); height: clamp(24px, calc(7.5 * var(--vh, 1vh)), 30px); }
#home .hm-top { position: absolute; top: var(--t); right: var(--r); display: flex; gap: 6px; align-items: center; }
#home .hm-top .cur { margin-right: 4px; }
#home .hm-side { position: absolute; right: var(--r); top: calc(var(--t) + clamp(42px, calc(12.5 * var(--vh, 1vh)), 52px)); width: var(--side); display: flex; flex-direction: column; gap: clamp(7px, calc(2.2 * var(--vh, 1vh)), 11px); }
#home .hm-ev { display: block; width: 100%; height: clamp(68px, calc(22 * var(--vh, 1vh)), 104px); padding: 0; text-align: left; color: inherit; }
#home .hm-ev .pic { position: absolute; inset: 0; border-radius: 5px; background: url(./assets/ui/keyart.jpg) 62% 30% / cover; }
#home .hm-ev .pic::after { content: ''; position: absolute; inset: 0; border-radius: 5px; background: linear-gradient(90deg, rgba(12,6,32,.94) 0, rgba(12,6,32,.6) 52%, rgba(12,6,32,0) 82%), linear-gradient(0deg, rgba(12,6,32,.65), rgba(12,6,32,0) 55%); }
#home .hm-ev .tagr { top: -7px; left: 10px; }
#home .hm-ev .tt { position: absolute; z-index: 1; left: 12px; right: 58px; top: 24%; display: flex; flex-direction: column; gap: 3px; }
#home .hm-ev .tt b { font: 800 clamp(16px, calc(5.6 * var(--vh, 1vh)), 24px)/1 var(--u-disp);  align-self: flex-start; padding-right: 4px; white-space: nowrap; }
#home .hm-ev .tt small { font-size: clamp(9.5px, calc(2.9 * var(--vh, 1vh)), 11.5px); color: #ece4ff; text-shadow: 0 2px 0 rgba(15,23,41,.8); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#home .hm-ev .evp { position: absolute; z-index: 1; left: 12px; right: 66px; bottom: 7px; display: flex; align-items: center; gap: 6px; } #home .hm-ev .evp .pbar { flex: 1; height: 5px; }
#home .hm-ev .evp em { font: 700 12px/1 var(--u-disp); font-style: normal; color: var(--u-gc); text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#home .hm-ev .deco { position: absolute; z-index: 2; right: -10px; bottom: -10px; width: clamp(56px, calc(18 * var(--vh, 1vh)), 80px); height: clamp(56px, calc(18 * var(--vh, 1vh)), 80px); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); animation: bob 2.6s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-3px); } }
#home .hm-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(7px, calc(1.4 * var(--vw, 1vw)), 11px); }
#home .tile { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: clamp(50px, calc(15.5 * var(--vh, 1vh)), 70px); padding: 0 0 clamp(5px, calc(1.6 * var(--vh, 1vh)), 8px); color: inherit; }
#home .tile img.ui-ic { position: absolute; left: 50%; top: clamp(-8px, -1.6vh, -5px); width: clamp(36px, calc(11.5 * var(--vh, 1vh)), 52px); height: clamp(36px, calc(11.5 * var(--vh, 1vh)), 52px); transform: translateX(-50%); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); }
#home .tile span { position: relative; font: 700 clamp(11.5px, calc(3.6 * var(--vh, 1vh)), 14px)/1 var(--u-disp);   color: #fff; text-shadow: 0 2px 0 rgba(15,23,41,.8); white-space: nowrap; }
#home .tile .badge { top: -6px; right: -6px; }
#home .hm-cg { display: flex; align-items: center; gap: 8px; height: 22px; padding: 0 10px; border-radius: 11px; background: rgba(4,6,20,.8); box-shadow: inset 0 0 0 2px var(--ink); font: 700 12px/1 var(--u-disp);   color: var(--c-yel); }
#home .hm-cg .pbar { flex: 1; height: 5px; } #home .hm-cg .pbar > i { background: var(--g-yel); } #home .hm-cg small { font: 700 12px var(--u-disp); color: #fff; } #home .hm-cg.hq { margin-top: 6px; } #home .hm-cg.hq .pbar > i { background: linear-gradient(#a678ff, #a678ff); }
#home .hm-nav { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--nav) + var(--sb, env(safe-area-inset-bottom))); padding: 0 0 var(--sb, env(safe-area-inset-bottom)) var(--l); box-sizing: border-box; display: flex; align-items: center; gap: 2px;
  background: linear-gradient(0deg, rgba(3,5,18,.96) 0, rgba(3,5,18,.82) 55%, rgba(3,5,18,0) 100%); pointer-events: none; }

#home .hm-nav button { pointer-events: auto; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: clamp(54px, calc(9 * var(--vw, 1vw)), 74px); height: 100%; padding: 0; border: 0; background: none; }

#home .hm-nav img.ui-ic { width: clamp(28px, calc(8.6 * var(--vh, 1vh)), 38px); height: clamp(28px, calc(8.6 * var(--vh, 1vh)), 38px); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); transition: transform .12s; }
#home .hm-nav span { font: 700 clamp(11px, calc(3.4 * var(--vh, 1vh)), 13px)/1 var(--u-disp);   color: var(--c-yel); text-shadow: 0 2px 0 rgba(15,23,41,.8); white-space: nowrap; }
#home .hm-nav button:active img.ui-ic { transform: scale(.9); } #home .hm-nav .badge { top: 3px; right: 8px; }
#home .chatln { position: absolute; left: var(--l); bottom: calc(var(--nav) + var(--sb, env(safe-area-inset-bottom)) + 2px); width: min(calc(34 * var(--vw, 1vw)), 300px); }
#home .hm-play { position: absolute; right: var(--r); bottom: calc(var(--b) + 2px); display: flex; align-items: flex-end; gap: clamp(10px, calc(2.2 * var(--vw, 1vw)), 20px); }
#home .hm-play .dias { display: flex; gap: clamp(12px, calc(2.6 * var(--vw, 1vw)), 26px); padding: 0 4px 2px; }
#home .rank-go { position: relative; display: flex; align-items: center; width: clamp(178px, calc(27 * var(--vw, 1vw)), 252px); height: clamp(50px, calc(15 * var(--vh, 1vh)), 64px); padding: 0 12px 0 clamp(56px, calc(17 * var(--vh, 1vh)), 74px); box-sizing: border-box;
  border: 3px solid var(--ink); border-radius: 16px; background: var(--gloss), var(--g-yel); color: var(--ink) !important; box-shadow: var(--hl2), 0 5px 0 var(--ink); transition: transform .06s, box-shadow .06s; }
#home .rank-go .f { display: none; }
#home .rank-go .rkb { position: absolute; z-index: 2; left: clamp(-24px, -4.2vh, -14px); top: 50%; width: clamp(72px, calc(22 * var(--vh, 1vh)), 94px); height: clamp(72px, calc(22 * var(--vh, 1vh)), 94px); transform: translateY(-53%); }
#home .rank-go .rkb b { display: none; }
#home .rank-go .tx { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; }
#home .rank-go .tx b { font: 800 clamp(18px, calc(5.8 * var(--vh, 1vh)), 28px)/1 var(--u-disp);  text-shadow: none; white-space: nowrap; }
#home .rank-go .tx small { display: flex; align-items: center; gap: 4px; font: 700 clamp(10.5px, calc(3.2 * var(--vh, 1vh)), 13px)/1 var(--u-disp);  color: var(--ink); white-space: nowrap; }
#home .rank-go .stars b { color: rgba(15,23,41,0.4); font-size: 10px; } #home .rank-go .stars b.on { color: var(--ink); text-shadow:  none; } #home .rank-go .stars em { color: var(--ink); }
#home .rank-go:active { transform: translateY(3px); box-shadow: inset 0 3px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.2), 0 2px 0 var(--ink); }
@media (max-width: 700px) { #room .seat .rk { font-size: 9.5px; } #home .hm-ev .tt small { display: none; } #home .hm-nav span { font-size: 10.5px; } }

/* —— CHỌN CHẾ ĐỘ —— */
.md-list { display: flex; gap: clamp(12px, calc(2.2 * var(--vw, 1vw)), 20px); height: 100%; min-height: 220px; align-items: stretch; justify-content: center; padding: 8px 4px 4px; box-sizing: border-box; }
.md-card { flex: 1; max-width: 240px; min-width: 0; padding: 0; text-align: left; display: flex; flex-direction: column; justify-content: flex-end; color: inherit; transition: transform .15s; }
.md-card:active { transform: scale(.98); }
.md-card.lock { filter: grayscale(.75) brightness(.72); } .md-card.lock .tagr::after { content: ' 🔒'; }
.md-card .pic { position: absolute; inset: 0; border-radius: 5px; background-repeat: no-repeat; }
.md-card .pic::after { content: ''; position: absolute; inset: 0; border-radius: 5px; background: linear-gradient(0deg, rgba(5,6,20,.97) 6%, rgba(5,6,20,.6) 46%, rgba(5,6,20,0) 72%); }
.md-card .tagr { top: 10px; left: -5px; }
.md-card .in { position: relative; z-index: 1; padding: 10px 12px 12px; }
.md-card h3 { margin: 0; font: 800 clamp(22px, calc(7 * var(--vh, 1vh)), 30px)/1 var(--u-disp);   display: inline-block; padding-right: 4px; }
.md-card p { margin: 6px 0 0; font-size: 11.5px; color: #d6def6; line-height: 1.35; }
.md-rank { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font: 700 14px/1 var(--u-disp);  color: var(--u-gc); } .md-rank .rkb { width: 50px; height: 50px; }
.md-diff { display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap; }
.md-diff span { padding: 5px 9px; border-radius: 12px; background: rgba(4,6,20,.85); box-shadow: inset 0 0 0 2px var(--ink); font: 700 12px/1 var(--u-disp);   color: var(--c-yel); }
.md-diff span.on { background: var(--u-gold); color: var(--ink); box-shadow: 0 0 0 3px var(--c-yel); }

/* —— PHÒNG CHỜ GHÉP TRẬN —— */
#room { --side: clamp(214px, calc(31 * var(--vw, 1vw)), 330px); background: #0a1030 center / cover; }
#room::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, rgba(5,8,26,.5) 0, rgba(5,8,26,0) 26%, rgba(5,8,26,0) 52%, rgba(5,8,26,.9) 72%), linear-gradient(0deg, rgba(4,6,20,.94), rgba(4,6,20,0) 40%), linear-gradient(180deg, rgba(4,6,20,.78), rgba(4,6,20,0) 26%); }
#room .rm-head { position: absolute; top: var(--t); left: var(--l); display: flex; align-items: center; gap: 10px; }
#room .rm-head h2 { margin: 0; font: 800 clamp(24px, calc(7.6 * var(--vh, 1vh)), 34px)/1 var(--u-disp);   padding-right: 4px; }
#room .rm-sub { position: absolute; top: calc(var(--t) + clamp(44px, calc(12.5 * var(--vh, 1vh)), 52px)); left: calc(var(--l) + 2px); right: calc(var(--side) + 12px); display: flex; flex-wrap: wrap; gap: 6px; }
#room .rm-sub span { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 10px; border-radius: 11px; background: rgba(4,6,20,.8); box-shadow: inset 0 0 0 2px var(--ink); font-size: 11.5px; color: #cdd6f2; white-space: nowrap; }
#room .rm-sub > span > b { color: var(--u-gc); font: 700 13px var(--u-disp);  } #room .rm-sub .rkb { margin: -4px 0 -4px -6px; } #room .rm-sub .rkb b { display: none; }
#room .rm-slots { position: absolute; left: var(--l); right: calc(var(--side) + 20px); top: 30%; display: flex; justify-content: center; align-items: flex-end; gap: clamp(8px, calc(1.6 * var(--vw, 1vw)), 16px); }
#room .seat { position: relative; width: clamp(62px, calc(10.5 * var(--vw, 1vw)), 106px); display: flex; flex-direction: column; align-items: center; }
#room .seat .box { width: 100%; aspect-ratio: .8; display: grid; place-items: center; }
#room .seat .box .face, #room .seat .box .ini { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 4px; object-position: 50% 30%; }
#room .seat .box::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(4,6,20,.55), rgba(4,6,20,0) 40%); pointer-events: none; }
#room .seat.me .box { transform: scale(1.08); transform-origin: 50% 100%; }
#room .seat.empty .box { box-sizing: border-box; border: 3px dashed rgba(198,211,238,.55); border-radius: 14px; background: rgba(26,38,64,.6); cursor: pointer; }
#room .seat.empty .box::after { display: none; }
#room .seat .plus { width: 44%; aspect-ratio: 1; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; border: 3px solid var(--ink); background: var(--g-blu); font: 800 clamp(20px, calc(6 * var(--vh, 1vh)), 30px)/1 var(--u-disp); color: #fff; box-shadow: var(--hl), 0 3px 0 var(--ink); pointer-events: none; }
#room .seat.wait .box { animation: seatP 1.2s ease-in-out infinite; } @keyframes seatP { 50% { box-shadow: 0 0 0 2px var(--ink); } }
#room .seat .sn { margin-top: 10px; font: 700 clamp(13px, calc(4 * var(--vh, 1vh)), 16px)/1.1 var(--u-disp);  color: #f4f6fb; text-shadow: 0 2px 0 rgba(15,23,41,.8); max-width: 118%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#room .seat.empty .sn { color: #9fb4e8; }
#room .seat .rk { margin-top: 3px; max-width: 118%; display: flex; align-items: center; justify-content: center; gap: 2px; font-size: 10.5px; color: #fff; text-shadow: 0 2px 0 rgba(15,23,41,.8); white-space: nowrap; overflow: hidden; } #room .seat .rk .rkb { width: 22px; height: 22px; flex: none; } #room .seat .rk em { font-style: normal; min-width: 0; overflow: hidden; text-overflow: ellipsis; } #room .seat .rk .rkb b { display: none; }
#room .seat .host { position: absolute; z-index: 5; left: 50%; top: -14px; width: 26px; height: 26px; transform: translateX(-50%); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); }
#room .seat .kick { position: absolute; z-index: 5; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; border: 0; padding: 0; background: var(--g-red); color: #fff; font: 800 12px/22px var(--u-disp); box-shadow: 0 0 0 2px var(--ink), 0 2px 0 var(--ink); }
#room .seat .kick::after { content: ''; position: absolute; inset: -9px; border-radius: 50%; } /* nút ✕ 22 px: vùng chạm rộng hơn */
#room .rm-side { position: absolute; right: 0; top: 0; bottom: 0; width: var(--side); padding: var(--t) var(--r) var(--b) 12px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; background: rgba(26,38,64,.96); }
#room .rm-side::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ink); }
#room .rm-tabs { display: flex; gap: 6px; flex: none; }
#room .rm-tabs button { flex: 1; height: 34px; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 12px; background: var(--g-card2); display: flex; align-items: center; justify-content: center; gap: 4px; font: 700 14px/1 var(--u-disp); color: #c6d3ee; box-shadow: var(--hl), 0 3px 0 var(--ink); }
#room .rm-tabs button img.ui-ic { width: 22px; height: 22px; flex: none; } #room .rm-tabs button { white-space: nowrap; padding: 0 4px; } #room .rm-tabs button.on { background: var(--g-yel); color: var(--ink); }
#room .rm-ev { flex: none; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 12px; background: #6a4fc7; box-shadow: var(--hl), 0 3px 0 var(--ink); font: 600 12px var(--u-body); color: #fff; }
#room .rm-ev img.ui-ic { width: 28px; height: 28px; flex: none; } #room .rm-ev span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } #room .rm-ev b { font: 700 13px var(--u-disp); color: var(--u-gc); white-space: nowrap; }
#room .rm-list { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 5px; }
#room .frow { display: flex; align-items: center; gap: 8px; padding: 4px 6px; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 12px; background: var(--g-card); }
#room .frow .face, #room .frow .ini { width: clamp(34px, calc(10 * var(--vh, 1vh)), 42px); height: clamp(34px, calc(10 * var(--vh, 1vh)), 42px); border-radius: 50%; flex: none; box-sizing: border-box; border: 2px solid var(--ink); }
#room .frow div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
#room .frow b { font: 700 14px/1.1 var(--u-disp);  color: #f4f6fb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#room .frow small { display: flex; align-items: center; gap: 3px; font-size: 10.5px; color: #c8d0ea; white-space: nowrap; } #room .frow small .rkb { width: 18px; height: 18px; } #room .frow small .rkb b { display: none; }
#room .frow small.st { color: var(--c-yel); } #room .frow small.on { color: #6fe08a; } #room .frow small.off { color: #8a90a8; }
#room .frow button { flex: none; width: 32px; height: 32px; padding: 0; box-sizing: border-box; border-radius: 50%; border: 3px solid var(--ink); display: grid; place-items: center; background: var(--g-blu); box-shadow: var(--hl), 0 2px 0 var(--ink); }
#room .frow button svg { width: 60%; height: 60%; } #room .frow button[disabled] { opacity: .35; }
#room .rm-btns { flex: none; display: flex; gap: 6px; } #room .rm-btns button { flex: 1; height: 34px; padding: 0 8px; font-size: 14px; }
#room .rm-btns button.wide { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#room .rm-sub .olc i { width: 8px; height: 8px; border-radius: 50%; background: #6fe08a; box-shadow: 0 0 8px #6fe08a; } #room .rm-sub .olc > b { color: #9fe3a0; }
#room .seat.empty.on .box { border-style: solid; border-color: rgba(143,194,255,.5); } #room .seat.empty.on .plus { background: var(--g-blu); }
#room .rm-go { flex: none; width: 100%; height: clamp(44px, calc(13 * var(--vh, 1vh)), 54px); font-size: clamp(20px, calc(6.4 * var(--vh, 1vh)), 26px); }
#room .rm-bot { position: absolute; left: var(--l); bottom: var(--b); display: flex; gap: 8px; align-items: center; }
#room .rm-bot .chatln { width: min(calc(30 * var(--vw, 1vw)), 270px); height: 30px; border-radius: 15px; }
#room.mm-on .rm-bot { visibility: hidden; } /* đang tìm trận: ô tìm trận nằm chỗ dòng chat (không che tên / hạng dưới ghế của mình ở màn thấp) */
#room .mm { position: absolute; left: calc((100% - var(--side)) / 2); bottom: var(--b); transform: translateX(-50%); display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 6px 0 14px; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 23px; background: var(--g-head); box-shadow: var(--hl), 0 4px 0 var(--ink); font: 700 16px/1 var(--u-disp); white-space: nowrap; }
#room .mm b { font: 800 22px/1 var(--u-disp); color: var(--c-yel); min-width: 56px; font-variant-numeric: tabular-nums; }
#room .mm .tx { display: flex; flex-direction: column; justify-content: center; gap: 3px; } #room .mm .tx em { font-style: normal; }
#room .mm .tx small { font: 600 11.5px/1 var(--u-body); color: var(--u-dim); } #room .mm .tx small:empty { display: none; }
#room .mm button { height: 32px; padding: 0 14px; font-size: 15px; border-radius: 16px; }
#room .mm .spin { width: 20px; height: 20px; box-sizing: border-box; border-radius: 50%; border: 4px solid #33476e; border-top-color: var(--c-yel); animation: spin .8s linear infinite; }
.found .dots { display: flex; gap: 9px; justify-content: center; margin: 16px 0 8px; } .found .dots i { width: 18px; height: 18px; transform: rotate(45deg); box-sizing: border-box; border-radius: 4px; background: var(--g-card); border: 3px solid var(--ink); transition: background .25s; }
.found .dots i.ok { background: var(--g-grn); } .found .dots i:nth-child(5):not(:last-child) { margin-right: 14px; }
.found .tm { position: relative; width: 64px; height: 64px; margin: 6px auto 0; display: grid; place-items: center; border-radius: 50%; background: var(--g-head); box-shadow: inset 0 0 0 2px var(--ink); font: 800 32px/1 var(--u-disp); color: #fff; }

/* —— CHỌN TƯỚNG —— */
#pick { --gridw: min(272px, calc(32 * var(--vw, 1vw))); --teamw: min(238px, calc(28.5 * var(--vw, 1vw))); }
#pick .pk-left { position: absolute; left: 0; top: 0; bottom: 0; width: var(--gridw); padding: var(--t) 8px var(--b) var(--l); display: flex; flex-direction: column; gap: 7px; box-sizing: border-box; background: linear-gradient(90deg, rgba(5,7,22,.95) 72%, rgba(5,7,22,0)); }
#pick .pk-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: clamp(80px, calc(25 * var(--vh, 1vh)), 112px); gap: 7px; align-content: start; padding: 3px 4px 4px 2px; -webkit-overflow-scrolling: touch; }
#pick .hc { position: relative; padding: 0; box-sizing: border-box; border: 3px solid var(--ink); border-radius: 10px; overflow: hidden; background: var(--g-head); box-shadow: var(--hl), 0 2px 0 var(--ink); }
#pick .hc img, #pick .hc .ini { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; }
#pick .hc span { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 6px 4px; text-align: left; background: linear-gradient(0deg, rgba(4,5,16,.96) 30%, rgba(4,5,16,0)); }
#pick .hc b { display: block; font: 700 13.5px/1.05 var(--u-disp);   white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .hc small { font-size: 10px; color: #cdb8ff; }
#pick .hc.on { box-shadow: 0 0 0 3px var(--c-yel); }
#pick .hc.on::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 3px var(--c-yel); pointer-events: none; }
#pick .hc.lock { filter: grayscale(.9) brightness(.45); }
#pick .hc em { position: absolute; top: 4px; right: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,.7); font: 700 10px/1.2 var(--u-disp); font-style: normal;   color: var(--c-yel); }
#pick .hc.taken::after { content: 'Đồng đội chọn'; position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.66); box-shadow:  none; font: 700 12px var(--u-disp);   color: var(--c-yel); }
#pick .pk-title { position: absolute; left: calc(var(--gridw) + 14px); right: calc(var(--teamw) + clamp(76px, calc(22 * var(--vh, 1vh)), 96px)); top: var(--t); pointer-events: none; }
#pick .pk-title h1 { margin: 0; max-width: 100%; font: 800 clamp(26px, min(calc(10 * var(--vh, 1vh)), calc(4.8 * var(--vw, 1vw))), 52px)/.95 var(--u-disp);   display: inline-block; padding-right: 6px; }
#pick .pk-title p { margin: 5px 0 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
#pick .pk-title p span { padding: 2px 9px; border-radius: 10px; background: rgba(4,6,20,.82); box-shadow: inset 0 0 0 2px var(--ink); font: 700 12px/1.45 var(--u-disp);   color: var(--c-yel); }
#pick .pk-title p i { font-style: normal; font-size: 12px; color: var(--c-yel); text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#pick .pk-timer { position: absolute; right: calc(var(--teamw) + 16px); top: var(--t); width: clamp(56px, calc(17 * var(--vh, 1vh)), 72px); height: clamp(56px, calc(17 * var(--vh, 1vh)), 72px); display: grid; place-items: center; pointer-events: none; }
#pick .pk-timer svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
#pick .pk-timer .tr { fill: rgba(4,6,20,.82); stroke: rgba(255,255,255,.12); stroke-width: 5; } #pick .pk-timer .tp { fill: none; stroke: #8fd8ff; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset .22s linear; filter: none; }
#pick .pk-timer b { position: relative; font: 800 clamp(22px, calc(7 * var(--vh, 1vh)), 30px)/1 var(--u-disp); color: #fff; text-shadow: none; }
#pick .pk-timer small { position: absolute; top: 100%; left: 50%; margin-top: 5px; transform: translateX(-50%); font: 700 11px/1 var(--u-disp);  color: #8fd8ff; white-space: nowrap; text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#pick .pk-timer.low .tp { stroke: #ff6a5a; filter: none; } #pick .pk-timer.low b { color: #ffd8d0; text-shadow: 0 2px 0 rgba(15,23,41,.8); } #pick .pk-timer.low small { color: #ff9a8a; }
#pick .pk-timer.ready .tp { stroke: var(--c-yel); filter: none; } #pick .pk-timer.ready small { color: var(--u-gc); }
#pick .pk-skills { position: absolute; right: calc(var(--teamw) + 16px); top: 50%; transform: translateY(-44%); display: flex; flex-direction: column; gap: clamp(8px, calc(2.6 * var(--vh, 1vh)), 12px); }
#pick .pk-skills button { position: relative; width: clamp(40px, calc(12 * var(--vh, 1vh)), 52px); height: clamp(40px, calc(12 * var(--vh, 1vh)), 52px); padding: 2px; border: 0; border-radius: 50%; background: var(--u-rim); box-shadow: 0 0 0 2px var(--ink), 0 2px 0 var(--ink); }
#pick .pk-skills button > img, #pick .pk-skills button > i { display: block; width: 100%; height: 100%; border-radius: 50%; }
#pick .pk-skills button > i { background: var(--g-head); display: grid; place-items: center; } #pick .pk-skills button > i img { width: 80%; height: 80%; }
#pick .pk-skills button b { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); padding: 1px 5px; border-radius: 6px; background: var(--ink); box-shadow: inset 0 0 0 2px var(--ink); font: 700 10px/1.2 var(--u-disp);  color: var(--u-gc); white-space: nowrap; }
#pick .pk-skills button.on { box-shadow: 0 0 0 3px var(--c-yel); }
#pick .pk-tip { position: absolute; z-index: 5; right: calc(var(--teamw) + 84px); top: 50%; transform: translateY(-50%); width: min(280px, calc(34 * var(--vw, 1vw))); padding: 10px 12px; font-size: 12px; line-height: 1.45; color: #e2e8fb; }
#pick .pk-tip b { display: block; font: 800 18px/1 var(--u-disp);   color: var(--u-gc); margin-bottom: 4px; } #pick .pk-tip p { margin: 0; }
#pick .pk-team { position: absolute; right: 0; top: 0; bottom: 0; width: var(--teamw); padding: var(--t) var(--r) var(--b) 8px; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; background: linear-gradient(270deg, rgba(5,7,22,.95) 72%, rgba(5,7,22,0)); }
#pick .pk-rows { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 5px; padding: 1px 2px; }
#pick .pk-rows .hd { margin: 2px 0; } #pick .pk-rows .hd.foe { color: #ff9a8a; } #pick .pk-rows .hd.foe::before { background: linear-gradient(90deg, rgba(255,120,100,0), #ff7a6a); } #pick .pk-rows .hd.foe::after { background: linear-gradient(270deg, rgba(255,120,100,0), #ff7a6a); }
#pick .tm { position: relative; display: flex; align-items: center; gap: 8px; padding: 4px 6px 4px 8px; border-radius: 5px; background: linear-gradient(90deg, rgba(30,70,150,.55), rgba(12,26,70,.25)); box-shadow: inset 0 0 0 2px var(--ink); }
#pick .tm::before { content: ''; position: absolute; left: 0; top: 5px; bottom: 5px; width: 3px; border-radius: 2px; background: #4fa8ff; }
#pick .tm .face, #pick .tm .ini, #pick .tm .qm { width: clamp(30px, calc(9 * var(--vh, 1vh)), 40px); height: clamp(30px, calc(9 * var(--vh, 1vh)), 40px); border-radius: 50%; flex: none; box-shadow: 0 0 0 2px var(--ink); }
#pick .tm .qm { display: grid; place-items: center; background: var(--g-head); color: #6f8ae8; font: 800 18px var(--u-disp); }
#pick .tm div { min-width: 0; display: flex; flex-direction: column; gap: 1px; } #pick .tm b { font: 700 13.5px/1.1 var(--u-disp);  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pick .tm small { font-size: 10px; color: #a8c4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .tm small.ok { color: #7dffa8; }
#pick .tm.me { background: var(--g-me); box-shadow: 0 0 0 3px var(--c-yel), 0 3px 0 var(--ink); } #pick .tm.me::before { background: var(--g-yel); }
#pick .tm.me .face, #pick .tm.me .ini { box-shadow: 0 0 0 2px var(--c-yel); } #pick .tm.me small { color: var(--c-yel); } #pick .tm.me small.ok { color: #7dffa8; }
#pick .tm.foe { background: linear-gradient(90deg, rgba(150,30,30,.55), rgba(60,10,10,.25)); box-shadow: inset 0 0 0 2px var(--ink); } #pick .tm.foe::before { background: #ff6a5a; } #pick .tm.foe .face, #pick .tm.foe .qm { box-shadow: 0 0 0 2px var(--ink); }
#pick .tm.picking { animation: pickP 1.2s ease-in-out infinite; } @keyframes pickP { 50% { box-shadow: inset 0 0 0 2px var(--ink); } }
#pick .tm.me.picking { animation-name: pickG; } @keyframes pickG { 50% { box-shadow: inset 0 0 0 2px var(--ink); } }
#pick .pk-bl { position: absolute; left: calc(var(--gridw) + 14px); right: calc(var(--teamw) + 10px); bottom: calc(var(--b) + 14px); display: flex; flex-wrap: wrap-reverse; gap: 10px 8px; align-items: center; pointer-events: none; } #pick .pk-bl > * { pointer-events: auto; }
#pick .pk-spell { position: relative; width: 48px; height: 48px; padding: 2px; border: 0; border-radius: 50%; background: var(--u-rim); box-shadow: 0 0 0 2px var(--ink), 0 2px 0 var(--ink); }
#pick .pk-spell svg, #pick .pk-spell img, #pick .pk-spell canvas { width: 100%; height: 100%; border-radius: 50%; }
#pick .pk-spell small { position: absolute; left: 50%; top: 100%; margin-top: 2px; transform: translateX(-50%); font: 700 10.5px/1 var(--u-disp);   white-space: nowrap; color: #eef1f8; text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#pick .pk-pill { height: 34px; padding: 0 14px; border: 0; border-radius: 17px; background: linear-gradient(180deg, rgba(30,36,80,.92), rgba(8,12,34,.92)); box-shadow: inset 0 0 0 2px var(--ink), 0 2px 0 var(--ink); font: 600 12.5px 'Be Vietnam Pro', system-ui; color: #fff; white-space: nowrap; }
#pick .pk-pill b { font: 700 13px var(--u-disp);   color: var(--u-gc); margin-right: 6px; }
#pick .pk-go { flex: none; width: 100%; padding: 0 10px; height: clamp(44px, calc(13 * var(--vh, 1vh)), 54px); font-size: clamp(20px, calc(6.4 * var(--vh, 1vh)), 26px); }
#pick .pk-hint { position: absolute; left: calc(var(--gridw) + 16px); bottom: calc(var(--b) + 78px); margin: 0; font-size: 11px; color: #c6d3ee; pointer-events: none; text-shadow: 0 2px 0 rgba(15,23,41,.8); }
@media (max-height: 520px) { #pick .pk-hint { display: none; } }
@media (max-width: 760px) { #pick .pk-pill { height: 30px; padding: 0 10px; font-size: 11.5px; } #pick .pk-title p i { display: none; } }
.pk-spells { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; max-height: calc(58 * var(--vh, 1vh)); overflow: auto; text-align: left; padding: 2px; }
.pk-spells button { display: grid; grid-template-columns: 42px 1fr; gap: 2px 8px; align-items: center; align-content: center; text-align: left; padding: 6px; border: 0; border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); box-shadow: inset 0 0 0 2px var(--ink); }
.pk-spells button.on { background: var(--g-yel); color: var(--ink); box-shadow: 0 0 0 3px var(--ink); }
.pk-spells button.on b { color: var(--ink) !important; } .pk-spells button.on small { color: #3b4a68 !important; } /* thẻ đang chọn nền vàng: chữ mực (chữ vàng / trắng không đọc được) */
.pk-spells button > :first-child { width: 42px; height: 42px; grid-row: span 2; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 2px var(--ink); }
.pk-spells button svg, .pk-spells button img { width: 42px; height: 42px; display: block; } .pk-spells b { font: 700 14px/1.1 var(--u-disp);  color: var(--c-yel); } .pk-spells small { font-size: 10px; color: #c8d0ea; line-height: 1.3; }

/* —— ĐỘI HÌNH (sau khi chọn xong) —— */
#lineup { background: radial-gradient(70% 80% at 58% 40%, rgba(8,10,30,0), rgba(4,5,16,.7) 88%), linear-gradient(0deg, rgba(4,5,16,.96) 0, rgba(4,5,16,0) 40%); }
#lineup .lu-name { position: absolute; left: var(--l); top: 15%; max-width: 44%; }
#lineup .lu-name small { display: inline-block; padding: 4px 26px 4px 10px; font: 700 13px/1 var(--u-disp);  color: #dff2ff; background: linear-gradient(90deg, rgba(40,110,220,.8), rgba(40,110,220,0)); }
#lineup .lu-name h1 { margin: 8px 0 0; font: 800 clamp(40px, calc(14 * var(--vh, 1vh)), 76px)/.9 var(--u-disp);   display: inline-block; padding-right: 8px; }
#lineup .lu-name p { margin: 8px 0 0; font: 600 13px var(--u-body); color: var(--c-yel); text-shadow: 0 2px 0 rgba(15,23,41,.8); }
#lineup .lu-name::after { content: ''; display: block; width: 70%; height: 4px; margin-top: 10px; border-radius: 2px; background: var(--g-yel); box-shadow: var(--hl), 0 2px 0 var(--ink); }
#lineup .lu-row { position: absolute; left: var(--l); right: var(--r); bottom: var(--b); display: flex; justify-content: center; gap: clamp(14px, calc(3.6 * var(--vw, 1vw)), 46px); align-items: flex-end; padding: 0 20px 4px; }
#lineup .lu { position: relative; display: flex; flex-direction: column; align-items: center; flex: 0 1 auto; min-width: 0; animation: luIn .45s backwards; } @keyframes luIn { from { opacity: 0; transform: translateY(16px); } }
#lineup .lu b, #lineup .lu small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; } /* màn hẹp: tên dài rút gọn thay vì đẩy thẻ ra ngoài màn */
#lineup .lu .ring { width: clamp(56px, calc(17 * var(--vh, 1vh)), 86px); height: clamp(56px, calc(17 * var(--vh, 1vh)), 86px); border-radius: 50%; padding: 3px; box-sizing: border-box; background: var(--g-blu); box-shadow: var(--hl), 0 2px 0 var(--ink); }
#lineup .lu .ring .face, #lineup .lu .ring .ini { width: 100%; height: 100%; border-radius: 50%; background: var(--g-card2); }
#lineup .lu.me .ring { background: var(--g-yel); box-shadow: 0 0 0 3px var(--c-yel), 0 2px 0 var(--ink); transform: scale(1.14); transform-origin: 50% 100%; }
#lineup .lu.foe .ring { background: var(--g-red); box-shadow: var(--hl), 0 2px 0 var(--ink); }
#lineup .lu b { margin-top: 8px; font: 700 clamp(14px, calc(4.4 * var(--vh, 1vh)), 19px)/1 var(--u-disp);   color: #a8dcff; text-shadow: 0 2px 0 rgba(15,23,41,.8); white-space: nowrap; }
#lineup .lu small { margin-top: 3px; font-size: clamp(10.5px, calc(3.2 * var(--vh, 1vh)), 13px); color: #fff; text-shadow: 0 2px 0 rgba(15,23,41,.8); white-space: nowrap; } #lineup .lu.me b { color: var(--c-yel); } #lineup .lu.me small { color: var(--u-gc); font-weight: 700; } #lineup .lu.foe b { color: #ffa898; }
#lineup .lu-vs { align-self: center; font: 800 clamp(34px, calc(11 * var(--vh, 1vh)), 58px)/1 var(--u-disp); padding: 0 6px; }

/* —— TẢI TRẬN (VS) —— */
#loadscr { background: #070a1e; overflow: hidden; }
/* màn tải làm màn che lúc dựng trận (ui/loading.js asCover, ui/matchLoading.js): nằm trên trận, chặn chạm xuống trận, mờ dần khi trận chạy;
   màn chuyển từ màn tải đấu máy sang (moved) không chạy lại hiệu ứng xuất hiện */
#loadscr.cover { position: fixed; z-index: 60; pointer-events: auto; transition: opacity .3s; } #loadscr.cover.out { opacity: 0; }
#loadscr.cover.moved, #loadscr.cover.moved * { animation: none !important; }
#loadscr .bg { position: absolute; inset: -30px; background: #0a1438 center / cover; filter: blur(10px) brightness(.48) saturate(1.2); }
#loadscr .bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,50,130,.5) 0, rgba(5,7,24,.55) 50%, rgba(120,20,30,.5) 100%); }
#loadscr.solo .bg::after { background: linear-gradient(90deg, rgba(20,50,130,.5) 0, rgba(5,7,24,.55) 50%, rgba(120,20,30,.5) 100%); }
#loadscr .ld-rows { position: absolute; inset: max(10px, var(--st, env(safe-area-inset-top))) max(10px, var(--sr, env(safe-area-inset-right))) max(4px, var(--sb, env(safe-area-inset-bottom))) max(10px, var(--sl, env(safe-area-inset-left))); display: grid; grid-template-rows: 1fr auto 1fr; grid-template-columns: minmax(0, 1fr); align-items: center; justify-items: center; }
#loadscr .ld-team { display: flex; gap: clamp(8px, calc(1.6 * var(--vw, 1vw)), 18px); justify-content: center; height: 100%; align-items: center; }
#loadscr .ld-card { position: relative; height: 100%; max-height: calc(43 * var(--vh, 1vh)); aspect-ratio: .68; display: flex; flex-direction: column; animation: ldIn .45s backwards; } @keyframes ldIn { from { opacity: 0; transform: translateY(12px); } }
#loadscr:not(.solo) .ld-team { justify-self: stretch; width: 100%; min-width: 0; } #loadscr:not(.solo) .ld-card { flex: 0 1 auto; min-width: 0; } /* 5 thẻ một hàng: thiếu bề ngang (máy tính bảng 4:3) thì thẻ hẹp lại thay vì tràn khỏi màn */
#loadscr .ld-team.foe .ld-card { animation-name: ldInF; } @keyframes ldInF { from { opacity: 0; transform: translateY(-12px); } }
#loadscr .ld-card .pic { position: relative; flex: 1; min-height: 0; border: 3px solid transparent; border-radius: 10px; background: #1a2250 padding-box, var(--u-rimb) border-box; box-shadow: var(--hl), 0 4px 0 var(--ink); }
#loadscr .ld-team.foe .ld-card .pic { background: #4a1020 padding-box, var(--u-rimr) border-box; }
#loadscr .ld-card.me .pic { background: var(--ink) padding-box, var(--u-rim) border-box; box-shadow: 0 0 0 3px var(--c-yel), 0 4px 0 var(--ink); }
#loadscr .ld-card .pic img.hcard { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; border-radius: 4px; }
#loadscr .ld-card .pic::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(4,6,20,.96) 0, rgba(4,6,20,.45) 36%, rgba(4,6,20,0) 56%); }
#loadscr .ld-card .info { position: absolute; left: 0; right: 0; bottom: 7px; z-index: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1px; }
#loadscr .ld-card .info b { font: 700 clamp(12px, calc(3.8 * var(--vh, 1vh)), 17px)/1 var(--u-disp);   color: #a8dcff; text-shadow: 0 2px 0 rgba(15,23,41,.8); } #loadscr .ld-team.foe .info b { color: #ffa898; } #loadscr .ld-card.me .info b { color: var(--c-yel); }
#loadscr .ld-card .info small { font-size: clamp(9px, calc(2.9 * var(--vh, 1vh)), 12px); color: #fff; text-shadow: 0 2px 0 rgba(15,23,41,.8); max-width: 96%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#loadscr .ld-card .info .sp { display: flex; gap: 4px; margin-top: 3px; } #loadscr .ld-card .info .sp > * { flex: none; display: block; width: clamp(16px, calc(5.4 * var(--vh, 1vh)), 24px); height: clamp(16px, calc(5.4 * var(--vh, 1vh)), 24px); border-radius: 50%; overflow: hidden; background: rgba(0,0,0,.5); box-shadow: 0 0 0 2px var(--ink); }
#loadscr .ld-card.me .info small { color: var(--c-yel); font-weight: 800; }
#loadscr .ld-card .crest { position: absolute; left: 50%; top: calc(-1 * clamp(12px, calc(3.6 * var(--vh, 1vh)), 18px)); transform: translateX(-50%); z-index: 2; } #loadscr .ld-card .crest .rkb { width: clamp(30px, calc(9 * var(--vh, 1vh)), 46px); height: clamp(30px, calc(9 * var(--vh, 1vh)), 46px); } #loadscr .ld-card .crest .rkb b { display: none; }
#loadscr .ld-card .pb { flex: none; height: 4px; margin-top: 5px; border-radius: 2px; background: rgba(0,0,0,.55); box-shadow: inset 0 0 0 2px var(--ink); overflow: hidden; }
#loadscr .ld-card .pb i { display: block; height: 100%; width: 0; background: var(--g-blu); box-shadow: none; transition: width .25s linear; }
#loadscr .ld-team.foe .ld-card .pb i { background: var(--g-red); box-shadow: none; } #loadscr .ld-card.me .pb i { background: var(--g-yel); box-shadow: 0 0 0 3px var(--c-yel); }
#loadscr .ld-mid { position: relative; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; gap: 12px; box-sizing: border-box; }
#loadscr .ld-mid::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--u-line); opacity: .55; }
#loadscr .ld-tip, #loadscr .ld-pct { position: relative; padding: 3px 10px; background: rgba(4,6,20,.82); border-radius: 4px; }
#loadscr .ld-tip { font-size: clamp(10px, calc(3.1 * var(--vh, 1vh)), 12.5px); color: #e8ecff; max-width: 42%; } #loadscr .ld-tip b { font: 700 12px var(--u-disp);  color: var(--u-gc); margin-right: 6px; }
#loadscr .vs { position: relative; font: 800 clamp(34px, calc(12 * var(--vh, 1vh)), 62px)/1 var(--u-disp); letter-spacing: -.02em; padding: 0 .12em; }
#loadscr .ld-pct { font: 700 clamp(13px, calc(4 * var(--vh, 1vh)), 16px)/1.2 var(--u-disp);  color: #cfe4ff; text-align: right;  max-width: 42%; white-space: nowrap; }
#loadscr.solo .ld-card { max-height: calc(72 * var(--vh, 1vh)); } #loadscr.solo .ld-rows { grid-template-rows: 1fr auto; } #loadscr.solo .ld-teams { display: flex; align-items: center; gap: calc(5 * var(--vw, 1vw)); height: 100%; justify-content: center; }
#loadscr.solo .ld-mid::before { display: none; }

/* —— hết trận: chữ lớn giữa màn rồi sang màn kết quả —— */
#gover { position: fixed; inset: 0; z-index: 12; display: grid; place-content: center; text-align: center; pointer-events: none; font-family: var(--u-disp); }
#gover::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: clamp(120px, calc(36 * var(--rvh, 1vh)), 200px); transform: translateY(-50%); background: linear-gradient(90deg, rgba(4,6,20,0), rgba(4,6,20,.82) 24%, rgba(4,6,20,.82) 76%, rgba(4,6,20,0)); animation: goBand .45s backwards; }
#gover::after { content: ''; position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; margin-top: calc(clamp(120px, calc(36 * var(--rvh, 1vh)), 200px) / 2); background: linear-gradient(rgba(255,210,63,0.9), rgba(255,210,63,0.9)); animation: goBand .45s backwards; }
#gover.lose::after { background: linear-gradient(90deg, rgba(150,170,230,0), #9aa8d8 22%, #eef2ff 50%, #9aa8d8 78%, rgba(150,170,230,0)); }
@keyframes goBand { from { transform: translateY(-50%) scaleX(0); } }
#gover b { position: relative; display: block; font: 800 clamp(56px, calc(19 * var(--rvh, 1vh)), 118px)/1 var(--u-disp);  padding: .3em .1em .06em; margin-top: -.3em; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: goIn .6s cubic-bezier(.2,.9,.3,1.2) .1s backwards; }
#gover.win b { background-image: linear-gradient(var(--c-yel), var(--c-yel)); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); }
#gover.lose b { background-image: linear-gradient(#c6d3ee, #c6d3ee); filter: drop-shadow(0 2px 0 rgba(15,23,41,.9)); }
#gover small { position: relative; margin-top: 6px; font: 700 clamp(13px, calc(4 * var(--rvh, 1vh)), 20px)/1 var(--u-disp);  color: #fff; opacity: .85; animation: scrIn .6s .3s backwards; }
@keyframes goIn { from { opacity: 0; transform: scale(1.6); } }
body.over #skills, body.over #extras, body.over #camBtn, body.over #scoreboard, body.over .lqs-wrap { visibility: hidden; }
body.post #hud, body.post #skills, body.post #extras, body.post #shopRoot, body.post #scoreTop, body.post #scoreboard, body.post #fs, body.post #hudSet, body.post #lab, body.post #camBtn { display: none !important; }
`;

let done = false;
export function injectCss() {
  if (done) return; done = true;
  const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.append(s);
}
