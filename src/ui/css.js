// Kiểu dáng các màn ngoài trận (sảnh, chọn chế độ, phòng chờ, chọn tướng, đội hình, tải trận) — chèn một lần bằng <style> (trang
// chơi thử dạng artifact chỉ cho phép CSS nội tuyến). Bộ nhận diện "UI v2": nền xanh đêm trong mờ, khung viền vàng kim có hoa văn
// góc (.fr), chữ tiêu đề Barlow Condensed nghiêng phủ dải vàng kim (.gt) / bạc (.gs), nút vàng bóng có vệt sáng lướt (.btn-gold),
// nút lam (.btn-blue), nút kính (.btn-ghost), nút tròn viền vàng (.icb), viên tiền tệ (.cur), huy hiệu hạng vẽ sẵn (.rkb), biểu tượng
// vẽ sẵn (img.ui-ic, assets/ui/icons). Kích thước theo chiều cao màn (vh) có kẹp min/max để điện thoại ngang 360–430 px cao vẫn vừa.
const svgUrl = (s) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
// hoa văn góc khung: nẹp chữ L viền tối + dải vàng kim, đường chỉ trong, viên đá hình thoi ở mũi góc (vẽ góc trên-trái, xoay ra 3 góc kia)
const ORN_G = '<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8dc"/><stop offset=".42" stop-color="#f3c565"/><stop offset="1" stop-color="#8c5a1a"/></linearGradient></defs>'
  + '<path d="M4.5 31V12.5C4.5 8 8 4.5 12.5 4.5H31" fill="none" stroke="#1b0e03" stroke-width="5.2" stroke-linecap="round"/>'
  + '<path d="M4.5 31V12.5C4.5 8 8 4.5 12.5 4.5H31" fill="none" stroke="url(#a)" stroke-width="2.4" stroke-linecap="round"/>'
  + '<path d="M10 22v-7c0-2.8 2.2-5 5-5h7" fill="none" stroke="#f3c565" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>'
  + '<path d="M4.5.6l3.9 3.9-3.9 3.9L.6 4.5z" fill="url(#a)" stroke="#1b0e03" stroke-width="1"/>';
const orn = (deg) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><g transform="rotate(${deg} 18 18)">${ORN_G}</g></svg>`);
const ORN = `${orn(0)} left top / var(--orn) var(--orn) no-repeat, ${orn(90)} right top / var(--orn) var(--orn) no-repeat, ${orn(270)} left bottom / var(--orn) var(--orn) no-repeat, ${orn(180)} right bottom / var(--orn) var(--orn) no-repeat`;
const CRYSTAL = 'radial-gradient(120% 120% at 28% 18%, #e2f6ff 0, #84ceff 16%, #2f7ade 46%, #143e92 76%, #0b2462 100%)';

const CSS = `
:root { --u-disp: 'Barlow Condensed', 'Be Vietnam Pro', system-ui, sans-serif; --u-body: 'Be Vietnam Pro', system-ui, sans-serif;
  --u-gold: linear-gradient(180deg, #fffbe8 0%, #ffe7a6 30%, #f4bf55 58%, #c98428 84%, #eebb5c 100%);
  --u-silver: linear-gradient(180deg, #ffffff 0%, #e8eeff 34%, #a8b4d4 62%, #6e7aa0 86%, #c4cce8 100%);
  --u-rim: linear-gradient(180deg, #fff0bc 0%, #e0ac4e 24%, #7c5018 52%, #b8873a 78%, #f6d88e 100%);
  --u-rimb: linear-gradient(180deg, #e6f6ff 0%, #7cc4ff 26%, #1f4f9c 54%, #4a8ad8 80%, #cfeaff 100%);
  --u-rimr: linear-gradient(180deg, #ffe6de 0%, #ff8a72 26%, #7a1c1c 54%, #c8483a 80%, #ffc8b8 100%);
  --u-glass: linear-gradient(180deg, rgba(26,32,74,.93), rgba(9,12,34,.95));
  --u-line: linear-gradient(90deg, rgba(232,184,90,0), #e8b85a 22%, #fff3c4 50%, #e8b85a 78%, rgba(232,184,90,0));
  --u-txt: #f4efe2; --u-dim: #a9b3d6; --u-gc: #ffd98a; --orn: 18px; }
@media (min-height: 560px) { :root { --orn: 22px; } }
/* màn lớn (máy tính bảng / máy tính): phóng cả lớp giao diện cho cân với cảnh 3D (bố cục tính theo màn điện thoại ngang 360–430 px cao) */
@media (min-height: 560px) and (min-width: 900px) { .scr, .ui-panel, .ui-dlg { zoom: 1.25; } }
@media (min-height: 760px) and (min-width: 1200px) { .scr, .ui-panel, .ui-dlg { zoom: 1.5; } }
#ui { position: fixed; inset: 0; z-index: 20; font-family: var(--u-body); color: var(--u-txt); user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; overflow: hidden; }
#ui[hidden] { display: none; }
:where(#ui) button { font-family: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; } /* :where — độ ưu tiên thấp, để lớp .btn-gold, .pn-tabs … đặt được font / màu chữ */
:where(#ui) svg { display: block; }
#showbg { position: absolute; inset: 0; overflow: hidden; background: #0b0a24 50% 58% / cover no-repeat; }
#showbg.home { background-image: url(./assets/ui/lobby.jpg); }
#showbg.soft { background-image: url(./assets/ui/lobby_soft.jpg); }
#showbg::after { content: ''; position: absolute; inset: 0; background: radial-gradient(130% 100% at 46% 46%, rgba(4,5,18,0) 50%, rgba(4,5,18,.7) 100%), linear-gradient(0deg, rgba(4,6,20,.8) 0, rgba(4,6,20,0) 28%), linear-gradient(180deg, rgba(4,6,20,.55) 0, rgba(4,6,20,0) 20%); }
#showbg::before { content: ''; position: absolute; left: var(--cx, 50%); top: var(--cy, 42%); width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax; opacity: 0; transition: opacity .6s;
  background: repeating-conic-gradient(rgba(255,206,120,.15) 0deg 4deg, rgba(255,206,120,0) 4deg 12deg);
  -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,.5) 12%, transparent 34%); animation: spin 90s linear infinite; }
#showbg.rays::before { opacity: 1; }
#showbg.off, #show.off { visibility: hidden; }
#show { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
#showload { position: absolute; left: 50%; top: 62%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 20px; background: rgba(4,6,20,.8);
  box-shadow: inset 0 0 0 1px rgba(255,214,140,.4), 0 4px 12px rgba(0,0,0,.5); font: 700 14px/1 var(--u-disp); letter-spacing: .08em; text-transform: uppercase; color: var(--u-gc); white-space: nowrap; opacity: 0; transition: opacity .25s; pointer-events: none; }
#showload.on { opacity: 1; }
#showload i { width: 16px; height: 16px; border-radius: 50%; border: 3px solid rgba(255,214,140,.25); border-top-color: #ffd36a; animation: spin .8s linear infinite; }
.scr { position: absolute; inset: 0; pointer-events: none; animation: scrIn .3s ease-out; --t: max(8px, env(safe-area-inset-top)); --l: max(10px, env(safe-area-inset-left)); --r: max(10px, env(safe-area-inset-right)); --b: max(6px, env(safe-area-inset-bottom)); }
.scr > * { pointer-events: auto; }
@keyframes scrIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }
.face, .face.ini { display: block; object-fit: cover; }
i.ini { display: grid; place-items: center; font: 800 italic 16px var(--u-disp); color: #ffd28a; background: radial-gradient(circle at 50% 35%, #4a4380, #1b1836); }
img.ui-ic { display: block; object-fit: contain; pointer-events: none; }

/* —— chữ —— */
.gt, .gs { -webkit-background-clip: text; background-clip: text; color: transparent !important; -webkit-text-fill-color: transparent; padding-top: .18em; margin-top: -.18em; padding-bottom: .05em; margin-bottom: -.05em; } /* chừa chỗ dấu tiếng Việt chồng (Ễ, Ồ) trên chữ hoa — ngoài hộp chữ thì nền dải vàng không phủ tới */
.gt { background-image: var(--u-gold); filter: drop-shadow(0 2px 0 #3a1a04) drop-shadow(0 0 10px rgba(255,166,60,.4)); }
.gs { background-image: var(--u-silver); filter: drop-shadow(0 2px 0 #121a36) drop-shadow(0 0 10px rgba(120,150,230,.35)); }
.hd { display: flex; align-items: center; gap: 8px; margin: 0; font: 700 13px/1 var(--u-disp); letter-spacing: .16em; text-transform: uppercase; color: var(--u-gc); white-space: nowrap; }
.hd::before, .hd::after { content: ''; flex: 1; min-width: 10px; height: 1px; background: linear-gradient(90deg, rgba(232,184,90,0), #e8b85a); }
.hd::after { background: linear-gradient(270deg, rgba(232,184,90,0), #e8b85a); }
.hd small { font: 600 11px var(--u-body); letter-spacing: 0; text-transform: none; color: var(--u-dim); }

/* —— khung viền vàng có hoa văn góc —— */
.fr { position: relative; box-sizing: border-box; border: 1.5px solid transparent; border-radius: 6px; background: var(--u-glass) padding-box, var(--u-rim) border-box;
  box-shadow: 0 8px 20px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,226,160,.1), inset 0 1px 0 rgba(255,255,255,.08); }
.fr::before { content: ''; position: absolute; inset: -3px; z-index: 3; pointer-events: none; background: ${ORN}; }
.fr.blue { background: var(--u-glass) padding-box, var(--u-rimb) border-box; }
.fr.red { background: linear-gradient(180deg, rgba(70,20,30,.93), rgba(30,8,14,.95)) padding-box, var(--u-rimr) border-box; }
.fr.hot { box-shadow: 0 0 0 1px rgba(255,214,120,.35), 0 0 18px rgba(255,176,64,.55), 0 8px 20px rgba(0,0,0,.55); }
.fr.plain::before { display: none; }

/* —— nút —— */
.btn-gold, .btn-blue, .btn-red { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 5px; padding: 0 22px; height: clamp(40px, 11vh, 48px);
  white-space: nowrap; font: 800 italic clamp(17px, 5vh, 22px)/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; transition: transform .08s, filter .15s; }
.btn-gold { color: #3b1a02 !important; background: linear-gradient(180deg, #fffbe6 0%, #ffe390 20%, #f7bd48 54%, #da8a22 82%, #f2b34a 100%); text-shadow: 0 1px 0 rgba(255,246,206,.8);
  box-shadow: inset 0 0 0 1px rgba(255,250,226,.95), inset 0 -5px 8px rgba(150,70,0,.3), 0 0 0 1px #5a3306, 0 0 0 2.5px rgba(255,212,116,.5), 0 6px 14px rgba(0,0,0,.6), 0 0 22px rgba(255,170,60,.4); }
.btn-gold::after, .shine::after { content: ''; position: absolute; top: -20%; bottom: -20%; left: -60%; width: 36%; background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,.8), rgba(255,255,255,0)); transform: skewX(-22deg); animation: uShine 3.6s ease-in-out infinite; pointer-events: none; }
@keyframes uShine { 0%, 58% { left: -60%; } 100% { left: 135%; } }
.btn-blue { color: #ecf8ff !important; background: linear-gradient(180deg, #9adcff 0%, #43a4f2 16%, #2166c8 56%, #16418f 100%); text-shadow: 0 1px 2px rgba(0,22,70,.85);
  box-shadow: inset 0 0 0 1px rgba(205,238,255,.8), inset 0 -5px 8px rgba(0,20,80,.35), 0 0 0 1px #0a1c48, 0 0 0 2.5px rgba(130,196,255,.4), 0 6px 14px rgba(0,0,0,.55); }
.btn-red { color: #fff0ec !important; background: linear-gradient(180deg, #ffb4a4 0%, #f05a48 18%, #b8262a 60%, #7e1420 100%); text-shadow: 0 1px 2px rgba(60,0,0,.8);
  box-shadow: inset 0 0 0 1px rgba(255,214,206,.8), 0 0 0 1px #3a0608, 0 0 0 2.5px rgba(255,140,120,.35), 0 6px 14px rgba(0,0,0,.55); }
.btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; border: 0; border-radius: 19px; color: #f3ead2 !important; font: 700 15px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase;
  background: linear-gradient(180deg, rgba(44,52,104,.9), rgba(12,16,42,.94)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.5), 0 4px 10px rgba(0,0,0,.45); white-space: nowrap; }
.btn-gold:active, .btn-blue:active, .btn-red:active, .btn-ghost:active, .icb:active, .ui-back:active { transform: translateY(1px) scale(.97); filter: brightness(.94); }
.btn-gold[disabled], .btn-blue[disabled], .btn-ghost[disabled] { filter: grayscale(.75) brightness(.6); } .btn-gold[disabled]::after { display: none; }
.icb, .ui-back { position: relative; flex: none; width: clamp(34px, 10vh, 40px); height: clamp(34px, 10vh, 40px); padding: 0; border: 1.5px solid transparent; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 28%, #34417e, #0c1132 72%) padding-box, var(--u-rim) border-box; box-shadow: 0 3px 8px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.15); }
.icb img.ui-ic { width: 86%; height: 86%; } .icb svg, .ui-back svg { width: 56%; height: 56%; }
.dia { position: relative; display: flex; flex-direction: column; align-items: center; gap: clamp(9px, 2.8vh, 13px); padding: 0; border: 0; background: none; }
.dia > i { position: relative; width: clamp(38px, 11.5vh, 50px); height: clamp(38px, 11.5vh, 50px); transform: rotate(45deg); border-radius: 8px; display: grid; place-items: center; transition: transform .1s;
  background: ${CRYSTAL}; box-shadow: inset 0 0 0 1.5px rgba(230,248,255,.9), inset 0 0 12px rgba(160,220,255,.55), 0 0 0 2px #0b2a66, 0 0 0 3.5px rgba(150,210,255,.55), 0 0 18px rgba(80,170,255,.7), 0 6px 12px rgba(0,0,0,.5); }
.dia > i::after { content: ''; position: absolute; inset: 3px; border-radius: 6px; background: linear-gradient(135deg, rgba(255,255,255,.5), rgba(255,255,255,0) 42%); pointer-events: none; }
.dia > i img.ui-ic { position: relative; z-index: 1; width: 94%; height: 94%; transform: rotate(-45deg); filter: drop-shadow(0 2px 2px rgba(0,0,0,.55)); }
.dia > span { font: 700 clamp(12px, 3.7vh, 15px)/1 var(--u-disp); letter-spacing: .07em; text-transform: uppercase; color: #eaf6ff; text-shadow: 0 1px 2px #000, 0 0 8px rgba(70,160,255,.7); white-space: nowrap; }
.dia:active > i { transform: rotate(45deg) scale(.92); }
.badge { position: absolute; top: -5px; right: -5px; z-index: 4; min-width: 17px; height: 17px; padding: 0 4px; box-sizing: border-box; border-radius: 9px; background: radial-gradient(circle at 50% 30%, #ff8a70, #e8241c 60%, #a8120e);
  color: #fff; font: 700 11px/17px var(--u-disp); font-style: normal; text-align: center; box-shadow: 0 0 0 1.5px #2a0604, 0 0 8px rgba(255,60,40,.7); }
.rkb { position: relative; display: inline-block; flex: none; vertical-align: middle; }
.rkb img { display: block; width: 100%; height: 100%; filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }
.rkb b { position: absolute; left: 50%; bottom: 1%; transform: translateX(-50%); padding: .12em .4em .08em; border-radius: 3px; background: linear-gradient(180deg, #3a2208, #160a02); box-shadow: inset 0 0 0 1px rgba(255,214,140,.7), 0 1px 3px rgba(0,0,0,.7);
  font: 800 italic max(9px, calc(var(--s, 40px) * .2))/1 var(--u-disp); letter-spacing: .04em; color: #ffe6a8; white-space: nowrap; }
.stars { display: inline-flex; gap: 1px; align-items: center; } .stars b { color: #4a5070; font-size: 12px; } .stars b.on { color: #ffd36a; text-shadow: 0 0 6px #ffb84a; } .stars em { font: 700 13px var(--u-disp); font-style: normal; margin-left: 2px; color: #ffe8a8; }
.pbar { position: relative; height: 6px; border-radius: 3px; background: rgba(0,0,0,.6); box-shadow: inset 0 0 0 1px rgba(255,214,140,.22); overflow: hidden; }
.pbar > i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #c8822a, #ffd36a 70%, #fff6d0); box-shadow: 0 0 8px rgba(255,190,80,.7); }
.pbar.blue > i { background: linear-gradient(90deg, #2a6ad0, #6fc0ff 70%, #dff4ff); box-shadow: 0 0 8px rgba(80,170,255,.7); }
.cur { position: relative; display: inline-flex; align-items: center; height: clamp(24px, 7vh, 28px); margin-left: 14px; padding: 0 10px 0 22px; box-sizing: border-box; border-radius: 14px; background: linear-gradient(180deg, rgba(4,7,22,.9), rgba(18,24,58,.9));
  box-shadow: inset 0 0 0 1px rgba(255,214,140,.4), 0 2px 6px rgba(0,0,0,.5); font: 700 clamp(14px, 4.4vh, 17px)/1 var(--u-disp); letter-spacing: .03em; color: #fff4d4; white-space: nowrap; }
.cur > img.ui-ic { position: absolute; left: -14px; top: 50%; width: 34px; height: 34px; transform: translateY(-50%); filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }
.cur b { font-weight: 700; min-width: 28px; } .cur.gem b { color: #cdeaff; }
.cur .add { margin: 0 -6px 0 6px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(180deg, #fff3b8, #f2b13e 60%, #c07418); color: #3b1a02; font: 800 15px/1 var(--u-disp); font-style: normal; box-shadow: 0 0 0 1px #4a2a06; }
.chatln { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px 0 2px; box-sizing: border-box; border-radius: 13px; background: linear-gradient(90deg, rgba(3,5,18,.85), rgba(3,5,18,.4)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.16);
  font-size: 11.5px; color: #d6def6; white-space: nowrap; overflow: hidden; cursor: pointer; }
.chatln img.ui-ic { flex: none; width: 24px; height: 24px; } .chatln span { overflow: hidden; text-overflow: ellipsis; } .chatln b { color: #8fd3ff; font-weight: 700; }
.tagr { position: absolute; z-index: 4; padding: 3px 12px 3px 9px; font: 800 italic 11px/1.1 var(--u-disp); letter-spacing: .1em; color: #fff; text-transform: uppercase; background: linear-gradient(180deg, #ff8a64, #d0301e 60%, #9a1810);
  clip-path: polygon(0 0, 100% 0, calc(100% - 7px) 100%, 0 100%); text-shadow: 0 1px 1px rgba(60,0,0,.8); }
.tagr.gold { color: #3b1a02; background: linear-gradient(180deg, #fff3c0, #f2b23e 60%, #c07418); text-shadow: 0 1px 0 rgba(255,240,200,.7); }
.tagr.blue { background: linear-gradient(180deg, #8fd8ff, #2a7ae0 60%, #164a9a); text-shadow: 0 1px 1px rgba(0,20,60,.8); }

/* —— thông báo nhanh, hộp thoại, bảng phủ —— */
.ui-toast { position: fixed; left: 50%; top: max(12px, env(safe-area-inset-top)); transform: translate(-50%, -160%); z-index: 60; padding: 9px 26px; background: linear-gradient(90deg, rgba(8,10,30,0), rgba(8,10,30,.95) 14%, rgba(8,10,30,.95) 86%, rgba(8,10,30,0));
  color: #ffeec2; font: 600 14px 'Be Vietnam Pro', system-ui, sans-serif; transition: transform .25s; pointer-events: none; max-width: 80vw; text-align: center; }
.ui-toast::before, .ui-toast::after { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, rgba(232,184,90,0), #e8b85a 22%, #fff3c4 50%, #e8b85a 78%, rgba(232,184,90,0)); }
.ui-toast::before { top: 0; } .ui-toast::after { bottom: 0; } .ui-toast.on { transform: translate(-50%, 0); }
.ui-dlg { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; background: radial-gradient(70% 70% at 50% 50%, rgba(10,14,40,.72), rgba(2,3,12,.9)); animation: scrIn .2s; }
.ui-dlg .box { min-width: min(380px, 86vw); max-width: 92vw; max-height: 92vh; overflow: auto; padding: 0 22px 18px; text-align: center; animation: dlgIn .25s cubic-bezier(.2,.9,.3,1.2); }
@keyframes dlgIn { from { transform: scale(.9); opacity: 0; } }
.ui-dlg h3 { position: relative; margin: 0 -22px 14px; padding: 13px 22px 11px; font: 800 italic 24px/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; background: radial-gradient(60% 100% at 50% 0, rgba(255,190,90,.18), rgba(255,190,90,0)); }
.ui-dlg h3::after { content: ''; position: absolute; left: 10%; right: 10%; bottom: 0; height: 1px; background: var(--u-line); }
.ui-dlg .box > :first-child:not(h3) { margin-top: 18px; }
.ui-dlg .txt { font-size: 14px; color: #dfe6ff; line-height: 1.5; } .ui-dlg .txt p { margin: 6px 0; }
.ui-dlg .btns { display: flex; gap: 12px; justify-content: center; margin-top: 16px; } .ui-dlg .btns button { min-width: 120px; height: 42px; padding: 0 18px; font-size: 19px; }
.ui-dlg input { -webkit-user-select: text; user-select: text; touch-action: manipulation; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,214,140,.5); background: rgba(4,6,20,.9); color: #fff; font: 600 16px var(--u-body); outline: none; }
.ui-dlg input:focus { box-shadow: 0 0 0 2px rgba(255,190,90,.35); }
.ui-panel { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; background: #070a1e url(./assets/ui/lobby_soft.jpg) center / cover; transform: translateY(14px); opacity: 0; transition: transform .22s, opacity .22s; }
.ui-panel::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,7,24,.8), rgba(5,7,24,.88) 60%, rgba(3,4,14,.94)); pointer-events: none; }
.ui-panel > header, .ui-panel > .ui-body { position: relative; }
.ui-panel.on { transform: none; opacity: 1; } .ui-panel.out { opacity: 0; }
.ui-panel header { flex: none; display: flex; align-items: center; gap: 12px; height: clamp(46px, 13vh, 56px); padding: 0 max(12px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left)); background: linear-gradient(180deg, rgba(4,6,20,.96), rgba(10,14,40,.82)); }
.ui-panel header::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--u-line); opacity: .85; }
.ui-panel header h2 { margin: 0; font: 800 italic clamp(22px, 7vh, 30px)/1 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
.ui-hr { margin-left: auto; display: flex; gap: 10px; align-items: center; }
.ui-body { flex: 1; min-height: 0; overflow: auto; padding: 12px max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); -webkit-overflow-scrolling: touch; }

/* —— SẢNH CHÍNH —— */
#home { --side: clamp(196px, 29vw, 300px); --nav: clamp(48px, 14vh, 60px); }
#home::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(54% 42% at 0 0, rgba(3,5,18,.8), rgba(3,5,18,0) 100%), linear-gradient(270deg, rgba(3,5,18,.62), rgba(3,5,18,0) calc(var(--side) + 70px)); }
#home .hm-me { position: absolute; top: var(--t); left: var(--l); display: flex; align-items: center; gap: 10px; padding: 0; background: none; border: 0; text-align: left; }
#home .hm-me .av { position: relative; flex: none; width: clamp(46px, 14vh, 58px); height: clamp(46px, 14vh, 58px); padding: 2px; box-sizing: border-box; border-radius: 9px; background: var(--u-rim); box-shadow: 0 0 0 1px #2a1606, 0 0 14px rgba(255,180,80,.45), 0 4px 10px rgba(0,0,0,.6); }
#home .hm-me .av .face, #home .hm-me .av .ini { width: 100%; height: 100%; border-radius: 7px; background: radial-gradient(circle at 50% 35%, #3a4a8a, #12183a); }
#home .lvb { position: absolute; left: -7px; bottom: -7px; width: 26px; height: 23px; display: grid; place-items: center; background: #2a1404; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); font-style: normal; }
#home .lvb::before { content: ''; position: absolute; inset: 1.5px; clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); background: linear-gradient(180deg, #fff3c0, #e8a83e 55%, #a0601a); }
#home .lvb b { position: relative; font: 800 13px/1 var(--u-disp); color: #3b1a02; }
#home .hm-me .who { display: flex; flex-direction: column; gap: 4px; }
#home .hm-me .who > b { font: 700 clamp(17px, 5.4vh, 22px)/1 var(--u-disp); letter-spacing: .02em; color: #fff; text-shadow: 0 2px 3px #000, 0 0 10px rgba(0,0,0,.6); }
#home .hm-me .rk { display: flex; align-items: center; gap: 4px; font: 700 13px/1 var(--u-disp); letter-spacing: .04em; color: var(--u-gc); text-shadow: 0 1px 2px #000; }
#home .hm-me .rk .rkb { width: 24px; height: 24px; margin: -4px 0; } #home .hm-me .rk .rkb b { display: none; }
#home .hm-me .pbar { width: clamp(90px, 15vw, 130px); height: 4px; }
#home .hm-fr { position: absolute; left: calc(var(--l) + 4px); top: calc(var(--t) + clamp(60px, 18vh, 76px)); display: flex; flex-direction: column; gap: clamp(6px, 2vh, 10px); }
#home .hm-fr button { position: relative; width: clamp(34px, 10.5vh, 42px); height: clamp(34px, 10.5vh, 42px); padding: 2px; box-sizing: border-box; border: 0; border-radius: 50%; background: linear-gradient(180deg, #dff0ff, #4c7ec8 55%, #1c3a78); box-shadow: 0 0 0 1px #08142e, 0 3px 6px rgba(0,0,0,.6); }
#home .hm-fr .face, #home .hm-fr .ini { width: 100%; height: 100%; border-radius: 50%; }
#home .hm-fr .dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border-radius: 50%; background: #3ddc6a; box-shadow: 0 0 0 2px #06102a, 0 0 6px #3ddc6a; }
#home .hm-fr .more { padding: 0; border: 1.5px solid transparent; display: grid; place-items: center; background: radial-gradient(circle at 50% 30%, #34417e, #0c1132 72%) padding-box, var(--u-rim) border-box; }
#home .hm-fr .more img.ui-ic { width: 88%; height: 88%; }
#home .hm-top { position: absolute; top: var(--t); right: var(--r); display: flex; gap: 6px; align-items: center; }
#home .hm-top .cur { margin-right: 4px; }
#home .hm-side { position: absolute; right: var(--r); top: calc(var(--t) + clamp(42px, 12.5vh, 52px)); width: var(--side); display: flex; flex-direction: column; gap: clamp(7px, 2.2vh, 11px); }
#home .hm-ev { display: block; width: 100%; height: clamp(68px, 22vh, 104px); padding: 0; text-align: left; color: inherit; }
#home .hm-ev .pic { position: absolute; inset: 0; border-radius: 5px; background: url(./assets/ui/keyart.jpg) 62% 30% / cover; }
#home .hm-ev .pic::after { content: ''; position: absolute; inset: 0; border-radius: 5px; background: linear-gradient(90deg, rgba(12,6,32,.94) 0, rgba(12,6,32,.6) 52%, rgba(12,6,32,0) 82%), linear-gradient(0deg, rgba(12,6,32,.65), rgba(12,6,32,0) 55%); }
#home .hm-ev .tagr { top: -7px; left: 10px; }
#home .hm-ev .tt { position: absolute; z-index: 1; left: 12px; right: 58px; top: 24%; display: flex; flex-direction: column; gap: 3px; }
#home .hm-ev .tt b { font: 800 italic clamp(16px, 5.6vh, 24px)/1 var(--u-disp); letter-spacing: .03em; align-self: flex-start; padding-right: 4px; white-space: nowrap; }
#home .hm-ev .tt small { font-size: clamp(9.5px, 2.9vh, 11.5px); color: #ece4ff; text-shadow: 0 1px 2px #000; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#home .hm-ev .evp { position: absolute; z-index: 1; left: 12px; right: 66px; bottom: 7px; display: flex; align-items: center; gap: 6px; } #home .hm-ev .evp .pbar { flex: 1; height: 5px; }
#home .hm-ev .evp em { font: 700 12px/1 var(--u-disp); font-style: normal; color: var(--u-gc); text-shadow: 0 1px 2px #000; }
#home .hm-ev .deco { position: absolute; z-index: 2; right: -10px; bottom: -10px; width: clamp(56px, 18vh, 80px); height: clamp(56px, 18vh, 80px); filter: drop-shadow(0 4px 6px rgba(0,0,0,.7)); animation: bob 2.6s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-3px); } }
#home .hm-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(7px, 1.4vw, 11px); }
#home .tile { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: clamp(50px, 15.5vh, 70px); padding: 0 0 clamp(5px, 1.6vh, 8px); color: inherit; }
#home .tile img.ui-ic { position: absolute; left: 50%; top: clamp(-8px, -1.6vh, -5px); width: clamp(36px, 11.5vh, 52px); height: clamp(36px, 11.5vh, 52px); transform: translateX(-50%); filter: drop-shadow(0 3px 4px rgba(0,0,0,.75)); }
#home .tile span { position: relative; font: 700 clamp(11.5px, 3.6vh, 14px)/1 var(--u-disp); letter-spacing: .07em; text-transform: uppercase; color: #f6e8c4; text-shadow: 0 1px 2px #000; white-space: nowrap; }
#home .tile .badge { top: -6px; right: -6px; }
#home .hm-cg { display: flex; align-items: center; gap: 8px; height: 22px; padding: 0 10px; border-radius: 11px; background: rgba(4,6,20,.8); box-shadow: inset 0 0 0 1px rgba(255,214,140,.22); font: 700 12px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #ffcf8a; }
#home .hm-cg .pbar { flex: 1; height: 5px; } #home .hm-cg .pbar > i { background: linear-gradient(90deg, #ff6a2a, #ffc85a 70%, #fff0c0); } #home .hm-cg small { font: 700 12px var(--u-disp); color: #f3e6c8; }
#home .hm-nav { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--nav) + env(safe-area-inset-bottom)); padding: 0 0 env(safe-area-inset-bottom) var(--l); box-sizing: border-box; display: flex; align-items: center; gap: 2px;
  background: linear-gradient(0deg, rgba(3,5,18,.96) 0, rgba(3,5,18,.82) 55%, rgba(3,5,18,0) 100%); pointer-events: none; }
#home .hm-nav::before { content: ''; position: absolute; left: 0; width: 56%; top: 3px; height: 1px; background: linear-gradient(90deg, rgba(232,184,90,.1), rgba(232,184,90,.75) 30%, rgba(232,184,90,0)); }
#home .hm-nav button { pointer-events: auto; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: clamp(54px, 9vw, 74px); height: 100%; padding: 0; border: 0; background: none; }
#home .hm-nav button + button::before { content: ''; position: absolute; left: -1px; top: 26%; bottom: 26%; width: 1px; background: linear-gradient(rgba(255,214,140,0), rgba(255,214,140,.35), rgba(255,214,140,0)); }
#home .hm-nav img.ui-ic { width: clamp(28px, 8.6vh, 38px); height: clamp(28px, 8.6vh, 38px); filter: drop-shadow(0 2px 3px rgba(0,0,0,.75)); transition: transform .12s; }
#home .hm-nav span { font: 700 clamp(11px, 3.4vh, 13px)/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #eee2c4; text-shadow: 0 1px 2px #000; white-space: nowrap; }
#home .hm-nav button:active img.ui-ic { transform: scale(.9); } #home .hm-nav .badge { top: 3px; right: 8px; }
#home .chatln { position: absolute; left: var(--l); bottom: calc(var(--nav) + env(safe-area-inset-bottom) + 2px); width: min(34vw, 300px); }
#home .hm-play { position: absolute; right: var(--r); bottom: calc(var(--b) + 2px); display: flex; align-items: flex-end; gap: clamp(10px, 2.2vw, 20px); }
#home .hm-play .dias { display: flex; gap: clamp(12px, 2.6vw, 26px); padding: 0 4px 2px; }
#home .rank-go { position: relative; display: flex; align-items: center; width: clamp(178px, 27vw, 252px); height: clamp(50px, 15vh, 64px); padding: 0 10px 0 clamp(56px, 17vh, 74px); border: 0; background: none; color: #3b1a02 !important;
  filter: drop-shadow(0 6px 8px rgba(0,0,0,.6)) drop-shadow(0 0 8px rgba(255,180,70,.35)); animation: ctaGlow 2.4s ease-in-out infinite; }
@keyframes ctaGlow { 50% { filter: drop-shadow(0 6px 8px rgba(0,0,0,.6)) drop-shadow(0 0 18px rgba(255,186,76,.85)); } }
#home .rank-go .f { position: absolute; inset: 0; clip-path: polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%); background: linear-gradient(180deg, #fff3c4, #d29a3c 40%, #6a3e0c 62%, #e6b456); overflow: hidden; }
#home .rank-go .f::before { content: ''; position: absolute; inset: 2px; clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%); background: linear-gradient(180deg, #fffbe6 0%, #ffe48e 22%, #f7bc46 56%, #d6841e 84%, #f2b246 100%); }
#home .rank-go .rkb { position: absolute; z-index: 2; left: clamp(-24px, -4.2vh, -14px); top: 50%; width: clamp(72px, 22vh, 94px); height: clamp(72px, 22vh, 94px); transform: translateY(-53%); }
#home .rank-go .rkb b { display: none; }
#home .rank-go .tx { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; }
#home .rank-go .tx b { font: 800 italic clamp(22px, 7.4vh, 32px)/.95 var(--u-disp); letter-spacing: .04em; text-shadow: 0 1px 0 rgba(255,246,206,.85); white-space: nowrap; }
#home .rank-go .tx small { display: flex; align-items: center; gap: 4px; font: 700 clamp(10.5px, 3.2vh, 13px)/1 var(--u-disp); letter-spacing: .04em; color: #6a3808; white-space: nowrap; }
#home .rank-go .stars b { color: rgba(110,60,10,.4); font-size: 10px; } #home .rank-go .stars b.on { color: #8a4404; text-shadow: none; } #home .rank-go .stars em { color: #6a3808; }
#home .rank-go:active { transform: translateY(1px) scale(.98); }
@media (max-width: 700px) { #home .hm-ev .tt small { display: none; } #home .hm-nav span { font-size: 10.5px; } }

/* —— CHỌN CHẾ ĐỘ —— */
.md-list { display: flex; gap: clamp(12px, 2.2vw, 20px); height: 100%; min-height: 220px; align-items: stretch; justify-content: center; padding: 8px 4px 4px; box-sizing: border-box; }
.md-card { flex: 1; max-width: 240px; min-width: 0; padding: 0; text-align: left; display: flex; flex-direction: column; justify-content: flex-end; color: inherit; transition: transform .15s; }
.md-card:active { transform: scale(.98); }
.md-card .pic { position: absolute; inset: 0; border-radius: 5px; background-repeat: no-repeat; }
.md-card .pic::after { content: ''; position: absolute; inset: 0; border-radius: 5px; background: linear-gradient(0deg, rgba(5,6,20,.97) 6%, rgba(5,6,20,.6) 46%, rgba(5,6,20,0) 72%); }
.md-card .tagr { top: 10px; left: -5px; }
.md-card .in { position: relative; z-index: 1; padding: 10px 12px 12px; }
.md-card h3 { margin: 0; font: 800 italic clamp(22px, 7vh, 30px)/1 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; display: inline-block; padding-right: 4px; }
.md-card p { margin: 6px 0 0; font-size: 11.5px; color: #d6def6; line-height: 1.35; }
.md-rank { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font: 700 14px/1 var(--u-disp); letter-spacing: .04em; color: var(--u-gc); } .md-rank .rkb { width: 50px; height: 50px; }
.md-diff { display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap; }
.md-diff span { padding: 5px 9px; border-radius: 12px; background: rgba(4,6,20,.85); box-shadow: inset 0 0 0 1px rgba(255,214,140,.3); font: 700 12px/1 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: #e8e0cc; }
.md-diff span.on { background: var(--u-gold); color: #3b1a02; box-shadow: 0 0 0 1px #5a3306, 0 0 10px rgba(255,180,70,.5); }

/* —— PHÒNG CHỜ GHÉP TRẬN —— */
#room { --side: clamp(214px, 31vw, 330px); background: #0a1030 center / cover; }
#room::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, rgba(5,8,26,.5) 0, rgba(5,8,26,0) 26%, rgba(5,8,26,0) 52%, rgba(5,8,26,.9) 72%), linear-gradient(0deg, rgba(4,6,20,.94), rgba(4,6,20,0) 40%), linear-gradient(180deg, rgba(4,6,20,.78), rgba(4,6,20,0) 26%); }
#room .rm-head { position: absolute; top: var(--t); left: var(--l); display: flex; align-items: center; gap: 10px; }
#room .rm-head h2 { margin: 0; font: 800 italic clamp(24px, 7.6vh, 34px)/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; padding-right: 4px; }
#room .rm-sub { position: absolute; top: calc(var(--t) + clamp(44px, 12.5vh, 52px)); left: calc(var(--l) + 2px); right: calc(var(--side) + 12px); display: flex; flex-wrap: wrap; gap: 6px; }
#room .rm-sub span { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 10px; border-radius: 11px; background: rgba(4,6,20,.8); box-shadow: inset 0 0 0 1px rgba(255,214,140,.25); font-size: 11.5px; color: #cdd6f2; white-space: nowrap; }
#room .rm-sub > span > b { color: var(--u-gc); font: 700 13px var(--u-disp); letter-spacing: .03em; } #room .rm-sub .rkb { margin: -4px 0 -4px -6px; } #room .rm-sub .rkb b { display: none; }
#room .rm-slots { position: absolute; left: var(--l); right: calc(var(--side) + 20px); top: 30%; display: flex; justify-content: center; align-items: flex-end; gap: clamp(8px, 1.6vw, 16px); }
#room .seat { position: relative; width: clamp(62px, 10.5vw, 106px); display: flex; flex-direction: column; align-items: center; }
#room .seat .box { width: 100%; aspect-ratio: .8; display: grid; place-items: center; }
#room .seat .box .face, #room .seat .box .ini { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 4px; object-position: 50% 30%; }
#room .seat .box::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(4,6,20,.55), rgba(4,6,20,0) 40%); pointer-events: none; }
#room .seat.me .box { transform: scale(1.08); transform-origin: 50% 100%; }
#room .seat.empty .box { border: 1.5px dashed rgba(150,190,255,.45); border-radius: 6px; background: linear-gradient(180deg, rgba(16,24,60,.55), rgba(6,10,30,.7)); cursor: pointer; }
#room .seat.empty .box::after { display: none; }
#room .seat .plus { width: 44%; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid transparent; background: radial-gradient(circle at 50% 30%, #34417e, #0c1132 72%) padding-box, var(--u-rimb) border-box;
  font: 700 clamp(20px, 6vh, 30px)/1 var(--u-disp); color: #cfeaff; box-shadow: 0 0 14px rgba(80,160,255,.5); pointer-events: none; }
#room .seat.wait .box { animation: seatP 1.2s ease-in-out infinite; } @keyframes seatP { 50% { box-shadow: 0 0 0 1px rgba(143,211,255,.6), 0 0 18px rgba(80,170,255,.7); } }
#room .seat .sn { margin-top: 10px; font: 700 clamp(13px, 4vh, 16px)/1.1 var(--u-disp); letter-spacing: .03em; color: #fff2cc; text-shadow: 0 1px 3px #000; max-width: 118%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#room .seat.empty .sn { color: #9fb4e8; }
#room .seat .rk { margin-top: 3px; max-width: 118%; display: flex; align-items: center; justify-content: center; gap: 2px; font-size: 10.5px; color: #ffe8c0; text-shadow: 0 1px 3px #000; white-space: nowrap; overflow: hidden; } #room .seat .rk .rkb { width: 22px; height: 22px; } #room .seat .rk .rkb b { display: none; }
#room .seat .host { position: absolute; z-index: 5; left: 50%; top: -14px; width: 26px; height: 26px; transform: translateX(-50%); filter: drop-shadow(0 2px 3px rgba(0,0,0,.7)); }
#room .seat .kick { position: absolute; z-index: 5; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; border: 0; padding: 0; background: radial-gradient(circle at 50% 30%, #ff8a70, #c8281c); color: #fff; font: 800 12px/22px var(--u-disp); box-shadow: 0 0 0 1.5px #2a0604, 0 2px 4px rgba(0,0,0,.6); }
#room .rm-side { position: absolute; right: 0; top: 0; bottom: 0; width: var(--side); padding: var(--t) var(--r) var(--b) 12px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; background: linear-gradient(90deg, rgba(6,9,28,.88), rgba(6,9,28,.97)); }
#room .rm-side::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 1.5px; background: linear-gradient(180deg, rgba(232,184,90,0), #e8b85a 30%, #fff3c4 50%, #e8b85a 70%, rgba(232,184,90,0)); }
#room .rm-tabs { display: flex; gap: 6px; flex: none; }
#room .rm-tabs button { flex: 1; height: 34px; border: 0; border-radius: 4px; background: rgba(255,255,255,.04); display: flex; align-items: center; justify-content: center; gap: 4px; font: 700 13px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #aeb8de; }
#room .rm-tabs button img.ui-ic { width: 28px; height: 28px; } #room .rm-tabs button.on { background: linear-gradient(180deg, rgba(255,214,140,.2), rgba(255,214,140,.03)); color: var(--u-gc); box-shadow: inset 0 -2px 0 #f0c060; }
#room .rm-ev { flex: none; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 6px; background: linear-gradient(90deg, rgba(122,74,224,.6), rgba(184,138,255,.2)); box-shadow: inset 0 0 0 1px rgba(230,210,255,.45); font: 600 12px var(--u-body); color: #fff; }
#room .rm-ev img.ui-ic { width: 28px; height: 28px; flex: none; } #room .rm-ev span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } #room .rm-ev b { font: 700 13px var(--u-disp); color: var(--u-gc); white-space: nowrap; }
#room .rm-list { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 5px; }
#room .frow { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
#room .frow .face, #room .frow .ini { width: clamp(34px, 10vh, 42px); height: clamp(34px, 10vh, 42px); border-radius: 50%; flex: none; box-shadow: 0 0 0 1.5px rgba(255,214,140,.5); }
#room .frow div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
#room .frow b { font: 700 14px/1.1 var(--u-disp); letter-spacing: .02em; color: #fff0c8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#room .frow small { display: flex; align-items: center; gap: 3px; font-size: 10.5px; color: #c8d0ea; white-space: nowrap; } #room .frow small .rkb { width: 18px; height: 18px; } #room .frow small .rkb b { display: none; }
#room .frow small.st { color: #ffcf6a; } #room .frow small.on { color: #6fe08a; } #room .frow small.off { color: #8a90a8; }
#room .frow button { flex: none; width: 32px; height: 32px; padding: 0; border-radius: 50%; border: 1.5px solid transparent; display: grid; place-items: center; background: radial-gradient(circle at 50% 30%, #2f5aa8, #0c1a46 72%) padding-box, var(--u-rimb) border-box; box-shadow: 0 2px 6px rgba(0,0,0,.5); }
#room .frow button svg { width: 60%; height: 60%; } #room .frow button[disabled] { opacity: .35; }
#room .rm-btns { flex: none; display: flex; gap: 6px; } #room .rm-btns button { flex: 1; height: 34px; padding: 0 8px; font-size: 14px; }
#room .rm-go { flex: none; width: 100%; height: clamp(44px, 13vh, 54px); font-size: clamp(20px, 6.4vh, 26px); }
#room .rm-bot { position: absolute; left: var(--l); bottom: var(--b); display: flex; gap: 8px; align-items: center; }
#room .rm-bot .chatln { width: min(30vw, 270px); height: 30px; border-radius: 15px; }
#room .mm { position: absolute; left: calc((100% - var(--side)) / 2); bottom: calc(var(--b) + 54px); transform: translateX(-50%); display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 6px 0 14px; border-radius: 22px;
  background: linear-gradient(180deg, rgba(10,16,48,.96), rgba(4,8,26,.96)); box-shadow: inset 0 0 0 1.5px rgba(143,211,255,.7), 0 0 22px rgba(60,140,255,.45), 0 6px 14px rgba(0,0,0,.6); font: 700 15px/1 var(--u-disp); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
#room .mm b { font: 800 italic 22px/1 var(--u-disp); color: #8fd8ff; min-width: 56px; text-shadow: 0 0 10px rgba(80,170,255,.8); }
#room .mm button { height: 32px; padding: 0 14px; font-size: 15px; border-radius: 16px; }
#room .mm .spin { width: 20px; height: 20px; border-radius: 50%; border: 3px solid rgba(143,211,255,.25); border-top-color: #8fd8ff; animation: spin .8s linear infinite; }
.found .dots { display: flex; gap: 9px; justify-content: center; margin: 16px 0 8px; } .found .dots i { width: 18px; height: 18px; transform: rotate(45deg); border-radius: 3px; background: linear-gradient(135deg, #2a3666, #121a3a); box-shadow: inset 0 0 0 1px rgba(150,190,255,.4); transition: background .25s, box-shadow .25s; }
.found .dots i.ok { background: linear-gradient(135deg, #d8ffe6, #3ddc6a 50%, #1a8a3a); box-shadow: 0 0 10px #3ddc6a, inset 0 0 0 1px #e8fff0; } .found .dots i:nth-child(5):not(:last-child) { margin-right: 14px; }
.found .tm { position: relative; width: 64px; height: 64px; margin: 6px auto 0; display: grid; place-items: center; border-radius: 50%; background: radial-gradient(circle at 50% 30%, #1e2a66, #070c26); box-shadow: inset 0 0 0 2px rgba(255,214,140,.6), 0 0 18px rgba(255,180,70,.35); font: 800 italic 32px/1 var(--u-disp); color: #fff; }

/* —— CHỌN TƯỚNG —— */
#pick { --gridw: min(272px, 32vw); --teamw: min(238px, 28.5vw); }
#pick .pk-left { position: absolute; left: 0; top: 0; bottom: 0; width: var(--gridw); padding: var(--t) 8px var(--b) var(--l); display: flex; flex-direction: column; gap: 7px; box-sizing: border-box; background: linear-gradient(90deg, rgba(5,7,22,.95) 72%, rgba(5,7,22,0)); }
#pick .pk-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: clamp(80px, 25vh, 112px); gap: 7px; align-content: start; padding: 3px 4px 4px 2px; -webkit-overflow-scrolling: touch; }
#pick .hc { position: relative; padding: 0; border: 1.5px solid transparent; border-radius: 5px; overflow: hidden; background: linear-gradient(180deg, #1c2050, #0c0f2a) padding-box, linear-gradient(180deg, rgba(200,214,255,.55), rgba(90,110,170,.3)) border-box; box-shadow: 0 3px 8px rgba(0,0,0,.5); }
#pick .hc img, #pick .hc .ini { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 22%; }
#pick .hc span { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 6px 4px; text-align: left; background: linear-gradient(0deg, rgba(4,5,16,.96) 30%, rgba(4,5,16,0)); }
#pick .hc b { display: block; font: 700 13.5px/1.05 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .hc small { font-size: 10px; color: #cdb8ff; }
#pick .hc.on { background: linear-gradient(180deg, #2a2050, #120c2a) padding-box, var(--u-rim) border-box; box-shadow: 0 0 0 1px rgba(255,214,120,.4), 0 0 14px rgba(255,176,64,.65); }
#pick .hc.on::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 16px rgba(255,190,90,.6); pointer-events: none; }
#pick .hc.lock { filter: grayscale(.9) brightness(.45); }
#pick .hc em { position: absolute; top: 4px; right: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,.7); font: 700 10px/1.2 var(--u-disp); font-style: normal; letter-spacing: .04em; text-transform: uppercase; color: #ffd28a; }
#pick .hc.taken::after { content: 'Đồng đội chọn'; position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.66); box-shadow: none; font: 700 12px var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: #ffcf8a; }
#pick .pk-title { position: absolute; left: calc(var(--gridw) + 14px); right: calc(var(--teamw) + clamp(76px, 22vh, 96px)); top: var(--t); pointer-events: none; }
#pick .pk-title h1 { margin: 0; max-width: 100%; font: 800 italic clamp(26px, min(10vh, 4.8vw), 52px)/.95 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; display: inline-block; padding-right: 6px; }
#pick .pk-title p { margin: 5px 0 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
#pick .pk-title p span { padding: 2px 9px; border-radius: 10px; background: rgba(4,6,20,.82); box-shadow: inset 0 0 0 1px rgba(255,214,140,.35); font: 700 12px/1.45 var(--u-disp); letter-spacing: .05em; text-transform: uppercase; color: #ffe6b0; }
#pick .pk-title p i { font-style: normal; font-size: 12px; color: rgba(243,233,214,.85); text-shadow: 0 1px 2px #000; }
#pick .pk-timer { position: absolute; right: calc(var(--teamw) + 16px); top: var(--t); width: clamp(56px, 17vh, 72px); height: clamp(56px, 17vh, 72px); display: grid; place-items: center; pointer-events: none; }
#pick .pk-timer svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
#pick .pk-timer .tr { fill: rgba(4,6,20,.82); stroke: rgba(255,255,255,.12); stroke-width: 5; } #pick .pk-timer .tp { fill: none; stroke: #8fd8ff; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset .22s linear; filter: drop-shadow(0 0 4px #4fa8ff); }
#pick .pk-timer b { position: relative; font: 800 italic clamp(22px, 7vh, 30px)/1 var(--u-disp); color: #fff; text-shadow: 0 0 10px #4fa8ff; }
#pick .pk-timer small { position: absolute; top: 100%; left: 50%; margin-top: 5px; transform: translateX(-50%); font: 700 11px/1 var(--u-disp); letter-spacing: .12em; color: #8fd8ff; white-space: nowrap; text-shadow: 0 1px 2px #000; }
#pick .pk-timer.low .tp { stroke: #ff6a5a; filter: drop-shadow(0 0 4px #ff3a2a); } #pick .pk-timer.low b { color: #ffd8d0; text-shadow: 0 0 10px #ff3a2a; } #pick .pk-timer.low small { color: #ff9a8a; }
#pick .pk-timer.ready .tp { stroke: #ffd36a; filter: drop-shadow(0 0 4px #ffb84a); } #pick .pk-timer.ready small { color: var(--u-gc); }
#pick .pk-skills { position: absolute; right: calc(var(--teamw) + 16px); top: 50%; transform: translateY(-44%); display: flex; flex-direction: column; gap: clamp(8px, 2.6vh, 12px); }
#pick .pk-skills button { position: relative; width: clamp(40px, 12vh, 52px); height: clamp(40px, 12vh, 52px); padding: 2px; border: 0; border-radius: 50%; background: var(--u-rim); box-shadow: 0 0 0 1px #2a1606, 0 4px 8px rgba(0,0,0,.6); }
#pick .pk-skills button > img, #pick .pk-skills button > i { display: block; width: 100%; height: 100%; border-radius: 50%; }
#pick .pk-skills button > i { background: radial-gradient(circle at 50% 35%, #3a2a5a, #120c24); display: grid; place-items: center; } #pick .pk-skills button > i img { width: 80%; height: 80%; }
#pick .pk-skills button b { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); padding: 1px 5px; border-radius: 6px; background: #120c04; box-shadow: inset 0 0 0 1px #c89a48; font: 700 10px/1.2 var(--u-disp); letter-spacing: .04em; color: var(--u-gc); white-space: nowrap; }
#pick .pk-skills button.on { box-shadow: 0 0 0 1px #2a1606, 0 0 14px rgba(255,190,90,.85); }
#pick .pk-tip { position: absolute; z-index: 5; right: calc(var(--teamw) + 84px); top: 50%; transform: translateY(-50%); width: min(280px, 34vw); padding: 10px 12px; font-size: 12px; line-height: 1.45; color: #e2e8fb; }
#pick .pk-tip b { display: block; font: 800 italic 18px/1 var(--u-disp); letter-spacing: .03em; text-transform: uppercase; color: var(--u-gc); margin-bottom: 4px; } #pick .pk-tip p { margin: 0; }
#pick .pk-team { position: absolute; right: 0; top: 0; bottom: 0; width: var(--teamw); padding: var(--t) var(--r) var(--b) 8px; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; background: linear-gradient(270deg, rgba(5,7,22,.95) 72%, rgba(5,7,22,0)); }
#pick .pk-rows { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 5px; padding: 1px 2px; }
#pick .pk-rows .hd { margin: 2px 0; } #pick .pk-rows .hd.foe { color: #ff9a8a; } #pick .pk-rows .hd.foe::before { background: linear-gradient(90deg, rgba(255,120,100,0), #ff7a6a); } #pick .pk-rows .hd.foe::after { background: linear-gradient(270deg, rgba(255,120,100,0), #ff7a6a); }
#pick .tm { position: relative; display: flex; align-items: center; gap: 8px; padding: 4px 6px 4px 8px; border-radius: 5px; background: linear-gradient(90deg, rgba(30,70,150,.55), rgba(12,26,70,.25)); box-shadow: inset 0 0 0 1px rgba(143,211,255,.22); }
#pick .tm::before { content: ''; position: absolute; left: 0; top: 5px; bottom: 5px; width: 3px; border-radius: 2px; background: #4fa8ff; }
#pick .tm .face, #pick .tm .ini, #pick .tm .qm { width: clamp(30px, 9vh, 40px); height: clamp(30px, 9vh, 40px); border-radius: 50%; flex: none; box-shadow: 0 0 0 1.5px rgba(143,211,255,.6); }
#pick .tm .qm { display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #2a3666, #10163a); color: #6f8ae8; font: 800 italic 18px var(--u-disp); }
#pick .tm div { min-width: 0; display: flex; flex-direction: column; gap: 1px; } #pick .tm b { font: 700 13.5px/1.1 var(--u-disp); letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pick .tm small { font-size: 10px; color: #a8c4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pick .tm small.ok { color: #7dffa8; }
#pick .tm.me { background: linear-gradient(90deg, rgba(150,96,24,.62), rgba(60,36,8,.25)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.55), 0 0 10px rgba(255,180,70,.25); } #pick .tm.me::before { background: #ffd36a; }
#pick .tm.me .face, #pick .tm.me .ini { box-shadow: 0 0 0 1.5px #ffd36a; } #pick .tm.me small { color: #ffe08a; } #pick .tm.me small.ok { color: #7dffa8; }
#pick .tm.foe { background: linear-gradient(90deg, rgba(150,30,30,.55), rgba(60,10,10,.25)); box-shadow: inset 0 0 0 1px rgba(255,138,122,.28); } #pick .tm.foe::before { background: #ff6a5a; } #pick .tm.foe .face, #pick .tm.foe .qm { box-shadow: 0 0 0 1.5px rgba(255,138,122,.7); }
#pick .tm.picking { animation: pickP 1.2s ease-in-out infinite; } @keyframes pickP { 50% { box-shadow: inset 0 0 0 1px rgba(143,211,255,.75), 0 0 12px rgba(80,170,255,.45); } }
#pick .tm.me.picking { animation-name: pickG; } @keyframes pickG { 50% { box-shadow: inset 0 0 0 1px rgba(255,224,140,.95), 0 0 14px rgba(255,180,70,.6); } }
#pick .pk-bl { position: absolute; left: calc(var(--gridw) + 14px); right: calc(var(--teamw) + 10px); bottom: calc(var(--b) + 14px); display: flex; flex-wrap: wrap-reverse; gap: 10px 8px; align-items: center; pointer-events: none; } #pick .pk-bl > * { pointer-events: auto; }
#pick .pk-spell { position: relative; width: 48px; height: 48px; padding: 2px; border: 0; border-radius: 50%; background: var(--u-rim); box-shadow: 0 0 0 1px #2a1606, 0 4px 8px rgba(0,0,0,.6); }
#pick .pk-spell svg, #pick .pk-spell img, #pick .pk-spell canvas { width: 100%; height: 100%; border-radius: 50%; }
#pick .pk-spell small { position: absolute; left: 50%; top: 100%; margin-top: 2px; transform: translateX(-50%); font: 700 10.5px/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; color: #f3e9d6; text-shadow: 0 1px 2px #000; }
#pick .pk-pill { height: 34px; padding: 0 14px; border: 0; border-radius: 17px; background: linear-gradient(180deg, rgba(30,36,80,.92), rgba(8,12,34,.92)); box-shadow: inset 0 0 0 1px rgba(255,214,140,.45), 0 3px 8px rgba(0,0,0,.5); font: 600 12.5px 'Be Vietnam Pro', system-ui; color: #f3ead2; white-space: nowrap; }
#pick .pk-pill b { font: 700 13px var(--u-disp); letter-spacing: .06em; text-transform: uppercase; color: var(--u-gc); margin-right: 6px; }
#pick .pk-go { flex: none; width: 100%; padding: 0 10px; height: clamp(44px, 13vh, 54px); font-size: clamp(20px, 6.4vh, 26px); }
#pick .pk-hint { position: absolute; left: calc(var(--gridw) + 16px); bottom: calc(var(--b) + 78px); margin: 0; font-size: 11px; color: rgba(243,233,214,.55); pointer-events: none; text-shadow: 0 1px 2px #000; }
@media (max-height: 520px) { #pick .pk-hint { display: none; } }
@media (max-width: 760px) { #pick .pk-pill { height: 30px; padding: 0 10px; font-size: 11.5px; } #pick .pk-title p i { display: none; } }
.pk-spells { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; max-height: 58vh; overflow: auto; text-align: left; padding: 2px; }
.pk-spells button { display: grid; grid-template-columns: 42px 1fr; gap: 2px 8px; align-items: center; align-content: center; text-align: left; padding: 6px; border: 0; border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.pk-spells button.on { background: linear-gradient(90deg, rgba(255,190,90,.22), rgba(255,190,90,.04)); box-shadow: inset 0 0 0 1px rgba(255,214,120,.7), 0 0 10px rgba(255,180,70,.35); }
.pk-spells button > :first-child { width: 42px; height: 42px; grid-row: span 2; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1.5px rgba(255,214,140,.6); }
.pk-spells button svg, .pk-spells button img { width: 42px; height: 42px; display: block; } .pk-spells b { font: 700 14px/1.1 var(--u-disp); letter-spacing: .03em; color: #ffe08a; } .pk-spells small { font-size: 10px; color: #c8d0ea; line-height: 1.3; }

/* —— ĐỘI HÌNH (sau khi chọn xong) —— */
#lineup { background: radial-gradient(70% 80% at 58% 40%, rgba(8,10,30,0), rgba(4,5,16,.7) 88%), linear-gradient(0deg, rgba(4,5,16,.96) 0, rgba(4,5,16,0) 40%); }
#lineup .lu-name { position: absolute; left: var(--l); top: 15%; max-width: 44%; }
#lineup .lu-name small { display: inline-block; padding: 4px 26px 4px 10px; font: 700 13px/1 var(--u-disp); letter-spacing: .2em; color: #dff2ff; background: linear-gradient(90deg, rgba(40,110,220,.8), rgba(40,110,220,0)); }
#lineup .lu-name h1 { margin: 8px 0 0; font: 800 italic clamp(40px, 14vh, 76px)/.9 var(--u-disp); letter-spacing: .02em; text-transform: uppercase; display: inline-block; padding-right: 8px; }
#lineup .lu-name p { margin: 8px 0 0; font: 600 13px var(--u-body); color: #ffe0a8; text-shadow: 0 1px 3px #000; }
#lineup .lu-name::after { content: ''; display: block; width: 70%; height: 2px; margin-top: 10px; background: linear-gradient(90deg, #e8b85a, rgba(232,184,90,0)); }
#lineup .lu-row { position: absolute; left: 50%; bottom: var(--b); transform: translateX(-50%); display: flex; gap: clamp(14px, 3.6vw, 46px); align-items: flex-end; padding: 0 20px 4px; }
#lineup .lu { position: relative; display: flex; flex-direction: column; align-items: center; animation: luIn .45s backwards; } @keyframes luIn { from { opacity: 0; transform: translateY(16px); } }
#lineup .lu .ring { width: clamp(56px, 17vh, 86px); height: clamp(56px, 17vh, 86px); border-radius: 50%; padding: 3px; box-sizing: border-box; background: conic-gradient(from 210deg, #4fa8ff, #e6f6ff, #4fa8ff, #1a3a8a, #4fa8ff); box-shadow: 0 0 16px rgba(80,170,255,.55), 0 4px 10px rgba(0,0,0,.6); }
#lineup .lu .ring .face, #lineup .lu .ring .ini { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 50% 35%, #3a4a8a, #12183a); }
#lineup .lu.me .ring { background: conic-gradient(from 210deg, #ffb45c, #fff3c8, #ffb45c, #a8601a, #ffb45c); box-shadow: 0 0 24px rgba(255,170,60,.8), 0 4px 10px rgba(0,0,0,.6); transform: scale(1.14); transform-origin: 50% 100%; }
#lineup .lu.foe .ring { background: conic-gradient(from 210deg, #ff5a4a, #ffd0c8, #ff5a4a, #8a1a1a, #ff5a4a); box-shadow: 0 0 18px rgba(255,90,74,.6), 0 4px 10px rgba(0,0,0,.6); }
#lineup .lu b { margin-top: 8px; font: 700 clamp(14px, 4.4vh, 19px)/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; color: #a8dcff; text-shadow: 0 1px 3px #000; white-space: nowrap; }
#lineup .lu small { margin-top: 3px; font-size: clamp(10.5px, 3.2vh, 13px); color: #fff; text-shadow: 0 1px 3px #000; white-space: nowrap; } #lineup .lu.me b { color: #ffe08a; } #lineup .lu.me small { color: var(--u-gc); font-weight: 700; } #lineup .lu.foe b { color: #ffa898; }
#lineup .lu-vs { align-self: center; font: 800 italic clamp(34px, 11vh, 58px)/1 var(--u-disp); padding: 0 6px; }

/* —— TẢI TRẬN (VS) —— */
#loadscr { background: #070a1e; overflow: hidden; }
#loadscr .bg { position: absolute; inset: -30px; background: #0a1438 center / cover; filter: blur(10px) brightness(.48) saturate(1.2); }
#loadscr .bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,50,130,.5) 0, rgba(5,7,24,.55) 50%, rgba(120,20,30,.5) 100%); }
#loadscr.solo .bg::after { background: linear-gradient(90deg, rgba(20,50,130,.5) 0, rgba(5,7,24,.55) 50%, rgba(120,20,30,.5) 100%); }
#loadscr .ld-rows { position: absolute; inset: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(4px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); display: grid; grid-template-rows: 1fr auto 1fr; align-items: center; justify-items: center; }
#loadscr .ld-team { display: flex; gap: clamp(8px, 1.6vw, 18px); justify-content: center; height: 100%; align-items: center; }
#loadscr .ld-card { position: relative; height: 100%; max-height: 43vh; aspect-ratio: .68; display: flex; flex-direction: column; animation: ldIn .45s backwards; } @keyframes ldIn { from { opacity: 0; transform: translateY(12px); } }
#loadscr .ld-team.foe .ld-card { animation-name: ldInF; } @keyframes ldInF { from { opacity: 0; transform: translateY(-12px); } }
#loadscr .ld-card .pic { position: relative; flex: 1; min-height: 0; border: 1.5px solid transparent; border-radius: 5px; background: #1a2250 padding-box, var(--u-rimb) border-box; box-shadow: 0 6px 16px rgba(0,0,0,.6); }
#loadscr .ld-team.foe .ld-card .pic { background: #4a1020 padding-box, var(--u-rimr) border-box; }
#loadscr .ld-card.me .pic { background: #3a2408 padding-box, var(--u-rim) border-box; box-shadow: 0 0 18px rgba(255,180,70,.6), 0 6px 16px rgba(0,0,0,.6); }
#loadscr .ld-card .pic img.hcard { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; border-radius: 4px; }
#loadscr .ld-card .pic::after { content: ''; position: absolute; inset: 0; border-radius: 4px; background: linear-gradient(0deg, rgba(4,6,20,.96) 0, rgba(4,6,20,.45) 36%, rgba(4,6,20,0) 56%); }
#loadscr .ld-card .info { position: absolute; left: 0; right: 0; bottom: 7px; z-index: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1px; }
#loadscr .ld-card .info b { font: 700 clamp(12px, 3.8vh, 17px)/1 var(--u-disp); letter-spacing: .04em; text-transform: uppercase; color: #a8dcff; text-shadow: 0 1px 3px #000; } #loadscr .ld-team.foe .info b { color: #ffa898; } #loadscr .ld-card.me .info b { color: #ffe08a; }
#loadscr .ld-card .info small { font-size: clamp(9px, 2.9vh, 12px); color: #fff; text-shadow: 0 1px 3px #000; max-width: 96%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#loadscr .ld-card .info .sp { display: flex; gap: 4px; margin-top: 3px; } #loadscr .ld-card .info .sp > * { flex: none; display: block; width: clamp(16px, 5.4vh, 24px); height: clamp(16px, 5.4vh, 24px); border-radius: 50%; overflow: hidden; background: rgba(0,0,0,.5); box-shadow: 0 0 0 1px rgba(255,214,140,.55); }
#loadscr .ld-card.me .info small { color: #ffe08a; font-weight: 800; }
#loadscr .ld-card .crest { position: absolute; left: 50%; top: calc(-1 * clamp(12px, 3.6vh, 18px)); transform: translateX(-50%); z-index: 2; } #loadscr .ld-card .crest .rkb { width: clamp(30px, 9vh, 46px); height: clamp(30px, 9vh, 46px); } #loadscr .ld-card .crest .rkb b { display: none; }
#loadscr .ld-card .pb { flex: none; height: 4px; margin-top: 5px; border-radius: 2px; background: rgba(0,0,0,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); overflow: hidden; }
#loadscr .ld-card .pb i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #2a7ae0, #8fd8ff); box-shadow: 0 0 6px #4fa8ff; transition: width .25s linear; }
#loadscr .ld-team.foe .ld-card .pb i { background: linear-gradient(90deg, #d0301e, #ffb09a); box-shadow: 0 0 6px #ff5a4a; } #loadscr .ld-card.me .pb i { background: linear-gradient(90deg, #c8822a, #ffe08a); box-shadow: 0 0 6px #ffb84a; }
#loadscr .ld-mid { position: relative; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; gap: 12px; box-sizing: border-box; }
#loadscr .ld-mid::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--u-line); opacity: .55; }
#loadscr .ld-tip, #loadscr .ld-pct { position: relative; padding: 3px 10px; background: rgba(4,6,20,.82); border-radius: 4px; }
#loadscr .ld-tip { font-size: clamp(10px, 3.1vh, 12.5px); color: #e8ecff; max-width: 42%; } #loadscr .ld-tip b { font: 700 12px var(--u-disp); letter-spacing: .1em; color: var(--u-gc); margin-right: 6px; }
#loadscr .vs { position: relative; font: 800 italic clamp(34px, 12vh, 62px)/1 var(--u-disp); letter-spacing: -.02em; padding: 0 .12em; }
#loadscr .ld-pct { font: 700 clamp(13px, 4vh, 16px)/1.2 var(--u-disp); letter-spacing: .06em; color: #cfe4ff; text-align: right; text-transform: uppercase; max-width: 42%; white-space: nowrap; }
#loadscr.solo .ld-card { max-height: 72vh; } #loadscr.solo .ld-rows { grid-template-rows: 1fr auto; } #loadscr.solo .ld-teams { display: flex; align-items: center; gap: 5vw; height: 100%; justify-content: center; }
#loadscr.solo .ld-mid::before { display: none; }

/* —— hết trận: chữ lớn giữa màn rồi sang màn kết quả —— */
#gover { position: fixed; inset: 0; z-index: 12; display: grid; place-content: center; text-align: center; pointer-events: none; font-family: 'Barlow Condensed', 'Be Vietnam Pro', system-ui, sans-serif; }
#gover::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: clamp(120px, 36vh, 200px); transform: translateY(-50%); background: linear-gradient(90deg, rgba(4,6,20,0), rgba(4,6,20,.82) 24%, rgba(4,6,20,.82) 76%, rgba(4,6,20,0)); animation: goBand .45s backwards; }
#gover::after { content: ''; position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; margin-top: calc(clamp(120px, 36vh, 200px) / 2); background: linear-gradient(90deg, rgba(232,184,90,0), #e8b85a 22%, #fff3c4 50%, #e8b85a 78%, rgba(232,184,90,0)); animation: goBand .45s backwards; }
#gover.lose::after { background: linear-gradient(90deg, rgba(150,170,230,0), #9aa8d8 22%, #eef2ff 50%, #9aa8d8 78%, rgba(150,170,230,0)); }
@keyframes goBand { from { transform: translateY(-50%) scaleX(0); } }
#gover b { position: relative; display: block; font: 800 italic clamp(56px, 19vh, 118px)/1 'Barlow Condensed', 'Be Vietnam Pro', system-ui, sans-serif; letter-spacing: .05em; padding: 0 .1em; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: goIn .6s cubic-bezier(.2,.9,.3,1.2) .1s backwards; }
#gover.win b { background-image: linear-gradient(180deg, #fffbe8 0%, #ffe7a6 30%, #f4bf55 58%, #c98428 84%, #eebb5c 100%); filter: drop-shadow(0 4px 0 #4a2204) drop-shadow(0 0 26px rgba(255,170,60,.8)); }
#gover.lose b { background-image: linear-gradient(180deg, #ffffff 0%, #e8eeff 34%, #a8b4d4 62%, #6e7aa0 86%, #c4cce8 100%); filter: drop-shadow(0 4px 0 #121a36) drop-shadow(0 0 22px rgba(110,140,230,.6)); }
#gover small { position: relative; margin-top: 6px; font: 700 clamp(13px, 4vh, 20px)/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .7em; color: #fff; opacity: .85; animation: scrIn .6s .3s backwards; }
@keyframes goIn { from { opacity: 0; transform: scale(1.6); } }
.setp .seg button[disabled] { opacity: .45; } .setp [data-sur] { background: #5a1a1a !important; border-color: #ff8a7a !important; color: #ffd8d0 !important; } .setp [data-sur].on { background: #c8402f !important; color: #fff !important; }
body.over #skills, body.over #extras, body.over #camBtn, body.over #scoreboard, body.over .setp { visibility: hidden; }
body.post #hud, body.post #skills, body.post #extras, body.post #shopRoot, body.post #scoreTop, body.post #scoreboard, body.post #fs, body.post #hudSet, body.post #lab, body.post #camBtn { display: none !important; }
`;

let done = false;
export function injectCss() {
  if (done) return; done = true;
  const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.append(s);
}
